import API from "../config/api";
import { useEffect } from "react";

import ChatLoading from "./ChatLoading";
import { ChatState } from "../Context/ChatProvider";
import { useState } from "react";
import {getSender} from "../config/ChatLogics";

import { decryptMessage } from "../utils/encryption";
import GroupChatModal from "../components/miscellaneous/GroupChatModal";


const MyChats = ({ fetchAgain }) => {
  const [loggedUser, setLoggedUser] = useState();
  const [search, setSearch] = useState("");

  const { selectedChat, setSelectedChat, user, chats, setChats, onlineUsers, notification, setNotification } = ChatState();

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
    // console.log(user._id);
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
    fetchChats();
    // eslint-disable-next-line
  }, [fetchAgain]);

  const togglePinChat = async (chatId) => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };

      const { data } = await API.put(
        `/api/chat/pin/${chatId}`,
        {},
        config
      );

      setChats((prev) => {
        const updated = prev.map((chat) =>
          chat._id === data._id ? data : chat
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

  return (
    <div
      className={`${selectedChat ? "hidden md:flex" : "flex"} w-full md:w-[340px] lg:w-[360px] flex-col rounded-[28px] bg-[#f5f5f5] dark:bg-[#0f1117] border border-slate-200/70 dark:border-white/5 overflow-hidden shadow-glass h-full`}
    >
      <div className="px-4 pt-4 pb-3 border-b border-slate-200/70 dark:border-white/5 bg-white/70 dark:bg-[#151821]/70 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-800 dark:text-white">
              Messages
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              All conversations
            </p>
          </div>

          <GroupChatModal>
            <button className="flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-orange-400 to-amber-500 px-4 text-xs font-medium text-white shadow-sm transition-all hover:scale-[1.02]">
              <span className="text-sm">＋</span>
              New Group
            </button>
          </GroupChatModal>
        </div>

        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1e27] px-3 py-2 shadow-sm">
          <span className="text-sm text-slate-400">🔍</span>

          <input
            type="text"
            placeholder="Search conversations"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm text-slate-700 dark:text-slate-100 placeholder:text-slate-400 outline-none"
          />
        </div>

        <div className="mt-4 flex items-center gap-4 overflow-x-auto whitespace-nowrap text-[11px] font-medium text-slate-500 dark:text-slate-400 scrollbar-hide">
          <button className="rounded-full bg-orange-100 dark:bg-orange-500/10 px-3 py-1 text-orange-500">
            All messages
          </button>

          <button className="transition-colors hover:text-slate-700 dark:hover:text-slate-200">
            Unread
          </button>

          <button className="transition-colors hover:text-slate-700 dark:hover:text-slate-200">
            Favorites
          </button>

          <button className="transition-colors hover:text-slate-700 dark:hover:text-slate-200">
            Groups
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden bg-[#f5f5f5] dark:bg-[#0f1117] px-3 py-3">
        {chats ? (
          <div className="flex flex-col gap-2 overflow-y-auto pr-1">
            {[...chats]
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
              .map((chat) => {
              const unreadCount = notification.filter(
                (n) => n.chat._id === chat._id
              ).length;
              return (
                <div
                  onClick={() => {
                    setSelectedChat(chat);
                    setNotification((prev) => prev.filter((n) => n.chat._id !== chat._id));
                  }}
                  className={`group cursor-pointer rounded-2xl border px-3 py-3 transition-all duration-200 hover:-translate-y-[1px] hover:shadow-sm ${
                    selectedChat === chat
                      ? "bg-gradient-to-r from-orange-400 to-amber-500 border-orange-300 text-white shadow-md"
                      : "bg-white dark:bg-[#171b24] border-slate-200/70 dark:border-white/5 text-slate-800 dark:text-slate-100 hover:bg-white/90 dark:hover:bg-[#1b202a]"
                  }`}
                  key={chat._id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold tracking-tight">
                          {!chat.isGroupChat
                            ? getSender(loggedUser, chat.users)
                            : chat.chatName}
                        </p>

                        {!chat.isGroupChat && (() => {
                          const otherUser = chat.users.find((u) => u._id !== loggedUser._id);
                          const isOnline = onlineUsers?.includes(otherUser?._id);

                          return (
                            <span
                              className={`mt-0.5 h-2.5 w-2.5 rounded-full border border-white/50 ${
                                isOnline ? "bg-emerald-500" : "bg-slate-400"
                              }`}
                            />
                          );
                        })()}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {chat.pinnedBy?.includes(user._id) && (
                        <span
                          title="Pinned"
                          className="text-[10px] opacity-70"
                        >
                          📌
                        </span>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePinChat(chat._id);
                        }}
                        className="text-[11px] opacity-60 transition-all hover:scale-110 hover:opacity-100"
                        title={
                          chat.pinnedBy?.includes(user._id)
                            ? "Unpin Chat"
                            : "Pin Chat"
                        }
                      >
                        {chat.pinnedBy?.includes(user._id) ? "📍" : "📌"}
                      </button>

                      {unreadCount > 0 && (
                        <span className="min-w-[20px] rounded-full bg-orange-500 px-1.5 py-0.5 text-center text-[10px] font-medium text-white shadow-sm">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                  {chat.latestMessage && (
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <p
                        className={`truncate text-[11px] leading-relaxed ${
                          selectedChat === chat
                            ? "text-white/90"
                            : "text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        <span className="font-medium">
                          {chat.latestMessage.sender.name}:
                        </span>{" "}

                        {getLatestMessagePreview(chat.latestMessage).length > 45
                          ? getLatestMessagePreview(chat.latestMessage).substring(0, 46) + "..."
                          : getLatestMessagePreview(chat.latestMessage)}
                      </p>

                      <span
                        className={`text-[10px] whitespace-nowrap ${
                          selectedChat === chat
                            ? "text-white/70"
                            : "text-slate-400"
                        }`}
                      >
                        now
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          ) :(
          <div className="px-2 py-2">
            <ChatLoading />
          </div>
          )}
      </div>
    </div>
  );
};

export default MyChats;