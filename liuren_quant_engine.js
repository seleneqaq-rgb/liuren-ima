/**
 * 大六壬四层扫描E值量化引擎 V2.0
 * 
 * 核心公式：E = Bᵢ × Dᵢ × Sᵢ
 *   Bᵢ = 课体定性层（格局基底分）
 *   Dᵢ = 生克动能层（三传生克链推演）
 *   Sᵢ = 状态衰减层（旺衰+神煞+空亡修正）
 * 
 * 最终：E × 年命微调(±0.2~0.3) → 吉凶定级
 * 
 * 依赖：WANG_SHUAI_ENGINE, DUN_GAN_ENGINE, ALGO
 */

window.QUANT_ENGINE = (function() {

    // ===== 五行生克关系 =====
    const SHENG = { '木':'火', '火':'土', '土':'金', '金':'水', '水':'木' };
    const KE    = { '木':'土', '土':'水', '水':'火', '火':'金', '金':'木' };
    const WUXING = {'甲':'木','乙':'木','丙':'火','丁':'火','戊':'土','己':'土','庚':'金','辛':'金','壬':'水','癸':'水',
                    '子':'水','丑':'土','寅':'木','卯':'木','辰':'土','巳':'火','午':'火','未':'土','申':'金','酉':'金','戌':'土','亥':'水'};
    const YINYANG = {'甲':1,'乙':0,'丙':1,'丁':0,'戊':1,'己':0,'庚':1,'辛':0,'壬':1,'癸':0};

    // ===== 吉凶定级阈值 =====
    const GRADE_THRESHOLD = {
        '大吉': 0.85,
        '吉':   0.70,
        '小吉': 0.55,
        '平':   0.45,
        '小凶': 0.35,
        '凶':   0.20,
        '大凶': 0.00
    };

    // ===== 课体基底分Bᵢ映射表 =====
    const KETI_BI_MAP = {
        // 九宗门基底
        '元首': 0.90, '重审': 0.70, '比用': 0.65, '知一': 0.60,
        '涉害': 0.50, '遥克': 0.55, '蒿矢': 0.50, '弹射': 0.45,
        '昴星': 0.45, '别责': 0.40, '八专': 0.40, '伏吟': 0.45, '返吟': 0.45,
        // 伏吟子类型
        '自任': 0.50, '自信': 0.45, '杜传': 0.35,
        // 返吟子类型
        '无依': 0.40, '无亲': 0.50,
        // 涉害子类型
        '见机': 0.55, '察微': 0.50, '复等': 0.45,
        // 昴星子类型
        '虎视': 0.40, '掩目': 0.45,
    };

    // ===== 特种凶课修正因子 =====
    const SPECIAL_KETI_PENALTY = {
        '天罗地网': 0.50,  // 辰加巳/戌加亥
        '两蛇夹墓': 0.30,  // 蛇夹日墓
        '魁度天门': 0.60,  // 戌加亥
        '罗网日': 0.60,    // 日干的前后辰
        '三交课': 0.45,    // 交叉反复
        '龙战课': 0.50,    // 卯酉日
        '死奇课': 0.35,    // 死气+死神+死期
        '灾厄课': 0.40,    // 丧门+吊客
        '殃咎课': 0.45,    // 传中遇害
        '孤辰课': 0.55,    // 旬空
        '闭口课': 0.50,    // 遁干空亡
    };

    // ===== 特种吉课修正因子 =====
    const SPECIAL_KETI_BOOST = {
        '三光课': 1.15,    // 日光+月光+星光
        '三阳课': 1.15,    // 阳气渐旺
        '三奇课': 1.20,    // 奇仪交辉
        '六仪课': 1.10,    // 六仪发动
        '富贵课': 1.15,    // 天乙+禄+马
        '轩盖课': 1.10,    // 天马+华盖
        '铸印课': 1.05,    // 戌+巳+丙
        '斫轮课': 1.05,    // 庚+申+卯
        '连珠课': 1.05,    // 三传连珠
        '亨通课': 1.10,    // 三传递生
        '繁昌课': 1.10,    // 夫妻交合
        '荣华课': 1.10,    // 禄马交驰
    };

    // ===== 六亲关系 =====
    const LIU_QIN = {
        '比肩': 0.75, '劫财': 0.65,
        '食神': 0.80, '伤官': 0.55,
        '偏财': 0.70, '正财': 0.80,
        '七杀': 0.35, '正官': 0.70,
        '偏印': 0.60, '正印': 0.85,
    };

    /**
     * 计算六亲关系
     * @param {string} dayGanWX - 日干五行
     * @param {string} targetWX - 目标五行
     * @returns {string} 六亲名称
     */
    function getLiuQin(dayGanWX, targetWX) {
        if (dayGanWX === targetWX) return '比肩';
        if (SHENG[dayGanWX] === targetWX) return '食神';
        if (KE[dayGanWX] === targetWX) return '偏财';
        if (SHENG[targetWX] === dayGanWX) return '正印';
        if (KE[targetWX] === dayGanWX) return '七杀';
        // dayGanWX生targetWX但不是食神(阴阳不同)
        return '伤官';
    }

    /**
     * 完整的六亲判定（含阴阳区分）
     */
    function getLiuQinFull(dayGan, targetGanOrZhi) {
        const dWX = WUXING[dayGan];
        const tWX = WUXING[targetGanOrZhi];
        const dYY = YINYANG[dayGan];
        const tYY = YINYANG[targetGanOrZhi];
        const sameYinYang = (dYY === tYY);

        if (dWX === tWX) return sameYinYang ? '比肩' : '劫财';
        if (SHENG[dWX] === tWX) return sameYinYang ? '食神' : '伤官';
        if (KE[dWX] === tWX) return sameYinYang ? '偏财' : '正财';
        if (SHENG[tWX] === dWX) return sameYinYang ? '偏印' : '正印';
        if (KE[tWX] === dWX) return sameYinYang ? '七杀' : '正官';
        return '比肩'; // fallback
    }

    // ==========================================
    // 第0层：特征向量提取
    // ==========================================
    function extractFeatures(runResult) {
        const riGan = runResult.Context ? runResult.Context.gan : '';
        const riZhi = runResult.Context ? runResult.Context.zhi : '';
        const method = runResult.九宗门路由变量 ? runResult.九宗门路由变量.克贼类型 : '';
        const sc = runResult.三传 || {};
        const sike = runResult.四课 || [];
        const tp = runResult.天地盘 || {};

        // 日干五行与阴阳
        const ganWX = WUXING[riGan] || '土';
        const zhiWX = WUXING[riZhi] || '土';

        // 三传五行
        const scZhi = [sc.初传, sc.中传, sc.末传].filter(Boolean);
        const scWX = scZhi.map(z => WUXING[z] || '土');

        // 三传六亲（以日干定）
        const scLQ = scWX.map(w => getLiuQinFull(riGan, scZhi[scWX.indexOf(w)] || ''));

        // 三传生克链
        const scRelation = [];
        for (let i = 0; i < scWX.length - 1; i++) {
            if (SHENG[scWX[i]] === scWX[i+1]) scRelation.push('生');
            else if (KE[scWX[i]] === scWX[i+1]) scRelation.push('克');
            else scRelation.push('无');
        }

        return {
            riGan, riZhi, ganWX, zhiWX, method,
            scZhi, scWX, scLQ, scRelation,
            sike, tp,
            // 特征标记
            features: {
                // 三传递生
                isDiSheng: scRelation.every(r => r === '生'),
                // 三传互克
                isHuKe: scRelation.every(r => r === '克'),
                // 初财生鬼（初传为财，中传为鬼）
                isCaiShengGui: scLQ[0] && (scLQ[0].includes('财')) && scLQ[1] && (scLQ[1].includes('杀') || scLQ[1].includes('官')),
                // 兄弟合局
                isXiongDiHeJu: scLQ.filter(l => l.includes('比') || l.includes('劫')).length >= 2,
                // 禄马交驰
                isLuMaJiaoChi: checkLuMaJiaoChi(riGan, scZhi),
                // 初末引从
                isYinCong: checkYinCong(scZhi, sike, tp),
                // 初传空亡
                isChuKong: checkKongWang(riGan, riZhi, sc.初传),
            }
        };
    }

    // ===== 辅助判断函数 =====

    function checkLuMaJiaoChi(riGan, scZhi) {
        // 日禄查表
        const LU = {'甲':'寅','乙':'卯','丙':'巳','丁':'午','戊':'巳','己':'午','庚':'申','辛':'酉','壬':'亥','癸':'子'};
        // 驿马查表（以日支三合局推）
        const MA = {'寅':'申','申':'寅','巳':'亥','亥':'巳','子':'寅','午':'申','丑':'亥','未':'巳','辰':'寅','戌':'申','卯':'巳','酉':'亥'};
        const lu = LU[riGan];
        // 简化：日支驿马
        // 这里需要完整日支，先用简化版
        return scZhi.includes(lu); // 至少有禄
    }

    function checkYinCong(scZhi, sike, tp) {
        // 初末引从：初传与日干上神相邻引从
        if (!scZhi[0] || !scZhi[2] || !sike[0]) return false;
        const DI_ZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
        const chuIdx = DI_ZHI.indexOf(scZhi[0]);
        const moIdx = DI_ZHI.indexOf(scZhi[2]);
        const ganShangIdx = DI_ZHI.indexOf(sike[0].upper || sike[0].top);
        if (chuIdx === -1 || moIdx === -1 || ganShangIdx === -1) return false;
        // 引从：初在干上神前1位，末在干上神后1位
        return (chuIdx === (ganShangIdx + 1) % 12 && moIdx === (ganShangIdx + 11) % 12) ||
               (moIdx === (ganShangIdx + 1) % 12 && chuIdx === (ganShangIdx + 11) % 12);
    }

    function checkKongWang(riGan, riZhi, zhi) {
        // 旬空查表
        const GANZHI = [];
        const TG = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
        const DZ = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
        for (let i = 0; i < 60; i++) GANZHI.push(TG[i%10] + DZ[i%12]);
        const gzIdx = GANZHI.indexOf(riGan + riZhi);
        if (gzIdx === -1) return false;
        const xunStart = Math.floor(gzIdx / 10) * 10;
        const kong1 = DZ[(xunStart + 10) % 12];
        const kong2 = DZ[(xunStart + 11) % 12];
        return zhi === kong1 || zhi === kong2;
    }

    // ==========================================
    // 第一层：课体定性层 Bᵢ
    // ==========================================
    function calcBi(features) {
        const method = features.method;
        // 取基底分
        let bi = 0.60; // 默认平

        // 先按九宗门方法取基底
        const baseMethod = method.split('(')[0];
        if (KETI_BI_MAP[baseMethod] !== undefined) {
            bi = KETI_BI_MAP[baseMethod];
        }

        // 子类型修正
        const subTypes = method.match(/\(([^)]+)\)/);
        if (subTypes) {
            const sub = subTypes[1];
            // 拆分多个子类型
            const parts = sub.split(/[，,]/);
            for (const p of parts) {
                if (KETI_BI_MAP[p] !== undefined) {
                    // 子类型不覆盖，而是取更严格的
                    bi = Math.min(bi, KETI_BI_MAP[p]);
                }
            }
        }

        // 特种凶课惩罚
        if (features.specialKeti) {
            for (const sk of features.specialKeti) {
                if (SPECIAL_KETI_PENALTY[sk] !== undefined) {
                    bi *= SPECIAL_KETI_PENALTY[sk];
                }
            }
        }

        // 特种吉课增益
        if (features.specialKetiJi) {
            for (const sk of features.specialKetiJi) {
                if (SPECIAL_KETI_BOOST[sk] !== undefined) {
                    bi *= SPECIAL_KETI_BOOST[sk];
                }
            }
        }

        return Math.max(0.05, Math.min(1.0, bi));
    }

    // ==========================================
    // 第二层：生克动能层 Dᵢ
    // ==========================================
    function calcDi(features) {
        const f = features.features;
        let di = 0.65; // 默认偏平

        // 三传递生 → 动能顺畅
        if (f.isDiSheng) di = 1.0;

        // 三传互克 → 内耗严重
        if (f.isHuKe) di = 0.30;

        // 初财生鬼 → 高位接盘暴雷
        if (f.isCaiShengGui) di = 0.40;

        // 兄弟合局 → 无抵抗阴跌
        if (f.isXiongDiHeJu) di = 0.50;

        // 禄马交驰 → 单边逼空
        if (f.isLuMaJiaoChi) di = 1.0;

        // 初末引从 → 推力格
        if (f.isYinCong) di = 0.90;

        // ===== 细化：三传六亲组合评分 =====
        const scLQ = features.scLQ;
        if (scLQ.length === 3) {
            // 初传为印 → 有后盾
            if (scLQ[0].includes('印')) di = Math.max(di, 0.80);
            // 初传为官杀 → 压力启动
            if (scLQ[0].includes('杀') || scLQ[0].includes('官')) di = Math.min(di, 0.50);
            // 初传为财 → 利益驱动
            if (scLQ[0].includes('财')) di = Math.max(di, 0.70);
            // 末传为印 → 善终
            if (scLQ[2].includes('印')) di = Math.max(di, di * 1.1);
            // 末传为杀 → 恶终
            if (scLQ[2].includes('杀')) di = Math.min(di, di * 0.8);
        }

        // ===== 三传五行链细化 =====
        const scRelation = features.scRelation;
        if (scRelation.length === 2) {
            // 生→生：递生格，最顺
            if (scRelation[0] === '生' && scRelation[1] === '生') di = Math.max(di, 0.95);
            // 克→克：递克格，最逆
            if (scRelation[0] === '克' && scRelation[1] === '克') di = Math.min(di, 0.25);
            // 生→克：先顺后逆
            if (scRelation[0] === '生' && scRelation[1] === '克') di = 0.55;
            // 克→生：先逆后顺（破镜重圆）
            if (scRelation[0] === '克' && scRelation[1] === '生') di = 0.65;
        }

        return Math.max(0.10, Math.min(1.0, di));
    }

    // ==========================================
    // 第三层：状态衰减层 Sᵢ
    // ==========================================
    function calcSi(features, wangShuaiResult) {
        let si = 0.70; // 默认偏平

        // ===== 核心衰减：日干旺衰 =====
        if (wangShuaiResult && wangShuaiResult.ganWS) {
            const wsMap = { '旺': 1.0, '相': 0.85, '休': 0.70, '囚': 0.50, '死': 0.30 };
            si = wsMap[wangShuaiResult.ganWS] || 0.70;
        }

        // ===== 初传空亡衰减 =====
        if (features.features.isChuKong) {
            si *= 0.60; // 事体虚浮
        }

        // ===== 空上乘空 =====
        // 需要遁干系统配合，此处预留接口
        if (features.features.isKongShangKong) {
            si *= 0.30;
        }

        // ===== 日德临干增益 =====
        if (features.features.isDeLinGan) {
            si *= 1.10;
        }

        // ===== 日禄临干增益 =====
        if (features.features.isLuLinGan) {
            si *= 1.10;
        }

        // ===== 三传旺衰综合 =====
        if (wangShuaiResult && wangShuaiResult.scWS) {
            const scScores = wangShuaiResult.scWS.map(s => s.score || 3);
            const avgScore = scScores.reduce((a, b) => a + b, 0) / scScores.length;
            // avgScore 范围 1-5，映射到衰减因子 0.4-1.0
            const scFactor = 0.4 + (avgScore - 1) * 0.15;
            si *= scFactor;
        }

        return Math.max(0.05, Math.min(1.0, si));
    }

    // ==========================================
    // 主计算入口
    // ==========================================

    /**
     * 完整E值计算
     * @param {object} runResult - ALGO.run() 的返回结果
     * @param {object} wangShuaiResult - 旺衰引擎计算结果（可选）
     * @param {object} dunGanResult - 遁干系统结果（可选）
     * @param {object} nianMingResult - 年命系统结果（可选）
     * @returns {object} E值量化结果
     */
    function calculate(runResult, wangShuaiResult, dunGanResult, nianMingResult) {
        // 第0层：特征提取
        const features = extractFeatures(runResult);

        // 补充遁干信息到特征
        if (dunGanResult) {
            features.dunGanInfo = dunGanResult;
            // 暗鬼检测
            if (dunGanResult.anGuiList && dunGanResult.anGuiList.length > 0) {
                features.features.isAnGui = true;
                features.features.anGuiCount = dunGanResult.anGuiList.length;
            }
        }

        // 第一层：课体定性
        const Bi = calcBi(features);

        // 第二层：生克动能
        const Di = calcDi(features);

        // 第三层：状态衰减
        const Si = calcSi(features, wangShuaiResult);

        // E值计算
        let E = Bi * Di * Si;

        // 年命微调
        let nianMingAdjust = 0;
        if (nianMingResult) {
            nianMingAdjust = calcNianMingAdjust(nianMingResult, features);
            E += nianMingAdjust;
        }

        // 暗鬼额外衰减
        if (features.features.isAnGui) {
            E *= (1 - 0.05 * (features.features.anGuiCount || 1));
        }

        // 钳位
        E = Math.max(0.0, Math.min(1.0, E));

        // 吉凶定级
        const grade = getGrade(E);

        return {
            E: parseFloat(E.toFixed(4)),
            Bi: parseFloat(Bi.toFixed(4)),
            Di: parseFloat(Di.toFixed(4)),
            Si: parseFloat(Si.toFixed(4)),
            nianMingAdjust: parseFloat(nianMingAdjust.toFixed(4)),
            grade,
            features,
            breakdown: {
                ketiBase: Bi,
                shengKeDongNeng: Di,
                zhuangTaiShuaiJian: Si,
                riGanWangShuai: wangShuaiResult ? wangShuaiResult.ganWS : '未计算',
                sanChuanLiuQin: features.scLQ,
                sanChuanRelation: features.scRelation,
            }
        };
    }

    /**
     * 年命微调计算
     */
    function calcNianMingAdjust(nianMingResult, features) {
        let adjust = 0;
        const riGan = features.riGan;
        const riGanWX = features.ganWX;

        // 本命上神与日干的关系
        if (nianMingResult.benMingShangShen) {
            const bmWX = WUXING[nianMingResult.benMingShangShen] || '土';
            const lq = getLiuQin(riGanWX, bmWX);
            if (lq === '正印' || lq === '食神') adjust += 0.15;
            if (lq === '七杀' || lq === '伤官') adjust -= 0.15;
            if (lq === '正财' || lq === '正官') adjust += 0.10;
        }

        // 行年上神与日干的关系
        if (nianMingResult.xingNianShangShen) {
            const xnWX = WUXING[nianMingResult.xingNianShangShen] || '土';
            const lq = getLiuQin(riGanWX, xnWX);
            if (lq === '正印' || lq === '食神') adjust += 0.10;
            if (lq === '七杀' || lq === '伤官') adjust -= 0.10;
        }

        // 限制微调范围
        return Math.max(-0.30, Math.min(0.30, adjust));
    }

    /**
     * E值→吉凶定级
     */
    function getGrade(E) {
        if (E >= 0.85) return '大吉';
        if (E >= 0.70) return '吉';
        if (E >= 0.55) return '小吉';
        if (E >= 0.45) return '平';
        if (E >= 0.35) return '小凶';
        if (E >= 0.20) return '凶';
        return '大凶';
    }

    /**
     * 领域加权计算
     * 不同领域对E值各层权重不同
     * @param {object} eResult - calculate()的结果
     * @param {string} domain - 领域标识
     * @returns {object} 加权后的E值结果
     */
    function domainWeighted(eResult, domain) {
        // 领域权重配置 [B权重, D权重, S权重]
        const DOMAIN_WEIGHTS = {
            'basket':    [0.25, 0.45, 0.30],  // 篮球：重动能
            'soccer':    [0.30, 0.40, 0.30],  // 足球：较均衡
            'esport':    [0.20, 0.50, 0.30],  // 电竞：极重动能
            'stock':     [0.35, 0.30, 0.35],  // 股市：重基底+状态
            'marriage':  [0.40, 0.30, 0.30],  // 婚姻：重课体定性
            'health':    [0.30, 0.25, 0.45],  // 疾病：重状态衰减
            'lawsuit':   [0.35, 0.40, 0.25],  // 官讼：重课体+动能
            'travel':    [0.25, 0.35, 0.40],  // 出行：重状态
            'exam':      [0.40, 0.25, 0.35],  // 考学：重课体+状态
            'missing':   [0.20, 0.45, 0.35],  // 寻人：重动能+状态
            'general':   [0.33, 0.34, 0.33],  // 通用：均权
        };

        const w = DOMAIN_WEIGHTS[domain] || DOMAIN_WEIGHTS['general'];

        // 重算E值：加权几何平均
        const E_weighted = Math.pow(eResult.Bi, w[0]) * 
                          Math.pow(eResult.Di, w[1]) * 
                          Math.pow(eResult.Si, w[2]);

        const E_final = Math.max(0.0, Math.min(1.0, E_weighted + eResult.nianMingAdjust));
        const grade = getGrade(E_final);

        return {
            ...eResult,
            E_weighted: parseFloat(E_final.toFixed(4)),
            grade_weighted: grade,
            domainWeights: { Bi: w[0], Di: w[1], Si: w[2] },
            domain,
        };
    }

    // ===== 导出 =====
    return {
        calculate,
        domainWeighted,
        extractFeatures,
        calcBi,
        calcDi,
        calcSi,
        getGrade,
        getLiuQinFull,
        KETI_BI_MAP,
        SPECIAL_KETI_PENALTY,
        SPECIAL_KETI_BOOST,
        GRADE_THRESHOLD,
    };

})();
