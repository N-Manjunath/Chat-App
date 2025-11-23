import axios from "axios";
import { useEffect, useState } from "react";
import { socket } from "../socket";

export const useChat = (chatId) => {
  const [selectedChat, setSelectedChat] = useState(null);
  const [groupChatName, setGroupChatName] = useState("");
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const fetchChat = async () => {
      if (!chatId) return;
      try {
        const { data } = await axios.get(`/api/chat/${chatId}`);
        setSelectedChat(data);
        setGroupChatName(data.chatName);
        setMessages(data.messages || []);
      } catch {
        // handle error
      }
    };
    fetchChat();
  }, [chatId]);

  return { selectedChat, groupChatName, messages };
};