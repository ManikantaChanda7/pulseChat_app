const mongoose = require("mongoose");

const validateParamId = (param) => (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params[param])) {
    return res.status(400).json({ message: "Invalid id" });
  }
  next();
};
const express = require("express");
const {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  clearNotifications,
  markChatNotificationsRead,
} = require("../controllers/notificationController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.route("/").get(protect, getNotifications).delete(protect, clearNotifications);
router.route("/read-all").patch(protect, markAllNotificationsRead);
router.route("/chat/:chatId/read").patch(protect, validateParamId("chatId"), markChatNotificationsRead);
router.route("/:id/read").patch(protect, validateParamId("id"), markNotificationRead);

module.exports = router;
