import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm]       = useState({ full_name: '', email: '', phone: '', password: '', confirm: '' });
  const [errors, setErrors]   = useState({});
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw]   = useState(false);

  const validate = () => {
    const e = {};
    if (!form.full_name.trim()) e.full_name = 'Full name is required';
    if (!form.email || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Valid email is required';
    if (!form.phone || !/^\+?[\d\s\-]{10,}$/.test(form.phone)) e.phone = 'Valid phone number is required';
    if (!form.password || form.password.length < 8) e.password = 'Password must be at least 8 characters';
    else if (!/(?=.*[A-Z])(?=.*[0-9])/.test(form.password)) e.password = 'Password needs a number and uppercase letter';
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const { confirm, ...payload } = form;
      await register(payload);
      toast.success('Account created! Welcome to PayWallet 🎉');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setErrors((er) => ({ ...er, [k]: '' })); };

  const pwStrength = () => {
    const p = form.password;
    if (!p) return 0;
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  };

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColor = ['', 'bg-danger-500', 'bg-warning-500', 'bg-accent-400', 'bg-accent-500'];
  const strength = pwStrength();

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Create account</h2>
        <p className="mt-2 text-muted">Start your PayWallet journey today</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Full Name</label>
          <input value={form.full_name} onChange={set('full_name')} placeholder="Arjun Sharma"
            className={`input ${errors.full_name ? 'input-error' : ''}`} />
          {errors.full_name && <p className="error-text">{errors.full_name}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Email</label>
            <input type="email" value={form.email} onChange={set('email')} placeholder="you@example.com"
              className={`input ${errors.email ? 'input-error' : ''}`} />
            {errors.email && <p className="error-text">{errors.email}</p>}
          </div>
          <div>
            <label className="label">Phone</label>
            <input type="tel" value={form.phone} onChange={set('phone')} placeholder="+91 98765 43210"
              className={`input ${errors.phone ? 'input-error' : ''}`} />
            {errors.phone && <p className="error-text">{errors.phone}</p>}
          </div>
        </div>

        <div>
          <label className="label">Password</label>
          <div className="relative">
            <input type={showPw ? 'text' : 'password'} value={form.password} onChange={set('password')}
              placeholder="Min. 8 characters" className={`input pr-10 ${errors.password ? 'input-error' : ''}`} />
            <button type="button" onClick={() => setShowPw((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              {showPw ? '🙈' : '👁️'}
            </button>
          </div>
          {form.password && (
            <div className="mt-1.5 space-y-1">
              <div className="flex gap-1">
                {[1,2,3,4].map((i) => (
                  <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${strength >= i ? strengthColor[strength] : 'bg-slate-200 dark:bg-slate-700'}`} />
                ))}
              </div>
              <p className="text-xs text-muted">{strengthLabel[strength]}</p>
            </div>
          )}
          {errors.password && <p className="error-text">{errors.password}</p>}
        </div>

        <div>
          <label className="label">Confirm Password</label>
          <input type="password" value={form.confirm} onChange={set('confirm')}
            placeholder="Repeat your password" className={`input ${errors.confirm ? 'input-error' : ''}`} />
          {errors.confirm && <p className="error-text">{errors.confirm}</p>}
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full btn-lg mt-2">
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              Creating account…
            </span>
          ) : 'Create Account'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{' '}
        <Link to="/login" className="text-primary-600 dark:text-primary-400 font-semibold hover:underline">Sign in</Link>
      </p>
    </div>
  );
}