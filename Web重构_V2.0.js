<script>
(function () {
  'use strict';

  var VERSION = '26.2.0-settings-2026';
  var CONFIG_KEY = 'kano_webos_config_v26_clean';

  var HEADER_ID = 'kn-app-header';
  var STYLE_ID = 'kano-webos-style';
  var THEME_STYLE_ID = 'kano-webos-theme-style';
  var DIALOG_ID = 'kn-ui-settings-dialog';
  var HIDDEN_CLASS = 'kn-os-hidden';
  var DRAG_PREFIX = 'KANO_WEBOS_ENTITY:';

  var GROUPS = {
    overview: { label: '状态', shortLabel: '状态', desc: '基本状态、设备监控' },
    network: { label: '网络', shortLabel: '网络', desc: '锁频、锁站、信号、投屏、ADB 音频' },
    system: { label: '系统', shortLabel: '系统', desc: '终端、时间同步、SQLite、系统维护' },
    tools: { label: '工具', shortLabel: '工具', desc: '原生功能列表、快捷操作、工具箱' },
    extensions: { label: '扩展', shortLabel: '扩展', desc: '第三方扩展面板' }
  };
  var GROUP_ORDER = ['overview', 'network', 'system', 'tools', 'extensions'];

  var DEFAULT_MODULES = {
    status: { name: '基本状态', group: 'overview' },
    devices: { name: '设备监控', group: 'overview' },
    functions: { name: '功能列表 / 快捷操作', group: 'tools' },
    bandLock: { name: '锁定频段', group: 'network' },
    freqLock: { name: '锁定基站', group: 'network' },
    ttyd: { name: 'TTYD 终端', group: 'system' },
    toolbox: { name: '拓展工具箱', group: 'tools' }
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

  var state = { container: null, config: null, observer: null, timer: null, raf: 0, drag: null };

  try { if (window.KanoWebOS && typeof window.KanoWebOS.destroy === 'function') window.KanoWebOS.destroy(); } catch (e) {}
  cleanupOldUI();

  function cleanupOldUI() {
    var selector = '#kn-os-dialog,#' + DIALOG_ID + ',#' + HEADER_ID + ',#' + STYLE_ID + ',#' + THEME_STYLE_ID + ',#kano-webos-appearance-style,#kn-plugin-hub-wrapper,#kn-header-polish-style,#kano-webos-theme-fix-style,#kano-webos-settings-polish-style';
    Array.prototype.slice.call(document.querySelectorAll(selector)).forEach(function (el) { el.remove(); });
    Array.prototype.slice.call(document.querySelectorAll('.' + HIDDEN_CLASS + ',.kn-plugin-entry-hidden')).forEach(function (el) {
      el.classList.remove(HIDDEN_CLASS);
      el.classList.remove('kn-plugin-entry-hidden');
    });
    document.documentElement.classList.remove('kn-theme-dark', 'kn-theme-light');
  }

  function clone(obj) { return JSON.parse(JSON.stringify(obj || {})); }
  function clean(text) { return String(text || '').replace(/\s+/g, ' ').trim(); }
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
      modules[key].group = isValidGroup(item.group) ? item.group : modules[key].group;
      modules[key].name = item.name || modules[key].name;
    });

    Object.keys(cfg.panels || {}).forEach(function (id) {
      var item = cfg.panels[id] || {};
      if (!panels[id]) panels[id] = { name: item.name || id, group: 'extensions' };
      panels[id].group = item.group === 'hide' ? 'hide' : (isValidGroup(item.group) ? item.group : panels[id].group);
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
      currentGroup: isValidGroup(cfg.currentGroup) ? cfg.currentGroup : 'overview',
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
      '#' + HEADER_ID + '{width:min(1320px,calc(100% - 40px));box-sizing:border-box;display:grid;grid-template-columns:minmax(260px,340px) minmax(360px,1fr) minmax(150px,220px);align-items:center;gap:18px;margin:12px auto 24px;padding:12px 16px;position:sticky;top:12px;z-index:8888;border-radius:24px;border:1px solid rgba(255,255,255,.12);background:rgba(22,26,32,.82);backdrop-filter:blur(22px) saturate(180%);-webkit-backdrop-filter:blur(22px) saturate(180%);box-shadow:0 16px 40px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.05)}' +
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
      '#kn-main-nav{width:min(560px,100%);display:grid;grid-template-columns:repeat(5,minmax(64px,1fr));gap:6px;padding:6px;border-radius:18px;background:rgba(0,0,0,.22);border:1px solid rgba(255,255,255,.06)}' +
      '.kn-nav-btn,.kn-action-btn,.kn-panel-btn{min-height:38px;border:1px solid rgba(255,255,255,.14);border-radius:14px;padding:0 14px;font-size:13px;font-weight:850;cursor:pointer;white-space:nowrap;transition:all .18s ease}' +
      '.kn-nav-btn{display:flex;align-items:center;justify-content:center;gap:5px;border-color:transparent;background:transparent;color:rgba(255,255,255,.62)}.kn-nav-btn:hover{color:#fff;background:rgba(255,255,255,.10);transform:translateY(-1px)}.kn-nav-btn.active{color:#fff;background:linear-gradient(180deg,rgba(78,146,255,.34),rgba(78,146,255,.16));border-color:rgba(120,180,255,.34);box-shadow:0 8px 18px rgba(40,100,220,.16),inset 0 1px 0 rgba(255,255,255,.10)}' +
      '#kn-header-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex-wrap:wrap}.kn-action-btn,.kn-panel-btn{color:rgba(255,255,255,.84);background:rgba(255,255,255,.07)}.kn-action-btn.primary,.kn-panel-btn.primary{color:#fff;background:linear-gradient(180deg,rgba(78,146,255,.30),rgba(78,146,255,.16));border-color:rgba(120,180,255,.34)}' +
      '#' + DIALOG_ID + '{padding:0;border:none;border-radius:24px;background:transparent;overflow:visible;max-width:96vw}' +
      '#' + DIALOG_ID + '::backdrop{background:rgba(0,0,0,.62);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}' +
      '.kn-dialog-content{width:1040px;max-width:96vw;height:min(840px,88vh);display:flex;flex-direction:column;overflow:hidden;padding:0;border-radius:30px;color:#fff;background:radial-gradient(circle at 16% 0%,rgba(78,146,255,.16),transparent 34%),radial-gradient(circle at 90% 8%,rgba(110,80,255,.10),transparent 30%),linear-gradient(180deg,rgba(22,25,32,.98),rgba(9,12,18,.98));border:1px solid rgba(255,255,255,.13);box-shadow:0 34px 96px rgba(0,0,0,.74),inset 0 1px 0 rgba(255,255,255,.06)}' +
      '.kn-dialog-header{flex:0 0 auto;display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:28px 32px 22px;border-bottom:1px solid rgba(255,255,255,.075);background:linear-gradient(180deg,rgba(255,255,255,.055),rgba(255,255,255,.015))}.kn-dialog-title{font-size:22px;font-weight:900;margin-bottom:8px}.kn-dialog-subtitle{font-size:12px;line-height:1.7;color:rgba(255,255,255,.58);max-width:740px}.kn-dialog-body{flex:1 1 auto;overflow:auto;padding:24px 32px 18px;background:linear-gradient(180deg,rgba(4,7,12,.20),rgba(4,7,12,.08))}.kn-dialog-footer{flex:0 0 auto;display:flex;justify-content:space-between;gap:10px;padding:16px 32px 24px;border-top:1px solid rgba(255,255,255,.075);flex-wrap:wrap;background:linear-gradient(180deg,rgba(4,7,12,.16),rgba(4,7,12,.28));backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}.kn-footer-left,.kn-footer-right{display:flex;gap:8px;flex-wrap:wrap}' +
      '.kn-settings-tabs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;padding:7px;border-radius:22px;background:rgba(4,7,12,.42);border:1px solid rgba(255,255,255,.075);margin-bottom:20px;box-shadow:inset 0 1px 0 rgba(255,255,255,.035),0 14px 34px rgba(0,0,0,.16)}.kn-settings-tab{min-height:44px;border:none;border-radius:16px;background:transparent;color:rgba(255,255,255,.58);font-weight:850;cursor:pointer;letter-spacing:.2px;position:relative;overflow:hidden}.kn-settings-tab.active{color:#fff;background:linear-gradient(180deg,rgba(78,146,255,.30),rgba(78,146,255,.14));box-shadow:0 12px 28px rgba(72,150,255,.16),inset 0 1px 0 rgba(255,255,255,.10)}.kn-settings-tab.active:after{content:"";position:absolute;left:18%;right:18%;bottom:5px;height:2px;border-radius:99px;background:linear-gradient(90deg,transparent,rgba(135,206,235,.85),transparent)}.kn-settings-panel{display:none}.kn-settings-panel.active{display:block}' +
      '.kn-group-board{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}.kn-group-zone{min-height:158px;padding:16px;border-radius:22px;border:1px solid rgba(255,255,255,.08);background:linear-gradient(180deg,rgba(14,18,25,.70),rgba(9,12,18,.56));display:flex;flex-wrap:wrap;align-content:flex-start;gap:9px;box-shadow:inset 0 1px 0 rgba(255,255,255,.035),0 16px 36px rgba(0,0,0,.14)}.kn-zone-head{width:100%;display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:6px;padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,.07)}.kn-zone-name{font-size:14px;font-weight:900}.kn-zone-desc{font-size:11px;color:rgba(255,255,255,.43)}.kn-group-zone.drag-over{border-color:rgba(82,160,255,.85);background:rgba(82,160,255,.13)}' +
      '.kn-item{display:inline-flex;align-items:center;gap:6px;padding:7px 11px;border-radius:999px;color:rgba(255,255,255,.90);font-size:12px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.07);cursor:grab}.kn-item.panel{border-color:rgba(120,180,255,.24);background:rgba(40,132,255,.11)}.kn-item.missing{opacity:.45}.kn-badge{font-size:10px;color:rgba(255,255,255,.50);border:1px solid rgba(255,255,255,.12);border-radius:999px;padding:1px 5px;background:rgba(0,0,0,.16)}.kn-hidden-zone{border-color:rgba(255,120,120,.24);background:rgba(255,80,80,.055)}.kn-empty-tip{width:100%;color:rgba(255,255,255,.30);font-size:12px;padding:8px 0}.kn-note{font-size:12px;color:rgba(255,255,255,.58);line-height:1.75;margin:14px 0 0;padding:12px 14px;border-radius:14px;background:rgba(72,150,255,.07);border:1px solid rgba(120,180,255,.14)}' +
      '.kn-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.kn-form-card{position:relative;overflow:hidden;padding:20px;border-radius:24px;border:1px solid rgba(255,255,255,.08);background:linear-gradient(180deg,rgba(14,18,25,.70),rgba(9,12,18,.56));box-shadow:inset 0 1px 0 rgba(255,255,255,.035),0 16px 36px rgba(0,0,0,.14)}.kn-form-card.full{grid-column:1/-1}.kn-form-title{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:900;margin-bottom:14px}.kn-form-title:before{content:"";width:7px;height:18px;border-radius:999px;background:linear-gradient(180deg,var(--kn-grad-1,#87ceeb),var(--kn-grad-2,#3b82f6));display:inline-block}.kn-check-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 14px}.kn-check{display:flex;align-items:center;gap:8px;font-size:13px;color:rgba(255,255,255,.82);cursor:pointer;padding:10px 12px;border-radius:16px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.07);transition:transform .16s ease,border-color .16s ease,background .16s ease}.kn-check:hover{transform:translateY(-1px);background:rgba(255,255,255,.07);border-color:rgba(120,180,255,.16)}.kn-check input{width:17px;height:17px;accent-color:#4e92ff}.kn-input-row{display:grid;grid-template-columns:120px minmax(0,1fr);gap:10px;align-items:center;margin:12px 0}.kn-input-row label{font-size:12px;color:rgba(255,255,255,.55)}.kn-input-row input[type="text"],.kn-input-row input[type="number"],.kn-input-row select{min-height:42px;width:100%;box-sizing:border-box;border:1px solid rgba(255,255,255,.10);background:rgba(0,0,0,.26);color:#fff;border-radius:16px;padding:9px 12px;outline:none;box-shadow:inset 0 1px 0 rgba(255,255,255,.035)}.kn-input-row input[type="text"]:focus,.kn-input-row input[type="number"]:focus,.kn-input-row select:focus{border-color:rgba(120,180,255,.38);box-shadow:0 0 0 4px rgba(78,146,255,.10),inset 0 1px 0 rgba(255,255,255,.035)}.kn-input-row input[type="color"]{width:42px;height:32px;border:none;background:transparent}.kn-input-row input[type="range"]{width:100%}' +
      '.kn-about-hero{display:flex;gap:18px;align-items:center;padding:22px;border-radius:26px;background:radial-gradient(circle at top left,rgba(72,150,255,.16),transparent 38%),linear-gradient(180deg,rgba(14,18,25,.74),rgba(9,12,18,.58));border:1px solid rgba(255,255,255,.08);margin-bottom:18px;box-shadow:inset 0 1px 0 rgba(255,255,255,.04),0 18px 40px rgba(0,0,0,.16)}.kn-about-logo{width:58px;height:58px;flex:0 0 58px;border-radius:20px;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:900;color:#fff;background:linear-gradient(180deg,rgba(78,146,255,.34),rgba(78,146,255,.15));border:1px solid rgba(120,180,255,.28)}.kn-about-title{font-size:20px;font-weight:950;margin-bottom:7px}.kn-about-desc{font-size:13px;line-height:1.7;color:rgba(255,255,255,.62);max-width:760px}.kn-about-tags{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.kn-about-tags span{font-size:11px;padding:5px 9px;border-radius:999px;background:rgba(72,150,255,.12);border:1px solid rgba(120,180,255,.18);color:#9dccff}.kn-about-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.kn-about-card{padding:20px;border-radius:24px;background:linear-gradient(180deg,rgba(14,18,25,.70),rgba(9,12,18,.56));border:1px solid rgba(255,255,255,.08);box-shadow:inset 0 1px 0 rgba(255,255,255,.035),0 16px 36px rgba(0,0,0,.14)}.kn-about-card-title{font-size:14px;font-weight:900;margin-bottom:12px}.kn-about-kv{display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.06)}.kn-about-kv b{font-size:12px;color:rgba(255,255,255,.48)}.kn-about-kv span{font-size:12px;color:rgba(255,255,255,.82);text-align:right}.kn-about-link-box{display:flex;flex-direction:column;gap:7px;padding:12px;border-radius:16px;background:rgba(72,150,255,.08);border:1px solid rgba(120,180,255,.14)}.kn-about-link-box a{font-size:12px;color:#8fc2ff;text-decoration:none;word-break:break-all}.kn-about-small,.kn-about-list{font-size:12px;line-height:1.75;color:rgba(255,255,255,.62);margin-top:12px}' +
      '.' + HIDDEN_CLASS + '{display:none!important}' +
      '@media(max-width:980px){#' + HEADER_ID + '{grid-template-columns:1fr;width:min(720px,calc(100% - 24px));gap:12px}#kn-header-left{justify-content:center}#kn-header-center{order:2}#kn-header-actions{justify-content:center;order:3}#kn-main-nav{width:100%}.kn-group-board,.kn-form-grid,.kn-about-grid{grid-template-columns:1fr}.kn-check-grid{grid-template-columns:1fr}.kn-settings-tabs{grid-template-columns:repeat(2,minmax(0,1fr))}.kn-dialog-header{flex-direction:column}}';
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
      '#kn-main-nav{background:rgba(255,255,255,.42)!important;border-color:rgba(255,255,255,.48)!important}.kn-nav-btn{color:rgba(23,32,51,.62)!important;background:transparent!important}.kn-nav-btn:hover{color:#172033!important;background:rgba(255,255,255,.55)!important}.kn-nav-btn.active{color:#172033!important;background:linear-gradient(180deg,rgba(255,255,255,.78),rgba(255,255,255,.54))!important;border-color:rgba(60,130,255,.18)!important;box-shadow:0 8px 18px rgba(34,50,80,.10),inset 0 1px 0 rgba(255,255,255,.60)!important}.kn-action-btn.primary,.kn-panel-btn.primary{color:#172033!important;background:rgba(255,255,255,.62)!important;border-color:rgba(60,130,255,.22)!important}' +
      '#' + DIALOG_ID + ' .kn-dialog-content{background:radial-gradient(circle at 16% 0%,rgba(60,130,255,.13),transparent 34%),linear-gradient(180deg,rgba(255,255,255,.92),rgba(245,248,252,.90))!important;color:#172033!important;border-color:rgba(255,255,255,.62)!important}.kn-dialog-title,.kn-zone-name,.kn-form-title,.kn-about-title,.kn-about-card-title{color:#172033!important}.kn-dialog-subtitle,.kn-zone-desc,.kn-note,.kn-input-row label,.kn-about-desc,.kn-about-small,.kn-about-list{color:rgba(23,32,51,.58)!important}.kn-group-zone,.kn-form-card,.kn-about-card,.kn-about-hero{background:rgba(255,255,255,.42)!important;border-color:rgba(34,50,80,.08)!important;box-shadow:0 16px 36px rgba(34,50,80,.08),inset 0 1px 0 rgba(255,255,255,.48)!important}.kn-settings-tabs{background:rgba(34,50,80,.06)!important;border-color:rgba(34,50,80,.08)!important}.kn-settings-tab{color:rgba(23,32,51,.58)!important}.kn-settings-tab.active{color:#172033!important;background:rgba(60,130,255,.13)!important}.kn-item{color:#172033!important;background:rgba(255,255,255,.52)!important;border-color:rgba(34,50,80,.10)!important}.kn-item.panel{background:rgba(60,130,255,.10)!important;border-color:rgba(60,130,255,.18)!important}.kn-badge{color:rgba(23,32,51,.52)!important;background:rgba(34,50,80,.05)!important;border-color:rgba(34,50,80,.10)!important}.kn-about-logo{color:#1f5fbf!important;background:rgba(60,130,255,.12)!important;border-color:rgba(60,130,255,.18)!important}.kn-about-link-box{background:rgba(60,130,255,.08)!important;border-color:rgba(60,130,255,.14)!important}.kn-about-link-box a{color:#1f5fbf!important}.kn-about-kv b{color:rgba(23,32,51,.50)!important}.kn-about-kv span{color:rgba(23,32,51,.82)!important}';

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
    header.innerHTML = '<div id="kn-title-placeholder"><div id="kn-header-left"><div id="kn-brand-mark">▦</div><div id="kn-brand-copy"><div id="kn-brand-title">UFI 控制台</div><div id="kn-brand-subtitle">WebOS · F50 管理中枢</div><div class="kn-version-chips"><span class="kn-meta-chip primary" id="kn-page-badge">UFI-TOOLS</span><span class="kn-meta-chip" id="kn-page-version">v4.0.0</span><span class="kn-meta-chip muted">2026 UI</span></div></div></div></div><div id="kn-header-center"><nav id="kn-main-nav">' + nav + '</nav></div><div id="kn-header-actions"><button type="button" class="kn-action-btn primary" data-action="settings">界面设置</button></div>';
    Array.prototype.slice.call(header.querySelectorAll('.kn-nav-btn')).forEach(function (btn) {
      btn.onclick = function () { switchGroup(btn.getAttribute('data-group')); };
    });
    header.querySelector('[data-action="settings"]').onclick = openSettingsDialog;
    container.insertBefore(header, container.firstChild || null);
  }

  function buildDialog() {
    var presetOptions = Object.keys(BACKGROUND_PRESETS).map(function (key) {
      return '<option value="' + key + '">' + BACKGROUND_PRESETS[key].label + '</option>';
    }).join('');

    var dialog = document.createElement('dialog');
    dialog.id = DIALOG_ID;
    dialog.innerHTML = '<div class="kn-dialog-content"><div class="kn-dialog-header"><div><div class="kn-dialog-title">界面设置</div><div class="kn-dialog-subtitle">安全布局：不移动第三方插件 div，不创建插件 Hub。这里集成导航分组、主题模式、界面美化和首页背景图设置。</div></div><button type="button" class="kn-panel-btn" data-action="close">关闭</button></div><div class="kn-dialog-body"><div class="kn-settings-tabs"><button class="kn-settings-tab active" data-tab="layout" type="button">导航分组</button><button class="kn-settings-tab" data-tab="appearance" type="button">界面美化</button><button class="kn-settings-tab" data-tab="background" type="button">首页背景</button><button class="kn-settings-tab" data-tab="about" type="button">关于</button></div><div id="kn-settings-panel-layout" class="kn-settings-panel active"><div style="display:flex;justify-content:space-between;gap:12px;margin-bottom:12px;font-size:13px;color:rgba(255,255,255,.74);font-weight:800"><span>导航分组与模块管理</span><span style="font-size:11px;color:rgba(255,255,255,.46);font-weight:500">点击项目循环移动；电脑端可拖拽</span></div><div id="kn-settings-board" class="kn-group-board"></div><div class="kn-note">当前版本采用原地显隐：第三方 div 面板不再被移动到其他容器，避免破坏原插件结构。</div></div><div id="kn-settings-panel-appearance" class="kn-settings-panel"><div class="kn-form-grid"><div class="kn-form-card full"><div class="kn-form-title">主题模式</div><div class="kn-input-row"><label>模式</label><select data-appearance="themeMode"><option value="dark">夜间模式</option><option value="light">日间模式</option><option value="auto">跟随系统</option></select></div><div class="kn-input-row"><label>强调色</label><input type="color" data-appearance="accentColor"></div><div class="kn-input-row"><label>字体缩放</label><input type="range" min="88" max="116" data-appearance="fontScale"></div><div class="kn-input-row"><label>动画强度</label><input type="range" min="0" max="2" data-appearance="animationLevel"></div></div><div class="kn-form-card full"><div class="kn-form-title">视觉效果</div><div class="kn-check-grid"><label class="kn-check"><input type="checkbox" data-appearance="enableRadius">圆角卡片</label><label class="kn-check"><input type="checkbox" data-appearance="enableShadow">悬浮阴影</label><label class="kn-check"><input type="checkbox" data-appearance="enableCapsule">胶囊按钮</label><label class="kn-check"><input type="checkbox" data-appearance="enableGlass">玻璃拟态</label><label class="kn-check"><input type="checkbox" data-appearance="enableCompact">紧凑布局</label><label class="kn-check"><input type="checkbox" data-appearance="enableHover">动态悬停</label><label class="kn-check"><input type="checkbox" data-appearance="enableScrollbar">极简滚条</label><label class="kn-check"><input type="checkbox" data-appearance="enableGradient">渐变标题</label><label class="kn-check"><input type="checkbox" data-appearance="enableSoftDivider">柔和分割线</label><label class="kn-check"><input type="checkbox" data-appearance="enableReadableText">文字增强</label></div></div><div class="kn-form-card"><div class="kn-form-title">标题渐变色</div><div class="kn-input-row"><label>起点颜色</label><input type="color" data-appearance="gradColor1"></div><div class="kn-input-row"><label>终点颜色</label><input type="color" data-appearance="gradColor2"></div></div><div class="kn-form-card"><div class="kn-form-title">顶栏质感</div><div class="kn-input-row"><label>顶栏模糊</label><input type="range" min="8" max="40" data-appearance="headerBlur"></div><div class="kn-input-row"><label>顶栏透明度</label><input type="range" min="35" max="98" data-appearance="headerOpacity"></div></div></div></div><div id="kn-settings-panel-background" class="kn-settings-panel"><div class="kn-form-grid"><div class="kn-form-card full"><div class="kn-form-title">首页背景图</div><label class="kn-check" style="margin-bottom:12px"><input type="checkbox" data-appearance="enableBackground">启用背景图</label><div class="kn-input-row"><label>预装背景</label><select data-appearance="backgroundPreset">' + presetOptions + '</select></div><div class="kn-input-row"><label>自定义 URL</label><input type="text" data-appearance="backgroundImage" placeholder="https://.../background.jpg"></div><div class="kn-note">预装背景可直接选择；自定义 URL 仍然可用。自定义 URL 不为空时优先使用自定义背景。</div></div><div class="kn-form-card"><div class="kn-form-title">背景遮罩</div><div class="kn-input-row"><label>暗度</label><input type="range" min="0" max="85" data-appearance="backgroundDim"></div><div class="kn-input-row"><label>模糊</label><input type="range" min="0" max="30" data-appearance="backgroundBlur"></div></div><div class="kn-form-card"><div class="kn-form-title">背景质感</div><div class="kn-input-row"><label>饱和度</label><input type="range" min="50" max="180" data-appearance="backgroundSaturate"></div><button type="button" class="kn-panel-btn" data-action="clearBackground">清空自定义背景</button></div></div></div><div id="kn-settings-panel-about" class="kn-settings-panel"><div class="kn-about-hero"><div class="kn-about-logo">▦</div><div><div class="kn-about-title">UFI WebOS 控制台</div><div class="kn-about-desc">面向 UFI-TOOLS / F50 的桌面化增强控制台。核心原则：不移动第三方插件 div，不破坏原插件结构，只做安全的导航分组、原地显隐和界面增强。</div><div class="kn-about-tags"><span>Safe Layout</span><span>F50</span><span>UFI-TOOLS v4.x</span><span>2026 UI</span><span>Version: ' + VERSION + '</span></div></div></div><div class="kn-about-grid"><div class="kn-about-card"><div class="kn-about-card-title">版本信息</div><div class="kn-about-kv"><b>版本号</b><span>' + VERSION + '</span></div><div class="kn-about-kv"><b>作者</b><span>LceAn</span></div><div class="kn-about-kv"><b>适配环境</b><span>UFI-TOOLS v4.x / F50</span></div><div class="kn-about-kv"><b>布局策略</b><span>安全原地显隐</span></div></div><div class="kn-about-card"><div class="kn-about-card-title">开源参考</div><div class="kn-about-link-box"><span>UTools Beautifier</span><a href="https://github.com/LceAn/UTools-Beautifier" target="_blank" rel="noopener noreferrer">https://github.com/LceAn/UTools-Beautifier</a></div><div class="kn-about-small">本控制台整合了界面美化、插件面板分组和背景主题能力，可继续按你的项目风格扩展。</div></div><div class="kn-about-card"><div class="kn-about-card-title">当前能力</div><div class="kn-about-list">导航分页 · 插件面板分组 · 日/夜间模式 · 预设背景 · 自定义背景 · 玻璃拟态 · 圆角阴影 · 胶囊按钮 · 渐变标题 · 紧凑布局</div></div><div class="kn-about-card"><div class="kn-about-card-title">自定义介绍模板</div><div class="kn-about-list">项目名称：UFI WebOS 控制台<br>作者：LceAn<br>定位：面向 F50 / UFI-TOOLS 的高级桌面化管理界面<br>愿景：让插件管理、网络管理和设备状态展示更清晰、更现代、更安全。</div></div></div></div></div><div class="kn-dialog-footer"><div class="kn-footer-left"><button type="button" class="kn-panel-btn" data-action="compact">切换紧凑顶栏</button><button type="button" class="kn-panel-btn" data-action="copy">导出配置</button><button type="button" class="kn-panel-btn" data-action="resetAppearance">恢复默认美化</button><button type="button" class="kn-panel-btn" data-action="reset">恢复默认分组</button></div><div class="kn-footer-right"><button type="button" class="kn-panel-btn primary" data-action="done">完成</button></div></div></div>';

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
    var loginBtn = document.querySelector('button[onclick*="loginModal"], button[onclick*="logout"]');
    if (loginBtn && loginBtn.parentElement !== actions) {
      loginBtn.classList.add('kn-action-btn');
      loginBtn.style.position = 'static';
      loginBtn.style.margin = '0';
      actions.appendChild(loginBtn);
    }
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
  function destroy() { if (state.observer) state.observer.disconnect(); if (state.timer) clearInterval(state.timer); if (state.raf) cancelAnimationFrame(state.raf); cleanupOldUI(); }

  function init() {
    var container = document.querySelector('.container');
    if (!container) { setTimeout(init, 150); return; }
    state.container = container;
    state.config = readConfig();
    injectCSS();
    injectAppearanceCSS();
    buildHeader(container);
    buildDialog();
    grabTopElements();
    applyAppearance();
    state.timer = setInterval(function () { grabTopElements(); scheduleClassify(); }, 1200);
    state.observer = new MutationObserver(scheduleClassify);
    state.observer.observe(container, { childList: true, subtree: true });
    switchGroup(state.config.currentGroup);
    console.info('[KanoWebOS] 已启动 v' + VERSION);
  }

  window.KanoWebOS = { version: VERSION, switchGroup: switchGroup, openSettingsDialog: openSettingsDialog, closeSettingsDialog: closeSettingsDialog, exportConfig: exportConfig, resetLayout: resetLayout, applyAppearance: applyAppearance, classify: classifyContainerNodes, destroy: destroy };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
}());
</script>