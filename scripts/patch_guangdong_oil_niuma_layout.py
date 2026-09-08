from pathlib import Path
import re

js_path = Path('Egern/Widget/GuangdongOilPrice/GuangdongOilPrice.js')
s = js_path.read_text(encoding='utf-8')
marker = '  if (isSmall) {'
if marker not in s:
    raise SystemExit('layout marker not found')
prefix = s[:s.index(marker)]

tail = r'''  if (isSmall) {
    const cardCfg = {
      radius: 10, padding: [4, 2, 4, 2], labelFz: 10, labelWeight: 'bold',
      valFz: 14, innerGap: 1, deltaFz: 9, deltaGap: 1
    };
    return {
      type: 'widget', padding: 12, url: BASE, backgroundGradient,
      children: [
        mkRow([
          mkIcon('fuelpump.circle.fill', C.red, 13), mkSpacer(4),
          mkText(`${REGION_NAME}油价`, 13, 'heavy', C.main),
          mkSpacer(),
          mkText(shortTimeStr, 9, 'bold', C.muted, { family: 'Menlo' })
        ], 0),
        mkSpacer(8),
        { type: 'stack', direction: 'column', gap: 8, flex: 1, children: [
          mkRow(PRICE_ITEMS.slice(0, 2).map(item => buildPriceCard(item, cardCfg)), 6, { flex: 1 }),
          mkRow(PRICE_ITEMS.slice(2, 4).map(item => buildPriceCard(item, cardCfg)), 6, { flex: 1 })
        ]},
        mkSpacer(8),
        mkRow([
          mkSpacer(),
          mkIcon('clock.fill', C.red, 9), mkSpacer(3),
          mkText(`下轮调价: ${nextAdjust.dateStr}`, 9, 'bold', C.red)
        ], 0)
      ]
    };
  }

  if (isLarge) {
    const cardCfg = {
      radius: 14, padding: [10, 4, 10, 4], labelFz: 14, labelWeight: 'heavy',
      valFz: 24, innerGap: 4, deltaFz: 12, deltaGap: 2,
      showCurve: true, curveWidth: 84, curveHeight: 26, curveGap: 5
    };
    const infoColor = C.red;
    return {
      type: 'widget', padding: 16, url: BASE, backgroundGradient,
      children: [
        mkRow([
          mkIcon('fuelpump.circle.fill', C.red, 17), mkSpacer(4),
          mkText(`${REGION_NAME}油价`, 16, 'heavy', C.main), mkSpacer(),
          mkText('下轮调价: ', 12, 'medium', infoColor),
          mkText(nextAdjust.dateStr, 12, 'bold', infoColor),
          mkText(` ${nextAdjust.countdown}`, 12, 'bold', infoColor)
        ], 0),
        mkSpacer(12),
        { type: 'stack', direction: 'column', gap: 12, flex: 1, children: [
          mkRow(PRICE_ITEMS.slice(0, 2).map(item => buildPriceCard(item, cardCfg)), 12, { flex: 1 }),
          mkRow(PRICE_ITEMS.slice(2, 4).map(item => buildPriceCard(item, cardCfg)), 12, { flex: 1 })
        ]},
        mkSpacer(10),
        { type: 'stack', height: 0.5, backgroundColor: C.divider, borderRadius: 1, children: [] },
        mkSpacer(8),
        mkRow([
          ...(hasTrendData ? [
            mkRow([mkText(trendLabel, 11, 'medium', C.muted), mkText(trendInfo, 11, 'bold', trendColor, { maxLines: 1 })], 2)
          ] : []),
          mkSpacer(),
          mkText(updateTimeStr, 11, 'bold', C.muted, { family: 'Menlo' })
        ], 0)
      ]
    };
  }

  const cardCfgMed = {
    radius: 13, padding: [12, 6, 12, 6], labelFz: 11, labelWeight: 'bold',
    valFz: 18, innerGap: 4, deltaFz: 11, deltaGap: 2
  };
  const infoColorMed = C.red;

  return {
    type: 'widget', padding: 13, url: BASE, backgroundGradient,
    children: [
      mkRow([
        mkIcon('fuelpump.circle.fill', C.red, 16), mkSpacer(2),
        mkText(`${REGION_NAME}油价`, 15, 'heavy', C.main), mkSpacer(),
        mkText('下轮调价: ', 11, 'medium', infoColorMed),
        mkText(nextAdjust.dateStr, 11, 'bold', infoColorMed),
        mkText(` ${nextAdjust.countdown}`, 11, 'bold', infoColorMed)
      ], 0),
      mkSpacer(12),
      mkRow(PRICE_ITEMS.map(item => buildPriceCard(item, cardCfgMed)), 6),
      mkSpacer(),
      mkRow([
        ...(hasTrendData ? [
          mkRow([mkText(trendLabel, 11, 'medium', C.muted), mkText(trendInfo, 11, 'bold', trendColor, { maxLines: 1 })], 2)
        ] : []),
        mkSpacer(),
        mkText(updateTimeStr, 10, 'bold', C.muted, { family: 'Menlo' })
      ], 0)
    ]
  };
}
'''

js_path.write_text(prefix + tail, encoding='utf-8')

yaml_path = Path('Egern/Widget/GuangdongOilPrice/GuangdongOilPrice.yaml')
y = yaml_path.read_text(encoding='utf-8')
y = re.sub(r'GuangdongOilPrice\.js(?:\?v=[^\s]+)?', 'GuangdongOilPrice.js?v=20260908-4', y)
yaml_path.write_text(y, encoding='utf-8')
