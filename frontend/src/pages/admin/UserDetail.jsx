import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { apiPost } from "../../shared/api.js";

const STATUS_OPTIONS = [
  { value: "", label: "No status" },
  { value: "in_review", label: "In review" },
  { value: "in_design", label: "In design" },
  { value: "printing", label: "Printing" },
  { value: "ready", label: "Ready for pickup" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" }
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
      credentials: "include"
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
      bulk: qBulk
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
      questions: next
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
          <div className="text-muted">{data.email}</div>
        </div>

        <div>
          <div className="font-semibold mb-2">Cover</div>
          <div className="cover bg-gradient-to-br from-blush to-lav w-[120px]">
            <div className="meta">{data.cover || "???"}</div>
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
                  Username
                </dt>
                <dd>{tgUsername}</dd>
              </div>
              <div>
                <dt className="text-muted text-xs uppercase tracking-wide">
                  Name
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
                  Phone
                </dt>
                <dd>{tgPhone}</dd>
              </div>
            </dl>
          ) : (
            <div className="text-muted text-sm">No Telegram data.</div>
          )}
        </div>

        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={ordered}
              onChange={(e) => setOrdered(e.target.checked)}
            />
            Order confirmed
          </label>
          <button className="btn mt-2" onClick={saveOrder}>
            Save order state
          </button>
        </div>

        <div>
          <div className="font-semibold mb-2">Project status</div>
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
            Save status
          </button>
        </div>
      </aside>

      <main className="space-y-4">
        <section className="paper p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h3 className="font-serif text-xl">Question templates</h3>
            <div className="text-muted">
              Current questions: <b>{questions.length}</b>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 mt-3">
            <div className="paper p-4">
              <div className="font-semibold mb-2">Add a single question</div>
              <input
                className="input"
                placeholder="Type a question and press save"
                value={qSingle}
                onChange={(e) => setQSingle(e.target.value)}
              />
              <div className="text-sm text-muted mt-2">
                The text is stored as plain text. HTML is not rendered.
              </div>
            </div>

            <div className="paper p-4">
              <div className="font-semibold mb-2">Bulk add (split by $)</div>
              <textarea
                className="input min-h-[120px]"
                placeholder="Question A $ Question B $ Question C"
                value={qBulk}
                onChange={(e) => setQBulk(e.target.value)}
              />
              <div className="text-sm text-muted mt-2">
                Separate questions with the <b>$</b> symbol. Maximum 500 items.
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
              Append to existing list
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="mode"
                checked={mode === "replace"}
                onChange={() => setMode("replace")}
              />
              Replace existing list
            </label>

            <button className="btn primary" onClick={pushQuestions}>
              Save questions
            </button>
          </div>

          <div className="mt-4 grid gap-3">
            {questions.length === 0 ? (
              <div className="status">
                <span className="text-lg">No questions yet</span>
                <div className="text-muted">
                  Add one or more questions above to build the interview
                  template.
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
                    title="Delete question"
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="paper p-4">
          <h3 className="font-serif text-xl mb-2">Submitted answers</h3>
          <div className="space-y-3">
            {data.answers?.length ? (
              data.answers.map((a, i) => (
                <div
                  key={i}
                  className="p-3 border border-line rounded-[14px] bg-paper"
                >
                  <div className="text-muted text-sm mb-1">
                    Question {a.questionIndex + 1}
                  </div>
                  <div className="whitespace-pre-wrap break-words">
                    {a.text || "-"}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-muted">No answers yet.</div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

