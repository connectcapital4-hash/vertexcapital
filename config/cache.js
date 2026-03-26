// config/cache.js
const { Redis } = require("@upstash/redis");

let redis;
let redisConnected = false;

try {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  redisConnected = true;
  console.log("✅ Connected to Upstash Redis (REST)");
} catch (err) {
  console.error("⚠️ Redis init failed:", err.message);
}

// Fallback in-memory cache
const localCache = {};

async function getCached(key) {
  if (redisConnected) {
    try {
      const data = await redis.get(key);
      return data || null;
    } catch (err) {
      console.error("Redis get error:", err.message);
    }
  }

  const c = localCache[key];
  if (!c) return null;
  if (Date.now() - c.timestamp < (c.ttl || 60000)) return c.data;

  delete localCache[key];
  return null;
}

async function setCache(key, data, ttl = 60000) {
  if (redisConnected) {
    try {
      await redis.set(key, data, { px: ttl });
      return;
    } catch (err) {
      console.error("Redis set error:", err.message);
    }
  }

  localCache[key] = { data, timestamp: Date.now(), ttl };
}

module.exports = { getCached, setCache };