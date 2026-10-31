const nodemailer = require('nodemailer');
const config = require('./env');

let transporter = null;

async function getMailer() {
  if (transporter) return transporter;

  if (config.email.user && config.email.pass) {
    transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.port === 465,
      auth: {
        user: config.email.user,
        pass: config.email.pass,
      },
    });
  } else {
    // Development fallback using Ethereal test account or jsonTransport
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.log(`[Mailer] Initialized Ethereal test mailer (account: ${testAccount.user})`);
    } catch {
      // Offline fallback transport for isolated sandboxes
      transporter = nodemailer.createTransport({
        jsonTransport: true,
      });
      console.log('[Mailer] Initialized JSON transport (logging outbound emails to console)');
    }
  }

  return transporter;
}

module.exports = {
  getMailer,
};

