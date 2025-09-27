// services/portfolioGrowthService.js
const Portfolio = require("../models/Portfolio");
const User = require("../models/User");
const Transaction = require("../models/transaction");

// Apply 10% daily growth to all portfolios
exports.applyDailyPortfolioGrowth = async () => {
  try {
    console.log("Starting daily portfolio growth calculation...");
    
    const portfolios = await Portfolio.findAll();
    const processedUsers = new Set();
    
    for (let portfolio of portfolios) {
      try {
        // Calculate 10% growth
        const growthAmount = portfolio.currentValue * 0.10;
        const newValue = parseFloat((portfolio.currentValue + growthAmount).toFixed(2));
        
        // Update portfolio value
        await portfolio.update({
          currentValue: newValue,
          profitLoss: parseFloat((newValue - (portfolio.quantity * portfolio.purchasePrice)).toFixed(2)),
          lastUpdated: new Date()
        });
        
        // Add user to processed set to update balance once per user
        processedUsers.add(portfolio.userId);
        
        console.log(`Applied 10% growth to portfolio ${portfolio.id}: ${portfolio.currentValue} → ${newValue}`);
        
      } catch (portfolioError) {
        console.error(`Error processing portfolio ${portfolio.id}:`, portfolioError);
        continue;
      }
    }
    
    // Update user balances for all processed users
    for (let userId of processedUsers) {
      try {
        await this.updateUserBalanceFromPortfolio(userId);
      } catch (userError) {
        console.error(`Error updating balance for user ${userId}:`, userError);
      }
    }
    
    console.log("Daily portfolio growth calculation completed successfully");
    return { 
      success: true, 
      processedPortfolios: portfolios.length, 
      processedUsers: processedUsers.size 
    };
    
  } catch (error) {
    console.error("Error in daily portfolio growth calculation:", error);
    return { success: false, error: error.message };
  }
};

// services/portfolioGrowthService.js - MUST HAVE THIS FIXED VERSION
// Update user balance based on total portfolio value - FIXED
exports.updateUserBalanceFromPortfolio = async (userId) => {
  try {
    const portfolios = await Portfolio.findAll({ where: { userId } });
    const totalPortfolioValue = portfolios.reduce((total, portfolio) => {
      return total + (parseFloat(portfolio.currentValue) || 0);
    }, 0);
    
    const user = await User.findByPk(userId);
    if (user) {
      const previousBalance = parseFloat(user.balance) || 0;
      
      // ✅ FIX: Only add the growth amount, don't overwrite the entire balance
      const growthAmount = parseFloat((totalPortfolioValue - previousBalance).toFixed(2));
      
      if (growthAmount > 0) {
        // Add only the growth to the current balance
        user.balance = parseFloat((previousBalance + growthAmount).toFixed(2));
        await user.save();
        
        // Create transaction for the growth amount only
        await Transaction.create({
          userId,
          type: "PORTFOLIO_GROWTH",
          amount: growthAmount,
          description: "Daily 10% portfolio growth applied",
          meta: {
            previousBalance: previousBalance,
            newBalance: user.balance,
            growthPercentage: 10,
            timestamp: new Date()
          },
          created_at: new Date()
        });
        
        console.log(`Added portfolio growth of ${growthAmount} to user ${userId}`);
      }
    }
    
    return totalPortfolioValue;
  } catch (error) {
    console.error(`Error updating balance for user ${userId}:`, error);
    throw error;
  }
};

// Get portfolio growth history for a user
exports.getPortfolioGrowthHistory = async (userId) => {
  try {
    const transactions = await Transaction.findAll({
      where: { 
        userId,
        type: "PORTFOLIO_GROWTH" 
      },
      order: [['created_at', 'DESC']],
      limit: 30 // Last 30 days
    });
    
    return transactions;
  } catch (error) {
    console.error("Error fetching portfolio growth history:", error);
    return [];
  }
};