// ================================================
// SCHEDLY - Backend Server (Node.js + Express)
// ================================================
require('dotenv').config();
const express    = require('express');
const mysql      = require('mysql2/promise');
const bcrypt     = require('bcryptjs');
const session    = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const cors       = require('cors');
const { body, validationResult } = require('express-validator');
const path       = require('path');
const cron       = require('node-cron');
const nodemailer = require('nodemailer');
const crypto     = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// ================================================
// MIDDLEWARE
// ================================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS (untuk development — izinkan semua origin di jaringan lokal)
const corsOptions = process.env.NODE_ENV === 'production'
  ? { origin: process.env.FRONTEND_URL, credentials: true }
  : { origin: true, credentials: true };
app.use(cors(corsOptions));

// Session Store (MySQL) — agar session tidak hilang saat server restart
const sessionStoreOptions = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'schedly_db',
  clearExpired: true,
  checkExpirationInterval: 15 * 60 * 1000, // bersihkan session expired setiap 15 menit
  expiration: 7 * 24 * 60 * 60 * 1000,     // session expired 7 hari
  createDatabaseTable: true,
  charset: 'utf8mb4_bin'
};
const sessionStore = new MySQLStore(sessionStoreOptions);

app.use(session({
  secret: process.env.SESSION_SECRET || 'schedly_secret_key_ganti_ini',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 hari
  }
}));

// Static files (sajikan file HTML)
app.use(express.static(path.join(__dirname, 'public')));

// ================================================
// DATABASE CONNECTION
// ================================================
let db;

async function initDB() {
  db = await mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'schedly_db',
    waitForConnections: true,
    connectionLimit: 10,
    charset: 'utf8mb4',
    dateStrings: true
  });

  // Buat tabel jika belum ada
  await createTables();
  console.log('✅ Database terhubung');
}

async function createTables() {
  // Tabel users
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(150) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Tabel categories
  await db.execute(`
    CREATE TABLE IF NOT EXISTS categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      name VARCHAR(100) NOT NULL,
      color VARCHAR(7) DEFAULT '#5C6AC4',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Tabel tasks
  await db.execute(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      category_id INT DEFAULT NULL,
      title VARCHAR(200) NOT NULL,
      description TEXT,
      due_date DATETIME DEFAULT NULL,
      priority ENUM('low','medium','high') DEFAULT 'medium',
      status ENUM('pending','done') DEFAULT 'pending',
      reminder_sent TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Tabel password_resets
  await db.execute(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      token VARCHAR(64) NOT NULL UNIQUE,
      expires_at DATETIME NOT NULL,
      used TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Tabel notifications
  await db.execute(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      title VARCHAR(100) NOT NULL,
      message TEXT NOT NULL,
      is_read TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Migrasi: pastikan due_date DATETIME dan reminder_sent ada
  try {
    await db.execute(`ALTER TABLE tasks MODIFY COLUMN due_date DATETIME DEFAULT NULL`);
    await db.execute(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reminder_sent TINYINT(1) DEFAULT 0`);
  } catch(e) { /* kolom sudah ada */ }

  console.log('✅ Tabel database siap');
}

// ================================================
// EMAIL HELPER (Ethereal auto-account untuk testing)
// ================================================
let mailerTransport = null;
async function getMailer() {
  if (mailerTransport) return mailerTransport;
  if (process.env.EMAIL_MODE === 'smtp' && process.env.EMAIL_USER) {
    mailerTransport = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT) || 587,
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });
  } else {
    // Ethereal: akun test gratis, preview di console
    const testAccount = await nodemailer.createTestAccount();
    mailerTransport = nodemailer.createTransport({
      host: 'smtp.ethereal.email', port: 587,
      auth: { user: testAccount.user, pass: testAccount.pass }
    });
    console.log('📧 Ethereal email aktif:', testAccount.user);
  }
  return mailerTransport;
}

async function sendMail({ to, subject, html }) {
  try {
    const t = await getMailer();
    const info = await t.sendMail({
      from: process.env.EMAIL_FROM || 'Schedly <noreply@schedly.app>',
      to, subject, html
    });
    const preview = nodemailer.getTestMessageUrl(info);
    if (preview) console.log('📬 Preview email:', preview);
    return true;
  } catch(e) {
    console.error('❌ Gagal kirim email:', e.message);
    return false;
  }
}

// ================================================
// CRON JOB: Reminder H-12 Jam
// ================================================
function setupCronJobs() {
  // Cek setiap 30 menit
  cron.schedule('*/30 * * * *', async () => {
    try {
      const now = new Date();
      const t12 = new Date(now.getTime() + 12 * 60 * 60 * 1000);
      const from = t12.toISOString().slice(0, 16).replace('T', ' ');
      const to   = new Date(t12.getTime() + 30 * 60 * 1000).toISOString().slice(0, 16).replace('T', ' ');

      const [tasks] = await db.execute(
        `SELECT t.id, t.user_id, t.title, t.due_date, u.name, u.email
         FROM tasks t JOIN users u ON t.user_id = u.id
         WHERE t.status='pending' AND t.reminder_sent=0
           AND t.due_date >= ? AND t.due_date < ?`,
        [from, to]
      );

      for (const task of tasks) {
        const due = new Date(task.due_date).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' });
        await sendMail({
          to: task.email,
          subject: `⏰ Pengingat: "${task.title}" deadline 12 jam lagi!`,
          html: `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;background:#f5f3ee;border-radius:12px">
            <h2 style="color:#5C6AC4">⏰ Pengingat Deadline</h2>
            <p>Halo <strong>${task.name}</strong>,</p>
            <p>Tugas <strong>"${task.title}"</strong> akan deadline pada:</p>
            <p style="font-size:1.2rem;color:#DC2626;font-weight:600">${due}</p>
            <p>Segera selesaikan sebelum terlambat!</p>
            <hr style="border:none;border-top:1px solid #e2e0dc;margin:16px 0">
            <p style="font-size:0.8rem;color:#6B7280">— Tim Schedly</p>
          </div>`
        });
        await db.execute('UPDATE tasks SET reminder_sent=1 WHERE id=?', [task.id]);
        await db.execute('INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)', [task.user_id, 'Pengingat Tugas', `Tugas "${task.title}" akan deadline pada ${due}.`]);
      }
      if (tasks.length > 0) console.log(`✅ Reminder terkirim: ${tasks.length} tugas`);
    } catch(e) { console.error('Cron error:', e.message); }
  });
  console.log('⏱️  Cron job aktif (cek reminder setiap 30 menit)');
}

// ================================================
// MIDDLEWARE: Cek Login
// ================================================
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ message: 'Silakan login terlebih dahulu' });
  }
  next();
}

// ================================================
// HELPER: Format validasi error
// ================================================
function handleValidationErrors(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Data tidak valid',
      errors: errors.array().map(e => ({ field: e.path, msg: e.msg }))
    });
  }
  return null;
}

// ================================================
// ROUTES: AUTH
// ================================================

// POST /api/auth/register — Daftar akun baru
app.post('/api/auth/register',
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

// POST /api/auth/login — Masuk
app.post('/api/auth/login',
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

// POST /api/auth/logout — Keluar
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ message: 'Gagal logout' });
    res.clearCookie('connect.sid');
    res.json({ message: 'Logout berhasil' });
  });
});

// GET /api/auth/me — Info user yang sedang login
app.get('/api/auth/me', requireAuth, async (req, res) => {
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

// ================================================
// ROUTES: TASKS (CRUD)
// ================================================

// GET /api/tasks — Ambil semua tugas milik user
app.get('/api/tasks', requireAuth, async (req, res) => {
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

// GET /api/tasks/:id — Ambil satu tugas
app.get('/api/tasks/:id', requireAuth, async (req, res) => {
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

// POST /api/tasks — Buat tugas baru
app.post('/api/tasks',
  requireAuth,
  [
    body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Judul tugas wajib diisi (maks 200 karakter)'),
    body('description').optional().trim().isLength({ max: 1000 }).withMessage('Deskripsi maks 1000 karakter'),
    body('priority').optional().isIn(['low','medium','high']).withMessage('Prioritas tidak valid'),
    body('due_date').optional({ nullable: true }).custom((val) => {
      if (!val || val.trim() === '') return true;
      const clean = val.trim();
      // Terima YYYY-MM-DD atau YYYY-MM-DDTHH:mm
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

// PUT /api/tasks/:id — Update tugas
app.put('/api/tasks/:id',
  requireAuth,
  [
    body('title').optional().trim().isLength({ min: 1, max: 200 }).withMessage('Judul tugas wajib diisi'),
    body('priority').optional().isIn(['low','medium','high']).withMessage('Prioritas tidak valid'),
    body('status').optional().isIn(['pending','done']).withMessage('Status tidak valid'),
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

      await db.execute(
        `UPDATE tasks SET title=?, description=?, due_date=?, priority=?, status=?, category_id=?, updated_at=NOW()
         WHERE id = ? AND user_id = ?`,
        [title, description, due_date || null, priority, status, category_id || null, taskId, req.session.userId]
      );

      const [updated] = await db.execute('SELECT * FROM tasks WHERE id = ?', [taskId]);
      res.json({ task: updated[0], message: 'Tugas berhasil diperbarui' });
    } catch (e) {
      console.error('Update task error:', e);
      res.status(500).json({ message: 'Gagal memperbarui tugas' });
    }
  }
);

// DELETE /api/tasks/:id — Hapus tugas
app.delete('/api/tasks/:id', requireAuth, async (req, res) => {
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

// ================================================
// ROUTES: CATEGORIES (CRUD)
// ================================================

// GET /api/categories
app.get('/api/categories', requireAuth, async (req, res) => {
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

// POST /api/categories
app.post('/api/categories',
  requireAuth,
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

// PUT /api/categories/:id
app.put('/api/categories/:id',
  requireAuth,
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

// DELETE /api/categories/:id
app.delete('/api/categories/:id', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id FROM categories WHERE id = ? AND user_id = ?',
      [req.params.id, req.session.userId]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Kategori tidak ditemukan' });

    // Tasks yang pakai kategori ini akan di-set NULL (sudah di-handle oleh FK ON DELETE SET NULL)
    await db.execute('DELETE FROM categories WHERE id=? AND user_id=?', [req.params.id, req.session.userId]);
    res.json({ message: 'Kategori berhasil dihapus' });
  } catch (e) {
    res.status(500).json({ message: 'Gagal menghapus kategori' });
  }
});

// ================================================
// ROUTES: PROFILE
// ================================================

// GET /api/profile/stats
app.get('/api/profile/stats', requireAuth, async (req, res) => {
  try {
    const uid = req.session.userId;
    const [[total]]   = await db.execute('SELECT COUNT(*) as n FROM tasks WHERE user_id=?', [uid]);
    const [[done]]    = await db.execute(`SELECT COUNT(*) as n FROM tasks WHERE user_id=? AND status='done'`, [uid]);
    const [[overdue]] = await db.execute(`SELECT COUNT(*) as n FROM tasks WHERE user_id=? AND status='pending' AND due_date IS NOT NULL AND due_date < NOW()`, [uid]);
    const [cats]      = await db.execute(`SELECT c.name, c.color, COUNT(t.id) as count FROM categories c LEFT JOIN tasks t ON t.category_id=c.id WHERE c.user_id=? GROUP BY c.id`, [uid]);
    const [user]      = await db.execute('SELECT name, email, created_at FROM users WHERE id=?', [uid]);
    res.json({ stats: { total: total.n, done: done.n, pending: total.n - done.n, overdue: overdue.n }, categories: cats, user: user[0] });
  } catch(e) { res.status(500).json({ message: 'Gagal ambil statistik' }); }
});

// PUT /api/profile/update — ubah nama
app.put('/api/profile/update', requireAuth,
  [body('name').trim().isLength({ min:2, max:100 }).withMessage('Nama minimal 2 karakter')],
  async (req, res) => {
    const err = handleValidationErrors(req, res); if (err) return;
    try {
      await db.execute('UPDATE users SET name=? WHERE id=?', [req.body.name, req.session.userId]);
      req.session.userName = req.body.name;
      res.json({ message: 'Nama berhasil diperbarui' });
    } catch(e) { res.status(500).json({ message: 'Gagal memperbarui nama' }); }
  }
);

// PUT /api/profile/change-password
app.put('/api/profile/change-password', requireAuth,
  [
    body('current_password').notEmpty().withMessage('Password lama wajib diisi'),
    body('new_password').isLength({ min:8 }).withMessage('Password baru minimal 8 karakter')
  ],
  async (req, res) => {
    const err = handleValidationErrors(req, res); if (err) return;
    try {
      const [rows] = await db.execute('SELECT password FROM users WHERE id=?', [req.session.userId]);
      if (!rows.length) return res.status(404).json({ message: 'User tidak ditemukan' });
      const valid = await bcrypt.compare(req.body.current_password, rows[0].password);
      if (!valid) return res.status(400).json({ message: 'Password lama salah' });
      const hashed = await bcrypt.hash(req.body.new_password, 12);
      await db.execute('UPDATE users SET password=? WHERE id=?', [hashed, req.session.userId]);
      res.json({ message: 'Password berhasil diubah' });
    } catch(e) { res.status(500).json({ message: 'Gagal mengubah password' }); }
  }
);

// ================================================
// ROUTES: FORGOT / RESET PASSWORD
// ================================================

// POST /api/auth/forgot-password
app.post('/api/auth/forgot-password',
  [body('email').isEmail().normalizeEmail().withMessage('Format email tidak valid')],
  async (req, res) => {
    const err = handleValidationErrors(req, res); if (err) return;
    try {
      const [rows] = await db.execute('SELECT id, name, email FROM users WHERE email=?', [req.body.email]);
      // Selalu response sukses (keamanan - jangan bocorkan info akun)
      if (!rows.length) return res.json({ message: 'Jika email terdaftar, link reset telah dikirim.' });
      const user = rows[0];
      const token = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 jam
      await db.execute('DELETE FROM password_resets WHERE user_id=?', [user.id]);
      await db.execute('INSERT INTO password_resets (user_id, token, expires_at) VALUES (?,?,?)',
        [user.id, token, expires.toISOString().slice(0,19).replace('T',' ')]);
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
    } catch(e) { console.error(e); res.status(500).json({ message: 'Gagal memproses permintaan' }); }
  }
);

// POST /api/auth/reset-password
app.post('/api/auth/reset-password',
  [
    body('token').notEmpty().withMessage('Token tidak valid'),
    body('password').isLength({ min:8 }).withMessage('Password minimal 8 karakter')
  ],
  async (req, res) => {
    const err = handleValidationErrors(req, res); if (err) return;
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
    } catch(e) { res.status(500).json({ message: 'Gagal mereset password' }); }
  }
);

// ================================================
// ROUTES: NOTIFICATIONS
// ================================================
app.get('/api/notifications', requireAuth, async (req, res) => {
  try {
    const [notifs] = await db.execute(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [req.session.userId]
    );
    res.json({ notifications: notifs });
  } catch(e) { res.status(500).json({ message: 'Gagal mengambil notifikasi' }); }
});

app.put('/api/notifications/:id/read', requireAuth, async (req, res) => {
  try {
    await db.execute('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [req.params.id, req.session.userId]);
    res.json({ message: 'Notifikasi dibaca' });
  } catch(e) { res.status(500).json({ message: 'Gagal update notifikasi' }); }
});

app.put('/api/notifications/read-all', requireAuth, async (req, res) => {
  try {
    await db.execute('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0', [req.session.userId]);
    res.json({ message: 'Semua notifikasi dibaca' });
  } catch(e) { res.status(500).json({ message: 'Gagal update notifikasi' }); }
});

// ================================================
// SPA FALLBACK — arahkan semua route ke index
// ================================================
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'auth.html'));
});

// ================================================
// START SERVER
// ================================================
initDB()
  .then(() => {
    setupCronJobs();
    app.listen(PORT, '0.0.0.0', () => {
      // Tampilkan semua IP address jaringan lokal
      const os = require('os');
      const nets = os.networkInterfaces();
      const localIPs = [];
      for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
          // Hanya IPv4 non-internal
          if (net.family === 'IPv4' && !net.internal) {
            localIPs.push(net.address);
          }
        }
      }
      console.log(`\n🚀 Schedly berjalan!`);
      console.log(`   💻 Lokal    : http://localhost:${PORT}`);
      localIPs.forEach(ip => {
        console.log(`   📱 Network  : http://${ip}:${PORT}`);
      });
      console.log(`\n   Buka alamat Network di HP/device lain yang terhubung WiFi yang sama.`);
      console.log(`   Mode: ${process.env.NODE_ENV || 'development'}\n`);
    });
  })
  .catch(err => {
    console.error('❌ Gagal terhubung ke database:', err.message);
    process.exit(1);
  });