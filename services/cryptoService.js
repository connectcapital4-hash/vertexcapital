const axios = require('axios');
const BASE_URL = 'https://api.coingecko.com/api/v3';
const FINNHUB_API = "https://finnhub.io/api/v1";
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

// ✅ Helper: Finnhub logo fetch
async function getFinnhubLogo(symbol) {
  try {
    const resp = await axios.get(`${FINNHUB_API}/stock/profile2`, {
      params: { symbol, token: FINNHUB_API_KEY }
    });
    return resp.data.logo || "";
  } catch (err) {
    console.error(`⚠️ Finnhub logo fetch failed for ${symbol}:`, err.message);
    return "";
  }
}

// ✅ Get simple price
async function getPrice(symbol) {
  try {
    const response = await axios.get(`${BASE_URL}/simple/price`, {
      params: { ids: symbol, vs_currencies: 'usd' }
    });
    return response.data;
  } catch (err) {
    console.error("⚠️ CoinGecko price failed, trying Finnhub:", err.message);
    try {
      const resp = await axios.get(`${FINNHUB_API}/quote`, {
        params: { symbol: `BINANCE:${symbol.toUpperCase()}USDT`, token: FINNHUB_API_KEY }
      });

      const logo = await getFinnhubLogo(symbol.toUpperCase());
      return {
        [symbol]: { usd: resp.data.c || null, logo }
      };
    } catch (innerErr) {
      console.error("⚠️ Finnhub price failed:", innerErr.message);
      return {};
    }
  }
}

// ✅ Get detailed market data
async function getMarketData(symbol) {
  try {
    const response = await axios.get(`${BASE_URL}/coins/${symbol}`, {
      params: { localization: false, tickers: false, market_data: true }
    });
    return response.data.market_data;
  } catch (err) {
    console.error("⚠️ CoinGecko marketData failed, trying Finnhub:", err.message);
    try {
      const resp = await axios.get(`${FINNHUB_API}/quote`, {
        params: { symbol: `BINANCE:${symbol.toUpperCase()}USDT`, token: FINNHUB_API_KEY }
      });
      const logo = await getFinnhubLogo(symbol.toUpperCase());
      return {
        current_price: { usd: resp.data.c || null },
        high_24h: resp.data.h || null,
        low_24h: resp.data.l || null,
        logo
      };
    } catch (innerErr) {
      console.error("⚠️ Finnhub marketData failed:", innerErr.message);
      return {};
    }
  }
}

// ✅ Get 30 days history
async function getHistory(symbol) {
  try {
    const response = await axios.get(`${BASE_URL}/coins/${symbol}/market_chart`, {
      params: { vs_currency: 'usd', days: 30 }
    });
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
      return resp.data;
    } catch (innerErr) {
      console.error("⚠️ Finnhub history failed:", innerErr.message);
      return {};
    }
  }
}

// ✅ Get trending coins
async function getTrending() {
  const response = await axios.get(`${BASE_URL}/search/trending`);
  return response.data.coins.map(c => ({
    id: c.item.id,
    name: c.item.name,
    symbol: c.item.symbol,
    logo: c.item.small,
    market_cap_rank: c.item.market_cap_rank,
    score: c.item.score
  }));
}

// ✅ Get exchanges for a coin
async function getExchanges(symbol) {
  const response = await axios.get(`${BASE_URL}/coins/${symbol}/tickers`);
  return response.data.tickers.map(t => ({
    exchange: t.market.name,
    pair: `${t.base}/${t.target}`,
    volume: t.converted_volume.usd
  }));
}

// ✅ Get coin logo + metadata
async function getLogo(symbol) {
  try {
    const response = await axios.get(`${BASE_URL}/coins/${symbol}`, {
      params: { localization: false }
    });
    return {
      id: response.data.id,
      name: response.data.name,
      symbol: response.data.symbol,
      logo: response.data.image.large
    };
  } catch (err) {
    console.error("⚠️ CoinGecko logo failed, using Finnhub:", err.message);
    const logo = await getFinnhubLogo(symbol.toUpperCase());
    return {
      id: symbol,
      name: symbol,
      symbol,
      logo
    };
  }
}

// ✅ Search coins by name or symbol
async function searchCrypto(query) {
  const response = await axios.get(`${BASE_URL}/search`, {
    params: { query }
  });

  return response.data.coins.map(c => ({
    id: c.id,
    name: c.name,
    symbol: c.symbol,
    logo: c.thumb,
    market_cap_rank: c.market_cap_rank
  }));
}

// ✅ Get top selected coins (CoinGecko with Finnhub fallback + logos + rank merge)
async function getTopCoins() {
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

    return response.data.map(c => ({
      id: c.id,
      name: c.name,
      symbol: c.symbol,
      price: c.current_price,
      logo: c.image,
      market_cap_rank: c.market_cap_rank
    }));
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
