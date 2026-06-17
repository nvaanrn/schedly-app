const token = new URLSearchParams(window.location.search).get('token');
if (!token) {
  document.getElementById('panel-form').style.display = 'none';
  document.getElementById('panel-invalid').style.display = 'block';
}

function checkStrength(pass) {
  const bars = ['s1','s2','s3','s4'].map(id => document.getElementById(id));
  const label = document.getElementById('strength-label');
  const colors = ['#EF4444','#F59E0B','#3B82F6','#10B981'];
  const labels = ['','Lemah','Sedang','Kuat','Sangat Kuat'];
  let score = 0;
  if (pass.length >= 8) score++;
  if (/[A-Z]/.test(pass)) score++;
  if (/[0-9]/.test(pass)) score++;
  if (/[^A-Za-z0-9]/.test(pass)) score++;
  bars.forEach((b,i) => b.style.background = i < score ? colors[score-1] : '#E2E0DC');
  label.textContent = pass ? labels[score] : '';
  label.style.color = score > 0 ? colors[score-1] : '#6B7280';
}
document.getElementById('new-pass').addEventListener('input', e => checkStrength(e.target.value));

document.getElementById('reset-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const pass = document.getElementById('new-pass').value;
  const conf = document.getElementById('confirm-pass').value;
  document.querySelectorAll('.field-error').forEach(el => el.classList.remove('show'));
  document.querySelectorAll('.form-input').forEach(el => el.classList.remove('error'));

  let valid = true;
  if (pass.length < 8) {
    document.getElementById('new-pass').classList.add('error');
    document.getElementById('pass-err').classList.add('show');
    valid = false;
  }
  if (pass !== conf) {
    document.getElementById('confirm-pass').classList.add('error');
    document.getElementById('confirm-err').classList.add('show');
    valid = false;
  }
  if (!valid) return;

  const btn = document.getElementById('reset-btn');
  btn.classList.add('loading'); btn.disabled = true;

  try {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password: pass })
    });
    const data = await res.json();
    if (res.ok) {
      document.getElementById('reset-success').textContent = data.message + ' Mengarahkan ke login...';
      document.getElementById('reset-success').classList.add('show');
      document.getElementById('reset-form').style.display = 'none';
      setTimeout(() => window.location.href = '/auth.html', 2500);
    } else {
      if (res.status === 400 && data.message.includes('Token')) {
        document.getElementById('panel-form').style.display = 'none';
        document.getElementById('panel-invalid').style.display = 'block';
      } else {
        document.getElementById('reset-error').textContent = data.message;
        document.getElementById('reset-error').classList.add('show');
      }
    }
  } catch {
    document.getElementById('reset-error').textContent = 'Tidak dapat terhubung ke server';
    document.getElementById('reset-error').classList.add('show');
  }
  btn.classList.remove('loading'); btn.disabled = false;
});
