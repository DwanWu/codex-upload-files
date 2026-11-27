# 广东油价 · Stash 折叠面板 v2.0

标题仅显示广东油价，正文仅显示92/95价格（例如 `92·8.04-95·8.71`，人民币元/升）。92/95为广东省最高零售限价，不显示98号和调价日期；保留异常、缓存和旧价提示。价格下跌绿色、上涨红色、待更新/缓存/参考数据灰色。价格数据和日历校验复用 Egern 当前实现（源文件 blob: 425f534658322edec4b834951f91a92ab2769208）；直接访问 main 分支的 Egern/Widget/OilPriceGD/prices.json，现有 GitHub Actions 负责更新价格，无额外自动化。面板每1800秒由 Stash 调度，离线读取校验后的持久化缓存；不将旧报价标成最新。调价日期以北京时间计算，仅用于后台价格时效校验，不在面板显示。

安装 OilPriceGD.stoverride，Stash 原生 collapsed: true，内嵌 payload 需 iOS/tvOS 3.2.5+。无 MITM、无固定代理组、无订阅凭证。实际设备显示效果和调度仍需设备验证。验证：node Stash/Tile/OilPriceGD/test_OilPriceGD.mjs。fixture.json 是本次测试用快照（主分支数据 blob 7dabc4f71438d71930286052ff00e755aba71519），不被运行时脚本使用。

Stash 官方文档：https://stash.wiki/script/tile 、https://stash.wiki/script/manage-script 、https://stash.wiki/script/syntax-and-interface
