const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  sendMessage,
  allMessages,
  readMessages
} = require("../controllers/messageControllers");

router.post("/", protect, sendMessage);
router.get("/:chatId", protect, allMessages);
router.put("/read", protect, readMessages);

module.exports = router;
