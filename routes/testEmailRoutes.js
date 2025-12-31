const express = require("express");
const router = express.Router();

console.log("🔧 TestEmailRoutes loaded"); // Debug log

// Simple test route first
router.get("/", (req, res) => {
  console.log("✅ /api/test endpoint hit");
  res.json({ 
    success: true, 
    message: "Test routes are working!",
    endpoints: [
      { method: "GET", path: "/api/test/test-email", desc: "Test email sending" },
      { method: "GET", path: "/api/test/email-status", desc: "Check email config" },
      { method: "POST", path: "/api/test/test-direct-email", desc: "Send custom email" }
    ]
  });
});

// Debug route
router.get("/debug", (req, res) => {
  console.log("📡 Debug route accessed");
  res.json({
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT,
    routesLoaded: true
  });
});

/**
 * @route GET /api/test/test-email
 */
router.get("/test-email", async (req, res) => {
  console.log("📧 Test email route called");
  try {
    // Simple response for now
    res.json({
      success: true,
      message: "Email test endpoint is accessible",
      nextStep: "Will send email in next implementation",
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error("Test email error:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * @route GET /api/test/email-status
 */
router.get("/email-status", async (req, res) => {
  console.log("📊 Email status route called");
  
  const config = {
    ahasend: {
      apiKey: process.env.AHASEND_API_KEY ? "✓ Configured" : "✗ Missing",
      apiUrl: process.env.AHASEND_API_URL || "Not set",
      senderEmail: process.env.AHASEND_SENDER_EMAIL || "Not set",
      senderName: process.env.AHASEND_SENDER_NAME || "Not set"
    },
    smtp: {
      host: process.env.SMTP_HOST || "Not set",
      port: process.env.SMTP_PORT || "Not set",
      user: process.env.SMTP_USER ? "✓ Configured" : "✗ Missing",
      pass: process.env.SMTP_PASS ? "✓ Configured" : "✗ Missing"
    },
    defaults: {
      mailFrom: process.env.MAIL_FROM || "Not set",
      mailFromName: process.env.MAIL_FROM_NAME || "Not set",
      adminEmail: process.env.ADMIN_EMAIL || "Not set"
    }
  };

  res.json({
    success: true,
    message: "Email configuration status",
    config: config,
    timestamp: new Date().toISOString(),
    note: "Routes are working!"
  });
});

// POST route for direct email testing
router.post("/test-direct-email", async (req, res) => {
  console.log("✉️ Direct email test route called");
  try {
    const { to, subject, html } = req.body;
    
    res.json({
      success: true,
      message: "Direct email endpoint is accessible",
      receivedData: { to, subject, htmlLength: html?.length },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error("Direct email test error:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

module.exports = router;