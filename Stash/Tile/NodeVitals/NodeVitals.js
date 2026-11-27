/**
 * 节点体检 · NodePulse for Stash v2.0
 * Derived from Egern NodeVitals v2.0 (same score precedence and thresholds).
 * Native Tile: no MITM, no cron, no persistent IP cache; 10s request timeout, one bounded transient retry.
 * Collapsed Tile: Stash routes requests through the node under test.
 * Ref: https://stash.wiki/script/tile
 *      https://stash.wiki/script/syntax-and-interface
 *      https://ippure.com/MyIP-Info-API
 */
(function(){
"use strict";
const COUNTRY_ZH = {
    US:'美国', CA:'加拿大', GB:'英国', DE:'德国', FR:'法国', NL:'荷兰', BE:'比利时',
    JP:'日本', KR:'韩国', SG:'新加坡', HK:'中国香港', MO:'中国澳门', TW:'中国台湾', CN:'中国',
    AU:'澳大利亚', NZ:'新西兰', IN:'印度', MY:'马来西亚', TH:'泰国', VN:'越南', PH:'菲律宾',
    ID:'印度尼西亚', RU:'俄罗斯', UA:'乌克兰', CH:'瑞士', SE:'瑞典', NO:'挪威', FI:'芬兰',
    DK:'丹麦', IT:'意大利', ES:'西班牙', PT:'葡萄牙', PL:'波兰', IE:'爱尔兰', AE:'阿联酋',
    TR:'土耳其', BR:'巴西', MX:'墨西哥', AR:'阿根廷', CL:'智利', ZA:'南非', IL:'以色列'
  };
const COLORS={green:"#1E7E44",pink:"#DB2777",red:"#C0392B",gray:"#8E8E93"};
const PURE="https://my.ippure.com/v1/info";
const IPIFY="https://api64.ipify.org?format=json";
const QUERY="https://api.ipquery.io/";
const clean=v=>typeof v==="string"?v.trim().replace(/\s+/g," "):"";
function score(v){
 // Missing/null/empty/boolean is NOT a real zero.
 if(typeof v!=="number"&&!(typeof v==="string"&&/^\d+(?:\.\d+)?$/.test(v.trim())))return null;
 const n=Number(v);return Number.isFinite(n)&&n>=0&&n<=100?n:null;
}
function ipv4(v){
 if(!/^(?:\d{1,3}\.){3}\d{1,3}$/.test(v))return "";
 const parts=v.split(".").map(Number);
 return parts.every(n=>n>=0&&n<=255)?parts.join("."):"";
}
function canonicalIP(v){
 let s=clean(v).toLowerCase();
 if(!s||s.length>64)return "";
 if(!s.includes(":"))return ipv4(s);
 // Support compressed and expanded IPv6, including embedded IPv4.
 if(s.includes(".")){
  const i=s.lastIndexOf(":"),a=ipv4(s.slice(i+1));
  if(!a)return "";
  const b=a.split(".").map(Number);
  s=s.slice(0,i+1)+((b[0]<<8)|b[1]).toString(16)+":"+((b[2]<<8)|b[3]).toString(16);
 }
 if(!/^[0-9a-f:]+$/.test(s))return "";
 const halves=s.split("::");if(halves.length>2)return "";
 const parse=x=>x?x.split(":"):[];
 const a=parse(halves[0]),b=halves.length===2?parse(halves[1]):[];
 if([...a,...b].some(x=>!/^[0-9a-f]{1,4}$/.test(x)))return "";
 if(halves.length===1&&a.length!==8)return "";
 if(halves.length===2&&a.length+b.length>=8)return "";
 const words=halves.length===2?[...a,...Array(8-a.length-b.length).fill("0"),...b]:a;
 return words.map(x=>parseInt(x,16).toString(16).padStart(4,"0")).join(":");
}
const REQUEST_TIMEOUT=10,TOTAL_MS=28000;
function requestJSON(url,deadline){
 const remaining=Math.floor((deadline-Date.now())/1000);
 if(remaining<1)return Promise.resolve({data:null,retryable:false});
 const timeout=Math.min(REQUEST_TIMEOUT,remaining);
 return new Promise(resolve=>{
  let finished=false;
  const finish=(data,retryable=false)=>{if(!finished){finished=true;resolve({data,retryable})}};
  try{
   if(typeof setTimeout==="function")setTimeout(()=>finish(null,true),timeout*1000+100);
   $httpClient.get({
    url,headers:{"User-Agent":"Mozilla/5.0","Accept":"application/json","Cache-Control":"no-cache"},
    timeout,insecure:false,"auto-cookie":false,"auto-redirect":false
   },(error,response,body)=>{
    try{
     if(error)return finish(null,true);
     const status=Number(response?.status??response?.statusCode);
     if(status!==200)return finish(null,status===408||status===425||status>=500&&status<=599);
     if(typeof body!=="string"||body.length>1000000)return finish(null);
     const value=JSON.parse(body);
     finish(value&&typeof value==="object"&&!Array.isArray(value)?value:null);
    }catch(_){finish(null)}
   });
  }catch(_){finish(null,true)}
 });
}
async function getJSON(url,deadline,budget){
 const first=await requestJSON(url,deadline);
 // One retry shared by the entire run. Do not retry HTTP 429 or 4xx
 // restrictions. Keep time available for the exit-IP fallback.
 if(first.retryable&&budget.retries>0&&deadline-Date.now()>=4000){
  budget.retries--;
  return (await requestJSON(url,deadline)).data;
 }
 return first.data;
}
function evaluate(pure,query,ip){
 // IPPure is authoritative only when its response identifies the tested IP.
 const target=canonicalIP(ip);
 const p=target&&canonicalIP(pure?.ip)===target?pure:{};
 // Ignore a mismatched or malformed IPQuery response.
 const q=target&&canonicalIP(query?.ip)===target?query:{};
 const risk=q.risk&&typeof q.risk==="object"?q.risk:{};
 const fraud=score(p.fraudScore),fallback=score(risk.risk_score);
 const purity=fraud!==null?Math.round(100-fraud):fallback!==null?Math.round(100-fallback):null;
 // Same positive machine-room criteria as the Egern version.
 const dc=p.isDataCenter===true||risk.is_datacenter===true||p.isResidential===false;
 const property=dc?"机房":p.isResidential===true?"住宅":risk.is_datacenter===false?"非机房":"未知";
 const vpn=risk.is_vpn===true,proxy=risk.is_proxy===true,tor=risk.is_tor===true;
 const knownFlags=["is_vpn","is_proxy","is_tor","is_datacenter"].every(k=>typeof risk[k]==="boolean");
 const level=tor||(vpn&&proxy)||(purity!==null&&purity<35)?"高":
  dc||vpn||proxy||(purity!==null&&purity<75)?"中":
  purity!==null||knownFlags?"低":"未知";
 const cc=clean(p.countryCode||q.location?.country_code||q.location?.countryCode).toUpperCase();
 const country=COUNTRY_ZH[cc]||clean(q.location?.country||p.country)||"未知";
 // Stash has one background color, unlike Egern's separate cards:
 // pick the most severe known signal, neutral gray for absent information.
 const backgroundColor=level==="高"||dc||(purity!==null&&purity<80)?COLORS.red:
  level==="中"||(purity!==null&&purity<90)?COLORS.pink:
  purity===null||property==="未知"||level==="未知"?COLORS.gray:COLORS.green;
 return {purity,property,level,country,backgroundColor};
}
function render(result,ip){
 const quality=result.purity===null?"--":String(result.purity);
 return {title:"节点体检 · "+result.country,
  content:"纯度"+quality+"·"+result.property+"·"+result.level,
  icon:"checkmark.shield.fill",backgroundColor:result.backgroundColor};
}
function failed(message){return {title:"节点体检",content:message,icon:"checkmark.shield.fill",backgroundColor:COLORS.gray}}
async function run(){
 const deadline=Date.now()+TOTAL_MS,budget={retries:1};
 // Give IPPure a bounded sub-budget so fallback IP and IPQuery are not starved.
 const pure=await getJSON(PURE,Math.min(deadline,Date.now()+18000),budget);
 let ip=canonicalIP(pure?.ip)?clean(pure.ip):"";
 if(!ip){
  const fallback=await getJSON(IPIFY,deadline,budget);
  ip=canonicalIP(fallback?.ip)?clean(fallback.ip):"";
 }
 if(!ip)return render(evaluate(null,null,""),"");
 const query=await getJSON(QUERY+encodeURIComponent(ip)+"?format=json",deadline,budget);
 return render(evaluate(pure,query,ip),ip);
}
run().then(value=>$done(value),()=>$done(failed("暂时无法检测")));
})();
