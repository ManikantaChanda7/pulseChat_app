const mongoose = require("mongoose");

const validateObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const validateChatBody = (fields) => (req, res, next) => {
  for (const field of fields) {
    if (!req.body[field]) {
      return res.status(400).json({ message: `${field} is required` });
    }
  }
  next();
};

const validateChatParam = (param) => (req, res, next) => {
  if (!validateObjectId(req.params[param])) {
    return res.status(400).json({ message: "Invalid id" });
  }
  next();
};

const validateObjectIdsInBody = (fields) => (req, res, next) => {
  for (const field of fields) {
    if (!validateObjectId(req.body[field])) {
      return res.status(400).json({ message: `Invalid ${field}` });
    }
  }
  next();
};
const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  accessChat,
  fetchChats,
  createGroupChat,
  removeFromGroup,
  addToGroup,
  renameGroup,
  togglePinChat,
  updateReadState,
  toggleArchiveChat,
} = require("../controllers/chatControllers");

const router = express.Router();

router
  .route("/")
  .post(
    protect,
    validateChatBody(["userId"]),
    validateObjectIdsInBody(["userId"]),
    accessChat
  );
router.route("/").get(protect, fetchChats);
router.route("/group").post(protect, createGroupChat);
router
  .route("/rename")
  .put(
    protect,
    validateChatBody(["chatId", "chatName"]),
    validateObjectIdsInBody(["chatId"]),
    renameGroup
  );
router
  .route("/groupremove")
  .put(
    protect,
    validateChatBody(["chatId", "userId"]),
    validateObjectIdsInBody(["chatId", "userId"]),
    removeFromGroup
  );
router
  .route("/groupadd")
  .put(
    protect,
    validateChatBody(["chatId", "userId"]),
    validateObjectIdsInBody(["chatId", "userId"]),
    addToGroup
  );
router
  .route("/read-state/:chatId")
  .put(protect, validateChatParam("chatId"), updateReadState);
router
  .route("/archive/:chatId")
  .put(protect, validateChatParam("chatId"), toggleArchiveChat);
router
  .route("/pin/:chatId")
  .put(protect, validateChatParam("chatId"), togglePinChat);

module.exports = router;