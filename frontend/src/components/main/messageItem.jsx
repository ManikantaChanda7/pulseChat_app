import React, { useState } from "react";
import { FileText } from "lucide-react";
import { ChatState } from "../../Context/ChatProvider";

export default function MessageItem({
  message,
  nextMessage,
  hoveredMessage,
  setHoveredMessage,
  handleContextMenu,
  pinnedMessageRef,
  highlightPinnedMessage,
  reactToMessage,
  scrollToPinnedMessage,
  votePoll,
}) {
  const { user, selectedChat } = ChatState();
  const otherUser = !selectedChat?.isGroupChat
    ? selectedChat?.users?.find((u) => u._id !== user?._id)
    : null;

  const readReceiptsAllowed =
    user?.privacy?.readReceipts !== false &&
    otherUser?.privacy?.readReceipts !== false;

  const isDark = localStorage.getItem("darkMode") === "true";

  const [reactionDetails, setReactionDetails] = useState(null);

  const [showImagePreview, setShowImagePreview] = useState(false);
  const [selectedPollVotes, setSelectedPollVotes] = useState([]);

  if (!message) return null;

  const isSender = (message.sender?._id || message.sender) === user?._id;

  const nextSenderId = nextMessage?.sender?._id || nextMessage?.sender;
  const currentSenderId = message.sender?._id || message.sender;

  const isLastInSenderSequence = nextSenderId !== currentSenderId;

  const showGroupAvatar =
    selectedChat?.isGroupChat && !isSender && isLastInSenderSequence;

  const showDoubleTick = !readReceiptsAllowed
    ? false
    : selectedChat?.isGroupChat
      ? Boolean(message.allSeen)
      : Boolean(
          message.seen ||
          (Array.isArray(message.seenBy) &&
            message.seenBy.some(
              (seenUser) => (seenUser._id || seenUser) !== user?._id,
            )),
        );

  const isStarred = message.starredBy?.some(
    (starUser) => (starUser._id || starUser) === user?._id,
  );

  const formattedTime = message.createdAt
    ? new Date(message.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : message.time;
  const isFile = message.messageType === "file";

  const messageContent = message.content || "";

  const isVoice =
    message.messageType === "voice" ||
    messageContent?.includes("/video/upload/");

  const isImage =
    message.messageType === "image" ||
    (messageContent?.includes("/image/upload/") && !isFile && !isVoice);

  const renderMessageWithMentions = () => {
    if (message.deleted) {
      return "Message deleted";
    }

    if (!message.mentions?.length || typeof messageContent !== "string") {
      return messageContent;
    }

    const mentionMap = new Map(
      message.mentions.map((mentionedUser) => [
        mentionedUser.name,
        mentionedUser,
      ]),
    );

    const parts = messageContent.split(/(@\w+)/g);

    return parts.map((part, index) => {
      if (part.startsWith("@")) {
        const username = part.slice(1);
        const matchedUser = mentionMap.get(username);

        if (matchedUser) {
          return (
            <span
              key={index}
              className={`font-semibold ${
                isSender
                  ? "text-white"
                  : isDark
                    ? "text-[#60a5fa]"
                    : "text-[#2453c4]"
              }`}
            >
              {part}
            </span>
          );
        }
      }

      return part;
    });
  };

  const togglePollVote = (message, index) => {
    if (!message.poll?.allowMultiple) {
      votePoll(message._id, [index]);
      return;
    }

    const currentSelections = selectedPollVotes[message._id] || [];

    let updatedSelections;

    if (currentSelections.includes(index)) {
      updatedSelections = currentSelections.filter((i) => i !== index);
    } else {
      updatedSelections = [...currentSelections, index];
    }

    setSelectedPollVotes((prev) => ({
      ...prev,
      [message._id]: updatedSelections,
    }));

    votePoll(message._id, updatedSelections);
  };

  return (
    <div
      onMouseEnter={() => setHoveredMessage(message._id)}
      onMouseLeave={() => {
        if (!reactionDetails) {
          setHoveredMessage(null);
        }
      }}
      onContextMenu={(e) => handleContextMenu(e, message._id, isSender)}
      className={`group relative flex items-end gap-3 transition-all duration-300 ${
        isSender
          ? "justify-end"
          : selectedChat?.isGroupChat
            ? showGroupAvatar
              ? "justify-start"
              : "justify-start pl-12"
            : "justify-start pl-2"
      }`}
    >
      {showGroupAvatar && (
        <img
          src={message.sender?.pic}
          alt={message.sender?.name || "User"}
          className="w-9 h-9 rounded-full object-cover shrink-0"
        />
      )}
      <div
        id={`message-${message._id}`}
        ref={message.pinned ? pinnedMessageRef : null}
        className={`relative max-w-[340px] break-words transition-all duration-300 ${
          isSender
            ? "bg-[#f35ca6] text-white rounded-[24px] rounded-br-[8px] px-7 py-4 shadow-[0_12px_30px_rgba(243,92,166,0.32)]"
            : isDark
              ? "bg-white/[0.06] backdrop-blur-xl text-white rounded-[24px] rounded-bl-[8px] px-6 py-5 shadow-[0_12px_30px_rgba(0,0,0,0.28)] border border-white/8"
              : "bg-white text-[#2d3142] rounded-[24px] rounded-bl-[8px] px-6 py-5 shadow-[0_10px_18px_rgba(79,85,150,0.04),inset_0_1px_0_rgba(255,255,255,0.5)]"
        } ${
          highlightPinnedMessage && message.pinned
            ? isDark
              ? "scale-[1.01] bg-white/[0.12]"
              : "scale-[1.01] bg-[#e9edf8]"
            : ""
        }`}
      >
        {message.forwarded && !message.deleted && (
          <div
            className={`mb-2 text-[11px] font-medium ${
              isSender
                ? "text-white/75"
                : isDark
                  ? "text-[#9ca3af]"
                  : "text-[#68708d]"
            }`}
          >
            Forwarded
          </div>
        )}
        {isStarred && (
          <div
            className={`absolute top-2 text-[12px] ${
              isSender ? "left-3" : "right-3"
            }`}
          >
            ⭐
          </div>
        )}
        {/* HOVER REACTIONS */}
        {hoveredMessage === message._id && (
          <div
            className={`absolute -top-5 z-30 rounded-full px-2 py-1 flex items-center gap-1 ${
              isSender ? "right-2" : "left-2"
            } ${isDark ? "bg-black/40 backdrop-blur-2xl border border-white/10" : "bg-white"}`}
            style={{
              boxShadow: "0 10px 25px rgba(60,70,120,0.12)",
            }}
          >
            {["👍", "❤️", "😂", "😮", "😢"].map((emoji) => (
              <button
                key={emoji}
                onClick={() => reactToMessage(message._id, emoji)}
                className="hover:scale-125 transition-transform text-[16px]"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {message.replyTo && (
          <button
            onClick={() => scrollToPinnedMessage(message.replyTo._id)}
            className={`mb-3 block w-full rounded-[14px] px-3 py-2 text-left ${
              isSender
                ? "bg-white/20"
                : isDark
                  ? "bg-white/[0.05] border border-white/5"
                  : "bg-[#f4f6fc]"
            }`}
          >
            <p className="text-[11px] font-semibold">
              {message.replyTo.sender?.name || "User"}
            </p>

            <p className="text-[12px] truncate">
              {message.replyTo.messageType === "image"
                ? "📷 Image"
                : message.replyTo.messageType === "voice"
                  ? "🎙️ Voice Message"
                  : message.replyTo.messageType === "file"
                    ? "📄 File"
                    : message.replyTo.content}
            </p>
          </button>
        )}

        {message.messageType === "poll" && message.poll ? (
          <div className="flex flex-col gap-3 min-w-[260px]">
            <p className="font-semibold">{message.poll.question}</p>

            {message.poll.options.map((option, index) => {
              const totalVotes = message.poll.options.reduce(
                (sum, opt) => sum + (opt.voters?.length || 0),
                0,
              );

              const percentage = totalVotes
                ? Math.round(((option.voters?.length || 0) / totalVotes) * 100)
                : 0;

              const hasVoted = option.voters?.some(
                (id) => (id._id || id) === user?._id,
              );

              return (
                <button
                  key={index}
                  onClick={() => togglePollVote(message, index)}
                  className={`text-left px-3 py-3 rounded-[14px] transition-colors ${
                    hasVoted
                      ? "bg-[#2453c4]/20"
                      : isDark
                        ? "bg-white/[0.06]"
                        : "bg-black/10"
                  }`}
                >
                  <div className="flex justify-between">
                    <span>{option.text}</span>
                    <span>{percentage}%</span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : isFile ? (
          <a
            href={messageContent}
            target="_blank"
            rel="noopener noreferrer"
            className={`w-[170px] rounded-[26px] p-4 transition-all duration-300 hover:scale-[1.02] flex flex-col ${
              isDark
                ? "bg-white/[0.05] backdrop-blur-xl border border-white/8"
                : "bg-[#f4f5fb]"
            }`}
          >
            <div className="flex items-center justify-center flex-1 py-3">
              <div className="text-center">
                <FileText
                  size={42}
                  className={isDark ? "text-[#60a5fa]" : "text-[#8ab2ff]"}
                />

                <p
                  className={`mt-2 text-[16px] font-bold tracking-wide ${
                    isDark ? "text-[#60a5fa]" : "text-[#8ab2ff]"
                  }`}
                >
                  {(message.fileName || "DOC")
                    .split(".")
                    .pop()
                    ?.toUpperCase() || "DOC"}
                </p>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
              <p
                className={`truncate text-[12px] font-medium flex-1 ${
                  isDark ? "text-[#9ca3af]" : "text-[#7b8197]"
                }`}
              >
                {message.fileName ||
                  messageContent.split("/").pop()?.split("?")[0] ||
                  "Document"}
              </p>

              <div
                className={`text-[20px] leading-none shrink-0 ${
                  isDark ? "text-[#9ca3af]" : "text-[#7b8197]"
                }`}
              >
                ↓
              </div>
            </div>
          </a>
        ) : isVoice ? (
          <div className="flex flex-col gap-2 min-w-[220px]">
            <div
              className={`flex items-center gap-2 text-xs font-medium ${
                isDark ? "text-[#cbd5e1] opacity-80" : "opacity-80"
              }`}
            >
              <span>🎙️</span>
              <span>Voice Message</span>
            </div>

            <audio controls className="w-full max-w-[240px] h-10">
              <source src={messageContent} type="audio/webm" />
            </audio>
          </div>
        ) : isImage ? (
          <img
            src={messageContent}
            alt="message"
            onClick={() => setShowImagePreview(true)}
            className={`mb-1 max-w-[220px] rounded-2xl border cursor-pointer transition-all hover:opacity-95 ${
              isDark ? "border-[#374151]" : "border-white/10"
            }`}
          />
        ) : (
          <p
            className={`text-[15px] leading-6 tracking-[0.01em] whitespace-pre-line ${
              message.deleted ? "italic opacity-70" : ""
            }`}
          >
            {renderMessageWithMentions()}
          </p>
        )}

        {/* TIME */}
        <div className="mt-3 flex items-center justify-end gap-2 opacity-80">
          {message.isScheduled && !message.scheduledSent && (
            <span
              className={`text-[10px] font-semibold uppercase tracking-wide ${
                isSender
                  ? "text-white/80"
                  : isDark
                    ? "text-[#9ca3af]"
                    : "text-[#7b8197]"
              }`}
            >
              Scheduled
            </span>
          )}
          {message.edited && !message.deleted && (
            <span
              className={`text-[10px] italic ${
                isSender
                  ? "text-white/75"
                  : isDark
                    ? "text-[#9ca3af]"
                    : "text-[#7b8197]"
              }`}
            >
              edited
            </span>
          )}
          <span className="text-[12px]">{formattedTime}</span>

          {isSender && (
            <span
              className={`text-[14px] font-semibold transition-all duration-150 ${
                showDoubleTick ? "text-white/90" : "text-white/70"
              }`}
            >
              {showDoubleTick ? "✓✓" : "✓"}
            </span>
          )}
        </div>

        {/* REACTIONS */}
        {message.reactions && message.reactions.length > 0 && (
          <>
            <div
              className={`absolute -bottom-4 z-40 flex items-center justify-center rounded-full h-7 min-w-[28px] px-2 text-[14px] shadow-[0_8px_20px_rgba(60,70,120,0.12)] ${
                isSender ? "right-4" : "left-4"
              } ${isDark ? "bg-black/30 backdrop-blur-xl border border-white/8" : "bg-white"}`}
            >
              {[...new Set(message.reactions.map((r) => r.emoji))].map(
                (emoji) => (
                  <button
                    key={emoji}
                    onClick={() =>
                      setReactionDetails(
                        reactionDetails === message._id ? null : message._id,
                      )
                    }
                    className="px-1"
                  >
                    {emoji}
                  </button>
                ),
              )}
            </div>

            {reactionDetails === message._id && (
              <div
                className={`absolute z-50 min-w-[220px] max-w-[260px] rounded-[18px] p-3 shadow-[0_18px_35px_rgba(60,70,120,0.16)] ${
                  isSender ? "right-0 bottom-10" : "left-0 bottom-10"
                } ${isDark ? "bg-black/40 backdrop-blur-2xl border border-white/10" : "bg-white"}`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <span
                    className={`text-[14px] font-semibold ${
                      isDark ? "text-white" : "text-[#2d3142]"
                    }`}
                  >
                    Reactions
                  </span>

                  <button
                    onClick={() => setReactionDetails(null)}
                    className={`text-[12px] font-medium ${
                      isDark ? "text-[#9ca3af]" : "text-[#68708d]"
                    }`}
                  >
                    Close
                  </button>
                </div>

                <div className="max-h-[220px] overflow-y-auto flex flex-col gap-2">
                  {(message.reactions || []).map((reaction, idx) => {
                    const isCurrentUser =
                      (reaction.user?._id || reaction.user) === user?._id;

                    return (
                      <div
                        key={idx}
                        className={`flex items-center justify-between rounded-[12px] px-3 py-2 ${
                          isDark ? "bg-white/[0.05]" : "bg-[#f8f9fd]"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-[16px]">{reaction.emoji}</span>

                          <span
                            className={`text-[13px] font-medium ${
                              isDark ? "text-[#d1d5db]" : "text-[#4b5563]"
                            }`}
                          >
                            {isCurrentUser
                              ? "You"
                              : reaction.user?.name || "User"}
                          </span>
                        </div>

                        {isCurrentUser && (
                          <button
                            onClick={() =>
                              reactToMessage(message._id, reaction.emoji)
                            }
                            className={`text-[11px] font-medium ${
                              isDark ? "text-[#60a5fa]" : "text-[#2453c4]"
                            }`}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
        {showImagePreview && (
          <div
            className="fixed inset-0 z-[999999] bg-black/80 flex items-center justify-center p-6"
            onClick={() => setShowImagePreview(false)}
          >
            <button
              onClick={() => setShowImagePreview(false)}
              className="absolute top-6 right-6 text-white text-4xl font-light"
            >
              ×
            </button>

            <img
              src={messageContent}
              alt="preview"
              className="max-h-[90vh] max-w-[90vw] rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </div>
    </div>
  );
}
