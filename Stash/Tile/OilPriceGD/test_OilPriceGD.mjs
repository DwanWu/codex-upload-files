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
async function execute(now,input,kv=new Map(),status=200){
 let calls=0,done=0,requests=[];
 const payload=typeof input==="string"?input:JSON.stringify(input);
 const value=await new Promise(resolve=>{
   class TestDate extends Date{static now(){return now}}
   vm.runInNewContext(source,{
     Date:TestDate,
     $persistentStore:{read:k=>kv.get(k)||null,write:(v,k)=>{kv.set(k,v);return true}},
     $httpClient:{get:(req,cb)=>{calls++;requests.push(req);cb(status===0?"offline":null,{status},payload)}},
     $done:v=>{done++;resolve(v)}
   });
 });
 eq(calls,1);eq(done,1);
 ok(requests[0].url.startsWith(url));
 eq(requests[0].insecure,false);
 eq(requests[0].timeout,7);
 eq(value.icon,"fuelpump.fill");
 ok(!value.title.includes("\n")&&!value.content.includes("\n"));
 ok(!value.title.includes("…")&&!value.content.includes("…"));
 return {value,kv};
}
const now=at("2026-11-27T19:15:00+08:00");
const base=clone(published);
const current=base.records[0];
const prev=base.records[1];
let r=await execute(now,base);
eq(r.value.title,"广东油价·95号"+current.p95.toFixed(2)+"元/L");
eq(r.value.content,"92号"+current.p92.toFixed(2)+"·98号"+current.p98.toFixed(2)+"·12/10调");
eq(r.value.backgroundColor,"#1E7E44");
ok(r.kv.has(key));
let cache=r.kv;
r=await execute(now+60000,"offline",cache,0);
ok(r.value.title.endsWith("·缓存"));
eq(r.value.backgroundColor,"#8E8E93");
r=await execute(now,"bad json",new Map());
eq(r.value.title,"广东油价·95号--");
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
ok(r.value.content.includes("98号"+prev.p98.toFixed(2)+"旧"));
bad=clone(base);bad.records.forEach(x=>{x.p98=null;x.p98Date=null;x.p98Source=null});
r=await execute(now,bad,new Map());
ok(r.value.content.includes("98号--"));
r=await execute(at("2026-12-10T23:59:59+08:00"),base,new Map());
ok(r.value.content.endsWith("12/10调"));
r=await execute(at("2026-12-11T00:00:01+08:00"),base,new Map());
ok(r.value.title.endsWith("·旧价"));
ok(r.value.content.endsWith("待更新"));
const updated=clone(base);
updated.records.unshift({...current,date:"2026-12-11",p92:8.20,p95:8.88,p98:10.89,p98Date:"2026-12-11"});
updated.nextWindow="2026-12-24";
updated.calendarNotice={date:"2026-12-10",kind:"cycle",url:"https://www.ndrc.gov.cn/xwdt/xwfb/202612/t20261210_123456.html"};
r=await execute(at("2026-12-11T01:00:00+08:00"),updated,cache);
eq(r.value.title,"广东油价·95号8.88元/L");
eq(r.value.content,"92号8.20·98号10.89·12/24调");
eq(r.value.backgroundColor,"#C0392B");
r=await execute(at("2026-12-11T02:00:00+08:00"),base,cache);
eq(r.value.title,"广东油价·95号8.88元/L·缓存");
ok(r.value.content.includes("98号10.89"));
const nextYear=clone(updated);
nextYear.records.unshift({...updated.records[0],date:"2026-12-25",p98Date:"2026-12-25"});
nextYear.calendarNotice={date:"2026-12-24",kind:"cycle",url:"https://www.ndrc.gov.cn/xwdt/xwfb/202612/t20261224_123456.html"};
r=await execute(at("2026-12-25T08:00:00+08:00"),nextYear);
ok(r.value.content.endsWith("预计01/08调"));
const paused=clone(base);
paused.calendarNotice={date:"2026-11-27",kind:"pause",url:"https://www.ndrc.gov.cn/xwdt/xwfb/202611/t20261127_123456.html"};
r=await execute(now,paused);
ok(r.value.content.endsWith("暂缓调价"));
const provisional=clone(base);provisional.records[0].rank=1;
r=await execute(now,provisional);
ok(r.value.title.endsWith("·参考"));
eq(r.value.backgroundColor,"#8E8E93");
r=await execute(now,base,new Map(),503);
eq(r.value.content,"暂无数据·待更新");
r=await execute(now,"x".repeat(200001),new Map());
eq(r.value.content,"暂无数据·待更新");
console.log("Stash OilPriceGD: "+checks+" assertions passed");
