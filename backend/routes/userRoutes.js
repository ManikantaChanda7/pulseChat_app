const mongoose = require("mongoose");

const validateObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const validateRegister = (req, res, next) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "Name, email and password are required" });
  }

  next();
};

const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  next();
};

const validatePrivacy = (req, res, next) => {
  const allowed = ["showLastSeen", "readReceipts"];

  for (const key of Object.keys(req.body)) {
    if (!allowed.includes(key) || typeof req.body[key] !== "boolean") {
      return res.status(400).json({ message: "Invalid privacy settings payload" });
    }
  }

  next();
};

const validateSearch = (req, res, next) => {
  if (req.query.search && typeof req.query.search !== "string") {
    return res.status(400).json({ message: "Invalid search query" });
  }

  next();
};
const express = require("express");
const {
  registerUser,
  authUser,
  allUsers,
  updatePrivacySettings,
  refreshAccessToken,
  logoutUser,
} = require("../controllers/userControllers");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.put("/privacy", protect, validatePrivacy, updatePrivacySettings);

router.route("/").get(protect, validateSearch, allUsers);
router.route("/").post(validateRegister, registerUser);
router.post("/login", validateLogin, authUser);

router.post("/refresh", refreshAccessToken);
router.post("/logout", logoutUser);

module.exports = router;
