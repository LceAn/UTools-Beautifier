const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', '运营商信息_V1.0.0.js'), 'utf8');
const helperStart = source.indexOf('  function clean');
const helperEnd = source.indexOf('  function firstValue');
const urlStart = source.indexOf('  function getBroadcastApiUrls');
const urlEnd = source.indexOf('  async function readSnapshot');
const smsStart = source.indexOf('  function decodeSmsContent');
const smsEnd = source.indexOf('  async function fetchSmsInfo');

assert.ok(helperStart >= 0 && helperEnd > helperStart, 'broadcast request helpers should exist');
assert.ok(urlStart >= 0 && urlEnd > urlStart, 'broadcast URL helpers should exist');
assert.ok(smsStart >= 0 && smsEnd > smsStart, 'SMS decoding helpers should exist');
assert.match(source, /refresh\(false\)\.catch\(function \(\) \{\}\)\.finally\(startAutoReplyPolling\)/, 'operator data should refresh automatically after plugin load');
assert.doesNotMatch(source, /192\.168\.100\.249:8000/, 'operator plugin must not probe a fixed Mac address');
assert.doesNotMatch(source, /'连接异常'/, 'an unconfigured optional API must not be shown as a connection failure');
const closeStart = source.indexOf('  function close()');
const destroyStart = source.indexOf('  function destroy()');
assert.ok(closeStart >= 0 && destroyStart > closeStart, 'operator close lifecycle should exist');
assert.doesNotMatch(source.slice(closeStart, destroyStart), /stopAutoReplyPolling\(\)/, 'closing the panel should not stop background SMS polling');

const storage = new Map();
const calls = [];
const sandbox = {
  console,
  URL,
  Number,
  JSON,
  Promise,
  AbortController,
  atob,
  decodeURIComponent,
  setTimeout,
  clearTimeout,
  API_TIMEOUT: 1000,
  BROADCAST_API_KEY: 'test-broadcast-api',
  BROADCAST_DEFAULT_API_URLS: [],
  KANO_baseURL: '/api',
  window: { location: { href: 'http://192.168.100.1:2333/' } },
  localStorage: {
    getItem(key) { return storage.has(key) ? storage.get(key) : null; },
    setItem(key, value) { storage.set(key, String(value)); },
    removeItem(key) { storage.delete(key); },
  },
  async fetch(url) {
    calls.push(String(url));
    if (String(url).startsWith('/api/proxy/--http://10.0.0.2:8000/traffic')) {
      return {
        ok: true,
        status: 200,
        async text() {
          return JSON.stringify({
            ok: true,
            total_gb: 20,
            used_gb: 8,
            balance_gb: 12,
            automatic: true,
            cached: true,
            stale: false,
            last_success_at: '2026-07-30 15:30:00',
          });
        },
      };
    }
    throw new Error(`Unexpected URL: ${url}`);
  },
};

vm.createContext(sandbox);
vm.runInContext(source.slice(helperStart, helperEnd), sandbox, { filename: 'operator-broadcast-helpers.js' });
vm.runInContext(source.slice(urlStart, urlEnd), sandbox, { filename: 'operator-broadcast-urls.js' });
vm.runInContext(source.slice(smsStart, smsEnd), sandbox, { filename: 'operator-sms-parser.js' });

async function main() {
  assert.deepEqual(
    Array.from(sandbox.getBroadcastApiUrls()),
    [],
  );
  storage.set('test-broadcast-api', 'http://10.0.0.2:8000/traffic?details=1');
  assert.deepEqual(Array.from(sandbox.getBroadcastApiUrls()), ['http://10.0.0.2:8000/traffic?details=1']);
  assert.equal(
    sandbox.getBroadcastRequestUrls('http://10.0.0.2:8000/traffic?details=1')[0],
    '/api/proxy/--http://10.0.0.2:8000/traffic?details=1',
  );
  assert.equal(
    sandbox.getBroadcastRequestUrls('http://127.0.0.1:8000/traffic?details=1')[0],
    'http://127.0.0.1:8000/traffic?details=1',
  );

  const result = await sandbox.fetchBroadcastApi('http://10.0.0.2:8000/traffic?details=1');
  assert.equal(result.dataRemaining, '12 GB');
  assert.equal(result.dataUsed, '8 GB');
  assert.equal(result.replyKind, 'proxy');
  assert.equal(result.automatic, true);
  assert.equal(result.lastSuccessAt, '2026-07-30 15:30:00');
  assert.equal(calls.length, 1);

  assert.equal(sandbox.decodeSmsContent('MQ=='), '1');
  assert.equal(sandbox.decodeSmsContent('MTAwOTk='), '10099');

  const encodedSms = Buffer.from('【流量加油包提醒】尊敬的客户，截至2026年7月30日15时30分，您订购的流量加油包现已使用14GB319.90MB，剩余704.10MB。【中国广电】', 'utf8').toString('base64');
  const decodedSms = sandbox.decodeSmsContent(encodedSms);
  const parsedSms = sandbox.parseCarrierSms(decodedSms);
  assert.equal(parsedSms.dataUsed, '14GB 319.90MB');
  assert.equal(parsedSms.dataRemaining, '704.10MB');
  assert.equal(parsedSms.queryTime, '2026年7月30日15时30分');

  const actualDeviceSms = '44CQ5rWB6YeP5Yqg5rK55YyF5o+Q6YaS44CR5bCK5pWs55qE5a6i5oi377yM5oKo5aW977yB5oiq6IezMjAyNuW5tDfmnIgyOOaXpTXml7Y1MeWIhu+8jOaCqOiuoui0reeahOa1gemHj+WKoOayueWMheS6jjIwMjblubQ35pyIMjjml6Xlt7Lnu4/nlKjlsL3jgILlpZflpJbotYTotLnor7fmi6jmiZMxMDA5OeaIlueZu+W9leS4reWbveW5v+eUtUFQUOafpeivouOAguOAkOS4reWbveW5v+eUteOAkQ==';
  const actualParsed = sandbox.parseCarrierSms(sandbox.decodeSmsContent(actualDeviceSms));
  assert.equal(actualParsed.dataRemaining, '0 MB');
  assert.equal(actualParsed.status, '流量包已用尽');

  const preferredResult = sandbox.parseReplies([
    {
      id: '20',
      direction: 'in',
      number: '10099',
      date: '2026-07-31 10:34',
      content: '尊敬的客户，您好！您发送的指令有误或不存在。【中国广电】',
    },
    {
      id: '19',
      direction: 'in',
      number: '10099',
      date: '2026-07-30 23:49',
      content: '截至2026年7月30日23时49分，流量已使用14GB319.90MB，剩余704.10MB。【中国广电】',
    },
  ]);
  assert.equal(preferredResult.dataRemaining, '704.10MB');
  assert.equal(preferredResult.sourceDate, '2026-07-30 23:49');
  assert.equal(preferredResult.replyKind, undefined);
  console.log('operator broadcast auto-query tests: ok');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
