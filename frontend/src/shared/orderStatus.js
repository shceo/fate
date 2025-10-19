export const ORDER_STATUS_LABELS = {
  in_review: "Редакция изучает материалы",
  in_design: "Дизайн и вёрстка",
  printing: "Печать тиража",
  ready: "Готово к выдаче",
  shipped: "Отправлено",
  delivered: "Доставлено",
};

export const ORDER_STATUS_OPTIONS = Object.entries(ORDER_STATUS_LABELS).map(
  ([value, label]) => ({ value, label }),
);

export function getOrderStatusLabel(value) {
  return value ? ORDER_STATUS_LABELS[value] ?? null : null;
}
