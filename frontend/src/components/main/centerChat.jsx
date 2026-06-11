import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  MoreHorizontal,
  Users,
  Smile,
  Send,
  Plus,
  Image,
  Mic,
  Paperclip,
  Clock3,
  X,
  Pin,
  ChevronUp,
  ChevronDown,
  Vote,
} from "lucide-react";

import MessageItem from "./messageItem";
import { ChatState } from "../../Context/ChatProvider";
import { getSender } from "../../config/ChatLogics";

export default function CenterChat({
  messages,
  hoveredMessage,
  setHoveredMessage,
  handleContextMenu,
  pinnedMessageRef,
  highlightPinnedMessage,
  setHighlightPinnedMessage,
  showChatMenu,
  setShowChatMenu,
  showMessageSearch,
  setShowMessageSearch,
  messageSearch,
  setMessageSearch,
  showAttachmentMenu,
  setShowAttachmentMenu,
  showScheduleBox,
  setShowScheduleBox,
  scheduledDate,
  setScheduledDate,
  scheduledTime,
  setScheduledTime,
  showRightPanel,
  setShowRightPanel,
  newMessage,
  typingHandler,
  sendMessage,
  unpinMessage,
  uploadImage,
  uploadFile,
  startRecording,
  stopRecording,
  isRecording,
  cancelRecording,
  selectedChat,
  typingUser,
  editingMessage,
  setEditingMessage,
  onlineUsers,
  lastSeenMap,
  reactToMessage,
  loadMoreMessages,
  replyingTo,
  setReplyingTo,
  scrollToPinnedMessage,
  pollModalOpen,
  setPollModalOpen,
  pollQuestion,
  setPollQuestion,
  pollOptions,
  setPollOptions,
  allowMultiplePollVotes,
  setAllowMultiplePollVotes,
  createPoll,
  votePoll,
  hasMore,
  loadingMore,
  sendScheduledMessage,
}) {
  const { user, socket } = ChatState();
  const isDark = localStorage.getItem("darkMode") === "true";

  const scrollContainerRef = useRef(null);

  const isLoadingOlderRef = useRef(false);

  const bottomMessageRef = useRef(null);

  const previousMessageCountRef = useRef(0);

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [searchMatches, setSearchMatches] = useState([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [currentPinnedIndex, setCurrentPinnedIndex] = useState(0);

  const otherUser = useMemo(() => {
    if (!selectedChat || selectedChat.isGroupChat) {
      return null;
    }
    return selectedChat?.users?.find((u) => u._id !== user?._id);
  }, [selectedChat, user]);

  const shouldHidePresence =
    user?.privacy?.showLastSeen === false ||
    otherUser?.privacy?.showLastSeen === false;

  const isOnline = shouldHidePresence
    ? false
    : onlineUsers?.includes(otherUser?._id);

  const lastSeen = shouldHidePresence ? null : lastSeenMap?.[otherUser?._id];

  const pinnedMessages = Array.isArray(messages)
    ? messages.filter((m) => m?.pinned)
    : [];

  const activePinnedMessage = pinnedMessages[currentPinnedIndex] || null;
  const mentionCandidates = selectedChat?.isGroupChat
    ? selectedChat.users.filter(
        (u) =>
          u._id !== user._id &&
          u.name.toLowerCase().includes(mentionQuery.toLowerCase()),
      )
    : [];

  useEffect(() => {
    if (!messageSearch.trim()) {
      setSearchMatches([]);
      setCurrentSearchIndex(0);
      return;
    }

    const uniqueMatches = [
      ...new Map(messages.map((msg) => [msg._id, msg])).values(),
    ];

    const matches = uniqueMatches
      .filter((msg) => {
        const searchableContent =
          msg.messageType === "image"
            ? "image"
            : msg.messageType === "voice"
              ? "voice"
              : msg.messageType === "file"
                ? msg.fileName || "file"
                : msg.content || "";

        return searchableContent
          .toLowerCase()
          .includes(messageSearch.toLowerCase());
      })
      .map((msg) => msg._id);

    setSearchMatches(matches);
    setCurrentSearchIndex(0);
  }, [messageSearch, messages]);

  useEffect(() => {
    if (currentPinnedIndex >= pinnedMessages.length) {
      setCurrentPinnedIndex(0);
    }
  }, [pinnedMessages.length, currentPinnedIndex]);

  useEffect(() => {
    if (!bottomMessageRef.current) return;

    const previousCount = previousMessageCountRef.current;
    const currentCount = messages.length;

    // initial load
    if (previousCount === 0 && currentCount > 0) {
      bottomMessageRef.current.scrollIntoView({
        behavior: "auto",
        block: "end",
      });
    }

    // skip pagination loads
    else if (isLoadingOlderRef.current) {
      isLoadingOlderRef.current = false;
    }

    // actual new message
    else if (currentCount > previousCount) {
      bottomMessageRef.current.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }

    previousMessageCountRef.current = currentCount;
  }, [messages.length]);

  useEffect(() => {
    previousMessageCountRef.current = 0;
  }, [selectedChat?._id]);

  useEffect(() => {
    if (!socket || !selectedChat || !Array.isArray(messages)) return;

    const unseenMessages = messages.filter(
      (msg) => (msg.sender?._id || msg.sender) !== user?._id && !msg.seen,
    );

    if (user?.privacy?.readReceipts === false) return;

    unseenMessages.forEach((msg) => {
      socket.emit("message seen", {
        messageId: msg._id,
        chatId: selectedChat._id,
        userId: user._id,
      });
    });
  }, [messages, selectedChat, socket, user]);

  useEffect(() => {
    const container = scrollContainerRef.current;

    if (!container) return;

    const handleScroll = () => {
      if (container.scrollTop === 0 && hasMore && !loadingMore) {
        isLoadingOlderRef.current = true;

        loadMoreMessages();
      }
    };

    container.addEventListener("scroll", handleScroll);

    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [hasMore, loadingMore, loadMoreMessages]);

  const formatLastSeen = (timestamp) => {
    if (!timestamp) return "Offline";

    return `Last seen ${new Date(timestamp).toLocaleString([], {
      hour: "2-digit",
      minute: "2-digit",
      day: "numeric",
      month: "short",
    })}`;
  };

  const jumpToSearchMatch = (direction) => {
    if (!searchMatches.length) return;

    let nextIndex = currentSearchIndex;

    if (direction === "next") {
      nextIndex =
        currentSearchIndex === searchMatches.length - 1
          ? 0
          : currentSearchIndex + 1;
    }

    if (direction === "prev") {
      nextIndex =
        currentSearchIndex === 0
          ? searchMatches.length - 1
          : currentSearchIndex - 1;
    }

    setCurrentSearchIndex(nextIndex);

    const el = document.getElementById(`message-${searchMatches[nextIndex]}`);

    if (!el) return;

    el.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });

    el.classList.add("ring-2", "ring-[#2453c4]");

    setTimeout(() => {
      el.classList.remove("ring-2", "ring-[#2453c4]");
    }, 2000);
  };

  const handleMessageInput = (e) => {
    const value = e.target.value;

    typingHandler(e);

    if (!selectedChat?.isGroupChat) {
      setShowMentionSuggestions(false);
      setMentionQuery("");
      return;
    }

    const match = value.match(/@(\w*)$/);

    if (match) {
      setMentionQuery(match[1]);
      setShowMentionSuggestions(true);
    } else {
      setMentionQuery("");
      setShowMentionSuggestions(false);
    }
  };

  return (
    <div
      className={`flex-1 min-w-0 h-full px-7 py-6 flex flex-col overflow-hidden transition-colors rounded-[28px] ${
        isDark ? "" : "bg-transparent"
      }`}
      style={{
        boxShadow: isDark ? "" : "0 20px 50px rgba(48,64,110,0.06)",
      }}
    >
      {selectedChat && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowRightPanel((prev) => !prev)}
            className={`flex items-center gap-4 rounded-[18px] px-2 py-1 transition-colors ${
              isDark ? "hover:bg-[#1e293b]" : "hover:bg-white/50"
            }`}
          >
            <img
              src={
                selectedChat?.isGroupChat
                  ? "https://ui-avatars.com/api/?name=" +
                    encodeURIComponent(selectedChat.chatName)
                  : otherUser?.pic
              }
              alt={
                selectedChat?.isGroupChat
                  ? selectedChat.chatName
                  : otherUser?.name
              }
              className="w-12 h-12 rounded-full object-cover"
            />

            <div className="text-left">
              <h2
                className={`text-[17px] font-semibold ${
                  isDark ? "text-white" : "text-[#2d3142]"
                }`}
              >
                {selectedChat?.isGroupChat
                  ? selectedChat.chatName
                  : selectedChat?.users
                    ? getSender(user, selectedChat.users)
                    : ""}
              </h2>

              <p
                className={`text-[12px] ${
                  selectedChat?.isGroupChat
                    ? isDark
                      ? "text-[#9ca3af]"
                      : "text-[#7b8197]"
                    : "text-[#7ebf82]"
                }`}
              >
                {selectedChat?.isGroupChat
                  ? `${selectedChat.users?.length || 0} members`
                  : shouldHidePresence
                    ? ""
                    : isOnline
                      ? "Online"
                      : formatLastSeen(lastSeen)}
              </p>
            </div>
          </button>

          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowChatMenu((prev) => !prev);
              }}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                isDark ? "hover:bg-[#1e293b]" : "hover:bg-white/60"
              }`}
            >
              <MoreHorizontal
                className={isDark ? "text-[#9ca3af]" : "text-[#7b8197]"}
              />
            </button>

            {showChatMenu && (
              <div
                className={`absolute top-12 right-0 rounded-[20px] p-2 min-w-[180px] z-50 ${
                  isDark
                    ? "bg-black/40 backdrop-blur-2xl border border-white/10"
                    : "bg-white"
                }`}
                style={{
                  boxShadow: "0 20px 45px rgba(40,50,90,0.14)",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => {
                    setShowMessageSearch((prev) => !prev);
                    setShowChatMenu(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-[14px] transition-colors text-left ${
                    isDark ? "hover:bg-[#1e293b]" : "hover:bg-[#f4f6fc]"
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center ${
                      isDark ? "bg-[#1e293b]" : "bg-[#eef2ff]"
                    }`}
                  >
                    <Search size={16} className="text-[#2453c4]" />
                  </div>

                  <span
                    className={`text-[14px] font-medium ${
                      isDark ? "text-white" : "text-[#2d3142]"
                    }`}
                  >
                    Search
                  </span>
                </button>

                <button
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-[14px] transition-colors text-left ${
                    isDark ? "hover:bg-[#1e293b]" : "hover:bg-[#f4f6fc]"
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center ${
                      isDark ? "bg-[#1e293b]" : "bg-[#eef2ff]"
                    }`}
                  >
                    <Users size={16} className="text-[#2453c4]" />
                  </div>

                  <span
                    className={`text-[14px] font-medium ${
                      isDark ? "text-white" : "text-[#2d3142]"
                    }`}
                  >
                    View Profile
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showMessageSearch && (
        <div
          className={`mt-5 min-h-[64px] rounded-[18px] flex items-center px-5 gap-3 ${
            isDark
              ? "bg-white/[0.04] backdrop-blur-xl border border-white/8"
              : "bg-white"
          }`}
          style={{
            boxShadow:
              "0 15px 30px rgba(79,85,150,0.06), inset 0 1px 0 rgba(255,255,255,0.7)",
          }}
        >
          <Search
            size={18}
            className={`shrink-0 ${isDark ? "text-[#9ca3af]" : "text-[#7b8197]"}`}
          />

          <input
            value={messageSearch}
            onChange={(e) => setMessageSearch(e.target.value)}
            placeholder="Search messages..."
            className={`flex-1 bg-transparent outline-none text-[14px] ${
              isDark ? "text-white" : "text-[#2d3142]"
            }`}
          />

          <div className="flex items-center gap-2">
            <span
              className={`text-[12px] min-w-[40px] text-center ${
                isDark ? "text-[#9ca3af]" : "text-[#7b8197]"
              }`}
            >
              {searchMatches.length
                ? `${currentSearchIndex + 1}/${searchMatches.length}`
                : "0/0"}
            </span>

            <button
              onClick={() => jumpToSearchMatch("prev")}
              className={`w-9 h-9 rounded-[12px] flex items-center justify-center shrink-0 ${
                isDark
                  ? "bg-[#0f172a] hover:bg-[#273244]"
                  : "bg-[#f4f6fc] hover:bg-[#e8ebf8]"
              }`}
            >
              <ChevronUp
                size={16}
                className={isDark ? "text-[#cbd5e1]" : "text-[#68708d]"}
              />
            </button>

            <button
              onClick={() => jumpToSearchMatch("next")}
              className={`w-9 h-9 rounded-[12px] flex items-center justify-center shrink-0 ${
                isDark
                  ? "bg-[#0f172a] hover:bg-[#273244]"
                  : "bg-[#f4f6fc] hover:bg-[#e8ebf8]"
              }`}
            >
              <ChevronDown
                size={16}
                className={isDark ? "text-[#cbd5e1]" : "text-[#68708d]"}
              />
            </button>

            <button
              onClick={() => {
                setShowMessageSearch(false);
                setMessageSearch("");
                setSearchMatches([]);
              }}
              className={`text-[13px] px-2 shrink-0 ${
                isDark ? "text-[#9ca3af]" : "text-[#7b8197]"
              }`}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {activePinnedMessage && (
        <div
          className={`mt-5 min-h-[60px] rounded-[18px] flex items-center px-5 gap-4 ${
            isDark
              ? "bg-white/[0.04] backdrop-blur-xl border border-white/8"
              : "bg-white"
          }`}
          style={{
            boxShadow:
              "0 15px 30px rgba(79,85,150,0.06), inset 0 1px 0 rgba(255,255,255,0.7)",
          }}
        >
          <button
            onClick={() => scrollToPinnedMessage(activePinnedMessage._id)}
            className="flex items-center gap-4 flex-1 text-left"
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                isDark ? "bg-[#0f172a]" : "bg-[#eef2ff]"
              }`}
            >
              <Pin size={16} className="text-[#2453c4] rotate-45" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-[#2453c4] uppercase tracking-wide">
                Pinned Message
              </p>

              <p
                className={`text-[13px] truncate ${
                  isDark ? "text-white" : "text-[#2d3142]"
                }`}
              >
                {activePinnedMessage.messageType === "image"
                  ? "📷 Image"
                  : activePinnedMessage.messageType === "voice"
                    ? "🎙️ Voice Message"
                    : activePinnedMessage.messageType === "file"
                      ? activePinnedMessage.fileName || "📄 File"
                      : activePinnedMessage.content}
              </p>
            </div>
          </button>

          {pinnedMessages.length > 1 && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => unpinMessage(activePinnedMessage._id)}
                className={`px-3 h-9 rounded-[12px] text-[12px] font-medium text-[#ff5b5b] ${
                  isDark
                    ? "bg-[#3b1f25] hover:bg-[#4a252d]"
                    : "bg-[#fff3f3] hover:bg-[#ffe5e5]"
                }`}
              >
                Unpin
              </button>
              <button
                onClick={() =>
                  setCurrentPinnedIndex((prev) =>
                    prev === 0 ? pinnedMessages.length - 1 : prev - 1,
                  )
                }
                className={`w-9 h-9 rounded-[12px] flex items-center justify-center ${
                  isDark
                    ? "bg-[#0f172a] hover:bg-[#273244]"
                    : "bg-[#f4f6fc] hover:bg-[#e8ebf8]"
                }`}
              >
                <ChevronUp
                  size={16}
                  className={isDark ? "text-[#cbd5e1]" : "text-[#68708d]"}
                />
              </button>

              <span
                className={`text-[12px] min-w-[36px] text-center ${
                  isDark ? "text-[#9ca3af]" : "text-[#7b8197]"
                }`}
              >
                {currentPinnedIndex + 1}/{pinnedMessages.length}
              </span>

              <button
                onClick={() =>
                  setCurrentPinnedIndex((prev) =>
                    prev === pinnedMessages.length - 1 ? 0 : prev + 1,
                  )
                }
                className={`w-9 h-9 rounded-[12px] flex items-center justify-center ${
                  isDark
                    ? "bg-[#0f172a] hover:bg-[#273244]"
                    : "bg-[#f4f6fc] hover:bg-[#e8ebf8]"
                }`}
              >
                <ChevronDown
                  size={16}
                  className={isDark ? "text-[#cbd5e1]" : "text-[#68708d]"}
                />
              </button>
            </div>
          )}
        </div>
      )}

      {!selectedChat ? (
        <div className="flex-1 flex items-center justify-center px-10 text-center">
          <div>
            <h2
              className={`text-[24px] font-bold mb-3 ${
                isDark ? "text-white" : "text-[#2d3142]"
              }`}
            >
              Select a chat to start messaging
            </h2>

            <p
              className={`text-[14px] ${
                isDark ? "text-[#9ca3af]" : "text-[#7b8197]"
              }`}
            >
              Choose a direct or group conversation from the sidebar to view
              messages.
            </p>
          </div>
        </div>
      ) : (
        <div
          ref={scrollContainerRef}
          className="flex-1 mt-4 pt-6 flex flex-col gap-5 overflow-y-auto min-h-0 custom-scrollbar mr-[-12px] pr-[12px]"
        >
          {loadingMore && (
            <div
              className={`mb-2 text-center text-[11px] ${
                isDark ? "text-[#9ca3af]" : "text-[#7b8197]"
              }`}
            >
              Loading older messages...
            </div>
          )}

          {Array.isArray(messages) && messages.length > 0 ? (
            <>
              {messages.map((message, index) => (
                <MessageItem
                  key={message._id || index}
                  message={message}
                  nextMessage={messages[index + 1]}
                  hoveredMessage={hoveredMessage}
                  setHoveredMessage={setHoveredMessage}
                  handleContextMenu={handleContextMenu}
                  pinnedMessageRef={pinnedMessageRef}
                  highlightPinnedMessage={highlightPinnedMessage}
                  reactToMessage={reactToMessage}
                  scrollToPinnedMessage={scrollToPinnedMessage}
                  votePoll={votePoll}
                />
              ))}

              <div ref={bottomMessageRef} />
            </>
          ) : (
            <div
              className={`flex items-center justify-center h-full text-[14px] ${
                isDark ? "text-[#9ca3af]" : "text-[#7b8197]"
              }`}
            >
              No messages yet.
            </div>
          )}
        </div>
      )}

      {showScheduleBox && (
        <div
          className={`mt-4 rounded-[22px] px-5 py-4 flex items-center justify-between gap-5 ${
            isDark
              ? "bg-white/[0.04] backdrop-blur-xl border border-white/8"
              : "bg-white"
          }`}
          style={{
            boxShadow:
              "0 20px 35px rgba(79,85,150,0.08), inset 0 1px 0 rgba(255,255,255,0.7)",
          }}
        >
          <div className="flex items-center gap-4 flex-1">
            <div className="w-11 h-11 rounded-full bg-[#fff3e8] flex items-center justify-center shrink-0">
              <Clock3 size={18} className="text-[#ff9f43]" />
            </div>

            <div className="flex flex-col gap-2 flex-1">
              <p
                className={`text-[14px] font-semibold ${
                  isDark ? "text-white" : "text-[#2d3142]"
                }`}
              >
                Schedule Message
              </p>

              <div className="flex items-center gap-3 flex-wrap">
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className={`h-[38px] px-3 rounded-[12px] outline-none text-[13px] ${
                    isDark
                      ? "bg-[#0f172a] text-white"
                      : "bg-[#f4f6fc] text-[#2d3142]"
                  }`}
                />

                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className={`h-[38px] px-3 rounded-[12px] outline-none text-[13px] ${
                    isDark
                      ? "bg-[#0f172a] text-white"
                      : "bg-[#f4f6fc] text-[#2d3142]"
                  }`}
                />
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setShowScheduleBox(false);
              setScheduledDate("");
              setScheduledTime("");
            }}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors shrink-0 ${
              isDark ? "hover:bg-[#0f172a]" : "hover:bg-[#f4f6fc]"
            }`}
          >
            <X
              size={16}
              className={isDark ? "text-[#9ca3af]" : "text-[#7b8197]"}
            />
          </button>
        </div>
      )}

      {replyingTo && (
        <div
          className={`mt-4 rounded-[18px] px-5 py-3 flex items-center justify-between ${
            isDark
              ? "bg-white/[0.04] backdrop-blur-xl border border-white/8"
              : "bg-white"
          }`}
          style={{
            boxShadow:
              "0 15px 30px rgba(79,85,150,0.06), inset 0 1px 0 rgba(255,255,255,0.7)",
          }}
        >
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold text-[#2453c4]">
              Replying to {replyingTo.sender?.name || "User"}
            </p>

            <p
              className={`text-[13px] truncate ${
                isDark ? "text-[#cbd5e1]" : "text-[#68708d]"
              }`}
            >
              {replyingTo.messageType === "image"
                ? "📷 Image"
                : replyingTo.messageType === "voice"
                  ? "🎙️ Voice Message"
                  : replyingTo.messageType === "file"
                    ? "📄 File"
                    : replyingTo.content}
            </p>
          </div>

          <button
            onClick={() => setReplyingTo(null)}
            className={`w-8 h-8 rounded-full ${
              isDark ? "hover:bg-[#0f172a]" : "hover:bg-[#f4f6fc]"
            }`}
          >
            ✕
          </button>
        </div>
      )}

      {showMentionSuggestions && mentionCandidates.length > 0 && (
        <div
          className={`mt-4 rounded-[20px] p-3 max-h-[220px] overflow-y-auto ${
            isDark
              ? "bg-black/40 backdrop-blur-2xl border border-white/10"
              : "bg-white"
          }`}
          style={{
            boxShadow: "0 20px 45px rgba(40,50,90,0.14)",
          }}
        >
          {mentionCandidates.map((candidate) => (
            <button
              key={candidate._id}
              onClick={() => {
                const updatedText = newMessage.replace(
                  /@(\w*)$/,
                  `@${candidate.name} `,
                );

                typingHandler({
                  target: {
                    value: updatedText,
                  },
                });

                setShowMentionSuggestions(false);
                setMentionQuery("");
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-[14px] transition-colors text-left ${
                isDark ? "hover:bg-[#1e293b]" : "hover:bg-[#f4f6fc]"
              }`}
            >
              <img
                src={candidate.pic}
                alt={candidate.name}
                className="w-9 h-9 rounded-full object-cover"
              />

              <span
                className={`text-[14px] font-medium ${
                  isDark ? "text-white" : "text-[#2d3142]"
                }`}
              >
                {candidate.name}
              </span>
            </button>
          ))}
        </div>
      )}
      {editingMessage && (
        <div
          className={`mt-4 rounded-[18px] px-5 py-3 flex items-center justify-between ${
            isDark
              ? "bg-white/[0.04] backdrop-blur-xl border border-white/8"
              : "bg-white"
          }`}
          style={{
            boxShadow:
              "0 15px 30px rgba(79,85,150,0.06), inset 0 1px 0 rgba(255,255,255,0.7)",
          }}
        >
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold text-[#2453c4]">
              Editing message
            </p>

            <p
              className={`text-[13px] truncate ${
                isDark ? "text-[#cbd5e1]" : "text-[#68708d]"
              }`}
            >
              {editingMessage.content}
            </p>
          </div>

          <button
            onClick={() => setEditingMessage(null)}
            className={`w-8 h-8 rounded-full ${
              isDark ? "hover:bg-[#0f172a]" : "hover:bg-[#f4f6fc]"
            }`}
          >
            ✕
          </button>
        </div>
      )}
      {pollModalOpen && (
        <div
          className={`mt-4 rounded-[20px] p-5 flex flex-col gap-3 ${
            isDark
              ? "bg-white/[0.04] backdrop-blur-xl border border-white/8"
              : "bg-white"
          }`}
        >
          <input
            value={pollQuestion}
            onChange={(e) => setPollQuestion(e.target.value)}
            placeholder="Poll question"
            className={`px-4 py-3 rounded-[14px] outline-none ${
              isDark
                ? "bg-[#0f172a] text-white placeholder:text-[#9ca3af]"
                : "bg-[#f4f6fc] text-[#2d3142] placeholder:text-[#7b8197]"
            }`}
          />

          {pollOptions.map((option, index) => (
            <input
              key={index}
              value={option}
              onChange={(e) => {
                const updated = [...pollOptions];
                updated[index] = e.target.value;
                setPollOptions(updated);
              }}
              placeholder={`Option ${index + 1}`}
              className={`px-4 py-3 rounded-[14px] outline-none ${
                isDark
                  ? "bg-[#0f172a] text-white placeholder:text-[#9ca3af]"
                  : "bg-[#f4f6fc] text-[#2d3142] placeholder:text-[#7b8197]"
              }`}
            />
          ))}

          <button
            onClick={() => setPollOptions((prev) => [...prev, ""])}
            className="text-left text-[#2453c4] text-sm"
          >
            + Add Option
          </button>

          <label
            className={`flex items-center gap-2 text-sm ${
              isDark ? "text-white" : "text-[#2d3142]"
            }`}
          >
            <input
              type="checkbox"
              checked={allowMultiplePollVotes}
              onChange={(e) => setAllowMultiplePollVotes(e.target.checked)}
            />
            Allow multiple votes
          </label>

          <button
            onClick={createPoll}
            className="bg-[#2453c4] text-white py-3 rounded-[14px]"
          >
            Create Poll
          </button>
        </div>
      )}
      {typingUser && (
        <div className="mt-3 px-3 flex items-center gap-3">
          <div className="flex gap-1 items-center">
            <span className="w-2 h-2 rounded-full bg-[#2453c4] animate-bounce" />
            <span
              className="w-2 h-2 rounded-full bg-[#2453c4] animate-bounce"
              style={{ animationDelay: "0.15s" }}
            />
            <span
              className="w-2 h-2 rounded-full bg-[#2453c4] animate-bounce"
              style={{ animationDelay: "0.3s" }}
            />
          </div>

          <span
            className={`text-[12px] ${
              isDark ? "text-[#9ca3af]" : "text-[#7b8197]"
            }`}
          >
            {selectedChat?.isGroupChat
              ? `${typingUser.userName} is typing...`
              : "typing..."}
          </span>
        </div>
      )}
      {selectedChat && (
        <div
          className={`h-[56px] rounded-[20px] mt-5 flex items-center px-4 gap-3 ${
            isDark
              ? "bg-white/[0.04] backdrop-blur-xl border border-white/8"
              : "bg-white"
          }`}
          style={{
            boxShadow:
              "0 20px 35px rgba(79,85,150,0.08), inset 0 1px 0 rgba(255,255,255,0.7)",
          }}
        >
          <div className="relative shrink-0">
            {showAttachmentMenu && (
              <div
                className={`absolute bottom-14 left-0 rounded-[20px] p-3 flex flex-col gap-2 min-w-[170px] z-50 ${
                  isDark
                    ? "bg-black/40 backdrop-blur-2xl border border-white/10"
                    : "bg-white"
                }`}
                style={{
                  boxShadow: "0 20px 45px rgba(40,50,90,0.14)",
                }}
              >
                {[
                  {
                    label: "Image",
                    icon: <Image size={16} className="text-[#ff5da2]" />,
                  },
                  {
                    label: "File",
                    icon: <Paperclip size={16} className="text-[#2453c4]" />,
                  },
                  {
                    label: "Voice Record",
                    icon: <Mic size={16} className="text-[#32c36c]" />,
                  },
                  {
                    label: "Schedule Message",
                    icon: <Clock3 size={16} className="text-[#ff9f43]" />,
                  },
                  ...(selectedChat?.isGroupChat
                    ? [
                        {
                          label: "Create Poll",
                          icon: <Vote size={16} className="text-[#8b5cf6]" />,
                        },
                      ]
                    : []),
                ].map((item) => {
                  const commonClass = `flex items-center gap-3 px-3 py-2 rounded-[14px] transition-colors text-left w-full ${
                    isDark ? "hover:bg-[#1e293b]" : "hover:bg-[#f4f6fc]"
                  }`;

                  if (item.label === "Image") {
                    return (
                      <label key={item.label} className={commonClass}>
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                            isDark ? "bg-[#1e293b]" : "bg-[#f4f6fc]"
                          }`}
                        >
                          {item.icon}
                        </div>

                        <span
                          className={`text-[14px] font-medium ${
                            isDark ? "text-white" : "text-[#2d3142]"
                          }`}
                        >
                          {item.label}
                        </span>

                        <input
                          hidden
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            uploadImage(e.target.files[0]);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    );
                  }

                  if (item.label === "File") {
                    return (
                      <label key={item.label} className={commonClass}>
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                            isDark ? "bg-[#1e293b]" : "bg-[#f4f6fc]"
                          }`}
                        >
                          {item.icon}
                        </div>

                        <span
                          className={`text-[14px] font-medium ${
                            isDark ? "text-white" : "text-[#2d3142]"
                          }`}
                        >
                          {item.label}
                        </span>

                        <input
                          hidden
                          type="file"
                          onChange={(e) => {
                            uploadFile(e.target.files[0]);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    );
                  }

                  return (
                    <button
                      key={item.label}
                      onClick={() => {
                        if (item.label === "Schedule Message") {
                          setShowScheduleBox(true);
                        } else if (item.label === "Voice Record") {
                          if (isRecording) {
                            stopRecording();
                          } else {
                            startRecording();
                          }
                        } else if (item.label === "Create Poll") {
                          setPollModalOpen(true);
                        }

                        setShowAttachmentMenu(false);
                      }}
                      className={commonClass}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          isDark ? "bg-[#1e293b]" : "bg-[#f4f6fc]"
                        }`}
                      >
                        {item.icon}
                      </div>

                      <span
                        className={`text-[14px] font-medium ${
                          isDark ? "text-white" : "text-[#2d3142]"
                        }`}
                      >
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <button
              onClick={() => setShowAttachmentMenu((prev) => !prev)}
              className={`w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0 ${
                isDark ? "bg-white/[0.05]" : "bg-[#f0f1fb]"
              }`}
            >
              <Plus
                className={isDark ? "text-[#cbd5e1]" : "text-[#68708d]"}
                size={18}
              />
            </button>
          </div>

          {isRecording && (
            <div
              className={`mb-3 flex items-center justify-between rounded-[20px] px-4 py-3 ${
                isDark
                  ? "bg-black/30 backdrop-blur-xl border border-white/8"
                  : "bg-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="animate-pulse text-red-500">🔴</span>
                <span
                  className={`text-[14px] ${
                    isDark ? "text-white" : "text-[#2d3142]"
                  }`}
                >
                  Recording...
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={cancelRecording}
                  className={`px-3 py-2 rounded-[12px] ${
                    isDark ? "bg-[#1e293b] text-white" : "bg-[#eef2ff]"
                  }`}
                >
                  Cancel
                </button>

                <button
                  onClick={stopRecording}
                  className="px-3 py-2 rounded-[12px] bg-[#2453c4] text-white"
                >
                  Send
                </button>
              </div>
            </div>
          )}

          <input
            value={newMessage}
            onChange={handleMessageInput}
            onKeyDown={(e) => {
              if (showScheduleBox && scheduledDate && scheduledTime) {
                if (e.key === "Enter") {
                  e.preventDefault();

                  sendScheduledMessage();
                }
              } else {
                sendMessage(e);
              }
            }}
            placeholder={
              editingMessage ? "Edit your message..." : "Type a message here..."
            }
            className={`flex-1 bg-transparent outline-none text-[15px] ${
              isDark
                ? "text-white placeholder:text-[#9ca3af]"
                : "text-[#7b8197]"
            }`}
          />

          <div className="relative shrink-0">
            <button
              onClick={() => setShowEmojiPicker((prev) => !prev)}
              className={`w-10 h-10 rounded-[14px] flex items-center justify-center ${
                isDark ? "hover:bg-[#0f172a]" : "hover:bg-[#f4f6fc]"
              }`}
            >
              <Smile
                className={isDark ? "text-[#68708d]" : "text-[#68708d]"}
                size={18}
              />
            </button>

            {showEmojiPicker && (
              <div
                className={`absolute bottom-14 right-[-20px] rounded-[20px] p-3 z-50 w-[220px] ${
                  isDark
                    ? "bg-black/40 backdrop-blur-2xl border border-white/10"
                    : "bg-white"
                }`}
                style={{
                  boxShadow: "0 20px 45px rgba(40,50,90,0.14)",
                }}
              >
                <div className="grid grid-cols-4 gap-2">
                  {[
                    "😀",
                    "😂",
                    "😍",
                    "😎",
                    "😭",
                    "😡",
                    "👍",
                    "🙏",
                    "🔥",
                    "❤️",
                    "🎉",
                    "🤝",
                    "😮",
                    "🤔",
                    "🙌",
                  ].map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        typingHandler({
                          target: {
                            value: newMessage + emoji,
                          },
                        });

                        setShowEmojiPicker(false);
                      }}
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-[22px] transition-colors ${
                        isDark ? "hover:bg-[#1e293b]" : "hover:bg-[#f4f6fc]"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              if (showScheduleBox && scheduledDate && scheduledTime) {
                sendScheduledMessage();
              } else {
                sendMessage({ key: "Enter" });
              }
            }}
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              isDark ? "bg-white/[0.05]" : "bg-[#f0f1fb]"
            }`}
          >
            <Send className="text-[#2453c4]" size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
