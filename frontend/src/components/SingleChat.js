import "./styles.css";
import { getSender, getSenderFull } from "../config/ChatLogics";
import { useEffect, useState, useRef } from "react";
import API from "../config/api";
import ProfileModal from "./miscellaneous/ProfileModal";
import ScrollableChat from "./ScrollableChat";
import Lottie from "react-lottie";
import animationData from "../animations/typing.json";

import CryptoJS from "crypto-js";

import io from "socket.io-client";
import UpdateGroupChatModal from "./miscellaneous/UpdateGroupChatModal";
import { ChatState } from "../Context/ChatProvider";
const ENDPOINT = "http://localhost:5001"; // "https://talk-a-tive.herokuapp.com"; -> After deployment
var socket, selectedChatCompare;

const CHAT_SECRET_KEY = "chat-app-secret-key";

// Cloudinary Configuration
const CLOUDINARY_CLOUD_NAME = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME || "dgrpyrxrn";
const CLOUDINARY_UPLOAD_PRESET = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET || "chat-app";

const encryptMessage = (text) => {
  try {
    if (!text || typeof text !== "string") {
      return text;
    }

    return CryptoJS.AES.encrypt(text, CHAT_SECRET_KEY).toString();
  } catch (error) {
    console.error("Encryption failed", error);
    return text;
  }
};

const decryptMessage = (encryptedText) => {
  try {
    if (!encryptedText || typeof encryptedText !== "string") {
      return encryptedText;
    }

    // old/plain text messages should bypass decryption
    if (!encryptedText.startsWith("U2FsdGVkX1")) {
      console.log("[DECRYPT CHECK]", {
        preview: encryptedText?.slice?.(0, 30),
        isEncrypted: encryptedText?.startsWith?.("U2FsdGVkX1"),
      });
      return encryptedText;
    }

    const bytes = CryptoJS.AES.decrypt(encryptedText, CHAT_SECRET_KEY);

    const decrypted = bytes.toString(CryptoJS.enc.Utf8);

    // fallback safely if decryption fails
    if (!decrypted) {
      return encryptedText;
    }

    return decrypted;
  } catch (error) {
    console.error("Decryption failed", error);
    return encryptedText;
  }
};

const decryptMessageObject = (message) => {
  if (!message) {
    console.log("[DECRYPT MESSAGE OBJECT]", {
      id: message._id,
      type: message.messageType,
      preview: message.content?.slice?.(0, 40),
      encrypted: message.content?.startsWith?.("U2FsdGVkX1"),
    });
    return message;
  }

  // do not decrypt media messages
  if (message.messageType === "image" || message.messageType === "voice") {
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

const SingleChat = ({ fetchAgain, setFetchAgain }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [imageLoading, setImageLoading] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [typing, setTyping] = useState(false);
  const [istyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [messageSearch, setMessageSearch] = useState("");

  const [replyMessage, setReplyMessage] = useState(null);

  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [scheduledDateTime, setScheduledDateTime] = useState("");
  const sendScheduledMessage = async () => {
    if (!newMessage || !scheduledDateTime) return;

    try {
      const config = {
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      };

      const { data } = await API.post(
        "/api/message",
        {
          content: encryptMessage(newMessage),
          chatId: selectedChat._id,
          replyTo: replyMessage?._id || null,
          isScheduled: true,
          scheduledFor: scheduledDateTime,
        },
        config,
      );

      const decryptedScheduledMessage = decryptMessageObject(data);

      setMessages((prev) => [...prev, decryptedScheduledMessage]);

      setNewMessage("");
      setReplyMessage(null);
      setScheduledDateTime("");
      setShowSchedulePicker(false);

      console.log("[SCHEDULED MESSAGE CREATED]", data._id);
    } catch (error) {
      console.error("Scheduled message failed", error);
    }
  };

  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingStream, setRecordingStream] = useState(null);
  const recordingIntervalRef = useRef(null);
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      const recorder = new MediaRecorder(stream);
      setRecordingStream(stream);

      setAudioChunks([]);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setAudioChunks((prev) => [...prev, event.data]);
        }
      };

      recorder.start();

      setRecordingTime(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      console.error("Microphone access denied", error);
    }
  };

  const cancelRecording = () => {
    if (!mediaRecorder) return;

    mediaRecorder.stop();

    clearInterval(recordingIntervalRef.current);

    if (recordingStream) {
      recordingStream.getTracks().forEach((track) => track.stop());
    }

    setRecordingStream(null);
    setMediaRecorder(null);
    setAudioChunks([]);
    setRecordingTime(0);
    setIsRecording(false);
  };

  const stopRecording = async () => {
    if (!mediaRecorder) return;

    clearInterval(recordingIntervalRef.current);

    const chunks = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      try {
        console.log("[VOICE] recorder stopped");

        const audioBlob = new Blob(chunks, {
          type: "audio/webm",
        });

        console.log("[VOICE] blob created", audioBlob);

        if (audioBlob.size === 0) {
          console.error("[VOICE] empty audio blob");
          return;
        }

        const formData = new FormData();
        formData.append("file", audioBlob, "voice-message.webm");
        formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
        formData.append("cloud_name", CLOUDINARY_CLOUD_NAME);
        formData.append("resource_type", "video");

        console.log("[VOICE] uploading to cloudinary");

        const uploadRes = await fetch(
          `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`,
          {
            method: "POST",
            body: formData,
          },
        );

        const uploadData = await uploadRes.json();

        console.log("[VOICE] uploaded", uploadData.secure_url);

        const config = {
          headers: {
            "Content-type": "application/json",
            Authorization: `Bearer ${user.token}`,
          },
        };

        const { data: messageData } = await API.post(
          "/api/message",
          {
            content: uploadData.secure_url,
            chatId: selectedChat._id,
            messageType: "voice",
          },
          config,
        );

        console.log("[VOICE] message created", messageData);

        socket.emit("new message", messageData);

        setMessages((prev) => [...prev, messageData]);

        setChats((prevChats) => {
          const updatedChats = prevChats.map((chat) => {
            if (chat._id !== messageData.chat._id) {
              return chat;
            }

            return {
              ...chat,
              latestMessage: messageData,
            };
          });

          const movedChat = updatedChats.find(
            (c) => c._id === messageData.chat._id,
          );

          const remainingChats = updatedChats.filter(
            (c) => c._id !== messageData.chat._id,
          );

          return movedChat ? [movedChat, ...remainingChats] : prevChats;
        });

        setAudioChunks([]);
      } catch (error) {
        console.error("Voice upload failed", error);
      }
    };

    mediaRecorder.stop();

    // stop browser microphone usage
    if (recordingStream) {
      recordingStream.getTracks().forEach((track) => track.stop());
    }

    setRecordingStream(null);
    setMediaRecorder(null);
    setIsRecording(false);
    setRecordingTime(0);
  };

  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const isNearBottomRef = useRef(false);
  const isLoadingOlderRef = useRef(false);

  useEffect(() => {
    if (
      messagesEndRef.current &&
      isNearBottomRef.current &&
      !isLoadingOlderRef.current
    ) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const defaultOptions = {
    loop: true,
    autoplay: true,
    animationData: animationData,
    rendererSettings: {
      preserveAspectRatio: "xMidYMid slice",
    },
  };
  const {
    selectedChat,
    setSelectedChat,
    user,
    notification,
    setNotification,
    onlineUsers,
    lastSeenMap,
    chats,
    setChats,
    addNotification,
    socket, // Get socket from ChatState instead of creating a new one
  } = ChatState();

  const fetchMessages = async () => {
    if (!selectedChat) return;

    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };

      setLoading(true);

      console.log("[FETCH MESSAGES] Calling API for chat:", selectedChat._id);

      const { data } = await API.get(
        `/api/message/${selectedChat._id}?page=1&limit=20`,
        config,
      );
      console.log("[FETCH MESSAGES] ✓ API Response:", {
        messageCount: data.messages.length,
        seenStatus: data.messages.map((m) => ({
          id: m._id.slice(-6),
          seen: m.seen,
          sender: m.sender._id === user._id ? "me" : "other",
        })),
      });
      console.log(
        "[FETCH RAW MESSAGES]",
        data.messages.map((m) => ({
          id: m._id,
          encrypted: m.content?.startsWith?.("U2FsdGVkX1"),
          preview: m.content?.slice?.(0, 25),
        })),
      );
      const decryptedMessages = data.messages.map((msg) =>
        decryptMessageObject(msg),
      );

      setMessages(decryptedMessages);
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: "auto" });
        }
      }, 0);
      setPage(1);
      setHasMore(data.hasMore);

      // Mark all unseen messages as seen on open
      data.messages.forEach((msg) => {
        if (msg.sender._id !== user._id && !msg.seen) {
          console.log("[FETCH OPEN CHAT -> EMIT MESSAGE SEEN]", {
            messageId: msg._id,
            chatId: selectedChat._id,
            sender: msg.sender._id,
            currentUser: user._id,
            alreadySeen: msg.seen,
          });
          socket.emit("message seen", {
            messageId: msg._id,
            chatId: selectedChat._id,
            userId: user._id,
          });
        }
      });

      setLoading(false);

      socket.emit("join chat", selectedChat._id);
      console.log("[JOIN CHAT]", selectedChat._id);
    } catch (error) {
      console.error("Error Occurred");
    }
  };

  const sendMessage = async (event) => {
    if (event.key === "Enter" && newMessage) {
      socket.emit("stop typing", selectedChat._id);
      try {
        const config = {
          headers: {
            "Content-type": "application/json",
            Authorization: `Bearer ${user.token}`,
          },
        };
        setNewMessage("");
        const { data } = await API.post(
          "/api/message",
          {
            content: encryptMessage(newMessage),
            chatId: selectedChat._id,
            replyTo: replyMessage?._id || null,
          },
          config,
        );
        console.log("[SEND API RESPONSE RAW]", {
          id: data._id,
          preview: data.content?.slice?.(0, 40),
          encrypted: data.content?.startsWith?.("U2FsdGVkX1"),
        });
        const decryptedMessage = decryptMessageObject(data);

        socket.emit("new message", decryptedMessage);
        console.log("[SEND MESSAGE]", decryptedMessage._id);
        setMessages((prev) => [...prev, decryptedMessage]);

        setChats((prevChats) => {
          const updatedChats = prevChats.map((chat) => {
            if (chat._id !== decryptedMessage.chat._id) {
              return chat;
            }

            return {
              ...chat,
              latestMessage: decryptedMessage,
            };
          });

          const movedChat = updatedChats.find(
            (c) => c._id === decryptedMessage.chat._id,
          );

          const remainingChats = updatedChats.filter(
            (c) => c._id !== decryptedMessage.chat._id,
          );

          return movedChat ? [movedChat, ...remainingChats] : prevChats;
        });

        setReplyMessage(null);
      } catch (error) {
        console.error("Error Occurred");
      }
    }
  };

  const uploadImage = async (file) => {
    if (!file) return;

    try {
      setImageLoading(true);

      const data = new FormData();
      data.append("file", file);
      data.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      data.append("cloud_name", CLOUDINARY_CLOUD_NAME);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: data,
        },
      );

      const result = await res.json();

      const config = {
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      };

      const { data: messageData } = await API.post(
        "/api/message",
        {
          content: result.secure_url,
          chatId: selectedChat._id,
          messageType: "image",
        },
        config,
      );

      socket.emit("new message", messageData);
      setMessages((prev) => [...prev, messageData]);

      setChats((prevChats) => {
        const updatedChats = prevChats.map((chat) => {
          if (chat._id !== messageData.chat._id) {
            return chat;
          }

          return {
            ...chat,
            latestMessage: messageData,
          };
        });

        const movedChat = updatedChats.find(
          (c) => c._id === messageData.chat._id,
        );

        const remainingChats = updatedChats.filter(
          (c) => c._id !== messageData.chat._id,
        );

        return movedChat ? [movedChat, ...remainingChats] : prevChats;
      });

      // keep images unencrypted intentionally

      setImageLoading(false);
    } catch (err) {
      console.error("Image upload failed");
      setImageLoading(false);
    }
  };

  const uploadFile = async (file) => {
    if (!file) return;

    try {
      setImageLoading(true);

      const data = new FormData();
      data.append("file", file);
      data.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      data.append("cloud_name", CLOUDINARY_CLOUD_NAME);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`,
        {
          method: "POST",
          body: data,
        },
      );

      const result = await res.json();

      const config = {
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      };

      const { data: messageData } = await API.post(
        "/api/message",
        {
          content: result.secure_url,
          chatId: selectedChat._id,
          messageType: "file",
          fileName: file.name,
          fileSize: file.size,
          fileMimeType: file.type,
        },
        config,
      );

      socket.emit("new message", messageData);

      setMessages((prev) => [...prev, messageData]);

      setChats((prevChats) => {
        const updatedChats = prevChats.map((chat) => {
          if (chat._id !== messageData.chat._id) {
            return chat;
          }

          return {
            ...chat,
            latestMessage: messageData,
          };
        });

        const movedChat = updatedChats.find(
          (c) => c._id === messageData.chat._id,
        );

        const remainingChats = updatedChats.filter(
          (c) => c._id !== messageData.chat._id,
        );

        return movedChat ? [movedChat, ...remainingChats] : prevChats;
      });

      setImageLoading(false);
    } catch (err) {
      console.error("File upload failed", err);
      setImageLoading(false);
    }
  };

  const typingHandler = (e) => {
    setNewMessage(e.target.value);

    if (!socketConnected) return;

    if (!typing) {
      setTyping(true);
      socket.emit("typing", selectedChat._id);
    }

    if (typingTimeout) clearTimeout(typingTimeout);

    const timeout = setTimeout(() => {
      socket.emit("stop typing", selectedChat._id);
      setTyping(false);
    }, 2000);

    setTypingTimeout(timeout);
  };

  useEffect(() => {
    if (!socket) {
      console.log("[SOCKET NOT READY] Waiting for socket from ChatProvider...");
      return;
    }

    console.log("[SOCKET READY] Using socket from ChatProvider:", socket.id);

    socket.on("typing", () => setIsTyping(true));
    socket.on("stop typing", () => setIsTyping(false));

    // ====== MESSAGES SEEN LISTENER ======
    const messageSeenHandler = ({ messageIds, message }) => {
      console.log("[✓✓✓ MESSAGES SEEN EVENT FIRED]", {
        messageIds,
        count: messageIds?.length,
      });
      console.log("[GROUP READ RECEIPT UPDATE]", {
        allSeen: message?.allSeen,
        seenByCount: message?.seenBy?.length,
      });

      const decryptedSeenMessage = message
        ? decryptMessageObject(message)
        : null;

      setMessages((prev) => {
        const updatedMessages = prev.map((msg) => {
          const updatedMessage = messageIds.includes(msg._id.toString());

          if (!updatedMessage) {
            return msg;
          }

          console.log("[✓✓✓ FORCING MESSAGE TO SEEN]", msg._id.slice(-6));

          return {
            ...msg,
            ...(decryptedSeenMessage || {}),

            // direct chat support
            seen: true,

            // group chat realtime read receipts
            allSeen: Boolean(decryptedSeenMessage?.allSeen),
            seenBy: Array.isArray(decryptedSeenMessage?.seenBy)
              ? [...decryptedSeenMessage.seenBy]
              : Array.isArray(msg.seenBy)
                ? [...msg.seenBy]
                : [],

            seenAt:
              decryptedSeenMessage?.seenAt ||
              msg?.seenAt ||
              new Date().toISOString(),
          };
        });

        // force completely new array reference
        return [...updatedMessages];
      });

      // sync left sidebar latest message instantly too
      setChats((prevChats) =>
        prevChats.map((chat) => {
          if (chat._id !== selectedChatCompare?._id) {
            return chat;
          }

          if (
            chat.latestMessage &&
            messageIds.includes(chat.latestMessage._id?.toString())
          ) {
            return {
              ...chat,
              latestMessage: {
                ...chat.latestMessage,
                seen: true,
              },
            };
          }

          return chat;
        }),
      );
    };

    socket.on("messages seen", messageSeenHandler);
    console.log("[✓✓ LISTENER REGISTERED] 'messages seen' listener ready");
    socket.on("message seen updated", (updatedMessage) => {
      console.log("[MESSAGE SEEN UPDATED EVENT RECEIVED]", {
        id: updatedMessage._id,
        seen: updatedMessage.seen,
        seenAt: updatedMessage.seenAt,
      });

      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === updatedMessage._id
            ? {
                ...msg,
                seen: true,
                seenAt: updatedMessage.seenAt || new Date().toISOString(),
              }
            : msg,
        ),
      );
    });
    socket.on("message reaction updated", (updatedMessage) => {
      updatedMessage = decryptMessageObject(updatedMessage);
      console.log(
        "[REACTION SOCKET RECEIVED]",
        updatedMessage._id,
        updatedMessage.reactions,
      );

      setMessages((prev) => {
        console.log("[REACTION STATE UPDATE]", updatedMessage._id);

        return prev.map((msg) => {
          if (msg._id !== updatedMessage._id) {
            return msg;
          }

          return {
            ...updatedMessage,

            // preserve frontend state
            isScheduled: msg.isScheduled,
            scheduledSent: msg.scheduledSent,
          };
        });
      });
    });

    socket.on("message edited update", (updatedMessage) => {
      updatedMessage = decryptMessageObject(updatedMessage);
      console.log("[MESSAGE EDIT SOCKET]", updatedMessage);

      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === updatedMessage._id ? updatedMessage : msg,
        ),
      );
    });

    socket.on("message deleted update", (updatedMessage) => {
      console.log("[MESSAGE DELETE SOCKET]", updatedMessage);

      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === updatedMessage._id ? updatedMessage : msg,
        ),
      );
    });

    socket.on("scheduled message sent", (scheduledMessage) => {
      scheduledMessage = decryptMessageObject(scheduledMessage);
      console.log("[SCHEDULED MESSAGE RECEIVED]", scheduledMessage._id);

      setMessages((prev) => {
        const existingIndex = prev.findIndex(
          (msg) => msg._id === scheduledMessage._id,
        );

        // replace sender placeholder / existing message
        if (existingIndex !== -1) {
          return prev.map((msg) =>
            msg._id === scheduledMessage._id
              ? {
                  ...msg,
                  ...scheduledMessage,
                  scheduledSent: true,
                  seen: scheduledMessage.seen || false,
                  isScheduled: false,
                }
              : msg,
          );
        }

        // prevent duplicates if already received through message recieved
        const alreadyExists = prev.some(
          (msg) =>
            msg._id === scheduledMessage._id ||
            (msg.content === scheduledMessage.content &&
              msg.sender?._id === scheduledMessage.sender?._id &&
              msg.createdAt === scheduledMessage.createdAt),
        );

        if (alreadyExists) {
          return prev;
        }

        return [...prev, scheduledMessage];
      });
    });

    return () => {
      if (typingTimeout) clearTimeout(typingTimeout);
      socket.off("typing");
      socket.off("stop typing");
      socket.off("messages seen");
      socket.off("message seen updated");
      socket.off("message reaction updated");
      socket.off("message edited update");
      socket.off("message deleted update");
      socket.off("scheduled message sent");
    };

    // Re-register listeners when socket changes
  }, [socket, user, setChats]);

  useEffect(() => {
    // Join chat room FIRST before fetching messages
    if (socket && selectedChat?._id) {
      console.log("[JOIN CHAT FIRST]", selectedChat._id);
      socket.emit("join chat", selectedChat._id);
    }

    selectedChatCompare = selectedChat;

    // Small delay to ensure join is processed on server before API call
    setTimeout(() => {
      fetchMessages();
    }, 100);
    // eslint-disable-next-line
  }, [selectedChat]);

  useEffect(() => {
    if (!socket) return;
    socket.on("message recieved", (newMessageRecieved) => {
      console.log("[RAW SOCKET MESSAGE]", {
        id: newMessageRecieved._id,
        preview: newMessageRecieved.content?.slice?.(0, 40),
        encrypted: newMessageRecieved.content?.startsWith?.("U2FsdGVkX1"),
      });
      newMessageRecieved = decryptMessageObject(newMessageRecieved);
      console.log("[MESSAGE RECIEVED SOCKET]", {
        id: newMessageRecieved._id,
        chatId: newMessageRecieved.chat._id,
        sender: newMessageRecieved.sender._id,
        seen: newMessageRecieved.seen,
      });
      if (
        !selectedChatCompare ||
        selectedChatCompare._id !== newMessageRecieved.chat._id
      ) {
        // Add to notifications
        addNotification(newMessageRecieved);

        // Update chat list (left panel)
        setChats((prevChats) => {
          const updatedChats = prevChats.map((chat) => {
            if (chat._id === newMessageRecieved.chat._id) {
              return {
                ...chat,
                latestMessage:
                  newMessageRecieved.isScheduled &&
                  !newMessageRecieved.scheduledSent
                    ? chat.latestMessage
                    : newMessageRecieved,
              };
            }
            return chat;
          });

          const movedChat = updatedChats.find(
            (c) => c._id === newMessageRecieved.chat._id,
          );

          const remainingChats = updatedChats.filter(
            (c) => c._id !== newMessageRecieved.chat._id,
          );

          return movedChat ? [movedChat, ...remainingChats] : prevChats;
        });
      } else {
        setMessages((prev) => {
          const exists = prev.some((msg) => msg._id === newMessageRecieved._id);

          if (exists) {
            return prev.map((msg) => {
              if (msg._id !== newMessageRecieved._id) {
                return msg;
              }

              // preserve already-updated seen state from realtime events
              const preservedSeen =
                msg.seen === true ? true : newMessageRecieved.seen;

              return {
                ...msg,
                ...newMessageRecieved,
                seen: preservedSeen,
                isScheduled: false,
                scheduledSent: true,
              };
            });
          }

          console.log("[ADDING NEW MESSAGE TO STATE]", {
            id: newMessageRecieved._id,
            seen: newMessageRecieved.seen,
          });

          // Only mark as seen if user is actually viewing the chat
          // AND window/tab is currently active
          if (
            selectedChatCompare &&
            selectedChatCompare._id === newMessageRecieved.chat._id &&
            document.visibilityState === "visible"
          ) {
            console.log("[EMIT MESSAGE SEEN IMMEDIATELY]", {
              messageId: newMessageRecieved._id,
            });

            socket.emit("message seen", {
              messageId: newMessageRecieved._id,
              chatId: newMessageRecieved.chat._id,
              userId: user._id,
            });
          }

          return [...prev, newMessageRecieved];
        });
        setChats((prevChats) => {
          const updatedChats = prevChats.map((chat) => {
            if (chat._id !== newMessageRecieved.chat._id) {
              return chat;
            }

            return {
              ...chat,
              latestMessage: newMessageRecieved,
            };
          });

          const movedChat = updatedChats.find(
            (c) => c._id === newMessageRecieved.chat._id,
          );

          const remainingChats = updatedChats.filter(
            (c) => c._id !== newMessageRecieved.chat._id,
          );

          return movedChat ? [movedChat, ...remainingChats] : prevChats;
        });
        // (message seen emission removed)
      }
    });

    return () => {
      socket.off("message recieved");
    };
  }, []);

  const filteredMessages = messageSearch
    ? messages.filter((m) =>
        m.content.toLowerCase().includes(messageSearch.toLowerCase()),
      )
    : messages;

  const loadMoreMessages = async () => {
    if (!hasMore || loadingMore) return;

    try {
      setLoadingMore(true);
      isLoadingOlderRef.current = true;

      const container = scrollContainerRef.current;
      const prevScrollHeight = container?.scrollHeight || 0;

      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };

      const nextPage = page + 1;

      const { data } = await API.get(
        `/api/message/${selectedChat._id}?page=${nextPage}&limit=20`,
        config,
      );

      const decryptedOlderMessages = data.messages.map((msg) =>
        decryptMessageObject(msg),
      );

      setMessages((prev) => [...decryptedOlderMessages, ...prev]);
      setPage(nextPage);
      setHasMore(data.hasMore);

      setLoadingMore(false);

      // maintain scroll position
      setTimeout(() => {
        if (container) {
          const newScrollHeight = container.scrollHeight;
          container.scrollTop = newScrollHeight - prevScrollHeight;
          isLoadingOlderRef.current = false;
        }
      }, 0);
    } catch (error) {
      console.error("Error loading more messages");
      setLoadingMore(false);
    }
  };

  return (
    <>
      {selectedChat ? (
        <>
          <div className="mb-3 flex w-full items-center justify-between rounded-[24px] border border-slate-200/70 dark:border-white/5 bg-white/70 dark:bg-[#151821]/70 px-4 py-3 backdrop-blur-xl shadow-sm">
            <button
              className="md:hidden flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-200 transition-all hover:scale-105"
              onClick={() => setSelectedChat("")}
            >
              ←
            </button>
            {messages &&
              (!selectedChat.isGroupChat ? (
                (() => {
                  const otherUser = selectedChat.users.find(
                    (u) => u._id !== user._id,
                  );
                  const isOnline = onlineUsers?.includes(otherUser?._id);

                  const lastSeen = lastSeenMap?.[otherUser?._id];

                  const formatLastSeen = (timestamp) => {
                    if (!timestamp) return "Offline";

                    return `Last seen ${new Date(timestamp).toLocaleString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      day: "numeric",
                      month: "short",
                    })}`;
                  };

                  return (
                    <>
                      <div className="flex flex-col min-w-0">
                        <span className="truncate text-base font-semibold tracking-tight text-slate-800 dark:text-white">
                          {getSender(user, selectedChat.users)}
                        </span>
                        <span
                          className={`mt-0.5 text-[11px] font-medium ${isOnline ? "text-emerald-500" : "text-slate-500 dark:text-slate-400"}`}
                        >
                          {isOnline
                            ? "Online"
                            : formatLastSeen(lastSeen)}
                        </span>
                      </div>
                      <ProfileModal
                        user={getSenderFull(user, selectedChat.users)}
                      />
                    </>
                  );
                })()
              ) : (
                <>
                  <div className="flex flex-col">
                    <span className="text-base font-semibold tracking-tight text-slate-800 dark:text-white">
                      {selectedChat.chatName}
                    </span>

                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Group conversation
                    </span>
                  </div>
                  <UpdateGroupChatModal
                    fetchMessages={fetchMessages}
                    fetchAgain={fetchAgain}
                    setFetchAgain={setFetchAgain}
                  />
                </>
              ))}
          </div>
          <div className="flex h-full w-full flex-col overflow-hidden rounded-[28px] border border-slate-200/70 dark:border-white/5 bg-[#f5f5f5] dark:bg-[#0f1117] shadow-sm">
            <input
              type="text"
              placeholder="Search messages..."
              value={messageSearch}
              onChange={(e) => setMessageSearch(e.target.value)}
              className="mx-3 mt-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1e27] px-4 py-2.5 text-sm text-slate-700 dark:text-slate-100 outline-none transition-all placeholder:text-slate-400 focus:ring-2 focus:ring-orange-400"
            />
            {loading ? (
              <div className="flex flex-1 items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                Loading conversation...
              </div>
            ) : (
              <div
                ref={scrollContainerRef}
                className="flex flex-1 flex-col overflow-y-auto px-3 py-3"
                onScroll={(e) => {
                  const { scrollTop, scrollHeight, clientHeight } = e.target;

                  // detect if user is near bottom
                  isNearBottomRef.current =
                    scrollHeight - scrollTop - clientHeight < 100;

                  if (scrollTop === 0 && hasMore && !loadingMore) {
                    loadMoreMessages();
                  }
                }}
              >
                {loadingMore && (
                  <div className="mb-2 text-center text-[11px] text-slate-500 dark:text-slate-400">
                    Loading older messages...
                  </div>
                )}
                <>
                  <ScrollableChat
                    messages={filteredMessages}
                    messageSearch={messageSearch}
                    setMessages={setMessages}
                    socket={socket}
                    setReplyMessage={setReplyMessage}
                  />
                  <div ref={messagesEndRef} />
                </>
              </div>
            )}

            {imageLoading && (
              <div className="px-4 py-1 text-[11px] text-slate-500 dark:text-slate-400">
                Uploading media...
              </div>
            )}
            <div
              onKeyDown={sendMessage}
              className="border-t border-slate-200/70 dark:border-white/5 bg-white/70 dark:bg-[#151821]/70 px-3 py-3 backdrop-blur-xl"
            >
              {istyping ? (
                <div>
                  <Lottie
                    options={defaultOptions}
                    // height={50}
                    width={70}
                    style={{ marginBottom: 15, marginLeft: 0 }}
                  />
                </div>
              ) : (
                <></>
              )}
              {replyMessage && (
                <div className="mb-3 flex items-start justify-between gap-3 rounded-2xl border border-orange-200 dark:border-orange-500/10 bg-orange-50/80 dark:bg-orange-500/5 px-3 py-3">
                  <div className="flex flex-col overflow-hidden">
                    <span className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-orange-500">
                      Replying to{" "}
                      {replyMessage.sender._id === user._id
                        ? "Yourself"
                        : replyMessage.sender.name}
                    </span>

                    <span className="max-w-[260px] truncate text-sm text-slate-700 dark:text-slate-300">
                      {replyMessage.messageType === "voice" ||
                      replyMessage.content?.includes("/video/upload/")
                        ? "🎙️ Voice Message"
                        : replyMessage.messageType === "image" ||
                            replyMessage.content?.includes("/image/upload/")
                          ? "📷 Image"
                          : replyMessage.content}
                    </span>
                  </div>

                  <button
                    onClick={() => setReplyMessage(null)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition-all hover:bg-black/5 dark:hover:bg-white/5"
                  >
                    ✕
                  </button>
                </div>
              )}
              {showSchedulePicker && (
                <div className="mb-3 flex flex-col gap-2 rounded-2xl border border-amber-200 dark:border-amber-500/10 bg-amber-50/70 dark:bg-amber-500/5 px-3 py-3 md:flex-row md:items-center">
                  <input
                    type="datetime-local"
                    value={scheduledDateTime}
                    onChange={(e) => setScheduledDateTime(e.target.value)}
                    className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1e27] px-3 py-2 text-sm outline-none"
                  />

                  <button
                    onClick={sendScheduledMessage}
                    className="rounded-xl bg-gradient-to-r from-orange-400 to-amber-500 px-4 py-2 text-sm font-medium text-white transition-all hover:scale-[1.02]"
                  >
                    Schedule
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => uploadImage(e.target.files[0])}
                  className="hidden"
                  id="imageUpload"
                />

                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.zip,.rar,.txt"
                  onChange={(e) => uploadFile(e.target.files[0])}
                  className="hidden"
                  id="fileUpload"
                />

                <div className="relative">
                  <button
                    onClick={() => setShowAttachmentMenu((prev) => !prev)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[24px] font-light leading-none text-slate-700 transition-all hover:scale-105 dark:bg-white/5 dark:text-slate-200"
                  >
                    ＋
                  </button>

                  {showAttachmentMenu && (
                    <div className="absolute bottom-14 left-0 z-50 flex min-w-[180px] flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-white/95 shadow-xl backdrop-blur-xl dark:border-white/5 dark:bg-[#171b24]/95">
                      <label
                        htmlFor="imageUpload"
                        className="flex cursor-pointer items-center gap-3 px-4 py-3 text-sm text-slate-700 transition-all hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5"
                      >
                        <span className="text-base">🖼️</span>
                        Upload Image
                      </label>

                      <label
                        htmlFor="fileUpload"
                        className="flex cursor-pointer items-center gap-3 px-4 py-3 text-sm text-slate-700 transition-all hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5"
                      >
                        <span className="text-base">📄</span>
                        Upload File
                      </label>
                    </div>
                  )}
                </div>

                {isRecording ? (
                  <div className="flex flex-1 items-center gap-2 rounded-2xl border border-red-200 dark:border-red-500/10 bg-red-50/70 dark:bg-red-500/5 px-3 py-2">
                    <div className="flex items-center gap-2 text-red-500 font-medium text-sm">
                      <span className="animate-pulse text-lg">🔴</span>
                      <span>Recording...</span>
                    </div>

                    <span className="min-w-[42px] text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {Math.floor(recordingTime / 60)
                        .toString()
                        .padStart(2, "0")}
                      :{(recordingTime % 60).toString().padStart(2, "0")}
                    </span>

                    <div className="flex items-center gap-2 ml-auto">
                      <button
                        onClick={cancelRecording}
                        className="rounded-xl bg-slate-200 dark:bg-white/10 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200"
                      >
                        ✕
                      </button>

                      <button
                        onClick={stopRecording}
                        className="rounded-xl bg-emerald-500 px-3 py-1.5 text-sm text-white"
                      >
                        Send
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={startRecording}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition-all hover:scale-105 dark:bg-white/5 dark:text-slate-200"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 18v3m0 0h3m-3 0H9m3-3a5 5 0 005-5V7a5 5 0 10-10 0v6a5 5 0 005 5zm8-5a8 8 0 01-16 0"
                      />
                    </svg>
                  </button>
                )}

                <button
                  onClick={() => setShowSchedulePicker((prev) => !prev)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-500 transition-all hover:scale-105 dark:bg-orange-500/10"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </button>

                <div className="flex h-12 flex-1 items-center gap-2 rounded-2xl border border-slate-200 bg-white pl-4 pr-2 dark:border-white/10 dark:bg-[#1a1e27] focus-within:ring-2 focus-within:ring-orange-400">
                  <input
                    className="flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-100"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={typingHandler}
                  />

                  <button
                    onClick={() => {
                      if (!newMessage) return;

                      sendMessage({
                        key: "Enter",
                      });
                    }}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-orange-400 to-amber-500 text-white shadow-sm transition-all hover:scale-105"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 12h14M12 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        // to get socket.io on same page
        <div className="flex h-full items-center justify-center rounded-[28px] border border-slate-200/70 dark:border-white/5 bg-[#f5f5f5] dark:bg-[#0f1117] p-6">
          <div className="text-center">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[24px] bg-gradient-to-br from-orange-400 to-amber-500 text-4xl text-white shadow-md">
              💬
            </div>

            <p className="mb-2 text-xl font-semibold tracking-tight text-slate-800 dark:text-white">
              No conversation selected
            </p>

            <p className="text-sm text-slate-500 dark:text-slate-400">
              Choose a conversation from the sidebar to start chatting.
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default SingleChat;
