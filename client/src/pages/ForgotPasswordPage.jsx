import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';

export function ForgotPasswordPage() {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
      toast.success('Reset instructions sent!');
    } catch {
      toast.error('Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  if (sent) return (
    <div className="animate-fade-in text-center space-y-4">
      <div className="w-16 h-16 bg-accent-100 dark:bg-accent-900/30 rounded-2xl flex items-center justify-center mx-auto text-3xl">
        📧
      </div>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Check your email</h2>
      <p className="text-muted">Password reset instructions have been sent to <strong>{email}</strong></p>
      <Link to="/login" className="btn-primary btn inline-flex mt-4">Back to Login</Link>
    </div>
  );

  return (
    <div className="animate-fade-in">
      <Link to="/login" className="inline-flex items-center gap-1 text-sm text-muted hover:text-slate-700 dark:hover:text-slate-300 mb-8">
        ← Back to login
      </Link>
      <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Forgot password?</h2>
      <p className="text-muted mb-8">Enter your email and we'll send you a reset link.</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="label">Email address</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com" className="input" required />
        </div>
        <button type="submit" disabled={loading || !email} className="btn-primary w-full btn-lg">
          {loading ? 'Sending…' : 'Send Reset Link'}
        </button>
      </form>
    </div>
  );
}

export function ResetPasswordPage() {
  const [form, setForm]       = useState({ token: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);
  const [errors, setErrors]   = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.token) errs.token = 'Reset token is required';
    if (form.password.length < 8) errs.password = 'Min 8 characters';
    if (form.password !== form.confirm) errs.confirm = 'Passwords do not match';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token: form.token, password: form.password });
      setDone(true);
      toast.success('Password reset successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  if (done) return (
    <div className="animate-fade-in text-center space-y-4">
      <div className="w-16 h-16 bg-accent-100 dark:bg-accent-900/30 rounded-2xl flex items-center justify-center mx-auto text-3xl">✅</div>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Password Reset!</h2>
      <p className="text-muted">Your password has been reset successfully.</p>
      <Link to="/login" className="btn-primary btn inline-flex mt-4">Sign In Now</Link>
    </div>
  );

  return (
    <div className="animate-fade-in">
      <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Reset password</h2>
      <p className="text-muted mb-8">Enter the reset token from your email and choose a new password.</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="label">Reset Token</label>
          <input value={form.token} onChange={(e) => setForm((f) => ({ ...f, token: e.target.value }))}
            placeholder="Paste token from email" className={`input font-mono ${errors.token ? 'input-error' : ''}`} />
          {errors.token && <p className="error-text">{errors.token}</p>}
        </div>
        <div>
          <label className="label">New Password</label>
          <input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            placeholder="Min. 8 characters" className={`input ${errors.password ? 'input-error' : ''}`} />
          {errors.password && <p className="error-text">{errors.password}</p>}
        </div>
        <div>
          <label className="label">Confirm Password</label>
          <input type="password" value={form.confirm} onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
            placeholder="Repeat new password" className={`input ${errors.confirm ? 'input-error' : ''}`} />
          {errors.confirm && <p className="error-text">{errors.confirm}</p>}
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full btn-lg">
          {loading ? 'Resetting…' : 'Reset Password'}
        </button>
      </form>
    </div>
  );
}

export default ForgotPasswordPage;