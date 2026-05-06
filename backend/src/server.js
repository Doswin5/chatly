import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import http from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import User from "./models/userModel.js";

import { connectDB } from "./config/db.js";

import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import conversationRoutes from "./routes/conversationRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:5173",
];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/messages", messageRoutes);

app.get("/", (req, res) => {
  res.status(200).json({
    message: "Chatly API is running",
  });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is healthy",
  });
});

const onlineUsers = new Map();

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("Authentication error: token missing"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return next(new Error("Authentication error: user not found"));
    }

    socket.user = user;

    next();
  } catch (error) {
    next(new Error("Authentication error: invalid token"));
  }
});

io.on("connection", (socket) => {
  const userId = socket.user._id.toString();

  socket.join(userId);

  onlineUsers.set(userId, socket.id);

  io.emit("onlineUsers", Array.from(onlineUsers.keys()));

  console.log(`${socket.user.name} connected: ${socket.id}`);

  socket.on("joinConversation", (conversationId) => {
    socket.join(conversationId);
  });

  socket.on("sendMessage", (message) => {
  const conversationId = message.conversation?._id || message.conversation;

  if (!conversationId) return;

  socket.to(conversationId).emit("receiveMessage", message);

  const participants = message.conversation?.participants || [];

  participants.forEach((participant) => {
    const participantId = participant._id || participant;

    if (participantId.toString() !== userId) {
      io.to(participantId.toString()).emit("sidebarMessage", message);
    }
  });
});

  socket.on("typing", ({ conversationId }) => {
    socket.to(conversationId).emit("typing", {
      conversationId,
      userId,
      name: socket.user.name,
    });
  });

  socket.on("stopTyping", ({ conversationId }) => {
    socket.to(conversationId).emit("stopTyping", {
      conversationId,
      userId,
    });
  });

  socket.on("messagesRead", ({ conversationId }) => {
    socket.to(conversationId).emit("messagesRead", {
      conversationId,
      userId,
    });
  });

  socket.on("disconnect", () => {
    onlineUsers.delete(userId);

    io.emit("onlineUsers", Array.from(onlineUsers.keys()));

    console.log(`${socket.user.name} disconnected`);
  });
});

connectDB();

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
