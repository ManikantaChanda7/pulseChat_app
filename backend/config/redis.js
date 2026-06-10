

const Redis = require("ioredis");

const redis = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379", {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
});

redis.on("connect", () => {
  console.log("[REDIS] Connected");
});

redis.on("error", (err) => {
  console.error("[REDIS ERROR]", err.message);
});

module.exports = redis;