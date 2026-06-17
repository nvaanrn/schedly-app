const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { body } = require('express-validator');
const { db } = require('../config/db');
const { sendMail } = require('../config/mailer');
const { requireAuth, handleValidationErrors } = require('../middlewares/auth');

const router = express.Router();

// POST /register — Daftar akun baru
router.post('/register',
  [
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Nama minimal 2 karakter'),
    body('email').isEmail().normalizeEmail().withMessage('Format email tidak valid'),
    body('password').isLength({ min: 8 }).withMessage('Password minimal 8 karakter')
  ],
  async (req, res) => {
    const err = handleValidationErrors(req, res);
    if (err) return;

    const { name, email, password } = req.body;

    try {
      // Cek apakah email sudah terdaftar
      const [rows] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
      if (rows.length > 0) {
        return res.status(409).json({ message: 'Email sudah terdaftar' });
      }

      // Hash password
      const hashedPass = await bcrypt.hash(password, 12);

      // Simpan user
      const [result] = await db.execute(
        'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
        [name, email, hashedPass]
      );

      // Buat kategori default untuk user baru
      const defaultCats = [
        ['Pribadi', '#5C6AC4'],
        ['Kerja', '#059669'],
        ['Kuliah', '#D97706']
      ];
      for (const [catName, color] of defaultCats) {
        await db.execute(
          'INSERT INTO categories (user_id, name, color) VALUES (?, ?, ?)',
          [result.insertId, catName, color]
        );
      }

      res.status(201).json({ message: 'Akun berhasil dibuat' });
    } catch (e) {
      console.error('Register error:', e);
      res.status(500).json({ message: 'Terjadi kesalahan server' });
    }
  }
);

// POST /login — Masuk
router.post('/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Format email tidak valid'),
    body('password').notEmpty().withMessage('Password wajib diisi')
  ],
  async (req, res) => {
    const err = handleValidationErrors(req, res);
    if (err) return;

    const { email, password } = req.body;

    try {
      const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
      if (rows.length === 0) {
        return res.status(401).json({ message: 'Email atau password salah' });
      }

      const user = rows[0];
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ message: 'Email atau password salah' });
      }

      // Simpan ke session
      req.session.userId = user.id;
      req.session.userName = user.name;

      res.json({
        message: 'Login berhasil',
        user: { id: user.id, name: user.name, email: user.email }
      });
    } catch (e) {
      console.error('Login error:', e);
      res.status(500).json({ message: 'Terjadi kesalahan server' });
    }
  }
);

// POST /logout — Keluar
router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ message: 'Gagal logout' });
    res.clearCookie('connect.sid');
    res.json({ message: 'Logout berhasil' });
  });
});

// GET /me — Info user yang sedang login
router.get('/me', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, name, email, created_at FROM users WHERE id = ?',
      [req.session.userId]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'User tidak ditemukan' });
    res.json({ user: rows[0] });
  } catch (e) {
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

// POST /forgot-password
router.post('/forgot-password',
  [body('email').isEmail().normalizeEmail().withMessage('Format email tidak valid')],
  async (req, res) => {
    const err = handleValidationErrors(req, res);
    if (err) return;
    try {
      const [rows] = await db.execute('SELECT id, name, email FROM users WHERE email=?', [req.body.email]);
      // Selalu response sukses (keamanan - jangan bocorkan info akun)
      if (!rows.length) return res.json({ message: 'Jika email terdaftar, link reset telah dikirim.' });
      const user = rows[0];
      const token = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 jam
      await db.execute('DELETE FROM password_resets WHERE user_id=?', [user.id]);
      await db.execute('INSERT INTO password_resets (user_id, token, expires_at) VALUES (?,?,?)',
        [user.id, token, expires.toISOString().slice(0, 19).replace('T', ' ')]);
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const resetLink = `${baseUrl}/reset-password.html?token=${token}`;
      await sendMail({
        to: user.email,
        subject: '🔑 Reset Password Schedly',
        html: `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;background:#f5f3ee;border-radius:12px">
          <h2 style="color:#5C6AC4">🔑 Reset Password</h2>
          <p>Halo <strong>${user.name}</strong>,</p>
          <p>Klik tombol di bawah untuk mereset password kamu (berlaku 1 jam):</p>
          <a href="${resetLink}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#5C6AC4;color:white;border-radius:8px;text-decoration:none;font-weight:600">Reset Password</a>
          <p>Atau copy link ini:<br><small>${resetLink}</small></p>
          <p style="font-size:0.8rem;color:#6B7280">Abaikan email ini jika kamu tidak meminta reset password.</p>
        </div>`
      });
      res.json({ message: 'Jika email terdaftar, link reset telah dikirim.' });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: 'Gagal memproses permintaan' });
    }
  }
);

// POST /reset-password
router.post('/reset-password',
  [
    body('token').notEmpty().withMessage('Token tidak valid'),
    body('password').isLength({ min: 8 }).withMessage('Password minimal 8 karakter')
  ],
  async (req, res) => {
    const err = handleValidationErrors(req, res);
    if (err) return;
    try {
      const [rows] = await db.execute(
        `SELECT * FROM password_resets WHERE token=? AND used=0 AND expires_at > NOW()`,
        [req.body.token]
      );
      if (!rows.length) return res.status(400).json({ message: 'Token tidak valid atau sudah kadaluarsa' });
      const hashed = await bcrypt.hash(req.body.password, 12);
      await db.execute('UPDATE users SET password=? WHERE id=?', [hashed, rows[0].user_id]);
      await db.execute('UPDATE password_resets SET used=1 WHERE id=?', [rows[0].id]);
      res.json({ message: 'Password berhasil direset. Silakan masuk.' });
    } catch (e) {
      res.status(500).json({ message: 'Gagal mereset password' });
    }
  }
);

module.exports = router;
