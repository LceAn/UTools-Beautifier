const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'Web重构_v26.18.0.js'), 'utf8');
let css = '';
const sandbox = {
  DIALOG_ID: 'kn-ui-settings-dialog',
  homeRefreshIcon: () => '<svg aria-hidden="true"></svg>',
  clean: value => String(value ?? '').replace(/\s+/g, ' ').trim(),
  document: {
    getElementById: () => null,
    createElement: () => ({}),
    head: { appendChild(style) { css = style.textContent; } },
  },
};
vm.createContext(sandbox);
function load(start, end) {
  const begin = source.indexOf(start);
  const finish = source.indexOf(end, begin);
  assert.ok(begin >= 0 && finish > begin);
  vm.runInContext(source.slice(begin, finish), sandbox);
}
load('  function settingsIcon(name)', '  function knPluginRenderEditor()');
load('  function getSettingsTabTarget(', '  function enhanceSettingsPresentation(');
load('  function getSettingsSearchText(', '  function applySettingsSearch(');
load('  function injectSettingsExperienceCSS()', '  function enhanceSettingsInteractionMarkup(');

assert.equal(sandbox.getSettingsTabTarget('ArrowDown', 0, 7), 1);
assert.equal(sandbox.getSettingsTabTarget('ArrowDown', 6, 7), 0);
assert.equal(sandbox.getSettingsTabTarget('ArrowUp', 0, 7), 6);
assert.equal(sandbox.getSettingsTabTarget('Home', 4, 7), 0);
assert.equal(sandbox.getSettingsTabTarget('End', 1, 7), 6);
assert.equal(sandbox.getSettingsTabTarget('ArrowDown', -1, 7), -1);
assert.equal(sandbox.getSettingsTabTarget('ArrowDown', 0, 0), -1);
assert.equal(sandbox.getSettingsTabTarget('Tab', 0, 7), -1);

for (const name of ['layout', 'functions', 'appearance', 'forward', 'plugins', 'webos', 'about', 'search', 'close', 'save', 'copy', 'trash', 'edit', 'import', 'export', 'up', 'down']) {
  const icon = sandbox.settingsIcon(name);
  assert.match(icon, /^<svg /);
  assert.match(icon, /aria-hidden="true"/);
  assert.match(icon, /stroke="currentColor"/);
}
assert.match(sandbox.knPluginActionIcon('save'), /class="kn-action-ico"/);
const labels = { layout: '导航与页面', functions: '功能中心', appearance: '外观与背景', forward: '消息转发', plugins: '插件管理', webos: '兼容性', about: '关于' };
for (const [key, label] of Object.entries(labels)) {
  const text = sandbox.getSettingsSearchText({ querySelector: () => ({ querySelectorAll: () => [] }) }, { getAttribute: () => key, textContent: label });
  assert.ok(text.includes(label.toLowerCase()));
  if (key === 'about') assert.ok(text.includes('github'));
  if (key === 'forward') assert.ok(text.includes('smtp'));
}
sandbox.injectSettingsExperienceCSS();
assert.ok(css.includes('--set-bg:#191c21'));
assert.ok(css.includes('.kn-theme-light #kn-ui-settings-dialog'));
assert.match(css, /\.kn-dialog-content\{width:100%!important;max-width:100%!important/);
assert.match(css, /\.kn-dialog-body\{[^}]*padding:0!important/);
assert.match(css, /\.kn-fc-category-panel\.active\{display:block;background:transparent!important/);
assert.ok(css.includes('.kn-settings-tabs .kn-settings-tab.active'));
assert.ok(css.includes('.kn-settings-no-results .kn-settings-panel{display:none!important}'));
assert.ok(css.includes('@media(max-width:820px)'));
assert.ok(css.includes('@media(max-width:520px)'));
assert.ok(css.includes('text-shadow:none!important'));
assert.ok(css.includes('.kn-plugin-icon-action.danger'));
assert.match(css, /\.kn-plugin-head-right\{[^}]*flex-wrap:wrap!important/);
assert.ok(source.includes("dialog.setAttribute('aria-labelledby', 'kn-settings-title')"));
assert.ok(source.includes("tabs.setAttribute('aria-orientation', 'vertical')"));
assert.ok(source.includes("return card.action || card.tab || key === 'device' || key === 'debug'"));
console.log('webos settings UI tests: ok');
