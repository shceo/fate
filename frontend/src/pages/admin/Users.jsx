import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function Users() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    fetch("/api/admin/users", { credentials: "include" })
      .then((r) => r.json())
      .then(setRows);
  }, []);

  const renderTelegram = (tg) => {
    if (!tg) {
      return <span className="text-muted text-sm">None</span>;
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
  };

  return (
    <div className="paper p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="font-serif text-xl">Users</h2>
        <input
          className="input w-[240px]"
          placeholder="Search users"
          disabled
        />
      </div>
      <div className="overflow-auto">
        <table className="w-full border border-line rounded-[14px] overflow-hidden">
          <thead className="bg-[#fffaf2] text-[#6f6457]">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Telegram</th>
              <th className="text-left p-3">Order status</th>
              <th className="text-left p-3">Answers</th>
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className="border-t border-line">
                <td className="p-3">{u.name}</td>
                <td className="p-3">{u.email}</td>
                <td className="p-3">{renderTelegram(u.telegram)}</td>
                <td className="p-3">
                  {u.ordered ? "Order confirmed" : "Waiting for order"}
                </td>
                <td className="p-3">{u.answersCount}</td>
                <td className="p-3">
                  <Link className="btn" to={`/admin/users/${u.id}`}>
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


