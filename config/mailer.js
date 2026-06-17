const nodemailer = require('nodemailer');

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
      host: 'smtp.ethereal.email',
      port: 587,
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
      to,
      subject,
      html
    });
    const preview = nodemailer.getTestMessageUrl(info);
    if (preview) console.log('📬 Preview email:', preview);
    return true;
  } catch (e) {
    console.error('❌ Gagal kirim email:', e.message);
    return false;
  }
}

module.exports = {
  sendMail
};
