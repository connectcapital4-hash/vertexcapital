// services/portfolioGrowthService.js - FIXED (no portfolio.currentValue updates)
const Portfolio = require("../models/Portfolio");
const User = require("../models/User");
const Transaction = require("../models/transaction");

// Apply 10% daily growth - ONLY to user balance
exports.applyDailyPortfolioGrowth = async () => {
  try {
    console.log("Starting daily portfolio growth calculation...");

    // Fetch all portfolios
    const portfolios = await Portfolio.findAll();

    // Map userId -> total growth amount
    const userGrowthMap = new Map();

    for (let portfolio of portfolios) {
      try {
        const currentValue = parseFloat(portfolio.currentValue) || 0;
        if (currentValue <= 0) continue;

        // Calculate growth but ❌ don't update portfolio table
        const growthAmount = parseFloat((currentValue * 0.10).toFixed(2));

        const userId = portfolio.userId;
        const prev = userGrowthMap.get(userId) || 0;
        userGrowthMap.set(userId, parseFloat((prev + growthAmount).toFixed(2)));
      } catch (err) {
        console.error(`Error processing portfolio ${portfolio.id}:`, err);
      }
    }

    // Apply growth to each user's balance
    const processedUsers = [];
    for (let [userId, growthAmount] of userGrowthMap.entries()) {
      try {
        if (growthAmount <= 0) continue;

        const user = await User.findByPk(userId);
        if (!user) continue;

        const prevBalance = parseFloat(user.balance) || 0;
        user.balance = parseFloat((prevBalance + growthAmount).toFixed(2));
        await user.save();

        await Transaction.create({
          userId,
          type: "PORTFOLIO_GROWTH",
          amount: growthAmount,
          description: `Daily portfolio growth applied (${growthAmount.toFixed(2)})`,
          meta: {
            appliedGrowth: growthAmount,
            previousBalance: prevBalance,
            newBalance: user.balance,
            growthPercentage: 10,
            timestamp: new Date()
          },
          created_at: new Date()
        });

        processedUsers.push({
          userId,
          added: growthAmount,
          previousBalance: prevBalance,
          newBalance: user.balance
        });

        console.log(`User ${userId}: balance +${growthAmount} (from ${prevBalance} -> ${user.balance})`);
      } catch (err) {
        console.error(`Error updating user ${userId}:`, err);
      }
    }

    console.log("Daily portfolio growth calculation completed successfully");
    return {
      success: true,
      processedUsers: processedUsers.length,
      userSummaries: processedUsers
    };
  } catch (error) {
    console.error("Error in daily portfolio growth calculation:", error);
    return { success: false, error: error.message };
  }
};
