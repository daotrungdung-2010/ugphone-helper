// ==UserScript==
// @name         UGPhone Helper
// @namespace    ugphone-helper
// @version      1.0.0
// @description  Nút nổi: đăng nhập bằng localStorage (nhiều profile) + chọn nhanh khu vực & bấm nhận máy trial
// @match        https://www.ugphone.com/*
// @match        https://ugphone.com/*
// @match        https://*.ugphone.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_setClipboard
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/daotrungdung-2010/ugphone-helper/main/ugphone-helper.user.js
// @downloadURL  https://raw.githubusercontent.com/daotrungdung-2010/ugphone-helper/main/ugphone-helper.user.js
// ==/UserScript==

(function () {
  'use strict';
  if (window.top !== window.self || document.getElementById('ugh-root')) return;

  // ---------- Cấu hình khu vực (alias để dò chữ trên trang, sửa tuỳ ý) ----------
  const REGIONS = {
    Singapore: ['singapore', 'sing', 'sg', '新加坡', 'xin-ga-po'],
    Japan: ['japan', 'jp', 'tokyo', '日本'],
    Germany: ['germany', 'de', 'frankfurt', '德国'],
    China: ['china', 'cn', 'hong kong', 'hk', '中国', '香港'],
    Thailand: ['thailand', 'th', 'bangkok', '泰国'],
    USA: ['usa', 'united states', 'us', '美国'],
    Korea: ['korea', 'kr', 'seoul', '韩国'],
  };
  const TRIAL_WORDS = ['trial', 'free', 'dùng thử', 'miễn phí', '试用', '免费', 'try'];
  const CONFIRM_WORDS = ['confirm', 'ok', 'buy', 'get', 'xác nhận', 'mua', 'nhận', '确定', '确认', '立即'];

  // ---------- Tiện ích ----------
  const $ = (s, r = document) => r.querySelector(s);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const store = {
    get: (k, d) => { try { return JSON.parse(GM_getValue(k, JSON.stringify(d))); } catch { return d; } },
    set: (k, v) => GM_setValue(k, JSON.stringify(v)),
  };
  const log = (m) => {
    const box = $('#ugh-log');
    if (box) { box.textContent = `[${new Date().toLocaleTimeString()}] ${m}\n` + box.textContent; }
  };

  function visible(el) {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
  }
  function findByText(words, { exact = false } = {}) {
    const ws = words.map((w) => w.toLowerCase());
    const els = [...document.querySelectorAll('button, a, div, span, li, p, label')]
      .filter((e) => !e.closest('#ugh-root') && visible(e));
    const hits = els.filter((e) => {
      const t = (e.innerText || '').trim().toLowerCase();
      if (!t || t.length > 60) return false;
      return ws.some((w) => (exact ? t === w : t.includes(w)));
    });
    // lấy phần tử sâu nhất (ngắn nhất) để click đúng
    hits.sort((a, b) => a.innerText.length - b.innerText.length);
    return hits[0] || null;
  }
  function click(el) {
    el.scrollIntoView({ block: 'center' });
    ['mousedown', 'mouseup', 'click'].forEach((t) =>
      el.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window })));
  }

  // ---------- Chức năng localStorage ----------
  function exportLS() {
    const o = {};
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k); }
    return o;
  }
  function importLS(obj, clear) {
    if (clear) localStorage.clear();
    Object.entries(obj).forEach(([k, v]) =>
      localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)));
  }

  // ---------- Chức năng trial ----------
  async function pickTrial(region) {
    log(`Tìm khu vực ${region}...`);
    const rEl = findByText(REGIONS[region]);
    if (!rEl) return log(`❌ Không thấy "${region}" trên trang. Hãy mở trang chọn máy/khu vực trước.`);
    click(rEl); log(`✔ Đã chọn ${region}`);
    await sleep(800);
    const tEl = findByText(TRIAL_WORDS);
    if (!tEl) return log('❌ Không thấy nút trial/free. Có thể khu vực này hết suất hoặc chưa đủ điều kiện.');
    click(tEl); log('✔ Đã bấm nút trial');
    await sleep(800);
    const cEl = findByText(CONFIRM_WORDS, { exact: true });
    if (cEl) { click(cEl); log('✔ Đã bấm xác nhận'); }
    else log('ℹ Không có hộp xác nhận (hoặc bạn tự bấm).');
  }

  // ---------- Giao diện ----------
  const root = document.createElement('div');
  root.id = 'ugh-root';
  root.innerHTML = `
  <style>
    #ugh-root{position:fixed;z-index:2147483647;font:13px system-ui,sans-serif;color:#eee}
    #ugh-fab{width:48px;height:48px;border-radius:50%;background:#6c5ce7;display:flex;align-items:center;justify-content:center;font-size:22px;box-shadow:0 2px 10px #0006;cursor:pointer;user-select:none;touch-action:none}
    #ugh-panel{display:none;position:absolute;bottom:56px;right:0;width:300px;max-height:70vh;overflow:auto;background:#1e1e2e;border-radius:12px;padding:10px;box-shadow:0 4px 20px #0008}
    #ugh-panel h4{margin:8px 0 4px;font-size:13px;color:#a29bfe}
    #ugh-panel button{background:#6c5ce7;color:#fff;border:0;border-radius:6px;padding:6px 8px;margin:2px;font-size:12px}
    #ugh-panel button.sec{background:#444}
    #ugh-panel textarea,#ugh-panel input,#ugh-panel select{width:100%;box-sizing:border-box;background:#2b2b3d;color:#eee;border:1px solid #444;border-radius:6px;padding:5px;margin:2px 0}
    #ugh-panel textarea{height:70px;font-family:monospace;font-size:11px}
    #ugh-log{white-space:pre-wrap;font-size:11px;background:#111;border-radius:6px;padding:6px;max-height:110px;overflow:auto;margin-top:6px}
  </style>
  <div id="ugh-panel">
    <h4>🔑 Đăng nhập bằng localStorage</h4>
    <textarea id="ugh-json" placeholder='Dán JSON localStorage, ví dụ {"token":"..."}'></textarea>
    <input id="ugh-name" placeholder="Tên profile (vd: acc1)">
    <label><input type="checkbox" id="ugh-clear" style="width:auto"> Xoá localStorage cũ trước khi nạp</label><br>
    <button id="ugh-apply">Nạp &amp; tải lại</button>
    <button id="ugh-save" class="sec">Lưu profile</button>
    <button id="ugh-export" class="sec">Copy LS hiện tại</button>
    <select id="ugh-profiles"></select>
    <button id="ugh-load" class="sec">Dùng profile</button>
    <button id="ugh-del" class="sec">Xoá profile</button>
    <h4>🌏 Nhận máy trial theo khu vực</h4>
    <div id="ugh-regions"></div>
    <div id="ugh-log"></div>
  </div>
  <div id="ugh-fab">📱</div>`;
  document.documentElement.appendChild(root);

  // vị trí & kéo thả nút nổi
  const pos = store.get('pos', { right: 16, bottom: 120 });
  root.style.right = pos.right + 'px'; root.style.bottom = pos.bottom + 'px';
  const fab = $('#ugh-fab'), panel = $('#ugh-panel');
  let drag = null, moved = false;
  fab.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, y: e.clientY, r: parseInt(root.style.right), b: parseInt(root.style.bottom) };
    moved = false; fab.setPointerCapture(e.pointerId);
  });
  fab.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 5) moved = true;
    root.style.right = Math.max(0, drag.r - dx) + 'px';
    root.style.bottom = Math.max(0, drag.b - dy) + 'px';
  });
  fab.addEventListener('pointerup', () => {
    if (!moved) panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
    else store.set('pos', { right: parseInt(root.style.right), bottom: parseInt(root.style.bottom) });
    drag = null;
  });

  // profiles
  function refreshProfiles() {
    const p = store.get('profiles', {});
    $('#ugh-profiles').innerHTML = Object.keys(p).map((n) => `<option>${n}</option>`).join('') || '<option value="">(chưa có)</option>';
  }
  refreshProfiles();

  function parseJSON() {
    try { return JSON.parse($('#ugh-json').value); }
    catch { log('❌ JSON không hợp lệ'); return null; }
  }
  $('#ugh-apply').onclick = () => {
    const o = parseJSON(); if (!o) return;
    importLS(o, $('#ugh-clear').checked); log('✔ Đã nạp, đang tải lại...'); setTimeout(() => location.reload(), 500);
  };
  $('#ugh-save').onclick = () => {
    const name = $('#ugh-name').value.trim(); if (!name) return log('❌ Nhập tên profile');
    const o = $('#ugh-json').value.trim() ? parseJSON() : exportLS(); if (!o) return;
    const p = store.get('profiles', {}); p[name] = o; store.set('profiles', p); refreshProfiles(); log(`✔ Đã lưu "${name}"`);
  };
  $('#ugh-export').onclick = () => {
    const s = JSON.stringify(exportLS(), null, 2);
    $('#ugh-json').value = s; try { GM_setClipboard(s); } catch {} log('✔ Đã copy localStorage hiện tại');
  };
  $('#ugh-load').onclick = () => {
    const n = $('#ugh-profiles').value, p = store.get('profiles', {});
    if (!p[n]) return log('❌ Chưa chọn profile');
    importLS(p[n], true); log(`✔ Dùng "${n}", đang tải lại...`); setTimeout(() => location.reload(), 500);
  };
  $('#ugh-del').onclick = () => {
    const n = $('#ugh-profiles').value, p = store.get('profiles', {});
    delete p[n]; store.set('profiles', p); refreshProfiles(); log(`🗑 Đã xoá "${n}"`);
  };

  // nút khu vực
  $('#ugh-regions').innerHTML = Object.keys(REGIONS).map((r) => `<button data-r="${r}">${r}</button>`).join('');
  $('#ugh-regions').onclick = (e) => { const r = e.target.dataset.r; if (r) pickTrial(r); };
})();
