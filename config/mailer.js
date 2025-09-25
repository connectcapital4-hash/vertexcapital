const sgMail = require("@sendgrid/mail");

// ✅ Set SendGrid API Key
if (!process.env.SENDGRID_API_KEY) {
  console.error("❌ SENDGRID_API_KEY is missing in environment variables");
} else {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log("📧 Using SendGrid as default mailer");
}

async function verifyTransporter() {
  try {
    await sgMail.send({
      to: process.env.ADMIN_EMAIL.split(",")[0], // test with first admin email
      from: {
        email: process.env.MAIL_FROM,
        name: process.env.MAIL_FROM_NAME || "Vertex Capital",
      },
      subject: "✅ SendGrid Mailer is ready",
      text: "This is a test email to confirm SendGrid setup.",
    });
    console.log("📧 SendGrid Mailer is ready");
  } catch (err) {
    console.error("❌ SendGrid verification failed:", err.message);
  }
}

// Don’t run verification in tests
if (process.env.NODE_ENV !== "test") verifyTransporter();

module.exports = sgMail;
