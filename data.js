(function (global) {
  'use strict';
  var STORAGE_KEY = 'blindbox_lite_data_v1';

  function seed() {
    return {
      balance: 300,
      buyerName: '神秘买家',
      series: [
        { id: 's1', name: '星际探险家', price: 39, coverEmoji: '🚀', desc: '穿梭星海的探险队成员，从陆行者到传说中的星舰长，还有极稀有的隐藏款「宇宙之心」。' },
        { id: 's2', name: '森林精灵', price: 29, coverEmoji: '🦊', desc: '住在古老森林里的精灵伙伴，温顺的小松鼠、机灵的狐狸，运气够好还能遇见森林女王。' },
        { id: 's3', name: '海洋传说', price: 49, coverEmoji: '🐬', desc: '深海主题系列，从常见的小丑鱼到传说级的深海巨兽，库存已经不多了。' },
        { id: 's4', name: '甜品乐园', price: 19, coverEmoji: '🍰', desc: '可爱的甜品拟人系列，马卡龙、布丁、草莓蛋糕，还有隐藏款黄金甜筒——本系列现货已经卖空。' },
      ],
      prizes: [
        // 星际探险家 s1 — sum 100
        { id: 's1p1', seriesId: 's1', name: '陆行者', tier: '普通', probabilityPercent: 40, remainingStock: 50 },
        { id: 's1p2', seriesId: 's1', name: '导航员', tier: '普通', probabilityPercent: 30, remainingStock: 46 },
        { id: 's1p3', seriesId: 's1', name: '星舰长', tier: '稀有', probabilityPercent: 15, remainingStock: 20 },
        { id: 's1p4', seriesId: 's1', name: '星云使者', tier: '稀有', probabilityPercent: 10, remainingStock: 15 },
        { id: 's1p5', seriesId: 's1', name: '宇宙之心', tier: '隐藏', probabilityPercent: 5, remainingStock: 3 },

        // 森林精灵 s2 — sum 100，其中「刺猬」库存为 0，用于测试售罄款排除逻辑
        { id: 's2p1', seriesId: 's2', name: '小松鼠', tier: '普通', probabilityPercent: 35, remainingStock: 40 },
        { id: 's2p2', seriesId: 's2', name: '刺猬', tier: '普通', probabilityPercent: 35, remainingStock: 0 },
        { id: 's2p3', seriesId: 's2', name: '猫头鹰', tier: '稀有', probabilityPercent: 15, remainingStock: 18 },
        { id: 's2p4', seriesId: 's2', name: '狐狸', tier: '稀有', probabilityPercent: 10, remainingStock: 12 },
        { id: 's2p5', seriesId: 's2', name: '森林女王', tier: '隐藏', probabilityPercent: 5, remainingStock: 2 },

        // 海洋传说 s3 — sum 100，库存已接近清空但未全部为 0
        { id: 's3p1', seriesId: 's3', name: '小丑鱼', tier: '普通', probabilityPercent: 40, remainingStock: 2 },
        { id: 's3p2', seriesId: 's3', name: '海龟', tier: '普通', probabilityPercent: 30, remainingStock: 0 },
        { id: 's3p3', seriesId: 's3', name: '海豚', tier: '稀有', probabilityPercent: 20, remainingStock: 0 },
        { id: 's3p4', seriesId: 's3', name: '深海巨兽', tier: '隐藏', probabilityPercent: 10, remainingStock: 0 },

        // 甜品乐园 s4 — sum 100，全系列库存为 0，用于测试「系列已全部售罄」拦截
        { id: 's4p1', seriesId: 's4', name: '马卡龙', tier: '普通', probabilityPercent: 40, remainingStock: 0 },
        { id: 's4p2', seriesId: 's4', name: '布丁', tier: '普通', probabilityPercent: 30, remainingStock: 0 },
        { id: 's4p3', seriesId: 's4', name: '草莓蛋糕', tier: '稀有', probabilityPercent: 20, remainingStock: 0 },
        { id: 's4p4', seriesId: 's4', name: '黄金甜筒', tier: '隐藏', probabilityPercent: 10, remainingStock: 0 },
      ],
      drawRecords: [
        { id: 'd1', seriesId: 's1', prizeId: 's1p1', customerName: '王先生', drawnAt: '2026-08-18T10:22:00.000Z' },
        { id: 'd2', seriesId: 's1', prizeId: 's1p3', customerName: '李女士', drawnAt: '2026-08-20T03:11:00.000Z' },
        { id: 'd3', seriesId: 's2', prizeId: 's2p1', customerName: '张先生', drawnAt: '2026-08-25T07:40:00.000Z' },
        { id: 'd4', seriesId: 's3', prizeId: 's3p1', customerName: '陈小姐', drawnAt: '2026-09-01T09:05:00.000Z' },
      ],
    };
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        var s = seed();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
        return s;
      }
      return JSON.parse(raw);
    } catch (e) {
      return seed();
    }
  }

  function save(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function uid(prefix) {
    return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  global.BlindboxData = {
    load: load,
    save: save,
    uid: uid,
    reset: function () { var s = seed(); save(s); return s; },
  };
})(window);
