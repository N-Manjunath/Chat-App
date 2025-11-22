import { Box, useBreakpointValue } from "@chakra-ui/react";
import { useEffect, useRef } from "react";
import { ChatState } from "../Context/ChatProvider";

// WhatsApp‑style ticks
const TICK_COLORS = {
  sent: "#4A5568",
  delivered: "#4A5568",
  seen: "#34B7F1",
};

const StatusTicks = ({ status }) => {
  if (!status) return null;
  const color = TICK_COLORS[status] || "#4A5568";
  const single = (
    <path
      d="M5 13l4 4L19 7"
      stroke={color}
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
  const second = (
    <path
      d="M11 13l4 4L25 5"
      stroke={color}
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
  const isDouble = status === "delivered" || status === "seen";
  return (
    <Box ml={1}>
      <svg width="16" height="16" viewBox="0 0 30 24">
        {single}
        {isDouble && second}
      </svg>
    </Box>
  );
};

const sameId = (a, b) => a && b && a.toString() === b.toString();

const isMine = (m, user) => {
  const s = m?.sender;
  if (!s) return false;
  if (typeof s === "string") return sameId(s, user._id) || sameId(s, user.id);
  return (
    sameId(s._id, user._id) ||
    sameId(s.id, user._id) ||
    sameId(s._id, user.id) ||
    sameId(s.id, user.id)
  );
};

const ScrollableChat = ({ messages }) => {
  const { user } = ChatState();
  const endRef = useRef(null);

  // Responsive message bubble max width
  const bubbleMaxW = useBreakpointValue({
    base: "90%",
    sm: "85%",
    md: "75%",
    lg: "60%",
  });
  const fontSize = useBreakpointValue({ base: "14px", md: "15px" });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <Box
      display="flex"
      flexDirection="column"
      overflowY="auto"
      width="100%"
      height="100%"
      py={{ base: 2, md: 3 }}
      px={{ base: 2, md: 3 }}
      // Allow space for mobile safe-area (iOS notch)
      pb={`calc(env(safe-area-inset-bottom, 0px) + 8px)`}
    >
      {messages.map((m) => {
        const mine = isMine(m, user);
        const status = mine ? (m.status || "sent") : undefined;
        return (
          <Box
            key={m._id}
            alignSelf={mine ? "flex-end" : "flex-start"}
            mb={{ base: 2, md: 3 }}
            maxW={bubbleMaxW}
            width="fit-content"
          >
            <Box
              bg={mine ? "#DCF8C6" : "#FFFFFF"}
              border="1px solid #E0E0E0"
              color="black"
              px={{ base: 3, md: 4 }}
              py={{ base: 2, md: 2 }}
              borderRadius="18px"
              fontSize={fontSize}
              boxShadow="sm"
              position="relative"
              whiteSpace="pre-wrap"
              wordBreak="break-word"
            >
              {m.content}
              {mine && (
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="flex-end"
                  mt={1}
                  fontSize="10px"
                >
                  <StatusTicks status={status} />
                </Box>
              )}
            </Box>
          </Box>
        );
      })}
      <div ref={endRef} />
    </Box>
  );
};

export default ScrollableChat;
