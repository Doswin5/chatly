import express from "express";
import {
  sendMessage,
  getMessages,
  markMessagesAsRead,
} from "../controllers/messageController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, sendMessage);
router.get("/:conversationId", protect, getMessages);
router.patch("/:conversationId/read", protect, markMessagesAsRead);

export default router;