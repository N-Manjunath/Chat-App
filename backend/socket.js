let io;

function init(server) {
  io = require("socket.io")(server, {
    pingTimeout: 60000,
    cors: { origin: "http://localhost:3000" },
  });

  io.on("connection", (socket) => {
    socket.on("setup", (userData) => {
      if (userData?._id) socket.join(userData._id);
      socket.emit("connected");
    });
    socket.on("join chat", (room) => room && socket.join(room));
    socket.on("typing", (room) => room && socket.in(room).emit("typing"));
    socket.on("stop typing", (room) => room && socket.in(room).emit("stop typing"));
  });

  return io;
}

function getIO() {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
}

module.exports = { init, getIO };