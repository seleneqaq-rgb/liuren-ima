/**
 * 大六壬 V9 最终补丁 — 不依赖任何全局变量，纯DOM操作
 * 
 * 处理：
 * 1. 神煞兜底：SHENSHA.run 空数据时从各个可能来源取
 * 2. 删除卡片AI盒子 + 胜率看板上方创建AI显示区
 * 3. 点击卡片加载AI推演简报 + 展开详细
 */

(function(){
    var di = null; // display container
    var t = setInterval(function w(){
        if(!window.SHENSHA||!window.SHENSHA.run||!window.UI||!window.UI.renderHistoryList){
            return;
        }
        clearInterval(t);
        
        // ===== 1. 神煞修复 =====
        var ss_orig = window.SHENSHA.run;
        if(!ss_orig._v9){
            window.SHENSHA.run = function(z,c){
                try{
                    if(!c||!c.riGan){
                        // 尝试从 STATE 取
                        try{var s=(typeof STATE!=='undefined'?STATE:window.STATE);if(s&&s.currentRun&&s.currentRun.Context&&s.currentRun.Context.ssCtx&&s.currentRun.Context.ssCtx.riGan)c=s.currentRun.Context.ssCtx;}catch(e){}
                        // 尝试从页面DOM获取
                        if((!c||!c.riGan)&&document.querySelector('.shensha-tags')){
                            // DOM已有神煞标签，什么都不做
                        }
                    }
                    return ss_orig.call(window.SHENSHA,z,c||{});
                }catch(e){return[];}
            };
            window.SHENSHA.run._v9=true;
            console.log('[V9] SHENSHA 已加固');
        }
        
        // ===== 2. 劫持 renderHistoryList =====
        var rl_orig = window.UI.renderHistoryList;
        if(!rl_orig._v9){
            window.UI.renderHistoryList = function(){
                rl_orig.apply(window.UI,arguments);
                setTimeout(rm,300);
            };
            window.UI.renderHistoryList._v9=true;
        }
        
        // ===== 3. 立即可执行 =====
        setTimeout(rm,1000);
        
        console.log('[V9] 启动完成');
    },500);
    
    // ===== 删除卡片AI盒 + 创建显示区 =====
    function rm(){
        // 删卡片内的AI盒子
        document.querySelectorAll('[id^="history-ai-box-"]').forEach(function(el){
            if(el.id!=='v9-ai-box')el.parentNode.removeChild(el);
        });
        
        // 创建显示区（在胜率看板上方）
        if(!di||!document.body.contains(di)){
            var ct=document.getElementById('dash_chart_title');
            if(!ct)return;
            var p=ct.closest?ct.closest('.card-box'):ct.parentNode;
            di=document.createElement('div');
            di.id='v9-ai-box';
            di.style.cssText='margin:0 0 12px 0;padding:10px 14px;background:#fafafa;border-radius:8px;border:1px solid #e5e7eb;display:none;';
            di.innerHTML='<div style="text-align:center;color:#9ca3af;font-size:13px;">👆 点击卡片查看AI推演</div>';
            (p.parentNode||p).insertBefore(di,p);
        }
        
        // 给卡片绑点击
        document.querySelectorAll('#history_list .history-card').forEach(function(c){
            if(c._v9)return;
            c._v9=true;
            // 用捕获阶段先于卡片原有事件
            c.addEventListener('click',function(e){
                if(e.target.closest('button,select,textarea,input,.capsule-btn,.match-btn'))return;
                show(c.getAttribute('data-id'));
            },false);
        });
    }
    
    // ===== 显示AI =====
    function show(id){
        if(!di||!document.body.contains(di))return;
        
        // 读DOM里的AI文字
        var all={};
        'deepseek,qwen,gemini,glm'.split(',').forEach(function(e){
            var el=document.getElementById('card_stream_'+e+'_'+id);
            if(el){
                var t=(el.innerText||'').trim();
                if(t.length>5)all[e.charAt(0).toUpperCase()+e.slice(1)]=t;
            }
        });
        
        var ks=Object.keys(all);
        if(!ks.length){
            di.style.display='block';
            di.innerHTML='<div style="text-align:center;color:#9ca3af;">🤖 暂无AI推演</div>';
            return;
        }
        
        var best='',bk='';
        ks.forEach(function(k){if(all[k].length>best.length){best=all[k];bk=k;}});
        var v=(best.match(/(?:结论|判定|评级|定性)[：:]\s*([^。\n]{0,40})/)||['',''])[1];
        var sum=best.replace(/\n+/g,' ').trim().substring(0,200);
        var exp=di._exp||false;
        
        di.style.display='block';
        di._exp=exp;
        di.innerHTML=
            '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">'+
            '<div><b style="font-size:14px;color:#1f2937;">🤖 AI推演</b>'+
            (v?' <span style="background:#FDE68A;color:#92400e;font-size:12px;padding:1px 8px;border-radius:4px;">'+v+'</span>':'')+
            ' <span style="font-size:11px;color:#6b7280;">['+bk+']</span></div>'+
            '<button id="v9eb" style="font-size:11px;padding:3px 12px;'+
            (exp?'background:#8C2131;color:white;':'background:#f3f4f6;color:#4b5563;')+
            'border:1px solid #d1d5db;border-radius:4px;cursor:pointer;font-weight:bold;">'+
            (exp?'▲ 收起':'▼ 展开详情')+'</button></div>'+
            '<div style="font-size:12px;color:#4b5563;line-height:1.5;padding:6px 8px;background:white;border-radius:4px;border:1px solid #e5e7eb;">'+sum+'...</div>';
        
        if(exp){
            di.innerHTML+='<div style="margin-top:6px;display:grid;grid-template-columns:1fr 1fr;gap:6px;">'+
                ks.map(function(k){return '<div style="background:white;border-radius:4px;padding:6px;border:1px solid #e5e7eb;"><div style="font-size:11px;font-weight:600;color:#1f2937;margin-bottom:2px;">🤖 '+k+'</div><div style="font-size:11px;color:#4b5563;max-height:160px;overflow-y:auto;white-space:pre-wrap;">'+all[k]+'</div></div>';}).join('')+
                '</div>';
        }
        
        setTimeout(function(){
            var eb=document.getElementById('v9eb');
            if(eb)eb.onclick=function(ev){ev.stopPropagation();di._exp=!di._exp;show(id);};
        },50);
    }
})();
