import React from 'react';
import { X, ShieldAlert, Cpu, Clock, Clipboard } from 'lucide-react';
import type { IMessageDetail } from '../../../shared/src/types';

interface MessageDetailsProps {
  message: IMessageDetail | null;
  onClose: () => void;
}

export const MessageDetails: React.FC<MessageDetailsProps> = ({ message, onClose }) => {
  if (!message) return null;

  const decision = message.triageDecision;

  const getPriorityColor = (prio: string) => {
    switch (prio) {
      case 'P0':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      case 'P1':
        return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
      case 'P2':
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      default:
        return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'human_review':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'failed':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      default:
        return 'text-sky-400 bg-sky-500/10 border-sky-500/20';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/70 backdrop-blur-sm">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-xl h-full bg-slate-900 border-l border-slate-800 flex flex-col shadow-2xl animate-in slide-in-from-right duration-350">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/20">
          <div>
            <h3 className="text-lg font-bold text-white">Diagnostics Inspector</h3>
            <span className="text-xs text-slate-500 font-mono">ID: {message._id}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Raw Ticket Section */}
          <div className="space-y-2">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wide">
              Raw Customer Message
            </span>
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 text-sm text-slate-300 whitespace-pre-wrap select-text leading-relaxed font-sans">
              {message.rawText}
            </div>
          </div>

          {/* Core Metadata */}
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-slate-800 bg-slate-950/20 rounded-lg p-3">
              <span className="text-slate-500 text-xs font-semibold block mb-1">Status</span>
              <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold border capitalize ${getStatusColor(message.status)}`}>
                {message.status.replace('_', ' ')}
              </span>
            </div>
            <div className="border border-slate-800 bg-slate-950/20 rounded-lg p-3">
              <span className="text-slate-500 text-xs font-semibold block mb-1">Created At</span>
              <span className="text-xs text-slate-300 font-medium">
                {new Date(message.createdAt).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="border-t border-slate-800 my-4" />

          {/* Triage Decision Section */}
          {!decision ? (
            <div className="text-center py-8 bg-slate-950/40 border border-dashed border-slate-800 rounded-xl">
              {message.status === 'failed' ? (
                <p className="text-rose-400 text-sm font-semibold">Triage pipeline failed for this message.</p>
              ) : (
                <p className="text-sky-400 text-sm font-semibold animate-pulse">Triage processing in progress...</p>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Escalation Warning block */}
              {decision.needsHuman && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex gap-3 items-start shadow-[0_0_15px_rgba(245,158,11,0.05)]">
                  <ShieldAlert className="text-amber-400 shrink-0 mt-0.5" size={20} />
                  <div>
                    <h4 className="text-amber-400 text-sm font-bold">Human Escalation Triggered</h4>
                    <p className="text-slate-300 text-xs mt-1 font-medium">
                      Reason: <span className="text-white italic">"{decision.humanReason || 'Low confidence evaluation'}"</span>
                    </p>
                  </div>
                </div>
              )}

              {/* Category and Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div className="border border-slate-800 bg-slate-950/20 rounded-lg p-3">
                  <span className="text-slate-500 text-xs font-semibold block mb-1">Assigned Category</span>
                  <span className="text-sm font-bold text-white capitalize">
                    {decision.category.replace('_', ' ')}
                  </span>
                </div>
                <div className="border border-slate-800 bg-slate-950/20 rounded-lg p-3">
                  <span className="text-slate-500 text-xs font-semibold block mb-1">Priority Level</span>
                  <span className={`inline-flex px-2.5 py-0.5 rounded text-xs font-extrabold border ${getPriorityColor(decision.priority)}`}>
                    {decision.priority}
                  </span>
                </div>
              </div>

              {/* Triage summary */}
              <div className="space-y-2">
                <span className="text-slate-400 text-xs font-bold uppercase tracking-wide flex items-center gap-1.5">
                  <Cpu size={14} className="text-indigo-400" />
                  AI Triage Summary
                </span>
                <div className="bg-slate-950/50 border border-slate-800/80 rounded-lg p-4 text-sm text-slate-200">
                  {decision.summary}
                </div>
              </div>

              {/* Suggested Action */}
              <div className="space-y-2">
                <span className="text-slate-400 text-xs font-bold uppercase tracking-wide flex items-center gap-1.5">
                  <Clipboard size={14} className="text-indigo-400" />
                  Suggested Action Protocol
                </span>
                <div className="bg-slate-950/50 border border-slate-800/80 rounded-lg p-4 text-sm text-slate-200 font-mono leading-relaxed border-l-2 border-l-indigo-500">
                  {decision.suggestedAction}
                </div>
              </div>

              {/* AI Audit Info */}
              <div className="bg-slate-950/20 border border-slate-800 rounded-lg p-4 space-y-3">
                <span className="text-slate-400 text-xs font-bold uppercase tracking-wide block">
                  Model Pipeline Telemetry
                </span>
                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs font-mono">
                  <div className="flex justify-between border-b border-slate-800/40 pb-1">
                    <span className="text-slate-500">LLM Engine:</span>
                    <span className="text-slate-300">{decision.model}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800/40 pb-1">
                    <span className="text-slate-500">Prompt Version:</span>
                    <span className="text-slate-300">v{decision.promptVersion}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800/40 pb-1">
                    <span className="text-slate-500">Confidence Score:</span>
                    <span className="text-slate-300 font-bold">{Math.round(decision.confidence * 100)}%</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800/40 pb-1">
                    <span className="text-slate-500">Pipeline Latency:</span>
                    <span className="text-slate-300 flex items-center gap-0.5">
                      <Clock size={10} />
                      {decision.latencyMs}ms
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
