import React from 'react'

export default function Settings() {
  return (
    <div className="paper p-4">
      <h2 className="font-serif text-xl mb-2">Настройки</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="paper p-4">
          <div className="font-semibold mb-2">Общие</div>
          <label className="block mb-2">
            <span className="text-sm text-muted">Название студии</span>
            <input className="input mt-1" defaultValue="Fate" />
          </label>
          <label className="block mb-2">
            <span className="text-sm text-muted">Email для уведомлений</span>
            <input className="input mt-1" defaultValue="hello@fate.books" />
          </label>
          <button className="btn primary mt-2">Сохранить</button>
        </div>
        <div className="paper p-4">
          <div className="font-semibold mb-2">Безопасность</div>
          <label className="block mb-2">
            <span className="text-sm text-muted">Минимальная длина пароля</span>
            <input className="input mt-1" type="number" defaultValue={6} />
          </label>
          <div className="text-muted text-sm">JWT хранится в httpOnly cookie. CSRF включён (double-submit cookie).</div>
        </div>
      </div>
    </div>
  )
}
