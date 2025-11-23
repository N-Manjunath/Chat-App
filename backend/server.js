require("dotenv").config({ path: __dirname + "/.env" });

const express = require("express");
const cors = require("cors");
const app = express();

const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: { origin: "http://localhost:3000", credentials: true },
});

app.set("io", io);

io.on("connection", (socket) => {
  socket.on("setup", (user) => {
    socket.join(user._id);
    socket.emit("connected");
  });
  socket.on("join chat", (chatId) => socket.join(chatId));

  socket.on("mark read", ({ chatId }) => {
    // server will not directly mutate DB here; client calls REST /message/read
    // this event optional; can be removed
  });

  socket.on("new message", (msg) => {
    if (msg?.chat?._id) io.to(msg.chat._id).emit("message received", msg);
  });
});

app.use(cors({
  origin: "http://localhost:3000",
  methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization"],
  credentials: true
}));
app.use(express.json());

const connectDB = require("./config/db");
if (!process.env.MONGO_URI) {
  console.error("MONGO_URI not set");
  process.exit(1);
}
connectDB();

app.use("/api/user", require("./routes/userRoutes"));
app.use("/api/chat", require("./routes/chatRoutes"));
app.use("/api/message", require("./routes/messageRoutes"));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server on ${PORT}`));
