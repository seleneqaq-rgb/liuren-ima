/**
 * 模块 D：细分领域垂直策略库 (Ground Truth v5.13 终极解耦版)
 * 架构师防线刚性约束：UI 控件属性强绑定持久化数据键名，意图正则与系统 Prompt 完全封装。
 */
window.DOMAIN_STRATEGIES = {
    // ==========================================
    // 1. 赛事竞技域：篮球专属策略 (Basketball)
    // ==========================================
    "basket": {
        domainName: "赛事-篮球",
        intentRegex: /(?:篮球|NBA|CBA|篮彩|让分|大小分|湖人|勇士|独行侠|掘金|凯尔特人|尼克斯|森林狼|雷霆)/i,
        directives: [
            "【当前推演垂直域锁定为：篮球赛事】",
            "1. 物理映射基准：必须以日干代表主队/主场方/盘口主控方，以日支代表客队/挑战方。",
            "2. 深度穿透推演：严格依据干支五行生克及四课三传动力链，剖析主队胜负定性方向。",
            "3. 极值分差量化：依据涉害深浅、白虎穿透力与财官当令旺度，推演让分穿透极限与大局总分态势。",
            "4. 刚性输出格式：在分析完毕后，强制使用结构化标记输出结论，如：定性方向：主胜/客胜，极值分差：大胜/险胜。"
        ].join("\n"),
        uiConfig: {
            capsuleGroups: [
                {
                    label: "胜负方向",
                    targetField: "dir", // 强映射至记录单例的 direction 字段
                    options: [
                        { value: "主胜", label: "主胜 (干旺)" },
                        { value: "客胜", label: "客胜 (支克)" }
                    ]
                },
                {
                    label: "极值分差",
                    targetField: "score", // 强映射至记录单例的 score_type 字段
                    options: [
                        { value: "大胜", label: "大胜10+" },
                        { value: "险胜", label: "险胜1-5" },
                        { value: "大分", label: "总分极高" },
                        { value: "小分", label: "总分极低" }
                    ]
                }
            ]
        }
    },

    // ==========================================
    // 2. 赛事竞技域：足球专属策略 (Soccer)
    // ==========================================
    "soccer": {
        domainName: "赛事-足球",
        intentRegex: /(?:足球|英超|欧冠|西甲|意甲|德甲|足彩|胜平负|波胆|皇马|曼城|阿森纳|拜仁|国米)/i,
        directives: [
            "【当前推演垂直域锁定为：足球赛事】",
            "1. 核心边界与主客映射：日干代表主场球队，日支代表客场球队。",
            "2. 胜平负三维判定：干克支主胜；支克干客胜；干支互合、交车相合或见天心回环格，高度偏向沉闷平局。",
            "3. 进球极值与精准比分：重点探查课传中子孙爻（射门动能）与父母爻（防守底座）的强弱对比，推演波胆态势。",
            "4. 刚性输出格式：分析尾部强制标出标准赛果预测，如：定性方向：主胜/平局/客胜，精准比分：2:1/1:1/0:2 等。"
        ].join("\n"),
        uiConfig: {
            capsuleGroups: [
                {
                    label: "胜平负方向",
                    targetField: "dir",
                    options: [
                        { value: "主胜", label: "主胜3" },
                        { value: "平局", label: "平局1" },
                        { value: "客胜", label: "客胜0" }
                    ]
                },
                {
                    label: "精准比分矩阵",
                    targetField: "score",
                    options: [
                        { value: "1:0", label: "1:0 (小胜)" },
                        { value: "2:0", label: "2:0 (完胜)" },
                        { value: "2:1", label: "2:1 (胶着)" },
                        { value: "1:1", label: "1:1 (互合)" },
                        { value: "0:0", label: "0:0 (空锁)" },
                        { value: "0:1", label: "0:1 (反客)" },
                        { value: "1:2", label: "1:2 (支穿)" },
                        { value: "大比分", label: "大局进球多" }
                    ]
                }
            ]
        }
    },

    // ==========================================
    // 3. 赛事竞技域：电竞专属策略 (E-Sports)
    // ==========================================
    "esport": {
        domainName: "赛事-电竞",
        intentRegex: /(?:电竞|LOL|DOTA2|CS2|KPL|LPL|T1|GEN|BLG|TES|WBG|FAZE|NAVI)/i,
        directives: [
            "【当前推演垂直域锁定为：电子竞技】",
            "1. 主客物理映射：日干代表选边主控方（蓝色方/主队），日支代表应对挑战方（红色方/客队）。",
            "2. 滚雪球与转折点推演：电竞节奏极快，需密切监控羊刃与白虎的极速切割力（代表前期团战与资源压制）。",
            "3. 大局比分推测：结合三传连茹与断层态势，推演是单边横扫还是拉满决胜局。",
            "4. 刚性输出格式：如：定性方向：主胜/客胜，大局比分：2:0/3:1/拉满。"
        ].join("\n"),
        uiConfig: {
            capsuleGroups: [
                {
                    label: "胜负方向",
                    targetField: "dir",
                    options: [
                        { value: "主胜", label: "主胜 (干统)" },
                        { value: "客胜", label: "客胜 (支逆)" }
                    ]
                },
                {
                    label: "大局比分",
                    targetField: "score",
                    options: [
                        { value: "2:0横扫", label: "2:0 横扫" },
                        { value: "2:1险胜", label: "2:1 险胜" },
                        { value: "3:0碾压", label: "3:0 碾压" },
                        { value: "3:1压制", label: "3:1 压制" },
                        { value: "打满决胜", label: "拉满BO5" }
                    ]
                }
            ]
        }
    },

    // ==========================================
    // 4. 金融股市域专属策略 (Stock Market)
    // ==========================================
    "stock": {
        domainName: "金融股市",
        intentRegex: /(?:股票|股市|A股|大盘|上证|创业板|个股|涨停|跌停|做多|做空|建仓|减持|半导体|芯片|新能源)/i,
        directives: [
            "【当前推演垂直域锁定为：金融股市】",
            "1. 盘面底层六亲映射：",
            "   - 父母爻代表政策底座、基本面消息与护城河支撑。",
            "   - 子孙爻代表自由现金流、核心技术红利与多头后备动能。",
            "   - 妻财爻代表流动性、短期资金情绪与获利空间。",
            "   - 官鬼爻代表监管压迫、系统性抛压与断头铡刀式利空。",
            "   - 兄弟爻代表散户跟风盘、多空惨烈互踩与资金分流抽血。",
            "2. 严密排查生克链死锁：传财生鬼主高位接盘暴雷；兄弟合局主盘面无抵抗阴跌；禄马交驰主单边逼空大涨。",
            "3. 刚性输出格式：分析末尾直接输出，如：追踪方向：看多/看空/震荡，定性穿透：主升浪/诱多反弹/破位下杀。"
        ].join("\n"),
        uiConfig: {
            capsuleGroups: [
                {
                    label: "追踪方向",
                    targetField: "dir",
                    options: [
                        { value: "看多", label: "看多 (财子旺)" },
                        { value: "看空", label: "看空 (鬼兄凶)" },
                        { value: "震荡", label: "震荡 (干支锁)" }
                    ]
                },
                {
                    label: "定性穿透",
                    targetField: "score",
                    options: [
                        { value: "主升浪", label: "单边主升浪" },
                        { value: "底部建仓", label: "长效吸筹筑底" },
                        { value: "诱多反弹", label: "无量诱多反弹" },
                        { value: "震荡洗盘", label: "宽幅震荡洗盘" },
                        { value: "破位暴跌", label: "断头破位下杀" }
                    ]
                }
            ]
        }
    },

    // ==========================================
    // 5. 常规商业、职场与通用域 (General Business & General)
    // ==========================================
    "general": {
        domainName: "常规通用域",
        intentRegex: /.*/, // 兜底全量意图捕获
        directives: [
            "【当前推演垂直域锁定为：常规通用决策】",
            "1. 物理底线剖析：深度结合《毕法赋》100条核心微言义字典，进行全息立体生克推演。",
            "2. 主客交互逻辑：初传支上末传干上主引力内流（掌握主动权）；干上脱气或支上伏尸主沉没成本激增与底层雷区。",
            "3. 风险预警部署：若遇魁度天门、两蛇夹墓等物理死锁结构，强制建议暂停推进、原地静默防御。",
            "4. 刚性输出格式：末尾输出标准结论，如：定性评级：极佳/平稳/阻滞/凶险。"
        ].join("\n"),
        uiConfig: {
            capsuleGroups: [
                {
                    label: "定性评级",
                    targetField: "dir",
                    options: [
                        { value: "极佳", label: "极佳 (吉神会)" },
                        { value: "平稳", label: "平稳 (生克闭)" },
                        { value: "阻滞", label: "阻滞 (罗网盖)" },
                        { value: "凶险", label: "凶险 (鬼虎穿)" }
                    ]
                }
            ]
        }
    }
};

/**
 * 全域动态路由嗅探器 (Domain Router)
 * 供主干引擎初始化及业务流输入时瞬间嗅探并返回垂直域策略对象
 */
window.DOMAIN_STRATEGIES.getStrategy = function(queryText, explicitDomain = "") {
    // 1. 若前端已存在明确选择的分类 ID (如通过下拉框直接锁定)，优先硬绑定
    if (explicitDomain && window.DOMAIN_STRATEGIES[explicitDomain]) {
        return window.DOMAIN_STRATEGIES[explicitDomain];
    }
    // 2. 正则路由依次穿透嗅探
    if (window.DOMAIN_STRATEGIES.basket.intentRegex.test(queryText)) return window.DOMAIN_STRATEGIES.basket;
    if (window.DOMAIN_STRATEGIES.soccer.intentRegex.test(queryText)) return window.DOMAIN_STRATEGIES.soccer;
    if (window.DOMAIN_STRATEGIES.esport.intentRegex.test(queryText)) return window.DOMAIN_STRATEGIES.esport;
    if (window.DOMAIN_STRATEGIES.stock.intentRegex.test(queryText)) return window.DOMAIN_STRATEGIES.stock;
    
    // 3. 默认兜底回退至通用决策域
    return window.DOMAIN_STRATEGIES.general;
};