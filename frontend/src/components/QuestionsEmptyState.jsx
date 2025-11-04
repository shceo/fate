import React from "react";

export default function QuestionsEmptyState() {
  return (
    <div className="text-center space-y-2">
      <div className="font-serif text-[clamp(1.4rem,3.4vw,2rem)] text-ink">
        Вопросы пока не назначены.
      </div>
      <div className="text-muted">
        Мы подготовим перечень и отправим уведомление, как только интервью будет
        готово к заполнению.
      </div>
    </div>
  );
}
