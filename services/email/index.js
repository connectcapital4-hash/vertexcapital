const { sendPromailerEmail } = require('../../config/mailer');
const fs = require('fs').promises;
const path = require('path');
const handlebars = require('handlebars');

/**
 * 🔹 Register Handlebars helpers
 */
handlebars.registerHelper("fallback", function(value, fallbackValue) {
  return value && value.toString().trim() ? value : fallbackValue;
});

handlebars.registerHelper("uppercase", function(str) {
  return (str || "").toString().toUpperCase();
});

handlebars.registerHelper("lowercase", function(str) {
  return (str || "").toString().toLowerCase();
});

handlebars.registerHelper("formatDate", function(date, format) {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return date;
  
  const options = {};
  switch (format) {
    case "MMM DD, YYYY": 
      options.month = "short"; 
      options.day = "2-digit"; 
      options.year = "numeric"; 
      break;
    case "MMMM DD, YYYY": 
      options.month = "long"; 
      options.day = "2-digit"; 
      options.year = "numeric"; 
      break;
    case "DD/MM/YYYY": 
      options.day = "2-digit"; 
      options.month = "2-digit"; 
      options.year = "numeric"; 
      break;
    default: 
      options.year = "numeric"; 
      options.month = "2-digit"; 
      options.day = "2-digit"; 
      break;
  }
  return new Intl.DateTimeFormat("en-US", options).format(d);
});

// Cache for compiled templates
const templateCache = new Map();

/**
 * 🔹 Compile template and send email
 */
async function sendTemplatedEmail({ to, subject, template, variables = {}, fromName }) {
  try {
    console.log(`📧 Sending ${template} email to: ${to}`);
    
    // Resolve template path
    const templatePath = path.join(__dirname, "../../emails/templates", `${template}.html`);
    
    // Check if template exists
    try {
      await fs.access(templatePath);
    } catch (error) {
      throw new Error(`Template file not found: ${templatePath}`);
    }

    // Get or compile template
    let compiledTemplate;
    if (templateCache.has(template)) {
      compiledTemplate = templateCache.get(template);
    } else {
      try {
        const source = await fs.readFile(templatePath, "utf8");
        compiledTemplate = handlebars.compile(source);
        templateCache.set(template, compiledTemplate);
      } catch (error) {
        throw new Error(`Failed to compile template ${template}: ${error.message}`);
      }
    }

    // Prepare variables with defaults
    const templateVariables = withDefaults(variables);
    
    // Render HTML content
    const htmlContent = compiledTemplate(templateVariables);
    
    // Generate plain text version
    const textContent = htmlContent
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .trim();

    // Prepare recipients
    let recipients;
    if (typeof to === 'string' && to.includes(',')) {
      recipients = to.split(',').map(e => e.trim()).filter(e => e);
    } else if (Array.isArray(to)) {
      recipients = to;
    } else {
      recipients = [to];
    }

    // Validate recipients
    if (!recipients.length) {
      throw new Error('No valid recipients provided');
    }

    // Send email
    const result = await sendPromailerEmail({
      to: recipients,
      from: { 
        email: process.env.MAIL_FROM?.trim() || process.env.SMTP_USER?.trim(), 
        name: fromName || process.env.MAIL_FROM_NAME?.trim() || 'Vertex Capital' 
      },
      subject: subject || `Message from Vertex Capital`,
      html: htmlContent,
      text: textContent,
    });

    console.log(`✅ ${template} email sent successfully to ${recipients.length} recipient(s)`);
    return result;
  } catch (err) {
    console.error(`❌ Failed to send ${template} email:`, {
      error: err.message,
      stack: err.stack,
      template,
      to,
    });
    throw err;
  }
}

/**
 * 🔹 Default template variables
 */
function withDefaults(data = {}) {
  return {
    logoUrl: process.env.LOGO_URL?.trim() || 'https://res.cloudinary.com/dnjvees9s/image/upload/v1756279067/1000068258-removebg-preview_momv17.png',
    currentYear: new Date().getFullYear().toString(),
    siteUrl: process.env.FRONTEND_URL || 'https://vertexcapital.us',
    supportEmail: process.env.SUPPORT_EMAIL || 'support@vertexcapital.us',
    companyName: 'Vertex Capital',
    ...data,
  };
}

/**
 * 🔹 Individual email functions
 */
async function sendSignupEmail(data) {
  return sendTemplatedEmail({ 
    ...data, 
    subject: "Welcome to Vertex Capital 🎉", 
    template: "signup-capital-connect", 
    variables: withDefaults(data) 
  });
}

async function sendFirmConnectOtp(data) {
  return sendTemplatedEmail({ 
    ...data, 
    subject: `Connect to ${data.firmName || 'Firm'} — verification code`, 
    template: "firm-connect-otp", 
    variables: withDefaults(data) 
  });
}

async function sendCreditAlert(data) {
  return sendTemplatedEmail({ 
    ...data, 
    subject: `Credit Alert — ${data.firmName || 'Vertex Capital'}`, 
    template: "credit-alert", 
    variables: withDefaults(data) 
  });
}

async function sendProfitTopup(data) {
  return sendTemplatedEmail({ 
    ...data, 
    subject: `Profit Top-Up (${data.range || 'Period'}) — ${data.firmName || 'Vertex Capital'}`, 
    template: "profit-topup-alert", 
    variables: withDefaults(data) 
  });
}

async function sendAccountUpgraded(data) {
  return sendTemplatedEmail({ 
    ...data, 
    subject: `Account upgraded to ${data.level || 'new level'}`, 
    template: "account-upgrade", 
    variables: withDefaults(data) 
  });
}

async function sendAccountSuspended(data) {
  return sendTemplatedEmail({ 
    ...data, 
    subject: `Account Suspended — ${data.firmName || 'Vertex Capital'}`, 
    template: "account-suspended", 
    variables: withDefaults(data) 
  });
}

async function sendAccountUnsuspended(data) {
  return sendTemplatedEmail({ 
    ...data, 
    subject: `Account Restored — ${data.firmName || 'Vertex Capital'}`, 
    template: "account-unsuspended", 
    variables: withDefaults(data) 
  });
}

async function sendStatusChanged(data) {
  return sendTemplatedEmail({ 
    ...data, 
    subject: `Your account status is now ${data.status || 'updated'}`, 
    template: "account-status-changed", 
    variables: withDefaults(data) 
  });
}

async function sendLoginOtp(data) {
  return sendTemplatedEmail({ 
    ...data, 
    subject: "Your Vertex Capital login code", 
    template: "login-otp", 
    variables: withDefaults(data) 
  });
}

async function sendPasswordResetOtp(data) {
  return sendTemplatedEmail({ 
    ...data, 
    subject: "Password Reset Code — Vertex Capital", 
    template: "password-reset-otp", 
    variables: withDefaults(data) 
  });
}

async function sendPasswordResetSuccess(data) {
  return sendTemplatedEmail({ 
    ...data, 
    subject: "Password Reset Successful ✅", 
    template: "password-reset-success", 
    variables: withDefaults(data) 
  });
}

async function sendUserLoginAlert(data) {
  let recipients;
  
  if (typeof data.to === 'string' && data.to.includes(',')) {
    recipients = data.to.split(',').map(e => e.trim()).filter(e => e);
  } else if (Array.isArray(data.to)) {
    recipients = data.to;
  } else {
    recipients = [data.to];
  }

  const results = await Promise.allSettled(
    recipients.map(email => 
      sendTemplatedEmail({ 
        ...data, 
        to: email, 
        subject: `🔔 User Login Alert — ${data.firmName || "Vertex Capital"}`, 
        template: "user-login-alert", 
        variables: withDefaults({
          userName: data.userName,
          userEmail: data.userEmail,
          firmName: data.firmName,
          loginTime: data.loginTime,
          ipAddress: data.ipAddress,
          browser: data.browser,
          device: data.device,
          location: data.location,
        }) 
      })
    )
  );

  // Log results
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      console.log(`✅ Login alert sent to ${recipients[index]}`);
    } else {
      console.error(`❌ Failed to send login alert to ${recipients[index]}:`, result.reason?.message);
    }
  });

  return results;
}

// Test function for debugging
async function testEmailService() {
  console.log('🧪 Testing email service...');
  
  try {
    const testData = {
      to: process.env.ADMIN_EMAIL?.split(',')[0] || 'test@example.com',
      userName: 'Test User',
      otp: '123456',
      firmName: 'Test Firm',
    };
    
    const result = await sendLoginOtp(testData);
    console.log('✅ Email test successful:', result);
    return result;
  } catch (error) {
    console.error('❌ Email test failed:', error.message);
    throw error;
  }
}

module.exports = {
  sendTemplatedEmail,
  sendSignupEmail,
  sendFirmConnectOtp,
  sendCreditAlert,
  sendProfitTopup,
  sendAccountUpgraded,
  sendAccountSuspended,
  sendAccountUnsuspended,
  sendStatusChanged,
  sendLoginOtp,
  sendPasswordResetOtp,
  sendPasswordResetSuccess,
  sendUserLoginAlert,
  testEmailService,
};

