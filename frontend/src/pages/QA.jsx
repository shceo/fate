import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import Header from "../components/Header.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
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
    getAnswer,
    updateAnswer,
    progress,
    answeredCount,
    totalCount,
    saveAnswers,
    loaded,
    loading,
    interviewLocked,
    answersVersion,
  } = useQuestions();
  const [index, setIndex] = useState(0);
  const [toast, setToast] = useState(null);
  const [busy, setBusy] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);

  const textareaRef = useRef(null);
  const draftRef = useRef("");
  const syncTimerRef = useRef(null);
  const indexRef = useRef(0);
  const renderedValueRef = useRef("");
  const inputFrameRef = useRef(null);
  const autoSaveTimerRef = useRef(null);
  const autoSavingRef = useRef(false);
  const pendingAutoSaveRef = useRef(false);

  useEffect(() => {
    if (questions.length === 0) {
      setIndex(0);
      return;
    }
    setIndex((prev) => Math.min(prev, questions.length - 1));
  }, [questions]);

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  const cancelPendingSync = useCallback(() => {
    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current);
      syncTimerRef.current = null;
    }
  }, []);

  const cancelInputFrame = useCallback(() => {
    if (inputFrameRef.current === null) return;
    if (
      typeof window !== "undefined" &&
      typeof window.cancelAnimationFrame === "function"
    ) {
      window.cancelAnimationFrame(inputFrameRef.current);
    }
    inputFrameRef.current = null;
  }, []);

  const cancelAutoSave = useCallback(() => {
    if (typeof window === "undefined") return;
    if (autoSaveTimerRef.current) {
      window.clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
  }, []);

  const runAutoSave = useCallback(async () => {
    cancelAutoSave();
    if (
      interviewLocked ||
      loading ||
      !loaded ||
      !questions.length
    ) {
      pendingAutoSaveRef.current = false;
      return;
    }
    if (autoSavingRef.current || busy) {
      if (typeof window !== "undefined") {
        autoSaveTimerRef.current = window.setTimeout(runAutoSave, 1200);
      }
      return;
    }
    autoSavingRef.current = true;
    pendingAutoSaveRef.current = false;
    try {
      await saveAnswers();
    } catch (error) {
      console.error("Auto-save failed", error);
      pendingAutoSaveRef.current = true;
      if (typeof window !== "undefined") {
        autoSaveTimerRef.current = window.setTimeout(runAutoSave, 5000);
      }
    } finally {
      autoSavingRef.current = false;
    }
  }, [busy, cancelAutoSave, interviewLocked, loaded, loading, questions.length, saveAnswers]);

  const scheduleAutoSave = useCallback(() => {
    if (
      interviewLocked ||
      loading ||
      !loaded ||
      !questions.length
    ) {
      return;
    }
    pendingAutoSaveRef.current = true;
    if (typeof window === "undefined") return;
    cancelAutoSave();
    autoSaveTimerRef.current = window.setTimeout(runAutoSave, 1200);
  }, [cancelAutoSave, interviewLocked, loaded, loading, questions.length, runAutoSave]);

  const readTextareaValue = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return false;
    const current = textarea.value;
    if (renderedValueRef.current !== current) {
      renderedValueRef.current = current;
    }
    if (draftRef.current === current) {
      return false;
    }
    draftRef.current = current;
    return true;
  }, []);

  const flushPendingAnswer = useCallback(
    (targetIndex = indexRef.current) => {
      cancelInputFrame();
      cancelPendingSync();
      readTextareaValue();
      if (
        !questions.length ||
        targetIndex < 0 ||
        targetIndex >= questions.length
      ) {
        return;
      }
      updateAnswer(targetIndex, draftRef.current);
      scheduleAutoSave();
    },
    [
      cancelInputFrame,
      cancelPendingSync,
      questions,
      readTextareaValue,
      scheduleAutoSave,
      updateAnswer,
    ],
  );

  const scheduleSync = useCallback(() => {
    cancelPendingSync();
    syncTimerRef.current = setTimeout(() => {
      syncTimerRef.current = null;
      flushPendingAnswer();
    }, 250);
  }, [cancelPendingSync, flushPendingAnswer]);

  const queueDraftSync = useCallback(() => {
    if (
      typeof window === "undefined" ||
      typeof window.requestAnimationFrame !== "function"
    ) {
      if (readTextareaValue()) {
        scheduleSync();
      }
      return;
    }
    if (inputFrameRef.current !== null) return;
    inputFrameRef.current = window.requestAnimationFrame(() => {
      inputFrameRef.current = null;
      if (readTextareaValue()) {
        scheduleSync();
      }
    });
  }, [readTextareaValue, scheduleSync]);

  const handleTextareaChange = useCallback(() => {
    queueDraftSync();
  }, [queueDraftSync]);

  const handleTextareaBlur = useCallback(() => {
    flushPendingAnswer();
  }, [flushPendingAnswer]);

  useEffect(() => {
    cancelInputFrame();
    cancelPendingSync();
    const hasQuestions =
      questions.length && index >= 0 && index < questions.length;
    const next = hasQuestions ? getAnswer(index) : "";
    draftRef.current = next;
    if (renderedValueRef.current !== next) {
      const textarea = textareaRef.current;
      if (textarea) {
        textarea.value = next;
      }
    }
    renderedValueRef.current = next;
  }, [
    answersVersion,
    cancelInputFrame,
    cancelPendingSync,
    getAnswer,
    index,
    questions.length,
  ]);

  useEffect(() => {
    return () => {
      flushPendingAnswer();
      cancelAutoSave();
      if (pendingAutoSaveRef.current && !interviewLocked) {
        pendingAutoSaveRef.current = false;
        saveAnswers().catch((error) => {
          console.error("Failed to save answers before leaving", error);
        });
      }
    };
  }, [cancelAutoSave, flushPendingAnswer, interviewLocked, saveAnswers]);

  useEffect(() => {
    if (interviewLocked) {
      cancelAutoSave();
      pendingAutoSaveRef.current = false;
    }
  }, [cancelAutoSave, interviewLocked]);

  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2400);
  };

  const persistAnswers = async (withSuccessToast = true) => {
    if (busy) return false;
    flushPendingAnswer();
    let ok = true;
    try {
      setBusy(true);
      await saveAnswers();
      pendingAutoSaveRef.current = false;
      cancelAutoSave();
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

  const handleNext = () => {
    if (questions.length === 0 || busy) return;
    flushPendingAnswer();
    if (index < questions.length - 1) {
      setIndex((prev) => Math.min(prev + 1, questions.length - 1));
      return;
    }
    setCompleteDialogOpen(true);
  };



  const finalizeCompletion = async () => {

    if (busy) return;

    const saved = await persistAnswers(false);

    if (!saved) return;



    setCompleteDialogOpen(false);



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

      showToast("?? ??????? ????????? ???????. ?????????? ?????.");

    } finally {

      setBusy(false);

    }

  };



  const cancelCompletion = () => {

    if (busy) return;

    setCompleteDialogOpen(false);

  };



  const handlePrev = () => {
    if (busy || questions.length === 0) return;
    flushPendingAnswer();
    setIndex((prev) => Math.max(0, prev - 1));
  };

  const disabled = busy || loading;
  const currentQuestion = totalCount > 0 ? index + 1 : 0;

  if (!loading && loaded && interviewLocked) {
    return <Navigate to="/complete" replace />;
  }

  return (
    <div>
      <Header />

      <ConfirmDialog
        open={completeDialogOpen}
        title="Завершить интервью?"
        message="Вы действительно хотите завершить вопросы? После подтверждения ответы нельзя будет изменить."
        confirmLabel="Завершить"
        cancelLabel="Продолжить"
        busy={busy}
        onConfirm={finalizeCompletion}
        onCancel={cancelCompletion}
      />

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
                ref={textareaRef}
                className="input min-h-[220px] text-[1.05rem] mt-3"
                placeholder="Опишите ваш ответ. Приведите примеры, детали и факты — всё, что поможет создать книгу."
                defaultValue={renderedValueRef.current}
                onChange={handleTextareaChange}
                onInput={handleTextareaChange}
                onBlur={handleTextareaBlur}
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="off"
                autoComplete="off"
                data-gramm="false"
                data-enable-grammarly="false"
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
