const express = require('express');
const { body } = require('express-validator');
const { db } = require('../config/db');
const { requireAuth, handleValidationErrors } = require('../middlewares/auth');

const router = express.Router();

router.use(requireAuth);

// GET / — Ambil semua kategori milik user
router.get('/', async (req, res) => {
  try {
    const [cats] = await db.execute(
      'SELECT * FROM categories WHERE user_id = ? ORDER BY name ASC',
      [req.session.userId]
    );
    res.json({ categories: cats });
  } catch (e) {
    res.status(500).json({ message: 'Gagal mengambil kategori' });
  }
});

// POST / — Buat kategori baru
router.post('/',
  [
    body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Nama kategori wajib diisi'),
    body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Format warna tidak valid')
  ],
  async (req, res) => {
    const err = handleValidationErrors(req, res);
    if (err) return;

    const { name, color = '#5C6AC4' } = req.body;

    try {
      const [result] = await db.execute(
        'INSERT INTO categories (user_id, name, color) VALUES (?, ?, ?)',
        [req.session.userId, name, color]
      );
      const [rows] = await db.execute('SELECT * FROM categories WHERE id = ?', [result.insertId]);
      res.status(201).json({ category: rows[0], message: 'Kategori berhasil ditambahkan' });
    } catch (e) {
      res.status(500).json({ message: 'Gagal membuat kategori' });
    }
  }
);

// PUT /:id — Update kategori
router.put('/:id',
  [
    body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Nama kategori wajib diisi')
  ],
  async (req, res) => {
    const err = handleValidationErrors(req, res);
    if (err) return;

    try {
      const [rows] = await db.execute(
        'SELECT id FROM categories WHERE id = ? AND user_id = ?',
        [req.params.id, req.session.userId]
      );
      if (rows.length === 0) return res.status(404).json({ message: 'Kategori tidak ditemukan' });

      const { name, color } = req.body;
      await db.execute(
        'UPDATE categories SET name=?, color=? WHERE id=? AND user_id=?',
        [name, color || '#5C6AC4', req.params.id, req.session.userId]
      );
      res.json({ message: 'Kategori berhasil diperbarui' });
    } catch (e) {
      res.status(500).json({ message: 'Gagal memperbarui kategori' });
    }
  }
);

// DELETE /:id — Hapus kategori
router.delete('/:id', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id FROM categories WHERE id = ? AND user_id = ?',
      [req.params.id, req.session.userId]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Kategori tidak ditemukan' });

    // Tasks yang pakai kategori ini akan di-set NULL (sudah di-handle oleh FK ON DELETE SET NULL di DB)
    await db.execute('DELETE FROM categories WHERE id=? AND user_id=?', [req.params.id, req.session.userId]);
    res.json({ message: 'Kategori berhasil dihapus' });
  } catch (e) {
    res.status(500).json({ message: 'Gagal menghapus kategori' });
  }
});

module.exports = router;
