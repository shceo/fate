import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { apiPost } from "../../shared/api.js";

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
                Разделяйте вопросы символом <b>$</b>. Максимум 500 записей.
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
    </div>
  );
}
