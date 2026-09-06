/**
 * 发布雷达 Widget v3
 * 仅追踪 ChatGPT / Claude / Gemini / Grok 的模型发布。
 * 不显示一般功能、插件、集成、渠道上线等产品更新。
 */

const DATA_URL = 'https://raw.githubusercontent.com/DwanWu/codex-upload-files/main/Egern/Widget/AIReleaseRadar.json';
const ALLOWED = new Set(['chatgpt', 'claude', 'gemini', 'grok']);

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
    red: { light: '#B91C1C', dark: '#F87171' },
    green: { light: '#15803D', dark: '#4ADE80' },
    divider: { light: '#E5E5EA', dark: '#38383A' }
  };

  const BRAND = {
    chatgpt: { name: 'ChatGPT', vendor: 'OpenAI', icon: 'bubble.left.and.bubble.right.fill', color: C.green },
    claude:  { name: 'Claude',  vendor: 'Anthropic', icon: 'brain.head.profile', color: C.orange },
    gemini:  { name: 'Gemini',  vendor: 'Google', icon: 'sparkles', color: C.blue },
    grok:    { name: 'Grok',    vendor: 'xAI', icon: 'bolt.fill', color: C.purple }
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

  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const refresh = `${pad(now.getMonth() + 1)}.${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

  const ageDays = dateStr => {
    const d = new Date(`${dateStr}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) return 9999;
    return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
  };
  const badge = dateStr => {
    const d = ageDays(dateStr);
    if (d <= 1) return { text: '最新', color: C.red };
    if (d <= 7) return { text: '本周', color: C.orange };
    if (d <= 30) return { text: '近期', color: C.blue };
    return { text: String(dateStr || '').slice(5).replace('-', '.'), color: C.muted };
  };

  // 双保险：即使 JSON 暂时残留旧功能数据，也不在面板显示。
  const looksLikeModel = r => {
    if (String(r?.kind || '') === '模型发布') return true;
    const s = `${r?.title || ''} ${r?.raw_title || ''}`.toLowerCase();
    return /\b(gpt[-‑– ]?\d|claude\s+[^ ]*\s*\d|gemini\s+\d|grok\s+\d|opus\s*\d|sonnet\s*\d|haiku\s*\d|fable\s*\d|mythos\s*\d)\b/i.test(s);
  };

  let data = null;
  let error = '';
  try {
    const resp = await ctx.http.get(`${DATA_URL}?v=3&t=${Date.now()}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 8000
    });
    data = JSON.parse(await resp.text());
  } catch (e) {
    error = e?.message || String(e);
  }

  const releases = (data?.releases || [])
    .filter(x => ALLOWED.has(String(x.id || '').toLowerCase()) && looksLikeModel(x))
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

  if (!releases.length) {
    return {
      type: 'widget', padding: 14, backgroundGradient: bg,
      children: [
        row([icon('antenna.radiowaves.left.and.right', C.blue, 15), text('发布雷达', 15, 'heavy', C.main)], 6),
        spacer(10),
        text(error ? '模型数据暂时加载失败' : '等待模型发布数据', 12, 'medium', C.sub),
        spacer(4),
        text(error || '仅显示模型发布，不显示功能更新', 10, 'medium', C.muted, { maxLines: 3 })
      ]
    };
  }

  const latestUrl = releases[0]?.url || undefined;

  const compactRow = (r, fontSize = 11) => {
    const id = String(r.id || '').toLowerCase();
    const b = BRAND[id] || { name: r.name || id, icon: 'circle.fill', color: C.muted };
    const tag = badge(r.date);
    return row([
      icon(b.icon, b.color, fontSize + 1),
      text(b.name, fontSize, 'heavy', b.color, { width: isSmall ? 56 : 62, maxLines: 1, minScale: 0.75 }),
      text(r.title || '模型发布', fontSize, 'medium', C.sub, { flex: 1, maxLines: 1, minScale: 0.62 }),
      text(tag.text, fontSize - 1, 'bold', tag.color, { maxLines: 1 })
    ], 5);
  };

  if (isSmall) {
    return {
      type: 'widget', padding: 12, url: latestUrl, backgroundGradient: bg,
      children: [
        row([
          icon('antenna.radiowaves.left.and.right', C.blue, 14),
          text('发布雷达', 13, 'heavy', C.main),
          spacer(), text(refresh, 9, 'bold', C.muted)
        ], 5),
        spacer(12),
        { type: 'stack', direction: 'column', gap: 10, children: releases.slice(0, 3).map(r => compactRow(r, 10)) },
        spacer(),
        text('仅模型发布', 9, 'bold', C.blue)
      ]
    };
  }

  if (isLarge) {
    const rows = releases.slice(0, 4).map(r => {
      const id = String(r.id || '').toLowerCase();
      const b = BRAND[id] || { name: r.name || id, vendor: r.vendor || '', icon: 'circle.fill', color: C.muted };
      const tag = badge(r.date);
      return {
        type: 'stack', direction: 'column', gap: 3,
        children: [
          row([
            icon(b.icon, b.color, 15),
            text(b.name, 14, 'heavy', b.color),
            text(`· ${b.vendor}`, 11, 'medium', C.muted),
            spacer(),
            text(r.date || '', 11, 'bold', C.muted),
            text(tag.text, 10, 'bold', tag.color)
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
          text('模型发布', 10, 'bold', C.blue),
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
      spacer(12),
      { type: 'stack', direction: 'column', gap: 10, flex: 1, children: releases.slice(0, 4).map(r => compactRow(r, 11)) },
      spacer(6),
      text('按模型发布日期排序 · 每 2 小时自动更新', 9, 'medium', C.muted, { maxLines: 1 })
    ]
  };
}
