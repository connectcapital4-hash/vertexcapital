const express = require('express');
const router = express.Router();
const newsController = require('../controllers/newsController');

router.get('/', newsController.getNews);
router.get('/finnhub', newsController.getFinnhubNews);

module.exports = router;
