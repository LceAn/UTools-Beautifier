const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'Web重构_v26.18.0.js'), 'utf8');
assert.ok(!source.includes('id="kn-home-signal"'), 'home must not duplicate the header signal');
assert.ok(!source.includes('kn-home-signal-indicator'));
assert.ok(!source.includes('setHomeSignalIndicator'));
assert.ok(source.includes('id="kn-header-signal"'), 'the menu bar signal must remain');
assert.ok(source.includes("headerText('#kn-pop-signal', signal + ' / 5')"));
assert.ok(source.includes("['信号格', knDiagnosticsRead('kn-pop-signal')]"));
assert.ok(source.includes('id="kn-home-val-rsrp"'), 'radio metrics must remain');
console.log('webos signal deduplication tests: ok');
