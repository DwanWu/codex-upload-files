/**
 * 节点体检 Widget v5
 * 布局参考“广东油价”：顶部标题 + 更新时间、四张信息卡、底部补充状态。
 * 已移除全部 AI 可达性检测，仅保留节点/IP 质量信息。
 * 数据源：IPPure + IPQuery + ip-api.com
 */

export default async function (ctx) {
  const family = String(ctx.widgetFamily || 'systemMedium').toLowerCase();
  const isSmall = family.includes('small');
  const isLarge = family.includes('large');

  const C = {
    bg:      [{ light: '#FAFAFA', dark: '#1C1C1E' }, { light: '#EFEFF4', dark: '#111113' }],
    card:    { light: '#FFFFFF', dark: '#2C2C2E' },
    main:    { light: '#1C1C1E', dark: '#F2F2F7' },
    sub:     { light: '#48484A', dark: '#D1D1D6' },
    muted:   { light: '#8E8E93', dark: '#636366' },
    gold:    { light: '#B07C1A', dark: '#D4A02A' },
    red:     { light: '#C0392B', dark: '#FF453A' },
    teal:    { light: '#1E7E44', dark: '#30D158' },
    blue:    { light: '#2C5F8A', dark: '#5E9ED6' },
    purple:  { light: '#7C3AED', dark: '#A78BFA' },
    cyan:    { light: '#0F766E', dark: '#5EEAD4' },
    divider: { light: '#E5E5EA', dark: '#38383A' }
  };

  const bg = { type: 'linear', colors: C.bg, startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 } };
  const text = (t, size, weight, color, opts = {}) => ({
    type: 'text', text: String(t ?? ''), font: { size, weight, ...(opts.family ? { family: opts.family } : {}) }, textColor: color, ...opts
  });
  const row = (children, gap = 4, opts = {}) => ({ type: 'stack', direction: 'row', alignItems: 'center', gap, children, ...opts });
  const col = (children, gap = 4, opts = {}) => ({ type: 'stack', direction: 'column', gap, children, ...opts });
  const icon = (name, color, size = 13) => ({ type: 'image', src: `sf-symbol:${name}`, color, width: size, height: size });
  const spacer = length => length == null ? { type: 'spacer' } : { type: 'spacer', length };

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

  const clamp = (n, min = 0, max = 100) => Math.max(min, Math.min(max, Number(n) || 0));
  const clean = s => String(s || '').replace(/\s+/g, ' ').trim();
  const bool = v => v === true;

  const COUNTRY_ZH = {
    US:'美国',CA:'加拿大',GB:'英国',DE:'德国',FR:'法国',NL:'荷兰',BE:'比利时',JP:'日本',KR:'韩国',SG:'新加坡',
    HK:'中国香港',MO:'中国澳门',TW:'中国台湾',CN:'中国',AU:'澳大利亚',NZ:'新西兰',IN:'印度',MY:'马来西亚',TH:'泰国',
    VN:'越南',PH:'菲律宾',ID:'印度尼西亚',RU:'俄罗斯',UA:'乌克兰',CH:'瑞士',SE:'瑞典',NO:'挪威',FI:'芬兰',DK:'丹麦',
    IT:'意大利',ES:'西班牙',PT:'葡萄牙',PL:'波兰',IE:'爱尔兰',AE:'阿联酋',TR:'土耳其',BR:'巴西',MX:'墨西哥',AR:'阿根廷',
    CL:'智利',ZA:'南非',IL:'以色列'
  };

  const flag = cc => {
    const s = String(cc || '').toUpperCase();
    if (s === 'TW') return '🇨🇳';
    if (!/^[A-Z]{2}$/.test(s)) return '';
    return String.fromCodePoint(...[...s].map(c => 127397 + c.charCodeAt(0)));
  };

  const makeLocation = (cc, countryRaw, regionRaw, cityRaw) => {
    const code = String(cc || '').toUpperCase();
    const parts = [COUNTRY_ZH[code] || clean(countryRaw), clean(regionRaw), clean(cityRaw)].filter(Boolean);
    const out = [];
    for (const p of parts) {
      const key = p.toLowerCase().replace(/[\s·,，._-]/g, '');
      if (!key) continue;
      const dup = out.some(x => {
        const k = x.toLowerCase().replace(/[\s·,，._-]/g, '');
        return k === key || k.includes(key) || key.includes(k);
      });
      if (!dup) out.push(p);
    }
    return [flag(code), ...out].filter(Boolean).join(' ');
  };

  const getProxyProtocol = () => {
    try {
      const p = ctx.proxy;
      const raw = p?.protocol || p?.type || p?.proxyType || '';
      if (!raw) return '';
      const map = {
        shadowsocks:'SS', ss:'SS', vmess:'VMess', vless:'VLESS', trojan:'Trojan', hysteria:'Hysteria', hysteria2:'Hysteria2',
        tuic:'TUIC', wireguard:'WireGuard', http:'HTTP', https:'HTTPS', socks5:'SOCKS5', anytls:'AnyTLS'
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

    const [queryResp, apiResp] = await Promise.all([
      ip ? getJson(`https://api.ipquery.io/${encodeURIComponent(ip)}`) : Promise.resolve({ ok:false, data:{}, ms:0 }),
      ip ? getJson(`http://ip-api.com/json/${encodeURIComponent(ip)}?lang=zh-CN&fields=status,message,query,country,countryCode,regionName,city,mobile,proxy,hosting`) : Promise.resolve({ ok:false, data:{}, ms:0 })
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
      ? { label:'极纯净', color:C.teal }
      : purity >= 75 ? { label:'纯净', color:C.teal }
      : purity >= 55 ? { label:'一般', color:C.gold }
      : purity >= 35 ? { label:'较脏', color:C.gold }
      : { label:'高风险', color:C.red };

    let netType = '未知';
    let netShort = '未知';
    let netColor = C.muted;
    if (conflict) { netType='住宅/机房冲突'; netShort='冲突'; netColor=C.gold; }
    else if (tor) { netType='Tor 出口'; netShort='Tor'; netColor=C.red; }
    else if (datacenter) { netType='机房 / 数据中心'; netShort='机房'; netColor=C.purple; }
    else if (mobile && residential) { netType='移动住宅网络'; netShort='移动住宅'; netColor=C.cyan; }
    else if (mobile) { netType='移动网络'; netShort='移动'; netColor=C.cyan; }
    else if (residential) { netType='原生住宅 IP'; netShort='住宅'; netColor=C.teal; }
    else if (queryResp.ok || apiResp.ok) { netType='ISP / 住宅倾向'; netShort='ISP'; netColor=C.blue; }

    const cc = ia.countryCode || pure.countryCode || iq.location?.country_code || '';
    const location = makeLocation(
      cc,
      ia.country || pure.country || iq.location?.country || '',
      ia.regionName || pure.region || iq.location?.state || '',
      ia.city || pure.city || iq.location?.city || ''
    );
    const country = COUNTRY_ZH[String(cc || '').toUpperCase()] || clean(ia.country || pure.country || iq.location?.country) || '未知';

    const riskFlags = [];
    if (datacenter) riskFlags.push('机房');
    if (vpn) riskFlags.push('VPN');
    if (proxy) riskFlags.push('代理');
    if (tor) riskFlags.push('Tor');
    if (mobile) riskFlags.push('移动');

    let riskLevel = '低';
    let riskColor = C.teal;
    if (tor || (vpn && proxy) || purity < 35) { riskLevel='高'; riskColor=C.red; }
    else if (datacenter || vpn || proxy || purity < 75) { riskLevel='中'; riskColor=C.gold; }

    const sourceCount = [pureResp.ok, queryResp.ok, apiResp.ok].filter(Boolean).length;
    let confidence = sourceCount >= 3 ? '高' : sourceCount === 2 ? '中' : '低';
    if (conflict) confidence = '需复核';

    const protocol = getProxyProtocol();
    const now = new Date();
    const p = n => String(n).padStart(2, '0');
    const updateTime = `${p(now.getMonth()+1)}.${p(now.getDate())} ${p(now.getHours())}:${p(now.getMinutes())}`;

    const buildCard = (item, cfg) => ({
      type:'stack', direction:'column', alignItems:'center', flex:1,
      backgroundColor:C.card, borderRadius:cfg.radius, padding:cfg.padding,
      children:[
        spacer(),
        text(item.label, cfg.labelFz, 'bold', item.color),
        spacer(cfg.gap),
        text(item.value, cfg.valueFz, 'heavy', C.main, { maxLines:1, minScale:0.55 }),
        spacer(cfg.subGap),
        text(item.sub, cfg.subFz, 'bold', item.color, { maxLines:1, minScale:0.55 }),
        spacer()
      ]
    });

    const cards = [
      { label:'纯净度', value:String(Math.round(purity)), sub:purityInfo.label, color:purityInfo.color },
      { label:'网络属性', value:netShort, sub:netType, color:netColor },
      { label:'地区', value:country, sub:location || '位置未知', color:C.blue },
      { label:'风险', value:riskLevel, sub:riskFlags.length ? riskFlags.join('·') : '未见高风险', color:riskColor }
    ];

    if (isSmall) {
      const cfg = { radius:10, padding:[4,2,4,2], labelFz:9, valueFz:14, subFz:8, gap:1, subGap:1 };
      return {
        type:'widget', padding:[12,12,8,12], backgroundGradient:bg,
        children:[
          row([
            icon('shield.checkered', C.main, 13), spacer(4), text('节点体检', 13, 'heavy', C.main),
            spacer(), icon('arrow.triangle.2.circlepath', C.muted, 9), spacer(2), text(updateTime, 9, 'bold', C.muted, { family:'Menlo' })
          ],0),
          spacer(7),
          col([
            row(cards.slice(0,2).map(x => buildCard(x,cfg)),6,{flex:1}),
            row(cards.slice(2,4).map(x => buildCard(x,cfg)),6,{flex:1})
          ],8,{flex:1}),
          spacer(7),
          row([spacer(), icon('network', C.muted, 9), spacer(3), text([ip || 'IP未知', protocol].filter(Boolean).join(' / '), 9, 'bold', C.muted, { maxLines:1, minScale:0.65 })],0)
        ]
      };
    }

    if (isLarge) {
      const cfg = { radius:14, padding:[10,4,10,4], labelFz:13, valueFz:24, subFz:11, gap:4, subGap:3 };
      return {
        type:'widget', padding:[16,16,14,16], backgroundGradient:bg,
        children:[
          row([
            icon('shield.checkered', C.main, 17), spacer(4), text('节点体检', 16, 'heavy', C.main),
            spacer(), text('出口 IP: ', 11, 'medium', C.muted), text(ip || '未知', 11, 'bold', C.main, { family:'Menlo', maxLines:1 }),
            ...(protocol ? [spacer(5), text(protocol, 10, 'bold', C.blue)] : [])
          ],0),
          spacer(14),
          col([
            row(cards.slice(0,2).map(x => buildCard(x,cfg)),12,{flex:1}),
            row(cards.slice(2,4).map(x => buildCard(x,cfg)),12,{flex:1})
          ],12,{flex:1}),
          spacer(12),
          { type:'stack', height:0.5, backgroundColor:C.divider, borderRadius:1, children:[] },
          spacer(8),
          row([
            text(`三源置信度：${confidence}`, 11, 'bold', confidence === '需复核' ? C.gold : C.muted),
            spacer(), icon('arrow.triangle.2.circlepath', C.muted, 11), spacer(4), text(updateTime, 10, 'bold', C.muted, { family:'Menlo' })
          ],0)
        ]
      };
    }

    const cfg = { radius:13, padding:[12,6,12,6], labelFz:11, valueFz:18, subFz:9, gap:4, subGap:2 };
    return {
      type:'widget', padding:[10,12,6,12], backgroundGradient:bg,
      children:[
        row([
          icon('shield.checkered', C.main, 16), spacer(2), text('节点体检', 15, 'heavy', C.main),
          spacer(), text('出口 IP: ', 10, 'medium', C.muted), text(ip || '未知', 10, 'bold', C.main, { family:'Menlo', maxLines:1, minScale:0.7 }),
          ...(protocol ? [spacer(4), text(protocol, 9, 'bold', C.blue)] : [])
        ],0),
        spacer(24),
        row(cards.map(x => buildCard(x,cfg)),6),
        spacer(15),
        { type:'stack', height:0.5, backgroundColor:C.divider, borderRadius:1, children:[] },
        spacer(8),
        row([
          text(riskFlags.length ? `风险标记: ${riskFlags.join(' · ')}` : '未见高风险标记', 10, 'bold', riskFlags.length ? riskColor : C.teal, { maxLines:1, minScale:0.7 }),
          spacer(), icon('arrow.triangle.2.circlepath', C.muted, 11), spacer(4), text(updateTime, 10, 'bold', C.muted, { family:'Menlo' })
        ],0)
      ]
    };
  } catch (e) {
    return {
      type:'widget', padding:16, backgroundGradient:bg,
      children:[
        row([icon('exclamationmark.triangle.fill', C.red, 16), spacer(4), text('节点体检加载失败', 15, 'heavy', C.main)],0),
        spacer(8), text(e?.message || String(e), 11, 'medium', C.muted, { maxLines:3 })
      ]
    };
  }
}
