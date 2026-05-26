<script>
(function () {
  'use strict';

  var VERSION = '26.3.3-header-generic-mood-icon';
  var CONFIG_KEY = 'kano_webos_config_v26_clean';

  var HEADER_ID = 'kn-app-header';
  var STYLE_ID = 'kano-webos-style';
  var THEME_STYLE_ID = 'kano-webos-theme-style';
  var RESPONSIVE_STYLE_ID = 'kano-webos-responsive-style';
  var TOOLBOX_STYLE_ID = 'kano-webos-toolbox-style';
  var TOOLBOX_WRAPPER_ID = 'kn-toolbox-wrapper';
  var TOOLBOX_DRAWER_ID = 'kn-toolbox-drawer-modal';
  var TOOLBOX_SETTINGS_ID = 'kn-toolbox-settings-modal';
  var TOOLBOX_CONFIG_KEY = 'kano_webos_toolbox_config_v1';
  var DIALOG_ID = 'kn-ui-settings-dialog';
  var HIDDEN_CLASS = 'kn-os-hidden';
  var DRAG_PREFIX = 'KANO_WEBOS_ENTITY:';

  var GROUPS = {
    overview: { label: '状态', shortLabel: '状态', desc: '基本状态、设备监控' },
    network: { label: '网络', shortLabel: '网络', desc: '锁频、锁站、信号、投屏、ADB 音频' },
    system: { label: '系统', shortLabel: '系统', desc: '终端、时间同步、SQLite、系统维护' },
    tools: { label: '工具', shortLabel: '工具', desc: '功能列表、扩展工具箱、第三方插件入口收纳' },
    extensions: { label: '扩展', shortLabel: '扩展', desc: '第三方扩展面板' }
  };
  var GROUP_ORDER = ['overview', 'network', 'system', 'tools', 'extensions'];

  var DEFAULT_MODULES = {
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

  var state = { container: null, config: null, toolboxConfig: null, observer: null, toolboxObserver: null, timer: null, raf: 0, drag: null, toolboxDragName: '', nativeLoginBtn: null, nativeCommandPwdBtn: null, nativePasswordBtn: null, nativeDevicePropsBtn: null, nativeWifiInfoBtn: null, nativeWifiSettingsBtn: null, nativeAccessDevicesBtn: null, headerRefreshAt: 0, headerNetworkBusy: false, headerResizeHandler: null };

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
    var selector = '#kn-os-dialog,#' + DIALOG_ID + ',#' + TOOLBOX_WRAPPER_ID + ',#' + TOOLBOX_DRAWER_ID + ',#' + TOOLBOX_SETTINGS_ID + ',#' + HEADER_ID + ',#' + STYLE_ID + ',#' + THEME_STYLE_ID + ',#' + RESPONSIVE_STYLE_ID + ',#' + TOOLBOX_STYLE_ID + ',#kano-webos-appearance-style,#kn-plugin-hub-wrapper,#kn-header-polish-style,#kano-webos-theme-fix-style,#kano-webos-settings-polish-style';
    Array.prototype.slice.call(document.querySelectorAll(selector)).forEach(function (el) { el.remove(); });
    Array.prototype.slice.call(document.querySelectorAll('.' + HIDDEN_CLASS + ',.kn-plugin-entry-hidden,.kn-toolbox-captured')).forEach(function (el) {
      el.classList.remove(HIDDEN_CLASS);
      el.classList.remove('kn-plugin-entry-hidden');
      el.classList.remove('kn-toolbox-captured');
    });
    Array.prototype.slice.call(document.querySelectorAll('.kn-native-login-source,.kn-native-command-source,.kn-native-password-source')).forEach(function (el) {
      el.classList.remove('kn-native-login-source');
      el.classList.remove('kn-native-command-source');
      el.classList.remove('kn-native-password-source');
      el.style.display = '';
    });
    document.documentElement.classList.remove('kn-theme-dark', 'kn-theme-light');
  }

  function clone(obj) { return JSON.parse(JSON.stringify(obj || {})); }
  function clean(text) { return String(text || '').replace(/\s+/g, ' ').trim(); }
  function mapLegacyGroup(group) { return String(group) === 'functionsPage' ? 'tools' : group; }
  function isValidGroup(group) { return GROUP_ORDER.indexOf(String(group)) !== -1; }
  function num(value, fallback, min, max) {
    var n = Number(value);
    if (!isFinite(n)) n = fallback;
    if (typeof min === 'number' && n < min) n = min;
    if (typeof max === 'number' && n > max) n = max;
    return n;
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
      currentGroup: isValidGroup(mapLegacyGroup(cfg.currentGroup)) ? mapLegacyGroup(cfg.currentGroup) : 'overview',
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
      '#' + HEADER_ID + '{width:min(1320px,calc(100% - 40px));box-sizing:border-box;display:grid;grid-template-columns:minmax(240px,300px) minmax(320px,1fr) minmax(520px,620px);align-items:center;gap:18px;margin:12px auto 24px;padding:12px 16px;position:sticky;top:12px;z-index:8888;border-radius:24px;border:1px solid rgba(255,255,255,.12);background:rgba(22,26,32,.82);backdrop-filter:blur(22px) saturate(180%);-webkit-backdrop-filter:blur(22px) saturate(180%);box-shadow:0 16px 40px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.05)}' +
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
      '#kn-main-nav{width:min(500px,100%);display:grid;grid-template-columns:repeat(5,minmax(64px,1fr));gap:6px;padding:6px;border-radius:18px;background:rgba(0,0,0,.22);border:1px solid rgba(255,255,255,.06)}' +
      '.kn-nav-btn,.kn-action-btn,.kn-panel-btn{min-height:38px;border:1px solid rgba(255,255,255,.14);border-radius:14px;padding:0 14px;font-size:13px;font-weight:850;cursor:pointer;white-space:nowrap;transition:all .18s ease}' +
      '.kn-nav-btn{display:flex;align-items:center;justify-content:center;gap:5px;border-color:transparent;background:transparent;color:rgba(255,255,255,.62)}.kn-nav-btn:hover{color:#fff;background:rgba(255,255,255,.10);transform:translateY(-1px)}.kn-nav-btn.active{color:#fff;background:linear-gradient(180deg,rgba(78,146,255,.34),rgba(78,146,255,.16));border-color:rgba(120,180,255,.34);box-shadow:0 8px 18px rgba(40,100,220,.16),inset 0 1px 0 rgba(255,255,255,.10)}' +
      '#kn-header-actions{display:flex;align-items:center;justify-content:flex-end;gap:10px;flex-wrap:nowrap;min-width:0;padding:4px;border-radius:22px;background:rgba(0,0,0,.12);border:1px solid rgba(255,255,255,.045)}.kn-action-btn,.kn-panel-btn{color:rgba(255,255,255,.84);background:rgba(255,255,255,.07)}.kn-action-btn.primary,.kn-panel-btn.primary{color:#fff;background:linear-gradient(180deg,rgba(78,146,255,.30),rgba(78,146,255,.16));border-color:rgba(120,180,255,.34)}.kn-header-tool-btn{min-width:84px;justify-content:center}.kn-header-tool-menu-wrap{position:relative;display:inline-flex;align-items:center}.kn-header-tool-menu{position:absolute;right:0;top:calc(100% + 10px);width:176px;padding:8px;border-radius:16px;border:1px solid rgba(255,255,255,.12);background:radial-gradient(circle at 12% 0%,rgba(120,180,255,.14),transparent 36%),linear-gradient(180deg,rgba(22,29,41,.98),rgba(9,13,20,.98));box-shadow:0 28px 70px rgba(0,0,0,.48),inset 0 1px 0 rgba(255,255,255,.06);display:none;z-index:999999;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}.kn-header-tool-menu-wrap.open .kn-header-tool-menu{display:block}.kn-header-tool-menu-item{width:100%;min-height:38px;border:0;border-radius:12px;background:transparent;color:rgba(255,255,255,.84);display:flex;align-items:center;justify-content:flex-start;gap:9px;padding:0 11px;font-size:12px;font-weight:850;cursor:pointer;text-align:left}.kn-header-tool-menu-item:hover{background:rgba(255,255,255,.085);color:#fff}.kn-header-tool-icon{width:18px;height:18px;border-radius:7px;display:inline-flex;align-items:center;justify-content:center;background:rgba(120,180,255,.12);border:1px solid rgba(120,180,255,.16);font-size:11px;font-weight:900;color:rgba(220,235,255,.92)}#kn-header-net-pill,.kn-login-pill{position:relative;min-height:38px;display:inline-flex;align-items:center;gap:7px;padding:0 12px;border-radius:999px;border:1px solid rgba(255,255,255,.13);background:rgba(255,255,255,.065);color:rgba(255,255,255,.86);font-size:12px;font-weight:850;white-space:nowrap;box-shadow:inset 0 1px 0 rgba(255,255,255,.07);transition:all .18s ease}#kn-header-net-pill:hover,.kn-login-pill:hover{transform:translateY(-1px);background:rgba(255,255,255,.10);border-color:rgba(120,180,255,.26)}#kn-header-net-pill{max-width:215px;cursor:default}.kn-login-pill{cursor:pointer}.kn-login-pill.is-login{color:rgba(225,255,235,.96);background:rgba(52,199,89,.14);border-color:rgba(134,239,172,.28)}.kn-login-pill.is-logout{color:rgba(255,255,255,.72);background:rgba(255,255,255,.055);border-color:rgba(255,255,255,.12)}#kn-header-network-dot{width:7px;height:7px;border-radius:50%;background:#f7c948;box-shadow:0 0 0 3px rgba(247,201,72,.13);flex:0 0 auto}#kn-header-network-dot.online{background:#39d279;box-shadow:0 0 0 3px rgba(57,210,121,.15),0 0 16px rgba(57,210,121,.42)}#kn-header-network-dot.offline{background:#ff5f68;box-shadow:0 0 0 3px rgba(255,95,104,.13),0 0 16px rgba(255,95,104,.34)}#kn-header-operator,#kn-header-nettype,#kn-header-login-text{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#kn-header-operator{max-width:72px}.kn-login-icon{width:18px;height:18px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:rgba(120,180,255,.14);border:1px solid rgba(120,180,255,.18);font-size:12px;font-weight:900}.kn-login-menu-wrap{position:relative;display:inline-flex;align-items:center}.kn-login-menu{position:absolute;right:0;top:calc(100% + 10px);width:184px;padding:8px;border-radius:16px;border:1px solid rgba(255,255,255,.12);background:radial-gradient(circle at 12% 0%,rgba(120,180,255,.14),transparent 36%),linear-gradient(180deg,rgba(22,29,41,.98),rgba(9,13,20,.98));box-shadow:0 28px 70px rgba(0,0,0,.48),inset 0 1px 0 rgba(255,255,255,.06);display:none;z-index:999999;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}.kn-login-menu-wrap.open .kn-login-menu{display:block}.kn-login-menu-item{width:100%;min-height:38px;border:0;border-radius:12px;background:transparent;color:rgba(255,255,255,.84);display:flex;align-items:center;justify-content:flex-start;gap:9px;padding:0 11px;font-size:12px;font-weight:850;cursor:pointer;text-align:left}.kn-login-menu-item:hover{background:rgba(255,255,255,.085);color:#fff}.kn-login-menu-icon{width:18px;height:18px;border-radius:7px;display:inline-flex;align-items:center;justify-content:center;background:rgba(120,180,255,.12);border:1px solid rgba(120,180,255,.16);font-size:11px;font-weight:900;color:rgba(220,235,255,.92)}.kn-login-menu-sep{height:1px;background:rgba(255,255,255,.08);margin:6px 4px}#kn-header-signal{display:inline-flex;align-items:flex-end;gap:2px;width:18px;height:14px;flex:0 0 auto}#kn-header-signal i{width:3px;border-radius:999px;background:rgba(255,255,255,.22)}#kn-header-signal i:nth-child(1){height:4px}#kn-header-signal i:nth-child(2){height:7px}#kn-header-signal i:nth-child(3){height:10px}#kn-header-signal i:nth-child(4){height:13px}#kn-header-signal[data-level="1"] i:nth-child(-n+1),#kn-header-signal[data-level="2"] i:nth-child(-n+2),#kn-header-signal[data-level="3"] i:nth-child(-n+3),#kn-header-signal[data-level="4"] i:nth-child(-n+4),#kn-header-signal[data-level="5"] i:nth-child(-n+4){background:#39d279;box-shadow:0 0 10px rgba(57,210,121,.32)}#kn-header-net-pop{position:absolute;right:0;top:calc(100% + 10px);width:320px;padding:14px;border-radius:18px;border:1px solid rgba(255,255,255,.12);background:radial-gradient(circle at 12% 0%,rgba(120,180,255,.14),transparent 36%),linear-gradient(180deg,rgba(22,29,41,.98),rgba(9,13,20,.98));box-shadow:0 28px 70px rgba(0,0,0,.48),inset 0 1px 0 rgba(255,255,255,.06);display:none;z-index:999999;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}#kn-header-net-pill:hover #kn-header-net-pop{display:block}.kn-net-pop-title{font-size:13px;font-weight:950;color:rgba(255,255,255,.95);padding-bottom:10px;margin-bottom:10px;border-bottom:1px solid rgba(255,255,255,.08)}.kn-net-pop-grid{display:grid;grid-template-columns:82px minmax(0,1fr);gap:8px 10px;font-size:12px;line-height:1.45}.kn-net-pop-grid b{color:rgba(255,255,255,.42);font-weight:780}.kn-net-pop-grid span{color:rgba(255,255,255,.82);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.kn-net-pop-grid span#kn-pop-ip{white-space:normal;word-break:break-all;line-height:1.55;overflow:visible;text-overflow:clip}.kn-header-focus-highlight{outline:2px solid rgba(127,180,255,.92)!important;box-shadow:0 0 0 6px rgba(127,180,255,.16),0 18px 44px rgba(40,100,220,.22)!important;border-radius:18px!important}' +
      '#' + DIALOG_ID + '{padding:0;border:none;border-radius:24px;background:transparent;overflow:visible;max-width:96vw}' +
      '#' + DIALOG_ID + '::backdrop{background:rgba(0,0,0,.62);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}' +
      '.kn-dialog-content{width:970px;max-width:96vw;height:min(820px,88vh);display:flex;flex-direction:column;overflow:hidden;padding:0;border-radius:26px;color:#fff;background:linear-gradient(180deg,rgba(28,30,36,.98),rgba(18,20,25,.98));border:1px solid rgba(255,255,255,.14);box-shadow:0 30px 80px rgba(0,0,0,.72)}' +
      '.kn-dialog-header{flex:0 0 auto;display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:26px 30px 20px;border-bottom:1px solid rgba(255,255,255,.08);background:radial-gradient(circle at top left,rgba(72,150,255,.16),transparent 35%),linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.015))}.kn-dialog-title{font-size:22px;font-weight:900;margin-bottom:8px}.kn-dialog-subtitle{font-size:12px;line-height:1.7;color:rgba(255,255,255,.58);max-width:740px}.kn-dialog-body{flex:1 1 auto;overflow:auto;padding:24px 30px 16px;background:rgba(0,0,0,.06)}.kn-dialog-footer{flex:0 0 auto;display:flex;justify-content:space-between;gap:10px;padding:16px 30px 24px;border-top:1px solid rgba(255,255,255,.08);flex-wrap:wrap;background:rgba(0,0,0,.08)}.kn-footer-left,.kn-footer-right{display:flex;gap:8px;flex-wrap:wrap}' +
      '.kn-settings-tabs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;padding:7px;border-radius:20px;background:rgba(0,0,0,.18);border:1px solid rgba(255,255,255,.07);margin-bottom:18px}.kn-settings-tab{min-height:42px;border:none;border-radius:15px;background:transparent;color:rgba(255,255,255,.58);font-weight:850;cursor:pointer}.kn-settings-tab.active{color:#fff;background:rgba(72,150,255,.20);box-shadow:0 8px 20px rgba(72,150,255,.16),inset 0 1px 0 rgba(255,255,255,.08)}.kn-settings-panel{display:none}.kn-settings-panel.active{display:block}' +
      '.kn-group-board{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.kn-group-zone{min-height:150px;padding:14px;border-radius:18px;border:1px solid rgba(255,255,255,.08);background:linear-gradient(180deg,rgba(18,21,27,.46),rgba(12,14,19,.34));display:flex;flex-wrap:wrap;align-content:flex-start;gap:8px}.kn-zone-head{width:100%;display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:6px;padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,.07)}.kn-zone-name{font-size:14px;font-weight:900}.kn-zone-desc{font-size:11px;color:rgba(255,255,255,.43)}.kn-group-zone.drag-over{border-color:rgba(82,160,255,.85);background:rgba(82,160,255,.13)}' +
      '.kn-item{display:inline-flex;align-items:center;gap:6px;padding:7px 11px;border-radius:999px;color:rgba(255,255,255,.90);font-size:12px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.07);cursor:grab}.kn-item.panel{border-color:rgba(120,180,255,.24);background:rgba(40,132,255,.11)}.kn-item.missing{opacity:.45}.kn-badge{font-size:10px;color:rgba(255,255,255,.50);border:1px solid rgba(255,255,255,.12);border-radius:999px;padding:1px 5px;background:rgba(0,0,0,.16)}.kn-hidden-zone{border-color:rgba(255,120,120,.24);background:rgba(255,80,80,.055)}.kn-empty-tip{width:100%;color:rgba(255,255,255,.30);font-size:12px;padding:8px 0}.kn-note{font-size:12px;color:rgba(255,255,255,.58);line-height:1.75;margin:14px 0 0;padding:12px 14px;border-radius:14px;background:rgba(72,150,255,.07);border:1px solid rgba(120,180,255,.14)}' +
      '.kn-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.kn-form-card{position:relative;overflow:hidden;padding:18px;border-radius:22px;border:1px solid rgba(255,255,255,.08);background:linear-gradient(180deg,rgba(18,21,27,.46),rgba(12,14,19,.34))}.kn-form-card.full{grid-column:1/-1}.kn-form-title{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:900;margin-bottom:14px}.kn-form-title:before{content:"";width:7px;height:18px;border-radius:999px;background:linear-gradient(180deg,var(--kn-grad-1,#87ceeb),var(--kn-grad-2,#3b82f6));display:inline-block}.kn-check-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 14px}.kn-check{display:flex;align-items:center;gap:8px;font-size:13px;color:rgba(255,255,255,.82);cursor:pointer;padding:9px 10px;border-radius:14px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.07)}.kn-check input{width:17px;height:17px;accent-color:#4e92ff}.kn-input-row{display:grid;grid-template-columns:120px minmax(0,1fr);gap:10px;align-items:center;margin:12px 0}.kn-input-row label{font-size:12px;color:rgba(255,255,255,.55)}.kn-input-row input[type="text"],.kn-input-row input[type="number"],.kn-input-row select{min-height:40px;width:100%;box-sizing:border-box;border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.22);color:#fff;border-radius:14px;padding:9px 11px;outline:none}.kn-input-row input[type="color"]{width:42px;height:32px;border:none;background:transparent}.kn-input-row input[type="range"]{width:100%}' +
      '.kn-about-hero{display:flex;gap:18px;align-items:center;padding:20px;border-radius:24px;background:radial-gradient(circle at top left,rgba(72,150,255,.12),transparent 38%),linear-gradient(180deg,rgba(18,21,27,.50),rgba(12,14,19,.36));border:1px solid rgba(255,255,255,.08);margin-bottom:16px}.kn-about-logo{width:58px;height:58px;flex:0 0 58px;border-radius:20px;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:900;color:#fff;background:linear-gradient(180deg,rgba(78,146,255,.34),rgba(78,146,255,.15));border:1px solid rgba(120,180,255,.28)}.kn-about-title{font-size:20px;font-weight:950;margin-bottom:7px}.kn-about-desc{font-size:13px;line-height:1.7;color:rgba(255,255,255,.62);max-width:760px}.kn-about-tags{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.kn-about-tags span{font-size:11px;padding:5px 9px;border-radius:999px;background:rgba(72,150,255,.12);border:1px solid rgba(120,180,255,.18);color:#9dccff}.kn-about-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.kn-about-card{padding:18px;border-radius:22px;background:linear-gradient(180deg,rgba(18,21,27,.46),rgba(12,14,19,.34));border:1px solid rgba(255,255,255,.08)}.kn-about-card-title{font-size:14px;font-weight:900;margin-bottom:12px}.kn-about-kv{display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.06)}.kn-about-kv b{font-size:12px;color:rgba(255,255,255,.48)}.kn-about-kv span{font-size:12px;color:rgba(255,255,255,.82);text-align:right}.kn-about-link-box{display:flex;flex-direction:column;gap:7px;padding:12px;border-radius:16px;background:rgba(72,150,255,.08);border:1px solid rgba(120,180,255,.14)}.kn-about-link-box a{font-size:12px;color:#8fc2ff;text-decoration:none;word-break:break-all}.kn-about-small,.kn-about-list{font-size:12px;line-height:1.75;color:rgba(255,255,255,.62);margin-top:12px}' +
      '#kn-header-actions{gap:8px;align-items:center}' +
      '#kn-header-actions.is-tight .kn-net-sep{display:none!important}#kn-header-actions.is-tight .kn-wifi-status-text,#kn-header-actions.is-tight .kn-wifi-sep{display:none!important}#kn-header-actions.is-ultra-tight #kn-header-operator{display:none!important}#kn-header-actions.is-ultra-tight #kn-header-net-pill{min-width:76px!important;flex:0 0 76px!important;padding:0 9px!important;justify-content:center!important}#kn-header-actions.is-ultra-tight .kn-header-tool-btn{min-width:44px!important;width:44px!important;padding:0!important;font-size:0!important}#kn-header-actions.is-ultra-tight .kn-header-tool-btn:after{content:attr(data-short);font-size:12px!important}#kn-header-actions.is-ultra-tight .kn-login-pill{min-width:42px!important;width:42px!important;padding:0!important;justify-content:center!important}#kn-header-actions.is-ultra-tight #kn-header-login-text{display:none!important}' +
      '#kn-header-net-pill{min-width:210px;flex:1 1 260px;max-width:300px}#kn-header-operator{max-width:118px}.kn-header-tool-btn{flex:0 0 auto;min-width:92px}.kn-wifi-pill{min-width:118px!important;padding:0 11px!important}.kn-wifi-main{font-weight:900}.kn-wifi-sep{opacity:.55}.kn-wifi-status-text{max-width:46px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.kn-wifi-count{min-width:22px;height:22px;padding:0 7px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;background:rgba(57,210,121,.14);border:1px solid rgba(134,239,172,.22);color:rgba(225,255,235,.96);font-size:11px;font-weight:950}.kn-wifi-pill.offline .kn-wifi-count,.kn-wifi-pill.is-off .kn-wifi-count{background:rgba(255,95,104,.14);border-color:rgba(255,130,140,.22);color:rgba(255,230,232,.95)}.kn-wifi-pill.unknown .kn-wifi-count{background:rgba(255,255,255,.07);border-color:rgba(255,255,255,.11);color:rgba(255,255,255,.72)}' +
      '#kn-header-net-pill{min-width:0;flex:0 1 215px;max-width:215px}' +
      '.kn-header-tool-btn{min-width:84px;min-height:38px;padding:0 12px;border-radius:999px;font-size:12px;font-weight:850;display:inline-flex;align-items:center;justify-content:center;gap:6px}.kn-header-tool-btn:hover{border-color:rgba(120,180,255,.26)}' +
      '#kn-header-actions{gap:8px;align-items:center;justify-content:flex-start;width:auto;max-width:none;padding:4px 5px;border-radius:21px;background:rgba(0,0,0,.16)}' +
      '#' + HEADER_ID + '{width:min(1180px,calc(100% - 40px));grid-template-columns:minmax(220px,280px) auto minmax(0,auto);gap:14px;justify-content:center}' +
      '#kn-header-left{gap:11px}#kn-brand-mark{width:40px;height:40px;flex-basis:40px}#kn-brand-title{font-size:15px}#kn-brand-subtitle{font-size:10.5px}.kn-version-chips{gap:5px}.kn-meta-chip{height:21px;padding:0 7px}' +
      '#kn-header-center{justify-content:flex-start}#kn-main-nav{width:auto;grid-template-columns:repeat(5,minmax(58px,68px));gap:5px;padding:5px;border-radius:17px}.kn-nav-btn{min-height:36px;padding:0 10px;font-size:12px;border-radius:13px}' +
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
      '@media(max-width:1220px){#' + HEADER_ID + '{width:min(1120px,calc(100% - 32px));grid-template-columns:minmax(210px,260px) auto minmax(0,auto);gap:12px}#kn-main-nav{grid-template-columns:repeat(5,minmax(54px,64px))}.kn-nav-btn{padding:0 8px}#kn-header-actions{gap:6px}#kn-header-net-pill{min-width:134px!important;max-width:152px!important;flex-basis:152px!important}.kn-net-sep{display:none!important}#kn-header-operator{max-width:62px!important}.kn-wifi-status-text{display:none!important}.kn-wifi-pill{min-width:76px!important;flex-basis:76px!important}.kn-login-pill{min-width:42px!important;width:42px!important}.kn-settings-icon-btn{min-width:42px!important;width:42px!important;padding:0!important}}' +
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
      '#kn-main-nav{width:auto!important;grid-template-columns:repeat(5,minmax(62px,72px))!important;gap:5px!important;padding:5px!important;border-radius:18px!important}' +
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
      '@media(max-width:1180px){#' + HEADER_ID + '{grid-template-columns:minmax(220px,260px) minmax(350px,auto) max-content!important;width:min(1160px,calc(100% - 28px))!important}#kn-main-nav{grid-template-columns:repeat(5,minmax(56px,64px))!important}.kn-nav-btn{padding:0 8px!important}.kn-wifi-pill{min-width:122px!important;flex-basis:122px!important;max-width:126px!important}.kn-wifi-status-text{display:none!important}}' +
      '@media(max-width:980px){#' + HEADER_ID + '{grid-template-columns:1fr!important;width:calc(100% - 18px)!important}#kn-header-actions{width:100%!important;max-width:none!important;display:grid!important;grid-template-columns:minmax(0,1fr) 92px 42px 42px!important;justify-content:stretch!important}#kn-header-net-pill{width:100%!important;max-width:none!important;min-width:0!important}.kn-wifi-pill{width:92px!important;min-width:92px!important;flex-basis:92px!important}.kn-wifi-status-text{display:none!important}}' +
      '@media(max-width:520px){#kn-header-actions{grid-template-columns:minmax(0,1fr) 54px 40px 40px!important;gap:6px!important}.kn-wifi-pill{width:54px!important;min-width:54px!important;flex-basis:54px!important;padding:0!important}.kn-wifi-main,.kn-wifi-status-text{display:none!important}#kn-header-nettype{min-width:38px!important;padding:0 8px!important}#kn-header-operator{max-width:62px!important}.kn-settings-icon-btn,.kn-login-pill{width:40px!important;min-width:40px!important}}' +
      '#kn-header-actions:not(.is-ultra-tight) #kn-header-wifi-btn.kn-wifi-pill{min-width:158px!important;flex:0 0 158px!important;max-width:168px!important;overflow:visible!important}' +
      '#kn-header-actions:not(.is-ultra-tight) #kn-header-wifi-btn .kn-wifi-status-text{display:inline-flex!important;max-width:none!important;overflow:visible!important;text-overflow:clip!important;white-space:nowrap!important}' +
      '@media(max-width:1180px){#kn-header-actions:not(.is-ultra-tight) #kn-header-wifi-btn.kn-wifi-pill{min-width:122px!important;flex-basis:122px!important;max-width:126px!important}#kn-header-actions:not(.is-ultra-tight) #kn-header-wifi-btn .kn-wifi-status-text{display:none!important}}';
    document.head.appendChild(style);
  }

  function getBackgroundValue(a) {
    var preset = BACKGROUND_PRESETS[a.backgroundPreset] || BACKGROUND_PRESETS.none;
    return a.backgroundImage || preset.url || '';
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
      '#' + DIALOG_ID + ' .kn-dialog-content{background:linear-gradient(180deg,rgba(255,255,255,.90),rgba(245,248,252,.88))!important;color:#172033!important;border-color:rgba(255,255,255,.62)!important}.kn-dialog-title,.kn-zone-name,.kn-form-title,.kn-about-title,.kn-about-card-title{color:#172033!important}.kn-dialog-subtitle,.kn-zone-desc,.kn-note,.kn-input-row label,.kn-about-desc,.kn-about-small,.kn-about-list{color:rgba(23,32,51,.58)!important}.kn-group-zone,.kn-form-card,.kn-about-card,.kn-about-hero{background:rgba(255,255,255,.34)!important;border-color:rgba(34,50,80,.08)!important}.kn-settings-tabs{background:rgba(34,50,80,.06)!important;border-color:rgba(34,50,80,.08)!important}.kn-settings-tab{color:rgba(23,32,51,.58)!important}.kn-settings-tab.active{color:#172033!important;background:rgba(60,130,255,.13)!important}.kn-item{color:#172033!important;background:rgba(255,255,255,.52)!important;border-color:rgba(34,50,80,.10)!important}.kn-item.panel{background:rgba(60,130,255,.10)!important;border-color:rgba(60,130,255,.18)!important}.kn-badge{color:rgba(23,32,51,.52)!important;background:rgba(34,50,80,.05)!important;border-color:rgba(34,50,80,.10)!important}.kn-about-logo{color:#1f5fbf!important;background:rgba(60,130,255,.12)!important;border-color:rgba(60,130,255,.18)!important}.kn-about-link-box{background:rgba(60,130,255,.08)!important;border-color:rgba(60,130,255,.14)!important}.kn-about-link-box a{color:#1f5fbf!important}.kn-about-kv b{color:rgba(23,32,51,.50)!important}.kn-about-kv span{color:rgba(23,32,51,.82)!important}';

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
    Array.prototype.slice.call(header.querySelectorAll('[data-header-action]')).forEach(function (btn) {
      btn.onclick = function (e) {
        if (e && e.preventDefault) e.preventDefault();
        if (e && e.stopPropagation) e.stopPropagation();
        closeHeaderToolMenus();
        closeHeaderLoginMenu();
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
      if (loginWrap && e && !loginWrap.contains(e.target)) closeHeaderLoginMenu();
      if (wifiWrap && e && !wifiWrap.contains(e.target)) closeHeaderToolMenus();
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
    if (/登录|登出|口令|密码|WiFi设置|WIFI设置|Wi-Fi设置|无线设置|WLAN设置|接入设备|设备属性|设备信息|AT指令|短信收发|网络模式|切换SIM|USB上网|恢复出厂|重启设备/.test(combo)) return true;
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
    setupToolboxCapture();
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

  function buildDialog() {
    var presetOptions = Object.keys(BACKGROUND_PRESETS).map(function (key) {
      return '<option value="' + key + '">' + BACKGROUND_PRESETS[key].label + '</option>';
    }).join('');

    var dialog = document.createElement('dialog');
    dialog.id = DIALOG_ID;
    dialog.innerHTML = '<div class="kn-dialog-content"><div class="kn-dialog-header"><div><div class="kn-dialog-title">界面设置</div><div class="kn-dialog-subtitle">安全布局：不移动第三方插件 div，不创建插件 Hub。这里集成导航分组、主题模式、界面美化和首页背景图设置。</div></div><button type="button" class="kn-panel-btn" data-action="close">关闭</button></div><div class="kn-dialog-body"><div class="kn-settings-tabs"><button class="kn-settings-tab active" data-tab="layout" type="button">导航分组</button><button class="kn-settings-tab" data-tab="appearance" type="button">界面美化</button><button class="kn-settings-tab" data-tab="background" type="button">首页背景</button><button class="kn-settings-tab" data-tab="about" type="button">关于</button></div><div id="kn-settings-panel-layout" class="kn-settings-panel active"><div style="display:flex;justify-content:space-between;gap:12px;margin-bottom:12px;font-size:13px;color:rgba(255,255,255,.74);font-weight:800"><span>导航分组与模块管理</span><span style="font-size:11px;color:rgba(255,255,255,.46);font-weight:500">点击项目循环移动；电脑端可拖拽</span></div><div id="kn-settings-board" class="kn-group-board"></div><div class="kn-note">当前版本采用原地显隐：第三方 div 面板不再被移动到其他容器，避免破坏原插件结构。</div></div><div id="kn-settings-panel-appearance" class="kn-settings-panel"><div class="kn-form-grid"><div class="kn-form-card full"><div class="kn-form-title">主题模式</div><div class="kn-input-row"><label>模式</label><select data-appearance="themeMode"><option value="dark">夜间模式</option><option value="light">日间模式</option><option value="auto">跟随系统</option></select></div><div class="kn-input-row"><label>强调色</label><input type="color" data-appearance="accentColor"></div><div class="kn-input-row"><label>字体缩放</label><input type="range" min="88" max="116" data-appearance="fontScale"></div><div class="kn-input-row"><label>动画强度</label><input type="range" min="0" max="2" data-appearance="animationLevel"></div></div><div class="kn-form-card full"><div class="kn-form-title">视觉效果</div><div class="kn-check-grid"><label class="kn-check"><input type="checkbox" data-appearance="enableRadius">圆角卡片</label><label class="kn-check"><input type="checkbox" data-appearance="enableShadow">悬浮阴影</label><label class="kn-check"><input type="checkbox" data-appearance="enableCapsule">胶囊按钮</label><label class="kn-check"><input type="checkbox" data-appearance="enableGlass">玻璃拟态</label><label class="kn-check"><input type="checkbox" data-appearance="enableCompact">紧凑布局</label><label class="kn-check"><input type="checkbox" data-appearance="enableHover">动态悬停</label><label class="kn-check"><input type="checkbox" data-appearance="enableScrollbar">极简滚条</label><label class="kn-check"><input type="checkbox" data-appearance="enableGradient">渐变标题</label><label class="kn-check"><input type="checkbox" data-appearance="enableSoftDivider">柔和分割线</label><label class="kn-check"><input type="checkbox" data-appearance="enableReadableText">文字增强</label></div></div><div class="kn-form-card"><div class="kn-form-title">标题渐变色</div><div class="kn-input-row"><label>起点颜色</label><input type="color" data-appearance="gradColor1"></div><div class="kn-input-row"><label>终点颜色</label><input type="color" data-appearance="gradColor2"></div></div><div class="kn-form-card"><div class="kn-form-title">顶栏质感</div><div class="kn-input-row"><label>顶栏模糊</label><input type="range" min="8" max="40" data-appearance="headerBlur"></div><div class="kn-input-row"><label>顶栏透明度</label><input type="range" min="35" max="98" data-appearance="headerOpacity"></div></div></div></div><div id="kn-settings-panel-background" class="kn-settings-panel"><div class="kn-form-grid"><div class="kn-form-card full"><div class="kn-form-title">首页背景图</div><label class="kn-check" style="margin-bottom:12px"><input type="checkbox" data-appearance="enableBackground">启用背景图</label><div class="kn-input-row"><label>预装背景</label><select data-appearance="backgroundPreset">' + presetOptions + '</select></div><div class="kn-input-row"><label>自定义 URL</label><input type="text" data-appearance="backgroundImage" placeholder="https://.../background.jpg"></div><div class="kn-note">预装背景可直接选择；自定义 URL 仍然可用。自定义 URL 不为空时优先使用自定义背景。</div></div><div class="kn-form-card"><div class="kn-form-title">背景遮罩</div><div class="kn-input-row"><label>暗度</label><input type="range" min="0" max="85" data-appearance="backgroundDim"></div><div class="kn-input-row"><label>模糊</label><input type="range" min="0" max="30" data-appearance="backgroundBlur"></div></div><div class="kn-form-card"><div class="kn-form-title">背景质感</div><div class="kn-input-row"><label>饱和度</label><input type="range" min="50" max="180" data-appearance="backgroundSaturate"></div><button type="button" class="kn-panel-btn" data-action="clearBackground">清空自定义背景</button></div></div></div><div id="kn-settings-panel-about" class="kn-settings-panel"><div class="kn-about-hero"><div class="kn-about-logo">▦</div><div><div class="kn-about-title">UFI WebOS 控制台</div><div class="kn-about-desc">面向 UFI-TOOLS / F50 的桌面化增强控制台。核心原则：不移动第三方插件 div，不破坏原插件结构，只做安全的导航分组、原地显隐和界面增强。</div><div class="kn-about-tags"><span>Safe Layout</span><span>F50</span><span>UFI-TOOLS v4.x</span><span>2026 UI</span></div></div></div><div class="kn-about-grid"><div class="kn-about-card"><div class="kn-about-card-title">版本信息</div><div class="kn-about-kv"><b>当前版本</b><span>' + VERSION + '</span></div><div class="kn-about-kv"><b>适配环境</b><span>UFI-TOOLS v4.x / F50</span></div><div class="kn-about-kv"><b>布局策略</b><span>安全原地显隐</span></div></div><div class="kn-about-card"><div class="kn-about-card-title">开源参考</div><div class="kn-about-link-box"><span>UTools Beautifier</span><a href="https://github.com/LceAn/UTools-Beautifier" target="_blank" rel="noopener noreferrer">https://github.com/LceAn/UTools-Beautifier</a></div><div class="kn-about-small">本控制台整合了界面美化、插件面板分组和背景主题能力，可继续按你的项目风格扩展。</div></div><div class="kn-about-card"><div class="kn-about-card-title">当前能力</div><div class="kn-about-list">导航分页 · 插件面板分组 · 日/夜间模式 · 预设背景 · 自定义背景 · 玻璃拟态 · 圆角阴影 · 胶囊按钮 · 渐变标题 · 紧凑布局</div></div><div class="kn-about-card"><div class="kn-about-card-title">自定义介绍模板</div><div class="kn-about-list">项目名称：UFI WebOS 控制台<br>作者：LceAn<br>定位：面向 F50 / UFI-TOOLS 的高级桌面化管理界面<br>愿景：让插件管理、网络管理和设备状态展示更清晰、更现代、更安全。</div></div></div></div></div><div class="kn-dialog-footer"><div class="kn-footer-left"><button type="button" class="kn-panel-btn" data-action="compact">切换紧凑顶栏</button><button type="button" class="kn-panel-btn" data-action="copy">导出配置</button><button type="button" class="kn-panel-btn" data-action="resetAppearance">恢复默认美化</button><button type="button" class="kn-panel-btn" data-action="reset">恢复默认分组</button></div><div class="kn-footer-right"><button type="button" class="kn-panel-btn primary" data-action="done">完成</button></div></div></div>';

    dialog.addEventListener('click', function (e) { if (e.target === dialog) closeSettingsDialog(); });
    dialog.querySelector('[data-action="close"]').onclick = closeSettingsDialog;
    dialog.querySelector('[data-action="done"]').onclick = closeSettingsDialog;
    dialog.querySelector('[data-action="compact"]').onclick = function () { state.config.compactHeader = !state.config.compactHeader; saveConfig(); updateNavButtons(); };
    dialog.querySelector('[data-action="copy"]').onclick = exportConfig;
    dialog.querySelector('[data-action="reset"]').onclick = resetLayout;
    dialog.querySelector('[data-action="resetAppearance"]').onclick = resetAppearance;
    dialog.querySelector('[data-action="clearBackground"]').onclick = function () { state.config.appearance.backgroundImage = ''; saveConfig(); bindAppearanceControls(); applyAppearance(); };
    Array.prototype.slice.call(dialog.querySelectorAll('.kn-settings-tab')).forEach(function (btn) {
      btn.onclick = function () { switchSettingsTab(btn.getAttribute('data-tab')); };
    });
    document.body.appendChild(dialog);
  }

  function switchSettingsTab(tab) {
    Array.prototype.slice.call(document.querySelectorAll('.kn-settings-tab')).forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tab);
    });
    Array.prototype.slice.call(document.querySelectorAll('.kn-settings-panel')).forEach(function (panel) {
      panel.classList.toggle('active', panel.id === 'kn-settings-panel-' + tab);
    });
  }

  function bindAppearanceControls() {
    if (!state.config || !state.config.appearance) return;
    var a = state.config.appearance;
    Array.prototype.slice.call(document.querySelectorAll('[data-appearance]')).forEach(function (input) {
      var key = input.getAttribute('data-appearance');
      if (!Object.prototype.hasOwnProperty.call(a, key)) return;
      if (input.type === 'checkbox') input.checked = !!a[key];
      else input.value = a[key];
      input.oninput = input.onchange = function () {
        if (input.type === 'checkbox') a[key] = input.checked;
        else if (input.type === 'range' || input.type === 'number') a[key] = Number(input.value);
        else a[key] = input.value;
        saveConfig();
        applyAppearance();
      };
    });
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
    var text = document.body ? (document.body.innerText || document.body.textContent || '') : '';
    function pick(label) {
      var reg = new RegExp(label + '\\s*[:：]\\s*([^\\n\\r\\s]+)', 'i');
      var m = text.match(reg);
      return m ? clean(m[1]) : '';
    }
    var ipMatches = [];
    [
      pick('客户端IP'), pick('客户端 IP'), pick('本机IP'), pick('本机 IP'),
      pick('WAN IP'), pick('WAN IPv4'), pick('WAN IPv6'), pick('IPv4'), pick('IPv6')
    ].forEach(function (v) {
      v = clean(v);
      if (v && ipMatches.indexOf(v) === -1) ipMatches.push(v);
    });
    return {
      phone: pick('手机号') || pick('号码'),
      imei: pick('IMEI'),
      imsi: pick('IMSI'),
      iccid: pick('ICCID'),
      ip: ipMatches.join(' ｜ ')
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
    var values = [
      data.wifi_cur_state, data.wifi_enable, data.wifi_enabled, data.wlan_enable,
      data.ap_status, data.wifi_status, data.m_ssid_enable
    ].map(function (v) { return clean(v).toLowerCase(); }).filter(Boolean);

    if (values.some(function (v) { return v === '1' || v === 'on' || v === 'enable' || v === 'enabled' || v === 'up' || v === 'open' || v === 'true'; })) return true;
    if (values.some(function (v) { return v === '0' || v === 'off' || v === 'disable' || v === 'disabled' || v === 'down' || v === 'close' || v === 'false'; })) return false;
    if (clean(data.RadioOff || data.radioOff) === '1') return false;
    if (clean(data.RadioOff || data.radioOff) === '0') return true;
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
    var text = document.body ? (document.body.innerText || document.body.textContent || '') : '';
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

  function updateHeaderWifiStatus(data) {
    var btn = document.getElementById('kn-header-wifi-btn');
    var stateEl = document.getElementById('kn-header-wifi-state');
    var countEl = document.getElementById('kn-header-wifi-count');
    if (!btn) return;

    var enabled = parseWifiEnabled(data || {});
    var count = resolveWifiClientCount(data || {});

    // 如果能读取到无线接入数量，且数量大于 0，则 WiFi 必然处于可用状态。
    // 某些 F50 固件会把 m_ssid_enable / wifi_cur_state 返回成 0，但实际 AP 仍在工作，不能直接判成关闭。
    if ((enabled === null || enabled === false) && typeof count === 'number' && isFinite(count) && count > 0) {
      enabled = true;
    }

    var stateText = enabled === true ? '已开启' : (enabled === false ? '已关闭' : '未知');
    var compactStateText = enabled === true ? '开' : (enabled === false ? '关' : '?');
    var countText = typeof count === 'number' && isFinite(count) ? String(count) : '--';

    btn.classList.toggle('is-on', enabled === true);
    btn.classList.toggle('is-off', enabled === false);
    btn.classList.toggle('offline', enabled === false);
    btn.classList.toggle('unknown', enabled === null);
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
      'station_list', 'wifi_client_list', 'wlan_client_list', 'attached_devices', 'client_list', 'SSID1', 'ssid', 'wifi_ssid'
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
      { action: 'accessDevices', className: 'kn-native-access-devices-source' }
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

  function moveEntity(kind, key, target) {
    if (kind === 'module') { if (!state.config.modules[key]) return; if (isValidGroup(target)) state.config.modules[key].group = target; }
    else if (kind === 'panel') { if (!state.config.panels[key]) return; state.config.panels[key].group = target === 'hide' ? 'hide' : (isValidGroup(target) ? target : 'extensions'); }
    saveConfig(); renderSettingsZones(); scheduleClassify();
  }
  function cycleEntity(kind, key) { var current = kind === 'module' ? state.config.modules[key].group : state.config.panels[key].group; var seq = GROUP_ORDER.concat(['hide']); var idx = seq.indexOf(current); moveEntity(kind, key, seq[(idx + 1) % seq.length]); }
  function encodeDrag(kind, key) { return DRAG_PREFIX + JSON.stringify({ kind: kind, key: key }); }
  function decodeDrag(e) { var payload = state.drag; try { var data = e.dataTransfer.getData('text/plain'); if (data && data.indexOf(DRAG_PREFIX) === 0) payload = JSON.parse(data.slice(DRAG_PREFIX.length)); } catch (err) {} return payload; }
  function makeItem(kind, key, name, badgeText, missing) { var item = document.createElement('div'); item.className = 'kn-item' + (kind === 'panel' ? ' panel' : '') + (missing ? ' missing' : ''); item.draggable = true; item.innerHTML = '<span></span><span class="kn-badge"></span>'; item.children[0].textContent = name; item.children[1].textContent = missing ? (badgeText + '·未加载') : badgeText; item.onclick = function () { cycleEntity(kind, key); }; item.addEventListener('dragstart', function (e) { state.drag = { kind: kind, key: key }; try { e.dataTransfer.setData('text/plain', encodeDrag(kind, key)); } catch (err) {} item.style.opacity = '.35'; }); item.addEventListener('dragend', function () { state.drag = null; item.style.opacity = '1'; }); return item; }

  function renderSettingsZones() {
    var board = document.getElementById('kn-settings-board');
    if (!board || !state.config) return;
    board.textContent = '';
    var zones = {};
    GROUP_ORDER.concat(['hide']).forEach(function (g) {
      var meta = g === 'hide' ? { label: '隐藏', desc: '仅隐藏插件面板' } : GROUPS[g];
      var zone = document.createElement('section');
      zone.className = 'kn-group-zone' + (g === 'hide' ? ' kn-hidden-zone' : '');
      zone.innerHTML = '<div class="kn-zone-head"><div class="kn-zone-name">' + meta.label + '</div><div class="kn-zone-desc">' + meta.desc + '</div></div>';
      zone.addEventListener('dragover', function (e) { e.preventDefault(); zone.classList.add('drag-over'); });
      zone.addEventListener('dragleave', function () { zone.classList.remove('drag-over'); });
      zone.addEventListener('drop', function (e) { e.preventDefault(); zone.classList.remove('drag-over'); var p = decodeDrag(e); if (p) moveEntity(p.kind, p.key, g); });
      board.appendChild(zone); zones[g] = zone;
    });
    Object.keys(state.config.modules).forEach(function (key) { var m = state.config.modules[key]; (zones[m.group] || zones.tools).appendChild(makeItem('module', key, m.name, '页面', false)); });
    Object.keys(state.config.panels).forEach(function (id) { var p = state.config.panels[id]; var missing = !getPanelNode(id); (zones[p.group] || zones.extensions).appendChild(makeItem('panel', id, p.name || id, '插件面板', missing)); });
    Object.keys(zones).forEach(function (g) { if (zones[g].children.length <= 1) { var tip = document.createElement('div'); tip.className = 'kn-empty-tip'; tip.textContent = '暂无项目'; zones[g].appendChild(tip); } });
  }

  function openSettingsDialog() { var d = document.getElementById(DIALOG_ID); if (!d) return; renderSettingsZones(); bindAppearanceControls(); if (typeof d.showModal === 'function' && !d.open) d.showModal(); }
  function closeSettingsDialog() { var d = document.getElementById(DIALOG_ID); if (d && typeof d.close === 'function' && d.open) d.close(); }
  function resetLayout() { if (!confirm('确认恢复默认分组吗？')) return; var oldAppearance = clone(state.config.appearance); state.config = normalizeConfig(null); state.config.appearance = oldAppearance; saveConfig(); renderSettingsZones(); updateNavButtons(); scheduleClassify(); }
  function exportConfig() { var text = JSON.stringify(state.config, null, 2); try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text); if (typeof createToast === 'function') createToast('配置已复制', 'pink'); return; } } catch (err) {} console.log('[KanoWebOS] config:', text); prompt('复制配置', text); }
  function destroy() { try { if (window.__KANO_WEBOS_TOOLBOX_CAPTURE_HANDLER__) window.__KANO_WEBOS_TOOLBOX_CAPTURE_HANDLER__ = null; } catch (e) {} if (state.observer) state.observer.disconnect(); if (state.toolboxObserver) state.toolboxObserver.disconnect(); if (state.timer) clearInterval(state.timer); if (state.raf) cancelAnimationFrame(state.raf); if (state.headerResizeHandler) window.removeEventListener('resize', state.headerResizeHandler); cleanupOldUI(); }

  function init() {
    var container = document.querySelector('.container');
    if (!container) { setTimeout(init, 150); return; }
    state.container = container;
    state.config = readConfig();
    injectCSS();
    injectResponsiveCSS();
    injectHeaderFinalPolishCSS();
    injectAppearanceCSS();
    buildHeader(container);
    buildToolbox(container);
    hookToolboxAutoClose();
    state.headerResizeHandler = function () { adaptHeaderActionDisplay(); };
    window.addEventListener('resize', state.headerResizeHandler);
    buildDialog();
    grabTopElements();
    applyAppearance();
    refreshHeaderNetworkInfo(true);
    state.timer = setInterval(function () { grabTopElements(); refreshHeaderNetworkInfo(false); applyToolboxRouting(); scheduleClassify(); }, 1200);
    state.observer = new MutationObserver(scheduleClassify);
    state.observer.observe(container, { childList: true, subtree: true });
    switchGroup(state.config.currentGroup);
    console.info('[KanoWebOS] 已启动 v' + VERSION);
  }

  window.KanoWebOS = { version: VERSION, switchGroup: switchGroup, openSettingsDialog: openSettingsDialog, closeSettingsDialog: closeSettingsDialog, exportConfig: exportConfig, resetLayout: resetLayout, applyAppearance: applyAppearance, refreshHeaderNetworkInfo: refreshHeaderNetworkInfo, classify: classifyContainerNodes, destroy: destroy, openToolboxDrawer: openToolboxDrawer, openToolboxSettings: openToolboxSettings, applyToolboxRouting: applyToolboxRouting };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
}());
</script>
