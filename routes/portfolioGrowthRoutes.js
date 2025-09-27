// routes/portfolioGrowthRoutes.js
const express = require("express");
const router = express.Router();
const portfolioGrowthController = require("../controllers/portfolioGrowthController");
const { authMiddleware } = require("../middleware/auth");
const { authUser } = require("../middleware/authUser"); // Import user auth

// Apply portfolio growth (Admin only)
router.post("/apply", authMiddleware(["SUPERADMIN", "FIRMADMIN"]), portfolioGrowthController.triggerPortfolioGrowth);

// Get growth history for a user (Admin or same user)
router.get("/history/:userId", authMiddleware(["SUPERADMIN", "FIRMADMIN", "USER"]), portfolioGrowthController.getGrowthHistory);

// Get user's own growth history
router.get("/my-history", authUser, (req, res) => {
  req.params.userId = req.user.id;
  return portfolioGrowthController.getGrowthHistory(req, res);
});


module.exports = router;