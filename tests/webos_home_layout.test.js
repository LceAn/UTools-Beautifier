const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'Web重构_v26.16.2.js'), 'utf8');
const cfg = { auto: true, interval: 10000, userSetAuto: false };
const auto = { checked: false, disabled: false };
const interval = { value: '' };
const classes = new Set();
const refresh = {
  innerHTML: '<svg aria-hidden="true"></svg>',
  attributes: {},
  classList: { toggle(name, value) { value ? classes.add(name) : classes.delete(name); } },
  setAttribute(name, value) { this.attributes[name] = value; },
};
const phone = {};
const controls = {
  '[data-home-auto-refresh]': auto,
  '[data-home-refresh-interval]': interval,
  '[data-home-action="refresh"]': refresh,
  '#kn-home-phone-line': phone,
};
let loggedIn = true;
let enabled = true;
let calls = 0;
let copies = 0;
const sandbox = {
  HOME_DASHBOARD_ID: 'kn-home-dashboard',
  state: {},
  readHomeRefreshConfig: () => ({ ...cfg }),
  saveHomeRefreshConfig: next => Object.assign(cfg, next),
  getStoredLoginState: () => loggedIn,
  isWebOSFeatureEnabled: () => enabled,
  refreshHomeDashboardStatus: () => { calls++; },
  copyHomePhoneFromLine: () => { copies++; },
  document: { querySelector: selector => controls[selector.replace('#kn-home-dashboard ', '')] },
};
vm.createContext(sandbox);
for (const [start, end] of [
  ['  function syncHomeRefreshControls()', '  function setHomeLastUpdate'],
  ['  function bindHomeDashboardControls(home)', '  /*\n   * Refresh icon'],
]) {
  const begin = source.indexOf(start);
  const finish = source.indexOf(end, begin);
  assert.ok(begin >= 0 && finish > begin);
  vm.runInContext(source.slice(begin, finish), sandbox);
}

sandbox.syncHomeRefreshControls();
assert.equal(auto.checked, true);
assert.equal(auto.disabled, false);
assert.equal(interval.value, '10000');
loggedIn = false;
sandbox.syncHomeRefreshControls();
assert.equal(auto.checked, false);
assert.equal(auto.disabled, true);
loggedIn = true;
enabled = false;
sandbox.syncHomeRefreshControls();
assert.equal(auto.disabled, true);
enabled = true;

sandbox.setHomeRefreshBusy(true);
assert.equal(refresh.disabled, true);
assert.equal(refresh.attributes['aria-busy'], 'true');
assert.equal(classes.has('is-busy'), true);
sandbox.setHomeRefreshBusy(false);
assert.equal(refresh.disabled, false);
assert.equal(refresh.innerHTML, '<svg aria-hidden="true"></svg>', 'refresh must preserve its icon');

const attrs = {};
const home = {
  getAttribute: name => attrs[name],
  setAttribute: (name, value) => { attrs[name] = value; },
  querySelector: selector => controls[selector],
};
sandbox.bindHomeDashboardControls(home);
auto.checked = false;
auto.onchange();
assert.equal(cfg.auto, false);
assert.equal(cfg.userSetAuto, true);
assert.equal(calls, 0);
auto.checked = true;
auto.onchange();
assert.equal(cfg.auto, true);
assert.equal(calls, 1);
interval.value = '30000';
interval.onchange();
assert.equal(cfg.interval, 30000);
assert.equal(calls, 2);
let prevented = false;
phone.onkeydown({ key: 'Enter', preventDefault() { prevented = true; } });
assert.equal(copies, 1);
assert.equal(prevented, true);

const markup = source.slice(source.indexOf('  function buildHomePage'), source.indexOf('  function isWeakHomeDisplayValue'));
assert.ok(markup.indexOf('kn-home-network-card') < markup.indexOf('kn-home-signal-card'));
assert.ok(markup.indexOf('kn-home-signal-card') < markup.indexOf('kn-home-resource-card'));
assert.ok(!markup.includes('<details class="kn-home-core'));
for (const id of ['kn-home-phone-sms-card', 'kn-home-operator-card', 'kn-home-maint-card']) assert.ok(markup.includes(id));
assert.ok(!markup.includes('kn-home-operator-plugin-status'), 'legacy carrier plugin must not overwrite the compact status');
const hideControl = source.slice(source.indexOf('    function hideControl(el)'), source.indexOf('    // 兜底：少数固件'));
assert.ok(hideControl.includes("el.closest('#' + HOME_DASHBOARD_ID)"), 'native migration must exclude dashboard actions');
console.log('webos home layout tests: ok');

const featureInput = { type: 'checkbox', checked: false, getAttribute: () => 'homeMaintenance' };
sandbox.readWebOSConfig = () => ({ homeMaintenance: true });
const syncStart = source.indexOf('  function syncWebOSSettingsControls(');
const syncEnd = source.indexOf('  function ensureWebOSRuntimeCSS', syncStart);
vm.runInContext(source.slice(syncStart, syncEnd), sandbox);
sandbox.syncWebOSSettingsControls({ querySelectorAll: () => [featureInput], querySelector: () => null });
assert.equal(featureInput.checked, true, 'detached compatibility panel must initialize from actual config');

let dashboardCss = '';
sandbox.HOME_STYLE_ID = 'home-test-style';
sandbox.HEADER_ID = 'kn-app-header';
sandbox.document = {
  getElementById: () => null,
  createElement: () => ({}),
  head: { appendChild(style) { dashboardCss = style.textContent; } },
};
const cssStart = source.indexOf('  function injectHomeDashboardCSS()');
const cssEnd = source.indexOf('  function buildHomePage', cssStart);
vm.runInContext(source.slice(cssStart, cssEnd), sandbox);
sandbox.injectHomeDashboardCSS();
assert.match(dashboardCss, /#kn-home-dashboard\.kn-home-dashboard\{[^}]*background:var\(--home-panel\)/, 'wallpaper must not sit directly behind dashboard text');
assert.match(dashboardCss, /--home-panel:rgba\(20,23,28,\.86\)/);
assert.match(dashboardCss, /\.kn-theme-light #kn-home-dashboard\.kn-home-dashboard\{--home-panel:rgba\(250,252,254,\.9\)/);
assert.ok(dashboardCss.includes('-webkit-backdrop-filter:blur(14px)'));
assert.ok(dashboardCss.includes('@media(min-width:1100px)'));
assert.match(dashboardCss, /\.kn-home-resource-main\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
assert.match(dashboardCss, /\.kn-home-shortcuts\{display:flex;align-items:center/);
