const axios = require('axios');
const { getCached, setCache } = require('../config/cache'); // ✅ Redis cache
const BASE_URL = 'https://api.coingecko.com/api/v3';
const FINNHUB_API = "https://finnhub.io/api/v1";
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const TTL = 60000; // 1 min cache

// ✅ Local fallback cache (in-memory)
const localCache = new Map();

// Helper: get from local cache
async function getLocalCache(key) {
  const entry = localCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    localCache.delete(key);
    return null;
  }
  return entry.value;
}

// Helper: set local cache
async function setLocalCache(key, value, ttl) {
  localCache.set(key, { value, expiry: Date.now() + ttl });
}

// ✅ Unified cache getter (Redis → Local)
async function getCacheWithFallback(key) {
  try {
    const redisValue = await getCached(key);
    if (redisValue) return redisValue;
  } catch (err) {
    console.error(`⚠️ Redis get failed, falling back to local for ${key}:`, err.message);
  }
  return await getLocalCache(key);
}

// ✅ Unified cache setter (Redis → Local)
async function setCacheWithFallback(key, value, ttl) {
  try {
    await setCache(key, value, ttl);
  } catch (err) {
    console.error(`⚠️ Redis set failed, storing local for ${key}:`, err.message);
    await setLocalCache(key, value, ttl);
  }
  await setLocalCache(key, value, ttl); // always keep local copy
}

// ✅ Helper: Finnhub logo fetch
async function getFinnhubLogo(symbol) {
  const cacheKey = `logo-${symbol}`;
  const cached = await getCacheWithFallback(cacheKey);
  if (cached) return cached;

  try {
    const resp = await axios.get(`${FINNHUB_API}/stock/profile2`, {
      params: { symbol, token: FINNHUB_API_KEY }
    });
    const logo = resp.data.logo || "";
    await setCacheWithFallback(cacheKey, logo, TTL);
    return logo;
  } catch (err) {
    console.error(`⚠️ Finnhub logo fetch failed for ${symbol}:`, err.message);
    return "";
  }
}

// ✅ Get simple price
async function getPrice(symbol) {
  const cacheKey = `price-${symbol}`;
  const cached = await getCacheWithFallback(cacheKey);
  if (cached) return cached;

  try {
    const response = await axios.get(`${BASE_URL}/simple/price`, {
      params: { ids: symbol, vs_currencies: 'usd' }
    });
    await setCacheWithFallback(cacheKey, response.data, TTL);
    return response.data;
  } catch (err) {
    console.error("⚠️ CoinGecko price failed, trying Finnhub:", err.message);
    try {
      const resp = await axios.get(`${FINNHUB_API}/quote`, {
        params: { symbol: `BINANCE:${symbol.toUpperCase()}USDT`, token: FINNHUB_API_KEY }
      });

      const logo = await getFinnhubLogo(symbol.toUpperCase());
      const data = {
        [symbol]: { usd: resp.data.c || null, logo }
      };
      await setCacheWithFallback(cacheKey, data, TTL);
      return data;
    } catch (innerErr) {
      console.error("⚠️ Finnhub price failed:", innerErr.message);
      return {};
    }
  }
}

// ✅ Get detailed market data
async function getMarketData(symbol) {
  const cacheKey = `marketData-${symbol}`;
  const cached = await getCacheWithFallback(cacheKey);
  if (cached) return cached;

  try {
    const response = await axios.get(`${BASE_URL}/coins/${symbol}`, {
      params: { localization: false, tickers: false, market_data: true }
    });
    await setCacheWithFallback(cacheKey, response.data.market_data, TTL);
    return response.data.market_data;
  } catch (err) {
    console.error("⚠️ CoinGecko marketData failed, trying Finnhub:", err.message);
    try {
      const resp = await axios.get(`${FINNHUB_API}/quote`, {
        params: { symbol: `BINANCE:${symbol.toUpperCase()}USDT`, token: FINNHUB_API_KEY }
      });
      const logo = await getFinnhubLogo(symbol.toUpperCase());
      const data = {
        current_price: { usd: resp.data.c || null },
        high_24h: resp.data.h || null,
        low_24h: resp.data.l || null,
        logo
      };
      await setCacheWithFallback(cacheKey, data, TTL);
      return data;
    } catch (innerErr) {
      console.error("⚠️ Finnhub marketData failed:", innerErr.message);
      return {};
    }
  }
}

// ✅ Get 30 days history
async function getHistory(symbol) {
  const cacheKey = `history-${symbol}`;
  const cached = await getCacheWithFallback(cacheKey);
  if (cached) return cached;

  try {
    const response = await axios.get(`${BASE_URL}/coins/${symbol}/market_chart`, {
      params: { vs_currency: 'usd', days: 30 }
    });
    await setCacheWithFallback(cacheKey, response.data, TTL);
    return response.data;
  } catch (err) {
    console.error("⚠️ CoinGecko history failed, trying Finnhub:", err.message);
    try {
      const resp = await axios.get(`${FINNHUB_API}/crypto/candle`, {
        params: {
          symbol: `BINANCE:${symbol.toUpperCase()}USDT`,
          resolution: "D",
          from: Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 30,
          to: Math.floor(Date.now() / 1000),
          token: FINNHUB_API_KEY
        }
      });
      await setCacheWithFallback(cacheKey, resp.data, TTL);
      return resp.data;
    } catch (innerErr) {
      console.error("⚠️ Finnhub history failed:", innerErr.message);
      return {};
    }
  }
}

// ✅ Get trending coins
async function getTrending() {
  const cacheKey = `trending`;
  const cached = await getCacheWithFallback(cacheKey);
  if (cached) return cached;

  const response = await axios.get(`${BASE_URL}/search/trending`);
  const data = response.data.coins.map(c => ({
    id: c.item.id,
    name: c.item.name,
    symbol: c.item.symbol,
    logo: c.item.small,
    market_cap_rank: c.item.market_cap_rank,
    score: c.item.score
  }));
  await setCacheWithFallback(cacheKey, data, TTL);
  return data;
}

// ✅ Get exchanges for a coin
async function getExchanges(symbol) {
  const cacheKey = `exchanges-${symbol}`;
  const cached = await getCacheWithFallback(cacheKey);
  if (cached) return cached;

  const response = await axios.get(`${BASE_URL}/coins/${symbol}/tickers`);
  const data = response.data.tickers.map(t => ({
    exchange: t.market.name,
    pair: `${t.base}/${t.target}`,
    volume: t.converted_volume.usd
  }));
  await setCacheWithFallback(cacheKey, data, TTL);
  return data;
}

// ✅ Get coin logo + metadata
async function getLogo(symbol) {
  const cacheKey = `logoMeta-${symbol}`;
  const cached = await getCacheWithFallback(cacheKey);
  if (cached) return cached;

  try {
    const response = await axios.get(`${BASE_URL}/coins/${symbol}`, {
      params: { localization: false }
    });
    const data = {
      id: response.data.id,
      name: response.data.name,
      symbol: response.data.symbol,
      logo: response.data.image.large
    };
    await setCacheWithFallback(cacheKey, data, TTL);
    return data;
  } catch (err) {
    console.error("⚠️ CoinGecko logo failed, using Finnhub:", err.message);
    const logo = await getFinnhubLogo(symbol.toUpperCase());
    const data = {
      id: symbol,
      name: symbol,
      symbol,
      logo
    };
    await setCacheWithFallback(cacheKey, data, TTL);
    return data;
  }
}

// ✅ Search coins by name or symbol
async function searchCrypto(query) {
  const cacheKey = `search-${query}`;
  const cached = await getCacheWithFallback(cacheKey);
  if (cached) return cached;

  const response = await axios.get(`${BASE_URL}/search`, {
    params: { query }
  });

  const data = response.data.coins.map(c => ({
    id: c.id,
    name: c.name,
    symbol: c.symbol,
    logo: c.thumb,
    market_cap_rank: c.market_cap_rank
  }));
  await setCacheWithFallback(cacheKey, data, TTL);
  return data;
}

// ✅ Get top selected coins
async function getTopCoins() {
  const cacheKey = `topCoins`;
  const cached = await getCacheWithFallback(cacheKey);
  if (cached) return cached;

  try {
    const response = await axios.get(`${BASE_URL}/coins/markets`, {
      params: {
        vs_currency: 'usd',
        ids: 'bitcoin,ethereum,binancecoin,tether,ripple',
        order: 'market_cap_desc',
        per_page: 5,
        page: 1,
        sparkline: false
      }
    });

    const data = response.data.map(c => ({
      id: c.id,
      name: c.name,
      symbol: c.symbol,
      price: c.current_price,
      logo: c.image,
      market_cap_rank: c.market_cap_rank
    }));
    await setCacheWithFallback(cacheKey, data, TTL);
    return data;
  } catch (err) {
    console.error("⚠️ CoinGecko topCoins failed, trying Finnhub + metadata:", err.message);

    const finnhubSymbols = [
      { id: "bitcoin", pair: "BINANCE:BTCUSDT" },
      { id: "ethereum", pair: "BINANCE:ETHUSDT" },
      { id: "binancecoin", pair: "BINANCE:BNBUSDT" },
      { id: "tether", pair: "BINANCE:USDTUSDT" },
      { id: "ripple", pair: "BINANCE:XRPUSDT" }
    ];

    const results = [];
    let metadataMap = {};

    try {
      const metaResp = await axios.get(`${BASE_URL}/coins/markets`, {
        params: {
          vs_currency: 'usd',
          ids: finnhubSymbols.map(s => s.id).join(','),
          order: 'market_cap_desc',
          per_page: 5,
          page: 1,
          sparkline: false
        }
      });

      metadataMap = metaResp.data.reduce((map, c) => {
        map[c.id] = {
          name: c.name,
          symbol: c.symbol,
          logo: c.image,
          market_cap_rank: c.market_cap_rank
        };
        return map;
      }, {});
    } catch (metaErr) {
      console.error("⚠️ CoinGecko metadata fetch failed:", metaErr.message);
    }

    for (const s of finnhubSymbols) {
      try {
        const resp = await axios.get(`${FINNHUB_API}/quote`, {
          params: { symbol: s.pair, token: FINNHUB_API_KEY }
        });

        const meta = metadataMap[s.id] || {};
        const logo = meta.logo || await getFinnhubLogo(s.pair);

        results.push({
          id: s.id,
          name: meta.name || s.id,
          symbol: meta.symbol || s.id.toUpperCase(),
          price: resp.data.c || null,
          logo,
          market_cap_rank: meta.market_cap_rank || null
        });
      } catch (innerErr) {
        console.error(`Finnhub fetch failed for ${s.pair}:`, innerErr.message);
      }
    }

    await setCacheWithFallback(cacheKey, results, TTL);
    return results;
  }
}

module.exports = { 
  getPrice, 
  getMarketData, 
  getHistory, 
  getTrending, 
  getExchanges, 
  getLogo,
  searchCrypto,
  getTopCoins
};
