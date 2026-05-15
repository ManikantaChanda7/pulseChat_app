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
router.route("/chat/:chatId/read").patch(protect, markChatNotificationsRead);
router.route("/:id/read").patch(protect, markNotificationRead);

module.exports = router;
