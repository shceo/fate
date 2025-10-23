import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useParams } from "react-router-dom";
import { apiDelete, apiPost } from "../../shared/api.js";

function sanitizeQuestions(source) {
  return (Array.isArray(source) ? source : [])
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter((value) => value.length);
}

const STATUS_OPTIONS = [
  { value: "", label: "Без статуса" },
  { value: "in_review", label: "Материалы на редактуре" },
  { value: "in_design", label: "Вёрстка и дизайн" },
  { value: "printing", label: "Печать" },
  { value: "ready", label: "Готово к доставке" },
  { value: "shipped", label: "Отправлено" },
  { value: "delivered", label: "Доставлено" },
];

const DAY_MS = 24 * 60 * 60 * 1000;

const deadlineDateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatDaysLabel(value) {
  const abs = Math.abs(value);
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod10 === 1 && mod100 !== 11) {
    return `${value} день`;
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return `${value} дня`;
  }
  return `${value} дней`;
}

export default function UserDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("");
  const [ordered, setOrdered] = useState(false);

  const [mode, setMode] = useState("append");
  const [questionsModalOpen, setQuestionsModalOpen] = useState(false);
  const [questionTab, setQuestionTab] = useState("manual");
  const [selectedChapterId, setSelectedChapterId] = useState(null);

  const [manualSingle, setManualSingle] = useState("");
  const [manualBulk, setManualBulk] = useState("");
  const [manualBusy, setManualBusy] = useState(false);
  const [manualError, setManualError] = useState(null);

  const [chapterCreateTitle, setChapterCreateTitle] = useState("");
  const [chapterCreateBusy, setChapterCreateBusy] = useState(false);
  const [chapterCreateError, setChapterCreateError] = useState(null);

  const [questionsError, setQuestionsError] = useState(null);

  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState(null);
  const [templatesList, setTemplatesList] = useState([]);
  const [templateStep, setTemplateStep] = useState("pick");
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedTemplateQuestions, setSelectedTemplateQuestions] = useState([]);
  const [editableTemplateQuestions, setEditableTemplateQuestions] = useState([]);
  const [templateActionBusy, setTemplateActionBusy] = useState(false);
  const [templateActionError, setTemplateActionError] = useState(null);

  const cleanedEditableQuestions = useMemo(
    () => sanitizeQuestions(editableTemplateQuestions),
    [editableTemplateQuestions]
  );
  useEffect(() => {
    fetch(`/api/admin/users/${id}`, { credentials: "include" })
      .then((response) => response.json())
      .then((payload) => {
        setData(payload);
        setStatus(payload.status || "");
        setOrdered(Boolean(payload.ordered));
      })
      .catch((error) => {
        console.error("Failed to load user", error);
      });
  }, [id]);

  const reload = useCallback(async () => {
    const fresh = await fetch(`/api/admin/users/${id}`, {
      credentials: "include",
    }).then((response) => response.json());
    setData(fresh);
    setStatus(fresh.status || "");
    setOrdered(Boolean(fresh.ordered));
  }, [id]);

  const saveOrder = async () => {
    await apiPost(`/api/admin/users/${id}/order`, { ordered });
    await reload();
  };

  const saveStatus = async () => {
    await apiPost(`/api/admin/users/${id}/status`, { status: status || null });
    await reload();
  };

  const chapters = useMemo(
    () => (Array.isArray(data?.chapters) ? data.chapters : []),
    [data]
  );

  useEffect(() => {
    if (!chapters.length) {
      setSelectedChapterId(null);
      return;
    }
    setSelectedChapterId((current) => {
      if (
        current &&
        chapters.some((chapter) => String(chapter.id) === String(current))
      ) {
        return current;
      }
      return chapters[0].id;
    });
  }, [chapters]);

  const selectedChapter = useMemo(() => {
    if (!selectedChapterId) return null;
    return (
      chapters.find((chapter) => String(chapter.id) === String(selectedChapterId)) ||
      null
    );
  }, [chapters, selectedChapterId]);

  const selectedChapterIndex = useMemo(() => {
    if (!selectedChapterId) return -1;
    return chapters.findIndex(
      (chapter) => String(chapter.id) === String(selectedChapterId)
    );
  }, [chapters, selectedChapterId]);

  const totalQuestions = useMemo(() => {
    return chapters.reduce((acc, chapter) => {
      if (!chapter || !Array.isArray(chapter.questions)) return acc;
      return acc + chapter.questions.length;
    }, 0);
  }, [chapters]);

  const answersSubmittedAt = useMemo(() => {
    if (!data?.interviewLocked) return null;
    if (!Array.isArray(data?.answers) || data.answers.length === 0) return null;
    let latest = null;
    for (const entry of data.answers) {
      if (!entry || !entry.createdAt) continue;
      const stamp = new Date(entry.createdAt);
      if (Number.isNaN(stamp.getTime())) continue;
      if (!latest || stamp > latest) {
        latest = stamp;
      }
    }
    return latest;
  }, [data?.answers, data?.interviewLocked]);

  const answerDeadlineInfo = useMemo(() => {
    if (!answersSubmittedAt) return null;
    const totalDays = 14;
    const now = new Date();
    const diff = now.getTime() - answersSubmittedAt.getTime();
    const elapsedDays = diff > 0 ? Math.floor(diff / DAY_MS) : 0;
    const remainingDays = Math.max(0, totalDays - elapsedDays);
    const deadlineDate = new Date(answersSubmittedAt.getTime() + totalDays * DAY_MS);
    const overdue = now > deadlineDate;
    const overdueDays = overdue
      ? Math.max(
          0,
          Math.floor((now.getTime() - deadlineDate.getTime()) / DAY_MS)
        )
      : 0;
    let tone = "green";
    if (elapsedDays >= 10 || overdue) {
      tone = "red";
    } else if (elapsedDays >= 4) {
      tone = "orange";
    }
    return {
      now,
      elapsedDays,
      remainingDays,
      deadlineDate,
      tone,
      totalDays,
      overdue,
      overdueDays,
    };
  }, [answersSubmittedAt]);

  const formatChapterTitle = useCallback((chapter, index) => {
    const rawTitle = typeof chapter?.title === "string" ? chapter.title.trim() : "";
    if (rawTitle.length) {
      return rawTitle;
    }
    return `Глава ${index + 1}`;
  }, []);
  const openQuestionsModal = () => {
    setManualSingle("");
    setManualBulk("");
    setManualError(null);
    setManualBusy(false);
    setChapterCreateTitle("");
    setChapterCreateError(null);
    setQuestionTab("manual");
    setMode("append");
    setTemplateStep("pick");
    setTemplateActionBusy(false);
    setTemplateActionError(null);
    setSelectedTemplate(null);
    setSelectedTemplateQuestions([]);
    setEditableTemplateQuestions([]);
    setQuestionsModalOpen(true);
  };

  const closeQuestionsModal = () => {
    setQuestionsModalOpen(false);
  };

  const handleTabChange = (nextTab) => {
    setQuestionTab(nextTab);
    if (nextTab === "template") {
      setTemplateStep("pick");
      setTemplateActionError(null);
      setTemplateActionBusy(false);
      setSelectedTemplate(null);
      setSelectedTemplateQuestions([]);
      setEditableTemplateQuestions([]);
      loadTemplatesList();
    }
  };

  const loadTemplatesList = useCallback(async () => {
    setTemplatesLoading(true);
    setTemplatesError(null);
    try {
      const response = await fetch("/api/admin/templates", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Не удалось загрузить список шаблонов.");
      }
      const payload = await response.json();
      setTemplatesList(Array.isArray(payload.templates) ? payload.templates : []);
    } catch (error) {
      console.error(error);
      setTemplatesError(
        error.message || "Не удалось загрузить список шаблонов. Попробуйте ещё раз."
      );
    } finally {
      setTemplatesLoading(false);
    }
  }, []);
  const handleManualSubmit = async (event) => {
    event.preventDefault();
    if (!selectedChapterId) {
      setManualError("Выберите главу, чтобы добавить вопросы.");
      return;
    }
    const single = manualSingle.trim();
    const bulk = manualBulk;
    if (!single && !bulk.trim() && mode === "append") {
      setManualError("Добавьте хотя бы один вопрос или переключитесь на замену.");
      return;
    }

    setManualBusy(true);
    setManualError(null);
    try {
      await apiPost(`/api/admin/users/${id}/questions`, {
        mode,
        chapterId: selectedChapterId,
        questions: single ? [single] : [],
        bulk,
      });
      setManualSingle("");
      setManualBulk("");
      await reload();
    } catch (error) {
      console.error(error);
      setManualError(
        error.message || "Не удалось сохранить вопросы. Попробуйте ещё раз."
      );
    } finally {
      setManualBusy(false);
    }
  };

  const handleCreateChapter = async (event) => {
    event.preventDefault();
    if (chapterCreateBusy) return;
    setChapterCreateBusy(true);
    setChapterCreateError(null);
    try {
      const payload = await apiPost(`/api/admin/users/${id}/chapters`, {
        title: chapterCreateTitle.trim() || null,
      });
      setChapterCreateTitle("");
      if (payload?.id) {
        setSelectedChapterId(payload.id);
      }
      await reload();
    } catch (error) {
      console.error(error);
      setChapterCreateError(
        error.message || "Не удалось создать главу. Попробуйте ещё раз."
      );
    } finally {
      setChapterCreateBusy(false);
    }
  };

  const handleTemplatePick = async (template) => {
    if (!template?.id) return;
    setTemplateActionError(null);
    setTemplateActionBusy(true);
    try {
      const response = await fetch(`/api/admin/templates/${template.id}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Не удалось открыть шаблон.");
      }
      const detail = await response.json();
      const questionsFromTemplate = sanitizeQuestions(detail.questions);
      setSelectedTemplate({
        id: detail.id,
        title: detail.title,
        description: detail.description ?? null,
      });
      setSelectedTemplateQuestions(questionsFromTemplate);
      setEditableTemplateQuestions(questionsFromTemplate);
      setTemplateStep("preview");
      if (!questionsFromTemplate.length) {
        setTemplateActionError("В шаблоне нет вопросов.");
      }
    } catch (error) {
      console.error(error);
      setTemplateActionError(error.message || "Не удалось открыть шаблон.");
    } finally {
      setTemplateActionBusy(false);
    }
  };
  const startEditTemplate = () => {
    setEditableTemplateQuestions([...selectedTemplateQuestions]);
    setTemplateActionError(null);
    setTemplateStep("edit");
  };

  const backToPreviewFromEdit = () => {
    const cleaned = sanitizeQuestions(editableTemplateQuestions);
    setSelectedTemplateQuestions(cleaned);
    setEditableTemplateQuestions(cleaned);
    setTemplateActionError(null);
    setTemplateStep("preview");
  };

  const updateEditableQuestion = (index, value) => {
    setEditableTemplateQuestions((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const removeEditableQuestion = (index) => {
    setEditableTemplateQuestions((prev) =>
      prev.filter((_, position) => position !== index)
    );
  };

  const addEditableQuestion = () => {
    setEditableTemplateQuestions((prev) => [...prev, ""]);
  };

  const applyTemplateQuestions = async (source) => {
    if (!selectedChapterId) {
      setTemplateActionError("Выберите главу, чтобы обновить вопросы.");
      return;
    }
    const prepared = sanitizeQuestions(source);
    if (mode === "append" && prepared.length === 0) {
      setTemplateActionError("Добавьте хотя бы один вопрос или переключитесь на замену.");
      return;
    }
    setTemplateActionBusy(true);
    setTemplateActionError(null);
    try {
      await apiPost(`/api/admin/users/${id}/questions`, {
        mode,
        chapterId: selectedChapterId,
        questions: prepared,
      });
      await reload();
      setTemplateStep("pick");
      setSelectedTemplate(null);
      setSelectedTemplateQuestions([]);
      setEditableTemplateQuestions([]);
    } catch (error) {
      console.error(error);
      setTemplateActionError(
        error.message || "Не удалось применить шаблон. Попробуйте ещё раз."
      );
    } finally {
      setTemplateActionBusy(false);
    }
  };

  const removeQuestion = async (questionId) => {
    setQuestionsError(null);
    try {
      await apiDelete(`/api/admin/users/${id}/questions/${questionId}`);
      await reload();
    } catch (error) {
      console.error(error);
      setQuestionsError(
        error.message || "Не удалось удалить вопрос. Попробуйте ещё раз."
      );
    }
  };

  if (!data) return null;

  const telegram = data.telegram || null;
  const tgUsername =
    telegram?.username && telegram.username.length ? `@${telegram.username}` : "-";
  const tgNameRaw = [telegram?.first_name, telegram?.last_name]
    .filter(Boolean)
    .join(" ");
  const tgName = tgNameRaw && tgNameRaw.trim().length ? tgNameRaw.trim() : "-";
  const tgId = telegram?.id ?? "-";
  const tgPhone = telegram?.phone ?? "-";

  const deadlineToneClass = answerDeadlineInfo
    ? answerDeadlineInfo.tone === "green"
      ? "bg-[#dce6d5] border border-[#c2d6ba] text-[#2f4f2f]"
      : answerDeadlineInfo.tone === "orange"
      ? "bg-[#f6e3cc] border border-[#e4c49b] text-[#7a4f24]"
      : "bg-[#f8d9d6] border border-[#e9b4ac] text-[#7f2d2d]"
    : data.interviewLocked
    ? "bg-[#efe4d8] border border-[#dfc8b5] text-[#6c5b4a]"
    : "bg-[#efe7dd] border border-dashed border-[#d8c9b8] text-[#7a6f64]";

  let deadlinePrimaryText = "";
  let deadlineSecondaryText = null;
  if (answerDeadlineInfo && answersSubmittedAt) {
    if (answerDeadlineInfo.overdue) {
      const overdueLabel = answerDeadlineInfo.overdueDays
        ? `${formatDaysLabel(answerDeadlineInfo.overdueDays)} назад`
        : "сегодня";
      deadlinePrimaryText = `Срок истёк ${overdueLabel}.`;
    } else {
      deadlinePrimaryText = `Завершить до ${deadlineDateFormatter.format(
        answerDeadlineInfo.deadlineDate
      )} · осталось ${formatDaysLabel(answerDeadlineInfo.remainingDays)}.`;
    }
    deadlineSecondaryText = `Ответы отправлены ${deadlineDateFormatter.format(
      answersSubmittedAt
    )} · прошло ${formatDaysLabel(answerDeadlineInfo.elapsedDays)}.`;
  } else if (data.interviewLocked) {
    deadlinePrimaryText = "Ответы отправлены, ожидается подтверждение даты.";
    deadlineSecondaryText =
      "Цветовая индикация обновится после получения отметки времени.";
  } else {
    deadlinePrimaryText = "Ответы ещё не отправлены пользователем.";
    deadlineSecondaryText =
      "Контроль сроков начнётся после полной отправки ответов.";
  }
  const deadlineFooterText = `Общий срок: ${formatDaysLabel(
    answerDeadlineInfo?.totalDays ?? 14
  )}.`;

  const modeHint =
    mode === "replace"
      ? "Режим: заменить вопросы главы."
      : "Режим: добавить вопросы к выбранной главе.";
  const questionsModal = !questionsModalOpen
    ? null
    : (
        <div className="modal-backdrop">
          <div className="modal-card w-[min(860px,96vw)] space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <h3 className="font-serif text-[1.6rem]">Управление вопросами</h3>
                <div className="text-sm text-muted">{modeHint}</div>
                {selectedChapter ? (
                  <div className="text-sm">
                    Текущая глава:
                    <b>
                      {" "}
                      {formatChapterTitle(
                        selectedChapter,
                        selectedChapterIndex >= 0 ? selectedChapterIndex : 0
                      )}
                    </b>
                  </div>
                ) : (
                  <div className="text-sm text-[#b2563f]">
                    Выберите или создайте главу.
                  </div>
                )}
              </div>
              <button className="btn icon-btn" onClick={closeQuestionsModal}>
                X
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-[240px_1fr]">
              <div className="space-y-4">
                <div className="border border-line rounded-[12px] bg-white/70 p-3 space-y-3">
                  <div className="text-xs uppercase tracking-wide text-muted">
                    Главы
                  </div>
                  <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                    {chapters.length === 0 ? (
                      <div className="text-sm text-muted">
                        Создайте первую главу, чтобы добавить вопросы.
                      </div>
                    ) : (
                      chapters.map((chapter, index) => {
                        const active =
                          String(chapter.id) === String(selectedChapterId);
                        return (
                          <button
                            key={chapter.id}
                            type="button"
                            className={`w-full text-left btn ${active ? "primary" : ""}`}
                            onClick={() => setSelectedChapterId(chapter.id)}
                          >
                            {formatChapterTitle(chapter, index)}
                          </button>
                        );
                      })
                    )}
                  </div>

                  <form className="space-y-2" onSubmit={handleCreateChapter}>
                    <input
                      className="input"
                      placeholder="Название главы"
                      value={chapterCreateTitle}
                      onChange={(event) => setChapterCreateTitle(event.target.value)}
                      disabled={chapterCreateBusy}
                    />
                    <button className="btn" type="submit" disabled={chapterCreateBusy}>
                      {chapterCreateBusy ? "Создаём..." : "Создать главу"}
                    </button>
                  </form>
                  {chapterCreateError ? (
                    <div className="text-sm text-[#b2563f]">{chapterCreateError}</div>
                  ) : null}
                </div>

                <div className="border border-line rounded-[12px] bg-white/70 p-3 space-y-2">
                  <div className="text-xs uppercase tracking-wide text-muted">
                    Режим
                  </div>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="chapter-mode"
                      checked={mode === "append"}
                      onChange={() => setMode("append")}
                    />
                    Добавить к выбранной главе
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="chapter-mode"
                      checked={mode === "replace"}
                      onChange={() => setMode("replace")}
                    />
                    Заменить вопросы главы
                  </label>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <button
                    className={`btn ${questionTab === "manual" ? "primary" : ""}`}
                    type="button"
                    onClick={() => handleTabChange("manual")}
                  >
                    Вручную
                  </button>
                  <button
                    className={`btn ${questionTab === "template" ? "primary" : ""}`}
                    type="button"
                    onClick={() => handleTabChange("template")}
                  >
                    Из шаблона
                  </button>
                </div>
                {questionTab === "manual" ? (
                  <form className="space-y-3" onSubmit={handleManualSubmit}>
                    <div className="paper p-4">
                      <div className="font-semibold mb-2">Добавить один вопрос</div>
                      <input
                        className="input"
                        placeholder="Введите текст вопроса"
                        value={manualSingle}
                        onChange={(event) => setManualSingle(event.target.value)}
                        disabled={manualBusy}
                      />
                      <div className="text-sm text-muted mt-2">
                        Короткие подсказки допустимы, HTML не поддерживается.
                      </div>
                    </div>

                    <div className="paper p-4">
                      <div className="font-semibold mb-2">
                        Добавить несколько вопросов (разделитель "$")
                      </div>
                      <textarea
                        className="input min-h-[140px]"
                        placeholder="Вопрос 1 $ Вопрос 2 $ Вопрос 3"
                        value={manualBulk}
                        onChange={(event) => setManualBulk(event.target.value)}
                        disabled={manualBusy}
                      />
                      <div className="text-sm text-muted mt-2">
                        Используйте символ <b>$</b>, чтобы разделить вопросы.
                      </div>
                    </div>

                    {manualError ? (
                      <div className="text-sm text-[#b2563f]">{manualError}</div>
                    ) : null}

                    <div className="flex justify-end">
                      <button
                        className="btn primary"
                        type="submit"
                        disabled={manualBusy || !selectedChapterId}
                      >
                        {manualBusy ? "Сохраняем..." : "Сохранить"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-3">
                    {templateStep === "pick" ? (
                      <div className="space-y-3">
                        <div className="text-sm text-muted">
                          Выберите шаблон, чтобы загрузить вопросы в главу.
                        </div>
                        {templatesLoading ? (
                          <div className="text-muted text-sm">Загрузка шаблонов...</div>
                        ) : templatesError ? (
                          <div className="text-sm text-[#b2563f]">{templatesError}</div>
                        ) : (
                          <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
                            {templatesList.map((template) => (
                              <div
                                key={template.id}
                                className="border border-line rounded-[12px] bg-white/70 p-3 space-y-2"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <div className="font-semibold">{template.title}</div>
                                    {template.description ? (
                                      <div className="text-muted text-sm">
                                        {template.description}
                                      </div>
                                    ) : null}
                                  </div>
                                  <div className="text-right text-sm text-muted">
                                    <div>Вопросов: {template.questionCount ?? 0}</div>
                                  </div>
                                </div>
                                {template.firstQuestion ? (
                                  <div className="text-sm text-muted whitespace-pre-wrap break-words border border-dashed border-line rounded-[10px] bg-white/80 p-2">
                                    {template.firstQuestion}
                                  </div>
                                ) : null}
                                <div className="flex justify-end">
                                  <button
                                    className="btn primary"
                                    onClick={() => handleTemplatePick(template)}
                                    disabled={templateActionBusy}
                                  >
                                    {templateActionBusy ? "Загрузка..." : "Выбрать"}
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-2">
                          <button
                            className="btn"
                            onClick={loadTemplatesList}
                            disabled={templatesLoading}
                          >
                            Обновить
                          </button>
                          {templateActionError ? (
                            <div className="text-[#b2563f] text-sm">
                              {templateActionError}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : templateStep === "preview" ? (
                      <div className="space-y-3">
                        <div className="text-sm text-muted">{modeHint}</div>
                        <div className="border border-line rounded-[12px] bg-white/70 p-3 max-h-[55vh] overflow-y-auto">
                          {selectedTemplateQuestions.length === 0 ? (
                            <div className="text-muted text-sm">
                              В шаблоне нет вопросов.
                            </div>
                          ) : (
                            <ol className="list-decimal pl-5 space-y-1 text-sm">
                              {selectedTemplateQuestions.map((question, index) => (
                                <li
                                  key={`${selectedTemplate?.id || "template"}-${index}`}
                                  className="whitespace-pre-wrap break-words"
                                >
                                  {question}
                                </li>
                              ))}
                            </ol>
                          )}
                        </div>
                        {templateActionError ? (
                          <div className="text-[#b2563f] text-sm">
                            {templateActionError}
                          </div>
                        ) : null}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <button
                            className="btn"
                            onClick={() => {
                              setTemplateStep("pick");
                              setTemplateActionError(null);
                            }}
                            disabled={templateActionBusy}
                          >
                            Назад
                          </button>
                          <div className="flex gap-2 flex-wrap">
                            <button
                              className="btn"
                              type="button"
                              onClick={startEditTemplate}
                              disabled={templateActionBusy}
                            >
                              Изменить
                            </button>
                            <button
                              className="btn primary"
                              type="button"
                              onClick={() => applyTemplateQuestions(selectedTemplateQuestions)}
                              disabled={templateActionBusy}
                            >
                              {templateActionBusy ? "Применяем..." : "Применить"}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="text-sm text-muted">
                            Вопросов: {cleanedEditableQuestions.length}
                          </div>
                          <button
                            className="btn"
                            type="button"
                            onClick={addEditableQuestion}
                            disabled={templateActionBusy}
                          >
                            Добавить вопрос
                          </button>
                        </div>
                        <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
                          {editableTemplateQuestions.length === 0 ? (
                            <div className="text-muted text-sm">
                              Добавьте вопросы, чтобы отредактировать шаблон.
                            </div>
                          ) : (
                            editableTemplateQuestions.map((question, index) => (
                              <div
                                key={`editable-${index}`}
                                className="border border-line rounded-[12px] bg-white/70 p-3 space-y-2"
                              >
                                <div className="flex items-center justify-between text-sm">
                                  <span>Вопрос {index + 1}</span>
                                  <button
                                    className="btn"
                                    type="button"
                                    onClick={() => removeEditableQuestion(index)}
                                    disabled={templateActionBusy}
                                  >
                                    Удалить
                                  </button>
                                </div>
                                <textarea
                                  className="input min-h-[80px]"
                                  value={question}
                                  onChange={(event) =>
                                    updateEditableQuestion(index, event.target.value)
                                  }
                                  disabled={templateActionBusy}
                                />
                              </div>
                            ))
                          )}
                        </div>
                        {templateActionError ? (
                          <div className="text-[#b2563f] text-sm">
                            {templateActionError}
                          </div>
                        ) : null}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <button
                            className="btn"
                            type="button"
                            onClick={backToPreviewFromEdit}
                            disabled={templateActionBusy}
                          >
                            Назад
                          </button>
                          <button
                            className="btn primary"
                            type="button"
                            onClick={() => applyTemplateQuestions(editableTemplateQuestions)}
                            disabled={templateActionBusy}
                          >
                            {templateActionBusy ? "Применяем..." : "Применить"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
  return (
    <div className="grid gap-4 md:grid-cols-[320px_1fr]">
      <aside className="paper p-4 space-y-4">
        <div>
          <div className="font-serif text-xl mb-1">{data.name}</div>
          <div className="text-muted break-all">{data.email}</div>
        </div>

        <div>
          <div className="font-semibold mb-2">Обложка</div>
          <div className="cover bg-gradient-to-br from-blush to-lav w-[120px]">
            <div className="meta">{data.cover || "Нет обложки"}</div>
          </div>
        </div>

        <div className="paper p-3 space-y-3">
          <div className="font-semibold text-sm tracking-wide uppercase text-[#7a6f64]">
            Telegram
          </div>
          {telegram ? (
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-muted text-xs uppercase tracking-wide">Ник</dt>
                <dd>{tgUsername}</dd>
              </div>
              <div>
                <dt className="text-muted text-xs uppercase tracking-wide">Имя</dt>
                <dd>{tgName}</dd>
              </div>
              <div>
                <dt className="text-muted text-xs uppercase tracking-wide">ID</dt>
                <dd>{tgId}</dd>
              </div>
              <div>
                <dt className="text-muted text-xs uppercase tracking-wide">Телефон</dt>
                <dd>{tgPhone}</dd>
              </div>
            </dl>
          ) : (
            <div className="text-muted text-sm">Telegram не подключен.</div>
          )}
        </div>

        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={ordered}
              onChange={(event) => setOrdered(event.target.checked)}
            />
            Заказ оформлен
          </label>
          <button className="btn mt-2" onClick={saveOrder}>
            Сохранить статус заказа
          </button>
        </div>

        <div>
          <div className="font-semibold mb-2">Статус проекта</div>
          <select
            className="input"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button className="btn mt-2" onClick={saveStatus}>
            Сохранить статус
          </button>
        </div>

        <div className={`rounded-[14px] p-3 leading-snug ${deadlineToneClass}`}>
          <div className="text-xs uppercase tracking-wide font-semibold opacity-80">
            Срок по ответам
          </div>
          <div className="text-sm font-medium mt-1">{deadlinePrimaryText}</div>
          {deadlineSecondaryText ? (
            <div className="text-xs mt-1 opacity-80">{deadlineSecondaryText}</div>
          ) : null}
          <div className="text-xs mt-2 opacity-70">{deadlineFooterText}</div>
        </div>
      </aside>

      <main className="space-y-4">
        <section className="paper p-4 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h3 className="font-serif text-xl">Вопросы пользователя</h3>
            <div className="text-muted">Всего: {totalQuestions}</div>
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <button className="btn primary" onClick={openQuestionsModal}>
              Управление вопросами
            </button>
          </div>

          {questionsError ? (
            <div className="text-sm text-[#b2563f]">{questionsError}</div>
          ) : null}

          <div className="space-y-4 mt-2">
            {chapters.map((chapter, index) => (
              <div key={chapter.id} className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-serif text-lg">
                    {formatChapterTitle(chapter, index)}
                  </div>
                  <div className="text-muted text-sm">
                    Вопросов: {Array.isArray(chapter.questions) ? chapter.questions.length : 0}
                  </div>
                </div>

                {(!chapter.questions || chapter.questions.length === 0) ? (
                  <div className="status">
                    <span className="text-lg">В этой главе пока нет вопросов</span>
                    <div className="text-muted">
                      Добавьте вопросы через кнопку «Управление вопросами».
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {chapter.questions.map((question, questionIndex) => (
                      <div
                        key={question.id}
                        className="p-3 border border-line rounded-[14px] bg-paper flex items-start gap-3"
                      >
                        <div className="w-6 h-6 grid place-items-center rounded-full bg-gradient-to-b from-gold to-blush text-[#5b5246] shrink-0">
                          {questionIndex + 1}
                        </div>
                        <div className="flex-1 whitespace-pre-wrap break-words">
                          {question.text}
                        </div>
                        <button
                          className="btn"
                          onClick={() => removeQuestion(question.id)}
                          title="Удалить вопрос"
                        >
                          Удалить
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="paper p-4">
          <h3 className="font-serif text-xl mb-2">Ответы пользователя</h3>
          <div className="space-y-3">
            {data.answers?.length ? (
              data.answers.map((answer, index) => (
                <div
                  key={index}
                  className="p-3 border border-line rounded-[14px] bg-paper"
                >
                  <div className="text-muted text-sm mb-1">
                    Вопрос {answer.questionIndex + 1}
                  </div>
                  <div className="whitespace-pre-wrap break-words">
                    {answer.text || "-"}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-muted">Ответы пока не сохранены.</div>
            )}
          </div>
        </section>
      </main>

      {questionsModal}
    </div>
  );
}

  
