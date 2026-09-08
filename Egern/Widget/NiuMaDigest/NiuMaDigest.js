/**
 * 牛马消息 - 黄历查询式固定版面
 * 后台生成精简中文摘要；小号1行、中号2行、大号3行，防止长消息撑爆布局。
 */

const DATA_URL = 'https://raw.githubusercontent.com/DwanWu/codex-upload-files/main/Egern/Widget/NiuMaDigest/NiuMaDigest.json';

export default async function (ctx) {
  const family = String(ctx.widgetFamily || 'systemMedium').toLowerCase();
  const isSmall = family.includes('small');
  const isLarge = family.includes('large');

  const C = {
    bg: [{ light: '#FFFFFF', dark: '#1C1C1E' }, { light: '#F8F7FB', dark: '#111113' }],
    main: { light: '#1C1C1E', dark: '#FFFFFF' },
    muted: { light: '#8E8E93', dark: '#8E8E93' },
    purple: { light: '#7C3AED', dark: '#A78BFA' },
    pink: { light: '#DB2777', dark: '#F472B6' },
    blue: { light: '#2563EB', dark: '#60A5FA' },
    divider: { light: '#E5E5EA', dark: '#38383A' },
    chip: { light: '#F2F2F7', dark: '#2C2C2E' }
  };

  const bg = {
    type: 'linear', colors: C.bg,
    startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 }
  };

  const text = (t, size, weight, color, opts = {}) => ({
    type: 'text', text: String(t ?? ''), font: { size, weight }, textColor: color, ...opts
  });
  const row = (children, gap = 5, opts = {}) => ({
    type: 'stack', direction: 'row', alignItems: 'center', gap, children, ...opts
  });
  const icon = (name, color, size = 13) => ({
    type: 'image', src: `sf-symbol:${name}`, color, width: size, height: size
  });
  const spacer = length => length == null ? { type: 'spacer' } : { type: 'spacer', length };
  const chip = (label, color) => ({
    type: 'stack', direction: 'row', padding: [3, 7, 3, 7], backgroundColor: C.chip,
    children: [text(label, 9, 'bold', color, { maxLines: 1 })]
  });

  const clean = s => String(s || '')
    .replace(/https?:\/\/t\.co\/\w+/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const displayText = item => clean(
    item?.summary_zh || item?.text_zh || item?.translation || item?.text || item?.summary || '暂无消息'
  );

  const fmtDate = value => {
    if (!value) return '--.--';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '--.--';
    const t = new Date(d.getTime() + 8 * 3600 * 1000);
    const p = n => String(n).padStart(2, '0');
    return `${p(t.getUTCMonth() + 1)}.${p(t.getUTCDate())}`;
  };

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
  const reset = data?.latest_reset || feed.find(x => x?.kind === 'reset') || null;
  const update = data?.latest_update || feed.find(x => x?.kind === 'update') || null;
  const latest = [reset, update].filter(Boolean)
    .sort((a, b) => new Date(b?.created_at || 0) - new Date(a?.created_at || 0))[0] || null;

  const latestDate = fmtDate(latest?.created_at);
  const latestUrl = latest?.url || 'https://x.com/thsottiaux';

  const header = size => row([
    icon('antenna.radiowaves.left.and.right', C.purple, size + 1),
    text('牛马消息', size, 'heavy', C.main),
    spacer(),
    chip('X 动态', C.purple)
  ], 6);

  const messageBlock = (label, item, color, ico, maxLines, fontSize) => ({
    type: 'stack', direction: 'row', alignItems: 'start', gap: 8,
    children: [
      {
        type: 'stack', direction: 'row', alignItems: 'center', gap: 3, width: 48,
        children: [icon(ico, color, 13), text(label, 12, 'heavy', color)]
      },
      text(item ? displayText(item) : '暂无消息', fontSize, 'medium', item ? color : C.muted, {
        flex: 1,
        maxLines,
        minScale: 0.82
      })
    ]
  });

  if (!reset && !update) {
    return {
      type: 'widget', padding: 13, url: latestUrl, backgroundGradient: bg,
      children: [
        header(15),
        spacer(12),
        text('Codex', 15, 'heavy', C.main),
        spacer(8),
        text('暂无新消息', 14, 'heavy', C.main),
        spacer(5),
        text(error || '等待下一次数据同步', 11, 'medium', C.muted, { maxLines: 2 }),
        spacer(),
        row([text('Tibo 等', 9, 'bold', C.muted), spacer(), text(latestDate, 9, 'bold', C.muted)])
      ]
    };
  }

  if (isSmall) {
    return {
      type: 'widget', padding: 12, url: latestUrl, backgroundGradient: bg,
      children: [
        header(13),
        spacer(8),
        text('Codex', 13, 'heavy', C.main),
        spacer(9),
        row([
          icon('arrow.clockwise.circle.fill', C.pink, 11),
          text('重置', 10, 'heavy', C.pink),
          text(reset ? displayText(reset) : '暂无消息', 10, 'medium', reset ? C.pink : C.muted, {
            flex: 1, maxLines: 1, minScale: 0.82
          })
        ], 5),
        spacer(8),
        row([
          icon('sparkles', C.blue, 11),
          text('更新', 10, 'heavy', C.blue),
          text(update ? displayText(update) : '暂无消息', 10, 'medium', update ? C.blue : C.muted, {
            flex: 1, maxLines: 1, minScale: 0.82
          })
        ], 5),
        spacer(),
        row([text('Tibo 等', 8, 'bold', C.muted), spacer(), text(latestDate, 8, 'bold', C.muted)])
      ]
    };
  }

  if (isLarge) {
    return {
      type: 'widget', padding: 16, url: latestUrl, backgroundGradient: bg,
      children: [
        header(17),
        spacer(10),
        text('Codex', 20, 'heavy', C.main),
        spacer(10),
        { type: 'stack', height: 0.5, backgroundColor: C.divider, children: [] },
        spacer(12),
        messageBlock('重置', reset, C.pink, 'arrow.clockwise.circle.fill', 3, 16),
        spacer(18),
        messageBlock('更新', update, C.blue, 'sparkles', 3, 16),
        spacer(),
        row([
          text('Tibo · Dominik · Nick · OpenAI Developers', 9, 'medium', C.muted, { maxLines: 1, minScale: 0.82 }),
          spacer(),
          text(latestDate, 10, 'bold', C.muted)
        ])
      ]
    };
  }

  return {
    type: 'widget', padding: 13, url: latestUrl, backgroundGradient: bg,
    children: [
      header(15),
      spacer(9),
      text('Codex', 15, 'heavy', C.main),
      spacer(10),
      messageBlock('重置', reset, C.pink, 'arrow.clockwise.circle.fill', 2, 14),
      spacer(13),
      messageBlock('更新', update, C.blue, 'sparkles', 2, 14),
      spacer(),
      row([
        text('Tibo 等', 9, 'bold', C.muted),
        spacer(),
        text(latestDate, 10, 'bold', C.muted)
      ])
    ]
  };
}
