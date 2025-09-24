const cryptoService = require('../services/cryptoService');
const cache = require('../config/cache');

const TTL = 60000; // 1 min cache

// ✅ Get crypto price
async function getPrice(req, res) {
  try {
    const symbol = req.params.symbol.toLowerCase();
    const cacheKey = `crypto-price-${symbol}`;
    const cached = await cache.getCached(cacheKey); // <-- await added
    if (cached) return res.json(cached);

    const data = await cryptoService.getPrice(symbol);
    await cache.setCache(cacheKey, data, TTL); // <-- await added
    res.json(data);
  } catch (err) {
    console.error('Crypto error (price):', err.message);
    res.status(500).json({ error: 'Failed to fetch crypto price' });
  }
}

// ✅ Get market data
async function getMarket(req, res) {
  try {
    const symbol = req.params.symbol.toLowerCase();
    const cacheKey = `crypto-market-${symbol}`;
    const cached = await cache.getCached(cacheKey); // <-- await added
    if (cached) return res.json(cached);

    const data = await cryptoService.getMarketData(symbol);
    await cache.setCache(cacheKey, data, TTL); // <-- await added
    res.json(data);
  } catch (err) {
    console.error('Crypto error (market):', err.message);
    res.status(500).json({ error: 'Failed to fetch market data' });
  }
}

// ✅ Get 30-day history
async function getHistory(req, res) {
  try {
    const symbol = req.params.symbol.toLowerCase();
    const cacheKey = `crypto-history-${symbol}`;
    const cached = await cache.getCached(cacheKey); // <-- await added
    if (cached) return res.json(cached);

    const data = await cryptoService.getHistory(symbol);
    await cache.setCache(cacheKey, data, TTL * 5); // 5 min cache
    res.json(data);
  } catch (err) {
    console.error('Crypto error (history):', err.message);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
}

// ✅ Get trending coins
async function getTrending(req, res) {
  try {
    const cacheKey = `crypto-trending`;
    const cached = await cache.getCached(cacheKey); // <-- await added
    if (cached) return res.json(cached);

    const data = await cryptoService.getTrending();
    await cache.setCache(cacheKey, data, TTL); // <-- await added
    res.json(data);
  } catch (err) {
    console.error('Crypto error (trending):', err.message);
    res.status(500).json({ error: 'Failed to fetch trending coins' });
  }
}

// ✅ Get exchanges for a coin
async function getExchanges(req, res) {
  try {
    const symbol = req.params.symbol.toLowerCase();
    const cacheKey = `crypto-exchanges-${symbol}`;
    const cached = await cache.getCached(cacheKey); // <-- await added
    if (cached) return res.json(cached);

    const data = await cryptoService.getExchanges(symbol);
    await cache.setCache(cacheKey, data, TTL * 2); // 2 min cache
    res.json(data);
  } catch (err) {
    console.error('Crypto error (exchanges):', err.message);
    res.status(500).json({ error: 'Failed to fetch exchanges' });
  }
}

// ✅ Get coin logo
async function getLogo(req, res) {
  try {
    const symbol = req.params.symbol.toLowerCase();
    const cacheKey = `crypto-logo-${symbol}`;
    const cached = await cache.getCached(cacheKey); // <-- await added
    if (cached) return res.json(cached);

    const data = await cryptoService.getLogo(symbol);
    await cache.setCache(cacheKey, data, TTL * 10); // 10 min cache
    res.json(data);
  } catch (err) {
    console.error('Crypto error (logo):', err.message);
    res.status(500).json({ error: 'Failed to fetch logo' });
  }
}

// ✅ Search crypto coins
async function searchCrypto(req, res) {
  try {
    const query = req.query.q;
    if (!query) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    const cacheKey = `crypto-search-${query.toLowerCase()}`;
    const cached = await cache.getCached(cacheKey); // <-- await added
    if (cached) return res.json(cached);

    const data = await cryptoService.searchCrypto(query);
    await cache.setCache(cacheKey, data, TTL); // <-- await added
    res.json(data);
  } catch (err) {
    console.error('Crypto error (search):', err.message);
    res.status(500).json({ error: 'Failed to search crypto' });
  }
}

// ✅ Get top coins
async function getTopCoins(req, res) {
  try {
    const cacheKey = `crypto-top-coins`;
    const cached = await cache.getCached(cacheKey);
    if (cached) return res.json(cached);

    const data = await cryptoService.getTopCoins();
    await cache.setCache(cacheKey, data, TTL * 2); // cache for 2 min
    res.json(data);
  } catch (err) {
    console.error('Crypto error (top coins):', err.message);
    res.status(500).json({ error: 'Failed to fetch top coins' });
  }
}


module.exports = { 
  getPrice, 
  getMarket, 
  getHistory, 
  getTrending, 
  getExchanges, 
  getLogo,
  searchCrypto,
  getTopCoins   // <-- new
};
