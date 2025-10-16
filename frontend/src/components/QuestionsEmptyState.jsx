import React from "react";

export default function QuestionsEmptyState() {
  return (
    <div className="text-center">
      <div className="font-serif text-[clamp(1.4rem,3.8vw,2rem)]">
        Вопросов пока нет — мы сообщим, как только появятся новые.
      </div>
      <div className="text-muted mt-1">
        Вы сможете вернуться сюда позже, чтобы продолжить работу над историей.
      </div>
    </div>
  );
}
