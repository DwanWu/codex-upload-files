/**
 * 节点体检 Widget v3
 * 当前节点：出口 IP、住宅/机房属性、纯度、中文地区、风险信号、AI 访问状态。
 * IP 情报：IPPure + IPQuery + ip-api.com
 * AI 检测：ChatGPT / Claude / Gemini / Grok
 *
 * AI 判定原则：
 * - 只要目标服务返回真实 HTTP 响应，即视为网络已到达，不因 403/429/503/WAF 挑战误判为不可达；
 * - 页面明确出现“当前国家/地区不支持”等限制文案时标记“受限”；
 * - 所有探测都发生 DNS/TLS/连接超时等异常时标记“未确定”，不武断显示不可用。
 */

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
    orange: { light: '#B45309', dark: '#F59E0B' },
    red: { light: '#B91C1C', dark: '#F87171' },
    purple: { light: '#7C3AED', dark: '#A78BFA' },
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
    type: 'stack', direction: 'row', padding: [3, 6, 3, 6], backgroundColor: C.chip,
    children: [text(label, 9, 'bold', color, { maxLines: 1 })]
  });

  const timeout = 6000;
  const getJson = async (url) => {
    try {
      const started = Date.now();
      const resp = await ctx.http.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout });
      return { ok: true, data: JSON.parse(await resp.text()), ms: Date.now() - started };
    } catch (e) {
      return { ok: false, data: {}, ms: 0, error: e?.message || String(e) };
    }
  };

  const getText = async (url) => {
    try {
      const resp = await ctx.http.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout });
      return { ok: true, data: String(await resp.text()).trim() };
    } catch (e) {
      return { ok: false, data: '', error: e?.message || String(e) };
    }
  };

  const RESTRICT_RE = /(not available in (?:your|this) (?:country|region)|unsupported (?:country|region)|country is not supported|region is not supported|service is not available in your country|currently unavailable in your (?:country|region)|当前(?:国家|地区).{0,12}(?:不可用|不支持)|所在(?:国家|地区).{0,12}(?:不可用|不支持))/i;

  const probeUrl = async (url) => {
    const started = Date.now();
    try {
      const resp = await ctx.http.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 Version/26.0 Mobile/15E148 Safari/604.1',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
        },
        timeout: 6500
      });
      const status = Number(resp?.status ?? resp?.statusCode ?? 200) || 200;
      let body = '';
      try { body = String(await resp.text()).slice(0, 120000); } catch (_) {}
      if (RESTRICT_RE.test(body)) return { state: 'limited', status, ms: Date.now() - started };
      return { state: 'ok', status, ms: Date.now() - started };
    } catch (e) {
      return { state: 'unknown', status: 0, ms: 0, error: e?.message || String(e) };
    }
  };

  const probeService = async (name, urls) => {
    let last = null;
    for (const url of urls) {
      const r = await probeUrl(url);
      last = r;
      if (r.state === 'ok' || r.state === 'limited') return { name, ...r };
    }
    return { name, ...(last || { state: 'unknown', status: 0, ms: 0 }) };
  };

  const clamp = (n, min = 0, max = 100) => Math.max(min, Math.min(max, Number(n) || 0));
  const bool = v => v === true;
  const cleanPart = s => String(s || '').replace(/\s+/g, ' ').trim();

  const COUNTRY_ZH = {
    US: '美国', CA: '加拿大', GB: '英国', DE: '德国', FR: '法国', NL: '荷兰', BE: '比利时',
    JP: '日本', KR: '韩国', SG: '新加坡', HK: '中国香港', MO: '中国澳门', TW: '中国台湾', CN: '中国',
    AU: '澳大利亚', NZ: '新西兰', IN: '印度', MY: '马来西亚', TH: '泰国', VN: '越南', PH: '菲律宾',
    ID: '印度尼西亚', RU: '俄罗斯', UA: '乌克兰', CH: '瑞士', SE: '瑞典', NO: '挪威', FI: '芬兰',
    DK: '丹麦', IT: '意大利', ES: '西班牙', PT: '葡萄牙', PL: '波兰', IE: '爱尔兰', AE: '阿联酋',
    TR: '土耳其', BR: '巴西', MX: '墨西哥', AR: '阿根廷', CL: '智利', ZA: '南非', IL: '以色列'
  };

  const flag = (cc) => {
    const s = String(cc || '').toUpperCase();
    if (s === 'TW') return '🇨🇳';
    if (!/^[A-Z]{2}$/.test(s)) return '';
    return String.fromCodePoint(...[...s].map(c => 127397 + c.charCodeAt(0)));
  };

  const makeLocation = (cc, countryRaw, regionRaw, cityRaw) => {
    const code = String(cc || '').toUpperCase();
    const country = COUNTRY_ZH[code] || cleanPart(countryRaw);
    const normalize = s => cleanPart(s).replace(/^(State of |Province of )/i, '');
    const candidates = [country, normalize(regionRaw), normalize(cityRaw)];
    const out = [];

    for (const raw of candidates) {
      const v = cleanPart(raw);
      if (!v) continue;
      const key = v.toLowerCase().replace(/[\s·,，._-]/g, '');
      if (!key) continue;
      const duplicated = out.some(x => {
        const k = x.toLowerCase().replace(/[\s·,，._-]/g, '');
        return k === key || k.includes(key) || key.includes(k);
      });
      if (!duplicated) out.push(v);
    }

    return [flag(code), ...out].filter(Boolean).join(' ');
  };

  const getProxyProtocol = () => {
    try {
      const p = ctx.proxy;
      const raw = p?.protocol || p?.type || p?.proxyType || '';
      if (!raw) return '';
      const map = {
        shadowsocks: 'SS', ss: 'SS', vmess: 'VMess', vless: 'VLESS', trojan: 'Trojan',
        hysteria: 'Hysteria', hysteria2: 'Hysteria2', tuic: 'TUIC', wireguard: 'WireGuard',
        http: 'HTTP', https: 'HTTPS', socks5: 'SOCKS5', anytls: 'AnyTLS'
      };
      return map[String(raw).toLowerCase()] || String(raw).toUpperCase();
    } catch (_) { return ''; }
  };

  try {
    const pureResp = await getJson('https://my.ippure.com/v1/info');
    let ip = cleanPart(pureResp.data?.ip);
    if (!ip) {
      const ipResp = await getText('https://api.ipquery.io/');
      ip = String(ipResp.data || '').replace(/[\"'\s]/g, '');
    }

    const aiPromise = Promise.all([
      probeService('ChatGPT', ['https://chatgpt.com/', 'https://chatgpt.com/api/auth/session']),
      probeService('Claude', ['https://claude.ai/', 'https://claude.ai/new']),
      probeService('Gemini', ['https://gemini.google.com/app', 'https://gemini.google.com/']),
      probeService('Grok', ['https://grok.com/', 'https://grok.com/?referrer=website'])
    ]);

    const [queryResp, apiResp, ai] = await Promise.all([
      ip ? getJson(`https://api.ipquery.io/${encodeURIComponent(ip)}`) : Promise.resolve({ ok: false, data: {}, ms: 0 }),
      ip ? getJson(`http://ip-api.com/json/${encodeURIComponent(ip)}?lang=zh-CN&fields=status,message,query,country,countryCode,regionName,city,mobile,proxy,hosting`) : Promise.resolve({ ok: false, data: {}, ms: 0 }),
      aiPromise
    ]);

    const pure = pureResp.data || {};
    const iq = queryResp.data || {};
    const ia = apiResp.data || {};
    const risk = iq.risk || {};

    const residential = pure.isResidential === true;
    const datacenter = [pure.isDataCenter === true, risk.is_datacenter === true, ia.hosting === true].some(Boolean);
    const mobile = bool(risk.is_mobile) || bool(ia.mobile);
    const vpn = bool(risk.is_vpn);
    const tor = bool(risk.is_tor);
    const proxy = bool(risk.is_proxy) || bool(ia.proxy);
    const conflict = residential && datacenter;

    const pureRisk = Number.isFinite(Number(pure.fraudScore)) ? clamp(Number(pure.fraudScore)) : null;
    const iqRisk = Number.isFinite(Number(risk.risk_score)) ? clamp(Number(risk.risk_score)) : null;

    let purity;
    if (pureRisk != null) purity = 100 - pureRisk;
    else if (iqRisk != null) purity = 100 - iqRisk;
    else {
      purity = 100;
      if (datacenter) purity -= 35;
      if (vpn) purity -= 20;
      if (proxy) purity -= 20;
      if (tor) purity -= 40;
      if (mobile) purity -= 5;
      purity = clamp(purity);
    }
    if (tor) purity = Math.min(purity, 20);
    else if (vpn && proxy) purity = Math.min(purity, 35);
    else if (datacenter && (vpn || proxy)) purity = Math.min(purity, 45);

    const purityInfo = purity >= 90
      ? { label: '极纯净', color: C.green }
      : purity >= 75 ? { label: '纯净', color: C.green }
      : purity >= 55 ? { label: '一般', color: C.orange }
      : purity >= 35 ? { label: '较脏', color: C.orange }
      : { label: '高风险', color: C.red };

    let netType = '属性未知';
    let typeColor = C.muted;
    if (conflict) { netType = '住宅/机房冲突'; typeColor = C.orange; }
    else if (tor) { netType = 'Tor 出口'; typeColor = C.red; }
    else if (datacenter) { netType = '机房 / 数据中心'; typeColor = C.purple; }
    else if (mobile && residential) { netType = '移动住宅网络'; typeColor = C.cyan; }
    else if (mobile) { netType = '移动网络'; typeColor = C.cyan; }
    else if (residential) { netType = '原生住宅 IP'; typeColor = C.green; }
    else if (queryResp.ok || apiResp.ok) { netType = 'ISP / 住宅倾向'; typeColor = C.blue; }

    const sourceCount = [pureResp.ok, queryResp.ok, apiResp.ok].filter(Boolean).length;
    let confidence = sourceCount >= 3 ? '高' : sourceCount === 2 ? '中' : '低';
    if (conflict) confidence = '需复核';

    const cc = ia.countryCode || pure.countryCode || iq.location?.country_code || '';
    const location = makeLocation(
      cc,
      ia.country || pure.country || iq.location?.country || '',
      ia.regionName || pure.region || iq.location?.state || '',
      ia.city || pure.city || iq.location?.city || ''
    );

    const protocol = getProxyProtocol();

    const riskFlags = [];
    if (datacenter) riskFlags.push({ t: '机房', c: C.purple });
    if (vpn) riskFlags.push({ t: 'VPN', c: C.orange });
    if (proxy) riskFlags.push({ t: '代理', c: C.orange });
    if (tor) riskFlags.push({ t: 'Tor', c: C.red });
    if (mobile) riskFlags.push({ t: '移动', c: C.cyan });
    if (!riskFlags.length) riskFlags.push({ t: '未见高风险标记', c: C.green });

    const stateLabel = x => x.state === 'ok' ? '可用' : x.state === 'limited' ? '受限' : '未确定';
    const stateMark = x => x.state === 'ok' ? '✓' : x.state === 'limited' ? '!' : '?';
    const stateColor = x => x.state === 'ok' ? C.green : x.state === 'limited' ? C.orange : C.muted;
    const aiChip = x => chip(`${x.name}${stateMark(x)}`, stateColor(x));
    const aiOkCount = ai.filter(x => x.state === 'ok').length;
    const aiLimitedCount = ai.filter(x => x.state === 'limited').length;
    const aiUnknownCount = ai.filter(x => x.state === 'unknown').length;

    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

    const labelRow = (label, value, color = C.sub, ico = null) => row([
      ...(ico ? [icon(ico, color, 12)] : []),
      text(label, 11, 'bold', C.muted, { width: 58, maxLines: 1 }),
      text(value, 12, 'medium', color, { flex: 1, maxLines: 1, minScale: 0.65 })
    ], 6);

    if (isSmall) {
      const aiSummary = aiUnknownCount === 0 && aiLimitedCount === 0
        ? `AI 可用 ${aiOkCount}/4`
        : `AI ${aiOkCount}可用 · ${aiLimitedCount}受限 · ${aiUnknownCount}待定`;
      return {
        type: 'widget', padding: 12, backgroundGradient: bg,
        children: [
          row([
            icon('shield.checkered', purityInfo.color, 13),
            text('节点体检', 13, 'heavy', C.main),
            spacer(),
            text(`${Math.round(purity)}分`, 12, 'heavy', purityInfo.color)
          ]),
          spacer(10),
          col([
            row([icon('network', C.blue, 11), text([ip || '未获取出口 IP', protocol].filter(Boolean).join(' / '), 10, 'medium', C.sub, { maxLines: 1, flex: 1 })], 6),
            row([icon('house.and.flag.fill', typeColor, 11), text(netType, 11, 'heavy', typeColor, { maxLines: 1, flex: 1 })], 6),
            row([icon('location.fill', C.cyan, 11), text(location || '位置未知', 10, 'medium', C.sub, { maxLines: 1, flex: 1, minScale: 0.68 })], 6),
            row([icon('sparkles', aiUnknownCount ? C.orange : C.green, 11), text(aiSummary, 9, 'heavy', aiUnknownCount ? C.orange : C.green, { maxLines: 1, flex: 1, minScale: 0.65 })], 6)
          ], 8),
          spacer(),
          row([
            text(`${purityInfo.label} · 置信度${confidence}`, 9, 'bold', purityInfo.color),
            spacer(), text(timeStr, 9, 'bold', C.muted)
          ])
        ]
      };
    }

    if (isLarge) {
      return {
        type: 'widget', padding: 16, backgroundGradient: bg,
        children: [
          row([
            icon('shield.checkered', purityInfo.color, 17), text('节点体检', 17, 'heavy', C.main),
            spacer(), chip(`${Math.round(purity)} · ${purityInfo.label}`, purityInfo.color)
          ]),
          spacer(12),
          labelRow('出口 IP', [ip || '未知', protocol].filter(Boolean).join(' / '), C.main, 'network'),
          spacer(7), labelRow('网络属性', netType, typeColor, 'house.and.flag.fill'),
          spacer(7), labelRow('地区', location || '未知', C.sub, 'location.fill'),
          spacer(10), { type: 'stack', height: 0.5, backgroundColor: C.divider, children: [] },
          spacer(9), row([text('AI 访问', 11, 'bold', C.muted), spacer(), ...ai.map(aiChip)], 5),
          spacer(7),
          row([
            ...ai.map(x => text(`${x.name} ${stateLabel(x)}`, 9, 'medium', stateColor(x), { flex: 1, maxLines: 1, minScale: 0.65 }))
          ], 6),
          spacer(9), row([text('风险信号', 11, 'bold', C.muted), spacer(), ...riskFlags.slice(0, 4).map(x => chip(x.t, x.c))], 5),
          spacer(9), labelRow('IPPure', pureRisk == null ? '无数据' : `风险 ${Math.round(pureRisk)}/100 · ${residential ? '住宅' : datacenter ? '非住宅' : '属性未定'}`, pureRisk != null && pureRisk >= 60 ? C.red : C.sub),
          spacer(7), labelRow('IPQuery', iqRisk == null ? '无数据' : `风险 ${Math.round(iqRisk)}/100 · ${risk.is_datacenter ? '机房' : '非机房'}`, iqRisk != null && iqRisk >= 60 ? C.red : C.sub),
          spacer(7), labelRow('ip-api', apiResp.ok ? `${ia.hosting ? 'Hosting' : '非Hosting'} · ${ia.proxy ? '代理标记' : '无代理标记'}` : '无数据', ia.proxy ? C.orange : C.sub),
          spacer(), row([text(`三源置信度：${confidence}`, 9, 'bold', confidence === '需复核' ? C.orange : C.muted), spacer(), text(`更新于 ${timeStr}`, 9, 'bold', C.muted)])
        ]
      };
    }

    return {
      type: 'widget', padding: 13, backgroundGradient: bg,
      children: [
        row([
          icon('shield.checkered', purityInfo.color, 15), text('节点体检', 15, 'heavy', C.main),
          spacer(), chip(`${Math.round(purity)} · ${purityInfo.label}`, purityInfo.color)
        ]),
        spacer(10),
        labelRow('出口 IP', [ip || '未知', protocol].filter(Boolean).join(' / '), C.main, 'network'),
        spacer(6), labelRow('网络属性', netType, typeColor, 'house.and.flag.fill'),
        spacer(6), labelRow('地区', location || '未知', C.sub, 'location.fill'),
        spacer(8), row([text('AI', 10, 'bold', C.muted, { width: 58 }), ...ai.map(aiChip)], 4),
        spacer(),
        row([
          text(riskFlags.map(x => x.t).join(' · '), 9, 'bold', riskFlags.some(x => x.c === C.red) ? C.red : C.muted, { maxLines: 1, minScale: 0.7 }),
          spacer(), text(`置信度${confidence} · ${timeStr}`, 9, 'bold', C.muted)
        ])
      ]
    };
  } catch (e) {
    return {
      type: 'widget', padding: 14, backgroundGradient: bg,
      children: [
        row([icon('exclamationmark.triangle.fill', C.red, 14), text('节点体检', 14, 'heavy', C.main)]),
        spacer(10), text('检测失败，请稍后刷新', 12, 'medium', C.sub),
        spacer(4), text(e?.message || String(e), 9, 'medium', C.muted, { maxLines: 4 })
      ]
    };
  }
}
