import React from 'react'

export default function Templates() {
  return (
    <div className="paper p-4">
      <h2 className="font-serif text-xl mb-2">Шаблоны</h2>
      <p className="text-muted">Здесь будет управление шаблонами книг (добавление, редактирование, архив).</p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="paper p-4">
          <div className="font-semibold">Классическая обложка</div>
          <div className="text-muted text-sm mt-1">Сдержанная типографика, тёплая палитра.</div>
          <div className="mt-2 flex gap-2">
            <button className="btn">Редактировать</button>
            <button className="btn">Дубликат</button>
          </div>
        </div>
        <div className="paper p-4">
          <div className="font-semibold">Юбилей</div>
          <div className="text-muted text-sm mt-1">Акцент на датах, золотые штрихи.</div>
          <div className="mt-2 flex gap-2">
            <button className="btn">Редактировать</button>
            <button className="btn">Дубликат</button>
          </div>
        </div>
      </div>
    </div>
  )
}
