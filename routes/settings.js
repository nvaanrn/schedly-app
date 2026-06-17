const express = require('express');
const { db } = require('../config/db');
const { requireAuth } = require('../middlewares/auth');

const router = express.Router();
router.use(requireAuth);

// Kolom yang diizinkan diubah
const ALLOWED_FIELDS = ['language', 'timezone', 'date_format', 'time_format', 'email_reminder', 'default_theme', 'first_day_week'];

// GET /api/settings — Ambil pengaturan user, buat default jika belum ada
router.get('/', async (req, res) => {
  try {
    const uid = req.session.userId;
    let [rows] = await db.execute('SELECT * FROM user_settings WHERE user_id = ?', [uid]);

    if (!rows.length) {
      // Buat pengaturan default untuk user ini
      await db.execute('INSERT IGNORE INTO user_settings (user_id) VALUES (?)', [uid]);
      [rows] = await db.execute('SELECT * FROM user_settings WHERE user_id = ?', [uid]);
    }

    res.json({ settings: rows[0] });
  } catch (e) {
    console.error('Get settings error:', e);
    res.status(500).json({ message: 'Gagal mengambil pengaturan' });
  }
});

// PUT /api/settings — Simpan/update pengaturan user
router.put('/', async (req, res) => {
  try {
    const uid = req.session.userId;

    // Filter hanya field yang diizinkan
    const updates = {};
    for (const key of ALLOWED_FIELDS) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (!Object.keys(updates).length) {
      return res.status(400).json({ message: 'Tidak ada data yang diperbarui' });
    }

    const keys = Object.keys(updates);
    const values = Object.values(updates);

    // UPSERT: insert jika belum ada, update jika sudah ada
    await db.execute(
      `INSERT INTO user_settings (user_id, ${keys.join(', ')})
       VALUES (?, ${keys.map(() => '?').join(', ')})
       ON DUPLICATE KEY UPDATE ${keys.map(k => `${k} = VALUES(${k})`).join(', ')}`,
      [uid, ...values]
    );

    const [rows] = await db.execute('SELECT * FROM user_settings WHERE user_id = ?', [uid]);
    res.json({ settings: rows[0], message: 'Pengaturan berhasil disimpan' });
  } catch (e) {
    console.error('Update settings error:', e);
    res.status(500).json({ message: 'Gagal menyimpan pengaturan' });
  }
});

module.exports = router;
