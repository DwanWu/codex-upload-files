import {readFile} from "node:fs/promises";
import assert from "node:assert/strict";
const apis={};
for(const [name,helpers] of Object.entries({"AIHotNews":"loadNews,normalizeNews,safeLink","HuangliQuery":"validCalendarDay,lunarMonthText,lunarDayText","NodeVitals":"measureNode,canonIP,score,publicIP"})){
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
// Synthetic public-IP fixtures: no network calls, labels and scores are mock values.
const p={ip:"8.8.4.4",countryCode:"JP",fraudScore:12,isResidential:true},q={ip:"8.8.4.4",location:{country_code:"JP"},risk:{risk_score:5,is_datacenter:false,is_vpn:false,is_proxy:false,is_tor:false}};
const pair=(a,b,env={})=>mock(u=>resp(200,u.includes("ippure")?a:b),new Map(),"systemMedium",env);
ctx=pair(p,q,{NODE_POLICY:"节点选择"});let v=await V.measureNode(ctx);
assert.equal(v.purity,88);assert.equal(v.property,"住宅");assert.equal(v.riskLevel,"低");assert.equal(v.region,"日本");
assert.equal(ctx.calls.length,3);assert.ok(ctx.calls.some(c=>c.u==="https://api.ipquery.io/8.8.4.4"));assert.ok(ctx.calls.some(c=>c.u==="https://proxycheck.io/v3/8.8.4.4?tag=0"));
assert.ok(ctx.calls.every(c=>c.o.policy==="节点选择"));assert.ok(ctx.calls.every(c=>c.o.credentials==="omit"&&c.o.insecureTls===false));
v=await V.measureNode(pair({...p,fraudScore:null,isResidential:null},{...q,risk:{risk_score:null}}));assert.equal(v.purity,null);assert.equal(v.property,"未知");assert.equal(v.riskLevel,"未知");
v=await V.measureNode(pair({...p,fraudScore:0},q));assert.equal(v.purity,100);
v=await V.measureNode(pair({...p,fraudScore:"0"},q));assert.equal(v.purity,null);assert.equal(v.purityLabel,"纯度");assert.equal(v.puritySource,null);
// A mismatched lookup must not discard valid IPPure results or mix another address's risk.
v=await V.measureNode(pair({...p,ip:"9.9.9.9"},{...q,risk:{...q.risk,is_tor:true,risk_score:100}}));assert.equal(v.quality,"single");assert.equal(v.region,"日本");assert.equal(v.purity,88);assert.equal(v.property,"住宅");assert.equal(v.riskLevel,"未知");
const routed=mock(u=>u.includes("ippure")?resp(200,p):u==="https://api.ipquery.io/8.8.4.4"?resp(200,q):resp(200,{...q,ip:"9.9.9.9",risk:{...q.risk,risk_score:100}}));
v=await V.measureNode(routed);assert.equal(v.quality,"verified");assert.equal(v.exitIP,p.ip);assert.equal(v.riskLevel,"低");assert.equal(routed.calls.length,3);assert.ok(!routed.calls.some(c=>c.u.includes("?format=json")));
v=await V.measureNode(pair({...p,ip:"2606:4700:4700::1111"},q));assert.equal(v.quality,"single");assert.equal(v.purity,null);assert.equal(v.purityNote,"IPv6评分暂缺");assert.equal(v.riskLevel,"未知");
ctx=pair({...p,ip:"2606:4700:4700::1111"},{...q,ip:"2606:4700:4700:0:0:0:0:1111"});v=await V.measureNode(ctx);assert.equal(v.quality,"verified");assert.equal(ctx.calls[1].u,"https://api.ipquery.io/2606:4700:4700:0:0:0:0:1111");
v=await V.measureNode(pair({...p,isResidential:false},q));assert.equal(v.property,"非住宅");
v=await V.measureNode(pair(p,{...q,risk:{...q.risk,is_datacenter:true}}));assert.equal(v.property,"有差异");assert.equal(v.riskLevel,"中");
v=await V.measureNode(pair(null,{...q,risk:{...q.risk,is_tor:true,risk_score:100}}));assert.equal(v.purity,null);assert.equal(v.riskLevel,"高");assert.equal(v.puritySource,null);
ctx=mock(u=>u.includes("ippure")?resp(503,{}):u.includes("?format=json")?resp(200,{ip:q.ip}):resp(200,q));
v=await V.measureNode(ctx);assert.equal(ctx.calls.length,4);assert.equal(v.exitIP,q.ip);assert.equal(v.purity,null);assert.equal(v.riskLevel,"未知");
ctx=mock(u=>u.includes("ippure")?resp(200,p):resp(503,{}));v=await V.measureNode(ctx);assert.equal(v.purity,88);assert.equal(v.property,"住宅");assert.equal(v.riskLevel,"未知");assert.equal(v.region,"日本");
v=await V.measureNode(mock(fail));assert.equal(v.quality,"offline");assert.equal(v.purity,null);assert.equal(v.property,"未知");assert.equal(v.riskLevel,"未知");
for(const f of families){
 const w=await V.widget(mock(u=>u.includes("ippure")?resp(200,p):resp(200,{...q,ip:"9.9.9.9"}),new Map(),f),T);
 assert.ok(flat(w).includes("出口 IP"));assert.ok(!flat(w).includes("IPPure IP"));assert.ok(!flat(w).includes("出口不一致"));assert.ok(flat(w).includes('"text":"88"'));assert.ok(flat(w).includes("日本"));
}
for(const bad of ["1.2.3.999","javascript:1","1::2::3","2001:db8:","::ffff:1.2.3.999","127.0.0.01"])assert.equal(V.canonIP(bad),null);
assert.equal(V.canonIP("::ffff:8.8.4.4"),"8.8.4.4");assert.equal(V.score(null),null);assert.equal(V.score(101),null);assert.equal(V.score(0),0);
for(const f of families){ctx=mock(u=>resp(200,u.includes("ippure")?p:q),new Map(),f);w=await V.widget(ctx,T);assert.equal(w.type,"widget");assert.ok(flat(w).includes("8.8.4.4"));assert.ok(flat(w).includes("日本"));assert.ok(Number.isFinite(Date.parse(w.refreshAfter)));w=await V.widget(mock(u=>resp(200,u.includes("ippure")?{...p,ip:"1.0.0.1",countryCode:"US",fraudScore:70}:{...q,ip:"1.0.0.1",location:{country_code:"US"}}),ctx.kv,f),T+M);assert.ok(flat(w).includes("1.0.0.1"));assert.ok(!flat(w).includes("8.8.4.4"));assert.ok(flat(w).includes("美国"));assert.ok(flat(w).includes('"text":"30"'))}


// Provider contract replay: IPPure official API example, IPQuery 1.1.1.1 public response.
// No real user exit IP is stored or sent by the tests.
const officialPure={ip:"104.28.123.123",asn:13335,asOrganization:"Cloudflare, Inc.",country:"United States",countryCode:"US",fraudScore:75,isResidential:false,isBroadcast:false};
v=await V.measureNode(pair(officialPure,null));assert.equal(v.purity,25);assert.equal(v.rawFraudScore,75);assert.equal(v.puritySource,"IPPure");assert.equal(v.purityNote,"IPPure参考");assert.equal(v.property,"非住宅");assert.equal(v.riskLevel,"高");
const publicQuery={ip:"1.1.1.1",isp:{asn:"AS13335",org:"Cloudflare, Inc."},location:{country:"Australia",country_code:"AU"},risk:{is_mobile:false,is_vpn:false,is_tor:false,is_proxy:false,is_datacenter:true,risk_score:0}};
v=await V.measureNode(pair(null,publicQuery));assert.equal(v.exitIP,"1.1.1.1");assert.equal(v.purity,null);assert.equal(v.ipqueryRiskScore,0);assert.equal(v.property,"机房");assert.equal(v.riskLevel,"中");
for(const value of [undefined,null,"0","100",false,true,-1,101,NaN,Infinity,{},[]]){
 v=await V.measureNode(pair({...p,fraudScore:value},q));assert.equal(v.purity,null);assert.equal(v.rawFraudScore,null);
}
for(const value of [0,1,12.5,50,99,100]){
 v=await V.measureNode(pair({...p,fraudScore:value},q));assert.equal(v.purity,100-value);assert.equal(v.rawFraudScore,value);assert.equal(v.puritySource,"IPPure");
}
for(const value of [0,12,100]){
 v=await V.measureNode(pair({...p,ip:"2606:4700:4700::1111",fraudScore:value},{...q,ip:"2606:4700:4700::1111"}));
 assert.equal(v.purity,null);assert.equal(v.purityNote,"IPv6评分暂缺");assert.equal(v.rawFraudScore,null);
}
for(const bad of ["0.0.0.0","127.0.0.1","10.0.0.2","100.64.0.1","172.16.1.2","192.168.1.2","169.254.1.1","192.0.2.1","198.18.0.1","198.51.100.1","203.0.113.10","224.0.0.1","::1","fc00::1","fe80::1","2001:db8::1","::ffff:10.0.0.1"]){
 assert.equal(V.publicIP(bad),null);
 ctx=mock(u=>u.includes("ippure")?resp(200,{...p,ip:bad,fraudScore:0}):resp(503,{}));
 v=await V.measureNode(ctx);assert.equal(v.purity,null);assert.equal(v.exitIP,"获取失败");
}
assert.equal(V.publicIP("8.8.4.4"),"8.8.4.4");assert.equal(V.publicIP("::ffff:8.8.4.4"),"8.8.4.4");assert.ok(V.publicIP("2606:4700:4700::1111"));
// A stale shared-cache echo is not evidence of this invocation's current exit.
ctx=mock(u=>u.includes("ippure")?resp(200,p,{"Age":"120"}):resp(200,publicQuery));
v=await V.measureNode(ctx);assert.equal(v.exitIP,"1.1.1.1");assert.equal(v.purity,null);assert.ok(ctx.calls.every(c=>c.o.headers["Cache-Control"]==="no-cache, no-store"));
ctx=mock(()=>resp(429,{ip:p.ip,fraudScore:0}));v=await V.measureNode(ctx);assert.equal(v.purity,null);assert.equal(v.exitIP,"获取失败");
ctx=mock(u=>u.includes("ippure")?{status:200,text:async()=>"<html>challenge</html>"}:resp(200,publicQuery));v=await V.measureNode(ctx);assert.equal(v.purity,null);assert.equal(v.exitIP,"1.1.1.1");
v=await V.measureNode(pair({...p,fraudScore:0},{...q,risk:{...q.risk,is_tor:true,risk_score:100}}));assert.equal(v.purity,100);assert.equal(v.rawFraudScore,0);assert.equal(v.riskLevel,"高");
for(const f of families){
 w=await V.widget(mock(u=>u.includes("ippure")?resp(200,officialPure):resp(503,{}),new Map(),f),T);
 assert.ok(flat(w).includes("IPPure参考"));assert.ok(flat(w).includes('"text":"25"'));assert.ok(flat(w).includes("出口 IP"));assert.ok(!flat(w).includes("IPPure IP"));
 w=await V.widget(mock(u=>u.includes("ippure")?resp(503,{}):resp(200,publicQuery),new Map(),f),T);
 assert.ok(flat(w).includes("评分暂缺"));assert.ok(flat(w).includes('"text":"--"'));assert.ok(!flat(w).includes('"text":"100"'));
}


// Proxycheck v3 contract tests. These are synthetic and do not query user IPs.
const nowPC=Date.parse("2026-11-27T15:00:00+08:00");
const rowPC=(risk=12,patch={})=>({
 network:{type:"Residential"},location:{country_code:"JP",country_name:"Japan"},
 detections:{proxy:false,vpn:false,compromised:false,scraper:false,tor:false,hosting:false,anonymous:false,risk,confidence:100},
 detection_history:{delisted:false},last_updated:new Date(nowPC-3600000).toISOString(),...patch
});
const pcBody=(ip,row,status="ok")=>({status,[ip]:row});
const tri=(pure,query,proxy,env={},kv=new Map())=>mock(u=>u.includes("ippure")?resp(200,pure):u.includes("proxycheck.io")?resp(200,proxy):resp(200,query),kv,"systemMedium",env);
ctx=tri(p,q,pcBody(p.ip,rowPC(18)));
v=await V.measureNode(ctx,nowPC);
assert.equal(v.exitIP,p.ip);assert.equal(v.purity,82);assert.equal(v.puritySource,"Proxycheck");assert.equal(v.purityNote,"Proxycheck参考");assert.equal(v.proxycheckRiskScore,18);assert.equal(v.rawFraudScore,12);assert.equal(v.ipqueryRiskScore,5);assert.equal(v.riskLevel,"低");assert.equal(v.riskNote,null);assert.equal(ctx.calls.length,3);
assert.ok(ctx.calls.every(c=>c.o.credentials==="omit"&&c.o.insecureTls===false&&c.o.redirect==="error"));
v=await V.measureNode(tri({...p,fraudScore:80},q,pcBody(p.ip,rowPC(10))),nowPC);
assert.equal(v.purity,90);assert.equal(v.puritySource,"Proxycheck");assert.equal(v.riskNote,"评分有差异");assert.equal(v.riskLevel,"高");
const host=rowPC(33,{network:{type:"Hosting"}});host.detections.hosting=true;
v=await V.measureNode(tri({...p,isResidential:false},q,pcBody(p.ip,host)),nowPC);assert.equal(v.purity,67);assert.equal(v.property,"机房");assert.equal(v.riskLevel,"中");
const vpn=rowPC(50);vpn.detections.vpn=true;vpn.detections.anonymous=true;
v=await V.measureNode(tri(p,q,pcBody(p.ip,vpn)),nowPC);assert.equal(v.purity,50);assert.equal(v.riskLevel,"中");
const tor=rowPC(75);tor.detections.tor=true;tor.detections.anonymous=true;
v=await V.measureNode(tri(p,q,pcBody(p.ip,tor)),nowPC);assert.equal(v.purity,25);assert.equal(v.riskLevel,"高");
const v6="2606:4700:4700::1111",v6canon=V.publicIP(v6);
ctx=tri({...p,ip:v6,fraudScore:0},{...q,ip:v6},pcBody(v6,rowPC(45)));
v=await V.measureNode(ctx,nowPC);assert.equal(v.purity,55);assert.equal(v.puritySource,"Proxycheck");assert.equal(v.rawFraudScore,null);assert.ok(ctx.calls.some(c=>c.u==="https://proxycheck.io/v3/"+encodeURIComponent(v6canon)+"?tag=0"));
v=await V.measureNode(tri(null,q,pcBody(q.ip,rowPC(20))),nowPC);assert.equal(v.purity,80);assert.equal(v.puritySource,"Proxycheck");assert.equal(v.riskLevel,"低");
// Replay the contradictory public resolver response observed on 27 Nov 2026.
// Do not treat an anonymous=true but delisted=true record as authoritative.
const inconsistent=rowPC(100,{network:{type:"Business"},detection_history:{delisted:true,delist_datetime:"2026-11-20T02:47:02Z"}});
inconsistent.detections.anonymous=true;
v=await V.measureNode(tri(p,q,pcBody(p.ip,inconsistent)),nowPC);assert.equal(v.purity,88);assert.equal(v.puritySource,"IPPure");assert.equal(v.proxycheckRiskScore,null);assert.equal(v.riskNote,"记录有差异");assert.equal(v.riskLevel,"未知");
for(const bad of [
 pcBody("9.9.9.9",rowPC(0)),
 pcBody(p.ip,rowPC("0")),
 pcBody(p.ip,rowPC(null)),
 pcBody(p.ip,rowPC(101)),
 pcBody(p.ip,rowPC(0,{last_updated:"invalid"})),
 pcBody(p.ip,rowPC(0,{last_updated:new Date(nowPC+3600000).toISOString()})),
 pcBody(p.ip,rowPC(0,{last_updated:new Date(nowPC-2*86400000).toISOString()})),
 {status:"denied",[p.ip]:rowPC(0)},
 {status:"warning",message:"Your API Key has been disabled",[p.ip]:rowPC(0)}
]){
 v=await V.measureNode(tri({...p,fraudScore:12},q,bad),nowPC);
 assert.equal(v.purity,88);assert.equal(v.puritySource,"IPPure");assert.equal(v.proxycheckRiskScore,null);
}
const malformed=rowPC(0);malformed.detections.proxy=true;malformed.detections.anonymous=true;
v=await V.measureNode(tri(p,q,pcBody(p.ip,malformed)),nowPC);assert.equal(v.purity,88);assert.equal(v.riskNote,"记录有差异");
const budgetKV=new Map();
ctx=mock(u=>u.includes("ippure")?resp(200,p):u.includes("proxycheck")?resp(429,{},{"Retry-After":"7200"}):resp(200,q),budgetKV);
v=await V.measureNode(ctx,nowPC);assert.equal(v.purity,88);assert.equal(v.puritySource,"IPPure");
const follow=tri({...p,ip:"1.0.0.1"},{...q,ip:"1.0.0.1"},pcBody("1.0.0.1",rowPC(0)),{},budgetKV);
v=await V.measureNode(follow,nowPC+60000);assert.equal(v.exitIP,"1.0.0.1");assert.equal(v.purity,88);assert.ok(!follow.calls.some(c=>c.u.includes("proxycheck.io")));
const budget=JSON.parse(budgetKV.get("NodeVitals.proxycheck.budget.v1"));assert.equal(budget.count,1);assert.equal(budget.blockedUntil,nowPC+7200000);assert.ok(!JSON.stringify(budget).includes(p.ip));
ctx=tri(p,q,pcBody(p.ip,rowPC(18)),{PROXYCHECK_KEY:"test-key-not-a-real-secret"});
v=await V.measureNode(ctx,nowPC);assert.ok(ctx.calls.some(c=>c.u.includes("proxycheck.io")&&c.u.includes("&key=test-key-not-a-real-secret")));assert.ok(ctx.calls.filter(c=>!c.u.includes("proxycheck.io")).every(c=>!c.u.includes("test-key")));
const limitKV=new Map([["NodeVitals.proxycheck.budget.v1",JSON.stringify({day:"2026-11-27",count:80,blockedUntil:0})]]);
ctx=tri(p,q,pcBody(p.ip,rowPC(0)),{},limitKV);v=await V.measureNode(ctx,nowPC);assert.equal(v.purity,88);assert.ok(!ctx.calls.some(c=>c.u.includes("proxycheck.io")));
for(const f of families){
 w=await V.widget(mock(u=>u.includes("ippure")?resp(200,p):u.includes("proxycheck")?resp(200,pcBody(p.ip,rowPC(18))):resp(200,q),new Map(),f),nowPC);
 assert.ok(flat(w).includes("Proxycheck参考"));assert.ok(flat(w).includes('"text":"82"'));assert.ok(flat(w).includes("出口 IP"));assert.equal(Date.parse(w.refreshAfter),nowPC+30*60000);
}

console.log("Three Egern widget regression suites passed");
