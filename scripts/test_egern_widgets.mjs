import {readFile} from "node:fs/promises";
import assert from "node:assert/strict";
const apis={};
for(const [name,helpers] of Object.entries({"AIHotNews":"loadNews,normalizeNews,safeLink","HuangliQuery":"validCalendarDay,lunarMonthText,lunarDayText","NodeVitals":""})){
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
let ctx=mock(()=>resp(200,hot,{etag:'"abc"'})),n=await N.loadNews(ctx,T);
assert.equal(n.items.length,3);assert.equal(n.items[0].title,"AI 第一条");assert.equal(n.items[0].url,"https://aihot.news/items/a");assert.equal(n.items[2].url,"https://aihot.news/hot");assert.equal(ctx.calls.length,1);assert.ok(ctx.calls[0].u.startsWith("https://aihot.news/"));
for(const [a,b] of [["javascript:alert(1)","https://aihot.news/hot"],["https://aihot.virxact.com/story/c","https://aihot.news/story/c"],["https://aihot.news.evil.com/story/c","https://aihot.news/hot"]])assert.equal(N.safeLink(a),b);
assert.equal(N.normalizeNews({items:[]},"hot",T),null);assert.equal(N.normalizeNews({...hot,count:99},"hot",T),null);
let cache=mock(fail,ctx.kv);n=await N.loadNews(cache,T+M);assert.equal(cache.calls.length,0);assert.equal(n.items.length,3);
let etag=mock((u,o)=>{assert.equal(o.headers["If-None-Match"],'"abc"');return resp(304,null)},ctx.kv);n=await N.loadNews(etag,T+15*M);assert.equal(n.items.length,3);assert.equal(n.cached,false);assert.equal(etag.calls.length,1);
let offline=mock(fail,ctx.kv);n=await N.loadNews(offline,T+30*M);assert.equal(n.cached,true);assert.equal(n.items.length,3);assert.equal(offline.calls.length,2);
let backoff=mock(fail,ctx.kv);n=await N.loadNews(backoff,T+31*M);assert.equal(backoff.calls.length,0);assert.equal(n.cached,true);
n=await N.loadNews(mock(fail,ctx.kv),T+7*60*M);assert.equal(n.items.length,0);
for(const status of [429,503]){const limited=mock(()=>resp(status,null,{"retry-after":"1800"}));n=await N.loadNews(limited,T);assert.equal(limited.calls.length,1);assert.equal(Date.parse(n.refreshAfter)-T,30*M);const next=mock(fail,limited.kv);await N.loadNews(next,T+M);assert.equal(next.calls.length,0)}
const picked=mock(u=>u.includes("hot-topics")?resp(200,{schemaVersion:1,count:0,items:[]}):resp(200,{schemaVersion:1,count:2,items:[{id:"p",title:"备用新闻",publishedAt:new Date(T-60*M).toISOString(),links:{aihot:"/items/p"}},{id:"o",title:"过期新闻",publishedAt:new Date(T-25*60*M).toISOString()}]}));n=await N.loadNews(picked,T);assert.equal(n.mode,"selected");assert.equal(n.items.length,1);assert.equal(n.items[0].title,"备用新闻");
for(const f of families){const w=await N.widget(mock(()=>resp(200,hot),new Map(),f),T);assert.equal(w.type,"widget");assert.ok(flat(w).includes("智能热搜"));assert.ok(Number.isFinite(Date.parse(w.refreshAfter)))}
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
