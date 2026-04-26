<script>
(function(){
    // ==========================================
    // 0. 核心版本定义与热重载卫士
    // ==========================================
    const CURRENT_VERSION = "V1.0.0"; // 正式版本号
    
    // 防重复挂载：清理旧的 DOM，方便直接修改代码后生效
    const oldToolbox = document.getElementById('collapse_toolbox');
    if (oldToolbox && oldToolbox.parentElement && oldToolbox.parentElement.className === 'collapse_box') {
        oldToolbox.parentElement.remove();
    }
    document.querySelectorAll('#KanoDrawerModal, #KanoBeautyModal').forEach(m => m.remove());

    if (window.__KANO_BEAUTY_V1__) return;
    window.__KANO_BEAUTY_V1__ = true;

    // ==========================================
    // 1. 配置与持久化
    // ==========================================
    const CONFIG_KEY = 'kano_beautifier_v1_config';
    const defaultConfig = {
        enableRadius: true, enableShadow: true, enableCapsule: true,
        enableGlass: false, enableCompact: false, enableGradient: true,
        enableHover: true, enableScrollbar: true, pluginStates: {},
        gradColor1: '#87ceeb', gradColor2: '#3b82f6'
    };
    
    let savedConfig = JSON.parse(localStorage.getItem(CONFIG_KEY) || "null");
    let config = savedConfig ? { ...defaultConfig, ...savedConfig } : defaultConfig;

    // ==========================================
    // 2. 宽屏拟态 CSS (Glassmorphism)
    // ==========================================
    const injectCSS = () => {
        if (document.getElementById('kano-beauty-v1-style')) return;
        const style = document.createElement('style');
        style.id = 'kano-beauty-v1-style';
        style.textContent = `
            #KanoBeautyModal, #KanoDrawerModal {
                position: fixed !important; top: 0 !important; left: 0 !important;
                width: 100vw !important; height: 100vh !important;
                background: rgba(0,0,0,0.5) !important; z-index: 999999 !important;
                justify-content: center !important; align-items: center !important;
            }

            .box.beauty-radius { border-radius: 20px !important; overflow: hidden; }
            .box.beauty-shadow { box-shadow: 0 8px 32px rgba(0,0,0,0.2) !important; transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); }
            button.beauty-capsule { border-radius: 50px !important; padding: 6px 18px !important; font-weight: 500; letter-spacing: 0.5px; transition: all 0.2s; }
            button.beauty-capsule:hover { filter: brightness(1.1); transform: scale(1.02); }
            
            .box.beauty-glass { background: rgba(255, 255, 255, 0.04) !important; backdrop-filter: blur(12px) !important; -webkit-backdrop-filter: blur(12px) !important; border: 1px solid rgba(255, 255, 255, 0.08) !important; }
            .box.beauty-compact { padding: 12px !important; margin-bottom: 12px !important; }
            .box.beauty-hover:hover { transform: translateY(-4px) !important; box-shadow: 0 15px 40px rgba(0,0,0,0.4) !important; border-color: rgba(255,255,255,0.2) !important; }
            
            :root { --kn-grad-1: ${config.gradColor1}; --kn-grad-2: ${config.gradColor2}; }
            .beauty-gradient { background: linear-gradient(135deg, var(--kn-grad-1), var(--kn-grad-2)) !important; -webkit-background-clip: text !important; -webkit-text-fill-color: transparent !important; color: transparent !important; font-weight: bold !important; display: inline-block; }
            
            body.beauty-scrollbar::-webkit-scrollbar, .modal::-webkit-scrollbar, .kn-drag-board::-webkit-scrollbar { width: 6px; height: 6px; }
            body.beauty-scrollbar::-webkit-scrollbar-thumb, .modal::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 6px; }
            body.beauty-scrollbar::-webkit-scrollbar-track { background: transparent; }

            #toolbox_buttons button, #secondary_menu_buttons button { margin: 4px !important; white-space: nowrap; font-size: 13px !important; }
            
            .kn-glass-modal {
                background: rgba(30, 30, 30, 0.7) !important; backdrop-filter: blur(25px) saturate(200%); -webkit-backdrop-filter: blur(25px) saturate(200%);
                border: 1px solid rgba(255, 255, 255, 0.15) !important; border-radius: 24px !important; box-shadow: 0 30px 60px rgba(0,0,0,0.6) !important;
                max-height: 90vh !important; overflow-y: auto !important;
            }

            #KanoBeautyModal .modal { width: 50% !important; min-width: 680px; max-width: 1000px; padding: 30px 40px !important; }
            #KanoDrawerModal .modal { width: 85% !important; max-width: 480px; padding: 25px !important; }

            .kn-tab-header { display: flex; gap: 8px; margin-bottom: 25px; background: rgba(0,0,0,0.2); padding: 6px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.05); box-shadow: inset 0 2px 10px rgba(0,0,0,0.1); }
            .kn-tab-btn { flex: 1; padding: 10px 0; text-align: center; color: #999; cursor: pointer; border-radius: 12px; font-size: 14px; font-weight: bold; transition: all 0.3s ease; }
            .kn-tab-btn:hover { color: #fff; background: rgba(255,255,255,0.05); }
            .kn-tab-btn.active { color: #87ceeb; background: rgba(135,206,235,0.15); box-shadow: 0 4px 15px rgba(0,0,0,0.2); text-shadow: 0 2px 5px rgba(0,0,0,0.5); }
            .kn-tab-content { display: none; animation: knFadeIn 0.3s ease; min-height: 250px; }
            @keyframes knFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

            @media (max-width: 768px) {
                #KanoBeautyModal .modal { width: 90% !important; min-width: unset; padding: 20px !important; }
                .kn-drag-board { grid-template-columns: 1fr !important; }
                .kn-feature-grid { grid-template-columns: 1fr 1fr !important; }
                .kn-tab-btn { font-size: 12px; padding: 8px 0; }
            }

            .kn-drag-board { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; margin-top: 10px; }
            .kn-drop-zone { background: rgba(0,0,0,0.25); border: 2px dashed rgba(255,255,255,0.1); border-radius: 18px; padding: 22px 10px 10px 10px; min-height: 180px; transition: all 0.3s; position: relative; display: flex; flex-wrap: wrap; align-content: flex-start; gap: 6px; }
            .kn-drop-zone::before { content: attr(data-title); position: absolute; top: -14px; left: 50%; transform: translateX(-50%); background: #2a2a2a; padding: 4px 16px; border-radius: 12px; font-size: 13px; color: #87ceeb; font-weight: bold; border: 1px solid rgba(255,255,255,0.15); white-space: nowrap; box-shadow: 0 6px 12px rgba(0,0,0,0.4); z-index: 2; }
            .kn-drop-zone.drag-over { background: rgba(135, 206, 235, 0.15); border-color: rgba(135, 206, 235, 0.8); transform: translateY(-4px) scale(1.02); box-shadow: 0 10px 25px rgba(135, 206, 235, 0.2); }
            .kn-drag-item { display: inline-block; background: linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05)); border: 1px solid rgba(255,255,255,0.2); padding: 6px 14px; border-radius: 50px; font-size: 12px; color: #fff; cursor: grab; box-shadow: 0 4px 10px rgba(0,0,0,0.15); transition: transform 0.2s, background 0.2s; }
            .kn-drag-item:hover { background: rgba(255,255,255,0.25); }
            .kn-drag-item:active { cursor: grabbing; transform: scale(0.92); }
            
            .kn-feature-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
            .modern-checkbox { display: flex; align-items: center; gap: 8px; cursor: pointer; color: #eee; font-size: 14px; font-weight: 500; }
            .modern-checkbox input[type="checkbox"] { accent-color: #018ad8; width: 18px; height: 18px; cursor: pointer; }
            input[type="color"] { -webkit-appearance: none; border: none; width: 24px; height: 24px; border-radius: 6px; cursor: pointer; padding: 0; background: transparent; }
            input[type="color"]::-webkit-color-swatch-wrapper { padding: 0; }
            input[type="color"]::-webkit-color-swatch { border: 1px solid rgba(255,255,255,0.4); border-radius: 6px; }
        `;
        document.head.appendChild(style);
    };

    // ==========================================
    // 3. 全局 API 与 GitHub 检查更新引擎
    // ==========================================
    window.knSwitchTab = (tabId) => {
        document.querySelectorAll('.kn-tab-content').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.kn-tab-btn').forEach(el => el.classList.remove('active'));
        const content = document.getElementById('kn-tab-content-' + tabId);
        const btn = document.getElementById('kn-tab-btn-' + tabId);
        if (content) content.style.display = 'block';
        if (btn) btn.classList.add('active');
    };

    window.knShowBeautyModal = () => { const m = document.getElementById('KanoBeautyModal'); if (m) { renderDragZones(); m.style.display = 'flex'; } };
    window.knCloseBeautyModal = () => { const m = document.getElementById('KanoBeautyModal'); if (m) m.style.display = 'none'; };
    window.knShowDrawerModal = () => { const m = document.getElementById('KanoDrawerModal'); if (m) m.style.display = 'flex'; };
    window.knCloseDrawerModal = () => { const m = document.getElementById('KanoDrawerModal'); if (m) m.style.display = 'none'; };

    window.knVisualChanged = () => {
        config.enableRadius = document.getElementById('kn-radius').checked;
        config.enableShadow = document.getElementById('kn-shadow').checked;
        config.enableCapsule = document.getElementById('kn-capsule').checked;
        config.enableGlass = document.getElementById('kn-glass').checked;
        config.enableCompact = document.getElementById('kn-compact').checked;
        config.enableGradient = document.getElementById('kn-gradient').checked;
        config.enableHover = document.getElementById('kn-hover').checked;
        config.enableScrollbar = document.getElementById('kn-scrollbar').checked;
        config.gradColor1 = document.getElementById('kn-color1').value || '#87ceeb';
        config.gradColor2 = document.getElementById('kn-color2').value || '#3b82f6';
        
        localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
        document.documentElement.style.setProperty('--kn-grad-1', config.gradColor1);
        document.documentElement.style.setProperty('--kn-grad-2', config.gradColor2);
        renderBeauty();
    };

    // GitHub 自动检查更新 API (已修复语法隔离)
    window.knCheckUpdate = async () => {
        const btn = document.getElementById('kn-update-btn');
        const info = document.getElementById('kn-update-info');
        
        btn.textContent = '🔄 正在连接 Github...';
        btn.style.opacity = '0.6';
        btn.style.pointerEvents = 'none';
        info.innerHTML = '';

        try {
            const response = await fetch('https://api.github.com/repos/LceAn/UTools-Beautifier/releases/latest');
            if (!response.ok) throw new Error('Release 未找到或网络异常');
            
            const data = await response.json();
            const latestVersion = data.tag_name;
            
            if (latestVersion && latestVersion.toUpperCase() !== CURRENT_VERSION.toUpperCase()) {
                info.innerHTML = '<span style="color: #86efac; font-weight:bold;">🎉 发现新版本 ' + latestVersion + '！</span> <a href="' + data.html_url + '" target="_blank" style="color: #87ceeb; text-decoration: underline; margin-left: 8px;">点击前往下载</a>';
            } else {
                info.innerHTML = '<span style="color: #aaa;">✅ 当前已是最新版本 (' + CURRENT_VERSION + ')</span>';
            }
        } catch (error) {
            info.innerHTML = '<span style="color: #ff6b6b;">⚠️ 检查失败。可能仓库尚未发布 Release，请前往 Github 查看。</span>';
        } finally {
            btn.textContent = '🔄 检查更新';
            btn.style.opacity = '1';
            btn.style.pointerEvents = 'auto';
        }
    };

    // 拖拽系统
    window.knDragStart = (e, name) => { e.dataTransfer.setData('text/plain', name); e.dataTransfer.effectAllowed = 'move'; setTimeout(() => e.target.style.opacity = '0.3', 10); };
    window.knDragEnd = (e) => { e.target.style.opacity = '1'; };
    window.knDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; e.currentTarget.classList.add('drag-over'); };
    window.knDragLeave = (e) => { e.currentTarget.classList.remove('drag-over'); };
    window.knDrop = (e, targetState) => {
        e.preventDefault(); e.currentTarget.classList.remove('drag-over');
        const name = e.dataTransfer.getData('text/plain');
        if (name) {
            config.pluginStates[name] = targetState;
            localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
            renderDragZones(); applyBartenderLogic(); 
        }
    };

    // ==========================================
    // 4. Bartender 核心分发与渲染
    // ==========================================
    const applyBartenderLogic = () => {
        const toolbox = document.getElementById('toolbox_buttons');
        const secondary = document.getElementById('secondary_menu_buttons');
        if (!toolbox || !secondary) return;

        const allBtns = [...toolbox.querySelectorAll('button'), ...secondary.querySelectorAll('button')];
        allBtns.forEach(btn => {
            const name = btn.textContent.trim();
            if (name === "🎨 界面工坊" || name === "📦 收纳箱") return;

            const state = config.pluginStates[name] || 0; 
            if (state === 0) { 
                btn.style.display = 'inline-block';
                if (btn.parentElement !== toolbox) toolbox.appendChild(btn);
            } else if (state === 1) { 
                btn.style.display = 'inline-block';
                if (btn.parentElement !== secondary) secondary.appendChild(btn);
            } else { 
                btn.style.display = 'none'; 
                if (btn.parentElement !== toolbox) toolbox.appendChild(btn);
            }
        });
        renderBeauty();
    };

    const renderDragZones = () => {
        const zones = { 0: document.getElementById('dz-0'), 1: document.getElementById('dz-1'), 2: document.getElementById('dz-2') };
        const toolbox = document.getElementById('toolbox_buttons');
        const secondary = document.getElementById('secondary_menu_buttons');
        if (!zones[0] || !toolbox || !secondary) return;

        Object.values(zones).forEach(z => z.innerHTML = '');

        const pluginNames = new Set();
        [toolbox, secondary].forEach(p => p.querySelectorAll('button').forEach(b => {
            const n = b.textContent.trim();
            if(n && n !== "🎨 界面工坊" && n !== "📦 收纳箱") pluginNames.add(n);
        }));

        if(pluginNames.size === 0) {
            zones[0].innerHTML = '<div style="color:#666; font-size:12px; padding:10px; width:100%; text-align:center;">暂无插件</div>';
            return;
        }

        Array.from(pluginNames).forEach(name => {
            const s = config.pluginStates[name] || 0;
            const dragItem = document.createElement('div');
            dragItem.className = 'kn-drag-item';
            dragItem.draggable = true;
            dragItem.textContent = name;
            dragItem.setAttribute('ondragstart', 'window.knDragStart(event, "' + name + '")');
            dragItem.setAttribute('ondragend', 'window.knDragEnd(event)');
            if(zones[s]) zones[s].appendChild(dragItem);
        });
    };

    // ==========================================
    // 5. 注入现代 UI 结构 (含 Tab 标签页 & 版本检测)
    // ==========================================
    const toolBox = document.createElement('div');
    toolBox.innerHTML = `
        <div class="title" style="margin:8px 0; display:flex; align-items:center;">
            <strong style="font-size:14px;">🧰 扩展工具</strong>
            <div style="display:inline-block; margin-left:8px;" id="collapse_toolbox_btn"></div>
            <div style="margin-left:auto; display:flex; gap:10px; position:relative; z-index:999;">
                <button onclick="window.knShowDrawerModal()" class="btn beauty-capsule" style="padding: 4px 16px; font-size: 13px; background: linear-gradient(135deg, rgba(52,199,89,0.25), rgba(52,199,89,0.1)); border: 1px solid rgba(52,199,89,0.4); color: #86efac; box-shadow: 0 2px 10px rgba(0,0,0,0.2); cursor:pointer;">📦 收纳箱</button>
                <button onclick="window.knShowBeautyModal()" class="btn beauty-capsule" style="padding: 4px 16px; font-size: 13px; background: linear-gradient(135deg, rgba(135,206,235,0.25), rgba(1,138,216,0.15)); border: 1px solid rgba(135,206,235,0.4); color: #87ceeb; box-shadow: 0 2px 10px rgba(0,0,0,0.2); cursor:pointer;">🎨 界面工坊</button>
            </div>
        </div>
        <div class="collapse" id="collapse_toolbox" data-name="close" style="transition:all 0.2s cubic-bezier(0.4, 0, 0.2, 1); height:0; overflow:hidden;">
            <div class="collapse_box" id="toolbox_buttons" style="display:flex; flex-wrap:wrap; gap:8px; padding: 10px 0; min-height:30px;"></div>
        </div>
    `;
    const menuSection = document.querySelector('.collapse_box') || document.body;
    menuSection.appendChild(toolBox);
    if (typeof collapseGen === 'function') collapseGen("#collapse_toolbox_btn", "#collapse_toolbox",'collapse_toolbox');

    // 收纳箱弹窗
    const drawerModal = document.createElement('div');
    drawerModal.className = 'mask';
    drawerModal.id = "KanoDrawerModal";
    drawerModal.style.display = 'none';
    drawerModal.innerHTML = `
        <div class="modal kn-glass-modal" style="display: flex; flex-direction: column;">
            <div style="font-size:18px; font-weight:800; color:#fff; margin-bottom: 20px; text-align:center; letter-spacing:1px;">📦 我的收纳箱</div>
            <div id="secondary_menu_buttons" style="display:flex; flex-wrap:wrap; gap:8px; justify-content:center; min-height: 80px; margin-bottom: 20px;"></div>
            <div style="text-align: center;">
                <button onclick="window.knCloseDrawerModal()" class="beauty-capsule" style="background: rgba(255,255,255,0.1); color:#fff; border: 1px solid rgba(255,255,255,0.2); padding:8px 35px; font-size:14px; cursor:pointer;">关 闭</button>
            </div>
        </div>
    `;
    drawerModal.onclick = (e) => { if (e.target === drawerModal) window.knCloseDrawerModal(); };
    document.body.appendChild(drawerModal);

    // 界面工坊弹窗
    const beautyModal = document.createElement('div');
    beautyModal.className = 'mask';
    beautyModal.id = "KanoBeautyModal";
    beautyModal.style.display = 'none';
    beautyModal.innerHTML = `
        <div class="modal kn-glass-modal" style="display: flex; flex-direction: column;">
            <div style="font-size:22px; font-weight:800; color:#fff; margin-bottom: 20px; text-align:center; letter-spacing:2px; text-shadow: 0 2px 10px rgba(0,0,0,0.5);">✨ 扩展与控制工坊 ✨</div>
            
            <div class="kn-tab-header">
                <div id="kn-tab-btn-1" class="kn-tab-btn active" onclick="window.knSwitchTab(1)">🎨 界面美化</div>
                <div id="kn-tab-btn-2" class="kn-tab-btn" onclick="window.knSwitchTab(2)">🛠️ 收纳设置</div>
                <div id="kn-tab-btn-3" class="kn-tab-btn" onclick="window.knSwitchTab(3)">ℹ️ 关于插件</div>
            </div>

            <div id="kn-tab-content-1" class="kn-tab-content" style="display: block;">
                <div class="kn-feature-grid" style="background: rgba(0,0,0,0.25); padding: 25px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.05); box-shadow: inset 0 2px 10px rgba(0,0,0,0.2);">
                    <label class="modern-checkbox"><input type="checkbox" id="kn-radius" ${config.enableRadius?'checked':''} onchange="window.knVisualChanged()">🔘 圆角卡片</label>
                    <label class="modern-checkbox"><input type="checkbox" id="kn-shadow" ${config.enableShadow?'checked':''} onchange="window.knVisualChanged()">🌫️ 悬浮阴影</label>
                    <label class="modern-checkbox"><input type="checkbox" id="kn-capsule" ${config.enableCapsule?'checked':''} onchange="window.knVisualChanged()">💊 胶囊按钮</label>
                    <label class="modern-checkbox"><input type="checkbox" id="kn-glass" ${config.enableGlass?'checked':''} onchange="window.knVisualChanged()">🧊 玻璃拟态</label>
                    <label class="modern-checkbox"><input type="checkbox" id="kn-compact" ${config.enableCompact?'checked':''} onchange="window.knVisualChanged()">📏 紧凑布局</label>
                    
                    <div style="display:flex; align-items:center; gap:8px; grid-column: span 2;">
                        <label class="modern-checkbox"><input type="checkbox" id="kn-gradient" ${config.enableGradient?'checked':''} onchange="window.knVisualChanged()">🌈 渐变标题</label>
                        <input type="color" id="kn-color1" value="${config.gradColor1}" oninput="window.knVisualChanged()" title="左侧起点颜色" style="margin-left:5px;">
                        <input type="color" id="kn-color2" value="${config.gradColor2}" oninput="window.knVisualChanged()" title="右侧终点颜色">
                    </div>

                    <label class="modern-checkbox"><input type="checkbox" id="kn-hover" ${config.enableHover?'checked':''} onchange="window.knVisualChanged()">🌟 动态悬停</label>
                    <label class="modern-checkbox"><input type="checkbox" id="kn-scrollbar" ${config.enableScrollbar?'checked':''} onchange="window.knVisualChanged()">📜 极简滚条</label>
                </div>
            </div>

            <div id="kn-tab-content-2" class="kn-tab-content">
                <div style="font-size: 14px; color: #aaa; display:flex; justify-content:space-between; align-items:flex-end; margin-bottom: 5px;">
                    <span style="font-weight:bold;">🛠️ 拖拽路由分配表</span>
                    <span style="font-size:12px; opacity:0.6; background: rgba(0,0,0,0.3); padding:4px 10px; border-radius:10px;">🖱️ 鼠标按住下方胶囊即可自由拖拽分配</span>
                </div>
                <div class="kn-drag-board">
                    <div id="dz-0" class="kn-drop-zone" data-title="🌟 主页可见 (常驻)" ondragover="window.knDragOver(event)" ondragleave="window.knDragLeave(event)" ondrop="window.knDrop(event, 0)"></div>
                    <div id="dz-1" class="kn-drop-zone" data-title="📦 放入收纳箱 (次级)" ondragover="window.knDragOver(event)" ondragleave="window.knDragLeave(event)" ondrop="window.knDrop(event, 1)"></div>
                    <div id="dz-2" class="kn-drop-zone" data-title="🚫 彻底隐藏 (不可见)" ondragover="window.knDragOver(event)" ondragleave="window.knDragLeave(event)" ondrop="window.knDrop(event, 2)"></div>
                </div>
            </div>

            <div id="kn-tab-content-3" class="kn-tab-content">
                <div style="text-align: center; padding: 15px 20px;">
                    <div style="font-size: 45px; margin-bottom: 10px;">🚀</div>
                    <div style="font-size: 20px; color: #fff; font-weight: 800; margin-bottom: 5px; letter-spacing: 1px;">UTools Beautifier</div>
                    <div style="font-size: 13px; color: #87ceeb; margin-bottom: 20px; font-family: monospace; font-weight: bold;">Version: ` + CURRENT_VERSION + `</div>
                    
                    <div style="background: rgba(0,0,0,0.25); padding: 20px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.05); text-align: left; box-shadow: inset 0 2px 10px rgba(0,0,0,0.1);">
                        <p style="color: #ddd; font-size: 14px; line-height: 1.6; margin: 0 0 15px 0;">
                            专为 ZTE F50 路由器打造的终极扩展框架与控制中心。内嵌 8 项前沿 Web UI 视觉特效，以及强大的 Bartender 级底层拦截路由收纳系统。
                        </p>
                        <div style="display: flex; align-items: center; gap: 10px; font-size: 13px; background: rgba(255,255,255,0.05); padding: 10px 15px; border-radius: 10px;">
                            <span style="color: #999;">开源主页:</span>
                            <a href="https://github.com/LceAn/UTools-Beautifier" target="_blank" style="color: #87ceeb; text-decoration: none; word-break: break-all; font-weight: bold; border-bottom: 1px dashed #87ceeb; padding-bottom: 2px; transition: all 0.2s;">
                                github.com/LceAn/UTools-Beautifier
                            </a>
                        </div>
                    </div>
                    
                    <div style="margin-top: 25px; text-align: center;">
                        <button id="kn-update-btn" onclick="window.knCheckUpdate()" class="beauty-capsule" style="background: linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05)); color: #fff; border: 1px solid rgba(255,255,255,0.2); padding: 8px 30px; font-size: 13px; cursor: pointer; box-shadow: 0 4px 10px rgba(0,0,0,0.2); transition: all 0.3s;">🔄 检查更新</button>
                        <div id="kn-update-info" style="margin-top: 12px; font-size: 12px; min-height: 18px; color: #ccc;"></div>
                    </div>
                </div>
            </div>

            <div style="text-align: right; margin-top: 10px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px;">
                <button onclick="window.knCloseBeautyModal()" class="beauty-capsule" style="background: #018ad8; color:#fff; border: none; padding:10px 45px; font-size:15px; font-weight:bold; cursor:pointer; box-shadow: 0 4px 15px rgba(1, 138, 216, 0.4);">完 成</button>
            </div>
        </div>
    `;
    beautyModal.onclick = (e) => { if (e.target === beautyModal) window.knCloseBeautyModal(); };
    document.body.appendChild(beautyModal);

    // ==========================================
    // 6. 核心拦截与安全美化渲染 (修复空指针)
    // ==========================================
    const originalAppendChild = HTMLElement.prototype.appendChild;
    HTMLElement.prototype.appendChild = function(element) {
        if (this === window.collapseBtn_menu?.nextElementSibling?.querySelector('.collapse_box') && 
            element.tagName === 'BUTTON') {
            const toolbox = document.getElementById('toolbox_buttons');
            // 增加安全校验：若 toolbox 还未注入，则放行
            if (toolbox) {
                const res = originalAppendChild.call(toolbox, element);
                applyBartenderLogic(); 
                return res;
            }
        }
        return originalAppendChild.call(this, element);
    };

    const renderBeauty = () => {
        document.querySelectorAll('.box').forEach(el => {
            config.enableRadius ? el.classList.add('beauty-radius') : el.classList.remove('beauty-radius');
            config.enableShadow ? el.classList.add('beauty-shadow') : el.classList.remove('beauty-shadow');
            config.enableGlass ? el.classList.add('beauty-glass') : el.classList.remove('beauty-glass');
            config.enableCompact ? el.classList.add('beauty-compact') : el.classList.remove('beauty-compact');
            config.enableHover ? el.classList.add('beauty-hover') : el.classList.remove('beauty-hover');
        });
        document.querySelectorAll('button').forEach(el => {
            if(el.classList.contains('switch') || el.classList.contains('radio')) return;
            config.enableCapsule ? el.classList.add('beauty-capsule') : el.classList.remove('beauty-capsule');
        });
        
        document.querySelectorAll('.title strong, .box .title').forEach(el => {
            if(el.children.length === 0) {
                config.enableGradient ? el.classList.add('beauty-gradient') : el.classList.remove('beauty-gradient');
            }
        });
        
        config.enableScrollbar ? document.body.classList.add('beauty-scrollbar') : document.body.classList.remove('beauty-scrollbar');
    };

    // ==========================================
    // 7. 智能防遮挡
    // ==========================================
    const initAutoClose = () => {
        const hookShowModal = () => {
            if (typeof window.showModal === 'function') {
                if (window.showModal.__kn_hooked__) return;
                const originalShowModal = window.showModal;
                window.showModal = function (...args) {
                    const target = args[0];
                    if (target !== '#KanoDrawerModal' && target !== '#KanoBeautyModal') {
                        window.knCloseDrawerModal();
                    }
                    return originalShowModal.apply(this, args);
                };
                window.showModal.__kn_hooked__ = true;
            } else {
                setTimeout(hookShowModal, 200); 
            }
        };
        hookShowModal();

        const secMenu = document.getElementById('secondary_menu_buttons');
        if (secMenu) {
            secMenu.addEventListener('click', (e) => {
                const btn = e.target.closest('button');
                if (btn) { setTimeout(() => window.knCloseDrawerModal(), 150); }
            });
        }
    };

    // 启动引擎
    injectCSS();
    document.documentElement.style.setProperty('--kn-grad-1', config.gradColor1);
    document.documentElement.style.setProperty('--kn-grad-2', config.gradColor2);
    renderBeauty();
    new MutationObserver(renderBeauty).observe(document.body, { childList: true, subtree: true });
    initAutoClose();
})();
</script>