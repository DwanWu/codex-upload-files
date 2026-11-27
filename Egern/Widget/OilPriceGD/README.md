# 广东油价组件 v2.0

- 92/95：广东省最高零售限价；98：第三方参考价，缺失时标记旧日期，不推算。
- 以北京时间计算执行日和调价窗口。国家发改委明确不作调整且上一轮已确认时才沿用价格。
- 优先读取 GitHub prices.json；无效/过期或缺失时按退避间隔查询公告及参考源，使用 Egern 持久化缓存和内置快照。
- 服务端每两小时检查、北京时间18:37/次日00:37补查；仅有效价格周期、报价来源或下轮日期变化时提交。价格周期无法核验时保留旧油价；已确认的官方调价、暂停公告及新年度节假日数据可以独立发布。
- 调价窗口：2026年内置窗口、2027年官方放假调休安排（[国办发明电〔2026〕10号](https://www.gov.cn/zhengce/content/202611/content_7085101.htm)）、每10个工作日滚动预计。国家发展改革委公告优先纠偏；暂停或延迟公告停止倒计时，待新的官方周期恢复。没有全年官方调价日历时，推算结果标明“预计”，已过窗口不盲目顺延。
- 2028年起服务端尝试从国务院政策文件库检索当前年份及10月起的下一年度节假日通知，校验官方链接、文号、七项节日及日期跨度；通过才保存至 prices.json。检索接口或网页格式变化时保留已校验缓存；没有年度数据且第三方不能交叉验证时显示待公布。此检索接口为尽力支持，不保证持续可用。
- 缓存保持 Schema 3 和原有 OilPriceGD.v3 键；新字段 calendarNotice、calendarHint（毫秒时间戳及冲突墓碑）、holidayYears 向后兼容。旧日期字段不凌驾于公告或规则。iOS刷新实际由 WidgetKit 调度，系统可能延迟刷新。
- 不调用Cloudflare，无第三方运行时依赖，无API Key。GitHub Actions可能因网络、调度或站点结构变化失败。
- 手动运行 Actions / Sync Guangdong oil price data；查看失败日志。组件订阅地址不变。
- 回归测试：`node scripts/test_oil_price.mjs`；同步：`node scripts/sync_oil_price.mjs`。
- 2026-11-27初始价格来源：[广东省发改委公告转载](https://m.bendibao.com/show783326.html)、[国家发改委](https://www.ndrc.gov.cn/xwdt/xwfb/202611/t20261126_1409082.html)、[搜油价](https://www.soyoujia.cn/)、[小熊油耗](https://www.xiaoxiongyouhao.com/fprice/proilprice.php?province=%E5%B9%BF%E4%B8%9C%E7%9C%81)。历史参考来自油价通。数据非个别加油站成交价。
