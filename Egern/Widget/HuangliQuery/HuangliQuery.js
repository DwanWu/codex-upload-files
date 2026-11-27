/**
 * 黄历查询 Widget v2.0
 * 黄色日历图标 · 公历/农历 · 宜忌 · 干支 · 节气/节日
 * 双远程源：zqzess/openApiData + xuqssq/calendar。
 * 双源均失败时使用 Intl 中国农历做本地基础兜底。
 */


const CAL_KEY="HuangliQuery.v2",DAY=86400000;
// Generated from the validated upstream calendar. Exact-date offline fallback.
const BUNDLED_CALENDAR = {"2026-11-01":{"lMonth":"九","lDate":"廿三","gzYear":"丙午","gzMonth":"戊戌","gzDate":"己卯","animal":"马","suit":"结婚 出行 搬家 合婚订婚 搬新房 订盟 祈福 安床 纳畜 安葬 祭祀 起基 安香 除虫 出火 开光 纳婿 求子 上梁 竖柱 造庙 斋醮","avoid":"开业 合寿木 掘井 破土","festivalList":"万圣节","term":"","jiri":true,"details":{"constellation":"天蝎座","pengzu":"己不破券二比并亡，卯不穿井水泉不香","fetus":"占门厕外正南","star":"张宿（张月鹿）","chong":"鸡 （癸酉）","sha":"西","twelve":"执执位","season":"秋季","dayWuxing":"城墙土","jieqi":"霜降 第10天 （距下一个节气“立冬”，还有6天）"}},"2026-11-02":{"lMonth":"九","lDate":"廿四","gzYear":"丙午","gzMonth":"戊戌","gzDate":"庚辰","animal":"马","suit":"打扫 沐浴 破屋 祭祀 馀事勿取 坏垣","avoid":"结婚 开业","festivalList":"","term":"","jiri":false,"details":{"constellation":"天蝎座","pengzu":"庚不经络织机虚张，辰不哭泣必主重丧","fetus":"碓磨栖外正西","star":"翼宿（翼火蛇）","chong":"狗 （甲戌）","sha":"南","twelve":"破执位","season":"秋季","dayWuxing":"白腊金","jieqi":"霜降 第11天 （距下一个节气“立冬”，还有5天）"}},"2026-11-03":{"lMonth":"九","lDate":"廿五","gzYear":"丙午","gzMonth":"戊戌","gzDate":"辛巳","animal":"马","suit":"会亲友 合婚订婚 签订合同 交易 纳财 订盟 栽种 纳畜 牧养","avoid":"结婚 搬新房 开业 祈福 安葬","festivalList":"","term":"","jiri":false,"details":{"constellation":"天蝎座","pengzu":"辛不合酱主人不尝，已不远行财物伏藏","fetus":"厨灶床外正西","star":"轸宿（轸水蚓）","chong":"猪 （乙亥）","sha":"东","twelve":"危执位","season":"秋季","dayWuxing":"白腊金","jieqi":"霜降 第12天 （距下一个节气“立冬”，还有4天）"}},"2026-11-04":{"lMonth":"九","lDate":"廿六","gzYear":"丙午","gzMonth":"戊戌","gzDate":"壬午","animal":"马","suit":"结婚 会亲友 出行 搬家 合婚订婚 签订合同 搬新房 开业 订盟 造车器 安葬 祭祀 破土","avoid":"盖屋 架马 合寿木 开光 上梁","festivalList":"","term":"","jiri":true,"details":{"constellation":"天蝎座","pengzu":"壬不汲水更难提防，午不苫盖屋主更张","fetus":"仓库碓外西北","star":"角宿（角木蛟）","chong":"鼠 （丙子）","sha":"北","twelve":"成执位","season":"秋季","dayWuxing":"杨柳木","jieqi":"霜降 第13天 （距下一个节气“立冬”，还有3天）"}},"2026-11-05":{"lMonth":"九","lDate":"廿七","gzYear":"丙午","gzMonth":"戊戌","gzDate":"癸未","animal":"马","suit":"纳财 祭祀 作灶 馀事勿取 除虫 打猎","avoid":"开业 动土 安葬 破土","festivalList":"","term":"","jiri":false,"details":{"constellation":"天蝎座","pengzu":"癸不词讼理弱敌强，未不服药毒气入肠","fetus":"房床厕外西北","star":"亢宿（亢金龙）","chong":"牛 （丁丑）","sha":"西","twelve":"收执位","season":"秋季","dayWuxing":"杨柳木","jieqi":"霜降 第14天 （距下一个节气“立冬”，还有2天）"}},"2026-11-06":{"lMonth":"九","lDate":"廿八","gzYear":"丙午","gzMonth":"戊戌","gzDate":"甲申","animal":"马","suit":"无","avoid":"大事勿用 结婚 动手术 搬家 开工开业 建房 出行上任 安葬","festivalList":"","term":"","jiri":false,"details":{"constellation":"天蝎座","pengzu":"甲不开仓财物耗散，申不安床鬼��入房","fetus":"占门炉外西北","star":"氐宿（氐土貉）","chong":"虎 （戊寅）","sha":"南","twelve":"开执位","season":"秋季","dayWuxing":"泉中水","jieqi":"霜降 第15天 （距下一个节气“立冬”，还有1天）"}},"2026-11-07":{"lMonth":"九","lDate":"廿九","gzYear":"丙午","gzMonth":"己亥","gzDate":"乙酉","animal":"马","suit":"打扫","avoid":"馀事勿取","festivalList":"","term":"立冬","jiri":false,"details":{"constellation":"天蝎座","pengzu":"乙不栽植千株不长，酉不宴客醉坐颠狂","fetus":"碓磨门外西北","star":"房宿（房日兔）","chong":"兔 （己卯）","sha":"东","twelve":"开执位","season":"冬季","dayWuxing":"泉中水","jieqi":"立冬 第1天 （距下一个节气“小雪”，还有15天）"}},"2026-11-08":{"lMonth":"九","lDate":"三十","gzYear":"丙午","gzMonth":"己亥","gzDate":"丙戌","animal":"马","suit":"安床 祭祀 入殓 移柩 补垣 开池 破土 迁坟","avoid":"结婚 搬家 搬新房 开业 作灶 出火 收养子女 掘井 开光","festivalList":"记者节 · 中国记者日 · 药师琉璃光佛圣诞","term":"","jiri":false,"details":{"constellation":"天蝎座","pengzu":"丙不修灶必见灾殃，戌不吃犬作怪上床","fetus":"厨灶栖外西北","star":"心宿（心月狐）","chong":"龙 （庚辰）","sha":"北","twelve":"闭执位","season":"冬季","dayWuxing":"屋上土","jieqi":"立冬 第2天 （距下一个节气“小雪”，还有14天）"}},"2026-11-09":{"lMonth":"十","lDate":"初一","gzYear":"丙午","gzMonth":"己亥","gzDate":"丁亥","animal":"马","suit":"沐浴 祭祀","avoid":"馀事勿取","festivalList":"寒衣节 · 消防宣传日","term":"","jiri":false,"details":{"constellation":"天蝎座","pengzu":"丁不剃头头必生疮，亥不嫁娶不利新郎","fetus":"仓库床外西北","star":"心宿（心月狐）","chong":"蛇 （辛巳）","sha":"西","twelve":"建执位","season":"冬季","dayWuxing":"屋上土","jieqi":"立冬 第3天 （距下一个节气“小雪”，还有13天）"}},"2026-11-10":{"lMonth":"十","lDate":"初二","gzYear":"丙午","gzMonth":"己亥","gzDate":"戊子","animal":"马","suit":"结婚 出行 打扫 搬家 搬新房 动土 栽种 纳畜 安葬 修造 拆卸 成服 出火 除服 收养子女 掘井 开光","avoid":"买房 安床","festivalList":"","term":"","jiri":false,"details":{"constellation":"天蝎座","pengzu":"戊不受田田主不祥，子不问卜自惹祸殃","fetus":"房床碓外正北","star":"尾宿（尾火虎）","chong":"马 （壬午）","sha":"南","twelve":"除执位","season":"冬季","dayWuxing":"霹雷火","jieqi":"立冬 第4天 （距下一个节气“小雪”，还有12天）"}},"2026-11-11":{"lMonth":"十","lDate":"初三","gzYear":"丙午","gzMonth":"己亥","gzDate":"己丑","animal":"马","suit":"会亲友 理发 买衣服 安床 安门 结网 开光","avoid":"结婚 出行 搬家 搬新房 动土 祈福 栽种 安葬 成人礼 出火 伐木 上梁","festivalList":"光棍节 · 双十一购物狂欢节","term":"","jiri":false,"details":{"constellation":"天蝎座","pengzu":"己不破券二比并亡，丑不冠带主不还乡","fetus":"占门厕外正北","star":"箕宿（箕水豹）","chong":"羊 （癸未）","sha":"东","twelve":"满执位","season":"冬季","dayWuxing":"霹雷火","jieqi":"立冬 第5天 （距下一个节气“小雪”，还有11天）"}},"2026-11-12":{"lMonth":"十","lDate":"初四","gzYear":"丙午","gzMonth":"己亥","gzDate":"庚寅","animal":"马","suit":"结婚 出行 搬家 签订合同 交易 搬新房 开业 动土 栽种 安床 修造 拆卸 出火 开光 上梁","avoid":"祈福 祭祀 作灶 伐木 掘井 谢土","festivalList":"吉尼斯世界纪录日 · 国际宽容日 · 孙中山诞辰纪念日","term":"","jiri":true,"details":{"constellation":"天蝎座","pengzu":"庚不经络织机虚张，寅不祭祀神鬼不尝","fetus":"碓磨炉外正北","star":"斗宿（斗木獬）","chong":"猴 （甲申）","sha":"北","twelve":"平执位","season":"冬季","dayWuxing":"松柏木","jieqi":"立冬 第6天 （距下一个节气“小雪”，还有10天）"}},"2026-11-13":{"lMonth":"十","lDate":"初五","gzYear":"丙午","gzMonth":"己亥","gzDate":"辛卯","animal":"马","suit":"结婚 出行 搬家 签订合同 交易 搬新房 开业 祈福 安床 安葬 挂匾 祭祀 拆卸 出火 伐木 开光 求子","avoid":"买房 栽种 掘井","festivalList":"","term":"","jiri":true,"details":{"constellation":"天蝎座","pengzu":"辛不合酱主人不尝，卯不穿井水泉不香","fetus":"厨灶门外正北","star":"女宿（女土蝠）","chong":"鸡 （乙酉）","sha":"西","twelve":"定执位","season":"冬季","dayWuxing":"松柏木","jieqi":"立冬 第7天 （距下一个节气“小雪”，还有9天）"}},"2026-11-14":{"lMonth":"十","lDate":"初六","gzYear":"丙午","gzMonth":"己亥","gzDate":"壬辰","animal":"马","suit":"打扫 美甲浴足 理发 祭祀 收养子女 针灸","avoid":"结婚 出行 搬家 搬新房 开业 动土 安葬 修造 作灶 掘井 开池 破土 上梁 造船","festivalList":"世界糖尿病日 · 联合国糖尿病日 · 屌丝节","term":"","jiri":false,"details":{"constellation":"天蝎座","pengzu":"壬不汲水更难提防，辰不哭泣必主重丧","fetus":"仓库栖外正北","star":"虚宿（虚日鼠）","chong":"狗 （丙戌）","sha":"南","twelve":"执执位","season":"冬季","dayWuxing":"常流水","jieqi":"立冬 第8天 （距下一个节气“小雪”，还有8天）"}},"2026-11-15":{"lMonth":"十","lDate":"初七","gzYear":"丙午","gzMonth":"己亥","gzDate":"癸巳","animal":"马","suit":"破屋 求医 治病 馀事勿取 坏垣","avoid":"结婚 安葬","festivalList":"","term":"","jiri":false,"details":{"constellation":"天蝎座","pengzu":"癸不词讼理弱敌强，已不远行财物伏藏","fetus":"占房床房内北","star":"危宿（危月燕）","chong":"猪 （丁亥）","sha":"东","twelve":"破执位","season":"冬季","dayWuxing":"常流水","jieqi":"立冬 第9天 （距下一个节气“小雪”，还有7天）"}},"2026-11-16":{"lMonth":"十","lDate":"初八","gzYear":"丙午","gzMonth":"己亥","gzDate":"甲午","animal":"马","suit":"结婚 会亲友 出行 打扫 搬家 求职入学 合婚订婚 搬新房 纳财 开业 订盟 动土 祈福 安床 安门 祭祀 牧养 修造 造畜稠 起基 雕刻 开池 造庙","avoid":"出货财 开仓 盖屋 上梁 造船","festivalList":"","term":"","jiri":true,"details":{"constellation":"天蝎座","pengzu":"甲不开仓财物耗散，午不苫盖屋主更张","fetus":"占门碓房内北","star":"室宿（室火猪）","chong":"鼠 （戊子）","sha":"北","twelve":"危执位","season":"冬季","dayWuxing":"沙中金","jieqi":"立冬 第10天 （距下一个节气“小雪”，还有6天）"}},"2026-11-17":{"lMonth":"十","lDate":"初九","gzYear":"丙午","gzMonth":"己亥","gzDate":"乙未","animal":"马","suit":"打扫 祈福 栽种 纳畜 安葬 祭祀 修造 拆卸 修坟 伐木 开光 立碑 求子","avoid":"结婚 出行 搬家 搬新房 出火 收养子女","festivalList":"学生日 · 国际大学生节","term":"","jiri":false,"details":{"constellation":"天蝎座","pengzu":"乙不栽植千株不长，未不服药毒气入肠","fetus":"碓磨厕房内北","star":"壁宿（壁水獝）","chong":"牛 （己丑）","sha":"西","twelve":"成执位","season":"冬季","dayWuxing":"沙中金","jieqi":"立冬 第11天 （距下一个节气“小雪”，还有5天）"}},"2026-11-18":{"lMonth":"十","lDate":"初十","gzYear":"丙午","gzMonth":"己亥","gzDate":"丙申","animal":"马","suit":"打扫 房屋清洁 沐浴 馀事勿取 除虫 塞穴 打猎","avoid":"结婚 搬新房 开业 安床 修坟 破土","festivalList":"","term":"","jiri":false,"details":{"constellation":"天蝎座","pengzu":"丙不修灶必见灾殃，申不安床鬼祟入房","fetus":"厨灶炉房内北","star":"奎宿（奎木狼）","chong":"虎 （庚寅）","sha":"南","twelve":"收执位","season":"冬季","dayWuxing":"山下火","jieqi":"立冬 第12天 （距下一个节气“小雪”，还有4天）"}},"2026-11-19":{"lMonth":"十","lDate":"十一","gzYear":"丙午","gzMonth":"己亥","gzDate":"丁酉","animal":"马","suit":"结婚 出行 打扫 签订合同 交易 开业 动土 祈福 挂匾 祭祀 拆卸 成人礼 开光 破土 求子 斋醮","avoid":"会亲友 理发 搬新房 安葬 安门 修造 作灶 入殓 伐木 上梁","festivalList":"世界厕所日","term":"","jiri":true,"details":{"constellation":"天蝎座","pengzu":"丁不剃头头必生疮，酉不宴客醉坐颠狂","fetus":"仓库门房内北","star":"娄宿（娄金狗）","chong":"兔 （辛卯）","sha":"东","twelve":"开执位","season":"冬季","dayWuxing":"山下火","jieqi":"立冬 第13天 （距下一个节气“小雪”，还有3天）"}},"2026-11-20":{"lMonth":"十","lDate":"十二","gzYear":"丙午","gzMonth":"己亥","gzDate":"戊戌","animal":"马","suit":"结婚 买衣服 安床 造畜稠 入殓 移柩 破土 合帐","avoid":"买房 作灶 掘井 开光 造船","festivalList":"世界儿童日","term":"","jiri":false,"details":{"constellation":"天蝎座","pengzu":"戊不受田田主不祥，戌不吃犬作怪上床","fetus":"房床栖房内南","star":"胃宿（胃土雉）","chong":"龙 （壬辰）","sha":"北","twelve":"闭执位","season":"冬季","dayWuxing":"平地木","jieqi":"立冬 第14天 （距下一个节气“小雪”，还有2天）"}},"2026-11-21":{"lMonth":"十","lDate":"十三","gzYear":"丙午","gzMonth":"己亥","gzDate":"己亥","animal":"马","suit":"出行 打扫 装修 成人礼 馀事勿取","avoid":"结婚 开业 动土 安葬 破土","festivalList":"世界电视日 · 世界问候日","term":"","jiri":false,"details":{"constellation":"天蝎座","pengzu":"己不破券二比并亡，亥不嫁娶不利新郎","fetus":"占门床房内南","star":"昴宿（昴日鸡）","chong":"蛇 （癸巳）","sha":"西","twelve":"建执位","season":"冬季","dayWuxing":"平地木","jieqi":"立冬 第15天 （距下一个节气“小雪”，还有1天）"}},"2026-11-22":{"lMonth":"十","lDate":"十四","gzYear":"丙午","gzMonth":"己亥","gzDate":"庚子","animal":"马","suit":"结婚 会亲友 出行 打扫 搬家 合婚订婚 签订合同 搬新房 开业 订盟 动土 祈福 栽种 盖屋 安葬 安门 挂匾 祭祀 求医 修造 治病 起基 收养子女 开光 求子","avoid":"买车 安床 作灶","festivalList":"","term":"小雪","jiri":true,"details":{"constellation":"天蝎座","pengzu":"庚不经络织机虚张，子不问卜自惹祸殃","fetus":"占碓磨房内南","star":"毕宿（毕月乌）","chong":"马 （甲午）","sha":"南","twelve":"除执位","season":"冬季","dayWuxing":"壁上土","jieqi":"小雪 第1天 （距下一个节气“大雪”，还有15天）"}},"2026-11-23":{"lMonth":"十","lDate":"十五","gzYear":"丙午","gzMonth":"己亥","gzDate":"辛丑","animal":"马","suit":"会亲友 理发 祭祀 牧养 造畜稠 结网 开池 塑绘 打猎","avoid":"结婚 出行 搬新房 开业 动土 祈福 安葬 作灶 上梁 谢土","festivalList":"下元节","term":"","jiri":false,"details":{"constellation":"射手座","pengzu":"辛不合酱主人不尝，丑不冠带主不还乡","fetus":"厨灶厕房内南","star":"觜宿（觜火猴）","chong":"羊 （乙未）","sha":"东","twelve":"满执位","season":"冬季","dayWuxing":"壁上土","jieqi":"小雪 第2天 （距下一个节气“大雪”，还有14天）"}},"2026-11-24":{"lMonth":"十","lDate":"十六","gzYear":"丙午","gzMonth":"己亥","gzDate":"壬寅","animal":"马","suit":"会亲友 出行 搬家 签订合同 交易 装修 搬新房 纳财 开业 出货财 买衣服 动土 买车 拆卸 安香 收养子女 铺路","avoid":"安葬 作灶 修坟 行丧 探病 伐木 谢土 造庙 作梁","festivalList":"","term":"","jiri":true,"details":{"constellation":"射手座","pengzu":"壬不汲水更难提防，寅不祭祀神鬼不尝","fetus":"仓库炉房内南","star":"参宿（参水猿）","chong":"猴 （丙申）","sha":"北","twelve":"平执位","season":"冬季","dayWuxing":"金箔金","jieqi":"小雪 第3天 （距下一个节气“大雪”，还有13天）"}},"2026-11-25":{"lMonth":"十","lDate":"十七","gzYear":"丙午","gzMonth":"己亥","gzDate":"癸卯","animal":"马","suit":"结婚 出行 搬家 合婚订婚 签订合同 交易 纳财 订盟 动土 祈福 安床 安葬 祭祀 修造 拆卸 安香 成服 出火 除服 收养子女 开光 斋醮","avoid":"买房 诉讼 栽种 掘井","festivalList":"国际消除对妇女的暴力日","term":"","jiri":true,"details":{"constellation":"射手座","pengzu":"癸不词讼理弱敌强，卯不穿井水泉不香","fetus":"房床门房内南","star":"井宿（井木犴）","chong":"鸡 （丁酉）","sha":"西","twelve":"定执位","season":"冬季","dayWuxing":"金箔金","jieqi":"小雪 第4天 （距下一个节气“大雪”，还有12天）"}},"2026-11-26":{"lMonth":"十","lDate":"十八","gzYear":"丙午","gzMonth":"己亥","gzDate":"甲辰","animal":"马","suit":"结婚 出行 打扫 搬家 合婚订婚 搬新房 订盟 栽种 安葬 祭祀 修造 拆卸 入殓 出火 伐木 开光","avoid":"交易 开业 动土 安门 作灶 破土","festivalList":"感恩节","term":"","jiri":false,"details":{"constellation":"射手座","pengzu":"甲不开仓财物耗散，辰不哭泣必主重丧","fetus":"门鸡栖房内东","star":"鬼宿（鬼金羊）","chong":"狗 （戊戌）","sha":"南","twelve":"执执位","season":"冬季","dayWuxing":"覆灯火","jieqi":"小雪 第5天 （距下一个节气“大雪”，还有11天）"}},"2026-11-27":{"lMonth":"十","lDate":"十九","gzYear":"丙午","gzMonth":"己亥","gzDate":"乙巳","animal":"马","suit":"打扫 破屋 祭祀 求医 治病 馀事勿取 坏垣","avoid":"结婚 安葬","festivalList":"","term":"","jiri":false,"details":{"constellation":"射手座","pengzu":"乙不栽植千株不长，已不远行财物伏藏","fetus":"碓磨床房内东","star":"柳宿（柳土獐）","chong":"猪 （己亥）","sha":"东","twelve":"破执位","season":"冬季","dayWuxing":"覆灯火","jieqi":"小雪 第6天 （距下一个节气“大雪”，还有10天）"}},"2026-11-28":{"lMonth":"十","lDate":"二十","gzYear":"丙午","gzMonth":"己亥","gzDate":"丙午","animal":"马","suit":"房屋清洁 安葬 入殓 移柩 馀事勿取 成服 除服 立碑 破土 迁坟","avoid":"结婚 搬新房 动土 祭祀 修造","festivalList":"","term":"","jiri":false,"details":{"constellation":"射手座","pengzu":"丙不修灶必见灾殃，午不苫盖屋主更张","fetus":"厨灶碓房内东","star":"星宿（星日马）","chong":"鼠 （庚子）","sha":"北","twelve":"危执位","season":"冬季","dayWuxing":"天河水","jieqi":"小雪 第7天 （距下一个节气“大雪”，还有9天）"}},"2026-11-29":{"lMonth":"十","lDate":"廿一","gzYear":"丙午","gzMonth":"己亥","gzDate":"丁未","animal":"马","suit":"会亲友 合婚订婚 订盟 动土 祈福 安机械 安葬 祭祀 修造 破土","avoid":"结婚 搬家 搬新房 开业 出火","festivalList":"国际声援巴勒斯坦人民日","term":"","jiri":false,"details":{"constellation":"射手座","pengzu":"丁不剃头头必生疮，未不服药毒气入肠","fetus":"仓库厕房内东","star":"张宿（张月鹿）","chong":"牛 （辛丑）","sha":"西","twelve":"成执位","season":"冬季","dayWuxing":"天河水","jieqi":"小雪 第8天 （距下一个节气“大雪”，还有8天）"}},"2026-11-30":{"lMonth":"十","lDate":"廿二","gzYear":"丙午","gzMonth":"己亥","gzDate":"戊申","animal":"马","suit":"房屋清洁 沐浴 祭祀 除虫 结网 打猎","avoid":"结婚 合婚订婚 订盟 动土 安床 安葬 破土","festivalList":"","term":"","jiri":false,"details":{"constellation":"射手座","pengzu":"戊不受田田主不祥，申不安床鬼祟入房","fetus":"房床炉房内东","star":"翼宿（翼火蛇）","chong":"虎 （壬寅）","sha":"南","twelve":"收执位","season":"冬季","dayWuxing":"大驿土","jieqi":"小雪 第9天 （距下一个节气“大雪”，还有7天）"}},"2026-12-01":{"lMonth":"十","lDate":"廿三","gzYear":"丙午","gzMonth":"己亥","gzDate":"己酉","animal":"马","suit":"出行 求职入学 买房 纳财 开业 动土 祈福 栽种 纳畜 祭祀 牧养 拆卸 起基 问名 掘井 开渠 破土 迁坟 求子 斋醮 定磉","avoid":"搬家 搬新房 安葬 入殓 出火","festivalList":"艾滋病日 · 世界艾滋病日","term":"","jiri":false,"details":{"constellation":"射手座","pengzu":"己不破券二比并亡，酉不宴客醉坐颠狂","fetus":"占大门外东北","star":"轸宿（轸水蚓）","chong":"兔 （癸卯）","sha":"东","twelve":"开执位","season":"冬季","dayWuxing":"大驿土","jieqi":"小雪 第10天 （距下一个节气“大雪”，还有6天）"}},"2026-12-02":{"lMonth":"十","lDate":"廿四","gzYear":"丙午","gzMonth":"己亥","gzDate":"庚戌","animal":"马","suit":"理发 买房 安葬 祭祀 入殓 移柩 成服 除服 破土 塞穴","avoid":"结婚 搬新房 安床 掘井 开光","festivalList":"全国交通安全日 · 废除奴隶制国际日","term":"","jiri":false,"details":{"constellation":"射手座","pengzu":"庚不经络织机虚张，戌不吃犬作怪上床","fetus":"碓磨栖外东北","star":"角宿（角木蛟）","chong":"龙 （甲辰）","sha":"北","twelve":"闭执位","season":"冬季","dayWuxing":"钗钏金","jieqi":"小雪 第11天 （距下一个节气“大雪”，还有5天）"}},"2026-12-03":{"lMonth":"十","lDate":"廿五","gzYear":"丙午","gzMonth":"己亥","gzDate":"辛亥","animal":"马","suit":"出行 沐浴 祭祀 馀事勿取","avoid":"开业 动土 安葬 行丧 破土","festivalList":"国际残疾人日","term":"","jiri":true,"details":{"constellation":"射手座","pengzu":"辛不合酱主人不尝，亥不嫁娶不利新郎","fetus":"厨灶床外东北","star":"亢宿（亢金龙）","chong":"蛇 （乙巳）","sha":"西","twelve":"建执位","season":"冬季","dayWuxing":"钗钏金","jieqi":"小雪 第12天 （距下一个节气“大雪”，还有4天）"}},"2026-12-04":{"lMonth":"十","lDate":"廿六","gzYear":"丙午","gzMonth":"己亥","gzDate":"壬子","animal":"马","suit":"结婚 会亲友 出行 房屋清洁 搬家 理发 搬新房 动土 栽种 造车器 盖屋 归岫 安门 修造 造畜稠 拆卸 起基 安香 出火 雕刻 合嵴 开光","avoid":"合婚订婚 开业 安床 安葬 开渠 造庙","festivalList":"宪法日 · 全国法制宣传日 · 国家宪法日","term":"","jiri":false,"details":{"constellation":"射手座","pengzu":"壬不汲水更难提防，子不问卜自惹祸殃","fetus":"仓库碓外东北","star":"氐宿（氐土貉）","chong":"马 （丙午）","sha":"南","twelve":"除执位","season":"冬季","dayWuxing":"桑松木","jieqi":"小雪 第13天 （距下一个节气“大雪”，还有3天）"}},"2026-12-05":{"lMonth":"十","lDate":"廿七","gzYear":"丙午","gzMonth":"己亥","gzDate":"癸丑","animal":"马","suit":"会亲友 买衣服 买车 安机械 结网 塞穴 塑绘","avoid":"结婚 开业 祈福 安葬 斋醮","festivalList":"国际志愿人员日 · 世界弱能人士日","term":"","jiri":false,"details":{"constellation":"射手座","pengzu":"癸不词讼理弱敌强，丑不冠带主不还乡","fetus":"房床厕外东北","star":"房宿（房日兔）","chong":"羊 （丁未）","sha":"东","twelve":"满执位","season":"冬季","dayWuxing":"桑松木","jieqi":"小雪 第14天 （距下一个节气“大雪”，还有2天）"}},"2026-12-06":{"lMonth":"十","lDate":"廿八","gzYear":"丙午","gzMonth":"己亥","gzDate":"甲寅","animal":"马","suit":"会亲友 出行 搬家 合婚订婚 签订合同 交易 装修 搬新房 纳财 开业 动土 开厕 修造 起基 安香 出火 开池 铺路 竖柱 造庙 定磉","avoid":"开仓 盖屋 祭祀 造桥","festivalList":"","term":"","jiri":true,"details":{"constellation":"射手座","pengzu":"甲不开仓财物耗散，寅不祭祀神鬼不尝","fetus":"占门炉外东北","star":"心宿（心月狐）","chong":"猴 （戊申）","sha":"北","twelve":"平执位","season":"冬季","dayWuxing":"大溪水","jieqi":"小雪 第15天 （距下一个节气“大雪”，还有1天）"}},"2026-12-07":{"lMonth":"十","lDate":"廿九","gzYear":"丙午","gzMonth":"庚子","gzDate":"乙卯","animal":"马","suit":"装修 祭祀 馀事勿取","avoid":"诸事不宜","festivalList":"国际民航日","term":"大雪","jiri":false,"details":{"constellation":"射手座","pengzu":"乙不栽植千株不长，卯不穿井水泉不香","fetus":"碓磨门外正东","star":"尾宿（尾火虎）","chong":"鸡 （己酉）","sha":"西","twelve":"平执位","season":"冬季","dayWuxing":"大溪水","jieqi":"大雪 第1天 （距下一个节气“冬至”，还有15天）"}},"2026-12-08":{"lMonth":"十","lDate":"三十","gzYear":"丙午","gzMonth":"庚子","gzDate":"丙辰","animal":"马","suit":"搬新房 动土 安床 纳畜 安葬 挂匾 祭祀 拆卸 入殓 出火 开光 破土","avoid":"结婚 买房 开业 作灶 伐木 作梁","festivalList":"","term":"","jiri":false,"details":{"constellation":"射手座","pengzu":"丙不修灶必见灾殃，辰不哭泣必主重丧","fetus":"厨灶栖外正东","star":"箕宿（箕水豹）","chong":"狗 （庚戌）","sha":"南","twelve":"定执位","season":"冬季","dayWuxing":"沙中土","jieqi":"大雪 第2天 （距下一个节气“冬至”，还有14天）"}},"2026-12-09":{"lMonth":"冬","lDate":"初一","gzYear":"丙午","gzMonth":"庚子","gzDate":"丁巳","animal":"马","suit":"打扫 祭祀 馀事勿取","avoid":"诸事不宜","festivalList":"世界足球日 · 国际反腐败日 · 一二 · 九运动纪念日","term":"","jiri":false,"details":{"constellation":"射手座","pengzu":"丁不剃头头必生疮，已不远行财物伏藏","fetus":"仓库床外正东","star":"斗宿（斗木獬）","chong":"猪 （辛亥）","sha":"东","twelve":"执执位","season":"冬季","dayWuxing":"沙中土","jieqi":"大雪 第3天 （距下一个节气“冬至”，还有13天）"}},"2026-12-10":{"lMonth":"冬","lDate":"初二","gzYear":"丙午","gzMonth":"庚子","gzDate":"戊午","animal":"马","suit":"沐浴 破屋 祭祀 馀事勿取 坏垣","avoid":"诸事不宜","festivalList":"世界人权日","term":"","jiri":false,"details":{"constellation":"射手座","pengzu":"戊不受田田主不祥，午不苫盖屋主更张","fetus":"房床碓外正东","star":"女宿（女土蝠）","chong":"鼠 （壬子）","sha":"北","twelve":"破执位","season":"冬季","dayWuxing":"天上火","jieqi":"大雪 第4天 （距下一个节气“冬至”，还有12天）"}},"2026-12-11":{"lMonth":"冬","lDate":"初三","gzYear":"丙午","gzMonth":"庚子","gzDate":"己未","animal":"马","suit":"动土 祈福 安床 架马 开厕 祭祀 入殓 成人礼 成服 除服 伐木 结网 开池 求子","avoid":"栽种 安门 治病 作灶","festivalList":"国际山岳日","term":"","jiri":false,"details":{"constellation":"射手座","pengzu":"己不破券二比并亡，未不服药毒气入肠","fetus":"占门厕外正东","star":"虚宿（虚日鼠）","chong":"牛 （癸丑）","sha":"西","twelve":"危执位","season":"冬季","dayWuxing":"天上火","jieqi":"大雪 第5天 （距下一个节气“冬至”，还有11天）"}},"2026-12-12":{"lMonth":"冬","lDate":"初四","gzYear":"丙午","gzMonth":"庚子","gzDate":"庚申","animal":"马","suit":"打扫 房屋清洁 馀事勿取","avoid":"诸事不宜","festivalList":"双十二购物狂欢节 · 西安事变纪念日","term":"","jiri":false,"details":{"constellation":"射手座","pengzu":"庚不经络织机虚张，申不安床鬼祟入房","fetus":"碓磨炉外东南","star":"危宿（危月燕）","chong":"虎 （甲寅）","sha":"南","twelve":"成执位","season":"冬季","dayWuxing":"石榴木","jieqi":"大雪 第6天 （距下一个节气“冬至”，还有10天）"}},"2026-12-13":{"lMonth":"冬","lDate":"初五","gzYear":"丙午","gzMonth":"庚子","gzDate":"辛酉","animal":"马","suit":"房屋清洁 美甲浴足 理发 安床 祭祀 作灶 教牛马 开光","avoid":"结婚 交易 开业 动土 纳畜 安葬 开生坟 伐木 破土 作梁","festivalList":"国家公祭日 · 国际儿童电视广播日","term":"","jiri":false,"details":{"constellation":"射手座","pengzu":"辛不合酱主人不尝，酉不宴客醉坐颠狂","fetus":"厨灶门外东南","star":"室宿（室火猪）","chong":"兔 （乙卯）","sha":"东","twelve":"收执位","season":"冬季","dayWuxing":"石榴木","jieqi":"大雪 第7天 （距下一个节气“冬至”，还有9天）"}},"2026-12-14":{"lMonth":"冬","lDate":"初六","gzYear":"丙午","gzMonth":"庚子","gzDate":"壬戌","animal":"马","suit":"买房 动土 祈福 栽种 安床 祭祀 修造 拆卸 开光 破土 求子 上梁","avoid":"结婚 出行 搬家 搬新房 赴任 安葬 入殓 收养子女 开渠","festivalList":"","term":"","jiri":true,"details":{"constellation":"射手座","pengzu":"壬不汲水更难提防，戌不吃犬作怪上床","fetus":"仓库栖外东南","star":"壁宿（壁水獝）","chong":"龙 （丙辰）","sha":"北","twelve":"开执位","season":"冬季","dayWuxing":"大海水","jieqi":"大雪 第8天 （距下一个节气“冬至”，还有8天）"}},"2026-12-15":{"lMonth":"冬","lDate":"初七","gzYear":"丙午","gzMonth":"庚子","gzDate":"癸亥","animal":"马","suit":"买衣服 沐浴 开厕 修造 成人礼 安装器具 补垣 断蚁 开柱眼 塞穴 筑堤 作梁","avoid":"结婚 搬家 搬新房 祈福 掘井 开光","festivalList":"强化免疫日 · 世界强化免疫日","term":"","jiri":false,"details":{"constellation":"射手座","pengzu":"癸不词讼理弱敌强，亥不嫁娶不利新郎","fetus":"占房床外东南","star":"奎宿（奎木狼）","chong":"蛇 （丁巳）","sha":"西","twelve":"闭执位","season":"冬季","dayWuxing":"大海水","jieqi":"大雪 第9天 （距下一个节气“冬至”，还有7天）"}},"2026-12-16":{"lMonth":"冬","lDate":"初八","gzYear":"丙午","gzMonth":"庚子","gzDate":"甲子","animal":"马","suit":"交易 沐浴 安葬 祭祀 入殓 修坟 除虫 成服 除服 收养子女 迁坟 谢土","avoid":"搬新房 动土 修造 破土 斋醮","festivalList":"","term":"","jiri":false,"details":{"constellation":"射手座","pengzu":"甲不开仓财物耗散，子不问卜自惹祸殃","fetus":"占门碓外东南","star":"娄宿（娄金狗）","chong":"马 （戊午）","sha":"南","twelve":"建执位","season":"冬季","dayWuxing":"海中金","jieqi":"大雪 第10天 （距下一个节气“冬至”，还有6天）"}},"2026-12-17":{"lMonth":"冬","lDate":"初九","gzYear":"丙午","gzMonth":"庚子","gzDate":"乙丑","animal":"马","suit":"结婚 出行 求职入学 合婚订婚 签订合同 交易 搬新房 订盟 动土 祈福 造车器 盖屋 归宁 安门 祭祀 求医 修造 治病 起基 安香 出火 上梁 竖柱 造庙","avoid":"安葬 行丧 伐木 斋醮 作梁","festivalList":"","term":"","jiri":true,"details":{"constellation":"射手座","pengzu":"乙不栽植千株不长，丑不冠带主不还乡","fetus":"碓磨厕外东南","star":"胃宿（胃土雉）","chong":"羊 （己未）","sha":"东","twelve":"除执位","season":"冬季","dayWuxing":"海中金","jieqi":"大雪 第11天 （距下一个节气“冬至”，还有5天）"}},"2026-12-18":{"lMonth":"冬","lDate":"初十","gzYear":"丙午","gzMonth":"庚子","gzDate":"丙寅","animal":"马","suit":"会亲友 出行 打扫 合婚订婚 签订合同 交易 开业 订盟 安床 安机械 盖屋 安葬 安门 拆卸 起基 入殓 修坟 移柩 成服 除服 伐木 立碑 铺路 迁坟 上梁 竖柱","avoid":"结婚 搬新房 动土 祈福 出火 破土","festivalList":"国际移徙者日","term":"","jiri":false,"details":{"constellation":"射手座","pengzu":"丙不修灶必见灾殃，寅不祭祀神鬼不尝","fetus":"厨灶炉外正南","star":"昴宿（昴日鸡）","chong":"猴 （庚申）","sha":"北","twelve":"满执位","season":"冬季","dayWuxing":"炉中火","jieqi":"大雪 第12天 （距下一个节气“冬至”，还有4天）"}},"2026-12-19":{"lMonth":"冬","lDate":"十一","gzYear":"丙午","gzMonth":"庚子","gzDate":"丁卯","animal":"马","suit":"安葬 祭祀 馀事勿取 成服 除服 铺路","avoid":"结婚 合婚订婚 搬新房 订盟 掘井","festivalList":"联合国南南合作日","term":"","jiri":false,"details":{"constellation":"射手座","pengzu":"丁不剃头头必生疮，卯不穿井水泉不香","fetus":"仓库门外正南","star":"毕宿（毕月乌）","chong":"鸡 （辛酉）","sha":"西","twelve":"平执位","season":"冬季","dayWuxing":"炉中火","jieqi":"大雪 第13天 （距下一个节气“冬至”，还有3天）"}},"2026-12-20":{"lMonth":"冬","lDate":"十二","gzYear":"丙午","gzMonth":"庚子","gzDate":"戊辰","animal":"马","suit":"会亲友 出行 搬家 合婚订婚 订盟 动土 祈福 安床 安机械 盖屋 安葬 安门 祭祀 修造 拆卸 起基 入殓 安香 出火 开光 破土 上梁 竖柱 造船 造桥 定磉","avoid":"买房 开业 掘井 造庙","festivalList":"澳门回归日","term":"","jiri":false,"details":{"constellation":"射手座","pengzu":"戊不受田田主不祥，辰不哭泣必主重丧","fetus":"房床栖外正南","star":"觜宿（觜火猴）","chong":"狗 （壬戌）","sha":"南","twelve":"定执位","season":"冬季","dayWuxing":"大林木","jieqi":"大雪 第14天 （距下一个节气“冬至”，还有2天）"}},"2026-12-21":{"lMonth":"冬","lDate":"十三","gzYear":"丙午","gzMonth":"庚子","gzDate":"己巳","animal":"马","suit":"无","avoid":"大事勿用 结婚 动手术 搬家 开工开业 建房 出行上任 安葬","festivalList":"国际篮球日","term":"","jiri":false,"details":{"constellation":"射手座","pengzu":"己不破券二比并亡，巳不远行财物伏藏","fetus":"占门床外正南","star":"参宿（参水猿）","chong":"猪 （癸亥）","sha":"东","twelve":"执执位","season":"冬季","dayWuxing":"大林木","jieqi":"大雪 第15天 （距下一个节气“冬至”，还有1天）"}},"2026-12-22":{"lMonth":"冬","lDate":"十四","gzYear":"丙午","gzMonth":"庚子","gzDate":"庚午","animal":"马","suit":"破屋 治病 馀事勿取 坏垣","avoid":"搬家 搬新房","festivalList":"一九天","term":"冬至","jiri":false,"details":{"constellation":"摩羯座","pengzu":"庚不经络织机虚张，午不苫盖屋主更张","fetus":"占碓磨外正南","star":"井宿（井木犴）","chong":"鼠 （甲子）","sha":"北","twelve":"破执位","season":"冬季","dayWuxing":"路旁土","jieqi":"冬至 第1天 （距下一个节气“小寒”，还有14天）"}},"2026-12-23":{"lMonth":"冬","lDate":"十五","gzYear":"丙午","gzMonth":"庚子","gzDate":"辛未","animal":"马","suit":"出行 理发 安床 架马 开厕 祭祀 入殓 修坟 移柩 成服 除服 伐木 开光 开柱眼 立碑 破土 迁坟 塑绘 作梁 打猎","avoid":"开业 安葬 安门 作灶 造桥","festivalList":"","term":"","jiri":false,"details":{"constellation":"摩羯座","pengzu":"辛不合酱主人不尝，未不服药毒气入肠","fetus":"厨灶厕外西南","star":"鬼宿（鬼金羊）","chong":"牛 （乙丑）","sha":"西","twelve":"危执位","season":"冬季","dayWuxing":"路旁土","jieqi":"冬至 第2天 （距下一个节气“小寒”，还有13天）"}},"2026-12-24":{"lMonth":"冬","lDate":"十六","gzYear":"丙午","gzMonth":"庚子","gzDate":"壬申","animal":"马","suit":"结婚 出行 打扫 搬家 搬新房 祈福 纳畜 祭祀 入殓 修坟 开光 立碑 求子","avoid":"动土 栽种 安床 伐木 破土 造桥 作梁","festivalList":"平安夜","term":"","jiri":true,"details":{"constellation":"摩羯座","pengzu":"壬不汲水更难提防，申不安床鬼祟入房","fetus":"仓库炉外西南","star":"柳宿（柳土獐）","chong":"虎 （丙寅）","sha":"南","twelve":"成执位","season":"冬季","dayWuxing":"剑锋金","jieqi":"冬至 第3天 （距下一个节气“小寒”，还有12天）"}},"2026-12-25":{"lMonth":"冬","lDate":"十七","gzYear":"丙午","gzMonth":"庚子","gzDate":"癸酉","animal":"马","suit":"房屋清洁 理发 纳财 栽种 沐浴 祭祀 除虫 结网 收养子女 打猎","avoid":"会亲友 搬家 搬新房 开业 安床 安葬 安门 作灶 行丧 出火","festivalList":"圣诞节 · 阿弥陀佛圣诞","term":"","jiri":false,"details":{"constellation":"摩羯座","pengzu":"癸不词讼理弱敌强，酉不宴客醉坐颠狂","fetus":"房床门外西南","star":"星宿（星日马）","chong":"兔 （丁卯）","sha":"东","twelve":"收执位","season":"冬季","dayWuxing":"剑锋金","jieqi":"冬至 第4天 （距下一个节气“小寒”，还有11天）"}},"2026-12-26":{"lMonth":"冬","lDate":"十八","gzYear":"丙午","gzMonth":"庚子","gzDate":"甲戌","animal":"马","suit":"打扫 合婚订婚 买房 订盟 动土 祈福 栽种 安床 纳畜 安门 祭祀 修造 造畜稠 拆卸 移柩 掘井 开池 立碑 破土 求子 上梁 竖柱 塑绘","avoid":"结婚 出行 搬家 搬新房 开业 赴任 安葬 入殓 出火 收养子女","festivalList":"毛泽东诞辰 · 毛泽东诞辰日 · 节礼日","term":"","jiri":false,"details":{"constellation":"摩羯座","pengzu":"甲不开仓财物耗散，戌不吃犬作怪上床","fetus":"门鸡栖外西南","star":"张宿（张月鹿）","chong":"龙 （戊辰）","sha":"北","twelve":"开执位","season":"冬季","dayWuxing":"山头火","jieqi":"冬至 第5天 （距下一个节气“小寒”，还有10天）"}},"2026-12-27":{"lMonth":"冬","lDate":"十九","gzYear":"丙午","gzMonth":"庚子","gzDate":"乙亥","animal":"马","suit":"出行 搬家 搬新房 动土 安门 修造 造仓 造畜稠 起基 补垣 收养子女 塞穴 上梁","avoid":"结婚 开业 祈福 栽种 安床 安葬 掘井 开光","festivalList":"日光菩萨圣诞","term":"","jiri":true,"details":{"constellation":"摩羯座","pengzu":"乙不栽植千株不长，亥不嫁娶不利新郎","fetus":"碓磨床外西南","star":"翼宿（翼火蛇）","chong":"蛇 （己巳）","sha":"西","twelve":"闭执位","season":"冬季","dayWuxing":"山头火","jieqi":"冬至 第6天 （距下一个节气“小寒”，还有9天）"}},"2026-12-28":{"lMonth":"冬","lDate":"二十","gzYear":"丙午","gzMonth":"庚子","gzDate":"丙子","animal":"马","suit":"造畜稠 教牛马","avoid":"结婚 房屋清洁 搬家 搬新房 动土 分居 作灶 安香 出火 掘井 造桥","festivalList":"","term":"","jiri":false,"details":{"constellation":"摩羯座","pengzu":"丙不修灶必见灾殃，子不问卜自惹祸殃","fetus":"厨灶碓外西南","star":"轸宿（轸水蚓）","chong":"马 （庚午）","sha":"南","twelve":"建执位","season":"冬季","dayWuxing":"涧下水","jieqi":"冬至 第7天 （距下一个节气“小寒”，还有8天）"}},"2026-12-29":{"lMonth":"冬","lDate":"廿一","gzYear":"丙午","gzMonth":"庚子","gzDate":"丁丑","animal":"马","suit":"会亲友 出行 搬家 合婚订婚 签订合同 交易 搬新房 开业 订盟 动土 祈福 栽种 安床 安机械 纳畜 造车器 盖屋 祭祀 修造 造畜稠 起基 安香 上梁","avoid":"安葬 开生坟 行丧 破土","festivalList":"","term":"","jiri":false,"details":{"constellation":"摩羯座","pengzu":"丁不剃头头必生疮，丑不冠带主不还乡","fetus":"仓库厕外西南","star":"角宿（角木蛟）","chong":"羊 （辛未）","sha":"东","twelve":"除执位","season":"冬季","dayWuxing":"涧下水","jieqi":"冬至 第8天 （距下一个节气“小寒”，还有7天）"}},"2026-12-30":{"lMonth":"冬","lDate":"廿二","gzYear":"丙午","gzMonth":"庚子","gzDate":"戊寅","animal":"马","suit":"会亲友 合婚订婚 订盟 栽种 安机械 纳畜 盖屋 安葬 修造 造畜稠 起基 入殓 修坟 移柩 开光 立碑 迁坟 上梁 竖柱 造桥","avoid":"结婚 搬新房 开业 动土 祈福 出火 破土","festivalList":"","term":"","jiri":false,"details":{"constellation":"摩羯座","pengzu":"戊不受田田主不祥，寅不祭祀神鬼不尝","fetus":"房床厕外正南","star":"亢宿（亢金龙）","chong":"猴 （壬申）","sha":"北","twelve":"满执位","season":"冬季","dayWuxing":"城墙土","jieqi":"冬至 第9天 （距下一个节气“小寒”，还有6天）"}},"2026-12-31":{"lMonth":"冬","lDate":"廿三","gzYear":"丙午","gzMonth":"庚子","gzDate":"己卯","animal":"马","suit":"祭祀 修坟 馀事勿取 成服 除服 铺路","avoid":"结婚 搬家 搬新房 安葬 掘井","festivalList":"二九天","term":"","jiri":false,"details":{"constellation":"摩羯座","pengzu":"己不破券二比并亡，卯不穿井水泉不香","fetus":"占门厕外正南","star":"氐宿（氐土貉）","chong":"鸡 （癸酉）","sha":"西","twelve":"平执位","season":"冬季","dayWuxing":"城墙土","jieqi":"冬至 第10天 （距下一个节气“小寒”，还有5天）"}}}; // BUNDLED_CALENDAR_END
function fullDay(d){return !!(d&&d.gzDate&&d.suit&&d.avoid)}
function decodeGitHubBase64(s){
  const abc="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let value=0,bits=0,out="";
  for(const c of s.replace(/\s+/g,"")){if(c==="=")break;const n=abc.indexOf(c);if(n<0)throw Error("invalid base64");value=(value<<6)|n;bits+=6;if(bits>=8){bits-=8;out+="%"+((value>>bits)&255).toString(16).padStart(2,"0")}}
  return decodeURIComponent(out);
}
function unwrapCalendar(body){
  const data=JSON.parse(body);
  if(data&&data.encoding==="base64"&&typeof data.content==="string")return JSON.parse(decodeGitHubBase64(data.content));
  return data;
}
function validDate(s){return typeof s==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s}
function lunarDayText(s){
  const v=String(s??"").trim(),n=/^\d{1,2}$/.test(v)?+v:null,z="一二三四五六七八九";
  return n===null?v:n===10?"初十":n===20?"二十":n===30?"三十":n>=1&&n<=9?"初"+z[n-1]:n>=11&&n<=19?"十"+z[n-11]:n>=21&&n<=29?"廿"+z[n-21]:"";
}
function lunarMonthText(v){return String(v??"").trim().replace(/月$/,"").replace(/^一$/,"正").replace(/^十一$/,"冬").replace(/^十二$/,"腊")}
function str(v){return typeof v==="string"?v.slice(0,1000):Array.isArray(v)?v.filter(x=>typeof x==="string").slice(0,40).join(" ").slice(0,1000):""}
function validCalendarDay(d){
  if(!d||typeof d!=="object")return null;
  const out={};for(const k of ["lMonth","lDate","gzYear","gzMonth","gzDate","animal","suit","avoid","festivalList","term"])out[k]=str(d[k]);
  out.lMonth=lunarMonthText(out.lMonth);out.lDate=lunarDayText(out.lDate);
  if(!/^(?:闰)?(?:正|[二三四五六七八九十]|冬|腊)$/.test(out.lMonth)||!/^(?:初[一二三四五六七八九十]|十[一二三四五六七八九]|二十|廿[一二三四五六七八九]|三十)$/.test(out.lDate))return null;
  for(const k of ["gzYear","gzMonth","gzDate"])if(!/^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]$/.test(out[k]))out[k]="";
  out.jiri=d.jiri===true;out.details={};
  for(const k of ["constellation","pengzu","fetus","star","chong","sha","twelve","season","dayWuxing","jieqi"])out.details[k]=str(d.details?.[k]);
  return out;
}
function readCache(raw,month,now){
  if(!raw||raw.month!==month)return {month,primary:null,secondary:null};
  const result={month,primary:null,secondary:null};
  for(const k of ["primary","secondary"]){
    const p=raw[k];if(!p||!Number.isFinite(p.checked)||p.checked>now||!p.days||typeof p.days!=="object")continue;
    const days={};for(const d of Object.keys(p.days).slice(0,31))if(validDate(d)&&d.startsWith(month+"-")){const v=validCalendarDay(p.days[d]);if(v)days[d]=v}
    result[k]={days,checked:p.checked,attempt:Number.isFinite(p.attempt)&&p.attempt<=now?p.attempt:p.checked};
  }
  return result;
}
export default async function(ctx,clock=Date.now(),options={}) {
  if(typeof clock!=="number"||!Number.isFinite(clock)||clock<0)clock=Date.now();
  options=options&&typeof options==="object"?options:{};
  const family = String(ctx.widgetFamily || 'systemMedium').toLowerCase();
  const isSmall = family.includes('small');
  const isLarge = family.includes('large');

  const C = {
    bg: [{ light: '#FFFFFF', dark: '#1C1C1E' }, { light: '#F8F7F2', dark: '#111113' }],
    main: { light: '#1C1C1E', dark: '#FFFFFF' },
    sub: { light: '#48484A', dark: '#D1D1D6' },
    muted: { light: '#8E8E93', dark: '#8E8E93' },
    gold: { light: '#D69E00', dark: '#FFD43B' },
    yi: { light: '#15803D', dark: '#4ADE80' },
    ji: { light: '#B91C1C', dark: '#F87171' },
    cyan: { light: '#0F766E', dark: '#5EEAD4' },
    divider: { light: '#E5E5EA', dark: '#38383A' },
    chip: { light: '#F2F2F7', dark: '#2C2C2E' }
  };

  const bg = { type: 'linear', colors: C.bg, startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 } };
  const text = (t, size, weight, color, opts = {}) => ({
    type: 'text', text: String(t ?? ''), font: { size, weight }, textColor: color, ...opts
  });
  const row = (children, gap = 5, opts = {}) => ({ type: 'stack', direction: 'row', alignItems: 'center', gap, children, ...opts });
  const col = (children, gap = 5, opts = {}) => ({ type: 'stack', direction: 'column', gap, children, ...opts });
  const icon = (name, color, size = 13) => ({ type: 'image', src: `sf-symbol:${name}`, color, width: size, height: size });
  const spacer = (length) => length == null ? { type: 'spacer' } : { type: 'spacer', length };
  const chip = (label, color) => ({
    type: 'stack', direction: 'row', padding: [3, 7, 3, 7], backgroundColor: C.chip,
    children: [text(label, 9, 'bold', color, { maxLines: 1 })]
  });

  const now=new Date(clock+8*3600000),Y=now.getUTCFullYear(),M=now.getUTCMonth()+1,D=now.getUTCDate();
  const WEEK="日一二三四五六"[now.getUTCDay()],P=n=>String(n).padStart(2,"0"),month=Y+"-"+P(M),dateKey=month+"-"+P(D);
  const midnight=Date.parse(dateKey+"T00:00:00+08:00")+DAY;
  let refreshAfter=new Date(Math.min(clock+3*3600000,midnight)).toISOString();

  const clean = s => str(s).replace(/[.。]+/g, ' ').replace(/\s+/g, ' ').trim();
  const normalizeList = s => clean(s).replace(/\s+/g, ' · ');

  const getJson=async (url,backup=false)=>{
    const r=await ctx.http.get(url,{headers:{"User-Agent":"Egern-HuangliQuery/2.0","Accept":backup?"application/vnd.github.raw+json":"application/json"},timeout:backup?10000:15000,credentials:"omit",insecureTls:false,redirect:"error"});
    if(r.status!==200)throw Error("HTTP "+r.status);
    const body=await r.text();if(typeof body!=="string"||body.length>2000000)throw Error("invalid body");return unwrapCalendar(body);
  };
  const log=(source,kind,e)=>{try{console.warn("[黄历查询] "+dateKey+" "+source+" "+kind+": "+String(e?.message||e).slice(0,180))}catch(_){}};

  const findPrimaryDay = (json,targetDay=D) => {
    let found = null;
    const seen = new Set();
    let visited=0;
    const walk = (obj,depth=0) => {
      if (!obj || typeof obj !== 'object' || found || depth>30 || ++visited>15000) return;
      if (seen.has(obj)) return;
      seen.add(obj);

      const yy = Number(obj.year);
      const mm = Number(obj.month);
      const dd = Number(obj.day);
      const looksLikeDay = Number.isFinite(yy) && Number.isFinite(mm) && Number.isFinite(dd) &&
        (obj.suit != null || obj.avoid != null || obj.gzDate != null || obj.lDate != null);

      if (looksLikeDay && yy === Y && mm === M && dd === targetDay) {
        found = obj;
        return;
      }

      if (!looksLikeDay && typeof obj.oDate==='string' && /(?:Z|[+-]\d{2}:\d{2})$/.test(obj.oDate) && (obj.suit != null || obj.avoid != null)) {
        const d = new Date(obj.oDate);
        if (!Number.isNaN(d.getTime())) {
          const bj = new Date(d.getTime() + 8 * 3600000);
          if (bj.getUTCFullYear() === Y && bj.getUTCMonth() + 1 === M && bj.getUTCDate() === targetDay) {
            found = obj;
            return;
          }
        }
      }

      if (Array.isArray(obj)) {
        for (const v of obj) walk(v,depth+1);
      } else {
        for (const k of Object.keys(obj)) walk(obj[k],depth+1);
      }
    };
    walk(json);
    if (!found) return null;
    return {
      lMonth: clean(found.lMonth),
      lDate: clean(found.lDate),
      gzYear: clean(found.gzYear),
      gzMonth: clean(found.gzMonth),
      gzDate: clean(found.gzDate),
      animal: clean(found.animal),
      suit: clean(found.suit),
      avoid: clean(found.avoid),
      festivalList: clean(found.festivalList || found.value),
      term: clean(found.term),
      jiri: String(found.jiri || '') === '1',
      details: {}
    };
  };

  const splitLunar = value => {
    const v = clean(value);
    const m = v.match(/^(闰?[正一二三四五六七八九十冬腊]+月)(.+)$/);
    return m ? { month: m[1], day: m[2] } : { month: '', day: v };
  };

  const termFromFestival = value => {
    const terms = '立春 雨水 惊蛰 春分 清明 谷雨 立夏 小满 芒种 夏至 小暑 大暑 立秋 处暑 白露 秋分 寒露 霜降 立冬 小雪 大雪 冬至 小寒 大寒'.split(' ');
    const v = parseFestivalItems(value);
    return terms.find(x => v.includes(x)) || '';
  };

  // 节气与节日来自不同数据源；先拆分单个节日，再去掉重合节气和跨源重复项。
  const parseFestivalItems = value => String(value ?? '')
    .split(/[，,、;；·|\s]+/)
    .map(v => clean(v).replace(/[（(]\d{1,2}:\d{2}(?::\d{2})?[）)]$/, ''))
    .filter(Boolean);

  const mergeFestivalItems = (solarTerm, ...values) => {
    const seen = new Set();
    const items = [];
    const termKey = clean(solarTerm);
    for (const value of values) {
      for (const item of parseFestivalItems(value)) {
        if (item === termKey || seen.has(item)) continue;
        seen.add(item);
        items.push(item);
      }
    }
    return items.join(' · ');
  };

  const normalizeSecondaryDay = (json,targetDay=D) => {
    const list = Array.isArray(json) ? json : [];
    const target=month+"-"+P(targetDay);
    const item=list.find(x=>{
      if(!x||typeof x!=="object")return false;
      if(validDate(x.day))return x.day===target;
      if(!/^\d{1,2}$/.test(String(x.day))||Number(x.day)!==targetDay)return false;
      const t=String(x.title||"").match(/(20\d{2})年\s*(\d{1,2})月(?:\s*(\d{1,2})日)?/);
      return !!t&&+t[1]===Y&&+t[2]===M&&(!t[3]||+t[3]===targetDay);
    });
    if (!item) return null;

    const lunarParts = splitLunar(item.lunar);
    const gz = clean(item.ganzhi);
    const gm = gz.match(/([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])年[\s\S]*?([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])月\s*([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])日/);
    const d = item.details || {};
    const festival = clean(item.festival);
    return {
      lMonth: lunarParts.month,
      lDate: lunarParts.day,
      gzYear: gm?.[1] || '',
      gzMonth: gm?.[2] || '',
      gzDate: gm?.[3] || '',
      animal: clean(d['生肖'] || d.zodiac),
      suit: Array.isArray(item.yi) ? item.yi.join(' ') : clean(item.yi),
      avoid: Array.isArray(item.ji) ? item.ji.join(' ') : clean(item.ji),
      festivalList: festival,
      term: termFromFestival(festival),
      jiri: false,
      details: {
        constellation: clean(d['星座'] || d.constellation),
        pengzu: clean(d['彭祖百忌']),
        fetus: clean(d['胎神占方']),
        star: clean(d['星宿']),
        chong: clean(d['冲']),
        sha: clean(d['煞']),
        twelve: clean(d['十二神']),
        season: clean(d['季节']),
        dayWuxing: clean(d['日五行']),
        jieqi: clean(d['节气'] || d.solarTerm)
      }
    };
  };

  const localFallback = () => {
    let lMonth = '', lDate = '', gzYear = '', animal = '';
    try {
      const date=new Date(Date.UTC(Y,M-1,D,4,0,0));
      const parts = new Intl.DateTimeFormat('zh-CN-u-ca-chinese', {
        year: 'numeric', month: 'long', day: 'numeric', timeZone:'Asia/Shanghai'
      }).formatToParts(date);
      const byType = type => parts.find(x => x.type === type)?.value || '';
      lMonth=lunarMonthText(byType('month'));
      lDate=lunarDayText(byType('day'));
      gzYear = byType('yearName');
      const branch = gzYear.slice(-1);
      const zodiac = { 子:'鼠', 丑:'牛', 寅:'虎', 卯:'兔', 辰:'龙', 巳:'蛇', 午:'马', 未:'羊', 申:'猴', 酉:'鸡', 戌:'狗', 亥:'猪' };
      animal = zodiac[branch] || '';
    } catch (_) {}
    return {
      lMonth, lDate, gzYear, gzMonth: '', gzDate: '', animal,
      suit: '', avoid: '', festivalList: '', term: '', jiri: false, details: {}
    };
  };

  const match=(a,b)=>a.lMonth===b.lMonth&&a.lDate===b.lDate&&(!a.gzDate||!b.gzDate||a.gzDate===b.gzDate);
  const mergeDay=(a,b)=>{
    if(!a)return b;if(!b||!match(a,b))return a;
    const out={...a,details:{...b.details}};
    for(const [k,v] of Object.entries(a.details||{}))if(v)out.details[k]=v;
    for(const k of ["gzYear","gzMonth","gzDate","animal"])if(!out[k]&&b[k])out[k]=b[k];
    if(!out.suit&&!out.avoid){out.suit=b.suit;out.avoid=b.avoid}
    out.term=termFromFestival(a.term)||termFromFestival(b.term)||termFromFestival(a.festivalList)||termFromFestival(b.festivalList);
    out.festivalList=mergeFestivalItems(out.term,a.festivalList,b.festivalList,a.term,b.term);
    return out;
  };
  const local=validCalendarDay(localFallback()),matchesLocal=d=>!local||d.lMonth===local.lMonth&&d.lDate===local.lDate;
  const seed=options.bundle===false?null:validCalendarDay(BUNDLED_CALENDAR[dateKey]);
  // Bundled entries were already date-checked and cross-validated during publication.
  // Do not let device-specific Intl formatting reject a trusted exact-date entry.
  const preloaded=fullDay(seed)?seed:null;
  if(preloaded&&!matchesLocal(preloaded))log("bundle","device calendar differs","using verified exact-date entry");
  let today,sourceLabel;
  if(preloaded){
    // A verified calendar entry is date-specific, not a live quote. No device network required.
    today=preloaded;sourceLabel="预载";
  }else{
    let stored=null;try{stored=ctx.storage.getJSON(CAL_KEY)}catch(_){}
    const cache=readCache(stored,month,clock);
    const routes=[
      ["https://raw.githubusercontent.com/zqzess/openApiData/main/calendar_new/"+Y+"/"+Y+P(M)+".json","https://api.github.com/repos/zqzess/openApiData/contents/calendar_new/"+Y+"/"+Y+P(M)+".json?ref=main"],
      ["https://raw.githubusercontent.com/xuqssq/calendar/main/output/"+month+".json","https://api.github.com/repos/xuqssq/calendar/contents/output/"+month+".json?ref=main"]
    ];
    const load=async(key,urls,parse)=>{
      const old=cache[key],saved=old?.days[dateKey],prior=saved&&matchesLocal(saved)?saved:null;
      if(prior&&clock-old.checked<DAY)return {day:prior,cached:false};
      if(old&&clock-old.attempt<30*60000)return {day:prior,cached:!!prior};
      let days={...old?.days};
      for(let i=0;i<(options.fallback===false?1:urls.length);i++){
        try{
          const json=await getJson(urls[i],i===1),parsed={},last=new Date(Date.UTC(Y,M,0)).getUTCDate();
          for(let n=1;n<=last;n++){const d=validCalendarDay(parse(json,n));if(d)parsed[month+"-"+P(n)]=d}
          if(!Object.keys(parsed).length)throw Error("No valid days");
          const current=parsed[dateKey];
          if(current&&!matchesLocal(current))delete parsed[dateKey];
          days={...days,...parsed};
          if(parsed[dateKey]){
            cache[key]={days,checked:clock,attempt:clock};
            return {day:parsed[dateKey],cached:false};
          }
          throw Error("No valid date-matched day");
        }catch(e){log(key,i===0?"raw":"api",e)}
      }
      cache[key]={days,checked:old?.checked||0,attempt:clock};
      return {day:prior,cached:!!prior};
    };
    const [a,b]=await Promise.all([load("primary",routes[0],findPrimaryDay),load("secondary",routes[1],normalizeSecondaryDay)]);
    try{ctx.storage.setJSON(CAL_KEY,cache)}catch(_){}
    const p=a.day&&matchesLocal(a.day)?a.day:null,q=b.day&&matchesLocal(b.day)?b.day:null;
    today=mergeDay(p,q)||local||localFallback();
    const conflict=p&&q&&!match(p,q);
    sourceLabel=conflict?"主源（有差异）":p&&q?(a.cached||b.cached?"双源缓存":"双源"):p?(a.cached?"主源缓存":"主源"):q?(b.cached?"备用缓存":"备用源"):"本地";
    if(!p||!q)refreshAfter=new Date(Math.min(clock+30*60000,midnight)).toISOString();
    if(sourceLabel==="本地")log("both","fallback","no verified remote day");
  }
  if(typeof options.capture==="function")options.capture({date:dateKey,day:sourceLabel==="本地"?null:today,source:sourceLabel});
  const error=sourceLabel==="本地"?"远程黄历数据暂不可用":"";

  const lunarMonth = clean(today?.lMonth);
  const lunarDay = clean(today?.lDate);
  const lunar = lunarMonth && lunarDay ? `农历${lunarMonth}${lunarMonth.includes('月') ? '' : '月'}${lunarDay}` : '农历数据暂缺';
  const ganzhi = [today?.gzYear ? `${today.gzYear}年` : '', today?.gzMonth ? `${today.gzMonth}月` : '', today?.gzDate ? `${today.gzDate}日` : '']
    .filter(Boolean).join(' ');
  const animal = clean(today?.animal);
  const yi = normalizeList(today?.suit) || '暂无数据';
  const ji = normalizeList(today?.avoid) || '暂无数据';
  const term=termFromFestival(today?.term)||termFromFestival(today?.festivalList);
  const festival=mergeFestivalItems(term,today?.festivalList||today?.value,today?.term);
  const extra = [term, festival].filter(Boolean).join(' · ');
  const jiri = today?.jiri === true || String(today?.jiri || '') === '1';
  const details = today?.details || {};
  const chong = clean(details.chong);
  const sha = clean(details.sha);
  const clash = [chong ? `冲${chong}` : '', sha ? `煞${sha}` : ''].filter(Boolean).join(' · ');
  const star = clean(details.star);
  const fetus = clean(details.fetus);
  const pengzu = clean(details.pengzu);
  const twelve = clean(details.twelve);

  const header = (size = 15) => row([
    icon('calendar', C.gold, size + 1),
    text('黄历查询', size, 'heavy', C.main),
    spacer(),
    ...(sourceLabel === '本地' || sourceLabel.includes('缓存') ? [chip(sourceLabel === '本地' ? '本地' : '缓存', C.muted)] : jiri ? [chip('吉日', C.gold)] : [])
  ], 6);

  const infoRow = (label, value, color = C.sub, ico = null) => row([
    ...(ico ? [icon(ico, color, 12)] : []),
    text(label, 11, 'bold', C.muted, { width: 42, maxLines: 1 }),
    text(value, 12, 'medium', color, { flex: 1, maxLines: 1, minScale: 0.65 })
  ], 6);

  const yiJiBlock = (label, value, color, ico, maxLines) => ({
    type: 'stack', direction: 'row', alignItems: 'start', gap: 7,
    children: [
      { type: 'stack', direction: 'row', alignItems: 'center', gap: 3, width: 44, children: [
        icon(ico, color, 13), text(label, 13, 'heavy', color)
      ]},
      text(value, isLarge ? 13 : 12, 'medium', C.sub, { flex: 1, maxLines, minScale: 0.72 })
    ]
  });

  if (isSmall) {
    return {
      type: 'widget', refreshAfter, padding: 12, backgroundGradient: bg, url: 'calshow://',
      children: [
        header(13),
        spacer(9),
        row([
          text(D, 34, 'heavy', C.main),
          col([
            text(`${Y}年${M}月`, 11, 'bold', C.muted),
            text(`星期${WEEK}`, 11, 'bold', C.muted)
          ], 2),
          spacer()
        ], 7),
        spacer(5),
        text(`${lunar}${animal ? ` · ${animal}年` : ''}`, 11, 'bold', C.gold, { maxLines: 1, minScale: 0.72 }),
        spacer(9),
        row([icon('checkmark.circle.fill', C.yi, 11), text(`宜  ${yi}`, 10, 'medium', C.sub, { flex: 1, maxLines: 1, minScale: 0.65 })], 6),
        spacer(7),
        row([icon('xmark.circle.fill', C.ji, 11), text(`忌  ${ji}`, 10, 'medium', C.sub, { flex: 1, maxLines: 1, minScale: 0.65 })], 6),
        spacer(),
        text(extra || (error ? '黄历数据暂不可用' : ganzhi), 9, 'bold', extra ? C.cyan : C.muted, { maxLines: 1, minScale: 0.7 })
      ]
    };
  }

  if (isLarge) {
    return {
      type: 'widget', refreshAfter, padding: 16, backgroundGradient: bg, url: 'calshow://',
      children: [
        header(17),
        spacer(10),
        row([
          text(`${M}月${D}日`, 28, 'heavy', C.main),
          col([
            text(`星期${WEEK}`, 12, 'bold', C.muted),
            text(lunar, 13, 'heavy', C.gold)
          ], 3),
          spacer(),
          ...(extra ? [chip(extra, C.cyan)] : [])
        ], 8),
        spacer(9),
        infoRow('干支', ganzhi || '暂无数据', C.sub, 'circle.grid.cross.fill'),
        spacer(6),
        infoRow('生肖', animal ? `${animal}年` : '暂无数据', C.sub, 'hare.fill'),
        spacer(6),
        infoRow('冲煞', clash || '暂无数据', C.sub, 'arrow.left.arrow.right.circle.fill'),
        spacer(6),
        infoRow('星宿', star || '暂无数据', C.sub, 'sparkles'),
        spacer(10),
        { type: 'stack', height: 0.5, backgroundColor: C.divider, children: [] },
        spacer(10),
        yiJiBlock('宜', yi, C.yi, 'checkmark.circle.fill', 4),
        spacer(12),
        yiJiBlock('忌', ji, C.ji, 'xmark.circle.fill', 4),
        spacer(),
        ...((fetus || twelve || pengzu) ? [
          text([fetus ? `胎神 ${fetus}` : '', twelve, pengzu].filter(Boolean).join(' · '), 9, 'medium', C.muted, { maxLines: 1, minScale: 0.68 }),
          spacer(5)
        ] : []),
        text(sourceLabel === '本地' ? '本地历法兜底 · 宜忌等待远程恢复' : `数据来源 · ${sourceLabel === '预载' ? '已校验' : sourceLabel}`, 9, 'medium', C.muted, { maxLines: 1 })
      ]
    };
  }

  return {
    type: 'widget', refreshAfter, padding: 13, backgroundGradient: bg, url: 'calshow://',
    children: [
      header(15),
      spacer(9),
      row([
        text(`${Y}年${M}月${D}日 星期${WEEK}`, 15, 'heavy', C.main),
        spacer(),
        text(lunar, 11, 'bold', C.gold, { maxLines: 1, minScale: 0.72 })
      ]),
      spacer(7),
      ...(ganzhi ? [text(`${ganzhi}${animal ? ` · ${animal}年` : ''}`, 11, 'medium', C.muted, { maxLines: 1, minScale: 0.72 })] : []),
      spacer(9),
      yiJiBlock('宜', yi, C.yi, 'checkmark.circle.fill', 2),
      spacer(9),
      yiJiBlock('忌', ji, C.ji, 'xmark.circle.fill', 2),
      spacer(),
      row([
        text(extra || clash || (sourceLabel === '本地' ? '本地历法兜底' : '今日黄历'), 9, 'bold', (extra || clash) ? C.cyan : C.muted, { maxLines: 1, minScale: 0.72 }),
        spacer(),
        text(`${P(now.getUTCHours())}:${P(now.getUTCMinutes())}`, 9, 'bold', C.muted)
      ])
    ]
  };
}
