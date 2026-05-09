import { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import API from "../../config/api";
import ChatLoading from "../ChatLoading";
import ProfileModal from "./ProfileModal";
import UserListItem from "../UserAvatar/UserListItem";
import { ChatState } from "../../Context/ChatProvider";
import { decryptMessage } from "../../utils/encryption";

function SideDrawer() {
  const [search, setSearch] = useState("");
  const [searchResult, setSearchResult] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);

  const { setSelectedChat, user, chats, setChats } = ChatState();

  const [isOpen, setIsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    return document.documentElement.classList.contains("dark");
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  const onOpen = () => setIsOpen(true);
  const onClose = () => setIsOpen(false);

  const history = useHistory();

  const getLatestMessagePreview = (message) => {
    if (!message) {
      return "";
    }

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

  const logoutHandler = () => {
    localStorage.removeItem("userInfo");
    history.push("/");
  };

  const handleSearch = async () => {
    if (!search) {
      console.log("Please enter search");
      return;
    }

    try {
      setLoading(true);

      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };

      const { data } = await API.get(`/api/user?search=${search}`, config);

      setLoading(false);
      setSearchResult(data);
    } catch (error) {
      console.error("Failed to load search results");
      setLoading(false);
    }
  };

  const accessChat = async (userId) => {
    try {
      setLoadingChat(true);
      const config = {
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      };
      const { data } = await API.post(`/api/chat`, { userId }, config);

      if (!chats.find((c) => c._id === data._id)) setChats([data, ...chats]);
      setSelectedChat(data);
      setLoadingChat(false);
      onClose();
    } catch (error) {
      console.error("Error fetching the chat");
      setLoadingChat(false);
    }
  };

  return (
    <>
      <div className="w-full px-3 md:px-5 pt-3 md:pt-4 pb-2 bg-transparent">
        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/70 dark:bg-[#151821]/80 backdrop-blur-xl px-4 py-3 shadow-glass">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 text-sm font-bold text-white shadow-md">
              S
            </div>

            <div>
              <h1 className="text-sm md:text-base font-semibold tracking-tight text-slate-800 dark:text-white">
                AMIGOS
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Real-time messaging
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={() => setIsDarkMode((prev) => !prev)}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100/80 dark:bg-white/5 text-sm transition-all hover:scale-105 text-slate-700 dark:text-slate-200"
            >
              {isDarkMode ? "☀️" : "🌙"}
            </button>

            <button
              onClick={onOpen}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100/80 dark:bg-white/5 text-sm transition-all hover:scale-105 text-slate-700 dark:text-slate-200"
            >
              🔍
            </button>

            <div className="relative">
              <button
                onClick={() => setIsProfileOpen((prev) => !prev)}
                className="flex items-center gap-2 rounded-xl bg-slate-100/80 dark:bg-white/5 p-1.5 transition-all hover:scale-[1.02]"
              >
                <img
                  src={
                    user.pic ||
                    "https://ui-avatars.com/api/?name=" +
                      encodeURIComponent(user.name)
                  }
                  onError={(e) => {
                    e.target.src =
                      "https://ui-avatars.com/api/?name=" +
                      encodeURIComponent(user.name);
                  }}
                  className="h-8 w-8 rounded-xl object-cover"
                  alt={user.name}
                />
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 top-12 z-50 w-52 overflow-hidden rounded-2xl border border-white/10 bg-white/90 dark:bg-[#171a22]/95 backdrop-blur-xl shadow-elevated">
                  <div className="px-4 py-3 hover:bg-slate-100/70 dark:hover:bg-white/5 cursor-pointer transition-all text-sm text-slate-700 dark:text-slate-200">
                    <ProfileModal user={user}>
                      <span>My Profile</span>
                    </ProfileModal>
                  </div>

                  <div className="border-t border-white/10" />

                  <div
                    onClick={logoutHandler}
                    className="px-4 py-3 hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer transition-all text-sm text-rose-500"
                  >
                    Logout
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="w-full max-w-[360px] h-full bg-[#f5f5f5] dark:bg-[#0f1117] border-r border-white/10 shadow-elevated overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200/70 dark:border-white/10 bg-white/70 dark:bg-[#151821]/80 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-slate-800 dark:text-white">
                    Messages
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Start conversations instantly
                  </p>
                </div>

                <button
                  onClick={onClose}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 transition-all hover:scale-105"
                >
                  ✕
                </button>
              </div>

              <div className="flex items-center gap-2 rounded-2xl bg-white dark:bg-[#1a1e27] border border-slate-200 dark:border-white/10 px-3 py-2 shadow-sm">
                <span className="text-sm text-slate-400">🔍</span>

                <input
                  className="flex-1 bg-transparent outline-none text-sm text-slate-700 dark:text-slate-100 placeholder:text-slate-400"
                  placeholder="Search by name or email"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />

                <button
                  onClick={handleSearch}
                  className="rounded-xl bg-gradient-to-r from-orange-400 to-amber-500 px-3 py-1.5 text-xs font-medium text-white transition-all hover:scale-[1.02]"
                >
                  Search
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-[#f5f5f5] dark:bg-[#0f1117]">
              {loading ? (
                <ChatLoading />
              ) : (
                searchResult?.map((user) => (
                  <div
                    key={user._id}
                    className="rounded-2xl bg-white/90 dark:bg-[#171b24] border border-slate-200/60 dark:border-white/5 p-1 shadow-sm transition-all hover:shadow-md hover:-translate-y-[1px]"
                  >
                    <UserListItem
                      user={user}
                      handleFunction={() => accessChat(user._id)}
                    />
                  </div>
                ))
              )}

              {loadingChat && (
                <p className="text-center text-sm text-slate-500 dark:text-slate-400 py-3 animate-pulse">
                  Opening conversation...
                </p>
              )}
            </div>
          </div>

          <div
            className="flex-1 bg-black/30 backdrop-blur-[2px]"
            onClick={onClose}
          />
        </div>
      )}
    </>
  );
}

export default SideDrawer;
