import { createContext, useContext, useEffect, useState } from "react";
import { getMe, loginUser, registerUser } from "../api/authApi";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("chatly_token"));
  const [loading, setLoading] = useState(true);

  const register = async (formData) => {
    const res = await registerUser(formData);

    localStorage.setItem("chatly_token", res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);

    return res;
  };

  const login = async (formData) => {
    const res = await loginUser(formData);

    localStorage.setItem("chatly_token", res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);

    return res;
  };

  const logout = () => {
    localStorage.removeItem("chatly_token");
    setToken(null);
    setUser(null);
  };

  useEffect(() => {
    const loadUser = async () => {
      try {
        if (!token) {
          setLoading(false);
          return;
        }

        const res = await getMe();
        setUser(res.data.user);
      } catch (error) {
        localStorage.removeItem("chatly_token");
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, loading, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};