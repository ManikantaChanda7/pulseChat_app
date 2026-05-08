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
      className={`${selectedChat ? "hidden md:flex" : "flex"} flex-col items-center p-3 bg-white w-full md:w-[31%] rounded-lg border`}
    >
      <div className="pb-3 px-3 text-[28px] md:text-[30px] font-semibold flex w-full justify-between items-center">
        My Chats
          <GroupChatModal>
          <button className="flex items-center gap-2 bg-gray-200 px-3 py-1 rounded-md text-sm">
            New Group Chat
          </button>
        </GroupChatModal>
      </div>

      <input
        type="text"
        placeholder="Search chats..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full mb-2 p-2 rounded-md border bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
      />

      <div className="flex flex-col p-3 bg-gray-100 w-full h-full rounded-lg overflow-hidden">
        {chats ? (
          <div className="flex flex-col gap-2 overflow-y-scroll">
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
                  className={`cursor-pointer px-3 py-2 rounded-lg ${
                    selectedChat === chat
                      ? "bg-teal-500 text-white"
                      : "bg-gray-200 text-black"
                  }`}
                  key={chat._id}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <p>
                        {!chat.isGroupChat
                          ? getSender(loggedUser, chat.users)
                          : chat.chatName}
                      </p>

                      {!chat.isGroupChat && (() => {
                        const otherUser = chat.users.find((u) => u._id !== loggedUser._id);
                        const isOnline = onlineUsers?.includes(otherUser?._id);

                        return (
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${
                              isOnline ? "bg-green-500" : "bg-gray-400"
                            }`}
                          />
                        );
                      })()}
                    </div>
                    <div className="flex items-center gap-2">
                      {chat.pinnedBy?.includes(user._id) && (
                        <span title="Pinned">📌</span>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePinChat(chat._id);
                        }}
                        className="text-xs hover:scale-110 transition-transform"
                        title={
                          chat.pinnedBy?.includes(user._id)
                            ? "Unpin Chat"
                            : "Pin Chat"
                        }
                      >
                        {chat.pinnedBy?.includes(user._id) ? "📍" : "📌"}
                      </button>

                      {unreadCount > 0 && (
                        <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                  {chat.latestMessage && (
                    <p className="text-xs">
                      <b>{chat.latestMessage.sender.name} : </b>
                      {getLatestMessagePreview(chat.latestMessage).length > 50
                        ? getLatestMessagePreview(chat.latestMessage).substring(0, 51) + "..."
                        : getLatestMessagePreview(chat.latestMessage)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          ) :(
          <ChatLoading />
          )}
      </div>
    </div>
  );
};

export default MyChats;