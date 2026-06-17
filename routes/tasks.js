const express = require('express');
const { body } = require('express-validator');
const { db } = require('../config/db');
const { requireAuth, handleValidationErrors } = require('../middlewares/auth');

const router = express.Router();

// Semua rute di sini memerlukan autentikasi
router.use(requireAuth);

// GET / — Ambil semua tugas milik user
router.get('/', async (req, res) => {
  try {
    const [tasks] = await db.execute(
      `SELECT t.*, c.name as category_name, c.color as category_color
       FROM tasks t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.user_id = ?
       ORDER BY 
         CASE t.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
         t.due_date ASC, t.created_at DESC`,
      [req.session.userId]
    );
    res.json({ tasks });
  } catch (e) {
    console.error('Get tasks error:', e);
    res.status(500).json({ message: 'Gagal mengambil data tugas' });
  }
});

// GET /:id — Ambil satu tugas
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT * FROM tasks WHERE id = ? AND user_id = ?',
      [req.params.id, req.session.userId]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Tugas tidak ditemukan' });
    res.json({ task: rows[0] });
  } catch (e) {
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

// POST / — Buat tugas baru
router.post('/',
  [
    body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Judul tugas wajib diisi (maks 200 karakter)'),
    body('description').optional().trim().isLength({ max: 1000 }).withMessage('Deskripsi maks 1000 karakter'),
    body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Prioritas tidak valid'),
    body('due_date').optional({ nullable: true }).custom((val) => {
      if (!val || val.trim() === '') return true;
      const clean = val.trim();
      const dateOnly = clean.length > 10 ? clean.substring(0, 10) : clean;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
        throw new Error('Format tanggal tidak valid');
      }
      return true;
    }),
    body('category_id').optional({ nullable: true }).isInt().withMessage('Kategori tidak valid')
  ],
  async (req, res) => {
    const err = handleValidationErrors(req, res);
    if (err) return;

    const { title, description, due_date, priority, category_id } = req.body;

    try {
      // Pastikan kategori milik user ini (jika ada)
      if (category_id) {
        const [cats] = await db.execute(
          'SELECT id FROM categories WHERE id = ? AND user_id = ?',
          [category_id, req.session.userId]
        );
        if (cats.length === 0) {
          return res.status(400).json({ message: 'Kategori tidak valid' });
        }
      }

      const [result] = await db.execute(
        `INSERT INTO tasks (user_id, category_id, title, description, due_date, priority, status)
         VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
        [
          req.session.userId,
          category_id || null,
          title,
          description || '',
          due_date || null,
          priority || 'medium'
        ]
      );

      const [rows] = await db.execute('SELECT * FROM tasks WHERE id = ?', [result.insertId]);
      res.status(201).json({ task: rows[0], message: 'Tugas berhasil ditambahkan' });
    } catch (e) {
      console.error('Create task error:', e);
      res.status(500).json({ message: 'Gagal membuat tugas' });
    }
  }
);

// PUT /:id — Update tugas
router.put('/:id',
  [
    body('title').optional().trim().isLength({ min: 1, max: 200 }).withMessage('Judul tugas wajib diisi'),
    body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Prioritas tidak valid'),
    body('status').optional().isIn(['pending', 'done']).withMessage('Status tidak valid'),
    body('due_date').optional({ nullable: true }).custom((val) => {
      if (!val || val.trim() === '') return true;
      const dateOnly = val.trim().length > 10 ? val.trim().substring(0, 10) : val.trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
        throw new Error('Format tanggal tidak valid');
      }
      return true;
    })
  ],
  async (req, res) => {
    const err = handleValidationErrors(req, res);
    if (err) return;

    const taskId = req.params.id;

    try {
      // Pastikan task milik user ini
      const [rows] = await db.execute(
        'SELECT * FROM tasks WHERE id = ? AND user_id = ?',
        [taskId, req.session.userId]
      );
      if (rows.length === 0) {
        return res.status(404).json({ message: 'Tugas tidak ditemukan' });
      }

      const current = rows[0];
      const {
        title = current.title,
        description = current.description,
        due_date = current.due_date,
        priority = current.priority,
        status = current.status,
        category_id = current.category_id
      } = req.body;

      let reminder_sent = current.reminder_sent;
      // Reset reminder jika due_date berubah atau status diubah kembali ke pending
      if (due_date !== current.due_date || (status === 'pending' && current.status !== 'pending')) {
        reminder_sent = 0;
      }

      await db.execute(
        `UPDATE tasks SET title=?, description=?, due_date=?, priority=?, status=?, category_id=?, reminder_sent=?, updated_at=NOW()
         WHERE id = ? AND user_id = ?`,
        [title, description, due_date || null, priority, status, category_id || null, reminder_sent, taskId, req.session.userId]
      );

      const [updated] = await db.execute('SELECT * FROM tasks WHERE id = ?', [taskId]);
      res.json({ task: updated[0], message: 'Tugas berhasil diperbarui' });
    } catch (e) {
      console.error('Update task error:', e);
      res.status(500).json({ message: 'Gagal diperbarui' });
    }
  }
);

// DELETE /:id — Hapus tugas
router.delete('/:id', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id FROM tasks WHERE id = ? AND user_id = ?',
      [req.params.id, req.session.userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Tugas tidak ditemukan' });
    }

    await db.execute('DELETE FROM tasks WHERE id = ?', [req.params.id]);
    res.json({ message: 'Tugas berhasil dihapus' });
  } catch (e) {
    console.error('Delete task error:', e);
    res.status(500).json({ message: 'Gagal menghapus tugas' });
  }
});

module.exports = router;
