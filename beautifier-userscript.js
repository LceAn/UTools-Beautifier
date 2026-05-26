// ==UserScript==
// @name         UTools 页面美化插件
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  为 ZTE F50 UFI-TOOLS 提供页面美化功能
// @author       Hermes
// @match        http://192.168.100.1:2333/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    if (window.__pageBeautifierInjected) return;
    window.__pageBeautifierInjected = true;

    const html = `
<div class="modal" style="padding:15px;width:88%;max-width:380px;opacity:1;">
    <div class="title">🎨 页面美化</div>
    <div class="content" style="max-height:420px;padding:15px 0 0 0;overflow-y:auto;">
        <div style="margin-bottom:10px;"><label style="display:flex;align-items:center;justify-content:space-between;font-size:.8rem;"><span>✨ 总开关</span><label class="switch"><input type="checkbox" id="beautyToggle" checked onchange="toggleBeauty()"><span class="slider"></span></label></label></div>
        <div style="margin-bottom:10px;"><label style="display:flex;align-items:center;justify-content:space-between;font-size:.8rem;"><span>🔘 圆角卡片</span><label class="switch"><input type="checkbox" id="beautyRadius" checked onchange="applyBeauty()"><span class="slider"></span></label></label></div>
        <div style="margin-bottom:10px;"><label style="display:flex;align-items:center;justify-content:space-between;font-size:.8rem;"><span>🌫️ 阴影效果</span><label class="switch"><input type="checkbox" id="beautyShadow" checked onchange="applyBeauty()"><span class="slider"></span></label></label></div>
        <div style="margin-bottom:10px;"><label style="display:flex;align-items:center;justify-content:space-between;font-size:.8rem;"><span>💊 胶囊按钮</span><label class="switch"><input type="checkbox" id="beautyPill" checked onchange="applyBeauty()"><span class="slider"></span></label></label></div>
        <div style="margin-bottom:10px;"><label style="display:flex;align-items:center;justify-content:space-between;font-size:.8rem;"><span>📐 紧凑布局</span><label class="switch"><input type="checkbox" id="beautyCompact" onchange="applyBeauty()"><span class="slider"></span></label></label></div>
        <div style="margin-bottom:10px;"><label style="display:flex;align-items:center;justify-content:space-between;font-size:.8rem;"><span>🎯 标题渐变</span><label class="switch"><input type="checkbox" id="beautyTitle" checked onchange="applyBeauty()"><span class="slider"></span></label></label></div>
        <div style="margin-bottom:10px;"><label style="display:flex;align-items:center;justify-content:space-between;font-size:.8rem;"><span>🌈 渐变背景</span><label class="switch"><input type="checkbox" id="beautyGradient" onchange="applyBeauty()"><span class="slider"></span></label></label></div>
        <div style="margin-bottom:10px;"><label style="display:flex;align-items:center;justify-content:space-between;font-size:.8rem;"><span>🔍 输入框美化</span><label class="switch"><input type="checkbox" id="beautyInput" checked onchange="applyBeauty()"><span class="slider"></span></label></label></div>
        <div style="margin-bottom:10px;"><label style="display:flex;align-items:center;justify-content:space-between;font-size:.8rem;"><span>🚫 隐藏插件按钮</span><label class="switch"><input type="checkbox" id="beautyHidePlugins" onchange="applyBeauty()"><span class="slider"></span></label></label></div>
        <div style="margin-top:12px;padding:10px;background:rgba(255,255,255,0.05);border-radius:8px;">
            <div style="font-size:.7rem;color:#aaa;margin-bottom:5px;">圆角大小</div>
            <input type="range" id="beautyRadiusVal" min="4" max="24" value="12" oninput="document.getElementById('radiusLabel').textContent=this.value+'px';applyBeauty()" style="width:100%;">
            <div style="font-size:.7rem;text-align:center;" id="radiusLabel">12px</div>
        </div>
        <div style="margin-top:10px;padding:10px;background:rgba(255,255,255,0.05);border-radius:8px;">
            <div style="font-size:.7rem;color:#aaa;margin-bottom:5px;">阴影强度</div>
            <input type="range" id="beautyShadowVal" min="1" max="10" value="4" oninput="document.getElementById('shadowLabel').textContent=this.value;applyBeauty()" style="width:100%;">
            <div style="font-size:.7rem;text-align:center;" id="shadowLabel">4</div>
        </div>
    </div>
    <div class="btn" style="text-align:right;margin-top:10px;">
        <button onclick="resetBeauty()">重置</button>
        <button onclick="closeModal('#BeautyModal')">关闭</button>
    </div>
</div>`;

    let beautyStyleEl = null;

    const getCSS = () => {
        const enabled = document.getElementById('beautyToggle')?.checked;
        const radius = document.getElementById('beautyRadius')?.checked;
        const shadow = document.getElementById('beautyShadow')?.checked;
        const pill = document.getElementById('beautyPill')?.checked;
        const compact = document.getElementById('beautyCompact')?.checked;
        const title = document.getElementById('beautyTitle')?.checked;
        const gradient = document.getElementById('beautyGradient')?.checked;
        const input = document.getElementById('beautyInput')?.checked;
        const hidePlugins = document.getElementById('beautyHidePlugins')?.checked;
        const radiusVal = document.getElementById('beautyRadiusVal')?.value || 12;
        const shadowVal = document.getElementById('beautyShadowVal')?.value || 4;
        const s = parseInt(shadowVal);
        if (!enabled) return '/* 美化已关闭 */';
        let css = '/* === 页面美化插件 === */\n';
        if (radius) css += `.kano_function_main,.box,.deviceList li,.deviceList strong,.deviceList .card-item,.modal,.mask .modal,.status-container,.band-lock-container,.freq-lock-container,.func_list_container,.devices-mon{border-radius:${radiusVal}px!important;overflow:hidden;}\n`;
        if (shadow) { css += `.kano_function_main,.box,.deviceList li,.status-container,.band-lock-container,.freq-lock-container,.func_list_container,.devices-mon{box-shadow:0 ${s}px ${s*2}px rgba(0,0,0,${(s*0.04).toFixed(2)})!important;transition:box-shadow .3s ease,transform .3s ease;}\n`; css += `.kano_function_main:hover,.box:hover{box-shadow:0 ${s+2}px ${(s+2)*3}px rgba(0,0,0,${(s*0.06).toFixed(2)})!important;transform:translateY(-1px);}\n`; }
        if (pill) { css += `button,.btn,.actions-buttons button,.box button{border-radius:50px!important;transition:all .2s ease!important;}\n`; css += `button:hover,.btn:hover{transform:scale(1.03);filter:brightness(1.15);}\n`; }
        if (compact) { css += `.container{max-width:640px!important;}\n.kano_function_main{margin-bottom:6px!important;}\n`; }
        if (title) css += `.title{background:linear-gradient(90deg,#667eea,#764ba2);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;font-weight:700!important;}\n`;
        if (gradient) css += `body{background:linear-gradient(135deg,#0f0c29,#1a1a2e,#16213e)!important;}\n`;
        if (input) { css += `input[type="text"],input[type="password"],input[type="number"],input[type="email"],textarea,select{border-radius:${Math.round(radiusVal/2)}px!important;border:1.5px solid rgba(255,255,255,0.15)!important;transition:border-color .3s,box-shadow .3s!important;}\n`; css += `input:focus,textarea:focus,select:focus{border-color:#667eea!important;box-shadow:0 0 0 3px rgba(102,126,234,0.2)!important;outline:none!important;}\n`; }
        if (hidePlugins) css += `.actions-buttons button:not(#beautyBtn){display:none!important;}\n`;
        css += '/* === 美化结束 === */';
        return css;
    };

    const applyBeauty = () => {
        if (!beautyStyleEl) {
            beautyStyleEl = document.createElement('style');
            beautyStyleEl.id = 'page-beautifier-style';
            document.head.appendChild(beautyStyleEl);
        }
        beautyStyleEl.textContent = getCSS();
    };

    window.toggleBeauty = () => applyBeauty();

    window.resetBeauty = () => {
        document.getElementById('beautyToggle').checked = true;
        document.getElementById('beautyRadius').checked = true;
        document.getElementById('beautyShadow').checked = true;
        document.getElementById('beautyPill').checked = true;
        document.getElementById('beautyCompact').checked = false;
        document.getElementById('beautyTitle').checked = true;
        document.getElementById('beautyGradient').checked = false;
        document.getElementById('beautyInput').checked = true;
        document.getElementById('beautyHidePlugins').checked = false;
        document.getElementById('beautyRadiusVal').value = 12;
        document.getElementById('shadowLabel').textContent = '4';
        document.getElementById('radiusLabel').textContent = '12px';
        applyBeauty();
        if (typeof createToast === 'function') createToast('已重置为默认设置');
    };

    // 等待页面加载完成
    const init = () => {
        if (typeof showModal === 'undefined' || typeof closeModal === 'undefined') {
            setTimeout(init, 500);
            return;
        }

        const modal = document.createElement('div');
        modal.classList.add('mask');
        modal.id = 'BeautyModal';
        modal.style.display = 'none';
        modal.innerHTML = html;
        modal.onclick = (e) => { if (e.target === modal) closeModal('#BeautyModal'); };
        document.querySelector('.container')?.appendChild(modal);

        const btn = document.createElement('button');
        btn.id = 'beautyBtn';
        btn.textContent = '🎨 美化';
        btn.onclick = () => { applyBeauty(); showModal('#BeautyModal'); };
        document.querySelector('.actions-buttons')?.appendChild(btn);

        setTimeout(applyBeauty, 300);
        console.log('🎨 页面美化插件已加载');
    };

    init();
})();
