/**
 * 牛马消息
 * 主源由 GitHub Actions 免费抓取，ChatGPT 定时联网查询作为独立补充源。
 * 两边按帖子 ID / 规范化 X 链接合并，只显示分类、时间和精简摘要。
 */

const DATA_URL = 'https://raw.githubusercontent.com/DwanWu/codex-upload-files/main/Egern/Widget/NiuMaDigest/NiuMaDigest.json';
const CHATGPT_DATA_URL = 'https://raw.githubusercontent.com/DwanWu/codex-upload-files/main/Egern/Widget/NiuMaDigest/NiuMaDigestChatGPT.json';

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
  const col = (children, gap = 4, opts = {}) => ({
    type: 'stack', direction: 'column', gap, children, ...opts
  });
  const icon = (name, color, size = 13) => ({
    type: 'image', src: `sf-symbol:${name}`, color, width: size, height: size
  });
  const spacer = length => length == null ? { type: 'spacer' } : { type: 'spacer', length };
  const divider = () => ({ type: 'stack', height: 0.5, backgroundColor: C.divider, children: [] });
  const chip = (label, color) => ({
    type: 'stack', direction: 'row', padding: [3, 7, 3, 7], backgroundColor: C.chip,
    children: [text(label, 9, 'bold', color, { maxLines: 1 })]
  });

  const clean = s => String(s || '')
    .replace(/https?:\/\/t\.co\/\w+/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const normalizeUrl = value => String(value || '')
    .trim()
    .replace(/^http:\/\/twitter\.com\//i, 'https://x.com/')
    .replace(/^https:\/\/twitter\.com\//i, 'https://x.com/')
    .replace(/[?#].*$/, '')
    .replace(/\/$/, '');

  const compactText = s => clean(s)
    .replace(/已经/g, '已')
    .replace(/目前正在/g, '正')
    .replace(/正在/g, '')
    .replace(/将会/g, '将')
    .replace(/陆续开始/g, '陆续')
    .replace(/正式开始/g, '开始')
    .replace(/进行完整的/g, '进行完整')
    .replace(/\s+/g, ' ')
    .trim();

  const summaryText = item => {
    const summary = clean(item?.summary_zh || item?.summary || '');
    const fullZh = compactText(item?.text_zh || item?.translation || item?.text || '');

    if (summary.endsWith('…') && fullZh && fullZh.length > summary.length) {
      return fullZh.slice(0, 160);
    }

    return summary || fullZh || '暂无消息';
  };

  const fmtDateTime = value => {
    if (!value) return '--.-- --:--';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '--.-- --:--';
    const t = new Date(d.getTime() + 8 * 3600 * 1000);
    const p = n => String(n).padStart(2, '0');
    return `${p(t.getUTCMonth() + 1)}.${p(t.getUTCDate())} ${p(t.getUTCHours())}:${p(t.getUTCMinutes())}`;
  };

  const fmtSyncTime = value => {
    if (!value) return '--:--';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '--:--';
    const t = new Date(d.getTime() + 8 * 3600 * 1000);
    const p = n => String(n).padStart(2, '0');
    return `${p(t.getUTCHours())}:${p(t.getUTCMinutes())}`;
  };

  const fetchJson = async url => {
    const resp = await ctx.http.get(`${url}?t=${Date.now()}`, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
      timeout: 8000
    });
    return JSON.parse(await resp.text());
  };

  let data = null;
  let chatgptData = null;
  const errors = [];

  const [mainResult, chatgptResult] = await Promise.allSettled([
    fetchJson(DATA_URL),
    fetchJson(CHATGPT_DATA_URL)
  ]);

  if (mainResult.status === 'fulfilled') {
    data = mainResult.value;
  } else {
    errors.push(mainResult.reason?.message || String(mainResult.reason));
  }

  if (chatgptResult.status === 'fulfilled') {
    chatgptData = chatgptResult.value;
  } else {
    errors.push(chatgptResult.reason?.message || String(chatgptResult.reason));
  }

  const merged = new Map();
  const urlKeys = new Map();
  const addItems = items => {
    for (const raw of Array.isArray(items) ? items : []) {
      const item = raw && typeof raw === 'object' ? raw : null;
      const id = String(item?.id || '').trim();
      const urlKey = normalizeUrl(item?.url);
      if (!id && !urlKey) continue;

      let key = id ? `id:${id}` : `url:${urlKey}`;
      if (urlKey && urlKeys.has(urlKey)) {
        key = urlKeys.get(urlKey);
      }

      const previous = merged.get(key) || {};
      merged.set(key, { ...previous, ...item });
      if (urlKey) urlKeys.set(urlKey, key);
    }
  };

  addItems(data?.feed);
  addItems(chatgptData?.feed);

  const feed = Array.from(merged.values())
    .filter(item => !Number.isNaN(new Date(item?.created_at || 0).getTime()))
    .sort((a, b) => new Date(b?.created_at || 0) - new Date(a?.created_at || 0));

  const reset = feed.find(x => x?.kind === 'reset') || null;
  const update = feed.find(x => x?.kind === 'update') || null;
  const latest = [reset, update].filter(Boolean)
    .sort((a, b) => new Date(b?.created_at || 0) - new Date(a?.created_at || 0))[0] || null;
  const latestUrl = latest?.url || 'https://x.com/thsottiaux';

  const syncCandidates = [data?.updated_at, chatgptData?.updated_at]
    .filter(Boolean)
    .filter(value => !Number.isNaN(new Date(value).getTime()))
    .sort((a, b) => new Date(b) - new Date(a));
  const syncTime = fmtSyncTime(syncCandidates[0]);

  const header = size => row([
    icon('antenna.radiowaves.left.and.right', C.purple, size + 1),
    text('牛马消息', size, 'heavy', C.main),
    spacer(),
    chip('X 动态', C.purple)
  ], 6);

  const eventBlock = (item, kind, compact = false) => {
    const isReset = kind === 'reset';
    const color = isReset ? C.pink : C.blue;
    const label = isReset ? '重置' : '更新';
    const ico = isReset ? 'arrow.clockwise.circle.fill' : 'sparkles';

    if (!item) {
      return col([
        row([
          icon(ico, color, compact ? 10 : 12),
          text(label, compact ? 9 : 10, 'heavy', color),
          spacer(),
          text('暂无', 9, 'bold', C.muted)
        ], 4),
        text('等待新的 X 消息', compact ? 9 : 10, 'medium', C.muted, { maxLines: 1 })
      ], 3);
    }

    const summary = summaryText(item);

    return col([
      row([
        icon(ico, color, compact ? 10 : 12),
        text(label, compact ? 9 : 10, 'heavy', color),
        spacer(),
        text(fmtDateTime(item.created_at), compact ? 8 : 9, 'bold', color, { maxLines: 1 })
      ], 4),
      text(summary, compact ? 10 : 11, 'heavy', color, {
        maxLines: 2,
        minScale: compact ? 0.78 : 0.86
      })
    ], compact ? 3 : 4, { url: item.url });
  };

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
        text(errors[0] || '等待下一次数据同步', 11, 'medium', C.muted, { maxLines: 2 }),
        spacer(),
        row([
          text(`${data?.accounts_ok ?? 0}/${data?.accounts_total ?? 4} 源`, 9, 'bold', C.muted),
          spacer(),
          text(`同步 ${syncTime}`, 9, 'bold', C.muted)
        ])
      ]
    };
  }

  if (isSmall) {
    const item = latest;
    const kind = item?.kind === 'reset' ? 'reset' : 'update';
    return {
      type: 'widget', padding: 11, url: item?.url || latestUrl, backgroundGradient: bg,
      children: [
        header(13),
        spacer(8),
        eventBlock(item, kind, true),
        spacer(),
        row([
          text(`${data?.accounts_ok ?? 0}/${data?.accounts_total ?? 4} 源`, 8, 'bold', C.muted),
          spacer(),
          text(`同步 ${syncTime}`, 8, 'bold', C.muted)
        ])
      ]
    };
  }

  if (isLarge) {
    const items = feed.slice(0, 4);
    return {
      type: 'widget', padding: 16, url: latestUrl, backgroundGradient: bg,
      children: [
        header(17),
        spacer(10),
        col(items.flatMap((item, i) => [
          eventBlock(item, item?.kind === 'reset' ? 'reset' : 'update', false),
          ...(i < items.length - 1 ? [divider()] : [])
        ]), 8, { flex: 1 }),
        spacer(6),
        row([
          text(`${data?.accounts_ok ?? 0}/${data?.accounts_total ?? 4} 源`, 9, 'medium', C.muted),
          spacer(),
          text(`同步 ${syncTime}`, 9, 'bold', C.muted)
        ])
      ]
    };
  }

  return {
    type: 'widget', padding: [10, 12, 8, 12], url: latestUrl, backgroundGradient: bg,
    children: [
      header(15),
      spacer(),
      col([
        eventBlock(reset, 'reset', false),
        spacer(7),
        divider(),
        spacer(7),
        eventBlock(update, 'update', false)
      ], 0),
      spacer(),
      row([
        text(`${data?.accounts_ok ?? 0}/${data?.accounts_total ?? 4} 源`, 8, 'medium', C.muted),
        spacer(),
        text(`同步 ${syncTime}`, 8, 'bold', C.muted)
      ])
    ]
  };
}
