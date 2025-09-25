const axios = require('axios');
require('dotenv').config();
const stockService = require('../services/stockService');
const cache = require('../config/cache');

const FINNHUB_API = "https://finnhub.io/api/v1";
const API_KEY = process.env.FINNHUB_API_KEY;
const TTL = 60000; // default 1 min cache

// 📌 1. Get Stock Quote
exports.getQuote = async (req, res) => {
  try {
    const { symbol } = req.params;
    const cacheKey = `stock-quote-${symbol}`;
    const cached = await cache.getCached(cacheKey); // <-- await added
    if (cached) return res.json(cached);

    const response = await axios.get(`${FINNHUB_API}/quote?symbol=${symbol}&token=${API_KEY}`);
    await cache.setCache(cacheKey, response.data, TTL); // <-- await added
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: "Error fetching stock quote" });
  }
};

// 📌 2. Get Company Profile
exports.getProfile = async (req, res) => {
  try {
    const { symbol } = req.params;
    const cacheKey = `stock-profile-${symbol}`;
    const cached = await cache.getCached(cacheKey); // <-- await added
    if (cached) return res.json(cached);

    const response = await axios.get(`${FINNHUB_API}/stock/profile2?symbol=${symbol}&token=${API_KEY}`);
    await cache.setCache(cacheKey, response.data, TTL * 10); // <-- await added
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: "Error fetching stock profile" });
  }
};

// 📌 3. Get Stock History
exports.getHistory = async (req, res) => {
  try {
    const { symbol } = req.params;
    const cacheKey = `stock-history-${symbol}`;
    const cached = await cache.getCached(cacheKey); // <-- await added
    if (cached) return res.json(cached);

    const now = Math.floor(Date.now() / 1000);
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60);
    const response = await axios.get(`${FINNHUB_API}/stock/candle?symbol=${symbol}&resolution=D&from=${thirtyDaysAgo}&to=${now}&token=${API_KEY}`);
    await cache.setCache(cacheKey, response.data, TTL * 5); // <-- await added
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: "Error fetching stock history" });
  }
};

// 📌 4. Get Dividends
exports.getDividends = async (req, res) => {
  try {
    const { symbol } = req.params;
    const cacheKey = `stock-dividends-${symbol}`;
    const cached = await cache.getCached(cacheKey); // <-- await added
    if (cached) return res.json(cached);

    const response = await axios.get(`${FINNHUB_API}/stock/dividend?symbol=${symbol}&token=${API_KEY}`);
    await cache.setCache(cacheKey, response.data, TTL * 10); // <-- await added
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: "Error fetching dividends" });
  }
};

// 📌 5. Get Technical Indicators
exports.getIndicators = async (req, res) => {
  try {
    const { symbol } = req.params;
    const cacheKey = `stock-indicators-${symbol}`;
    const cached = await cache.getCached(cacheKey); // <-- await added
    if (cached) return res.json(cached);

    const now = Math.floor(Date.now() / 1000);
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60);

    const response = await axios.get(`${FINNHUB_API}/indicator?symbol=${symbol}&resolution=D&from=${thirtyDaysAgo}&to=${now}&indicator=rsi&token=${API_KEY}`);
    await cache.setCache(cacheKey, response.data, TTL); // <-- await added
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: "Error fetching indicators" });
  }
};

// 📌 6. Get Stock Logo
exports.getLogo = async (req, res) => {
  try {
    const { symbol } = req.params;
    const cacheKey = `stock-logo-${symbol}`;
    const cached = await cache.getCached(cacheKey); // <-- await added
    if (cached) return res.json(cached);

    const response = await axios.get(`${FINNHUB_API}/stock/profile2?symbol=${symbol}&token=${API_KEY}`);
    const logoData = {
      logo: response.data.logo,
      name: response.data.name,
      ticker: response.data.ticker,
      exchange: response.data.exchange
    };
    await cache.setCache(cacheKey, logoData, TTL * 10); // <-- await added
    res.json(logoData);
  } catch (err) {
    res.status(500).json({ error: "Error fetching logo" });
  }
};

// 📌 7. Get Top Stocks
exports.getTopStocks = async (req, res) => {
  try {
    const cacheKey = `stock-top`;
    const cached = await cache.getCached(cacheKey); // <-- await added
    if (cached) return res.json(cached);

    const data = await stockService.getTopStocks(API_KEY);
    await cache.setCache(cacheKey, data, TTL * 5); // <-- await added
    res.json(data);
  } catch (err) {
    console.error("Error fetching top stocks:", err.message);
    res.status(500).json({ error: "Error fetching top stocks" });
  }
};

// 📌 8. Search Stocks
exports.searchStock = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: "Query parameter 'q' is required" });

    const cacheKey = `stock-search-${q.toLowerCase()}`;
    const cached = await cache.getCached(cacheKey); // <-- await added
    if (cached) return res.json(cached);

    const data = await stockService.searchStock(q, API_KEY);
    await cache.setCache(cacheKey, data, TTL); // <-- await added
    res.json(data);
  } catch (err) {
    console.error("Error searching stock:", err.message);
    res.status(500).json({ error: "Error searching stock" });
  }
};
///c%3A/Users/USER/capitalconnect/backend/config/cloudinary.j
