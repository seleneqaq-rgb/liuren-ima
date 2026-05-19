/**
 * 大六壬全息推演系统 V7.0 热补丁集成脚本
 * 
 * 功能：自动注入所有新引擎模块到已有 V6.2 页面，无需手动修改主HTML
 * 使用方式：在 HTML 末尾添加 <script src="./liuren_integration_v7.js"></script>
 * 
 * 集成内容：
 *   - 旺衰引擎 V1.0
 *   - 遁干系统 V1.0
 *   - 四层扫描E值量化引擎 V2.0
 *   - Bomb Rules一票否决体系 V2.0
 *   - 年命系统 V2.0
 *   - 6大领域策略（婚姻/疾病/官讼/出行/考学/寻人）
 *   - AI推演RAG提示词引擎 V2.0
 */

(function() {

    // ==========================================
    // 模块加载配置
    // ==========================================
    const MODULES = [
        { path: './uploads/liuren_wangshuai.js',  global: 'WANG_SHUAI_ENGINE', critical: true },
        { path: './uploads/liuren_dungan.js',      global: 'DUN_GAN_ENGINE',   critical: true },
        { path: './liuren_bomb_rules.js',          global: 'BOMB_RULES',       critical: true },
        { path: './liuren_quant_engine.js',        global: 'QUANT_ENGINE',     critical: true },
        { path: './liuren_nianming.js',            global: 'NIAN_MING_ENGINE', critical: true },
        { path: './liuren_domain_strategy_all.js', global: 'DOMAIN_STRATEGIES',critical: true },
        { path: './liuren_ai_prompt_engine.js',    global: 'AI_PROMPT_ENGINE',  critical: false },
    ];

    // ==========================================
    // 动态加载脚本
    // ==========================================
    function loadScript(path) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = path;
            script.onload = resolve;
            script.onerror = () => reject(`加载失败: ${path}`);
            document.head.appendChild(script);
        });
    }

    // ==========================================
    // 等待页面加载完成
    // ==========================================
    function waitForInit() {
        return new Promise(resolve => {
            if (document.readyState === 'complete' && window.BIZ && window.UI && window.ALGO) {
                return resolve();
            }
            const check = setInterval(() => {
                if (document.readyState === 'complete' && window.BIZ && window.UI && window.ALGO) {
                    clearInterval(check);
                    resolve();
                }
            }, 200);
            // 最多等10秒
            setTimeout(() => { clearInterval(check); resolve(); }, 10000);
        });
    }

    // ==========================================
    // 补丁1: 升级 getDomainType 路由
    // ==========================================
    function patchGetDomainType() {
        if (typeof window.getDomainType !== 'function') return;
        const originalGetDomainType = window.getDomainType;
        window.getDomainType = function(catId, matter = '') {
            // 如果领域策略已升级，使用新版路由
            if (window.DOMAIN_STRATEGIES && window.DOMAIN_STRATEGIES.getKeyFromId) {
                const key = window.DOMAIN_STRATEGIES.getKeyFromId(catId);
                return key;
            }
            // 否则调用原版
            return originalGetDomainType(catId, matter);
        };
        console.log('[V7] ✅ getDomainType 已升级');
    }

    // ==========================================
    // 补丁2: BIZ.calcPan 注入新引擎流水线
    // ==========================================
    function patchCalcPan() {
        if (!window.BIZ || typeof window.BIZ.calcPan !== 'function') return;
        const originalCalcPan = window.BIZ.calcPan;
        window.BIZ.calcPan = function() {
            // 调用原版排盘
            originalCalcPan.call(window.BIZ);

            // 等待排盘结果生成
            const result = window.STATE ? window.STATE.currentRun : null;
            if (!result) return;

            try {
                // 读取页面输入的年命和性别
                const genderEl = document.getElementById('in_gender') || document.getElementById('in_sex');
                const birthYearEl = document.getElementById('in_birthyear') || document.getElementById('in_birth');
                const ageEl = document.getElementById('in_age');

                const riGan = result.Context ? result.Context.gan : '';
                const riZhi = result.Context ? result.Context.zhi : '';
                const tp = result.天地盘 || {};
                const sc = result.三传 || {};
                const scZhi = [sc.初传, sc.中传, sc.末传].filter(Boolean);

                // 1️⃣ 旺衰计算
                let wsResult = null;
                if (window.WANG_SHUAI_ENGINE) {
                    wsResult = window.WANG_SHUAI_ENGINE.calculate(result);
                }

                // 2️⃣ 遁干注入
                let dgResult = null;
                if (window.DUN_GAN_ENGINE) {
                    dgResult = window.DUN_GAN_ENGINE.injectAll ? 
                        window.DUN_GAN_ENGINE.injectAll(result) : null;
                }

                // 3️⃣ 年命计算
                let nmResult = null;
                if (window.NIAN_MING_ENGINE) {
                    const gender = genderEl ? genderEl.value : '男';
                    const birthYear = birthYearEl ? parseInt(birthYearEl.value) || 1990 : null;
                    const age = ageEl ? parseInt(ageEl.value) || 30 : null;
                    nmResult = window.NIAN_MING_ENGINE.calculate({
                        birthYear: birthYear || 1990,
                        age: age || 30,
                        gender: gender === '女' ? '女' : '男',
                        tianPan: tp,
                        riGan: riGan,
                        sanChuan: scZhi,
                    });
                }

                // 4️⃣ 四层扫描E值计算
                let quantResult = null;
                if (window.QUANT_ENGINE) {
                    quantResult = window.QUANT_ENGINE.calculate(result, wsResult, dgResult, nmResult);
                }

                // 5️⃣ Bomb Rules扫描
                let bombResult = null;
                if (window.BOMB_RULES && quantResult) {
                    bombResult = window.BOMB_RULES.scan(result, quantResult.features, wsResult, dgResult);
                }

                // 6️⃣ 应用Bomb修正
                let finalResult = null;
                if (window.BOMB_RULES && quantResult && bombResult) {
                    finalResult = window.BOMB_RULES.apply(quantResult, bombResult);
                }

                // 7️⃣ 领域加权
                let domainResult = null;
                if (window.QUANT_ENGINE && finalResult) {
                    const catId = document.getElementById('in_cat') ? 
                        document.getElementById('in_cat').value : 'c_general';
                    const domain = window.DOMAIN_STRATEGIES ? 
                        window.DOMAIN_STRATEGIES.getKeyFromId(catId) : 'general';
                    domainResult = window.QUANT_ENGINE.domainWeighted(finalResult, domain);
                }

                // 存储到STATE供UI使用
                if (window.STATE) {
                    window.STATE._v7 = {
                        wsResult,
                        dgResult,
                        nmResult,
                        quantResult,
                        bombResult,
                        finalResult,
                        domainResult,
                    };
                }

                console.log('[V7] 📊 新引擎流水线完成', 
                    quantResult ? `E=${quantResult.E}(${quantResult.grade})` : '');
                if (bombResult && bombResult.triggered.length > 0) {
                    console.log('[V7] ⚠️ Bomb触发:', bombResult.summary);
                }

            } catch(e) {
                console.warn('[V7] 新引擎流水线异常:', e.message);
            }
        };
        console.log('[V7] ✅ BIZ.calcPan 已升级');
    }

    // ==========================================
    // 补丁3: UI.renderBoard 集成新引擎显示
    // ==========================================
    function patchRenderBoard() {
        if (!window.UI || typeof window.UI.renderBoard !== 'function') return;
        const originalRenderBoard = window.UI.renderBoard;
        window.UI.renderBoard = function(data) {
            // 先调用原版渲染
            originalRenderBoard.call(window.UI, data);

            // 再渲染新引擎结果
            try {
                const v7 = window.STATE ? window.STATE._v7 : null;
                if (!v7) return;

                // 找输出容器
                const boardEl = document.getElementById('out_board');
                if (!boardEl) return;

                // V7 结果面板
                const v7Panel = document.createElement('div');
                v7Panel.id = 'v7_panel';
                v7Panel.style.cssText = 'margin-top: 20px; border: 2px solid #8C2131; border-radius: 12px; padding: 16px; background: linear-gradient(135deg, #FFF5F5 0%, #FFFAF0 100%);';

                let html = '<div style="font-size: 18px; font-weight: 900; color: #8C2131; margin-bottom: 12px;">⚡ V7 量化引擎推演</div>';

                // E值展示
                const q = v7.finalResult || v7.quantResult;
                if (q) {
                    const gradeColor = {
                        '大吉': '#065f46', '吉': '#047857', '小吉': '#166534',
                        '平': '#92400e',
                        '小凶': '#9a3412', '凶': '#991b1b', '大凶': '#7f1d1d'
                    };
                    const finalGrade = v7.finalResult ? v7.finalResult.grade_final : q.grade;
                    const finalE = v7.finalResult ? v7.finalResult.E_final : q.E;
                    const color = gradeColor[finalGrade] || '#92400e';

                    html += '<div style="display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 12px;">';
                    html += `<div style="background: white; border-radius: 12px; padding: 12px 16px; flex: 1; min-width: 120px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">`;
                    html += `<div style="font-size: 11px; color: #9ca3af;">E值</div>`;
                    html += `<div style="font-size: 28px; font-weight: 900; color: ${color};">${(finalE || 0).toFixed(2)}</div>`;
                    html += `<div style="font-size: 13px; color: ${color}; font-weight: 600;">${finalGrade}</div>`;
                    html += '</div>';

                    // Bi/Di/Si
                    const layers = [
                        { label: 'Bᵢ课体', val: q.Bi, color: '#6366f1' },
                        { label: 'Dᵢ动能', val: q.Di, color: '#f59e0b' },
                        { label: 'Sᵢ状态', val: q.Si, color: '#10b981' },
                    ];
                    for (const l of layers) {
                        html += `<div style="background: white; border-radius: 12px; padding: 12px 16px; flex: 1; min-width: 80px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">`;
                        html += `<div style="font-size: 11px; color: #9ca3af;">${l.label}</div>`;
                        html += `<div style="font-size: 22px; font-weight: 700; color: ${l.color};">${(l.val || 0).toFixed(2)}</div>`;
                        html += '</div>';
                    }
                    html += '</div>';

                    // 领域加权E
                    if (v7.domainResult && v7.domainResult.E_weighted) {
                        html += `<div style="font-size: 13px; color: #6b7280; text-align: center; margin-bottom: 8px;">`;
                        html += `领域加权 E=${v7.domainResult.E_weighted}(${v7.domainResult.grade_weighted}) `;
                        html += `| 权重: B×${v7.domainResult.domainWeights.Bi} D×${v7.domainResult.domainWeights.Di} S×${v7.domainResult.domainWeights.Si}`;
                        html += '</div>';
                    }

                    // 年命微调
                    if (q.nianMingAdjust) {
                        html += `<div style="font-size: 12px; color: #6b7280; text-align: center; margin-bottom: 8px;">`;
                        html += `年命微调: ${q.nianMingAdjust > 0 ? '+' : ''}${q.nianMingAdjust.toFixed(3)}`;
                        html += '</div>';
                    }
                }

                // Bomb Rules展示
                const b = v7.bombResult;
                if (b && b.triggered && b.triggered.length > 0) {
                    html += '<div style="margin: 8px 0; padding: 10px; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px;">';
                    html += '<div style="font-weight: 600; margin-bottom: 6px;">⚠️ 危险信号扫描</div>';
                    for (const bomb of b.triggered) {
                        const icon = bomb.level === 'red' ? '🔴' : bomb.level === 'yellow' ? '🟡' : '🟠';
                        html += `<div style="font-size: 13px; margin: 2px 0;">${icon} ${bomb.name}: ${bomb.desc}</div>`;
                    }
                    if (v7.finalResult && v7.finalResult.bombApplied) {
                        html += `<div style="font-size: 12px; color: #991b1b; margin-top: 4px;">Bomb修正后 E=${v7.finalResult.E_final} → ${v7.finalResult.grade_final}</div>`;
                    }
                    html += '</div>';
                }

                // 年命信息
                const n = v7.nmResult;
                if (n) {
                    html += '<div style="display: flex; gap: 8px; flex-wrap: wrap; margin: 8px 0; font-size: 13px;">';
                    html += `<div style="background: white; padding: 6px 12px; border-radius: 6px;">本命 <strong>${n.benMing}</strong>`;
                    if (n.benMingShangShen) html += ` 上神${n.benMingShangShen}`;
                    html += '</div>';
                    html += `<div style="background: white; padding: 6px 12px; border-radius: 6px;">行年 <strong>${n.xingNian}</strong>`;
                    if (n.xingNianShangShen) html += ` 上神${n.xingNianShangShen}`;
                    html += '</div>';
                    if (n.benMingRuChuan) html += '<div style="background: #FEF3C7; padding: 6px 12px; border-radius: 6px;">⭐ 本命入传</div>';
                    if (n.xingNianRuChuan) html += '<div style="background: #FEF3C7; padding: 6px 12px; border-radius: 6px;">⭐ 行年入传</div>';
                    if (n.isBenMingChongXingNian) html += '<div style="background: #FEE2E2; padding: 6px 12px; border-radius: 6px;">⚡ 命运相冲</div>';
                    if (n.isBenMingHeXingNian) html += '<div style="background: #D1FAE5; padding: 6px 12px; border-radius: 6px;">✅ 命运相合</div>';
                    html += '</div>';
                }

                // 旺衰信息
                if (v7.wsResult) {
                    html += '<div style="display: flex; gap: 8px; flex-wrap: wrap; margin: 8px 0; font-size: 13px;">';
                    if (v7.wsResult.ganWS) html += `<div style="background: white; padding: 6px 12px; border-radius: 6px;">日干${v7.wsResult.ganWS}</div>`;
                    if (v7.wsResult.zhiWS) html += `<div style="background: white; padding: 6px 12px; border-radius: 6px;">日支${v7.wsResult.zhiWS}</div>`;
                    if (v7.wsResult.scWS) {
                        v7.wsResult.scWS.forEach(s => {
                            html += `<div style="background: white; padding: 6px 12px; border-radius: 6px;">${s.name || s.zhi || '?'} ${s.ws || s.phase || '?'}</div>`;
                        });
                    }
                    html += '</div>';
                }

                // 三传六亲（来自量化引擎特征分解）
                if (q && q.breakdown && q.breakdown.sanChuanLiuQin && q.breakdown.sanChuanLiuQin.length > 0) {
                    html += '<div style="margin: 8px 0;">';
                    html += '<div style="font-size: 12px; color: #6b7280;">三传六亲链</div>';
                    html += `<div style="font-size: 14px; font-weight: 600; color: #1f2937;">${q.breakdown.sanChuanLiuQin.join(' → ')}</div>`;
                    if (q.breakdown.sanChuanRelation && q.breakdown.sanChuanRelation.length > 0) {
                        html += `<div style="font-size: 12px; color: #6b7280;">生克链: ${q.breakdown.sanChuanRelation.join(' → ')}</div>`;
                    }
                    html += '</div>';
                }

                html += '</div>';

                v7Panel.innerHTML = html;
                boardEl.appendChild(v7Panel);

                console.log('[V7] ✅ V7量化面板已渲染');
            } catch(e) {
                console.warn('[V7] UI渲染异常:', e.message);
            }
        };
        console.log('[V7] ✅ UI.renderBoard 已升级');
    }

    // ==========================================
    // 补丁4: BIZ.runAI 升级AI提示词
    // ==========================================
    function patchRunAI() {
        if (!window.BIZ || typeof window.BIZ.runAI !== 'function') return;
        const originalRunAI = window.BIZ.runAI;

        window.BIZ.runAI = async function() {
            const v7 = window.STATE ? window.STATE._v7 : null;
            const result = window.STATE ? window.STATE.currentRun : null;

            // 如果有V7引擎，使用新版AI提示词
            if (window.AI_PROMPT_ENGINE && v7 && result) {
                const matter = document.getElementById('in_matter') ? document.getElementById('in_matter').value : '';
                const catId = document.getElementById('in_cat') ? document.getElementById('in_cat').value : 'c_general';
                const domain = window.DOMAIN_STRATEGIES ? 
                    window.DOMAIN_STRATEGIES.getKeyFromId(catId) : 'general';

                const promptData = window.AI_PROMPT_ENGINE.build(
                    result,
                    v7.finalResult || v7.quantResult,
                    v7.bombResult,
                    v7.nmResult,
                    domain,
                    matter
                );

                // 将完整提示词注入到AI请求
                // 如果原版有AI调用，在这里拦截并修改请求
                console.log('[V7] 🤖 AI提示词已升级，长度:', promptData.fullPrompt.length);
                console.log('[V7]   system:', promptData.systemPrompt.substring(0, 100) + '...');
                console.log('[V7]   user:', promptData.userPrompt.substring(0, 100) + '...');

                // 保存提示词供原版使用
                window.STATE._v7AiPrompt = promptData;

                // 调用原版，原版可读取 STATE._v7AiPrompt
                return originalRunAI.call(window.BIZ);
            } else {
                return originalRunAI.call(window.BIZ);
            }
        };
        console.log('[V7] ✅ BIZ.runAI 已升级');
    }

    // ==========================================
    // 补丁5: 分类下拉框增加6个新领域选项
    // ==========================================
    function patchCategorySelect() {
        const catSelect = document.getElementById('in_cat');
        if (!catSelect) return;

        // 检查是否已经有新分类（避免重复添加）
        if (catSelect.querySelector('option[value="c_marriage"]')) return;

        // 插入新分类
        const newCategories = [
            { value: 'c_marriage', label: '🏮 婚姻情感' },
            { value: 'c_health',   label: '🏥 疾病健康' },
            { value: 'c_lawsuit',  label: '⚖️ 官讼法律' },
            { value: 'c_travel',   label: '✈️ 出行安全' },
            { value: 'c_exam',     label: '📚 考学升学' },
            { value: 'c_missing',  label: '🔍 寻人失物' },
        ];

        const defaultOption = catSelect.querySelector('option[value="c_general"]') || 
                              catSelect.querySelector('option[value="default"]') || 
                              catSelect.options[0];

        // 在通用/默认选项后面插入
        for (const cat of newCategories) {
            const opt = document.createElement('option');
            opt.value = cat.value;
            opt.textContent = cat.label;
            if (defaultOption) {
                catSelect.insertBefore(opt, defaultOption.nextSibling);
            } else {
                catSelect.appendChild(opt);
            }
        }

        console.log('[V7] ✅ 分类下拉框已扩展6个新领域');
    }

    // ==========================================
    // 主启动函数
    // ==========================================
    async function init() {
        console.log('[V7] 🚀 大六壬V7集成补丁启动...');

        // 🔧 桥接 STATE：原版用 const STATE，不在 window 上
        if (typeof STATE !== 'undefined' && !window.STATE) window.STATE = STATE;

        // 1. 等待页面准备就绪
        await waitForInit();

        // 2. 动态加载所有新模块
        for (const mod of MODULES) {
            try {
                const existing = window[mod.global];
                if (!existing) {
                    await loadScript(mod.path);
                    console.log(`[V7] ✅ 已加载 ${mod.path}`);
                } else {
                    console.log(`[V7] ℹ️   ${mod.global} 已存在，跳过`);
                }
            } catch(e) {
                console.warn(`[V7] ⚠️  加载 ${mod.path} 失败:`, e.message);
                if (mod.critical) {
                    console.error(`[V7] ❌ 核心模块 ${mod.global} 加载失败，部分功能不可用`);
                }
            }
        }

        // 3. 注入所有补丁
        patchGetDomainType();
        patchCalcPan();
        patchRenderBoard();
        patchRunAI();
        patchCategorySelect();

        console.log('[V7] ✅ 所有补丁已注入完成！版本: V7.0');
        console.log('[V7] 📊 可用引擎:', {
            wangShuai: !!window.WANG_SHUAI_ENGINE,
            dunGan: !!window.DUN_GAN_ENGINE,
            nianMing: !!window.NIAN_MING_ENGINE,
            quantEngine: !!window.QUANT_ENGINE,
            bombRules: !!window.BOMB_RULES,
            domainStrategy: !!window.DOMAIN_STRATEGIES,
            aiPrompt: !!window.AI_PROMPT_ENGINE,
        });
    }

    // 页面加载完成后执行
    if (document.readyState === 'complete') {
        init();
    } else {
        window.addEventListener('load', init);
    }

})();
