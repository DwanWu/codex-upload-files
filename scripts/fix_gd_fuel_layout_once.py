from pathlib import Path
import re

js_path = Path('Egern/Widget/GDFuelPrice/GDFuelPrice.js')
s = js_path.read_text(encoding='utf-8')

# Prevent card labels/prices/deltas from colliding at narrow widths.
s = s.replace(
    "mkText(item.label, config.labelFz, config.labelWeight, item.color),",
    "mkText(item.label, config.labelFz, config.labelWeight, item.color, { maxLines: 1, minScale: 0.78 }),"
)
s = s.replace(
    "mkText(item.val, config.valFz, 'heavy', C.main),",
    "mkText(item.val, config.valFz, 'heavy', C.main, { maxLines: 1, minScale: 0.74 }),"
)
s = s.replace(
    "delta ? mkText(delta.text, config.deltaFz, 'bold', delta.color) : mkText(' ', config.deltaFz, 'bold', C.muted),",
    "delta ? mkText(delta.text, config.deltaFz, 'bold', delta.color, { maxLines: 1, minScale: 0.74 }) : mkText(' ', config.deltaFz, 'bold', C.muted, { maxLines: 1 }),"
)

start = s.index("  const cardCfgMed = {")
new_tail = r'''  const cardCfgMed = {
    radius: 12, padding: [10, 4, 10, 4], labelFz: 11, labelWeight: 'bold',
    valFz: 17, innerGap: 3, deltaFz: 10, deltaGap: 2
  };
  const infoColorMed = C.red;
  const adjustText = `下轮调价 ${nextAdjust.dateStr}${nextAdjust.countdown ? ` ${nextAdjust.countdown}` : ''}`;

  return {
    type: 'widget', padding: 13, url: BASE, backgroundGradient,
    children: [
      mkRow([
        mkIcon('fuelpump.circle.fill', C.red, 16), mkSpacer(4),
        mkText(`${REGION_NAME}油价`, 15, 'heavy', C.main, { maxLines: 1 }),
        mkSpacer(),
        mkText(adjustText, 10, 'bold', infoColorMed, { maxLines: 1, minScale: 0.72 })
      ], 0),
      {
        type: 'stack', direction: 'column', flex: 1,
        children: [
          mkSpacer(),
          mkRow(PRICE_ITEMS.map(item => buildPriceCard(item, cardCfgMed)), 7, { height: 82 }),
          mkSpacer()
        ]
      },
      mkRow([
        ...(hasTrendData ? [
          mkRow([
            mkText(trendLabel, 10, 'medium', C.muted, { maxLines: 1, minScale: 0.8 }),
            mkText(trendInfo, 10, 'bold', trendColor, { maxLines: 1, minScale: 0.8 })
          ], 2)
        ] : []),
        mkSpacer(),
        mkText(updateTimeStr, 10, 'bold', C.muted, { family: 'Menlo', maxLines: 1 })
      ], 0)
    ]
  };
}
'''
s = s[:start] + new_tail
js_path.write_text(s, encoding='utf-8')

yaml_path = Path('Egern/Widget/GDFuelPrice/GDFuelPrice.yaml')
y = yaml_path.read_text(encoding='utf-8')
y = re.sub(r'GDFuelPrice\.js(?:\?v=[^\s]+)?', 'GDFuelPrice.js?v=20260908-2', y)
yaml_path.write_text(y, encoding='utf-8')
