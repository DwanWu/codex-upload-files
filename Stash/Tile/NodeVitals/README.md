# Stash 节点体检 v2.0

基准：主分支 Egern/Widget/NodeVitals/NodeVitals.js（blob 5e747e0687cae207110fe271c9b0b8404b03b7bf）。保留 IPPure 优先、ipify 出口备用及 IPQuery 风险备用；纯度 = 100 - 风险分，风险分级和颜色阈值沿用 Egern。区别：缺失、无效、跨 IP 数据不参与评分；只有明确住宅证据才显示住宅，IPQuery 单独确认非机房时显示非机房。缺数据不默认为100或低风险。

原生 Tile 使用 Stash 文档支持的 title/content/icon/backgroundColor。设置 collapsed: true，不在首页独立显示，进入「第三方服务」或长按节点进入代理信息查看。按官方 Collapsed Tile 机制，由 Stash 将 HTTP 请求转发至当前被检测节点；移除固定策略头及参数。保留 interval: 600 和脚本提供者1800秒更新间隔，不设额外 cron，不使用 MITM 或持久化检测缓存。Stash 未公开与 Egern ctx.device.ipv4 对等的脚本接口，故省略内网 IP；面板正文按用户要求仅单行展示（例如 `纯度98·住宅·低`），出口 IP 仍用于实际检测但不再显示；颜色是单 Tile 总体状态，无法逐卡自定义。

安装 NodeVitals.stoverride 后启用覆写。验证命令：node Stash/Tile/NodeVitals/test_NodeVitals.mjs。测试覆盖模拟 HTTP、评分、切换 IP、异常及不强制策略头；实际 Stash iOS 折叠显示和长按节点转发仍需设备验证。

文档：https://stash.wiki/script/tile ；https://stash.wiki/script/syntax-and-interface ；https://ippure.com/MyIP-Info-API

为避免旧版 Stash 磁盘脚本和 Tile 缓存，覆写改用 `node-vitals-v2-compact` 与独立脚本路径 `NodeVitalsCompact.js`。保留旧 `NodeVitals.js` 兼容已有订阅；两份脚本本次内容完全一致。旧覆写应更新或移除后重新导入，不与旧版重复启用。
