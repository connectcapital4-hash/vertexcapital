const axios = require('axios');
const BASE_URL = 'https://api.coingecko.com/api/v3';
const cache = require('../config/cache');

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

module.exports = { 
  getPrice, 
  getMarketData, 
  getHistory, 
  getTrending, 
  getExchanges, 
  getLogo,
  searchCrypto   // <-- added export
};