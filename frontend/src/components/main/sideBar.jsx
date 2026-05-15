import React, { useState } from "react";
import { ChatState } from "../../Context/ChatProvider";
import { useHistory } from "react-router-dom";
import { FileText, MessageSquare, Users, Bell, Settings } from "lucide-react";

export default function LeftSidebar({ chatTab, setChatTab }) {
  const history = useHistory();
  const isDark = localStorage.getItem("darkMode") === "true";
  const { notification, user } = ChatState();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const unreadCount = Array.isArray(notification)
  ? notification.filter((n) => !n.isRead).length
  : 0;

  const handleLogout = () => {
    localStorage.removeItem("userInfo");
    localStorage.removeItem("token");
    history.push("/");
  };

  return (
    <div
      className={`w-[94px] rounded-[34px] flex flex-col items-center py-10 relative transition-colors ${
        isDark
          ? "bg-[#191d30]"
          : "bg-[#2453c4]"
      }`}
    >
      {/* LOGO */}
      <div
        className={`w-12 h-12 rounded-full border-[3px] relative mb-16 ${
          isDark ? "border-white/20" : "border-white"
        }`}
      >
        <div className="absolute w-3 h-3 rounded-full bg-white left-[-6px] top-4" />
        <div className="absolute w-3 h-3 rounded-full bg-white right-[-6px] top-4" />
      </div>

      {/* MENU */}
      <div
        className={`flex-1 flex flex-col justify-center gap-10 items-center ${
          isDark ? "text-white/75" : "text-white/95"
        }`}
      >
        <div className="relative">
          <FileText
            onClick={() => history.push("/media")}
            size={22}
            className="cursor-pointer"
          />

          {history.location.pathname === "/media" && (
            <div
              className={`absolute -left-8 top-[-8px] w-[3px] h-10 rounded-full ${
                isDark ? "bg-[#60a5fa]" : "bg-white"
              }`}
            />
          )}
        </div>

        <div className="relative">
          <MessageSquare
            onClick={() => history.push("/chats")}
            size={22}
            className="cursor-pointer"
          />
          {chatTab === "direct" && (
            <div
              className={`absolute -left-8 top-[-8px] w-[3px] h-10 rounded-full ${
                isDark ? "bg-[#60a5fa]" : "bg-white"
              }`}
            />
          )}
        </div>
        <div className="relative">
          <Users
            onClick={() => history.push("/groups")}
            className="cursor-pointer"
            size={22}
          />
          {history.location.pathname === "/groups" && (
            <div
              className={`absolute -left-8 top-[-8px] w-[3px] h-10 rounded-full ${
                isDark ? "bg-[#60a5fa]" : "bg-white"
              }`}
            />
          )}
        </div>

        <div className="relative">
          <Bell
            onClick={() => history.push("/notifications")}
            className="cursor-pointer"
            size={22}
          />

          {unreadCount > 0 && (
            <div className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-[#f35ca6] text-white text-[10px] font-semibold flex items-center justify-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </div>
          )}

          {history.location.pathname === "/notifications" && (
            <div
              className={`absolute -left-8 top-[-8px] w-[3px] h-10 rounded-full ${
                isDark ? "bg-[#60a5fa]" : "bg-white"
              }`}
            />
          )}
        </div>

        <div className="relative">
          <Settings
            onClick={() => history.push("/settings")}
            className="cursor-pointer"
            size={22}
          />

          {history.location.pathname === "/settings" && (
            <div
              className={`absolute -left-8 top-[-8px] w-[3px] h-10 rounded-full ${
                isDark ? "bg-[#60a5fa]" : "bg-white"
              }`}
            />
          )}
        </div>
      </div>

      {/* PROFILE */}
      <div className="mt-auto pt-6 relative">
        <button
          className="relative group"
          onClick={() => setShowProfileMenu((prev) => !prev)}
        >
          <img
            src={
              user?.pic ||
              "https://ui-avatars.com/api/?name=" +
                encodeURIComponent(user?.name || "User")
            }
            alt="Profile"
            className={`w-12 h-12 rounded-full object-cover border-[3px] shadow-lg transition-transform group-hover:scale-105 ${
              isDark ? "border-white/15" : "border-white/90"
            }`}
          />

          <div
            className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-[#32d26e] border-2 ${
              isDark ? "border-[#111827]" : "border-[#2453c4]"
            }`}
          />
        </button>

        {showProfileMenu && (
          <div
            className={`absolute bottom-16 left-0 min-w-[150px] rounded-[18px] p-2 shadow-xl z-50 ${
              isDark
                ? "bg-[#111827] border border-white/10"
                : "bg-white border border-[#e5e7eb]"
            }`}
          >
            <button
              onClick={() => {
                setShowProfileMenu(false);
                history.push("/profile");
              }}
              className={`w-full text-left px-4 py-3 rounded-[12px] text-[14px] font-medium ${
                isDark
                  ? "text-white hover:bg-white/[0.05]"
                  : "text-[#2d3142] hover:bg-[#f4f6fc]"
              }`}
            >
              Profile
            </button>

            <button
              onClick={handleLogout}
              className={`w-full text-left px-4 py-3 rounded-[12px] text-[14px] font-medium ${
                isDark
                  ? "text-white hover:bg-white/[0.05]"
                  : "text-[#2d3142] hover:bg-[#f4f6fc]"
              }`}
            >
              Log Out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
