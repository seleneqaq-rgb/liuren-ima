/**
 * 大六壬 V7 界面修复补丁
 * 
 * 修复1：神煞不显示 — ssCtx 缺失时从已有数据重建
 * 修复2：AI推演布局 — 移到卡片顶部、默认显示简报、可展开详情
 */

(function() {

    // ===== 辅助：安全 toast =====
    function safeToast(msg, isErr) {
        try { if (window.UI && window.UI.toast) window.UI.toast(msg, isErr); }
        catch(e) { console.log('[UI补丁]', msg); }
    }

    // ==========================================
    // 修复1：神煞引擎增强 — 从 Meta 重建 ssCtx
    // ==========================================
    function patchShenSha() {
        if (!window.SHENSHA || !window.UI || !window.UI.renderBoard) return;

        const origRenderBoard = window.UI.renderBoard;

        window.UI.renderBoard = function(data) {
            // 先确保 data.Context.ssCtx 存在
            if (data && data.Context && !data.Context.ssCtx) {
                const m = data.Meta || {};
                const bz = m.BaZi || '';
                const parts = bz.split(' ');
                const nianGan = parts[0] ? parts[0].charAt(0) : '甲';
                let taiSui = '';
                try {
                    // 从年柱推太岁：年支=太岁
                    const DZ = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
                    const nianZhi = parts[0] ? parts[0].charAt(2) : '子';
                    taiSui = DZ.includes(nianZhi) ? nianZhi : '子';
                } catch(e) { taiSui = '子'; }

                const yueJian = m.YueJiang ? m.YueJiang.replace('将','') : '子';
                const riGan = (data.Context && data.Context.gan) || '甲';
                const riZhi = (data.Context && data.Context.zhi) || '子';

                // 季节字符串
                const SEASONS = ['寅','卯','辰','巳','午','未','申','酉','戌','亥','子','丑'];
                const yjIdx = (typeof yueJian === 'string' ? SEASONS.indexOf(yueJian) : -1) + 1;
                const seasonMap = {1:'寅月春',2:'卯月春',3:'辰月春',4:'巳月夏',5:'午月夏',6:'未月夏',7:'申月秋',8:'酉月秋',9:'戌月秋',10:'亥月冬',11:'子月冬',12:'丑月冬'};
                const seasonStr = seasonMap[yjIdx] || '寅月春';

                // 空亡
                const kw = m.KongWang ? m.KongWang.split('、').map(s => s.trim()) : ['子','丑'];

                // 旬首
                const KW_MAP = {
                    '子丑':'丑','寅卯':'寅','辰巳':'辰','午未':'午','申酉':'申','戌亥':'戌'
                };
                const kwKey = kw.sort().join('');
                const xunShou = KW_MAP[kwKey] || '子';

                data.Context.ssCtx = {
                    taiSui, nianGan, yueJian, riGan, riZhi,
                    seasonStr, xunShou, kw, tShen: {}
                };
            }

            // 调用原版渲染
            return origRenderBoard.call(window.UI, data);
        };

        console.log('[UI补丁] ✅ 神煞 ssCtx 自动修复已激活');
    }

    // ==========================================
    // 修复2：AI推演布局重构
    // ==========================================
    function patchAIBox() {
        if (!window.UI || !window.UI.renderHistoryList) return;

        const origRenderHistoryList = window.UI.renderHistoryList;

        window.UI.renderHistoryList = function() {
            // 替换原版函数的前半部分逻辑
            // 关键：修改卡片模板，AI移到顶部，默认显示简报

            const ls = document.getElementById('history_list');
            if (!ls) return;

            const db = (typeof STATE !== 'undefined' ? STATE : window.STATE).history || [];

            const catId = (typeof STATE !== 'undefined' ? STATE : window.STATE).filterCat || 'all';
            const filtered = catId === 'all' ? db : db.filter(r => {
                if (catId === 'macro_sports') return ['c_sport_basket','c_sport_soccer','c_sport_esport'].includes(r.catId);
                return r.catId === catId;
            });

            (typeof STATE !== 'undefined' ? STATE : window.STATE).filteredHistory = filtered;

            // 统计更新
            if (window.UI.updateStats) window.UI.updateStats();

            const categories = (typeof STATE !== 'undefined' ? STATE : window.STATE).categories || [];
            const catOptionsHTML = categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

            ls.innerHTML = filtered.map(r => {
                const cn = categories.find(c => c.id === r.catId)?.name || "未知";
                const userCatHTML = catOptionsHTML.replace(`value="${r.catId}"`, `value="${r.catId}" selected`);
                const domain = (typeof getDomainType === 'function') ? getDomainType(r.catId, r.matter) : 'general';
                const isQuant = ['basket', 'soccer', 'esport', 'stock'].includes(domain);

                let curSubTab = r.uiSubTab || 'LocalAI';
                if (!isQuant && curSubTab === 'actual') curSubTab = 'LocalAI';

                const matrixHTML = window.UI.generateMatrixHTML ? window.UI.generateMatrixHTML(r, curSubTab) : '';
                const isRevOpen = (typeof STATE !== 'undefined' ? STATE : window.STATE).openReviewIds.has(r.id);
                const isAIOpen = (typeof STATE !== 'undefined' ? STATE : window.STATE).openAiBoxIds.has(r.id);

                // ===== AI推演摘要（默认显示） =====
                const aiSummary = buildAISummary(r);
                const aiDetailHTML = buildAIDetailHTML(r, isAIOpen);

                const actualTabLabel = isQuant ? '🎯 实际复盘结果' : '🎯 最终事实';

                return `
                <div class="history-card" data-id="${r.id}">
                    <!-- 标题行 -->
                    <div class="history-header">
                        <div class="history-title">${r.matter || '未定事项'}</div>
                        <button class="btn-del" style="background:none; border:none; color:#9ca3af; font-size:16px; cursor:pointer;" title="删除">🗑️</button>
                    </div>

                    <!-- 元信息行 -->
                    <div class="history-meta">
                        <span style="background: #f3f4f6; padding: 2px 8px; border-radius: 4px; border: 1px solid #e5e7eb;">${cn.split(' ')[0] || cn}</span>
                        <span>${r.time || ''}</span>
                        <span>${r.bazi || ''}</span>
                        <select class="cat-quick-select" style="font-size:11px; padding:2px 6px; border-radius:4px; border:1px solid #e5e7eb;" data-id="${r.id}">${userCatHTML}</select>
                    </div>

                    <!-- ⭐ AI推演简报（移到顶部，默认可见） -->
                    <div style="margin-top: 8px; padding: 8px 12px; background: ${aiSummary.hasContent ? '#FFFBEB' : '#f9fafb'}; border-radius: 8px; border: 1px solid ${aiSummary.hasContent ? '#FDE68A' : '#e5e7eb'};">
                        <div style="display: flex; align-items: center; justify-content: space-between;">
                            <div style="font-size: 13px; font-weight: 600; color: #1f2937;">
                                🤖 AI推演简报
                                ${aiSummary.hasContent ? `<span style="font-size:11px; color:#92400e; margin-left:8px;">${aiSummary.briefVerdict}</span>` : ''}
                            </div>
                            <button class="action-ai-toggle" data-id="${r.id}" 
                                style="font-size: 11px; padding: 4px 10px; background: ${isAIOpen ? '#8C2131' : '#f3f4f6'}; 
                                       color: ${isAIOpen ? 'white' : '#4b5563'}; border: 1px solid #e5e7eb; 
                                       border-radius: 4px; cursor: pointer; font-weight: bold;">
                                ${isAIOpen ? '▲ 收起详情' : '▼ 展开详情'}
                            </button>
                        </div>
                        ${aiSummary.hasContent ? `
                        <div style="font-size: 12px; color: #6b7280; margin-top: 4px; line-height: 1.5;">
                            ${aiSummary.summaryText}
                        </div>` : `
                        <div style="font-size: 12px; color: #9ca3af; font-style: italic; margin-top: 4px;">
                            尚未进行AI推演，点击下方按钮开始推演
                        </div>`}
                    </div>

                    <!-- 分类切换标签 -->
                    <div class="history-subtabs" style="margin-top: 8px; display: flex; flex-wrap: wrap; gap: 6px;">
                        <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                            <button class="match-btn ${curSubTab === 'LocalAI' ? 'active-match' : ''}" data-id="${r.id}" data-role="switch" data-val="LocalAI">📋 本地</button>
                            <button class="match-btn ${curSubTab === 'DeepSeek' ? 'active-match' : ''}" data-id="${r.id}" data-role="switch" data-val="DeepSeek">🤖 DeepSeek</button>
                            <button class="match-btn ${curSubTab === 'Qwen' ? 'active-match' : ''}" data-id="${r.id}" data-role="switch" data-val="Qwen">🤖 Qwen</button>
                            <button class="match-btn ${curSubTab === 'Gemini' ? 'active-match' : ''}" data-id="${r.id}" data-role="switch" data-val="Gemini">🤖 Gemini</button>
                            <button class="match-btn ${curSubTab === 'GLM' ? 'active-match' : ''}" data-id="${r.id}" data-role="switch" data-val="GLM">🤖 GLM</button>
                            ${isQuant ? `<button class="match-btn ${curSubTab === 'actual' ? 'active-match' : ''}" data-id="${r.id}" data-role="switch" data-val="actual">${actualTabLabel}</button>` : ''}
                        </div>
                        <div class="matrix-container" style="display:flex; flex-direction:column; gap:8px;">${matrixHTML}</div>
                    </div>

                    <!-- 操作按钮行 -->
                    <div class="history-actions" style="justify-content: space-between; margin-top: 8px; padding-top: 8px;">
                        <button class="action-toggle-review" style="font-size: 12px; padding: 6px 12px; background: ${isRevOpen ? '#e5e7eb' : '#f3f4f6'}; border: 1px solid #d1d5db; border-radius: 4px; cursor: pointer; font-weight: bold; color: #4b5563;" data-id="${r.id}">📝 宽幅复盘笔记</button>
                    </div>

                    <!-- 可展开的AI详细推演 -->
                    <div id="history-ai-box-${r.id}" class="${isAIOpen ? '' : 'hidden'}" style="margin-top: 12px; padding-top: 12px; border-top: 1px dashed #d1d5db;">
                        ${aiDetailHTML}
                    </div>

                    <!-- 复盘区域 -->
                    <div id="history-review-box-${r.id}" class="${isRevOpen ? '' : 'hidden'}" style="margin-top: 12px;">
                        <textarea id="history-review-text-${r.id}" style="width: 100%; min-height: 80px; padding: 8px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 13px;" placeholder="输入复盘笔记...">${r.review || ''}</textarea>
                        <button class="btn-save-review" data-id="${r.id}" style="margin-top: 4px; font-size: 12px; padding: 4px 12px; background: #8C2131; color: white; border: none; border-radius: 4px; cursor: pointer;">保存复盘</button>
                    </div>
                </div>`;
            }).join('');

            // ===== 重新绑定事件 =====
            bindHistoryEvents(ls);
        };

        console.log('[UI补丁] ✅ AI推演布局已重构');
    }

    // ===== 构建AI摘要 =====
    function buildAISummary(r) {
        if (!r.aiResults) return { hasContent: false, summaryText: '', briefVerdict: '' };

        // 取第一个有内容的引擎
        const engines = ['DeepSeek', 'Qwen', 'Gemini', 'GLM', 'LocalAI'];
        let bestEngine = null;
        let bestText = '';

        for (const eng of engines) {
            const t = (r.aiResults[eng] && r.aiResults[eng].text) || '';
            if (t.length > bestText.length) {
                bestText = t;
                bestEngine = eng;
            }
        }

        if (!bestText || bestText.length < 10) {
            return { hasContent: false, summaryText: '', briefVerdict: '' };
        }

        // 提取前150字作为摘要
        const summary = bestText.replace(/<[^>]*>/g, '').replace(/\n/g, ' ').substring(0, 150);
        
        // 提取简要结论（找"结论"、"定性"、"评级"等关键词后的句子）
        let verdict = '';
        const conclusionPatterns = [
            /(?:结论|判定|定性评级|最终结论)[：:]\s*([^。\n]*)/,
            /(?:吉凶|胜负|方向)[：:]\s*([^。\n]*)/,
            /E值[=＝]?\s*(\d+\.?\d*)\s*[\(（]?([^)）\n]*)[\)）]?/,
        ];
        for (const p of conclusionPatterns) {
            const m = bestText.match(p);
            if (m) { verdict = m[1] || m[0]; break; }
        }

        return {
            hasContent: true,
            summaryText: summary + '...',
            briefVerdict: verdict || '',
            source: bestEngine,
        };
    }

    // ===== 构建AI详情HTML =====
    function buildAIDetailHTML(r, isOpen) {
        if (!isOpen) return '';

        const aiDS  = getAIText(r, 'DeepSeek');
        const aiQwen = getAIText(r, 'Qwen');
        const aiGLM  = getAIText(r, 'GLM');
        const aiGemini = getAIText(r, 'Gemini');

        return `
        <div class="ai-split-container custom-scrollbar" style="max-height: 400px; overflow-y: auto;">
            <div class="ai-panel" style="min-width: 250px; flex: 1;">
                <div class="ai-panel-header deepseek" style="padding: 8px; font-size: 12px; background: #1a1a2e; color: white; border-radius: 6px 6px 0 0;">DeepSeek-V3</div>
                <div class="ai-panel-body custom-scrollbar" id="card_stream_deepseek_${r.id}" style="padding: 8px; font-size: 12px; max-height: 300px; overflow-y: auto;">${aiDS}</div>
            </div>
            <div class="ai-panel" style="min-width: 250px; flex: 1;">
                <div class="ai-panel-header qwen" style="padding: 8px; font-size: 12px; background: #1a1a2e; color: white; border-radius: 6px 6px 0 0;">Qwen Max</div>
                <div class="ai-panel-body custom-scrollbar" id="card_stream_qwen_${r.id}" style="padding: 8px; font-size: 12px; max-height: 300px; overflow-y: auto;">${aiQwen}</div>
            </div>
            <div class="ai-panel" style="min-width: 250px; flex: 1;">
                <div class="ai-panel-header gemini" style="padding: 8px; font-size: 12px; background: #1a1a2e; color: white; border-radius: 6px 6px 0 0;">Gemini</div>
                <div class="ai-panel-body custom-scrollbar" id="card_stream_gemini_${r.id}" style="padding: 8px; font-size: 12px; max-height: 300px; overflow-y: auto;">${aiGemini}</div>
            </div>
            <div class="ai-panel" style="min-width: 250px; flex: 1;">
                <div class="ai-panel-header glm" style="padding: 8px; font-size: 12px; background: #1a1a2e; color: white; border-radius: 6px 6px 0 0;">GLM</div>
                <div class="ai-panel-body custom-scrollbar" id="card_stream_glm_${r.id}" style="padding: 8px; font-size: 12px; max-height: 300px; overflow-y: auto;">${aiGLM}</div>
            </div>
        </div>`;
    }

    function getAIText(r, engine) {
        if (r.aiResults && r.aiResults[engine] && r.aiResults[engine].text) {
            return r.aiResults[engine].text;
        }
        return '<span style="color:#9ca3af;font-style:italic;">暂无推演...</span>';
    }

    // ===== 事件绑定 =====
    function bindHistoryEvents(container) {
        if (!container) return;

        const STATE_REF = typeof STATE !== 'undefined' ? STATE : window.STATE;

        // AI展开/折叠
        container.querySelectorAll('.action-ai-toggle').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                const box = document.getElementById('history-ai-box-' + id);
                if (!box) return;
                const isOpen = !box.classList.contains('hidden');
                if (isOpen) {
                    box.classList.add('hidden');
                    btn.textContent = '▼ 展开详情';
                    btn.style.background = '#f3f4f6';
                    btn.style.color = '#4b5563';
                    STATE_REF.openAiBoxIds.delete(id);
                } else {
                    box.classList.remove('hidden');
                    box.innerHTML = buildAIDetailHTML(
                        STATE_REF.history.find(r => String(r.id) === String(id)) || {},
                        true
                    );
                    btn.textContent = '▲ 收起详情';
                    btn.style.background = '#8C2131';
                    btn.style.color = 'white';
                    STATE_REF.openAiBoxIds.add(id);
                }
            });
        });

        // 删除按钮
        container.querySelectorAll('.btn-del').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const card = btn.closest('.history-card');
                if (!card) return;
                const id = card.dataset.id;
                if (confirm('确认删除这条记录？')) {
                    if (window.BIZ && window.BIZ.deleteRecord) {
                        window.BIZ.deleteRecord(id);
                    }
                }
            });
        });

        // 分类快速切换
        container.querySelectorAll('.cat-quick-select').forEach(sel => {
            sel.addEventListener('change', (e) => {
                e.stopPropagation();
                const id = sel.dataset.id;
                const newCatId = sel.value;
                if (window.BIZ && window.BIZ.updateRecordField) {
                    window.BIZ.updateRecordField(id, 'catId', newCatId);
                }
            });
        });

        // 复盘切换
        container.querySelectorAll('.action-toggle-review').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                const box = document.getElementById('history-review-box-' + id);
                if (!box) return;
                const isOpen = !box.classList.contains('hidden');
                if (isOpen) {
                    box.classList.add('hidden');
                    STATE_REF.openReviewIds.delete(id);
                } else {
                    box.classList.remove('hidden');
                    STATE_REF.openReviewIds.add(id);
                }
            });
        });

        // 保存复盘
        container.querySelectorAll('.btn-save-review').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                const ta = document.getElementById('history-review-text-' + id);
                if (ta && window.BIZ && window.BIZ.updateRecordField) {
                    window.BIZ.updateRecordField(id, 'review', ta.value);
                }
            });
        });

        // 点击卡片加载记录
        container.querySelectorAll('.history-card').forEach(card => {
            card.addEventListener('click', (e) => {
                // 如果点击的是按钮/select/textarea，不触发加载
                if (e.target.closest('button, select, textarea, .btn-del, .action-ai-toggle, .action-toggle-review, .btn-save-review, .cat-quick-select, .match-btn')) {
                    return;
                }
                const id = card.dataset.id;
                if (window.BIZ && window.BIZ.loadRecord) {
                    window.BIZ.loadRecord(id);
                }
            });
        });
    }

    // ==========================================
    // 启动
    // ==========================================
    function init() {
        const check = setInterval(() => {
            if (window.UI && window.SHENSHA && (typeof STATE !== 'undefined')) {
                clearInterval(check);
                patchShenSha();
                patchAIBox();
                // 对已显示的历史列表强制刷新一次
                if (window.UI.renderHistoryList) window.UI.renderHistoryList();
                console.log('[UI补丁] 🎉 神煞修复 + AI推演布局重构完成');
            }
        }, 300);
        setTimeout(() => clearInterval(check), 15000);
    }

    if (document.readyState === 'complete') init();
    else window.addEventListener('load', init);

})();