const express = require("express");
const {
  allMessages,
  sendMessage,
  reactToMessage,
  editMessage,
  deleteMessage,
  togglePinMessage,
} = require("../controllers/messageControllers");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.route("/:chatId").get(protect, allMessages);
router.route("/").post(protect, sendMessage);
router.route("/reaction").put(protect, reactToMessage);
router.route("/edit/:messageId").put(protect, editMessage);
router.route("/pin/:messageId").put(protect, togglePinMessage);
router.route("/:messageId").delete(protect, deleteMessage);

module.exports = router;