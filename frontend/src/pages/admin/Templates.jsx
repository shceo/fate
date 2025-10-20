import React, { useCallback, useEffect, useMemo, useState } from "react";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";
import { apiDelete, apiPost, apiPut } from "../../shared/api.js";

const PREVIEW_LIMIT = 50;

function extractQuestions(value) {
  const parts = typeof value === "string" ? value.split("$") : [];
  const list = [];
  let total = 0;
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    total += 1;
    list.push(trimmed);
  }
  return { list, total };
}

function formatDateTime(value) {
  if (!value) return null;
  try {
    return new Date(value).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (_error) {
    return null;
  }
}

function QuestionsPreview({ questions, total }) {
  if (!questions.length) return null;
  const limited = questions.slice(0, PREVIEW_LIMIT);
  const showLimited = questions.length > PREVIEW_LIMIT;
  return (
    <div className="border border-dashed border-line rounded-[12px] bg-white/70 p-3 space-y-2">
      <div className="flex items-center justify-between text-xs uppercase tracking-wide text-[#7a6f64]">
        <span>Предпросмотр</span>
        <span>
          Вопросов: {questions.length}
          {total > questions.length ? ` из ${total}` : ""}
        </span>
      </div>
      <ol className="list-decimal pl-5 text-sm space-y-1 max-h-56 overflow-y-auto">
        {limited.map((question, index) => (
          <li
            key={`${index}-${question.slice(0, 12)}`}
            className="whitespace-pre-wrap break-words"
          >
            {question}
          </li>
        ))}
      </ol>
      {showLimited ? (
        <div className="text-xs text-muted">
          Показаны первые {PREVIEW_LIMIT} вопросов.
        </div>
      ) : null}
    </div>
  );
}

export default function Templates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [createTitle, setCreateTitle] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createBulk, setCreateBulk] = useState("");
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editBulk, setEditBulk] = useState("");

  const createQuestions = useMemo(
    () => extractQuestions(createBulk),
    [createBulk]
  );
  const editQuestions = useMemo(() => extractQuestions(editBulk), [editBulk]);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await fetch("/api/admin/templates", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Не удалось получить список шаблонов.");
      }
      const data = await response.json();
      setTemplates(Array.isArray(data.templates) ? data.templates : []);
    } catch (error) {
      console.error(error);
      setLoadError(
        error.message || "Не удалось получить список шаблонов. Попробуйте позже."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleCreate = async (event) => {
    event.preventDefault();
    const title = createTitle.trim();
    const description = createDescription.trim();
    const questions = createQuestions.list;
    if (!title.length) {
      setCreateError("Введите название шаблона.");
      return;
    }
    if (questions.length === 0) {
      setCreateError("Добавьте хотя бы один вопрос.");
      return;
    }
    setCreateBusy(true);
    setCreateError(null);
    try {
      await apiPost("/api/admin/templates", {
        title,
        description: description.length ? description : undefined,
        questions,
      });
      setCreateTitle("");
      setCreateDescription("");
      setCreateBulk("");
      await loadTemplates();
    } catch (error) {
      console.error(error);
      setCreateError(error.message || "Не удалось сохранить шаблон.");
    } finally {
      setCreateBusy(false);
    }
  };

  const openEditModal = async (templateId) => {
    setEditId(templateId);
    setEditOpen(true);
    setEditLoading(true);
    setEditBusy(false);
    setEditError(null);
    try {
      const response = await fetch(`/api/admin/templates/${templateId}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Не удалось загрузить шаблон.");
      }
      const data = await response.json();
      setEditTitle(data.title ?? "");
      setEditDescription(data.description ?? "");
      setEditBulk(Array.isArray(data.questions) ? data.questions.join(" $ ") : "");
    } catch (error) {
      console.error(error);
      setEditError(error.message || "Не удалось загрузить шаблон.");
    } finally {
      setEditLoading(false);
    }
  };

  const closeEditModal = () => {
    setEditOpen(false);
    setEditLoading(false);
    setEditBusy(false);
    setEditError(null);
    setEditId(null);
    setEditTitle("");
    setEditDescription("");
    setEditBulk("");
  };

  const handleEditSave = async (event) => {
    event.preventDefault();
    if (!editId) return;
    const title = editTitle.trim();
    const description = editDescription.trim();
    const questions = editQuestions.list;
    if (!title.length) {
      setEditError("Введите название шаблона.");
      return;
    }
    if (questions.length === 0) {
      setEditError("Добавьте хотя бы один вопрос.");
      return;
    }
    setEditBusy(true);
    setEditError(null);
    try {
      await apiPut(`/api/admin/templates/${editId}`, {
        title,
        description: description.length ? description : undefined,
        questions,
      });
      await loadTemplates();
      closeEditModal();
    } catch (error) {
      console.error(error);
      setEditError(error.message || "Не удалось обновить шаблон.");
    } finally {
      setEditBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      await apiDelete(`/api/admin/templates/${deleteTarget.id}`);
      setDeleteTarget(null);
      await loadTemplates();
    } catch (error) {
      console.error(error);
      setLoadError(error.message || "Не удалось удалить шаблон.");
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="paper p-4 space-y-4">
        <div>
          <h2 className="font-serif text-2xl">Шаблоны вопросов</h2>
          <p className="text-muted">
            Сохраняйте готовые наборы вопросов, чтобы быстро отправлять их
            пользователям без повторного набора.
          </p>
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold block" htmlFor="template-title">
                Название шаблона
              </label>
              <input
                id="template-title"
                className="input"
                placeholder="Например: Вступительное интервью"
                value={createTitle}
                onChange={(event) => setCreateTitle(event.target.value)}
                disabled={createBusy}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold block" htmlFor="template-description">
                Описание (необязательно)
              </label>
              <input
                id="template-description"
                className="input"
                placeholder="Краткое пояснение для админов"
                value={createDescription}
                onChange={(event) => setCreateDescription(event.target.value)}
                disabled={createBusy}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold block" htmlFor="template-questions">
              Вопросы (разделяйте символом $)
            </label>
            <textarea
              id="template-questions"
              className="input min-h-[140px]"
              placeholder="Вопрос 1 $ Вопрос 2 $ Вопрос 3"
              value={createBulk}
              onChange={(event) => setCreateBulk(event.target.value)}
              disabled={createBusy}
            />
            <div className="text-sm text-muted">
            Questions: {createQuestions.list.length}
            </div>
            <QuestionsPreview
              questions={createQuestions.list}
              total={createQuestions.total}
            />
          </div>

          {createError ? (
            <div className="text-sm text-[#b2563f]">{createError}</div>
          ) : null}

          <button type="submit" className="btn primary" disabled={createBusy}>
            {createBusy ? "Сохранение..." : "Сохранить шаблон"}
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-xl">Доступные шаблоны</h3>
          <button className="btn" onClick={loadTemplates} disabled={loading}>
            Обновить
          </button>
        </div>

        {loadError ? <div className="text-[#b2563f]">{loadError}</div> : null}

        {loading ? (
          <div className="paper p-4 text-muted">Загрузка шаблонов...</div>
        ) : templates.length === 0 ? (
          <div className="paper p-4 text-muted">
            Шаблонов пока нет. Создайте первый, используя форму выше.
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {templates.map((template) => (
              <div key={template.id} className="paper p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-serif text-lg">{template.title}</div>
                    {template.description ? (
                      <div className="text-muted text-sm">
                        {template.description}
                      </div>
                    ) : null}
                  </div>
                  <div className="text-right text-sm text-muted">
                    <div>Вопросов: {template.questionCount}</div>
                    {template.updatedAt ? (
                      <div className="text-xs mt-1">
                        {formatDateTime(template.updatedAt)}
                      </div>
                    ) : null}
                  </div>
                </div>

                {template.firstQuestion ? (
                  <div className="border border-line rounded-[12px] bg-white/60 p-3">
                    <div className="text-xs uppercase tracking-wide text-[#7a6f64]">
                      Первый вопрос
                    </div>
                    <div className="mt-1 whitespace-pre-wrap break-words text-sm">
                      {template.firstQuestion}
                    </div>
                  </div>
                ) : null}

                <div className="flex items-center justify-end gap-2">
                  <button
                    className="btn"
                    onClick={() => openEditModal(template.id)}
                  >
                    Редактировать
                  </button>
                  <button
                    className="btn danger"
                    onClick={() => setDeleteTarget(template)}
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {editOpen ? (
        <div className="modal-backdrop">
          <div className="modal-card w-[min(680px,92vw)] space-y-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-serif text-[1.6rem]">
                Редактирование шаблона
              </h3>
              <button className="btn icon-btn" onClick={closeEditModal}>
                X
              </button>
            </div>

            {editLoading ? (
              <div className="text-muted">Загрузка данных шаблона...</div>
            ) : (
              <form onSubmit={handleEditSave} className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <label
                      className="text-sm font-semibold block"
                      htmlFor="edit-title"
                    >
                      Название
                    </label>
                    <input
                      id="edit-title"
                      className="input"
                      value={editTitle}
                      onChange={(event) => setEditTitle(event.target.value)}
                      disabled={editBusy}
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      className="text-sm font-semibold block"
                      htmlFor="edit-description"
                    >
                      Описание
                    </label>
                    <input
                      id="edit-description"
                      className="input"
                      value={editDescription}
                      onChange={(event) => setEditDescription(event.target.value)}
                      disabled={editBusy}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label
                    className="text-sm font-semibold block"
                    htmlFor="edit-questions"
                  >
                    Вопросы
                  </label>
                  <textarea
                    id="edit-questions"
                    className="input min-h-[160px]"
                    value={editBulk}
                    onChange={(event) => setEditBulk(event.target.value)}
                    disabled={editBusy}
                  />
                  <div className="text-sm text-muted">
                  Questions: {editQuestions.list.length}
                  </div>
                  <QuestionsPreview
                    questions={editQuestions.list}
                    total={editQuestions.total}
                  />
                </div>

                {editError ? (
                  <div className="text-sm text-[#b2563f]">{editError}</div>
                ) : null}

                <div className="flex items-center justify-end gap-2">
                  <button className="btn" type="button" onClick={closeEditModal}>
                    Отмена
                  </button>
                  <button className="btn primary" type="submit" disabled={editBusy}>
                    {editBusy ? "Сохранение..." : "Сохранить изменения"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Удалить шаблон?"
        message={
          deleteTarget
            ? `Шаблон «${deleteTarget.title}» будет удален без возможности восстановления.`
            : ""
        }
        confirmLabel="Удалить"
        cancelLabel="Отмена"
        confirmTone="danger"
        busy={deleteBusy}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}













