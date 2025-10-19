import React, { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import Header from "../components/Header.jsx";
import Footer from "../components/Footer.jsx";
import Progress from "../components/Progress.jsx";
import QuestionsEmptyState from "../components/QuestionsEmptyState.jsx";
import { apiPost } from "../shared/api.js";
import { useAuth } from "../shared/AuthContext.jsx";
import { useQuestions } from "../shared/QuestionsContext.jsx";

export default function QA() {
  const navigate = useNavigate();
  const { refreshUser, setUser } = useAuth();
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
    interviewLocked,
  } = useQuestions();
  const [index, setIndex] = useState(0);
  const [toast, setToast] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (questions.length === 0) {
      setIndex(0);
      return;
    }
    setIndex((prev) => Math.min(prev, questions.length - 1));
  }, [questions]);

  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2400);
  };

  const persistAnswers = async (withSuccessToast = true) => {
    if (busy) return false;
    let ok = true;
    try {
      setBusy(true);
      await saveAnswers();
      if (withSuccessToast) {
        showToast("Ответы сохранены");
      }
    } catch (error) {
      console.error("Failed to save answers", error);
      showToast("Не удалось сохранить ответы. Попробуйте ещё раз.");
      ok = false;
    } finally {
      setBusy(false);
    }
    return ok;
  };

  const handleNext = async () => {
    if (questions.length === 0 || busy) return;
    if (index < questions.length - 1) {
      setIndex((prev) => Math.min(prev + 1, questions.length - 1));
      return;
    }

    const confirmed = window.confirm(
      "Вы действительно хотите завершить вопросы? После подтверждения ответы нельзя будет изменить."
    );
    if (!confirmed) return;

    const saved = await persistAnswers(false);
    if (!saved) return;

    try {
      setBusy(true);
      const result = await apiPost("/api/complete", {});
      if (result && typeof result === "object") {
        setUser((prev) =>
          prev
            ? {
                ...prev,
                status: result.status ?? prev.status ?? null,
                statusLabel: result.statusLabel ?? prev.statusLabel ?? null,
              }
            : prev
        );
      }
      await refreshUser();
      navigate("/complete", { replace: true });
    } catch (error) {
      console.error("Failed to complete questionnaire", error);
      showToast("Не удалось завершить вопросы. Попробуйте позже.");
    } finally {
      setBusy(false);
    }
  };

  const handlePrev = () => {
    if (busy) return;
    setIndex((prev) => Math.max(0, prev - 1));
  };

  const value = answers[index] ?? "";
  const disabled = busy || loading;
  const currentQuestion = totalCount > 0 ? index + 1 : 0;

  if (!loading && loaded && interviewLocked) {
    return <Navigate to="/complete" replace />;
  }

  return (
    <div>
      <Header />

      {toast && (
        <div className="fixed inset-0 z-[60] grid place-items-center pointer-events-none">
          <div className="pointer-events-auto card-glass px-6 py-4 text-center shadow-soft">
            <div className="font-serif text-lg">{toast}</div>
          </div>
        </div>
      )}

      <section className="min-h-[100dvh] grid place-items-center py-8 px-4">
        <div className="paper w-[min(820px,94vw)] p-6">
          <div className="flex justify-between items-center flex-wrap gap-3 mb-4">
            <Link className="btn" to="/dashboard">
              Вернуться в личный кабинет
            </Link>
            {totalCount > 0 && (
              <div className="text-muted text-sm">
                Ответов: {answeredCount} из {totalCount}
              </div>
            )}
          </div>

          {!loaded || loading ? (
            <div className="text-center text-muted py-10">
              Загружаем вопросы...
            </div>
          ) : questions.length === 0 ? (
            <QuestionsEmptyState />
          ) : (
            <>
              <div className="flex justify-between flex-wrap gap-2 text-muted">
                <span>
                  Вопрос {currentQuestion} из {totalCount}
                </span>
                <span>Прогресс: {progress}%</span>
              </div>

              <h1 className="font-serif text-[clamp(1.4rem,3.8vw,2.4rem)] leading-tight mt-2 break-words">
                {questions[index] || ""}
              </h1>

              <Progress value={progress} />

              <textarea
                className="input min-h-[220px] text-[1.05rem] mt-3"
                placeholder="Опишите ваш ответ. Приведите примеры, детали и факты — всё, что поможет создать книгу."
                value={value}
                onChange={(e) => updateAnswer(index, e.target.value)}
                disabled={disabled}
              />

              <div className="flex justify-between gap-2 mt-3">
                <button
                  className="btn"
                  onClick={handlePrev}
                  disabled={index === 0 || disabled}
                >
                  Назад
                </button>
                <div className="flex gap-2">
                  <button
                    className="btn"
                    onClick={() => persistAnswers(true)}
                    disabled={disabled}
                  >
                    Сохранить ответы
                  </button>
                  <button
                    className="btn primary"
                    onClick={handleNext}
                    disabled={disabled}
                  >
                    {index < questions.length - 1
                      ? "Далее"
                      : "Завершить вопросы"}
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
