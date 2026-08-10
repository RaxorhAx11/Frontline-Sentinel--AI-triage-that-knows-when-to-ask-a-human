import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { X, ShieldAlert, Cpu, CheckCircle2, Sparkles, MessageSquare } from 'lucide-react';
import { CATEGORIES, PRIORITIES } from '../../../shared/src/constants';

interface CaseDetailProps {
  caseItem: {
    id: string;
    messageId: string;
    category: string;
    priority: string;
    summary: string;
    suggestedAction: string;
    needsHuman: boolean;
    confidence: number;
    humanReason: string | null;
    model: string | null;
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
    } | null;
  } | null;
  onClose: () => void;
  onReviewSubmitted: () => void;
}

export const HumanReviewDetail: React.FC<CaseDetailProps> = ({
  caseItem,
  onClose,
  onReviewSubmitted,
}) => {
  if (!caseItem) return null;

  // Review states
  const [decisionType, setDecisionType] = useState<'accepted' | 'overridden'>('accepted');
  const [category, setCategory] = useState(caseItem.category);
  const [priority, setPriority] = useState(caseItem.priority);
  const [suggestedAction, setSuggestedAction] = useState(caseItem.suggestedAction);
  const [needsHuman, setNeedsHuman] = useState(caseItem.needsHuman);
  const [notes, setNotes] = useState('');
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If caseItem changes, reset states to the current case item parameters
  useEffect(() => {
    if (caseItem.review) {
      setDecisionType(caseItem.review.decision);
      setCategory(caseItem.review.finalCategory);
      setPriority(caseItem.review.finalPriority);
      setSuggestedAction(caseItem.review.finalAction);
      setNeedsHuman(caseItem.review.finalNeedsHuman);
      setNotes(caseItem.review.notes);
    } else {
      setDecisionType('accepted');
      setCategory(caseItem.category);
      setPriority(caseItem.priority);
      setSuggestedAction(caseItem.suggestedAction);
      setNeedsHuman(caseItem.needsHuman);
      setNotes('');
    }
    setError(null);
  }, [caseItem]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    // Override note check validation
    if (decisionType === 'overridden' && (!notes || notes.trim().length === 0)) {
      setError('A short review note is required when overriding the AI decision.');
      setSaving(false);
      return;
    }

    try {
      const payload = {
        decision: decisionType,
        finalCategory: decisionType === 'accepted' ? caseItem.category : category,
        finalPriority: decisionType === 'accepted' ? caseItem.priority : priority,
        finalAction: decisionType === 'accepted' ? caseItem.suggestedAction : suggestedAction,
        finalNeedsHuman: decisionType === 'accepted' ? caseItem.needsHuman : needsHuman,
        notes: notes.trim(),
      };

      await api.createReview(caseItem.messageId, payload);
      onReviewSubmitted();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to submit review decision.');
    } finally {
      setSaving(false);
    }
  };

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

  const hasBeenReviewed = caseItem.review !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/70 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-2xl h-full bg-slate-900 border-l border-slate-800 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/20">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldAlert className="text-amber-400 animate-pulse" size={18} />
              Human Review Desk
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">Case ID: {caseItem.messageId}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col justify-between">
          <div className="space-y-6">
            {/* 1. Customer Message */}
            <div className="space-y-2">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wide flex items-center gap-1.5">
                <MessageSquare size={13} className="text-indigo-400" />
                Customer Message
              </span>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 whitespace-pre-wrap select-text leading-relaxed">
                "{caseItem.message.rawText}"
              </div>
            </div>

            {/* 2. AI Decision details */}
            <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4 space-y-3">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wide flex items-center gap-1.5">
                <Cpu size={14} className="text-indigo-400" />
                AI Suggested Classification
              </span>

              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="bg-slate-950/60 p-2.5 border border-slate-900 rounded-lg">
                  <span className="text-slate-500 font-medium block">Category</span>
                  <span className="text-white font-bold uppercase block mt-1">{caseItem.category}</span>
                </div>
                <div className="bg-slate-950/60 p-2.5 border border-slate-900 rounded-lg">
                  <span className="text-slate-500 font-medium block">Priority</span>
                  <span className={`inline-flex px-1.5 py-0.5 mt-1 rounded text-[10px] font-extrabold border ${getPriorityColor(caseItem.priority)}`}>
                    {caseItem.priority}
                  </span>
                </div>
                <div className="bg-slate-950/60 p-2.5 border border-slate-900 rounded-lg">
                  <span className="text-slate-500 font-medium block">Confidence</span>
                  <span className="text-indigo-400 font-bold block mt-1">{Math.round(caseItem.confidence * 100)}%</span>
                </div>
              </div>

              <div className="text-xs space-y-1 pt-1.5 border-t border-slate-900">
                <span className="text-slate-500 font-medium">Summary:</span>
                <p className="text-slate-300 leading-relaxed font-sans">{caseItem.summary}</p>
              </div>

              <div className="text-xs space-y-1">
                <span className="text-slate-500 font-medium">Suggested Action:</span>
                <p className="text-slate-350 leading-relaxed font-mono bg-slate-950/80 p-2 rounded border border-slate-900">{caseItem.suggestedAction}</p>
              </div>
            </div>

            {/* 3. Why Human Review? Reason Box */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex gap-3 items-start">
              <ShieldAlert size={18} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-amber-400 text-xs font-bold uppercase tracking-wider">Triggered Escalation Check</h4>
                <p className="text-slate-200 text-xs mt-1 leading-relaxed font-medium">
                  {caseItem.humanReason || 'Parameters fall under escalation thresholds or guardrails.'}
                </p>
              </div>
            </div>

            <div className="border-t border-slate-800 my-4" />

            {/* 4. Auditor Decision Actions */}
            <div className="space-y-4">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wide block">
                Operator Action Decision
              </span>

              {/* Review Audit Options tabs */}
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setDecisionType('accepted')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer ${
                    decisionType === 'accepted'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Accept AI Suggested Decision
                </button>
                <button
                  type="button"
                  onClick={() => setDecisionType('overridden')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer ${
                    decisionType === 'overridden'
                      ? 'bg-indigo-650 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Override Classification
                </button>
              </div>

              {/* Override Form Panel */}
              {decisionType === 'overridden' && (
                <div className="space-y-3 p-4 bg-slate-950/40 border border-slate-800 rounded-xl animate-fade-in text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-slate-500 font-semibold block">Override Category</label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-indigo-500 capitalize"
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat.replace('_', ' ')}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-500 font-semibold block">Override Priority</label>
                      <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                      >
                        {PRIORITIES.map((pri) => (
                          <option key={pri} value={pri}>
                            {pri}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-500 font-semibold block">Override Suggested Action Protocol</label>
                    <textarea
                      value={suggestedAction}
                      onChange={(e) => setSuggestedAction(e.target.value)}
                      rows={2}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>

                  <div className="flex items-center gap-2 py-1">
                    <input
                      type="checkbox"
                      id="needsHumanOverride"
                      checked={needsHuman}
                      onChange={(e) => setNeedsHuman(e.target.checked)}
                      className="h-4 w-4 bg-slate-950 border border-slate-800 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <label htmlFor="needsHumanOverride" className="text-xs font-semibold text-slate-350 select-none cursor-pointer">
                      Keep Case in Escalated Review Status
                    </label>
                  </div>
                </div>
              )}

              {/* Review Notes field (mandatory for override) */}
              <div className="space-y-1 text-xs">
                <label className="text-slate-400 font-bold block uppercase tracking-wide">
                  Review Audit Notes {decisionType === 'overridden' && <span className="text-rose-400">*</span>}
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder={
                    decisionType === 'overridden'
                      ? 'Why did you override this triage decision? Enter explanations/reasons here (mandatory)...'
                      : 'Add comments, instructions or resolution notes for operators (optional)...'
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-3 pt-6 border-t border-slate-800 mt-6">
            {error && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-xs flex items-center gap-2">
                <ShieldAlert size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary flex-1 py-2.5 font-bold transition-all text-xs cursor-pointer"
              >
                Close Panel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary flex-1 py-2.5 font-bold transition-all text-xs flex justify-center items-center gap-2 cursor-pointer bg-indigo-600 hover:bg-indigo-500"
              >
                {saving ? (
                  <span className="spinner-border spinner-border-sm" />
                ) : decisionType === 'accepted' ? (
                  <CheckCircle2 size={14} />
                ) : (
                  <Sparkles size={14} />
                )}
                {hasBeenReviewed ? 'Update Review Audit' : 'Complete Review Audit'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
