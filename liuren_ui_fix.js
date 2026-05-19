/**
 * 大六壬 V7 界面修复补丁 V2 — Proxy拦截版
 * 不用函数替换，用DOM后处理确保每次重绘都生效
 */

(function() {

    // ===== 辅助 =====
    function safeToast(msg, isErr) {
        try { if (window.UI && window.UI.toast) window.UI.toast(msg, isErr); }
        catch(e) { console.log('[UI补丁V2]', msg); }
    }

    // ===== 工具：获取 STATE（兼容 const 声明不在 window 上） =====
    function getState() {
        if (typeof STATE !== 'undefined') return STATE;
        if (window.STATE) return window.STATE;
        return null;
    }

    // ==========================================
    // 修复1：神煞 ssCtx 补全
    // ==========================================
    function ensureSSCtx(data) {
        if (!data || !data.Context) return;
        if (data.Context.ssCtx) return;

        const m = data.Meta || {};
        const bz = m.BaZi || '';
        const parts = bz.split(' ');
        const DZ = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
        const nianZhi = (parts[0] && parts[0].length >= 3) ? (parts[0].charAt(2) || parts[0].charAt(3)) : '子';
        const nianGan = (parts[0] && parts[0].length >= 1) ? parts[0].charAt(0) : '甲';

        const SEASONS = ['寅','卯','辰','巳','午','未','申','酉','戌','亥','子','丑'];
        const yj = (m.YueJiang || '子').replace('将','');
        const yjIdx = DZ.indexOf(yj);
        const seasonMap = {1:'寅月春',2:'卯月春',3:'辰月春',4:'巳月夏',5:'午月夏',6:'未月夏',
                           7:'申月秋',8:'酉月秋',9:'戌月秋',10:'亥月冬',11:'子月冬',0:'丑月冬'};
        const seasonStr = seasonMap[yjIdx + 1] || '寅月春';

        const kw = m.KongWang ? m.KongWang.split('、').map(s=>s.trim()).filter(Boolean) : ['子','丑'];
        const kwKey = kw.slice().sort().join('');
        const KW_MAP = {'子丑':'丑','寅卯':'寅','辰巳':'辰','午未':'午','申酉':'申','戌亥':'戌'};
        const xunShou = KW_MAP[kwKey] || '子';

        data.Context.ssCtx = {
            taiSui: nianZhi, nianGan, yueJian: yj,
            riGan: data.Context.gan || '甲',
            riZhi: data.Context.zhi || '子',
            seasonStr, xunShou, kw, tShen: {}
        };
    }

    function patchShenSha() {
        if (!window.UI || typeof window.UI.renderBoard !== 'function') return;

        const orig = window.UI.renderBoard;
        window.UI.renderBoard = function(data) {
            ensureSSCtx(data);
            return orig.call(this, data);
        };

        console.log('[UI补丁V2] ✅ 神煞修复已激活');
    }

    // ==========================================
    // 修复2：DOM后处理 - 每次 renderHistoryList 后注入AI简报
    // ==========================================
    function postProcessHistoryList() {
        const ls = document.getElementById('history_list');
        if (!ls) return;

        const st = getState();
        if (!st) return;

        const cards = ls.querySelectorAll('.history-card');
        cards.forEach(card => {
            const id = card.dataset.id;
            if (!id || card.querySelector('.v7-ai-brief')) return; // 已注入则跳过

            const r = (st.history || []).find(rec => String(rec.id) === String(id));
            if (!r) return;

            // 注入 AI简报 到卡片中（标题行后面）
            const header = card.querySelector('.history-header') || 
                          card.querySelector('.history-meta') ||
                          card.childNodes[0];
            if (!header) return;

            const brief = buildAIBrief(r);
            const briefDiv = document.createElement('div');
            briefDiv.className = 'v7-ai-brief';
            briefDiv.style.cssText = 'margin:6px 0; padding:6px 10px; background:#FFFBEB; border-radius:6px; border:1px solid #FDE68A; font-size:12px;';

            const isOpen = st.openAiBoxIds && st.openAiBoxIds.has(String(id));

            briefDiv.innerHTML = `
                <div style="display:flex; align-items:center; justify-content:space-between;">
                    <span style="font-weight:600;color:#1f2937;font-size:12px;">
                        🤖 AI简报 ${brief.verdict ? '<span style="color:#92400e;font-size:11px;">'+brief.verdict+'</span>' : ''}
                    </span>
                    <button class="v7-ai-toggle-btn" style="font-size:10px;padding:3px 8px;background:${isOpen?'#8C2131':'#f3f4f6'};color:${isOpen?'white':'#4b5563'};border:1px solid #d1d5db;border-radius:4px;cursor:pointer;">
                        ${isOpen ? '▲ 收起' : '▼ 展开详情'}
                    </button>
                </div>
                ${brief.text ? '<div style="font-size:11px;color:#6b7280;margin-top:3px;line-height:1.4;">'+brief.text+'</div>' : 
                  '<div style="font-size:11px;color:#9ca3af;font-style:italic;">尚未进行AI推演</div>'}
            `;

            // 插入到 header 之后
            if (header.nextSibling) {
                header.parentNode.insertBefore(briefDiv, header.nextSibling);
            } else {
                header.parentNode.appendChild(briefDiv);
            }

            // 绑定展开按钮
            const toggleBtn = briefDiv.querySelector('.v7-ai-toggle-btn');
            if (toggleBtn) {
                toggleBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    toggleAIDetail(card, id, r);
                });
            }
        });
    }

    // ===== 构建AI简报（纯文本） =====
    function buildAIBrief(r) {
        if (!r.aiResults) return { text: '', verdict: '' };

        let bestText = '';
        let bestEng = '';
        for (const eng of ['DeepSeek','Qwen','Gemini','GLM']) {
            const t = (r.aiResults[eng] && r.aiResults[eng].text) || '';
            if (t.length > bestText.length) { bestText = t; bestEng = eng; }
        }

        if (!bestText || bestText.length < 10) return { text: '', verdict: '' };

        const clean = bestText.replace(/<[^>]*>/g, '').replace(/\n+/g, ' ').trim();
        const summary = clean.substring(0, 130);

        let verdict = '';
        const patterns = [
            /(?:结论|判定|定性评级|最终)[：:]\s*([^。\n]{0,30})/,
            /E值[=＝]?\s*(\d+\.?\d*)\s*[\(（]?([^)）\n]{0,20})[\)）]?/,
            /(?:吉凶|胜负)[：:]\s*([^。\n]{0,20})/,
        ];
        for (const p of patterns) {
            const m = bestText.match(p);
            if (m) { verdict = (m[1]||'') + (m[2]||''); break; }
        }

        return { text: summary + '...', verdict };
    }

    // ===== 展开/折叠AI详情 =====
    function toggleAIDetail(card, id, r) {
        const st = getState();
        let existingBox = card.querySelector('.v7-ai-detail');
        const toggleBtn = card.querySelector('.v7-ai-toggle-btn');

        if (existingBox) {
            // 折叠
            existingBox.remove();
            if (toggleBtn) { toggleBtn.textContent = '▼ 展开详情'; toggleBtn.style.background='#f3f4f6'; toggleBtn.style.color='#4b5563'; }
            if (st && st.openAiBoxIds) st.openAiBoxIds.delete(String(id));
            return;
        }

        // 展开
        if (toggleBtn) { toggleBtn.textContent = '▲ 收起'; toggleBtn.style.background='#8C2131'; toggleBtn.style.color='white'; }
        if (st && st.openAiBoxIds) st.openAiBoxIds.add(String(id));

        const detailDiv = document.createElement('div');
        detailDiv.className = 'v7-ai-detail';
        detailDiv.style.cssText = 'margin-top:8px; padding-top:8px; border-top:1px dashed #d1d5db;';

        detailDiv.innerHTML = `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                <div style="background:#f9fafb; border-radius:6px; padding:8px; border:1px solid #e5e7eb;">
                    <div style="font-size:11px;font-weight:600;color:#1f2937;margin-bottom:4px;">🤖 DeepSeek</div>
                    <div style="font-size:11px;color:#4b5563;max-height:200px;overflow-y:auto;white-space:pre-wrap;">${getAIText(r,'DeepSeek')}</div>
                </div>
                <div style="background:#f9fafb; border-radius:6px; padding:8px; border:1px solid #e5e7eb;">
                    <div style="font-size:11px;font-weight:600;color:#1f2937;margin-bottom:4px;">🤖 Qwen</div>
                    <div style="font-size:11px;color:#4b5563;max-height:200px;overflow-y:auto;white-space:pre-wrap;">${getAIText(r,'Qwen')}</div>
                </div>
                <div style="background:#f9fafb; border-radius:6px; padding:8px; border:1px solid #e5e7eb;">
                    <div style="font-size:11px;font-weight:600;color:#1f2937;margin-bottom:4px;">🤖 Gemini</div>
                    <div style="font-size:11px;color:#4b5563;max-height:200px;overflow-y:auto;white-space:pre-wrap;">${getAIText(r,'Gemini')}</div>
                </div>
                <div style="background:#f9fafb; border-radius:6px; padding:8px; border:1px solid #e5e7eb;">
                    <div style="font-size:11px;font-weight:600;color:#1f2937;margin-bottom:4px;">🤖 GLM</div>
                    <div style="font-size:11px;color:#4b5563;max-height:200px;overflow-y:auto;white-space:pre-wrap;">${getAIText(r,'GLM')}</div>
                </div>
            </div>
        `;

        // 插入到AI简报后面
        const briefDiv = card.querySelector('.v7-ai-brief');
        if (briefDiv) {
            briefDiv.parentNode.insertBefore(detailDiv, briefDiv.nextSibling);
        } else {
            card.appendChild(detailDiv);
        }
    }

    function getAIText(r, engine) {
        if (r.aiResults && r.aiResults[engine] && r.aiResults[engine].text) {
            return r.aiResults[engine].text;
        }
        return '(暂无推演)';
    }

    // ==========================================
    // 拦截 renderHistoryList
    // ==========================================
    function patchHistoryList() {
        if (!window.UI || typeof window.UI.renderHistoryList !== 'function') return;

        const orig = window.UI.renderHistoryList;

        window.UI.renderHistoryList = function() {
            orig.call(window.UI);
            // 等 DOM 渲染完再后处理
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    postProcessHistoryList();
                });
            });
        };

        // 立即触发一次
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                if (window.UI.renderHistoryList) window.UI.renderHistoryList();
                console.log('[UI补丁V2] ✅ AI推演后处理已激活');
            });
        });
    }

    // ==========================================
    // 修复：AI盒子滚动消失 → MutationObserver 监控
    // ==========================================
    function watchDOMChanges() {
        const ls = document.getElementById('history_list');
        if (!ls) return;

        // 监控 history_list 的子树变化
        const observer = new MutationObserver((mutations) => {
            let needsUpdate = false;
            for (const m of mutations) {
                if (m.type === 'childList' && m.addedNodes.length > 0) {
                    needsUpdate = true;
                    break;
                }
                if (m.type === 'characterData') {
                    needsUpdate = true;
                    break;
                }
            }
            if (needsUpdate) {
                requestAnimationFrame(() => postProcessHistoryList());
            }
        });

        observer.observe(ls, { childList: true, subtree: true, characterData: true });
        console.log('[UI补丁V2] ✅ DOM变化监控已激活');
    }

    // ==========================================
    // 启动
    // ==========================================
    function init() {
        const maxTries = 60;
        let tries = 0;
        const check = setInterval(() => {
            tries++;
            if (window.UI && window.SHENSHA && getState()) {
                clearInterval(check);
                patchShenSha();
                patchHistoryList();
                watchDOMChanges();
                console.log('[UI补丁V2] 🎉 全部激活');
            } else if (tries >= maxTries) {
                clearInterval(check);
                console.warn('[UI补丁V2] ⚠️ 超时，UI/SHENSHA/STATE未就绪');
            }
        }, 300);
    }

    if (document.readyState === 'complete') init();
    else window.addEventListener('load', init);

})();
