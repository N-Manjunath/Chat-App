const asyncHandler = require("express-async-handler");
const Message = require("../models/messageModel");
const Chat = require("../models/chatModel");
const { getIO } = require("../socket");

//@description     Get all Messages
//@route           GET /api/Message/:chatId
//@access          Protected
const allMessages = asyncHandler(async (req, res) => {
  const messages = await Message.find({ chat: req.params.chatId })
    .populate("sender", "name pic email")
    .populate("chat");
  res.json(messages);
});

//@description     Create New Message
//@route           POST /api/Message/
//@access          Protected
const sendMessage = async (req, res) => {
  const { content, chatId } = req.body;
  if (!content || !chatId) return res.sendStatus(400);
  try {
    const chat = await Chat.findById(chatId).populate("users", "name email pic");
    if (!chat) return res.status(404).json({ error: "Chat not found" });

    let message = await Message.create({
      sender: req.user._id,
      content,
      chat: chatId,
      status: "sent",
    });

    message = await message.populate("sender", "name pic email");
    message.chat = chat;

    await Chat.findByIdAndUpdate(chatId, { latestMessage: message });

    const io = getIO();
    const recipients = (chat.users || []).filter(
      (u) => u._id.toString() !== req.user._id.toString()
    );

    recipients.forEach((u) => {
      io.to(u._id.toString()).emit("message recieved", message);
    });

    if (recipients.length) {
      await Message.findByIdAndUpdate(message._id, { status: "delivered" });
      message.status = "delivered";
      io.to(req.user._id.toString()).emit("message delivered", {
        messageId: message._id.toString(),
      });
    }

    res.json(message);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

//@description     Mark Messages as Seen
//@route           POST /api/Message/:chatId
//@access          Protected
const markSeen = async (req, res) => {
  const { chatId } = req.body;
  if (!chatId) return res.sendStatus(400);
  try {
    const toUpdate = await Message.find({
      chat: chatId,
      sender: { $ne: req.user._id },
      status: { $in: ["sent", "delivered"] },
    }).select("_id");
    const ids = toUpdate.map((m) => m._id);
    if (ids.length) {
      await Message.updateMany(
        { _id: { $in: ids } },
        { $set: { status: "seen" } }
      );
      const io = getIO();
      io.to(chatId.toString()).emit("message seen", {
        messageIds: ids.map(String),
      });
    }
    res.json({ updated: ids.length, ids });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

module.exports = { allMessages, sendMessage, markSeen };
