import axios from "axios";
import {
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  useDisclosure,
  useToast,
  Box,
  Tag,
  TagLabel,
  TagCloseButton,
  Spinner
} from "@chakra-ui/react";
import { useState, useEffect } from "react";
import { ChatState } from "../Context/ChatProvider";

const API = axios.create({
  baseURL: "/api",
});
API.interceptors.request.use((config) => {
  const raw = localStorage.getItem("userInfo");
  if (raw) {
    try {
      const u = JSON.parse(raw);
      if (u?.token) config.headers.Authorization = `Bearer ${u.token}`;
    } catch {}
  }
  return config;
});

const UpdateGroupChatModal = () => {
  const { selectedChat, setSelectedChat, setChats, user } = ChatState();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  const [name, setName] = useState(selectedChat?.chatName || "");
  const [search, setSearch] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(selectedChat?.chatName || "");
  }, [selectedChat]);

  if (!selectedChat?.isGroupChat) return null;

  const rename = async () => {
    if (!name.trim()) return;
    try {
      setSaving(true);
      const { data } = await API.put("/chat/rename", {
        chatId: selectedChat._id,
        chatName: name.trim(),
      });
      // Optimistic local update; server broadcast will sync others
      setSelectedChat(prev => ({ ...prev, chatName: data.chatName }));
      setChats(prev => prev.map(c => c._id === data._id ? { ...c, chatName: data.chatName } : c));
      // socket emit removed; server broadcasts.
    } catch {
      toast({ title: "Rename failed", status: "error", duration: 2500, isClosable: true });
    } finally {
      setSaving(false);
    }
  };

  const searchUsers = async (q) => {
    setSearch(q);
    if (!q.trim()) {
      setResults([]);
      return;
    }
    try {
      setSearchLoading(true);
      const { data } = await API.get(`/user?search=${encodeURIComponent(q.trim())}`);
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const addUser = async (u) => {
    if (selectedChat.users.find(x => x._id === u._id)) {
      toast({ title: "Already in group", status: "info", duration: 1500 });
      return;
    }
    try {
      const { data } = await API.put("/chat/groupadd", {
        chatId: selectedChat._id,
        userId: u._id,
      });
      setSelectedChat(data);
      setChats(prev => prev.map(c => c._id === data._id ? data : c));
      // socket?.emit("group users updated", { chatId: data._id, users: data.users });
    } catch {
      toast({ title: "Add failed", status: "error", duration: 2000 });
    }
  };

  const removeUser = async (u) => {
    try {
      const { data } = await API.put("/chat/groupremove", {
        chatId: selectedChat._id,
        userId: u._id,
      });
      setSelectedChat(data);
      setChats(prev => prev.map(c => c._id === data._id ? data : c));
      // socket?.emit("group users updated", { chatId: data._id, users: data.users });
    } catch {
      toast({ title: "Remove failed", status: "error", duration: 2000 });
    }
  };

  return (
    <>
      <Button size="sm" variant="outline" onClick={onOpen}>
        Group Settings
      </Button>
      <Modal isOpen={isOpen} onClose={onClose} isCentered size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Manage Group</ModalHeader>
          <ModalBody>
            <Box mb={4}>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Group name"
                mb={2}
              />
              <Button
                size="sm"
                onClick={rename}
                isLoading={saving}
                colorScheme="teal"
                disabled={!name.trim()}
              >
                Rename
              </Button>
            </Box>

            <Box mb={3}>
              <Box fontSize="sm" mb={1}>Members:</Box>
              <Box display="flex" flexWrap="wrap" gap="6px">
                {selectedChat.users.map(u => (
                  <Tag
                    key={u._id}
                    size="md"
                    borderRadius="full"
                    colorScheme="cyan"
                  >
                    <TagLabel>{u.name}</TagLabel>
                    {u._id !== user._id && (
                      <TagCloseButton onClick={() => removeUser(u)} />
                    )}
                  </Tag>
                ))}
              </Box>
            </Box>

            <Box>
              <Input
                value={search}
                onChange={e => searchUsers(e.target.value)}
                placeholder="Search users to add"
                mb={2}
              />
              {searchLoading && <Spinner size="sm" />}
              {!searchLoading && results.slice(0,5).map(r => (
                <Button
                  key={r._id}
                  onClick={() => addUser(r)}
                  size="sm"
                  variant="ghost"
                  w="100%"
                  justifyContent="flex-start"
                >
                  {r.name}
                </Button>
              ))}
            </Box>
          </ModalBody>
          <ModalFooter>
            <Button onClick={onClose} variant="ghost">Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default UpdateGroupChatModal;