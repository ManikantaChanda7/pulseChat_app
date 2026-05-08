import CryptoJS from "crypto-js";

const CHAT_SECRET_KEY = "chat-app-secret-key";

// Encrypt plain text message
export const encryptMessage = (text) => {
  try {
    if (!text || typeof text !== "string") {
      return text;
    }

    return CryptoJS.AES.encrypt(
      text,
      CHAT_SECRET_KEY,
    ).toString();
  } catch (error) {
    console.error("Encryption failed", error);
    return text;
  }
};

// Decrypt encrypted message
export const decryptMessage = (encryptedText) => {
  try {
    if (!encryptedText || typeof encryptedText !== "string") {
      return encryptedText;
    }

    const bytes = CryptoJS.AES.decrypt(
      encryptedText,
      CHAT_SECRET_KEY,
    );

    const decrypted = bytes.toString(CryptoJS.enc.Utf8);

    return decrypted || encryptedText;
  } catch (error) {
    console.error("Decryption failed", error);
    return encryptedText;
  }
};

// Decrypt full message object safely
export const decryptMessageObject = (message) => {
  if (!message) {
    return message;
  }

  // keep media messages unencrypted
  if (
    message.messageType === "image" ||
    message.messageType === "voice"
  ) {
    return message;
  }

  return {
    ...message,

    content: decryptMessage(message.content),

    replyTo: message.replyTo
      ? {
          ...message.replyTo,

          content:
            message.replyTo.messageType === "image" ||
            message.replyTo.messageType === "voice"
              ? message.replyTo.content
              : decryptMessage(message.replyTo.content),
        }
      : null,
  };
};