// =============================================
// API Helper
// =============================================
async function api(method, path, body) {
  const opts = { method, headers: {'Content-Type':'application/json'}, credentials:'include' };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch('/api' + path, opts);
  if (res.status === 401) { window.location.href = '/auth.html'; return; }
  return res;
}

// =============================================
// INIT
// =============================================
document.addEventListener('DOMContentLoaded', async () => {
  await loadProfile();
  setupForms();
});

async function loadProfile() {
  try {
    const res = await api('GET', '/profile/stats');
    if (!res || !res.ok) { window.location.href = '/auth.html'; return; }
    const data = await res.json();
    const { stats, categories, user } = data;

    // Hero
    const initials = user.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
    document.getElementById('hero-avatar').textContent = initials;
    document.getElementById('hero-name').textContent = user.name;
    document.getElementById('hero-email').textContent = user.email;
    const joined = new Date(user.created_at).toLocaleDateString('id-ID', {year:'numeric',month:'long',day:'numeric'});
    document.getElementById('hero-since').textContent = 'Bergabung sejak ' + joined;

    // Stat boxes
    document.getElementById('stat-total').textContent   = stats.total;
    document.getElementById('stat-done').textContent    = stats.done;
    document.getElementById('stat-pending').textContent = stats.pending;
    document.getElementById('stat-overdue').textContent = stats.overdue;

    // Progress bar
    if (stats.total > 0) {
      const pct = Math.round(stats.done / stats.total * 100);
      document.getElementById('progress-wrap').style.display = 'block';
      document.getElementById('progress-pct').textContent = pct + '%';
      document.getElementById('progress-fill').style.width = pct + '%';
    }

    // Category stats
    const catEl = document.getElementById('cat-stats');
    catEl.innerHTML = categories.map(c => `
      <div class="cat-row">
        <span class="cat-dot" style="background:${c.color}"></span>
        <span class="cat-name">${escapeHtml(c.name)}</span>
        <span class="cat-count">${c.count} tugas</span>
      </div>`).join('');

    // Fill edit form
    document.getElementById('input-name').value  = user.name;
    document.getElementById('input-email').value = user.email;
  } catch(e) {
    console.error(e);
    window.location.href = '/auth.html';
  }
}

function setupForms() {
  // Edit nama
  document.getElementById('name-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('input-name').value.trim();
    if (name.length < 2) { showMsg('name-error', 'Nama minimal 2 karakter'); return; }
    clearMsg('name-success'); clearMsg('name-error');
    const btn = document.getElementById('btn-save-name');
    btn.disabled = true;
    try {
      const res = await api('PUT', '/profile/update', { name });
      const data = await res.json();
      if (res.ok) {
        showMsg('name-success', data.message);
        document.getElementById('hero-name').textContent = name;
        const initials = name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
        document.getElementById('hero-avatar').textContent = initials;
        toast('Nama berhasil diperbarui', 'success');
      } else {
        showMsg('name-error', data.message);
      }
    } catch(e) { showMsg('name-error', 'Gagal memperbarui nama'); }
    btn.disabled = false;
  });

  // Ganti password
  document.getElementById('pass-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMsg('pass-success'); clearMsg('pass-error');
    const oldp = document.getElementById('input-old-pass').value;
    const newp = document.getElementById('input-new-pass').value;
    const conf = document.getElementById('input-confirm-pass').value;
    if (!oldp) { showMsg('pass-error', 'Password lama wajib diisi'); return; }
    if (newp.length < 8) { showMsg('pass-error', 'Password baru minimal 8 karakter'); return; }
    if (newp !== conf) { showMsg('pass-error', 'Konfirmasi password tidak cocok'); return; }
    const btn = document.getElementById('btn-save-pass');
    btn.disabled = true;
    try {
      const res = await api('PUT', '/profile/change-password', { current_password: oldp, new_password: newp });
      const data = await res.json();
      if (res.ok) {
        showMsg('pass-success', data.message);
        document.getElementById('pass-form').reset();
        toast('Password berhasil diubah', 'success');
      } else {
        showMsg('pass-error', data.message);
      }
    } catch(e) { showMsg('pass-error', 'Gagal mengubah password'); }
    btn.disabled = false;
  });
}

function showMsg(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.classList.add('show');
}
function clearMsg(id) {
  const el = document.getElementById(id);
  el.textContent = '';
  el.classList.remove('show');
}

function checkStrength(pass) {
  const bars = ['s1','s2','s3','s4'].map(id => document.getElementById(id));
  const label = document.getElementById('strength-label');
  const colors = ['#EF4444','#F59E0B','#3B82F6','#10B981'];
  const labels = ['', 'Lemah', 'Sedang', 'Kuat', 'Sangat Kuat'];
  let score = 0;
  if (pass.length >= 8) score++;
  if (/[A-Z]/.test(pass)) score++;
  if (/[0-9]/.test(pass)) score++;
  if (/[^A-Za-z0-9]/.test(pass)) score++;
  bars.forEach((b, i) => b.style.background = i < score ? colors[score-1] : '#E2E0DC');
  label.textContent = pass ? labels[score] : '';
  label.style.color = score > 0 ? colors[score-1] : '#6B7280';
}

function toast(msg, type = '') {
  const c = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = msg;
  c.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

function escapeHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
