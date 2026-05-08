import { useEffect, useRef, useState } from "react";
import {
  isLastMessage,
  isSameSender,
  isSameSenderMargin,
  isSameUser,
} from "../config/ChatLogics";
import { ChatState } from "../Context/ChatProvider";

import API from "../config/api";
import CryptoJS from "crypto-js";

const CHAT_SECRET_KEY = "chat-app-secret-key";

const encryptMessage = (text) => {
  try {
    if (!text || typeof text !== "string") {
      return text;
    }

    return CryptoJS.AES.encrypt(text, CHAT_SECRET_KEY).toString();
  } catch (error) {
    console.error("Edit encryption failed", error);
    return text;
  }
};

const ScrollableChat = ({
  messages,
  messageSearch,
  setMessages,
  socket,
  setReplyMessage,
}) => {
  const { user, selectedChat } = ChatState();

  const [selectedImage, setSelectedImage] = useState(null);
  const [hoveredMessage, setHoveredMessage] = useState(null);
  const [reactionPicker, setReactionPicker] = useState(null);
  const [reactionDetails, setReactionDetails] = useState(null);

  const [messageMenu, setMessageMenu] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editText, setEditText] = useState("");
  const [pinMenu, setPinMenu] = useState(null);
  const [seenByModal, setSeenByModal] = useState(null);
  const menuRef = useRef(null);
  const messageRefs = useRef({});

  const reactToMessage = async (messageId, emoji) => {
    try {
      const config = {
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${user.token}`,
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

      console.log("[REACTION API SUCCESS]", data);

      setMessages((prev) => {
        console.log("[REACTION LOCAL UPDATE]", data._id);

        return prev.map((msg) => {
          if (msg._id !== data._id) {
            return msg;
          }

          return {
            ...data,

            // preserve scheduled UI state
            isScheduled: msg.isScheduled,
            scheduledSent: msg.scheduledSent,
          };
        });
      });

      if (socket) {
        console.log("[REACTION EMIT]", data);
        socket.emit("message reaction", data);
      } else {
        console.log("[REACTION SOCKET MISSING]");
      }
    } catch (error) {
      console.error("Reaction failed");
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMessageMenu(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleEditMessage = async (messageId) => {
    try {
      const config = {
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      };

      const encryptedContent = encryptMessage(editText);

      const { data } = await API.put(
        `/api/message/edit/${messageId}`,
        {
          content: encryptedContent,
        },
        config,
      );

      // restore decrypted content immediately in UI
      data.content = editText;

      setMessages((prev) =>
        prev.map((msg) => (msg._id === data._id ? data : msg)),
      );

      if (socket) {
        socket.emit("message edited", data);
      }

      setEditingMessage(null);
      setEditText("");
    } catch (error) {
      console.error("Edit failed", error);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };

      const { data } = await API.delete(`/api/message/${messageId}`, config);

      setMessages((prev) =>
        prev.map((msg) => (msg._id === data._id ? data : msg)),
      );

      if (socket) {
        socket.emit("message deleted", data);
      }

      setMessageMenu(null);
    } catch (error) {
      console.error("Delete failed", error);
    }
  };

  const pinnedMessages = messages.filter(
    (msg) =>
      msg.pinned && !msg.deleted && (!msg.isScheduled || msg.scheduledSent),
  );

  const handlePinMessage = async (messageId, duration) => {
    try {
      const config = {
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      };

      const { data } = await API.put(
        `/api/message/pin/${messageId}`,
        {
          duration,
        },
        config,
      );

      setMessages((prev) =>
        prev.map((msg) => (msg._id === data._id ? data : msg)),
      );

      setPinMenu(null);
      setMessageMenu(null);

      if (socket) {
        socket.emit("message pinned", data);
      }
    } catch (error) {
      console.error("Pin message failed", error);
    }
  };

  const scrollToPinnedMessage = (messageId) => {
    const messageElement = messageRefs.current[messageId];

    if (messageElement) {
      messageElement.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      messageElement.classList.add("ring-4", "ring-yellow-300");

      setTimeout(() => {
        messageElement.classList.remove("ring-4", "ring-yellow-300");
      }, 2000);
    }
  };

  return (
    <>
      {/* WhatsApp-style pinned messages */}
      {pinnedMessages.length > 0 && (
        <div className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-2 shadow-sm flex flex-col gap-2">
          {pinnedMessages.map((msg) => (
            <button
              key={msg._id}
              onClick={() => scrollToPinnedMessage(msg._id)}
              className="flex items-center gap-2 text-left hover:bg-gray-100 rounded-lg px-3 py-2 transition-colors"
            >
              <span className="text-sm">📌</span>

              <div className="flex flex-col overflow-hidden">
                <span className="text-xs font-semibold text-gray-700">
                  {msg.sender._id === user._id ? "You" : msg.sender.name}
                </span>

                <span className="text-xs text-gray-500 truncate max-w-[260px]">
                  {msg.messageType === "voice" ||
                  msg.content.includes("/video/upload/")
                    ? "Voice Message"
                    : msg.messageType === "image"
                      ? "Image"
                      : msg.messageType === "file"
                        ? `📄 ${msg.fileName || "Document"}`
                        : msg.content}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
      <div className="px-4 py-3 flex flex-col">
        {messages &&
          messages
            .filter(
              (m) =>
                !m.isScheduled || m.scheduledSent || m.sender._id === user._id,
            )
            .map((m, i) => (
              <div
                key={`${m._id}-${m.seen}-${m.edited}-${m.deleted}`}
                ref={(el) => {
                  messageRefs.current[m._id] = el;
                }}
                onMouseEnter={() => setHoveredMessage(m._id)}
                onMouseLeave={() => setHoveredMessage(null)}
                className={`flex items-end gap-2 relative ${
                  m.sender._id === user._id ? "justify-end" : "justify-start"
                }`}
              >
                {m.sender._id !== user._id &&
                  (isSameSender(messages, m, i, user._id) ||
                    isLastMessage(messages, i, user._id)) && (
                    <img
                      src={
                        m.sender.pic ||
                        "https://ui-avatars.com/api/?name=" +
                          encodeURIComponent(m.sender.name)
                      }
                      alt={m.sender.name}
                      title={m.sender.name}
                      onError={(e) => {
                        e.target.src =
                          "https://ui-avatars.com/api/?name=" +
                          encodeURIComponent(m.sender.name);
                      }}
                      className="h-10 w-10 rounded-full object-cover shadow-md border border-white"
                    />
                  )}
                <div
                  className={`px-4 py-2 rounded-2xl max-w-[65%] break-words text-sm shadow-md transition-all duration-200 relative ${
                    m.sender._id === user._id
                      ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-br-none"
                      : "bg-white text-gray-800 rounded-bl-none border border-gray-200"
                  } ${isSameUser(messages, m, i, user._id) ? "mt-1" : "mt-3"}`}
                  style={{
                    marginLeft: isSameSenderMargin(messages, m, i, user._id),
                  }}
                >
                  {/* Message menu */}
                  {hoveredMessage === m._id && !m.deleted && (
                    <div
                      ref={menuRef}
                      className={`absolute top-2 ${
                        m.sender._id === user._id ? "-left-12" : "-right-12"
                      }`}
                    >
                      <button
                        onClick={() =>
                          setMessageMenu(messageMenu === m._id ? null : m._id)
                        }
                        className="bg-white border border-gray-200 rounded-full shadow-md px-2 py-1 text-xs hover:bg-gray-100"
                      >
                        ⋮
                      </button>

                      {messageMenu === m._id && (
                        <div className="absolute mt-2 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-40 min-w-[160px]">
                          {selectedChat?.isGroupChat &&
                            m.sender._id === user._id && (
                              <button
                                onClick={() => {
                                  setSeenByModal(m);
                                  setMessageMenu(null);
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm"
                              >
                                Message Info
                              </button>
                            )}
                          {m.sender._id === user._id && (
                            <button
                              onClick={() => {
                                setEditingMessage(m._id);
                                setEditText(m.content);
                                setMessageMenu(null);
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                            >
                              Edit
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setReplyMessage(m);
                              setMessageMenu(null);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm"
                          >
                            Reply
                          </button>
                          <button
                            onClick={() =>
                              setPinMenu(pinMenu === m._id ? null : m._id)
                            }
                            className="w-full text-left px-4 py-2 hover:bg-yellow-50 text-sm"
                          >
                            {m.pinned ? "Unpin Message" : "Pin Message"}
                          </button>

                          {pinMenu === m._id && (
                            <div className="border-t border-gray-200 bg-gray-50">
                              {m.pinned ? (
                                <button
                                  onClick={() =>
                                    handlePinMessage(m._id, "1day")
                                  }
                                  className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                                >
                                  Remove Pin
                                </button>
                              ) : (
                                <>
                                  <button
                                    onClick={() =>
                                      handlePinMessage(m._id, "1day")
                                    }
                                    className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                                  >
                                    Pin for 1 Day
                                  </button>

                                  <button
                                    onClick={() =>
                                      handlePinMessage(m._id, "1week")
                                    }
                                    className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                                  >
                                    Pin for 1 Week
                                  </button>

                                  <button
                                    onClick={() =>
                                      handlePinMessage(m._id, "1month")
                                    }
                                    className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                                  >
                                    Pin for 1 Month
                                  </button>
                                </>
                              )}
                            </div>
                          )}

                          {m.sender._id === user._id && (
                            <button
                              onClick={() => handleDeleteMessage(m._id)}
                              className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-500 text-sm"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Reply preview */}
                  {m.replyTo && (
                    <button
                      onClick={() => scrollToPinnedMessage(m.replyTo._id)}
                      className={`mb-2 px-3 py-2 rounded-lg border-l-4 text-xs overflow-hidden w-full text-left transition-all hover:opacity-80 ${
                        m.sender._id === user._id
                          ? "bg-white/20 border-white/70"
                          : "bg-gray-100 border-blue-400"
                      }`}
                    >
                      <div className="font-semibold mb-1">
                        {m.replyTo.sender?._id === user._id
                          ? "You"
                          : m.replyTo.sender?.name || "Unknown"}
                      </div>

                      <div className="truncate opacity-90">
                        {m.replyTo.messageType === "voice" ||
                        m.replyTo.content?.includes("/video/upload/")
                          ? "🎙️ Voice Message"
                          : m.replyTo.messageType === "image" ||
                              m.replyTo.content?.includes("/image/upload/")
                            ? "📷 Image"
                            : m.replyTo.messageType === "file"
                              ? `📄 ${m.replyTo.fileName || "Document"}`
                              : m.replyTo.content}
                      </div>
                    </button>
                  )}

                  {editingMessage === m._id ? (
                    <div className="flex flex-col gap-2">
                      <input
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-gray-300 text-black text-sm"
                      />

                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingMessage(null);
                            setEditText("");
                          }}
                          className="text-xs px-3 py-1 rounded bg-gray-200 text-black"
                        >
                          Cancel
                        </button>

                        <button
                          onClick={() => handleEditMessage(m._id)}
                          className="text-xs px-3 py-1 rounded bg-blue-500 text-white"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : m.messageType === "file" ? (
                    <a
                      href={m.content}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      className="flex items-center gap-3 bg-black/10 hover:bg-black/20 transition-colors rounded-xl px-4 py-3 min-w-[240px] text-left"
                    >
                      <div className="text-3xl">📄</div>

                      <div className="flex flex-col overflow-hidden">
                        <span className="font-medium truncate max-w-[180px]">
                          {m.fileName || "Document"}
                        </span>

                        <span className="text-xs opacity-70">
                          {m.fileSize
                            ? `${(m.fileSize / 1024 / 1024).toFixed(2)} MB`
                            : "File"}
                        </span>
                      </div>

                      <div className="ml-auto text-xs font-medium opacity-70">
                        Open
                      </div>
                    </a>
                  ) : m.content.includes("/video/upload/") ? (
                    <div className="flex flex-col gap-2 min-w-[220px]">
                      <div className="flex items-center gap-2 text-xs opacity-80 font-medium">
                        <span>🎙️</span>
                        <span>Voice Message</span>
                      </div>

                      <audio controls className="w-full max-w-[240px] h-10">
                        <source src={m.content} type="audio/webm" />
                        Your browser does not support audio.
                      </audio>
                    </div>
                  ) : m.content.startsWith("http") ? (
                    <img
                      src={m.content}
                      alt="sent"
                      onClick={() => setSelectedImage(m.content)}
                      className="max-w-[200px] rounded-lg mb-1 cursor-pointer hover:opacity-90"
                    />
                  ) : (
                    <p
                      className={`leading-relaxed tracking-wide ${
                        m.deleted ? "italic opacity-70" : ""
                      }`}
                    >
                      {messageSearch
                        ? m.content
                            .split(new RegExp(`(${messageSearch})`, "gi"))
                            .map((part, i) =>
                              part.toLowerCase() ===
                              messageSearch.toLowerCase() ? (
                                <span
                                  key={i}
                                  className="bg-yellow-300 text-black rounded px-1"
                                >
                                  {part}
                                </span>
                              ) : (
                                part
                              ),
                            )
                        : m.content}
                    </p>
                  )}
                  {m.isScheduled && !m.scheduledSent && (
                    <div
                      className={`mb-2 inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold ${
                        m.sender._id === user._id
                          ? "bg-yellow-400/20 text-yellow-100"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      <span>⏰</span>
                      <span>
                        Scheduled for{" "}
                        {new Date(m.scheduledFor).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <span className="text-[10px] opacity-70 font-medium">
                      {new Date(m.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {m.edited && !m.deleted && " • edited"}
                    </span>
                    {m.sender._id === user._id &&
                      (() => {
                        const isGroupChat = selectedChat?.isGroupChat;

                        // group chats -> double tick only when EVERYONE else has seen
                        const showDoubleTick = isGroupChat
                          ? Boolean(m.allSeen)
                          : Boolean(m.seen);

                        return (
                          <span
                            key={`${m._id}-${m.seen}-${m.allSeen}`}
                            className={`text-[10px] font-semibold transition-all duration-150 ${
                              showDoubleTick ? "text-blue-200" : "text-gray-300"
                            }`}
                          >
                            {showDoubleTick ? "✓✓" : "✓"}
                          </span>
                        );
                      })()}
                  </div>

                  {/* Reactions */}
                  {m.reactions && m.reactions.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {["👍", "❤️", "😂"].map((emoji) => null)}
                      {[...new Set(m.reactions.map((r) => r.emoji))].map(
                        (emoji) => (
                          <button
                            key={emoji}
                            onClick={() =>
                              setReactionDetails(
                                reactionDetails === m._id + emoji
                                  ? null
                                  : m._id + emoji,
                              )
                            }
                            className="px-2 py-0.5 bg-gray-200 hover:bg-gray-300 rounded-full text-xs flex items-center gap-1 transition-colors"
                          >
                            <span>{emoji}</span>

                            {m.reactions.filter((r) => r.emoji === emoji)
                              .length > 1 && (
                              <span>
                                {
                                  m.reactions.filter((r) => r.emoji === emoji)
                                    .length
                                }
                              </span>
                            )}
                          </button>
                        ),
                      )}
                    </div>
                  )}

                  {/* Reaction details popup */}
                  {m.reactions &&
                    [...new Set(m.reactions.map((r) => r.emoji))].map(
                      (emoji) =>
                        reactionDetails === m._id + emoji && (
                          <div
                            key={emoji + "details"}
                            className="absolute z-30 mt-2 bg-white border border-gray-200 shadow-xl rounded-xl p-3 min-w-[220px] text-gray-800"
                          >
                            <div className="font-semibold text-sm mb-2 border-b pb-1">
                              All Reactions
                            </div>

                            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                              {[
                                ...new Map(
                                  m.reactions.map((r) => [
                                    String(
                                      typeof r.user === "object"
                                        ? r.user?._id
                                        : r.user,
                                    ),
                                    r,
                                  ]),
                                ).values(),
                              ]
                                .sort((a, b) => {
                                  const aIsCurrentUser =
                                    String(
                                      typeof a.user === "object"
                                        ? a.user?._id
                                        : a.user,
                                    ) === String(user._id);

                                  const bIsCurrentUser =
                                    String(
                                      typeof b.user === "object"
                                        ? b.user?._id
                                        : b.user,
                                    ) === String(user._id);

                                  if (aIsCurrentUser && !bIsCurrentUser)
                                    return -1;
                                  if (!aIsCurrentUser && bIsCurrentUser)
                                    return 1;

                                  return 0;
                                })
                                .map((reaction) => {
                                  console.log("[REACTION POPUP DEBUG]", {
                                    messageId: m._id,
                                    emoji,
                                    rawReactions: m.reactions,
                                    reaction,
                                    currentUserId: user._id,
                                    reactionUserType: typeof reaction.user,
                                    reactionUserObject:
                                      typeof reaction.user === "object"
                                        ? reaction.user
                                        : null,
                                    comparisonResult:
                                      String(
                                        typeof reaction.user === "object"
                                          ? reaction.user?._id
                                          : reaction.user,
                                      ) === String(user._id),
                                  });

                                  return (
                                    <div
                                      key={
                                        (typeof reaction.user === "object"
                                          ? reaction.user?._id
                                          : reaction.user) || Math.random()
                                      }
                                      className="flex items-center justify-between text-sm"
                                    >
                                      <div className="flex items-center gap-2">
                                        <span>{reaction.emoji}</span>

                                        <span>
                                          {String(
                                            typeof reaction.user === "object"
                                              ? reaction.user?._id
                                              : reaction.user,
                                          ) === String(user._id)
                                            ? "You"
                                            : typeof reaction.user === "object"
                                              ? reaction.user?.name
                                              : "Unknown User"}
                                        </span>
                                      </div>

                                      {String(
                                        typeof reaction.user === "object"
                                          ? reaction.user?._id
                                          : reaction.user,
                                      ) === String(user._id) && (
                                        <button
                                          onClick={() => {
                                            reactToMessage(
                                              m._id,
                                              reaction.emoji,
                                            );
                                            setReactionDetails(null);
                                          }}
                                          className="text-red-500 hover:text-red-700 text-xs font-medium"
                                        >
                                          Remove
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        ),
                    )}

                  {/* Reaction trigger button */}
                  {hoveredMessage === m._id && (
                    <button
                      onClick={() =>
                        setReactionPicker(
                          reactionPicker === m._id ? null : m._id,
                        )
                      }
                      className={`absolute top-1/2 -translate-y-1/2 bg-white border border-gray-200 rounded-full shadow-md px-2 py-1 text-xs hover:bg-gray-100 transition-all ${
                        m.sender._id === user._id ? "-left-10" : "-right-10"
                      }`}
                    >
                      😊
                    </button>
                  )}

                  {/* Emoji picker */}
                  {reactionPicker === m._id && (
                    <div
                      className={`absolute top-1/2 -translate-y-1/2 flex gap-2 px-3 py-1 bg-white border border-gray-200 rounded-full shadow-lg text-sm z-20 ${
                        m.sender._id === user._id ? "-left-44" : "-right-44"
                      }`}
                    >
                      {["👍", "❤️", "😂"].map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => {
                            reactToMessage(m._id, emoji);
                            setReactionPicker(null);
                          }}
                          className="hover:scale-125 transition-transform"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
      </div>
      {seenByModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-[90%] max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">
                  Message Info
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Seen by {seenByModal.seenBy?.length || 0} users
                </p>
              </div>

              <button
                onClick={() => setSeenByModal(null)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ×
              </button>
            </div>

            <div className="max-h-[400px] overflow-y-auto px-4 py-3 flex flex-col gap-3">
              {seenByModal.seenBy &&
              seenByModal.seenBy.filter((seenUser) => {
                const seenUserId =
                  typeof seenUser === "object" ? seenUser?._id : seenUser;

                // do not show sender in seen list
                return String(seenUserId) !== String(seenByModal.sender?._id);
              }).length > 0 ? (
                seenByModal.seenBy
                  .filter((seenUser) => {
                    const seenUserId =
                      typeof seenUser === "object" ? seenUser?._id : seenUser;

                    return (
                      String(seenUserId) !== String(seenByModal.sender?._id)
                    );
                  })
                  .map((seenUser) => {
                    const seenUserId =
                      typeof seenUser === "object" ? seenUser?._id : seenUser;

                    const seenUserName =
                      typeof seenUser === "object" && seenUser?.name
                        ? seenUser.name
                        : selectedChat?.users?.find(
                            (u) => String(u._id) === String(seenUserId),
                          )?.name || "Unknown User";

                    const seenUserPic =
                      typeof seenUser === "object" && seenUser?.pic
                        ? seenUser.pic
                        : selectedChat?.users?.find(
                            (u) => String(u._id) === String(seenUserId),
                          )?.pic || null;

                    return (
                      <div
                        key={seenUserId}
                        className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50"
                      >
                        <img
                          src={
                            seenUserPic ||
                            "https://ui-avatars.com/api/?name=" +
                              encodeURIComponent(seenUserName)
                          }
                          alt={seenUserName}
                          className="w-10 h-10 rounded-full object-cover"
                        />

                        <div className="flex-1">
                          <div className="font-medium text-gray-800">
                            {seenUserId === user._id ? "You" : seenUserName}
                          </div>

                          <div className="text-xs text-green-600 font-medium">
                            Seen
                          </div>
                        </div>

                        <div className="text-green-500 text-lg">✓✓</div>
                      </div>
                    );
                  })
              ) : (
                <div className="text-center text-gray-500 py-10">
                  Nobody has seen this message yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50"
          onClick={() => setSelectedImage(null)}
        >
          <img
            src={selectedImage}
            alt="preview"
            className="max-h-[90%] max-w-[90%] rounded-lg shadow-lg"
          />
        </div>
      )}
    </>
  );
};

export default ScrollableChat;
