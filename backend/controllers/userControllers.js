const asyncHandler = require("express-async-handler");
const User = require("../models/userModel");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../config/generateToken");

const setRefreshCookie = (res, token) => {
  res.cookie("refreshToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

//@description     Get or Search all users
//@route           GET /api/user?search=
//@access          Public
const allUsers = asyncHandler(async (req, res) => {
  const keyword = req.query.search
    ? {
        $or: [
          { name: { $regex: req.query.search, $options: "i" } },
          { email: { $regex: req.query.search, $options: "i" } },
        ],
      }
    : {};

  const users = await User.find(keyword)
    .find({ _id: { $ne: req.user._id } })
    .select("-password -refreshToken");
  res.send(users);
});

//@description     Register new user
//@route           POST /api/user/
//@access          Public
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, pic } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Please Enter all the Feilds");
  }

  const userExists = await User.findOne({ email: email.toLowerCase() });

  if (userExists) {
    res.status(400);
    throw new Error("User already exists");
  }

  const user = await User.create({
    name,
    email,
    password,
    pic,
  });

  if (user) {
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    user.refreshToken = refreshToken;
    await user.save();
    setRefreshCookie(res, refreshToken);

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      pic: user.pic,
      lastSeen: user.lastSeen,
      privacy: user.privacy,
      token: accessToken,
    });
  } else {
    res.status(400);
    throw new Error("User not found");
  }
});

//@description     Auth the user
//@route           POST /api/users/login
//@access          Public
const authUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() });

  if (user && (await user.matchPassword(password))) {
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    user.refreshToken = refreshToken;
    await user.save();
    setRefreshCookie(res, refreshToken);

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      pic: user.pic,
      lastSeen: user.lastSeen,
      privacy: user.privacy,
      token: accessToken,
    });
  } else {
    res.status(401);
    throw new Error("Invalid Email or Password");
  }
});

const updatePrivacySettings = asyncHandler(async (req, res) => {
  const { readReceipts, showLastSeen } = req.body;

  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (!user.privacy) {
    user.privacy = {};
  }

  if (typeof readReceipts === "boolean") {
    user.privacy.readReceipts = readReceipts;
  }

  if (typeof showLastSeen === "boolean") {
    user.privacy.showLastSeen = showLastSeen;
  }

  await user.save();

  res.json({
    privacy: user.privacy,
  });
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;

  if (!refreshToken) {
    res.status(401);
    throw new Error("No refresh token");
  }

  const jwt = require("jsonwebtoken");
  const decoded = jwt.verify(
    refreshToken,
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
  );

  const user = await User.findById(decoded.id);

  if (!user || user.refreshToken !== refreshToken) {
    res.status(401);
    throw new Error("Invalid refresh token");
  }

  const newAccessToken = generateAccessToken(user._id);
  const newRefreshToken = generateRefreshToken(user._id);

  user.refreshToken = newRefreshToken;
  await user.save();

  setRefreshCookie(res, newRefreshToken);

  res.json({ token: newAccessToken });
});

const logoutUser = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;

  if (refreshToken) {
    await User.findOneAndUpdate(
      { refreshToken },
      { $set: { refreshToken: null } },
    );
  }

  res.clearCookie("refreshToken");
  res.json({ message: "Logged out successfully" });
});

module.exports = {
  allUsers,
  registerUser,
  authUser,
  updatePrivacySettings,
  refreshAccessToken,
  logoutUser,
};
