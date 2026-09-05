/**
 * ==========================================
 * 📌 广东油价 (Gas Price) 小组件
 *
 * 基于原版全国油价组件定制：
 * - 固定广东省（省份代码 44），不读取任何省份/城市环境变量。
 * - 标题固定显示“广东油价”。
 * - 下轮调价预测固定使用 guangdong 数据源。
 * - 保留 Small / Medium / Large 三尺寸布局、92/95/98/柴油、涨跌、调价倒计时及大号历史曲线。
 * ==========================================
 */

const BASE = 'https://cx.sinopecsales.com/yjkqiantai';
const QYJ_BASE = 'http://m.qiyoujiage.com';
const PROVINCE_CODE = '44';
const REGION_NAME = '广东';

const NAMES = [
  ['GAS_92', '92#'], ['GAS_95', '95#'], ['GAS_98', '98#'],
  ['E92', 'E92#'], ['E95', 'E95#'],
  ['AIPAO95', '爱跑95#'], ['AIPAO98', '爱跑98#'],
  ['AIPAOE92', '爱跑E92#'], ['AIPAOE95', '爱跑E95#'], ['AIPAOE98', '爱跑E98#'],
  ['CHAI_0', '0#'], ['CHAI_10', '-10#'], ['CHAI_20', '-20#'], ['CHAI_35', '-35#']
];

const KEY_MAP = {
  CHAI_0: 'CHECHAI_0', CHAI_10: 'CHECHAI_10',
  AIPAO95: 'AIPAO_GAS_95', AIPAO98: 'AIPAO_GAS_98',
  AIPAOE92: 'AIPAO_GAS_E92', AIPAOE95: 'AIPAO_GAS_E95', AIPAOE98: 'AIPAO_GAS_E98'
};

const TARGET_FUELS = ['GAS_92', 'GAS_95', 'GAS_98', 'AIPAO98', 'CHAI_0'];

const parseSetCookie = (headers) => {
  let values = [];
  if (headers?.getAll) {
    try {
      const v = headers.getAll('set-cookie');
      if (v) values = values.concat(v);
    } catch (_) {}
  }
  if (!values.length && headers?.get) {
    try {
      const v = headers.get('set-cookie');
      if (v) values = values.concat(Array.isArray(v) ? v : [v]);
    } catch (_) {}
  }
  return values
    .flatMap((v) => Array.isArray(v) ? v : String(v).split(/,\s*(?=[A-Za-z0-9_]+=)/))
    .map((v) => String(v).split(';')[0].trim())
    .filter(Boolean)
    .join(';');
};

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

const COMMON_HEADERS = {
  'Accept': 'application/json, text/plain, */*',
  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
  'Referer': `${BASE}/index.html`,
  'Origin': 'https://cx.sinopecsales.com'
};

async function readJSONResponse(resp) {
  const textBody = await resp.text();
  try {
    return JSON.parse(textBody);
  } catch (e) {
    throw new Error(`接口异常 HTTP ${resp.status || ''}`);
  }
}

async function loadData(ctx) {
  const initResp = await ctx.http.get(`${BASE}/data/initMainData`, {
    headers: COMMON_HEADERS,
    credentials: 'include',
    timeout: 15000
  });
  const initJSON = await readJSONResponse(initResp);
  const cookie = parseSetCookie(initResp.headers);

  let current = initJSON;
  const headers = { ...COMMON_HEADERS, 'Content-Type': 'application/json;charset=UTF-8' };
  if (cookie) headers.Cookie = cookie;

  const resp = await ctx.http.post(`${BASE}/data/switchProvince`, {
    headers,
    body: { provinceId: PROVINCE_CODE },
    credentials: 'include',
    timeout: 15000
  });
  const switched = await readJSONResponse(resp);
  if (switched?.data?.provinceCheck || switched?.data?.provinceData || switched?.data?.area?.length) current = switched;

  const histResp = await ctx.http.get(`${BASE}/data/initOilPrice`, {
    headers: cookie ? { ...COMMON_HEADERS, Cookie: cookie } : COMMON_HEADERS,
    credentials: 'include',
    timeout: 15000
  });
  const history = await readJSONResponse(histResp);
  return { current, history };
}

async function loadPrediction(ctx) {
  const resp = await ctx.http.get(`${QYJ_BASE}/guangdong.shtml`, {
    headers: {
      'Accept': 'text/html,application/xhtml+xml,*/*',
      'User-Agent': COMMON_HEADERS['User-Agent']
    },
    timeout: 10000
  });
  const html = await resp.text();

  let m = html.match(/预计(上调|下调)(?:油价)?[\d.]+元\/吨\((\d+(?:\.\d+)?)元\/升-(\d+(?:\.\d+)?)元\/升\)/);
  if (!m) m = html.match(/(上涨|上调|下调|下跌)(\d+(?:\.\d+)?)元\/升-(\d+(?:\.\d+)?)元\/升/);
  if (!m) return null;

  const up = m[1] === '上调' || m[1] === '上涨';
  const minV = parseFloat(m[2]);
  const maxV = parseFloat(m[3]);
  if (!Number.isFinite(minV) || !Number.isFinite(maxV)) return null;
  return { up, minV, maxV };
}

function extractProvinceItems(current, history, targetKeys) {
  const currentData = current?.data || current || {};
  let provinceCheck = currentData.provinceCheck || null;
  let provinceData = currentData.provinceData || null;

  // 某些接口响应只返回区域数组时，以广东返回的第一个有效区域作兼容兜底。
  if ((!provinceCheck || !provinceData) && Array.isArray(currentData.area) && currentData.area.length) {
    const fallbackArea = currentData.area.find(a => a?.areaCheck && a?.areaData) || currentData.area[0];
    provinceCheck = provinceCheck || fallbackArea?.areaCheck || null;
    provinceData = provinceData || fallbackArea?.areaData || null;
  }

  const historyRoot = history?.data || history || {};
  let historyData = Array.isArray(historyRoot.provinceData) ? historyRoot.provinceData : [];
  if (!historyData.length && Array.isArray(historyRoot.area) && historyRoot.area.length) {
    historyData = Array.isArray(historyRoot.area[0]?.areaData) ? historyRoot.area[0].areaData : [];
  }
  historyData = historyData.slice().reverse();

  const items = [];
  for (const [rawKey, name] of NAMES) {
    if (!targetKeys.includes(rawKey)) continue;
    const key = KEY_MAP[rawKey] || rawKey;
    const enabled = provinceCheck?.[rawKey] === 'Y' || provinceData?.[key] != null;
    if (!enabled) continue;

    const offset = Number(provinceData?.[`${key}_STATUS`] ?? 0);
    const series = historyData.map((it) => it?.[key]).map(Number).filter(Number.isFinite);
    items.push({
      rawKey,
      key,
      name,
      price: provinceData?.[key],
      offset,
      series,
      up: offset > 0
    });
  }
  return items;
}

export default async function (ctx) {
  const family  = (ctx.widgetFamily || 'systemMedium').toLowerCase();
  const isSmall = family.includes('small');
  const isLarge = family.includes('large');

  const now = new Date();
  const Y   = now.getFullYear();
  const P   = n => String(n).padStart(2, '0');
  const updateTimeStr = `${P(now.getMonth()+1)}.${P(now.getDate())} ${P(now.getHours())}:${P(now.getMinutes())}`;
  const shortTimeStr = updateTimeStr;

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

  const CALENDAR_2026 = [
    [1,12],[1,23],[2,9],[2,23],[3,9],[3,23],[4,7],[4,21],[5,8],[5,22],
    [6,5],[6,19],[7,3],[7,17],[7,31],[8,14],[8,28],[9,11],[9,25],
    [10,14],[10,28],[11,11],[11,25],[12,9],[12,23]
  ];

  const getNextAdjust = () => {
    const next = CALENDAR_2026.find(([m, d]) => new Date(Y, m - 1, d, 23, 59, 59).getTime() > now.getTime());
    if (!next) return { dateStr: '待更新', countdown: '', isUrgent: false };
    const targetDate = new Date(Y, next[0] - 1, next[1], 23, 59, 59);
    const totalMinutes = Math.max(0, Math.floor((targetDate.getTime() - now.getTime()) / 60000));
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;
    const countdownBody = days > 0 ? `${days}d${hours}h后` : `${hours}h${minutes}m后`;
    return {
      dateStr: `${P(targetDate.getMonth() + 1)}.${P(targetDate.getDate())} 24:00`,
      countdown: `(${countdownBody})`,
      isUrgent: totalMinutes < 72 * 60
    };
  };
  const nextAdjust = getNextAdjust();

  const prices = { p92: null, p95: null, p98: null, diesel: null };
  const items  = { p92: null, p95: null, p98: null, diesel: null };
  let trendLabel = nextAdjust.isUrgent ? '下轮预测: ' : '较上次调整: ';
  let trendInfo  = '';
  let trendColor = C.muted;
  let hasTrendData = false;
  let fetchError = null;

  try {
    const { current, history } = await loadData(ctx);
    const payloadItems = extractProvinceItems(current, history, TARGET_FUELS);

    const found = {};
    for (const it of payloadItems) found[it.rawKey] = it;
    items.p92    = found.GAS_92 || null;
    items.p95    = found.GAS_95 || null;
    items.p98    = found.GAS_98 || found.AIPAO98 || null;
    items.diesel = found.CHAI_0 || null;

    prices.p92    = items.p92    && items.p92.price    != null ? Number(items.p92.price) : null;
    prices.p95    = items.p95    && items.p95.price    != null ? Number(items.p95.price) : null;
    prices.p98    = items.p98    && items.p98.price    != null ? Number(items.p98.price) : null;
    prices.diesel = items.diesel && items.diesel.price != null ? Number(items.diesel.price) : null;

    const offsets = [items.p92, items.p95, items.p98, items.diesel]
      .filter(Boolean)
      .map(it => it.offset)
      .filter(v => v !== null && v !== undefined && !isNaN(v) && v !== 0);

    if (offsets.length) {
      hasTrendData = true;
      const sumSign = offsets.reduce((a, b) => a + b, 0);
      const overallUp = sumSign >= 0;
      const absVals = offsets.map(v => Math.abs(v));
      const minAbs = Math.min(...absVals).toFixed(2);
      const maxAbs = Math.max(...absVals).toFixed(2);
      const rangeStr = minAbs === maxAbs ? `${minAbs}¥/L` : `${minAbs}-${maxAbs}¥/L`;
      trendColor = overallUp ? C.red : C.teal;
      trendInfo = `${overallUp ? '↑' : '↓'} ${rangeStr}`;
    }

    if (nextAdjust.isUrgent) {
      try {
        const prediction = await loadPrediction(ctx);
        if (prediction) {
          const rangeStr = prediction.minV === prediction.maxV
            ? `${prediction.minV.toFixed(2)}¥/L`
            : `${prediction.minV.toFixed(2)}-${prediction.maxV.toFixed(2)}¥/L`;
          trendLabel = '下轮预测: ';
          trendColor = prediction.up ? C.red : C.teal;
          trendInfo = `${prediction.up ? '↑' : '↓'} ${rangeStr}`;
          hasTrendData = true;
        } else {
          trendLabel = '较上次调整: ';
        }
      } catch (_) {
        trendLabel = '较上次调整: ';
      }
    }
  } catch (e) {
    fetchError = e && e.message ? e.message : String(e);
  }

  const PRICE_ITEMS = [
    { label: '92号', key: 'p92', color: C.gold, hex: '#D4A02A', item: items.p92 },
    { label: '95号', key: 'p95', color: C.red, hex: '#FF453A', item: items.p95 },
    { label: '98号', key: 'p98', color: C.blue, hex: '#2F80ED', item: items.p98 },
    { label: '柴油', key: 'diesel', color: C.teal, hex: '#27AE60', item: items.diesel }
  ].map(i => ({ ...i, val: prices[i.key] !== null && Number.isFinite(prices[i.key]) ? prices[i.key].toFixed(2) : '--' }));

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
  const mkSpacer = (length) => length != null ? { type: 'spacer', length } : { type: 'spacer' };

  const fmtDelta = (item) => {
    if (!item.item || item.item.offset === null || item.item.offset === undefined || isNaN(item.item.offset)) return null;
    const off = item.item.offset;
    if (off === 0) return null;
    return { text: `${off > 0 ? '+' : ''}${off.toFixed(2)}`, color: off > 0 ? C.red : C.teal };
  };

  const buildPriceCard = (item, config) => {
    const delta = fmtDelta(item);
    const showCurve = config.showCurve && item.item && item.item.series && item.item.series.length > 1;
    let svgUrl = null;
    if (showCurve) {
      svgUrl = lineChartSVG(item.item.series, {
        color: item.hex,
        width: config.curveWidth,
        height: config.curveHeight,
        lineWidth: 1.8
      });
    }

    return {
      type: 'stack', direction: 'column', alignItems: 'center', flex: 1,
      backgroundColor: C.card, borderRadius: config.radius, padding: config.padding,
      children: [
        mkSpacer(),
        mkText(item.label, config.labelFz, config.labelWeight, item.color),
        mkSpacer(config.innerGap),
        mkText(item.val, config.valFz, 'heavy', C.main),
        mkSpacer(config.deltaGap ?? 2),
        delta ? mkText(delta.text, config.deltaFz, 'bold', delta.color) : mkText(' ', config.deltaFz, 'bold', C.muted),
        ...(svgUrl ? [
          mkSpacer(config.curveGap ?? 6),
          { type: 'image', src: svgUrl, width: config.curveWidth, height: config.curveHeight, resizable: true, resizeMode: 'contain' }
        ] : []),
        mkSpacer()
      ]
    };
  };

  const backgroundGradient = {
    type: 'linear', colors: C.bg,
    startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 }
  };

  if (fetchError) {
    return {
      type: 'widget', padding: 16, backgroundGradient,
      children: [
        mkRow([mkIcon('fuelpump.circle.fill', C.red, 16), mkSpacer(4), mkText('广东油价加载失败', 15, 'heavy', C.main)], 0),
        mkSpacer(8),
        mkText(fetchError, 11, 'medium', C.muted, { maxLines: 3 })
      ]
    };
  }

  if (isSmall) {
    const cardCfg = {
      radius: 10, padding: [4, 2, 4, 2], labelFz: 10, labelWeight: 'bold',
      valFz: 14, innerGap: 1, deltaFz: 9, deltaGap: 1
    };
    return {
      type: 'widget', padding: [12, 12, 8, 12], url: BASE, backgroundGradient,
      children: [
        mkRow([
          mkIcon('fuelpump.circle.fill', C.main, 13), mkSpacer(4),
          mkText(`${REGION_NAME}油价`, 13, 'heavy', C.main),
          mkSpacer(),
          mkIcon('arrow.triangle.2.circlepath', C.muted, 9), mkSpacer(2),
          mkText(shortTimeStr, 9, 'bold', C.muted, { family: 'Menlo' })
        ], 0),
        mkSpacer(7),
        { type: 'stack', direction: 'column', gap: 8, flex: 1, children: [
          mkRow(PRICE_ITEMS.slice(0, 2).map(item => buildPriceCard(item, cardCfg)), 6, { flex: 1 }),
          mkRow(PRICE_ITEMS.slice(2, 4).map(item => buildPriceCard(item, cardCfg)), 6, { flex: 1 })
        ]},
        mkSpacer(7),
        mkRow([
          mkSpacer(),
          mkIcon('clock.fill', nextAdjust.isUrgent ? C.red : C.muted, 9), mkSpacer(3),
          mkText(`下轮调价: ${nextAdjust.dateStr}`, 9, 'bold', nextAdjust.isUrgent ? C.red : C.muted)
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
    const infoColor = nextAdjust.isUrgent ? C.red : C.gold;
    return {
      type: 'widget', padding: [16, 16, 14, 16], url: BASE, backgroundGradient,
      children: [
        mkRow([
          mkIcon('fuelpump.circle.fill', C.main, 17), mkSpacer(4),
          mkText(`${REGION_NAME}油价`, 16, 'heavy', C.main), mkSpacer(),
          mkText('下轮调价: ', 12, 'medium', infoColor),
          mkText(nextAdjust.dateStr, 12, 'bold', infoColor),
          mkText(` ${nextAdjust.countdown}`, 12, 'bold', infoColor)
        ], 0),
        mkSpacer(14),
        { type: 'stack', direction: 'column', gap: 12, flex: 1, children: [
          mkRow(PRICE_ITEMS.slice(0, 2).map(item => buildPriceCard(item, cardCfg)), 12, { flex: 1 }),
          mkRow(PRICE_ITEMS.slice(2, 4).map(item => buildPriceCard(item, cardCfg)), 12, { flex: 1 })
        ]},
        mkSpacer(12),
        { type: 'stack', height: 0.5, backgroundColor: C.divider, borderRadius: 1, children: [] },
        mkSpacer(8),
        mkRow([
          ...(hasTrendData ? [
            mkRow([mkText(trendLabel, 11, 'medium', C.muted), mkText(trendInfo, 11, 'bold', trendColor, { maxLines: 1 })], 2)
          ] : []),
          mkSpacer(),
          mkRow([mkIcon('arrow.triangle.2.circlepath', C.muted, 12), mkSpacer(4), mkText(updateTimeStr, 11, 'bold', C.muted, { family: 'Menlo' })], 0)
        ], 0)
      ]
    };
  }

  const cardCfgMed = {
    radius: 13, padding: [12, 6, 12, 6], labelFz: 11, labelWeight: 'bold',
    valFz: 18, innerGap: 4, deltaFz: 11, deltaGap: 2
  };
  const infoColorMed = nextAdjust.isUrgent ? C.red : C.gold;

  return {
    type: 'widget', padding: [10, 12, 6, 12], url: BASE, backgroundGradient,
    children: [
      mkRow([
        mkIcon('fuelpump.circle.fill', C.main, 16), mkSpacer(2),
        mkText(`${REGION_NAME}油价`, 15, 'heavy', C.main), mkSpacer(),
        mkText('下轮调价: ', 11, 'medium', infoColorMed),
        mkText(nextAdjust.dateStr, 11, 'bold', infoColorMed),
        mkText(` ${nextAdjust.countdown}`, 11, 'bold', infoColorMed)
      ], 0),
      mkSpacer(24),
      mkRow(PRICE_ITEMS.map(item => buildPriceCard(item, cardCfgMed)), 6),
      mkSpacer(15),
      { type: 'stack', height: 0.5, backgroundColor: C.divider, borderRadius: 1, children: [] },
      mkSpacer(8),
      mkRow([
        ...(hasTrendData ? [
          mkRow([mkText(trendLabel, 11, 'medium', C.muted), mkText(trendInfo, 11, 'bold', trendColor, { maxLines: 1 })], 2)
        ] : []),
        mkSpacer(),
        mkRow([mkIcon('arrow.triangle.2.circlepath', C.muted, 11), mkSpacer(4), mkText(updateTimeStr, 10, 'bold', C.muted, { family: 'Menlo' })], 0)
      ], 0)
    ]
  };
}
