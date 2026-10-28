//<script>
(async () => {
  'use strict';

  const TITLE = '电话与短信';
  const VERSION = '1.4.0-communications';
  const MODAL_NAME = 'kn_phone_sms_modal';
  const STYLE_ID = 'kn_phone_sms_style';
  const MAIN_BTN_ID = 'kn_phone_sms_main_btn';

  let statusTimer = null;
  let smsTimer = null;
  let statusBusy = false;
  let callSession = null;
  let escHandler = null;

  let smsCache = [];
  let smsThreads = [];
  let activeSmsThreadKey = '';
  let smsSearchKeyword = '';
  let smsReadBusy = false;
  let smsSendBusy = false;
  let smsNewMode = false;
  let composerKey = 'new';
  let modalOpener = null;
  let phoneBusy = false;
  let currentCalls = [];
  let statusKnown = false;
  let sendingDraftKey = '';
  const smsDrafts = new Map();
  const smsNotices = new Map();

  // ==============================
  // 1. 基础工具
  // ==============================
  const toast = (msg, type = 'pink') => {
    if (typeof createToast === 'function') createToast(msg, type);
    else console.log('[PhoneSMS]', msg);
  };

  const escapeHTML = (text) => {
    return String(text ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const stringifySafe = (obj) => {
    try {
      return JSON.stringify(obj, null, 2);
    } catch (e) {
      return String(obj);
    }
  };

  const pad2 = (n) => String(n).padStart(2, '0');

  const formatTime = (value) => {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '-';
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
  };

  const formatDuration = (start, end = Date.now()) => {
    if (!start) return '-';
    const sec = Math.max(0, Math.floor((end - Number(start)) / 1000));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
    return `${pad2(m)}:${pad2(s)}`;
  };

  const sanitizeNumber = (value) => {
    return String(value || '')
      .trim()
      .replace(/\s+/g, '')
      .replace(/[()（）-]/g, '');
  };

  const normalizeSmsSendNumber = (value) => {
    let n = sanitizeNumber(value);

    if (/^\+86(1\d{10})$/.test(n)) {
      n = n.replace(/^\+86/, '');
    } else if (/^86(1\d{10})$/.test(n)) {
      n = n.replace(/^86/, '');
    }

    if (/^\+\d+$/.test(n)) {
      n = n.slice(1);
    }

    return n;
  };

  const isValidDialNumber = (value) => {
    const n = sanitizeNumber(value);
    return /^\+?[0-9*#]{1,32}$/.test(n);
  };

  const getATSlot = () => {
    const atSlotValue = document.querySelector('#AT_SLOT')?.value?.trim();
    return /^\d+$/.test(atSlotValue || '') ? atSlotValue : '0';
  };

  const getBaseURL = () => {
    try {
      if (typeof KANO_baseURL !== 'undefined' && KANO_baseURL) return KANO_baseURL;
    } catch (e) {}
    return '/api';
  };

  const getCommonHeaders = () => {
    try {
      if (typeof common_headers !== 'undefined' && common_headers) return { ...common_headers };
    } catch (e) {}
    return {};
  };

  const executeATCommand = async (command, slot = null) => {
    const targetSlot = slot == null ? getATSlot() : slot;

    try {
      const commandEnc = encodeURIComponent(command);
      const res = await (
        await fetch(`${getBaseURL()}/AT?command=${commandEnc}&slot=${targetSlot}`, {
          headers: getCommonHeaders(),
        })
      ).json();

      return res;
    } catch (e) {
      return null;
    }
  };

  const execAT = async (command) => {
    if (!command) return { ok: false, data: null, raw: null };

    try {
      const res = await executeATCommand(command);
      if (!res || res.error) return { ok: false, data: null, raw: res };

      return {
        ok: true,
        data: res.result,
        raw: res,
      };
    } catch (e) {
      return { ok: false, data: null, raw: null };
    }
  };

  // ==============================
  // 2. 通信面板样式
  // ==============================
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
  const icon = (name) => {
    const paths = {"phone":"<path d=\"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z\" />","phone-incoming":"<polyline points=\"16 2 16 8 22 8\" /><line x1=\"22\" x2=\"16\" y1=\"2\" y2=\"8\" /><path d=\"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z\" />","phone-off":"<path d=\"M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91\" /><line x1=\"22\" x2=\"2\" y1=\"2\" y2=\"22\" />","message-square":"<path d=\"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z\" />","x":"<path d=\"M18 6 6 18\" /><path d=\"m6 6 12 12\" />","delete":"<path d=\"M10 5a2 2 0 0 0-1.344.519l-6.328 5.74a1 1 0 0 0 0 1.481l6.328 5.741A2 2 0 0 0 10 19h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z\" /><path d=\"m12 9 6 6\" /><path d=\"m18 9-6 6\" />","plus":"<path d=\"M5 12h14\" /><path d=\"M12 5v14\" />","trash-2":"<path d=\"M3 6h18\" /><path d=\"M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6\" /><path d=\"M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2\" /><line x1=\"10\" x2=\"10\" y1=\"11\" y2=\"17\" /><line x1=\"14\" x2=\"14\" y1=\"11\" y2=\"17\" />","refresh-cw":"<path d=\"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8\" /><path d=\"M21 3v5h-5\" /><path d=\"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16\" /><path d=\"M8 16H3v5\" />","clipboard-paste":"<path d=\"M15 2H9a1 1 0 0 0-1 1v2c0 .6.4 1 1 1h6c.6 0 1-.4 1-1V3c0-.6-.4-1-1-1Z\" /><path d=\"M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2M16 4h2a2 2 0 0 1 2 2v2M11 14h10\" /><path d=\"m17 10 4 4-4 4\" />","rotate-ccw":"<path d=\"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8\" /><path d=\"M3 3v5h5\" />","send":"<path d=\"M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z\" /><path d=\"m21.854 2.147-10.94 10.939\" />","arrow-left":"<path d=\"m12 19-7-7 7-7\" /><path d=\"M19 12H5\" />","reply":"<polyline points=\"9 17 4 12 9 7\" /><path d=\"M20 18v-2a4 4 0 0 0-4-4H4\" />","copy":"<rect width=\"14\" height=\"14\" x=\"8\" y=\"8\" rx=\"2\" ry=\"2\" /><path d=\"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2\" />","square-pen":"<path d=\"M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7\" /><path d=\"M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z\" />"};
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths['message-square']}</svg>`;
  };

  const iconButton = (name, label, id = '', extra = '') =>
    `<button type="button" class="ps-icon-btn" ${id ? `id="${id}"` : ''} title="${escapeHTML(label)}" aria-label="${escapeHTML(label)}" ${extra}>${icon(name)}</button>`;

  const setNotice = (id, text, tone = '') => {
    const el = document.getElementById(id);
    if (el) { el.textContent = text; el.dataset.tone = tone; }
  };

  const updateComposer = () => {
    const input = document.getElementById('kn_sms_number');
    const text = document.getElementById('kn_sms_text');
    const count = document.getElementById('kn_sms_count');
    const send = document.getElementById('kn_sms_send_btn');
    const length = text?.value.length || 0;
    if (count) { count.textContent = `${length} 字符`; count.dataset.long = String(length > 500); }
    if (send) {
      send.disabled = smsSendBusy || !/^\d{3,20}$/.test(normalizeSmsSendNumber(input?.value)) || !text?.value.trim();
      send.innerHTML = icon('send') + `<span>${smsSendBusy ? '发送中' : '发送'}</span>`;
    }
    const sendingThis = smsSendBusy && composerKey === sendingDraftKey;
    if (input) input.disabled = sendingThis;
    if (text) text.disabled = sendingThis;
    ['kn_sms_clear_btn', 'kn_sms_paste_btn'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.disabled = sendingThis;
    });
  };

  const saveSmsDraft = () => {
    const number = document.getElementById('kn_sms_number');
    const text = document.getElementById('kn_sms_text');
    if (number && text) smsDrafts.set(composerKey, { number: number.value, content: text.value });
  };

  const restoreSmsDraft = (key, number = '') => {
    composerKey = key;
    const draft = smsDrafts.get(key);
    const numberInput = document.getElementById('kn_sms_number');
    const textInput = document.getElementById('kn_sms_text');
    if (numberInput) numberInput.value = draft ? draft.number : normalizeSmsSendNumber(number);
    if (textInput) textInput.value = draft?.content || '';
    updateComposer();
    const notice = smsNotices.get(key);
    setNotice('kn_sms_send_status', notice?.text || '', notice?.tone || '');
  };

  const setSmsNotice = (key, text, tone = '') => {
    smsNotices.set(key, { text, tone });
    if (composerKey === key) setNotice('kn_sms_send_status', text, tone);
  };

  const setSmsMobilePane = (pane) => {
    const shell = document.querySelector(`#${MODAL_NAME} .sms-shell`);
    if (shell) shell.dataset.mobilePane = pane;
  };

  const newSms = () => {
    saveSmsDraft();
    smsNewMode = true;
    activeSmsThreadKey = '';
    restoreSmsDraft('new');
    renderSmsViewer();
    setSmsMobilePane('chat');
    document.getElementById('kn_sms_number')?.focus();
  };

  const ensureStyle = () => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    const s = `#${MODAL_NAME}`;
    style.textContent = `
      ${s}{--kn-panel:rgba(25,28,33,.97);--kn-field:rgba(255,255,255,.045);--kn-border:rgba(255,255,255,.11);--kn-text:#eef0f3;--kn-muted:#9ca4af;--kn-blue:#8bb8ff;--kn-green:#74d2a3;--kn-red:#ff959e;position:fixed!important;inset:0!important;z-index:999999!important;display:none;align-items:center;justify-content:center;padding:20px!important;background:rgba(0,0,0,.44)!important;backdrop-filter:blur(8px);font-family:system-ui,-apple-system,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;color:var(--kn-text);font-size:13px;line-height:1.5;text-align:left}
      .kn-theme-light ${s}{--kn-panel:rgba(250,252,254,.98);--kn-field:rgba(30,38,48,.035);--kn-border:rgba(30,38,48,.13);--kn-text:#242a32;--kn-muted:#67717e;--kn-blue:#235eb2;--kn-green:#1c784d;--kn-red:#b52b39}
      ${s}.show{display:flex!important}
      ${s}{font-weight:400}
      ${s} *,${s} *::before,${s} *::after{box-sizing:border-box;letter-spacing:0;text-shadow:none!important}
      ${s} button,${s} input,${s} textarea{font:inherit;color:inherit;box-shadow:none!important;margin:0;min-width:0}
      ${s} button{cursor:pointer;background:transparent!important;color:inherit!important;border:0;border-color:var(--kn-border)!important;border-radius:6px!important;transform:none!important;transition:background .12s,color .12s}
      ${s} button:disabled{cursor:default;opacity:.45}
      ${s} :focus-visible{outline:2px solid var(--kn-blue);outline-offset:2px}
      ${s} svg{display:block;flex:0 0 auto;width:17px;height:17px;pointer-events:none}
      ${s} .ps-modal-panel{display:flex;flex-direction:column;width:min(1080px,100%);height:min(680px,calc(100dvh - 40px));min-height:0;max-height:calc(100dvh - 40px);overflow:hidden;border:1px solid var(--kn-border);border-radius:8px;background:var(--kn-panel);box-shadow:0 18px 70px rgba(0,0,0,.35)}
      ${s} .ps-modal-header{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:57px;padding:10px 18px;border-bottom:1px solid var(--kn-border);flex:0 0 auto}
      ${s} .ps-modal-heading{display:flex;align-items:center;gap:10px;min-width:0}
      ${s} .ps-modal-title{margin:0;font-size:17px;font-weight:650;line-height:1.4}
      ${s} .ps-modal-subtitle{font-size:11px;color:var(--kn-muted);white-space:nowrap}
      ${s} .ps-tabs{display:flex;align-items:stretch;gap:22px;min-height:44px;padding:0 18px;border-bottom:1px solid var(--kn-border);flex:0 0 auto}
      ${s} .ps-tab{display:flex;align-items:center;justify-content:center;gap:7px;padding:10px 2px;border-radius:0!important;border-bottom:2px solid transparent;border-color:transparent!important;color:var(--kn-muted)!important;font-size:13px;font-weight:600}
      ${s} .ps-tab.active{color:var(--kn-text)!important;border-bottom-color:var(--kn-green)!important}
      ${s} .ps-modal-body{flex:1;min-height:0;overflow:hidden}
      ${s} .ps-page{display:none;height:100%;min-height:0}
      ${s} .ps-page.active{display:block}
      ${s} .ps-page.active,${s} .ps-tab.active{background:transparent!important}
      ${s} .ps-page[data-page="phone"]{overflow-y:auto;padding:20px}
      ${s} .phone-shell{display:grid;grid-template-columns:minmax(260px,340px) minmax(0,1fr);gap:30px;min-width:0}
      ${s} .ps-card{min-width:0;background:none;border:0;border-radius:0;box-shadow:none;padding:0}
      ${s} .ps-title{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px;min-height:24px}
      ${s} .ps-title strong{font-size:13px;font-weight:600}
      ${s} .ps-chip{font-size:11px;color:var(--kn-muted);white-space:nowrap}
      ${s} .phone-input,${s} .sms-input,${s} .sms-textarea{width:100%;border:1px solid var(--kn-border);border-radius:6px;background:var(--kn-field);padding:8px 10px;outline:none;line-height:1.5}
      ${s} .phone-input:focus,${s} .sms-input:focus,${s} .sms-textarea:focus{border-color:var(--kn-blue)}
      ${s} input::placeholder,${s} textarea::placeholder{color:var(--kn-muted);opacity:.7}
      ${s} .phone-input{height:48px;text-align:center;font-size:23px;font-weight:500;font-variant-numeric:tabular-nums}
      ${s} .phone-keypad{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-top:10px}
      ${s} .phone-key{height:42px;display:flex;align-items:center;justify-content:center;border:1px solid var(--kn-border);border-radius:6px;background:var(--kn-field)!important;font-size:21px;font-weight:500;line-height:1}
      ${s} .phone-key:hover,${s} .ps-btn:hover,${s} .ps-icon-btn:hover{background:var(--kn-field)!important}
      ${s} .phone-secondary-actions,${s} .phone-actions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-top:10px}
      ${s} .phone-secondary-actions .ps-icon-btn{width:100%}
      ${s} .ps-btn,${s} .ps-icon-btn,${s} .phone-action-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:34px;padding:6px 10px;border:1px solid var(--kn-border);border-radius:6px;font-size:12px;line-height:1.3;white-space:nowrap}
      ${s} .ps-icon-btn{width:34px;height:34px;padding:7px;flex:0 0 34px}
      ${s} .phone-action-btn{height:40px}
      ${s} .phone-action-btn.dial,${s} .ps-btn.send{background:var(--kn-green)!important;border-color:transparent!important;color:#10291e!important;font-weight:650}
      .kn-theme-light ${s} .phone-action-btn.dial,.kn-theme-light ${s} .ps-btn.send{color:#fff!important}
      ${s} .phone-action-btn.answer{color:var(--kn-blue)!important}
      ${s} .phone-action-btn.hangup,${s} .danger{color:var(--kn-red)!important}
      ${s} .phone-status-card{border-left:1px solid var(--kn-border);padding-left:26px}
      ${s} .phone-status-grid{display:grid;grid-template-columns:80px minmax(0,1fr);gap:0;font-size:13px}
      ${s} .phone-status-grid b,${s} .phone-status-grid span{padding:11px 0;border-bottom:1px solid var(--kn-border);font-weight:400;overflow-wrap:anywhere}
      ${s} .phone-status-grid b{color:var(--kn-muted)}
      ${s} .phone-raw{white-space:pre-wrap;overflow-wrap:anywhere;color:var(--kn-muted);font:11px/1.6 ui-monospace,monospace;margin-top:12px;max-height:100px;overflow:auto}
      ${s} .ps-status{min-height:22px;margin:8px 0 0;color:var(--kn-muted);font-size:11px;overflow-wrap:anywhere}
      ${s} .ps-status[data-tone="error"]{color:var(--kn-red)}
      ${s} .ps-status[data-tone="success"]{color:var(--kn-green)}
      ${s} .sms-shell{display:grid;grid-template-columns:250px minmax(0,1fr);height:100%;min-height:0}
      ${s} .sms-sidebar{display:flex;flex-direction:column;min-height:0;border-right:1px solid var(--kn-border)}
      ${s} .sms-sidebar .ps-title{padding:12px 14px 0;margin-bottom:8px}
      ${s} .sms-toolbar{display:flex;gap:6px}
      ${s} .sms-search-row{padding:0 12px 12px}
      ${s} .sms-input{height:36px;font-size:12px}
      ${s} .sms-thread-list{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:0 6px 6px}
      ${s} .sms-thread-item{display:flex;width:100%;align-items:center;justify-content:space-between;gap:8px;padding:12px 9px;border-radius:6px;border:1px solid transparent;text-align:left;margin:1px 0}
      ${s} .sms-thread-item:hover{background:var(--kn-field)}
      ${s} .sms-thread-item.active{background:var(--kn-field)!important;border-color:var(--kn-border)}
      ${s} .sms-thread-copy{min-width:0;flex:1}
      ${s} .sms-thread-number{font-size:13px;font-weight:600;overflow-wrap:anywhere}
      ${s} .sms-thread-preview{font-size:11px;color:var(--kn-muted);white-space:nowrap;text-overflow:ellipsis;overflow:hidden;margin-top:3px}
      ${s} .sms-thread-meta{display:flex;align-items:flex-end;flex-direction:column;gap:5px;flex:0 0 auto}
      ${s} .sms-thread-time{font-size:10px;color:var(--kn-muted)}
      ${s} .sms-unread-badge{min-width:17px;height:17px;padding:0 4px;border-radius:8px;background:var(--kn-green);color:#10291e;text-align:center;font-size:10px;line-height:17px;font-weight:600}
      ${s} .sms-chat-card{display:flex;flex-direction:column;min-height:0;overflow:hidden}
      ${s} .sms-chat-header{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px 16px;min-height:65px;border-bottom:1px solid var(--kn-border);flex:0 0 auto}
      ${s} .sms-chat-title{min-width:0;flex:1}
      ${s} .sms-chat-number{font-size:14px;font-weight:600;overflow-wrap:anywhere}
      ${s} .sms-chat-subtitle{font-size:11px;color:var(--kn-muted);margin-top:2px}
      ${s} .sms-back{display:none}
      ${s} .sms-chat-body{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:16px;scrollbar-gutter:stable}
      ${s} .sms-msg-row{display:flex;margin:0 0 14px}
      ${s} .sms-msg-row.out{justify-content:flex-end}
      ${s} .sms-bubble{max-width:88%;padding:10px 12px;border:1px solid var(--kn-border);border-radius:8px;background:var(--kn-field);min-width:100px}
      ${s} .sms-msg-row.out .sms-bubble{border-left:2px solid var(--kn-green)}
      ${s} .sms-msg-row.fail .sms-bubble{border-color:var(--kn-red)}
      ${s} .sms-bubble-text{white-space:pre-wrap;overflow-wrap:anywhere;font-size:13px;line-height:1.7}
      ${s} .sms-bubble-meta{display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px;margin-top:7px;color:var(--kn-muted);font-size:10px}
      ${s} .sms-bubble-actions{display:flex;justify-content:flex-end;gap:4px;margin-top:5px}
      ${s} .sms-bubble-actions .ps-icon-btn{width:28px;height:28px;min-height:28px;flex-basis:28px;padding:5px;border:0;color:var(--kn-muted)!important}
      ${s} .sms-bubble-actions .danger{color:var(--kn-red)!important}
      ${s} .sms-composer{padding:12px 16px;border-top:1px solid var(--kn-border);flex:0 0 auto}
      ${s} .sms-recipient{display:flex;align-items:center;gap:10px;margin-bottom:8px;color:var(--kn-muted);font-size:12px}
      ${s} .sms-recipient .sms-input{flex:1}
      ${s} .sms-compose-grid{display:grid;grid-template-columns:minmax(0,1fr) 72px;align-items:stretch;gap:8px}
      ${s} .sms-compose-textarea{resize:vertical;min-height:64px;max-height:130px;font-size:13px}
      ${s} .sms-compose-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:6px}
      ${s} .sms-actions{display:flex;gap:4px;flex:0 0 auto}
      ${s} .sms-compose-count{font-size:11px;color:var(--kn-muted);white-space:nowrap;font-variant-numeric:tabular-nums}
      ${s} .sms-compose-count[data-long="true"]{color:var(--kn-red)}
      ${s} .ps-empty,${s} .sms-empty-chat{display:flex;align-items:center;justify-content:center;flex-direction:column;gap:8px;min-height:120px;padding:20px;color:var(--kn-muted);font-size:12px;text-align:center}
      ${s} .sms-empty-chat{height:100%}
      @media(max-width:700px){${s}{padding:10px!important}${s} .ps-modal-panel{height:calc(100dvh - 20px);max-height:calc(100dvh - 20px)}${s} .ps-modal-header{padding:10px 14px}${s} .ps-modal-subtitle{display:none}${s} .sms-shell{grid-template-columns:minmax(0,1fr)}${s} .sms-shell[data-mobile-pane="list"] .sms-chat-card{display:none}${s} .sms-shell[data-mobile-pane="chat"] .sms-sidebar{display:none}${s} .sms-sidebar{border-right:0}${s} .sms-back{display:inline-flex}${s} .sms-chat-header{padding:10px 12px}${s} .sms-chat-body{padding:12px}${s} .sms-composer{padding:10px 12px}${s} .sms-bubble{max-width:94%}}
      @media(max-width:560px){${s} .ps-page[data-page="phone"]{padding:14px}${s} .phone-shell{grid-template-columns:minmax(0,1fr);gap:20px}${s} .phone-status-card{padding:16px 0 0;border-left:0;border-top:1px solid var(--kn-border)}${s} .phone-key{height:36px}${s} .phone-input{height:44px;font-size:22px}${s} .phone-secondary-actions,${s} .phone-actions{margin-top:7px}${s} .ps-modal-title{font-size:16px}${s} .ps-tabs{min-height:40px}${s} .phone-status-grid b,${s} .phone-status-grid span{padding:8px 0}}
      @media(prefers-reduced-motion:reduce){${s} *{transition:none!important;scroll-behavior:auto!important}}
    `;
    document.head.appendChild(style);
  };

  // ==============================
  // 3. Tab 切换
  // ==============================
  const switchTab = (tab) => {
    document.querySelectorAll(`#${MODAL_NAME} .ps-tab`).forEach((btn) => {
      const active = btn.dataset.tab === tab;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', String(active));
      btn.tabIndex = active ? 0 : -1;
    });

    document.querySelectorAll(`#${MODAL_NAME} .ps-page`).forEach((page) => {
      page.classList.toggle('active', page.dataset.page === tab);
    });

    if (tab === 'sms') {
      stopStatusTimer();
      renderSmsViewer();
      readSmsList(false);
      if (smsTimer) clearInterval(smsTimer);
      smsTimer = setInterval(() => { if (!document.hidden && !smsSendBusy) readSmsList(false); }, 15000);
    } else {
      if (smsTimer) { clearInterval(smsTimer); smsTimer = null; }
      refreshStatus(false);
      startStatusTimer();
    }
  };

  // ==============================
  // 4. 当前通话状态
  // ==============================
  const clccStatusMap = {
    0: '通话中',
    1: '保持中',
    2: '正在拨号',
    3: '对方振铃',
    4: '来电中',
    5: '等待中',
  };

  const clccDirMap = {
    0: '呼出',
    1: '呼入',
  };

  const parseCLCCCalls = (raw) => {
    const text = String(raw || '').trim();
    const lines = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    const calls = [];

    lines.forEach((line) => {
      const match = line.match(/\+CLCC:\s*(\d+),(\d+),(\d+),(\d+),(\d+)(?:,\"([^\"]*)\",(\d+))?/);
      if (!match) return;

      calls.push({
        index: match[1],
        dir: Number(match[2]),
        status: Number(match[3]),
        mode: Number(match[4]),
        mpty: Number(match[5]),
        number: match[6] || '',
        raw: line,
      });
    });

    return calls;
  };

  const updateSessionFromCalls = (calls) => {
    const now = Date.now();

    if (!calls.length) {
      if (callSession && !callSession.endedAt) {
        callSession.endedAt = now;
      }
      return null;
    }

    const call = calls[0];
    const number = call.number || callSession?.number || '';

    if (
      !callSession ||
      callSession.endedAt ||
      (number && callSession.number && number !== callSession.number)
    ) {
      callSession = {
        id: `${now}_${Math.random().toString(16).slice(2)}`,
        number,
        direction: call.dir === 1 ? 'incoming' : 'outgoing',
        firstDetectedAt: now,
        dialAt: call.dir === 0 ? now : null,
        incomingAt: call.dir === 1 ? now : null,
        connectedAt: null,
        endedAt: null,
        lastStatus: call.status,
      };
    }

    if (number && !callSession.number) callSession.number = number;
    callSession.lastStatus = call.status;

    if (call.status === 0 && !callSession.connectedAt) {
      callSession.connectedAt = now;
    }

    return call;
  };

  const renderCurrentStatus = (calls, raw) => {
    const panel = document.querySelector('#kn_phone_status');
    if (!panel) return;

    const activeCall = updateSessionFromCalls(calls);
    const now = Date.now();

    if (!activeCall) {
      if (callSession && callSession.endedAt) {
        const start = callSession.connectedAt || callSession.dialAt || callSession.incomingAt || callSession.firstDetectedAt;
        panel.innerHTML = `
          <div class="phone-status-grid">
            <b>当前状态</b><span>当前无活动通话</span>
            <b>上次号码</b><span>${escapeHTML(callSession.number || '-')}</span>
            <b>结束时间</b><span>${escapeHTML(formatTime(callSession.endedAt))}</span>
            <b>持续时间</b><span>${escapeHTML(formatDuration(start, callSession.endedAt))}</span>
          </div>
        `;
        return;
      }

      panel.innerHTML = `
        <div class="phone-status-grid">
          <b>当前状态</b><span>当前无活动通话</span>
          <b>号码</b><span>-</span>
          <b>拨出时间</b><span>-</span>
          <b>接通时间</b><span>-</span>
          <b>通话时间</b><span>-</span>
        </div>
      `;
      return;
    }

    const statusText = clccStatusMap[activeCall.status] || `状态 ${activeCall.status}`;
    const directionText = clccDirMap[activeCall.dir] || '未知方向';
    const dialOrIncomingTime = callSession.direction === 'incoming'
      ? callSession.incomingAt
      : callSession.dialAt;

    const durationLabel = callSession.connectedAt
      ? formatDuration(callSession.connectedAt, now)
      : activeCall.status === 2 || activeCall.status === 3
        ? `未接通 · 已等待 ${formatDuration(callSession.firstDetectedAt, now)}`
        : formatDuration(callSession.firstDetectedAt, now);

    panel.innerHTML = `
      <div class="phone-status-grid">
        <b>当前状态</b><span>${escapeHTML(statusText)}</span>
        <b>方向</b><span>${escapeHTML(directionText)}</span>
        <b>号码</b><span>${escapeHTML(callSession.number || activeCall.number || '-')}</span>
        <b>${callSession.direction === 'incoming' ? '来电时间' : '拨出时间'}</b><span>${escapeHTML(formatTime(dialOrIncomingTime || callSession.firstDetectedAt))}</span>
        <b>接通时间</b><span>${escapeHTML(formatTime(callSession.connectedAt))}</span>
        <b>通话时间</b><span>${escapeHTML(durationLabel)}</span>
      </div>
    `;
  };

  const refreshStatus = async (manual = false) => {
    if (statusBusy) return;
    statusBusy = true;

    try {
      const res = await execAT('AT+CLCC');
      const raw = res?.data || '';
      const ok = Boolean(res?.ok && /(?:\bOK\b|\+CLCC:)/i.test(raw) && !/ERROR/i.test(raw));
      if (ok) {
        statusKnown = true;
        currentCalls = parseCLCCCalls(raw);
        renderCurrentStatus(currentCalls, '');
        updatePhoneControls();
        const notice = document.getElementById('kn_phone_action_status');
        if (notice?.dataset.tone === 'error') setNotice('kn_phone_action_status', '');
      } else {
        statusKnown = false;
        setNotice('kn_phone_action_status', '通话状态读取失败，保留上次状态', 'error');
        updatePhoneControls();
      }

      if (manual) {
        if (ok) toast('通话状态已刷新', 'green');
        else toast('通话状态查询失败', 'red');
      }
    } finally {
      statusBusy = false;
    }
  };

  const startStatusTimer = () => {
    stopStatusTimer();
    statusTimer = setInterval(() => {
      refreshStatus(false);
    }, 1200);
  };

  const stopStatusTimer = () => {
    if (statusTimer) {
      clearInterval(statusTimer);
      statusTimer = null;
    }
  };

  // ==============================
  // 5. 电话：拨号 / 挂断 / 接听
  // ==============================
  const updatePhoneControls = () => {
    const root = document.querySelector(`#${MODAL_NAME}`);
    if (!root) return;
    root.querySelectorAll('[data-page="phone"] button, #kn_phone_number').forEach((el) => {
      el.disabled = phoneBusy;
    });
    const number = root.querySelector('#kn_phone_number')?.value;
    root.querySelector('#kn_phone_dial_btn').disabled = phoneBusy || !isValidDialNumber(number) || currentCalls.length > 0;
    root.querySelector('#kn_phone_answer_btn').disabled = phoneBusy || !statusKnown || !currentCalls.some(call => call.status === 4 || call.status === 5);
    root.querySelector('#kn_phone_hangup_btn').disabled = phoneBusy || (statusKnown && !currentCalls.length);
  };

  const setBusy = (busy) => {
    phoneBusy = busy;
    updatePhoneControls();
  };

  const dial = async (numberFromArg = null) => {
    if (phoneBusy || currentCalls.length) return;
    const input = document.querySelector('#kn_phone_number');
    const number = sanitizeNumber(numberFromArg == null ? input?.value : numberFromArg);

    if (!number) {
      toast('请输入号码', 'red');
      return;
    }

    if (!isValidDialNumber(number)) {
      toast('号码格式不正确，仅支持数字、+、*、#', 'red');
      return;
    }

    if (input) input.value = number;

    const now = Date.now();
    callSession = {
      id: `${now}_${Math.random().toString(16).slice(2)}`,
      number,
      direction: 'outgoing',
      firstDetectedAt: now,
      dialAt: now,
      incomingAt: null,
      connectedAt: null,
      endedAt: null,
      lastStatus: 2,
    };

    renderCurrentStatus([{
      index: '0',
      dir: 0,
      status: 2,
      mode: 0,
      mpty: 0,
      number,
      raw: `ATD${number};`,
    }], `ATD${number};`);

    setBusy(true);
    toast(`正在拨打 ${number}`, 'pink');

    try {
      const res = await execAT(`ATD${number};`);
      const ok = Boolean(res?.ok && String(res.data || '').includes('OK'));

      if (!ok) {
        toast('拨号失败', 'red');
        callSession.endedAt = Date.now();
        setNotice('kn_phone_action_status', '拨号失败，请检查 SIM 和语音服务', 'error');
        return;
      }

      toast('拨号指令已发送', 'green');
      setNotice('kn_phone_action_status', '拨号指令已发送', 'success');
      setTimeout(() => refreshStatus(false), 800);
    } finally {
      setBusy(false);
    }
  };

  const hangup = async () => {
    if (phoneBusy) return;
    setBusy(true);
    toast('正在挂断', 'pink');

    try {
      const res = await execAT('ATH');
      const ok = Boolean(res?.ok && String(res.data || '').includes('OK'));

      if (!ok) {
        toast('挂断失败', 'red');
        return;
      }

      if (callSession && !callSession.endedAt) {
        callSession.endedAt = Date.now();
      }

      toast('挂断指令已发送', 'green');
      setTimeout(() => refreshStatus(false), 600);
    } finally {
      setBusy(false);
    }
  };

  const answer = async () => {
    if (phoneBusy) return;
    const now = Date.now();

    if (!callSession) {
      callSession = {
        id: `${now}_${Math.random().toString(16).slice(2)}`,
        number: '',
        direction: 'incoming',
        firstDetectedAt: now,
        dialAt: null,
        incomingAt: now,
        connectedAt: null,
        endedAt: null,
        lastStatus: 4,
      };
    }

    setBusy(true);
    toast('正在接听', 'pink');

    try {
      const res = await execAT('ATA');
      const ok = Boolean(res?.ok && String(res.data || '').includes('OK'));

      if (!ok) {
        toast('接听失败', 'red');
        return;
      }

      toast('接听指令已发送', 'green');
      setTimeout(() => refreshStatus(false), 600);
    } finally {
      setBusy(false);
    }
  };

  const appendDigit = (digit) => {
    const input = document.querySelector('#kn_phone_number');
    if (!input) return;
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? start;
    input.value = (input.value.slice(0, start) + digit + input.value.slice(end)).slice(0, 32);
    input.focus();
    input.setSelectionRange(Math.min(start + digit.length, 32), Math.min(start + digit.length, 32));
    updatePhoneControls();
  };

  const backspace = () => {
    const input = document.querySelector('#kn_phone_number');
    if (!input) return;
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? start;
    const cursor = start === end ? Math.max(0, start - 1) : start;
    input.value = input.value.slice(0, cursor) + input.value.slice(end);
    input.focus();
    input.setSelectionRange(cursor, cursor);
    updatePhoneControls();
  };

  const clearNumber = () => {
    const input = document.querySelector('#kn_phone_number');
    if (!input) return;
    input.value = '';
    input.focus();
    updatePhoneControls();
  };

  const pasteFromClipboardToPhone = async () => {
    try {
      if (!navigator.clipboard || !navigator.clipboard.readText) {
        toast('当前浏览器不支持读取剪贴板', 'red');
        return;
      }

      const text = await navigator.clipboard.readText();
      const number = sanitizeNumber(text);
      const input = document.querySelector('#kn_phone_number');
      if (input) input.value = number.slice(0, 32);
      updatePhoneControls();
    } catch (e) {
      toast('读取剪贴板失败', 'red');
    }
  };

  // ==============================
  // 6. 短信：现代会话模式 + 完整 SEND_SMS 参数
  // ==============================
  const decodeSmsContent = (value) => {
    const raw = String(value || '');
    if (!raw) return '';

    try {
      if (typeof decodeBase64 === 'function') return decodeBase64(raw);
    } catch (e) {}

    try {
      const bin = atob(raw);
      const percent = Array.prototype.map.call(bin, (ch) => {
        return '%' + ('00' + ch.charCodeAt(0).toString(16)).slice(-2);
      }).join('');
      return decodeURIComponent(percent);
    } catch (e) {}

    try {
      return atob(raw);
    } catch (e) {}

    return raw;
  };

  const formatUfiSmsDate = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '-';

    const parts = raw.split(',').filter(Boolean);
    if (parts.length >= 5) {
      const y = parts[0] || '';
      const m = parts[1] || '';
      const d = parts[2] || '';
      const h = parts[3] || '';
      const min = parts[4] || '';
      const s = parts[5] || '';
      return `${y.length === 2 ? '20' + y : y}-${pad2(m)}-${pad2(d)} ${pad2(h)}:${pad2(min)}${s ? ':' + pad2(s) : ''}`;
    }

    return raw;
  };

  const getSmsDateNumber = (value) => {
    const n = Number(String(value || '').replace(/\D/g, ''));
    return Number.isFinite(n) ? n : 0;
  };

  const getSmsTagText = (tag) => {
    const t = String(tag ?? '');
    if (t === '1') return '未读';
    if (t === '0') return '已读';
    if (t === '2') return '已发送';
    if (t === '3') return '发送失败';
    return `状态 ${t || '-'}`;
  };

  const getSmsDirection = (tag) => {
    const t = String(tag ?? '');
    if (t === '2' || t === '3') return 'out';
    return 'in';
  };

  const normalizeSmsNumberKey = (number) => {
    let n = normalizeSmsSendNumber(number);

    if (!n) return 'unknown';

    if (n.startsWith('+86') && n.length === 14) n = n.slice(3);
    else if (n.startsWith('86') && n.length === 13) n = n.slice(2);

    return n || 'unknown';
  };

  const getSmsTimeForZte = () => {
    const d = new Date();

    const yy = String(d.getFullYear()).slice(-2);
    const MM = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');

    const offsetMinutes = -d.getTimezoneOffset();
    const offsetHours = Math.trunc(offsetMinutes / 60);
    const tz = `${offsetHours >= 0 ? '+' : ''}${offsetHours}`;

    return `${yy};${MM};${dd};${hh};${mm};${ss};${tz}`;
  };

  const encodeSmsUnicodeHex = (text) => {
    const s = String(text || '');
    let hex = '';

    for (let i = 0; i < s.length; i += 1) {
      hex += s.charCodeAt(i).toString(16).padStart(4, '0');
    }

    return hex;
  };

  const ensureUfiSmsAuth = async () => {
    const pwd = localStorage.getItem('kano_sms_pwd');
    const token = localStorage.getItem('kano_sms_token');

    if (pwd) {
      try { KANO_PASSWORD = pwd; } catch (e) { window.KANO_PASSWORD = pwd; }
    }

    if (token) {
      try { KANO_TOKEN = token; } catch (e) { window.KANO_TOKEN = token; }

      try {
        if (typeof common_headers !== 'undefined' && common_headers) {
          common_headers.authorization = token;
        }
      } catch (e) {}
    }

    try {
      if (typeof isNeedToken !== 'undefined' && isNeedToken && !token) {
        toast('当前模式需要 Token，请先登录 UFI-TOOLS', 'red');

        try {
          if (typeof showModal === 'function') showModal('#tokenModal');
        } catch (err) {}

        return false;
      }
    } catch (e) {}

    return true;
  };

  const getSmsInfoNative = async (page = 0, pageSize = 500) => {
    if (typeof getSmsInfo === 'function') {
      return await getSmsInfo(page, pageSize);
    }

    const params = new URLSearchParams();
    params.append('multi_data', '1');
    params.append('isTest', 'false');
    params.append('cmd', 'sms_data_total');
    params.append('page', String(page));
    params.append('data_per_page', String(pageSize));
    params.append('mem_store', '1');
    params.append('tags', '100');
    params.append('order_by', 'order by id desc');
    params.append('_', Date.now().toString());

    const res = await fetch(`${getBaseURL()}/goform/goform_get_cmd_process?${params.toString()}`, {
      headers: getCommonHeaders(),
    });

    return await res.json();
  };

  const normalizeSendResult = (res) => {
    const raw = res || {};
    const result = String(raw.result ?? raw.Result ?? raw.status ?? raw.Status ?? '').toLowerCase();
    const message = String(raw.message ?? raw.msg ?? raw.error ?? raw.Error ?? '');

    const successLike = ['success', 'ok', 'true', '0', '200'];
    const pendingLike = ['processing', 'pending', 'sending', 'accepted'];

    if (successLike.includes(result)) {
      return {
        ok: true,
        pending: false,
        message: message || '设备已接收发送请求',
        raw,
      };
    }

    if (pendingLike.includes(result)) {
      return {
        ok: true,
        pending: true,
        message: message || '短信已提交，等待设备发送结果',
        raw,
      };
    }

    const rawText = stringifySafe(raw).toLowerCase();
    if (!result && !message && (
      rawText.includes('"success"') ||
      rawText.includes('send sms success') ||
      rawText.includes('sms success')
    )) {
      return {
        ok: true,
        pending: false,
        message: message || '设备已接收发送请求',
        raw,
      };
    }

    return {
      ok: false,
      pending: false,
      message: message || `SEND_SMS 提交失败：${result || '未知错误'}`,
      raw,
    };
  };

  const checkSmsSendPrerequisites = async () => {
    try {
      const res = await fetch(
        `${getBaseURL()}/goform/goform_get_cmd_process?multi_data=1&isTest=false&cmd=modem_main_state,simcard_roam,sms_unread_num,sms_sim_unread_num,sms_dev_unread_num,network_type,network_provider,ppp_status,signalbar,network_signalbar,smsc&_=${Date.now()}`,
        { headers: getCommonHeaders() }
      );

      const data = await res.json();

      const signal = String(data.signalbar || data.network_signalbar || '');
      const modemState = String(data.modem_main_state || '');
      const smsc = String(data.smsc || '');

      if (modemState && modemState !== 'modem_init_complete') {
        toast(`模组状态异常：${modemState}`, 'red');
      }

      if (signal === '0') {
        toast('当前信号可能较弱，短信可能发送失败', 'red');
      }

      if (!smsc) {
        console.warn('[PhoneSMS] SMSC is empty. Device may still send, but SMSC should be checked if delivery fails.');
      }

      console.log('[PhoneSMS] precheck:', data);
      return data;
    } catch (e) {
      console.warn('[PhoneSMS] precheck failed:', e);
      return null;
    }
  };

  const sendSmsNative = async ({ number, content }) => {
    const finalNumber = normalizeSmsSendNumber(number);

    if (!/^\d{3,20}$/.test(finalNumber)) {
      throw new Error(`号码格式不符合 SEND_SMS 要求：${finalNumber}`);
    }

    if (
      typeof login !== 'function' ||
      typeof postData !== 'function' ||
      typeof logout !== 'function'
    ) {
      throw new Error('当前页面没有暴露 login/postData/logout，无法使用完整 SEND_SMS 参数发送');
    }

    const cookie = await login();

    if (!cookie) {
      throw new Error('登录失败，无法获取 cookie');
    }

    const encodedMessage = typeof gsmEncode === 'function'
      ? gsmEncode(content)
      : encodeSmsUnicodeHex(content);

    const payload = {
      goformId: 'SEND_SMS',
      notCallback: 'true',
      Number: finalNumber,
      sms_time: getSmsTimeForZte(),
      MessageBody: encodedMessage,
      ID: '-1',
      encode_type: 'UNICODE',
      simSlotId: '1',
    };


    try {
      const response = await postData(cookie, payload);
      const json = typeof response?.json === 'function' ? await response.json() : response;

      return {
        source: 'manual-full-SEND_SMS',
        number: finalNumber,
        payload,
        response: json,
      };
    } finally {
      try {
        await logout(cookie);
      } catch (e) {
        console.warn('[PhoneSMS] logout failed:', e);
      }
    }
  };

  const removeSmsNative = async (id) => {
    if (typeof removeSmsById === 'function') {
      return await removeSmsById(id);
    }

    if (
      typeof login !== 'function' ||
      typeof postData !== 'function' ||
      typeof logout !== 'function'
    ) {
      throw new Error('当前页面没有暴露 UFI-TOOLS 原生短信删除函数');
    }

    const cookie = await login();

    const response = await postData(cookie, {
      goformId: 'DELETE_SMS',
      msg_id: id,
      notCallback: true,
    });

    await logout(cookie);

    return await response.json();
  };

  const markSmsReadNative = async (ids) => {
    if (!ids || !ids.length) return null;

    if (typeof readSmsByIds === 'function') {
      return await readSmsByIds(ids);
    }

    return null;
  };

  const normalizeSmsList = (messages) => {
    const arr = Array.isArray(messages) ? messages : [];

    return arr.map((item) => {
      const tag = String(item.tag ?? '');
      const dateRaw = item.date || '';

      return {
        id: item.id,
        number: item.number || '',
        threadKey: normalizeSmsNumberKey(item.number || ''),
        contentRaw: item.content || '',
        content: decodeSmsContent(item.content || ''),
        dateRaw,
        date: formatUfiSmsDate(dateRaw),
        dateNumber: getSmsDateNumber(dateRaw),
        tag,
        tagText: getSmsTagText(tag),
        direction: getSmsDirection(tag),
        raw: item,
      };
    });
  };

  const verifySmsSentByList = async ({ number, content, existingIds = new Set() }) => {
    const targetKey = normalizeSmsNumberKey(normalizeSmsSendNumber(number));
    const contentTrim = String(content || '').trim();

    for (let i = 0; i < 10; i += 1) {
      try {
        await new Promise((resolve) => setTimeout(resolve, i === 0 ? 1600 : 1200));

        const res = await getSmsInfoNative(0, 500);
        const messages = Array.isArray(res?.messages) ? normalizeSmsList(res.messages) : [];

        const hit = messages.find((msg) => {
          return (
            !existingIds.has(String(msg.id)) &&
            normalizeSmsNumberKey(msg.number) === targetKey &&
            String(msg.content || '').trim() === contentTrim &&
            (msg.tag === '2' || msg.tag === '3')
          );
        });

        if (!hit) continue;

        if (hit.tag === '2') {
          return {
            found: true,
            sent: true,
            failed: false,
            message: '设备已写入已发送记录',
            sms: hit,
          };
        }

        if (hit.tag === '3') {
          return {
            found: true,
            sent: false,
            failed: true,
            message: '设备短信列表显示发送失败',
            sms: hit,
          };
        }

        return {
          found: true,
          sent: false,
          failed: false,
          message: `找到短信记录，但状态为：${hit.tagText}`,
          sms: hit,
        };
      } catch (e) {
        console.warn('[PhoneSMS] verify poll failed:', e);
      }
    }

    return {
      found: false,
      sent: false,
      failed: false,
      message: '轮询后仍未在短信列表中找到刚发送的记录',
    };
  };

  const buildSmsThreads = (list) => {
    const map = new Map();

    list.forEach((msg) => {
      const key = msg.threadKey || normalizeSmsNumberKey(msg.number);

      if (!map.has(key)) {
        map.set(key, {
          key,
          number: msg.number || key || '未知号码',
          messages: [],
          unreadCount: 0,
          lastMessage: null,
          lastTime: 0,
        });
      }

      const thread = map.get(key);
      thread.messages.push(msg);

      if (msg.tag === '1') thread.unreadCount += 1;

      if (!thread.lastMessage || msg.dateNumber >= thread.lastTime) {
        thread.lastMessage = msg;
        thread.lastTime = msg.dateNumber;
        if (msg.number) thread.number = msg.number;
      }
    });

    smsThreads = Array.from(map.values()).map((thread) => {
      thread.messages.sort((a, b) => a.dateNumber - b.dateNumber);
      return thread;
    }).sort((a, b) => b.lastTime - a.lastTime);

    if (!smsNewMode && !smsThreads.some((thread) => thread.key === activeSmsThreadKey)) {
      activeSmsThreadKey = smsThreads[0]?.key || '';
    }
  };

  const getFilteredSmsThreads = () => {
    const kw = String(smsSearchKeyword || '').trim().toLowerCase();

    if (!kw) return smsThreads;

    return smsThreads.filter((thread) => {
      const numberHit = String(thread.number || '').toLowerCase().includes(kw);
      const contentHit = thread.messages.some((msg) => {
        return String(msg.content || '').toLowerCase().includes(kw);
      });

      return numberHit || contentHit;
    });
  };

  const renderSmsThreadList = () => {
    const box = document.querySelector('#kn_sms_threads');
    if (!box) return;
    const previousScroll = box.scrollTop;

    const list = getFilteredSmsThreads();

    if (!list.length) {
      box.innerHTML = `<div class="ps-empty">${smsSearchKeyword.trim() ? '没有匹配的会话' : '暂无短信会话'}</div>`;
      return;
    }

    box.innerHTML = list.map((thread) => {
      const last = thread.lastMessage || {};
      const active = thread.key === activeSmsThreadKey ? ' active' : '';
      const unread = thread.unreadCount > 0
        ? `<span class="sms-unread-badge">${thread.unreadCount > 99 ? '99+' : thread.unreadCount}</span>`
        : '';

      const previewPrefix = last.direction === 'out' ? '我：' : '';
      const preview = `${previewPrefix}${last.content || ''}`;

      return `
        <button type="button" class="sms-thread-item${active}" data-thread-key="${escapeHTML(thread.key)}" aria-pressed="${thread.key === activeSmsThreadKey}">
          <span class="sms-thread-copy">
            <div class="sms-thread-number">${escapeHTML(thread.number || '未知号码')}</div>
            <div class="sms-thread-preview">${escapeHTML(preview || '无内容')}</div>
          </span>
          <span class="sms-thread-meta">
            <span class="sms-thread-time" title="${escapeHTML(last.date || '')}">${escapeHTML((last.date || '-').split(' ')[0])}</span>
            ${unread}
          </span>
        </button>
      `;
    }).join('');

    box.querySelectorAll('.sms-thread-item').forEach((item) => {
      item.onclick = () => {
        const key = item.getAttribute('data-thread-key') || '';
        selectSmsThread(key, true);
      };
    });
    box.scrollTop = previousScroll;
  };

  const renderSmsConversation = () => {
    const header = document.querySelector('#kn_sms_chat_header');
    const body = document.querySelector('#kn_sms_chat_body');
    if (!header || !body) return;

    const thread = smsThreads.find((item) => item.key === activeSmsThreadKey);
    const nextKey = thread ? thread.key : 'new';
    if (composerKey !== nextKey) {
      saveSmsDraft();
      restoreSmsDraft(nextKey, thread?.number || '');
    }
    const previousThread = body.dataset.threadKey;
    const oldTop = body.scrollTop;
    const nearBottom = body.scrollHeight - body.clientHeight - oldTop < 64;
    const back = `<button type="button" class="ps-icon-btn sms-back" id="kn_sms_back_btn" title="返回会话列表" aria-label="返回会话列表">${icon('arrow-left')}</button>`;

    if (!thread) {
      header.innerHTML = `
          ${back}<div class="sms-chat-title"><div class="sms-chat-number">新短信</div></div>
      `;
      body.innerHTML = `<div class="sms-empty-chat">${icon('message-square')}<span>新短信</span></div>`;
      body.dataset.threadKey = 'new';
      document.getElementById('kn_sms_back_btn').onclick = () => setSmsMobilePane('list');
      return;
    }

    header.innerHTML = `
      ${back}
      <div class="sms-chat-title">
        <div class="sms-chat-number">${escapeHTML(thread.number || '未知号码')}</div>
        <div class="sms-chat-subtitle">${thread.messages.length} 条短信 · ${thread.unreadCount ? thread.unreadCount + ' 条未读' : '无未读'}</div>
      </div>
      <div class="sms-toolbar">
        ${iconButton('phone', '转到拨号盘', 'kn_sms_call_current')}
        ${iconButton('refresh-cw', '刷新当前会话', 'kn_sms_refresh_current')}
      </div>
    `;

    body.innerHTML = thread.messages.map((msg) => {
      const dirClass = msg.direction === 'out' ? 'out' : 'in';
      const failClass = msg.tag === '3' ? ' fail' : '';

      return `
        <div class="sms-msg-row ${dirClass}${failClass}">
          <div class="sms-bubble">
            <div class="sms-bubble-text">${escapeHTML(msg.content || '')}</div>
            <div class="sms-bubble-meta">
              <span>${escapeHTML(msg.date || '-')}</span>
              <span>${escapeHTML(msg.tagText || '-')}</span>
            </div>
            <div class="sms-bubble-actions">
              ${iconButton('reply', '回复短信', '', `data-action="sms-reply" data-number="${escapeHTML(msg.number || '')}"`)}
              ${iconButton('copy', '复制短信内容', '', `data-action="sms-copy" data-id="${escapeHTML(msg.id)}"`)}
              ${
                msg.tag === '3'
                  ? iconButton('rotate-ccw', '编辑重发', '', `data-action="sms-resend" data-id="${escapeHTML(msg.id)}"`)
                  : ''
              }
              <button type="button" class="ps-icon-btn danger" title="删除短信" aria-label="删除短信" data-action="sms-delete" data-id="${escapeHTML(msg.id)}">${icon('trash-2')}</button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    body.querySelectorAll('[data-action="sms-reply"]').forEach((btn) => {
      btn.onclick = () => {
        const number = btn.getAttribute('data-number') || thread.number || '';
        const input = document.querySelector('#kn_sms_number');
        if (input) input.value = normalizeSmsSendNumber(number);
        const text = document.querySelector('#kn_sms_text');
        if (text) text.focus();
        saveSmsDraft();
        updateComposer();
      };
    });

    body.querySelectorAll('[data-action="sms-resend"]').forEach((btn) => {
      btn.onclick = async () => {
        const id = btn.getAttribute('data-id');
        const msg = smsCache.find((item) => String(item.id) === String(id));
        if (!msg) return;

        const numberInput2 = document.querySelector('#kn_sms_number');
        const textInput = document.querySelector('#kn_sms_text');

        if (numberInput2) numberInput2.value = normalizeSmsSendNumber(msg.number || '');
        if (textInput) textInput.value = msg.content || '';

        saveSmsDraft();
        updateComposer();
        textInput?.focus();
      };
    });

    body.querySelectorAll('[data-action="sms-copy"]').forEach((btn) => {
      btn.onclick = () => {
        const msg = smsCache.find(item => String(item.id) === btn.dataset.id);
        if (msg) copySmsContent(msg.content);
      };
    });

    body.querySelectorAll('[data-action="sms-delete"]').forEach((btn) => {
      btn.onclick = async () => {
        await deleteSms(btn.getAttribute('data-id'));
      };
    });

    const callBtn = document.querySelector('#kn_sms_call_current');
    if (callBtn) {
      callBtn.onclick = async () => {
        switchTab('phone');
        const phoneInput = document.querySelector('#kn_phone_number');
        if (phoneInput) phoneInput.value = sanitizeNumber(thread.number || '');
        updatePhoneControls();
      };
    }

    const refreshBtn = document.querySelector('#kn_sms_refresh_current');
    if (refreshBtn) {
      refreshBtn.onclick = () => readSmsList(true);
    }

    document.getElementById('kn_sms_back_btn').onclick = () => setSmsMobilePane('list');
    body.dataset.threadKey = thread.key;
    body.scrollTop = previousThread !== thread.key || nearBottom ? body.scrollHeight : oldTop;
  };

  const renderSmsViewer = () => {
    renderSmsThreadList();
    renderSmsConversation();
  };

  const markSmsThreadRead = async (threadKey) => {
    const thread = smsThreads.find((item) => item.key === threadKey);
    if (!thread) return;

    const unreadIds = thread.messages
      .filter((msg) => msg.tag === '1')
      .map((msg) => msg.id)
      .filter(Boolean);

    if (!unreadIds.length) return;

    try {
      const result = await markSmsReadNative(unreadIds);
      if (!result || result.error || (result.result != null && !['success', '0', 'true', 'ok'].includes(String(result.result).toLowerCase()))) return;

      smsCache.forEach((msg) => {
        if (unreadIds.map(String).includes(String(msg.id))) {
          msg.tag = '0';
          msg.tagText = '已读';
        }
      });

      buildSmsThreads(smsCache);
      renderSmsViewer();
    } catch (e) {
      console.warn('[PhoneSMS] 标记会话已读失败:', e);
    }
  };

  const selectSmsThread = (threadKey, markRead = true) => {
    saveSmsDraft();
    smsNewMode = false;
    activeSmsThreadKey = threadKey || '';
    renderSmsViewer();
    setSmsMobilePane('chat');

    if (markRead && activeSmsThreadKey) {
      const selectedKey = activeSmsThreadKey;
      setTimeout(() => markSmsThreadRead(selectedKey), 120);
    }
  };

  const readSmsList = async (manual = true) => {
    if (smsReadBusy) return;
    smsReadBusy = true;
    const buttons = document.querySelectorAll('#kn_sms_refresh_btn, #kn_sms_refresh_current');
    buttons.forEach(btn => { btn.disabled = true; });
    setNotice('kn_sms_load_status', '正在读取...');
    try {
      if (!await ensureUfiSmsAuth()) throw new Error('请先登录 UFI-TOOLS');
      const res = await getSmsInfoNative(0, 500);
      if (!res || !Array.isArray(res.messages)) throw new Error('设备未返回有效的短信列表');
      saveSmsDraft();
      smsCache = normalizeSmsList(res.messages);
      buildSmsThreads(smsCache);
      renderSmsViewer();
      setNotice('kn_sms_load_status', `${smsThreads.length} 个会话 · ${smsCache.length} 条短信`);
      if (manual) toast('短信已刷新', 'green');
    } catch (e) {
      setNotice('kn_sms_load_status', `读取失败：${e.message || e}`, 'error');
      if (!smsCache.length) {
        const box = document.getElementById('kn_sms_threads');
        if (box) box.innerHTML = '<div class="ps-empty">短信读取失败</div>';
      }
      if (manual) toast('短信读取失败，保留已有内容', 'red');
    } finally {
      smsReadBusy = false;
      document.querySelectorAll('#kn_sms_refresh_btn, #kn_sms_refresh_current').forEach(btn => { btn.disabled = false; });
    }
  };

  const deleteSms = async (id) => {
    if (!id) return;
    if (!confirm(`确认删除短信 ID ${id} 吗？`)) return;

    const okAuth = await ensureUfiSmsAuth();
    if (!okAuth) return;

    setBusy(true);

    try {
      const res = await removeSmsNative(id);

      if (res && (res.result === 'success' || res.result === true || res.result === '0' || res.result === 0)) {
        toast('短信已删除', 'green');
        await readSmsList(false);
      } else {
        toast((res && res.message) ? res.message : '删除短信失败', 'red');
      }
    } catch (e) {
      console.error('[PhoneSMS] delete sms failed:', e);
      toast('删除短信失败', 'red');
    } finally {
      setBusy(false);
    }
  };

  const appendLocalSmsBubble = (content, statusText = '已提交') => {
    const chatBody = document.querySelector('#kn_sms_chat_body');
    if (!chatBody) return;

    chatBody.insertAdjacentHTML('beforeend', `
      <div class="sms-msg-row out">
        <div class="sms-bubble">
          <div class="sms-bubble-text">${escapeHTML(content)}</div>
          <div class="sms-bubble-meta">
            <span>${escapeHTML(new Date().toLocaleString())}</span>
            <span>${escapeHTML(statusText)}</span>
          </div>
        </div>
      </div>
    `);

    chatBody.scrollTop = chatBody.scrollHeight;
  };

  const appendFailedSmsBubble = (content, title, detail) => {
    const chatBody = document.querySelector('#kn_sms_chat_body');
    if (!chatBody) return;

    chatBody.insertAdjacentHTML('beforeend', `
      <div class="sms-msg-row out fail">
        <div class="sms-bubble">
          <div class="sms-bubble-text">${escapeHTML(content)}</div>
          <div class="sms-bubble-meta">
            <span>${escapeHTML(title || '发送失败')}</span>
            <span>${escapeHTML(new Date().toLocaleString())}</span>
          </div>
          ${detail ? `<div class="phone-raw">${escapeHTML(detail)}</div>` : ''}
        </div>
      </div>
    `);

    chatBody.scrollTop = chatBody.scrollHeight;
  };

  const sendSms = async () => {
    if (smsSendBusy) return;
    const numberInput = document.querySelector('#kn_sms_number');
    const textInput = document.querySelector('#kn_sms_text');
    const number = normalizeSmsSendNumber(numberInput?.value);
    const content = String(textInput?.value || '').trim();
    const draftKey = composerKey;
    if (!/^\d{3,20}$/.test(number)) { toast('请输入正确的短信号码', 'red'); return; }
    if (!content) { toast('请输入短信内容', 'red'); return; }
    if (content.length > 500 && !confirm(`短信包含 ${content.length} 个字符，可能拆分计费。继续发送吗？`)) return;
    saveSmsDraft();
    smsSendBusy = true;
    sendingDraftKey = draftKey;
    updateComposer();
    setSmsNotice(draftKey, '正在提交短信...', '');
    try {
      if (!await ensureUfiSmsAuth()) throw new Error('请先登录 UFI-TOOLS');
      // Exclude existing records so repeated content cannot confirm a new send.
      const baseline = await getSmsInfoNative(0, 500);
      if (!baseline || !Array.isArray(baseline.messages)) throw new Error('无法读取发送前状态，请稍后重试');
      const existingIds = new Set(baseline.messages.map(item => String(item.id)));
      await checkSmsSendPrerequisites();
      const sendResult = await sendSmsNative({ number, content });
      const normalized = normalizeSendResult(sendResult.response);
      if (!normalized.ok) throw new Error(normalized.message || '设备拒绝了发送请求');
      const draft = smsDrafts.get(draftKey);
      if (draft && normalizeSmsSendNumber(draft.number) === number && draft.content.trim() === content) {
        draft.content = '';
      }
      if (composerKey === draftKey && String(textInput?.value || '').trim() === content) {
        textInput.value = '';
        updateComposer();
        appendLocalSmsBubble(content, '等待设备确认');
      }
      setSmsNotice(draftKey, '已提交，等待设备确认...', '');
      const verify = await verifySmsSentByList({ number, content, existingIds });
      if (verify.failed) {
        smsDrafts.set(draftKey, { number, content });
        if (composerKey === draftKey) restoreSmsDraft(draftKey);
        setSmsNotice(draftKey, '发送失败，已恢复草稿', 'error');
      } else if (verify.sent) {
        setSmsNotice(draftKey, '已写入设备发送记录，非送达回执', 'success');
      } else {
        setSmsNotice(draftKey, '已提交，暂未确认。请刷新核实，避免重复发送。', '');
      }
      if (document.getElementById(MODAL_NAME)) await readSmsList(false);
    } catch (e) {
      setSmsNotice(draftKey, `发送未完成：${e.message || e}。请先核实设备记录。`, 'error');
      toast('短信发送未完成，请查看状态', 'red');
    } finally {
      smsSendBusy = false;
      sendingDraftKey = '';
      updateComposer();
    }
  };

  const pasteSmsNumber = async () => {
    try {
      if (!navigator.clipboard || !navigator.clipboard.readText) {
        toast('当前浏览器不支持读取剪贴板', 'red');
        return;
      }

      const text = await navigator.clipboard.readText();
      const input = document.querySelector('#kn_sms_number');
      if (input) input.value = normalizeSmsSendNumber(text).slice(0, 32);
      saveSmsDraft();
      updateComposer();
    } catch (e) {
      toast('读取剪贴板失败', 'red');
    }
  };

  const copySmsContent = async (content) => {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(content);
      else {
        const area = document.createElement('textarea');
        area.value = content;
        area.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
        document.getElementById(MODAL_NAME).appendChild(area);
        area.select();
        const copied = document.execCommand('copy');
        area.remove();
        if (!copied) throw new Error('copy failed');
      }
      toast('短信内容已复制', 'green');
    } catch (e) { toast('复制失败，请手动选择内容', 'red'); }
  };

  // ==============================
  // 7. 弹窗
  // ==============================
  const closePhoneSmsModal = () => {
    saveSmsDraft();
    stopStatusTimer();
    if (smsTimer) { clearInterval(smsTimer); smsTimer = null; }

    if (escHandler) {
      document.removeEventListener('keydown', escHandler);
      escHandler = null;
    }

    const modal = document.getElementById(MODAL_NAME);
    if (modal) modal.remove();
    if (modalOpener?.isConnected) modalOpener.focus();
  };

  const openModal = async () => {
    ensureStyle();
    closePhoneSmsModal();
    modalOpener = document.activeElement;

    const keypad = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#']
      .map((key) => `<button type="button" class="phone-key" data-key="${key}">${key}</button>`)
      .join('');

    const modal = document.createElement('div');
    modal.id = MODAL_NAME;
    modal.className = 'show';

    modal.innerHTML = `
      <div class="ps-modal-panel" role="dialog" aria-modal="true" aria-labelledby="kn_phone_sms_title" tabindex="-1">
        <header class="ps-modal-header">
          <div class="ps-modal-heading">
            <h2 class="ps-modal-title" id="kn_phone_sms_title">${escapeHTML(TITLE)}</h2>
            <span class="ps-modal-subtitle">v1.4.0</span>
          </div>
          ${iconButton('x', '关闭通信面板', 'kn_phone_sms_close')}
        </header>
        <div class="ps-tabs" role="tablist" aria-label="通信分类">
          <button type="button" class="ps-tab active" id="kn_ps_tab_phone" role="tab" aria-selected="true" aria-controls="kn_ps_page_phone" data-tab="phone">${icon('phone')}电话</button>
          <button type="button" class="ps-tab" id="kn_ps_tab_sms" role="tab" aria-selected="false" aria-controls="kn_ps_page_sms" tabindex="-1" data-tab="sms">${icon('message-square')}短信</button>
        </div>
        <div class="ps-modal-body">
          <section class="ps-page active" id="kn_ps_page_phone" role="tabpanel" aria-labelledby="kn_ps_tab_phone" data-page="phone">
            <div class="phone-shell">
              <div class="ps-card">
                <div class="ps-title"><strong>拨号盘</strong><span class="ps-chip">SIM ${Number(getATSlot()) + 1}</span></div>
                <input id="kn_phone_number" class="phone-input" type="tel" inputmode="tel" autocomplete="off" aria-label="拨号号码" placeholder="输入号码" maxlength="32">
                <div class="phone-keypad">${keypad}</div>
                <div class="phone-secondary-actions">
                  ${iconButton('plus', '输入加号', 'kn_phone_plus_btn')}
                  ${iconButton('delete', '退格', 'kn_phone_backspace_btn')}
                  ${iconButton('trash-2', '清空号码', 'kn_phone_clear_btn')}
                </div>
                <div class="phone-actions">
                  <button type="button" class="phone-action-btn dial" id="kn_phone_dial_btn">${icon('phone')}拨号</button>
                  <button type="button" class="phone-action-btn answer" id="kn_phone_answer_btn" disabled>${icon('phone-incoming')}接听</button>
                  <button type="button" class="phone-action-btn hangup" id="kn_phone_hangup_btn" disabled>${icon('phone-off')}挂断</button>
                </div>
                <div class="ps-status" id="kn_phone_action_status" role="status" aria-live="polite"></div>
              </div>
              <section class="ps-card phone-status-card" aria-label="通话状态">
                <div class="ps-title">
                  <strong>通话状态</strong>
                  <div class="sms-toolbar">
                    ${iconButton('clipboard-paste', '粘贴拨号号码', 'kn_phone_paste_btn')}
                    ${iconButton('refresh-cw', '刷新通话状态', 'kn_phone_status_btn')}
                    ${iconButton('rotate-ccw', '重置通话显示', 'kn_phone_reset_btn')}
                  </div>
                </div>
                <div id="kn_phone_status" class="phone-status-panel">正在查询通话状态...</div>
              </section>
            </div>
          </section>
          <section class="ps-page" id="kn_ps_page_sms" role="tabpanel" aria-labelledby="kn_ps_tab_sms" data-page="sms">
            <div class="sms-shell" data-mobile-pane="list">
              <aside class="ps-card sms-sidebar" aria-label="短信会话">
                <div class="ps-title">
                  <strong>短信会话</strong>
                  <div class="sms-toolbar">
                    ${iconButton('square-pen', '新建短信', 'kn_sms_new_btn')}
                    ${iconButton('refresh-cw', '刷新短信', 'kn_sms_refresh_btn')}
                  </div>
                </div>
                <div class="sms-search-row"><input id="kn_sms_search" class="sms-input" type="search" aria-label="搜索短信" placeholder="搜索号码或内容"></div>
                <div id="kn_sms_threads" class="sms-thread-list"><div class="ps-empty">正在读取短信...</div></div>
                <div id="kn_sms_load_status" class="ps-status" role="status" aria-live="polite" style="padding:0 14px 10px"></div>
              </aside>
              <section class="ps-card sms-chat-card" aria-label="短信内容">
                <div id="kn_sms_chat_header" class="sms-chat-header"></div>
                <div id="kn_sms_chat_body" class="sms-chat-body"></div>
                <div class="sms-composer">
                  <label class="sms-recipient" for="kn_sms_number">收件人<input id="kn_sms_number" class="sms-input" type="tel" inputmode="tel" aria-label="短信收件人" autocomplete="off" maxlength="32" placeholder="号码"></label>
                  <div class="sms-compose-grid">
                    <textarea id="kn_sms_text" class="sms-textarea sms-compose-textarea" rows="2" aria-label="短信内容" placeholder="输入短信内容"></textarea>
                    <button type="button" class="ps-btn send" id="kn_sms_send_btn" disabled>${icon('send')}<span>发送</span></button>
                  </div>
                  <div class="sms-compose-foot">
                    <div class="sms-actions">
                      ${iconButton('clipboard-paste', '粘贴短信号码', 'kn_sms_paste_btn')}
                      ${iconButton('trash-2', '清空短信内容', 'kn_sms_clear_btn')}
                    </div>
                    <span id="kn_sms_count" class="sms-compose-count">0 字符</span>
                  </div>
                  <div id="kn_sms_send_status" class="ps-status" role="status" aria-live="polite"></div>
                </div>
              </section>
            </div>
          </section>
        </div>
      </div>
    `;

    modal.addEventListener('click', (e) => {
      if (e.target === modal) closePhoneSmsModal();
    });

    document.body.appendChild(modal);

    const root = modal;

    root.querySelector('#kn_phone_sms_close').onclick = closePhoneSmsModal;

    root.querySelectorAll('.ps-tab').forEach((btn) => {
      btn.onclick = () => switchTab(btn.dataset.tab);
      btn.onkeydown = (e) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
        e.preventDefault();
        const tab = (e.key === 'Home' || e.key === 'ArrowLeft') ? 'phone' : 'sms';
        switchTab(tab);
        root.querySelector(`[data-tab="${tab}"]`).focus();
      };
    });

    root.querySelectorAll('.phone-key').forEach((btn) => {
      btn.onclick = () => appendDigit(btn.getAttribute('data-key'));
    });

    root.querySelector('#kn_phone_plus_btn').onclick = () => appendDigit('+');
    root.querySelector('#kn_phone_backspace_btn').onclick = backspace;
    root.querySelector('#kn_phone_clear_btn').onclick = clearNumber;
    root.querySelector('#kn_phone_dial_btn').onclick = async () => dial();
    root.querySelector('#kn_phone_hangup_btn').onclick = async () => hangup();
    root.querySelector('#kn_phone_answer_btn').onclick = async () => answer();
    root.querySelector('#kn_phone_status_btn').onclick = async () => refreshStatus(true);
    root.querySelector('#kn_phone_paste_btn').onclick = async () => pasteFromClipboardToPhone();

    root.querySelector('#kn_phone_reset_btn').onclick = () => {
      callSession = null;
      refreshStatus(true);
      toast('通话状态已重置', 'green');
    };

    root.querySelector('#kn_phone_number').addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        await dial();
      }
    });
    root.querySelector('#kn_phone_number').oninput = updatePhoneControls;
    root.querySelector('#kn_sms_new_btn').onclick = newSms;
    root.querySelector('#kn_sms_number').oninput = () => { saveSmsDraft(); updateComposer(); };
    root.querySelector('#kn_sms_text').oninput = () => { saveSmsDraft(); updateComposer(); };
    root.querySelector('#kn_sms_text').onkeydown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); sendSms(); }
    };

    root.querySelector('#kn_sms_send_btn').onclick = sendSms;

    root.querySelector('#kn_sms_paste_btn').onclick = pasteSmsNumber;

    root.querySelector('#kn_sms_clear_btn').onclick = () => {
      const input = root.querySelector('#kn_sms_text');
      if (input) input.value = '';
      saveSmsDraft();
      updateComposer();
    };

    root.querySelector('#kn_sms_refresh_btn').onclick = () => readSmsList(true);

    root.querySelector('#kn_sms_search').oninput = (e) => {
      smsSearchKeyword = e.target.value || '';
      renderSmsThreadList();
    };

    escHandler = (e) => {
      if (e.key === 'Escape') closePhoneSmsModal();
      if (e.key === 'Tab') {
        const focusable = Array.from(root.querySelectorAll('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), [tabindex="0"]')).filter(el => el.getClientRects().length);
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };

    document.addEventListener('keydown', escHandler);

    root.querySelector('#kn_sms_search').value = smsSearchKeyword;
    restoreSmsDraft(composerKey, smsThreads.find(item => item.key === composerKey)?.number || '');
    updatePhoneControls();
    root.querySelector('#kn_phone_number').focus();
    refreshStatus(false);
    startStatusTimer();
  };

  // ==============================
  // 8. 主入口
  // ==============================
  document.getElementById(MAIN_BTN_ID)?.remove();

  const mainBtn = document.createElement('button');
  mainBtn.id = MAIN_BTN_ID;
  mainBtn.textContent = TITLE;
  mainBtn.onclick = async () => {
    await openModal();
  };

  const host =
    document.querySelector('.actions-buttons') ||
    document.querySelector('.collapse_box') ||
    document.body;

  host.appendChild(mainBtn);

  window.KanoPhoneSMS = {
    version: VERSION,
    open: openModal,
    close: closePhoneSmsModal,
    dial,
    hangup,
    answer,
    refreshStatus,
    readSmsList,
    sendSms,
  };
})();
//</script>
