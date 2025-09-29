const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const upload = require("../middleware/upload");  // ✅ use your middleware only


// Firm management
router.post(
  "/firm",
  upload.single("profile_picture"), // 👈 allow text + file in formData
  adminController.createFirm
);

// Upload or update firm profile picture
router.post(
  "/firm/:firmId/profile-picture",
  upload.single("profile_picture"),
  adminController.uploadFirmProfile
);

// Users inside a firm
router.post("/firm/:firmId/user", adminController.createUserInFirm);
router.patch("/user/:userId/status", adminController.updateUserStatus);
router.patch("/user/:userId/upgrade", adminController.upgradeUserAccount);
router.patch("/user/:userId/suspend", adminController.suspendUser);

// Financials
router.post("/user/:userId/credit", adminController.creditUserBalance);
router.post("/user/:userId/profit", adminController.setUserProfit);

// Assets
router.post("/user/:userId/asset", adminController.assignAsset);

// News
router.post("/news", upload.single("image"), adminController.createNews);
router.put("/news/:newsId", upload.single("image"), adminController.editNews);
router.delete("/news/:newsId", adminController.deleteNews);


// connect existing user to firm
router.post("/user/:userId/connect", adminController.connectUserToFirm);

// routes/adminRoutes.js - Add these routes
router.patch("/firm/:firmId/crypto-addresses", adminController.updateFirmCryptoAddresses);
router.get("/firm/:firmId/crypto-addresses", adminController.getFirmCryptoAddresses);

// Fetch firm details
router.get("/firm/:firmId", adminController.getFirmById);

// Fetch all users in a firm
router.get("/firm/:firmId/users", adminController.getUsersByFirm);

// Fetch all news created by firm's admin
router.get("/firm/:firmId/news", adminController.getFirmNews);

// Fetch all firms
router.get("/firms", adminController.getAllFirms);

// adminRoutes.js
router.get("/news", adminController.getAdminNews);

// Login activities
router.get("/logins", adminController.getLoginActivities);

router.delete("/user/:userId", adminController.deleteUser);
router.delete("/firm/:firmId", adminController.deleteFirm);

router.get("/users", adminController.getAllUsers);

module.exports = router;
