const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Message = require("./models/messageModel");

dotenv.config();

const clearMessages = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("Mongo connected");

    const result = await Message.deleteMany({});

    process.exit();
  } catch (error) {
    console.error("Cleanup failed:", error);
    process.exit(1);
  }
};

clearMessages();