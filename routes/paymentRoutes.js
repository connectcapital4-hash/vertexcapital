// routes/paymentRoutes.js
const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const { authUser } = require("../middleware/authUser");
const { authMiddleware } = require("../middleware/auth");

// User routes
router.get("/addresses", authUser, paymentController.getPaymentAddresses);
router.get("/history", authUser, paymentController.getPaymentHistory);

// Admin routes (for manual payment confirmation)
router.post("/confirm", authMiddleware(["SUPERADMIN", "FIRMADMIN"]), paymentController.confirmPayment);

module.exports = router;