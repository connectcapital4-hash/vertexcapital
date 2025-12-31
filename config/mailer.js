const axios = require("axios");
const nodemailer = require("nodemailer");

/* =======================
   ENV
======================= */
const AHASEND_API_KEY = process.env.AHASEND_API_KEY?.trim();
const AHASEND_API_URL = process.env.AHASEND_API_URL?.trim();
const AHASEND_SENDER_EMAIL = process.env.AHASEND_SENDER_EMAIL?.trim();
const AHASEND_SENDER_NAME = process.env.AHASEND_SENDER_NAME?.trim();

const SMTP_HOST = process.env.SMTP_HOST?.trim();
const SMTP_PORT = Number(process.env.SMTP_PORT);
const SMTP_USER = process.env.SMTP_USER?.trim();
const SMTP_PASS = process.env.SMTP_PASS?.trim();
const MAIL_FROM = process.env.MAIL_FROM?.trim();
const MAIL_FROM_NAME = process.env.MAIL_FROM_NAME?.trim();

/* =======================
   SMTP TRANSPORT (BACKUP)
======================= */
let smtpTransporter = null;

if (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS) {
  smtpTransporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    tls: { rejectUnauthorized: false },
  });

  smtpTransporter.verify((err) => {
    if (err) {
      console.error("❌ SMTP VERIFY FAILED:", err.message);
    } else {
      console.log("✅ SMTP VERIFIED");
    }
  });
}

/* =======================
   AHASEND SEND (PRIMARY) - API v1
======================= */
async function sendAhaSendEmail({ to, subject, html, text, from, replyTo, cc, bcc, attachments }) {
  if (!AHASEND_API_KEY || !AHASEND_API_URL) {
    throw new Error("AhaSend configuration missing");
  }

  // Normalize recipients
  const recipients = Array.isArray(to) ? to : [to];
  const toAddresses = recipients.map(email => ({ email: email.trim() }));

  const payload = {
    api_key: AHASEND_API_KEY,
    to: toAddresses,
    subject: subject,
    html_body: html,
    text_body: text || html.replace(/<[^>]*>/g, " ").trim(),
    from_email: from?.email || AHASEND_SENDER_EMAIL || MAIL_FROM,
    from_name: from?.name || AHASEND_SENDER_NAME || MAIL_FROM_NAME,
    reply_to: replyTo || from?.email || AHASEND_SENDER_EMAIL || MAIL_FROM,
    track_opens: true,
    track_clicks: true,
    tags: ["vertexcapital", "transactional"]
  };

  // Add optional fields if provided
  if (cc && cc.length > 0) {
    const ccAddresses = Array.isArray(cc) ? cc : [cc];
    payload.cc = ccAddresses.map(email => ({ email: email.trim() }));
  }

  if (bcc && bcc.length > 0) {
    const bccAddresses = Array.isArray(bcc) ? bcc : [bcc];
    payload.bcc = bccAddresses.map(email => ({ email: email.trim() }));
  }

  if (attachments && attachments.length > 0) {
    payload.attachments = attachments.map(attachment => ({
      filename: attachment.filename,
      content: attachment.content.toString("base64"),
      type: attachment.contentType || "application/octet-stream"
    }));
  }

  try {
    const response = await axios.post(`${AHASEND_API_URL}/send`, payload, {
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      timeout: 30000
    });

    console.log("✅ AhaSend API Response:", response.data);
    
    if (response.data.status === "success" || response.data.message_id) {
      return {
        success: true,
        messageId: response.data.message_id,
        data: response.data
      };
    } else {
      throw new Error(response.data.message || "AhaSend API returned an error");
    }
  } catch (err) {
    console.error("❌ AhaSend API Error:", err.response?.data || err.message);
    throw new Error(`AhaSend failed: ${err.response?.data?.message || err.message}`);
  }
}

/* =======================
   SMTP SEND (FALLBACK)
======================= */
async function sendSMTPEmail({ to, subject, html, text, from, attachments }) {
  if (!smtpTransporter) throw new Error("SMTP not configured");

  const mailOptions = {
    from: `"${from?.name || MAIL_FROM_NAME}" <${from?.email || MAIL_FROM}>`,
    to: Array.isArray(to) ? to.join(",") : to,
    subject,
    html,
    text: text || html.replace(/<[^>]*>/g, " ").trim(),
  };

  if (attachments && attachments.length > 0) {
    mailOptions.attachments = attachments;
  }

  return smtpTransporter.sendMail(mailOptions);
}

/* =======================
   MAIN WRAPPER
======================= */
async function sendEmail(data) {
  try {
    console.log("📤 Sending via AhaSend API v1...");
    return await sendAhaSendEmail(data);
  } catch (err) {
    console.error("❌ AhaSend failed, falling back to SMTP:", err.message);
    return sendSMTPEmail(data);
  }
}

module.exports = {
  sendEmail,
  sendAhaSendEmail,
  sendSMTPEmail,
};