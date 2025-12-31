// server.js
console.log("server.js loaded");

// ✅ LOAD ENVIRONMENT VARIABLES FIRST - BEFORE ANY OTHER IMPORTS
require("dotenv").config({ override: true, debug: true });

// ✅ Debug: Check if mailer variables are loaded
console.log('🔧 Environment Variables Status:');
console.log('PROMAILER_API_KEY present:', !!process.env.PROMAILER_API_KEY);
console.log('SMTP_HOST present:', !!process.env.SMTP_HOST);
console.log('SMTP_USER present:', !!process.env.SMTP_USER);
console.log('MAIL_FROM present:', !!process.env.MAIL_FROM);

// ✅ Force set if missing (temporary fix)
if (!process.env.PROMAILER_API_KEY) {
  console.log('⚠️ PROMAILER_API_KEY missing, setting manually...');
  process.env.PROMAILER_API_KEY = '9d1b5eb5-872a-4663-a10e-877c18d94cb6';
  process.env.PROMAILER_API_URL = 'https://mailserver.automationlounge.com/api/v1/messages/send';
}

const express = require("express");
const cors = require("cors");

const app = express();

// ✅ Trust proxy so req.ip uses x-forwarded-for if behind a proxy
app.set("trust proxy", true);

// ✅ Global error/crash handlers (prevents silent crashes)
process.on("unhandledRejection", (reason, promise) => {
  console.error("🔥 Unhandled Rejection at:", promise, "reason:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("💥 Uncaught Exception:", err);
});

// ✅ Middleware
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// ✅ Import routes
const cryptoRoutes = require("./routes/cryptoRoutes");
const stockRoutes = require("./routes/stockRoutes");
const newsRoutes = require("./routes/newsRoutes");
const adminRoutes = require("./routes/adminRoutes");
const authRoutes = require("./routes/authRoutes");
const { authMiddleware } = require("./middleware/auth");
const userRoutes = require("./routes/userRoutes");
const withdrawalRoutes = require("./routes/withdrawalRoutes");
const automationService = require("./services/automationService");
const portfolioRoutes = require("./routes/portfolioRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
// Add import at the top
const publicAdminNewsRoutes = require("./routes/publicAdminNewsRoutes");

// ✅ Import new services
const cronService = require("./services/cronService");
const portfolioGrowthRoutes = require("./routes/portfolioGrowthRoutes");
const portfolioWithdrawalRoutes = require("./routes/portfolioWithdrawalRoutes");

// ✅ Protected admin routes
app.use(
  "/api/admin",
  authMiddleware ? authMiddleware(["SUPERADMIN", "FIRMADMIN"]) : (req, res, next) => next(),
  adminRoutes
);

// ✅ Public + user routes
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/crypto", cryptoRoutes);
app.use("/api/stocks", stockRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/withdrawals", withdrawalRoutes);
app.use("/api/portfolio", portfolioRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/portfolio-growth", portfolioGrowthRoutes);
app.use("/api/portfolio-withdrawal", portfolioWithdrawalRoutes);
app.use("/api/public/admin-news", publicAdminNewsRoutes);

// ✅ Health route (for uptime monitoring)
app.get("/health", (req, res) => res.status(200).send("OK"));

// ✅ Home route
app.get("/", (req, res) => res.send("VertexCapital Backend Running ✅"));

// ✅ Webhook endpoint
app.post("/api/finnhub-webhook", (req, res) => {
  const secret = req.headers["x-finnhub-secret"];
  if (secret !== process.env.FINNHUB_WEBHOOK_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  res.status(200).send("Event received");
  console.log("Webhook payload:", req.body);
});

// ✅ Start automated services safely
try {
  automationService.startProfitDistribution();
  console.log("Automated profit distribution service started");
} catch (err) {
  console.error("❌ Failed to start automation service:", err.message);
}

// ✅ Start portfolio growth scheduler
try {
  cronService.startPortfolioGrowthScheduler();
  console.log("Portfolio growth scheduler started");
} catch (err) {
  console.error("❌ Failed to start portfolio growth scheduler:", err.message);
}

// ✅ Start server
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));