import React from "react";
import { Outlet, Link } from "react-router-dom";
import { useAuth } from "../../shared/AuthContext.jsx";
export default function AdminLayout() {
  const { logout } = useAuth();
  return (
    <div>
      <div className="topbar">
        <div className="container mx-auto px-4 flex items-center justify-between py-3">
          <div className="font-serif text-[1.4rem]">
            <span className="inline-block px-2 py-1 rounded-full bg-gradient-to-br from-gold to-blush shadow-tiny">
              Fate Admin
            </span>
          </div>
          <div className="text-muted flex items-center gap-2">
            <Link className="btn" to="/admin">
              Пользователи
            </Link>
            <button className="btn" onClick={logout}>
              Выйти
            </button>
          </div>
        </div>
      </div>
      <main className="container mx-auto px-4 py-4">
        <Outlet />
      </main>
    </div>
  );
}
