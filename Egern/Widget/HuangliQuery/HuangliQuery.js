/**
 * 黄历查询 Widget v2.0
 * 黄色日历图标 · 公历/农历 · 宜忌 · 干支 · 节气/节日
 * 双远程源：zqzess/openApiData + xuqssq/calendar。
 * 双源均失败时使用 Intl 中国农历做本地基础兜底。
 */


const CAL_KEY="HuangliQuery.v2",DAY=86400000;
function validDate(s){return typeof s==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s}
function lunarDayText(s){
  const v=String(s??"").trim(),n=/^\d{1,2}$/.test(v)?+v:null,z="一二三四五六七八九";
  return n===null?v:n===10?"初十":n===20?"二十":n===30?"三十":n>=1&&n<=9?"初"+z[n-1]:n>=11&&n<=19?"十"+z[n-11]:n>=21&&n<=29?"廿"+z[n-21]:"";
}
function lunarMonthText(v){return String(v??"").trim().replace(/月$/,"").replace(/^一$/,"正").replace(/^十一$/,"冬").replace(/^十二$/,"腊")}
function str(v){return typeof v==="string"?v.slice(0,1000):Array.isArray(v)?v.filter(x=>typeof x==="string").slice(0,40).join(" ").slice(0,1000):""}
function validCalendarDay(d){
  if(!d||typeof d!=="object")return null;
  const out={};for(const k of ["lMonth","lDate","gzYear","gzMonth","gzDate","animal","suit","avoid","festivalList","term"])out[k]=str(d[k]);
  out.lMonth=lunarMonthText(out.lMonth);out.lDate=lunarDayText(out.lDate);
  if(!/^(?:闰)?(?:正|[二三四五六七八九十]|冬|腊)$/.test(out.lMonth)||!/^(?:初[一二三四五六七八九十]|十[一二三四五六七八九]|二十|廿[一二三四五六七八九]|三十)$/.test(out.lDate))return null;
  for(const k of ["gzYear","gzMonth","gzDate"])if(!/^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]$/.test(out[k]))out[k]="";
  out.jiri=d.jiri===true;out.details={};
  for(const k of ["constellation","pengzu","fetus","star","chong","sha","twelve","season","dayWuxing","jieqi"])out.details[k]=str(d.details?.[k]);
  return out;
}
function readCache(raw,month,now){
  if(!raw||raw.month!==month)return {month,primary:null,secondary:null};
  const result={month,primary:null,secondary:null};
  for(const k of ["primary","secondary"]){
    const p=raw[k];if(!p||!Number.isFinite(p.checked)||p.checked>now||!p.days||typeof p.days!=="object")continue;
    const days={};for(const d of Object.keys(p.days).slice(0,31))if(validDate(d)&&d.startsWith(month+"-")){const v=validCalendarDay(p.days[d]);if(v)days[d]=v}
    result[k]={days,checked:p.checked,attempt:Number.isFinite(p.attempt)&&p.attempt<=now?p.attempt:p.checked};
  }
  return result;
}
export default async function(ctx,clock=Date.now()) {
  const family = String(ctx.widgetFamily || 'systemMedium').toLowerCase();
  const isSmall = family.includes('small');
  const isLarge = family.includes('large');

  const C = {
    bg: [{ light: '#FFFFFF', dark: '#1C1C1E' }, { light: '#F8F7F2', dark: '#111113' }],
    main: { light: '#1C1C1E', dark: '#FFFFFF' },
    sub: { light: '#48484A', dark: '#D1D1D6' },
    muted: { light: '#8E8E93', dark: '#8E8E93' },
    gold: { light: '#D69E00', dark: '#FFD43B' },
    yi: { light: '#15803D', dark: '#4ADE80' },
    ji: { light: '#B91C1C', dark: '#F87171' },
    cyan: { light: '#0F766E', dark: '#5EEAD4' },
    divider: { light: '#E5E5EA', dark: '#38383A' },
    chip: { light: '#F2F2F7', dark: '#2C2C2E' }
  };

  const bg = { type: 'linear', colors: C.bg, startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 } };
  const text = (t, size, weight, color, opts = {}) => ({
    type: 'text', text: String(t ?? ''), font: { size, weight }, textColor: color, ...opts
  });
  const row = (children, gap = 5, opts = {}) => ({ type: 'stack', direction: 'row', alignItems: 'center', gap, children, ...opts });
  const col = (children, gap = 5, opts = {}) => ({ type: 'stack', direction: 'column', gap, children, ...opts });
  const icon = (name, color, size = 13) => ({ type: 'image', src: `sf-symbol:${name}`, color, width: size, height: size });
  const spacer = (length) => length == null ? { type: 'spacer' } : { type: 'spacer', length };
  const chip = (label, color) => ({
    type: 'stack', direction: 'row', padding: [3, 7, 3, 7], backgroundColor: C.chip,
    children: [text(label, 9, 'bold', color, { maxLines: 1 })]
  });

  const now=new Date(clock+8*3600000),Y=now.getUTCFullYear(),M=now.getUTCMonth()+1,D=now.getUTCDate();
  const WEEK="日一二三四五六"[now.getUTCDay()],P=n=>String(n).padStart(2,"0"),month=Y+"-"+P(M),dateKey=month+"-"+P(D);
  const midnight=Date.parse(dateKey+"T00:00:00+08:00")+DAY;
  let refreshAfter=new Date(Math.min(clock+3*3600000,midnight)).toISOString();

  const clean = s => str(s).replace(/[.。]+/g, ' ').replace(/\s+/g, ' ').trim();
  const normalizeList = s => clean(s).replace(/\s+/g, ' · ');

  const getJson=async url=>{
    const r=await ctx.http.get(url,{headers:{"User-Agent":"Egern-HuangliQuery/2.0","Accept":"application/json"},timeout:6500,credentials:"omit",insecureTls:false});
    if(r.status!==200)throw Error("HTTP "+r.status);
    const body=await r.text();if(typeof body!=="string"||body.length>2000000)throw Error("invalid body");return JSON.parse(body);
  };

  const findPrimaryDay = (json,targetDay=D) => {
    let found = null;
    const seen = new Set();
    let visited=0;
    const walk = (obj,depth=0) => {
      if (!obj || typeof obj !== 'object' || found || depth>30 || ++visited>15000) return;
      if (seen.has(obj)) return;
      seen.add(obj);

      const yy = Number(obj.year);
      const mm = Number(obj.month);
      const dd = Number(obj.day);
      const looksLikeDay = Number.isFinite(yy) && Number.isFinite(mm) && Number.isFinite(dd) &&
        (obj.suit != null || obj.avoid != null || obj.gzDate != null || obj.lDate != null);

      if (looksLikeDay && yy === Y && mm === M && dd === targetDay) {
        found = obj;
        return;
      }

      if (!looksLikeDay && typeof obj.oDate==='string' && /(?:Z|[+-]\d{2}:\d{2})$/.test(obj.oDate) && (obj.suit != null || obj.avoid != null)) {
        const d = new Date(obj.oDate);
        if (!Number.isNaN(d.getTime())) {
          const bj = new Date(d.getTime() + 8 * 3600000);
          if (bj.getUTCFullYear() === Y && bj.getUTCMonth() + 1 === M && bj.getUTCDate() === targetDay) {
            found = obj;
            return;
          }
        }
      }

      if (Array.isArray(obj)) {
        for (const v of obj) walk(v,depth+1);
      } else {
        for (const k of Object.keys(obj)) walk(obj[k],depth+1);
      }
    };
    walk(json);
    if (!found) return null;
    return {
      lMonth: clean(found.lMonth),
      lDate: clean(found.lDate),
      gzYear: clean(found.gzYear),
      gzMonth: clean(found.gzMonth),
      gzDate: clean(found.gzDate),
      animal: clean(found.animal),
      suit: clean(found.suit),
      avoid: clean(found.avoid),
      festivalList: clean(found.festivalList || found.value),
      term: clean(found.term),
      jiri: String(found.jiri || '') === '1',
      details: {}
    };
  };

  const splitLunar = value => {
    const v = clean(value);
    const m = v.match(/^(闰?[正一二三四五六七八九十冬腊]+月)(.+)$/);
    return m ? { month: m[1], day: m[2] } : { month: '', day: v };
  };

  const termFromFestival = value => {
    const terms = '立春 雨水 惊蛰 春分 清明 谷雨 立夏 小满 芒种 夏至 小暑 大暑 立秋 处暑 白露 秋分 寒露 霜降 立冬 小雪 大雪 冬至 小寒 大寒'.split(' ');
    const v = parseFestivalItems(value);
    return terms.find(x => v.includes(x)) || '';
  };

  // 节气与节日来自不同数据源；先拆分单个节日，再去掉重合节气和跨源重复项。
  const parseFestivalItems = value => String(value ?? '')
    .split(/[，,、;；·|\s]+/)
    .map(v => clean(v).replace(/[（(]\d{1,2}:\d{2}(?::\d{2})?[）)]$/, ''))
    .filter(Boolean);

  const mergeFestivalItems = (solarTerm, ...values) => {
    const seen = new Set();
    const items = [];
    const termKey = clean(solarTerm);
    for (const value of values) {
      for (const item of parseFestivalItems(value)) {
        if (item === termKey || seen.has(item)) continue;
        seen.add(item);
        items.push(item);
      }
    }
    return items.join(' · ');
  };

  const normalizeSecondaryDay = (json,targetDay=D) => {
    const list = Array.isArray(json) ? json : [];
    const target=month+"-"+P(targetDay);
    const item=list.find(x=>{
      if(!x||typeof x!=="object")return false;
      if(validDate(x.day))return x.day===target;
      if(!/^\d{1,2}$/.test(String(x.day))||Number(x.day)!==targetDay)return false;
      const t=String(x.title||"").match(/(20\d{2})年\s*(\d{1,2})月(?:\s*(\d{1,2})日)?/);
      return !!t&&+t[1]===Y&&+t[2]===M&&(!t[3]||+t[3]===targetDay);
    });
    if (!item) return null;

    const lunarParts = splitLunar(item.lunar);
    const gz = clean(item.ganzhi);
    const gm = gz.match(/([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])年[\s\S]*?([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])月\s*([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])日/);
    const d = item.details || {};
    const festival = clean(item.festival);
    return {
      lMonth: lunarParts.month,
      lDate: lunarParts.day,
      gzYear: gm?.[1] || '',
      gzMonth: gm?.[2] || '',
      gzDate: gm?.[3] || '',
      animal: clean(d['生肖'] || d.zodiac),
      suit: Array.isArray(item.yi) ? item.yi.join(' ') : clean(item.yi),
      avoid: Array.isArray(item.ji) ? item.ji.join(' ') : clean(item.ji),
      festivalList: festival,
      term: termFromFestival(festival),
      jiri: false,
      details: {
        constellation: clean(d['星座'] || d.constellation),
        pengzu: clean(d['彭祖百忌']),
        fetus: clean(d['胎神占方']),
        star: clean(d['星宿']),
        chong: clean(d['冲']),
        sha: clean(d['煞']),
        twelve: clean(d['十二神']),
        season: clean(d['季节']),
        dayWuxing: clean(d['日五行']),
        jieqi: clean(d['节气'] || d.solarTerm)
      }
    };
  };

  const localFallback = () => {
    let lMonth = '', lDate = '', gzYear = '', animal = '';
    try {
      const date=new Date(Date.UTC(Y,M-1,D,4,0,0));
      const parts = new Intl.DateTimeFormat('zh-CN-u-ca-chinese', {
        year: 'numeric', month: 'long', day: 'numeric', timeZone:'Asia/Shanghai'
      }).formatToParts(date);
      const byType = type => parts.find(x => x.type === type)?.value || '';
      lMonth=lunarMonthText(byType('month'));
      lDate=lunarDayText(byType('day'));
      gzYear = byType('yearName');
      const branch = gzYear.slice(-1);
      const zodiac = { 子:'鼠', 丑:'牛', 寅:'虎', 卯:'兔', 辰:'龙', 巳:'蛇', 午:'马', 未:'羊', 申:'猴', 酉:'鸡', 戌:'狗', 亥:'猪' };
      animal = zodiac[branch] || '';
    } catch (_) {}
    return {
      lMonth, lDate, gzYear, gzMonth: '', gzDate: '', animal,
      suit: '', avoid: '', festivalList: '', term: '', jiri: false, details: {}
    };
  };

  const match=(a,b)=>a.lMonth===b.lMonth&&a.lDate===b.lDate&&(!a.gzDate||!b.gzDate||a.gzDate===b.gzDate);
  const mergeDay=(a,b)=>{
    if(!a)return b;if(!b||!match(a,b))return a;
    const out={...a,details:{...b.details}};
    for(const [k,v] of Object.entries(a.details||{}))if(v)out.details[k]=v;
    for(const k of ["gzYear","gzMonth","gzDate","animal"])if(!out[k]&&b[k])out[k]=b[k];
    if(!out.suit&&!out.avoid){out.suit=b.suit;out.avoid=b.avoid}
    out.term=termFromFestival(a.term)||termFromFestival(b.term)||termFromFestival(a.festivalList)||termFromFestival(b.festivalList);
    out.festivalList=mergeFestivalItems(out.term,a.festivalList,b.festivalList,a.term,b.term);
    return out;
  };
  let stored=null;try{stored=ctx.storage.getJSON(CAL_KEY)}catch(_){}
  const cache=readCache(stored,month,clock);
  const urls=["https://raw.githubusercontent.com/zqzess/openApiData/main/calendar_new/"+Y+"/"+Y+P(M)+".json","https://raw.githubusercontent.com/xuqssq/calendar/main/output/"+month+".json"];
  const load=async(key,url,parse)=>{
    const old=cache[key],today=old?.days[dateKey];
    if(today&&clock-old.checked<DAY)return {day:today,cached:false};
    if(old&&clock-old.attempt<30*60000)return {day:today||null,cached:!!today};
    try{
      const json=await getJson(url),days={},last=new Date(Date.UTC(Y,M,0)).getUTCDate();
      for(let n=1;n<=last;n++){const d=validCalendarDay(parse(json,n));if(d)days[month+"-"+P(n)]=d}
      if(!Object.keys(days).length)throw Error("No valid days");
      cache[key]={days:{...old?.days,...days},checked:days[dateKey]?clock:old?.checked||0,attempt:clock};
      return {day:cache[key].days[dateKey]||null,cached:!days[dateKey]&&!!today};
    }catch(_){cache[key]={days:old?.days||{},checked:old?.checked||0,attempt:clock};return {day:today||null,cached:!!today}}
  };
  const [a,b]=await Promise.all([load("primary",urls[0],findPrimaryDay),load("secondary",urls[1],normalizeSecondaryDay)]);
  try{ctx.storage.setJSON(CAL_KEY,cache)}catch(_){}
  const local=validCalendarDay(localFallback()),matchesLocal=d=>!local||d.lMonth===local.lMonth&&d.lDate===local.lDate;
  const p=a.day&&matchesLocal(a.day)?a.day:null,q=b.day&&matchesLocal(b.day)?b.day:null;
  const today=mergeDay(p,q)||local||localFallback();
  const conflict=p&&q&&!match(p,q);
  const sourceLabel=conflict?"主源（有差异）":p&&q?(a.cached||b.cached?"双源缓存":"双源"):p?(a.cached?"主源缓存":"主源"):q?(b.cached?"备用缓存":"备用源"):"本地";
  const error=sourceLabel==="本地"?"远程黄历数据暂不可用":"";
  if(!p||!q)refreshAfter=new Date(Math.min(clock+30*60000,midnight)).toISOString();

  const lunarMonth = clean(today?.lMonth);
  const lunarDay = clean(today?.lDate);
  const lunar = lunarMonth && lunarDay ? `农历${lunarMonth}${lunarMonth.includes('月') ? '' : '月'}${lunarDay}` : '农历数据暂缺';
  const ganzhi = [today?.gzYear ? `${today.gzYear}年` : '', today?.gzMonth ? `${today.gzMonth}月` : '', today?.gzDate ? `${today.gzDate}日` : '']
    .filter(Boolean).join(' ');
  const animal = clean(today?.animal);
  const yi = normalizeList(today?.suit) || '暂无数据';
  const ji = normalizeList(today?.avoid) || '暂无数据';
  const term=termFromFestival(today?.term)||termFromFestival(today?.festivalList);
  const festival=mergeFestivalItems(term,today?.festivalList||today?.value,today?.term);
  const extra = [term, festival].filter(Boolean).join(' · ');
  const jiri = today?.jiri === true || String(today?.jiri || '') === '1';
  const details = today?.details || {};
  const chong = clean(details.chong);
  const sha = clean(details.sha);
  const clash = [chong ? `冲${chong}` : '', sha ? `煞${sha}` : ''].filter(Boolean).join(' · ');
  const star = clean(details.star);
  const fetus = clean(details.fetus);
  const pengzu = clean(details.pengzu);
  const twelve = clean(details.twelve);

  const header = (size = 15) => row([
    icon('calendar', C.gold, size + 1),
    text('黄历查询', size, 'heavy', C.main),
    spacer(),
    ...(sourceLabel === '本地' || sourceLabel.includes('缓存') ? [chip(sourceLabel === '本地' ? '本地' : '缓存', C.muted)] : jiri ? [chip('吉日', C.gold)] : [])
  ], 6);

  const infoRow = (label, value, color = C.sub, ico = null) => row([
    ...(ico ? [icon(ico, color, 12)] : []),
    text(label, 11, 'bold', C.muted, { width: 42, maxLines: 1 }),
    text(value, 12, 'medium', color, { flex: 1, maxLines: 1, minScale: 0.65 })
  ], 6);

  const yiJiBlock = (label, value, color, ico, maxLines) => ({
    type: 'stack', direction: 'row', alignItems: 'start', gap: 7,
    children: [
      { type: 'stack', direction: 'row', alignItems: 'center', gap: 3, width: 44, children: [
        icon(ico, color, 13), text(label, 13, 'heavy', color)
      ]},
      text(value, isLarge ? 13 : 12, 'medium', C.sub, { flex: 1, maxLines, minScale: 0.72 })
    ]
  });

  if (isSmall) {
    return {
      type: 'widget', refreshAfter, padding: 12, backgroundGradient: bg, url: 'calshow://',
      children: [
        header(13),
        spacer(9),
        row([
          text(D, 34, 'heavy', C.main),
          col([
            text(`${Y}年${M}月`, 11, 'bold', C.muted),
            text(`星期${WEEK}`, 11, 'bold', C.muted)
          ], 2),
          spacer()
        ], 7),
        spacer(5),
        text(`${lunar}${animal ? ` · ${animal}年` : ''}`, 11, 'bold', C.gold, { maxLines: 1, minScale: 0.72 }),
        spacer(9),
        row([icon('checkmark.circle.fill', C.yi, 11), text(`宜  ${yi}`, 10, 'medium', C.sub, { flex: 1, maxLines: 1, minScale: 0.65 })], 6),
        spacer(7),
        row([icon('xmark.circle.fill', C.ji, 11), text(`忌  ${ji}`, 10, 'medium', C.sub, { flex: 1, maxLines: 1, minScale: 0.65 })], 6),
        spacer(),
        text(extra || (error ? '黄历数据暂不可用' : ganzhi), 9, 'bold', extra ? C.cyan : C.muted, { maxLines: 1, minScale: 0.7 })
      ]
    };
  }

  if (isLarge) {
    return {
      type: 'widget', refreshAfter, padding: 16, backgroundGradient: bg, url: 'calshow://',
      children: [
        header(17),
        spacer(10),
        row([
          text(`${M}月${D}日`, 28, 'heavy', C.main),
          col([
            text(`星期${WEEK}`, 12, 'bold', C.muted),
            text(lunar, 13, 'heavy', C.gold)
          ], 3),
          spacer(),
          ...(extra ? [chip(extra, C.cyan)] : [])
        ], 8),
        spacer(9),
        infoRow('干支', ganzhi || '暂无数据', C.sub, 'circle.grid.cross.fill'),
        spacer(6),
        infoRow('生肖', animal ? `${animal}年` : '暂无数据', C.sub, 'hare.fill'),
        spacer(6),
        infoRow('冲煞', clash || '暂无数据', C.sub, 'arrow.left.arrow.right.circle.fill'),
        spacer(6),
        infoRow('星宿', star || '暂无数据', C.sub, 'sparkles'),
        spacer(10),
        { type: 'stack', height: 0.5, backgroundColor: C.divider, children: [] },
        spacer(10),
        yiJiBlock('宜', yi, C.yi, 'checkmark.circle.fill', 4),
        spacer(12),
        yiJiBlock('忌', ji, C.ji, 'xmark.circle.fill', 4),
        spacer(),
        ...((fetus || twelve || pengzu) ? [
          text([fetus ? `胎神 ${fetus}` : '', twelve, pengzu].filter(Boolean).join(' · '), 9, 'medium', C.muted, { maxLines: 1, minScale: 0.68 }),
          spacer(5)
        ] : []),
        text(sourceLabel === '本地' ? '本地历法兜底 · 宜忌等待远程恢复' : `数据来源 · ${sourceLabel}`, 9, 'medium', C.muted, { maxLines: 1 })
      ]
    };
  }

  return {
    type: 'widget', refreshAfter, padding: 13, backgroundGradient: bg, url: 'calshow://',
    children: [
      header(15),
      spacer(9),
      row([
        text(`${Y}年${M}月${D}日 星期${WEEK}`, 15, 'heavy', C.main),
        spacer(),
        text(lunar, 11, 'bold', C.gold, { maxLines: 1, minScale: 0.72 })
      ]),
      spacer(7),
      ...(ganzhi ? [text(`${ganzhi}${animal ? ` · ${animal}年` : ''}`, 11, 'medium', C.muted, { maxLines: 1, minScale: 0.72 })] : []),
      spacer(9),
      yiJiBlock('宜', yi, C.yi, 'checkmark.circle.fill', 2),
      spacer(9),
      yiJiBlock('忌', ji, C.ji, 'xmark.circle.fill', 2),
      spacer(),
      row([
        text(extra || clash || (sourceLabel === '本地' ? '本地历法兜底' : '今日黄历'), 9, 'bold', (extra || clash) ? C.cyan : C.muted, { maxLines: 1, minScale: 0.72 }),
        spacer(),
        text(`${P(now.getUTCHours())}:${P(now.getUTCMinutes())}`, 9, 'bold', C.muted)
      ])
    ]
  };
}
