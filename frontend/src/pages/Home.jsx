import React from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header.jsx";
import Footer from "../components/Footer.jsx";
import mainCoverImage from "../assets/templets/main_temp.png";

const steps = [
  {
    title: "Заполните анкету",
    description:
      "Ответьте на вопросы и поделитесь историями — это поможет нам собрать основу для будущей книги.",
  },
  {
    title: "Интервью с редактором",
    description:
      "Мы уточним детали, поможем выделить ключевые моменты и соберём дополнительные материалы.",
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
              Книга о вашей жизни
            </div>
            <h1 className="font-serif font-semibold text-[clamp(2.1rem,4.4vw,3.4rem)] leading-tight mt-2">
              Собирайте воспоминания и превращайте их в книгу.
            </h1>
            <p className="text-muted max-w-[55ch] mt-4">
              Fate помогает собирать сообщения, фотографии и моменты от близких
              и бережно превращает их в красивую книгу архивного качества —
              индивидуальный подарок на всю жизнь.
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
            <div className="cover cover-page relative w-[min(88vw,340px)] h-[min(120vw,460px)]" style={{ perspective: '1200px' }}>
              <div className="cover-outer" style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                borderRadius: '14px',
                transformStyle: 'preserve-3d',
                boxShadow: '0 30px 60px rgba(80,60,40,.18), 0 10px 20px rgba(80,60,40,.12)',
                background: 'var(--paper)'
              }}>
                <div className="cover-face cover-front" style={{
                  position: 'absolute',
                  inset: '0',
                  borderRadius: 'inherit',
                  overflow: 'hidden',
                  backfaceVisibility: 'hidden'
                }}>
                  <img
                    src={mainCoverImage}
                    alt="Пример печатной обложки Fate"
                    className="h-full w-full object-cover"
                    loading="eager"
                  />
                </div>
                <span className="cover-spine" aria-hidden="true" />
                <span className="cover-edge" aria-hidden="true" />
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
            книги. Редакторы и дизайнеры помогают собирать материалы,
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
