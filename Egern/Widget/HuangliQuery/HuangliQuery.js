/**
 * 黄历查询 Widget
 * 黄色日历图标 · 公历/农历 · 宜忌 · 干支 · 节气/节日
 * 双远程源：zqzess/openApiData + xuqssq/calendar。
 * 双源均失败时使用 Intl 中国农历做本地基础兜底。
 */

export default async function(ctx) {
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

  // 固定按中国标准时间显示黄历日期。
  const tzOffset = new Date().getTimezoneOffset();
  const now = new Date(Date.now() + (tzOffset + 480) * 60000);
  const Y = now.getFullYear();
  const M = now.getMonth() + 1;
  const D = now.getDate();
  const WEEK = '日一二三四五六'[now.getDay()];
  const P = n => String(n).padStart(2, '0');

  const clean = s => String(s ?? '').replace(/[.。]+/g, ' ').replace(/\s+/g, ' ').trim();
  const normalizeList = s => clean(s).replace(/\s+/g, ' · ');

  const getJson = async (url, timeout = 10000) => {
    const sep = url.includes('?') ? '&' : '?';
    const resp = await ctx.http.get(`${url}${sep}t=${Date.now()}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
        'Accept': 'application/json,text/plain,*/*',
        'Cache-Control': 'no-cache'
      },
      timeout
    });
    const status = Number(resp?.status || 200);
    if (status >= 400) throw new Error(`HTTP ${status}`);
    return JSON.parse(await resp.text());
  };

  const findPrimaryDay = json => {
    let found = null;
    const seen = new Set();
    const walk = obj => {
      if (!obj || typeof obj !== 'object' || found) return;
      if (seen.has(obj)) return;
      seen.add(obj);

      const yy = Number(obj.year);
      const mm = Number(obj.month);
      const dd = Number(obj.day);
      const looksLikeDay = Number.isFinite(yy) && Number.isFinite(mm) && Number.isFinite(dd) &&
        (obj.suit != null || obj.avoid != null || obj.gzDate != null || obj.lDate != null);

      if (looksLikeDay && yy === Y && mm === M && dd === D) {
        found = obj;
        return;
      }

      if (obj.oDate && (obj.suit != null || obj.avoid != null)) {
        const d = new Date(obj.oDate);
        if (!Number.isNaN(d.getTime())) {
          const bj = new Date(d.getTime() + 8 * 3600000);
          if (bj.getUTCFullYear() === Y && bj.getUTCMonth() + 1 === M && bj.getUTCDate() === D) {
            found = obj;
            return;
          }
        }
      }

      if (Array.isArray(obj)) {
        for (const v of obj) walk(v);
      } else {
        for (const k of Object.keys(obj)) walk(obj[k]);
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
    const v = clean(value);
    return terms.find(x => v.includes(x)) || '';
  };

  const normalizeSecondaryDay = json => {
    const list = Array.isArray(json) ? json : [];
    const item = list.find(x => Number(x?.day) === D);
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
      animal: clean(d['生肖']),
      suit: Array.isArray(item.yi) ? item.yi.join(' ') : clean(item.yi),
      avoid: Array.isArray(item.ji) ? item.ji.join(' ') : clean(item.ji),
      festivalList: festival,
      term: termFromFestival(festival),
      jiri: false,
      details: {
        constellation: clean(d['星座']),
        pengzu: clean(d['彭祖百忌']),
        fetus: clean(d['胎神占方']),
        star: clean(d['星宿']),
        chong: clean(d['冲']),
        sha: clean(d['煞']),
        twelve: clean(d['十二神']),
        season: clean(d['季节']),
        dayWuxing: clean(d['日五行']),
        jieqi: clean(d['节气'])
      }
    };
  };

  const localFallback = () => {
    let lMonth = '', lDate = '', gzYear = '', animal = '';
    try {
      const date = new Date(Y, M - 1, D, 12, 0, 0);
      const parts = new Intl.DateTimeFormat('zh-CN-u-ca-chinese', {
        year: 'numeric', month: 'long', day: 'numeric'
      }).formatToParts(date);
      const byType = type => parts.find(x => x.type === type)?.value || '';
      lMonth = byType('month');
      lDate = byType('day');
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

  const mergeDay = (primary, secondary) => {
    if (!primary) return secondary;
    if (!secondary) return primary;
    const merged = { ...primary, details: { ...(secondary.details || {}), ...(primary.details || {}) } };
    for (const key of ['lMonth','lDate','gzYear','gzMonth','gzDate','animal','suit','avoid','festivalList','term']) {
      if (!clean(merged[key]) && clean(secondary[key])) merged[key] = secondary[key];
    }
    if (secondary.festivalList && primary.festivalList && !primary.festivalList.includes(secondary.festivalList)) {
      merged.festivalList = `${primary.festivalList} · ${secondary.festivalList}`;
    }
    return merged;
  };

  let today = null;
  let sourceLabel = '';
  let error = '';

  const primaryUrl = `https://raw.githubusercontent.com/zqzess/openApiData/main/calendar_new/${Y}/${Y}${P(M)}.json`;
  const secondaryUrl = `https://raw.githubusercontent.com/xuqssq/calendar/main/output/${Y}-${P(M)}.json`;
  const results = await Promise.allSettled([
    getJson(primaryUrl),
    getJson(secondaryUrl)
  ]);

  let primaryDay = null;
  let secondaryDay = null;
  const errors = [];

  if (results[0].status === 'fulfilled') {
    primaryDay = findPrimaryDay(results[0].value);
    if (!primaryDay) errors.push('主源未找到今日数据');
  } else {
    errors.push(`主源：${results[0].reason?.message || results[0].reason}`);
  }

  if (results[1].status === 'fulfilled') {
    secondaryDay = normalizeSecondaryDay(results[1].value);
    if (!secondaryDay) errors.push('备用源未找到今日数据');
  } else {
    errors.push(`备用源：${results[1].reason?.message || results[1].reason}`);
  }

  if (primaryDay || secondaryDay) {
    today = mergeDay(primaryDay, secondaryDay);
    sourceLabel = primaryDay && secondaryDay ? '双源' : primaryDay ? '主源' : '备用源';
    error = errors.join('；');
  } else {
    today = localFallback();
    sourceLabel = '本地';
    error = errors.join('；') || '远程黄历数据暂不可用';
  }

  const lunarMonth = clean(today?.lMonth);
  const lunarDay = clean(today?.lDate);
  const lunar = lunarMonth || lunarDay ? `农历${lunarMonth}${lunarMonth.includes('月') ? '' : '月'}${lunarDay}` : '农历数据暂缺';
  const ganzhi = [today?.gzYear ? `${today.gzYear}年` : '', today?.gzMonth ? `${today.gzMonth}月` : '', today?.gzDate ? `${today.gzDate}日` : '']
    .filter(Boolean).join(' ');
  const animal = clean(today?.animal);
  const yi = normalizeList(today?.suit) || '暂无数据';
  const ji = normalizeList(today?.avoid) || '暂无数据';
  const festival = clean(today?.festivalList || today?.value);
  const term = clean(today?.term);
  const extra = [term, festival].filter((v, i, a) => v && a.indexOf(v) === i).join(' · ');
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
    ...(jiri ? [chip('吉日', C.gold)] : [])
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
      type: 'widget', padding: 12, backgroundGradient: bg, url: 'calshow://',
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
      type: 'widget', padding: 16, backgroundGradient: bg, url: 'calshow://',
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
    type: 'widget', padding: 13, backgroundGradient: bg, url: 'calshow://',
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
        text(`${P(now.getHours())}:${P(now.getMinutes())}`, 9, 'bold', C.muted)
      ])
    ]
  };
}
