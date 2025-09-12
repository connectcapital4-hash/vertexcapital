const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stockController');

// Top stocks
router.get("/top/list", stockController.getTopStocks);

// Search stocks
router.get("/search/query", stockController.searchStock);


// Stock endpoints
router.get('/:symbol', stockController.getQuote);          // e.g. /api/stocks/AAPL → price
router.get('/:symbol/profile', stockController.getProfile); // e.g. /api/stocks/AAPL/profile → company profile
router.get('/:symbol/history', stockController.getHistory); // e.g. /api/stocks/AAPL/history → 30-day history
router.get('/:symbol/dividends', stockController.getDividends); // e.g. /api/stocks/AAPL/dividends → dividends
router.get('/:symbol/indicators', stockController.getIndicators); // e.g. /api/stocks/AAPL/indicators → RSI, MA, etc.
router.get('/:symbol/logo', stockController.getLogo); // e.g. /api/stocks/AAPL/logo → logo + metadata

module.exports = router;
