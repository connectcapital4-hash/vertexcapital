// routes/withdrawalRoutes.js
const express = require("express");
const router = express.Router();
const withdrawalController = require("../controllers/withdrawalController");
const { authUser } = require("../middleware/authUser");
const { authMiddleware } = require("../middleware/auth");

router.get("/ping", (req, res) => {
  res.json({ message: "✅ Withdrawal routes mounted" });
});


// User routes
router.post("/request",authUser, withdrawalController.requestWithdrawal);
router.get("/history", authUser, withdrawalController.getUserWithdrawals);

// Admin routes
router.get("/admin/all", authMiddleware(["SUPERADMIN", "FIRMADMIN"]), withdrawalController.getAllWithdrawals);
router.patch("/admin/approve/:withdrawalId", authMiddleware(["SUPERADMIN", "FIRMADMIN"]), withdrawalController.approveWithdrawal);
router.patch("/admin/reject/:withdrawalId", authMiddleware(["SUPERADMIN", "FIRMADMIN"]), withdrawalController.rejectWithdrawal);

module.exports = router;
///c%3A/Users/USER/capitalconnect/backend/config/cloudinary.j