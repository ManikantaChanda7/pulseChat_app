const mongoose = require("mongoose");

const validateObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const validateParamId = (param) => (req, res, next) => {
  if (!validateObjectId(req.params[param])) {
    return res.status(400).json({ message: "Invalid id" });
  }
  next();
};

const validateMessagePayload = (req, res, next) => {
  const { chatId, content, messageType } = req.body;
  if (!chatId || !validateObjectId(chatId)) {
    return res.status(400).json({ message: "Valid chatId required" });
  }
  if (!content && messageType !== "poll") {
    return res.status(400).json({ message: "Message content required" });
  }
  next();
};

const validateBodyMessageId = (req, res, next) => {
  if (!validateObjectId(req.body.messageId)) {
    return res.status(400).json({ message: "Invalid message id" });
  }
  next();
};
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
router.route("/:chatId").get(protect, validateParamId("chatId"), allMessages);
router.route("/").post(protect, validateMessagePayload, sendMessage);
router.route("/reaction").put(protect, validateBodyMessageId, reactToMessage);
router.route("/edit/:messageId").put(protect, validateParamId("messageId"), editMessage);
router.route("/pin/:messageId").put(protect, validateParamId("messageId"), togglePinMessage);
router.route("/forward").post(protect, forwardMessage);
router.route("/:messageId").delete(protect, validateParamId("messageId"), deleteMessage);
router.route("/pin").put(protect, pinMessage);
router.route("/star").put(protect, validateBodyMessageId, toggleStarMessage);
router.route("/poll").post(protect, createPollMessage);
router.route("/poll/vote/:messageId").put(protect, validateParamId("messageId"), votePoll);

module.exports = router;
