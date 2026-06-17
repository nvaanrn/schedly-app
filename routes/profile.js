const express = require('express');
const bcrypt = require('bcryptjs');
const { body } = require('express-validator');
const { db } = require('../config/db');
const { requireAuth, handleValidationErrors } = require('../middlewares/auth');

const router = express.Router();

router.use(requireAuth);

// GET /stats — ambil data statistik tugas & user info
router.get('/stats', async (req, res) => {
  try {
    const uid = req.session.userId;
    const [[total]] = await db.execute('SELECT COUNT(*) as n FROM tasks WHERE user_id=?', [uid]);
    const [[done]] = await db.execute(`SELECT COUNT(*) as n FROM tasks WHERE user_id=? AND status='done'`, [uid]);
    const [[overdue]] = await db.execute(`SELECT COUNT(*) as n FROM tasks WHERE user_id=? AND status='pending' AND due_date IS NOT NULL AND due_date < NOW()`, [uid]);
    const [cats] = await db.execute(`SELECT c.name, c.color, COUNT(t.id) as count FROM categories c LEFT JOIN tasks t ON t.category_id=c.id WHERE c.user_id=? GROUP BY c.id`, [uid]);
    const [user] = await db.execute('SELECT name, email, created_at FROM users WHERE id=?', [uid]);
    
    res.json({
      stats: {
        total: total.n,
        done: done.n,
        pending: total.n - done.n,
        overdue: overdue.n
      },
      categories: cats,
      user: user[0]
    });
  } catch (e) {
    res.status(500).json({ message: 'Gagal mengambil statistik profil' });
  }
});

// PUT /update — ubah nama lengkap user
router.put('/update',
  [
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Nama minimal 2 karakter')
  ],
  async (req, res) => {
    const err = handleValidationErrors(req, res);
    if (err) return;

    try {
      await db.execute('UPDATE users SET name=? WHERE id=?', [req.body.name, req.session.userId]);
      req.session.userName = req.body.name;
      res.json({ message: 'Nama berhasil diperbarui' });
    } catch (e) {
      res.status(500).json({ message: 'Gagal memperbarui nama' });
    }
  }
);

// PUT /change-password — ubah password
router.put('/change-password',
  [
    body('current_password').notEmpty().withMessage('Password lama wajib diisi'),
    body('new_password').isLength({ min: 8 }).withMessage('Password baru minimal 8 karakter')
  ],
  async (req, res) => {
    const err = handleValidationErrors(req, res);
    if (err) return;

    try {
      const [rows] = await db.execute('SELECT password FROM users WHERE id=?', [req.session.userId]);
      if (!rows.length) return res.status(404).json({ message: 'User tidak ditemukan' });

      const valid = await bcrypt.compare(req.body.current_password, rows[0].password);
      if (!valid) return res.status(400).json({ message: 'Password lama salah' });

      const hashed = await bcrypt.hash(req.body.new_password, 12);
      await db.execute('UPDATE users SET password=? WHERE id=?', [hashed, req.session.userId]);
      res.json({ message: 'Password berhasil diubah' });
    } catch (e) {
      res.status(500).json({ message: 'Gagal mengubah password' });
    }
  }
);

module.exports = router;
