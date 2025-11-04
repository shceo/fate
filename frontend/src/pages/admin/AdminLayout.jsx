import React, { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../shared/AuthContext.jsx";
import Logo from "../../components/Logo.jsx";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";

function ClientsIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient
          id="clientsGradientHead"
          x1="6"
          y1="4"
          x2="12"
          y2="14"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#C084FC" />
          <stop offset="1" stopColor="#7C3AED" />
        </linearGradient>
        <linearGradient
          id="clientsGradientBody"
          x1="5"
          y1="12"
          x2="14"
          y2="22"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#A855F7" />
          <stop offset="1" stopColor="#5B21B6" />
        </linearGradient>
        <linearGradient
          id="clientsGradientBooks"
          x1="4"
          y1="17"
          x2="20"
          y2="21"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#FDE68A" />
          <stop offset="1" stopColor="#FDBA74" />
        </linearGradient>
      </defs>
      <circle cx="8.4" cy="8" r="2.9" fill="url(#clientsGradientHead)" />
      <circle cx="14.9" cy="9" r="2.4" fill="#A855F7" opacity="0.85" />
      <path
        d="M4.5 18.5c1-2.8 3.3-4.6 6-4.6s5 1.8 6 4.6"
        fill="url(#clientsGradientBody)"
      />
      <path
        d="M6 19.2h5.5"
        stroke="#EDE9FE"
        strokeWidth="1.1"
        strokeLinecap="round"
        opacity="0.8"
      />
      <path
        d="M13.5 18.6c.6-1.7 2.1-2.7 3.7-2.7"
        stroke="#C4B5FD"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.8"
      />
      <rect
        x="4.2"
        y="19"
        width="6.2"
        height="1.9"
        rx="0.8"
        fill="url(#clientsGradientBooks)"
      />
      <rect
        x="11.2"
        y="19.4"
        width="6.8"
        height="1.6"
        rx="0.7"
        fill="#F97316"
        opacity="0.85"
      />
      <path
        d="M5.3 19.8h3.2"
        stroke="#B45309"
        strokeWidth="0.8"
        strokeLinecap="round"
        opacity="0.65"
      />
    </svg>
  );
}

function TemplatesIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient
          id="templatesPaper"
          x1="5"
          y1="4"
          x2="16"
          y2="20"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#DDD6FE" />
          <stop offset="1" stopColor="#C7D2FE" />
        </linearGradient>
        <linearGradient
          id="templatesTab"
          x1="6"
          y1="6"
          x2="18"
          y2="8"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#A855F7" />
          <stop offset="1" stopColor="#6366F1" />
        </linearGradient>
        <linearGradient
          id="templatesBook"
          x1="5"
          y1="16"
          x2="19"
          y2="22"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#F3F4FF" />
          <stop offset="1" stopColor="#E0E7FF" />
        </linearGradient>
      </defs>
      <rect
        x="5"
        y="4.5"
        width="12.5"
        height="14.5"
        rx="2"
        fill="url(#templatesPaper)"
      />
      <path
        d="M7 7h8.5"
        stroke="url(#templatesTab)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M7 10.2h9.5"
        stroke="#A78BFA"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.85"
      />
      <path
        d="M7 13.4h6.8"
        stroke="#8B5CF6"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.85"
      />
      <rect
        x="4"
        y="16.8"
        width="15.6"
        height="3.2"
        rx="1.3"
        fill="url(#templatesBook)"
      />
      <path
        d="M6 18.2h4"
        stroke="#6366F1"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.75"
      />
      <path
        d="M12.5 18.2h4.5"
        stroke="#6366F1"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.55"
      />
      <rect
        x="13.6"
        y="5.2"
        width="4.8"
        height="5"
        rx="1.2"
        fill="#C084FC"
        opacity="0.6"
      />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient
          id="settingsGlow"
          cx="50%"
          cy="40%"
          r="70%"
        >
          <stop offset="0%" stopColor="#F5F5F5" />
          <stop offset="70%" stopColor="#D1D5DB" />
          <stop offset="100%" stopColor="#9CA3AF" />
        </radialGradient>
        <linearGradient
          id="settingsGear"
          x1="8"
          y1="8"
          x2="16"
          y2="16"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#D1D5DB" />
        </linearGradient>
        <filter
          id="settingsShadow"
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
        >
          <feDropShadow
            dx="0"
            dy="1"
            stdDeviation="1.2"
            floodColor="#4B5563"
            floodOpacity="0.35"
          />
        </filter>
      </defs>
      <circle
        cx="12"
        cy="12"
        r="9.4"
        fill="url(#settingsGlow)"
        filter="url(#settingsShadow)"
      />
      <path
        d="M12 9.2a2.8 2.8 0 1 1 0 5.6 2.8 2.8 0 0 1 0-5.6Zm0-3.4 1 1.9 2.1-.2.3 2.1 1.8.9-.9 1.9.9 1.9-1.8.9-.3 2.1-2.1-.2-1 1.9-1-1.9-2.1.2-.3-2.1-1.8-.9.9-1.9-.9-1.9 1.8-.9.3-2.1 2.1.2 1-1.9Z"
        fill="url(#settingsGear)"
        stroke="#6B7280"
        strokeWidth="0.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const navIcons = {
  clients: <ClientsIcon />,
  templates: <TemplatesIcon />,
  settings: <SettingsIcon />,
};

function NavItem({ to, end, icon, children }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        [
          "admin-nav__item flex items-center gap-3 px-3 py-2 rounded-[14px] border transition",
          isActive
            ? "bg-white/80 border-line shadow-tiny"
            : "border-transparent hover:bg-white/50",
        ].join(" ")
      }
    >
      {icon ? (
        <span
          className="flex h-6 w-6 items-center justify-center text-[1.1rem]"
          aria-hidden="true"
        >
          {icon}
        </span>
      ) : null}
      <span className="font-medium">{children}</span>
    </NavLink>
  );
}

export default function AdminLayout() {
  const { logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = () => {
    logout();
    setShowLogoutConfirm(false);
  };

  return (
    <div className="admin-layout min-h-screen bg-[radial-gradient(90rem_60rem_at_-10%_-10%,#F1E6D6_0%,transparent_60%),_radial-gradient(80rem_60rem_at_110%_10%,#F7EDE4_0%,transparent_55%),_#F5EFE6]">
      <div className="admin-shell container mx-auto px-4 py-6 grid gap-6 md:grid-cols-[260px_1fr]">
        <aside className="admin-nav paper p-4 h-min sticky top-6">
          <div className="admin-nav__header flex flex-col gap-2 mb-3">
            <Logo className="h-10 max-w-[50px]" />
            <div className="font-serif text-[1.2rem] text-ink">Админка</div>
          </div>
          <nav className="admin-nav__list space-y-2">
            <NavItem to="/admin" end icon={navIcons.clients}>
              Клиенты
            </NavItem>
            <NavItem to="/admin/templates" icon={navIcons.templates}>
              Шаблоны
            </NavItem>
            <NavItem to="/admin/settings" icon={navIcons.settings}>
              Настройки
            </NavItem>
          </nav>
          <hr className="hairline admin-nav__divider" />
          <button className="btn w-full admin-nav__logout" onClick={() => setShowLogoutConfirm(true)}>
            Выйти
          </button>
        </aside>

        <main className="admin-content space-y-4">
          <Outlet />
        </main>
      </div>

      <ConfirmDialog
        open={showLogoutConfirm}
        title="Выйти из аккаунта?"
        message="После выхода нужно будет снова войти, чтобы продолжить работу в админ панели."
        confirmLabel="Выйти"
        cancelLabel="Отмена"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </div>
  );
}
