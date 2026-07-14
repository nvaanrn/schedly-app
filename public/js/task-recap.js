/* ================================================
   SCHEDLY — Task Recap JS
   task-recap.js
   ================================================ */

// ===== STATE =====
let currentPeriod = 'week';
let currentDate = getLocalDateStr();
let recapData = null;

// ===== INIT =====
document.addEventListener('DOMContentLoaded', async () => {
  applyTheme();
  await loadUser();
  await loadTaskRecap();
  setupEvents();
});

// ===== THEME =====
function applyTheme() {
  if (localStorage.getItem('schedly-theme') === 'dark') {
    document.documentElement.classList.add('dark-mode');
  }
}

// ===== API HELPER =====
async function api(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include'
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch('/api' + path, opts);
  if (res.status === 401) {
    window.location.href = '/auth.html';
    return null;
  }
  return res;
}

// ===== LOAD USER =====
async function loadUser() {
  try {
    const res = await api('GET', '/auth/me');
    if (!res || !res.ok) {
      window.location.href = '/auth.html';
      return;
    }
    const { user } = await res.json();
    const initials = user.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
    document.getElementById('nav-avatar').textContent = initials;
    document.getElementById('nav-name').textContent = user.name;
  } catch (e) {
    /* offline / dev mode — silently ignore */
    console.warn('loadUser failed (offline?):', e.message);
  }
}

// ===== LOAD RECORDING DATA =====
async function loadTaskRecap() {
  showLoading(true);
  try {
    const res = await api('GET', `/task-recap?period=${currentPeriod}&date=${currentDate}`);
    if (!res || !res.ok) return;
    recapData = await res.json();
    renderAll();
  } catch (e) {
    console.error('loadTaskRecap error:', e);
  }
  showLoading(false);
}

// ===== RENDER ALL =====
function renderAll() {
  if (!recapData) return;
  renderDateLabel();
  renderStats();
  renderCompletion();
  renderPriorityChart();
  renderCategoryChart();
  renderTaskList();
}

// ===== DATE LABEL =====
function renderDateLabel() {
  const { start, end } = recapData.range; // 'YYYY-MM-DD HH:MM:SS' or 'YYYY-MM-DD'
  const startD = new Date(start);
  const endD   = new Date(end);
  // API end is typically exclusive (start of next period), so step back 1 day for inclusive display
  endD.setDate(endD.getDate() - 1);

  const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  const MONTHS_FULL  = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const DAYS         = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];

  let label = '';

  if (currentPeriod === 'day') {
    label = `${DAYS[startD.getDay()]}, ${startD.getDate()} ${MONTHS_FULL[startD.getMonth()]} ${startD.getFullYear()}`;
  } else if (currentPeriod === 'week') {
    const sameMonth = startD.getMonth() === endD.getMonth() && startD.getFullYear() === endD.getFullYear();
    if (sameMonth) {
      label = `${startD.getDate()} \u2013 ${endD.getDate()} ${MONTHS_FULL[startD.getMonth()]} ${startD.getFullYear()}`;
    } else {
      label = `${startD.getDate()} ${MONTHS_SHORT[startD.getMonth()]} \u2013 ${endD.getDate()} ${MONTHS_SHORT[endD.getMonth()]} ${endD.getFullYear()}`;
    }
  } else if (currentPeriod === 'month') {
    label = `${MONTHS_FULL[startD.getMonth()]} ${startD.getFullYear()}`;
  } else if (currentPeriod === 'year') {
    label = `${startD.getFullYear()}`;
  }

  document.getElementById('date-label').textContent = label;
}

// ===== STATS =====
function renderStats() {
  const { total, done, pending, overdue } = recapData.summary;
  document.getElementById('stat-total').textContent   = total   ?? 0;
  document.getElementById('stat-done').textContent    = done    ?? 0;
  document.getElementById('stat-pending').textContent = pending ?? 0;
  document.getElementById('stat-overdue').textContent = overdue ?? 0;
}

// ===== COMPLETION BAR =====
function renderCompletion() {
  const { total, done } = recapData.summary;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  document.getElementById('completion-pct').textContent = pct + '%';

  // Animate on next frame so CSS transition fires
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.getElementById('completion-fill').style.width = pct + '%';
    });
  });

  let subLabel;
  if (total === 0) {
    subLabel = 'Belum ada tugas dalam periode ini';
  } else if (pct === 100) {
    subLabel = '🎉 Semua tugas selesai!';
  } else {
    subLabel = `${done} dari ${total} tugas diselesaikan`;
  }
  document.getElementById('completion-label').textContent = subLabel;
}

// ===== PRIORITY CHART =====
function renderPriorityChart() {
  const { byPriority } = recapData;
  const total = recapData.summary.total || 1;

  const LABELS = { high: 'Tinggi', medium: 'Sedang', low: 'Rendah' };
  const COLORS = { high: '#DC2626', medium: '#D97706', low: '#059669' };

  const container = document.getElementById('priority-chart');
  container.innerHTML = ['high', 'medium', 'low'].map(p => {
    const count = byPriority[p] || 0;
    const width = total > 0 ? Math.round((count / total) * 100) : 0;
    return `<div class="priority-bar-row">
      <span class="pbar-label">${LABELS[p]}</span>
      <div class="pbar-track">
        <div class="pbar-fill" style="width:${width}%;background:${COLORS[p]}"></div>
      </div>
      <span class="pbar-count">${count}</span>
    </div>`;
  }).join('');
}

// ===== CATEGORY CHART =====
function renderCategoryChart() {
  const { byCategory } = recapData;
  const container = document.getElementById('category-chart');

  if (!byCategory || !byCategory.length) {
    container.innerHTML = '<div class="chart-empty">Tidak ada data kategori</div>';
    return;
  }

  container.innerHTML = byCategory.map(c => `
    <div class="cat-chart-row">
      <span class="cat-dot" style="background:${escHtml(c.color || '#6B7280')}"></span>
      <span class="cat-name">${escHtml(c.name)}</span>
      <span class="cat-count">${c.count} tugas</span>
    </div>
  `).join('');
}

// ===== TASK LIST =====
function renderTaskList() {
  const { tasks } = recapData;
  const now = new Date();

  const done    = tasks.filter(t => t.status === 'done');
  const overdue = tasks.filter(t => t.status === 'pending' && t.due_date && new Date(t.due_date) < now);
  const pending = tasks.filter(t => t.status === 'pending' && !(t.due_date && new Date(t.due_date) < now));

  const container = document.getElementById('task-list-container');

  if (!tasks.length) {
    container.innerHTML = `
      <div class="empty-rec">
        <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
        </svg>
        <p>Tidak ada tugas dalam periode ini</p>
      </div>`;
    return;
  }

  let html = '';
  if (done.length)    html += renderGroup('✓ Selesai',  done,    'success');
  if (overdue.length) html += renderGroup('⚠ Terlambat', overdue, 'danger');
  if (pending.length) html += renderGroup('○ Pending',   pending, 'pending');
  container.innerHTML = html;
}

// ===== RENDER GROUP =====
function renderGroup(title, tasks, type) {
  const PRIO_LABEL = { high: 'Tinggi', medium: 'Sedang', low: 'Rendah' };
  const PRIO_CLASS = { high: 'tag-high', medium: 'tag-medium', low: 'tag-low' };

  const items = tasks.map(t => {
    const dueStr = t.due_date ? formatDateTime(t.due_date) : '';
    const prioClass = PRIO_CLASS[t.priority] || 'tag-low';
    const prioLabel = PRIO_LABEL[t.priority]  || t.priority || '-';
    const catTag = t.category_name
      ? `<span class="rtask-tag tag-cat">
          <span style="background:${escHtml(t.category_color || '#6B7280')};display:inline-block;width:6px;height:6px;border-radius:50%;margin-right:4px;vertical-align:middle;"></span>${escHtml(t.category_name)}
        </span>`
      : '';

    return `<div class="rec-task-item ${t.status === 'done' ? 'is-done' : ''} ${type === 'danger' ? 'is-overdue' : ''}">
      <div class="rtask-status-icon ${type}"></div>
      <div class="rtask-body">
        <div class="rtask-title">${escHtml(t.title)}</div>
        ${dueStr ? `<div class="rtask-due">${dueStr}</div>` : ''}
      </div>
      <div class="rtask-tags">
        <span class="rtask-tag ${prioClass}">${prioLabel}</span>
        ${catTag}
      </div>
    </div>`;
  }).join('');

  return `<div class="task-group">
    <div class="group-header group-${type}">
      <span class="group-title">${title}</span>
      <span class="group-badge">${tasks.length}</span>
    </div>
    ${items}
  </div>`;
}

// ===== FORMAT DATE TIME =====
function formatDateTime(s) {
  if (!s) return '';
  const d = new Date(s);
  const MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  const hasTime = s.length > 10;
  const time = hasTime
    ? ` ${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')}`
    : '';
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}${time}`;
}

// ===== HELPERS =====
function getLocalDateStr(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  // Use local date parts to avoid UTC shift issues
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function escHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function showLoading(on) {
  const el = document.getElementById('loading-overlay');
  if (el) el.style.display = on ? 'flex' : 'none';
}

// ===== NAVIGATION =====
function navigatePrev() {
  const d = new Date(currentDate + 'T00:00:00');
  if      (currentPeriod === 'day')   d.setDate(d.getDate() - 1);
  else if (currentPeriod === 'week')  d.setDate(d.getDate() - 7);
  else if (currentPeriod === 'month') d.setMonth(d.getMonth() - 1);
  else if (currentPeriod === 'year')  d.setFullYear(d.getFullYear() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  currentDate = `${y}-${m}-${day}`;
  loadTaskRecap();
}

function navigateNext() {
  const d = new Date(currentDate + 'T00:00:00');
  if      (currentPeriod === 'day')   d.setDate(d.getDate() + 1);
  else if (currentPeriod === 'week')  d.setDate(d.getDate() + 7);
  else if (currentPeriod === 'month') d.setMonth(d.getMonth() + 1);
  else if (currentPeriod === 'year')  d.setFullYear(d.getFullYear() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  currentDate = `${y}-${m}-${day}`;
  loadTaskRecap();
}

function setPeriod(period) {
  currentPeriod = period;
  currentDate   = getLocalDateStr();
  document.querySelectorAll('.period-tab').forEach(b => {
    b.classList.toggle('active', b.dataset.period === period);
  });
  loadTaskRecap();
}

// ===== SETUP EVENTS =====
function setupEvents() {
  document.querySelectorAll('.period-tab').forEach(b => {
    b.addEventListener('click', () => setPeriod(b.dataset.period));
  });

  document.getElementById('btn-prev').addEventListener('click', navigatePrev);
  document.getElementById('btn-next').addEventListener('click', navigateNext);
  document.getElementById('btn-today').addEventListener('click', () => {
    currentDate = getLocalDateStr();
    loadTaskRecap();
  });
  document.getElementById('btn-export').addEventListener('click', exportCSV);
}

// ===== EXPORT CSV =====
function exportCSV() {
  if (!recapData || !recapData.tasks || !recapData.tasks.length) {
    alert('Tidak ada data untuk diekspor.');
    return;
  }

  const PRIO = { high: 'Tinggi', medium: 'Sedang', low: 'Rendah' };
  const headers = ['Judul', 'Status', 'Prioritas', 'Kategori', 'Deadline', 'Dibuat'];

  const rows = recapData.tasks.map(t => [
    `"${(t.title || '').replace(/"/g, '""')}"`,
    t.status === 'done' ? 'Selesai' : 'Pending',
    PRIO[t.priority] || t.priority || '-',
    t.category_name  || '-',
    t.due_date        || '-',
    t.created_at      || '-'
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url  = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href     = url;
  a.download = `schedly-rekap-${currentPeriod}-${currentDate}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
