/**
 * 广东油价 · Egern Widget
 * 修复版：保留原有三尺寸与居中卡片布局，替换失效的中石化旧 /data/* 接口。
 * 数据：主源 9662 广东油价页；备源 车主手册广东油价页。
 */

const REGION_NAME = '广东';
const PRIMARY_URL = 'https://9662.net/guangdong/16175.html';
const FALLBACK_URL = 'https://www.icauto.com.cn/oil/price_440000_0.html';
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
  .replace(/<br\s*\/?>/gi, ' ')
  .replace(/<\/tr>/gi, ' \n ')
  .replace(/<\/p>/gi, ' \n ')
  .replace(/<\/div>/gi, ' \n ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#43;|&plus;/gi, '+')
  .replace(/\r/g, '')
  .replace(/[\t ]+/g, ' ')
  .replace(/ *\n */g, '\n')
  .trim();

const safeNum = (v) => {
  const n = Number(v);
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
  if (!body || body.length < 200) throw new Error(`HTTP ${resp.status || ''} 返回内容为空`);
  return body;
}

function pickCurrent(text, label) {
  const patterns = [
    new RegExp(`${label}[^\\d]{0,24}([0-9]+(?:\\.[0-9]+)?)\\s*元(?:\\/元)?\\/升[^+\\-\\d]{0,20}([+\\-]\\d+(?:\\.\\d+)?)?`, 'i'),
    new RegExp(`${label}[^\\d]{0,24}为?\\s*([0-9]+(?:\\.[0-9]+)?)\\s*元`, 'i'),
    new RegExp(`${label}[^\\d]{0,16}([0-9]+(?:\\.[0-9]+)?)`, 'i')
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) return { price: safeNum(m[1]), delta: safeNum(m[2]) };
  }
  return { price: null, delta: null };
}

function parseHistory(text) {
  const rows = [];
  const re = /(20\d{2})[-/.年](\d{1,2})[-/.月](\d{1,2})(?:日)?[\s\S]{0,40}?([0-9]+(?:\.[0-9]+)?)[\s\S]{0,24}?([+\-]?\d+(?:\.\d+)?)?[\s\S]{0,28}?([0-9]+(?:\.[0-9]+)?)[\s\S]{0,24}?([+\-]?\d+(?:\.\d+)?)?[\s\S]{0,28}?([0-9]+(?:\.[0-9]+)?)[\s\S]{0,24}?([+\-]?\d+(?:\.\d+)?)?[\s\S]{0,28}?([0-9]+(?:\.[0-9]+)?)[\s\S]{0,24}?([+\-]?\d+(?:\.\d+)?)?/g;
  let m;
  while ((m = re.exec(text)) && rows.length < 16) {
    const row = {
      date: `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`,
      p92: safeNum(m[4]), p95: safeNum(m[6]), p98: safeNum(m[8]), diesel: safeNum(m[10])
    };
    if ([row.p92,row.p95,row.p98,row.diesel].filter(Number.isFinite).length >= 3) rows.push(row);
  }
  return rows;
}

function parseNextAdjust(text) {
  const patterns = [
    /下一次油价调整窗口时间(?:是|为)?\s*(20\d{2})[-年](\d{1,2})[-月](\d{1,2})日?\s*24(?:点|时)/,
    /下一(?:轮|次)[^\d]{0,12}(20\d{2})[-年](\d{1,2})[-月](\d{1,2})日?\s*24(?:点|时)/
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
  }
  return null;
}

function parsePrimary(html) {
  const text = htmlToText(html);
  const p92 = pickCurrent(text, '92号汽油');
  const p95 = pickCurrent(text, '95号汽油');
  const p98 = pickCurrent(text, '98号汽油');
  const diesel = pickCurrent(text, '0号柴油');
  if (![p92.price,p95.price,diesel.price].every(Number.isFinite)) throw new Error('主源未解析到完整油价');
  return { p92, p95, p98, diesel, history: parseHistory(text), nextAdjust: parseNextAdjust(text), source: '9662' };
}

function parseFallback(html) {
  const text = htmlToText(html);
  const p92 = pickCurrent(text, '92号汽油');
  const p95 = pickCurrent(text, '95号汽油');
  const p98 = pickCurrent(text, '98号汽油');
  const diesel = pickCurrent(text, '0号柴油');
  if (![p92.price,p95.price,diesel.price].every(Number.isFinite)) throw new Error('备源未解析到完整油价');
  return { p92, p95, p98, diesel, history: parseHistory(text), nextAdjust: parseNextAdjust(text), source: 'icauto' };
}

async function loadData(ctx) {
  let firstError = '';
  try {
    return parsePrimary(await getText(ctx, PRIMARY_URL));
  } catch (e) {
    firstError = e?.message || String(e);
  }
  try {
    const data = parseFallback(await getText(ctx, FALLBACK_URL));
    data.warning = firstError;
    return data;
  } catch (e) {
    throw new Error(`${firstError || '主源失败'}；${e?.message || String(e)}`);
  }
}

export default async function (ctx) {
  const family  = String(ctx.widgetFamily || 'systemMedium').toLowerCase();
  const isSmall = family.includes('small');
  const isLarge = family.includes('large');
  const now = new Date();
  const P = n => String(n).padStart(2, '0');
  const updateTimeStr = `${P(now.getHours())}:${P(now.getMinutes())}`;
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

  const mkText = (value, size, weight, color, opts = {}) => ({
    type: 'text', text: String(value ?? ''), font: { size, weight, ...(opts.family ? { family: opts.family } : {}) },
    textColor: color, ...opts
  });
  const mkRow = (children, gap = 4, opts = {}) => ({ type: 'stack', direction: 'row', alignItems: 'center', gap, children, ...opts });
  const mkIcon = (src, color, size = 13) => ({ type: 'image', src: `sf-symbol:${src}`, color, width: size, height: size });
  const mkSpacer = length => length != null ? { type: 'spacer', length } : { type: 'spacer' };
  const divider = () => ({ type: 'stack', height: 0.5, backgroundColor: C.divider, borderRadius: 1, children: [] });
  const backgroundGradient = { type: 'linear', colors: C.bg, startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 } };

  let data = null;
  let fetchError = null;
  try { data = await loadData(ctx); } catch (e) { fetchError = e?.message || String(e); }

  const getStaticNext = () => {
    const y = now.getFullYear();
    const next = CALENDAR_2026.find(([m,d]) => new Date(y,m-1,d+1,0,0,0).getTime() > now.getTime());
    return next ? { y, m: next[0], d: next[1] } : null;
  };
  const nextRaw = data?.nextAdjust || getStaticNext();
  const nextAdjust = (() => {
    if (!nextRaw) return { dateStr: '待更新', countdown: '', isUrgent: false };
    const target = new Date(nextRaw.y, nextRaw.m - 1, nextRaw.d + 1, 0, 0, 0);
    const totalMinutes = Math.max(0, Math.floor((target.getTime() - now.getTime()) / 60000));
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;
    return {
      dateStr: `${P(nextRaw.m)}.${P(nextRaw.d)} 24:00`,
      countdown: `(${days > 0 ? `${days}d${hours}h后` : `${hours}h${minutes}m后`})`,
      isUrgent: totalMinutes < 72 * 60
    };
  })();

  const history = Array.isArray(data?.history) ? data.history : [];
  const seriesOf = key => history.slice().reverse().map(r => r[key]).filter(Number.isFinite);
  const raw = {
    p92: data?.p92 || { price: null, delta: null },
    p95: data?.p95 || { price: null, delta: null },
    p98: data?.p98 || { price: null, delta: null },
    diesel: data?.diesel || { price: null, delta: null }
  };

  const PRICE_ITEMS = [
    { label: '92号', key: 'p92', color: C.gold, hex: '#D4A02A' },
    { label: '95号', key: 'p95', color: C.red, hex: '#FF453A' },
    { label: '98号', key: 'p98', color: C.blue, hex: '#2F80ED' },
    { label: '柴油', key: 'diesel', color: C.teal, hex: '#27AE60' }
  ].map(item => ({
    ...item,
    price: raw[item.key].price,
    delta: raw[item.key].delta,
    val: Number.isFinite(raw[item.key].price) ? raw[item.key].price.toFixed(2) : '--',
    series: seriesOf(item.key)
  }));

  const deltas = PRICE_ITEMS.map(i => i.delta).filter(v => Number.isFinite(v) && v !== 0);
  let trendLabel = '较上次调整: ';
  let trendInfo = '';
  let trendColor = C.muted;
  let hasTrendData = false;
  if (deltas.length) {
    hasTrendData = true;
    const overallUp = deltas.reduce((a,b) => a + b, 0) >= 0;
    const vals = deltas.map(v => Math.abs(v));
    const min = Math.min(...vals).toFixed(2);
    const max = Math.max(...vals).toFixed(2);
    trendInfo = `${overallUp ? '↑' : '↓'} ${min === max ? min : `${min}-${max}`}¥/L`;
    trendColor = overallUp ? C.red : C.teal;
  }

  const fmtDelta = item => {
    if (!Number.isFinite(item.delta) || item.delta === 0) return null;
    return { text: `${item.delta > 0 ? '+' : ''}${item.delta.toFixed(2)}`, color: item.delta > 0 ? C.red : C.teal };
  };

  const buildPriceCard = (item, config) => {
    const delta = fmtDelta(item);
    const svgUrl = config.showCurve && item.series.length > 1
      ? lineChartSVG(item.series, { color: item.hex, width: config.curveWidth, height: config.curveHeight, lineWidth: 1.8 })
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
        delta ? mkText(delta.text, config.deltaFz, 'bold', delta.color, { maxLines: 1 }) : mkText(' ', config.deltaFz, 'bold', C.muted),
        ...(svgUrl ? [mkSpacer(config.curveGap ?? 6), { type: 'image', src: svgUrl, width: config.curveWidth, height: config.curveHeight, resizable: true, resizeMode: 'contain' }] : []),
        mkSpacer()
      ]
    };
  };

  if (!data) {
    return {
      type: 'widget', refreshAfter, padding: 14, url: OFFICIAL_URL, backgroundGradient,
      children: [
        mkRow([mkIcon('fuelpump.circle.fill', C.red, 16), mkText(`${REGION_NAME}油价`, 15, 'heavy', C.main), mkSpacer(), mkText(updateTimeStr, 10, 'bold', C.muted, { family: 'Menlo' })], 6),
        mkSpacer(),
        { type: 'stack', direction: 'column', alignItems: 'center', gap: 7, children: [
          mkIcon('exclamationmark.triangle.fill', C.red, 24),
          mkText('油价数据加载失败', 13, 'heavy', C.main),
          mkText(fetchError || '等待下一次刷新', 9, 'medium', C.muted, { maxLines: 3 })
        ]},
        mkSpacer()
      ]
    };
  }

  if (isSmall) {
    const cfg = { radius: 10, padding: [4,2,4,2], labelFz: 10, labelWeight: 'bold', valFz: 14, innerGap: 1, deltaFz: 9, deltaGap: 1 };
    const content = {
      type: 'stack', direction: 'column', children: [
        mkRow([mkIcon('fuelpump.circle.fill', C.red, 13), mkSpacer(4), mkText(`${REGION_NAME}油价`, 13, 'heavy', C.main), mkSpacer(), mkText(updateTimeStr, 9, 'bold', C.muted, { family: 'Menlo' })], 0),
        mkSpacer(8),
        { type: 'stack', direction: 'column', gap: 8, children: [
          mkRow(PRICE_ITEMS.slice(0,2).map(i => buildPriceCard(i,cfg)), 6),
          mkRow(PRICE_ITEMS.slice(2,4).map(i => buildPriceCard(i,cfg)), 6)
        ]},
        mkSpacer(8),
        mkRow([mkSpacer(), mkIcon('clock.fill', C.red, 9), mkSpacer(3), mkText(`下轮调价: ${nextAdjust.dateStr}`, 9, 'bold', C.red)], 0)
      ]
    };
    return { type: 'widget', refreshAfter, padding: [6,12,6,12], url: OFFICIAL_URL, backgroundGradient, children: [mkSpacer(), content, mkSpacer()] };
  }

  if (isLarge) {
    const cfg = { radius: 14, padding: [10,4,10,4], labelFz: 14, labelWeight: 'heavy', valFz: 24, innerGap: 4, deltaFz: 12, deltaGap: 2, showCurve: true, curveWidth: 84, curveHeight: 26, curveGap: 5 };
    const content = {
      type: 'stack', direction: 'column', children: [
        mkRow([mkIcon('fuelpump.circle.fill', C.red, 17), mkSpacer(4), mkText(`${REGION_NAME}油价`, 16, 'heavy', C.main), mkSpacer(), mkText('下轮调价: ', 12, 'medium', C.red), mkText(nextAdjust.dateStr, 12, 'bold', C.red), mkText(` ${nextAdjust.countdown}`, 12, 'bold', C.red)], 0),
        mkSpacer(14),
        { type: 'stack', direction: 'column', gap: 12, children: [
          mkRow(PRICE_ITEMS.slice(0,2).map(i => buildPriceCard(i,cfg)), 12),
          mkRow(PRICE_ITEMS.slice(2,4).map(i => buildPriceCard(i,cfg)), 12)
        ]},
        mkSpacer(12), divider(), mkSpacer(8),
        mkRow([...(hasTrendData ? [mkRow([mkText(trendLabel,11,'medium',C.muted), mkText(trendInfo,11,'bold',trendColor,{maxLines:1})],2)] : []), mkSpacer(), mkText(updateTimeStr,11,'bold',C.muted,{family:'Menlo'})], 0)
      ]
    };
    return { type: 'widget', refreshAfter, padding: [10,16,10,16], url: OFFICIAL_URL, backgroundGradient, children: [mkSpacer(), content, mkSpacer()] };
  }

  const cfg = { radius: 13, padding: [12,6,12,6], labelFz: 11, labelWeight: 'bold', valFz: 18, innerGap: 4, deltaFz: 11, deltaGap: 2 };
  const content = {
    type: 'stack', direction: 'column', children: [
      mkRow([mkIcon('fuelpump.circle.fill', C.red, 16), mkSpacer(2), mkText(`${REGION_NAME}油价`,15,'heavy',C.main), mkSpacer(), mkText('下轮调价: ',11,'medium',C.red), mkText(nextAdjust.dateStr,11,'bold',C.red), mkText(` ${nextAdjust.countdown}`,11,'bold',C.red)], 0),
      mkSpacer(14),
      mkRow(PRICE_ITEMS.map(i => buildPriceCard(i,cfg)), 6),
      mkSpacer(14), divider(), mkSpacer(8),
      mkRow([...(hasTrendData ? [mkRow([mkText(trendLabel,11,'medium',C.muted), mkText(trendInfo,11,'bold',trendColor,{maxLines:1})],2)] : []), mkSpacer(), mkText(updateTimeStr,10,'bold',C.muted,{family:'Menlo'})],0)
    ]
  };
  return { type: 'widget', refreshAfter, padding: [6,12,6,12], url: OFFICIAL_URL, backgroundGradient, children: [mkSpacer(), content, mkSpacer()] };
}
