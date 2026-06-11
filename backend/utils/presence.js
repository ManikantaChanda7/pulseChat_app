const redis = require("../config/redis");

const presenceKey = (userId) => `presence:${userId}`;
const ONLINE_USERS_KEY = "online_users";

const addUserSocket = async (userId, socketId) => {
  await redis.sadd(presenceKey(userId), socketId);
  await redis.sadd(ONLINE_USERS_KEY, userId);
};

const removeUserSocket = async (userId, socketId) => {
  await redis.srem(presenceKey(userId), socketId);
  const remaining = await redis.scard(presenceKey(userId));

  if (remaining === 0) {
    await redis.del(presenceKey(userId));
    await redis.srem(ONLINE_USERS_KEY, userId);
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
  return await redis.smembers(ONLINE_USERS_KEY);
};

module.exports = {
  addUserSocket,
  removeUserSocket,
  getUserSockets,
  isUserOnline,
  getOnlineUsers,
};