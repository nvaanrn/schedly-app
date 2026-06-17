// =====================================================
// STATE
// =====================================================
let tasks = [];
let categories = [];
let notifications = [];
let currentView = 'today';
let currentFilter = 'all';
let selectedColor = '#5C6AC4';
let deleteTaskId = null;
let editingTaskId = null;

// =====================================================
// INIT
// =====================================================
document.addEventListener('DOMContentLoaded', async () => {
  await loadUser();
  await loadCategories();
  await loadTasks();
  await loadNotifications();
  updateStats();
  renderCatNav();
  renderTaskCatOptions();
  renderTasks();
  // Sinkron stat-card aktif dengan view awal
  const initCard = document.getElementById('statcard-' + currentView);
  if (initCard) initCard.classList.add('active');

  // Close dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    const notifWrap = document.getElementById('notif-wrap');
    if (notifWrap && !notifWrap.contains(e.target)) {
      document.getElementById('notif-dropdown')?.classList.remove('open');
      notifWrap.classList.remove('active');
    }
    const profileWrap = document.getElementById('profile-wrap');
    if (profileWrap && !profileWrap.contains(e.target) && e.target.closest('#profile-btn') === null) {
      document.getElementById('profile-dropdown')?.classList.remove('open');
      profileWrap.classList.remove('active');
    }
  });

  // Polling notifications
  setInterval(loadNotifications, 60000);
});

// =====================================================
// NOTIFICATIONS
// =====================================================
async function loadNotifications() {
  try {
    const res = await api('GET', '/notifications');
    if (res && res.ok) {
      const data = await res.json();
      notifications = data.notifications || [];
      renderNotifications();
    }
  } catch(e) { console.error('Gagal memuat notifikasi'); }
}

function renderNotifications() {
  const badge = document.getElementById('notif-badge');
  const list = document.getElementById('notif-list');
  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (unreadCount > 0) {
    badge.style.display = 'flex';
    badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
  } else {
    badge.style.display = 'none';
  }

  if (notifications.length === 0) {
    list.innerHTML = '<div class="notif-empty">Belum ada notifikasi</div>';
    return;
  }

  list.innerHTML = notifications.map(n => {
    const time = new Date(n.created_at).toLocaleString('id-ID', { dateStyle:'short', timeStyle:'short' });
    return `
      <div class="notif-item ${n.is_read ? '' : 'unread'}" onclick="markNotifRead(${n.id})">
        <div class="notif-item-title">${escapeHtml(n.title)}</div>
        <div class="notif-item-msg">${escapeHtml(n.message)}</div>
        <div class="notif-item-time">${time}</div>
      </div>
    `;
  }).join('');
}

function toggleNotifDropdown() {
  const dropdown = document.getElementById('notif-dropdown');
  const wrap = document.getElementById('notif-wrap');
  
  // Tutup profile dropdown jika terbuka
  const profileDropdown = document.getElementById('profile-dropdown');
  if (profileDropdown && profileDropdown.classList.contains('open')) {
    profileDropdown.classList.remove('open');
    document.getElementById('profile-wrap').classList.remove('active');
  }

  dropdown.classList.toggle('open');
  wrap.classList.toggle('active');
}

async function markNotifRead(id) {
  const notif = notifications.find(n => n.id == id);
  if (notif && !notif.is_read) {
    try {
      await api('PUT', '/notifications/' + id + '/read');
      notif.is_read = 1;
      renderNotifications();
    } catch(e) {}
  }
}

async function markAllNotifRead() {
  const unreadCount = notifications.filter(n => !n.is_read).length;
  if (unreadCount === 0) return;
  try {
    await api('PUT', '/notifications/read-all');
    notifications.forEach(n => n.is_read = 1);
    renderNotifications();
  } catch(e) {}
}

// =====================================================
// API HELPERS
// =====================================================
async function api(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include'
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch('/api' + path, opts);
  if (res.status === 401) { window.location.href = '/auth.html'; return; }
  return res;
}

// =====================================================
// USER
// =====================================================
async function loadUser() {
  try {
    const res = await api('GET', '/auth/me');
    if (res && res.ok) {
      const { user } = await res.json();
      const initials = user.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
      document.getElementById('user-name-display').textContent = user.name;
      document.getElementById('user-avatar').textContent = initials;
      document.getElementById('topbar-avatar').textContent = initials;
      document.getElementById('dropdown-avatar').textContent = initials;
      document.getElementById('dropdown-name').textContent = user.name;
      document.getElementById('dropdown-email').textContent = user.email;
    } else {
      window.location.href = '/auth.html';
    }
  } catch {
    // Demo mode — use mock data
    const initials = 'DU';
    document.getElementById('user-name-display').textContent = 'Demo User';
    document.getElementById('user-avatar').textContent = initials;
    document.getElementById('topbar-avatar').textContent = initials;
    document.getElementById('dropdown-avatar').textContent = initials;
    document.getElementById('dropdown-name').textContent = 'Demo User';
    document.getElementById('dropdown-email').textContent = 'demo@schedly.app';
    loadDemoData();
  }
}

function loadDemoData() {
  categories = [
    { id: 1, name: 'Kuliah', color: '#5C6AC4' },
    { id: 2, name: 'Kerja', color: '#059669' },
    { id: 3, name: 'Pribadi', color: '#D97706' }
  ];
  const today = getLocalDate();
  const tomorrow = getLocalDate(1);
  const past = getLocalDate(-1);
  tasks = [
    { id: 1, title: 'Kerjakan laporan UAS', description: 'Selesaikan bab 3 dan 4', due_date: today, priority: 'high', status: 'pending', category_id: 1 },
    { id: 2, title: 'Meeting tim proyek', description: '', due_date: today, priority: 'medium', status: 'pending', category_id: 2 },
    { id: 3, title: 'Beli bahan makanan', description: '', due_date: tomorrow, priority: 'low', status: 'pending', category_id: 3 },
    { id: 4, title: 'Review kode teman', description: '', due_date: past, priority: 'high', status: 'pending', category_id: 2 },
    { id: 5, title: 'Baca buku Python', description: 'Bab 7 - OOP', due_date: tomorrow, priority: 'medium', status: 'done', category_id: 1 },
  ];
}

async function logout() {
  try { await api('POST', '/auth/logout'); } catch {}
  window.location.href = '/auth.html';
}

// =====================================================
// TASKS
// =====================================================
async function loadTasks() {
  try {
    const res = await api('GET', '/tasks');
    if (res && res.ok) {
      const data = await res.json();
      tasks = data.tasks || [];
    }
  } catch { /* use demo data */ }
}

async function loadCategories() {
  try {
    const res = await api('GET', '/categories');
    if (res && res.ok) {
      const data = await res.json();
      categories = data.categories || [];
    }
  } catch { /* use demo data */ }
}

// =====================================================
// VIEWS & FILTERS
// =====================================================
function setView(view, btn) {
  currentView = view;
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const titles = { today:'Hari Ini', upcoming:'Mendatang', all:'Semua Tugas', done:'Selesai', overdue:'Terlambat', calendar:'Kalender' };
  // Untuk view kategori, cari nama dari array categories
  let pageTitle = titles[view];
  if (!pageTitle && view.startsWith('cat_')) {
    const catId = view.split('_')[1];
    const cat = categories.find(c => String(c.id) === catId);
    pageTitle = cat ? cat.name : 'Kategori';
  }
  document.getElementById('page-title').textContent = pageTitle || view;

  // Sinkronkan highlight stat-card dengan view aktif
  const statCardMap = { today: 'statcard-today', upcoming: 'statcard-upcoming', done: 'statcard-done', overdue: 'statcard-overdue' };
  document.querySelectorAll('.stat-card').forEach(c => c.classList.remove('active'));
  if (statCardMap[view]) {
    const activeCard = document.getElementById(statCardMap[view]);
    if (activeCard) activeCard.classList.add('active');
  }

  const taskArea = document.querySelector('.task-area');
  const statsRow = document.querySelector('.stats-row');
  const calView  = document.getElementById('calendar-view');
  const quickAdd = document.querySelector('.quick-add');
  const btnNew   = document.querySelector('.btn-primary');

  if (view === 'calendar') {
    taskArea.style.display = 'none';
    statsRow.style.display = 'none';
    calView.style.display = 'grid';
    if (btnNew) btnNew.style.display = 'none';
    renderCalendar();
  } else {
    taskArea.style.display = '';
    statsRow.style.display = '';
    calView.style.display = 'none';
    if (btnNew) btnNew.style.display = '';
    document.getElementById('search-input').value = '';
    currentFilter = 'all';
    document.querySelectorAll('.filter-btn').forEach((b,i) => b.classList.toggle('active', i===0));
    renderTasks();
  }
  closeSidebar();
}

function setFilter(f, btn) {
  currentFilter = f;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderTasks();
}

function getFilteredTasks() {
  const today = getLocalDate();
  const in7 = getLocalDate(7);
  const q = document.getElementById('search-input').value.toLowerCase();

  let filtered = tasks.filter(t => {
    const tDue = t.due_date ? (t.due_date.length > 10 ? t.due_date.substring(0, 10) : t.due_date) : null;
    if (q && !t.title.toLowerCase().includes(q)) return false;
    if (currentView === 'today') return tDue === today && t.status !== 'done';
    if (currentView === 'upcoming') return tDue > today && tDue <= in7 && t.status !== 'done';
    if (currentView === 'done') return t.status === 'done';
    if (currentView === 'all') return t.status !== 'done';
    if (currentView === 'overdue') return tDue !== null && tDue < today && t.status !== 'done';
    // category filter
    if (currentView.startsWith('cat_')) return t.category_id == currentView.split('_')[1] && t.status !== 'done';
    return true;
  });

  if (currentFilter !== 'all') {
    filtered = filtered.filter(t => t.priority === currentFilter);
  }

  return filtered;
}

// =====================================================
// RENDER
// =====================================================
function renderTasks() {
  const list = document.getElementById('task-list');
  const empty = document.getElementById('empty-state');
  const filtered = getFilteredTasks();

  if (filtered.length === 0) {
    list.innerHTML = '';
    empty.classList.add('show');
    const emptyMsgs = {
      today: ['Tidak ada tugas hari ini', 'Nikmati hari mu! Atau tambah tugas baru.'],
      upcoming: ['Tidak ada tugas mendatang', 'Jadwalkan sesuatu untuk minggu ini.'],
      done: ['Belum ada tugas selesai', 'Selesaikan tugasmu dan akan muncul di sini.'],
      all: ['Belum ada tugas', 'Mulai dengan menambahkan tugas baru di atas.'],
      overdue: ['Tidak ada tugas terlambat', 'Semua tugas selesai tepat waktu! 🎉']
    };
    const msg = emptyMsgs[currentView] || ['Tidak ada tugas', 'Tambah tugas baru menggunakan tombol di atas.'];
    document.getElementById('empty-title').textContent = msg[0];
    document.getElementById('empty-sub').textContent = msg[1];
    return;
  }

  empty.classList.remove('show');
  list.innerHTML = filtered.map(t => renderTaskItem(t)).join('');
}

function renderTaskItem(t) {
  const cat = categories.find(c => c.id == t.category_id);
  const today = getLocalDate();
  const tDue = t.due_date ? (t.due_date.length > 10 ? t.due_date.substring(0, 10) : t.due_date) : null;
  const isOverdue = tDue && tDue < today && t.status !== 'done';

  let dueBadge = '';
  if (t.due_date) {
    const d = formatDate(t.due_date);
    const cls = isOverdue ? 'tag-due overdue' : 'tag-due';
    dueBadge = `<span class="task-tag ${cls}">
      <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      ${d}
    </span>`;
  }

  const prioClass = { high: 'tag-priority-high', medium: 'tag-priority-medium', low: 'tag-priority-low' };
  const prioLabel = { high: 'Tinggi', medium: 'Sedang', low: 'Rendah' };

  return `<li class="task-item ${t.status==='done'?'done':''}" id="task-${t.id}">
    <input type="checkbox" class="task-check" ${t.status==='done'?'checked':''} onchange="toggleTask(${t.id})"/>
    <div class="task-body">
      <div class="task-title">${escapeHtml(t.title)}</div>
      <div class="task-meta">
        ${cat ? `<span class="task-tag tag-cat"><span style="width:6px;height:6px;border-radius:50%;background:${cat.color};display:inline-block;"></span>${escapeHtml(cat.name)}</span>` : ''}
        ${dueBadge}
        <span class="task-tag ${prioClass[t.priority]}">${prioLabel[t.priority]}</span>
      </div>
    </div>
    <div class="task-actions">
      <button class="task-action-btn" title="Edit" onclick="openEditModal(${t.id})">
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
      </button>
      <button class="task-action-btn delete" title="Hapus" onclick="openDeleteModal(${t.id})">
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
      </button>
    </div>
  </li>`;
}

function renderCatNav() {
  const list = document.getElementById('cat-nav-list');
  list.innerHTML = categories.map(c => `
    <button class="nav-item" data-view="cat_${c.id}" onclick="setView('cat_${c.id}', this)">
      <span class="category-dot" style="background:${c.color}"></span>
      ${escapeHtml(c.name)}
    </button>
  `).join('');
  // Jika sedang di view kategori, perbarui judul halaman dengan nama terbaru
  if (currentView.startsWith('cat_')) {
    const catId = currentView.split('_')[1];
    const cat = categories.find(c => String(c.id) === catId);
    if (cat) document.getElementById('page-title').textContent = cat.name;
  }
}

function renderTaskCatOptions() {
  const sel = document.getElementById('task-cat-input');
  const prev = sel.value;
  sel.innerHTML = '<option value="">— Tanpa Kategori —</option>' +
    categories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
  sel.value = prev;
}

// =====================================================
// STATS
// =====================================================
function updateStats() {
  const today = getLocalDate();
  const in7 = getLocalDate(7);
  const getDue = t => t.due_date ? (t.due_date.length > 10 ? t.due_date.substring(0, 10) : t.due_date) : null;
  document.getElementById('stat-today').textContent = tasks.filter(t => getDue(t) === today && t.status !== 'done').length;
  document.getElementById('stat-upcoming').textContent = tasks.filter(t => getDue(t) > today && getDue(t) <= in7 && t.status !== 'done').length;
  document.getElementById('stat-done').textContent = tasks.filter(t => t.status === 'done').length;
  const overdueCount = tasks.filter(t => getDue(t) !== null && getDue(t) < today && t.status !== 'done').length;
  document.getElementById('stat-overdue').textContent = overdueCount;
  document.getElementById('badge-today').textContent = tasks.filter(t => getDue(t) === today && t.status !== 'done').length;
  document.getElementById('badge-upcoming').textContent = tasks.filter(t => getDue(t) > today && getDue(t) <= in7 && t.status !== 'done').length;
  const badgeOverdue = document.getElementById('badge-overdue');
  if (badgeOverdue) {
    badgeOverdue.textContent = overdueCount;
    badgeOverdue.style.display = overdueCount > 0 ? '' : 'none';
  }
}

// =====================================================
// CRUD - TASKS
// =====================================================
async function quickAdd() {
  const inp = document.getElementById('quick-input');
  const title = inp.value.trim();
  if (!title) { inp.focus(); return; }
  const today = getLocalDate();
  await createTask({ title, description: '', due_date: today, priority: 'medium', category_id: null });
  inp.value = '';
}

async function createTask(data) {
  try {
    const res = await api('POST', '/tasks', data);
    if (res && res.ok) {
      const r = await res.json();
      tasks.unshift(r.task);
    } else {
      // demo mode
      const newTask = { id: Date.now(), ...data, status: 'pending' };
      tasks.unshift(newTask);
    }
  } catch {
    const newTask = { id: Date.now(), ...data, status: 'pending' };
    tasks.unshift(newTask);
  }
  updateStats();
  renderTasks();
  toast('Tugas berhasil ditambahkan', 'success');
}

async function saveTask() {
  const title = document.getElementById('task-title-input').value.trim();
  const titleErr = document.getElementById('title-err');
  const titleInp = document.getElementById('task-title-input');

  titleErr.classList.remove('show');
  titleInp.classList.remove('error');

  if (!title) {
    titleErr.classList.add('show');
    titleInp.classList.add('error');
    titleInp.focus();
    return;
  }

  const rawDate = document.getElementById('task-due-input').value;
  const data = {
    title,
    description: document.getElementById('task-desc-input').value.trim(),
    due_date: (rawDate && rawDate.trim() !== '') ? rawDate.trim() : null,
    priority: document.getElementById('task-priority-input').value,
    category_id: document.getElementById('task-cat-input').value || null,
    status: 'pending'
  };

  if (editingTaskId) {
    // Update
    try {
      const res = await api('PUT', '/tasks/' + editingTaskId, data);
      if (res && res.ok) {
        const r = await res.json();
        const idx = tasks.findIndex(t => t.id == editingTaskId);
        if (idx !== -1) tasks[idx] = r.task;
      } else {
        const idx = tasks.findIndex(t => t.id == editingTaskId);
        if (idx !== -1) tasks[idx] = { ...tasks[idx], ...data };
      }
    } catch {
      const idx = tasks.findIndex(t => t.id == editingTaskId);
      if (idx !== -1) tasks[idx] = { ...tasks[idx], ...data };
    }
    toast('Tugas berhasil diperbarui', 'success');
  } else {
    closeTaskModal();
    await createTask(data);
    return;
  }

  closeTaskModal();
  updateStats();
  renderTasks();
}

async function toggleTask(id) {
  const task = tasks.find(t => t.id == id);
  if (!task) return;
  const newStatus = task.status === 'done' ? 'pending' : 'done';
  try {
    await api('PUT', '/tasks/' + id, { ...task, status: newStatus });
  } catch {}
  task.status = newStatus;
  updateStats();
  renderTasks();
  toast(newStatus === 'done' ? 'Tugas ditandai selesai!' : 'Tugas dibuka kembali', 'success');
}

async function confirmDelete() {
  if (!deleteTaskId) return;
  try {
    await api('DELETE', '/tasks/' + deleteTaskId);
  } catch {}
  tasks = tasks.filter(t => t.id != deleteTaskId);
  closeDeleteModal();
  updateStats();
  renderTasks();
  toast('Tugas berhasil dihapus');
}

// =====================================================
// CRUD - CATEGORIES
// =====================================================
async function saveCategory() {
  const name = document.getElementById('cat-name-input').value.trim();
  if (!name) {
    document.getElementById('cat-name-input').focus();
    return;
  }
  try {
    const res = await api('POST', '/categories', { name, color: selectedColor });
    if (res && res.ok) {
      const r = await res.json();
      categories.push(r.category);
    } else {
      categories.push({ id: Date.now(), name, color: selectedColor });
    }
  } catch {
    categories.push({ id: Date.now(), name, color: selectedColor });
  }
  closeCatModal();
  renderCatNav();
  renderTaskCatOptions();
  toast('Kategori berhasil ditambahkan', 'success');
}

// =====================================================
// MODAL CONTROLS
// =====================================================
function openTaskModal() {
  editingTaskId = null;
  document.getElementById('modal-title').textContent = 'Tugas Baru';
  document.getElementById('task-form').reset();
  document.getElementById('task-id').value = '';
  document.getElementById('title-err').classList.remove('show');
  document.getElementById('task-title-input').classList.remove('error');
  document.getElementById('task-due-input').value = getLocalDate();
  renderTaskCatOptions();
  document.getElementById('task-overlay').classList.add('open');
  setTimeout(() => document.getElementById('task-title-input').focus(), 150);
}

function openEditModal(id) {
  const t = tasks.find(x => x.id == id);
  if (!t) return;
  editingTaskId = id;
  document.getElementById('modal-title').textContent = 'Edit Tugas';
  document.getElementById('task-title-input').value = t.title;
  document.getElementById('task-desc-input').value = t.description || '';
  // Konversi due_date (DATE atau DATETIME) ke format datetime-local
  if (t.due_date) {
    const raw = t.due_date.length > 10 ? t.due_date.substring(0,16).replace(' ','T') : t.due_date + 'T00:00';
    document.getElementById('task-due-input').value = raw;
  } else {
    document.getElementById('task-due-input').value = '';
  }
  document.getElementById('task-priority-input').value = t.priority || 'medium';
  renderTaskCatOptions();
  document.getElementById('task-cat-input').value = t.category_id || '';
  document.getElementById('title-err').classList.remove('show');
  document.getElementById('task-title-input').classList.remove('error');
  document.getElementById('task-overlay').classList.add('open');
  setTimeout(() => document.getElementById('task-title-input').focus(), 150);
}

function closeTaskModal() {
  document.getElementById('task-overlay').classList.remove('open');
  editingTaskId = null;
}

function openDeleteModal(id) {
  deleteTaskId = id;
  document.getElementById('delete-overlay').classList.add('open');
}
function closeDeleteModal() {
  document.getElementById('delete-overlay').classList.remove('open');
  deleteTaskId = null;
}

function openCatModal() {
  document.getElementById('cat-name-input').value = '';
  selectedColor = '#5C6AC4';
  document.querySelectorAll('.color-opt').forEach(b => b.style.outline = 'none');
  document.querySelectorAll('.color-opt')[0].style.outline = '2px solid white';
  document.getElementById('cat-overlay').classList.add('open');
  setTimeout(() => document.getElementById('cat-name-input').focus(), 150);
}
function closeCatModal() {
  document.getElementById('cat-overlay').classList.remove('open');
}

function selectColor(btn) {
  selectedColor = btn.dataset.color;
  document.querySelectorAll('.color-opt').forEach(b => b.style.outline = 'none');
  btn.style.outline = '2px solid ' + btn.dataset.color;
  btn.style.outlineOffset = '2px';
}

// =====================================================
// SIDEBAR (MOBILE)
// =====================================================
function toggleSidebar() {
  const s = document.getElementById('sidebar');
  const o = document.getElementById('sidebarOverlay');
  s.classList.toggle('open');
  o.classList.toggle('show');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('show');
}

// TOAST
function toast(msg, type = '') {
  const c = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.innerHTML = `<svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="2.5">
    ${type==='success' ? '<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>' :
      type==='error' ? '<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>' :
      '<path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>'}
  </svg>${msg}`;
  c.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

// UTILS
function getLocalDate(offsetDays = 0) {
  const now = new Date();
  now.setDate(now.getDate() + offsetDays);
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + d;
}

function formatDate(dateStr) {
  const cleanDate = dateStr.length > 10 ? dateStr.substring(0, 10) : dateStr;
  const d = new Date(cleanDate + 'T00:00:00');
  const today = new Date(); today.setHours(0,0,0,0);
  const diff = Math.round((d - today) / 86400000);
  if (diff === 0) return 'Hari ini';
  if (diff === 1) return 'Besok';
  if (diff === -1) return 'Kemarin';
  return d.toLocaleDateString('id-ID', { day:'numeric', month:'short' });
}

function escapeHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// =====================================================
// PROFILE DROPDOWN
// =====================================================
function toggleProfileDropdown() {
  const dd = document.getElementById('profile-dropdown');
  const wrap = document.getElementById('profile-wrap');
  const isOpen = dd.classList.contains('open');
  if (isOpen) { dd.classList.remove('open'); wrap.classList.remove('active'); }
  else { dd.classList.add('open'); wrap.classList.add('active'); }
}
function closeProfileDropdown() {
  document.getElementById('profile-dropdown').classList.remove('open');
  document.getElementById('profile-wrap').classList.remove('active');
}
document.addEventListener('click', (e) => {
  if (!document.getElementById('profile-wrap').contains(e.target)) closeProfileDropdown();
});

// =====================================================
// THEME TOGGLE
// =====================================================
function toggleTheme() {
  const isDark = document.documentElement.classList.toggle('dark-mode');
  localStorage.setItem('schedly-theme', isDark ? 'dark' : 'light');
  document.getElementById('theme-label').textContent = isDark ? 'Mode Terang' : 'Mode Gelap';
  document.getElementById('theme-icon').innerHTML = isDark
    ? '<path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z"/>'
    : '<path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>';
}
// Apply saved theme on load
(function() {
  if (localStorage.getItem('schedly-theme') === 'dark') {
    document.documentElement.classList.add('dark-mode');
    setTimeout(() => {
      if (document.getElementById('theme-label')) {
        document.getElementById('theme-label').textContent = 'Mode Terang';
        document.getElementById('theme-icon').innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z"/>';
      }
    }, 100);
  }
})();

// =====================================================
// CALENDAR
// =====================================================
let calYear = new Date().getFullYear();
let calMonth = new Date().getMonth();
let calSelected = null;
const MONTHS_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

// Bangun taskMap dari array tasks
function buildTaskMap() {
  const map = {};
  tasks.forEach(t => {
    if (!t.due_date) return;
    const d = t.due_date.length > 10 ? t.due_date.substring(0, 10) : t.due_date;
    if (!map[d]) map[d] = [];
    map[d].push(t);
  });
  return map;
}

// Render HANYA grid kalender (tidak rekursi)
function renderCalendarGrid() {
  document.getElementById('cal-month-label').textContent = `${MONTHS_ID[calMonth]} ${calYear}`;
  const grid = document.getElementById('cal-grid');
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const todayStr = getLocalDate();
  const taskMap = buildTaskMap();

  let html = '';
  for (let i = 0; i < firstDay; i++) html += '<div class="cal-cell empty"></div>';

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dayTasks = taskMap[dateStr] || [];
    const isToday    = dateStr === todayStr;
    const isSelected = dateStr === calSelected;

    // Maksimal 2 label tugas ditampilkan di cell
    let labelsHtml = '';
    if (dayTasks.length > 0) {
      const shown = dayTasks.slice(0, 2);
      shown.forEach(t => {
        const cls = t.status === 'done' ? 'cal-label done' :
                    t.priority === 'high' ? 'cal-label high' :
                    t.priority === 'low'  ? 'cal-label low'  : 'cal-label medium';
        labelsHtml += `<div class="${cls}">${escapeHtml(t.title)}</div>`;
      });
      if (dayTasks.length > 2) {
        labelsHtml += `<div class="cal-label-more">+${dayTasks.length - 2} lainnya</div>`;
      }
    }

    html += `<div class="cal-cell${isToday?' today':''}${isSelected?' selected':''}${dayTasks.length?' has-tasks':''}" onclick="calSelectDay('${dateStr}')">
      <span class="cal-day-num">${d}</span>
      ${labelsHtml ? `<div class="cal-labels">${labelsHtml}</div>` : ''}
    </div>`;
  }
  grid.innerHTML = html;
}

// Render HANYA panel detail — tidak memanggil renderCalendarGrid
function showCalDetail(dateStr) {
  const parts = dateStr.split('-');
  const label = `${parseInt(parts[2])} ${MONTHS_ID[parseInt(parts[1])-1]} ${parts[0]}`;
  document.getElementById('cal-detail-title').textContent = `Tugas — ${label}`;

  const dayTasks = tasks.filter(t => {
    if (!t.due_date) return false;
    return (t.due_date.length > 10 ? t.due_date.substring(0,10) : t.due_date) === dateStr;
  });

  const list = document.getElementById('cal-task-list');
  if (!dayTasks.length) {
    list.innerHTML = '<li class="cal-task-empty">Tidak ada tugas di tanggal ini</li>';
    return;
  }

  const prioLabel = { high:'Tinggi', medium:'Sedang', low:'Rendah' };
  const prioClass = { high:'tag-priority-high', medium:'tag-priority-medium', low:'tag-priority-low' };
  list.innerHTML = dayTasks.map(t => {
    const timeStr = t.due_date && t.due_date.length > 10 ? t.due_date.substring(11,16) : '';
    return `<li class="cal-task-item ${t.status==='done'?'done':''}" onclick="toggleTask(${t.id})" style="cursor:pointer" title="Klik untuk tandai selesai/buka">
      <span class="cal-task-check">${t.status==='done'?'✓':''}</span>
      <div class="cal-task-body">
        <div class="cal-task-title">${escapeHtml(t.title)}</div>
        ${timeStr ? `<div class="cal-task-time">⏰ ${timeStr}</div>` : ''}
      </div>
      <span class="task-tag ${prioClass[t.priority]}">${prioLabel[t.priority]}</span>
    </li>`;
  }).join('');
}

// Entry point utama — dipanggil dari setView('calendar')
function renderCalendar() {
  renderCalendarGrid();
  // Jika ada tanggal terpilih sebelumnya, tampilkan detailnya
  if (calSelected) showCalDetail(calSelected);
}

// Dipanggil saat user klik tanggal
function calSelectDay(dateStr) {
  calSelected = dateStr;
  // Re-render grid agar highlight selected berubah, tanpa rekursi
  renderCalendarGrid();
  // Update panel detail
  showCalDetail(dateStr);
}

function calPrev() {
  calMonth--;
  if (calMonth < 0) { calMonth = 11; calYear--; }
  calSelected = null;
  renderCalendarGrid();
  document.getElementById('cal-detail-title').textContent = 'Pilih tanggal untuk melihat tugas';
  document.getElementById('cal-task-list').innerHTML = '';
}
function calNext() {
  calMonth++;
  if (calMonth > 11) { calMonth = 0; calYear++; }
  calSelected = null;
  renderCalendarGrid();
  document.getElementById('cal-detail-title').textContent = 'Pilih tanggal untuk melihat tugas';
  document.getElementById('cal-task-list').innerHTML = '';
}
