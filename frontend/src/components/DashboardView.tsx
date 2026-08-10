import React from 'react';
import { Inbox, ShieldAlert, CheckCircle2, AlertTriangle, Play, Cpu } from 'lucide-react';
import type { IMessageDetail } from '../../../shared/src/types';

interface Stats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  humanReview: number;
  invalid: number;
  p0: number;
  p1: number;
  p2: number;
  p3: number;
  automated: number;
  highPriority: number;
  failedTotal: number;
  averageConfidence: number;
}

interface DashboardViewProps {
  stats: Stats | null;
  loadingStats: boolean;
  recentMessages: IMessageDetail[];
  loadingMessages: boolean;
  onRefresh: () => void;
  onNavigateToReviews: () => void;
  onSelectMessage: (msg: IMessageDetail) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  loadingStats,
  recentMessages,
  loadingMessages,
  onRefresh,
  onNavigateToReviews,
  onSelectMessage,
}) => {
  const getPriorityBadge = (priority: string) => {
    const base = 'px-2.5 py-0.5 rounded text-xs font-bold border ';
    switch (priority) {
      case 'P0':
        return `${base} bg-rose-950/40 text-rose-400 border-rose-500/30`;
      case 'P1':
        return `${base} bg-orange-950/40 text-orange-400 border-orange-500/30`;
      case 'P2':
        return `${base} bg-yellow-950/40 text-yellow-400 border-yellow-500/30`;
      case 'P3':
        return `${base} bg-slate-800/40 text-slate-400 border-slate-700/30`;
      default:
        return `${base} bg-slate-800/40 text-slate-400 border-slate-700/30`;
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'P0':
        return 'P0 — Critical';
      case 'P1':
        return 'P1 — High';
      case 'P2':
        return 'P2 — Normal';
      case 'P3':
        return 'P3 — Low';
      default:
        return 'P3 — Low';
    }
  };

  const getStatusBadge = (status: string) => {
    const base = 'px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ';
    switch (status) {
      case 'completed':
        return `${base} bg-emerald-500/10 text-emerald-400 border-emerald-500/20`;
      case 'human_review':
        return `${base} bg-amber-500/10 text-amber-400 border-amber-500/20`;
      case 'failed':
        return `${base} bg-rose-500/10 text-rose-400 border-rose-500/20`;
      case 'processing':
        return `${base} bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse`;
      default:
        return `${base} bg-slate-500/10 text-slate-400 border-slate-500/20`;
    }
  };

  const cards = [
    {
      title: 'Total Messages',
      value: stats?.total ?? 0,
      icon: Inbox,
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-500/10',
      borderColor: 'border-indigo-500/20',
      description: 'Total imported customer messages',
    },
    {
      title: 'Automated',
      value: stats?.automated ?? 0,
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
      description: 'Triaged confidently by AI',
    },
    {
      title: 'Human Review',
      value: stats?.humanReview ?? 0,
      icon: ShieldAlert,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/30',
      glow: 'shadow-[0_0_15px_rgba(245,158,11,0.15)]',
      clickable: true,
      onClick: onNavigateToReviews,
      description: 'Messages escalated to queue',
    },
    {
      title: 'High Priority',
      value: stats?.highPriority ?? 0,
      icon: Cpu,
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/10',
      borderColor: 'border-rose-500/20',
      description: 'P0 and P1 critical cases',
    },
    {
      title: 'Failed',
      value: stats?.failedTotal ?? 0,
      icon: AlertTriangle,
      color: 'text-slate-400',
      bgColor: 'bg-slate-800/20',
      borderColor: 'border-slate-700/20',
      description: 'Processing failures or invalid inputs',
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Value Proposition Product Explanation */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950/30 border border-slate-800 rounded-xl p-6 relative overflow-hidden shadow-lg">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Cpu size={120} className="text-white" />
        </div>
        <h2 className="text-2xl font-black text-white tracking-tight">Frontline Sentinel Dashboard</h2>
        <p className="text-slate-300 text-sm mt-2 max-w-2xl leading-relaxed">
          Frontline Sentinel automatically triages clear customer requests and routes uncertain or risky cases to human review.
        </p>
      </div>

      {/* 2. Top KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          const CardContent = (
            <div
              className={`bg-slate-900/60 backdrop-blur-md border ${card.borderColor} rounded-xl p-5 transition-all hover:scale-[1.02] duration-300 ${card.glow || ''} ${card.clickable ? 'cursor-pointer hover:border-amber-500/40 group' : ''
                } h-full flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider group-hover:text-amber-300 transition-colors">
                  {card.title}
                </span>
                <div className={`p-2 rounded-lg ${card.bgColor}`}>
                  <Icon size={18} className={`${card.color}`} />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-3xl font-extrabold text-white tracking-tight block">
                  {loadingStats ? '...' : card.value}
                </span>
                <span className="text-[10px] text-slate-500 mt-1 block font-medium">
                  {card.description}
                </span>
              </div>
            </div>
          );

          if (card.clickable && card.onClick) {
            return (
              <button
                key={card.title}
                onClick={card.onClick}
                className="text-left w-full focus:outline-none focus:ring-2 focus:ring-amber-500/40 rounded-xl"
              >
                {CardContent}
              </button>
            );
          }

          return <div key={card.title}>{CardContent}</div>;
        })}
      </div>

      {/* 3. Recent Decisions Table */}
      <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Recent Triage Decisions</h3>
            <p className="text-xs text-slate-500 mt-0.5">Summary of classifications completed or escalated.</p>
          </div>
          <button
            onClick={onRefresh}
            className="text-xs font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            Refresh
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 uppercase font-bold tracking-wider">
                <th className="py-3 px-6">Customer Message</th>
                <th className="py-3 px-6">Category</th>
                <th className="py-3 px-6">Priority</th>
                <th className="py-3 px-6">Confidence</th>
                <th className="py-3 px-6 text-center">Escalation</th>
                <th className="py-3 px-6">Status</th>
                <th className="py-3 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loadingMessages ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 animate-pulse font-semibold">
                    Loading triage decisions...
                  </td>
                </tr>
              ) : recentMessages.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 italic">
                    No tickets have been triaged yet. Navigate to the Messages tab to ingest data.
                  </td>
                </tr>
              ) : (
                recentMessages.map((msg) => {
                  const decision = msg.triageDecision;
                  const textPreview =
                    msg.rawText.length > 70 ? `${msg.rawText.slice(0, 70)}...` : msg.rawText;

                  return (
                    <tr
                      key={msg._id}
                      className="hover:bg-slate-800/30 transition-colors group cursor-pointer"
                      onClick={() => onSelectMessage(msg)}
                    >
                      <td className="py-3.5 px-6 font-medium text-slate-350 max-w-sm truncate group-hover:text-white transition-colors">
                        "{textPreview}"
                      </td>
                      <td className="py-3.5 px-6 font-semibold capitalize text-slate-400">
                        {decision?.category ? decision.category.replace('_', ' ') : '—'}
                      </td>
                      <td className="py-3.5 px-6">
                        {decision?.priority ? (
                          <span className={getPriorityBadge(decision.priority)}>
                            {getPriorityLabel(decision.priority)}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3.5 px-6">
                        {decision ? (
                          <span className="font-mono text-slate-300 font-bold">
                            {Math.round(decision.confidence * 100)}%
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3.5 px-6 text-center">
                        {decision?.needsHuman ? (
                          <span className="bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded text-[10px] font-bold border border-amber-500/20 uppercase tracking-wide">
                            Human Review
                          </span>
                        ) : (
                          <span className="text-slate-650 font-bold">Automated</span>
                        )}
                      </td>
                      <td className="py-3.5 px-6">
                        <span className={getStatusBadge(msg.status)}>
                          {msg.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectMessage(msg);
                          }}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white px-2.5 py-1 rounded transition-colors inline-flex items-center gap-1 font-bold text-[10px]"
                        >
                          <Play size={10} />
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
