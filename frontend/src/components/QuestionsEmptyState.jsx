import React from "react";

export default function QuestionsEmptyState() {
  return (
    <div className="text-center">
      <div className="font-serif text-[clamp(1.4rem,3.8vw,2rem)]">
        Пока вопросов нет — скоро редактор добавит новый список.
      </div>
      <div className="text-muted mt-1">
        Проверьте раздел позже или свяжитесь с куратором, если нужны дополнительные материалы.
      </div>
    </div>
  );
}
