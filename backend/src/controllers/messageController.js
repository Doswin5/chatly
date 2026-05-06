import Conversation from "../models/conversationModel.js";
import Message from "../models/messageModel.js";

export const sendMessage = async (req, res) => {
  try {
    const { conversationId, text } = req.body;

    if (!conversationId || !text?.trim()) {
      return res.status(400).json({
        message: "Conversation ID and message text are required",
      });
    }

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({
        message: "Conversation not found",
      });
    }

    const isParticipant = conversation.participants.some(
      (participantId) => participantId.toString() === req.user._id.toString(),
    );

    if (!isParticipant) {
      return res.status(403).json({
        message: "You are not allowed to send messages in this conversation",
      });
    }

    let message = await Message.create({
      conversation: conversationId,
      sender: req.user._id,
      text: text.trim(),
      readBy: [req.user._id],
    });

    conversation.latestMessage = message._id;
    await conversation.save();

    message = await Message.findById(message._id)
      .populate("sender", "-password")
      .populate("conversation");

    res.status(201).json({
      message,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to send message",
      error: error.message,
    });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({
        message: "Conversation not found",
      });
    }

    const isParticipant = conversation.participants.some(
      (participantId) => participantId.toString() === req.user._id.toString(),
    );

    if (!isParticipant) {
      return res.status(403).json({
        message: "You are not allowed to view this conversation",
      });
    }

    const messages = await Message.find({
      conversation: conversationId,
    })
      .populate("sender", "-password")
      .sort({ createdAt: 1 });

    res.status(200).json({
      messages,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to fetch messages",
      error: error.message,
    });
  }
};


export const markMessagesAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({
        message: "Conversation not found",
      });
    }

    const isParticipant = conversation.participants.some(
      (participantId) => participantId.toString() === req.user._id.toString(),
    );

    if (!isParticipant) {
      return res.status(403).json({
        message: "You are not allowed to read this conversation",
      });
    }

    await Message.updateMany(
      {
        conversation: conversationId,
        readBy: { $ne: req.user._id },
      },
      {
        $addToSet: {
          readBy: req.user._id,
        },
      },
    );

    const messages = await Message.find({
      conversation: conversationId,
    })
      .populate("sender", "-password")
      .sort({ createdAt: 1 });

    res.status(200).json({
      messages,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to mark messages as read",
      error: error.message,
    });
  }
};