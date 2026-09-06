/**
 * 节点体检 Widget
 * 检测当前 Egern 节点出口 IP 的住宅/机房属性、纯度、ASN、地区和匿名网络风险。
 * 数据源：IPPure + IPQuery + ip-api.com（三源降级/交叉验证）
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
  const row = (children, gap = 5, opts = {}) => ({
    type: 'stack', direction: 'row', alignItems: 'center', gap, children, ...opts
  });
  const col = (children, gap = 5, opts = {}) => ({
    type: 'stack', direction: 'column', gap, children, ...opts
  });
  const icon = (name, color, size = 13) => ({
    type: 'image', src: `sf-symbol:${name}`, color, width: size, height: size
  });
  const spacer = (length) => length == null ? { type: 'spacer' } : { type: 'spacer', length };
  const chip = (label, color) => ({
    type: 'stack', direction: 'row', padding: [3, 6, 3, 6], backgroundColor: C.chip,
    children: [text(label, 9, 'bold', color, { maxLines: 1 })]
  });

  const timeout = 5500;
  const getJson = async (url) => {
    try {
      const started = Date.now();
      const resp = await ctx.http.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout });
      const raw = await resp.text();
      return { ok: true, data: JSON.parse(raw), ms: Date.now() - started };
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
  const clamp = (n, min = 0, max = 100) => Math.max(min, Math.min(max, Number(n) || 0));
  const bool = v => v === true;

  const flag = (cc) => {
    const s = String(cc || '').toUpperCase();
    if (s === 'TW') return '🇨🇳';
    if (!/^[A-Z]{2}$/.test(s)) return '';
    return String.fromCodePoint(...[...s].map(c => 127397 + c.charCodeAt(0)));
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
    // IPPure 直接检测当前请求出口，优先作为主 IP 来源。
    const pureResp = await getJson('https://my.ippure.com/v1/info');
    let ip = String(pureResp.data?.ip || '').trim();

    // IPPure 不可用时，用 IPQuery 当前 IP 接口兜底。
    if (!ip) {
      const ipResp = await getText('https://api.ipquery.io/');
      ip = String(ipResp.data || '').replace(/[\"'\s]/g, '');
    }

    const [queryResp, apiResp] = await Promise.all([
      ip ? getJson(`https://api.ipquery.io/${encodeURIComponent(ip)}`) : Promise.resolve({ ok: false, data: {}, ms: 0 }),
      ip ? getJson(`http://ip-api.com/json/${encodeURIComponent(ip)}?lang=zh-CN&fields=status,message,query,country,countryCode,regionName,city,isp,org,as,asname,mobile,proxy,hosting`) : Promise.resolve({ ok: false, data: {}, ms: 0 })
    ]);

    const pure = pureResp.data || {};
    const iq = queryResp.data || {};
    const ia = apiResp.data || {};
    const risk = iq.risk || {};

    const residential = pure.isResidential === true;
    const dataCenterSignals = [pure.isDataCenter === true, risk.is_datacenter === true, ia.hosting === true];
    const dcCount = dataCenterSignals.filter(Boolean).length;
    const datacenter = dcCount > 0;
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

    // 多源强风险信号用于保守封顶，避免单一 fraudScore 与风险标记冲突。
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

    const country = pure.country || iq.location?.country || ia.country || '';
    const cc = pure.countryCode || iq.location?.country_code || ia.countryCode || '';
    const region = pure.region || iq.location?.state || ia.regionName || '';
    const city = pure.city || iq.location?.city || ia.city || '';
    const location = [flag(cc), country, region, city].filter(Boolean).join(' ');

    const asn = pure.asn ? `AS${String(pure.asn).replace(/^AS/i, '')}`
      : iq.isp?.asn || (ia.as ? String(ia.as).split(' ')[0] : '') || '';
    const isp = pure.asOrganization || iq.isp?.isp || iq.isp?.org || ia.isp || ia.org || ia.asname || '未知运营商';
    const protocol = getProxyProtocol();

    const riskFlags = [];
    if (datacenter) riskFlags.push({ t: '机房', c: C.purple });
    if (vpn) riskFlags.push({ t: 'VPN', c: C.orange });
    if (proxy) riskFlags.push({ t: '代理', c: C.orange });
    if (tor) riskFlags.push({ t: 'Tor', c: C.red });
    if (mobile) riskFlags.push({ t: '移动', c: C.cyan });
    if (!riskFlags.length) riskFlags.push({ t: '未见高风险标记', c: C.green });

    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

    if (isSmall) {
      return {
        type: 'widget', padding: 12, backgroundGradient: bg,
        children: [
          row([
            icon('shield.checkered', purityInfo.color, 13),
            text('节点体检', 13, 'heavy', C.main),
            spacer(),
            text(`${Math.round(purity)}分`, 12, 'heavy', purityInfo.color)
          ]),
          spacer(11),
          col([
            row([icon('network', C.blue, 11), text(ip || '未获取出口 IP', 11, 'medium', C.sub, { maxLines: 1, flex: 1 })], 6),
            row([icon('house.and.flag.fill', typeColor, 11), text(netType, 11, 'heavy', typeColor, { maxLines: 1, flex: 1 })], 6),
            row([icon('location.fill', C.cyan, 11), text(location || '位置未知', 10, 'medium', C.sub, { maxLines: 1, flex: 1, minScale: 0.7 })], 6),
            row([icon('building.2.fill', C.purple, 11), text([asn, isp].filter(Boolean).join(' · '), 10, 'medium', C.sub, { maxLines: 1, flex: 1, minScale: 0.65 })], 6)
          ], 8),
          spacer(),
          row([
            text(`${purityInfo.label} · 置信度${confidence}`, 9, 'bold', purityInfo.color),
            spacer(),
            text(timeStr, 9, 'bold', C.muted)
          ])
        ]
      };
    }

    const labelRow = (label, value, color = C.sub, ico = null) => row([
      ...(ico ? [icon(ico, color, 12)] : []),
      text(label, 11, 'bold', C.muted, { width: 58, maxLines: 1 }),
      text(value, 12, 'medium', color, { flex: 1, maxLines: 1, minScale: 0.65 })
    ], 6);

    if (isLarge) {
      return {
        type: 'widget', padding: 16, backgroundGradient: bg,
        children: [
          row([
            icon('shield.checkered', purityInfo.color, 17),
            text('节点体检', 17, 'heavy', C.main),
            spacer(),
            chip(`${Math.round(purity)} · ${purityInfo.label}`, purityInfo.color)
          ]),
          spacer(13),
          labelRow('出口 IP', [ip || '未知', protocol].filter(Boolean).join(' / '), C.main, 'network'),
          spacer(7),
          labelRow('网络属性', netType, typeColor, 'house.and.flag.fill'),
          spacer(7),
          labelRow('地区', location || '未知', C.sub, 'location.fill'),
          spacer(7),
          labelRow('ASN', [asn, isp].filter(Boolean).join(' · '), C.sub, 'building.2.fill'),
          spacer(10),
          { type: 'stack', height: 0.5, backgroundColor: C.divider, children: [] },
          spacer(10),
          row([
            text('风险信号', 11, 'bold', C.muted),
            spacer(),
            ...riskFlags.slice(0, 4).map(x => chip(x.t, x.c))
          ], 5),
          spacer(9),
          labelRow('IPPure', pureRisk == null ? '无数据' : `风险 ${Math.round(pureRisk)} / 100 · ${residential ? '住宅' : datacenter ? '非住宅' : '属性未定'}`, pureRisk != null && pureRisk >= 60 ? C.red : C.sub),
          spacer(7),
          labelRow('IPQuery', iqRisk == null ? '无数据' : `风险 ${Math.round(iqRisk)} / 100 · ${risk.is_datacenter ? '机房' : '非机房'}`, iqRisk != null && iqRisk >= 60 ? C.red : C.sub),
          spacer(7),
          labelRow('ip-api', apiResp.ok ? `${ia.hosting ? 'Hosting' : '非Hosting'} · ${ia.proxy ? 'Proxy/VPN' : '无代理标记'}` : '无数据', ia.proxy ? C.orange : C.sub),
          spacer(),
          row([
            text(`三源交叉验证 · 置信度 ${confidence}`, 9, 'bold', confidence === '需复核' ? C.orange : C.muted),
            spacer(),
            text(`更新 ${timeStr}`, 9, 'bold', C.muted)
          ])
        ]
      };
    }

    return {
      type: 'widget', padding: 13, backgroundGradient: bg,
      children: [
        row([
          icon('shield.checkered', purityInfo.color, 15),
          text('节点体检', 15, 'heavy', C.main),
          spacer(),
          text(`${Math.round(purity)}分`, 14, 'heavy', purityInfo.color),
          text(purityInfo.label, 10, 'bold', purityInfo.color)
        ]),
        spacer(12),
        labelRow('出口 IP', [ip || '未知', protocol].filter(Boolean).join(' / '), C.main, 'network'),
        spacer(8),
        labelRow('网络属性', netType, typeColor, 'house.and.flag.fill'),
        spacer(8),
        labelRow('地区', location || '未知', C.sub, 'location.fill'),
        spacer(8),
        labelRow('ASN', [asn, isp].filter(Boolean).join(' · '), C.sub, 'building.2.fill'),
        spacer(9),
        row([
          ...riskFlags.slice(0, 3).map(x => chip(x.t, x.c)),
          spacer(),
          text(`置信度 ${confidence}`, 9, 'bold', confidence === '需复核' ? C.orange : C.muted)
        ], 5),
        spacer(),
        row([spacer(), text(`IPPure · IPQuery · ip-api  ${timeStr}`, 9, 'medium', C.muted)])
      ]
    };
  } catch (e) {
    return {
      type: 'widget', padding: 14, backgroundGradient: bg,
      children: [
        row([icon('exclamationmark.shield.fill', C.red, 15), text('节点体检', 15, 'heavy', C.main)], 6),
        spacer(10),
        text('节点信息获取失败', 12, 'heavy', C.red),
        spacer(5),
        text(e?.message || String(e), 10, 'medium', C.muted, { maxLines: 3 })
      ]
    };
  }
}
