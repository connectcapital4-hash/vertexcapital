const axios = require('axios');
const cache = require('../config/cache');

async function getNews(apiKey) {
  const response = await axios.get(
    `https://newsapi.org/v2/top-headlines`,
    { params: { country: 'us', category: 'business', apiKey } }
  );
  return response.data;
}

async function getFinnhubNews(token) {
  const response = await axios.get(
    `https://finnhub.io/api/v1/news?category=general&token=${token}`
  );
  return response.data;
}

module.exports = { getNews, getFinnhubNews };
///c%3A/Users/USER/capitalconnect/backend/config/cloudinary.j