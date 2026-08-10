import React from 'react';
import { X, ShieldAlert, Cpu, Clock, Clipboard, RotateCcw, Sparkles } from 'lucide-react';
import type { IMessageDetail } from '../../../shared/src/types';

interface MessageDetailsProps {
  message: IMessageDetail | null;
  onClose: () => void;
  onTriage: (messageId: string, isRetry: boolean) => Promise<void>;
  triaging: boolean;
}

export const MessageDetails: React.FC<MessageDetailsProps> = ({
  message,
  onClose,
  onTriage,
  triaging,
}) => {
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

  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.85) return 'text-emerald-400 bg-emerald-500/10';
    if (conf >= 0.70) return 'text-yellow-400 bg-yellow-500/10';
    return 'text-rose-400 bg-rose-500/10';
  };

  const getConfidenceBarColor = (conf: number) => {
    if (conf >= 0.85) return 'bg-emerald-500';
    if (conf >= 0.70) return 'bg-yellow-500';
    return 'bg-rose-500';
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
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
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
            <div className="space-y-4">
              <div className="text-center py-10 bg-slate-950/40 border border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center p-6">
                {message.status === 'failed' ? (
                  <>
                    <p className="text-rose-400 text-sm font-bold mb-2">Triage pipeline failed for this message.</p>
                    <p className="text-slate-500 text-xs mb-6 max-w-xs text-center">
                      The model provider was offline, API key was unconfigured, or schema validation failed.
                    </p>
                  </>
                ) : message.status === 'processing' || triaging ? (
                  <>
                    <p className="text-sky-400 text-sm font-semibold animate-pulse mb-4">Triage pipeline execution active...</p>
                    <div className="w-10 h-10 border-2 border-t-indigo-500 border-indigo-950 rounded-full animate-spin mb-4" />
                    <p className="text-slate-500 text-xs">Calling model and parsing structured safety attributes.</p>
                  </>
                ) : (
                  <>
                    <p className="text-slate-400 text-sm font-semibold mb-2">This ticket is currently pending triage.</p>
                    <p className="text-slate-500 text-xs mb-6">Trigger the AI triage engine to perform classification.</p>
                  </>
                )}

                {message.status !== 'processing' && !triaging && (
                  <button
                    onClick={() => onTriage(message._id, message.status === 'failed')}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-lg text-sm shadow-lg hover:shadow-indigo-500/20 transition-all cursor-pointer"
                  >
                    <Sparkles size={16} />
                    Run AI Triage
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Header with retry button */}
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Cpu size={14} className="text-indigo-400" />
                  Structured Decision
                </span>
                <button
                  disabled={triaging}
                  onClick={() => onTriage(message._id, true)}
                  className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-bold bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/20 rounded-md px-3 py-1 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <RotateCcw size={12} className={triaging ? 'animate-spin' : ''} />
                  Re-run Triage
                </button>
              </div>

              {/* Escalation Warning block */}
              {decision.needsHuman ? (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex gap-3 items-start shadow-[0_0_15px_rgba(245,158,11,0.08)]">
                  <ShieldAlert className="text-amber-400 shrink-0 mt-0.5" size={20} />
                  <div>
                    <h4 className="text-amber-400 text-sm font-bold">Human Review Required</h4>
                    <p className="text-slate-300 text-xs mt-1 font-semibold">
                      Reason: <span className="text-white italic">"{decision.humanReason || 'Low confidence evaluation'}"</span>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-4 flex gap-3 items-start">
                  <Cpu className="text-emerald-400 shrink-0 mt-0.5" size={20} />
                  <div>
                    <h4 className="text-emerald-400 text-sm font-bold">Automated Resolution Active</h4>
                    <p className="text-slate-300 text-xs mt-1">
                      This ticket was processed confidently without requiring human escalation.
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

              {/* Confidence Score Visualizer */}
              <div className="border border-slate-800 bg-slate-950/20 rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 text-xs font-semibold">Confidence Score</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${getConfidenceColor(decision.confidence)}`}>
                    {Math.round(decision.confidence * 100)}% Match
                  </span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${getConfidenceBarColor(decision.confidence)}`}
                    style={{ width: `${decision.confidence * 100}%` }}
                  />
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
                    <span className="text-slate-300">{decision.promptVersion}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800/40 pb-1">
                    <span className="text-slate-500">Pipeline Latency:</span>
                    <span className="text-slate-300 flex items-center gap-0.5">
                      <Clock size={10} />
                      {decision.latencyMs}ms
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800/40 pb-1">
                    <span className="text-slate-500">Input Tokens:</span>
                    <span className="text-slate-300">{decision.inputTokens ?? 'N/A'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800/40 pb-1">
                    <span className="text-slate-500">Output Tokens:</span>
                    <span className="text-slate-300">{decision.outputTokens ?? 'N/A'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800/40 pb-1">
                    <span className="text-slate-500">Total Tokens:</span>
                    <span className="text-slate-300">{decision.totalTokens ?? 'N/A'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800/40 pb-1">
                    <span className="text-slate-500">Est. Cost (USD):</span>
                    <span className="text-slate-300">
                      {decision.estimatedCost === 0
                        ? 'Free tier / $0 API cost'
                        : decision.estimatedCost !== null && decision.estimatedCost !== undefined
                          ? `$${decision.estimatedCost.toFixed(6)}`
                          : 'N/A'}
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
