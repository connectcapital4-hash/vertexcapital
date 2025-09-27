// services/portfolioService.js - FIXED
const Portfolio = require("../models/Portfolio");
const cryptoService = require("./cryptoService");
const stockService = require("./stockService");

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
    
    return true;
  } catch (error) {
    console.error("Error updating portfolio values:", error);
    return false;
  }
};

// Calculate total portfolio value - FIXED to use assigned_value
exports.getTotalPortfolioValue = async (userId) => {
  try {
    const portfolios = await Portfolio.findAll({ where: { userId } });
    
    // Sum of assigned_value from all portfolio items
    const totalAssignedValue = portfolios.reduce((total, portfolio) => {
      return total + (portfolio.assigned_value || 0);
    }, 0);
    
    return totalAssignedValue;
  } catch (error) {
    console.error("Error calculating portfolio value:", error);
    return 0;
  }
};

// Get portfolio with growth calculation - FIXED
exports.getPortfolioWithGrowth = async (userId) => {
  try {
    const portfolios = await Portfolio.findAll({ where: { userId } });
    const totalAssignedValue = await this.getTotalPortfolioValue(userId);
    
    // Calculate growth based on assigned_value
    const dailyGrowth = totalAssignedValue * 0.10; // 10% daily growth
    const projectedValue = totalAssignedValue * 1.10; // Projected value after 10% growth
    
    return {
      portfolios,
      totalAssignedValue,
      dailyGrowth,
      projectedValue
    };
  } catch (error) {
    console.error("Error getting portfolio with growth:", error);
    return { portfolios: [], totalAssignedValue: 0, dailyGrowth: 0, projectedValue: 0 };
  }
};

// NEW: Get complete portfolio summary including assigned value and growth
exports.getPortfolioSummary = async (userId) => {
  try {
    const portfolios = await Portfolio.findAll({ where: { userId } });
    
    // Calculate totals
    const totalAssignedValue = portfolios.reduce((total, portfolio) => {
      return total + (portfolio.assigned_value || 0);
    }, 0);
    
    const totalCurrentValue = portfolios.reduce((total, portfolio) => {
      return total + (portfolio.current_value || 0);
    }, 0);
    
    const totalProfitLoss = portfolios.reduce((total, portfolio) => {
      return total + (portfolio.profit_loss || 0);
    }, 0);
    
    const dailyGrowth = totalAssignedValue * 0.10;
    const projectedValue = totalAssignedValue * 1.10;
    
    return {
      totalAssignedValue,
      totalCurrentValue,
      totalProfitLoss,
      dailyGrowth,
      projectedValue,
      portfolioCount: portfolios.length
    };
  } catch (error) {
    console.error("Error getting portfolio summary:", error);
    return {
      totalAssignedValue: 0,
      totalCurrentValue: 0,
      totalProfitLoss: 0,
      dailyGrowth: 0,
      projectedValue: 0,
      portfolioCount: 0
    };
  }
};