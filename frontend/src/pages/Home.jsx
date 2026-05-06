import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getUsers } from "../api/userApi";
import {
  createOrGetConversation,
  getConversations,
} from "../api/conversationApi";
import toast from "react-hot-toast";
import ChatBox from "../components/ChatBox";
import { socket } from "../socket/socket";

export default function Home() {
  const { user, logout } = useAuth();

  const [users, setUsers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [search, setSearch] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);

      const res = await getUsers(search.trim());
      setUsers(res.data.users);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch users");
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchConversations = async () => {
    try {
      setLoadingConversations(true);

      const res = await getConversations();
      setConversations(res.data.conversations);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to fetch conversations",
      );
    } finally {
      setLoadingConversations(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 400);

    return () => clearTimeout(timer);
  }, [search]);

  const handleSelectUser = async (selectedUserId) => {
    try {
      const res = await createOrGetConversation(selectedUserId);

      setSelectedConversation(res.data.conversation);
      await fetchConversations();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to open conversation",
      );
    }
  };

  const getOtherParticipant = (conversation) => {
    return conversation.participants.find(
      (participant) => participant._id !== user._id,
    );
  };

  useEffect(() => {
    const handleOnlineUsers = (users) => {
      setOnlineUsers(users);
    };

    socket.on("onlineUsers", handleOnlineUsers);

    return () => {
      socket.off("onlineUsers", handleOnlineUsers);
    };
  }, []);


  useEffect(() => {
    const token = localStorage.getItem("chatly_token");

    if (!token) return;

    socket.auth = { token };

    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    const handleSidebarMessage = (message) => {
      const conversationId = message.conversation?._id || message.conversation;

      setConversations((prev) => {
        const existingConversation = prev.find(
          (conversation) => conversation._id === conversationId,
        );

        if (!existingConversation) {
          fetchConversations();
          return prev;
        }

        const updatedConversation = {
          ...existingConversation,
          latestMessage: message,
          unreadCount:
            selectedConversation?._id === conversationId
              ? existingConversation.unreadCount
              : (existingConversation.unreadCount || 0) + 1,
          updatedAt: message.createdAt,
        };

        return [
          updatedConversation,
          ...prev.filter((conversation) => conversation._id !== conversationId),
        ];
      });
    };

    socket.on("sidebarMessage", handleSidebarMessage);

    return () => {
      socket.off("sidebarMessage", handleSidebarMessage);
    };
  }, [selectedConversation?._id]);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-sm text-slate-400">Chatly</p>
            <h1 className="text-xl font-bold">Welcome, {user?.name}</h1>
          </div>

          <button
            onClick={logout}
            className="rounded-xl bg-red-600 px-4 py-2 text-sm hover:bg-red-500"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-6 py-6 lg:grid-cols-[360px_1fr]">
        <aside className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-indigo-500"
          />

          <div className="mt-6">
            <h2 className="mb-3 text-sm font-semibold text-slate-300">Users</h2>

            {loadingUsers ? (
              <p className="text-sm text-slate-500">Loading users...</p>
            ) : users.length ? (
              <div className="space-y-2">
                {users.map((item) => (
                  <button
                    key={item._id}
                    onClick={() => handleSelectUser(item._id)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-left hover:border-indigo-500"
                  >
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-slate-500">{item.email}</p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No users found</p>
            )}
          </div>

          <div className="mt-8">
            <h2 className="mb-3 text-sm font-semibold text-slate-300">
              Conversations
            </h2>

            {loadingConversations ? (
              <p className="text-sm text-slate-500">Loading conversations...</p>
            ) : conversations.length ? (
              <div className="space-y-2">
                {conversations.map((conversation) => {
                  const otherUser = getOtherParticipant(conversation);

                  return (
                    <button
                      key={conversation._id}
                      onClick={() => {
                        setSelectedConversation(conversation);

                        setConversations((prev) =>
                          prev.map((item) =>
                            item._id === conversation._id
                              ? { ...item, unreadCount: 0 }
                              : item,
                          ),
                        );
                      }}
                      className={`w-full rounded-xl border p-3 text-left ${
                        selectedConversation?._id === conversation._id
                          ? "border-indigo-500 bg-indigo-950"
                          : "border-slate-800 bg-slate-950 hover:border-indigo-500"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium">
                            {otherUser?.name || "Unknown user"}
                          </p>

                          <p className="truncate text-sm text-slate-500">
                            {conversation.latestMessage?.text ||
                              "No messages yet"}
                          </p>
                        </div>

                        {conversation.unreadCount > 0 && (
                          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-indigo-600 px-2 text-xs font-bold text-white">
                            {conversation.unreadCount}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No conversations yet</p>
            )}
          </div>
        </aside>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          {selectedConversation ? (
            <ChatBox
              selectedConversation={selectedConversation}
              currentUser={user}
              onlineUsers={onlineUsers}
            />
          ) : (
            <div className="flex min-h-[500px] items-center justify-center text-center">
              <div>
                <h2 className="text-2xl font-bold">Select a conversation</h2>
                <p className="mt-2 text-slate-400">
                  Choose a user or existing conversation to start chatting.
                </p>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
