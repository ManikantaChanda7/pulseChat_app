const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    email: {
      type: String,
      unique: true,
      required: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true },
    pic: {
      type: String,
      default:
        "https://png.pngtree.com/png-clipart/20230927/original/pngtree-man-avatar-image-for-profile-png-image_13001882.png",
    },
    isAdmin: {
      type: Boolean,
      required: true,
      default: false,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },

    privacy: {
      readReceipts: {
        type: Boolean,
        default: true,
      },
      showLastSeen: {
        type: Boolean,
        default: true,
      },
    },

    refreshToken: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

const User = mongoose.model("User", userSchema);

module.exports = User;
