// services/cronService.js
const cron = require('node-cron');
const portfolioGrowthService = require('./portfolioGrowthService');

// Schedule daily portfolio growth at 9 AM UTC
exports.startPortfolioGrowthScheduler = () => {
  // Run every day at 9:00 AM
  cron.schedule('0 9 * * *', async () => {
    console.log('Running scheduled daily portfolio growth...');
    try {
      const result = await portfolioGrowthService.applyDailyPortfolioGrowth();
      console.log('Scheduled portfolio growth completed:', result);
    } catch (error) {
      console.error('Scheduled portfolio growth failed:', error);
    }
  });
  
  console.log('Portfolio growth scheduler started (runs daily at 9:00 AM UTC)');
};

// Manual trigger for testing
exports.triggerManualPortfolioGrowth = async () => {
  try {
    const result = await portfolioGrowthService.applyDailyPortfolioGrowth();
    return result;
  } catch (error) {
    throw new Error(`Manual portfolio growth failed: ${error.message}`);
  }
};