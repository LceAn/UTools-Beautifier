//<script>
(async () => {
  'use strict';

  const TITLE = '电话与短信';
  const VERSION = '1.3.3-ui-polish-2026';
  const MODAL_NAME = 'kn_phone_sms_modal';
  const STYLE_ID = 'kn_phone_sms_style';
  const MAIN_BTN_ID = 'kn_phone_sms_main_btn';

  let statusTimer = null;
  let statusBusy = false;
  let callSession = null;
  let escHandler = null;

  let smsCache = [];
  let smsThreads = [];
  let activeSmsThreadKey = '';
  let smsSearchKeyword = '';

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
  // 2. 样式：2026 美化版
  // ==============================
  const ensureStyle = () => {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${MODAL_NAME} {
        --kn-bg: rgba(10, 14, 22, .72);
        --kn-panel: rgba(18, 24, 34, .82);
        --kn-panel-2: rgba(22, 30, 42, .72);
        --kn-panel-3: rgba(255,255,255,.055);
        --kn-border: rgba(255,255,255,.10);
        --kn-border-strong: rgba(150,190,255,.22);
        --kn-text: rgba(255,255,255,.94);
        --kn-muted: rgba(255,255,255,.52);
        --kn-faint: rgba(255,255,255,.32);
        --kn-blue: #7fb4ff;
        --kn-blue-2: #4d8dff;
        --kn-green: #39d279;
        --kn-red: #ff5f68;
        --kn-yellow: #f7c948;

        position: fixed !important;
        inset: 0 !important;
        z-index: 999999 !important;
        display: none;
        align-items: center !important;
        justify-content: center !important;
        padding: 24px !important;
        box-sizing: border-box !important;
        background:
          radial-gradient(circle at 18% 16%, rgba(80,130,255,.18), transparent 32%),
          radial-gradient(circle at 82% 78%, rgba(54,211,153,.12), transparent 34%),
          rgba(0,0,0,.58) !important;
        backdrop-filter: blur(18px) saturate(1.15) !important;
        -webkit-backdrop-filter: blur(18px) saturate(1.15) !important;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
      }

      #${MODAL_NAME}.show {
        display: flex !important;
      }

      #${MODAL_NAME} * {
        box-sizing: border-box;
      }

      #${MODAL_NAME} button,
      #${MODAL_NAME} input,
      #${MODAL_NAME} textarea {
        font-family: inherit;
      }

      #${MODAL_NAME} .ps-modal-panel {
        position: relative;
        width: min(1420px, 96vw) !important;
        height: min(860px, 92vh) !important;
        max-width: 96vw !important;
        max-height: 92vh !important;
        display: flex !important;
        flex-direction: column !important;
        overflow: hidden !important;
        border-radius: 30px;
        border: 1px solid rgba(255,255,255,.14);
        background:
          linear-gradient(180deg, rgba(24,31,44,.92), rgba(11,15,23,.94)),
          rgba(12,16,24,.92);
        box-shadow:
          0 42px 120px rgba(0,0,0,.62),
          0 0 0 1px rgba(255,255,255,.03) inset,
          0 1px 0 rgba(255,255,255,.08) inset;
      }

      #${MODAL_NAME} .ps-modal-panel::before {
        content: "";
        position: absolute;
        inset: 0;
        pointer-events: none;
        background:
          radial-gradient(circle at 18% 0%, rgba(120,170,255,.18), transparent 32%),
          radial-gradient(circle at 90% 8%, rgba(80,220,170,.08), transparent 28%);
        opacity: .9;
      }

      #${MODAL_NAME} .ps-modal-header {
        position: relative;
        z-index: 1;
        flex: 0 0 auto;
        height: 74px;
        padding: 0 26px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 1px solid rgba(255,255,255,.08);
        background: linear-gradient(180deg, rgba(255,255,255,.045), rgba(255,255,255,.015));
      }

      #${MODAL_NAME} .ps-modal-header > div:first-child {
        display: flex;
        align-items: baseline;
        gap: 12px;
        min-width: 0;
      }

      #${MODAL_NAME} .ps-modal-title {
        font-size: 20px;
        font-weight: 950;
        letter-spacing: .02em;
        color: var(--kn-text);
        white-space: nowrap;
      }

      #${MODAL_NAME} .ps-modal-subtitle {
        margin-left: 0;
        font-size: 12px;
        color: rgba(180,205,255,.58);
        font-weight: 750;
        padding: 4px 10px;
        border-radius: 999px;
        border: 1px solid rgba(160,195,255,.14);
        background: rgba(100,140,210,.10);
        white-space: nowrap;
      }

      #${MODAL_NAME} .ps-modal-close {
        min-width: 76px;
        height: 40px;
        border-radius: 999px;
        border: 1px solid rgba(255,255,255,.14);
        background: rgba(255,255,255,.065);
        color: rgba(255,255,255,.88);
        font-weight: 850;
        cursor: pointer;
        transition: transform .16s ease, background .16s ease, border-color .16s ease;
      }

      #${MODAL_NAME} .ps-modal-close:hover {
        transform: translateY(-1px);
        background: rgba(255,255,255,.105);
        border-color: rgba(255,255,255,.22);
      }

      #${MODAL_NAME} .ps-tabs {
        position: relative;
        z-index: 1;
        flex: 0 0 auto;
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
        padding: 8px;
        margin: 16px 22px 0;
        border-radius: 22px;
        background: rgba(3,7,13,.42);
        border: 1px solid rgba(255,255,255,.075);
        box-shadow: 0 10px 28px rgba(0,0,0,.16) inset;
      }

      #${MODAL_NAME} .ps-tab {
        height: 48px;
        border: 0;
        border-radius: 17px;
        background: transparent;
        color: rgba(255,255,255,.54);
        font-size: 13px;
        font-weight: 900;
        cursor: pointer;
        transition: background .18s ease, color .18s ease, transform .18s ease, box-shadow .18s ease;
      }

      #${MODAL_NAME} .ps-tab:hover {
        color: rgba(255,255,255,.82);
        background: rgba(255,255,255,.045);
      }

      #${MODAL_NAME} .ps-tab.active {
        color: #fff;
        background:
          linear-gradient(180deg, rgba(132,171,230,.58), rgba(82,116,170,.42));
        box-shadow:
          0 12px 30px rgba(74,121,220,.20),
          0 1px 0 rgba(255,255,255,.18) inset;
      }

      #${MODAL_NAME} .ps-modal-body {
        position: relative;
        z-index: 1;
        flex: 1 1 auto;
        min-height: 0;
        overflow: hidden !important;
        padding: 20px 22px 22px;
      }

      #${MODAL_NAME} .ps-page {
        display: none;
        width: 100%;
        height: 100%;
        min-height: 0;
        overflow: hidden;
      }

      #${MODAL_NAME} .ps-page.active {
        display: block;
      }

      #${MODAL_NAME} .phone-shell,
      #${MODAL_NAME} .sms-shell {
        width: 100%;
        height: 100%;
        min-height: 0;
        display: grid;
        gap: 20px;
        overflow: hidden;
      }

      #${MODAL_NAME} .phone-shell {
        grid-template-columns: 390px minmax(0, 1fr);
      }

      #${MODAL_NAME} .sms-shell {
        grid-template-columns: 360px minmax(0, 1fr);
      }

      #${MODAL_NAME} .ps-card {
        min-height: 0;
        border-radius: 26px;
        border: 1px solid var(--kn-border);
        background:
          linear-gradient(180deg, rgba(255,255,255,.055), rgba(255,255,255,.025)),
          rgba(10,15,23,.58);
        box-shadow:
          0 20px 55px rgba(0,0,0,.22),
          0 1px 0 rgba(255,255,255,.06) inset;
        padding: 18px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      #${MODAL_NAME} .ps-title {
        flex: 0 0 auto;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 14px;
      }

      #${MODAL_NAME} .ps-title strong {
        font-size: 15px;
        color: var(--kn-text);
        font-weight: 950;
        letter-spacing: .02em;
      }

      #${MODAL_NAME} .ps-chip {
        font-size: 11px;
        color: rgba(190,210,245,.66);
        padding: 5px 9px;
        border-radius: 999px;
        border: 1px solid rgba(160,195,255,.14);
        background: rgba(100,140,210,.10);
        white-space: nowrap;
      }

      #${MODAL_NAME} .phone-input,
      #${MODAL_NAME} .sms-input,
      #${MODAL_NAME} .sms-textarea {
        width: 100%;
        border-radius: 18px;
        border: 1px solid rgba(255,255,255,.10);
        background: rgba(3,7,13,.46);
        color: var(--kn-text);
        outline: none;
        transition: border-color .16s ease, box-shadow .16s ease, background .16s ease;
      }

      #${MODAL_NAME} .phone-input {
        height: 56px;
        font-size: 24px;
        font-weight: 950;
        letter-spacing: .08em;
        padding: 0 16px;
        text-align: center;
      }

      #${MODAL_NAME} .sms-input {
        height: 46px;
        font-size: 13px;
        font-weight: 760;
        padding: 0 14px;
      }

      #${MODAL_NAME} .sms-textarea {
        min-height: 46px;
        resize: vertical;
        padding: 13px 14px;
        font-size: 13px;
        line-height: 1.62;
      }

      #${MODAL_NAME} .phone-input::placeholder,
      #${MODAL_NAME} .sms-input::placeholder,
      #${MODAL_NAME} .sms-textarea::placeholder {
        color: rgba(255,255,255,.28);
      }

      #${MODAL_NAME} .phone-input:focus,
      #${MODAL_NAME} .sms-input:focus,
      #${MODAL_NAME} .sms-textarea:focus {
        background: rgba(3,7,13,.62);
        border-color: rgba(127,180,255,.72);
        box-shadow:
          0 0 0 4px rgba(127,180,255,.12),
          0 12px 30px rgba(40,85,170,.14);
      }

      #${MODAL_NAME} .phone-keypad {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 11px;
        margin-top: 15px;
      }

      #${MODAL_NAME} .phone-key {
        height: 56px;
        border-radius: 20px;
        border: 1px solid rgba(255,255,255,.10);
        background:
          linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.035));
        color: var(--kn-text);
        font-size: 22px;
        font-weight: 950;
        cursor: pointer;
        transition: transform .14s ease, background .14s ease, border-color .14s ease, box-shadow .14s ease;
      }

      #${MODAL_NAME} .phone-key:hover {
        transform: translateY(-1px);
        background: rgba(255,255,255,.10);
        border-color: rgba(127,180,255,.30);
        box-shadow: 0 10px 26px rgba(0,0,0,.20);
      }

      #${MODAL_NAME} .phone-actions,
      #${MODAL_NAME} .phone-secondary-actions,
      #${MODAL_NAME} .sms-actions {
        display: grid;
        gap: 10px;
        margin-top: 11px;
      }

      #${MODAL_NAME} .phone-actions {
        grid-template-columns: repeat(3, 1fr);
        margin-top: 15px;
      }

      #${MODAL_NAME} .phone-secondary-actions {
        grid-template-columns: repeat(3, 1fr);
      }

      #${MODAL_NAME} .sms-actions {
        grid-template-columns: repeat(2, 1fr);
      }

      #${MODAL_NAME} .phone-action-btn,
      #${MODAL_NAME} .ps-btn {
        min-height: 40px;
        border-radius: 999px;
        border: 1px solid rgba(255,255,255,.11);
        background: rgba(255,255,255,.065);
        color: rgba(255,255,255,.86);
        font-size: 12px;
        font-weight: 850;
        cursor: pointer;
        transition: transform .16s ease, filter .16s ease, background .16s ease, border-color .16s ease, box-shadow .16s ease;
      }

      #${MODAL_NAME} .phone-action-btn {
        min-height: 46px;
        border-radius: 18px;
        color: #fff;
        font-size: 13px;
        font-weight: 900;
      }

      #${MODAL_NAME} .phone-action-btn:hover,
      #${MODAL_NAME} .ps-btn:hover {
        transform: translateY(-1px);
        filter: brightness(1.06);
        background: rgba(255,255,255,.105);
        border-color: rgba(255,255,255,.18);
        box-shadow: 0 10px 25px rgba(0,0,0,.18);
      }

      #${MODAL_NAME} .phone-action-btn.dial,
      #${MODAL_NAME} .ps-btn.send {
        background: linear-gradient(135deg, rgba(65,211,125,.96), rgba(28,162,85,.92));
        border-color: rgba(134,239,172,.34);
        color: #fff;
        box-shadow: 0 12px 26px rgba(31,196,107,.18);
      }

      #${MODAL_NAME} .phone-action-btn.answer {
        background: linear-gradient(135deg, rgba(90,150,255,.96), rgba(51,104,210,.92));
        border-color: rgba(147,197,253,.34);
        box-shadow: 0 12px 26px rgba(70,130,240,.18);
      }

      #${MODAL_NAME} .phone-action-btn.hangup,
      #${MODAL_NAME} .ps-btn.danger {
        background: linear-gradient(135deg, rgba(255,92,104,.98), rgba(200,44,58,.92));
        border-color: rgba(252,165,165,.34);
        color: #fff;
        box-shadow: 0 12px 26px rgba(239,68,68,.18);
      }

      #${MODAL_NAME} .phone-status-card {
        flex: 1 1 auto;
        min-height: 0;
      }

      #${MODAL_NAME} .phone-status-panel {
        flex: 1 1 auto;
        min-height: 0;
        padding: 18px;
        border-radius: 22px;
        background: rgba(3,7,13,.38);
        border: 1px solid rgba(255,255,255,.075);
        color: rgba(255,255,255,.72);
        font-size: 13px;
        line-height: 1.75;
        word-break: break-word;
        overflow: auto;
      }

      #${MODAL_NAME} .phone-status-grid {
        display: grid;
        grid-template-columns: 108px minmax(0, 1fr);
        gap: 10px 12px;
      }

      #${MODAL_NAME} .phone-status-grid b {
        color: rgba(255,255,255,.46);
        font-weight: 800;
      }

      #${MODAL_NAME} .phone-status-grid span {
        color: rgba(255,255,255,.88);
      }

      #${MODAL_NAME} .phone-raw {
        margin-top: 14px;
        padding: 12px;
        border-radius: 14px;
        border: 1px solid rgba(255,255,255,.07);
        background: rgba(0,0,0,.20);
        color: rgba(255,255,255,.42);
        font-size: 12px;
        white-space: pre-wrap;
      }

      #${MODAL_NAME} .ps-note {
        margin-top: 12px;
        padding: 11px 13px;
        border-radius: 16px;
        border: 1px solid rgba(127,180,255,.16);
        background: rgba(127,180,255,.07);
        color: rgba(220,232,255,.62);
        font-size: 12px;
        line-height: 1.65;
      }

      #${MODAL_NAME} .sms-sidebar {
        padding: 16px;
        background:
          linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.025)),
          rgba(8,13,20,.62);
      }

      #${MODAL_NAME} .sms-search-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 86px;
        gap: 10px;
        margin-bottom: 14px;
        flex: 0 0 auto;
      }

      #${MODAL_NAME} .sms-thread-list {
        flex: 1 1 auto;
        min-height: 0;
        overflow-y: auto;
        padding-right: 5px;
      }

      #${MODAL_NAME} .sms-thread-list::-webkit-scrollbar,
      #${MODAL_NAME} .sms-chat-body::-webkit-scrollbar,
      #${MODAL_NAME} .phone-status-panel::-webkit-scrollbar {
        width: 8px;
      }

      #${MODAL_NAME} .sms-thread-list::-webkit-scrollbar-thumb,
      #${MODAL_NAME} .sms-chat-body::-webkit-scrollbar-thumb,
      #${MODAL_NAME} .phone-status-panel::-webkit-scrollbar-thumb {
        border-radius: 999px;
        background: rgba(255,255,255,.14);
      }

      #${MODAL_NAME} .sms-thread-item {
        position: relative;
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 10px;
        padding: 14px;
        margin-bottom: 10px;
        border-radius: 21px;
        border: 1px solid rgba(255,255,255,.075);
        background:
          linear-gradient(180deg, rgba(255,255,255,.045), rgba(255,255,255,.02));
        cursor: pointer;
        transition: background .18s ease, border-color .18s ease, transform .18s ease, box-shadow .18s ease;
      }

      #${MODAL_NAME} .sms-thread-item::before {
        content: "";
        position: absolute;
        left: 10px;
        top: 14px;
        bottom: 14px;
        width: 3px;
        border-radius: 999px;
        background: transparent;
        transition: background .18s ease;
      }

      #${MODAL_NAME} .sms-thread-item:hover {
        transform: translateY(-1px);
        background: rgba(255,255,255,.065);
        border-color: rgba(127,180,255,.18);
        box-shadow: 0 14px 28px rgba(0,0,0,.16);
      }

      #${MODAL_NAME} .sms-thread-item.active {
        background:
          linear-gradient(180deg, rgba(127,180,255,.24), rgba(78,120,190,.13));
        border-color: rgba(127,180,255,.40);
        box-shadow:
          0 18px 36px rgba(45,95,180,.17),
          0 1px 0 rgba(255,255,255,.08) inset;
      }

      #${MODAL_NAME} .sms-thread-item.active::before {
        background: linear-gradient(180deg, var(--kn-blue), var(--kn-green));
      }

      #${MODAL_NAME} .sms-thread-number {
        color: var(--kn-text);
        font-size: 14px;
        font-weight: 950;
        margin: 0 0 7px 10px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      #${MODAL_NAME} .sms-thread-preview {
        color: rgba(255,255,255,.54);
        font-size: 12px;
        line-height: 1.48;
        margin-left: 10px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      #${MODAL_NAME} .sms-thread-meta {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 7px;
        flex: 0 0 auto;
      }

      #${MODAL_NAME} .sms-thread-time {
        color: rgba(255,255,255,.38);
        font-size: 11px;
        white-space: nowrap;
      }

      #${MODAL_NAME} .sms-unread-badge {
        min-width: 19px;
        height: 19px;
        padding: 0 6px;
        border-radius: 999px;
        background: linear-gradient(135deg, rgba(255,95,104,.98), rgba(210,45,58,.95));
        color: #fff;
        font-size: 11px;
        font-weight: 950;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 8px 18px rgba(239,68,68,.28);
      }

      #${MODAL_NAME} .sms-chat-card {
        padding: 0;
        background:
          radial-gradient(circle at 20% 0%, rgba(127,180,255,.10), transparent 28%),
          linear-gradient(180deg, rgba(255,255,255,.055), rgba(255,255,255,.022)),
          rgba(8,13,20,.58);
      }

      #${MODAL_NAME} .sms-chat-header {
        flex: 0 0 auto;
        height: 76px;
        padding: 0 22px;
        border-bottom: 1px solid rgba(255,255,255,.075);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        background: rgba(0,0,0,.12);
      }

      #${MODAL_NAME} .sms-chat-title {
        min-width: 0;
      }

      #${MODAL_NAME} .sms-chat-number {
        color: var(--kn-text);
        font-size: 18px;
        font-weight: 950;
        letter-spacing: .01em;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      #${MODAL_NAME} .sms-chat-subtitle {
        margin-top: 6px;
        color: rgba(205,220,245,.48);
        font-size: 12px;
        font-weight: 720;
      }

      #${MODAL_NAME} .sms-chat-header .ps-btn {
        min-width: 62px;
        height: 38px;
      }

      #${MODAL_NAME} .sms-chat-body {
        flex: 1 1 auto;
        min-height: 0;
        overflow-y: auto;
        padding: 22px 22px 18px;
        background:
          radial-gradient(circle at 16% 12%, rgba(127,180,255,.075), transparent 26%),
          radial-gradient(circle at 84% 72%, rgba(57,210,121,.055), transparent 28%),
          rgba(0,0,0,.075);
      }

      #${MODAL_NAME} .sms-msg-row {
        display: flex;
        margin-bottom: 14px;
      }

      #${MODAL_NAME} .sms-msg-row.in {
        justify-content: flex-start;
      }

      #${MODAL_NAME} .sms-msg-row.out {
        justify-content: flex-end;
      }

      #${MODAL_NAME} .sms-bubble {
        position: relative;
        max-width: min(640px, 70%);
        padding: 13px 14px 12px;
        border-radius: 22px;
        border: 1px solid rgba(255,255,255,.085);
        box-shadow:
          0 14px 34px rgba(0,0,0,.20),
          0 1px 0 rgba(255,255,255,.06) inset;
      }

      #${MODAL_NAME} .sms-msg-row.in .sms-bubble {
        border-top-left-radius: 8px;
        background:
          linear-gradient(180deg, rgba(255,255,255,.085), rgba(255,255,255,.045));
      }

      #${MODAL_NAME} .sms-msg-row.out .sms-bubble {
        border-top-right-radius: 8px;
        background:
          linear-gradient(135deg, rgba(86,142,232,.62), rgba(43,91,170,.48));
        border-color: rgba(155,196,255,.25);
      }

      #${MODAL_NAME} .sms-msg-row.fail .sms-bubble {
        background:
          linear-gradient(135deg, rgba(255,92,104,.22), rgba(150,40,50,.20));
        border-color: rgba(255,130,140,.28);
      }

      #${MODAL_NAME} .sms-bubble-text {
        color: rgba(255,255,255,.91);
        font-size: 13px;
        line-height: 1.68;
        white-space: pre-wrap;
        word-break: break-word;
      }

      #${MODAL_NAME} .sms-bubble-meta {
        margin-top: 9px;
        display: flex;
        justify-content: space-between;
        gap: 12px;
        color: rgba(255,255,255,.43);
        font-size: 11px;
        font-weight: 720;
      }

      #${MODAL_NAME} .sms-bubble-actions {
        margin-top: 9px;
        display: flex;
        justify-content: flex-end;
        gap: 7px;
      }

      #${MODAL_NAME} .sms-bubble-actions button {
        min-height: 28px;
        padding: 0 10px;
        font-size: 11px;
      }

      #${MODAL_NAME} .sms-composer {
        flex: 0 0 auto;
        padding: 16px 18px;
        border-top: 1px solid rgba(255,255,255,.075);
        background:
          linear-gradient(180deg, rgba(255,255,255,.035), rgba(0,0,0,.12));
      }

      #${MODAL_NAME} .sms-compose-grid {
        display: grid;
        grid-template-columns: 220px minmax(0, 1fr) 98px;
        gap: 12px;
        align-items: end;
      }

      #${MODAL_NAME} .sms-compose-textarea {
        min-height: 46px !important;
        max-height: 104px;
        resize: vertical;
      }

      #${MODAL_NAME} .sms-empty-chat {
        height: 100%;
        min-height: 260px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: rgba(255,255,255,.34);
        text-align: center;
        border-radius: 22px;
        border: 1px dashed rgba(255,255,255,.10);
        background: rgba(255,255,255,.025);
      }

      #${MODAL_NAME} .ps-empty {
        padding: 42px 14px;
        text-align: center;
        color: rgba(255,255,255,.34);
        font-size: 13px;
        border-radius: 20px;
        border: 1px dashed rgba(255,255,255,.10);
        background: rgba(255,255,255,.025);
      }

      @media (max-width: 920px) {
        #${MODAL_NAME} {
          align-items: flex-start !important;
          overflow-y: auto !important;
          padding: 14px !important;
        }

        #${MODAL_NAME} .ps-modal-panel {
          height: auto !important;
          min-height: auto !important;
          max-height: none !important;
        }

        #${MODAL_NAME} .ps-modal-body {
          overflow: visible !important;
        }

        #${MODAL_NAME} .phone-shell,
        #${MODAL_NAME} .sms-shell {
          grid-template-columns: 1fr !important;
          height: auto;
          overflow: visible;
        }

        #${MODAL_NAME} .ps-card {
          overflow: visible;
        }

        #${MODAL_NAME} .phone-actions,
        #${MODAL_NAME} .phone-secondary-actions,
        #${MODAL_NAME} .sms-actions {
          grid-template-columns: 1fr;
        }

        #${MODAL_NAME} .sms-chat-body {
          min-height: 420px;
        }

        #${MODAL_NAME} .sms-compose-grid {
          grid-template-columns: 1fr;
        }

        #${MODAL_NAME} .sms-bubble {
          max-width: 92%;
        }
      }
    `;
    document.head.appendChild(style);
  };

  // ==============================
  // 3. Tab 切换
  // ==============================
  const switchTab = (tab) => {
    document.querySelectorAll(`#${MODAL_NAME} .ps-tab`).forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    document.querySelectorAll(`#${MODAL_NAME} .ps-page`).forEach((page) => {
      page.classList.toggle('active', page.dataset.page === tab);
    });

    if (tab === 'sms') {
      setTimeout(() => readSmsList(false), 120);
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
          <div class="phone-raw">${escapeHTML(String(raw || '').trim() || 'AT+CLCC 未返回活动通话')}</div>
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
        <div class="phone-raw">${escapeHTML(String(raw || '').trim() || 'AT+CLCC 未返回活动通话')}</div>
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
      <div class="phone-raw">${escapeHTML(activeCall.raw || raw || '')}</div>
    `;
  };

  const refreshStatus = async (manual = false) => {
    if (statusBusy) return;
    statusBusy = true;

    try {
      const res = await execAT('AT+CLCC');
      const raw = res?.data || '';
      const calls = res?.ok ? parseCLCCCalls(raw) : [];

      renderCurrentStatus(calls, raw || 'AT+CLCC 查询失败');

      if (manual) {
        if (res?.ok) toast('通话状态已刷新', 'green');
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
  const setBusy = (busy) => {
    const root = document.querySelector(`#${MODAL_NAME}`);
    if (!root) return;

    root.querySelectorAll('button, input, textarea').forEach((el) => {
      if (el.id === 'kn_phone_sms_close') return;
      el.disabled = busy;
      el.style.opacity = busy ? '.62' : '';
      el.style.pointerEvents = busy ? 'none' : '';
    });
  };

  const dial = async (numberFromArg = null) => {
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
        return;
      }

      toast('拨号指令已发送', 'green');
      setTimeout(() => refreshStatus(false), 800);
    } finally {
      setBusy(false);
    }
  };

  const hangup = async () => {
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
    input.value = sanitizeNumber(input.value + digit).slice(0, 32);
    input.focus();
  };

  const backspace = () => {
    const input = document.querySelector('#kn_phone_number');
    if (!input) return;
    input.value = sanitizeNumber(input.value).slice(0, -1);
    input.focus();
  };

  const clearNumber = () => {
    const input = document.querySelector('#kn_phone_number');
    if (!input) return;
    input.value = '';
    input.focus();
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
      return `${y}-${pad2(m)}-${pad2(d)} ${pad2(h)}:${pad2(min)}${s ? ':' + pad2(s) : ''}`;
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
    if (
      rawText.includes('"success"') ||
      rawText.includes('send sms success') ||
      rawText.includes('sms success')
    ) {
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

    console.log('[PhoneSMS] SEND_SMS full payload json:', stringifySafe(payload));

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

  const verifySmsSentByList = async ({ number, content }) => {
    const targetKey = normalizeSmsNumberKey(normalizeSmsSendNumber(number));
    const contentTrim = String(content || '').trim();

    for (let i = 0; i < 10; i += 1) {
      try {
        await new Promise((resolve) => setTimeout(resolve, i === 0 ? 1600 : 1200));

        const res = await getSmsInfoNative(0, 500);
        const messages = Array.isArray(res?.messages) ? normalizeSmsList(res.messages) : [];

        const hit = messages.find((msg) => {
          return (
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

    if (!smsThreads.some((thread) => thread.key === activeSmsThreadKey)) {
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

    const list = getFilteredSmsThreads();

    if (!list.length) {
      box.innerHTML = '<div class="ps-empty">暂无会话</div>';
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
        <div class="sms-thread-item${active}" data-thread-key="${escapeHTML(thread.key)}">
          <div style="min-width:0;">
            <div class="sms-thread-number">${escapeHTML(thread.number || '未知号码')}</div>
            <div class="sms-thread-preview">${escapeHTML(preview || '无内容')}</div>
          </div>
          <div class="sms-thread-meta">
            <div class="sms-thread-time">${escapeHTML(last.date || '-')}</div>
            ${unread}
          </div>
        </div>
      `;
    }).join('');

    box.querySelectorAll('.sms-thread-item').forEach((item) => {
      item.onclick = () => {
        const key = item.getAttribute('data-thread-key') || '';
        selectSmsThread(key, true);
      };
    });
  };

  const renderSmsConversation = () => {
    const header = document.querySelector('#kn_sms_chat_header');
    const body = document.querySelector('#kn_sms_chat_body');
    const numberInput = document.querySelector('#kn_sms_number');

    if (!header || !body) return;

    const thread = smsThreads.find((item) => item.key === activeSmsThreadKey);

    if (!thread) {
      header.innerHTML = `
        <div class="sms-chat-title">
          <div class="sms-chat-number">请选择一个短信会话</div>
          <div class="sms-chat-subtitle">左侧按手机号聚合展示</div>
        </div>
      `;
      body.innerHTML = '<div class="sms-empty-chat">暂无选中的会话</div>';
      if (numberInput) numberInput.value = '';
      return;
    }

    if (numberInput) numberInput.value = normalizeSmsSendNumber(thread.number || '');

    header.innerHTML = `
      <div class="sms-chat-title">
        <div class="sms-chat-number">${escapeHTML(thread.number || '未知号码')}</div>
        <div class="sms-chat-subtitle">${thread.messages.length} 条短信 · ${thread.unreadCount ? thread.unreadCount + ' 条未读' : '无未读'}</div>
      </div>
      <div style="display:flex;gap:8px;flex:0 0 auto;">
        <button type="button" class="ps-btn" id="kn_sms_call_current">拨号</button>
        <button type="button" class="ps-btn" id="kn_sms_refresh_current">刷新</button>
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
              <button type="button" class="ps-btn" data-action="sms-reply" data-number="${escapeHTML(msg.number || '')}">回复</button>
              ${
                msg.tag === '3'
                  ? `<button type="button" class="ps-btn send" data-action="sms-resend" data-id="${escapeHTML(msg.id)}">重发</button>`
                  : ''
              }
              <button type="button" class="ps-btn danger" data-action="sms-delete" data-id="${escapeHTML(msg.id)}">删除</button>
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

        await sendSms();
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
      };
    }

    const refreshBtn = document.querySelector('#kn_sms_refresh_current');
    if (refreshBtn) {
      refreshBtn.onclick = () => readSmsList(true);
    }

    setTimeout(() => {
      body.scrollTop = body.scrollHeight;
    }, 20);
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
      await markSmsReadNative(unreadIds);

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
    activeSmsThreadKey = threadKey || '';
    renderSmsViewer();

    if (markRead && activeSmsThreadKey) {
      setTimeout(() => markSmsThreadRead(activeSmsThreadKey), 120);
    }
  };

  const readSmsList = async (manual = true) => {
    const threadBox = document.querySelector('#kn_sms_threads');
    const chatBody = document.querySelector('#kn_sms_chat_body');

    if (threadBox) threadBox.innerHTML = '<div class="ps-empty">正在读取短信会话...</div>';
    if (chatBody) chatBody.innerHTML = '<div class="sms-empty-chat">正在加载短信内容...</div>';

    const okAuth = await ensureUfiSmsAuth();
    if (!okAuth) return;

    setBusy(true);

    try {
      const res = await getSmsInfoNative(0, 500);

      if (!res) {
        smsCache = [];
        buildSmsThreads(smsCache);
        renderSmsViewer();
        toast('读取短信失败：接口无返回', 'red');
        return;
      }

      const messages = Array.isArray(res.messages) ? res.messages : [];

      smsCache = normalizeSmsList(messages);
      buildSmsThreads(smsCache);
      renderSmsViewer();

      if (manual) {
        toast(`短信读取完成：${smsCache.length} 条，${smsThreads.length} 个会话`, 'green');
      }
    } catch (e) {
      console.error('[PhoneSMS] read sms failed:', e);

      smsCache = [];
      smsThreads = [];
      renderSmsViewer();

      if (chatBody) {
        chatBody.innerHTML = `
          <div class="sms-empty-chat">
            读取短信失败<br>
            ${escapeHTML(e.message || String(e))}
          </div>
        `;
      }

      if (manual) toast('读取短信失败', 'red');
    } finally {
      setBusy(false);
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
    const numberInput = document.querySelector('#kn_sms_number');
    const textInput = document.querySelector('#kn_sms_text');

    const thread = smsThreads.find((item) => item.key === activeSmsThreadKey);
    const numberRaw = numberInput?.value || thread?.number || '';
    const number = normalizeSmsSendNumber(numberRaw);
    const content = String(textInput?.value || '').trim();

    if (!number) {
      toast('请输入短信号码，或先选择一个会话', 'red');
      return;
    }

    if (!/^\d{3,20}$/.test(number)) {
      toast(`短信号码格式不正确：${number}。建议使用纯数字号码，例如 13800000000`, 'red');
      return;
    }

    if (!content) {
      toast('请输入短信内容', 'red');
      return;
    }

    if (content.length > 500) {
      const ok = confirm(`短信内容较长：${content.length} 字符。继续发送吗？`);
      if (!ok) return;
    }

    const okAuth = await ensureUfiSmsAuth();
    if (!okAuth) return;

    setBusy(true);
    toast('正在提交短信发送请求', 'pink');

    try {
      await checkSmsSendPrerequisites();

      const sendResult = await sendSmsNative({
        number,
        content,
      });

      console.log('[PhoneSMS] send raw result json:', stringifySafe(sendResult));

      const normalized = normalizeSendResult(sendResult.response);

      if (!normalized.ok) {
        console.warn('[PhoneSMS] SEND_SMS returned non-success:', stringifySafe(normalized.raw));

        toast(normalized.message || 'SEND_SMS 提交失败', 'red');
        appendFailedSmsBubble(content, normalized.message, stringifySafe(normalized.raw));
        return;
      }

      toast('设备已接收发送请求，等待短信列表确认', 'green');

      if (textInput) textInput.value = '';

      activeSmsThreadKey = normalizeSmsNumberKey(number);

      appendLocalSmsBubble(content, '设备已接收');

      const verify = await verifySmsSentByList({ number, content });

      console.log('[PhoneSMS] verify after submit json:', stringifySafe(verify));

      if (verify.failed) {
        toast('设备短信列表显示发送失败', 'red');
        appendFailedSmsBubble(content, '设备短信列表显示发送失败', stringifySafe(verify.sms?.raw || verify));
        await readSmsList(false);
        return;
      }

      if (verify.sent) {
        toast('设备已写入已发送记录', 'green');
        await readSmsList(false);
        return;
      }

      toast('短信已提交，但暂未在短信列表确认；请稍后刷新或检查运营商投递状态', 'green');

      setTimeout(async () => {
        try {
          await readSmsList(false);
        } catch (e) {
          console.warn('[PhoneSMS] refresh after send failed:', e);
        }
      }, 1500);
    } catch (e) {
      console.error('[PhoneSMS] send sms failed:', e);

      const msg = e.message || String(e);
      toast(`短信发送异常：${msg}`, 'red');
      appendFailedSmsBubble(content, '发送异常', msg);
    } finally {
      setBusy(false);
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
    } catch (e) {
      toast('读取剪贴板失败', 'red');
    }
  };

  // ==============================
  // 7. 弹窗
  // ==============================
  const closePhoneSmsModal = () => {
    stopStatusTimer();

    if (escHandler) {
      document.removeEventListener('keydown', escHandler);
      escHandler = null;
    }

    const modal = document.getElementById(MODAL_NAME);
    if (modal) modal.remove();
  };

  const openModal = async () => {
    ensureStyle();

    document.getElementById(MODAL_NAME)?.remove();

    const keypad = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#']
      .map((key) => `<button type="button" class="phone-key" data-key="${key}">${key}</button>`)
      .join('');

    const modal = document.createElement('div');
    modal.id = MODAL_NAME;
    modal.className = 'show';

    modal.innerHTML = `
      <div class="ps-modal-panel">
        <div class="ps-modal-header">
          <div>
            <span class="ps-modal-title">${escapeHTML(TITLE)}</span>
            <span class="ps-modal-subtitle">v${escapeHTML(VERSION)}</span>
          </div>
          <button type="button" class="ps-modal-close" id="kn_phone_sms_close">关闭</button>
        </div>

        <div class="ps-tabs">
          <button type="button" class="ps-tab active" data-tab="phone">电话</button>
          <button type="button" class="ps-tab" data-tab="sms">短信</button>
        </div>

        <div class="ps-modal-body">
          <div class="ps-page active" data-page="phone">
            <div class="phone-shell">
              <div class="ps-card">
                <div class="ps-title">
                  <strong>拨号盘</strong>
                  <span class="ps-chip">Slot ${escapeHTML(getATSlot())}</span>
                </div>

                <input
                  id="kn_phone_number"
                  class="phone-input"
                  type="tel"
                  inputmode="tel"
                  autocomplete="off"
                  placeholder="请输入号码"
                  value=""
                >

                <div class="phone-keypad">
                  ${keypad}
                </div>

                <div class="phone-secondary-actions">
                  <button type="button" class="ps-btn" id="kn_phone_plus_btn">+ 号</button>
                  <button type="button" class="ps-btn" id="kn_phone_backspace_btn">退格</button>
                  <button type="button" class="ps-btn" id="kn_phone_clear_btn">清空</button>
                </div>

                <div class="phone-actions">
                  <button type="button" class="phone-action-btn dial" id="kn_phone_dial_btn">拨号</button>
                  <button type="button" class="phone-action-btn answer" id="kn_phone_answer_btn">接听</button>
                  <button type="button" class="phone-action-btn hangup" id="kn_phone_hangup_btn">挂断</button>
                </div>

                <div class="phone-secondary-actions">
                  <button type="button" class="ps-btn" id="kn_phone_status_btn">刷新状态</button>
                  <button type="button" class="ps-btn" id="kn_phone_paste_btn">粘贴号码</button>
                  <button type="button" class="ps-btn" id="kn_phone_reset_btn">重置状态</button>
                </div>

                <div class="ps-note">
                  拨号：ATD号码;　挂断：ATH　接听：ATA　状态：AT+CLCC
                </div>
              </div>

              <div class="ps-card phone-status-card">
                <div class="ps-title">
                  <strong>当前通话状态</strong>
                  <span class="ps-chip">AT+CLCC · 自动刷新</span>
                </div>

                <div id="kn_phone_status" class="phone-status-panel">
                  正在查询当前通话状态...
                </div>

                <div class="ps-note">
                  拨出时间、接通时间、通话时间由插件根据 AT+CLCC 状态实时计算。
                </div>
              </div>
            </div>
          </div>

          <div class="ps-page" data-page="sms">
            <div class="sms-shell">
              <div class="ps-card sms-sidebar">
                <div class="ps-title">
                  <strong>短信会话</strong>
                  <span class="ps-chip">按手机号聚合</span>
                </div>

                <div class="sms-search-row">
                  <input id="kn_sms_search" class="sms-input" type="text" placeholder="搜索号码或内容">
                  <button type="button" class="ps-btn" id="kn_sms_refresh_btn">刷新</button>
                </div>

                <div id="kn_sms_threads" class="sms-thread-list">
                  <div class="ps-empty">点击“刷新”读取短信。</div>
                </div>
              </div>

              <div class="ps-card sms-chat-card">
                <div id="kn_sms_chat_header" class="sms-chat-header">
                  <div class="sms-chat-title">
                    <div class="sms-chat-number">请选择一个短信会话</div>
                    <div class="sms-chat-subtitle">左侧按手机号聚合展示</div>
                  </div>
                </div>

                <div id="kn_sms_chat_body" class="sms-chat-body">
                  <div class="sms-empty-chat">暂无选中的会话</div>
                </div>

                <div class="sms-composer">
                  <div class="sms-compose-grid">
                    <input id="kn_sms_number" class="sms-input" type="tel" inputmode="tel" placeholder="号码">
                    <textarea id="kn_sms_text" class="sms-textarea sms-compose-textarea" placeholder="输入短信内容，选择会话后可直接回复"></textarea>
                    <button type="button" class="ps-btn send" id="kn_sms_send_btn">发送</button>
                  </div>

                  <div class="sms-actions" style="grid-template-columns:repeat(2,1fr);margin-top:10px;">
                    <button type="button" class="ps-btn" id="kn_sms_paste_btn">粘贴号码</button>
                    <button type="button" class="ps-btn" id="kn_sms_clear_btn">清空内容</button>
                  </div>

                  <div class="ps-note">
                    说明：SEND_SMS 返回 success 只代表设备已接收发送请求；是否真正投递成功仍取决于设备短信列表状态、短信中心、运营商和对方号码状态。
                  </div>
                </div>
              </div>
            </div>
          </div>
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

    root.querySelector('#kn_sms_send_btn').onclick = sendSms;

    root.querySelector('#kn_sms_paste_btn').onclick = pasteSmsNumber;

    root.querySelector('#kn_sms_clear_btn').onclick = () => {
      const input = root.querySelector('#kn_sms_text');
      if (input) input.value = '';
    };

    root.querySelector('#kn_sms_refresh_btn').onclick = () => readSmsList(true);

    root.querySelector('#kn_sms_search').oninput = (e) => {
      smsSearchKeyword = e.target.value || '';
      renderSmsThreadList();
    };

    escHandler = (e) => {
      if (e.key === 'Escape') closePhoneSmsModal();
    };

    document.addEventListener('keydown', escHandler);

    setTimeout(() => {
      refreshStatus(false);
      startStatusTimer();
    }, 120);
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