import fs from "node:fs";
import assert from "node:assert/strict";
import vm from "node:vm";
const source=fs.readFileSync(new URL("OilPriceGD.js",import.meta.url),"utf8");
const published=JSON.parse(fs.readFileSync(new URL("fixture.json",import.meta.url),"utf8"));

let checks=0;
const eq=(a,b)=>{checks++;assert.equal(a,b)};
const ok=v=>{checks++;assert.ok(v)};
const clone=x=>JSON.parse(JSON.stringify(x));
const at=s=>Date.parse(s);
const key="stash.oilpricegd.v2.snapshot";
const url="https://raw.githubusercontent.com/DwanWu/codex-upload-files/main/Egern/Widget/OilPriceGD/prices.json?slot=";
async function execute(now,input,kv=new Map(),status=200,alternate=null,alternateStatus=0,alternateHeaders={}){
 let calls=0,done=0,requests=[];
 const payload=typeof input==="string"?input:JSON.stringify(input);
 const value=await new Promise(resolve=>{
   class TestDate extends Date{static now(){return now}}
   vm.runInNewContext(source,{
     Date:TestDate,
     $persistentStore:{read:k=>kv.get(k)||null,write:(v,k)=>{kv.set(k,v);return true}},
     $httpClient:{get:(req,cb)=>{
       calls++;requests.push(req);
       if(req.url.startsWith(url))cb(status===0?"offline":null,{status},payload);
       else cb(alternateStatus===0?"offline":null,{status:alternateStatus,headers:alternateHeaders},typeof alternate==="string"?alternate:JSON.stringify(alternate));
     }},
     $done:v=>{done++;resolve(v)}
   });
 });
 ok(calls>=1&&calls<=2);eq(done,1);
 ok(requests[0].url.startsWith(url));
 eq(requests[0].insecure,false);
 eq(requests[0].timeout,8);
 if(calls===2){ok(requests[1].url.startsWith("https://api.github.com/repos/DwanWu/codex-upload-files/contents/"));eq(requests[1].timeout,8);eq(requests[1].headers.Accept,"application/vnd.github.raw+json");eq(requests[1].insecure,false)}
 eq(value.icon,"fuelpump.fill");
 ok(!value.title.includes("\n")&&!value.content.includes("\n"));
 ok(!value.title.includes("…")&&!value.content.includes("…"));
 ok(/^广东油价(?:·(?:预计)?\d{2}\/\d{2}|·暂缓|·待公布)?(?:·(?:旧价|缓存|参考))?$/.test(value.title));
 ok(/^(?:92·\d+\.\d{2}-95·\d+\.\d{2}|暂无数据·待更新)$/.test(value.content));
 return {value,kv,calls,requests};
}
const now=at("2026-11-27T19:15:00+08:00");
const base=clone(published);
const current=base.records[0];
const prev=base.records[1];
let r=await execute(now,base);eq(r.calls,1);
eq(r.value.title,"广东油价·12/10");
eq(r.value.content,"92·"+current.p92.toFixed(2)+"-95·"+current.p95.toFixed(2));
eq(r.value.backgroundColor,"#1E7E44");
ok(r.kv.has(key));
let cache=r.kv;
r=await execute(now+60000,"offline",cache,0);
eq(r.value.title,"广东油价·12/10·缓存");
eq(r.value.backgroundColor,"#8E8E93");
r=await execute(now,"bad json",new Map());
eq(r.value.title,"广东油价");
eq(r.value.content,"暂无数据·待更新");
r=await execute(now,{...base,schema:99},cache);
ok(r.value.title.endsWith("·缓存"));
let bad=clone(base);bad.records[0].p95=999;
r=await execute(now,bad,new Map());
eq(r.value.content,"暂无数据·待更新");
bad=clone(base);bad.records[0].date="2027-01-01";
r=await execute(now,bad,new Map());
eq(r.value.content,"暂无数据·待更新");
bad=clone(base);bad.records.push(clone(bad.records[0]));
r=await execute(now,bad,new Map());
eq(r.value.content,"暂无数据·待更新");
bad=clone(base);bad.records[0].p98=null;
r=await execute(now,bad,new Map());
eq(r.value.content,"92·"+current.p92.toFixed(2)+"-95·"+current.p95.toFixed(2));
bad=clone(base);bad.records.forEach(x=>{x.p98=null;x.p98Date=null;x.p98Source=null});
r=await execute(now,bad,new Map());
eq(r.value.content,"92·"+current.p92.toFixed(2)+"-95·"+current.p95.toFixed(2));
r=await execute(at("2026-12-10T23:59:59+08:00"),base,new Map());
eq(r.value.title,"广东油价·12/10");
r=await execute(at("2026-12-11T00:00:01+08:00"),base,new Map());
eq(r.value.title,"广东油价·12/24·旧价");
eq(r.value.content,"92·"+current.p92.toFixed(2)+"-95·"+current.p95.toFixed(2));
const updated=clone(base);
updated.records.unshift({...current,date:"2026-12-11",p92:8.20,p95:8.88,p98:10.89,p98Date:"2026-12-11"});
updated.nextWindow="2026-12-24";
updated.calendarNotice={date:"2026-12-10",kind:"cycle",url:"https://www.ndrc.gov.cn/xwdt/xwfb/202612/t20261210_123456.html"};
r=await execute(at("2026-12-11T01:00:00+08:00"),updated,cache);
eq(r.value.title,"广东油价·12/24");
eq(r.value.content,"92·8.20-95·8.88");
eq(r.value.backgroundColor,"#C0392B");
r=await execute(at("2026-12-11T02:00:00+08:00"),base,cache);
eq(r.value.title,"广东油价·12/24·缓存");
eq(r.value.content,"92·8.20-95·8.88");
const nextYear=clone(updated);
nextYear.records.unshift({...updated.records[0],date:"2026-12-25",p98Date:"2026-12-25"});
nextYear.calendarNotice={date:"2026-12-24",kind:"cycle",url:"https://www.ndrc.gov.cn/xwdt/xwfb/202612/t20261224_123456.html"};
r=await execute(at("2026-12-25T08:00:00+08:00"),nextYear);
eq(r.value.title,"广东油价·预计01/08");
const paused=clone(base);
paused.calendarNotice={date:"2026-11-27",kind:"pause",url:"https://www.ndrc.gov.cn/xwdt/xwfb/202611/t20261127_123456.html"};
r=await execute(now,paused);
eq(r.value.title,"广东油价·暂缓");
const provisional=clone(base);provisional.records[0].rank=1;
r=await execute(now,provisional);
ok(r.value.title.endsWith("·参考"));
eq(r.value.backgroundColor,"#8E8E93");
r=await execute(now,base,new Map(),503);
eq(r.value.content,"暂无数据·待更新");
r=await execute(now,"x".repeat(200001),new Map());
eq(r.value.content,"暂无数据·待更新");

r=await execute(now,"offline",new Map(),0,base,200);
eq(r.calls,2);eq(r.value.title,"广东油价·12/10");eq(r.value.content,"92·8.04-95·8.71");
r=await execute(at("2026-12-11T01:00:00+08:00"),base,new Map(),200,updated,200);
eq(r.calls,2);eq(r.value.title,"广东油价·12/24");eq(r.value.content,"92·8.20-95·8.88");
function encodeBase64(text){
 const bytes=encodeURIComponent(text).replace(/%([0-9A-F]{2})/g,(_,h)=>String.fromCharCode(parseInt(h,16)));
 const alphabet="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
 let out="";
 for(let i=0;i<bytes.length;i+=3){
  const a=bytes.charCodeAt(i),b=bytes.charCodeAt(i+1)||0,c=bytes.charCodeAt(i+2)||0;
  out+=alphabet[a>>2]+alphabet[(a&3)<<4|b>>4]+(i+1<bytes.length?alphabet[(b&15)<<2|c>>6]:"=")+(i+2<bytes.length?alphabet[c&63]:"=");
 }
 return out;
}
const envelope={type:"file",encoding:"base64",path:"Egern/Widget/OilPriceGD/prices.json",content:encodeBase64(JSON.stringify(base))};
r=await execute(now,"offline",new Map(),0,envelope,200);eq(r.value.title,"广东油价·12/10");eq(r.calls,2);
r=await execute(now,"offline",new Map(),0,{...envelope,path:"other.json"},200);eq(r.value.content,"暂无数据·待更新");
r=await execute(now,"offline",new Map(),0,null,429,{"Retry-After":"7200"});eq(r.calls,2);eq(Number(r.kv.get(key+".backupRetryAt")),now+7200000);
r=await execute(now+60000,"offline",r.kv,0,base,200);eq(r.calls,1);eq(r.value.content,"暂无数据·待更新");
r=await execute(now+3*3600000,"offline",r.kv,0,base,200);eq(r.calls,2);eq(r.value.title,"广东油价·12/10");
console.log("Stash OilPriceGD: "+checks+" assertions passed");
