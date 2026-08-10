import { ShieldAlert, ChevronLeft, ChevronRight, Eye, Trash2 } from 'lucide-react';
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
  onDeleteMessage: (messageId: string) => void;
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
  onDeleteMessage,
}) => {
  const getStatusBadge = (status: string) => {
    const base = 'inline-block whitespace-nowrap px-2.5 py-1 rounded-full text-xs font-semibold border ';
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

  const getPriorityBadge = (priority: string) => {
    const base = 'px-2 py-0.5 rounded text-xs font-bold border ';
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

  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.85) return 'bg-white';
    if (conf >= 0.70) return 'bg-zinc-400';
    return 'bg-zinc-700';
  };

  return (
    <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
      <div className="px-6 py-4 border-b border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white">Ingestion & Classification Logs</h3>
          {loading && <span className="text-white text-xs font-semibold animate-pulse block mt-1">Fetching records...</span>}
        </div>

        {/* Filters Panel */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex flex-col gap-1">
            <label className="text-zinc-500 font-bold uppercase text-[9px]">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => onFilterChange('status', e.target.value)}
              className="bg-zinc-950 border border-zinc-800 text-zinc-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-white focus:ring-1 focus:ring-white font-semibold cursor-pointer transition-all"
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
            <label className="text-zinc-500 font-bold uppercase text-[9px]">Priority</label>
            <select
              value={priorityFilter}
              onChange={(e) => onFilterChange('priority', e.target.value)}
              className="bg-zinc-950 border border-zinc-800 text-zinc-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-white focus:ring-1 focus:ring-white font-semibold cursor-pointer transition-all"
            >
              <option value="all">All Priorities</option>
              <option value="P0">P0 (Critical)</option>
              <option value="P1">P1 (High)</option>
              <option value="P2">P2 (Normal)</option>
              <option value="P3">P3 (Low)</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-zinc-500 font-bold uppercase text-[9px]">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => onFilterChange('category', e.target.value)}
              className="bg-zinc-950 border border-zinc-800 text-zinc-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-white focus:ring-1 focus:ring-white font-semibold capitalize cursor-pointer transition-all"
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
            <tr className="border-b border-zinc-800 bg-zinc-950/50 text-zinc-400 text-xs uppercase font-bold tracking-wider">
              <th className="py-4 px-6">Support Ticket (Preview)</th>
              <th className="py-4 px-6">Status</th>
              <th className="py-4 px-6">Category</th>
              <th className="py-4 px-6">Priority</th>
              <th className="py-4 px-6">Confidence</th>
              <th className="py-4 px-6 text-center">Safety Escalation</th>
              <th className="py-4 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900">
            {data.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-zinc-500 text-sm">
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
                    className="hover:bg-zinc-900/40 transition-colors group cursor-pointer"
                    onClick={() => onSelectMessage(msg)}
                  >
                    <td className="py-4 px-6 font-medium text-zinc-300 group-hover:text-white max-w-xs truncate">
                      {textPreview}
                    </td>
                    <td className="py-4 px-6">
                      <span className={getStatusBadge(msg.status)}>
                        {msg.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-zinc-400 font-semibold capitalize text-sm">
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
                          <div className="w-16 bg-zinc-950 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full ${getConfidenceColor(decision.confidence)}`}
                              style={{ width: `${decision.confidence * 100}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-zinc-300">
                            {Math.round(decision.confidence * 100)}%
                          </span>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-4 px-6 text-center">
                      {decision?.needsHuman ? (
                        <span className="inline-flex items-center gap-1 bg-white text-zinc-950 px-2 py-0.5 rounded text-xs font-semibold border border-white">
                          <ShieldAlert size={12} />
                          Human Escalated
                        </span>
                      ) : (
                        <span className="text-zinc-600 text-xs">—</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right flex items-center justify-end gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectMessage(msg);
                        }}
                        className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
                        title="View Details"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteMessage(msg._id);
                        }}
                        className="p-1.5 rounded-lg bg-zinc-850 hover:bg-red-950/40 text-zinc-400 hover:text-red-400 border border-zinc-800 hover:border-red-900/30 transition-all duration-200 cursor-pointer"
                        title="Delete Message"
                      >
                        <Trash2 size={14} />
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
        <div className="px-6 py-4 border-t border-zinc-800 flex items-center justify-between bg-zinc-950/20">
          <span className="text-zinc-500 text-xs">
            Showing Page <span className="text-zinc-300 font-semibold">{page}</span> of{' '}
            <span className="text-zinc-300 font-semibold">{totalPages}</span>
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
              className="p-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white disabled:opacity-40 disabled:hover:text-zinc-500 transition-colors cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white disabled:opacity-40 disabled:hover:text-zinc-500 transition-colors cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
