const mongoose = require("mongoose");

const messageSchema = mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    content: { type: String, trim: true },
    messageType: {
      type: String,
      enum: ["text", "image", "voice", "file"],
      default: "text",
    },

    fileName: {
      type: String,
    },

    fileSize: {
      type: Number,
    },

    fileMimeType: {
      type: String,
    },
    chat: { type: mongoose.Schema.Types.ObjectId, ref: "Chat" },
    // Read receipts
    seen: {
      type: Boolean,
      default: false,
    },

    seenAt: {
      type: Date,
    },

    // users who have seen this message
    seenBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // true only when every other user in group has seen
    allSeen: {
      type: Boolean,
      default: false,
    },

    reactions: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        emoji: {
          type: String,
        },
      },
    ],

    // Edit/Delete message support
    edited: {
      type: Boolean,
      default: false,
    },

    deleted: {
      type: Boolean,
      default: false,
    },

    deletedAt: {
      type: Date,
    },

    // Pinned message support
    pinned: {
      type: Boolean,
      default: false,
    },

    pinnedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    pinExpiresAt: {
      type: Date,
    },

    // Reply-to-message support
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },

    // Scheduled message support
    isScheduled: {
      type: Boolean,
      default: false,
    },

    scheduledFor: {
      type: Date,
    },

    scheduledSent: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const Message = mongoose.model("Message", messageSchema);
module.exports = Message;