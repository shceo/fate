import React, { useEffect, useState } from "react";
import Header from "../components/Header.jsx";
import Footer from "../components/Footer.jsx";
import Progress from "../components/Progress.jsx";
import { apiPost } from "../shared/api.js";

export default function QA() {
  const [qIndex, setQIndex] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [toast, setToast] = useState(null); // кастомный тост по центру

  useEffect(() => {
    fetch("/api/questions", { credentials: "include" })
      .then((r) => r.json())
      .then(setQuestions);
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1600);
  };

  const save = async () => {
    const entries = Object.keys(answers).map((i) => ({
      questionIndex: Number(i),
      text: answers[i],
    }));
    await apiPost("/api/answers", { entries });
    showToast("Ответ сохранён");
  };

  const next = async () => {
    if (qIndex < questions.length - 1) {
      setQIndex(qIndex + 1);
    } else {
      await apiPost("/api/complete", {});
      location.href = "/complete";
    }
  };

  const prev = () => setQIndex(Math.max(0, qIndex - 1));
  const value = answers[qIndex] || "";

  return (
    <div>
      <Header />

      {/* Тост по центру */}
      {toast && (
        <div className="fixed inset-0 z-[60] grid place-items-center pointer-events-none">
          <div className="pointer-events-auto card-glass px-6 py-4 text-center shadow-soft">
            <div className="font-serif text-lg">✨ {toast}</div>
          </div>
        </div>
      )}

      <section className="min-h-[100dvh] grid place-items-center py-8 px-4">
        <div className="paper w-[min(820px,94vw)] p-6">
          {questions.length === 0 ? (
            <div className="text-center">
              <div className="font-serif text-[clamp(1.4rem,3.8vw,2rem)]">
                Скоро администратор отправит вам вопросы
              </div>
              <div className="text-muted mt-1">
                Как только они появятся, вы сможете отвечать здесь.
              </div>
            </div>
          ) : (
            <>
              <div className="text-muted flex justify-between flex-wrap gap-2">
                <span>
                  Вопрос {qIndex + 1} из {questions.length}
                </span>
                <span>Черновик: Ваша книга</span>
              </div>

              <h1 className="font-serif text-[clamp(1.4rem,3.8vw,2.4rem)] leading-tight mt-2">
                {questions[qIndex] || ""}
              </h1>

              <Progress
                value={Math.round(
                  100 * ((qIndex + 1) / (questions.length || 1))
                )}
              />

              <textarea
                className="input min-h-[220px] text-[1.05rem] mt-3"
                placeholder="Напишите здесь свой ответ…"
                value={value}
                onChange={(e) =>
                  setAnswers((a) => ({ ...a, [qIndex]: e.target.value }))
                }
              />

              <div className="flex justify-between gap-2 mt-3">
                <button className="btn" onClick={prev} disabled={qIndex === 0}>
                  Назад
                </button>
                <div className="flex gap-2">
                  <button className="btn" onClick={save}>
                    Сохранить
                  </button>
                  <button className="btn primary" onClick={next}>
                    {qIndex < questions.length - 1 ? "Далее" : "Завершить"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </section>
      <Footer />
    </div>
  );
}
