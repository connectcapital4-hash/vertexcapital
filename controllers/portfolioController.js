// controllers/portfolioController.js - FIXED
const Portfolio = require("../models/Portfolio");
const portfolioService = require("../services/portfolioService");
const cryptoService = require("../services/cryptoService");
const stockService = require("../services/stockService");

// Get user portfolio with current values and logos - FIXED
exports.getUserPortfolio = async (req, res) => {
  try {
    const portfolio = await Portfolio.findAll({
      where: { userId: req.user.id },
      order: [['created_at', 'DESC']]
    });
    
    // Add logos to portfolio items
    const portfolioWithLogos = await Promise.all(
      portfolio.map(async (item) => {
        let logo = "";
        
        try {
          if (item.assetType === "CRYPTO") {
            const logoData = await cryptoService.getLogo(item.assetSymbol.toLowerCase());
            logo = logoData.logo || "";
          } else if (item.assetType === "STOCK") {
            const profileData = await stockService.getProfile(item.assetSymbol, process.env.FINNHUB_API_KEY);
            logo = profileData.logo || "";
          }
        } catch (error) {
          console.error(`Failed to fetch logo for ${item.assetSymbol}:`, error.message);
          logo = "";
        }
        
        return {
          ...item.toJSON(),
          logo: logo
        };
      })
    );
    
    res.json(portfolioWithLogos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get total portfolio value - FIXED to use assigned_value
exports.getPortfolioValue = async (req, res) => {
  try {
    const totalAssignedValue = await portfolioService.getTotalPortfolioValue(req.user.id);
    
    // Calculate growth based on assigned_value
    const dailyGrowth = totalAssignedValue * 0.10;
    const totalValueWithGrowth = totalAssignedValue + dailyGrowth;
    
    res.json({ 
      totalAssignedValue,
      dailyGrowth,
      totalValueWithGrowth 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// NEW: Get complete portfolio summary
exports.getPortfolioSummary = async (req, res) => {
  try {
    const summary = await portfolioService.getPortfolioSummary(req.user.id);
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};