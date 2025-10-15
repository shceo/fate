import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../shared/AuthContext.jsx";

function NavItem({ to, end, icon, children }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        [
          "flex items-center gap-3 px-3 py-2 rounded-[14px] border transition",
          isActive
            ? "bg-white/80 border-line shadow-tiny"
            : "border-transparent hover:bg-white/50",
        ].join(" ")
      }
    >
      <span className="text-[1.1rem]">{icon}</span>
      <span className="font-medium">{children}</span>
    </NavLink>
  );
}

export default function AdminLayout() {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-[radial-gradient(90rem_60rem_at_-10%_-10%,#F1E6D6_0%,transparent_60%),_radial-gradient(80rem_60rem_at_110%_10%,#F7EDE4_0%,transparent_55%),_#F5EFE6]">
      <div className="container mx-auto px-4 py-6 grid gap-6 md:grid-cols-[260px_1fr]">
        {/* Sidebar */}
        <aside className="paper p-4 h-min sticky top-6">
          <div className="font-serif text-[1.5rem] mb-3">Fate Admin</div>
          <nav className="space-y-2">
            <NavItem to="/admin" end icon="👥">
              Пользователи
            </NavItem>
            <NavItem to="/admin/templates" icon="📚">
              Шаблоны
            </NavItem>
            <NavItem to="/admin/settings" icon="⚙️">
              Настройки
            </NavItem>
          </nav>
          <hr className="hairline" />
          <button className="btn w-full" onClick={logout}>
            Выйти
          </button>
        </aside>

        {/* Content */}
        <main className="space-y-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
