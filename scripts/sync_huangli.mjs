// Refresh the verified current and next Beijing calendar months; never overwrite with missing data.
import {readFile,writeFile,rename} from "node:fs/promises";
const file=new URL("../Egern/Widget/HuangliQuery/HuangliQuery.js",import.meta.url);
const code=await readFile(file,"utf8");
const pattern=/const BUNDLED_CALENDAR = [^\r\n]*; \/\/ BUNDLED_CALENDAR_END/;
if(!pattern.test(code))throw Error("Calendar marker missing");
const api=await import("data:text/javascript;base64,"+Buffer.from(code+"\nexport {BUNDLED_CALENDAR,fullDay};").toString("base64"));
const today=new Date(Date.now()+8*3600000);
const updated={};let missing=0;
for(let offset=0;offset<=1;offset++){
 const date=new Date(Date.UTC(today.getUTCFullYear(),today.getUTCMonth()+offset,1));
 const y=date.getUTCFullYear(),m=date.getUTCMonth()+1,month=y+"-"+String(m).padStart(2,"0"),last=new Date(Date.UTC(y,m,0)).getUTCDate();
 const cache=new Map(),responses=new Map();
 const ctx={widgetFamily:"systemMedium",storage:{getJSON:k=>cache.get(k),setJSON:(k,v)=>cache.set(k,v)},http:{get:async(u,o)=>{
  if(responses.has(u))return responses.get(u);
  const job=(async()=>{const r=await fetch(u,{headers:o.headers,signal:AbortSignal.timeout(o.timeout),redirect:"error"});const text=await r.text();if(text.length>2000000)throw Error("Oversized response");return {status:r.status,text:async()=>text}})();
  responses.set(u,job);return job;
 }}};
 for(let n=1;n<=last;n++){
  const key=month+"-"+String(n).padStart(2,"0");let found=null;
  await api.default(ctx,Date.parse(key+"T12:00:00+08:00"),{bundle:false,capture:r=>{if(api.fullDay(r.day))found=r.day}});
  if(found)updated[key]=found;
  else if(api.fullDay(api.BUNDLED_CALENDAR[key]))updated[key]=api.BUNDLED_CALENDAR[key];
  else {missing++;console.warn("Missing verified calendar:",key)}
 }
}
const key=today.toISOString().slice(0,10);
if(!api.fullDay(updated[key]))throw Error("Current day not verified; preserving published script");
if(missing)throw Error("Calendar coverage incomplete ("+missing+" days); preserving published script and retrying next run");
const next=code.replace(pattern,()=>"const BUNDLED_CALENDAR = "+JSON.stringify(updated)+"; // BUNDLED_CALENDAR_END");
if(next===code){console.log("No calendar changes");process.exit(0)}
const tmp=new URL("HuangliQuery.js.tmp",file);await writeFile(tmp,next,"utf8");await rename(tmp,file);console.log("Calendar days:",Object.keys(updated).length);
