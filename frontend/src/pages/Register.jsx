import React, { useState } from 'react';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import TelegramAuthSection from '../components/TelegramAuthSection.jsx';
import { useAuth } from '../shared/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      await register(name, email, password);
      nav('/dashboard');
    } catch {
      setErr('Could not create the account. Please try again.');
    }
  };

  return (
    <div>
      <Header />
      <section className="min-h-[100dvh] grid place-items-center py-12 px-4">
        <div className="card-glass w-[min(480px,92vw)] p-8 space-y-6">
          <div className="grid place-items-center">
            <div className="font-serif text-[1.6rem]">
              <span className="inline-block px-3 py-1 rounded-full bg-gradient-to-br from-gold to-blush shadow-tiny">
                Fate
              </span>
            </div>
          </div>
          <h1 className="font-serif text-[clamp(1.6rem,3vw,2.2rem)]">Create your Fate profile</h1>
          <p className="text-muted">
            Fill in the form to create your account. You can edit your details later in the dashboard.
          </p>
          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <label className="block mb-1">Name</label>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="block mb-1">Email</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block mb-1">Password</label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Choose a secure password"
              />
            </div>
            {err && <div className="text-red-600">{err}</div>}
            <div className="flex gap-2 items-center pt-1">
              <button className="btn primary" type="submit">
                Create account
              </button>
            </div>
          </form>
          <div className="border-t border-white/40 pt-4">
            <TelegramAuthSection />
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
