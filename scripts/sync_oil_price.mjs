// Node.js 24 LTS, no third-party dependencies. Same parsers as Egern.
import {readFile,writeFile,rename} from "node:fs/promises";
const dir = new URL("../Egern/Widget/OilPriceGD/", import.meta.url);
const code = await readFile(new URL("OilPriceGD.js",dir),"utf8");
const api = await import("data:text/javascript;base64,"+Buffer.from(code+"\nexport {collectSnapshot,normalize,state,bj,SEED,refreshHolidayYears,publicationDecision};").toString("base64"));
const file=new URL("prices.json",dir);
const now=Date.now(),today=api.bj(now);
const original=JSON.parse(await readFile(file,"utf8"));
if(!api.normalize(original,today))throw Error("Existing snapshot invalid; refuse overwrite");
async function get(url){
  const response=await fetch(url,{signal:AbortSignal.timeout(9000),headers:{"User-Agent":"Mozilla/5.0","Accept":"text/html,application/json,*/*","Cache-Control":"no-cache"},redirect:"follow"});
  if(!response.ok||!response.url.startsWith("https://"))throw Error("HTTP "+response.status);
  const requestHost=new URL(url).hostname,finalHost=new URL(response.url).hostname;
  if(["www.gov.cn","sousuo.www.gov.cn","www.ndrc.gov.cn","drc.gd.gov.cn"].includes(requestHost)&&finalHost!==requestHost)throw Error("Unexpected official redirect");
  const reader=response.body.getReader();let size=0;const chunks=[];
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>4000000)throw Error("oversized response");chunks.push(value)}}
  finally{await reader.cancel().catch(()=>{})}
  return Buffer.concat(chunks).toString("utf8");
}
const holidayYears=await api.refreshHolidayYears(get,original.holidayYears,today);
const result=await api.collectSnapshot(get,{...original,holidayYears},now);
if(!api.normalize(result.snapshot,today))throw Error("Invalid output");
console.log(JSON.stringify(result.diagnostics));
const decision=api.publicationDecision(original,result,today);
if(!decision.publish)throw Error(decision.reason);
if(decision.calendarOnly)console.warn("Publishing verified calendar metadata; existing prices retained/stale status preserved");
const next=JSON.stringify(result.snapshot,null,2)+"\n";
if(JSON.stringify(original)===JSON.stringify(result.snapshot)){console.log("No price changes");process.exit(0)}
const tmp=new URL("prices.json.tmp",dir);
await writeFile(tmp,next,"utf8");await rename(tmp,file);
console.log("Validated snapshot updated",result.snapshot.records[0].date);
