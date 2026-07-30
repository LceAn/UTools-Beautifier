const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sourcePath = path.join(__dirname, '..', 'Web重构_v26.14.1.js');
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

const sandbox = {
  console,
  Date,
  JSON,
  Math,
  Number,
  Object,
  Promise,
  String,
  encodeURIComponent,
  VERSION: '26.14.1-persisted-save',
  GITHUB_REPO: 'LceAn/UTools-Beautifier',
  GITHUB_REPO_URL: 'https://github.com/LceAn/UTools-Beautifier',
  GITHUB_SOURCE_PATH: 'Web重构_v26.14.1.js',
  GITHUB_CACHE_KEY: 'test-github-cache',
  GITHUB_UPDATE_DISMISS_KEY: 'test-update-dismissed',
  GITHUB_CACHE_TTL: 6 * 60 * 60 * 1000,
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
  document: {
    getElementById(id) { return elements.get(id) || null; },
    querySelector() { return null; },
  },
  async fetch(url) {
    if (url === 'https://api.github.com/repos/LceAn/UTools-Beautifier') {
      return {
        ok: true,
        status: 200,
        async json() {
          return { default_branch: 'main', stargazers_count: 42, pushed_at: '2026-07-29T00:00:00Z' };
        },
      };
    }
    if (String(url).includes('raw.githubusercontent.com')) {
      return { ok: true, status: 200, async text() { return "var VERSION = '26.15.0-next';"; } };
    }
    throw new Error(`Unexpected URL: ${url}`);
  },
};

vm.createContext(sandbox);
vm.runInContext(source.slice(start, end), sandbox, { filename: 'webos-version-block.js' });

async function main() {
  assert.equal(sandbox.compareVersionTags('26.14.1-persisted-save', '26.14.0-settings-center'), 1);
  assert.equal(sandbox.compareVersionTags('26.15.0', '26.14.9'), 1);
  assert.equal(sandbox.compareVersionTags('26.13.9', '26.14.1'), -1);
  assert.equal(sandbox.compareVersionTags('development', '26.14.1'), 0);

  const info = await sandbox.fetchGithubLatestVersion();
  assert.equal(info.tag, '26.15.0-next');
  assert.equal(info.stars, 42);
  assert.equal(info.branch, 'main');

  await sandbox.checkGithubVersion({ force: true, quiet: true });
  assert.equal(elements.get('kn-about-latest-version').textContent, '26.15.0-next');
  assert.equal(elements.get('kn-about-stars').textContent, '42');
  assert.equal(elements.get('kn-home-update-notice').hidden, false);
  assert.match(elements.get('kn-home-update-version').textContent, /26\.15\.0-next/);

  elements.get('kn-home-update-close').onclick();
  assert.equal(elements.get('kn-home-update-notice').hidden, true);
  assert.equal(storage.get('test-update-dismissed'), '26.15.0-next');

  console.log('webos about/update tests: ok');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
