// routes/portfolio.js - UPDATED
const express = require("express");
const router = express.Router();
const portfolioController = require("../controllers/portfolioController");
const { authUser } = require("../middleware/authUser");

router.get("/", authUser, portfolioController.getUserPortfolio);
router.get("/value", authUser, portfolioController.getPortfolioValue);
router.get("/summary", authUser, portfolioController.getPortfolioSummary);

module.exports = router;