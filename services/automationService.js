// services/automationService.js
const cron = require('node-cron');
const User = require("../models/User");
const Portfolio = require("../models/Portfolio");
const Transaction = require("../models/transaction");
const portfolioService = require("./portfolioService");
const emailService = require("./email");

// Schedule daily profit calculation
exports.startProfitDistribution = () => {
  // Run every day at midnight
  cron.schedule('0 0 * * *', async () => {
    console.log('Starting daily profit distribution...');
    await this.calculateAndDistributeProfits();
  });
};

// Calculate and distribute profits
exports.calculateAndDistributeProfits = async () => {
  try {
    const users = await User.findAll({ where: { status: 'ACTIVE' } });
    
    for (const user of users) {
      // Update portfolio values first
      await portfolioService.updatePortfolioValues(user.id);
      
      // Get total portfolio value
      const totalPortfolioValue = await portfolioService.getTotalPortfolioValue(user.id);
      
      // Calculate profit based on account level
      let profitPercentage = 0;
      switch (user.account_level) {
        case 'BASIC':
          profitPercentage = 0.5; // 0.5% daily
          break;
        case 'STANDARD':
          profitPercentage = 1; // 1% daily
          break;
        case 'PREMIUM':
          profitPercentage = 1.5; // 1.5% daily
          break;
        case 'LIFETIME':
          profitPercentage = 2; // 2% daily
          break;
        default:
          profitPercentage = 0.5;
      }
      
      const dailyProfit = (totalPortfolioValue * profitPercentage) / 100;
      
      if (dailyProfit > 0) {
        // Update user balance
        user.balance = parseFloat(user.balance || 0) + dailyProfit;
        await user.save();
        
        // Create transaction record
        await Transaction.create({
          userId: user.id,
          type: "PROFIT",
          amount: dailyProfit,
          description: `Daily profit distribution (${profitPercentage}%)`,
          meta: {
            portfolioValue: totalPortfolioValue,
            profitPercentage,
            accountLevel: user.account_level
          }
        });
        
        // Send email notification for significant profits
        if (dailyProfit >= 10) { // Only email for profits >= $10
          try {
            await emailService.sendProfitNotification({
              to: user.email,
              userName: user.name,
              amount: dailyProfit.toFixed(2),
              accountLevel: user.account_level,
              portfolioValue: totalPortfolioValue.toFixed(2)
            });
          } catch (emailError) {
            console.error('Failed to send profit notification:', emailError);
          }
        }
      }
    }
    
    console.log('Daily profit distribution completed');
  } catch (error) {
    console.error('Error in profit distribution:', error);
  }
};
