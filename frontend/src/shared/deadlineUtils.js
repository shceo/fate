const DAY_MS = 24 * 60 * 60 * 1000;
const TOTAL_DAYS = 14;

/**
 * Вычисляет информацию о дедлайне на основе даты отправки ответов
 * @param {Date|string|null} answersSubmittedAt - Дата отправки последнего ответа
 * @returns {Object|null} Информация о дедлайне или null если данных нет
 */
export function calculateDeadlineInfo(answersSubmittedAt) {
  if (!answersSubmittedAt) return null;

  const submittedDate = new Date(answersSubmittedAt);
  if (Number.isNaN(submittedDate.getTime())) return null;

  const now = new Date();
  const diff = now.getTime() - submittedDate.getTime();
  const elapsedDays = diff > 0 ? Math.floor(diff / DAY_MS) : 0;
  const remainingDays = Math.max(0, TOTAL_DAYS - elapsedDays);
  const deadlineDate = new Date(submittedDate.getTime() + TOTAL_DAYS * DAY_MS);
  const overdue = now > deadlineDate;
  const overdueDays = overdue
    ? Math.max(0, Math.floor((now.getTime() - deadlineDate.getTime()) / DAY_MS))
    : 0;

  let tone = "green";
  if (elapsedDays >= 10 || overdue) {
    tone = "red";
  } else if (elapsedDays >= 4) {
    tone = "orange";
  }

  return {
    now,
    elapsedDays,
    remainingDays,
    deadlineDate,
    tone,
    totalDays: TOTAL_DAYS,
    overdue,
    overdueDays,
  };
}

/**
 * Находит дату последнего ответа из массива ответов
 * @param {Array} answers - Массив ответов пользователя
 * @param {boolean} interviewLocked - Флаг завершения опроса
 * @returns {Date|null} Дата последнего ответа или null
 */
export function findLatestAnswerDate(answers, interviewLocked) {
  if (!interviewLocked) return null;
  if (!Array.isArray(answers) || answers.length === 0) return null;

  let latest = null;
  for (const entry of answers) {
    if (!entry || !entry.createdAt) continue;
    const stamp = new Date(entry.createdAt);
    if (Number.isNaN(stamp.getTime())) continue;
    if (!latest || stamp > latest) {
      latest = stamp;
    }
  }
  return latest;
}

export { DAY_MS, TOTAL_DAYS };
