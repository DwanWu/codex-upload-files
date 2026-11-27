# Egern 小组件维护说明

- 智能热搜：AIHOT 官方新域名 aihot.news；ETag 条件请求，429/503 尊重 Retry-After，去重及链接白名单，最多6小时客户端缓存并标示时间。不对外镜像数据。官方文档：https://aihot.news/agent?tab=api
- 黄历查询：双源兼容完整日期与带年月标题的两位日期；按月保存校验过的日期记录，24小时内复用，故障30分钟退避。北京时间午夜切换，不复用其他日期宜忌。本地 Intl 农历核对；宜忌属传统历法参考，不保证双源完全一致。
- 节点体检：先通过 IPPure（失败则 IPQuery）获取当前连接的公网出口；同时用 Proxycheck v3 与 IPQuery 的指定地址接口查询该 IP。Proxycheck 有效时显示其风险值的反向参考分，失败则显示 IPPure IPv4 的反向参考分并标记备用来源；主评分卡仅显示数字，内部仍保留来源字段。不混合、平均、伪造评分，也不把 IPQuery 风险分冒充纯度。IPv6 由 Proxycheck 支持，失败时不显示数字。若来源评分相差至少30分（仅为提示阈值，并非科学校准）或检测记录相互矛盾，标记差异并保留风险证据。未证实住宅或低风险则保守处理。
- 原订阅 URL 不变，脚本内部版本更新。WidgetKit 可能延迟刷新。回归命令：node scripts/test_egern_widgets.mjs。测试使用模拟网络和固定时间；真机需验证。

## 节点体检评分依据

- Proxycheck v3 官方文档：https://proxycheck.io/api/ 。主评分为 detections.risk 的 100−risk，仅作风险反向参考，不是官方纯净度或安全概率。按指定 IP 解析响应；拒绝异常分数、记录矛盾、明确过旧或未来时间。无需 key 的匿名额度100次/日，可能限制代理出口；可在本机私有脚本 env 设置自己的 PROXYCHECK_KEY（不要上传到 GitHub）。注册免费额度1000次/日。设备侧分别限制80/800次/UTC日并对拒绝/限流退避，只保存计数和时间戳、不缓存 IP 和评分。默认约30分钟刷新，异常15分钟；免费 CDN 可能缓存10分钟，实际刷新由 WidgetKit 控制。
- IPPure 官方接口：https://ippure.com/MyIP-Info-API ；FAQ：https://ippure.com/faq 。仅 IPv4 有效 fraudScore，可按 100−fraudScore 作为明确标注的备用参考分；没有数据时可能从网段推断，公开 API 为测试阶段。
- IPQuery 官方接口：https://ipquery.io/developers/api 。只作为同地址风险/属性辅助数据和出口识别备援；其分数不用于纯度。风险高/中/低为组件保守分类，不是第三方认证。
- 本机可用 NODE_POLICY 指定实际存在的代理策略。不同目标网站的分流可能导致其出口不同于组件。调用 Proxycheck 会向该第三方发送被检测的公网IP，不发送内网IP、账户资料或设备标识；tag=0 禁止该查询的 dashboard positive detection logging，但供应商仍有自身的处理及保留政策：https://proxycheck.io/privacy/ 。不修改 Cloudflare 和其他组件。没有统一独立证据证明任一家对所有IP最准确；来源差异应供人工判断。
