import React, { useEffect, useRef } from 'react';
import { useAuth } from '../shared/AuthContext.jsx';

export default function TelegramLoginButton({ onSuccess }) {
  const { setUser, refreshUser } = useAuth();
  const containerRef = useRef(null);
  const botUsername = import.meta.env.VITE_TG_BOT_USERNAME;

  useEffect(() => {
    if (!botUsername) {
      return undefined;
    }
    const handler = async (authData) => {
      try {
        const response = await fetch('/api/auth/tg_verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(authData)
        });
        if (!response.ok) {
          throw new Error(`Telegram verify failed with status ${response.status}`);
        }
        const profile = await response.json();
        setUser(profile);
        await refreshUser();
        if (onSuccess) {
          onSuccess(profile);
        } else {
          window.location.href = '/dashboard';
        }
      } catch (err) {
        console.error('Telegram auth error', err);
      }
    };
    window.onTelegramAuth = handler;
    return () => {
      if (window.onTelegramAuth === handler) {
        delete window.onTelegramAuth;
      }
    };
  }, [botUsername, onSuccess, refreshUser, setUser]);

  useEffect(() => {
    if (!botUsername || !containerRef.current) {
      return undefined;
    }
    const container = containerRef.current;
    container.innerHTML = '';
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.async = true;
    script.setAttribute('data-telegram-login', botUsername);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-userpic', 'false');
    script.setAttribute('data-request-access', 'write');
    script.setAttribute('data-lang', 'ru');
    script.setAttribute('data-onauth', 'onTelegramAuth');
    container.appendChild(script);
    return () => {
      container.innerHTML = '';
    };
  }, [botUsername]);

  if (!botUsername) {
    return null;
  }

  return <div ref={containerRef} className="flex justify-center" />;
}
