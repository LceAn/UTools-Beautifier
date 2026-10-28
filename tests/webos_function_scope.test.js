const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'Web重构_v26.18.1.js'), 'utf8');
class Element {
  constructor(label, dialog = false, tag = 'BUTTON') {
    this.innerText = this.textContent = label;
    this.tagName = tag;
    this.dialog = dialog;
    this.children = [];
    this.attrs = {};
    this.classes = new Set();
    this.classList = {
      add: name => this.classes.add(name),
      remove: name => this.classes.delete(name),
      contains: name => this.classes.has(name),
    };
  }
  get className() { return [...this.classes].join(' '); }
  closest(selector) { return this.dialog && selector.includes('[role="dialog"]') ? this : null; }
  setAttribute(name, value) { this.attrs[name] = value; }
  getAttribute(name) { return this.attrs[name] || null; }
  removeAttribute(name) { delete this.attrs[name]; }
}
const sms = new Element('10099 请登录中国广电 APP 查询账单', true);
const otherDialog = new Element('修改密码', true);
const nativeLogin = new Element('登录');
const nativeRestart = new Element('重启设备');
const directNative = new Element('原生操作', true);
directNative.setAttribute('data-kn-fc-direct-native', '1');
const controls = [sms, otherDialog, nativeLogin, nativeRestart, directNative];
const box = new Element('', false, 'DIV');
box.children = controls;
sms.classList.add('kn-home-function-hidden');
sms.setAttribute('data-kn-home-function-hidden', '1');
const sandbox = {
  HTMLElement: Element,
  clean: value => String(value || '').trim(),
  DIALOG_ID: 'settings', HEADER_ID: 'header', HOME_DASHBOARD_ID: 'home',
  TOOLBOX_WRAPPER_ID: 'toolbox', TOOLBOX_DRAWER_ID: 'drawer', TOOLBOX_SETTINGS_ID: 'tool-settings',
  document: { querySelectorAll: selector => selector === 'button,select' ? controls : controls.filter(el => el.classes.has('kn-home-function-hidden')) },
  getNativeFunctionButtonBoxes: () => [box],
  isWebOSFeatureEnabled: () => true,
  ensureFunctionCenterStyles() {},
  restoreHomeFunctionListButtons() {},
  functionCenterState: { adopted: [] },
  MutationObserver: class { observe() {} },
};
vm.createContext(sandbox);
for (const [begin, end] of [
  ['  function knFunctionCenterIsDialogControl', '  function knFunctionCenterFindNativeLanguageSelect'],
  ['  function knFunctionCenterGetSourceElements', '  function knFunctionCenterGetItems'],
  ['  function hideHomeFunctionListButtons', '  function ensureFunctionCenterPanel'],
]) {
  const start = source.indexOf(begin), finish = source.indexOf(end, start);
  assert.ok(start >= 0 && finish > start);
  vm.runInContext(source.slice(start, finish), sandbox);
}
assert.equal(sandbox.knFunctionCenterShouldSuppress(sms.innerText, sms), true, 'the SMS preview reproduces the old label-matching bug');
for (let i = 0; i < 3; i++) sandbox.hideHomeFunctionListButtons();
assert.equal(sms.classes.has('kn-home-function-hidden'), false, 'SMS controls must be excluded from home-entry hiding');
assert.equal(sms.getAttribute('data-kn-home-function-hidden'), null, 'stale incorrect hiding must be repaired');
assert.equal(otherDialog.classes.has('kn-home-function-hidden'), false, 'other dialog controls must also remain usable');
assert.equal(nativeLogin.classes.has('kn-home-function-hidden'), true, 'native home-entry migration must remain functional');
assert.equal(nativeRestart.classes.has('kn-home-function-hidden'), true);
const sources = sandbox.knFunctionCenterGetSourceElements();
assert.ok(!sources.includes(sms));
assert.ok(!sources.includes(otherDialog));
assert.ok(sources.includes(nativeRestart));
assert.ok(sources.includes(directNative), 'explicitly adopted native controls in settings must remain discoverable');
console.log('webos native control scope tests: ok');
