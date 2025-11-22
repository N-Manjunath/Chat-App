const express = require("express");
const {
  allMessages,
  sendMessage,
  markSeen,
} = require("../controllers/messageControllers");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.route("/:chatId").get(protect, allMessages);
router.route("/").post(protect, sendMessage);
router.route("/seen").post(protect, markSeen);

module.exports = router;
