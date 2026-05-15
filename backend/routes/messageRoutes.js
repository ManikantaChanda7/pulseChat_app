const express = require("express");
const {
  allMessages,
  sendMessage,
  reactToMessage,
  editMessage,
  deleteMessage,
  togglePinMessage,
  pinMessage,
  toggleStarMessage,
  getSharedFiles,
  forwardMessage,
  createPollMessage,
  votePoll,
} = require("../controllers/messageControllers");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.route("/shared-files").get(protect, getSharedFiles);
router.route("/:chatId").get(protect, allMessages);
router.route("/").post(protect, sendMessage);
router.route("/reaction").put(protect, reactToMessage);
router.route("/edit/:messageId").put(protect, editMessage);
router.route("/pin/:messageId").put(protect, togglePinMessage);
router.route("/forward").post(protect, forwardMessage);
router.route("/:messageId").delete(protect, deleteMessage);
router.route("/pin").put(protect, pinMessage);
router.route("/star").put(protect, toggleStarMessage);
router.route("/poll").post(protect, createPollMessage);
router.route("/poll/vote/:messageId").put(protect, votePoll);

module.exports = router;
