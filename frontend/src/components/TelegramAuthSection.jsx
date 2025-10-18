import React, { useCallback, useEffect, useRef, useState } from 'react';
import TelegramLoginButton from './TelegramLoginButton.jsx';
import { useAuth } from '../shared/AuthContext.jsx';

export default function TelegramAuthSection() {
  const botUsername = import.meta.env.VITE_TG_BOT_USERNAME;
  const { setUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const pollRef = useRef(null);
  const lastNonceRef = useRef(null);

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
    (profile) => {
      setUser(profile);
      window.location.href = '/dashboard';
    },
    [setUser]
  );

  const pollLogin = useCallback(
    (nonce) => {
      pollRef.current = window.setInterval(async () => {
        try {
          const response = await fetch(`/api/auth/tg_poll?nonce=${nonce}`, {
            credentials: 'include'
          });
          if (!response.ok) {
            if (response.status === 404) {
              throw new Error('NONCE_NOT_FOUND');
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
          console.error('Telegram poll error', err);
          stopPolling();
          setStatus('');
          setError('Connection with Telegram was lost. Please try again.');
          setLoading(false);
        }
      }, 2500);
    },
    [handleSuccess, stopPolling]
  );

  const startBotFlow = useCallback(async () => {
    if (!botUsername) return;
    stopPolling();
    setError('');
    setStatus('Waiting for confirmation in Telegram...');
    setLoading(true);
    try {
      const response = await fetch('/api/auth/tg_init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({})
      });
      if (!response.ok) {
        throw new Error(`INIT_${response.status}`);
      }
      const data = await response.json();
      if (!data?.nonce) {
        throw new Error('MISSING_NONCE');
      }
      lastNonceRef.current = data.nonce;
      if (data.tme) {
        window.open(data.tme, '_blank', 'noopener');
      }
      pollLogin(data.nonce);
    } catch (err) {
      console.error('Telegram init error', err);
      setError('Failed to open Telegram. Please try again.');
      setStatus('');
      setLoading(false);
      stopPolling();
    }
  }, [botUsername, pollLogin, stopPolling]);

  if (!botUsername) {
    return null;
  }

  return (
    <div className="space-y-3">
      <TelegramLoginButton onSuccess={handleSuccess} />
      <div className="text-center text-sm text-muted">
        or continue through the Fate Telegram bot
      </div>
      <button
        type="button"
        className="btn"
        onClick={startBotFlow}
        disabled={loading}
      >
        {loading ? 'Awaiting confirmation...' : 'Open the bot for login'}
      </button>
      {status && <div className="text-sm text-muted text-center">{status}</div>}
      {error && <div className="text-sm text-red-600 text-center">{error}</div>}
    </div>
  );
}


