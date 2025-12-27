// routes/publicAdminNewsRoutes.js
const express = require("express");
const router = express.Router();
const publicAdminNewsController = require("../controllers/publicAdminNewsController");

/**
 * GET /api/public/admin-news
 * Completely public
 */
router.get("/", publicAdminNewsController.getPublicAdminNews);

module.exports = router;
