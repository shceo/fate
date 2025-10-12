import React, { useState } from 'react'
import Header from '../components/Header.jsx'
import Footer from '../components/Footer.jsx'
import { useAuth } from '../shared/AuthContext.jsx'
import { useNavigate } from 'react-router-dom'
export default function Register(){
  const { register } = useAuth()
  const nav = useNavigate()
  const [name, setName] = useState(''), [email, setEmail] = useState(''), [password, setPassword] = useState(''), [err, setErr] = useState('')
  const onSubmit = async (e)=>{ e.preventDefault(); try{ await register(name, email, password); nav('/dashboard') }catch{ setErr('Не удалось зарегистрироваться') } }
  return (<div><Header/><section className="min-h-[100dvh] grid place-items-center py-12 px-4">
    <div className="card-glass w-[min(480px,92vw)] p-8">
      <div className="grid place-items-center mb-4"><div className="font-serif text-[1.6rem]"><span className="inline-block px-3 py-1 rounded-full bg-gradient-to-br from-gold to-blush shadow-tiny">Fate</span></div></div>
      <h1 className="font-serif text-[clamp(1.6rem,3vw,2.2rem)]">Нежное начало</h1>
      <p className="text-muted mb-4">Спокойно и поэтично. Присоединяйтесь к Fate, чтобы начать свою книгу воспоминаний.</p>
      <form onSubmit={onSubmit} className="space-y-3">
        <div><label className="block mb-1">Имя</label><input className="input" value={name} onChange={e=>setName(e.target.value)} placeholder="Ваше имя" /></div>
        <div><label className="block mb-1">Email</label><input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" /></div>
        <div><label className="block mb-1">Пароль</label><input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Создайте пароль" /></div>
        {err && <div className="text-red-600">{err}</div>}
        <div className="flex gap-2 items-center pt-1"><button className="btn primary">Продолжить свою судьбу</button></div>
      </form>
    </div>
  </section><Footer/></div>) }