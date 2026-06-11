const { Worker } = require("bullmq");
const workerConnection = {
  url: process.env.REDIS_URL,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};
const Message = require("../models/messageModel");
const Notification = require("../models/notificationModel");

const startScheduledMessageWorker = (io) => {
  return new Worker(
    "scheduled-messages",
    async (job) => {
      const { messageId } = job.data;

      let message = await Message.findById(messageId)
        .populate("sender", "name pic email")
        .populate({
          path: "chat",
          populate: {
            path: "users",
            select: "name pic email",
          },
        })
        .populate("reactions.user", "name pic email")
        .populate("starredBy", "name pic email")
        .populate({
          path: "replyTo",
          populate: {
            path: "sender",
            select: "name pic email",
          },
        })
        .populate("mentions", "name pic email");

      if (!message || message.scheduledSent) {
        return;
      }

      message.scheduledSent = true;
      message.scheduledJobId = null;
      await message.save();

      await Notification.create({
        recipient: message.sender._id,
        actor: message.sender._id,
        chat: message.chat._id,
        message: message._id,
        type: "system",
        preview: "Your scheduled message was delivered",
      });

      const recipients = (message.chat?.users || []).filter(
        (user) => user._id.toString() !== message.sender._id.toString(),
      );

      if (recipients.length > 0) {
        const mentionedIds = (message.mentions || []).map((m) =>
          m._id ? m._id.toString() : m.toString(),
        );

        const notifications = recipients.map((recipient) => {
          let preview = message.content;

          if (message.messageType === "image") preview = "shared an image";
          if (message.messageType === "voice") preview = "sent a voice message";
          if (message.messageType === "file") {
            preview = message.fileName || "shared a file";
          }

          return {
            recipient: recipient._id,
            actor: message.sender._id,
            chat: message.chat._id,
            message: message._id,
            type: mentionedIds.includes(recipient._id.toString())
              ? "mention"
              : "message",
            preview,
          };
        });

        const createdNotifications =
          await Notification.insertMany(notifications);

        createdNotifications.forEach((notification) => {
          io.to(notification.recipient.toString()).emit(
            "notification received",
            notification,
          );
        });
      }

      message.chat.users.forEach((user) => {
        if (user._id.toString() === message.sender._id.toString()) {
          io.to(user._id.toString()).emit("scheduled message sent", {
            ...message.toObject(),
            scheduledSent: true,
            isScheduled: false,
          });
          return;
        }

        io.to(user._id.toString()).emit("message recieved", {
          ...message.toObject(),
          scheduledSent: true,
          isScheduled: false,
        });
      });
    },
    {
      connection: workerConnection,
    },
  );
};

module.exports = {
  startScheduledMessageWorker,
};