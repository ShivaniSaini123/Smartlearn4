require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const { Server } = require("socket.io");
const mongoose = require("mongoose");

// Import MongoDB connection and routes
require("./config/database").connect();
const userRoutes = require("./routes/user");
const msgController = require("./Controllers/messageController");
const { registerWebRTCSocketHandlers } = require("./Controllers/socketManager");

const app = express();
const server = http.createServer(app);

// Allowed Frontend Origins (Local & Production Vercel)
const defaultOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://smartlearnproject-virid.vercel.app",
];

const parseOrigins = (urlEnv) => {
  if (!urlEnv) return [];
  return urlEnv
    .split(",")
    .map((url) => url.trim().replace(/\/+$/, ""))
    .filter(Boolean);
};

const allowedOrigins = Array.from(
  new Set([...defaultOrigins, ...parseOrigins(process.env.FRONTEND_URL)])
);

const isOriginAllowed = (origin) => {
  if (!origin) return true; // Allow non-browser requests (e.g. mobile apps, curl, server-to-server)
  const normalized = origin.trim().replace(/\/+$/, "");
  return allowedOrigins.includes(normalized);
};

// Socket.IO setup for real-time communication & WebRTC signaling
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive in dev if needed, origin-matched
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
});
app.set("io", io);

// ✅ Production Security Middleware
const corsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      return callback(null, true);
    }
    return callback(new Error("CORS policy violation: Origin not allowed"), false);
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  credentials: true,
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
  ],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Rate Limiting for sensitive authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many authentication requests, please try again later." },
});
app.use("/api/v1/login", authLimiter);
app.use("/api/v1/register", authLimiter);
app.use("/api/v1/verify-otp", authLimiter);

// Health Check Endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// API Routes
app.use("/api/v1", userRoutes);

// Socket.IO Events (Chat & WebRTC Signaling)
io.on("connection", (socket) => {
  // Register WebRTC call signaling
  registerWebRTCSocketHandlers(socket, io);

  // Join user to personal room based on email for targeted delivery
  socket.on("set_email", (email) => {
    if (email) {
      socket.join(email.trim().toLowerCase());
    }
  });

  // Handle sending real-time chat message
  socket.on("send_message", async (msgData) => {
    try {
      if (!msgData || !msgData.to || !msgData.from) return;
      const toRoom = msgData.to.trim().toLowerCase();
      const fromRoom = msgData.from.trim().toLowerCase();

      const recipientOnline = io.sockets.adapter.rooms.has(toRoom);
      const savedMessage = await msgController.saveMessage(msgData, recipientOnline, io);

      if (savedMessage) {
        io.to(toRoom).emit("receive_message", savedMessage);
        io.to(fromRoom).emit("message_saved", savedMessage);
      }
    } catch (error) {
      console.error("Error sending socket message:", error.message);
    }
  });

  // Mark messages as read
  socket.on("mark_messages_read", async ({ user1, user2 }) => {
    try {
      if (!user1 || !user2) return;
      await msgController.markMessagesRead(user1, user2);

      io.to(user1.trim().toLowerCase()).emit("messages_read_update", { user1, user2 });
      io.to(user2.trim().toLowerCase()).emit("messages_read_update", { user1, user2 });
    } catch (error) {
      console.error("Error marking socket messages read:", error.message);
    }
  });
});

// Safe Global Error Handler (never leaks stack traces in production)
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err.message);
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === "production" ? "Internal server error" : err.message,
  });
});

// Server Listen
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

