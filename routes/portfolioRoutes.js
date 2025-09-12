// routes/portfolioRoutes.js
const express = require("express");
const router = express.Router();
const portfolioController = require("../controllers/portfolioController");
const { authUser } = require("../middleware/authUser");

router.get("/", authUser, portfolioController.getUserPortfolio);
router.get("/value", authUser, portfolioController.getPortfolioValue);