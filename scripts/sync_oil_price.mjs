// Node.js 24 LTS, no third-party dependencies. Same parsers as Egern.
import {readFile,writeFile,rename} from "node:fs/promises";
const dir = new URL("../Egern/Widget/OilPriceGD/", import.meta.url);
const code = await readFile(new URL("OilPriceGD.js",dir),"utf8");
const api = await import("data:text/javascript;base64,"+Buffer.from(code+"\nexport {collectSnapshot,normalize,state,bj,SEED};").toString("base64"));
const file=new URL("prices.json",dir);
const now=Date.now(),today=api.bj(now);
const original=JSON.parse(await readFile(file,"utf8"));
if(!api.normalize(original,today))throw Error("Existing snapshot invalid; refuse overwrite");
async function get(url){
  const response=await fetch(url,{signal:AbortSignal.timeout(9000),headers:{"User-Agent":"Mozilla/5.0","Accept":"text/html,application/json,*/*","Cache-Control":"no-cache"},redirect:"follow"});
  if(!response.ok||!response.url.startsWith("https://"))throw Error("HTTP "+response.status);
  const reader=response.body.getReader();let size=0;const chunks=[];
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>4000000)throw Error("oversized response");chunks.push(value)}}
  finally{await reader.cancel().catch(()=>{})}
  return Buffer.concat(chunks).toString("utf8");
}
const result=await api.collectSnapshot(get,original,now);
if(!api.normalize(result.snapshot,today))throw Error("Invalid output");
console.log(JSON.stringify(result.diagnostics));
if(![result.diagnostics.government,result.diagnostics.mirror,result.diagnostics.national,result.diagnostics.qq,result.diagnostics.sou,result.diagnostics.bear].some(Boolean))throw Error("All sources unavailable; retain previous snapshot and report failure");
if(result.diagnostics.stale)throw Error("New cycle not confirmed; preserve old published snapshot and fail visibly");
const next=JSON.stringify(result.snapshot,null,2)+"\n";
if(JSON.stringify(original)===JSON.stringify(result.snapshot)){console.log("No price changes");process.exit(0)}
const tmp=new URL("prices.json.tmp",dir);
await writeFile(tmp,next,"utf8");await rename(tmp,file);
console.log("Validated snapshot updated",result.snapshot.records[0].date);
