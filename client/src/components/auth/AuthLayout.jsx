import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';

export default function AuthLayout() {
  const { dark, toggle } = useTheme();
  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      {/* Left branding panel — hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 gradient-card flex-col justify-between p-12 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full bg-white/5" />
        <div className="absolute top-1/2 right-8 w-48 h-48 rounded-full bg-white/5" />

        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <span className="text-white text-xl font-bold">P</span>
            </div>
            <span className="text-white text-2xl font-bold tracking-tight">PayWallet</span>
          </Link>
        </div>

        <div className="relative z-10 space-y-6">
          <h1 className="text-5xl font-extrabold text-white leading-tight">
            Smart Payments,<br />
            <span className="text-indigo-200">Simplified.</span>
          </h1>
          <p className="text-indigo-200 text-lg leading-relaxed max-w-sm">
            Send money, pay bills, and manage your finances with the security and speed you deserve.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-4">
            {[
              { icon: '🔒', label: 'Bank-grade Security' },
              { icon: '⚡', label: 'Instant Transfers' },
              { icon: '📊', label: 'Smart Analytics' },
              { icon: '🌍', label: '24/7 Available' },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-2 text-indigo-100">
                <span className="text-xl">{f.icon}</span>
                <span className="text-sm font-medium">{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-indigo-300 text-sm">
          © {new Date().getFullYear()} PayWallet. All rights reserved.
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col">
        <div className="flex justify-between items-center p-6">
          {/* Mobile logo */}
          <Link to="/" className="flex items-center gap-2 lg:hidden">
            <div className="w-8 h-8 gradient-card rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <span className="font-bold text-slate-900 dark:text-white">PayWallet</span>
          </Link>
          <div className="hidden lg:block" />
          <button onClick={toggle}
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            {dark ? '☀️' : '🌙'}
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 py-8">
          <div className="w-full max-w-md">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}