import {readFileSync} from "node:fs";
import assert from "node:assert/strict";
import vm from "node:vm";
const source=readFileSync(new URL("HuangliQuery.js",import.meta.url),"utf8");
const override=readFileSync(new URL("HuangliQuery.stoverride",import.meta.url),"utf8");
assert.equal(override.split("    payload: |\n")[1].split("\n").slice(0,-1).map(l=>l.slice(6)).join("\n")+"\n",source);
let checks=1;
const eq=(a,b)=>{checks++;assert.equal(a,b)};
const ok=v=>{checks++;assert.ok(v)};
const key="stash.huangli.v2.month";
const T=Date.parse("2026-11-27T19:00:00+08:00"),D=86400000;
const p=(day,lDate,extra={})=>({year:"2026",month:"11",day:String(day),lMonth:"十",lDate,gzYear:"丙午",gzMonth:"己亥",gzDate:day===27?"乙巳":"丙午",animal:"马",suit:"打扫.破屋.祭祀.求医.治病.馀事勿取.坏垣",avoid:"结婚.安葬",...extra});
const q=(day,lDate,extra={})=>({title:"2026年 11月 (小) 星期五",day:String(day),lunar:"十月"+lDate,ganzhi:"丙午年 【马年】 己亥月 "+(day===27?"乙巳":"丙午")+"日",yi:["祭祀","解除"],ji:["嫁娶","安葬"],details:{"生肖":"马"},...extra});
const primary={Result:[{days:[p(27,"十九"),p(28,"二十")]}]},secondary=[q(27,"十九"),q(28,"二十")];
const response=body=>({status:200,body:JSON.stringify(body)});
const normal=u=>u.includes("/calendar_new/")?response(primary):response(secondary);
const offline=()=>({error:"offline"});
async function execute(now,routes,kv=new Map(),intl=Intl,times=null){
 const calls=[];let done=0,cursor=0;
 class TestDate extends Date{static now(){return times?times[Math.min(cursor++,times.length-1)]:now}}
 const value=await new Promise(resolve=>{
  vm.runInNewContext(source,{Date:TestDate,Intl:intl,$persistentStore:{read:k=>kv.get(k)||null,write:(v,k)=>{kv.set(k,v);return true}},
   $httpClient:{get(req,cb){
    calls.push(req);const r=routes(req.url)||{error:"offline"};
    cb(r.error||null,{status:r.status??0},r.body||"");
   }},$done:v=>{done++;resolve(v)}});
 });
 eq(done,1);eq(value.icon,"calendar");ok(value.title.startsWith("每日黄历·"));ok(value.content.split("\n").length===2);
 for(const req of calls){eq(req.timeout,7);eq(req.insecure,false);eq(req["auto-cookie"],false);eq(req["auto-redirect"],false);ok(/^https:\/\/raw\.githubusercontent\.com\//.test(req.url))}
 return {value,calls,kv};
}
let r=await execute(T,normal);
eq(r.value.title,"每日黄历·十月十九·乙巳日");
eq(r.value.content,"宜·打扫·破屋\n忌·结婚·安葬");eq(r.calls.length,2);
eq(r.value.backgroundColor,"#B7791F");ok(r.kv.has(key));
const cache=r.kv;
r=await execute(T+60000,offline,cache);eq(r.calls.length,0);eq(r.value.content,"宜·打扫·破屋\n忌·结婚·安葬");
r=await execute(Date.parse("2026-11-28T00:00:01+08:00"),offline,cache);eq(r.calls.length,0);eq(r.value.title,"每日黄历·十月二十·丙午日");
r=await execute(T+2*D,offline,cache);eq(r.calls.length,2);eq(r.value.content,"宜·暂无数据\n忌·暂无数据");
r=await execute(T+60000,offline,new Map());eq(r.calls.length,2);eq(r.value.title,"每日黄历·十月十九");eq(r.value.content,"宜·暂无数据\n忌·暂无数据");eq(r.value.backgroundColor,"#8E8E93");
r=await execute(T,offline,new Map(),undefined); // Node's Intl default.
eq(r.value.content,"宜·暂无数据\n忌·暂无数据");
r=await execute(T,offline,new Map(),null);eq(r.value.title,"每日黄历·11/27");eq(r.value.content,"宜·暂无数据\n忌·暂无数据");
r=await execute(T,u=>u.includes("/calendar_new/")?offline():response(secondary));
eq(r.value.title,"每日黄历·十月十九·乙巳日");eq(r.value.content,"宜·祭祀·解除\n忌·嫁娶·安葬");
r=await execute(T,u=>u.includes("/calendar_new/")?response(primary):offline());
eq(r.value.content,"宜·打扫·破屋\n忌·结婚·安葬");
r=await execute(T,u=>u.includes("/calendar_new/")?response({days:[p(27,"十八")]}):response(secondary));
eq(r.value.content,"宜·祭祀·解除\n忌·嫁娶·安葬");
r=await execute(T,u=>u.includes("/calendar_new/")?response(primary):response([q(27,"十九",{ganzhi:"丙午年 己亥月 丙午日"})]));
eq(r.value.title,"每日黄历·十月十九·乙巳日");eq(r.value.content,"宜·打扫·破屋\n忌·结婚·安葬");
r=await execute(T,u=>u.includes("/calendar_new/")?response({days:[p(26,"十八")]}):response([q(27,"十九",{title:"2025年 11月 星期四"})]));
eq(r.value.content,"宜·暂无数据\n忌·暂无数据");
r=await execute(Date.parse("2026-12-01T00:00:01+08:00"),offline,cache);
ok(r.calls.every(x=>x.url.includes("202612.json")||x.url.includes("2026-12.json")));eq(r.value.content,"宜·暂无数据\n忌·暂无数据");
r=await execute(T,()=>({status:200,body:"not JSON"}));eq(r.value.content,"宜·暂无数据\n忌·暂无数据");
r=await execute(T,u=>u.includes("/calendar_new/")?response({days:[p(27,"十九",{suit:"特别特别特别特别特别特别特别长的词.祭祀.治病.其他",avoid:"诸事不宜"})]}):offline());
eq(r.value.content,"宜·祭祀·治病\n忌·诸事不宜");
r=await execute(T,normal,new Map(),Intl,[Date.parse("2026-11-27T23:59:59+08:00"),Date.parse("2026-11-28T00:00:01+08:00")]);eq(r.value.title,"每日黄历·十月二十·丙午日");
r=await execute(T,normal,new Map(),null);eq(r.value.title,"每日黄历·十月十九·乙巳日");
console.log("Stash HuangliQuery: "+checks+" assertions passed");
