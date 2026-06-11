import React, { useState, useRef } from 'react';
import { Camera, Save, LogOut, Lock, User, ArrowLeft } from 'lucide-react';
import { supabase, getUserProfile } from '../lib/supabase';

export default function ProfilePage({ user, onBack, onLogout }) {
  const profile = getUserProfile(user.email);
  const meta = user.user_metadata || {};

  const [displayName, setDisplayName] = useState(meta.display_name || profile.name);
  const [phone, setPhone] = useState(meta.phone || '');
  const [avatarUrl, setAvatarUrl] = useState(meta.avatar_url || null);
  const [avatarPreview, setAvatarPreview] = useState(meta.avatar_url || null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Password change
  const [showPwForm, setShowPwForm] = useState(false);
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSaved, setPwSaved] = useState(false);

  const fileRef = useRef();

  async function handleAvatarChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { alert('Image must be under 3MB'); return; }

    // Preview immediately
    const reader = new FileReader();
    reader.onload = ev => setAvatarPreview(ev.target.result);
    reader.readAsDataURL(file);

    setUploadingAvatar(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `avatars/${user.id}.${ext}`;
      const { error } = await supabase.storage.from('profiles').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('profiles').getPublicUrl(path);
      setAvatarUrl(data.publicUrl + '?t=' + Date.now());
    } catch (err) {
      console.error('Avatar upload error:', err);
      // Still keep preview locally even if upload fails
    }
    setUploadingAvatar(false);
  }

  async function handleSaveProfile() {
    setSaving(true);
    await supabase.auth.updateUser({
      data: {
        display_name: displayName,
        phone,
        avatar_url: avatarUrl || avatarPreview,
      }
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    setSaving(false);
  }

  async function handleChangePassword() {
    setPwError('');
    if (newPw.length < 8) { setPwError('Password must be at least 8 characters'); return; }
    if (newPw !== confirmPw) { setPwError('Passwords do not match'); return; }
    const { error } = await supabase.auth.updateUser({ password: newPw });
    if (error) { setPwError(error.message); return; }
    setPwSaved(true);
    setNewPw(''); setConfirmPw('');
    setTimeout(() => { setPwSaved(false); setShowPwForm(false); }, 2500);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    onLogout();
  }

  return (
    <div className="page-full">
      <div className="subheader no-print">
        <button className="btn btn-ghost btn-sm" onClick={onBack}><ArrowLeft size={14} /> Back</button>
        <span className="subheader-title">My Profile</span>
        <div style={{ width: 70 }} />
      </div>

      <div className="wrap-sm" style={{ paddingTop: 72 }}>
        {/* Hero */}
        <div className="profile-hero fu">
          <div className="profile-avatar-wrap">
            <div className="profile-avatar" style={{ background: profile.bg, color: profile.color }}>
              {avatarPreview
                ? <img src={avatarPreview} alt="avatar" />
                : <span>{profile.initial}</span>
              }
            </div>
            <label className="avatar-upload-btn" title="Change photo" style={{ cursor: uploadingAvatar ? 'wait' : 'pointer' }}>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
              {uploadingAvatar
                ? <span style={{ fontSize: 10, color: '#fff' }} className="spin">↻</span>
                : <Camera size={11} color="#fff" />
              }
            </label>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--fn)', fontWeight: 900, fontSize: 20, lineHeight: 1.1 }}>{displayName}</div>
            <div style={{ fontSize: 12.5, opacity: .7, marginTop: 3 }}>{user.email}</div>
            <div style={{ fontSize: 11.5, opacity: .55, marginTop: 2 }}>{profile.role}</div>
          </div>
        </div>

        {/* Edit details */}
        <div className="card fu" style={{ animationDelay: '.06s' }}>
          <div className="card-h">
            <div className="card-accent" style={{ background: 'var(--teal)' }} />
            <span className="card-title">Personal Details</span>
          </div>
          <div className="card-body">
            <div className="field">
              <label className="lbl">Display Name</label>
              <input className="inp" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your name" />
            </div>
            <div className="field">
              <label className="lbl">Email</label>
              <input className="inp" value={user.email} disabled style={{ opacity: .6, cursor: 'not-allowed' }} />
              <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 4 }}>Email cannot be changed</div>
            </div>
            <div className="field">
              <label className="lbl">Phone (optional)</label>
              <input className="inp" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+94..." />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={handleSaveProfile} disabled={saving} style={saved ? { background: '#22c55e' } : {}}>
                <Save size={14} /> {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>

        {/* Password */}
        <div className="card fu" style={{ animationDelay: '.1s' }}>
          <div className="card-h">
            <div className="card-accent" style={{ background: 'var(--coral)' }} />
            <span className="card-title">Change Password</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowPwForm(f => !f)} style={{ marginLeft: 'auto' }}>
              <Lock size={13} /> {showPwForm ? 'Cancel' : 'Change'}
            </button>
          </div>
          {showPwForm && (
            <div className="card-body fi">
              <div className="field">
                <label className="lbl">New Password</label>
                <input className="inp" type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Min. 8 characters" />
              </div>
              <div className="field">
                <label className="lbl">Confirm Password</label>
                <input className="inp" type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Repeat password" />
              </div>
              {pwError && <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>⚠ {pwError}</div>}
              {pwSaved && <div style={{ color: 'var(--green)', fontSize: 13, marginBottom: 12 }}>✓ Password updated!</div>}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-navy" onClick={handleChangePassword}>Update Password</button>
              </div>
            </div>
          )}
        </div>

        {/* Finance identity */}
        <div className="card fu" style={{ animationDelay: '.14s' }}>
          <div className="card-h">
            <div className="card-accent" style={{ background: profile.color }} />
            <span className="card-title">Your Finance Identity</span>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '10px 14px', background: profile.bg, borderRadius: 'var(--r)' }}>
              <div className="avatar" style={{ background: profile.color, color: '#fff', fontSize: 20, width: 48, height: 48 }}>{profile.initial}</div>
              <div>
                <div style={{ fontFamily: 'var(--fn)', fontWeight: 800, fontSize: 15, color: 'var(--navy)' }}>{profile.name} ({profile.initial})</div>
                <div style={{ fontSize: 12.5, color: 'var(--t2)', marginTop: 2 }}>Your costs and withdrawals in the Finance dashboard are tracked under <strong>"{profile.initial}"</strong></div>
              </div>
            </div>
          </div>
        </div>

        {/* Sign out */}
        <div style={{ paddingBottom: 40 }}>
          <button className="btn btn-danger" style={{ width: '100%', justifyContent: 'center', padding: '13px' }} onClick={handleLogout}>
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
