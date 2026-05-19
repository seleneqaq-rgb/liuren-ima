/**
 * 大六壬 UI修复 V4 — DOM事件委托版
 * 不修改HTML源码，纯DOM层注入
 * 
 * 1. 监听 #history_list 的点击，拦截AI展开按钮
 * 2. 每次渲染后自动注入AI简报到卡片
 * 3. 用 passive event delegation 防止AI盒子消失
 */

(function() {
    'use strict';
    var booted = false;
    var observer = null;

    // ===== 工具 =====
    function log(s) { console.log('[UI-Fix]', s); }

    // ===== 提取AI摘要 =====
    function getAISummary(rec) {
        if (!rec || !rec.aiResults) return { text: '', verdict: '' };
        var best = '', bestEng = '';
        ['DeepSeek','Qwen','Gemini','GLM'].forEach(function(e) {
            var t = (rec.aiResults[e] && rec.aiResults[e].text) || '';
            if (t.length > best.length) { best = t; bestEng = e; }
        });
        if (!best || best.length < 10) return { text: '', verdict: '' };
        var clean = best.replace(/<[^>]*>/g, '').replace(/\n+/g, ' ').trim().substring(0, 130);
        var v = '';
        var m = best.match(/(?:结论|判定|评级)[：:]\s*([^。\n]{0,30})/);
        if (m) v = m[1];
        return { text: clean + '...', verdict: v, source: bestEng };
    }

    // ===== 获取STATE =====
    function getST() {
        try { if (typeof STATE !== 'undefined' && STATE.history) return STATE; }
        catch(e) {}
        try { if (window.STATE && window.STATE.history) return window.STATE; }
        catch(e) {}
        return null;
    }

    // ===== 查找记录 =====
    function findRecord(id) {
        var st = getST();
        if (!st || !st.history) return null;
        for (var i = 0; i < st.history.length; i++) {
            if (String(st.history[i].id) === String(id)) return st.history[i];
        }
        return null;
    }

    // ===== 注入AI简报DOM =====
    function injectAIBrief(card) {
        if (!card) return;
        if (card.querySelector('.v7-ai-brief-inline')) return; // 已注入
        var id = card.getAttribute('data-id');
        if (!id) return;

        var rec = findRecord(id);
        if (!rec) return;

        var brief = getAISummary(rec);
        var st = getST();
        var isOpen = st && st.openAiBoxIds && st.openAiBoxIds.has(String(id));

        // 找插入位置：meta行后面，capsule之前
        var meta = card.querySelector('.history-meta');
        var anchor = meta || card.querySelector('.history-header') || card.firstElementChild;
        if (!anchor) return;

        var div = document.createElement('div');
        div.className = 'v7-ai-brief-inline';
        div.style.cssText = 'margin:4px 0; padding:6px 10px; background:#FFFBEB; border-radius:6px; border:1px solid #FDE68A; font-size:12px;';

        if (brief.text) {
            div.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;">' +
                '<span style="font-weight:600;color:#1f2937;font-size:12px;">🤖 AI简报' +
                (brief.verdict ? ' <span style="color:#92400e;font-size:11px;">'+brief.verdict+'</span>' : '') +
                '</span>' +
                '<button class="v7-ai-toggle-btn" data-id="'+id+'" style="font-size:10px;padding:2px 8px;' +
                (isOpen ? 'background:#8C2131;color:white;' : 'background:#f3f4f6;color:#4b5563;') +
                'border:1px solid #d1d5db;border-radius:4px;cursor:pointer;">' +
                (isOpen ? '▲ 收起' : '▼ 展开详情') + '</button></div>' +
                '<div style="font-size:11px;color:#6b7280;margin-top:2px;line-height:1.4;">'+brief.text+'</div>';
        } else {
            div.innerHTML = '<span style="color:#9ca3af;font-style:italic;">🤖 尚未进行AI推演</span>';
        }

        anchor.parentNode.insertBefore(div, anchor.nextSibling);
    }

    // ===== 注入所有卡片（防抖） =====
    var injectTimer = null;
    function injectAll() {
        clearTimeout(injectTimer);
        injectTimer = setTimeout(function() {
            var cards = document.querySelectorAll('#history_list .history-card');
            cards.forEach(injectAIBrief);
        }, 100);
    }

    // ===== 展开/折叠AI详情 =====
    function toggleAIDetail(btn, id) {
        if (!btn) return;
        var card = btn.closest('.history-card');
        if (!card) return;

        var st = getST();
        var existing = card.querySelector('.v7-ai-detail-box');

        if (existing) {
            // 折叠
            existing.remove();
            btn.textContent = '▼ 展开详情';
            btn.style.background = '#f3f4f6';
            btn.style.color = '#4b5563';
            if (st && st.openAiBoxIds) st.openAiBoxIds.delete(String(id));
            return;
        }

        // 展开
        btn.textContent = '▲ 收起';
        btn.style.background = '#8C2131';
        btn.style.color = 'white';
        if (st && st.openAiBoxIds) st.openAiBoxIds.add(String(id));

        var rec = findRecord(id);
        if (!rec) return;

        var box = document.createElement('div');
        box.className = 'v7-ai-detail-box';
        box.style.cssText = 'margin:4px 0; padding:8px; background:#f9fafb; border-radius:6px; border:1px solid #e5e7eb;';

        var engs = ['DeepSeek', 'Qwen', 'Gemini', 'GLM'];
        var html = '<div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">';
        engs.forEach(function(e) {
            var t = (rec.aiResults && rec.aiResults[e] && rec.aiResults[e].text) || '(暂无推演)';
            html += '<div style="background:white; border-radius:4px; padding:6px; border:1px solid #e5e7eb;">' +
                '<div style="font-size:11px;font-weight:600;color:#1f2937;margin-bottom:2px;">🤖 '+e+'</div>' +
                '<div style="font-size:11px;color:#4b5563;max-height:180px;overflow-y:auto;white-space:pre-wrap;">'+t+'</div>' +
                '</div>';
        });
        html += '</div>';
        box.innerHTML = html;

        // 插入到AI简报后面
        var briefDiv = card.querySelector('.v7-ai-brief-inline');
        if (briefDiv) {
            briefDiv.parentNode.insertBefore(box, briefDiv.nextSibling);
        } else {
            card.appendChild(box);
        }
    }

    // ===== 事件委托：监听 history_list 上所有点击 =====
    function setupDelegation() {
        var ls = document.getElementById('history_list');
        if (!ls) return;
        if (ls._v7_delegated) return;
        ls._v7_delegated = true;

        ls.addEventListener('click', function(e) {
            // 检查是否是AI展开按钮
            var toggleBtn = e.target.closest('.v7-ai-toggle-btn');
            if (toggleBtn) {
                e.stopPropagation();
                e.preventDefault();
                toggleAIDetail(toggleBtn, toggleBtn.getAttribute('data-id'));
                return;
            }

            // 检查是否点击了AI盒子内的东西（不做处理，防止冒泡到卡片加载）
            if (e.target.closest('.v7-ai-detail-box') || e.target.closest('.v7-ai-brief-inline')) {
                // 不阻止，但也不做特殊处理
            }
        }, true); // 捕获阶段

        log('✅ 事件委托已绑定');
    }

    // ===== MutationObserver =====
    function watchDOM() {
        var ls = document.getElementById('history_list');
        if (!ls) return;
        if (observer) observer.disconnect();

        observer = new MutationObserver(function() {
            injectAll();
        });
        observer.observe(ls, { childList: true, subtree: true });
        log('✅ DOM监控已激活');
    }

    // ===== 拦截 renderHistoryList =====
    function patchRender() {
        if (!window.UI || !window.UI.renderHistoryList || window.UI.renderHistoryList._v7_patched) return;
        
        var orig = window.UI.renderHistoryList;
        window.UI.renderHistoryList = function() {
            orig.apply(window.UI, arguments);
            injectAll();
        };
        window.UI.renderHistoryList._v7_patched = true;
        log('✅ renderHistoryList 已拦截');
    }

    // ===== 启动 =====
    function boot() {
        if (booted) return;

        // 检查必要条件
        var ls = document.getElementById('history_list');
        if (!ls) {
            setTimeout(boot, 1000);
            return;
        }

        setupDelegation();
        watchDOM();
        injectAll();

        if (window.UI && window.UI.renderHistoryList) {
            patchRender();
        }

        booted = true;
        log('🎉 V4 UI补丁全部激活');
    }

    // 页面加载
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(boot, 2000);
        });
    } else {
        setTimeout(boot, 2000);
    }

    // 后备：每5秒重试一次
    var retry = setInterval(function() {
        if (booted) { clearInterval(retry); return; }
        boot();
    }, 5000);

})();
