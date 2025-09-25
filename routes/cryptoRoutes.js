const express = require('express');
const router = express.Router();
const cryptoController = require('../controllers/cryptoController');

// ⚠️ ORDER MATTERS → put static routes BEFORE dynamic ones

// Trending
router.get('/trending/list', cryptoController.getTrending);

// Search
router.get('/search/query', cryptoController.searchCrypto);

// Logos
router.get('/:symbol/logo', cryptoController.getLogo);

// Exchanges
router.get('/:symbol/exchanges', cryptoController.getExchanges);

// Historical data
router.get('/:symbol/history', cryptoController.getHistory);

// Market data
router.get('/:symbol/market', cryptoController.getMarket);

// Price (last so it doesn’t catch above routes)
router.get('/:symbol', cryptoController.getPrice);

// Top coins
router.get('/top/list', cryptoController.getTopCoins);


module.exports = router;

