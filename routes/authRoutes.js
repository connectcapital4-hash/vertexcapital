const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { authMiddleware } = require("../middleware/auth");

// Register Admin (SUPERADMIN only)
router.post("/register", authMiddleware(["SUPERADMIN"]), authController.registerAdmin);

// Login Admin
router.post("/login", authController.loginAdmin);

module.exports = router;
