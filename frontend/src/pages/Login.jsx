import React, { useState } from "react";
import Header from "../components/Header.jsx";
import Footer from "../components/Footer.jsx";
import TelegramAuthSection from "../components/TelegramAuthSection.jsx";
import PasswordInput from "../components/PasswordInput.jsx";
import { useAuth } from "../shared/AuthContext.jsx";
import { useNavigate, useLocation, Link } from "react-router-dom";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email.trim(), password);
      nav(loc.state?.from?.pathname || "/dashboard", { replace: true });
    } catch {
      setErr("Неверный email или пароль.");
    }
  };

  return (
    <div>
      <Header />
      <section className="min-h-[60dvh] grid place-items-center py-12 px-4">
        <div className="paper w-[min(420px,92vw)] p-6 space-y-6">
          <h1 className="font-serif text-2xl">Вход</h1>
          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <label className="block mb-1" htmlFor="login-email">
                Электронная почта
              </label>
              <input
                id="login-email"
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ivan@example.com"
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block mb-1" htmlFor="login-password">
                Пароль
              </label>
              <PasswordInput
                id="login-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            {err && <div className="text-red-600">{err}</div>}
            <div className="flex flex-col gap-2 pt-1">
              <button className="btn primary w-full justify-center" type="submit">
                Войти
              </button>
              <Link to="/register" className="btn w-full justify-center text-center">
                Создать аккаунт
              </Link>
            </div>
          </form>
          <div className="border-t border-line pt-4">
            <TelegramAuthSection />
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
