const { Queue } = require("bullmq");
const redis = require("./redis");

const scheduledMessageQueue = new Queue("scheduled-messages", {
  connection: redis,
});

module.exports = {
  scheduledMessageQueue,
};
