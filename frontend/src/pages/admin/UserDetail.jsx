import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { apiPost } from "../../shared/api.js";

function sanitizeTemplateQuestions(list) {
  return (Array.isArray(list) ? list : [])
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter((value) => value.length);
}

const STATUS_OPTIONS = [
  { value: "", label: "Без статуса" },
  { value: "in_review", label: "Редактор изучает материалы" },
  { value: "in_design", label: "Дизайн и верстка" },
  { value: "printing", label: "Печать" },
  { value: "ready", label: "Готово к выдаче" },
  { value: "shipped", label: "Отправлено" },
  { value: "delivered", label: "Доставлено" },
];

export default function UserDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("");
  const [ordered, setOrdered] = useState(false);
  const [qSingle, setQSingle] = useState("");
  const [qBulk, setQBulk] = useState("");
  const [mode, setMode] = useState("append");
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [templateStep, setTemplateStep] = useState("pick");
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState(null);
  const [templatesList, setTemplatesList] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedTemplateQuestions, setSelectedTemplateQuestions] = useState([]);
  const [editableTemplateQuestions, setEditableTemplateQuestions] = useState([]);
  const [templateActionBusy, setTemplateActionBusy] = useState(false);
  const [templateActionError, setTemplateActionError] = useState(null);
  const cleanedEditableQuestions = useMemo(
    () => sanitizeTemplateQuestions(editableTemplateQuestions),
    [editableTemplateQuestions]
  );
  const questions = useMemo(() => data?.questions || [], [data]);

  useEffect(() => {
    fetch(`/api/admin/users/${id}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setStatus(d.status || "");
        setOrdered(!!d.ordered);
      });
  }, [id]);

  const reload = async () => {
    const fresh = await fetch(`/api/admin/users/${id}`, {
      credentials: "include",
    }).then((r) => r.json());
    setData(fresh);
    setStatus(fresh.status || "");
    setOrdered(!!fresh.ordered);
  };

  const saveOrder = async () => {
    await apiPost(`/api/admin/users/${id}/order`, { ordered });
    await reload();
  };

  const saveStatus = async () => {
    await apiPost(`/api/admin/users/${id}/status`, { status: status || null });
    await reload();
  };

  const pushQuestions = async () => {
    const body = {
      mode,
      questions: qSingle.trim() ? [qSingle.trim()] : [],
      bulk: qBulk,
    };
    await apiPost(`/api/admin/users/${id}/questions`, body);
    setQSingle("");
    setQBulk("");
    await reload();
  };

  const removeQuestionAt = async (idx) => {
    const next = questions.filter((_, i) => i !== idx);
    await apiPost(`/api/admin/users/${id}/questions`, {
      mode: "replace",
      questions: next,
    });
    await reload();
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
      setTemplatesList(
        Array.isArray(payload.templates) ? payload.templates : []
      );
    } catch (error) {
      console.error(error);
      setTemplatesError(
        error.message || "Не удалось загрузить список шаблонов."
      );
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  const openTemplateModal = () => {
    setTemplateModalOpen(true);
    setTemplateStep("pick");
    setTemplateActionError(null);
    setTemplateActionBusy(false);
    setSelectedTemplate(null);
    setSelectedTemplateQuestions([]);
    setEditableTemplateQuestions([]);
    loadTemplatesList();
  };

  const closeTemplateModal = () => {
    setTemplateModalOpen(false);
    setTemplateActionBusy(false);
    setTemplateActionError(null);
    setSelectedTemplate(null);
    setSelectedTemplateQuestions([]);
    setEditableTemplateQuestions([]);
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
      const questionsFromTemplate = sanitizeTemplateQuestions(
        detail.questions
      );
      setSelectedTemplate({
        id: detail.id,
        title: detail.title,
        description: detail.description ?? null,
      });
      setSelectedTemplateQuestions(questionsFromTemplate);
      setEditableTemplateQuestions(questionsFromTemplate);
      setTemplateStep("preview");
      if (!questionsFromTemplate.length) {
        setTemplateActionError("В шаблоне пока нет вопросов.");
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
    const cleaned = sanitizeTemplateQuestions(editableTemplateQuestions);
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
    setEditableTemplateQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const addEditableQuestion = () => {
    setEditableTemplateQuestions((prev) => {
      return [...prev, ""];
    });
  };

  const applyTemplateQuestions = async (source) => {
    const prepared = sanitizeTemplateQuestions(source);
    if (!prepared.length) {
      setTemplateActionError(
        "Добавьте хотя бы один вопрос перед отправкой."
      );
      return;
    }
    setTemplateActionBusy(true);
    setTemplateActionError(null);
    try {
      await apiPost(`/api/admin/users/${id}/questions`, {
        mode,
        questions: prepared,
      });
      await reload();
      closeTemplateModal();
    } catch (error) {
      console.error(error);
      setTemplateActionError(
        error.message || "Не удалось отправить вопросы пользователю."
      );
    } finally {
      setTemplateActionBusy(false);
    }
  };

  if (!data) return null;

  const telegram = data.telegram || null;
  const tgUsername =
    telegram?.username && telegram.username.length
      ? `@${telegram.username}`
      : "-";
  const tgNameRaw = [telegram?.first_name, telegram?.last_name]
    .filter(Boolean)
    .join(" ");
  const tgName = tgNameRaw && tgNameRaw.trim().length ? tgNameRaw.trim() : "-";
  const tgId = telegram?.id ?? "-";
  const tgPhone = telegram?.phone ?? "-";
  const modeHint =
    mode === "replace"
      ? "Режим: заменить существующие вопросы."
      : "Режим: добавить к существующим вопросам.";

  const templateModal = !templateModalOpen
    ? null
    : (
        <div className="modal-backdrop">
          <div className="modal-card w-[min(760px,95vw)] space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-serif text-[1.6rem]">
                  {templateStep === "preview"
                    ? selectedTemplate?.title || "Просмотр шаблона"
                    : templateStep === "edit"
                    ? "Редактирование вопросов"
                    : "Загрузка из шаблонов"}
                </h3>
                {templateStep === "preview" && selectedTemplate?.description ? (
                  <div className="text-muted text-sm">
                    {selectedTemplate.description}
                  </div>
                ) : null}
                {templateStep !== "pick" ? (
                  <div className="text-muted text-xs mt-1">{modeHint}</div>
                ) : null}
              </div>
              <button className="btn icon-btn" onClick={closeTemplateModal}>
                X
              </button>
            </div>

            {templateStep === "pick" ? (
              <div className="space-y-3">
                {templatesLoading ? (
                  <div className="text-muted text-sm">
                    Загрузка доступных шаблонов...
                  </div>
                ) : templatesError ? (
                  <div className="text-[#b2563f] text-sm">{templatesError}</div>
                ) : templatesList.length === 0 ? (
                  <div className="text-muted text-sm">
                    Шаблонов пока нет. Создайте их в разделе «Шаблоны».
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
                    {templatesList.map((tpl) => (
                      <div
                        key={tpl.id}
                        className="border border-line rounded-[12px] bg-white/70 p-3 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-semibold">{tpl.title}</div>
                            {tpl.description ? (
                              <div className="text-muted text-sm">
                                {tpl.description}
                              </div>
                            ) : null}
                          </div>
                          <div className="text-right text-sm text-muted">
                            <div>Вопросов: {tpl.questionCount ?? 0}</div>
                          </div>
                        </div>
                        {tpl.firstQuestion ? (
                          <div className="text-sm text-muted whitespace-pre-wrap break-words border border-dashed border-line rounded-[10px] bg-white/80 p-2">
                            {tpl.firstQuestion}
                          </div>
                        ) : null}
                        <div className="flex justify-end">
                          <button
                            className="btn primary"
                            onClick={() => handleTemplatePick(tpl)}
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
                      В этом шаблоне пока нет вопросов.
                    </div>
                  ) : (
                    <ol className="list-decimal pl-5 space-y-1 text-sm">
                      {selectedTemplateQuestions.map((question, index) => (
                        <li
                          key={`${selectedTemplate?.id || "tpl"}-${index}`}
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
                      Отредактировать
                    </button>
                    <button
                      className="btn primary"
                      type="button"
                      onClick={() =>
                        applyTemplateQuestions(selectedTemplateQuestions)
                      }
                      disabled={templateActionBusy}
                    >
                      {templateActionBusy ? "Отправка..." : "Отправить"}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="text-sm text-muted">
                    Questions ready to send: {cleanedEditableQuestions.length}
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
                      Список пуст. Добавьте вопросы для отправки.
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
                    onClick={() =>
                      applyTemplateQuestions(editableTemplateQuestions)
                    }
                    disabled={templateActionBusy}
                  >
                    {templateActionBusy ? "Отправка..." : "Отправить"}
                  </button>
                </div>
              </div>
            )}
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
            <div className="meta">{data.cover || "Не выбрана"}</div>
          </div>
        </div>

        <div className="paper p-3 space-y-3">
          <div className="font-semibold text-sm tracking-wide uppercase text-[#7a6f64]">
            Telegram
          </div>
          {telegram ? (
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-muted text-xs uppercase tracking-wide">
                  Никнейм
                </dt>
                <dd>{tgUsername}</dd>
              </div>
              <div>
                <dt className="text-muted text-xs uppercase tracking-wide">
                  Имя
                </dt>
                <dd>{tgName}</dd>
              </div>
              <div>
                <dt className="text-muted text-xs uppercase tracking-wide">
                  ID
                </dt>
                <dd>{tgId}</dd>
              </div>
              <div>
                <dt className="text-muted text-xs uppercase tracking-wide">
                  Телефон
                </dt>
                <dd>{tgPhone}</dd>
              </div>
            </dl>
          ) : (
            <div className="text-muted text-sm">Данные Telegram отсутствуют.</div>
          )}
        </div>

        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={ordered}
              onChange={(e) => setOrdered(e.target.checked)}
            />
            Заказ подтверждён
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
            onChange={(e) => setStatus(e.target.value)}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button className="btn mt-2" onClick={saveStatus}>
            Сохранить статус
          </button>
        </div>
      </aside>

      <main className="space-y-4">
        <section className="paper p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h3 className="font-serif text-xl">Вопросы анкеты</h3>
            <div className="text-muted">
              Вопросов сейчас: <b>{questions.length}</b>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 mt-3">
            <div className="paper p-4">
              <div className="font-semibold mb-2">Добавить один вопрос</div>
              <input
                className="input"
                placeholder="Введите вопрос и нажмите сохранить"
                value={qSingle}
                onChange={(e) => setQSingle(e.target.value)}
              />
              <div className="text-sm text-muted mt-2">
                Текст сохраняется без форматирования. HTML не обрабатывается.
              </div>
            </div>

            <div className="paper p-4">
              <div className="font-semibold mb-2">
                Добавить сразу несколько (разделитель $)
              </div>
              <textarea
                className="input min-h-[120px]"
                placeholder="Вопрос 1 $ Вопрос 2 $ Вопрос 3"
                value={qBulk}
                onChange={(e) => setQBulk(e.target.value)}
              />
              <div className="text-sm text-muted mt-2">
                Use the <b>$</b> symbol to separate questions.
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="mode"
                checked={mode === "append"}
                onChange={() => setMode("append")}
              />
              Добавить к текущему списку
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="mode"
                checked={mode === "replace"}
                onChange={() => setMode("replace")}
              />
              Заменить текущий список
            </label>

            <button className="btn primary" onClick={pushQuestions}>
              Сохранить вопросы
            </button>
          </div>

            <button className="btn" type="button" onClick={openTemplateModal}>
              Загрузить из шаблонов
            </button>
          <div className="mt-4 grid gap-3">
            {questions.length === 0 ? (
              <div className="status">
                <span className="text-lg">Пока нет вопросов</span>
                <div className="text-muted">
                  Добавьте вопросы выше, чтобы сформировать интервью.
                </div>
              </div>
            ) : (
              questions.map((q, i) => (
                <div
                  key={i}
                  className="p-3 border border-line rounded-[14px] bg-paper flex items-start gap-3"
                >
                  <div className="w-6 h-6 grid place-items-center rounded-full bg-gradient-to-b from-gold to-blush text-[#5b5246] shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 whitespace-pre-wrap break-words">{q}</div>
                  <button
                    className="btn"
                    onClick={() => removeQuestionAt(i)}
                    title="Удалить вопрос"
                  >
                    Удалить
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="paper p-4">
          <h3 className="font-serif text-xl mb-2">Ответы пользователя</h3>
          <div className="space-y-3">
            {data.answers?.length ? (
              data.answers.map((a, i) => (
                <div
                  key={i}
                  className="p-3 border border-line rounded-[14px] bg-paper"
                >
                  <div className="text-muted text-sm mb-1">
                    Вопрос {a.questionIndex + 1}
                  </div>
                  <div className="whitespace-pre-wrap break-words">
                    {a.text || "-"}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-muted">Ответов пока нет.</div>
            )}
          </div>
        </section>
      </main>
      {templateModal}
    </div>
  );
}








