// services/portfolioService.js - FIXED
const Portfolio = require("../models/Portfolio");
const cryptoService = require("./cryptoService");
const stockService = require("./stockService");
// ❌ REMOVE this import since we're not updating balances here
// const portfolioGrowthService = require("./portfolioGrowthService");

// Update portfolio values with real-time market data - FIXED
exports.updatePortfolioValues = async (userId) => {
  try {
    const portfolios = await Portfolio.findAll({ where: { userId } });
    
    for (let portfolio of portfolios) {
      let currentPrice;
      
      if (portfolio.assetType === "CRYPTO") {
        const priceData = await cryptoService.getPrice(portfolio.assetSymbol);
        currentPrice = priceData.usd || 0;
      } else if (portfolio.assetType === "STOCK") {
        const quoteData = await stockService.getQuote(portfolio.assetSymbol, process.env.FINNHUB_API_KEY);
        currentPrice = quoteData.c || 0;
      }
      
      if (currentPrice) {
        const currentValue = portfolio.quantity * currentPrice;
        const profitLoss = currentValue - (portfolio.quantity * portfolio.purchasePrice);
        
        await portfolio.update({
          currentValue,
          profitLoss,
          lastUpdated: new Date()
        });
      }
    }
    
    // ❌ REMOVE THIS LINE - don't update user balance here
    // await portfolioGrowthService.updateUserBalanceFromPortfolio(userId);
    
    return true;
  } catch (error) {
    console.error("Error updating portfolio values:", error);
    return false;
  }
};

// Calculate total portfolio value - FIXED
exports.getTotalPortfolioValue = async (userId) => {
  try {
    // ❌ REMOVE this line or keep it but it won't affect balances anymore
    // await this.updatePortfolioValues(userId);

    const portfolios = await Portfolio.findAll({ where: { userId } });

    const totalValue = portfolios.reduce((total, portfolio) => {
      return total + (portfolio.currentValue || 0);
    }, 0);

    // ✅ Fix: ensure proper float with 2 decimals
    return parseFloat(totalValue.toFixed(2));
  } catch (error) {
    console.error("Error calculating portfolio value:", error);
    return 0;
  }
};


// Get portfolio with growth calculation - FIXED
exports.getPortfolioWithGrowth = async (userId) => {
  try {
    const portfolios = await Portfolio.findAll({ where: { userId } });
    const totalValue = await this.getTotalPortfolioValue(userId);
    
    return {
      portfolios,
      totalValue,
      dailyGrowth: totalValue * 0.10, // Projected daily growth
      projectedValue: totalValue * 1.10 // Projected value after growth
    };
  } catch (error) {
    console.error("Error getting portfolio with growth:", error);
    return { portfolios: [], totalValue: 0, dailyGrowth: 0, projectedValue: 0 };
  }
};