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

function ChapterEditor({ chapter, index, onChange, onDelete, disabled }) {
  const handleTitleChange = (event) => {
    onChange({
      ...chapter,
      title: event.target.value,
    });
  };

  const handleQuestionsChange = (event) => {
    onChange({
      ...chapter,
      questionsText: event.target.value,
    });
  };

  const questions = useMemo(
    () => extractQuestions(chapter.questionsText),
    [chapter.questionsText]
  );

  return (
    <div className="paper p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-serif text-lg">Глава {index + 1}</h4>
        <button
          type="button"
          className="btn danger"
          onClick={onDelete}
          disabled={disabled}
        >
          Удалить главу
        </button>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold block">
          Название главы (необязательно)
        </label>
        <input
          className="input"
          placeholder="Например: Детство"
          value={chapter.title}
          onChange={handleTitleChange}
          disabled={disabled}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold block">
          Вопросы (разделяйте символом $)
        </label>
        <textarea
          className="input min-h-[120px]"
          placeholder="Вопрос 1 $ Вопрос 2 $ Вопрос 3"
          value={chapter.questionsText}
          onChange={handleQuestionsChange}
          disabled={disabled}
        />
        <div className="text-sm text-muted">
          Вопросов: {questions.list.length}
        </div>
      </div>

      {questions.list.length > 0 && (
        <div className="border border-dashed border-line rounded-[12px] bg-white/70 dark:bg-[rgba(45,42,38,0.7)] p-3 space-y-2">
          <div className="text-xs uppercase tracking-wide text-muted">
            Предпросмотр
          </div>
          <ol className="list-decimal pl-5 text-sm space-y-1 max-h-40 overflow-y-auto">
            {questions.list.slice(0, PREVIEW_LIMIT).map((question, qIndex) => (
              <li
                key={`${index}-${qIndex}-${question.slice(0, 12)}`}
                className="whitespace-pre-wrap break-words"
              >
                {question}
              </li>
            ))}
          </ol>
          {questions.list.length > PREVIEW_LIMIT && (
            <div className="text-xs text-muted">
              Показаны первые {PREVIEW_LIMIT} вопросов.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TemplateCard({ template, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const totalQuestions = template.questionCount || 0;

  return (
    <div className="paper p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="font-serif text-lg">{template.title}</div>
          {template.description && (
            <div className="text-muted text-sm">{template.description}</div>
          )}
        </div>
        <div className="text-right text-sm text-muted">
          <div>Вопросов: {totalQuestions}</div>
          {template.updatedAt && (
            <div className="text-xs mt-1">
              {formatDateTime(template.updatedAt)}
            </div>
          )}
        </div>
      </div>

      {template.chapters && template.chapters.length > 0 && (
        <div className="space-y-2">
          <button
            type="button"
            className="text-sm font-semibold flex items-center gap-2"
            onClick={() => setExpanded(!expanded)}
          >
            <span className={`transition-transform ${expanded ? "rotate-90" : ""}`}>
              ▶
            </span>
            Главы ({template.chapters.length})
          </button>

          {expanded && (
            <div className="space-y-2 pl-4">
              {template.chapters.map((chapter, idx) => (
                <div
                  key={chapter.id}
                  className="border border-line rounded-[12px] bg-white/60 dark:bg-[rgba(45,42,38,0.6)] p-3 space-y-2"
                >
                  <div className="font-semibold text-sm">
                    {chapter.title || `Глава ${idx + 1}`}
                  </div>
                  {chapter.questions && chapter.questions.length > 0 && (
                    <ol className="list-decimal pl-5 text-sm space-y-1 max-h-32 overflow-y-auto">
                      {chapter.questions.map((question, qIdx) => (
                        <li
                          key={`${chapter.id}-${qIdx}`}
                          className="whitespace-pre-wrap break-words text-muted"
                        >
                          {question}
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        <button className="btn" onClick={() => onEdit(template)}>
          Редактировать
        </button>
        <button className="btn danger" onClick={() => onDelete(template)}>
          Удалить
        </button>
      </div>
    </div>
  );
}

export default function Templates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [createTitle, setCreateTitle] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createChapters, setCreateChapters] = useState([
    { id: crypto.randomUUID(), title: "", questionsText: "" },
  ]);
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
  const [editChapters, setEditChapters] = useState([]);

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

  const handleAddChapter = () => {
    setCreateChapters([
      ...createChapters,
      { id: crypto.randomUUID(), title: "", questionsText: "" },
    ]);
  };

  const handleRemoveChapter = (index) => {
    if (createChapters.length <= 1) return;
    setCreateChapters(createChapters.filter((_, i) => i !== index));
  };

  const handleChapterChange = (index, updatedChapter) => {
    setCreateChapters(
      createChapters.map((chapter, i) =>
        i === index ? updatedChapter : chapter
      )
    );
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    const title = createTitle.trim();
    const description = createDescription.trim();

    if (!title.length) {
      setCreateError("Введите название шаблона.");
      return;
    }

    const chapters = createChapters
      .map((chapter) => ({
        title: chapter.title.trim(),
        questions: extractQuestions(chapter.questionsText).list,
      }))
      .filter((chapter) => chapter.questions.length > 0);

    if (chapters.length === 0) {
      setCreateError("Добавьте хотя бы один вопрос в одну из глав.");
      return;
    }

    setCreateBusy(true);
    setCreateError(null);
    try {
      await apiPost("/api/admin/templates", {
        title,
        description: description.length ? description : undefined,
        chapters,
      });
      setCreateTitle("");
      setCreateDescription("");
      setCreateChapters([
        { id: crypto.randomUUID(), title: "", questionsText: "" },
      ]);
      await loadTemplates();
    } catch (error) {
      console.error(error);
      setCreateError(error.message || "Не удалось сохранить шаблон.");
    } finally {
      setCreateBusy(false);
    }
  };

  const openEditModal = async (template) => {
    setEditId(template.id);
    setEditOpen(true);
    setEditLoading(true);
    setEditBusy(false);
    setEditError(null);
    try {
      const response = await fetch(`/api/admin/templates/${template.id}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Не удалось загрузить шаблон.");
      }
      const data = await response.json();
      setEditTitle(data.title ?? "");
      setEditDescription(data.description ?? "");

      if (data.chapters && data.chapters.length > 0) {
        setEditChapters(
          data.chapters.map((chapter) => ({
            id: crypto.randomUUID(),
            title: chapter.title || "",
            questionsText: Array.isArray(chapter.questions)
              ? chapter.questions.join(" $ ")
              : "",
          }))
        );
      } else {
        setEditChapters([
          {
            id: crypto.randomUUID(),
            title: "",
            questionsText: Array.isArray(data.questions)
              ? data.questions.join(" $ ")
              : "",
          },
        ]);
      }
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
    setEditChapters([]);
  };

  const handleEditAddChapter = () => {
    setEditChapters([
      ...editChapters,
      { id: crypto.randomUUID(), title: "", questionsText: "" },
    ]);
  };

  const handleEditRemoveChapter = (index) => {
    if (editChapters.length <= 1) return;
    setEditChapters(editChapters.filter((_, i) => i !== index));
  };

  const handleEditChapterChange = (index, updatedChapter) => {
    setEditChapters(
      editChapters.map((chapter, i) =>
        i === index ? updatedChapter : chapter
      )
    );
  };

  const handleEditSave = async (event) => {
    event.preventDefault();
    if (!editId) return;
    const title = editTitle.trim();
    const description = editDescription.trim();

    if (!title.length) {
      setEditError("Введите название шаблона.");
      return;
    }

    const chapters = editChapters
      .map((chapter) => ({
        title: chapter.title.trim(),
        questions: extractQuestions(chapter.questionsText).list,
      }))
      .filter((chapter) => chapter.questions.length > 0);

    if (chapters.length === 0) {
      setEditError("Добавьте хотя бы один вопрос в одну из глав.");
      return;
    }

    setEditBusy(true);
    setEditError(null);
    try {
      await apiPut(`/api/admin/templates/${editId}`, {
        title,
        description: description.length ? description : undefined,
        chapters,
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
            Создавайте шаблоны с главами и вопросами, чтобы быстро отправлять их
            пользователям.
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

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg">Главы</h3>
              <button
                type="button"
                className="btn"
                onClick={handleAddChapter}
                disabled={createBusy}
              >
                + Добавить главу
              </button>
            </div>

            {createChapters.map((chapter, index) => (
              <ChapterEditor
                key={chapter.id}
                chapter={chapter}
                index={index}
                onChange={(updated) => handleChapterChange(index, updated)}
                onDelete={() => handleRemoveChapter(index)}
                disabled={createBusy}
              />
            ))}
          </div>

          {createError && (
            <div className="text-sm text-red-700 dark:text-red-400">{createError}</div>
          )}

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

        {loadError && <div className="text-red-700 dark:text-red-400">{loadError}</div>}

        {loading ? (
          <div className="paper p-4 text-muted">Загрузка шаблонов...</div>
        ) : templates.length === 0 ? (
          <div className="paper p-4 text-muted">
            Шаблонов пока нет. Создайте первый, используя форму выше.
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onEdit={openEditModal}
                onDelete={setDeleteTarget}
              />
            ))}
          </div>
        )}
      </section>

      {editOpen && (
        <div className="modal-backdrop">
          <div className="modal-card w-[min(800px,92vw)] space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-serif text-[1.6rem] text-ink">
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

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-serif text-lg">Главы</h4>
                    <button
                      type="button"
                      className="btn"
                      onClick={handleEditAddChapter}
                      disabled={editBusy}
                    >
                      + Добавить главу
                    </button>
                  </div>

                  {editChapters.map((chapter, index) => (
                    <ChapterEditor
                      key={chapter.id}
                      chapter={chapter}
                      index={index}
                      onChange={(updated) => handleEditChapterChange(index, updated)}
                      onDelete={() => handleEditRemoveChapter(index)}
                      disabled={editBusy}
                    />
                  ))}
                </div>

                {editError && (
                  <div className="text-sm text-red-700 dark:text-red-400">{editError}</div>
                )}

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
      )}

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
