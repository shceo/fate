import React from "react";

export default function Settings() {
  return (
    <div className="paper p-4 space-y-3">
      <h2 className="font-serif text-xl">Настройки</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="paper p-4 space-y-3">
          <div className="font-semibold">Контакты студии</div>
          <label className="block">
            <span className="text-sm text-muted">Название проекта</span>
            <input className="input mt-1" defaultValue="Fate" disabled />
          </label>
          <label className="block">
            <span className="text-sm text-muted">Email для связи</span>
            <input className="input mt-1" defaultValue="hello@fate.books" />
          </label>
          <button className="btn primary" disabled>
            Сохранить
          </button>
        </div>
        <div className="paper p-4 space-y-2">
          <div className="font-semibold">Безопасность</div>
          <label className="block">
            <span className="text-sm text-muted">Время жизни сессии (часов)</span>
            <input className="input mt-1" type="number" defaultValue={6} />
          </label>
          <div className="text-muted text-sm">
            JWT хранится в httpOnly cookie, а CSRF защищён двойным токеном.
          </div>
        </div>
      </div>
    </div>
  );
}
