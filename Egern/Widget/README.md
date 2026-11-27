# Egern 小组件维护说明

- 智能热搜：AIHOT 官方新域名 aihot.news；ETag 条件请求，429/503 尊重 Retry-After，去重及链接白名单，最多6小时客户端缓存并标示时间。不对外镜像数据。官方文档：https://aihot.news/agent?tab=api
- 黄历查询：双源兼容完整日期与带年月标题的两位日期；按月保存校验过的日期记录，24小时内复用，故障30分钟退避。北京时间午夜切换，不复用其他日期宜忌。本地 Intl 农历核对；宜忌属传统历法参考，不保证双源完全一致。
- 节点体检：IPPure 先检测当前出口，再由 IPQuery 的指定 IP 接口查询该地址（支持 IPv4/IPv6）。查询结果必须匹配该地址；不匹配或查询失败时保留 IPPure 自身的有效字段，不混合其他出口的风险。IPPure 不可用时通过 IPQuery 检测出口并查询对应地址。纯度为 IPPure fraudScore 的反向参考值；仅 IPQuery 可用时显示参考纯度。未知分数不默认0，未证实住宅或低风险则保守处理。不持久化 IP。可设置脚本 env 的 NODE_POLICY 为实际存在的策略名称；默认遵循当前分流，不保证所有应用出口一致。并非 Egern 内置风险算法。
- 原订阅 URL 不变，脚本内部版本更新。WidgetKit 可能延迟刷新。回归命令：node scripts/test_egern_widgets.mjs。测试使用模拟网络和固定时间；真机需验证。
