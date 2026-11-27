import {readFile} from "node:fs/promises";
import assert from "node:assert/strict";
const apis={};
for(const [name,helpers] of Object.entries({"AIHotNews":"loadNews,normalizeNews,safeLink,fitNews,layoutProfile,textWidth,wrapText","HuangliQuery":"validCalendarDay,lunarMonthText,lunarDayText","NodeVitals":""})){
 const code=await readFile(new URL("../Egern/Widget/"+name+"/"+name+".js",import.meta.url),"utf8");
 const a=await import("data:text/javascript;base64,"+Buffer.from(code+"\nexport {"+helpers+"};").toString("base64"));
 apis[name]={...a,widget:a.default};
}

const N=apis.AIHotNews,H=apis.HuangliQuery,V=apis.NodeVitals,T=Date.parse("2026-11-27T15:00:00+08:00"),M=60000;
const resp=(status,body,headers={})=>({status,headers,text:async()=>JSON.stringify(body)}),fail=()=>{throw Error("offline")};
function mock(fn,kv=new Map(),widgetFamily="systemMedium",env={}){
 const calls=[];return {calls,kv,widgetFamily,env,device:{ipv4:{address:"192.168.1.2"}},storage:{getJSON:k=>JSON.parse(kv.get(k)||"null"),setJSON:(k,v)=>kv.set(k,JSON.stringify(v))},http:{get:async(u,o)=>{calls.push({u,o});return fn(u,o)}}};
}
const flat=JSON.stringify, families=["systemSmall","systemMedium","systemLarge"];
const hot={schemaVersion:1,count:4,items:[{rank:3,id:"c",title:"AI 第三条",links:{story:"https://aihot.news/story/c"}},{rank:1,id:"a",title:"AI 第一条",links:{aihot:"/items/a"}},{rank:2,id:"a",title:"AI 第一条",links:{story:"/story/a"}},{rank:4,id:"bad",title:"测试链接",links:{story:"https://evil.example/story/x"}}]};
let ctx=mock(()=>resp(200,hot,{etag:'"abc"'})),n=await N.loadNews(ctx,T,3);
assert.equal(n.items.length,3);assert.equal(n.items[0].title,"AI 第一条");assert.equal(n.items[0].url,"https://aihot.news/items/a");assert.equal(n.items[2].url,"https://aihot.news/hot");assert.equal(ctx.calls.length,1);assert.ok(ctx.calls[0].u.startsWith("https://aihot.news/"));
for(const [a,b] of [["javascript:alert(1)","https://aihot.news/hot"],["https://aihot.virxact.com/story/c","https://aihot.news/story/c"],["https://aihot.news.evil.com/story/c","https://aihot.news/hot"]])assert.equal(N.safeLink(a),b);
assert.equal(N.normalizeNews({items:[]},"hot",T),null);assert.equal(N.normalizeNews({...hot,count:99},"hot",T),null);
let cache=mock(fail,ctx.kv);n=await N.loadNews(cache,T+M,3);assert.equal(cache.calls.length,0);assert.equal(n.items.length,3);
let etag=mock((u,o)=>{assert.equal(o.headers["If-None-Match"],'"abc"');return resp(304,null)},ctx.kv);n=await N.loadNews(etag,T+15*M,3);assert.equal(n.items.length,3);assert.equal(n.cached,false);assert.equal(etag.calls.length,1);
let offline=mock(fail,ctx.kv);n=await N.loadNews(offline,T+30*M,3);assert.equal(n.cached,true);assert.equal(n.items.length,3);assert.equal(offline.calls.length,2);
let backoff=mock(fail,ctx.kv);n=await N.loadNews(backoff,T+31*M,3);assert.equal(backoff.calls.length,0);assert.equal(n.cached,true);
n=await N.loadNews(mock(fail,ctx.kv),T+7*60*M,3);assert.equal(n.items.length,0);
for(const status of [429,503]){const limited=mock(()=>resp(status,null,{"retry-after":"1800"}));n=await N.loadNews(limited,T,3);assert.equal(limited.calls.length,1);assert.equal(Date.parse(n.refreshAfter)-T,30*M);const next=mock(fail,limited.kv);await N.loadNews(next,T+M,3);assert.equal(next.calls.length,0)}
const picked=mock(u=>u.includes("hot-topics")?resp(200,{schemaVersion:1,count:0,items:[]}):resp(200,{schemaVersion:1,count:2,items:[{id:"p",title:"备用新闻",publishedAt:new Date(T-60*M).toISOString(),links:{aihot:"/items/p"}},{id:"o",title:"过期新闻",publishedAt:new Date(T-25*60*M).toISOString()}]}));n=await N.loadNews(picked,T,3);assert.equal(n.mode,"selected");assert.equal(n.items.length,1);assert.equal(n.items[0].title,"备用新闻");
for(const f of families){const w=await N.widget(mock(()=>resp(200,hot),new Map(),f),T);assert.equal(w.type,"widget");assert.ok(flat(w).includes("智能热搜"));assert.ok(Number.isFinite(Date.parse(w.refreshAfter)))}

// Real API contract and phone-size fixtures; synthetic contents, no network.
const sid=i=>"00000000-0000-4000-8000-"+String(i).padStart(12,"0"),stamp=new Date(T-60000).toISOString();
const newsItem=i=>({rank:i,id:"item-"+i,storyPublicId:sid(i),title:"测试模型"+i+"发布新功能",latestAt:stamp,links:{story:"https://aihot.news/story/"+sid(i)}});
const fullHot={schemaVersion:1,count:10,items:Array.from({length:10},(_,i)=>newsItem(i+1))};
const shortHot={...fullHot,count:3,items:fullHot.items.slice(0,3)};
const picks={schemaVersion:1,items:[{...newsItem(1),publishedAt:stamp,summary:"重复事件不得补入"},...Array.from({length:5},(_,i)=>({id:"pick-"+i,title:"精选资讯"+(i+1),summary:"开发团队"+(i+1)+"发布了新模型，支持本地部署。",publishedAt:stamp,links:{aihot:"/items/pick-"+i}}))],page:{count:6,hasMore:false,nextCursor:null}};
const storyResponse=id=>({schemaVersion:1,story:{publicId:id,digest:"模型"+Number(id.slice(-3))+"新增多语言推理功能。团队同时发布测试结果。",reports:[{summary:"模型发布了官方技术说明。"}]}});
const newsRoutes=u=>u.includes("hot-topics")?resp(200,shortHot):u.includes("/items?")?resp(200,picks):resp(200,storyResponse(u.split("/").pop()),{etag:'"detail"'});
let nc=mock(newsRoutes),nr=await N.loadNews(nc,T,5);
assert.equal(nr.items.length,5);assert.equal(nr.mode,"mixed");assert.equal(nr.items[0].storyId,sid(1));assert.equal(nr.items[3].id,"pick-0");assert.ok(nr.items.slice(0,3).every(i=>i.summary.includes("多语言")));assert.ok(nr.items.slice(3).every(i=>i.summary.includes("本地部署")));assert.equal(nc.calls.length,5);
const cachedDetail=mock(fail,nc.kv);nr=await N.loadNews(cachedDetail,T+M,5);assert.equal(cachedDetail.calls.length,0);assert.equal(nr.items.length,5);assert.ok(nr.items[0].summary);
const rerun=mock(newsRoutes,nc.kv);nr=await N.loadNews(rerun,T+15*M,5);assert.equal(rerun.calls.length,2);assert.equal(nr.items.length,5);
const newStamp=new Date(T+16*M).toISOString(),changedList={...shortHot,items:shortHot.items.map((x,i)=>i===0?{...x,latestAt:newStamp}:x)};
const changedCtx=mock(u=>u.includes("hot-topics")?resp(200,changedList):u.includes("/items?")?resp(200,picks):resp(200,{schemaVersion:1,story:{publicId:sid(99),digest:"错误事件摘要"}}),nc.kv);
nr=await N.loadNews(changedCtx,T+30*M,5);assert.equal(nr.items[0].summary,"");assert.ok(nr.items[1].summary.includes("多语言"));assert.equal(changedCtx.calls.filter(c=>c.u.includes("/stories/")).length,1);
assert.equal(N.normalizeNews({...picks,page:{count:100}},"selected",T),null);
const selectedOnly=mock(u=>u.includes("hot-topics")?resp(503,{}):resp(200,picks));
nr=await N.loadNews(selectedOnly,T,5);assert.equal(nr.items.length,0);assert.equal(selectedOnly.calls.length,1);
const picksOnly=mock(u=>u.includes("hot-topics")?resp(404,{}):resp(200,picks));nr=await N.loadNews(picksOnly,T,5);assert.equal(nr.items.length,5);assert.equal(nr.mode,"selected");
const noFill=mock(u=>u.includes("hot-topics")?resp(200,{schemaVersion:1,count:1,items:[newsItem(1)]}):u.includes("/items?")?resp(200,{schemaVersion:1,items:[],page:{count:0}}):resp(200,storyResponse(sid(1))));
nr=await N.loadNews(noFill,T,5);assert.equal(nr.items.length,1);assert.equal(nr.mode,"hot");
const fillRecent=mock(u=>u.includes("hot-topics")?resp(200,shortHot):u.includes("mode=selected")?resp(200,{schemaVersion:1,items:[],page:{count:0}}):u.includes("mode=all")?resp(200,picks):resp(200,storyResponse(u.split("/").pop())));
nr=await N.loadNews(fillRecent,T,5);assert.equal(nr.items.length,5);assert.equal(nr.mode,"mixed");assert.ok(fillRecent.calls.some(c=>c.u.includes("mode=all")));
const storiesOffline=mock(u=>u.includes("hot-topics")?resp(200,fullHot):resp(500,{}));nr=await N.loadNews(storiesOffline,T,5);assert.equal(nr.items.length,5);assert.ok(nr.items.every(i=>!i.summary&&i.title));
const limitedStory=mock(u=>u.includes("hot-topics")?resp(200,fullHot):resp(429,{},{"Retry-After":"1800"}));nr=await N.loadNews(limitedStory,T,8);assert.equal(nr.items.length,8);assert.equal(limitedStory.calls.filter(c=>c.u.includes("/stories/")).length,4);assert.equal(Date.parse(nr.refreshAfter)-T,30*M);
function newsRows(w){const all=[];function walk(v){if(v?.type==="stack"&&v.url&&typeof v.height==="number")all.push(v);for(const c of v?.children||[])walk(c)}walk(w);return all}
function textNodes(w){const out=[];function walk(v){if(v?.type==="text")out.push(v.text);for(const c of v?.children||[])walk(c)}walk(w);return out}
const hardCases=[
 {title:"GPT-6.2 模型已发布",summary:"OpenAI发布模型更新，用户现在可以体验新功能。"},
 {title:"Anthropic 将 Claude Messages API 从 Python 迁至 Rust",summary:"Anthropic 宣布完成 Claude Messages API 的技术迁移，新的 Rust 实现改善请求处理性能。"},
 {title:"本地测试新闻标题",summary:"这是极长的新闻摘要内容".repeat(50)+"，需要在完整边界选择文字。"},
 {title:"包含…省略号的标题",summary:"新闻发布了新功能。更多内容……"},
 {title:"中文（带括号）模型 GPT-6.2.1 与 API 版本 2.0 正式发布",summary:"新版本支持128K上下文。"},
 {title:"A".repeat(300),summary:"https://example.com/"+"x".repeat(500)},
 {title:"发布测试……",summary:"第一句没有结束......"}
];
for(const f of families){
 const p=N.layoutProfile(f);
 for(const item of hardCases){const fit=N.fitNews(item,p);assert.ok(fit.lines.length>=1&&fit.lines.length<=2);assert.ok(fit.lines.every(s=>N.textWidth(s)*(fit.scale||1)<=p.budget+0.00001));assert.ok(fit.lines.every(s=>!/(?:…|⋯|\.{3,}|．{3,})/.test(s)))}
 const ctx2=mock(u=>u.includes("hot-topics")?resp(200,fullHot):resp(200,storyResponse(u.split("/").pop())),new Map(),f),widget=await N.widget(ctx2,T);
 assert.equal(newsRows(widget).length,f==="systemLarge"?8:5);
 // The iPhone screenshot showed an unwanted centered flex column. Every
 // article must use one natural-width, explicitly left-aligned text element
 // and a trailing flexible spacer, rather than a centered flex text frame.
 for(const r of newsRows(widget)){
  assert.equal(r.alignItems,"start");
  assert.equal(r.children.length,3);
  assert.equal(r.children[0].width,p.badge);
  assert.equal(r.children[0].children[0].textAlign,"left");
  const t=r.children[1];assert.equal(t.type,"text");
  assert.equal(t.textAlign,"left");assert.equal(t.maxLines,2);
  assert.equal(t.flex,undefined);
  assert.equal(r.children[2].type,"spacer");assert.equal(r.children[2].length,undefined);
  assert.ok(t.text.split("\n").length<=2);
  assert.ok(t.text.split("\n").every(s=>N.textWidth(s)*t.font.size<=p.budget*p.font+0.0001));
 }
 const list=widget.children.find(x=>x.type==="stack"&&x.direction==="column"&&x.children.some(r=>r.url));
 assert.ok(list);assert.equal(list.alignItems,"start");
 const rules=list.children.filter(x=>x.height===0.5);
 assert.equal(rules.length,newsRows(widget).length-1);
 for(const rule of rules){
  assert.equal(rule.children[0].length,p.badge+4);
  assert.equal(rule.children[1].flex,1);
  assert.equal(rule.children[1].height,0.5);
  assert.equal(rule.children[1].children[0].type,"spacer");
 }

 assert.ok(newsRows(widget).some(r=>textNodes(r).join("").includes("多语言")),"rendered summary "+f);
 assert.ok(textNodes(widget).every(x=>!/(?:…|⋯|\.{3,}|．{3,})/.test(x)));
 assert.equal(ctx2.calls.length,1+(f==="systemLarge"?8:5));
 const [top,right,bottom,left]=p.padding,expectedHeight=p.count*p.rowHeight+(p.count-1)*0.5+top+bottom+(p.header+4)+(p.footer+3)+p.gap;
 assert.ok(expectedHeight<=(f==="systemLarge"?382:170),"height "+f);
 assert.ok(p.budget*p.font+p.badge+4+left+right<(f==="systemSmall"?170:364),"width "+f);
}
assert.equal(N.fitNews({title:"模型发布",summary:"模型发布了新功能。"},N.layoutProfile("systemMedium")).kind,"summary");
assert.equal(N.fitNews({title:"新模型正式发布",summary:"长摘要".repeat(100)},N.layoutProfile("systemSmall")).kind,"title");
assert.equal(N.wrapText("超长英文单词"+"A".repeat(50),12),null);
const leading=N.wrapText("甲乙丙丁戊己庚辛壬癸甲乙丙丁戊己",11);
assert.ok(leading&&leading.length===2);
assert.ok(N.textWidth(leading[0])>=N.textWidth(leading[1]));
assert.equal(leading.join(""),"甲乙丙丁戊己庚辛壬癸甲乙丙丁戊己");

function lunar(d){const p=new Intl.DateTimeFormat("zh-CN-u-ca-chinese",{year:"numeric",month:"long",day:"numeric",timeZone:"Asia/Shanghai"}).formatToParts(new Date(d+"T04:00:00Z"));return {m:H.lunarMonthText(p.find(x=>x.type==="month").value),d:H.lunarDayText(p.find(x=>x.type==="day").value)}}
const ds=["2026-11-27","2026-11-28","2026-11-30","2026-12-01","2026-12-31","2027-01-01","2027-02-06"];
function prim(d){const l=lunar(d),[y,m,n]=d.split("-");return {year:y,month:m,day:n,lMonth:l.m,lDate:l.d,gzYear:"丙午",gzMonth:"己亥",gzDate:"甲子",animal:"马",suit:"祭祀.出行",avoid:"动土",festivalList:"测试节日",jiri:"1"}}
function sec(d,short=false){const l=lunar(d),[y,m,n]=d.split("-");return {day:short?n:d,title:y+"年 "+Number(m)+"月 (大) 星期五",lunar:l.m+"月"+l.d,ganzhi:"丙午年 【马年】 己亥月 甲子日",yi:["祭祀","出行"],ji:["动土"],festival:"测试节日",details:{"生肖":"马","星宿":"角宿"}}}
const source=u=>u.includes("openApiData")?resp(200,{data:ds.map(prim)}):resp(200,ds.map((d,i)=>sec(d,i%2===1)));
ctx=mock(source);let w=await H.widget(ctx,T);
assert.equal(ctx.calls.length,2);assert.ok(flat(w).includes("祭祀"));assert.ok(flat(w).includes("农历"+lunar(ds[0]).m+"月"+lunar(ds[0]).d));assert.ok(flat(w).includes("2026年11月27日"));
cache=mock(fail,ctx.kv);w=await H.widget(cache,T+M);assert.equal(cache.calls.length,0);assert.ok(flat(w).includes("祭祀"));
w=await H.widget(cache,Date.parse("2026-11-28T00:01:00+08:00"));assert.equal(cache.calls.length,0);assert.ok(flat(w).includes("2026年11月28日"));assert.ok(flat(w).includes("农历"+lunar(ds[1]).m+"月"+lunar(ds[1]).d));
let later=mock(fail,ctx.kv);w=await H.widget(later,Date.parse("2026-11-30T22:00:00+08:00"));assert.equal(later.calls.length,2);assert.ok(flat(w).includes("祭祀"));assert.ok(flat(w).includes("2026年11月30日"));
w=await H.widget(mock(fail,ctx.kv),Date.parse("2026-12-01T00:00:00+08:00"));assert.ok(!flat(w).includes("祭祀"));assert.ok(flat(w).includes("2026年12月1日"));
for(const short of [true,false]){w=await H.widget(mock(u=>u.includes("openApiData")?resp(404,{}):resp(200,[sec(ds[0],short)])),T);assert.ok(flat(w).includes("祭祀"))}
w=await H.widget(mock(u=>u.includes("openApiData")?resp(404,{}):resp(200,[{...sec(ds[0],true),title:"2026年10月 星期五"}])),T);assert.ok(!flat(w).includes("祭祀"));
w=await H.widget(mock(u=>u.includes("openApiData")?resp(200,[{...prim(ds[0]),lDate:"初一"}]):resp(200,[sec(ds[0])])),T);assert.ok(flat(w).includes("农历"+lunar(ds[0]).m+"月"+lunar(ds[0]).d));
for(const f of families){const t=Date.parse("2026-12-31T23:59:00+08:00");w=await H.widget(mock(source,new Map(),f),t);assert.equal(w.type,"widget");assert.equal(Date.parse(w.refreshAfter),t+M);assert.ok(flat(w).includes("祭祀"));w=await H.widget(mock(source,new Map(),f),Date.parse("2027-01-01T00:01:00+08:00"));assert.ok(flat(w).includes("农历"+lunar(ds[5]).m+"月"+lunar(ds[5]).d))}
assert.equal(H.validCalendarDay({lMonth:"",lDate:"初一"}),null);assert.equal(H.lunarDayText("21"),"廿一");
// Compatibility smoke tests for the 26 Nov NodeVitals version restored by request.
// All HTTP results below are offline fixtures, not measurements of a user's phone.
const p={ip:"8.8.4.4",countryCode:"JP",fraudScore:12,isResidential:true};
const q={ip:p.ip,location:{country_code:"JP"},risk:{risk_score:5,is_datacenter:false,is_vpn:false,is_proxy:false,is_tor:false}};
for(const family of families){
 ctx=mock(u=>u==="https://my.ippure.com/v1/info"?resp(200,p):resp(200,q),new Map(),family);
 w=await V.widget(ctx);
 assert.equal(w.type,"widget");
 for(const value of ["节点体检","纯度","88","住宅","低","日本","内网 IP","192.168.1.2","出口 IP",p.ip])assert.ok(flat(w).includes(JSON.stringify({text:value}).slice(1,-1)));
 assert.deepEqual(ctx.calls.map(c=>c.u),["https://my.ippure.com/v1/info","https://api.ipquery.io/"+p.ip]);
}
ctx=mock(u=>u.includes("ippure")?resp(200,{...p,fraudScore:75,isResidential:false}):resp(200,q));
w=await V.widget(ctx);
for(const value of ["25","机房","高"])assert.ok(flat(w).includes(JSON.stringify({text:value}).slice(1,-1)));
// The historical fallback observes an exit with ipify, then queries that address.
const fallbackIP="1.0.0.1";
ctx=mock(u=>u.includes("ippure")?resp(200,{}):u==="https://api64.ipify.org?format=json"?resp(200,{ip:fallbackIP}):resp(200,{ip:fallbackIP,location:{country_code:"US"},risk:{risk_score:40,is_datacenter:false,is_vpn:false,is_proxy:false,is_tor:false}}));
w=await V.widget(ctx);
for(const value of [fallbackIP,"60","中","美国"])assert.ok(flat(w).includes(JSON.stringify({text:value}).slice(1,-1)));
assert.deepEqual(ctx.calls.map(c=>c.u),["https://my.ippure.com/v1/info","https://api64.ipify.org?format=json","https://api.ipquery.io/"+fallbackIP]);
w=await V.widget(mock(fail));assert.equal(w.type,"widget");assert.ok(flat(w).includes('"text":"获取失败"'));assert.ok(flat(w).includes('"text":"--"'));

console.log("Three Egern widget regression suites passed");
