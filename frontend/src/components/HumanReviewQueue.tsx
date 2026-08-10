import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { ShieldAlert, AlertTriangle, Play, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

interface HumanCase {
  id: string;
  messageId: string;
  category: string;
  priority: string;
  summary: string;
  suggestedAction: string;
  needsHuman: boolean;
  confidence: number;
  humanReason: string | null;
  createdAt: string;
  message: {
    id: string;
    rawText: string;
    status: string;
    createdAt: string;
  };
  review: {
    id: string;
    decision: 'accepted' | 'overridden';
    finalCategory: string;
    finalPriority: string;
    finalAction: string;
    finalNeedsHuman: boolean;
    notes: string;
    createdAt: string;
  } | null;
}

interface HumanReviewQueueProps {
  onSelectCase: (caseItem: any) => void;
  triggerRefresh: boolean;
}

export const HumanReviewQueue: React.FC<HumanReviewQueueProps> = ({ onSelectCase, triggerRefresh }) => {
  const [cases, setCases] = useState<HumanCase[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('pending'); // default to pending reviews for workflow efficiency

  const fetchReviews = useCallback(async (targetPage = 1) => {
    setLoading(true);
    setError(null);
    try {
      const filters = {
        priority: priorityFilter,
        status: statusFilter,
      };
      const response = await api.getReviews(targetPage, 8, filters);
      setCases(response.cases);
      setTotal(response.total);
      setPage(response.page);
      setTotalPages(response.totalPages);
    } catch (err: any) {
      console.error('Failed to fetch reviews:', err);
      setError('Unable to load human review queue. Please retry.');
    } finally {
      setLoading(false);
    }
  }, [priorityFilter, statusFilter]);

  useEffect(() => {
    fetchReviews(1);
  }, [fetchReviews, priorityFilter, statusFilter, triggerRefresh]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      fetchReviews(newPage);
    }
  };

  const getPriorityBadge = (priority: string) => {
    const base = 'px-2 py-0.5 rounded text-[10px] font-bold border ';
    switch (priority) {
      case 'P0':
        return `${base} bg-rose-950/40 text-rose-400 border-rose-500/20`;
      case 'P1':
        return `${base} bg-orange-950/40 text-orange-400 border-orange-500/20`;
      case 'P2':
        return `${base} bg-yellow-950/40 text-yellow-400 border-yellow-500/20`;
      case 'P3':
        return `${base} bg-slate-800/40 text-slate-400 border-slate-700/20`;
      default:
        return `${base} bg-slate-800/40 text-slate-400 border-slate-700/20`;
    }
  };

  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.85) return 'text-emerald-400';
    if (conf >= 0.70) return 'text-amber-400';
    return 'text-rose-400';
  };

  return (
    <div className="space-y-6">
      {/* 1. Header with Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 backdrop-blur-md border border-slate-800 p-5 rounded-xl">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <ShieldAlert className="text-amber-400" size={20} />
            Human Review Triage Queue
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Auditing tickets flagged with high uncertainty, security/abuse risks, or financial rules.
          </p>
        </div>

        {/* Filters and Sync Controls */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex flex-col gap-1">
            <label className="text-slate-500 font-bold uppercase text-[9px]">Review Status</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setPage(1);
                setStatusFilter(e.target.value);
              }}
              className="bg-slate-950 border border-slate-800 text-slate-350 rounded px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 font-semibold"
            >
              <option value="all">All Reviews</option>
              <option value="pending">Pending Review</option>
              <option value="reviewed">Reviewed Cases</option>
              <option value="accepted">Accepted AI Decisions</option>
              <option value="overridden">Overridden AI Decisions</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-slate-500 font-bold uppercase text-[9px]">Priority</label>
            <select
              value={priorityFilter}
              onChange={(e) => {
                setPage(1);
                setPriorityFilter(e.target.value);
              }}
              className="bg-slate-950 border border-slate-800 text-slate-350 rounded px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 font-semibold"
            >
              <option value="all">All Priorities</option>
              <option value="P0">P0 (Critical)</option>
              <option value="P1">P1 (High)</option>
              <option value="P2">P2 (Normal)</option>
              <option value="P3">P3 (Low)</option>
            </select>
          </div>

          <button
            onClick={() => fetchReviews(page)}
            disabled={loading}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2 px-3 rounded-lg border border-slate-700 transition-colors disabled:opacity-50 mt-4 md:mt-0 cursor-pointer"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Sync
          </button>
        </div>
      </div>

      {/* 2. Error Message */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs flex items-center gap-2">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {/* 3. Table / Queue Logs */}
      <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 uppercase font-bold tracking-wider">
                <th className="py-3.5 px-6">Customer Message</th>
                <th className="py-3.5 px-6">AI Category</th>
                <th className="py-3.5 px-6">AI Priority</th>
                <th className="py-3.5 px-6">Confidence</th>
                <th className="py-3.5 px-6">Escalation Reason</th>
                <th className="py-3.5 px-6">Review Status</th>
                <th className="py-3.5 px-6">Created Time</th>
                <th className="py-3.5 px-6 text-right">Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-semibold animate-pulse">
                    Loading human review queue...
                  </td>
                </tr>
              ) : cases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 font-medium">
                    No messages require human review.
                  </td>
                </tr>
              ) : (
                cases.map((c) => {
                  const textPreview =
                    c.message.rawText.length > 55
                      ? `${c.message.rawText.slice(0, 55)}...`
                      : c.message.rawText;

                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-slate-800/30 transition-colors group cursor-pointer"
                      onClick={() => onSelectCase(c)}
                    >
                      <td className="py-3.5 px-6 font-medium text-slate-200 group-hover:text-white max-w-xs truncate">
                        "{textPreview}"
                      </td>
                      <td className="py-3.5 px-6 uppercase font-semibold text-slate-400">
                        {c.category.replace('_', ' ')}
                      </td>
                      <td className="py-3.5 px-6">
                        {getPriorityBadge(c.priority)}
                      </td>
                      <td className="py-3.5 px-6 font-mono font-bold">
                        <span className={getConfidenceColor(c.confidence)}>
                          {Math.round(c.confidence * 100)}%
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-slate-350 italic truncate max-w-xs">
                        {c.humanReason || 'Uncertain parameters'}
                      </td>
                      <td className="py-3.5 px-6">
                        {c.review ? (
                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                            c.review.decision === 'accepted'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                          }`}>
                            {c.review.decision === 'accepted' ? 'Accepted' : 'Overridden'}
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold border bg-amber-500/10 text-amber-400 border-amber-500/20 uppercase tracking-wide">
                            Pending Audit
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-6 text-slate-500 font-mono text-[10px]">
                        {new Date(c.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectCase(c);
                          }}
                          className="bg-slate-800 group-hover:bg-indigo-650 hover:text-white text-slate-400 px-3 py-1 rounded transition-all inline-flex items-center gap-1 font-bold text-[10px]"
                        >
                          <Play size={10} />
                          Audit
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 4. Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between bg-slate-950/20 text-xs">
            <span className="text-slate-500">
              Showing Page <span className="text-slate-350 font-semibold">{page}</span> of{' '}
              <span className="text-slate-350 font-semibold">{totalPages}</span> | Total:{' '}
              <span className="text-slate-300 font-semibold">{total}</span> cases
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
                className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white disabled:opacity-40 transition-colors cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white disabled:opacity-40 transition-colors cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
