import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { LOGO } from '../logo';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [mode, setMode] = useState('login'); // 'login' | 'setup' | 'reset'
  const [resetSent, setResetSent] = useState(false);
  const [isInviteFlow, setIsInviteFlow] = useState(false);

  useEffect(() => {
    // Detect invite/recovery links in URL hash
    const hash = window.location.hash;
    if (hash.includes('type=invite') || hash.includes('type=recovery')) {
      setMode('setup');
      setIsInviteFlow(true);
    }
  }, []);

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (err) setError(err.message);
    setLoading(false);
  }

  async function handleSetPassword(e) {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) setError(err.message);
    setLoading(false);
  }

  async function handleForgotPassword(e) {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError('Enter your email address first.'); return; }
    setLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin,
    });
    if (err) setError(err.message);
    else setResetSent(true);
    setLoading(false);
  }

  if (mode === 'setup') {
    return (
      <div className="login-page">
        <div className="login-card fi">
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <img src={LOGO} alt="Crafty Cubs" style={{ height: 72, width: 'auto', objectFit: 'contain', marginBottom: 14 }} />
            <div style={{ fontFamily: 'var(--fn)', fontWeight: 900, fontSize: 22, color: 'var(--navy)' }}>Crafty Cubs</div>
            <div style={{ fontSize: 13, color: 'var(--t2)', marginTop: 3 }}>
              {isInviteFlow ? 'Set your password to get started' : 'Choose a new password'}
            </div>
          </div>
          <form onSubmit={handleSetPassword}>
            <div className="field">
              <label className="lbl">New Password</label>
              <div style={{ position: 'relative' }}>
                <input className="inp" type={showPass ? 'text' : 'password'} placeholder="Min. 8 characters"
                  value={password} onChange={e => setPassword(e.target.value)} required style={{ paddingRight: 44 }} />
                <button type="button" onClick={() => setShowPass(s => !s)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--t3)', fontSize: 13 }}>
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>
            </div>
            <div className="field">
              <label className="lbl">Confirm Password</label>
              <input className="inp" type="password" placeholder="Re-enter password"
                value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
            </div>
            {error && (
              <div style={{ background: 'var(--red-l)', color: 'var(--red)', borderRadius: 'var(--r)', padding: '10px 14px', fontSize: 13, marginBottom: 14 }}>
                ⚠ {error}
              </div>
            )}
            <button className="btn btn-primary btn-lg" type="submit" disabled={loading}
              style={{ width: '100%', justifyContent: 'center', fontFamily: 'var(--fn)', fontWeight: 800, fontSize: 15, marginTop: 4 }}>
              {loading ? '...' : '🔐 Set Password & Sign In'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (mode === 'reset') {
    return (
      <div className="login-page">
        <div className="login-card fi">
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <img src={LOGO} alt="Crafty Cubs" style={{ height: 72, width: 'auto', objectFit: 'contain', marginBottom: 14 }} />
            <div style={{ fontFamily: 'var(--fn)', fontWeight: 900, fontSize: 22, color: 'var(--navy)' }}>Reset Password</div>
          </div>
          {resetSent ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--t2)', fontSize: 14, lineHeight: 1.7 }}>
              ✅ Check your email for a reset link. Click it to set a new password.
              <br /><br />
              <button onClick={() => { setMode('login'); setResetSent(false); }} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>
                Back to sign in
              </button>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword}>
              <div className="field">
                <label className="lbl">Your Email</label>
                <input className="inp" type="email" placeholder="your@email.com"
                  value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              {error && (
                <div style={{ background: 'var(--red-l)', color: 'var(--red)', borderRadius: 'var(--r)', padding: '10px 14px', fontSize: 13, marginBottom: 14 }}>
                  ⚠ {error}
                </div>
              )}
              <button className="btn btn-primary btn-lg" type="submit" disabled={loading}
                style={{ width: '100%', justifyContent: 'center', fontFamily: 'var(--fn)', fontWeight: 800, fontSize: 15, marginTop: 4 }}>
                {loading ? '...' : 'Send Reset Link'}
              </button>
              <button type="button" onClick={() => setMode('login')}
                style={{ width: '100%', marginTop: 12, background: 'none', border: 'none', color: 'var(--t2)', cursor: 'pointer', fontSize: 13 }}>
                Back to sign in
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-card fi">
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img src={LOGO} alt="Crafty Cubs" style={{ height: 72, width: 'auto', objectFit: 'contain', marginBottom: 14 }} />
          <div style={{ fontFamily: 'var(--fn)', fontWeight: 900, fontSize: 22, color: 'var(--navy)' }}>Crafty Cubs</div>
          <div style={{ fontSize: 13, color: 'var(--t2)', marginTop: 3 }}>Sign in to your admin panel</div>
        </div>
        <form onSubmit={handleLogin}>
          <div className="field">
            <label className="lbl">Email</label>
            <input className="inp" type="email" placeholder="your@email.com"
              value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <div className="field">
            <label className="lbl">Password</label>
            <div style={{ position: 'relative' }}>
              <input className="inp" type={showPass ? 'text' : 'password'} placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" style={{ paddingRight: 44 }} />
              <button type="button" onClick={() => setShowPass(s => !s)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--t3)', fontSize: 13 }}>
                {showPass ? '🙈' : '👁'}
              </button>
            </div>
          </div>
          {error && (
            <div style={{ background: 'var(--red-l)', color: 'var(--red)', borderRadius: 'var(--r)', padding: '10px 14px', fontSize: 13, marginBottom: 14 }}>
              ⚠ {error}
            </div>
          )}
          <button className="btn btn-primary btn-lg" type="submit" disabled={loading}
            style={{ width: '100%', justifyContent: 'center', fontFamily: 'var(--fn)', fontWeight: 800, fontSize: 15, marginTop: 4 }}>
            {loading ? '...' : '🔐 Sign In'}
          </button>
        </form>
        <button type="button" onClick={() => setMode('reset')}
          style={{ width: '100%', marginTop: 14, background: 'none', border: 'none', color: 'var(--t2)', cursor: 'pointer', fontSize: 13 }}>
          Forgot password?
        </button>
        <div style={{ marginTop: 20, padding: '12px 16px', background: 'var(--surface2)', borderRadius: 'var(--r)', fontSize: 12, color: 'var(--t3)', textAlign: 'center', lineHeight: 1.6 }}>
          Access restricted to authorised Crafty Cubs team members only.
        </div>
      </div>
    </div>
  );
}
