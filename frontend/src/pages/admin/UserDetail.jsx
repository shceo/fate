import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { apiPost } from "../../shared/api.js";

export default function UserDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("");
  const [ordered, setOrdered] = useState(false);

  // NEW: локальные поля для управления вопросами
  const [qSingle, setQSingle] = useState(""); // одиночный вопрос
  const [qBulk, setQBulk] = useState(""); // массовая вставка "Q1 $ Q2 $ Q3"
  const [mode, setMode] = useState("append"); // append | replace
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

  const saveOrder = async () => {
    await apiPost(`/api/admin/users/${id}/order`, { ordered });
  };
  const saveStatus = async () => {
    await apiPost(`/api/admin/users/${id}/status`, { status: status || null });
  };

  // NEW: отправка вопросов пользователю
  const pushQuestions = async () => {
    const body = {
      mode, // append | replace
      questions: qSingle.trim() ? [qSingle.trim()] : [],
      bulk: qBulk, // "Q1 $ Q2 $ Q3"
    };
    const res = await apiPost(`/api/admin/users/${id}/questions`, body);
    // рефреш
    const d = await fetch(`/api/admin/users/${id}`, {
      credentials: "include",
    }).then((r) => r.json());
    setData(d);
    setQSingle("");
    setQBulk("");
  };

  // NEW: удалить один вопрос (локально и отправить replace)
  const removeQuestionAt = async (idx) => {
    const next = questions.filter((_, i) => i !== idx);
    await apiPost(`/api/admin/users/${id}/questions`, {
      mode: "replace",
      questions: next,
    });
    const d = await fetch(`/api/admin/users/${id}`, {
      credentials: "include",
    }).then((r) => r.json());
    setData(d);
  };

  if (!data) return null;

  return (
    <div className="grid gap-4 md:grid-cols-[320px_1fr]">
      {/* Сайдбар пользователя — без изменений */}
      <aside className="paper p-4">
        <div className="font-serif text-xl mb-1">{data.name}</div>
        <div className="text-muted">{data.email}</div>

        <div className="mt-4">
          <div className="font-semibold mb-2">Обложка</div>
          <div className="cover bg-gradient-to-br from-blush to-lav w-[120px]">
            <div className="meta">{data.cover || "—"}</div>
          </div>
        </div>

        <div className="mt-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={ordered}
              onChange={(e) => setOrdered(e.target.checked)}
            />
            Заказ оформлен
          </label>
          <button className="btn mt-2" onClick={saveOrder}>
            Сохранить заказ
          </button>
        </div>

        <div className="mt-4">
          <div className="font-semibold mb-2">Статус книги</div>
          <select
            className="input"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">— Выберите статус —</option>
            <option value="in_review">🕒 Ожидает проверку</option>
            <option value="in_design">✍️ В дизайне</option>
            <option value="printing">🖨️ Печатается</option>
            <option value="ready">🎁 Готово к вручению</option>
            <option value="shipped">📦 Отправлено</option>
            <option value="delivered">📬 Доставлено</option>
          </select>
          <button className="btn mt-2" onClick={saveStatus}>
            Сохранить статус
          </button>
        </div>
      </aside>

      {/* Основной контент */}
      <main className="space-y-4">
        {/* NEW: блок креативного наброса вопросов */}
        <section className="paper p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h3 className="font-serif text-xl">Вопросы пользователю</h3>
            <div className="text-muted">
              Всего вопросов: <b>{questions.length}</b>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 mt-3">
            {/* Одиночный вопрос */}
            <div className="paper p-4">
              <div className="font-semibold mb-2">Добавить один вопрос</div>
              <input
                className="input"
                placeholder="Ваш самый тёплый момент этого года?"
                value={qSingle}
                onChange={(e) => setQSingle(e.target.value)}
              />
              <div className="text-sm text-muted mt-2">
                Вопрос сохраняется текстом, без HTML — XSS безопасно.
              </div>
            </div>

            {/* Массовая загрузка */}
            <div className="paper p-4">
              <div className="font-semibold mb-2">Массовая загрузка</div>
              <textarea
                className="input min-h-[120px]"
                placeholder="Когда вы познакомились? $ Ваше первое совместное путешествие? $ Что вы цените друг в друге?"
                value={qBulk}
                onChange={(e) => setQBulk(e.target.value)}
              />
              <div className="text-sm text-muted mt-2">
                Разделяйте вопросы символом <b>$</b>. Пустые строки будут
                проигнорированы. Объёмы в сотни вопросов поддерживаются.
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
              Добавить к существующим
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="mode"
                checked={mode === "replace"}
                onChange={() => setMode("replace")}
              />
              Полностью заменить
            </label>

            <button className="btn primary" onClick={pushQuestions}>
              Отправить вопросы пользователю
            </button>
          </div>

          {/* Список текущих вопросов с мягким видом */}
          <div className="mt-4 grid gap-3">
            {questions.length === 0 ? (
              <div className="status">
                <span className="text-lg">🕊️</span>
                <div>
                  <div className="font-semibold">
                    Пока вопросов нет — пользователь увидит сообщение
                  </div>
                  <div className="text-muted">
                    «Скоро администратор отправит вам вопросы».
                  </div>
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

        {/* Раздел с ответами — как у тебя было */}
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
                  <div className="whitespace-pre-wrap break-words">{a.text || "-"}</div>
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
