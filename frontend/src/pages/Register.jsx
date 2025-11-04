import React, { useState } from "react";
import Header from "../components/Header.jsx";
import Footer from "../components/Footer.jsx";
import TelegramAuthSection from "../components/TelegramAuthSection.jsx";
import PasswordInput from "../components/PasswordInput.jsx";
import Logo from "../components/Logo.jsx";
import { useAuth } from "../shared/AuthContext.jsx";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      await register(name.trim(), email.trim(), password);
      nav("/dashboard");
    } catch {
      setErr("Не удалось создать аккаунт. Попробуйте ещё раз.");
    }
  };

  return (
    <div>
      <Header />
      <section className="min-h-[100dvh] grid place-items-center py-12 px-4">
        <div className="card-glass w-[min(480px,92vw)] p-8 space-y-6">
          <div className="grid place-items-center">
            <div className="font-serif text-[1.6rem]">
              <Logo className="h-16 max-w-[240px]" />
            </div>
          </div>
          <h1 className="font-serif text-[clamp(1.6rem,3vw,2.2rem)] text-ink">
            Создайте профиль Fate
          </h1>
          <p className="text-muted">
            Заполните форму, чтобы начать работу над семейной историей. Вы сможете изменить данные
            позднее в личном кабинете.
          </p>
          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <label className="block mb-1" htmlFor="register-name">
                ФИО
              </label>
              <input
                id="register-name"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Иван Иванов"
                autoComplete="name"
              />
            </div>
            <div>
              <label className="block mb-1" htmlFor="register-email">
                Электронная почта
              </label>
              <input
                id="register-email"
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ivan@example.com"
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block mb-1" htmlFor="register-password">
                Пароль
              </label>
              <PasswordInput
                id="register-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Придумайте надёжный пароль"
                autoComplete="new-password"
              />
            </div>
            {err && <div className="text-red-600">{err}</div>}
            <div className="pt-1">
              <button className="btn primary w-full justify-center" type="submit">
                Создать аккаунт
              </button>
            </div>
          </form>
          <div className="border-t border-white/40 pt-4">
            <TelegramAuthSection />
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
