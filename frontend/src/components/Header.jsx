import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../shared/AuthContext.jsx'
export default function Header(){
  const { user, logout } = useAuth()
  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-[rgba(250,247,242,.75)] border-b border-line">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-3">
          <Link to="/" className="font-serif font-semibold text-[1.4rem]">
            <span className="inline-block px-2 py-1 rounded-full bg-gradient-to-br from-gold to-blush shadow-tiny">Fate</span>
          </Link>
          <nav className="flex items-center gap-2">
            {!user && <>
              <Link className="btn" to="/login">Войти</Link>
              <Link className="btn primary" to="/register">Регистрация</Link>
            </>}
            {user && <>
              <Link className="btn" to="/dashboard">Кабинет</Link>
              {user.isAdmin && <Link className="btn" to="/admin">Админ</Link>}
              <button className="btn" onClick={logout}>Выйти</button>
            </>}
          </nav>
        </div>
      </div>
    </header>
  )
}