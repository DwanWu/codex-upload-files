/** 广东油价 · 2026-11-27 v2.0 | 动态工作日日历、官方公告纠偏、北京时间、离线缓存、98号参考。 */
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


/* Official workday schedules, not an official annual oil-price calendar.
 * 2026: 国办发明电〔2025〕7号; 2027: 国办发明电〔2026〕10号.
 * Unknown years must be discovered from official notices; never assume weekdays alone. */
const HOLIDAY_SOURCE="https://www.gov.cn/zhengce/content/202611/content_7085101.htm";
const BUILTIN_WORKDAYS={
  2026:{off:[["01-01","01-03"],["02-15","02-23"],["04-04","04-06"],["05-01","05-05"],["06-19","06-21"],["09-25","09-27"],["10-01","10-07"]],work:["01-04","02-14","02-28","05-09","09-20","10-10"]},
  2027:{off:[["01-01","01-03"],["02-05","02-13"],["04-03","04-05"],["05-01","05-05"],["06-09","06-09"],["09-15","09-15"],["10-01","10-07"]],work:["01-31","02-14","05-08","09-26","10-09"]}
};
function policyURL(u){return typeof u==="string"&&/^https:\/\/www\.gov\.cn\/zhengce\/content\/20\d{4}\/content_\d+\.htm$/.test(u)}
function cleanHoliday(h,year){
  if(!h||!policyURL(h.url)||!/^国办发明电〔20\d{2}〕\d+号$/.test(h.doc||"")||!Array.isArray(h.off)||!Array.isArray(h.work)||h.off.length!==7||h.work.length>15)return null;
  const inYear=d=>dateOK(d)&&d>=String(year-1)+"-12-28"&&d<=String(year)+"-12-31";
  if(h.off.some(r=>!Array.isArray(r)||r.length!==2||!r.every(inYear)||days(r[1],r[0])<0||days(r[1],r[0])>12)||!h.work.every(inYear))return null;
  const off=h.off.map(r=>r.slice()).sort((a,b)=>a[0].localeCompare(b[0])),work=[...new Set(h.work)].sort();
  if(off.some((r,i)=>i>0&&r[0]<=off[i-1][1])||work.some(d=>off.some(([a,b])=>d>=a&&d<=b)))return null;
  if(off.reduce((n,r)=>n+days(r[1],r[0])+1,0)<7||off.reduce((n,r)=>n+days(r[1],r[0])+1,0)>45)return null;
  return {url:h.url,doc:h.doc,off,work};
}
function cleanHolidayYears(input,today){
  const out={};if(!input||typeof input!=="object"||Array.isArray(input))return out;
  const y=+today.slice(0,4);
  for(const k of Object.keys(input).sort()){
    if(!/^20\d{2}$/.test(k)||+k<Math.max(2028,y-1)||+k>y+1)continue;
    const h=cleanHoliday(input[k],+k);if(h)out[k]=h;
  }
  return out;
}
function holidayFor(year,years={}){
  const b=BUILTIN_WORKDAYS[year];
  if(b)return {off:b.off.map(r=>r.map(d=>year+"-"+d)),work:b.work.map(d=>year+"-"+d)};
  return years[year]||null;
}
function workingDay(d,years={}){
  if(!dateOK(d))return null;
  const year=+d.slice(0,4),h=holidayFor(year,years);
  // New Year holiday notices may explicitly include dates in the previous December.
  const adjacent=holidayFor(year+1,years);
  const schedules=[h,adjacent].filter(Boolean);
  if(schedules.some(x=>x.work.includes(d)))return true;
  if(schedules.some(x=>x.off.some(([a,b])=>d>=a&&d<=b)))return false;
  if(!h)return null;
  const w=new Date(d+"T00:00:00Z").getUTCDay();return w!==0&&w!==6;
}
function rollWindow(anchor,years={}){
  if(!dateOK(anchor))return null;
  let count=0;
  for(let i=1;i<=35;i++){
    const d=add(anchor,i),w=workingDay(d,years);
    if(w===null)return null;if(w&&++count===10)return d;
  }
  return null;
}
function parseHolidayNotice(html,year,url){
  const t=plain(html).replace(/\s+/g,"").replace(/[（(][^）)]{0,80}[）)]/g,"");
  if(!policyURL(url)||!t.includes("国务院办公厅关于"+year+"年部分节假日安排的通知"))return null;
  const doc=t.match(/国办发明电〔(20\d{2})〕\d+号/);
  if(!doc||![year-1,year].includes(+doc[1]))return null;
  const names=["一、元旦","二、春节","三、清明节","四、劳动节","五、端午节","六、中秋节","七、国庆节"];
  const start=names.map(x=>t.indexOf(x+"："));if(start.some((v,i)=>v<0||(i>0&&v<=start[i-1])))return null;
  const off=[],work=[];
  for(let i=0;i<names.length;i++){
    const part=t.slice(start[i]+names[i].length+1,start[i+1]??undefined);
    const m=part.match(/^(\d{1,2})月(\d{1,2})日(?:至(?:(\d{1,2})月)?(\d{1,2})日)?放假(?:调休)?[，,]共(\d{1,2})天[。；]/);
    if(!m)return null;
    const sm=+m[1],em=m[3]?+m[3]:sm;
    const sy=i===0&&sm===12?year-1:year,ey=sy+(em<sm?1:0);
    const a=iso(sy,sm,+m[2]),b=iso(ey,em,+(m[4]||m[2]));
    if(!a||!b||days(b,a)+1!==+m[5])return null;
    off.push([a,b]);
    const rest=part.slice(m[0].length);
    const w=rest.match(/^((?:\d{1,2}月\d{1,2}日[、，,]?)*)上班[。；]/);
    if(w){for(const d of w[1].matchAll(/(\d{1,2})月(\d{1,2})日/g)){const wd=iso(i===0&&+d[1]===12?year-1:year,+d[1],+d[2]);if(!wd)return null;work.push(wd)}}
    else if(/^[^。；]{0,100}上班/.test(rest))return null;
  }
  return cleanHoliday({url,doc:doc[0],off,work},year);
}
function holidaySearchURL(year){return "https://sousuo.www.gov.cn/search-gov/data?t=zhengcelibrary&q="+encodeURIComponent("国务院办公厅关于"+year+"年部分节假日安排的通知")+"&searchfield=title&sort=pubtime&sortType=1&p=0&n=10&type=gwyzcwjk"}
function holidayLinks(raw,year){
  const title="国务院办公厅关于"+year+"年部分节假日安排的通知",links=[];
  try{
    const j=JSON.parse(raw),list=j?.searchVO?.catMap?.gongwen?.listVO;
    if(Array.isArray(list))for(const x of list.slice(0,10)){
      if(plain(x.title).replace(/\s+/g,"")===title&&policyURL(x.piclinksurl))links.push(x.piclinksurl);
    }
  }catch(_){}
  return [...new Set(links)].slice(0,3);
}
async function refreshHolidayYears(get,input,today){
  const years=cleanHolidayYears(input,today),year=+today.slice(0,4),targets=[year,...(+today.slice(5,7)>=10?[year+1]:[])];
  for(const y of targets){
    if(holidayFor(y,years))continue;
    try{const links=holidayLinks(await get(holidaySearchURL(y)),y);
      for(const url of links){const h=parseHolidayNotice(await get(url),y,url);if(h){years[y]=h;break}}
    }catch(_){/* retain validated cached schedule */}
  }
  return years;
}
function cleanNotice(n,today){
  if(!n||!dateOK(n.date)||n.date>today||!["cycle","pause"].includes(n.kind)||typeof n.url!=="string"||!/^https:\/\/www\.ndrc\.gov\.cn\/xwdt\/xwfb\/20\d{4}\/t20\d{6}_\d+\.html$/.test(n.url))return null;
  if(!n.url.includes("/t"+n.date.replace(/-/g,"")+"_"))return null;
  return {date:n.date,kind:n.kind,url:n.url};
}
function cleanHint(h,today){
  if(!h||!dateOK(h.anchor)||!Number.isSafeInteger(h.checkedAt)||h.checkedAt<=0)return null;
  const checked=bj(h.checkedAt);
  if(checked>today||checked<=h.anchor||days(checked,h.anchor)>35)return null;
  if(h.date!==null&&(!dateOK(h.date)||h.date<checked||h.date<=h.anchor||days(h.date,h.anchor)>35))return null;
  return {date:h.date,anchor:h.anchor,checkedAt:h.checkedAt};
}
function newerNotice(a,b){
  return [a,b].filter(Boolean).sort((x,y)=>y.date.localeCompare(x.date)||Number(y.kind==="pause")-Number(x.kind==="pause"))[0]||null;
}
function newerHint(a,b){
  return [a,b].filter(Boolean).sort((x,y)=>y.anchor.localeCompare(x.anchor)||y.checkedAt-x.checkedAt||Number(y.date===null)-Number(x.date===null))[0]||null;
}
function calendarState(s,today){
  const notice=cleanNotice(s.calendarNotice,today),years=s.holidayYears||{};
  const rowAnchor=s.records.filter(r=>r.rank>=2&&r.date<=today).map(r=>add(r.date,-1)).sort().pop()||null;
  const official=[rowAnchor,notice?.kind==="cycle"&&notice.date<today?notice.date:null].filter(Boolean).sort().pop()||null;
  const expected=[official?add(official,1):null,s.pendingCycle].filter(Boolean);
  if(notice?.kind==="pause"&&(!official||notice.date>=official))return {next:null,kind:"paused",anchor:official,expected};
  if(notice?.kind==="cycle"&&notice.date===today)return {next:today,kind:"official",anchor:official,expected};
  const aligned=!official||CAL.includes(official);
  const last=aligned?CAL.filter(d=>d<today).slice(-1)[0]:null;
  if(last)expected.push(add(last,1));
  const anchor=[official,last].filter(Boolean).sort().pop()||null;
  const known=aligned?CAL.find(d=>d>=today&&(!anchor||d>anchor)):null;
  if(known)return {next:known,kind:"calendar",anchor,expected};
  const prediction=rollWindow(anchor,years);
  const hint=cleanHint(s.calendarHint,today),matching=hint?.anchor===anchor?hint.date:null;
  if(prediction&&prediction<today)expected.push(add(prediction,1));
  if(matching&&matching<today)expected.push(add(matching,1));
  if(prediction)return {next:prediction>=today?prediction:null,kind:prediction>=today?"estimated":null,anchor,expected};
  return {next:matching&&matching>=today?matching:null,kind:matching&&matching>=today?"corroborated":null,anchor,expected};
}
function windowEnd(d){return dateOK(d)?Date.parse(d+"T00:00:00+08:00")+DAY:NaN}
function countdownText(d,now){
  const ms=windowEnd(d)-now;if(!Number.isFinite(ms)||ms<=0)return "";
  const mins=Math.floor(ms/60000),dd=Math.floor(mins/1440),hh=Math.floor(mins%1440/60);
  return mins===0?"不足1m":dd?dd+"d"+hh+"h后":hh+"h"+mins%60+"m后";
}
function publicationDecision(original,result,today){
  const next=result.snapshot,diag=result.diagnostics;
  const officialChanged=!!next.calendarNotice&&JSON.stringify(cleanNotice(original.calendarNotice,today))!==JSON.stringify(next.calendarNotice);
  const holidayChanged=JSON.stringify(cleanHolidayYears(original.holidayYears,today))!==JSON.stringify(next.holidayYears||{});
  const calendarChanged=officialChanged||holidayChanged;
  const any=[diag.government,diag.mirror,diag.national,diag.announcedCycle,diag.qq,diag.sou,diag.bear].some(Boolean);
  if(calendarChanged)return {publish:true,calendarOnly:!any||diag.stale};
  if(!any)return {publish:false,reason:"All sources unavailable; retain previous snapshot"};
  if(diag.stale)return {publish:false,reason:"New price cycle not confirmed; preserve old published snapshot"};
  return {publish:true,calendarOnly:false};
}

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
  const nextWindow=dateOK(s.nextWindow)&&days(s.nextWindow,today)<=40?s.nextWindow:null;
  const pendingCycle=dateOK(s.pendingCycle)&&s.pendingCycle<=today?s.pendingCycle:null;
  return {schema:3,region:"GD",records,nextWindow,pendingCycle,calendarNotice:cleanNotice(s.calendarNotice,today),calendarHint:cleanHint(s.calendarHint,today),holidayYears:cleanHolidayYears(s.holidayYears,today)};
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
    if(!date||!/成品油价格|成品油调价/.test(title)||!/调整|下调|上调|调控|调价/.test(title))continue;
    const day=iso(+date[1],+date[2],+date[3]),effective=add(day,1),url=hrefFor(attr(m[1],"href"),site);
    const paused=/暂缓|暂停|延迟|延期|推迟/.test(title);
    if(day&&day<=today&&url&&(site==="national"||(!paused&&effective<=today))){
      const notice=site==="national"?cleanNotice({date:day,kind:paused?"pause":"cycle",url},today):null;
      if(site!=="national"||notice)out.push({date:effective,url,unchanged:!paused&&/不作调整|不调整/.test(title),paused,notice});
    }
  }
  const map=new Map();
  for(const r of out){const old=map.get(r.date);if(!old||r.paused)map.set(r.date,r)}
  return [...map.values()].sort((a,b)=>b.date.localeCompare(a.date));
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

function parseQQ(html,today,cycleDates=[]){
  const t=plain(html);
  const m=t.match(/(20\d{2})年\s*(\d{1,2})月\s*(\d{1,2})日\s*(?:24\s*(?:时|点))?\s*起执行/);
  if(!m||!/广东最新油价|广东今日油价/.test(t))return null;
  let date=iso(+m[1],+m[2],+m[3]);
  // QQDay reports the announcement day in its '日起执行' text on 2026-11-12.
  if(/24\s*(?:时|点)/.test(m[0])||(!cycleDates.includes(date)&&(CAL.includes(date)||cycleDates.includes(add(date,1)))))date=add(date,1);
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
  if(n&&days(today,date)<=2){const next=nextEffective(+n[1],+n[2],date);if(next&&next>=today)r.next=next}
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
  const stamp=t.match(/广东省油价\s*(20\d{2})年\s*(\d{1,2})月\s*(\d{1,2})日/);
  const asOf=stamp?iso(+stamp[1],+stamp[2],+stamp[3]):null;
  const next=n&&asOf&&asOf<=today&&days(today,asOf)<=2?nextEffective(+n[1],+n[2],asOf):null;
  const r={date,p92:+p[1],p95:+p[2],p98:null,label:"小熊油耗",explicit:true,next:next&&next>=today?next:null};
  return dateOK(date)&&date<=today&&days(today,date)<=40&&pair(r)?r:null;
}

function mergeSnapshots(first,second,today){
  const a=normalize(first,today),b=normalize(second,today);
  if(!a||!b){const one=a||b;if(one)one.nextWindow=calendarState(one,today).next;return one}
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
  const merged={schema:3,region:"GD",records,nextWindow:null,pendingCycle:pending,calendarNotice:newerNotice(a.calendarNotice,b.calendarNotice),calendarHint:newerHint(a.calendarHint,b.calendarHint),holidayYears:{...a.holidayYears,...b.holidayYears}};
  merged.holidayYears=cleanHolidayYears(merged.holidayYears,today);
  merged.nextWindow=calendarState(merged,today).next;
  return merged;
}

function state(s,today){
  const row=s.records[0],cal=calendarState(s,today);
  const expected=cal.expected.filter(Boolean).sort().pop()||null;
  const stale=Boolean(expected&&row.date<expected)||(cal.kind!=="paused"&&!cal.next&&days(today,row.date)>23);
  return {row,expected,stale,next:cal.next,nextKind:cal.kind};
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
    safe(async()=>await get(SRC.qq)),
    safe(async()=>parseSou(await get(SRC.sou),today)),
    safe(async()=>parseBear(await get(SRC.bear),today))
  ]);
  const [gov,mirror,national,qqHTML,sou,bear]=res;
  const effectiveNational=(national||[]).filter(x=>!x.paused&&x.date<=today);
  const qq=parseQQ(qqHTML,today,[...effectiveNational.map(x=>x.date),...old.records.filter(x=>x.rank>=2).map(x=>x.date)]);
  const prior=old.records[0];
  const verified=[gov,mirror].filter(Boolean).sort((a,b)=>b.date.localeCompare(a.date)||b.rank-a.rank);
  let current=verified[0]&&verified[0].date>=prior.date?verified[0]:prior;
  if(current.date===prior.date&&prior.rank>current.rank)current=prior;
  const latest=effectiveNational[0];
  // A confirmed national change with no provincial table must not be invented.
  // Allow two independently hosted, explicitly cycle-dated corroborating sources as a labeled provisional reference.
  if(latest&&!latest.unchanged&&latest.date>current.date&&qq&&bear&&qq.date===latest.date&&bear.date===latest.date&&equal(qq,bear)){
    current={date:latest.date,p92:qq.p92,p95:qq.p95,rank:1,source:"QQDay及小熊油耗同周期参考",url:SRC.qq,p98:null,p98Date:null,p98Source:null};
  }
  // Only carry forward an unchanged cycle if the preceding national cycle is already accounted for.
  if(latest?.unchanged&&latest.date>current.date&&effectiveNational[1]?.date===current.date&&current.rank>=2){
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
  const notice=newerNotice(old.calendarNotice,national?.[0]?.notice||null);
  const fresh={schema:3,region:"GD",records:[...byDate.values()].map(r=>clean(r,today)),nextWindow:null,pendingCycle:latest&&latest.date>current.date?latest.date:null,calendarNotice:notice,calendarHint:null,holidayYears:old.holidayYears};
  const merged=mergeSnapshots(old,fresh,today),cal=calendarState(merged,today);
  const prediction=rollWindow(cal.anchor,merged.holidayYears);
  const candidates=[sou?.next,bear?.next].filter(d=>d&&d>=today&&days(d,today)<=35);
  const agreement=candidates.length===2&&candidates[0]===candidates[1];
  if(cal.kind!=="paused"&&cal.kind!=="official"&&cal.kind!=="calendar"&&cal.anchor&&!prediction&&candidates.length===2){
    const date=agreement?candidates[0]:null,prior=merged.calendarHint;
    if(!prior||prior.anchor!==cal.anchor||prior.date!==date){
      const hint=cleanHint({date,anchor:cal.anchor,checkedAt:now},today);
      if(hint)merged.calendarHint=newerHint(prior,hint);
    }
  }
  const resolved=calendarState(merged,today);
  merged.nextWindow=resolved.next;
  return {snapshot:merged,diagnostics:{government:!!gov,mirror:!!mirror,national:latest?.date||null,announcedCycle:national?.[0]?.notice?.date||null,qq:qq?.date||null,sou:sou?.date||null,bear:bear?.date||null,calendarAgreement:agreement,calendarKind:resolved.kind,calendarConflict:candidates.length===2&&(!agreement||!!(prediction&&prediction!==candidates[0])),stale:state(merged,today).stale}};
}

function viewData(s,now,connected){
  const today=bj(now),{row,stale,next,nextKind}=state(s,today),previous=s.records[1];
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
  return {current,history:s.records,date:row.date,next,nextKind,status:stale?"待更新":!connected?"缓存":row.rank===1?"参考":"已核验",stale,source:row.source};
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
  const st=state(snapshot,today),interval=st.stale||st.next===today?25*60000:120*60000;
  // Avoid fan-out on each rendering. A healthy server snapshot normally costs exactly one request.
  if((!remote||st.stale||!st.next||st.next===today&&st.nextKind!=="official"||!quoteOK(st.row,today))&&(now-lastAttempt>=interval||now<lastAttempt)){
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
    return root([row([...title,sp(),t("待重试",10,"bold",C.red)]),sp(),t("暂无油价",13,"bold",C.main),t("请检查网络后刷新",10,"medium",C.muted),sp()],30);
  }
  const fresh=data.status==="已核验", status=fresh?short(data.date):data.status+" "+short(data.date);
  const next=data.next;
  const nextLabel=next?short(next)+" 24:00":data.nextKind==="paused"?"暂缓调价":"待公布";
  const countdown=countdownText(next,now);
  const nextPrefix=data.nextKind==="estimated"||data.nextKind==="corroborated"?"预计: ":"下轮: ";
  const cfg=small?{r:10,pad:[6,2,6,2],label:9,value:13,delta:8,height:66,gap:6}:large?{r:14,pad:[12,6,12,6],label:13,value:26,delta:12,height:145,gap:12}: {r:12,pad:[9,5,9,5],label:11,value:21,delta:10,height:80,gap:8};
  const info=[["92号","p92",C.gold,"#D4A02A"],["95号","p95",C.red,"#FF453A"],["98号","p98",C.blue,"#2F80ED"]];
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
  const nearWindow=data.next&&Math.abs(windowEnd(data.next)-now)<=12*3600000;
  const normalMinutes=data.stale||!fresh||nearWindow?30:60;
  const minutes=next?Math.min(normalMinutes,Math.max(0.001,(windowEnd(next)-now)/60000)):normalMinutes;
  if(small)return root([row([...title,sp(),t(status,9,"bold",fresh?C.muted:C.red,{minScale:.65})],3),body,row([sp(),icon("clock.fill",C.red,9),t(nextPrefix+nextLabel,9,"bold",C.red,{minScale:.7})],3)],minutes);
  return root([row([...title,sp(),t(nextPrefix+nextLabel,large?12:10,"bold",C.red,{minScale:.6})],4),body,divider,sp(6),row([t(countdown,large?11:10,"medium",C.red,{minScale:.65}),sp(),t(status,large?11:10,"bold",fresh?C.muted:C.red,{minScale:.7})],4)],minutes);
}

export default async function(ctx) { return render(ctx); }
