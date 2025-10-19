import React from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header.jsx";
import Footer from "../components/Footer.jsx";

const steps = [
  {
    title: "Заполните анкету",
    description:
      "Ответьте на вопросы и поделитесь историями — это станет основой будущей книги.",
  },
  {
    title: "Интервью с редактором",
    description:
      "Мы уточним детали, поможем сформулировать ключевые моменты и соберём дополнительные материалы.",
  },
  {
    title: "Дизайн и печать",
    description:
      "Команда оформит книгу, подготовит макет и организует печать тиража для вашей семьи.",
  },
];

export default function Home() {
  return (
    <div>
      <Header />
      <section className="py-16">
        <div className="container mx-auto px-4 grid gap-8 items-center md:grid-cols-[1.1fr_.9fr]">
          <div>
            <div className="uppercase tracking-[.18em] text-sm text-muted">
              ИНДИВИДУАЛЬНЫЕ КНИГИ О СЕМЬЕ
            </div>
            <h1 className="font-serif font-semibold text-[clamp(2.1rem,4.4vw,3.4rem)] leading-tight mt-2">
              Расскажите семейную историю — мы превратим её в изданную книгу.
            </h1>
            <p className="text-muted max-w-[55ch] mt-4">
              Fate помогает собрать воспоминания, интервью и фотографии, чтобы
              оформить их в настоящую биографию. Мы сопровождаем вас на каждом
              этапе — от первых вопросов до готового тиража.
            </p>
            <div className="mt-6 flex gap-3 flex-wrap">
              <Link className="btn primary" to="/register">
                Зарегистрироваться
              </Link>
              <a className="btn" href="#how">
                Как это работает
              </a>
            </div>
          </div>
          <div className="grid place-items-center">
            <div className="relative w-[min(88vw,320px)] h-[min(120vw,420px)] rounded-[18px] overflow-hidden shadow-[0_30px_60px_rgba(80,60,40,.18),0_10px_20px_rgba(80,60,40,.12)] bg-gradient-to-br from-lav to-sky">
              <div className="absolute inset-[10px] rounded-[14px] bg-[linear-gradient(135deg,rgba(255,255,255,.6),rgba(255,255,255,.1))] mix-blend-screen"></div>
              <div className="absolute right-[-8px] top-[20px] w-[16px] h-[calc(100%-40px)] rounded-[3px] bg-[linear-gradient(180deg,#efe7dc,#f7f1ea)] drop-shadow-[0_6px_10px_rgba(0,0,0,.08)]"></div>
              <div className="absolute top-4 left-4 px-2 py-1 rounded-full bg-white/70 backdrop-blur border border-white/80 text-[.8rem] text-[#5b5246]">
                Глава 1 · Начало пути
              </div>
              <div className="absolute left-[22px] right-[22px] bottom-6 text-[#1e1d1b] font-serif text-[1.6rem] leading-tight">
                «Каждая семья — это роман. Мы поможем его написать».
                <br />
                <span className="text-[.95rem] opacity-90">Fate Studio</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section id="how" className="py-12">
        <div className="container mx-auto px-4">
          <h2 className="font-serif font-semibold text-[clamp(1.6rem,3vw,2.1rem)] mb-2">
            Как работает Fate
          </h2>
          <p className="text-muted max-w-[60ch]">
            Мы бережно работаем с личными историями и оформляем их в авторские
            книги. Команда редакторов и дизайнеров помогает собирать материалы,
            обрабатывать тексты и готовить печатный тираж.
          </p>
          <div className="grid gap-4 md:grid-cols-3 mt-5">
            {steps.map((step, index) => (
              <article
                key={step.title}
                className="paper p-4 grid grid-cols-[56px_1fr] gap-4 items-center"
              >
                <div className="w-14 h-14 grid place-items-center rounded-[14px] bg-gradient-to-b from-gold to-blush shadow-tiny">
                  <span className="text-[#5b5246]">{index + 1}</span>
                </div>
                <div>
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="text-muted mt-1">{step.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
