(function () {
  'use strict';

  var seriesGrid = document.getElementById('seriesGrid');
  var lootList = document.getElementById('lootList');
  var lootCount = document.getElementById('lootCount');
  var balanceBadge = document.getElementById('balanceBadge');
  var buyerNameInput = document.getElementById('buyerNameInput');

  var modalBackdrop = document.getElementById('modalBackdrop');
  var btnCloseModal = document.getElementById('btnCloseModal');
  var modalSeriesName = document.getElementById('modalSeriesName');
  var modalSeriesDesc = document.getElementById('modalSeriesDesc');
  var prizeTableBody = document.getElementById('prizeTableBody');
  var probSumNote = document.getElementById('probSumNote');
  var modalMsg = document.getElementById('modalMsg');
  var revealResult = document.getElementById('revealResult');
  var drawForm = document.getElementById('drawForm');
  var drawPriceLabel = document.getElementById('drawPriceLabel');
  var btnDraw = document.getElementById('btnDraw');

  var data = BlindboxData.load();
  var currentSeries = null;

  var TIER_CLASS = { '普通': 'tier-common', '稀有': 'tier-rare', '隐藏': 'tier-hidden' };

  function prizesFor(seriesId) {
    return data.prizes.filter(function (p) { return p.seriesId === seriesId; });
  }

  function fmtMoney(n) {
    var r = Math.round(n * 100) / 100;
    return (r % 1 === 0) ? String(r) : r.toFixed(2);
  }

  function renderBalance() {
    balanceBadge.textContent = '余额 ¥' + fmtMoney(data.balance);
  }

  function renderGrid() {
    seriesGrid.innerHTML = data.series.map(function (s) {
      var prizes = prizesFor(s.id);
      var inStockCount = prizes.filter(function (p) { return p.remainingStock > 0; }).length;
      var soldOut = inStockCount === 0;
      return '<div class="series-card" data-id="' + s.id + '">' +
        '<div class="series-card__cover">' + s.coverEmoji + '</div>' +
        '<div class="series-card__body">' +
        '<h3>' + s.name + '</h3>' +
        '<p class="series-card__desc">' + s.desc + '</p>' +
        '<div class="series-card__meta"><span class="series-card__price">¥' + fmtMoney(s.price) + ' <span>/ 次</span></span>' +
        (soldOut ? '<span class="tag tag-soldout">已售罄</span>' : '<span class="tag">' + inStockCount + '/' + prizes.length + ' 款有货</span>') +
        '</div></div></div>';
    }).join('');

    seriesGrid.querySelectorAll('.series-card').forEach(function (card) {
      card.addEventListener('click', function () { openModal(card.dataset.id); });
    });
  }

  function renderPrizeTable(seriesId) {
    var prizes = prizesFor(seriesId);
    var sum = prizes.reduce(function (s, p) { return s + p.probabilityPercent; }, 0);
    sum = Math.round(sum * 100) / 100;

    prizeTableBody.innerHTML = prizes.map(function (p) {
      var soldOut = p.remainingStock <= 0;
      return '<tr class="prize-row' + (soldOut ? ' sold-out' : '') + '">' +
        '<td>' + p.name + '</td>' +
        '<td><span class="tier-badge ' + (TIER_CLASS[p.tier] || '') + '">' + p.tier + '</span></td>' +
        '<td>' + p.probabilityPercent + '%</td>' +
        '<td>' + (soldOut ? '<span class="soldout-label">已售罄</span>' : p.remainingStock + ' 件') + '</td>' +
        '</tr>';
    }).join('');

    probSumNote.innerHTML = '本系列公示概率合计：<strong>' + sum + '%</strong>（概率与库存数据始终公开展示）';
  }

  function openModal(seriesId) {
    currentSeries = data.series.find(function (s) { return s.id === seriesId; });
    if (!currentSeries) return;

    modalSeriesName.textContent = currentSeries.coverEmoji + ' ' + currentSeries.name;
    modalSeriesDesc.textContent = currentSeries.desc;
    drawPriceLabel.textContent = fmtMoney(currentSeries.price);

    renderPrizeTable(seriesId);
    modalMsg.innerHTML = '';
    revealResult.style.display = 'none';
    revealResult.innerHTML = '';
    modalBackdrop.classList.add('show');
  }

  function closeModal() {
    modalBackdrop.classList.remove('show');
    currentSeries = null;
  }

  btnCloseModal.addEventListener('click', closeModal);
  modalBackdrop.addEventListener('click', function (e) {
    if (e.target === modalBackdrop) closeModal();
  });

  function showMsg(text, isError) {
    modalMsg.innerHTML = '<div class="msg ' + (isError ? 'error' : 'success') + '">' + text + '</div>';
  }

  function weightedPick(inStockPrizes) {
    var totalWeight = inStockPrizes.reduce(function (s, p) { return s + p.probabilityPercent; }, 0);
    var r = Math.random() * totalWeight;
    for (var i = 0; i < inStockPrizes.length; i++) {
      r -= inStockPrizes[i].probabilityPercent;
      if (r <= 0) return inStockPrizes[i];
    }
    return inStockPrizes[inStockPrizes.length - 1];
  }

  drawForm.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!currentSeries) return;

    revealResult.style.display = 'none';
    revealResult.innerHTML = '';

    var price = currentSeries.price;
    if (data.balance < price) {
      var shortfall = Math.round((price - data.balance) * 100) / 100;
      showMsg('余额不足，还差 ¥' + fmtMoney(shortfall) + '，请先充值后再抽取。', true);
      return;
    }

    var prizes = prizesFor(currentSeries.id);
    var inStock = prizes.filter(function (p) { return p.remainingStock > 0; });
    if (inStock.length === 0) {
      showMsg('该系列已全部售罄，无法抽取。', true);
      return;
    }

    var chosen = weightedPick(inStock);

    data.balance -= price;
    chosen.remainingStock -= 1;

    var record = {
      id: BlindboxData.uid('d'),
      seriesId: currentSeries.id,
      prizeId: chosen.id,
      customerName: (data.buyerName || '').trim() || '神秘买家',
      drawnAt: new Date().toISOString(),
    };
    data.drawRecords.push(record);
    BlindboxData.save(data);

    showMsg('', false);
    modalMsg.innerHTML = '';
    revealResult.className = 'reveal-result show tier-bg-' + (TIER_CLASS[chosen.tier] || '');
    revealResult.style.display = 'block';
    revealResult.innerHTML = '<div class="reveal-title">🎉 恭喜抽中</div>' +
      '<div class="reveal-prize"><span class="tier-badge ' + (TIER_CLASS[chosen.tier] || '') + '">' + chosen.tier + '</span> ' + chosen.name + '</div>' +
      '<div class="reveal-sub">已扣除 ¥' + fmtMoney(price) + '，当前余额 ¥' + fmtMoney(data.balance) + '</div>';

    renderPrizeTable(currentSeries.id);
    renderBalance();
    renderGrid();
    renderLoot();
  });

  function seriesName(id) {
    var s = data.series.find(function (x) { return x.id === id; });
    return s ? s.coverEmoji + ' ' + s.name : '（已删除系列）';
  }

  function prizeById(id) {
    return data.prizes.find(function (p) { return p.id === id; });
  }

  function renderLoot() {
    var list = data.drawRecords.slice().sort(function (a, b) { return a.drawnAt < b.drawnAt ? 1 : -1; });
    lootCount.textContent = list.length;
    lootList.innerHTML = list.map(function (r) {
      var prize = prizeById(r.prizeId);
      var prizeName = prize ? prize.name : '（已删除奖品）';
      var tier = prize ? prize.tier : '';
      var time = r.drawnAt ? r.drawnAt.replace('T', ' ').slice(0, 16) : '';
      return '<div class="loot-item">' +
        '<div class="loot-item__main"><span class="tier-badge ' + (TIER_CLASS[tier] || '') + '">' + tier + '</span> ' +
        '<strong>' + prizeName + '</strong> <span class="loot-item__series">来自 ' + seriesName(r.seriesId) + '</span></div>' +
        '<div class="loot-item__meta">' + r.customerName + ' · ' + time + '</div>' +
        '</div>';
    }).join('') || '<div class="loot-empty">还没有抽过任何盲盒，去上面挑一个系列试试手气吧。</div>';
  }

  buyerNameInput.value = data.buyerName || '';
  buyerNameInput.addEventListener('input', function () {
    data.buyerName = buyerNameInput.value;
    BlindboxData.save(data);
  });

  renderBalance();
  renderGrid();
  renderLoot();
})();
