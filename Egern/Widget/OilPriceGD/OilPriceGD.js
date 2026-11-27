/** 广东油价 · 2026-11-27 v3 | GitHub JSON 优先、公告核验、北京时间、离线缓存、98号参考。 */
const DAY=86400000;
const CAL=["2026-01-06","2026-01-20","2026-02-03","2026-02-24","2026-03-09","2026-03-23","2026-04-07","2026-04-21","2026-05-08","2026-05-21","2026-06-04","2026-06-18","2026-07-03","2026-07-17","2026-07-31","2026-08-14","2026-08-28","2026-09-11","2026-09-24","2026-10-15","2026-10-29","2026-11-12","2026-11-26","2026-12-10","2026-12-24"];
const SRC={"gov":"https://drc.gd.gov.cn/ywgg/","mirror":"https://m.bendibao.com/show783326.html","national":"https://www.ndrc.gov.cn/xwdt/xwfb/","qq":"https://oil.qqday.com/province/440000.htm","sou":"https://www.soyoujia.cn/","bear":"https://www.xiaoxiongyouhao.com/fprice/proilprice.php?province=%E5%B9%BF%E4%B8%9C%E7%9C%81","json":"https://raw.githubusercontent.com/DwanWu/codex-upload-files/main/Egern/Widget/OilPriceGD/prices.json"};
const SEED={
  "schema": 3,
  "region": "GD",
  "records": [
    {
      "date": "2026-11-27",
      "p92": 8.04,
      "p95": 8.71,
      "p98": 10.71,
      "p98Date": "2026-11-27",
      "p98Source": "搜油价/萤炬参考",
      "rank": 2,
      "source": "广东省发展改革委公告转载",
      "url": "https://m.bendibao.com/show783326.html"
    },
    {
      "date": "2026-11-13",
      "p92": 8.39,
      "p95": 9.09,
      "p98": 11.09,
      "p98Date": "2026-11-13",
      "p98Source": "油价通参考",
      "rank": 3,
      "source": "英德市政府转载广东省发展改革委",
      "url": "https://www.yingde.gov.cn/yqydfgw/gkmlpt/content/2/2208/post_2208291.html"
    },
    {
      "date": "2026-10-30",
      "p92": 8.91,
      "p95": 9.65,
      "p98": 11.65,
      "p98Date": "2026-10-30",
      "p98Source": "油价通参考",
      "rank": 1,
      "source": "油价通历史参考",
      "url": "https://9662.net/guangdong/25259.html"
    },
    {
      "date": "2026-10-16",
      "p92": 8.63,
      "p95": 9.35,
      "p98": 11.35,
      "p98Date": "2026-10-16",
      "p98Source": "油价通参考",
      "rank": 1,
      "source": "油价通历史参考",
      "url": "https://9662.net/guangdong/25259.html"
    },
    {
      "date": "2026-09-25",
      "p92": 8.63,
      "p95": 9.35,
      "p98": 11.35,
      "p98Date": "2026-09-25",
      "p98Source": "油价通参考",
      "rank": 1,
      "source": "油价通历史参考",
      "url": "https://9662.net/guangdong/25259.html"
    },
    {
      "date": "2026-09-12",
      "p92": 8.31,
      "p95": 9,
      "p98": 11,
      "p98Date": "2026-09-12",
      "p98Source": "油价通参考",
      "rank": 1,
      "source": "油价通历史参考",
      "url": "https://9662.net/guangdong/25259.html"
    },
    {
      "date": "2026-08-29",
      "p92": 8.1,
      "p95": 8.78,
      "p98": 10.78,
      "p98Date": "2026-08-29",
      "p98Source": "油价通参考",
      "rank": 1,
      "source": "油价通历史参考",
      "url": "https://9662.net/guangdong/25259.html"
    },
    {
      "date": "2026-08-15",
      "p92": 7.8,
      "p95": 8.45,
      "p98": 10.45,
      "p98Date": "2026-08-15",
      "p98Source": "油价通参考",
      "rank": 1,
      "source": "油价通历史参考",
      "url": "https://9662.net/guangdong/25259.html"
    },
    {
      "date": "2026-08-01",
      "p92": 7.99,
      "p95": 8.65,
      "p98": 10.65,
      "p98Date": "2026-08-01",
      "p98Source": "油价通参考",
      "rank": 1,
      "source": "油价通历史参考",
      "url": "https://9662.net/guangdong/25259.html"
    },
    {
      "date": "2026-07-18",
      "p92": 7.44,
      "p95": 8.06,
      "p98": 10.06,
      "p98Date": "2026-07-18",
      "p98Source": "油价通参考",
      "rank": 1,
      "source": "油价通历史参考",
      "url": "https://9662.net/guangdong/25259.html"
    },
    {
      "date": "2026-07-04",
      "p92": 7.2,
      "p95": 7.8,
      "p98": 9.8,
      "p98Date": "2026-07-04",
      "p98Source": "油价通参考",
      "rank": 1,
      "source": "油价通历史参考",
      "url": "https://9662.net/guangdong/25259.html"
    }
  ],
  "nextWindow": "2026-12-10",
  "pendingCycle": null
};
function dateOK(s){return typeof s==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s}

function bj(now){return new Date(now+8*3600000).toISOString().slice(0,10)}

function iso(y,m,d){const s=`${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;return dateOK(s)?s:null}

function add(s,n){return dateOK(s)?new Date(Date.parse(s)+n*DAY).toISOString().slice(0,10):null}

function days(a,b){return (Date.parse(a)-Date.parse(b))/DAY}

function price(n){return typeof n==="number"&&Number.isFinite(n)&&n>=3&&n<=25&&Math.abs(n*100-Math.round(n*100))<0.000001}

function pair(r){return r&&price(r.p92)&&price(r.p95)&&r.p95>=r.p92&&r.p95-r.p92<=4}

function equal(a,b){return a&&b&&Math.round(a.p92*100)===Math.round(b.p92*100)&&Math.round(a.p95*100)===Math.round(b.p95*100)}

function rowOK(r,today){return pair(r)&&dateOK(r.date)&&r.date<=today&&Number.isInteger(r.rank)&&r.rank>=1&&r.rank<=3&&typeof r.source==="string"&&r.source.length>0&&r.source.length<=120&&typeof r.url==="string"&&r.url.length<=500&&/^https:\/\//.test(r.url)}

function quoteOK(r,today){return price(r.p98)&&r.p98>=r.p95&&dateOK(r.p98Date)&&r.p98Date>=r.date&&r.p98Date<=today&&typeof r.p98Source==="string"&&r.p98Source.length>0&&r.p98Source.length<=120}

function clean(r,today){return {date:r.date,p92:r.p92,p95:r.p95,p98:quoteOK(r,today)?r.p98:null,p98Date:quoteOK(r,today)?r.p98Date:null,p98Source:quoteOK(r,today)?r.p98Source:null,rank:r.rank,source:r.source,url:r.url}}

function normalize(s,today){
  if(!s||s.schema!==3||s.region!=="GD"||!Array.isArray(s.records)||s.records.length>40||s.records.length===0||!s.records.every(r=>rowOK(r,today)))return null;
  const records=s.records.map(r=>clean(r,today)).sort((a,b)=>b.date.localeCompare(a.date));
  if(new Set(records.map(r=>r.date)).size!==records.length)return null;
  if(s.nextWindow!=null&&(!dateOK(s.nextWindow)||days(s.nextWindow,today)>40))return null;
  if(s.pendingCycle!=null&&(!dateOK(s.pendingCycle)||s.pendingCycle>today))return null;
  return {schema:3,region:"GD",records,nextWindow:s.nextWindow||null,pendingCycle:s.pendingCycle||null};
}

function plain(html){return String(html||"").replace(/<script\b[\s\S]*?<\/script\s*>|<style\b[\s\S]*?<\/style\s*>|<!--[\s\S]*?-->/gi," ").replace(/<[^>]*>/g," ").replace(/&nbsp;|&#160;|&#xA0;/gi," ").replace(/&amp;/gi,"&").replace(/[\u00a0\u3000\s]+/g," ").trim()}

function attr(s,k){const m=s.match(new RegExp("\\b"+k+"\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s>]+))","i"));return m?(m[1]??m[2]??m[3]):""}

function hrefFor(raw,site){
  let s=String(raw||"").replace(/&amp;/g,"&").trim();
  if(site==="gov"){
    s=s.replace(/^https?:\/\/drc\.gd\.gov\.cn/i,"").replace(/^\.\//,"");
    if(/^content\/post_\d+\.html$/.test(s))s="/ywgg/"+s;
    if(/^post_\d+\.html$/.test(s))s="/ywgg/content/"+s;
    if(/^\/(?:[a-zA-Z0-9_-]+\/){0,6}post_\d+\.html$/.test(s))return "https://drc.gd.gov.cn"+s;
  }else{
    s=s.replace(/^https?:\/\/www\.ndrc\.gov\.cn/i,"").replace(/^\.\//,"");
    if(/^\d{6}\/t\d{8}_\d+\.html$/.test(s))s="/xwdt/xwfb/"+s;
    if(/^\/xwdt\/xwfb\/\d{6}\/t\d{8}_\d+\.html$/.test(s))return "https://www.ndrc.gov.cn"+s;
  }
  return null;
}

function announcements(html,site,today){
  const out=[];
  for(const m of String(html).matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)){
    const title=plain(attr(m[1],"title")+" "+m[2]), date=title.match(/(20\d{2})年\s*(\d{1,2})月\s*(\d{1,2})日/);
    if(!date||!/成品油价格/.test(title)||!/调整|下调|上调|调控/.test(title))continue;
    const effective=add(iso(+date[1],+date[2],+date[3]),1),url=hrefFor(attr(m[1],"href"),site);
    if(effective&&effective<=today&&url)out.push({date:effective,url,unchanged:/不作调整|不调整/.test(title)});
  }
  return [...new Map(out.map(r=>[r.date,r])).values()].sort((a,b)=>b.date.localeCompare(a.date));
}

function official(html,url,rank,today){
  const text=plain(html), marker=/广东省\s*(?:汽[、，,\s]*柴油|成品油)\s*最高\s*(?:销售|零售)\s*价格表/g;
  const out=[];
  for(const hit of text.matchAll(marker)){
    const scope=text.slice(hit.index,hit.index+1800);
    const d=scope.slice(0,320).match(/(20\d{2})年\s*(\d{1,2})月\s*(\d{1,2})日\s*24\s*(?:时|点|:00)/);
    if(!d)continue;
    const date=add(iso(+d[1],+d[2],+d[3]),1);
    const row=g=>{
      const m=scope.match(new RegExp(g+"\\s*号\\s*汽油\\s*(?:[（(][^）)]{0,24}[）)])?\\s*(?:[\\d,]{4,7}\\s+){1,4}(\\d{1,2}\\.\\d{2})(?!\\d)"));
      return m?+m[1]:null;
    };
    const r={date,p92:row(92),p95:row(95),rank,source:rank===3?"广东省发展改革委":"广东省发展改革委公告转载",url,p98:null,p98Date:null,p98Source:null};
    if(rowOK(r,today))out.push(r);
  }
  return out.sort((a,b)=>b.date.localeCompare(a.date))[0]||null;
}

function parseQQ(html,today){
  const t=plain(html);
  const m=t.match(/(20\d{2})年\s*(\d{1,2})月\s*(\d{1,2})日\s*(?:24\s*(?:时|点))?\s*起执行/);
  if(!m||!/广东最新油价|广东今日油价/.test(t))return null;
  let date=iso(+m[1],+m[2],+m[3]);
  // QQDay reports the announcement day in its '日起执行' text on 2026-11-12.
  if(CAL.includes(date)||/24\s*(?:时|点)/.test(m[0]))date=add(date,1);
  const p=g=>{const a=t.match(new RegExp(g+"\\s*号\\s*汽油\\s*为\\s*(\\d{1,2}\\.\\d{2})\\s*元"));return a?+a[1]:null};
  const r={date,p92:p(92),p95:p(95),p98:p(98),label:"QQDay",explicit:true};
  return dateOK(date)&&date<=today&&pair(r)?r:null;
}

function parseSou(html,today){
  const t=plain(html), d=t.match(/数据更新于\s*(20\d{2})[-/.年](\d{1,2})[-/.月](\d{1,2})/);
  // The national table must declare its column order; do not parse an arbitrary Guangdong occurrence.
  if(!d||!/89\s*(?:#|号)?\s*汽油\s*92\s*(?:#|号)?\s*汽油\s*95\s*(?:#|号)?\s*汽油\s*98\s*(?:#|号)?\s*汽油/.test(t))return null;
  const m=t.match(/(?:^|\s)广东(?:省)?\s+(?:\d{1,2}\.\d{2}|-)\s+(\d{1,2}\.\d{2})\s+(\d{1,2}\.\d{2})\s+(\d{1,2}\.\d{2}|-)\s+(?:\d{1,2}\.\d{2}|-)(?:\s|$)/);
  const date=iso(+d[1],+d[2],+d[3]);
  if(!m||!dateOK(date)||date>today)return null;
  const r={date,p92:+m[1],p95:+m[2],p98:m[3]==="-"?null:+m[3],label:"搜油价",explicit:false};
  const n=t.match(/距下次调整还有\s*\d+\s*天\s*[（(]\s*(\d{1,2})月\s*(\d{1,2})日/);
  if(n)r.next=nextEffective(+n[1],+n[2],today);
  return pair(r)?r:null;
}

function nextEffective(m,d,today){
  let next=iso(+today.slice(0,4),m,d);
  if(next&&next<=today)next=iso(+today.slice(0,4)+1,m,d);
  const window=add(next,-1);
  return window&&window>=today&&days(window,today)<=35?window:null;
}

function parseBear(html,today){
  const t=plain(html), m=t.match(/上次调价\s*[:：]\s*(\d{1,2})[-/.月](\d{1,2})/);
  const p=t.match(/广东省\s+(\d{1,2}\.\d{2})\s+(\d{1,2}\.\d{2})\s+(?:\d{1,2}\.\d{2}|-)(?:\s|$)/);
  if(!m||!p||!/广东省油价/.test(t))return null;
  let date=iso(+today.slice(0,4),+m[1],+m[2]);
  if(date&&date>today)date=iso(+today.slice(0,4)-1,+m[1],+m[2]);
  const n=t.match(/下次调价\s*[:：]\s*(\d{1,2})[-/.月](\d{1,2})/);
  const r={date,p92:+p[1],p95:+p[2],p98:null,label:"小熊油耗",explicit:true,next:n?nextEffective(+n[1],+n[2],today):null};
  return dateOK(date)&&date<=today&&days(today,date)<=40&&pair(r)?r:null;
}

function mergeSnapshots(first,second,today){
  const a=normalize(first,today),b=normalize(second,today);
  if(!a)return b;if(!b)return a;
  const map=new Map(a.records.map(r=>[r.date,r]));
  for(const r of b.records){
    const old=map.get(r.date);
    let best=!old||r.rank>=old.rank?r:old;
    if(old&&equal(old,r)){
      const quotes=[old,r].filter(x=>quoteOK(x,today)).sort((x,z)=>z.p98Date.localeCompare(x.p98Date));
      if(quotes.length)best={...best,p98:quotes[0].p98,p98Date:quotes[0].p98Date,p98Source:quotes[0].p98Source};
    }
    map.set(r.date,best);
  }
  const records=[...map.values()].sort((x,z)=>z.date.localeCompare(x.date)).slice(0,24);
  const pending=[a.pendingCycle,b.pendingCycle].filter(d=>d&&d>records[0].date).sort().pop()||null;
  const next=[a.nextWindow,b.nextWindow].filter(Boolean).sort().pop()||null;
  return {schema:3,region:"GD",records,nextWindow:next,pendingCycle:pending};
}

function state(s,today){
  const row=s.records[0],calendar=CAL.filter(d=>d<today).slice(-1)[0];
  const expected=[calendar?add(calendar,1):null,s.pendingCycle,s.nextWindow&&s.nextWindow<today?add(s.nextWindow,1):null].filter(Boolean).sort().pop()||null;
  const stale=Boolean(expected&&row.date<expected)||days(today,row.date)>23;
  let next=[s.nextWindow,CAL.find(d=>d>=today)].filter(d=>d&&d>=today&&days(d,today)<=35).sort()[0]||null;
  return {row,expected,stale,next};
}

async function collectSnapshot(get,base,now){
  const today=bj(now);
  const old=normalize(base,today)||normalize(SEED,today);
  if(!old)throw Error("No valid baseline");
  const safe=async fn=>{try{return await fn()}catch(_){return null}};
  const res=await Promise.all([
    safe(async()=>{const list=announcements(await get(SRC.gov),"gov",today);const first=list.find(x=>!x.unchanged);if(!first)return null;return official(await get(first.url),first.url,3,today)}),
    safe(async()=>official(await get(SRC.mirror),SRC.mirror,2,today)),
    safe(async()=>announcements(await get(SRC.national),"national",today)),
    safe(async()=>parseQQ(await get(SRC.qq),today)),
    safe(async()=>parseSou(await get(SRC.sou),today)),
    safe(async()=>parseBear(await get(SRC.bear),today))
  ]);
  const [gov,mirror,national,qq,sou,bear]=res;
  const prior=old.records[0];
  const verified=[gov,mirror].filter(Boolean).sort((a,b)=>b.date.localeCompare(a.date)||b.rank-a.rank);
  let current=verified[0]&&verified[0].date>=prior.date?verified[0]:prior;
  if(current.date===prior.date&&prior.rank>current.rank)current=prior;
  const latest=national?.[0];
  // A confirmed national change with no provincial table must not be invented.
  // Allow two independently hosted, explicitly cycle-dated corroborating sources as a labeled provisional reference.
  if(latest&&!latest.unchanged&&latest.date>current.date&&qq&&bear&&qq.date===latest.date&&bear.date===latest.date&&equal(qq,bear)){
    current={date:latest.date,p92:qq.p92,p95:qq.p95,rank:1,source:"QQDay及小熊油耗同周期参考",url:SRC.qq,p98:null,p98Date:null,p98Source:null};
  }
  // Only carry forward an unchanged cycle if the preceding national cycle is already accounted for.
  if(latest?.unchanged&&latest.date>current.date&&national[1]?.date===current.date&&current.rank>=2){
    current={...current,date:latest.date,rank:3,source:"国家发展改革委确认本轮不作调整",url:latest.url,p98:null,p98Date:null,p98Source:null};
  }
  const references=[qq,sou].filter(r=>r&&price(r.p98)&&r.p98>=r.p95&&r.date>=current.date&&equal(r,current)&&(!r.explicit||r.date===current.date));
  if(references.length){
    const distinct=new Set(references.map(r=>r.p98));
    if(distinct.size===1){
      const r=references.sort((a,b)=>b.date.localeCompare(a.date))[0];
      const saved=old.records.find(x=>x.date===current.date&&equal(x,current)&&quoteOK(x,today));
      if(!saved||r.p98!==saved.p98){current={...current,p98:r.p98,p98Date:r.date,p98Source:references.map(x=>x.label).join("/")+"参考"}}
    }
  }
  // Only record 98 prices in a verified period; do not invent by adding a constant to 95.
  const all=[...verified.filter(x=>x.date<current.date),current];
  const byDate=new Map();for(const r of all){const last=byDate.get(r.date);if(!last||r.rank>=last.rank)byDate.set(r.date,r)}
  const nextCandidates=[sou?.next,bear?.next].filter(d=>d&&d>=today&&days(d,today)<=35);
  let next=CAL.find(d=>d>=today)||null;
  // Outside the published 2026 calendar, require corroborated dates; one dated source can be kept only if it agrees with cached date.
  if(!next&&nextCandidates.length>=2&&nextCandidates.every(d=>d===nextCandidates[0]))next=nextCandidates[0];
  if(!next&&old.nextWindow&&old.nextWindow>=today)next=old.nextWindow;
  if(!next)next=old.nextWindow||null;
  const fresh={schema:3,region:"GD",records:[...byDate.values()].map(r=>clean(r,today)),nextWindow:next,pendingCycle:latest&&latest.date>current.date?latest.date:null};
  let merged=mergeSnapshots(old,fresh,today);
  // A verified current cycle replaces a past nextWindow; never retain an earlier prediction just because it was cached.
  if(next&&next>=today&&(!old.nextWindow||old.nextWindow<today||CAL.includes(next)||nextCandidates.length>=2))merged.nextWindow=next;
  return {snapshot:merged,diagnostics:{government:!!gov,mirror:!!mirror,national:latest?.date||null,qq:qq?.date||null,sou:sou?.date||null,bear:bear?.date||null,stale:state(merged,today).stale}};
}

function viewData(s,now,connected){
  const today=bj(now),{row,stale,next}=state(s,today),previous=s.records[1];
  const priorWindow=CAL.filter(d=>add(d,1)<row.date).slice(-1)[0];
  const adjacent=previous&&days(row.date,previous.date)<=23&&(!priorWindow||row.date.slice(0,4)!=="2026"||previous.date===add(priorWindow,1));
  const current={};
  for(const k of ["p92","p95","p98"]){
    const value=row[k];
    current[k]={price:price(value)?value:null,delta:adjacent&&price(value)&&price(previous[k])?Math.round((value-previous[k])*100)/100:null};
  }
  if(!quoteOK(row,today)){
    const old=s.records.find(r=>r.date<row.date&&quoteOK(r,today));
    if(old)current.p98={price:old.p98,delta:null,oldDate:old.p98Date};
  }else if(stale){current.p98.delta=null;current.p98.oldDate=row.p98Date}
  if(stale){current.p92.delta=null;current.p95.delta=null}
  return {current,history:s.records,date:row.date,next,status:stale?"待更新":!connected?"缓存":row.rank===1?"参考":"已核验",stale,source:row.source};
}

async function getText(ctx,url,timeout=5500){
  const r=await ctx.http.get(url,{timeout,credentials:"omit",insecureTls:false,headers:{"Accept":"text/html,application/json,*/*","User-Agent":"Mozilla/5.0","Cache-Control":"no-cache","Pragma":"no-cache"}});
  if(r.status<200||r.status>=300)throw Error("HTTP "+r.status);
  const text=await r.text();
  if(typeof text!=="string"||!text.trim()||text.length>4000000)throw Error("Invalid body");
  return text;
}

async function oilData(ctx,now){
  const today=bj(now),key="OilPriceGD.v3",attemptKey="OilPriceGD.v3.lastAttempt";
  let cached=null,lastAttempt=0;
  try{cached=normalize(ctx.storage.getJSON(key),today);lastAttempt=Number(ctx.storage.get(attemptKey))||0}catch(_){}
  let snapshot=mergeSnapshots(SEED,cached,today),connected=false,remote=null;
  try{
    // CDN cache-busting bucket prevents a fixed script URL from returning an old JSON cycle indefinitely.
    remote=normalize(JSON.parse(await getText(ctx,SRC.json+"?slot="+Math.floor(now/900000),4500)),today);
    if(remote){snapshot=mergeSnapshots(snapshot,remote,today);connected=remote.records[0].date>=snapshot.records[0].date&&equal(remote.records[0],snapshot.records[0]);}
  }catch(_){}
  if(!snapshot)throw Error("No valid data");
  const st=state(snapshot,today),interval=st.stale?25*60000:120*60000;
  // Avoid fan-out on each rendering. A healthy server snapshot normally costs exactly one request.
  if((!remote||st.stale||!st.next||!quoteOK(st.row,today))&&(now-lastAttempt>=interval||now<lastAttempt)){
    try{ctx.storage.set(attemptKey,String(now))}catch(_){}
    try{
      const r=await collectSnapshot(url=>getText(ctx,url,5500),snapshot,now);
      snapshot=r.snapshot;
      connected=connected||(!r.diagnostics.stale&&(r.diagnostics.government||r.diagnostics.mirror||r.diagnostics.national===snapshot.records[0].date));
    }catch(_){}
  }
  try{ctx.storage.setJSON(key,snapshot)}catch(_){}
  return viewData(snapshot,now,connected);
}
async function render(ctx, now=Date.now()) {
  const family=String(ctx.widgetFamily||"systemMedium").toLowerCase(), small=family.includes("small"), large=family.includes("large");
  const local=new Date(now+8*3600000).toISOString(), hhmm=local.slice(11,16), short=d=>d?d.slice(5).replace("-","."):"";
  const C={bg:[{light:"#FAFAFA",dark:"#1C1C1E"},{light:"#EFEFF4",dark:"#111113"}],card:{light:"#FFFFFF",dark:"#2C2C2E"},main:{light:"#1C1C1E",dark:"#F2F2F7"},muted:{light:"#8E8E93",dark:"#98989D"},gold:{light:"#B07C1A",dark:"#D4A02A"},red:{light:"#C0392B",dark:"#FF453A"},green:{light:"#1E7E44",dark:"#30D158"},blue:{light:"#2C5F8A",dark:"#5E9ED6"},divider:{light:"#E5E5EA",dark:"#38383A"}};
  const t=(v,s,w,c,o={})=>({type:"text",text:String(v??""),font:{size:s,weight:w},textColor:c,maxLines:1,...o});
  const row=(children,gap=4,o={})=>({type:"stack",direction:"row",alignItems:"center",gap,children,...o});
  const sp=length=>length==null?{type:"spacer"}:{type:"spacer",length};
  const icon=(name,color,size=13)=>({type:"image",src:"sf-symbol:"+name,color,width:size,height:size});
  const bg={type:"linear",colors:C.bg,startPoint:{x:0,y:0},endPoint:{x:1,y:1}};
  const divider={type:"stack",height:0.5,backgroundColor:C.divider,children:[]};
  const root=(children,minutes=30)=>({type:"widget",refreshAfter:new Date(now+minutes*60000).toISOString(),padding:small?12:large?16:13,url:"https://m.bendibao.com/show783326.html",backgroundGradient:bg,children});
  const title=[icon("fuelpump.circle.fill",C.red,small?13:16),t("广东油价",small?13:15,"heavy",C.main)];
  let data;
  try{data=await oilData(ctx,now)}catch(e){
    return root([row([...title,sp(),t("待重试",10,"bold",C.red)]),sp(),t("暂无已核验油价",13,"bold",C.main),t("请检查网络后刷新",10,"medium",C.muted),sp()],30);
  }
  const fresh=data.status==="已核验", status=data.status+" "+short(data.date);
  const next=data.next;
  const ms=next?Date.parse(next+"T00:00:00+08:00")+86400000-now:0;
  const mins=Math.max(0,Math.floor(ms/60000)), days=Math.floor(mins/1440), hours=Math.floor(mins%1440/60);
  const nextLabel=next?short(next)+" 24:00":"待公布";
  const countdown=next?(days?`${days}d${hours}h后`:`${hours}h${mins%60}m后`):"";
  const cfg=small?{r:10,pad:[6,2,6,2],label:9,value:13,delta:8,height:66,gap:6}:large?{r:14,pad:[12,6,12,6],label:13,value:26,delta:12,height:145,gap:12}: {r:12,pad:[9,5,9,5],label:11,value:21,delta:10,height:80,gap:8};
  const info=[["92号","p92",C.gold,"#D4A02A"],["95号","p95",C.red,"#FF453A"],["98号参考","p98",C.blue,"#2F80ED"]];
  function chart(key,hex){
    const ns=data.history.slice().reverse().map(x=>x[key]).filter(x=>typeof x==="number"&&Number.isFinite(x)).slice(-12);
    if(ns.length<2)return null;
    const w=94,h=30,p=3,lo=Math.min(...ns),hi=Math.max(...ns),range=hi-lo||1;
    const pts=ns.map((n,i)=>`${(p+(w-p*2)*i/(ns.length-1)).toFixed(2)},${(p+(h-p*2)*(1-(n-lo)/range)).toFixed(2)}`).join(" ");
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><polyline points="${pts}" stroke="${hex}" stroke-width="1.8" fill="none" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
    try{const b64=typeof Buffer!=="undefined"?Buffer.from(svg,"utf8").toString("base64"):btoa(svg);return {type:"image",src:"data:image/svg+xml;base64,"+b64,width:w,height:h,resizable:true,resizeMode:"contain"}}catch(_){return null}
  }
  const cards=info.map(([label,key,color,hex])=>{
    const item=data.current[key], ok=Number.isFinite(item.price);
    const change=item.oldDate?"旧 "+short(item.oldDate):Number.isFinite(item.delta)?`${item.delta>0?"+":""}${item.delta.toFixed(2)}`:"—";
    const changeColor=item.oldDate||!Number.isFinite(item.delta)||item.delta===0?C.muted:item.delta>0?C.red:C.green;
    const graph=large?chart(key,hex):null;
    return {type:"stack",direction:"column",alignItems:"center",flex:1,backgroundColor:C.card,borderRadius:cfg.r,padding:cfg.pad,children:[sp(),t(label,cfg.label,"bold",color,{minScale:.7}),sp(small?2:4),t(ok?item.price.toFixed(2):"—",cfg.value,"heavy",C.main,{minScale:.65}),sp(2),t(change,cfg.delta,"bold",changeColor,{minScale:.7}),...(graph?[sp(5),graph]:[]),sp()]};
  });
  const body={type:"stack",direction:"column",flex:1,children:[sp(),row(cards,cfg.gap,{height:cfg.height}),sp()]};
  const nearWindow=data.next&&Math.abs(Date.parse(data.next+"T16:00:00Z")-now)<=12*3600000;
  const minutes=data.stale||!fresh||nearWindow?30:60;
  if(small)return root([row([...title,sp(),t(status,9,"bold",fresh?C.muted:C.red,{minScale:.65})],3),body,row([sp(),icon("clock.fill",C.red,9),t("下轮: "+nextLabel,9,"bold",C.red,{minScale:.7})],3)],minutes);
  const ds=[data.current.p92.delta,data.current.p95.delta].filter(Number.isFinite);
  let trend="";
  if(ds.length===2){const a=Math.min(...ds),b=Math.max(...ds);trend=a===b?`${a>0?"+":""}${a.toFixed(2)} 元/L`:`${a>0?"+":""}${a.toFixed(2)} 至 ${b>0?"+":""}${b.toFixed(2)} 元/L`;}
  return root([row([...title,sp(),t("下轮: "+nextLabel+(countdown?" ("+countdown+")":""),large?12:10,"bold",C.red,{minScale:.6})],4),body,divider,sp(6),row([t(trend?"92/95 "+trend:"执行日 "+short(data.date),large?11:10,"medium",C.muted,{minScale:.65}),sp(),t(status,large?11:10,"bold",fresh?C.muted:C.red,{minScale:.7})],4)],minutes);
}

export default async function(ctx) { return render(ctx); }
