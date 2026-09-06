/**
 * 节点体检 - NodePulse
 * 布局参考“广东油价”：标题 -> 居中结果卡 -> 分隔线 -> 底部左右 IP。
 * 顶部地区绿色显示；底部左内网 IP、右出口 IP。
 * 颜色规则：纯度>=90绿色，80-89粉色，<80红色；机房红色；风险中粉色、高红色。
 */

export default async function (ctx) {
  const family = String(ctx.widgetFamily || 'systemMedium').toLowerCase();
  const isSmall = family.includes('small');
  const isLarge = family.includes('large');

  const C = {
    bg: [{ light: '#FAFAFA', dark: '#1C1C1E' }, { light: '#EFEFF4', dark: '#111113' }],
    card: { light: '#FFFFFF', dark: '#2C2C2E' },
    main: { light: '#1C1C1E', dark: '#F2F2F7' },
    muted: { light: '#8E8E93', dark: '#8E8E93' },
    green: { light: '#1E7E44', dark: '#30D158' },
    pink: { light: '#DB2777', dark: '#F472B6' },
    red: { light: '#C0392B', dark: '#FF453A' },
    divider: { light: '#E5E5EA', dark: '#38383A' }
  };

  const backgroundGradient = {
    type: 'linear', colors: C.bg,
    startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 }
  };

  const text = (value, size, weight, color, opts = {}) => ({
    type: 'text', text: String(value ?? ''), font: { size, weight }, textColor: color, ...opts
  });
  const row = (children, gap = 4, opts = {}) => ({
    type: 'stack', direction: 'row', alignItems: 'center', gap, children, ...opts
  });
  const icon = (name, color, size) => ({
    type: 'image', src: `sf-symbol:${name}`, color, width: size, height: size
  });
  const spacer = length => length == null ? { type: 'spacer' } : { type: 'spacer', length };
  const divider = () => ({ type: 'stack', height: 0.5, backgroundColor: C.divider, borderRadius: 1, children: [] });

  const getJson = async (url, timeout = 7000) => {
    try {
      const resp = await ctx.http.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json,text/plain,*/*' },
        timeout
      });
      return { ok: true, data: JSON.parse(await resp.text()) };
    } catch (e) {
      return { ok: false, data: {}, error: e?.message || String(e) };
    }
  };

  const clean = s => String(s || '').replace(/\s+/g, ' ').trim();
  const clamp = n => Math.max(0, Math.min(100, Number(n)));

  const COUNTRY_ZH = {
    US:'美国', CA:'加拿大', GB:'英国', DE:'德国', FR:'法国', NL:'荷兰', BE:'比利时',
    JP:'日本', KR:'韩国', SG:'新加坡', HK:'中国香港', MO:'中国澳门', TW:'中国台湾', CN:'中国',
    AU:'澳大利亚', NZ:'新西兰', IN:'印度', MY:'马来西亚', TH:'泰国', VN:'越南', PH:'菲律宾',
    ID:'印度尼西亚', RU:'俄罗斯', UA:'乌克兰', CH:'瑞士', SE:'瑞典', NO:'挪威', FI:'芬兰',
    DK:'丹麦', IT:'意大利', ES:'西班牙', PT:'葡萄牙', PL:'波兰', IE:'爱尔兰', AE:'阿联酋',
    TR:'土耳其', BR:'巴西', MX:'墨西哥', AR:'阿根廷', CL:'智利', ZA:'南非', IL:'以色列'
  };

  const internalIP = clean(ctx.device?.ipv4?.address) || '未连接';

  const pureResp = await getJson('https://my.ippure.com/v1/info');
  const pure = pureResp.data || {};
  let exitIP = clean(pure.ip);
  if (!exitIP) {
    const ipResp = await getJson('https://api64.ipify.org?format=json');
    exitIP = clean(ipResp.data?.ip);
  }
  if (!exitIP) exitIP = '获取失败';

  let query = {};
  if (exitIP !== '获取失败') {
    const queryResp = await getJson(`https://api.ipquery.io/${encodeURIComponent(exitIP)}`);
    query = queryResp.data || {};
  }
  const risk = query.risk || {};

  const fraudScore = Number(pure.fraudScore);
  const riskScore = Number(risk.risk_score);
  let purity = null;
  if (Number.isFinite(fraudScore)) purity = Math.round(100 - clamp(fraudScore));
  else if (Number.isFinite(riskScore)) purity = Math.round(100 - clamp(riskScore));

  const datacenter = pure.isDataCenter === true || risk.is_datacenter === true || pure.isResidential === false;
  const property = datacenter ? '机房' : '住宅';

  const cc = String(pure.countryCode || query.location?.country_code || query.location?.countryCode || '').toUpperCase();
  const country = COUNTRY_ZH[cc] || clean(query.location?.country || pure.country) || '未知';

  const vpn = risk.is_vpn === true;
  const proxy = risk.is_proxy === true;
  const tor = risk.is_tor === true;

  let riskLevel = '低';
  if (tor || (vpn && proxy) || (purity != null && purity < 35)) riskLevel = '高';
  else if (datacenter || vpn || proxy || (purity != null && purity < 75)) riskLevel = '中';

  const purityColor = purity == null ? C.muted : purity >= 90 ? C.green : purity >= 80 ? C.pink : C.red;
  const propertyColor = property === '机房' ? C.red : C.green;
  const riskColor = riskLevel === '高' ? C.red : riskLevel === '中' ? C.pink : C.green;

  const cards = [
    { label: '纯度', value: purity == null ? '--' : String(purity), color: purityColor },
    { label: '属性', value: property, color: propertyColor },
    { label: '风险', value: riskLevel, color: riskColor }
  ];

  const buildCard = (item, cfg) => ({
    type: 'stack', direction: 'column', alignItems: 'center', flex: 1,
    backgroundColor: C.card, borderRadius: cfg.radius, padding: cfg.padding,
    children: [
      spacer(),
      text(item.label, cfg.labelSize, 'bold', item.color, { maxLines: 1 }),
      spacer(cfg.gap),
      text(item.value, cfg.valueSize, 'heavy', item.color, { maxLines: 1, minScale: 0.55 }),
      spacer()
    ]
  });

  const header = (iconSize, titleSize, regionSize) => row([
    icon('checkmark.shield.fill', C.green, iconSize),
    spacer(3),
    text('节点体检', titleSize, 'heavy', C.main),
    spacer(),
    text(country, regionSize, 'heavy', C.green, { maxLines: 1, minScale: 0.65 })
  ], 0);

  const ipItem = (label, value, labelSize, valueSize, align = 'start') => ({
    type: 'stack', direction: 'column', alignItems: align, children: [
      text(label, labelSize, 'medium', C.muted, { maxLines: 1 }),
      spacer(2),
      text(value, valueSize, 'bold', C.main, { maxLines: 1, minScale: 0.55 })
    ]
  });

  if (isSmall) {
    const cfg = { radius: 10, padding: [7, 2, 7, 2], labelSize: 9, valueSize: 15, gap: 3 };
    return {
      type: 'widget', padding: [11, 11, 8, 11], backgroundGradient,
      children: [
        header(14, 13, 10),
        spacer(14),
        row(cards.map(x => buildCard(x, cfg)), 6, { flex: 1 }),
        spacer(10),
        divider(),
        spacer(7),
        row([
          ipItem('内网 IP', internalIP, 7, 8, 'start'),
          spacer(),
          ipItem('出口 IP', exitIP, 7, 8, 'end')
        ], 0)
      ]
    };
  }

  if (isLarge) {
    const cfg = { radius: 14, padding: [22, 6, 22, 6], labelSize: 14, valueSize: 30, gap: 8 };
    return {
      type: 'widget', padding: [16, 16, 12, 16], backgroundGradient,
      children: [
        header(18, 17, 14),
        spacer(28),
        row(cards.map(x => buildCard(x, cfg)), 12, { flex: 1 }),
        spacer(22),
        divider(),
        spacer(10),
        row([
          ipItem('内网 IP', internalIP, 10, 12, 'start'),
          spacer(),
          ipItem('出口 IP', exitIP, 10, 12, 'end')
        ], 0)
      ]
    };
  }

  const cfg = { radius: 13, padding: [14, 6, 14, 6], labelSize: 11, valueSize: 22, gap: 5 };
  return {
    type: 'widget', padding: [10, 12, 6, 12], backgroundGradient,
    children: [
      header(16, 15, 12),
      spacer(24),
      row(cards.map(x => buildCard(x, cfg)), 8),
      spacer(15),
      divider(),
      spacer(8),
      row([
        ipItem('内网 IP', internalIP, 9, 10, 'start'),
        spacer(),
        ipItem('出口 IP', exitIP, 9, 10, 'end')
      ], 0)
    ]
  };
}
