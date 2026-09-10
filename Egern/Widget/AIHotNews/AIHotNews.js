/**
 * 智能热搜 · AIHOT
 * 数据源：AIHOT 官方匿名只读 REST API v1
 * 主榜：/api/v1/hot-topics
 * 降级：/api/v1/items?mode=selected&window=24h&limit=8
 */

const API_BASE = 'https://aihot.virxact.com';
const HOT_URL = `${API_BASE}/api/v1/hot-topics`;
const FALLBACK_URL = `${API_BASE}/api/v1/items?mode=selected&window=24h&limit=8`;
const HOME_URL = 'https://aihot.news/hot';

export default async function (ctx) {
  const family = String(ctx.widgetFamily || 'systemMedium').toLowerCase();
  const isSmall = family.includes('small');
  const isLarge = family.includes('large');
  const refreshAfter = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  const C = {
    bg: [{ light: '#FFFDFC', dark: '#1C1C1E' }, { light: '#FFF4F0', dark: '#111113' }],
    main: { light: '#1D1D1F', dark: '#F5F5F7' },
    muted: { light: '#8E8E93', dark: '#8E8E93' },
    red: { light: '#E5484D', dark: '#FF6961' },
    orange: { light: '#F59E0B', dark: '#FFB340' },
    gold: { light: '#B7791F', dark: '#FFD60A' },
    blue: { light: '#2563EB', dark: '#64D2FF' },
    chip: { light: '#F2F2F7', dark: '#2C2C2E' },
    divider: { light: '#E9E9ED', dark: '#38383A' }
  };

  const bg = {
    type: 'linear',
    colors: C.bg,
    startPoint: { x: 0, y: 0 },
    endPoint: { x: 1, y: 1 }
  };

  const text = (value, size, weight, color, opts = {}) => ({
    type: 'text',
    text: String(value ?? ''),
    font: { size, weight },
    textColor: color,
    ...opts
  });
  const row = (children, gap = 5, opts = {}) => ({
    type: 'stack', direction: 'row', alignItems: 'center', gap, children, ...opts
  });
  const col = (children, gap = 4, opts = {}) => ({
    type: 'stack', direction: 'column', gap, children, ...opts
  });
  const spacer = length => length == null ? { type: 'spacer' } : { type: 'spacer', length };
  const icon = (name, color, size = 13) => ({
    type: 'image', src: `sf-symbol:${name}`, color, width: size, height: size
  });
  const divider = () => ({
    type: 'stack', height: 0.5, backgroundColor: C.divider, children: []
  });
  const chip = (label, color = C.blue) => ({
    type: 'stack', direction: 'row', padding: [3, 7, 3, 7], backgroundColor: C.chip,
    children: [text(label, 9, 'bold', color, { maxLines: 1 })]
  });

  const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
  const num = value => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  };

  const formatClock = value => {
    if (!value) return '--:--';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '--:--';
    const t = new Date(d.getTime() + 8 * 3600 * 1000);
    const p = n => String(n).padStart(2, '0');
    return `${p(t.getUTCHours())}:${p(t.getUTCMinutes())}`;
  };

  const normalizeAIHotUrl = value => {
    const url = clean(value);
    if (!url) return HOME_URL;
    const story = url.match(/\/story\/([^/?#]+)/i);
    if (story) return `https://aihot.news/story/${story[1]}`;
    const item = url.match(/\/items\/([^/?#]+)/i);
    if (item) return `https://aihot.news/items/${item[1]}`;
    return url;
  };

  const getJson = async url => {
    const resp = await ctx.http.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      },
      timeout: 8000
    });
    return JSON.parse(await resp.text());
  };

  let mode = 'hot';
  let items = [];
  let errorText = '';
  let syncAt = null;

  try {
    const payload = await getJson(HOT_URL);
    const raw = Array.isArray(payload?.items) ? payload.items : [];
    items = raw.map((item, index) => ({
      rank: num(item?.rank) || index + 1,
      title: clean(item?.title || item?.name || item?.topic || item?.latest) || 'AI 热点',
      sourceCount: num(item?.sourceCount),
      signalCount: num(item?.signalCount),
      latestAt: item?.latestAt || null,
      url: normalizeAIHotUrl(item?.links?.story)
    })).sort((a, b) => a.rank - b.rank);
    if (items.length) syncAt = new Date().toISOString();
  } catch (e) {
    errorText = e?.message || String(e);
  }

  if (!items.length) {
    mode = 'selected';
    try {
      const payload = await getJson(FALLBACK_URL);
      const raw = Array.isArray(payload?.items) ? payload.items : [];
      items = raw.map((item, index) => ({
        rank: index + 1,
        title: clean(item?.title) || 'AI 精选',
        sourceCount: 1,
        signalCount: 0,
        latestAt: item?.publishedAt || item?.discoveredAt || null,
        url: normalizeAIHotUrl(item?.links?.aihot)
      }));
      if (items.length) syncAt = new Date().toISOString();
    } catch (e) {
      errorText = e?.message || String(e);
    }
  }

  const rankColor = rank => rank === 1 ? C.red : rank === 2 ? C.orange : rank === 3 ? C.gold : C.muted;
  const rankBadge = (rank, compact = false) => ({
    type: 'stack', direction: 'row', alignItems: 'center',
    width: compact ? 22 : 25,
    children: [
      text(String(rank), compact ? 11 : 12, 'heavy', rankColor(rank), {
        maxLines: 1, minScale: 0.8
      })
    ]
  });

  const hotRow = (item, compact = false) => row([
    rankBadge(item.rank, compact),
    text(item.title, compact ? 10 : 11, item.rank <= 3 ? 'heavy' : 'bold', C.main, {
      maxLines: compact ? 2 : 1,
      minScale: compact ? 0.72 : 0.78
    }),
    spacer()
  ], compact ? 3 : 5, {
    url: item.url || HOME_URL,
    padding: compact ? [2, 0, 2, 0] : [3, 0, 3, 0]
  });

  const header = size => row([
    icon('flame.fill', C.blue, size + 1),
    text('智能热搜', size, 'heavy', C.main),
    spacer(),
    chip(mode === 'hot' ? '热榜' : '精选', C.blue)
  ], 6);

  const footer = size => row([
    text('AIHOT', size, 'medium', C.muted, { maxLines: 1 }),
    spacer(),
    text(syncAt ? formatClock(syncAt) : '--:--', size, 'medium', C.muted, { maxLines: 1 })
  ]);

  if (!items.length) {
    return {
      type: 'widget', refreshAfter, padding: 13, url: HOME_URL, backgroundGradient: bg,
      children: [
        header(15),
        spacer(),
        col([
          icon('wifi.exclamationmark', C.muted, 24),
          text('暂时无法读取 AIHOT', 13, 'heavy', C.main, { maxLines: 1 }),
          text(clean(errorText) || '等待下一次刷新', 10, 'medium', C.muted, { maxLines: 2 })
        ], 6, { alignItems: 'center' }),
        spacer(),
        footer(8)
      ]
    };
  }

  if (isSmall) {
    const shown = items.slice(0, 3);
    return {
      type: 'widget', refreshAfter, padding: 11, url: shown[0]?.url || HOME_URL, backgroundGradient: bg,
      children: [
        header(13),
        spacer(7),
        col(shown.flatMap((item, i) => [
          hotRow(item, true),
          ...(i < shown.length - 1 ? [divider()] : [])
        ]), 4),
        spacer(),
        footer(8)
      ]
    };
  }

  if (isLarge) {
    const shown = items.slice(0, 8);
    return {
      type: 'widget', refreshAfter, padding: 15, url: HOME_URL, backgroundGradient: bg,
      children: [
        header(17),
        spacer(8),
        col(shown.flatMap((item, i) => [
          hotRow(item, false),
          ...(i < shown.length - 1 ? [divider()] : [])
        ]), 2, { flex: 1 }),
        spacer(6),
        footer(9)
      ]
    };
  }

  const shown = items.slice(0, 5);
  return {
    type: 'widget', refreshAfter, padding: [10, 12, 8, 12], url: HOME_URL, backgroundGradient: bg,
    children: [
      header(15),
      spacer(6),
      col(shown.flatMap((item, i) => [
        hotRow(item, false),
        ...(i < shown.length - 1 ? [divider()] : [])
      ]), 1, { flex: 1 }),
      spacer(5),
      footer(8)
    ]
  };
}
