import React from "react";

export default function Templates() {
  return (
    <div className="paper p-4 space-y-3">
      <h2 className="font-serif text-xl">Шаблоны</h2>
      <p className="text-muted">
        Здесь будут храниться типовые наборы вопросов и сценарии интервью
        (например, для свадебных историй или семейных хроник). Раздел пока в
        разработке.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="paper p-4 space-y-2">
          <div className="font-semibold">Шаблоны вопросов</div>
          <div className="text-sm text-muted">
            Подберите и сохраните готовые списки вопросов, чтобы быстро выдавать
            их клиентам.
          </div>
          <div className="mt-2 flex gap-2">
            <button className="btn" disabled>
              Добавить шаблон
            </button>
            <button className="btn" disabled>
              Импортировать
            </button>
          </div>
        </div>
        <div className="paper p-4 space-y-2">
          <div className="font-semibold">Готовые сценарии изданий</div>
          <div className="text-sm text-muted">
            Сохраняйте последовательность шагов проекта и автоматически
            назначайте их новым клиентам.
          </div>
          <div className="mt-2 flex gap-2">
            <button className="btn" disabled>
              Создать сценарий
            </button>
            <button className="btn" disabled>
              Экспортировать
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
