# 广东油价 · Stash 折叠面板 v2.0

标题显示广东油价及下次调价日期（例如 `广东油价·12/10`），正文仅显示92/95价格（例如 `92·8.04-95·8.71`，人民币元/升）。92/95为广东省最高零售限价，不显示98号；保留异常、缓存和旧价提示。价格下跌绿色、上涨红色、待更新/缓存/参考数据灰色。价格数据和日历校验复用 Egern 当前实现（源文件 blob: 425f534658322edec4b834951f91a92ab2769208）；直接访问 main 分支的 Egern/Widget/OilPriceGD/prices.json，现有 GitHub Actions 负责更新价格，无额外自动化。面板每1800秒由 Stash 调度，离线读取校验后的持久化缓存；不将旧报价标成最新。调价日期以北京时间计算，标题按月/日精简显示，不添加“调价日期”等文字；预计、暂缓及待公布情况保留必要提示。

安装 OilPriceGD.stoverride，Stash 原生 collapsed: true，内嵌 payload 需 iOS/tvOS 3.2.5+。无 MITM、无固定代理组、无订阅凭证。实际设备显示效果和调度仍需设备验证。验证：node Stash/Tile/OilPriceGD/test_OilPriceGD.mjs。fixture.json 是本次测试用快照（主分支数据 blob 7dabc4f71438d71930286052ff00e755aba71519），不被运行时脚本使用。

Stash 官方文档：https://stash.wiki/script/tile 、https://stash.wiki/script/manage-script 、https://stash.wiki/script/syntax-and-interface

## 长期稳定性优化

正常仅请求原 raw 地址一次，主源不可达、落后于已验证缓存或调价周期过期时，使用同一主分支文件的 GitHub Contents API 备用入口（支持原始 JSON 及合法 Base64 文件响应）。单次8秒，最多两个请求。备用接口403/429按响应提示退避，最少1小时、最多24小时；继续保留经校验的缓存及旧价标记，不用较旧数据覆盖最新价格。备用入口并非独立油价数据源，GitHub 整体故障或上游同步失败时仍无法产生新价格。维持原面板样式、URL、刷新间隔及主分支自动化。
