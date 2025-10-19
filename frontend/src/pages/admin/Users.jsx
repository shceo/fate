import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

function renderTelegram(tg) {
  if (!tg) {
    return <span className="text-muted text-sm">Нет</span>;
  }
  const label =
    tg.username && tg.username.length
      ? `@${tg.username}`
      : [tg.first_name, tg.last_name].filter(Boolean).join(" ").trim() ||
        `ID ${tg.id}`;
  const meta = [`id: ${tg.id}`];
  if (tg.phone) {
    meta.push(tg.phone);
  }
  return (
    <div className="leading-tight">
      <div>{label}</div>
      <div className="text-xs text-muted">{meta.join(" | ")}</div>
    </div>
  );
}

function buildSearchString(user) {
  const parts = [
    user.id,
    user.name,
    user.email,
    user.answersCount,
    user.status,
    user.ordered ? "заказ подтверждён" : "ожидает подтверждения",
  ];
  const tg = user.telegram;
  if (tg) {
    parts.push(
      tg.username,
      tg.first_name,
      tg.last_name,
      tg.phone,
      tg.id && `id${tg.id}`
    );
  }
  return parts
    .filter((value) => value !== null && value !== undefined)
    .join(" ")
    .toLowerCase();
}

export default function Users() {
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch("/api/admin/users", { credentials: "include" })
      .then((r) => r.json())
      .then(setRows);
  }, []);

  const filteredRows = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) {
      return rows;
    }
    return rows.filter((row) => buildSearchString(row).includes(value));
  }, [rows, query]);

  const summary = query.trim().length
    ? `Найдено: ${filteredRows.length} из ${rows.length}`
    : `Всего клиентов: ${rows.length}`;

  return (
    <div className="paper p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="font-serif text-xl">Клиенты</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted">{summary}</span>
          <input
            className="input w-[260px]"
            placeholder="Поиск по имени, email, телефону или ID"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>
      <div className="overflow-auto">
        <table className="w-full border border-line rounded-[14px] overflow-hidden">
          <thead className="bg-[#fffaf2] text-[#6f6457]">
            <tr>
              <th className="text-left p-3">ФИО</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Telegram</th>
              <th className="text-left p-3">Статус заказа</th>
              <th className="text-left p-3">Ответы</th>
              <th className="text-left p-3">Действия</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((user) => (
              <tr key={user.id} className="border-t border-line">
                <td className="p-3">{user.name}</td>
                <td className="p-3 break-all">{user.email}</td>
                <td className="p-3">{renderTelegram(user.telegram)}</td>
                <td className="p-3">
                  {user.ordered ? "Заказ подтверждён" : "Ожидает подтверждения"}
                </td>
                <td className="p-3">{user.answersCount}</td>
                <td className="p-3">
                  <Link className="btn" to={`/admin/users/${user.id}`}>
                    Открыть
                  </Link>
                </td>
              </tr>
            ))}
            {filteredRows.length === 0 && (
              <tr>
                <td className="p-4 text-center text-muted" colSpan={6}>
                  Клиенты не найдены. Попробуйте изменить запрос.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
