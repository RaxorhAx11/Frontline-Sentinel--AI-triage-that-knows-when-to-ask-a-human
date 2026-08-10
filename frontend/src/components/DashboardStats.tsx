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
      color: 'text-white',
      bgColor: 'bg-zinc-900',
      borderColor: 'border-zinc-800',
    },
    {
      title: 'Pending',
      value: (stats?.pending ?? 0) + (stats?.processing ?? 0),
      icon: RefreshCw,
      color: 'text-zinc-300',
      bgColor: 'bg-zinc-900',
      borderColor: 'border-zinc-800',
      animate: loading || (stats?.processing ?? 0) > 0 ? 'animate-spin' : '',
    },
    {
      title: 'Auto Triage',
      value: stats?.completed ?? 0,
      icon: CheckCircle2,
      color: 'text-zinc-200',
      bgColor: 'bg-zinc-800',
      borderColor: 'border-zinc-700',
    },
    {
      title: 'Human Review',
      value: stats?.humanReview ?? 0,
      icon: ShieldAlert,
      color: 'text-zinc-950',
      bgColor: 'bg-white',
      borderColor: 'border-white',
      glow: 'shadow-[0_0_15px_rgba(255,255,255,0.08)]',
    },
    {
      title: 'System Failures',
      value: (stats?.failed ?? 0) + (stats?.invalid ?? 0),
      icon: AlertTriangle,
      color: 'text-zinc-400',
      bgColor: 'bg-transparent',
      borderColor: 'border-zinc-800',
    },
    {
      title: 'Avg Confidence',
      value: stats?.averageConfidence !== undefined ? `${Math.round(stats.averageConfidence * 100)}%` : '0%',
      icon: CheckCircle2,
      color: 'text-zinc-200',
      bgColor: 'bg-zinc-900',
      borderColor: 'border-zinc-800',
    },
  ];

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">System Diagnostics</h2>
          <p className="text-zinc-400 text-sm">Real-time sentiment and triage pipeline execution status.</p>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-900 border border-zinc-800 text-zinc-300 font-medium py-2 px-4 rounded-lg text-sm transition-all disabled:opacity-50 cursor-pointer"
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
              className={`bg-zinc-900/40 backdrop-blur-md border ${card.borderColor} rounded-xl p-5 transition-all hover:scale-[1.02] duration-300 ${card.glow || ''}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">{card.title}</span>
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
