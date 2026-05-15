import React, { useState } from "react";
import { ChatState } from "../../Context/ChatProvider";
import API from "../../config/api";

const getOtherUser = (selectedChat, user) => {
  if (!selectedChat || selectedChat.isGroupChat) return null;

  return selectedChat.users?.find((chatUser) => chatUser._id !== user?._id);
};

export default function RightPanel({ messages = [], chats = [], setChats }) {
  const { selectedChat, user, setSelectedChat } = ChatState();

  const isDark = localStorage.getItem("darkMode") === "true";

  const [editingGroupName, setEditingGroupName] = useState(false);
  const [groupName, setGroupName] = useState(selectedChat?.chatName || "");
  const isGroupAdmin =
    selectedChat?.groupAdmin?._id === user?._id ||
    selectedChat?.groupAdmin === user?._id;

  const syncUpdatedChat = (updatedChat) => {
    setSelectedChat(updatedChat);

    if (typeof setChats === "function") {
      setChats((prev) =>
        Array.isArray(prev)
          ? prev.map((chat) =>
              chat._id === updatedChat._id ? updatedChat : chat,
            )
          : prev,
      );
    }
  };

  const renameGroup = async () => {
    if (!groupName.trim() || !selectedChat?._id) return;

    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };

      const { data } = await API.put(
        "/api/chat/rename",
        {
          chatId: selectedChat._id,
          chatName: groupName.trim(),
        },
        config,
      );

      syncUpdatedChat(data);
      setEditingGroupName(false);
    } catch (error) {
      console.error("Rename group failed", error);
    }
  };

  const removeUserFromGroup = async (memberId) => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };

      const { data } = await API.put(
        "/api/chat/groupremove",
        {
          chatId: selectedChat._id,
          userId: memberId,
        },
        config,
      );

      syncUpdatedChat(data);
    } catch (error) {
      console.error("Remove member failed", error);
    }
  };

  if (!selectedChat) {
    return (
      <div
        className={`w-[290px] h-full rounded-[34px] px-5 py-8 shrink-0 flex items-center justify-center transition-colors ${
          isDark ? "bg-white/[0.04] backdrop-blur-2xl border border-white/10" : "bg-[#f8f8fb]"
        }`}
        style={{
          boxShadow: isDark
            ? "inset 0 1px 0 rgba(255,255,255,0.05), 0 30px 70px rgba(0,0,0,0.35)"
            : "inset 0 1px 0 rgba(255,255,255,0.9), 0 20px 50px rgba(48,64,110,0.06)",
        }}
      >
        <p
          className={`text-[14px] font-medium text-center ${
            isDark ? "text-[#9ca3af]" : "text-[#7b8197]"
          }`}
        >
          Select a chat to view details
        </p>
      </div>
    );
  }

  const otherUser = getOtherUser(selectedChat, user);

  const mediaMessages = messages
    .filter((msg) => msg.messageType === "image")
    .slice()
    .reverse()
    .slice(0, 6);

  const fileMessages = messages
    .filter((msg) => msg.messageType === "file")
    .slice()
    .reverse()
    .slice(0, 5);

  const starredMessages = messages
    .filter((msg) =>
      msg.starredBy?.some(
        (starUser) => (starUser._id || starUser) === user?._id,
      ),
    )
    .slice()
    .reverse()
    .slice(0, 5);

  return (
    <div
      className={`w-[290px] h-full rounded-[34px] px-5 py-8 shrink-0 overflow-hidden flex flex-col transition-colors ${
        isDark ? "bg-white/[0.04] backdrop-blur-2xl border border-white/10" : "bg-[#f8f8fb]"
      }`}
      style={{
        boxShadow: isDark
          ? "inset 0 1px 0 rgba(255,255,255,0.05), 0 30px 70px rgba(0,0,0,0.35)"
          : "inset 0 1px 0 rgba(255,255,255,0.9), 0 20px 50px rgba(48,64,110,0.06)",
      }}
    >
      <div className="flex flex-col items-center">
        <img
          src={
            selectedChat.isGroupChat
              ? `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedChat.chatName)}`
              : otherUser?.pic
          }
          alt={
            selectedChat.isGroupChat ? selectedChat.chatName : otherUser?.name
          }
          className={`w-24 h-24 rounded-full object-cover border-[6px] ${
            isDark ? "border-white/10" : "border-white"
          }`}
        />

        {selectedChat.isGroupChat && editingGroupName ? (
          <div className="mt-6 w-full flex flex-col gap-3">
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className={`w-full rounded-[16px] px-4 py-3 outline-none text-center ${
                isDark
                  ? "bg-black/20 border border-white/10 text-white"
                  : "bg-white border border-[#d9dfef] text-[#2d3142]"
              }`}
            />
            <div className="flex gap-2">
              <button
                onClick={renameGroup}
                className="flex-1 rounded-[14px] px-4 py-2 bg-[#2453c4] text-white text-sm font-medium"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setEditingGroupName(false);
                  setGroupName(selectedChat.chatName);
                }}
                className={`flex-1 rounded-[14px] px-4 py-2 text-sm font-medium ${
                  isDark
                    ? "bg-white/[0.05] border border-white/10 text-white"
                    : "bg-white text-[#2d3142]"
                }`}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-6 flex items-center gap-2">
            <h2
              className={`text-[20px] font-bold text-center ${
                isDark ? "text-white" : "text-[#2d3142]"
              }`}
            >
              {selectedChat.isGroupChat ? selectedChat.chatName : otherUser?.name}
            </h2>
            {selectedChat.isGroupChat && isGroupAdmin && (
              <button
                onClick={() => setEditingGroupName(true)}
                className={`text-sm px-2 py-1 rounded-[10px] ${
                  isDark ? "text-[#9ca3af] hover:text-white" : "text-[#68708d]"
                }`}
              >
                Edit
              </button>
            )}
          </div>
        )}

        <p
          className={`mt-1 text-center ${
            isDark ? "text-[#9ca3af]" : "text-[#8a90a7]"
          }`}
        >
          {selectedChat.isGroupChat
            ? `${selectedChat.users?.length || 0} members`
            : "Direct Message"}
        </p>
      </div>

      <div className="mt-10 flex flex-col gap-5 overflow-y-auto custom-scrollbar min-h-0 flex-1 mr-[-10px] pr-[10px]">
        {selectedChat.isGroupChat && (
          <div
            className={`rounded-[24px] p-4 transition-colors ${
              isDark
                ? "bg-white/[0.05] backdrop-blur-xl border border-white/8"
                : "bg-white"
            }`}
          >
            <h3
              className={`text-[15px] font-semibold mb-4 ${
                isDark ? "text-white" : "text-[#2d3142]"
              }`}
            >
              Members
            </h3>

            <div className="flex flex-col gap-3 max-h-[240px] overflow-y-auto custom-scrollbar">
              {selectedChat.users?.map((member) => {
                const isAdmin =
                  selectedChat.groupAdmin?._id === member._id ||
                  selectedChat.groupAdmin === member._id;

                return (
                  <div
                    key={member._id}
                    className={`flex items-center gap-3 rounded-[16px] px-3 py-3 ${
                      isDark
                        ? "bg-black/20 backdrop-blur-xl border border-white/8"
                        : "bg-[#f8f9fd]"
                    }`}
                  >
                    <img
                      src={member.pic}
                      alt={member.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />

                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-[13px] font-medium truncate ${
                          isDark ? "text-white" : "text-[#2d3142]"
                        }`}
                      >
                        {member.name}
                      </p>
                      {isAdmin && (
                        <p className="text-[11px] text-[#2453c4] font-medium">
                          Admin
                        </p>
                      )}
                    </div>

                    {isGroupAdmin && !isAdmin && member._id !== user._id && (
                      <button
                        onClick={() => removeUserFromGroup(member._id)}
                        className="text-[11px] font-medium px-3 py-2 rounded-[12px] bg-[#ff5b5b] text-white"
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
        <div
          className={`rounded-[24px] p-4 transition-colors ${
            isDark ? "bg-white/[0.05] backdrop-blur-xl border border-white/8" : "bg-white"
          }`}
        >
          <h3
            className={`text-[15px] font-semibold mb-4 ${
              isDark ? "text-white" : "text-[#2d3142]"
            }`}
          >
            Shared Media
          </h3>

          {mediaMessages.length ? (
            <div className="grid grid-cols-3 gap-3">
              {mediaMessages.map((msg) => (
                <button
                  key={msg._id}
                  onClick={() => window.open(msg.content, "_blank")}
                  className="aspect-square rounded-[14px] overflow-hidden"
                >
                  <img
                    src={msg.content}
                    alt="Shared media"
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          ) : (
            <p className={`text-[13px] ${isDark ? "text-[#9ca3af]" : "text-[#7b8197]"}`}>
              No media shared yet
            </p>
          )}
        </div>

        <div
          className={`rounded-[24px] p-4 transition-colors ${
            isDark ? "bg-white/[0.05] backdrop-blur-xl border border-white/8" : "bg-white"
          }`}
        >
          <h3
            className={`text-[15px] font-semibold mb-4 ${
              isDark ? "text-white" : "text-[#2d3142]"
            }`}
          >
            Shared Files
          </h3>

          {fileMessages.length ? (
            <div className="flex flex-col gap-3">
              {fileMessages.map((msg) => (
                <button
                  key={msg._id}
                  onClick={() => window.open(msg.content, "_blank")}
                  className={`flex items-center gap-3 rounded-[16px] px-4 py-3 transition-colors text-left ${
                    isDark
                      ? "bg-black/20 backdrop-blur-xl hover:bg-white/[0.08] border border-white/8"
                      : "bg-[#f8f9fd] hover:bg-[#eef2ff]"
                  }`}
                >
                  <div className="text-[18px]">📄</div>
                  <p
                    className={`text-[13px] font-medium truncate flex-1 ${
                      isDark ? "text-white" : "text-[#2d3142]"
                    }`}
                  >
                    {msg.fileName || "Document"}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <p className={`text-[13px] ${isDark ? "text-[#9ca3af]" : "text-[#7b8197]"}`}>
              No files shared yet
            </p>
          )}
        </div>

        <div
          className={`rounded-[24px] p-4 transition-colors ${
            isDark ? "bg-white/[0.05] backdrop-blur-xl border border-white/8" : "bg-white"
          }`}
        >
          <h3
            className={`text-[15px] font-semibold mb-4 ${
              isDark ? "text-white" : "text-[#2d3142]"
            }`}
          >
            Starred Messages
          </h3>

          {starredMessages.length ? (
            <div className="flex flex-col gap-3">
              {starredMessages.map((msg) => (
                <div
                  key={msg._id}
                  className={`rounded-[16px] px-4 py-3 ${
                    isDark ? "bg-black/20 backdrop-blur-xl border border-white/8" : "bg-[#f8f9fd]"
                  }`}
                >
                  <p
                    className={`text-[13px] break-words ${
                      isDark ? "text-white" : "text-[#2d3142]"
                    }`}
                  >
                    {msg.deleted
                      ? "Message deleted"
                      : msg.messageType === "image"
                      ? "Image"
                      : msg.messageType === "file"
                      ? "File"
                      : msg.messageType === "voice"
                      ? "Voice Message"
                      : msg.content}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className={`text-[13px] ${isDark ? "text-[#9ca3af]" : "text-[#7b8197]"}`}>
              No starred messages
            </p>
          )}
        </div>
      </div>
    </div>
  );
}