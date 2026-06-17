/* ================================================
   SCHEDLY — Settings Page JS (settings.js)
   ================================================ */

let currentSection = 'general';

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  applyTheme();
  await loadUser();
  await loadSettings();
  setupNavigation();
  setupEventListeners();
});

// ─────────────────────────────────────────────
// THEME
// ─────────────────────────────────────────────
function applyTheme() {
  if (localStorage.getItem('schedly-theme') === 'dark') {
    document.documentElement.classList.add('dark-mode');
  }
}

function setTheme(theme) {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark-mode');
    localStorage.setItem('schedly-theme', 'dark');
  } else {
    document.documentElement.classList.remove('dark-mode');
    localStorage.setItem('schedly-theme', 'light');
  }
}

// ─────────────────────────────────────────────
// API HELPER
// ─────────────────────────────────────────────
async function api(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include'
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch('/api' + path, opts);
  if (res.status === 401) { window.location.href = '/auth.html'; return null; }
  return res;
}

// ─────────────────────────────────────────────
// LOAD USER
// ─────────────────────────────────────────────
async function loadUser() {
  try {
    const res = await api('GET', '/auth/me');
    if (!res || !res.ok) { window.location.href = '/auth.html'; return; }
    const { user } = await res.json();
    const initials = user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    const el = document.getElementById('nav-initials');
    if (el) el.textContent = initials;
    const nameEl = document.getElementById('nav-user-name');
    if (nameEl) nameEl.textContent = user.name;
  } catch (e) {
    console.warn('loadUser error:', e);
  }
}

// ─────────────────────────────────────────────
// LOAD SETTINGS
// ─────────────────────────────────────────────
async function loadSettings() {
  try {
    const res = await api('GET', '/settings');
    if (!res || !res.ok) return;
    const { settings } = await res.json();
    populateForm(settings);
  } catch (e) {
    console.error('loadSettings error:', e);
  }
}

function populateForm(s) {
  // Language
  setSelectValue('sel-language', s.language || 'id');

  // Timezone
  setSelectValue('sel-timezone', s.timezone || 'Asia/Jakarta');

  // Date format — radio
  setRadioGroup('date_format', s.date_format || 'DD/MM/YYYY');

  // Time format — radio
  setRadioGroup('time_format', s.time_format || '24h');

  // First day of week — radio
  setRadioGroup('first_day_week', String(s.first_day_week ?? '1'));

  // Email reminder — toggle
  const emailToggle = document.getElementById('toggle-email-reminder');
  if (emailToggle) {
    emailToggle.checked = !!s.email_reminder;
    updateToggleStatus('status-email-reminder', !!s.email_reminder);
  }

  // Default theme
  const currentTheme = localStorage.getItem('schedly-theme') || s.default_theme || 'light';
  const themeRadio = document.querySelector(`input[name="default_theme"][value="${currentTheme}"]`);
  if (themeRadio) themeRadio.checked = true;
  highlightThemeOption(currentTheme);
}

function setSelectValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value;
}

function setRadioGroup(name, value) {
  document.querySelectorAll(`.radio-option[data-name="${name}"]`).forEach(opt => {
    const isSelected = opt.dataset.value === String(value);
    opt.classList.toggle('selected', isSelected);
  });
}

function highlightThemeOption(theme) {
  document.querySelectorAll('.theme-option').forEach(opt => {
    const input = opt.querySelector('input[type="radio"]');
    if (input) input.checked = input.value === theme;
  });
}

function updateToggleStatus(id, isOn) {
  const el = document.getElementById(id);
  if (el) el.textContent = isOn ? 'Aktif' : 'Mati';
}

// ─────────────────────────────────────────────
// SAVE SETTINGS
// ─────────────────────────────────────────────
async function saveSection(section) {
  const data = collectSectionData(section);
  if (!data) return;

  const btn = document.querySelector(`#section-${section} .btn-save-settings`);
  const feedback = document.querySelector(`#section-${section} .save-feedback`);

  if (btn) { btn.classList.add('saving'); btn.textContent = 'Menyimpan...'; }

  try {
    const res = await api('PUT', '/settings', data);
    if (!res) return;

    if (res.ok) {
      // Apply theme change immediately if in appearance section
      if (data.default_theme) setTheme(data.default_theme);

      showToast('Pengaturan berhasil disimpan', 'success');
      if (feedback) { feedback.textContent = '✓ Tersimpan'; feedback.classList.add('show'); feedback.classList.remove('error'); setTimeout(() => feedback.classList.remove('show'), 2500); }
    } else {
      const err = await res.json().catch(() => ({}));
      showToast(err.message || 'Gagal menyimpan', 'error');
      if (feedback) { feedback.textContent = '✗ Gagal'; feedback.classList.add('show', 'error'); setTimeout(() => feedback.classList.remove('show','error'), 2500); }
    }
  } catch (e) {
    showToast('Koneksi gagal', 'error');
  } finally {
    if (btn) { btn.classList.remove('saving'); btn.textContent = 'Simpan'; }
  }
}

function collectSectionData(section) {
  const data = {};
  if (section === 'general') {
    data.language = document.getElementById('sel-language')?.value;
  }
  if (section === 'time') {
    data.timezone = document.getElementById('sel-timezone')?.value;
    data.date_format = getSelectedRadio('date_format');
    data.time_format = getSelectedRadio('time_format');
    data.first_day_week = parseInt(getSelectedRadio('first_day_week') || '1');
  }
  if (section === 'notifications') {
    const tog = document.getElementById('toggle-email-reminder');
    data.email_reminder = tog ? (tog.checked ? 1 : 0) : 1;
  }
  if (section === 'appearance') {
    const themeRadio = document.querySelector('input[name="default_theme"]:checked');
    data.default_theme = themeRadio?.value || 'light';
  }
  return Object.keys(data).length ? data : null;
}

function getSelectedRadio(name) {
  const el = document.querySelector(`.radio-option[data-name="${name}"].selected`);
  return el ? el.dataset.value : null;
}

// ─────────────────────────────────────────────
// NAVIGATION
// ─────────────────────────────────────────────
function switchSection(id) {
  // Update sidebar active
  document.querySelectorAll('.snav-item').forEach(el => el.classList.toggle('active', el.dataset.section === id));
  // Show/hide sections
  document.querySelectorAll('.settings-section').forEach(el => el.classList.toggle('active', el.id === `section-${id}`));
  currentSection = id;
}

function setupNavigation() {
  document.querySelectorAll('.snav-item').forEach(el => {
    el.addEventListener('click', () => switchSection(el.dataset.section));
  });
  // Activate first section
  switchSection('general');
}

// ─────────────────────────────────────────────
// EVENT LISTENERS
// ─────────────────────────────────────────────
function setupEventListeners() {
  // Radio options click
  document.querySelectorAll('.radio-option').forEach(opt => {
    opt.addEventListener('click', () => {
      const name = opt.dataset.name;
      document.querySelectorAll(`.radio-option[data-name="${name}"]`).forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      // If theme option, apply instantly
      if (name === 'default_theme') {
        setTheme(opt.dataset.value);
        highlightThemeOption(opt.dataset.value);
      }
    });
  });

  // Theme radio buttons
  document.querySelectorAll('input[name="default_theme"]').forEach(inp => {
    inp.addEventListener('change', () => {
      setTheme(inp.value);
      highlightThemeOption(inp.value);
    });
  });

  // Email reminder toggle
  const emailToggle = document.getElementById('toggle-email-reminder');
  if (emailToggle) {
    emailToggle.addEventListener('change', () => {
      updateToggleStatus('status-email-reminder', emailToggle.checked);
    });
  }

  // Save buttons
  document.querySelectorAll('.btn-save-settings').forEach(btn => {
    btn.addEventListener('click', () => {
      const section = btn.closest('.settings-section')?.id?.replace('section-', '');
      if (section) saveSection(section);
    });
  });

  // Logout handler
  const logoutBtn = document.getElementById('btn-settings-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await api('POST', '/auth/logout');
      window.location.href = '/auth.html';
    });
  }
}

// ─────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icon = type === 'success' ? '✓' : '✗';
  toast.innerHTML = `<span>${icon}</span><span>${escHtml(message)}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

function escHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
