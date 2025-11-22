import { Avatar } from "@chakra-ui/avatar";
import { Box, Text } from "@chakra-ui/layout";
import { ChatState } from "../../Context/ChatProvider";

const UserListItem = ({ handleFunction, user }) => {
  const { user: loggedIn } = ChatState();

  // Detect if we actually received a chat object instead of a plain user
  const isChat = user && (user.isGroupChat || Array.isArray(user.users));

  let displayName = "";
  let avatarSrc = "";
  let avatarName = "";

  if (isChat) {
    if (user.isGroupChat) {
      displayName = user.chatName;
      avatarName = user.chatName;
      avatarSrc = user.groupPic || "";
    } else {
      // One-to-one chat: pick the other participant
      const other = user.users?.find((u) => u._id !== loggedIn?._id);
      displayName = other?.name || "Unknown";
      avatarName = other?.name || "Unknown";
      avatarSrc = other?.pic || "";
    }
  } else {
    // Plain user entry (search result)
    displayName = user?.name || "Unknown";
    avatarName = user?.name || "Unknown";
    avatarSrc = user?.pic || "";
  }

  return (
    <Box
      onClick={handleFunction}
      cursor="pointer"
      bg="#E8E8E8"
      _hover={{ background: "#38B2AC", color: "white" }}
      w="100%"
      display="flex"
      alignItems="center"
      color="black"
      px={3}
      py={2}
      mb={2}
      borderRadius="lg"
    >
      <Avatar
        mr={2}
        size="sm"
        cursor="pointer"
        name={avatarName}
        src={avatarSrc}
      />
      <Box>
        <Text fontSize={{ base: "sm", md: "md" }}>{displayName}</Text>
        {!isChat && (
          <Text fontSize="xs">
            <b>Email: </b>
            {user?.email}
          </Text>
        )}
        {isChat && user.isGroupChat && (
          <Text fontSize="xs" color="gray.600">
            Group • {user.users?.length || 0} members
          </Text>
        )}
      </Box>
    </Box>
  );
};

export default UserListItem;
