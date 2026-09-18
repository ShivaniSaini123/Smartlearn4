const connections = {};
const messages = {};
const nameMap = {};
const timeOnline = {};

const registerWebRTCSocketHandlers = (socket, io) => {
  socket.on("join-call", (roomId, username) => {
    console.log(`WebRTC: ${username} joined room: ${roomId}`);
    if (!connections[roomId]) connections[roomId] = [];
    if (!connections[roomId].includes(socket.id)) {
      connections[roomId].push(socket.id);
    }
    nameMap[socket.id] = username || "Anonymous";
    timeOnline[socket.id] = new Date();
    const newUserName = nameMap[socket.id];

    connections[roomId].forEach((clientId) => {
      io.to(clientId).emit("user-joined", socket.id, connections[roomId], newUserName);
    });

    // Send chat history to newly joined participant
    if (messages[roomId]) {
      messages[roomId].forEach((msg) => {
        io.to(socket.id).emit("chat-message", msg.data, msg.sender, msg["socket-id-sender"]);
      });
    }
  });

  socket.on("signal", (toId, message) => {
    io.to(toId).emit("signal", socket.id, message);
  });

  socket.on("chat-message", (data, sender) => {
    const room = Object.keys(connections).find((key) => connections[key].includes(socket.id));
    if (room) {
      if (!messages[room]) messages[room] = [];
      messages[room].push({ sender, data, "socket-id-sender": socket.id });

      connections[room].forEach((clientId) => {
        io.to(clientId).emit("chat-message", data, sender, socket.id);
      });
    }
  });

  socket.on("disconnect", () => {
    const room = Object.keys(connections).find((key) => connections[key].includes(socket.id));
    const name = nameMap[socket.id] || "Someone";

    if (room) {
      connections[room] = connections[room].filter((id) => id !== socket.id);
      connections[room].forEach((clientId) => {
        io.to(clientId).emit("user-left", socket.id, name);
      });

      if (connections[room].length === 0) delete connections[room];
    }

    delete nameMap[socket.id];
    delete timeOnline[socket.id];
  });
};

module.exports = { registerWebRTCSocketHandlers };

