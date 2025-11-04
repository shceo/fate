import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";
import { useAuth } from "../../shared/AuthContext.jsx";
import { apiDelete } from "../../shared/api.js";
import { calculateDeadlineInfo, TOTAL_DAYS } from "../../shared/deadlineUtils.js";

function renderTelegram(tg) {
  if (!tg) {
    return <span className="text-muted text-sm">не подключен</span>;
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
  const { user: currentUser } = useAuth();
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState("");
  const [dialogUser, setDialogUser] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    fetch("/api/admin/users", { credentials: "include" })
      .then((r) => r.json())
      .then(setRows);
  }, []);

  const filteredRows = useMemo(() => {
    const value = query.trim().toLowerCase();
    let filtered = value
      ? rows.filter((row) => buildSearchString(row).includes(value))
      : rows;

    // Сортировка по оставшемуся времени (меньше времени - выше в списке)
    return filtered.sort((a, b) => {
      const aDeadline = a.interviewLocked ? calculateDeadlineInfo(a.latestAnswerCreatedAt) : null;
      const bDeadline = b.interviewLocked ? calculateDeadlineInfo(b.latestAnswerCreatedAt) : null;

      // Если у обоих нет дедлайна, сохраняем исходный порядок
      if (!aDeadline && !bDeadline) return 0;

      // Пользователи с дедлайном идут выше тех, у кого его нет
      if (!aDeadline) return 1;
      if (!bDeadline) return -1;

      // Сортировка по remainingDays (меньше - выше)
      return aDeadline.remainingDays - bDeadline.remainingDays;
    });
  }, [rows, query]);

  const summary = query.trim().length
    ? `Найдено: ${filteredRows.length} из ${rows.length}`
    : `Всего пользователей: ${rows.length}`;

  const openDeleteDialog = (user) => {
    setDialogUser(user);
    setDeleteError("");
  };

  const cancelDelete = () => {
    if (deleting) return;
    setDialogUser(null);
  };

  const confirmDelete = async () => {
    if (!dialogUser || deleting) return;
    setDeleteError("");
    try {
      setDeleting(true);
      await apiDelete(`/api/admin/users/${dialogUser.id}`);
      setRows((prev) => prev.filter((row) => row.id !== dialogUser.id));
      setDialogUser(null);
    } catch (error) {
      console.error("Failed to delete user", error);
      const code = error?.details?.error;
      let message = "Не удалось удалить пользователя. Попробуйте позже.";
      if (code === "CANNOT_DELETE_ADMIN") {
        message = "Нельзя удалить административный аккаунт.";
      } else if (code === "CANNOT_DELETE_SELF") {
        message = "Нельзя удалить собственный аккаунт.";
      } else if (code === "NOT_FOUND") {
        message = "Пользователь уже удалён.";
      }
      setDeleteError(message);
    } finally {
      setDeleting(false);
    }
  };

  const dialogUserEmailPart =
    dialogUser &&
    typeof dialogUser.email === "string" &&
    dialogUser.email.trim().length
      ? ` (${dialogUser.email.trim()})`
      : "";

  const confirmMessage = dialogUser ? (
    <div className="space-y-3 text-muted leading-relaxed">
      <p>
        {`Удалить аккаунт ${
          dialogUser.name && dialogUser.name.trim().length
            ? dialogUser.name
            : "без имени"
        }${dialogUserEmailPart}? Это действие необратимо.`}
      </p>
      <p>Будут стерты ответы, вопросы и связанные данные пользователя.</p>
      {deleteError && (
        <p className="text-sm text-red-700 dark:text-red-400">{deleteError}</p>
      )}
    </div>
  ) : null;

  return (
    <div className="paper p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="font-serif text-xl">Пользователи</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted">{summary}</span>
          <input
            className="input w-[260px]"
            placeholder="Поиск по имени, email, Telegram или ID"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>
      <div className="overflow-auto">
        <table className="w-full border border-line rounded-[14px] overflow-hidden">
          <thead className="bg-[#fffaf2] dark:bg-[#2a2623] text-muted">
            <tr>
              <th className="w-[64px] text-left p-3" aria-label="Действия" />
              <th className="w-[40px] text-left p-3" aria-label="Статус срока" />
              <th className="text-left p-3">Имя</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Telegram</th>
              <th className="text-left p-3">Статус заказа</th>
              <th className="text-left p-3">Ответов</th>
              <th className="text-left p-3">Действия</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((user) => {
              const isSelf = currentUser?.id === user.id;
              const deleteDisabled = user.isAdmin || isSelf;
              const deadlineInfo = user.interviewLocked
                ? calculateDeadlineInfo(user.latestAnswerCreatedAt)
                : null;

              return (
                <tr key={user.id} className="border-t border-line">
                  <td className="p-3">
                    <button
                      type="button"
                      className="btn icon-btn danger"
                      onClick={() => openDeleteDialog(user)}
                      disabled={deleteDisabled}
                      title={
                        deleteDisabled
                          ? "Удаление недоступно для этого аккаунта"
                          : "Удалить аккаунт"
                      }
                      aria-label={`Удалить ${user.name || "пользователя"}`}
                    >
                      🗑️
                    </button>
                  </td>
                  <td className="p-3">
                    {deadlineInfo && (
                      <div
                        className={`w-3 h-3 rounded-full ${
                          deadlineInfo.tone === "green"
                            ? "bg-green-500"
                            : deadlineInfo.tone === "orange"
                            ? "bg-orange-500"
                            : "bg-red-500"
                        }`}
                        title={
                          deadlineInfo.overdue
                            ? `Срок истёк (прошло ${deadlineInfo.elapsedDays} дней)`
                            : `Осталось ${deadlineInfo.remainingDays} дней из ${TOTAL_DAYS}`
                        }
                      />
                    )}
                  </td>
                  <td className="p-3">{user.name}</td>
                  <td className="p-3 break-all">{user.email}</td>
                  <td className="p-3">{renderTelegram(user.telegram)}</td>
                  <td className="p-3">
                    {user.ordered ? "заказ подтверждён" : "ожидает подтверждения"}
                  </td>
                  <td className="p-3">{user.answersCount}</td>
                  <td className="p-3">
                    <Link className="btn" to={`/admin/users/${user.id}`}>
                      Открыть
                    </Link>
                  </td>
                </tr>
              );
            })}
            {filteredRows.length === 0 && (
              <tr>
                <td className="p-4 text-center text-muted" colSpan={8}>
                  Пользователи не найдены. Попробуйте изменить условия поиска.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={Boolean(dialogUser)}
        title="Удалить аккаунт?"
        message={confirmMessage}
        confirmLabel="Удалить"
        cancelLabel="Отмена"
        confirmTone="danger"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}

