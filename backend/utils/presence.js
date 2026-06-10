

const redis = require("../config/redis");

const presenceKey = (userId) => `presence:${userId}`;

const addUserSocket = async (userId, socketId) => {
  await redis.sadd(presenceKey(userId), socketId);
};

const removeUserSocket = async (userId, socketId) => {
  await redis.srem(presenceKey(userId), socketId);
  const remaining = await redis.scard(presenceKey(userId));

  if (remaining === 0) {
    await redis.del(presenceKey(userId));
    return false;
  }

  return true;
};

const getUserSockets = async (userId) => {
  return redis.smembers(presenceKey(userId));
};

const isUserOnline = async (userId) => {
  const count = await redis.scard(presenceKey(userId));
  return count > 0;
};

const getOnlineUsers = async () => {
  const keys = await redis.keys("presence:*");
  return keys.map((key) => key.replace("presence:", ""));
};

module.exports = {
  addUserSocket,
  removeUserSocket,
  getUserSockets,
  isUserOnline,
  getOnlineUsers,
};