// services/portfolioService.js
const Portfolio = require("../models/Portfolio");
const cryptoService = require("./cryptoService");
const stockService = require("./stockService");

// Update portfolio values with real-time market data
exports.updatePortfolioValues = async (userId) => {
  try {
    const portfolios = await Portfolio.findAll({ where: { userId } });
    
    for (let portfolio of portfolios) {
      let currentPrice;
      
      if (portfolio.assetType === "CRYPTO") {
        const priceData = await cryptoService.getPrice(portfolio.assetSymbol);
        currentPrice = priceData[portfolio.assetSymbol]?.usd || 0;
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
    
    return true;
  } catch (error) {
    console.error("Error updating portfolio values:", error);
    return false;
  }
};

// Calculate total portfolio value
exports.getTotalPortfolioValue = async (userId) => {
  try {
    await this.updatePortfolioValues(userId);
    const portfolios = await Portfolio.findAll({ where: { userId } });
    
    return portfolios.reduce((total, portfolio) => {
      return total + (portfolio.currentValue || 0);
    }, 0);
  } catch (error) {
    console.error("Error calculating portfolio value:", error);
    return 0;
  }
};
