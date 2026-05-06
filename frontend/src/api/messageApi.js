import api from "./axios";

export const getMessages = (conversationId) => {
  return api.get(`/api/messages/${conversationId}`);
};

export const sendMessage = (messageData) => {
  return api.post("/api/messages", messageData);
};

export const markMessagesAsRead = (conversationId) => {
  return api.patch(`/api/messages/${conversationId}/read`);
};