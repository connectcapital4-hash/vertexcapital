// controllers/portfolioController.js - ENHANCED with logos and growth
const Portfolio = require("../models/Portfolio");
const portfolioService = require("../services/portfolioService");
const cryptoService = require("../services/cryptoService");
const stockService = require("../services/stockService");

// Get user portfolio with logos
exports.getUserPortfolio = async (req, res) => {
  try {
    const portfolio = await Portfolio.findAll({
      where: { userId: req.user.id },
      order: [['created_at', 'DESC']]
    });

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

// Get total portfolio value (assigned + growth)
exports.getPortfolioValue = async (req, res) => {
  try {
    const totals = await portfolioService.getTotalPortfolioValue(req.user.id);
    res.json(totals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
