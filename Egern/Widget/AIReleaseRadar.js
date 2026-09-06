/**
 * 发布雷达 Widget
 * 仅追踪：Codex / Claude / Gemini / Grok
 * 数据由 GitHub Actions 每 2 小时从官方来源更新。
 * 面板统一中文显示。
 */

const DATA_URL = 'https://raw.githubusercontent.com/DwanWu/codex-upload-files/main/Egern/Widget/AIReleaseRadar.json';
const ALLOWED = new Set(['codex', 'claude', 'gemini', 'grok']);

export default async function (ctx) {
  const family = (ctx.widgetFamily || 'systemMedium').toLowerCase();
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
    codex:  { name: 'Codex',  vendor: 'OpenAI',    icon: 'chevron.left.forwardslash.chevron.right', color: C.green },
    claude: { name: 'Claude', vendor: 'Anthropic', icon: 'brain.head.profile', color: C.orange },
    gemini: { name: 'Gemini', vendor: 'Google',    icon: 'sparkles', color: C.blue },
    grok:   { name: 'Grok',   vendor: 'xAI',       icon: 'bolt.fill', color: C.purple }
  };

  const mkText = (text, size, weight, color, opts = {}) => ({
    type: 'text', text: String(text ?? ''), font: { size, weight }, textColor: color, ...opts
  });
  const mkRow = (children, gap = 4, opts = {}) => ({
    type: 'stack', direction: 'row', alignItems: 'center', gap, children, ...opts
  });
  const mkIcon = (src, color, size = 13) => ({
    type: 'image', src: `sf-symbol:${src}`, color, width: size, height: size
  });
  const mkSpacer = (length) => length == null ? { type: 'spacer' } : { type: 'spacer', length };
  const bg = { type: 'linear', colors: C.bg, startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 } };

  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const refresh = `${pad(now.getMonth() + 1)}.${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

  const ageDays = (dateStr) => {
    const d = new Date(`${dateStr}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) return 9999;
    return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
  };

  const badge = (dateStr) => {
    const d = ageDays(dateStr);
    if (d <= 1) return { text: '最新', color: C.red };
    if (d <= 7) return { text: '本周', color: C.orange };
    if (d <= 30) return { text: '近期', color: C.blue };
    return { text: String(dateStr || '').slice(5).replace('-', '.'), color: C.muted };
  };

  const zhTitle = (r) => {
    const raw = String(r?.title || '').trim();
    if (!raw) return `${r?.name || 'AI'} 官方发布新版本或重大功能更新`;
    if (/[一-鿿]/.test(raw)) return raw;

    let m = raw.match(/^Introducing\s+(.+)$/i);
    if (m) return `发布 ${m[1].replace(/\band\b/gi, '与')}`;
    m = raw.match(/^Announcing\s+(.+)$/i);
    if (m) return `发布 ${m[1].replace(/\band\b/gi, '与')}`;
    m = raw.match(/^(.+?)\s+is now available/i);
    if (m) return `${m[1]} 现已发布`;

    const exact = {
      'More control over browser and computer use': '增强浏览器与电脑操作控制'
    };
    if (exact[raw]) return exact[raw];

    const id = String(r?.id || '').toLowerCase();
    const name = BRAND[id]?.name || r?.name || 'AI';
    return `${name} 官方发布新版本或重大功能更新`;
  };

  const zhSummary = (r) => {
    const raw = String(r?.summary || '').trim();
    if (raw && /[一-鿿]/.test(raw)) return raw;
    const id = String(r?.id || '').toLowerCase();
    const name = BRAND[id]?.name || r?.name || 'AI';
    return `${name} 官方发布信息，点击组件可查看原始公告。`;
  };

  let data = null;
  let error = null;
  try {
    const resp = await ctx.http.get(`${DATA_URL}?t=${Date.now()}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 8000
    });
    data = JSON.parse(await resp.text());
  } catch (e) {
    error = e?.message || String(e);
  }

  const releases = (data?.releases || [])
    .filter(x => ALLOWED.has(String(x.id || '').toLowerCase()))
    .map(x => ({ ...x, titleZh: zhTitle(x), summaryZh: zhSummary(x) }))
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

  if (!releases.length) {
    return {
      type: 'widget', padding: 14, backgroundGradient: bg,
      children: [
        mkRow([mkIcon('antenna.radiowaves.left.and.right', C.red, 15), mkText('发布雷达', 15, 'heavy', C.main)], 6),
        mkSpacer(10),
        mkText(error ? '数据暂时加载失败' : '等待首次数据更新', 12, 'medium', C.sub),
        mkSpacer(4),
        mkText(error || 'Codex · Claude · Gemini · Grok', 10, 'medium', C.muted, { maxLines: 3 })
      ]
    };
  }

  const latestUrl = releases[0]?.url || undefined;

  const buildCompactRow = (r, fontSize = 11) => {
    const id = String(r.id || '').toLowerCase();
    const b = BRAND[id] || { name: r.name || id, icon: 'circle.fill', color: C.muted };
    const tag = badge(r.date);
    return mkRow([
      mkIcon(b.icon, b.color, fontSize + 1),
      mkText(b.name, fontSize, 'heavy', b.color, { width: isSmall ? 48 : 54, maxLines: 1 }),
      mkText(r.titleZh, fontSize, 'medium', C.sub, { flex: 1, maxLines: 1, minScale: 0.65 }),
      mkText(tag.text, fontSize - 1, 'bold', tag.color, { maxLines: 1 })
    ], 5);
  };

  if (isSmall) {
    return {
      type: 'widget', padding: 12, url: latestUrl, backgroundGradient: bg,
      children: [
        mkRow([
          mkIcon('antenna.radiowaves.left.and.right', C.main, 13),
          mkText('发布雷达', 13, 'heavy', C.main),
          mkSpacer(),
          mkText(refresh, 9, 'bold', C.muted)
        ], 5),
        mkSpacer(12),
        { type: 'stack', direction: 'column', gap: 10, children: releases.slice(0, 3).map(r => buildCompactRow(r, 10)) },
        mkSpacer(),
        mkText('Codex · Claude · Gemini · Grok', 9, 'medium', C.muted, { maxLines: 1, minScale: 0.7 })
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
          mkRow([
            mkIcon(b.icon, b.color, 15),
            mkText(b.name, 14, 'heavy', b.color),
            mkText(`· ${b.vendor}`, 11, 'medium', C.muted),
            mkSpacer(),
            mkText(r.date || '', 11, 'bold', C.muted),
            mkText(tag.text, 10, 'bold', tag.color)
          ], 5),
          mkText(r.titleZh, 13, 'medium', C.main, { maxLines: 2, minScale: 0.75 }),
          mkText(r.summaryZh, 11, 'medium', C.muted, { maxLines: 1, minScale: 0.75 }),
          { type: 'stack', height: 0.5, backgroundColor: C.divider, children: [] }
        ]
      };
    });

    return {
      type: 'widget', padding: 16, url: latestUrl, backgroundGradient: bg,
      children: [
        mkRow([
          mkIcon('antenna.radiowaves.left.and.right', C.main, 17),
          mkText('发布雷达', 17, 'heavy', C.main),
          mkSpacer(),
          mkText('官方源', 10, 'bold', C.green),
          mkText(refresh, 10, 'bold', C.muted)
        ], 6),
        mkSpacer(12),
        { type: 'stack', direction: 'column', gap: 10, flex: 1, children: rows }
      ]
    };
  }

  return {
    type: 'widget', padding: 12, url: latestUrl, backgroundGradient: bg,
    children: [
      mkRow([
        mkIcon('antenna.radiowaves.left.and.right', C.main, 15),
        mkText('发布雷达', 15, 'heavy', C.main),
        mkSpacer(),
        mkText('官方源', 10, 'bold', C.green),
        mkText(refresh, 9, 'bold', C.muted)
      ], 6),
      mkSpacer(12),
      { type: 'stack', direction: 'column', gap: 10, flex: 1, children: releases.slice(0, 4).map(r => buildCompactRow(r, 11)) },
      mkSpacer(6),
      mkText('按发布日期排序 · 每 2 小时自动更新', 9, 'medium', C.muted, { maxLines: 1 })
    ]
  };
}
