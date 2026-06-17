  function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach((b,i) => {
      b.classList.toggle('active', (tab==='login'&&i===0)||(tab==='register'&&i===1));
    });
    document.querySelectorAll('.form-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('panel-' + tab).classList.add('active');
    // Sembunyikan tab bar saat di panel forgot
    document.querySelector('.tab-bar').style.display = tab === 'forgot' ? 'none' : '';
    clearErrors();
  }

  function clearErrors() {
    document.querySelectorAll('.field-error').forEach(el => el.classList.remove('show'));
    document.querySelectorAll('.form-input').forEach(el => el.classList.remove('error'));
    document.querySelectorAll('.alert').forEach(el => el.classList.remove('show'));
  }

  function showError(fieldId, errId) {
    const field = document.getElementById(fieldId);
    const err = document.getElementById(errId);
    if (field) field.classList.add('error');
    if (err) err.classList.add('show');
    return false;
  }

  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function checkStrength(pass) {
    const bars = [document.getElementById('s1'), document.getElementById('s2'),
                  document.getElementById('s3'), document.getElementById('s4')];
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

  function setLoading(btnId, loading) {
    const btn = document.getElementById(btnId);
    btn.classList.toggle('loading', loading);
    btn.disabled = loading;
  }

  // LOGIN
  document.getElementById('login-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    clearErrors();
    const email = document.getElementById('login-email').value.trim();
    const pass = document.getElementById('login-pass').value;
    let valid = true;
    if (!validateEmail(email)) { showError('login-email','login-email-err'); valid = false; }
    if (!pass) { showError('login-pass','login-pass-err'); valid = false; }
    if (!valid) return;

    setLoading('login-btn', true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass })
      });
      const data = await res.json();
      if (res.ok) {
        window.location.href = '/dashboard.html';
      } else {
        const alert = document.getElementById('login-alert');
        alert.textContent = data.message || 'Email atau password salah';
        alert.classList.add('show');
      }
    } catch {
      const alert = document.getElementById('login-alert');
      alert.textContent = 'Tidak dapat terhubung ke server';
      alert.classList.add('show');
    }
    setLoading('login-btn', false);
  });

  // REGISTER
  document.getElementById('register-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    clearErrors();
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const pass = document.getElementById('reg-pass').value;
    const confirm = document.getElementById('reg-confirm').value;
    let valid = true;
    if (name.length < 2) { showError('reg-name','reg-name-err'); valid = false; }
    if (!validateEmail(email)) { showError('reg-email','reg-email-err'); valid = false; }
    if (pass.length < 8) { showError('reg-pass','reg-pass-err'); valid = false; }
    if (pass !== confirm) { showError('reg-confirm','reg-confirm-err'); valid = false; }
    if (!valid) return;

    setLoading('reg-btn', true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password: pass })
      });
      const data = await res.json();
      if (res.ok) {
        const success = document.getElementById('reg-success');
        success.textContent = 'Akun berhasil dibuat! Silakan masuk.';
        success.classList.add('show');
        document.getElementById('register-form').reset();
        setTimeout(() => switchTab('login'), 1800);
      } else {
        const alert = document.getElementById('reg-alert');
        alert.textContent = data.message || 'Pendaftaran gagal';
        alert.classList.add('show');
      }
    } catch {
      const alert = document.getElementById('reg-alert');
      alert.textContent = 'Tidak dapat terhubung ke server';
      alert.classList.add('show');
    }
    setLoading('reg-btn', false);
  });
  // FORGOT PASSWORD
  document.getElementById('forgot-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    clearErrors();
    const email = document.getElementById('forgot-email').value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showError('forgot-email','forgot-email-err'); return;
    }
    setLoading('forgot-btn', true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      const success = document.getElementById('forgot-success');
      success.textContent = data.message + ' (Cek console server untuk link preview email)';
      success.classList.add('show');
      document.getElementById('forgot-form').reset();
    } catch {
      const alert = document.getElementById('forgot-alert');
      alert.textContent = 'Tidak dapat terhubung ke server';
      alert.classList.add('show');
    }
    setLoading('forgot-btn', false);
  });
