//<script>
(function () {
  'use strict';

  var TITLE = '运营商信息';
  var VERSION = '1.4.0-operator-workspace';
  var STYLE_ID = 'kano-operator-info-style';
  var MODAL_ID = 'kano-operator-info-modal';
  var BUTTON_ID = 'kano-operator-info-button';
  var PROVIDER_KEY = 'kano_operator_info_provider_v1';
  var BROADCAST_API_KEY = 'kano_operator_info_broadcast_api_v2';
  var POLL_INTERVAL = 7000;
  var POLL_TIMEOUT = 90000;
  var API_TIMEOUT = 8000;
  var BROADCAST_POLL_INTERVAL = 5 * 60 * 1000;
  var BROADCAST_DEFAULT_API_URLS = [];

  var state = {
    snapshot: {},
    provider: 'unknown',
    replies: [],
    parsed: {},
    smsParsed: {},
    proxyParsed: {},
    repliesLoaded: false,
    repliesBusy: false,
    proxyBusy: false,
    proxyError: '',
    proxySourceUrl: '',
    proxyStale: false,
    proxyAuthorizationRequired: false,
    proxyTimer: null,
    busy: false,
    pollTimer: null,
    autoReplyTimer: null,
    pollDeadline: 0,
    pendingQuery: null,
    escHandler: null,
    tab: 'overview',
    replyFilter: 'results',
    replySearch: '',
    replyLimit: 30,
    showIdentifiers: false,
    refreshBusy: false,
    snapshotError: '',
    repliesError: '',
    repliesRequest: 0,
    proxyRequest: 0,
    generation: 0,
    lastReadAt: '',
    opener: null
  };

  var PROVIDERS = {
    mobile: {
      name: '中国移动',
      shortName: '移动',
      service: '10086',
      className: 'mobile',
      officialUrl: 'https://www.10086.cn/',
      commands: [
        { id: 'traffic', label: '查询流量', code: 'CXLL' },
        { id: 'balance', label: '查询余额', code: 'YE' }
      ]
    },
    unicom: {
      name: '中国联通',
      shortName: '联通',
      service: '10010',
      className: 'unicom',
      officialUrl: 'https://www.10010.com/',
      commands: [
        { id: 'traffic', label: '查询流量', code: 'CXLL' },
        { id: 'balance', label: '查询余额', code: 'CXYE' }
      ]
    },
    telecom: {
      name: '中国电信',
      shortName: '电信',
      service: '10001',
      className: 'telecom',
      officialUrl: 'https://www.189.cn/',
      commands: [
        { id: 'traffic', label: '查询流量', code: '108' },
        { id: 'balance', label: '查询余额', code: '102' }
      ]
    },
    broadcast: {
      name: '中国广电',
      shortName: '广电',
      service: '10099',
      className: 'broadcast',
      officialUrl: 'https://www.10099.com.cn/',
      commands: []
    },
    unknown: {
      name: '未识别运营商',
      shortName: '未识别',
      service: '',
      className: 'unknown',
      officialUrl: '',
      commands: []
    }
  };

  function clean(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function escapeHTML(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function toast(message, type) {
    if (typeof createToast === 'function') createToast(message, type || 'pink');
    else console.log('[OperatorInfo]', message);
  }

  function getBaseURL() {
    try {
      if (typeof KANO_baseURL !== 'undefined' && KANO_baseURL) return KANO_baseURL;
    } catch (e) {}
    return '/api';
  }

  function getCommonHeaders() {
    try {
      if (typeof common_headers !== 'undefined' && common_headers) return Object.assign({}, common_headers);
    } catch (e) {}
    return {};
  }

  function showNativeLogin() {
    try {
      if (typeof showModal === 'function') {
        showModal('#tokenModal');
        return;
      }
    } catch (e) {}
    var modal = document.getElementById('tokenModal');
    if (modal) modal.style.display = 'flex';
  }

  async function fetchJSON(url, options) {
    var controller = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, API_TIMEOUT) : null;
    try {
      var response = await fetch(url, Object.assign({}, options || {}, controller ? { signal: controller.signal } : {}));
      if (response.status === 401) {
        var authError = new Error('请先登录 UFI-TOOLS');
        authError.code = 'AUTH_REQUIRED';
        throw authError;
      }
      if (!response.ok) throw new Error('请求失败：HTTP ' + response.status);
      var text = await response.text();
      if (!clean(text)) return {};
      try { return JSON.parse(text); }
      catch (e) { throw new Error('接口返回不是有效 JSON'); }
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('设备接口响应超时');
      throw error;
    } finally { if (timer) clearTimeout(timer); }
  }

  function finiteNumber(value) {
    if ((typeof value !== 'number' && typeof value !== 'string') || clean(value) === '') return null;
    var number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function formatGigabytes(value) {
    var number = finiteNumber(value);
    if (number == null) return '';
    return number.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1') + ' GB';
  }

  function proxyErrorMessage(status, payload) {
    var errorCode = clean(payload && payload.error).toLowerCase();
    var message = clean(payload && (payload.message || payload.msg));
    if (status === 401 || status === 403 || errorCode === 'login_expired') {
      return '广电登录态已过期，请在本地服务完成一次授权更新';
    }
    if (errorCode === 'config_error') return '广电首次授权未完成，请在本地服务配置一次小程序登录态';
    if (errorCode === 'upstream_error') return '本地代理无法连接广电官方接口' + (message ? '：' + message : '');
    if (message) return message;
    return status ? '本地查询 API 请求失败：HTTP ' + status : '本地查询 API 返回失败状态';
  }

  function normalizeBroadcastApiResult(payload) {
    var source = payload && payload.data && typeof payload.data === 'object' ? payload.data : payload;
    source = source || {};
    if (payload && payload.ok === false) throw new Error(proxyErrorMessage(0, payload));
    if (source.ok === false) throw new Error(proxyErrorMessage(0, source));

    var total = finiteNumber(source.total_gb);
    var used = finiteNumber(source.used_gb);
    var remaining = finiteNumber(source.balance_gb);
    if (remaining == null) remaining = finiteNumber(source.remaining_gb);
    if (total == null && used == null && remaining == null) {
      throw new Error('本地查询 API 未返回 total_gb、used_gb 或 balance_gb');
    }

    var details = Array.isArray(source.details) ? source.details : [];
    var detailNames = details.map(function (item) { return clean(item && item.name); }).filter(Boolean);
    var detailEnds = details.map(function (item) { return clean(item && item.end); }).filter(Boolean);
    var uniqueEnds = detailEnds.filter(function (value, index, list) { return list.indexOf(value) === index; });

    return {
      balance: '',
      dataRemaining: formatGigabytes(remaining),
      dataTotal: formatGigabytes(total),
      dataUsed: formatGigabytes(used),
      voiceRemaining: '',
      smsRemaining: '',
      planName: detailNames.length === 1 ? detailNames[0] : (detailNames.length > 1 ? detailNames.length + ' 项流量资源' : ''),
      expiry: uniqueEnds.length === 1 ? uniqueEnds[0] : '',
      queryTime: clean(source.updated_at || source.update_time || source.query_time),
      status: '广电官方接口（经本地代理）',
      raw: '',
      replyKind: 'proxy',
      sourceNumber: '10099 API',
      details: details,
      proxyCached: !!source.cached,
      proxyStale: !!source.stale,
      authorizationRequired: !!source.authorization_required,
      automatic: source.automatic !== false,
      lastSuccessAt: clean(source.last_success_at),
      fieldSources: ['dataRemaining', 'dataTotal', 'dataUsed', 'planName', 'expiry'].reduce(function (result, key) {
        result[key] = { kind: 'proxy', date: clean(source.updated_at || source.update_time || source.query_time || source.last_success_at), scope: '接口流量资源', stale: !!source.stale };
        return result;
      }, {})
    };
  }

  function getBroadcastRequestUrls(url) {
    var target = clean(url);
    var proxyUrl = getBaseURL().replace(/\/$/, '') + '/proxy/--' + target;
    var isLoopback = /^https?:\/\/(?:127\.0\.0\.1|localhost)(?::|\/)/i.test(target);
    return isLoopback ? [target, proxyUrl] : [proxyUrl, target];
  }

  async function fetchBroadcastApiRequest(url) {
    var controller = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, API_TIMEOUT) : null;
    try {
      var sameOrigin = new URL(url, window.location.href).origin === new URL(window.location.href).origin;
      var response = await fetch(url, {
        method: 'GET',
        headers: Object.assign({}, sameOrigin ? getCommonHeaders() : {}, { Accept: 'application/json' }),
        cache: 'no-store',
        signal: controller ? controller.signal : undefined
      });
      var text = await response.text();
      var payload = {};
      if (clean(text)) {
        try { payload = JSON.parse(text); }
        catch (e) { throw new Error('本地查询 API 返回的不是有效 JSON'); }
      }
      if (!response.ok) throw new Error(proxyErrorMessage(response.status, payload));
      return normalizeBroadcastApiResult(payload);
    } catch (error) {
      if (error && error.name === 'AbortError') throw new Error('本地查询 API 响应超时');
      if (/Failed to fetch|NetworkError|Load failed/i.test(error && error.message || '')) {
        throw new Error('无法连接本地查询 API，请检查地址、服务状态与 CORS 设置');
      }
      throw error;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  async function fetchBroadcastApi(url) {
    var requestUrls = getBroadcastRequestUrls(url);
    var lastError = null;
    for (var i = 0; i < requestUrls.length; i += 1) {
      try {
        return await fetchBroadcastApiRequest(requestUrls[i]);
      } catch (error) {
        lastError = error;
        if (/首次授权|登录态已过期/.test(error && error.message || '')) throw error;
      }
    }
    throw lastError || new Error('无法连接广电自动查询服务');
  }

  function firstValue(object, keys) {
    for (var i = 0; i < keys.length; i += 1) {
      var value = object && object[keys[i]];
      if (clean(value)) return clean(value);
    }
    return '';
  }

  function readDomValue(labels) {
    var source = document.body ? clean(document.body.innerText || document.body.textContent || '') : '';
    for (var i = 0; i < labels.length; i += 1) {
      var escaped = String(labels[i]).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      var match = source.match(new RegExp(escaped + '\\s*[:：]\\s*([^\\n\\r]{1,100})', 'i'));
      if (match && clean(match[1])) return clean(match[1]);
    }
    return '';
  }

  function detectOperator(data) {
    data = data || {};
    var providerText = clean([
      data.network_provider,
      data.spn_name,
      data.spn_name_data,
      data.operator_name,
      data.operator,
      data.plmn_name
    ].join(' ')).toLowerCase();
    var imsi = clean(data.imsi || data.sim_imsi).replace(/\D/g, '');
    var iccid = clean(data.iccid).replace(/\D/g, '');
    var plmn = clean(data.plmn || data.mccmnc || data.mcc_mnc).replace(/\D/g, '');
    if (/中国广电|广电|cbn|china broadcast/.test(providerText) || /^46015/.test(imsi) || /^46015/.test(plmn) || /^898615/.test(iccid)) return 'broadcast';
    if (/中国联通|联通|cucc|china unicom/.test(providerText) || /^460(01|06|09|10)/.test(imsi) || /^460(01|06|09|10)/.test(plmn) || /^8986(01|06|09|10)/.test(iccid)) return 'unicom';
    if (/中国电信|电信|ctcc|china telecom/.test(providerText) || /^460(03|05|11|12)/.test(imsi) || /^460(03|05|11|12)/.test(plmn) || /^8986(03|05|11|12)/.test(iccid)) return 'telecom';
    if (/中国移动|移动|cmcc|china mobile/.test(providerText) || /^460(00|02|04|07|08|13)/.test(imsi) || /^460(00|02|04|07|08|13)/.test(plmn) || /^8986(00|02|04|07|08|13)/.test(iccid)) return 'mobile';
    return 'unknown';
  }

  function normalizeNetworkType(value) {
    var raw = clean(value);
    if (raw === '20' || /5G|NR/i.test(raw)) return '5G';
    if (raw === '12' || /4G|LTE/i.test(raw)) return '4G';
    if (raw === '11' || /3G|WCDMA|HSPA/i.test(raw)) return '3G';
    return raw || '--';
  }

  function normalizeSimState(value) {
    var raw = clean(value);
    var lower = raw.toLowerCase();
    if (!raw) return '--';
    if (raw === '1' || raw === '正常' || lower === 'ready' || lower === 'normal' || lower === 'sim_ready') return '正常';
    if (raw === '0' || /no.?sim|absent|sim_undetected|sim_removed|sim_not_insert/.test(lower)) return '未检测到 SIM';
    if (lower.indexOf('pin') !== -1) return 'PIN 锁定';
    if (lower.indexOf('puk') !== -1) return 'PUK 锁定';
    return raw;
  }

  function maskIdentifier(value, visibleTail) {
    var raw = clean(value);
    if (!raw) return '--';
    visibleTail = visibleTail || 4;
    if (raw.length <= visibleTail + 3) return raw;
    return raw.slice(0, 3) + '••••' + raw.slice(-visibleTail);
  }

  function getProviderOverride() {
    try {
      var value = localStorage.getItem(PROVIDER_KEY);
      return PROVIDERS[value] ? value : '';
    } catch (e) { return ''; }
  }

  function setProviderOverride(value) {
    try {
      if (!value || value === 'auto') localStorage.removeItem(PROVIDER_KEY);
      else localStorage.setItem(PROVIDER_KEY, value);
    } catch (e) {}
  }

  function getBroadcastApiUrls() {
    var urls = [];
    try {
      var configured = clean(localStorage.getItem(BROADCAST_API_KEY));
      if (configured) urls.push(configured);
    } catch (e) {}
    BROADCAST_DEFAULT_API_URLS.forEach(function (url) {
      if (urls.indexOf(url) === -1) urls.push(url);
    });
    return urls;
  }

  function getBroadcastApiUrl() {
    return getBroadcastApiUrls()[0] || '';
  }

  function normalizeBroadcastApiUrl(value) {
    var raw = clean(value);
    if (!raw) return '';
    var parsed;
    try { parsed = new URL(raw, window.location.href); }
    catch (e) { throw new Error('本地查询 API 地址格式不正确'); }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('本地查询 API 仅支持 HTTP 或 HTTPS');
    }
    if (parsed.username || parsed.password) throw new Error('查询地址不能包含账号或密码');
    return parsed.href;
  }

  function setBroadcastApiUrl(value) {
    var normalized = normalizeBroadcastApiUrl(value);
    try {
      if (normalized) localStorage.setItem(BROADCAST_API_KEY, normalized);
      else localStorage.removeItem(BROADCAST_API_KEY);
    } catch (e) { throw new Error('浏览器未允许保存本地查询 API 地址'); }
    return normalized;
  }

  function normalizeConnection(value) {
    var raw = clean(value).toLowerCase();
    if (!raw || raw === '--') return '--';
    if (/disconnected|disconnect|offline|^0$/.test(raw)) return '未连接';
    if (/connecting|dialing/.test(raw)) return '正在连接';
    if (raw.indexOf('ipv4_ipv6_connected') !== -1) return 'IPv4 / IPv6 已连接';
    if (raw.indexOf('ipv6_connected') !== -1) return 'IPv6 已连接';
    if (raw.indexOf('ipv4_connected') !== -1) return 'IPv4 已连接';
    if (/connected|online|^1$/.test(raw)) return '已连接';
    return '未知状态';
  }

  function normalizeRoaming(value) {
    var raw = clean(value).toLowerCase();
    if (['0', 'false', 'off', 'home', 'no'].indexOf(raw) !== -1) return '本地网络';
    if (['1', 'true', 'on', 'roaming', 'yes'].indexOf(raw) !== -1) return '漫游中';
    return '--';
  }

  function readHeaderValue(id) {
    var el = document.getElementById(id);
    var value = el ? clean(el.textContent) : '';
    return value && value !== '--' ? value : '';
  }

  async function readSnapshot() {
    var commands = [
      'network_provider', 'spn_name', 'spn_name_data', 'operator_name', 'plmn', 'mccmnc',
      'network_type', 'ppp_status', 'signalbar', 'network_signalbar',
      'simcard_status', 'sim_status', 'sim_state', 'simcard_roam', 'roam_status',
      'msisdn', 'mdn', 'sim_phone_number', 'own_number', 'phone_number',
      'imsi', 'sim_imsi', 'iccid', 'imei'
    ].join(',');
    var url = getBaseURL() + '/goform/goform_get_cmd_process?multi_data=1&isTest=false&cmd=' + encodeURIComponent(commands) + '&_=' + Date.now();
    var data = {};
    if (typeof getUFIData === 'function') {
      try { data = Object.assign({}, await getUFIData() || {}); } catch (error) {}
    }
    try {
      var direct = await fetchJSON(url, { headers: getCommonHeaders() });
      if (!direct || typeof direct !== 'object' || direct.error) throw new Error('设备未返回有效的网络状态');
      Object.keys(direct).forEach(function (key) {
        if (direct[key] != null && clean(direct[key]) !== '') data[key] = direct[key];
      });
      state.snapshotError = '';
    } catch (error) {
      if (error.code === 'AUTH_REQUIRED') throw error;
      state.snapshotError = error.message || '网络状态读取失败';
      if (!Object.keys(data).length && !readHeaderValue('kn-pop-operator')) throw error;
    }
    data.network_provider = firstValue(data, ['network_provider', 'spn_name', 'spn_name_data', 'operator_name']) || readHeaderValue('kn-pop-operator');
    data.network_type = firstValue(data, ['network_type']) || readHeaderValue('kn-pop-nettype');
    data.ppp_status = firstValue(data, ['ppp_status']) || readHeaderValue('kn-pop-ppp');
    data.simcard_status = firstValue(data, ['simcard_status', 'sim_status', 'sim_state']) || readHeaderValue('kn-home-sim');
    data.msisdn = firstValue(data, ['msisdn', 'mdn', 'sim_phone_number', 'own_number', 'phone_number']) || readHeaderValue('kn-pop-phone');
    ['imsi', 'iccid', 'imei'].forEach(function (key) {
      data[key] = firstValue(data, key === 'imsi' ? ['imsi', 'sim_imsi'] : [key]) || readHeaderValue('kn-pop-' + key);
    });
    var signal = document.getElementById('kn-header-signal');
    if (firstValue(data, ['signalbar', 'network_signalbar']) === '' && signal) data.signalbar = signal.getAttribute('data-level');
    return data;
  }

  function getSmsTimeForZte() {
    var date = new Date();
    var pad = function (value) { return String(value).padStart(2, '0'); };
    var offsetHours = Math.trunc(-date.getTimezoneOffset() / 60);
    return [
      String(date.getFullYear()).slice(-2), pad(date.getMonth() + 1), pad(date.getDate()),
      pad(date.getHours()), pad(date.getMinutes()), pad(date.getSeconds()),
      (offsetHours >= 0 ? '+' : '') + offsetHours
    ].join(';');
  }

  function encodeSmsUnicodeHex(text) {
    var result = '';
    var value = String(text || '');
    for (var i = 0; i < value.length; i += 1) result += value.charCodeAt(i).toString(16).padStart(4, '0');
    return result;
  }

  function decodeSmsContent(value) {
    var raw = String(value == null ? '' : value).trim();
    if (!raw) return '';
    if (/^[0-9a-f]+$/i.test(raw) && raw.length >= 4 && raw.length % 4 === 0) {
      try {
        var decoded = '';
        for (var i = 0; i < raw.length; i += 4) decoded += String.fromCharCode(parseInt(raw.slice(i, i + 4), 16));
        if (isReadableSmsContent(decoded)) return decoded;
      } catch (e) {}
    }
    var base64 = raw.replace(/\s+/g, '');
    if (base64.length >= 4 && base64.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
      try {
        if (typeof decodeBase64 === 'function') {
          var helperDecoded = decodeBase64(base64);
          if (isReadableSmsContent(helperDecoded)) return helperDecoded;
        }
      } catch (e) {}
      try {
        var binary = atob(base64);
        var percent = '';
        for (var j = 0; j < binary.length; j += 1) {
          percent += '%' + ('00' + binary.charCodeAt(j).toString(16)).slice(-2);
        }
        var utf8Decoded = decodeURIComponent(percent);
        if (isReadableSmsContent(utf8Decoded)) return utf8Decoded;
      } catch (e) {}
      try {
        var latinDecoded = atob(base64);
        if (isReadableSmsContent(latinDecoded)) return latinDecoded;
      } catch (e) {}
    }
    return raw;
  }

  function isReadableSmsContent(value) {
    var text = String(value == null ? '' : value);
    if (!clean(text) || /\uFFFD/.test(text)) return false;
    var controls = text.match(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g);
    if (controls && controls.length > Math.max(1, text.length * 0.02)) return false;
    return /[\u3400-\u9FFF\uF900-\uFAFFA-Za-z0-9]/.test(text);
  }

  function firstMatch(text, patterns) {
    for (var i = 0; i < patterns.length; i += 1) {
      var match = String(text || '').match(patterns[i]);
      if (match) return match;
    }
    return null;
  }

  function formatDataValue(match) {
    if (!match) return '';
    var parts = String(match[1] || '').match(/\d+(?:\.\d+)?\s*(?:GB|MB|KB|TB|G|M|K|T)/gi) || [];
    return parts.map(function (part) {
      return part.replace(/\s+/g, '').replace(/[A-Za-z]+$/, function (unit) { return unit.toUpperCase(); });
    }).join(' ');
  }

  function hasParsedCarrierData(parsed) {
    var keys = ['balance', 'dataRemaining', 'dataTotal', 'dataUsed', 'voiceRemaining', 'smsRemaining', 'planName', 'expiry'];
    return keys.some(function (key) { return clean(parsed && parsed[key]); });
  }

  function syncEffectiveParsed() {
    if (state.provider === 'broadcast' && hasParsedCarrierData(state.proxyParsed)) {
      var proxy = state.proxyParsed;
      var sms = state.smsParsed || {};
      var combined = Object.assign({}, sms, proxy);
      combined.fieldSources = Object.assign({}, sms.fieldSources || {}, proxy.fieldSources || {});
      ['balance', 'voiceRemaining', 'smsRemaining', 'planName', 'expiry'].forEach(function (key) {
        if (sms[key]) {
          combined[key] = sms[key];
          combined.fieldSources[key] = sms.fieldSources && sms.fieldSources[key];
        }
      });
      combined.planEffectiveDate = sms.planEffectiveDate;
      combined.dataScope = '接口流量资源';
      state.parsed = combined;
    } else {
      state.parsed = state.smsParsed || {};
    }
  }

  function classifyOfficialReply(text) {
    var raw = clean(text);
    if (!raw) return null;
    if (/验证码|动态密码|校验码|一次性密码/.test(raw)) return { kind: 'verification', status: '安全验证短信' };
    if (/(?:发送的)?指令.{0,12}(?:有误|不存在|错误|无效)|无法识别.{0,8}指令|未识别.{0,8}指令/.test(raw)) {
      return { kind: 'rejected', status: '运营商未接受该指令' };
    }
    if (/回复下列序号.{0,80}(?:查询服务|办理服务)|(?:查询服务|办理服务).{0,80}回复.{0,8}序号/.test(raw)) {
      return { kind: 'menu', status: '运营商服务菜单' };
    }
    return null;
  }

  function parseCarrierSms(text) {
    var raw = String(text || '').replace(/\r/g, '').trim();
    var dataAmount = '(?:\\d+(?:\\.\\d+)?\\s*(?:GB|MB|KB|TB|G|M|K|T)\\s*){1,2}';
    var balance = firstMatch(raw, [
      /(?:账户余额|当前余额|话费余额|实时余额|可用余额|余额)\s*(?:为|是|约|：|:)?\s*[￥¥]?\s*(-?\d+(?:\.\d+)?)\s*元/i
    ]);
    var dataRemaining = firstMatch(raw, [
      new RegExp('(?:剩余流量|流量剩余|国内流量剩余|通用流量剩余|可用流量|流量余量|剩余|可用|余量)[^\\d]{0,24}(' + dataAmount + ')', 'i'),
      new RegExp('(?:流量)[^。；;，,\\n]{0,24}?(?:剩余|可用|余量)[^\\d]{0,24}(' + dataAmount + ')', 'i')
    ]);
    var dataTotal = firstMatch(raw, [
      new RegExp('(?:总流量|套餐流量|流量总量|共|总计)[^\\d]{0,24}(' + dataAmount + ')', 'i')
    ]);
    var dataUsed = firstMatch(raw, [
      new RegExp('(?:现已使用|已用流量|流量已用|已使用流量|已用|已使用)[^\\d]{0,24}(' + dataAmount + ')', 'i')
    ]);
    var dataExhausted = /(?:流量|流量包|加油包)[^。；;\n]{0,80}(?:已经用尽|已用尽|已经耗尽|已耗尽|已经使用完|已使用完)/.test(raw);
    var voice = firstMatch(raw, [
      /(?:语音剩余|剩余语音|通话剩余|剩余通话|语音余量|通话时长剩余)[^\d]{0,24}(\d+)\s*(?:分钟|分|min|mins)?/i,
      /(?:语音|通话|分钟)[^。；;，,\n]{0,24}?(?:剩余|可用|余量)[^\d]{0,24}(\d+)\s*(?:分钟|分|min|mins)?/i
    ]);
    var sms = firstMatch(raw, [
      /(?:短信剩余|剩余短信|短信余量)[^\d]{0,24}(\d+)\s*(?:条)?/i,
      /(?:短信)[^。；;，,\n]{0,24}?(?:剩余|可用|余量)[^\d]{0,24}(\d+)\s*(?:条)?/i
    ]);
    var plan = firstMatch(raw, [
      /(?:当前套餐|套餐名称|已订购套餐)\s*(?:为|是|：|:)?\s*([^，。；;\n]{2,36})/i,
      /成功(?:办理|订购)\s*([^，。；;\n（(]{2,36}套餐)/i
    ]);
    var expiry = firstMatch(raw, [
      /(?:有效期|到期(?:时间|日期)?|失效(?:时间|日期)?)\s*(?:至|到|为|：|:)?\s*((?:20)?\d{2}[年\/.\-]\d{1,2}[月\/.\-]\d{1,2}日?)/i
    ]);
    var queryTime = firstMatch(raw, [
      /截至\s*((?:20)?\d{2}年\d{1,2}月\d{1,2}日(?:\d{1,2}时\d{1,2}分(?:\d{1,2}秒)?)?)/i
    ]);

    return {
      balance: balance ? balance[1] + ' 元' : '',
      dataRemaining: dataExhausted ? '0 MB' : formatDataValue(dataRemaining),
      dataTotal: formatDataValue(dataTotal),
      dataUsed: formatDataValue(dataUsed),
      voiceRemaining: voice ? voice[1] + ' 分钟' : '',
      smsRemaining: sms ? sms[1] + ' 条' : '',
      planName: plan ? clean(plan[1]) : '',
      expiry: expiry ? clean(expiry[1]) : '',
      queryTime: queryTime ? clean(queryTime[1]) : '',
      status: dataExhausted ? '流量包已用尽' : '',
      dataScope: /加油包/.test(raw) ? '加油包' : (/定向流量/.test(raw) && !/通用/.test(raw) ? '定向流量' : (/通用流量/.test(raw) ? '通用流量' : '短信所述流量')),
      planEffectiveDate: clean((raw.match(/生效时间\s*[:：]?\s*(20\d{2}年\d{1,2}月\d{1,2}日)/) || [])[1]),
      raw: raw
    };
  }

  function parseReplies(replies) {
    var incoming = (replies || []).filter(function (reply) { return reply.direction === 'in'; }).sort(function (a, b) {
      var aDate = parseResultDate(a.date), bDate = parseResultDate(b.date);
      return (bDate ? bDate.getTime() : 0) - (aDate ? aDate.getTime() : 0) || String(b.id).localeCompare(String(a.id), undefined, { numeric: true });
    });
    var classifiedFallback = null;
    var result = { fieldSources: {} };
    var dataChosen = false;
    for (var i = 0; i < incoming.length; i += 1) {
      var parsed = parseCarrierSms(incoming[i].content);
      var classification = classifyOfficialReply(incoming[i].content);
      if (classification && classification.kind === 'verification') continue;
      if (hasParsedCarrierData(parsed)) {
        var reply = incoming[i];
        var provenance = { kind: 'sms', date: reply.date || '', number: reply.number || '', id: reply.id || '', queryTime: parsed.queryTime || '' };
        if (!result.sourceDate) {
          result.sourceDate = reply.date || '';
          result.sourceNumber = reply.number || '';
          result.sourceId = reply.id || '';
          result.raw = parsed.raw;
          result.queryTime = parsed.queryTime;
        }
        ['balance', 'voiceRemaining', 'smsRemaining', 'planName', 'expiry'].forEach(function (key) {
          if (!result[key] && parsed[key]) {
            result[key] = parsed[key];
            result.fieldSources[key] = Object.assign({}, provenance);
            if (key === 'planName') result.planEffectiveDate = parsed.planEffectiveDate;
          }
        });
        if (!dataChosen && (parsed.dataRemaining || parsed.dataUsed)) {
          ['dataRemaining', 'dataTotal', 'dataUsed'].forEach(function (key) {
            if (parsed[key]) { result[key] = parsed[key]; result.fieldSources[key] = Object.assign({ scope: parsed.dataScope }, provenance); }
          });
          result.dataScope = parsed.dataScope;
          result.status = parsed.status;
          dataChosen = true;
        }
      }
      if (!classifiedFallback && classification) {
        parsed.sourceDate = incoming[i].date || '';
        parsed.sourceNumber = incoming[i].number || '';
        parsed.sourceId = incoming[i].id || '';
        parsed.replyKind = classification.kind;
        parsed.status = classification.status;
        classifiedFallback = parsed;
      }
    }
    return hasParsedCarrierData(result) ? result : (classifiedFallback || {});
  }

  function parseResultDate(value) {
    var raw = clean(value);
    if (/T.*(?:Z|[+-]\d{2}:?\d{2})$/.test(raw)) {
      var iso = new Date(raw);
      return Number.isNaN(iso.getTime()) ? null : iso;
    }
    var parts = raw.match(/^(20\d{2})[年\/.\-](\d{1,2})[月\/.\-](\d{1,2})(?:日)?(?:[ T]*(\d{1,2})[时:](\d{1,2})(?:[分:]?(\d{1,2}))?)?/);
    if (!parts) return null;
    var date = new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]), Number(parts[4] || 0), Number(parts[5] || 0), Number(parts[6] || 0));
    if (date.getFullYear() !== Number(parts[1]) || date.getMonth() !== Number(parts[2]) - 1 || date.getDate() !== Number(parts[3])) return null;
    return date;
  }

  function getResultFreshness(parsed, key, now) {
    var source = parsed && parsed.fieldSources && parsed.fieldSources[key] || {};
    var dateText = source.queryTime || source.date || parsed && (parsed.queryTime || parsed.sourceDate || parsed.lastSuccessAt) || '';
    var date = parseResultDate(dateText);
    var age = date ? Math.max(0, (now == null ? Date.now() : now) - date.getTime()) : null;
    var stale = !!(source.stale || source.kind === 'proxy' && parsed && parsed.proxyStale || age != null && age > 24 * 60 * 60 * 1000);
    return { date: dateText, stale: stale, ageDays: age == null ? null : Math.floor(age / 86400000), source: source.kind === 'proxy' ? '官方接口' : '官方短信', scope: source.scope || '' };
  }

  function classifyReplyCategory(reply) {
    if (reply.direction === 'out') return 'outgoing';
    var kind = classifyOfficialReply(reply.content);
    if (kind) return kind.kind;
    var parsed = parseCarrierSms(reply.content);
    if (parsed.dataRemaining || parsed.dataUsed) return 'traffic';
    if (parsed.balance) return 'balance';
    if (parsed.planName || /套餐|办理|变更|续约|资费/.test(reply.content)) return 'plan';
    return 'notice';
  }

  function formatSmsDate(value) {
    var raw = clean(value);
    var zte = raw.match(/^(\d{2}|20\d{2})[;,](\d{1,2})[;,](\d{1,2})[;,](\d{1,2})[;,](\d{1,2})[;,](\d{1,2})(?:[;,][^;,]+)?$/);
    if (zte) return (zte[1].length === 2 ? '20' : '') + zte[1] + '-' + zte[2].padStart(2, '0') + '-' + zte[3].padStart(2, '0') + ' ' + zte[4].padStart(2, '0') + ':' + zte[5].padStart(2, '0');
    var parsed = parseResultDate(raw);
    var date = parsed || new Date(raw);
    if ((parsed || /[T/:\-]/.test(raw)) && !Number.isNaN(date.getTime())) {
      var pad = function (part) { return String(part).padStart(2, '0'); };
      return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes());
    }
    return raw;
  }

  async function fetchSmsInfo(page, pageSize) {
    if (typeof getSmsInfo === 'function') return getSmsInfo(page || 0, pageSize || 200);
    var params = new URLSearchParams();
    params.append('multi_data', '1');
    params.append('isTest', 'false');
    params.append('cmd', 'sms_data_total');
    params.append('page', String(page || 0));
    params.append('data_per_page', String(pageSize || 200));
    params.append('mem_store', '1');
    params.append('tags', '100');
    params.append('order_by', 'order by id desc');
    params.append('_', Date.now().toString());
    return fetchJSON(getBaseURL() + '/goform/goform_get_cmd_process?' + params.toString(), { headers: getCommonHeaders() });
  }

  function normalizeReplies(result, serviceNumber) {
    var messages = result && Array.isArray(result.messages) ? result.messages : [];
    return messages.map(function (item) {
      return {
        id: String(item.id == null ? '' : item.id),
        number: clean(item.number || item.phone || item.sender || ''),
        content: decodeSmsContent(item.content || item.message || item.MessageBody || ''),
        date: formatSmsDate(item.date || item.time || item.timestamp || ''),
        tag: clean(item.tag || ''),
        direction: clean(item.tag || '') === '2' || clean(item.tag || '') === '3' ? 'out' : 'in'
      };
    }).filter(function (item) {
      var number = item.number.replace(/\D/g, '');
      return !serviceNumber || [serviceNumber, '86' + serviceNumber, '0086' + serviceNumber].indexOf(number) !== -1;
    }).sort(function (a, b) {
      var aDate = parseResultDate(a.date), bDate = parseResultDate(b.date);
      return (bDate ? bDate.getTime() : 0) - (aDate ? aDate.getTime() : 0) || String(b.id).localeCompare(String(a.id), undefined, { numeric: true });
    });
  }

  async function readReplies(manual) {
    if (state.repliesBusy) return state.replies;
    var providerKey = state.provider;
    var provider = PROVIDERS[providerKey] || PROVIDERS.unknown;
    if (!provider.service) {
      state.repliesLoaded = true;
      renderParsed();
      renderReplies();
      return [];
    }
    var request = ++state.repliesRequest;
    var generation = state.generation;
    state.repliesBusy = true;
    renderQueryActions();
    try {
      var result = await fetchSmsInfo(0, 500);
      if (!result || !Array.isArray(result.messages)) throw new Error('设备未返回有效的短信列表');
      if (request !== state.repliesRequest || generation !== state.generation || state.provider !== providerKey) return [];
      state.replies = normalizeReplies(result, provider.service);
      state.smsParsed = parseReplies(state.replies);
      state.repliesError = '';
      state.lastReadAt = formatSmsDate(new Date().toISOString());
      syncEffectiveParsed();
      state.repliesLoaded = true;
      renderParsed();
      renderReplies();
      updateHeader();
      setStatus(state.pendingQuery && state.pollTimer ? '正在等待 ' + provider.service + ' 新回执' : '已同步 ' + provider.service + ' 官方回执', state.pendingQuery && state.pollTimer ? 'loading' : 'success');
      if (manual) toast('官方回执已刷新', 'green');
      return state.replies;
    } catch (error) {
      if (request !== state.repliesRequest || generation !== state.generation) return [];
      state.repliesError = error.message || '短信读取失败';
      if (error.code === 'AUTH_REQUIRED') showNativeLogin();
      setStatus(state.repliesError + (state.replies.length ? '，保留上次结果' : ''), 'error');
      if (manual) toast(state.repliesError, 'red');
      return [];
    } finally {
      if (request === state.repliesRequest) {
        state.repliesBusy = false;
        renderParsed();
        renderQueryActions();
        renderConnectionSettings();
      }
    }
  }

  function normalizeSendResponse(result) {
    var raw = result || {};
    var value = clean(raw.result != null ? raw.result : (raw.Result != null ? raw.Result : (raw.status != null ? raw.status : raw.Status))).toLowerCase();
    if (['success', 'ok', 'true', '0', '200', 'processing', 'pending', 'sending', 'accepted'].indexOf(value) !== -1) return true;
    var rawText = '';
    try { rawText = JSON.stringify(raw).toLowerCase(); } catch (e) {}
    return !value && !raw.error && !raw.message && (rawText.indexOf('"success"') !== -1 || rawText.indexOf('"accepted"') !== -1);
  }

  async function sendSms(number, content) {
    if (typeof sendSms_UFI === 'function') return sendSms_UFI({ number: number, content: content });
    if (typeof login !== 'function' || typeof postData !== 'function' || typeof logout !== 'function') {
      throw new Error('当前页面未提供短信发送能力');
    }
    var cookie = await login();
    if (!cookie) throw new Error('登录失败，无法发送短信');
    var encoded = typeof gsmEncode === 'function' ? gsmEncode(content) : encodeSmsUnicodeHex(content);
    var payload = {
      goformId: 'SEND_SMS',
      notCallback: 'true',
      Number: number,
      sms_time: getSmsTimeForZte(),
      MessageBody: encoded,
      ID: '-1',
      encode_type: 'UNICODE',
      simSlotId: '1'
    };
    try {
      var response = await postData(cookie, payload);
      return response && typeof response.json === 'function' ? await response.json() : response;
    } finally {
      try { await logout(cookie); } catch (e) {}
    }
  }

  function stopReplyPolling() {
    if (state.pollTimer) clearInterval(state.pollTimer);
    state.pollTimer = null;
    state.pollDeadline = 0;
  }

  function stopAutoReplyPolling() {
    if (state.autoReplyTimer) clearInterval(state.autoReplyTimer);
    state.autoReplyTimer = null;
  }

  function startAutoReplyPolling() {
    stopAutoReplyPolling();
    state.autoReplyTimer = setInterval(function () {
      if (!state.repliesBusy) readReplies(false).catch(function () {});
    }, 60 * 1000);
  }

  function startReplyPolling(existingIds) {
    stopReplyPolling();
    var generation = state.generation;
    var providerKey = state.provider;
    state.pollDeadline = Date.now() + POLL_TIMEOUT;
    state.pollTimer = setInterval(async function () {
      if (generation !== state.generation || state.provider !== providerKey || state.repliesBusy) return;
      if (Date.now() >= state.pollDeadline) {
        stopReplyPolling();
        state.pendingQuery = null;
        renderQueryActions();
        setStatus('暂未收到新回复，可稍后手动刷新', 'idle');
        return;
      }
      var replies = await readReplies(false);
      if (generation !== state.generation || state.provider !== providerKey) return;
      var fresh = replies.find(function (item) { return item.direction === 'in' && existingIds.indexOf(item.id) === -1; });
      if (fresh) {
        stopReplyPolling();
        state.pendingQuery = null;
        renderQueryActions();
        var classification = classifyOfficialReply(fresh.content);
        if (classification && classification.kind === 'rejected') {
          setStatus('运营商未接受该指令，请改用官方营业厅', 'error');
          toast('运营商未接受该查询指令', 'red');
        } else {
          var text = classification && classification.kind === 'menu' ? '已收到运营商服务菜单' : '已收到新的运营商回执';
          setStatus(text, 'success');
          toast(text, 'green');
        }
      }
    }, POLL_INTERVAL);
  }

  async function sendQuery(commandId) {
    if (state.busy || state.repliesBusy || state.pollTimer) return;
    var provider = PROVIDERS[state.provider] || PROVIDERS.unknown;
    var command = provider.commands.find(function (item) { return item.id === commandId; });
    if (!provider.service || !command) {
      toast('当前运营商暂无可用查询指令', 'red');
      return;
    }
    if (!window.confirm('确认向 ' + provider.service + ' 发送“' + command.code + '”查询' + command.label.replace('查询', '') + '吗？')) return;

    state.busy = true;
    renderQueryActions();
    setStatus('正在向 ' + provider.service + ' 提交查询', 'loading');
    var existingIds = state.replies.map(function (item) { return item.id; });
    try {
      await readReplies(false);
      if (state.repliesError) throw new Error('无法读取发送前回执，请稍后重试');
      existingIds = state.replies.map(function (item) { return item.id; });
      var result = await sendSms(provider.service, command.code);
      if (!normalizeSendResponse(result)) throw new Error('设备未确认短信提交成功');
      state.pendingQuery = { provider: state.provider, command: command, sentAt: Date.now() };
      setStatus('查询已提交，正在等待回复', 'loading');
      toast('已向 ' + provider.service + ' 发送查询', 'green');
      startReplyPolling(existingIds);
    } catch (error) {
      if (/login|登录|cookie/i.test(error.message || '')) showNativeLogin();
      setStatus(error.message || '查询发送失败', 'error');
      toast(error.message || '查询发送失败', 'red');
    } finally {
      state.busy = false;
      renderQueryActions();
    }
  }

  async function queryBroadcastApi(manual) {
    if (state.provider !== 'broadcast' || state.proxyBusy) return state.proxyParsed;
    var urls = getBroadcastApiUrls();
    if (!urls.length) {
      state.proxyError = '';
      state.proxyAuthorizationRequired = false;
      syncEffectiveParsed();
      renderQueryActions();
      renderParsed();
      renderConnectionSettings();
      return {};
    }
    var request = ++state.proxyRequest;
    var generation = state.generation;
    state.proxyBusy = true;
    state.proxyError = '';
    renderQueryActions();
    renderConnectionSettings();
    try {
      var result = null;
      var sourceUrl = '';
      var lastError = null;
      for (var i = 0; i < urls.length; i += 1) {
        var targetUrl = urls[i];
        if (manual) {
          var target = new URL(targetUrl, window.location.href);
          target.searchParams.set('refresh', '1');
          target.hash = '';
          targetUrl = target.href;
        }
        try { result = await fetchBroadcastApi(targetUrl); sourceUrl = urls[i]; lastError = null; break; }
        catch (error) { lastError = error; if (/首次授权|登录态已过期/.test(error.message || '')) break; }
      }
      if (request !== state.proxyRequest || generation !== state.generation || state.provider !== 'broadcast') return {};
      if (lastError) throw lastError;
      state.proxyParsed = result || {};
      state.proxySourceUrl = sourceUrl;
      state.proxyStale = !!state.proxyParsed.proxyStale;
      state.proxyAuthorizationRequired = !!state.proxyParsed.authorizationRequired;
      syncEffectiveParsed();
      renderParsed();
      setStatus(state.proxyStale ? '接口返回历史缓存，授权需更新' : '官方接口结果已读取', state.proxyStale ? 'idle' : 'success');
      if (manual) toast(state.proxyStale ? '已读取缓存结果' : '官方接口已刷新', state.proxyStale ? 'pink' : 'green');
      return state.proxyParsed;
    } catch (error) {
      if (request !== state.proxyRequest || generation !== state.generation) return {};
      state.proxyError = error.message || '查询服务连接失败';
      state.proxyAuthorizationRequired = /首次授权|登录态已过期/.test(state.proxyError);
      if (hasParsedCarrierData(state.proxyParsed)) state.proxyParsed.proxyStale = true;
      syncEffectiveParsed();
      renderParsed();
      setStatus(state.proxyError + (hasParsedCarrierData(state.parsed) ? '，保留已有记录' : ''), 'error');
      if (manual) toast(state.proxyError, 'red');
      return {};
    } finally {
      if (request === state.proxyRequest) {
        state.proxyBusy = false;
        renderQueryActions();
        renderConnectionSettings();
        renderParsed();
        startBroadcastPolling();
      }
    }
  }

  function stopBroadcastPolling() {
    if (state.proxyTimer) clearInterval(state.proxyTimer);
    state.proxyTimer = null;
  }

  function startBroadcastPolling() {
    stopBroadcastPolling();
    if (state.provider !== 'broadcast' || !getBroadcastApiUrls().length) return;
    state.proxyTimer = setInterval(function () {
      if (state.provider === 'broadcast') queryBroadcastApi(false).catch(function () {});
    }, BROADCAST_POLL_INTERVAL);
  }

  function openBroadcastProxySettings() {
    var url = state.proxySourceUrl || getBroadcastApiUrl();
    if (!url) { setStatus('尚未配置查询服务', 'idle'); return; }
    try {
      var parsed = new URL(url, window.location.href);
      window.open(parsed.origin + '/', '_blank', 'noopener,noreferrer');
    } catch (error) {
      toast('无法打开广电授权设置', 'red');
    }
  }

  async function dialProviderService() {
    var provider = PROVIDERS[state.provider] || PROVIDERS.unknown;
    if (!provider.service) {
      toast('请先选择运营商', 'red');
      return;
    }
    if (!window.KanoPhoneSMS || typeof window.KanoPhoneSMS.dial !== 'function') {
      setStatus('未检测到“电话与短信”插件，无法从路由器拨号', 'error');
      toast('请先安装并启用“电话与短信”插件', 'red');
      return;
    }
    if (!window.confirm('确认使用路由器拨打 ' + provider.service + ' 吗？')) return;
    try {
      await window.KanoPhoneSMS.dial(provider.service);
      setStatus('正在拨打 ' + provider.service, 'loading');
    } catch (error) {
      setStatus(error.message || '拨号失败', 'error');
      toast(error.message || '拨号失败', 'red');
    }
  }

  function setStatus(text, type) {
    var element = document.getElementById('kano-operator-status');
    if (!element) return;
    var classes = 'kano-operator-status ' + (type || 'idle');
    if (element.className !== classes) element.className = classes;
    if (element.textContent !== text) element.textContent = text;
  }

  function openOfficialHall() {
    var provider = PROVIDERS[state.provider] || PROVIDERS.unknown;
    if (!provider.officialUrl) {
      toast('请先选择运营商', 'red');
      return;
    }
    try {
      window.open(provider.officialUrl, '_blank', 'noopener,noreferrer');
      setStatus('已在新标签打开' + provider.name + (state.provider === 'broadcast' ? '官网' : '官方营业厅'), 'success');
    } catch (error) {
      setStatus((state.provider === 'broadcast' ? '官网' : '官方营业厅') + '打开失败，请检查浏览器弹窗设置', 'error');
    }
  }

  // Lucide v0.468.0 (ISC), Copyright (c) 2020, Lucide Contributors.
  // Copyright (c) 2013-2020 Cole Bemis (Feather).
  // Permission to use, copy, modify, and/or distribute this software for any
  // purpose with or without fee is hereby granted, provided that the above
  // copyright notice and this permission notice appear in all copies.
  // THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
  // WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
  // MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
  // ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
  // WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
  // ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
  // OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
  function operatorIcon(name) {
    var paths = {"phone":"<path d=\"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z\" />","phone-incoming":"<polyline points=\"16 2 16 8 22 8\" /><line x1=\"22\" x2=\"16\" y1=\"2\" y2=\"8\" /><path d=\"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z\" />","phone-off":"<path d=\"M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91\" /><line x1=\"22\" x2=\"2\" y1=\"2\" y2=\"22\" />","message-square":"<path d=\"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z\" />","x":"<path d=\"M18 6 6 18\" /><path d=\"m6 6 12 12\" />","delete":"<path d=\"M10 5a2 2 0 0 0-1.344.519l-6.328 5.74a1 1 0 0 0 0 1.481l6.328 5.741A2 2 0 0 0 10 19h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z\" /><path d=\"m12 9 6 6\" /><path d=\"m18 9-6 6\" />","plus":"<path d=\"M5 12h14\" /><path d=\"M12 5v14\" />","trash-2":"<path d=\"M3 6h18\" /><path d=\"M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6\" /><path d=\"M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2\" /><line x1=\"10\" x2=\"10\" y1=\"11\" y2=\"17\" /><line x1=\"14\" x2=\"14\" y1=\"11\" y2=\"17\" />","refresh-cw":"<path d=\"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8\" /><path d=\"M21 3v5h-5\" /><path d=\"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16\" /><path d=\"M8 16H3v5\" />","clipboard-paste":"<path d=\"M15 2H9a1 1 0 0 0-1 1v2c0 .6.4 1 1 1h6c.6 0 1-.4 1-1V3c0-.6-.4-1-1-1Z\" /><path d=\"M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2M16 4h2a2 2 0 0 1 2 2v2M11 14h10\" /><path d=\"m17 10 4 4-4 4\" />","rotate-ccw":"<path d=\"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8\" /><path d=\"M3 3v5h5\" />","send":"<path d=\"M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z\" /><path d=\"m21.854 2.147-10.94 10.939\" />","arrow-left":"<path d=\"m12 19-7-7 7-7\" /><path d=\"M19 12H5\" />","reply":"<polyline points=\"9 17 4 12 9 7\" /><path d=\"M20 18v-2a4 4 0 0 0-4-4H4\" />","copy":"<rect width=\"14\" height=\"14\" x=\"8\" y=\"8\" rx=\"2\" ry=\"2\" /><path d=\"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2\" />","square-pen":"<path d=\"M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7\" /><path d=\"M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z\" />","external-link":"<path d=\"M15 3h6v6\" /><path d=\"M10 14 21 3\" /><path d=\"M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6\" />"};
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (paths[name] || paths['message-square']) + '</svg>';
  }

  function operatorButton(icon, label, action, text) {
    return '<button type="button" class="' + (text ? 'ko-button' : 'kano-operator-icon-btn') + '" title="' + escapeHTML(label) + '" aria-label="' + escapeHTML(label) + '" data-operator-action="' + action + '">' + operatorIcon(icon) + (text ? '<span>' + escapeHTML(text) + '</span>' : '') + '</button>';
  }

  function stableMarkup(el, signature, render) {
    if (!el || el._koSignature === signature) return false;
    el.innerHTML = render();
    el._koSignature = signature;
    return true;
  }

  function setOperatorText(id, text) {
    var el = document.getElementById(id);
    if (el && el.textContent !== text) el.textContent = text;
  }

  function sourceDescription(parsed, key) {
    var info = getResultFreshness(parsed, key);
    var date = formatSmsDate(info.date);
    return [info.source, info.scope, date || '时间未提供', info.stale ? '历史参考' : ''].filter(Boolean).join(' · ');
  }

  function renderIdentity() {
    var box = document.getElementById('kano-operator-identity');
    var data = state.snapshot || {};
    var signal = firstValue(data, ['signalbar', 'network_signalbar']);
    var level = signal !== '' && Number.isFinite(Number(signal)) ? Math.max(0, Math.min(5, Number(signal))) + ' / 5' : '--';
    var rows = [
      ['SIM 状态', normalizeSimState(data.simcard_status) === '--' ? '未提供' : normalizeSimState(data.simcard_status)],
      ['网络制式', normalizeNetworkType(data.network_type)],
      ['连接', normalizeConnection(data.ppp_status)],
      ['信号强度', level],
      ['漫游', normalizeRoaming(firstValue(data, ['simcard_roam', 'roam_status'])) === '--' ? '未提供' : normalizeRoaming(firstValue(data, ['simcard_roam', 'roam_status']))]
    ];
    stableMarkup(box, JSON.stringify(rows), function () {
      return rows.map(function (row) { return '<div class="ko-kv"><span>' + row[0] + '</span><b>' + escapeHTML(row[1]) + '</b></div>'; }).join('');
    });
    var identifiers = document.getElementById('kano-operator-identifiers');
    var ids = [['手机号', data.msisdn], ['IMSI', data.imsi], ['ICCID', data.iccid], ['IMEI', data.imei]].map(function (row) {
      return [row[0], state.showIdentifiers ? clean(row[1]) || '--' : maskIdentifier(row[1], 4)];
    });
    stableMarkup(identifiers, JSON.stringify(ids), function () {
      return ids.map(function (row) { return '<div class="ko-kv"><span>' + row[0] + '</span><b>' + escapeHTML(row[1]) + '</b></div>'; }).join('');
    });
    setOperatorText('kano-operator-phone', maskIdentifier(data.msisdn, 4));
  }

  function renderProviderSelector() {
    var select = document.getElementById('kano-operator-provider');
    if (!select) return;
    var value = getProviderOverride() || 'auto';
    if (select.value !== value) select.value = value;
    select.disabled = state.busy;
  }

  function renderQueryActions() {
    var box = document.getElementById('kano-operator-query-actions');
    var provider = PROVIDERS[state.provider] || PROVIDERS.unknown;
    var signature = JSON.stringify([state.provider, state.busy, state.refreshBusy, state.proxyBusy, state.repliesBusy, !!state.pollTimer]);
    stableMarkup(box, signature, function () {
      var actions = provider.commands.map(function (command) {
        return '<button type="button" class="ko-button primary" data-operator-query="' + command.id + '" title="' + provider.service + ' / ' + command.code + '"' + (state.busy || state.repliesBusy || state.pollTimer ? ' disabled' : '') + '>' + operatorIcon('send') + '<span>' + escapeHTML(command.label) + '</span></button>';
      });
      if (state.pollTimer) actions.push(operatorButton('x', '停止等待查询回执', 'stop-waiting', '停止等待'));
      if (state.provider === 'broadcast') actions.push(operatorButton('refresh-cw', '刷新查询结果', 'refresh', '刷新查询'));
      if (provider.service) {
        actions.push(operatorButton('message-square', '打开电话与短信', 'sms', '短信'));
        actions.push(operatorButton('phone', '转到客服拨号盘', 'phone', '客服 ' + provider.service));
      }
      if (provider.officialUrl) actions.push(operatorButton('external-link', '打开运营商官网', 'official', '官网'));
      return actions.join('') || '<span class="ko-muted">选择运营商后可查询</span>';
    });
    Array.prototype.slice.call(document.querySelectorAll('#' + MODAL_ID + ' [data-operator-action="refresh"]')).forEach(function (button) {
      button.disabled = state.refreshBusy || state.repliesBusy || state.proxyBusy;
    });
  }

  function renderParsed() {
    var parsed = state.parsed || {};
    var box = document.getElementById('kano-operator-parsed');
    var items = [
      { key: 'balance', label: '话费余额' },
      { key: 'dataRemaining', label: parsed.dataScope === '加油包' ? '加油包余量' : '流量余量' },
      { key: 'voiceRemaining', label: '语音余量' },
      { key: 'smsRemaining', label: '短信余量' }
    ];
    var available = items.filter(function (item) { return !!clean(parsed[item.key]); });
    var historical = available.filter(function (item) { return getResultFreshness(parsed, item.key).stale; });
    var source = document.getElementById('kano-operator-result-source');
    var sourceText = !available.length ? (state.repliesBusy ? '正在读取官方记录' : '暂无可用的余量记录') :
      historical.length === available.length ? '仅有历史记录，非实时余量' :
      historical.length ? '部分指标来自历史记录' : '已读取官方记录';
    setOperatorText('kano-operator-result-source', sourceText);
    if (source) source.dataset.tone = historical.length ? 'warn' : '';
    stableMarkup(box, JSON.stringify([parsed, sourceText]), function () {
      return items.map(function (item) {
        var value = clean(parsed[item.key]);
        var info = getResultFreshness(parsed, item.key);
        var fieldSource = parsed.fieldSources && parsed.fieldSources[item.key];
        var details = value ? sourceDescription(parsed, item.key) : '暂无明确数值';
        var usage = item.key === 'dataRemaining' && parsed.dataUsed ? '<small>已用 ' + escapeHTML(parsed.dataUsed) + '</small>' : '';
        var action = value && fieldSource && fieldSource.id ? '<button type="button" class="ko-source-link" title="查看原始回执" aria-label="查看' + item.label + '来源" data-operator-source="' + escapeHTML(fieldSource.id) + '">' + operatorIcon('message-square') + '</button>' : '';
        return '<div class="ko-metric' + (value && info.stale ? ' is-stale' : '') + '"><div class="ko-metric-label">' + item.label + action + '</div><b>' + escapeHTML(value || '--') + '</b><small>' + escapeHTML(details) + '</small>' + usage + '</div>';
      }).join('');
    });
    var plan = document.getElementById('kano-operator-plan');
    var rows = [['套餐名称', parsed.planName || '暂无明确记录'], ['生效日期', parsed.planEffectiveDate || '--'], ['有效期', parsed.expiry || '--']];
    stableMarkup(plan, JSON.stringify([rows, parsed.fieldSources && parsed.fieldSources.planName]), function () {
      return rows.map(function (row) { return '<div class="ko-kv"><span>' + row[0] + '</span><b>' + escapeHTML(row[1]) + '</b></div>'; }).join('') +
        (parsed.planName ? '<p class="ko-muted ko-small">' + escapeHTML(sourceDescription(parsed, 'planName')) + '</p>' : '');
    });
    renderResources();
  }

  function renderResources() {
    var box = document.getElementById('kano-operator-resources');
    if (!box) return;
    var details = state.parsed && state.parsed.details || [];
    box.hidden = !details.length;
    stableMarkup(box, JSON.stringify(details), function () {
      return '<h3>接口资源明细</h3><div class="ko-resource-table">' + details.map(function (row) {
        return '<div><b>' + escapeHTML(clean(row.name) || '流量资源') + '</b><span>' + escapeHTML(row.balance_gb != null ? formatGigabytes(row.balance_gb) : (row.remaining_gb != null ? formatGigabytes(row.remaining_gb) : '--')) + '</span><small>' + escapeHTML(clean(row.end)) + '</small></div>';
      }).join('') + '</div>';
    });
  }

  function getFilteredReplies() {
    var keyword = clean(state.replySearch).toLowerCase();
    return state.replies.filter(function (reply) {
      var category = classifyReplyCategory(reply);
      var matched = state.replyFilter === 'all' ||
        state.replyFilter === 'results' && ['traffic', 'balance', 'plan'].indexOf(category) !== -1 ||
        state.replyFilter === 'service' && ['menu', 'rejected', 'outgoing'].indexOf(category) !== -1 ||
        state.replyFilter === category;
      return matched && (!keyword || (reply.content + ' ' + reply.number + ' ' + reply.date).toLowerCase().indexOf(keyword) !== -1);
    });
  }

  function renderReplies() {
    var box = document.getElementById('kano-operator-replies');
    if (!box) return;
    var categories = { traffic: '流量', balance: '余额', plan: '套餐', rejected: '无效指令', menu: '服务菜单', verification: '安全验证', outgoing: '已发指令', notice: '通知' };
    var filtered = getFilteredReplies();
    var list = filtered.slice(0, state.replyLimit);
    setOperatorText('kano-operator-reply-count', filtered.length + ' 条回执');
    var more = document.getElementById('kano-operator-more');
    if (more) more.hidden = list.length >= filtered.length;
    if (!list.length) {
      stableMarkup(box, 'empty:' + state.replyFilter + ':' + state.replySearch, function () {
        return '<div class="kano-operator-empty">' + (state.replies.length ? '没有匹配的回执' : state.repliesBusy ? '正在读取官方回执' : '暂无官方回执') + '</div>';
      });
      return;
    }
    box._koSignature = null;
    var existing = new Map(Array.prototype.slice.call(box.children).map(function (row) { return [row.dataset.replyId, row]; }));
    var kept = new Set();
    var cursor = box.firstElementChild;
    list.forEach(function (reply) {
      var key = reply.id || reply.number + ':' + reply.date + ':' + reply.content;
      var row = existing.get(key);
      if (!row) { row = document.createElement('article'); row.dataset.replyId = key; }
      var category = classifyReplyCategory(reply);
      var content = category === 'verification' ? reply.content.replace(/\b\d{4,8}\b/g, '******') : reply.content;
      var classes = 'kano-operator-reply' + (state.focusReplyId === reply.id ? ' is-focused' : '');
      if (row.className !== classes) row.className = classes;
      stableMarkup(row, JSON.stringify([reply, category]), function () {
        return '<div class="kano-operator-reply-head"><div><b>' + escapeHTML(reply.number) + '</b><span class="ko-reply-kind">' + categories[category] + '</span></div><time>' + escapeHTML(reply.date) + '</time>' +
          '<button type="button" class="kano-operator-icon-btn" title="复制回执" aria-label="复制回执" data-operator-copy-reply="' + escapeHTML(reply.id) + '">' + operatorIcon('copy') + '</button></div>' +
          '<div class="kano-operator-reply-body">' + escapeHTML(content || '--') + '</div>';
      });
      if (row !== cursor) box.insertBefore(row, cursor);
      cursor = row.nextElementSibling;
      kept.add(row);
    });
    Array.prototype.slice.call(box.children).forEach(function (row) { if (!kept.has(row)) row.remove(); });
  }

  function renderConnectionSettings() {
    var configured = !!getBroadcastApiUrls().length;
    setOperatorText('kano-operator-api-frequency', !configured ? '未配置' : (state.provider === 'broadcast' ? '每 5 分钟同步' : '仅广电可用'));
    var status = state.proxyBusy ? '正在连接查询服务' : !configured ? '未配置接口，继续自动读取官方短信' :
      state.proxyError ? state.proxyError : state.proxyAuthorizationRequired ? '需要更新服务授权' :
      state.proxyParsed.replyKind === 'proxy' ? (state.proxyStale ? '接口可达，返回历史缓存' : '查询服务已连接') : '已配置，等待读取';
    setOperatorText('kano-operator-api-status', status);
    var el = document.getElementById('kano-operator-api-status');
    if (el) el.dataset.tone = state.proxyError || state.proxyAuthorizationRequired ? 'error' : '';
    var test = document.getElementById('kano-operator-api-test');
    if (test) test.disabled = state.provider !== 'broadcast' || !configured || state.proxyBusy;
    var auth = document.getElementById('kano-operator-api-auth');
    if (auth) auth.disabled = !configured;
    setOperatorText('kano-operator-channel-status', state.provider === 'broadcast' ? '广电短信菜单暂无可用的余量查询指令' : '短信查询会在发送前确认号码和内容');
    setOperatorText('kano-operator-read-state', state.repliesError ? state.repliesError : (state.lastReadAt ? '最近读取 ' + state.lastReadAt : '等待读取'));
    setOperatorText('kano-operator-network-error', state.snapshotError ? '部分网络字段未能更新：' + state.snapshotError : '');
  }

  function updateHeader() {
    var provider = PROVIDERS[state.provider] || PROVIDERS.unknown;
    setOperatorText('kano-operator-title', provider.name);
    setOperatorText('kano-operator-subtitle', normalizeNetworkType(state.snapshot.network_type) + ' · ' + normalizeConnection(state.snapshot.ppp_status));
    setOperatorText('kano-operator-sync-time', state.lastReadAt ? '本机同步 ' + state.lastReadAt.split(' ')[1] : '尚未同步');
    var detected = PROVIDERS[detectOperator(state.snapshot)] || PROVIDERS.unknown;
    setOperatorText('kano-operator-detection', getProviderOverride() ? '手动选择 · 设备识别 ' + detected.shortName : '自动识别');
  }

  function renderAll() {
    updateHeader();
    renderProviderSelector();
    renderIdentity();
    renderParsed();
    renderQueryActions();
    renderReplies();
    renderConnectionSettings();
  }

  async function refresh(manual) {
    if (state.refreshBusy || state.busy) return state.snapshot;
    state.refreshBusy = true;
    var generation = state.generation;
    renderQueryActions();
    setStatus('正在读取设备与官方记录', 'loading');
    try {
      var snapshot = await readSnapshot();
      state.snapshot = snapshot;
      if (generation !== state.generation) { renderIdentity(); return snapshot; }
      var nextProvider = getProviderOverride() || detectOperator(snapshot);
      if (state.provider !== nextProvider) {
        resetOperatorResults();
        generation = state.generation;
        state.provider = nextProvider;
      }
      renderAll();
      await readReplies(false);
      if (generation !== state.generation) return snapshot;
      if (state.provider === 'broadcast' && getBroadcastApiUrls().length) await queryBroadcastApi(!!manual);
      if (manual) toast('运营商信息已刷新', 'green');
      return snapshot;
    } catch (error) {
      if (error.code === 'AUTH_REQUIRED') showNativeLogin();
      setStatus(error.message || '读取失败，保留已有记录', 'error');
      if (manual) toast(error.message || '状态读取失败', 'red');
      throw error;
    } finally {
      state.refreshBusy = false;
      renderQueryActions();
      renderConnectionSettings();
    }
  }

  function setOperatorTab(tab) {
    state.tab = ['overview', 'replies', 'settings'].indexOf(tab) !== -1 ? tab : 'overview';
    Array.prototype.slice.call(document.querySelectorAll('#' + MODAL_ID + ' [data-operator-tab]')).forEach(function (button) {
      var active = button.dataset.operatorTab === state.tab;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
    });
    Array.prototype.slice.call(document.querySelectorAll('#' + MODAL_ID + ' [data-operator-page]')).forEach(function (page) {
      page.hidden = page.dataset.operatorPage !== state.tab;
    });
    if (state.tab === 'replies') renderReplies();
  }

  function resetOperatorResults() {
    state.generation++;
    state.repliesRequest++;
    state.proxyRequest++;
    state.replies = [];
    state.parsed = {};
    state.smsParsed = {};
    state.proxyParsed = {};
    state.proxyError = '';
    state.proxySourceUrl = '';
    state.proxyStale = false;
    state.proxyAuthorizationRequired = false;
    state.repliesLoaded = false;
    state.repliesBusy = false;
    state.proxyBusy = false;
    state.lastReadAt = '';
    state.repliesError = '';
    state.replyLimit = 30;
    state.focusReplyId = '';
    state.pendingQuery = null;
    stopReplyPolling();
    stopBroadcastPolling();
  }

  function changeProvider(value) {
    if (state.busy || value !== 'auto' && !PROVIDERS[value]) return;
    setProviderOverride(value);
    resetOperatorResults();
    state.provider = value === 'auto' ? detectOperator(state.snapshot) : value;
    renderAll();
    readReplies(false).then(function () {
      if (state.provider === 'broadcast' && getBroadcastApiUrls().length) queryBroadcastApi(false);
    });
  }

  async function copyOperatorText(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(text);
      else {
        var area = document.createElement('textarea');
        area.value = text;
        area.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
        document.getElementById(MODAL_ID).appendChild(area);
        area.select();
        var copied = document.execCommand('copy');
        area.remove();
        if (!copied) throw new Error('复制失败');
      }
      toast('已复制', 'green');
    } catch (error) { toast('复制失败，请手动选择内容', 'red'); }
  }

  async function openCommunication(mode) {
    var provider = PROVIDERS[state.provider] || PROVIDERS.unknown;
    if (!window.KanoPhoneSMS || typeof window.KanoPhoneSMS.open !== 'function') {
      setStatus('请先启用电话与短信插件', 'error');
      return;
    }
    close();
    await window.KanoPhoneSMS.open();
    if (mode === 'sms') {
      var tab = document.getElementById('kn_ps_tab_sms');
      if (tab) tab.click();
    } else {
      var input = document.getElementById('kn_phone_number');
      if (input) { input.value = provider.service; input.dispatchEvent(new Event('input', { bubbles: true })); input.focus(); }
    }
  }

  function showReplySource(id) {
    state.replyFilter = 'all';
    state.replySearch = '';
    state.focusReplyId = id;
    var index = state.replies.findIndex(function (reply) { return reply.id === id; });
    state.replyLimit = Math.max(30, index + 1);
    var filter = document.getElementById('kano-operator-reply-filter');
    var search = document.getElementById('kano-operator-reply-search');
    if (filter) filter.value = 'all';
    if (search) search.value = '';
    setOperatorTab('replies');
    var row = Array.prototype.slice.call(document.querySelectorAll('#kano-operator-replies [data-reply-id]')).find(function (item) { return item.dataset.replyId === id; });
    if (row) { row.tabIndex = -1; row.scrollIntoView({ block: 'center' }); row.focus({ preventScroll: true }); }
  }

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      ~root~{--ko-bg:rgba(25,28,33,.98);--ko-field:rgba(255,255,255,.045);--ko-border:rgba(255,255,255,.11);--ko-text:#eef0f3;--ko-muted:#9ca4af;--ko-green:#74d2a3;--ko-blue:#8bb8ff;--ko-warn:#e6bd6c;--ko-red:#ff959e;position:fixed!important;inset:0!important;z-index:999999!important;display:none;align-items:center;justify-content:center;padding:20px!important;background:rgba(0,0,0,.44)!important;backdrop-filter:blur(8px);color:var(--ko-text);font:400 13px/1.5 system-ui,-apple-system,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;text-align:left}
      .kn-theme-light ~root~{--ko-bg:rgba(250,252,254,.98);--ko-field:rgba(30,38,48,.035);--ko-border:rgba(30,38,48,.13);--ko-text:#242a32;--ko-muted:#67717e;--ko-green:#1c784d;--ko-blue:#235eb2;--ko-warn:#8a610d;--ko-red:#b52b39}
      ~root~.show{display:flex!important}
      ~root~ *,~root~ *::before,~root~ *::after{box-sizing:border-box;letter-spacing:0;text-shadow:none!important}
      ~root~ [hidden]{display:none!important}
      ~root~ button,~root~ input,~root~ select,~root~ textarea{font:inherit;color:inherit;margin:0;min-width:0;box-shadow:none!important}
      ~root~ button{background:transparent!important;color:inherit!important;border:1px solid var(--ko-border);border-color:var(--ko-border)!important;border-radius:6px!important;cursor:pointer;transform:none!important}
      ~root~ button:disabled{opacity:.45;cursor:default}
      ~root~ button:hover:not(:disabled){background:var(--ko-field)!important}
      ~root~ :focus-visible{outline:2px solid var(--ko-blue);outline-offset:2px}
      ~root~ svg{width:17px;height:17px;display:block;flex:0 0 auto;pointer-events:none}
      ~root~ .kano-operator-panel{width:min(1120px,100%);height:min(760px,calc(100dvh - 40px));max-height:calc(100dvh - 40px);display:flex;flex-direction:column;min-height:0;overflow:hidden;background:var(--ko-bg);border:1px solid var(--ko-border);border-radius:8px;box-shadow:0 18px 70px rgba(0,0,0,.35)}
      ~root~ .kano-operator-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 18px;border-bottom:1px solid var(--ko-border);flex:0 0 auto}
      ~root~ .kano-operator-head h2{font-size:18px;font-weight:650;line-height:1.4;margin:0;color:var(--ko-text)}
      ~root~ .kano-operator-head p{font-size:11px;color:var(--ko-muted);margin:3px 0 0;line-height:1.5}
      ~root~ .ko-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-width:0}
      ~root~ .kano-operator-head .ko-actions{flex-wrap:nowrap;flex:0 0 auto}
      ~root~ .kano-operator-icon-btn,~root~ .ko-button{display:inline-flex;align-items:center;justify-content:center;gap:7px;height:34px;padding:7px 11px;line-height:1.3;font-size:12px;white-space:nowrap}
      ~root~ .kano-operator-icon-btn{width:34px;flex:0 0 34px;padding:7px}
      ~root~ .ko-button.primary{background:var(--ko-green)!important;border-color:transparent!important;color:#10291e!important}
      .kn-theme-light ~root~ .ko-button.primary{color:#fff!important}
      ~root~ .ko-context{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:10px 18px;border-bottom:1px solid var(--ko-border);flex:0 0 auto;color:var(--ko-muted);font-size:11px}
      ~root~ .ko-context select{width:132px;height:32px}
      ~root~ #kano-operator-phone{margin-left:auto;font-variant-numeric:tabular-nums;white-space:nowrap}
      ~root~ input:not([type="checkbox"]),~root~ select{width:100%;height:36px;padding:7px 10px;border:1px solid var(--ko-border);border-radius:6px;background:var(--ko-field)!important;color:var(--ko-text)!important;border-color:var(--ko-border)!important;outline:none;font-size:12px}
      ~root~ .ko-context select{width:132px;height:32px}
      ~root~ input::placeholder{color:var(--ko-muted);opacity:.8}
      ~root~ input:focus,~root~ select:focus{border-color:var(--ko-blue)!important}
      ~root~ select option{background:var(--ko-bg);color:var(--ko-text)}
      ~root~ .ko-tabs{display:flex;align-items:stretch;gap:24px;padding:0 18px;border-bottom:1px solid var(--ko-border);min-height:44px;flex:0 0 auto}
      ~root~ .ko-tabs button{border:0;border-bottom:2px solid transparent;border-color:transparent!important;border-radius:0!important;padding:10px 0;color:var(--ko-muted)!important;font-size:13px;font-weight:600}
      ~root~ .ko-tabs button.is-active{border-bottom-color:var(--ko-green)!important;color:var(--ko-text)!important}
      ~root~ .kano-operator-body{flex:1;min-height:0;overflow:hidden}
      ~root~ [data-operator-page]{height:100%;min-height:0;overflow-y:auto;overscroll-behavior:contain}
      ~root~ .ko-overview{display:flex;flex-direction:column}
      ~root~ .ko-section{padding:16px 20px;min-width:0}
      ~root~ .ko-overview>.ko-section:first-child{padding-bottom:10px}
      ~root~ h3{font-size:12px;font-weight:600;margin:0 0 10px;line-height:1.5;color:var(--ko-text)}
      ~root~ .ko-section-heading{display:flex;align-items:baseline;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:4px}
      ~root~ .ko-section-heading h3{margin-bottom:4px}
      ~root~ .ko-section-heading>span{font-size:11px;color:var(--ko-muted)}
      ~root~ [data-tone="warn"]{color:var(--ko-warn)!important}
      ~root~ [data-tone="error"]{color:var(--ko-red)!important}
      ~root~ .ko-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));padding-top:8px;border-bottom:1px solid var(--ko-border)}
      ~root~ .ko-metric{min-width:0;padding:0 14px 14px;border-right:1px solid var(--ko-border)}
      ~root~ .ko-metric:first-child{padding-left:0}
      ~root~ .ko-metric:last-child{border-right:0}
      ~root~ .ko-metric-label{display:flex;align-items:center;justify-content:space-between;gap:6px;min-height:28px;color:var(--ko-muted);font-size:11px}
      ~root~ .ko-metric>b{display:block;font-size:21px;font-weight:650;line-height:1.4;overflow-wrap:anywhere;font-variant-numeric:tabular-nums;margin:5px 0}
      ~root~ .ko-metric.is-stale>b{color:var(--ko-muted)}
      ~root~ .ko-metric small{display:block;font-size:10px;line-height:1.6;color:var(--ko-muted);overflow-wrap:anywhere}
      ~root~ .ko-source-link{width:26px;height:26px;display:inline-flex;align-items:center;justify-content:center;padding:4px;border:0;color:var(--ko-muted)!important}
      ~root~ .ko-source-link svg{width:14px;height:14px}
      ~root~ .ko-overview-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:28px;flex:1;min-height:min-content;padding:0 20px}
      ~root~ .ko-overview-grid .ko-section{padding:0 0 14px}
      ~root~ .ko-kv{display:grid;grid-template-columns:88px minmax(0,1fr);align-items:center;gap:12px;padding:7px 0;border-bottom:1px solid var(--ko-border);font-size:12px;line-height:1.5;min-height:33px}
      ~root~ .ko-kv>span{color:var(--ko-muted)}
      ~root~ .ko-kv>b{font-weight:500;text-align:right;overflow-wrap:anywhere;font-variant-numeric:tabular-nums}
      ~root~ .ko-muted{color:var(--ko-muted)}
      ~root~ .ko-small{font-size:11px;line-height:1.6;margin:8px 0 0;overflow-wrap:anywhere}
      ~root~ .ko-small:empty{display:none}
      ~root~ .ko-channel{padding-top:10px;border-top:1px solid var(--ko-border)}
      ~root~ .ko-channel h3{margin-bottom:8px}
      ~root~ .ko-replies-page{display:flex;flex-direction:column}
      ~root~ .ko-reply-toolbar{display:grid;grid-template-columns:minmax(0,1fr) 138px auto 34px;gap:8px;align-items:center;padding:12px 18px;border-bottom:1px solid var(--ko-border);flex:0 0 auto}
      ~root~ #kano-operator-reply-count{font-size:10px;color:var(--ko-muted);white-space:nowrap}
      ~root~ .ko-replies-scroll{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:0 18px 14px;scrollbar-gutter:stable}
      ~root~ .kano-operator-reply{padding:14px 0;border-bottom:1px solid var(--ko-border);margin:0;min-width:0}
      ~root~ .kano-operator-reply.is-focused{border-left:2px solid var(--ko-green);padding-left:10px;background:var(--ko-field)}
      ~root~ .kano-operator-reply-head{display:flex;align-items:center;gap:8px;margin-bottom:8px}
      ~root~ .kano-operator-reply-head>div{display:flex;align-items:center;gap:8px;min-width:0}
      ~root~ .kano-operator-reply-head b{font-size:12px;font-weight:600;overflow-wrap:anywhere}
      ~root~ .ko-reply-kind{font-size:10px;color:var(--ko-green);white-space:nowrap}
      ~root~ .kano-operator-reply-head time{font-size:10px;color:var(--ko-muted);margin-left:auto;white-space:nowrap}
      ~root~ .kano-operator-reply-head .kano-operator-icon-btn{width:28px;height:28px;flex-basis:28px;border:0}
      ~root~ .kano-operator-reply-head .kano-operator-icon-btn svg{width:15px;height:15px}
      ~root~ .kano-operator-reply-body{font-size:12px;line-height:1.8;white-space:pre-wrap;overflow-wrap:anywhere}
      ~root~ .kano-operator-empty{display:flex;align-items:center;justify-content:center;min-height:160px;padding:24px;color:var(--ko-muted);font-size:12px;text-align:center}
      ~root~ .ko-more{display:flex;margin:14px auto 0}
      ~root~ .ko-settings-page{padding:0 20px}
      ~root~ .ko-settings-page>.ko-section{padding:16px 0;border-bottom:1px solid var(--ko-border)}
      ~root~ .ko-settings-page>.ko-section:last-child{border-bottom:0}
      ~root~ .ko-api-input{display:grid;grid-template-columns:minmax(0,1fr) 78px;gap:8px;margin-top:7px}
      ~root~ #kano-operator-api-form>label{font-size:11px;color:var(--ko-muted)}
      ~root~ .ko-status-line{font-size:11px;line-height:1.6;color:var(--ko-muted);min-height:18px;margin:8px 0}
      ~root~ details>summary{font-size:12px;cursor:pointer}
      ~root~ .ko-check{display:flex;align-items:center;gap:8px;font-size:11px;color:var(--ko-muted);margin:12px 0 4px}
      ~root~ .ko-check input{width:16px;height:16px;flex:0 0 16px;accent-color:var(--ko-green)}
      ~root~ .ko-resource-table>div{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;padding:9px 0;border-bottom:1px solid var(--ko-border);font-size:12px}
      ~root~ .ko-resource-table b{font-weight:500;overflow-wrap:anywhere}
      ~root~ .ko-resource-table small{grid-column:1/-1;color:var(--ko-muted);font-size:10px}
      ~root~ .kano-operator-footer{display:flex;align-items:center;gap:12px;padding:10px 18px;border-top:1px solid var(--ko-border);min-height:42px;flex:0 0 auto;font-size:10px;color:var(--ko-muted)}
      ~root~ .kano-operator-status{flex:1;min-width:0;white-space:nowrap;text-overflow:ellipsis;overflow:hidden}
      ~root~ .kano-operator-status.error{color:var(--ko-red)}
      ~root~ .kano-operator-status.loading{color:var(--ko-blue)}
      ~root~ .kano-operator-footer>span{white-space:nowrap}
      @media(max-width:760px){~root~{padding:10px!important}~root~ .kano-operator-panel{height:calc(100dvh - 20px);max-height:calc(100dvh - 20px)}~root~ .ko-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}~root~ .ko-metric{padding:10px 12px;border-top:1px solid var(--ko-border)}~root~ .ko-metric:nth-child(odd){padding-left:0}~root~ .ko-metric:nth-child(even){border-right:0}~root~ .ko-metric:nth-child(-n+2){border-top:0;padding-top:0}~root~ .ko-overview-grid{grid-template-columns:minmax(0,1fr);gap:8px}~root~ .ko-overview-grid .ko-section{padding-bottom:12px}~root~ .ko-context{gap:8px}~root~ #kano-operator-detection{font-size:10px}~root~ .ko-tabs{gap:22px}~root~ .ko-reply-toolbar{grid-template-columns:minmax(0,1fr) 120px 34px}~root~ #kano-operator-reply-count{grid-row:2;grid-column:1/-1}~root~ .ko-reply-toolbar .kano-operator-icon-btn{grid-column:3;grid-row:1}}
      @media(max-width:460px){~root~ .kano-operator-head{padding:12px}~root~ .kano-operator-head h2{font-size:17px}~root~ .kano-operator-head .ko-actions{gap:5px}~root~ .ko-context{padding:9px 12px}~root~ #kano-operator-detection{flex-basis:100%;order:4}~root~ .ko-tabs{padding:0 12px}~root~ .ko-section{padding:14px 12px}~root~ .ko-overview-grid{padding:0 12px}~root~ .ko-reply-toolbar{padding:10px 12px}~root~ .ko-replies-scroll{padding:0 12px 12px}~root~ .ko-settings-page{padding:0 12px}~root~ .kano-operator-footer{padding:9px 12px;gap:8px}~root~ #kano-operator-sync-time{display:none}~root~ .kano-operator-reply-head{flex-wrap:wrap}~root~ .kano-operator-reply-head time{font-size:9px}~root~ .ko-metric>b{font-size:20px}}
      @media(prefers-reduced-motion:reduce){~root~ *{transition:none!important;scroll-behavior:auto!important}}
`.split('~root~').join('#' + MODAL_ID);
    document.head.appendChild(style);
  }

  function buildModal() {
    var existing = document.getElementById(MODAL_ID);
    if (existing) existing.remove();
    var modal = document.createElement('div');
    modal.id = MODAL_ID;
    modal.innerHTML =
      '<section class="kano-operator-panel" role="dialog" aria-modal="true" aria-labelledby="kano-operator-title" tabindex="-1">' +
      '<header class="kano-operator-head"><div><h2 id="kano-operator-title">运营商信息</h2><p id="kano-operator-subtitle">SIM 与官方记录</p></div><div class="ko-actions">' +
      operatorButton('copy', '复制脱敏设备信息', 'copy') + operatorButton('refresh-cw', '刷新运营商数据', 'refresh') + operatorButton('x', '关闭运营商信息', 'close') + '</div></header>' +
      '<div class="ko-context"><label for="kano-operator-provider">运营商</label><select id="kano-operator-provider" aria-label="选择运营商"><option value="auto">自动识别</option><option value="mobile">中国移动</option><option value="unicom">中国联通</option><option value="telecom">中国电信</option><option value="broadcast">中国广电</option></select><span id="kano-operator-detection"></span><span id="kano-operator-phone"></span></div>' +
      '<nav class="ko-tabs" role="tablist" aria-label="运营商信息分类"><button type="button" role="tab" aria-selected="true" aria-controls="ko-overview" id="ko-tab-overview" data-operator-tab="overview" class="is-active">用量概览</button><button type="button" role="tab" aria-selected="false" aria-controls="ko-replies" id="ko-tab-replies" data-operator-tab="replies" tabindex="-1">官方回执</button><button type="button" role="tab" aria-selected="false" aria-controls="ko-settings" id="ko-tab-settings" data-operator-tab="settings" tabindex="-1">查询设置</button></nav>' +
      '<div class="kano-operator-body">' +
      '<main id="ko-overview" role="tabpanel" aria-labelledby="ko-tab-overview" data-operator-page="overview" class="ko-overview">' +
      '<section class="ko-section"><div class="ko-section-heading"><h3>官方余量记录</h3><span id="kano-operator-result-source"></span></div><div id="kano-operator-parsed" class="ko-metrics"></div></section>' +
      '<div class="ko-overview-grid"><section class="ko-section"><h3>SIM 与网络</h3><div id="kano-operator-identity"></div><p id="kano-operator-network-error" class="ko-muted ko-small"></p></section><section class="ko-section"><h3>套餐记录</h3><div id="kano-operator-plan"></div></section></div>' +
      '<section id="kano-operator-resources" class="ko-section" hidden></section>' +
      '<section class="ko-section ko-channel"><h3>查询与服务</h3><div id="kano-operator-query-actions" class="ko-actions"></div></section></main>' +
      '<section id="ko-replies" role="tabpanel" aria-labelledby="ko-tab-replies" data-operator-page="replies" class="ko-replies-page" hidden><div class="ko-reply-toolbar"><input type="search" id="kano-operator-reply-search" aria-label="搜索官方回执" placeholder="搜索回执内容"><select id="kano-operator-reply-filter" aria-label="回执分类"><option value="results">查询结果</option><option value="all">全部回执</option><option value="traffic">流量</option><option value="balance">余额</option><option value="plan">套餐</option><option value="service">指令与菜单</option></select><span id="kano-operator-reply-count"></span>' + operatorButton('refresh-cw', '刷新官方回执', 'replies') + '</div><div class="ko-replies-scroll"><div id="kano-operator-replies"></div><button type="button" class="ko-button ko-more" data-operator-action="more" id="kano-operator-more" hidden>加载更多</button></div></section>' +
      '<section id="ko-settings" role="tabpanel" aria-labelledby="ko-tab-settings" data-operator-page="settings" class="ko-settings-page" hidden>' +
      '<section class="ko-section"><h3>自动读取</h3><div class="ko-kv"><span>官方短信</span><b>每分钟同步</b></div><div class="ko-kv"><span>广电接口</span><b id="kano-operator-api-frequency">未配置</b></div><p id="kano-operator-read-state" class="ko-muted ko-small"></p><p id="kano-operator-channel-status" class="ko-muted ko-small"></p></section>' +
      '<section class="ko-section"><h3>广电查询服务</h3><form id="kano-operator-api-form"><label for="kano-operator-api-url">接口地址</label><div class="ko-api-input"><input id="kano-operator-api-url" type="url" aria-label="广电查询接口地址" autocomplete="off" placeholder="http://设备地址:端口/traffic"><button type="submit" class="ko-button">' + operatorIcon('square-pen') + '保存</button></div></form><p id="kano-operator-api-status" class="ko-status-line" role="status" aria-live="polite"></p><div class="ko-actions"><button type="button" class="ko-button" id="kano-operator-api-test" data-operator-action="api">' + operatorIcon('refresh-cw') + '读取接口</button><button type="button" class="ko-button" id="kano-operator-api-auth" data-operator-action="authorization">' + operatorIcon('square-pen') + '服务授权</button></div></section>' +
      '<section class="ko-section"><details><summary>设备标识</summary><label class="ko-check"><input type="checkbox" id="kano-operator-show-identifiers">显示完整设备标识</label><div id="kano-operator-identifiers"></div></details></section></section>' +
      '</div><footer class="kano-operator-footer"><div id="kano-operator-status" class="kano-operator-status idle" role="status" aria-live="polite">等待读取</div><span id="kano-operator-sync-time"></span><span>v1.4.0</span></footer></section>';
    document.body.appendChild(modal);
    var apiInput = modal.querySelector('#kano-operator-api-url');
    apiInput.value = getBroadcastApiUrl();
    modal.addEventListener('click', function (event) {
      if (event.target === modal) { close(); return; }
      var button = event.target.closest('button');
      if (!button || !modal.contains(button) || button.disabled) return;
      if (button.dataset.operatorTab) { setOperatorTab(button.dataset.operatorTab); return; }
      if (button.dataset.operatorQuery) { sendQuery(button.dataset.operatorQuery); return; }
      if (button.dataset.operatorSource) { showReplySource(button.dataset.operatorSource); return; }
      if (button.dataset.operatorCopyReply) {
        var reply = state.replies.find(function (item) { return item.id === button.dataset.operatorCopyReply; });
        if (reply) copyOperatorText(classifyReplyCategory(reply) === 'verification' ? reply.content.replace(/\b\d{4,8}\b/g, '******') : reply.content);
        return;
      }
      var action = button.dataset.operatorAction;
      if (action === 'close') close();
      if (action === 'refresh') refresh(true).catch(function () {});
      if (action === 'replies') readReplies(true);
      if (action === 'api') queryBroadcastApi(true);
      if (action === 'authorization') openBroadcastProxySettings();
      if (action === 'official') openOfficialHall();
      if (action === 'sms' || action === 'phone') openCommunication(action).catch(function () { toast('无法打开通信插件', 'red'); });
      if (action === 'more') { state.replyLimit += 30; renderReplies(); }
      if (action === 'stop-waiting') { stopReplyPolling(); state.pendingQuery = null; renderQueryActions(); setStatus('已停止等待，已提交的短信不会撤回', 'idle'); }
      if (action === 'copy') {
        var data = state.snapshot;
        copyOperatorText(['运营商：' + (PROVIDERS[state.provider] || PROVIDERS.unknown).name, '网络：' + normalizeNetworkType(data.network_type), '连接：' + normalizeConnection(data.ppp_status), '手机号：' + maskIdentifier(data.msisdn, 4), 'IMSI：' + maskIdentifier(data.imsi, 4), 'ICCID：' + maskIdentifier(data.iccid, 4), 'IMEI：' + maskIdentifier(data.imei, 4)].join('\n'));
      }
    });
    modal.querySelector('#kano-operator-provider').onchange = function (event) { changeProvider(event.target.value); };
    modal.querySelector('#kano-operator-show-identifiers').onchange = function (event) { state.showIdentifiers = event.target.checked; renderIdentity(); };
    modal.querySelector('#kano-operator-reply-search').oninput = function (event) { state.replySearch = event.target.value; state.replyLimit = 30; renderReplies(); };
    modal.querySelector('#kano-operator-reply-filter').onchange = function (event) { state.replyFilter = event.target.value; state.replyLimit = 30; renderReplies(); };
    modal.querySelector('#kano-operator-api-form').onsubmit = function (event) {
      event.preventDefault();
      try {
        var oldUrl = getBroadcastApiUrl();
        var url = setBroadcastApiUrl(apiInput.value);
        apiInput.value = url;
        if (url !== oldUrl) {
          state.proxyRequest++;
          state.proxyBusy = false;
          state.proxyParsed = {};
          state.proxyError = '';
          state.proxyStale = false;
          state.proxySourceUrl = '';
          state.proxyAuthorizationRequired = false;
        }
        syncEffectiveParsed();
        renderParsed();
        renderConnectionSettings();
        if (url && state.provider === 'broadcast') queryBroadcastApi(true);
        else stopBroadcastPolling();
        toast(url ? '查询地址已保存' : '查询地址已清除', 'green');
      } catch (error) { setOperatorText('kano-operator-api-status', error.message); toast(error.message, 'red'); }
    };
    modal.querySelector('.ko-tabs').onkeydown = function (event) {
      if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].indexOf(event.key) === -1) return;
      var tabs = ['overview', 'replies', 'settings'];
      var index = tabs.indexOf(state.tab);
      index = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (index + (event.key === 'ArrowLeft' ? 2 : 1)) % 3;
      event.preventDefault();
      setOperatorTab(tabs[index]);
      modal.querySelector('[data-operator-tab="' + tabs[index] + '"]').focus();
    };
    return modal;
  }

  function syncWebOSCard() {
    var status = document.getElementById('kn-home-operator-plugin-status');
    var githubButton = document.querySelector('#kn-home-dashboard [data-home-action="operatorGithub"]');
    if (status) {
      status.className = 'kn-home-plugin-status ready';
      status.textContent = '已检测到运营商查询插件';
    }
    if (githubButton) githubButton.style.display = 'none';
    if (status) {
      var standaloneButton = document.getElementById(BUTTON_ID);
      if (standaloneButton) standaloneButton.remove();
    }
  }

  function ensureMainButton() {
    var oldButton = document.getElementById(BUTTON_ID);
    if (oldButton) oldButton.remove();
    if (window.KanoWebOS) return;
    var button = document.createElement('button');
    button.id = BUTTON_ID;
    button.type = 'button';
    button.textContent = TITLE;
    button.onclick = open;
    var host = document.querySelector('.actions-buttons') || document.querySelector('.func_list_container .collapse_box') || document.body;
    if (!host) { setTimeout(ensureMainButton, 120); return; }
    host.appendChild(button);
  }

  async function open() {
    var modal = document.getElementById(MODAL_ID) || buildModal();
    if (!modal.classList.contains('show')) state.opener = document.activeElement;
    modal.classList.add('show');
    if (!state.escHandler) {
      state.escHandler = function (event) {
        if (event.key === 'Escape') close();
        if (event.key === 'Tab') {
          var controls = Array.prototype.slice.call(modal.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),summary,[tabindex="0"]')).filter(function (el) { return el.getClientRects().length; });
          var first = controls[0], last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); if (last) last.focus(); }
          if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); if (first) first.focus(); }
        }
      };
      document.addEventListener('keydown', state.escHandler);
    }
    renderAll();
    setOperatorTab(state.tab);
    modal.querySelector('[data-operator-tab="' + state.tab + '"]').focus();
    try { await refresh(false); } catch (e) {}
    startAutoReplyPolling();
  }

  function close() {
    var modal = document.getElementById(MODAL_ID);
    if (modal) modal.classList.remove('show');
    if (state.escHandler) {
      document.removeEventListener('keydown', state.escHandler);
      state.escHandler = null;
    }
    if (state.showIdentifiers) {
      state.showIdentifiers = false;
      var check = document.getElementById('kano-operator-show-identifiers');
      if (check) check.checked = false;
      renderIdentity();
    }
    if (state.opener && state.opener.isConnected) state.opener.focus();
  }

  function destroy() {
    stopReplyPolling();
    stopAutoReplyPolling();
    stopBroadcastPolling();
    close();
    var modal = document.getElementById(MODAL_ID);
    var style = document.getElementById(STYLE_ID);
    var button = document.getElementById(BUTTON_ID);
    if (modal) modal.remove();
    if (style) style.remove();
    if (button) button.remove();
    try {
      if (window.KanoCarrierInfo === api) delete window.KanoCarrierInfo;
      if (window.KanoOperatorInfo === api) delete window.KanoOperatorInfo;
    } catch (e) {}
  }

  try {
    if (window.KanoOperatorInfo && typeof window.KanoOperatorInfo.destroy === 'function') window.KanoOperatorInfo.destroy();
  } catch (e) {}

  ensureStyle();
  buildModal();
  ensureMainButton();

  var api = {
    version: VERSION,
    open: open,
    close: close,
    refresh: refresh,
    readReplies: readReplies,
    sendQuery: sendQuery,
    queryBroadcastApi: queryBroadcastApi,
    setBroadcastApiUrl: setBroadcastApiUrl,
    getBroadcastApiUrl: getBroadcastApiUrl,
    detectOperator: detectOperator,
    parseCarrierSms: parseCarrierSms,
    normalizeBroadcastApiResult: normalizeBroadcastApiResult,
    getSnapshot: function () { return Object.assign({}, state.snapshot); },
    getParsed: function () { return Object.assign({}, state.parsed); },
    destroy: destroy
  };
  window.KanoOperatorInfo = api;
  window.KanoCarrierInfo = api;
  syncWebOSCard();
  setTimeout(syncWebOSCard, 900);
  setTimeout(function () {
    refresh(false).catch(function () {}).finally(startAutoReplyPolling);
  }, 1200);
  document.dispatchEvent(new CustomEvent('kano:operator-info-ready', { detail: { version: VERSION } }));
}());
//</script>
