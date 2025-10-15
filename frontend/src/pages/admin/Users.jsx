import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
export default function Users() {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    fetch("/api/admin/users", { credentials: "include" })
      .then((r) => r.json())
      .then(setRows);
  }, []);
  return (
    <div className="paper p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="font-serif text-xl">Пользователи</h2>
        <input className="input w-[240px]" placeholder="Поиск пользователя…" />
      </div>
      <div className="overflow-auto">
        <table className="w-full border border-line rounded-[14px] overflow-hidden">
          <thead className="bg-[#fffaf2] text-[#6f6457]">
            <tr>
              <th className="text-left p-3">Имя</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Статус заказа</th>
              <th className="text-left p-3">Ответы</th>
              <th className="text-left p-3">Действие</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className="border-t border-line">
                <td className="p-3">{u.name}</td>
                <td className="p-3">{u.email}</td>
                <td className="p-3">
                  {u.ordered ? "Заказ оформлен" : "Нет заказа"}
                </td>
                <td className="p-3">{u.answersCount}</td>
                <td className="p-3">
                  <Link className="btn" to={`/admin/users/${u.id}`}>
                    Открыть
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
