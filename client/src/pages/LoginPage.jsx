import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm]       = useState({ email: '', password: '' });
  const [errors, setErrors]   = useState({});
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw]   = useState(false);

  const validate = () => {
    const e = {};
    if (!form.email)    e.email    = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email';
    if (!form.password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome back, ${user.full_name.split(' ')[0]}! 👋`);
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed';
      toast.error(msg);
      if (msg.includes('credentials')) setErrors({ password: 'Invalid email or password' });
    } finally {
      setLoading(false);
    }
  };

  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setErrors((er) => ({ ...er, [k]: '' })); };

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Welcome back</h2>
        <p className="mt-2 text-muted">Sign in to your PayWallet account</p>
      </div>

      {/* Demo credentials */}
      <div className="mb-6 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30 text-xs text-indigo-700 dark:text-indigo-300">
        <p className="font-semibold mb-1">Demo credentials</p>
        <p>Admin: <span className="font-mono">admin@paywallet.com</span> / <span className="font-mono">Admin@123</span></p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="label">Email address</label>
          <input type="email" value={form.email} onChange={set('email')} placeholder="you@example.com"
            className={`input ${errors.email ? 'input-error' : ''}`} autoComplete="email" />
          {errors.email && <p className="error-text">{errors.email}</p>}
        </div>

        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="label mb-0">Password</label>
            <Link to="/forgot-password" className="text-xs text-primary-600 dark:text-primary-400 hover:underline font-medium">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input type={showPw ? 'text' : 'password'} value={form.password} onChange={set('password')}
              placeholder="••••••••" className={`input pr-10 ${errors.password ? 'input-error' : ''}`} autoComplete="current-password" />
            <button type="button" onClick={() => setShowPw((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
              {showPw ? '🙈' : '👁️'}
            </button>
          </div>
          {errors.password && <p className="error-text">{errors.password}</p>}
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full btn-lg">
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Signing in…
            </span>
          ) : 'Sign In'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Don't have an account?{' '}
        <Link to="/register" className="text-primary-600 dark:text-primary-400 font-semibold hover:underline">
          Create account
        </Link>
      </p>
    </div>
  );
}