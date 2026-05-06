import { useEffect, useRef, useState } from "react";
import {
  getMessages,
  sendMessage,
  markMessagesAsRead,
} from "../api/messageApi";
import { socket } from "../socket/socket";
import toast from "react-hot-toast";

export default function ChatBox({
  selectedConversation,
  currentUser,
  onlineUsers,
}) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [typingUser, setTypingUser] = useState(null);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const otherUser = selectedConversation.participants.find(
    (participant) => participant._id !== currentUser._id,
  );
  const isOtherUserOnline = onlineUsers.includes(otherUser?._id);

  const fetchMessages = async () => {
    try {
      setLoadingMessages(true);

      await getMessages(selectedConversation._id);

      const readRes = await markMessagesAsRead(selectedConversation._id);
      setMessages(readRes.data.messages);

      socket.emit("messagesRead", {
        conversationId: selectedConversation._id,
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch messages");
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (!selectedConversation?._id) return;

    socket.emit("joinConversation", selectedConversation._id);

    fetchMessages();
  }, [selectedConversation?._id]);

  useEffect(() => {
    const handleReceiveMessage = async (message) => {
      const messageConversationId =
        message.conversation?._id || message.conversation;

      if (messageConversationId !== selectedConversation?._id) return;

      setMessages((prev) => {
        const alreadyExists = prev.some((item) => item._id === message._id);

        if (alreadyExists) return prev;

        return [...prev, message];
      });

      try {
        const readRes = await markMessagesAsRead(selectedConversation._id);

        setMessages(readRes.data.messages);

        socket.emit("messagesRead", {
          conversationId: selectedConversation._id,
        });
      } catch (error) {
        console.error("Failed to mark live message as read", error);
      }

      if (onMessageSent) {
        onMessageSent();
      }
    };

    socket.on("receiveMessage", handleReceiveMessage);

    const handleMessagesRead = ({ conversationId, userId }) => {
      if (conversationId !== selectedConversation?._id) return;

      setMessages((prev) =>
        prev.map((message) => {
          if (message.sender._id !== currentUser._id) return message;

          const alreadyRead = message.readBy?.includes(userId);

          if (alreadyRead) return message;

          return {
            ...message,
            readBy: [...(message.readBy || []), userId],
          };
        }),
      );
    };

    socket.on("messagesRead", handleMessagesRead);

    return () => {
      socket.off("receiveMessage", handleReceiveMessage);
      socket.off("messagesRead", handleMessagesRead);
    };
  }, [selectedConversation?._id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!text.trim()) return;

    try {
      setSending(true);

      const res = await sendMessage({
        conversationId: selectedConversation._id,
        text,
      });

      const savedMessage = res.data.message;

      setMessages((prev) => [...prev, savedMessage]);

      socket.emit("sendMessage", savedMessage);

      setText("");
      socket.emit("stopTyping", {
        conversationId: selectedConversation._id,
      });

    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    const handleTyping = ({ conversationId, userId, name }) => {
      if (conversationId !== selectedConversation?._id) return;
      if (userId === currentUser._id) return;

      setTypingUser(name);
    };

    const handleStopTyping = ({ conversationId, userId }) => {
      if (conversationId !== selectedConversation?._id) return;
      if (userId === currentUser._id) return;

      setTypingUser(null);
    };

    socket.on("typing", handleTyping);
    socket.on("stopTyping", handleStopTyping);

    return () => {
      socket.off("typing", handleTyping);
      socket.off("stopTyping", handleStopTyping);
    };
  }, [selectedConversation?._id, currentUser._id]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="flex min-h-[500px] flex-col">
      <div className="border-b border-slate-800 pb-4">
        <p className="text-sm text-slate-400">Conversation with</p>

        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold">
            {otherUser?.name || "Unknown user"}
          </h2>

          <span
            className={`rounded-full px-3 py-1 text-xs ${
              isOtherUserOnline
                ? "bg-emerald-950 text-emerald-300"
                : "bg-slate-800 text-slate-400"
            }`}
          >
            {isOtherUserOnline ? "Online" : "Offline"}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-6">
        {loadingMessages ? (
          <p className="text-sm text-slate-500">Loading messages...</p>
        ) : messages.length ? (
          <div className="space-y-4">
            {messages.map((message) => {
              const isMine = message.sender._id === currentUser._id;

              return (
                <div
                  key={message._id}
                  className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                      isMine
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-800 text-slate-100"
                    }`}
                  >
                    <p className="text-sm">{message.text}</p>

                    <p
                      className={`mt-1 text-[11px] ${
                        isMine ? "text-indigo-100" : "text-slate-500"
                      }`}
                    >
                      {new Date(message.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    {isMine && (
                      <p className="mt-1 text-[11px] text-indigo-100">
                        {message.readBy?.some((id) => id !== currentUser._id)
                          ? "Read"
                          : "Sent"}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}

            <div ref={messagesEndRef} />
          </div>
        ) : (
          <div className="flex min-h-[360px] items-center justify-center text-center text-slate-400">
            No messages yet. Start the conversation.
          </div>
        )}
      </div>

      {typingUser && (
        <p className="mb-2 text-sm text-slate-400">{typingUser} is typing...</p>
      )}

      <form
        onSubmit={handleSendMessage}
        className="mt-4 flex gap-3 border-t border-slate-800 pt-4"
      >
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value);

            socket.emit("typing", {
              conversationId: selectedConversation._id,
            });

            if (typingTimeoutRef.current) {
              clearTimeout(typingTimeoutRef.current);
            }

            typingTimeoutRef.current = setTimeout(() => {
              socket.emit("stopTyping", {
                conversationId: selectedConversation._id,
              });
            }, 1000);
          }}
          placeholder="Type a message..."
          className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-indigo-500"
        />

        <button
          disabled={sending || !text.trim()}
          className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-medium hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {sending ? "Sending..." : "Send"}
        </button>
      </form>
    </div>
  );
}
