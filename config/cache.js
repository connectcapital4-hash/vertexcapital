// config/cache.js
const { createClient } = require("redis");

let redisClient;
let redisConnected = false;

// Initialize Redis (no top-level await)
async function initRedis() {
  try {
    redisClient = createClient({
      username: "default",
      password: process.env.REDIS_PASSWORD,
      socket: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        
      },
    });

    redisClient.on("error", (err) => {
      console.error("Redis Client Error:", err.message);
      redisConnected = false;
    });

    await redisClient.connect();
    redisConnected = true;
    console.log("✅ Connected to Redis");
  } catch (err) {
    console.error("⚠️ Could not connect to Redis. Falling back to memory cache.", err.message);
  }
}

// Call init but don't block startup
initRedis();

// Fallback in-memory cache
const localCache = {};

async function getCached(key) {
  if (redisConnected) {
    try {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
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
      await redisClient.set(key, JSON.stringify(data), { PX: ttl });
      return;
    } catch (err) {
      console.error("Redis set error:", err.message);
    }
  }
  localCache[key] = { data, timestamp: Date.now(), ttl };
}

module.exports = { getCached, setCache };
