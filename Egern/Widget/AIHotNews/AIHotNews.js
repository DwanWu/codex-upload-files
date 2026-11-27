/**
 * 智能热搜 · AIHOT v2.0
 * 数据源：AIHOT 官方匿名只读 REST API v1
 * 主榜：/api/v1/hot-topics
 * 补足：24小时精选、必要时24小时全部动态
 * 综述：/api/v1/stories/{publicId}；按手机尺寸选择原始短句。
 */

const API_BASE = 'https://aihot.news';
const HOT_URL = `${API_BASE}/api/v1/hot-topics`;
const FALLBACK_URL = `${API_BASE}/api/v1/items?mode=selected&window=24h&limit=20`;
const RECENT_URL = `${API_BASE}/api/v1/items?mode=all&window=24h&limit=20`;
const STORY_URL = `${API_BASE}/api/v1/stories/`;
const HOME_URL = 'https://aihot.news/hot';


const MIN=60000,MAX_CACHE=6*60*MIN,KEY="AIHotNews.v2.summary",STORY_TTL=60*MIN;
const STORY_ID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ELLIPSIS=/(?:…|⋯|\.{3,}|．{3,})/u;
function cleanText(v,limit=6000){return typeof v==="string"?v.replace(/[\u0000-\u001f\u007f]+/g," ").replace(/\s+/g," ").trim().slice(0,limit):""}
function cleanSummary(v){
 if(typeof v!=="string")return "";
 return cleanText(v.replace(/\[([^\]\n]+)\]\(https?:\/\/[^)\s]+\)/g,"$1").replace(/(?:^|\n)\s*(?:#{1,6}\s+|[-*]\s+|\d+\.\s+)/g," ").replace(/\*\*|__|<[^>]{1,120}>/g,"").replace(/https?:\/\/[^\s。；，、]+/g," "));
}
function safeLink(v){
 const m=cleanText(v,480).match(/^(?:https:\/\/(?:aihot\.news|aihot\.virxact\.com))?(\/(?:story|items)\/[A-Za-z0-9_-]{1,160})\/?(?:[?#][^\s]*)?$/i);
 return m?"https://aihot.news"+m[1]:HOME_URL;
}
function storyID(x,url){const id=cleanText(x?.storyPublicId||x?.storyId,160),from=url.match(/\/story\/([^/]+)$/)?.[1]||"";return STORY_ID.test(id)?id.toLowerCase():STORY_ID.test(from)?from.toLowerCase():""}
function dateText(v){return typeof v==="string"&&Number.isFinite(Date.parse(v))?v:""}
function normalizeItem(x,mode,now){
 const title=cleanText(x?.title||x?.name||x?.topic,480);if(!title)return null;
 const url=safeLink(x?.links?.story||x?.links?.aihot||x?.url),latestAt=dateText(mode==="hot"?x.latestAt:(x.publishedAt||x.discoveredAt||x.latestAt)),ts=Date.parse(latestAt);
 if(Number.isFinite(ts)&&(ts>now+5*MIN||mode!=="hot"&&ts<now-24*60*MIN-5*MIN))return null;
 return {title,url,id:cleanText(x?.id,160),storyId:storyID(x,url),latestAt,summary:cleanSummary(x?.summary),reportSummary:cleanSummary(x?.reportSummary)};
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
function validStory(x,now){if(!x||!Number.isFinite(x.checked)||x.checked>now||now-x.checked>MAX_CACHE)return null;const summary=cleanSummary(x.summary),reportSummary=cleanSummary(x.reportSummary);return summary||reportSummary?{summary,reportSummary,version:dateText(x.version),checked:x.checked,etag:safeETag(x.etag)}:null}
function normalizeStory(p,id){
 if(p?.schemaVersion!==1||String(p.story?.publicId||"").toLowerCase()!==id)return null;
 const s=p.story,summary=cleanSummary(s.digest),reportSummary=cleanSummary(s.latest?.summary)||(Array.isArray(s.reports)?s.reports.slice(0,5).map(r=>cleanSummary(r?.summary)).find(Boolean)||"":"");
 return summary||reportSummary?{summary,reportSummary}:null;
}
function header(r,k){try{return typeof r.headers?.get==="function"?r.headers.get(k):r.headers?.[k]??r.headers?.[k.toLowerCase()]??r.headers?.[k.split("-").map(w=>w[0].toUpperCase()+w.slice(1)).join("-")]??null}catch(_){return null}}
function retryDelay(r,now){const h=header(r,"retry-after"),d=typeof h==="string"&&/^\d+$/.test(h)?+h*1000:Date.parse(h)-now;return Math.min(24*60*MIN,Math.max(15*MIN,Number.isFinite(d)?d:0))}
async function loadNews(ctx,now,need=5){
 need=Math.min(8,Math.max(1,Math.floor(Number(need)||5)));
 let saved={};try{saved=ctx.storage.getJSON(KEY)||{}}catch(_){}
 const stories={};for(const [id,v] of Object.entries(saved.stories||{}).slice(0,40))if(STORY_ID.test(id)){const x=validStory(v,now);if(x)stories[id]=x}
 const state={hot:validCache(saved.hot,"hot",now),selected:validCache(saved.selected,"selected",now),recent:validCache(saved.recent,"recent",now),stories,retryAt:Number.isFinite(saved.retryAt)&&saved.retryAt>now&&saved.retryAt<=now+24*60*MIN?saved.retryAt:0};
 const persist=()=>{try{state.stories=Object.fromEntries(Object.entries(state.stories).sort((a,b)=>b[1].checked-a[1].checked).slice(0,24));ctx.storage.setJSON(KEY,state)}catch(_){}};
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
 const combine=()=>uniqueNews([...grouped].sort((a,b)=>Number(b.result.ok)-Number(a.result.ok)).flatMap(g=>g.result.entry.items.map(i=>({...i,listMode:g.mode,listCached:!g.result.ok,listChecked:g.result.entry.checked}))),need);
 const hot=await list("hot",HOT_URL);collect(hot,"hot");
 let selected=null,recent=null;
 if(!hot.ok||combine().length<need){selected=await list("selected",FALLBACK_URL);collect(selected,"selected")}
 if(combine().length<need){recent=await list("recent",RECENT_URL);collect(recent,"recent")}
 let items=combine();
 const modes=new Set(items.map(i=>i.listMode)),mode=modes.size>1?"mixed":modes.has("selected")?"selected":modes.has("recent")?"recent":"hot";
 const cached=items.some(i=>i.listCached),checked=items.length?Math.min(...items.map(i=>i.listChecked||now)):null;
 async function hydrate(item){
  if(!item.storyId)return item;
  const id=item.storyId,old=state.stories[id],matches=old&&old.version===item.latestAt;
  const use=v=>v?{...item,summary:v.summary||item.summary,reportSummary:v.reportSummary||item.reportSummary}:item;
  if(matches&&now-old.checked<STORY_TTL)return use(old);
  if(state.retryAt>now||item.listCached)return use(matches?old:null);
  const r=await request(STORY_URL+id,old,5000);
  if(r.unchanged){state.stories[id]={...old,version:item.latestAt,checked:now};return use(state.stories[id])}
  const v=normalizeStory(r.payload,id);
  if(v){state.stories[id]={...v,version:item.latestAt,checked:now,etag:r.etag};return use(state.stories[id])}
  return use(matches?old:null);
 }
 for(let i=0;i<items.length;i+=4){const batch=await Promise.all(items.slice(i,i+4).map(hydrate));items.splice(i,batch.length,...batch)}
 if(!hot.ok&&!selected?.ok&&!recent?.ok&&state.retryAt<=now)state.retryAt=now+5*MIN;
 persist();
 return {items,mode,cached,syncAt:checked===null?null:new Date(checked).toISOString(),refreshAfter:new Date(now+Math.max(MIN,state.retryAt>now?state.retryAt-now:15*MIN)).toISOString(),errorText:cached?"使用最近缓存":items.length?"":"等待下一次刷新"};
}
// Apple's 430x932pt screen reference: 170x170, 364x170, 364x382.
// Widths are conservative font-em estimates; real iOS rendering is not exposed
// to a generic script, so explicit short lines and minScale provide headroom.
const PROFILES={
 small:{count:5,budget:14.5,font:8.5,rowHeight:22,badge:15,padding:[8,9,8,9],header:12,footer:8,gap:3},
 medium:{count:5,budget:29,font:9.2,rowHeight:23,badge:18,padding:[8,12,8,12],header:14,footer:8,gap:3},
 large:{count:8,budget:24,font:12,rowHeight:36,badge:20,padding:[12,14,12,14],header:16,footer:9,gap:5},
 accessory:{count:1,budget:11,font:9,rowHeight:22,badge:14,padding:[3,4,3,4],header:10,footer:7,gap:1}
};
function layoutProfile(f){f=String(f||"systemMedium").toLowerCase();return f.startsWith("accessory")?PROFILES.accessory:f.includes("small")?PROFILES.small:f.includes("large")?PROFILES.large:PROFILES.medium}
function textWidth(s){let n=0;for(const c of String(s)){if(/[\p{Mark}\u200D\uFE0F]/u.test(c))continue;n+=/[\t ]/.test(c)?0.38:/[ilI1.,:;'!|]/.test(c)?0.42:/[MW@%#&]/.test(c)?0.95:/^[\x20-\x7e]$/.test(c)?0.70:/\p{Extended_Pictographic}/u.test(c)?1.65:1.06}return n}
function wrapText(value,budget){
 const s=cleanText(value);if(!s||ELLIPSIS.test(s))return null;
 if(textWidth(s)<=budget)return [s];
 if(textWidth(s)>2*budget+1)return null;
 function split(tokens){
  if(tokens.length>240)return null;
  let best=null,bestWidth=-1;
  for(let i=1;i<tokens.length;i++){
   const a=tokens.slice(0,i).join("").trimEnd(),b=tokens.slice(i).join("").trimStart();
   if(!a||!b||/[（(【「『《〈“‘\u200d]$/u.test(a)||/^[，。！？、；：,.!?:;）)】」』》〉”’\u200d\uFE0F\p{Mark}]/u.test(b))continue;
   const wa=textWidth(a),wb=textWidth(b);
   if(wa<=budget&&wb<=budget&&wa>bestWidth){best=[a,b];bestWidth=wa}
  }return best;
 }
 // Preserve Latin product/model names, including versions, and prefer CJK
 // word boundaries when Intl.Segmenter is available.
 const tokens=s.match(/[A-Za-z0-9]+(?:[._+/#:-][A-Za-z0-9]+)*|\s+|[^\s]/gu)||[];
 let merged=[];try{
  const seg=new Intl.Segmenter("zh-CN",{granularity:"word"});
  for(const t of tokens){const prev=merged[merged.length-1];if(prev&&/^\p{Script=Han}+$/u.test(prev)&&/^\p{Script=Han}$/u.test(t))merged[merged.length-1]+=t;else merged.push(t)}
  merged=merged.flatMap(t=>/^\p{Script=Han}+$/u.test(t)?[...seg.segment(t)].map(x=>x.segment):[t]);
 }catch(_){merged=tokens}
 return split(merged)||split(tokens);
}
function balanced(s){const stack=[],pairs={"）":"（",")":"(","】":"【","」":"「","』":"『","》":"《","〉":"〈","”":"“","’":"‘"};for(const c of s){if(Object.values(pairs).includes(c))stack.push(c);else if(pairs[c]&&stack.pop()!==pairs[c])return false}return !stack.length}
function fitNews(item,profile){
 const title=cleanText(item.title),titleLines=wrapText(title,profile.budget),candidates=[];
 const add=(text,kind)=>{text=String(text||"").trim();if(text&&balanced(text)&&!ELLIPSIS.test(text))candidates.push({text,kind})};
 const dangling=/(?:表示|指出|宣布|认为|介绍|显示|通知|包括|涉及|以及|称|据|与|及|的|将|为|在|向)$/u;
 for(const field of [item.summary,item.reportSummary]){
  const s=cleanSummary(field);if(!s)continue;add(s,"summary");
  const first=s.match(/^[^。！？!?；;]+[。！？!?；;]?/u)?.[0]||"";if(first!==s)add(first,"summary");
  // Natural clause boundary, not a fixed character cut. When the whole title
  // already fits, only choose a leading digest clause that adds information.
  const cuts=[];for(const m of first.matchAll(/[，,；;]/gu)){const t=first.slice(0,m.index).trim();if(textWidth(t)>=Math.max(8,titleLines?textWidth(title)+1:profile.budget)&&!dangling.test(t))cuts.push(t)}
  for(const t of cuts.reverse())add(t,"summary");
 }
 add(title,"title");
 for(const m of title.matchAll(/[，,；;：:。！？!?]/gu)){const t=title.slice(0,m.index).trim();if(textWidth(t)>=8&&!dangling.test(t))add(t,"title")}
 for(const c of candidates){const lines=wrapText(c.text,profile.budget);if(lines)return {...c,lines}}
 // Last-resort, keep the genuine whole title at a smaller scale if it can
 // still fit the two explicit lines. No misleading mid-word truncation.
 const lines=wrapText(title,profile.budget*1.16);
 if(lines&&balanced(title))return {text:title,kind:"title",lines,scale:1/1.16};
 return {text:"查看完整新闻",kind:"link",lines:["查看完整新闻"]};
}

export default async function (ctx,clock=Date.now()) {
  const family = String(ctx.widgetFamily || 'systemMedium').toLowerCase();
  const profile=layoutProfile(family),isAccessory=family.startsWith('accessory');
  const {mode,items,syncAt,cached,refreshAfter}=await loadNews(ctx,clock,profile.count);

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
  // Use an actual flexible horizontal rule; empty unbounded stacks can
  // collapse to zero width in the widget renderer.
  const divider=()=>row([
    spacer(profile.badge+4),
    {type:'stack',direction:'row',height:0.5,flex:1,backgroundColor:C.divider,children:[spacer()]}
  ],0,{height:0.5});
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
    const fitted=fitNews(item,profile),size=profile.font*(fitted.scale||1);
    const lines=fitted.lines.join('\n');
    return row([
      rankBadge(item.rank),
      text(lines,size,'medium',C.main,{textAlign:'left',maxLines:2,minScale:0.72}),
      spacer()
    ],4,{height:profile.rowHeight,alignItems:'start',url:item.url||HOME_URL});
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
    col([icon('wifi.exclamationmark',C.muted,20),text('暂无可用资讯',12,'heavy',C.main,{maxLines:1,minScale:0.75}),text('稍后自动刷新',10,'medium',C.muted,{maxLines:1,minScale:0.75})],5,{alignItems:'center'}),
    spacer(),footer(profile.footer)
  ]};
  const shown=items.slice(0,profile.count);
  return {type:'widget',refreshAfter,padding:profile.padding,url:shown.length===1?shown[0].url:HOME_URL,backgroundGradient:bg,gap:0,children:[
    header(profile.header),spacer(profile.gap),
    col(shown.flatMap((item,i)=>[hotRow(item),...(i<shown.length-1?[divider()]:[])]),0,{alignItems:'start'}),
    spacer(),footer(profile.footer)
  ]};
}
