// services/portfolioService.js - FIXED
const Portfolio = require("../models/Portfolio");
const cryptoService = require("./cryptoService");
const stockService = require("./stockService");
// ❌ REMOVE this import since we're not updating balances here
// const portfolioGrowthService = require("./portfolioGrowthService");

// Update portfolio values with real-time market data - FIXED
exports.updatePortfolioValues = async (userId) => {
  try {
    // Fetch all portfolios for the user
    const portfolios = await Portfolio.findAll({ where: { userId } });
    
    for (let portfolio of portfolios) {
      // Skip portfolios with current_value 0
      if (portfolio.current_value === 0) continue;

      let currentPrice = 0;

      // Fetch current price based on asset type
      if (portfolio.asset_type === "CRYPTO") {
        const priceData = await cryptoService.getPrice(portfolio.asset_symbol);
        currentPrice = priceData?.usd || 0;
      } else if (portfolio.asset_type === "STOCK") {
        const quoteData = await stockService.getQuote(portfolio.asset_symbol, process.env.FINNHUB_API_KEY);
        currentPrice = quoteData?.c || 0;
      }

      // Update portfolio only if currentPrice is valid
      if (currentPrice > 0) {
        const currentValue = portfolio.quantity * currentPrice;
        const profitLoss = currentValue - (portfolio.quantity * portfolio.purchase_price);
        
        await portfolio.update({
          current_value: currentValue,
          profit_loss: profitLoss,
          last_updated: new Date()
        });
      }
    }
    
    // ❌ DO NOT update user balance here
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
    // First update portfolio values with current market data
    await this.updatePortfolioValues(userId);
    
    // Then fetch the updated portfolios and sum current_value
    const portfolios = await Portfolio.findAll({ 
      where: { userId },
      attributes: ['currentValue']
    });
    
    return portfolios.reduce((total, portfolio) => {
      return total + parseFloat(portfolio.currentValue || 0);
    }, 0);
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