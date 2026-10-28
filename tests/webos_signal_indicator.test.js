const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'Web重构_v26.17.1.js'), 'utf8');
const bars = Array.from({ length: 5 }, () => ({
  active: false,
  classList: { toggle(name, active) { assert.equal(name, 'is-on'); this.owner.active = active; } },
}));
bars.forEach(bar => { bar.classList.owner = bar; });
const attrs = {};
const indicator = {
  title: '',
  textContent: '',
  getAttribute(name) { return attrs[name] || null; },
  setAttribute(name, value) { attrs[name] = value; },
  querySelectorAll: () => bars,
};
const sandbox = { document: { getElementById: () => indicator }, clean: value => String(value).trim() };
vm.createContext(sandbox);
const begin = source.indexOf('  function getHomeSignalPresentation(');
const end = source.indexOf('  function setHomeTitle(', begin);
assert.ok(begin >= 0 && end > begin);
vm.runInContext(source.slice(begin, end), sandbox);

for (let level = 0; level <= 5; level++) {
  sandbox.setHomeSignalIndicator(level);
  assert.equal(attrs['data-level'], String(level));
  assert.equal(attrs['data-tone'], level >= 4 ? 'good' : level >= 2 ? 'warn' : 'bad');
  assert.equal(bars.filter(bar => bar.active).length, level);
  assert.equal(indicator.textContent, '', 'the indicator must not display a numeric counter');
  assert.equal(attrs['aria-label'], `信号强度：${level} / 5`);
  assert.equal(indicator.title, attrs['aria-label']);
}
sandbox.setHomeSignalIndicator(0);
assert.equal(bars.filter(bar => bar.active).length, 0, 'a new weak reading must clear previously lit bars');
for (const missing of [null, undefined, '', 'N/A', NaN, Infinity, false, {}]) {
  sandbox.setHomeSignalIndicator(missing);
  assert.equal(attrs['data-level'], 'unknown');
  assert.equal(attrs['data-tone'], 'unknown');
  assert.equal(bars.filter(bar => bar.active).length, 0);
}
assert.equal(sandbox.getHomeSignalPresentation('4').level, 4);
assert.equal(sandbox.getHomeSignalPresentation(9).level, 5);
assert.equal(sandbox.getHomeSignalPresentation(-2).level, 0);
const diagnosticsBegin = source.indexOf('  function knDiagnosticsRead(');
const diagnosticsEnd = source.indexOf('  function knDiagnosticsRadioMetric(', diagnosticsBegin);
vm.runInContext(source.slice(diagnosticsBegin, diagnosticsEnd), sandbox);
sandbox.setHomeSignalIndicator(5);
assert.equal(sandbox.knDiagnosticsRead('kn-home-signal'), '信号强度：5 / 5', 'diagnostics must retain the accessible signal reading');
sandbox.document.getElementById = () => null;
assert.doesNotThrow(() => sandbox.setHomeSignalIndicator(5));
const markup = source.match(/class="kn-home-signal-bars" aria-hidden="true">(.*?)<\/span>/);
assert.ok(markup);
assert.equal((markup[1].match(/<i>/g) || []).length, 5);
assert.match(source, /class="kn-home-signal-indicator" role="img" aria-label=/);
assert.ok(!source.includes('kn-home-signal-value'), 'the numeric signal counter and its styling must be removed');
assert.ok(source.includes('setHomeSignalIndicator(signal);'));
assert.ok(!source.includes("setHomeTitle('#kn-home-signal'"), 'refresh must preserve indicator children');
assert.match(source, /\.kn-home-signal-indicator\{[^}]*height:15px;/, 'the badge must retain the previous text line height');
console.log('webos signal indicator tests: ok');
