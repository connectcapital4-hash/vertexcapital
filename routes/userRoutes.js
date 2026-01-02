const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController.js");
const { authUser } = require("../middleware/authUser");
const { upload } = require("../middleware/upload");

// Public
router.post("/register", userController.register);
router.post("/login", userController.login);
router.post("/verify-otp", userController.verifyOtp);
router.post("/reset-password", userController.resetPassword);
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

console.log("me:", typeof userController.me);
console.log("updateProfilePicture:", typeof userController.updateProfilePicture);


module.exports = router;
