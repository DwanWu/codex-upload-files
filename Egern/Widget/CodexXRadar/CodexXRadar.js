/**
 * 牛马消息
 * 跟踪 X 上 Codex 的重置/额度与更新/发布消息。
 * 数据由 GitHub Actions 抓取并翻译为中文后写入 JSON。
 */

const DATA_URL = 'https://raw.githubusercontent.com/DwanWu/codex-upload-files/main/Egern/Widget/CodexXRadar/CodexXRadar.json';

export default async function (ctx) {
  const family = String(ctx.widgetFamily || 'systemMedium').toLowerCase();
  const isSmall = family.includes('small');
  const isLarge = family.includes('large');

  const C = {
    bg: [{ light: '#FFFFFF', dark: '#1C1C1E' }, { light: '#F2F2F7', dark: '#0C0C0E' }],
    main: { light: '#1C1C1E', dark: '#FFFFFF' },
    sub: { light: '#48484A', dark: '#D1D1D6' },
    muted: { light: '#8E8E93', dark: '#8E8E93' },
    green: { light: '#15803D', dark: '#4ADE80' },
    blue: { light: '#2563EB', dark: '#60A5FA' },
    purple: { light: '#7C3AED', dark: '#A78BFA' },
    pink: { light: '#DB2777', dark: '#F472B6' },
    red: { light: '#C0392B', dark: '#FF453A' },
    divider: { light: '#E5E5EA', dark: '#38383A' }
  };

  const bg = { type: 'linear', colors: C.bg, startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 } };
  const text = (t, size, weight, color, opts = {}) => ({
    type: 'text', text: String(t ?? ''), font: { size, weight }, textColor: color, ...opts
  });
  const row = (children, gap = 4, opts = {}) => ({
    type: 'stack', direction: 'row', alignItems: 'center', gap, children, ...opts
  });
  const col = (children, gap = 4, opts = {}) => ({
    type: 'stack', direction: 'column', gap, children, ...opts
  });
  const icon = (name, color, size = 13) => ({ type: 'image', src: `sf-symbol:${name}`, color, width: size, height: size });
  const spacer = length => length == null ? { type: 'spacer' } : { type: 'spacer', length };
  const divider = () => ({ type: 'stack', height: 0.5, backgroundColor: C.divider, children: [] });

  const fmtDate = value => {
    if (!value) return '--.--';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '--.--';
    const t = new Date(d.getTime() + 8 * 3600 * 1000);
    const p = n => String(n).padStart(2, '0');
    return `${p(t.getUTCMonth() + 1)}.${p(t.getUTCDate())} ${p(t.getUTCHours())}:${p(t.getUTCMinutes())}`;
  };

  const clean = s => String(s || '')
    .replace(/https?:\/\/t\.co\/\w+/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const displayText = item => clean(item?.text_zh || item?.translation || item?.text || item?.summary || '');

  let data = null;
  let error = '';
  try {
    const resp = await ctx.http.get(`${DATA_URL}?t=${Date.now()}`, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
      timeout: 8000
    });
    data = JSON.parse(await resp.text());
  } catch (e) {
    error = e?.message || String(e);
  }

  const feed = Array.isArray(data?.feed) ? data.feed : [];
  const reset = data?.latest_reset || feed.find(x => x.kind === 'reset') || null;
  const update = data?.latest_update || feed.find(x => x.kind === 'update') || null;
  const latest = [reset, update].filter(Boolean).sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))[0] || null;
  const latestUrl = latest?.url || 'https://x.com/thsottiaux';

  if (!reset && !update) {
    return {
      type: 'widget', padding: 14, url: latestUrl, backgroundGradient: bg,
      children: [
        row([icon('antenna.radiowaves.left.and.right', C.purple, 15), text('牛马消息', 15, 'heavy', C.main)], 6),
        spacer(10),
        text('暂未获取到 Codex 动态', 12, 'bold', C.sub),
        spacer(4),
        text(error || '等待 Tibo 等账号的新消息', 10, 'medium', C.muted, { maxLines: 3 })
      ]
    };
  }

  const eventRow = (item, kind, compact = false) => {
    if (!item) {
      return col([
        row([text(kind === 'reset' ? '重置' : '更新', compact ? 9 : 10, 'heavy', kind === 'reset' ? C.pink : C.blue), spacer(), text('暂无', 9, 'bold', C.muted)], 0),
        text('等待新的 X 消息', compact ? 9 : 10, 'medium', C.muted)
      ], 4);
    }
    const color = kind === 'reset' ? C.pink : C.blue;
    const label = kind === 'reset' ? '重置' : '更新';
    return col([
      row([
        text(label, compact ? 9 : 10, 'heavy', color),
        text(item.author_name || item.handle || 'X', compact ? 9 : 10, 'heavy', C.main),
        text(`@${item.handle || ''}`, compact ? 8 : 9, 'medium', C.muted, { maxLines: 1 }),
        spacer(),
        text(fmtDate(item.created_at), compact ? 8 : 9, 'bold', color)
      ], 5),
      text(displayText(item), compact ? 9 : 11, 'medium', C.sub, { maxLines: compact ? 2 : 2, minScale: 0.68 })
    ], compact ? 4 : 5);
  };

  if (isSmall) {
    const item = latest;
    const kind = item?.kind === 'reset' ? 'reset' : 'update';
    return {
      type: 'widget', padding: 11, url: item?.url || latestUrl, backgroundGradient: bg,
      children: [
        row([
          icon('antenna.radiowaves.left.and.right', C.purple, 14),
          text('牛马消息', 13, 'heavy', C.main),
          spacer(),
          text(kind === 'reset' ? '重置' : '更新', 9, 'heavy', kind === 'reset' ? C.pink : C.blue)
        ], 5),
        spacer(10),
        eventRow(item, kind, true),
        spacer(),
        text('Tibo 等 · 中文 X 动态', 8, 'medium', C.muted)
      ]
    };
  }

  if (isLarge) {
    const rows = feed.slice(0, 5).map((item, i) => col([
      eventRow(item, item.kind === 'reset' ? 'reset' : 'update', false),
      ...(i < Math.min(feed.length, 5) - 1 ? [divider()] : [])
    ], 7));

    return {
      type: 'widget', padding: 16, url: latestUrl, backgroundGradient: bg,
      children: [
        row([
          icon('antenna.radiowaves.left.and.right', C.purple, 18),
          text('牛马消息', 17, 'heavy', C.main),
          spacer(),
          text(`${data?.accounts_ok ?? 0}/${data?.accounts_total ?? 4} 源`, 10, 'bold', C.purple)
        ], 6),
        spacer(12),
        col(rows, 9, { flex: 1 }),
        spacer(6),
        text('重置/额度 · 更新/发布 · 中文翻译 · 每小时同步 X', 9, 'medium', C.muted)
      ]
    };
  }

  return {
    type: 'widget', padding: [11, 12, 9, 12], url: latestUrl, backgroundGradient: bg,
    children: [
      row([
        icon('antenna.radiowaves.left.and.right', C.purple, 16),
        text('牛马消息', 15, 'heavy', C.main),
        spacer(),
        text('Tibo 等', 10, 'bold', C.purple)
      ], 6),
      spacer(11),
      eventRow(reset, 'reset', false),
      spacer(9),
      divider(),
      spacer(9),
      eventRow(update, 'update', false),
      spacer(),
      text('每小时同步 X · 自动翻译中文 · 点击打开原帖', 9, 'medium', C.muted)
    ]
  };
}
