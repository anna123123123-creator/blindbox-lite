(function () {
  'use strict';

  var data = BlindboxData.load();

  var sideLinks = document.querySelectorAll('.side-link[data-view]');
  var views = document.querySelectorAll('.admin-view');

  var TIER_CLASS = { '普通': 'tier-common', '稀有': 'tier-rare', '隐藏': 'tier-hidden' };
  var EMOJI_PALETTE = ['🚀', '🦊', '🐬', '🍰', '🐼', '🎮', '🌙', '👾', '🐯', '🍭'];

  function switchView(name) {
    sideLinks.forEach(function (l) { l.classList.toggle('active', l.dataset.view === name); });
    views.forEach(function (v) { v.classList.toggle('active', v.id === 'view-' + name); });
    if (name === 'dashboard') renderDashboard();
    if (name === 'series') renderSeries();
    if (name === 'prizes') { populatePrizeSeriesSelect(); renderPrizes(); }
    if (name === 'records') { populateRecordSeriesFilter(); renderRecords(); }
  }

  sideLinks.forEach(function (l) {
    l.addEventListener('click', function () { switchView(l.dataset.view); });
  });

  document.getElementById('btnResetData').addEventListener('click', function () {
    if (!confirm('确定要重置成示例数据吗？这会清空你新增/修改的所有内容。')) return;
    data = BlindboxData.reset();
    switchView('dashboard');
  });

  function fmtMoney(n) {
    var r = Math.round(n * 100) / 100;
    return (r % 1 === 0) ? String(r) : r.toFixed(2);
  }

  function seriesById(id) { return data.series.find(function (s) { return s.id === id; }); }
  function prizeById(id) { return data.prizes.find(function (p) { return p.id === id; }); }
  function prizesFor(seriesId) { return data.prizes.filter(function (p) { return p.seriesId === seriesId; }); }
  function seriesLabel(id) {
    var s = seriesById(id);
    return s ? (s.coverEmoji + ' ' + s.name) : '（已删除系列）';
  }

  // ---------- Dashboard ----------
  function renderDashboard() {
    var totalSeries = data.series.length;
    var totalDraws = data.drawRecords.length;
    var totalRevenue = data.drawRecords.reduce(function (sum, r) {
      var s = seriesById(r.seriesId);
      return sum + (s ? s.price : 0);
    }, 0);

    var now = new Date();
    var ym = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    var monthRevenue = data.drawRecords
      .filter(function (r) { return (r.drawnAt || '').slice(0, 7) === ym; })
      .reduce(function (sum, r) {
        var s = seriesById(r.seriesId);
        return sum + (s ? s.price : 0);
      }, 0);

    var stats = [
      { label: '系列总数', value: totalSeries },
      { label: '抽取总次数', value: totalDraws },
      { label: '总收入', value: '¥' + fmtMoney(totalRevenue) },
      { label: '本月收入', value: '¥' + fmtMoney(monthRevenue) },
    ];
    document.getElementById('statGrid').innerHTML = stats.map(function (s) {
      return '<div class="stat-card"><div class="num">' + s.value + '</div><div class="label">' + s.label + '</div></div>';
    }).join('');

    var tierCounts = { '普通': 0, '稀有': 0, '隐藏': 0 };
    data.drawRecords.forEach(function (r) {
      var p = prizeById(r.prizeId);
      if (p && tierCounts.hasOwnProperty(p.tier)) tierCounts[p.tier]++;
    });
    document.getElementById('tierStats').innerHTML = Object.keys(tierCounts).map(function (t) {
      return '<div class="tier-stat"><span class="tier-badge ' + (TIER_CLASS[t] || '') + '">' + t + '</span><span class="tier-stat__num">' + tierCounts[t] + ' 次</span></div>';
    }).join('');

    var recent = data.drawRecords.slice().sort(function (a, b) { return a.drawnAt < b.drawnAt ? 1 : -1; }).slice(0, 8);
    document.getElementById('recentDrawsBody').innerHTML = recent.map(function (r) {
      var p = prizeById(r.prizeId);
      return '<tr><td>' + r.customerName + '</td><td>' + seriesLabel(r.seriesId) + '</td><td>' + (p ? p.name : '（已删除奖品）') + '</td>' +
        '<td><span class="tier-badge ' + (TIER_CLASS[p ? p.tier : ''] || '') + '">' + (p ? p.tier : '-') + '</span></td>' +
        '<td>' + (r.drawnAt || '').replace('T', ' ').slice(0, 16) + '</td></tr>';
    }).join('') || '<tr><td colspan="5" style="color:var(--muted)">暂无抽取记录</td></tr>';
  }

  // ---------- Series management ----------
  var seriesModalBackdrop = document.getElementById('seriesModalBackdrop');
  var seriesModalTitle = document.getElementById('seriesModalTitle');
  var seriesModalMsg = document.getElementById('seriesModalMsg');
  var seriesForm = document.getElementById('seriesForm');
  var seriesIdInput = document.getElementById('seriesIdInput');
  var seriesNameInput = document.getElementById('seriesNameInput');
  var seriesPriceInput = document.getElementById('seriesPriceInput');
  var seriesEmojiInput = document.getElementById('seriesEmojiInput');
  var seriesDescInput = document.getElementById('seriesDescInput');

  function renderSeries() {
    document.getElementById('seriesBody').innerHTML = data.series.map(function (s) {
      var prizes = prizesFor(s.id);
      var totalStock = prizes.reduce(function (sum, p) { return sum + p.remainingStock; }, 0);
      return '<tr><td>' + s.coverEmoji + ' ' + s.name + '</td><td>¥' + fmtMoney(s.price) + '</td><td>' + prizes.length + '</td><td>' + totalStock + '</td>' +
        '<td class="table-actions">' +
        '<button class="btn btn-sm" data-edit="' + s.id + '">编辑</button>' +
        '<button class="btn btn-sm btn-danger" data-delete="' + s.id + '">删除</button>' +
        '</td></tr>';
    }).join('') || '<tr><td colspan="5" style="color:var(--muted)">暂无系列</td></tr>';

    document.querySelectorAll('#seriesBody [data-edit]').forEach(function (btn) {
      btn.addEventListener('click', function () { openSeriesModal(btn.dataset.edit); });
    });
    document.querySelectorAll('#seriesBody [data-delete]').forEach(function (btn) {
      btn.addEventListener('click', function () { deleteSeries(btn.dataset.delete); });
    });
  }

  function openSeriesModal(id) {
    seriesModalMsg.innerHTML = '';
    seriesForm.reset();
    if (id) {
      var s = seriesById(id);
      seriesModalTitle.textContent = '编辑系列';
      seriesIdInput.value = s.id;
      seriesNameInput.value = s.name;
      seriesPriceInput.value = s.price;
      seriesEmojiInput.value = s.coverEmoji;
      seriesDescInput.value = s.desc || '';
    } else {
      seriesModalTitle.textContent = '新增系列';
      seriesIdInput.value = '';
      seriesEmojiInput.value = EMOJI_PALETTE[data.series.length % EMOJI_PALETTE.length];
    }
    seriesModalBackdrop.classList.add('show');
  }

  document.getElementById('btnAddSeries').addEventListener('click', function () { openSeriesModal(null); });
  document.getElementById('btnCloseSeriesModal').addEventListener('click', function () { seriesModalBackdrop.classList.remove('show'); });
  seriesModalBackdrop.addEventListener('click', function (e) { if (e.target === seriesModalBackdrop) seriesModalBackdrop.classList.remove('show'); });

  seriesForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = seriesNameInput.value.trim();
    var price = parseFloat(seriesPriceInput.value);
    var emoji = seriesEmojiInput.value.trim() || '🎁';
    var desc = seriesDescInput.value.trim();
    if (!name || !(price >= 0) || isNaN(price)) {
      seriesModalMsg.innerHTML = '<div class="msg error">请完整填写系列名称，且单价需为不小于 0 的数字。</div>';
      return;
    }

    var id = seriesIdInput.value;
    if (id) {
      var s = seriesById(id);
      s.name = name; s.price = price; s.coverEmoji = emoji; s.desc = desc;
    } else {
      data.series.push({ id: BlindboxData.uid('s'), name: name, price: price, coverEmoji: emoji, desc: desc });
    }
    BlindboxData.save(data);
    seriesModalBackdrop.classList.remove('show');
    renderSeries();
  });

  function deleteSeries(id) {
    if (!confirm('确定删除这个系列吗？该系列下的所有奖品与抽取记录也会被一并删除，此操作不可撤销。')) return;
    data.series = data.series.filter(function (s) { return s.id !== id; });
    data.prizes = data.prizes.filter(function (p) { return p.seriesId !== id; });
    data.drawRecords = data.drawRecords.filter(function (r) { return r.seriesId !== id; });
    BlindboxData.save(data);
    renderSeries();
  }

  // ---------- Prizes / probability & stock ----------
  var prizeSeriesSelect = document.getElementById('prizeSeriesSelect');
  var probSumBanner = document.getElementById('probSumBanner');
  var prizeModalBackdrop = document.getElementById('prizeModalBackdrop');
  var prizeModalTitle = document.getElementById('prizeModalTitle');
  var prizeModalMsg = document.getElementById('prizeModalMsg');
  var prizeForm = document.getElementById('prizeForm');
  var prizeIdInput = document.getElementById('prizeIdInput');
  var prizeNameInput = document.getElementById('prizeNameInput');
  var prizeTierInput = document.getElementById('prizeTierInput');
  var prizeProbInput = document.getElementById('prizeProbInput');
  var prizeStockInput = document.getElementById('prizeStockInput');

  function populatePrizeSeriesSelect() {
    var prevValue = prizeSeriesSelect.value;
    prizeSeriesSelect.innerHTML = data.series.map(function (s) {
      return '<option value="' + s.id + '">' + s.coverEmoji + ' ' + s.name + '</option>';
    }).join('');
    if (prevValue && seriesById(prevValue)) prizeSeriesSelect.value = prevValue;
  }

  prizeSeriesSelect.addEventListener('change', renderPrizes);

  function currentPrizeSeriesId() {
    return prizeSeriesSelect.value || (data.series[0] && data.series[0].id);
  }

  function sumProbabilities(seriesId) {
    var sum = prizesFor(seriesId).reduce(function (s, p) { return s + p.probabilityPercent; }, 0);
    return Math.round(sum * 100) / 100;
  }

  function renderPrizes() {
    var seriesId = currentPrizeSeriesId();
    if (!seriesId) {
      probSumBanner.innerHTML = '<div class="msg error">请先在"系列管理"里新增一个系列。</div>';
      document.getElementById('prizesBody').innerHTML = '';
      return;
    }
    var sum = sumProbabilities(seriesId);
    var ok = Math.abs(sum - 100) < 0.001;
    probSumBanner.innerHTML = '<div class="msg ' + (ok ? 'success' : 'error') + '">当前概率合计：' + sum + '%' +
      (ok ? '（正确，共 100%）' : '（必须调整为正好 100% 才符合公示规范）') + '</div>';

    document.getElementById('prizesBody').innerHTML = prizesFor(seriesId).map(function (p) {
      var soldOut = p.remainingStock <= 0;
      return '<tr' + (soldOut ? ' class="sold-out"' : '') + '>' +
        '<td>' + p.name + '</td>' +
        '<td><span class="tier-badge ' + (TIER_CLASS[p.tier] || '') + '">' + p.tier + '</span></td>' +
        '<td>' + p.probabilityPercent + '%</td>' +
        '<td>' + (soldOut ? '<span class="soldout-label">已售罄</span>' : p.remainingStock + ' 件') + '</td>' +
        '<td class="table-actions">' +
        '<button class="btn btn-sm" data-edit="' + p.id + '">编辑</button>' +
        '<button class="btn btn-sm btn-danger" data-delete="' + p.id + '">删除</button>' +
        '</td></tr>';
    }).join('') || '<tr><td colspan="5" style="color:var(--muted)">该系列暂无奖品</td></tr>';

    document.querySelectorAll('#prizesBody [data-edit]').forEach(function (btn) {
      btn.addEventListener('click', function () { openPrizeModal(btn.dataset.edit); });
    });
    document.querySelectorAll('#prizesBody [data-delete]').forEach(function (btn) {
      btn.addEventListener('click', function () { deletePrize(btn.dataset.delete); });
    });
  }

  function openPrizeModal(id) {
    prizeModalMsg.innerHTML = '';
    prizeForm.reset();
    if (id) {
      var p = prizeById(id);
      prizeModalTitle.textContent = '编辑奖品';
      prizeIdInput.value = p.id;
      prizeNameInput.value = p.name;
      prizeTierInput.value = p.tier;
      prizeProbInput.value = p.probabilityPercent;
      prizeStockInput.value = p.remainingStock;
    } else {
      prizeModalTitle.textContent = '新增奖品';
      prizeIdInput.value = '';
      prizeTierInput.value = '普通';
      prizeStockInput.value = 0;
    }
    prizeModalBackdrop.classList.add('show');
  }

  document.getElementById('btnAddPrize').addEventListener('click', function () {
    if (!currentPrizeSeriesId()) { alert('请先新增一个系列。'); return; }
    openPrizeModal(null);
  });
  document.getElementById('btnClosePrizeModal').addEventListener('click', function () { prizeModalBackdrop.classList.remove('show'); });
  prizeModalBackdrop.addEventListener('click', function (e) { if (e.target === prizeModalBackdrop) prizeModalBackdrop.classList.remove('show'); });

  prizeForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var seriesId = currentPrizeSeriesId();
    var name = prizeNameInput.value.trim();
    var tier = prizeTierInput.value;
    var prob = parseFloat(prizeProbInput.value);
    var stock = parseInt(prizeStockInput.value, 10);

    if (!name || isNaN(prob) || prob < 0 || prob > 100 || isNaN(stock) || stock < 0) {
      prizeModalMsg.innerHTML = '<div class="msg error">请完整填写奖品名称，概率需在 0-100 之间，库存需为不小于 0 的整数。</div>';
      return;
    }

    var id = prizeIdInput.value;
    // Compute the hypothetical total probability for this series INCLUDING this add/edit,
    // and block the save unless it sums to exactly 100 — this is the core correctness rule.
    var others = prizesFor(seriesId).filter(function (p) { return p.id !== id; });
    var hypotheticalSum = others.reduce(function (s, p) { return s + p.probabilityPercent; }, 0) + prob;
    hypotheticalSum = Math.round(hypotheticalSum * 100) / 100;

    if (Math.abs(hypotheticalSum - 100) > 0.001) {
      prizeModalMsg.innerHTML = '<div class="msg error">保存失败：该系列奖品概率之和将变为 ' + hypotheticalSum + '%，必须正好等于 100% 才能保存。请调整概率后重试。</div>';
      return;
    }

    if (id) {
      var p = prizeById(id);
      p.name = name; p.tier = tier; p.probabilityPercent = prob; p.remainingStock = stock;
    } else {
      data.prizes.push({ id: BlindboxData.uid('p'), seriesId: seriesId, name: name, tier: tier, probabilityPercent: prob, remainingStock: stock });
    }
    BlindboxData.save(data);
    prizeModalBackdrop.classList.remove('show');
    renderPrizes();
  });

  function deletePrize(id) {
    if (!confirm('确定删除这个奖品吗？删除后该系列的概率合计可能不再等于 100%，请记得同步调整其余奖品的概率。')) return;
    data.prizes = data.prizes.filter(function (p) { return p.id !== id; });
    BlindboxData.save(data);
    renderPrizes();
  }

  // ---------- Draw records ----------
  var recordSeriesFilter = document.getElementById('recordSeriesFilter');

  function populateRecordSeriesFilter() {
    var prevValue = recordSeriesFilter.value;
    recordSeriesFilter.innerHTML = '<option value="all">全部系列</option>' + data.series.map(function (s) {
      return '<option value="' + s.id + '">' + s.coverEmoji + ' ' + s.name + '</option>';
    }).join('');
    if (prevValue && (prevValue === 'all' || seriesById(prevValue))) recordSeriesFilter.value = prevValue;
  }

  recordSeriesFilter.addEventListener('change', renderRecords);

  function renderRecords() {
    var filter = recordSeriesFilter.value || 'all';
    var list = data.drawRecords.slice().sort(function (a, b) { return a.drawnAt < b.drawnAt ? 1 : -1; });
    if (filter !== 'all') list = list.filter(function (r) { return r.seriesId === filter; });

    document.getElementById('recordsBody').innerHTML = list.map(function (r) {
      var p = prizeById(r.prizeId);
      return '<tr><td>' + seriesLabel(r.seriesId) + '</td><td>' + (p ? p.name : '（已删除奖品）') + '</td>' +
        '<td><span class="tier-badge ' + (TIER_CLASS[p ? p.tier : ''] || '') + '">' + (p ? p.tier : '-') + '</span></td>' +
        '<td>' + r.customerName + '</td><td>' + (r.drawnAt || '').replace('T', ' ').slice(0, 16) + '</td></tr>';
    }).join('') || '<tr><td colspan="5" style="color:var(--muted)">暂无抽取记录</td></tr>';
  }

  switchView('dashboard');
})();
