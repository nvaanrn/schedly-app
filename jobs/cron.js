const cron = require('node-cron');
const { db } = require('../config/db');
const { sendMail } = require('../config/mailer');

// Helper untuk mengambil waktu lokal di timezone tertentu dalam format 'YYYY-MM-DD HH:mm:ss'
function getLocalDateTimeInTimezone(date, timezone) {
  try {
    const options = {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    };
    return date.toLocaleString('sv-SE', options).replace('T', ' ');
  } catch (e) {
    return date.toISOString().slice(0, 19).replace('T', ' ');
  }
}

// Helper untuk memformat tanggal jatuh tempo menjadi format Indonesia yang rapi
function formatTaskDueDate(dueStr) {
  if (!dueStr) return '';
  const parts = dueStr.replace('T', ' ').split(' ');
  const dateParts = parts[0].split('-');
  const year = parseInt(dateParts[0]);
  const month = parseInt(dateParts[1]) - 1;
  const day = parseInt(dateParts[2]);

  let timeStr = '';
  if (parts[1]) {
    const timeParts = parts[1].split(':');
    timeStr = ` pukul ${timeParts[0]}.${timeParts[1]}`;
  }

  const MONTHS = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  return `${day} ${MONTHS[month]} ${year}${timeStr}`;
}

function setupCronJobs() {
  // Cek setiap 1 menit
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      
      // Ambil tugas pending dengan reminder belum terkirim
      const [tasks] = await db.execute(
        `SELECT t.id, t.user_id, t.title, t.due_date, u.name, u.email,
                s.timezone, s.email_reminder
         FROM tasks t
         JOIN users u ON t.user_id = u.id
         LEFT JOIN user_settings s ON t.user_id = s.user_id
         WHERE t.status='pending' AND t.reminder_sent=0 AND t.due_date IS NOT NULL`
      );

      let sentCount = 0;

      for (const task of tasks) {
        const tz = task.timezone || 'Asia/Jakarta';
        const taskDueDate = task.due_date.replace('T', ' ').substring(0, 19);

        // Rentang waktu pengingat: dari sekarang hingga 12 jam ke depan
        const nowStr = getLocalDateTimeInTimezone(now, tz);
        const t12 = new Date(now.getTime() + 12 * 60 * 60 * 1000);
        const t12Str = getLocalDateTimeInTimezone(t12, tz);

        // Kirim jika waktu jatuh tempo berada di masa depan dan kurang dari 12 jam lagi
        if (taskDueDate > nowStr && taskDueDate <= t12Str) {
          const dueFormatted = formatTaskDueDate(task.due_date);

          // Cek preferensi email pengguna (default aktif)
          const isEmailEnabled = task.email_reminder !== 0;
          if (isEmailEnabled) {
            await sendMail({
              to: task.email,
              subject: `⏰ Pengingat: "${task.title}" deadline kurang dari 12 jam lagi!`,
              html: `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;background:#f5f3ee;border-radius:12px">
                <h2 style="color:#5C6AC4">⏰ Pengingat Deadline</h2>
                <p>Halo <strong>${task.name}</strong>,</p>
                <p>Tugas <strong>"${task.title}"</strong> akan deadline pada:</p>
                <p style="font-size:1.2rem;color:#DC2626;font-weight:600">${dueFormatted}</p>
                <p>Segera selesaikan sebelum terlambat!</p>
                <hr style="border:none;border-top:1px solid #e2e0dc;margin:16px 0">
                <p style="font-size:0.8rem;color:#6B7280">— Tim Schedly</p>
              </div>`
            });
          }

          // Update reminder_sent & tambahkan notifikasi in-app
          await db.execute('UPDATE tasks SET reminder_sent=1 WHERE id=?', [task.id]);
          await db.execute(
            'INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)',
            [task.user_id, 'Pengingat Tugas', `Tugas "${task.title}" akan deadline pada ${dueFormatted}.`]
          );
          
          sentCount++;
        }
      }

      if (sentCount > 0) {
        console.log(`✅ Reminder terkirim untuk ${sentCount} tugas`);
      }
    } catch (e) {
      console.error('Cron error:', e.message);
    }
  });
  console.log('⏱️  Cron job aktif (cek reminder setiap 1 menit)');
}

module.exports = {
  setupCronJobs
};

