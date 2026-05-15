const express = require("express");
const {
  registerUser,
  authUser,
  allUsers,
  updatePrivacySettings,
} = require("../controllers/userControllers");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.put("/privacy", protect, updatePrivacySettings);

router.route("/").get(protect, allUsers);
router.route("/").post(registerUser);
router.post("/login", authUser);

module.exports = router;
