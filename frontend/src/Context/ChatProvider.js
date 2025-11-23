import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import axios from "axios";
const ENDPOINT = "http://localhost:5000";

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("userInfo")) || null; } catch { return null; }
  });
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [notifications, setNotifications] = useState([]); // added
  const socketRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    if (!socketRef.current) {
      socketRef.current = io(ENDPOINT);
      socketRef.current.emit("setup", user);
      socketRef.current.on("connected", () => setSocketConnected(true));
      socketRef.current.on("group renamed", (updatedChat) => {
        setChats(prev => prev.map(c => c._id === updatedChat._id ? updatedChat : c));
        setSelectedChat(sc => sc && sc._id === updatedChat._id ? updatedChat : sc);
      });
    }
    return () => {
      if (socketRef.current) {
        socketRef.current.off("group renamed");
        socketRef.current.disconnect();
      }
    };
  }, [user]);

  useEffect(() => {
    if (!socketRef.current) return;
    chats.forEach(chat => chat?._id && socketRef.current.emit("join chat", chat._id));
  }, [chats]);

  const api = axios.create({ baseURL: "/api" });
  api.interceptors.request.use(cfg => {
    const raw = localStorage.getItem("userInfo");
    if (raw) {
      try {
        const u = JSON.parse(raw);
        if (u?.token) cfg.headers.Authorization = `Bearer ${u.token}`;
      } catch {}
    }
    return cfg;
  });

  const value = {
    user,
    setUser,
    chats,
    setChats,
    selectedChat,
    setSelectedChat,
    socket: socketRef.current,
    socketConnected,
    notifications,
    setNotifications,
    api
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const ChatState = () => useContext(ChatContext);
export default ChatProvider;
