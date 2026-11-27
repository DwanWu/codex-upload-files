import {readFile} from "node:fs/promises";
import assert from "node:assert/strict";
import vm from "node:vm";
const source=await readFile(new URL("./NodeVitals.js",import.meta.url),"utf8");
let checks=0;
const eq=(a,b)=>{checks++;assert.equal(a,b)};
const ok=x=>{checks++;assert.ok(x)};
const PURE="https://my.ippure.com/v1/info",IPIFY="https://api64.ipify.org?format=json",Q="https://api.ipquery.io/";
const ip="8.8.4.4",ip2="1.1.1.1";
const p=(score,extra={})=>({ip,countryCode:"JP",fraudScore:score,isResidential:true,...extra});
const q=(score,extra={},address=ip)=>({ip:address,location:{country_code:"JP"},risk:{risk_score:score,is_datacenter:false,is_vpn:false,is_proxy:false,is_tor:false,...extra}});
const reply=x=>({body:JSON.stringify(x),status:200});
async function execute(routes,arg='{"policy":"节点选择"}'){
 const calls=[];let count=0;let resolve;
 const done=new Promise(r=>resolve=r);
 vm.runInNewContext(source,{$argument:arg,$httpClient:{get(req,cb){calls.push(req);const r=routes(req.url);if(!r)throw Error("unexpected request");cb(r.error||null,{status:r.status||200},r.body)}},$done(value){count++;resolve(value)}});
 const value=await done;
 eq(count,1);
 for(const req of calls){
  eq(req.headers["X-Stash-Selected-Proxy"],encodeURIComponent("节点选择"));
  eq(req.insecure,false);eq(req.timeout,5);eq(req["auto-cookie"],false);
 }
 return {value,calls};
}
const normal=(a,b)=>u=>u===PURE?reply(a):u===Q+encodeURIComponent(a.ip)+"?format=json"?reply(b):undefined;
let r=await execute(normal(p(12),q(90)));
eq(r.value.title,"节点体检 · 日本");ok(r.value.content.includes("纯度 88 · 住宅 · 风险 低"));eq(r.value.backgroundColor,"#DB2777");eq(r.calls.length,2);
r=await execute(normal(p(0),q(8)));ok(r.value.content.includes("纯度 100"));eq(r.value.backgroundColor,"#1E7E44");
r=await execute(normal(p("0"),q(8)));ok(r.value.content.includes("纯度 100"));
for(const v of [null,undefined,"",false,"bad",-1,101]){
 r=await execute(normal(p(v),q(37)));ok(r.value.content.includes("纯度 63"));
}
r=await execute(normal(p(null),q(null)));ok(r.value.content.includes("纯度 --"));
r=await execute(normal(p(75,{isResidential:false}),q(5,{is_datacenter:true})));ok(r.value.content.includes("纯度 25 · 机房 · 风险 高"));eq(r.value.backgroundColor,"#C0392B");
r=await execute(normal(p(10),q(0,{is_vpn:true,is_proxy:true})));ok(r.value.content.includes("风险 高"));
r=await execute(normal(p(10),q(0,{is_vpn:true})));ok(r.value.content.includes("风险 中"));
r=await execute(normal(p(10),q(0,{is_tor:true})));ok(r.value.content.includes("风险 高"));
r=await execute(normal(p(5),q(1,{is_datacenter:true})));ok(r.value.content.includes("机房"));eq(r.value.backgroundColor,"#C0392B");
r=await execute(normal(p(null,{isResidential:undefined}),q(0,{is_datacenter:false})));ok(r.value.content.includes("纯度 100 · 非机房"));
r=await execute(u=>u===PURE?reply(p(12)):u.startsWith(Q)?reply(q(100,{},ip2)):undefined);ok(r.value.content.includes("纯度 88"));ok(!r.value.content.includes("纯度 0"));
r=await execute(u=>u===PURE?reply(p(null,{isResidential:undefined})):u.startsWith(Q)?reply(q(0,{},ip2)):undefined);ok(r.value.content.includes("纯度 -- · 未知 · 风险 未知"));
r=await execute(u=>u===PURE?{status:503,body:"{}"}:u===IPIFY?reply({ip:ip2}):u===Q+ip2+"?format=json"?reply(q(40,{is_datacenter:true},ip2)):undefined);
ok(r.value.content.includes("纯度 60 · 机房 · 风险 中"));ok(r.value.content.includes(ip2));eq(r.calls.length,3);
r=await execute(u=>u===PURE?reply(p(0,{ip:"bad"})):u===IPIFY?reply({ip:ip2}):u===Q+ip2+"?format=json"?reply(q(50,{},ip2)):undefined);ok(r.value.content.includes("纯度 50"));
r=await execute(u=>u===PURE?{status:500,body:"{}"}:u===IPIFY?{status:500,body:"{}"}:undefined);ok(r.value.content.includes("纯度 -- · 未知 · 风险 未知"));ok(r.value.content.includes("获取失败"));eq(r.calls.length,2);
r=await execute(u=>u===PURE?reply(p(20)):u.startsWith(Q)?{error:"offline"}:undefined);ok(r.value.content.includes("纯度 80"));
r=await execute(u=>u===PURE?{body:"not JSON",status:200}:u===IPIFY?reply({ip:"999.1.2.3"}):undefined);ok(r.value.content.includes("获取失败"));
r=await execute(normal(p(14,{ip:"2001:4860::8888"}),q(5,{},"2001:4860:0:0:0:0:0:8888")));ok(r.value.content.includes("纯度 86"));ok(r.value.content.includes("2001:4860::8888"));
r=await execute(normal(p(null,{ip:"2001:4860::8888",isResidential:undefined}),q(22,{},"2001:4860:0:0:0:0:0:8888")));ok(r.value.content.includes("纯度 78"));
r=await execute(()=>undefined,"{}");eq(r.calls.length,0);eq(r.value.content,"请配置检测策略组");
r=await execute(()=>undefined,"not JSON");eq(r.calls.length,0);
console.log("Stash NodeVitals: "+checks+" assertions passed");
