/** 广东油价 · Egern | 2026-11-27 修复：公告优先、交叉验证、北京时间、缓存降级。 */
async function oilData(ctx, now) {
  const DAY=86400000, today=new Date(now+8*3600000).toISOString().slice(0,10);
  const validDate=s=>typeof s==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
  const iso=(y,m,d)=>{const s=`${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;return validDate(s)?s:null};
  const add=(s,n)=>validDate(s)?new Date(Date.parse(s)+DAY*n).toISOString().slice(0,10):null;
  const distance=(a,b)=>(Date.parse(a)-Date.parse(b))/DAY;
  const price=n=>typeof n==="number"&&Number.isFinite(n)&&n>=3&&n<=25;
  const calendar=["2026-01-06","2026-01-20","2026-02-03","2026-02-24","2026-03-09","2026-03-23","2026-04-07","2026-04-21","2026-05-08","2026-05-21","2026-06-04","2026-06-18","2026-07-03","2026-07-17","2026-07-31","2026-08-14","2026-08-28","2026-09-11","2026-09-24","2026-10-15","2026-10-29","2026-11-12","2026-11-26","2026-12-10","2026-12-24"];
  const expected=calendar.filter(x=>x<today).slice(-1).map(x=>add(x,1))[0]||null;
  const key="OilPriceGD.v20261127";
  const gov="https://drc.gd.gov.cn";
  const mirror="https://m.bendibao.com/show783326.html";
  const qq="https://oil.qqday.com/province/440000.htm";
  const daily=`https://www.756657.com/guangdong/${today.replace(/-/g,"")}.html`;
  const bear="https://www.xiaoxiongyouhao.com/fprice/proilprice.php?province=%E5%B9%BF%E4%B8%9C%E7%9C%81";
  const seed={
    date:"2026-11-27",p92:8.04,p95:8.71,p98:10.71,source:"发改委公告及第三方98号参考报价",authority:3,live:false,kind:"snapshot",next:"2026-12-10"
  };
  // 92/95: 广东发改委 2026-11-26 公告（https://drc.gd.gov.cn/ywgg/content/post_4985529.html）。
  // 98: 第三方公开参考报价（https://tools.wflynn.cn/utiltools/oil-price；https://www.huangjinjiage.cn/hot/202611/27163591.html），非政府限价。
  // 先前周期为油价通公开历史表，供趋势参考，不用于覆盖较新的已确认价格。
  const baseline=[
    ["2026-11-13",8.39,9.09,11.09],["2026-10-30",8.91,9.65,11.65],
    ["2026-10-16",8.63,9.35,11.35],["2026-09-25",8.63,9.35,11.35],
    ["2026-09-12",8.31,9.00,11.00],["2026-08-29",8.10,8.78,10.78],
    ["2026-08-15",7.80,8.45,10.45],["2026-08-01",7.99,8.65,10.65],
    ["2026-07-18",7.44,8.06,10.06],["2026-07-04",7.20,7.80,9.80],
    ["2026-06-19",7.96,8.62,10.62],["2026-06-05",8.37,9.07,11.07]
  ].map(([date,p92,p95,p98])=>({date,p92,p95,p98,authority:1}));
  function plain(html) {
    return String(html||"").replace(/<script\b[\s\S]*?<\/script\s*>|<style\b[\s\S]*?<\/style\s*>|<!--[\s\S]*?-->/gi," ")
      .replace(/<[^>]*>/g," ").replace(/&nbsp;|&#160;|&#xA0;/gi," ")
      .replace(/&minus;|&#8722;/gi,"-").replace(/&amp;/gi,"&").replace(/\s+/g," ").trim();
  }
  async function get(url) {
    const r=await ctx.http.get(url,{headers:{"User-Agent":"Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148","Accept":"text/html,application/xhtml+xml,*/*","Cache-Control":"no-cache","Pragma":"no-cache"},timeout:6500});
    const status=Number(r.status||r.statusCode||200);
    if(status<200||status>=300)throw Error("HTTP "+status);
    const body=await r.text();
    if(typeof body!=="string"||!body.trim()||body.length>4000000)throw Error("invalid body");
    return body;
  }
  const pair=r=>r&&validDate(r.date)&&r.date<=today&&price(r.p92)&&price(r.p95)&&r.p95>=r.p92&&r.p95-r.p92<=4;
  const same=(a,b)=>Math.abs(a.p92-b.p92)<0.005&&Math.abs(a.p95-b.p95)<0.005;
  function nextDate(text) {
    const m=text.match(/(?:下一(?:次|轮)|下次)(?:国内)?(?:成品)?油价(?:调整)?(?:窗口)?(?:日期|时间)?(?:是|为|：|:|\s)*\s*(20\d{2})[-/.年](\d{1,2})[-/.月](\d{1,2})日?/);
    const d=m&&iso(+m[1],+m[2],+m[3]);
    return d&&d>=today&&distance(d,today)<=35?d:null;
  }
  function official(html,source,kind) {
    const text=plain(html);
    const idx=text.search(/广东省汽[、，,\s]*柴油最高销售价格表|广东省成品油最高销售价格表/);
    if(idx<0)throw Error("no Guangdong price table");
    const scope=text.slice(idx,idx+2200);
    const d=scope.slice(0,320).match(/(20\d{2})年\s*(\d{1,2})月\s*(\d{1,2})日\s*24\s*(?:时|点)/);
    if(!d)throw Error("no effective window");
    const date=add(iso(+d[1],+d[2],+d[3]),1);
    function row(g) {
      const m=scope.match(new RegExp(g+"\\s*号\\s*汽油\\s*(?:[（(][^）)]{0,20}[）)])?\\s*([\\d,]{4,7})\\s+([\\d,]{4,7})\\s+(\\d{1,2}\\.\\d{1,3})(?!\\d)"));
      return m?+m[3]:null;
    }
    const r={date,p92:row(92),p95:row(95),p98:null,authority:kind==="gov"?5:4,source,kind,live:true,next:nextDate(text)};
    if(!pair(r))throw Error("invalid/future official price");
    return r;
  }
  async function government() {
    const html=await get(gov+"/ywgg/");
    const candidates=[];
    for(const m of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)){
      const href=m[1].match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1]||"";
      const label=plain(m[2]+" "+(m[1].match(/\btitle\s*=\s*["']([^"']+)["']/i)?.[1]||""));
      const d=label.match(/(20\d{2})年\s*(\d{1,2})月\s*(\d{1,2})日/);
      if(!/成品油价格(?:调整|下调|上调)/.test(label)||!d)continue;
      const date=iso(+d[1],+d[2],+d[3]);
      const h=href.match(/^(?:https:\/\/drc\.gd\.gov\.cn)?(\/(?:ywgg\/content\/)?(?:post|mpost)_\d+\.html)$/i);
      if(date&&date<today&&h)candidates.push({date,url:gov+h[1]});
    }
    const chosen=candidates.sort((a,b)=>b.date.localeCompare(a.date))[0];
    if(!chosen)throw Error("no announcement link");
    return official(await get(chosen.url),"广东省发展改革委","gov");
  }
  function parseQQ(html) {
    const text=plain(html);
    const m=text.match(/(20\d{2})年\s*(\d{1,2})月\s*(\d{1,2})日(?:\s*24\s*(?:时|点))?\s*起执行/);
    if(!m||!/广东/.test(text))throw Error("missing QQDay cycle");
    let date=iso(+m[1],+m[2],+m[3]);
    if(calendar.includes(date)||/24\s*(?:时|点)/.test(m[0]))date=add(date,1);
    const getPrice=g=>{const a=text.match(new RegExp(g+"\\s*号\\s*汽油\\s*(?:为|[:：])\\s*(\\d{1,2}\\.\\d{1,3})\\s*元"));return a?+a[1]:null};
    const r={date,p92:getPrice(92),p95:getPrice(95),p98:getPrice(98),authority:2,kind:"qq",source:"QQDay 广东挂牌参考",live:true,next:nextDate(text)};
    if(!pair(r))throw Error("invalid QQDay pair");
    return r;
  }
  function parseDaily(html) {
    const text=plain(html);
    if(!/广东/.test(text))throw Error("wrong region");
    function row(g){
      const m=text.match(new RegExp(g+"\\s*号\\s*汽油\\s*(\\d{1,2}\\.\\d{1,3})\\s*元\\s*[/／]\\s*升\\s*(20\\d{2})[-/.](\\d{1,2})[-/.](\\d{1,2})"));
      return m?{p:+m[1],date:iso(+m[2],+m[3],+m[4])}:null;
    }
    const a=row(92),b=row(95),c=row(98);
    if(!a||!b||a.date!==b.date)throw Error("missing dated prices");
    const r={date:a.date,p92:a.p,p95:b.p,p98:c&&c.date===a.date?c.p:null,authority:1,source:"756657 广东参考",kind:"daily",live:true,next:nextDate(text)};
    if(!pair(r))throw Error("invalid daily pair");
    return r;
  }
  function parseBear(html) {
    const text=plain(html);
    const m=text.match(/上次调价\s*[:：]\s*(\d{1,2})[-/.月](\d{1,2})/);
    const p=text.match(/广东省\s+(\d{1,2}\.\d{1,3})\s+(\d{1,2}\.\d{1,3})\s+(?:\d{1,2}\.\d{1,3}|-)/);
    if(!m||!p)throw Error("missing provincial row or cycle");
    let date=iso(+today.slice(0,4),+m[1],+m[2]);
    if(date>today)date=iso(+today.slice(0,4)-1,+m[1],+m[2]);
    let next=null;
    const n=text.match(/下次调价\s*[:：]\s*(\d{1,2})[-/.月](\d{1,2})/);
    if(n){let a=iso(+today.slice(0,4),+n[1],+n[2]);if(a<=today)a=iso(+today.slice(0,4)+1,+n[1],+n[2]);const b=add(a,-1);if(b&&b>=today&&distance(b,today)<=35)next=b}
    const r={date,p92:+p[1],p95:+p[2],p98:null,authority:1,kind:"bear",source:"小熊油耗广东省车主参考",live:true,next};
    if(!pair(r))throw Error("invalid bear pair");
    return r;
  }
  let saved=null;
  try{saved=ctx.storage?.getJSON(key)||null}catch(_){}
  const savedRow=saved&&pair(saved.row)?{...saved.row,live:false,kind:"cache"}:null;
  const settled=await Promise.allSettled([
    government(),
    get(mirror).then(h=>official(h,"深圳本地宝转载广东省发改委","mirror")),
    get(qq).then(parseQQ),
    get(daily).then(parseDaily),
    get(bear).then(parseBear)
  ]);
  const live=settled.filter(x=>x.status==="fulfilled").map(x=>x.value);
  const available=[...live,...(savedRow?[savedRow]:[]),...(pair(seed)?[seed]:[])].filter(pair);
  if(!available.length)throw Error("没有已验证的广东油价");
  // 优先最新的公告/已确认缓存；新一轮第三方报价只有两种独立来源同周期同价才提前采用。
  const trusted=available.filter(r=>r.authority>=3).sort((a,b)=>b.date.localeCompare(a.date)||b.authority-a.authority||Number(b.live)-Number(a.live));
  let chosen=trusted[0]||available.slice().sort((a,b)=>b.date.localeCompare(a.date)||b.authority-a.authority)[0];
  const fresh=live.filter(r=>r.date>chosen.date&&r.authority<3&&live.some(s=>s.kind!==r.kind&&s.date===r.date&&same(r,s)));
  fresh.sort((a,b)=>b.date.localeCompare(a.date)||b.authority-a.authority);
  if(fresh.length)chosen={...fresh[0],authority:2,source:"独立来源交叉核验参考"};
  // 如果缓存是交叉验证后的新周期，不能被旧公告回退。
  if(savedRow&&savedRow.date>chosen.date&&savedRow.authority>=2)chosen=savedRow;
  // 只合并同调价周期且92/95一致的98号报价；没有同周期报价则标旧日期。
  const compatible=available.filter(r=>r.date===chosen.date&&same(r,chosen)&&price(r.p98)).sort((a,b)=>Number(b.live)-Number(a.live)||b.authority-a.authority);
  const ref98=compatible[0]||null;
  let older98=available.filter(r=>r.date<chosen.date&&price(r.p98)).sort((a,b)=>b.date.localeCompare(a.date)||b.authority-a.authority)[0];
  if(saved&&validDate(saved.old98?.date)&&saved.old98.date<chosen.date&&price(saved.old98.p98)&&(!older98||saved.old98.date>older98.date))older98=saved.old98;
  if(!older98)older98=baseline.find(r=>r.date<chosen.date);
  const row={date:chosen.date,p92:chosen.p92,p95:chosen.p95,p98:ref98?ref98.p98:null,source:chosen.source,authority:chosen.authority};
  const historyMap=new Map();
  function put(r){
    if(!pair(r)||r.date>row.date)return;
    const old=historyMap.get(r.date);
    if(!old||(r.authority||0)>=(old.authority||0)){
      const keep98=price(r.p98)?r.p98:(old&&same(r,old)&&price(old.p98)?old.p98:null);
      historyMap.set(r.date,{date:r.date,p92:r.p92,p95:r.p95,p98:keep98,authority:r.authority||1});
    }
  }
  baseline.forEach(put);
  if(Array.isArray(saved?.history))saved.history.slice(0,24).forEach(put);
  available.filter(r=>r.date<row.date).forEach(put);
  put(row);
  const history=[...historyMap.values()].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,18);
  const previous=history.find(r=>r.date<row.date);
  const priorWindow=calendar.filter(x=>add(x,1)<row.date).slice(-1)[0];
  const canDiff=previous&&distance(row.date,previous.date)<=23&&(!priorWindow||row.date.slice(0,4)!=="2026"||previous.date>=add(priorWindow,1));
  const current={};
  for(const k of ["p92","p95","p98"]){
    const v=row[k];
    current[k]={price:price(v)?v:null,delta:canDiff&&price(v)&&price(previous[k])?Number((v-previous[k]).toFixed(2)):null};
  }
  if(!price(row.p98)&&older98)current.p98={price:older98.p98,delta:null,oldDate:older98.date};
  let next=calendar.find(d=>d>=today)||null;
  if(!next){
    const possible=[...live.map(r=>r.next),saved?.next].filter(d=>validDate(d)&&d>=today&&distance(d,today)<=35);
    next=possible.sort()[0]||null;
  }
  const stale=Boolean(expected&&row.date<expected)||distance(today,row.date)>23;
  const liveConfirmed=chosen.live===true||(live.some(r=>r.date===row.date&&same(r,row)&&r.authority>=4));
  const status=stale?"待更新":liveConfirmed?(row.authority>=3?"实时":"参考"):"缓存";
  try{ctx.storage?.setJSON(key,{row,history,next,old98:older98?{date:older98.date,p98:older98.p98}:null})}catch(_){}
  return {current,history,date:row.date,next,status,stale,source:row.source};
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
    return root([row([...title,sp(),t("待重试",10,"bold",C.red)]),sp(),t("暂无已核验油价",13,"bold",C.main),t("请检查网络后刷新",10,"medium",C.muted),sp()],10);
  }
  const fresh=data.status==="实时", status=fresh?hhmm:data.status+" "+short(data.date);
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
  const minutes=data.stale||!fresh?10:30;
  if(small)return root([row([...title,sp(),t(status,9,"bold",fresh?C.muted:C.red,{minScale:.65})],3),body,row([sp(),icon("clock.fill",C.red,9),t("下轮: "+nextLabel,9,"bold",C.red,{minScale:.7})],3)],minutes);
  const ds=[data.current.p92.delta,data.current.p95.delta].filter(Number.isFinite);
  let trend="";
  if(ds.length===2){const a=Math.min(...ds),b=Math.max(...ds);trend=a===b?`${a>0?"+":""}${a.toFixed(2)} 元/L`:`${a>0?"+":""}${a.toFixed(2)} 至 ${b>0?"+":""}${b.toFixed(2)} 元/L`;}
  return root([row([...title,sp(),t("下轮: "+nextLabel+(countdown?" ("+countdown+")":""),large?12:10,"bold",C.red,{minScale:.6})],4),body,divider,sp(6),row([t(trend?"92/95 "+trend:"执行日 "+short(data.date),large?11:10,"medium",C.muted,{minScale:.65}),sp(),t(status,large?11:10,"bold",fresh?C.muted:C.red,{minScale:.7})],4)],minutes);
}
export default async function(ctx) { return render(ctx); }
