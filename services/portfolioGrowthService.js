// services/portfolioGrowthService.js - FIXED and SAFE
const Portfolio = require("../models/Portfolio");
const User = require("../models/User");
const Transaction = require("../models/transaction"); // matches your DB filename 'transaction'

// Apply 10% daily growth to all portfolios
// This version: calculates per-portfolio growth, accumulates per-user growth amounts,
// updates portfolio rows, then updates each user's balance by the exact growth amount.
// This prevents accidental overwrites or restoring of previously-withdrawn balances.
exports.applyDailyPortfolioGrowth = async () => {
  try {
    console.log("Starting daily portfolio growth calculation...");

    // Fetch all portfolios (could be large — consider batching if your DB is huge)
    const portfolios = await Portfolio.findAll();

    // Map of userId -> total growthAmount to add to that user's balance
    const userGrowthMap = new Map();

    // Track successful portfolio updates count
    let updatedPortfoliosCount = 0;

    for (let portfolio of portfolios) {
      try {
        // Ensure numeric values are read safely
        const currentValue = parseFloat(portfolio.currentValue) || 0;

        // If currentValue is zero or falsy, skip growth application
        if (currentValue <= 0) {
          console.log(`Skipping portfolio ${portfolio.id} with non-positive currentValue: ${currentValue}`);
          continue;
        }

        // Calculate 10% growth for this portfolio
        const growthAmount = parseFloat((currentValue * 0.10).toFixed(2)); // round to 2 decimals
        const newValue = parseFloat((currentValue + growthAmount).toFixed(2));

        // Update portfolio values
        await portfolio.update({
          currentValue: newValue,
          profitLoss: parseFloat((newValue - (parseFloat(portfolio.quantity || 0) * parseFloat(portfolio.purchasePrice || 0))).toFixed(2)),
          lastUpdated: new Date()
        });

        updatedPortfoliosCount++;

        // Accumulate growth per user
        const userId = portfolio.userId;
        const previous = userGrowthMap.get(userId) || 0;
        userGrowthMap.set(userId, parseFloat((previous + growthAmount).toFixed(2)));

        console.log(`Applied growth to portfolio ${portfolio.id}: ${currentValue} -> ${newValue} (growth ${growthAmount})`);
      } catch (portfolioError) {
        console.error(`Error processing portfolio ${portfolio.id}:`, portfolioError);
        // continue processing other portfolios
      }
    }

    // Now apply accumulated growth to each user's balance and create transactions
    const processedUsers = [];
    for (let [userId, totalGrowthForUser] of userGrowthMap.entries()) {
      try {
        if (!totalGrowthForUser || totalGrowthForUser <= 0) continue;

        const user = await User.findByPk(userId);
        if (!user) {
          console.warn(`User ${userId} not found while applying portfolio growth`);
          continue;
        }

        // Add only the actual growth amount to the existing balance
        const previousBalance = parseFloat(user.balance) || 0;
        user.balance = parseFloat((previousBalance + totalGrowthForUser).toFixed(2));
        await user.save();

        // Create a transaction recording the growth addition
        await Transaction.create({
          userId,
          type: "PORTFOLIO_GROWTH",
          amount: totalGrowthForUser,
          description: `Daily portfolio growth applied (${(totalGrowthForUser).toFixed(2)})`,
          meta: {
            appliedGrowth: totalGrowthForUser,
            timestamp: new Date(),
            previousBalance,
            newBalance: user.balance,
            growthPercentagePerPortfolio: 10
          },
          created_at: new Date()
        });

        processedUsers.push({ userId, added: totalGrowthForUser, previousBalance, newBalance: user.balance });

        console.log(`Added portfolio growth of ${totalGrowthForUser} to user ${userId} (previous ${previousBalance} -> ${user.balance})`);
      } catch (userError) {
        console.error(`Error updating balance for user ${userId}:`, userError);
      }
    }

    console.log("Daily portfolio growth calculation completed successfully");
    return {
      success: true,
      processedPortfolios: updatedPortfoliosCount,
      processedUsers: processedUsers.length,
      userSummaries: processedUsers // includes per-user applied growth summary
    };
  } catch (error) {
    console.error("Error in daily portfolio growth calculation:", error);
    return { success: false, error: error.message };
  }
};

// Update user balance based on an explicit growth amount (kept for external usage if needed).
// This function will only add the provided growthAmount — it will NOT overwrite balances.
exports.updateUserBalanceFromPortfolio = async (userId, growthAmount = 0) => {
  try {
    growthAmount = parseFloat(growthAmount) || 0;

    if (growthAmount <= 0) {
      // Nothing to do
      return { success: true, applied: 0 };
    }

    const user = await User.findByPk(userId);
    if (!user) throw new Error(`User ${userId} not found`);

    const previousBalance = parseFloat(user.balance) || 0;
    user.balance = parseFloat((previousBalance + growthAmount).toFixed(2));
    await user.save();

    await Transaction.create({
      userId,
      type: "PORTFOLIO_GROWTH",
      amount: growthAmount,
      description: "Portfolio growth applied (manual/partial)",
      meta: {
        appliedGrowth: growthAmount,
        previousBalance,
        newBalance: user.balance,
        timestamp: new Date()
      },
      created_at: new Date()
    });

    console.log(`updateUserBalanceFromPortfolio: user ${userId} +${growthAmount} (prev ${previousBalance} -> ${user.balance})`);
    return { success: true, applied: growthAmount, previousBalance, newBalance: user.balance };
  } catch (error) {
    console.error(`Error updating balance for user ${userId}:`, error);
    throw error;
  }
};

// Get portfolio growth history for a user (unchanged logic)
exports.getPortfolioGrowthHistory = async (userId) => {
  try {
    const transactions = await Transaction.findAll({
      where: {
        userId,
        type: "PORTFOLIO_GROWTH"
      },
      order: [['created_at', 'DESC']],
      limit: 30 // Last 30 entries
    });

    return transactions;
  } catch (error) {
    console.error("Error fetching portfolio growth history:", error);
    return [];
  }
};
