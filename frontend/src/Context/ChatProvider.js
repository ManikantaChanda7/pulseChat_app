import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useHistory } from "react-router-dom";
import io from "socket.io-client";
import axios from "axios";

const ChatContext = createContext();

const ChatProvider = ({ children }) => {
  const [selectedChat, setSelectedChat] = useState();
  const [user, setUser] = useState();
  const [notification, setNotification] = useState([]);
  const [chats, setChats] = useState();
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [lastSeenMap, setLastSeenMap] = useState({});
  const [socket, setSocket] = useState(null);

  const history = useHistory();

  const fetchNotifications = useCallback(async (authUser) => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${authUser.token}`,
        },
      };

      const { data } = await axios.get(
        "http://localhost:5001/api/notification",
        config,
      );

      setNotification(data);
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    }
  }, []);

  useEffect(() => {
    const userInfo = JSON.parse(localStorage.getItem("userInfo"));
    setUser(userInfo);

    if (userInfo) {
      const newSocket = io("http://localhost:5001");
      console.log("Connecting socket...");
      setSocket(newSocket);

      fetchNotifications(userInfo);

      newSocket.emit("setup", userInfo);
      console.log("Setup emitted:", userInfo._id);

      newSocket.on("connected", () => {
        console.log("Socket connected");
      });

      newSocket.on("notification received", (incomingNotification) => {
        const incomingChatId =
          incomingNotification?.chat?._id || incomingNotification?.chat;

        const activeChatId = selectedChat?._id;

        if (
          incomingChatId &&
          activeChatId &&
          incomingChatId.toString() === activeChatId.toString()
        ) {
          return;
        }

        fetchNotifications(userInfo);
      });

      // Get initial list of online users
      newSocket.on("online users", (users) => {
        console.log("Initial online users:", users);
        setOnlineUsers(users);
      });

      // Listen for users coming online
      newSocket.on("user online", (userId) => {
        if (userInfo?.privacy?.showLastSeen === false) {
          return;
        }
        console.log("User online event received:", userId);
        setOnlineUsers((prev) => {
          if (prev.includes(userId)) return prev;
          const updated = [...prev, userId];
          console.log("Updated online users:", updated);
          return updated;
        });
      });

      // Listen for users going offline
      newSocket.on("user offline", ({ userId, lastSeen }) => {
        if (userInfo?.privacy?.showLastSeen === false) {
          return;
        }
        console.log("User offline event received:", {
          userId,
          lastSeen,
        });

        setOnlineUsers((prev) => {
          const updated = prev.filter((id) => id !== userId);
          console.log("Updated online users:", updated);
          return updated;
        });

        setLastSeenMap((prev) => ({
          ...prev,
          [userId]: lastSeen,
        }));
      });

      // Cleanup on unmount
      return () => newSocket.disconnect();
    }

    if (!userInfo) history.push("/");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history, fetchNotifications]);

  return (
    <ChatContext.Provider
      value={{
        selectedChat,
        setSelectedChat,
        user,
        setUser,
        lastSeenMap,
        setLastSeenMap,
        setOnlineUsers,
        notification,
        setNotification,
        chats,
        setChats,
        onlineUsers,
        socket,
        fetchNotifications,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const ChatState = () => {
  return useContext(ChatContext);
};

export default ChatProvider;
