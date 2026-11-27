import {readFile} from "node:fs/promises";
import assert from "node:assert/strict";
const dir=new URL("../Egern/Widget/OilPriceGD/",import.meta.url);
const code=await readFile(new URL("OilPriceGD.js",dir),"utf8");
const api=await import("data:text/javascript;base64,"+Buffer.from(code+"\nexport {collectSnapshot,normalize,state,bj,viewData,official,parseQQ,parseSou,parseBear,mergeSnapshots,SEED,SRC,oilData};").toString("base64"));
const {SEED,SRC}=api, now=Date.parse("2026-11-27T08:30:00+08:00");
const fixture={
  "govList": "<a href='./content/post_4985529.html' title='2026年11月26日24时起成品油价格调整'>2026年11月26日24时起成品油价格调整</a>",
  "gov": "<h2>广东省汽、柴油最高销售价格表</h2><p>（自2026年11月26日24时起执行）</p><table><tr><td>92号汽油（Ⅵ）</td><td>10332</td><td>10632</td><td>8.04</td></tr><tr><td>95号汽油（Ⅵ）</td><td>10934</td><td>11234</td><td>8.71</td></tr></table>",
  "mirror": "<h2>广东省汽、柴油最高销售价格表</h2><p>（自2026年11月26日24时起执行）</p><table><tr><td>92号汽油（Ⅵ）</td><td>10332</td><td>10632</td><td>8.04</td></tr><tr><td>95号汽油（Ⅵ）</td><td>10934</td><td>11234</td><td>8.71</td></tr></table>",
  "national": "<a href='./202611/t20261126_1409082.html'>2026年11月26日国内成品油价格调整</a><a href='./202611/t20261112_1408795.html'>2026年11月12日国内成品油价格调整</a>",
  "qq": "<h1>广东最新油价</h1><p>2026年11月12日起执行（展示日 2026年11月27日），广东最新油价如下：92号汽油为8.39元，95号汽油为9.09元，98号汽油为11.09元。</p>",
  "sou": "<p>数据更新于 2026-11-27（星期五）</p><table><tr><th>省份</th><th>89汽油</th><th>92汽油</th><th>95汽油</th><th>98汽油</th><th>0柴油</th></tr><tr><td>广东</td><td>7.46</td><td>8.04</td><td>8.71</td><td>10.71</td><td>7.69</td></tr></table><p>距下次调整还有 14 天（12月11日 周五）</p>",
  "bear": "<h1>广东省油价</h1><p>上次调价：11-27 还有14天 下次调价：12-11</p><table><tr><td>广东省</td><td>8.04</td><td>8.71</td><td>7.69</td></tr></table>"
};
const routes={[SRC.gov]:fixture.govList,"https://drc.gd.gov.cn/ywgg/content/post_4985529.html":fixture.gov,[SRC.mirror]:fixture.mirror,[SRC.national]:fixture.national,[SRC.qq]:fixture.qq,[SRC.sou]:fixture.sou,[SRC.bear]:fixture.bear};
const get=map=>async url=>{if(!(url in map))throw Error("offline");return map[url]};
let r=await api.collectSnapshot(get(routes),SEED,now);
assert.equal(r.diagnostics.government,true);
assert.equal(r.snapshot.records[0].p92,8.04);
assert.equal(r.snapshot.records[0].rank,3);
assert.equal(api.parseQQ(fixture.qq,api.bj(now)).date,"2026-11-13");
assert.equal(api.parseSou(fixture.sou,api.bj(now)).p98,10.71);
assert.equal(api.viewData(r.snapshot,now,true).current.p95.delta,-0.38);
assert.equal(api.viewData(SEED,now,false).status,"缓存");
const later=Date.parse("2026-12-11T00:01:00+08:00");
assert.equal(api.state(SEED,"2026-12-11").stale,true);
const future=fixture.gov.replace("11月26","12月10").replace("8.04","8.20").replace("8.71","8.88");
assert.equal(api.official(future,SRC.mirror,2,"2026-12-10"),null);
assert.equal(api.official(fixture.gov.replace("广东省","北京市"),SRC.mirror,2,"2026-11-27"),null);
r=await api.collectSnapshot(get({[SRC.mirror]:future}),SEED,later);
assert.equal(api.viewData(r.snapshot,later,true).current.p98.oldDate,"2026-11-27");
assert.equal(api.mergeSnapshots(r.snapshot,SEED,api.bj(later)).records[0].date,"2026-12-11");
r=await api.collectSnapshot(get({[SRC.national]:"<a href='./202612/t20261210_1500000.html'>2026年12月10日国内成品油价格不作调整</a>"+fixture.national}),SEED,later);
assert.equal(api.viewData(r.snapshot,later,true).current.p92.delta,0);
assert.equal(api.viewData(r.snapshot,later,true).stale,false);
assert.equal(api.viewData(SEED,Date.parse("2027-01-08T00:00:00+08:00"),false).next,null);
assert.equal(api.normalize({...SEED,region:"BJ"},api.bj(now)),null);
const kv=new Map(), calls=[];
const mock=(family,online)=>({widgetFamily:family,storage:{getJSON:k=>JSON.parse(kv.get(k)||"null"),setJSON:(k,v)=>kv.set(k,JSON.stringify(v)),get:k=>kv.get(k),set:(k,v)=>kv.set(k,v)},http:{get:async url=>{calls.push(url);if(online&&url.startsWith(SRC.json))return {status:200,text:async()=>JSON.stringify(SEED)};throw Error("offline")}}});
for(const family of ["systemSmall","systemMedium","systemLarge"]){
  calls.length=0;
  const data=await api.oilData(mock(family,true),now);
  assert.equal(data.current.p92.price,8.04);assert.equal(calls.length,1);
}
const offline=await api.oilData(mock("systemMedium",false),now);
assert.equal(offline.status,"缓存");assert.equal(offline.current.p95.price,8.71);
for(const family of ["systemSmall","systemMedium","systemLarge"]){
  const widget=await api.default(mock(family,false));
  assert.equal(widget.type,"widget");assert.ok(Array.isArray(widget.children));
  assert.ok(Number.isFinite(Date.parse(widget.refreshAfter)));
}
console.log("Oil price parser, cache, cycle, rollover and three widget family tests passed");
