// services/portfolioGrowthService.js - FIXED (growth only affects balance, not portfolio rows)
const Portfolio = require("../models/Portfolio");
const User = require("../models/User");
const Transaction = require("../models/transaction");

// Apply 10% daily growth to all portfolios
exports.applyDailyPortfolioGrowth = async () => {
  try {
    console.log("Starting daily portfolio growth calculation...");

    // Fetch all portfolios
    const portfolios = await Portfolio.findAll();

    // Map userId -> accumulated growthAmount
    const userGrowthMap = new Map();

    for (let portfolio of portfolios) {
      try {
        const currentValue = parseFloat(portfolio.currentValue) || 0;

        if (currentValue <= 0) {
          console.log(`Skipping portfolio ${portfolio.id} with non-positive currentValue: ${currentValue}`);
          continue;
        }

        // Calculate 10% growth for this portfolio
        const growthAmount = parseFloat((currentValue * 0.10).toFixed(2));

        // Accumulate growth per user (✅ only track, don't update portfolio row)
        const userId = portfolio.userId;
        const prevGrowth = userGrowthMap.get(userId) || 0;
        userGrowthMap.set(userId, parseFloat((prevGrowth + growthAmount).toFixed(2)));

        console.log(`Calculated growth for portfolio ${portfolio.id}: +${growthAmount}`);
      } catch (portfolioError) {
        console.error(`Error processing portfolio ${portfolio.id}:`, portfolioError);
      }
    }

    // Apply accumulated growth to user balances
    const processedUsers = [];
    for (let [userId, totalGrowthForUser] of userGrowthMap.entries()) {
      try {
        if (!totalGrowthForUser || totalGrowthForUser <= 0) continue;

        const user = await User.findByPk(userId);
        if (!user) {
          console.warn(`User ${userId} not found while applying portfolio growth`);
          continue;
        }

        const previousBalance = parseFloat(user.balance) || 0;
        const newBalance = parseFloat((previousBalance + totalGrowthForUser).toFixed(2));

        // ✅ Update only the user's balance
        user.balance = newBalance;
        await user.save();

        // Create transaction record
        await Transaction.create({
          userId,
          type: "PORTFOLIO_GROWTH",
          amount: totalGrowthForUser,
          description: `Daily portfolio growth applied (${totalGrowthForUser.toFixed(2)})`,
          meta: {
            appliedGrowth: totalGrowthForUser,
            timestamp: new Date(),
            previousBalance,
            newBalance,
            growthPercentage: 10
          },
          created_at: new Date()
        });

        processedUsers.push({ userId, added: totalGrowthForUser, previousBalance, newBalance });

        console.log(`Added ${totalGrowthForUser} growth to user ${userId} (prev ${previousBalance} -> ${newBalance})`);
      } catch (userError) {
        console.error(`Error updating balance for user ${userId}:`, userError);
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

// Get portfolio growth history for a user
exports.getPortfolioGrowthHistory = async (userId) => {
  try {
    const transactions = await Transaction.findAll({
      where: { userId, type: "PORTFOLIO_GROWTH" },
      order: [['created_at', 'DESC']],
      limit: 30
    });
    return transactions;
  } catch (error) {
    console.error("Error fetching portfolio growth history:", error);
    return [];
  }
};
