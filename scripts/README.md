# Egern rule maintenance

The four workflows run daily at 10:11, 10:41, 11:11 and 12:41 Beijing time (best effort). The final run refreshes all four categories in one commit; each dedicated run also rebuilds Other. Shared concurrency and non-force push retries prevent accidental overwrite.

Sources: QuixoticHeart/rule-set (GPL-3.0, https://github.com/QuixoticHeart/rule-set); OpenAI network recommendations https://help.openai.com/en/articles/9247338 and Voice JSON; Anthropic official IP documentation https://platform.claude.com/docs/en/api/ip-addresses; Google goog.json minus cloud.json; FCM. Preserve custom additions in egern-policy.json. Invalid downloads, unexpected formats and substantial rule-count drops abort before publication. Upstream data is not executed.

Egern priority: Apple AI / Claude / ChatGPT / Google before Other; broad parent domains, shared infrastructure and partially overlapping IP ranges can still overlap. Apple AI and widgets are unchanged. No list guarantees private or future service endpoints. Run python scripts/sync_egern.py test for offline tests; use all, chatgpt, claude, google or other to refresh.
