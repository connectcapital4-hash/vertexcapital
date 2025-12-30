const axios = require('axios');

// AhaSend configuration
const AHASEND_API_KEY = process.env.AHASEND_API_KEY;
const AHASEND_API_URL = process.env.AHASEND_API_URL || 'https://api.ahasend.com/v2';

if (!AHASEND_API_KEY) {
  console.error("❌ AHASEND_API_KEY is missing in environment variables");
} else {
  console.log("📧 Using AhaSend as default mailer");
}

/**
 * Send email via AhaSend API (v2)
 */
async function sendAhaSendEmail(emailData) {
  try {
    const recipients = Array.isArray(emailData.to)
      ? emailData.to
      : [emailData.to];

    const payload = {
      from: {
        email: emailData.from?.email || process.env.MAIL_FROM,
        name: emailData.from?.name || process.env.MAIL_FROM_NAME || 'Vertex Capital',
      },
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
      recipients: recipients.map((email) => ({ email })),
    };

    const response = await axios.post(`${AHASEND_API_URL}/messages`, payload, {
      headers: {
        Authorization: `Bearer ${AHASEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    console.log(`✅ Email sent via AhaSend: ${response.data.id}`);
    return response.data;
  } catch (error) {
    console.error('❌ AhaSend email failed:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Verify AhaSend transporter
 */
async function verifyTransporter() {
  try {
    const testEmail = process.env.ADMIN_EMAIL.split(',')[0];
    await sendAhaSendEmail({
      to: testEmail,
      from: {
        email: process.env.MAIL_FROM,
        name: process.env.MAIL_FROM_NAME || 'Vertex Capital',
      },
      subject: '✅ AhaSend Mailer is ready',
      text: 'This is a test email to confirm AhaSend setup.',
      html: '<p>This is a test email to confirm AhaSend setup.</p>',
    });
    console.log('📧 AhaSend Mailer is ready');
  } catch (err) {
    console.error('❌ AhaSend verification failed:', err.message);
  }
}

// Don't run verification in tests
if (process.env.NODE_ENV !== 'test') {
  verifyTransporter();
}

module.exports = {
  sendEmail: sendAhaSendEmail,
  sendAhaSendEmail,
};
