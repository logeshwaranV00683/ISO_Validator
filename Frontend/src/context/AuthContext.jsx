import { createContext, useContext, useState, useCallback } from "react";
import { login as apiLogin, logout as apiLogout } from "../api/auth";
import { ROLES } from "../constants/theme";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const s = localStorage.getItem("user_info");
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  });

  const login = useCallback(async (username, password) => {
    const data = await apiLogin(username, password);
    localStorage.setItem("jwt_token", data.token);
    localStorage.setItem("user_info", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try { await apiLogout(); } catch {}
    localStorage.removeItem("jwt_token");
    localStorage.removeItem("user_info");
    setUser(null);
  }, []);

  const role = user ? (ROLES[user.role] ?? ROLES.VIEWER) : null;
  const can  = user?.permissions ?? role?.can ?? {};

  return (
    <AuthContext.Provider value={{ user, role, can, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}