import Conversation from "../models/conversationModel.js";
import User from "../models/userModel.js";
import Message from "../models/messageModel.js";

export const createOrGetConversation = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        message: "User ID is required",
      });
    }

    if (userId === req.user._id.toString()) {
      return res.status(400).json({
        message: "You cannot start a conversation with yourself",
      });
    }

    const otherUser = await User.findById(userId);

    if (!otherUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    let conversation = await Conversation.findOne({
      participants: {
        $all: [req.user._id, userId],
        $size: 2,
      },
    })
      .populate("participants", "-password")
      .populate("latestMessage");

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [req.user._id, userId],
      });

      conversation = await Conversation.findById(conversation._id)
        .populate("participants", "-password")
        .populate("latestMessage");
    }

    res.status(200).json({
      conversation,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create or fetch conversation",
    });
  }
};

export const getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id,
    })
      .populate("participants", "-password")
      .populate("latestMessage")
      .sort({ updatedAt: -1 });

    const conversationsWithUnreadCounts = await Promise.all(
      conversations.map(async (conversation) => {
        const unreadCount = await Message.countDocuments({
          conversation: conversation._id,
          sender: { $ne: req.user._id },
          readBy: { $ne: req.user._id },
        });

        return {
          ...conversation.toObject(),
          unreadCount,
        };
      }),
    );

    res.status(200).json({
      conversations: conversationsWithUnreadCounts,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch conversations",
      error: error.message,
    });
  }
};