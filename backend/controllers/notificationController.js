const asyncHandler = require("express-async-handler");
const Notification = require("../models/notificationModel");

const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ recipient: req.user._id })
    .populate("actor", "name pic email")
    .populate("chat", "chatName isGroupChat users")
    .populate("message")
    .sort({ createdAt: -1 });

  res.json(notifications);
});

const markNotificationRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    {
      _id: req.params.id,
      recipient: req.user._id,
    },
    {
      isRead: true,
    },
    {
      new: true,
    }
  );

  if (!notification) {
    res.status(404);
    throw new Error("Notification not found");
  }

  res.json(notification);
});

const markChatNotificationsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    {
      recipient: req.user._id,
      chat: req.params.chatId,
      isRead: false,
    },
    {
      isRead: true,
    }
  );

  res.json({ message: "Chat notifications marked as read" });
});

const markAllNotificationsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    {
      recipient: req.user._id,
      isRead: false,
    },
    {
      isRead: true,
    }
  );

  res.json({ message: "All notifications marked as read" });
});

const clearNotifications = asyncHandler(async (req, res) => {
  await Notification.deleteMany({ recipient: req.user._id });

  res.json({ message: "Notifications cleared" });
});

module.exports = {
  getNotifications,
  markNotificationRead,
  markChatNotificationsRead,
  markAllNotificationsRead,
  clearNotifications,
};
