const asyncHandler = require("express-async-handler");
const Message = require("../models/messageModel");
const User = require("../models/userModel");
const Chat = require("../models/chatModel");
const Notification = require("../models/notificationModel");
const { scheduledMessageQueue } = require("../config/queue");

// @description     Get Shared Files/Media
// @route           GET /api/Message/shared-files
// @access          Protected
const getSharedFiles = asyncHandler(async (req, res) => {
  try {
    const userChats = await Chat.find({
      users: req.user._id,
    }).select("_id");

    const chatIds = userChats.map((chat) => chat._id);

    const sharedItems = await Message.find({
      chat: { $in: chatIds },
      messageType: { $in: ["image", "file", "voice"] },
      deleted: { $ne: true },
    })
      .sort({ createdAt: -1 })
      .populate("sender", "name pic email")
      .populate({
        path: "chat",
        select: "chatName isGroupChat users",
        populate: {
          path: "users",
          select: "name pic email",
        },
      });

    res.json(sharedItems);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

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
      (r) => r.user.toString() === req.user._id.toString(),
    );

    // remove previous reaction
    message.reactions = message.reactions.filter(
      (r) => r.user.toString() !== req.user._id.toString(),
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
      })
      .populate("mentions", "name pic email")
      .populate("starredBy", "name pic email");

    // Notification for reaction
    if (message.sender._id.toString() !== req.user._id.toString()) {
      const latestReaction = message.reactions.find(
        (r) => r.user._id.toString() === req.user._id.toString(),
      );

      if (latestReaction) {
        const notification = await Notification.create({
          recipient: message.sender._id,
          actor: req.user._id,
          chat: message.chat._id,
          message: message._id,
          type: "reaction",
          preview: `reacted ${latestReaction.emoji} to your message`,
        });

        const io = req.app.get("io");
        if (io) {
          io.to(message.sender._id.toString()).emit(
            "notification received",
            notification,
          );
        }
      }
    }

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

    let messages = await Message.find({
      chat: req.params.chatId,
      deletedFor: { $ne: req.user._id },
      $or: [
        { isScheduled: false },
        { scheduledSent: true },
        { sender: req.user._id },
      ],
    })
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
      })
      .populate("mentions", "name pic email")
      .populate("starredBy", "name pic email");

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

    if (unseenMessages.length > 0) {
      const messageIds = unseenMessages.map((msg) => msg._id.toString());


      const chatDoc = await Chat.findById(req.params.chatId).populate(
        "users",
        "name pic email privacy",
      );

      const currentUserDoc = chatDoc.users.find(
        (u) => u._id.toString() === req.user._id.toString(),
      );

      const privacyAwareMessages = [];

      for (const msg of unseenMessages) {
        const senderDoc = chatDoc.users.find(
          (u) => u._id.toString() === msg.sender._id.toString(),
        );

        const readReceiptsAllowed =
          currentUserDoc?.privacy?.readReceipts !== false &&
          senderDoc?.privacy?.readReceipts !== false;

        if (!readReceiptsAllowed) {
          continue;
        }

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
          msg.seenBy.some((id) => id.toString() === u._id.toString()),
        );

        await msg.save();
        privacyAwareMessages.push(msg._id.toString());
      }

      // Emit real-time seen update to each user in the chat
      const io = req.app.get("io");

      if (io) {

        if (chatDoc && chatDoc.users) {
          // Emit updated message objects with realtime allSeen state
          for (const updatedMsg of messages.filter((m) =>
            privacyAwareMessages.includes(m._id.toString()),
          )) {
            // Emit to each user individually
            chatDoc.users.forEach((u) => {
              const userId = u._id.toString();

              io.to(userId).emit("messages seen", {
                chatId: req.params.chatId,
                messageIds: [updatedMsg._id.toString()],
                message: updatedMsg,
              });
            });

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
        if (!privacyAwareMessages.includes(msg._id.toString())) {
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
    mentions,
    fileName,
    fileSize,
    fileMimeType,
  } = req.body;

  if (!content || !chatId) {
    return res.sendStatus(400);
  }

  var newMessage = {
    sender: req.user._id,
    content: content,
    chat: chatId,
    messageType: messageType || "text",
    fileName: fileName || null,
    fileSize: fileSize || null,
    fileMimeType: fileMimeType || null,
    replyTo: replyTo || null,
    mentions: mentions || [],
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

    message = await Message.populate(message, {
      path: "seenBy",
      select: "name pic email",
    });

    message = await Message.populate(message, {
      path: "mentions",
      select: "name pic email",
    });

    message = await Message.populate(message, {
      path: "starredBy",
      select: "name pic email",
    });

    await Chat.findByIdAndUpdate(req.body.chatId, { latestMessage: message });

    if (message.isScheduled) {
      if (!message.scheduledFor) {
        res.status(400);
        throw new Error("Scheduled time is required");
      }

      const scheduledTime = new Date(message.scheduledFor);

      if (Number.isNaN(scheduledTime.getTime())) {
        res.status(400);
        throw new Error("Invalid scheduled time");
      }

      const delay = scheduledTime.getTime() - Date.now();

      if (delay <= 0) {
        res.status(400);
        throw new Error("Scheduled time must be in the future");
      }

      const job = await scheduledMessageQueue.add(
        "deliver-scheduled-message",
        {
          messageId: message._id.toString(),
        },
        {
          delay,
          attempts: 3,
          removeOnComplete: true,
          removeOnFail: false,
        },
      );

      message.scheduledJobId = job.id;
      await message.save();
    }

    const recipients = (message.chat?.users || []).filter(
      (u) => u._id.toString() !== req.user._id.toString(),
    );

    if (!message.isScheduled && recipients.length > 0) {
      const mentionedIds = (message.mentions || []).map((m) =>
        m._id ? m._id.toString() : m.toString(),
      );

      const notifications = recipients.map((recipient) => {
        let preview = message.content;

        if (message.messageType === "image") preview = "shared an image";
        if (message.messageType === "voice") preview = "sent a voice message";
        if (message.messageType === "file") {
          preview = message.fileName || "shared a file";
        }

        return {
          recipient: recipient._id,
          actor: req.user._id,
          chat: message.chat._id,
          message: message._id,
          type: mentionedIds.includes(recipient._id.toString())
            ? "mention"
            : replyTo &&
                recipient._id.toString() ===
                  message.replyTo?.sender?._id?.toString()
              ? "reply"
              : "message",
          preview,
        };
      });

      const createdNotifications = await Notification.insertMany(notifications);
      const io = req.app.get("io");

      if (io) {
        createdNotifications.forEach((notification) => {
          io.to(notification.recipient.toString()).emit(
            "notification received",
            notification,
          );
        });
      }
    }

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
  const { content, mentions } = req.body;

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
      return res
        .status(400)
        .json({ message: "Deleted message cannot be edited" });
    }

    if (message.messageType !== "text") {
      return res.status(400).json({
        message: "Only text messages can be edited",
      });
    }

    message.content = content;
    message.edited = true;
    message.editedAt = new Date();
    message.mentions = mentions || [];

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
      })
      .populate("mentions", "name pic email")
      .populate("starredBy", "name pic email");

    const io = req.app.get("io");

    if (io && message.chat?.users) {
      message.chat.users.forEach((u) => {
        io.to(u._id.toString()).emit("message edited", message);
      });
    }

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

    const { mode } = req.body;

    const isSender = message.sender.toString() === req.user._id.toString();

    if (mode === "me") {
      if (!Array.isArray(message.deletedFor)) {
        message.deletedFor = [];
      }

      const alreadyDeletedForMe = message.deletedFor.some(
        (id) => id.toString() === req.user._id.toString(),
      );

      if (!alreadyDeletedForMe) {
        message.deletedFor.push(req.user._id);
        await message.save();
      }

      return res.json({
        messageId: message._id,
        mode: "me",
        userId: req.user._id,
      });
    }

    if (!isSender) {
      return res.status(401).json({
        message: "Not authorized",
      });
    }

    message.content = "This message was deleted";
    message.deleted = true;
    message.mentions = [];
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
      })
      .populate("mentions", "name pic email")
      .populate("starredBy", "name pic email");

    res.json(message);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

const pinMessage = asyncHandler(async (req, res) => {
  const { messageId, duration, unpin } = req.body;

  if (!messageId) {
    res.status(400);
    throw new Error("Message ID required");
  }

  let expiresAt = null;

  if (duration === "1 Day") {
    expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  }

  if (duration === "1 Week") {
    expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }

  if (duration === "1 Month") {
    expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }

  if (unpin) {
    const updatedMessage = await Message.findByIdAndUpdate(
      messageId,
      {
        pinned: false,
        pinnedBy: null,
        pinExpiresAt: null,
      },
      { new: true },
    )
      .populate("sender", "name pic email")
      .populate({
        path: "chat",
        populate: {
          path: "users",
          select: "name pic email",
        },
      })
      .populate("seenBy", "name pic email")
      .populate("reactions.user", "name pic")
      .populate({
        path: "replyTo",
        populate: {
          path: "sender",
          select: "name pic email",
        },
      })
      .populate("mentions", "name pic email")
      .populate("starredBy", "name pic email");

    const io = req.app.get("io");

    if (io && updatedMessage.chat?.users) {
      updatedMessage.chat.users.forEach((u) => {
        io.to(u._id.toString()).emit("message pinned updated", updatedMessage);
      });
    }

    return res.json(updatedMessage);
  }

  const updatedMessage = await Message.findByIdAndUpdate(
    messageId,
    {
      pinned: true,
      pinnedBy: req.user._id,
      pinExpiresAt: expiresAt,
    },
    { new: true },
  )
    .populate("sender", "name pic email")
    .populate({
      path: "chat",
      populate: {
        path: "users",
        select: "name pic email",
      },
    })
    .populate("seenBy", "name pic email")
    .populate("reactions.user", "name pic")
    .populate({
      path: "replyTo",
      populate: {
        path: "sender",
        select: "name pic email",
      },
    })
    .populate("mentions", "name pic email");

  const io = req.app.get("io");

  if (io && updatedMessage.chat?.users) {
    updatedMessage.chat.users.forEach((u) => {
      io.to(u._id.toString()).emit("message pinned updated", updatedMessage);
    });
  }

  const pinRecipients = updatedMessage.chat.users.filter(
    (u) => u._id.toString() !== req.user._id.toString(),
  );

  if (pinRecipients.length > 0) {
    await Notification.insertMany(
      pinRecipients.map((u) => ({
        recipient: u._id,
        actor: req.user._id,
        chat: updatedMessage.chat._id,
        message: updatedMessage._id,
        type: "system",
        preview: "pinned a message",
      })),
    );
  }
  res.json(updatedMessage);
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
      })
      .populate("starredBy", "name pic email");

    res.json(message);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

const toggleStarMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.body;

  if (!messageId) {
    return res.status(400).json({
      message: "Message ID required",
    });
  }

  try {
    let message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        message: "Message not found",
      });
    }

    const alreadyStarred = message.starredBy?.some(
      (id) => id.toString() === req.user._id.toString(),
    );

    if (alreadyStarred) {
      message.starredBy = message.starredBy.filter(
        (id) => id.toString() !== req.user._id.toString(),
      );
    } else {
      message.starredBy.push(req.user._id);
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
      .populate("seenBy", "name pic email")
      .populate("reactions.user", "name pic email")
      .populate({
        path: "replyTo",
        populate: {
          path: "sender",
          select: "name pic email",
        },
      })
      .populate("mentions", "name pic email")
      .populate("starredBy", "name pic email");

    res.json(message);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

const forwardMessage = asyncHandler(async (req, res) => {
  const { messageId, targetChatIds } = req.body;

  if (
    !messageId ||
    !Array.isArray(targetChatIds) ||
    targetChatIds.length === 0
  ) {
    return res.status(400).json({
      message: "Invalid forward request",
    });
  }

  const originalMessage = await Message.findById(messageId);

  if (!originalMessage) {
    return res.status(404).json({
      message: "Message not found",
    });
  }

  const createdMessages = [];

  for (const chatId of targetChatIds) {
    let newMessage = await Message.create({
      sender: req.user._id,
      content: originalMessage.content,
      chat: chatId,
      messageType: originalMessage.messageType,
      fileName: originalMessage.fileName || null,
      fileSize: originalMessage.fileSize || null,
      fileMimeType: originalMessage.fileMimeType || null,

      seen: false,
      seenBy: [req.user._id],
      allSeen: false,

      forwarded: true,
      forwardedFrom: originalMessage._id,
    });

    newMessage = await newMessage.populate("sender", "name pic");
    newMessage = await newMessage.populate("chat");

    newMessage = await User.populate(newMessage, {
      path: "chat.users",
      select: "name pic email",
    });

    newMessage = await Message.populate(newMessage, {
      path: "reactions.user",
      select: "name pic email",
    });

    newMessage = await Message.populate(newMessage, {
      path: "seenBy",
      select: "name pic email",
    });

    newMessage = await Message.populate(newMessage, {
      path: "mentions",
      select: "name pic email",
    });

    newMessage = await Message.populate(newMessage, {
      path: "starredBy",
      select: "name pic email",
    });

    await Chat.findByIdAndUpdate(chatId, {
      latestMessage: newMessage,
    });

    const recipients = (newMessage.chat?.users || []).filter(
      (u) => u._id.toString() !== req.user._id.toString(),
    );

    if (recipients.length > 0) {
      let preview = newMessage.content;

      if (newMessage.messageType === "image") {
        preview = "shared an image";
      }

      if (newMessage.messageType === "voice") {
        preview = "sent a voice message";
      }

      if (newMessage.messageType === "file") {
        preview = newMessage.fileName || "shared a file";
      }

      const notifications = recipients.map((recipient) => ({
        recipient: recipient._id,
        actor: req.user._id,
        chat: newMessage.chat._id,
        message: newMessage._id,
        type: "message",
        preview,
      }));

      const createdNotifications = await Notification.insertMany(notifications);

      const io = req.app.get("io");

      if (io) {
        createdNotifications.forEach((notification) => {
          io.to(notification.recipient.toString()).emit(
            "notification received",
            notification,
          );
        });
      }
    }

    const io = req.app.get("io");

    if (io && newMessage.chat?.users) {
      newMessage.chat.users.forEach((u) => {
        io.to(u._id.toString()).emit("message received", newMessage);
      });
    }

    createdMessages.push(newMessage);
  }

  res.json(createdMessages);
});
const createPollMessage = asyncHandler(async (req, res) => {
  const {
    chatId,
    question,
    options,
    allowMultiple = false,
    expiresAt = null,
  } = req.body;

  if (!chatId || !question || !Array.isArray(options) || options.length < 2) {
    return res.status(400).json({
      message: "Invalid poll data",
    });
  }

  const chat = await Chat.findById(chatId).populate("users");

  if (!chat) {
    return res.status(404).json({
      message: "Chat not found",
    });
  }

  if (!chat.isGroupChat) {
    return res.status(400).json({
      message: "Polls are allowed only in group chats",
    });
  }

  let message = await Message.create({
    sender: req.user._id,
    chat: chatId,
    messageType: "poll",
    content: question,
    seen: false,
    seenBy: [req.user._id],
    allSeen: false,

    poll: {
      question,
      allowMultiple,
      expiresAt,
      options: options.map((opt) => ({
        text: opt,
        voters: [],
      })),
    },
  });

  message = await Message.findById(message._id)
    .populate("sender", "name pic email")
    .populate({
      path: "chat",
      populate: {
        path: "users",
        select: "name pic email",
      },
    })
    .populate("seenBy", "name pic email");

  await Chat.findByIdAndUpdate(chatId, {
    latestMessage: message,
  });

  const recipients = message.chat.users.filter(
    (u) => u._id.toString() !== req.user._id.toString(),
  );

  if (recipients.length > 0) {
    const notifications = recipients.map((recipient) => ({
      recipient: recipient._id,
      actor: req.user._id,
      chat: message.chat._id,
      message: message._id,
      type: "message",
      preview: `created a poll: ${question}`,
    }));

    const createdNotifications = await Notification.insertMany(notifications);

    const io = req.app.get("io");

    if (io) {
      createdNotifications.forEach((notification) => {
        io.to(notification.recipient.toString()).emit(
          "notification received",
          notification,
        );
      });

      message.chat.users.forEach((u) => {
        io.to(u._id.toString()).emit("message received", message);
      });
    }
  }

  res.json(message);
});

const votePoll = asyncHandler(async (req, res) => {
  const { selectedOptions } = req.body;

  if (!Array.isArray(selectedOptions)) {
    return res.status(400).json({
      message: "Invalid vote payload",
    });
  }

  let message = await Message.findById(req.params.messageId);

  if (!message || message.messageType !== "poll") {
    return res.status(404).json({
      message: "Poll not found",
    });
  }

  if (message.poll?.expiresAt && new Date() > message.poll.expiresAt) {
    return res.status(400).json({
      message: "Poll expired",
    });
  }

  const userId = req.user._id.toString();

  // remove old votes
  message.poll.options.forEach((option) => {
    option.voters = option.voters.filter((id) => id.toString() !== userId);
  });

  // enforce single choice
  let finalSelections = selectedOptions;

  if (!message.poll.allowMultiple && selectedOptions.length > 1) {
    finalSelections = [selectedOptions[0]];
  }

  finalSelections.forEach((index) => {
    if (message.poll.options[index]) {
      message.poll.options[index].voters.push(req.user._id);
    }
  });

  await message.save();

  message = await Message.findById(req.params.messageId)
    .populate("sender", "name pic email")
    .populate({
      path: "chat",
      populate: {
        path: "users",
        select: "name pic email",
      },
    });

  const io = req.app.get("io");

  if (io && message.chat?.users) {
    message.chat.users.forEach((u) => {
      io.to(u._id.toString()).emit("poll updated", message);
    });
  }

  res.json(message);
});

module.exports = {
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
};
