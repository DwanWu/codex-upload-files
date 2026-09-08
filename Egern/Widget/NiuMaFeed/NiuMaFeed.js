/**
 * 牛马消息 - 极简版
 * 只突出最新一条 Codex 重置/更新消息。
 */

const DATA_URL = 'https://raw.githubusercontent.com/DwanWu/codex-upload-files/main/Egern/Widget/NiuMaFeed/NiuMaFeed.json';

export default async function (ctx) {
  const family = String(ctx.widgetFamily || 'systemMedium').toLowerCase();
  const isSmall = family.includes('small');
  const isLarge = family.includes('large');

  const C = {
    bg: [{ light: '#FFFFFF', dark: '#1C1C1E' }, { light: '#F2F2F7', dark: '#0C0C0E' }],
    card: { light: '#FFFFFF', dark: '#2C2C2E' },
    main: { light: '#1C1C1E', dark: '#FFFFFF' },
    sub: { light: '#48484A', dark: '#D1D1D6' },
    muted: { light: '#8E8E93', dark: '#8E8E93' },
    blue: { light: '#2563EB', dark: '#60A5FA' },
    purple: { light: '#7C3AED', dark: '#A78BFA' },
    pink: { light: '#DB2777', dark: '#F472B6' }
  };

  const bg = {
    type: 'linear', colors: C.bg,
    startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 }
  };

  const text = (t, size, weight, color, opts = {}) => ({
    type: 'text', text: String(t ?? ''), font: { size, weight }, textColor: color, ...opts
  });
  const row = (children, gap = 4, opts = {}) => ({
    type: 'stack', direction: 'row', alignItems: 'center', gap, children, ...opts
  });
  const col = (children, gap = 4, opts = {}) => ({
    type: 'stack', direction: 'column', gap, children, ...opts
  });
  const icon = (name, color, size) => ({
    type: 'image', src: `sf-symbol:${name}`, color, width: size, height: size
  });
  const spacer = length => length == null ? { type: 'spacer' } : { type: 'spacer', length };

  const clean = s => String(s || '')
    .replace(/https?:\/\/t\.co\/\w+/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const displayText = item => clean(item?.text_zh || item?.translation || item?.text || item?.summary || '暂无内容');

  const fmtTime = (value, withDate = true) => {
    if (!value) return withDate ? '--.-- --:--' : '--:--';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return withDate ? '--.-- --:--' : '--:--';
    const t = new Date(d.getTime() + 8 * 3600 * 1000);
    const p = n => String(n).padStart(2, '0');
    return withDate
      ? `${p(t.getUTCMonth() + 1)}.${p(t.getUTCDate())} ${p(t.getUTCHours())}:${p(t.getUTCMinutes())}`
      : `${p(t.getUTCHours())}:${p(t.getUTCMinutes())}`;
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

  const feed = Array.isArray(data?.feed) ? [...data.feed] : [];
  if (!feed.length) {
    [data?.latest_reset, data?.latest_update].filter(Boolean).forEach(x => feed.push(x));
  }
  feed.sort((a, b) => new Date(b?.created_at || 0) - new Date(a?.created_at || 0));

  const latest = feed[0] || null;
  const syncTime = fmtTime(data?.updated_at, false);
  const latestUrl = latest?.url || 'https://x.com/thsottiaux';

  if (!latest) {
    return {
      type: 'widget', padding: 14, url: latestUrl, backgroundGradient: bg,
      children: [
        row([
          icon('antenna.radiowaves.left.and.right', C.purple, 16),
          text('牛马消息', 15, 'heavy', C.main)
        ], 6),
        spacer(),
        text('暂无新消息', 16, 'heavy', C.main),
        spacer(5),
        text(error || '等待下一次同步', 10, 'medium', C.muted, { maxLines: 2 }),
        spacer(),
        text(`同步时间：${syncTime}`, 9, 'medium', C.muted)
      ]
    };
  }

  const isReset = latest.kind === 'reset';
  const kindLabel = isReset ? '重置' : '更新';
  const kindColor = isReset ? C.pink : C.blue;
  const author = latest.author_name || latest.handle || 'X';
  const message = displayText(latest);
  const postTime = fmtTime(latest.created_at, true);

  if (isSmall) {
    return {
      type: 'widget', padding: 11, url: latestUrl, backgroundGradient: bg,
      children: [
        row([
          icon('antenna.radiowaves.left.and.right', C.purple, 14),
          text('牛马消息', 13, 'heavy', C.main),
          spacer(),
          text(kindLabel, 9, 'heavy', kindColor)
        ], 5),
        spacer(10),
        text(message, 12, 'heavy', C.main, { maxLines: 5, minScale: 0.72 }),
        spacer(),
        row([
          text(author, 8, 'bold', C.muted),
          spacer(4),
          text(postTime, 8, 'medium', C.muted),
          spacer(),
          text(`同步 ${syncTime}`, 8, 'medium', C.muted)
        ], 0)
      ]
    };
  }

  if (isLarge) {
    return {
      type: 'widget', padding: 16, url: latestUrl, backgroundGradient: bg,
      children: [
        row([
          icon('antenna.radiowaves.left.and.right', C.purple, 18),
          text('牛马消息', 17, 'heavy', C.main),
          spacer(),
          text(kindLabel, 12, 'heavy', kindColor)
        ], 6),
        spacer(22),
        {
          type: 'stack', direction: 'column', flex: 1,
          backgroundColor: C.card, borderRadius: 16, padding: [18, 18, 18, 18],
          children: [
            spacer(),
            text(message, 20, 'heavy', C.main, { maxLines: 7, minScale: 0.72 }),
            spacer(),
            text(`${author} · ${postTime}`, 11, 'bold', C.muted)
          ]
        },
        spacer(12),
        text(`同步时间：${syncTime}`, 9, 'medium', C.muted)
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
        text(kindLabel, 10, 'heavy', kindColor)
      ], 6),
      spacer(16),
      {
        type: 'stack', direction: 'column',
        backgroundColor: C.card, borderRadius: 14, padding: [13, 14, 13, 14],
        children: [
          text(message, 15, 'heavy', C.main, { maxLines: 4, minScale: 0.72 })
        ]
      },
      spacer(),
      row([
        text(`${author} · ${postTime}`, 9, 'bold', C.muted),
        spacer(),
        text(`同步时间：${syncTime}`, 9, 'medium', C.muted)
      ], 0)
    ]
  };
}
