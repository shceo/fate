import React, { useState } from "react";
import { useAuth } from "../../shared/AuthContext.jsx";
import { useNavigate, useLocation } from "react-router-dom";
import PasswordInput from "../../components/PasswordInput.jsx";

export default function AdminLogin() {
  const { adminLogin } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secret, setSecret] = useState("");
  const [err, setErr] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      await adminLogin(email.trim(), password, secret.trim());
      nav(loc.state?.from?.pathname || "/admin", { replace: true });
    } catch {
      setErr("Не удалось войти. Проверьте данные и попробуйте снова.");
    }
  };

  return (
    <section className="min-h-[100dvh] grid place-items-center py-12 px-4">
      <div className="paper w-[min(420px,92vw)] p-6">
        <h1 className="font-serif text-2xl mb-2">Вход в админ-панель</h1>
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block mb-1" htmlFor="admin-email">
              Электронная почта
            </label>
            <input
              id="admin-email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block mb-1" htmlFor="admin-password">
              Пароль
            </label>
            <PasswordInput
              id="admin-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="block mb-1" htmlFor="admin-secret">
              Секретный ключ
            </label>
            <input
              id="admin-secret"
              className="input"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="ADMIN_SECRET_KEY"
              autoComplete="one-time-code"
            />
          </div>
          {err && <div className="text-red-700 dark:text-red-400">{err}</div>}
          <div className="flex gap-2">
            <button className="btn primary" type="submit">
              Войти
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
