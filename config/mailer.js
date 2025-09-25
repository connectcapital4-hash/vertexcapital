const nodemailer = require("nodemailer");

/**
 * Hostinger SMTP Transport
 */
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT || 465,
  secure: process.env.SMTP_PORT == 465, // true for 465, false for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function verifyTransporter() {
  try {
    await transporter.verify();
    console.log("📧 Mailer is ready");
  } catch (err) {
    console.error("❌ Mailer verification failed:", err.message);
  }
}

if (process.env.NODE_ENV !== "test") verifyTransporter();

module.exports = transporter;
