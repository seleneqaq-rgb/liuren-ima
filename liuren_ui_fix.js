/**
 * 大六壬 UI修复 V6 — 纯DOM版
 * AI简报直接从卡片已渲染的隐藏AI盒子提取，不依赖STATE
 */
(function() {
    'use strict';
    var booted = false, observer = null, injectTimer = null;

    function log(s) { console.log('[UI-Fix]', s); }

    // ===== 从卡片DOM提取AI文字 =====
    function getAITextFromDOM(card, id) {
        var best = '';
        // 方法1：原版隐藏AI盒子里的 .ai-panel-body
        var aiBox = document.getElementById('history-ai-box-' + id);
        if (aiBox) {
            var bodies = aiBox.querySelectorAll('.ai-panel-body');
            bodies.forEach(function(b) {
                var t = (b.innerText || b.textContent || '').trim();
                if (t.length > best.length) best = t;
            });
        }
        // 方法2：card_stream_xxx_id 元素
        if (!best || best.length < 5) {
            ['deepseek','qwen','gemini','glm'].forEach(function(e) {
                var el = document.getElementById('card_stream_' + e + '_' + id);
                if (el) {
                    var t = (el.innerText || el.textContent || '').trim();
                    if (t.length > best.length) best = t;
                }
            });
        }
        return best;
    }

    // ===== 从AI文字提取结论 =====
    function extractVerdict(text) {
        if (!text || text.length < 10) return '';
        var m = text.match(/(?:结论|判定|评级|定性)[：:]\s*([^。\n]{0,30})/);
        if (m) return m[1];
        var m2 = text.match(/E值[=＝]?\s*(\d+\.?\d*)\s*[\(（]?([^)）\n]{0,20})[\)）]?/);
        if (m2) return 'E=' + m2[1] + (m2[2] || '');
        return '';
    }

    // ===== 获取STATE（兼容）=====
    function getST() {
        try { if (typeof STATE !== 'undefined' && STATE && STATE.history) return STATE; } catch(e) {}
        try { if (window.STATE && window.STATE.history) return window.STATE; } catch(e) {}
        return null;
    }

    // ===== 注入AI简报到一张卡片 =====
    function injectAIBrief(card) {
        if (!card || card.querySelector('.v7-ai-brief-inline')) return;
        var id = card.getAttribute('data-id');
        if (!id) return;

        // 从DOM提取AI文字
        var aiText = getAITextFromDOM(card, id);
        if (!aiText || aiText.length < 10) {
            // 没有AI文字，显示占位
            var div = document.createElement('div');
            div.className = 'v7-ai-brief-inline';
            div.style.cssText = 'margin:4px 0; padding:6px 10px; background:#f9fafb; border-radius:6px; border:1px solid #e5e7eb; font-size:12px;';
            div.innerHTML = '<span style="color:#9ca3af;font-style:italic;">🤖 尚未进行AI推演</span>';
            var anchor = card.querySelector('.history-meta') || card.querySelector('.history-header') || card.firstElementChild;
            if (anchor) anchor.parentNode.insertBefore(div, anchor.nextSibling);
            return;
        }

        var clean = aiText.replace(/\n+/g, ' ').trim().substring(0, 130);
        var verdict = extractVerdict(aiText);
        var st = getST();
        var isOpen = st && st.openAiBoxIds && st.openAiBoxIds.has(String(id));

        var div = document.createElement('div');
        div.className = 'v7-ai-brief-inline';
        div.style.cssText = 'margin:4px 0; padding:6px 10px; background:#FFFBEB; border-radius:6px; border:1px solid #FDE68A; font-size:12px;';
        div.innerHTML = 
            '<div style="display:flex;align-items:center;justify-content:space-between;">' +
            '<span style="font-weight:600;color:#1f2937;font-size:12px;">🤖 AI简报' +
            (verdict ? ' <span style="color:#92400e;font-size:11px;">' + verdict + '</span>' : '') +
            '</span>' +
            '<button class="v7-ai-toggle-btn" data-id="'+id+'" style="font-size:10px;padding:2px 8px;' +
            (isOpen ? 'background:#8C2131;color:white;' : 'background:#f3f4f6;color:#4b5563;') +
            'border:1px solid #d1d5db;border-radius:4px;cursor:pointer;">' +
            (isOpen ? '▲ 收起' : '▼ 展开') + '</button></div>' +
            '<div style="font-size:11px;color:#6b7280;margin-top:2px;line-height:1.4;">'+clean+'...</div>';

        var anchor = card.querySelector('.history-meta') || card.querySelector('.history-header') || card.firstElementChild;
        if (anchor) anchor.parentNode.insertBefore(div, anchor.nextSibling);
    }

    // ===== 注入所有卡片入口 =====
    function injectAll() {
        clearTimeout(injectTimer);
        injectTimer = setTimeout(function() {
            var cards = document.querySelectorAll('#history_list .history-card');
            cards.forEach(injectAIBrief);
        }, 200);
    }

    // ===== 展开/折叠AI详情 =====
    function toggleAIDetail(btn, id) {
        if (!btn) return;
        var card = btn.closest('.history-card');
        if (!card) return;
        var st = getST();
        var aiBox = document.getElementById('history-ai-box-' + id);

        if (aiBox) {
            // 切换原版隐藏AI盒子
            if (aiBox.classList.contains('hidden')) {
                aiBox.classList.remove('hidden');
                btn.textContent = '▲ 收起';
                btn.style.background = '#8C2131'; btn.style.color = 'white';
                if (st && st.openAiBoxIds) st.openAiBoxIds.add(String(id));
            } else {
                aiBox.classList.add('hidden');
                btn.textContent = '▼ 展开';
                btn.style.background = '#f3f4f6'; btn.style.color = '#4b5563';
                if (st && st.openAiBoxIds) st.openAiBoxIds.delete(String(id));
            }
            return;
        }

        // 原版AI盒子不存在，从DOM中取纯文本展示
        var existing = card.querySelector('.v7-ai-detail-box');
        if (existing) {
            existing.remove();
            btn.textContent = '▼ 展开';
            btn.style.background = '#f3f4f6'; btn.style.color = '#4b5563';
            if (st && st.openAiBoxIds) st.openAiBoxIds.delete(String(id));
            return;
        }

        btn.textContent = '▲ 收起';
        btn.style.background = '#8C2131'; btn.style.color = 'white';
        if (st && st.openAiBoxIds) st.openAiBoxIds.add(String(id));

        var box = document.createElement('div');
        box.className = 'v7-ai-detail-box';
        box.style.cssText = 'margin:4px 0; padding:8px; background:#f9fafb; border-radius:6px; border:1px solid #e5e7eb;';

        var engs = ['DeepSeek','Qwen','Gemini','GLM'];
        var html = '<div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">';
        engs.forEach(function(e) {
            var txt = '';
            var el = document.getElementById('card_stream_' + e.toLowerCase() + '_' + id);
            if (el) txt = (el.innerText || el.textContent || '').trim();
            if (!txt) {
                var aiBox2 = document.getElementById('history-ai-box-' + id);
                if (aiBox2) {
                    var bodies = aiBox2.querySelectorAll('.ai-panel-body');
                    bodies.forEach(function(b) { var t = b.innerText.trim(); if (t.length > txt.length) txt = t; });
                }
            }
            if (!txt) txt = '(暂无)';
            html += '<div style="background:white; border-radius:4px; padding:6px; border:1px solid #e5e7eb;">'+
                '<div style="font-size:11px;font-weight:600;color:#1f2937;margin-bottom:2px;">🤖 '+e+'</div>'+
                '<div style="font-size:11px;color:#4b5563;max-height:150px;overflow-y:auto;white-space:pre-wrap;">'+txt+'</div></div>';
        });
        html += '</div>';
        box.innerHTML = html;

        var anchor = card.querySelector('.v7-ai-brief-inline');
        (anchor ? anchor.parentNode : card).insertBefore(box, anchor ? anchor.nextSibling : card.firstChild);
    }

    // ===== 事件委托 =====
    function setupDelegation() {
        var ls = document.getElementById('history_list');
        if (!ls || ls._v7_delegated) return;
        ls._v7_delegated = true;
        ls.addEventListener('click', function(e) {
            var btn = e.target.closest('.v7-ai-toggle-btn');
            if (btn) {
                e.stopPropagation();
                e.preventDefault();
                toggleAIDetail(btn, btn.getAttribute('data-id'));
            }
        }, true);
        log('✅ 事件委托已绑定');
    }

    // ===== DOM监控 =====
    function watchDOM() {
        var ls = document.getElementById('history_list');
        if (!ls) return;
        if (observer) observer.disconnect();
        observer = new MutationObserver(function() { injectAll(); });
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
        log('✅ renderHistoryList已拦截');
    }

    // ===== 启动 =====
    function boot() {
        if (booted) return;
        var ls = document.getElementById('history_list');
        if (!ls) { setTimeout(boot, 1000); return; }
        setupDelegation();
        watchDOM();
        injectAll();
        if (window.UI && window.UI.renderHistoryList) patchRender();
        booted = true;
        log('🎉 V6 全部激活');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { setTimeout(boot, 1500); });
    } else {
        setTimeout(boot, 1500);
    }
    setInterval(function() { if (!booted) boot(); }, 5000);
})();
