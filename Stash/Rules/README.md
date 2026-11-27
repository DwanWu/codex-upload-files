# Stash 原生分流规则（快照）

由主分支 `82a860fe4a954d5ce7f4f8cf9c657ac2776ebbb3` 的五个 `Egern/Rules/*.yaml` 转换而来。共 36699 条，保留源类别与内容，精确域名/后缀使用 domain 集合，IPv4/IPv6 使用 ipcidr 集合，关键词、通配符及正则使用 classical 集合。对含逗号的 6 个正则有界量词进行了等价展开以避免 classical 字段分隔歧义。

在配置中按 Apple → Claude → ChatGPT → Google → Other 顺序引用每类集合，其中 IP 集合使用 no-resolve。此分支是单次转换快照，并未新增自动化；不包含任何私人订阅地址、认证信息或代理节点凭证。主分支原有 Egern 文件和工作流未修改。

详细条数和源文件 blob SHA 见 manifest.json。来源及许可说明见主分支 scripts/README.md，含 QuixoticHeart/rule-set (GPL-3.0) 及官方网络建议、IP 数据。

## 分支维护

`stash-rules` 是独立的 Stash 发布分支，只保留 `Stash/` 下的规则、面板及维护文件。Egern 源规则、组件、同步脚本和 GitHub Actions 只在 `main` 维护；本分支不再保留这些重复快照。油价面板仍直接读取主分支的实时同步数据。不要将此发布分支合并回 `main`，避免把主分支的文件误删。既有 Stash 规则和面板订阅地址保持不变。
