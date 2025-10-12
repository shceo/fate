import React, { createContext, useContext, useEffect, useState } from 'react'
const Auth = createContext(null)
export function AuthProvider({ children }){
  const [user, setUser] = useState(null)
  const [loaded, setLoaded] = useState(false)
  useEffect(()=>{
    fetch('/api/me', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if(data) setUser(data); })
      .finally(()=> setLoaded(true))
  }, [])
  const login = async (email, password) => {
    const r = await fetch('/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify({ email, password }) })
    if(!r.ok) throw new Error('Ошибка входа'); const data = await r.json(); setUser(data); return data
  }
  const register = async (name, email, password) => {
    const r = await fetch('/api/auth/register', { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify({ name, email, password }) })
    if(!r.ok) throw new Error('Ошибка регистрации'); const data = await r.json(); setUser(data); return data
  }
  const logout = async ()=>{ await fetch('/api/auth/logout', { method:'POST', credentials:'include' }); setUser(null) }
  const adminLogin = async (email, password, secretKey) => {
    const r = await fetch('/api/admin/login', { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify({ email, password, secretKey }) })
    if(!r.ok) throw new Error('Ошибка входа администратора'); const data = await r.json(); setUser(data); return data
  }
  return <Auth.Provider value={{ user, setUser, loaded, login, register, logout, adminLogin }}>{children}</Auth.Provider>
}
export function useAuth(){ return useContext(Auth) }