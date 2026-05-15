import React, { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import LeftSidebar from "./sideBar";
import { ChatState } from "../../Context/ChatProvider";
import { Bell, Trash2 } from "lucide-react";
import axios from "axios";
import { decryptMessage } from "../../utils/encryption";

const formatTime = (dateString) => {
  if (!dateString) return "Now";
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return "Now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString();
};

const getPreview = (item) => {
  switch (item?.type) {
    case "mention":
      return "mentioned you";

    case "reply":
      return "replied to your message";

    case "reaction":
    case "group":
    case "system":
      return item?.preview;

    default:
      if (!item?.preview) return "sent a message";

      try {
        return decryptMessage(item.preview);
      } catch {
        return item.preview;
      }
  }
};

export default function NotificationsPage() {
  const history = useHistory();
  const {
    notification,
    setNotification,
    setSelectedChat,
    user,
    fetchNotifications,
    chats,
  } = ChatState();

  const isDark = localStorage.getItem("darkMode") === "true";

  const [activeFilter, setActiveFilter] = useState("unread");

  const filteredNotifications = notification.filter((item) => {
    if (activeFilter === "unread") return !item.isRead;
    if (activeFilter === "read") return item.isRead;
    return true;
  });

  useEffect(() => {
    if (user?.token) {
      fetchNotifications(user);
    }
  }, [user, fetchNotifications]);

  const openNotification = async (item) => {
    if (!item?.chat || !user?.token) return;

    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };

      await axios.patch(
        `http://localhost:5001/api/notification/${item._id}/read`,
        {},
        config,
      );
    } catch (error) {
      console.error("Failed to mark notification read", error);
    }

    const fullChat = Array.isArray(chats)
      ? chats.find((c) => c._id === item.chat._id)
      : null;
    setSelectedChat(fullChat || item.chat);
    setNotification((prev) =>
      prev.map((n) =>
        n._id === item._id
          ? {
              ...n,
              isRead: true,
            }
          : n,
      ),
    );
    history.push(item.chat?.isGroupChat ? "/groups" : "/t");
  };

  return (
    <div
      className={`h-screen w-screen p-4 overflow-hidden ${
        isDark
          ? "bg-[radial-gradient(circle_at_top,#1e3a5f_0%,#0b1020_45%,#050814_100%)]"
          : "bg-[#dfe3ee]"
      }`}
    >
      <div
        className={`w-full h-full rounded-[44px] p-[14px] flex gap-[14px] overflow-hidden ${
          isDark
            ? "bg-black/30 backdrop-blur-2xl border border-white/10"
            : "bg-[#2453c4]"
        }`}
      >
        <LeftSidebar />

        <div
          className={`flex-1 rounded-[34px] p-8 overflow-y-auto custom-scrollbar ${
            isDark
              ? "bg-white/[0.03] backdrop-blur-xl border border-white/5"
              : "bg-[#eef0fb]"
          }`}
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1
                className={`text-[30px] font-bold ${isDark ? "text-white" : "text-[#2d3142]"}`}
              >
                Notifications
              </h1>
              <p
                className={`mt-2 ${isDark ? "text-[#9ca3af]" : "text-[#7b8197]"}`}
              >
                Recent activity and unread messages
              </p>
            </div>

            {notification.length > 0 && (
              <button
                onClick={async () => {
                  try {
                    const config = {
                      headers: {
                        Authorization: `Bearer ${user.token}`,
                      },
                    };

                    await axios.delete(
                      "http://localhost:5001/api/notification",
                      config,
                    );
                    setNotification([]);
                  } catch (error) {
                    console.error("Failed to clear notifications", error);
                  }
                }}
                className={`flex items-center gap-2 px-5 py-3 rounded-[18px] ${
                  isDark
                    ? "bg-black/30 backdrop-blur-xl border border-white/10 text-white hover:bg-white/[0.05]"
                    : "bg-white text-[#2d3142]"
                }`}
              >
                <Trash2 size={16} />
                Clear All
              </button>
            )}
          </div>

          {notification.length > 0 && (
            <div className="flex items-center gap-3 mb-6">
              {[
                { key: "all", label: `All (${notification.length})` },
                {
                  key: "unread",
                  label: `Unread (${notification.filter((n) => !n.isRead).length})`,
                },
                {
                  key: "read",
                  label: `Read (${notification.filter((n) => n.isRead).length})`,
                },
              ].map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setActiveFilter(filter.key)}
                  className={`px-4 py-2 rounded-[16px] text-sm font-medium transition-all ${
                    activeFilter === filter.key
                      ? isDark
                        ? "bg-[#2453c4] text-white"
                        : "bg-[#2453c4] text-white"
                      : isDark
                        ? "bg-white/[0.04] border border-white/10 text-[#9ca3af] hover:text-white"
                        : "bg-white text-[#68708d] hover:text-[#2d3142]"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          )}

          {filteredNotifications.length === 0 ? (
            <div
              className={`h-[70vh] rounded-[30px] flex flex-col items-center justify-center gap-5 ${
                isDark
                  ? "bg-white/[0.04] backdrop-blur-2xl border border-white/10"
                  : "bg-white"
              }`}
            >
              <div
                className={`w-20 h-20 rounded-full flex items-center justify-center ${isDark ? "bg-white/[0.05]" : "bg-[#eef2ff]"}`}
              >
                <Bell
                  size={32}
                  className={isDark ? "text-white" : "text-[#2453c4]"}
                />
              </div>
              <div className="text-center">
                <h3
                  className={`text-xl font-semibold ${isDark ? "text-white" : "text-[#2d3142]"}`}
                >
                  No notifications
                </h3>
                <p
                  className={`mt-2 ${isDark ? "text-[#9ca3af]" : "text-[#7b8197]"}`}
                >
                  You're all caught up.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredNotifications.map((item) => (
                <button
                  key={item._id}
                  onClick={() => openNotification(item)}
                  className={`w-full text-left rounded-[24px] p-5 transition-all hover:scale-[1.01] ${
                    isDark
                      ? "bg-white/[0.05] backdrop-blur-xl border border-white/8 hover:bg-white/[0.08]"
                      : "bg-white hover:bg-[#f8faff]"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <img
                      src={item?.actor?.pic || "/default-avatar.png"}
                      alt="sender"
                      className="w-14 h-14 rounded-full object-cover"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <h3
                            className={`font-semibold ${isDark ? "text-white" : "text-[#2d3142]"}`}
                          >
                            {item?.actor?.name || "System"}
                          </h3>
                          <p
                            className={`text-sm mt-1 ${isDark ? "text-[#9ca3af]" : "text-[#7b8197]"}`}
                          >
                            {item?.chat?.isGroupChat
                              ? item.chat.chatName
                              : "Direct message"}
                          </p>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span
                            className={`text-xs ${isDark ? "text-[#9ca3af]" : "text-[#7b8197]"}`}
                          >
                            {formatTime(item.createdAt)}
                          </span>
                          {!item.isRead && (
                            <div className="w-2.5 h-2.5 rounded-full bg-[#f35ca6]" />
                          )}
                        </div>
                      </div>

                      <p
                        className={`mt-3 truncate ${isDark ? "text-[#d1d5db]" : "text-[#4b5563]"}`}
                      >
                        {getPreview(item)}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
