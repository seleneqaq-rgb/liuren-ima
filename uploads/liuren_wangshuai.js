/**
 * 大六壬旺衰计算引擎 V1.0
 * 
 * 核心逻辑：以日干五行对照月令五行，判定旺/相/休/囚/死五级
 * 同时计算三传、四课各神的旺衰状态
 * 
 * 旺衰判定规则（以日干五行为"我"，月令五行为"令"）：
 *   我===令         → 旺（当令得时）
 *   令生我          → 相（得生有力）
 *   我生令          → 休（泄气减力）
 *   我克令          → 囚（耗力费力）
 *   令克我          → 死（受制无力）
 */

window.WANG_SHUAI_ENGINE = (function() {

    // ===== 五行生克关系表 =====
    const SHENG = { '木':'火', '火':'土', '土':'金', '金':'水', '水':'木' };  // A生B
    const KE    = { '木':'土', '土':'水', '水':'火', '火':'金', '金':'木' };  // A克B

    // ===== 旺衰等级映射 =====
    const WS_LABEL = ['旺','相','休','囚','死'];
    const WS_SCORE = { '旺': 5, '相': 4, '休': 3, '囚': 2, '死': 1 };
    const WS_FACTOR = { '旺': 1.0, '相': 0.85, '休': 0.7, '囚': 0.5, '死': 0.3 };

    /**
     * 判定单个五行相对于月令的旺衰
     * @param {string} myWX - 待判定的五行（如 '木'）
     * @param {string} yueLingWX - 月令五行（如 '火'）
     * @returns {string} '旺'|'相'|'休'|'囚'|'死'
     */
    function judgeWangShuai(myWX, yueLingWX) {
        if (myWX === yueLingWX) return '旺';           // 同行当令
        if (SHENG[yueLingWX] === myWX) return '相';     // 月令生我
        if (SHENG[myWX] === yueLingWX) return '休';     // 我生月令（泄气）
        if (KE[myWX] === yueLingWX) return '囚';        // 我克月令（耗力）
        if (KE[yueLingWX] === myWX) return '死';        // 月令克我（受制）
        return '休'; // fallback（理论上不会走到）
    }

    /**
     * 从天干或地支获取五行
     * @param {string} char - 天干或地支字符
     * @returns {string} 五行
     */
    function getWuXing(char) {
        return window.WUXING ? window.WUXING[char] : 
               (window.GAN_WUXING || {})[char] || (window.ZHI_WUXING || {})[char] || '土';
    }

    /**
     * 获取月令地支
     * 月令 = 当前月建（由节气决定的地支）
     * 从起课时间的八字中取月支即为月令
     * @param {object} currentRun - 排盘结果
     * @returns {string} 月令地支
     */
    function getYueLing(currentRun) {
        // 方式1：从八字的月柱提取月令
        if (currentRun.Meta && currentRun.Meta.BaZi) {
            const bazi = currentRun.Meta.BaZi;
            // 格式："甲子年 丙寅月 戊辰日 庚午时"
            const monthPart = bazi.split(' ')[1]; // "丙寅月"
            if (monthPart) {
                return monthPart.charAt(1); // 月支
            }
        }
        // 方式2：从Context中取
        if (currentRun.Context && currentRun.Context.yueJian) {
            return currentRun.Context.yueJian;
        }
        // 方式3：从月将反推（月将与月建相冲）
        if (currentRun.Meta && currentRun.Meta.YueJiang) {
            const DI_ZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
            const CHONG = {'子':'午','丑':'未','寅':'申','卯':'酉','辰':'戌','巳':'亥','午':'子','未':'丑','申':'寅','酉':'卯','戌':'辰','亥':'巳'};
            return CHONG[currentRun.Meta.YueJiang];
        }
        return '寅'; // 兜底：春月
    }

    /**
     * 主计算入口：计算当前课式的完整旺衰信息
     * @param {object} currentRun - 排盘结果 (STATE.currentRun)
     * @returns {object} 旺衰分析结果
     */
    function calculate(currentRun) {
        if (!currentRun) return null;

        const yueLing = getYueLing(currentRun);
        const yueLingWX = getWuXing(yueLing);

        // 1. 日干旺衰
        const riGan = currentRun.Context ? currentRun.Context.gan : '';
        const ganWX = getWuXing(riGan);
        const ganWS = riGan ? judgeWangShuai(ganWX, yueLingWX) : '休';

        // 2. 日支旺衰
        const riZhi = currentRun.Context ? currentRun.Context.zhi : '';
        const zhiWX = getWuXing(riZhi);
        const zhiWS = riZhi ? judgeWangShuai(zhiWX, yueLingWX) : '休';

        // 3. 三传旺衰
        const scWS = (currentRun.SanChuan || []).map(sc => {
            const wx = getWuXing(sc.Zhi);
            return {
                zhi: sc.Zhi,
                wuXing: wx,
                wangShuai: judgeWangShuai(wx, yueLingWX),
                score: WS_SCORE[judgeWangShuai(wx, yueLingWX)],
                factor: WS_FACTOR[judgeWangShuai(wx, yueLingWX)]
            };
        });

        // 4. 四课旺衰
        const sikeWS = (currentRun.SiKe || []).map(sk => {
            const topWX = getWuXing(sk.Top);
            const topWS = judgeWangShuai(topWX, yueLingWX);
            // 下神的旺衰：如果是天干，取其寄宫五行
            let botZhi = sk.Bottom;
            if (sk.isGan && window.JIGONG) {
                botZhi = window.JIGONG[sk.Bottom] || sk.Bottom;
            }
            const botWX = getWuXing(botZhi);
            const botWS = judgeWangShuai(botWX, yueLingWX);
            return {
                top: { zhi: sk.Top, wuXing: topWX, wangShuai: topWS, score: WS_SCORE[topWS], factor: WS_FACTOR[topWS] },
                bottom: { zhi: botZhi, wuXing: botWX, wangShuai: botWS, score: WS_SCORE[botWS], factor: WS_FACTOR[botWS] }
            };
        });

        // 5. 日干上神旺衰（第一课上神）
        const ganShangWS = sikeWS.length > 0 ? sikeWS[0].top : null;

        // 6. 日支上神旺衰（第三课上神）
        const zhiShangWS = sikeWS.length > 2 ? sikeWS[2].top : null;

        // 7. 综合旺衰评估
        const summary = _buildSummary(ganWS, zhiWS, scWS, sikeWS);

        return {
            yueLing,               // 月令地支
            yueLingWX,             // 月令五行
            ganWS,                 // 日干旺衰
            ganWuXing: ganWX,      // 日干五行
            ganScore: WS_SCORE[ganWS],
            ganFactor: WS_FACTOR[ganWS],
            zhiWS,                 // 日支旺衰
            zhiWuXing: zhiWX,      // 日支五行
            zhiScore: WS_SCORE[zhiWS],
            zhiFactor: WS_FACTOR[zhiWS],
            ganShangWS,            // 干上神旺衰
            zhiShangWS,            // 支上神旺衰
            scWS,                  // 三传旺衰
            sikeWS,                // 四课旺衰
            summary                // 综合评估
        };
    }

    /**
     * 综合旺衰评估
     * 输出：整体能量值、吉凶倾向、关键判断
     */
    function _buildSummary(ganWS, zhiWS, scWS, sikeWS) {
        // 日干能量
        const ganEnergy = WS_SCORE[ganWS];

        // 三传平均能量
        const scAvg = scWS.length > 0 
            ? scWS.reduce((sum, s) => sum + s.score, 0) / scWS.length 
            : 3;

        // 初传能量（最关键）
        const chuEnergy = scWS.length > 0 ? scWS[0].score : 3;

        // 四课上神平均能量
        const sikeAvg = sikeWS.length > 0
            ? sikeWS.reduce((sum, s) => sum + s.top.score, 0) / sikeWS.length
            : 3;

        // 整体能量 (日干40% + 初传30% + 三传均15% + 四课均15%)
        const overallEnergy = ganEnergy * 0.4 + chuEnergy * 0.3 + scAvg * 0.15 + sikeAvg * 0.15;

        // 吉凶倾向
        let tendency;
        if (overallEnergy >= 4.0) tendency = '得令有力';
        else if (overallEnergy >= 3.0) tendency = '气数平平';
        else if (overallEnergy >= 2.0) tendency = '失令减力';
        else tendency = '气绝无力';

        // 关键判断标志
        const flags = [];

        // 日干旺相
        if (ganWS === '旺' || ganWS === '相') flags.push('日干得令');
        if (ganWS === '囚' || ganWS === '死') flags.push('日干失令');

        // 初传旺相
        if (chuEnergy >= 4) flags.push('初传有力');
        if (chuEnergy <= 2) flags.push('初传无力');

        // 全传旺相
        if (scWS.every(s => s.score >= 4)) flags.push('三传全旺');
        if (scWS.every(s => s.score <= 2)) flags.push('三传全衰');

        // 日干死+初传死
        if (ganWS === '死' && chuEnergy === 1) flags.push('干传双死');

        // 日干旺但初传空(需外部判断空亡)
        // 此处不判断空亡，留给外层

        return {
            overallEnergy: Math.round(overallEnergy * 100) / 100,
            tendency,
            flags,
            ganEnergy,
            chuEnergy,
            scAvg: Math.round(scAvg * 100) / 100,
            sikeAvg: Math.round(sikeAvg * 100) / 100
        };
    }

    /**
     * 工具函数：根据天干获取长生十二宫状态
     * @param {string} gan - 天干
     * @param {string} zhi - 地支（要查询的位置）
     * @returns {string} 长生十二宫状态
     */
    function getChangSheng12(gan, zhi) {
        // 阳干顺排，阴干逆排
        const yangOrder = ['长生','沐浴','冠带','临官','帝旺','衰','病','死','墓','绝','胎','养'];
        
        const changShengStart = {
            '甲': '亥', '乙': '午', '丙': '寅', '丁': '酉',
            '戊': '寅', '己': '酉', '庚': '巳', '辛': '子',
            '壬': '申', '癸': '卯'
        };

        const DI_ZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
        const start = changShengStart[gan];
        if (!start) return '养';
        
        const startIdx = DI_ZHI.indexOf(start);
        const targetIdx = DI_ZHI.indexOf(zhi);
        if (targetIdx === -1) return '养';

        const isYang = window.YINYANG ? window.YINYANG[gan] === 1 : '甲丙戊庚壬'.includes(gan);
        
        let offset;
        if (isYang) {
            offset = (targetIdx - startIdx + 12) % 12;
        } else {
            offset = (startIdx - targetIdx + 12) % 12;
        }

        return yangOrder[offset];
    }

    // ===== 导出 =====
    return {
        calculate,
        judgeWangShuai,
        getWuXing,
        getYueLing,
        getChangSheng12,
        WS_SCORE,
        WS_FACTOR,
        SHENG,
        KE
    };

})();
