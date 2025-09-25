// controllers/portfolioController.js
const Portfolio = require("../models/Portfolio");
const portfolioService = require("../services/portfolioService");

// Get user portfolio with current values
exports.getUserPortfolio = async (req, res) => {
  try {
    // Update portfolio values first
    await portfolioService.updatePortfolioValues(req.user.id);
    
    const portfolio = await Portfolio.findAll({
      where: { userId: req.user.id },
      order: [['created_at', 'DESC']]
    });
    
    res.json(portfolio);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get total portfolio value
exports.getPortfolioValue = async (req, res) => {
  try {
    const totalValue = await portfolioService.getTotalPortfolioValue(req.user.id);
    res.json({ totalValue });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

