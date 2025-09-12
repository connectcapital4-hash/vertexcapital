// routes/withdrawalRoutes.js
const express = require("express");
const router = express.Router();
const withdrawalController = require("../controllers/withdrawalController");
const { authUser } = require("../middleware/authUser");
const { authMiddleware } = require("../middleware/auth");

// User routes
router.post("/request", authUser, withdrawalController.requestWithdrawal);
router.get("/history", authUser, withdrawalController.getUserWithdrawals);

// Admin routes
router.get("/admin/all", authMiddleware(["SUPERADMIN", "FIRMADMIN"]), withdrawalController.getAllWithdrawals);
router.patch("/admin/approve/:withdrawalId", authMiddleware(["SUPERADMIN", "FIRMADMIN"]), withdrawalController.approveWithdrawal);
router.patch("/admin/reject/:withdrawalId", authMiddleware(["SUPERADMIN", "FIRMADMIN"]), withdrawalController.rejectWithdrawal);

module.exports = router;