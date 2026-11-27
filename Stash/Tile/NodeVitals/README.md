# Stash 节点体检 v2.0

基准：主分支 Egern/Widget/NodeVitals/NodeVitals.js（blob 5e747e0687cae207110fe271c9b0b8404b03b7bf）。保留 IPPure 优先、ipify 出口备用及 IPQuery 风险备用；纯度 = 100 - 风险分，风险分级和颜色阈值沿用 Egern。区别：缺失、无效、跨 IP 数据不参与评分；只有明确住宅证据才显示住宅，IPQuery 单独确认非机房时显示非机房。缺数据不默认为100或低风险。

原生 Tile 使用 Stash 文档支持的 title/content/icon/backgroundColor。设置 collapsed: true，不在首页独立显示，进入「第三方服务」或长按节点进入代理信息查看。按官方 Collapsed Tile 机制，由 Stash 将 HTTP 请求转发至当前被检测节点；移除固定策略头及参数。保留 interval: 600 和脚本提供者1800秒更新间隔，不设额外 cron，不使用 MITM 或持久化检测缓存。Stash 未公开与 Egern ctx.device.ipv4 对等的脚本接口，故省略内网 IP；面板正文按用户要求仅单行展示（例如 `纯度98·住宅·低`），出口 IP 仍用于实际检测但不再显示；颜色是单 Tile 总体状态，无法逐卡自定义。

安装 NodeVitals.stoverride 后启用覆写。验证命令：node Stash/Tile/NodeVitals/test_NodeVitals.mjs。测试覆盖模拟 HTTP、评分、切换 IP、异常及不强制策略头；实际 Stash iOS 折叠显示和长按节点转发仍需设备验证。

文档：https://stash.wiki/script/tile ；https://stash.wiki/script/syntax-and-interface ；https://ippure.com/MyIP-Info-API

历史远程脚本 `NodeVitals.js` 与 `NodeVitalsCompact.js` 内容一致；当前内嵌覆写不再请求它们。为兼容已经安装旧版覆写的设备，暂保留两条旧脚本地址，避免缓存或旧配置请求失败。测试使用 `NodeVitalsCompact.js`，不同时启用多个同名覆写。

## 单行内嵌版

当前 `NodeVitals.stoverride` 与 `NodeVitalsSingleLine.stoverride` 内容完全相同，使用 `script-providers.payload` 内嵌同一份已验证脚本，不另行下载脚本，不包含「风险」两字。新面板标识为 `node-vitals-v2-singleline`，旧覆写需移除或停用，以免数组合并产生重复面板。保留原评分算法及折叠属性；需要 Stash 3.2.5 或以上版本支持内嵌脚本。文档：https://stash.wiki/script/manage-script 。实际设备显示尚未验证。

## 长期稳定性优化

单次请求最长10秒，总请求时间预算28秒，IPPure阶段最多18秒；每次运行最多共享一次网络错误、408/425/5xx重试，429及明确拒绝不重试。保留出口备用及严格IP一致性，不使用跨节点结果缓存，不改变评分、单行样式、面板标识或刷新间隔。实际脚本运行上限仍受 Stash 控制。
