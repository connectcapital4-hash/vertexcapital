const axios = require('axios');
const BASE_URL = 'https://api.coingecko.com/api/v3';
const FINNHUB_API = "https://finnhub.io/api/v1";
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

// ✅ Get simple price
async function getPrice(symbol) {
  const response = await axios.get(`${BASE_URL}/simple/price`, {
    params: { ids: symbol, vs_currencies: 'usd' }
  });
  return response.data;
}

// ✅ Get detailed market data
async function getMarketData(symbol) {
  const response = await axios.get(`${BASE_URL}/coins/${symbol}`, {
    params: { localization: false, tickers: false, market_data: true }
  });
  return response.data.market_data;
}

// ✅ Get 30 days history
async function getHistory(symbol) {
  const response = await axios.get(`${BASE_URL}/coins/${symbol}/market_chart`, {
    params: { vs_currency: 'usd', days: 30 }
  });
  return response.data;
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
  const response = await axios.get(`${BASE_URL}/coins/${symbol}`, {
    params: { localization: false }
  });
  return {
    id: response.data.id,
    name: response.data.name,
    symbol: response.data.symbol,
    logo: response.data.image.large
  };
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
    // Try CoinGecko first
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
    console.error("⚠️ CoinGecko failed, trying Finnhub + CoinGecko metadata:", err.message);

    // ✅ Fallback to Finnhub for price, then merge with CoinGecko metadata
    const finnhubSymbols = [
      { id: "bitcoin", pair: "BINANCE:BTCUSDT" },
      { id: "ethereum", pair: "BINANCE:ETHUSDT" },
      { id: "binancecoin", pair: "BINANCE:BNBUSDT" },
      { id: "tether", pair: "BINANCE:USDTUSDT" },
      { id: "ripple", pair: "BINANCE:XRPUSDT" }
    ];

    const results = [];

    // First fetch CoinGecko metadata (logos + ranks) in bulk
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
      console.error("⚠️ Failed to fetch CoinGecko metadata:", metaErr.message);
    }

    // Now fetch Finnhub prices
    for (const s of finnhubSymbols) {
      try {
        const resp = await axios.get(`${FINNHUB_API}/quote`, {
          params: { symbol: s.pair, token: FINNHUB_API_KEY }
        });

        const meta = metadataMap[s.id] || {};
        results.push({
          id: s.id,
          name: meta.name || s.id,
          symbol: meta.symbol || s.id.toUpperCase(),
          price: resp.data.c || null,
          logo: meta.logo || "",
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
