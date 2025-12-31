const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { authUser } = require("../middleware/authUser");
const { upload } = require("../middleware/upload"); // ✅ destructured

// Public routes
router.post("/login", userController.login);           // step 1: request OTP
router.post("/verify-otp", userController.verifyOtp);  // step 2: verify OTP & get JWT
router.post("/register", userController.register);

// Protected routes
router.get("/me", authUser, userController.me);

// ✅ Profile picture upload
router.put(
  "/profile-picture",
  authUser,
  upload.single("profile_picture"), // ✅ works now
  userController.updateProfilePicture
);

// Firm connection flow
router.post("/request-firm-connect", userController.requestFirmConnect);
router.post("/verify-firm-connect", userController.verifyFirmConnect);

// Password reset flow
router.post("/request-password-reset", userController.requestPasswordReset);
router.post("/reset-password", userController.resetPassword);

// Search firms
router.get("/search-firms", userController.searchFirms);

// News endpoint (public)
router.get("/news", userController.getNews);

module.exports = router;
