const express = require("express");
const connectDB = require("./config/db");
const dotenv = require("dotenv");
const userRoutes = require("./routes/userRoutes");
const chatRoutes = require("./routes/chatRoutes");
const messageRoutes = require("./routes/messageRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const path = require("path");
const cors = require("cors");

const Message = require("./models/messageModel");
const User = require("./models/userModel");
const Notification = require("./models/notificationModel");
const notificationRoutes = require("./routes/notificationRoutes");

dotenv.config({ path: require("path").join(__dirname, ".env") });
connectDB();

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  }),
);

app.use(express.json());

app.use("/api/user", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/message", messageRoutes);
app.use("/api/notification", notificationRoutes);

const __dirname1 = path.resolve();

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname1, "/frontend/build")));

  app.get("*", (req, res) =>
    res.sendFile(path.resolve(__dirname1, "frontend", "build", "index.html")),
  );
} else {
  app.get("/", (req, res) => {
    res.send("API is running..");
  });
}

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(
  PORT,
  console.log(`Server running on PORT ${PORT}...`),
);

const io = require("socket.io")(server, {
  pingTimeout: 60000,
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  },
});

// Pass io object to Express app so routes can access it
app.set("io", io);

console.log("\n[✅ SOCKET.IO INITIALIZED AND SET ON APP]\n");

const onlineUsers = new Map();

// Scheduled message delivery worker
setInterval(async () => {
  try {
    const pendingMessages = await Message.find({
      isScheduled: true,
      scheduledSent: false,
      scheduledFor: { $lte: new Date() },
    })
      .populate("sender", "name pic email")
      .populate({
        path: "chat",
        populate: {
          path: "users",
          select: "name pic email",
        },
      })
      .populate("reactions.user", "name pic email")
      .populate("starredBy", "name pic email")
      .populate({
        path: "replyTo",
        populate: {
          path: "sender",
          select: "name pic email",
        },
      });

    for (const message of pendingMessages) {
      console.log("[SCHEDULED MESSAGE SENT]", message._id);

      message.scheduledSent = true;
      await message.save();
      await Notification.create({
        recipient: message.sender._id,
        actor: message.sender._id,
        chat: message.chat._id,
        message: message._id,
        type: "system",
        preview: "Your scheduled message was delivered",
      });

      const chat = message.chat;

      if (!chat?.users) continue;

      const recipients = chat.users.filter(
        (user) => user._id.toString() !== message.sender._id.toString(),
      );

      if (recipients.length > 0) {
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
            actor: message.sender._id,
            chat: chat._id,
            message: message._id,
            type: mentionedIds.includes(recipient._id.toString())
              ? "mention"
              : "message",
            preview,
          };
        });

        const createdNotifications =
          await Notification.insertMany(notifications);

        createdNotifications.forEach((notification) => {
          io.to(notification.recipient.toString()).emit(
            "notification received",
            notification,
          );
        });
      }

      chat.users.forEach((user) => {
        // sender should only receive scheduled update
        if (user._id.toString() === message.sender._id.toString()) {
          io.to(user._id.toString()).emit("scheduled message sent", {
            ...message.toObject(),
            scheduledSent: true,
            isScheduled: false,
          });
          return;
        }

        // receivers should get normal realtime message flow
        io.to(user._id.toString()).emit("message recieved", {
          ...message.toObject(),
          scheduledSent: true,
          isScheduled: false,
        });
      });
    }
  } catch (error) {
    console.error("Scheduled message worker error", error);
  }
}, 1000);

io.on("connection", (socket) => {
  console.log("Connected to socket.io, socket id:", socket.id);

  socket.on("setup", (userData) => {
    socket.join(userData._id.toString());

    onlineUsers.set(userData._id.toString(), socket.id);

    User.findByIdAndUpdate(userData._id, {
      lastSeen: new Date(),
    })
      .then(async () => {
        const userDoc = await User.findById(userData._id).select("privacy");

        const visibleOnlineUsers = [];

        for (const onlineUserId of onlineUsers.keys()) {
          const onlineUserDoc = await User.findById(onlineUserId).select(
            "privacy",
          );

          if (onlineUserDoc?.privacy?.showLastSeen !== false) {
            visibleOnlineUsers.push(onlineUserId);
          }
        }

        if (userDoc?.privacy?.showLastSeen !== false) {
          socket.emit("online users", visibleOnlineUsers);
          socket.broadcast.emit("user online", userData._id);
        } else {
          socket.emit("online users", []);
        }
      })
      .catch((err) => console.error("LAST SEEN ONLINE UPDATE ERROR", err));

    socket.emit("connected");
  });

  socket.on("join chat", (room) => {
    socket.join(room);
    console.log(`[SOCKET JOIN] User joined room: ${room}`);
  });

  socket.on("typing", ({ room, userId, userName }) => {
    socket.in(room).emit("typing", {
      userId,
      userName,
    });
  });
  socket.on("stop typing", (room) => socket.in(room).emit("stop typing"));

  socket.on("new message", (newMessageRecieved) => {
    const chat = newMessageRecieved.chat;

    if (!chat.users) return;

    chat.users.forEach((user) => {
      if (user._id.toString() === newMessageRecieved.sender._id.toString()) {
        return;
      }

      console.log(
        "[SOCKET MESSAGE DELIVERY]",
        user._id.toString(),
        newMessageRecieved._id,
      );

      io.to(user._id.toString()).emit("message recieved", newMessageRecieved);
    });
  });

  socket.on("message reaction", (updatedMessage) => {
    const chat = updatedMessage.chat;

    if (!chat.users) return;

    chat.users.forEach((user) => {
      io.to(user._id.toString()).emit(
        "message reaction updated",
        updatedMessage,
      );
    });
  });

  socket.on("message edited", (updatedMessage) => {
    const chat = updatedMessage.chat;

    if (!chat.users) return;

    chat.users.forEach((user) => {
      io.to(user._id.toString()).emit("message edited update", updatedMessage);
    });
  });

  socket.on("message deleted", (updatedMessage) => {
    const chat = updatedMessage.chat;

    if (!chat.users) return;

    chat.users.forEach((user) => {
      io.to(user._id.toString()).emit("message deleted update", updatedMessage);
    });
  });

  socket.on("message seen", async ({ messageId, chatId, userId }) => {
    try {
      console.log("[BACKEND MESSAGE SEEN RECEIVED]", messageId, chatId, userId);

      let updatedMessage = await Message.findById(messageId)
        .populate("sender", "name pic email privacy")
        .populate({
          path: "chat",
          populate: {
            path: "users",
            select: "name pic email privacy",
          },
        })
        .populate("seenBy", "name pic email")
        .populate("starredBy", "name pic email")
        .populate({
          path: "replyTo",
          populate: {
            path: "sender",
            select: "name pic email",
          },
        });

      if (!updatedMessage) {
        console.log("[MESSAGE NOT FOUND FOR SEEN UPDATE]");
        return;
      }

      const currentUserDoc = updatedMessage.chat.users.find(
        (u) => u._id.toString() === userId,
      );

      const senderDoc = updatedMessage.chat.users.find(
        (u) =>
          u._id.toString() === updatedMessage.sender._id.toString(),
      );

      const readReceiptsAllowed =
        currentUserDoc?.privacy?.readReceipts !== false &&
        senderDoc?.privacy?.readReceipts !== false;

      if (!readReceiptsAllowed) {
        return;
      }

      // prevent duplicate seen entries
      if (!userId) {
        console.log("[MESSAGE SEEN SKIPPED - NO USER ID]");
        return;
      }

      const alreadySeen = updatedMessage.seenBy?.some(
        (id) => id?.toString() === userId,
      );

      if (!alreadySeen) {
        updatedMessage.seenBy.push(userId);
      }

      updatedMessage.seen = true;
      updatedMessage.seenAt = new Date();

      // allSeen means every OTHER member has seen message
      const otherUsers = updatedMessage.chat.users.filter(
        (u) => u._id.toString() !== updatedMessage.sender._id.toString(),
      );

      const allSeen = otherUsers.every((u) =>
        updatedMessage.seenBy.some((id) => id?.toString() === u._id.toString()),
      );

      updatedMessage.allSeen = allSeen;

      await updatedMessage.save();

      updatedMessage = await Message.findById(messageId)
        .populate("sender", "name pic email privacy")
        .populate({
          path: "chat",
          populate: {
            path: "users",
            select: "name pic email privacy",
          },
        })
        .populate("seenBy", "name pic email")
        .populate("starredBy", "name pic email")
        .populate({
          path: "replyTo",
          populate: {
            path: "sender",
            select: "name pic email",
          },
        });

      updatedMessage.chat.users.forEach((user) => {
        io.to(user._id.toString()).emit("messages seen", {
          chatId,
          messageIds: [messageId],
          message: updatedMessage,
        });
      });

      console.log(
        "[BACKEND EMIT GROUP MESSAGE SEEN]",
        messageId,
        "allSeen:",
        updatedMessage.allSeen,
      );
    } catch (error) {
      console.error("MESSAGE SEEN SOCKET ERROR", error);
    }
  });

  socket.on("message seen update", (updatedMessage) => {
    const chat = updatedMessage.chat;

    if (!chat?.users) return;

    chat.users.forEach((user) => {
      io.to(user._id.toString()).emit("message seen updated", updatedMessage);
    });
  });

  socket.on("disconnect", async () => {
    for (let [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);

        const lastSeen = new Date();

        try {
          await User.findByIdAndUpdate(userId, {
            lastSeen,
          });

          const userDoc = await User.findById(userId).select("privacy");

          if (userDoc?.privacy?.showLastSeen !== false) {
            io.emit("user offline", {
              userId,
              lastSeen,
            });
          }

          console.log("[USER OFFLINE LAST SEEN UPDATED]", userId, lastSeen);
        } catch (error) {
          console.error("LAST SEEN UPDATE ERROR", error);
        }

        break;
      }
    }
  });
});
