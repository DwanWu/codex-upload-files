/**
 * 发布雷达 Widget v4
 * 仅追踪 ChatGPT / Claude / Gemini / Grok 的模型发布。
 * 四家固定显示；日期始终显示具体日期，不再显示“本周/近期”。
 */

const DATA_URL = 'https://raw.githubusercontent.com/DwanWu/codex-upload-files/main/Egern/Widget/AIReleaseRadar.json';
const ORDER = ['chatgpt', 'claude', 'gemini', 'grok'];

export default async function (ctx) {
  const family = String(ctx.widgetFamily || 'systemMedium').toLowerCase();
  const isSmall = family.includes('small');
  const isLarge = family.includes('large');

  const C = {
    bg: [{ light: '#FFFFFF', dark: '#1C1C1E' }, { light: '#F2F2F7', dark: '#0C0C0E' }],
    main: { light: '#1C1C1E', dark: '#FFFFFF' },
    sub: { light: '#48484A', dark: '#D1D1D6' },
    muted: { light: '#8E8E93', dark: '#8E8E93' },
    blue: { light: '#2563EB', dark: '#60A5FA' },
    orange: { light: '#B45309', dark: '#F59E0B' },
    purple: { light: '#7C3AED', dark: '#A78BFA' },
    green: { light: '#15803D', dark: '#4ADE80' },
    divider: { light: '#E5E5EA', dark: '#38383A' }
  };

  const BRAND = {
    chatgpt: { name: 'ChatGPT', vendor: 'OpenAI', icon: 'bubble.left.and.bubble.right.fill', color: C.green },
    claude:  { name: 'Claude', vendor: 'Anthropic', icon: 'brain.head.profile', color: C.orange },
    gemini:  { name: 'Gemini', vendor: 'Google', icon: 'sparkles', color: C.blue },
    grok:    { name: 'Grok', vendor: 'xAI', icon: 'bolt.fill', color: C.purple }
  };

  const text = (t, size, weight, color, opts = {}) => ({
    type: 'text', text: String(t ?? ''), font: { size, weight }, textColor: color, ...opts
  });
  const row = (children, gap = 4, opts = {}) => ({
    type: 'stack', direction: 'row', alignItems: 'center', gap, children, ...opts
  });
  const icon = (name, color, size = 13) => ({
    type: 'image', src: `sf-symbol:${name}`, color, width: size, height: size
  });
  const spacer = length => length == null ? { type: 'spacer' } : { type: 'spacer', length };
  const bg = { type: 'linear', colors: C.bg, startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 } };

  const fmtDate = (s, full = false) => {
    const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return String(s || '--');
    return full ? `${m[1]}.${m[2]}.${m[3]}` : `${m[2]}.${m[3]}`;
  };

  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const refresh = `${pad(now.getMonth() + 1)}.${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

  let data = null;
  let error = '';
  try {
    const resp = await ctx.http.get(`${DATA_URL}?v=4&t=${Date.now()}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 8000
    });
    data = JSON.parse(await resp.text());
  } catch (e) {
    error = e?.message || String(e);
  }

  const raw = Array.isArray(data?.releases) ? data.releases : [];
  const map = new Map(raw.map(x => [String(x.id || '').toLowerCase(), x]));
  const releases = ORDER.map(id => map.get(id)).filter(Boolean);

  if (!releases.length) {
    return {
      type: 'widget', padding: 14, backgroundGradient: bg,
      children: [
        row([icon('antenna.radiowaves.left.and.right', C.blue, 15), text('发布雷达', 15, 'heavy', C.main)], 6),
        spacer(10),
        text(error ? '模型数据暂时加载失败' : '等待模型发布数据', 12, 'medium', C.sub),
        spacer(4),
        text(error || 'ChatGPT · Claude · Gemini · Grok', 10, 'medium', C.muted, { maxLines: 3 })
      ]
    };
  }

  const latestUrl = releases[0]?.url || undefined;

  const compactRow = (r, fontSize = 11) => {
    const id = String(r.id || '').toLowerCase();
    const b = BRAND[id] || { name: r.name || id, icon: 'circle.fill', color: C.muted };
    return row([
      icon(b.icon, b.color, fontSize + 1),
      text(b.name, fontSize, 'heavy', b.color, { width: isSmall ? 58 : 66, maxLines: 1, minScale: 0.85 }),
      text(r.title || '模型发布', fontSize, 'medium', C.sub, { flex: 1, maxLines: 1, minScale: 0.58 }),
      text(fmtDate(r.date), fontSize - 1, 'bold', C.blue, { width: 36, maxLines: 1 })
    ], 5);
  };

  if (isSmall) {
    return {
      type: 'widget', padding: 11, url: latestUrl, backgroundGradient: bg,
      children: [
        row([
          icon('antenna.radiowaves.left.and.right', C.blue, 14),
          text('发布雷达', 13, 'heavy', C.main),
          spacer(),
          text('模型', 9, 'bold', C.blue)
        ], 5),
        spacer(9),
        { type: 'stack', direction: 'column', gap: 8, children: releases.map(r => compactRow(r, 9)) },
        spacer(),
        text(`更新 ${refresh}`, 8, 'medium', C.muted, { maxLines: 1 })
      ]
    };
  }

  if (isLarge) {
    const rows = releases.map(r => {
      const id = String(r.id || '').toLowerCase();
      const b = BRAND[id] || { name: r.name || id, vendor: r.vendor || '', icon: 'circle.fill', color: C.muted };
      return {
        type: 'stack', direction: 'column', gap: 3,
        children: [
          row([
            icon(b.icon, b.color, 15),
            text(b.name, 14, 'heavy', b.color),
            text(`· ${b.vendor}`, 11, 'medium', C.muted),
            spacer(),
            text(fmtDate(r.date, true), 11, 'bold', C.blue)
          ], 5),
          text(r.title || '模型发布', 13, 'medium', C.main, { maxLines: 2, minScale: 0.75 }),
          text(r.summary || '官方模型发布公告。', 11, 'medium', C.muted, { maxLines: 1, minScale: 0.72 }),
          { type: 'stack', height: 0.5, backgroundColor: C.divider, children: [] }
        ]
      };
    });

    return {
      type: 'widget', padding: 16, url: latestUrl, backgroundGradient: bg,
      children: [
        row([
          icon('antenna.radiowaves.left.and.right', C.blue, 18),
          text('发布雷达', 17, 'heavy', C.main),
          spacer(),
          text('仅模型发布', 10, 'bold', C.blue),
          text(refresh, 10, 'bold', C.muted)
        ], 6),
        spacer(12),
        { type: 'stack', direction: 'column', gap: 10, flex: 1, children: rows }
      ]
    };
  }

  return {
    type: 'widget', padding: 12, url: latestUrl, backgroundGradient: bg,
    children: [
      row([
        icon('antenna.radiowaves.left.and.right', C.blue, 16),
        text('发布雷达', 15, 'heavy', C.main),
        spacer(),
        text('仅模型', 10, 'bold', C.blue),
        text(refresh, 9, 'bold', C.muted)
      ], 6),
      spacer(11),
      { type: 'stack', direction: 'column', gap: 10, flex: 1, children: releases.map(r => compactRow(r, 11)) },
      spacer(5),
      text('ChatGPT · Claude · Gemini · Grok', 9, 'medium', C.muted, { maxLines: 1 })
    ]
  };
}
