const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { authUser } = require("../middleware/authUser");

// Public
router.post("/login", userController.login);           // step 1: request OTP
router.post("/verify-otp", userController.verifyOtp);  // step 2: verify OTP & get JWT
router.post("/register", userController.register);

// Protected
router.get("/me", authUser, userController.me);
router.put("/profile-picture", authUser, userController.updateProfilePicture);

// Firm connection flow
router.post("/request-firm-connect", userController.requestFirmConnect);
router.post("/verify-firm-connect", userController.verifyFirmConnect);

// Password reset flow
router.post("/request-password-reset", userController.requestPasswordReset);
router.post("/reset-password", userController.resetPassword);



module.exports = router;
