import { useState } from "react";
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
      <div className="flex justify-between items-center bg-white w-full px-3 py-2 border-b">
        <button
          onClick={onOpen}
          className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-100"
        >
          <span>🔍</span>
          <span className="hidden md:block">Search User</span>
        </button>

        <p className="text-xl font-semibold">AMIGOS</p>

        <div className="relative">
          <button
            onClick={() => setIsProfileOpen((prev) => !prev)}
            className="flex items-center gap-2"
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
              className="h-8 w-8 rounded-full object-cover"
              alt={user.name}
            />
            <span>▾</span>
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-40 bg-white border rounded shadow">
              <div className="px-3 py-2 hover:bg-gray-100 cursor-pointer">
                <ProfileModal user={user}>
                  <span>My Profile</span>
                </ProfileModal>
              </div>
              <div className="border-t" />
              <div
                onClick={logoutHandler}
                className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
              >
                Logout
              </div>
            </div>
          )}
        </div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 flex z-50">
          <div className="w-[300px] bg-white p-3">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-semibold">Search Users</h2>
              <button onClick={onClose}>✕</button>
            </div>

            <div className="flex gap-2 mb-2">
              <input
                className="border p-2 flex-1 rounded"
                placeholder="Search by name or email"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button
                onClick={handleSearch}
                className="bg-blue-500 text-white px-3 rounded"
              >
                Go
              </button>
            </div>

            {loading ? (
              <ChatLoading />
            ) : (
              searchResult?.map((user) => (
                <UserListItem
                  key={user._id}
                  user={user}
                  handleFunction={() => accessChat(user._id)}
                />
              ))
            )}

            {loadingChat && <p className="text-center">Loading...</p>}
          </div>

          <div className="flex-1 bg-black bg-opacity-40" onClick={onClose} />
        </div>
      )}
    </>
  );
}

export default SideDrawer;
