import { Box } from "@chakra-ui/react";

const ChatLayout = ({ sidebar, chat }) => {
  return (
    <Box
      display="grid"
      gridTemplateColumns={{ base: "1fr", md: "280px 1fr" }}
      height="100vh"
      overflow="hidden"
      bg="gray.50"
    >
      <Box
        display={{ base: sidebar ? "block" : "none", md: "block" }}
        borderRight={{ md: "1px solid", base: "none" }}
        borderColor="gray.200"
        overflowY="auto"
        bg="white"
      >
        {sidebar}
      </Box>
      <Box position="relative" overflow="hidden">
        <Box
          position="absolute"
          inset={0}
          display="flex"
          flexDirection="column"
        >
          {chat}
        </Box>
      </Box>
    </Box>
  );
};

export default ChatLayout;