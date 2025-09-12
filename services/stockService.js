const axios = require("axios");
const cache = require('../config/cache');

// ✅ Get latest stock price (quote)
async function getQuote(symbol, token) {
  const response = await axios.get(
    `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${token}`
  );
  return response.data; // contains c (current), h (high), l (low), o (open), pc (previous close)
}

// ✅ Get company profile
async function getProfile(symbol, token) {
  const response = await axios.get(
    `https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${token}`
  );

  return {
    companyName: response.data.name,
    logo: response.data.logo,
    sector: response.data.finnhubIndustry,
    industry: response.data.industry || "N/A",
    marketCap: response.data.marketCapitalization,
    description: response.data.description || "No description available",
  };
}

// ✅ Get historical prices (default: last 30 days)
async function getHistory(symbol, token) {
  const to = Math.floor(Date.now() / 1000); // now
  const from = to - 60 * 60 * 24 * 30; // last 30 days

  const response = await axios.get(
    `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=D&from=${from}&to=${to}&token=${token}`
  );

  if (response.data.s !== "ok") {
    return { error: "No historical data found", candles: [] };
  }

  // Transform candles into an array of objects
  return response.data.t.map((timestamp, i) => ({
    date: new Date(timestamp * 1000).toISOString().split("T")[0],
    open: response.data.o[i],
    high: response.data.h[i],
    low: response.data.l[i],
    close: response.data.c[i],
    volume: response.data.v[i],
  }));
}

// ✅ Get dividends
async function getDividends(symbol, token) {
  const from = "2020-01-01";
  const to = new Date().toISOString().split("T")[0];

  const response = await axios.get(
    `https://finnhub.io/api/v1/stock/dividends?symbol=${symbol}&from=${from}&to=${to}&token=${token}`
  );

  if (!response.data || response.data.length === 0) {
    return { error: "No dividends found", dividends: [] };
  }

  return response.data.map((d) => ({
    date: d.paymentDate || d.date,
    amount: d.amount,
  }));
}

// ✅ Get technical indicators (SMA, RSI, MACD)
async function getIndicators(symbol, token) {
  const to = Math.floor(Date.now() / 1000);
  const from = to - 60 * 60 * 24 * 60; // last 60 days

  // Simple Moving Average (SMA)
  const smaRes = await axios.get(
    `https://finnhub.io/api/v1/indicator?symbol=${symbol}&resolution=D&from=${from}&to=${to}&indicator=sma&timeperiod=20&token=${token}`
  );

  // Relative Strength Index (RSI)
  const rsiRes = await axios.get(
    `https://finnhub.io/api/v1/indicator?symbol=${symbol}&resolution=D&from=${from}&to=${to}&indicator=rsi&timeperiod=14&token=${token}`
  );

  // MACD
  const macdRes = await axios.get(
    `https://finnhub.io/api/v1/indicator?symbol=${symbol}&resolution=D&from=${from}&to=${to}&indicator=macd&token=${token}`
  );

  return {
    SMA:
      smaRes.data.s === "ok" && smaRes.data.sma
        ? smaRes.data.sma.at(-1)
        : null,
    RSI:
      rsiRes.data.s === "ok" && rsiRes.data.rsi
        ? rsiRes.data.rsi.at(-1)
        : null,
    MACD:
      macdRes.data.s === "ok" && macdRes.data.macd
        ? macdRes.data.macd.at(-1)
        : null,
  };
}

// ✅ Get top stocks (static list for now)
async function getTopStocks(token) {
  const tickers = ["AAPL", "MSFT", "TSLA", "AMZN", "GOOGL", "NVDA"];
  const results = [];

  for (let t of tickers) {
    const response = await axios.get(
      `https://finnhub.io/api/v1/quote?symbol=${t}&token=${token}`
    );
    results.push({
      symbol: t,
      current: response.data.c,
      high: response.data.h,
      low: response.data.l,
      open: response.data.o,
      prevClose: response.data.pc,
    });
  }

  return results;
}

// ✅ Search stock by keyword
async function searchStock(query, token) {
  const response = await axios.get(
    `https://finnhub.io/api/v1/search?q=${query}&token=${token}`
  );

  return response.data.result.map((s) => ({
    symbol: s.symbol,
    description: s.description,
    type: s.type,
    exchange: s.exchange,
  }));
}

module.exports = {
  getQuote,
  getProfile,
  getHistory,
  getDividends,
  getIndicators,
  getTopStocks,   // <-- new
  searchStock,    // <-- new
};