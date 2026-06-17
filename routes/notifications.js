const express = require('express');
const { db } = require('../config/db');
const { requireAuth } = require('../middlewares/auth');

const router = express.Router();

router.use(requireAuth);

// GET / — Ambil daftar notifikasi (limit 50)
router.get('/', async (req, res) => {
  try {
    const [notifs] = await db.execute(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [req.session.userId]
    );
    res.json({ notifications: notifs });
  } catch (e) {
    res.status(500).json({ message: 'Gagal mengambil notifikasi' });
  }
});

// PUT /:id/read — Tandai satu notifikasi telah dibaca
router.put('/:id/read', async (req, res) => {
  try {
    await db.execute(
      'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
      [req.params.id, req.session.userId]
    );
    res.json({ message: 'Notifikasi dibaca' });
  } catch (e) {
    res.status(500).json({ message: 'Gagal update notifikasi' });
  }
});

// PUT /read-all — Tandai semua notifikasi telah dibaca
router.put('/read-all', async (req, res) => {
  try {
    await db.execute(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0',
      [req.session.userId]
    );
    res.json({ message: 'Semua notifikasi dibaca' });
  } catch (e) {
    res.status(500).json({ message: 'Gagal update notifikasi' });
  }
});

module.exports = router;
