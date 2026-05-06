import api from "./axios";

export const getConversations = () => {
  return api.get("/api/conversations");
};

export const createOrGetConversation = (userId) => {
  return api.post("/api/conversations", { userId });
};