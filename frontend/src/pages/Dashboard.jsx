import React, { useState } from "react";
import Header from "../components/Header.jsx";
import Footer from "../components/Footer.jsx";
import Progress from "../components/Progress.jsx";
import QuestionsEmptyState from "../components/QuestionsEmptyState.jsx";
import { Link } from "react-router-dom";
import { useAuth } from "../shared/AuthContext.jsx";
import { useQuestions } from "../shared/QuestionsContext.jsx";

export default function Dashboard() {
  const { user } = useAuth();
  const {
    questions,
    answers,
    updateAnswer,
    progress,
    answeredCount,
    totalCount,
    saveAnswers,
    loaded,
    loading,
  } = useQuestions();
  const [toast, setToast] = useState(null);
  const [busy, setBusy] = useState(false);

  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2000);
  };

  const handleSave = async () => {
    if (busy) return;
    try {
      setBusy(true);
      await saveAnswers();
      showToast("Ответы сохранены");
    } catch (error) {
      console.error("Failed to save answers", error);
      showToast("Не удалось сохранить. Попробуйте позже.");
    } finally {
      setBusy(false);
    }
  };

  const disabled = busy || loading;
  const hasQuestions = loaded && questions.length > 0;
  const greeting = user?.name
    ? `Добро пожаловать, ${user.name}`
    : "Добро пожаловать";
  const progressLabel = totalCount
    ? `${answeredCount} из ${totalCount} вопросов`
    : "Нет вопросов";

  return (
    <div>
      <Header />

      {toast && (
        <div className="fixed inset-0 z-[60] grid place-items-center pointer-events-none">
          <div className="pointer-events-auto card-glass px-6 py-4 text-center shadow-soft">
            <div className="font-serif text-lg">⟡ {toast}</div>
          </div>
        </div>
      )}

      <section className="container mx-auto px-4 mt-4 grid gap-4 md:grid-cols-[280px_1fr] items-start">
        <aside className="paper p-4">
          <h2 className="font-serif text-[clamp(1.4rem,3.2vw,2rem)]">
            {greeting}
          </h2>
          <p className="text-muted">
            Здесь собраны все вопросы вашего проекта. Заполняйте в удобном
            темпе — ответы можно редактировать в любой момент.
          </p>
          <div className="mt-3 font-semibold">Прогресс</div>
          <Progress value={progress} />
          <div className="text-muted text-sm mt-1">{progressLabel}</div>

          <div className="mt-4 border-t border-dashed border-line pt-4">
            <div className="font-semibold mb-2">Обложка</div>
            <div className="flex items-center gap-2">
              <div className="cover bg-gradient-to-br from-blush to-lav w-[84px] min-w-[84px]">
                <div className="meta">
                  {user?.cover ?? "Персональная обложка"}
                </div>
              </div>
              <Link className="btn" to="/covers">
                Выбрать обложку
              </Link>
            </div>
          </div>
        </aside>

        <main className="paper p-4">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
            <h3 className="font-serif text-xl">Вопросы и ответы</h3>
            <Link className="btn" to="/qa">
              Перейти в фокус-режим
            </Link>
          </div>

          {!loaded || loading ? (
            <div className="text-center text-muted py-10">
              Загружаем вопросы...
            </div>
          ) : hasQuestions ? (
            <div className="space-y-4">
              {questions.map((question, idx) => (
                <article
                  key={idx}
                  className="p-3 border border-line rounded-[14px] bg-[rgba(255,255,255,.65)]"
                >
                  <div className="text-muted text-sm mb-1">
                    Вопрос {idx + 1}
                  </div>
                  <div className="font-serif text-lg mb-2 leading-tight break-words">
                    {question}
                  </div>
                  <textarea
                    className="input min-h-[140px]"
                    placeholder="Запишите здесь ответ"
                    value={answers[idx] ?? ""}
                    onChange={(e) => updateAnswer(idx, e.target.value)}
                    disabled={disabled}
                  />
                </article>
              ))}
            </div>
          ) : (
            <QuestionsEmptyState />
          )}

          <div className="flex gap-2 flex-wrap items-center mt-4">
            <button
              className="btn primary"
              onClick={handleSave}
              disabled={disabled || !hasQuestions}
            >
              Сохранить ответы
            </button>
            <Link className="btn" to="/qa">
              Ответить по одному вопросу
            </Link>
          </div>
        </main>
      </section>

      <Footer />
    </div>
  );
}
