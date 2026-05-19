/**
 * 大六壬 AI 推演 RAG 提示词重构 V2.0
 * 
 * 核心改进：
 * 1. 结构化特征注入 → AI不再从原始数据推断，直接使用量化引擎输出
 * 2. 分层推演模板 → B/D/S三层逐步展开，逻辑链清晰
 * 3. Bomb Rules预警前置 → 危险信号优先告知AI
 * 4. 领域专属提示词 → 不同领域用不同推演框架
 * 5. 量化锚点 → E值/Bi/Di/Si数值锚定AI输出精度
 * 
 * 使用方式：
 *   const prompt = AI_PROMPT_ENGINE.build(runResult, quantResult, bombResult, nianMingResult, domain);
 *   → 传入AI模型的完整提示词
 */

window.AI_PROMPT_ENGINE = (function() {

    // ===== 系统提示词基础模板 =====
    const SYSTEM_PROMPT_BASE = `你是一位精通大六壬的专业断课师。你需要根据以下结构化课式数据，进行专业、精准、有深度的断课推演。

## 你的推演原则：
1. **数据驱动**：严格依据提供的量化数据（E值、Bi、Di、Si），不可凭空推测。
2. **分层递进**：按课体定性→生克动能→状态衰减→年命微调的层次展开分析。
3. **Bomb Rules优先**：如有触发红色/黄色/橙色炸弹，必须在分析开头声明。
4. **领域锁定**：严格遵循当前领域的专业映射规则，不跨界套用。
5. **量化锚点**：结论必须与E值等级对应，不可出现E=0.3却判"大吉"的矛盾。
6. **保守原则**：有疑则断凶，不疑方断吉。模糊信号倾向保守解读。

## 吉凶定级标准：
| E值范围 | 等级 | 含义 |
|---------|------|------|
| ≥0.85 | 大吉 | 各层全面利好，主动出击 |
| 0.70-0.84 | 吉 | 整体向好，可稳步推进 |
| 0.55-0.69 | 小吉 | 略有优势，谨慎乐观 |
| 0.45-0.54 | 平 | 吉凶参半，静观其变 |
| 0.35-0.44 | 小凶 | 略有不利，宜守不宜攻 |
| 0.20-0.34 | 凶 | 明显不利，应回避退让 |
| <0.20 | 大凶 | 各层全面恶化，紧急避险 |`;

    // ===== 领域推演模板 =====
    const DOMAIN_TEMPLATES = {
        'basket': {
            analysisFramework: `
## 篮球赛事推演框架：
1. **主客定位**：日干=主队，日支=客队
2. **胜负定性**：Bi>0.7主队基底稳固，Di>0.7主队动能强劲
3. **分差极值**：
   - E≥0.80 → 主胜10+分
   - E≥0.60 → 主胜5-10分
   - E=0.45-0.59 → 险胜1-5分
   - E=0.35-0.44 → 客险胜
   - E<0.35 → 客大胜
4. **大小分**：子孙爻+财爻旺→大分；父母爻+官鬼旺→小分`,
            conclusionFormat: `**赛事预测：**
- 定性方向：主胜/客胜
- 极值分差：大胜(10+)/险胜(1-5)
- 大小分倾向：大分/小分
- 关键转折：[初传→中传的动能转换]`,
        },
        'soccer': {
            analysisFramework: `
## 足球赛事推演框架：
1. **主客定位**：日干=主队，日支=客队
2. **三维判定**：干克支→主胜，支克干→客胜，干支合→平局
3. **进球推演**：子孙爻=射门动能，父母爻=防守底座
4. **波胆预测**：结合E值和三传生克链推断`,
            conclusionFormat: `**赛事预测：**
- 胜平负：主胜/平局/客胜
- 精准比分：X:X
- 进球趋势：多球/少球
- 关键节点：[三传时序转折]`,
        },
        'esport': {
            analysisFramework: `
## 电竞赛事推演框架：
1. **蓝红方映射**：日干=蓝方(主控)，日支=红方(应对)
2. **滚雪球节奏**：羊刃+白虎=前期压制力
3. **大局比分**：三传连茹→横扫，三传断裂→拉满`,
            conclusionFormat: `**赛事预测：**
- 定性方向：蓝方胜/红方胜
- 大局比分：2:0/3:1/拉满
- 节奏预判：前期碾压/中期翻盘/后期拉锯`,
        },
        'stock': {
            analysisFramework: `
## 金融股市推演框架：
1. **六亲映射**：父母=政策底，子孙=现金流，财=流动性，官鬼=抛压，兄弟=散户
2. **趋势判定**：E≥0.70看多，E≤0.35看空，0.36-0.69震荡
3. **关键格局**：
   - 传财生鬼→高位接盘暴雷
   - 兄弟合局→无抵抗阴跌
   - 禄马交驰→单边逼空`,
            conclusionFormat: `**股市研判：**
- 追踪方向：看多/看空/震荡
- 定性穿透：主升浪/底部建仓/诱多反弹/震荡洗盘/破位暴跌
- 仓位建议：满仓/半仓/轻仓/空仓
- 止损位：[基于Si衰减的极限位]`,
        },
        'marriage': {
            analysisFramework: `
## 婚姻情感推演框架：
1. **干支定位**：日干=求测者，日支=对方
2. **六亲重点**：男占重财爻(女方)，女占重官鬼(男方)
3. **缘分深度**：干支合→深缘，干支冲→反复
4. **成婚信号**：六合+财/官发用→可成`,
            conclusionFormat: `**姻缘研判：**
- 姻缘评级：天作之合/良缘有望/缘分尚浅/情路坎坷
- 成婚时机：近期/半年/来年/无期
- 对方特征：[基于支上神五行和天将推断]
- 注意事项：[基于Bomb Rules和冲合关系]`,
        },
        'health': {
            analysisFramework: `
## 疾病健康推演框架：
1. **病位定位**：官鬼临支→脏腑定位
2. **病情轻重**：官鬼旺无制→危重，子孙制官鬼→可愈
3. **医药信号**：子孙爻=治疗，天医星入传→良医
4. **预后趋势**：末传旺相→向好，末传空亡→缠绵`,
            conclusionFormat: `**健康研判：**
- 病情评级：轻症可愈/需调养/重症危候/急症需医
- 病位推断：[官鬼临支定位]
- 康复趋势：向愈/缠绵/恶化
- 就医建议：[基于子孙爻状态]`,
        },
        'lawsuit': {
            analysisFramework: `
## 官讼法律推演框架：
1. **主客定位**：日干=原告，日支=被告
2. **判决推断**：官鬼=法院，子孙制官→胜诉
3. **证据评估**：父母爻=文书证据，空亡→证据不足`,
            conclusionFormat: `**官讼研判：**
- 胜诉评级：胜诉在望/有理难赢/败诉风险/和解为宜
- 诉讼趋势：速决/拖延/反转
- 关键证据：[父母爻状态]
- 建议：[攻守策略]`,
        },
        'travel': {
            analysisFramework: `
## 出行安全推演框架：
1. **安全评估**：官鬼旺→有险，子孙旺→平安
2. **路况推断**：初传空→计划变动，驿马发→必行
3. **归期判断**：末传旺→如期归，末传空→延期`,
            conclusionFormat: `**出行研判：**
- 出行评级：一路平安/小有波折/不宜出行/凶险需避
- 归期判断：如期/延期/遥遥
- 方位吉凶：[基于三传方位]
- 注意事项：[基于白虎/空亡]`,
        },
        'exam': {
            analysisFramework: `
## 考学升学推演框架：
1. **考生状态**：日干旺→实力强，日干衰→状态差
2. **录取信号**：父母爻=录取/证书，旺相→有望
3. **竞争压力**：官鬼=名额限制，兄弟=竞争者
4. **发挥预估**：子孙制官→超常，官克干→失常`,
            conclusionFormat: `**考学研判：**
- 录取评级：金榜题名/稳中求胜/悬而未决/落榜风险
- 发挥趋势：超常/正常/失常
- 关键科目：[基于官鬼临支]
- 备考建议：[基于子孙爻方位]`,
        },
        'missing': {
            analysisFramework: `
## 寻人失物推演框架：
1. **可寻性评估**：财爻旺→可寻，财空→难觅
2. **方位推断**：初传地支定方位
3. **远近判断**：旺相近/休相远/囚相极远
4. **归期信号**：末传合干→物归原主`,
            conclusionFormat: `**寻回研判：**
- 寻回评级：失而复得/有迹可循/希望渺茫/难以寻回
- 方位推断：[初传方位]
- 远近判断：近处/中距/远处
- 最佳寻回时间：[基于应期推算]`,
        },
        'general': {
            analysisFramework: `
## 通用决策推演框架：
1. **整体评估**：E值定基调，Bi/Di/Si分诊各层
2. **关键转折**：初传→中传→末传的动能演化
3. **风险排查**：Bomb Rules全覆盖扫描
4. **行动建议**：吉则进取，凶则守成`,
            conclusionFormat: `**综合研判：**
- 定性评级：极佳/平稳/阻滞/凶险
- 核心动因：[Bi/Di/Si最强影响层]
- 风险预警：[触发Bomb]
- 行动建议：[进取/观望/退守]`,
        },
    };

    // ==========================================
    // 提示词构建主函数
    // ==========================================

    /**
     * 构建完整的AI推演提示词
     * @param {object} runResult - 排盘结果
     * @param {object} quantResult - 量化引擎结果
     * @param {object} bombResult - Bomb扫描结果
     * @param {object} nianMingResult - 年命系统结果
     * @param {string} domain - 领域标识
     * @param {string} userQuery - 用户原始问题
     * @returns {object} { systemPrompt, userPrompt, fullPrompt }
     */
    function build(runResult, quantResult, bombResult, nianMingResult, domain, userQuery) {
        const domainKey = domain || 'general';
        const domainTemplate = DOMAIN_TEMPLATES[domainKey] || DOMAIN_TEMPLATES['general'];

        // ===== 构建系统提示词 =====
        let systemPrompt = SYSTEM_PROMPT_BASE;

        // 领域策略注入
        if (window.DOMAIN_STRATEGIES && window.DOMAIN_STRATEGIES[domainKey]) {
            const strategy = window.DOMAIN_STRATEGIES[domainKey];
            systemPrompt += '\n\n' + strategy.directives;
        }

        // 领域分析框架注入
        systemPrompt += '\n\n' + domainTemplate.analysisFramework;

        // ===== 构建用户提示词 =====
        let userPrompt = `## 用户问题：${userQuery || '请根据课式推演'}\n\n`;

        // 1. 排盘数据
        userPrompt += buildPanDataSection(runResult);

        // 2. 量化数据
        userPrompt += buildQuantSection(quantResult);

        // 3. Bomb Rules预警
        userPrompt += buildBombSection(bombResult);

        // 4. 年命数据
        userPrompt += buildNianMingSection(nianMingResult);

        // 5. 输出格式要求
        userPrompt += buildOutputFormat(domainTemplate, quantResult, bombResult);

        return {
            systemPrompt,
            userPrompt,
            fullPrompt: systemPrompt + '\n\n---\n\n' + userPrompt,
        };
    }

    // ===== 各节段构建函数 =====

    function buildPanDataSection(runResult) {
        if (!runResult) return '## 排盘数据：未提供\n\n';
        
        let section = '## 排盘结构化数据\n\n';
        
        // 天地盘状态
        section += `**天地盘状态**：${runResult.天地盘状态 || '常规'}\n`;
        
        // 四课
        if (runResult.四课 && runResult.四课.length > 0) {
            section += `**四课**：\n`;
            runResult.四课.forEach((sk, i) => {
                const upper = sk.upper || sk.top;
                const lower = sk.lower || sk.bottom;
                section += `  第${i+1}课：${upper} / ${lower}\n`;
            });
        }
        
        // 三传
        if (runResult.三传) {
            section += `**三传**：初传=${runResult.三传.初传 || '?'} 中传=${runResult.三传.中传 || '?'} 末传=${runResult.三传.末传 || '?'}\n`;
        }
        
        // 九宗门
        if (runResult.九宗门路由变量) {
            section += `**九宗门**：${runResult.九宗门路由变量.克贼类型 || '未定'}\n`;
        }
        
        // 克贼统计
        if (runResult.克贼统计) {
            section += `**克贼统计**：下贼上=${runResult.克贼统计.下贼上_count || 0}，上克下=${runResult.克贼统计.上克下_count || 0}\n`;
        }
        
        section += '\n';
        return section;
    }

    function buildQuantSection(quantResult) {
        if (!quantResult) return '## 量化数据：未计算\n\n';
        
        let section = '## 四层扫描量化数据\n\n';
        
        section += `**E值**：${quantResult.E}（${quantResult.grade}）\n`;
        section += `  - Bᵢ 课体定性：${quantResult.Bi}\n`;
        section += `  - Dᵢ 生克动能：${quantResult.Di}\n`;
        section += `  - Sᵢ 状态衰减：${quantResult.Si}\n`;
        if (quantResult.nianMingAdjust) {
            section += `  - 年命微调：${quantResult.nianMingAdjust > 0 ? '+' : ''}${quantResult.nianMingAdjust}\n`;
        }
        
        if (quantResult.breakdown) {
            const bd = quantResult.breakdown;
            section += `\n**分诊明细**：\n`;
            section += `  - 日干旺衰：${bd.riGanWangShuai || '未知'}\n`;
            if (bd.sanChuanLiuQin && bd.sanChuanLiuQin.length > 0) {
                section += `  - 三传六亲：${bd.sanChuanLiuQin.join(' → ')}\n`;
            }
            if (bd.sanChuanRelation && bd.sanChuanRelation.length > 0) {
                section += `  - 三传生克：${bd.sanChuanRelation.join(' → ')}\n`;
            }
        }

        // 领域加权E值
        if (quantResult.E_weighted) {
            section += `\n**领域加权E值**：${quantResult.E_weighted}（${quantResult.grade_weighted}）\n`;
            section += `  - 权重：Bᵢ×${quantResult.domainWeights.Bi} Dᵢ×${quantResult.domainWeights.Di} Sᵢ×${quantResult.domainWeights.Si}\n`;
        }
        
        section += '\n';
        return section;
    }

    function buildBombSection(bombResult) {
        if (!bombResult || bombResult.severity === 'none') {
            return '## 危险信号扫描：无触发\n\n';
        }
        
        let section = '## ⚠️ 危险信号扫描结果\n\n';
        section += `**最高级别**：${bombResult.severity === 'red' ? '🔴 红色炸弹' : bombResult.severity === 'yellow' ? '🟡 黄色炸弹' : '🟠 橙色炸弹'}\n\n`;
        
        if (bombResult.triggered && bombResult.triggered.length > 0) {
            section += '**触发规则**：\n';
            for (const b of bombResult.triggered) {
                const icon = b.level === 'red' ? '🔴' : b.level === 'yellow' ? '🟡' : '🟠';
                section += `  ${icon} ${b.name}(${b.id})：${b.desc}\n`;
            }
        }
        
        section += `\n**影响量化**：E值衰减因子=${bombResult.eFactor}，等级偏移=${bombResult.gradeShift}\n\n`;
        return section;
    }

    function buildNianMingSection(nianMingResult) {
        if (!nianMingResult) return '## 年命数据：未提供\n\n';
        
        let section = '## 年命系统数据\n\n';
        section += `**本命**：${nianMingResult.benMing}${nianMingResult.benMingShangShen ? '，上神=' + nianMingResult.benMingShangShen : ''}\n`;
        section += `**行年**：${nianMingResult.xingNian}${nianMingResult.xingNianShangShen ? '，上神=' + nianMingResult.xingNianShangShen : ''}\n`;
        section += `**命干六亲**：本命→${nianMingResult.bmGanRelation || '?'}，行年→${nianMingResult.xnGanRelation || '?'}\n`;
        
        if (nianMingResult.benMingRuChuan) section += `  ⭐ 本命入传\n`;
        if (nianMingResult.xingNianRuChuan) section += `  ⭐ 行年入传\n`;
        if (nianMingResult.isBenMingChongXingNian) section += `  ⚠️ 本命冲行年\n`;
        if (nianMingResult.isBenMingHeXingNian) section += `  ✅ 本命合行年\n`;
        
        section += '\n';
        return section;
    }

    function buildOutputFormat(domainTemplate, quantResult, bombResult) {
        let section = '## 输出格式要求\n\n';
        section += '请严格按照以下结构输出分析结果：\n\n';
        section += '### 一、Bomb Rules优先声明\n';
        section += '（如有触发，必须首先声明危险信号及其影响）\n\n';
        section += '### 二、四层扫描分析\n';
        section += '1. **课体定性(Bᵢ)**：[分析格局基底]\n';
        section += '2. **生克动能(Dᵢ)**：[分析三传动力链]\n';
        section += '3. **状态衰减(Sᵢ)**：[分析旺衰与修正]\n';
        section += '4. **年命微调**：[分析本命行年影响]\n\n';
        section += '### 三、领域专项推演\n';
        section += domainTemplate.analysisFramework + '\n\n';
        section += '### 四、结论\n';
        section += domainTemplate.conclusionFormat + '\n\n';
        section += `**E值锚点**：${quantResult ? quantResult.E : '?'}（${quantResult ? quantResult.grade : '?'}）`;
        if (bombResult && bombResult.severity !== 'none') {
            section += `，Bomb修正后E=${quantResult.E_final || '?'}`;
        }
        section += '\n';
        
        return section;
    }

    // ===== 简化版提示词（用于Token受限场景）=====
    function buildCompact(runResult, quantResult, bombResult, domain, userQuery) {
        const domainKey = domain || 'general';
        const E = quantResult ? quantResult.E : '?';
        const grade = quantResult ? quantResult.grade : '?';
        const bomb = bombResult && bombResult.severity !== 'none' ? `[${bombResult.severity.toUpperCase()}:${bombResult.summary}]` : '';
        
        return `大六壬推演 | E=${E}(${grade}) ${bomb}
领域：${domainKey} | 三传：${runResult?.三传?.初传||'?'}→${runResult?.三传?.中传||'?'}→${runResult?.三传?.末传||'?'} | 方法：${runResult?.九宗门路由变量?.克贼类型||'?'}
B=${quantResult?.Bi||'?'} D=${quantResult?.Di||'?'} S=${quantResult?.Si||'?'}
问题：${userQuery}
请按课体→动能→状态→结论四层展开分析。`;
    }

    // ===== 导出 =====
    return {
        build,
        buildCompact,
        SYSTEM_PROMPT_BASE,
        DOMAIN_TEMPLATES,
    };

})();
