import React from "react";
import Header from "../components/Header.jsx";
import Footer from "../components/Footer.jsx";

const options = [
  {
    title: "Северный рассвет",
    subtitle: "Нежный градиент розового и лазури",
    gradient: "from-lav to-sky",
  },
  {
    title: "Вечерний сад",
    subtitle: "Глубокий зелёный с золотыми акцентами",
    gradient: "from-sage to-gold",
  },
  {
    title: "Пудровый шёлк",
    subtitle: "Тёплые розовые и сиреневые оттенки",
    gradient: "from-blush to-lav",
  },
  {
    title: "Слоновая кость",
    subtitle: "Классика в мягких молочных тонах",
    gradient: "from-[#f9f1ea] to-gold",
  },
  {
    title: "Полярное сияние",
    subtitle: "Холодные голубые переливы",
    gradient: "from-sky to-sage",
  },
  {
    title: "Пастельная гармония",
    subtitle: "Песочный и дымчато-розовый цвета",
    gradient: "from-[#f6e9e4] to-[#f1f3f9]",
  },
  {
    title: "Тёплый пергамент",
    subtitle: "Бежевые и карамельные тона",
    gradient: "from-[#efe8de] to-[#f6f0ea]",
  },
  {
    title: "Рассветная дымка",
    subtitle: "Лавандовый с кремовым переходом",
    gradient: "from-[#eee8ff] to-[#f7f2ea]",
  },
];

export default function Covers() {
  const pick = async (name) => {
    await fetch("/api/cover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name }),
    });
    alert("Обложка выбрана: " + name);
  };

  return (
    <div>
      <Header />
      <div className="topbar">
        <div className="container mx-auto px-4 py-3 text-muted">
          Выберите обложку для своей книги
        </div>
      </div>
      <section className="container mx-auto px-4 mt-4">
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
          {options.map((option) => {
            const label = `${option.title} — ${option.subtitle}`;
            return (
              <label
                key={option.title}
                className={`cover bg-gradient-to-br ${option.gradient}`}
              >
                <input
                  type="radio"
                  name="cover"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={() => pick(label)}
                />
                <span className="tag">{option.title}</span>
                <div className="meta font-serif">{option.subtitle}</div>
              </label>
            );
          })}
        </div>
      </section>
      <Footer />
    </div>
  );
}
