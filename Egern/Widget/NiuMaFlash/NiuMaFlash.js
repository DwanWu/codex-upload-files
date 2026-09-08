/**
 * 牛马消息 - iOS 叠层极简版
 * 显示最近两条 Codex 重置/更新消息。
 */

const DATA_URL = 'https://raw.githubusercontent.com/DwanWu/codex-upload-files/main/Egern/Widget/NiuMaFlash/NiuMaFlash.json';

export default async function (ctx) {
  const family = String(ctx.widgetFamily || 'systemMedium').toLowerCase();
  const isSmall = family.includes('small');
  const isLarge = family.includes('large');

  const C = {
    bg: [{ light: '#FFFFFF', dark: '#1C1C1E' }, { light: '#F2F2F7', dark: '#0C0C0E' }],
    front: { light: '#FFFFFF', dark: '#2C2C2E' },
    back: { light: '#EEEAF8', dark: '#25202F' },
    main: { light: '#1C1C1E', dark: '#FFFFFF' },
    muted: { light: '#8E8E93', dark: '#8E8E93' },
    blue: { light: '#2563EB', dark: '#60A5FA' },
    purple: { light: '#7C3AED', dark: '#A78BFA' },
    pink: { light: '#DB2777', dark: '#F472B6' }
  };

  const backgroundGradient = {
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
    type: 'stack', direction: 'column', alignItems: 'center', gap, children, ...opts
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

  const items = feed.slice(0, 2);
  const latest = items[0] || null;
  const second = items[1] || null;
  const syncTime = fmtTime(data?.updated_at, false);
  const latestUrl = latest?.url || 'https://x.com/thsottiaux';

  const kindMeta = item => {
    const reset = item?.kind === 'reset';
    return {
      label: reset ? '重置' : '更新',
      color: reset ? C.pink : C.blue
    };
  };

  const infoCard = (item, cfg, back = false) => {
    const meta = kindMeta(item);
    const author = item?.author_name || item?.handle || 'X';
    const postTime = fmtTime(item?.created_at, true);

    return {
      type: 'stack', direction: 'column', alignItems: 'center', flex: 1,
      height: cfg.height,
      backgroundColor: back ? C.back : C.front,
      borderRadius: cfg.radius,
      padding: cfg.padding,
      children: [
        text(meta.label, cfg.labelSize, 'heavy', meta.color, { maxLines: 1, textAlign: 'center' }),
        spacer(cfg.labelGap),
        text(displayText(item), cfg.messageSize, 'heavy', meta.color, {
          maxLines: cfg.lines,
          minScale: 0.62,
          flex: 1,
          textAlign: 'center'
        }),
        spacer(cfg.metaGap),
        text(`${author} · ${postTime}`, cfg.metaSize, 'medium', C.muted, {
          maxLines: 1,
          minScale: 0.7,
          textAlign: 'center'
        })
      ]
    };
  };

  const stackedCards = (frontItem, backItem, cfg) => ({
    type: 'stack',
    height: cfg.stackHeight,
    children: [
      ...(backItem ? [{
        type: 'stack', direction: 'column', alignItems: 'center', children: [
          spacer(cfg.backTop),
          row([
            spacer(cfg.backInset),
            infoCard(backItem, cfg.backCard, true),
            spacer(cfg.backInset)
          ], 0),
          spacer()
        ]
      }] : []),
      {
        type: 'stack', direction: 'column', alignItems: 'center', children: [
          spacer(cfg.frontTop),
          row([
            spacer(cfg.frontInset),
            infoCard(frontItem, cfg.frontCard, false),
            spacer(cfg.frontInset)
          ], 0),
          spacer()
        ]
      }
    ]
  });

  if (!latest) {
    return {
      type: 'widget', padding: 14, url: latestUrl, backgroundGradient,
      children: [
        row([spacer(), icon('antenna.radiowaves.left.and.right', C.purple, 16), text('牛马消息', 15, 'heavy', C.main), spacer()], 6),
        spacer(),
        text('暂无新消息', 15, 'heavy', C.main, { textAlign: 'center' }),
        spacer(4),
        text(error || '等待下一次同步', 10, 'medium', C.muted, { maxLines: 2, textAlign: 'center' }),
        spacer(),
        row([spacer(), text(syncTime, 9, 'medium', C.muted), spacer()], 0)
      ]
    };
  }

  if (isSmall) {
    const cfg = {
      stackHeight: 96,
      backTop: 0,
      frontTop: 33,
      backInset: 15,
      frontInset: 4,
      backCard: { height: 58, radius: 14, padding: [7, 10, 7, 10], labelSize: 8, labelGap: 2, messageSize: 10, lines: 2, metaGap: 2, metaSize: 7 },
      frontCard: { height: 63, radius: 15, padding: [8, 10, 8, 10], labelSize: 8, labelGap: 3, messageSize: 11, lines: 2, metaGap: 2, metaSize: 7 }
    };
    return {
      type: 'widget', padding: [10, 10, 7, 10], url: latestUrl, backgroundGradient,
      children: [
        row([spacer(), icon('antenna.radiowaves.left.and.right', C.purple, 14), text('牛马消息', 13, 'heavy', C.main), spacer()], 5),
        spacer(6),
        stackedCards(latest, second, cfg),
        spacer(),
        row([spacer(), text(syncTime, 8, 'medium', C.muted), spacer()], 0)
      ]
    };
  }

  if (isLarge) {
    const cfg = {
      stackHeight: 184,
      backTop: 0,
      frontTop: 62,
      backInset: 34,
      frontInset: 12,
      backCard: { height: 108, radius: 20, padding: [14, 20, 14, 20], labelSize: 11, labelGap: 5, messageSize: 16, lines: 3, metaGap: 5, metaSize: 9 },
      frontCard: { height: 122, radius: 22, padding: [16, 22, 16, 22], labelSize: 12, labelGap: 6, messageSize: 18, lines: 4, metaGap: 6, metaSize: 10 }
    };
    return {
      type: 'widget', padding: [15, 16, 12, 16], url: latestUrl, backgroundGradient,
      children: [
        row([spacer(), icon('antenna.radiowaves.left.and.right', C.purple, 18), text('牛马消息', 17, 'heavy', C.main), spacer()], 6),
        spacer(12),
        stackedCards(latest, second, cfg),
        spacer(),
        row([spacer(), text(syncTime, 10, 'medium', C.muted), spacer()], 0)
      ]
    };
  }

  const cfg = {
    stackHeight: 108,
    backTop: 0,
    frontTop: 38,
    backInset: 24,
    frontInset: 6,
    backCard: { height: 66, radius: 15, padding: [8, 14, 8, 14], labelSize: 8, labelGap: 3, messageSize: 11, lines: 2, metaGap: 3, metaSize: 7 },
    frontCard: { height: 70, radius: 16, padding: [9, 15, 9, 15], labelSize: 9, labelGap: 4, messageSize: 13, lines: 2, metaGap: 3, metaSize: 8 }
  };

  return {
    type: 'widget', padding: [10, 12, 7, 12], url: latestUrl, backgroundGradient,
    children: [
      row([spacer(), icon('antenna.radiowaves.left.and.right', C.purple, 16), text('牛马消息', 15, 'heavy', C.main), spacer()], 6),
      spacer(7),
      stackedCards(latest, second, cfg),
      spacer(),
      row([spacer(), text(syncTime, 9, 'medium', C.muted), spacer()], 0)
    ]
  };
}
