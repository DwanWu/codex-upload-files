# 智能检测 · Stash 首页面板 v2.0

独立首页面板（collapsed: false），标题示例 `智能检测·3/3`，正文 `ChatGPT✓·Claude✓·Gemini✓`。这些符号代表只读网络接口检测结果，不是账号可用性或模型授权证明。✓：已确认官方接口可达（含符合接口格式的预期无认证响应）；!：明确地区限制、403 拒绝或429限流；×：网络/HTTP服务失败；?：响应无法确认。已知区域限制优先判定，不将任意401、403或HTML挑战页视为成功。

每1800秒并发发出3次 HTTPS GET（单次请求超时15秒）：OpenAI /v1/models（ChatGPT 名称对应 OpenAI API 连通性）、Anthropic /v1/models?limit=1、Google Gemini /v1beta/models?pageSize=1。分别使用现有 ChatGPT、Claude、Google 策略组，Stash 文档要求 URL 编码 X-Stash-Selected-Proxy。可修改 argument 中组名适配其他配置。无 API Key，无账号登录，无模型推理请求，无 MITM，无额外 cron，无持久化结果缓存。切换节点后需手动刷新或等 Stash 下一次刷新，实际调度由 Stash 控制。

安装 AICheck.stoverride 即可；内嵌 payload 需要 Stash iOS/tvOS 3.2.5+。不更改现有规则、节点或其他面板。测试：`node Stash/Tile/AICheck/test_AICheck.mjs`，使用模拟 HTTP 响应，验证实际返回字段、策略头和异常分级。设备实际转发及渲染仍需验证。

官方文档：
- https://stash.wiki/script/tile
- https://stash.wiki/script/syntax-and-interface
- https://stash.wiki/script/manage-script
- https://platform.openai.com/docs/api-reference/models/list
- https://platform.claude.com/docs/en/api/models/list
- https://ai.google.dev/api/models

## 长期稳定性优化

保留15秒单次请求上限；各服务并发检测，30秒总预算内，每个服务最多一次网络错误、408或5xx（含529）重试。地区限制、429、认证响应及其他不明确响应不重试或伪装为成功。日志仅记录服务名称、HTTP状态、尝试次数和判定，不记录节点名、请求凭证或响应正文。正常情况仍只请求3次。样式、策略组、刷新周期及原订阅地址不变；实际客户端运行时限由 Stash 控制。
