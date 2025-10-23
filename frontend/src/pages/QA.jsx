import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import Header from "../components/Header.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import Footer from "../components/Footer.jsx";
import Progress from "../components/Progress.jsx";
import QuestionsEmptyState from "../components/QuestionsEmptyState.jsx";
import { apiPost } from "../shared/api.js";
import { useAuth } from "../shared/AuthContext.jsx";
import { useQuestions } from "../shared/QuestionsContext.jsx";

const AUTO_SAVE_DELAY = 1500;
const AUTO_SAVE_STATE_RESET = 4000;

const TOAST_DURATION = 4000;
const APPROX_DURATION_LABEL = "~30 минут";

function chapterKeyFor(chapter, index) {
  if (chapter && chapter.id !== undefined && chapter.id !== null) {
    return String(chapter.id);
  }
  return `index-${index}`;
}

function sanitizeIndex(rawIndex, total) {
  if (total <= 0) return 0;
  const value = Number(rawIndex);
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(value, 0), total - 1);
}

export default function QA() {
  const navigate = useNavigate();
  const { refreshUser, setUser } = useAuth();
  const {
    questions,
    chapters,
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

  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeChapterKey, setActiveChapterKey] = useState(null);
  const [draft, setDraft] = useState("");
  const [toast, setToast] = useState(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [finishBusy, setFinishBusy] = useState(false);
  const [autoSaveState, setAutoSaveState] = useState("idle");
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);

  const textareaRef = useRef(null);
  const autoSaveTimerRef = useRef(null);
  const autoSaveStateResetRef = useRef(null);
  const toastTimerRef = useRef(null);
  const draftRef = useRef("");
  const dirtyRef = useRef(false);
  const editVersionRef = useRef(0);

  const chapterList = useMemo(() => {
    if (!Array.isArray(chapters)) return [];
    return [...chapters].sort((a, b) => {
      const aPos =
        Number.isFinite(Number(a?.position))
          ? Number(a.position)
          : Number(a?.startIndex ?? 0);
      const bPos =
        Number.isFinite(Number(b?.position))
          ? Number(b.position)
          : Number(b?.startIndex ?? 0);
      return aPos - bPos;
    });
  }, [chapters]);

  const handleCleanup = useCallback(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    if (autoSaveStateResetRef.current) {
      clearTimeout(autoSaveStateResetRef.current);
      autoSaveStateResetRef.current = null;
    }
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
  }, []);

  useEffect(() => handleCleanup, [handleCleanup]);

  useEffect(() => {
    if (!questions.length) {
      setCurrentIndex(0);
      return;
    }
    setCurrentIndex((prev) => sanitizeIndex(prev, questions.length));
  }, [questions.length]);

  useEffect(() => {
    if (activeChapterKey === null) return;
    const exists = chapterList.some(
      (chapter, index) =>
        chapterKeyFor(chapter, index) === String(activeChapterKey)
    );
    if (!exists) {
      setActiveChapterKey(null);
    }
  }, [chapterList, activeChapterKey]);

  const activeChapterIndex = useMemo(() => {
    if (activeChapterKey === null) return -1;
    return chapterList.findIndex(
      (chapter, index) =>
        chapterKeyFor(chapter, index) === String(activeChapterKey)
    );
  }, [chapterList, activeChapterKey]);

  const activeChapter =
    activeChapterIndex >= 0 ? chapterList[activeChapterIndex] ?? null : null;

  const chapterStartIndex = useMemo(() => {
    if (!activeChapter) return 0;
    const raw = Number(activeChapter.startIndex ?? 0);
    if (!Number.isFinite(raw) || raw < 0) return 0;
    return sanitizeIndex(raw, questions.length || 1);
  }, [activeChapter, questions.length]);

  const chapterEndIndex = useMemo(() => {
    if (!activeChapter) {
      return Math.max(questions.length - 1, 0);
    }
    const start = sanitizeIndex(activeChapter.startIndex ?? 0, questions.length || 1);
    const declared = Number(activeChapter.questionCount ?? 0);
    if (Number.isFinite(declared) && declared > 0) {
      return Math.min(start + declared - 1, Math.max(questions.length - 1, start));
    }
    const nextChapter = chapterList[activeChapterIndex + 1] ?? null;
    if (nextChapter) {
      const nextStart = sanitizeIndex(
        nextChapter.startIndex ?? questions.length,
        questions.length || 1
      );
      if (nextStart > start) {
        return Math.min(nextStart - 1, Math.max(questions.length - 1, start));
      }
    }
    return Math.max(questions.length - 1, start);
  }, [activeChapter, chapterList, activeChapterIndex, questions.length]);

  const chapterQuestionCount = useMemo(() => {
    if (!questions.length) return 0;
    if (!activeChapter) return questions.length;
    const end = Math.max(chapterEndIndex, chapterStartIndex - 1);
    return Math.max(0, end - chapterStartIndex + 1);
  }, [questions.length, activeChapter, chapterStartIndex, chapterEndIndex]);

  useEffect(() => {
    if (activeChapterKey === null) return;
    setCurrentIndex((prev) => {
      if (chapterQuestionCount === 0) return prev;
      if (prev >= chapterStartIndex && prev <= chapterEndIndex) {
        return prev;
      }
      return chapterStartIndex;
    });
  }, [activeChapterKey, chapterStartIndex, chapterEndIndex, chapterQuestionCount]);

  useEffect(() => {
    if (!questions.length) {
      setDraft("");
      draftRef.current = "";
      return;
    }
    const safeIndex = sanitizeIndex(currentIndex, questions.length);
    const nextValue = getAnswer(safeIndex) ?? "";
    if (draftRef.current !== nextValue) {
      setDraft(nextValue);
      draftRef.current = nextValue;
    }
  }, [currentIndex, answersVersion, getAnswer, questions.length]);

  useEffect(() => {
    if (activeChapterKey === null) return;
    if (!textareaRef.current) return;
    const element = textareaRef.current;
    requestAnimationFrame(() => {
      element.focus();
      const position = element.value.length;
      element.setSelectionRange(position, position);
    });
  }, [activeChapterKey, currentIndex]);

  const showToast = useCallback((message, tone = "info") => {
    setToast({ message, tone });
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, TOAST_DURATION);
  }, []);

  const markSaved = useCallback(() => {
    setAutoSaveState("saved");
    if (autoSaveStateResetRef.current) {
      clearTimeout(autoSaveStateResetRef.current);
    }
    autoSaveStateResetRef.current = window.setTimeout(() => {
      setAutoSaveState("idle");
      autoSaveStateResetRef.current = null;
    }, AUTO_SAVE_STATE_RESET);
  }, []);

  const scheduleAutoSave = useCallback(
    (version) => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      autoSaveTimerRef.current = window.setTimeout(async () => {
        autoSaveTimerRef.current = null;
        if (!dirtyRef.current) return;
        setAutoSaveState("saving");
        try {
          await saveAnswers();
          if (editVersionRef.current === version) {
            dirtyRef.current = false;
            markSaved();
          } else {
            setAutoSaveState("dirty");
          }
        } catch (error) {
          console.error("Failed to auto-save answers", error);
          setAutoSaveState("error");
        }
      }, AUTO_SAVE_DELAY);
    },
    [saveAnswers, markSaved]
  );

  const handleOpenChapter = useCallback(
    (chapter, index) => {
      const key = chapterKeyFor(chapter, index);
      const start = sanitizeIndex(chapter?.startIndex ?? 0, questions.length || 1);
      setActiveChapterKey(key);
      setCurrentIndex(start);
    },
    [questions.length]
  );

  const handleBackToChapters = useCallback(() => {
    setActiveChapterKey(null);
  }, []);

  const handlePrevQuestion = useCallback(() => {
    setCurrentIndex((prev) =>
      Math.max(prev - 1, chapterStartIndex)
    );
  }, [chapterStartIndex]);

  const handleNextQuestion = useCallback(() => {
    setCurrentIndex((prev) =>
      Math.min(prev + 1, chapterEndIndex)
    );
  }, [chapterEndIndex]);

  const handleInputChange = useCallback(
    (event) => {
      if (!questions.length) return;
      const value = event.target.value;
      setDraft(value);
      draftRef.current = value;
      const safeIndex = sanitizeIndex(currentIndex, questions.length);
      updateAnswer(safeIndex, value);
      editVersionRef.current += 1;
      dirtyRef.current = true;
      const version = editVersionRef.current;
      setAutoSaveState((prev) => (prev === "saving" ? prev : "dirty"));
      scheduleAutoSave(version);
    },
    [currentIndex, questions.length, updateAnswer, scheduleAutoSave]
  );

  const handleManualSave = useCallback(async () => {
    if (saveBusy) return;
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    setSaveBusy(true);
    setAutoSaveState("saving");
    try {
      await saveAnswers();
      dirtyRef.current = false;
      markSaved();
      showToast("Ответы сохранены", "success");
    } catch (error) {
      console.error("Failed to save answers", error);
      setAutoSaveState("error");
      showToast(
        error?.message || "Не удалось сохранить ответы. Попробуйте ещё раз.",
        "error"
      );
    } finally {
      setSaveBusy(false);
    }
  }, [saveBusy, saveAnswers, showToast, markSaved]);

  const handleCompleteConfirm = useCallback(async () => {
    if (finishBusy) return;
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    setFinishBusy(true);
    setAutoSaveState("saving");
    try {
      await saveAnswers();
      await apiPost("/api/complete");
      dirtyRef.current = false;
      markSaved();
      const updated = await refreshUser();
      if (updated) {
        setUser(updated);
      }
      showToast("Ответы отправлены редакции", "success");
      navigate("/complete", { replace: true });
    } catch (error) {
      console.error("Failed to complete interview", error);
      setAutoSaveState("error");
      showToast(
        error?.message || "Не удалось отправить ответы. Попробуйте позже.",
        "error"
      );
    } finally {
      setFinishBusy(false);
      setCompleteDialogOpen(false);
    }
  }, [finishBusy, saveAnswers, refreshUser, setUser, navigate, showToast, markSaved]);

  const computeChapterCount = useCallback(
    (chapter, index) => {
      if (!chapter) return 0;
      if (!questions.length) return 0;
      const start = sanitizeIndex(chapter.startIndex ?? 0, questions.length || 1);
      const declared = Number(chapter.questionCount ?? 0);
      if (Number.isFinite(declared) && declared > 0) {
        return Math.min(declared, Math.max(0, questions.length - start));
      }
      const nextChapter = chapterList[index + 1] ?? null;
      if (nextChapter) {
        const nextStart = sanitizeIndex(
          nextChapter.startIndex ?? questions.length,
          questions.length || 1
        );
        if (nextStart > start) {
          return Math.min(nextStart - start, Math.max(0, questions.length - start));
        }
      }
      return Math.max(0, questions.length - start);
    },
    [chapterList, questions.length]
  );

  const formatChapterTitle = useCallback((chapter, index) => {
    const baseTitle = `Глава ${index + 1}.`;
    const raw =
      typeof chapter?.title === "string" ? chapter.title.trim() : "";
    return {
      heading: baseTitle,
      subtitle: raw.length ? raw : null,
    };
  }, []);

  const renderAutoSaveStatus = () => {
    switch (autoSaveState) {
      case "saving":
        return "Сохраняем черновик…";
      case "dirty":
        return "Есть несохранённые изменения.";
      case "saved":
        return "Черновик сохранён.";
      case "error":
        return "Автосохранение не удалось. Сохраните ответы вручную.";
      default:
        return null;
    }
  };

  if (interviewLocked) {
    return <Navigate to="/complete" replace />;
  }

  const isLoading = loading && !loaded;
  const hasQuestions = questions.length > 0;
  const showChapterSelection = !isLoading && hasQuestions && activeChapterKey === null;

  let mainContent = null;

  if (isLoading) {
    mainContent = (
      <section className="paper p-6 text-center text-muted">
        Загружаем вопросы…
      </section>
    );
  } else if (!hasQuestions) {
    mainContent = (
      <section className="paper p-6 space-y-6 text-center">
        <QuestionsEmptyState />
        <div>
          <Link className="btn" to="/dashboard">
            Вернуться в кабинет
          </Link>
        </div>
      </section>
    );
  } else if (showChapterSelection) {
    mainContent = (
      <section className="paper p-6 space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="font-serif text-[clamp(1.6rem,3.6vw,2.2rem)]">
            Выберите главу
          </h1>
          <p className="text-muted">
            Ответы распределены по главам. Работайте постепенно — сохраняем
            черновик автоматически.
          </p>
        </div>

        {chapterList.length === 0 ? (
          <div className="text-center text-muted">
            Главы ещё не сформированы. Как только редакция подготовит вопросы,
            они появятся здесь.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {chapterList.map((chapter, index) => {
              const { heading, subtitle } = formatChapterTitle(chapter, index);
              const questionCount = computeChapterCount(chapter, index);
              return (
                <div
                  key={chapterKeyFor(chapter, index)}
                  className="paper px-4 py-5 flex flex-col gap-4 text-center"
                >
                  <div className="space-y-1">
                    <div className="font-serif text-lg">{heading}</div>
                    {subtitle ? (
                      <div className="text-muted text-sm whitespace-pre-wrap break-words">
                        {subtitle}
                      </div>
                    ) : null}
                  </div>
                  <div className="text-muted text-sm">
                    Вопросов: {questionCount} · {APPROX_DURATION_LABEL}
                  </div>
                  <div className="mt-auto flex justify-center">
                    <button
                      type="button"
                      className="btn primary"
                      onClick={() => handleOpenChapter(chapter, index)}
                    >
                      Открыть
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-center">
          <Link className="btn" to="/dashboard">
            Вернуться в кабинет
          </Link>
        </div>
      </section>
    );
  } else {
    const safeIndex = sanitizeIndex(currentIndex, questions.length);
    const currentQuestion =
      typeof questions[safeIndex] === "string"
        ? questions[safeIndex]
        : questions[safeIndex]?.text ?? "";
    const chapterNumber =
      activeChapterIndex >= 0 ? activeChapterIndex + 1 : safeIndex + 1;
    const { heading: chapterHeading, subtitle: chapterSubtitle } =
      formatChapterTitle(activeChapter, chapterNumber - 1);
    const questionNumberInChapter =
      chapterQuestionCount > 0
        ? Math.max(1, safeIndex - chapterStartIndex + 1)
        : 0;

    mainContent = (
      <section className="paper p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button className="btn" type="button" onClick={handleBackToChapters}>
            ← Ко всем главам
          </button>
          <div className="text-sm text-muted">
            Ответов: {answeredCount} из {totalCount}
          </div>
        </div>

        <div className="space-y-1">
          <h1 className="font-serif text-[clamp(1.6rem,3.6vw,2.2rem)]">
            {chapterHeading}
          </h1>
          {chapterSubtitle ? (
            <div className="text-muted whitespace-pre-wrap break-words">
              {chapterSubtitle}
            </div>
          ) : null}
          <div className="text-muted text-sm">
            Вопросов в главе: {chapterQuestionCount} · {APPROX_DURATION_LABEL}
          </div>
        </div>

        <Progress value={progress} />

        {chapterQuestionCount === 0 ? (
          <div className="border border-dashed border-line rounded-[16px] bg-[rgba(255,255,255,.65)] p-6 text-center space-y-2">
            <div className="font-semibold">В этой главе пока нет вопросов</div>
            <div className="text-muted text-sm">
              Дождитесь, когда редакция добавит вопросы, или выберите другую главу.
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-semibold">
                  Вопрос {questionNumberInChapter} из {chapterQuestionCount}
                </div>
                <div className="text-muted text-sm">
                  Общий номер: {safeIndex + 1}
                </div>
              </div>
              <div className="border border-dashed border-line rounded-[16px] bg-[rgba(255,255,255,.75)] p-4 text-[1.05rem] leading-relaxed whitespace-pre-wrap break-words">
                {currentQuestion || "Текст вопроса недоступен."}
              </div>
            </div>

            <textarea
              ref={textareaRef}
              className="input min-h-[220px] w-full"
              value={draft}
              onChange={handleInputChange}
              placeholder="Введите ответ…"
            />

            <div className="text-sm text-muted">
              {renderAutoSaveStatus()}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                className="btn"
                type="button"
                onClick={handlePrevQuestion}
                disabled={safeIndex <= chapterStartIndex}
              >
                ← Предыдущий вопрос
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  className="btn"
                  type="button"
                  onClick={handleManualSave}
                  disabled={saveBusy}
                >
                  {saveBusy ? "Сохраняем…" : "Сохранить"}
                </button>
                <button
                  className="btn danger"
                  type="button"
                  onClick={() => setCompleteDialogOpen(true)}
                  disabled={finishBusy}
                >
                  Отправить ответы
                </button>
              </div>

              <button
                className="btn"
                type="button"
                onClick={handleNextQuestion}
                disabled={safeIndex >= chapterEndIndex}
              >
                Следующий вопрос →
              </button>
            </div>
          </div>
        )}
      </section>
    );
  }

  const toastElement = !toast ? null : (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-[16px] shadow-lg border ${
        toast.tone === "error"
          ? "bg-[#fdecea] border-[#f3b8b5] text-[#8a2a21]"
          : toast.tone === "success"
          ? "bg-[#e7f6ee] border-[#b7ddc3] text-[#1f5c3d]"
          : "bg-[rgba(255,255,255,.95)] border-line text-[#2b2a27]"
      }`}
    >
      {toast.message}
    </div>
  );

  return (
    <div>
      <Header />

      <main className="container mx-auto px-4 mt-6 mb-10 space-y-6">
        {mainContent}
      </main>

      <Footer />

      {toastElement}

      <ConfirmDialog
        open={completeDialogOpen}
        title="Отправить ответы редакции?"
        message={
          finishBusy
            ? "Отправляем ответы…"
            : "После отправки редактирование будет недоступно. Убедитесь, что сохранили все изменения."
        }
        confirmLabel={finishBusy ? "Отправляем…" : "Отправить"}
        confirmTone="primary"
        busy={finishBusy}
        onConfirm={handleCompleteConfirm}
        onCancel={() => setCompleteDialogOpen(false)}
      />
    </div>
  );
}

