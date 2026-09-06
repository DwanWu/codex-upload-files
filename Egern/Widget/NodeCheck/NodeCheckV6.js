/**
 * 节点体检 Widget v6
 * 广东油价同款卡片式布局。
 * 仅显示：纯度、属性、地区、风险；顶部图标为绿色。
 * 已移除全部 AI 检测。
 */

export default async function (ctx) {
  const family = String(ctx.widgetFamily || 'systemMedium').toLowerCase();
  const isSmall = family.includes('small');
  const isLarge = family.includes('large');

  const C = {
    bg:      [{ light: '#FAFAFA', dark: '#1C1C1E' }, { light: '#EFEFF4', dark: '#111113' }],
    card:    { light: '#FFFFFF', dark: '#2C2C2E' },
    main:    { light: '#1C1C1E', dark: '#F2F2F7' },
    muted:   { light: '#8E8E93', dark: '#636366' },
    green:   { light: '#1E7E44', dark: '#30D158' },
    gold:    { light: '#B07C1A', dark: '#D4A02A' },
    red:     { light: '#C0392B', dark: '#FF453A' },
    blue:    { light: '#2C5F8A', dark: '#5E9ED6' },
    purple:  { light: '#7C3AED', dark: '#A78BFA' },
    divider: { light: '#E5E5EA', dark: '#38383A' }
  };

  const backgroundGradient = {
    type: 'linear', colors: C.bg,
    startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 }
  };

  const text = (t, size, weight, color, opts = {}) => ({
    type: 'text', text: String(t ?? ''),
    font: { size, weight, ...(opts.family ? { family: opts.family } : {}) },
    textColor: color, ...opts
  });
  const row = (children, gap = 4, opts = {}) => ({
    type: 'stack', direction: 'row', alignItems: 'center', gap, children, ...opts
  });
  const col = (children, gap = 4, opts = {}) => ({
    type: 'stack', direction: 'column', gap, children, ...opts
  });
  const icon = (name, color, size = 13) => ({
    type: 'image', src: `sf-symbol:${name}`, color, width: size, height: size
  });
  const spacer = length => length == null ? { type: 'spacer' } : { type: 'spacer', length };

  const timeout = 6000;
  const getJson = async url => {
    try {
      const resp = await ctx.http.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout });
      return { ok: true, data: JSON.parse(await resp.text()) };
    } catch (e) {
      return { ok: false, data: {}, error: e?.message || String(e) };
    }
  };
  const getText = async url => {
    try {
      const resp = await ctx.http.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout });
      return { ok: true, data: String(await resp.text()).trim() };
    } catch (e) {
      return { ok: false, data: '', error: e?.message || String(e) };
    }
  };

  const clamp = (n, min = 0, max = 100) => Math.max(min, Math.min(max, Number(n) || 0));
  const clean = s => String(s || '').replace(/\s+/g, ' ').trim();

  const COUNTRY_ZH = {
    US:'美国', CA:'加拿大', GB:'英国', DE:'德国', FR:'法国', NL:'荷兰', BE:'比利时',
    JP:'日本', KR:'韩国', SG:'新加坡', HK:'中国香港', MO:'中国澳门', TW:'中国台湾', CN:'中国',
    AU:'澳大利亚', NZ:'新西兰', IN:'印度', MY:'马来西亚', TH:'泰国', VN:'越南', PH:'菲律宾',
    ID:'印度尼西亚', RU:'俄罗斯', UA:'乌克兰', CH:'瑞士', SE:'瑞典', NO:'挪威', FI:'芬兰',
    DK:'丹麦', IT:'意大利', ES:'西班牙', PT:'葡萄牙', PL:'波兰', IE:'爱尔兰', AE:'阿联酋',
    TR:'土耳其', BR:'巴西', MX:'墨西哥', AR:'阿根廷', CL:'智利', ZA:'南非', IL:'以色列'
  };

  const getProxyProtocol = () => {
    try {
      const raw = ctx.proxy?.protocol || ctx.proxy?.type || ctx.proxy?.proxyType || '';
      if (!raw) return '';
      const map = {
        shadowsocks:'SS', ss:'SS', vmess:'VMess', vless:'VLESS', trojan:'Trojan',
        hysteria:'Hysteria', hysteria2:'Hysteria2', tuic:'TUIC', wireguard:'WireGuard',
        http:'HTTP', https:'HTTPS', socks5:'SOCKS5', anytls:'AnyTLS'
      };
      return map[String(raw).toLowerCase()] || String(raw).toUpperCase();
    } catch (_) { return ''; }
  };

  try {
    const pureResp = await getJson('https://my.ippure.com/v1/info');
    let ip = clean(pureResp.data?.ip);
    if (!ip) {
      const ipResp = await getText('https://api.ipquery.io/');
      ip = String(ipResp.data || '').replace(/[\"'\s]/g, '');
    }

    if (!ip) throw new Error('无法获取出口 IP');

    const [queryResp, apiResp] = await Promise.all([
      getJson(`https://api.ipquery.io/${encodeURIComponent(ip)}`),
      getJson(`http://ip-api.com/json/${encodeURIComponent(ip)}?lang=zh-CN&fields=status,message,query,country,countryCode,mobile,proxy,hosting`)
    ]);

    const pure = pureResp.data || {};
    const iq = queryResp.data || {};
    const ia = apiResp.data || {};
    const risk = iq.risk || {};

    const datacenter = [
      pure.isDataCenter === true,
      pure.isResidential === false,
      risk.is_datacenter === true,
      ia.hosting === true
    ].some(Boolean);
    const vpn = risk.is_vpn === true;
    const tor = risk.is_tor === true;
    const proxy = risk.is_proxy === true || ia.proxy === true;
    const mobile = risk.is_mobile === true || ia.mobile === true;

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

    const property = datacenter ? '机房' : '住宅';
    const cc = String(ia.countryCode || pure.countryCode || iq.location?.country_code || '').toUpperCase();
    const country = COUNTRY_ZH[cc] || clean(ia.country || pure.country || iq.location?.country) || '未知';

    let riskLevel = '低';
    let riskColor = C.green;
    if (tor || (vpn && proxy) || purity < 35) {
      riskLevel = '高'; riskColor = C.red;
    } else if (datacenter || vpn || proxy || purity < 75) {
      riskLevel = '中'; riskColor = C.gold;
    }

    const purityColor = purity >= 75 ? C.green : purity >= 50 ? C.gold : C.red;
    const propertyColor = property === '住宅' ? C.green : C.purple;
    const protocol = getProxyProtocol();

    const now = new Date();
    const p = n => String(n).padStart(2, '0');
    const updateTime = `${p(now.getMonth()+1)}.${p(now.getDate())} ${p(now.getHours())}:${p(now.getMinutes())}`;

    const cards = [
      { label: '纯度', value: String(Math.round(purity)), color: purityColor },
      { label: '属性', value: property, color: propertyColor },
      { label: '地区', value: country, color: C.blue },
      { label: '风险', value: riskLevel, color: riskColor }
    ];

    const buildCard = (item, cfg) => ({
      type: 'stack', direction: 'column', alignItems: 'center', flex: 1,
      backgroundColor: C.card, borderRadius: cfg.radius, padding: cfg.padding,
      children: [
        spacer(),
        text(item.label, cfg.labelFz, 'bold', item.color),
        spacer(cfg.gap),
        text(item.value, cfg.valueFz, 'heavy', C.main, { maxLines: 1, minScale: 0.5 }),
        spacer()
      ]
    });

    if (isSmall) {
      const cfg = { radius: 10, padding: [6,2,6,2], labelFz: 10, valueFz: 16, gap: 3 };
      return {
        type: 'widget', padding: [12,12,8,12], backgroundGradient,
        children: [
          row([
            icon('checkmark.shield.fill', C.green, 14), spacer(4),
            text('节点体检', 13, 'heavy', C.main),
            spacer(),
            text(updateTime, 9, 'bold', C.muted, { family: 'Menlo' })
          ], 0),
          spacer(7),
          col([
            row(cards.slice(0,2).map(x => buildCard(x, cfg)), 6, { flex: 1 }),
            row(cards.slice(2,4).map(x => buildCard(x, cfg)), 6, { flex: 1 })
          ], 8, { flex: 1 }),
          spacer(7),
          row([
            spacer(), icon('network', C.muted, 9), spacer(3),
            text([ip, protocol].filter(Boolean).join(' / '), 9, 'bold', C.muted, { maxLines:1, minScale:0.65 })
          ], 0)
        ]
      };
    }

    if (isLarge) {
      const cfg = { radius: 14, padding: [14,4,14,4], labelFz: 14, valueFz: 28, gap: 6 };
      return {
        type: 'widget', padding: [16,16,14,16], backgroundGradient,
        children: [
          row([
            icon('checkmark.shield.fill', C.green, 18), spacer(4),
            text('节点体检', 17, 'heavy', C.main),
            spacer(),
            text('出口 IP: ', 11, 'medium', C.muted),
            text(ip, 11, 'bold', C.main, { family: 'Menlo', maxLines:1, minScale:0.65 })
          ], 0),
          spacer(14),
          col([
            row(cards.slice(0,2).map(x => buildCard(x, cfg)), 12, { flex:1 }),
            row(cards.slice(2,4).map(x => buildCard(x, cfg)), 12, { flex:1 })
          ], 12, { flex:1 }),
          spacer(12),
          { type:'stack', height:0.5, backgroundColor:C.divider, children:[] },
          spacer(8),
          row([
            text(protocol || '当前节点', 11, 'bold', C.muted),
            spacer(),
            icon('arrow.triangle.2.circlepath', C.muted, 11), spacer(4),
            text(updateTime, 10, 'bold', C.muted, { family:'Menlo' })
          ], 0)
        ]
      };
    }

    const cfg = { radius: 13, padding: [14,6,14,6], labelFz: 11, valueFz: 20, gap: 5 };
    return {
      type: 'widget', padding: [10,12,6,12], backgroundGradient,
      children: [
        row([
          icon('checkmark.shield.fill', C.green, 16), spacer(3),
          text('节点体检', 15, 'heavy', C.main),
          spacer(),
          text('出口 IP: ', 10, 'medium', C.muted),
          text(ip, 10, 'bold', C.main, { family:'Menlo', maxLines:1, minScale:0.65 })
        ], 0),
        spacer(24),
        row(cards.map(x => buildCard(x, cfg)), 6),
        spacer(15),
        { type:'stack', height:0.5, backgroundColor:C.divider, children:[] },
        spacer(8),
        row([
          text(protocol || '当前节点', 10, 'bold', C.muted),
          spacer(),
          icon('arrow.triangle.2.circlepath', C.muted, 11), spacer(4),
          text(updateTime, 10, 'bold', C.muted, { family:'Menlo' })
        ], 0)
      ]
    };
  } catch (e) {
    return {
      type: 'widget', padding: 16, backgroundGradient,
      children: [
        row([
          icon('checkmark.shield.fill', C.green, 16), spacer(4),
          text('节点体检', 15, 'heavy', C.main)
        ], 0),
        spacer(10),
        text('节点信息加载失败', 12, 'bold', C.red),
        spacer(4),
        text(e?.message || String(e), 10, 'medium', C.muted, { maxLines:3 })
      ]
    };
  }
}
