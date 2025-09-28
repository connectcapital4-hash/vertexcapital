const portfolioWithdrawalService = require("../services/portfolioWithdrawalService");

// Get available portfolio for withdrawal
exports.getAvailablePortfolio = async (req, res) => {
  try {
    const availablePortfolio = await portfolioWithdrawalService.getAvailablePortfolio(req.user.id);
    res.json({ success: true, data: availablePortfolio });
  } catch (error) {
    console.error("Error fetching available portfolio:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Withdraw portfolio asset
exports.withdrawPortfolio = async (req, res) => {
  try {
    const { portfolioId, saleType, amount } = req.body;
    if (!portfolioId || !saleType || amount === undefined) {
      return res.status(400).json({ success: false, error: "Missing required fields: portfolioId, saleType, amount" });
    }
    if (!["QUANTITY", "PERCENTAGE"].includes(saleType)) {
      return res.status(400).json({ success: false, error: "Invalid sale type. Must be QUANTITY or PERCENTAGE" });
    }

    const result = await portfolioWithdrawalService.withdrawPortfolioAsset(req.user.id, {
      portfolioId,
      saleType,
      amount
    });

    res.json({ success: true, message: "Portfolio withdrawal completed successfully", data: result });
  } catch (error) {
    console.error("Portfolio withdrawal error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get withdrawal history
exports.getWithdrawalHistory = async (req, res) => {
  try {
    const { limit } = req.query;
    const history = await portfolioWithdrawalService.getWithdrawalHistory(req.user.id, limit ? parseInt(limit) : 50);
    res.json({ success: true, data: history });
  } catch (error) {
    console.error("Error fetching withdrawal history:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};
