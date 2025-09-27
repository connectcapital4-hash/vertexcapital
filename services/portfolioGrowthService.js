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

// Update user balance based on total portfolio value
exports.updateUserBalanceFromPortfolio = async (userId) => {
  try {
    const portfolios = await Portfolio.findAll({ where: { userId } });
    const totalPortfolioValue = portfolios.reduce((total, portfolio) => {
      return total + (parseFloat(portfolio.currentValue) || 0);
    }, 0);
    
    const user = await User.findByPk(userId);
    if (user) {
      const previousBalance = parseFloat(user.balance) || 0;
      const newBalance = parseFloat(totalPortfolioValue.toFixed(2));
      
      // Update balance to reflect portfolio value
      user.balance = newBalance;
      await user.save();
      
      // Only create transaction if there's actual growth
      if (newBalance > previousBalance) {
        await Transaction.create({
          userId,
          type: "PORTFOLIO_GROWTH",
          amount: parseFloat((newBalance - previousBalance).toFixed(2)),
          description: "Daily 10% portfolio growth applied",
          meta: {
            previousBalance: previousBalance,
            newBalance: newBalance,
            growthPercentage: 10,
            timestamp: new Date()
          },
          created_at: new Date()
        });
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