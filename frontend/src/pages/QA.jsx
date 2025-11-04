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

// ---------- Константы ----------
const AUTO_SAVE_DELAY = 1500;
const AUTO_SAVE_STATE_RESET = 4000;
const TOAST_DURATION = 4000;
const APPROX_DURATION_LABEL = "~30 минут";

// ---------- Вспомогательные функции (вне компонента) ----------
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
  return Math.min(Math.max(Math.floor(value), 0), total - 1);
}

function normalizeChapters(rawChapters, totalQuestions) {
  const total = Math.max(0, totalQuestions);
  const list = Array.isArray(rawChapters) ? rawChapters : [];

  const sorted = [...list].sort((a, b) => {
    const aPos = Number.isFinite(Number(a?.position))
      ? Number(a.position)
      : Number(a?.startIndex ?? 0);
    const bPos = Number.isFinite(Number(b?.position))
      ? Number(b.position)
      : Number(b?.startIndex ?? 0);
    return aPos - bPos;
  });

  let cursor = 0;

  return sorted.map((ch, i) => {
    const rawStart = Number.isFinite(Number(ch?.startIndex))
      ? Math.max(0, Math.floor(Number(ch.startIndex)))
      : cursor;
    const rawCount = Number.isFinite(Number(ch?.questionCount))
      ? Math.max(0, Math.floor(Number(ch.questionCount)))
      : 0;

    const remainingSlots = Math.max(0, total - cursor);
    const count =
      rawCount > 0 ? Math.min(rawCount, remainingSlots) : 0;

    let start = rawStart;
    if (count > 0) {
      const maxStart = Math.max(0, total - count);
      start = Math.min(Math.max(start, cursor), maxStart);
    } else {
      start = Math.min(Math.max(start, cursor), total);
    }

    let end = count > 0 ? start + count - 1 : start - 1;
    if (count > 0 && total > 0) {
      const maxEnd = total - 1;
      if (end > maxEnd) {
        end = maxEnd;
        start = Math.max(0, end - count + 1);
      }
    }

    cursor = count > 0 ? end + 1 : Math.max(cursor, start);

    return {
      ...ch,
      __idx: i,
      key: chapterKeyFor(ch, i),
      title: typeof ch?.title === "string" ? ch.title.trim() : "",
      start,
      end,
      count,
      originalStartIndex: rawStart,
    };
  });
}

function buildIndexMap(totalQuestions, normalizedChapters) {
  const total = Math.max(0, totalQuestions);
  const map = new Array(total).fill(-1);
  normalizedChapters.forEach((ch, idx) => {
    const count = Number.isFinite(ch?.count) ? Math.max(0, ch.count) : 0;
    const start = Number.isFinite(ch?.start) ? Math.max(0, Math.floor(ch.start)) : 0;
    const end = Number.isFinite(ch?.end)
      ? Math.max(start, Math.floor(ch.end))
      : start + count - 1;
    if (count <= 0 || end < start) return;
    for (let i = start; i <= end && i < total; i += 1) {
      map[i] = idx;
    }
  });
  return map;
}

function chapterCount(ch) {
  if (Number.isFinite(ch?.count)) {
    return Math.max(0, ch.count);
  }
  if (Number.isFinite(ch?.questionCount)) {
    return Math.max(0, ch.questionCount);
  }
  const start = Number.isFinite(ch?.start) ? ch.start : 0;
  const end = Number.isFinite(ch?.end) ? ch.end : start - 1;
  return Math.max(0, Math.floor(end) - Math.floor(start) + 1);
}

function formatChapterTitle(chapter, index) {
  const heading = `Глава ${index + 1}.`;
  const subtitle = chapter?.title ? chapter.title : null;
  return { heading, subtitle };
}

// =================== КОМПОНЕНТ ===================
export default function QA() {
  const navigate = useNavigate();
  const { refreshUser, setUser, user } = useAuth();
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
    resumeIndex,
  } = useQuestions();

  // ---------- State/Refs ----------
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
  const initialSelectionAppliedRef = useRef(false);

  const totalQuestions = questions.length;

  // ---------- Нормализация глав и карты индексов ----------
  const normalizedChapters = useMemo(
    () => normalizeChapters(chapters, totalQuestions),
    [chapters, totalQuestions]
  );

  const indexMap = useMemo(
    () => buildIndexMap(totalQuestions, normalizedChapters),
    [totalQuestions, normalizedChapters]
  );

  // ---------- Текущая активная глава / её границы ----------
  const activeChapterIndex = useMemo(() => {
    if (activeChapterKey === null) return -1;
    return normalizedChapters.findIndex(
      (ch) => ch.key === String(activeChapterKey)
    );
  }, [normalizedChapters, activeChapterKey]);

  const activeChapter =
    activeChapterIndex >= 0 ? normalizedChapters[activeChapterIndex] : null;

  const hasAnyQuestions = totalQuestions > 0;

  const chapterQuestionCount = activeChapter
    ? chapterCount(activeChapter)
    : totalQuestions;

  const chapterStartIndex = activeChapter
    ? hasAnyQuestions
      ? sanitizeIndex(activeChapter?.start ?? 0, totalQuestions)
      : 0
    : 0;

  const chapterEndIndex = (() => {
    if (!hasAnyQuestions) return 0;
    if (!activeChapter) return Math.max(totalQuestions - 1, 0);
    if (chapterQuestionCount === 0) return chapterStartIndex;
    const rawEnd = Number.isFinite(Number(activeChapter.end))
      ? Number(activeChapter.end)
      : Number(activeChapter.start ?? 0);
    return Math.max(chapterStartIndex, sanitizeIndex(rawEnd, totalQuestions));
  })();

  // ---------- Очистка таймеров ----------
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

  // ---------- Держим currentIndex валидным ----------
  useEffect(() => {
    if (!totalQuestions) {
      setCurrentIndex(0);
      return;
    }
    setCurrentIndex((prev) => sanitizeIndex(prev, totalQuestions));
  }, [totalQuestions]);

  // ---------- Сброс активной главы, если её больше нет ----------
  useEffect(() => {
    if (activeChapterKey === null) return;
    const stillExists = normalizedChapters.some(
      (ch) => ch.key === String(activeChapterKey)
    );
    if (!stillExists) setActiveChapterKey(null);
  }, [normalizedChapters, activeChapterKey]);

  // ---------- Выставляем черновик при смене вопроса / ответов ----------
  useEffect(() => {
    if (!totalQuestions) {
      setDraft("");
      draftRef.current = "";
      return;
    }
    const safeIndex = sanitizeIndex(currentIndex, totalQuestions);
    const nextValue = getAnswer(safeIndex) ?? "";
    if (draftRef.current !== nextValue) {
      setDraft(nextValue);
      draftRef.current = nextValue;
    }
  }, [currentIndex, answersVersion, getAnswer, totalQuestions]);

  // ---------- Фокус в textarea при переключении главы/вопроса ----------
  useEffect(() => {
    if (activeChapterKey === null) return;
    const el = textareaRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.focus();
      const pos = el.value.length;
      el.setSelectionRange(pos, pos);
    });
  }, [activeChapterKey, currentIndex]);

  // ---------- Первичная позиция (resume/localStorage) без функций в deps ----------
  useEffect(() => {
    if (initialSelectionAppliedRef.current) return;
    if (!loaded || loading) return;

    if (!normalizedChapters.length || !totalQuestions) {
      initialSelectionAppliedRef.current = true;
      return;
    }

    let storedIndex = null;
    if (typeof window !== "undefined" && user?.id) {
      try {
        const raw = window.localStorage.getItem(
          `fate:last-position:${user.id}`
        );
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && Number.isFinite(Number(parsed.index))) {
            storedIndex = Number(parsed.index);
          }
        }
      } catch (_) {}
    }

    let targetIndex = storedIndex;
    if (targetIndex === null && Number.isFinite(resumeIndex)) {
      targetIndex = resumeIndex;
    }
    if (targetIndex === null) {
      initialSelectionAppliedRef.current = true;
      return;
    }

    const safeIndex = sanitizeIndex(targetIndex, totalQuestions);
    const chIdx = indexMap[safeIndex];
    if (
      !Number.isInteger(chIdx) ||
      chIdx < 0 ||
      chIdx >= normalizedChapters.length
    ) {
      initialSelectionAppliedRef.current = true;
      return;
    }

    setActiveChapterKey(normalizedChapters[chIdx].key);
    setCurrentIndex(safeIndex);
    initialSelectionAppliedRef.current = true;
  }, [
    loaded,
    loading,
    normalizedChapters,
    indexMap,
    totalQuestions,
    resumeIndex,
    user?.id,
  ]);

  // ---------- Сохраняем «последнюю позицию» ----------
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!user?.id) return;
    if (!totalQuestions) return;
    if (activeChapterKey === null) return;
    const safeIndex = sanitizeIndex(currentIndex, totalQuestions);
    try {
      window.localStorage.setItem(
        `fate:last-position:${user.id}`,
        JSON.stringify({ index: safeIndex })
      );
    } catch (_) {}
  }, [user?.id, currentIndex, totalQuestions, activeChapterKey]);

  // ---------- Тосты / автосохранение ----------
  const showToast = useCallback((message, tone = "info") => {
    setToast({ message, tone });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, TOAST_DURATION);
  }, []);

  const markSaved = useCallback(() => {
    setAutoSaveState("saved");
    if (autoSaveStateResetRef.current)
      clearTimeout(autoSaveStateResetRef.current);
    autoSaveStateResetRef.current = window.setTimeout(() => {
      setAutoSaveState("idle");
      autoSaveStateResetRef.current = null;
    }, AUTO_SAVE_STATE_RESET);
  }, []);

  const scheduleAutoSave = useCallback(
    (version) => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
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
        } catch (err) {
          console.error("Failed to auto-save answers", err);
          setAutoSaveState("error");
        }
      }, AUTO_SAVE_DELAY);
    },
    [saveAnswers, markSaved]
  );

  // ---------- Хэндлеры ----------
  const handleOpenChapter = useCallback(
    (chapter, idx) => {
      const key = chapterKeyFor(chapter, idx);
      const baseStart = Number.isFinite(Number(chapter?.start))
        ? Number(chapter.start)
        : Number(chapter?.startIndex ?? 0);
      const start = sanitizeIndex(baseStart, totalQuestions || 1);
      setActiveChapterKey(key);
      setCurrentIndex(start);
    },
    [totalQuestions]
  );

  const handleBackToChapters = useCallback(() => setActiveChapterKey(null), []);

  const handlePrevQuestion = useCallback(
    () => setCurrentIndex((prev) => Math.max(prev - 1, chapterStartIndex)),
    [chapterStartIndex]
  );

  const handleNextQuestion = useCallback(
    () => setCurrentIndex((prev) => Math.min(prev + 1, chapterEndIndex)),
    [chapterEndIndex]
  );

  const handleInputChange = useCallback(
    (e) => {
      if (!totalQuestions) return;
      const value = e.target.value;
      setDraft(value);
      draftRef.current = value;
      const safeIndex = sanitizeIndex(currentIndex, totalQuestions);
      updateAnswer(safeIndex, value);
      editVersionRef.current += 1;
      dirtyRef.current = true;
      const version = editVersionRef.current;
      setAutoSaveState((prev) => (prev === "saving" ? prev : "dirty"));
      scheduleAutoSave(version);
    },
    [currentIndex, totalQuestions, updateAnswer, scheduleAutoSave]
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
      if (updated) setUser(updated);
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
  }, [
    finishBusy,
    saveAnswers,
    refreshUser,
    setUser,
    navigate,
    showToast,
    markSaved,
  ]);

  // ---------- Рендер ----------
  if (interviewLocked) return <Navigate to="/complete" replace />;

  const isLoading = loading && !loaded;
  const hasQuestions = totalQuestions > 0;
  const showChapterSelection =
    !isLoading && hasQuestions && activeChapterKey === null;

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
          <h1 className="font-serif text-[clamp(1.6rem,3.6vw,2.2rem)] text-ink">
            Выберите главу
          </h1>
          <p className="text-muted">
            Ответы распределены по главам. Работайте постепенно — сохраняем
            черновик автоматически.
          </p>
        </div>

        {normalizedChapters.length === 0 ? (
          <div className="text-center text-muted">
            Главы ещё не сформированы. Как только редакция подготовит вопросы,
            они появятся здесь.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {normalizedChapters.map((chapter, index) => {
              const { heading, subtitle } = formatChapterTitle(chapter, index);
              const questionCount = chapterCount(chapter);
              return (
                <div
                  key={chapter.key}
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
    const safeIndex = sanitizeIndex(currentIndex, totalQuestions);
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
          <h1 className="font-serif text-[clamp(1.6rem,3.6vw,2.2rem)] text-ink">
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
          <div className="border border-dashed border-line rounded-[16px] bg-[rgba(255,255,255,.65)] dark:bg-[rgba(45,42,38,.65)] p-6 text-center space-y-2">
            <div className="font-semibold">В этой главе пока нет вопросов</div>
            <div className="text-muted text-sm">
              Дождитесь, когда редакция добавит вопросы, или выберите другую
              главу.
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
              <div className="border border-dashed border-line rounded-[16px] bg-[rgba(255,255,255,.75)] dark:bg-[rgba(45,42,38,.75)] p-4 text-[1.05rem] leading-relaxed whitespace-pre-wrap break-words text-ink">
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
              {autoSaveState === "saving"
                ? "Сохраняем черновик…"
                : autoSaveState === "dirty"
                ? "Есть несохранённые изменения."
                : autoSaveState === "saved"
                ? "Черновик сохранён."
                : autoSaveState === "error"
                ? "Автосохранение не удалось. Сохраните ответы вручную."
                : null}
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
          ? "bg-red-50 dark:bg-red-950/60 border-red-300 dark:border-red-800 text-red-800 dark:text-red-200"
          : toast.tone === "success"
          ? "bg-green-50 dark:bg-green-950/60 border-green-300 dark:border-green-800 text-green-800 dark:text-green-200"
          : "bg-[rgba(255,255,255,.95)] dark:bg-[rgba(37,34,32,.95)] border-line text-ink"
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
