import React, { useState } from 'react'
import Header from '../components/Header.jsx'
import Footer from '../components/Footer.jsx'
import { useAuth } from '../shared/AuthContext.jsx'
import { useNavigate, useLocation, Link } from 'react-router-dom'
export default function Login(){
  const { login } = useAuth()
  const nav = useNavigate(), loc = useLocation()
  const [email, setEmail] = useState(''), [password, setPassword] = useState(''), [err, setErr] = useState('')
  const onSubmit = async (e)=>{ e.preventDefault(); try{ await login(email, password); nav(loc.state?.from?.pathname || '/dashboard', { replace: true }) }catch{ setErr('Неверный email или пароль') } }
  return (<div><Header/><section className="min-h-[60dvh] grid place-items-center py-12 px-4"><div className="paper w-[min(420px,92vw)] p-6">
    <h1 className="font-serif text-2xl mb-2">Войти</h1>
    <form onSubmit={onSubmit} className="space-y-3">
      <div><label className="block mb-1">Email</label><input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} /></div>
      <div><label className="block mb-1">Пароль</label><input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} /></div>
      {err && <div className="text-red-600">{err}</div>}
      <div className="flex gap-2 items-center pt-1"><button className="btn primary">Войти</button><Link to="/register" className="btn">Регистрация</Link></div>
    </form></div></section><Footer/></div>) }