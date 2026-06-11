const { Queue } = require("bullmq");

const queueConnection = {
  url: process.env.REDIS_URL,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

const scheduledMessageQueue = new Queue("scheduled-messages", {
  connection: queueConnection,
});

module.exports = {
  scheduledMessageQueue,
};
