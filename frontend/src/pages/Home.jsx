import React from 'react'
import Header from '../components/Header.jsx'
import Footer from '../components/Footer.jsx'
import { Link } from 'react-router-dom'
export default function Home(){
  return (
    <div>
      <Header/>
      <section className="py-16">
        <div className="container mx-auto px-4 grid gap-8 items-center md:grid-cols-[1.1fr_.9fr]">
          <div>
            <div className="uppercase tracking-[.18em] text-sm text-muted">Создание персональной книги</div>
            <h1 className="font-serif font-semibold text-[clamp(2.1rem,4.4vw,3.4rem)] leading-tight mt-2">Собирайте воспоминания и превращайте их в книгу.</h1>
            <p className="text-muted max-w-[55ch] mt-4">Fate помогает собирать сообщения, фотографии и моменты от близких и бережно превращает их в красивую книгу архивного качества — интимный подарок на всю жизнь.</p>
            <div className="mt-6 flex gap-3 flex-wrap">
              <Link className="btn primary" to="/register">Начать книгу</Link>
              <a className="btn" href="#how">Как это работает</a>
            </div>
          </div>
          <div className="grid place-items-center">
            <div className="relative w-[min(88vw,320px)] h-[min(120vw,420px)] rounded-[18px] overflow-hidden shadow-[0_30px_60px_rgba(80,60,40,.18),0_10px_20px_rgba(80,60,40,.12)] bg-gradient-to-br from-lav to-sky">
              <div className="absolute inset-[10px] rounded-[14px] bg-[linear-gradient(135deg,rgba(255,255,255,.6),rgba(255,255,255,.1))] mix-blend-screen"></div>
              <div className="absolute right-[-8px] top-[20px] w-[16px] h-[calc(100%-40px)] rounded-[3px] bg-[linear-gradient(180deg,#efe7dc,#f7f1ea)] drop-shadow-[0_6px_10px_rgba(0,0,0,.08)]"></div>
              <div className="absolute top-4 left-4 px-2 py-1 rounded-full bg-white/70 backdrop-blur border border-white/80 text-[.8rem] text-[#5b5246]">Лимитированное первое издание</div>
              <div className="absolute left-[22px] right-[22px] bottom-6 text-[#1e1d1b] font-serif text-[1.6rem] leading-tight">«О тех моментах, что сделали нас»<br/><span className="text-[.95rem] opacity-90">Fate Studio</span></div>
            </div>
          </div>
        </div>
      </section>
      <section id="how" className="py-12">
        <div className="container mx-auto px-4">
          <h2 className="font-serif font-semibold text-[clamp(1.6rem,3vw,2.1rem)] mb-2">Как работает Fate</h2>
          <p className="text-muted max-w-[60ch]">Три мягких шага от воспоминаний к шедевру. Никаких навыков дизайна — мы подскажем и аккуратно разложим всё по страницам.</p>
          <div className="grid gap-4 md:grid-cols-3 mt-5">
            {[
              {t:'Соберите и пригласите',d:'Соберите истории и фото от близких. Поделитесь приватной ссылкой.'},
              {t:'Курируйте и оформляйте',d:'Выбирайте вне‑времени макеты и палитры. Контент авто‑раскладывается.'},
              {t:'Печать и подарок',d:'Премиальная печать в твёрдом переплёте. Готово к дарению.'},
            ].map((s,i)=>(
              <article key={i} className="paper p-4 grid grid-cols-[56px_1fr] gap-4 items-center">
                <div className="w-14 h-14 grid place-items-center rounded-[14px] bg-gradient-to-b from-gold to-blush shadow-tiny">
                  <span className="text-[#5b5246]">{i+1}</span>
                </div>
                <div><h3 className="font-semibold">{s.t}</h3><p className="text-muted mt-1">{s.d}</p></div>
              </article>
            ))}
          </div>
        </div>
      </section>
      <Footer/>
    </div>
  )
}