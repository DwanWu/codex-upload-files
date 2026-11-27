import {readFile} from "node:fs/promises";
import assert from "node:assert/strict";
const dir=new URL("../Egern/Widget/DailyOilPrice/",import.meta.url);
const code=await readFile(new URL("DailyOilPrice.js",dir),"utf8");
const api=await import("data:text/javascript;base64,"+Buffer.from(code+"\nexport {collectSnapshot,normalize,state,bj,viewData,official,parseQQ,parseSou,parseBear,mergeSnapshots,SEED,SRC,oilData,render,workingDay,rollWindow,calendarState,windowEnd,countdownText,parseHolidayNotice,holidaySearchURL,holidayLinks,refreshHolidayYears,publicationDecision,cleanHint,announcements};").toString("base64"));
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
assert.equal(api.viewData(SEED,Date.parse("2027-01-08T00:00:00+08:00"),false).next,"2027-01-08");
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
  const widget=await api.render(mock(family,false),now);
  assert.equal(widget.type,"widget");assert.ok(Array.isArray(widget.children));assert.ok(JSON.stringify(widget).includes('"text":"每日油价"'));assert.ok(!JSON.stringify(widget).includes('"text":"广东油价"'));
  assert.ok(Number.isFinite(Date.parse(widget.refreshAfter)));
}



const at=d=>Date.parse(d+"+08:00");
const base=(date="2026-12-25",extra={})=>({...SEED,records:[{...SEED.records[0],date,p98:null,p98Date:null,p98Source:null,rank:3},...SEED.records],nextWindow:null,pendingCycle:null,...extra});
const nlink=(date,label="国内成品油价格调整")=>{
  const [y,m,d]=date.split("-");
  return "<a href='./"+y+m+"/t"+y+m+d+"_1500000.html'>"+y+"年"+Number(m)+"月"+Number(d)+"日"+label+"</a>";
};
const souHTML=(date,day,month=1)=>"<p>数据更新于 "+date+"</p>89汽油 92汽油 95汽油 98汽油 广东 7.46 8.04 8.71 10.71 7.69 距下次调整还有 13 天（"+month+"月"+day+"日）";
const bearHTML=(date,next,last="1-1")=>"<h1>广东省油价</h1>"+date.replace("-","年").replace("-","月")+"日 上次调价："+last+" 下次调价："+next+" 广东省 8.04 8.71 7.69";
for(const d of ["2027-01-01","2027-02-05","2027-02-13","2027-04-05","2027-05-03","2027-06-09","2027-09-15","2027-10-07"])assert.equal(api.workingDay(d),false,d);
for(const d of ["2027-01-31","2027-02-14","2027-05-08","2027-09-26","2027-10-09"])assert.equal(api.workingDay(d),true,d);
for(const [a,b] of [["2026-12-24","2027-01-08"],["2027-01-08","2027-01-22"],["2027-01-22","2027-02-04"],["2027-02-04","2027-02-25"],["2027-09-24","2027-10-13"],["2027-04-23","2027-05-11"]])assert.equal(api.rollWindow(a),b,a);
assert.equal(api.workingDay("2028-01-03"),null);
assert.equal(api.rollWindow("2027-12-31"),null);
for(const [day,date] of [["2026-12-24","2026-12-24"],["2026-12-25","2027-01-08"],["2026-12-31","2027-01-08"],["2027-01-01","2027-01-08"],["2027-01-08","2027-01-08"],["2027-01-09",null]])assert.equal(api.state(SEED,day).next,date,day);
assert.equal(api.state(base(),"2027-01-08").nextKind,"estimated");
assert.equal(api.state(base(),"2027-01-09").stale,true);
assert.equal(api.state(base("2027-01-09"),"2027-01-09").next,"2027-01-22");
// Official cycle on a different date, no premature price replacement.
let x=await api.collectSnapshot(get({[SRC.national]:nlink("2027-01-07")}),base(),at("2027-01-07T18:00:00"));
assert.equal(x.snapshot.records[0].date,"2026-12-25");
assert.equal(x.snapshot.calendarNotice.date,"2027-01-07");
assert.equal(api.state(x.snapshot,"2027-01-07").next,"2027-01-07");
assert.equal(api.state(x.snapshot,"2027-01-07").nextKind,"official");
assert.equal(api.state(x.snapshot,"2027-01-08").stale,true);
assert.equal(api.state(x.snapshot,"2027-01-08").next,"2027-01-21");
assert.equal(api.publicationDecision(base(),x,"2027-01-07").publish,true);
assert.equal(api.publicationDecision(base(),{...x,diagnostics:{...x.diagnostics,stale:true}},"2027-01-07").calendarOnly,true);
// A pause is retained offline; only a newer confirmed cycle resumes the countdown.
let paused=await api.collectSnapshot(get({[SRC.national]:nlink("2027-01-07","国内成品油价格暂缓调整")}),base(),at("2027-01-07T18:00:00"));
assert.equal(paused.snapshot.calendarNotice.kind,"pause");
assert.equal(api.state(paused.snapshot,"2027-01-07").nextKind,"paused");
assert.equal(api.state(paused.snapshot,"2027-01-08").next,null);
assert.equal(api.state(paused.snapshot,"2027-02-01").stale,false);
assert.equal(api.state(api.mergeSnapshots(paused.snapshot,x.snapshot,"2027-01-08"),"2027-01-08").nextKind,"paused");
const offlinePause=await api.collectSnapshot(get({}),paused.snapshot,at("2027-01-08T10:00:00"));
assert.equal(offlinePause.snapshot.nextWindow,null);
const resumed=await api.collectSnapshot(get({[SRC.national]:nlink("2027-01-11")}),paused.snapshot,at("2027-01-11T18:00:00"));
assert.equal(resumed.snapshot.calendarNotice.kind,"cycle");
assert.equal(resumed.snapshot.nextWindow,"2027-01-11");
assert.equal(api.state(resumed.snapshot,"2027-01-12").next,"2027-01-25");
// Cached future dates cannot override validated rule-derived dates.
const old=base("2026-12-25",{nextWindow:"2027-01-29"});
x=await api.collectSnapshot(get({}),old,at("2027-01-01T10:00:00"));
assert.equal(x.snapshot.nextWindow,"2027-01-08");
assert.equal(x.snapshot.records[0].p92,8.04);
assert.equal(api.mergeSnapshots(old,x.snapshot,"2027-01-01").nextWindow,"2027-01-08");
assert.equal(api.normalize({...old,nextWindow:"invalid"},"2027-01-01").records[0].date,"2026-12-25");
const sou=souHTML("2027-01-01",12),bear=bearHTML("2027-01-01","1-12","12-25");
x=await api.collectSnapshot(get({[SRC.sou]:sou,[SRC.bear]:bear}),old,at("2027-01-01T10:00:00"));
assert.equal(x.snapshot.nextWindow,"2027-01-08");
assert.equal(x.diagnostics.calendarConflict,true);
assert.equal(api.parseBear(bear,"2027-01-04").next,null);
assert.equal(api.parseSou(sou,"2027-01-04").next,undefined);
assert.equal(api.parseBear(bear.replace("2027年01月01日",""),"2027-01-01").next,null);
// Synthetic 2028 fixtures are solely tests, not a published 2028 schedule.
const laterBase=base("2028-01-01");
const s28=souHTML("2028-01-02",15),b28=bearHTML("2028-01-02","1-15");
const one=await api.collectSnapshot(get({[SRC.sou]:s28}),laterBase,at("2028-01-02T10:00:00"));
assert.equal(one.snapshot.nextWindow,null);
const two=await api.collectSnapshot(get({[SRC.sou]:s28,[SRC.bear]:b28}),laterBase,at("2028-01-02T10:00:00"));
assert.equal(two.snapshot.nextWindow,"2028-01-14");
assert.equal(api.state(two.snapshot,"2028-01-03").nextKind,"corroborated");
assert.equal(api.state(two.snapshot,"2028-01-15").next,null);
assert.equal(api.state(two.snapshot,"2028-01-15").stale,true);
const conflict=await api.collectSnapshot(get({[SRC.sou]:s28,[SRC.bear]:b28.replace("下次调价：1-15","下次调价：1-16")}),two.snapshot,at("2028-01-02T11:00:00"));
assert.equal(conflict.snapshot.nextWindow,null);
assert.equal(api.mergeSnapshots(conflict.snapshot,two.snapshot,"2028-01-02").nextWindow,null);
const cachedHint=await api.collectSnapshot(get({}),two.snapshot,at("2028-01-04T10:00:00"));
assert.equal(cachedHint.snapshot.nextWindow,"2028-01-14");
assert.equal(api.cleanHint({date:"2028-02-29",anchor:"2027-12-31",checkedAt:at("2028-01-02T10:00:00")},"2028-01-02"),null);
// Official holiday notice parser: known 2027 notice and a synthetic future-year discovery.
const doc27="<h1>国务院办公厅关于2027年部分节假日安排的通知</h1>国办发明电〔2026〕10号 一、元旦：1月1日（周五）至3日（周日）放假，共3天。二、春节：2月5日至13日放假调休，共9天。1月31日、2月14日上班。三、清明节：4月3日至5日放假，共3天。四、劳动节：5月1日至5日放假调休，共5天。5月8日上班。五、端午节：6月9日放假，共1天。六、中秋节：9月15日放假，共1天。七、国庆节：10月1日至7日放假调休，共7天。9月26日、10月9日上班。";
const gov27="https://www.gov.cn/zhengce/content/202611/content_7085101.htm";
const h27=api.parseHolidayNotice(doc27,2027,gov27);
assert.ok(h27);
assert.equal(h27.off.length,7);
assert.equal(h27.work.length,5);
assert.equal(h27.off[1][0],"2027-02-05");
assert.equal(api.parseHolidayNotice(doc27.replace("共9天","共8天"),2027,gov27),null);
assert.equal(api.parseHolidayNotice(doc27,2027,"https://example.com/holiday.htm"),null);
assert.equal(api.parseHolidayNotice(doc27.replace("七、国庆节","其他"),2027,gov27),null);
const doc28=doc27.replace("2027年","2028年").replace("〔2026〕","〔2027〕").replace("1月1日（周五）至3日（周日）","12月31日至1月2日");
const gov28="https://www.gov.cn/zhengce/content/202711/content_9999999.htm";
const h28=api.parseHolidayNotice(doc28,2028,gov28);
assert.ok(h28);
assert.equal(h28.off[0][0],"2027-12-31");
assert.equal(h28.off[0][1],"2028-01-02");
const search28=JSON.stringify({searchVO:{catMap:{gongwen:{listVO:[{title:"国务院办公厅关于<em>2028</em>年部分节假日安排的通知",piclinksurl:gov28},{title:"国务院办公厅关于2028年部分节假日安排的通知",piclinksurl:"https://example.com/fake.htm"}]}}}});
assert.equal(api.holidayLinks(search28,2028).length,1);
const discovered=await api.refreshHolidayYears(get({[api.holidaySearchURL(2028)]:search28,[gov28]:doc28}),{},"2027-11-01");
assert.ok(discovered["2028"]);
assert.equal(api.workingDay("2027-12-31",discovered),false);
assert.equal(api.workingDay("2028-01-01",discovered),false);
assert.equal(api.workingDay("2028-01-04",discovered),true);
assert.equal(JSON.stringify(await api.refreshHolidayYears(get({}),discovered,"2027-11-02")),JSON.stringify(discovered));
assert.equal(Object.keys(await api.refreshHolidayYears(get({}),{},"2027-11-02")).length,0);
const metadataOnly=await api.collectSnapshot(get({}),base("2027-10-16",{holidayYears:discovered}),at("2027-11-01T10:00:00"));
assert.equal(api.publicationDecision(base("2027-10-16"),metadataOnly,"2027-11-01").calendarOnly,true);
assert.equal(api.publicationDecision(old,x,"2027-01-01").publish,true);
assert.equal(api.publicationDecision(old,{snapshot:old,diagnostics:{}}, "2027-01-01").publish,false);
// Midnight and time-zone boundaries.
assert.equal(api.windowEnd("2027-01-08"),Date.parse("2027-01-09T00:00:00+08:00"));
assert.equal(api.countdownText("2026-12-10",at("2026-11-27T15:11:00")),"13d8h");
assert.equal(api.countdownText("2027-01-08",at("2027-01-08T23:59:00")),"0h1m");
assert.equal(api.countdownText("2027-01-08",at("2027-01-08T23:59:59")),"不足1m");
assert.equal(api.countdownText("2027-01-08",at("2027-01-09T00:00:00")),"");
assert.equal(api.bj(Date.parse("2027-01-08T16:00:00Z")),"2027-01-09");
assert.equal(api.bj(Date.parse("2027-01-09T01:00:00+09:00")),"2027-01-09");
const qq="<h1>广东最新油价</h1>2027年1月8日起执行 92号汽油为8.04元 95号汽油为8.71元 98号汽油为10.71元";
assert.equal(api.parseQQ(qq,"2027-01-09",["2027-01-09"]).date,"2027-01-09");
assert.equal(api.parseQQ(qq.replace("1月8日","1月9日"),"2027-01-09",["2027-01-09"]).date,"2027-01-09");
assert.equal(api.normalize({...base(),calendarNotice:{date:"2027-02-29",kind:"cycle",url:gov28}},"2027-03-01").calendarNotice,null);
assert.equal(api.normalize({...base(),calendarNotice:{date:"2027-01-10",kind:"cycle",url:"https://www.ndrc.gov.cn/xwdt/xwfb/202701/t20270110_123.html"}},"2027-01-01").calendarNotice,null);
for(const widgetFamily of ["systemSmall","systemMedium","systemLarge"]){
  const ctx={widgetFamily,storage:{getJSON:()=>base(),setJSON:()=>{},get:()=>null,set:()=>{}},http:{get:async()=>{throw Error("offline")}}};
  const w=await api.render(ctx,at("2027-01-01T10:00:00")),serialized=JSON.stringify(w);
  assert.equal(w.type,"widget");assert.ok(serialized.includes("预计: 01.08 24:00"));
  assert.ok(serialized.includes("98号"));assert.ok(serialized.includes("8.04"));
  const near=await api.render(ctx,at("2027-01-08T23:59:00"));
  assert.equal(near.refreshAfter,new Date(at("2027-01-09T00:00:00")).toISOString());
}
console.log("Oil price: regression, calendar, official pauses, source failures, holiday discovery, timezone and three widget families passed");
