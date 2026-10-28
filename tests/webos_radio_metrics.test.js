const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'Web重构_v26.16.2.js'), 'utf8');
new vm.Script(source.replace(/^<script>\s*/, '').replace(/<\/script>\s*$/, ''));
let nativeText = '';
const sandbox = {
  clean(value) { return String(value == null ? '' : value).replace(/\s+/g, ' ').trim(); },
  homeEscReg(value) { return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); },
  extractFirstRegexFromHomeText(regex) { return nativeText.match(regex)?.[1] || ''; },
  state: {},
};
vm.createContext(sandbox);
for (const [start, end] of [
  ['  function normalizeRadioMetricValue', '  function isMacAddress'],
  ['  function pickHomeRadioValue', '  function getHomeStorageFromDom'],
  ['  function homeParseNumber', '  function homeRate'],
  ['  function stabilizeHomeRadioMetric', '  function pickHomeDataVolumeFromDom'],
]) {
  const begin = source.indexOf(start);
  const finish = source.indexOf(end, begin);
  assert.ok(begin >= 0 && finish > begin);
  vm.runInContext(source.slice(begin, finish), sandbox);
}

const refreshStart = source.indexOf('  function refreshHomeDashboardStatus');
const refresh = source.slice(refreshStart);
const query = refresh.match(/var cmds = (\[[\s\S]*?\])\.join\(',\'\)/);
assert.ok(query, 'home refresh query must be found');
const requestedFields = vm.runInContext(query[1], sandbox);
assert.ok(requestedFields.includes('Z5g_rsrp'));
assert.ok(requestedFields.includes('Nr_snr'));

// Radio-only fixture from F50 / UFI-TOOLS v4.1.5; no device identifiers.
sandbox.merged = { network_type: '5G', Z5g_rsrp: -78, nr_rsrp: -76, nr_rsrq: -5, Nr_snr: 16, rssi: 5, nr_rssi: '' };
const assignments = refresh.slice(refresh.indexOf('      var rsrp ='), refresh.indexOf('      var radioMain ='));
vm.runInContext(assignments, sandbox);
assert.equal(sandbox.rsrp, '-78 dBm');
assert.equal(sandbox.rsrq, '-5 dB');
assert.equal(sandbox.sinr, '16 dB');
assert.equal(sandbox.rssi, '', 'signal bars must not be displayed as dBm');

assert.equal(sandbox.pickHomeRadioValue({ nr5g_rsrp: 'N/A', lte_rsrp: -98 }, ['nr5g_rsrp', 'lte_rsrp'], ['RSRP'], 'RSRP'), '-98 dBm');
assert.equal(sandbox.pickHomeRadioValue({ nr5g_rsrp: '0', lte_rsrp: -102 }, ['nr5g_rsrp', 'lte_rsrp'], ['RSRP'], 'RSRP'), '-102 dBm');
assert.equal(sandbox.normalizeRadioMetricValue('-69', 'RSSI'), '-69 dBm');

nativeText = '信号参数\n5G接收功率：-81\n5G SINR：14\n5G RSRQ：-5';
sandbox.state.homeLastRadio = {};
sandbox.merged = {};
vm.runInContext(assignments, sandbox);
assert.equal(sandbox.rsrp, '-81 dBm', 'native Chinese receive-power label must work');

assert.equal(sandbox.stabilizeHomeRadioMetric('rsrp', '-130 dBm'), '-130 dBm');
assert.equal(sandbox.stabilizeHomeRadioMetric('rsrp', ''), '-130 dBm');
assert.equal(sandbox.stabilizeHomeRadioMetric('rsrp', '-79 dBm'), '-79 dBm');
assert.equal(sandbox.stabilizeHomeRadioMetric('sinr', '-12 dB'), '-12 dB');
assert.equal(sandbox.stabilizeHomeRadioMetric('rsrq', '-21 dB'), '-21 dB');
console.log('webos radio metrics tests: ok');
