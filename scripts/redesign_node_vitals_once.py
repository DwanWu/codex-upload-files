from pathlib import Path
import re

js_path = Path('Egern/Widget/NodeVitals/NodeVitals.js')
s = js_path.read_text(encoding='utf-8')
marker = "  const ipItem = (label, value, labelSize, valueSize, align = 'start') => ({"
if marker not in s:
    raise SystemExit('NodeVitals footer marker not found')
prefix = s[:s.index(marker)]
new_tail = r'''  const ipInline = (label, value, size) => row([
    text(label, size, 'medium', C.muted, { maxLines: 1 }),
    spacer(4),
    text(value, size, 'bold', C.main, { maxLines: 1, minScale: 0.58 })
  ], 0);

  const centeredBody = (cfg, gap, height) => ({
    type: 'stack', direction: 'column', flex: 1,
    children: [
      spacer(),
      row(cards.map(x => buildCard(x, cfg)), gap, { height }),
      spacer()
    ]
  });

  if (isSmall) {
    const cfg = { radius: 10, padding: [7, 2, 7, 2], labelSize: 9, valueSize: 14, gap: 3 };
    return {
      type: 'widget', padding: 12, backgroundGradient,
      children: [
        header(14, 13, 10),
        centeredBody(cfg, 6, 62),
        row([
          ipInline('内网 IP', internalIP, 7),
          spacer(),
          ipInline('出口 IP', exitIP, 7)
        ], 0)
      ]
    };
  }

  if (isLarge) {
    const cfg = { radius: 14, padding: [16, 6, 16, 6], labelSize: 14, valueSize: 28, gap: 8 };
    return {
      type: 'widget', padding: 16, backgroundGradient,
      children: [
        header(18, 17, 14),
        centeredBody(cfg, 12, 140),
        row([
          ipInline('内网 IP', internalIP, 11),
          spacer(),
          ipInline('出口 IP', exitIP, 11)
        ], 0)
      ]
    };
  }

  const cfg = { radius: 12, padding: [11, 5, 11, 5], labelSize: 11, valueSize: 21, gap: 4 };
  return {
    type: 'widget', padding: 13, backgroundGradient,
    children: [
      header(16, 15, 12),
      centeredBody(cfg, 8, 78),
      row([
        ipInline('内网 IP', internalIP, 9),
        spacer(),
        ipInline('出口 IP', exitIP, 9)
      ], 0)
    ]
  };
}
'''
js_path.write_text(prefix + new_tail, encoding='utf-8')

yaml_path = Path('Egern/Widget/NodeVitals/NodeVitals.yaml')
y = yaml_path.read_text(encoding='utf-8')
y = re.sub(r'NodeVitals\.js(?:\?v=[^\s]+)?', 'NodeVitals.js?v=20260908-2', y)
y = y.replace('底部固定显示内网 IP 与出口 IP。', '底部将内网 IP 与出口 IP 合并为同一行显示。')
yaml_path.write_text(y, encoding='utf-8')
