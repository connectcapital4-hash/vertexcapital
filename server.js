// server.js
console.log("server.js loaded");

const express = require("express");
const cors = require("cors");
require("dotenv").config();

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
