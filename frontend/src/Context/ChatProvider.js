import React, { createContext, useContext, useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import io from "socket.io-client";

const ChatContext = createContext();

const ChatProvider = ({ children }) => {
  const [selectedChat, setSelectedChat] = useState();
  const [user, setUser] = useState();
  const [notification, setNotification] = useState([]);
  const [chats, setChats] = useState();
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [lastSeenMap, setLastSeenMap] = useState({});
  const [socket, setSocket] = useState(null);

  const addNotification = (newMessage) => {
    setNotification((prev) => {
      const exists = prev.some((msg) => msg._id === newMessage._id);
      if (exists) return prev;
      return [newMessage, ...prev];
    });
  };

  const history = useHistory();

  useEffect(() => {
    const userInfo = JSON.parse(localStorage.getItem("userInfo"));
    setUser(userInfo);

    if (userInfo) {
      const newSocket = io("http://localhost:5001");
      console.log("Connecting socket...");
      setSocket(newSocket);

      newSocket.emit("setup", userInfo);
      console.log("Setup emitted:", userInfo._id);

      newSocket.on("connected", () => {
        console.log("Socket connected");
      });

      // Get initial list of online users
      newSocket.on("online users", (users) => {
        console.log("Initial online users:", users);
        setOnlineUsers(users);
      });

      // Listen for users coming online
      newSocket.on("user online", (userId) => {
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
  }, [history]);

  return (
    <ChatContext.Provider
      value={{
        selectedChat,
        setSelectedChat,
        user,
        setUser,
        notification,
        setNotification,
        chats,
        setChats,
        onlineUsers,
        lastSeenMap,
        socket,
        addNotification,
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