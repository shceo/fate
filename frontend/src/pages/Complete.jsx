import React from 'react'
import Header from '../components/Header.jsx'
import Footer from '../components/Footer.jsx'
import Progress from '../components/Progress.jsx'
export default function Complete(){
  const showStatus = false // Показывается только после заказа (админ включает на своей странице)
  return (<div><Header/><div className="topbar"><div className="container mx-auto px-4 py-3 text-muted">Страница завершения</div></div>
    <section className="container mx-auto px-4 py-6">
      <div className="paper p-5">
        <h2 className="font-serif text-[1.6rem] mb-1">Ваша история готова! ✨</h2>
        <p className="text-muted mb-3">Спасибо, что доверили нам часть своей судьбы.</p>
        <hr className="hairline"/>
        <h3 className="mb-2">📘 Превью книги</h3>
        <div className="grid md:grid-cols-[160px_1fr] gap-3 items-center">
          <div className="cover bg-gradient-to-br from-blush to-lav w-[160px]"><div className="meta">Обложка: Нежность</div></div>
          <p className="text-muted m-0">Вы выбрали эту обложку для своей книги. Она станет лицом вашей истории.</p>
        </div>
        <hr className="hairline"/>
        <h3 className="mb-2">📄 Прогресс и статус</h3>
        <Progress value={100}/>
        <p className="mt-2">🎉 Все вопросы заполнены, и ваши ответы успешно отправлены команде Fate.</p>
        <hr className="hairline"/>
        <h3 className="mb-2">📦 Статус книги</h3>
        {!showStatus ? (<div className="status"><span className="text-lg">🕒</span><div><div className="font-semibold">Статус появится после оформления заказа</div><div className="text-muted">Оформите заказ печати, и мы покажем текущий статус вашей книги.</div></div></div>)
        : (<div className="status"><span className="text-lg">🕒</span><div><div className="font-semibold">Статус вашей книги: Ожидает проверку Fate</div><div className="text-muted">Мы читаем вашу историю и готовим вашу персональную книгу 💫</div></div></div>)}
        <p className="text-muted mt-2">(Статус обновляется вручную в админ‑панели и виден клиенту только после успешного заказа.)</p>
      </div>
    </section><Footer/></div>) }