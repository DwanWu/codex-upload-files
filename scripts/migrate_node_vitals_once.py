from pathlib import Path

repo = Path('.')
old_js = repo / 'Egern/Widget/NodePulse/NodePulse.js'
new_dir = repo / 'Egern/Widget/NodeVitals'
new_dir.mkdir(parents=True, exist_ok=True)

s = old_js.read_text(encoding='utf-8')
marker = '  if (isSmall) {'
if marker not in s:
    raise SystemExit('NodePulse layout marker not found')
prefix = s[:s.index(marker)]

# Keep all data/risk logic untouched; only replace the three widget-family layouts.
tail = r'''  if (isSmall) {
    const cfg = { radius: 10, padding: [7, 2, 7, 2], labelSize: 9, valueSize: 14, gap: 3 };
    return {
      type: 'widget', padding: 12, backgroundGradient,
      children: [
        header(14, 13, 10),
        {
          type: 'stack', direction: 'column', flex: 1,
          children: [
            spacer(),
            row(cards.map(x => buildCard(x, cfg)), 6, { height: 64 }),
            spacer()
          ]
        },
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
    const cfg = { radius: 14, padding: [18, 6, 18, 6], labelSize: 14, valueSize: 28, gap: 8 };
    return {
      type: 'widget', padding: 16, backgroundGradient,
      children: [
        header(18, 17, 14),
        {
          type: 'stack', direction: 'column', flex: 1,
          children: [
            spacer(),
            row(cards.map(x => buildCard(x, cfg)), 12, { height: 150 }),
            spacer()
          ]
        },
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

  const cfg = { radius: 12, padding: [12, 5, 12, 5], labelSize: 11, valueSize: 21, gap: 4 };
  return {
    type: 'widget', padding: 13, backgroundGradient,
    children: [
      header(16, 15, 12),
      {
        type: 'stack', direction: 'column', flex: 1,
        children: [
          spacer(),
          row(cards.map(x => buildCard(x, cfg)), 8, { height: 82 }),
          spacer()
        ]
      },
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
'''

new_js = prefix + tail
# Strengthen single-line constraints so narrow widths cannot overlap.
new_js = new_js.replace(
    "text(item.label, cfg.labelSize, 'bold', item.color, { maxLines: 1 }),",
    "text(item.label, cfg.labelSize, 'bold', item.color, { maxLines: 1, minScale: 0.75 }),"
)
new_js = new_js.replace(
    "text(value, valueSize, 'bold', C.main, { maxLines: 1, minScale: 0.55 })",
    "text(value, valueSize, 'bold', C.main, { maxLines: 1, minScale: 0.48 })"
)

(new_dir / 'NodeVitals.js').write_text(new_js, encoding='utf-8')

new_yaml = '''# ==========================================
# 📌 模块名称: 节点体检
# 🟢 图标: 绿色盾牌
# ✨ 顶部: 节点体检 + 地区
# ✨ 中间: 纯度 / 属性 / 风险 在可用区域垂直居中
# ✨ 底部: 左侧内网 IP / 右侧出口 IP
# ==========================================

name: "节点体检"
description: "节点体检居中布局：顶部标题固定，中间纯度/属性/风险结果在可用区域垂直居中，底部固定显示内网 IP 与出口 IP。"

auto_update:
  interval: 1800

scriptings:
  - generic:
      name: 节点体检
      script_url: https://raw.githubusercontent.com/DwanWu/codex-upload-files/main/Egern/Widget/NodeVitals/NodeVitals.js?v=20260908-1

widgets:
  - name: 节点体检
    script_name: 节点体检
'''
(new_dir / 'NodeVitals.yaml').write_text(new_yaml, encoding='utf-8')
