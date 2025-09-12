const newsService = require('../services/newsService');
const cache = require('../config/cache');

const NEWS_TTL = 600000; // 10 min
const FINNHUB_TTL = 300000; // 5 min

async function getNews(req, res) {
  try {
    const cached = await cache.getCached('newsapi-business'); // <-- await added
    if (cached) return res.json(cached);

    const data = await newsService.getNews(process.env.NEWSAPI_KEY);
    await cache.setCache('newsapi-business', data, NEWS_TTL); // <-- await added
    res.json(data);
  } catch (err) {
    console.error('NewsAPI error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
}

async function getFinnhubNews(req, res) {
  try {
    const cached = await cache.getCached('finnhub-news'); // <-- await added
    if (cached) return res.json(cached);

    const data = await newsService.getFinnhubNews(process.env.FINNHUB_API_KEY);
    await cache.setCache('finnhub-news', data, FINNHUB_TTL); // <-- await added
    res.json(data);
  } catch (err) {
    console.error('Finnhub news error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch Finnhub news' });
  }
}

module.exports = { getNews, getFinnhubNews };
