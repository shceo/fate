import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../shared/AuthContext.jsx";
import ConfirmDialog from "./ConfirmDialog.jsx";

export default function Header() {
  const { user, logout } = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);
  const navigate = useNavigate();
  const homeLink = user ? "/dashboard" : "/";

  const handleLogout = async () => {
    await logout();
    setShowConfirm(false);
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-[rgba(250,247,242,.75)] border-b border-line">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-3">
          <Link to={homeLink} className="font-serif font-semibold text-[1.4rem]">
            <span className="inline-block px-2 py-1 rounded-full bg-gradient-to-br from-gold to-blush shadow-tiny">
              Fate
            </span>
          </Link>
          <nav className="flex items-center gap-2">
            {!user ? (
              <>
                <Link className="btn" to="/login">
                  Войти
                </Link>
                <Link className="btn primary" to="/register">
                  Зарегистрироваться
                </Link>
              </>
            ) : (
              <>
                <Link className="btn" to="/dashboard">
                  Личный кабинет
                </Link>
                <button className="btn" onClick={() => setShowConfirm(true)}>
                  Выйти
                </button>
              </>
            )}
          </nav>
        </div>
      </div>

      <ConfirmDialog
        open={showConfirm}
        title="Выйти из аккаунта?"
        message="После выхода нужно будет снова войти, чтобы продолжить работу."
        confirmLabel="Выйти"
        cancelLabel="Отмена"
        onConfirm={handleLogout}
        onCancel={() => setShowConfirm(false)}
      />
    </header>
  );
}
