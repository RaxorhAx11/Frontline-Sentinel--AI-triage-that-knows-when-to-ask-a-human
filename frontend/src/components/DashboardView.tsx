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
        return `${base} bg-white text-zinc-950 border-white`;
      case 'P1':
        return `${base} bg-zinc-950 text-white border-zinc-200`;
      case 'P2':
        return `${base} bg-zinc-950 text-zinc-300 border-zinc-700`;
      case 'P3':
        return `${base} bg-zinc-950 text-zinc-500 border-zinc-800`;
      default:
        return `${base} bg-zinc-950 text-zinc-500 border-zinc-800`;
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
    const base = 'inline-block whitespace-nowrap px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ';
    switch (status) {
      case 'completed':
        return `${base} bg-zinc-900 text-zinc-300 border-zinc-800`;
      case 'human_review':
        return `${base} bg-white text-zinc-950 border-white`;
      case 'failed':
        return `${base} border-dashed border-zinc-700 text-zinc-400 bg-transparent`;
      case 'processing':
        return `${base} bg-zinc-800 text-white border-zinc-700 animate-pulse`;
      default:
        return `${base} bg-zinc-900/50 text-zinc-400 border-zinc-800`;
    }
  };

  const cards = [
    {
      title: 'Total Messages',
      value: stats?.total ?? 0,
      icon: Inbox,
      color: 'text-white',
      bgColor: 'bg-zinc-800',
      borderColor: 'border-zinc-800',
      description: 'Total imported customer messages',
    },
    {
      title: 'Automated',
      value: stats?.automated ?? 0,
      icon: CheckCircle2,
      color: 'text-zinc-200',
      bgColor: 'bg-zinc-800',
      borderColor: 'border-zinc-800',
      description: 'Triaged confidently by AI',
    },
    {
      title: 'Human Review',
      value: stats?.humanReview ?? 0,
      icon: ShieldAlert,
      color: 'text-zinc-950',
      bgColor: 'bg-white',
      borderColor: 'border-white',
      glow: 'shadow-[0_0_15px_rgba(255,255,255,0.08)]',
      clickable: true,
      onClick: onNavigateToReviews,
      description: 'Messages escalated to queue',
    },
    {
      title: 'High Priority',
      value: stats?.highPriority ?? 0,
      icon: Cpu,
      color: 'text-white',
      bgColor: 'bg-zinc-800',
      borderColor: 'border-zinc-700',
      description: 'P0 and P1 critical cases',
    },
    {
      title: 'Failed',
      value: stats?.failedTotal ?? 0,
      icon: AlertTriangle,
      color: 'text-zinc-500',
      bgColor: 'bg-zinc-900/40',
      borderColor: 'border-zinc-800',
      description: 'Processing failures or invalid inputs',
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Value Proposition Product Explanation */}
      <div className="bg-gradient-to-r from-zinc-900 to-zinc-950 border border-zinc-800 rounded-xl p-6 relative overflow-hidden shadow-lg">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Cpu size={120} className="text-white" />
        </div>
        <h2 className="text-2xl font-black text-white tracking-tight">Frontline Sentinel Dashboard</h2>
        <p className="text-zinc-300 text-sm mt-2 max-w-2xl leading-relaxed">
          Frontline Sentinel automatically triages customer requests and routes uncertain or risky cases to human review.
        </p>
      </div>

      {/* 2. Top KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          const CardContent = (
            <div
              className={`bg-zinc-900/40 backdrop-blur-md border ${card.borderColor} rounded-xl p-5 transition-all hover:scale-[1.02] duration-300 ${card.glow || ''} ${card.clickable ? 'cursor-pointer hover:border-white/50 group' : ''
                } h-full flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 text-xs font-semibold uppercase tracking-wider group-hover:text-zinc-200 transition-colors">
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
                <span className="text-[10px] text-zinc-500 mt-1 block font-medium">
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
                className="text-left w-full focus:outline-none focus:ring-2 focus:ring-white/40 rounded-xl"
              >
                {CardContent}
              </button>
            );
          }

          return <div key={card.title}>{CardContent}</div>;
        })}
      </div>

      {/* 3. Recent Decisions Table */}
      <div className="bg-zinc-900/30 backdrop-blur-md border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-zinc-800 flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Recent Triage Decisions</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Summary of classifications completed or escalated.</p>
          </div>
          <button
            onClick={onRefresh}
            className="text-xs font-bold text-white hover:bg-zinc-800 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            Refresh
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/40 text-zinc-400 uppercase font-bold tracking-wider">
                <th className="py-3 px-6">Customer Message</th>
                <th className="py-3 px-6">Category</th>
                <th className="py-3 px-6">Priority</th>
                <th className="py-3 px-6">Confidence</th>
                <th className="py-3 px-6 text-center">Escalation</th>
                <th className="py-3 px-6">Status</th>
                <th className="py-3 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {loadingMessages ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-zinc-500 animate-pulse font-semibold">
                    Loading triage decisions...
                  </td>
                </tr>
              ) : recentMessages.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-zinc-500 italic">
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
                      className="hover:bg-zinc-900/40 transition-colors group cursor-pointer"
                      onClick={() => onSelectMessage(msg)}
                    >
                      <td className="py-3.5 px-6 font-medium text-zinc-300 max-w-sm truncate group-hover:text-white transition-colors">
                        "{textPreview}"
                      </td>
                      <td className="py-3.5 px-6 font-semibold capitalize text-zinc-400">
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
                          <span className="font-mono text-zinc-300 font-bold">
                            {Math.round(decision.confidence * 100)}%
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3.5 px-6 text-center">
                        {decision?.needsHuman ? (
                          <span className="bg-white text-zinc-950 px-2 py-0.5 rounded text-[10px] font-bold border border-white uppercase tracking-wide">
                            Human Review
                          </span>
                        ) : (
                          <span className="text-zinc-500 font-bold">Automated</span>
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
                          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white px-2.5 py-1 rounded transition-colors inline-flex items-center gap-1 font-bold text-[10px]"
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
