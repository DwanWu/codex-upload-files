/**
 * 智能检测 · Stash 首页面板 v2.0
 * Read-only HTTPS probes of the three official model-list APIs.
 * ✓ = verified service response (including expected authentication error),
 * ! = restricted/rate-limited, × = failed/unavailable, ? = unverified.
 * Reachability is NOT account access, model authorization or region unlocking.
 * No API key, cookie, login, chat completion, persistent cache or MITM.
 */
(function(){
"use strict";
const SERVICES=[
 {name:"ChatGPT",group:"ChatGPT",url:"https://api.openai.com/v1/models"},
 {name:"Claude",group:"Claude",url:"https://api.anthropic.com/v1/models?limit=1",headers:{"anthropic-version":"2023-06-01"}},
 {name:"Gemini",group:"Google",url:"https://generativelanguage.googleapis.com/v1beta/models?pageSize=1"}
];
const COLORS={green:"#1E7E44",amber:"#B7791F",red:"#C0392B",gray:"#8E8E93"};
const ICON="brain.head.profile";
const symbols={ok:"✓",restricted:"!",failed:"×",unknown:"?"};
function asObject(s){
 if(typeof s!=="string"||!s.trim()||s.length>300000)return null;
 try{const v=JSON.parse(s);return v&&typeof v==="object"&&!Array.isArray(v)?v:null}catch(_){return null}
}
function groupMap(){
 // Defaults match the user's Stash profile. An override may specify other
 // group names. Invalid/missing overrides do not silently select DIRECT.
 const groups=Object.fromEntries(SERVICES.map(s=>[s.name,s.group]));
 if(typeof $argument==="undefined")return groups;
 try{
  const value=JSON.parse($argument);
  if(!value||typeof value!=="object"||Array.isArray(value))return null;
  for(const s of SERVICES){
   if(Object.hasOwnProperty.call(value,s.name)){
    const v=value[s.name];
    if(typeof v!=="string"||!v.trim()||v.length>128||/[\u0000-\u001f\u007f]/u.test(v))return null;
    groups[s.name]=v.trim();
   }
  }
  return groups;
 }catch(_){return null}
}
function classify(name,status,body){
 if(!Number.isInteger(status)||status<100||status>599)return "unknown";
 const payload=asObject(body),e=payload?.error;
 const err=e&&typeof e==="object"?e:{};
 const message=typeof err.message==="string"?err.message.toLowerCase():"";
 const code=String(err.code??"").toLowerCase(),kind=String(err.type??"").toLowerCase();
 const reasons=Array.isArray(err.details)?err.details.map(x=>String(x?.reason??"").toUpperCase()):[];
 // Explicit region restriction takes priority over authentication responses.
 if(/unsupported_country|unsupported_region|country_not_supported|region_not_supported|location_not_supported/.test(code)||
    reasons.some(x=>/LOCATION_NOT_SUPPORTED|REGION_NOT_SUPPORTED|COUNTRY_NOT_SUPPORTED/.test(x))||
    /(?:country|region|territory|location).{0,50}(?:not supported|unsupported|not available|not allowed|restricted)|not (?:available|supported|allowed) (?:in|from) (?:your|this|the) (?:country|region|territory|location)/i.test(message))return "restricted";
 if(status===451||status===429)return "restricted";
 // Do not count arbitrary HTML, redirects, WAF pages, synthetic 200/204,
 // unknown 401 or arbitrary 400/403 as successful probes.
 if(status>=200&&status<300){
  if(name==="Gemini")return Array.isArray(payload?.models)?"ok":"unknown";
  return Array.isArray(payload?.data)?"ok":"unknown";
 }
 if(name==="ChatGPT"&&status===401&&(
   code==="invalid_api_key"||code==="missing_api_key"||
   (["invalid_request_error","authentication_error"].includes(kind)&&/api key|authorization|bearer|authentication/.test(message))))return "ok";
 if(name==="Claude"&&status===401&&kind==="authentication_error"&&
   /api.?key|authorization|authentication|bearer|credential/.test(message))return "ok";
 if(name==="Gemini"&&[400,401,403].includes(status)&&Number(err.code)===status){
  const googleStatus=String(err.status??"");
  if(["PERMISSION_DENIED","UNAUTHENTICATED","INVALID_ARGUMENT"].includes(googleStatus)&&
    (reasons.includes("API_KEY_INVALID")||reasons.includes("API_KEY_MISSING")||
    /unregistered caller|without established identity|api key (?:not valid|required|is required|is missing)|(?:pass|provide|use) (?:an? |a valid )?api key|missing (?:a |an? valid )?(?:api key|authentication credential)|expected oauth 2 access token|invalid authentication credentials/.test(message)))return "ok";
 }
 if(status===403)return "restricted";
 if(status>=500||status===408)return "failed";
 return "unknown";
}
function probe(service,group){
 return new Promise(resolve=>{
  let finished=false;
  const finish=result=>{if(!finished){finished=true;resolve(result)}};
  try{
   // Explicitly use the respective existing business policy group. Stash
   // consumes this documented header; it is not an API authorization token.
   $httpClient.get({
    url:service.url,headers:{"Accept":"application/json","Cache-Control":"no-cache",...service.headers,"X-Stash-Selected-Proxy":encodeURIComponent(group)},
    timeout:15,insecure:false,"auto-cookie":false,"auto-redirect":false
   },(error,response,body)=>{
    try{
     if(error)return finish("failed");
     finish(classify(service.name,Number(response?.status??response?.statusCode),body));
    }catch(_){finish("unknown")}
   });
  }catch(_){finish("failed")}
 });
}
function panel(results){
 const count=results.filter(x=>x==="ok").length;
 const color=count===3?COLORS.green:results.every(x=>x==="failed")?COLORS.red:results.every(x=>x==="unknown")?COLORS.gray:COLORS.amber;
 return {title:"智能检测·"+count+"/3",
  content:SERVICES.map((s,i)=>s.name+(symbols[results[i]]||"?")).join("·"),
  icon:ICON,backgroundColor:color};
}
async function run(){
 const groups=groupMap();
 if(!groups)return panel(SERVICES.map(()=>"unknown"));
 const results=await Promise.all(SERVICES.map(s=>probe(s,groups[s.name])));
 return panel(results);
}
run().then(x=>$done(x),()=>$done(panel(SERVICES.map(()=>"unknown"))));
})();
