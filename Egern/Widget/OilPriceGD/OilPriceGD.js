/**
 * ==========================================
 * 📌 广东油价 (Gas Price) 小组件
 *
 * 修复说明：
 * - 保留旧版 Small / Medium / Large 布局与信息量。
 * - 当前油价：优先读取稳定广东省页面（含 92/95/98/柴油及涨跌）。
 * - 历史油价：读取广东历史表，恢复涨跌与大号历史曲线。
 * - 下轮预测：读取全国调价预测页，仅在距调价不足 72 小时时替换“较上次调整”。
 * ==========================================
 */

const REGION_NAME = '广东';
const CURRENT_URL = 'https://oil.qqday.com/province/440000.htm';
const HISTORY_URL = 'https://www.icauto.com.cn/oil/price_440000_0.html';
const PREDICT_URL = 'https://www.tuanyou.net/youjia/';
const OFFICIAL_URL = 'https://cx.sinopecsales.com/yjkqiantai/core/initCpb';

const CALENDAR_2026 = [
  [1,6],[1,20],[2,3],[2,24],[3,9],[3,23],[4,7],[4,21],[5,8],[5,21],
  [6,4],[6,18],[7,3],[7,17],[7,31],[8,14],[8,28],[9,11],[9,24],
  [10,15],[10,29],[11,12],[11,26],[12,10],[12,24]
];

const stringToBase64 = (str) => {
  if (typeof Buffer !== 'undefined') return Buffer.from(str, 'utf8').toString('base64');
  const encoded = encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  return btoa(encoded);
};

const lineChartSVG = (arr, { color = '#34C759', width = 120, height = 34, lineWidth = 2 } = {}) => {
  const nums = (arr || []).map(Number).filter(Number.isFinite).slice(-12);
  if (nums.length < 2) return null;
  const pad = Math.max(3, Math.ceil(lineWidth));
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const range = max - min || 1;
  const points = nums.map((n, i) => {
    const x = pad + (width - pad * 2) * (i / (nums.length - 1));
    const y = pad + (height - pad * 2) * (1 - ((n - min) / range));
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const bottom = height - pad;
  const area = `${points[0]} ${points.slice(1).join(' ')} ${width - pad},${bottom} ${pad},${bottom}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><linearGradient id="fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity="0.28"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs><polygon points="${area}" fill="url(#fill)"/><polyline points="${points.join(' ')}" fill="none" stroke="${color}" stroke-width="${lineWidth}" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>`;
  return `data:image/svg+xml;base64,${stringToBase64(svg)}`;
};

const htmlToText = (html) => String(html || '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<\/tr>/gi, '\n')
  .replace(/<\/p>/gi, '\n')
  .replace(/<\/div>/gi, '\n')
  .replace(/<\/li>/gi, '\n')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#43;|&plus;/gi, '+')
  .replace(/&uarr;/gi, '↑')
  .replace(/&darr;/gi, '↓')
  .replace(/\r/g, '')
  .replace(/[ \t]+/g, ' ')
  .replace(/ *\n */g, '\n')
  .trim();

const safeNum = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

async function getText(ctx, url, timeout = 12000) {
  const resp = await ctx.http.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
      'Accept': 'text/html,application/xhtml+xml,*/*',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    },
    timeout
  });
  const body = await resp.text();
  if (!body || body.length < 100) throw new Error(`HTTP ${resp.status || ''} 返回内容为空`);
  return body;
}

function parseCurrentPage(html) {
  const text = htmlToText(html);

  const findPrice = (label) => {
    const patterns = [
      new RegExp(`${label}号汽油为\\s*([0-9]+(?:\\.[0-9]+)?)\\s*元`, 'i'),
      new RegExp(`${label}号汽油[^\\d]{0,20}([0-9]+(?:\\.[0-9]+)?)\\s*元\\/升`, 'i')
    ];
    for (const re of patterns) {
      const m = text.match(re);
      if (m) return safeNum(m[1]);
    }
    return null;
  };

  const findDiesel = () => {
    const patterns = [
      /0号柴油为\s*([0-9]+(?:\.[0-9]+)?)\s*元/i,
      /0号柴油[^\d]{0,20}([0-9]+(?:\.[0-9]+)?)\s*元\/升/i
    ];
    for (const re of patterns) {
      const m = text.match(re);
      if (m) return safeNum(m[1]);
    }
    return null;
  };

  const findDelta = (grade) => {
    const re = new RegExp(`广东\\s*${grade}\\s*#?[\\s\\S]{0,36}?([0-9]+(?:\\.[0-9]+)?)[\\s\\S]{0,20}?([↑↓▲▼])\\s*([0-9]+(?:\\.[0-9]+)?)`, 'i');
    const m = text.match(re);
    if (!m) return null;
    const n = safeNum(m[3]);
    if (!Number.isFinite(n)) return null;
    return (m[2] === '↓' || m[2] === '▼') ? -n : n;
  };

  const p92 = findPrice('92');
  const p95 = findPrice('95');
  const p98 = findPrice('98');
  const diesel = findDiesel();

  if (![p92, p95, p98, diesel].every(Number.isFinite)) {
    throw new Error('当前油价源未返回完整 92/95/98/柴油数据');
  }

  return {
    p92: { price: p92, delta: findDelta('92') },
    p95: { price: p95, delta: findDelta('95') },
    p98: { price: p98, delta: findDelta('98') },
    diesel: { price: diesel, delta: findDelta('0') }
  };
}

function parseHistoryPage(html) {
  const text = htmlToText(html);
  const rows = [];
  const re = /(20\d{2})[-/.年](\d{1,2})[-/.月](\d{1,2})(?:日)?\s+([0-9]+(?:\.[0-9]+)?)\s+([0-9]+(?:\.[0-9]+)?)\s+([0-9]+(?:\.[0-9]+)?)\s+([0-9]+(?:\.[0-9]+)?)\s+([0-9]+(?:\.[0-9]+)?)\s+([0-9]+(?:\.[0-9]+)?)/g;
  let m;
  while ((m = re.exec(text)) && rows.length < 18) {
    rows.push({
      date: `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`,
      p92: safeNum(m[5]),
      p95: safeNum(m[7]),
      diesel: safeNum(m[9])
    });
  }
  return rows;
}

function deltaFromHistory(rows, key) {
  if (!Array.isArray(rows) || rows.length < 2) return null;
  const a = rows[0]?.[key];
  const b = rows[1]?.[key];
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Number((a - b).toFixed(2));
}

function parseNextAdjust(text) {
  const patterns = [
    /下次调价[:：]?\s*(20\d{2})[-/.年](\d{1,2})[-/.月](\d{1,2})/,
    /下一(?:次|轮)[^0-9]{0,16}(20\d{2})[-/.年](\d{1,2})[-/.月](\d{1,2})/
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
  }
  return null;
}

function parsePrediction(html) {
  const text = htmlToText(html);
  const nextAdjust = parseNextAdjust(text);

  const idx = text.indexOf('下轮油价预测');
  const scope = idx >= 0 ? text.slice(Math.max(0, idx - 100), idx + 260) : text;

  const patterns = [
    /(涨|上涨|上调|跌|下跌|下调)\s*([0-9]+(?:\.[0-9]+)?)\s*元\/升/,
    /预计\s*(涨|上涨|上调|跌|下跌|下调)[^\d]{0,10}([0-9]+(?:\.[0-9]+)?)\s*元\/升/
  ];
  let prediction = null;
  for (const re of patterns) {
    const m = scope.match(re);
    if (!m) continue;
    const value = safeNum(m[2]);
    if (!Number.isFinite(value)) continue;
    const up = ['涨', '上涨', '上调'].includes(m[1]);
    prediction = { up, minV: value, maxV: value };
    break;
  }
  return { nextAdjust, prediction };
}

async function loadData(ctx) {
  const [currentResult, historyResult, predictResult] = await Promise.allSettled([
    getText(ctx, CURRENT_URL),
    getText(ctx, HISTORY_URL),
    getText(ctx, PREDICT_URL)
  ]);

  if (currentResult.status !== 'fulfilled') {
    throw new Error(`当前油价读取失败：${currentResult.reason?.message || currentResult.reason || '未知错误'}`);
  }

  const current = parseCurrentPage(currentResult.value);
  const history = historyResult.status === 'fulfilled' ? parseHistoryPage(historyResult.value) : [];

  if (history.length >= 2) {
    if (!Number.isFinite(current.p92.delta)) current.p92.delta = deltaFromHistory(history, 'p92');
    if (!Number.isFinite(current.p95.delta)) current.p95.delta = deltaFromHistory(history, 'p95');
    if (!Number.isFinite(current.diesel.delta)) current.diesel.delta = deltaFromHistory(history, 'diesel');
  }

  let prediction = null;
  let nextAdjust = null;
  if (predictResult.status === 'fulfilled') {
    const parsed = parsePrediction(predictResult.value);
    prediction = parsed.prediction;
    nextAdjust = parsed.nextAdjust;
  }

  return { current, history, prediction, nextAdjust };
}

export default async function (ctx) {
  const family = String(ctx.widgetFamily || 'systemMedium').toLowerCase();
  const isSmall = family.includes('small');
  const isLarge = family.includes('large');

  const now = new Date();
  const Y = now.getFullYear();
  const P = n => String(n).padStart(2, '0');
  const updateTimeStr = `${P(now.getHours())}:${P(now.getMinutes())}`;
  const shortTimeStr = updateTimeStr;
  const refreshAfter = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  const C = {
    bg:      [{ light: '#FAFAFA', dark: '#1C1C1E' }, { light: '#EFEFF4', dark: '#111113' }],
    card:    { light: '#FFFFFF', dark: '#2C2C2E' },
    main:    { light: '#1C1C1E', dark: '#F2F2F7' },
    muted:   { light: '#8E8E93', dark: '#636366' },
    gold:    { light: '#B07C1A', dark: '#D4A02A' },
    red:     { light: '#C0392B', dark: '#FF453A' },
    teal:    { light: '#1E7E44', dark: '#30D158' },
    blue:    { light: '#2C5F8A', dark: '#5E9ED6' },
    divider: { light: '#E5E5EA', dark: '#38383A' }
  };

  const mkText = (text, size, weight, color, opts = {}) => ({
    type: 'text',
    text: String(text ?? ''),
    font: { size, weight, ...(opts.family ? { family: opts.family } : {}) },
    textColor: color,
    ...opts
  });
  const mkRow = (children, gap = 4, opts = {}) => ({
    type: 'stack', direction: 'row', alignItems: 'center', gap, children, ...opts
  });
  const mkIcon = (src, color, size = 13) => ({
    type: 'image', src: `sf-symbol:${src}`, color, width: size, height: size
  });
  const mkSpacer = length => length != null ? { type: 'spacer', length } : { type: 'spacer' };

  const backgroundGradient = {
    type: 'linear', colors: C.bg,
    startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 }
  };

  const getStaticNext = () => {
    const next = CALENDAR_2026.find(([m, d]) => new Date(Y, m - 1, d + 1, 0, 0, 0).getTime() > now.getTime());
    return next ? { y: Y, m: next[0], d: next[1] } : null;
  };

  let data = null;
  let fetchError = null;
  try {
    data = await loadData(ctx);
  } catch (e) {
    fetchError = e?.message || String(e);
  }

  const nextRaw = data?.nextAdjust || getStaticNext();
  const nextAdjust = (() => {
    if (!nextRaw) return { dateStr: '待更新', countdown: '', isUrgent: false };
    const targetDate = new Date(nextRaw.y, nextRaw.m - 1, nextRaw.d + 1, 0, 0, 0);
    const totalMinutes = Math.max(0, Math.floor((targetDate.getTime() - now.getTime()) / 60000));
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;
    const countdownBody = days > 0 ? `${days}d${hours}h后` : `${hours}h${minutes}m后`;
    return {
      dateStr: `${P(nextRaw.m)}.${P(nextRaw.d)} 24:00`,
      countdown: `(${countdownBody})`,
      isUrgent: totalMinutes < 72 * 60
    };
  })();

  if (!data) {
    return {
      type: 'widget', refreshAfter, padding: 16, url: OFFICIAL_URL, backgroundGradient,
      children: [
        mkRow([mkIcon('fuelpump.circle.fill', C.red, 16), mkSpacer(4), mkText('广东油价加载失败', 15, 'heavy', C.main)], 0),
        mkSpacer(8),
        mkText(fetchError || '等待下一次刷新', 11, 'medium', C.muted, { maxLines: 3 })
      ]
    };
  }

  const history = Array.isArray(data.history) ? data.history : [];
  const current = data.current;

  const seriesOf = key => history.slice().reverse().map(row => row[key]).filter(Number.isFinite);

  const items = {
    p92: { price: current.p92.price, offset: current.p92.delta, series: seriesOf('p92') },
    p95: { price: current.p95.price, offset: current.p95.delta, series: seriesOf('p95') },
    p98: { price: current.p98.price, offset: current.p98.delta, series: [] },
    diesel: { price: current.diesel.price, offset: current.diesel.delta, series: seriesOf('diesel') }
  };

  const prices = {
    p92: items.p92.price,
    p95: items.p95.price,
    p98: items.p98.price,
    diesel: items.diesel.price
  };

  let trendLabel = nextAdjust.isUrgent ? '下轮预测: ' : '较上次调整: ';
  let trendInfo = '';
  let trendColor = C.muted;
  let hasTrendData = false;

  const offsets = [items.p92, items.p95, items.p98, items.diesel]
    .map(it => it.offset)
    .filter(v => Number.isFinite(v) && v !== 0);

  if (offsets.length) {
    hasTrendData = true;
    const sumSign = offsets.reduce((a, b) => a + b, 0);
    const overallUp = sumSign >= 0;
    const absVals = offsets.map(v => Math.abs(v));
    const minAbs = Math.min(...absVals).toFixed(2);
    const maxAbs = Math.max(...absVals).toFixed(2);
    trendColor = overallUp ? C.red : C.teal;
    trendInfo = `${overallUp ? '↑' : '↓'} ${minAbs === maxAbs ? minAbs : `${minAbs}-${maxAbs}`}¥/L`;
  }

  if (nextAdjust.isUrgent && data.prediction) {
    const prediction = data.prediction;
    const rangeStr = prediction.minV === prediction.maxV
      ? `${prediction.minV.toFixed(2)}¥/L`
      : `${prediction.minV.toFixed(2)}-${prediction.maxV.toFixed(2)}¥/L`;
    trendLabel = '下轮预测: ';
    trendColor = prediction.up ? C.red : C.teal;
    trendInfo = `${prediction.up ? '↑' : '↓'} ${rangeStr}`;
    hasTrendData = true;
  } else if (nextAdjust.isUrgent && !data.prediction) {
    trendLabel = '较上次调整: ';
  }

  const PRICE_ITEMS = [
    { label: '92号', key: 'p92', color: C.gold, hex: '#D4A02A', item: items.p92 },
    { label: '95号', key: 'p95', color: C.red, hex: '#FF453A', item: items.p95 },
    { label: '98号', key: 'p98', color: C.blue, hex: '#2F80ED', item: items.p98 },
    { label: '柴油', key: 'diesel', color: C.teal, hex: '#27AE60', item: items.diesel }
  ].map(i => ({
    ...i,
    val: Number.isFinite(prices[i.key]) ? Number(prices[i.key]).toFixed(2) : '--'
  }));

  const fmtDelta = (item) => {
    const off = item.item?.offset;
    if (!Number.isFinite(off) || off === 0) return null;
    return {
      text: `${off > 0 ? '+' : ''}${off.toFixed(2)}`,
      color: off > 0 ? C.red : C.teal
    };
  };

  const buildPriceCard = (item, config) => {
    const delta = fmtDelta(item);
    const showCurve = config.showCurve && item.item?.series?.length > 1;
    const svgUrl = showCurve
      ? lineChartSVG(item.item.series, {
          color: item.hex,
          width: config.curveWidth,
          height: config.curveHeight,
          lineWidth: 1.8
        })
      : null;

    return {
      type: 'stack', direction: 'column', alignItems: 'center', flex: 1,
      backgroundColor: C.card, borderRadius: config.radius, padding: config.padding,
      children: [
        mkSpacer(),
        mkText(item.label, config.labelFz, config.labelWeight, item.color, { maxLines: 1, minScale: 0.78 }),
        mkSpacer(config.innerGap),
        mkText(item.val, config.valFz, 'heavy', C.main, { maxLines: 1, minScale: 0.74 }),
        mkSpacer(config.deltaGap ?? 2),
        delta
          ? mkText(delta.text, config.deltaFz, 'bold', delta.color, { maxLines: 1, minScale: 0.74 })
          : mkText(' ', config.deltaFz, 'bold', C.muted, { maxLines: 1 }),
        ...(svgUrl ? [
          mkSpacer(config.curveGap ?? 6),
          { type: 'image', src: svgUrl, width: config.curveWidth, height: config.curveHeight, resizable: true, resizeMode: 'contain' }
        ] : []),
        mkSpacer()
      ]
    };
  };

  if (isSmall) {
    const cardCfg = {
      radius: 10, padding: [4, 2, 4, 2], labelFz: 10, labelWeight: 'bold',
      valFz: 14, innerGap: 1, deltaFz: 9, deltaGap: 1
    };
    return {
      type: 'widget', refreshAfter, padding: 12, url: OFFICIAL_URL, backgroundGradient,
      children: [
        mkRow([
          mkIcon('fuelpump.circle.fill', C.red, 13), mkSpacer(4),
          mkText(`${REGION_NAME}油价`, 13, 'heavy', C.main),
          mkSpacer(),
          mkText(shortTimeStr, 9, 'bold', C.muted, { family: 'Menlo' })
        ], 0),
        mkSpacer(8),
        { type: 'stack', direction: 'column', gap: 8, flex: 1, children: [
          mkRow(PRICE_ITEMS.slice(0, 2).map(item => buildPriceCard(item, cardCfg)), 6, { flex: 1 }),
          mkRow(PRICE_ITEMS.slice(2, 4).map(item => buildPriceCard(item, cardCfg)), 6, { flex: 1 })
        ]},
        mkSpacer(8),
        mkRow([
          mkSpacer(),
          mkIcon('clock.fill', C.red, 9), mkSpacer(3),
          mkText(`下轮调价: ${nextAdjust.dateStr}`, 9, 'bold', C.red)
        ], 0)
      ]
    };
  }

  if (isLarge) {
    const cardCfg = {
      radius: 14, padding: [10, 4, 10, 4], labelFz: 14, labelWeight: 'heavy',
      valFz: 24, innerGap: 4, deltaFz: 12, deltaGap: 2,
      showCurve: true, curveWidth: 84, curveHeight: 26, curveGap: 5
    };
    return {
      type: 'widget', refreshAfter, padding: 16, url: OFFICIAL_URL, backgroundGradient,
      children: [
        mkRow([
          mkIcon('fuelpump.circle.fill', C.red, 17), mkSpacer(4),
          mkText(`${REGION_NAME}油价`, 16, 'heavy', C.main), mkSpacer(),
          mkText('下轮调价: ', 12, 'medium', C.red),
          mkText(nextAdjust.dateStr, 12, 'bold', C.red),
          mkText(` ${nextAdjust.countdown}`, 12, 'bold', C.red)
        ], 0),
        mkSpacer(12),
        { type: 'stack', direction: 'column', gap: 12, flex: 1, children: [
          mkRow(PRICE_ITEMS.slice(0, 2).map(item => buildPriceCard(item, cardCfg)), 12, { flex: 1 }),
          mkRow(PRICE_ITEMS.slice(2, 4).map(item => buildPriceCard(item, cardCfg)), 12, { flex: 1 })
        ]},
        mkSpacer(10),
        { type: 'stack', height: 0.5, backgroundColor: C.divider, borderRadius: 1, children: [] },
        mkSpacer(8),
        mkRow([
          ...(hasTrendData ? [
            mkRow([
              mkText(trendLabel, 11, 'medium', C.muted),
              mkText(trendInfo, 11, 'bold', trendColor, { maxLines: 1 })
            ], 2)
          ] : []),
          mkSpacer(),
          mkText(updateTimeStr, 11, 'bold', C.muted, { family: 'Menlo' })
        ], 0)
      ]
    };
  }

  const cardCfgMed = {
    radius: 12, padding: [10, 4, 10, 4], labelFz: 11, labelWeight: 'bold',
    valFz: 17, innerGap: 3, deltaFz: 10, deltaGap: 2
  };
  const adjustText = `下轮调价 ${nextAdjust.dateStr}${nextAdjust.countdown ? ` ${nextAdjust.countdown}` : ''}`;

  return {
    type: 'widget', refreshAfter, padding: 13, url: OFFICIAL_URL, backgroundGradient,
    children: [
      mkRow([
        mkIcon('fuelpump.circle.fill', C.red, 16), mkSpacer(4),
        mkText(`${REGION_NAME}油价`, 15, 'heavy', C.main, { maxLines: 1 }),
        mkSpacer(),
        mkText(adjustText, 10, 'bold', C.red, { maxLines: 1, minScale: 0.72 })
      ], 0),
      {
        type: 'stack', direction: 'column', flex: 1,
        children: [
          mkSpacer(),
          mkRow(PRICE_ITEMS.map(item => buildPriceCard(item, cardCfgMed)), 7, { height: 82 }),
          mkSpacer()
        ]
      },
      mkRow([
        ...(hasTrendData ? [
          mkRow([
            mkText(trendLabel, 10, 'medium', C.muted, { maxLines: 1, minScale: 0.8 }),
            mkText(trendInfo, 10, 'bold', trendColor, { maxLines: 1, minScale: 0.8 })
          ], 2)
        ] : []),
        mkSpacer(),
        mkText(updateTimeStr, 10, 'bold', C.muted, { family: 'Menlo', maxLines: 1 })
      ], 0)
    ]
  };
}
