# Egern 小组件维护说明

- 智能热搜：AIHOT 官方新域名 aihot.news；ETag 条件请求，429/503 尊重 Retry-After，去重及链接白名单，最多6小时客户端缓存并标示时间。不对外镜像数据。官方文档：https://aihot.news/agent?tab=api
- 黄历查询：双源兼容完整日期与带年月标题的两位日期；按月保存校验过的日期记录，24小时内复用，故障30分钟退避。北京时间午夜切换，不复用其他日期宜忌。本地 Intl 农历核对；宜忌属传统历法参考，不保证双源完全一致。
- 节点体检：IPPure 先检测当前出口，再由 IPQuery 的指定 IP 接口查询该地址（支持 IPv4/IPv6）。查询结果必须匹配该地址；不匹配或查询失败时保留 IPPure 自身的有效字段，不混合其他出口的风险。IPPure 不可用时通过 IPQuery 检测出口并查询对应地址。纯度仅来自 IPPure 当前 IPv4 出口的有效数字型 fraudScore（0–100），以 100−fraudScore 计算参考值，并在卡片标注 IPPure参考；不使用 IPQuery risk_score 替代。IPPure FAQ 明确 IPv6 不评分，显示 IPv6未评分；缺少原始分数、超范围、类型错误、非公网出口或响应无效均不显示数字。低风险仅在两源有效且没有显著风险证据时显示，机房/Tor 等证据可独立提高风险等级，纯度不是安全保证。未知分数不默认0，未证实住宅或低风险则保守处理。不持久化 IP。可设置脚本 env 的 NODE_POLICY 为实际存在的策略名称；默认遵循当前分流，不保证所有应用出口一致。并非 Egern 内置风险算法。
- 原订阅 URL 不变，脚本内部版本更新。WidgetKit 可能延迟刷新。回归命令：node scripts/test_egern_widgets.mjs。测试使用模拟网络和固定时间；真机需验证。

## 节点体检评分依据

- IPPure 官方接口：https://ippure.com/MyIP-Info-API ；评分数据来源及 IPv6 限制：https://ippure.com/faq 。
- IPQuery 官方接口：https://ipquery.io/developers/api ；独立风险评分：https://ipquery.io/glossary/risk-score 。该评分不对机房属性本身扣分，故不可用 100−risk_score 冒充 IPPure 纯度。风险高/中/低为组件自己的保守分类，不是第三方认证。
- 当前出口以本次 IPPure 服务器观察到的 IP 为准（如失败则由 IPQuery 观察，仅显示属性和风险证据）。用户可在模块 env 指定实际策略名 NODE_POLICY。分流规则不同可能导致其他应用出口与组件不同；并非 Egern 内置评分。无历史分数缓存，拒绝明确陈旧的共享缓存响应，不发往新增第三方。
