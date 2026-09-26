/**
 * 广东油价 · Egern Widget
 * 稳定增强版：保留 Small / Medium / Large 与三卡居中布局。
 * 显示：92/95/98 号汽油。
 * 当前价：多源并发读取并按“调价执行日期”选最新，拒绝旧调价周期数据。
 * 历史价：固定地址补充走势；任何辅助源失败都不影响当前价显示。
 */

const REGION_NAME = '广东';
const PRIMARY_URL = 'https://oil.qqday.com/province/440000.htm';
const SECONDARY_URL = 'https://oil.qqday.com/city/440100.htm';
const LEGACY_URL = 'https://9662.net/guangdong/16175.html';
const HISTORY_URL = 'https://www.icauto.com.cn/oil/price_440000_0.html';
const OFFICIAL_URL = 'https://cx.sinopecsales.com/yjkqiantai/core/initCpb';

const CALENDAR_2026 = [
  [1,6],[1,20],[2,3],[2,24],[3,9],[3,23],[4,7],[4,21],[5,8],[5,21],
  [6,4],[6,18],[7,3],[7,17],[7,31],[8,14],[8,28],[9,11],[9,24],
  [10,15],[10,29],[11,12],[11,26],[12,10],[12,24]
];

const safeNum = v => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const stringToBase64 = str => {
  if (typeof Buffer !== 'undefined') return Buffer.from(str, 'utf8').toString('base64');
  const encoded = encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  return btoa(encoded);
};

const lineChartSVG = (arr, { color = '#34C759', width = 84, height = 26, lineWidth = 1.8 } = {}) => {
  const nums = (arr || []).map(Number).filter(Number.isFinite).slice(-12);
  if (nums.length < 2) return null;
  const pad = 3;
  const min = Math.min(...nums), max = Math.max(...nums), range = max - min || 1;
  const pts = nums.map((n,i) => {
    const x = pad + (width - pad * 2) * (i / (nums.length - 1));
    const y = pad + (height - pad * 2) * (1 - (n - min) / range);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const bottom = height - pad;
  const area = `${pts.join(' ')} ${width-pad},${bottom} ${pad},${bottom}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".28"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs><polygon points="${area}" fill="url(#f)"/><polyline points="${pts.join(' ')}" fill="none" stroke="${color}" stroke-width="${lineWidth}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  return `data:image/svg+xml;base64,${stringToBase64(svg)}`;
};

const htmlToText = html => String(html || '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<\/tr>|<\/p>|<\/div>|<\/li>/gi, '\n')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#43;|&plus;/gi, '+')
  .replace(/&minus;/gi, '-')
  .replace(/&uarr;/gi, '↑')
  .replace(/&darr;/gi, '↓')
  .replace(/\r/g, '')
  .replace(/[ \t]+/g, ' ')
  .replace(/ *\n */g, '\n')
  .trim();

async function getText(ctx, url, timeout = 12000) {
  const sep = url.includes('?') ? '&' : '?';
  const resp = await ctx.http.get(`${url}${sep}_=${Date.now()}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
      'Accept': 'text/html,application/xhtml+xml,*/*',
      'Cache-Control': 'no-cache, no-store, max-age=0',
      'Pragma': 'no-cache'
    },
    timeout
  });
  const body = await resp.text();
  const status = Number(resp?.status || 200);
  if (status >= 400) throw new Error(`HTTP ${status}`);
  if (!body || body.length < 200) throw new Error('返回内容为空');
  return body;
}

function normalizeDate(y, m, d) {
  if (![y,m,d].every(Number.isFinite)) return null;
  return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}

function dateValue(value) {
  if (!value) return 0;
  const n = new Date(`${value}T00:00:00+08:00`).getTime();
  return Number.isFinite(n) ? n : 0;
}

function expectedLatestAdjustment(now) {
  if (now.getFullYear() !== 2026) return null;
  let last = null;
  for (const [m,d] of CALENDAR_2026) {
    const at = new Date(2026, m - 1, d + 1, 0, 0, 0);
    if (at.getTime() <= now.getTime()) last = normalizeDate(2026, m, d);
  }
  return last;
}

function findPrice(text, grade) {
  const patterns = [
    new RegExp(`${grade}号汽油为\\s*([0-9]+(?:\\.[0-9]+)?)\\s*元`, 'i'),
    new RegExp(`${grade}号汽油[^0-9]{0,24}([0-9]+(?:\\.[0-9]+)?)\\s*元(?:\\/升)?`, 'i'),
    new RegExp(`广东\\s*${grade}\\s*#?[^0-9]{0,16}([0-9]+(?:\\.[0-9]+)?)`, 'i')
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const n = safeNum(m[1]);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

function findDelta(text, grade) {
  const patterns = [
    new RegExp(`广东\\s*${grade}\\s*#?[\\s\\S]{0,40}?([↑↓▲▼])\\s*([0-9]+(?:\\.[0-9]+)?)`, 'i'),
    new RegExp(`${grade}号汽油[\\s\\S]{0,60}?([↑↓▲▼])\\s*([0-9]+(?:\\.[0-9]+)?)`, 'i')
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (!m) continue;
    const n = safeNum(m[2]);
    if (!Number.isFinite(n)) continue;
    return (m[1] === '↓' || m[1] === '▼') ? -n : n;
  }
  return null;
}

function findEffectiveDate(text) {
  const patterns = [
    /(20\d{2})年(\d{1,2})月(\d{1,2})日起执行/,
    /以上(?:油价|汽油柴油价格)[^0-9]{0,16}(20\d{2})年(\d{1,2})月(\d{1,2})日/,
    /更新(?:日期|时间)?[:：]?\s*(20\d{2})[-/.年](\d{1,2})[-/.月](\d{1,2})日?/
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) return normalizeDate(Number(m[1]), Number(m[2]), Number(m[3]));
  }
  return null;
}

function parseCurrentPage(html, source) {
  const text = htmlToText(html);
  const p92 = { price: findPrice(text, '92'), delta: findDelta(text, '92') };
  const p95 = { price: findPrice(text, '95'), delta: findDelta(text, '95') };
  const p98 = { price: findPrice(text, '98'), delta: findDelta(text, '98') };

  if (![p92.price,p95.price,p98.price].every(Number.isFinite)) {
    throw new Error('未解析到完整 92/95/98 号汽油价格');
  }

  return {
    source,
    dataDate: findEffectiveDate(text),
    current: { p92, p95, p98 },
    nextAdjust: parseNextAdjust(text)
  };
}

function parseHistoryPage(html) {
  const text = htmlToText(html);
  const mark = text.indexOf('广东汽油柴油历史油价表');
  const scope = mark >= 0 ? text.slice(mark) : text;
  const rows = [];
  const re = /(20\d{2})[-/.年](\d{1,2})[-/.月](\d{1,2})(?:日)?\s+([0-9]+(?:\.[0-9]+)?)\s+([0-9]+(?:\.[0-9]+)?)\s+([0-9]+(?:\.[0-9]+)?)\s+([0-9]+(?:\.[0-9]+)?)\s+([0-9]+(?:\.[0-9]+)?)\s+([0-9]+(?:\.[0-9]+)?)/g;
  let m;
  while ((m = re.exec(scope)) && rows.length < 16) {
    rows.push({
      date: normalizeDate(Number(m[1]), Number(m[2]), Number(m[3])),
      p92: safeNum(m[5]),
      p95: safeNum(m[7]),
      p98: null
    });
  }
  return rows;
}

function parseNextAdjust(text) {
  const patterns = [
    /下一次油价调整窗口时间(?:是|为)?\s*(20\d{2})[-年](\d{1,2})[-月](\d{1,2})日?\s*24(?:点|时)/,
    /下一(?:次|轮)[^0-9]{0,20}(20\d{2})[-/.年](\d{1,2})[-/.月](\d{1,2})日?/
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) return { y:Number(m[1]), m:Number(m[2]), d:Number(m[3]) };
  }
  return null;
}

async function loadData(ctx, now) {
  const sources = [
    ['QQDay广东', PRIMARY_URL],
    ['QQDay广州', SECONDARY_URL],
    ['9662备用', LEGACY_URL]
  ];

  const settled = await Promise.allSettled(
    sources.map(async ([name,url]) => parseCurrentPage(await getText(ctx,url), name))
  );

  const candidates = [];
  const errors = [];
  settled.forEach((r, i) => {
    if (r.status === 'fulfilled') candidates.push(r.value);
    else errors.push(`${sources[i][0]}:${r.reason?.message || r.reason || ''}`);
  });

  if (!candidates.length) throw new Error(errors.join('；') || '所有油价源均不可用');

  candidates.sort((a,b) => dateValue(b.dataDate) - dateValue(a.dataDate));
  const expected = expectedLatestAdjustment(now);
  let chosen = candidates[0];

  if (expected) {
    const fresh = candidates.find(x => x.dataDate && dateValue(x.dataDate) >= dateValue(expected));
    if (fresh) chosen = fresh;
    else if (chosen.dataDate && dateValue(chosen.dataDate) < dateValue(expected)) {
      throw new Error(`数据源仍停留在 ${chosen.dataDate}，应至少更新到 ${expected} 调价周期`);
    }
  }

  // 历史走势属于增强信息：失败时不影响当前油价。
  let history = [];
  try {
    history = parseHistoryPage(await getText(ctx, HISTORY_URL, 9000));
  } catch (_) {}

  // 用历史表补齐 92/95 的涨跌；98 涨跌以当前主源为准。
  if (history.length >= 2) {
    const diff = key => {
      const a = history[0]?.[key], b = history[1]?.[key];
      return Number.isFinite(a) && Number.isFinite(b) ? Number((a-b).toFixed(2)) : null;
    };
    if (!Number.isFinite(chosen.current.p92.delta)) chosen.current.p92.delta = diff('p92');
    if (!Number.isFinite(chosen.current.p95.delta)) chosen.current.p95.delta = diff('p95');
  }

  return { ...chosen, history };
}

export default async function(ctx) {
  const family = String(ctx.widgetFamily || 'systemMedium').toLowerCase();
  const isSmall = family.includes('small');
  const isLarge = family.includes('large');
  const now = new Date();
  const P = n => String(n).padStart(2,'0');
  const updateTimeStr = `${P(now.getHours())}:${P(now.getMinutes())}`;
  const refreshAfter = new Date(Date.now() + 30*60*1000).toISOString();

  const C = {
    bg:[{light:'#FAFAFA',dark:'#1C1C1E'},{light:'#EFEFF4',dark:'#111113'}],
    card:{light:'#FFFFFF',dark:'#2C2C2E'}, main:{light:'#1C1C1E',dark:'#F2F2F7'},
    muted:{light:'#8E8E93',dark:'#636366'}, gold:{light:'#B07C1A',dark:'#D4A02A'},
    red:{light:'#C0392B',dark:'#FF453A'}, teal:{light:'#1E7E44',dark:'#30D158'},
    blue:{light:'#2C5F8A',dark:'#5E9ED6'}, divider:{light:'#E5E5EA',dark:'#38383A'}
  };
  const t=(v,s,w,c,o={})=>({type:'text',text:String(v??''),font:{size:s,weight:w,...(o.family?{family:o.family}:{})},textColor:c,...o});
  const row=(children,gap=4,o={})=>({type:'stack',direction:'row',alignItems:'center',gap,children,...o});
  const sp=l=>l==null?{type:'spacer'}:{type:'spacer',length:l};
  const icon=(n,c,s=13)=>({type:'image',src:`sf-symbol:${n}`,color:c,width:s,height:s});
  const divider=()=>({type:'stack',height:.5,backgroundColor:C.divider,children:[]});
  const bg={type:'linear',colors:C.bg,startPoint:{x:0,y:0},endPoint:{x:1,y:1}};

  let data=null, fetchError='';
  try { data=await loadData(ctx, now); } catch(e){ fetchError=e?.message||String(e); }

  if (!data) {
    return {type:'widget',refreshAfter,padding:14,url:OFFICIAL_URL,backgroundGradient:bg,children:[
      row([icon('fuelpump.circle.fill',C.red,16),t('广东油价',15,'heavy',C.main),sp(),t(updateTimeStr,10,'bold',C.muted,{family:'Menlo'})],6),
      sp(),{type:'stack',direction:'column',alignItems:'center',gap:7,children:[icon('exclamationmark.triangle.fill',C.red,24),t('油价数据加载失败',13,'heavy',C.main),t(fetchError||'等待下一次刷新',9,'medium',C.muted,{maxLines:3})]},sp()
    ]};
  }

  const nextRaw = data.nextAdjust || (()=>{
    const y=now.getFullYear();
    const n=CALENDAR_2026.find(([m,d])=>new Date(y,m-1,d+1).getTime()>now.getTime());
    return n?{y,m:n[0],d:n[1]}:null;
  })();
  const next = (()=>{
    if(!nextRaw) return {dateStr:'待更新',countdown:''};
    const target=new Date(nextRaw.y,nextRaw.m-1,nextRaw.d+1,0,0,0);
    const mins=Math.max(0,Math.floor((target-now)/60000));
    const d=Math.floor(mins/1440), h=Math.floor((mins%1440)/60), m=mins%60;
    return {dateStr:`${P(nextRaw.m)}.${P(nextRaw.d)} 24:00`,countdown:`(${d>0?`${d}d${h}h后`:`${h}h${m}m后`})`};
  })();

  const h = Array.isArray(data.history)?data.history:[];
  const series = key => h.slice().reverse().map(x=>x[key]).filter(Number.isFinite);
  const items=[
    {label:'92号',key:'p92',color:C.gold,hex:'#D4A02A'},
    {label:'95号',key:'p95',color:C.red,hex:'#FF453A'},
    {label:'98号',key:'p98',color:C.blue,hex:'#2F80ED'}
  ].map(x=>({...x,price:data.current[x.key].price,delta:data.current[x.key].delta,val:data.current[x.key].price.toFixed(2),series:series(x.key)}));

  const deltaNode=(it,size)=>Number.isFinite(it.delta)&&it.delta!==0?t(`${it.delta>0?'+':''}${it.delta.toFixed(2)}`,size,'bold',it.delta>0?C.red:C.teal,{maxLines:1}):t(' ',size,'bold',C.muted);
  const card=(it,cfg)=>{
    const chart=cfg.chart&&it.series.length>1?lineChartSVG(it.series,{color:it.hex,width:cfg.cw,height:cfg.ch}):null;
    return {type:'stack',direction:'column',alignItems:'center',flex:1,backgroundColor:C.card,borderRadius:cfg.r,padding:cfg.pad,children:[sp(),t(it.label,cfg.ls,'bold',it.color,{maxLines:1}),sp(cfg.g),t(it.val,cfg.vs,'heavy',C.main,{maxLines:1,minScale:.75}),sp(2),deltaNode(it,cfg.ds),...(chart?[sp(5),{type:'image',src:chart,width:cfg.cw,height:cfg.ch,resizable:true,resizeMode:'contain'}]:[]),sp()]};
  };

  const centeredBody=(cfg,gap,height)=>({
    type:'stack',direction:'column',flex:1,children:[
      sp(),
      row(items.map(x=>card(x,cfg)),gap,{height}),
      sp()
    ]
  });

  const deltas=items.map(x=>x.delta).filter(Number.isFinite).filter(x=>x!==0);
  let trend=null;
  if(deltas.length){
    const sum=deltas.reduce((a,b)=>a+b,0), vals=deltas.map(Math.abs), min=Math.min(...vals).toFixed(2), max=Math.max(...vals).toFixed(2);
    trend={text:`${sum>=0?'↑':'↓'} ${min===max?min:`${min}-${max}`}¥/L`,color:sum>=0?C.red:C.teal};
  }

  if(isSmall){
    const cfg={r:10,pad:[6,2,6,2],ls:9,vs:13,ds:8,g:2};
    return {type:'widget',refreshAfter,padding:12,url:OFFICIAL_URL,backgroundGradient:bg,children:[
      row([icon('fuelpump.circle.fill',C.red,13),sp(4),t('广东油价',13,'heavy',C.main),sp(),t(updateTimeStr,9,'bold',C.muted,{family:'Menlo'})],0),
      centeredBody(cfg,6,62),
      row([sp(),icon('clock.fill',C.red,9),sp(3),t(`下轮调价: ${next.dateStr}`,9,'bold',C.red)],0)
    ]};
  }

  if(isLarge){
    const cfg={r:14,pad:[14,6,14,6],ls:14,vs:26,ds:12,g:6,chart:true,cw:94,ch:30};
    return {type:'widget',refreshAfter,padding:16,url:OFFICIAL_URL,backgroundGradient:bg,children:[
      row([icon('fuelpump.circle.fill',C.red,17),sp(4),t('广东油价',16,'heavy',C.main),sp(),t('下轮调价: ',12,'medium',C.red),t(next.dateStr,12,'bold',C.red),t(` ${next.countdown}`,12,'bold',C.red)],0),
      centeredBody(cfg,12,140),
      divider(),sp(8),
      row([...(trend?[row([t('较上次调整: ',11,'medium',C.muted),t(trend.text,11,'bold',trend.color)],2)]:[]),sp(),t(updateTimeStr,11,'bold',C.muted,{family:'Menlo'})],0)
    ]};
  }

  const cfg={r:12,pad:[11,5,11,5],ls:11,vs:21,ds:10,g:4};
  return {type:'widget',refreshAfter,padding:13,url:OFFICIAL_URL,backgroundGradient:bg,children:[
    row([icon('fuelpump.circle.fill',C.red,16),sp(2),t('广东油价',15,'heavy',C.main),sp(),t('下轮调价: ',11,'medium',C.red),t(next.dateStr,11,'bold',C.red),t(` ${next.countdown}`,11,'bold',C.red)],0),
    centeredBody(cfg,8,78),
    divider(),sp(8),
    row([...(trend?[row([t('较上次调整: ',11,'medium',C.muted),t(trend.text,11,'bold',trend.color)],2)]:[]),sp(),t(updateTimeStr,10,'bold',C.muted,{family:'Menlo'})],0)
  ]};
}
