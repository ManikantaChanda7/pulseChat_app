const asyncHandler = require("express-async-handler");
const Chat = require("../models/chatModel");
const User = require("../models/userModel");
const Notification = require("../models/notificationModel");
const Message = require("../models/messageModel");

// @desc    Update Read State (force unread for user)
// @route   PUT /api/chat/read-state/:chatId
// @access  Protected
const updateReadState = asyncHandler(async (req, res) => {
  const { forceUnread } = req.body;
  const chatId = req.params.chatId;

  const chat = await Chat.findById(chatId)
    .populate("users", "-password")
    .populate("groupAdmin", "-password")
    .populate("latestMessage");

  if (!chat) {
    res.status(404);
    throw new Error("Chat not found");
  }

  const existingOverride = chat.readOverrides.find(
    (entry) => entry.user.toString() === req.user._id.toString(),
  );

  if (forceUnread) {
    if (existingOverride) {
      existingOverride.forceUnread = true;
    } else {
      chat.readOverrides.push({
        user: req.user._id,
        forceUnread: true,
      });
    }

    if (chat.latestMessage) {
      const latestMessage = await Message.findById(
        chat.latestMessage._id,
      ).populate("seenBy", "name pic email");

      if (
        latestMessage &&
        latestMessage.sender.toString() !== req.user._id.toString()
      ) {
        latestMessage.seenBy = (latestMessage.seenBy || []).filter(
          (seenUser) =>
            (seenUser._id || seenUser).toString() !== req.user._id.toString(),
        );

        latestMessage.seen = false;
        latestMessage.allSeen = false;
        latestMessage.seenAt = null;

        await latestMessage.save();

        const io = req.app.get("io");

        if (io && chat.users) {
          chat.users.forEach((u) => {
            io.to(u._id.toString()).emit("messages seen", {
              chatId,
              messageIds: [latestMessage._id.toString()],
              message: latestMessage,
            });
          });
        }
      }
    }
  } else {
    chat.readOverrides = chat.readOverrides.filter(
      (entry) => entry.user.toString() !== req.user._id.toString(),
    );
    if (chat.latestMessage) {
      const latestMessage = await Message.findById(chat.latestMessage._id);

      if (
        latestMessage &&
        latestMessage.sender.toString() !== req.user._id.toString()
      ) {
        const alreadySeen = latestMessage.seenBy.some(
          (id) => id.toString() === req.user._id.toString(),
        );

        if (!alreadySeen) {
          latestMessage.seenBy.push(req.user._id);
          latestMessage.seen = true;
          latestMessage.seenAt = new Date();

          await latestMessage.save();
        }
      }
    }
  }

  await chat.save();

  const updatedChat = await Chat.findById(chatId)
    .populate("users", "-password")
    .populate("groupAdmin", "-password")
    .populate("latestMessage");

  const populatedChat = await User.populate(updatedChat, {
    path: "latestMessage.sender",
    select: "name pic email",
  });

  res.status(200).json(populatedChat);
});

// @desc    Toggle Pin Chat
// @route   PUT /api/chat/pin/:chatId
// @access  Protected
const togglePinChat = asyncHandler(async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);

    if (!chat) {
      res.status(404);
      throw new Error("Chat not found");
    }

    const isPinned = chat.pinnedBy.some(
      (userId) => userId.toString() === req.user._id.toString(),
    );

    let updatedChat;

    if (isPinned) {
      updatedChat = await Chat.findByIdAndUpdate(
        req.params.chatId,
        {
          $pull: {
            pinnedBy: req.user._id,
          },
        },
        {
          new: true,
        },
      )
        .populate("users", "-password")
        .populate("groupAdmin", "-password")
        .populate("latestMessage");
    } else {
      updatedChat = await Chat.findByIdAndUpdate(
        req.params.chatId,
        {
          $addToSet: {
            pinnedBy: req.user._id,
          },
        },
        {
          new: true,
        },
      )
        .populate("users", "-password")
        .populate("groupAdmin", "-password")
        .populate("latestMessage");
    }

    updatedChat = await User.populate(updatedChat, {
      path: "latestMessage.sender",
      select: "name pic email",
    });

    res.status(200).json(updatedChat);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

//@description     Create or fetch One to One Chat
//@route           POST /api/chat/
//@access          Protected
const accessChat = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    console.log("UserId param not sent with request");
    return res.sendStatus(400);
  }

  var isChat = await Chat.find({
    isGroupChat: false,
    $and: [
      { users: { $elemMatch: { $eq: req.user._id } } },
      { users: { $elemMatch: { $eq: userId } } },
    ],
  })
    .populate("users", "-password")
    .populate("latestMessage");

  isChat = await User.populate(isChat, {
    path: "latestMessage.sender",
    select: "name pic email",
  });

  if (isChat.length > 0) {
    res.send(isChat[0]);
  } else {
    var chatData = {
      chatName: "sender",
      isGroupChat: false,
      users: [req.user._id, userId],
    };

    try {
      const createdChat = await Chat.create(chatData);
      const FullChat = await Chat.findOne({ _id: createdChat._id }).populate(
        "users",
        "-password",
      );
      res.status(200).json(FullChat);
    } catch (error) {
      res.status(400);
      throw new Error(error.message);
    }
  }
});

//@description     Fetch all chats for a user
//@route           GET /api/chat/
//@access          Protected
const fetchChats = asyncHandler(async (req, res) => {
  try {
    Chat.find({ users: { $elemMatch: { $eq: req.user._id } } })
      .populate("users", "-password")
      .populate("groupAdmin", "-password")
      .populate("latestMessage")
      .sort({ updatedAt: -1 })
      .then(async (results) => {
        results = await User.populate(results, {
          path: "latestMessage.sender",
          select: "name pic email",
        });
        res.status(200).send(results);
      });
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

//@description     Create New Group Chat
//@route           POST /api/chat/group
//@access          Protected
const createGroupChat = asyncHandler(async (req, res) => {
  if (!req.body.users || !req.body.name) {
    return res.status(400).send({ message: "Please Fill all the feilds" });
  }

  var users = JSON.parse(req.body.users);

  if (users.length < 2) {
    return res
      .status(400)
      .send("More than 2 users are required to form a group chat");
  }

  users.push(req.user);

  try {
    const groupChat = await Chat.create({
      chatName: req.body.name,
      users: users,
      isGroupChat: true,
      groupAdmin: req.user,
    });

    const fullGroupChat = await Chat.findOne({ _id: groupChat._id })
      .populate("users", "-password")
      .populate("groupAdmin", "-password");

    res.status(200).json(fullGroupChat);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

// @desc    Rename Group
// @route   PUT /api/chat/rename
// @access  Protected
const renameGroup = asyncHandler(async (req, res) => {
  const { chatId, chatName } = req.body;

  const updatedChat = await Chat.findByIdAndUpdate(
    chatId,
    {
      chatName: chatName,
    },
    {
      new: true,
    },
  )
    .populate("users", "-password")
    .populate("groupAdmin", "-password");

  if (!updatedChat) {
    res.status(404);
    throw new Error("Chat Not Found");
  } else {
    await Notification.insertMany(
      updatedChat.users
        .filter((u) => u._id.toString() !== req.user._id.toString())
        .map((u) => ({
          recipient: u._id,
          actor: req.user._id,
          chat: updatedChat._id,
          message: null,
          type: "group",
          preview: `renamed the group to ${chatName}`,
        })),
    );
    res.json(updatedChat);
  }
});

// @desc    Remove user from Group
// @route   PUT /api/chat/groupremove
// @access  Protected
const removeFromGroup = asyncHandler(async (req, res) => {
  const { chatId, userId } = req.body;

  // check if the requester is admin

  const removed = await Chat.findByIdAndUpdate(
    chatId,
    {
      $pull: { users: userId },
    },
    {
      new: true,
    },
  )
    .populate("users", "-password")
    .populate("groupAdmin", "-password");

  if (!removed) {
    res.status(404);
    throw new Error("Chat Not Found");
  } else {
    await Notification.create({
      recipient: userId,
      actor: req.user._id,
      chat: removed._id,
      message: null,
      type: "group",
      preview: "removed you from the group",
    });
    res.json(removed);
  }
});

// @desc    Add user to Group / Leave
// @route   PUT /api/chat/groupadd
// @access  Protected
const addToGroup = asyncHandler(async (req, res) => {
  const { chatId, userId } = req.body;

  // check if the requester is admin

  const added = await Chat.findByIdAndUpdate(
    chatId,
    {
      $push: { users: userId },
    },
    {
      new: true,
    },
  )
    .populate("users", "-password")
    .populate("groupAdmin", "-password");

  if (!added) {
    res.status(404);
    throw new Error("Chat Not Found");
  } else {
    await Notification.create({
      recipient: userId,
      actor: req.user._id,
      chat: added._id,
      message: null,
      type: "group",
      preview: "added you to the group",
    });
    res.json(added);
  }
});

// @desc    Toggle Archive Chat
// @route   PUT /api/chat/archive/:chatId
// @access  Protected
const toggleArchiveChat = asyncHandler(async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);

    if (!chat) {
      res.status(404);
      throw new Error("Chat not found");
    }

    const isArchived = (chat.archivedBy || []).some(
      (userId) => userId.toString() === req.user._id.toString(),
    );

    let updatedChat;

    if (isArchived) {
      updatedChat = await Chat.findByIdAndUpdate(
        req.params.chatId,
        {
          $pull: {
            archivedBy: req.user._id,
          },
        },
        { new: true },
      )
        .populate("users", "-password")
        .populate("groupAdmin", "-password")
        .populate("latestMessage");
    } else {
      updatedChat = await Chat.findByIdAndUpdate(
        req.params.chatId,
        {
          $addToSet: {
            archivedBy: req.user._id,
          },
        },
        { new: true },
      )
        .populate("users", "-password")
        .populate("groupAdmin", "-password")
        .populate("latestMessage");
    }

    updatedChat = await User.populate(updatedChat, {
      path: "latestMessage.sender",
      select: "name pic email",
    });

    res.status(200).json(updatedChat);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

module.exports = {
  accessChat,
  fetchChats,
  createGroupChat,
  renameGroup,
  addToGroup,
  removeFromGroup,
  togglePinChat,
  updateReadState,
  toggleArchiveChat,
};
