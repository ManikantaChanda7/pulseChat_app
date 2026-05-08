const asyncHandler = require("express-async-handler");
const Message = require("../models/messageModel");
const User = require("../models/userModel");
const Chat = require("../models/chatModel");

//@description     Add or Update Reaction
//@route           PUT /api/Message/reaction
//@access          Protected
const reactToMessage = asyncHandler(async (req, res) => {
  const { messageId, emoji } = req.body;

  if (!messageId || !emoji) {
    return res.status(400).json({ message: "Invalid data" });
  }

  try {
    let message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // check existing reaction from this user
    const existingReaction = message.reactions.find(
      (r) => r.user.toString() === req.user._id.toString()
    );

    // remove previous reaction
    message.reactions = message.reactions.filter(
      (r) => r.user.toString() !== req.user._id.toString()
    );

    // if same emoji clicked again -> remove reaction completely
    if (!existingReaction || existingReaction.emoji !== emoji) {
      message.reactions.push({
        user: req.user._id,
        emoji,
      });
    }

    await message.save();

    message = await Message.findById(messageId)
      .populate("sender", "name pic email")
      .populate({
        path: "chat",
        populate: {
          path: "users",
          select: "name pic email",
        },
      })
      .populate("reactions.user", "name pic")
      .populate({
        path: "replyTo",
        populate: {
          path: "sender",
          select: "name pic email",
        },
      });

    res.json(message);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

const allMessages = asyncHandler(async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    console.log("\n[=== ALL MESSAGES API CALLED ===]");
    console.log("Chat ID:", req.params.chatId);
    console.log("User ID:", req.user._id);

    let messages = await Message.find({ chat: req.params.chatId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("sender", "name pic email")
      .populate("chat")
      .populate("reactions.user", "name pic email")
      .populate({
        path: "replyTo",
        populate: {
          path: "sender",
          select: "name pic email",
        },
      });

    // reverse to show oldest -> newest in UI
    messages = messages.reverse();

    // Mark messages as seen for current user
    const unseenMessages = messages.filter((msg) => {
      // never process own messages
      if (msg.sender._id.toString() === req.user._id.toString()) {
        return false;
      }

      // already seen by this user
      const alreadySeen = msg.seenBy?.some(
        (id) => id.toString() === req.user._id.toString(),
      );

      return !alreadySeen;
    });

    console.log("Total messages:", messages.length);
    console.log("Unseen messages:", unseenMessages.length);

    if (unseenMessages.length > 0) {
      const messageIds = unseenMessages.map((msg) => msg._id.toString());

      console.log("[DB UPDATE] Marking as seen:", messageIds);

      const chatDoc = await Chat.findById(req.params.chatId).populate("users");

      for (const msg of unseenMessages) {
        const alreadySeen = msg.seenBy?.some(
          (id) => id.toString() === req.user._id.toString(),
        );

        if (!alreadySeen) {
          msg.seenBy.push(req.user._id);
        }

        msg.seen = true;
        msg.seenAt = new Date();

        // allSeen means every OTHER member has seen
        const otherUsers = chatDoc.users.filter(
          (u) => u._id.toString() !== msg.sender._id.toString(),
        );

        msg.allSeen = otherUsers.every((u) =>
          msg.seenBy.some(
            (id) => id.toString() === u._id.toString(),
          ),
        );

        await msg.save();
      }

      // Emit real-time seen update to each user in the chat
      const io = req.app.get("io");
      console.log("[SOCKET IO CHECK]", io ? "✅ IO EXISTS" : "❌ IO IS NULL");
      
      if (io) {
        console.log("[SOCKET EMIT] Chat users count:", chatDoc?.users?.length || 0);

        if (chatDoc && chatDoc.users) {
          // Emit updated message objects with realtime allSeen state
          for (const updatedMsg of messages.filter((m) =>
            messageIds.includes(m._id.toString()),
          )) {
            // Emit to each user individually
            chatDoc.users.forEach((u) => {
              const userId = u._id.toString();

              console.log(
                `[SOCKET EMIT] TO USER: ${userId.slice(-6)} | allSeen: ${updatedMsg.allSeen}`,
              );

              io.to(userId).emit("messages seen", {
                chatId: req.params.chatId,
                messageIds: [updatedMsg._id.toString()],
                message: updatedMsg,
              });
            });

            // Also emit to room
            console.log(
              `[SOCKET EMIT] TO ROOM: ${req.params.chatId} | allSeen: ${updatedMsg.allSeen}`,
            );

            io.to(req.params.chatId).emit("messages seen", {
              chatId: req.params.chatId,
              messageIds: [updatedMsg._id.toString()],
              message: updatedMsg,
            });
          }
        }
      }

      // update local messages with latest group read receipt state
      messages = messages.map((msg) => {
        if (!messageIds.includes(msg._id.toString())) {
          return msg;
        }

        const updatedSeenBy = [
          ...(msg.seenBy || []).map((id) => id.toString()),
        ];

        if (!updatedSeenBy.includes(req.user._id.toString())) {
          updatedSeenBy.push(req.user._id.toString());
        }

        const otherUsers = chatDoc.users.filter(
          (u) => u._id.toString() !== msg.sender._id.toString(),
        );

        const allSeen = otherUsers.every((u) =>
          updatedSeenBy.includes(u._id.toString()),
        );

        return {
          ...msg.toObject(),
          seen: true,
          seenAt: new Date(),
          seenBy: updatedSeenBy,
          allSeen,
        };
      });
    }

    res.json({
      messages,
      page,
      hasMore: messages.length === limit,
    });
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

//@description     Create New Message
//@route           POST /api/Message/
//@access          Protected
const sendMessage = asyncHandler(async (req, res) => {
  const {
    content,
    chatId,
    replyTo,
    messageType,
    isScheduled,
    scheduledFor,
  } = req.body;

  if (!content || !chatId) {
    console.log("Invalid data passed into request");
    return res.sendStatus(400);
  }

  var newMessage = {
    sender: req.user._id,
    content: content,
    chat: chatId,
    messageType: messageType || "text",
    replyTo: replyTo || null,
    isScheduled: isScheduled || false,
    scheduledFor: scheduledFor || null,
    scheduledSent: !isScheduled,

    // sender has already seen their own message
    seen: false,
    seenBy: [req.user._id],
    allSeen: false,
  };

  try {
    let message = await Message.create(newMessage);

    message = await message.populate("sender", "name pic");
    message = await message.populate("chat");
    message = await User.populate(message, {
      path: "chat.users",
      select: "name pic email",
    });
    message = await Message.populate(message, {
      path: "reactions.user",
      select: "name pic email",
    });
    message = await Message.populate(message, {
      path: "replyTo",
      populate: {
        path: "sender",
        select: "name pic email",
      },
    });

    await Chat.findByIdAndUpdate(req.body.chatId, { latestMessage: message });

    // do not instantly deliver scheduled messages
    if (message.isScheduled) {
      return res.json(message);
    }

    res.json(message);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

//@description     Edit Message
//@route           PUT /api/Message/edit/:messageId
//@access          Protected
const editMessage = asyncHandler(async (req, res) => {
  const { content } = req.body;

  try {
    let message = await Message.findById(req.params.messageId);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // only sender can edit
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "Not authorized" });
    }

    if (message.deleted) {
      return res.status(400).json({ message: "Deleted message cannot be edited" });
    }

    message.content = content;
    message.edited = true;

    await message.save();

    message = await Message.findById(req.params.messageId)
      .populate("sender", "name pic email")
      .populate({
        path: "chat",
        populate: {
          path: "users",
          select: "name pic email",
        },
      })
      .populate("reactions.user", "name pic email")
      .populate({
        path: "replyTo",
        populate: {
          path: "sender",
          select: "name pic email",
        },
      });

    res.json(message);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

//@description     Delete Message
//@route           DELETE /api/Message/:messageId
//@access          Protected
const deleteMessage = asyncHandler(async (req, res) => {
  try {
    let message = await Message.findById(req.params.messageId);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // only sender can delete
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "Not authorized" });
    }

    message.content = "This message was deleted";
    message.deleted = true;
    message.deletedAt = new Date();
    message.reactions = [];

    await message.save();

    message = await Message.findById(req.params.messageId)
      .populate("sender", "name pic email")
      .populate({
        path: "chat",
        populate: {
          path: "users",
          select: "name pic email",
        },
      })
      .populate("reactions.user", "name pic email")
      .populate({
        path: "replyTo",
        populate: {
          path: "sender",
          select: "name pic email",
        },
      });

    res.json(message);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

//@description     Pin or Unpin Message
//@route           PUT /api/Message/pin/:messageId
//@access          Protected
const togglePinMessage = asyncHandler(async (req, res) => {
  const { duration } = req.body;

  try {
    let message = await Message.findById(req.params.messageId);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // unpin if already pinned
    if (message.pinned) {
      message.pinned = false;
      message.pinnedBy = null;
      message.pinExpiresAt = null;
    } else {
      let expiresAt = new Date();

      switch (duration) {
        case "1day":
          expiresAt.setDate(expiresAt.getDate() + 1);
          break;

        case "1week":
          expiresAt.setDate(expiresAt.getDate() + 7);
          break;

        case "1month":
          expiresAt.setMonth(expiresAt.getMonth() + 1);
          break;

        default:
          return res.status(400).json({
            message: "Invalid pin duration",
          });
      }

      message.pinned = true;
      message.pinnedBy = req.user._id;
      message.pinExpiresAt = expiresAt;
    }

    await message.save();

    message = await Message.findById(req.params.messageId)
      .populate("sender", "name pic email")
      .populate({
        path: "chat",
        populate: {
          path: "users",
          select: "name pic email",
        },
      })
      .populate("reactions.user", "name pic email")
      .populate("pinnedBy", "name pic email")
      .populate({
        path: "replyTo",
        populate: {
          path: "sender",
          select: "name pic email",
        },
      });

    res.json(message);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

module.exports = {
  allMessages,
  sendMessage,
  reactToMessage,
  editMessage,
  deleteMessage,
  togglePinMessage,
};