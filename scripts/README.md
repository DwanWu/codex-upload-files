# Egern rule maintenance

The four workflows run daily at 09:11, 10:41, 11:11 and 12:41 Beijing time (best effort). The final run refreshes all four categories in one commit; each dedicated run also rebuilds Other. Shared concurrency and non-force push retries prevent accidental overwrite.

Sources: QuixoticHeart/rule-set (GPL-3.0, https://github.com/QuixoticHeart/rule-set); OpenAI network recommendations https://help.openai.com/en/articles/9247338 and Voice JSON; Anthropic official IP documentation https://platform.claude.com/docs/en/api/ip-addresses; Google goog.json minus cloud.json; FCM. Preserve custom additions in egern-policy.json. Invalid downloads, unexpected formats and substantial rule-count drops abort before publication. Upstream data is not executed.

Egern priority: Apple AI / Claude / ChatGPT / Google before Other; broad parent domains, shared infrastructure and partially overlapping IP ranges can still overlap. Apple AI and widgets are unchanged. No list guarantees private or future service endpoints. Run python scripts/sync_egern.py test for offline tests; use all, chatgpt, claude, google or other to refresh.

## 保守等价压缩与官方端点核验（2026-11-27）

- Apple 保持原规则不变；ChatGPT、Claude、Google、Other 仅压缩集合内已被同一集合父域名覆盖的非固定域名，及完全等价的 IPv4/IPv6 地址并集。保留所有手工固定的域名、关键词、正则、通配符以及 no_resolve: true。每次同步验证地址并集完全一致及域名无覆盖损失。
- Claude 核心端点依据 https://code.claude.com/docs/en/network-config 和 https://code.claude.com/docs/en/desktop；官方 IP 依据 https://platform.claude.com/docs/en/api/ip-addresses 。Claude Code 的 GitHub、npm、Homebrew、Google Storage、字体及共享 CDN 等依赖保留在 Google/Other，官方可选 Datadog 入口由 Other 明确覆盖，不将共享服务全部划入 Claude。requiredHosts 对实际生成规则作回归检查，不为凑数量而添加重复域名。入站和出站 IP 的已有并集不变（重叠前缀可以合并）；出站范围并不代表客户端专用 API 入口。
- 保持原订阅 URL、分类和每日调度。推荐 Claude 在 Google 前，专属分类在 Other 前；完整客户端策略顺序需用户自行核查。
