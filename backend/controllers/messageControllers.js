const mongoose = require("mongoose");
const Message = require("../models/messageModel");
const Chat = require("../models/chatModel");
const { getIO } = require("../socket");
const expressAsyncHandler = require("express-async-handler");

//@description     Get all Messages
//@route           GET /api/Message/:chatId
//@access          Protected
const allMessages = expressAsyncHandler(async (req, res) => {
  const { chatId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(chatId))
    return res.status(400).json({ error: "invalid chatId" });

  try {
    const msgs = await Message.find({ chat: chatId })
      .sort({ createdAt: 1 })
      .populate("sender", "name pic email")
      .populate("chat");
    return res.json(msgs);
  } catch (e) {
    console.error("allMessages error", e.message);
    return res.status(500).json({ error: "fetch failed" });
  }
});

//@description     Create New Message
//@route           POST /api/Message/
//@access          Protected
const sendMessage = async (req, res) => {
  const { content, chatId } = req.body;
  if (!content || !chatId) return res.status(400).json({ error: "content and chatId required" });
  if (!mongoose.Types.ObjectId.isValid(chatId))
    return res.status(400).json({ error: "invalid chatId" });

  try {
    let message = await Message.create({
      sender: req.user._id,
      content: content.trim(),
      chat: chatId,
      deliveredTo: [],
      readBy: []
    });

    // Populate fresh message
    message = await Message.findById(message._id)
      .populate("sender", "name pic email")
      .populate({
        path: "chat",
        populate: { path: "users", select: "name pic email" }
      });

    // Mark delivered (all other users)
    const recipients = message.chat.users.filter(
      u => u._id.toString() !== req.user._id.toString()
    );
    message.deliveredTo = recipients.map(r => r._id);
    await message.save();

    // Update latestMessage reference in chat
    await Chat.findByIdAndUpdate(chatId, { latestMessage: message._id });

    // Broadcast
    req.app.get("io").to(chatId).emit("message received", message);

    return res.json(message);
  } catch (e) {
    console.error("sendMessage error", e.message);
    return res.status(500).json({ error: "send failed" });
  }
};

//@description     Mark Messages as Seen
//@route           POST /api/Message/:chatId
//@access          Protected
const markSeen = async (req, res) => {
  const { chatId } = req.body;
  if (!chatId) return res.status(400).json({ error: "chatId required" });
  // Implement if needed
  res.json({ ok: true });
};

// mark messages read
const readMessages = async (req, res) => {
  const { chatId } = req.body;
  if (!chatId) return res.status(400).json({ error: "chatId required" });
  if (!mongoose.Types.ObjectId.isValid(chatId))
    return res.status(400).json({ error: "invalid chatId" });

  try {
    const userId = req.user._id;
    const unreadIds = await Message.find({
      chat: chatId,
      readBy: { $ne: userId }
    }).distinct("_id");

    if (unreadIds.length) {
      await Message.updateMany(
        { _id: { $in: unreadIds } },
        { $addToSet: { readBy: userId } }
      );
      req.app.get("io").to(chatId).emit("messages read", {
        chatId,
        userId,
        messageIds: unreadIds
      });
    }
    return res.json({ ok: true, updated: unreadIds.length });
  } catch (e) {
    console.error("readMessages error", e.message);
    return res.status(500).json({ error: "read update failed" });
  }
};

module.exports = { sendMessage, allMessages, readMessages };
