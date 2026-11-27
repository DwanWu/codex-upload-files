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
const PURE_URL="https://my.ippure.com/v1/info",QUERY_BASE="https://api.ipquery.io/",QUERY_URL=QUERY_BASE+"?format=json";
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
function score(v){return typeof v==="number"&&Number.isFinite(v)&&v>=0&&v<=100?v:null}
function cleanIPText(v){return typeof v==="string"?v.replace(/[\u0000-\u001f\u007f]/g," ").trim().slice(0,100):""}
async function ipJSON(ctx,url,policy){
  try{
    const r=await ctx.http.get(url,{headers:{"User-Agent":"Egern-NodeVitals/2.1","Accept":"application/json","Cache-Control":"no-cache"},timeout:4000,credentials:"omit",insecureTls:false,redirect:"error",...(policy?{policy}:{})});
    if(r.status!==200)return null;const body=await r.text();if(typeof body!=="string"||body.length>200000)return null;
    const data=JSON.parse(body);return data&&typeof data==="object"&&!Array.isArray(data)&&canonIP(data.ip)?data:null;
  }catch(_){return null}
}
async function measureNode(ctx){
  // Anchor all fields to one address: IPPure observes the current connection;
  // IPQuery /:ip describes that address, regardless of its own request route.
  // No persisted IP or risk scores. Reject any lookup returned for another IP.
  const policy=cleanIPText(ctx.env?.NODE_POLICY);
  const pure=await ipJSON(ctx,PURE_URL,policy);
  let p=pure,q=null,target=canonIP(p?.ip),observed=cleanIPText(p?.ip);
  if(!target){
    const caller=await ipJSON(ctx,QUERY_URL,policy);
    target=canonIP(caller?.ip);observed=cleanIPText(caller?.ip);
    if(target&&caller?.risk&&typeof caller.risk==="object")q=caller;
  }
  if(target&&!q){
    // Canonical IPv6 is safe as a URL path segment (RFC 3986 pchar allows ":").
    const result=await ipJSON(ctx,QUERY_BASE+target,policy);
    if(canonIP(result?.ip)===target)q=result;
  }
  const r=q?.risk||{},ps=score(p?.fraudScore),qs=score(r.risk_score);
  const purity=ps!==null?Math.round(100-ps):qs!==null?Math.round(100-qs):null;
  const dc=p?.isDataCenter===true||r.is_datacenter===true,res=p?.isResidential===true;
  const property=dc&&res?"有差异":dc?"机房":res?"住宅":r.is_mobile===true?"移动":p?.isResidential===false?"非住宅":"未知";
  const complete=["is_vpn","is_proxy","is_tor","is_datacenter"].every(k=>typeof r[k]==="boolean")&&qs!==null;
  let riskLevel="未知";
  if(r.is_tor===true||r.is_vpn===true&&r.is_proxy===true||[ps,qs].some(v=>v!==null&&v>=65))riskLevel="高";
  else if(dc||r.is_vpn===true||r.is_proxy===true||[ps,qs].some(v=>v!==null&&v>=25))riskLevel="中";
  else if(complete&&property!=="有差异")riskLevel="低";
  const cc=cleanIPText(p?.countryCode||q?.location?.country_code||q?.location?.countryCode).toUpperCase();
  const region=COUNTRY_ZH[cc]||cleanIPText(q?.location?.country||p?.country)||"未知";
  const quality=!target?"offline":p&&q?"verified":"single";
  return {exitIP:observed||"获取失败",region,purity,property,riskLevel,purityLabel:ps===null&&qs!==null?"参考纯度":"纯度",quality};
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
  const {exitIP,region:country,purity,property,riskLevel,purityLabel,quality}=await measureNode(ctx);
  const refreshAfter=new Date(clock+(quality==="verified"?15:5)*60000).toISOString();

  const purityColor = purity == null ? C.muted : purity >= 90 ? C.green : purity >= 80 ? C.pink : C.red;
  const propertyColor=property==='机房'||property==='非住宅'?C.red:property==='住宅'||property==='移动'?C.green:C.muted;
  const riskColor=riskLevel==='高'?C.red:riskLevel==='中'?C.pink:riskLevel==='低'?C.green:C.muted;

  const cards = [
    { label: purityLabel, value: purity == null ? '--' : String(purity), color: purityColor },
    { label: '属性', value: property, color: propertyColor },
    { label: '风险', value: riskLevel, color: riskColor }
  ];

  const buildCard = (item, cfg) => ({
    type: 'stack', direction: 'column', alignItems: 'center', flex: 1,
    backgroundColor: C.card, borderRadius: cfg.radius, padding: cfg.padding,
    children: [
      spacer(),
      text(item.label, cfg.labelSize, 'bold', item.color, { maxLines: 1, minScale: 0.75 }),
      spacer(cfg.gap),
      text(item.value, cfg.valueSize, 'heavy', item.color, { maxLines: 1, minScale: 0.55 }),
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
