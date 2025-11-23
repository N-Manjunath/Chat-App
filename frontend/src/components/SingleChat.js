import { FormControl } from "@chakra-ui/form-control";
import { Input } from "@chakra-ui/input";
import { Box, Text } from "@chakra-ui/layout";
import "./styles.css";
import { IconButton, Spinner, useToast } from "@chakra-ui/react";
import { getSender, getSenderFull } from "../config/ChatLogics";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { ChatState } from "../Context/ChatProvider";
import { ArrowBackIcon, ArrowForwardIcon } from "@chakra-ui/icons";
import ProfileModal from "./miscellaneous/ProfileModal";
import ScrollableChat from "./ScrollableChat";
import Lottie from "react-lottie";
import animationData from "../animations/typing.json";
import UpdateGroupChatModal from "./UpdateGroupChatModal";

// Removed unused io / ENDPOINT (socket comes from context)

const SingleChat = ({ fetchAgain, setFetchAgain }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [typing, setTyping] = useState(false);
  const [istyping, setIsTyping] = useState(false);
  const toast = useToast();

  const {
    selectedChat,
    setSelectedChat,
    user,
    socket,
    setChats,
    notifications,
    setNotifications,
    socketConnected: ctxSocketConnected,
    api
  } = ChatState();
  // Removed notification (unused). Add back if you display it.

  const defaultOptions = {
    loop: true,
    autoplay: true,
    animationData,
    rendererSettings: { preserveAspectRatio: "xMidYMid slice" },
  };

  // Track current chat id to compare in socket events
  const activeChatIdRef = useRef(null);
  const messageIdsRef = useRef(new Set());

  // Dedup + stable callback
  const addMessageSafe = useCallback((msg) => {
    const id = msg?._id;
    if (!id) {
      setMessages(prev => [...prev, msg]);
      return;
    }
    if (messageIdsRef.current.has(id)) return;
    messageIdsRef.current.add(id);
    setMessages(prev => [...prev, msg]);
  }, []);

  // fetchMessages wrapped; include user token dependency if token used inside
  const fetchMessages = useCallback(async () => {
    const id = selectedChat?._id;
    if (!id || id.length !== 24) return; // skip invalid id
    try {
      setLoading(true);
      const { data } = await api.get(`/message/${id}`);
      setMessages(data);
      setLoading(false);
      socket?.emit("join chat", id);
    } catch {
      setLoading(false);
    }
  }, [selectedChat, api, socket]);

  // sendMessage function (replace current POST)
  const sendMessage = async () => {
    const text = newMessage.trim();
    if (!text || !selectedChat?._id) return;
    try {
      setNewMessage("");
      const { data } = await api.post("/message", {
        content: text,
        chatId: selectedChat._id,
      });
      addMessageSafe(data);
      socket?.emit("new message", data);
    } catch (e) {
      console.log("sendMessage 400 debug", e.response?.status, e.response?.data);
      toast({
        title: "Send failed",
        status: "error",
        duration: 2000,
        isClosable: true,
      });
    }
  };

  const typingHandler = (e) => {
    setNewMessage(e.target.value);
    if (!ctxSocketConnected) return;
    if (!typing) {
      setTyping(true);
      socket.emit("typing", selectedChat._id);
    }
    const lastTypingTime = new Date().getTime();
    const timerLength = 3000;
    setTimeout(() => {
      const timeNow = new Date().getTime();
      const timeDiff = timeNow - lastTypingTime;
      if (timeDiff >= timerLength && typing) {
        socket.emit("stop typing", selectedChat._id);
        setTyping(false);
      }
    }, timerLength);
  };

  // Listener effect (replace the crashing one)
  useEffect(() => {
    if (!socket) return; // guard against null
    const handleTyping = () => setIsTyping(true);
    const handleStopTyping = () => setIsTyping(false);
    socket.on("typing", handleTyping);
    socket.on("stop typing", handleStopTyping);
    return () => {
      socket.off("typing", handleTyping);
      socket.off("stop typing", handleStopTyping);
    };
  }, [socket]);

  // Effect that sets activeChatId / fetches messages:
  useEffect(() => {
    activeChatIdRef.current = selectedChat?._id || null;
    fetchMessages();
  }, [fetchMessages, selectedChat]);

  // Socket listener effect (no reassignment to socket)
  useEffect(() => {
    if (!socket) return;
    const handleIncoming = (newMessage) => {
      const chatId = newMessage?.chat?._id;
      if (chatId && chatId === activeChatIdRef.current) {
        // Ensure sender object populated
        if (typeof newMessage.sender === "string" && selectedChat?.users) {
          const found = selectedChat.users.find(
            u => u._id === newMessage.sender || u.id === newMessage.sender
          );
            if (found) newMessage.sender = found;
        }
        addMessageSafe(newMessage);
      } else {
        // If you reintroduce notification, handle here
        setNotifications(prev => [newMessage, ...prev]);
      }
    };
    socket.on("message received", handleIncoming);
    return () => socket.off("message received", handleIncoming);
  }, [socket, selectedChat, addMessageSafe, setNotifications]);

  // Join chat effect
  useEffect(() => {
    const id = selectedChat?._id;
    if (!id || id.length !== 24) return;
    socket?.emit("join chat", id);
    (async () => {
      try {
        await api.put("/message/read", { chatId: id });
      } catch {}
    })();
  }, [selectedChat, socket, api]);

  // New effect for message read status
  useEffect(() => {
    if (!socket) return;
    const handleRead = ({ messageIds, userId }) => {
      setMessages(prev =>
        prev.map(m =>
          messageIds.includes(m._id)
            ? { ...m, readBy: [...new Set([...(m.readBy || []), userId])] }
            : m
        )
      );
    };
    socket.on("messages read", handleRead);
    return () => socket.off("messages read", handleRead);
  }, [socket]);

  return (
    <>
      {selectedChat ? (
        <>
          <Text
            fontSize={{ base: "28px", md: "30px" }}
            pb={3}
            px={2}
            w="100%"
            fontFamily="Work sans"
            d="flex"
            justifyContent={{ base: "space-between" }}
            alignItems="center"
          >
            <IconButton
              d={{ base: "flex", md: "none" }}
              icon={<ArrowBackIcon />}
              onClick={() => setSelectedChat(null)}
              aria-label="Back"
            />
            {messages &&
              (!selectedChat.isGroupChat ? (
                <>
                  {getSender(user, selectedChat.users)}
                  <ProfileModal
                    user={getSenderFull(user, selectedChat.users)}
                  />
                </>
              ) : (
                <>
                  {selectedChat.chatName.toUpperCase()}
                  {selectedChat?.isGroupChat && <UpdateGroupChatModal />}
                </>
              ))}
          </Text>
          <Box
            d="flex"
            flexDir="column"
            justifyContent="flex-end"
            p={3}
            bg="#E8E8E8"
            w="100%"
            h="100%"
            borderRadius="lg"
            overflowY="hidden"
          >
            {loading ? (
              <Spinner size="xl" w={20} h={20} alignSelf="center" margin="auto" />
            ) : (
              <div className="messages">
                <ScrollableChat
                  messages={messages}
                  isGroup={selectedChat?.isGroupChat}
                  participants={selectedChat?.users}
                />
              </div>
            )}

              <FormControl
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              id="message-input"
              isRequired
              mt={3}
            >
            {istyping && (
                <div>
                  <Lottie
                    options={defaultOptions}
                    width={70}
                    style={{ marginBottom: 15, marginLeft: 0 }}
                  />
                </div>
              )}
              <Box display="flex" alignItems="center">
                <Input
                  flex="1"
                  variant="filled"
                  bg="#E0E0E0"
                  placeholder="Enter a message.."
                  value={newMessage}
                  onChange={typingHandler}
                />
                {/*
                  Change color based on input content.
                  hasText => teal solid, empty => gray outline.
                */}
                <IconButton
                  ml={2}
                  icon={<ArrowForwardIcon />}
                  onClick={sendMessage}
                  aria-label="Send"
                  colorScheme={newMessage.trim() ? "teal" : "gray"}
                  variant={newMessage.trim() ? "solid" : "outline"}
                />
              </Box>
            </FormControl>
          </Box>
        </>
      ) : (
        <Box d="flex" alignItems="center" justifyContent="center" h="100%">
          <Text fontSize="3xl" pb={3} fontFamily="Work sans">
            Click on a user to start chatting
          </Text>
        </Box>
      )}
    </>
  );
};

export default SingleChat;
