import React, { useState } from "react";
import { useAuth } from "../../shared/AuthContext.jsx";
import { useNavigate, useLocation } from "react-router-dom";
export default function AdminLogin() {
  const { adminLogin } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [secret, setSecret] = useState(""),
    [err, setErr] = useState("");
  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      await adminLogin(email, password, secret);
      nav(loc.state?.from?.pathname || "/admin", { replace: true });
    } catch {
      setErr("Ошибка входа администратора");
    }
  };
  return (
    <section className="min-h-[100dvh] grid place-items-center py-12 px-4">
      <div className="paper w-[min(420px,92vw)] p-6">
        <h1 className="font-serif text-2xl mb-2">Вход администратора</h1>
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block mb-1">Email</label>
            <input
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block mb-1">Пароль</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <label className="block mb-1">Секретный ключ</label>
            <input
              className="input"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="ADMIN_SECRET_KEY"
            />
          </div>
          {err && <div className="text-red-600">{err}</div>}
          <div className="flex gap-2">
            <button className="btn primary">Войти</button>
          </div>
        </form>
      </div>
    </section>
  );
}
