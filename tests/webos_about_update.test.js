const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sourcePath = path.join(__dirname, '..', 'Web重构_v26.18.1.js');
const source = fs.readFileSync(sourcePath, 'utf8');
const start = source.indexOf('  function normalizeVersionTag');
const end = source.indexOf('  var FORWARD_CONFIG_KEY');

assert.ok(start >= 0 && end > start, 'GitHub version block should exist');

function element() {
  return { textContent: '', className: '', innerHTML: '', hidden: true, href: '', onclick: null };
}

const elements = new Map([
  ['kn-about-latest-version', element()],
  ['kn-about-version-state', element()],
  ['kn-about-update-note', element()],
  ['kn-about-stars', element()],
  ['kn-about-branch', element()],
  ['kn-about-checked', element()],
  ['kn-about-update-link', element()],
  ['kn-home-update-notice', element()],
  ['kn-home-update-version', element()],
  ['kn-home-update-link', element()],
  ['kn-home-update-close', element()],
]);
const storage = new Map();
const checkButton = element();

const sandbox = {
  console,
  Date,
  JSON,
  Math,
  Number,
  Object,
  Promise,
  AbortController,
  setTimeout,
  clearTimeout,
  String,
  encodeURIComponent,
  URL,
  location: { href: 'http://192.168.100.1:2333/' },
  VERSION: '26.18.1-communications-scope',
  GITHUB_REPO: 'LceAn/UTools-Beautifier',
  GITHUB_REPO_URL: 'https://github.com/LceAn/UTools-Beautifier',
  GITHUB_SOURCE_PATH: 'Web重构_v26.18.1.js',
  GITHUB_LOCAL_PROXY_DEFAULTS: ['http://127.0.0.1:8000/project-version'],
  GITHUB_CACHE_KEY: 'test-github-cache',
  GITHUB_UPDATE_DISMISS_KEY: 'test-update-dismissed',
  GITHUB_CACHE_TTL: 6 * 60 * 60 * 1000,
  KANO_baseURL: '/api',
  knEsc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },
  localStorage: {
    getItem(key) { return storage.has(key) ? storage.get(key) : null; },
    setItem(key, value) { storage.set(key, String(value)); },
  },
  lastProxyUrl: '',
  document: {
    getElementById(id) { return elements.get(id) || null; },
    querySelector(selector) { return selector === '[data-action="checkGithubVersion"]' ? checkButton : null; },
  },
  async fetch(url) {
    const value = String(url);
    if (value === '/api/proxy/--https://api.github.com/repos/LceAn/UTools-Beautifier') {
      return {
        ok: true,
        status: 200,
        async text() {
          return JSON.stringify({ default_branch: 'main', stargazers_count: 42, pushed_at: '2026-07-29T00:00:00Z' });
        },
      };
    }
    if (value.startsWith('/api/proxy/--https://api.github.com/repos/LceAn/UTools-Beautifier/contents?')) {
      return {
        ok: true,
        status: 200,
        async text() {
          return JSON.stringify([
            { name: 'Web重构_v26.15.0.js', download_url: 'https://raw.githubusercontent.com/example/26.15.0.js', html_url: 'https://example/26.15.0' },
            { name: 'Web重构_v26.18.1.js', download_url: 'https://raw.githubusercontent.com/example/26.18.0.js', html_url: 'https://example/26.18.0' },
          ]);
        },
      };
    }
    if (value === '/api/proxy/--https://raw.githubusercontent.com/example/26.18.0.js') {
      return { ok: true, status: 200, async text() { return "var VERSION = '26.19.0-next';"; } };
    }
    throw new Error(`Unexpected URL: ${url}`);
  },
};

vm.createContext(sandbox);
vm.runInContext(source.slice(start, end), sandbox, { filename: 'webos-version-block.js' });

async function main() {
  assert.equal(sandbox.compareVersionTags('26.14.2-local-update-proxy', '26.14.1-persisted-save'), 1);
  assert.equal(sandbox.compareVersionTags('26.15.0', '26.14.9'), 1);
  assert.equal(sandbox.compareVersionTags('26.13.9', '26.14.2'), -1);
  assert.equal(sandbox.compareVersionTags('development', '26.14.2'), 0);
  assert.equal(await sandbox.firstSuccessful([
    () => Promise.reject(new Error('first failed')),
    () => Promise.resolve('second succeeded'),
  ], ['first', 'second']), 'second succeeded');

  const info = await sandbox.fetchGithubLatestVersion();
  assert.equal(info.tag, '26.19.0-next');
  assert.equal(info.stars, 42);
  assert.equal(info.branch, 'main');
  assert.equal(info.source, '设备同源 GitHub 代理');
  assert.equal(sandbox.getWebOSProxyUrl('https://example.com/a'), '/api/proxy/--https://example.com/a');

  await sandbox.checkGithubVersion({ force: true, quiet: true });
  assert.equal(elements.get('kn-about-latest-version').textContent, '26.19.0-next');
  assert.equal(elements.get('kn-about-stars').textContent, '42');
  assert.equal(elements.get('kn-home-update-notice').hidden, false);
  assert.match(elements.get('kn-home-update-version').textContent, /26\.19\.0-next/);
  assert.equal(checkButton.disabled, false);
  assert.equal(checkButton.textContent, '立即检查');

  elements.get('kn-home-update-close').onclick();
  assert.equal(elements.get('kn-home-update-notice').hidden, true);
  assert.equal(storage.get('test-update-dismissed'), '26.19.0-next');

  sandbox.fetch = async (url) => {
    sandbox.lastProxyUrl = String(url);
    if (String(url).includes('api.github.com')) throw new TypeError('Failed to fetch');
    if (String(url).startsWith('/api/proxy/--http://127.0.0.1:8000/project-version')) {
      return {
        ok: true,
        status: 200,
        async text() {
          return JSON.stringify({ ok: true, tag: '26.14.2-local-update-proxy', branch: 'main', stars: 24, url: 'https://example/latest' });
        },
      };
    }
    throw new Error(`Unexpected fallback URL: ${url}`);
  };
  const proxyInfo = await sandbox.fetchGithubLatestVersion({ force: true });
  assert.equal(proxyInfo.tag, '26.14.2-local-update-proxy');
  assert.equal(proxyInfo.source, '设备同源更新代理');
  assert.equal(proxyInfo.stars, 24);
  assert.equal(proxyInfo.proxyCached, false);
  assert.ok(sandbox.lastProxyUrl.includes('force=1'));

  // A slow device proxy must not delay a working direct GitHub channel.
  const directMock = async (url) => {
    const value = String(url);
    if (value.startsWith('/api/proxy/--https://')) return new Promise(() => {});
    if (value === 'https://api.github.com/repos/LceAn/UTools-Beautifier') return { ok: true, status: 200, async text() { return JSON.stringify({ default_branch: 'main', stargazers_count: 43 }); } };
    if (value.includes('/contents?')) return { ok: true, status: 200, async text() { return JSON.stringify([{ name: 'Web重构_v26.20.0.js', url: 'https://api.github.com/example/new-file', download_url: 'https://raw.githubusercontent.com/example/new.js' }]); } };
    if (value === 'https://api.github.com/example/new-file') return { ok: true, status: 200, async text() { return "var VERSION = '26.20.0-direct';"; } };
    throw new Error('Unavailable');
  };
  const nativeSetTimeout = sandbox.setTimeout;
  sandbox.setTimeout = (callback, ms) => setTimeout(callback, Math.min(ms, 40));
  sandbox.fetch = directMock;
  const directInfo = await sandbox.fetchGithubLatestVersion({ force: true });
  assert.equal(directInfo.tag, '26.20.0-direct');
  assert.equal(directInfo.source, 'GitHub 直连');

  // Timeout covers a response body that stalls after headers arrive.
  sandbox.fetch = async () => ({ ok: true, status: 200, text() { return new Promise(() => {}); } });
  await assert.rejects(sandbox.fetchGithubRequest('https://example/body', {}, 10), /超时/);

  sandbox.fetch = async () => { throw new Error('offline'); };
  const retained = await sandbox.checkGithubVersion({ force: true });
  assert.equal(retained.tag, '26.19.0-next');
  assert.equal(elements.get('kn-about-version-state').textContent, '使用上次结果');
  assert.equal(checkButton.disabled, false);
  assert.equal(checkButton.textContent, '立即检查');
  sandbox.setTimeout = nativeSetTimeout;

  console.log('webos about/update tests: ok');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
