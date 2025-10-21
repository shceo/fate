import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import TelegramLoginButton from "./TelegramLoginButton.jsx";
import { useAuth } from "../shared/AuthContext.jsx";

export default function TelegramAuthSection() {
  const botUsername = import.meta.env.VITE_TG_BOT_USERNAME;
  const { setUser, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const pollRef = useRef(null);
  const lastNonceRef = useRef(null);
  const launchInProgressRef = useRef(false);

  useEffect(() => {
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    lastNonceRef.current = null;
  }, []);

  const handleSuccess = useCallback(
    async (profile) => {
      setUser(profile);
      await refreshUser();
      window.location.href = "/dashboard";
    },
    [refreshUser, setUser]
  );

  const pollLogin = useCallback(
    (nonce) => {
      pollRef.current = window.setInterval(async () => {
        try {
          const response = await fetch(`/api/auth/tg_poll?nonce=${nonce}`, {
            credentials: "include",
          });
          if (!response.ok) {
            if (response.status === 404) {
              throw new Error("NONCE_NOT_FOUND");
            }
            return;
          }
          const data = await response.json();
          if (data && data.ready === false) {
            return;
          }
          if (data && data.id) {
            stopPolling();
            handleSuccess(data);
          }
        } catch (err) {
          console.error("Telegram poll error", err);
          stopPolling();
          setStatus("");
          setError("Связь с Telegram потеряна. Попробуйте ещё раз.");
          setLoading(false);
        }
      }, 2500);
    },
    [handleSuccess, stopPolling]
  );

  const startBotFlow = useCallback(async () => {
    if (!botUsername || launchInProgressRef.current) return;
    launchInProgressRef.current = true;
    stopPolling();
    setError("");
    setStatus("Ждём подтверждения в Telegram…");
    setLoading(true);
    let botWindow;
    try {
      botWindow = window.open("", "_blank");
      if (botWindow) {
        try {
          botWindow.opener = null;
        } catch (noop) {}
      }
      const response = await fetch("/api/auth/tg_init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      if (!response.ok) {
        throw new Error(`INIT_${response.status}`);
      }
      const data = await response.json();
      if (!data?.nonce) {
        throw new Error("MISSING_NONCE");
      }
      lastNonceRef.current = data.nonce;
      const botLink = data.tme || `https://t.me/${botUsername}?start=${data.nonce}`;
      if (botWindow) {
        botWindow.location.replace(botLink);
        try {
          botWindow.focus();
        } catch (noop) {}
      } else {
        window.location.href = botLink;
      }
      pollLogin(data.nonce);
    } catch (err) {
      console.error("Telegram init error", err);
      if (botWindow && !botWindow.closed) {
        botWindow.close();
      }
      setError("Не удалось открыть Telegram. Попробуйте ещё раз.");
      setStatus("");
      setLoading(false);
      stopPolling();
    } finally {
      launchInProgressRef.current = false;
    }
  }, [botUsername, pollLogin, stopPolling]);

  const widgetAllowed = useMemo(() => {
    if (!botUsername) {
      return false;
    }
    const allowedRaw = import.meta.env.VITE_TG_WIDGET_DOMAINS ?? "";
    const allowed = allowedRaw
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);
    if (!allowed.length) {
      return false;
    }
    if (typeof window === "undefined") {
      return false;
    }
    const host = window.location.hostname.toLowerCase();
    return allowed.includes(host);
  }, [botUsername]);

  if (!botUsername) {
    return null;
  }

  return (
    <div className="space-y-3">
      {widgetAllowed && (
        <>
          <TelegramLoginButton onSuccess={handleSuccess} />
          <div className="text-center text-sm text-muted">
            или войдите через бота Fate в Telegram
          </div>
        </>
      )}
      <button type="button" className="btn w-full justify-center" onClick={startBotFlow} disabled={loading}>
        {loading ? "Ждём подтверждения..." : "Открыть бота для входа"}
      </button>
      {status && <div className="text-sm text-muted text-center">{status}</div>}
      {error && <div className="text-sm text-red-600 text-center">{error}</div>}
    </div>
  );
}
