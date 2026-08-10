import React from 'react';
import { Inbox, ShieldAlert, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';

interface StatsProps {
  stats: {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    humanReview: number;
    invalid: number;
    averageConfidence: number;
  } | null;
  loading: boolean;
  onRefresh: () => void;
}

export const DashboardStats: React.FC<StatsProps> = ({ stats, loading, onRefresh }) => {
  const cards = [
    {
      title: 'Total Messages',
      value: stats?.total ?? 0,
      icon: Inbox,
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-500/10',
      borderColor: 'border-indigo-500/20',
    },
    {
      title: 'Pending',
      value: (stats?.pending ?? 0) + (stats?.processing ?? 0),
      icon: RefreshCw,
      color: 'text-sky-400',
      bgColor: 'bg-sky-500/10',
      borderColor: 'border-sky-500/20',
      animate: loading || (stats?.processing ?? 0) > 0 ? 'animate-spin' : '',
    },
    {
      title: 'Auto Triage',
      value: stats?.completed ?? 0,
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
    },
    {
      title: 'Human Review',
      value: stats?.humanReview ?? 0,
      icon: ShieldAlert,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
      glow: 'shadow-[0_0_15px_rgba(245,158,11,0.15)]',
    },
    {
      title: 'System Failures',
      value: (stats?.failed ?? 0) + (stats?.invalid ?? 0),
      icon: AlertTriangle,
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/10',
      borderColor: 'border-rose-500/20',
    },
    {
      title: 'Avg Confidence',
      value: stats?.averageConfidence !== undefined ? `${Math.round(stats.averageConfidence * 100)}%` : '0%',
      icon: CheckCircle2,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20',
    },
  ];

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">System Diagnostics</h2>
          <p className="text-slate-400 text-sm">Real-time sentiment and triage pipeline execution status.</p>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-800 border border-slate-700 text-slate-300 font-medium py-2 px-4 rounded-lg text-sm transition-all disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Sync Diagnostics
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className={`bg-slate-900/60 backdrop-blur-md border ${card.borderColor} rounded-xl p-5 transition-all hover:scale-[1.02] duration-300 ${card.glow || ''}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">{card.title}</span>
                <div className={`p-2 rounded-lg ${card.bgColor}`}>
                  <Icon size={20} className={`${card.color} ${card.animate || ''}`} />
                </div>
              </div>
              <div className="mt-4 flex items-baseline">
                <span className="text-3xl font-extrabold text-white tracking-tight">{card.value}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
