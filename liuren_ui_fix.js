/**
 * 大六壬 UI修复 V7 最终版
 * 
 * 修复1：神煞显示 — 绕过 fixSS，直接给 SHENSHA.run 补齐 ssCtx
 * 修复2：AI推演 — 卡片只显示简报，详细推演移到胜率看板上方统一展示
 */
(function() {
    var booted = false;
    var observer = null;
    var currentCardId = null;

    function log(s) { console.log('[UI-Fix]', s); }

    // ==========================================
    // 修复1：神煞 — 重写 SHENSHA.run 包装
    // ==========================================
    function patchShenSha() {
        if (!window.SHENSHA || !window.SHENSHA.run) return;
        if (window.SHENSHA.run._v7fix) return;
        window.SHENSHA.run._v7fix = true;

        var origRun = window.SHENSHA.run;
        window.SHENSHA.run = function(zhi, ctx) {
            if (!ctx || !ctx.riGan) {
                // ctx 是无效的 ssCtx，尝试从页面状态重建
                try {
                    var mm = (typeof STATE !== 'undefined' && STATE) ? STATE : (window.STATE || null);
                    if (mm && mm.currentRun) {
                        var cr = mm.currentRun;
                        if (cr.Context && cr.Context.ssCtx) {
                            ctx = cr.Context.ssCtx;
                        } else if (cr.Meta && cr.Meta.BaZi) {
                            var DZ = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
                            var bP = cr.Meta.BaZi.split(' ');
                            var nZ = bP[0] ? DZ.find(function(z){return bP[0].indexOf(z)>=0;}) || '子' : '子';
                            var nG = bP[0] ? bP[0].charAt(0) : '甲';
                            var yj = (cr.Meta.YueJiang || '子').replace('将','');
                            var rG = cr.Context ? cr.Context.gan : (bP[2] ? bP[2].charAt(0) : '甲');
                            var rZ = cr.Context ? cr.Context.zhi : (bP[2] ? bP[2].charAt(1) : '子');
                            var kw = cr.Meta.KongWang ? cr.Meta.KongWang.split('、').map(function(s){return s.trim();}).filter(Boolean) : ['子','丑'];
                            var kwK = kw.slice().sort().join('');
                            var KM = {'子丑':'丑','寅卯':'寅','辰巳':'辰','午未':'午','申酉':'申','戌亥':'戌'};
                            var sM = {0:'丑月冬',1:'寅月春',2:'卯月春',3:'辰月春',4:'巳月夏',5:'午月夏',6:'未月夏',7:'申月秋',8:'酉月秋',9:'戌月秋',10:'亥月冬',11:'子月冬'};
                            var yI = yj ? DZ.indexOf(yj) : -1;
                            ctx = {taiSui:nZ,nianGan:nG,yueJian:yj,riGan:rG,riZhi:rZ,seasonStr:sM[yI+1]||'寅月春',xunShou:KM[kwK]||'子',kw:kw,tShen:{}};
                        }
                    }
                } catch(e) {}
            }
            try {
                return origRun.call(window.SHENSHA, zhi, ctx);
            } catch(e) {
                console.warn('[UI-Fix] SHENSHA.run 异常:', e.message);
                return [];
            }
        };
        log('✅ 神煞已补全');
    }

    // ==========================================
    // 修复2：AI推演移到胜率看板上方
    // ==========================================
    var aiDisplayBox = null;

    function getOrCreateAIDisplayBox() {
        if (aiDisplayBox && document.body.contains(aiDisplayBox)) return aiDisplayBox;

        // 找胜率看板容器
        var dashBox = document.querySelector('.card-box[style*="margin-top: 16px; margin-bottom: 16px"]');
        if (!dashBox) {
            // 回退：找 dash_chart_title
            var titleEl = document.getElementById('dash_chart_title');
            if (titleEl) dashBox = titleEl.closest('.card-box');
        }

        if (!dashBox) return null;

        // 创建 AI 推演显示区
        aiDisplayBox = document.createElement('div');
        aiDisplayBox.id = 'v7-ai-display';
        aiDisplayBox.style.cssText = 'margin-top:0; margin-bottom:12px; padding:12px 16px; background:#FAFAFA; border-radius:8px; border:1px solid #e5e7eb; display:none;';
        aiDisplayBox.innerHTML = '<div style="text-align:center; color:#9ca3af; font-size:13px;">👆 点击上方记录卡片查看AI推演</div>';

        dashBox.parentNode.insertBefore(aiDisplayBox, dashBox);
        return aiDisplayBox;
    }

    // ===== 从卡片提取所有AI引擎文字 =====
    function getAIFromCard(card, id) {
        var result = {};
        // 方法1：从原版隐藏AI盒子读
        var aiBox = document.getElementById('history-ai-box-' + id);
        if (aiBox) {
            var panels = aiBox.querySelectorAll('.ai-panel');
            panels.forEach(function(p) {
                var header = (p.querySelector('.ai-panel-header') || {}).innerText || '';
                var body = (p.querySelector('.ai-panel-body') || {}).innerText || '';
                if (header && body) result[header.trim()] = body.trim();
            });
        }
        // 方法2：从 card_stream 读
        if (Object.keys(result).length === 0) {
            ['deepseek','qwen','gemini','glm'].forEach(function(e) {
                var el = document.getElementById('card_stream_' + e + '_' + id);
                if (el) {
                    var txt = (el.innerText || '').trim();
                    if (txt && txt.length > 5) {
                        result[e.charAt(0).toUpperCase() + e.slice(1)] = txt;
                    }
                }
            });
        }
        return result;
    }

    // ===== 更新AI显示区 =====
    function updateAIDisplay(cardId) {
        var box = getOrCreateAIDisplayBox();
        if (!box) return;

        if (!cardId) {
            box.style.display = 'none';
            return;
        }

        var card = document.querySelector('.history-card[data-id="' + cardId + '"]');
        if (!card) {
            box.style.display = 'none';
            return;
        }

        var aiMap = getAIFromCard(card, cardId);
        var engines = Object.keys(aiMap);
        
        if (engines.length === 0) {
            box.style.display = 'block';
            box.innerHTML = '<div style="text-align:center; color:#9ca3af; font-size:13px;">🤖 此记录尚未进行AI推演</div>';
            return;
        }

        // 提取最长的作为简报
        var bestEngine = engines[0], bestText = '';
        engines.forEach(function(e) {
            if (aiMap[e].length > bestText.length) { bestText = aiMap[e]; bestEngine = e; }
        });

        // 提取结论
        var verdict = '';
        var m = bestText.match(/(?:结论|判定|评级|定性)[：:]\s*([^。\n]{0,40})/);
        if (m) verdict = m[1];

        var summary = bestText.replace(/\n+/g, ' ').trim().substring(0, 200);
        var isExpanded = box._expanded;

        var html = '<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">' +
            '<div>' +
            '<span style="font-weight:700;font-size:14px;color:#1f2937;">🤖 AI推演简报</span>' +
            (verdict ? ' <span style="background:#FDE68A;color:#92400e;font-size:12px;padding:1px 8px;border-radius:4px;margin-left:8px;">' + verdict + '</span>' : '') +
            ' <span style="font-size:11px;color:#6b7280;">(来源: ' + bestEngine + ')</span>' +
            '</div>' +
            '<button id="v7-ai-expand-btn" style="font-size:11px;padding:4px 12px;background:' + (isExpanded ? '#8C2131;color:white' : '#f3f4f6;color:#4b5563') + ';border:1px solid #d1d5db;border-radius:4px;cursor:pointer;font-weight:bold;">' +
            (isExpanded ? '▲ 收起详细推演' : '▼ 展开详细推演') + '</button>' +
            '</div>' +
            '<div style="font-size:12px;color:#4b5563;line-height:1.6;padding:8px;background:white;border-radius:4px;border:1px solid #e5e7eb;">' + summary + '...</div>';

        if (isExpanded) {
            html += '<div style="margin-top:8px; display:grid; grid-template-columns:1fr 1fr; gap:8px;">';
            engines.forEach(function(e) {
                html += '<div style="background:white; border-radius:4px; padding:8px; border:1px solid #e5e7eb;">' +
                    '<div style="font-size:11px;font-weight:600;color:#1f2937;margin-bottom:4px;">🤖 ' + e + '</div>' +
                    '<div style="font-size:11px;color:#4b5563;max-height:200px;overflow-y:auto;white-space:pre-wrap;">' + aiMap[e] + '</div>' +
                    '</div>';
            });
            html += '</div>';
        }

        box.innerHTML = html;
        box.style.display = 'block';

        // 绑定展开按钮
        var btn = document.getElementById('v7-ai-expand-btn');
        if (btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                box._expanded = !box._expanded;
                updateAIDisplay(cardId);
            });
        }
    }

    // ===== 卡片点击监听 =====
    function setupCardClick() {
        var ls = document.getElementById('history_list');
        if (!ls || ls._v7_card_click) return;
        ls._v7_card_click = true;

        ls.addEventListener('click', function(e) {
            var card = e.target.closest('.history-card');
            if (!card) return;

            // 避免在点击按钮/select/textarea时触发
            if (e.target.closest('button, select, textarea, input')) return;

            var id = card.getAttribute('data-id');
            if (id) {
                currentCardId = id;
                updateAIDisplay(id);
            }
        }, false);

        log('✅ 卡片点击已绑定');
    }

    // ===== DOM监控 =====
    function watchDOM() {
        var ls = document.getElementById('history_list');
        if (!ls) return;
        if (observer) observer.disconnect();
        observer = new MutationObserver(function() {
            getOrCreateAIDisplayBox();
        });
        observer.observe(ls.parentNode || document.getElementById('view_history') || document.body, 
            { childList: true, subtree: true });
        log('✅ DOM监控已激活');
    }

    // ===== 拦截 renderHistoryList =====
    function patchRender() {
        if (!window.UI || !window.UI.renderHistoryList || window.UI.renderHistoryList._v7_patched) return;
        var orig = window.UI.renderHistoryList;
        window.UI.renderHistoryList = function() {
            orig.apply(window.UI, arguments);
            // 渲染后建立AI显示区并更新
            setTimeout(function() {
                getOrCreateAIDisplayBox();
                if (currentCardId) updateAIDisplay(currentCardId);
            }, 300);
        };
        window.UI.renderHistoryList._v7_patched = true;
        log('✅ renderHistoryList已拦截');
    }

    // ==========================================
    // 启动
    // ==========================================
    function boot() {
        if (booted) return;
        booted = true;

        patchShenSha();

        setupCardClick();
        watchDOM();
        getOrCreateAIDisplayBox();

        if (window.UI && window.UI.renderHistoryList) patchRender();

        log('🎉 V7 全部激活');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { setTimeout(boot, 2000); });
    } else {
        setTimeout(boot, 2000);
    }

    setInterval(function() {
        if (!booted) boot();
        getOrCreateAIDisplayBox();
    }, 10000);
})();
