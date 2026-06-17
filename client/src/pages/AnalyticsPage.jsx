import React, { useEffect, useState } from 'react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, ArcElement, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import api from '../utils/api';
import { formatCurrency } from '../utils/helpers';
import { useTheme } from '../context/ThemeContext';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler);

const CATEGORY_COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#3b82f6','#ec4899','#14b8a6'];

export default function AnalyticsPage() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const { dark } = useTheme();

  useEffect(() => {
    api.get('/wallet/analytics')
      .then((r) => setData(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 skeleton w-40 rounded-xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_,i) => <div key={i} className="h-24 skeleton rounded-2xl" />)}</div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">{[...Array(3)].map((_,i) => <div key={i} className="h-72 skeleton rounded-2xl" />)}</div>
    </div>
  );

  const textColor   = dark ? '#94a3b8' : '#64748b';
  const gridColor   = dark ? '#1e293b' : '#f1f5f9';
  const chartOpts   = { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: textColor, font: { family: 'Inter' } } } }, scales: { x: { ticks: { color: textColor, font: { size: 11 } }, grid: { color: gridColor } }, y: { ticks: { color: textColor, font: { size: 11 } }, grid: { color: gridColor } } } };

  // Build daily line chart data
  const dailyDates = [...new Set(data?.daily?.map((d) => d.date.split('T')[0]) || [])].slice(-14);
  const sentDaily = dailyDates.map((date) => {
    const row = data?.daily?.find((d) => d.date.split('T')[0] === date && d.type === 'send');
    return row ? parseFloat(row.total) : 0;
  });
  const receivedDaily = dailyDates.map((date) => {
    const row = data?.daily?.find((d) => d.date.split('T')[0] === date && d.type === 'receive');
    return row ? parseFloat(row.total) : 0;
  });

  const lineData = {
    labels: dailyDates.map((d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })),
    datasets: [
      { label: 'Sent', data: sentDaily, borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)', fill: true, tension: 0.4, pointRadius: 3 },
      { label: 'Received', data: receivedDaily, borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', fill: true, tension: 0.4, pointRadius: 3 },
    ],
  };

  // Monthly bar chart
  const months = [...new Set(data?.monthly?.map((m) => m.month) || [])];
  const barData = {
    labels: months,
    datasets: [
      { label: 'Sent',     data: months.map((m) => parseFloat(data?.monthly?.find((r) => r.month === m && r.type === 'send')?.total || 0)), backgroundColor: '#6366f1', borderRadius: 6 },
      { label: 'Received', data: months.map((m) => parseFloat(data?.monthly?.find((r) => r.month === m && r.type === 'receive')?.total || 0)), backgroundColor: '#10b981', borderRadius: 6 },
    ],
  };

  // Doughnut category
  const cats = data?.categories || [];
  const doughnutData = {
    labels: cats.map((c) => c.category),
    datasets: [{ data: cats.map((c) => parseFloat(c.total)), backgroundColor: CATEGORY_COLORS, borderWidth: 0, hoverOffset: 6 }],
  };

  const stats = data?.stats || {};

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="page-header">Analytics</h1>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Spent (30d)',    value: formatCurrency(stats.total_spent     || 0), icon: '↗', color: 'text-danger-500',  bg: 'bg-danger-50 dark:bg-danger-900/20' },
          { label: 'Total Received (30d)', value: formatCurrency(stats.total_received  || 0), icon: '↙', color: 'text-accent-500',  bg: 'bg-accent-50 dark:bg-accent-900/20' },
          { label: 'Sent Count',           value: stats.total_sent_count      || 0,            icon: '📤', color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-900/20' },
          { label: 'Received Count',       value: stats.total_received_count  || 0,            icon: '📥', color: 'text-indigo-500',  bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
        ].map((s) => (
          <div key={s.label} className="card p-4">
            <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center text-xl mb-3`}>{s.icon}</div>
            <p className="text-xs text-muted">{s.label}</p>
            <p className={`text-xl font-bold mt-0.5 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Line chart */}
        <div className="card p-5 lg:col-span-2">
          <h2 className="section-title mb-4">Daily Transaction Volume (Last 14 Days)</h2>
          <div className="h-64">
            {dailyDates.length > 0
              ? <Line data={lineData} options={{ ...chartOpts, plugins: { ...chartOpts.plugins, tooltip: { callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${formatCurrency(ctx.raw)}` } } } }} />
              : <EmptyChart />}
          </div>
        </div>

        {/* Bar chart */}
        <div className="card p-5">
          <h2 className="section-title mb-4">Monthly Overview</h2>
          <div className="h-64">
            {months.length > 0
              ? <Bar data={barData} options={{ ...chartOpts, plugins: { ...chartOpts.plugins, tooltip: { callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${formatCurrency(ctx.raw)}` } } } }} />
              : <EmptyChart />}
          </div>
        </div>

        {/* Doughnut */}
        <div className="card p-5">
          <h2 className="section-title mb-4">Spending by Category</h2>
          <div className="h-64 flex items-center justify-center">
            {cats.length > 0
              ? <Doughnut data={doughnutData} options={{ responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'bottom', labels: { color: textColor, padding: 16, font: { family: 'Inter', size: 11 } } } } }} />
              : <EmptyChart />}
          </div>
        </div>
      </div>
    </div>
  );
}

const EmptyChart = () => (
  <div className="h-full flex flex-col items-center justify-center text-muted gap-2">
    <span className="text-3xl">📉</span>
    <p className="text-sm">Not enough data yet</p>
  </div>
);