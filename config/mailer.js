const nodemailer = require("nodemailer");
const sgTransport = require("nodemailer-sendgrid");

/**
 * SendGrid as default mailer
 */
let transporter;

if (process.env.SENDGRID_API_KEY) {
  transporter = nodemailer.createTransport(
    sgTransport({
      apiKey: process.env.SENDGRID_API_KEY,
    })
  );
  console.log("📧 Using SendGrid as default mailer");
} else {
  /**
   * Fallback: Hostinger SMTP Transport
   */
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 465,
    secure: process.env.SMTP_PORT == 465, // true for 465, false for 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  console.log("📧 Using Hostinger SMTP fallback");
}

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
