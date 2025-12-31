const axios = require('axios');
const nodemailer = require('nodemailer');

const PROMAILER_API_KEY = process.env.PROMAILER_API_KEY;
const PROMAILER_API_URL = process.env.PROMAILER_API_URL;

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

/**
 * 🔹 Nodemailer SMTP Transport (Backup)
 */
const smtpTransporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT),
  secure: Number(SMTP_PORT) === 465, // true for 465, false for other ports
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

/**
 * 🔹 Send email via Promailer API
 */
async function sendPromailerEmail({ to, subject, html, text, from }) {
  try {
    const recipients = Array.isArray(to) ? to : [to];

    const payload = {
      from: {
        email: from?.email || process.env.MAIL_FROM,
        name: from?.name || process.env.MAIL_FROM_NAME || 'Vertex Capital',
      },
      to: recipients,
      subject,
      html,
      text,
    };

    const response = await axios.post(PROMAILER_API_URL, payload, {
      headers: {
        'Authorization': `Bearer ${PROMAILER_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    console.log(`✅ Email sent via Promailer: ${response.data?.id || 'OK'}`);
    return response.data;
  } catch (err) {
    console.error('❌ Promailer failed:', err.response?.data || err.message);
    console.log('ℹ️ Falling back to SMTP...');
    return sendSMTPEmail({ to, subject, html, text, from });
  }
}

/**
 * 🔹 Send email via SMTP (Backup)
 */
async function sendSMTPEmail({ to, subject, html, text, from }) {
  try {
    const mailOptions = {
      from: `${from?.name || process.env.MAIL_FROM_NAME} <${from?.email || process.env.MAIL_FROM}>`,
      to,
      subject,
      html,
      text,
    };
    const info = await smtpTransporter.sendMail(mailOptions);
    console.log(`✅ Email sent via SMTP: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error('❌ SMTP failed:', err.message);
    throw err;
  }
}

module.exports = {
  sendEmail: sendPromailerEmail,
  sendPromailerEmail,
  sendSMTPEmail,
};
