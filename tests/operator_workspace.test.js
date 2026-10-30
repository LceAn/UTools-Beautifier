const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', '运营商信息_V1.4.0.js'), 'utf8');
new vm.Script(source);

class Node {
  constructor() { this.dataset = {}; this.attrs = {}; this.className = ''; this.textContent = ''; this.children = []; this._html = ''; this.htmlWrites = 0; this.scrollTop = 0; }
  get innerHTML() { return this._html; }
  set innerHTML(value) { this._html = value; this.htmlWrites++; this.children.forEach(child => { child.parent = null; }); this.children = []; }
  get firstElementChild() { return this.children[0] || null; }
  get nextElementSibling() { return this.parent?.children[this.parent.children.indexOf(this) + 1] || null; }
  insertBefore(node, cursor) { if (node.parent) node.remove(); this.children.splice(cursor ? this.children.indexOf(cursor) : this.children.length, 0, node); node.parent = this; }
  remove() { if (this.parent) this.parent.children.splice(this.parent.children.indexOf(this), 1); this.parent = null; }
  getAttribute(key) { return this.attrs[key] || null; }
  setAttribute(key, value) { this.attrs[key] = value; }
}

function message(id, number, text, date = '26,10,28,12,00,00', tag = '0') {
  return { id, number, content: Buffer.from(text).toString('base64'), date, tag };
}
function reply(id, text, date = '2026-10-28 12:00') { return { id: String(id), number: '10099', content: text, date, direction: 'in' }; }

function harness() {
  const elements = new Map([['kano-operator-status', new Node()]]);
  const storage = new Map();
  const intervals = new Map();
  const env = { smsResult: { messages: [] }, smsImpl: null, fetchImpl: null, smsReads: 0, posts: [], requests: [], confirm: false, native: { network_provider: '中国广电', network_type: 'NR5G_SA' }, direct: { signalbar: 0, simcard_status: '1', simcard_roam: '0', ppp_status: 'ipv4_ipv6_connected' } };
  const sandbox = {
    window: { location: { href: 'http://192.168.100.1:2333/' }, confirm: () => env.confirm },
    document: { getElementById: id => elements.get(id) || null, querySelector: () => null, querySelectorAll: () => [], createElement: () => new Node() },
    localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
    getUFIData: async () => env.native,
    getSmsInfo: async () => { env.smsReads++; return env.smsImpl ? env.smsImpl() : env.smsResult; },
    sendSms_UFI: async payload => { env.posts.push(payload); return { result: 'success' }; },
    fetch: async url => {
      env.requests.push(String(url));
      const payload = env.fetchImpl ? await env.fetchImpl(String(url)) : env.direct;
      return { ok: true, status: 200, text: async () => JSON.stringify(payload) };
    },
    createToast() {}, console: { log() {}, warn() {}, error() {} },
    navigator: {}, URL, URLSearchParams, AbortController, atob,
    setTimeout, clearTimeout,
    setInterval: (fn, ms) => { const id = intervals.size + 1; intervals.set(id, { fn, ms }); return id; },
    clearInterval: id => intervals.delete(id),
  };
  vm.createContext(sandbox);
  const end = source.indexOf('  try {\n    if (window.KanoOperatorInfo');
  assert.ok(end > 0);
  vm.runInContext(source.slice(0, end) + 'window.testApi = { state, readSnapshot, normalizeConnection, normalizeRoaming, normalizeNetworkType, normalizeSimState, parseCarrierSms, parseReplies, parseResultDate, getResultFreshness, normalizeReplies, normalizeSendResponse, readReplies, queryBroadcastApi, normalizeBroadcastApiResult, syncEffectiveParsed, changeProvider, normalizeBroadcastApiUrl, getFilteredReplies, renderReplies, sendQuery, close }; }());', sandbox);
  return { api: sandbox.window.testApi, env, elements, storage, intervals };
}

async function main() {
  const { api, env, elements, storage, intervals } = harness();
  assert.equal(api.parseCarrierSms('您的余额已不足15元，请及时充值。').balance, '');
  assert.equal(api.parseCarrierSms('【话费账单】尊敬的19212345678客户，2026年9月共消费28元').balance, '');
  assert.equal(api.parseCarrierSms('充值后您的实时余额为251.90元。').balance, '251.90 元');
  assert.equal(api.parseCarrierSms('当前话费余额为-10.00元').balance, '-10.00 元');
  const combined = api.parseReplies([
    reply(1, '成功办理校园年套餐（编号：25ZJ），生效时间：2026年10月01日', '2026-09-13 12:00'),
    reply(2, '充值后实时余额为251.90元', '2026-09-13 13:00'),
    reply(3, '流量加油包已使用10GB639.28MB，剩余4GB384.72MB', '2026-09-28 13:19'),
    reply(4, '您的验证码为123456，请勿泄露，测试余额为999元', '2026-10-28 12:00'),
  ]);
  assert.equal(combined.balance, '251.90 元');
  assert.equal(combined.dataRemaining, '4GB 384.72MB');
  assert.equal(combined.dataScope, '加油包');
  assert.equal(combined.planName, '校园年套餐');
  assert.equal(combined.planEffectiveDate, '2026年10月01日');
  assert.equal(combined.fieldSources.balance.id, '2');
  assert.equal(combined.fieldSources.dataRemaining.id, '3');
  assert.equal(api.getResultFreshness(combined, 'balance', Date.parse('2026-10-29T00:00:00+08:00')).stale, true);
  const exhausted = api.parseReplies([reply(10, '加油包已用尽'), reply(9, '流量已使用5GB，剩余2GB', '2026-10-27 12:00')]);
  assert.equal(exhausted.dataRemaining, '0 MB');
  assert.equal(exhausted.dataUsed, undefined, 'do not mix usage from a different resource');
  assert.equal(api.parseResultDate('2026-02-31'), null);
  assert.equal(api.parseResultDate('2026-10-29T00:00:00Z').getTime(), Date.parse('2026-10-29T00:00:00Z'));
  assert.equal(api.normalizeConnection('ipv4_ipv6_connected'), 'IPv4 / IPv6 已连接');
  assert.equal(api.normalizeConnection('disconnected'), '未连接');
  assert.equal(api.normalizeRoaming('0'), '本地网络');
  assert.equal(api.normalizeNetworkType('NR5G_SA'), '5G');
  assert.equal(api.normalizeSendResponse({ result: 'failed', message: 'not success' }), false);
  assert.equal(api.normalizeSendResponse({ result: 0 }), true);
  assert.throws(() => api.normalizeBroadcastApiUrl('ftp://example.com/test'));
  assert.throws(() => api.normalizeBroadcastApiUrl('http://user:secret@localhost:8000/traffic'));
  const snapshot = await api.readSnapshot();
  assert.equal(snapshot.signalbar, 0, 'valid zero signal must survive merging');
  assert.equal(snapshot.simcard_status, '1');
  assert.equal(env.requests.length, 1, 'direct status fields must be fetched even when native data is partial');
  const normalized = api.normalizeReplies({ messages: [message(1, '10099', '剩余1GB'), message(2, '+8610099', '余额2元'), message(3, '1234510099', '余额999元')] }, '10099');
  assert.equal(normalized.length, 2, 'unrelated senders with the same suffix must be excluded');

  api.state.provider = 'broadcast';
  env.smsResult = { messages: [message(1, '10099', '余额12元')] };
  await api.readReplies(false);
  assert.equal(api.state.smsParsed.balance, '12 元');
  env.smsResult = {};
  await api.readReplies(false);
  assert.equal(api.state.smsParsed.balance, '12 元', 'invalid responses must retain previous data');
  assert.ok(api.state.repliesError);
  let oldRead;
  env.smsImpl = () => new Promise(resolve => { oldRead = resolve; });
  const pending = api.readReplies(false);
  const reads = env.smsReads;
  await api.readReplies(false);
  assert.equal(env.smsReads, reads, 'duplicate reads must not start another request');
  env.smsImpl = null;
  env.smsResult = { messages: [message(2, '10086', '当前余额5元')] };
  api.changeProvider('mobile');
  await new Promise(resolve => setImmediate(resolve));
  oldRead({ messages: [message(3, '10099', '当前余额99元')] });
  await pending;
  assert.equal(api.state.provider, 'mobile');
  assert.equal(api.state.parsed.balance, '5 元', 'a late old-provider response must not overwrite current data');

  api.state.provider = 'broadcast';
  storage.set('kano_operator_info_broadcast_api_v2', 'http://10.0.0.2:8000/traffic');
  let oldProxy;
  env.fetchImpl = () => new Promise(resolve => { oldProxy = resolve; });
  const proxyPending = api.queryBroadcastApi(false);
  api.changeProvider('mobile');
  oldProxy({ ok: true, total_gb: 20, used_gb: 8, balance_gb: 12 });
  await proxyPending;
  assert.equal(api.state.proxyParsed.dataRemaining, undefined, 'late proxy results must not leak between carriers');
  assert.equal(api.state.proxyBusy, false);
  await new Promise(resolve => setImmediate(resolve));

  api.state.provider = 'broadcast';
  storage.set('kano_operator_info_broadcast_api_v2', 'http://10.0.0.2:8000/traffic?details=1&refresh=0#results');
  env.fetchImpl = async () => ({ total_gb: 20, used_gb: 8, balance_gb: 12 });
  await api.queryBroadcastApi(true);
  assert.equal(env.requests.at(-1), '/api/proxy/--http://10.0.0.2:8000/traffic?details=1&refresh=1', 'manual refresh must preserve query parameters, replace refresh and omit the fragment');

  api.state.provider = 'broadcast';
  api.state.smsParsed = combined;
  api.state.proxyParsed = api.normalizeBroadcastApiResult({ total_gb: 20, used_gb: 8, balance_gb: 12, updated_at: '2026-10-29 12:00' });
  api.syncEffectiveParsed();
  assert.equal(api.state.parsed.balance, '251.90 元', 'API traffic must retain independently sourced SMS balance');
  assert.equal(api.state.parsed.fieldSources.balance.kind, 'sms');
  assert.equal(api.state.parsed.fieldSources.dataRemaining.kind, 'proxy');
  env.fetchImpl = async () => { throw new Error('offline'); };
  await api.queryBroadcastApi(false);
  assert.equal(api.state.parsed.dataRemaining, '12 GB');
  assert.equal(api.state.parsed.proxyStale, true, 'retained API results must be marked stale after failure');

  api.changeProvider('mobile');
  await new Promise(resolve => setImmediate(resolve));
  env.smsResult = { messages: [message(5, '10086', '当前余额5元')] };
  await api.sendQuery('balance');
  assert.equal(env.posts.length, 0, 'no SMS may be sent without confirmation');
  env.confirm = true;
  await api.sendQuery('balance');
  assert.equal(env.posts.length, 1);
  const poll = [...intervals.values()].find(timer => timer.ms === 7000);
  assert.ok(poll);
  env.smsResult.messages.unshift(message(6, '10086', '您发送的指令有误或不存在'));
  await poll.fn();
  assert.equal(api.state.pollTimer, null);
  assert.match(elements.get('kano-operator-status').textContent, /未接受/);

  const replies = new Node();
  elements.set('kano-operator-replies', replies);
  api.state.replies = [reply(1, '剩余1GB'), reply(2, '您的验证码为123456，请勿泄露')];
  api.state.replyFilter = 'all';
  api.renderReplies();
  const first = replies.children[0], writes = first.htmlWrites;
  replies.scrollTop = 123;
  api.renderReplies();
  assert.equal(replies.children[0], first);
  assert.equal(first.htmlWrites, writes, 'unchanged replies must not be rebuilt');
  assert.equal(replies.scrollTop, 123);
  assert.ok(!replies.children[1].innerHTML.includes('123456'), 'verification codes must remain masked');
  api.state.showIdentifiers = true;
  api.close();
  assert.equal(api.state.showIdentifiers, false);
  console.log('operator workspace tests: ok');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
