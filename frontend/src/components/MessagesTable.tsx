import React from 'react';
import { ShieldAlert, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import type { IMessageDetail } from '../../../shared/src/types';

interface MessagesTableProps {
  data: IMessageDetail[];
  loading: boolean;
  total: number;
  page: number;
  totalPages: number;
  statusFilter: string;
  priorityFilter: string;
  categoryFilter: string;
  onFilterChange: (type: 'status' | 'priority' | 'category', value: string) => void;
  onPageChange: (newPage: number) => void;
  onSelectMessage: (msg: IMessageDetail) => void;
}

export const MessagesTable: React.FC<MessagesTableProps> = ({
  data,
  loading,
  page,
  totalPages,
  statusFilter,
  priorityFilter,
  categoryFilter,
  onFilterChange,
  onPageChange,
  onSelectMessage,
}) => {
  const getStatusBadge = (status: string) => {
    const base = 'px-2.5 py-1 rounded-full text-xs font-semibold border ';
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

  const getPriorityBadge = (priority: string) => {
    const base = 'px-2 py-0.5 rounded text-xs font-bold border ';
    switch (priority) {
      case 'P0':
        return `${base} bg-rose-950/50 text-rose-400 border-rose-500/30`;
      case 'P1':
        return `${base} bg-orange-950/50 text-orange-400 border-orange-500/30`;
      case 'P2':
        return `${base} bg-yellow-950/50 text-yellow-400 border-yellow-500/30`;
      case 'P3':
        return `${base} bg-slate-800/50 text-slate-400 border-slate-700/30`;
      default:
        return `${base} bg-slate-800/50 text-slate-400 border-slate-700/30`;
    }
  };

  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.85) return 'bg-emerald-500';
    if (conf >= 0.70) return 'bg-yellow-500';
    return 'bg-rose-500';
  };

  return (
    <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      <div className="px-6 py-4 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white">Ingestion & Classification Logs</h3>
          {loading && <span className="text-indigo-400 text-xs font-semibold animate-pulse block mt-1">Fetching records...</span>}
        </div>

        {/* Filters Panel */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex flex-col gap-1">
            <label className="text-slate-500 font-bold uppercase text-[9px]">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => onFilterChange('status', e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 font-semibold"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="human_review">Human Review</option>
              <option value="failed">Failed</option>
              <option value="invalid">Invalid</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-slate-500 font-bold uppercase text-[9px]">Priority</label>
            <select
              value={priorityFilter}
              onChange={(e) => onFilterChange('priority', e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 font-semibold"
            >
              <option value="all">All Priorities</option>
              <option value="P0">P0 (Critical)</option>
              <option value="P1">P1 (High)</option>
              <option value="P2">P2 (Normal)</option>
              <option value="P3">P3 (Low)</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-slate-500 font-bold uppercase text-[9px]">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => onFilterChange('category', e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 font-semibold capitalize"
            >
              <option value="all">All Categories</option>
              <option value="billing">Billing</option>
              <option value="account">Account</option>
              <option value="order_delivery">Order & Delivery</option>
              <option value="refund_cancellation">Refund & Cancel</option>
              <option value="technical">Technical</option>
              <option value="product_service">Product Service</option>
              <option value="complaint">Complaint</option>
              <option value="general_question">General Question</option>
              <option value="security_abuse">Security & Abuse</option>
              <option value="out_of_scope">Out of Scope</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/50 text-slate-400 text-xs uppercase font-bold tracking-wider">
              <th className="py-4 px-6">Support Ticket (Preview)</th>
              <th className="py-4 px-6">Status</th>
              <th className="py-4 px-6">Category</th>
              <th className="py-4 px-6">Priority</th>
              <th className="py-4 px-6">Confidence</th>
              <th className="py-4 px-6 text-center">Safety Escalation</th>
              <th className="py-4 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {data.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500 text-sm">
                  No tickets logged yet. Submit a customer request to populate data.
                </td>
              </tr>
            ) : (
              data.map((msg) => {
                const decision = msg.triageDecision;
                const textPreview =
                  msg.rawText.length > 55 ? `${msg.rawText.slice(0, 55)}...` : msg.rawText;

                return (
                  <tr
                    key={msg._id}
                    className="hover:bg-slate-800/30 transition-colors group cursor-pointer"
                    onClick={() => onSelectMessage(msg)}
                  >
                    <td className="py-4 px-6 font-medium text-slate-300 group-hover:text-white max-w-xs truncate">
                      {textPreview}
                    </td>
                    <td className="py-4 px-6">
                      <span className={getStatusBadge(msg.status)}>
                        {msg.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-400 font-semibold capitalize text-sm">
                      {decision?.category ? decision.category.replace('_', ' ') : '—'}
                    </td>
                    <td className="py-4 px-6">
                      {decision?.priority ? (
                        <span className={getPriorityBadge(decision.priority)}>
                          {decision.priority}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-4 px-6 min-w-[120px]">
                      {decision ? (
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full ${getConfidenceColor(decision.confidence)}`}
                              style={{ width: `${decision.confidence * 100}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-slate-300">
                            {Math.round(decision.confidence * 100)}%
                          </span>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-4 px-6 text-center">
                      {decision?.needsHuman ? (
                        <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded text-xs font-semibold border border-amber-500/20">
                          <ShieldAlert size={12} />
                          Human Escalated
                        </span>
                      ) : (
                        <span className="text-slate-600 text-xs">—</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectMessage(msg);
                        }}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between bg-slate-950/20">
          <span className="text-slate-500 text-xs">
            Showing Page <span className="text-slate-300 font-semibold">{page}</span> of{' '}
            <span className="text-slate-300 font-semibold">{totalPages}</span>
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
              className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white disabled:opacity-40 disabled:hover:text-slate-400 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white disabled:opacity-40 disabled:hover:text-slate-400 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
