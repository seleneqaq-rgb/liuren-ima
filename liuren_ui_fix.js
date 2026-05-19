/**
 * 大六壬 V7 界面修复补丁 V3 — 零依赖自启动版
 * 不依赖 UI / SHENSHA / STATE 的加载时机，直接用DOM轮询
 */

(function() {

    // ==========================================
    // 工具
    // ==========================================
    function getState() {
        // 尝试所有可能的方式访问 STATE
        if (typeof STATE !== 'undefined') return STATE;
        if (window.STATE) return window.STATE;
        return null;
    }

    function getUI() {
        if (window.UI && typeof window.UI.renderHistoryList === 'function') return window.UI;
        if (window.UI && typeof window.UI.renderBoard === 'function') return window.UI;
        return null;
    }

    function log(msg) { console.log('[UI补丁V3]', msg); }

    // ==========================================
    // 修复1：神煞 ssCtx 构建
    // ==========================================
    function buildSSCtx(data) {
        if (!data) return null;
        if (data.Context && data.Context.ssCtx) return data.Context.ssCtx;

        const m = data.Meta || {};
        const bz = m.BaZi || '';
        const parts = bz.split(' ');
        if (parts.length < 3) return null;

        const DZ = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
        const re = /([甲-癸])/;
        const nianGan = (parts[0].match(re) || ['甲'])[0];
        const nianZhi = DZ.find(z => parts[0].includes(z)) || '子';
        const yj = (m.YueJiang || '子').replace('将','');
        const riGan = data.Context ? data.Context.gan : (parts[2] ? parts[2].charAt(0) : '甲');
        const riZhi = data.Context ? data.Context.zhi : (parts[2] ? parts[2].charAt(1) : '子');

        const seasonMap = {0:'丑月冬',1:'寅月春',2:'卯月春',3:'辰月春',4:'巳月夏',
                           5:'午月夏',6:'未月夏',7:'申月秋',8:'酉月秋',
                           9:'戌月秋',10:'亥月冬',11:'子月冬'};
        const yjIdx = DZ.indexOf(yj);
        const seasonStr = seasonMap[yjIdx + 1] || seasonMap[0];

        const kw = m.KongWang ? m.KongWang.split('、').map(s=>s.trim()).filter(Boolean) : ['子','丑'];
        const kwSorted = kw.slice().sort().join('');
        const KW_MAP = {'子丑':'丑','寅卯':'寅','辰巳':'辰','午未':'午','申酉':'申','戌亥':'戌'};
        const xunShou = KW_MAP[kwSorted] || '子';

        return {
            taiSui: nianZhi, nianGan, yueJian: yj,
            riGan, riZhi, seasonStr, xunShou, kw, tShen: {}
        };
    }

    function patchShenSha() {
        const ui = getUI();
        if (!ui) return false;

        const orig = ui.renderBoard;
        ui.renderBoard = function(data) {
            if (data && data.Context && !data.Context.ssCtx) {
                const ssCtx = buildSSCtx(data);
                if (ssCtx) data.Context.ssCtx = ssCtx;
            }
            return orig.call(this, data);
        };

        log('✅ 神煞修复已激活');
        return true;
    }

    // ==========================================
    // 修复2：AI推演 DOM后处理
    // ==========================================
    function postProcessCards() {
        const ls = document.getElementById('history_list');
        if (!ls) return;

        const st = getState();
        const cards = ls.querySelectorAll('.history-card');

        cards.forEach(card => {
            const id = card.dataset.id;
            if (!id) return;

            // 找这条记录
            let record = null;
            if (st && st.history) {
                record = st.history.find(r => String(r.id) === String(id));
            }
            if (!record) return;

            // 已注入则跳过
            if (card.querySelector('.v7-ai-brief')) return;

            // 找到插入位置：在标题行或元信息行后面
            const header = card.querySelector('.history-header');
            const meta = card.querySelector('.history-meta');
            const anchor = meta || header || card.firstElementChild;
            if (!anchor) return;

            // AI简报
            const brief = buildBriefHTML(record, id, st);
            const wrapper = document.createElement('div');
            wrapper.className = 'v7-ai-brief';
            wrapper.style.cssText = 'margin:4px 0; padding:6px 10px; background:#FFFBEB; border-radius:6px; border:1px solid #FDE68A; font-size:12px;';
            wrapper.innerHTML = brief;

            anchor.parentNode.insertBefore(wrapper, anchor.nextSibling);

            // 绑定按钮
            const toggleBtn = wrapper.querySelector('.v7-ai-toggle');
            if (toggleBtn) {
                toggleBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    e.preventDefault();
                    toggleDetail(card, id, record, st);
                });
            }
        });
    }

    function buildBriefHTML(record, id, st) {
        // 提取AI文本
        let bestText = '';
        for (const eng of ['DeepSeek','Qwen','Gemini','GLM']) {
            const t = (record.aiResults && record.aiResults[eng] && record.aiResults[eng].text) || '';
            if (t.length > bestText.length) bestText = t;
        }

        if (!bestText || bestText.length < 10) {
            return '<span style="color:#9ca3af;font-style:italic;">🤖 尚未进行AI推演</span>';
        }

        const clean = bestText.replace(/<[^>]*>/g, '').replace(/\n+/g, ' ').trim();
        const summary = clean.substring(0, 130);

        // 提取结论
        let verdict = '';
        const m = bestText.match(/(?:结论|判定|评级)[：:]\s*([^。\n]{0,30})/);
        if (m) verdict = m[1];

        const isOpen = st && st.openAiBoxIds && st.openAiBoxIds.has(String(id));
        const btnStyle = isOpen ? 'background:#8C2131;color:white;' : 'background:#f3f4f6;color:#4b5563;';
        const btnText = isOpen ? '▲ 收起' : '▼ 展开详情';

        return `
            <div style="display:flex; align-items:center; justify-content:space-between;">
                <span style="font-weight:600;color:#1f2937;font-size:12px;">
                    🤖 AI简报 ${verdict ? '<span style="color:#92400e;font-size:11px;margin-left:6px;">'+verdict+'</span>' : ''}
                </span>
                <button class="v7-ai-toggle" style="font-size:10px;padding:2px 8px;${btnStyle}border:1px solid #d1d5db;border-radius:4px;cursor:pointer;">${btnText}</button>
            </div>
            <div style="font-size:11px;color:#6b7280;margin-top:2px;line-height:1.4;">${summary}...</div>`;
    }

    function toggleDetail(card, id, record, st) {
        let detailBox = card.querySelector('.v7-ai-detail');
        const toggleBtn = card.querySelector('.v7-ai-toggle');

        if (detailBox) {
            // 折叠
            detailBox.remove();
            if (toggleBtn) { toggleBtn.textContent = '▼ 展开详情'; toggleBtn.style.background='#f3f4f6'; toggleBtn.style.color='#4b5563'; }
            if (st && st.openAiBoxIds) st.openAiBoxIds.delete(String(id));
            return;
        }

        // 展开
        if (toggleBtn) { toggleBtn.textContent = '▲ 收起'; toggleBtn.style.background='#8C2131'; toggleBtn.style.color='white'; }
        if (st && st.openAiBoxIds) st.openAiBoxIds.add(String(id));

        detailBox = document.createElement('div');
        detailBox.className = 'v7-ai-detail';
        detailBox.style.cssText = 'margin:6px 0; padding:8px; background:#f9fafb; border-radius:6px; border:1px solid #e5e7eb;';

        const engines = ['DeepSeek', 'Qwen', 'Gemini', 'GLM'];
        detailBox.innerHTML = '<div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">' +
            engines.map(eng => {
                const text = (record.aiResults && record.aiResults[eng] && record.aiResults[eng].text) || '(暂无)';
                return `<div style="background:white; border-radius:4px; padding:6px; border:1px solid #e5e7eb;">
                    <div style="font-size:11px;font-weight:600;color:#1f2937;margin-bottom:2px;">🤖 ${eng}</div>
                    <div style="font-size:11px;color:#4b5563;max-height:180px;overflow-y:auto;white-space:pre-wrap;">${text}</div>
                </div>`;
            }).join('') + '</div>';

        // 插入到简报后面
        const briefDiv = card.querySelector('.v7-ai-brief');
        if (briefDiv && briefDiv.nextSibling) {
            briefDiv.parentNode.insertBefore(detailBox, briefDiv.nextSibling);
        } else {
            card.appendChild(detailBox);
        }
    }

    function patchHistoryList() {
        const ui = getUI();
        if (!ui) return false;

        const orig = ui.renderHistoryList;
        ui.renderHistoryList = function() {
            orig.call(this);
            // DOM渲染后注入
            requestAnimationFrame(() => {
                requestAnimationFrame(() => postProcessCards());
            });
        };

        // 立即触发一次
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                if (ui.renderHistoryList) ui.renderHistoryList();
            });
        });

        log('✅ AI推演后处理已激活');
        return true;
    }

    // ==========================================
    // DOM监控：AI盒子滚动不消失
    // ==========================================
    function watchHistoryDOM() {
        const ls = document.getElementById('history_list');
        if (!ls) return false;

        const observer = new MutationObserver(() => {
            requestAnimationFrame(() => postProcessCards());
        });

        observer.observe(ls, { childList: true, subtree: true, characterData: true });
        log('✅ DOM变化监控已激活');
        return true;
    }

    // ==========================================
    // 自启动 — 用DOM轮询替代依赖STATE/UI
    // ==========================================
    function bootstrap() {
        let shenShaDone = false;
        let historyDone = false;
        let watchDone = false;

        const checker = setInterval(() => {
            // 1. 神煞修复：需要 #out_board 出现 + SHENSHA 就绪
            if (!shenShaDone && document.getElementById('out_board') && window.SHENSHA) {
                shenShaDone = patchShenSha();
            }

            // 2. AI推演：需要 #history_list 有卡片
            if (!historyDone) {
                const cards = document.querySelectorAll('#history_list .history-card');
                if (cards.length > 0 && getUI()) {
                    historyDone = patchHistoryList();
                }
            }

            // 3. DOM监控
            if (!watchDone && document.getElementById('history_list')) {
                watchDone = watchHistoryDOM();
            }

            if (shenShaDone && historyDone && watchDone) {
                clearInterval(checker);
                log('🎉 全部激活完成');
            }
        }, 500);

        // 最多等60秒
        setTimeout(() => {
            clearInterval(checker);
            if (!shenShaDone || !historyDone) {
                log('⚠️ 部分功能未激活，可能需手动排盘一次');
            }
        }, 60000);
    }

    // 页面加载完就开始
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrap);
    } else {
        bootstrap();
    }

})();
