let tick = null;

const el = {};
['reminderList','reminderCount','clearAll','cycleForm',
 'msgInput','workVal','restVal','cycleVal','infiniteToggle',
 'soundToggle','totalInfo','toggleForm','cancelForm','submitBtn',
 'modalOverlay','closeModal'
].forEach(k => el[k] = document.getElementById(k));

// ── Modal open / close ──
function openModal() {
  el.modalOverlay.classList.add('open');
  el.toggleForm.classList.add('active');
  setTimeout(() => el.msgInput.focus(), 200);
}

function closeModal() {
  el.modalOverlay.classList.remove('open');
  el.toggleForm.classList.remove('active');
}

el.toggleForm.addEventListener('click', () => {
  el.modalOverlay.classList.contains('open') ? closeModal() : openModal();
});

[el.closeModal, el.cancelForm].forEach(btn => {
  btn.addEventListener('click', closeModal);
});

el.modalOverlay.addEventListener('click', (e) => {
  if (e.target === el.modalOverlay) closeModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && el.modalOverlay.classList.contains('open')) closeModal();
});

// ── Stepper ──
document.addEventListener('click', e => {
  const btn = e.target.closest('.step');
  if (!btn) return;
  const inp = document.getElementById(btn.dataset.id);
  if (!inp) return;
  const dir = btn.textContent.trim() === '−' ? -1 : 1;
  const v = (parseInt(inp.value) || 1) + dir;
  inp.value = Math.max(parseInt(inp.min), Math.min(parseInt(inp.max), v));
  inp.dispatchEvent(new Event('input'));
  updateTotal();
});

function updateTotal() {
  const w = parseInt(el.workVal.value) || 25;
  const r = parseInt(el.restVal.value) || 5;
  if (el.infiniteToggle.checked) { el.totalInfo.textContent = '无限循环'; return; }
  const c = parseInt(el.cycleVal.value) || 4;
  const t = (w + r) * c;
  const h = Math.floor(t / 60);
  const m = t % 60;
  el.totalInfo.textContent = h > 0 ? `约 ${h} 小时${m > 0 ? ` ${m} 分钟` : ''}` : `约 ${m} 分钟`;
}

[el.workVal, el.restVal, el.cycleVal, el.infiniteToggle].forEach(el_ => {
  el_.addEventListener('input', updateTotal);
  el_.addEventListener('change', updateTotal);
});

el.infiniteToggle.addEventListener('change', () => {
  el.cycleVal.disabled = el.infiniteToggle.checked;
  updateTotal();
});

// ── Storage ──
async function get() {
  const d = await chrome.storage.local.get('reminders');
  return d.reminders || {};
}
async function set(r) {
  await chrome.storage.local.set({ reminders: r });
}

function esc(t) {
  const d = document.createElement('div');
  d.textContent = t;
  return d.innerHTML;
}

function fmtTime(mins, at) {
  const e = (Date.now() - at) / 60000;
  const left = Math.max(0, mins - e);
  const secs = Math.round(left * 60);
  if (secs <= 0) return { t: '即将触发', x: true };
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return { t: `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`, x: false };
  if (m > 0) return { t: `${m}:${String(s).padStart(2,'0')}`, x: false };
  return { t: `0:${String(s).padStart(2,'0')}`, x: false };
}

function pct(mins, at) {
  return Math.min(100, Math.round(((Date.now() - at) / 60000 / mins) * 100));
}

async function render() {
  const data = await get();
  const entries = Object.entries(data).filter(([k]) => k !== '_lastTriggered');
  el.reminderCount.textContent = entries.length;

  if (!entries.length && !data._lastTriggered) {
    el.reminderList.innerHTML = `
      <div class="empty">
        <div class="empty-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
        </div>
        <p class="empty-title">没有进行中的循环</p>
        <p class="empty-sub">点击右上角 <span class="empty-plus">+</span> 新建</p>
      </div>`;
    return;
  }

  const lh = data._lastTriggered ? `
    <div class="card dead">
      <div class="card-body">
        <div class="card-top">
          <span class="card-msg">${esc(data._lastTriggered.message || '专注循环')}</span>
          <button class="cxl" data-id="_lastTriggered">✕</button>
        </div>
        <div class="card-meta"><span class="p-badge dead-badge">已完成</span></div>
      </div>
    </div>` : '';

  const lh2 = entries.sort(([,a], [,b]) => b.createdAt - a.createdAt)
    .map(([id, r]) => {
      const ph = r.phase || 'work';
      const mins = ph === 'work' ? r.workMinutes : r.restMinutes;
      const t = fmtTime(mins, r.createdAt);
      const pg = pct(mins, r.createdAt);
      const inf = r.infinite;
      const cl = inf ? `第 ${r.currentCycle || 1} 轮` : `第 ${r.currentCycle || 1}/${r.cycles || 1} 轮`;
      return `
        <div class="card phase-${ph} ${t.x ? 'pulse' : ''}" data-id="${id}">
          <div class="card-body">
            <div class="card-top">
              <span class="card-msg">
                <span class="ph-dot ph-${ph}"></span>
                ${esc(r.message || '专注时间')}
              </span>
              <button class="cxl" data-id="${id}">✕</button>
            </div>
            <div class="card-meta">
              <span class="ph-badge ph-${ph}">${ph === 'work' ? '🎯' : '☕'} ${ph === 'work' ? '工作' : '休息'}</span>
              <span class="cycle-num">${cl}</span>
              ${inf ? '<span class="inf-badge">∞</span>' : ''}
              ${r.sound ? '<span class="snd">🔊</span>' : ''}
            </div>
            <div class="card-time ${t.x ? 'txt-danger' : ''}">${t.t}</div>
            <div class="bar">
              <div class="bar-fill ${t.x ? 'bar-danger' : `bar-${ph}`}" style="width:${Math.min(pg,100)}%"></div>
            </div>
          </div>
        </div>`;
    }).join('');

  el.reminderList.innerHTML = lh + lh2;
}

async function startCycle(msg, work, rest, cycles, infinite, sound) {
  const data = await get();
  const id = 'c_' + Date.now() + Math.random().toString(36).slice(2,6);
  data[id] = {
    message: msg.trim(),
    workMinutes: work,
    restMinutes: rest,
    cycles: infinite ? 1 : cycles,
    infinite,
    currentCycle: 1,
    phase: 'work',
    createdAt: Date.now(),
    sound
  };
  chrome.alarms.create(id, { delayInMinutes: work });
  await set(data);
  await render();
}

async function cancel(id) {
  const data = await get();
  delete data[id];
  chrome.alarms.clear(id);
  await set(data);
  chrome.runtime.sendMessage({ type: 'clear-active-toast' }).catch(() => {});
  await render();
}

async function clearAll() {
  const data = await get();
  Object.keys(data).filter(k => k !== '_lastTriggered').forEach(n => chrome.alarms.clear(n));
  await chrome.storage.local.set({ reminders: {} });
  await render();
}

function resetForm() {
  el.msgInput.value = '';
  el.workVal.value = 25;
  el.restVal.value = 5;
  el.cycleVal.value = 4;
  el.cycleVal.disabled = false;
  el.infiniteToggle.checked = false;
  el.soundToggle.checked = true;
  updateTotal();
}

el.cycleForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = el.msgInput.value.trim() || '专注时间';
  const w = parseInt(el.workVal.value) || 25;
  const r = parseInt(el.restVal.value) || 5;
  const c = parseInt(el.cycleVal.value) || 4;
  const inf = el.infiniteToggle.checked;
  if (w < 1 || r < 1 || (!inf && c < 1)) return;
  await startCycle(msg, w, r, c, inf, el.soundToggle.checked);
  resetForm();
  closeModal();
});

el.reminderList.addEventListener('click', async (e) => {
  const x = e.target.closest('.cxl');
  if (x) await cancel(x.dataset.id);
});

el.clearAll.addEventListener('click', clearAll);

document.addEventListener('DOMContentLoaded', async () => {
  await render();
  if (tick) clearInterval(tick);
  tick = setInterval(render, 1000);
  updateTotal();
});
