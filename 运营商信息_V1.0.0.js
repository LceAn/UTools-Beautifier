//<script>
(function () {
  'use strict';

  var TITLE = '运营商信息';
  var VERSION = '1.0.1-base64-latest-receipt';
  var STYLE_ID = 'kano-operator-info-style';
  var MODAL_ID = 'kano-operator-info-modal';
  var BUTTON_ID = 'kano-operator-info-button';
  var PROVIDER_KEY = 'kano_operator_info_provider_v1';
  var POLL_INTERVAL = 7000;
  var POLL_TIMEOUT = 90000;

  var state = {
    snapshot: {},
    provider: 'unknown',
    replies: [],
    parsed: {},
    repliesLoaded: false,
    repliesBusy: false,
    busy: false,
    pollTimer: null,
    pollDeadline: 0,
    pendingQuery: null,
    escHandler: null
  };

  var PROVIDERS = {
    mobile: {
      name: '中国移动',
      shortName: '移动',
      service: '10086',
      className: 'mobile',
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
      commands: []
    },
    unknown: {
      name: '未识别运营商',
      shortName: '未识别',
      service: '',
      className: 'unknown',
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
    var response = await fetch(url, options || {});
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
    if (raw === '20') return '5G';
    if (raw === '12') return '4G';
    if (raw === '11') return '3G';
    return raw || '--';
  }

  function normalizeSimState(value) {
    var raw = clean(value);
    var lower = raw.toLowerCase();
    if (!raw) return '--';
    if (raw === '1' || lower === 'ready' || lower === 'normal' || lower === 'sim_ready') return '正常';
    if (raw === '0' || /no.?sim|absent/.test(lower)) return '未检测到 SIM';
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
      try { data = await getUFIData() || {}; }
      catch (error) { console.warn('[OperatorInfo] getUFIData failed, trying direct request:', error); }
    }
    try {
      if (!Object.keys(data).length) data = await fetchJSON(url, { headers: getCommonHeaders() });
    } catch (error) {
      if (error.code === 'AUTH_REQUIRED') throw error;
      console.warn('[OperatorInfo] status request failed, using DOM fallback:', error);
    }

    data = data || {};
    data.network_provider = firstValue(data, ['network_provider', 'spn_name', 'spn_name_data', 'operator_name']) || readDomValue(['运营商', '网络运营商']);
    data.network_type = firstValue(data, ['network_type']) || readDomValue(['网络类型', '制式']);
    data.simcard_status = firstValue(data, ['simcard_status', 'sim_status', 'sim_state']) || readDomValue(['SIM状态', 'SIM 状态']);
    data.msisdn = firstValue(data, ['msisdn', 'mdn', 'sim_phone_number', 'own_number', 'phone_number']) || readDomValue(['手机号', '本机号码', 'SIM号码']);
    data.imsi = firstValue(data, ['imsi', 'sim_imsi']) || readDomValue(['IMSI']);
    data.iccid = firstValue(data, ['iccid']) || readDomValue(['ICCID']);
    data.imei = firstValue(data, ['imei']) || readDomValue(['IMEI']);
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
    if (base64.length >= 12 && base64.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
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

  function parseCarrierSms(text) {
    var raw = String(text || '').replace(/\r/g, '').trim();
    var dataAmount = '(?:\\d+(?:\\.\\d+)?\\s*(?:GB|MB|KB|TB|G|M|K|T)\\s*){1,2}';
    var balance = firstMatch(raw, [
      /(?:账户余额|当前余额|话费余额|余额|话费)[^\d\-]{0,12}(-?\d+(?:\.\d+)?)\s*(?:元|￥)?/i,
      /(-?\d+(?:\.\d+)?)\s*元[^。；;，,\n]{0,20}(?:余额|话费)/i
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
      /(?:当前套餐|套餐名称|已订购套餐)\s*(?:为|是|：|:)?\s*([^，。；;\n]{2,36})/i
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
      raw: raw
    };
  }

  function parseReplies(replies) {
    var incoming = (replies || []).filter(function (reply) { return reply.direction === 'in'; });
    for (var i = 0; i < incoming.length; i += 1) {
      var parsed = parseCarrierSms(incoming[i].content);
      if (hasParsedCarrierData(parsed)) {
        parsed.sourceDate = incoming[i].date || '';
        parsed.sourceNumber = incoming[i].number || '';
        parsed.sourceId = incoming[i].id || '';
        return parsed;
      }
    }
    return {};
  }

  function formatSmsDate(value) {
    var raw = clean(value);
    var zte = raw.match(/^(\d{2})[;,](\d{2})[;,](\d{2})[;,](\d{2})[;,](\d{2})[;,](\d{2})(?:[;,][^;,]+)?$/);
    if (zte) return '20' + zte[1] + '-' + zte[2] + '-' + zte[3] + ' ' + zte[4] + ':' + zte[5];
    var date = new Date(raw);
    if (/[T/:\-]/.test(raw) && !Number.isNaN(date.getTime())) {
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
      return !serviceNumber || item.number.replace(/\D/g, '').slice(-5) === serviceNumber.slice(-5);
    }).sort(function (a, b) {
      return String(b.id).localeCompare(String(a.id), undefined, { numeric: true });
    });
  }

  async function readReplies(manual) {
    var provider = PROVIDERS[state.provider] || PROVIDERS.unknown;
    if (!provider.service) {
      state.replies = [];
      state.parsed = {};
      state.repliesLoaded = true;
      state.repliesBusy = false;
      renderParsed();
      renderReplies();
      if (manual) toast('请先选择运营商', 'red');
      return [];
    }
    state.repliesBusy = true;
    renderParsed();
    try {
      var result = await fetchSmsInfo(0, 300);
      state.replies = normalizeReplies(result, provider.service).slice(0, 20);
      state.parsed = parseReplies(state.replies);
      state.repliesLoaded = true;
      renderParsed();
      renderReplies();
      if (hasParsedCarrierData(state.parsed)) {
        setStatus('已读取 ' + provider.service + ' 最近官方回执' + (state.parsed.status ? '：' + state.parsed.status : ''), 'success');
      } else if (state.replies.length) {
        setStatus('已读取官方回执，但暂未识别其中的查询结果', 'error');
      } else {
        setStatus('暂无 ' + provider.service + ' 官方短信回执', 'idle');
      }
      if (manual) toast('已刷新 ' + provider.service + ' 短信回复', 'green');
      return state.replies;
    } catch (error) {
      if (error.code === 'AUTH_REQUIRED') showNativeLogin();
      setStatus(error.message || '短信读取失败', 'error');
      if (manual) toast(error.message || '短信读取失败', 'red');
      return [];
    } finally {
      state.repliesBusy = false;
      renderParsed();
    }
  }

  function normalizeSendResponse(result) {
    var raw = result || {};
    var value = clean(raw.result || raw.Result || raw.status || raw.Status).toLowerCase();
    if (['success', 'ok', 'true', '0', '200', 'processing', 'pending', 'sending', 'accepted'].indexOf(value) !== -1) return true;
    var rawText = '';
    try { rawText = JSON.stringify(raw).toLowerCase(); } catch (e) {}
    return rawText.indexOf('success') !== -1 || rawText.indexOf('accepted') !== -1;
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

  function startReplyPolling(existingIds) {
    stopReplyPolling();
    state.pollDeadline = Date.now() + POLL_TIMEOUT;
    state.pollTimer = setInterval(async function () {
      if (Date.now() >= state.pollDeadline) {
        stopReplyPolling();
        setStatus('暂未收到新回复，可稍后手动刷新', 'idle');
        return;
      }
      var replies = await readReplies(false);
      var fresh = replies.find(function (item) { return item.direction === 'in' && existingIds.indexOf(item.id) === -1; });
      if (fresh) {
        stopReplyPolling();
        setStatus('已收到运营商回复', 'success');
        toast('已收到运营商查询回复', 'green');
      }
    }, POLL_INTERVAL);
  }

  async function sendQuery(commandId) {
    if (state.busy) return;
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

  function setStatus(text, type) {
    var element = document.getElementById('kano-operator-status');
    if (!element) return;
    element.className = 'kano-operator-status ' + (type || 'idle');
    element.textContent = text;
  }

  function renderIdentity() {
    var box = document.getElementById('kano-operator-identity');
    if (!box) return;
    var data = state.snapshot || {};
    var provider = PROVIDERS[state.provider] || PROVIDERS.unknown;
    var signal = firstValue(data, ['signalbar', 'network_signalbar']) || '--';
    var roam = firstValue(data, ['simcard_roam', 'roam_status']) || '--';
    box.innerHTML = [
      ['运营商', provider.name],
      ['SIM 状态', normalizeSimState(firstValue(data, ['simcard_status', 'sim_status', 'sim_state']))],
      ['手机号', maskIdentifier(data.msisdn, 4)],
      ['网络制式', normalizeNetworkType(data.network_type)],
      ['信号', signal === '--' ? '--' : signal + ' / 5'],
      ['连接状态', firstValue(data, ['ppp_status']) || '--'],
      ['漫游', roam],
      ['IMSI', maskIdentifier(data.imsi, 5)],
      ['ICCID', maskIdentifier(data.iccid, 6)],
      ['IMEI', maskIdentifier(data.imei, 5)]
    ].map(function (row) {
      return '<div class="kano-operator-kv"><b>' + escapeHTML(row[0]) + '</b><span title="' + escapeHTML(row[1]) + '">' + escapeHTML(row[1]) + '</span></div>';
    }).join('');
  }

  function renderProviderSelector() {
    var select = document.getElementById('kano-operator-provider');
    if (!select) return;
    var override = getProviderOverride();
    select.value = override || 'auto';
  }

  function renderQueryActions() {
    var box = document.getElementById('kano-operator-query-actions');
    if (!box) return;
    var provider = PROVIDERS[state.provider] || PROVIDERS.unknown;
    if (!provider.commands.length) {
      box.innerHTML = '<div class="kano-operator-empty">' + (state.provider === 'broadcast' ? '中国广电的短信指令存在地区差异，当前仅提供本地识别与状态展示。' : '自动识别未完成，请手动选择运营商。') + '</div>';
      return;
    }
    box.innerHTML = provider.commands.map(function (command) {
      return '<button type="button" class="kano-operator-query-btn" data-operator-query="' + command.id + '"' + (state.busy ? ' disabled' : '') + '><span>' + escapeHTML(command.label) + '</span><small>' + escapeHTML(provider.service + ' / ' + command.code) + '</small></button>';
    }).join('');
    Array.prototype.slice.call(box.querySelectorAll('[data-operator-query]')).forEach(function (button) {
      button.onclick = function () { sendQuery(button.getAttribute('data-operator-query')); };
    });
  }

  function renderParsed() {
    var box = document.getElementById('kano-operator-parsed');
    if (!box) return;
    var parsed = state.parsed || {};
    var source = document.getElementById('kano-operator-result-source');
    if (source) {
      if (state.repliesBusy) source.textContent = '正在读取最近官方回执';
      else if (parsed.queryTime) source.textContent = '官方结果截至 ' + parsed.queryTime;
      else if (parsed.sourceDate) source.textContent = '最近回执 ' + parsed.sourceDate;
      else if (state.repliesLoaded && state.replies.length) source.textContent = '已读取回执，暂未识别结果';
      else if (state.repliesLoaded) source.textContent = '暂无官方回执';
      else source.textContent = '等待读取官方回执';
    }
    var dataDetail = [];
    if (parsed.dataUsed) dataDetail.push('已用 ' + parsed.dataUsed);
    if (parsed.dataTotal) dataDetail.push('总量 ' + parsed.dataTotal);
    if (parsed.status) dataDetail.push(parsed.status);
    var items = [
      { label: '话费余额', value: parsed.balance, detail: '运营商回执' },
      { label: '剩余流量', value: parsed.dataRemaining, detail: dataDetail.join(' · ') || '运营商回执' },
      { label: '语音余量', value: parsed.voiceRemaining, detail: '套餐内分钟数' },
      { label: '短信余量', value: parsed.smsRemaining, detail: '套餐内短信数' },
      { label: '当前套餐', value: parsed.planName, detail: '以运营商回执为准' },
      { label: '有效期', value: parsed.expiry, detail: '以运营商回执为准' }
    ];
    box.innerHTML = items.map(function (item) {
      var available = clean(item.value);
      var fallback = hasParsedCarrierData(parsed) ? '本条未提供' : (state.repliesLoaded && state.replies.length ? '未识别' : '--');
      return '<div class="kano-operator-result' + (available ? ' available' : '') + '"><span>' + escapeHTML(item.label) + '</span><b title="' + escapeHTML(available || fallback) + '">' + escapeHTML(available || fallback) + '</b><small>' + escapeHTML(item.detail) + '</small></div>';
    }).join('');
  }

  function renderReplies() {
    var box = document.getElementById('kano-operator-replies');
    if (!box) return;
    if (!state.replies.length) {
      box.innerHTML = '<div class="kano-operator-empty">暂无该服务号码的短信回复</div>';
      return;
    }
    box.innerHTML = state.replies.map(function (reply) {
      var directionText = reply.direction === 'out' ? (reply.tag === '3' ? '发送失败' : '已发送') : '运营商回复';
      return '<article class="kano-operator-reply ' + reply.direction + '"><div class="kano-operator-reply-head"><div><b>' + escapeHTML(reply.number || '--') + '</b><em>' + escapeHTML(directionText) + '</em></div><span>' + escapeHTML(reply.date || '') + '</span></div><div class="kano-operator-reply-body">' + escapeHTML(reply.content || '--') + '</div></article>';
    }).join('');
  }

  function updateHeader() {
    var provider = PROVIDERS[state.provider] || PROVIDERS.unknown;
    var badge = document.getElementById('kano-operator-badge');
    var title = document.getElementById('kano-operator-title');
    if (badge) {
      badge.className = 'kano-operator-badge ' + provider.className;
      badge.textContent = provider.shortName;
    }
    if (title) title.textContent = provider.name;
  }

  function renderAll() {
    updateHeader();
    renderProviderSelector();
    renderIdentity();
    renderParsed();
    renderQueryActions();
    renderReplies();
  }

  async function refresh(manual) {
    if (state.busy) return state.snapshot;
    state.busy = true;
    renderQueryActions();
    setStatus('正在读取 SIM 与网络信息', 'loading');
    try {
      state.snapshot = await readSnapshot();
      var override = getProviderOverride();
      state.provider = override || detectOperator(state.snapshot);
      renderAll();
      setStatus('状态已刷新', 'success');
      await readReplies(false);
      if (manual) toast('运营商信息已刷新', 'green');
      return state.snapshot;
    } catch (error) {
      if (error.code === 'AUTH_REQUIRED') showNativeLogin();
      setStatus(error.message || '状态读取失败', 'error');
      if (manual) toast(error.message || '状态读取失败', 'red');
      throw error;
    } finally {
      state.busy = false;
      renderQueryActions();
    }
  }

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = '' +
      '#' + MODAL_ID + '{--ko-bg:#0f141c;--ko-panel:#171e28;--ko-panel-2:#1d2632;--ko-border:rgba(255,255,255,.10);--ko-text:#f2f5f8;--ko-muted:rgba(255,255,255,.55);--ko-accent:#63a4ff;position:fixed!important;inset:0!important;z-index:999999!important;display:none;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,.62);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);font-family:Inter,system-ui,-apple-system,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}' +
      '#' + MODAL_ID + '.show{display:flex!important}#' + MODAL_ID + ' *{box-sizing:border-box}' +
      '#' + MODAL_ID + ' .kano-operator-panel{width:min(1040px,96vw);height:min(760px,92vh);display:flex;flex-direction:column;overflow:hidden;border:1px solid rgba(255,255,255,.13);border-radius:18px;background:linear-gradient(180deg,#19212c,#0e131b);box-shadow:0 34px 100px rgba(0,0,0,.58);color:var(--ko-text)}' +
      '#' + MODAL_ID + ' .kano-operator-head{min-height:72px;display:flex;align-items:center;justify-content:space-between;gap:14px;padding:14px 18px;border-bottom:1px solid var(--ko-border)}' +
      '#' + MODAL_ID + ' .kano-operator-head-left{display:flex;align-items:center;gap:12px;min-width:0}' +
      '#' + MODAL_ID + ' .kano-operator-mark{width:42px;height:42px;display:flex;align-items:center;justify-content:center;border-radius:12px;background:rgba(99,164,255,.14);border:1px solid rgba(99,164,255,.22);font-size:20px}' +
      '#' + MODAL_ID + ' .kano-operator-heading{min-width:0}#' + MODAL_ID + ' .kano-operator-heading h2{margin:0;font-size:18px;line-height:1.2;letter-spacing:0}#' + MODAL_ID + ' .kano-operator-heading p{margin:5px 0 0;font-size:11px;color:var(--ko-muted)}' +
      '#' + MODAL_ID + ' .kano-operator-head-actions{display:flex;align-items:center;gap:8px}' +
      '#' + MODAL_ID + ' button,#' + MODAL_ID + ' select{font:inherit}' +
      '#' + MODAL_ID + ' .kano-operator-icon-btn{width:38px;height:38px;display:inline-flex;align-items:center;justify-content:center;border-radius:10px;border:1px solid var(--ko-border);background:rgba(255,255,255,.055);color:var(--ko-text);cursor:pointer;font-size:18px}' +
      '#' + MODAL_ID + ' .kano-operator-icon-btn:hover{background:rgba(255,255,255,.10)}' +
      '#' + MODAL_ID + ' .kano-operator-body{flex:1;min-height:0;display:grid;grid-template-columns:300px minmax(0,1fr);gap:14px;padding:14px}' +
      '#' + MODAL_ID + ' .kano-operator-sidebar,#' + MODAL_ID + ' .kano-operator-main{min-height:0;border:1px solid var(--ko-border);border-radius:12px;background:rgba(255,255,255,.035)}' +
      '#' + MODAL_ID + ' .kano-operator-sidebar{display:flex;flex-direction:column;padding:14px;overflow:auto}' +
      '#' + MODAL_ID + ' .kano-operator-badge{align-self:flex-start;display:inline-flex;align-items:center;min-height:28px;padding:0 10px;border-radius:999px;font-size:12px;font-weight:900;border:1px solid var(--ko-border);background:rgba(255,255,255,.06)}' +
      '#' + MODAL_ID + ' .kano-operator-badge.mobile{color:#b9dcff;border-color:rgba(60,150,255,.35);background:rgba(46,136,255,.13)}#' + MODAL_ID + ' .kano-operator-badge.unicom{color:#ffd1d1;border-color:rgba(255,91,91,.35);background:rgba(255,75,75,.13)}#' + MODAL_ID + ' .kano-operator-badge.telecom{color:#d1e3ff;border-color:rgba(73,125,255,.35);background:rgba(68,118,255,.13)}#' + MODAL_ID + ' .kano-operator-badge.broadcast{color:#d8f6df;border-color:rgba(72,190,104,.35);background:rgba(67,180,96,.13)}' +
      '#' + MODAL_ID + ' .kano-operator-provider-row{margin:12px 0}#' + MODAL_ID + ' .kano-operator-provider-row label{display:block;margin-bottom:6px;font-size:11px;color:var(--ko-muted)}#' + MODAL_ID + ' .kano-operator-provider-row select{width:100%;height:36px;padding:0 10px;border-radius:8px;border:1px solid var(--ko-border);background:#111821;color:var(--ko-text);outline:none}' +
      '#' + MODAL_ID + ' .kano-operator-identity{display:flex;flex-direction:column;border-top:1px solid var(--ko-border)}#' + MODAL_ID + ' .kano-operator-kv{display:grid;grid-template-columns:84px minmax(0,1fr);gap:8px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.06);font-size:11px}#' + MODAL_ID + ' .kano-operator-kv b{color:var(--ko-muted);font-weight:700}#' + MODAL_ID + ' .kano-operator-kv span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--ko-text);text-align:right}' +
      '#' + MODAL_ID + ' .kano-operator-main{display:grid;grid-template-rows:auto auto auto minmax(0,1fr);overflow:hidden}' +
      '#' + MODAL_ID + ' .kano-operator-section{padding:16px;border-bottom:1px solid var(--ko-border)}#' + MODAL_ID + ' .kano-operator-section-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}#' + MODAL_ID + ' .kano-operator-section-head b{font-size:14px}#' + MODAL_ID + ' .kano-operator-section-head span{font-size:11px;color:var(--ko-muted)}' +
      '#' + MODAL_ID + ' .kano-operator-results{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}' +
      '#' + MODAL_ID + ' .kano-operator-result{min-width:0;display:grid;grid-template-rows:auto 24px auto;gap:3px;padding:9px 10px;border:1px solid rgba(255,255,255,.07);border-radius:8px;background:rgba(0,0,0,.13)}#' + MODAL_ID + ' .kano-operator-result.available{border-color:rgba(99,164,255,.20);background:rgba(99,164,255,.07)}#' + MODAL_ID + ' .kano-operator-result span,#' + MODAL_ID + ' .kano-operator-result small{font-size:9px;color:var(--ko-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#' + MODAL_ID + ' .kano-operator-result b{min-width:0;font-size:14px;line-height:24px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '#' + MODAL_ID + ' .kano-operator-query-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}' +
      '#' + MODAL_ID + ' .kano-operator-query-btn{min-height:54px;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:0 14px;border-radius:10px;border:1px solid rgba(99,164,255,.24);background:rgba(99,164,255,.10);color:var(--ko-text);cursor:pointer;text-align:left}#' + MODAL_ID + ' .kano-operator-query-btn:hover{background:rgba(99,164,255,.16)}#' + MODAL_ID + ' .kano-operator-query-btn:disabled{opacity:.45;cursor:not-allowed}#' + MODAL_ID + ' .kano-operator-query-btn span{font-size:13px;font-weight:850}#' + MODAL_ID + ' .kano-operator-query-btn small{font-size:10px;color:var(--ko-muted)}' +
      '#' + MODAL_ID + ' .kano-operator-status{min-height:38px;display:flex;align-items:center;padding:0 12px;border-radius:8px;border:1px solid var(--ko-border);background:rgba(255,255,255,.035);font-size:11px;color:var(--ko-muted)}#' + MODAL_ID + ' .kano-operator-status.success{color:#bceec9;border-color:rgba(57,210,121,.26);background:rgba(57,210,121,.08)}#' + MODAL_ID + ' .kano-operator-status.error{color:#ffd0d3;border-color:rgba(255,95,104,.26);background:rgba(255,95,104,.08)}#' + MODAL_ID + ' .kano-operator-status.loading{color:#cde2ff;border-color:rgba(99,164,255,.28);background:rgba(99,164,255,.08)}' +
      '#' + MODAL_ID + ' .kano-operator-replies-section{min-height:0;display:flex;flex-direction:column;padding:16px}#' + MODAL_ID + ' .kano-operator-replies{flex:1;min-height:0;overflow:auto;display:flex;flex-direction:column;gap:8px}' +
      '#' + MODAL_ID + ' .kano-operator-reply{margin:0;padding:11px 12px;border-radius:9px;border:1px solid rgba(255,255,255,.07);background:rgba(0,0,0,.16)}#' + MODAL_ID + ' .kano-operator-reply.out{opacity:.68}#' + MODAL_ID + ' .kano-operator-reply-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:7px}#' + MODAL_ID + ' .kano-operator-reply-head>div{display:flex;align-items:center;gap:7px;min-width:0}#' + MODAL_ID + ' .kano-operator-reply-head b{font-size:11px;color:#a9ccff}#' + MODAL_ID + ' .kano-operator-reply-head em{padding:2px 5px;border-radius:4px;background:rgba(255,255,255,.06);font-size:9px;font-style:normal;color:var(--ko-muted)}#' + MODAL_ID + ' .kano-operator-reply-head span{font-size:10px;color:var(--ko-muted)}#' + MODAL_ID + ' .kano-operator-reply-body{font-size:12px;line-height:1.65;white-space:pre-wrap;word-break:break-word}' +
      '#' + MODAL_ID + ' .kano-operator-empty{padding:20px 12px;text-align:center;border:1px dashed var(--ko-border);border-radius:9px;color:var(--ko-muted);font-size:12px;line-height:1.6}' +
      '#' + MODAL_ID + ' .kano-operator-footer{min-height:54px;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 14px;border-top:1px solid var(--ko-border);font-size:10px;color:var(--ko-muted)}' +
      '@media(max-width:760px){#' + MODAL_ID + '{padding:8px}#' + MODAL_ID + ' .kano-operator-panel{width:100%;height:96vh;border-radius:12px}#' + MODAL_ID + ' .kano-operator-head{padding:10px 12px}#' + MODAL_ID + ' .kano-operator-body{grid-template-columns:1fr;grid-template-rows:auto auto;padding:8px;gap:8px;overflow:auto}#' + MODAL_ID + ' .kano-operator-sidebar{max-height:none}#' + MODAL_ID + ' .kano-operator-main{display:block;min-height:0;overflow:visible}#' + MODAL_ID + ' .kano-operator-replies-section{min-height:auto}#' + MODAL_ID + ' .kano-operator-replies{overflow:visible}#' + MODAL_ID + ' .kano-operator-results{grid-template-columns:repeat(2,minmax(0,1fr))}#' + MODAL_ID + ' .kano-operator-query-actions{grid-template-columns:1fr}#' + MODAL_ID + ' .kano-operator-footer{align-items:flex-start;flex-direction:column}}' +
      '@media(max-width:420px){#' + MODAL_ID + ' .kano-operator-results{grid-template-columns:1fr}}';
    document.head.appendChild(style);
  }

  function buildModal() {
    var existing = document.getElementById(MODAL_ID);
    if (existing) existing.remove();
    var modal = document.createElement('div');
    modal.id = MODAL_ID;
    modal.innerHTML = '' +
      '<section class="kano-operator-panel" role="dialog" aria-modal="true" aria-labelledby="kano-operator-title">' +
        '<header class="kano-operator-head"><div class="kano-operator-head-left"><div class="kano-operator-mark" aria-hidden="true">◎</div><div class="kano-operator-heading"><h2 id="kano-operator-title">运营商信息</h2><p>SIM 识别与官方短信查询</p></div></div><div class="kano-operator-head-actions"><button type="button" class="kano-operator-icon-btn" data-operator-action="refresh" title="刷新" aria-label="刷新">↻</button><button type="button" class="kano-operator-icon-btn" data-operator-action="close" title="关闭" aria-label="关闭">×</button></div></header>' +
        '<div class="kano-operator-body"><aside class="kano-operator-sidebar"><div id="kano-operator-badge" class="kano-operator-badge unknown">未识别</div><div class="kano-operator-provider-row"><label for="kano-operator-provider">运营商选择</label><select id="kano-operator-provider"><option value="auto">自动识别</option><option value="mobile">中国移动</option><option value="unicom">中国联通</option><option value="telecom">中国电信</option><option value="broadcast">中国广电</option></select></div><div id="kano-operator-identity" class="kano-operator-identity"></div></aside>' +
        '<main class="kano-operator-main"><section class="kano-operator-section"><div class="kano-operator-section-head"><b>官方查询结果</b><span id="kano-operator-result-source">等待读取官方回执</span></div><div id="kano-operator-parsed" class="kano-operator-results"></div></section><section class="kano-operator-section"><div class="kano-operator-section-head"><b>官方短信查询</b><span>发送前需要确认</span></div><div id="kano-operator-query-actions" class="kano-operator-query-actions"></div></section><section class="kano-operator-section"><div id="kano-operator-status" class="kano-operator-status idle">等待刷新</div></section><section class="kano-operator-replies-section"><div class="kano-operator-section-head"><b>查询回复</b><button type="button" class="kano-operator-icon-btn" data-operator-action="replies" title="刷新回复" aria-label="刷新回复">↻</button></div><div id="kano-operator-replies" class="kano-operator-replies"></div></section></main></div>' +
        '<footer class="kano-operator-footer"><span>查询指令由运营商服务号码处理，不上传 SIM 信息。</span><span>v' + escapeHTML(VERSION) + '</span></footer>' +
      '</section>';
    modal.addEventListener('click', function (event) { if (event.target === modal) close(); });
    document.body.appendChild(modal);

    modal.querySelector('[data-operator-action="close"]').onclick = close;
    modal.querySelector('[data-operator-action="refresh"]').onclick = function () { refresh(true).catch(function () {}); };
    modal.querySelector('[data-operator-action="replies"]').onclick = function () { readReplies(true); };
    modal.querySelector('#kano-operator-provider').onchange = function (event) {
      var value = event.target.value;
      setProviderOverride(value);
      state.provider = value === 'auto' ? detectOperator(state.snapshot) : value;
      state.replies = [];
      state.parsed = {};
      renderAll();
      readReplies(false);
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
    modal.classList.add('show');
    if (!state.escHandler) {
      state.escHandler = function (event) { if (event.key === 'Escape') close(); };
      document.addEventListener('keydown', state.escHandler);
    }
    if (!state.repliesLoaded) state.repliesBusy = true;
    renderAll();
    try { await refresh(false); } catch (e) {}
  }

  function close() {
    var modal = document.getElementById(MODAL_ID);
    if (modal) modal.classList.remove('show');
    if (state.escHandler) {
      document.removeEventListener('keydown', state.escHandler);
      state.escHandler = null;
    }
  }

  function destroy() {
    stopReplyPolling();
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
    detectOperator: detectOperator,
    parseCarrierSms: parseCarrierSms,
    getSnapshot: function () { return Object.assign({}, state.snapshot); },
    getParsed: function () { return Object.assign({}, state.parsed); },
    destroy: destroy
  };
  window.KanoOperatorInfo = api;
  window.KanoCarrierInfo = api;
  syncWebOSCard();
  setTimeout(syncWebOSCard, 900);
  document.dispatchEvent(new CustomEvent('kano:operator-info-ready', { detail: { version: VERSION } }));
}());
//</script>
