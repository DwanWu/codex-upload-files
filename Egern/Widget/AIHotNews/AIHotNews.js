/**
 * 智能热搜 · AIHOT v2.0
 * 数据源：AIHOT 官方匿名只读 REST API v1
 * 主榜：/api/v1/hot-topics
 * 降级：/api/v1/items?mode=selected&window=24h&limit=8
 */

const API_BASE = 'https://aihot.news';
const HOT_URL = `${API_BASE}/api/v1/hot-topics`;
const FALLBACK_URL = `${API_BASE}/api/v1/items?mode=selected&window=24h&limit=8`;
const HOME_URL = 'https://aihot.news/hot';


const KEY="AIHotNews.v2", MIN=60000, MAX_CACHE=6*60*MIN;
function cleanText(v){return typeof v==="string"?v.replace(/[\u0000-\u001f\u007f]+/g," ").replace(/\s+/g," ").trim().slice(0,240):""}
function safeLink(v){
  const m=cleanText(v).match(/^(?:https:\/\/(?:aihot\.news|aihot\.virxact\.com))?(\/(?:story|items)\/[A-Za-z0-9_-]{1,160})\/?(?:[?#][^\s]*)?$/i);
  return m?"https://aihot.news"+m[1]:HOME_URL;
}
function normalizeNews(p,mode,now){
  if(!p||p.schemaVersion!==1||!Array.isArray(p.items)||p.items.length>100||p.count!==undefined&&p.count!==p.items.length)return null;
  const ids=new Set(),titles=new Set(),out=[];
  const rank=(x,i)=>Number.isInteger(x?.rank)&&x.rank>0?x.rank:1000+i;
  const raw=p.items.map((x,i)=>({x,i})).sort((a,b)=>mode==="hot"?rank(a.x,a.i)-rank(b.x,b.i):a.i-b.i);
  for(const {x} of raw){
    const title=cleanText(x?.title);if(!title)continue;
    const url=safeLink(x?.links?.story||x?.links?.aihot),tk=title.toLowerCase().replace(/[\s\p{P}]/gu,"");
    const id=cleanText(x?.storyPublicId||x?.id)||(url!==HOME_URL?url:tk);
    if(ids.has(id)||titles.has(tk)||url!==HOME_URL&&ids.has(url))continue;
    const ts=Date.parse(mode==="hot"?x.latestAt:(x.publishedAt||x.discoveredAt));
    if(Number.isFinite(ts)&&(ts>now+5*MIN||mode==="selected"&&ts<now-24*60*MIN-5*MIN))continue;
    ids.add(id);if(url!==HOME_URL)ids.add(url);titles.add(tk);out.push({rank:out.length+1,title,url});
    if(out.length>=10)break;
  }
  return out;
}
function safeETag(v){return typeof v==="string"&&v.length<=256&&!/[\r\n]/.test(v)?v:""}
function validCache(x,now){
  if(!x||!Number.isFinite(x.checked)||x.checked>now||now-x.checked>MAX_CACHE||!Array.isArray(x.items)||x.items.length>10)return null;
  if(!x.items.every(i=>i&&cleanText(i.title)&&typeof i.url==="string"))return null;
  return {items:x.items.map((i,n)=>({rank:n+1,title:cleanText(i.title),url:safeLink(i.url)})),checked:x.checked,etag:safeETag(x.etag)};
}
function header(r,k){try{return typeof r.headers?.get==="function"?r.headers.get(k):r.headers?.[k]??r.headers?.[k.toLowerCase()]??null}catch(_){return null}}
async function loadNews(ctx,now){
  let saved={};try{saved=ctx.storage.getJSON(KEY)||{}}catch(_){}
  const state={hot:validCache(saved.hot,now),selected:validCache(saved.selected,now),retryAt:Number.isFinite(saved.retryAt)&&saved.retryAt>now?saved.retryAt:0};
  const persist=()=>{try{ctx.storage.setJSON(KEY,state)}catch(_){}};
  const output=(e,mode,cached,delay,errorText="")=>({items:e?.items||[],mode,cached,syncAt:e?new Date(e.checked).toISOString():null,refreshAfter:new Date(now+Math.max(MIN,delay)).toISOString(),errorText});
  const fallback=()=>state.hot?.items.length?["hot",state.hot]:state.selected?.items.length?["selected",state.selected]:["hot",null];
  if(state.retryAt){const [m,e]=fallback();return output(e,m,true,state.retryAt-now,"等待重试")}
  if(state.hot?.items.length&&now-state.hot.checked<10*MIN)return output(state.hot,"hot",false,15*MIN-(now-state.hot.checked));
  async function request(mode,url){
    const old=state[mode],headers={"User-Agent":"Egern-AIHotNews/2.0","Accept":"application/json"};if(old?.etag)headers["If-None-Match"]=old.etag;
    try{
      const r=await ctx.http.get(url,{headers,timeout:6500,credentials:"omit",insecureTls:false,redirect:"error"});
      if(r.status===429||r.status===503){const h=header(r,"retry-after"),d=typeof h==="string"&&/^\d+$/.test(h)?+h*1000:Date.parse(h)-now;state.retryAt=now+Math.max(15*MIN,Number.isFinite(d)?d:0);return {limited:true}}
      if(r.status===304&&old){old.checked=now;return {entry:old}}
      if(r.status!==200)return {};
      const body=await r.text();if(typeof body!=="string"||body.length>1000000)return {};
      const items=normalizeNews(JSON.parse(body),mode,now);if(!items)return {};
      state[mode]={items,checked:now,etag:safeETag(header(r,"etag"))};return {entry:state[mode]};
    }catch(_){return {}}
  }
  const hot=await request("hot",HOT_URL);
  if(hot.entry?.items.length){persist();return output(hot.entry,"hot",false,15*MIN)}
  if(!hot.limited){
    if(state.selected?.items.length&&now-state.selected.checked<10*MIN){persist();return output(state.selected,"selected",false,15*MIN)}
    const picked=await request("selected",FALLBACK_URL);
    if(picked.entry?.items.length){persist();return output(picked.entry,"selected",false,15*MIN)}
  }
  if(!state.retryAt)state.retryAt=now+5*MIN;
  persist();const [m,e]=fallback();return output(e,m,true,state.retryAt-now,e?"使用最近缓存":"等待下一次刷新");
}
export default async function (ctx,clock=Date.now()) {
  const family = String(ctx.widgetFamily || 'systemMedium').toLowerCase();
  const isSmall = family.includes('small');
  const isLarge = family.includes('large');
  const {mode,items,errorText,syncAt,cached,refreshAfter}=await loadNews(ctx,clock);

  const C = {
    bg: [{ light: '#FFFDFC', dark: '#1C1C1E' }, { light: '#FFF4F0', dark: '#111113' }],
    main: { light: '#1D1D1F', dark: '#F5F5F7' },
    muted: { light: '#8E8E93', dark: '#8E8E93' },
    red: { light: '#E5484D', dark: '#FF6961' },
    orange: { light: '#F59E0B', dark: '#FFB340' },
    gold: { light: '#B7791F', dark: '#FFD60A' },
    blue: { light: '#2563EB', dark: '#64D2FF' },
    chip: { light: '#F2F2F7', dark: '#2C2C2E' },
    divider: { light: '#E9E9ED', dark: '#38383A' }
  };

  const bg = {
    type: 'linear',
    colors: C.bg,
    startPoint: { x: 0, y: 0 },
    endPoint: { x: 1, y: 1 }
  };

  const text = (value, size, weight, color, opts = {}) => ({
    type: 'text',
    text: String(value ?? ''),
    font: { size, weight },
    textColor: color,
    ...opts
  });
  const row = (children, gap = 5, opts = {}) => ({
    type: 'stack', direction: 'row', alignItems: 'center', gap, children, ...opts
  });
  const col = (children, gap = 4, opts = {}) => ({
    type: 'stack', direction: 'column', gap, children, ...opts
  });
  const spacer = length => length == null ? { type: 'spacer' } : { type: 'spacer', length };
  const icon = (name, color, size = 13) => ({
    type: 'image', src: `sf-symbol:${name}`, color, width: size, height: size
  });
  const divider = () => ({
    type: 'stack', height: 0.5, backgroundColor: C.divider, children: []
  });
  const chip = (label, color = C.blue) => ({
    type: 'stack', direction: 'row', padding: [3, 7, 3, 7], backgroundColor: C.chip,
    children: [text(label, 9, 'bold', color, { maxLines: 1 })]
  });

  const clean=cleanText;
  const formatClock=v=>v&&Number.isFinite(Date.parse(v))?new Date(Date.parse(v)+8*3600000).toISOString().slice(11,16):"--:--";

  const rankColor = rank => rank === 1 ? C.red : rank === 2 ? C.orange : rank === 3 ? C.gold : C.muted;
  const rankBadge = (rank, compact = false) => ({
    type: 'stack', direction: 'row', alignItems: 'center',
    width: compact ? 22 : 25,
    children: [
      text(String(rank), compact ? 11 : 12, 'heavy', rankColor(rank), {
        maxLines: 1, minScale: 0.8
      })
    ]
  });

  const hotRow = (item, compact = false) => row([
    rankBadge(item.rank, compact),
    text(item.title, compact ? 10 : 11, item.rank <= 3 ? 'heavy' : 'bold', C.main, {
      maxLines: compact ? 2 : 1,
      minScale: compact ? 0.72 : 0.78
    }),
    spacer()
  ], compact ? 3 : 5, {
    url: item.url || HOME_URL,
    padding: compact ? [2, 0, 2, 0] : [3, 0, 3, 0]
  });

  const header = size => row([
    icon('flame.fill', C.blue, size + 1),
    text('智能热搜', size, 'heavy', C.main),
    spacer(),
    chip(cached && items.length ? '缓存' : mode === 'hot' ? '热榜' : '精选', cached && items.length ? C.muted : C.blue)
  ], 6);

  const footer = size => row([
    text('AIHOT', size, 'medium', C.muted, { maxLines: 1 }),
    spacer(),
    text(syncAt ? (cached ? new Date(Date.parse(syncAt)+8*3600000).toISOString().slice(5,10)+' '+formatClock(syncAt) : formatClock(syncAt)) : '--:--', size, 'medium', C.muted, { maxLines: 1 })
  ]);

  if (!items.length) {
    return {
      type: 'widget', refreshAfter, padding: 13, url: HOME_URL, backgroundGradient: bg,
      children: [
        header(15),
        spacer(),
        col([
          icon('wifi.exclamationmark', C.muted, 24),
          text('暂时无法读取 AIHOT', 13, 'heavy', C.main, { maxLines: 1 }),
          text(clean(errorText) || '等待下一次刷新', 10, 'medium', C.muted, { maxLines: 2 })
        ], 6, { alignItems: 'center' }),
        spacer(),
        footer(8)
      ]
    };
  }

  if (isSmall) {
    const shown = items.slice(0, 3);
    return {
      type: 'widget', refreshAfter, padding: 11, url: shown[0]?.url || HOME_URL, backgroundGradient: bg,
      children: [
        header(13),
        spacer(7),
        col(shown.flatMap((item, i) => [
          hotRow(item, true),
          ...(i < shown.length - 1 ? [divider()] : [])
        ]), 4),
        spacer(),
        footer(8)
      ]
    };
  }

  if (isLarge) {
    const shown = items.slice(0, 8);
    return {
      type: 'widget', refreshAfter, padding: 15, url: HOME_URL, backgroundGradient: bg,
      children: [
        header(17),
        spacer(8),
        col(shown.flatMap((item, i) => [
          hotRow(item, false),
          ...(i < shown.length - 1 ? [divider()] : [])
        ]), 2, { flex: 1 }),
        spacer(6),
        footer(9)
      ]
    };
  }

  const shown = items.slice(0, 5);
  return {
    type: 'widget', refreshAfter, padding: [10, 12, 8, 12], url: HOME_URL, backgroundGradient: bg,
    children: [
      header(15),
      spacer(6),
      col(shown.flatMap((item, i) => [
        hotRow(item, false),
        ...(i < shown.length - 1 ? [divider()] : [])
      ]), 1, { flex: 1 }),
      spacer(5),
      footer(8)
    ]
  };
}
