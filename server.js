// server.js
console.log("server.js loaded");

const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Import routes
const cryptoRoutes = require("./routes/cryptoRoutes");
const stockRoutes = require("./routes/stockRoutes");
const newsRoutes = require("./routes/newsRoutes");
const adminRoutes = require("./routes/adminRoutes");
const authRoutes = require("./routes/authRoutes");
const { authMiddleware } = require("./middleware/auth");
const userRoutes = require("./routes/userRoutes");
// Add to server.js
const automationService = require("./services/automationService");
// server.js - Add this import
const withdrawalRoutes = require("./routes/withdrawalRoutes");

// Protected admin routes
app.use(
  "/api/admin",
  authMiddleware ? authMiddleware(["SUPERADMIN", "FIRMADMIN"]) : (req, res, next) => next(),
  adminRoutes
);

// User routes
app.use("/api/users", userRoutes);

// Authentication routes
app.use("/api/auth", authRoutes);

// Public routes
app.use("/api/crypto", cryptoRoutes);
app.use("/api/stocks", stockRoutes);
app.use("/api/news", newsRoutes);
// Add this route configuration (after other routes)
app.use("/api/withdrawals", withdrawalRoutes);

// Home
app.get("/", (req, res) => res.send("VertexCapital Backend Running"));

// Webhook
app.post("/api/finnhub-webhook", (req, res) => {
  const secret = req.headers["x-finnhub-secret"];
  if (secret !== process.env.FINNHUB_WEBHOOK_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  res.status(200).send("Event received");
  console.log("Webhook payload:", req.body);
});

// Start automated services
automationService.startProfitDistribution();
console.log("Automated profit distribution service started");

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
