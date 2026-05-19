/**
 * 大六壬遁干系统 V1.0
 * 
 * 遁干：根据日干所在旬，将天干遁入地盘十二支
 * 旬遁规则：甲子旬→甲遁子，乙遁丑...癸遁酉，戌亥空亡
 * 
 * 用法：
 *   WANG_SHUAI_ENGINE 依赖遁干来确定天盘字的隐藏天干
 *   遁干也是六亲判定的重要辅助
 */

window.DUN_GAN_ENGINE = (function() {

    const TIAN_GAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
    const DI_ZHI   = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];

    // 六十甲子
    const GANZHI = [];
    for (let i = 0; i < 60; i++) {
        GANZHI.push(TIAN_GAN[i % 10] + DI_ZHI[i % 12]);
    }

    // ===== 十旬表 =====
    const XUN_TABLE = [
        { name: '甲子旬', start: 0,  kong: ['戌','亥'] },
        { name: '甲戌旬', start: 10, kong: ['申','酉'] },
        { name: '甲申旬', start: 20, kong: ['午','未'] },
        { name: '甲午旬', start: 30, kong: ['辰','巳'] },
        { name: '甲辰旬', start: 40, kong: ['寅','卯'] },
        { name: '甲寅旬', start: 50, kong: ['子','丑'] }
    ];

    /**
     * 根据日干支获取所在旬
     * @param {string} riGanZhi - 日干支如"甲子"
     * @returns {object} { name, start, kong, xunDun }
     */
    function getXun(riGanZhi) {
        const idx = GANZHI.indexOf(riGanZhi);
        if (idx === -1) return null;

        const xunIdx = Math.floor(idx / 10);
        const xun = XUN_TABLE[xunIdx];

        // 遁干映射：地支→天干
        const xunDun = {};
        for (let i = 0; i < 10; i++) {
            const gz = GANZHI[xun.start + i];
            const zhi = gz.charAt(1);
            const gan = gz.charAt(0);
            xunDun[zhi] = gan;
        }

        return { ...xun, xunDun };
    }

    /**
     * 获取某地支在指定旬中的遁干
     * @param {string} riGanZhi - 日干支
     * @param {string} zhi - 目标地支
     * @returns {string|null} 遁干字符，空亡则返回null
     */
    function getDunGan(riGanZhi, zhi) {
        const xun = getXun(riGanZhi);
        if (!xun) return null;
        if (xun.kong.includes(zhi)) return null; // 空亡无遁干
        return xun.xunDun[zhi] || null;
    }

    /**
     * 批量遁干：为整个天地盘12支全部配遁干
     * @param {string} riGanZhi - 日干支
     * @returns {object} { xunDun, kong, xunName }
     */
    function buildFullDunGan(riGanZhi) {
        const xun = getXun(riGanZhi);
        if (!xun) return { xunDun: {}, kong: [], xunName: '' };
        return {
            xunDun: xun.xunDun,
            kong: xun.kong,
            xunName: xun.name
        };
    }

    /**
     * 为三传配遁干
     * @param {string} riGanZhi - 日干支
     * @param {Array} sanChuan - 三传数组 [{Zhi, Pos, ...}, ...]
     * @returns {Array} 原数组附加DunGan和IsKong字段
     */
    function attachDunGanToSanChuan(riGanZhi, sanChuan) {
        const xun = getXun(riGanZhi);
        if (!xun) return sanChuan;

        return sanChuan.map(sc => {
            const newObj = { ...sc };
            if (xun.kong.includes(sc.Zhi)) {
                newObj.DunGan = null;
                newObj.IsKongByXun = true;
            } else {
                newObj.DunGan = xun.xunDun[sc.Zhi] || null;
                newObj.IsKongByXun = false;
            }
            return newObj;
        });
    }

    /**
     * 为四课配遁干
     * @param {string} riGanZhi - 日干支
     * @param {Array} siKe - 四课数组
     * @returns {Array} 原数组附加遁干字段
     */
    function attachDunGanToSiKe(riGanZhi, siKe) {
        const xun = getXun(riGanZhi);
        if (!xun) return siKe;

        return siKe.map(sk => {
            const newObj = { ...sk };
            // 上神遁干
            if (xun.kong.includes(sk.Top)) {
                newObj.TopDunGan = null;
                newObj.IsTopKongByXun = true;
            } else {
                newObj.TopDunGan = xun.xunDun[sk.Top] || null;
                newObj.IsTopKongByXun = false;
            }
            // 下神遁干（如果是天干则取寄宫地支的遁干）
            let botZhi = sk.Bottom;
            if (sk.isGan && window.JIGONG) {
                botZhi = window.JIGONG[sk.Bottom] || sk.Bottom;
            }
            if (xun.kong.includes(botZhi)) {
                newObj.BotDunGan = null;
                newObj.IsBotKongByXun = true;
            } else {
                newObj.BotDunGan = xun.xunDun[botZhi] || null;
                newObj.IsBotKongByXun = false;
            }
            return newObj;
        });
    }

    /**
     * 为天地盘12宫配遁干
     * @param {string} riGanZhi - 日干支
     * @param {Array} tianDiPan - 天地盘数组
     * @returns {Array} 原数组附加遁干字段
     */
    function attachDunGanToTianDiPan(riGanZhi, tianDiPan) {
        const xun = getXun(riGanZhi);
        if (!xun) return tianDiPan;

        return tianDiPan.map(cell => {
            const newObj = { ...cell };
            // 天盘字遁干
            if (xun.kong.includes(cell.TianPan)) {
                newObj.DunGan = null;
                newObj.IsKongByXun = true;
            } else {
                newObj.DunGan = xun.xunDun[cell.TianPan] || null;
                newObj.IsKongByXun = false;
            }
            return newObj;
        });
    }

    /**
     * 完整遁干注入：一次性为整个排盘结果配齐遁干
     * @param {object} currentRun - STATE.currentRun
     * @returns {object} 注入遁干后的新对象
     */
    function injectAll(currentRun) {
        if (!currentRun) return currentRun;

        // 从八字的日柱取日干支
        let riGanZhi = '';
        if (currentRun.Meta && currentRun.Meta.BaZi) {
            const dayPart = currentRun.Meta.BaZi.split(' ')[2]; // "戊辰日"
            if (dayPart) riGanZhi = dayPart.replace('日', '');
        }
        // 备用：从Context取
        if (!riGanZhi && currentRun.Context) {
            riGanZhi = (currentRun.Context.gan || '') + (currentRun.Context.zhi || '');
        }

        if (!riGanZhi || riGanZhi.length < 2) return currentRun;

        const result = { ...currentRun };

        // 注入三传遁干
        if (result.SanChuan) {
            result.SanChuan = attachDunGanToSanChuan(riGanZhi, result.SanChuan);
        }

        // 注入四课遁干
        if (result.SiKe) {
            result.SiKe = attachDunGanToSiKe(riGanZhi, result.SiKe);
        }

        // 注入天地盘遁干
        if (result.TianDiPan) {
            result.TianDiPan = attachDunGanToTianDiPan(riGanZhi, result.TianDiPan);
        }

        // 在Context中记录遁干和空亡
        if (result.Context) {
            const fullDun = buildFullDunGan(riGanZhi);
            result.Context.xunDun = fullDun.xunDun;
            result.Context.xunKong = fullDun.kong;
            result.Context.xunName = fullDun.xunName;
        }

        return result;
    }

    // ===== 导出 =====
    return {
        getXun,
        getDunGan,
        buildFullDunGan,
        attachDunGanToSanChuan,
        attachDunGanToSiKe,
        attachDunGanToTianDiPan,
        injectAll,
        GANZHI,
        XUN_TABLE
    };

})();
