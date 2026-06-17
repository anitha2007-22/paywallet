import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { getInitials, formatDateTime } from '../utils/helpers';

export default function ProfilePage() {
  const { user, updateUser, refreshUser } = useAuth();
  const [tab, setTab]         = useState('profile');
  const [loading, setLoading] = useState(false);
  const fileRef               = useRef(null);

  const [profileForm, setProfileForm] = useState({
    full_name: user?.full_name || '',
    phone:     user?.phone || '',
  });

  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [pwErrors, setPwErrors] = useState({});

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.put('/user/profile', profileForm);
      updateUser(data.data);
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally { setLoading(false); }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return toast.error('Image must be under 2MB');
    const fd = new FormData();
    fd.append('avatar', file);
    try {
      const { data } = await api.post('/user/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      updateUser({ avatar_url: data.data.avatar_url });
      toast.success('Avatar updated!');
      refreshUser();
    } catch {
      toast.error('Failed to upload image');
    }
  };

  const handleChangePw = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!pwForm.current_password) errs.current = 'Required';
    if (pwForm.new_password.length < 8) errs.new = 'Min 8 characters';
    if (pwForm.new_password !== pwForm.confirm) errs.confirm = 'Passwords do not match';
    setPwErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    try {
      await api.put('/user/password', { current_password: pwForm.current_password, new_password: pwForm.new_password });
      toast.success('Password changed. Please log in again.');
      setPwForm({ current_password: '', new_password: '', confirm: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
      <h1 className="page-header">My Profile</h1>

      {/* Profile header */}
      <div className="card p-6 flex flex-col sm:flex-row items-center gap-5">
        <div className="relative flex-shrink-0">
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="avatar" className="w-24 h-24 rounded-2xl object-cover ring-4 ring-primary-100 dark:ring-primary-900/40" />
          ) : (
            <div className="w-24 h-24 gradient-card rounded-2xl flex items-center justify-center text-white text-3xl font-bold ring-4 ring-primary-100 dark:ring-primary-900/40">
              {getInitials(user?.full_name)}
            </div>
          )}
          <button onClick={() => fileRef.current?.click()}
            className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary-500 hover:bg-primary-600 text-white rounded-xl flex items-center justify-center shadow-md transition-colors text-sm">
            📷
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>

        <div className="text-center sm:text-left">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">{user?.full_name}</h2>
          <p className="text-muted">{user?.email}</p>
          <div className="flex flex-wrap gap-2 mt-2 justify-center sm:justify-start">
            <span className="badge badge-info capitalize">{user?.role}</span>
            {user?.is_verified && <span className="badge badge-success">✓ Verified</span>}
            {user?.wallet_frozen && <span className="badge badge-danger">🔒 Wallet Frozen</span>}
          </div>
          {user?.last_login_at && (
            <p className="text-xs text-muted mt-2">Last login: {formatDateTime(user.last_login_at)}</p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        {[['profile','👤 Edit Profile'],['security','🔐 Security']].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-5 py-3 text-sm font-semibold transition-colors ${
              tab === k ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500' : 'text-muted hover:text-slate-700 dark:hover:text-slate-300'
            }`}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <div className="card p-6 animate-fade-in">
          <form onSubmit={handleProfileSave} className="space-y-5">
            <div>
              <label className="label">Full Name</label>
              <input value={profileForm.full_name}
                onChange={(e) => setProfileForm((f) => ({ ...f, full_name: e.target.value }))}
                className="input" required />
            </div>
            <div>
              <label className="label">Email</label>
              <input value={user?.email} disabled className="input opacity-60 cursor-not-allowed" />
              <p className="text-xs text-muted mt-1">Email cannot be changed for security reasons.</p>
            </div>
            <div>
              <label className="label">Phone Number</label>
              <input value={profileForm.phone}
                onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+91 98765 43210" className="input" />
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800 text-sm">
              <div>
                <p className="text-muted text-xs">Member Since</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{formatDateTime(user?.created_at)}</p>
              </div>
              <div>
                <p className="text-muted text-xs">Account Role</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 capitalize">{user?.role}</p>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Saving…' : 'Save Changes'}
            </button>
          </form>
        </div>
      )}

      {tab === 'security' && (
        <div className="card p-6 space-y-6 animate-fade-in">
          <div>
            <h3 className="section-title mb-1">Change Password</h3>
            <p className="text-xs text-muted">You'll be logged out after changing your password.</p>
          </div>
          <form onSubmit={handleChangePw} className="space-y-4">
            <div>
              <label className="label">Current Password</label>
              <input type="password" value={pwForm.current_password}
                onChange={(e) => setPwForm((f) => ({ ...f, current_password: e.target.value }))}
                className={`input ${pwErrors.current ? 'input-error' : ''}`} placeholder="••••••••" />
              {pwErrors.current && <p className="error-text">{pwErrors.current}</p>}
            </div>
            <div>
              <label className="label">New Password</label>
              <input type="password" value={pwForm.new_password}
                onChange={(e) => setPwForm((f) => ({ ...f, new_password: e.target.value }))}
                className={`input ${pwErrors.new ? 'input-error' : ''}`} placeholder="Min. 8 characters" />
              {pwErrors.new && <p className="error-text">{pwErrors.new}</p>}
            </div>
            <div>
              <label className="label">Confirm New Password</label>
              <input type="password" value={pwForm.confirm}
                onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))}
                className={`input ${pwErrors.confirm ? 'input-error' : ''}`} placeholder="Repeat new password" />
              {pwErrors.confirm && <p className="error-text">{pwErrors.confirm}</p>}
            </div>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Changing…' : 'Change Password'}
            </button>
          </form>

          <div className="divider pt-2">
            <h3 className="section-title mt-4 mb-2">Security Overview</h3>
            <div className="space-y-2">
              {[
                { label: 'Email Verified',    ok: user?.is_verified },
                { label: '2FA Enabled',       ok: user?.two_factor_enabled },
                { label: 'Wallet Active',     ok: !user?.wallet_frozen },
              ].map((s) => (
                <div key={s.label} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                  <span className="text-sm text-slate-700 dark:text-slate-300">{s.label}</span>
                  <span className={`badge ${s.ok ? 'badge-success' : 'badge-warning'}`}>
                    {s.ok ? '✓ Yes' : '✗ No'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}