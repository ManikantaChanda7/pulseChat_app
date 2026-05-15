import API from "../../config/api";
import React, { useEffect, useState } from "react";

import {
  Search,
  MoreHorizontal,
  FileArchive,
  MessageSquare,
  Plus,
  Pin,
  X,
  Users,
} from "lucide-react";

import ChatLoading from "../ChatLoading";
import { ChatState } from "../../Context/ChatProvider";
import { getSender } from "../../config/ChatLogics";
import { decryptMessage } from "../../utils/encryption";

export default function ChatList({ fetchAgain, chatTab }) {
  const [loggedUser, setLoggedUser] = useState();
  const [search, setSearch] = useState("");
  const [showChatListMenu, setShowChatListMenu] = useState(false);
  const [chatMenuOpen, setChatMenuOpen] = useState(null);
  const [hoveredChat, setHoveredChat] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createMode, setCreateMode] = useState("direct");
  const [userSearch, setUserSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showArchivedOnly, setShowArchivedOnly] = useState(false);
  const searchUsers = async (query) => {
    setUserSearch(query);

    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };

      const { data } = await API.get(`/api/user?search=${query}`, config);
      setSearchResults(data || []);
    } catch (error) {
      console.error("User search failed", error);
    }
  };

  const createDirectChat = async (targetUser) => {
    try {
      const config = {
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      };

      const { data } = await API.post(
        "/api/chat",
        { userId: targetUser._id },
        config,
      );

      setChats((prev) => {
        const exists = prev.some((chat) => chat._id === data._id);
        return exists ? prev : [data, ...prev];
      });

      setSelectedChat(data);
      setShowCreateModal(false);
      setUserSearch("");
      setSearchResults([]);
    } catch (error) {
      console.error("Create direct chat failed", error);
    }
  };

  const createGroupChat = async () => {
    if (!groupName.trim() || selectedUsers.length < 2) {
      return;
    }

    try {
      const config = {
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      };

      const { data } = await API.post(
        "/api/chat/group",
        {
          name: groupName,
          users: JSON.stringify(selectedUsers.map((u) => u._id)),
        },
        config,
      );

      setChats((prev) => [data, ...prev]);
      setSelectedChat(data);
      setShowCreateModal(false);
      setGroupName("");
      setSelectedUsers([]);
      setUserSearch("");
      setSearchResults([]);
    } catch (error) {
      console.error("Create group failed", error);
    }
  };

  const {
    selectedChat,
    setSelectedChat,
    user,
    chats,
    setChats,
    onlineUsers,
    notification,
    setNotification,
    socket,
  } = ChatState();

  const isDark = localStorage.getItem("darkMode") === "true";

  const getLatestMessagePreview = (message) => {
    if (!message) return "";

    if (message.messageType === "image") {
      return "📷 Image";
    }

    if (message.messageType === "voice") {
      return "🎙️ Voice Message";
    }

    if (message.messageType === "file") {
      return `📄 ${message.fileName || "Document"}`;
    }

    return decryptMessage(message.content || "");
  };

  const fetchChats = async () => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };

      const { data } = await API.get("/api/chat", config);

      setChats(data);
    } catch (error) {
      console.error("Failed to load chats");
    }
  };

  useEffect(() => {
    setLoggedUser(JSON.parse(localStorage.getItem("userInfo")));

    if (user) {
      fetchChats();
    }
  }, [fetchAgain, user]);

  useEffect(() => {
    if (!socket) return;

    const handleRealtimeChatUpdate = (newMessage) => {
      setChats((prevChats) => {
        if (!Array.isArray(prevChats)) {
          return prevChats;
        }

        const updatedChats = prevChats.map((chat) => {
          if (chat._id === newMessage.chat._id) {
            return {
              ...chat,
              latestMessage: newMessage,
            };
          }

          return chat;
        });

        updatedChats.sort((a, b) => {
          const aPinned = a.pinnedBy?.includes(user._id);
          const bPinned = b.pinnedBy?.includes(user._id);

          if (aPinned && !bPinned) return -1;
          if (!aPinned && bPinned) return 1;

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
    };

    socket.on("message recieved", handleRealtimeChatUpdate);

    socket.on("message received", handleRealtimeChatUpdate);

    return () => {
      socket.off("message recieved", handleRealtimeChatUpdate);

      socket.off("message received", handleRealtimeChatUpdate);
    };
  }, [socket, setChats, user]);

  const markChatAsUnread = async (chatId) => {
    try {
      if (selectedChat?._id === chatId) {
        setSelectedChat(null);
      }

      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };

      const { data } = await API.put(
        `/api/chat/read-state/${chatId}`,
        { forceUnread: true },
        config,
      );

      setChats((prev) =>
        Array.isArray(prev)
          ? prev.map((chat) => (chat._id === chatId ? data : chat))
          : prev,
      );

      setChatMenuOpen(null);
    } catch (error) {
      console.error("Mark chat unread failed", error);
    }
  };

  const toggleArchiveChat = async (chatId) => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };

      const { data } = await API.put(`/api/chat/archive/${chatId}`, {}, config);

      setChats((prev) =>
        Array.isArray(prev)
          ? prev.map((chat) => (chat._id === chatId ? data : chat))
          : prev,
      );

      if (selectedChat?._id === chatId) {
        setSelectedChat(data);
      }

      setChatMenuOpen(null);
    } catch (error) {
      console.error("Archive toggle failed", error);
    }
  };

  const togglePinChat = async (chatId) => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };

      const { data } = await API.put(`/api/chat/pin/${chatId}`, {}, config);

      setChats((prev) => {
        const updated = prev.map((chat) =>
          chat._id === data._id ? data : chat,
        );

        return [...updated].sort((a, b) => {
          const aPinned = a.pinnedBy?.includes(user._id);
          const bPinned = b.pinnedBy?.includes(user._id);

          if (aPinned && !bPinned) return -1;
          if (!aPinned && bPinned) return 1;

          return 0;
        });
      });
    } catch (error) {
      console.error("Pin chat failed", error);
    }
  };

  const openChat = async (chat) => {
    setSelectedChat(chat);

    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };

      await API.patch(`/api/notification/chat/${chat._id}/read`, {}, config);

      const { data } = await API.put(
        `/api/chat/read-state/${chat._id}`,
        { forceUnread: false },
        config,
      );

      setChats((prev) =>
        Array.isArray(prev)
          ? prev.map((c) => (c._id === chat._id ? data : c))
          : prev,
      );

      setNotification((prev) =>
        Array.isArray(prev)
          ? prev.map((n) =>
              n.chat?._id === chat._id
                ? {
                    ...n,
                    isRead: true,
                  }
                : n,
            )
          : prev,
      );
    } catch (error) {
      console.error("Mark chat notifications read failed", error);
    }
  };

  const filteredChats = Array.isArray(chats)
    ? [...chats]
        .filter((chat) =>
          chatTab === "groups" ? chat.isGroupChat : !chat.isGroupChat,
        )
        .filter((chat) => {
          const isArchived = chat.archivedBy?.some(
            (id) => (id._id || id)?.toString() === user._id?.toString(),
          );

          return showArchivedOnly ? isArchived : !isArchived;
        })
        .sort((a, b) => {
          const aPinned = a.pinnedBy?.includes(user._id);
          const bPinned = b.pinnedBy?.includes(user._id);

          if (aPinned && !bPinned) return -1;
          if (!aPinned && bPinned) return 1;

          return 0;
        })
        .filter((chat) => {
          const chatName = !chat.isGroupChat
            ? getSender(loggedUser, chat.users)
            : chat.chatName;

          return chatName.toLowerCase().includes(search.toLowerCase());
        })
    : [];

  return (
    <div
      className={`w-[340px] h-[calc(100%-32px)] mt-4 mb-4 ml-4 rounded-[34px] relative px-4 pt-7 pb-5 overflow-visible shrink-0 flex flex-col transition-colors ${
        isDark ? "bg-[#131722]" : "bg-white"
      }`}
      style={{
        boxShadow: isDark
          ? "inset 0 1px 0 rgba(255,255,255,0.05), 0 25px 60px rgba(0,0,0,0.35)"
          : "inset 0 1px 0 rgba(255,255,255,0.9), 0 20px 50px rgba(48,64,110,0.06)",
      }}
    >
      {/* CREATE NEW */}
      <div
        className={`absolute top-5 left-5 right-5 h-[82px] rounded-[28px] border-2 border-dashed flex items-center gap-5 px-7 z-10 transition-colors cursor-pointer ${
          isDark
            ? "bg-black/20 backdrop-blur-xl border-white/10"
            : "bg-white border-[#cfd4e4]"
        }`}
        style={{
          boxShadow: isDark
            ? "0 20px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)"
            : "0 20px 40px rgba(87,93,161,0.12), inset 0 1px 0 rgba(255,255,255,0.7)",
        }}
        onClick={() => setShowCreateModal(true)}
      >
        <div
          className={`w-14 h-14 rounded-[22px] flex items-center justify-center ${
            isDark ? "bg-white/[0.05]" : "bg-[#f1f2fb]"
          }`}
        >
          <Plus
            className={isDark ? "text-[#60a5fa]" : "text-[#2453c4]"}
            size={28}
          />
        </div>

        <span
          className={`text-[17px] font-semibold ${
            isDark ? "text-white" : "text-[#2d3142]"
          }`}
        >
          Create New
        </span>
      </div>

      {/* CHAT HEADER */}
      <div className="mt-24 px-4 flex items-center justify-between relative">
        <h2
          className={`text-[25px] font-bold ${
            isDark ? "text-white" : "text-[#262b38]"
          }`}
        >
          {showArchivedOnly
            ? "Archived Chats"
            : chatTab === "groups"
              ? "Groups"
              : "Chat"}
        </h2>

        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowChatListMenu((prev) => !prev);
            }}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              isDark ? "hover:bg-[#374151]" : "hover:bg-[#f4f6fc]"
            }`}
          >
            <MoreHorizontal
              className={isDark ? "text-[#9ca3af]" : "text-[#7b8197]"}
              size={20}
            />
          </button>

          {showChatListMenu && (
            <div
              className={`absolute top-10 right-0 rounded-[18px] p-2 min-w-[210px] z-[99999] ${
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
                  setShowArchivedOnly((prev) => !prev);
                  setShowChatListMenu(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-[14px] transition-colors text-left ${
                  isDark ? "hover:bg-white/[0.05]" : "hover:bg-[#f4f6fc]"
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center ${
                    isDark ? "bg-white/[0.05]" : "bg-[#eef2ff]"
                  }`}
                >
                  <FileArchive
                    size={16}
                    className={isDark ? "text-[#60a5fa]" : "text-[#2453c4]"}
                  />
                </div>

                <span
                  className={`text-[14px] font-medium ${
                    isDark ? "text-white" : "text-[#2d3142]"
                  }`}
                >
                  {showArchivedOnly ? "All Chats" : "Archived Chats"}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* SEARCH */}
      <div
        className={`mt-8 h-[42px] rounded-[16px] flex items-center px-5 ${
          isDark ? "bg-black/20 border-2 border-white/5" : "bg-[#eef0f7]"
        }`}
      >
        <input
          type="text"
          placeholder="Search Name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`bg-transparent outline-none flex-1 text-[13px] ${
            isDark ? "text-[#d1d5db]" : "text-[#7b8197]"
          }`}
        />
        <Search
          size={18}
          className={isDark ? "text-[#9ca3af]" : "text-[#7b8197]"}
        />
      </div>

      {/* CHAT LIST */}
      {chats ? (
        <div className="mt-6 overflow-y-auto overflow-x-visible flex-1 min-h-0 custom-scrollbar mr-[-10px] pr-[12px] relative z-[1]">
          {filteredChats.map((chat, index) => {
            const isSelected = selectedChat === chat;
            const backendUnreadCount = Array.isArray(notification)
              ? notification.filter(
                  (n) => n.chat?._id === chat._id && !n.isRead,
                ).length
              : 0;

            const forcedUnread = chat.readOverrides?.some(
              (entry) =>
                (entry.user?._id || entry.user)?.toString() ===
                  user._id?.toString() && entry.forceUnread,
            );

            const isCurrentlyOpen = selectedChat?._id === chat._id;

            const unreadCount =
              isCurrentlyOpen && !forcedUnread
                ? 0
                : backendUnreadCount > 0
                  ? backendUnreadCount
                  : forcedUnread
                    ? 1
                    : 0;

            return (
              <div
                key={chat._id}
                onClick={() => openChat(chat)}
                onMouseEnter={() => setHoveredChat(index)}
                onMouseLeave={() => setHoveredChat(null)}
                className={`
                  relative flex items-center gap-4
                  px-2 py-5 transition-all duration-300 overflow-visible rounded-l-[22px]
                  ${
                    isSelected
                      ? isDark
                        ? "bg-white/[0.06] rounded-r-[22px]"
                        : "bg-[#eef0fb] rounded-r-[22px]"
                      : isDark
                        ? "hover:bg-white/[0.04]"
                        : "hover:bg-[#f7f8fc]"
                  }
                `}
                style={{
                  ...(isSelected
                    ? {
                        marginRight: "0px",
                        paddingRight: "20px",
                      }
                    : {}),
                  zIndex: chatMenuOpen === index ? 9999 : 1,
                }}
              >
                {isSelected && (
                  <div
                    className={`absolute left-[-18px] top-5 w-[4px] h-[70px] rounded-full ${
                      isDark ? "bg-[#60a5fa]" : "bg-[#ff4ea1]"
                    }`}
                  />
                )}

                {/* AVATAR */}
                <div className="relative shrink-0">
                  <img
                    src={
                      !chat.isGroupChat
                        ? chat.users.find((u) => u._id !== loggedUser?._id)?.pic
                        : "https://ui-avatars.com/api/?name=" +
                          encodeURIComponent(chat.chatName)
                    }
                    alt=""
                    className="w-12 h-12 rounded-full object-cover"
                  />

                  {!chat.isGroupChat &&
                    (() => {
                      const otherUser = chat.users.find(
                        (u) => u._id !== loggedUser?._id,
                      );

                      const shouldHidePresence =
                        user?.privacy?.showLastSeen === false ||
                        otherUser?.privacy?.showLastSeen === false;

                      if (shouldHidePresence) {
                        return null;
                      }

                      const isOnline = onlineUsers?.includes(otherUser?._id);

                      return (
                        <div
                          className={`absolute bottom-0 right-0 w-3 h-3 border-2 rounded-full ${
                            isDark ? "" : "border-white"
                          } ${isOnline ? "bg-[#32d26e]" : "bg-slate-400"}`}
                        />
                      );
                    })()}
                </div>

                {/* CONTENT */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3 relative pr-10">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <h3
                        className={`text-[16px] leading-5 font-semibold truncate ${
                          unreadCount > 0
                            ? isDark
                              ? "text-[#60a5fa]"
                              : "text-[#2453c4]"
                            : isDark
                              ? "text-white"
                              : "text-[#2d3142]"
                        }`}
                      >
                        {!chat.isGroupChat
                          ? getSender(loggedUser, chat.users)
                          : chat.chatName}
                      </h3>

                      {chat.pinnedBy?.includes(user._id) && (
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                            isDark ? "bg-black/25" : "bg-white"
                          }`}
                          style={{
                            boxShadow: "0 6px 14px rgba(60,70,120,0.12)",
                          }}
                        >
                          <Pin
                            size={10}
                            className={`rotate-45 ${
                              isDark ? "text-[#60a5fa]" : "text-[#2453c4]"
                            }`}
                          />
                        </div>
                      )}
                    </div>

                    {/* UNREAD BADGE */}
                    {unreadCount > 0 && hoveredChat !== index && (
                      <div
                        className="absolute top-0 right-0 min-w-[22px] h-[22px] rounded-full bg-[#2453c4] flex items-center justify-center px-1.5 shrink-0"
                        style={{
                          boxShadow: "0 8px 18px rgba(36,83,196,0.22)",
                        }}
                      >
                        <span className="text-[11px] font-semibold text-white">
                          {unreadCount}
                        </span>
                      </div>
                    )}
                  </div>

                  {chat.latestMessage && (
                    <p
                      className={`text-[12px] mt-1 truncate max-w-[180px] ${
                        unreadCount > 0
                          ? isDark
                            ? "text-[#93c5fd] font-medium"
                            : "text-[#4a5aa8] font-medium"
                          : isDark
                            ? "text-[#9ca3af]"
                            : "text-[#7f869d]"
                      }`}
                    >
                      {getLatestMessagePreview(chat.latestMessage).length > 32
                        ? getLatestMessagePreview(chat.latestMessage).substring(
                            0,
                            33,
                          ) + "..."
                        : getLatestMessagePreview(chat.latestMessage)}
                    </p>
                  )}

                  {/* HOVER MENU */}
                  {hoveredChat === index && (
                    <div className="absolute top-4 right-2 z-[9999]">
                      {unreadCount > 0 && (
                        <div
                          className="absolute top-1 right-9 min-w-[22px] h-[22px] rounded-full bg-[#2453c4] flex items-center justify-center px-1.5 shrink-0"
                          style={{
                            boxShadow: "0 8px 18px rgba(36,83,196,0.22)",
                          }}
                        >
                          <span className="text-[11px] font-semibold text-white">
                            {unreadCount}
                          </span>
                        </div>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setChatMenuOpen(
                            chatMenuOpen === index ? null : index,
                          );
                        }}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                          isDark ? "hover:bg-[#374151]" : "hover:bg-white"
                        }`}
                      >
                        <MoreHorizontal
                          size={16}
                          className={
                            isDark ? "text-[#9ca3af]" : "text-[#7b8197]"
                          }
                        />
                      </button>

                      {chatMenuOpen === index && (
                        <div
                          className={`absolute top-10 right-0 rounded-[18px] p-2 min-w-[200px] z-[99999] ${
                            isDark
                              ? "bg-black/40 backdrop-blur-2xl"
                              : "bg-white"
                          }`}
                          style={{
                            boxShadow: "0 18px 40px rgba(40,50,90,0.14)",
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => togglePinChat(chat._id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-[14px] transition-colors text-left ${
                              isDark
                                ? "hover:bg-[#1f2937]"
                                : "hover:bg-[#f4f6fc]"
                            }`}
                          >
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                isDark ? "bg-white/[0.05]" : "bg-[#eef2ff]"
                              }`}
                            >
                              <Pin
                                size={15}
                                className={
                                  isDark ? "text-[#60a5fa]" : "text-[#2453c4]"
                                }
                              />
                            </div>

                            <span
                              className={`text-[14px] font-medium ${
                                isDark ? "text-white" : "text-[#2d3142]"
                              }`}
                            >
                              {chat.pinnedBy?.includes(user._id)
                                ? "Unpin Chat"
                                : "Pin Chat"}
                            </span>
                          </button>

                          <button
                            onClick={() => toggleArchiveChat(chat._id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-[14px] transition-colors text-left ${
                              isDark
                                ? "hover:bg-[#1f2937]"
                                : "hover:bg-[#f4f6fc]"
                            }`}
                          >
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                isDark ? "bg-white/[0.05]" : "bg-[#eef2ff]"
                              }`}
                            >
                              <FileArchive
                                size={15}
                                className={
                                  isDark ? "text-[#60a5fa]" : "text-[#2453c4]"
                                }
                              />
                            </div>

                            <span
                              className={`text-[14px] font-medium ${
                                isDark ? "text-white" : "text-[#2d3142]"
                              }`}
                            >
                              {chat.archivedBy?.some(
                                (id) =>
                                  (id._id || id)?.toString() ===
                                  user._id?.toString(),
                              )
                                ? "Unarchive Chat"
                                : "Archive Chat"}
                            </span>
                          </button>

                          {backendUnreadCount === 0 && !forcedUnread && (
                            <button
                              onClick={() => markChatAsUnread(chat._id)}
                              className={`w-full flex items-center gap-3 px-4 py-3 rounded-[14px] transition-colors text-left ${
                                isDark
                                  ? "hover:bg-[#1f2937]"
                                  : "hover:bg-[#f4f6fc]"
                              }`}
                            >
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                  isDark ? "bg-white/[0.05]" : "bg-[#eef2ff]"
                                }`}
                              >
                                <MessageSquare
                                  size={15}
                                  className={
                                    isDark ? "text-[#60a5fa]" : "text-[#2453c4]"
                                  }
                                />
                              </div>

                              <span
                                className={`text-[14px] font-medium ${
                                  isDark ? "text-white" : "text-[#2d3142]"
                                }`}
                              >
                                Mark as Unread
                              </span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="px-2 py-2">
          <ChatLoading />
        </div>
      )}
      {showCreateModal && (
        <div
          className="absolute inset-0 z-[999999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-5"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-[520px] rounded-[30px] p-6 ${
              isDark ? "bg-[#111827] border border-white/10" : "bg-white"
            }`}
            style={{
              boxShadow: "0 25px 60px rgba(0,0,0,0.25)",
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2
                className={`text-[22px] font-bold ${isDark ? "text-white" : "text-[#2d3142]"}`}
              >
                Create New Chat
              </h2>

              <button onClick={() => setShowCreateModal(false)}>
                <X className={isDark ? "text-white" : "text-[#2d3142]"} />
              </button>
            </div>

            <div
              className={`flex rounded-[18px] p-1 mb-5 ${isDark ? "bg-white/[0.05]" : "bg-[#eef2ff]"}`}
            >
              <button
                onClick={() => setCreateMode("direct")}
                className={`flex-1 py-3 rounded-[14px] font-semibold ${
                  createMode === "direct"
                    ? "bg-[#2453c4] text-white"
                    : isDark
                      ? "text-white"
                      : "text-[#2d3142]"
                }`}
              >
                Direct Chat
              </button>

              <button
                onClick={() => setCreateMode("group")}
                className={`flex-1 py-3 rounded-[14px] font-semibold ${
                  createMode === "group"
                    ? "bg-[#2453c4] text-white"
                    : isDark
                      ? "text-white"
                      : "text-[#2d3142]"
                }`}
              >
                Group Chat
              </button>
            </div>

            <input
              value={createMode === "group" ? groupName : userSearch}
              onChange={(e) => {
                if (createMode === "group") {
                  setGroupName(e.target.value);
                } else {
                  searchUsers(e.target.value);
                }
              }}
              placeholder={
                createMode === "group" ? "Group name" : "Search users"
              }
              className={`w-full h-[54px] px-5 rounded-[18px] outline-none mb-4 ${
                isDark
                  ? "bg-white/[0.05] text-white"
                  : "bg-[#f8f9fd] text-[#2d3142]"
              }`}
            />

            {createMode === "group" && (
              <>
                <input
                  value={userSearch}
                  onChange={(e) => searchUsers(e.target.value)}
                  placeholder="Add members"
                  className={`w-full h-[54px] px-5 rounded-[18px] outline-none mb-4 ${
                    isDark
                      ? "bg-white/[0.05] text-white"
                      : "bg-[#f8f9fd] text-[#2d3142]"
                  }`}
                />

                {selectedUsers.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {selectedUsers.map((u) => (
                      <div
                        key={u._id}
                        className="px-3 py-2 rounded-full bg-[#2453c4] text-white text-xs flex items-center gap-2"
                      >
                        {u.name}
                        <button
                          onClick={() =>
                            setSelectedUsers((prev) =>
                              prev.filter((x) => x._id !== u._id),
                            )
                          }
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            <div className="max-h-[280px] overflow-y-auto flex flex-col gap-2">
              {searchResults.map((u) => (
                <button
                  key={u._id}
                  onClick={() => {
                    if (createMode === "direct") {
                      createDirectChat(u);
                    } else {
                      if (!selectedUsers.some((x) => x._id === u._id)) {
                        setSelectedUsers((prev) => [...prev, u]);
                      }
                    }
                  }}
                  className={`flex items-center gap-3 p-3 rounded-[16px] text-left ${
                    isDark ? "hover:bg-white/[0.05]" : "hover:bg-[#f4f6fc]"
                  }`}
                >
                  <img
                    src={u.pic}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div>
                    <p
                      className={`font-medium ${isDark ? "text-white" : "text-[#2d3142]"}`}
                    >
                      {u.name}
                    </p>
                    <p className="text-xs text-[#7b8197]">{u.email}</p>
                  </div>
                </button>
              ))}
            </div>

            {createMode === "group" && (
              <button
                onClick={createGroupChat}
                className="w-full mt-5 h-[54px] rounded-[18px] bg-[#2453c4] text-white font-semibold"
              >
                Create Group
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
