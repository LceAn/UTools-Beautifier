<script>
(function () {
  'use strict';

  var VERSION = '26.12.0-webos-network-diagnostics';
  var GITHUB_REPO = 'LceAn/UTools-Beautifier';
  var GITHUB_REPO_URL = 'https://github.com/' + GITHUB_REPO;
  var GITHUB_ISSUES_URL = GITHUB_REPO_URL + '/issues/new';
  var PHONE_SMS_PLUGIN_URL = GITHUB_REPO_URL;
  var OPERATOR_INFO_PLUGIN_URL = GITHUB_REPO_URL;
  var EXTERNAL_KANO_PHONE_SMS = (window.KanoPhoneSMS && typeof window.KanoPhoneSMS.open === 'function') ? window.KanoPhoneSMS : null;
  var CONFIG_KEY = 'kano_webos_config_v26_clean';
  var WEBOS_CONFIG_KEY = 'kano_webos_runtime_config_v1';
  var WEBOS_WELCOME_KEY = 'kano_webos_welcome_hidden_v1';

  var HEADER_ID = 'kn-app-header';
  var STYLE_ID = 'kano-webos-style';
  var HOME_STYLE_ID = 'kano-webos-home-style';
  var THEME_STYLE_ID = 'kano-webos-theme-style';
  var RESPONSIVE_STYLE_ID = 'kano-webos-responsive-style';
  var TOOLBOX_STYLE_ID = 'kano-webos-toolbox-style';
  var HOME_DASHBOARD_ID = 'kn-home-dashboard';
  var TOOLBOX_WRAPPER_ID = 'kn-toolbox-wrapper';
  var TOOLBOX_DRAWER_ID = 'kn-toolbox-drawer-modal';
  var TOOLBOX_SETTINGS_ID = 'kn-toolbox-settings-modal';
  var TOOLBOX_CONFIG_KEY = 'kano_webos_toolbox_config_v1';
  var DIALOG_ID = 'kn-ui-settings-dialog';
  var HIDDEN_CLASS = 'kn-os-hidden';
  var DRAG_PREFIX = 'KANO_WEBOS_ENTITY:';

  var GROUPS = {
    home: { label: '首页', shortLabel: '首页', desc: '首页概览、设备状态、常用入口' },
    overview: { label: '状态', shortLabel: '状态', desc: '基本状态、设备监控' },
    network: { label: '网络', shortLabel: '网络', desc: '锁频、锁站、信号、投屏、ADB 音频' },
    system: { label: '系统', shortLabel: '系统', desc: '终端、时间同步、SQLite、系统维护' },
    tools: { label: '工具', shortLabel: '工具', desc: '功能列表、扩展工具箱、第三方插件入口收纳' },
    extensions: { label: '扩展', shortLabel: '扩展', desc: '第三方扩展面板' }
  };
  var GROUP_ORDER = ['home', 'overview', 'network', 'system', 'tools', 'extensions'];

  var DEFAULT_MODULES = {
    home: { name: '首页', group: 'home' },
    status: { name: '基本状态', group: 'overview' },
    devices: { name: '设备监控', group: 'overview' },
    functions: { name: '功能列表', group: 'tools' },
    bandLock: { name: '锁定频段', group: 'network' },
    freqLock: { name: '锁定基站', group: 'network' },
    ttyd: { name: 'TTYD 终端', group: 'system' },
    toolbox: { name: '扩展工具箱', group: 'tools' }
  };

  var DEFAULT_PANELS = {
    IFRAME_KANO: { name: '猫猫', group: 'extensions' },
    kano_ws_audio_IFRAME_KANO: { name: 'ADB 音频透传', group: 'network' },
    PICOCLAW_PANEL: { name: 'PicoClaw', group: 'extensions' },
    ws_scrcpy_IFRAME_KANO: { name: '网页投屏', group: 'network' },
    TIME_SYNC_HELPER: { name: '时间同步助手', group: 'system' },
    IFRAME_KANO_SQLITE_TOOLKIT: { name: 'SQLite 管理 + 进程 Killer', group: 'system' },
    SIGNAL_MONITOR: { name: '5G 信号监控', group: 'network' }
  };

  var BACKGROUND_PRESETS = {
    none: { label: '无背景', url: '' },
    bing: { label: 'Bing 每日风景', url: 'https://bing.img.run/1920x1080.php' },
    picsum: { label: '极简随机摄影', url: 'https://picsum.photos/1920/1080' },
    gradientBlue: { label: '蓝色渐变', url: 'css:blue' },
    gradientDark: { label: '深空渐变', url: 'css:dark' }
  };

  var DEFAULT_APPEARANCE = {
    themeMode: 'dark',
    accentColor: '#4e92ff',
    enableRadius: true,
    enableShadow: true,
    enableCapsule: true,
    enableGlass: false,
    enableCompact: false,
    enableGradient: true,
    enableHover: true,
    enableScrollbar: true,
    enableReadableText: true,
    enableSoftDivider: true,
    enableBackground: false,
    backgroundMode: 'preset',
    backgroundPreset: 'bing',
    backgroundImage: '',
    backgroundDim: 24,
    backgroundBlur: 0,
    backgroundSaturate: 110,
    gradColor1: '#87ceeb',
    gradColor2: '#3b82f6',
    headerBlur: 22,
    headerOpacity: 82,
    fontScale: 100,
    animationLevel: 1
  };

  var state = { container: null, config: null, toolboxConfig: null, observer: null, toolboxObserver: null, timer: null, raf: 0, drag: null, toolboxDragName: '', nativeLoginBtn: null, nativeCommandPwdBtn: null, nativePasswordBtn: null, nativeDevicePropsBtn: null, nativeWifiInfoBtn: null, nativeWifiSettingsBtn: null, nativeAccessDevicesBtn: null, nativePluginFeatureBtn: null, headerRefreshAt: 0, headerNetworkBusy: false, headerResizeHandler: null };

  try { if (window.KanoWebOS && typeof window.KanoWebOS.destroy === 'function') window.KanoWebOS.destroy(); } catch (e) {}
  cleanupOldUI();

  function cleanupOldUI() {
    try {
      var nativeBoxForRestore = (window.collapseBtn_menu && window.collapseBtn_menu.nextElementSibling && window.collapseBtn_menu.nextElementSibling.querySelector && window.collapseBtn_menu.nextElementSibling.querySelector('.collapse_box')) || null;
      Array.prototype.slice.call(document.querySelectorAll('#kn-toolbox-buttons,#kn-toolbox-secondary-buttons')).forEach(function (box) {
        if (!nativeBoxForRestore) return;
        Array.prototype.slice.call(box.children).forEach(function (child) {
          if (child && child.tagName && child.tagName.toUpperCase() === 'BUTTON') {
            child.style.display = '';
            nativeBoxForRestore.appendChild(child);
          }
        });
      });
    } catch (e) {}
    var selector = '#kn-os-dialog,#' + DIALOG_ID + ',#' + HOME_DASHBOARD_ID + ',#' + TOOLBOX_WRAPPER_ID + ',#' + TOOLBOX_DRAWER_ID + ',#' + TOOLBOX_SETTINGS_ID + ',#' + HEADER_ID + ',#' + STYLE_ID + ',#' + THEME_STYLE_ID + ',#' + RESPONSIVE_STYLE_ID + ',#' + HOME_STYLE_ID + ',#' + TOOLBOX_STYLE_ID + ',#kano-webos-appearance-style,#kano-webos-phone-sms-style,#kn-phone-sms-modal,#kano-webos-function-center-style,#kn-network-diagnostics-modal,#kn-plugin-hub-wrapper,#kn-header-polish-style,#kano-webos-theme-fix-style,#kano-webos-settings-polish-style';
    Array.prototype.slice.call(document.querySelectorAll(selector)).forEach(function (el) { el.remove(); });
    Array.prototype.slice.call(document.querySelectorAll('.' + HIDDEN_CLASS + ',.kn-plugin-entry-hidden,.kn-toolbox-captured,.kn-home-function-hidden')).forEach(function (el) {
      el.classList.remove(HIDDEN_CLASS);
      el.classList.remove('kn-plugin-entry-hidden');
      el.classList.remove('kn-toolbox-captured');
      el.classList.remove('kn-home-function-hidden');
      try { el.removeAttribute('data-kn-home-function-hidden'); } catch (e) {}
    });
    Array.prototype.slice.call(document.querySelectorAll('.kn-native-login-source,.kn-native-command-source,.kn-native-password-source,.kn-native-wifi-settings-source,.kn-native-access-devices-source,.kn-native-plugin-source')).forEach(function (el) {
      el.classList.remove('kn-native-login-source');
      el.classList.remove('kn-native-command-source');
      el.classList.remove('kn-native-password-source');
      el.classList.remove('kn-native-wifi-settings-source');
      el.classList.remove('kn-native-access-devices-source');
      el.classList.remove('kn-native-plugin-source');
      el.style.display = '';
    });
    document.documentElement.classList.remove('kn-theme-dark', 'kn-theme-light', 'kn-webos-active');
  }

  function clone(obj) { return JSON.parse(JSON.stringify(obj || {})); }
  function clean(text) { return String(text || '').replace(/\s+/g, ' ').trim(); }
  function knEsc(text) { return String(text == null ? '' : text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); }
  function mapLegacyGroup(group) { return String(group) === 'functionsPage' ? 'tools' : group; }
  function isValidGroup(group) { return GROUP_ORDER.indexOf(String(group)) !== -1; }
  function num(value, fallback, min, max) {
    var n = Number(value);
    if (!isFinite(n)) n = fallback;
    if (typeof min === 'number' && n < min) n = min;
    if (typeof max === 'number' && n > max) n = max;
    return n;
  }


  var DEFAULT_WEBOS_CONFIG = {
    nativeButtonMigration: true,
    homeHeavyCards: true,
    homeDetails: true,
    homeExitIp: true,
    homePhoneSmsCard: true,
    homeOperatorCard: true,
    homeMaintenance: true,
    homeAutoRefresh: true,
    toolboxCapture: true,
    phoneSmsBuiltin: true,
    operatorInfoCard: true,
    welcomeEnabled: true,
    compatibilityMode: false
  };

  function readWebOSConfig() {
    var cfg = clone(DEFAULT_WEBOS_CONFIG);
    try {
      var raw = localStorage.getItem(WEBOS_CONFIG_KEY);
      if (raw) {
        var parsed = JSON.parse(raw) || {};
        Object.keys(cfg).forEach(function (key) {
          if (Object.prototype.hasOwnProperty.call(parsed, key)) cfg[key] = parsed[key] !== false;
        });
      }
    } catch (e) {}
    return cfg;
  }

  function saveWebOSConfig(cfg) {
    try { localStorage.setItem(WEBOS_CONFIG_KEY, JSON.stringify(cfg || readWebOSConfig())); } catch (e) {}
  }

  function isWebOSFeatureEnabled(key) {
    var cfg = readWebOSConfig();
    return cfg[key] !== false;
  }

  function setWebOSFeature(key, value) {
    var cfg = readWebOSConfig();
    cfg[key] = value !== false;
    saveWebOSConfig(cfg);
    applyWebOSFeatureFlags();
    syncWebOSSettingsControls();
  }

  function setWebOSCompatibilityMode(enable) {
    var cfg = readWebOSConfig();
    cfg.compatibilityMode = !!enable;
    if (enable) {
      cfg.nativeButtonMigration = false;
      cfg.homeHeavyCards = false;
      cfg.homeExitIp = false;
      cfg.homePhoneSmsCard = false;
      cfg.homeOperatorCard = false;
      cfg.homeMaintenance = false;
      cfg.homeAutoRefresh = false;
      cfg.toolboxCapture = false;
    } else {
      Object.keys(DEFAULT_WEBOS_CONFIG).forEach(function (key) { cfg[key] = DEFAULT_WEBOS_CONFIG[key]; });
    }
    saveWebOSConfig(cfg);
    applyWebOSFeatureFlags();
    syncWebOSSettingsControls();
  }

  function getWebOSDeviceIdentityText() {
    var text = '';
    try { text += ' ' + clean(document.body && document.body.innerText || ''); } catch (e) {}
    try { text += ' ' + clean(document.title || ''); } catch (e) {}
    return text;
  }

  function detectWebOSDeviceInfo() {
    var text = getWebOSDeviceIdentityText();
    var model = '';
    var m = text.match(/\bF50(?:\s|\b|[-_])/i) || text.match(/(?:设备型号|型号|Model)\s*[:：]?\s*([A-Za-z0-9_-]{2,30})/i);
    if (m) model = clean(m[1] || m[0]).replace(/[：:]+$/, '');
    var isF50 = /\bF50\b/i.test(text) || /\bF50\b/i.test(model);
    return { model: model || (isF50 ? 'F50' : '未知设备'), isF50: isF50 };
  }

  function applyWebOSFeatureFlags() {
    var cfg = readWebOSConfig();
    var root = document.documentElement;
    if (root) {
      root.classList.toggle('kn-webos-native-off', cfg.nativeButtonMigration === false);
      root.classList.toggle('kn-webos-heavy-off', cfg.homeHeavyCards === false);
      root.classList.toggle('kn-webos-details-off', cfg.homeDetails === false);
      root.classList.toggle('kn-webos-exitip-off', cfg.homeExitIp === false);
      root.classList.toggle('kn-webos-phonesms-off', cfg.homePhoneSmsCard === false);
      root.classList.toggle('kn-webos-operator-off', cfg.homeOperatorCard === false || cfg.operatorInfoCard === false);
      root.classList.toggle('kn-webos-maint-off', cfg.homeMaintenance === false);
    }
    if (cfg.nativeButtonMigration === false) restoreHomeFunctionListButtons();
    syncHomeRefreshControls();
  }

  function restoreHomeFunctionListButtons() {
    Array.prototype.slice.call(document.querySelectorAll('.kn-home-function-hidden')).forEach(function (el) {
      el.classList.remove('kn-home-function-hidden');
      try { el.removeAttribute('data-kn-home-function-hidden'); } catch (e) {}
      try { el.style.display = ''; el.style.visibility = ''; el.style.opacity = ''; } catch (e) {}
    });
  }

  function syncWebOSSettingsControls() {
    var cfg = readWebOSConfig();
    Array.prototype.slice.call(document.querySelectorAll('[data-webos-feature]')).forEach(function (input) {
      var key = input.getAttribute('data-webos-feature');
      if (input.type === 'checkbox') input.checked = cfg[key] !== false;
    });
    var compat = document.querySelector('[data-webos-action="compatMode"]');
    if (compat) compat.textContent = cfg.compatibilityMode ? '退出兼容模式' : '一键关闭增强功能';
  }

  function ensureWebOSRuntimeCSS() {
    if (document.getElementById('kano-webos-runtime-style')) return;
    var style = document.createElement('style');
    style.id = 'kano-webos-runtime-style';
    style.textContent = '' +
      '.kn-webos-heavy-off #kn-home-dashboard .kn-home-dashboard-fusion,.kn-webos-heavy-off #kn-home-dashboard .kn-home-resource-card{display:none!important}' +
      '.kn-webos-details-off #kn-home-dashboard .kn-home-details-wrap{display:none!important}' +
      '.kn-webos-exitip-off #kn-home-exit-ip-card{display:none!important}' +
      '.kn-webos-phonesms-off #kn-home-phone-sms-card{display:none!important}' +
      '.kn-webos-operator-off #kn-home-operator-card{display:none!important}' +
      '.kn-webos-maint-off #kn-home-maint-card{display:none!important}' +
      '.kn-webos-welcome-mask{position:fixed;inset:0;z-index:2147483600;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,.62);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}' +
      '.kn-webos-welcome{width:min(720px,calc(100vw - 32px));border-radius:28px;border:1px solid rgba(255,255,255,.13);background:radial-gradient(circle at 12% 0%,rgba(120,180,255,.18),transparent 36%),linear-gradient(180deg,rgba(24,29,40,.98),rgba(9,13,20,.98));box-shadow:0 30px 90px rgba(0,0,0,.58);color:#fff;overflow:hidden}' +
      '.kn-webos-welcome-head{display:flex;justify-content:space-between;gap:16px;padding:24px 26px 18px;border-bottom:1px solid rgba(255,255,255,.08)}.kn-webos-welcome-kicker{font-size:11px;font-weight:900;color:#8fc2ff;letter-spacing:.08em;margin-bottom:8px}.kn-webos-welcome-title{font-size:23px;font-weight:950}.kn-webos-welcome-sub{margin-top:8px;font-size:13px;color:rgba(255,255,255,.62);line-height:1.7}.kn-webos-device-pill{height:34px;display:inline-flex;align-items:center;padding:0 12px;border-radius:999px;background:rgba(57,210,121,.13);border:1px solid rgba(134,239,172,.24);color:#e4ffed;font-size:12px;font-weight:900;white-space:nowrap}.kn-webos-device-pill.warn{background:rgba(247,201,72,.13);border-color:rgba(247,201,72,.30);color:#fff4d0}' +
      '.kn-webos-welcome-body{padding:20px 26px 24px}.kn-webos-welcome-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:14px 0}.kn-webos-welcome-card{padding:13px;border-radius:18px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.07)}.kn-webos-welcome-card b{display:block;font-size:12px;margin-bottom:6px}.kn-webos-welcome-card span{font-size:11px;color:rgba(255,255,255,.55);line-height:1.55}.kn-webos-welcome-actions{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:16px}.kn-webos-welcome-check{display:flex;gap:8px;align-items:center;font-size:12px;color:rgba(255,255,255,.70)}.kn-webos-welcome-btns{display:flex;gap:8px;flex-wrap:wrap}.kn-webos-btn{min-height:36px;padding:0 14px;border-radius:999px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.07);color:#fff;font-weight:850;cursor:pointer}.kn-webos-btn.primary{background:rgba(78,146,255,.22);border-color:rgba(120,180,255,.34)}.kn-webos-btn.warn{background:rgba(247,201,72,.13);border-color:rgba(247,201,72,.28);color:#fff4d0}' +
      '.kn-webos-settings-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.kn-webos-setting-card{padding:16px;border-radius:20px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.075)}.kn-webos-setting-card.full{grid-column:1/-1}.kn-webos-setting-title{font-size:14px;font-weight:950;margin-bottom:8px;color:rgba(255,255,255,.88)}.kn-webos-setting-desc{font-size:12px;line-height:1.65;color:rgba(255,255,255,.55);margin-bottom:12px}.kn-webos-switch-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.kn-webos-switch{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border-radius:16px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);font-size:12px;color:rgba(255,255,255,.78);font-weight:800}.kn-webos-switch input{width:18px;height:18px;accent-color:#4e92ff}@media(max-width:760px){.kn-webos-welcome-grid,.kn-webos-settings-grid,.kn-webos-switch-list{grid-template-columns:1fr}}';
    document.head.appendChild(style);
  }

  function showWebOSWelcomeIfNeeded(force) {
    ensureWebOSRuntimeCSS();
    if (document.querySelector('.kn-webos-welcome-mask')) return;
    var cfg = readWebOSConfig();
    if (!force && cfg.welcomeEnabled === false) return;
    try { if (!force && localStorage.getItem(WEBOS_WELCOME_KEY) === '1') return; } catch (e) {}
    var info = detectWebOSDeviceInfo();
    var mask = document.createElement('div');
    mask.className = 'kn-webos-welcome-mask';
    mask.innerHTML = '<div class="kn-webos-welcome"><div class="kn-webos-welcome-head"><div><div class="kn-webos-welcome-kicker">WEBOS FIRST RUN</div><div class="kn-webos-welcome-title">欢迎使用 F50 适配版控制台</div><div class="kn-webos-welcome-sub">当前界面针对 F50/UFI-TOOLS 做了首页仪表盘、原生按钮收纳、插件管理、运营商信息与设备出口 IP 等增强。非 F50 设备可能存在字段不兼容。</div></div><div class="kn-webos-device-pill ' + (info.isF50 ? '' : 'warn') + '">' + (info.isF50 ? '已识别 F50' : '未确认 F50') + '</div></div><div class="kn-webos-welcome-body"><div class="kn-webos-welcome-grid"><div class="kn-webos-welcome-card"><b>设备识别</b><span>检测结果：' + knEsc(info.model) + '</span></div><div class="kn-webos-welcome-card"><b>兼容策略</b><span>如果不是 F50，可在 WebOS 设置里一键关闭重度增强。</span></div><div class="kn-webos-welcome-card"><b>安全原则</b><span>原生功能保留，可随时还原前端功能列表按钮。</span></div></div>' + (info.isF50 ? '' : '<div class="kn-note" style="margin-top:10px">检测结果不是明确 F50。建议先进入 WebOS 设置，使用“一键关闭增强功能”减少大量状态读取和首页增强卡片。</div>') + '<div class="kn-webos-welcome-actions"><label class="kn-webos-welcome-check"><input type="checkbox" id="kn-webos-welcome-hide" checked> 下次不再展示</label><div class="kn-webos-welcome-btns"><button type="button" class="kn-webos-btn" data-webos-welcome="settings">打开 WebOS 设置</button>' + (info.isF50 ? '' : '<button type="button" class="kn-webos-btn warn" data-webos-welcome="compat">一键关闭增强</button>') + '<button type="button" class="kn-webos-btn primary" data-webos-welcome="enter">进入控制台</button></div></div></div></div>';
    function closeWelcome() {
      var hide = mask.querySelector('#kn-webos-welcome-hide');
      if (!hide || hide.checked) { try { localStorage.setItem(WEBOS_WELCOME_KEY, '1'); } catch (e) {} }
      mask.remove();
    }
    mask.addEventListener('click', function (e) {
      var btn = e.target && e.target.closest ? e.target.closest('[data-webos-welcome]') : null;
      if (!btn) return;
      var action = btn.getAttribute('data-webos-welcome');
      if (action === 'compat') setWebOSCompatibilityMode(true);
      closeWelcome();
      if (action === 'settings') setTimeout(function () { openSettingsDialog(); switchSettingsTab('webos'); }, 60);
    });
    document.body.appendChild(mask);
  }

  function getTheme() {
    var a = state.config && state.config.appearance ? state.config.appearance : DEFAULT_APPEARANCE;
    if (a.themeMode === 'auto') {
      try { return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'; } catch (e) { return 'dark'; }
    }
    return a.themeMode === 'light' ? 'light' : 'dark';
  }

  function normalizeConfig(raw) {
    var cfg = raw && typeof raw === 'object' ? raw : {};
    var modules = clone(DEFAULT_MODULES);
    var panels = clone(DEFAULT_PANELS);
    var appearance = clone(DEFAULT_APPEARANCE);

    Object.keys(cfg.modules || {}).forEach(function (key) {
      if (!modules[key]) return;
      var item = cfg.modules[key] || {};
      var mappedModuleGroup = mapLegacyGroup(item.group);
      modules[key].group = isValidGroup(mappedModuleGroup) ? mappedModuleGroup : modules[key].group;
      modules[key].name = item.name || modules[key].name;
    });

    // v26.2.9：不再把“功能列表”做成顶层导航页；它只在“界面设置 → 导航分组”中作为独立模块出现。
    // 旧配置中的 functionsPage 自动迁移回 tools，避免顶栏多出“功能”页。
    modules.functions.name = '功能列表';
    if (!cfg.modules || !cfg.modules.functions) {
      modules.functions.group = 'tools';
    }
    modules.functions.group = mapLegacyGroup(modules.functions.group);
    modules.toolbox.name = '扩展工具箱';
    if (!cfg.modules || !cfg.modules.toolbox) {
      modules.toolbox.group = 'tools';
    }
    modules.toolbox.group = mapLegacyGroup(modules.toolbox.group);

    Object.keys(cfg.panels || {}).forEach(function (id) {
      var item = cfg.panels[id] || {};
      if (!panels[id]) panels[id] = { name: item.name || id, group: 'extensions' };
      var mappedPanelGroup = mapLegacyGroup(item.group);
      panels[id].group = mappedPanelGroup === 'hide' ? 'hide' : (isValidGroup(mappedPanelGroup) ? mappedPanelGroup : panels[id].group);
      panels[id].name = item.name || panels[id].name || id;
    });

    Object.keys(cfg.appearance || {}).forEach(function (key) {
      if (Object.prototype.hasOwnProperty.call(appearance, key)) appearance[key] = cfg.appearance[key];
    });

    if (['dark', 'light', 'auto'].indexOf(appearance.themeMode) === -1) appearance.themeMode = 'dark';
    if (['preset', 'custom'].indexOf(appearance.backgroundMode) === -1) {
      appearance.backgroundMode = appearance.backgroundImage ? 'custom' : 'preset';
    }
    if (!BACKGROUND_PRESETS[appearance.backgroundPreset]) appearance.backgroundPreset = 'bing';
    appearance.backgroundDim = num(appearance.backgroundDim, 24, 0, 85);
    appearance.backgroundBlur = num(appearance.backgroundBlur, 0, 0, 30);
    appearance.backgroundSaturate = num(appearance.backgroundSaturate, 110, 50, 180);
    appearance.headerBlur = num(appearance.headerBlur, 22, 8, 40);
    appearance.headerOpacity = num(appearance.headerOpacity, 82, 35, 98);
    appearance.fontScale = num(appearance.fontScale, 100, 88, 116);
    appearance.animationLevel = num(appearance.animationLevel, 1, 0, 2);

    return {
      modules: modules,
      panels: panels,
      appearance: appearance,
      currentGroup: isValidGroup(mapLegacyGroup(cfg.currentGroup)) ? mapLegacyGroup(cfg.currentGroup) : 'home',
      compactHeader: Boolean(cfg.compactHeader)
    };
  }

  function readConfig() {
    try {
      var raw = localStorage.getItem(CONFIG_KEY);
      return normalizeConfig(raw ? JSON.parse(raw) : null);
    } catch (e) {
      localStorage.removeItem(CONFIG_KEY);
      return normalizeConfig(null);
    }
  }
  function saveConfig() { try { localStorage.setItem(CONFIG_KEY, JSON.stringify(state.config)); } catch (e) {} }

  function injectCSS() {
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = '' +
      ':root{--kn-accent:#4e92ff;--kn-radius:22px}' +
      'html.kn-webos-active body>.footer,html.kn-webos-active body>.toolbar{display:none!important}' +
      '#'+ HEADER_ID + '{width:min(1320px,calc(100% - 40px));box-sizing:border-box;display:grid;grid-template-columns:minmax(240px,300px) minmax(320px,1fr) minmax(520px,620px);align-items:center;gap:18px;margin:12px auto 24px;padding:12px 16px;position:sticky;top:12px;z-index:8888;border-radius:24px;border:1px solid rgba(255,255,255,.12);background:rgba(22,26,32,.82);backdrop-filter:blur(22px) saturate(180%);-webkit-backdrop-filter:blur(22px) saturate(180%);box-shadow:0 16px 40px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.05)}' +
      '#' + HEADER_ID + '.compact{padding-top:8px;padding-bottom:8px}' +
      '#kn-title-placeholder{display:flex;align-items:center;min-width:0}' +
      '#kn-header-left{display:flex;align-items:center;gap:12px;min-width:0}' +
      '#kn-brand-mark{width:42px;height:42px;flex:0 0 42px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:900;color:#fff;background:rgba(78,146,255,.18);border:1px solid rgba(120,180,255,.28)}' +
      '#kn-brand-copy{display:flex;flex-direction:column;min-width:0;line-height:1.1}' +
      '#kn-brand-title{font-size:16px;font-weight:900;color:rgba(255,255,255,.96);white-space:nowrap}' +
      '#kn-brand-subtitle{margin-top:4px;font-size:11px;color:rgba(255,255,255,.52);white-space:nowrap}' +
      '.kn-version-chips{display:flex;align-items:center;gap:6px;margin-top:6px;flex-wrap:wrap}' +
      '.kn-meta-chip{display:inline-flex;align-items:center;height:22px;padding:0 8px;border-radius:999px;font-size:10px;font-weight:750;color:rgba(255,255,255,.70);background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.10);white-space:nowrap}.kn-meta-chip.primary{color:#8fc2ff;background:rgba(61,132,255,.10);border-color:rgba(115,177,255,.24)}.kn-meta-chip.muted{color:rgba(255,255,255,.48)}' +
      '#kn-header-center{min-width:0;display:flex;align-items:center;justify-content:center}' +
      '#kn-main-nav{width:min(500px,100%);display:grid;grid-template-columns:repeat(6,minmax(64px,1fr));gap:6px;padding:6px;border-radius:18px;background:rgba(0,0,0,.22);border:1px solid rgba(255,255,255,.06)}' +
      '.kn-nav-btn,.kn-action-btn,.kn-panel-btn{min-height:38px;border:1px solid rgba(255,255,255,.14);border-radius:14px;padding:0 14px;font-size:13px;font-weight:850;cursor:pointer;white-space:nowrap;transition:all .18s ease}' +
      '.kn-nav-btn{display:flex;align-items:center;justify-content:center;gap:5px;border-color:transparent;background:transparent;color:rgba(255,255,255,.62)}.kn-nav-btn:hover{color:#fff;background:rgba(255,255,255,.10);transform:translateY(-1px)}.kn-nav-btn.active{color:#fff;background:linear-gradient(180deg,rgba(78,146,255,.34),rgba(78,146,255,.16));border-color:rgba(120,180,255,.34);box-shadow:0 8px 18px rgba(40,100,220,.16),inset 0 1px 0 rgba(255,255,255,.10)}' +
      '#kn-header-actions{display:flex;align-items:center;justify-content:flex-end;gap:10px;flex-wrap:nowrap;min-width:0;padding:4px;border-radius:22px;background:rgba(0,0,0,.12);border:1px solid rgba(255,255,255,.045)}.kn-action-btn,.kn-panel-btn{color:rgba(255,255,255,.84);background:rgba(255,255,255,.07)}.kn-action-btn.primary,.kn-panel-btn.primary{color:#fff;background:linear-gradient(180deg,rgba(78,146,255,.30),rgba(78,146,255,.16));border-color:rgba(120,180,255,.34)}.kn-header-tool-btn{min-width:84px;justify-content:center}.kn-header-tool-menu-wrap{position:relative;display:inline-flex;align-items:center}.kn-header-tool-menu{position:absolute;right:0;top:calc(100% + 10px);width:176px;padding:8px;border-radius:16px;border:1px solid rgba(255,255,255,.12);background:radial-gradient(circle at 12% 0%,rgba(120,180,255,.14),transparent 36%),linear-gradient(180deg,rgba(22,29,41,.98),rgba(9,13,20,.98));box-shadow:0 28px 70px rgba(0,0,0,.48),inset 0 1px 0 rgba(255,255,255,.06);display:none;z-index:999999;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}.kn-header-tool-menu-wrap.open .kn-header-tool-menu{display:block}.kn-header-tool-menu-item{width:100%;min-height:38px;border:0;border-radius:12px;background:transparent;color:rgba(255,255,255,.84);display:flex;align-items:center;justify-content:flex-start;gap:9px;padding:0 11px;font-size:12px;font-weight:850;cursor:pointer;text-align:left}.kn-header-tool-menu-item:hover{background:rgba(255,255,255,.085);color:#fff}.kn-header-tool-icon{width:18px;height:18px;border-radius:7px;display:inline-flex;align-items:center;justify-content:center;background:rgba(120,180,255,.12);border:1px solid rgba(120,180,255,.16);font-size:11px;font-weight:900;color:rgba(220,235,255,.92)}#kn-header-net-pill,.kn-login-pill{position:relative;min-height:38px;display:inline-flex;align-items:center;gap:7px;padding:0 12px;border-radius:999px;border:1px solid rgba(255,255,255,.13);background:rgba(255,255,255,.065);color:rgba(255,255,255,.86);font-size:12px;font-weight:850;white-space:nowrap;box-shadow:inset 0 1px 0 rgba(255,255,255,.07);transition:all .18s ease}#kn-header-net-pill:hover,.kn-login-pill:hover{transform:translateY(-1px);background:rgba(255,255,255,.10);border-color:rgba(120,180,255,.26)}#kn-header-net-pill{max-width:215px;cursor:default}.kn-login-pill{cursor:pointer}.kn-login-pill.is-login{color:rgba(225,255,235,.96);background:rgba(52,199,89,.14);border-color:rgba(134,239,172,.28)}.kn-login-pill.is-logout{color:rgba(255,255,255,.72);background:rgba(255,255,255,.055);border-color:rgba(255,255,255,.12)}#kn-header-network-dot{width:7px;height:7px;border-radius:50%;background:#f7c948;box-shadow:0 0 0 3px rgba(247,201,72,.13);flex:0 0 auto}#kn-header-network-dot.online{background:#39d279;box-shadow:0 0 0 3px rgba(57,210,121,.15),0 0 16px rgba(57,210,121,.42)}#kn-header-network-dot.offline{background:#ff5f68;box-shadow:0 0 0 3px rgba(255,95,104,.13),0 0 16px rgba(255,95,104,.34)}#kn-header-operator,#kn-header-nettype,#kn-header-login-text{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#kn-header-operator{max-width:72px}.kn-login-icon{width:18px;height:18px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:rgba(120,180,255,.14);border:1px solid rgba(120,180,255,.18);font-size:12px;font-weight:900}.kn-login-menu-wrap{position:relative;display:inline-flex;align-items:center}.kn-login-menu{position:absolute;right:0;top:calc(100% + 10px);width:184px;padding:8px;border-radius:16px;border:1px solid rgba(255,255,255,.12);background:radial-gradient(circle at 12% 0%,rgba(120,180,255,.14),transparent 36%),linear-gradient(180deg,rgba(22,29,41,.98),rgba(9,13,20,.98));box-shadow:0 28px 70px rgba(0,0,0,.48),inset 0 1px 0 rgba(255,255,255,.06);display:none;z-index:999999;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}.kn-login-menu-wrap.open .kn-login-menu{display:block}.kn-login-menu-item{width:100%;min-height:38px;border:0;border-radius:12px;background:transparent;color:rgba(255,255,255,.84);display:flex;align-items:center;justify-content:flex-start;gap:9px;padding:0 11px;font-size:12px;font-weight:850;cursor:pointer;text-align:left}.kn-login-menu-item:hover{background:rgba(255,255,255,.085);color:#fff}.kn-login-menu-icon{width:18px;height:18px;border-radius:7px;display:inline-flex;align-items:center;justify-content:center;background:rgba(120,180,255,.12);border:1px solid rgba(120,180,255,.16);font-size:11px;font-weight:900;color:rgba(220,235,255,.92)}.kn-login-menu-sep{height:1px;background:rgba(255,255,255,.08);margin:6px 4px}#kn-header-signal{display:inline-flex;align-items:flex-end;gap:2px;width:18px;height:14px;flex:0 0 auto}#kn-header-signal i{width:3px;border-radius:999px;background:rgba(255,255,255,.22)}#kn-header-signal i:nth-child(1){height:4px}#kn-header-signal i:nth-child(2){height:7px}#kn-header-signal i:nth-child(3){height:10px}#kn-header-signal i:nth-child(4){height:13px}#kn-header-signal[data-level="1"] i:nth-child(-n+1),#kn-header-signal[data-level="2"] i:nth-child(-n+2),#kn-header-signal[data-level="3"] i:nth-child(-n+3),#kn-header-signal[data-level="4"] i:nth-child(-n+4),#kn-header-signal[data-level="5"] i:nth-child(-n+4){background:#39d279;box-shadow:0 0 10px rgba(57,210,121,.32)}#kn-header-net-pop{position:absolute;right:0;top:calc(100% + 10px);width:320px;padding:14px;border-radius:18px;border:1px solid rgba(255,255,255,.12);background:radial-gradient(circle at 12% 0%,rgba(120,180,255,.14),transparent 36%),linear-gradient(180deg,rgba(22,29,41,.98),rgba(9,13,20,.98));box-shadow:0 28px 70px rgba(0,0,0,.48),inset 0 1px 0 rgba(255,255,255,.06);display:none;z-index:999999;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}#kn-header-net-pill:hover #kn-header-net-pop,#kn-header-net-pill.open #kn-header-net-pop{display:block}.kn-net-pop-title{font-size:13px;font-weight:950;color:rgba(255,255,255,.95);padding-bottom:10px;margin-bottom:10px;border-bottom:1px solid rgba(255,255,255,.08)}.kn-net-pop-grid{display:grid;grid-template-columns:82px minmax(0,1fr);gap:8px 10px;font-size:12px;line-height:1.45}.kn-net-pop-grid b{color:rgba(255,255,255,.42);font-weight:780}.kn-net-pop-grid span{color:rgba(255,255,255,.82);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.kn-net-pop-grid span#kn-pop-ip{white-space:normal;word-break:break-all;line-height:1.55;overflow:visible;text-overflow:clip}.kn-header-focus-highlight{outline:2px solid rgba(127,180,255,.92)!important;box-shadow:0 0 0 6px rgba(127,180,255,.16),0 18px 44px rgba(40,100,220,.22)!important;border-radius:18px!important}' +
      '#' + DIALOG_ID + '{padding:0;border:none;border-radius:24px;background:transparent;overflow:visible;max-width:96vw}' +
      '#' + DIALOG_ID + '::backdrop{background:rgba(0,0,0,.62);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}' +
      '.kn-dialog-content{width:970px;max-width:96vw;height:min(820px,88vh);display:flex;flex-direction:column;overflow:hidden;padding:0;border-radius:26px;color:#fff;background:linear-gradient(180deg,rgba(28,30,36,.98),rgba(18,20,25,.98));border:1px solid rgba(255,255,255,.14);box-shadow:0 30px 80px rgba(0,0,0,.72)}' +
      '.kn-dialog-header{flex:0 0 auto;display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:26px 30px 20px;border-bottom:1px solid rgba(255,255,255,.08);background:radial-gradient(circle at top left,rgba(72,150,255,.16),transparent 35%),linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.015))}.kn-dialog-title{font-size:22px;font-weight:900;margin-bottom:8px}.kn-dialog-subtitle{font-size:12px;line-height:1.7;color:rgba(255,255,255,.58);max-width:740px}.kn-dialog-body{flex:1 1 auto;overflow:auto;padding:24px 30px 16px;background:rgba(0,0,0,.06)}.kn-dialog-footer{flex:0 0 auto;display:flex;justify-content:space-between;gap:10px;padding:16px 30px 24px;border-top:1px solid rgba(255,255,255,.08);flex-wrap:wrap;background:rgba(0,0,0,.08)}.kn-footer-left,.kn-footer-right{display:flex;gap:8px;flex-wrap:wrap}' +
      '.kn-settings-tabs{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px;padding:7px;border-radius:20px;background:rgba(0,0,0,.18);border:1px solid rgba(255,255,255,.07);margin-bottom:18px}.kn-settings-tab{min-height:42px;border:none;border-radius:15px;background:transparent;color:rgba(255,255,255,.58);font-weight:850;cursor:pointer}.kn-settings-tab.active{color:#fff;background:rgba(72,150,255,.20);box-shadow:0 8px 20px rgba(72,150,255,.16),inset 0 1px 0 rgba(255,255,255,.08)}.kn-settings-panel{display:none}.kn-settings-panel.active{display:block}' +
      '.kn-group-board{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.kn-group-zone{min-height:150px;padding:14px;border-radius:18px;border:1px solid rgba(255,255,255,.08);background:linear-gradient(180deg,rgba(18,21,27,.46),rgba(12,14,19,.34));display:flex;flex-direction:column;align-items:stretch;gap:8px}.kn-zone-head{width:100%;display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:2px;padding-bottom:9px;border-bottom:1px solid rgba(255,255,255,.07)}.kn-zone-copy{min-width:0}.kn-zone-name{font-size:14px;font-weight:900}.kn-zone-desc{margin-top:3px;font-size:11px;line-height:1.35;color:rgba(255,255,255,.43)}.kn-zone-count{flex:0 0 auto;min-width:42px;padding:3px 7px;border-radius:999px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.09);color:rgba(255,255,255,.58);font-size:10px;font-weight:800;text-align:center}.kn-group-zone.drag-over{border-color:rgba(82,160,255,.85);background:rgba(82,160,255,.13)}' +
      '.kn-item{width:100%;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:8px;padding:7px 8px;border-radius:8px;color:rgba(255,255,255,.90);font-size:12px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.07);cursor:default;box-sizing:border-box}.kn-item.panel{border-color:rgba(120,180,255,.24);background:rgba(40,132,255,.11)}.kn-item.missing{opacity:.55}.kn-item-main{min-width:0;display:flex;align-items:center;gap:7px;cursor:grab}.kn-item-main:active{cursor:grabbing}.kn-drag-handle{flex:0 0 auto;color:rgba(255,255,255,.35);font-size:15px;line-height:1}.kn-item-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.kn-badge{flex:0 0 auto;font-size:10px;color:rgba(255,255,255,.50);border:1px solid rgba(255,255,255,.12);border-radius:999px;padding:1px 5px;background:rgba(0,0,0,.16)}.kn-item-move{display:flex;align-items:center;gap:5px;color:rgba(255,255,255,.46);font-size:10px;white-space:nowrap}.kn-item-move select{width:92px;min-height:30px;padding:4px 24px 4px 7px;border-radius:7px;border:1px solid rgba(255,255,255,.13);background:rgba(8,10,14,.48);color:rgba(255,255,255,.88);font-size:11px;outline:none}.kn-item-move select:focus{border-color:rgba(82,160,255,.85);box-shadow:0 0 0 2px rgba(82,160,255,.14)}.kn-hidden-zone{border-color:rgba(255,120,120,.24);background:rgba(255,80,80,.055)}.kn-empty-tip{width:100%;color:rgba(255,255,255,.30);font-size:12px;padding:8px 0}.kn-note{font-size:12px;color:rgba(255,255,255,.58);line-height:1.75;margin:14px 0 0;padding:12px 14px;border-radius:14px;background:rgba(72,150,255,.07);border:1px solid rgba(120,180,255,.14)}' +
      '.kn-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.kn-form-card{position:relative;overflow:hidden;padding:18px;border-radius:22px;border:1px solid rgba(255,255,255,.08);background:linear-gradient(180deg,rgba(18,21,27,.46),rgba(12,14,19,.34))}.kn-form-card.full{grid-column:1/-1}.kn-form-title{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:900;margin-bottom:14px}.kn-form-title:before{content:"";width:7px;height:18px;border-radius:999px;background:linear-gradient(180deg,var(--kn-grad-1,#87ceeb),var(--kn-grad-2,#3b82f6));display:inline-block}.kn-check-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 14px}.kn-check{display:flex;align-items:center;gap:8px;font-size:13px;color:rgba(255,255,255,.82);cursor:pointer;padding:9px 10px;border-radius:14px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.07)}.kn-check input{width:17px;height:17px;accent-color:#4e92ff}.kn-input-row{display:grid;grid-template-columns:120px minmax(0,1fr);gap:10px;align-items:center;margin:12px 0}.kn-input-row label{font-size:12px;color:rgba(255,255,255,.55)}.kn-input-row input[type="text"],.kn-input-row input[type="number"],.kn-input-row input[type="password"],.kn-input-row select{min-height:40px;width:100%;box-sizing:border-box;border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.22);color:#fff;border-radius:14px;padding:9px 11px;outline:none}.kn-input-row input[type="color"]{width:42px;height:32px;border:none;background:transparent}.kn-input-row input[type="range"]{width:100%}' +
      '.kn-about-hero{display:flex;gap:18px;align-items:center;padding:20px;border-radius:24px;background:radial-gradient(circle at top left,rgba(72,150,255,.12),transparent 38%),linear-gradient(180deg,rgba(18,21,27,.50),rgba(12,14,19,.36));border:1px solid rgba(255,255,255,.08);margin-bottom:16px}.kn-about-logo{width:58px;height:58px;flex:0 0 58px;border-radius:20px;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:900;color:#fff;background:linear-gradient(180deg,rgba(78,146,255,.34),rgba(78,146,255,.15));border:1px solid rgba(120,180,255,.28)}.kn-about-title{font-size:20px;font-weight:950;margin-bottom:7px}.kn-about-desc{font-size:13px;line-height:1.7;color:rgba(255,255,255,.62);max-width:760px}.kn-about-tags{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.kn-about-tags span{font-size:11px;padding:5px 9px;border-radius:999px;background:rgba(72,150,255,.12);border:1px solid rgba(120,180,255,.18);color:#9dccff}.kn-about-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.kn-about-card{padding:18px;border-radius:22px;background:linear-gradient(180deg,rgba(18,21,27,.46),rgba(12,14,19,.34));border:1px solid rgba(255,255,255,.08)}.kn-about-card-title{font-size:14px;font-weight:900;margin-bottom:12px}.kn-about-kv{display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.06)}.kn-about-kv b{font-size:12px;color:rgba(255,255,255,.48)}.kn-about-kv span{font-size:12px;color:rgba(255,255,255,.82);text-align:right}.kn-about-link-box{display:flex;flex-direction:column;gap:7px;padding:12px;border-radius:16px;background:rgba(72,150,255,.08);border:1px solid rgba(120,180,255,.14)}.kn-about-link-box a{font-size:12px;color:#8fc2ff;text-decoration:none;word-break:break-all}.kn-about-small,.kn-about-list{font-size:12px;line-height:1.75;color:rgba(255,255,255,.62);margin-top:12px}' +
      '#kn-header-actions{gap:8px;align-items:center}' +
      '#kn-header-actions.is-tight .kn-net-sep{display:none!important}#kn-header-actions.is-tight .kn-wifi-status-text,#kn-header-actions.is-tight .kn-wifi-sep{display:none!important}#kn-header-actions.is-ultra-tight #kn-header-operator{display:none!important}#kn-header-actions.is-ultra-tight #kn-header-net-pill{min-width:76px!important;flex:0 0 76px!important;padding:0 9px!important;justify-content:center!important}#kn-header-actions.is-ultra-tight .kn-header-tool-btn{min-width:44px!important;width:44px!important;padding:0!important;font-size:0!important}#kn-header-actions.is-ultra-tight .kn-header-tool-btn:after{content:attr(data-short);font-size:12px!important}#kn-header-actions.is-ultra-tight .kn-login-pill{min-width:42px!important;width:42px!important;padding:0!important;justify-content:center!important}#kn-header-actions.is-ultra-tight #kn-header-login-text{display:none!important}' +
      '#kn-header-net-pill{min-width:210px;flex:1 1 260px;max-width:300px}#kn-header-operator{max-width:118px}.kn-header-tool-btn{flex:0 0 auto;min-width:92px}.kn-wifi-pill{min-width:118px!important;padding:0 11px!important}.kn-wifi-main{font-weight:900}.kn-wifi-sep{opacity:.55}.kn-wifi-status-text{max-width:46px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.kn-wifi-count{min-width:22px;height:22px;padding:0 7px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;background:rgba(57,210,121,.14);border:1px solid rgba(134,239,172,.22);color:rgba(225,255,235,.96);font-size:11px;font-weight:950}.kn-wifi-pill.offline .kn-wifi-count,.kn-wifi-pill.is-off .kn-wifi-count{background:rgba(255,95,104,.14);border-color:rgba(255,130,140,.22);color:rgba(255,230,232,.95)}.kn-wifi-pill.unknown .kn-wifi-count{background:rgba(255,255,255,.07);border-color:rgba(255,255,255,.11);color:rgba(255,255,255,.72)}' +
      '#kn-header-net-pill{min-width:0;flex:0 1 215px;max-width:215px}' +
      '.kn-header-tool-btn{min-width:84px;min-height:38px;padding:0 12px;border-radius:999px;font-size:12px;font-weight:850;display:inline-flex;align-items:center;justify-content:center;gap:6px}.kn-header-tool-btn:hover{border-color:rgba(120,180,255,.26)}' +
      '#kn-header-actions{gap:8px;align-items:center;justify-content:flex-start;width:auto;max-width:none;padding:4px 5px;border-radius:21px;background:rgba(0,0,0,.16)}' +
      '#' + HEADER_ID + '{width:min(1180px,calc(100% - 40px));grid-template-columns:minmax(220px,280px) auto minmax(0,auto);gap:14px;justify-content:center}' +
      '#kn-header-left{gap:11px}#kn-brand-mark{width:40px;height:40px;flex-basis:40px}#kn-brand-title{font-size:15px}#kn-brand-subtitle{font-size:10.5px}.kn-version-chips{gap:5px}.kn-meta-chip{height:21px;padding:0 7px}' +
      '#kn-header-center{justify-content:flex-start}#kn-main-nav{width:auto;grid-template-columns:repeat(6,minmax(58px,68px));gap:5px;padding:5px;border-radius:17px}.kn-nav-btn{min-height:36px;padding:0 10px;font-size:12px;border-radius:13px}' +
      '#kn-header-net-pill{min-width:158px!important;flex:0 1 190px!important;max-width:190px!important;padding:0 10px!important;justify-content:flex-start}#kn-header-operator{max-width:92px}#kn-header-nettype{max-width:46px}' +
      '.kn-wifi-pill{min-width:102px!important;flex:0 0 102px!important;padding:0 10px!important}.kn-wifi-status-text{max-width:34px}.kn-wifi-count{min-width:22px;height:21px}' +
      '.kn-login-pill{min-width:88px;flex:0 0 auto;padding:0 11px}.kn-login-icon{width:17px;height:17px}.kn-action-btn.primary[data-action="settings"]{min-width:82px;padding:0 12px}' +
      '#kn-header-actions.is-tight{gap:6px}#kn-header-actions.is-tight #kn-header-net-pill{min-width:126px!important;flex:0 1 136px!important;max-width:136px!important}#kn-header-actions.is-tight #kn-header-operator{max-width:78px}#kn-header-actions.is-tight .kn-wifi-pill{min-width:76px!important;flex-basis:76px!important}#kn-header-actions.is-tight .kn-login-pill{min-width:72px}' +
      '#kn-header-actions.is-ultra-tight{gap:5px}#kn-header-actions.is-ultra-tight #kn-header-net-pill{min-width:76px!important;flex:0 0 76px!important;max-width:76px!important;padding:0 9px!important}#kn-header-actions.is-ultra-tight .kn-wifi-pill{min-width:48px!important;width:48px!important;flex-basis:48px!important;padding:0!important;font-size:0!important}#kn-header-actions.is-ultra-tight .kn-wifi-pill .kn-wifi-main{font-size:12px!important}#kn-header-actions.is-ultra-tight .kn-wifi-count{display:none!important}#kn-header-actions.is-ultra-tight .kn-action-btn.primary[data-action="settings"]{min-width:46px!important;width:46px!important;padding:0!important;font-size:0!important}#kn-header-actions.is-ultra-tight .kn-action-btn.primary[data-action="settings"]:after{content:"⚙";font-size:17px!important}' +
      '#kn-header-actions{padding:4px 6px!important;gap:8px!important;background:rgba(0,0,0,.18)!important;border-color:rgba(255,255,255,.06)!important}' +
      '#kn-header-net-pill{min-width:184px!important;flex:0 1 230px!important;max-width:230px!important;height:40px!important;padding:0 11px!important;gap:8px!important;background:linear-gradient(180deg,rgba(255,255,255,.075),rgba(255,255,255,.035))!important;border-color:rgba(255,255,255,.13)!important}' +
      '#kn-header-operator{max-width:96px!important;font-weight:900;color:rgba(255,255,255,.92)}.kn-net-sep{opacity:.42}' +
      '#kn-header-nettype.kn-nettype-badge{display:inline-flex;align-items:center;justify-content:center;min-width:34px;height:22px;padding:0 8px;border-radius:999px;font-size:11px;font-weight:950;letter-spacing:.02em;background:rgba(127,180,255,.13);border:1px solid rgba(127,180,255,.22);color:rgba(218,234,255,.95);box-shadow:inset 0 1px 0 rgba(255,255,255,.08)}' +
      '#kn-header-nettype.net-5g{background:rgba(57,210,121,.16)!important;border-color:rgba(134,239,172,.30)!important;color:rgba(225,255,235,.98)!important;box-shadow:0 0 18px rgba(57,210,121,.16),inset 0 1px 0 rgba(255,255,255,.10)}#kn-header-nettype.net-4g{background:rgba(127,180,255,.16)!important;border-color:rgba(127,180,255,.30)!important;color:rgba(226,238,255,.98)!important}#kn-header-nettype.net-3g,#kn-header-nettype.net-2g{background:rgba(247,201,72,.15)!important;border-color:rgba(247,201,72,.28)!important;color:rgba(255,244,208,.96)!important}' +
      '.kn-wifi-pill{height:40px!important;min-width:132px!important;flex:0 0 132px!important;gap:7px!important;padding:0 11px!important;border-radius:999px!important}' +
      '.kn-wifi-pill.is-on{background:linear-gradient(180deg,rgba(57,210,121,.18),rgba(57,210,121,.085))!important;border-color:rgba(134,239,172,.30)!important;color:rgba(225,255,235,.96)!important}.kn-wifi-pill.is-off{background:linear-gradient(180deg,rgba(255,95,104,.18),rgba(255,95,104,.075))!important;border-color:rgba(255,130,140,.28)!important;color:rgba(255,230,232,.95)!important}.kn-wifi-pill.unknown{background:rgba(255,255,255,.06)!important;border-color:rgba(255,255,255,.11)!important;color:rgba(255,255,255,.72)!important}' +
      '.kn-wifi-icon{width:18px;height:18px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;font-size:15px;font-weight:950;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.10);line-height:1}.kn-wifi-pill.is-on .kn-wifi-icon{color:#39d279;background:rgba(57,210,121,.13);border-color:rgba(134,239,172,.22)}.kn-wifi-pill.is-off .kn-wifi-icon{color:#ff5f68;background:rgba(255,95,104,.13);border-color:rgba(255,130,140,.22)}' +
      '.kn-wifi-status-text{font-size:11px!important;font-weight:900!important;max-width:none!important}.kn-wifi-count{height:22px!important;min-width:24px!important;padding:0 7px!important}' +
      '.kn-login-pill{width:42px!important;min-width:42px!important;height:40px!important;padding:0!important;justify-content:center!important;border-radius:999px!important}.kn-login-text,#kn-header-login-text{display:none!important}.kn-login-icon{position:relative;width:26px!important;height:26px!important;border-radius:999px!important;font-size:15px!important;background:rgba(127,180,255,.13)!important;border-color:rgba(127,180,255,.22)!important}.kn-login-pill.is-login .kn-login-icon{background:rgba(57,210,121,.15)!important;border-color:rgba(134,239,172,.26)!important}.kn-login-pill.is-logout .kn-login-icon{background:rgba(255,255,255,.07)!important;border-color:rgba(255,255,255,.13)!important}.kn-login-pill:after{content:"";position:absolute;right:8px;bottom:8px;width:8px;height:8px;border-radius:50%;background:#ff5f68;box-shadow:0 0 0 2px rgba(17,20,26,.95)}.kn-login-pill.is-login:after{background:#39d279}' +
      '.kn-settings-icon-btn{width:42px!important;min-width:42px!important;height:40px!important;padding:0!important;border-radius:999px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important}.kn-settings-icon{font-size:18px!important;line-height:1;display:inline-flex;align-items:center;justify-content:center}' +
      '@media(max-width:1220px){#' + HEADER_ID + '{width:min(1120px,calc(100% - 32px));grid-template-columns:minmax(210px,260px) auto minmax(0,auto);gap:12px}#kn-main-nav{grid-template-columns:repeat(6,minmax(54px,64px))}.kn-nav-btn{padding:0 8px}#kn-header-actions{gap:6px}#kn-header-net-pill{min-width:134px!important;max-width:152px!important;flex-basis:152px!important}.kn-net-sep{display:none!important}#kn-header-operator{max-width:62px!important}.kn-wifi-status-text{display:none!important}.kn-wifi-pill{min-width:76px!important;flex-basis:76px!important}.kn-login-pill{min-width:42px!important;width:42px!important}.kn-settings-icon-btn{min-width:42px!important;width:42px!important;padding:0!important}}' +
      '.' + HIDDEN_CLASS + '{display:none!important}' +
      '@media(max-width:980px){#' + HEADER_ID + '{grid-template-columns:1fr;width:min(720px,calc(100% - 24px));gap:12px}#kn-header-left{justify-content:center}#kn-header-center{order:2}#kn-header-actions{justify-content:center;order:3;flex-wrap:wrap}#kn-header-net-pill{max-width:100%}#kn-main-nav{width:100%}.kn-group-board,.kn-form-grid,.kn-about-grid{grid-template-columns:1fr}.kn-check-grid{grid-template-columns:1fr}.kn-settings-tabs{grid-template-columns:repeat(2,minmax(0,1fr))}.kn-dialog-header{flex-direction:column}}';
    document.head.appendChild(style);
  }


  function injectResponsiveCSS() {
    var old = document.getElementById(RESPONSIVE_STYLE_ID);
    if (old) old.remove();

    var style = document.createElement('style');
    style.id = RESPONSIVE_STYLE_ID;

    // 26.1.6：响应式只在小屏断点生效。
    // 不再对桌面默认布局写全局 max-width / width / container 覆盖，避免网页端默认宽度被放大或被重新排版。
    style.textContent = '' +
      '@media(max-width:980px){' +
        'html,body{max-width:100%!important;overflow-x:hidden!important}' +
        '.container{box-sizing:border-box;max-width:100%!important}' +
        '.container table,.container iframe,.container pre,.container code{max-width:100%;box-sizing:border-box}' +
        '#kn-header-center{width:100%!important;overflow:hidden!important}' +
        '#kn-main-nav{overflow-x:auto!important;overflow-y:hidden!important;-webkit-overflow-scrolling:touch!important}' +
        '#kn-main-nav::-webkit-scrollbar{height:0!important}' +
        '#kn-header-net-pop{width:min(360px,calc(100vw - 24px))!important;max-height:min(68vh,520px)!important;overflow:auto!important}' +
        '.kn-login-menu,.kn-header-tool-menu{width:min(220px,calc(100vw - 24px))!important;max-height:min(60vh,420px)!important;overflow:auto!important}' +
      '}' +
      '@media(max-width:860px){' +
        '#' + HEADER_ID + '{width:calc(100% - 18px)!important;grid-template-columns:1fr!important;gap:10px!important;top:8px!important;margin:8px auto 14px!important;padding:10px!important;border-radius:20px!important}' +
        '#kn-title-placeholder{width:100%!important;justify-content:flex-start!important;min-width:0!important}' +
        '#kn-header-left{width:100%!important;justify-content:flex-start!important;min-width:0!important}' +
        '#kn-brand-mark{width:38px!important;height:38px!important;flex-basis:38px!important;border-radius:13px!important}' +
        '#kn-brand-title{font-size:15px!important;overflow:hidden!important;text-overflow:ellipsis!important;max-width:calc(100vw - 96px)!important}' +
        '#kn-brand-subtitle{font-size:10px!important;max-width:calc(100vw - 96px)!important;overflow:hidden!important;text-overflow:ellipsis!important}' +
        '.kn-version-chips{gap:5px!important;margin-top:5px!important}.kn-meta-chip{height:20px!important;padding:0 7px!important;font-size:9px!important}' +
        '#kn-header-center{order:2!important;width:100%!important;overflow:hidden!important}' +
        '#kn-main-nav{display:flex!important;grid-template-columns:none!important;width:100%!important;overflow-x:auto!important;overflow-y:hidden!important;scroll-snap-type:x proximity!important;-webkit-overflow-scrolling:touch!important;padding:5px!important;gap:6px!important}' +
        '#kn-main-nav::-webkit-scrollbar{height:0!important}' +
        '.kn-nav-btn{flex:0 0 auto!important;min-width:74px!important;min-height:38px!important;padding:0 12px!important;font-size:12px!important;scroll-snap-align:start!important}' +
        '#kn-header-actions{order:3!important;width:100%!important;display:grid!important;grid-template-columns:minmax(0,1fr) auto auto auto!important;gap:8px!important;align-items:center!important;justify-content:stretch!important}' +
        '#kn-header-net-pill{width:100%!important;max-width:none!important;min-width:0!important;justify-content:flex-start!important;padding:0 11px!important}' +
        '#kn-header-operator{max-width:none!important;min-width:0!important}' +
        '.kn-login-menu-wrap{justify-content:center!important;min-width:0!important}.kn-login-pill{min-width:44px!important;justify-content:center!important}' +
        '#kn-header-actions>.kn-action-btn.primary{min-width:42px!important;width:42px!important;padding:0!important}' +
        '#kn-header-net-pop{left:50%!important;right:auto!important;top:calc(100% + 10px)!important;transform:translateX(-50%)!important;width:min(380px,calc(100vw - 24px))!important;max-height:min(68vh,520px)!important;overflow:auto!important}' +
        '.kn-login-menu,.kn-header-tool-menu{left:auto!important;right:0!important;width:min(220px,calc(100vw - 24px))!important;max-height:min(60vh,420px)!important;overflow:auto!important}' +
        '.kn-dialog-content{width:calc(100vw - 18px)!important;height:min(820px,calc(100dvh - 18px))!important;border-radius:22px!important}' +
        '.kn-dialog-header{padding:20px 18px 16px!important}.kn-dialog-title{font-size:19px!important}.kn-dialog-subtitle{max-width:none!important}' +
        '.kn-dialog-body{padding:18px!important}.kn-dialog-footer{padding:14px 18px 18px!important}' +
        '.kn-footer-left,.kn-footer-right{width:100%!important}.kn-footer-left .kn-panel-btn,.kn-footer-right .kn-panel-btn{flex:1 1 auto!important}' +
        '.kn-settings-tabs{display:flex!important;grid-template-columns:none!important;overflow-x:auto!important;gap:7px!important;padding:6px!important;-webkit-overflow-scrolling:touch!important}.kn-settings-tabs::-webkit-scrollbar{height:0!important}.kn-settings-tab{flex:0 0 auto!important;min-width:94px!important}' +
        '.kn-group-board,.kn-form-grid,.kn-about-grid{grid-template-columns:1fr!important}.kn-check-grid{grid-template-columns:1fr!important}.kn-input-row{grid-template-columns:1fr!important;gap:6px!important}' +
        '.kn-about-hero{align-items:flex-start!important;gap:12px!important;padding:16px!important}.kn-about-logo{width:48px!important;height:48px!important;flex-basis:48px!important;border-radius:16px!important}.kn-about-title{font-size:18px!important}' +
      '}' +
      '@media(max-width:620px){' +
        '#' + HEADER_ID + '{width:calc(100% - 12px)!important;top:6px!important;margin:6px auto 12px!important;padding:8px!important;border-radius:18px!important}' +
        '#kn-brand-mark{width:36px!important;height:36px!important;flex-basis:36px!important;font-size:16px!important}' +
        '#kn-brand-title{font-size:14px!important;max-width:calc(100vw - 86px)!important}' +
        '#kn-brand-subtitle{display:none!important}' +
        '.kn-meta-chip.muted{display:none!important}' +
        '#kn-header-actions{grid-template-columns:minmax(0,1fr) 48px 40px 76px!important;gap:6px!important}' +
        '#kn-header-login-text{display:none!important}.kn-login-pill{height:38px!important;padding:0 10px!important}.kn-header-tool-btn{width:40px!important;min-width:40px!important;height:38px!important;padding:0!important;font-size:0!important}.kn-header-tool-btn:after{content:attr(data-short);font-size:12px!important}' +
        '#kn-header-actions>.kn-action-btn.primary{min-width:42px!important;width:42px!important;padding:0!important;font-size:0!important}' +
        '#kn-header-net-pill{height:38px!important;gap:6px!important}' +
        '#kn-header-net-pill>span:nth-child(3){display:none!important}' +
        '#kn-header-operator{font-size:12px!important}' +
        '.kn-nav-btn{min-width:68px!important;min-height:36px!important;padding:0 10px!important}' +
        '#kn-header-net-pop{width:calc(100vw - 18px)!important;padding:12px!important;border-radius:16px!important}' +
        '.kn-net-pop-grid{grid-template-columns:72px minmax(0,1fr)!important;gap:7px 8px!important}' +
        '.kn-login-menu,.kn-header-tool-menu{right:0!important;width:min(210px,calc(100vw - 18px))!important}.kn-header-tool-menu-wrap{width:48px!important}' +
        '.kn-dialog-content{width:100vw!important;height:100dvh!important;border-radius:0!important;max-width:100vw!important}' +
        '#' + DIALOG_ID + '{max-width:100vw!important}' +
        '.kn-dialog-header{padding:16px 14px 12px!important}.kn-dialog-body{padding:14px!important}.kn-dialog-footer{padding:12px 14px 14px!important}' +
        '.kn-dialog-title{font-size:18px!important}.kn-dialog-subtitle{font-size:11px!important}' +
        '.kn-form-card,.kn-about-card,.kn-group-zone{padding:14px!important;border-radius:18px!important}' +
        '.kn-about-hero{flex-direction:column!important}.kn-about-logo{width:44px!important;height:44px!important;flex-basis:44px!important}' +
        '.kn-about-kv{flex-direction:column!important;gap:4px!important}.kn-about-kv span{text-align:left!important}' +
        '.container{width:100%!important;padding-left:6px!important;padding-right:6px!important}' +
        '.container>div:not(#' + HEADER_ID + '):not(#toastContainer),.container>section,.container>main{max-width:100%!important;overflow-x:auto!important;box-sizing:border-box!important}' +
      '}' +
      '@media(max-width:420px){' +
        '#' + HEADER_ID + '{gap:8px!important;padding:7px!important;border-radius:16px!important}' +
        '.kn-version-chips{display:none!important}' +
        '#kn-header-actions{grid-template-columns:minmax(0,1fr) 44px 40px 58px!important}' +
        '#kn-header-actions>.kn-action-btn.primary{min-width:42px!important;width:42px!important;font-size:0!important;padding:0!important}' +
        '#kn-header-actions>.kn-action-btn.primary:after{content:"⚙";font-size:17px!important}' +
        '.kn-login-pill{min-width:40px!important;padding:0 8px!important}.kn-login-icon{width:17px!important;height:17px!important;font-size:11px!important}.kn-header-tool-btn{width:44px!important;min-width:44px!important}' +
        '#kn-header-net-pill{padding:0 9px!important}.kn-header-network-dot{}#kn-header-signal{width:17px!important}' +
        '.kn-nav-btn{min-width:62px!important;padding:0 9px!important;font-size:12px!important}' +
        '.kn-net-pop-grid{grid-template-columns:66px minmax(0,1fr)!important;font-size:11px!important}.kn-net-pop-title{font-size:12px!important}' +
        '.kn-login-menu-item{font-size:12px!important;min-height:36px!important}' +
        '.kn-settings-tab{min-width:82px!important;min-height:38px!important;font-size:12px!important}' +
        '.kn-panel-btn,.kn-action-btn{min-height:36px!important;font-size:12px!important}' +
      '}' +
      '@supports not (height: 100dvh){@media(max-width:620px){.kn-dialog-content{height:100vh!important}}}';

    document.head.appendChild(style);
  }

  function injectHeaderFinalPolishCSS() {
    if (document.getElementById('kn-header-final-polish-style')) return;
    var style = document.createElement('style');
    style.id = 'kn-header-final-polish-style';
    style.textContent = '' +
      ':root{--kn-h-green:#39d279;--kn-h-blue:#7fb4ff;--kn-h-red:#ff5f68;--kn-h-amber:#f7c948}' +
      '#kn-brand-mark.kn-brand-mood{font-size:23px!important;line-height:1!important;color:#fff!important;background:linear-gradient(180deg,rgba(255,255,255,.10),rgba(255,255,255,.045))!important;border:1px solid rgba(255,255,255,.13)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.10),0 10px 24px rgba(0,0,0,.14)!important;transition:background .18s ease,border-color .18s ease,box-shadow .18s ease,transform .18s ease!important}' +
      '#kn-brand-mark.kn-brand-mood:hover{transform:translateY(-1px)!important}' +
      '#kn-brand-mark.mood-good{background:linear-gradient(180deg,rgba(57,210,121,.24),rgba(57,210,121,.10))!important;border-color:rgba(134,239,172,.36)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 0 22px rgba(57,210,121,.18)!important}' +
      '#kn-brand-mark.mood-ok{background:linear-gradient(180deg,rgba(127,180,255,.22),rgba(78,146,255,.10))!important;border-color:rgba(147,197,253,.34)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 0 22px rgba(78,146,255,.16)!important}' +
      '#kn-brand-mark.mood-weak{background:linear-gradient(180deg,rgba(247,201,72,.22),rgba(247,201,72,.10))!important;border-color:rgba(247,201,72,.34)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 0 22px rgba(247,201,72,.15)!important}' +
      '#kn-brand-mark.mood-bad{background:linear-gradient(180deg,rgba(255,138,76,.22),rgba(255,138,76,.09))!important;border-color:rgba(255,171,115,.32)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 0 22px rgba(255,138,76,.14)!important}' +
      '#kn-brand-mark.mood-offline{background:linear-gradient(180deg,rgba(255,95,104,.20),rgba(255,95,104,.08))!important;border-color:rgba(255,130,140,.32)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 0 22px rgba(255,95,104,.14)!important}' +
      '#kn-brand-mark.mood-unknown{background:linear-gradient(180deg,rgba(127,180,255,.16),rgba(127,180,255,.06))!important;border-color:rgba(127,180,255,.24)!important}' +
      '#' + HEADER_ID + '{width:min(1320px,calc(100% - 40px))!important;grid-template-columns:minmax(245px,300px) minmax(390px,auto) max-content!important;gap:12px!important;padding:10px 14px!important;justify-content:center!important;align-items:center!important}' +
      '#kn-header-center{justify-content:center!important;min-width:0!important}' +
      '#kn-main-nav{width:auto!important;grid-template-columns:repeat(6,minmax(62px,72px))!important;gap:5px!important;padding:5px!important;border-radius:18px!important}' +
      '.kn-nav-btn{min-height:36px!important;padding:0 10px!important;font-size:12px!important;border-radius:13px!important}' +
      '#kn-header-actions{width:max-content!important;max-width:none!important;min-width:0!important;display:flex!important;align-items:center!important;justify-content:flex-end!important;gap:8px!important;padding:4px!important;border-radius:24px!important;background:rgba(0,0,0,.16)!important;border:1px solid rgba(255,255,255,.055)!important;flex:0 0 auto!important}' +
      '#kn-header-net-pill{height:40px!important;min-height:40px!important;min-width:178px!important;max-width:218px!important;flex:0 0 auto!important;padding:0 10px 0 11px!important;gap:8px!important;justify-content:flex-start!important;border-radius:999px!important;background:linear-gradient(180deg,rgba(255,255,255,.08),rgba(255,255,255,.035))!important;border-color:rgba(255,255,255,.13)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.08),0 10px 24px rgba(0,0,0,.12)!important}' +
      '#kn-header-network-dot{width:7px!important;height:7px!important;flex:0 0 7px!important}' +
      '#kn-header-operator{display:inline-block!important;max-width:74px!important;min-width:0!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;font-size:12px!important;font-weight:900!important;color:rgba(255,255,255,.90)!important}' +
      '.kn-net-sep{display:none!important}' +
      '#kn-header-nettype{display:inline-flex!important;align-items:center!important;justify-content:center!important;min-width:42px!important;height:24px!important;padding:0 10px!important;border-radius:999px!important;font-size:11px!important;font-weight:950!important;letter-spacing:.02em!important;border:1px solid rgba(255,255,255,.12)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.08)!important;flex:0 0 auto!important}' +
      '#kn-header-nettype.net-5g{color:#dfffea!important;background:rgba(57,210,121,.18)!important;border-color:rgba(134,239,172,.35)!important}' +
      '#kn-header-nettype.net-4g{color:#e4f0ff!important;background:rgba(79,142,255,.18)!important;border-color:rgba(147,197,253,.35)!important}' +
      '#kn-header-nettype.net-3g{color:#fff4d0!important;background:rgba(247,201,72,.17)!important;border-color:rgba(247,201,72,.32)!important}' +
      '#kn-header-nettype.net-2g,#kn-header-nettype.net-other{color:rgba(255,255,255,.76)!important;background:rgba(255,255,255,.07)!important;border-color:rgba(255,255,255,.13)!important}' +
      '#kn-header-signal{width:20px!important;height:15px!important;margin-left:auto!important;flex:0 0 20px!important}' +
      '#kn-header-signal i{width:3px!important;background:rgba(255,255,255,.20)!important}' +
      '#kn-header-signal[data-level="1"] i:nth-child(-n+1),#kn-header-signal[data-level="2"] i:nth-child(-n+2),#kn-header-signal[data-level="3"] i:nth-child(-n+3),#kn-header-signal[data-level="4"] i:nth-child(-n+4),#kn-header-signal[data-level="5"] i:nth-child(-n+4){background:var(--kn-h-green)!important;box-shadow:0 0 10px rgba(57,210,121,.42)!important}' +
      '.kn-wifi-pill{height:40px!important;min-height:40px!important;min-width:158px!important;flex:0 0 158px!important;max-width:168px!important;padding:0 11px!important;gap:8px!important;border-radius:999px!important;background:rgba(255,255,255,.06)!important;border:1px solid rgba(255,255,255,.12)!important;color:rgba(255,255,255,.82)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.08),0 10px 24px rgba(0,0,0,.10)!important;overflow:visible!important;justify-content:center!important}' +
      '.kn-wifi-pill.is-on{background:linear-gradient(180deg,rgba(57,210,121,.18),rgba(57,210,121,.08))!important;border-color:rgba(134,239,172,.30)!important;color:rgba(231,255,238,.96)!important}' +
      '.kn-wifi-pill.is-off,.kn-wifi-pill.offline{background:linear-gradient(180deg,rgba(255,95,104,.17),rgba(255,95,104,.07))!important;border-color:rgba(255,130,140,.30)!important;color:rgba(255,232,234,.96)!important}' +
      '.kn-wifi-pill.unknown{background:rgba(255,255,255,.055)!important;border-color:rgba(255,255,255,.12)!important;color:rgba(255,255,255,.72)!important}' +
      '.kn-wifi-icon{width:18px!important;height:18px!important;border-radius:8px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;font-size:0!important;flex:0 0 18px!important;background:rgba(255,255,255,.07)!important;border:1px solid rgba(255,255,255,.10)!important}' +
      '.kn-wifi-icon:before{content:"◌";font-size:13px!important;line-height:1!important;color:currentColor!important}' +
      '.kn-wifi-main{display:inline-flex!important;flex:0 0 auto!important;font-size:12px!important;font-weight:950!important;letter-spacing:.01em!important;white-space:nowrap!important}' +
      '.kn-wifi-status-text{display:inline-flex!important;flex:0 0 auto!important;font-size:11px!important;font-weight:900!important;max-width:none!important;min-width:34px!important;color:currentColor!important;opacity:.92!important;white-space:nowrap!important;overflow:visible!important;text-overflow:clip!important}' +
      '.kn-wifi-count{flex:0 0 auto!important;min-width:24px!important;height:23px!important;padding:0 7px!important;border-radius:999px!important;font-size:11px!important;font-weight:950!important;background:rgba(255,255,255,.12)!important;border:1px solid rgba(255,255,255,.14)!important;color:currentColor!important}' +
      '.kn-login-pill{position:relative!important;width:42px!important;min-width:42px!important;height:40px!important;min-height:40px!important;padding:0!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;border-radius:999px!important;background:rgba(255,255,255,.06)!important;border:1px solid rgba(255,255,255,.13)!important;color:rgba(255,255,255,.82)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.08),0 10px 24px rgba(0,0,0,.10)!important}' +
      '.kn-login-pill.is-login{background:rgba(57,210,121,.13)!important;border-color:rgba(134,239,172,.30)!important;color:rgba(231,255,238,.96)!important}' +
      '.kn-login-pill.is-logout{background:rgba(255,255,255,.055)!important;border-color:rgba(255,255,255,.13)!important;color:rgba(255,255,255,.70)!important}' +
      '.kn-login-icon{font-size:0!important;position:relative!important;width:22px!important;height:22px!important;border-radius:50%!important;background:rgba(255,255,255,.08)!important;border:1px solid rgba(255,255,255,.12)!important}' +
      '.kn-login-icon:before{content:"";position:absolute;left:50%;top:5px;width:6px;height:6px;border-radius:50%;background:currentColor;transform:translateX(-50%);opacity:.92}' +
      '.kn-login-icon:after{content:"";position:absolute;left:50%;bottom:4px;width:12px;height:7px;border-radius:8px 8px 5px 5px;background:currentColor;transform:translateX(-50%);opacity:.78}' +
      '.kn-login-pill:after{content:"";position:absolute;right:4px;bottom:4px;width:8px;height:8px;border-radius:50%;background:var(--kn-h-red);box-shadow:0 0 0 2px rgba(15,20,28,.95),0 0 10px rgba(255,95,104,.38)}' +
      '.kn-login-pill.is-login:after{background:var(--kn-h-green)!important;box-shadow:0 0 0 2px rgba(15,20,28,.95),0 0 10px rgba(57,210,121,.45)!important}' +
      '#kn-header-login-text,.kn-login-text{display:none!important}' +
      '.kn-settings-icon-btn{width:42px!important;min-width:42px!important;height:40px!important;min-height:40px!important;padding:0!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;border-radius:999px!important;font-size:0!important;background:linear-gradient(180deg,rgba(78,146,255,.24),rgba(78,146,255,.12))!important;border-color:rgba(120,180,255,.30)!important}' +
      '.kn-settings-icon{font-size:18px!important;line-height:1!important}' +
      '#kn-header-actions.is-tight .kn-net-sep{display:none!important}#kn-header-actions.is-tight #kn-header-nettype{display:inline-flex!important}#kn-header-actions.is-tight #kn-header-operator{display:inline-block!important;max-width:58px!important}#kn-header-actions.is-tight #kn-header-net-pill{min-width:150px!important;max-width:170px!important;padding:0 9px!important}.kn-header-tool-btn:after{content:none!important}' +
      '#kn-header-actions.is-tight .kn-wifi-pill{min-width:92px!important;flex-basis:92px!important}.kn-header-actions.is-tight .kn-wifi-status-text{}#kn-header-actions.is-tight .kn-wifi-status-text{display:none!important}' +
      '#kn-header-actions.is-ultra-tight #kn-header-operator{display:none!important}#kn-header-actions.is-ultra-tight #kn-header-net-pill{min-width:96px!important;max-width:96px!important;flex-basis:96px!important;justify-content:center!important}#kn-header-actions.is-ultra-tight .kn-wifi-pill{min-width:54px!important;width:54px!important;flex-basis:54px!important}.kn-header-actions.is-ultra-tight .kn-wifi-main,#kn-header-actions.is-ultra-tight .kn-wifi-status-text{display:none!important}' +
      '@media(max-width:1180px){#' + HEADER_ID + '{grid-template-columns:minmax(220px,260px) minmax(350px,auto) max-content!important;width:min(1160px,calc(100% - 28px))!important}#kn-main-nav{grid-template-columns:repeat(6,minmax(56px,64px))!important}.kn-nav-btn{padding:0 8px!important}.kn-wifi-pill{min-width:122px!important;flex-basis:122px!important;max-width:126px!important}.kn-wifi-status-text{display:none!important}}' +
      '@media(max-width:980px){#' + HEADER_ID + '{grid-template-columns:1fr!important;width:calc(100% - 18px)!important}#kn-header-actions{width:100%!important;max-width:none!important;display:grid!important;grid-template-columns:minmax(0,1fr) 92px 42px 42px!important;justify-content:stretch!important}#kn-header-net-pill{width:100%!important;max-width:none!important;min-width:0!important}.kn-wifi-pill{width:92px!important;min-width:92px!important;flex-basis:92px!important}.kn-wifi-status-text{display:none!important}}' +
      '@media(max-width:520px){#kn-header-actions{grid-template-columns:minmax(0,1fr) 54px 40px 40px!important;gap:6px!important}.kn-wifi-pill{width:54px!important;min-width:54px!important;flex-basis:54px!important;padding:0!important}.kn-wifi-main,.kn-wifi-status-text{display:none!important}#kn-header-nettype{min-width:38px!important;padding:0 8px!important}#kn-header-operator{max-width:62px!important}.kn-settings-icon-btn,.kn-login-pill{width:40px!important;min-width:40px!important}}' +
      '.kn-login-icon{background:transparent!important;border:0!important;box-shadow:none!important}.kn-login-pill .kn-login-icon{background:transparent!important;border:0!important;box-shadow:none!important}' +
      '#kn-header-actions:not(.is-ultra-tight) #kn-header-wifi-btn.kn-wifi-pill{min-width:158px!important;flex:0 0 158px!important;max-width:168px!important;overflow:visible!important}' +
      '#kn-header-actions:not(.is-ultra-tight) #kn-header-wifi-btn .kn-wifi-status-text{display:inline-flex!important;max-width:none!important;overflow:visible!important;text-overflow:clip!important;white-space:nowrap!important}' +
      '@media(max-width:1180px){#kn-header-actions:not(.is-ultra-tight) #kn-header-wifi-btn.kn-wifi-pill{min-width:122px!important;flex-basis:122px!important;max-width:126px!important}#kn-header-actions:not(.is-ultra-tight) #kn-header-wifi-btn .kn-wifi-status-text{display:none!important}}';
    document.head.appendChild(style);
  }


  function injectHeaderMobileLayoutFinalCSS() {
    var old = document.getElementById('kn-header-mobile-layout-final-style');
    if (old) old.remove();

    var style = document.createElement('style');
    style.id = 'kn-header-mobile-layout-final-style';
    style.textContent = '' +
      '/* 26.3.4: mobile header hard fix */' +
      '@media(max-width:980px){' +
        '#' + HEADER_ID + '{grid-template-columns:1fr!important;width:calc(100% - 18px)!important;max-width:760px!important;gap:10px!important;padding:10px!important;overflow:visible!important}' +
        '#kn-title-placeholder,#kn-header-left,#kn-header-center,#kn-header-actions{min-width:0!important}' +
        '#kn-header-actions{width:100%!important;max-width:none!important;display:grid!important;grid-template-columns:minmax(210px,1fr) minmax(96px,116px) 42px 42px!important;gap:8px!important;align-items:center!important;justify-content:stretch!important;padding:4px!important;overflow:visible!important}' +
        '#kn-header-net-pill{width:100%!important;min-width:0!important;max-width:none!important;flex:0 1 auto!important;box-sizing:border-box!important;gap:7px!important;overflow:visible!important}' +
        '#kn-header-actions.is-tight #kn-header-net-pill,#kn-header-actions.is-ultra-tight #kn-header-net-pill{width:100%!important;min-width:0!important;max-width:none!important;flex:0 1 auto!important;justify-content:flex-start!important;padding:0 10px!important}' +
        '#kn-header-operator,#kn-header-actions.is-tight #kn-header-operator,#kn-header-actions.is-ultra-tight #kn-header-operator{display:inline-block!important;max-width:92px!important;min-width:0!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important}' +
        '#kn-header-nettype,#kn-header-actions.is-tight #kn-header-nettype,#kn-header-actions.is-ultra-tight #kn-header-nettype{display:inline-flex!important;min-width:42px!important;flex:0 0 auto!important}' +
        '.kn-net-sep{display:none!important}' +
        '#kn-header-signal{display:inline-flex!important;margin-left:auto!important;flex:0 0 20px!important}' +
        '#kn-header-wifi-wrap{width:100%!important;min-width:0!important;display:flex!important;position:relative!important;justify-content:stretch!important}' +
        '#kn-header-wifi-btn.kn-wifi-pill,#kn-header-actions:not(.is-ultra-tight) #kn-header-wifi-btn.kn-wifi-pill,#kn-header-actions.is-tight #kn-header-wifi-btn.kn-wifi-pill,#kn-header-actions.is-ultra-tight #kn-header-wifi-btn.kn-wifi-pill{width:100%!important;min-width:0!important;max-width:none!important;flex:0 1 auto!important;padding:0 9px!important;gap:6px!important;box-sizing:border-box!important;justify-content:center!important;overflow:visible!important}' +
        '#kn-header-wifi-btn .kn-wifi-main,#kn-header-actions.is-ultra-tight #kn-header-wifi-btn .kn-wifi-main{display:inline-flex!important;font-size:12px!important}' +
        '#kn-header-wifi-btn .kn-wifi-status-text{display:none!important}' +
        '#kn-header-wifi-btn .kn-wifi-count{display:inline-flex!important;min-width:24px!important}' +
        '.kn-login-pill,.kn-settings-icon-btn{width:42px!important;min-width:42px!important;max-width:42px!important;height:40px!important;padding:0!important;display:inline-flex!important;align-items:center!important;justify-content:center!important}' +
        '.kn-settings-icon-btn:after{content:none!important;display:none!important}' +
        '.kn-settings-icon{display:inline-flex!important;font-size:18px!important}' +
        '#kn-header-net-pop{position:fixed!important;left:10px!important;right:10px!important;top:158px!important;transform:none!important;width:auto!important;max-width:none!important;max-height:calc(100dvh - 176px)!important;overflow:auto!important;box-sizing:border-box!important;z-index:1000000!important}' +
        '.kn-login-menu,.kn-header-tool-menu{position:fixed!important;right:10px!important;left:auto!important;top:158px!important;width:min(220px,calc(100vw - 20px))!important;max-height:calc(100dvh - 176px)!important;overflow:auto!important;z-index:1000000!important}' +
      '}' +
      '@media(max-width:620px){' +
        '#' + HEADER_ID + '{width:calc(100% - 12px)!important;gap:9px!important;padding:8px!important;border-radius:18px!important}' +
        '#kn-header-actions{grid-template-columns:minmax(170px,1fr) 82px 40px 40px!important;gap:6px!important}' +
        '#kn-header-operator,#kn-header-actions.is-tight #kn-header-operator,#kn-header-actions.is-ultra-tight #kn-header-operator{max-width:76px!important;font-size:12px!important}' +
        '#kn-header-nettype{min-width:38px!important;height:22px!important;padding:0 8px!important;font-size:10px!important}' +
        '#kn-header-signal{width:18px!important;flex-basis:18px!important}' +
        '#kn-header-wifi-btn .kn-wifi-main{display:inline-flex!important;font-size:11px!important}' +
        '#kn-header-wifi-btn .kn-wifi-icon{display:none!important}' +
        '.kn-login-pill,.kn-settings-icon-btn{width:40px!important;min-width:40px!important;max-width:40px!important;height:38px!important}' +
        '#kn-header-net-pop,.kn-login-menu,.kn-header-tool-menu{top:150px!important;max-height:calc(100dvh - 166px)!important}' +
      '}' +
      '@media(max-width:440px){' +
        '#kn-header-actions{grid-template-columns:minmax(146px,1fr) 68px 38px 38px!important;gap:5px!important}' +
        '#kn-header-net-pill{padding:0 8px!important;gap:5px!important}' +
        '#kn-header-network-dot{width:6px!important;height:6px!important;flex-basis:6px!important}' +
        '#kn-header-operator,#kn-header-actions.is-tight #kn-header-operator,#kn-header-actions.is-ultra-tight #kn-header-operator{max-width:62px!important;font-size:11px!important}' +
        '#kn-header-nettype{min-width:34px!important;height:21px!important;padding:0 7px!important;font-size:10px!important}' +
        '#kn-header-signal{width:16px!important;flex-basis:16px!important;gap:1px!important}' +
        '#kn-header-signal i{width:3px!important}' +
        '#kn-header-wifi-btn.kn-wifi-pill{padding:0 6px!important}' +
        '#kn-header-wifi-btn .kn-wifi-main{display:inline-flex!important;font-size:10px!important}' +
        '#kn-header-wifi-btn .kn-wifi-count{min-width:22px!important;height:21px!important;padding:0 6px!important;font-size:10px!important}' +
        '.kn-login-pill,.kn-settings-icon-btn{width:38px!important;min-width:38px!important;max-width:38px!important;height:36px!important}' +
        '#kn-header-net-pop{left:8px!important;right:8px!important;top:146px!important;width:auto!important;max-height:calc(100dvh - 160px)!important;padding:12px!important;border-radius:16px!important}' +
        '.kn-login-menu,.kn-header-tool-menu{right:8px!important;top:146px!important;width:min(210px,calc(100vw - 16px))!important;max-height:calc(100dvh - 160px)!important}' +
        '.kn-net-pop-grid{grid-template-columns:70px minmax(0,1fr)!important;gap:7px 8px!important}' +
      '}' +
      '@media(max-width:370px){' +
        '#kn-header-actions{grid-template-columns:minmax(128px,1fr) 58px 36px 36px!important}' +
        '#kn-header-operator,#kn-header-actions.is-tight #kn-header-operator,#kn-header-actions.is-ultra-tight #kn-header-operator{max-width:48px!important}' +
        '#kn-header-nettype{min-width:31px!important;padding:0 5px!important}' +
        '#kn-header-wifi-btn .kn-wifi-main{display:none!important}' +
      '}';
    document.head.appendChild(style);
  }


  function injectHeaderMobileNetworkCapsuleFixCSS() {
    var old = document.getElementById('kn-header-mobile-network-capsule-fix-style');
    if (old) old.remove();

    var style = document.createElement('style');
    style.id = 'kn-header-mobile-network-capsule-fix-style';
    style.textContent = '' +
      '/* 26.3.5: keep carrier capsule content-sized on mobile; do not stretch it across the row */' +
      '@media(max-width:980px){' +
        '#kn-header-actions{' +
          'display:grid!important;' +
          'grid-template-columns:max-content max-content 42px 42px!important;' +
          'justify-content:space-between!important;' +
          'align-items:center!important;' +
          'column-gap:8px!important;' +
          'width:100%!important;' +
          'max-width:none!important;' +
          'overflow:visible!important;' +
        '}' +
        '#kn-header-net-pill,' +
        '#kn-header-actions.is-tight #kn-header-net-pill,' +
        '#kn-header-actions.is-ultra-tight #kn-header-net-pill{' +
          'width:auto!important;' +
          'min-width:0!important;' +
          'max-width:min(260px,calc(100vw - 202px))!important;' +
          'flex:0 0 auto!important;' +
          'justify-self:start!important;' +
          'justify-content:flex-start!important;' +
          'padding:0 11px!important;' +
          'gap:7px!important;' +
          'overflow:hidden!important;' +
        '}' +
        '#kn-header-operator,' +
        '#kn-header-actions.is-tight #kn-header-operator,' +
        '#kn-header-actions.is-ultra-tight #kn-header-operator{' +
          'display:inline-block!important;' +
          'max-width:96px!important;' +
          'min-width:0!important;' +
          'overflow:hidden!important;' +
          'text-overflow:ellipsis!important;' +
          'white-space:nowrap!important;' +
        '}' +
        '#kn-header-nettype,' +
        '#kn-header-actions.is-tight #kn-header-nettype,' +
        '#kn-header-actions.is-ultra-tight #kn-header-nettype{' +
          'display:inline-flex!important;' +
          'flex:0 0 auto!important;' +
          'min-width:42px!important;' +
        '}' +
        '#kn-header-signal{' +
          'display:inline-flex!important;' +
          'margin-left:4px!important;' +
          'flex:0 0 20px!important;' +
          'width:20px!important;' +
        '}' +
        '#kn-header-wifi-wrap{' +
          'width:auto!important;' +
          'min-width:0!important;' +
          'justify-self:center!important;' +
        '}' +
        '#kn-header-wifi-btn.kn-wifi-pill,' +
        '#kn-header-actions:not(.is-ultra-tight) #kn-header-wifi-btn.kn-wifi-pill,' +
        '#kn-header-actions.is-tight #kn-header-wifi-btn.kn-wifi-pill,' +
        '#kn-header-actions.is-ultra-tight #kn-header-wifi-btn.kn-wifi-pill{' +
          'width:116px!important;' +
          'min-width:116px!important;' +
          'max-width:116px!important;' +
          'flex:0 0 116px!important;' +
          'padding:0 10px!important;' +
          'gap:6px!important;' +
        '}' +
        '#kn-header-wifi-btn .kn-wifi-main{display:inline-flex!important;font-size:12px!important}' +
        '#kn-header-wifi-btn .kn-wifi-status-text{display:none!important}' +
        '#kn-header-wifi-btn .kn-wifi-count{display:inline-flex!important}' +
        '#kn-header-net-pill.open #kn-header-net-pop{display:block!important;position:fixed!important;left:12px!important;right:12px!important;top:calc(var(--kn-mobile-header-top, 8px) + 174px)!important;width:auto!important;max-width:none!important;max-height:calc(100dvh - 196px)!important;overflow:auto!important;z-index:1000000!important}' +
      '}' +
      '@media(max-width:620px){' +
        '#kn-header-actions{' +
          'grid-template-columns:max-content 76px 40px 40px!important;' +
          'column-gap:6px!important;' +
        '}' +
        '#kn-header-net-pill,' +
        '#kn-header-actions.is-tight #kn-header-net-pill,' +
        '#kn-header-actions.is-ultra-tight #kn-header-net-pill{' +
          'max-width:min(214px,calc(100vw - 184px))!important;' +
          'padding:0 9px!important;' +
          'gap:6px!important;' +
        '}' +
        '#kn-header-operator,' +
        '#kn-header-actions.is-tight #kn-header-operator,' +
        '#kn-header-actions.is-ultra-tight #kn-header-operator{' +
          'max-width:78px!important;' +
          'font-size:12px!important;' +
        '}' +
        '#kn-header-nettype{' +
          'min-width:38px!important;' +
          'height:22px!important;' +
          'padding:0 8px!important;' +
          'font-size:10px!important;' +
        '}' +
        '#kn-header-signal{' +
          'width:18px!important;' +
          'flex-basis:18px!important;' +
          'margin-left:3px!important;' +
        '}' +
        '#kn-header-wifi-btn.kn-wifi-pill,' +
        '#kn-header-actions:not(.is-ultra-tight) #kn-header-wifi-btn.kn-wifi-pill,' +
        '#kn-header-actions.is-tight #kn-header-wifi-btn.kn-wifi-pill,' +
        '#kn-header-actions.is-ultra-tight #kn-header-wifi-btn.kn-wifi-pill{' +
          'width:76px!important;' +
          'min-width:76px!important;' +
          'max-width:76px!important;' +
          'flex-basis:76px!important;' +
          'padding:0 7px!important;' +
        '}' +
        '#kn-header-wifi-btn .kn-wifi-icon{display:none!important}' +
        '#kn-header-wifi-btn .kn-wifi-main{display:inline-flex!important;font-size:11px!important}' +
      '}' +
      '@media(max-width:440px){' +
        '#kn-header-actions{' +
          'grid-template-columns:max-content 62px 38px 38px!important;' +
          'column-gap:5px!important;' +
        '}' +
        '#kn-header-net-pill,' +
        '#kn-header-actions.is-tight #kn-header-net-pill,' +
        '#kn-header-actions.is-ultra-tight #kn-header-net-pill{' +
          'max-width:min(176px,calc(100vw - 168px))!important;' +
          'padding:0 8px!important;' +
          'gap:5px!important;' +
        '}' +
        '#kn-header-operator,' +
        '#kn-header-actions.is-tight #kn-header-operator,' +
        '#kn-header-actions.is-ultra-tight #kn-header-operator{' +
          'max-width:62px!important;' +
          'font-size:11px!important;' +
        '}' +
        '#kn-header-nettype{' +
          'min-width:34px!important;' +
          'height:21px!important;' +
          'padding:0 7px!important;' +
          'font-size:10px!important;' +
        '}' +
        '#kn-header-signal{' +
          'width:16px!important;' +
          'flex-basis:16px!important;' +
          'gap:1px!important;' +
          'margin-left:2px!important;' +
        '}' +
        '#kn-header-wifi-btn.kn-wifi-pill,' +
        '#kn-header-actions:not(.is-ultra-tight) #kn-header-wifi-btn.kn-wifi-pill,' +
        '#kn-header-actions.is-tight #kn-header-wifi-btn.kn-wifi-pill,' +
        '#kn-header-actions.is-ultra-tight #kn-header-wifi-btn.kn-wifi-pill{' +
          'width:62px!important;' +
          'min-width:62px!important;' +
          'max-width:62px!important;' +
          'flex-basis:62px!important;' +
          'padding:0 6px!important;' +
        '}' +
        '#kn-header-wifi-btn .kn-wifi-main{display:none!important}' +
        '#kn-header-wifi-btn .kn-wifi-count{min-width:22px!important;height:21px!important;padding:0 6px!important;font-size:10px!important}' +
      '}' +
      '@media(max-width:370px){' +
        '#kn-header-actions{' +
          'grid-template-columns:max-content 52px 36px 36px!important;' +
        '}' +
        '#kn-header-net-pill,' +
        '#kn-header-actions.is-tight #kn-header-net-pill,' +
        '#kn-header-actions.is-ultra-tight #kn-header-net-pill{' +
          'max-width:min(148px,calc(100vw - 154px))!important;' +
          'padding:0 7px!important;' +
        '}' +
        '#kn-header-operator,' +
        '#kn-header-actions.is-tight #kn-header-operator,' +
        '#kn-header-actions.is-ultra-tight #kn-header-operator{' +
          'max-width:46px!important;' +
        '}' +
        '#kn-header-nettype{min-width:30px!important;padding:0 5px!important}' +
        '#kn-header-signal{display:none!important}' +
        '#kn-header-wifi-btn.kn-wifi-pill,' +
        '#kn-header-actions:not(.is-ultra-tight) #kn-header-wifi-btn.kn-wifi-pill,' +
        '#kn-header-actions.is-tight #kn-header-wifi-btn.kn-wifi-pill,' +
        '#kn-header-actions.is-ultra-tight #kn-header-wifi-btn.kn-wifi-pill{' +
          'width:52px!important;' +
          'min-width:52px!important;' +
          'max-width:52px!important;' +
          'flex-basis:52px!important;' +
        '}' +
      '}';

    document.head.appendChild(style);
  }


  function injectHeaderNetworkPopoverPortalCSS() {
    var old = document.getElementById('kn-header-network-popover-portal-style');
    if (old) old.remove();
    var style = document.createElement('style');
    style.id = 'kn-header-network-popover-portal-style';
    style.textContent = '' +
      '#kn-header-net-pill.open{overflow:visible!important}' +
      '#kn-header-net-pop.kn-net-pop-open{display:block!important}' +
      '@media(max-width:980px){' +
        '#kn-header-net-pop.kn-net-pop-mobile-portal{' +
          'position:fixed!important;' +
          'left:10px!important;' +
          'right:10px!important;' +
          'width:auto!important;' +
          'max-width:none!important;' +
          'box-sizing:border-box!important;' +
          'display:block!important;' +
          'z-index:1000000!important;' +
          'transform:none!important;' +
          'overscroll-behavior:contain!important;' +
          '-webkit-overflow-scrolling:touch!important;' +
        '}' +
        '#kn-header-net-pop.kn-net-pop-mobile-portal .kn-net-pop-grid span{' +
          'white-space:normal!important;' +
          'word-break:break-all!important;' +
          'overflow:visible!important;' +
          'text-overflow:clip!important;' +
        '}' +
      '}';
    document.head.appendChild(style);
  }

  function getBackgroundValue(a) {
    var preset = BACKGROUND_PRESETS[a.backgroundPreset] || BACKGROUND_PRESETS.none;
    if (a.backgroundMode === 'custom') return String(a.backgroundImage || '').trim();
    return preset.url || '';
  }

  function injectAppearanceCSS() {
    var old = document.getElementById(THEME_STYLE_ID);
    if (old) old.remove();

    var a = state.config && state.config.appearance ? state.config.appearance : clone(DEFAULT_APPEARANCE);
    var light = getTheme() === 'light';
    var style = document.createElement('style');
    style.id = THEME_STYLE_ID;

    document.documentElement.classList.remove('kn-theme-dark', 'kn-theme-light');
    document.documentElement.classList.add(light ? 'kn-theme-light' : 'kn-theme-dark');

    var bgValue = getBackgroundValue(a);
    var bg = '';
    if (a.enableBackground && bgValue) {
      var overlayAlpha = light ? Math.min(a.backgroundDim, 32) / 100 : a.backgroundDim / 100;
      var overlayColor = light ? 'rgba(246,249,252,' + overlayAlpha.toFixed(2) + ')' : 'rgba(0,0,0,' + overlayAlpha.toFixed(2) + ')';
      if (String(bgValue).indexOf('css:blue') === 0) {
        bg = 'body::before{content:"";position:fixed;inset:0;z-index:-2;background:radial-gradient(circle at 20% 10%,rgba(72,150,255,.42),transparent 35%),radial-gradient(circle at 80% 20%,rgba(80,220,255,.26),transparent 30%),linear-gradient(135deg,#121a2b,#1e293b 55%,#111827);filter:blur(' + a.backgroundBlur + 'px) saturate(' + a.backgroundSaturate + '%);transform:scale(' + (a.backgroundBlur > 0 ? '1.04' : '1') + ')}body::after{content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;background:' + overlayColor + '}';
      } else if (String(bgValue).indexOf('css:dark') === 0) {
        bg = 'body::before{content:"";position:fixed;inset:0;z-index:-2;background:radial-gradient(circle at 20% 20%,rgba(110,80,255,.28),transparent 32%),radial-gradient(circle at 78% 18%,rgba(0,200,255,.18),transparent 30%),linear-gradient(135deg,#050816,#111827 55%,#020617);filter:blur(' + a.backgroundBlur + 'px) saturate(' + a.backgroundSaturate + '%);transform:scale(' + (a.backgroundBlur > 0 ? '1.04' : '1') + ')}body::after{content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;background:' + overlayColor + '}';
      } else {
        bg = 'body::before{content:"";position:fixed;inset:0;z-index:-2;background-image:url("' + String(bgValue).replace(/"/g, '%22') + '");background-size:cover;background-position:center;background-repeat:no-repeat;filter:blur(' + a.backgroundBlur + 'px) saturate(' + a.backgroundSaturate + '%);transform:scale(' + (a.backgroundBlur > 0 ? '1.04' : '1') + ')}body::after{content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;background:' + overlayColor + '}';
      }
    } else {
      bg = 'body::before,body::after{content:none!important;}';
    }

    var lightCss =
      'body{background:#eef3f8!important;color:#172033!important;}' +
      '#BG_OVERLAY,.bg,.container{background:transparent!important;}' +
      '.title,.content,.box,.collapse_box,.kpi,.card{color:#172033!important;text-shadow:none!important;}' +
      '.box,.card,.kpi,.collapse_box{background:rgba(255,255,255,.58)!important;border-color:rgba(255,255,255,.48)!important;box-shadow:0 10px 28px rgba(34,50,80,.10)!important;}' +
      'button,.btn,.select,select{color:#172033!important;background:rgba(255,255,255,.56)!important;border-color:rgba(34,50,80,.10)!important;box-shadow:none!important;}' +
      '#' + HEADER_ID + '{color:#172033!important;border-color:rgba(255,255,255,.62)!important;box-shadow:0 18px 45px rgba(34,50,80,.14),inset 0 1px 0 rgba(255,255,255,.58)!important;}' +
      '#kn-brand-title{color:#172033!important}#kn-brand-subtitle{color:rgba(23,32,51,.52)!important}#kn-brand-mark{color:#1f5fbf!important;background:rgba(60,130,255,.12)!important;border-color:rgba(60,130,255,.18)!important}' +
      '.kn-meta-chip{color:rgba(23,32,51,.76)!important;background:rgba(255,255,255,.54)!important;border-color:rgba(34,50,80,.10)!important}.kn-meta-chip.primary{color:#1f5fbf!important;background:rgba(60,130,255,.12)!important;border-color:rgba(60,130,255,.20)!important}.kn-meta-chip.muted{color:rgba(23,32,51,.48)!important}' +
      '#kn-main-nav{background:rgba(255,255,255,.42)!important;border-color:rgba(255,255,255,.48)!important}.kn-nav-btn{color:rgba(23,32,51,.62)!important;background:transparent!important}.kn-nav-btn:hover{color:#172033!important;background:rgba(255,255,255,.55)!important}.kn-nav-btn.active{color:#172033!important;background:linear-gradient(180deg,rgba(255,255,255,.78),rgba(255,255,255,.54))!important;border-color:rgba(60,130,255,.18)!important;box-shadow:0 8px 18px rgba(34,50,80,.10),inset 0 1px 0 rgba(255,255,255,.60)!important}.kn-action-btn.primary,.kn-panel-btn.primary{color:#172033!important;background:rgba(255,255,255,.62)!important;border-color:rgba(60,130,255,.22)!important}#kn-header-net-pill,.kn-login-pill{color:rgba(23,32,51,.82)!important;background:rgba(255,255,255,.52)!important;border-color:rgba(34,50,80,.10)!important}#kn-header-net-pop{background:linear-gradient(180deg,rgba(255,255,255,.96),rgba(246,249,252,.94))!important;border-color:rgba(34,50,80,.10)!important;box-shadow:0 24px 60px rgba(34,50,80,.20)!important}.kn-net-pop-title{color:#172033!important;border-bottom-color:rgba(34,50,80,.08)!important}.kn-net-pop-grid b{color:rgba(23,32,51,.46)!important}.kn-net-pop-grid span{color:rgba(23,32,51,.82)!important}.kn-login-pill.is-login{background:rgba(34,197,94,.12)!important;border-color:rgba(34,197,94,.22)!important;color:#17663a!important}.kn-login-menu{background:linear-gradient(180deg,rgba(255,255,255,.98),rgba(246,249,252,.96))!important;border-color:rgba(34,50,80,.10)!important;box-shadow:0 24px 60px rgba(34,50,80,.20)!important}.kn-login-menu-item{color:rgba(23,32,51,.82)!important}.kn-login-menu-item:hover{background:rgba(34,50,80,.06)!important;color:#172033!important}.kn-login-menu-sep{background:rgba(34,50,80,.08)!important}' +
      '#' + DIALOG_ID + ' .kn-dialog-content{background:linear-gradient(180deg,rgba(255,255,255,.90),rgba(245,248,252,.88))!important;color:#172033!important;border-color:rgba(255,255,255,.62)!important}.kn-dialog-title,.kn-zone-name,.kn-form-title,.kn-about-title,.kn-about-card-title,.kn-plugin-title,.kn-plugin-card-title{color:#172033!important}.kn-dialog-subtitle,.kn-zone-desc,.kn-note,.kn-input-row label,.kn-about-desc,.kn-about-small,.kn-about-list,.kn-plugin-desc,.kn-plugin-small{color:rgba(23,32,51,.58)!important}.kn-group-zone,.kn-form-card,.kn-about-card,.kn-about-hero,.kn-plugin-card,.kn-plugin-hero{background:rgba(255,255,255,.34)!important;border-color:rgba(34,50,80,.08)!important}.kn-settings-tabs{background:rgba(34,50,80,.06)!important;border-color:rgba(34,50,80,.08)!important}.kn-settings-tab{color:rgba(23,32,51,.58)!important}.kn-settings-tab.active{color:#172033!important;background:rgba(60,130,255,.13)!important}.kn-item{color:#172033!important;background:rgba(255,255,255,.52)!important;border-color:rgba(34,50,80,.10)!important}.kn-item.panel{background:rgba(60,130,255,.10)!important;border-color:rgba(60,130,255,.18)!important}.kn-badge{color:rgba(23,32,51,.52)!important;background:rgba(34,50,80,.05)!important;border-color:rgba(34,50,80,.10)!important}.kn-about-logo{color:#1f5fbf!important;background:rgba(60,130,255,.12)!important;border-color:rgba(60,130,255,.18)!important}.kn-about-link-box{background:rgba(60,130,255,.08)!important;border-color:rgba(60,130,255,.14)!important}.kn-about-link-box a{color:#1f5fbf!important}.kn-about-kv b{color:rgba(23,32,51,.50)!important}.kn-about-kv span{color:rgba(23,32,51,.82)!important}';

    var darkCss = 'body{background:#2f3945!important;color:#fff!important}#BG_OVERLAY,.bg,.container{background:transparent!important;}';

    style.textContent = bg + (light ? lightCss : darkCss) +
      ':root{--kn-grad-1:' + a.gradColor1 + ';--kn-grad-2:' + a.gradColor2 + ';--kn-accent:' + a.accentColor + ';font-size:' + a.fontScale + '%;}' +
      (a.enableRadius ? '.box,.card,.kpi,.collapse_box{border-radius:18px!important;}' : '') +
      (a.enableShadow && !light ? '.box,.card,.kpi{box-shadow:0 10px 28px rgba(0,0,0,.20)!important;}' : '') +
      (a.enableCapsule ? 'button:not(.switch):not(.radio),.btn{border-radius:999px!important;}' : '') +
      (a.enableGlass && !light ? '.box,.card,.collapse_box{background:rgba(255,255,255,.045)!important;backdrop-filter:blur(12px)!important;-webkit-backdrop-filter:blur(12px)!important;border:1px solid rgba(255,255,255,.09)!important;}' : '') +
      (a.enableCompact ? '.box,.card,.collapse_box{padding:10px!important;margin-bottom:10px!important}.title{margin-top:4px!important;margin-bottom:4px!important}' : '') +
      (a.enableHover ? '.box,.card,.kpi{transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease}.box:hover,.card:hover,.kpi:hover{transform:translateY(-2px);border-color:rgba(255,255,255,.18)!important}' : '') +
      (a.enableSoftDivider ? '.title{border-left-color:rgba(78,146,255,.42)!important}.collapse_box{border-top:1px solid rgba(255,255,255,.06)!important}' : '') +
      (a.enableReadableText && !light ? 'body,.box,.card,.kpi,.collapse_box{text-shadow:0 1px 1px rgba(0,0,0,.18)}' : '') +
      (a.enableGradient ? '.title strong,.box .title,.beauty-gradient{background:linear-gradient(135deg,var(--kn-grad-1),var(--kn-grad-2))!important;-webkit-background-clip:text!important;-webkit-text-fill-color:transparent!important;color:transparent!important;font-weight:900!important}' : '') +
      (a.enableScrollbar ? 'body::-webkit-scrollbar,.modal::-webkit-scrollbar,.kn-dialog-content::-webkit-scrollbar{width:7px;height:7px}body::-webkit-scrollbar-thumb,.modal::-webkit-scrollbar-thumb,.kn-dialog-content::-webkit-scrollbar-thumb{background:rgba(0,0,0,.22);border-radius:999px}body::-webkit-scrollbar-track{background:transparent}' : '') +
      (light ? '#' + DIALOG_ID + ' .kn-zone-count{color:rgba(23,32,51,.58)!important;background:rgba(34,50,80,.05)!important;border-color:rgba(34,50,80,.10)!important}#' + DIALOG_ID + ' .kn-drag-handle,#' + DIALOG_ID + ' .kn-item-move,#' + DIALOG_ID + ' #kn-layout-move-status{color:rgba(23,32,51,.52)!important}' : '') +
      (a.animationLevel === 0 ? '*{transition:none!important;animation:none!important}' : '');

    document.head.appendChild(style);
  }

  function buildHeader(container) {
    var header = document.createElement('header');
    header.id = HEADER_ID;
    var nav = GROUP_ORDER.map(function (g) {
      return '<button type="button" class="kn-nav-btn" data-group="' + g + '" title="' + GROUPS[g].desc + '">' + GROUPS[g].shortLabel + '</button>';
    }).join('');
    header.innerHTML = '<div id="kn-title-placeholder"><div id="kn-header-left"><div id="kn-brand-mark" class="kn-brand-mood mood-unknown" title="信号状态：读取中" aria-label="信号状态：读取中">📡</div><div id="kn-brand-copy"><div id="kn-brand-title">UFI 控制台</div><div id="kn-brand-subtitle">WebOS · 设备管理中枢</div><div class="kn-version-chips"><span class="kn-meta-chip primary" id="kn-page-badge">UFI-TOOLS</span><span class="kn-meta-chip" id="kn-page-version">v4.0.0</span><span class="kn-meta-chip muted">2026 UI</span></div></div></div></div><div id="kn-header-center"><nav id="kn-main-nav">' + nav + '</nav></div><div id="kn-header-actions"><div id="kn-header-net-pill" title="网络与设备信息"><span id="kn-header-network-dot"></span><span id="kn-header-operator">读取中</span><span class="kn-net-sep">·</span><span id="kn-header-nettype" class="kn-nettype-badge">--</span><span id="kn-header-signal" data-level="0"><i></i><i></i><i></i><i></i></span><div id="kn-header-net-pop"><div class="kn-net-pop-title">网络与设备信息</div><div class="kn-net-pop-grid"><b>运营商</b><span id="kn-pop-operator">--</span><b>网络类型</b><span id="kn-pop-nettype">--</span><b>信号强度</b><span id="kn-pop-signal">--</span><b>连接状态</b><span id="kn-pop-ppp">--</span><b>手机号</b><span id="kn-pop-phone">--</span><b>IMEI</b><span id="kn-pop-imei">--</span><b>IMSI</b><span id="kn-pop-imsi">--</span><b>ICCID</b><span id="kn-pop-iccid">--</span><b>本机 IP</b><span id="kn-pop-ip">--</span></div></div></div><div class="kn-header-tool-menu-wrap" id="kn-header-wifi-wrap"><div class="kn-action-btn kn-header-tool-btn kn-wifi-pill" id="kn-header-wifi-btn" role="button" tabindex="0" data-short="WiFi" title="WiFi情况"><span class="kn-wifi-icon" aria-hidden="true">≋</span><span class="kn-wifi-main">WiFi</span><span class="kn-wifi-status-text" id="kn-header-wifi-state">读取中</span><span class="kn-wifi-count" id="kn-header-wifi-count">--</span></div><div class="kn-header-tool-menu" id="kn-header-wifi-menu"><button type="button" class="kn-header-tool-menu-item" data-header-menu-action="wifiSettings"><span class="kn-header-tool-icon">设</span><span>WiFi设置</span></button><button type="button" class="kn-header-tool-menu-item" data-header-menu-action="accessDevices"><span class="kn-header-tool-icon">端</span><span>接入设备</span></button></div></div><div class="kn-login-menu-wrap" id="kn-header-login-wrap"><div id="kn-header-login-btn" class="kn-login-pill is-logout" role="button" tabindex="0" aria-label="账号菜单" title="账号：未登录"><span class="kn-login-icon" aria-hidden="true">👤</span><span id="kn-header-login-text" class="kn-login-text">未登录</span></div><div class="kn-login-menu" id="kn-header-login-menu"><button type="button" class="kn-login-menu-item" data-login-action="login"><span class="kn-login-menu-icon">登</span><span>登录/登出</span></button><div class="kn-login-menu-sep"></div><button type="button" class="kn-login-menu-item" data-login-action="command"><span class="kn-login-menu-icon">令</span><span>更改口令</span></button><button type="button" class="kn-login-menu-item" data-login-action="password"><span class="kn-login-menu-icon">密</span><span>更改密码</span></button></div></div><button type="button" class="kn-action-btn primary kn-settings-icon-btn" data-action="settings" aria-label="界面设置" title="界面设置"><span class="kn-settings-icon" aria-hidden="true">⚙</span></button></div>';
    Array.prototype.slice.call(header.querySelectorAll('.kn-nav-btn')).forEach(function (btn) {
      btn.onclick = function () { switchGroup(btn.getAttribute('data-group')); };
    });
    header.querySelector('[data-action="settings"]').onclick = openSettingsDialog;

    var netPill = header.querySelector('#kn-header-net-pill');
    if (netPill) {
      netPill.setAttribute('role', 'button');
      netPill.setAttribute('tabindex', '0');
      netPill.addEventListener('click', function (e) {
        if (e && e.preventDefault) e.preventDefault();
        if (e && e.stopPropagation) e.stopPropagation();
        if (e && e.stopImmediatePropagation) e.stopImmediatePropagation();
        if (e && e.target && e.target.closest && e.target.closest('#kn-header-net-pop')) return false;
        closeHeaderLoginMenu();
        closeHeaderToolMenus();
        toggleHeaderNetworkPopover(e);
        return false;
      }, true);
      netPill.addEventListener('keydown', function (e) {
        var key = e && (e.key || e.code);
        if (key === 'Enter' || key === ' ' || key === 'Spacebar') {
          if (e.preventDefault) e.preventDefault();
          if (e.stopPropagation) e.stopPropagation();
          closeHeaderLoginMenu();
          closeHeaderToolMenus();
          toggleHeaderNetworkPopover(e);
        }
      });
    }

    Array.prototype.slice.call(header.querySelectorAll('[data-header-action]')).forEach(function (btn) {
      btn.onclick = function (e) {
        if (e && e.preventDefault) e.preventDefault();
        if (e && e.stopPropagation) e.stopPropagation();
        closeHeaderToolMenus();
        closeHeaderLoginMenu();
        closeHeaderNetworkPopover();
        triggerHeaderMenuAction(btn.getAttribute('data-header-action'));
      };
    });

    var wifiBtn = header.querySelector('#kn-header-wifi-btn');
    if (wifiBtn) {
      wifiBtn.addEventListener('click', function (e) {
        if (e && e.preventDefault) e.preventDefault();
        if (e && e.stopPropagation) e.stopPropagation();
        if (e && e.stopImmediatePropagation) e.stopImmediatePropagation();
        closeHeaderLoginMenu();
        closeHeaderNetworkPopover();
        toggleHeaderToolMenu('wifi', e);
        return false;
      }, true);
      wifiBtn.addEventListener('keydown', function (e) {
        var key = e && (e.key || e.code);
        if (key === 'Enter' || key === ' ' || key === 'Spacebar') {
          if (e.preventDefault) e.preventDefault();
          if (e.stopPropagation) e.stopPropagation();
          closeHeaderLoginMenu();
          toggleHeaderToolMenu('wifi', e);
        }
      });
    }

    Array.prototype.slice.call(header.querySelectorAll('[data-header-menu-action]')).forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        if (e && e.preventDefault) e.preventDefault();
        if (e && e.stopPropagation) e.stopPropagation();
        if (e && e.stopImmediatePropagation) e.stopImmediatePropagation();
        closeHeaderToolMenus();
        triggerHeaderMenuAction(btn.getAttribute('data-header-menu-action'));
        return false;
      }, true);
    });

    var headerLoginBtn = header.querySelector('#kn-header-login-btn');
    if (headerLoginBtn) {
      headerLoginBtn.addEventListener('click', function (e) {
        if (e && e.preventDefault) e.preventDefault();
        if (e && e.stopPropagation) e.stopPropagation();
        if (e && e.stopImmediatePropagation) e.stopImmediatePropagation();
        closeHeaderToolMenus();
        closeHeaderNetworkPopover();
        toggleHeaderLoginMenu(e);
        return false;
      }, true);

      headerLoginBtn.addEventListener('keydown', function (e) {
        var key = e && (e.key || e.code);
        if (key === 'Enter' || key === ' ' || key === 'Spacebar') {
          if (e.preventDefault) e.preventDefault();
          if (e.stopPropagation) e.stopPropagation();
          closeHeaderToolMenus();
          toggleHeaderLoginMenu(e);
        }
      });
    }

    Array.prototype.slice.call(header.querySelectorAll('[data-login-action]')).forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        if (e && e.preventDefault) e.preventDefault();
        if (e && e.stopPropagation) e.stopPropagation();
        if (e && e.stopImmediatePropagation) e.stopImmediatePropagation();
        closeHeaderLoginMenu();
        triggerHeaderMenuAction(btn.getAttribute('data-login-action'));
        return false;
      }, true);
    });

    document.addEventListener('click', function (e) {
      var loginWrap = document.getElementById('kn-header-login-wrap');
      var wifiWrap = document.getElementById('kn-header-wifi-wrap');
      var netPill = document.getElementById('kn-header-net-pill');
      if (loginWrap && e && !loginWrap.contains(e.target)) closeHeaderLoginMenu();
      if (wifiWrap && e && !wifiWrap.contains(e.target)) closeHeaderToolMenus();
      var netPop = document.getElementById('kn-header-net-pop');
      if (netPill && e && !netPill.contains(e.target) && !(netPop && netPop.contains(e.target))) closeHeaderNetworkPopover();
    }, true);
    container.insertBefore(header, container.firstChild || null);
  }

  // ==============================
  // 扩展工具箱：集成工具箱 JS 收纳能力
  // ==============================
  function readToolboxConfig() {
    var defaults = { pluginStates: {} };
    try {
      var raw = localStorage.getItem(TOOLBOX_CONFIG_KEY);
      var parsed = raw ? JSON.parse(raw) : null;
      if (!parsed || typeof parsed !== 'object') return defaults;
      return { pluginStates: parsed.pluginStates && typeof parsed.pluginStates === 'object' ? parsed.pluginStates : {} };
    } catch (e) {
      try { localStorage.removeItem(TOOLBOX_CONFIG_KEY); } catch (err) {}
      return defaults;
    }
  }

  function saveToolboxConfig() {
    try { localStorage.setItem(TOOLBOX_CONFIG_KEY, JSON.stringify(state.toolboxConfig || { pluginStates: {} })); } catch (e) {}
  }

  function injectToolboxCSS() {
    if (document.getElementById(TOOLBOX_STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = TOOLBOX_STYLE_ID;
    style.textContent = '' +
      '#' + TOOLBOX_WRAPPER_ID + '{box-sizing:border-box;margin:0 0 18px;padding:18px;border-radius:22px;border:1px solid rgba(255,255,255,.10);background:linear-gradient(180deg,rgba(20,25,34,.60),rgba(12,15,22,.42));box-shadow:0 12px 30px rgba(0,0,0,.16)}' +
      '#kn-toolbox-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}' +
      '#kn-toolbox-title{display:flex;align-items:center;gap:10px;min-width:0}' +
      '#kn-toolbox-icon{width:34px;height:34px;border-radius:13px;display:flex;align-items:center;justify-content:center;background:rgba(78,146,255,.16);border:1px solid rgba(120,180,255,.25);font-size:16px}' +
      '#kn-toolbox-title strong{font-size:15px;font-weight:950;color:rgba(255,255,255,.94);white-space:nowrap}' +
      '#kn-toolbox-sub{font-size:11px;color:rgba(255,255,255,.46);margin-top:3px;white-space:nowrap}' +
      '#kn-toolbox-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end}' +
      '.kn-toolbox-btn{min-height:34px;padding:0 13px;border-radius:999px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.07);color:rgba(255,255,255,.86);font-size:12px;font-weight:850;cursor:pointer;transition:transform .16s ease,background .16s ease,border-color .16s ease}' +
      '.kn-toolbox-btn:hover{transform:translateY(-1px);background:rgba(255,255,255,.10);border-color:rgba(120,180,255,.24)}' +
      '.kn-toolbox-btn.green{background:rgba(52,199,89,.13);border-color:rgba(134,239,172,.26);color:rgba(225,255,235,.95)}.kn-toolbox-btn.blue{background:rgba(78,146,255,.13);border-color:rgba(120,180,255,.26);color:rgba(225,240,255,.95)}' +
      '#kn-toolbox-buttons{display:flex;flex-wrap:wrap;align-items:center;gap:8px;min-height:42px;padding:12px;border-radius:18px;border:1px dashed rgba(255,255,255,.12);background:rgba(0,0,0,.16)}' +
      '#kn-toolbox-buttons button,#kn-toolbox-secondary-buttons button{margin:2px!important;white-space:nowrap}' +
      '.kn-toolbox-empty{font-size:12px;color:rgba(255,255,255,.36);padding:6px 2px}' +
      '.kn-toolbox-mask{position:fixed!important;inset:0!important;z-index:999999!important;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(0,0,0,.55);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}' +
      '.kn-toolbox-modal{width:min(760px,94vw);max-height:88vh;overflow:auto;border-radius:26px;border:1px solid rgba(255,255,255,.13);background:radial-gradient(circle at 15% 0%,rgba(120,180,255,.16),transparent 34%),linear-gradient(180deg,rgba(25,30,40,.96),rgba(9,12,18,.96));box-shadow:0 34px 90px rgba(0,0,0,.55);padding:24px;color:rgba(255,255,255,.9)}' +
      '.kn-toolbox-modal-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:18px}.kn-toolbox-modal-title{font-size:18px;font-weight:950}.kn-toolbox-modal-sub{font-size:12px;color:rgba(255,255,255,.48);margin-top:5px;line-height:1.5}' +
      '#kn-toolbox-secondary-buttons{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;min-height:90px;padding:14px;border-radius:18px;background:rgba(0,0,0,.20);border:1px dashed rgba(255,255,255,.12)}' +
      '#kn-toolbox-zone-board{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-top:12px}.kn-toolbox-zone{position:relative;min-height:170px;padding:25px 10px 10px;border-radius:18px;border:2px dashed rgba(255,255,255,.12);background:rgba(0,0,0,.20);display:flex;align-content:flex-start;align-items:flex-start;gap:7px;flex-wrap:wrap;transition:transform .18s ease,border-color .18s ease,background .18s ease}.kn-toolbox-zone:before{content:attr(data-title);position:absolute;top:-13px;left:50%;transform:translateX(-50%);padding:4px 12px;border-radius:999px;background:#202735;border:1px solid rgba(255,255,255,.13);color:#8fc2ff;font-size:12px;font-weight:900;white-space:nowrap}.kn-toolbox-zone.drag-over{background:rgba(78,146,255,.13);border-color:rgba(120,180,255,.78);transform:translateY(-2px)}' +
      '.kn-toolbox-drag-item{display:inline-flex;align-items:center;max-width:100%;padding:7px 12px;border-radius:999px;border:1px solid rgba(255,255,255,.18);background:linear-gradient(180deg,rgba(255,255,255,.12),rgba(255,255,255,.05));color:#fff;font-size:12px;font-weight:780;cursor:grab;box-shadow:0 6px 14px rgba(0,0,0,.18);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.kn-toolbox-drag-item:active{cursor:grabbing;transform:scale(.96)}' +
      '.kn-toolbox-about{margin-top:16px;padding:14px;border-radius:18px;background:rgba(78,146,255,.07);border:1px solid rgba(120,180,255,.14);font-size:12px;line-height:1.7;color:rgba(255,255,255,.62)}' +
      '@media(max-width:760px){#kn-toolbox-zone-board{grid-template-columns:1fr}.kn-toolbox-modal{padding:18px}#kn-toolbox-head{align-items:flex-start;flex-direction:column}#kn-toolbox-actions{width:100%;justify-content:flex-start}}';
    document.head.appendChild(style);
  }

  function getNativeFunctionNameSet() {
    // 原系统功能列表必须保留在“功能列表”模块里；工具箱只收第三方插件主入口。
    // 这里保守列出 UFI-TOOLS/F50 常见原生功能入口，避免再次被移动进“扩展工具箱”。
    return {
      'AT指令': true, 'AT 指令': true, 'AT': true,
      '短信收发': true, '短信': true, 'SMS': true,
      '登录/登出': true, '登录': true, '登出': true,
      '更改口令': true, '修改口令': true, '更改密码': true, '修改密码': true,
      'WiFi设置': true, 'wifi设置': true, 'WIFI设置': true, 'Wi-Fi设置': true, '无线设置': true, 'WLAN设置': true,
      '接入设备': true, '已连接设备': true, '连接设备': true, '终端设备': true,
      '设备属性': true, '设备信息': true, '设备详情': true,
      '重启': true, '重启设备': true, '重启网络': true, '恢复出厂': true,
      '切换SIM': true, 'SIM切换': true, '语言': true, '中文': true, 'English': true,
      '5G/4G/3G': true, '网络模式': true, 'USB上网': true, 'USB 上网': true,
      '插件功能': true, '插件管理': true, '插件商店': true, '添加插件': true, '导入插件': true, '导出插件': true, '上传文件': true, '上传文件管理': true,
      '刷新': true, '读取': true, '发送': true, '保存': true, '确认': true, '取消': true, '关闭': true, '完成': true
    };
  }

  function isNativeFunctionButton(btn) {
    if (!btn || !(btn instanceof HTMLElement)) return true;
    var name = getToolboxName(btn);
    if (!name) return true;
    var nativeNames = getNativeFunctionNameSet();
    if (nativeNames[name]) return true;
    var combo = clean([
      btn.textContent || '',
      btn.innerText || '',
      btn.getAttribute('title') || '',
      btn.getAttribute('aria-label') || '',
      btn.getAttribute('onclick') || '',
      btn.id || '',
      typeof btn.className === 'string' ? btn.className : ''
    ].join(' '));
    // 原生 header 已收纳入口、系统确认类按钮、以及明显原生 action，不进入扩展工具箱。
    if (/登录|登出|口令|密码|WiFi设置|WIFI设置|Wi-Fi设置|无线设置|WLAN设置|接入设备|设备属性|设备信息|AT指令|短信收发|插件功能|插件管理|插件商店|添加插件|导入插件|导出插件|上传文件|网络模式|切换SIM|USB上网|恢复出厂|重启设备/.test(combo)) return true;
    return false;
  }

  function getNativeFunctionButtonBoxes() {
    var boxes = [];
    var pushBox = function (box) {
      if (!box || !(box instanceof HTMLElement)) return;
      if (box.closest('#' + TOOLBOX_WRAPPER_ID) || box.closest('#' + TOOLBOX_DRAWER_ID) || box.closest('#' + TOOLBOX_SETTINGS_ID) || box.closest('#' + HEADER_ID) || box.closest('#' + DIALOG_ID)) return;
      if (boxes.indexOf(box) === -1) boxes.push(box);
    };

    // 与你之前工具箱 JS 保持同一核心定位：只盯原系统功能列表按钮承载层。
    try {
      if (window.collapseBtn_menu && window.collapseBtn_menu.nextElementSibling && window.collapseBtn_menu.nextElementSibling.querySelector) {
        pushBox(window.collapseBtn_menu.nextElementSibling.querySelector('.collapse_box'));
      }
    } catch (e) {}

    // 兜底只允许在 func_list_container 内找按钮层，禁止全局 .actions-buttons，避免扫进插件面板内部按钮。
    Array.prototype.slice.call(document.querySelectorAll('.kano_function_main.func_list_container .collapse_box,.func_list_container .collapse_box,.func_list_container .actions-buttons')).forEach(pushBox);
    return boxes;
  }

  function getNativeFunctionButtonBox() {
    return getNativeFunctionButtonBoxes()[0] || null;
  }

  function getToolboxName(btn) { return clean(btn && (btn.innerText || btn.textContent || btn.value || '')); }

  function isToolboxOwnButton(btn) {
    if (!btn || !(btn instanceof HTMLElement)) return true;
    // 已捕获的插件按钮会被移动到工具箱容器内，不能再因为 closest(toolbox) 被当成工具箱自身按钮过滤掉。
    if (btn.classList && btn.classList.contains('kn-toolbox-captured')) return false;
    if (btn.closest('#' + TOOLBOX_WRAPPER_ID) || btn.closest('#' + TOOLBOX_DRAWER_ID) || btn.closest('#' + TOOLBOX_SETTINGS_ID) || btn.closest('#' + HEADER_ID) || btn.closest('#' + DIALOG_ID)) return true;
    var name = getToolboxName(btn);
    if (!name) return true;
    return ['📦 收纳箱', '收纳箱', '🛠️ 收纳设置', '收纳设置', '完成', '关闭'].indexOf(name) !== -1;
  }

  function shouldSkipToolboxCapture(btn) {
    if (isToolboxOwnButton(btn)) return true;
    if (isNativeFunctionButton(btn)) return true;
    var name = getToolboxName(btn);
    if (!name) return true;
    // 工具箱只收“第三方插件主入口”。原生功能列表入口必须继续留在“功能列表”模块。
    return false;
  }

  function captureToolboxButton(btn) {
    if (!isWebOSFeatureEnabled('toolboxCapture')) return false;
    if (!btn || !(btn instanceof HTMLElement) || btn.tagName.toUpperCase() !== 'BUTTON') return false;
    if (btn.getAttribute('data-kn-native-function-baseline') === '1') return false;
    if (shouldSkipToolboxCapture(btn)) return false;
    var toolbox = document.getElementById('kn-toolbox-buttons');
    if (!toolbox) return false;
    btn.classList.add('kn-toolbox-captured');
    toolbox.appendChild(btn);
    applyToolboxRouting();
    return true;
  }

  function markExistingNativeFunctionButtons() {
    // 关键修复：当前已经存在于原系统“功能列表”的按钮，一律视为功能列表自身内容。
    // 工具箱只拦截之后 appendChild 新增进来的第三方插件主按钮，避免把“功能列表”整体搬空。
    getNativeFunctionButtonBoxes().forEach(function (sourceBox) {
      Array.prototype.slice.call(sourceBox.children || []).forEach(function (node) {
        if (!(node instanceof HTMLElement)) return;
        if (node.tagName && node.tagName.toUpperCase() === 'BUTTON') {
          node.setAttribute('data-kn-native-function-baseline', '1');
          return;
        }
        if (node.classList && (node.classList.contains('actions-buttons') || node.classList.contains('collapse_box'))) {
          Array.prototype.slice.call(node.children || []).forEach(function (child) {
            if (child instanceof HTMLElement && child.tagName && child.tagName.toUpperCase() === 'BUTTON') {
              child.setAttribute('data-kn-native-function-baseline', '1');
            }
          });
        }
      });
    });
  }

  function captureExistingToolboxButtons() {
    // 不再主动扫描并移动当前“功能列表”里的按钮。
    // 之前的问题正是这里把原生功能列表按钮收进了扩展工具箱。
    // 已捕获的第三方按钮会在 #kn-toolbox-buttons / #kn-toolbox-secondary-buttons 里继续参与路由。
    applyToolboxRouting();
  }

  function buildToolbox(container) {
    injectToolboxCSS();
    state.toolboxConfig = readToolboxConfig();

    var old = document.getElementById(TOOLBOX_WRAPPER_ID);
    if (old) old.remove();

    var wrapper = document.createElement('section');
    wrapper.id = TOOLBOX_WRAPPER_ID;
    wrapper.className = 'kn-toolbox-wrapper';
    wrapper.innerHTML = '<div id="kn-toolbox-head"><div id="kn-toolbox-title"><div id="kn-toolbox-icon">🧰</div><div><strong>扩展工具箱</strong><div id="kn-toolbox-sub">第三方插件入口收纳 / 原生功能不收纳</div></div></div><div id="kn-toolbox-actions"><button type="button" class="kn-toolbox-btn green" data-toolbox-action="drawer">📦 收纳箱</button><button type="button" class="kn-toolbox-btn blue" data-toolbox-action="settings">🛠️ 收纳设置</button></div></div><div id="kn-toolbox-buttons"><div class="kn-toolbox-empty">暂无第三方插件按钮；原生功能列表已独立保留。</div></div>';
    container.appendChild(wrapper);

    Array.prototype.slice.call(wrapper.querySelectorAll('[data-toolbox-action]')).forEach(function (btn) {
      btn.onclick = function () {
        var action = btn.getAttribute('data-toolbox-action');
        if (action === 'drawer') openToolboxDrawer();
        if (action === 'settings') openToolboxSettings();
      };
    });

    buildToolboxModals();
    if (isWebOSFeatureEnabled('toolboxCapture')) setupToolboxCapture();
    applyToolboxRouting();
  }

  function buildToolboxModals() {
    document.getElementById(TOOLBOX_DRAWER_ID)?.remove();
    document.getElementById(TOOLBOX_SETTINGS_ID)?.remove();

    var drawer = document.createElement('div');
    drawer.id = TOOLBOX_DRAWER_ID;
    drawer.className = 'kn-toolbox-mask';
    drawer.innerHTML = '<div class="kn-toolbox-modal"><div class="kn-toolbox-modal-head"><div><div class="kn-toolbox-modal-title">📦 我的收纳箱</div><div class="kn-toolbox-modal-sub">这里显示被分配到次级菜单的第三方插件按钮。</div></div><button type="button" class="kn-toolbox-btn" data-close="drawer">关闭</button></div><div id="kn-toolbox-secondary-buttons"><div class="kn-toolbox-empty">收纳箱为空</div></div></div>';
    drawer.addEventListener('click', function (e) { if (e.target === drawer) closeToolboxDrawer(); });
    drawer.querySelector('[data-close="drawer"]').onclick = closeToolboxDrawer;
    document.body.appendChild(drawer);

    var settings = document.createElement('div');
    settings.id = TOOLBOX_SETTINGS_ID;
    settings.className = 'kn-toolbox-mask';
    settings.innerHTML = '<div class="kn-toolbox-modal"><div class="kn-toolbox-modal-head"><div><div class="kn-toolbox-modal-title">🛠️ 扩展工具管理</div><div class="kn-toolbox-modal-sub">拖拽第三方插件入口到不同区域；原生功能列表入口不会进入这里。</div></div><button type="button" class="kn-toolbox-btn" data-close="settings">完成</button></div><div id="kn-toolbox-zone-board"><div class="kn-toolbox-zone" id="kn-toolbox-zone-0" data-title="🌟 主页可见"></div><div class="kn-toolbox-zone" id="kn-toolbox-zone-1" data-title="📦 放入收纳箱"></div><div class="kn-toolbox-zone" id="kn-toolbox-zone-2" data-title="🚫 彻底隐藏"></div></div><div class="kn-toolbox-about">集成自你提供的工具箱思路：只盯住原系统功能列表按钮承载层，只收第三方插件主入口；原生功能列表入口保留在“功能列表”模块。</div></div>';
    settings.addEventListener('click', function (e) { if (e.target === settings) closeToolboxSettings(); });
    settings.querySelector('[data-close="settings"]').onclick = closeToolboxSettings;
    document.body.appendChild(settings);

    var sec = document.getElementById('kn-toolbox-secondary-buttons');
    if (sec) {
      sec.addEventListener('click', function (e) {
        var btn = e.target && e.target.closest ? e.target.closest('button') : null;
        if (btn) setTimeout(closeToolboxDrawer, 150);
      });
    }
  }

  function openToolboxDrawer() { var m = document.getElementById(TOOLBOX_DRAWER_ID); if (m) { applyToolboxRouting(); m.style.display = 'flex'; } }
  function closeToolboxDrawer() { var m = document.getElementById(TOOLBOX_DRAWER_ID); if (m) m.style.display = 'none'; }
  function openToolboxSettings() { var m = document.getElementById(TOOLBOX_SETTINGS_ID); if (m) { captureExistingToolboxButtons(); renderToolboxZones(); m.style.display = 'flex'; } }
  function closeToolboxSettings() { var m = document.getElementById(TOOLBOX_SETTINGS_ID); if (m) m.style.display = 'none'; }

  function hookToolboxAppendChildCapture() {
    // 复用你工具箱插件的核心思路：只盯住原系统功能列表承载层的 appendChild。
    // 用全局分发函数避免热重载后多层包裹 HTMLElement.prototype.appendChild。
    window.__KANO_WEBOS_TOOLBOX_CAPTURE_HANDLER__ = function (parent, element) {
      try {
        if (!element || !(element instanceof HTMLElement) || element.tagName.toUpperCase() !== 'BUTTON') return;
        var boxes = getNativeFunctionButtonBoxes();
        if (boxes.indexOf(parent) === -1) return;
        setTimeout(function () { captureToolboxButton(element); }, 0);
      } catch (err) {}
    };

    if (window.__KANO_WEBOS_TOOLBOX_APPEND_HOOKED__) return;
    window.__KANO_WEBOS_TOOLBOX_APPEND_HOOKED__ = true;
    var originalAppendChild = HTMLElement.prototype.appendChild;
    window.__KANO_WEBOS_TOOLBOX_APPEND_ORIGINAL__ = originalAppendChild;

    HTMLElement.prototype.appendChild = function (element) {
      var ret = originalAppendChild.call(this, element);
      try {
        if (typeof window.__KANO_WEBOS_TOOLBOX_CAPTURE_HANDLER__ === 'function') {
          window.__KANO_WEBOS_TOOLBOX_CAPTURE_HANDLER__(this, element);
        }
      } catch (err) {}
      return ret;
    };
  }

  function setupToolboxCapture() {
    if (state.toolboxObserver) { try { state.toolboxObserver.disconnect(); } catch (e) {} state.toolboxObserver = null; }
    var sourceBox = getNativeFunctionButtonBox();
    if (!sourceBox) {
      setTimeout(setupToolboxCapture, 400);
      return;
    }

    markExistingNativeFunctionButtons();
    hookToolboxAppendChildCapture();
    captureExistingToolboxButtons();

    state.toolboxObserver = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        Array.prototype.slice.call(m.addedNodes || []).forEach(function (node) {
          if (!(node instanceof HTMLElement)) return;
          if (node.tagName && node.tagName.toUpperCase() === 'BUTTON') captureToolboxButton(node);
        });
      });
    });
    getNativeFunctionButtonBoxes().forEach(function (box) {
      try { state.toolboxObserver.observe(box, { childList: true }); } catch (e) {}
    });
  }

  function getToolboxButtons() {
    var list = [];
    ['#kn-toolbox-buttons', '#kn-toolbox-secondary-buttons'].forEach(function (sel) {
      var box = document.querySelector(sel);
      if (!box) return;
      Array.prototype.slice.call(box.querySelectorAll(':scope > button')).forEach(function (btn) {
        if (btn.classList && btn.classList.contains('kn-toolbox-captured')) {
          list.push(btn);
        } else if (!shouldSkipToolboxCapture(btn)) {
          list.push(btn);
        }
      });
    });
    return list;
  }

  function applyToolboxRouting() {
    if (!isWebOSFeatureEnabled('toolboxCapture')) return;
    var toolbox = document.getElementById('kn-toolbox-buttons');
    var secondary = document.getElementById('kn-toolbox-secondary-buttons');
    if (!toolbox) return;
    if (!state.toolboxConfig) state.toolboxConfig = readToolboxConfig();

    Array.prototype.slice.call(toolbox.querySelectorAll('.kn-toolbox-empty')).concat(Array.prototype.slice.call(secondary ? secondary.querySelectorAll('.kn-toolbox-empty') : [])).forEach(function (el) { el.remove(); });

    var allBtns = getToolboxButtons();
    allBtns.forEach(function (btn) {
      var name = getToolboxName(btn);
      var route = Number((state.toolboxConfig.pluginStates || {})[name] || 0);
      if (route === 1 && secondary) {
        btn.style.display = 'inline-block';
        if (btn.parentElement !== secondary) secondary.appendChild(btn);
      } else if (route === 2) {
        btn.style.display = 'none';
        if (btn.parentElement !== toolbox) toolbox.appendChild(btn);
      } else {
        btn.style.display = 'inline-block';
        if (btn.parentElement !== toolbox) toolbox.appendChild(btn);
      }
    });

    if (toolbox && !toolbox.querySelector(':scope > button')) {
      var tip = document.createElement('div');
      tip.className = 'kn-toolbox-empty';
      tip.textContent = '暂无第三方插件按钮；原生功能列表已独立保留。';
      toolbox.appendChild(tip);
    }
    if (secondary && !secondary.querySelector(':scope > button')) {
      var tip2 = document.createElement('div');
      tip2.className = 'kn-toolbox-empty';
      tip2.textContent = '收纳箱为空';
      secondary.appendChild(tip2);
    }
    renderToolboxZones();
  }

  function renderToolboxZones() {
    var zones = [document.getElementById('kn-toolbox-zone-0'), document.getElementById('kn-toolbox-zone-1'), document.getElementById('kn-toolbox-zone-2')];
    if (!zones[0]) return;
    if (!state.toolboxConfig) state.toolboxConfig = readToolboxConfig();
    zones.forEach(function (zone, idx) {
      zone.textContent = '';
      zone.ondragover = function (e) { e.preventDefault(); zone.classList.add('drag-over'); };
      zone.ondragleave = function () { zone.classList.remove('drag-over'); };
      zone.ondrop = function (e) {
        e.preventDefault();
        zone.classList.remove('drag-over');
        var name = '';
        try { name = e.dataTransfer.getData('text/plain') || state.toolboxDragName; } catch (err) { name = state.toolboxDragName; }
        if (!name) return;
        state.toolboxConfig.pluginStates[name] = idx;
        saveToolboxConfig();
        applyToolboxRouting();
      };
    });

    var names = [];
    getToolboxButtons().forEach(function (btn) {
      var name = getToolboxName(btn);
      if (name && names.indexOf(name) === -1) names.push(name);
    });

    if (!names.length) {
      var empty = document.createElement('div');
      empty.className = 'kn-toolbox-empty';
      empty.textContent = '暂无插件按钮';
      zones[0].appendChild(empty);
      return;
    }

    names.forEach(function (name) {
      var idx = Number((state.toolboxConfig.pluginStates || {})[name] || 0);
      if (idx < 0 || idx > 2) idx = 0;
      var item = document.createElement('div');
      item.className = 'kn-toolbox-drag-item';
      item.draggable = true;
      item.textContent = name;
      item.title = name;
      item.addEventListener('dragstart', function (e) {
        state.toolboxDragName = name;
        try { e.dataTransfer.setData('text/plain', name); e.dataTransfer.effectAllowed = 'move'; } catch (err) {}
        item.style.opacity = '.35';
      });
      item.addEventListener('dragend', function () { state.toolboxDragName = ''; item.style.opacity = '1'; });
      zones[idx].appendChild(item);
    });
  }

  function closeToolboxPopupsOnNativeModal(target) {
    if (target !== '#' + TOOLBOX_DRAWER_ID && target !== '#' + TOOLBOX_SETTINGS_ID) closeToolboxDrawer();
  }

  function hookToolboxAutoClose() {
    if (typeof window.showModal === 'function') {
      if (window.showModal.__kn_toolbox_hooked__) return;
      var originalShowModal = window.showModal;
      window.showModal = function () {
        closeToolboxPopupsOnNativeModal(arguments[0]);
        return originalShowModal.apply(this, arguments);
      };
      window.showModal.__kn_toolbox_hooked__ = true;
    } else {
      setTimeout(hookToolboxAutoClose, 300);
    }
  }


  function normalizeVersionTag(value) {
    return String(value || '').trim().replace(/^v/i, '').replace(/^[^0-9]*/, '').trim();
  }

  function compareVersionTags(a, b) {
    var aa = normalizeVersionTag(a).split(/[^0-9A-Za-z]+/).filter(Boolean);
    var bb = normalizeVersionTag(b).split(/[^0-9A-Za-z]+/).filter(Boolean);
    var len = Math.max(aa.length, bb.length);
    for (var i = 0; i < len; i += 1) {
      var x = aa[i] || '0';
      var y = bb[i] || '0';
      var nx = Number(x);
      var ny = Number(y);
      if (!Number.isNaN(nx) && !Number.isNaN(ny)) {
        if (nx > ny) return 1;
        if (nx < ny) return -1;
      } else {
        var cmp = String(x).localeCompare(String(y));
        if (cmp !== 0) return cmp > 0 ? 1 : -1;
      }
    }
    return 0;
  }

  function setGithubVersionUI(stateText, latestText, noteText, stateClass) {
    var latest = document.getElementById('kn-about-latest-version');
    var state = document.getElementById('kn-about-version-state');
    var note = document.getElementById('kn-about-update-note');
    if (latest && latestText != null) latest.textContent = latestText;
    if (state) {
      state.textContent = stateText || '';
      state.className = stateClass ? 'kn-version-state ' + stateClass : 'kn-version-state';
    }
    if (note && noteText != null) note.innerHTML = noteText;
  }

  async function fetchGithubLatestVersion() {
    var releaseUrl = 'https://api.github.com/repos/' + GITHUB_REPO + '/releases/latest?t=' + Date.now();
    var releaseRes = await fetch(releaseUrl, { headers: { Accept: 'application/vnd.github+json' } });
    if (releaseRes.ok) {
      var releaseData = await releaseRes.json();
      if (releaseData && releaseData.tag_name) {
        return { tag: releaseData.tag_name, url: releaseData.html_url || GITHUB_REPO_URL + '/releases/latest', source: 'Release' };
      }
    }

    var tagsUrl = 'https://api.github.com/repos/' + GITHUB_REPO + '/tags?per_page=1&t=' + Date.now();
    var tagsRes = await fetch(tagsUrl, { headers: { Accept: 'application/vnd.github+json' } });
    if (!tagsRes.ok) throw new Error('GitHub Releases / Tags 均读取失败');
    var tags = await tagsRes.json();
    if (Array.isArray(tags) && tags[0] && tags[0].name) {
      return { tag: tags[0].name, url: GITHUB_REPO_URL + '/tags', source: 'Tag' };
    }
    throw new Error('仓库没有可用的 Release 或 Tag');
  }

  async function checkGithubVersion() {
    var btn = document.querySelector('[data-action="checkGithubVersion"]');
    if (btn) {
      btn.disabled = true;
      btn.textContent = '正在检查…';
    }
    setGithubVersionUI('正在连接 GitHub', '读取中…', '正在请求 GitHub 最新 Release；如果没有 Release，会回退检查 Tags。', 'checking');

    try {
      var info = await fetchGithubLatestVersion();
      var cmp = compareVersionTags(info.tag, VERSION);
      var link = '<a href="' + escapeHTML(info.url) + '" target="_blank" rel="noopener noreferrer">查看 ' + escapeHTML(info.source) + '</a>';
      if (cmp > 0) {
        setGithubVersionUI('发现新版本', info.tag, '当前版本：' + escapeHTML(VERSION) + '。GitHub 最新版本：' + escapeHTML(info.tag) + '。' + link, 'new');
      } else if (cmp === 0) {
        setGithubVersionUI('当前已是最新版本', info.tag, '当前版本与 GitHub 最新 ' + escapeHTML(info.source) + ' 一致。' + link, 'ok');
      } else {
        setGithubVersionUI('当前版本高于仓库版本', info.tag, '本地版本：' + escapeHTML(VERSION) + '。仓库最新：' + escapeHTML(info.tag) + '。可能是本地开发版或仓库尚未发布新版。' + link, 'warn');
      }
    } catch (err) {
      setGithubVersionUI('检查失败', '读取失败', '无法读取 GitHub 版本：' + escapeHTML(err && err.message ? err.message : String(err)) + '。请确认设备网络或仓库 Release / Tag 配置。', 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = '检查 GitHub 版本';
      }
    }
  }


  var FORWARD_CONFIG_KEY = 'kano_webos_forward_config_v1';
  var nativeForwardState = { loaded: false, dirty: false, busy: false, snapshot: '', data: null };

  function getForwardConfig() {
    var def = {
      enableCallForward: false,
      callIncoming: true,
      callMissed: true,
      callAnswered: false,
      callEnded: true,
      callForwardTarget: 'native',
      callTemplate: '{event} | {number} | {time} | {duration}'
    };
    try {
      var raw = localStorage.getItem(FORWARD_CONFIG_KEY);
      if (raw) {
        var config = Object.assign(def, JSON.parse(raw) || {});
        config.callForwardTarget = 'native';
        return config;
      }
    } catch (e) {}
    return def;
  }

  function saveForwardConfig(cfg) {
    try { localStorage.setItem(FORWARD_CONFIG_KEY, JSON.stringify(cfg || getForwardConfig())); } catch (e) {}
  }

  async function forwardFetchJson(path, options) {
    var base = getHeaderBaseURL();
    var headers = Object.assign({}, getHeaderHeaders(), (options && options.headers) || {});
    var res = await fetch(base + path, Object.assign({ method: 'GET', headers: headers }, options || {}));
    var text = '';
    try { text = await res.text(); } catch (e) { text = ''; }

    // UFI-TOOLS 某些原生转发 POST 接口在成功时可能返回空 body。
    // 旧逻辑强制 res.json() 会触发 "Unexpected end of JSON input"，导致实际成功被误判为失败。
    if (!text || !String(text).trim()) {
      if (res.ok) return { result: 'success', status: res.status, empty: true };
      throw new Error('HTTP ' + res.status + '：接口无返回内容');
    }

    var parsed = null;
    try { parsed = JSON.parse(text); } catch (e) {}
    if (!res.ok) {
      throw new Error(parsed && (parsed.error || parsed.message) || ('HTTP ' + res.status + '：' + text.slice(0, 180)));
    }
    return parsed || { result: 'success', status: res.status, text: text };
  }

  function setForwardText(selector, value) {
    var el = document.querySelector(selector);
    if (!el) return;
    var text = value == null || value === '' ? '--' : String(value);
    el.textContent = text;
    el.title = text;
  }

  function setForwardInput(selector, value) {
    var el = document.querySelector(selector);
    if (!el) return;
    var text = value == null ? '' : String(value);
    if ('value' in el) el.value = text;
    else el.textContent = text || '--';
    var sensitive = el.id === 'kn-native-smtp-pass' || el.id === 'kn-native-dingtalk-secret';
    el.title = sensitive && text ? '已填写' : (text || '--');
  }

  function setForwardReadonlyInfo(selector, value) {
    var el = document.querySelector(selector);
    if (!el) return;
    var text = value == null || value === '' ? '暂无内容。' : String(value);
    el.textContent = text;
    el.title = text;
  }

  function getForwardMethodLabel(method) {
    method = String(method || '').toLowerCase();
    if (method === 'smtp') return 'SMTP 邮件';
    if (method === 'curl') return 'CURL 命令';
    if (method === 'dingtalk') return '钉钉机器人';
    return method || '--';
  }

  function setNativeForwardStatus(text, tone, title) {
    var status = document.querySelector('#kn-native-forward-read-status');
    if (!status) return;
    status.textContent = text;
    status.className = 'kn-forward-inline-status' + (tone ? ' ' + tone : '');
    status.title = title || text;
  }

  function collectNativeForwardConfig() {
    return {
      method: getNativeForwardMethodFromUI(),
      enabled: getForwardChecked('#kn-native-forward-enable') ? '1' : '0',
      powerEnabled: getForwardChecked('#kn-native-power-enable') ? '1' : '0',
      smtp: {
        smtp_host: getForwardInputValue('#kn-native-smtp-host'),
        smtp_port: getForwardInputValue('#kn-native-smtp-port'),
        smtp_username: getForwardInputValue('#kn-native-smtp-user'),
        smtp_password: getForwardInputValue('#kn-native-smtp-pass'),
        smtp_to: getForwardInputValue('#kn-native-smtp-to'),
        forward_dev_info: getForwardChecked('#kn-native-forward-devinfo') ? '1' : '0'
      },
      curl: { curl_text: getForwardInputValue('#kn-native-curl-text') },
      dingtalk: {
        webhook_url: getForwardInputValue('#kn-native-dingtalk-webhook'),
        secret: getForwardInputValue('#kn-native-dingtalk-secret'),
        forward_dev_info: getForwardChecked('#kn-native-forward-devinfo') ? '1' : '0'
      }
    };
  }

  function getNativeForwardSnapshot(data) {
    try { return JSON.stringify(data || collectNativeForwardConfig()); } catch (e) { return ''; }
  }

  function updateNativeForwardSummary(data) {
    data = data || collectNativeForwardConfig();
    var method = String(data.method || '').toLowerCase();
    var enabled = String(data.enabled || '') === '1';
    var powerEnabled = String(data.powerEnabled || '') === '1';
    var devInfoEnabled = String(data.smtp && data.smtp.forward_dev_info) === '1' || String(data.dingtalk && data.dingtalk.forward_dev_info) === '1';
    var devInfo = devInfoEnabled ? '同时转发设备信息' : '不附加设备信息';
    if (method === 'curl') devInfo = 'CURL 命令内容自行决定是否包含设备信息';
    setForwardText('#kn-native-forward-enabled', enabled ? '已启用' : '已关闭');
    setForwardText('#kn-native-power-enabled', powerEnabled ? '已启用' : '已关闭');
    setForwardText('#kn-native-forward-method', getForwardMethodLabel(method));
    setForwardText('#kn-native-forward-method-raw', method || '--');
    setForwardText('#kn-native-forward-device-info', devInfo);
    renderForwardTemplateViewer(method, data);
  }

  function updateNativeForwardControls() {
    var dialog = document.getElementById(DIALOG_ID);
    if (!dialog) return;
    var loggedIn = getStoredLoginState();
    var editable = loggedIn && nativeForwardState.loaded && !nativeForwardState.busy;
    Array.prototype.slice.call(dialog.querySelectorAll('[data-native-forward-field]')).forEach(function (el) {
      el.disabled = !editable;
    });
    var refreshBtn = dialog.querySelector('[data-action="refreshNativeForwardConfig"]');
    var saveBtn = dialog.querySelector('[data-action="saveNativeForwardConfig"]');
    var validateBtn = dialog.querySelector('[data-action="testNativeForwardConfig"]');
    if (refreshBtn) refreshBtn.disabled = !loggedIn || nativeForwardState.busy;
    if (saveBtn) saveBtn.disabled = !editable || !nativeForwardState.dirty;
    if (validateBtn) validateBtn.disabled = !editable || (!getForwardChecked('#kn-native-forward-enable') && !getForwardChecked('#kn-native-power-enable'));
    Array.prototype.slice.call(dialog.querySelectorAll('[data-secret-target]')).forEach(function (btn) {
      btn.disabled = !editable;
    });
    var devInfo = dialog.querySelector('#kn-native-forward-devinfo');
    if (devInfo && editable) devInfo.disabled = getNativeForwardMethodFromUI() === 'curl';
    dialog.querySelector('#kn-settings-panel-forward').classList.toggle('native-locked', !editable);
    if (!loggedIn) setNativeForwardStatus('登录后读取', '', '请先登录 UFI-TOOLS，再读取原生消息转发配置');
    else if (!nativeForwardState.loaded && !nativeForwardState.busy) setNativeForwardStatus('点击读取配置', '', '读取设备上当前的原生消息转发配置');
  }

  function markNativeForwardDirty() {
    if (!nativeForwardState.loaded || nativeForwardState.busy) return;
    var data = collectNativeForwardConfig();
    nativeForwardState.dirty = getNativeForwardSnapshot(data) !== nativeForwardState.snapshot;
    updateNativeForwardSummary(data);
    if (nativeForwardState.dirty) setNativeForwardStatus('有未保存更改', 'warn', '当前修改尚未写入设备');
    else setNativeForwardStatus('已读取 · ' + getForwardMethodLabel(data.method), 'ok');
    updateNativeForwardControls();
  }

  function renderNativeForwardConfig(data) {
    data = data || {};
    var method = String(data.method || '').toLowerCase();
    var enabled = String(data.enabled || '') === '1';
    var powerEnabled = String(data.powerEnabled || '') === '1';

    setForwardChecked('#kn-native-forward-enable', enabled);
    setForwardChecked('#kn-native-power-enable', powerEnabled);
    setNativeForwardMethodUI(method);

    var devInfoEnabled = String(data.smtp && data.smtp.forward_dev_info) === '1' || String(data.dingtalk && data.dingtalk.forward_dev_info) === '1';
    setForwardChecked('#kn-native-forward-devinfo', devInfoEnabled);

    setForwardInput('#kn-native-smtp-host', data.smtp && data.smtp.smtp_host);
    setForwardInput('#kn-native-smtp-port', data.smtp && data.smtp.smtp_port);
    setForwardInput('#kn-native-smtp-user', data.smtp && data.smtp.smtp_username);
    setForwardInput('#kn-native-smtp-to', data.smtp && data.smtp.smtp_to);
    setForwardInput('#kn-native-smtp-pass', data.smtp && data.smtp.smtp_password);

    setForwardInput('#kn-native-curl-text', data.curl && data.curl.curl_text);
    setForwardInput('#kn-native-dingtalk-webhook', data.dingtalk && data.dingtalk.webhook_url);
    setForwardInput('#kn-native-dingtalk-secret', data.dingtalk && data.dingtalk.secret);

    updateNativeForwardSummary(data);
    nativeForwardState.data = data;
    nativeForwardState.loaded = true;
    nativeForwardState.dirty = false;
    nativeForwardState.snapshot = getNativeForwardSnapshot(collectNativeForwardConfig());
    var statusText = '已读取 · ' + getForwardMethodLabel(method);
    var statusFull = '已读取原生配置：' + (enabled ? '消息转发开启' : '消息转发关闭') + ' / ' + (powerEnabled ? '电源通知开启' : '电源通知关闭') + ' / ' + getForwardMethodLabel(method);
    setNativeForwardStatus(statusText, 'ok', statusFull);
    updateNativeForwardControls();
  }


  function renderForwardTemplateViewer(method, data) {
    method = String(method || '').toLowerCase();
    data = data || {};
    var channelText = method ? getForwardMethodLabel(method) : '未选择通道';
    setForwardText('#kn-native-template-channel', channelText);
    setForwardReadonlyInfo('#kn-template-sms', '短信转发示例\n号码：{number}\n内容：{content}\n时间：{time}\n通道：' + channelText + '\n\n说明：原生后端会根据实际短信内容生成消息；CURL 通道可通过命令内容自行组织最终格式。');
    setForwardReadonlyInfo('#kn-template-power', '电源通知示例\n事件：设备通电 / 电源状态变化\n时间：{time}\n通道：' + channelText + '\n\n说明：电源通知由 power_status_forward_enabled 控制，和短信转发总开关独立。');
    setForwardReadonlyInfo('#kn-template-device', '附加设备信息示例\n设备型号：{model}\n运营商：{network_provider}\n网络类型：{network_type}\n信号强度：{signalbar}\nIMEI / IMSI / ICCID：按当前设备可读字段附加\n\n说明：SMTP 与钉钉通道支持“附加设备信息”；CURL 通道是否附加取决于你写入的 CURL 命令。');
    var curlPreview = document.querySelector('#kn-template-curl-preview');
    if (curlPreview) {
      curlPreview.textContent = data.curl && data.curl.curl_text ? String(data.curl.curl_text) : '当前未读取到 CURL 命令。';
      curlPreview.title = curlPreview.textContent;
    }
  }

  function toggleForwardTemplateViewer(forceOpen) {
    var card = document.querySelector('#kn-forward-template-card');
    if (!card) return;
    var open = forceOpen == null ? card.hidden : !!forceOpen;
    card.hidden = !open;
    card.classList.toggle('is-open', open);
    if (open) {
      setTimeout(function () {
        try { card.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) {}
      }, 20);
    }
  }

  async function readNativeMessageForwardConfig(options) {
    options = options || {};
    if (!getStoredLoginState()) {
      nativeForwardState.loaded = false;
      nativeForwardState.dirty = false;
      nativeForwardState.busy = false;
      updateNativeForwardControls();
      return null;
    }
    if (nativeForwardState.dirty && !options.force) {
      if (!confirm('重新读取会覆盖当前未保存的更改，继续吗？')) return null;
    }
    nativeForwardState.busy = true;
    setNativeForwardStatus('正在读取…', 'loading', '正在读取原生消息转发配置');
    updateNativeForwardControls();

    try {
      var methodRes = await forwardFetchJson('/sms_forward_method');
      var method = String(methodRes && methodRes.sms_forward_method || 'smtp').toLowerCase();
      var enabledRes = await forwardFetchJson('/sms_forward_enabled');
      var powerRes = await forwardFetchJson('/power_status_forward_enabled').catch(function () { return {}; });

      var smtp = await forwardFetchJson('/sms_forward_mail').catch(function (e) { if (method === 'smtp') throw e; return {}; });
      var curl = await forwardFetchJson('/sms_forward_curl').catch(function (e) { if (method === 'curl') throw e; return {}; });
      var dingtalk = await forwardFetchJson('/sms_forward_dingtalk').catch(function (e) { if (method === 'dingtalk') throw e; return {}; });

      var data = {
        method: method,
        enabled: enabledRes && enabledRes.enabled,
        powerEnabled: powerRes && powerRes.enabled,
        smtp: smtp || {},
        curl: curl || {},
        dingtalk: dingtalk || {}
      };

      renderNativeForwardConfig(data);
      return data;
    } catch (e) {
      setNativeForwardStatus('读取失败', 'error', '原生配置读取失败：' + (e && e.message ? e.message : String(e)));
      if (typeof createToast === 'function') createToast('原生消息转发配置读取失败', 'red');
      return null;
    } finally {
      nativeForwardState.busy = false;
      updateNativeForwardControls();
    }
  }


  function getForwardInputValue(selector) {
    var el = document.querySelector(selector);
    return el && 'value' in el ? String(el.value || '').trim() : '';
  }

  function getForwardChecked(selector) {
    var el = document.querySelector(selector);
    return !!(el && el.checked);
  }

  function setForwardChecked(selector, value) {
    var el = document.querySelector(selector);
    if (el) el.checked = String(value) === '1' || value === true;
  }

  function getNativeForwardMethodFromUI() {
    var el = document.querySelector('#kn-native-forward-method-select');
    return String(el && el.value || 'smtp').toLowerCase();
  }

  function setNativeForwardMethodUI(method) {
    method = String(method || '').toLowerCase();
    if (['smtp', 'curl', 'dingtalk'].indexOf(method) < 0) method = '';
    var select = document.querySelector('#kn-native-forward-method-select');
    if (select && method) select.value = method;
    var current = method || getNativeForwardMethodFromUI();
    Array.prototype.slice.call(document.querySelectorAll('[data-native-method-card]')).forEach(function (card) {
      var active = !!current && card.getAttribute('data-native-method-card') === current;
      card.classList.toggle('is-active-method', active);
      card.classList.toggle('is-inactive-method', !active);
      card.hidden = !active;
    });
    setForwardText('#kn-native-forward-method', current ? getForwardMethodLabel(current) : '--');
    setForwardText('#kn-native-forward-method-raw', current || '--');
  }

  function validateNativeForwardConfig(method) {
    if (method === 'dingtalk') {
      var webhook = getForwardInputValue('#kn-native-dingtalk-webhook');
      if (!webhook) return '请输入钉钉 Webhook 地址';
      if (!/^https?:\/\//i.test(webhook)) return '钉钉 Webhook 需要以 http:// 或 https:// 开头';
      return '';
    }
    if (method === 'curl') {
      if (!getForwardInputValue('#kn-native-curl-text')) return '请输入 CURL 命令 / 模板';
      return '';
    }
    if (method === 'smtp') {
      if (!getForwardInputValue('#kn-native-smtp-host')) return '请输入 SMTP 主机';
      var port = Number(getForwardInputValue('#kn-native-smtp-port'));
      if (!port) return '请输入 SMTP 端口';
      if (!Number.isInteger(port) || port < 1 || port > 65535) return 'SMTP 端口需要是 1-65535 的整数';
      var user = getForwardInputValue('#kn-native-smtp-user');
      if (!user) return '请输入 SMTP 账号';
      if (!getForwardInputValue('#kn-native-smtp-pass')) return '请输入 SMTP 密码';
      var recipient = getForwardInputValue('#kn-native-smtp-to');
      if (!recipient) return '请输入收件人';
      if (recipient.indexOf('@') < 1) return '请输入有效的收件人邮箱';
      return '';
    }
    return '';
  }

  function validateNativeForwardUI() {
    var active = getForwardChecked('#kn-native-forward-enable') || getForwardChecked('#kn-native-power-enable');
    if (!active) {
      setNativeForwardStatus('转发已关闭', '', '消息转发和电源通知均已关闭，无需校验通道');
      return true;
    }
    var method = getNativeForwardMethodFromUI();
    var err = validateNativeForwardConfig(method);
    if (err) {
      setNativeForwardStatus(err, 'error');
      if (typeof createToast === 'function') createToast(err, 'red');
      return false;
    }
    setNativeForwardStatus(nativeForwardState.dirty ? '配置完整 · 待保存' : '配置完整 · ' + getForwardMethodLabel(method), nativeForwardState.dirty ? 'warn' : 'ok', '当前通道的必填项已填写完整');
    if (typeof createToast === 'function') createToast('当前通道配置完整', 'green');
    return true;
  }

  async function postNativeForwardJson(path, payload) {
    return forwardFetchJson(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json;charset=UTF-8' },
      body: payload == null ? undefined : JSON.stringify(payload)
    });
  }

  function assertNativeForwardResult(res) {
    if (!res || !res.result) return res;
    var result = String(res.result).toLowerCase();
    if (result !== 'success' && result !== 'ok') throw new Error(res.error || res.message || '原生接口返回失败');
    return res;
  }

  async function saveNativeMessageForwardConfig(options) {
    options = options || {};
    if (!getStoredLoginState() || !nativeForwardState.loaded || nativeForwardState.busy) return null;
    var method = getNativeForwardMethodFromUI();
    var active = getForwardChecked('#kn-native-forward-enable') || getForwardChecked('#kn-native-power-enable');
    var err = active ? validateNativeForwardConfig(method) : '';
    if (err) {
      if (typeof createToast === 'function') createToast(err, 'red');
      setNativeForwardStatus(err, 'error');
      return null;
    }

    nativeForwardState.busy = true;
    setNativeForwardStatus('正在保存…', 'loading', '正在将原生消息转发配置写入设备');
    updateNativeForwardControls();

    try {
      assertNativeForwardResult(await forwardFetchJson('/sms_forward_enabled?enable=' + (getForwardChecked('#kn-native-forward-enable') ? '1' : '0'), {
        method: 'post',
        headers: { 'Content-Type': 'application/json' }
      }));
      assertNativeForwardResult(await forwardFetchJson('/power_status_forward_enabled?enable=' + (getForwardChecked('#kn-native-power-enable') ? '1' : '0'), {
        method: 'post',
        headers: { 'Content-Type': 'application/json' }
      }));

      var res = null;
      if (active && method === 'smtp') {
        res = await postNativeForwardJson('/sms_forward_mail', {
          smtp_host: getForwardInputValue('#kn-native-smtp-host'),
          smtp_port: getForwardInputValue('#kn-native-smtp-port'),
          smtp_username: getForwardInputValue('#kn-native-smtp-user'),
          smtp_password: getForwardInputValue('#kn-native-smtp-pass'),
          smtp_to: getForwardInputValue('#kn-native-smtp-to'),
          forward_dev_info: getForwardChecked('#kn-native-forward-devinfo') ? '1' : '0'
        });
      } else if (active && method === 'curl') {
        res = await postNativeForwardJson('/sms_forward_curl', {
          curl_text: getForwardInputValue('#kn-native-curl-text')
        });
      } else if (active && method === 'dingtalk') {
        res = await postNativeForwardJson('/sms_forward_dingtalk', {
          webhook_url: getForwardInputValue('#kn-native-dingtalk-webhook'),
          secret: getForwardInputValue('#kn-native-dingtalk-secret'),
          forward_dev_info: getForwardChecked('#kn-native-forward-devinfo') ? '1' : '0'
        });
      }

      assertNativeForwardResult(res);

      nativeForwardState.dirty = false;
      nativeForwardState.snapshot = getNativeForwardSnapshot(collectNativeForwardConfig());
      setNativeForwardStatus('已保存 · ' + getForwardMethodLabel(method), 'ok');
      if (typeof createToast === 'function' && !options.silent) {
        createToast('原生消息转发配置已保存', 'green');
      }
      await readNativeMessageForwardConfig({ force: true });
      return res || { result: 'success' };
    } catch (e) {
      var msg = e && e.message ? e.message : String(e);
      setNativeForwardStatus('保存失败', 'error', '原生配置保存失败：' + msg);
      if (typeof createToast === 'function') createToast('原生消息转发保存失败：' + msg, 'red');
      return null;
    } finally {
      nativeForwardState.busy = false;
      updateNativeForwardControls();
    }
  }

  async function triggerNativeForwardTest() {
    return validateNativeForwardUI();
  }

  function updateForwardPhoneControls(scope) {
    scope = scope || document;
    var enable = scope.querySelector('[data-forward="enableCallForward"]');
    var active = !!(enable && enable.checked);
    var card = scope.querySelector('#kn-forward-call-card');
    var templateCard = scope.querySelector('#kn-forward-call-template-card');
    [card, templateCard].forEach(function (el) {
      if (el) el.classList.toggle('is-disabled', !active);
    });
    Array.prototype.slice.call(scope.querySelectorAll('[data-forward]')).forEach(function (el) {
      if (el.getAttribute('data-forward') === 'enableCallForward') return;
      el.disabled = !active;
    });
    Array.prototype.slice.call(scope.querySelectorAll('[data-action="saveForwardConfig"],[data-action="testForwardConfig"]')).forEach(function (btn) {
      btn.disabled = !active;
    });
  }

  function bindForwardControls(scope) {
    if (!scope) return;
    var cfg = getForwardConfig();
    Array.prototype.slice.call(scope.querySelectorAll('[data-forward]')).forEach(function (el) {
      var key = el.getAttribute('data-forward');
      if (!key) return;
      if (el.type === 'checkbox') el.checked = !!cfg[key];
      else if (el.type === 'radio') el.checked = cfg[key] === el.value;
      else el.value = cfg[key] == null ? '' : cfg[key];
      el.oninput = el.onchange = function () {
        var next = getForwardConfig();
        if (el.type === 'checkbox') next[key] = !!el.checked;
        else if (el.type === 'radio') { if (el.checked) next[key] = el.value; }
        else next[key] = el.value;
        saveForwardConfig(next);
        updateForwardPhoneControls(scope);
      };
    });
    updateForwardPhoneControls(scope);
    Array.prototype.slice.call(scope.querySelectorAll('[data-native-forward-field]')).forEach(function (el) {
      var eventName = el.tagName === 'SELECT' || el.type === 'checkbox' ? 'change' : 'input';
      el.addEventListener(eventName, function () {
        if (el.id === 'kn-native-forward-method-select') setNativeForwardMethodUI(el.value);
        markNativeForwardDirty();
      });
    });
    Array.prototype.slice.call(scope.querySelectorAll('[data-secret-target]')).forEach(function (btn) {
      btn.onclick = function () {
        var input = scope.querySelector(btn.getAttribute('data-secret-target'));
        if (!input) return;
        var show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        btn.textContent = show ? '隐藏' : '显示';
        btn.setAttribute('aria-pressed', show ? 'true' : 'false');
      };
    });
    setNativeForwardMethodUI(getNativeForwardMethodFromUI());
    setTimeout(readNativeMessageForwardConfig, 80);
  }

  function openNativeSmsForward() {
    closeSettingsDialog();
    setTimeout(function () { triggerHeaderMenuAction('smsForward'); }, 120);
  }

  async function triggerForwardConfigTest() {
    var cfg = getForwardConfig();
    saveForwardConfig(cfg);
    if (!cfg.enableCallForward) {
      if (typeof createToast === 'function') createToast('请先启用电话事件转发，再预览电话模板', 'red');
      return;
    }
    var template = String(cfg.callTemplate || '{event} | {number} | {time} | {duration}');
    var demo = template
      .replace(/\{event\}/g, '测试来电')
      .replace(/\{number\}/g, '10086')
      .replace(/\{time\}/g, new Date().toLocaleString())
      .replace(/\{duration\}/g, '00:00');
    console.log('[KanoForward] phone forward preview:', demo);
    var preview = document.querySelector('#kn-forward-call-preview');
    if (preview) {
      preview.hidden = false;
      preview.textContent = demo;
      preview.title = demo;
    }
    if (typeof createToast === 'function') createToast('电话消息模板预览已更新', 'green');
    return demo;
  }

  function openNativePluginFeature() {
    closeSettingsDialog();
    setTimeout(function () { triggerHeaderMenuAction('pluginFeature'); }, 120);
  }

  function findNativePluginSubButton(labels) {
    var list = Array.prototype.slice.call(document.querySelectorAll('button, input[type="button"], input[type="submit"], [role="button"], .btn'));
    var candidates = [];
    list.forEach(function (el) {
      if (!el || !(el instanceof HTMLElement)) return;
      if (el.closest && el.closest('#' + HEADER_ID + ',#' + DIALOG_ID)) return;
      if (el.disabled || el.getAttribute('aria-disabled') === 'true') return;
      var text = clean(el.innerText || el.textContent || el.value || el.getAttribute('title') || el.getAttribute('aria-label') || '');
      var onclick = String(el.getAttribute('onclick') || '').toLowerCase();
      var hay = text + ' ' + onclick;
      var score = 0;
      labels.forEach(function (label) {
        if (!label) return;
        if (text === label) score += 120;
        else if (text.indexOf(label) !== -1) score += 70;
        else if (hay.indexOf(label) !== -1) score += 35;
      });
      if (onclick.indexOf('plugin') !== -1) score += 18;
      if (isElementVisibleEnough(el)) score += 12;
      if (text.length > 48) score -= 30;
      if (score > 0) candidates.push({ el: el, score: score });
    });
    candidates.sort(function (a, b) { return b.score - a.score; });
    return candidates[0] ? candidates[0].el : null;
  }

  function triggerNativePluginSubAction(type) {
    var map = {
      manage: { labels: ['插件功能', '插件管理', '插件列表'], fallback: '插件功能' },
      add: { labels: ['添加插件', '导入插件', '新增插件', '导入'], fallback: '添加插件' },
      store: { labels: ['插件商店', '插件市场', '商店'], fallback: '插件商店' },
      export: { labels: ['导出插件', '插件导出', '导出'], fallback: '导出插件' },
      importExport: { labels: ['导入与导出', '导入导出', '导入', '导出'], fallback: '导入/导出' },
      files: { labels: ['上传文件管理', '上传文件', '文件管理'], fallback: '上传文件管理' }
    };
    var meta = map[type] || map.manage;
    openNativePluginFeature();
    setTimeout(function () {
      var btn = findNativePluginSubButton(meta.labels);
      var rootBtn = findNativeActionButton('pluginFeature');
      if (btn && !(rootBtn && rootBtn.isSameNode && rootBtn.isSameNode(btn))) {
        try { btn.click(); } catch (e) {}
      } else if (typeof createToast === 'function') {
        createToast('已打开插件功能；未找到「' + meta.fallback + '」的独立入口', 'pink');
      } else {
        console.warn('[KanoWebOS] 已打开插件功能；未找到独立入口:', meta.fallback);
      }
    }, 520);
  }


  var knPluginManager = { loaded: false, dirty: false, rawText: '', extras: '', plugins: [], activeId: '', search: '', renameMode: false };

  function knPluginToast(msg, type) {
    if (typeof createToast === 'function') createToast(msg, type || 'pink');
    else console.log('[KanoPluginManager]', msg);
  }

  function knPluginGetBaseURL() {
    try { if (typeof KANO_baseURL !== 'undefined' && KANO_baseURL) return KANO_baseURL; } catch (e) {}
    return '/api';
  }

  function knPluginGetHeaders() {
    try { if (typeof common_headers !== 'undefined' && common_headers) return Object.assign({}, common_headers); } catch (e) {}
    var headers = {};
    try {
      var token = localStorage.getItem('kano_sms_token') || localStorage.getItem('KANO_TOKEN') || '';
      if (token) headers.authorization = token;
    } catch (e) {}
    return headers;
  }

  async function knPluginGetCustomHead() {
    if (typeof getCustomHead === 'function') {
      var t = await getCustomHead();
      return t || '';
    }
    var res = await fetch(knPluginGetBaseURL() + '/get_custom_head?t=' + Date.now(), { headers: knPluginGetHeaders() });
    var data = await res.json();
    return data && data.text ? data.text : '';
  }

  async function knPluginSetCustomHead(text) {
    if (typeof setCustomHead === 'function') return await setCustomHead(text || '');
    var res = await fetch(knPluginGetBaseURL() + '/set_custom_head', {
      method: 'POST',
      headers: knPluginGetHeaders(),
      body: JSON.stringify({ text: text || '' })
    });
    return await res.json();
  }

  function knPluginMakeId(name, index) {
    return 'knp_' + index + '_' + String(name || '').replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '_').slice(0, 40);
  }

  function knPluginIsDisabled(content) {
    var s = String(content || '').trim();

    // 只把“整段插件被原生禁用标记包裹”的情况判定为禁用。
    // 旧逻辑只要源码里出现 [kano_disabled] 字符串就判禁用，
    // 会误伤包含插件管理器自身源码的插件，导致原生启用后这里仍显示禁用。
    if (/^<!--\s*\[kano_disabled\][\s\S]*\[kano_disabled\]\s*-->$/i.test(s)) return true;
    if (/^\[kano_disabled\][\s\S]*\[kano_disabled\]$/i.test(s)) return true;

    return false;
  }

  function knPluginStripDisabled(content) {
    var s = String(content || '').trim();
    s = s.replace(/^\s*<!--\s*\[kano_disabled\]\s*/i, '');
    s = s.replace(/\s*\[kano_disabled\]\s*-->\s*$/i, '');
    s = s.replace(/^\s*\[kano_disabled\]\s*/i, '');
    s = s.replace(/\s*\[kano_disabled\]\s*$/i, '');
    return s.trim();
  }

  function knPluginApplyEnabled(content, enabled) {
    var cleanContent = knPluginStripDisabled(content);
    if (enabled) return cleanContent;
    return '<!-- [kano_disabled]\n' + cleanContent + '\n[kano_disabled] -->';
  }

  function knPluginParse(text) {
    var source = String(text || '');
    var regex = /<!--\s*\[KANO_PLUGIN_START\]\s*(.*?)\s*-->([\s\S]*?)<!--\s*\[KANO_PLUGIN_END\]\s*\1\s*-->/g;
    var plugins = [];
    var extras = [];
    var last = 0;
    var match;
    while ((match = regex.exec(source)) !== null) {
      if (match.index > last) {
        var extra = source.slice(last, match.index).trim();
        if (extra) extras.push(extra);
      }
      var name = String(match[1] || '').replace(/-->/g, '').trim() || ('未命名插件 ' + (plugins.length + 1));
      var content = String(match[2] || '').trim();
      plugins.push({
        id: knPluginMakeId(name, plugins.length),
        name: name,
        content: knPluginStripDisabled(content),
        enabled: !knPluginIsDisabled(content),
        originalName: name
      });
      last = regex.lastIndex;
    }
    if (last < source.length) {
      var tail = source.slice(last).trim();
      if (tail) extras.push(tail);
    }
    return { plugins: plugins, extras: extras.join('\n\n') };
  }

  function knPluginSerialize() {
    var blocks = [];
    if (knPluginManager.extras && knPluginManager.extras.trim()) blocks.push(knPluginManager.extras.trim());
    knPluginManager.plugins.forEach(function (p) {
      var safeName = String(p.name || '未命名插件').replace(/-->/g, '').trim();
      var body = knPluginApplyEnabled(p.content || '', !!p.enabled);
      blocks.push('<!-- [KANO_PLUGIN_START] ' + safeName + ' -->\n' + body + '\n<!-- [KANO_PLUGIN_END] ' + safeName + ' -->');
    });
    return blocks.join('\n\n\n');
  }

  function knPluginShortStatus(text) {
    var raw = String(text || '').trim();
    if (!raw) return '';
    if (/^读取完成/.test(raw)) return raw.replace(/读取完成：\s*/, '已读取：');
    if (/^正在/.test(raw)) return raw.replace(/插件列表/, '插件');
    if (/^(已启用并保存|已停用并保存)/.test(raw)) return raw.indexOf('已启用') === 0 ? '已启用并保存' : '已停用并保存';
    if (/^已重命名并保存/.test(raw)) return '已重命名并保存';
    if (/^已删除并保存/.test(raw)) return '已删除并保存';
    if (/^已导入插件并保存/.test(raw)) return '已导入并保存';
    if (/^排序已保存/.test(raw)) return '排序已保存';
    if (/^插件配置已保存/.test(raw)) return '配置已保存';
    if (raw.length > 22) return raw.slice(0, 22) + '…';
    return raw;
  }

  function knPluginSetStatus(text, mode) {
    var el = document.getElementById('kn-plugin-status');
    if (!el) return;
    var raw = String(text || '').trim();
    el.textContent = knPluginShortStatus(raw);
    el.title = raw;
    el.className = 'kn-plugin-status ' + (mode || '');
  }

  function knPluginGetActive() {
    return knPluginManager.plugins.find(function (p) { return p.id === knPluginManager.activeId; }) || null;
  }

  function knPluginFilteredList() {
    var kw = String(knPluginManager.search || '').trim().toLowerCase();
    if (!kw) return knPluginManager.plugins;
    return knPluginManager.plugins.filter(function (p) {
      return String(p.name || '').toLowerCase().indexOf(kw) !== -1 || String(p.content || '').toLowerCase().indexOf(kw) !== -1;
    });
  }

  function knPluginRenderList() {
    var list = document.getElementById('kn-plugin-list');
    var count = document.getElementById('kn-plugin-count');
    if (!list) return;
    var enabledCount = knPluginManager.plugins.filter(function (p) { return p.enabled; }).length;
    if (count) count.textContent = knPluginManager.plugins.length + ' 个插件 · ' + enabledCount + ' 个启用';
    var arr = knPluginFilteredList();
    if (!arr.length) {
      list.innerHTML = '<div class="kn-plugin-empty">暂无插件，或没有匹配搜索条件。</div>';
      return;
    }
    list.innerHTML = arr.map(function (p) {
      var idx = knPluginManager.plugins.indexOf(p);
      var size = new Blob([p.content || '']).size;
      return '<div class="kn-plugin-row ' + (p.enabled ? 'enabled' : 'disabled') + ' ' + (p.id === knPluginManager.activeId ? 'active' : '') + '" data-plugin-id="' + knEsc(p.id) + '" title="' + knEsc(p.name || '') + '">' +
        '<div class="kn-plugin-row-main" data-plugin-action="select" data-plugin-id="' + knEsc(p.id) + '">' +
          '<div class="kn-plugin-row-title"><span>' + knEsc(p.name) + '</span></div>' +
          '<div class="kn-plugin-row-meta">#' + (idx + 1) + ' · ' + size + ' B</div>' +
        '</div>' +
        '<div class="kn-plugin-row-tools">' +
          '<button type="button" class="kn-plugin-toggle ' + (p.enabled ? 'on' : 'off') + '" data-plugin-action="toggle" data-plugin-id="' + knEsc(p.id) + '" aria-label="' + (p.enabled ? '停用插件' : '启用插件') + '"><span></span></button>' +
          '<button type="button" class="kn-plugin-mini" data-plugin-action="up" data-plugin-id="' + knEsc(p.id) + '" title="上移">↑</button>' +
          '<button type="button" class="kn-plugin-mini" data-plugin-action="down" data-plugin-id="' + knEsc(p.id) + '" title="下移">↓</button>' +
        '</div>' +
      '</div>';
    }).join('');
  }



  function knPluginActionIcon(name) {
    var icons = {
      save: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h12.2L21 6.8V21H5V3zm2 2v14h12V7.7L16.3 5H15v5H8V5H7zm3 0v3h3V5h-3zm-1 10h8v2H9v-2z"/></svg>',
      copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 7V3h13v13h-4v5H3V7h5zm2 0h7v7h2V5h-9v2zm-5 2v10h10V9H5z"/></svg>',
      trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6l1 2h5v2H3V5h5l1-2zm-3 6h12l-1 12H7L6 9zm3 2 .5 8h1.7l-.3-8H9zm4 0-.3 8h1.7l.5-8H13z"/></svg>',
      warn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 22 20H2L12 2zm0 4.2L5.4 18h13.2L12 6.2zM11 10h2v4h-2v-4zm0 5h2v2h-2v-2z"/></svg>',
      edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 17.25V20h2.75L17.8 8.95l-2.75-2.75L4 17.25zM19.7 7.05c.4-.4.4-1.02 0-1.42l-1.33-1.33a1 1 0 0 0-1.42 0l-1.04 1.04 2.75 2.75 1.04-1.04z"/></svg>'
    };
    return '<span class="kn-action-ico">' + (icons[name] || '') + '</span>';
  }

  function knPluginRenderEditor() {
    var item = knPluginGetActive();
    var nameInput = document.getElementById('kn-plugin-editor-name');
    var codeInput = document.getElementById('kn-plugin-editor-code');
    var stateEl = document.getElementById('kn-plugin-editor-state');
    var titleNameEl = document.getElementById('kn-plugin-editor-title-name');
    var nameField = nameInput && nameInput.closest ? nameInput.closest('.kn-plugin-name-field') : null;
    if (!nameInput || !codeInput) return;
    var delBtn = document.querySelector('[data-plugin-action="deleteSelected"]');
    if (delBtn && (!knPluginManager.deleteConfirmUntil || knPluginManager.deleteConfirmUntil < Date.now())) {
      delBtn.innerHTML = knPluginActionIcon('trash') + '<span class="kn-action-text">删除插件</span>'; 
      delBtn.title = '删除插件';
      delBtn.classList.remove('confirming');
    }
    if (!item) {
      if (nameField) nameField.classList.remove('renaming');
      knPluginManager.renameMode = false;
      nameInput.value = '';
      codeInput.value = '';
      nameInput.disabled = true;
      codeInput.disabled = true;
      if (stateEl) stateEl.textContent = '';
      if (titleNameEl) titleNameEl.textContent = '未选择插件';
      knPluginSyncCodeEditor();
      return;
    }
    nameInput.disabled = false;
    codeInput.disabled = false;
    nameInput.value = item.name || '';
    codeInput.value = item.content || '';
    if (stateEl) stateEl.textContent = '';
    if (titleNameEl) titleNameEl.textContent = item.name || '未命名插件';
    if (nameField) nameField.classList.toggle('renaming', !!knPluginManager.renameMode);
    knPluginSyncCodeEditor();
  }

  function knPluginHighlightLine(line) {
    var out = '';
    var i = 0;
    var len = line.length;
    var keywords = /^(async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|export|extends|finally|for|function|if|import|in|instanceof|let|new|return|switch|throw|try|typeof|var|void|while|with|yield|true|false|null|undefined)\b/;
    while (i < len) {
      var ch = line[i];
      var rest = line.slice(i);
      if (rest.indexOf('//') === 0) {
        out += '<span class="kn-code-token-comment">' + knEsc(rest) + '</span>';
        break;
      }
      if (ch === '"' || ch === "'" || ch === '`') {
        var quote = ch;
        var j = i + 1;
        while (j < len) {
          if (line[j] === '\\') { j += 2; continue; }
          if (line[j] === quote) { j += 1; break; }
          j += 1;
        }
        out += '<span class="kn-code-token-string">' + knEsc(line.slice(i, j)) + '</span>';
        i = j;
        continue;
      }
      var km = rest.match(keywords);
      if (km) {
        out += '<span class="kn-code-token-keyword">' + knEsc(km[0]) + '</span>';
        i += km[0].length;
        continue;
      }
      var nm = rest.match(/^\b\d+(?:\.\d+)?\b/);
      if (nm) {
        out += '<span class="kn-code-token-number">' + knEsc(nm[0]) + '</span>';
        i += nm[0].length;
        continue;
      }
      var fm = rest.match(/^[A-Za-z_$][\w$]*(?=\s*\()/);
      if (fm) {
        out += '<span class="kn-code-token-fn">' + knEsc(fm[0]) + '</span>';
        i += fm[0].length;
        continue;
      }
      out += knEsc(ch);
      i += 1;
    }
    return out || ' ';
  }

  function knPluginHighlightCode(code) {
    return String(code || '').split('\n').map(knPluginHighlightLine).join('\n');
  }

  var knPluginEditorRaf = 0;
  var knPluginEditorHighlightTimer = 0;
  var knPluginEditorLastLineCount = 0;
  var knPluginEditorLastHighlighted = '';

  function knPluginSyncEditorScrollOnly() {
    var codeInput = document.getElementById('kn-plugin-editor-code');
    var lines = document.getElementById('kn-plugin-editor-lines');
    var highlight = document.getElementById('kn-plugin-editor-highlight');
    if (!codeInput) return;
    if (lines) lines.scrollTop = codeInput.scrollTop || 0;
    if (highlight) {
      highlight.scrollTop = codeInput.scrollTop || 0;
      highlight.scrollLeft = codeInput.scrollLeft || 0;
    }
  }

  function knPluginCountLines(value) {
    value = String(value || '');
    var count = 1;
    for (var i = 0; i < value.length; i += 1) {
      if (value.charCodeAt(i) === 10) count += 1;
    }
    return count;
  }

  function knPluginRenderEditorHighlight(force) {
    var codeInput = document.getElementById('kn-plugin-editor-code');
    var lines = document.getElementById('kn-plugin-editor-lines');
    var highlight = document.getElementById('kn-plugin-editor-highlight');
    if (!codeInput) return;

    // v26.9.6：插件源码编辑改为轻量模式。
    // 旧版每次输入都会对整段源码做 innerHTML 语法高亮，长插件会明显卡顿，甚至阻塞设置弹窗点击。
    // 现在 textarea 直接显示真实文本，只保留行号；高亮层清空并隐藏。
    var value = codeInput.value || '';
    var lineCount = Math.max(1, knPluginCountLines(value));

    if (lines && (force || lineCount !== knPluginEditorLastLineCount)) {
      // v26.9.8：不再截断 1800 行后的行号；源码内容始终由 textarea 完整承载。
      var nums = [];
      for (var i = 1; i <= lineCount; i += 1) nums.push(i);
      lines.textContent = nums.join('\n');
      knPluginEditorLastLineCount = lineCount;
    }

    if (highlight && (force || knPluginEditorLastHighlighted !== '')) {
      highlight.textContent = '';
      highlight.innerHTML = '';
      knPluginEditorLastHighlighted = '';
    }

    knPluginSyncEditorScrollOnly();
  }

  function knPluginScheduleHighlight(force) {
    if (knPluginEditorHighlightTimer) window.clearTimeout(knPluginEditorHighlightTimer);
    knPluginEditorHighlightTimer = window.setTimeout(function () {
      knPluginRenderEditorHighlight(!!force);
    }, force ? 0 : 320);
  }

  function knPluginSyncCodeEditor() {
    if (knPluginEditorRaf) return;
    knPluginEditorRaf = window.requestAnimationFrame(function () {
      knPluginEditorRaf = 0;
      knPluginRenderEditorHighlight(false);
    });
  }

  function knPluginApplyEditor(silent) {
    var item = knPluginGetActive();
    if (!item) {
      if (!silent) knPluginToast('请先选择一个插件', 'red');
      return false;
    }
    var nameInput = document.getElementById('kn-plugin-editor-name');
    var codeInput = document.getElementById('kn-plugin-editor-code');
    var valid = knPluginValidateName(nameInput ? nameInput.value : item.name, item.id);
    if (!valid.ok) {
      if (!silent) knPluginToast(valid.message, 'red');
      return false;
    }
    item.name = valid.name;
    item.content = codeInput ? codeInput.value : item.content;
    knPluginManager.renameMode = false;
    var nameField = nameInput && nameInput.closest ? nameInput.closest('.kn-plugin-name-field') : null;
    if (nameField) nameField.classList.remove('renaming');
    knPluginManager.dirty = true;
    if (!silent) knPluginSetStatus('当前插件已更新到待保存配置。', 'warn');
    knPluginRenderList();
    knPluginSyncCodeEditor();
    return true;
  }

  async function knPluginCommit(message, shouldReload) {
    knPluginSetStatus('正在保存插件配置…', 'checking');
    try {
      var result = await knPluginSetCustomHead(knPluginSerialize());
      if (!result || result.result !== 'success') {
        throw new Error(result && result.error ? result.error : '保存接口返回失败');
      }
      knPluginManager.dirty = false;
      knPluginSetStatus(message || '插件配置已保存。页面即将刷新并载入新插件。', 'ok');
      knPluginToast(shouldReload ? '插件配置已保存，正在刷新页面' : '插件配置已保存', 'green');
      if (shouldReload) {
        setTimeout(function () { location.reload(); }, 650);
        return true;
      }
      knPluginRenderAll();
      return true;
    } catch (e) {
      console.error('[KanoWebOS] 保存插件配置失败:', e);
      knPluginSetStatus('保存失败：' + (e && e.message ? e.message : String(e)), 'error');
      knPluginToast('保存插件失败', 'red');
      return false;
    }
  }

  async function knPluginSaveCurrent() {
    if (!knPluginApplyEditor(true)) return;
    var item = knPluginGetActive();
    await knPluginCommit('插件已保存：' + (item ? item.name : '') + '。正在刷新页面载入新插件。', true);
  }

  function knPluginBeginRename() {
    var item = knPluginGetActive();
    if (!item) {
      knPluginToast('请先选择一个插件', 'red');
      return;
    }
    var nameInput = document.getElementById('kn-plugin-editor-name');
    var field = nameInput && nameInput.closest ? nameInput.closest('.kn-plugin-name-field') : null;
    if (!nameInput) return;
    knPluginManager.renameMode = true;
    if (field) field.classList.add('renaming');
    nameInput.disabled = false;
    nameInput.focus();
    nameInput.select();
    knPluginSetStatus('正在重命名：修改名称后点击保存图标。', 'checking');
  }

  function knPluginRenderAll() {
    knPluginRenderList();
    knPluginRenderEditor();
  }

  async function knPluginRefresh() {
    knPluginSetStatus('正在读取插件配置…', 'checking');
    try {
      var text = await knPluginGetCustomHead();
      var parsed = knPluginParse(text);
      knPluginManager.rawText = text;
      knPluginManager.plugins = parsed.plugins;
      knPluginManager.extras = parsed.extras;
      knPluginManager.loaded = true;
      knPluginManager.dirty = false;
      knPluginManager.activeId = knPluginManager.plugins[0] ? knPluginManager.plugins[0].id : '';
      knPluginSetStatus('读取完成：' + knPluginManager.plugins.length + ' 个插件。', 'ok');
      knPluginRenderAll();
    } catch (e) {
      console.error('[KanoWebOS] 读取插件失败:', e);
      knPluginSetStatus('读取失败：' + (e && e.message ? e.message : String(e)), 'error');
      knPluginRenderAll();
    }
  }

  function knPluginValidateName(name, currentId) {
    var finalName = String(name || '').replace(/-->/g, '').trim();
    if (!finalName) return { ok: false, message: '插件名称不能为空' };
    var dup = knPluginManager.plugins.find(function (p) { return p.id !== currentId && p.name === finalName; });
    if (dup) return { ok: false, message: '插件名称已存在：' + finalName };
    return { ok: true, name: finalName };
  }

  function knPluginRename(id) {
    var item = knPluginManager.plugins.find(function (p) { return p.id === id; });
    if (!item) return;
    var next = prompt('输入新的插件名称', item.name || '');
    if (next == null) return;
    var valid = knPluginValidateName(next, item.id);
    if (!valid.ok) return knPluginToast(valid.message, 'red');
    item.name = valid.name;
    knPluginManager.activeId = item.id;
    knPluginManager.dirty = true;
    knPluginRenderAll();
    knPluginCommit('已重命名并保存：' + item.name + '。刷新页面后完整生效。', false);
  }

  function knPluginToggle(id) {
    var item = knPluginManager.plugins.find(function (p) { return p.id === id; });
    if (!item) return;
    item.enabled = !item.enabled;
    knPluginManager.activeId = item.id;
    knPluginManager.dirty = true;
    knPluginRenderAll();
    knPluginCommit((item.enabled ? '已启用并保存：' : '已停用并保存：') + item.name + '。刷新页面后完整生效。', false);
  }

  function knPluginMove(id, dir) {
    var idx = knPluginManager.plugins.findIndex(function (p) { return p.id === id; });
    if (idx < 0) return;
    var next = idx + dir;
    if (next < 0 || next >= knPluginManager.plugins.length) return;
    var tmp = knPluginManager.plugins[idx];
    knPluginManager.plugins[idx] = knPluginManager.plugins[next];
    knPluginManager.plugins[next] = tmp;
    knPluginManager.activeId = id;
    knPluginManager.dirty = true;
    knPluginRenderAll();
    knPluginCommit('排序已保存。刷新页面后完整生效。', false);
  }

  function knPluginDelete(id) {
    var item = knPluginManager.plugins.find(function (p) { return p.id === id; });
    if (!item) return;
    var btn = document.querySelector('[data-plugin-action="deleteSelected"]');
    var now = Date.now();
    if (knPluginManager.deleteConfirmId !== id || !knPluginManager.deleteConfirmUntil || knPluginManager.deleteConfirmUntil < now) {
      knPluginManager.deleteConfirmId = id;
      knPluginManager.deleteConfirmUntil = now + 5000;
      if (btn) {
        btn.innerHTML = knPluginActionIcon('warn') + '<span class="kn-action-text">确认删除</span>'; 
        btn.title = '再次点击确认删除';
        btn.classList.add('confirming');
      }
      knPluginSetStatus('危险操作：5 秒内再次点击“再次点击确认删除”才会删除「' + item.name + '」。', 'error');
      setTimeout(function () {
        if (knPluginManager.deleteConfirmId === id && Date.now() > knPluginManager.deleteConfirmUntil) {
          knPluginManager.deleteConfirmId = '';
          if (btn) {
            btn.innerHTML = knPluginActionIcon('trash') + '<span class="kn-action-text">删除插件</span>'; 
            btn.title = '删除插件';
            btn.classList.remove('confirming');
          }
        }
      }, 5200);
      return;
    }
    if (!confirm('最终确认删除插件「' + item.name + '」？此操作会从待保存配置中移除该插件。')) return;
    knPluginManager.deleteConfirmId = '';
    knPluginManager.deleteConfirmUntil = 0;
    knPluginManager.plugins = knPluginManager.plugins.filter(function (p) { return p.id !== id; });
    knPluginManager.activeId = knPluginManager.plugins[0] ? knPluginManager.plugins[0].id : '';
    knPluginManager.dirty = true;
    knPluginRenderAll();
    knPluginCommit('已删除并保存：' + item.name + '。刷新页面后完整生效。', false);
  }

  async function knPluginSave() {
    if (knPluginGetActive() && !knPluginApplyEditor(true)) return;
    await knPluginCommit('插件配置已保存，正在刷新页面以重新加载插件…', true);
  }

  function knPluginExport() {
    var text = knPluginSerialize();
    var b = new Blob([text], { type: 'text/plain;charset=utf-8' });
    var date = new Date().toLocaleString('zh-cn').replace(/[\s/:]/g, '_');
    if (typeof saveAs === 'function') saveAs(b, 'UFI-TOOLS_Plugins_' + date + '.txt');
    else {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(b);
      a.download = 'UFI-TOOLS_Plugins_' + date + '.txt';
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    }
  }

  function knPluginImportText(str, fileName) {
    var parsed = knPluginParse(str || '');
    if (parsed.plugins.length) {
      parsed.plugins.forEach(function (p) {
        var base = p.name;
        var name = base;
        var i = 2;
        while (knPluginManager.plugins.some(function (x) { return x.name === name; })) name = base + ' (' + (i++) + ')';
        p.name = name;
        p.id = knPluginMakeId(name, knPluginManager.plugins.length + Math.floor(Math.random() * 10000));
        knPluginManager.plugins.push(p);
      });
    } else {
      var name = String(fileName || '未命名插件').replace(/-->/g, '').trim();
      var baseName = name || '未命名插件';
      var n = baseName;
      var j = 2;
      while (knPluginManager.plugins.some(function (x) { return x.name === n; })) n = baseName + ' (' + (j++) + ')';
      knPluginManager.plugins.push({ id: knPluginMakeId(n, knPluginManager.plugins.length), name: n, content: String(str || '').trim(), enabled: true, originalName: n });
    }
    knPluginManager.activeId = knPluginManager.plugins[knPluginManager.plugins.length - 1].id;
    knPluginManager.dirty = true;
    knPluginRenderAll();
    knPluginCommit('已导入插件并保存。刷新页面后完整生效。', false);
  }

  function knPluginBindManager(dialog) {
    if (!dialog) return;
    var file = dialog.querySelector('#kn-plugin-import-file');
    if (file) {
      file.onchange = function (e) {
        var f = e.target.files && e.target.files[0];
        if (!f) return;
        if (f.size > 1145 * 1024) return knPluginToast('插件文件不能超过 1145KB', 'red');
        var reader = new FileReader();
        reader.onload = function (ev) { knPluginImportText(ev.target.result, f.name); file.value = ''; };
        reader.readAsText(f);
      };
    }
    var search = dialog.querySelector('#kn-plugin-search');
    var searchToggle = dialog.querySelector('#kn-plugin-search-toggle');
    var listHead = dialog.querySelector('.kn-plugin-list-head');
    if (searchToggle && listHead) {
      searchToggle.onclick = function () {
        listHead.classList.toggle('search-open');
        if (listHead.classList.contains('search-open') && search) {
          setTimeout(function () { search.focus(); }, 30);
        }
      };
    }
    if (search) search.oninput = function () { knPluginManager.search = search.value || ''; knPluginRenderList(); };
    var codeInput = dialog.querySelector('#kn-plugin-editor-code');
    if (codeInput) {
      codeInput.addEventListener('input', function () { knPluginScheduleHighlight(false); });
      codeInput.addEventListener('scroll', function () {
        if (knPluginEditorRaf) return;
        knPluginEditorRaf = window.requestAnimationFrame(function () {
          knPluginEditorRaf = 0;
          knPluginSyncEditorScrollOnly();
        });
      }, { passive: true });
    }
    var list = dialog.querySelector('#kn-plugin-list');
    if (list) {
      list.onclick = function (e) {
        var btn = e.target.closest && e.target.closest('[data-plugin-action]');
        if (!btn) return;
        var action = btn.getAttribute('data-plugin-action');
        var id = btn.getAttribute('data-plugin-id');
        if (action === 'select') { knPluginManager.activeId = id; knPluginManager.renameMode = false; knPluginRenderAll(); return; }
        if (action === 'toggle') return knPluginToggle(id);
        if (action === 'up') return knPluginMove(id, -1);
        if (action === 'down') return knPluginMove(id, 1);
        if (action === 'rename') return knPluginRename(id);
      };
    }
    Array.prototype.slice.call(dialog.querySelectorAll('[data-plugin-action]')).forEach(function (btn) {
      var action = btn.getAttribute('data-plugin-action');
      if (action === 'refresh') btn.onclick = knPluginRefresh;
      if (action === 'import') btn.onclick = function () { var f = document.getElementById('kn-plugin-import-file'); if (f) f.click(); };
      if (action === 'export') btn.onclick = knPluginExport;
      if (action === 'save') btn.onclick = knPluginSave;
      if (action === 'beginRename') btn.onclick = knPluginBeginRename;
      if (action === 'applyEditor') btn.onclick = knPluginSaveCurrent;
      if (action === 'copyCode') btn.onclick = function () {
        var code = document.getElementById('kn-plugin-editor-code');
        if (code && navigator.clipboard) navigator.clipboard.writeText(code.value || '').then(function () { knPluginToast('源码已复制', 'green'); });
      };
      if (action === 'deleteSelected') btn.onclick = function () { if (knPluginManager.activeId) knPluginDelete(knPluginManager.activeId); };
    });
  }

  function injectModernPluginManagerCSS() {
    if (document.getElementById('kano-webos-plugin-manager-style')) return;
    var style = document.createElement('style');
    style.id = 'kano-webos-plugin-manager-style';
    style.textContent = '' +
      '#' + DIALOG_ID + ' #kn-settings-panel-plugins{height:100%;min-height:0;overflow:hidden}' +
      '#' + DIALOG_ID + ' .kn-plugin-manager-shell{height:100%;min-height:0;display:flex;flex-direction:column;gap:10px;overflow:hidden}' +
      '#' + DIALOG_ID + ' .kn-plugin-topbar{flex:0 0 auto;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:12px;padding:14px 16px;border:1px solid rgba(232,234,237,.10);border-radius:24px;background:linear-gradient(135deg,rgba(138,180,248,.12),rgba(22,25,32,.96));box-shadow:0 10px 26px rgba(0,0,0,.16)}' +
      '#' + DIALOG_ID + ' .kn-plugin-title-block{min-width:0}.kn-plugin-kicker{display:inline-flex;align-items:center;height:22px;padding:0 9px;margin-bottom:6px;border-radius:999px;background:rgba(138,180,248,.10);border:1px solid rgba(138,180,248,.18);color:#a8c7fa;font-size:11px;font-weight:750;letter-spacing:.02em}' +
      '#' + DIALOG_ID + ' .kn-plugin-title{font-size:21px;font-weight:800;color:#f1f3f4;margin-bottom:3px;letter-spacing:-.03em}' +
      '#' + DIALOG_ID + ' .kn-plugin-desc{font-size:12px;line-height:1.45;color:#bdc1c6;max-width:690px}' +
      '#' + DIALOG_ID + ' .kn-plugin-actions{display:inline-flex;align-items:center;justify-content:flex-end;gap:6px;flex-wrap:nowrap;min-width:0;padding:5px;border:1px solid rgba(232,234,237,.10);border-radius:18px;background:rgba(17,19,24,.48)}#' + DIALOG_ID + ' .kn-plugin-tool-btn{position:relative;width:42px;height:38px;border-radius:14px;border:1px solid rgba(232,234,237,.10);background:rgba(255,255,255,.035);color:#d3e3fd;display:inline-flex;align-items:center;justify-content:center;gap:0;cursor:pointer;font-size:15px;font-weight:850;transition:background .16s,border-color .16s,transform .16s}#' + DIALOG_ID + ' .kn-plugin-tool-btn:hover{background:rgba(138,180,248,.14);border-color:rgba(138,180,248,.32);transform:translateY(-1px)}#' + DIALOG_ID + ' .kn-plugin-tool-btn .kn-tool-ico{line-height:1;font-size:17px}#' + DIALOG_ID + ' .kn-plugin-tool-btn .kn-tool-text{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}' +
      '#' + DIALOG_ID + ' .kn-plugin-utilitybar{flex:0 0 auto;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center}' +
      '#' + DIALOG_ID + ' .kn-plugin-risk.top{min-height:40px;display:flex;align-items:center;padding:9px 13px;border-radius:18px;background:rgba(251,188,4,.08);border:1px solid rgba(251,188,4,.16);color:#fdd663;font-size:12px;line-height:1.5}' +
      '#' + DIALOG_ID + ' .kn-plugin-native-row{min-height:40px;display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid rgba(232,234,237,.10);border-radius:18px;background:#171a20;color:#bdc1c6;font-size:12px;white-space:nowrap}' +
      '#' + DIALOG_ID + ' .kn-plugin-native-row>span{font-weight:750;color:#e8eaed;margin-right:2px}' +
      '#' + DIALOG_ID + ' .kn-plugin-status{flex:0 0 auto;padding:8px 12px;border-radius:16px;background:rgba(138,180,248,.08);border:1px solid rgba(138,180,248,.14);color:#d3e3fd;font-size:12px}.kn-plugin-status.ok{background:rgba(52,168,83,.10);border-color:rgba(52,168,83,.18);color:#81c995}.kn-plugin-status.warn{background:rgba(251,188,4,.10);border-color:rgba(251,188,4,.18);color:#fdd663}.kn-plugin-status.error{background:rgba(234,67,53,.10);border-color:rgba(234,67,53,.18);color:#f28b82}.kn-plugin-status.checking{background:rgba(138,180,248,.10);border-color:rgba(138,180,248,.20)}' +
      '#' + DIALOG_ID + ' .kn-plugin-layout{flex:1 1 auto;min-height:0;display:grid;grid-template-columns:360px minmax(0,1fr);gap:0;overflow:hidden;border:1px solid rgba(232,234,237,.10);border-radius:26px;background:#181b22;box-shadow:0 16px 38px rgba(0,0,0,.16)}' +
      '#' + DIALOG_ID + ' .kn-plugin-list-card,#' + DIALOG_ID + ' .kn-plugin-editor-card{min-height:0;background:transparent;border:0;border-radius:0;overflow:hidden;display:flex;flex-direction:column}' +
      '#' + DIALOG_ID + ' .kn-plugin-list-card{border-right:1px solid rgba(232,234,237,.08);background:rgba(17,19,24,.34)}' +
      '#' + DIALOG_ID + ' .kn-plugin-list-head{flex:0 0 auto;padding:14px;border-bottom:1px solid rgba(232,234,237,.08);background:rgba(17,19,24,.48)}' +
      '#' + DIALOG_ID + ' .kn-plugin-list-head>div{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;color:#f1f3f4}#' + DIALOG_ID + ' .kn-plugin-list-head strong{font-size:15px;font-weight:800}#' + DIALOG_ID + ' .kn-plugin-list-head span{font-size:12px;color:#9aa0a6}' +
      '#' + DIALOG_ID + ' #kn-plugin-search,#' + DIALOG_ID + ' #kn-plugin-editor-name{width:100%;height:42px;border-radius:16px;border:1px solid rgba(232,234,237,.12);background:#111318;color:#e8eaed;padding:0 13px;outline:none}' +
      '#' + DIALOG_ID + ' #kn-plugin-search:focus,#' + DIALOG_ID + ' #kn-plugin-editor-name:focus{border-color:rgba(138,180,248,.55);box-shadow:0 0 0 3px rgba(138,180,248,.12)}' +

      '#' + DIALOG_ID + ' .kn-plugin-list-title-row{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:10px!important;margin-bottom:0!important;color:#f1f3f4}' +
      '#' + DIALOG_ID + ' .kn-plugin-search-toggle{width:34px;height:34px;border-radius:999px;border:1px solid rgba(232,234,237,.12);background:rgba(255,255,255,.04);color:#d3e3fd;font-size:16px;font-weight:900;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;transition:background .16s,border-color .16s,transform .16s}' +
      '#' + DIALOG_ID + ' .kn-plugin-search-toggle:hover{background:rgba(138,180,248,.12);border-color:rgba(138,180,248,.32);transform:translateY(-1px)}' +
      '#' + DIALOG_ID + ' .kn-plugin-list-head #kn-plugin-search{display:none;margin-top:10px}' +
      '#' + DIALOG_ID + ' .kn-plugin-list-head.search-open #kn-plugin-search{display:block}' +
      '#' + DIALOG_ID + ' .kn-plugin-editor-name-line{display:flex!important;align-items:center;gap:7px;min-width:0;margin-top:4px}' +
      '#' + DIALOG_ID + ' .kn-plugin-editor-title-name{display:block!important;color:#d3e3fd!important;font-size:12px!important;max-width:360px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '#' + DIALOG_ID + ' .kn-plugin-title-edit{width:26px;height:26px;min-width:26px;border-radius:999px;border:1px solid rgba(138,180,248,.20);background:rgba(138,180,248,.08);color:#d3e3fd;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;transition:background .16s,border-color .16s,transform .16s}' +
      '#' + DIALOG_ID + ' .kn-plugin-title-edit:hover{background:rgba(138,180,248,.16);border-color:rgba(138,180,248,.42);transform:translateY(-1px)}' +
      '#' + DIALOG_ID + ' .kn-plugin-title-edit .kn-action-ico{width:14px;height:14px;display:inline-flex}.kn-plugin-title-edit svg{width:14px;height:14px;fill:currentColor}' +
      '#' + DIALOG_ID + ' .kn-plugin-field.renaming{border-radius:16px;background:rgba(138,180,248,.08);box-shadow:0 0 0 3px rgba(138,180,248,.10);transition:background .16s,box-shadow .16s}' +
      '#' + DIALOG_ID + ' .kn-plugin-name-field{display:none!important}' +
      '#' + DIALOG_ID + ' .kn-plugin-name-field.renaming{display:grid!important}' +
      '#' + DIALOG_ID + ' .kn-plugin-icon-action{width:42px;height:38px;min-width:42px;padding:0;border-radius:999px;border:1px solid rgba(232,234,237,.12);background:rgba(255,255,255,.045);color:#e8eaed;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;transition:background .16s,border-color .16s,transform .16s}' +
      '#' + DIALOG_ID + ' .kn-plugin-icon-action:hover{background:rgba(138,180,248,.12);border-color:rgba(138,180,248,.32);transform:translateY(-1px)}' +
      '#' + DIALOG_ID + ' .kn-plugin-icon-action.primary{background:rgba(138,180,248,.18);border-color:rgba(138,180,248,.36);color:#d3e3fd}' +
      '#' + DIALOG_ID + ' .kn-plugin-icon-action.danger{background:rgba(234,67,53,.10);border-color:rgba(242,139,130,.32);color:#f28b82}' +
      '#' + DIALOG_ID + ' .kn-plugin-icon-action.danger.confirming{background:rgba(234,67,53,.24);border-color:rgba(242,139,130,.62);color:#ffd7d2}' +
      '#' + DIALOG_ID + ' .kn-plugin-icon-action .kn-action-ico{width:17px;height:17px;display:inline-flex;align-items:center;justify-content:center;line-height:1}' +
      '#' + DIALOG_ID + ' .kn-plugin-icon-action .kn-action-ico svg{width:17px;height:17px;display:block;fill:currentColor}' +
      '#' + DIALOG_ID + ' .kn-plugin-icon-action .kn-action-text{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}' +
      '#' + DIALOG_ID + ' .kn-plugin-list{flex:1 1 auto;min-height:0;overflow:auto;padding:10px;overscroll-behavior:contain}.kn-plugin-empty{padding:34px 14px;border:1px dashed rgba(232,234,237,.12);border-radius:18px;text-align:center;color:#9aa0a6;font-size:12px}' +
      '#' + DIALOG_ID + ' .kn-plugin-row{position:relative;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:9px;padding:12px;margin-bottom:8px;border-radius:20px;border:1px solid rgba(232,234,237,.08);background:#202124;transition:background .16s,border-color .16s,transform .16s}.kn-plugin-row:hover{background:#24272e;border-color:rgba(138,180,248,.28)}.kn-plugin-row.active{border-color:rgba(138,180,248,.52);background:linear-gradient(135deg,rgba(138,180,248,.20),rgba(36,39,46,.92))}.kn-plugin-row-main{min-width:0;cursor:pointer}.kn-plugin-row-title{display:flex;align-items:center;justify-content:space-between;gap:8px;color:#f1f3f4;font-size:13px;font-weight:760}.kn-plugin-row-title span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.kn-plugin-row-title em{font-style:normal;font-size:11px;padding:3px 8px;border-radius:999px;flex:0 0 auto}.kn-plugin-row-title em.on{background:rgba(52,168,83,.14);color:#81c995}.kn-plugin-row-title em.off{background:rgba(234,67,53,.13);color:#f28b82}.kn-plugin-row-meta{margin-top:6px;color:#9aa0a6;font-size:11px}' +
      '#' + DIALOG_ID + ' .kn-plugin-row-tools{display:flex;align-items:center;gap:6px}.kn-plugin-toggle{position:relative;width:44px;height:26px;border:1px solid rgba(232,234,237,.13);border-radius:999px;background:#3c4043;cursor:pointer;padding:0;transition:background .16s,border-color .16s}.kn-plugin-toggle span{position:absolute;top:4px;left:4px;width:16px;height:16px;border-radius:50%;background:#bdc1c6;transition:left .16s,background .16s}.kn-plugin-toggle.on{background:rgba(52,168,83,.30);border-color:rgba(129,201,149,.46)}.kn-plugin-toggle.on span{left:22px;background:#81c995}.kn-plugin-toggle.off{background:rgba(234,67,53,.12);border-color:rgba(242,139,130,.30)}.kn-plugin-toggle.off span{background:#f28b82}.kn-plugin-mini{width:28px;height:28px;padding:0;border:1px solid rgba(232,234,237,.10);border-radius:999px;background:rgba(255,255,255,.04);color:#e8eaed;font-size:12px;cursor:pointer}.kn-plugin-mini:hover{background:rgba(138,180,248,.12);border-color:rgba(138,180,248,.34)}' +
      '#' + DIALOG_ID + ' .kn-plugin-editor-card{background:rgba(17,19,24,.22)}#' + DIALOG_ID + ' .kn-plugin-editor-head{flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;gap:14px;padding:14px 16px;border-bottom:1px solid rgba(232,234,237,.08);color:#f1f3f4;background:rgba(17,19,24,.36)}.kn-plugin-editor-head strong{display:block;font-size:16px;font-weight:850;margin-bottom:2px}.kn-plugin-editor-head span{color:#9aa0a6;font-size:12px}.kn-plugin-editor-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex-wrap:wrap;flex:0 0 auto}' +
      '#' + DIALOG_ID + ' .kn-plugin-editor-form{flex:1 1 auto;min-height:0;display:flex;flex-direction:column;gap:12px;padding:14px 16px;overflow:hidden}.kn-plugin-field{display:grid;grid-template-columns:88px minmax(0,1fr);gap:12px;align-items:center}.kn-plugin-field label,.kn-plugin-code-head label{color:#bdc1c6;font-size:12px;font-weight:700}.kn-plugin-editor-readonly{min-height:42px;display:flex;align-items:center;border-radius:16px;border:1px solid rgba(232,234,237,.10);background:#111318;color:#bdc1c6;padding:0 12px;font-size:12px}.kn-plugin-editor-readonly.on{color:#81c995;border-color:rgba(129,201,149,.22);background:rgba(52,168,83,.08)}.kn-plugin-editor-readonly.off{color:#f28b82;border-color:rgba(242,139,130,.22);background:rgba(234,67,53,.08)}' +
      '#' + DIALOG_ID + ' .kn-plugin-code-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:2px}.kn-plugin-code-head span{font-size:11px;color:#7f8794}' +
      '#' + DIALOG_ID + ' .kn-code-editor-wrap{flex:1 1 auto;min-height:260px;display:grid;grid-template-columns:52px minmax(0,1fr);border-radius:20px;border:1px solid rgba(232,234,237,.10);background:#111318;overflow:hidden}' +
      '#' + DIALOG_ID + ' .kn-code-lines{padding:14px 10px;background:#171a20;border-right:1px solid rgba(232,234,237,.08);color:#6f7684;text-align:right;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;line-height:1.65;white-space:pre;overflow:hidden;user-select:none}' +
      '#' + DIALOG_ID + ' .kn-code-layer{position:relative;min-height:0;height:100%;overflow:hidden}' +
      '#' + DIALOG_ID + ' .kn-code-highlight{position:absolute;inset:0;margin:0;padding:14px;overflow:auto;pointer-events:none;color:#e8eaed;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;line-height:1.65;white-space:pre;tab-size:2}' +
      '#' + DIALOG_ID + ' .kn-code-highlight{display:none!important}' +
      '#' + DIALOG_ID + ' .kn-code-highlight::-webkit-scrollbar{display:none}' +
      '#' + DIALOG_ID + ' .kn-plugin-editor-form textarea{width:100%;height:100%;min-height:0;border:0;background:transparent;color:#e8eaed;-webkit-text-fill-color:#e8eaed;caret-color:#e8eaed;padding:14px;outline:none;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;line-height:1.65;resize:none;white-space:pre;tab-size:2;overflow:auto;overscroll-behavior:contain}.kn-plugin-editor-form textarea::selection{background:rgba(138,180,248,.28)}' +
      '#' + DIALOG_ID + ' .kn-code-token-comment{color:#6a9955}.kn-code-token-string{color:#ce9178}.kn-code-token-keyword{color:#c586c0}.kn-code-token-number{color:#b5cea8}.kn-code-token-fn{color:#dcdcaa}' +
      '#' + DIALOG_ID + ' .kn-google-btn.danger{color:#f28b82;border-color:rgba(242,139,130,.34);background:rgba(234,67,53,.10)}.kn-google-btn.danger.confirming{background:rgba(234,67,53,.24);border-color:rgba(242,139,130,.62);color:#ffd7d2}' +
      '@media(max-width:1120px){#' + DIALOG_ID + ' .kn-plugin-utilitybar{grid-template-columns:1fr}#' + DIALOG_ID + ' .kn-plugin-native-row{white-space:normal}}' +

      '#' + DIALOG_ID + ' .kn-forward-hero{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px;align-items:center;padding:18px;border-radius:24px;border:1px solid rgba(232,234,237,.10);background:linear-gradient(135deg,rgba(138,180,248,.12),rgba(27,29,35,1));margin-bottom:14px}' +
      '#' + DIALOG_ID + ' .kn-forward-title{font-size:19px;font-weight:650;color:#f1f3f4;margin-bottom:6px}' +
      '#' + DIALOG_ID + ' .kn-forward-desc{font-size:12px;line-height:1.7;color:#bdc1c6}' +
      '#' + DIALOG_ID + ' .kn-forward-native{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}' +
      '#' + DIALOG_ID + ' .kn-forward-method-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:10px}' +
      '#' + DIALOG_ID + ' .kn-forward-method{display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:16px;background:#171a20;border:1px solid rgba(232,234,237,.10);color:#e8eaed;font-size:12px;cursor:pointer}' +
      '#' + DIALOG_ID + ' .kn-forward-method input{accent-color:#8ab4f8}' +
      '#' + DIALOG_ID + ' .kn-forward-event-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 12px;margin-top:12px}' +
      '#' + DIALOG_ID + ' .kn-forward-event-list .kn-check{margin:0!important;background:#171a20!important;border-color:rgba(232,234,237,.10)!important;justify-content:space-between}' +
      '#' + DIALOG_ID + ' .kn-forward-textarea{width:100%;min-height:86px;resize:vertical;border:1px solid rgba(232,234,237,.16);border-radius:16px;background:#111318;color:#e8eaed;padding:10px 12px;outline:none;box-sizing:border-box;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;line-height:1.55}' +
      '#' + DIALOG_ID + ' .kn-forward-textarea:focus{border-color:#8ab4f8;box-shadow:0 0 0 3px rgba(138,180,248,.14)}' +
      '#' + DIALOG_ID + ' .kn-forward-status{margin-top:10px;padding:10px 12px;border-radius:16px;background:#151a22;border:1px solid rgba(232,234,237,.10);color:#bdc1c6;font-size:12px;line-height:1.6}' +
      '@media(max-width:860px){#' + DIALOG_ID + ' .kn-forward-hero{grid-template-columns:1fr}#' + DIALOG_ID + ' .kn-forward-native{justify-content:flex-start}#' + DIALOG_ID + ' .kn-forward-method-grid,#' + DIALOG_ID + ' .kn-forward-event-list{grid-template-columns:1fr}}' +
      
      '#' + DIALOG_ID + ' .kn-forward-hero.compact{grid-template-columns:minmax(0,1fr) auto;padding:14px 16px;margin-bottom:10px;border-radius:20px}' +
      '#' + DIALOG_ID + ' .kn-forward-read-status{min-height:34px;display:flex;align-items:center;padding:0 12px;margin:0 0 10px;border-radius:14px;border:1px solid rgba(232,234,237,.10);background:#151a22;color:#bdc1c6;font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '#' + DIALOG_ID + ' .kn-forward-read-status.ok{color:#81c995;border-color:rgba(129,201,149,.24);background:rgba(52,168,83,.08)}' +
      '#' + DIALOG_ID + ' .kn-forward-read-status.error{color:#f28b82;border-color:rgba(242,139,130,.28);background:rgba(234,67,53,.08)}' +
      '#' + DIALOG_ID + ' .kn-forward-read-status.loading{color:#8ab4f8;border-color:rgba(138,180,248,.24);background:rgba(138,180,248,.08)}' +
      '#' + DIALOG_ID + ' .kn-forward-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}' +
      '#' + DIALOG_ID + ' .kn-forward-card{min-width:0;padding:14px;border-radius:20px;border:1px solid rgba(232,234,237,.10);background:rgba(17,19,24,.50)}' +
      '#' + DIALOG_ID + ' .kn-forward-card.native{background:rgba(23,26,32,.48)}' +
      '#' + DIALOG_ID + ' .kn-forward-card.full{grid-column:1/-1}' +
      '#' + DIALOG_ID + ' .kn-forward-kv{display:grid;grid-template-columns:86px minmax(0,1fr);gap:8px;align-items:center;min-height:28px;border-bottom:1px solid rgba(232,234,237,.06);font-size:12px}' +
      '#' + DIALOG_ID + ' .kn-forward-kv b{color:#9aa0a6;font-weight:750}.kn-forward-kv span{color:#e8eaed;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '#' + DIALOG_ID + ' .kn-native-mini-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.kn-native-mini-grid .full{grid-column:1/-1}' +
      '#' + DIALOG_ID + ' .kn-input-row.readonly input{opacity:.9;background:#111318;color:#e8eaed}' +
      '@media(max-width:980px){#' + DIALOG_ID + ' .kn-visual-list{grid-template-columns:repeat(2,minmax(0,1fr))}#' + DIALOG_ID + ' .kn-inline-config{grid-template-columns:1fr}#' + DIALOG_ID + ' .kn-color-control{grid-template-columns:52px minmax(0,1fr)}}' +
      '@media(max-width:860px){#' + DIALOG_ID + ' .kn-plugin-topbar{grid-template-columns:1fr;padding:14px}#' + DIALOG_ID + ' .kn-plugin-actions{justify-content:flex-start;width:max-content;max-width:100%}#' + DIALOG_ID + ' .kn-plugin-layout{grid-template-columns:1fr}#' + DIALOG_ID + ' .kn-plugin-list-card{border-right:0;border-bottom:1px solid rgba(232,234,237,.08)}#' + DIALOG_ID + ' .kn-plugin-list{max-height:260px}#' + DIALOG_ID + ' .kn-plugin-editor-head{display:block}.kn-plugin-editor-actions{justify-content:flex-start;margin-top:10px}#' + DIALOG_ID + ' .kn-plugin-field{grid-template-columns:1fr;gap:6px}#' + DIALOG_ID + ' .kn-code-editor-wrap{height:320px;min-height:320px}}' +
      '@media(max-width:520px){#' + DIALOG_ID + ' .kn-plugin-actions .kn-plugin-tool-btn{width:38px;height:36px}#' + DIALOG_ID + ' .kn-plugin-native-row .kn-google-btn{min-width:0;flex:1 1 auto}#' + DIALOG_ID + ' .kn-plugin-editor-actions .kn-plugin-icon-action{width:40px;min-width:40px;flex:0 0 40px}#' + DIALOG_ID + ' .kn-code-editor-wrap{grid-template-columns:42px minmax(0,1fr)}}';
    style.textContent += '' +
      '#' + DIALOG_ID + ' .kn-plugin-manager-shell{gap:8px}' +
      '#' + DIALOG_ID + ' .kn-plugin-topbar{min-height:54px;padding:10px 14px;border-radius:20px;grid-template-columns:minmax(0,1fr) auto;background:linear-gradient(135deg,rgba(138,180,248,.08),rgba(22,25,32,.94));box-shadow:0 8px 18px rgba(0,0,0,.10)}' +
      '#' + DIALOG_ID + ' .kn-plugin-kicker{display:none}' +
      '#' + DIALOG_ID + ' .kn-plugin-title{font-size:18px;margin:0;line-height:1.15;letter-spacing:-.02em}' +
      '#' + DIALOG_ID + ' .kn-plugin-desc{margin-top:4px;font-size:11px;line-height:1.28;max-width:620px;color:rgba(232,234,237,.62);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '#' + DIALOG_ID + ' .kn-plugin-actions{padding:3px;border-radius:16px;gap:4px;background:rgba(17,19,24,.38)}' +
      '#' + DIALOG_ID + ' .kn-plugin-tool-btn{width:34px;height:32px;border-radius:12px;font-size:13px}' +
      '#' + DIALOG_ID + ' .kn-plugin-tool-btn .kn-tool-ico{font-size:14px}' +
      '#' + DIALOG_ID + ' .kn-plugin-utilitybar{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;min-height:34px}' +
      '#' + DIALOG_ID + ' .kn-plugin-risk.top{min-height:32px;padding:6px 10px;border-radius:14px;font-size:11px;line-height:1.25;background:rgba(251,188,4,.055);border-color:rgba(251,188,4,.13);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '#' + DIALOG_ID + ' .kn-plugin-native-row{min-height:32px;padding:4px 6px;border-radius:14px;gap:5px;background:rgba(17,19,24,.42);font-size:11px}' +
      '#' + DIALOG_ID + ' .kn-plugin-native-row>span{display:none}' +
      '#' + DIALOG_ID + ' .kn-plugin-native-row .kn-google-btn{min-height:26px;height:26px;padding:0 10px;border-radius:999px;font-size:11px}' +
      '#' + DIALOG_ID + ' .kn-plugin-status{min-height:28px;padding:6px 10px;border-radius:13px;font-size:11px;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '#' + DIALOG_ID + ' .kn-plugin-layout{border-radius:22px}' +
      '#' + DIALOG_ID + ' .kn-plugin-list-head{padding:12px 14px}' +
      '#' + DIALOG_ID + ' .kn-plugin-editor-head{padding:12px 14px}' +
      '#' + DIALOG_ID + ' .kn-plugin-editor-form{padding:12px 14px;gap:10px}' +
      '@media(max-width:980px){#' + DIALOG_ID + ' .kn-plugin-topbar{grid-template-columns:minmax(0,1fr) auto}#' + DIALOG_ID + ' .kn-plugin-desc{max-width:420px}#' + DIALOG_ID + ' .kn-plugin-utilitybar{grid-template-columns:1fr}#' + DIALOG_ID + ' .kn-plugin-native-row{justify-content:flex-start;overflow:auto;white-space:nowrap}}' +
      '@media(max-width:680px){#' + DIALOG_ID + ' .kn-plugin-topbar{grid-template-columns:1fr;gap:8px}#' + DIALOG_ID + ' .kn-plugin-actions{justify-content:flex-start;width:max-content}#' + DIALOG_ID + ' .kn-plugin-desc{white-space:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}#' + DIALOG_ID + ' .kn-plugin-risk.top{white-space:normal}#' + DIALOG_ID + ' .kn-plugin-native-row .kn-google-btn{flex:0 0 auto}}';
    style.textContent += '' +
      '#' + DIALOG_ID + ' .kn-plugin-merged-head{min-height:0!important;display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;gap:10px!important;align-items:center!important;padding:10px 12px!important;border-radius:18px!important;background:linear-gradient(135deg,rgba(138,180,248,.07),rgba(22,25,32,.88))!important}' +
      '#' + DIALOG_ID + ' .kn-plugin-title-line{display:flex;align-items:center;gap:10px;min-width:0;margin-bottom:3px}' +
      '#' + DIALOG_ID + ' .kn-plugin-merged-head .kn-plugin-title{font-size:17px!important;line-height:1.1!important;margin:0!important;white-space:nowrap}' +
      '#' + DIALOG_ID + ' .kn-plugin-merged-head .kn-plugin-desc{font-size:11px!important;line-height:1.25!important;margin:0!important;max-width:680px!important;color:rgba(232,234,237,.62)!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}' +
      '#' + DIALOG_ID + ' .kn-plugin-merged-head .kn-plugin-risk.top{display:inline-flex!important;min-height:0!important;margin-top:5px!important;padding:3px 8px!important;border-radius:999px!important;font-size:10.5px!important;line-height:1.2!important;max-width:100%!important;background:rgba(251,188,4,.055)!important;border-color:rgba(251,188,4,.12)!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}' +
      '#' + DIALOG_ID + ' .kn-plugin-merged-head .kn-plugin-status{display:inline-flex!important;align-items:center!important;min-height:24px!important;height:24px!important;padding:0 8px!important;border-radius:999px!important;font-size:10.5px!important;line-height:1!important;white-space:nowrap!important;max-width:210px!important;overflow:hidden!important;text-overflow:ellipsis!important}' +
      '#' + DIALOG_ID + ' .kn-plugin-head-right{display:flex;align-items:center;justify-content:flex-end;gap:7px;min-width:0}' +
      '#' + DIALOG_ID + ' .kn-plugin-merged-head .kn-plugin-native-row{min-height:30px!important;height:30px!important;padding:3px!important;border-radius:999px!important;background:rgba(17,19,24,.38)!important;display:flex!important;align-items:center!important;gap:4px!important;overflow:hidden!important;white-space:nowrap!important}' +
      '#' + DIALOG_ID + ' .kn-plugin-merged-head .kn-plugin-native-row .kn-google-btn{min-height:24px!important;height:24px!important;padding:0 9px!important;border-radius:999px!important;font-size:11px!important;flex:0 0 auto!important}' +
      '#' + DIALOG_ID + ' .kn-plugin-merged-head .kn-plugin-actions{height:30px!important;padding:3px!important;border-radius:999px!important;background:rgba(17,19,24,.38)!important;gap:3px!important}' +
      '#' + DIALOG_ID + ' .kn-plugin-merged-head .kn-plugin-tool-btn{width:26px!important;height:24px!important;border-radius:999px!important;font-size:12px!important}' +
      '#' + DIALOG_ID + ' .kn-plugin-merged-head .kn-plugin-tool-btn .kn-tool-ico{font-size:12px!important}' +
      '@media(max-width:1060px){#' + DIALOG_ID + ' .kn-plugin-merged-head{grid-template-columns:1fr!important}#' + DIALOG_ID + ' .kn-plugin-head-right{justify-content:flex-start;overflow:auto;white-space:nowrap;padding-bottom:1px}#' + DIALOG_ID + ' .kn-plugin-merged-head .kn-plugin-desc{white-space:normal!important;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}}' +
      '@media(max-width:620px){#' + DIALOG_ID + ' .kn-plugin-title-line{align-items:flex-start;flex-direction:column;gap:5px}#' + DIALOG_ID + ' .kn-plugin-head-right{display:grid;grid-template-columns:1fr auto;width:100%}#' + DIALOG_ID + ' .kn-plugin-merged-head .kn-plugin-native-row{overflow:auto}#' + DIALOG_ID + ' .kn-plugin-merged-head .kn-plugin-native-row .kn-google-btn{padding:0 8px}#' + DIALOG_ID + ' .kn-plugin-merged-head .kn-plugin-risk.top{white-space:normal!important;border-radius:12px!important}}' +
      '#' + DIALOG_ID + ' .kn-plugin-merged-head{min-height:50px!important;padding:8px 10px!important;border-radius:18px!important;grid-template-columns:minmax(0,1fr) auto!important;gap:10px!important;background:linear-gradient(135deg,rgba(138,180,248,.055),rgba(17,19,24,.92))!important}' +
      '#' + DIALOG_ID + ' .kn-plugin-merged-head .kn-plugin-title-block{display:grid!important;grid-template-columns:auto minmax(0,1fr)!important;grid-template-areas:"title desc" "risk risk"!important;column-gap:10px!important;row-gap:2px!important;align-items:center!important;min-width:0!important}' +
      '#' + DIALOG_ID + ' .kn-plugin-title-line{grid-area:title!important;display:flex!important;align-items:center!important;gap:8px!important;min-width:0!important}' +
      '#' + DIALOG_ID + ' .kn-plugin-title{font-size:16px!important;line-height:1!important;white-space:nowrap!important}' +
      '#' + DIALOG_ID + ' .kn-plugin-merged-head .kn-plugin-status{height:22px!important;min-height:22px!important;max-width:145px!important;padding:0 8px!important;font-size:10.5px!important}' +
      '#' + DIALOG_ID + ' .kn-plugin-desc{grid-area:desc!important;margin:0!important;font-size:11px!important;line-height:1.25!important;max-width:none!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;color:rgba(232,234,237,.58)!important}' +
      '#' + DIALOG_ID + ' .kn-plugin-merged-head .kn-plugin-risk.top{grid-area:risk!important;display:block!important;margin:1px 0 0!important;padding:0!important;border:0!important;background:transparent!important;color:#fdd663!important;font-size:10.5px!important;line-height:1.2!important;max-width:100%!important;opacity:.9!important}' +
      '#' + DIALOG_ID + ' .kn-plugin-head-right{display:inline-flex!important;align-items:center!important;gap:0!important;padding:4px!important;border:1px solid rgba(232,234,237,.10)!important;border-radius:999px!important;background:rgba(17,19,24,.52)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.035)!important;white-space:nowrap!important}' +
      '#' + DIALOG_ID + ' .kn-plugin-merged-head .kn-plugin-native-row,#' + DIALOG_ID + ' .kn-plugin-merged-head .kn-plugin-actions{display:inline-flex!important;align-items:center!important;gap:2px!important;padding:0!important;margin:0!important;border:0!important;border-radius:0!important;background:transparent!important;min-height:0!important}' +
      '#' + DIALOG_ID + ' .kn-plugin-merged-head .kn-plugin-native-row{padding-right:4px!important;margin-right:4px!important;border-right:1px solid rgba(232,234,237,.10)!important}' +
      '#' + DIALOG_ID + ' .kn-plugin-merged-head .kn-plugin-native-row .kn-google-btn{height:28px!important;min-height:28px!important;padding:0 10px!important;border-radius:999px!important;font-size:11px!important;background:transparent!important;border-color:transparent!important;color:rgba(232,234,237,.78)!important}' +
      '#' + DIALOG_ID + ' .kn-plugin-merged-head .kn-plugin-native-row .kn-google-btn:hover{background:rgba(138,180,248,.12)!important;border-color:rgba(138,180,248,.18)!important;color:#d3e3fd!important}' +
      '#' + DIALOG_ID + ' .kn-plugin-tool-btn{width:30px!important;height:28px!important;border-radius:999px!important;background:transparent!important;border-color:transparent!important}' +
      '#' + DIALOG_ID + ' .kn-plugin-tool-btn:hover{background:rgba(138,180,248,.12)!important;border-color:rgba(138,180,248,.18)!important}' +
      '#' + DIALOG_ID + ' .kn-plugin-layout{margin-top:0!important}' +
      '#' + DIALOG_ID + ' .kn-code-editor-wrap{contain:layout paint!important;will-change:contents!important}' +
      '#' + DIALOG_ID + ' .kn-code-layer,#' + DIALOG_ID + ' .kn-code-lines{overscroll-behavior:contain!important}' +
      '#' + DIALOG_ID + ' .kn-plugin-editor-form textarea{font-variant-ligatures:none!important;overscroll-behavior:contain!important;will-change:scroll-position!important}' +
      '@media(max-width:760px){#' + DIALOG_ID + ' .kn-plugin-merged-head{grid-template-columns:1fr!important}#' + DIALOG_ID + ' .kn-plugin-head-right{width:100%!important;justify-content:space-between!important;overflow:auto!important}#' + DIALOG_ID + ' .kn-plugin-merged-head .kn-plugin-title-block{grid-template-columns:1fr!important;grid-template-areas:"title" "desc" "risk"!important}#' + DIALOG_ID + ' .kn-plugin-desc{white-space:normal!important;display:-webkit-box!important;-webkit-line-clamp:2!important;-webkit-box-orient:vertical!important}}' +
      '#'  + DIALOG_ID + ' .kn-plugin-row.enabled{box-shadow:inset 3px 0 0 rgba(129,201,149,.72)}' +
      '#' + DIALOG_ID + ' .kn-plugin-row.disabled{opacity:.72;box-shadow:inset 3px 0 0 rgba(242,139,130,.55)}' +
      '#' + DIALOG_ID + ' .kn-plugin-row.enabled .kn-plugin-row-title span::after{content:"已启用";display:inline-flex;margin-left:8px;padding:2px 7px;border-radius:999px;background:rgba(52,168,83,.16);color:#81c995;font-size:10.5px;font-weight:800;vertical-align:middle}' +
      '#' + DIALOG_ID + ' .kn-plugin-row.disabled .kn-plugin-row-title span::after{content:"已停用";display:inline-flex;margin-left:8px;padding:2px 7px;border-radius:999px;background:rgba(234,67,53,.13);color:#f28b82;font-size:10.5px;font-weight:800;vertical-align:middle}' +
      '#' + DIALOG_ID + ' .kn-plugin-editor-form{grid-template-rows:auto auto minmax(0,1fr)!important}' +
      '#' + DIALOG_ID + ' .kn-plugin-merged-head .kn-plugin-native-row .kn-native-group-label{display:inline-flex;align-items:center;height:20px;padding:0 7px;border-radius:999px;background:rgba(138,180,248,.10);color:#a8c7fa;font-size:9px;font-weight:850;letter-spacing:.02em;flex:0 0 auto}' ;
    style.textContent += '' +
      '#' + DIALOG_ID + ' .kn-plugin-merged-head{height:48px!important;min-height:48px!important;padding:6px 10px!important;overflow:hidden!important}' +
      '#' + DIALOG_ID + ' .kn-plugin-merged-head .kn-plugin-title-block{grid-template-columns:auto minmax(0,1fr)!important;grid-template-areas:"title desc"!important;row-gap:0!important}' +
      '#' + DIALOG_ID + ' .kn-plugin-title-line{height:30px!important;min-width:0!important}' +
      '#' + DIALOG_ID + ' .kn-plugin-title{font-size:15px!important}' +
      '#' + DIALOG_ID + ' .kn-plugin-merged-head .kn-plugin-status{max-width:150px!important;height:22px!important;min-height:22px!important}' +
      '#' + DIALOG_ID + ' .kn-plugin-desc{font-size:10.5px!important;max-width:none!important}' +
      '#' + DIALOG_ID + ' .kn-plugin-merged-head .kn-plugin-risk.top{display:none!important}' +
      '#' + DIALOG_ID + ' .kn-plugin-head-right{height:34px!important;max-width:390px!important;overflow:hidden!important}' +
      '#' + DIALOG_ID + ' .kn-plugin-merged-head .kn-plugin-native-row .kn-google-btn{height:26px!important;min-height:26px!important;padding:0 8px!important;font-size:10.5px!important}' +
      '#' + DIALOG_ID + ' .kn-plugin-merged-head .kn-plugin-native-row .kn-native-group-label{height:18px!important;padding:0 6px!important;font-size:8.5px!important}' +
      '#' + DIALOG_ID + ' .kn-plugin-merged-head .kn-plugin-actions{height:26px!important}' +
      '#' + DIALOG_ID + ' .kn-plugin-merged-head .kn-plugin-tool-btn{width:24px!important;height:22px!important}' +
      '#' + DIALOG_ID + ' .kn-plugin-row{padding:11px 10px 11px 14px!important;border-left:3px solid transparent!important}' +
      '#' + DIALOG_ID + ' .kn-plugin-row.enabled{border-left-color:#81c995!important}' +
      '#' + DIALOG_ID + ' .kn-plugin-row.disabled{border-left-color:#f28b82!important;opacity:.76!important}' +
      '#' + DIALOG_ID + ' .kn-plugin-row-title span::after{content:""!important;display:none!important}' +
      '#' + DIALOG_ID + ' .kn-plugin-row-title span{display:block!important;max-width:100%!important}' +
      '#' + DIALOG_ID + ' .kn-plugin-row-tools{gap:5px!important}' +
      '#' + DIALOG_ID + ' .kn-plugin-editor-head #kn-plugin-editor-state{display:none!important}' +
      '#' + DIALOG_ID + ' .kn-plugin-editor-head{min-height:54px!important;padding:10px 14px!important}' +
      '#' + DIALOG_ID + ' .kn-plugin-editor-form{padding-top:10px!important}' +
      '@media(max-width:760px){#' + DIALOG_ID + ' .kn-plugin-merged-head{height:auto!important;min-height:0!important;grid-template-columns:1fr!important}#' + DIALOG_ID + ' .kn-plugin-merged-head .kn-plugin-title-block{grid-template-columns:1fr!important;grid-template-areas:"title" "desc"!important}#' + DIALOG_ID + ' .kn-plugin-head-right{max-width:100%!important;width:100%!important;overflow:auto!important}}' +
      '#' + DIALOG_ID + ' .kn-plugin-editor-head .kn-plugin-editor-name-line{display:flex!important;align-items:center!important;gap:7px!important;min-width:0!important;margin-top:4px!important}' +
      '#' + DIALOG_ID + ' .kn-plugin-editor-head .kn-plugin-editor-title-name{display:block!important;color:#d3e3fd!important;font-size:12px!important;max-width:380px!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important}' +
      '#' + DIALOG_ID + ' .kn-plugin-editor-head .kn-plugin-title-edit{display:inline-flex!important}' +
      '#' + DIALOG_ID + ' .kn-plugin-editor-head #kn-plugin-editor-state{display:none!important}';
    document.head.appendChild(style);
  }

  function injectGoogleSettingsCSS() {
    if (document.getElementById('kano-webos-google-settings-style')) return;
    var style = document.createElement('style');
    style.id = 'kano-webos-google-settings-style';
    style.textContent = '' +
      '#' + DIALOG_ID + '{padding:0;border:0;background:transparent;max-width:none;max-height:none;color:#e8eaed}' +
      '#' + DIALOG_ID + '::backdrop{background:rgba(10,12,16,.52);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}' +
      '#' + DIALOG_ID + ' .kn-dialog-content{width:min(1080px,calc(100vw - 40px));height:min(820px,calc(100vh - 44px));border-radius:28px;background:#111318!important;border:1px solid rgba(255,255,255,.10);box-shadow:0 28px 90px rgba(0,0,0,.54);color:#e8eaed;overflow:hidden}' +
      '#' + DIALOG_ID + ' .kn-dialog-header{padding:24px 28px 18px;background:#111318;border-bottom:1px solid rgba(232,234,237,.10);align-items:center}' +
      '#' + DIALOG_ID + ' .kn-dialog-title{font-size:24px;font-weight:650;letter-spacing:-.02em;color:#f1f3f4;margin:0 0 6px}' +
      '#' + DIALOG_ID + ' .kn-dialog-subtitle{font-size:13px;line-height:1.6;color:#bdc1c6;max-width:760px}' +
      '#' + DIALOG_ID + ' .kn-dialog-body{display:grid;grid-template-columns:214px minmax(0,1fr);gap:22px;padding:22px 28px;background:#111318;overflow:auto}' +
      '#' + DIALOG_ID + ' .kn-dialog-footer{padding:16px 28px 22px;background:#111318;border-top:1px solid rgba(232,234,237,.10)}' +
      '#' + DIALOG_ID + ' .kn-settings-tabs{grid-column:1;display:flex;flex-direction:column;gap:4px;align-self:start;position:sticky;top:0;margin:0;padding:8px;border:0;border-radius:22px;background:#171a20;box-shadow:none}' +
      '#' + DIALOG_ID + ' .kn-settings-tab{position:relative;min-height:44px;padding:0 16px;border-radius:999px;text-align:left;color:#bdc1c6;background:transparent;font-size:13px;font-weight:600;box-shadow:none}' +
      '#' + DIALOG_ID + ' .kn-settings-tab:hover{background:#202124;color:#f1f3f4}' +
      '#' + DIALOG_ID + ' .kn-settings-tab.active{background:#263850;color:#d3e3fd;box-shadow:none}' +
      '#' + DIALOG_ID + ' .kn-settings-panel{grid-column:2;min-width:0;background:transparent!important;border:0!important;box-shadow:none!important;padding:0!important}' +
      '#' + DIALOG_ID + ' #kn-settings-panel-layout{background:transparent!important;border:0!important;box-shadow:none!important;padding:0!important}' +
      '#' + DIALOG_ID + ' #kn-settings-board{background:transparent!important;border:0!important;box-shadow:none!important;padding:0!important}' +
      '#' + DIALOG_ID + ' .kn-layout-page-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;color:#e8eaed;font-size:13px;font-weight:700}' +
      '#' + DIALOG_ID + ' #kn-layout-move-status{min-width:0;color:#9aa0a6;font-size:11px;font-weight:500;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '#' + DIALOG_ID + ' #kn-layout-move-status.ok{color:#81c995}#' + DIALOG_ID + ' #kn-layout-move-status.error{color:#f28b82}' +
      '#' + DIALOG_ID + ' .kn-group-board{grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}' +
      '#' + DIALOG_ID + ' .kn-group-zone,#' + DIALOG_ID + ' .kn-form-card,#' + DIALOG_ID + ' .kn-about-card,#' + DIALOG_ID + ' .kn-plugin-card,#' + DIALOG_ID + ' .kn-plugin-hero{border:1px solid rgba(232,234,237,.10);background:#1b1d23;border-radius:24px;box-shadow:none}' +
      '#' + DIALOG_ID + ' .kn-plugin-hero{display:flex;gap:16px;align-items:flex-start;padding:20px;margin-bottom:14px;background:linear-gradient(135deg,rgba(138,180,248,.14),rgba(27,29,35,1))}' +
      '#' + DIALOG_ID + ' .kn-plugin-logo{width:48px;height:48px;border-radius:16px;display:flex;align-items:center;justify-content:center;background:rgba(138,180,248,.14);border:1px solid rgba(138,180,248,.22);font-size:24px;flex:0 0 auto}' +
      '#' + DIALOG_ID + ' .kn-plugin-title{font-size:20px;font-weight:650;color:#f1f3f4;margin-bottom:6px}' +
      '#' + DIALOG_ID + ' .kn-plugin-desc{font-size:13px;line-height:1.7;color:#bdc1c6}' +
      '#' + DIALOG_ID + ' .kn-plugin-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}' +
      '#' + DIALOG_ID + ' .kn-plugin-card{padding:18px}' +
      '#' + DIALOG_ID + ' .kn-plugin-card.full{grid-column:1/-1}' +
      '#' + DIALOG_ID + ' .kn-plugin-card-title{font-size:15px;font-weight:650;color:#f1f3f4;margin-bottom:8px}' +
      '#' + DIALOG_ID + ' .kn-plugin-small{font-size:12px;line-height:1.7;color:#bdc1c6;margin-bottom:14px}' +
      '#' + DIALOG_ID + ' .kn-plugin-actions{display:flex;flex-wrap:wrap;gap:10px}' +
      '#' + DIALOG_ID + ' .kn-plugin-risk{padding:12px 14px;border-radius:18px;background:rgba(251,188,4,.08);border:1px solid rgba(251,188,4,.16);color:#fdd663;font-size:12px;line-height:1.7}' +
      '#' + DIALOG_ID + ' .kn-group-zone{padding:16px;min-height:156px}' +
      '#' + DIALOG_ID + ' .kn-zone-name,#' + DIALOG_ID + ' .kn-form-title,#' + DIALOG_ID + ' .kn-about-card-title{color:#f1f3f4;font-weight:650;letter-spacing:0}' +
      '#' + DIALOG_ID + ' .kn-zone-desc,#' + DIALOG_ID + ' .kn-note,#' + DIALOG_ID + ' .kn-about-small,#' + DIALOG_ID + ' .kn-about-list{color:#bdc1c6}' +
      '#' + DIALOG_ID + ' .kn-item{background:#202124;border-color:rgba(232,234,237,.13);color:#e8eaed;box-shadow:none}' +
      '#' + DIALOG_ID + ' .kn-item:hover{background:#2a2d34;border-color:#8ab4f8}' +
      '#' + DIALOG_ID + ' .kn-item-move select{background:#111318;border-color:rgba(232,234,237,.16);color:#e8eaed}' +
      '#' + DIALOG_ID + ' .kn-group-zone.drag-invalid{border-color:rgba(242,139,130,.65);background:rgba(234,67,53,.08)}' +
      '#' + DIALOG_ID + ' .kn-input-row input[type="text"],#' + DIALOG_ID + ' .kn-input-row input[type="number"],#' + DIALOG_ID + ' .kn-input-row input[type="password"],#' + DIALOG_ID + ' .kn-input-row select{background:#111318;border:1px solid rgba(232,234,237,.16);border-radius:16px;color:#e8eaed}' +
      '#' + DIALOG_ID + ' .kn-input-row input:focus,#' + DIALOG_ID + ' .kn-input-row select:focus{border-color:#8ab4f8;box-shadow:0 0 0 3px rgba(138,180,248,.14)}' +
      '#' + DIALOG_ID + ' .kn-panel-btn,#' + DIALOG_ID + ' .kn-google-btn{min-height:38px;padding:0 16px;border-radius:999px;border:1px solid rgba(232,234,237,.14);background:#202124;color:#e8eaed;font-size:13px;font-weight:600;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;box-shadow:none}' +
      '#' + DIALOG_ID + ' .kn-panel-btn:hover,#' + DIALOG_ID + ' .kn-google-btn:hover{background:#2a2d34;border-color:rgba(138,180,248,.45)}' +
      '#' + DIALOG_ID + ' .kn-panel-btn.primary,#' + DIALOG_ID + ' .kn-google-btn.primary{background:#8ab4f8;border-color:#8ab4f8;color:#07111f}' +
      '#' + DIALOG_ID + ' .kn-panel-btn:disabled,#' + DIALOG_ID + ' .kn-google-btn:disabled{opacity:.55;cursor:wait}' +
      '#' + DIALOG_ID + ' .kn-bg-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;flex-wrap:wrap}' +
      '#' + DIALOG_ID + ' .kn-bg-toolbar .kn-check{margin:0!important;background:#202124;border-color:rgba(232,234,237,.12)}' +
      '#' + DIALOG_ID + ' .kn-bg-mode-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:12px 0 14px}' +
      '#' + DIALOG_ID + ' .kn-bg-mode-option{position:relative;display:flex;align-items:flex-start;gap:10px;padding:14px;border-radius:18px;border:1px solid rgba(232,234,237,.12);background:#171a20;color:#e8eaed;cursor:pointer;transition:background .16s,border-color .16s,opacity .16s}' +
      '#' + DIALOG_ID + ' .kn-bg-mode-option:hover{background:#202124;border-color:rgba(138,180,248,.36)}' +
      '#' + DIALOG_ID + ' .kn-bg-mode-option input{margin-top:2px;accent-color:#8ab4f8}' +
      '#' + DIALOG_ID + ' .kn-bg-mode-option strong{display:block;font-size:13px;font-weight:650;margin-bottom:4px;color:#f1f3f4}' +
      '#' + DIALOG_ID + ' .kn-bg-mode-option span{display:block;font-size:12px;line-height:1.45;color:#9aa0a6}' +
      '#' + DIALOG_ID + ' .kn-bg-dependent.is-disabled{opacity:.45;filter:grayscale(.35)}' +
      '#' + DIALOG_ID + ' .kn-bg-dependent.is-disabled input,#' + DIALOG_ID + ' .kn-bg-dependent.is-disabled select,#' + DIALOG_ID + ' .kn-bg-dependent.is-disabled button{cursor:not-allowed!important}' +
      '#' + DIALOG_ID + ' .kn-field-help{margin:-4px 0 12px 120px;font-size:11px;line-height:1.55;color:#9aa0a6}' +
      '#' + DIALOG_ID + ' .kn-input-with-action{display:grid;grid-template-columns:minmax(0,1fr) 38px;gap:8px;align-items:center}' +
      '#' + DIALOG_ID + ' .kn-icon-clear{width:38px;height:38px;min-height:38px;border-radius:50%;padding:0;border:1px solid rgba(232,234,237,.14);background:#202124;color:#bdc1c6;font-size:18px;line-height:1;cursor:pointer}' +
      '#' + DIALOG_ID + ' .kn-icon-clear:hover{background:#2a2d34;color:#f1f3f4;border-color:rgba(138,180,248,.45)}' +
      '#' + DIALOG_ID + ' .kn-bg-card{display:flex;flex-direction:column;min-height:172px}' +
      '#' + DIALOG_ID + ' .kn-bg-card .kn-form-title:before{width:4px;height:14px;opacity:.55}' +
      '#' + DIALOG_ID + ' .kn-slider-row{display:grid;grid-template-columns:90px minmax(0,1fr) 58px;gap:10px;align-items:center;margin:14px 0}' +
      '#' + DIALOG_ID + ' .kn-slider-row label{font-size:12px;color:#bdc1c6}' +
      '#' + DIALOG_ID + ' .kn-slider-row input[type=range]{width:100%;accent-color:#8ab4f8}' +
      '#' + DIALOG_ID + ' .kn-slider-value{justify-self:end;min-width:54px;padding:4px 8px;border-radius:999px;background:#111318;border:1px solid rgba(232,234,237,.10);color:#e8eaed;font-size:11px;font-variant-numeric:tabular-nums;text-align:center}' +
      '#' + DIALOG_ID + ' .kn-appearance-grid{gap:12px!important}' +
      '#' + DIALOG_ID + ' .kn-appearance-card{padding:16px!important;background:#171a20!important;border-color:rgba(232,234,237,.08)!important}' +
      '#' + DIALOG_ID + ' .kn-form-title-row{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}' +
      '#' + DIALOG_ID + ' .kn-form-title-row .kn-form-title{margin-bottom:0!important}' +
      '#' + DIALOG_ID + ' .kn-form-title.compact:before{width:4px!important;height:13px!important;opacity:.55!important}' +
      '#' + DIALOG_ID + ' .kn-color-control{display:grid;grid-template-columns:52px minmax(120px,220px);gap:10px;align-items:center}' +
      '#' + DIALOG_ID + ' .kn-color-control input[type=color]{width:52px!important;height:38px!important;padding:0!important;border-radius:14px!important;border:1px solid rgba(232,234,237,.16)!important;background:#111318!important;cursor:pointer}' +
      '#' + DIALOG_ID + ' .kn-color-hex{min-height:38px!important;text-transform:uppercase;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}' +
      '#' + DIALOG_ID + ' .kn-inline-actions{display:flex;align-items:center;gap:8px}' +
      '#' + DIALOG_ID + ' .kn-text-action{min-height:30px;padding:0 10px;border-radius:999px;border:1px solid rgba(138,180,248,.20);background:rgba(138,180,248,.08);color:#d3e3fd;font-size:12px;font-weight:650;cursor:pointer}' +
      '#' + DIALOG_ID + ' .kn-text-action:hover{background:rgba(138,180,248,.16)}' +
      '#' + DIALOG_ID + ' .kn-visual-list{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px 18px}' +
      '#' + DIALOG_ID + ' .kn-visual-list .kn-check{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:12px!important;margin:0!important;padding:8px 0!important;border:0!important;background:transparent!important;border-radius:0!important;color:#e8eaed!important}' +
      '#' + DIALOG_ID + ' .kn-visual-list .kn-check span{font-size:13px;color:#e8eaed;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '#' + DIALOG_ID + ' .kn-visual-list .kn-check input{width:18px!important;height:18px!important;flex:0 0 auto}' +
      '#' + DIALOG_ID + ' .kn-inline-config{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 18px;align-items:center}' +
      '#' + DIALOG_ID + ' .kn-field-help.local{margin:4px 0 0!important;font-size:11px;color:#9aa0a6}' +
      '#' + DIALOG_ID + ' .kn-collapse-card.is-off .kn-inline-config{opacity:.45;filter:grayscale(.25)}' +
      '#' + DIALOG_ID + ' .kn-bg-card-row{align-items:stretch}' +
      '#' + DIALOG_ID + ' .kn-panel-btn.small-text{min-height:34px;font-size:12px}' +
      '#' + DIALOG_ID + ' input:disabled,#' + DIALOG_ID + ' select:disabled,#' + DIALOG_ID + ' button:disabled{opacity:.55}' +
      '#' + DIALOG_ID + ' .kn-about-hero{padding:22px;border-radius:28px;background:linear-gradient(135deg,#1f2d42,#17212f);border:1px solid rgba(138,180,248,.18);box-shadow:none}' +
      '#' + DIALOG_ID + ' .kn-about-logo{width:62px;height:62px;border-radius:20px;background:#8ab4f8;color:#07111f;font-size:28px;font-weight:800;border:0;font-family:Google Sans,Roboto,Arial,sans-serif}' +
      '#' + DIALOG_ID + ' .kn-about-title{font-size:22px;font-weight:650;color:#f1f3f4}' +
      '#' + DIALOG_ID + ' .kn-about-desc{color:#d7dde6}' +
      '#' + DIALOG_ID + ' .kn-about-tags span{background:#263850;color:#d3e3fd;border:0}' +
      '#' + DIALOG_ID + ' .kn-about-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}' +
      '#' + DIALOG_ID + ' .kn-about-kv{border-bottom:1px solid rgba(232,234,237,.08);padding:9px 0}' +
      '#' + DIALOG_ID + ' .kn-about-kv b{color:#9aa0a6}' +
      '#' + DIALOG_ID + ' .kn-about-kv span{color:#e8eaed}' +
      '#' + DIALOG_ID + ' .kn-about-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}' +
      '#' + DIALOG_ID + ' .kn-about-update-note{margin-top:12px;padding:12px 14px;border-radius:18px;background:#151a22;border:1px solid rgba(232,234,237,.10);color:#bdc1c6;font-size:12px;line-height:1.6}' +
      '#' + DIALOG_ID + ' .kn-about-update-note a{color:#8ab4f8;text-decoration:none;font-weight:650}' +
      '#' + DIALOG_ID + ' .kn-settings-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:14px;padding-top:14px;border-top:1px solid rgba(232,234,237,.08)}' +
      '#' + DIALOG_ID + ' .kn-settings-actions .kn-panel-btn{flex:0 0 auto}' +
      '#' + DIALOG_ID + ' .kn-dialog-footer{justify-content:flex-end!important}' +
      '#' + DIALOG_ID + ' .kn-footer-right.only{margin-left:auto}' +
      '#' + DIALOG_ID + ' .kn-version-state.ok{color:#81c995}#' + DIALOG_ID + ' .kn-version-state.new{color:#8ab4f8}#' + DIALOG_ID + ' .kn-version-state.warn{color:#fdd663}#' + DIALOG_ID + ' .kn-version-state.error{color:#f28b82}#' + DIALOG_ID + ' .kn-version-state.checking{color:#bdc1c6}' +
      '@media(max-width:980px){#' + DIALOG_ID + ' .kn-visual-list{grid-template-columns:repeat(2,minmax(0,1fr))}#' + DIALOG_ID + ' .kn-inline-config{grid-template-columns:1fr}#' + DIALOG_ID + ' .kn-color-control{grid-template-columns:52px minmax(0,1fr)}}' +
      '@media(max-width:860px){#' + DIALOG_ID + ' .kn-dialog-content{width:calc(100vw - 20px);height:calc(100vh - 20px);border-radius:24px}#' + DIALOG_ID + ' .kn-dialog-header{padding:20px}#' + DIALOG_ID + ' .kn-dialog-body{display:block;padding:16px 20px}#' + DIALOG_ID + ' .kn-settings-tabs{position:relative;display:flex;flex-direction:row;align-items:stretch;overflow-x:auto;overflow-y:hidden;gap:6px;margin-bottom:16px;padding:6px;border-radius:14px;scroll-snap-type:x proximity;-webkit-overflow-scrolling:touch}#' + DIALOG_ID + ' .kn-settings-tabs::-webkit-scrollbar{height:0}#' + DIALOG_ID + ' .kn-settings-tab{flex:0 0 auto;min-width:96px;min-height:38px;padding:0 14px;border-radius:10px;text-align:center;white-space:nowrap;scroll-snap-align:start}#' + DIALOG_ID + ' .kn-group-board,#' + DIALOG_ID + ' .kn-about-grid,#' + DIALOG_ID + ' .kn-plugin-grid{grid-template-columns:1fr}#' + DIALOG_ID + ' .kn-dialog-footer{padding:14px 20px 18px}#' + DIALOG_ID + ' .kn-field-help{margin-left:0}#' + DIALOG_ID + ' .kn-bg-mode-grid{grid-template-columns:1fr}#' + DIALOG_ID + ' .kn-slider-row{grid-template-columns:74px minmax(0,1fr) 54px}}' +
      '@media(max-width:520px){#' + DIALOG_ID + ' .kn-dialog-header{align-items:flex-start;gap:12px}#' + DIALOG_ID + ' .kn-dialog-title{font-size:22px}#' + DIALOG_ID + ' .kn-about-hero{align-items:flex-start;flex-direction:column}#' + DIALOG_ID + ' .kn-footer-left,#' + DIALOG_ID + ' .kn-footer-right{width:100%}#' + DIALOG_ID + ' .kn-panel-btn{flex:1 1 auto}#' + DIALOG_ID + ' .kn-layout-page-head{align-items:flex-start;flex-direction:column;gap:4px}#' + DIALOG_ID + ' #kn-layout-move-status{text-align:left;white-space:normal}#' + DIALOG_ID + ' .kn-item{grid-template-columns:minmax(0,1fr) auto}#' + DIALOG_ID + ' .kn-item-move>span{display:none}}';
    style.textContent += '' +
      '#' + DIALOG_ID + ' .kn-forward-page-head{display:flex;flex-direction:column;align-items:stretch;gap:12px;padding:14px 16px;margin-bottom:12px;border:1px solid rgba(232,234,237,.10);border-radius:22px;background:linear-gradient(135deg,rgba(138,180,248,.08),rgba(22,25,32,.94))}' +
      '#' + DIALOG_ID + ' .kn-forward-head-left{min-width:0}' +
      '#' + DIALOG_ID + ' .kn-forward-page-head .kn-forward-title{font-size:18px;font-weight:800;color:#f1f3f4;margin:0 0 4px}' +
      '#' + DIALOG_ID + ' .kn-forward-page-head .kn-forward-desc{font-size:12px;line-height:1.45;color:#bdc1c6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '#' + DIALOG_ID + ' .kn-forward-head-actions{display:flex;align-items:center;justify-content:flex-start;gap:8px;flex-wrap:wrap}' +
      '#' + DIALOG_ID + ' .kn-forward-inline-status{display:inline-flex;align-items:center;max-width:230px;height:32px;padding:0 10px;border-radius:999px;border:1px solid rgba(232,234,237,.10);background:#151a22;color:#bdc1c6;font-size:11px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '#' + DIALOG_ID + ' .kn-forward-inline-status.ok{color:#81c995;border-color:rgba(129,201,149,.24);background:rgba(52,168,83,.08)}' +
      '#' + DIALOG_ID + ' .kn-forward-inline-status.loading{color:#8ab4f8;border-color:rgba(138,180,248,.24);background:rgba(138,180,248,.08)}' +
      '#' + DIALOG_ID + ' .kn-forward-inline-status.error{color:#f28b82;border-color:rgba(242,139,130,.28);background:rgba(234,67,53,.08)}' +
      '#' + DIALOG_ID + ' .kn-forward-grid.modern{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}' +
      '#' + DIALOG_ID + ' .kn-forward-card{padding:14px;border-radius:18px;background:rgba(17,19,24,.42);border:1px solid rgba(232,234,237,.09);min-width:0}' +
      '#' + DIALOG_ID + ' .kn-forward-card.native{background:rgba(23,26,32,.36)}' +
      '#' + DIALOG_ID + ' .kn-forward-card.full{grid-column:1/-1}' +
      '#' + DIALOG_ID + ' .kn-readonly-chip{display:inline-flex;align-items:center;height:18px;padding:0 7px;margin-left:6px;border-radius:999px;background:rgba(232,234,237,.07);border:1px solid rgba(232,234,237,.10);color:#9aa0a6;font-size:10px;font-weight:800;vertical-align:middle}' +
      '#' + DIALOG_ID + ' .kn-forward-kv-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 12px;margin-top:10px}' +
      '#' + DIALOG_ID + ' .kn-forward-kv-grid .full{grid-column:1/-1}' +
      '#' + DIALOG_ID + ' .kn-forward-kv{display:grid;grid-template-columns:78px minmax(0,1fr);gap:8px;align-items:center;min-height:28px;border-bottom:1px solid rgba(232,234,237,.055);font-size:12px}' +
      '#' + DIALOG_ID + ' .kn-forward-kv b{color:#9aa0a6;font-weight:750}.kn-forward-kv span{color:#e8eaed;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '#' + DIALOG_ID + ' .kn-input-row.compact,#' + DIALOG_ID + ' .kn-native-mini-grid .kn-input-row{grid-template-columns:78px minmax(180px,360px);justify-content:start}' +
      '#' + DIALOG_ID + ' .kn-native-mini-grid.normalized{display:grid;grid-template-columns:minmax(0,1fr) 130px;gap:8px 12px}' +
      '#' + DIALOG_ID + ' .kn-native-mini-grid.normalized .full{grid-column:1/-1}' +
      '#' + DIALOG_ID + ' .kn-native-mini-grid.normalized .short{grid-template-columns:54px 76px}' +
      '#' + DIALOG_ID + ' .kn-input-row.readonly input{opacity:.78;background:#111318;color:#bdc1c6;border-style:dashed;cursor:not-allowed}' +
      '#' + DIALOG_ID + ' .kn-forward-readonly-box{min-height:72px;max-height:150px;overflow:auto;margin:8px 0 0;padding:11px 12px;border-radius:14px;border:1px solid rgba(232,234,237,.10);background:#111318;color:#bdc1c6;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;line-height:1.55;white-space:pre-wrap;word-break:break-word}' +
      '#' + DIALOG_ID + ' .kn-forward-readonly-box.plain{font-family:inherit;color:#bdc1c6}' +
      '#' + DIALOG_ID + ' .kn-forward-card.is-disabled{opacity:.58}' +
      '#' + DIALOG_ID + ' .kn-forward-card.is-disabled input:not([data-forward="enableCallForward"]),#' + DIALOG_ID + ' .kn-forward-card.is-disabled select,#' + DIALOG_ID + ' .kn-forward-card.is-disabled textarea,#' + DIALOG_ID + ' .kn-forward-card.is-disabled button{cursor:not-allowed!important}' +
      '#' + DIALOG_ID + ' .kn-forward-status.slim{padding:8px 10px;border-radius:13px;font-size:11.5px;background:rgba(138,180,248,.055);border-color:rgba(138,180,248,.12)}' +
      '#' + DIALOG_ID + ' .kn-settings-actions.local{margin-top:10px;padding-top:10px;border-top:1px solid rgba(232,234,237,.08);justify-content:flex-start}' +
      '#' + DIALOG_ID + ' .kn-settings-actions.local button:disabled{opacity:.45;filter:grayscale(1);cursor:not-allowed}' +
      '#' + DIALOG_ID + ' .kn-native-control-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;align-items:center;margin:10px 0}' +
      '#' + DIALOG_ID + ' .kn-forward-kv-grid.compact-status{margin-top:8px;opacity:.82}' +
      '#' + DIALOG_ID + ' [data-native-method-card]{display:none;transition:opacity .16s ease,border-color .16s ease,background .16s ease}' +
      '#' + DIALOG_ID + ' [data-native-method-card].is-inactive-method{display:none!important}' +
      '#' + DIALOG_ID + ' [data-native-method-card].is-active-method{display:block;border-color:rgba(138,180,248,.26);background:rgba(138,180,248,.055)}' +
      '#' + DIALOG_ID + ' .kn-forward-template-viewer[hidden]{display:none!important}' +
      '#' + DIALOG_ID + ' .kn-forward-template-viewer.is-open{display:block}' +
      '#' + DIALOG_ID + ' .kn-template-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:10px}' +
      '#' + DIALOG_ID + ' .kn-template-grid .full{grid-column:1/-1}' +
      '#' + DIALOG_ID + ' .kn-template-grid b{display:block;margin:0 0 6px;color:#e8eaed;font-size:12px}' +
      '#' + DIALOG_ID + ' .kn-native-control-grid .kn-check{margin:0!important;justify-content:space-between;background:#171a20!important;border-color:rgba(232,234,237,.10)!important}' +
      '#' + DIALOG_ID + ' .kn-native-control-grid .kn-input-row{margin:0}' +
      '#' + DIALOG_ID + ' .kn-forward-inline-status.warn{color:#fdd663;border-color:rgba(253,214,99,.26);background:rgba(251,188,4,.08)}' +
      '#' + DIALOG_ID + ' .kn-secret-input{display:grid;grid-template-columns:minmax(0,1fr) 58px;gap:8px;min-width:0}' +
      '#' + DIALOG_ID + ' .kn-secret-input input{width:100%;min-width:0}' +
      '#' + DIALOG_ID + ' .kn-secret-toggle{min-height:36px;padding:0 10px;border-radius:12px;border:1px solid rgba(232,234,237,.14);background:#202124;color:#d3e3fd;font-size:11px;font-weight:700;cursor:pointer}' +
      '#' + DIALOG_ID + ' .kn-secret-toggle:hover{background:#2a2d34;border-color:rgba(138,180,248,.45)}' +
      '#' + DIALOG_ID + ' .kn-call-preview{min-height:44px;margin-top:10px}' +
      '#' + DIALOG_ID + ' .native-locked [data-native-method-card]{opacity:.62}' +
      '@media(max-width:900px){#' + DIALOG_ID + ' .kn-forward-page-head{grid-template-columns:1fr}#' + DIALOG_ID + ' .kn-forward-head-actions{justify-content:flex-start}#' + DIALOG_ID + ' .kn-forward-grid.modern{grid-template-columns:1fr}#' + DIALOG_ID + ' .kn-forward-page-head .kn-forward-desc{white-space:normal}#' + DIALOG_ID + ' .kn-native-mini-grid.normalized{grid-template-columns:1fr}#' + DIALOG_ID + ' .kn-input-row.compact,#' + DIALOG_ID + ' .kn-native-mini-grid .kn-input-row{grid-template-columns:1fr}#' + DIALOG_ID + ' .kn-native-control-grid{grid-template-columns:1fr}}';
    document.head.appendChild(style);
  }

  function enhanceSettingsInteractionMarkup(dialog) {
    var layoutPanel = dialog.querySelector('#kn-settings-panel-layout');
    var layoutHead = layoutPanel && layoutPanel.firstElementChild;
    if (layoutHead) {
      layoutHead.removeAttribute('style');
      layoutHead.className = 'kn-layout-page-head';
      layoutHead.innerHTML = '<span>导航分组与模块管理</span><span id="kn-layout-move-status">选择目标分组；电脑端也可拖拽</span>';
    }

    var nativeFieldSelectors = [
      '#kn-native-forward-enable', '#kn-native-power-enable', '#kn-native-forward-devinfo',
      '#kn-native-forward-method-select', '#kn-native-dingtalk-webhook', '#kn-native-dingtalk-secret',
      '#kn-native-smtp-host', '#kn-native-smtp-port', '#kn-native-smtp-user', '#kn-native-smtp-to',
      '#kn-native-smtp-pass', '#kn-native-curl-text'
    ];
    nativeFieldSelectors.forEach(function (selector) {
      var field = dialog.querySelector(selector);
      if (!field) return;
      field.setAttribute('data-native-forward-field', '');
      field.disabled = true;
    });

    function addSecretToggle(selector, label) {
      var input = dialog.querySelector(selector);
      if (!input || input.parentElement.classList.contains('kn-secret-input')) return;
      input.type = 'password';
      var wrap = document.createElement('div');
      wrap.className = 'kn-secret-input';
      input.parentNode.insertBefore(wrap, input);
      wrap.appendChild(input);
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'kn-secret-toggle';
      btn.textContent = '显示';
      btn.setAttribute('data-secret-target', selector);
      btn.setAttribute('aria-label', '显示或隐藏' + label);
      btn.setAttribute('aria-pressed', 'false');
      wrap.appendChild(btn);
    }
    addSecretToggle('#kn-native-dingtalk-secret', '钉钉加密密钥');
    addSecretToggle('#kn-native-smtp-pass', 'SMTP 密码');

    var validateBtn = dialog.querySelector('[data-action="testNativeForwardConfig"]');
    if (validateBtn) validateBtn.textContent = '校验当前通道';
    var dingtalkHelp = dialog.querySelector('[data-native-method-card="dingtalk"] .kn-field-help');
    if (dingtalkHelp) dingtalkHelp.textContent = '保存后写入原生钉钉转发配置。';

    var phoneTestBtn = dialog.querySelector('[data-action="testForwardConfig"]');
    if (phoneTestBtn) phoneTestBtn.textContent = '预览电话模板';
    var phoneTarget = dialog.querySelector('[data-forward="callForwardTarget"]');
    if (phoneTarget) {
      phoneTarget.value = 'native';
      var phoneTargetRow = phoneTarget.closest('.kn-input-row');
      if (phoneTargetRow) phoneTargetRow.hidden = true;
    }
    var phoneStatus = dialog.querySelector('#kn-forward-call-card .kn-forward-status');
    if (phoneStatus) phoneStatus.textContent = '配置保存在当前浏览器；关闭时事件和模板会自动禁用。';
    var phoneTemplate = dialog.querySelector('[data-forward="callTemplate"]');
    if (phoneTemplate && !dialog.querySelector('#kn-forward-call-preview')) {
      var preview = document.createElement('div');
      preview.id = 'kn-forward-call-preview';
      preview.className = 'kn-forward-readonly-box plain kn-call-preview';
      preview.hidden = true;
      phoneTemplate.parentNode.insertBefore(preview, phoneTemplate.nextSibling);
    }
  }

  function buildDialog() {
    var presetOptions = Object.keys(BACKGROUND_PRESETS).map(function (key) {
      return '<option value="' + key + '">' + BACKGROUND_PRESETS[key].label + '</option>';
    }).join('');

    var dialog = document.createElement('dialog');
    dialog.id = DIALOG_ID;
    dialog.innerHTML = '<div class="kn-dialog-content"><div class="kn-dialog-header"><div><div class="kn-dialog-title">界面设置</div><div class="kn-dialog-subtitle">安全布局：不移动第三方插件 div，不创建插件 Hub。这里集成导航分组、界面美化与背景、原生功能分类、消息转发和现代插件管理。</div></div><button type="button" class="kn-panel-btn" data-action="close">关闭</button></div><div class="kn-dialog-body"><div class="kn-settings-tabs"><button class="kn-settings-tab active" data-tab="layout" type="button">导航分组</button><button class="kn-settings-tab" data-tab="appearance" type="button">界面美化</button><button class="kn-settings-tab" data-tab="forward" type="button">消息转发</button><button class="kn-settings-tab" data-tab="plugins" type="button">插件功能</button><button class="kn-settings-tab" data-tab="about" type="button">关于</button></div><div id="kn-settings-panel-layout" class="kn-settings-panel active"><div style="display:flex;justify-content:space-between;gap:12px;margin-bottom:12px;font-size:13px;color:rgba(255,255,255,.74);font-weight:800"><span>导航分组与模块管理</span><span style="font-size:11px;color:rgba(255,255,255,.46);font-weight:500">点击项目循环移动；电脑端可拖拽</span></div><div id="kn-settings-board" class="kn-group-board"></div><div class="kn-note">当前版本采用原地显隐：第三方 div 面板不再被移动到其他容器，避免破坏原插件结构。</div><div class="kn-settings-actions"><button type="button" class="kn-panel-btn" data-action="reset">恢复默认分组</button></div></div><div id="kn-settings-panel-appearance" class="kn-settings-panel"><div class="kn-form-grid kn-appearance-grid"><div class="kn-form-card full kn-appearance-card"><div class="kn-form-title">主题与基础</div><div class="kn-input-row"><label>模式</label><select data-appearance="themeMode"><option value="dark">夜间模式</option><option value="light">日间模式</option><option value="auto">跟随系统</option></select></div><div class="kn-input-row"><label>强调色</label><div class="kn-color-control"><input type="color" data-appearance="accentColor" aria-label="选择强调色"><input type="text" class="kn-color-hex" data-appearance="accentColor" maxlength="9" placeholder="#4E92FF"></div></div><div class="kn-field-help">支持 HEX 颜色值，例如 #3B82F6；可直接复制或手动输入。</div><div class="kn-slider-row"><label>字体缩放</label><input type="range" min="88" max="116" data-appearance="fontScale"><span class="kn-slider-value" data-value-for="fontScale">--</span></div><div class="kn-slider-row"><label>动画强度</label><input type="range" min="0" max="2" data-appearance="animationLevel"><span class="kn-slider-value" data-value-for="animationLevel">--</span></div></div><div class="kn-form-card full kn-appearance-card"><div class="kn-form-title-row"><div class="kn-form-title">视觉效果</div><div class="kn-inline-actions"><button type="button" class="kn-text-action" data-action="appearanceAllOn">全选</button><button type="button" class="kn-text-action" data-action="appearanceDefault">重置默认</button></div></div><div class="kn-visual-list"><label class="kn-check"><span>圆角卡片</span><input type="checkbox" data-appearance="enableRadius"></label><label class="kn-check"><span>悬浮阴影</span><input type="checkbox" data-appearance="enableShadow"></label><label class="kn-check"><span>胶囊按钮</span><input type="checkbox" data-appearance="enableCapsule"></label><label class="kn-check"><span>玻璃拟态</span><input type="checkbox" data-appearance="enableGlass"></label><label class="kn-check"><span>紧凑布局</span><input type="checkbox" data-appearance="enableCompact"></label><label class="kn-check"><span>动态悬停</span><input type="checkbox" data-appearance="enableHover"></label><label class="kn-check"><span>极简滚条</span><input type="checkbox" data-appearance="enableScrollbar"></label><label class="kn-check"><span>渐变标题</span><input type="checkbox" data-appearance="enableGradient"></label><label class="kn-check"><span>柔和分割线</span><input type="checkbox" data-appearance="enableSoftDivider"></label><label class="kn-check"><span>文字增强</span><input type="checkbox" data-appearance="enableReadableText"></label></div></div><div class="kn-form-card full kn-appearance-card kn-collapse-card"><div class="kn-form-title-row"><div><div class="kn-form-title compact">渐变标题</div><div class="kn-field-help local">开启“渐变标题”后，这里配置标题的起止颜色。</div></div></div><div class="kn-inline-config" data-effect-config="enableGradient"><div class="kn-input-row"><label>起点颜色</label><div class="kn-color-control"><input type="color" data-appearance="gradColor1"><input type="text" class="kn-color-hex" data-appearance="gradColor1" maxlength="9"></div></div><div class="kn-input-row"><label>终点颜色</label><div class="kn-color-control"><input type="color" data-appearance="gradColor2"><input type="text" class="kn-color-hex" data-appearance="gradColor2" maxlength="9"></div></div></div></div><div class="kn-form-card full kn-appearance-card kn-collapse-card"><div class="kn-form-title-row"><div><div class="kn-form-title compact">顶栏质感</div><div class="kn-field-help local">控制顶部栏模糊、透明度与紧凑状态。</div></div><button type="button" class="kn-panel-btn small-text" data-action="compact">切换紧凑顶栏</button></div><div class="kn-inline-config"><div class="kn-slider-row"><label>顶栏模糊</label><input type="range" min="8" max="40" data-appearance="headerBlur"><span class="kn-slider-value" data-value-for="headerBlur">--</span></div><div class="kn-slider-row"><label>顶栏透明度</label><input type="range" min="35" max="98" data-appearance="headerOpacity"><span class="kn-slider-value" data-value-for="headerOpacity">--</span></div></div></div><div class="kn-form-card full kn-appearance-card"><div class="kn-form-title">美化配置</div><div class="kn-field-help" style="margin:0 0 12px">这里只重置界面美化相关配置，不影响导航分组和插件面板归类。</div><div class="kn-settings-actions" style="margin-top:0;padding-top:0;border-top:0"><button type="button" class="kn-panel-btn" data-action="resetAppearance">恢复默认美化</button></div></div></div></div><div id="kn-settings-panel-background" class="kn-settings-panel"><div class="kn-form-grid kn-bg-card-row"><div class="kn-form-card full"><div class="kn-bg-toolbar"><div class="kn-form-title">首页背景图</div><label class="kn-check"><input type="checkbox" data-appearance="enableBackground">启用背景图</label></div><div class="kn-bg-mode-grid kn-bg-dependent" data-bg-scope="source"><label class="kn-bg-mode-option"><input type="radio" name="kn-bg-mode" value="preset" data-appearance="backgroundMode"><span><strong>使用预装背景</strong><span>从内置背景中选择，适合快速切换。</span></span></label><label class="kn-bg-mode-option"><input type="radio" name="kn-bg-mode" value="custom" data-appearance="backgroundMode"><span><strong>使用自定义 URL</strong><span>使用图片链接作为首页背景。</span></span></label></div><div class="kn-input-row kn-bg-dependent" data-bg-scope="preset"><label>预装背景</label><select data-appearance="backgroundPreset">' + presetOptions + '</select></div><div class="kn-field-help kn-bg-dependent" data-bg-scope="preset">选择预装项后立即生效；“无背景”会保留背景系统但不显示图片。</div><div class="kn-input-row kn-bg-dependent" data-bg-scope="custom"><label>自定义 URL</label><div class="kn-input-with-action"><input type="text" data-appearance="backgroundImage" placeholder="粘贴 https://.../background.jpg"><button type="button" class="kn-icon-clear" data-action="clearBackgroundUrl" title="清空自定义 URL">×</button></div></div><div class="kn-field-help kn-bg-dependent" data-bg-scope="custom">仅在选择“使用自定义 URL”时生效。建议使用 1920×1080 或更高分辨率图片。</div></div><div class="kn-form-card kn-bg-card kn-bg-dependent" data-bg-scope="effect"><div class="kn-form-title">背景遮罩</div><div class="kn-slider-row"><label>暗度</label><input type="range" min="0" max="85" data-appearance="backgroundDim"><span class="kn-slider-value" data-value-for="backgroundDim">--</span></div><div class="kn-slider-row"><label>模糊</label><input type="range" min="0" max="30" data-appearance="backgroundBlur"><span class="kn-slider-value" data-value-for="backgroundBlur">--</span></div><div class="kn-field-help" style="margin:4px 0 0">暗度控制背景遮罩透明度；模糊用于降低图片细节干扰。</div></div><div class="kn-form-card kn-bg-card kn-bg-dependent" data-bg-scope="effect"><div class="kn-form-title">背景质感</div><div class="kn-slider-row"><label>饱和度</label><input type="range" min="50" max="180" data-appearance="backgroundSaturate"><span class="kn-slider-value" data-value-for="backgroundSaturate">--</span></div><div class="kn-field-help" style="margin:4px 0 14px">饱和度用于控制背景颜色浓度，不影响页面组件本身。</div><button type="button" class="kn-panel-btn small-text" data-action="resetBackgroundSettings" style="margin-top:auto;align-self:flex-start">重置背景设置</button></div></div></div><div id="kn-settings-panel-forward" class="kn-settings-panel"><div class="kn-forward-page-head"><div class="kn-forward-head-left"><div class="kn-forward-title">消息转发</div><div class="kn-forward-desc">可读取并保存原生消息/电源转发配置；电话事件转发为本插件增强配置。</div></div><div class="kn-forward-head-actions"><span id="kn-native-forward-read-status" class="kn-forward-inline-status">未读取</span><button type="button" class="kn-google-btn primary" data-action="refreshNativeForwardConfig">读取配置</button><button type="button" class="kn-google-btn primary" data-action="saveNativeForwardConfig">保存原生配置</button><button type="button" class="kn-google-btn" data-action="testNativeForwardConfig">测试原生通道</button><button type="button" class="kn-google-btn" data-action="toggleForwardTemplates">消息模板</button><button type="button" class="kn-google-btn" data-action="openNativeSmsForward">打开原生界面</button></div></div><div class="kn-forward-grid modern"><section class="kn-forward-card native full"><div class="kn-form-title-row"><div><div class="kn-form-title">原生消息转发</div><div class="kn-field-help local">原生界面名称可能显示为“短信转发”，但实际包含短信转发和设备通电通知。本页可直接修改并保存原生配置。</div></div></div><div class="kn-native-control-grid"><label class="kn-check primary-switch"><span>启用消息转发</span><input id="kn-native-forward-enable" type="checkbox"></label><label class="kn-check primary-switch"><span>启用电源通知</span><input id="kn-native-power-enable" type="checkbox"></label><label class="kn-check primary-switch"><span>附加设备信息</span><input id="kn-native-forward-devinfo" type="checkbox"></label><div class="kn-input-row compact"><label>当前通道</label><select id="kn-native-forward-method-select"><option value="dingtalk">钉钉机器人</option><option value="smtp">SMTP 邮件</option><option value="curl">CURL 命令</option></select></div></div><div class="kn-forward-kv-grid compact-status"><div class="kn-forward-kv"><b>消息转发</b><span id="kn-native-forward-enabled">--</span></div><div class="kn-forward-kv"><b>电源通知</b><span id="kn-native-power-enabled">--</span></div><div class="kn-forward-kv"><b>当前方式</b><span id="kn-native-forward-method">--</span></div><div class="kn-forward-kv"><b>原始值</b><span id="kn-native-forward-method-raw">--</span></div><div class="kn-forward-kv full"><b>设备信息</b><span id="kn-native-forward-device-info">--</span></div></div></section><section class="kn-forward-card native" data-native-method-card="dingtalk"><div class="kn-form-title">钉钉配置</div><div class="kn-input-row compact"><label>Webhook</label><input id="kn-native-dingtalk-webhook" placeholder="https://oapi.dingtalk.com/robot/send?..." autocomplete="off"></div><div class="kn-input-row compact"><label>加密密钥</label><input id="kn-native-dingtalk-secret" placeholder="SEC... 可为空" autocomplete="off"></div><div class="kn-field-help">保存后会写入原生钉钉转发配置；测试原生通道会调用原生转发接口。</div></section><section class="kn-forward-card native" data-native-method-card="smtp"><div class="kn-form-title">SMTP 配置</div><div class="kn-native-mini-grid normalized"><div class="kn-input-row"><label>主机</label><input id="kn-native-smtp-host" placeholder="smtp.example.com"></div><div class="kn-input-row short"><label>端口</label><input id="kn-native-smtp-port" placeholder="465" inputmode="numeric"></div><div class="kn-input-row"><label>账号</label><input id="kn-native-smtp-user" placeholder="user@example.com"></div><div class="kn-input-row"><label>收件人</label><input id="kn-native-smtp-to" placeholder="to@example.com"></div><div class="kn-input-row full"><label>密码</label><input id="kn-native-smtp-pass" placeholder="SMTP 授权码 / 密码" type="password"></div></div></section><section class="kn-forward-card native" data-native-method-card="curl"><div class="kn-form-title">CURL 命令 / 模板</div><textarea id="kn-native-curl-text" class="kn-forward-textarea" placeholder="例如：curl -s -X POST ..."></textarea><div class="kn-field-help">CURL 通道会把这里的命令写入原生配置。</div></section><section id="kn-forward-template-card" class="kn-forward-card native full kn-forward-template-viewer" hidden><div class="kn-form-title-row"><div><div class="kn-form-title">消息转发信息模板</div><div class="kn-field-help local">当前通道：<span id="kn-native-template-channel">--</span>。这里展示短信、电源通知和附加设备信息的组成方式。</div></div><button type="button" class="kn-panel-btn small-text" data-action="toggleForwardTemplates">收起</button></div><div class="kn-template-grid"><div><b>短信模板</b><div id="kn-template-sms" class="kn-forward-readonly-box plain">尚未读取。</div></div><div><b>电源模板</b><div id="kn-template-power" class="kn-forward-readonly-box plain">尚未读取。</div></div><div class="full"><b>附加设备信息</b><div id="kn-template-device" class="kn-forward-readonly-box plain">尚未读取。</div></div><div class="full"><b>CURL 当前命令</b><div id="kn-template-curl-preview" class="kn-forward-readonly-box">尚未读取。</div></div></div></section><section id="kn-forward-call-card" class="kn-forward-card"><div class="kn-form-title">电话事件转发增强</div><label class="kn-check primary-switch"><span>启用电话事件转发</span><input type="checkbox" data-forward="enableCallForward"></label><div class="kn-forward-event-list"><label class="kn-check"><span>来电</span><input type="checkbox" data-forward="callIncoming"></label><label class="kn-check"><span>未接</span><input type="checkbox" data-forward="callMissed"></label><label class="kn-check"><span>接通</span><input type="checkbox" data-forward="callAnswered"></label><label class="kn-check"><span>挂断</span><input type="checkbox" data-forward="callEnded"></label></div><div class="kn-input-row"><label>转发目标</label><select data-forward="callForwardTarget"><option value="native">复用原生转发方式</option><option value="custom">独立电话转发配置</option></select></div><div class="kn-forward-status slim">关闭电话事件转发时，下方事件、模板和测试按钮会自动禁用。</div></section><section id="kn-forward-call-template-card" class="kn-forward-card"><div class="kn-form-title">电话消息模板</div><textarea class="kn-forward-textarea" data-forward="callTemplate" placeholder="例如：{event} | {number} | {time} | {duration}"></textarea><div class="kn-settings-actions local"><button type="button" class="kn-panel-btn primary" data-action="saveForwardConfig">保存电话转发</button><button type="button" class="kn-panel-btn" data-action="testForwardConfig">测试电话转发</button></div></section></div></div><div id="kn-settings-panel-plugins" class="kn-settings-panel"><div class="kn-plugin-manager-shell"><div class="kn-plugin-topbar kn-plugin-merged-head"><div class="kn-plugin-title-block"><div class="kn-plugin-title-line"><span class="kn-plugin-title">插件管理</span><span id="kn-plugin-status" class="kn-plugin-status">尚未读取插件列表。</span></div><div class="kn-plugin-desc">左侧选择与启停，右侧编辑名称和源码。保存后写入 custom head，并自动刷新页面载入新插件。</div><div class="kn-plugin-risk top">改动会写入 UFI-TOOLS custom head；修改前建议先导出备份。</div></div><div class="kn-plugin-head-right"><div class="kn-plugin-native-row"><span class="kn-native-group-label">原生</span><button type="button" class="kn-google-btn" data-action="openNativePluginFeature">插件管理</button><button type="button" class="kn-google-btn" data-action="openNativePluginStore">插件商店</button><button type="button" class="kn-google-btn" data-action="openNativePluginFiles">上传文件</button></div><div class="kn-plugin-actions" aria-label="插件全局操作"><button type="button" class="kn-plugin-tool-btn" data-plugin-action="refresh" title="重新读取插件列表"><span class="kn-tool-ico">↻</span><span class="kn-tool-text">读取</span></button><button type="button" class="kn-plugin-tool-btn" data-plugin-action="import" title="导入插件文件"><span class="kn-tool-ico">＋</span><span class="kn-tool-text">导入</span></button><button type="button" class="kn-plugin-tool-btn" data-plugin-action="export" title="导出当前插件备份"><span class="kn-tool-ico">⇩</span><span class="kn-tool-text">备份</span></button></div></div></div><input type="file" id="kn-plugin-import-file" accept=".txt,.js,.html,.htm" style="display:none"><div class="kn-plugin-layout"><aside class="kn-plugin-list-card"><div class="kn-plugin-list-head"><div class="kn-plugin-list-title-row"><div><strong>插件列表</strong><span id="kn-plugin-count">0 个插件</span></div><button type="button" id="kn-plugin-search-toggle" class="kn-plugin-search-toggle" title="搜索插件" aria-label="搜索插件">⌕</button></div><input id="kn-plugin-search" type="text" placeholder="搜索插件名称 / 源码"></div><div id="kn-plugin-list" class="kn-plugin-list"><div class="kn-plugin-empty">点击“重新读取”读取当前插件。</div></div></aside><section class="kn-plugin-editor-card"><div class="kn-plugin-editor-head"><div><strong>插件详情</strong><span id="kn-plugin-editor-state">未选择插件</span><div class="kn-plugin-editor-name-line"><span id="kn-plugin-editor-title-name" class="kn-plugin-editor-title-name">未选择插件</span><button type="button" class="kn-plugin-title-edit" data-plugin-action="beginRename" title="重命名插件" aria-label="重命名插件">' + knPluginActionIcon('edit') + '</button></div></div><div class="kn-plugin-editor-actions"><button type="button" class="kn-plugin-icon-action primary" data-plugin-action="applyEditor" title="保存插件" aria-label="保存插件">' + knPluginActionIcon('save') + '<span class="kn-action-text">保存插件</span></button><button type="button" class="kn-plugin-icon-action" data-plugin-action="copyCode" title="复制源码" aria-label="复制源码">' + knPluginActionIcon('copy') + '<span class="kn-action-text">复制源码</span></button><button type="button" class="kn-plugin-icon-action danger" data-plugin-action="deleteSelected" title="删除插件" aria-label="删除插件">' + knPluginActionIcon('trash') + '<span class="kn-action-text">删除插件</span></button></div></div><div class="kn-plugin-editor-form"><div class="kn-plugin-field kn-plugin-name-field"><label>插件名称</label><input id="kn-plugin-editor-name" type="text" placeholder="选择插件后可重命名"></div><div class="kn-plugin-code-head"><label>源码内容</label><span>轻量编辑模式</span></div><div class="kn-code-editor-wrap"><div id="kn-plugin-editor-lines" class="kn-code-lines">1</div><div class="kn-code-layer"><pre id="kn-plugin-editor-highlight" class="kn-code-highlight" aria-hidden="true"></pre><textarea id="kn-plugin-editor-code" spellcheck="false" placeholder="选择插件后显示源码"></textarea></div></div></div></section></div></div></div><div id="kn-settings-panel-about" class="kn-settings-panel"><div class="kn-about-hero"><div class="kn-about-logo">G</div><div><div class="kn-about-title">UFI WebOS 控制台</div><div class="kn-about-desc">面向 UFI-TOOLS / UFI / CPE 设备的桌面化增强控制台。核心原则：不移动第三方插件 div，不破坏原插件结构，只做安全的导航分组、原地显隐和界面增强。</div><div class="kn-about-tags"><span>Material UI</span><span>Safe Layout</span><span>UFI-TOOLS v4.x</span><span>2026 UI</span></div></div></div><div class="kn-about-grid"><div class="kn-about-card"><div class="kn-about-card-title">版本信息</div><div class="kn-about-kv"><b>当前版本</b><span id="kn-about-current-version">' + VERSION + '</span></div><div class="kn-about-kv"><b>GitHub 仓库</b><span>' + GITHUB_REPO + '</span></div><div class="kn-about-kv"><b>最新版本</b><span id="kn-about-latest-version">未检查</span></div><div class="kn-about-kv"><b>版本状态</b><span id="kn-about-version-state">点击下方按钮检查</span></div><div class="kn-about-actions"><button type="button" class="kn-google-btn primary" data-action="checkGithubVersion">检查 GitHub 版本</button><a class="kn-google-btn" href="' + GITHUB_REPO_URL + '" target="_blank" rel="noopener noreferrer">打开仓库</a><a class="kn-google-btn" href="' + GITHUB_ISSUES_URL + '" target="_blank" rel="noopener noreferrer">提交问题</a><button type="button" class="kn-google-btn" data-action="copy">导出配置</button></div><div id="kn-about-update-note" class="kn-about-update-note">将请求 GitHub Releases 最新版本；如果仓库没有 Release，会自动尝试 Tags。</div></div><div class="kn-about-card"><div class="kn-about-card-title">适配与策略</div><div class="kn-about-kv"><b>适配环境</b><span>UFI-TOOLS v4.x / 通用 UFI 设备</span></div><div class="kn-about-kv"><b>布局策略</b><span>安全原地显隐</span></div><div class="kn-about-kv"><b>插件原则</b><span>不迁移第三方 div</span></div><div class="kn-about-small">设置页采用 Google Material 风格重构：更明确的信息层级、更轻的卡片、更克制的蓝色强调和更好的小屏适配。</div></div><div class="kn-about-card"><div class="kn-about-card-title">当前能力</div><div class="kn-about-list">导航分页 · 原生功能分类 · 消息转发设置 · 现代插件管理 · 原生插件备用入口 · 插件面板分组 · 日/夜间模式 · 预设背景 · 自定义背景 · 玻璃拟态 · 圆角阴影 · 胶囊按钮 · 渐变标题 · 紧凑布局 · 扩展工具箱</div></div><div class="kn-about-card"><div class="kn-about-card-title">项目信息</div><div class="kn-about-list">项目名称：UFI WebOS 控制台<br>作者：LceAn<br>定位：面向 UFI-TOOLS 的高级桌面化管理界面<br>愿景：让插件管理、网络管理和设备状态展示更清晰、更现代、更安全。</div></div></div></div></div><div class="kn-dialog-footer"><div class="kn-footer-right only"><button type="button" class="kn-panel-btn primary" data-action="done">完成</button></div></div></div>';

    enhanceSettingsInteractionMarkup(dialog);

    if (isWebOSFeatureEnabled('nativeButtonMigration')) ensureFunctionCenterPanel(dialog);
    else restoreHomeFunctionListButtons();

    dialog.addEventListener('click', function (e) { if (e.target === dialog) closeSettingsDialog(); });
    dialog.querySelector('[data-action="close"]').onclick = closeSettingsDialog;
    dialog.querySelector('[data-action="done"]').onclick = closeSettingsDialog;
    var compactBtn = dialog.querySelector('[data-action="compact"]'); if (compactBtn) compactBtn.onclick = function () { state.config.compactHeader = !state.config.compactHeader; saveConfig(); updateNavButtons(); };
    var copyBtn = dialog.querySelector('[data-action="copy"]'); if (copyBtn) copyBtn.onclick = exportConfig;
    var resetBtn = dialog.querySelector('[data-action="reset"]'); if (resetBtn) resetBtn.onclick = resetLayout;
    var resetAppearanceBtn = dialog.querySelector('[data-action="resetAppearance"]'); if (resetAppearanceBtn) resetAppearanceBtn.onclick = resetAppearance;
    var appearanceAllOnBtn = dialog.querySelector('[data-action="appearanceAllOn"]');
    if (appearanceAllOnBtn) appearanceAllOnBtn.onclick = function () { ['enableRadius','enableShadow','enableCapsule','enableGlass','enableCompact','enableGradient','enableHover','enableScrollbar','enableReadableText','enableSoftDivider'].forEach(function (key) { state.config.appearance[key] = true; }); saveConfig(); bindAppearanceControls(); applyAppearance(); };
    var appearanceDefaultBtn = dialog.querySelector('[data-action="appearanceDefault"]');
    if (appearanceDefaultBtn) appearanceDefaultBtn.onclick = function () { Object.keys(DEFAULT_APPEARANCE).forEach(function (key) { if (key.indexOf('enable') === 0 || key === 'gradColor1' || key === 'gradColor2' || key === 'headerBlur' || key === 'headerOpacity' || key === 'accentColor' || key === 'fontScale' || key === 'animationLevel' || key === 'themeMode') state.config.appearance[key] = DEFAULT_APPEARANCE[key]; }); saveConfig(); bindAppearanceControls(); applyAppearance(); };
    var checkGithubBtn = dialog.querySelector('[data-action="checkGithubVersion"]');
    if (checkGithubBtn) checkGithubBtn.onclick = checkGithubVersion;
    var nativePluginBtn = dialog.querySelector('[data-action="openNativePluginFeature"]');
    if (nativePluginBtn) nativePluginBtn.onclick = openNativePluginFeature;
    var nativePluginAddBtn = dialog.querySelector('[data-action="openNativePluginAdd"]');
    if (nativePluginAddBtn) nativePluginAddBtn.onclick = function () { triggerNativePluginSubAction('add'); };
    var nativePluginStoreBtn = dialog.querySelector('[data-action="openNativePluginStore"]');
    if (nativePluginStoreBtn) nativePluginStoreBtn.onclick = function () { triggerNativePluginSubAction('store'); };
    var nativePluginExportBtn = dialog.querySelector('[data-action="openNativePluginExport"]');
    if (nativePluginExportBtn) nativePluginExportBtn.onclick = function () { triggerNativePluginSubAction('importExport'); };
    var nativePluginFilesBtn = dialog.querySelector('[data-action="openNativePluginFiles"]');
    if (nativePluginFilesBtn) nativePluginFilesBtn.onclick = function () { triggerNativePluginSubAction('files'); };

    var nativeSmsForwardBtn = dialog.querySelector('[data-action="openNativeSmsForward"]');
    if (nativeSmsForwardBtn) nativeSmsForwardBtn.onclick = openNativeSmsForward;
    var nativeSmsForwardRuleBtn = dialog.querySelector('[data-action="openNativeSmsForwardRule"]');
    if (nativeSmsForwardRuleBtn) nativeSmsForwardRuleBtn.onclick = openNativeSmsForward;
    var nativeForwardRefreshBtn = dialog.querySelector('[data-action="refreshNativeForwardConfig"]');
    if (nativeForwardRefreshBtn) nativeForwardRefreshBtn.onclick = readNativeMessageForwardConfig;
    var nativeForwardSaveBtn = dialog.querySelector('[data-action="saveNativeForwardConfig"]');
    if (nativeForwardSaveBtn) nativeForwardSaveBtn.onclick = function () { saveNativeMessageForwardConfig(); };
    var nativeForwardTestBtn = dialog.querySelector('[data-action="testNativeForwardConfig"]');
    if (nativeForwardTestBtn) nativeForwardTestBtn.onclick = triggerNativeForwardTest;
    Array.prototype.slice.call(dialog.querySelectorAll('[data-action="toggleForwardTemplates"]')).forEach(function (btn) {
      btn.onclick = function () { toggleForwardTemplateViewer(); };
    });
    var nativeMethodSelect = dialog.querySelector('#kn-native-forward-method-select');
    if (nativeMethodSelect) nativeMethodSelect.onchange = function () { setNativeForwardMethodUI(nativeMethodSelect.value); };
    var saveForwardBtn = dialog.querySelector('[data-action="saveForwardConfig"]');
    if (saveForwardBtn) saveForwardBtn.onclick = function () { saveForwardConfig(getForwardConfig()); if (typeof createToast === 'function') createToast('电话转发配置已保存', 'green'); };
    var testForwardBtn = dialog.querySelector('[data-action="testForwardConfig"]');
    if (testForwardBtn) testForwardBtn.onclick = triggerForwardConfigTest;
    bindForwardControls(dialog);
    knPluginBindManager(dialog);
    setTimeout(function () { if (!knPluginManager.loaded) knPluginRefresh(); }, 60);
    var clearBgUrlBtn = dialog.querySelector('[data-action="clearBackgroundUrl"]');
    if (clearBgUrlBtn) clearBgUrlBtn.onclick = function () { state.config.appearance.backgroundImage = ''; state.config.appearance.backgroundMode = 'custom'; saveConfig(); bindAppearanceControls(); applyAppearance(); };
    var resetBgBtn = dialog.querySelector('[data-action="resetBackgroundSettings"]');
    if (resetBgBtn) resetBgBtn.onclick = function () {
      state.config.appearance.enableBackground = false;
      state.config.appearance.backgroundMode = 'preset';
      state.config.appearance.backgroundPreset = DEFAULT_APPEARANCE.backgroundPreset;
      state.config.appearance.backgroundImage = '';
      state.config.appearance.backgroundDim = DEFAULT_APPEARANCE.backgroundDim;
      state.config.appearance.backgroundBlur = DEFAULT_APPEARANCE.backgroundBlur;
      state.config.appearance.backgroundSaturate = DEFAULT_APPEARANCE.backgroundSaturate;
      saveConfig();
      bindAppearanceControls();
      applyAppearance();
    };
    ensureWebOSSettingsPanel(dialog);
    Array.prototype.slice.call(dialog.querySelectorAll('.kn-settings-tab')).forEach(function (btn) {
      btn.onclick = function () { switchSettingsTab(btn.getAttribute('data-tab')); };
    });
    ensureAppearanceLanguageControl(dialog);
    document.body.appendChild(dialog);
  }



  function ensureWebOSSettingsPanel(dialog) {
    if (!dialog) return;
    ensureWebOSRuntimeCSS();
    var tabs = dialog.querySelector('.kn-settings-tabs');
    if (tabs && !tabs.querySelector('[data-tab="webos"]')) {
      var btn = document.createElement('button');
      btn.className = 'kn-settings-tab';
      btn.setAttribute('data-tab', 'webos');
      btn.type = 'button';
      btn.textContent = 'WebOS';
      tabs.appendChild(btn);
    }
    if (!dialog.querySelector('#kn-settings-panel-webos')) {
      var panel = document.createElement('div');
      panel.id = 'kn-settings-panel-webos';
      panel.className = 'kn-settings-panel';
      panel.innerHTML = '<div class="kn-webos-settings-grid"><div class="kn-webos-setting-card full"><div class="kn-webos-setting-title">WebOS 兼容与功能开关</div><div class="kn-webos-setting-desc">F50 完全适配时建议全部开启；非 F50 或低性能设备可一键关闭增强，减少大量状态读取、首页重度卡片和原生按钮迁移。</div><div class="kn-settings-actions" style="margin:0;padding:0;border:0"><button type="button" class="kn-panel-btn primary" data-webos-action="compatMode">一键关闭增强功能</button><button type="button" class="kn-panel-btn" data-webos-action="resetWebOS">恢复 F50 完整体验</button><button type="button" class="kn-panel-btn" data-webos-action="showWelcome">重新显示欢迎页</button></div></div><div class="kn-webos-setting-card full"><div class="kn-webos-setting-title">功能模块</div><div class="kn-webos-switch-list"><label class="kn-webos-switch"><span>原生按钮迁移到设置二级菜单</span><input type="checkbox" data-webos-feature="nativeButtonMigration"></label><label class="kn-webos-switch"><span>首页分析区重度卡片</span><input type="checkbox" data-webos-feature="homeHeavyCards"></label><label class="kn-webos-switch"><span>首页设备详情折叠区</span><input type="checkbox" data-webos-feature="homeDetails"></label><label class="kn-webos-switch"><span>设备出口 IP 查询</span><input type="checkbox" data-webos-feature="homeExitIp"></label><label class="kn-webos-switch"><span>电话与短信卡片</span><input type="checkbox" data-webos-feature="homePhoneSmsCard"></label><label class="kn-webos-switch"><span>运营商信息卡片</span><input type="checkbox" data-webos-feature="homeOperatorCard"></label><label class="kn-webos-switch"><span>设备维护操作卡片</span><input type="checkbox" data-webos-feature="homeMaintenance"></label><label class="kn-webos-switch"><span>首页自动刷新</span><input type="checkbox" data-webos-feature="homeAutoRefresh"></label><label class="kn-webos-switch"><span>扩展工具箱捕获第三方按钮</span><input type="checkbox" data-webos-feature="toolboxCapture"></label><label class="kn-webos-switch"><span>内置电话短信插件</span><input type="checkbox" data-webos-feature="phoneSmsBuiltin"></label></div></div><div class="kn-webos-setting-card full"><div class="kn-webos-setting-title">设备适配提示</div><div class="kn-webos-setting-desc" id="kn-webos-device-summary">正在识别设备...</div></div></div>';
      dialog.querySelector('.kn-dialog-body').appendChild(panel);
    }
    Array.prototype.slice.call(dialog.querySelectorAll('[data-webos-feature]')).forEach(function (el) {
      el.onchange = function () { setWebOSFeature(el.getAttribute('data-webos-feature'), !!el.checked); };
    });
    var compat = dialog.querySelector('[data-webos-action="compatMode"]');
    if (compat) compat.onclick = function () { setWebOSCompatibilityMode(!readWebOSConfig().compatibilityMode); };
    var reset = dialog.querySelector('[data-webos-action="resetWebOS"]');
    if (reset) reset.onclick = function () { setWebOSCompatibilityMode(false); };
    var show = dialog.querySelector('[data-webos-action="showWelcome"]');
    if (show) show.onclick = function () { try { localStorage.removeItem(WEBOS_WELCOME_KEY); } catch (e) {} showWebOSWelcomeIfNeeded(true); };
    var summary = dialog.querySelector('#kn-webos-device-summary');
    if (summary) {
      var info = detectWebOSDeviceInfo();
      summary.textContent = info.isF50 ? ('当前识别为 F50：' + info.model + '，建议保持完整增强体验。') : ('当前未明确识别为 F50：' + info.model + '。如出现字段错误或页面卡顿，可一键关闭增强功能。');
    }
    syncWebOSSettingsControls();
  }

  function mergeBackgroundSettingsIntoAppearance(dialog) {
    dialog = dialog || document.getElementById(DIALOG_ID);
    if (!dialog) return;
    var appearancePanel = dialog.querySelector('#kn-settings-panel-appearance');
    var backgroundPanel = dialog.querySelector('#kn-settings-panel-background');
    if (!appearancePanel || !backgroundPanel) return;

    var oldBgTab = dialog.querySelector('.kn-settings-tab[data-tab="background"]');
    if (oldBgTab) oldBgTab.remove();

    var appearanceGrid = appearancePanel.querySelector('.kn-appearance-grid') || appearancePanel.querySelector('.kn-form-grid') || appearancePanel;
    var merged = appearancePanel.querySelector('#kn-appearance-background-section');
    if (!merged) {
      merged = document.createElement('div');
      merged.id = 'kn-appearance-background-section';
      merged.className = 'kn-appearance-background-section kn-form-card full kn-appearance-card';
      merged.innerHTML = '<div class="kn-form-title-row kn-merged-bg-title"><div><div class="kn-form-title compact">首页背景</div><div class="kn-field-help local">背景图、预装背景、自定义 URL、遮罩、模糊和饱和度已并入界面美化。</div></div></div>';
      while (backgroundPanel.firstChild) merged.appendChild(backgroundPanel.firstChild);
      appearanceGrid.appendChild(merged);
    }
    backgroundPanel.remove();
  }


  var FUNCTION_CENTER_STYLE_ID = 'kano-webos-function-center-style';
  var NETWORK_DIAGNOSTICS_MODAL_ID = 'kn-network-diagnostics-modal';
  var functionCenterState = { active: 'network', search: '', adopted: [] };

  var FUNCTION_CENTER_GROUPS = [
    { key: 'network', label: '网络与连接', desc: 'APN、内网、SIM、USB 上网、网络模式和运营商相关入口。' },
    { key: 'traffic', label: '流量与测速', desc: '流量管理、流量历史、内外网测速、漫游和网络诊断。' },
    { key: 'message', label: '消息与通信', desc: '短信收发、电话短信和通信入口；消息转发已迁移到专页。' },
    { key: 'device', label: '设备与系统', desc: '刷新、重启、定时、软件更新、指示灯、直供、电源和设备维护。' },
    { key: 'debug', label: '调试与高级', desc: 'AT、ADB、USB 调试、Root、Magisk、SELinux、射频和高级调试。' }
  ];

  function knFunctionCenterGroupMeta(key) {
    for (var i = 0; i < FUNCTION_CENTER_GROUPS.length; i += 1) {
      if (FUNCTION_CENTER_GROUPS[i].key === key) return FUNCTION_CENTER_GROUPS[i];
    }
    return FUNCTION_CENTER_GROUPS[FUNCTION_CENTER_GROUPS.length - 1];
  }

  function knFunctionCenterInferSelectLabel(sel) {
    if (!sel) return '选择项';
    var id = String(sel.id || sel.name || sel.className || '').toLowerCase();
    var opts = Array.prototype.slice.call(sel.options || []).map(function (o) { return clean(o.textContent || o.value || ''); }).join(' / ');
    var selected = sel.options && sel.options[sel.selectedIndex] ? clean(sel.options[sel.selectedIndex].textContent || sel.value || '') : clean(sel.value || '');
    if (/sim/.test(id) || /SIM/i.test(opts + selected)) return selected || 'SIM 选择';
    if (/lang|language/.test(id) || /中文|english|语言/i.test(opts + selected)) return selected || '语言';
    if (/usb/.test(id) || /USB|上网/i.test(opts + selected)) return selected || 'USB 上网';
    if (/net|mode|network|5g|4g|3g/.test(id) || /5G|4G|3G|网络模式/i.test(opts + selected)) return selected || '网络模式';
    return selected || clean(sel.getAttribute('title') || sel.getAttribute('aria-label') || '') || '选择项';
  }

  function knFunctionCenterElementLabel(el) {
    if (!el) return '';
    if (el.tagName && el.tagName.toUpperCase() === 'SELECT') return knFunctionCenterInferSelectLabel(el);
    return clean(el.innerText || el.textContent || el.value || el.getAttribute('title') || el.getAttribute('aria-label') || '');
  }

  function knFunctionCenterClassify(label, element) {
    var text = clean([label || '', element && element.id || '', element && element.name || '', element && element.className || '', element && element.getAttribute && element.getAttribute('title') || '', element && element.tagName === 'SELECT' ? Array.prototype.slice.call(element.options || []).map(function (o) { return o.textContent || o.value || ''; }).join(' ') : ''].join(' '));
    if (/流量|测速|速度|历史|诊断|ping|Ping|IP查询|ip查询|IP 查询|Root状态|Root 状态|FOTA/.test(text)) return 'traffic';
    if (/短信收发|短信|SMS|电话|通话|来电|收发|消息/.test(text) && !/转发|Webhook|SMTP|CURL|钉钉/.test(text)) return 'message';
    if (/WiFi|WIFI|Wi-Fi|无线|WLAN|APN|内网|网络模式|网络漫游|漫游|接入设备|SIM|5G|4G|3G|USB上网|USB 上网|USB网络|USB 网络|数据开关|运营商|切换运营商/.test(text)) return 'network';
    if (/AT指令|AT 指令|ADB|USB调试|USB 调试|USB状态|USB 状态|高级|性能|射频|调节器|Magisk|Root|SELinux/.test(text)) return 'debug';
    if (/刷新|重启|定时|任务|软件更新|更新|恢复|设备|系统|开机|自启|管理字段|密码|口令|登录|登出|指示灯|直供|电源|LOGO|开机第一屏|分区|热点管理|应用开机自启|收纳/.test(text)) return 'device';
    // 界面美化、首页背景、插件管理、消息转发等已经有专门设置页，理论上会被 suppress。
    // 剩余无法识别的少量入口默认归入设备与系统，避免继续产生“其他功能”这种空泛分组。
    return 'device';
  }

  function knFunctionCenterIsLanguageControl(label, element) {
    var text = clean([label || '', element && element.id || '', element && element.name || '', element && element.className || '', element && element.getAttribute && element.getAttribute('title') || '', element && element.tagName === 'SELECT' ? Array.prototype.slice.call(element.options || []).map(function (o) { return o.textContent || o.value || ''; }).join(' ') : ''].join(' '));
    return /语言|中文|English|language|lang/i.test(text);
  }

  function knFunctionCenterShouldSuppress(label, element) {
    var text = clean([label || '', element && element.id || '', element && element.name || '', element && element.className || '', element && element.getAttribute && element.getAttribute('title') || '', element && element.tagName === 'SELECT' ? Array.prototype.slice.call(element.options || []).map(function (o) { return o.textContent || o.value || ''; }).join(' ') : ''].join(' '));
    if (!text) return false;

    // 已经被 header 或专门设置页重写的原生入口，不再出现在“原生功能分类”里，避免同一能力重复出现。
    // 原生按钮本体仍会保留在 DOM 中并被隐藏，专页需要时会继续调用原生逻辑。
    if (/登录|登出|更改口令|更改密码|口令|密码/.test(text)) return true;
    if (/WiFi设置|WIFI设置|Wi-Fi设置|无线设置|WLAN设置|接入设备/.test(text)) return true;
    if (/主题美化|主题背景|背景视频|背景视频设置|主题|背景|界面美化/.test(text)) return true;
    if (/插件功能|插件管理|插件商店|添加插件|导入插件|导出插件|上传文件管理|上传文件/.test(text)) return true;
    if (/短信转发|消息转发|转发规则|Webhook地址|Webhook|SMTP方式|SMTP|CURL方式|CURL|钉钉方式|钉钉机器人|电源通知/.test(text)) return true;
    if (knFunctionCenterIsLanguageControl(label, element)) return true;

    return false;
  }

  function knFunctionCenterFindNativeLanguageSelect() {
    var found = null;
    getNativeFunctionButtonBoxes().some(function (box) {
      if (!(box instanceof HTMLElement)) return false;
      Array.prototype.slice.call(box.querySelectorAll('select')).some(function (sel) {
        var label = knFunctionCenterInferSelectLabel(sel);
        if (knFunctionCenterIsLanguageControl(label, sel)) {
          found = sel;
          return true;
        }
        return false;
      });
      return !!found;
    });
    return found;
  }

  function ensureAppearanceLanguageControl(dialog) {
    dialog = dialog || document.getElementById(DIALOG_ID);
    if (!dialog) return;
    var panel = dialog.querySelector('#kn-settings-panel-appearance');
    if (!panel) return;
    var grid = panel.querySelector('.kn-appearance-grid') || panel.querySelector('.kn-form-grid') || panel;
    var nativeSelect = knFunctionCenterFindNativeLanguageSelect();
    if (!nativeSelect) {
      var old = panel.querySelector('#kn-appearance-language-card');
      if (old) old.remove();
      return;
    }

    var card = panel.querySelector('#kn-appearance-language-card');
    if (!card) {
      card = document.createElement('div');
      card.id = 'kn-appearance-language-card';
      card.className = 'kn-form-card full kn-appearance-card kn-native-language-card';
      card.innerHTML = '<div class="kn-form-title-row"><div><div class="kn-form-title compact">界面语言</div><div class="kn-field-help local">这里复用原系统语言选择项，变更会同步到原生语言控件。</div></div></div><div class="kn-input-row"><label>语言</label><select id="kn-appearance-native-language"></select></div>';
      var cards = grid.children ? Array.prototype.slice.call(grid.children) : [];
      if (cards.length > 0) grid.insertBefore(card, cards[1] || null);
      else grid.appendChild(card);
    }

    var sel = card.querySelector('#kn-appearance-native-language');
    if (!sel) return;
    var prev = sel.value;
    sel.innerHTML = '';
    Array.prototype.slice.call(nativeSelect.options || []).forEach(function (opt) {
      var o = document.createElement('option');
      o.value = opt.value;
      o.textContent = opt.textContent || opt.value;
      sel.appendChild(o);
    });
    sel.value = nativeSelect.value || prev;
    sel.onchange = function () {
      nativeSelect.value = sel.value;
      try { nativeSelect.dispatchEvent(new Event('input', { bubbles: true })); } catch (e) {}
      try { nativeSelect.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) {}
      if (typeof createToast === 'function') createToast('已同步界面语言', 'green');
    };
  }

  function knFunctionCenterGetSourceElements() {
    var nodes = [];
    var seen = [];
    function push(el) {
      if (!el || !(el instanceof HTMLElement)) return;
      var tag = el.tagName ? el.tagName.toUpperCase() : '';
      if (tag !== 'BUTTON' && tag !== 'SELECT') return;
      if (el.closest && (el.closest('#' + DIALOG_ID) || el.closest('#' + HEADER_ID) || el.closest('#' + TOOLBOX_WRAPPER_ID) || el.closest('#' + TOOLBOX_DRAWER_ID) || el.closest('#' + TOOLBOX_SETTINGS_ID)) && el.getAttribute('data-kn-fc-direct-native') !== '1') return;
      if (seen.indexOf(el) !== -1) return;
      var label = knFunctionCenterElementLabel(el);
      if (!label) return;
      seen.push(el);
      nodes.push(el);
    }
    getNativeFunctionButtonBoxes().forEach(function (box) {
      Array.prototype.slice.call(box.children || []).forEach(function (node) {
        if (!(node instanceof HTMLElement)) return;
        push(node);
        if (node.classList && (node.classList.contains('actions-buttons') || node.classList.contains('collapse_box'))) {
          Array.prototype.slice.call(node.children || []).forEach(push);
        }
      });
    });
    Array.prototype.slice.call(functionCenterState.adopted || []).forEach(push);
    return nodes;
  }

  function knFunctionCenterGetItems() {
    return knFunctionCenterGetSourceElements().map(function (el, index) {
      var label = knFunctionCenterElementLabel(el);
      if (knFunctionCenterShouldSuppress(label, el)) return null;
      var type = el.tagName.toUpperCase() === 'SELECT' ? 'select' : 'button';
      return {
        id: 'fc_' + index + '_' + label.replace(/\W+/g, '_'),
        index: index,
        label: label,
        type: type,
        group: knFunctionCenterClassify(label, el),
        el: el
      };
    }).filter(Boolean);
  }

  function knFunctionCenterGroupItems(items) {
    var grouped = {};
    FUNCTION_CENTER_GROUPS.forEach(function (g) { grouped[g.key] = []; });
    items.forEach(function (item) {
      if (!grouped[item.group]) grouped.device.push(item);
      else grouped[item.group].push(item);
    });
    return grouped;
  }

  function knFunctionCenterEnhancedCards(key) {
    var cards = {
      network: [
        { title: '网络入口统一管理', text: '保留原生 WiFi、APN、SIM、USB 上网按钮；需要弹原生二级菜单时会先关闭设置页，避免被遮挡。', tab: '' },
        { title: '已加工展示', text: 'Header 已增强运营商、信号强度、WiFi 状态和接入数量；这里保留原生入口作为完整设置。', tab: '' }
      ],
      traffic: [
        { title: '网络诊断', text: '集中查看连接、信号、吞吐、流量、地址与系统负载，并保留当前固件提供的原生检测工具。', action: 'diagnostics', actionLabel: '打开诊断面板' }
      ],
      message: [
        { title: '消息转发增强', text: '短信/电源通知转发和电话事件转发已经在“消息转发”页二次开发。', tab: 'forward' },
        { title: '短信与电话', text: '短信收发、电话短信等通信入口保留；短信转发入口已隐藏并迁移到“消息转发”页。', tab: '' }
      ],
      device: [
        { title: '设备维护', text: '重启、定时、软件更新、管理字段等高风险入口保留为原生按钮，点击前请确认当前操作。', tab: '' }
      ],
      debug: [
        { title: '高级调试', text: 'AT、ADB、USB 调试、直供、性能模式等入口属于高级操作，统一放在这里便于集中管理。', tab: '' }
      ],
      ui: [
        { title: '界面美化与语言', text: '主题、背景和中英文切换已经整合到“界面美化 / 首页背景”中，这里不再重复展示原生按钮。', tab: 'appearance' },
        { title: '现代插件管理', text: '插件管理、插件商店和上传文件入口已经整合到“插件功能”页，避免在分类里重复出现。', tab: 'plugins' }
      ],
      other: [
        { title: '未归类入口', text: '这里展示暂未识别分类的原生按钮。可继续根据实际设备固件补充关键词。', tab: '' }
      ]
    };
    return cards[key] || cards.other;
  }

  function ensureFunctionCenterStyles() {
    if (document.getElementById(FUNCTION_CENTER_STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = FUNCTION_CENTER_STYLE_ID;
    style.textContent = '' +
      '.kn-home-function-hidden{display:none!important}' +
      '#' + DIALOG_ID + ' .kn-fc-direct-panel{height:100%;min-height:0;overflow:hidden}' +
      '#' + DIALOG_ID + ' .kn-fc-direct-shell{height:100%;min-height:0;display:flex;flex-direction:column;gap:12px;overflow:hidden}' +
      '#' + DIALOG_ID + ' .kn-fc-head{flex:0 0 auto;display:grid;grid-template-columns:minmax(0,1fr) 220px auto;gap:10px;align-items:center;padding:14px 16px;border-radius:24px;border:1px solid rgba(232,234,237,.08);background:linear-gradient(135deg,rgba(138,180,248,.08),rgba(18,22,30,.72))}' +
      '#' + DIALOG_ID + ' .kn-fc-title{font-size:18px;font-weight:900;color:#f1f3f4}.kn-fc-desc{margin-top:4px;font-size:12px;color:#9aa0a6;line-height:1.45}' +
      '#' + DIALOG_ID + ' .kn-fc-search{height:38px;border-radius:999px;border:1px solid rgba(232,234,237,.12);background:#0f131a;color:#e8eaed;padding:0 14px;outline:none}' +
      '#' + DIALOG_ID + ' .kn-fc-body{min-height:0;overflow:auto;display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:12px}' +
      '#' + DIALOG_ID + ' .kn-fc-card{border-radius:22px;border:1px solid rgba(232,234,237,.08);background:rgba(16,19,25,.56);padding:14px;min-width:0}' +
      '#' + DIALOG_ID + ' .kn-fc-card-title{font-size:14px;font-weight:900;color:#f1f3f4;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between;gap:10px}' +
      '#' + DIALOG_ID + ' .kn-fc-native-grid{display:flex;flex-wrap:wrap;gap:8px;align-content:flex-start}' +
      '#' + DIALOG_ID + ' .kn-fc-native-btn{min-height:36px;padding:0 13px;border-radius:999px;border:1px solid rgba(232,234,237,.11);background:rgba(255,255,255,.06);color:#e8eaed;font-size:12px;font-weight:850;cursor:pointer;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '#' + DIALOG_ID + ' .kn-fc-native-btn:hover{border-color:rgba(138,180,248,.28);background:rgba(138,180,248,.10)}' +
      '#' + DIALOG_ID + ' .kn-fc-native-btn.needs-confirm{border-color:rgba(247,201,72,.30);background:rgba(247,201,72,.08);color:#fff4d0}' +
      '#' + DIALOG_ID + ' .kn-fc-native-btn.needs-confirm.is-called{background:rgba(247,201,72,.15);box-shadow:0 0 0 3px rgba(247,201,72,.08) inset}' +
      '#' + DIALOG_ID + ' .kn-fc-native-direct{display:inline-flex!important;align-items:center!important;justify-content:center!important;min-height:36px!important;height:36px!important;padding:0 13px!important;border-radius:999px!important;border:1px solid rgba(247,201,72,.30)!important;background:rgba(247,201,72,.08)!important;color:#fff4d0!important;font-size:12px!important;font-weight:850!important;cursor:pointer!important;max-width:100%!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;margin:0!important;box-shadow:none!important;line-height:1!important}' +
      '#' + DIALOG_ID + ' .kn-fc-native-direct:hover{background:rgba(247,201,72,.14)!important;border-color:rgba(247,201,72,.42)!important;transform:translateY(-1px)}' +
      '#' + DIALOG_ID + ' .kn-fc-native-direct:active{transform:translateY(0)}' +
      '.kn-native-dialog-lifted-direct{z-index:2147483647!important;position:fixed!important;left:50%!important;top:50%!important;right:auto!important;bottom:auto!important;transform:translate(-50%,-50%)!important;max-width:min(560px,calc(100vw - 36px))!important;max-height:calc(100vh - 80px)!important;overflow:auto!important;display:block!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important}' +
      '#' + DIALOG_ID + ' .kn-fc-select-wrap{display:inline-flex;align-items:center;gap:8px;min-height:36px;padding:0 10px;border-radius:999px;border:1px solid rgba(138,180,248,.16);background:rgba(138,180,248,.06)}' +
      '#' + DIALOG_ID + ' .kn-fc-select-wrap span{font-size:12px;font-weight:850;color:#d3e3fd}.kn-fc-select-wrap select{height:28px;min-width:92px;border-radius:999px;background:#111722;color:#e8eaed;border:1px solid rgba(232,234,237,.12);padding:0 8px}' +
      '#' + DIALOG_ID + ' .kn-fc-enhanced{display:flex;flex-direction:column;gap:10px}.kn-fc-enh-card{padding:12px;border-radius:18px;background:rgba(138,180,248,.055);border:1px solid rgba(138,180,248,.12)}' +
      '#' + DIALOG_ID + ' .kn-fc-enh-card b{display:block;color:#f1f3f4;font-size:13px;margin-bottom:6px}.kn-fc-enh-card p{margin:0;color:#bdc1c6;font-size:12px;line-height:1.55}.kn-fc-enh-card button{margin-top:10px}' +
      '#' + DIALOG_ID + ' .kn-fc-empty{padding:28px 10px;text-align:center;color:#9aa0a6;font-size:13px;border:1px dashed rgba(232,234,237,.12);border-radius:18px;width:100%}' +
      '#' + NETWORK_DIAGNOSTICS_MODAL_ID + '{position:fixed;inset:0;z-index:2147483640;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(4,7,12,.72);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);box-sizing:border-box}' +
      '#' + NETWORK_DIAGNOSTICS_MODAL_ID + ' *{box-sizing:border-box}' +
      '#' + NETWORK_DIAGNOSTICS_MODAL_ID + ' .kn-diag-panel{width:min(1040px,100%);max-height:min(820px,calc(100vh - 40px));display:flex;flex-direction:column;overflow:hidden;border:1px solid rgba(232,234,237,.12);border-radius:20px;background:#10141b;color:#f1f3f4;box-shadow:0 34px 100px rgba(0,0,0,.58)}' +
      '#' + NETWORK_DIAGNOSTICS_MODAL_ID + ' .kn-diag-head{flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px 20px;border-bottom:1px solid rgba(232,234,237,.09)}' +
      '#' + NETWORK_DIAGNOSTICS_MODAL_ID + ' .kn-diag-title{font-size:18px;font-weight:950;color:#f8f9fa}' +
      '#' + NETWORK_DIAGNOSTICS_MODAL_ID + ' .kn-diag-sub{margin-top:4px;font-size:12px;line-height:1.5;color:#9aa0a6}' +
      '#' + NETWORK_DIAGNOSTICS_MODAL_ID + ' .kn-diag-close{flex:0 0 38px;width:38px;height:38px;border:1px solid rgba(232,234,237,.12);border-radius:50%;background:rgba(255,255,255,.06);color:#e8eaed;font-size:22px;line-height:1;cursor:pointer}' +
      '#' + NETWORK_DIAGNOSTICS_MODAL_ID + ' .kn-diag-close:hover{background:rgba(255,255,255,.11)}' +
      '#' + NETWORK_DIAGNOSTICS_MODAL_ID + ' .kn-diag-body{min-height:0;overflow:auto;padding:2px 20px 18px}' +
      '#' + NETWORK_DIAGNOSTICS_MODAL_ID + ' .kn-diag-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:24px}' +
      '#' + NETWORK_DIAGNOSTICS_MODAL_ID + ' .kn-diag-section{min-width:0;padding:18px 0;border-bottom:1px solid rgba(232,234,237,.08)}' +
      '#' + NETWORK_DIAGNOSTICS_MODAL_ID + ' .kn-diag-section.full{grid-column:1/-1}' +
      '#' + NETWORK_DIAGNOSTICS_MODAL_ID + ' .kn-diag-section h3{margin:0 0 11px;font-size:13px;font-weight:950;color:#d3e3fd}' +
      '#' + NETWORK_DIAGNOSTICS_MODAL_ID + ' .kn-diag-rows{display:grid;gap:8px}' +
      '#' + NETWORK_DIAGNOSTICS_MODAL_ID + ' .kn-diag-row{display:grid;grid-template-columns:110px minmax(0,1fr);gap:12px;align-items:start;font-size:12px;line-height:1.5}' +
      '#' + NETWORK_DIAGNOSTICS_MODAL_ID + ' .kn-diag-label{color:#8f98a6}' +
      '#' + NETWORK_DIAGNOSTICS_MODAL_ID + ' .kn-diag-value{min-width:0;color:#e8eaed;font-weight:760;overflow-wrap:anywhere}' +
      '#' + NETWORK_DIAGNOSTICS_MODAL_ID + ' .kn-diag-value.good{color:#8bd7a5}#' + NETWORK_DIAGNOSTICS_MODAL_ID + ' .kn-diag-value.warn{color:#f7c948}#' + NETWORK_DIAGNOSTICS_MODAL_ID + ' .kn-diag-value.bad{color:#ff8b8b}#' + NETWORK_DIAGNOSTICS_MODAL_ID + ' .kn-diag-value.empty{color:#737b88;font-weight:650}' +
      '#' + NETWORK_DIAGNOSTICS_MODAL_ID + ' .kn-diag-cores{display:flex;gap:8px;overflow-x:auto;padding:1px 0 5px;scrollbar-width:thin}' +
      '#' + NETWORK_DIAGNOSTICS_MODAL_ID + ' .kn-diag-core{flex:0 0 190px;padding:10px;border:1px solid rgba(232,234,237,.09);border-radius:8px;background:rgba(255,255,255,.035)}' +
      '#' + NETWORK_DIAGNOSTICS_MODAL_ID + ' .kn-diag-core b{display:block;margin-bottom:5px;font-size:11px;color:#9ec5ff}.kn-diag-core span{display:block;font-size:11px;line-height:1.5;color:#bdc1c6}' +
      '#' + NETWORK_DIAGNOSTICS_MODAL_ID + ' .kn-diag-tools{display:flex;flex-wrap:wrap;gap:8px}' +
      '#' + NETWORK_DIAGNOSTICS_MODAL_ID + ' .kn-diag-tool,#' + NETWORK_DIAGNOSTICS_MODAL_ID + ' .kn-diag-action{min-height:36px;padding:0 13px;border:1px solid rgba(232,234,237,.12);border-radius:999px;background:rgba(255,255,255,.06);color:#e8eaed;font-size:12px;font-weight:850;cursor:pointer}' +
      '#' + NETWORK_DIAGNOSTICS_MODAL_ID + ' .kn-diag-tool:hover,#' + NETWORK_DIAGNOSTICS_MODAL_ID + ' .kn-diag-action:hover{border-color:rgba(138,180,248,.32);background:rgba(138,180,248,.12)}' +
      '#' + NETWORK_DIAGNOSTICS_MODAL_ID + ' .kn-diag-action.primary{border-color:rgba(138,180,248,.32);background:#2f6fc9;color:#fff}' +
      '#' + NETWORK_DIAGNOSTICS_MODAL_ID + ' .kn-diag-action:disabled{cursor:wait;opacity:.58}' +
      '#' + NETWORK_DIAGNOSTICS_MODAL_ID + ' .kn-diag-empty{font-size:12px;color:#737b88}' +
      '#' + NETWORK_DIAGNOSTICS_MODAL_ID + ' .kn-diag-foot{flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;gap:14px;padding:14px 20px;border-top:1px solid rgba(232,234,237,.09);background:rgba(7,10,15,.48)}' +
      '#' + NETWORK_DIAGNOSTICS_MODAL_ID + ' .kn-diag-updated{min-width:0;font-size:11px;color:#8f98a6;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '#' + NETWORK_DIAGNOSTICS_MODAL_ID + ' .kn-diag-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex-wrap:wrap}' +
      '.kn-theme-light #' + NETWORK_DIAGNOSTICS_MODAL_ID + '{background:rgba(27,31,38,.32)}' +
      '.kn-theme-light #' + NETWORK_DIAGNOSTICS_MODAL_ID + ' .kn-diag-panel{border-color:rgba(32,36,43,.14);background:#f8fafc;color:#202124;box-shadow:0 30px 90px rgba(35,45,60,.26)}' +
      '.kn-theme-light #' + NETWORK_DIAGNOSTICS_MODAL_ID + ' .kn-diag-head,.kn-theme-light #' + NETWORK_DIAGNOSTICS_MODAL_ID + ' .kn-diag-section,.kn-theme-light #' + NETWORK_DIAGNOSTICS_MODAL_ID + ' .kn-diag-foot{border-color:rgba(32,36,43,.10)}' +
      '.kn-theme-light #' + NETWORK_DIAGNOSTICS_MODAL_ID + ' .kn-diag-title,.kn-theme-light #' + NETWORK_DIAGNOSTICS_MODAL_ID + ' .kn-diag-value{color:#202124}' +
      '.kn-theme-light #' + NETWORK_DIAGNOSTICS_MODAL_ID + ' .kn-diag-label,.kn-theme-light #' + NETWORK_DIAGNOSTICS_MODAL_ID + ' .kn-diag-sub,.kn-theme-light #' + NETWORK_DIAGNOSTICS_MODAL_ID + ' .kn-diag-updated{color:#667085}' +
      '.kn-theme-light #' + NETWORK_DIAGNOSTICS_MODAL_ID + ' .kn-diag-section h3{color:#245caa}' +
      '.kn-theme-light #' + NETWORK_DIAGNOSTICS_MODAL_ID + ' .kn-diag-value.good{color:#19713c}.kn-theme-light #' + NETWORK_DIAGNOSTICS_MODAL_ID + ' .kn-diag-value.warn{color:#956400}.kn-theme-light #' + NETWORK_DIAGNOSTICS_MODAL_ID + ' .kn-diag-value.bad{color:#b42318}.kn-theme-light #' + NETWORK_DIAGNOSTICS_MODAL_ID + ' .kn-diag-value.empty{color:#7b8492}' +
      '.kn-theme-light #' + NETWORK_DIAGNOSTICS_MODAL_ID + ' .kn-diag-core,.kn-theme-light #' + NETWORK_DIAGNOSTICS_MODAL_ID + ' .kn-diag-tool,.kn-theme-light #' + NETWORK_DIAGNOSTICS_MODAL_ID + ' .kn-diag-action,.kn-theme-light #' + NETWORK_DIAGNOSTICS_MODAL_ID + ' .kn-diag-close{border-color:rgba(32,36,43,.14);background:rgba(32,36,43,.045);color:#202124}' +
      '@media(max-width:980px){#' + DIALOG_ID + ' .kn-fc-direct-panel{overflow:visible}#' + DIALOG_ID + ' .kn-fc-direct-shell{height:auto;overflow:visible}#' + DIALOG_ID + ' .kn-fc-head{grid-template-columns:1fr}#' + DIALOG_ID + ' .kn-fc-body{grid-template-columns:1fr;overflow:visible}}' +
      '@media(max-width:720px){#' + NETWORK_DIAGNOSTICS_MODAL_ID + '{align-items:flex-start;padding:10px}#' + NETWORK_DIAGNOSTICS_MODAL_ID + ' .kn-diag-panel{max-height:calc(100vh - 20px);border-radius:14px}#' + NETWORK_DIAGNOSTICS_MODAL_ID + ' .kn-diag-head{padding:15px 14px}#' + NETWORK_DIAGNOSTICS_MODAL_ID + ' .kn-diag-body{padding:0 14px 14px}#' + NETWORK_DIAGNOSTICS_MODAL_ID + ' .kn-diag-grid{grid-template-columns:1fr}#' + NETWORK_DIAGNOSTICS_MODAL_ID + ' .kn-diag-section.full{grid-column:auto}#' + NETWORK_DIAGNOSTICS_MODAL_ID + ' .kn-diag-row{grid-template-columns:96px minmax(0,1fr)}#' + NETWORK_DIAGNOSTICS_MODAL_ID + ' .kn-diag-foot{align-items:stretch;flex-direction:column;padding:12px 14px}#' + NETWORK_DIAGNOSTICS_MODAL_ID + ' .kn-diag-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}#' + NETWORK_DIAGNOSTICS_MODAL_ID + ' .kn-diag-action{width:100%}}';
    document.head.appendChild(style);
  }

  function knDiagnosticsRead(id, fallback) {
    var el = document.getElementById(id);
    var value = el ? clean(el.textContent || el.innerText || '') : '';
    if (!value || value === '--') return fallback || '暂无数据';
    return value;
  }

  function knDiagnosticsRadioMetric(valueId, stateId) {
    var value = knDiagnosticsRead(valueId, '--');
    var level = knDiagnosticsRead(stateId, '');
    return [value, level && level !== '暂无数据' ? level : ''].filter(Boolean).join(' · ') || '暂无数据';
  }

  function knDiagnosticsTone(value) {
    var text = clean(value || '');
    if (!text || text === '--' || text === '暂无数据' || /等待|未读取|未检测/.test(text)) return 'empty';
    if (/断开|失败|异常|偏弱|很差|较差|无服务|未连接/.test(text)) return 'bad';
    if (/一般|较弱|警告|观察/.test(text)) return 'warn';
    if (/良好|优秀|正常|已连接|connected|online|无需处理/i.test(text)) return 'good';
    return '';
  }

  function knDiagnosticsCpuCores() {
    return Array.prototype.slice.call(document.querySelectorAll('#kn-home-cpu-cores .kn-home-core-chip')).map(function (chip) {
      var nameEl = chip.querySelector('b');
      var name = clean(nameEl ? nameEl.textContent : 'CPU');
      var metrics = Array.prototype.slice.call(chip.querySelectorAll('.kn-home-core-metric')).map(function (metric) {
        var labelEl = metric.querySelector('.kn-home-core-metric-label');
        var valueEl = metric.querySelector('.kn-home-core-metric-value');
        return clean((labelEl ? labelEl.textContent : '') + ' ' + (valueEl ? valueEl.textContent : '--'));
      }).filter(Boolean);
      return { name: name || 'CPU', detail: metrics.join(' · ') || '暂无数据' };
    }).filter(function (core) { return core.name || core.detail; });
  }

  function knDiagnosticsSnapshot() {
    return {
      updated: knDiagnosticsRead('kn-home-refresh-time', '尚未刷新'),
      sections: [
        {
          title: '连接与网络',
          items: [
            ['运营商 / 制式', knDiagnosticsRead('kn-home-network')],
            ['连接状态', knDiagnosticsRead('kn-home-net-context', knDiagnosticsRead('kn-home-modem'))],
            ['SIM 状态', knDiagnosticsRead('kn-home-sim')],
            ['信号格', knDiagnosticsRead('kn-home-signal')]
          ]
        },
        {
          title: '无线信号',
          items: [
            ['综合质量', knDiagnosticsRead('kn-home-signal-overall')],
            ['RSRP', knDiagnosticsRadioMetric('kn-home-val-rsrp', 'kn-home-state-rsrp')],
            ['RSRQ', knDiagnosticsRadioMetric('kn-home-val-rsrq', 'kn-home-state-rsrq')],
            ['SINR', knDiagnosticsRadioMetric('kn-home-val-sinr', 'kn-home-state-sinr')],
            ['射频上下文', knDiagnosticsRead('kn-home-signal-radio')],
            ['当前建议', knDiagnosticsRead('kn-home-signal-advice')]
          ]
        },
        {
          title: '实时与累计流量',
          items: [
            ['下载 RX', knDiagnosticsRead('kn-home-kpi-rx')],
            ['上传 TX', knDiagnosticsRead('kn-home-kpi-tx')],
            ['当日流量', knDiagnosticsRead('kn-home-kpi-daily')],
            ['本月已用', knDiagnosticsRead('kn-home-kpi-month')],
            ['累计流量', knDiagnosticsRead('kn-home-kpi-total')],
            ['QoS / QCI', knDiagnosticsRead('kn-home-kpi-qci')]
          ]
        },
        {
          title: '网络地址',
          items: [
            ['管理 IPv4', knDiagnosticsRead('kn-home-ip')],
            ['本地网关', knDiagnosticsRead('kn-home-info-lan')],
            ['出口 IPv4', knDiagnosticsRead('kn-home-exit-ip-v4')],
            ['出口 IPv6', knDiagnosticsRead('kn-home-exit-ip-v6')]
          ]
        },
        {
          title: '系统资源',
          items: [
            ['内存使用', knDiagnosticsRead('kn-home-val-mem')],
            ['SWAP', knDiagnosticsRead('kn-home-val-swap')],
            ['内部存储', knDiagnosticsRead('kn-home-val-storage')],
            ['SD 卡', knDiagnosticsRead('kn-home-val-sd')]
          ]
        },
        {
          title: 'CPU 状态',
          items: [
            ['平均占用', knDiagnosticsRead('kn-home-cpu-avg')],
            ['活跃核心', knDiagnosticsRead('kn-home-cpu-active')],
            ['最高温度', knDiagnosticsRead('kn-home-cpu-max-temp')],
            ['最高频率', knDiagnosticsRead('kn-home-cpu-max-freq')]
          ]
        }
      ],
      cores: knDiagnosticsCpuCores()
    };
  }

  function knDiagnosticsNativeTools() {
    var seen = {};
    return knFunctionCenterGetItems().filter(function (item) {
      if (!item || item.type !== 'button' || item.group !== 'traffic' || !item.el) return false;
      if (!/测速|速度测试|内网速度|外网速度|流量历史|流量统计|流量管理|流量查询|网络诊断|Ping|IP\s*查询|speed\s*test/i.test(item.label)) return false;
      if (seen[item.label]) return false;
      seen[item.label] = true;
      return true;
    }).slice(0, 8);
  }

  function knDiagnosticsSectionHtml(section) {
    return '<section class="kn-diag-section"><h3>' + knEsc(section.title) + '</h3><div class="kn-diag-rows">' + section.items.map(function (item) {
      var tone = knDiagnosticsTone(item[1]);
      return '<div class="kn-diag-row"><span class="kn-diag-label">' + knEsc(item[0]) + '</span><span class="kn-diag-value' + (tone ? ' ' + tone : '') + '">' + knEsc(item[1]) + '</span></div>';
    }).join('') + '</div></section>';
  }

  function knDiagnosticsRender() {
    var modal = document.getElementById(NETWORK_DIAGNOSTICS_MODAL_ID);
    if (!modal) return;
    var snapshot = knDiagnosticsSnapshot();
    var body = modal.querySelector('[data-diag-body]');
    var updated = modal.querySelector('[data-diag-updated]');
    var cores = snapshot.cores.length ? snapshot.cores.map(function (core) {
      return '<div class="kn-diag-core"><b>' + knEsc(core.name) + '</b><span>' + knEsc(core.detail) + '</span></div>';
    }).join('') : '<span class="kn-diag-empty">暂无 CPU 核心数据</span>';
    var tools = knDiagnosticsNativeTools();
    modal.__knDiagnosticsTools = tools;
    var toolHtml = tools.length ? tools.map(function (tool, index) {
      return '<button type="button" class="kn-diag-tool" data-diag-native="' + index + '">' + knEsc(tool.label) + '</button>';
    }).join('') : '<span class="kn-diag-empty">当前固件未检测到原生测速或流量工具</span>';
    if (body) {
      body.innerHTML = '<div class="kn-diag-grid">' + snapshot.sections.map(knDiagnosticsSectionHtml).join('') +
        '<section class="kn-diag-section full"><h3>CPU 核心明细</h3><div class="kn-diag-cores">' + cores + '</div></section>' +
        '<section class="kn-diag-section full"><h3>原生网络工具</h3><div class="kn-diag-tools">' + toolHtml + '</div></section></div>';
      Array.prototype.slice.call(body.querySelectorAll('[data-diag-native]')).forEach(function (btn) {
        btn.onclick = function () {
          var index = Number(btn.getAttribute('data-diag-native'));
          var item = modal.__knDiagnosticsTools && modal.__knDiagnosticsTools[index];
          if (!item || !item.el) return;
          closeNetworkDiagnostics();
          closeSettingsDialog();
          window.setTimeout(function () {
            try { item.el.click(); }
            catch (e) { homeToast('原生工具调用失败：' + item.label, 'red'); }
          }, 120);
        };
      });
    }
    if (updated) updated.textContent = snapshot.updated;
  }

  function knDiagnosticsMaskAddress(value) {
    var text = clean(value || '');
    text = text.replace(/\b(\d{1,3}\.\d{1,3}\.\d{1,3})\.\d{1,3}\b/g, '$1.x');
    text = text.replace(/\b(?:[0-9a-f]{0,4}:){2,}[0-9a-f:]{0,}\b/ig, function (ip) {
      var parts = ip.split(':').filter(Boolean);
      return parts.slice(0, 2).join(':') + '::xxxx';
    });
    return text;
  }

  function knDiagnosticsReport() {
    var snapshot = knDiagnosticsSnapshot();
    var lines = ['F50 WebOS 网络诊断', '生成时间：' + new Date().toLocaleString(), '数据状态：' + snapshot.updated];
    snapshot.sections.forEach(function (section) {
      lines.push('', '[' + section.title + ']');
      section.items.forEach(function (item) {
        var value = /IP|地址|网关/.test(item[0]) ? knDiagnosticsMaskAddress(item[1]) : item[1];
        lines.push(item[0] + '：' + value);
      });
    });
    lines.push('', '[CPU 核心明细]');
    if (snapshot.cores.length) snapshot.cores.forEach(function (core) { lines.push(core.name + '：' + core.detail); });
    else lines.push('暂无 CPU 核心数据');
    lines.push('', '隐私处理：未包含手机号、IMEI、IMSI、ICCID，IP 地址尾段已隐藏。');
    return lines.join('\n');
  }

  function knDiagnosticsCopyReport() {
    var report = knDiagnosticsReport();
    function done() { homeToast('脱敏诊断报告已复制', 'green'); }
    function fallback() { window.prompt('复制脱敏诊断报告', report); }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(report).then(done).catch(fallback);
        return;
      }
    } catch (e) {}
    fallback();
  }

  function knDiagnosticsRefresh() {
    var modal = document.getElementById(NETWORK_DIAGNOSTICS_MODAL_ID);
    if (!modal) return;
    var btn = modal.querySelector('[data-diag-refresh]');
    if (btn) { btn.disabled = true; btn.textContent = '刷新中...'; }
    refreshHomeDashboardStatus(true);
    var started = Date.now();
    function finish() {
      if (state.homeBusy && Date.now() - started < 6000) {
        window.setTimeout(finish, 180);
        return;
      }
      knDiagnosticsRender();
      var current = document.querySelector('#' + NETWORK_DIAGNOSTICS_MODAL_ID + ' [data-diag-refresh]');
      if (current) { current.disabled = false; current.innerHTML = '<span aria-hidden="true">↻</span> 刷新状态'; }
      window.setTimeout(knDiagnosticsRender, 900);
    }
    window.setTimeout(finish, 220);
  }

  function closeNetworkDiagnostics() {
    var modal = document.getElementById(NETWORK_DIAGNOSTICS_MODAL_ID);
    if (modal) modal.remove();
  }

  function openNetworkDiagnostics() {
    ensureFunctionCenterStyles();
    var modal = document.getElementById(NETWORK_DIAGNOSTICS_MODAL_ID);
    if (!modal) {
      modal = document.createElement('div');
      modal.id = NETWORK_DIAGNOSTICS_MODAL_ID;
      modal.tabIndex = -1;
      modal.innerHTML = '<div class="kn-diag-panel" role="dialog" aria-modal="true" aria-labelledby="kn-diag-title"><header class="kn-diag-head"><div><div class="kn-diag-title" id="kn-diag-title">网络诊断</div><div class="kn-diag-sub">连接、信号、流量、地址与系统资源</div></div><button type="button" class="kn-diag-close" data-diag-close aria-label="关闭" title="关闭">×</button></header><div class="kn-diag-body" data-diag-body></div><footer class="kn-diag-foot"><span class="kn-diag-updated" data-diag-updated>尚未刷新</span><div class="kn-diag-actions"><button type="button" class="kn-diag-action" data-diag-copy><span aria-hidden="true">⧉</span> 复制报告</button><button type="button" class="kn-diag-action primary" data-diag-refresh><span aria-hidden="true">↻</span> 刷新状态</button></div></footer></div>';
      modal.addEventListener('click', function (e) { if (e.target === modal) closeNetworkDiagnostics(); });
      modal.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeNetworkDiagnostics(); });
      document.body.appendChild(modal);
      modal.querySelector('[data-diag-close]').onclick = closeNetworkDiagnostics;
      modal.querySelector('[data-diag-copy]').onclick = knDiagnosticsCopyReport;
      modal.querySelector('[data-diag-refresh]').onclick = knDiagnosticsRefresh;
    }
    knDiagnosticsRender();
    var closeBtn = modal.querySelector('[data-diag-close]');
    if (closeBtn) closeBtn.focus();
  }

  function hideHomeFunctionListButtons() {
    if (!isWebOSFeatureEnabled('nativeButtonMigration')) { restoreHomeFunctionListButtons(); return; }
    ensureFunctionCenterStyles();
    var boxes = getNativeFunctionButtonBoxes();
    function hideControl(el) {
      if (!(el instanceof HTMLElement)) return;
      var tag = el.tagName ? el.tagName.toUpperCase() : '';
      if (tag !== 'BUTTON' && tag !== 'SELECT') return;
      if (el.closest && (el.closest('#' + DIALOG_ID) || el.closest('#' + HEADER_ID) || el.closest('#' + TOOLBOX_WRAPPER_ID) || el.closest('#' + TOOLBOX_DRAWER_ID) || el.closest('#' + TOOLBOX_SETTINGS_ID))) return;
      el.classList.add('kn-home-function-hidden');
      el.setAttribute('data-kn-home-function-hidden', '1');
    }
    // 兜底：少数固件会把“短信转发”等已被设置页接管的按钮放在 collapse_box 之外。
    // 这里只隐藏已明确接管的入口，不隐藏承载容器，避免破坏原生二级面板。
    Array.prototype.slice.call(document.querySelectorAll('button,select')).forEach(function (el) {
      if (!(el instanceof HTMLElement)) return;
      if (el.closest && (el.closest('#' + DIALOG_ID) || el.closest('#' + HEADER_ID) || el.closest('#' + TOOLBOX_WRAPPER_ID) || el.closest('#' + TOOLBOX_DRAWER_ID) || el.closest('#' + TOOLBOX_SETTINGS_ID))) return;
      var label = knFunctionCenterElementLabel(el);
      if (knFunctionCenterShouldSuppress(label, el)) hideControl(el);
    });

    boxes.forEach(function (box) {
      if (!(box instanceof HTMLElement)) return;

      // 重要：不能隐藏功能列表承载容器本身。
      // 原生按钮点击后展开的二级 div / 插件面板经常挂在同一个 collapse_box 内；
      // 如果把容器 display:none，原生 click 逻辑虽然执行了，面板仍然不可见，甚至会触发原页面异步报错。
      box.classList.remove('kn-home-function-hidden');
      try { box.removeAttribute('data-kn-home-function-hidden'); } catch (e) {}

      Array.prototype.slice.call(box.children || []).forEach(function (node) {
        if (!(node instanceof HTMLElement)) return;
        hideControl(node);
        if (node.classList && (node.classList.contains('actions-buttons') || node.classList.contains('collapse_box'))) {
          Array.prototype.slice.call(node.children || []).forEach(hideControl);
        }
      });
      if (!box.__kn_func_hide_observer__) {
        box.__kn_func_hide_observer__ = new MutationObserver(function () { hideHomeFunctionListButtons(); });
        try { box.__kn_func_hide_observer__.observe(box, { childList: true, subtree: false }); } catch (e) {}
      }
    });
  }

  function ensureFunctionCenterPanel(dialog) {
    if (!dialog) return;
    ensureFunctionCenterStyles();
    hideHomeFunctionListButtons();
    ensureAppearanceLanguageControl(dialog);

    var tabs = dialog.querySelector('.kn-settings-tabs');
    if (tabs) {
      ['functions', 'background', 'fc-ui', 'fc-other'].forEach(function (staleTab) {
        var old = tabs.querySelector('[data-tab="' + staleTab + '"]');
        if (old) old.remove();
      });
      var oldTab = tabs.querySelector('[data-tab="functions"]');
      if (oldTab) oldTab.remove();
      var layoutTab = tabs.querySelector('[data-tab="layout"]');
      var insertBefore = layoutTab ? layoutTab.nextSibling : tabs.firstChild;
      FUNCTION_CENTER_GROUPS.forEach(function (g) {
        if (tabs.querySelector('[data-tab="fc-' + g.key + '"]')) return;
        var btn = document.createElement('button');
        btn.className = 'kn-settings-tab';
        btn.type = 'button';
        btn.setAttribute('data-tab', 'fc-' + g.key);
        btn.textContent = g.label;
        tabs.insertBefore(btn, insertBefore);
      });
      Array.prototype.slice.call(tabs.querySelectorAll('.kn-settings-tab')).forEach(function (btn) {
        if (btn.__kn_fc_tab_bound__) return;
        btn.__kn_fc_tab_bound__ = true;
        btn.onclick = function () { switchSettingsTab(btn.getAttribute('data-tab')); };
      });
    }

    ['functions', 'fc-ui', 'fc-other'].forEach(function (stalePanel) {
      var oldPanel = dialog.querySelector('#kn-settings-panel-' + stalePanel);
      if (oldPanel) oldPanel.remove();
    });
    var layoutPanel = dialog.querySelector('#kn-settings-panel-layout');
    var parent = layoutPanel && layoutPanel.parentNode ? layoutPanel.parentNode : dialog.querySelector('.kn-dialog-body');
    var ref = layoutPanel ? layoutPanel.nextSibling : (parent ? parent.firstChild : null);
    FUNCTION_CENTER_GROUPS.forEach(function (g) {
      var id = 'kn-settings-panel-fc-' + g.key;
      if (dialog.querySelector('#' + id)) return;
      var panel = document.createElement('div');
      panel.id = id;
      panel.className = 'kn-settings-panel kn-fc-direct-panel';
      panel.setAttribute('data-fc-panel', g.key);
      panel.innerHTML = '<div class="kn-fc-direct-shell"><div class="kn-fc-head"><div><div class="kn-fc-title">' + knEsc(g.label) + '</div><div class="kn-fc-desc">' + knEsc(g.desc) + ' 原生首页按钮已隐藏，统一从这里进入。</div></div><input class="kn-fc-search" type="text" placeholder="搜索本分类原生按钮"><button type="button" class="kn-google-btn" data-action="refreshFunctionCenter" data-fc-refresh="' + g.key + '">重新汇总</button></div><div class="kn-fc-body"><section class="kn-fc-card"><div class="kn-fc-card-title"><span>原生按钮</span><span class="kn-fc-native-count">0</span></div><div class="kn-fc-native-grid"></div></section><aside class="kn-fc-card"><div class="kn-fc-card-title"><span>加工菜单</span></div><div class="kn-fc-enhanced"></div></aside></div></div>';
      if (parent) parent.insertBefore(panel, ref);
      var search = panel.querySelector('.kn-fc-search');
      if (search) search.oninput = function () { functionCenterState.search = search.value || ''; renderFunctionCenterGroupPanel(g.key); };
      var refresh = panel.querySelector('[data-fc-refresh]');
      if (refresh) refresh.onclick = function () { hideHomeFunctionListButtons(); renderFunctionCenterGroupPanel(g.key); };
    });

    FUNCTION_CENTER_GROUPS.forEach(function (g) { renderFunctionCenterGroupPanel(g.key); });
  }

  function renderFunctionCenter() {
    if (functionCenterState.active && document.getElementById('kn-settings-panel-fc-' + functionCenterState.active)) {
      renderFunctionCenterGroupPanel(functionCenterState.active);
      return;
    }
    FUNCTION_CENTER_GROUPS.forEach(function (g) { renderFunctionCenterGroupPanel(g.key); });
  }


  function knFunctionCenterShouldKeepSettingsOpen(label, groupKey) {
    var text = clean(label || '');
    if (groupKey !== 'device' && !/重启|重啟|恢复出厂|恢復出廠|恢复|关机|關機|断电|斷電|电源|電源/i.test(text)) return false;
    return /重启|重啟|重启设备|重啟設備|重启网络|重啟網絡|恢复出厂|恢復出廠|恢复默认|关机|關機|断电|斷電|电源/i.test(text);
  }

  function knFunctionCenterEnsureNativeDialogCSS() {
    if (document.getElementById('kn-function-center-native-dialog-style')) return;
    var style = document.createElement('style');
    style.id = 'kn-function-center-native-dialog-style';
    style.textContent = '' +
      '#kn-native-risk-overlay{position:sticky;top:0;z-index:2147483647;border-radius:18px;border:1px solid rgba(255,197,96,.35);background:linear-gradient(180deg,rgba(40,30,16,.96),rgba(18,16,12,.96));box-shadow:0 18px 46px rgba(0,0,0,.36);padding:12px;color:#fff;box-sizing:border-box;margin:0 0 12px}' +
      '#kn-native-risk-overlay .kn-risk-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px}' +
      '#kn-native-risk-overlay .kn-risk-title{font-size:13px;font-weight:950;color:#fff1c6}' +
      '#kn-native-risk-overlay .kn-risk-desc{font-size:12px;line-height:1.65;color:rgba(255,255,255,.72);margin-bottom:10px}' +
      '#kn-native-risk-overlay .kn-risk-actions{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}' +
      '#kn-native-risk-overlay .kn-risk-btn{height:32px;padding:0 12px;border-radius:999px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.08);color:rgba(255,255,255,.88);font-size:12px;font-weight:900;cursor:pointer}' +
      '#kn-native-risk-overlay .kn-risk-btn.primary{background:rgba(247,201,72,.20);border-color:rgba(247,201,72,.38);color:#fff4d0}' +
      '#kn-native-risk-overlay .kn-risk-btn:hover{background:rgba(255,255,255,.13)}' +
      '#kn-native-dialog-portal{position:fixed;inset:0;z-index:2147483646;display:flex;align-items:center;justify-content:center;padding:22px;background:rgba(0,0,0,.36);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);pointer-events:none;box-sizing:border-box}' +
      '#kn-native-dialog-portal:empty{display:none}' +
      '#kn-native-dialog-portal>.kn-native-dialog-ported{pointer-events:auto;max-width:min(560px,calc(100vw - 36px))!important;max-height:calc(100vh - 110px)!important;overflow:auto!important;z-index:2147483647!important;position:relative!important;left:auto!important;right:auto!important;top:auto!important;bottom:auto!important;transform:none!important;margin:0!important}' +
      '#kn-native-dialog-portal .modal,#kn-native-dialog-portal .modal-wrapper,#kn-native-dialog-portal .modal-mask,#kn-native-dialog-portal .van-dialog,#kn-native-dialog-portal .el-message-box__wrapper,#kn-native-dialog-portal .layui-layer,#kn-native-dialog-portal .swal2-container{z-index:2147483647!important}' +
      '.kn-native-dialog-lifted,.swal2-container,.van-overlay,.van-popup,.van-dialog,.el-overlay,.el-message-box__wrapper,.modal-mask,.modal-wrapper,#modal,#confirmModal,#messageBox,#dialog,#popup{z-index:2147483646!important}';
    document.head.appendChild(style);
  }

  function knFunctionCenterGetDialogPortal() {
    knFunctionCenterEnsureNativeDialogCSS();
    var portal = document.getElementById('kn-native-dialog-portal');
    if (!portal) {
      portal = document.createElement('div');
      portal.id = 'kn-native-dialog-portal';
      document.body.appendChild(portal);
      portal.addEventListener('click', function (e) {
        if (e.target !== portal) return;
        // 点击遮罩只做置顶，不关闭原生确认，避免误取消重启流程。
        knFunctionCenterBringNativeDialogsToFront();
      });
    }
    return portal;
  }

  function knFunctionCenterIsNativeDialogCandidate(el) {
    if (!el || !(el instanceof HTMLElement)) return false;
    if (el.id === DIALOG_ID || el.id === 'kn-native-risk-overlay' || el.id === 'kn-native-dialog-portal') return false;
    if (el.closest && (el.closest('#' + DIALOG_ID) || el.closest('#' + TOOLBOX_DRAWER_ID) || el.closest('#' + TOOLBOX_SETTINGS_ID) || el.closest('#kn-phone-sms-modal') || el.closest('#kn-operator-info-missing') || el.closest('#kn-phone-sms-missing'))) return false;
    if (el.classList && (el.classList.contains('kn-dialog-content') || el.classList.contains('kn-native-dialog-ported'))) return false;
    var id = String(el.id || '').toLowerCase();
    var cls = String(el.className || '').toLowerCase();
    var role = String(el.getAttribute && (el.getAttribute('role') || '') || '').toLowerCase();
    var text = clean((el.innerText || el.textContent || '')).slice(0, 300);
    var looksLike = /confirm|dialog|modal|popup|messagebox|message-box|swal|layui-layer|van-dialog|el-message|alert/.test(id + ' ' + cls + ' ' + role)
      || /确认|取消|重启|重啟|恢复出厂|关机|确定/.test(text);
    if (!looksLike) return false;
    try {
      var cs = window.getComputedStyle ? window.getComputedStyle(el) : null;
      if (cs && (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0)) return false;
      var rect = el.getBoundingClientRect ? el.getBoundingClientRect() : null;
      if (rect && rect.width < 80 && rect.height < 40) return false;
    } catch (e) {}
    return true;
  }

  function knFunctionCenterPortNativeDialog(el) {
    if (!knFunctionCenterIsNativeDialogCandidate(el)) return false;
    var portal = knFunctionCenterGetDialogPortal();
    try {
      el.classList.add('kn-native-dialog-ported', 'kn-native-dialog-lifted');
      el.setAttribute('data-kn-native-dialog-ported', '1');
      el.style.zIndex = '2147483647';
      el.style.pointerEvents = 'auto';
      portal.appendChild(el);
      return true;
    } catch (e) {
      return false;
    }
  }

  function knFunctionCenterBringNativeDialogsToFront() {
    knFunctionCenterEnsureNativeDialogCSS();
    var selectors = [
      'dialog:not(#' + DIALOG_ID + ')',
      '.swal2-container', '.van-dialog', '.van-popup', '.el-message-box__wrapper', '.layui-layer', '.ant-modal-root', '.ant-modal-wrap', '.ivu-modal-wrap', '.n-modal-container',
      '.modal:not(#' + TOOLBOX_DRAWER_ID + '):not(#' + TOOLBOX_SETTINGS_ID + ')', '.modal-wrapper',
      '#modal', '#confirmModal', '#messageBox', '#dialog', '#popup'
    ];
    var moved = false;
    selectors.forEach(function (selector) {
      Array.prototype.slice.call(document.querySelectorAll(selector)).forEach(function (el) {
        if (knFunctionCenterPortNativeDialog(el)) moved = true;
        else {
          try {
            el.classList.add('kn-native-dialog-lifted');
            el.style.zIndex = '2147483646';
            el.style.pointerEvents = 'auto';
          } catch (e) {}
        }
      });
    });
    return moved;
  }

  function knFunctionCenterStartNativeDialogLift() {
    knFunctionCenterEnsureNativeDialogCSS();
    var times = 0;
    knFunctionCenterBringNativeDialogsToFront();
    var observer = null;
    try {
      observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (m) {
          Array.prototype.slice.call(m.addedNodes || []).forEach(function (node) {
            if (node instanceof HTMLElement) {
              knFunctionCenterPortNativeDialog(node);
              Array.prototype.slice.call(node.querySelectorAll ? node.querySelectorAll('dialog,.modal,.modal-wrapper,.swal2-container,.van-dialog,.van-popup,.el-message-box__wrapper,.layui-layer,#modal,#confirmModal,#messageBox,#dialog,#popup') : []).forEach(knFunctionCenterPortNativeDialog);
            }
          });
        });
      });
      observer.observe(document.body, { childList: true, subtree: true });
    } catch (e) {}
    var timer = window.setInterval(function () {
      times += 1;
      knFunctionCenterBringNativeDialogsToFront();
      if (times >= 40) {
        window.clearInterval(timer);
        if (observer) { try { observer.disconnect(); } catch (e) {} }
      }
    }, 120);
  }

  function knFunctionCenterShowHighRiskOverlay(original, label, proxyBtn) {
    knFunctionCenterEnsureNativeDialogCSS();
    var dialog = document.getElementById(DIALOG_ID);
    if (!dialog) return;
    var old = document.getElementById('kn-native-risk-overlay');
    if (old) old.remove();
    var overlay = document.createElement('div');
    overlay.id = 'kn-native-risk-overlay';
    overlay.innerHTML = '<div class="kn-risk-head"><div class="kn-risk-title">原生确认流程已置顶</div><button type="button" class="kn-risk-btn" data-risk-close="1">关闭提示</button></div><div class="kn-risk-desc">已调用原生「' + knEsc(label) + '」。如果原生流程需要二次确认或多次点击，不要关闭设置面板，直接点击下面的“再次调用原生按钮”。同时会持续把原生确认弹窗提升到最上层。</div><div class="kn-risk-actions"><button type="button" class="kn-risk-btn" data-risk-lift="1">重新置顶弹窗</button><button type="button" class="kn-risk-btn primary" data-risk-again="1">再次调用原生按钮</button></div>';
    var callNative = function () {
      var count = Number(proxyBtn && proxyBtn.getAttribute('data-native-click-count') || '0') + 1;
      if (proxyBtn) {
        proxyBtn.setAttribute('data-native-click-count', String(count));
        proxyBtn.classList.add('is-called');
        proxyBtn.title = '已调用原生按钮 ' + count + ' 次；设置面板保持打开，原生弹窗会自动置顶。';
      }
      try {
        original.click();
        knFunctionCenterStartNativeDialogLift();
      } catch (e) {
        if (typeof createToast === 'function') createToast('原生按钮调用失败：' + label, 'red');
      }
    };
    overlay.querySelector('[data-risk-close]').onclick = function () { overlay.remove(); };
    overlay.querySelector('[data-risk-lift]').onclick = knFunctionCenterStartNativeDialogLift;
    overlay.querySelector('[data-risk-again]').onclick = callNative;
    dialog.appendChild(overlay);
  }

  function knFunctionCenterInvokeHighRiskNative(original, label, proxyBtn) {
    if (!original) return;
    if (typeof createToast === 'function') createToast('正在调用原生「' + label + '」；设置面板保持打开，确认弹窗将自动置顶', 'yellow');
    knFunctionCenterShowHighRiskOverlay(original, label, proxyBtn);
    window.setTimeout(function () {
      try {
        var count = Number(proxyBtn && proxyBtn.getAttribute('data-native-click-count') || '0') + 1;
        if (proxyBtn) {
          proxyBtn.setAttribute('data-native-click-count', String(count));
          proxyBtn.classList.add('is-called');
          proxyBtn.title = '已调用原生按钮 ' + count + ' 次；设置面板保持打开，原生弹窗会自动置顶。';
        }
        original.click();
        knFunctionCenterStartNativeDialogLift();
      } catch (e) {
        if (typeof createToast === 'function') createToast('原生按钮调用失败：' + label, 'red');
      }
    }, 60);
  }


  function knFunctionCenterCleanupNativeRiskUI() {
    var old = document.getElementById('kn-native-risk-overlay');
    if (old) old.remove();
    var portal = document.getElementById('kn-native-dialog-portal');
    if (portal && !portal.children.length) portal.remove();
  }

  function knFunctionCenterLiftNativeDialogsDirect() {
    knFunctionCenterEnsureNativeDialogCSS();
    var selectors = [
      'dialog:not(#' + DIALOG_ID + ')',
      '.swal2-container', '.van-dialog', '.van-popup', '.el-message-box__wrapper', '.layui-layer', '.ant-modal-root', '.ant-modal-wrap', '.ivu-modal-wrap', '.n-modal-container',
      '.modal:not(#' + TOOLBOX_DRAWER_ID + '):not(#' + TOOLBOX_SETTINGS_ID + ')', '.modal-wrapper',
      '#modal', '#confirmModal', '#messageBox', '#dialog', '#popup'
    ];
    selectors.forEach(function (selector) {
      Array.prototype.slice.call(document.querySelectorAll(selector)).forEach(function (el) {
        if (!knFunctionCenterIsNativeDialogCandidate(el)) return;
        try {
          el.classList.add('kn-native-dialog-lifted', 'kn-native-dialog-lifted-direct');
          el.style.zIndex = '2147483647';
          el.style.pointerEvents = 'auto';
        } catch (e) {}
      });
    });
  }

  function knFunctionCenterStartDirectNativeLift() {
    knFunctionCenterLiftNativeDialogsDirect();
    var times = 0;
    var observer = null;
    try {
      observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (m) {
          Array.prototype.slice.call(m.addedNodes || []).forEach(function (node) {
            if (!(node instanceof HTMLElement)) return;
            if (knFunctionCenterIsNativeDialogCandidate(node)) {
              try {
                node.classList.add('kn-native-dialog-lifted', 'kn-native-dialog-lifted-direct');
                node.style.zIndex = '2147483647';
                node.style.pointerEvents = 'auto';
              } catch (e) {}
            }
            Array.prototype.slice.call(node.querySelectorAll ? node.querySelectorAll('dialog,.modal,.modal-wrapper,.swal2-container,.van-dialog,.van-popup,.el-message-box__wrapper,.layui-layer,#modal,#confirmModal,#messageBox,#dialog,#popup') : []).forEach(function (el) {
              if (!knFunctionCenterIsNativeDialogCandidate(el)) return;
              try {
                el.classList.add('kn-native-dialog-lifted', 'kn-native-dialog-lifted-direct');
                el.style.zIndex = '2147483647';
                el.style.pointerEvents = 'auto';
              } catch (e) {}
            });
          });
        });
      });
      observer.observe(document.body, { childList: true, subtree: true });
    } catch (e) {}
    var timer = window.setInterval(function () {
      times += 1;
      knFunctionCenterLiftNativeDialogsDirect();
      if (times >= 36) {
        window.clearInterval(timer);
        if (observer) { try { observer.disconnect(); } catch (e) {} }
      }
    }, 120);
  }

  function knFunctionCenterMountDirectNativeButton(original, label, key) {
    if (!original || !(original instanceof HTMLElement)) return null;
    knFunctionCenterCleanupNativeRiskUI();
    if (functionCenterState.adopted.indexOf(original) === -1) functionCenterState.adopted.push(original);
    try {
      original.classList.remove('kn-home-function-hidden');
      original.removeAttribute('data-kn-home-function-hidden');
      original.setAttribute('data-kn-fc-direct-native', '1');
      original.classList.add('kn-fc-native-direct', 'needs-confirm');
      original.style.display = 'inline-flex';
      original.style.visibility = 'visible';
      original.style.opacity = '1';
      original.title = '原生按钮：' + label + '。保持原按钮本体，支持原生多次点击确认流程。';
      if (!clean(original.innerText || original.textContent || original.value || '')) {
        if ('value' in original) original.value = label;
        else original.textContent = label;
      }
      if (!original.__kn_fc_direct_native_bound__) {
        original.__kn_fc_direct_native_bound__ = true;
        original.addEventListener('click', function () {
          // 不拦截原生 click，只负责把原生确认层提升到设置面板之上。
          window.setTimeout(knFunctionCenterStartDirectNativeLift, 30);
          window.setTimeout(knFunctionCenterLiftNativeDialogsDirect, 260);
        }, true);
      }
    } catch (e) {}
    return original;
  }

  function renderFunctionCenterGroupPanel(key) {
    hideHomeFunctionListButtons();
    var panel = document.getElementById('kn-settings-panel-fc-' + key);
    if (!panel) return;
    var allItems = knFunctionCenterGetItems();
    var grouped = knFunctionCenterGroupItems(allItems);
    var meta = knFunctionCenterGroupMeta(key);
    var searchEl = panel.querySelector('.kn-fc-search');
    if (searchEl && searchEl.value !== functionCenterState.search) searchEl.value = functionCenterState.search || '';
    var query = clean(functionCenterState.search || '').toLowerCase();
    var items = (grouped[key] || []).filter(function (item) {
      if (!query) return true;
      return item.label.toLowerCase().indexOf(query) !== -1;
    });
    var countEl = panel.querySelector('.kn-fc-native-count');
    if (countEl) countEl.textContent = items.length + ' 个';
    var grid = panel.querySelector('.kn-fc-native-grid');
    if (grid) {
      grid.innerHTML = '';
      if (!items.length) {
        var empty = document.createElement('div');
        empty.className = 'kn-fc-empty';
        empty.textContent = query ? '没有匹配的原生按钮。' : '当前分类暂无原生按钮。';
        grid.appendChild(empty);
      } else {
        items.forEach(function (item) {
          if (item.type === 'select') {
            var wrap = document.createElement('label');
            wrap.className = 'kn-fc-select-wrap';
            var span = document.createElement('span');
            span.textContent = item.label;
            var sel = document.createElement('select');
            Array.prototype.slice.call(item.el.options || []).forEach(function (opt) {
              var o = document.createElement('option');
              o.value = opt.value;
              o.textContent = opt.textContent || opt.value;
              sel.appendChild(o);
            });
            sel.value = item.el.value;
            sel.onchange = function () {
              item.el.value = sel.value;
              try { item.el.dispatchEvent(new Event('input', { bubbles: true })); } catch (e) {}
              try { item.el.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) {}
              if (typeof createToast === 'function') createToast('已同步原生选择项：' + item.label, 'green');
            };
            wrap.appendChild(span);
            wrap.appendChild(sel);
            grid.appendChild(wrap);
          } else {
            if (knFunctionCenterShouldKeepSettingsOpen(item.label, key)) {
              var directNative = knFunctionCenterMountDirectNativeButton(item.el, item.label, key);
              if (directNative) {
                grid.appendChild(directNative);
                return;
              }
            }
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'kn-fc-native-btn';
            b.textContent = item.label;
            b.title = '调用原生按钮：' + item.label;
            b.onclick = function () {
              var original = item.el;
              if (!original) return;
              closeSettingsDialog();
              window.setTimeout(function () {
                try { original.click(); }
                catch (e) { if (typeof createToast === 'function') createToast('原生按钮调用失败：' + item.label, 'red'); }
              }, 120);
            };
            grid.appendChild(b);
          }
        });
      }
    }
    var enhanced = panel.querySelector('.kn-fc-enhanced');
    if (enhanced) {
      enhanced.innerHTML = knFunctionCenterEnhancedCards(key).map(function (card) {
        var action = card.action ? '<button type="button" class="kn-google-btn" data-fc-action="' + knEsc(card.action) + '">' + knEsc(card.actionLabel || '打开') + '</button>' : '';
        return '<div class="kn-fc-enh-card"><b>' + knEsc(card.title) + '</b><p>' + knEsc(card.text) + '</p>' + (card.tab ? '<button type="button" class="kn-google-btn" data-open-settings-tab="' + card.tab + '">打开相关设置</button>' : action) + '</div>';
      }).join('');
      Array.prototype.slice.call(enhanced.querySelectorAll('[data-open-settings-tab]')).forEach(function (btn) {
        btn.onclick = function () { switchSettingsTab(btn.getAttribute('data-open-settings-tab')); };
      });
      Array.prototype.slice.call(enhanced.querySelectorAll('[data-fc-action]')).forEach(function (btn) {
        btn.onclick = function () {
          if (btn.getAttribute('data-fc-action') === 'diagnostics') openNetworkDiagnostics();
        };
      });
    }
  }

  function switchSettingsTab(tab) {
    if (tab === 'plugins' && !knPluginManager.loaded) setTimeout(knPluginRefresh, 30);
    if (tab && tab.indexOf('fc-') === 0) {
      functionCenterState.active = tab.slice(3);
      setTimeout(function () { renderFunctionCenterGroupPanel(functionCenterState.active); }, 30);
    }
    Array.prototype.slice.call(document.querySelectorAll('.kn-settings-tab')).forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tab);
    });
    Array.prototype.slice.call(document.querySelectorAll('.kn-settings-panel')).forEach(function (panel) {
      panel.classList.toggle('active', panel.id === 'kn-settings-panel-' + tab);
    });
  }

  function formatAppearanceValue(key, value) {
    if (key === 'backgroundDim') return String(value) + '%';
    if (key === 'backgroundBlur') return String(value) + 'px';
    if (key === 'backgroundSaturate') return String(value) + '%';
    if (key === 'headerBlur') return String(value) + 'px';
    if (key === 'headerOpacity') return String(value) + '%';
    if (key === 'fontScale') return (Number(value) / 100).toFixed(2).replace(/0$/, '').replace(/\.$/, '') + 'x';
    if (key === 'animationLevel') return ['0%', '80%', '120%'][Number(value)] || String(value);
    return String(value);
  }

  function normalizeHexColor(value, fallback) {
    var raw = String(value || '').trim();
    if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toUpperCase();
    if (/^#[0-9a-fA-F]{3}$/.test(raw)) return ('#' + raw.charAt(1) + raw.charAt(1) + raw.charAt(2) + raw.charAt(2) + raw.charAt(3) + raw.charAt(3)).toUpperCase();
    return fallback || '#4E92FF';
  }

  function syncAppearancePeerControls(key, source) {
    if (!state.config || !state.config.appearance) return;
    var val = state.config.appearance[key];
    Array.prototype.slice.call(document.querySelectorAll('[data-appearance="' + key + '"]')).forEach(function (el) {
      if (el === source) return;
      if (el.type === 'checkbox') el.checked = !!val;
      else if (el.type === 'radio') el.checked = String(val) === String(el.value);
      else el.value = val;
    });
  }

  function updateAppearanceSectionsUI() {
    if (!state.config || !state.config.appearance) return;
    var a = state.config.appearance;
    Array.prototype.slice.call(document.querySelectorAll('[data-effect-config]')).forEach(function (el) {
      var key = el.getAttribute('data-effect-config');
      var enabled = !!a[key];
      var card = el.closest ? el.closest('.kn-collapse-card') : null;
      if (card) card.classList.toggle('is-off', !enabled);
      Array.prototype.slice.call(el.querySelectorAll('input,select,button')).forEach(function (input) { input.disabled = !enabled; });
    });
  }

  function updateAppearanceValueLabels() {
    if (!state.config || !state.config.appearance) return;
    var a = state.config.appearance;
    Array.prototype.slice.call(document.querySelectorAll('[data-value-for]')).forEach(function (el) {
      var key = el.getAttribute('data-value-for');
      if (!Object.prototype.hasOwnProperty.call(a, key)) return;
      el.textContent = formatAppearanceValue(key, a[key]);
    });
    updateAppearanceSectionsUI();
  }

  function updateBackgroundControlsUI() {
    if (!state.config || !state.config.appearance) return;
    var a = state.config.appearance;
    var enabled = !!a.enableBackground;
    var mode = a.backgroundMode === 'custom' ? 'custom' : 'preset';

    Array.prototype.slice.call(document.querySelectorAll('[data-bg-scope]')).forEach(function (el) {
      var scope = el.getAttribute('data-bg-scope');
      var active = enabled;
      if (scope === 'preset') active = enabled && mode === 'preset';
      if (scope === 'custom') active = enabled && mode === 'custom';
      el.classList.toggle('is-disabled', !active);
      Array.prototype.slice.call(el.querySelectorAll('input,select,button')).forEach(function (child) {
        if (child.getAttribute('data-appearance') === 'backgroundMode') child.disabled = !enabled;
        else child.disabled = !active;
      });
    });

    Array.prototype.slice.call(document.querySelectorAll('.kn-bg-mode-option')).forEach(function (label) {
      var radio = label.querySelector('input[type="radio"]');
      var selected = radio && radio.checked;
      label.classList.toggle('active', !!selected);
    });

    updateAppearanceValueLabels();
  }

  function bindAppearanceControls() {
    if (!state.config || !state.config.appearance) return;
    var a = state.config.appearance;
    Array.prototype.slice.call(document.querySelectorAll('[data-appearance]')).forEach(function (input) {
      var key = input.getAttribute('data-appearance');
      if (!Object.prototype.hasOwnProperty.call(a, key)) return;

      if (input.type === 'checkbox') input.checked = !!a[key];
      else if (input.type === 'radio') input.checked = String(a[key]) === String(input.value);
      else input.value = a[key];

      input.oninput = input.onchange = function () {
        if (input.type === 'checkbox') a[key] = input.checked;
        else if (input.type === 'radio') {
          if (!input.checked) return;
          a[key] = input.value;
        } else if (input.type === 'range' || input.type === 'number') {
          a[key] = Number(input.value);
        } else {
          a[key] = input.value;
          if (input.classList && input.classList.contains('kn-color-hex')) a[key] = normalizeHexColor(input.value, a[key]);
        }
        syncAppearancePeerControls(key, input);
        saveConfig();
        updateBackgroundControlsUI();
        updateAppearanceValueLabels();
        applyAppearance();
      };
    });
    updateBackgroundControlsUI();
  }

  function applyAppearance() {
    injectAppearanceCSS();
    var header = document.getElementById(HEADER_ID);
    if (header && state.config && state.config.appearance) {
      var a = state.config.appearance;
      var light = getTheme() === 'light';
      header.style.backdropFilter = 'blur(' + a.headerBlur + 'px) saturate(180%)';
      header.style.webkitBackdropFilter = 'blur(' + a.headerBlur + 'px) saturate(180%)';
      if (light) {
        header.style.background = 'linear-gradient(180deg, rgba(255,255,255,' + (Math.min(98, a.headerOpacity + 4) / 100).toFixed(2) + '), rgba(245,248,252,' + (Math.min(94, a.headerOpacity) / 100).toFixed(2) + '))';
      } else {
        header.style.background = 'linear-gradient(180deg, rgba(28,31,38,' + (a.headerOpacity / 100).toFixed(2) + '), rgba(17,19,24,' + Math.max(0.45, (a.headerOpacity - 10) / 100).toFixed(2) + '))';
      }
    }
  }

  function renderBeauty() { applyAppearance(); }
  function resetAppearance() { if (!confirm('确认恢复默认美化设置吗？')) return; state.config.appearance = clone(DEFAULT_APPEARANCE); saveConfig(); bindAppearanceControls(); applyAppearance(); }

  function headerText(selector, value) {
    var el = document.querySelector(selector);
    if (!el) return;
    var text = value || '--';
    el.textContent = text;
    el.title = text;
  }


  var HOME_REFRESH_CONFIG_KEY = 'kano_webos_home_refresh_config_v1';

  function readHomeRefreshConfig() {
    // v26.9.7：首页默认开启自动刷新。
    // 兼容 v26.9.6 旧配置：旧版默认写入 auto=false，但无法区分是否为用户主动关闭。
    // 因此只有用户在新版中明确点击过自动刷新开关后，才持久保留关闭状态。
    var def = { auto: true, interval: 10000, userSetAuto: false };
    try {
      var raw = localStorage.getItem(HOME_REFRESH_CONFIG_KEY);
      if (!raw) return def;
      var cfg = JSON.parse(raw) || {};
      var interval = Number(cfg.interval);
      if ([5000, 10000, 30000, 60000].indexOf(interval) === -1) interval = def.interval;
      var userSetAuto = cfg.userSetAuto === true;
      var auto = userSetAuto ? !!cfg.auto : true;
      if (!isWebOSFeatureEnabled('homeAutoRefresh')) auto = false;
      return { auto: auto, interval: interval, userSetAuto: userSetAuto };
    } catch (e) {
      return def;
    }
  }

  function saveHomeRefreshConfig(cfg) {
    try { localStorage.setItem(HOME_REFRESH_CONFIG_KEY, JSON.stringify(cfg || readHomeRefreshConfig())); } catch (e) {}
  }

  function syncHomeRefreshControls() {
    var cfg = readHomeRefreshConfig();
    var loggedIn = getStoredLoginState();
    var sel = document.querySelector('#' + HOME_DASHBOARD_ID + ' [data-home-refresh-interval]');
    var btn = document.querySelector('#' + HOME_DASHBOARD_ID + ' [data-home-auto-refresh]');
    if (sel) sel.value = String(cfg.interval);
    if (btn) {
      btn.classList.toggle('is-on', !!cfg.auto && loggedIn);
      btn.textContent = loggedIn ? ('自动刷新：' + (cfg.auto ? '开' : '关')) : '自动刷新：登录后';
      btn.title = !loggedIn ? '登录 UFI-TOOLS 后自动刷新状态' : (cfg.auto ? ('每 ' + Math.round(cfg.interval / 1000) + ' 秒自动刷新') : '自动刷新已关闭');
    }
  }

  function setHomeRefreshBusy(busy) {
    var btn = document.querySelector('#' + HOME_DASHBOARD_ID + ' [data-home-action="refresh"]');
    if (!btn) return;
    btn.classList.toggle('is-busy', !!busy);
    btn.textContent = busy ? '刷新中…' : '刷新状态';
  }

  function setHomeLastUpdate(success, text) {
    var el = document.getElementById('kn-home-refresh-time');
    if (!el) return;
    var prefix = success ? '已更新 ' : '读取失败 ';
    el.textContent = text || (prefix + new Date().toLocaleTimeString());
    el.title = el.textContent;
  }


  var homeExitIpState = { v4: '', v6: '', at: 0, busy: false };

  function setHomeExitIp(info, source, stateText) {
    if (!info || typeof info !== 'object') info = {};
    var v4 = clean(info.v4 || '');
    var v6 = clean(info.v6 || '');
    var valueEl = document.getElementById('kn-home-exit-ip');
    var v4El = document.getElementById('kn-home-exit-ip-v4');
    var v6El = document.getElementById('kn-home-exit-ip-v6');
    var subEl = document.getElementById('kn-home-exit-ip-sub');
    var card = document.getElementById('kn-home-exit-ip-card');
    if (valueEl) valueEl.textContent = stateText || (v4 || v6 ? '设备端已获取' : '设备端查询');
    if (v4El) v4El.textContent = v4 || '--';
    if (v6El) v6El.textContent = v6 || '--';
    // 不在界面暴露具体第三方接口 / 代理来源，避免把调试信息展示给用户。
    if (subEl) {
      if (v4 || v6) subEl.textContent = '点击复制设备出口 IP';
      else subEl.textContent = stateText || '设备端查询 IPv4 / IPv6';
    }
    if (card) {
      var copy = [v4 ? ('IPv4 ' + v4) : '', v6 ? ('IPv6 ' + v6) : ''].filter(Boolean).join('\n');
      card.setAttribute('data-copy-exit-ip', copy);
      card.title = copy ? ('点击复制设备出口 IP\n' + copy) : '设备出口 IP 暂未获取';
    }
  }

  function parseHomeExitIpsFromResponse(text) {
    var raw = String(text == null ? '' : text).trim();
    var result = { v4: '', v6: '' };
    if (!raw) return result;
    try {
      var json = JSON.parse(raw);
      raw = json.ip || json.query || json.origin || json.address || json.ipv4 || json.ipv6 || raw;
    } catch (e) {}
    var str = String(raw);
    var v4 = str.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
    if (v4) result.v4 = v4[0];
    var v6Matches = str.match(/(?:^|[^\w:])((?:[a-f0-9]{1,4}:){2,}[a-f0-9:]{1,4})(?:$|[^\w:])/ig) || [];
    for (var i = 0; i < v6Matches.length; i += 1) {
      var candidate = clean(v6Matches[i]).replace(/^[^a-f0-9:]+|[^a-f0-9:]+$/ig, '');
      if (candidate && candidate.indexOf(':') !== -1 && !/^fe80:/i.test(candidate) && candidate !== '::1') {
        result.v6 = candidate;
        break;
      }
    }
    return result;
  }

  function homeShellText(res) {
    if (res == null) return '';
    if (typeof res === 'string') return res;
    if (typeof res === 'object') {
      return String(res.content || res.output || res.stdout || res.stderr || res.data || res.result || '');
    }
    return String(res);
  }

  function homeShellQuote(value) {
    return "'" + String(value == null ? '' : value).replace(/'/g, "'\\''") + "'";
  }

  function runHomeDeviceShellCommand(cmd) {
    function postRootShellApi(command) {
      var headers = Object.assign({}, getHeaderHeaders(), { 'Content-Type': 'application/json;charset=UTF-8' });
      return fetch(getHeaderBaseURL().replace(/\/$/, '') + '/root_shell', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ command: command })
      }).then(function (res) {
        return res.text().then(function (text) {
          if (!res.ok) throw new Error('root_shell HTTP ' + res.status + ': ' + text.slice(0, 160));
          try { return JSON.parse(text); } catch (e) { return text; }
        });
      });
    }
    var attempts = [];
    attempts.push(function () { return postRootShellApi(cmd); });
    if (typeof runRootShellCommand === 'function') attempts.push(function () { return runRootShellCommand(cmd); });
    if (typeof runShellWithRoot === 'function') attempts.push(function () { return runShellWithRoot(cmd); });
    if (window.KanoShell && typeof window.KanoShell.run === 'function') attempts.push(function () { return window.KanoShell.run(cmd); });
    if (window.KanoShell && typeof window.KanoShell.exec === 'function') attempts.push(function () { return window.KanoShell.exec(cmd); });
    if (typeof window.runShell === 'function') attempts.push(function () { return window.runShell(cmd); });
    if (typeof window.execShell === 'function') attempts.push(function () { return window.execShell(cmd); });
    var chain = Promise.reject(new Error('start'));
    attempts.forEach(function (fn) {
      chain = chain.catch(function () { return Promise.resolve().then(fn); });
    });
    return chain;
  }

  function buildHomeExitIpCommand(url, family) {
    var safeUrl = homeShellQuote(url);
    var curlFlag = family === 6 ? '-6' : '-4';
    var wgetFlag = family === 6 ? '-6' : '-4';
    return [
      'URL=' + safeUrl,
      'OUT=""',
      'if command -v curl >/dev/null 2>&1; then OUT=$(curl ' + curlFlag + ' -fsSL --connect-timeout 4 --max-time 8 "$URL" 2>/dev/null || true); fi',
      'if [ -z "$OUT" ] && command -v wget >/dev/null 2>&1; then OUT=$(wget ' + wgetFlag + ' -qO- "$URL" 2>/dev/null || true); fi',
      'if [ -z "$OUT" ] && command -v busybox >/dev/null 2>&1; then OUT=$(busybox wget -qO- "$URL" 2>/dev/null || true); fi',
      'printf "%s" "$OUT"'
    ].join('; ');
  }

  function fetchHomeExitIpOne(item, family) {
    function fetchByDeviceProxy() {
      var base = getHeaderBaseURL().replace(/\/$/, '');
      var proxyUrl = base + '/proxy/--' + item.url;
      return fetch(proxyUrl, { headers: getHeaderHeaders(), cache: 'no-store' }).then(function (res) {
        return res.text().then(function (text) {
          if (!res.ok) throw new Error('proxy HTTP ' + res.status + ': ' + text.slice(0, 160));
          var ips = parseHomeExitIpsFromResponse(text);
          var ip = family === 4 ? ips.v4 : ips.v6;
          if (!ip) throw new Error('proxy empty IPv' + family);
          return { ip: ip, source: item.name + ' 设备代理' };
        });
      });
    }
    function fetchByRootShell() {
      var cmd = buildHomeExitIpCommand(item.url, family);
      return runHomeDeviceShellCommand(cmd).then(function (res) {
        var body = homeShellText(res);
        var ips = parseHomeExitIpsFromResponse(body);
        var ip = family === 4 ? ips.v4 : ips.v6;
        if (!ip) throw new Error('empty device IPv' + family);
        return { ip: ip, source: item.name + ' 设备命令' };
      });
    }
    return fetchByDeviceProxy().catch(fetchByRootShell);
  }

  function fetchHomeExitIpFamily(family) {
    var endpoints = family === 4 ? [
      { name: 'ipify IPv4', url: 'https://api.ipify.org?format=json' },
      { name: 'icanhazip IPv4', url: 'https://ipv4.icanhazip.com' },
      { name: 'ident IPv4', url: 'http://v4.ident.me' },
      { name: 'IP.sb IPv4', url: 'https://api-ipv4.ip.sb/ip' },
      { name: 'ifconfig IPv4', url: 'http://ipv4.icanhazip.com' }
    ] : [
      { name: 'ipify IPv6', url: 'https://api64.ipify.org?format=json' },
      { name: 'icanhazip IPv6', url: 'https://ipv6.icanhazip.com' },
      { name: 'ident IPv6', url: 'http://v6.ident.me' },
      { name: 'IP.sb IPv6', url: 'https://api-ipv6.ip.sb/ip' }
    ];
    var p = Promise.reject(new Error('start'));
    endpoints.forEach(function (item) {
      p = p.catch(function () { return fetchHomeExitIpOne(item, family); });
    });
    return p;
  }

  function refreshHomeExitIp(force) {
    if (!isWebOSFeatureEnabled('homeExitIp')) return;
    var home = document.getElementById(HOME_DASHBOARD_ID);
    if (!home) return;
    if (!getStoredLoginState()) {
      setHomeExitIp({}, '', '登录后查询');
      return;
    }
    var now = Date.now();
    if (!force && (homeExitIpState.v4 || homeExitIpState.v6) && now - homeExitIpState.at < 60000) {
      setHomeExitIp(homeExitIpState, '', '已缓存');
      return;
    }
    if (homeExitIpState.busy) return;
    homeExitIpState.busy = true;
    if (!homeExitIpState.v4 && !homeExitIpState.v6) setHomeExitIp({}, '', '设备端查询中');

    Promise.allSettled([fetchHomeExitIpFamily(4), fetchHomeExitIpFamily(6)]).then(function (results) {
      var next = {
        v4: homeExitIpState.v4,
        v6: homeExitIpState.v6,
      };
      if (results[0].status === 'fulfilled') { next.v4 = results[0].value.ip; }
      if (results[1].status === 'fulfilled') { next.v6 = results[1].value.ip; }
      if (!next.v4 && !next.v6) throw new Error('device exit ip empty');
      homeExitIpState.v4 = next.v4;
      homeExitIpState.v6 = next.v6;
      homeExitIpState.at = Date.now();
      setHomeExitIp(homeExitIpState, '', '设备端已获取');
    }).catch(function (err) {
      console.warn('[KanoWebOS] 设备端出口 IP 查询失败:', err);
      if (homeExitIpState.v4 || homeExitIpState.v6) setHomeExitIp(homeExitIpState, '', '保留缓存');
      else setHomeExitIp({}, '', '设备端代理/命令不可用');
    }).finally(function () { homeExitIpState.busy = false; });
  }

  function copyHomeExitIp() {
    var card = document.getElementById('kn-home-exit-ip-card');
    var ip = card ? clean(card.getAttribute('data-copy-exit-ip') || '') : '';
    if (!ip) { homeToast('设备出口 IP 尚未获取', 'yellow'); refreshHomeExitIp(true); return; }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(ip).then(function () { homeToast('设备出口 IP 已复制', 'green'); }).catch(function () { prompt('复制设备出口 IP', ip); });
        return;
      }
    } catch (e) {}
    prompt('复制设备出口 IP', ip);
  }

  function countryFlagFromDialCode(code) {
    code = String(code || '').replace(/^\+/, '');
    if (code === '86') return '🇨🇳';
    if (code === '852') return '🇭🇰';
    if (code === '853') return '🇲🇴';
    if (code === '886') return '🇨🇳';
    if (code === '1') return '🇺🇸';
    if (code === '81') return '🇯🇵';
    if (code === '82') return '🇰🇷';
    return '🌐';
  }

  function splitKnownDialCode(raw) {
    var body = String(raw || '').replace(/^\+/, '').replace(/^00/, '');
    var known = ['86', '852', '853', '886', '81', '82', '1'];
    for (var i = 0; i < known.length; i += 1) {
      var code = known[i];
      if (body.indexOf(code) === 0 && body.length > code.length + 3) return { code: code, number: body.slice(code.length) };
    }
    return { code: '', number: body };
  }

  function formatHomePhoneNumberByCode(code, number) {
    code = String(code || '').replace(/^\+/, '');
    number = String(number || '').replace(/\D/g, '');
    if (code === '86' && /^1\d{10}$/.test(number)) return number.replace(/^(\d{3})(\d{4})(\d{4})$/, '$1 $2 $3');
    if ((code === '852' || code === '853') && /^\d{8}$/.test(number)) return number.replace(/^(\d{4})(\d{4})$/, '$1 $2');
    if ((code === '81' || code === '82') && number.length >= 9) return number.replace(/(\d{2,3})(?=\d)/g, '$1 ').trim();
    return number.replace(/(\d{3,4})(?=\d)/g, '$1 ').trim();
  }

  function normalizeHomePhoneIntl(phone, operator) {
    var rawOriginal = clean(phone);
    var raw = rawOriginal.replace(/[\s()（）-]/g, '');
    if (!raw || raw === '--') return { text: '手机号未返回', copy: '', code: '', flag: '🌐' };
    var code = '';
    var number = raw.replace(/^\+/, '').replace(/^00/, '');

    if (/^\+|^00/.test(raw)) {
      var parts = splitKnownDialCode(raw);
      code = parts.code;
      number = parts.number;
    } else if (/^86(1\d{10})$/.test(raw)) {
      code = '86';
      number = raw.replace(/^86/, '');
    } else if (/^1\d{10}$/.test(raw) || /中国|China|CMCC|中国移动|中国广电|广电|联通|电信/.test(operator || '')) {
      code = '86';
      number = raw;
    }

    if (code === '86' && /^86(1\d{10})$/.test(number)) number = number.replace(/^86/, '');
    var flag = countryFlagFromDialCode(code);
    var formattedNumber = formatHomePhoneNumberByCode(code, number);
    var text = code ? (flag + ' +' + code + ' ' + formattedNumber) : (flag + ' ' + formattedNumber);
    return { text: text, copy: code ? ('+' + code + String(number || '').replace(/\D/g, '')) : raw, code: code, flag: flag };
  }

  function setHomePhoneLine(phone, operator) {
    var el = document.getElementById('kn-home-phone-line');
    if (!el) return;
    var info = normalizeHomePhoneIntl(phone, operator);
    if (keepHomePreviousIfNewWeak(el, info.text)) return;
    el.textContent = info.text;
    el.title = info.copy ? ('点击复制 ' + info.copy) : '手机号未返回';
    el.setAttribute('data-copy-phone', info.copy || '');
  }

  function copyHomePhoneFromLine() {
    var el = document.getElementById('kn-home-phone-line');
    var phone = el ? clean(el.getAttribute('data-copy-phone') || '') : '';
    if (!phone) { homeToast('手机号未返回，无法复制', 'yellow'); return; }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(phone).then(function () { homeToast('手机号已复制：' + phone, 'green'); }).catch(function () { prompt('复制手机号', phone); });
        return;
      }
    } catch (e) {}
    prompt('复制手机号', phone);
  }

  function bindHomeDashboardControls(home) {
    if (!home || home.getAttribute('data-kn-home-controls-bound') === '1') return;
    home.setAttribute('data-kn-home-controls-bound', '1');

    var refreshBtn = home.querySelector('[data-home-action="refresh"]');
    if (refreshBtn) refreshBtn.onclick = function (e) {
      if (e && e.preventDefault) e.preventDefault();
      if (e && e.stopPropagation) e.stopPropagation();
      refreshHomeDashboardStatus(true);
    };

    var sel = home.querySelector('[data-home-refresh-interval]');
    if (sel) sel.onchange = function () {
      var cfg = readHomeRefreshConfig();
      cfg.interval = Number(sel.value) || 10000;
      saveHomeRefreshConfig(cfg);
      state.homeRefreshAt = 0;
      syncHomeRefreshControls();
      if (cfg.auto) refreshHomeDashboardStatus(true);
    };

    var autoBtn = home.querySelector('[data-home-auto-refresh]');
    if (autoBtn) autoBtn.onclick = function (e) {
      if (e && e.preventDefault) e.preventDefault();
      if (e && e.stopPropagation) e.stopPropagation();
      var cfg = readHomeRefreshConfig();
      cfg.auto = !cfg.auto;
      cfg.userSetAuto = true;
      saveHomeRefreshConfig(cfg);
      state.homeRefreshAt = 0;
      syncHomeRefreshControls();
      if (cfg.auto) refreshHomeDashboardStatus(true);
    };

    var phoneLine = home.querySelector('#kn-home-phone-line');
    if (phoneLine) phoneLine.onclick = copyHomePhoneFromLine;
    syncHomeRefreshControls();
  }

  function injectHomeDashboardCSS() {
    if (document.getElementById(HOME_STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = HOME_STYLE_ID;
    style.textContent = '' +
      '#'+ HOME_DASHBOARD_ID + '{--home-card-bg:rgba(11,16,24,.72);--home-card-bg-soft:rgba(255,255,255,.038);--home-card-border:rgba(255,255,255,.09);--home-text:rgba(255,255,255,.92);--home-muted:rgba(255,255,255,.50);--home-muted-2:rgba(255,255,255,.36);--home-good:#39d279;--home-warn:#f7c948;--home-bad:#ff5f68;--home-blue:#7fb4ff;--home-radius-lg:24px;--home-radius-md:16px;--home-gap:12px;width:min(1280px,calc(100% - 40px));margin:0 auto 24px;box-sizing:border-box;}' +
      '#'+ HOME_DASHBOARD_ID + ' *{box-sizing:border-box;}' +
      '#'+ HOME_DASHBOARD_ID + '.kn-home-dashboard{display:flex;flex-direction:column;gap:16px;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-card,#'+ HOME_DASHBOARD_ID + ' .kn-home-dash-card{border:1px solid var(--home-card-border);border-radius:var(--home-radius-lg);background:linear-gradient(180deg,rgba(18,23,32,.80),rgba(10,14,21,.66));backdrop-filter:blur(18px) saturate(150%);-webkit-backdrop-filter:blur(18px) saturate(150%);box-shadow:0 14px 36px rgba(0,0,0,.18),inset 0 1px 0 rgba(255,255,255,.045);}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-device-card{padding:18px;overflow:hidden;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:14px;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-kicker{font-size:11px;font-weight:850;letter-spacing:.08em;text-transform:uppercase;color:rgba(142,190,255,.84);margin-bottom:6px;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-title{font-size:20px;font-weight:950;color:var(--home-text);line-height:1.2;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-subtitle{margin-top:6px;font-size:12px;line-height:1.65;color:var(--home-muted);max-width:780px;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-refresh-controls{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex-wrap:wrap;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-refresh{min-height:34px;padding:0 12px;border-radius:999px;border:1px solid rgba(120,180,255,.24);background:rgba(72,150,255,.12);color:rgba(220,238,255,.94);font-size:12px;font-weight:850;cursor:pointer;white-space:nowrap;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-refresh.is-busy{opacity:.65;pointer-events:none;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-refresh-select{height:34px;min-width:92px;border-radius:999px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.055);color:rgba(255,255,255,.86);font-size:12px;font-weight:850;padding:0 10px;outline:none;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-refresh-toggle{height:34px;padding:0 12px;border-radius:999px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.055);color:rgba(255,255,255,.72);font-size:12px;font-weight:850;cursor:pointer;white-space:nowrap;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-refresh-toggle.is-on{background:rgba(57,210,121,.15);border-color:rgba(134,239,172,.28);color:rgba(225,255,235,.96);}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-refresh-time{width:100%;font-size:10.5px;color:var(--home-muted-2);text-align:right;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-status-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-stat{min-width:0;padding:14px;border-radius:18px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.07);}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-stat-label{font-size:11px;color:var(--home-muted);font-weight:780;margin-bottom:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-stat-value{font-size:18px;font-weight:950;color:var(--home-text);line-height:1.32;word-break:break-word;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-stat-sub{margin-top:6px;font-size:10.5px;color:var(--home-muted-2);line-height:1.38;word-break:break-word;}#'+ HOME_DASHBOARD_ID + ' .kn-home-stat.is-clickable{cursor:pointer;}#'+ HOME_DASHBOARD_ID + ' .kn-home-stat.is-clickable:hover{border-color:rgba(120,180,255,.26);background:rgba(120,180,255,.06);}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-phone-line{display:inline-flex;align-items:center;gap:6px;max-width:100%;padding:3px 8px;margin-top:7px;border-radius:999px;background:rgba(57,210,121,.08);border:1px solid rgba(134,239,172,.16);color:rgba(229,255,237,.86);cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-phone-line:hover{background:rgba(57,210,121,.14);border-color:rgba(134,239,172,.28);}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-dashboard-fusion{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:12px;margin-top:14px;align-items:stretch;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-left-column{grid-column:span 6;min-width:0;display:grid;grid-template-rows:auto minmax(150px,1fr);gap:12px;align-self:stretch;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-dash-card{min-width:0;padding:16px;overflow:hidden;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-signal-card{display:flex;flex-direction:column;min-height:0;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-network-card{grid-column:span 6;grid-row:auto;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-maint-card{padding:16px;display:flex;flex-direction:column;align-items:stretch;justify-content:space-between;gap:14px;min-height:150px;background:radial-gradient(circle at 12% 0%,rgba(120,180,255,.12),transparent 42%),linear-gradient(135deg,rgba(78,146,255,.085),rgba(57,210,121,.040));}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-resource-card{grid-column:span 12;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-dash-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-dash-title{font-size:14px;font-weight:950;color:rgba(255,255,255,.88);}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-dash-extra{font-size:11px;color:var(--home-muted-2);font-weight:760;text-align:right;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-progress-list{display:flex;flex-direction:column;gap:12px;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-progress-row{display:grid;grid-template-columns:96px minmax(160px,1fr) 76px 52px;gap:12px;align-items:center;font-size:12px;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-progress-label{min-width:0;color:var(--home-muted);font-weight:820;line-height:1.2;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-progress-label strong{display:block;font-size:12px;color:rgba(255,255,255,.76);font-weight:950;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-progress-label span{display:block;margin-top:3px;font-size:10px;color:var(--home-muted-2);font-weight:700;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-progress-track{height:9px;border-radius:999px;background:rgba(255,255,255,.075);overflow:hidden;box-shadow:inset 0 1px 3px rgba(0,0,0,.22);}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-progress-fill{height:100%;width:0%;border-radius:inherit;background:linear-gradient(90deg,var(--home-blue),var(--home-good));transition:width .24s ease,background .24s ease,opacity .24s ease;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-progress-fill.good{background:linear-gradient(90deg,var(--home-blue),var(--home-good));}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-progress-fill.warn{background:linear-gradient(90deg,#f59e0b,var(--home-warn));}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-progress-fill.bad{background:linear-gradient(90deg,var(--home-bad),#f97316);}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-progress-fill.empty{width:0%!important;opacity:.35;background:rgba(255,255,255,.20);}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-progress-value{font-size:12px;color:rgba(255,255,255,.82);font-weight:900;text-align:right;white-space:nowrap;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-signal-state{height:24px;display:inline-flex;align-items:center;justify-content:center;border-radius:999px;padding:0 8px;font-size:10px;font-weight:900;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.055);color:rgba(255,255,255,.68);white-space:nowrap;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-signal-state.good{color:#dfffea;background:rgba(57,210,121,.13);border-color:rgba(134,239,172,.26);}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-signal-state.warn{color:#fff4d0;background:rgba(247,201,72,.13);border-color:rgba(247,201,72,.24);}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-signal-state.bad{color:#ffe5e8;background:rgba(255,95,104,.13);border-color:rgba(255,130,140,.24);}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-signal-state.empty{color:rgba(255,255,255,.42);background:rgba(255,255,255,.035);}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-signal-card{justify-content:flex-start;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-signal-card .kn-home-progress-list{gap:10px;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-signal-insights{margin-top:12px;padding-top:10px;border-top:1px solid rgba(255,255,255,.055);display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-signal-insights>div{min-width:0;padding:10px 11px;border-radius:15px;background:rgba(255,255,255,.038);border:1px solid rgba(255,255,255,.06);}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-signal-insights b{display:block;font-size:10px;color:var(--home-muted-2);margin-bottom:5px;font-weight:850;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-signal-insights span{display:block;font-size:12px;color:var(--home-text);font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-kpi-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-kpi{min-width:0;padding:13px;border-radius:17px;background:rgba(255,255,255,.042);border:1px solid rgba(255,255,255,.065);}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-kpi.hero{grid-column:1/-1;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-kpi-label{font-size:11px;color:var(--home-muted);font-weight:780;margin-bottom:7px;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-kpi-value{font-size:19px;font-weight:950;color:var(--home-text);line-height:1.25;word-break:break-word;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-kpi-value.small{font-size:13px;line-height:1.45;color:rgba(255,255,255,.78);}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-duplex{display:flex;align-items:center;justify-content:space-between;gap:12px;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-duplex-block{min-width:0;flex:1;padding:10px 12px;border-radius:15px;background:rgba(0,0,0,.16);}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-duplex-label{font-size:10px;color:var(--home-muted-2);font-weight:850;margin-bottom:5px;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-rx,#'+ HOME_DASHBOARD_ID + ' .kn-home-tx{display:block;font-size:22px;font-weight:950;color:var(--home-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-rx{color:#dfffea;}#'+ HOME_DASHBOARD_ID + ' .kn-home-tx{color:#dbeafe;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-resource-grid{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(360px,.95fr);gap:14px;align-items:start;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-resource-main{min-width:0;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-resource-side{min-width:0;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-resource-row{display:grid;grid-template-columns:98px minmax(0,1fr) 96px;gap:10px;align-items:center;font-size:12px;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-cpu-summary-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-bottom:10px;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-cpu-summary-item{padding:10px;border-radius:15px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-cpu-summary-item b{display:block;font-size:10px;color:var(--home-muted-2);margin-bottom:5px;}#'+ HOME_DASHBOARD_ID + ' .kn-home-cpu-summary-item span{font-size:14px;color:var(--home-text);font-weight:950;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-core-strip{grid-column:1/-1;margin-top:0;border-radius:18px;background:rgba(0,0,0,.12);border:1px solid rgba(255,255,255,.06);overflow:hidden;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-core-title{padding:10px 12px 8px;display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:12px;font-weight:900;color:rgba(255,255,255,.78);border-bottom:1px solid rgba(255,255,255,.055);}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-core-title span:last-child{font-size:10px;color:var(--home-muted-2);font-weight:850;white-space:nowrap;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-core-grid{display:flex;flex-wrap:nowrap;gap:8px;padding:10px 12px 12px;overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch;scrollbar-width:thin;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-core-grid::-webkit-scrollbar{height:5px;}#'+ HOME_DASHBOARD_ID + ' .kn-home-core-grid::-webkit-scrollbar-thumb{background:rgba(255,255,255,.18);border-radius:999px;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-core-chip{flex:1 1 0;min-width:0;display:grid;grid-template-columns:1fr;gap:7px;align-items:start;padding:9px 10px;border-radius:12px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.055);font-size:10px;color:rgba(255,255,255,.68);line-height:1.15;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-core-chip b{display:flex;align-items:center;justify-content:space-between;color:var(--home-text);font-size:11px;font-weight:950;letter-spacing:.02em;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-core-metric{display:grid;grid-template-columns:28px minmax(0,1fr) 42px;gap:6px;align-items:center;min-width:0;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-core-metric-label{font-size:9px;color:var(--home-muted-2);font-weight:850;white-space:nowrap;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-core-metric-value{font-size:9.5px;color:rgba(255,255,255,.82);font-weight:900;text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-core-mini-track{height:5px;border-radius:999px;background:rgba(255,255,255,.075);overflow:hidden;box-shadow:inset 0 1px 2px rgba(0,0,0,.22);}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-core-mini-fill{height:100%;width:0%;border-radius:inherit;background:linear-gradient(90deg,var(--home-blue),var(--home-good));}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-core-mini-fill.warn{background:linear-gradient(90deg,#f59e0b,var(--home-warn));}#'+ HOME_DASHBOARD_ID + ' .kn-home-core-mini-fill.bad{background:linear-gradient(90deg,var(--home-bad),#f97316);}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-details-wrap{border:1px solid rgba(255,255,255,.08);border-radius:22px;background:rgba(255,255,255,.032);overflow:hidden;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-details-wrap>summary{cursor:pointer;list-style:none;padding:14px 16px;font-size:13px;font-weight:950;color:rgba(255,255,255,.86);background:rgba(255,255,255,.035);display:flex;justify-content:space-between;gap:10px;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-details-wrap>summary::-webkit-details-marker{display:none;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-detail-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;padding:12px;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-detail{min-width:0;padding:12px;border-radius:18px;background:rgba(255,255,255,.028);border:1px solid rgba(255,255,255,.055);}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-detail-title{font-size:12px;font-weight:950;color:rgba(255,255,255,.80);margin-bottom:10px;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-detail-dl{display:grid;grid-template-columns:1fr;gap:7px;margin:0;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-detail-dl>div{display:grid;grid-template-columns:88px minmax(0,1fr);gap:8px;align-items:start;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-detail-dl dt{font-size:11px;color:var(--home-muted-2);font-weight:780;white-space:nowrap;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-detail-dl dd{margin:0;font-size:12px;color:rgba(255,255,255,.75);line-height:1.45;word-break:break-all;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-maint-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:0 12px 14px;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-maint-card{position:relative;overflow:hidden;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-maint-card:before{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 15% 20%,rgba(127,180,255,.10),transparent 34%),radial-gradient(circle at 88% 90%,rgba(57,210,121,.08),transparent 34%);opacity:.9;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-maint-actions{position:relative;z-index:1;display:grid;grid-template-rows:auto 1fr auto;gap:12px;width:100%;height:100%;min-height:0;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-maint-title{font-size:13px;font-weight:950;color:var(--home-text);display:flex;align-items:center;justify-content:space-between;gap:10px;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-maint-title-main{display:inline-flex;align-items:center;gap:8px;min-width:0;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-maint-title-main:before{content:"✦";width:20px;height:20px;border-radius:9px;display:inline-flex;align-items:center;justify-content:center;background:rgba(120,180,255,.12);border:1px solid rgba(120,180,255,.18);font-size:12px;color:#b9d7ff;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-maint-title span{font-size:10.5px;font-weight:800;color:var(--home-muted-2);white-space:nowrap;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-maint-body{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:0;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-maint-copy{min-width:0;display:flex;flex-direction:column;gap:6px;color:var(--home-muted);font-size:11px;line-height:1.45;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-maint-copy b{font-size:12px;color:rgba(255,255,255,.80);font-weight:920;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-maint-copy span{display:inline-flex;align-items:center;width:max-content;max-width:100%;height:22px;padding:0 9px;border-radius:999px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.07);color:rgba(255,255,255,.54);font-size:10px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-maint-card .kn-home-rocket-actions{flex:0 0 auto;display:flex;align-items:center;justify-content:flex-end;gap:8px;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-rocket-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-rocket-action{position:relative;overflow:hidden;height:34px;min-height:34px;padding:0 13px;border-radius:999px;border:1px solid rgba(120,180,255,.24);background:linear-gradient(180deg,rgba(78,146,255,.20),rgba(78,146,255,.095));color:rgba(235,244,255,.95);font-size:12px;font-weight:900;cursor:pointer;box-shadow:0 8px 18px rgba(30,90,200,.11),inset 0 1px 0 rgba(255,255,255,.10);transition:transform .16s ease,border-color .16s ease,background .16s ease,box-shadow .16s ease,opacity .16s ease;display:inline-flex;align-items:center;justify-content:center;gap:6px;white-space:nowrap;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-rocket-action:hover{transform:translateY(-1px);border-color:rgba(134,201,255,.40);background:linear-gradient(180deg,rgba(78,146,255,.26),rgba(78,146,255,.12));box-shadow:0 12px 24px rgba(30,90,200,.16),inset 0 1px 0 rgba(255,255,255,.13);}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-rocket-action:active{transform:translateY(0) scale(.985);}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-rocket-icon{display:inline-block;font-size:13px;line-height:1;filter:drop-shadow(0 0 6px rgba(135,206,250,.30));}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-rocket-action.launching{pointer-events:none;opacity:.86;box-shadow:0 0 0 3px rgba(120,180,255,.08),0 10px 24px rgba(30,90,200,.18),inset 0 1px 0 rgba(255,255,255,.14);}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-rocket-action.launching .kn-home-rocket-icon{animation:knRocketLaunch .72s cubic-bezier(.2,.8,.2,1) both;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-rocket-action.launching:after{content:"";position:absolute;left:17px;bottom:3px;width:8px;height:20px;border-radius:999px;background:linear-gradient(180deg,rgba(255,230,130,.0),rgba(255,190,70,.72),rgba(255,95,104,.0));animation:knRocketFlame .72s ease-in-out both;}' +
      '@keyframes knRocketLaunch{0%{transform:translate(0,0) rotate(0deg)}45%{transform:translate(4px,-7px) rotate(-14deg)}100%{transform:translate(0,0) rotate(0deg)}}' +
      '@keyframes knRocketFlame{0%{opacity:0;transform:translateY(9px) scaleY(.45)}35%{opacity:.95;transform:translateY(0) scaleY(1)}100%{opacity:0;transform:translateY(-12px) scaleY(.38)}}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-primary-action,#'+ HOME_DASHBOARD_ID + ' .kn-home-secondary-action{min-height:40px;padding:0 14px;border-radius:999px;font-size:12px;font-weight:900;cursor:pointer;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-primary-action{border:1px solid rgba(120,180,255,.30);background:linear-gradient(180deg,rgba(78,146,255,.34),rgba(78,146,255,.17));color:#fff;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-secondary-action{border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.055);color:rgba(255,255,255,.78);}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-warn{font-size:11px;line-height:1.6;color:var(--home-muted-2);}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-plugin-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:14px;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-phone-dock{padding:16px;border-radius:22px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.032);display:flex;align-items:center;justify-content:space-between;gap:14px;min-width:0;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-phone-block{display:flex;gap:13px;align-items:flex-start;min-width:0;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-phone-icon{width:52px;height:52px;flex:0 0 52px;border-radius:18px;display:flex;align-items:center;justify-content:center;font-size:24px;background:rgba(72,150,255,.13);border:1px solid rgba(120,180,255,.24);}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-plugin-status{margin-top:6px;font-size:11px;color:var(--home-muted-2);}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-plugin-status.ready{color:rgba(134,239,172,.88);}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-plugin-status.missing{color:rgba(247,201,72,.88);}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-action-row{display:flex;gap:10px;flex-wrap:wrap;align-items:center;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-exit-ip-stack{display:grid;gap:5px;margin-top:4px;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-exit-ip-row{display:grid;grid-template-columns:38px minmax(0,1fr);gap:7px;align-items:center;font-size:12px;line-height:1.25;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-exit-ip-row b{font-size:10px;color:var(--home-muted-2);font-weight:900;letter-spacing:.03em;}' +
      '#'+ HOME_DASHBOARD_ID + ' .kn-home-exit-ip-row span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--home-text);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-weight:850;}' +
      '.kn-phone-missing-modal{position:fixed;inset:0;z-index:1000001;display:flex;align-items:center;justify-content:center;padding:22px;background:rgba(0,0,0,.58);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);}.kn-phone-missing-card{width:min(440px,calc(100vw - 34px));border-radius:24px;border:1px solid rgba(255,255,255,.12);background:linear-gradient(180deg,rgba(28,32,42,.96),rgba(13,16,22,.96));box-shadow:0 32px 90px rgba(0,0,0,.56);padding:20px;color:#fff;}.kn-phone-missing-title{font-size:18px;font-weight:950;margin-bottom:8px}.kn-phone-missing-text{font-size:13px;line-height:1.7;color:rgba(255,255,255,.58);margin-bottom:16px}.kn-phone-missing-actions{display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap}.kn-phone-missing-actions button{min-height:38px;padding:0 14px;border-radius:999px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.07);color:#fff;font-weight:850;cursor:pointer}.kn-phone-missing-actions .primary{background:rgba(72,150,255,.28);border-color:rgba(120,180,255,.32);}' +
      '.kn-theme-light #'+ HOME_DASHBOARD_ID + '{--home-card-bg:rgba(255,255,255,.72);--home-card-bg-soft:rgba(255,255,255,.54);--home-card-border:rgba(34,50,80,.08);--home-text:#172033;--home-muted:rgba(23,32,51,.58);--home-muted-2:rgba(23,32,51,.42);}' +
      '.kn-theme-light #'+ HOME_DASHBOARD_ID + ' .kn-home-card,.kn-theme-light #'+ HOME_DASHBOARD_ID + ' .kn-home-dash-card,.kn-theme-light #'+ HOME_DASHBOARD_ID + ' .kn-home-phone-dock,.kn-theme-light #'+ HOME_DASHBOARD_ID + ' .kn-home-details-wrap{background:rgba(255,255,255,.58)!important;border-color:rgba(34,50,80,.08)!important;box-shadow:0 14px 36px rgba(34,50,80,.10),inset 0 1px 0 rgba(255,255,255,.58)!important;}' +
      '.kn-theme-light #'+ HOME_DASHBOARD_ID + ' .kn-home-stat,.kn-theme-light #'+ HOME_DASHBOARD_ID + ' .kn-home-kpi,.kn-theme-light #'+ HOME_DASHBOARD_ID + ' .kn-home-detail,.kn-theme-light #'+ HOME_DASHBOARD_ID + ' .kn-home-cpu-summary-item{background:rgba(255,255,255,.48)!important;border-color:rgba(34,50,80,.08)!important;}' +
      '.kn-theme-light #'+ HOME_DASHBOARD_ID + ' .kn-home-title,.kn-theme-light #'+ HOME_DASHBOARD_ID + ' .kn-home-stat-value,.kn-theme-light #'+ HOME_DASHBOARD_ID + ' .kn-home-kpi-value,.kn-theme-light #'+ HOME_DASHBOARD_ID + ' .kn-home-dash-title{color:#172033!important;}' +
      '@media(max-width:1180px){#'+ HOME_DASHBOARD_ID + '{width:min(100% - 28px,1120px);}#'+ HOME_DASHBOARD_ID + ' .kn-home-left-column,#'+ HOME_DASHBOARD_ID + ' .kn-home-network-card{grid-column:span 12;}#'+ HOME_DASHBOARD_ID + ' .kn-home-left-column{grid-template-rows:auto auto;}#'+ HOME_DASHBOARD_ID + ' .kn-home-maint-card{min-height:120px;}#'+ HOME_DASHBOARD_ID + ' .kn-home-network-card{grid-row:auto;}#'+ HOME_DASHBOARD_ID + ' .kn-home-resource-grid{grid-template-columns:1fr;}}' +
      '@media(max-width:760px){#'+ HOME_DASHBOARD_ID + '{width:calc(100% - 18px);margin-bottom:16px;}#'+ HOME_DASHBOARD_ID + ' .kn-home-card-head{flex-direction:column;}#'+ HOME_DASHBOARD_ID + ' .kn-home-refresh-controls{width:100%;justify-content:flex-start;}#'+ HOME_DASHBOARD_ID + ' .kn-home-refresh{flex:1;}#'+ HOME_DASHBOARD_ID + ' .kn-home-status-grid{grid-template-columns:repeat(2,minmax(0,1fr));}#'+ HOME_DASHBOARD_ID + ' .kn-home-progress-row,#'+ HOME_DASHBOARD_ID + ' .kn-home-resource-row{grid-template-columns:1fr;gap:6px;}#'+ HOME_DASHBOARD_ID + ' .kn-home-progress-value{text-align:left;}#'+ HOME_DASHBOARD_ID + ' .kn-home-kpi-grid{grid-template-columns:1fr;}#'+ HOME_DASHBOARD_ID + ' .kn-home-cpu-summary-grid{grid-template-columns:repeat(2,minmax(0,1fr));}#'+ HOME_DASHBOARD_ID + ' .kn-home-core-chip{min-width:118px;flex-basis:118px;}#'+ HOME_DASHBOARD_ID + ' .kn-home-detail-grid{grid-template-columns:1fr;}#'+ HOME_DASHBOARD_ID + ' .kn-home-signal-insights{grid-template-columns:1fr;}#'+ HOME_DASHBOARD_ID + ' .kn-home-plugin-grid{grid-template-columns:1fr;}#'+ HOME_DASHBOARD_ID + ' .kn-home-phone-dock{align-items:flex-start;flex-direction:column;}#'+ HOME_DASHBOARD_ID + ' .kn-home-maint-body{align-items:flex-start;}#'+ HOME_DASHBOARD_ID + ' .kn-home-maint-card .kn-home-rocket-actions{justify-content:flex-start;}}' +
      '@media(max-width:520px){#'+ HOME_DASHBOARD_ID + '{width:calc(100% - 12px);}#'+ HOME_DASHBOARD_ID + ' .kn-home-status-grid{grid-template-columns:1fr;}#'+ HOME_DASHBOARD_ID + ' .kn-home-title{font-size:18px;}#'+ HOME_DASHBOARD_ID + ' .kn-home-duplex{flex-direction:column;align-items:stretch;}#'+ HOME_DASHBOARD_ID + ' .kn-home-rx,#'+ HOME_DASHBOARD_ID + ' .kn-home-tx{font-size:20px;}#'+ HOME_DASHBOARD_ID + ' .kn-home-cpu-summary-grid{grid-template-columns:1fr;}#'+ HOME_DASHBOARD_ID + ' .kn-home-core-grid{padding-left:10px;padding-right:10px;}#'+ HOME_DASHBOARD_ID + ' .kn-home-core-chip{min-width:112px;flex-basis:112px;}#'+ HOME_DASHBOARD_ID + ' .kn-home-detail-dl>div{grid-template-columns:76px minmax(0,1fr);}#'+ HOME_DASHBOARD_ID + ' .kn-home-action-row{display:grid;grid-template-columns:1fr;width:100%;}#'+ HOME_DASHBOARD_ID + ' .kn-home-maint-body{flex-direction:column;}#'+ HOME_DASHBOARD_ID + ' .kn-home-maint-card .kn-home-rocket-actions{width:100%;justify-content:flex-start;}#'+ HOME_DASHBOARD_ID + ' .kn-home-rocket-action{flex:1 1 120px;}#'+ HOME_DASHBOARD_ID + ' .kn-home-primary-action,#'+ HOME_DASHBOARD_ID + ' .kn-home-secondary-action{width:100%;}}';
    document.head.appendChild(style);
  }

  function buildHomePage(container) {
    if (!container || document.getElementById(HOME_DASHBOARD_ID)) return;
    var home = document.createElement('section');
    home.id = HOME_DASHBOARD_ID;
    home.className = 'kn-home-dashboard';
    home.innerHTML = [
      '<div class="kn-home-hero">',
        '<div class="kn-home-card kn-home-device-card">',
          '<div class="kn-home-card-head">',
            '<div>',
              '<div class="kn-home-kicker">Home Dashboard</div>',
              '<div class="kn-home-title">设备状态概览</div>',
            '</div>',
            '<div class="kn-home-refresh-controls"><button type="button" class="kn-home-refresh" data-home-action="refresh">刷新状态</button><select class="kn-home-refresh-select" data-home-refresh-interval><option value="5000">5 秒</option><option value="10000">10 秒</option><option value="30000">30 秒</option><option value="60000">60 秒</option></select><button type="button" class="kn-home-refresh-toggle" data-home-auto-refresh>自动刷新：关</button><div class="kn-home-refresh-time" id="kn-home-refresh-time">未刷新</div></div>',
          '</div>',
          '<div class="kn-home-status-grid">',
            '<div class="kn-home-stat"><div class="kn-home-stat-label">运行状态</div><div id="kn-home-modem" class="kn-home-stat-value">--</div><div id="kn-home-uptime" class="kn-home-stat-sub">运行时长读取中</div></div>',
            '<div class="kn-home-stat"><div class="kn-home-stat-label">网络状态 / 信号</div><div id="kn-home-network" class="kn-home-stat-value">--</div><div id="kn-home-phone-line" class="kn-home-stat-sub kn-home-phone-line" title="点击复制手机号">手机号读取中</div><div id="kn-home-signal" class="kn-home-stat-sub">信号 --</div></div>',
            '<div class="kn-home-stat"><div class="kn-home-stat-label">内网 IP</div><div id="kn-home-ip" class="kn-home-stat-value">--</div><div id="kn-home-ip-sub" class="kn-home-stat-sub">设备管理 IPv4</div></div>',
            '<div class="kn-home-stat is-clickable" id="kn-home-exit-ip-card" title="点击复制设备出口 IP"><div class="kn-home-stat-label">设备出口 IP</div><div id="kn-home-exit-ip" class="kn-home-stat-value">设备端查询</div><div class="kn-home-exit-ip-stack"><div class="kn-home-exit-ip-row"><b>IPv4</b><span id="kn-home-exit-ip-v4">--</span></div><div class="kn-home-exit-ip-row"><b>IPv6</b><span id="kn-home-exit-ip-v6">--</span></div></div><div id="kn-home-exit-ip-sub" class="kn-home-stat-sub">设备端查询 IPv4 / IPv6</div></div>',
            '<div class="kn-home-stat"><div class="kn-home-stat-label">WiFi 接入</div><div id="kn-home-wifi" class="kn-home-stat-value">--</div><div id="kn-home-wifi-sub" class="kn-home-stat-sub">接入设备 --</div></div>',
          '</div>',
          '<div class="kn-home-dashboard-fusion">',
            '<div class="kn-home-left-column">',
            '<section class="kn-home-dash-card kn-home-signal-card">',
              '<div class="kn-home-dash-head"><div class="kn-home-dash-title">无线信号质量</div><div class="kn-home-dash-extra" id="kn-home-signal-label">实时解析</div></div>',
              '<div class="kn-home-progress-list">',
                '<div class="kn-home-progress-row"><div class="kn-home-progress-label"><strong>RSRP</strong><span>-125 弱 / -81 强</span></div><div class="kn-home-progress-track"><div class="kn-home-progress-fill" id="kn-home-bar-rsrp"></div></div><div class="kn-home-progress-value" id="kn-home-val-rsrp">--</div><div class="kn-home-signal-state empty" id="kn-home-state-rsrp">暂无</div></div>',
                '<div class="kn-home-progress-row"><div class="kn-home-progress-label"><strong>SINR</strong><span>-10 差 / 30 优</span></div><div class="kn-home-progress-track"><div class="kn-home-progress-fill" id="kn-home-bar-sinr"></div></div><div class="kn-home-progress-value" id="kn-home-val-sinr">--</div><div class="kn-home-signal-state empty" id="kn-home-state-sinr">暂无</div></div>',
                '<div class="kn-home-progress-row"><div class="kn-home-progress-label"><strong>RSRQ</strong><span>-20 差 / -3 优</span></div><div class="kn-home-progress-track"><div class="kn-home-progress-fill" id="kn-home-bar-rsrq"></div></div><div class="kn-home-progress-value" id="kn-home-val-rsrq">--</div><div class="kn-home-signal-state empty" id="kn-home-state-rsrq">暂无</div></div>',
              '</div>',
              '<div class="kn-home-signal-insights">',
                '<div><b>综合</b><span id="kn-home-signal-overall">--</span></div>',
                '<div><b>射频</b><span id="kn-home-signal-radio">--</span></div>',
                '<div><b>建议</b><span id="kn-home-signal-advice">等待数据</span></div>',
              '</div>',
            '</section>',
            '<section class="kn-home-dash-card kn-home-maint-card">',
              '<div class="kn-home-maint-actions"><div class="kn-home-maint-title"><div class="kn-home-maint-title-main">设备维护</div><span>轻量操作</span></div><div class="kn-home-maint-body"><div class="kn-home-maint-copy"><b>快速整理设备状态</b><span>清理缓存 / 降低瞬时负载，不中断网络</span></div><div class="kn-home-rocket-actions"><button type="button" class="kn-home-rocket-action" data-home-action="cleanMem"><span class="kn-home-rocket-icon">🚀</span><span class="kn-home-rocket-label">清理内存</span></button><button type="button" class="kn-home-rocket-action" data-home-action="coolDown"><span class="kn-home-rocket-icon">🚀</span><span class="kn-home-rocket-label">临时降温</span></button></div></div></div>',
            '</section>',
            '</div>',
            '<section class="kn-home-dash-card kn-home-network-card">',
              '<div class="kn-home-dash-head"><div class="kn-home-dash-title">实时网络</div><div class="kn-home-dash-extra" id="kn-home-throughput-label">RX / TX</div></div>',
              '<div class="kn-home-kpi-grid">',
                '<div class="kn-home-kpi hero"><div class="kn-home-kpi-label">实时下行 / 上行</div><div class="kn-home-duplex"><div class="kn-home-duplex-block"><div class="kn-home-duplex-label">下载 RX</div><span class="kn-home-rx" id="kn-home-kpi-rx">--</span></div><div class="kn-home-duplex-block"><div class="kn-home-duplex-label">上传 TX</div><span class="kn-home-tx" id="kn-home-kpi-tx">--</span></div></div></div>',
                '<div class="kn-home-kpi"><div class="kn-home-kpi-label">当日流量</div><div class="kn-home-kpi-value" id="kn-home-kpi-daily">--</div></div>',
                '<div class="kn-home-kpi"><div class="kn-home-kpi-label">本月已用</div><div class="kn-home-kpi-value" id="kn-home-kpi-month">--</div></div>',
                '<div class="kn-home-kpi"><div class="kn-home-kpi-label">已用总流量</div><div class="kn-home-kpi-value" id="kn-home-kpi-total">--</div></div>',
                '<div class="kn-home-kpi"><div class="kn-home-kpi-label">QoS / QCI</div><div class="kn-home-kpi-value small" id="kn-home-kpi-qci">--</div></div>',
                '<div class="kn-home-kpi"><div class="kn-home-kpi-label">连接状态</div><div class="kn-home-kpi-value small" id="kn-home-net-context">--</div></div>',
              '</div>',
            '</section>',
            '<section class="kn-home-dash-card kn-home-resource-card">',
              '<div class="kn-home-dash-head"><div class="kn-home-dash-title">系统资源</div><div class="kn-home-dash-extra" id="kn-home-temp-mem-label">--</div></div>',
              '<div class="kn-home-resource-grid">',
                '<div class="kn-home-progress-list kn-home-resource-main">',
                  '<div class="kn-home-resource-row"><div class="kn-home-progress-label"><strong>内存使用</strong><span>RAM 物理内存</span></div><div class="kn-home-progress-track"><div class="kn-home-progress-fill" id="kn-home-bar-mem"></div></div><div class="kn-home-progress-value" id="kn-home-val-mem">--</div></div>',
                  '<div class="kn-home-resource-row"><div class="kn-home-progress-label"><strong>SWAP</strong><span>交换分区</span></div><div class="kn-home-progress-track"><div class="kn-home-progress-fill" id="kn-home-bar-swap"></div></div><div class="kn-home-progress-value" id="kn-home-val-swap">--</div></div>',
                  '<div class="kn-home-resource-row"><div class="kn-home-progress-label"><strong>内部存储</strong><span>机身空间</span></div><div class="kn-home-progress-track"><div class="kn-home-progress-fill" id="kn-home-bar-storage"></div></div><div class="kn-home-progress-value" id="kn-home-val-storage">--</div></div>',
                  '<div class="kn-home-resource-row"><div class="kn-home-progress-label"><strong>SD 卡</strong><span>外置存储</span></div><div class="kn-home-progress-track"><div class="kn-home-progress-fill" id="kn-home-bar-sd"></div></div><div class="kn-home-progress-value" id="kn-home-val-sd">--</div></div>',
                '</div>',
                '<div class="kn-home-resource-side">',
                  '<div class="kn-home-cpu-summary-grid">',
                    '<div class="kn-home-cpu-summary-item"><b>平均占用</b><span id="kn-home-cpu-avg">--</span></div>',
                    '<div class="kn-home-cpu-summary-item"><b>活跃核心</b><span id="kn-home-cpu-active">--</span></div>',
                    '<div class="kn-home-cpu-summary-item"><b>最高温度</b><span id="kn-home-cpu-max-temp">--</span></div>',
                    '<div class="kn-home-cpu-summary-item"><b>最高频率</b><span id="kn-home-cpu-max-freq">--</span></div>',
                  '</div>',
                '</div>',
                '<div class="kn-home-core-strip"><div class="kn-home-core-title"><span>CPU 核心明细</span><span>占用 / 频率 / 温度</span></div><div id="kn-home-cpu-cores" class="kn-home-core-grid"><div class="kn-home-core-chip"><b>CPU</b><div class="kn-home-core-metric"><span class="kn-home-core-metric-label">占用</span><div class="kn-home-core-mini-track"><div class="kn-home-core-mini-fill" style="width:0%"></div></div><span class="kn-home-core-metric-value">--</span></div><div class="kn-home-core-metric"><span class="kn-home-core-metric-label">频率</span><div class="kn-home-core-mini-track"><div class="kn-home-core-mini-fill" style="width:0%"></div></div><span class="kn-home-core-metric-value">--</span></div><div class="kn-home-core-metric"><span class="kn-home-core-metric-label">温度</span><div class="kn-home-core-mini-track"><div class="kn-home-core-mini-fill" style="width:0%"></div></div><span class="kn-home-core-metric-value">--</span></div></div></div></div>',
              '</div>',
            '</section>',
          '</div>',
        '</div>',
      '</div>',
      '<details class="kn-home-details-wrap">',
        '<summary><span>设备详情 / 网络地址 / 射频参数</span><span>展开查看 IMEI、ICCID、NR/LTE 等低频信息</span></summary>',
        '<div class="kn-home-detail-grid">',
          '<div class="kn-home-detail"><div class="kn-home-detail-title">SIM 与号码</div><div id="kn-home-detail-sim"></div></div>',
          '<div class="kn-home-detail"><div class="kn-home-detail-title">设备标识</div><div id="kn-home-detail-device"></div></div>',
          '<div class="kn-home-detail"><div class="kn-home-detail-title">网络地址</div><div id="kn-home-detail-ip"></div></div>',
          '<div class="kn-home-detail"><div class="kn-home-detail-title">版本与射频</div><div id="kn-home-detail-radio"></div></div>',
        '</div>',
      '</details>',
      '<div class="kn-home-plugin-grid">',
        '<div class="kn-home-phone-dock">',
          '<div class="kn-home-phone-block"><div class="kn-home-phone-icon">☎</div><div><div class="kn-home-kicker">Communication Plugin</div><div class="kn-home-title">电话与短信</div><div class="kn-home-subtitle">打开电话、短信与消息转发入口。</div></div></div>',
          '<div class="kn-home-action-row"><button type="button" class="kn-home-primary-action" data-home-action="phoneSms">打开通信面板</button><button type="button" class="kn-home-secondary-action" data-home-action="settingsForward">消息转发</button></div>',
        '</div>',
        '<div class="kn-home-phone-dock kn-home-operator-dock">',
          '<div class="kn-home-phone-block"><div class="kn-home-phone-icon">🛰️</div><div><div class="kn-home-kicker">Operator Plugin</div><div class="kn-home-title">运营商信息</div><div class="kn-home-subtitle">查询官方套餐、余额、剩余流量与到期信息。</div><div id="kn-home-operator-plugin-status" class="kn-home-plugin-status">正在检测插件</div></div></div>',
          '<div class="kn-home-action-row"><button type="button" class="kn-home-primary-action" data-home-action="operatorInfo">运营商查询</button><button type="button" class="kn-home-secondary-action kn-home-operator-github" data-home-action="operatorGithub">打开 GitHub</button></div>',
        '</div>',
      '</div>'
    ].join('');
    var header = document.getElementById(HEADER_ID);
    if (header && header.parentNode === container) {
      if (header.nextSibling) container.insertBefore(home, header.nextSibling);
      else container.appendChild(home);
    } else {
      container.insertBefore(home, container.firstChild || null);
    }
    bindHomeDashboardControls(home);
    var phoneBtn = home.querySelector('[data-home-action="phoneSms"]');
    if (phoneBtn) phoneBtn.onclick = openExternalPhoneSmsOrPrompt;
    var forwardBtn = home.querySelector('[data-home-action="settingsForward"]');
    if (forwardBtn) forwardBtn.onclick = function () { openSettingsDialog(); setTimeout(function () { switchSettingsTab('forward'); }, 80); };
    var operatorBtn = home.querySelector('[data-home-action="operatorInfo"]');
    if (operatorBtn) operatorBtn.onclick = openExternalOperatorInfoOrPrompt;
    var operatorGithubBtn = home.querySelector('[data-home-action="operatorGithub"]');
    if (operatorGithubBtn) operatorGithubBtn.onclick = openOperatorInfoGithub;
    updateHomeOperatorPluginCard();
    setTimeout(updateHomeOperatorPluginCard, 800);
    var exitIpCard = home.querySelector('#kn-home-exit-ip-card');
    if (exitIpCard) exitIpCard.onclick = copyHomeExitIp;
    refreshHomeExitIp(false);
    var cleanBtn = home.querySelector('[data-home-action="cleanMem"]');
    if (cleanBtn) cleanBtn.onclick = function () { triggerHomeRocketAction(cleanBtn, 'clean'); };
    var coolBtn = home.querySelector('[data-home-action="coolDown"]');
    if (coolBtn) coolBtn.onclick = function () { triggerHomeRocketAction(coolBtn, 'cool'); };
  }

  function isWeakHomeDisplayValue(value) {
    var text = clean(value);
    if (!text || text === '--') return true;
    var stripped = text
      .replace(/运行时长|号码|接入设备|累计|实时|负载|可用|已用|总量|WAN\s*\/\s*LAN|CPU\s*\/\s*电池\s*\/\s*芯片|RSRP\s*\/\s*RSRQ\s*\/\s*SINR|固件\s*\/\s*WebUI|等待数据|暂无数据|未返回/gi, '')
      .replace(/[\s·|｜/：:，,;；-]/g, '');
    return !stripped || stripped === '--';
  }

  function keepHomePreviousIfNewWeak(el, value) {
    if (!el) return false;
    var oldText = clean(el.textContent || '');
    return isWeakHomeDisplayValue(value) && oldText && !isWeakHomeDisplayValue(oldText);
  }

  function setHomeText(selector, value) {
    var el = document.querySelector(selector);
    if (!el) return;
    if (keepHomePreviousIfNewWeak(el, value)) return;
    el.textContent = value == null || value === '' ? '--' : String(value);
  }

  function setHomeTitle(selector, value) {
    var el = document.querySelector(selector);
    if (!el) return;
    if (keepHomePreviousIfNewWeak(el, value)) return;
    var text = value == null || value === '' ? '--' : String(value);
    el.textContent = text;
    el.title = text;
  }
  function setHomeRows(selector, rows) {
    var box = document.querySelector(selector);
    if (!box) return;
    var html = (rows || []).map(function (row) {
      var label = row && row[0] != null ? String(row[0]) : '';
      var value = row && row[1] != null && String(row[1]) !== '' ? String(row[1]) : '--';
      value = sanitizeHomeDisplayValue(value, label);
      return '<div><dt>' + knEsc(label) + '</dt><dd title="' + knEsc(value) + '">' + knEsc(value) + '</dd></div>';
    }).join('');
    box.innerHTML = '<dl class="kn-home-detail-dl">' + (html || '<div><dt>状态</dt><dd>--</dd></div>') + '</dl>';
  }

  function cutHomeCompositeValue(value, currentLabel) {
    var v = clean(value);
    if (!v) return '';
    var labels = [
      '运行状态','运行时长','网络','信号','SIM','号码','手机号','IP 地址','IP地址','IPv6','本地网关','网关','MAC','DNS','连接',
      'CPU 占用','CPU占用','负载','内存占用','内存使用','设备温度','温度','存储占用','内部存储','SD卡','WiFi 接入','数据流量',
      'RSRP','RSRQ','SINR','RSSI','频段','频点','PCI','小区','设备型号','型号','版本','软件版本','WebUI版本','硬件版本','IMEI','IMSI','ICCID'
    ];
    var cur = String(currentLabel || '').replace(/\s+/g, '');
    var best = v.length;
    labels.forEach(function (label) {
      var plain = String(label).replace(/\s+/g, '');
      if (!plain || plain === cur) return;
      var re = new RegExp('(?:^|\s|[|｜/])' + homeEscReg(label).replace(/\\s\+/g, '\s*') + '\s*[:：]?', 'i');
      var m = v.match(re);
      if (m && m.index > 0 && m.index < best) best = m.index;
    });
    if (best < v.length) v = clean(v.slice(0, best));
    return v.replace(/[|｜/，,;；：:]+$/g, '').trim();
  }

  function sanitizeHomeDisplayValue(value, label) {
    var v = cutHomeCompositeValue(value, label);
    if (!v || v === '--') return '--';
    // 防止把当前插件源码、脚本片段、整页长文本误当成设备字段显示。
    if (/(querySelector|document\.|function\s*\(|var\s+|const\s+|let\s+|return\s+|=>|\{\s*|\}\s*|innerHTML|textContent|className|addEventListener)/i.test(v)) return '--';
    if (v.length > 120) return v.slice(0, 116) + '…';
    return v;
  }

  function getHomeSourceRootClone() {
    if (!document.body) return null;
    var root = document.body.cloneNode(true);
    [
      'script','style','noscript','svg','canvas',
      '#' + HOME_DASHBOARD_ID,
      '#' + DIALOG_ID,
      '#kn-os-dialog',
      '#kn-phone-sms-modal',
      '#kn-phone-sms-missing',
      '#kn-toolbox-wrapper',
      '#kn-toolbox-drawer',
      '#kn-toolbox-settings',
      '#' + HEADER_ID
    ].forEach(function (sel) {
      try {
        Array.prototype.slice.call(root.querySelectorAll(sel)).forEach(function (el) { el.remove(); });
      } catch (e) {}
    });
    return root;
  }

  function getHomeSourceText() {
    var root = getHomeSourceRootClone();
    if (!root) return '';
    var blockTags = { DIV:1, P:1, SECTION:1, ARTICLE:1, HEADER:1, FOOTER:1, MAIN:1, LI:1, TR:1, TD:1, TH:1, LABEL:1, BUTTON:1, SELECT:1, OPTION:1, H1:1, H2:1, H3:1, H4:1, H5:1, H6:1, BR:1 };
    var out = [];
    function walk(node) {
      if (!node) return;
      if (node.nodeType === 3) {
        var t = clean(node.nodeValue);
        if (t) out.push(t);
        return;
      }
      if (node.nodeType !== 1) return;
      var tag = node.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') return;
      if (blockTags[tag]) out.push('\n');
      Array.prototype.slice.call(node.childNodes || []).forEach(walk);
      if (blockTags[tag]) out.push('\n');
    }
    walk(root);
    return out.join(' ').replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').replace(/\n{2,}/g, '\n').trim();
  }

  function getHomeBasicStatusText() {
    var text = getHomeSourceText();
    if (!text) return '';
    var start = text.search(/基本状态|基础状态|状态信息/i);
    if (start < 0) return '';
    var part = text.slice(start);
    var stop = part.search(/\n(?:设备监控|功能列表|锁定频段|锁定基站|TTYD|扩展工具箱|无线信号|实时网络|系统资源|电话与短信|首页|网络状态|设备详情)\b/i);
    if (stop > 40) part = part.slice(0, stop);
    return part.slice(0, 2400);
  }

  function pickHomeConnectionDurationFromBasicStatus() {
    var text = getHomeBasicStatusText();
    if (!text) return '';
    var unitPattern = '(-?\\d+(?:\\.\\d+)?\\s*(?:天|日|小时|分钟|分|秒|days?|hours?|hrs?|minutes?|mins?|seconds?|secs?|[dhms])\\b|\\d{1,4}:\\d{1,2}(?::\\d{1,2})?)';
    var labels = ['连接时长','连接时间','联网时长','在线时长','已连接时长'];
    for (var i = 0; i < labels.length; i += 1) {
      var re = new RegExp(homeEscReg(labels[i]) + '\\s*[:：]?\\s*' + unitPattern, 'i');
      var m = text.match(re);
      if (m && m[1]) return normalizeHomeConnectionDuration(m[1]);
    }
    return '';
  }

  function homeEscReg(x) { return String(x || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  function pickHomeValueFromText(labels, opts) {
    opts = opts || {};
    var text = getHomeSourceText();
    if (!text) return '';
    var maxLen = opts.maxLen || 90;
    var valuePattern = opts.valuePattern || '[^\\n\\r]{1,' + maxLen + '}';
    for (var i = 0; i < labels.length; i += 1) {
      var label = homeEscReg(labels[i]);
      var reg = new RegExp('(?:^|[\\n\\r\\s])' + label + '\\s*[:：]\\s*(' + valuePattern + ')', 'i');
      var m = text.match(reg);
      if (m) {
        var val = clean(m[1]).replace(/^[：:]/, '').trim();
        val = sanitizeHomeDisplayValue(val, labels[i]);
        if (val && val !== '--') return val;
      }
    }
    var lines = text.split(/\r?\n/).map(function (x) { return clean(x); }).filter(Boolean);
    for (var j = 0; j < labels.length; j += 1) {
      var target = String(labels[j] || '').replace(/\s+/g, '');
      for (var k = 0; k < lines.length - 1; k += 1) {
        var line = lines[k].replace(/\s+/g, '').replace(/[：:]+$/, '');
        if (line === target || (line.indexOf(target) !== -1 && line.length <= target.length + 10)) {
          var val2 = sanitizeHomeDisplayValue(lines[k + 1], labels[j]);
          if (val2 && val2 !== '--' && val2.replace(/\s+/g, '') !== target) return val2;
        }
      }
    }
    return '';
  }

  function extractFirstRegexFromHomeText(regex) {
    var text = getHomeSourceText();
    if (!text) return '';
    var m = text.match(regex);
    return m ? clean(m[1] || m[0]) : '';
  }

  function normalizeRadioMetricValue(value, metric) {
    var raw = clean(value);
    if (!raw || raw === '--') return '';
    if (/(querySelector|document\.|function\s*\(|var\s+|const\s+|return\s+|=>|\{|\})/i.test(raw)) return '';
    var upperMetric = String(metric || '').toUpperCase();
    var m;
    if (upperMetric === 'BAND') {
      m = raw.match(/\b(NR\s*)?N?\d{1,4}\b|\bB\d{1,4}\b/i);
      return m ? m[0].replace(/\s+/g, '') : raw.slice(0, 24);
    }
    if (upperMetric === 'PCI' || upperMetric === 'CELL' || upperMetric === 'TAC' || upperMetric === 'EARFCN') {
      m = raw.match(/-?\d{1,12}/);
      return m ? m[0] : '';
    }
    m = raw.match(/-?\d+(?:\.\d+)?\s*(?:dBm|dB)?/i);
    if (!m) return '';
    var v = m[0].replace(/\s+/g, '');
    if (/^-?\d+(?:\.\d+)?$/.test(v)) {
      if (upperMetric === 'RSRP' || upperMetric === 'RSSI') v += ' dBm';
      else if (upperMetric === 'RSRQ' || upperMetric === 'SINR' || upperMetric === 'SNR') v += ' dB';
    }
    return v;
  }

  function extractRadioFromDom(labels, metric) {
    var metricName = String(metric || labels[0] || '').toUpperCase();
    var valuePattern = metricName === 'BAND' ? '((?:NR\\s*)?N?\\d{1,4}|B\\d{1,4})' : '(-?\\d+(?:\\.\\d+)?\\s*(?:dBm|dB)?)';
    for (var i = 0; i < labels.length; i += 1) {
      var label = homeEscReg(labels[i]);
      var val = extractFirstRegexFromHomeText(new RegExp(label + '\\s*[:：]?\\s*' + valuePattern, 'i'));
      val = normalizeRadioMetricValue(val, metricName);
      if (val) return val;
    }
    return '';
  }

  function isMacAddress(v) { return /^([0-9a-f]{2}:){5}[0-9a-f]{2}$/i.test(clean(v)); }
  function extractIpValues(v) {
    var raw = clean(v);
    var out = [];
    if (!raw) return out;
    var ipv4 = raw.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g) || [];
    ipv4.forEach(function (x) { if (out.indexOf(x) === -1) out.push(x); });
    var ipv6 = raw.match(/\b(?:[0-9a-f]{1,4}:){2,}[0-9a-f:]*\b/ig) || [];
    ipv6.forEach(function (x) { x = x.replace(/[;,，。]+$/, ''); if (!isMacAddress(x) && out.indexOf(x) === -1) out.push(x); });
    return out;
  }

  function extractHomeIPv4Values(v) {
    var raw = clean(v);
    if (!raw) return [];
    var out = [];
    (raw.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g) || []).forEach(function (x) {
      var parts = x.split('.').map(Number);
      if (parts.length === 4 && parts.every(function (p) { return p >= 0 && p <= 255; }) && out.indexOf(x) === -1) out.push(x);
    });
    return out;
  }

  function isHomePrivateIPv4(ip) {
    var parts = String(ip || '').split('.').map(Number);
    if (parts.length !== 4 || !parts.every(function (p) { return isFinite(p) && p >= 0 && p <= 255; })) return false;
    var a = parts[0], b = parts[1];
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a === 169 && b === 254) return true;
    return false;
  }

  function isLikelyHomeManagementIPv4(ip) {
    var parts = String(ip || '').split('.').map(Number);
    if (parts.length !== 4 || !parts.every(function (p) { return isFinite(p) && p >= 0 && p <= 255; })) return false;
    // 常见管理口 / 网关地址：x.x.x.1、x.x.x.254。
    return parts[3] === 1 || parts[3] === 254;
  }

  function isLikelyHomeTunnelIPv4(ip) {
    var parts = String(ip || '').split('.').map(Number);
    if (parts.length !== 4 || !parts.every(function (p) { return isFinite(p) && p >= 0 && p <= 255; })) return false;
    var a = parts[0], b = parts[1];
    // Tailscale/ZeroTier/VPN/overlay 常见地址段：10/8、100.64/10、172.16/12。
    // 192.168/16 容易混入当前接入终端地址，除非它是 .1/.254 管理口，否则不作为隧道地址保留。
    if (a === 10) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    return false;
  }

  function filterHomeManagementIPv4Values(list) {
    var raw = [];
    (Array.isArray(list) ? list : []).forEach(function (ip) {
      if (!ip || ip === '0.0.0.0' || ip === '255.255.255.255' || /^127\./.test(ip)) return;
      if (!isHomePrivateIPv4(ip)) return;
      if (raw.indexOf(ip) === -1) raw.push(ip);
    });
    if (!raw.length) return [];

    var keep = [];
    raw.forEach(function (ip) {
      if (isLikelyHomeTunnelIPv4(ip) || isLikelyHomeManagementIPv4(ip)) {
        if (keep.indexOf(ip) === -1) keep.push(ip);
      }
    });

    // 如果同一段“本机 IP”里同时出现 192.168.100.1 与 192.168.100.101，
    // 只保留 .1 这类设备管理口；但保留 10.x / 100.64.x / 172.16.x 这类设备隧道地址。
    return keep;
  }

  function collectHomeLanIPv4Values(data, domInfo) {
    // 展示设备自己的内网地址：管理口 + Tailscale/ZeroTier/VPN 等隧道地址。
    // 排除当前接入终端/客户端地址，例如 192.168.100.101。
    var out = [];
    function add(v) {
      extractHomeIPv4Values(v).forEach(function (ip) {
        if (out.indexOf(ip) === -1) out.push(ip);
      });
    }

    // 设备侧接口 / 管理口 / AP / 网桥地址。明确排除 client_ip、station_ip_addr、dhcp_ip_addr、local_ip_addr。
    var strictDeviceKeys = [
      'lan_ipaddr','lan_ip','lan_addr','lan_address','lan_gateway','lan_gateway_ip',
      'ap_ipaddr','ap_ip','ap_addr','ap_address','wifi_ap_ip','wlan_ap_ip',
      'br0_ipaddr','br_lan_ipaddr','bridge_ipaddr','bridge_ip','gateway','default_gateway',
      'router_ip','router_ipaddr','device_ip','device_ipaddr','manage_ip','management_ip'
    ];
    strictDeviceKeys.forEach(function (k) { add(data && data[k]); });

    // “本机 IP”里可能包含：IPv6、Tailscale/VPN、设备管理口、当前客户端 IP。
    // 这里读取后再通过 filterHomeManagementIPv4Values 保留隧道地址和管理口，排除客户端地址。
    if (domInfo) { add(domInfo.lanIp); add(domInfo.gateway); }
    add(pickHomeValueFromText([
      'LAN IP','LAN地址','LAN 地址','局域网IP','局域网 IP','管理IP','管理 IP',
      '网关IP','网关 IP','默认网关','设备管理IP','设备管理 IP','路由器IP','路由器 IP',
      'AP IP','WiFi AP IP','WLAN AP IP','br-lan','br0'
    ], { maxLen: 160 }));

    if (!out.length) {
      add(firstClean(data || {}, ['ipv4_gateway','gateway_ip','gateway','default_gateway']));
      add(pickHomeMetricFromDom(['网关','默认网关','Gateway']));
    }
    return filterHomeManagementIPv4Values(out);
  }

  function extractHomeIPv6Values(v) {
    var raw = clean(v);
    if (!raw) return [];
    var out = [];
    (raw.match(/\b(?:[0-9a-f]{1,4}:){2,}[0-9a-f:]*\b/ig) || []).forEach(function (x) {
      x = x.replace(/[;,，。]+$/, '');
      if (!isMacAddress(x) && x.indexOf('.') === -1 && out.indexOf(x) === -1) out.push(x);
    });
    return out;
  }

  function extractHomeMacValue(v) {
    var m = clean(v).match(/\b(?:[0-9a-f]{2}:){5}[0-9a-f]{2}\b/i);
    return m ? m[0] : '';
  }

  function firstHomePercent(value) {
    var raw = cutHomeCompositeValue(value, '');
    var m = raw.match(/-?\d+(?:\.\d+)?\s*%/);
    if (m) return m[0].replace(/\s+/g, '');
    if (/^-?\d+(?:\.\d+)?$/.test(raw)) return Math.round(Number(raw) * 10) / 10 + '%';
    return '';
  }

  function pickHomePercentFromText(labels) {
    var text = getHomeSourceText();
    if (!text) return '';
    for (var i = 0; i < (labels || []).length; i += 1) {
      var label = homeEscReg(labels[i]);
      var m = text.match(new RegExp(label + '\\s*[:：]?\\s*(-?\\d+(?:\\.\\d+)?)\\s*%', 'i'));
      if (m) return (Math.round(Number(m[1]) * 10) / 10) + '%';
    }
    return '';
  }

  function pickHomeTemperatureFromText(labels) {
    var text = getHomeSourceText();
    if (!text) return '';
    for (var i = 0; i < (labels || []).length; i += 1) {
      var label = homeEscReg(labels[i]);
      var m = text.match(new RegExp(label + '\\s*[:：]?\\s*(-?\\d+(?:\\.\\d+)?)\\s*(?:℃|°C|度)?', 'i'));
      if (m) return formatTemperature(m[1]);
    }
    return '';
  }

  function parseHomeStorageFromText() {
    var text = getHomeSourceText();
    var out = {};
    if (!text) return out;
    var internal = text.match(/内部存储\s*[:：]\s*([0-9.]+\s*(?:KB|MB|GB|TB))\s*已用\s*[\/／]\s*([0-9.]+\s*(?:KB|MB|GB|TB))\s*总容量/i);
    if (internal) { out.internalUsed = clean(internal[1]); out.internalTotal = clean(internal[2]); }
    var sd = text.match(/SD\s*卡\s*[:：]\s*([0-9.]+\s*(?:KB|MB|GB|TB))\s*已用\s*[\/／]\s*([0-9.]+\s*(?:KB|MB|GB|TB))\s*总容量/i);
    if (sd) { out.sdUsed = clean(sd[1]); out.sdTotal = clean(sd[2]); }
    return out;
  }
  function joinHomeValues(values, sep) {
    var out = [];
    (values || []).forEach(function (v) { v = clean(v); if (v && v !== '--' && out.indexOf(v) === -1) out.push(v); });
    return out.join(sep || ' · ');
  }
  function pickHomeDomAny(labels) { return pickHomeMetricFromDom(labels || []); }
  function normalizeHomeState(value) {
    var raw = clean(value);
    var low = raw.toLowerCase();
    if (!raw) return '';
    if (low === 'modem_init_complete') return '模组就绪';
    if (low.indexOf('connected') !== -1) return '已联网';
    if (low.indexOf('disconnect') !== -1) return '未联网';
    if (low.indexOf('init') !== -1) return '初始化中';
    return raw;
  }
  function normalizeSimState(value) {
    var raw = clean(value);
    var low = raw.toLowerCase();
    if (!raw) return '';
    if (raw === '1' || low === 'ready' || low === 'normal' || low === 'sim_ready') return 'SIM 正常';
    if (raw === '0' || low.indexOf('nosim') !== -1 || low.indexOf('no_sim') !== -1 || low.indexOf('absent') !== -1) return '未检测到 SIM';
    if (low.indexOf('pin') !== -1) return 'SIM PIN 锁定';
    if (low.indexOf('puk') !== -1) return 'SIM PUK 锁定';
    return raw;
  }
  function collectHomeIps(data, domInfo) {
    var ips = [];
    function add(v) {
      extractIpValues(v).forEach(function (x) {
        if (x && ips.indexOf(x) === -1) ips.push(x);
      });
    }
    // 只收集真正的终端/WAN/LAN/PDP 地址；DNS 与网关单独显示，避免把网络地址卡片塞乱。
    ['ipv4_wan_ipaddr','ipv6_wan_ipaddr','wan_ipaddr','wan_ipaddr6','ipv4_ip_addr','ipv6_ip_addr','pdp_addr','ipv4_pdp_addr','ipv6_pdp_addr','local_ip_addr','lan_ipaddr','station_ip_addr','dhcp_ip_addr','ip_addr','client_ip'].forEach(function (k) { add(data && data[k]); });
    if (domInfo) { add(domInfo.clientIp); add(domInfo.ipv6); add(domInfo.ip); }
    if (!ips.length) {
      add(pickHomeValueFromText(['客户端IP','客户端 IP','本机IP','本机 IP','WAN IP','IPv4','IPv6','IP地址','IP 地址','LAN IP'], { maxLen: 120 }));
    }
    return ips;
  }
  function pickHomeFromDataOrDom(data, keys, labels) {
    return firstClean(data || {}, keys || []) || pickHomeDomAny(labels || []);
  }
  function firstClean(obj, keys) { for (var i = 0; i < keys.length; i += 1) { var v = obj ? obj[keys[i]] : ''; if (clean(v)) return clean(v); } return ''; }
  function parsePercentValue(value) { var v = clean(value); if (!v) return ''; if (v.indexOf('%') !== -1) { var n1 = Number(String(v).replace(/[^0-9.\-]/g, '')); return isFinite(n1) ? Math.round(n1) + '%' : v; } if (/^-?\d+(\.\d+)?$/.test(v)) { var n2 = Number(v); return isFinite(n2) ? Math.round(n2) + '%' : v; } return v; }
  function formatBytesSmart(value, options) {
    options = options || {};
    var rate = !!options.rate;
    var raw = clean(value);
    if (!raw) return '';
    if (/^--$/.test(raw)) return '';
    if (/\d\s*(B|KB|MB|GB|TB|KiB|MiB|GiB|TiB)\s*(\/\s*s|\/s|ps|\/秒)?$/i.test(raw)) {
      var normalized = raw.replace(/KiB/ig, 'KB').replace(/MiB/ig, 'MB').replace(/GiB/ig, 'GB').replace(/TiB/ig, 'TB').replace(/\s+/g, ' ').trim();
      normalized = normalized.replace(/\s*(\/\s*s|\/s|ps|\/秒)$/i, '');
      return normalized + (rate ? '/s' : '');
    }
    var n = Number(String(raw).replace(/[^0-9.\-]/g, ''));
    if (!isFinite(n) || n < 0) return '';
    var units = ['B','KB','MB','GB','TB'];
    var i = 0;
    while (n >= 1024 && i < units.length - 1) { n = n / 1024; i += 1; }
    var decimals = i === 0 ? 0 : (i === 1 ? 1 : 2);
    var text = n.toFixed(decimals).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
    return text + ' ' + units[i] + (rate ? '/s' : '');
  }

  function formatBytes(value) {
    return formatBytesSmart(value, { rate: false });
  }

  function normalizeCapacity(value) {
    var raw = clean(value);
    if (!raw || raw === '--') return '';
    if (/\d\s*(B|KB|MB|GB|TB|KiB|MiB|GiB|TiB)/i.test(raw)) return raw;
    return formatBytes(raw) || raw;
  }
  function formatSeconds(value) {
    var raw = clean(value);
    if (!raw || raw === '--') return '';
    if (/[天日小时分钟秒]|\b(day|days|hour|hours|minute|minutes|min|sec|seconds)\b/i.test(raw) && /\d/.test(raw)) return raw;
    var colon = raw.match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?$/);
    if (colon) {
      var hh = Number(colon[1]), mm = Number(colon[2]), ss = Number(colon[3] || 0);
      var total = hh * 3600 + mm * 60 + ss;
      return formatSeconds(total);
    }
    var n = Number(String(raw).replace(/[^0-9.]/g, ''));
    if (!isFinite(n) || n <= 0) return '';
    // 有些固件以毫秒返回运行时长。
    if (n > 100000000) n = n / 1000;
    var d = Math.floor(n / 86400); n %= 86400;
    var h = Math.floor(n / 3600); n %= 3600;
    var m = Math.floor(n / 60);
    if (d > 0) return d + '天 ' + h + '小时';
    if (h > 0) return h + '小时 ' + m + '分钟';
    return Math.max(1, m) + '分钟';
  }

  function formatUptimeSmart(value) {
    var raw = clean(value);
    if (!raw || raw === '--') return '';
    if (/^up\s+/i.test(raw)) raw = raw.replace(/^up\s+/i, '').trim();
    if (/^\d+:\d{1,2}(?::\d{1,2})?$/.test(raw)) return formatSeconds(raw);
    if (/[天日小时分钟秒]|\b(day|days|hour|hours|minute|minutes|min|sec|seconds)\b|\b\d+\s*[dhms]\b/i.test(raw) && /\d/.test(raw)) return raw;
    var first = raw.match(/-?\d+(?:\.\d+)?/);
    if (!first) return '';
    var n = Number(first[0]);
    if (!isFinite(n) || n <= 0) return '';
    var nowSec = Math.floor(Date.now() / 1000);
    if (n > 100000000000) {
      var deltaMs = Date.now() - n;
      if (deltaMs > 0) return formatSeconds(deltaMs / 1000);
    }
    if (n > 1000000000 && n < nowSec + 86400) {
      var delta = nowSec - n;
      if (delta > 0) return formatSeconds(delta);
    }
    return formatSeconds(n);
  }

  function normalizeHomeConnectionDuration(value) {
    var raw = clean(value);
    if (!raw || raw === '--') return '';
    if (/(querySelector|document\.|function\s*\(|var\s+|const\s+|let\s+|return\s+|=>|innerHTML|textContent|className|addEventListener)/i.test(raw)) return '';
    raw = raw.replace(/^(连接时长|连接时间|联网时长|在线时长|已连接时长)\s*[:：]?\s*/i, '').trim();
    raw = raw.split(/(?:\s*[|｜]\s*)|(?:\s*\/\s*(?:总时长|总流量|已用流量|当日流量|本月|当前网速|下载|上传))|(?:\s+(?:总时长|已用流量|当日流量|本月已用|本月流量|当前网速|下载|上传)\s*[:：]?)/i)[0];
    raw = clean(raw).replace(/[，,;；|｜/]+$/g, '').trim();
    if (!raw) return '';
    var hms = raw.match(/\b\d{1,4}:\d{1,2}(?::\d{1,2})?\b/);
    if (hms) return formatUptimeSmart(hms[0]);
    var cn = raw.match(/-?\d+(?:\.\d+)?\s*(?:天|日|小时|分钟|分|秒)/);
    if (cn) return clean(cn[0]);
    var en = raw.match(/-?\d+(?:\.\d+)?\s*(?:days?|hours?|hrs?|minutes?|mins?|seconds?|secs?|[dhms])\b/i);
    if (en) return clean(en[0]);
    if (/^-?\d+(?:\.\d+)?$/.test(raw)) return formatUptimeSmart(raw);
    // 连接时长必须是时间值；不能把“流量使用情况”等普通标题当成运行状态。
    return '';
  }

  function pickHomeConnectionDurationFromText() {
    var scoped = pickHomeConnectionDurationFromBasicStatus();
    if (scoped) return scoped;
    var text = getHomeSourceText();
    if (!text) return '';
    var labels = ['连接时长','连接时间','联网时长','在线时长','已连接时长'];
    var unitPattern = '(-?\\d+(?:\\.\\d+)?\\s*(?:天|日|小时|分钟|分|秒|days?|hours?|hrs?|minutes?|mins?|seconds?|secs?|[dhms])\\b|\\d{1,4}:\\d{1,2}(?::\\d{1,2})?)';
    for (var i = 0; i < labels.length; i += 1) {
      var label = homeEscReg(labels[i]);
      var re = new RegExp(label + '\\s*[:：]?\\s*' + unitPattern, 'i');
      var m = text.match(re);
      if (m && m[1]) return normalizeHomeConnectionDuration(m[1]);
    }
    var lines = text.split(/\r?\n/).map(function (x) { return clean(x); }).filter(Boolean);
    for (var j = 0; j < labels.length; j += 1) {
      var target = String(labels[j] || '').replace(/\s+/g, '');
      for (var k = 0; k < lines.length; k += 1) {
        var compact = lines[k].replace(/\s+/g, '');
        if (compact === target || (compact.indexOf(target) !== -1 && compact.length <= target.length + 10)) {
          var next = lines[k + 1] || '';
          var out = normalizeHomeConnectionDuration(next);
          if (out) return out;
        }
      }
    }
    return '';
  }

  function normalizeShellUptimeText(text) {
    var raw = clean(text);
    if (!raw) return '';
    var proc = raw.match(/^([0-9]+(?:\.[0-9]+)?)\s+/);
    if (proc) return formatSeconds(proc[1]);
    var pretty = raw.match(/up\s+([^,]+(?:,\s*[^,]+)?)/i);
    if (pretty) return clean(pretty[1].replace(/\s+load\s+average.*$/i, ''));
    return formatUptimeSmart(raw);
  }

  function refreshHomeUptimeFallback(force) {
    var el = document.getElementById('kn-home-uptime');
    if (!el) return;
    if (typeof runShellWithRoot !== 'function') return;
    var now = Date.now();
    if (!force && state.homeUptimeShellAt && now - state.homeUptimeShellAt < 30000) return;
    if (state.homeUptimeShellBusy) return;
    state.homeUptimeShellAt = now;
    state.homeUptimeShellBusy = true;
    runShellWithRoot('cat /proc/uptime 2>/dev/null || uptime -p 2>/dev/null || uptime 2>/dev/null').then(function (res) {
      var text = '';
      if (typeof res === 'string') text = res;
      else if (res && typeof res === 'object') text = res.stdout || res.data || res.result || res.output || JSON.stringify(res);
      var uptime = normalizeShellUptimeText(text);
      if (uptime) { setHomeTitle('#kn-home-uptime', '系统运行 ' + uptime); }
      else if (force) setHomeTitle('#kn-home-uptime', '连接时长未返回');
    }).catch(function () {
      if (force) setHomeTitle('#kn-home-uptime', '连接时长未返回');
    }).finally(function () { state.homeUptimeShellBusy = false; });
  }

  function formatTemperature(value) {
    var raw = clean(value);
    if (!raw) return '';
    var n = Number(String(raw).replace(/[^0-9.-]/g, ''));
    if (!isFinite(n)) return raw;
    if (Math.abs(n) > 200 && Math.abs(n) < 200000) n = n / 1000;
    return Math.round(n * 10) / 10 + '℃';
  }
  function pickHomeMetricFromDom(labels) {
    return pickHomeValueFromText(labels || [], { maxLen: 96 });
  }


  function pickHomeMetricAny(data, keys, labels) {
    return firstClean(data || {}, keys || []) || pickHomeMetricFromDom(labels || []);
  }

  function pickHomeRadioValue(data, keys, labels, metric) {
    var raw = firstClean(data || {}, keys || []);
    var v = normalizeRadioMetricValue(raw, metric || (labels && labels[0]));
    if (v) return v;
    return extractRadioFromDom(labels || [], metric || (labels && labels[0]));
  }

  function getHomeStorageFromDom() {
    var parsed = parseHomeStorageFromText();
    var internalText = parsed.internalUsed && parsed.internalTotal ? (parsed.internalUsed + ' / ' + parsed.internalTotal) : '';
    var sdText = parsed.sdUsed && parsed.sdTotal ? (parsed.sdUsed + ' / ' + parsed.sdTotal) : '';
    return {
      usage: pickHomeMetricFromDom(['存储占用','存储使用率','空间占用','磁盘占用','Flash占用','ROM占用']),
      total: parsed.internalTotal || pickHomeMetricFromDom(['存储总量','总存储','总空间','ROM总量','Flash总量','设备存储','磁盘总量','容量']),
      used: parsed.internalUsed || pickHomeMetricFromDom(['已用存储','已用空间','已使用空间','ROM已用','Flash已用','磁盘已用']),
      free: pickHomeMetricFromDom(['可用存储','可用空间','剩余空间','ROM可用','Flash可用','磁盘可用','剩余容量']),
      internalText: internalText,
      sdText: sdText
    };
  }


  function homeParseNumber(value) {
    var raw = clean(value);
    if (!raw || raw === '--') return NaN;
    var m = raw.match(/-?\d+(?:\.\d+)?/);
    return m ? Number(m[0]) : NaN;
  }

  function homeRate(value) {
    return formatBytesSmart(value, { rate: true });
  }

  function homeNetworkTypeLabel(value) {
    var raw = clean(value);
    if (!raw) return '';
    if (raw === '20') return '5G';
    if (raw === '12') return '4G';
    if (raw === '11') return '3G';
    return raw;
  }

  function homePctFromCapacityText(value) {
    var raw = clean(value);
    var m = raw.match(/([0-9.]+)\s*(KB|MB|GB|TB)\s*[已用]*\s*[\/／]\s*([0-9.]+)\s*(KB|MB|GB|TB)/i);
    if (!m) return NaN;
    var mult = { KB: 1, MB: 1024, GB: 1024*1024, TB: 1024*1024*1024 };
    var used = Number(m[1]) * (mult[String(m[2]).toUpperCase()] || 1);
    var total = Number(m[3]) * (mult[String(m[4]).toUpperCase()] || 1);
    return total > 0 ? Math.max(0, Math.min(100, used / total * 100)) : NaN;
  }

  function setHomeMini(selector, value) {
    var el = document.querySelector(selector);
    if (!el) return;
    if (keepHomePreviousIfNewWeak(el, value)) return;
    var text = value == null || value === '' ? '--' : String(value);
    el.textContent = text;
    el.title = text;
  }

  function setHomeBar(fillSelector, valueSelector, pct, label, level, stateSelector, stateText) {
    var fill = document.querySelector(fillSelector);
    var val = document.querySelector(valueSelector);
    var valid = isFinite(pct);
    var text = label == null || label === '' ? '--' : String(label);
    if (!valid && val && keepHomePreviousIfNewWeak(val, text)) return;
    if (val) {
      val.textContent = valid || text !== '--' ? text : '--';
      val.title = val.textContent;
      val.classList.toggle('is-empty', !valid && text === '--');
    }
    if (fill) {
      fill.classList.remove('good', 'warn', 'bad', 'empty');
      if (!valid) {
        fill.style.width = '0%';
        fill.classList.add('empty');
      } else {
        pct = Math.max(0, Math.min(100, pct));
        fill.style.width = pct + '%';
        fill.classList.add(level === 'bad' ? 'bad' : (level === 'warn' ? 'warn' : 'good'));
      }
    }
    if (stateSelector) {
      var stateEl = document.querySelector(stateSelector);
      if (stateEl) {
        stateEl.classList.remove('good', 'warn', 'bad', 'empty');
        if (!valid) {
          stateEl.textContent = '暂无';
          stateEl.classList.add('empty');
        } else {
          stateEl.textContent = stateText || (level === 'bad' ? '较差' : (level === 'warn' ? '一般' : '良好'));
          stateEl.classList.add(level === 'bad' ? 'bad' : (level === 'warn' ? 'warn' : 'good'));
        }
      }
    }
  }

  function homeCpuTempForCore(data, idx, fallback) {
    var list = data && (data.cpu_temp_list || data.temperature_list || data.thermal_list);
    if (Array.isArray(list)) {
      for (var i = 0; i < list.length; i += 1) {
        var item = list[i] || {};
        var name = clean(item.type || item.name || item.label || item.zone || '');
        if (new RegExp('cpu\s*' + idx + '|core\s*' + idx, 'i').test(name)) return formatTemperature(item.temp || item.value || item.temperature);
      }
    }
    return fallback || '';
  }

  function formatHomeCpuFreq(value) {
    var raw = clean(value);
    if (!raw) return '';
    if (/GHz|MHz/i.test(raw)) return raw;
    var n = Number(String(raw).replace(/[^0-9.\-]/g, ''));
    if (!isFinite(n) || n <= 0) return '';
    // Linux scaling_cur_freq 常见单位为 KHz，例如 1200000 = 1200 MHz。
    if (n >= 100000) n = n / 1000;
    if (n >= 1000) return (Math.round(n / 100) / 10) + ' GHz';
    return Math.round(n) + ' MHz';
  }

  function parseHomeCpuFreqMHz(value) {
    var raw = clean(value);
    if (!raw || raw === '--') return NaN;
    var n = Number(String(raw).replace(/[^0-9.\-]/g, ''));
    if (!isFinite(n) || n <= 0) return NaN;
    if (/GHz/i.test(raw)) return n * 1000;
    if (/MHz/i.test(raw)) return n;
    if (n >= 100000) return n / 1000;
    if (n >= 1000) return n;
    return n;
  }

  function pctClamp(value) {
    var n = Number(value);
    if (!isFinite(n)) return 0;
    return Math.max(0, Math.min(100, n));
  }

  function coreFillClass(pct) {
    pct = Number(pct);
    if (!isFinite(pct)) return '';
    if (pct >= 85) return ' bad';
    if (pct >= 65) return ' warn';
    return '';
  }

  function renderHomeCpuCores(data, commonTemp) {
    var box = document.getElementById('kn-home-cpu-cores');
    data = data || {};
    var usageInfo = data.cpuUsageInfo || data.cpu_usage_info || data.cpu_usage_per_core || {};
    var freqInfo = data.cpuFreqInfo || data.cpu_freq_info || {};
    var keys = Object.keys(usageInfo || {}).filter(function (k) { return /^cpu\d+$/i.test(k); }).sort(function (a, b) { return Number(a.replace(/\D/g, '')) - Number(b.replace(/\D/g, '')); });
    if (!keys.length && freqInfo && typeof freqInfo === 'object') {
      keys = Object.keys(freqInfo).filter(function (k) { return /^cpu\d+$/i.test(k); }).sort(function (a, b) { return Number(a.replace(/\D/g, '')) - Number(b.replace(/\D/g, '')); });
    }
    var rows = keys.slice(0, 12).map(function (k) {
      var idx = Number(k.replace(/\D/g, ''));
      var usage = Number(usageInfo[k]);
      var f = freqInfo && freqInfo[k] ? freqInfo[k] : {};
      var rawFreq = f.cur || f.current || f.freq || f.scaling_cur_freq || '';
      var freqText = formatHomeCpuFreq(rawFreq);
      var tempText = homeCpuTempForCore(data, idx, commonTemp) || '';
      var freqMHz = parseHomeCpuFreqMHz(freqText || rawFreq);
      return {
        name: k.toUpperCase(),
        usage: isFinite(usage) ? usage : NaN,
        usageText: isFinite(usage) ? (Math.round(usage * 10) / 10 + '%') : '--',
        freqText: freqText || '--',
        tempText: tempText || '--',
        freqMHz: isFinite(freqMHz) ? freqMHz : NaN,
        tempNum: homeParseNumber(tempText)
      };
    });
    var usageVals = rows.map(function (r) { return r.usage; }).filter(function (n) { return isFinite(n); });
    var avgUsage = usageVals.length ? usageVals.reduce(function (a, b) { return a + b; }, 0) / usageVals.length : NaN;
    var activeCount = rows.filter(function (r) { return (isFinite(r.usage) && r.usage > 0.5) || (isFinite(r.freqMHz) && r.freqMHz > 0); }).length;
    var tempVals = rows.map(function (r) { return r.tempNum; }).filter(function (n) { return isFinite(n); });
    var maxTemp = tempVals.length ? Math.max.apply(null, tempVals) : homeParseNumber(commonTemp);
    var freqVals = rows.map(function (r) { return r.freqMHz; }).filter(function (n) { return isFinite(n); });
    var maxFreq = freqVals.length ? Math.max.apply(null, freqVals) : NaN;
    var freqBase = Math.max(maxFreq || 0, 2400);
    setHomeMini('#kn-home-cpu-avg', isFinite(avgUsage) ? (Math.round(avgUsage * 10) / 10 + '%') : '--');
    setHomeMini('#kn-home-cpu-active', rows.length ? (activeCount + ' / ' + rows.length) : '--');
    setHomeMini('#kn-home-cpu-max-temp', isFinite(maxTemp) ? (Math.round(maxTemp * 10) / 10 + '℃') : '--');
    setHomeMini('#kn-home-cpu-max-freq', isFinite(maxFreq) ? (maxFreq >= 1000 ? (Math.round(maxFreq / 100) / 10 + ' GHz') : (Math.round(maxFreq) + ' MHz')) : '--');
    if (!box) return;
    if (!rows.length) {
      box.innerHTML = '<div class="kn-home-core-chip"><b>CPU</b><div class="kn-home-core-metric"><span class="kn-home-core-metric-label">占用</span><div class="kn-home-core-mini-track"><div class="kn-home-core-mini-fill" style="width:0%"></div></div><span class="kn-home-core-metric-value">--</span></div><div class="kn-home-core-metric"><span class="kn-home-core-metric-label">频率</span><div class="kn-home-core-mini-track"><div class="kn-home-core-mini-fill" style="width:0%"></div></div><span class="kn-home-core-metric-value">--</span></div><div class="kn-home-core-metric"><span class="kn-home-core-metric-label">温度</span><div class="kn-home-core-mini-track"><div class="kn-home-core-mini-fill" style="width:0%"></div></div><span class="kn-home-core-metric-value">--</span></div></div>';
      return;
    }
    box.innerHTML = rows.map(function (r) {
      var usagePct = pctClamp(r.usage);
      var freqPct = pctClamp(isFinite(r.freqMHz) && freqBase > 0 ? (r.freqMHz / freqBase * 100) : 0);
      var tempPct = pctClamp(isFinite(r.tempNum) ? r.tempNum : 0);
      return '<div class="kn-home-core-chip" title="' + knEsc(r.name + ' · 占用 ' + r.usageText + ' · 频率 ' + r.freqText + ' · 温度 ' + r.tempText) + '"><b>' + knEsc(r.name) + '</b>' +
        '<div class="kn-home-core-metric"><span class="kn-home-core-metric-label">占用</span><div class="kn-home-core-mini-track"><div class="kn-home-core-mini-fill' + coreFillClass(usagePct) + '" style="width:' + usagePct + '%"></div></div><span class="kn-home-core-metric-value">' + knEsc(r.usageText) + '</span></div>' +
        '<div class="kn-home-core-metric"><span class="kn-home-core-metric-label">频率</span><div class="kn-home-core-mini-track"><div class="kn-home-core-mini-fill" style="width:' + freqPct + '%"></div></div><span class="kn-home-core-metric-value">' + knEsc(r.freqText) + '</span></div>' +
        '<div class="kn-home-core-metric"><span class="kn-home-core-metric-label">温度</span><div class="kn-home-core-mini-track"><div class="kn-home-core-mini-fill' + coreFillClass(tempPct) + '" style="width:' + tempPct + '%"></div></div><span class="kn-home-core-metric-value">' + knEsc(r.tempText) + '</span></div>' +
      '</div>';
    }).join('');
  }

  function stabilizeHomeRadioMetric(metric, value) {
    metric = String(metric || '').toLowerCase();
    if (!state.homeLastRadio) state.homeLastRadio = {};
    var raw = clean(value);
    var num = homeParseNumber(raw);
    var last = state.homeLastRadio[metric] || '';

    // 某些二次刷新/CPU 数据刷新阶段拿不到射频字段，会从页面说明或范围边界误读出
    // RSRP -125、SINR -10、RSRQ -20 这类“量程最小值”。这些不是实时信号值。
    var boundaryArtifact = false;
    if (last && isFinite(num)) {
      if (metric === 'rsrp' && num <= -125) boundaryArtifact = true;
      if (metric === 'sinr' && num <= -10) boundaryArtifact = true;
      if (metric === 'rsrq' && num <= -20) boundaryArtifact = true;
    }

    if (!raw || raw === '--' || boundaryArtifact) return last || '';
    if (isFinite(num)) state.homeLastRadio[metric] = raw;
    return raw;
  }


  function pickHomeDataVolumeFromDom(labels) {
    var text = getHomeSourceText();
    if (!text) return '';
    for (var i = 0; i < (labels || []).length; i += 1) {
      var label = homeEscReg(labels[i]);
      var reg = new RegExp(label + '\\s*[:：]?\\s*([0-9]+(?:\\.[0-9]+)?\\s*(?:B|KB|MB|GB|TB|KiB|MiB|GiB|TiB))', 'i');
      var m = text.match(reg);
      if (m) return clean(m[1]);
    }
    return '';
  }

  function homeBytesToNumber(value) {
    var raw = clean(value);
    if (!raw) return NaN;
    var m = raw.match(/([0-9]+(?:\.[0-9]+)?)\s*(B|KB|MB|GB|TB|KiB|MiB|GiB|TiB)?/i);
    if (!m) return NaN;
    var n = Number(m[1]);
    if (!isFinite(n)) return NaN;
    var unit = String(m[2] || 'B').toUpperCase().replace('IB', 'B');
    var mult = { B: 1, KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024, TB: 1024 * 1024 * 1024 * 1024 };
    return n * (mult[unit] || 1);
  }

  function sumHomeBytes(data, fields) {
    var total = 0;
    var seen = false;
    (fields || []).forEach(function (key) {
      var n = homeBytesToNumber(data && data[key]);
      if (isFinite(n) && n > 0) { total += n; seen = true; }
    });
    return seen ? total : NaN;
  }

  function updateHomeDashboardFusion(data, ctx) {
    ctx = ctx || {};
    data = data || {};
    ctx.rsrp = stabilizeHomeRadioMetric('rsrp', ctx.rsrp);
    ctx.sinr = stabilizeHomeRadioMetric('sinr', ctx.sinr);
    ctx.rsrq = stabilizeHomeRadioMetric('rsrq', ctx.rsrq);
    var rsrpNum = homeParseNumber(ctx.rsrp);
    var sinrNum = homeParseNumber(ctx.sinr);
    var rsrqNum = homeParseNumber(ctx.rsrq);
    var rsrpPct = isFinite(rsrpNum) ? ((rsrpNum - (-125)) / ((-81) - (-125)) * 100) : NaN;
    var sinrPct = isFinite(sinrNum) ? ((sinrNum - (-10)) / (30 - (-10)) * 100) : NaN;
    var rsrqPct = isFinite(rsrqNum) ? ((rsrqNum - (-20)) / ((-3) - (-20)) * 100) : NaN;
    var rsrpLevel = isFinite(rsrpNum) && rsrpNum < -105 ? 'bad' : (isFinite(rsrpNum) && rsrpNum < -95 ? 'warn' : 'good');
    var sinrLevel = isFinite(sinrNum) && sinrNum < 0 ? 'bad' : (isFinite(sinrNum) && sinrNum < 13 ? 'warn' : 'good');
    var rsrqLevel = isFinite(rsrqNum) && rsrqNum < -14 ? 'bad' : (isFinite(rsrqNum) && rsrqNum < -10 ? 'warn' : 'good');
    setHomeBar('#kn-home-bar-rsrp', '#kn-home-val-rsrp', rsrpPct, ctx.rsrp || '--', rsrpLevel, '#kn-home-state-rsrp');
    setHomeBar('#kn-home-bar-sinr', '#kn-home-val-sinr', sinrPct, ctx.sinr || '--', sinrLevel, '#kn-home-state-sinr');
    setHomeBar('#kn-home-bar-rsrq', '#kn-home-val-rsrq', rsrqPct, ctx.rsrq || '--', rsrqLevel, '#kn-home-state-rsrq');
    setHomeMini('#kn-home-signal-label', joinHomeValues([ctx.band ? '频段 ' + ctx.band : '', ctx.pci ? 'PCI ' + ctx.pci : '', ctx.rssi ? 'RSSI ' + ctx.rssi : ''], ' · ') || '实时解析');
    var signalLevels = [rsrpLevel, sinrLevel, rsrqLevel].filter(function (_, idx) { return [rsrpNum, sinrNum, rsrqNum].map(function (n) { return isFinite(n); })[idx]; });
    var badCount = signalLevels.filter(function (x) { return x === 'bad'; }).length;
    var warnCount = signalLevels.filter(function (x) { return x === 'warn'; }).length;
    var overallText = signalLevels.length ? (badCount ? '偏弱' : (warnCount ? '一般' : '良好')) : '--';
    var adviceText = signalLevels.length ? (badCount ? '调整位置/天线' : (warnCount ? '可继续观察' : '无需处理')) : '等待数据';
    setHomeMini('#kn-home-signal-overall', overallText);
    setHomeMini('#kn-home-signal-radio', joinHomeValues([ctx.band ? '频段 ' + ctx.band : '', ctx.pci ? 'PCI ' + ctx.pci : '', ctx.rssi ? 'RSSI ' + ctx.rssi : ''], ' · ') || '--');
    setHomeMini('#kn-home-signal-advice', adviceText);

    var rxRaw = firstClean(data, ['realtime_rx_thrpt','realtime_rx_bytes']);
    var txRaw = firstClean(data, ['realtime_tx_thrpt','realtime_tx_bytes']);
    var rx = homeRate(rxRaw);
    var tx = homeRate(txRaw);
    var daily = formatBytesSmart(firstClean(data, ['daily_data','daily_used','today_data','today_used','day_data_used','day_used']) || pickHomeDataVolumeFromDom(['当日流量','今日已用','今日流量','日流量']), { rate: false });
    var monthUsed = formatBytesSmart(firstClean(data, ['monthly_data','month_data','monthly_used','month_used','monthly_data_used','month_data_used']) || pickHomeDataVolumeFromDom(['本月已用','本月流量','月已用','本月用量','月流量']), { rate: false });
    var totalBytes = sumHomeBytes(data, ['total_rx_bytes','total_tx_bytes']);
    if (!isFinite(totalBytes)) totalBytes = sumHomeBytes(data, ['monthly_rx_bytes','monthly_tx_bytes']);
    var totalUsed = isFinite(totalBytes) ? formatBytesSmart(totalBytes, { rate: false }) : formatBytesSmart(firstClean(data, ['total_data','total_used','data_volume_used']), { rate: false });
    setHomeMini('#kn-home-kpi-rx', rx || '--');
    setHomeMini('#kn-home-kpi-tx', tx || '--');
    setHomeMini('#kn-home-kpi-qci', clean(data.QORS_MESSAGE || (typeof QORS_MESSAGE !== 'undefined' ? QORS_MESSAGE : '')) || '--');
    setHomeMini('#kn-home-kpi-daily', daily || '--');
    setHomeMini('#kn-home-kpi-month', monthUsed || '--');
    setHomeMini('#kn-home-kpi-total', totalUsed || '--');
    setHomeMini('#kn-home-net-context', data.ppp_status || '--');
    setHomeMini('#kn-home-throughput-label', '实时 RX / TX');

    setHomeMini('#kn-home-info-nettype', homeNetworkTypeLabel(data.network_type) || ctx.netType || '--');
    setHomeMini('#kn-home-info-provider', ctx.operator || data.network_provider || '--');
    setHomeMini('#kn-home-info-ipv6', ctx.ipv6Addr || data.ipv6_wan_ipaddr || '--');
    setHomeMini('#kn-home-info-lan', ctx.gatewayAddr || data.lan_ipaddr || '--');
    setHomeMini('#kn-home-info-iccid', ctx.iccid || data.iccid || '--');
    setHomeMini('#kn-home-info-imei', ctx.imei || data.imei || '--');
    setHomeMini('#kn-home-info-nr', joinHomeValues([data.Nr_bands ? 'N' + data.Nr_bands : ctx.band, data.Nr_fcn ? '频点 ' + data.Nr_fcn : '', data.Nr_pci ? 'PCI ' + data.Nr_pci : ctx.pci], ' / ') || '--');
    setHomeMini('#kn-home-info-lte', joinHomeValues([data.Lte_bands ? 'B' + data.Lte_bands : '', data.Lte_fcn ? '频点 ' + data.Lte_fcn : '', data.Lte_pci ? 'PCI ' + data.Lte_pci : ''], ' / ') || '--');

    var tempNum = homeParseNumber(ctx.temp);
    var memNum = homeParseNumber(ctx.memUsage);
    var swapNum = Number((data.memInfo && data.memInfo.swap_usage_percent) || data.swap_usage_percent || NaN);
    var storagePct = homeParseNumber(ctx.storageUsage);
    if (!isFinite(storagePct)) storagePct = homePctFromCapacityText(ctx.internalStorageText || '');
    setHomeBar('#kn-home-bar-mem', '#kn-home-val-mem', memNum, ctx.memUsage || '--', isFinite(memNum) && memNum >= 85 ? 'bad' : (isFinite(memNum) && memNum >= 65 ? 'warn' : 'good'));
    setHomeBar('#kn-home-bar-swap', '#kn-home-val-swap', swapNum, isFinite(swapNum) ? (Math.round(swapNum * 10) / 10 + '%') : '--', isFinite(swapNum) && swapNum >= 70 ? 'warn' : 'good');
    setHomeBar('#kn-home-bar-storage', '#kn-home-val-storage', storagePct, ctx.internalStorageText || ctx.storageUsage || '--', isFinite(storagePct) && storagePct >= 85 ? 'bad' : (isFinite(storagePct) && storagePct >= 70 ? 'warn' : 'good'));
    var sdPct = homePctFromCapacityText(ctx.sdStorageText || '');
    setHomeBar('#kn-home-bar-sd', '#kn-home-val-sd', sdPct, ctx.sdStorageText || '未检测到', isFinite(sdPct) && sdPct >= 85 ? 'bad' : (isFinite(sdPct) && sdPct >= 70 ? 'warn' : 'good'));
    setHomeMini('#kn-home-temp-mem-label', joinHomeValues([ctx.memUsage ? '内存 ' + ctx.memUsage : '', ctx.internalStorageText ? '存储 ' + ctx.internalStorageText : '', ctx.sdStorageText ? 'SD ' + ctx.sdStorageText : ''], ' · ') || '--');
    renderHomeCpuCores(data, ctx.temp || '');
  }

  function homeToast(msg, type) {
    if (typeof createToast === 'function') createToast(msg, type || 'pink');
    else console.log('[KanoWebOS]', msg);
  }

  function getExternalPhoneSmsPlugin() {
    if (EXTERNAL_KANO_PHONE_SMS && typeof EXTERNAL_KANO_PHONE_SMS.open === 'function') return EXTERNAL_KANO_PHONE_SMS;
    if (window.KanoPhoneSMS && window.KanoPhoneSMS !== window.KanoWebOS && typeof window.KanoPhoneSMS.open === 'function' && window.KanoPhoneSMS.open !== openHomePhoneSms) return window.KanoPhoneSMS;
    return null;
  }

  function closePhoneSmsMissingDialog() {
    var old = document.getElementById('kn-phone-sms-missing');
    if (old) old.remove();
  }

  function showPhoneSmsMissingDialog() {
    closePhoneSmsMissingDialog();
    var modal = document.createElement('div');
    modal.id = 'kn-phone-sms-missing';
    modal.className = 'kn-phone-missing-modal';
    modal.innerHTML = '<div class="kn-phone-missing-card"><div class="kn-phone-missing-title">未检测到“电话与短信”插件</div><div class="kn-phone-missing-text">首页当前只负责调用外部电话与短信插件。请先安装或启用该插件，安装后会优先调用 <code>window.KanoPhoneSMS.open()</code> 打开原插件界面。</div><div class="kn-phone-missing-actions"><button type="button" data-missing-close="1">关闭</button><button type="button" class="primary" data-missing-github="1">打开 GitHub 仓库</button></div></div>';
    modal.addEventListener('click', function (e) { if (e.target === modal) closePhoneSmsMissingDialog(); });
    document.body.appendChild(modal);
    var closeBtn = modal.querySelector('[data-missing-close]');
    if (closeBtn) closeBtn.onclick = closePhoneSmsMissingDialog;
    var githubBtn = modal.querySelector('[data-missing-github]');
    if (githubBtn) githubBtn.onclick = function () { try { window.open(PHONE_SMS_PLUGIN_URL || GITHUB_REPO_URL, '_blank'); } catch (e) { location.href = PHONE_SMS_PLUGIN_URL || GITHUB_REPO_URL; } };
  }

  function openExternalPhoneSmsOrPrompt() {
    if (!isWebOSFeatureEnabled('phoneSmsBuiltin')) { homeToast('内置电话短信插件已在 WebOS 设置中关闭', 'yellow'); return; }
    var plugin = getExternalPhoneSmsPlugin();
    if (plugin) {
      try { plugin.open(); return; } catch (e) { console.warn('[KanoWebOS] 外部电话与短信插件打开失败:', e); }
    }
    // 兼容旧插件只创建了首页按钮但没有暴露 window.KanoPhoneSMS 的情况。
    var btn = Array.prototype.slice.call(document.querySelectorAll('button,.btn,[role="button"]')).find(function (el) {
      var t = clean(el.textContent || '');
      return t === '电话与短信' || t.indexOf('电话与短信') !== -1 || t.indexOf('拨号') !== -1 && t.indexOf('短信') !== -1;
    });
    if (btn && !btn.closest('#' + HOME_DASHBOARD_ID)) { try { btn.click(); return; } catch (e2) {} }
    showPhoneSmsMissingDialog();
  }

  function getExternalOperatorInfoPlugin() {
    var names = ['KanoOperatorInfo', 'KanoCarrierInfo', 'KanoOperatorQuery', 'KanoCarrierQuery', 'KanoCarrierBalance', 'KanoOperatorBalance'];
    for (var i = 0; i < names.length; i += 1) {
      var plugin = window[names[i]];
      if (plugin && plugin !== window.KanoWebOS && typeof plugin.open === 'function') return plugin;
    }
    return null;
  }

  function openOperatorInfoGithub() {
    try { window.open(OPERATOR_INFO_PLUGIN_URL || GITHUB_REPO_URL, '_blank'); }
    catch (e) { location.href = OPERATOR_INFO_PLUGIN_URL || GITHUB_REPO_URL; }
  }

  function updateHomeOperatorPluginCard() {
    var status = document.getElementById('kn-home-operator-plugin-status');
    var githubBtn = document.querySelector('#' + HOME_DASHBOARD_ID + ' [data-home-action="operatorGithub"]');
    var plugin = getExternalOperatorInfoPlugin();
    if (status) {
      status.className = 'kn-home-plugin-status ' + (plugin ? 'ready' : 'missing');
      status.textContent = plugin ? '已检测到运营商查询插件' : '未检测到插件，可先打开 GitHub 获取模板';
    }
    if (githubBtn) githubBtn.style.display = plugin ? 'none' : '';
  }

  function closeOperatorInfoMissingDialog() {
    var old = document.getElementById('kn-operator-info-missing');
    if (old) old.remove();
  }

  function showOperatorInfoMissingDialog() {
    closeOperatorInfoMissingDialog();
    var modal = document.createElement('div');
    modal.id = 'kn-operator-info-missing';
    modal.className = 'kn-phone-missing-modal';
    modal.innerHTML = '<div class="kn-phone-missing-card"><div class="kn-phone-missing-title">未检测到“运营商信息”插件</div><div class="kn-phone-missing-text">首页已预留运营商官方余量查询入口。请安装或启用插件，并暴露 <code>window.KanoOperatorInfo.open()</code>、<code>window.KanoCarrierInfo.open()</code> 或同类 open 方法后，首页会直接调用。</div><div class="kn-phone-missing-actions"><button type="button" data-missing-close="1">关闭</button><button type="button" class="primary" data-missing-github="1">打开 GitHub 仓库</button></div></div>';
    modal.addEventListener('click', function (e) { if (e.target === modal) closeOperatorInfoMissingDialog(); });
    document.body.appendChild(modal);
    var closeBtn = modal.querySelector('[data-missing-close]');
    if (closeBtn) closeBtn.onclick = closeOperatorInfoMissingDialog;
    var githubBtn = modal.querySelector('[data-missing-github]');
    if (githubBtn) githubBtn.onclick = openOperatorInfoGithub;
  }

  function openExternalOperatorInfoOrPrompt() {
    var plugin = getExternalOperatorInfoPlugin();
    if (plugin) {
      try { plugin.open(); return; } catch (e) { console.warn('[KanoWebOS] 外部运营商信息插件打开失败:', e); }
    }
    var btn = Array.prototype.slice.call(document.querySelectorAll('button,.btn,[role="button"]')).find(function (el) {
      var t = clean(el.textContent || '');
      return t.indexOf('运营商信息') !== -1 || t.indexOf('运营商查询') !== -1 || t.indexOf('套餐余量') !== -1 || t.indexOf('剩余流量') !== -1 || t.indexOf('官方余量') !== -1;
    });
    if (btn && !btn.closest('#' + HOME_DASHBOARD_ID) && !btn.closest('#kn-operator-info-missing')) { try { btn.click(); return; } catch (e2) {} }
    showOperatorInfoMissingDialog();
  }

  function triggerHomeRocketAction(btn, type) {
    var oldHtml = btn ? btn.innerHTML : '';
    if (btn && btn.classList) {
      btn.disabled = true;
      btn.classList.remove('launching');
      void btn.offsetWidth;
      btn.classList.add('launching');
      btn.innerHTML = '<span class="kn-home-rocket-icon">🚀</span><span class="kn-home-rocket-label">' + (type === 'clean' ? '清理中…' : '降温中…') + '</span>';
      setTimeout(function () { try { btn.classList.remove('launching'); } catch (e) {} }, 860);
    }
    setTimeout(function () { runHomeMaintenance(type, btn, oldHtml); }, 180);
  }

  function getATSlot() {
    var atSlotValue = document.querySelector('#AT_SLOT') && document.querySelector('#AT_SLOT').value;
    atSlotValue = clean(atSlotValue);
    return /^\d+$/.test(atSlotValue || '') ? atSlotValue : '0';
  }

  function sanitizePhoneNumber(value) {
    return String(value || '').trim().replace(/\s+/g, '').replace(/[()（）-]/g, '');
  }

  function normalizeSmsNumber(value) {
    var n = sanitizePhoneNumber(value);
    if (/^\+86(1\d{10})$/.test(n)) n = n.replace(/^\+86/, '');
    else if (/^86(1\d{10})$/.test(n)) n = n.replace(/^86/, '');
    if (/^\+\d+$/.test(n)) n = n.slice(1);
    return n;
  }

  function encodeSmsUnicodeHex(text) {
    var s = String(text || '');
    var out = '';
    for (var i = 0; i < s.length; i += 1) out += s.charCodeAt(i).toString(16).padStart(4, '0');
    return out;
  }

  function getSmsTimeForZte() {
    var d = new Date();
    var yy = String(d.getFullYear()).slice(-2);
    var MM = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    var hh = String(d.getHours()).padStart(2, '0');
    var mm = String(d.getMinutes()).padStart(2, '0');
    var ss = String(d.getSeconds()).padStart(2, '0');
    var offsetHours = Math.trunc((-d.getTimezoneOffset()) / 60);
    return yy + ';' + MM + ';' + dd + ';' + hh + ';' + mm + ';' + ss + ';' + (offsetHours >= 0 ? '+' : '') + offsetHours;
  }

  function executeATCommand(command, slot) {
    var targetSlot = slot == null ? getATSlot() : slot;
    var url = getHeaderBaseURL() + '/AT?command=' + encodeURIComponent(command) + '&slot=' + encodeURIComponent(targetSlot);
    return fetch(url, { headers: getHeaderHeaders() }).then(function (res) { return res.json(); }).catch(function () { return null; });
  }

  function execAT(command) {
    if (!command) return Promise.resolve({ ok: false, data: null, raw: null });
    return executeATCommand(command).then(function (res) {
      if (!res || res.error) return { ok: false, data: null, raw: res };
      return { ok: true, data: res.result, raw: res };
    }).catch(function (e) {
      return { ok: false, data: null, raw: e };
    });
  }

  function ensurePhoneSmsStyle() {
    if (document.getElementById('kano-webos-phone-sms-style')) return;
    var style = document.createElement('style');
    style.id = 'kano-webos-phone-sms-style';
    style.textContent = ''
      + '#kn-phone-sms-modal{position:fixed!important;inset:0!important;z-index:1000000!important;display:flex;align-items:center;justify-content:center;padding:22px;background:rgba(0,0,0,.62);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);box-sizing:border-box}'
      + '#kn-phone-sms-modal *{box-sizing:border-box}'
      + '.kn-ps-panel{width:min(1180px,96vw);height:min(760px,90vh);display:flex;flex-direction:column;overflow:hidden;border-radius:28px;border:1px solid rgba(255,255,255,.14);background:linear-gradient(180deg,rgba(28,32,42,.96),rgba(12,15,22,.96));box-shadow:0 36px 100px rgba(0,0,0,.62);color:#fff;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}'
      + '.kn-ps-head{height:68px;display:flex;align-items:center;justify-content:space-between;gap:14px;padding:0 22px;border-bottom:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.035)}'
      + '.kn-ps-title{font-size:18px;font-weight:950}.kn-ps-sub{font-size:12px;color:rgba(255,255,255,.48);margin-top:5px}.kn-ps-close{height:38px;min-width:70px;border-radius:999px;border:1px solid rgba(255,255,255,.13);background:rgba(255,255,255,.07);color:#fff;font-weight:850;cursor:pointer}'
      + '.kn-ps-tabs{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin:14px 18px 0;padding:7px;border-radius:18px;background:rgba(0,0,0,.20);border:1px solid rgba(255,255,255,.07)}.kn-ps-tab{height:42px;border:0;border-radius:14px;background:transparent;color:rgba(255,255,255,.58);font-weight:900;cursor:pointer}.kn-ps-tab.active{color:#fff;background:rgba(78,146,255,.24)}'
      + '.kn-ps-body{flex:1;min-height:0;padding:16px 18px 18px}.kn-ps-page{display:none;height:100%;min-height:0}.kn-ps-page.active{display:block}.kn-ps-grid{height:100%;min-height:0;display:grid;grid-template-columns:350px minmax(0,1fr);gap:16px}.kn-ps-card{min-height:0;display:flex;flex-direction:column;overflow:hidden;border-radius:22px;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.045);padding:16px}.kn-ps-card-title{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:14px;font-weight:950;margin-bottom:12px}.kn-ps-chip{font-size:11px;color:rgba(190,215,255,.74);border:1px solid rgba(130,180,255,.16);background:rgba(90,150,255,.10);border-radius:999px;padding:4px 9px}'
      + '.kn-phone-input,.kn-sms-input,.kn-sms-text{width:100%;border-radius:15px;border:1px solid rgba(255,255,255,.11);background:rgba(0,0,0,.28);color:#fff;outline:none;padding:10px 12px}.kn-phone-input{height:54px;text-align:center;font-size:22px;font-weight:950;letter-spacing:.06em}.kn-sms-text{min-height:46px;max-height:96px;resize:vertical;line-height:1.55}'
      + '.kn-phone-keypad{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:14px}.kn-phone-key{height:52px;border-radius:18px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.065);color:#fff;font-size:21px;font-weight:950;cursor:pointer}.kn-phone-actions,.kn-sms-actions{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:12px}.kn-btn{min-height:40px;border-radius:999px;border:1px solid rgba(255,255,255,.11);background:rgba(255,255,255,.07);color:rgba(255,255,255,.86);font-size:12px;font-weight:850;cursor:pointer}.kn-btn.primary{background:linear-gradient(135deg,rgba(65,211,125,.92),rgba(30,160,90,.88));color:#fff}.kn-btn.blue{background:linear-gradient(135deg,rgba(90,150,255,.92),rgba(50,95,210,.88));color:#fff}.kn-btn.danger{background:linear-gradient(135deg,rgba(255,92,104,.92),rgba(200,44,58,.88));color:#fff}'
      + '.kn-phone-status{flex:1;min-height:0;overflow:auto;border-radius:18px;background:rgba(0,0,0,.24);border:1px solid rgba(255,255,255,.07);padding:14px;color:rgba(255,255,255,.78);font-size:13px;line-height:1.75}.kn-status-grid{display:grid;grid-template-columns:96px minmax(0,1fr);gap:8px 10px}.kn-status-grid b{color:rgba(255,255,255,.45)}'
      + '.kn-sms-shell{height:100%;min-height:0;display:grid;grid-template-columns:320px minmax(0,1fr);gap:16px}.kn-sms-search{display:grid;grid-template-columns:1fr 72px;gap:8px;margin-bottom:10px}.kn-sms-list{flex:1;min-height:0;overflow:auto;padding-right:4px}.kn-sms-thread{padding:12px;margin-bottom:8px;border-radius:17px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.04);cursor:pointer}.kn-sms-thread.active{background:rgba(78,146,255,.20);border-color:rgba(130,180,255,.32)}.kn-sms-thread-name{font-size:13px;font-weight:950;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.kn-sms-thread-preview{font-size:11.5px;color:rgba(255,255,255,.52);margin-top:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.kn-sms-chat{padding:0}.kn-sms-chat-head{height:62px;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 16px;border-bottom:1px solid rgba(255,255,255,.08)}.kn-sms-chat-title{font-size:16px;font-weight:950}.kn-sms-chat-body{flex:1;min-height:0;overflow:auto;padding:16px;background:rgba(0,0,0,.10)}.kn-msg{display:flex;margin-bottom:12px}.kn-msg.out{justify-content:flex-end}.kn-bubble{max-width:72%;border-radius:18px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.075);padding:10px 12px;box-shadow:0 12px 28px rgba(0,0,0,.16)}.kn-msg.out .kn-bubble{background:rgba(78,146,255,.32);border-color:rgba(130,180,255,.22)}.kn-bubble-text{font-size:13px;line-height:1.6;color:rgba(255,255,255,.92);white-space:pre-wrap;word-break:break-word}.kn-bubble-meta{font-size:10.5px;color:rgba(255,255,255,.42);margin-top:7px}.kn-sms-compose{padding:13px 14px;border-top:1px solid rgba(255,255,255,.08);display:grid;grid-template-columns:180px minmax(0,1fr) 80px;gap:10px;align-items:end}'
      + '@media(max-width:840px){#kn-phone-sms-modal{align-items:flex-start;overflow:auto;padding:12px}.kn-ps-panel{height:auto;min-height:80vh}.kn-ps-grid,.kn-sms-shell{grid-template-columns:1fr}.kn-sms-compose{grid-template-columns:1fr}.kn-bubble{max-width:90%}}';
    document.head.appendChild(style);
  }

  var phoneSmsState = { smsRaw: [], smsThreads: [], activeKey: '', statusTimer: null, callSession: null, busy: false };

  function setPhoneSmsBusy(busy) {
    var root = document.getElementById('kn-phone-sms-modal');
    if (!root) return;
    Array.prototype.slice.call(root.querySelectorAll('button,input,textarea,select')).forEach(function (el) {
      if (el.getAttribute('data-ps-close') === '1') return;
      el.disabled = !!busy;
      el.style.opacity = busy ? '.62' : '';
    });
  }

  function parseClcc(raw) {
    var lines = String(raw || '').split(/\r?\n/);
    var out = [];
    lines.forEach(function (line) {
      var m = String(line || '').match(/\+CLCC:\s*(\d+),(\d+),(\d+),(\d+),(\d+)(?:,\"([^\"]*)\",(\d+))?/);
      if (m) out.push({ index: m[1], dir: Number(m[2]), status: Number(m[3]), number: m[6] || '', raw: line });
    });
    return out;
  }

  function renderPhoneStatus(calls, raw) {
    var box = document.getElementById('kn-ps-phone-status');
    if (!box) return;
    var c = calls && calls[0];
    var map = { 0: '通话中', 1: '保持中', 2: '正在拨号', 3: '对方振铃', 4: '来电中', 5: '等待中' };
    var now = Date.now();
    if (c) {
      if (!phoneSmsState.callSession || phoneSmsState.callSession.endedAt) {
        phoneSmsState.callSession = { number: c.number || '', direction: c.dir === 1 ? '呼入' : '呼出', firstAt: now, connectedAt: null, endedAt: null };
      }
      if (c.number && !phoneSmsState.callSession.number) phoneSmsState.callSession.number = c.number;
      if (c.status === 0 && !phoneSmsState.callSession.connectedAt) phoneSmsState.callSession.connectedAt = now;
      var duration = phoneSmsState.callSession.connectedAt ? formatMiniDuration(now - phoneSmsState.callSession.connectedAt) : '未接通 · ' + formatMiniDuration(now - phoneSmsState.callSession.firstAt);
      box.innerHTML = '<div class="kn-status-grid"><b>当前状态</b><span>' + knEsc(map[c.status] || ('状态 ' + c.status)) + '</span><b>方向</b><span>' + knEsc(phoneSmsState.callSession.direction) + '</span><b>号码</b><span>' + knEsc(phoneSmsState.callSession.number || '--') + '</span><b>开始时间</b><span>' + knEsc(new Date(phoneSmsState.callSession.firstAt).toLocaleString()) + '</span><b>通话时间</b><span>' + knEsc(duration) + '</span></div>';
    } else {
      if (phoneSmsState.callSession && !phoneSmsState.callSession.endedAt) phoneSmsState.callSession.endedAt = now;
      box.innerHTML = '<div class="kn-status-grid"><b>当前状态</b><span>当前无活动通话</span><b>号码</b><span>' + knEsc(phoneSmsState.callSession && phoneSmsState.callSession.number || '--') + '</span><b>最近结束</b><span>' + knEsc(phoneSmsState.callSession && phoneSmsState.callSession.endedAt ? new Date(phoneSmsState.callSession.endedAt).toLocaleString() : '--') + '</span><b>原始返回</b><span>' + knEsc(clean(raw) || 'AT+CLCC 未返回活动通话') + '</span></div>';
    }
  }

  function formatMiniDuration(ms) {
    var sec = Math.max(0, Math.floor(Number(ms || 0) / 1000));
    var m = Math.floor(sec / 60), s = sec % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  function refreshPhoneStatus(manual) {
    return execAT('AT+CLCC').then(function (res) {
      var raw = res && res.data || '';
      renderPhoneStatus(res && res.ok ? parseClcc(raw) : [], raw);
      if (manual) homeToast(res && res.ok ? '通话状态已刷新' : '通话状态查询失败', res && res.ok ? 'green' : 'red');
    });
  }

  function dialPhone() {
    var input = document.getElementById('kn-ps-phone-number');
    var n = sanitizePhoneNumber(input && input.value);
    if (!n || !/^\+?[0-9*#]{1,32}$/.test(n)) { homeToast('请输入正确号码', 'red'); return; }
    if (input) input.value = n;
    phoneSmsState.callSession = { number: n, direction: '呼出', firstAt: Date.now(), connectedAt: null, endedAt: null };
    setPhoneSmsBusy(true);
    execAT('ATD' + n + ';').then(function (res) {
      homeToast(res && res.ok && String(res.data || '').indexOf('OK') !== -1 ? '拨号指令已发送' : '拨号失败', res && res.ok ? 'green' : 'red');
      setTimeout(function () { refreshPhoneStatus(false); }, 600);
    }).finally(function () { setPhoneSmsBusy(false); });
  }

  function hangupPhone() {
    setPhoneSmsBusy(true);
    execAT('ATH').then(function (res) {
      if (phoneSmsState.callSession) phoneSmsState.callSession.endedAt = Date.now();
      homeToast(res && res.ok && String(res.data || '').indexOf('OK') !== -1 ? '挂断指令已发送' : '挂断失败', res && res.ok ? 'green' : 'red');
      setTimeout(function () { refreshPhoneStatus(false); }, 500);
    }).finally(function () { setPhoneSmsBusy(false); });
  }

  function answerPhone() {
    setPhoneSmsBusy(true);
    execAT('ATA').then(function (res) {
      homeToast(res && res.ok && String(res.data || '').indexOf('OK') !== -1 ? '接听指令已发送' : '接听失败', res && res.ok ? 'green' : 'red');
      setTimeout(function () { refreshPhoneStatus(false); }, 500);
    }).finally(function () { setPhoneSmsBusy(false); });
  }

  function decodeSmsContent(value) {
    var raw = String(value || '');
    if (!raw) return '';
    try { if (typeof decodeBase64 === 'function') return decodeBase64(raw); } catch (e) {}
    try {
      var bin = atob(raw);
      var pct = Array.prototype.map.call(bin, function (ch) { return '%' + ('00' + ch.charCodeAt(0).toString(16)).slice(-2); }).join('');
      return decodeURIComponent(pct);
    } catch (e) {}
    try { return atob(raw); } catch (e) {}
    return raw;
  }

  function formatSmsDate(value) {
    var raw = clean(value);
    if (!raw) return '--';
    var p = raw.split(',').filter(Boolean);
    if (p.length >= 5) return p[0] + '-' + String(p[1]).padStart(2, '0') + '-' + String(p[2]).padStart(2, '0') + ' ' + String(p[3]).padStart(2, '0') + ':' + String(p[4]).padStart(2, '0') + (p[5] ? ':' + String(p[5]).padStart(2, '0') : '');
    return raw;
  }

  function smsTagText(tag) {
    var t = String(tag == null ? '' : tag);
    if (t === '1') return '未读';
    if (t === '0') return '已读';
    if (t === '2') return '已发送';
    if (t === '3') return '发送失败';
    return '状态 ' + (t || '--');
  }

  function getSmsInfoNative(page, pageSize) {
    if (typeof getSmsInfo === 'function') return getSmsInfo(page || 0, pageSize || 500);
    var params = new URLSearchParams();
    params.append('multi_data', '1');
    params.append('isTest', 'false');
    params.append('cmd', 'sms_data_total');
    params.append('page', String(page || 0));
    params.append('data_per_page', String(pageSize || 500));
    params.append('mem_store', '1');
    params.append('tags', '100');
    params.append('order_by', 'order by id desc');
    params.append('_', Date.now().toString());
    return fetch(getHeaderBaseURL() + '/goform/goform_get_cmd_process?' + params.toString(), { headers: getHeaderHeaders() }).then(function (r) { return r.json(); });
  }

  function normalizeSmsList(messages) {
    return (Array.isArray(messages) ? messages : []).map(function (item) {
      var tag = String(item.tag == null ? '' : item.tag);
      var number = item.number || '';
      var key = normalizeSmsNumber(number) || 'unknown';
      return {
        id: item.id,
        number: number || key,
        key: key,
        content: decodeSmsContent(item.content || ''),
        dateRaw: item.date || '',
        date: formatSmsDate(item.date || ''),
        ts: Number(String(item.date || '').replace(/\D/g, '')) || 0,
        tag: tag,
        tagText: smsTagText(tag),
        direction: (tag === '2' || tag === '3') ? 'out' : 'in',
        raw: item
      };
    });
  }

  function buildSmsThreads(list) {
    var map = {};
    list.forEach(function (msg) {
      if (!map[msg.key]) map[msg.key] = { key: msg.key, number: msg.number, messages: [], unread: 0, last: null, ts: 0 };
      map[msg.key].messages.push(msg);
      if (msg.tag === '1') map[msg.key].unread += 1;
      if (!map[msg.key].last || msg.ts >= map[msg.key].ts) { map[msg.key].last = msg; map[msg.key].ts = msg.ts; map[msg.key].number = msg.number || map[msg.key].number; }
    });
    return Object.keys(map).map(function (k) { map[k].messages.sort(function (a, b) { return a.ts - b.ts; }); return map[k]; }).sort(function (a, b) { return b.ts - a.ts; });
  }

  function renderSmsThreads() {
    var box = document.getElementById('kn-ps-sms-list');
    if (!box) return;
    var kw = clean(document.getElementById('kn-ps-sms-search') && document.getElementById('kn-ps-sms-search').value).toLowerCase();
    var list = phoneSmsState.smsThreads.filter(function (t) {
      return !kw || String(t.number).toLowerCase().indexOf(kw) !== -1 || t.messages.some(function (m) { return String(m.content || '').toLowerCase().indexOf(kw) !== -1; });
    });
    if (!list.length) { box.innerHTML = '<div style="padding:26px;text-align:center;color:rgba(255,255,255,.35);font-size:13px">暂无会话</div>'; return; }
    box.innerHTML = list.map(function (t) {
      var active = t.key === phoneSmsState.activeKey ? ' active' : '';
      var last = t.last || {};
      return '<div class="kn-sms-thread' + active + '" data-sms-key="' + knEsc(t.key) + '"><div class="kn-sms-thread-name">' + knEsc(t.number || '未知号码') + '</div><div class="kn-sms-thread-preview">' + knEsc((last.direction === 'out' ? '我：' : '') + (last.content || '')) + '</div></div>';
    }).join('');
    Array.prototype.slice.call(box.querySelectorAll('.kn-sms-thread')).forEach(function (el) {
      el.onclick = function () { phoneSmsState.activeKey = el.getAttribute('data-sms-key') || ''; renderSmsThreads(); renderSmsChat(); };
    });
  }

  function renderSmsChat() {
    var head = document.getElementById('kn-ps-sms-chat-head');
    var body = document.getElementById('kn-ps-sms-chat-body');
    var numberInput = document.getElementById('kn-ps-sms-number');
    if (!head || !body) return;
    var t = phoneSmsState.smsThreads.find(function (x) { return x.key === phoneSmsState.activeKey; });
    if (!t) {
      head.innerHTML = '<div><div class="kn-sms-chat-title">请选择短信会话</div><div class="kn-ps-sub">左侧按手机号聚合</div></div>';
      body.innerHTML = '<div style="height:100%;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.34)">暂无选中的会话</div>';
      if (numberInput) numberInput.value = '';
      return;
    }
    if (numberInput) numberInput.value = normalizeSmsNumber(t.number || '');
    head.innerHTML = '<div><div class="kn-sms-chat-title">' + knEsc(t.number || '未知号码') + '</div><div class="kn-ps-sub">' + t.messages.length + ' 条短信 · ' + (t.unread ? t.unread + ' 条未读' : '无未读') + '</div></div><button type="button" class="kn-btn" data-sms-dial="1">拨号</button>';
    body.innerHTML = t.messages.map(function (m) {
      return '<div class="kn-msg ' + (m.direction === 'out' ? 'out' : 'in') + '"><div class="kn-bubble"><div class="kn-bubble-text">' + knEsc(m.content || '') + '</div><div class="kn-bubble-meta">' + knEsc(m.date || '--') + ' · ' + knEsc(m.tagText) + '</div></div></div>';
    }).join('');
    var dialBtn = head.querySelector('[data-sms-dial]');
    if (dialBtn) dialBtn.onclick = function () { var phone = document.getElementById('kn-ps-phone-number'); switchPhoneSmsTab('phone'); if (phone) phone.value = normalizeSmsNumber(t.number || ''); };
    setTimeout(function () { body.scrollTop = body.scrollHeight; }, 20);
  }

  function readSmsList(manual) {
    var list = document.getElementById('kn-ps-sms-list');
    if (list) list.innerHTML = '<div style="padding:26px;text-align:center;color:rgba(255,255,255,.42)">正在读取短信...</div>';
    setPhoneSmsBusy(true);
    return getSmsInfoNative(0, 500).then(function (res) {
      phoneSmsState.smsRaw = normalizeSmsList(res && res.messages || []);
      phoneSmsState.smsThreads = buildSmsThreads(phoneSmsState.smsRaw);
      if (!phoneSmsState.smsThreads.some(function (x) { return x.key === phoneSmsState.activeKey; })) phoneSmsState.activeKey = phoneSmsState.smsThreads[0] && phoneSmsState.smsThreads[0].key || '';
      renderSmsThreads();
      renderSmsChat();
      if (manual) homeToast('短信读取完成：' + phoneSmsState.smsRaw.length + ' 条', 'green');
    }).catch(function (e) {
      console.warn('[KanoWebOS] 读取短信失败:', e);
      if (manual) homeToast('读取短信失败', 'red');
    }).finally(function () { setPhoneSmsBusy(false); });
  }

  function sendSmsFromIntegrated() {
    var number = normalizeSmsNumber(document.getElementById('kn-ps-sms-number') && document.getElementById('kn-ps-sms-number').value);
    var textEl = document.getElementById('kn-ps-sms-text');
    var content = clean(textEl && textEl.value);
    if (!/^\d{3,20}$/.test(number)) { homeToast('请输入正确短信号码', 'red'); return; }
    if (!content) { homeToast('请输入短信内容', 'red'); return; }
    if (typeof login !== 'function' || typeof postData !== 'function' || typeof logout !== 'function') {
      homeToast('当前页面缺少原生短信发送函数，请先确认 UFI-TOOLS 已登录', 'red');
      return;
    }
    setPhoneSmsBusy(true);
    login().then(function (cookie) {
      if (!cookie) throw new Error('登录失败');
      var body = typeof gsmEncode === 'function' ? gsmEncode(content) : encodeSmsUnicodeHex(content);
      var payload = { goformId: 'SEND_SMS', notCallback: 'true', Number: number, sms_time: getSmsTimeForZte(), MessageBody: body, ID: '-1', encode_type: 'UNICODE', simSlotId: '1' };
      return postData(cookie, payload).then(function (res) {
        var p = (res && typeof res.json === 'function') ? res.json().catch(function () { return {}; }) : Promise.resolve(res || {});
        return p.then(function (json) { try { logout(cookie); } catch (e) {} return json; }, function (err) { try { logout(cookie); } catch (e) {} throw err; });
      });
    }).then(function (raw) {
      var ok = String(raw && (raw.result || raw.status || '')).toLowerCase();
      if (ok && ok !== 'success' && ok !== 'ok' && ok !== '0') homeToast('短信已提交，但返回状态需核对', 'yellow');
      else homeToast('短信已提交', 'green');
      if (textEl) textEl.value = '';
      setTimeout(function () { readSmsList(false); }, 1200);
    }).catch(function (e) {
      console.warn('[KanoWebOS] 短信发送失败:', e);
      homeToast('短信发送失败：' + (e.message || e), 'red');
    }).finally(function () { setPhoneSmsBusy(false); });
  }

  function switchPhoneSmsTab(tab) {
    var root = document.getElementById('kn-phone-sms-modal');
    if (!root) return;
    Array.prototype.slice.call(root.querySelectorAll('.kn-ps-tab')).forEach(function (btn) { btn.classList.toggle('active', btn.getAttribute('data-ps-tab') === tab); });
    Array.prototype.slice.call(root.querySelectorAll('.kn-ps-page')).forEach(function (page) { page.classList.toggle('active', page.getAttribute('data-ps-page') === tab); });
    if (tab === 'sms') setTimeout(function () { readSmsList(false); }, 80);
  }

  function openHomePhoneSms() {
    ensurePhoneSmsStyle();
    var old = document.getElementById('kn-phone-sms-modal');
    if (old) old.remove();
    var keys = ['1','2','3','4','5','6','7','8','9','*','0','#'].map(function (k) { return '<button type="button" class="kn-phone-key" data-phone-key="' + k + '">' + k + '</button>'; }).join('');
    var modal = document.createElement('div');
    modal.id = 'kn-phone-sms-modal';
    modal.innerHTML = '<div class="kn-ps-panel"><div class="kn-ps-head"><div><div class="kn-ps-title">电话与短信</div><div class="kn-ps-sub">WebOS 通信插件模块 · AT 电话控制 / 原生短信读取发送</div></div><button type="button" class="kn-ps-close" data-ps-close="1">关闭</button></div><div class="kn-ps-tabs"><button type="button" class="kn-ps-tab active" data-ps-tab="phone">电话</button><button type="button" class="kn-ps-tab" data-ps-tab="sms">短信</button></div><div class="kn-ps-body"><div class="kn-ps-page active" data-ps-page="phone"><div class="kn-ps-grid"><div class="kn-ps-card"><div class="kn-ps-card-title"><span>拨号盘</span><span class="kn-ps-chip">Slot ' + knEsc(getATSlot()) + '</span></div><input id="kn-ps-phone-number" class="kn-phone-input" type="tel" inputmode="tel" placeholder="请输入号码"><div class="kn-phone-keypad">' + keys + '</div><div class="kn-phone-actions"><button type="button" class="kn-btn primary" data-phone-action="dial">拨号</button><button type="button" class="kn-btn blue" data-phone-action="answer">接听</button><button type="button" class="kn-btn danger" data-phone-action="hangup">挂断</button></div><div class="kn-phone-actions"><button type="button" class="kn-btn" data-phone-action="plus">+ 号</button><button type="button" class="kn-btn" data-phone-action="back">退格</button><button type="button" class="kn-btn" data-phone-action="clear">清空</button></div></div><div class="kn-ps-card"><div class="kn-ps-card-title"><span>当前通话状态</span><button type="button" class="kn-btn" data-phone-action="refresh">刷新</button></div><div id="kn-ps-phone-status" class="kn-phone-status">正在查询当前通话状态...</div></div></div></div><div class="kn-ps-page" data-ps-page="sms"><div class="kn-sms-shell"><div class="kn-ps-card"><div class="kn-ps-card-title"><span>短信会话</span><span class="kn-ps-chip">按手机号聚合</span></div><div class="kn-sms-search"><input id="kn-ps-sms-search" class="kn-sms-input" type="text" placeholder="搜索号码或内容"><button type="button" class="kn-btn" data-sms-action="refresh">刷新</button></div><div id="kn-ps-sms-list" class="kn-sms-list"><div style="padding:26px;text-align:center;color:rgba(255,255,255,.35)">点击刷新读取短信</div></div></div><div class="kn-ps-card kn-sms-chat"><div id="kn-ps-sms-chat-head" class="kn-sms-chat-head"></div><div id="kn-ps-sms-chat-body" class="kn-sms-chat-body"></div><div class="kn-sms-compose"><input id="kn-ps-sms-number" class="kn-sms-input" type="tel" placeholder="号码"><textarea id="kn-ps-sms-text" class="kn-sms-text" placeholder="输入短信内容"></textarea><button type="button" class="kn-btn primary" data-sms-action="send">发送</button></div></div></div></div></div></div>';
    document.body.appendChild(modal);
    modal.querySelector('[data-ps-close]').onclick = function () { closePhoneSmsModal(); };
    modal.addEventListener('click', function (e) { if (e.target === modal) closePhoneSmsModal(); });
    Array.prototype.slice.call(modal.querySelectorAll('.kn-ps-tab')).forEach(function (btn) { btn.onclick = function () { switchPhoneSmsTab(btn.getAttribute('data-ps-tab')); }; });
    Array.prototype.slice.call(modal.querySelectorAll('[data-phone-key]')).forEach(function (btn) { btn.onclick = function () { var input = document.getElementById('kn-ps-phone-number'); if (input) input.value = sanitizePhoneNumber(input.value + btn.getAttribute('data-phone-key')).slice(0, 32); }; });
    Array.prototype.slice.call(modal.querySelectorAll('[data-phone-action]')).forEach(function (btn) {
      btn.onclick = function () {
        var a = btn.getAttribute('data-phone-action');
        var input = document.getElementById('kn-ps-phone-number');
        if (a === 'dial') return dialPhone();
        if (a === 'answer') return answerPhone();
        if (a === 'hangup') return hangupPhone();
        if (a === 'refresh') return refreshPhoneStatus(true);
        if (a === 'plus' && input) input.value = sanitizePhoneNumber(input.value + '+').slice(0, 32);
        if (a === 'back' && input) input.value = sanitizePhoneNumber(input.value).slice(0, -1);
        if (a === 'clear' && input) input.value = '';
      };
    });
    var search = modal.querySelector('#kn-ps-sms-search');
    if (search) search.oninput = function () { renderSmsThreads(); };
    Array.prototype.slice.call(modal.querySelectorAll('[data-sms-action]')).forEach(function (btn) {
      btn.onclick = function () {
        var a = btn.getAttribute('data-sms-action');
        if (a === 'refresh') readSmsList(true);
        if (a === 'send') sendSmsFromIntegrated();
      };
    });
    renderSmsChat();
    refreshPhoneStatus(false);
    if (phoneSmsState.statusTimer) clearInterval(phoneSmsState.statusTimer);
    phoneSmsState.statusTimer = setInterval(function () { refreshPhoneStatus(false); }, 1600);
  }

  function closePhoneSmsModal() {
    if (phoneSmsState.statusTimer) { clearInterval(phoneSmsState.statusTimer); phoneSmsState.statusTimer = null; }
    var modal = document.getElementById('kn-phone-sms-modal');
    if (modal) modal.remove();
  }


  function getUfiHomeMetrics() {
    var d = null;
    try { d = window.UFI_DATA || null; } catch (e) { d = null; }
    if (!d || typeof d !== 'object') return {};
    var out = {};
    var rawTemp = d.cpu_temp || d.cpuTemperature || d.temperature || d.temp;
    var tempNum = Number(rawTemp);
    if (isFinite(tempNum) && tempNum > 1) {
      if (Math.abs(tempNum) > 200 && Math.abs(tempNum) < 200000) tempNum = tempNum / 1000;
      out.cpuTemp = (Math.round(tempNum * 10) / 10) + '℃';
    }
    var memInfo = d.memInfo || d.memoryInfo || d.mem || {};
    var memPct = Number(memInfo.mem_usage_percent || memInfo.memory_usage_percent || memInfo.usage_percent || memInfo.usage || d.mem_usage_percent || d.memory_usage);
    if (isFinite(memPct) && memPct >= 0) out.memUsage = Math.round(memPct * 10) / 10 + '%';
    var total = formatBytes(memInfo.mem_total || memInfo.total || memInfo.MemTotal);
    var free = formatBytes(memInfo.mem_free || memInfo.free || memInfo.MemFree);
    var used = formatBytes(memInfo.mem_used || memInfo.used || memInfo.MemUsed);
    if (total || free || used) out.memSub = (free ? '可用 ' + free : '') || (used && total ? used + ' / ' + total : '');
    var cpuInfo = d.cpuInfo || d.cpu || {};
    var cpuPct = Number(cpuInfo.usage || cpuInfo.cpu_usage || d.cpu_usage);
    if ((!isFinite(cpuPct) || cpuPct < 0) && d.cpuUsageInfo && typeof d.cpuUsageInfo === 'object') {
      var vals = Object.keys(d.cpuUsageInfo).filter(function (k) { return /^cpu\d+$/i.test(k); }).map(function (k) { return Number(d.cpuUsageInfo[k]); }).filter(function (n) { return isFinite(n); });
      if (vals.length) cpuPct = vals.reduce(function (a,b) { return a + b; }, 0) / vals.length;
    }
    if (isFinite(cpuPct) && cpuPct >= 0) out.cpuUsage = Math.round(cpuPct * 10) / 10 + '%';
    out.uptime = formatUptimeSmart(d.system_uptime || d.uptime || d.up_time || d.running_time || d.run_time || d.runtime || d.device_uptime || d.router_uptime || d.power_on_time || d.online_time || d.boot_time || d.boottime || d.system_boot_time || d.device_start_time || d.start_time || '');
    out.raw = d;
    return out;
  }

  function runRootShellCommand(cmd) {
    if (typeof runShellWithRoot === 'function') return runShellWithRoot(cmd);
    return Promise.reject(new Error('当前页面没有 runShellWithRoot 能力'));
  }

  function runHomeMaintenance(type, btn, oldText) {
    var isClean = type === 'clean';
    var label = isClean ? '清理内存' : '临时降温';
    var restoreBtn = function () {
      if (!btn) return;
      btn.disabled = false;
      if (oldText && String(oldText).indexOf('<') !== -1) btn.innerHTML = oldText;
      else btn.innerHTML = '<span class="kn-home-rocket-icon">🚀</span><span class="kn-home-rocket-label">' + label + '</span>';
    };
    var cmd = isClean
      ? 'sync; echo 3 > /proc/sys/vm/drop_caches; pm trim-caches 999G 2>/dev/null || true'
      : 'for i in /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor; do [ -f "$i" ] && echo powersave > "$i"; done; sync; echo 3 > /proc/sys/vm/drop_caches; sleep 4; for i in /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor; do [ -f "$i" ] && echo interactive > "$i"; done';
    homeToast('🚀 正在执行：' + label, 'yellow');
    runRootShellCommand(cmd).then(function (res) {
      if (res && res.success === false) throw new Error(res.content || '执行失败');
      homeToast('🚀 ' + label + '已提交', 'green');
      setTimeout(function () { refreshHomeDashboardStatus(true); }, 1000);
    }).catch(function (e) {
      console.warn('[KanoWebOS] 首页维护动作失败:', e);
      homeToast(label + '失败：' + (e.message || e), 'red');
    }).finally(restoreBtn);
  }

  function refreshHomeDashboardStatus(force) {
    var home = document.getElementById(HOME_DASHBOARD_ID);
    if (!home) return;
    if (!getStoredLoginState()) {
      state.homeBusy = false;
      setHomeRefreshBusy(false);
      setHomeLastUpdate(false, '登录后读取');
      syncHomeRefreshControls();
      return;
    }
    var cfg = readHomeRefreshConfig();
    refreshHomeExitIp(!!force);
    if (!force && !cfg.auto) return;
    var now = Date.now();
    if (!force && state.homeRefreshAt && now < state.homeRefreshAt) return;
    if (state.homeBusy) return;
    state.homeRefreshAt = now + (Number(cfg.interval) || 10000);
    state.homeBusy = true;
    setHomeRefreshBusy(true);
    var cmds = [
      'modem_main_state','network_provider','network_type','signalbar','network_signalbar','ppp_status','rj45_state','connection_time','connect_time','connected_time','connect_duration','connection_duration','ppp_uptime','wan_uptime','network_uptime','online_duration','system_uptime','uptime','up_time','running_time','run_time','runtime','device_uptime','router_uptime','power_on_time','online_time','runningTime','upTime','boot_time','boottime','system_boot_time','device_start_time','start_time',
      'simcard_status','sim_status','sim_state','simcard_roam','roam_status','msisdn','mdn','sim_phone_number','own_number','my_number','tel_number','phone_number','sim_imsi','imei','imsi','iccid','spn_name',
      'device_name','model_name','product_model','device_model','wa_inner_version','wa_outer_version','hardware_version','software_version','firmware_version','web_version','webui_version','cr_version','version',
      'cpu_usage','cpu_used','cpu_load','load_avg','loadavg','mem_usage','memory_usage','ram_usage','mem_total','mem_free','mem_used','ram_total','ram_free','ram_used',
      'temperature','temp','cpu_temperature','cpu_temp','chip_temp','modem_temp','battery_temp','battery_temperature','thermal','battery_capacity','battery_percent','battery_value','battery_status','battery_charging',
      'storage_usage','flash_usage','rom_usage','disk_usage','disk_total','disk_free','disk_used','rom_total','rom_free','rom_used','flash_total','flash_free','flash_used','storage_total','storage_free','storage_used','sd_total','sd_free','sd_used','sdcard_total','sdcard_free','sdcard_used','sd_card_total','sd_card_free','sd_card_used','emmc_total','emmc_free','emmc_used',
      'wifi_cur_state','wifi_enable','wifi_enabled','wlan_enable','m_ssid_enable','wifi_access_sta_num','wifi_sta_num','sta_count','station_num','station_count','ap_station_num','connected_devices','attached_devices_num','wifi_client_num','wlan_client_num','client_num','station_list','wifi_client_list','attached_devices','client_list',
      'realtime_tx_bytes','realtime_rx_bytes','realtime_tx_thrpt','realtime_rx_thrpt','daily_data','daily_used','today_data','today_used','monthly_data','month_data','monthly_used','month_used','monthly_data_used','month_data_used','monthly_tx_bytes','monthly_rx_bytes','total_tx_bytes','total_rx_bytes','total_data','total_used','data_volume_limit','data_volume_used',
      'rssi','lte_rssi','nr5g_rssi','lte_rsrp','lte_rsrq','lte_snr','lte_sinr','nr5g_rsrp','nr5g_rsrq','nr5g_snr','nr5g_sinr','nr_rsrp','nr_rsrq','nr_sinr','rsrp','rsrq','sinr','snr','pci','lte_pci','nr5g_pci','cell_id','lte_cell_id','nr5g_cell_id','lac','tac','earfcn','nrarfcn','lte_band','nr5g_band','band','bandwidth','wan_active_band','nr5g_action_band','lte_action_band'
    ].join(',');
    var url = getHeaderBaseURL() + '/goform/goform_get_cmd_process?multi_data=1&isTest=false&cmd=' + encodeURIComponent(cmds) + '&_=' + Date.now();
    fetch(url, { headers: getHeaderHeaders() }).then(function (res) { return res.json(); }).then(function (data) {
      data = data || {};
      var domInfo = getDeviceInfoFromDom ? getDeviceInfoFromDom() : {};
      var ufiHome = getUfiHomeMetrics();
      var ufiRaw = ufiHome.raw || {};
      var merged = Object.assign({}, ufiRaw, data);
      var modemRaw = pickHomeFromDataOrDom(merged, ['modem_main_state','ppp_status','rj45_state'], ['模组状态','设备状态','运行状态','联网状态']);
      var modem = normalizeHomeState(modemRaw);
      var up = firstClean(merged, ['system_uptime','uptime','up_time','running_time','run_time','runtime','device_uptime','router_uptime','power_on_time','online_time','runningTime','upTime','boot_time','boottime','system_boot_time','device_start_time','start_time']);
      var uptimeText = formatUptimeSmart(up) || pickHomeMetricFromDom(['运行时间','运行时长','开机时间','已运行','在线时间','系统运行时间']) || '';
      if (!uptimeText && ufiHome.uptime) uptimeText = ufiHome.uptime;
      var connectionRaw = firstClean(merged, ['connection_time','connect_time','connected_time','connect_duration','connection_duration','ppp_uptime','wan_uptime','network_uptime','online_duration']);
      var connectionText = pickHomeConnectionDurationFromBasicStatus() || normalizeHomeConnectionDuration(connectionRaw) || pickHomeConnectionDurationFromText();
      if (!connectionText) connectionText = normalizeHomeConnectionDuration(pickHomeMetricFromDom(['连接时长','连接时间','联网时长','在线时长','已连接时长']));
      var operator = pickHomeFromDataOrDom(merged, ['network_provider','spn_name'], ['运营商','网络运营商']);
      var netType = pickHomeFromDataOrDom(merged, ['network_type'], ['网络类型','制式']);
      var signal = normalizeSignal(merged.signalbar || merged.network_signalbar || pickHomeMetricFromDom(['信号格','信号强度']) || 0);
      var simRaw = pickHomeFromDataOrDom(merged, ['simcard_status','sim_status','sim_state'], ['SIM状态','SIM 卡状态','SIM卡状态']);
      var simState = normalizeSimState(simRaw) || '--';
      var phone = firstClean(merged, ['msisdn','mdn','sim_phone_number','own_number','my_number','tel_number','phone_number']) || domInfo.phone || pickHomeMetricFromDom(['手机号','本机号码','号码','SIM号码','SIM 号码','MDN']);
      var roam = pickHomeFromDataOrDom(merged, ['simcard_roam','roam_status'], ['漫游状态','是否漫游']);
      var imei = firstClean(merged, ['imei']) || domInfo.imei || pickHomeMetricFromDom(['IMEI']);
      var imsi = firstClean(merged, ['imsi','sim_imsi']) || domInfo.imsi || pickHomeMetricFromDom(['IMSI']);
      var iccid = firstClean(merged, ['iccid']) || domInfo.iccid || pickHomeMetricFromDom(['ICCID']);
      var model = pickHomeFromDataOrDom(merged, ['model_name','product_model','device_model','device_name'], ['设备型号','产品型号','型号','设备名称']);
      var hw = pickHomeFromDataOrDom(merged, ['hardware_version','wa_outer_version'], ['硬件版本','硬件型号']);
      var sw = pickHomeFromDataOrDom(merged, ['software_version','firmware_version','wa_inner_version','cr_version','version'], ['软件版本','固件版本','内核版本','版本号']);
      var web = pickHomeFromDataOrDom(merged, ['web_version','webui_version'], ['WebUI版本','Web 版本','网页版本']);
      var memSubOverride = ufiHome.memSub || '';
      var cpu = ufiHome.cpuUsage || firstHomePercent(firstClean(merged, ['cpu_usage','cpu_used','cpu_load'])) || pickHomePercentFromText(['CPU 占用','CPU占用','CPU 使用率','CPU']);
      var load = firstClean(merged, ['load_avg','loadavg']) || pickHomeMetricFromDom(['负载','Load','系统负载']);
      var memUsage = ufiHome.memUsage || firstHomePercent(firstClean(merged, ['mem_usage','memory_usage','ram_usage'])) || pickHomePercentFromText(['内存占用','内存使用','内存占用率','内存使用率']);
      var memUsed = formatBytes(firstClean(merged, ['mem_used','ram_used']));
      var memTotal = formatBytes(firstClean(merged, ['mem_total','ram_total']));
      var memFree = formatBytes(firstClean(merged, ['mem_free','ram_free']));
      var temp = ufiHome.cpuTemp || formatTemperature(firstClean(merged, ['temperature','temp','modem_temp','cpu_temperature','cpu_temp','chip_temp','thermal'])) || pickHomeTemperatureFromText(['设备温度','CPU温度','CPU 温度','温度','芯片温度']);
      var tempParts = [
        ['CPU', formatTemperature(merged.cpu_temperature || merged.cpu_temp)],
        ['模组', formatTemperature(merged.modem_temp || merged.temperature || merged.temp)],
        ['芯片', formatTemperature(merged.chip_temp || merged.thermal)],
        ['电池', formatTemperature(merged.battery_temp || merged.battery_temperature)]
      ].filter(function (x) { return x[1]; }).map(function (x) { return x[0] + ' ' + x[1]; });
      var tempSub = tempParts.join(' / ') || (ufiHome.cpuTemp ? 'UFI_DATA · CPU 温度' : pickHomeMetricFromDom(['温度详情','温度状态']));
      var storageDom = getHomeStorageFromDom();
      var storageUsage = parsePercentValue(firstClean(merged, ['storage_usage','flash_usage','rom_usage','disk_usage','emmc_usage']) || storageDom.usage);
      var diskUsed = normalizeCapacity(firstClean(merged, ['disk_used','rom_used','flash_used','storage_used','emmc_used']) || storageDom.used);
      var diskTotal = normalizeCapacity(firstClean(merged, ['disk_total','rom_total','flash_total','storage_total','emmc_total']) || storageDom.total);
      var diskFree = normalizeCapacity(firstClean(merged, ['disk_free','rom_free','flash_free','storage_free','emmc_free']) || storageDom.free);
      var sdUsed = normalizeCapacity(firstClean(merged, ['sd_used','sdcard_used','sd_card_used']));
      var sdTotal = normalizeCapacity(firstClean(merged, ['sd_total','sdcard_total','sd_card_total']));
      var sdFree = normalizeCapacity(firstClean(merged, ['sd_free','sdcard_free','sd_card_free']));
      var internalStorageText = storageDom.internalText || (diskUsed && diskTotal ? diskUsed + ' / ' + diskTotal : '');
      var sdStorageText = storageDom.sdText || (sdUsed && sdTotal ? sdUsed + ' / ' + sdTotal : '');
      var battery = parsePercentValue(firstClean(merged, ['battery_capacity','battery_percent','battery_value'])) || pickHomeMetricFromDom(['电量','电池电量']);
      var batteryStatus = pickHomeFromDataOrDom(merged, ['battery_status','battery_charging'], ['电池状态','充电状态']);
      var wifiCount = resolveWifiClientCount(merged);
      var tx = formatBytes(firstClean(merged, ['realtime_tx_bytes','realtime_tx_thrpt']));
      var rx = formatBytes(firstClean(merged, ['realtime_rx_bytes','realtime_rx_thrpt']));
      var totalTx = formatBytes(firstClean(merged, ['monthly_tx_bytes','total_tx_bytes']));
      var totalRx = formatBytes(firstClean(merged, ['monthly_rx_bytes','total_rx_bytes']));
      var ipList = collectHomeIps(merged, domInfo);
      var lanIpList = collectHomeLanIPv4Values(merged, domInfo);
      var clientIp = lanIpList[0] || extractHomeIPv4Values(domInfo.clientIp || firstClean(merged, ['client_ip','station_ip_addr','local_ip_addr','lan_ipaddr','ipv4_wan_ipaddr','wan_ipaddr']))[0] || '';
      var ipv6Addr = extractHomeIPv6Values(domInfo.ipv6 || firstClean(merged, ['ipv6_wan_ipaddr','wan_ipaddr6','ipv6_ip_addr','ipv6_pdp_addr'])).join(' ｜ ');
      var gatewayAddr = extractHomeIPv4Values(domInfo.gateway || firstClean(merged, ['gateway','ipv4_gateway','default_gateway'])).filter(function (x) { return x !== clientIp; })[0] || '';
      var macAddr = domInfo.mac || extractHomeMacValue(pickHomeMetricFromDom(['MAC地址','MAC 地址','MAC']));
      var dnsRaw = joinHomeValues([firstClean(merged, ['dns1','ipv4_dns1','dns']), firstClean(merged, ['dns2','ipv4_dns2'])], ' / ') || pickHomeMetricFromDom(['DNS服务器','DNS 服务器','DNS']);
      var dnsVals = extractHomeIPv4Values(dnsRaw).concat(extractHomeIPv6Values(dnsRaw));
      var dnsText = dnsVals.length ? dnsVals.join(' / ') : sanitizeHomeDisplayValue(dnsRaw, 'DNS');
      var ipMain = lanIpList.length ? lanIpList.join(' ｜ ') : (clientIp || '--');
      var rsrp = pickHomeRadioValue(merged, ['nr5g_rsrp','nr_rsrp','lte_rsrp','rsrp'], ['RSRP','5G RSRP','NR RSRP','LTE RSRP'], 'RSRP');
      var rsrq = pickHomeRadioValue(merged, ['nr5g_rsrq','nr_rsrq','lte_rsrq','rsrq'], ['RSRQ','5G RSRQ','NR RSRQ','LTE RSRQ'], 'RSRQ');
      var sinr = pickHomeRadioValue(merged, ['nr5g_sinr','nr5g_snr','nr_sinr','lte_sinr','lte_snr','sinr','snr'], ['SINR','SNR','5G SINR','NR SINR','LTE SINR'], 'SINR');
      rsrp = stabilizeHomeRadioMetric('rsrp', rsrp);
      rsrq = stabilizeHomeRadioMetric('rsrq', rsrq);
      sinr = stabilizeHomeRadioMetric('sinr', sinr);
      var rssi = pickHomeRadioValue(merged, ['nr5g_rssi','lte_rssi','rssi'], ['RSSI','5G RSSI','LTE RSSI'], 'RSSI');
      var pci = pickHomeRadioValue(merged, ['pci','lte_pci','nr5g_pci'], ['PCI'], 'PCI');
      var band = pickHomeRadioValue(merged, ['nr5g_band','lte_band','band','wan_active_band','nr5g_action_band','lte_action_band'], ['频段','Band','网络频段'], 'BAND');
      var radioMain = joinHomeValues([rsrp ? 'RSRP ' + rsrp : '', sinr ? 'SINR ' + sinr : '', rssi ? 'RSSI ' + rssi : ''], ' / ');
      var radioSub = joinHomeValues([rsrq ? 'RSRQ ' + rsrq : '', band ? '频段 ' + band : '', pci ? 'PCI ' + pci : ''], ' / ');
      var cell = joinHomeValues([
        firstClean(merged, ['cell_id','lte_cell_id','nr5g_cell_id']) || pickHomeMetricFromDom(['小区ID','小区 ID','Cell ID','小区']),
        firstClean(merged, ['lac','tac']) ? 'TAC/LAC ' + firstClean(merged, ['lac','tac']) : (pickHomeMetricFromDom(['TAC','LAC']) ? 'TAC/LAC ' + pickHomeMetricFromDom(['TAC','LAC']) : ''),
        firstClean(merged, ['earfcn','nrarfcn']) ? '频点 ' + firstClean(merged, ['earfcn','nrarfcn']) : (pickHomeMetricFromDom(['频点','EARFCN','NRARFCN']) ? '频点 ' + pickHomeMetricFromDom(['频点','EARFCN','NRARFCN']) : '')
      ], ' / ');
      setHomeTitle('#kn-home-modem', connectionText || '连接时长读取中');
      setHomeTitle('#kn-home-uptime', modem ? ('状态 ' + modem) : (uptimeText ? ('系统运行 ' + uptimeText) : '等待基本状态连接时长'));
      if (!connectionText && !uptimeText) refreshHomeUptimeFallback(false);
      setHomeTitle('#kn-home-network', [operator, netType].filter(Boolean).join(' · ') || '--');
      setHomePhoneLine(phone, operator);
      setHomeTitle('#kn-home-signal', '信号 ' + signal + ' / 5' + (merged.ppp_status ? ' · ' + merged.ppp_status : ''));
      setHomeTitle('#kn-home-sim', simState || '--');
      setHomeTitle('#kn-home-sim-sub', '号码 ' + (phone || '--'));
      setHomeTitle('#kn-home-ip', ipMain || '--');
      setHomeTitle('#kn-home-ip-sub', lanIpList.length ? '设备管理 IPv4' : '未读取到设备管理 IPv4');
      setHomeTitle('#kn-home-cpu', cpu || '--');
      setHomeTitle('#kn-home-load', '负载 ' + (load || '--'));
      setHomeTitle('#kn-home-memory', memUsage || (memUsed && memTotal ? memUsed + ' / ' + memTotal : '--'));
      setHomeTitle('#kn-home-memory-sub', memSubOverride || (memFree ? ('可用 ' + memFree) : (memUsed && memTotal ? '已用 / 总量' : '--')));
      setHomeTitle('#kn-home-temp', temp || '--');
      setHomeTitle('#kn-home-temp-sub', tempSub || 'CPU / 电池 / 芯片');
      setHomeTitle('#kn-home-storage', storageUsage || internalStorageText || '--');
      setHomeTitle('#kn-home-storage-sub', sdStorageText ? ('SD ' + sdStorageText) : (diskFree ? ('可用 ' + diskFree) : (internalStorageText ? '内部存储 已用 / 总量' : '--')));
      setHomeTitle('#kn-home-wifi', typeof wifiCount === 'number' ? wifiCount + ' 台' : '--');
      setHomeTitle('#kn-home-wifi-sub', '接入设备 ' + (typeof wifiCount === 'number' ? wifiCount : '--'));
      setHomeTitle('#kn-home-traffic', (rx || tx) ? ('↓ ' + (rx || '--') + ' / ↑ ' + (tx || '--')) : '--');
      setHomeTitle('#kn-home-traffic-sub', (totalRx || totalTx) ? ('累计 ↓ ' + (totalRx || '--') + ' / ↑ ' + (totalTx || '--')) : '实时 --');
      setHomeTitle('#kn-home-radio', radioMain || '--');
      setHomeTitle('#kn-home-radio-sub', radioSub || 'RSRP / RSRQ / SINR');
      setHomeTitle('#kn-home-version', model || '--');
      setHomeTitle('#kn-home-version-sub', sw || web || hw || '固件 / WebUI');
      setHomeRows('#kn-home-detail-sim', [
        ['SIM状态', simState], ['手机号', phone], ['运营商', operator], ['漫游', roam || '--']
      ]);
      setHomeRows('#kn-home-detail-device', [
        ['IMEI', imei], ['IMSI', imsi], ['ICCID', iccid], ['型号', model], ['内部存储', internalStorageText || '--'], ['SD卡', sdStorageText || '--']
      ]);
      setHomeRows('#kn-home-detail-ip', [
        ['客户端IP', clientIp || '--'], ['IPv6地址', ipv6Addr || '--'], ['本地网关', gatewayAddr || '--'], ['MAC', macAddr || '--'], ['DNS', dnsText || '--'], ['连接', firstClean(merged, ['ppp_status','rj45_state']) || pickHomeMetricFromDom(['连接状态','联网状态'])]
      ]);
      setHomeRows('#kn-home-detail-radio', [
        ['软件版本', sw], ['WebUI版本', web], ['硬件版本', hw], ['RSRP', rsrp], ['RSRQ', rsrq], ['SINR', sinr], ['RSSI', rssi], ['频段', band], ['PCI', pci], ['小区', cell], ['电池', joinHomeValues([battery, batteryStatus], ' · ')]
      ]);
      updateHomeDashboardFusion(merged, {
        rsrp: rsrp, rsrq: rsrq, sinr: sinr, rssi: rssi, pci: pci, band: band,
        operator: operator, netType: netType, wifiCount: wifiCount,
        ipv6Addr: ipv6Addr, gatewayAddr: gatewayAddr, iccid: iccid, imei: imei,
        temp: temp, memUsage: memUsage, storageUsage: storageUsage,
        internalStorageText: internalStorageText,
        sdStorageText: sdStorageText
      });
      setHomeLastUpdate(true);
      if (force && typeof createToast === 'function') createToast('首页设备状态已刷新', 'green');
    }).catch(function (err) {
      console.warn('[KanoWebOS] 首页设备状态读取失败:', err);
      var rb = document.querySelector('#' + HOME_DASHBOARD_ID + ' [data-home-action="refresh"]');
      if (rb) rb.title = '上次读取失败，已保留旧数据';
      setHomeLastUpdate(false);
      if (force && typeof createToast === 'function') createToast('首页设备状态读取失败，已保留旧数据', 'red');
    }).finally(function () { state.homeBusy = false; setHomeRefreshBusy(false); syncHomeRefreshControls(); });
  }

  function getHeaderBaseURL() {
    try { if (typeof KANO_baseURL !== 'undefined' && KANO_baseURL) return KANO_baseURL; } catch (e) {}
    return '/api';
  }

  function getHeaderHeaders() {
    try { if (typeof common_headers !== 'undefined' && common_headers) return Object.assign({}, common_headers); } catch (e) {}
    return {};
  }

  function maskPhone(phone) {
    // Header 设备信息只在本机管理后台展示；这里不做脱敏，便于运维直接核对号码。
    var raw = clean(phone);
    return raw || '--';
  }

  function getStoredLoginState() {
    var token = '';
    var pwd = '';
    try {
      token = localStorage.getItem('kano_sms_token') || localStorage.getItem('KANO_TOKEN') || localStorage.getItem('kano_token') || '';
      pwd = localStorage.getItem('kano_sms_pwd') || localStorage.getItem('KANO_PASSWORD') || localStorage.getItem('kano_password') || '';
    } catch (e) {}
    try { if (typeof KANO_TOKEN !== 'undefined' && KANO_TOKEN) token = KANO_TOKEN; } catch (e) {}
    try { if (typeof KANO_PASSWORD !== 'undefined' && KANO_PASSWORD) pwd = KANO_PASSWORD; } catch (e) {}
    try { if (typeof common_headers !== 'undefined' && common_headers && common_headers.authorization) token = common_headers.authorization; } catch (e) {}
    return Boolean(token || pwd);
  }

  function updateHeaderLoginState() {
    var btn = document.getElementById('kn-header-login-btn');
    var text = document.getElementById('kn-header-login-text');
    if (!btn || !text) return;
    var isLogin = getStoredLoginState();
    btn.classList.toggle('is-login', isLogin);
    btn.classList.toggle('is-logout', !isLogin);
    text.textContent = isLogin ? '已登录' : '未登录';
    btn.title = '账号：' + (isLogin ? '已登录' : '未登录') + '，点击展开账户菜单';
    btn.setAttribute('aria-label', '账号菜单，当前' + (isLogin ? '已登录' : '未登录'));
    updateNativeForwardControls();
  }

  function closeHeaderLoginMenu() {
    var wrap = document.getElementById('kn-header-login-wrap');
    if (wrap) wrap.classList.remove('open');
  }

  function closeHeaderToolMenus() {
    Array.prototype.slice.call(document.querySelectorAll('.kn-header-tool-menu-wrap.open')).forEach(function (wrap) {
      wrap.classList.remove('open');
    });
  }

  function isHeaderMobileViewport() {
    var width = window.innerWidth || document.documentElement.clientWidth || 0;
    return width > 0 && width <= 980;
  }

  function resetHeaderNetworkPopoverStyle(pop) {
    if (!pop) return;
    ['position', 'left', 'right', 'top', 'width', 'maxWidth', 'maxHeight', 'overflow', 'zIndex', 'display'].forEach(function (prop) {
      try { pop.style[prop] = ''; } catch (e) {}
    });
  }

  function restoreHeaderNetworkPopoverHome() {
    var pill = document.getElementById('kn-header-net-pill');
    var pop = document.getElementById('kn-header-net-pop');
    if (!pill || !pop) return;
    if (pop.parentElement !== pill) pill.appendChild(pop);
    pop.classList.remove('kn-net-pop-open', 'kn-net-pop-mobile-portal');
    resetHeaderNetworkPopoverStyle(pop);
  }

  function positionHeaderNetworkPopover() {
    var pill = document.getElementById('kn-header-net-pill');
    var pop = document.getElementById('kn-header-net-pop');
    if (!pill || !pop || !pill.classList.contains('open')) return;

    pop.classList.add('kn-net-pop-open');

    if (!isHeaderMobileViewport()) {
      if (pop.parentElement !== pill) pill.appendChild(pop);
      pop.classList.remove('kn-net-pop-mobile-portal');
      resetHeaderNetworkPopoverStyle(pop);
      return;
    }

    // 手机端关键修复：把弹层临时挂到 body，避免被运营商胶囊或 header 的 overflow / backdrop-filter 裁剪。
    if (pop.parentElement !== document.body) document.body.appendChild(pop);
    pop.classList.add('kn-net-pop-mobile-portal');

    var header = document.getElementById(HEADER_ID);
    var vh = window.innerHeight || document.documentElement.clientHeight || 640;
    var rect = header && header.getBoundingClientRect ? header.getBoundingClientRect() : null;
    var top = rect ? Math.ceil(rect.bottom + 10) : 154;
    top = Math.max(8, Math.min(top, Math.max(8, vh - 180)));

    pop.style.position = 'fixed';
    pop.style.left = '10px';
    pop.style.right = '10px';
    pop.style.top = top + 'px';
    pop.style.width = 'auto';
    pop.style.maxWidth = 'none';
    pop.style.maxHeight = 'calc(100dvh - ' + (top + 12) + 'px)';
    pop.style.overflow = 'auto';
    pop.style.zIndex = '1000000';
    pop.style.display = 'block';
  }

  function closeHeaderNetworkPopover() {
    var pill = document.getElementById('kn-header-net-pill');
    var pop = document.getElementById('kn-header-net-pop');
    if (pill) pill.classList.remove('open');
    if (pop) restoreHeaderNetworkPopoverHome();
  }

  function toggleHeaderNetworkPopover(e) {
    if (e && e.stopPropagation) e.stopPropagation();
    var pill = document.getElementById('kn-header-net-pill');
    if (!pill) return;
    var willOpen = !pill.classList.contains('open');
    closeHeaderNetworkPopover();
    if (willOpen) {
      pill.classList.add('open');
      positionHeaderNetworkPopover();
      refreshHeaderNetworkInfo(true);
    refreshHomeDashboardStatus(true);
    }
  }

  function toggleHeaderToolMenu(name, e) {
    if (e && e.stopPropagation) e.stopPropagation();
    var wrap = document.getElementById('kn-header-' + name + '-wrap');
    if (!wrap) return;
    var willOpen = !wrap.classList.contains('open');
    closeHeaderToolMenus();
    if (willOpen) wrap.classList.add('open');
  }

  function toggleHeaderLoginMenu(e) {
    if (e && e.stopPropagation) e.stopPropagation();
    var wrap = document.getElementById('kn-header-login-wrap');
    if (!wrap) return;
    wrap.classList.toggle('open');
    updateHeaderLoginState();
  }

  function getNativeActionMeta(action) {
    if (action === 'login') {
      return {
        cacheKey: 'nativeLoginBtn',
        label: '登录/登出',
        missing: '没有找到原平台的「登录/登出」入口',
        panelKeywords: ['登录', '登出', 'token'],
        match: function (text, onclick, title) {
          return onclick.indexOf('loginModal') !== -1 || onclick.indexOf('tokenModal') !== -1 || onclick.indexOf('logout') !== -1 || text === '登录/登出' || (text.indexOf('登录') !== -1 && text.indexOf('登出') !== -1) || (title.indexOf('登录') !== -1 && title.indexOf('登出') !== -1);
        }
      };
    }
    if (action === 'command') {
      return {
        cacheKey: 'nativeCommandPwdBtn',
        label: '更改口令',
        missing: '没有找到原平台的「更改口令」入口',
        panelKeywords: ['更改口令', '修改口令', '口令'],
        match: function (text, onclick, title) {
          return text === '更改口令' || text.indexOf('更改口令') !== -1 || text.indexOf('修改口令') !== -1 || text.indexOf('改口令') !== -1 || title.indexOf('更改口令') !== -1 || onclick.indexOf('change') !== -1 && onclick.indexOf('cmd') !== -1;
        }
      };
    }
    if (action === 'password') {
      return {
        cacheKey: 'nativePasswordBtn',
        label: '更改密码',
        missing: '没有找到原平台的「更改密码」入口',
        panelKeywords: ['更改密码', '修改密码', '密码'],
        match: function (text, onclick, title) {
          return text === '更改密码' || text.indexOf('更改密码') !== -1 || text.indexOf('修改密码') !== -1 || text.indexOf('改密码') !== -1 || title.indexOf('更改密码') !== -1 || onclick.indexOf('password') !== -1 || onclick.indexOf('passwd') !== -1;
        }
      };
    }
    if (action === 'deviceProps') {
      return {
        cacheKey: 'nativeDevicePropsBtn',
        label: '设备属性',
        missing: '没有找到原平台的「设备属性」入口',
        panelKeywords: ['设备属性', '设备信息', '设备详情', 'IMEI', 'IMSI', 'ICCID', '固件版本', '软件版本', '硬件版本', '型号'],
        match: function (text, onclick, title) {
          var combo = clean(text + ' ' + title);
          var o = onclick.toLowerCase();
          return text === '设备属性' ||
            combo.indexOf('设备属性') !== -1 ||
            combo.indexOf('设备信息') !== -1 ||
            combo.indexOf('设备详情') !== -1 ||
            combo.indexOf('关于设备') !== -1 ||
            o.indexOf('device') !== -1 && (o.indexOf('info') !== -1 || o.indexOf('property') !== -1 || o.indexOf('attr') !== -1 || o.indexOf('detail') !== -1) ||
            o.indexOf('terminal') !== -1 && o.indexOf('info') !== -1;
        }
      };
    }
    if (action === 'wifiInfo' || action === 'wifiSettings') {
      return {
        cacheKey: action === 'wifiSettings' ? 'nativeWifiSettingsBtn' : 'nativeWifiInfoBtn',
        label: action === 'wifiSettings' ? 'WiFi设置' : 'WiFi情况',
        missing: action === 'wifiSettings' ? '没有找到原平台的「WiFi设置」入口' : '没有找到原平台的「WiFi情况」入口',
        panelKeywords: ['WiFi设置', 'WIFI设置', 'Wi-Fi设置', '无线设置', 'WLAN设置', 'SSID', 'WiFi名称', 'WIFI名称'],
        match: function (text, onclick, title) {
          var combo = clean(text + ' ' + title);
          var tc = combo.replace(/\s+/g, '').toLowerCase();
          var o = onclick.toLowerCase();
          return combo.indexOf('WiFi设置') !== -1 ||
            combo.indexOf('WIFI设置') !== -1 ||
            combo.indexOf('Wi-Fi设置') !== -1 ||
            combo.indexOf('WiFi 设置') !== -1 ||
            combo.indexOf('WIFI 设置') !== -1 ||
            combo.indexOf('无线设置') !== -1 ||
            combo.indexOf('WLAN设置') !== -1 ||
            combo.indexOf('热点设置') !== -1 ||
            tc.indexOf('wifi设置') !== -1 ||
            tc.indexOf('wlan设置') !== -1 ||
            o.indexOf('wifi') !== -1 && (o.indexOf('setting') !== -1 || o.indexOf('config') !== -1 || o.indexOf('set') !== -1) ||
            o.indexOf('wlan') !== -1 && (o.indexOf('setting') !== -1 || o.indexOf('config') !== -1 || o.indexOf('set') !== -1);
        }
      };
    }
    if (action === 'accessDevices') {
      return {
        cacheKey: 'nativeAccessDevicesBtn',
        label: '接入设备',
        missing: '没有找到原平台的「接入设备」入口',
        panelKeywords: ['接入设备', '已连接设备', '连接设备', '终端设备', '客户端列表', '接入类型', '无线'],
        match: function (text, onclick, title) {
          var combo = clean(text + ' ' + title);
          var tc = combo.replace(/\s+/g, '').toLowerCase();
          var o = onclick.toLowerCase();
          return combo.indexOf('接入设备') !== -1 ||
            combo.indexOf('已连接设备') !== -1 ||
            combo.indexOf('连接设备') !== -1 ||
            combo.indexOf('终端设备') !== -1 ||
            combo.indexOf('客户端') !== -1 && combo.indexOf('列表') !== -1 ||
            tc.indexOf('接入设备') !== -1 ||
            tc.indexOf('连接设备') !== -1 ||
            tc.indexOf('client') !== -1 && (tc.indexOf('list') !== -1 || tc.indexOf('device') !== -1) ||
            o.indexOf('client') !== -1 && (o.indexOf('list') !== -1 || o.indexOf('device') !== -1) ||
            o.indexOf('station') !== -1 && (o.indexOf('list') !== -1 || o.indexOf('device') !== -1) ||
            o.indexOf('wifi') !== -1 && (o.indexOf('client') !== -1 || o.indexOf('device') !== -1);
        }
      };
    }

    if (action === 'smsForward') {
      return {
        cacheKey: 'nativeSmsForwardBtn',
        label: '短信转发',
        missing: '没有找到原平台的「短信转发」入口',
        panelKeywords: ['短信转发', '消息转发', 'Webhook地址', 'SMTP方式', 'CURL方式', '钉钉方式', '电源状态通知', '转发规则'],
        match: function (text, onclick, title) {
          var combo = clean(text + ' ' + title);
          var tc = combo.replace(/\s+/g, '').toLowerCase();
          var o = onclick.toLowerCase();
          return combo.indexOf('短信转发') !== -1 ||
            combo.indexOf('消息转发') !== -1 ||
            combo.indexOf('转发规则') !== -1 ||
            tc.indexOf('smsforward') !== -1 ||
            tc.indexOf('messageforward') !== -1 ||
            o.indexOf('sms') !== -1 && o.indexOf('forward') !== -1 ||
            o.indexOf('forward') !== -1 && (o.indexOf('message') !== -1 || o.indexOf('webhook') !== -1);
        }
      };
    }
    if (action === 'pluginFeature') {
      return {
        cacheKey: 'nativePluginFeatureBtn',
        label: '插件功能',
        missing: '没有找到原平台的「插件功能」入口',
        panelKeywords: ['插件功能', '插件管理', '插件列表', '添加插件', '插件商店', '启用', '停用', '导入', '导出', '清空全部', '上传文件'],
        match: function (text, onclick, title) {
          var combo = clean(text + ' ' + title);
          var tc = combo.replace(/\s+/g, '').toLowerCase();
          var o = onclick.toLowerCase();
          return combo.indexOf('插件功能') !== -1 ||
            combo.indexOf('插件管理') !== -1 ||
            combo.indexOf('插件商店') !== -1 ||
            combo.indexOf('插件列表') !== -1 ||
            combo.indexOf('添加插件') !== -1 ||
            combo.indexOf('导入插件') !== -1 ||
            tc.indexOf('plugin') !== -1 ||
            o.indexOf('plugin') !== -1 ||
            o.indexOf('addon') !== -1 ||
            o.indexOf('extension') !== -1;
        }
      };
    }
    return null;
  }

  function isElementVisibleEnough(el) {
    if (!el || !(el instanceof HTMLElement)) return false;
    var rect = el.getBoundingClientRect();
    var style = window.getComputedStyle ? window.getComputedStyle(el) : null;
    if (style && (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0)) return false;
    return rect.width > 0 && rect.height > 0;
  }

  function scoreNativeActionCandidate(el, meta) {
    var onclick = String(el.getAttribute('onclick') || '').toLowerCase();
    var title = clean(el.getAttribute('title') || el.getAttribute('aria-label') || '');
    var text = clean(el.innerText || el.textContent || el.value || '');
    var tag = (el.tagName || '').toLowerCase();
    var score = 0;

    if (!meta.match(text, onclick, title)) return -9999;
    if (text === meta.label || title === meta.label) score += 120;
    if ((text + title).indexOf(meta.label) !== -1) score += 60;
    if (tag === 'button' || tag === 'input') score += 34;
    if (el.getAttribute('role') === 'button') score += 20;
    if (onclick) score += 18;
    if (isElementVisibleEnough(el)) score += 18;
    if ((text || '').length > 48) score -= 45;
    if ((text || '').length > 120) score -= 100;
    if (el.closest && el.closest('dialog,.modal,.popup,.drawer')) score -= 16;
    if (el.disabled || el.getAttribute('aria-disabled') === 'true') score -= 200;

    return score;
  }

  function findNativeActionButton(action) {
    var meta = getNativeActionMeta(action);
    if (!meta) return null;
    if (state[meta.cacheKey] && document.documentElement.contains(state[meta.cacheKey])) return state[meta.cacheKey];

    var list = Array.prototype.slice.call(document.querySelectorAll('button, input[type="button"], input[type="submit"], [role="button"], .btn'));
    var candidates = list.filter(function (el) {
      if (!el) return false;
      if (el.closest && el.closest('#' + HEADER_ID)) return false;
      if (el.id === HEADER_ID || el.id === DIALOG_ID) return false;
      return scoreNativeActionCandidate(el, meta) > -9999;
    }).sort(function (a, b) {
      return scoreNativeActionCandidate(b, meta) - scoreNativeActionCandidate(a, meta);
    });

    var found = candidates[0] || null;
    if (found) state[meta.cacheKey] = found;
    return found;
  }

  function findNativeLoginButton() {
    return findNativeActionButton('login');
  }

  function scoreNativePanelCandidate(el, meta) {
    if (!el || !(el instanceof HTMLElement) || !meta) return -9999;
    if (el.closest && el.closest('#' + HEADER_ID + ',#' + DIALOG_ID)) return -9999;
    if (el === document.body || el === document.documentElement) return -9999;

    var text = clean(el.innerText || el.textContent || '');
    var idClassTitle = clean((el.id || '') + ' ' + (typeof el.className === 'string' ? el.className : '') + ' ' + (el.getAttribute('title') || ''));
    if (!text && !idClassTitle) return -9999;
    if (text.length > 6000) return -300;

    var score = 0;
    var hay = text + ' ' + idClassTitle;
    (meta.panelKeywords || [meta.label]).forEach(function (kw) {
      if (!kw) return;
      if (hay.indexOf(kw) !== -1) score += kw === meta.label ? 70 : 22;
    });

    if (text.indexOf(meta.label) === 0) score += 50;
    if (el.querySelector && el.querySelector('.title,.modal-title,.card-title,h1,h2,h3')) {
      var head = clean(el.querySelector('.title,.modal-title,.card-title,h1,h2,h3').innerText || '');
      if (head.indexOf(meta.label) !== -1) score += 60;
    }
    if (isElementVisibleEnough(el)) score += 16;
    if (el.matches && el.matches('dialog,.modal,.popup,.drawer,.box,.card,.collapse_box')) score += 16;
    if (text.length > 1200) score -= 25;

    return score > 0 ? score : -9999;
  }

  function findNativeActionPanel(action) {
    var meta = getNativeActionMeta(action);
    if (!meta) return null;
    var selector = 'dialog,.modal,.popup,.drawer,.box,.card,.collapse_box,section,article,div[id],div[class]';
    var list = Array.prototype.slice.call(document.querySelectorAll(selector));
    var candidates = list.filter(function (el) {
      return scoreNativePanelCandidate(el, meta) > -9999;
    }).sort(function (a, b) {
      return scoreNativePanelCandidate(b, meta) - scoreNativePanelCandidate(a, meta);
    });
    return candidates[0] || null;
  }

  function revealNativePanelForAction(action) {
    var panel = findNativeActionPanel(action);
    if (!panel) return false;

    try {
      if (typeof panel.showModal === 'function' && !panel.open) {
        panel.showModal();
      } else if (typeof showModal === 'function' && panel.id) {
        showModal('#' + panel.id);
      } else {
        var target = panel;
        var modal = panel.closest && panel.closest('dialog,.modal,.popup,.drawer');
        if (modal) target = modal;
        target.classList.remove(HIDDEN_CLASS);
        target.style.removeProperty('display');
        target.style.removeProperty('visibility');
        target.style.removeProperty('opacity');
        if (!isElementVisibleEnough(target)) {
          target.style.display = target.matches && target.matches('.modal,.popup,.drawer') ? 'flex' : 'block';
        }
      }
    } catch (e) {
      try {
        panel.classList.remove(HIDDEN_CLASS);
        panel.style.display = 'block';
      } catch (err) {}
    }

    try {
      panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
      panel.classList.add('kn-header-focus-highlight');
      setTimeout(function () {
        if (document.documentElement.contains(panel)) panel.classList.remove('kn-header-focus-highlight');
      }, 2600);
    } catch (e) {}

    return true;
  }

  function triggerHeaderMenuAction(action) {
    var nativeBtn = findNativeActionButton(action);
    if (nativeBtn) {
      try { nativeBtn.click(); } catch (e) {}
      setTimeout(function () { revealNativePanelForAction(action); }, 220);
      setTimeout(updateHeaderLoginState, 800);
      setTimeout(updateHeaderLoginState, 1800);
      return;
    }

    if (action === 'login') {
      var modal = document.getElementById('loginModal') || document.getElementById('tokenModal');
      if (modal) {
        try {
          if (typeof showModal === 'function') showModal('#' + modal.id);
          else if (typeof modal.showModal === 'function') modal.showModal();
          else modal.style.display = 'flex';
          return;
        } catch (e) {}
      }
    }

    if (revealNativePanelForAction(action)) return;

    var meta = getNativeActionMeta(action);
    var msg = meta ? meta.missing : '没有找到对应入口';
    if (typeof createToast === 'function') createToast(msg, 'red');
    else console.warn('[KanoWebOS] ' + msg);
  }

  function triggerHeaderLoginDialog() {
    triggerHeaderMenuAction('login');
  }

  function getDeviceInfoFromDom() {
    function pick(label, maxLen) {
      return pickHomeValueFromText([label], { maxLen: maxLen || 80 });
    }
    var clientRaw = pick('客户端IP') || pick('客户端 IP') || pick('本机IP') || pick('本机 IP') || pick('WAN IP') || pick('IPv4');
    var ipv6Raw = pick('IPv6地址', 160) || pick('IPv6 地址', 160) || pick('IPv6', 160);
    var gatewayRaw = pick('本地网关') || pick('默认网关') || pick('网关') || pick('Gateway');
    var macRaw = pick('MAC地址') || pick('MAC 地址') || pick('MAC');
    var ipv4s = extractHomeIPv4Values(clientRaw);
    var ipv6s = extractHomeIPv6Values(ipv6Raw);
    return {
      phone: pick('手机号') || pick('本机号码') || pick('SIM号码') || pick('SIM 号码') || pick('号码'),
      imei: pick('IMEI'),
      imsi: pick('IMSI'),
      iccid: pick('ICCID'),
      clientIp: ipv4s[0] || '',
      ipv6: ipv6s.join(' ｜ '),
      gateway: extractHomeIPv4Values(gatewayRaw)[0] || '',
      mac: extractHomeMacValue(macRaw),
      ip: ipv4s.concat(ipv6s).join(' ｜ ')
    };
  }


  function normalizeSignal(value) {
    var n = Number(value);
    if (!isFinite(n)) n = 0;
    if (n < 0) n = 0;
    if (n > 5) n = 5;
    return n;
  }

  function getSignalMood(signal, ppp) {
    var connected = String(ppp || '').toLowerCase().indexOf('connected') !== -1;
    if (!connected && signal <= 0) return { emoji: '😴', className: 'mood-offline', label: '网络未连接 / 无信号' };
    if (signal >= 4) return { emoji: '😊', className: 'mood-good', label: '信号良好' };
    if (signal >= 3) return { emoji: '🙂', className: 'mood-ok', label: '信号正常' };
    if (signal >= 2) return { emoji: '😟', className: 'mood-weak', label: '信号偏弱' };
    if (signal >= 1) return { emoji: '😞', className: 'mood-bad', label: '信号很弱' };
    return { emoji: '😵', className: 'mood-offline', label: '无信号' };
  }

  function updateHeaderSignalMood(signal, ppp, operator, netType) {
    var mark = document.getElementById('kn-brand-mark');
    if (!mark) return;
    var mood = getSignalMood(signal, ppp);
    mark.className = 'kn-brand-mood ' + mood.className;
    mark.textContent = mood.emoji;
    var title = mood.label + ' · ' + (operator || '--') + ' · ' + (netType || '--') + ' · 信号 ' + signal + ' / 5';
    mark.title = title;
    mark.setAttribute('aria-label', title);
  }

  function collectHeaderIps(data, domIp) {
    var ips = [];
    var add = function (value) {
      value = clean(value);
      if (!value || value === '--') return;
      value.split(/[，,\s]+|\s*\|\s*|\s*｜\s*/).forEach(function (part) {
        part = clean(part);
        if (part && ips.indexOf(part) === -1) ips.push(part);
      });
    };

    [
      data.ipv4_wan_ipaddr,
      data.ipv6_wan_ipaddr,
      data.wan_ipaddr,
      data.wan_ipaddr6,
      data.local_ip_addr,
      data.lan_ipaddr,
      data.station_ip_addr,
      data.pdp_addr,
      data.ipv6_pdp_addr,
      domIp
    ].forEach(add);

    Object.keys(data || {}).forEach(function (key) {
      if (/ip/i.test(key) && !/skip|script/i.test(key)) add(data[key]);
    });

    return ips.length ? ips.join(' ｜ ') : '--';
  }


  function adaptHeaderActionDisplay() {
    var actions = document.getElementById('kn-header-actions');
    var header = document.getElementById(HEADER_ID);
    if (!actions || !header) return;

    // 关键修复：不要用右侧 actions 自身宽度判断紧凑模式。
    // actions 本身就是 max-content，宽度天然较小，之前会在桌面端误判成 ultra-tight，导致运营商、WiFi、账号图标全部被压缩。
    var headerWidth = header.getBoundingClientRect ? header.getBoundingClientRect().width : header.offsetWidth;
    var viewportWidth = window.innerWidth || document.documentElement.clientWidth || headerWidth;
    var base = Math.min(headerWidth || viewportWidth, viewportWidth || headerWidth);

    actions.classList.toggle('is-tight', base > 0 && base < 980);
    actions.classList.toggle('is-ultra-tight', base > 0 && base < 760);
  }

  function parseWifiEnabled(data) {
    data = data || {};
    function val(key) { return data[key]; }
    function raw(key) { return clean(data[key]).toLowerCase(); }
    function has(v) { return v !== undefined && v !== null && clean(v) !== '' && clean(v) !== '--'; }
    function isOnText(v) { return /^(1|on|enable|enabled|up|open|true|yes|开启|已开启|打开|启用|已启用|active|running|正常)$/i.test(clean(v)); }
    function isOffText(v) { return /^(off|disable|disabled|down|close|closed|false|no|关闭|已关闭|未开启|停用|已停用|inactive|radiooff)$/i.test(clean(v)); }

    var band = resolveWifiBandLabel(data);
    var count = resolveWifiClientCount(data);
    var radioOff = raw('RadioOff') || raw('radioOff') || raw('wifi_radio_off') || raw('wlan_radio_off');
    var explicitRadioOff = /^(1|true|on|yes)$/i.test(radioOff);
    var explicitRadioOn = /^(0|false|off|no)$/i.test(radioOff);

    // F50/UFI 页面中“5G/2.4G”通常就是 WiFi 当前制式；它优先级高于 0/1 这类含义不稳定的字段。
    if (band && !explicitRadioOff) return true;
    if (typeof count === 'number' && isFinite(count) && count > 0 && !explicitRadioOff) return true;
    if (explicitRadioOn) return true;
    if (explicitRadioOff && !band && !(typeof count === 'number' && count > 0)) return false;

    var ssidKeys = ['SSID1','SSID2','ssid','wifi_ssid','wifi_2g_ssid','wifi_5g_ssid','m_ssid','m_ssid_2g','m_ssid_5g','ap_ssid','wlan_ssid','wifi_name','wifi_2g_name','wifi_5g_name'];
    for (var i = 0; i < ssidKeys.length; i += 1) {
      var ssid = clean(val(ssidKeys[i]));
      if (ssid && !/^(0|off|false|disabled|关闭|已关闭|null|none|unknown|--)$/i.test(ssid)) return true;
    }

    // 只信任“明确文字关闭”，不再把 0 当作关闭；很多设备用 0 表示索引/当前模式。
    var statusKeys = ['wifi_status','wlan_status','ap_status','wifi_state','wifi_mode','wifi_enable','wifi_enabled','wlan_enable','m_ssid_enable','wifi_2g_enable','wifi_5g_enable','ssid_enable','wifi_2g_switch','wifi_5g_switch','wifi_2g_state','wifi_5g_state'];
    var sawExplicitOff = false;
    for (var j = 0; j < statusKeys.length; j += 1) {
      var tv = raw(statusKeys[j]);
      if (!tv) continue;
      if (isOnText(tv)) return true;
      if (/^(2\.4g|2g|5g|5ghz|2\.4ghz|2\.4g\/5g|wifi|wlan)$/i.test(tv)) return true;
      if (isOffText(tv)) sawExplicitOff = true;
    }
    if (sawExplicitOff) return false;

    return null;
  }

  function countWifiClientsFromValue(value) {
    var raw = clean(value);
    if (!raw || raw === '--') return null;
    if (/^\d+$/.test(raw)) return Number(raw);

    try {
      var json = JSON.parse(raw);
      if (Array.isArray(json)) return json.length;
      if (json && Array.isArray(json.devices)) return json.devices.length;
      if (json && Array.isArray(json.station_list)) return json.station_list.length;
      if (json && Array.isArray(json.attached_devices)) return json.attached_devices.length;
    } catch (e) {}

    var chunks = raw.split(/;|\n|\r/).map(clean).filter(Boolean);
    if (chunks.length > 1) return chunks.length;
    return null;
  }

  function countWifiClientsFromDom() {
    var text = document.body ? ((document.body.innerText || '') + '\n' + (document.body.textContent || '')) : '';
    if (!text) return null;

    var wirelessMatches = text.match(/接入类型\s*[:：]\s*无线/g);
    if (wirelessMatches && wirelessMatches.length) return wirelessMatches.length;

    var labels = ['无线接入', '无线设备', 'WiFi接入', 'WIFI接入', 'WLAN接入'];
    for (var i = 0; i < labels.length; i += 1) {
      var reg = new RegExp(labels[i] + '\\s*[:：]\\s*(\\d+)', 'i');
      var m = text.match(reg);
      if (m) return Number(m[1]);
    }

    return null;
  }

  function resolveWifiClientCount(data) {
    var keys = [
      'wifi_access_sta_num', 'wifi_sta_num', 'sta_count', 'station_num', 'station_count',
      'ap_station_num', 'connected_devices', 'attached_devices_num', 'lan_station_num',
      'wifi_client_num', 'wlan_client_num', 'client_num'
    ];
    for (var i = 0; i < keys.length; i += 1) {
      var v = data[keys[i]];
      if (v !== undefined && v !== null && clean(v) !== '') {
        var n = Number(v);
        if (isFinite(n)) return Math.max(0, n);
      }
    }

    var listKeys = ['station_list', 'wifi_client_list', 'wlan_client_list', 'attached_devices', 'client_list'];
    for (var j = 0; j < listKeys.length; j += 1) {
      var c = countWifiClientsFromValue(data[listKeys[j]]);
      if (typeof c === 'number' && isFinite(c)) return Math.max(0, c);
    }

    var domCount = countWifiClientsFromDom();
    if (typeof domCount === 'number' && isFinite(domCount)) return Math.max(0, domCount);
    return null;
  }

  function getNativeWifiBandFromDom() {
    function bandFromText(text) {
      text = clean(text);
      if (!text) return '';
      // 只在 WiFi / WLAN / SSID 语境下判断，避免把蜂窝网络“5G”误当成 WiFi 频段。
      var wifiContext = /wifi|wi-fi|wlan|无线|热点|ssid|ap|接入设备|接入终端/i.test(text);
      if (!wifiContext) return '';
      var has5 = /(^|[^\d])5\s*g(?:hz)?($|[^a-z\d])|5ghz|5\.8\s*g|ssid\s*2|ssid2|_5g|5g_/i.test(text);
      var has24 = /2\.4\s*g(?:hz)?|2\.4ghz|ssid\s*1|ssid1|_2g|2g_/i.test(text);
      // 对 F50/UFI 顶部胶囊来说，用户更关心当前打开的 5G 热点；同时存在时优先显示 5G，避免继续误显示 2.4G。
      if (has5) return '5G';
      if (has24) return '2.4G';
      return '';
    }

    var sources = [];
    try {
      [state.nativeWifiInfoBtn, state.nativeWifiSettingsBtn, document.getElementById('kn-header-wifi-menu')].forEach(function (el) {
        if (!el) return;
        sources.push(el.innerText || el.textContent || '');
        sources.push(el.getAttribute && (el.getAttribute('title') || el.getAttribute('aria-label') || el.getAttribute('onclick') || ''));
        var parent = el.parentElement;
        if (parent) sources.push(parent.innerText || parent.textContent || '');
      });
    } catch (e) {}

    for (var i = 0; i < sources.length; i += 1) {
      var b = bandFromText(sources[i]);
      if (b) return b;
    }
    return '';
  }

  function resolveWifiBandLabel(data) {
    data = data || {};
    function raw(key) { return clean(data[key]); }
    function isEnabledValue(v) { return /^(1|on|enable|enabled|true|yes|开启|已开启|启用|已启用|active|running|up)$/i.test(clean(v)); }
    function isDisabledValue(v) { return /^(off|disable|disabled|false|no|关闭|已关闭|停用|已停用|inactive|down)$/i.test(clean(v)); }
    function textHas5g(v) { return /(^|[^\d])5\s*g(?:hz)?($|[^a-z\d])|5ghz|5\.8\s*g|_5g|5g_|ssid\s*2|ssid2/i.test(clean(v)); }
    function textHas2g(v) { return /2\.4\s*g(?:hz)?|2\.4ghz|_2g|2g_|ssid\s*1|ssid1/i.test(clean(v)); }

    // 只允许“当前频段/原生当前显示”决定 2.4G / 5G。
    // SSID1、2G 开关、2G SSID 只说明 2.4G 配置存在，不代表当前 Header 应显示 2.4G。
    var currentKeys = [
      'wifi_cur_state', 'wifi_current_state', 'wifi_current_band', 'wifi_band', 'wifi_mode',
      'wifi_status', 'wlan_status', 'ap_status', 'current_wifi_band', 'current_band',
      'wifi_work_band', 'wifi_current_frequency', 'wlan_current_band'
    ];
    for (var i = 0; i < currentKeys.length; i += 1) {
      var current = raw(currentKeys[i]);
      if (!current || /^\d+$/.test(current)) continue;
      if (textHas5g(current)) return '5G';
      if (textHas2g(current)) return '2.4G';
    }

    var domBand = getNativeWifiBandFromDom();
    if (domBand === '5G') return '5G';
    if (domBand === '2.4G') return '2.4G';

    var enable5gKeys = ['wifi_5g_enable','wifi_5g_state','wifi_5g_switch','m_ssid_5g_enable','ssid2_enable','wifi5g_enable','wlan_5g_enable','wifi_5g_on','wifi_5g_status'];
    var enable2gKeys = ['wifi_2g_enable','wifi_2g_state','wifi_2g_switch','m_ssid_2g_enable','ssid1_enable','wifi2g_enable','wlan_2g_enable','wifi_2g_on','wifi_2g_status'];
    var name5gKeys = ['wifi_5g_name','wifi_5g_ssid','m_ssid_5g','SSID2','ssid2','SSID_5G','ssid_5g'];
    var on5g = false, on2g = false, off5g = false;

    enable5gKeys.forEach(function (key) {
      var v = raw(key);
      if (isEnabledValue(v) || textHas5g(v)) on5g = true;
      if (isDisabledValue(v)) off5g = true;
    });
    name5gKeys.forEach(function (key) {
      var v = raw(key);
      if (v && !/^(0|null|none|unknown|--|off|disable|disabled|false|no|关闭|已关闭|停用|已停用|inactive|down)$/i.test(v)) on5g = true;
    });
    enable2gKeys.forEach(function (key) {
      var v = raw(key);
      // 只有字段值本身写明 2.4G 才作为 2.4G 证据；值为 1 只是“2.4G 配置启用”，不压过当前 5G。
      if (textHas2g(v)) on2g = true;
    });

    if (on5g && !off5g) return '5G';
    if (on2g && !on5g) return '2.4G';

    // F50 场景：WiFi 已开启但固件未明确返回当前频段时，不再默认显示 2.4G。
    // 旧逻辑会被 SSID1 / 2G 配置字段误导；这里返回空，由上层显示“已开启”。
    return '';
  }

  function updateHeaderWifiStatus(data) {
    var btn = document.getElementById('kn-header-wifi-btn');
    var stateEl = document.getElementById('kn-header-wifi-state');
    var countEl = document.getElementById('kn-header-wifi-count');
    if (!btn) return;

    data = data || {};
    var count = resolveWifiClientCount(data);
    var band = resolveWifiBandLabel(data);
    var enabled = parseWifiEnabled(data);
    var radioOffRaw = clean(data.RadioOff || data.radioOff || data.wifi_radio_off || data.wlan_radio_off).toLowerCase();
    var radioExplicitOff = /^(1|true|on|yes)$/i.test(radioOffRaw);

    if (!radioExplicitOff && band) enabled = true;
    if (!radioExplicitOff && typeof count === 'number' && isFinite(count) && count > 0) enabled = true;
    // 防误判策略：没有 RadioOff=1 这种强关闭证据时，不允许把 Header 染红；最多显示未知。
    if (enabled === false && !radioExplicitOff) enabled = null;

    var stateText = enabled === true ? (band || '已开启') : (enabled === false ? '已关闭' : (band || '状态未知'));
    var compactStateText = enabled === true ? (band || '开') : (enabled === false ? '关' : '?');
    var countText = typeof count === 'number' && isFinite(count) ? String(count) : '--';

    btn.classList.remove('is-on', 'is-off', 'offline', 'unknown');
    btn.classList.toggle('is-on', enabled === true);
    btn.classList.toggle('is-off', enabled === false);
    btn.classList.toggle('offline', enabled === false);
    btn.classList.toggle('unknown', enabled !== true && enabled !== false);
    btn.setAttribute('data-state', compactStateText);
    if (stateEl) {
      stateEl.textContent = stateText;
      stateEl.title = 'WiFi状态：' + stateText;
    }
    if (countEl) {
      countEl.textContent = countText;
      countEl.title = countText === '--' ? '连接数量未知' : '当前接入数量：' + countText;
    }
    btn.title = 'WiFi情况：' + stateText + ' · 接入 ' + countText + ' 台。点击展开 WiFi设置 / 接入设备。';
  }

  function refreshHeaderNetworkInfo(force) {
    updateHeaderLoginState();
    if (!getStoredLoginState()) {
      state.headerNetworkBusy = false;
      headerText('#kn-header-operator', '登录后读取');
      headerText('#kn-header-nettype', '--');
      headerText('#kn-pop-operator', '登录后读取');
      headerText('#kn-pop-nettype', '--');
      headerText('#kn-pop-signal', '--');
      headerText('#kn-pop-ppp', '--');
      headerText('#kn-pop-phone', '--');
      headerText('#kn-pop-imei', '--');
      headerText('#kn-pop-imsi', '--');
      headerText('#kn-pop-iccid', '--');
      headerText('#kn-pop-ip', '--');
      updateHeaderWifiStatus({});
      updateHeaderSignalMood(0, '', '登录后读取', '--');
      var loggedOutDot = document.getElementById('kn-header-network-dot');
      if (loggedOutDot) loggedOutDot.classList.remove('online', 'offline');
      return;
    }
    var now = Date.now();
    if (!force && now < state.headerRefreshAt) return;
    if (state.headerNetworkBusy) return;
    state.headerRefreshAt = now + 5000;
    state.headerNetworkBusy = true;

    var cmds = [
      'network_provider', 'network_type', 'signalbar', 'network_signalbar', 'ppp_status',
      'msisdn', 'phone_number', 'spn_name_data', 'imei', 'imsi', 'iccid',
      'ipv4_wan_ipaddr', 'ipv6_wan_ipaddr', 'wan_ipaddr', 'wan_ipaddr6',
      'local_ip_addr', 'lan_ipaddr', 'station_ip_addr', 'pdp_addr', 'ipv6_pdp_addr',
      'wifi_cur_state', 'wifi_enable', 'wifi_enabled', 'wlan_enable', 'RadioOff', 'ap_status', 'wifi_status', 'm_ssid_enable',
      'wifi_access_sta_num', 'wifi_sta_num', 'sta_count', 'station_num', 'station_count', 'ap_station_num', 'connected_devices', 'attached_devices_num', 'lan_station_num', 'wifi_client_num', 'wlan_client_num', 'client_num',
      'station_list', 'wifi_client_list', 'wlan_client_list', 'attached_devices', 'client_list', 'SSID1', 'SSID2', 'ssid', 'wifi_ssid', 'wifi_2g_ssid', 'wifi_5g_ssid', 'm_ssid', 'm_ssid_2g', 'm_ssid_5g', 'ap_ssid', 'wlan_ssid', 'wifi_name', 'wifi_2g_enable', 'wifi_5g_enable', 'wifi_2g_state', 'wifi_5g_state', 'wifi_2g_name', 'wifi_5g_name', 'wifi_2g_switch', 'wifi_5g_switch', 'wlan_status', 'wifi_state', 'wifi_mode'
    ].join(',');
    var url = getHeaderBaseURL() + '/goform/goform_get_cmd_process?multi_data=1&isTest=false&cmd=' + encodeURIComponent(cmds) + '&_=' + Date.now();

    fetch(url, { headers: getHeaderHeaders() }).then(function (res) { return res.json(); }).then(function (data) {
      var dom = getDeviceInfoFromDom();
      var operator = clean(data.network_provider) || '--';
      var netType = clean(data.network_type) || '--';
      var signal = normalizeSignal(data.signalbar || data.network_signalbar || 0);
      var ppp = clean(data.ppp_status) || '--';
      var phone = clean(data.msisdn || data.phone_number || dom.phone) || '--';
      var imei = clean(data.imei || dom.imei) || '--';
      var imsi = clean(data.imsi || dom.imsi) || '--';
      var iccid = clean(data.iccid || dom.iccid) || '--';
      var ip = collectHeaderIps(data, dom.ip);

      updateHeaderWifiStatus(data);
      updateHeaderSignalMood(signal, ppp, operator, netType);
      adaptHeaderActionDisplay();

      headerText('#kn-header-operator', operator);
      headerText('#kn-header-nettype', netType);
      var netTypeEl = document.getElementById('kn-header-nettype');
      if (netTypeEl) {
        netTypeEl.classList.remove('net-5g', 'net-4g', 'net-3g', 'net-2g', 'net-other');
        var nt = String(netType || '').toUpperCase();
        if (nt.indexOf('5G') !== -1 || nt.indexOf('NR') !== -1) netTypeEl.classList.add('net-5g');
        else if (nt.indexOf('4G') !== -1 || nt.indexOf('LTE') !== -1) netTypeEl.classList.add('net-4g');
        else if (nt.indexOf('3G') !== -1 || nt.indexOf('UMTS') !== -1 || nt.indexOf('WCDMA') !== -1) netTypeEl.classList.add('net-3g');
        else if (nt.indexOf('2G') !== -1 || nt.indexOf('EDGE') !== -1 || nt.indexOf('GSM') !== -1) netTypeEl.classList.add('net-2g');
        else netTypeEl.classList.add('net-other');
        netTypeEl.title = '网络类型：' + netType;
      }
      headerText('#kn-pop-operator', operator);
      headerText('#kn-pop-nettype', netType);
      headerText('#kn-pop-signal', signal + ' / 5');
      headerText('#kn-pop-ppp', ppp);
      headerText('#kn-pop-phone', phone);
      headerText('#kn-pop-imei', imei);
      headerText('#kn-pop-imsi', imsi);
      headerText('#kn-pop-iccid', iccid);
      headerText('#kn-pop-ip', ip);

      var bars = document.getElementById('kn-header-signal');
      if (bars) bars.setAttribute('data-level', String(signal));
      var dot = document.getElementById('kn-header-network-dot');
      if (dot) {
        dot.classList.remove('online', 'offline');
        if (ppp.indexOf('connected') !== -1 || signal >= 3) dot.classList.add('online');
        else if (signal === 0) dot.classList.add('offline');
      }
    }).catch(function (err) {
      console.warn('[KanoWebOS] header 网络状态刷新失败:', err);
      headerText('#kn-header-operator', '读取失败');
      updateHeaderSignalMood(0, '', '读取失败', '--');
      var dot = document.getElementById('kn-header-network-dot');
      if (dot) {
        dot.classList.remove('online');
        dot.classList.add('offline');
      }
    }).finally(function () {
      state.headerNetworkBusy = false;
    });
  }

  function hideNativeHeaderActionEntrypoints() {
    var actions = [
      { action: 'login', className: 'kn-native-login-source' },
      { action: 'command', className: 'kn-native-command-source' },
      { action: 'password', className: 'kn-native-password-source' },
      { action: 'wifiSettings', className: 'kn-native-wifi-settings-source' },
      { action: 'accessDevices', className: 'kn-native-access-devices-source' },
      { action: 'pluginFeature', className: 'kn-native-plugin-source' }
    ];

    actions.forEach(function (item) {
      var btn = findNativeActionButton(item.action);
      if (!btn) return;
      var meta = getNativeActionMeta(item.action);
      if (meta) state[meta.cacheKey] = btn;
      btn.classList.add(item.className);
      btn.style.display = 'none';
    });
  }

  function grabTopElements() {
    var actions = document.getElementById('kn-header-actions');
    var pageBadge = document.getElementById('kn-page-badge');
    var pageVersion = document.getElementById('kn-page-version');
    if (!actions) return;
    var title = document.querySelector('.title.main-title');
    if (title) {
      var rawTitle = clean(title.innerText || title.textContent || '');
      if (rawTitle) {
        var versionMatch = rawTitle.match(/v\d+(?:\.\d+)+/i);
        var versionText = versionMatch ? versionMatch[0] : 'v4.0.0';
        var productText = rawTitle.replace(versionText, '').trim() || 'UFI-TOOLS';
        if (pageBadge) pageBadge.textContent = productText;
        if (pageVersion) pageVersion.textContent = versionText;
      }
      title.style.display = 'none';
    }
    hideNativeHeaderActionEntrypoints();
    updateHeaderLoginState();
    adaptHeaderActionDisplay();
  }

  function findModuleKey(node) {
    if (!(node instanceof HTMLElement)) return null;
    var id = node.id || '';
    var cls = typeof node.className === 'string' ? node.className : '';
    var text = clean(node.innerText || node.textContent || '');
    if (id === HOME_DASHBOARD_ID || cls.indexOf('kn-home-dashboard') !== -1) return 'home';
    if (cls.indexOf('func_list_container') !== -1 || cls.indexOf('kano_function_main func_list_container') !== -1 || text.indexOf('功能列表') === 0) return 'functions';
    if (cls.indexOf('status-container') !== -1 || id.indexOf('status-container') !== -1) return 'status';
    if (cls.indexOf('devices-mon') !== -1 || id.indexOf('devices-mon') !== -1) return 'devices';
    if (cls.indexOf('band-lock-container') !== -1 || id.indexOf('band-lock-container') !== -1) return 'bandLock';
    if (cls.indexOf('freq-lock-container') !== -1 || id.indexOf('freq-lock-container') !== -1) return 'freqLock';
    if (id === 'TTYD' || id.indexOf('TTYD') !== -1) return 'ttyd';
    if (id === 'kn-toolbox-wrapper' || cls.indexOf('kn-toolbox-wrapper') !== -1) return 'toolbox';
    return null;
  }

  function getPanelNode(id) { return document.getElementById(id); }
  function isPanelId(id) { return Object.prototype.hasOwnProperty.call(state.config.panels || {}, id); }
  function setHidden(el, hidden) { if (!el) return; hidden ? el.classList.add(HIDDEN_CLASS) : el.classList.remove(HIDDEN_CLASS); }

  function applyFunctionContainerVisibility(funcNode, current) {
    var showOriginalFunctionList = state.config.modules.functions.group === current;
    var anyPanelVisible = false;
    Object.keys(state.config.panels).forEach(function (id) {
      var panel = getPanelNode(id);
      if (!panel) return;
      var visible = state.config.panels[id].group !== 'hide' && state.config.panels[id].group === current;
      setHidden(panel, !visible);
      if (visible && funcNode.contains(panel)) anyPanelVisible = true;
    });
    Array.prototype.slice.call(funcNode.children).forEach(function (child) {
      if (!(child instanceof HTMLElement)) return;
      if (child.id && isPanelId(child.id)) return;
      setHidden(child, !showOriginalFunctionList);
    });
    setHidden(funcNode, !(showOriginalFunctionList || anyPanelVisible));
  }

  function classifyContainerNodes() {
    var container = state.container || document.querySelector('.container');
    if (!container || !state.config) return;
    var current = state.config.currentGroup || 'overview';
    Object.keys(state.config.panels).forEach(function (id) {
      var panel = getPanelNode(id);
      if (!panel) return;
      setHidden(panel, !(state.config.panels[id].group !== 'hide' && state.config.panels[id].group === current));
    });
    Array.prototype.slice.call(container.children).forEach(function (node) {
      if (!(node instanceof HTMLElement)) return;
      var tag = node.tagName.toUpperCase();
      if (['SCRIPT', 'STYLE', 'LINK', 'META', 'HEADER', 'DIALOG'].indexOf(tag) !== -1) return;
      if (node.id === HEADER_ID || node.id === DIALOG_ID || node.id === 'toastContainer') return;
      if (node.classList.contains('mask') || node.classList.contains('modal')) return;
      var key = findModuleKey(node);
      if (!key) return;
      if (key === 'functions') { applyFunctionContainerVisibility(node, current); return; }
      setHidden(node, state.config.modules[key].group !== current);
    });
  }

  function scheduleClassify() { if (state.raf) return; state.raf = requestAnimationFrame(function () { state.raf = 0; classifyContainerNodes(); }); }
  function updateNavButtons() { Array.prototype.slice.call(document.querySelectorAll('.kn-nav-btn')).forEach(function (btn) { btn.classList.toggle('active', btn.getAttribute('data-group') === state.config.currentGroup); }); var header = document.getElementById(HEADER_ID); if (header) header.classList.toggle('compact', !!state.config.compactHeader); applyAppearance(); }
  function switchGroup(group) { if (!isValidGroup(group)) return; state.config.currentGroup = group; saveConfig(); updateNavButtons(); scheduleClassify(); }

  function setLayoutMoveStatus(text, tone) {
    var status = document.getElementById('kn-layout-move-status');
    if (!status) return;
    status.textContent = text;
    status.className = tone || '';
  }

  function moveEntity(kind, key, target) {
    var entity = kind === 'module' ? state.config.modules[key] : state.config.panels[key];
    if (!entity) return false;
    if (kind === 'module' && !isValidGroup(target)) {
      setLayoutMoveStatus('页面模块不能隐藏', 'error');
      return false;
    }
    if (kind === 'panel' && target !== 'hide' && !isValidGroup(target)) {
      setLayoutMoveStatus('目标分组无效', 'error');
      return false;
    }
    if (entity.group === target) {
      setLayoutMoveStatus((entity.name || key) + '已在当前分组', '');
      return true;
    }
    entity.group = target;
    saveConfig();
    renderSettingsZones();
    scheduleClassify();
    var targetLabel = target === 'hide' ? '隐藏' : GROUPS[target].label;
    setLayoutMoveStatus((entity.name || key) + ' 已移至' + targetLabel, 'ok');
    return true;
  }
  function encodeDrag(kind, key) { return DRAG_PREFIX + JSON.stringify({ kind: kind, key: key }); }
  function decodeDrag(e) { var payload = state.drag; try { var data = e.dataTransfer.getData('text/plain'); if (data && data.indexOf(DRAG_PREFIX) === 0) payload = JSON.parse(data.slice(DRAG_PREFIX.length)); } catch (err) {} return payload; }
  function makeItem(kind, key, name, badgeText, missing) {
    var item = document.createElement('div');
    item.className = 'kn-item' + (kind === 'panel' ? ' panel' : '') + (missing ? ' missing' : '');

    var main = document.createElement('div');
    main.className = 'kn-item-main';
    main.draggable = true;
    main.title = '拖动到其他分组';
    var handle = document.createElement('span');
    handle.className = 'kn-drag-handle';
    handle.setAttribute('aria-hidden', 'true');
    handle.textContent = '⋮';
    var nameEl = document.createElement('span');
    nameEl.className = 'kn-item-name';
    nameEl.textContent = name;
    var badge = document.createElement('span');
    badge.className = 'kn-badge';
    badge.textContent = missing ? (badgeText + '·未加载') : badgeText;
    main.appendChild(handle);
    main.appendChild(nameEl);
    main.appendChild(badge);

    var move = document.createElement('label');
    move.className = 'kn-item-move';
    var moveText = document.createElement('span');
    moveText.textContent = '移动到';
    var select = document.createElement('select');
    select.setAttribute('aria-label', '将' + name + '移动到分组');
    var targets = kind === 'panel' ? GROUP_ORDER.concat(['hide']) : GROUP_ORDER.slice();
    var current = kind === 'module' ? state.config.modules[key].group : state.config.panels[key].group;
    targets.forEach(function (target) {
      var option = document.createElement('option');
      option.value = target;
      option.textContent = target === 'hide' ? '隐藏' : GROUPS[target].label;
      option.selected = current === target;
      select.appendChild(option);
    });
    select.addEventListener('click', function (e) { e.stopPropagation(); });
    select.addEventListener('change', function (e) { e.stopPropagation(); moveEntity(kind, key, select.value); });
    move.appendChild(moveText);
    move.appendChild(select);
    item.appendChild(main);
    item.appendChild(move);

    main.addEventListener('dragstart', function (e) {
      state.drag = { kind: kind, key: key };
      try { e.dataTransfer.setData('text/plain', encodeDrag(kind, key)); } catch (err) {}
      item.style.opacity = '.35';
    });
    main.addEventListener('dragend', function () { state.drag = null; item.style.opacity = '1'; });
    return item;
  }

  function renderSettingsZones() {
    var board = document.getElementById('kn-settings-board');
    if (!board || !state.config) return;
    board.textContent = '';
    var zones = {};
    var counts = {};
    GROUP_ORDER.concat(['hide']).forEach(function (g) {
      var meta = g === 'hide' ? { label: '隐藏', desc: '仅隐藏插件面板' } : GROUPS[g];
      var zone = document.createElement('section');
      zone.className = 'kn-group-zone' + (g === 'hide' ? ' kn-hidden-zone' : '');
      zone.setAttribute('data-zone', g);
      zone.innerHTML = '<div class="kn-zone-head"><div class="kn-zone-copy"><div class="kn-zone-name">' + meta.label + '</div><div class="kn-zone-desc">' + meta.desc + '</div></div><span class="kn-zone-count">0 项</span></div>';
      zone.addEventListener('dragover', function (e) {
        e.preventDefault();
        var invalid = g === 'hide' && state.drag && state.drag.kind === 'module';
        zone.classList.toggle('drag-over', !invalid);
        zone.classList.toggle('drag-invalid', !!invalid);
      });
      zone.addEventListener('dragleave', function () { zone.classList.remove('drag-over', 'drag-invalid'); });
      zone.addEventListener('drop', function (e) {
        e.preventDefault();
        zone.classList.remove('drag-over', 'drag-invalid');
        var p = decodeDrag(e);
        if (p) moveEntity(p.kind, p.key, g);
      });
      board.appendChild(zone);
      zones[g] = zone;
      counts[g] = 0;
    });
    Object.keys(state.config.modules).forEach(function (key) {
      var m = state.config.modules[key];
      var group = zones[m.group] ? m.group : 'tools';
      zones[group].appendChild(makeItem('module', key, m.name, '页面', false));
      counts[group] += 1;
    });
    Object.keys(state.config.panels).forEach(function (id) {
      var p = state.config.panels[id];
      var group = zones[p.group] ? p.group : 'extensions';
      var missing = !getPanelNode(id);
      zones[group].appendChild(makeItem('panel', id, p.name || id, '插件面板', missing));
      counts[group] += 1;
    });
    Object.keys(zones).forEach(function (g) {
      var count = counts[g] || 0;
      var countEl = zones[g].querySelector('.kn-zone-count');
      if (countEl) countEl.textContent = count + ' 项';
      if (!count) {
        var tip = document.createElement('div');
        tip.className = 'kn-empty-tip';
        tip.textContent = '暂无项目';
        zones[g].appendChild(tip);
      }
    });
  }

  function openSettingsDialog() { var d = document.getElementById(DIALOG_ID); if (!d) return; mergeBackgroundSettingsIntoAppearance(d); renderSettingsZones(); bindAppearanceControls(); ensureAppearanceLanguageControl(d); if (typeof d.showModal === 'function' && !d.open) d.showModal(); }
  function closeSettingsDialog() { var d = document.getElementById(DIALOG_ID); if (d && typeof d.close === 'function' && d.open) d.close(); }
  function resetLayout() { if (!confirm('确认恢复默认分组吗？')) return; var oldAppearance = clone(state.config.appearance); state.config = normalizeConfig(null); state.config.appearance = oldAppearance; saveConfig(); renderSettingsZones(); updateNavButtons(); scheduleClassify(); setLayoutMoveStatus('已恢复默认分组', 'ok'); }
  function exportConfig() { var text = JSON.stringify(state.config, null, 2); try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text); if (typeof createToast === 'function') createToast('配置已复制', 'pink'); return; } } catch (err) {} console.log('[KanoWebOS] config:', text); prompt('复制配置', text); }
  function destroy() { try { closePhoneSmsModal(); } catch (e) {} try { closeNetworkDiagnostics(); } catch (e) {} try { if (window.__KANO_WEBOS_TOOLBOX_CAPTURE_HANDLER__) window.__KANO_WEBOS_TOOLBOX_CAPTURE_HANDLER__ = null; } catch (e) {} if (state.observer) state.observer.disconnect(); if (state.toolboxObserver) state.toolboxObserver.disconnect(); if (state.timer) clearInterval(state.timer); if (state.raf) cancelAnimationFrame(state.raf); if (state.headerResizeHandler) window.removeEventListener('resize', state.headerResizeHandler); cleanupOldUI(); }

  function init() {
    var container = document.querySelector('.container');
    if (!container) { setTimeout(init, 150); return; }
    state.container = container;
    state.config = readConfig();
    document.documentElement.classList.add('kn-webos-active');
    injectCSS();
    injectHomeDashboardCSS();
    injectResponsiveCSS();
    injectHeaderFinalPolishCSS();
    injectHeaderMobileLayoutFinalCSS();
    injectHeaderMobileNetworkCapsuleFixCSS();
    injectHeaderNetworkPopoverPortalCSS();
    injectGoogleSettingsCSS();
    injectModernPluginManagerCSS();
    injectAppearanceCSS();
    buildHeader(container);
    buildHomePage(container);
    buildToolbox(container);
    hookToolboxAutoClose();
    state.headerResizeHandler = function () { adaptHeaderActionDisplay(); positionHeaderNetworkPopover(); };
    window.addEventListener('resize', state.headerResizeHandler);
    buildDialog();
    grabTopElements();
    applyAppearance();
    refreshHeaderNetworkInfo(false);
    refreshHomeDashboardStatus(false);
    state.timer = setInterval(function () { grabTopElements(); refreshHeaderNetworkInfo(false); refreshHomeDashboardStatus(false); applyToolboxRouting(); if (isWebOSFeatureEnabled('nativeButtonMigration')) hideHomeFunctionListButtons(); else restoreHomeFunctionListButtons(); scheduleClassify(); }, 1200);
    state.observer = new MutationObserver(scheduleClassify);
    state.observer.observe(container, { childList: true, subtree: true });
    switchGroup(state.config.currentGroup);
    setTimeout(function () { showWebOSWelcomeIfNeeded(false); }, 280);
    console.info('[KanoWebOS] 已启动 v' + VERSION);
  }

  if (EXTERNAL_KANO_PHONE_SMS) window.KanoPhoneSMS = EXTERNAL_KANO_PHONE_SMS;
  window.KanoWebOS = { version: VERSION, switchGroup: switchGroup, openSettingsDialog: openSettingsDialog, closeSettingsDialog: closeSettingsDialog, openNetworkDiagnostics: openNetworkDiagnostics, exportConfig: exportConfig, resetLayout: resetLayout, applyAppearance: applyAppearance, refreshHeaderNetworkInfo: refreshHeaderNetworkInfo, refreshHomeDashboardStatus: refreshHomeDashboardStatus, classify: classifyContainerNodes, destroy: destroy, openToolboxDrawer: openToolboxDrawer, openToolboxSettings: openToolboxSettings, applyToolboxRouting: applyToolboxRouting, openPhoneSms: openExternalPhoneSmsOrPrompt };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
}());
</script>
