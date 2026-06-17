const express = require('express');
const { db } = require('../config/db');
const { requireAuth } = require('../middlewares/auth');

const router = express.Router();
router.use(requireAuth);

/**
 * Hitung rentang tanggal berdasarkan period dan tanggal referensi.
 * Mengembalikan { start: 'YYYY-MM-DD HH:MM:SS', end: 'YYYY-MM-DD HH:MM:SS' }
 * Rentang bersifat [start, end) — end bersifat eksklusif.
 */
function getPeriodRange(period, dateStr) {
  // Parse sebagai tanggal lokal (hindari timezone offset dari new Date(str))
  const parts = dateStr.split('-').map(Number);
  const ref = new Date(parts[0], parts[1] - 1, parts[2]); // local time

  let startDate, endDate;

  if (period === 'day') {
    startDate = new Date(ref);
    endDate = new Date(ref);
    endDate.setDate(endDate.getDate() + 1);

  } else if (period === 'week') {
    // Senin sebagai hari pertama (sesuai default first_day_week)
    const day = ref.getDay(); // 0=Sun
    const daysToMon = day === 0 ? -6 : 1 - day;
    startDate = new Date(ref);
    startDate.setDate(ref.getDate() + daysToMon);
    endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 7);

  } else if (period === 'month') {
    startDate = new Date(ref.getFullYear(), ref.getMonth(), 1);
    endDate = new Date(ref.getFullYear(), ref.getMonth() + 1, 1);

  } else if (period === 'year') {
    startDate = new Date(ref.getFullYear(), 0, 1);
    endDate = new Date(ref.getFullYear() + 1, 0, 1);

  } else {
    // Default: week
    const day = ref.getDay();
    const daysToMon = day === 0 ? -6 : 1 - day;
    startDate = new Date(ref);
    startDate.setDate(ref.getDate() + daysToMon);
    endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 7);
  }

  const toDbStr = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day} 00:00:00`;
  };

  return {
    start: toDbStr(startDate),
    end: toDbStr(endDate),
    startDate,
    endDate
  };
}

// GET /api/recording?period=day|week|month|year&date=YYYY-MM-DD
router.get('/', async (req, res) => {
  try {
    const uid = req.session.userId;
    const period = ['day', 'week', 'month', 'year'].includes(req.query.period)
      ? req.query.period
      : 'week';

    const dateStr = /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)
      ? req.query.date
      : new Date().toISOString().slice(0, 10);

    const { start, end } = getPeriodRange(period, dateStr);

    // Ambil semua tugas dalam rentang periode (berdasarkan due_date)
    const [tasks] = await db.execute(
      `SELECT t.*, c.name AS category_name, c.color AS category_color
       FROM tasks t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.user_id = ?
         AND t.due_date IS NOT NULL
         AND t.due_date >= ?
         AND t.due_date < ?
       ORDER BY t.due_date ASC, CASE t.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END`,
      [uid, start, end]
    );

    // Waktu sekarang (server) untuk deteksi overdue
    const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const total = tasks.length;
    const done = tasks.filter(t => t.status === 'done').length;
    const pending = tasks.filter(t => t.status === 'pending').length;
    const overdue = tasks.filter(t =>
      t.status === 'pending' && t.due_date && t.due_date < nowStr
    ).length;

    // Breakdown by priority
    const byPriority = {
      high:   tasks.filter(t => t.priority === 'high').length,
      medium: tasks.filter(t => t.priority === 'medium').length,
      low:    tasks.filter(t => t.priority === 'low').length
    };

    // Breakdown by category
    const catMap = {};
    for (const t of tasks) {
      const key = t.category_id != null ? String(t.category_id) : '0';
      if (!catMap[key]) {
        catMap[key] = {
          id:    t.category_id,
          name:  t.category_name || 'Tanpa Kategori',
          color: t.category_color || '#6B7280',
          count: 0,
          done:  0
        };
      }
      catMap[key].count++;
      if (t.status === 'done') catMap[key].done++;
    }
    const byCategory = Object.values(catMap).sort((a, b) => b.count - a.count);

    res.json({
      period,
      dateStr,
      range: { start, end },
      summary: { total, done, pending, overdue },
      byPriority,
      byCategory,
      tasks
    });
  } catch (e) {
    console.error('Recording error:', e);
    res.status(500).json({ message: 'Gagal mengambil data rekaman' });
  }
});

module.exports = router;
