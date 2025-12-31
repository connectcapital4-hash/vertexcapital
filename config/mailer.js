const axios = require('axios');
const nodemailer = require('nodemailer');

const PROMAILER_API_KEY = process.env.PROMAILER_API_KEY?.trim();
const PROMAILER_API_URL = process.env.PROMAILER_API_URL?.trim();

const SMTP_HOST = process.env.SMTP_HOST?.trim();
const SMTP_PORT = process.env.SMTP_PORT?.trim();
const SMTP_USER = process.env.SMTP_USER?.trim();
const SMTP_PASS = process.env.SMTP_PASS?.trim();

// Validate environment variables
console.log('🔧 Mailer Configuration:');
console.log('PROMAILER_API_KEY present:', !!PROMAILER_API_KEY);
console.log('SMTP_HOST present:', !!SMTP_HOST);
console.log('SMTP_USER present:', !!SMTP_USER);

/**
 * 🔹 Nodemailer SMTP Transport (Backup)
 */
let smtpTransporter = null;

if (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS) {
  try {
    smtpTransporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT, 10),
      secure: parseInt(SMTP_PORT, 10) === 465, // true for 465, false for other ports
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false // For self-signed certificates
      }
    });

    // Verify SMTP connection
    smtpTransporter.verify((error, success) => {
      if (error) {
        console.error('❌ SMTP connection verification failed:', error.message);
      } else {
        console.log('✅ SMTP connection verified successfully');
      }
    });
  } catch (error) {
    console.error('❌ Failed to create SMTP transporter:', error.message);
  }
} else {
  console.warn('⚠️ SMTP configuration incomplete. Backup email sending may not work.');
}

/**
 * 🔹 Send email via Promailer API
 */
async function sendPromailerEmail({ to, subject, html, text, from }) {
  try {
    // Validate Promailer configuration
    if (!PROMAILER_API_KEY || !PROMAILER_API_URL) {
      console.error('❌ Promailer configuration missing');
      throw new Error('Promailer configuration not set');
    }

    const recipients = Array.isArray(to) ? to : [to];
    
    // Clean recipients
    const cleanedRecipients = recipients.map(email => ({
      email: email.trim(),
      name: ''
    }));

    const payload = {
      from: {
        email: from?.email || process.env.MAIL_FROM?.trim() || SMTP_USER,
        name: from?.name || process.env.MAIL_FROM_NAME?.trim() || 'Vertex Capital',
      },
      to: cleanedRecipients,
      subject: subject || 'No Subject',
      html: html || '',
      text: text || (html ? html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : ''),
    };

    console.log(`📤 Sending email via Promailer to: ${recipients.join(', ')}`);
    
    const response = await axios.post(PROMAILER_API_URL, payload, {
      headers: {
        'Authorization': `Bearer ${PROMAILER_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: 15000, // 15 second timeout
    });

    console.log(`✅ Email sent via Promailer: ${response.data?.messageId || response.data?.id || 'Success'}`);
    return response.data;
  } catch (err) {
    console.error('❌ Promailer failed:', {
      message: err.message,
      response: err.response?.data,
      status: err.response?.status,
      url: err.response?.config?.url,
    });
    
    // Fallback to SMTP
    console.log('ℹ️ Falling back to SMTP...');
    return sendSMTPEmail({ to, subject, html, text, from });
  }
}

/**
 * 🔹 Send email via SMTP (Backup)
 */
async function sendSMTPEmail({ to, subject, html, text, from }) {
  try {
    if (!smtpTransporter) {
      throw new Error('SMTP transporter not configured');
    }

    // Ensure we have a from address
    const fromEmail = from?.email || process.env.MAIL_FROM?.trim() || SMTP_USER;
    const fromName = from?.name || process.env.MAIL_FROM_NAME?.trim() || 'Vertex Capital';
    
    if (!fromEmail) {
      throw new Error('No from email address configured');
    }

    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject: subject || 'No Subject',
      html: html || '',
      text: text || (html ? html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : ''),
    };

    console.log(`📤 Sending email via SMTP to: ${mailOptions.to}`);
    
    const info = await smtpTransporter.sendMail(mailOptions);
    console.log(`✅ Email sent via SMTP: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error('❌ SMTP failed:', {
      message: err.message,
      stack: err.stack,
    });
    
    // Log the specific error for debugging
    if (err.code === 'EAUTH') {
      console.error('❌ SMTP Authentication failed. Check username/password.');
    } else if (err.code === 'ECONNECTION') {
      console.error('❌ SMTP Connection failed. Check host/port.');
    } else if (err.code === 'ETIMEDOUT') {
      console.error('❌ SMTP Connection timeout.');
    }
    
    throw new Error(`Failed to send email: ${err.message}`);
  }
}

/**
 * 🔹 Primary send email function
 */
async function sendEmail({ to, subject, html, text, from }) {
  try {
    // Try Promailer first, then SMTP
    return await sendPromailerEmail({ to, subject, html, text, from });
  } catch (error) {
    console.error('❌ All email sending methods failed:', error.message);
    throw error;
  }
}

module.exports = {
  sendEmail,
  sendPromailerEmail,
  sendSMTPEmail,
};