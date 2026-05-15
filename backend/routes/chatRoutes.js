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

router.route("/").post(protect, accessChat);
router.route("/").get(protect, fetchChats);
router.route("/group").post(protect, createGroupChat);
router.route("/rename").put(protect, renameGroup);
router.route("/groupremove").put(protect, removeFromGroup);
router.route("/groupadd").put(protect, addToGroup);
router.route("/read-state/:chatId").put(protect, updateReadState);
router.route("/archive/:chatId").put(protect, toggleArchiveChat);
router.route("/pin/:chatId").put(protect, togglePinChat);

module.exports = router;