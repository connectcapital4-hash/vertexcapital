const nodemailer = require("nodemailer");


/**
* NOTE: For Gmail, turn on 2FA and use an App Password as GMAIL_PASS.
* Alternatively, swap to OAuth2. This file keeps it simple.
*/
const transporter = nodemailer.createTransport({
service: process.env.MAIL_SERVICE || "smtp.hostinger.com",
auth: {
user: "management@vertexcapital.us",
pass: "VerCap123_",
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

