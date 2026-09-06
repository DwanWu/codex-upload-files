/**
 * 黄历查询 Widget
 * 黄色日历图标 · 公历/农历 · 宜忌 · 干支 · 节气/节日
 * 数据源沿用公开黄历数据集，失败时保留日期并提示稍后刷新。
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

  let today = null;
  let error = '';
  try {
    const url = `https://raw.githubusercontent.com/zqzess/openApiData/main/calendar_new/${Y}/${Y}${P(M)}.json`;
    const resp = await ctx.http.get(`${url}?t=${Date.now()}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10000
    });
    const json = JSON.parse(await resp.text());

    const seen = new Set();
    const walk = obj => {
      if (!obj || typeof obj !== 'object' || today) return;
      if (seen.has(obj)) return;
      seen.add(obj);

      const yy = Number(obj.year);
      const mm = Number(obj.month);
      const dd = Number(obj.day);
      const looksLikeDay = Number.isFinite(yy) && Number.isFinite(mm) && Number.isFinite(dd) &&
        (obj.suit != null || obj.avoid != null || obj.gzDate != null || obj.lDate != null);

      if (looksLikeDay && yy === Y && mm === M && dd === D) {
        today = obj;
        return;
      }

      // 兼容 oDate 为北京时间当天 00:00 的情况。
      if (obj.oDate && (obj.suit != null || obj.avoid != null)) {
        const d = new Date(obj.oDate);
        if (!Number.isNaN(d.getTime())) {
          const bj = new Date(d.getTime() + 8 * 3600000);
          if (bj.getUTCFullYear() === Y && bj.getUTCMonth() + 1 === M && bj.getUTCDate() === D) {
            today = obj;
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
    if (!today) error = '未找到今日黄历数据';
  } catch (e) {
    error = e?.message || String(e);
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
  const jiri = String(today?.jiri || '') === '1';

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
        spacer(10),
        { type: 'stack', height: 0.5, backgroundColor: C.divider, children: [] },
        spacer(10),
        yiJiBlock('宜', yi, C.yi, 'checkmark.circle.fill', 4),
        spacer(12),
        yiJiBlock('忌', ji, C.ji, 'xmark.circle.fill', 4),
        spacer(),
        text(error ? `数据提示：${error}` : '数据自动随日期更新', 9, 'medium', C.muted, { maxLines: 1 })
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
        text(extra || (error ? '数据暂不可用' : '今日黄历'), 9, 'bold', extra ? C.cyan : C.muted, { maxLines: 1, minScale: 0.72 }),
        spacer(),
        text(`${P(now.getHours())}:${P(now.getMinutes())}`, 9, 'bold', C.muted)
      ])
    ]
  };
}
