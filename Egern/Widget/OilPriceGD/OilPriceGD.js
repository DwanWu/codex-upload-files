/**
 * 广东油价 · Egern Widget
 * 稳定修复版：保留旧版 Small / Medium / Large 布局，只重写数据层。
 * 主源：9662 广东实时油价（92/95/98/柴油、涨跌、历史、下轮调价）
 * 备源：油价网 zzcha 广东页
 */

const REGION_NAME = '广东';
const PRIMARY_URL = 'https://9662.net/guangdong/16175.html';
const FALLBACK_URL = 'https://youjia.zzcha.com/guangdong/27160.html';
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

function pickGrade(scope, label) {
  const escaped = label.replace('#', '#?');
  const patterns = [
    new RegExp(`${escaped}号(?:汽油|柴油)[^0-9]{0,30}([0-9]+(?:\\.[0-9]+)?)[^+\\-0-9]{0,30}([+\\-]\\s*[0-9]+(?:\\.[0-9]+)?)`, 'i'),
    new RegExp(`${escaped}号(?:汽油|柴油)[^0-9]{0,30}([0-9]+(?:\\.[0-9]+)?)`, 'i')
  ];
  for (const re of patterns) {
    const m = scope.match(re);
    if (!m) continue;
    const price = safeNum(m[1]);
    const delta = m[2] ? safeNum(String(m[2]).replace(/\s+/g,'')) : null;
    if (Number.isFinite(price)) return { price, delta };
  }
  return { price: null, delta: null };
}

function parseHistory(text) {
  const mark = text.indexOf('广东油价变化记录');
  const alt = text.indexOf('广东油价调整明细');
  const start = mark >= 0 ? mark : alt >= 0 ? alt : 0;
  const scope = text.slice(start);
  const rows = [];
  const re = /(20\d{2})[-/.年](\d{1,2})[-/.月](\d{1,2})(?:日)?\s+([0-9]+(?:\.[0-9]+)?)\s*([+\-]\s*[0-9]+(?:\.[0-9]+)?)?\s+([0-9]+(?:\.[0-9]+)?)\s*([+\-]\s*[0-9]+(?:\.[0-9]+)?)?\s+([0-9]+(?:\.[0-9]+)?)\s*([+\-]\s*[0-9]+(?:\.[0-9]+)?)?\s+([0-9]+(?:\.[0-9]+)?)\s*([+\-]\s*[0-9]+(?:\.[0-9]+)?)?/g;
  let m;
  while ((m = re.exec(scope)) && rows.length < 16) {
    rows.push({
      date: `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`,
      p92: safeNum(m[4]), d92: m[5] ? safeNum(m[5].replace(/\s+/g,'')) : null,
      p95: safeNum(m[6]), d95: m[7] ? safeNum(m[7].replace(/\s+/g,'')) : null,
      p98: safeNum(m[8]), d98: m[9] ? safeNum(m[9].replace(/\s+/g,'')) : null,
      diesel: safeNum(m[10]), ddiesel: m[11] ? safeNum(m[11].replace(/\s+/g,'')) : null
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

function parsePage(html) {
  const text = htmlToText(html);
  const headCut = ['广东油价变化记录','广东油价调整明细'].map(x => text.indexOf(x)).filter(x => x >= 0).sort((a,b)=>a-b)[0];
  const currentScope = headCut >= 0 ? text.slice(0, headCut) : text.slice(0, 5000);

  const p92 = pickGrade(currentScope, '92');
  const p95 = pickGrade(currentScope, '95');
  const p98 = pickGrade(currentScope, '98');
  const diesel = pickGrade(currentScope, '0');

  if (![p92.price,p95.price,p98.price,diesel.price].every(Number.isFinite)) {
    throw new Error('未解析到完整 92/95/98/柴油价格');
  }

  const history = parseHistory(text);
  if (history.length) {
    if (!Number.isFinite(p92.delta) && Number.isFinite(history[0].d92)) p92.delta = history[0].d92;
    if (!Number.isFinite(p95.delta) && Number.isFinite(history[0].d95)) p95.delta = history[0].d95;
    if (!Number.isFinite(p98.delta) && Number.isFinite(history[0].d98)) p98.delta = history[0].d98;
    if (!Number.isFinite(diesel.delta) && Number.isFinite(history[0].ddiesel)) diesel.delta = history[0].ddiesel;
  }

  return { current:{p92,p95,p98,diesel}, history, nextAdjust:parseNextAdjust(text) };
}

async function loadData(ctx) {
  const errors = [];
  for (const [name,url] of [['主源',PRIMARY_URL],['备源',FALLBACK_URL]]) {
    try {
      const parsed = parsePage(await getText(ctx,url));
      parsed.source = name;
      return parsed;
    } catch (e) {
      errors.push(`${name}:${e?.message || e}`);
    }
  }
  throw new Error(errors.join('；'));
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
  try { data=await loadData(ctx); } catch(e){ fetchError=e?.message||String(e); }

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
    {label:'98号',key:'p98',color:C.blue,hex:'#2F80ED'},
    {label:'柴油',key:'diesel',color:C.teal,hex:'#27AE60'}
  ].map(x=>({...x,price:data.current[x.key].price,delta:data.current[x.key].delta,val:data.current[x.key].price.toFixed(2),series:series(x.key)}));

  const deltaNode=(it,size)=>Number.isFinite(it.delta)&&it.delta!==0?t(`${it.delta>0?'+':''}${it.delta.toFixed(2)}`,size,'bold',it.delta>0?C.red:C.teal,{maxLines:1}):t(' ',size,'bold',C.muted);
  const card=(it,cfg)=>{
    const chart=cfg.chart&&it.series.length>1?lineChartSVG(it.series,{color:it.hex,width:cfg.cw,height:cfg.ch}):null;
    return {type:'stack',direction:'column',alignItems:'center',flex:1,backgroundColor:C.card,borderRadius:cfg.r,padding:cfg.pad,children:[sp(),t(it.label,cfg.ls,'bold',it.color,{maxLines:1}),sp(cfg.g),t(it.val,cfg.vs,'heavy',C.main,{maxLines:1,minScale:.75}),sp(2),deltaNode(it,cfg.ds),...(chart?[sp(5),{type:'image',src:chart,width:cfg.cw,height:cfg.ch,resizable:true,resizeMode:'contain'}]:[]),sp()]};
  };

  const deltas=items.map(x=>x.delta).filter(Number.isFinite).filter(x=>x!==0);
  let trend=null;
  if(deltas.length){
    const sum=deltas.reduce((a,b)=>a+b,0), vals=deltas.map(Math.abs), min=Math.min(...vals).toFixed(2), max=Math.max(...vals).toFixed(2);
    trend={text:`${sum>=0?'↑':'↓'} ${min===max?min:`${min}-${max}`}¥/L`,color:sum>=0?C.red:C.teal};
  }

  if(isSmall){
    const cfg={r:10,pad:[4,2,4,2],ls:10,vs:14,ds:9,g:1};
    const content={type:'stack',direction:'column',children:[
      row([icon('fuelpump.circle.fill',C.red,13),sp(4),t('广东油价',13,'heavy',C.main),sp(),t(updateTimeStr,9,'bold',C.muted,{family:'Menlo'})],0),sp(8),
      {type:'stack',direction:'column',gap:8,children:[row(items.slice(0,2).map(x=>card(x,cfg)),6),row(items.slice(2,4).map(x=>card(x,cfg)),6)]},sp(8),
      row([sp(),icon('clock.fill',C.red,9),sp(3),t(`下轮调价: ${next.dateStr}`,9,'bold',C.red)],0)
    ]};
    return {type:'widget',refreshAfter,padding:[6,12,6,12],url:OFFICIAL_URL,backgroundGradient:bg,children:[sp(),content,sp()]};
  }

  if(isLarge){
    const cfg={r:14,pad:[10,4,10,4],ls:14,vs:24,ds:12,g:4,chart:true,cw:84,ch:26};
    const content={type:'stack',direction:'column',children:[
      row([icon('fuelpump.circle.fill',C.red,17),sp(4),t('广东油价',16,'heavy',C.main),sp(),t('下轮调价: ',12,'medium',C.red),t(next.dateStr,12,'bold',C.red),t(` ${next.countdown}`,12,'bold',C.red)],0),sp(14),
      {type:'stack',direction:'column',gap:12,children:[row(items.slice(0,2).map(x=>card(x,cfg)),12),row(items.slice(2,4).map(x=>card(x,cfg)),12)]},sp(12),divider(),sp(8),
      row([...(trend?[row([t('较上次调整: ',11,'medium',C.muted),t(trend.text,11,'bold',trend.color)],2)]:[]),sp(),t(updateTimeStr,11,'bold',C.muted,{family:'Menlo'})],0)
    ]};
    return {type:'widget',refreshAfter,padding:[10,16,10,16],url:OFFICIAL_URL,backgroundGradient:bg,children:[sp(),content,sp()]};
  }

  const cfg={r:13,pad:[12,6,12,6],ls:11,vs:18,ds:11,g:4};
  const content={type:'stack',direction:'column',children:[
    row([icon('fuelpump.circle.fill',C.red,16),sp(2),t('广东油价',15,'heavy',C.main),sp(),t('下轮调价: ',11,'medium',C.red),t(next.dateStr,11,'bold',C.red),t(` ${next.countdown}`,11,'bold',C.red)],0),sp(14),
    row(items.map(x=>card(x,cfg)),6),sp(14),divider(),sp(8),
    row([...(trend?[row([t('较上次调整: ',11,'medium',C.muted),t(trend.text,11,'bold',trend.color)],2)]:[]),sp(),t(updateTimeStr,10,'bold',C.muted,{family:'Menlo'})],0)
  ]};
  return {type:'widget',refreshAfter,padding:[6,12,6,12],url:OFFICIAL_URL,backgroundGradient:bg,children:[sp(),content,sp()]};
}
