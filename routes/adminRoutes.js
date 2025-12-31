const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { upload } = require("../middleware/upload"); // ✅ destructure upload

// Firm management
router.post(
  "/firm",
  upload.single("profile_picture"), // ✅ now works
  adminController.createFirm
);

// Upload/update firm profile picture
router.post(
  "/firm/:firmId/profile-picture",
  upload.single("profile_picture"),
  adminController.uploadFirmProfile
);

// News
router.post("/news", upload.single("image"), adminController.createNews);
router.put("/news/:newsId", upload.single("image"), adminController.editNews);

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

// Connect existing user to firm
router.post("/user/:userId/connect", adminController.connectUserToFirm);

// Firm crypto addresses
router.patch("/firm/:firmId/crypto-addresses", adminController.updateFirmCryptoAddresses);
router.get("/firm/:firmId/crypto-addresses", adminController.getFirmCryptoAddresses);

// Fetch firm details
router.get("/firm/:firmId", adminController.getFirmById);
router.get("/firm/:firmId/users", adminController.getUsersByFirm);
router.get("/firm/:firmId/news", adminController.getFirmNews);

// Fetch all firms and users
router.get("/firms", adminController.getAllFirms);
router.get("/users", adminController.getAllUsers);
router.get("/", adminController.getAdmins); // GET /admins

// News management
router.get("/news", adminController.getAdminNews);

// Login activities
router.get("/logins", adminController.getLoginActivities);

// Delete routes
router.delete("/user/:userId", adminController.deleteUser);
router.delete("/firm/:firmId", adminController.deleteFirm);

module.exports = router;
