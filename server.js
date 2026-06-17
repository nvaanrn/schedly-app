// ================================================
// SCHEDLY - Backend Server (Node.js + Express)
// ================================================
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const cors = require('cors');
const path = require('path');
const os = require('os');

const { initDB } = require('./config/db');
const { setupCronJobs } = require('./jobs/cron');

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
// ROUTES
// ================================================
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/recording', require('./routes/recording'));


// SPA FALLBACK — arahkan semua route ke index
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