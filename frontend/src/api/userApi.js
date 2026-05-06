import api from "./axios";

export const getUsers = (search = "") => {
  return api.get(`/api/users?search=${search}`);
};