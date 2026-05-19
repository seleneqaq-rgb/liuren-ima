/**
 * 大六壬 Bomb Rules 一票否决体系 V2.0
 * 
 * Bomb Rules = 特种凶课/危险信号的一票否决规则
 * 当触发Bomb Rule时，无论E值多高，直接将吉凶定级降级
 * 
 * 分三级：
 *   🔴 RED_BOMB  → 直接判"大凶"，E值钳位至0.1以下
 *   🟡 YELLOW_BOMB → 降两级，E值×0.5
 *   🟠 ORANGE_BOMB → 降一级，E值×0.7
 * 
 * 依赖：QUANT_ENGINE, WANG_SHUAI_ENGINE, DUN_GAN_ENGINE
 */

window.BOMB_RULES = (function() {

    const WUXING = {'甲':'木','乙':'木','丙':'火','丁':'火','戊':'土','己':'土','庚':'金','辛':'金','壬':'水','癸':'水',
                    '子':'水','丑':'土','寅':'木','卯':'木','辰':'土','巳':'火','午':'火','未':'土','申':'金','酉':'金','戌':'土','亥':'水'};
    const DI_ZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];

    // ===== Bomb Rule 定义 =====
    const BOMB_DEFINITIONS = {

        // ========== 🔴 RED BOMBS（直接大凶）==========
        red: [
            {
                id: 'R01',
                name: '天罗地网',
                desc: '辰加巳或戌加亥，天地皆困',
                check: (run, features) => {
                    const tp = run.天地盘 || {};
                    return (tp['辰'] === '巳') || (tp['戌'] === '亥');
                },
                penalty: { eCap: 0.10, gradeForce: '大凶' }
            },
            {
                id: 'R02',
                name: '两蛇夹墓',
                desc: '腾蛇夹日墓，绝境无生路',
                check: (run, features) => {
                    // 日墓查表
                    const MU = {'甲':'未','乙':'戌','丙':'戌','丁':'丑','戊':'戌','己':'丑','庚':'丑','辛':'辰','壬':'辰','癸':'未'};
                    const riGan = run.Context ? run.Context.gan : '';
                    const riMu = MU[riGan];
                    if (!riMu) return false;
                    // 腾蛇排法需天将系统配合
                    // 简化：检查三传中是否有两传为日墓
                    const sc = run.三传 || {};
                    const scArr = [sc.初传, sc.中传, sc.末传];
                    const muCount = scArr.filter(s => s === riMu).length;
                    return muCount >= 2;
                },
                penalty: { eCap: 0.10, gradeForce: '大凶' }
            },
            {
                id: 'R03',
                name: '死奇课',
                desc: '死气+死神+丧门同见，灾厄不可免',
                check: (run, features) => {
                    // 简化：初传为日干之七杀且旺衰为"死"
                    const riGan = run.Context ? run.Context.gan : '';
                    const sc = run.三传 || {};
                    const chuWX = WUXING[sc.初传] || '土';
                    const ganWX = WUXING[riGan] || '土';
                    // 七杀：克我且异阴阳
                    const KE = { '木':'土', '土':'水', '水':'火', '火':'金', '金':'木' };
                    const isQiSha = KE[ganWX] === chuWX;
                    // 需旺衰配合，此处标记需旺衰引擎
                    return isQiSha && features && features.wangShuaiInfo && features.wangShuaiInfo.ganWS === '死';
                },
                penalty: { eCap: 0.10, gradeForce: '大凶' }
            },
            {
                id: 'R04',
                name: '三传递克日干',
                desc: '初传克中传克末传克日干，层层递剥',
                check: (run, features) => {
                    const sc = run.三传 || {};
                    const scArr = [sc.初传, sc.中传, sc.末传];
                    const riGan = run.Context ? run.Context.gan : '';
                    const ganWX = WUXING[riGan] || '土';
                    const KE = { '木':'土', '土':'水', '水':'火', '火':'金', '金':'木' };
                    
                    // 检查三传递克
                    let allKe = true;
                    for (let i = 0; i < scArr.length - 1; i++) {
                        const wx1 = WUXING[scArr[i]] || '土';
                        const wx2 = WUXING[scArr[i+1]] || '土';
                        if (KE[wx1] !== wx2) { allKe = false; break; }
                    }
                    // 末传克日干
                    const moWX = WUXING[scArr[2]] || '土';
                    const keGan = KE[moWX] === ganWX;
                    
                    return allKe && keGan;
                },
                penalty: { eCap: 0.15, gradeForce: '大凶' }
            },
        ],

        // ========== 🟠 ORANGE BOMBS（降一级）==========
        orange: [
            {
                id: 'O01',
                name: '魁度天门',
                desc: '戌加亥，天门受阻',
                check: (run, features) => {
                    const tp = run.天地盘 || {};
                    return tp['戌'] === '亥';
                },
                penalty: { eFactor: 0.70, gradeShift: -1 }
            },
            {
                id: 'O02',
                name: '丧吊全逢',
                desc: '丧门+吊客同见于三传',
                check: (run, features) => {
                    // 丧门：日支前2位  吊客：日支后2位
                    const riZhi = run.Context ? run.Context.zhi : '';
                    const zIdx = DI_ZHI.indexOf(riZhi);
                    if (zIdx === -1) return false;
                    const sangMen = DI_ZHI[(zIdx + 2) % 12];
                    const diaoKe = DI_ZHI[(zIdx + 10) % 12];
                    const sc = run.三传 || {};
                    const scArr = [sc.初传, sc.中传, sc.末传];
                    return scArr.includes(sangMen) && scArr.includes(diaoKe);
                },
                penalty: { eFactor: 0.70, gradeShift: -1 }
            },
            {
                id: 'O03',
                name: '初传空亡乘白虎',
                desc: '初传空+白虎，虚惊带血光',
                check: (run, features) => {
                    // 需天将系统配合
                    return features && features.features && features.features.isChuKong && features.features.isBaiHuChu;
                },
                penalty: { eFactor: 0.65, gradeShift: -1 }
            },
            {
                id: 'O04',
                name: '罗网日',
                desc: '日干之前后辰为罗网',
                check: (run, features) => {
                    const riGan = run.Context ? run.Context.gan : '';
                    const JIGONG = {'甲':'寅','乙':'辰','丙':'巳','丁':'未','戊':'巳','己':'未','庚':'申','辛':'戌','壬':'亥','癸':'丑'};
                    const jiGong = JIGONG[riGan];
                    const jIdx = DI_ZHI.indexOf(jiGong);
                    if (jIdx === -1) return false;
                    const luoWang1 = DI_ZHI[(jIdx + 1) % 12];
                    const luoWang2 = DI_ZHI[(jIdx + 11) % 12];
                    const sc = run.三传 || {};
                    const scArr = [sc.初传, sc.中传, sc.末传];
                    return scArr.includes(luoWang1) || scArr.includes(luoWang2);
                },
                penalty: { eFactor: 0.70, gradeShift: -1 }
            },
            {
                id: 'O05',
                name: '闭口课',
                desc: '初传遁干空亡，事不可言',
                check: (run, features) => {
                    return features && features.dunGanInfo && features.dunGanInfo.isChuKongByXun;
                },
                penalty: { eFactor: 0.70, gradeShift: -1 }
            },
        ],

        // ========== 🟡 YELLOW BOMBS（降两级）==========
        yellow: [
            {
                id: 'Y01',
                name: '龙战课',
                desc: '卯酉日占卯酉时，天地交战',
                check: (run, features) => {
                    const riZhi = run.Context ? run.Context.zhi : '';
                    return (riZhi === '卯' || riZhi === '酉') && 
                           (run.Context && (run.Context.shi === '卯' || run.Context.shi === '酉'));
                },
                penalty: { eFactor: 0.50, gradeShift: -2 }
            },
            {
                id: 'Y02',
                name: '三交课',
                desc: '交车互克，反复交战',
                check: (run, features) => {
                    // 四课交叉克：一课克三课且二课克四课
                    const sike = run.四课 || [];
                    if (sike.length < 4) return false;
                    const KE = { '木':'土', '土':'水', '水':'火', '火':'金', '金':'木' };
                    const wx0 = WUXING[sike[0].top] || '土';
                    const wx2 = WUXING[sike[2].top] || '土';
                    const wx1 = WUXING[sike[1].top] || '土';
                    const wx3 = WUXING[sike[3].top] || '土';
                    return (KE[wx0] === wx2 || KE[wx2] === wx0) && (KE[wx1] === wx3 || KE[wx3] === wx1);
                },
                penalty: { eFactor: 0.50, gradeShift: -2 }
            },
            {
                id: 'Y03',
                name: '八专+中末传同',
                desc: '八专课中末传相同，极度内耗',
                check: (run, features) => {
                    const method = run.九宗门路由变量 ? run.九宗门路由变量.克贼类型 : '';
                    const sc = run.三传 || {};
                    return method.startsWith('八专') && sc.中传 === sc.末传;
                },
                penalty: { eFactor: 0.50, gradeShift: -2 }
            },
            {
                id: 'Y04',
                name: '反吟+三传皆冲',
                desc: '返吟课三传全在对冲位',
                check: (run, features) => {
                    const method = run.九宗门路由变量 ? run.九宗门路由变量.克贼类型 : '';
                    if (!method.startsWith('返吟')) return false;
                    const sc = run.三传 || {};
                    const CHONG = {'子':'午','丑':'未','寅':'申','卯':'酉','辰':'戌','巳':'亥','午':'子','未':'丑','申':'寅','酉':'卯','戌':'辰','亥':'巳'};
                    // 简化：检查初传与日干上神对冲
                    const sike = run.四课 || [];
                    if (sike.length < 1) return false;
                    return CHONG[sc.初传] === (sike[0].top || sike[0].upper);
                },
                penalty: { eFactor: 0.50, gradeShift: -2 }
            },
        ],
    };

    // ==========================================
    // Bomb Rules 执行引擎
    // ==========================================

    /**
     * 扫描所有Bomb Rules
     * @param {object} runResult - ALGO.run() 结果
     * @param {object} features - QUANT_ENGINE.extractFeatures() 结果
     * @param {object} wangShuaiResult - 旺衰结果（可选）
     * @param {object} dunGanResult - 遁干结果（可选）
     * @returns {object} Bomb扫描结果
     */
    function scan(runResult, features, wangShuaiResult, dunGanResult) {
        const triggeredBombs = [];
        let maxSeverity = 'none'; // none < orange < yellow < red
        let eCap = 1.0;
        let eFactor = 1.0;
        let gradeShift = 0;

        // 构建检查上下文
        const checkContext = {
            ...features,
            wangShuaiInfo: wangShuaiResult,
            dunGanInfo: dunGanResult,
        };

        // 扫描各级Bomb
        const levels = ['red', 'yellow', 'orange'];
        for (const level of levels) {
            for (const bomb of BOMB_DEFINITIONS[level]) {
                try {
                    if (bomb.check(runResult, checkContext)) {
                        triggeredBombs.push({
                            level,
                            id: bomb.id,
                            name: bomb.name,
                            desc: bomb.desc,
                            penalty: bomb.penalty,
                        });

                        // 应用惩罚
                        if (level === 'red') {
                            maxSeverity = 'red';
                            eCap = Math.min(eCap, bomb.penalty.eCap || 0.10);
                        } else if (level === 'yellow') {
                            if (maxSeverity !== 'red') maxSeverity = 'yellow';
                            eFactor *= (bomb.penalty.eFactor || 0.50);
                            gradeShift += (bomb.penalty.gradeShift || -2);
                        } else if (level === 'orange') {
                            if (maxSeverity === 'none') maxSeverity = 'orange';
                            eFactor *= (bomb.penalty.eFactor || 0.70);
                            gradeShift += (bomb.penalty.gradeShift || -1);
                        }
                    }
                } catch(e) {
                    // Bomb检查异常不阻断流程
                    console.warn(`[BOMB_RULES] 检查 ${bomb.id} 异常:`, e.message);
                }
            }
        }

        return {
            triggered: triggeredBombs,
            severity: maxSeverity,
            eCap,
            eFactor,
            gradeShift,
            count: {
                red: triggeredBombs.filter(b => b.level === 'red').length,
                yellow: triggeredBombs.filter(b => b.level === 'yellow').length,
                orange: triggeredBombs.filter(b => b.level === 'orange').length,
            },
            summary: buildBombSummary(triggeredBombs),
        };
    }

    /**
     * 应用Bomb修正到E值结果
     * @param {object} eResult - QUANT_ENGINE.calculate() 结果
     * @param {object} bombResult - scan() 结果
     * @returns {object} 修正后的E值结果
     */
    function apply(eResult, bombResult) {
        if (bombResult.severity === 'none') {
            return {
                ...eResult,
                bombResult,
                E_final: eResult.E,
                grade_final: eResult.grade,
            };
        }

        let E_final = eResult.E;

        // 乘法衰减
        E_final *= bombResult.eFactor;

        // 钳位上限
        if (bombResult.eCap < 1.0) {
            E_final = Math.min(E_final, bombResult.eCap);
        }

        // 等级降级
        const grades = ['大凶', '凶', '小凶', '平', '小吉', '吉', '大吉'];
        let currentGradeIdx = grades.indexOf(eResult.grade);
        if (currentGradeIdx === -1) currentGradeIdx = 3; // 平
        let newGradeIdx = Math.max(0, currentGradeIdx + bombResult.gradeShift);

        // RED强制大凶
        if (bombResult.severity === 'red') {
            newGradeIdx = 0;
            E_final = Math.min(E_final, 0.10);
        }

        E_final = Math.max(0.0, Math.min(1.0, E_final));

        return {
            ...eResult,
            bombResult,
            E_final: parseFloat(E_final.toFixed(4)),
            grade_final: grades[newGradeIdx],
            bombApplied: true,
        };
    }

    /**
     * 构建Bomb摘要文本
     */
    function buildBombSummary(triggeredBombs) {
        if (triggeredBombs.length === 0) return '无危险信号';
        
        const parts = triggeredBombs.map(b => {
            const icon = b.level === 'red' ? '🔴' : b.level === 'yellow' ? '🟡' : '🟠';
            return `${icon}${b.name}(${b.id}): ${b.desc}`;
        });
        return parts.join(' | ');
    }

    /**
     * 领域特定Bomb Rules扩展
     * 不同领域有额外的Bomb规则
     */
    const DOMAIN_BOMBS = {
        'stock': [
            {
                id: 'S01', name: '兄弟劫财发用', desc: '比劫发用主散财',
                check: (run, ctx) => {
                    const sc = run.三传 || {};
                    const riGan = run.Context ? run.Context.gan : '';
                    const chuWX = WUXING[sc.初传] || '土';
                    const ganWX = WUXING[riGan] || '土';
                    return chuWX === ganWX; // 同五行=比劫
                },
                penalty: { eFactor: 0.70, gradeShift: -1 }
            },
            {
                id: 'S02', name: '财空亡', desc: '财爻空亡，求财落空',
                check: (run, ctx) => {
                    const sc = run.三传 || {};
                    const riGan = run.Context ? run.Context.gan : '';
                    const SHENG = {'木':'火','火':'土','土':'金','金':'水','水':'木'};
                    const ganWX = WUXING[riGan] || '土';
                    const caiWX = SHENG[ganWX]; // 我生者为食伤，克我者为官杀，我克者为财
                    const KE = {'木':'土','土':'水','水':'火','火':'金','金':'木'};
                    const realCaiWX = KE[ganWX]; // 我克者为财
                    const scArr = [sc.初传, sc.中传, sc.末传];
                    // 检查财爻是否在三传且空亡
                    const caiZhi = scArr.find(s => WUXING[s] === realCaiWX);
                    return caiZhi && ctx && ctx.features && ctx.features.isChuKong && WUXING[sc.初传] === realCaiWX;
                },
                penalty: { eFactor: 0.60, gradeShift: -1 }
            },
        ],
        'health': [
            {
                id: 'H01', name: '白虎临日干', desc: '白虎临干主血光灾病',
                check: (run, ctx) => {
                    // 需天将系统配合
                    return ctx && ctx.features && ctx.features.isBaiHuLinGan;
                },
                penalty: { eFactor: 0.50, gradeShift: -2 }
            },
        ],
        'marriage': [
            {
                id: 'M01', name: '日辰互冲', desc: '干支对冲，夫妻反目',
                check: (run, ctx) => {
                    const CHONG = {'子':'午','丑':'未','寅':'申','卯':'酉','辰':'戌','巳':'亥','午':'子','未':'丑','申':'寅','酉':'卯','戌':'辰','亥':'巳'};
                    const riGan = run.Context ? run.Context.gan : '';
                    const riZhi = run.Context ? run.Context.zhi : '';
                    // 检查干上神与支对冲，或支上神与干寄宫对冲
                    const sike = run.四课 || [];
                    if (sike.length < 4) return false;
                    const JIGONG = {'甲':'寅','乙':'辰','丙':'巳','丁':'未','戊':'巳','己':'未','庚':'申','辛':'戌','壬':'亥','癸':'丑'};
                    const jiGong = JIGONG[riGan];
                    return CHONG[sike[0].top] === riZhi || CHONG[sike[2].top] === jiGong;
                },
                penalty: { eFactor: 0.60, gradeShift: -1 }
            },
        ],
    };

    /**
     * 带领域扩展的扫描
     */
    function scanWithDomain(runResult, features, wangShuaiResult, dunGanResult, domain) {
        // 先执行通用扫描
        const baseResult = scan(runResult, features, wangShuaiResult, dunGanResult);

        // 再执行领域特定扫描
        const domainBombs = DOMAIN_BOMBS[domain] || [];
        const domainTriggered = [];

        const checkContext = {
            ...features,
            wangShuaiInfo: wangShuaiResult,
            dunGanInfo: dunGanResult,
        };

        for (const bomb of domainBombs) {
            try {
                if (bomb.check(runResult, checkContext)) {
                    domainTriggered.push({
                        level: 'orange',
                        id: bomb.id,
                        name: bomb.name,
                        desc: bomb.desc,
                        penalty: bomb.penalty,
                        isDomainSpecific: true,
                    });
                    baseResult.eFactor *= (bomb.penalty.eFactor || 0.70);
                    baseResult.gradeShift += (bomb.penalty.gradeShift || -1);
                }
            } catch(e) {
                console.warn(`[BOMB_RULES] 领域检查 ${bomb.id} 异常:`, e.message);
            }
        }

        baseResult.triggered = [...baseResult.triggered, ...domainTriggered];
        baseResult.count.domain = domainTriggered.length;
        baseResult.summary = buildBombSummary(baseResult.triggered);

        return baseResult;
    }

    // ===== 导出 =====
    return {
        scan,
        apply,
        scanWithDomain,
        BOMB_DEFINITIONS,
        DOMAIN_BOMBS,
    };

})();
