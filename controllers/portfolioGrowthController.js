// controllers/portfolioGrowthController.js
const portfolioGrowthService = require("../services/portfolioGrowthService");

// Manual trigger for portfolio growth (admin only)
exports.triggerPortfolioGrowth = async (req, res) => {
  try {
    const result = await portfolioGrowthService.applyDailyPortfolioGrowth();
    res.json({ 
      success: true, 
      message: 'Portfolio growth applied successfully', 
      result 
    });
  } catch (error) {
    console.error("Error triggering portfolio growth:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// Get portfolio growth history for a user
exports.getGrowthHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const history = await portfolioGrowthService.getPortfolioGrowthHistory(userId);
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error("Error fetching growth history:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};