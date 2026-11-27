/**
 * 节点体检 - NodePulse
 * 布局参考“广东油价”：标题 -> 居中结果卡 -> 分隔线 -> 底部左右 IP。
 * 顶部地区绿色显示；底部左内网 IP、右出口 IP。
 * 颜色规则：纯度>=90绿色，80-89粉色，<80红色；机房红色；风险中粉色、高红色。
 */

const COUNTRY_ZH = {
    US:'美国', CA:'加拿大', GB:'英国', DE:'德国', FR:'法国', NL:'荷兰', BE:'比利时',
    JP:'日本', KR:'韩国', SG:'新加坡', HK:'中国香港', MO:'中国澳门', TW:'中国台湾', CN:'中国',
    AU:'澳大利亚', NZ:'新西兰', IN:'印度', MY:'马来西亚', TH:'泰国', VN:'越南', PH:'菲律宾',
    ID:'印度尼西亚', RU:'俄罗斯', UA:'乌克兰', CH:'瑞士', SE:'瑞典', NO:'挪威', FI:'芬兰',
    DK:'丹麦', IT:'意大利', ES:'西班牙', PT:'葡萄牙', PL:'波兰', IE:'爱尔兰', AE:'阿联酋',
    TR:'土耳其', BR:'巴西', MX:'墨西哥', AR:'阿根廷', CL:'智利', ZA:'南非', IL:'以色列'
  };
const PURE_URL="https://my.ippure.com/v1/info",QUERY_BASE="https://api.ipquery.io/",QUERY_URL=QUERY_BASE+"?format=json",PROXY_BASE="https://proxycheck.io/v3/";
const PROXY_BUDGET="NodeVitals.proxycheck.budget.v1";
function canonIP(x){
  if(typeof x!=="string")return null;let s=x.trim().toLowerCase();
  const v4=v=>/^(?:0|[1-9]\d{0,2})(?:\.(?:0|[1-9]\d{0,2})){3}$/.test(v)&&v.split(".").every(n=>+n<=255);
  if(v4(s))return s;
  if(s.includes(".")){const i=s.lastIndexOf(":"),v=s.slice(i+1);if(i<0||!v4(v))return null;const p=v.split(".").map(Number);s=s.slice(0,i+1)+((p[0]<<8)|p[1]).toString(16)+":"+((p[2]<<8)|p[3]).toString(16)}
  if(!/^[0-9a-f:]+$/.test(s)||!s.includes(":"))return null;
  const halves=s.split("::");if(halves.length>2)return null;
  const split=t=>t?t.split(":"):[];
  const a=split(halves[0]),b=halves.length===2?split(halves[1]):[];
  if([...a,...b].some(v=>!/^[0-9a-f]{1,4}$/.test(v))||halves.length===1&&a.length!==8||halves.length===2&&a.length+b.length>=8)return null;
  const p=[...a,...Array(8-a.length-b.length).fill("0"),...b].map(v=>parseInt(v,16).toString(16));
  if(p.slice(0,5).every(v=>v==="0")&&p[5]==="ffff"){const h=parseInt(p[6],16),l=parseInt(p[7],16);return [h>>8,h&255,l>>8,l&255].join(".")}
  return p.join(":");
}
// Only publicly routable address ranges are meaningful as an observed Internet exit.
// Conservatively reject private, shared, link-local, loopback and documentation networks.
function publicIP(value){
  const ip=canonIP(value);if(!ip)return null;
  if(ip.includes(".")){
    const [a,b,c]=ip.split(".").map(Number);
    if(a===0||a===10||a===127||a>=224||a===100&&b>=64&&b<=127||a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&(b===168||b===0&&(c===0||c===2)||b===88&&c===99)||a===198&&(b===18||b===19||b===51&&c===100)||a===203&&b===0&&c===113)return null;
  }else{
    const [a,b]=ip.split(":").map(x=>parseInt(x,16));
    if(a<0x2000||a>0x3fff||a===0x2001&&b===0xdb8||a===0x3fff&&b<0x1000)return null;
  }
  return ip;
}
function score(v){return typeof v==="number"&&Number.isFinite(v)&&v>=0&&v<=100?v:null}
function object(v){return !!v&&typeof v==="object"&&!Array.isArray(v)}
// IPPure FAQ explicitly excludes IPv6 from its risk score.
// Do not mix or average distinct providers; any fallback must be explicitly labeled.
function pureScore(p,target){
  if(!p||!target||target.includes(":")||publicIP(p.ip)!==target)return null;
  return score(p.fraudScore);
}
function riskRecord(q){
  if(!object(q?.risk))return false;
  const r=q.risk;
  return score(r.risk_score)!==null||["is_mobile","is_vpn","is_proxy","is_tor","is_datacenter"].some(k=>typeof r[k]==="boolean");
}
function ageHeader(resp){try{
  const h=resp.headers,v=typeof h?.get==="function"?h.get("age"):h?.age??h?.Age;
  return typeof v==="string"&&/^\d+$/.test(v)?Number(v):null;
}catch(_){return null}}
function cleanIPText(v){return typeof v==="string"?v.replace(/[\u0000-\u001f\u007f]/g," ").trim().slice(0,100):""}
// Provider returns data keyed by the requested address; IPv6 may be compressed.
// A successful HTTP status alone does not establish a valid score.
function parseProxyCheck(body,target,now){
  if(!object(body)||!["ok","warning"].includes(body.status)||!target||publicIP(target)!==target)return {record:null,invalid:false};
  if(body.status==="warning"&&typeof body.message==="string"&&/disabled|violation|invalid.{0,12}key/i.test(body.message))return {record:null,invalid:false};
  const matches=Object.keys(body).filter(k=>publicIP(k)===target);
  if(matches.length!==1)return {record:null,invalid:true};
  const row=body[matches[0]],d=row?.detections;
  if(!object(row)||!object(d)||score(d.risk)===null)return {record:null,invalid:true};
  const flags=["proxy","vpn","compromised","scraper","tor","hosting","anonymous"];
  if(!flags.every(k=>typeof d[k]==="boolean"))return {record:null,invalid:true};
  const positive=flags.filter(k=>k!=="hosting").some(k=>d[k]===true);
  const history=row.detection_history;
  // A delisted positive detection, or a future timestamp, is contradictory.
  // Never turn a contradictory record into a definitive score.
  if(object(history)&&history.delisted===true&&positive)return {record:null,invalid:true};
  if((d.proxy||d.vpn||d.tor)&&!d.anonymous)return {record:null,invalid:true};
  if((positive||d.hosting)&&d.risk===0)return {record:null,invalid:true};
  const stamp=row.last_updated;
  if(typeof stamp!=="string"||!/^\d{4}-\d{2}-\d{2}T.*Z$/.test(stamp)||!Number.isFinite(Date.parse(stamp))||Date.parse(stamp)>now+300000)return {record:null,invalid:true};
  // last_updated is provider database metadata, not a guarantee of fresh observation.
  // Accept at most 24h-old metadata; do not extend the provider's default detection TTL.
  if(now-Date.parse(stamp)>86400000)return {record:null,invalid:true};
  return {record:row,invalid:false};
}
function proxyGate(ctx,now,hasKey){
  const day=new Date(now).toISOString().slice(0,10),limit=hasKey?800:80;
  let old=null;try{old=ctx.storage.getJSON(PROXY_BUDGET)}catch(_){}
  let count=old?.day===day&&Number.isInteger(old.count)&&old.count>=0?old.count:0;
  let blockedUntil=Number.isFinite(old?.blockedUntil)&&old.blockedUntil>now&&old.blockedUntil<=now+86400000?old.blockedUntil:0;
  const save=(n,b)=>{try{ctx.storage.setJSON(PROXY_BUDGET,{day,count:n,blockedUntil:b})}catch(_){}};
  if(blockedUntil||count>=limit)return {allow:false,block:()=>{}};
  count++;save(count,0);
  return {allow:true,block:ms=>save(count,now+Math.max(60000,Math.min(86400000,ms)))};
}
function retryAfter(resp,now){
  try{
    const h=resp.headers,v=typeof h?.get==="function"?h.get("retry-after"):h?.["retry-after"]??h?.["Retry-After"];
    if(typeof v==="string"&&/^\d+$/.test(v))return +v*1000;
    const t=Date.parse(v);return Number.isFinite(t)&&t>now?t-now:3600000;
  }catch(_){return 3600000}
}
async function proxyJSON(ctx,target,policy,now){
  if(!target)return {record:null,invalid:false};
  const localKey=typeof ctx.env?.PROXYCHECK_KEY==="string"?ctx.env.PROXYCHECK_KEY.trim():"";
  const key=/^[A-Za-z0-9-]{12,128}$/.test(localKey)?localKey:"";
  const gate=proxyGate(ctx,now,!!key);
  if(!gate.allow)return {record:null,invalid:false};
  try{
    const url=PROXY_BASE+encodeURIComponent(target)+"?tag=0"+(key?"&key="+encodeURIComponent(key):"");
    const r=await ctx.http.get(url,{headers:{"User-Agent":"Egern-NodeVitals/3.0","Accept":"application/json","Cache-Control":"no-cache, no-store","Pragma":"no-cache"},timeout:4000,credentials:"omit",insecureTls:false,redirect:"error",...(policy?{policy}:{})});
    if([401,403,429].includes(r.status)){gate.block(Math.max(3600000,retryAfter(r,now)));return {record:null,invalid:false}}
    if(r.status!==200)return {record:null,invalid:false};
    if((ageHeader(r)??0)>900)return {record:null,invalid:true};
    const body=await r.text();if(typeof body!=="string"||body.length>200000)return {record:null,invalid:true};
    const result=JSON.parse(body);
    if(result?.status==="denied"){gate.block(3600000);return {record:null,invalid:false}}
    if(result?.status==="warning"&&typeof result.message==="string"&&/query limit|allowance|exhausted/i.test(result.message))gate.block(3600000);
    return parseProxyCheck(result,target,now);
  }catch(_){return {record:null,invalid:false}}
}
async function ipJSON(ctx,url,policy){
  try{
    const r=await ctx.http.get(url,{headers:{"User-Agent":"Egern-NodeVitals/3.0","Accept":"application/json","Cache-Control":"no-cache, no-store","Pragma":"no-cache"},timeout:4000,credentials:"omit",insecureTls:false,redirect:"error",...(policy?{policy}:{})});
    if(r.status!==200)return null;
    // Caller-IP endpoints must not replay a shared CDN response for a prior request.
    if((url===PURE_URL||url===QUERY_URL)&&(ageHeader(r)??0)>0)return null;
    const body=await r.text();if(typeof body!=="string"||body.length>200000)return null;
    const data=JSON.parse(body);return object(data)&&publicIP(data.ip)?data:null;
  }catch(_){return null}
}
async function measureNode(ctx,now=Date.now()){
  // Anchor all fields to one address: IPPure observes the current connection;
  // IPQuery /:ip describes that address, regardless of its own request route.
  // No persisted IP or risk scores. Reject any lookup returned for another IP.
  const policy=cleanIPText(ctx.env?.NODE_POLICY);
  const pure=await ipJSON(ctx,PURE_URL,policy);
  const p=pure;let q=null,target=publicIP(p?.ip),observed=cleanIPText(p?.ip);
  if(!target){
    const caller=await ipJSON(ctx,QUERY_URL,policy);
    target=publicIP(caller?.ip);observed=cleanIPText(caller?.ip);
    if(target&&riskRecord(caller))q=caller;
  }
  const [lookup,proxyResult]=await Promise.all([
    target&&!q?ipJSON(ctx,QUERY_BASE+target,policy):Promise.resolve(q),
    proxyJSON(ctx,target,policy,now)
  ]);
  if(target&&publicIP(lookup?.ip)===target)q=lookup;
  const pc=proxyResult.record,d=pc?.detections||{},type=pc?.network?.type;
  const r=object(q?.risk)?q.risk:{},ps=pureScore(p,target),qs=score(r.risk_score),pcs=score(d.risk);
  // Proxycheck v3 is the primary source when its actual response is valid.
  // IPPure IPv4 is a named fallback. IPQuery never supplies a purity number.
  const selected=pcs!==null?pcs:ps,source=pcs!==null?"Proxycheck":ps!==null?"IPPure":null;
  const purity=selected!==null?Math.round((100-selected)*100)/100:null;
  const purityNote=source==="Proxycheck"?"":source==="IPPure"?"IPPure参考":target?.includes(":")?"IPv6评分暂缺":"评分暂缺";
  const dc=p?.isDataCenter===true||r.is_datacenter===true||d.hosting===true||type==="Hosting";
  const res=p?.isResidential===true||type==="Residential";
  const typeConflict=dc&&res||p?.isResidential===false&&type==="Residential";
  const property=typeConflict?"有差异":dc?"机房":res?"住宅":r.is_mobile===true||type==="Wireless"?"移动":type==="Business"?"商用":p?.isResidential===false?"非住宅":"未知";
  const complete=["is_vpn","is_proxy","is_tor","is_datacenter"].every(k=>typeof r[k]==="boolean")&&qs!==null;
  const scoreConflict=pcs!==null&&ps!==null&&Math.abs(pcs-ps)>=30;
  const flagsConflict=!!pc&&d.anonymous===false&&(r.is_vpn===true||r.is_proxy===true||r.is_tor===true)||!!pc&&d.tor===true&&r.is_tor===false;
  const riskNote=proxyResult.invalid?"记录有差异":scoreConflict?"评分有差异":typeConflict||flagsConflict?"来源有差异":null;
  let riskLevel="未知";
  // Different provider scales remain distinct; positive risk evidence is not averaged away.
  if(d.tor===true||d.compromised===true||d.proxy===true||pcs!==null&&pcs>75||r.is_tor===true||r.is_vpn===true&&r.is_proxy===true||[ps,qs].some(v=>v!==null&&v>=65))riskLevel="高";
  else if(dc||d.vpn===true||d.anonymous===true||d.scraper===true||pcs!==null&&pcs>25||r.is_vpn===true||r.is_proxy===true||[ps,qs].some(v=>v!==null&&v>=25))riskLevel="中";
  else if(!riskNote&&((complete&&ps!==null)||(pc&&complete)||(pc&&ps!==null))&&property!=="有差异")riskLevel="低";
  const cc=cleanIPText(p?.countryCode||pc?.location?.country_code||q?.location?.country_code||q?.location?.countryCode).toUpperCase();
  const region=COUNTRY_ZH[cc]||cleanIPText(pc?.location?.country_name||q?.location?.country||p?.country)||"未知";
  const quality=!target?"offline":(p&&q||pc&&(p||q))?"verified":"single";
  return {exitIP:observed||"获取失败",region,purity,property,riskLevel,purityLabel:"纯度",purityNote,riskNote,puritySource:source,rawFraudScore:ps,proxycheckRiskScore:pcs,ipqueryRiskScore:qs,quality};
}
export default async function (ctx,clock=Date.now()) {
  const family = String(ctx.widgetFamily || 'systemMedium').toLowerCase();
  const isSmall = family.includes('small');
  const isLarge = family.includes('large');

  const C = {
    bg: [{ light: '#FAFAFA', dark: '#1C1C1E' }, { light: '#EFEFF4', dark: '#111113' }],
    card: { light: '#FFFFFF', dark: '#2C2C2E' },
    main: { light: '#1C1C1E', dark: '#F2F2F7' },
    muted: { light: '#8E8E93', dark: '#8E8E93' },
    green: { light: '#1E7E44', dark: '#30D158' },
    pink: { light: '#DB2777', dark: '#F472B6' },
    red: { light: '#C0392B', dark: '#FF453A' },
    divider: { light: '#E5E5EA', dark: '#38383A' }
  };

  const backgroundGradient = {
    type: 'linear', colors: C.bg,
    startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 }
  };

  const text = (value, size, weight, color, opts = {}) => ({
    type: 'text', text: String(value ?? ''), font: { size, weight }, textColor: color, ...opts
  });
  const row = (children, gap = 4, opts = {}) => ({
    type: 'stack', direction: 'row', alignItems: 'center', gap, children, ...opts
  });
  const icon = (name, color, size) => ({
    type: 'image', src: `sf-symbol:${name}`, color, width: size, height: size
  });
  const spacer = length => length == null ? { type: 'spacer' } : { type: 'spacer', length };
  const divider = () => ({ type: 'stack', height: 0.5, backgroundColor: C.divider, borderRadius: 1, children: [] });

  const internalIP=cleanIPText(ctx.device?.ipv4?.address)||"未连接";
  const {exitIP,region:country,purity,property,riskLevel,purityLabel,purityNote,riskNote,quality}=await measureNode(ctx,clock);
  const refreshAfter=new Date(clock+(quality==="verified"&&purity!==null?30:15)*60000).toISOString();

  const purityColor = purity == null ? C.muted : purity >= 90 ? C.green : purity >= 80 ? C.pink : C.red;
  const propertyColor=property==='机房'||property==='非住宅'?C.red:property==='住宅'||property==='移动'?C.green:C.muted;
  const riskColor=riskLevel==='高'?C.red:riskLevel==='中'?C.pink:riskLevel==='低'?C.green:C.muted;

  const cards = [
    { label: purityLabel, value: purity == null ? '--' : String(purity), color: purityColor, note: purityNote },
    { label: '属性', value: property, color: propertyColor },
    { label: '风险', value: riskLevel, color: riskColor, note: riskNote }
  ];

  const buildCard = (item, cfg) => ({
    type: 'stack', direction: 'column', alignItems: 'center', flex: 1,
    backgroundColor: C.card, borderRadius: cfg.radius, padding: cfg.padding,
    children: [
      spacer(),
      text(item.label, cfg.labelSize, 'bold', item.color, { maxLines: 1, minScale: 0.75 }),
      spacer(cfg.gap),
      text(item.value, cfg.valueSize, 'heavy', item.color, { maxLines: 1, minScale: 0.55 }),
      ...(item.note?[spacer(2),text(item.note,Math.max(7,cfg.labelSize-2),'medium',C.muted,{maxLines:1,minScale:0.6})]:[]),
      spacer()
    ]
  });

  const header = (iconSize, titleSize, regionSize) => row([
    icon('checkmark.shield.fill', C.green, iconSize),
    spacer(3),
    text('节点体检', titleSize, 'heavy', C.main),
    spacer(),
    text(country, regionSize, 'heavy', country==='未知'?C.muted:C.green, { maxLines: 1, minScale: 0.65 })
  ], 0);

  const ipInline = (label, value, size) => row([
    text(label, size, 'medium', C.muted, { maxLines: 1 }),
    spacer(4),
    text(value, size, 'bold', C.main, { maxLines: 1, minScale: 0.58 })
  ], 0);

  const centeredBody = (cfg, gap, height) => ({
    type: 'stack', direction: 'column', flex: 1,
    children: [
      spacer(),
      row(cards.map(x => buildCard(x, cfg)), gap, { height }),
      spacer()
    ]
  });

  if (isSmall) {
    const cfg = { radius: 10, padding: [7, 2, 7, 2], labelSize: 9, valueSize: 14, gap: 3 };
    return {
      type: 'widget', refreshAfter, padding: 12, backgroundGradient,
      children: [
        header(14, 13, 10),
        centeredBody(cfg, 6, 62),
        row([
          ipInline('内网 IP', internalIP, 7),
          spacer(),
          ipInline('出口 IP', exitIP, 7)
        ], 0)
      ]
    };
  }

  if (isLarge) {
    const cfg = { radius: 14, padding: [16, 6, 16, 6], labelSize: 14, valueSize: 28, gap: 8 };
    return {
      type: 'widget', refreshAfter, padding: 16, backgroundGradient,
      children: [
        header(18, 17, 14),
        centeredBody(cfg, 12, 140),
        row([
          ipInline('内网 IP', internalIP, 11),
          spacer(),
          ipInline('出口 IP', exitIP, 11)
        ], 0)
      ]
    };
  }

  const cfg = { radius: 12, padding: [11, 5, 11, 5], labelSize: 11, valueSize: 21, gap: 4 };
  return {
    type: 'widget', refreshAfter, padding: 13, backgroundGradient,
    children: [
      header(16, 15, 12),
      centeredBody(cfg, 8, 78),
      row([
        ipInline('内网 IP', internalIP, 9),
        spacer(),
        ipInline('出口 IP', exitIP, 9)
      ], 0)
    ]
  };
}
