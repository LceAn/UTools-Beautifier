const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', '电话与短信_V1.4.0.js'), 'utf8');
new vm.Script(source);

async function harness() {
  const elements = new Map();
  for (const id of ['kn_phone_status', 'kn_sms_number', 'kn_sms_text', 'kn_sms_count', 'kn_sms_send_btn', 'kn_sms_clear_btn', 'kn_sms_paste_btn', 'kn_sms_send_status', 'kn_sms_load_status', 'kn_sms_threads']) {
    elements.set(id, { value: '', textContent: '', innerHTML: '', dataset: {}, style: {}, scrollTop: 0, querySelectorAll: () => [] });
  }
  const env = { list: [], posts: [], notices: [], response: { result: 'success' }, atResponse: { result: 'OK' }, throwRead: false, afterSend: null };
  const sandbox = {
    window: {},
    document: {
      getElementById: id => elements.get(id) || null,
      querySelector: selector => selector.startsWith('#') ? elements.get(selector.slice(1)) || null : null,
      querySelectorAll: () => [],
    },
    localStorage: { getItem: () => null },
    navigator: {},
    console: { log() {}, warn() {}, error() {} },
    createToast: (...args) => env.notices.push(args),
    getSmsInfo: async () => { if (env.throwRead) throw new Error('offline'); return { messages: env.list }; },
    fetch: async url => ({ json: async () => String(url).includes('/AT?') ? env.atResponse : ({ smsc: 'ready' }) }),
    login: async () => 'test-cookie',
    logout: async () => {},
    postData: async (cookie, payload) => {
      env.posts.push(payload);
      if (env.afterSend) env.afterSend();
      return { json: async () => env.response };
    },
    decodeBase64: value => Buffer.from(value, 'base64').toString('utf8'),
    setTimeout: fn => { queueMicrotask(fn); return 1; },
    clearTimeout() {},
    setInterval: () => 1,
    clearInterval() {},
    confirm: () => true,
    URLSearchParams,
  };
  vm.createContext(sandbox);
  const start = source.indexOf('  document.getElementById(MAIN_BTN_ID)?.remove();');
  const exports = `window.testApi = {
    normalizeSendResult, normalizeSmsList, normalizeSmsSendNumber, parseCLCCCalls,
    saveSmsDraft, restoreSmsDraft, updateComposer, readSmsList, sendSms, verifySmsSentByList, refreshStatus,
    getState: () => ({ smsCache, smsThreads, smsReadBusy, smsSendBusy, composerKey, callSession, statusKnown }),
    seed: list => { smsCache = normalizeSmsList(list); buildSmsThreads(smsCache); },
    seedCalls: calls => { currentCalls = calls; updateSessionFromCalls(calls); },
  };})();`;
  await vm.runInContext(source.slice(0, start) + exports, sandbox);
  return { api: sandbox.window.testApi, elements, env };
}

const message = (id, tag = '2', content = 'test') => ({ id, tag, number: '10099', content: Buffer.from(content).toString('base64'), date: '26,10,28,12,00,00' });

async function main() {
  const { api, elements: el, env } = await harness();
  assert.equal(api.normalizeSmsSendNumber('+86 138-0000-0000'), '13800000000');
  assert.equal(api.normalizeSendResult({ result: 'fail', message: 'not success' }).ok, false);
  assert.equal(api.normalizeSendResult({ result: 'pending' }).ok, true);
  assert.equal(api.parseCLCCCalls('+CLCC: 1,1,4,0,0,"10099",129\r\nOK')[0].status, 4);
  assert.equal(api.normalizeSmsList([message(1, '1', '中文 <script>')])[0].content, '中文 <script>');

  api.restoreSmsDraft('first', '10099');
  el.get('kn_sms_text').value = 'first draft';
  api.saveSmsDraft();
  api.restoreSmsDraft('second', '10086');
  assert.equal(el.get('kn_sms_text').value, '');
  el.get('kn_sms_text').value = 'second draft';
  api.saveSmsDraft();
  api.restoreSmsDraft('first');
  assert.equal(el.get('kn_sms_text').value, 'first draft');
  assert.equal(el.get('kn_sms_number').value, '10099');
  assert.equal(el.get('kn_sms_send_btn').disabled, false);
  el.get('kn_sms_number').value = 'invalid';
  api.updateComposer();
  assert.equal(el.get('kn_sms_send_btn').disabled, true);

  api.seed([message(10)]);
  env.throwRead = true;
  await api.readSmsList(false);
  assert.equal(api.getState().smsCache.length, 1, 'read failure must retain cached messages');
  assert.equal(api.getState().smsReadBusy, false);
  assert.match(el.get('kn_sms_load_status').textContent, /读取失败/);
  env.throwRead = false;
  env.list = [message(10)];
  const oldOnly = await api.verifySmsSentByList({ number: '10099', content: 'test', existingIds: new Set(['10']) });
  assert.equal(oldOnly.sent, false, 'an old identical SMS must not confirm a new send');
  env.list.push(message(11));
  const fresh = await api.verifySmsSentByList({ number: '10099', content: 'test', existingIds: new Set(['10']) });
  assert.equal(fresh.sent, true);

  api.restoreSmsDraft('first');
  el.get('kn_sms_number').value = '10099';
  el.get('kn_sms_text').value = 'new message';
  env.list = [message(10)];
  env.afterSend = () => { env.list = [message(12, '3', 'new message')]; };
  const sending = api.sendSms();
  await api.sendSms();
  await sending;
  assert.equal(env.posts.length, 1, 'double submit must send only once');
  assert.equal(el.get('kn_sms_text').value, 'new message', 'confirmed failure must restore the draft');
  assert.match(el.get('kn_sms_send_status').textContent, /发送失败/);
  assert.equal(api.getState().smsSendBusy, false);

  env.response = { result: 'fail', message: 'rejected' };
  env.afterSend = null;
  await api.sendSms();
  assert.equal(el.get('kn_sms_text').value, 'new message', 'rejected send must keep the draft');

  env.response = { result: 'success' };
  env.afterSend = () => { env.list = [message(13, '2', 'new message')]; };
  await api.sendSms();
  assert.equal(el.get('kn_sms_text').value, '', 'accepted draft must clear only after submission');
  assert.match(el.get('kn_sms_send_status').textContent, /非送达回执/);
  api.seedCalls([{ dir: 0, status: 0, number: '10099' }]);
  env.atResponse = { error: 'offline' };
  await api.refreshStatus(false);
  assert.equal(api.getState().callSession.endedAt, null, 'a failed query must not terminate the displayed call');
  assert.equal(api.getState().statusKnown, false);
  env.atResponse = { result: 'OK' };
  await api.refreshStatus(false);
  assert.ok(api.getState().callSession.endedAt, 'a successful empty query may end the session');

  const resend = source.slice(source.indexOf("body.querySelectorAll('[data-action=\"sms-resend\"]')"), source.indexOf("body.querySelectorAll('[data-action=\"sms-copy\"]')"));
  assert.ok(resend.includes('textInput?.focus()'));
  assert.ok(!resend.includes('await sendSms()'), 'resend must enter editing instead of sending immediately');
  assert.ok(source.includes('data-mobile-pane="list"'));
  assert.ok(source.includes('role="dialog" aria-modal="true"'));
  assert.ok(source.includes("const selectedKey = activeSmsThreadKey;"), 'mark-read must capture the selected thread');
  console.log('phone/sms interaction tests: ok');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
