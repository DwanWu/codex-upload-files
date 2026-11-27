/**
 * 智能热搜 · AIHOT v2.0
 * 数据源：AIHOT 官方匿名只读 REST API v1
 * 主榜：/api/v1/hot-topics
 * 补足：24小时精选、必要时24小时全部动态
 * 仅显示官方 title 字段；完整单行标题，自适应字号，不请求事件综述。
 */

const API_BASE = 'https://aihot.news';
const HOT_URL = `${API_BASE}/api/v1/hot-topics`;
const FALLBACK_URL = `${API_BASE}/api/v1/items?mode=selected&window=24h&limit=20`;
const RECENT_URL = `${API_BASE}/api/v1/items?mode=all&window=24h&limit=20`;
const HOME_URL = 'https://aihot.news/hot';


// Keep the previous storage key for seamless cache migration; only title data is retained.
const MIN=60000,MAX_CACHE=6*60*MIN,KEY="AIHotNews.v2.summary";
const STORY_ID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ELLIPSIS=/(?:…|⋯|\.{3,}|．{3,})/u;
function cleanText(v,limit=6000){return typeof v==="string"?v.replace(/[\u0000-\u001f\u007f]+/g," ").replace(/\s+/g," ").trim().slice(0,limit):""}
function safeLink(v){
 const m=cleanText(v,480).match(/^(?:https:\/\/(?:aihot\.news|aihot\.virxact\.com))?(\/(?:story|items)\/[A-Za-z0-9_-]{1,160})\/?(?:[?#][^\s]*)?$/i);
 return m?"https://aihot.news"+m[1]:HOME_URL;
}
function storyID(x,url){const id=cleanText(x?.storyPublicId||x?.storyId,160),from=url.match(/\/story\/([^/]+)$/)?.[1]||"";return STORY_ID.test(id)?id.toLowerCase():STORY_ID.test(from)?from.toLowerCase():""}
function dateText(v){return typeof v==="string"&&Number.isFinite(Date.parse(v))?v:""}
function normalizeItem(x,mode,now){
 // Reject overlong or already-ellipsized source titles rather than truncate them.
 if(typeof x?.title!=="string"||x.title.length>480)return null;
 const title=cleanText(x.title,480);if(!title||ELLIPSIS.test(title))return null;
 const url=safeLink(x?.links?.story||x?.links?.aihot||x?.url),latestAt=dateText(mode==="hot"?x.latestAt:(x.publishedAt||x.discoveredAt||x.latestAt)),ts=Date.parse(latestAt);
 if(Number.isFinite(ts)&&(ts>now+5*MIN||mode!=="hot"&&ts<now-24*60*MIN-5*MIN))return null;
 return {title,url,id:cleanText(x?.id,160),storyId:storyID(x,url),latestAt};
}
function uniqueNews(items,limit=10){
 const seen=new Set(),out=[];
 for(const i of items){if(!i?.title)continue;const keys=["t:"+i.title.toLowerCase().replace(/[\s\p{P}]/gu,""),...(i.id?["i:"+i.id]:[]),...(i.storyId?["s:"+i.storyId]:[]),...(i.url!==HOME_URL?["u:"+i.url]:[])];if(keys.some(k=>seen.has(k)))continue;keys.forEach(k=>seen.add(k));out.push({...i,rank:out.length+1});if(out.length>=limit)break}
 return out;
}
function normalizeNews(p,mode,now){
 if(!p||p.schemaVersion!==1||!Array.isArray(p.items)||p.items.length>100)return null;
 for(const n of [p.count,p.page?.count])if(n!==undefined&&(!Number.isInteger(n)||n!==p.items.length))return null;
 const rank=(x,i)=>Number.isInteger(x?.rank)&&x.rank>0?x.rank:1000+i;
 const raw=p.items.map((x,i)=>({x,i})).sort((a,b)=>mode==="hot"?rank(a.x,a.i)-rank(b.x,b.i):a.i-b.i);
 return uniqueNews(raw.map(({x})=>normalizeItem(x,mode,now)).filter(Boolean),mode==="hot"?10:20);
}
function safeETag(v){return typeof v==="string"&&v.length<=256&&!/[\r\n]/.test(v)?v:""}
function validCache(x,mode,now){
 if(!x||!Number.isFinite(x.checked)||x.checked>now||now-x.checked>MAX_CACHE||!Array.isArray(x.items)||x.items.length>20)return null;
 return {items:uniqueNews(x.items.map(i=>normalizeItem(i,mode,now)).filter(Boolean),20),checked:x.checked,etag:safeETag(x.etag)};
}
function header(r,k){try{return typeof r.headers?.get==="function"?r.headers.get(k):r.headers?.[k]??r.headers?.[k.toLowerCase()]??r.headers?.[k.split("-").map(w=>w[0].toUpperCase()+w.slice(1)).join("-")]??null}catch(_){return null}}
function retryDelay(r,now){const h=header(r,"retry-after"),d=typeof h==="string"&&/^\d+$/.test(h)?+h*1000:Date.parse(h)-now;return Math.min(24*60*MIN,Math.max(15*MIN,Number.isFinite(d)?d:0))}
async function loadNews(ctx,now,need=5,profile=null){
 need=Math.min(8,Math.max(1,Math.floor(Number(need)||5)));
 let saved={};try{saved=ctx.storage.getJSON(KEY)||{}}catch(_){}
 const state={hot:validCache(saved.hot,"hot",now),selected:validCache(saved.selected,"selected",now),recent:validCache(saved.recent,"recent",now),retryAt:Number.isFinite(saved.retryAt)&&saved.retryAt>now&&saved.retryAt<=now+24*60*MIN?saved.retryAt:0};
 const persist=()=>{try{ctx.storage.setJSON(KEY,state)}catch(_){}};
 async function request(url,old,timeout){
  const headers={"User-Agent":"Egern-AIHotNews/2.0","Accept":"application/json"};if(old?.etag)headers["If-None-Match"]=old.etag;
  try{const r=await ctx.http.get(url,{headers,timeout,credentials:"omit",insecureTls:false,redirect:"error"});
   if(r.status===429||r.status===503){state.retryAt=Math.max(state.retryAt,now+retryDelay(r,now));return {}}
   if(r.status===304&&old)return {unchanged:true,etag:old.etag};
   if(r.status!==200)return {};
   const body=await r.text();if(typeof body!=="string"||body.length>1500000)return {};
   return {payload:JSON.parse(body),etag:safeETag(header(r,"etag"))};
  }catch(_){return {}}
 }
 async function list(mode,url){
  const old=state[mode];if(state.retryAt>now)return {entry:old,ok:false};
  if(old&&now-old.checked<10*MIN)return {entry:old,ok:true};
  const r=await request(url,old,5500);
  if(r.unchanged){old.checked=now;return {entry:old,ok:true}}
  const items=normalizeNews(r.payload,mode,now);
  if(items){state[mode]={items,checked:now,etag:r.etag};return {entry:state[mode],ok:true}}
  return {entry:old,ok:false};
 }
 const grouped=[];
 const collect=(result,mode)=>{if(result?.entry)grouped.push({result,mode})};
 const combine=()=>{
  const candidates=[...grouped].sort((a,b)=>Number(b.result.ok)-Number(a.result.ok)).flatMap(g=>g.result.entry.items.map(i=>({...i,listMode:g.mode,listCached:!g.result.ok,listChecked:g.result.entry.checked})));
  // Preserve source order, skip titles that cannot fit at a readable size,
  // then fill the requested number from the next actual news items.
  return uniqueNews(profile?candidates.filter(i=>fitNews(i,profile)!==null):candidates,need);
 };
 const hot=await list("hot",HOT_URL);collect(hot,"hot");
 let selected=null,recent=null;
 if(!hot.ok||combine().length<need){selected=await list("selected",FALLBACK_URL);collect(selected,"selected")}
 if(combine().length<need){recent=await list("recent",RECENT_URL);collect(recent,"recent")}
 const items=combine();
 const modes=new Set(items.map(i=>i.listMode)),mode=modes.size>1?"mixed":modes.has("selected")?"selected":modes.has("recent")?"recent":"hot";
 const cached=items.some(i=>i.listCached),checked=items.length?Math.min(...items.map(i=>i.listChecked||now)):null;
 if(!hot.ok&&!selected?.ok&&!recent?.ok&&state.retryAt<=now)state.retryAt=now+5*MIN;
 persist();
 return {items,mode,cached,syncAt:checked===null?null:new Date(checked).toISOString(),refreshAfter:new Date(now+Math.max(MIN,state.retryAt>now?state.retryAt-now:15*MIN)).toISOString(),errorText:cached?"使用最近缓存":items.length?"":"等待下一次刷新"};
}
// Apple's 430x932pt screen reference: 170x170, 364x170, 364x382.
// Widths are conservative font-em estimates; real iOS rendering is not exposed
// to a generic script. Fit the entire title, never a shortened fragment.
const PROFILES={
 small:{count:5,budget:13,font:9,minFont:7.5,rowHeight:22,badge:15,padding:[8,9,8,9],header:12,footer:8,gap:3},
 medium:{count:5,budget:28,font:10.5,minFont:8,rowHeight:23,badge:18,padding:[8,12,8,12],header:14,footer:8,gap:3},
 large:{count:8,budget:23,font:12.5,minFont:9.5,rowHeight:36,badge:20,padding:[12,14,12,14],header:16,footer:9,gap:5},
 accessory:{count:1,budget:11,font:9,minFont:7.5,rowHeight:22,badge:14,padding:[3,4,3,4],header:10,footer:7,gap:1}
};
function layoutProfile(f){f=String(f||"systemMedium").toLowerCase();return f.startsWith("accessory")?PROFILES.accessory:f.includes("small")?PROFILES.small:f.includes("large")?PROFILES.large:PROFILES.medium}
function textWidth(s){let n=0;for(const c of String(s)){if(/[\p{Mark}\u200D\uFE0F]/u.test(c))continue;n+=/[\t ]/.test(c)?0.38:/[ilI1.,:;'!|]/.test(c)?0.42:/[MW@%#&]/.test(c)?0.95:/^[\x20-\x7e]$/.test(c)?0.70:/\p{Extended_Pictographic}/u.test(c)?1.65:1.06}return n}
function wrapText(value,budget){
 const s=cleanText(value);return s&&!ELLIPSIS.test(s)&&textWidth(s)<=budget?[s]:null;
}
function fitNews(item,profile){
 if(typeof item?.title!=="string"||item.title.length>480)return null;
 const title=cleanText(item.title,480);
 if(!title||ELLIPSIS.test(title))return null;
 const w=textWidth(title);
 if(!Number.isFinite(w)||w<=0)return null;
 // Round down to 0.1 pt so the actual chosen size cannot exceed the budget.
 const size=Math.min(profile.font,Math.floor((profile.budget*profile.font/w+1e-9)*10)/10);
 if(size<profile.minFont)return null;
 const scale=size/profile.font,lines=wrapText(title,profile.budget/scale+1e-9);
 return lines?{text:title,kind:"title",lines,scale}:null;
}

export default async function (ctx,clock=Date.now()) {
  const family = String(ctx.widgetFamily || 'systemMedium').toLowerCase();
  const profile=layoutProfile(family),isAccessory=family.startsWith('accessory');
  const {mode,items,syncAt,cached,refreshAfter}=await loadNews(ctx,clock,profile.count,profile);

  const C = {
    bg: [{ light: '#FFFDFC', dark: '#1C1C1E' }, { light: '#FFF4F0', dark: '#111113' }],
    main: { light: '#1D1D1F', dark: '#F5F5F7' },
    muted: { light: '#8E8E93', dark: '#8E8E93' },
    red: { light: '#E5484D', dark: '#FF6961' },
    orange: { light: '#F59E0B', dark: '#FFB340' },
    gold: { light: '#B7791F', dark: '#FFD60A' },
    blue: { light: '#2563EB', dark: '#64D2FF' },
    chip: { light: '#F2F2F7', dark: '#2C2C2E' }
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
  const chip = (label, color = C.blue) => ({
    type: 'stack', direction: 'row', padding: [3, 7, 3, 7], backgroundColor: C.chip,
    children: [text(label, 9, 'bold', color, { maxLines: 1 })]
  });

  const clean=cleanText;
  const formatClock=v=>v&&Number.isFinite(Date.parse(v))?new Date(Date.parse(v)+8*3600000).toISOString().slice(11,16):"--:--";

  const rankColor = rank => rank === 1 ? C.red : rank === 2 ? C.orange : rank === 3 ? C.gold : C.muted;
  // Do not put a flex frame around the text column. The previous renderer
  // centered that frame despite alignItems:'start'. A natural-width text
  // element and a trailing flexible spacer anchor content at the left.
  const rankBadge=rank=>row([
    text(String(rank),profile.font+0.5,'heavy',rankColor(rank),{textAlign:'left',maxLines:1,minScale:0.8}),
    spacer()
  ],0,{width:profile.badge,alignItems:'start'});
  const hotRow=item=>{
    const fitted=fitNews(item,profile),size=profile.font*fitted.scale;
    const line=fitted.text;
    return row([
      rankBadge(item.rank),
      text(line,size,'medium',C.main,{textAlign:'left',maxLines:1,minScale:0.85}),
      spacer()
    ],4,{height:profile.rowHeight,alignItems:'center',url:item.url||HOME_URL});
  };

  const header = size => row([
    icon('flame.fill', C.blue, size + 1),
    text('智能热搜', size, 'heavy', C.main),
    spacer(),
    chip(cached && items.length ? '缓存' : mode === 'hot' ? '热榜' : mode === 'mixed' ? '综合' : mode === 'recent' ? '动态' : '精选', cached && items.length ? C.muted : C.blue)
  ], 6);

  const footer = size => row([
    text('AIHOT', size, 'medium', C.muted, { maxLines: 1 }),
    spacer(),
    text(syncAt ? (cached ? new Date(Date.parse(syncAt)+8*3600000).toISOString().slice(5,10)+' '+formatClock(syncAt) : formatClock(syncAt)) : '--:--', size, 'medium', C.muted, { maxLines: 1 })
  ]);

  if(isAccessory){
    const item=items[0];return {type:'widget',refreshAfter,padding:profile.padding,url:item?.url||HOME_URL,children:[
      text("智能热搜",profile.header,"heavy",C.main,{maxLines:1,minScale:0.7}),
      item?hotRow(item):text("暂无资讯",profile.font,"medium",C.muted,{maxLines:1,minScale:0.7})
    ]};
  }
  if(!items.length)return {type:'widget',refreshAfter,padding:profile.padding,url:HOME_URL,backgroundGradient:bg,gap:0,children:[
    header(profile.header),spacer(),
    col([icon('wifi.exclamationmark',C.muted,20),text('暂无可完整显示的标题',11,'heavy',C.main,{maxLines:1,minScale:0.75}),text('稍后自动刷新',10,'medium',C.muted,{maxLines:1,minScale:0.75})],5,{alignItems:'center'}),
    spacer(),footer(profile.footer)
  ]};
  const shown=items.slice(0,profile.count);
  return {type:'widget',refreshAfter,padding:profile.padding,url:shown.length===1?shown[0].url:HOME_URL,backgroundGradient:bg,gap:0,children:[
    header(profile.header),spacer(profile.gap),
    col(shown.map(hotRow),0,{alignItems:'start'}),
    spacer(),footer(profile.footer)
  ]};
}
