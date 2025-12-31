const { sendEmail } = require('../../config/mailer');
const fs = require('fs').promises;
const path = require('path');
const handlebars = require('handlebars');

/**
 * 🔹 Register Handlebars helpers
 */
handlebars.registerHelper("fallback", function (value, fallbackValue) {
  return value && value.toString().trim() ? value : fallbackValue;
});

handlebars.registerHelper("uppercase", function (str) {
  return (str || "").toString().toUpperCase();
});

handlebars.registerHelper("lowercase", function (str) {
  return (str || "").toString().toLowerCase();
});

handlebars.registerHelper("formatDate", function (date, format) {
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

handlebars.registerHelper("currency", function (amount) {
  if (!amount && amount !== 0) return "$0.00";
  const num = parseFloat(amount);
  if (isNaN(num)) return amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
});

handlebars.registerHelper("formatNumber", function (number) {
  if (!number && number !== 0) return "0";
  const num = parseFloat(number);
  if (isNaN(num)) return number;
  return new Intl.NumberFormat("en-US").format(num);
});

/**
 * 🔹 Template cache
 */
const templateCache = new Map();

/**
 * 🔹 Compile template and send email
 */
async function sendTemplatedEmail({ to, subject, template, variables = {}, from }) {
  try {
    console.log(`📧 Sending ${template} email to:`, to);

    const templatePath = path.join(
      __dirname,
      "../../emails/templates",
      `${template}.html`
    );

    await fs.access(templatePath);

    let compiledTemplate;
    if (templateCache.has(template)) {
      compiledTemplate = templateCache.get(template);
    } else {
      const source = await fs.readFile(templatePath, "utf8");
      compiledTemplate = handlebars.compile(source);
      templateCache.set(template, compiledTemplate);
    }

    const templateVariables = withDefaults(variables);
    const html = compiledTemplate(templateVariables);

    const text = html
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .trim();

    /**
     * 🔹 Normalize recipients
     */
    let recipients;
    if (Array.isArray(to)) {
      recipients = to;
    } else if (typeof to === "string" && to.includes(",")) {
      recipients = to.split(",").map(e => e.trim()).filter(Boolean);
    } else {
      recipients = [to];
    }

    if (!recipients.length) {
      throw new Error("No valid recipients provided");
    }

    const fromEmail =
      from?.email ||
      process.env.AHASEND_SENDER_EMAIL ||
      process.env.MAIL_FROM?.trim() ||
      process.env.SMTP_USER?.trim();

    const fromName =
      from?.name ||
      process.env.AHASEND_SENDER_NAME ||
      process.env.MAIL_FROM_NAME?.trim() ||
      "Vertex Capital";

    const result = await sendEmail({
      to: recipients,
      subject: subject || `Message from ${fromName}`,
      html,
      text,
      from: {
        email: fromEmail,
        name: fromName,
      },
    });

    console.log(`✅ ${template} email sent to ${recipients.length} recipient(s)`);
    return result;
  } catch (err) {
    console.error(`❌ Failed to send ${template} email`, {
      error: err.message,
      template,
      to,
    });
    throw err;
  }
}

/**
 * 🔹 Default variables
 */
function withDefaults(data = {}) {
  return {
    logoUrl:
      process.env.LOGO_URL ||
      "https://res.cloudinary.com/dnjvees9s/image/upload/v1756279067/1000068258-removebg-preview_momv17.png",
    currentYear: new Date().getFullYear().toString(),
    siteUrl: process.env.FRONTEND_URL || "https://vertexcapital.us",
    supportEmail: process.env.SUPPORT_EMAIL || "management@vertexcapital.us",
    companyName: "Vertex Capital",
    companyAddress: "123 Investment Street, Financial District",
    ...data,
  };
}

/**
 * 🔹 Email exports
 */
const sendSignupEmail = d =>
  sendTemplatedEmail({
    ...d,
    subject: "Welcome to Vertex Capital 🎉",
    template: "signup",
    variables: withDefaults(d),
  });

const sendFirmConnectOtp = d =>
  sendTemplatedEmail({
    ...d,
    subject: `Connect to ${d.firmName || "Firm"} — Verification Code`,
    template: "firm-connect-otp",
    variables: withDefaults(d),
  });

const sendCreditAlert = d =>
  sendTemplatedEmail({
    ...d,
    subject: `Credit Alert — ${d.firmName || "Vertex Capital"}`,
    template: "credit-alert",
    variables: withDefaults(d),
  });

const sendProfitTopup = d =>
  sendTemplatedEmail({
    ...d,
    subject: `Profit Top-Up (${d.range || "Period"}) — ${d.firmName || "Vertex Capital"}`,
    template: "profit-topup-alert",
    variables: withDefaults(d),
  });

const sendAccountUpgraded = d =>
  sendTemplatedEmail({
    ...d,
    subject: `Account Upgraded to ${d.level || "New Level"}`,
    template: "account-upgrade",
    variables: withDefaults(d),
  });

const sendAccountSuspended = d =>
  sendTemplatedEmail({
    ...d,
    subject: `Account Suspended — ${d.firmName || "Vertex Capital"}`,
    template: "account-suspended",
    variables: withDefaults(d),
  });

const sendAccountUnsuspended = d =>
  sendTemplatedEmail({
    ...d,
    subject: `Account Restored — ${d.firmName || "Vertex Capital"}`,
    template: "account-unsuspended",
    variables: withDefaults(d),
  });

const sendStatusChanged = d =>
  sendTemplatedEmail({
    ...d,
    subject: `Account Status Updated to ${d.status || "Active"}`,
    template: "account-status-changed",
    variables: withDefaults(d),
  });

const sendLoginOtp = d =>
  sendTemplatedEmail({
    ...d,
    subject: "Your Vertex Capital Login Code",
    template: "login-otp",
    variables: withDefaults(d),
  });

const sendPasswordResetOtp = d =>
  sendTemplatedEmail({
    ...d,
    subject: "Password Reset Code — Vertex Capital",
    template: "password-reset-otp",
    variables: withDefaults(d),
  });

const sendPasswordResetSuccess = d =>
  sendTemplatedEmail({
    ...d,
    subject: "Password Reset Successful ✅",
    template: "password-reset-success",
    variables: withDefaults(d),
  });

const sendInvestmentConfirmation = d =>
  sendTemplatedEmail({
    ...d,
    subject: `Investment Confirmation — ${d.amount ? `$${d.amount}` : "New Investment"}`,
    template: "investment-confirmation",
    variables: withDefaults(d),
  });

const sendWithdrawalRequest = d =>
  sendTemplatedEmail({
    ...d,
    subject: `Withdrawal Request ${d.status ? `(${d.status})` : ""}`,
    template: "withdrawal-request",
    variables: withDefaults(d),
  });

const sendMonthlyStatement = d =>
  sendTemplatedEmail({
    ...d,
    subject: `Monthly Statement — ${d.month || new Date().toLocaleString("default", { month: "long" })} ${new Date().getFullYear()}`,
    template: "monthly-statement",
    variables: withDefaults(d),
  });

const sendAdminNotification = d =>
  sendTemplatedEmail({
    ...d,
    subject: `Admin Alert: ${d.title || "Notification"}`,
    template: "admin-notification",
    variables: withDefaults(d),
  });

/**
 * 🔹 Direct email (no template)
 */
async function sendDirectEmail({ to, subject, html, text, from }) {
  return sendEmail({ to, subject, html, text, from });
}

module.exports = {
  sendTemplatedEmail,
  sendDirectEmail,
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
  sendInvestmentConfirmation,
  sendWithdrawalRequest,
  sendMonthlyStatement,
  sendAdminNotification,
};