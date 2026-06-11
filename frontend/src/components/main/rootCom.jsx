import React, { useEffect, useRef, useState } from "react";

import { useLocation } from "react-router-dom";

import { Pin, Trash2, Info, Reply, Star, Pencil, Forward } from "lucide-react";

import LeftSidebar from "./sideBar";
import ChatList from "./chatList";
import CenterChat from "./centerChat";
import RightPanel from "./rightPanel";
import { ChatState } from "../../Context/ChatProvider";
import API from "../../config/api";

import { encryptMessage, decryptMessageObject } from "../../utils/encryption";

const scrollbarStyles = `
.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: transparent;
  border-radius: 999px;
  transition: background 0.25s ease;
}

.custom-scrollbar:hover::-webkit-scrollbar-thumb,
.custom-scrollbar:active::-webkit-scrollbar-thumb,
.custom-scrollbar:focus::-webkit-scrollbar-thumb {
  background: rgba(120, 130, 170, 0.45);
}

.custom-scrollbar:hover {
  scrollbar-color: rgba(120, 130, 170, 0.45) transparent;
}
`;

const CLOUDINARY_CLOUD_NAME = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;

const CLOUDINARY_UPLOAD_PRESET = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET;

export default function RootCom() {
  /* ---------------- STATES ---------------- */
  const location = useLocation();

  const [hoveredMessage, setHoveredMessage] = useState(null);

  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);

  const [showPinOptions, setShowPinOptions] = useState(false);

  const [showChatMenu, setShowChatMenu] = useState(false);

  const [showMessageSearch, setShowMessageSearch] = useState(false);

  const [messageSearch, setMessageSearch] = useState("");

  const [showRightPanel, setShowRightPanel] = useState(false);

  const [chatTab, setChatTab] = useState(
    location.pathname === "/groups" ? "groups" : "direct",
  );

  const [reactionPopup, setReactionPopup] = useState(false);

  const [showScheduleBox, setShowScheduleBox] = useState(false);

  const [scheduledDate, setScheduledDate] = useState("");

  const [scheduledTime, setScheduledTime] = useState("");

  const [highlightPinnedMessage, setHighlightPinnedMessage] = useState(false);

  const [contextMenu, setContextMenu] = useState(null);

  const pinnedMessageRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [page, setPage] = useState(1);

  const [hasMore, setHasMore] = useState(true);

  const [loadingMore, setLoadingMore] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);

  const [isRecording, setIsRecording] = useState(false);

  const [mediaRecorder, setMediaRecorder] = useState(null);

  const [recordingStream, setRecordingStream] = useState(null);

  const [messageInfoModal, setMessageInfoModal] = useState(null);

  const [editingMessage, setEditingMessage] = useState(null);
  const [forwardMessageModal, setForwardMessageModal] = useState(null);
  const [selectedForwardChats, setSelectedForwardChats] = useState([]);

  const [pollModalOpen, setPollModalOpen] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [allowMultiplePollVotes, setAllowMultiplePollVotes] = useState(false);

  const [typing, setTyping] = useState(false);
  const [typingUser, setTypingUser] = useState(null);
  const [fetchAgain, setFetchAgain] = useState(false);

  const selectedChatCompare = useRef();

  /* ---------------- CONTEXT MENU ---------------- */

  const handleContextMenu = (e, messageId, isSent = false) => {
    e.preventDefault();

    setShowPinOptions(false);

    const menuWidth = 230;
    const menuHeight = isSent ? 520 : 360;

    const adjustedX =
      e.clientX + menuWidth > window.innerWidth
        ? window.innerWidth - menuWidth - 20
        : e.clientX;

    const adjustedY =
      e.clientY + menuHeight > window.innerHeight
        ? Math.max(20, window.innerHeight - menuHeight - 20)
        : e.clientY;

    setContextMenu({
      x: adjustedX,
      y: adjustedY,
      messageId,
      isSent,
    });
  };

  const {
    selectedChat,
    setSelectedChat,
    user,
    notification,
    setNotification,
    onlineUsers,
    lastSeenMap,
    socket,
    setChats,
    chats,
  } = ChatState();

  const isDark = localStorage.getItem("darkMode") === "true";

  useEffect(() => {
    setChatTab(location.pathname === "/groups" ? "groups" : "direct");

    setSelectedChat(null);
    setMessages([]);
    setPage(1);
    setHasMore(true);
  }, [location.pathname, setSelectedChat]);

  useEffect(() => {
    if (!selectedChat) return;

    selectedChatCompare.current = selectedChat;

    const fetchMessages = async () => {
      if (!selectedChat) return;

      try {
        const config = {
          headers: {
            Authorization: `Bearer ${user?.token}`,
          },
        };

        const { data } = await API.get(
          `/api/message/${selectedChat._id}?page=${page}&limit=20`,
          config,
        );

        const fetchedMessages = data.messages || data || [];

        const decryptedMessages = fetchedMessages.map((msg) =>
          decryptMessageObject(msg),
        );

        if (page === 1) {
          setMessages(decryptedMessages);
        } else {
          setMessages((prev) => [...decryptedMessages, ...prev]);
        }

        setHasMore(data.hasMore);

        console.log("FETCHED MESSAGES:", data.messages || data || []);
      } catch (error) {
        console.error("Failed to load messages", error);
      }
    };

    fetchMessages();

    socket?.emit("join chat", selectedChat._id);
  }, [selectedChat, socket, page, user?.token]);

  useEffect(() => {
    setPage(1);

    setHasMore(true);

    setMessages([]);
  }, [selectedChat?._id]);

  useEffect(() => {
    const handleMessageReceived = (newMessageRecieved) => {
      const incomingChatId = newMessageRecieved.chat?._id;

      if (!incomingChatId) return;

      if (selectedChatCompare.current?._id === incomingChatId) {
        const decrypted = decryptMessageObject(newMessageRecieved);

        setMessages((prev) => [...prev, decrypted]);

        setNotification((prev) =>
          prev.filter((n) => {
            const notifChatId = n.chat?._id?.toString() || n.chat?.toString();

            return notifChatId !== incomingChatId.toString();
          }),
        );

        return;
      }

      setFetchAgain((prev) => !prev);
    };

    socket?.on("message recieved", handleMessageReceived);

    return () => {
      socket?.off("message recieved", handleMessageReceived);
    };
  }, [socket, notification, setNotification]);

  useEffect(() => {
    if (!socket) return;

    const handleDeletedMessage = (updatedMessage) => {
      const normalized = decryptMessageObject(updatedMessage);

      setMessages((prev) =>
        prev.map((msg) => (msg._id === normalized._id ? normalized : msg)),
      );
    };

    socket.on("message deleted update", handleDeletedMessage);

    return () => {
      socket.off("message deleted update", handleDeletedMessage);
    };
  }, [socket]);

  useEffect(() => {
    if (!socket) return;

    const handlePinnedUpdate = (updatedMessage) => {
      const normalizedMessage = decryptMessageObject(updatedMessage);

      setMessages((prev) => {
        const exists = prev.some((msg) => msg._id === normalizedMessage._id);

        if (!exists) return prev;

        return prev.map((msg) =>
          msg._id === normalizedMessage._id ? normalizedMessage : msg,
        );
      });
    };

    socket.on("message pinned updated", handlePinnedUpdate);

    return () => {
      socket.off("message pinned updated", handlePinnedUpdate);
    };
  }, [socket]);

  useEffect(() => {
    if (!socket) return;

    const handleTyping = (data) => {
      if (!selectedChatCompare.current?._id) return;

      if (selectedChatCompare.current._id !== selectedChat?._id) return;

      setTypingUser(data);
    };

    const handleStopTyping = () => {
      setTypingUser(null);
    };

    socket.on("typing", handleTyping);
    socket.on("stop typing", handleStopTyping);

    return () => {
      socket.off("typing", handleTyping);
      socket.off("stop typing", handleStopTyping);
    };
  }, [socket, selectedChat]);

  useEffect(() => {
    if (!socket) return;

    const handleMessagesSeen = ({ messageIds, message }) => {
      const updatedSeenMessage = message ? decryptMessageObject(message) : null;

      setMessages((prev) =>
        prev.map((msg) => {
          if (!messageIds?.includes(msg._id?.toString())) {
            return msg;
          }

          return {
            ...msg,
            ...(updatedSeenMessage || {}),
            seen:
              typeof updatedSeenMessage?.seen === "boolean"
                ? updatedSeenMessage.seen
                : msg.seen,
            allSeen:
              typeof updatedSeenMessage?.allSeen === "boolean"
                ? updatedSeenMessage.allSeen
                : msg.allSeen,
            seenBy: Array.isArray(updatedSeenMessage?.seenBy)
              ? [...updatedSeenMessage.seenBy]
              : Array.isArray(msg.seenBy)
                ? [...msg.seenBy]
                : [],
          };
        }),
      );

      if (
        updatedSeenMessage &&
        messageInfoModal?._id &&
        messageIds?.includes(messageInfoModal._id?.toString())
      ) {
        setMessageInfoModal(updatedSeenMessage);
      }

      setChats((prevChats) => {
        if (!Array.isArray(prevChats)) {
          return prevChats;
        }

        return prevChats.map((chat) => {
          if (chat._id !== selectedChatCompare.current?._id) {
            return chat;
          }

          if (
            chat.latestMessage &&
            messageIds?.includes(chat.latestMessage._id?.toString())
          ) {
            return {
              ...chat,
              latestMessage: {
                ...chat.latestMessage,
                seen:
                  typeof updatedSeenMessage?.seen === "boolean"
                    ? updatedSeenMessage.seen
                    : chat.latestMessage.seen,
              },
              readOverrides: (chat.readOverrides || []).filter(
                (entry) =>
                  (entry.user?._id || entry.user)?.toString() !==
                  user?._id?.toString(),
              ),
            };
          }

          return chat;
        });
      });
    };

    socket.on("messages seen", handleMessagesSeen);

    return () => {
      socket.off("messages seen", handleMessagesSeen);
    };
  }, [socket, setChats, messageInfoModal, user?._id]);

  useEffect(() => {
    if (!socket) return;

    const handleEditedMessage = (updatedMessage) => {
      if (
        selectedChatCompare.current &&
        updatedMessage.chat &&
        updatedMessage.chat._id !== selectedChatCompare.current._id
      ) {
        return;
      }
      const normalized = decryptMessageObject(updatedMessage);

      setMessages((prev) =>
        prev.map((msg) => (msg._id === normalized._id ? normalized : msg)),
      );

      setChats((prevChats) => {
        if (!Array.isArray(prevChats)) {
          return prevChats;
        }

        return prevChats.map((chat) => {
          if (chat.latestMessage?._id === normalized._id) {
            return {
              ...chat,
              latestMessage: normalized,
            };
          }

          return chat;
        });
      });
    };

    socket.on("message edited", handleEditedMessage);

    return () => {
      socket.off("message edited", handleEditedMessage);
    };
  }, [socket, setChats]);

  useEffect(() => {
    if (!socket) return;

    const handlePollUpdate = (updatedMessage) => {
      const normalized = decryptMessageObject(updatedMessage);

      setMessages((prev) =>
        prev.map((msg) => (msg._id === normalized._id ? normalized : msg)),
      );
    };

    socket.on("poll updated", handlePollUpdate);

    return () => {
      socket.off("poll updated", handlePollUpdate);
    };
  }, [socket]);

  useEffect(() => {
    if (!socket) return;

    const handleScheduledMessage = (message) => {
      const normalizedMessage = decryptMessageObject(message);

      setMessages((prev) => {
        const existingScheduledIndex = prev.findIndex(
          (msg) =>
            msg.isScheduled &&
            !msg.scheduledSent &&
            msg.content === normalizedMessage.content &&
            (msg.sender?._id || msg.sender) ===
              (normalizedMessage.sender?._id || normalizedMessage.sender),
        );

        if (existingScheduledIndex !== -1) {
          const updated = [...prev];

          updated[existingScheduledIndex] = {
            ...normalizedMessage,
            isScheduled: false,
            scheduledSent: true,
          };

          return updated;
        }

        return [...prev, normalizedMessage];
      });

      setChats((prevChats) => {
        if (!Array.isArray(prevChats)) {
          return prevChats;
        }

        return prevChats.map((chat) =>
          chat._id === normalizedMessage.chat._id
            ? {
                ...chat,
                latestMessage: {
                  ...normalizedMessage,
                  isScheduled: false,
                  scheduledSent: true,
                },
              }
            : chat,
        );
      });
    };

    socket.on("scheduled message sent", handleScheduledMessage);

    return () => {
      socket.off("scheduled message sent", handleScheduledMessage);
    };
  }, [socket, setChats]);

  useEffect(() => {
    if (!socket) return;

    const handleReactionUpdate = (updatedMessage) => {
      const normalizedMessage = decryptMessageObject(updatedMessage);

      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === normalizedMessage._id ? normalizedMessage : msg,
        ),
      );

      setChats((prevChats) => {
        if (!Array.isArray(prevChats)) {
          return prevChats;
        }

        return prevChats.map((chat) => {
          if (chat.latestMessage?._id === normalizedMessage._id) {
            return {
              ...chat,
              latestMessage: normalizedMessage,
            };
          }

          return chat;
        });
      });
    };

    socket.on("message reaction updated", handleReactionUpdate);

    return () => {
      socket.off("message reaction updated", handleReactionUpdate);
    };
  }, [socket, setChats]);

  const typingHandler = (e) => {
    setNewMessage(e.target.value);

    if (!socket || !selectedChat?._id) return;

    if (!typing) {
      setTyping(true);
      socket.emit("typing", {
        room: selectedChat._id,
        userId: user?._id,
        userName: user.name,
      });
    }

    const lastTypingTime = new Date().getTime();

    const timerLength = 3000;

    setTimeout(() => {
      const timeNow = new Date().getTime();
      const timeDiff = timeNow - lastTypingTime;

      if (timeDiff >= timerLength && typing) {
        socket.emit("stop typing", selectedChat._id);
        setTyping(false);
      }
    }, timerLength);
  };

  const extractMentionIds = (messageText) => {
    if (!selectedChat?.isGroupChat || !messageText) return [];

    const mentionMatches = messageText.match(/@(\w+)/g) || [];

    return selectedChat.users
      .filter((chatUser) => {
        if (chatUser._id === user?._id) return false;

        return mentionMatches.some(
          (mention) => mention.slice(1) === chatUser.name,
        );
      })
      .map((chatUser) => chatUser._id);
  };

  const deleteMessage = async (messageId, mode = "everyone") => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user?.token}`,
        },
      };

      const { data } = await API.delete(`/api/message/${messageId}`, {
        ...config,
        data: {
          mode,
        },
      });

      if (mode === "me") {
        setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
      } else {
        const updatedMessage = decryptMessageObject(data);

        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === updatedMessage._id ? updatedMessage : msg,
          ),
        );

        socket.emit("message deleted", updatedMessage);
      }

      setContextMenu(null);
    } catch (error) {
      console.error("Delete failed", error);
    }
  };

  const forwardMessage = async () => {
    if (!forwardMessageModal?._id || selectedForwardChats.length === 0) return;

    try {
      const config = {
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${user?.token}`,
        },
      };

      const { data } = await API.post(
        "/api/message/forward",
        {
          messageId: forwardMessageModal._id,
          targetChatIds: selectedForwardChats,
        },
        config,
      );

      if (Array.isArray(data)) {
        data.forEach((msg) => {
          if (msg.chat?._id === selectedChat?._id) {
            setMessages((prev) => [...prev, decryptMessageObject(msg)]);
          }
        });
      }

      setForwardMessageModal(null);
      setSelectedForwardChats([]);
      setContextMenu(null);
    } catch (error) {
      console.error("Forward failed", error);
    }
  };

  const createPoll = async () => {
    if (
      !selectedChat?._id ||
      !pollQuestion.trim() ||
      pollOptions.filter((opt) => opt.trim()).length < 2
    ) {
      return;
    }

    try {
      const config = {
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${user?.token}`,
        },
      };

      const { data } = await API.post(
        "/api/message/poll",
        {
          chatId: selectedChat._id,
          question: pollQuestion,
          options: pollOptions.filter((opt) => opt.trim()),
          allowMultiple: allowMultiplePollVotes,
        },
        config,
      );

      const normalized = decryptMessageObject(data);

      setMessages((prev) => [...prev, normalized]);

      setPollModalOpen(false);
      setPollQuestion("");
      setPollOptions(["", ""]);
      setAllowMultiplePollVotes(false);
    } catch (error) {
      console.error("Poll create failed", error);
    }
  };

  const votePoll = async (messageId, selectedOptions) => {
    try {
      const config = {
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${user?.token}`,
        },
      };

      const { data } = await API.put(
        `/api/message/poll/vote/${messageId}`,
        { selectedOptions },
        config,
      );

      const normalized = decryptMessageObject(data);

      setMessages((prev) =>
        prev.map((msg) => (msg._id === normalized._id ? normalized : msg)),
      );
    } catch (error) {
      console.error("Poll vote failed", error);
    }
  };

  const editMessage = async () => {
    if (!editingMessage?._id || !newMessage.trim()) return;

    try {
      socket.emit("stop typing", selectedChat._id);
      setTyping(false);

      const config = {
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${user?.token}`,
        },
      };

      const mentionIds = extractMentionIds(newMessage);

      const { data } = await API.put(
        `/api/message/edit/${editingMessage._id}`,
        {
          content: encryptMessage(newMessage),
          mentions: mentionIds,
        },
        config,
      );

      const updatedMessage = decryptMessageObject(data);

      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === updatedMessage._id ? updatedMessage : msg,
        ),
      );

      setChats((prevChats) => {
        if (!Array.isArray(prevChats)) {
          return prevChats;
        }

        return prevChats.map((chat) => {
          if (chat.latestMessage?._id === updatedMessage._id) {
            return {
              ...chat,
              latestMessage: updatedMessage,
            };
          }

          return chat;
        });
      });

      setEditingMessage(null);
      setReplyingTo(null);
      setNewMessage("");
    } catch (error) {
      console.error("Edit message failed", error);
    }
  };

  const sendMessage = async (event) => {
    if (event.key !== "Enter") return;

    if (editingMessage) {
      editMessage();
      return;
    }

    if (!newMessage.trim()) return;

    try {
      socket.emit("stop typing", selectedChat._id);
      setTyping(false);

      const config = {
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${user?.token}`,
        },
      };

      setNewMessage("");
      const mentionIds = extractMentionIds(newMessage);

      setShowScheduleBox(false);
      setScheduledDate("");
      setScheduledTime("");

      const { data } = await API.post(
        "/api/message",
        {
          content: encryptMessage(newMessage),
          chatId: selectedChat._id,
          replyTo: replyingTo?._id || null,
          mentions: mentionIds,
        },
        config,
      );

      socket.emit("new message", data);

      const decryptedMessage = decryptMessageObject(data);

      setMessages((prev) => [...prev, decryptedMessage]);
      setReplyingTo(null);

      setChats((prevChats) => {
        if (!Array.isArray(prevChats)) {
          return prevChats;
        }

        const updatedChats = prevChats.map((chat) => {
          if (chat._id === selectedChat._id) {
            return {
              ...chat,
              latestMessage: decryptedMessage,
            };
          }

          return chat;
        });

        updatedChats.sort((a, b) => {
          const aTime = new Date(
            a.latestMessage?.createdAt || a.updatedAt,
          ).getTime();

          const bTime = new Date(
            b.latestMessage?.createdAt || b.updatedAt,
          ).getTime();

          return bTime - aTime;
        });

        return [...updatedChats];
      });
    } catch (error) {
      console.error("Send message failed", error);
    }
  };

  const pinMessage = async (messageId, duration) => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user?.token}`,
        },
      };

      const { data } = await API.put(
        "/api/message/pin",
        {
          messageId,
          duration,
          chatId: selectedChat._id,
        },
        config,
      );

      const updatedMessage = decryptMessageObject(data);

      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === updatedMessage._id ? updatedMessage : msg,
        ),
      );

      setShowPinOptions(false);
      setContextMenu(null);
      setTimeout(() => {
        const el = document.getElementById(`message-${updatedMessage._id}`);

        if (!el) return;

        el.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });

        el.classList.add("ring-2", "ring-[#2453c4]");

        setTimeout(() => {
          el.classList.remove("ring-2", "ring-[#2453c4]");
        }, 2000);
      }, 100);
    } catch (error) {
      console.error("Pin failed", error);
    }
  };

  const unpinMessage = async (messageId) => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user?.token}`,
        },
      };

      const { data } = await API.put(
        "/api/message/pin",
        {
          messageId,
          unpin: true,
        },
        config,
      );

      const updatedMessage = decryptMessageObject(data);

      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === updatedMessage._id ? updatedMessage : msg,
        ),
      );
    } catch (error) {
      console.error("Unpin failed", error);
    }
  };

  const reactToMessage = async (messageId, emoji) => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user?.token}`,
        },
      };

      const { data } = await API.put(
        "/api/message/reaction",
        {
          messageId,
          emoji,
        },
        config,
      );

      const decryptedReactionMessage = decryptMessageObject(data);

      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === decryptedReactionMessage._id
            ? decryptedReactionMessage
            : msg,
        ),
      );

      socket.emit("message reaction", data);
    } catch (error) {
      console.error("Reaction failed", error);
    }
  };

  const toggleStarMessage = async (messageId) => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user?.token}`,
        },
      };

      const { data } = await API.put(
        "/api/message/star",
        {
          messageId,
        },
        config,
      );

      const updatedMessage = decryptMessageObject(data);

      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === updatedMessage._id ? updatedMessage : msg,
        ),
      );

      setContextMenu(null);
    } catch (error) {
      console.error("Star toggle failed", error);
    }
  };

  const loadMoreMessages = async () => {
    if (!hasMore || loadingMore || !selectedChat) return;

    try {
      setLoadingMore(true);

      const config = {
        headers: {
          Authorization: `Bearer ${user?.token}`,
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
    } catch (error) {
      console.error("Error loading more messages");

      setLoadingMore(false);
    }
  };

  const uploadImage = async (file) => {
    if (!file || !selectedChat) return;

    try {
      setImageLoading(true);

      const formData = new FormData();

      formData.append("file", file);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      formData.append("cloud_name", CLOUDINARY_CLOUD_NAME);

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: formData,
        },
      );

      const uploadData = await uploadRes.json();

      const config = {
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${user?.token}`,
        },
      };

      const { data } = await API.post(
        "/api/message",
        {
          content: uploadData.secure_url,
          chatId: selectedChat._id,
          messageType: "image",
        },
        config,
      );

      const normalizedMessage = decryptMessageObject(data);

      socket.emit("new message", normalizedMessage);

      setMessages((prev) => [...prev, normalizedMessage]);

      setChats((prevChats) =>
        prevChats.map((chat) =>
          chat._id === selectedChat._id
            ? { ...chat, latestMessage: normalizedMessage }
            : chat,
        ),
      );

      setImageLoading(false);
      setShowAttachmentMenu(false);
    } catch (error) {
      console.error("Image upload failed", error);
      setImageLoading(false);
    }
  };

  const uploadFile = async (file) => {
    if (!file || !selectedChat) return;

    try {
      setImageLoading(true);

      const formData = new FormData();

      formData.append("file", file);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      formData.append("cloud_name", CLOUDINARY_CLOUD_NAME);

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`,
        {
          method: "POST",
          body: formData,
        },
      );

      const uploadData = await uploadRes.json();

      const config = {
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${user?.token}`,
        },
      };

      const { data } = await API.post(
        "/api/message",
        {
          content: uploadData.secure_url,
          chatId: selectedChat._id,
          messageType: "file",
          fileName: file.name,
          fileSize: file.size,
          fileMimeType: file.type,
        },
        config,
      );

      const normalizedMessage = decryptMessageObject(data);

      socket.emit("new message", normalizedMessage);

      setMessages((prev) => [...prev, normalizedMessage]);

      setChats((prevChats) =>
        prevChats.map((chat) =>
          chat._id === selectedChat._id
            ? { ...chat, latestMessage: normalizedMessage }
            : chat,
        ),
      );

      setImageLoading(false);
      setShowAttachmentMenu(false);
    } catch (error) {
      console.error("File upload failed", error);
      setImageLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      const recorder = new MediaRecorder(stream);

      setRecordingStream(stream);
      setMediaRecorder(recorder);

      recorder.start();

      setIsRecording(true);
    } catch (error) {
      console.error("Mic permission denied", error);
    }
  };

  const stopRecording = async () => {
    if (!mediaRecorder || !selectedChat) return;

    mediaRecorder.ondataavailable = async (event) => {
      if (!event.data.size) return;

      try {
        const formData = new FormData();

        formData.append("file", event.data, "voice-message.webm");
        formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
        formData.append("cloud_name", CLOUDINARY_CLOUD_NAME);
        formData.append("resource_type", "video");

        const uploadRes = await fetch(
          `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`,
          {
            method: "POST",
            body: formData,
          },
        );

        const uploadData = await uploadRes.json();

        const config = {
          headers: {
            "Content-type": "application/json",
            Authorization: `Bearer ${user?.token}`,
          },
        };

        const { data } = await API.post(
          "/api/message",
          {
            content: uploadData.secure_url,
            chatId: selectedChat._id,
            messageType: "voice",
          },
          config,
        );

        const normalizedMessage = decryptMessageObject(data);

        socket.emit("new message", normalizedMessage);

        setMessages((prev) => [...prev, normalizedMessage]);

        setChats((prevChats) =>
          prevChats.map((chat) =>
            chat._id === selectedChat._id
              ? { ...chat, latestMessage: normalizedMessage }
              : chat,
          ),
        );
      } catch (error) {
        console.error("Voice upload failed", error);
      }
    };

    mediaRecorder.stop();

    recordingStream?.getTracks().forEach((t) => t.stop());

    setRecordingStream(null);
    setMediaRecorder(null);
    setIsRecording(false);
  };

  const cancelRecording = () => {
    if (!mediaRecorder) return;

    mediaRecorder.stop();

    recordingStream?.getTracks().forEach((t) => t.stop());

    setRecordingStream(null);
    setMediaRecorder(null);
    setIsRecording(false);
  };

  const sendScheduledMessage = async () => {
    if (!newMessage || !scheduledDate || !scheduledTime) return;

    try {
      const scheduledFor = new Date(
        `${scheduledDate}T${scheduledTime}`,
      ).toISOString();

      const config = {
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${user?.token}`,
        },
      };

      const mentionIds = extractMentionIds(newMessage);

      const { data } = await API.post(
        "/api/message",
        {
          content: encryptMessage(newMessage),
          chatId: selectedChat._id,
          isScheduled: true,
          scheduledFor,
          replyTo: replyingTo?._id || null,
          mentions: mentionIds,
        },
        config,
      );

      const optimisticScheduledMessage = {
        ...decryptMessageObject(data),
        isScheduled: true,
        scheduledSent: false,
      };

      setMessages((prev) => [...prev, optimisticScheduledMessage]);

      setChats((prevChats) => {
        if (!Array.isArray(prevChats)) {
          return prevChats;
        }

        return prevChats.map((chat) =>
          chat._id === selectedChat._id
            ? {
                ...chat,
                latestMessage: optimisticScheduledMessage,
              }
            : chat,
        );
      });

      setNewMessage("");
      setReplyingTo(null);
      setScheduledDate("");
      setScheduledTime("");
      setShowScheduleBox(false);
    } catch (error) {
      console.error("Schedule failed", error);
    }
  };

  useEffect(() => {
    if (editingMessage) {
      setNewMessage(editingMessage.content || "");
    }
  }, [editingMessage]);

  /* ---------------- JSX ---------------- */

  return (
    <>
      <style>{scrollbarStyles}</style>

      <div
        className={`h-screen w-screen p-4 overflow-hidden transition-colors ${
          isDark
            ? "bg-[radial-gradient(circle_at_top,#1e3a5f_0%,#0b1020_45%,#050814_100%)]"
            : "bg-[#dfe3ee]"
        }`}
        onClick={() => {
          setContextMenu(null);
          setShowPinOptions(false);
          setShowChatMenu(false);
          setReactionPopup(false);
        }}
      >
        <div
          className={`w-full h-full rounded-[44px] p-[14px] flex gap-[14px] overflow-hidden transition-colors ${
            isDark ? "bg-[#191d30]" : "bg-[#2453c4]"
          }`}
          style={{
            boxShadow: isDark
              ? "0 35px 90px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)"
              : "0 35px 70px rgba(36,83,196,0.22)",
          }}
        >
          {/* LEFT SIDEBAR */}
          <LeftSidebar chatTab={chatTab} setChatTab={setChatTab} />

          {/* MAIN CONTENT */}
          <div
            className={`outer-div flex-1 flex rounded-[34px] overflow-visible transition-colors ${
              isDark ? "bg-[#0d101b]" : "bg-[#eef0fb]"
            }`}
          >
            {/* CHAT LIST */}
            <ChatList fetchAgain={fetchAgain} chatTab={chatTab} />

            {/* CENTER CHAT */}
            <CenterChat
              messages={messages}
              hoveredMessage={hoveredMessage}
              selectedChat={selectedChat}
              onlineUsers={onlineUsers}
              lastSeenMap={lastSeenMap}
              setHoveredMessage={setHoveredMessage}
              handleContextMenu={handleContextMenu}
              pinnedMessageRef={pinnedMessageRef}
              highlightPinnedMessage={highlightPinnedMessage}
              setHighlightPinnedMessage={setHighlightPinnedMessage}
              reactionPopup={reactionPopup}
              setReactionPopup={setReactionPopup}
              editingMessage={editingMessage}
              setEditingMessage={setEditingMessage}
              showChatMenu={showChatMenu}
              setShowChatMenu={setShowChatMenu}
              showMessageSearch={showMessageSearch}
              setShowMessageSearch={setShowMessageSearch}
              messageSearch={messageSearch}
              setMessageSearch={setMessageSearch}
              showAttachmentMenu={showAttachmentMenu}
              setShowAttachmentMenu={setShowAttachmentMenu}
              showScheduleBox={showScheduleBox}
              setShowScheduleBox={setShowScheduleBox}
              scheduledDate={scheduledDate}
              setScheduledDate={setScheduledDate}
              scheduledTime={scheduledTime}
              setScheduledTime={setScheduledTime}
              showRightPanel={showRightPanel}
              setShowRightPanel={setShowRightPanel}
              newMessage={newMessage}
              unpinMessage={unpinMessage}
              typingHandler={typingHandler}
              sendMessage={sendMessage}
              uploadImage={uploadImage}
              uploadFile={uploadFile}
              startRecording={startRecording}
              stopRecording={stopRecording}
              cancelRecording={cancelRecording}
              isRecording={isRecording}
              sendScheduledMessage={sendScheduledMessage}
              imageLoading={imageLoading}
              reactToMessage={reactToMessage}
              loadMoreMessages={loadMoreMessages}
              replyingTo={replyingTo}
              setReplyingTo={setReplyingTo}
              pollModalOpen={pollModalOpen}
              setPollModalOpen={setPollModalOpen}
              pollQuestion={pollQuestion}
              setPollQuestion={setPollQuestion}
              pollOptions={pollOptions}
              setPollOptions={setPollOptions}
              allowMultiplePollVotes={allowMultiplePollVotes}
              setAllowMultiplePollVotes={setAllowMultiplePollVotes}
              createPoll={createPoll}
              votePoll={votePoll}
              hasMore={hasMore}
              typingUser={typingUser}
              loadingMore={loadingMore}
              scrollToPinnedMessage={(messageId) => {
                const el = document.getElementById(`message-${messageId}`);

                if (!el) return;

                el.scrollIntoView({
                  behavior: "smooth",
                  block: "center",
                });

                el.classList.add("ring-2", "ring-[#2453c4]");

                setTimeout(() => {
                  el.classList.remove("ring-2", "ring-[#2453c4]");
                }, 2000);
              }}
            />
          </div>
          {/* RIGHT PANEL */}
          {showRightPanel && (
            <RightPanel messages={messages} chats={chats} setChats={setChats} />
          )}
        </div>
      </div>

      {/* CONTEXT MENU */}
      {contextMenu && (
        <div
          className={`fixed z-[999999] min-w-[210px] max-w-[230px] rounded-[22px] p-2 transition-colors ${
            isDark ? "bg-[#111827]" : "bg-white"
          }`}
          style={{
            top: contextMenu.y,
            left: contextMenu.x,
            boxShadow: "0 25px 55px rgba(30,40,80,0.16)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {!showPinOptions ? (
            <>
              {/* REPLY */}
              <button
                onClick={() => {
                  const replyMessage = messages.find(
                    (msg) => msg._id === contextMenu.messageId,
                  );

                  setReplyingTo(replyMessage || null);
                  setContextMenu(null);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-[16px] transition-colors ${
                  isDark ? "hover:bg-[#1f2937]" : "hover:bg-[#f4f6fc]"
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center ${
                    isDark ? "bg-[#1f2937]" : "bg-[#eef2ff]"
                  }`}
                >
                  <Reply size={16} className="text-[#2453c4]" />
                </div>

                <span
                  className={`text-[14px] font-medium ${
                    isDark ? "text-white" : "text-[#2d3142]"
                  }`}
                >
                  Reply
                </span>
              </button>

              {contextMenu.isSent && (
                <button
                  onClick={() => {
                    const targetMessage = messages.find(
                      (msg) => msg._id === contextMenu.messageId,
                    );

                    if (
                      !targetMessage ||
                      targetMessage.deleted ||
                      targetMessage.messageType !== "text"
                    ) {
                      setContextMenu(null);
                      return;
                    }

                    setEditingMessage(targetMessage);
                    setContextMenu(null);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-[16px] transition-colors ${
                    isDark ? "hover:bg-[#1f2937]" : "hover:bg-[#f4f6fc]"
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center ${
                      isDark ? "bg-[#1f2937]" : "bg-[#eef2ff]"
                    }`}
                  >
                    <Pencil size={16} className="text-[#2453c4]" />
                  </div>

                  <span
                    className={`text-[14px] font-medium ${
                      isDark ? "text-white" : "text-[#2d3142]"
                    }`}
                  >
                    Edit Message
                  </span>
                </button>
              )}

              {/* FORWARD */}
              <button
                onClick={() => {
                  const targetMessage = messages.find(
                    (msg) => msg._id === contextMenu.messageId,
                  );

                  if (!targetMessage || targetMessage.deleted) {
                    setContextMenu(null);
                    return;
                  }

                  setForwardMessageModal(targetMessage);
                  setSelectedForwardChats([]);
                  setContextMenu(null);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-[16px] transition-colors ${
                  isDark ? "hover:bg-[#1f2937]" : "hover:bg-[#f4f6fc]"
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center ${
                    isDark ? "bg-[#1f2937]" : "bg-[#eef2ff]"
                  }`}
                >
                  <Forward size={16} className="text-[#2453c4]" />
                </div>

                <span
                  className={`text-[14px] font-medium ${
                    isDark ? "text-white" : "text-[#2d3142]"
                  }`}
                >
                  Forward
                </span>
              </button>

              {/* STAR */}
              <button
                onClick={() => toggleStarMessage(contextMenu.messageId)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-[16px] transition-colors ${
                  isDark ? "hover:bg-[#1f2937]" : "hover:bg-[#f4f6fc]"
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center ${
                    isDark ? "bg-[#3a2d12]" : "bg-[#fff8e8]"
                  }`}
                >
                  <Star size={16} className="text-[#e5a100]" />
                </div>

                <span
                  className={`text-[14px] font-medium ${
                    isDark ? "text-white" : "text-[#2d3142]"
                  }`}
                >
                  {messages
                    .find((m) => m._id === contextMenu.messageId)
                    ?.starredBy?.some(
                      (starUser) => (starUser._id || starUser) === user?._id,
                    )
                    ? "Unstar Message"
                    : "Star Message"}
                </span>
              </button>

              {/* PIN */}
              <button
                onClick={() => {
                  const targetMessage = messages.find(
                    (m) => m._id === contextMenu.messageId,
                  );

                  if (targetMessage?.pinned) {
                    unpinMessage(targetMessage._id);
                    setContextMenu(null);
                    return;
                  }

                  setShowPinOptions(true);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-[16px] transition-colors ${
                  isDark ? "hover:bg-[#1f2937]" : "hover:bg-[#f4f6fc]"
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center ${
                    isDark ? "bg-[#1f2937]" : "bg-[#eef2ff]"
                  }`}
                >
                  <Pin size={16} className="text-[#2453c4]" />
                </div>

                <span
                  className={`text-[14px] font-medium ${
                    isDark ? "text-white" : "text-[#2d3142]"
                  }`}
                >
                  {messages.find((m) => m._id === contextMenu.messageId)?.pinned
                    ? "Unpin Message"
                    : "Pin Message"}
                </span>
              </button>

              {/* DELETE */}
              <button
                onClick={() => deleteMessage(contextMenu.messageId, "me")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-[16px] transition-colors ${
                  isDark ? "hover:bg-[#3b1f25]" : "hover:bg-[#fff3f3]"
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center ${
                    isDark ? "bg-[#3b1f25]" : "bg-[#fff1f1]"
                  }`}
                >
                  <Trash2 size={16} className="text-[#ff5b5b]" />
                </div>

                <span className="text-[14px] font-medium text-[#ff5b5b]">
                  Delete for Me
                </span>
              </button>

              {contextMenu.isSent && (
                <button
                  onClick={() =>
                    deleteMessage(contextMenu.messageId, "everyone")
                  }
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-[16px] transition-colors ${
                    isDark ? "hover:bg-[#3b1f25]" : "hover:bg-[#fff3f3]"
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center ${
                      isDark ? "bg-[#3b1f25]" : "bg-[#fff1f1]"
                    }`}
                  >
                    <Trash2 size={16} className="text-[#ff5b5b]" />
                  </div>

                  <span className="text-[14px] font-medium text-[#ff5b5b]">
                    Delete for Everyone
                  </span>
                </button>
              )}

              {/* INFO */}
              {contextMenu.isSent && (
                <button
                  onClick={() => {
                    const targetMessage = messages.find(
                      (msg) => msg._id === contextMenu.messageId,
                    );

                    if (!targetMessage || !contextMenu.isSent) return;

                    setMessageInfoModal(targetMessage);
                    setContextMenu(null);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-[16px] transition-colors ${
                    isDark ? "hover:bg-[#1f2937]" : "hover:bg-[#f4f6fc]"
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center ${
                      isDark ? "bg-[#1f2937]" : "bg-[#eef2ff]"
                    }`}
                  >
                    <Info size={16} className="text-[#68708d]" />
                  </div>

                  <span
                    className={`text-[14px] font-medium ${
                      isDark ? "text-white" : "text-[#2d3142]"
                    }`}
                  >
                    Message Info
                  </span>
                </button>
              )}
            </>
          ) : (
            <div className="flex flex-col gap-2 p-1">
              <p
                className={`text-[13px] font-semibold px-3 pb-1 ${
                  isDark ? "text-[#9ca3af]" : "text-[#7b8197]"
                }`}
              >
                Pin Duration
              </p>

              {["1 Day", "1 Week", "1 Month"].map((option) => (
                <button
                  key={option}
                  onClick={() => pinMessage(contextMenu.messageId, option)}
                  className={`text-left px-4 py-3 rounded-[14px] text-[14px] font-medium transition-colors ${
                    isDark
                      ? "hover:bg-[#1f2937] text-white"
                      : "hover:bg-[#f4f6fc] text-[#2d3142]"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {forwardMessageModal && (
        <div
          className="fixed inset-0 z-[999999] bg-black/40 flex items-center justify-center p-6"
          onClick={() => setForwardMessageModal(null)}
        >
          <div
            className={`w-full max-w-[500px] rounded-[28px] p-6 transition-colors ${
              isDark ? "bg-[#111827]" : "bg-white"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3
                className={`text-[20px] font-bold ${
                  isDark ? "text-white" : "text-[#2d3142]"
                }`}
              >
                Forward Message
              </h3>

              <button
                onClick={() => setForwardMessageModal(null)}
                className={`text-[28px] leading-none ${
                  isDark ? "text-[#9ca3af]" : "text-[#68708d]"
                }`}
              >
                ×
              </button>
            </div>

            <div className="max-h-[380px] overflow-y-auto flex flex-col gap-3">
              {(chats || []).map((chat) => (
                <button
                  key={chat._id}
                  onClick={() => {
                    setSelectedForwardChats((prev) =>
                      prev.includes(chat._id)
                        ? prev.filter((id) => id !== chat._id)
                        : [...prev, chat._id],
                    );
                  }}
                  className={`w-full flex items-center justify-between rounded-[18px] px-4 py-4 ${
                    isDark ? "bg-[#1f2937]" : "bg-[#f8f9fd]"
                  }`}
                >
                  <span
                    className={`text-[14px] font-medium ${
                      isDark ? "text-white" : "text-[#2d3142]"
                    }`}
                  >
                    {chat.isGroupChat
                      ? chat.chatName
                      : chat.users?.find((u) => u._id !== user?._id)?.name ||
                        "Direct Chat"}
                  </span>

                  <span>
                    {selectedForwardChats.includes(chat._id) ? "✅" : "⬜"}
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={forwardMessage}
              disabled={selectedForwardChats.length === 0}
              className="mt-5 w-full rounded-[18px] bg-[#2453c4] text-white py-4 font-semibold disabled:opacity-50"
            >
              Forward
            </button>
          </div>
        </div>
      )}
      {messageInfoModal && (
        <div
          className="fixed inset-0 z-[999999] bg-black/40 flex items-center justify-center p-6"
          onClick={() => setMessageInfoModal(null)}
        >
          <div
            className={`w-full max-w-[420px] rounded-[28px] p-6 transition-colors ${
              isDark ? "bg-[#111827]" : "bg-white"
            }`}
            onClick={(e) => e.stopPropagation()}
            style={{
              boxShadow: "0 30px 60px rgba(30,40,80,0.18)",
            }}
          >
            <div className="flex items-center justify-between mb-5">
              <h3
                className={`text-[20px] font-bold ${
                  isDark ? "text-white" : "text-[#2d3142]"
                }`}
              >
                Seen By
              </h3>

              <button
                onClick={() => setMessageInfoModal(null)}
                className={`text-[28px] leading-none ${
                  isDark ? "text-[#9ca3af]" : "text-[#68708d]"
                }`}
              >
                ×
              </button>
            </div>

            {messageInfoModal.seenBy?.length > 0 ? (
              <div className="max-h-[350px] overflow-y-auto flex flex-col gap-3">
                {messageInfoModal.seenBy
                  .map((seenUser) => {
                    if (typeof seenUser === "string") {
                      return selectedChat?.users?.find(
                        (chatUser) => chatUser._id === seenUser,
                      );
                    }

                    return seenUser;
                  })
                  .filter((seenUser) => seenUser && seenUser._id !== user?._id)
                  .map((seenUser) => (
                    <div
                      key={seenUser._id}
                      className={`flex items-center gap-3 rounded-[18px] px-4 py-3 ${
                        isDark ? "bg-[#1f2937]" : "bg-[#f8f9fd]"
                      }`}
                    >
                      {seenUser.pic ? (
                        <img
                          src={seenUser.pic}
                          alt={seenUser.name || "User"}
                          className="w-11 h-11 rounded-full object-cover"
                        />
                      ) : (
                        <div
                          className={`w-11 h-11 rounded-full flex items-center justify-center font-semibold ${
                            isDark
                              ? "bg-[#374151] text-[#d1d5db]"
                              : "bg-[#d8deef] text-[#68708d]"
                          }`}
                        >
                          {(seenUser.name || "U").charAt(0)}
                        </div>
                      )}

                      <div>
                        <p
                          className={`text-[14px] font-semibold ${
                            isDark ? "text-white" : "text-[#2d3142]"
                          }`}
                        >
                          {seenUser.name || "Unknown User"}
                        </p>

                        <p
                          className={`text-[12px] ${
                            isDark ? "text-[#9ca3af]" : "text-[#68708d]"
                          }`}
                        >
                          Seen
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p
                className={`text-center py-8 ${
                  isDark ? "text-[#9ca3af]" : "text-[#68708d]"
                }`}
              >
                Not seen yet
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
