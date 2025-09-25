const sgMail = require("@sendgrid/mail");
const fs = require("fs");
const path = require("path");
const handlebars = require("handlebars");

// ✅ Set API Key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * 🔹 Register custom Handlebars helpers
 */
handlebars.registerHelper("fallback", function (value, fallbackValue) {
  return (value && value.toString().trim()) ? value : fallbackValue;
});

handlebars.registerHelper("uppercase", function (str) {
  return (str || "").toString().toUpperCase();
});

handlebars.registerHelper("lowercase", function (str) {
  return (str || "").toString().toLowerCase();
});

/**
 * 🔹 Date formatting helper
 */
handlebars.registerHelper("formatDate", function (date, format) {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d)) return date;

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

/**
 * 🔹 Compile Handlebars template and send email
 */
async function sendTemplatedEmail({ to, subject, template, variables, fromName }) {
  const templatePath = path.join(__dirname, "../../emails/templates", `${template}.html`);
  const source = fs.readFileSync(templatePath, "utf8");
  const compiled = handlebars.compile(source);
  const htmlContent = compiled(variables);

  await sgMail.send({
    to,
    from: {
      email: process.env.MAIL_FROM,
      name: fromName || process.env.MAIL_FROM_NAME || "Vertex Capital",
    },
    subject,
    html: htmlContent,
  });
}

/**
 * Attach default variables (like logoUrl) automatically
 */
function withDefaults(data) {
  return {
    logoUrl: process.env.LOGO_URL || "https://res.cloudinary.com/dnjvees9s/image/upload/v1756279067/1000068258-removebg-preview_momv17.png",
    currentYear: new Date().getFullYear().toString(),
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
    variables: withDefaults(data),
  });
}

async function sendFirmConnectOtp(data) {
  return sendTemplatedEmail({
    ...data,
    subject: `Connect to ${data.firmName} — verification code`,
    template: "firm-connect-otp",
    variables: withDefaults(data),
  });
}

async function sendCreditAlert(data) {
  return sendTemplatedEmail({
    ...data,
    subject: `Credit Alert — ${data.firmName}`,
    template: "credit-alert",
    variables: withDefaults(data),
  });
}

async function sendProfitTopup(data) {
  return sendTemplatedEmail({
    ...data,
    subject: `Profit Top-Up (${data.range}) — ${data.firmName}`,
    template: "profit-topup-alert",
    variables: withDefaults(data),
  });
}

async function sendAccountUpgraded(data) {
  return sendTemplatedEmail({
    ...data,
    subject: `Account upgraded to ${data.level}`,
    template: "account-upgrade",
    variables: withDefaults(data),
  });
}

async function sendAccountSuspended(data) {
  return sendTemplatedEmail({
    ...data,
    subject: `Account Suspended — ${data.firmName}`,
    template: "account-suspended",
    variables: withDefaults(data),
  });
}

async function sendAccountUnsuspended(data) {
  return sendTemplatedEmail({
    ...data,
    subject: `Account Restored — ${data.firmName}`,
    template: "account-unsuspended",
    variables: withDefaults(data),
  });
}

async function sendStatusChanged(data) {
  return sendTemplatedEmail({
    ...data,
    subject: `Your account status is now ${data.status}`,
    template: "account-status-changed",
    variables: withDefaults(data),
  });
}

async function sendLoginOtp(data) {
  return sendTemplatedEmail({
    ...data,
    subject: "Your Vertex Capital login code",
    template: "login-otp",
    variables: withDefaults(data),
  });
}

async function sendPasswordResetOtp(data) {
  return sendTemplatedEmail({
    ...data,
    subject: "Password Reset Code — Vertex Capital",
    template: "password-reset-otp",
    variables: withDefaults(data),
  });
}

async function sendPasswordResetSuccess(data) {
  return sendTemplatedEmail({
    ...data,
    subject: "Password Reset Successful ✅",
    template: "password-reset-success",
    variables: withDefaults(data),
  });
}

async function sendUserLoginAlert(data) {
  const recipients = data.to.includes(",")
    ? data.to.split(",").map((email) => email.trim())
    : [data.to];

  const results = [];
  for (const email of recipients) {
    results.push(
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
        }),
      })
    );
  }
  return Promise.all(results);
}

module.exports = {
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
  sendTemplatedEmail,
};
