/**
 * 大六壬年命系统 V2.0
 * 
 * 年命 = 本命 + 行年 + 年命上神
 * 
 * 本命：出生年地支（生肖）
 * 行年：按性别和年龄推算的当年运程地支
 *   - 男命：1岁起寅，顺数
 *   - 女命：1岁起申，逆数
 * 年命上神：本命/行年所在天盘之上的神（即天盘[本命]）
 * 
 * 年命在断课中的作用：
 *   1. 微调E值（±0.2~0.3）
 *   2. 年命上神的六亲关系影响吉凶
 *   3. 本命与行年的冲合关系
 *   4. 年命入传（本命/行年出现在三传中）
 */

window.NIAN_MING_ENGINE = (function() {

    const DI_ZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
    const SHENG = { '木':'火', '火':'土', '土':'金', '金':'水', '水':'木' };
    const KE    = { '木':'土', '土':'水', '水':'火', '火':'金', '金':'木' };
    const WUXING = {'甲':'木','乙':'木','丙':'火','丁':'火','戊':'土','己':'土','庚':'金','辛':'金','壬':'水','癸':'水',
                    '子':'水','丑':'土','寅':'木','卯':'木','辰':'土','巳':'火','午':'火','未':'土','申':'金','酉':'金','戌':'土','亥':'水'};

    // ===== 生肖年地支映射 =====
    const SHENG_XIAO = {
        '鼠':'子','牛':'丑','虎':'寅','兔':'卯',
        '龙':'辰','蛇':'巳','马':'午','羊':'未',
        '猴':'申','鸡':'酉','狗':'戌','猪':'亥'
    };

    // ===== 出生年→地支对照表（2024年起算）=====
    // 用出生年对12取模推算生肖地支
    const YEAR_BASE = 2024; // 2024年=甲子年=鼠年
    const YEAR_ZHI_OFFSET = 0; // 2024年地支序号=子

    /**
     * 从出生年份计算本命地支
     * @param {number} birthYear - 出生年份（公历）
     * @returns {string} 本命地支
     */
    function calcBenMing(birthYear) {
        const offset = (birthYear - YEAR_BASE) % 12;
        const zhiIdx = ((offset % 12) + 12) % 12; // 处理负数
        return DI_ZHI[zhiIdx];
    }

    /**
     * 从生肖计算本命地支
     * @param {string} shengXiao - 生肖名（如"龙"）
     * @returns {string} 本命地支
     */
    function calcBenMingByShengXiao(shengXiao) {
        return SHENG_XIAO[shengXiao] || '子';
    }

    /**
     * 计算行年地支
     * @param {string} benMing - 本命地支
     * @param {number} age - 虚岁年龄
     * @param {string} gender - 性别 '男'/'女'
     * @returns {string} 行年地支
     */
    function calcXingNian(benMing, age, gender) {
        const benMingIdx = DI_ZHI.indexOf(benMing);
        if (benMingIdx === -1) return '寅'; // fallback

        if (gender === '男' || gender === 'male') {
            // 男命：1岁起寅，每岁顺数1位
            // 寅=2, 所以1岁对应寅(2)
            const xingNianIdx = (2 + (age - 1)) % 12;
            return DI_ZHI[xingNianIdx];
        } else {
            // 女命：1岁起申，每岁逆数1位
            // 申=8, 所以1岁对应申(8)
            const xingNianIdx = ((8 - (age - 1)) % 12 + 12) % 12;
            return DI_ZHI[xingNianIdx];
        }
    }

    /**
     * 获取年命上神
     * @param {string} nianMingZhi - 本命或行年地支
     * @param {object} tianPan - 天盘映射 {地盘支: 天盘支}
     * @returns {string|null} 年命上神地支
     */
    function getNianMingShangShen(nianMingZhi, tianPan) {
        if (!tianPan) return null;
        return tianPan[nianMingZhi] || null;
    }

    /**
     * 完整年命系统计算
     * @param {object} params - { birthYear/或benMing, age, gender, tianPan }
     * @returns {object} 年命完整信息
     */
    function calculate(params) {
        const { birthYear, benMing: inputBenMing, age, gender, tianPan, shengXiao } = params;

        // 1. 本命
        let benMing;
        if (inputBenMing) {
            benMing = inputBenMing;
        } else if (shengXiao) {
            benMing = calcBenMingByShengXiao(shengXiao);
        } else if (birthYear) {
            benMing = calcBenMing(birthYear);
        } else {
            benMing = '子'; // 默认
        }

        // 2. 行年
        const xingNian = calcXingNian(benMing, age || 1, gender || '男');

        // 3. 本命上神
        const benMingShangShen = getNianMingShangShen(benMing, tianPan);

        // 4. 行年上神
        const xingNianShangShen = getNianMingShangShen(xingNian, tianPan);

        // 5. 本命与行年的关系
        const benMingWX = WUXING[benMing] || '土';
        const xingNianWX = WUXING[xingNian] || '土';
        const bmXnRelation = getWuXingRelation(benMingWX, xingNianWX);

        // 6. 本命与日干的关系
        const riGan = params.riGan || '';
        const riGanWX = WUXING[riGan] || '土';
        const bmGanRelation = riGan ? getLiuQin(riGanWX, benMingWX) : '';
        const xnGanRelation = riGan ? getLiuQin(riGanWX, xingNianWX) : '';

        // 7. 冲合刑害
        const CHONG = {'子':'午','丑':'未','寅':'申','卯':'酉','辰':'戌','巳':'亥','午':'子','未':'丑','申':'寅','酉':'卯','戌':'辰','亥':'巳'};
        const HE = {'子':'丑','丑':'子','寅':'亥','卯':'戌','辰':'酉','巳':'申','午':'未','未':'午','申':'巳','酉':'辰','戌':'卯','亥':'寅'};
        const XING = {'子':'卯','卯':'子','寅':'巳','巳':'申','申':'寅','丑':'戌','戌':'未','未':'丑','辰':'辰','午':'午','酉':'酉','亥':'亥'};
        const HAI = {'子':'未','未':'子','丑':'午','午':'丑','寅':'巳','巳':'寅','卯':'辰','辰':'卯','申':'亥','亥':'申','酉':'戌','戌':'酉'};

        // 8. 年命入传检测
        const scZhi = params.sanChuan || [];
        const benMingRuChuan = scZhi.includes(benMing);
        const xingNianRuChuan = scZhi.includes(xingNian);

        return {
            benMing,                    // 本命地支
            benMingShangShen,           // 本命上神
            xingNian,                   // 行年地支
            xingNianShangShen,          // 行年上神
            bmXnRelation,               // 本命与行年五行关系
            bmGanRelation,              // 本命与日干六亲
            xnGanRelation,              // 行年与日干六亲
            isBenMingChongXingNian: CHONG[benMing] === xingNian,
            isBenMingHeXingNian: HE[benMing] === xingNian,
            isBenMingXingXingNian: XING[benMing] === xingNian,
            isBenMingHaiXingNian: HAI[benMing] === xingNian,
            benMingRuChuan,             // 本命入传
            xingNianRuChuan,            // 行年入传
            // 吉凶微调依据
            adjustFactors: calcAdjustFactors(benMing, xingNian, benMingShangShen, xingNianShangShen, riGan, scZhi),
        };
    }

    /**
     * 五行关系
     */
    function getWuXingRelation(wx1, wx2) {
        if (wx1 === wx2) return '比和';
        if (SHENG[wx1] === wx2) return '我生';
        if (KE[wx1] === wx2) return '我克';
        if (SHENG[wx2] === wx1) return '生我';
        if (KE[wx2] === wx1) return '克我';
        return '无';
    }

    /**
     * 六亲简化
     */
    function getLiuQin(dayWX, targetWX) {
        if (dayWX === targetWX) return '比肩';
        if (SHENG[dayWX] === targetWX) return '食伤';
        if (KE[dayWX] === targetWX) return '财';
        if (SHENG[targetWX] === dayWX) return '印';
        if (KE[targetWX] === dayWX) return '官杀';
        return '比肩';
    }

    /**
     * 年命微调因子计算
     */
    function calcAdjustFactors(benMing, xingNian, bmShangShen, xnShangShen, riGan, scZhi) {
        const factors = {
            benMingScore: 0,     // 本命基础分
            xingNianScore: 0,    // 行年基础分
            ruChuanBonus: 0,     // 入传加成
            chongPenalty: 0,     // 冲克惩罚
            heBonus: 0,          // 合化加成
        };

        const riGanWX = WUXING[riGan] || '土';

        // 本命上神与日干关系
        if (bmShangShen) {
            const bmSSWX = WUXING[bmShangShen] || '土';
            const lq = getLiuQin(riGanWX, bmSSWX);
            switch(lq) {
                case '印': factors.benMingScore = 0.10; break;
                case '财': factors.benMingScore = 0.08; break;
                case '比肩': factors.benMingScore = 0.05; break;
                case '食伤': factors.benMingScore = 0.06; break;
                case '官杀': factors.benMingScore = -0.08; break;
            }
        }

        // 行年上神与日干关系
        if (xnShangShen) {
            const xnSSWX = WUXING[xnShangShen] || '土';
            const lq = getLiuQin(riGanWX, xnSSWX);
            switch(lq) {
                case '印': factors.xingNianScore = 0.08; break;
                case '财': factors.xingNianScore = 0.06; break;
                case '比肩': factors.xingNianScore = 0.04; break;
                case '食伤': factors.xingNianScore = 0.05; break;
                case '官杀': factors.xingNianScore = -0.06; break;
            }
        }

        // 本命入传加成
        if (scZhi.includes(benMing)) {
            factors.ruChuanBonus = 0.10; // 命入传，事与本命相关
        }

        // 行年入传加成
        if (scZhi.includes(xingNian)) {
            factors.ruChuanBonus += 0.08; // 运入传，事与当年运程相关
        }

        // 本命冲行年惩罚
        const CHONG = {'子':'午','丑':'未','寅':'申','卯':'酉','辰':'戌','巳':'亥','午':'子','未':'丑','申':'寅','酉':'卯','戌':'辰','亥':'巳'};
        if (CHONG[benMing] === xingNian) {
            factors.chongPenalty = -0.10; // 命运相冲，内部冲突
        }

        // 本命合行年加成
        const HE = {'子':'丑','丑':'子','寅':'亥','卯':'戌','辰':'酉','巳':'申','午':'未','未':'午','申':'巳','酉':'辰','戌':'卯','亥':'寅'};
        if (HE[benMing] === xingNian) {
            factors.heBonus = 0.08; // 命运相合，顺畅
        }

        return factors;
    }

    /**
     * 计算年命总微调值（供QUANT_ENGINE使用）
     * @param {object} nianMingResult - calculate() 的返回值
     * @returns {number} 微调值 (-0.30 ~ +0.30)
     */
    function getTotalAdjust(nianMingResult) {
        if (!nianMingResult || !nianMingResult.adjustFactors) return 0;
        const f = nianMingResult.adjustFactors;
        const total = f.benMingScore + f.xingNianScore + f.ruChuanBonus + f.chongPenalty + f.heBonus;
        return Math.max(-0.30, Math.min(0.30, total));
    }

    /**
     * 生成年命断语
     * @param {object} nianMingResult - calculate() 的返回值
     * @returns {Array} 断语数组
     */
    function generateDuanYu(nianMingResult) {
        const duanYu = [];
        if (!nianMingResult) return duanYu;

        const { benMing, xingNian, benMingShangShen, xingNianShangShen } = nianMingResult;

        // 本命断语
        duanYu.push(`本命${benMing}${benMingShangShen ? '，上神' + benMingShangShen : ''}。`);

        // 行年断语
        duanYu.push(`行年${xingNian}${xingNianShangShen ? '，上神' + xingNianShangShen : ''}。`);

        // 入传断语
        if (nianMingResult.benMingRuChuan) {
            duanYu.push('本命入传，此事与自身根基密切相关，不可回避。');
        }
        if (nianMingResult.xingNianRuChuan) {
            duanYu.push('行年入传，当年运程对此事有直接推动。');
        }

        // 冲合断语
        if (nianMingResult.isBenMingChongXingNian) {
            duanYu.push('本命冲行年，命运相冲，内心矛盾，事多反复。');
        }
        if (nianMingResult.isBenMingHeXingNian) {
            duanYu.push('本命合行年，命运相合，内外协调，事多顺遂。');
        }

        // 六亲断语
        if (nianMingResult.bmGanRelation === '官杀') {
            duanYu.push('本命上神为官杀克日，外部压力作用于命根。');
        }
        if (nianMingResult.bmGanRelation === '印') {
            duanYu.push('本命上神为印生身，有贵人暗助。');
        }

        return duanYu;
    }

    // ===== 导出 =====
    return {
        calculate,
        getTotalAdjust,
        generateDuanYu,
        calcBenMing,
        calcBenMingByShengXiao,
        calcXingNian,
        getNianMingShangShen,
    };

})();
