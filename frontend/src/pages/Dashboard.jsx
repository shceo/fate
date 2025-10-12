import React from 'react'
import Header from '../components/Header.jsx'
import Footer from '../components/Footer.jsx'
import Progress from '../components/Progress.jsx'
import { Link } from 'react-router-dom'
import { useAuth } from '../shared/AuthContext.jsx'
export default function Dashboard(){
  const { user } = useAuth(); const answered=12,total=25,progress=Math.round(100*answered/total)
  return (<div><Header/><section className="container mx-auto px-4 mt-4 grid gap-4 md:grid-cols-[280px_1fr] items-start">
    <aside className="paper p-4">
      <h2 className="font-serif text-[clamp(1.4rem,3.2vw,2rem)]">{user?.name ? `Здравствуйте, ${user.name}` : 'Здравствуйте'}</h2>
      <p className="text-muted">Ваша история разворачивается. Пишите в своём ритме.</p>
      <div className="mt-3 font-semibold">Прогресс</div><Progress value={progress}/>
      <div className="text-muted text-sm mt-1">{answered} из {total} вопросов</div>
      <div className="mt-4 border-t border-dashed border-line pt-4">
        <div className="font-semibold mb-2">Обложка книги</div>
        <div className="flex items-center gap-2">
          <div className="cover bg-gradient-to-br from-blush to-lav w-[84px] min-w-[84px]"><div className="meta">Наше десятилетие</div></div>
          <Link className="btn" to="/covers">Сменить обложку</Link>
        </div>
      </div>
    </aside>
    <main className="paper p-4">
      <h3 className="font-serif text-xl mb-3">Сегодняшние вопросы</h3>
      <div className="space-y-3">
        <div><label className="font-serif block mb-1">Какой маленький момент вы не хотите забыть?</label><textarea className="input min-h-[110px]" placeholder="Пишите свободно…"/></div>
        <div><label className="font-serif block mb-1">Опишите чувство дома в трёх предложениях.</label><textarea className="input min-h-[110px]" placeholder="Тёплый свет на кухонном столе…"/></div>
        <div><label className="font-serif block mb-1">Сообщение себе в будущем:</label><textarea className="input min-h-[110px]" placeholder="Дорогой я…"/></div>
      </div>
      <div className="flex gap-2 flex-wrap items-center mt-4">
        <button className="btn primary">Сохранить прогресс</button>
        <Link className="btn" to="/qa">Открыть одиночный вопрос</Link>
      </div>
    </main>
  </section><Footer/></div>) }