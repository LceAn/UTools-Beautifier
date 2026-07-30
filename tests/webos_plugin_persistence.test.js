const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sourcePath = path.join(__dirname, '..', 'Web重构_v26.14.4.js');
const source = fs.readFileSync(sourcePath, 'utf8');
const start = source.indexOf('  function knPluginGetBaseURL');
const end = source.indexOf('  function knPluginMakeId');

assert.ok(start >= 0 && end > start, 'plugin persistence block should exist');

let fetchImpl = null;
const sandbox = {
  Date,
  JSON,
  Object,
  Promise,
  String,
  setTimeout,
  localStorage: { getItem() { return ''; } },
  fetch(...args) { return fetchImpl(...args); },
};

function response(body, options = {}) {
  return {
    ok: options.ok !== false,
    status: options.status || 200,
    async text() { return body; },
  };
}

vm.createContext(sandbox);
vm.runInContext(source.slice(start, end), sandbox, { filename: 'webos-plugin-persistence.js' });

async function main() {
  assert.equal(sandbox.knPluginNormalizePersistedText('a\r\nb\n'), 'a\nb');
  assert.equal(sandbox.knPluginSaveResultSucceeded(true), true);
  assert.equal(sandbox.knPluginSaveResultSucceeded('ok'), true);
  assert.equal(sandbox.knPluginSaveResultSucceeded({ result: 'success' }), true);
  assert.equal(sandbox.knPluginSaveResultSucceeded({ success: true }), true);
  assert.equal(sandbox.knPluginSaveResultSucceeded({ code: 0 }), true);
  assert.equal(sandbox.knPluginSaveResultSucceeded({ result: 'unknown' }), false);

  let request = null;
  fetchImpl = async (url, options) => {
    request = { url, options };
    return response('{"result":"success"}');
  };
  const saved = await sandbox.knPluginSetCustomHead('plugin-source');
  assert.equal(saved.result, 'success');
  assert.equal(request.options.credentials, 'same-origin');
  assert.match(request.options.headers['Content-Type'], /^application\/json/);
  assert.equal(JSON.parse(request.options.body).text, 'plugin-source');

  fetchImpl = async () => response('');
  const emptySuccess = await sandbox.knPluginSetCustomHead('plugin-source');
  assert.equal(emptySuccess.result, 'unknown');
  assert.equal(emptySuccess.empty, true);

  fetchImpl = async () => response(JSON.stringify({ text: 'plugin-source\r\n' }));
  assert.equal(await sandbox.knPluginGetCustomHead(), 'plugin-source\r\n');
  assert.equal((await sandbox.knPluginVerifySavedHead('plugin-source\n')).ok, true);

  fetchImpl = async () => response('', { ok: false, status: 401 });
  await assert.rejects(sandbox.knPluginGetCustomHead(), /HTTP 401/);

  fetchImpl = async () => response('');
  await assert.rejects(sandbox.knPluginGetCustomHead(), /空内容/);

  console.log('webos plugin persistence tests: ok');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
