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
        <div className="sticky top-0 z-30 mb-3 flex flex-col gap-2 rounded-2xl border border-slate-200/70 dark:border-white/5 bg-white/80 dark:bg-[#151821]/80 px-3 py-3 backdrop-blur-xl shadow-sm">
          {pinnedMessages.map((msg) => (
            <button
              key={msg._id}
              onClick={() => scrollToPinnedMessage(msg._id)}
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-left transition-all hover:bg-slate-100 dark:hover:bg-white/5"
            >
              <span className="text-sm">📌</span>
              <div className="flex flex-col overflow-hidden">
                <span className="text-[11px] font-semibold tracking-wide text-slate-700 dark:text-slate-200">
                  {msg.sender._id === user._id ? "You" : msg.sender.name}
                </span>
                <span className="max-w-[240px] truncate text-[11px] text-slate-500 dark:text-slate-400">
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
      <div className="flex flex-col px-1 py-1">
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
                onContextMenu={(e) => {
                  e.preventDefault();
                  setMessageMenu(messageMenu === m._id ? null : m._id);
                }}
                onMouseEnter={() => setHoveredMessage(m._id)}
                onMouseLeave={() => setHoveredMessage(null)}
                className={`group relative flex items-end gap-2 mb-[5px] ${
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
                      className="h-9 w-9 rounded-2xl object-cover border border-white/40 dark:border-white/10 shadow-sm"
                    />
                  )}
                <div
                  className={`relative max-w-[78%] break-words rounded-[22px] px-4 py-2.5 text-sm shadow-sm transition-all duration-200 ${
                    m.reactions && m.reactions.length > 0 ? "mb-8" : "mb-1"
                  } ${
                    m.sender._id === user._id
                      ? "bg-[#f6e7cf]/45 dark:bg-[#2c241d]/30 text-slate-800 dark:text-[#fcefd8] rounded-br-md border border-[#f3dcc0]/50 dark:border-[#fcefd8]/10 shadow-[0_8px_32px_rgba(201,168,120,0.10)] backdrop-blur-2xl"
                      : "bg-white dark:bg-[#171b24] text-slate-800 dark:text-slate-100 rounded-bl-md border border-slate-200/70 dark:border-white/5"
                  } ${isSameUser(messages, m, i, user._id) ? "mt-1" : "mt-4"}`}
                  style={{
                    marginLeft: isSameSenderMargin(messages, m, i, user._id),
                  }}
                >
                  {/* Context menu */}
                  {messageMenu === m._id && !m.deleted && (
                    <div
                      ref={menuRef}
                      className={`absolute z-50 min-w-[200px] overflow-hidden rounded-2xl border border-slate-200/70 dark:border-white/5 bg-white/95 dark:bg-[#171b24]/95 shadow-2xl backdrop-blur-2xl ${
                        m.sender._id === user._id
                          ? "right-full top-2 mr-3"
                          : "left-full top-2 ml-3"
                      }`}
                    >
                      {selectedChat?.isGroupChat &&
                        m.sender._id === user._id && (
                          <button
                            onClick={() => {
                              setSeenByModal(m);
                              setMessageMenu(null);
                            }}
                            className="w-full px-4 py-3 text-left text-sm transition-all hover:bg-slate-100 dark:hover:bg-white/5"
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
                          className="w-full px-4 py-3 text-left text-sm transition-all hover:bg-slate-100 dark:hover:bg-white/5"
                        >
                          Edit Message
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setReplyMessage(m);
                          setMessageMenu(null);
                        }}
                        className="w-full px-4 py-3 text-left text-sm text-orange-500 transition-all hover:bg-orange-50 dark:hover:bg-orange-500/10"
                      >
                        Reply
                      </button>

                      <button
                        onClick={() =>
                          setPinMenu(pinMenu === m._id ? null : m._id)
                        }
                        className="w-full px-4 py-3 text-left text-sm text-amber-500 transition-all hover:bg-amber-50 dark:hover:bg-amber-500/10"
                      >
                        {m.pinned ? "Unpin Message" : "Pin Message"}
                      </button>

                      {pinMenu === m._id && (
                        <div className="border-t border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#10131a]">
                          {m.pinned ? (
                            <button
                              onClick={() => handlePinMessage(m._id, "1day")}
                              className="w-full px-4 py-3 text-left text-sm transition-all hover:bg-slate-100 dark:hover:bg-white/5"
                            >
                              Remove Pin
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => handlePinMessage(m._id, "1day")}
                                className="w-full px-4 py-3 text-left text-sm transition-all hover:bg-slate-100 dark:hover:bg-white/5"
                              >
                                Pin for 1 Day
                              </button>

                              <button
                                onClick={() => handlePinMessage(m._id, "1week")}
                                className="w-full px-4 py-3 text-left text-sm transition-all hover:bg-slate-100 dark:hover:bg-white/5"
                              >
                                Pin for 1 Week
                              </button>

                              <button
                                onClick={() =>
                                  handlePinMessage(m._id, "1month")
                                }
                                className="w-full px-4 py-3 text-left text-sm transition-all hover:bg-slate-100 dark:hover:bg-white/5"
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
                          className="w-full px-4 py-3 text-left text-sm text-rose-500 transition-all hover:bg-rose-50 dark:hover:bg-rose-500/10"
                        >
                          Delete Message
                        </button>
                      )}
                    </div>
                  )}

                  {/* Reply preview */}
                  {m.replyTo && (
                    <button
                      onClick={() => scrollToPinnedMessage(m.replyTo._id)}
                      className={`mb-2 w-full overflow-hidden rounded-xl border-l-[3px] px-3 py-2 text-left text-[11px] transition-all hover:opacity-90 ${
                        m.sender._id === user._id
                          ? "bg-[#f6e7cf]/25 dark:bg-[#3a2d22]/20 border-[#f3dcc0]/45 dark:border-[#fcefd8]/10 backdrop-blur-xl"
                          : "bg-slate-100 dark:bg-white/5 border-orange-400"
                      }`}
                    >
                      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide">
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
                        className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1e27] px-3 py-2 text-sm text-slate-700 dark:text-slate-100 outline-none"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingMessage(null);
                            setEditText("");
                          }}
                          className="rounded-lg bg-slate-200 dark:bg-white/10 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleEditMessage(m._id)}
                          className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs text-white"
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
                      className="flex min-w-[240px] items-center gap-3 rounded-2xl border border-[#f3dcc0]/50 dark:border-[#fcefd8]/10 bg-[#f6e7cf]/28 dark:bg-[#3a2d22]/20 px-4 py-3 text-left shadow-[0_4px_20px_rgba(201,168,120,0.08)] backdrop-blur-2xl transition-all hover:bg-[#f6e7cf]/40 dark:hover:bg-[#3a2d22]/30"
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
                      className="mb-1 max-w-[220px] rounded-2xl border border-white/10 cursor-pointer transition-all hover:opacity-95"
                    />
                  ) : (
                    <div className="flex items-end gap-2">
                      <p
                        className={`leading-6 tracking-[0.01em] ${
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

                      <div className="flex items-center gap-1 self-end pb-[2px] whitespace-nowrap">
                        <span className="text-[10px] font-medium opacity-70">
                          {new Date(m.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {m.edited && !m.deleted && " • edited"}
                        </span>

                        {m.sender._id === user._id &&
                          (() => {
                            const isGroupChat = selectedChat?.isGroupChat;

                            const showDoubleTick = isGroupChat
                              ? Boolean(m.allSeen)
                              : Boolean(m.seen);

                            return (
                              <span
                                key={`${m._id}-${m.seen}-${m.allSeen}`}
                                className={`text-[10px] font-semibold transition-all duration-150 ${
                                  showDoubleTick
                                    ? "text-[#b69263]/75 dark:text-[#f4dec2]/70"
                                    : "text-slate-400/70"
                                }`}
                              >
                                {showDoubleTick ? "✓✓" : "✓"}
                              </span>
                            );
                          })()}
                      </div>
                    </div>
                  )}
                  {m.isScheduled && !m.scheduledSent && (
                    <div
                      className={`mb-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                        m.sender._id === user._id
                          ? "bg-orange-200/40 dark:bg-orange-300/10 text-orange-700 dark:text-orange-200"
                          : "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300"
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
                  {(m.messageType === "file" ||
                    m.content.includes("/video/upload/") ||
                    m.content.startsWith("http")) && (
                    <div className="mt-1.5 flex items-center justify-end gap-1">
                      <span className="text-[10px] font-medium opacity-70">
                        {new Date(m.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {m.edited && !m.deleted && " • edited"}
                      </span>

                      {m.sender._id === user._id &&
                        (() => {
                          const isGroupChat = selectedChat?.isGroupChat;

                          const showDoubleTick = isGroupChat
                            ? Boolean(m.allSeen)
                            : Boolean(m.seen);

                          return (
                            <span
                              key={`${m._id}-${m.seen}-${m.allSeen}`}
                              className={`text-[10px] font-semibold transition-all duration-150 ${
                                showDoubleTick
                                  ? "text-[#b69263]/75 dark:text-[#f4dec2]/70"
                                  : "text-slate-400/70"
                              }`}
                            >
                              {showDoubleTick ? "✓✓" : "✓"}
                            </span>
                          );
                        })()}
                    </div>
                  )}

                  {/* Reactions */}
                  {m.reactions && m.reactions.length > 0 && (
                    <div
                      className={`absolute -bottom-6 flex items-center rounded-full border border-white/70 dark:border-white/10 bg-white/95 dark:bg-[#1b1f29]/95 px-2 py-[3px] shadow-lg backdrop-blur-xl ${
                        m.sender._id === user._id ? "right-3" : "left-3"
                      }`}
                    >
                      {[...new Set(m.reactions.map((r) => r.emoji))].map(
                        (emoji) => {
                          const count = m.reactions.filter(
                            (r) => r.emoji === emoji,
                          ).length;

                          return (
                            <button
                              key={emoji}
                              onClick={() =>
                                setReactionDetails(
                                  reactionDetails === m._id + emoji
                                    ? null
                                    : m._id + emoji,
                                )
                              }
                              className="flex items-center gap-1 px-1 text-[15px] transition-all hover:scale-110"
                            >
                              <span>{emoji}</span>

                              {count > 1 && (
                                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-300">
                                  {count}
                                </span>
                              )}
                            </button>
                          );
                        },
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
                            className="absolute z-30 mt-2 min-w-[220px] rounded-2xl border border-slate-200/70 dark:border-white/5 bg-white/95 dark:bg-[#171b24]/95 p-3 text-slate-800 dark:text-slate-100 shadow-xl backdrop-blur-xl"
                          >
                            <div className="mb-2 border-b border-slate-200 dark:border-white/5 pb-2 text-sm font-semibold">
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
                                          className="text-xs font-medium text-rose-500 transition-all hover:opacity-80"
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
                      className={`absolute top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/50 dark:border-white/10 bg-white/85 dark:bg-[#171b24]/92 text-sm shadow-lg backdrop-blur-xl transition-all duration-200 hover:scale-105 ${
                        m.sender._id === user._id ? "-left-11" : "-right-11"
                      }`}
                    >
                      😊
                    </button>
                  )}

                  {/* Emoji picker */}
                  {reactionPicker === m._id && (
                    <div
                      className={`absolute top-1/2 z-30 flex -translate-y-1/2 items-center gap-1 rounded-full border border-white/50 dark:border-white/10 bg-white/92 dark:bg-[#171b24]/96 px-2 py-1 shadow-2xl backdrop-blur-2xl transition-all duration-200 ease-out animate-in fade-in zoom-in-95 ${
                        m.sender._id === user._id
                          ? "right-[calc(100%+52px)]"
                          : "left-[calc(100%+52px)]"
                      }`}
                    >
                      {["👍", "❤️", "😂", "😮", "😢", "🙏", "👏"].map(
                        (emoji) => (
                          <button
                            key={emoji}
                            onClick={() => {
                              reactToMessage(m._id, emoji);
                              setReactionPicker(null);
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded-full text-[18px] transition-all duration-150 hover:scale-125 hover:bg-black/5 dark:hover:bg-white/5"
                          >
                            {emoji}
                          </button>
                        ),
                      )}

                      <button className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-500/75 text-[18px] font-light leading-none text-white transition-all hover:scale-105">
                        +
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
      </div>
      {seenByModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-md overflow-hidden rounded-[28px] border border-slate-200/70 dark:border-white/5 bg-white dark:bg-[#171b24] shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-800 dark:text-white">
                  Message Info
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Seen by {seenByModal.seenBy?.length || 0} users
                </p>
              </div>
              <button
                onClick={() => setSeenByModal(null)}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-xl text-slate-500 transition-all hover:bg-slate-100 dark:hover:bg-white/5"
              >
                ×
              </button>
            </div>
            <div className="flex max-h-[400px] flex-col gap-3 overflow-y-auto px-4 py-4">
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
                        className="flex items-center gap-3 rounded-2xl border border-slate-200/70 dark:border-white/5 px-3 py-3 transition-all hover:bg-slate-50 dark:hover:bg-white/5"
                      >
                        <img
                          src={
                            seenUserPic ||
                            "https://ui-avatars.com/api/?name=" +
                              encodeURIComponent(seenUserName)
                          }
                          alt={seenUserName}
                          className="h-10 w-10 rounded-2xl object-cover"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-slate-800 dark:text-slate-100">
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
                <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                  Nobody has seen this message yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
          onClick={() => setSelectedImage(null)}
        >
          <img
            src={selectedImage}
            alt="preview"
            className="max-h-[90%] max-w-[92%] rounded-[24px] shadow-2xl"
          />
        </div>
      )}
    </>
  );
};

export default ScrollableChat;
