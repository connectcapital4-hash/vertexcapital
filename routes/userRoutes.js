const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController.js");
const { authUser } = require("../middleware/authUser");
const { upload } = require("../middleware/upload");

// Public
router.post("/register", userController.register);
router.post("/login", userController.login);          // returns OTP for testing
router.post("/verify-otp", userController.verifyOtp);
// Password reset flow
router.post("/request-password-reset", userController.requestPasswordReset); // step 1: generate OTP
router.post("/reset-password", userController.resetPassword);               // step 2: submit OTP + new password

router.post("/regenerate-access-key", userController.regenerateAccessKey);

// Protected
router.get("/me", authUser, userController.me);

router.put(
  "/profile-picture",
  authUser,
  upload.single("profile_picture"),
  userController.updateProfilePicture
);

// Search & News
router.get("/search-firms", userController.searchFirms);
router.get("/news", userController.getNews);

module.exports = router;
