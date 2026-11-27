# 每日黄历 · Stash 首页 Tile v2.0

非折叠首页面板，名称「每日黄历」。标题显示农历及干支日，内容分为宜、忌两行，各选取最多两项原始短语（每行预留有限文字空间），不生成吉凶预测，不将黄历视为科学决策依据。数据不足显示「暂无数据」。

双源和日期核验移植自 Egern 黄历（源 blob 39e03d6e8812409acf69f30c794fe8f612ee8aa3）：主源 zqzess/openApiData/calendar_new；备用源 xuqssq/calendar/output。按北京时间判断日期与月度缓存，优先主源，两个来源农历或干支日有差异时不混合宜忌；支持本地 Intl 农历基础兜底（依赖设备运行时），不编造缺失宜忌，不复用其他日期的记录。缓存正常时24小时内无需再次下载同月数据；失败后30分钟退避。每1800秒由 Stash 调度刷新，跨日后下次刷新更新，实际时间由客户端控制。无额外 cron、无 MITM、不修改分流规则、无 API Key。

安装 `HuangliQuery.stoverride`，使用 Stash 原生内嵌 payload（iOS/tvOS 3.2.5+）；保留独立源文件供维护。模拟测试：`node Stash/Tile/HuangliQuery/test_HuangliQuery.mjs`。已用2026-11-27两份真实月度数据回放。实际手机多行文字显示和调度尚需验证。

参考：https://stash.wiki/script/tile 、https://stash.wiki/script/syntax-and-interface 、https://stash.wiki/script/manage-script
