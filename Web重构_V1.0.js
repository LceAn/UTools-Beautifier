<script>
(function(){
    if (window.__KANO_WEBOS_ROUTER__) return;
    window.__KANO_WEBOS_ROUTER__ = true;

    // 默认字典
    const CUSTOM_PAGE_ROUTING = {
        'status-container': { tab: 1, name: '状态卡片 (Status)' },
        'SIGNAL_MONITOR': { tab: 1, name: '信号面板 (Signal)' },
        'actions-buttons': { tab: 2, name: '快捷操作区 (Actions)' },
        'functions-container': { tab: 2, name: '功能开关 (Functions)' },
        'cpuModal': { tab: 2, name: 'CPU 监控 (CPU)' },
        'kano_ws_audio_IFRAME_KANO': { tab: 3, name: '扩展页面 (IFrame)' },
        'kn-toolbox-wrapper': { tab: 2, name: '扩展工具箱 (Toolbox)' } // 默认把插件A的盒子放第二页
    };

    const CONFIG_KEY = 'kano_webos_config';
    let config = JSON.parse(localStorage.getItem(CONFIG_KEY)) || { moduleRouting: CUSTOM_PAGE_ROUTING, hiddenModules: [], currentGlobalTab: 1 };
    
    // 补全
    Object.keys(CUSTOM_PAGE_ROUTING).forEach(key => {
        if (!config.moduleRouting[key]) config.moduleRouting[key] = CUSTOM_PAGE_ROUTING[key];
    });

    const injectCSS = () => {
        if (document.getElementById('kano-webos-style')) return;
        const style = document.createElement('style'); style.id = 'kano-webos-style';
        style.textContent = `
            /* 顶栏 CSS */
            #kn-app-header { display: flex; align-items: center; justify-content: space-between; background: rgba(30, 30, 30, 0.4); backdrop-filter: blur(25px) saturate(180%); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 20px; padding: 10px 20px; margin-bottom: 25px; margin-top: 10px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3); position: sticky; top: 15px; z-index: 8888; gap: 15px; flex-wrap: wrap; }
            #kn-title-placeholder { display: flex; align-items: center; }
            #kn-title-placeholder .main-title { margin: 0 !important; padding: 0 !important; align-items: center !important; gap: 10px; }
            #kn-app-header #kn-global-tabs { display: flex; gap: 8px; margin: 0; background: rgba(0,0,0,0.25); padding: 5px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.05); box-shadow: inset 0 2px 10px rgba(0,0,0,0.1); }
            #kn-app-header .kn-g-tab-btn { padding: 8px 20px; font-size: 14px; border-radius: 12px; color: #888; cursor: pointer; font-weight: bold; transition: all 0.3s; }
            #kn-app-header .kn-g-tab-btn:hover { color: #fff; background: rgba(255,255,255,0.05); }
            #kn-app-header .kn-g-tab-btn.active { color: #87ceeb; background: rgba(135,206,235,0.15); box-shadow: 0 4px 15px rgba(0,0,0,0.2); }
            #kn-header-actions { display: flex; align-items: center; gap: 10px; }
            @media (max-width: 768px) { #kn-app-header { justify-content: center; padding: 10px; } #kn-app-header #kn-global-tabs { width: 100%; justify-content: space-between; } #kn-app-header .kn-g-tab-btn { padding: 8px 10px; font-size: 13px; } #kn-header-actions { width: 100%; justify-content: flex-end; } }

            /* 路由显隐魔法 */
            .kn-hidden-module { display: none !important; }
            body[data-kn-page-tab="1"] .container > .kn-g-2, body[data-kn-page-tab="1"] .container > .kn-g-3 { display: none !important; }
            body[data-kn-page-tab="2"] .container > .kn-g-1, body[data-kn-page-tab="2"] .container > .kn-g-3 { display: none !important; }
            body[data-kn-page-tab="3"] .container > .kn-g-1, body[data-kn-page-tab="3"] .container > .kn-g-2 { display: none !important; }
        `;
        document.head.appendChild(style);
    };

    window.knSwitchGlobalTab = (tabId) => {
        document.querySelectorAll('.kn-g-tab-btn').forEach(el => el.classList.remove('active'));
        const btn = document.getElementById('kn-g-tab-btn-' + tabId);
        if (btn) btn.classList.add('active');
        document.body.setAttribute('data-kn-page-tab', tabId);
        config.currentGlobalTab = tabId;
        localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    };

    const classifyContainerNodes = () => {
        const _container = document.querySelector('.container');
        if (!_container) return;
        Array.from(_container.children).forEach(node => {
            if (node.nodeType !== 1 || ['SCRIPT', 'STYLE', 'LINK', 'META'].includes(node.tagName)) return;
            if (node.classList.contains('mask') || node.id === 'kn-app-header') return;
            
            node.classList.remove('kn-g-1', 'kn-g-2', 'kn-g-3', 'kn-hidden-module');
            const id = node.id || ''; const className = node.className || '';
            let assigned = false;
            for (const [key, rules] of Object.entries(config.moduleRouting)) {
                if (id.includes(key) || className.includes(key)) {
                    if (config.hiddenModules.includes(key)) node.classList.add('kn-hidden-module');
                    else node.classList.add(`kn-g-${rules.tab}`);
                    assigned = true; break;
                }
            }
            if (!assigned) node.classList.add('kn-g-3');
        });
    };

    window.knShowModuleModal = () => {
        const list = document.getElementById('kn-module-config-list');
        if (!list) return;
        list.innerHTML = '';
        for (const [key, details] of Object.entries(config.moduleRouting)) {
            const isHidden = config.hiddenModules.includes(key);
            const currentTab = isHidden ? 'hide' : details.tab;
            list.innerHTML += `
                <div style="display:flex; justify-content:space-between; align-items:center; background: rgba(255,255,255,0.05); padding: 10px 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.02);">
                    <span style="color:#eee; font-size:13px;">${details.name} <br><span style="color:#666;font-size:10px;">ID: ${key}</span></span>
                    <select onchange="window.knUpdateModuleRoute('${key}', this)" style="background: rgba(0,0,0,0.5); color: #fff; border: 1px solid rgba(255,255,255,0.2); padding: 6px 10px; border-radius: 8px; outline:none; font-size:12px;">
                        <option value="1" ${currentTab==1?'selected':''}>📊 状态总览</option>
                        <option value="2" ${currentTab==2?'selected':''}>🧰 核心工具</option>
                        <option value="3" ${currentTab==3?'selected':''}>🧩 扩展应用</option>
                        <option value="hide" ${currentTab==='hide'?'selected':''} style="color:#ff6b6b;">🚫 强制隐藏</option>
                    </select>
                </div>
            `;
        }
        document.getElementById('KanoModuleModal').style.display = 'flex'; 
    };

    window.knCloseModuleModal = () => { document.getElementById('KanoModuleModal').style.display = 'none'; };
    
    window.knUpdateModuleRoute = (moduleKey, selectEl) => {
        const val = selectEl.value;
        if (val === 'hide') { if (!config.hiddenModules.includes(moduleKey)) config.hiddenModules.push(moduleKey); } 
        else { config.hiddenModules = config.hiddenModules.filter(k => k !== moduleKey); config.moduleRouting[moduleKey].tab = parseInt(val); }
        localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
        classifyContainerNodes(); 
    };

    const buildOSUI = () => {
        const container = document.querySelector('.container');
        if (!container) { setTimeout(buildOSUI, 100); return; }

        const appHeader = document.createElement('header');
        appHeader.id = 'kn-app-header';
        appHeader.innerHTML = `
            <div id="kn-title-placeholder"></div>
            <div id="kn-global-tabs">
                <div id="kn-g-tab-btn-1" class="kn-g-tab-btn active" onclick="window.knSwitchGlobalTab(1)">📊 状态总览</div>
                <div id="kn-g-tab-btn-2" class="kn-g-tab-btn" onclick="window.knSwitchGlobalTab(2)">🧰 核心工具</div>
                <div id="kn-g-tab-btn-3" class="kn-g-tab-btn" onclick="window.knSwitchGlobalTab(3)">🧩 扩展应用</div>
            </div>
            <div id="kn-header-actions">
                <button onclick="window.knShowModuleModal()" style="border-radius:50px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #fff; font-size: 13px; padding: 6px 12px; cursor: pointer;">⚙️ 页面排版</button>
            </div>
        `;
        if(container.firstChild) container.insertBefore(appHeader, container.firstChild);
        else container.appendChild(appHeader);

        const moduleModal = document.createElement('div');
        moduleModal.className = 'mask'; moduleModal.id = "KanoModuleModal"; moduleModal.style.display = 'none';
        moduleModal.innerHTML = `
            <div class="modal kn-glass-modal" style="display: flex; flex-direction: column; position:fixed; z-index:999999; top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.5);justify-content:center;align-items:center;">
                <div style="background:rgba(30,30,30,0.7); backdrop-filter:blur(25px); border-radius:24px; padding:30px 40px; width:50%; min-width:680px;">
                    <div style="font-size:20px; font-weight:800; color:#fff; margin-bottom: 10px; text-align:center;">⚙️ Web OS 页面排版控制</div>
                    <div style="font-size: 12px; color: #aaa; margin-bottom: 15px; text-align: center;">将底层的各个卡片指定到你需要的分页中。</div>
                    <div id="kn-module-config-list" style="display:flex; flex-direction:column; gap:10px; background: rgba(0,0,0,0.25); padding: 15px; border-radius: 16px; max-height: 50vh; overflow-y: auto;"></div>
                    <div style="text-align: right; margin-top: 20px;">
                        <button onclick="window.knCloseModuleModal()" style="border-radius:50px; background: #018ad8; color:#fff; border: none; padding:8px 30px; font-size:14px; cursor:pointer;">完 成</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(moduleModal);

        // 智能元素抓取引擎
        const grabTopElements = () => {
            const headerActions = document.getElementById('kn-header-actions');
            const titlePlaceholder = document.getElementById('kn-title-placeholder');
            
            // 抓原生标题
            const mt = document.querySelector('.title.main-title');
            if (mt && mt.parentElement !== titlePlaceholder) {
                mt.classList.remove('kn-g-1', 'kn-g-2', 'kn-g-3');
                titlePlaceholder.appendChild(mt);
            }
            
            // 抓原生登录按钮
            const loginBtn = document.querySelector('button[onclick*="loginModal"], button[onclick*="logout"]');
            if (loginBtn && loginBtn.parentElement !== headerActions) {
                loginBtn.style.position = 'static'; loginBtn.style.margin = '0';
                loginBtn.style.borderRadius = "50px"; loginBtn.style.background = "rgba(255,255,255,0.1)"; 
                loginBtn.style.border = "1px solid rgba(255,255,255,0.2)"; loginBtn.style.color = "#fff"; loginBtn.style.padding = "6px 12px";
                headerActions.appendChild(loginBtn);
            }

            // 抓取 插件A(工具箱) 的按钮 (完美协同！)
            const coreActions = document.getElementById('kn-core-actions');
            if (coreActions) {
                Array.from(coreActions.children).forEach(btn => {
                    if (btn.parentElement !== headerActions) {
                        btn.style.background = "rgba(255,255,255,0.1)"; btn.style.border = "1px solid rgba(255,255,255,0.2)"; btn.style.color = "#fff";
                        headerActions.prepend(btn);
                    }
                });
            }
        };

        setInterval(grabTopElements, 500); // 持续巡逻，确保不管谁先加载都能完美归位
        
        classifyContainerNodes();
        window.knSwitchGlobalTab(config.currentGlobalTab);
        
        new MutationObserver(() => classifyContainerNodes()).observe(container, { childList: true, subtree: true });
    };

    injectCSS();
    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildOSUI);
    else buildOSUI();
})();
</script>