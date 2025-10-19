import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const Auth = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loaded, setLoaded] = useState(false);

  const refreshUser = useCallback(async () => {
    try {
      const response = await fetch("/api/me", { credentials: "include" });
      if (!response.ok) {
        if (response.status === 401) {
          setUser(null);
        }
        return null;
      }
      const data = await response.json();
      setUser(data);
      return data;
    } catch (error) {
      console.error("Не удалось обновить данные пользователя", error);
      return null;
    }
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setLoaded(true));
  }, [refreshUser]);

  const login = async (email, password) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) {
      throw new Error("Не удалось войти. Проверьте данные и попробуйте снова.");
    }
    const data = await response.json();
    setUser(data);
    await refreshUser();
    return data;
  };

  const register = async (name, email, password) => {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name, email, password }),
    });
    if (!response.ok) {
      throw new Error("Не удалось создать аккаунт. Попробуйте ещё раз.");
    }
    const data = await response.json();
    setUser(data);
    await refreshUser();
    return data;
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setUser(null);
  };

  const adminLogin = async (email, password, secretKey) => {
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password, secretKey }),
    });
    if (!response.ok) {
      throw new Error("Не удалось войти в админ-панель.");
    }
    const data = await response.json();
    setUser(data);
    await refreshUser();
    return data;
  };

  return (
    <Auth.Provider
      value={{
        user,
        setUser,
        loaded,
        login,
        register,
        logout,
        adminLogin,
        refreshUser,
      }}
    >
      {children}
    </Auth.Provider>
  );
}

export function useAuth() {
  return useContext(Auth);
}
