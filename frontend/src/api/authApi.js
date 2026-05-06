import api from "./axios";

export const registerUser = (userData) => {
  return api.post("/api/auth/register", userData);
};

export const loginUser = (userData) => {
  return api.post("/api/auth/login", userData);
};

export const getMe = () => {
  return api.get("/api/auth/me");
};