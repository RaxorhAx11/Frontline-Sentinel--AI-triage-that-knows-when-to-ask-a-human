import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Clock,
  Sliders,
  ShieldAlert,
  Database,
  ThumbsUp,
  ThumbsDown,
  Info
} from 'lucide-react';
import { CATEGORIES, PRIORITIES } from '../../../shared/src/constants';

export const EvaluationDashboard: React.FC = () => {
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [metricsData, setMetricsData] = useState<any>(null);
  const [selectedEval, setSelectedEval] = useState<any>(null);

  // Ground Truth Form State
  const [gtCategory, setGtCategory] = useState<string>('');
  const [gtPriority, setGtPriority] = useState<string>('');
  const [gtNeedsHuman, setGtNeedsHuman] = useState<boolean>(false);
  const [gtNotes, setGtNotes] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [seeding, setSeeding] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Fetch all data
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [listRes, metricsRes] = await Promise.all([
        api.getEvaluations(),
        api.getEvaluationMetrics()
      ]);
      setEvaluations(listRes);
      setMetricsData(metricsRes);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to fetch evaluation records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle Seeding representative messages
  const handleSeedDataset = async () => {
    setSeeding(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await api.seedEvaluationDataset();
      setSuccessMsg(res.message || 'Seeded evaluation dataset successfully.');
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to seed evaluation dataset.');
    } finally {
      setSeeding(false);
    }
  };

  // Open Form
  const handleOpenLabelPanel = (item: any) => {
    setSelectedEval(item);

    // Clear pre-selections to prevent AI bias.
    // If the item has already been labeled by human, load their choices.
    // Otherwise, start clean/empty so human has to select intentionally.
    const gt = item.groundTruth;
    const isLabeled = gt && gt.createdAt;

    if (isLabeled) {
      setGtCategory(gt.groundTruthCategory);
      setGtPriority(gt.groundTruthPriority);
      setGtNeedsHuman(gt.groundTruthNeedsHuman);
      setGtNotes(gt.notes || '');
    } else {
      setGtCategory('');
      setGtPriority('');
      setGtNeedsHuman(false);
      setGtNotes('');
    }
    setSuccessMsg(null);
  };

  // Save Ground Truth
  const handleSaveGroundTruth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEval) return;

    if (!gtCategory) {
      setError('Please select a ground-truth Category.');
      return;
    }
    if (!gtPriority) {
      setError('Please select a ground-truth Priority.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await api.saveGroundTruth({
        messageId: selectedEval.messageId,
        groundTruthCategory: gtCategory,
        groundTruthPriority: gtPriority,
        groundTruthNeedsHuman: gtNeedsHuman,
        notes: gtNotes,
      });

      setSuccessMsg('Ground truth saved successfully.');
      setSelectedEval(null);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to save ground truth.');
    } finally {
      setSaving(false);
    }
  };

  const getAccuracyColor = (val: number) => {
    if (val >= 0.85) return 'text-white font-extrabold';
    if (val >= 0.70) return 'text-zinc-300';
    return 'text-zinc-500';
  };

  const getRecallColor = (val: any) => {
    if (typeof val !== 'number') return 'text-zinc-500';
    if (val >= 0.90) return 'text-white font-extrabold';
    if (val >= 0.75) return 'text-zinc-300';
    return 'text-zinc-500';
  };

  const formatPercent = (val: number) => {
    return `${Math.round(val * 100)}%`;
  };

  // Helper observations: High confidence incorrect vs Low confidence correct
  const confidenceStats = (() => {
    let highConfIncorrect = 0;
    let lowConfCorrect = 0;

    evaluations.forEach((e) => {
      if (!e.aiDecision) return;
      const isCorrect = e.comparison.overallCorrect;
      const isHighConf = e.aiDecision.confidence >= 0.80;
      const isLowConf = e.aiDecision.confidence <= 0.50;

      if (isHighConf && !isCorrect) highConfIncorrect++;
      if (isLowConf && isCorrect) lowConfCorrect++;
    });

    return { highConfIncorrect, lowConfCorrect };
  })();

  const metrics = metricsData?.metrics;
  const modelInfo = metricsData?.modelInfo;

  return (
    <div className="space-y-8 animate-fade-in bg-zinc-950 text-zinc-100">
      {/* Upper Status row */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">AI Evaluation Hub</h2>
          <p className="text-zinc-400 text-xs mt-1">
            Measure AI classification accuracy, analyze false negatives, and evaluate latency/cost per message.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSeedDataset}
            disabled={seeding || loading}
            className="btn btn-secondary flex items-center gap-2 cursor-pointer"
          >
            {seeding ? (
              <span className="spinner-border spinner-border-sm animate-spin" />
            ) : (
              <Database size={14} />
            )}
            Seed 10 Challenge Tickets
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="btn btn-primary flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh Evaluation
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-zinc-900 border border-zinc-800 text-white rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 size={16} />
          {successMsg}
        </div>
      )}

      {error && (
        <div className="p-4 bg-zinc-950 border border-zinc-800 text-zinc-400 rounded-xl text-xs flex items-center gap-2">
          <XCircle size={16} />
          {error}
        </div>
      )}

      {/* Safety Warning Banner for False Negatives */}
      {metrics && metrics.falseNegativeHumanEscalations > 0 && (
        <div className="p-4 bg-white border border-white text-zinc-950 rounded-xl text-xs flex items-start gap-3 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
          <AlertTriangle size={18} className="shrink-0 mt-0.5 text-zinc-950" />
          <div>
            <span className="font-extrabold uppercase tracking-wide block">Internal Safety Diagnostic Alert</span>
            <p className="mt-0.5 font-semibold text-zinc-900">
              {metrics.falseNegativeHumanEscalations} {metrics.falseNegativeHumanEscalations === 1 ? 'case was' : 'cases were'} incorrectly automated despite requiring human review. This is a critical safety signal.
            </p>
          </div>
        </div>
      )}

      {/* 1. Agreement KPI Cards */}
      {metrics && metrics.evaluatedCount > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 flex flex-col justify-between transition-all hover:border-white/20">
            <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Overall Agreement</span>
            <div className="flex items-baseline justify-between mt-3">
              <span className={`text-3xl font-black tracking-tight ${getAccuracyColor(metrics.overallAgreement)}`}>
                {formatPercent(metrics.overallAgreement)}
              </span>
              <span className="text-xs text-zinc-400 font-semibold bg-zinc-950 px-2 py-1 rounded border border-zinc-800">
                {metrics.overallCorrect} / {metrics.evaluatedCount} messages
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 mt-2">
              Agreement of Category, Priority & Human Escalation.
            </p>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 flex flex-col justify-between transition-all hover:border-white/20">
            <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Category Agreement</span>
            <div className="flex items-baseline justify-between mt-3">
              <span className={`text-3xl font-black tracking-tight ${getAccuracyColor(metrics.categoryAgreement)}`}>
                {formatPercent(metrics.categoryAgreement)}
              </span>
              <span className="text-xs text-zinc-400 font-semibold bg-zinc-950 px-2 py-1 rounded border border-zinc-800">
                {metrics.categoryCorrect} / {metrics.evaluatedCount} messages
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 mt-2">
              Exact category string match between AI and human.
            </p>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 flex flex-col justify-between transition-all hover:border-white/20">
            <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Priority Agreement</span>
            <div className="flex items-baseline justify-between mt-3">
              <span className={`text-3xl font-black tracking-tight ${getAccuracyColor(metrics.priorityAgreement)}`}>
                {formatPercent(metrics.priorityAgreement)}
              </span>
              <span className="text-xs text-zinc-400 font-semibold bg-zinc-950 px-2 py-1 rounded border border-zinc-800">
                {metrics.priorityCorrect} / {metrics.evaluatedCount} messages
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 mt-2">
              Exact priority level alignment (P0 - P3).
            </p>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 flex flex-col justify-between transition-all hover:border-white/20">
            <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Human Recall (Escalation)</span>
            <div className="flex items-baseline justify-between mt-3">
              <span className={`text-3xl font-black tracking-tight ${getRecallColor(metrics.humanEscalationRecall)}`}>
                {typeof metrics.humanEscalationRecall === 'number'
                  ? formatPercent(metrics.humanEscalationRecall)
                  : 'N/A'}
              </span>
              <span className="text-xs text-zinc-400 font-semibold bg-zinc-950 px-2 py-1 rounded border border-zinc-800">
                {typeof metrics.humanEscalationRecall === 'number'
                  ? `${Math.round(metrics.humanEscalationRecall * metrics.evaluatedCount)} escalated`
                  : 'No Human Cases'}
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 mt-2">
              Recall rate of human review cases.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-8 bg-zinc-900/20 border border-zinc-800 rounded-xl text-center flex flex-col items-center">
          <Sliders className="text-zinc-500 mb-3" size={32} />
          <h3 className="font-bold text-white text-sm">No Labeled Messages Found</h3>
          <p className="text-zinc-400 text-xs mt-1 max-w-sm">
            Press the "Seed 10 Challenge Tickets" button to load representative testing messages, run AI classification, and input ground truth.
          </p>
        </div>
      )}

      {/* Grid of Main Details table and Ground Truth panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Labeled & Untreated Messages List */}
        <div className="lg:col-span-2 bg-zinc-900/40 border border-zinc-800 rounded-xl overflow-hidden p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Evaluation Set Messages</h3>
            <span className="text-[10px] text-zinc-500 font-bold bg-zinc-950 px-2.5 py-1 rounded border border-zinc-800">
              Total Evaluated: {metrics?.evaluatedCount || 0}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 font-bold">
                  <th className="py-3 px-2">Original Ticket Message</th>
                  <th className="py-3 px-2 text-center w-24">AI Prediction</th>
                  <th className="py-3 px-2 text-center w-24">Ground Truth</th>
                  <th className="py-3 px-2 text-center w-20">Status</th>
                  <th className="py-3 px-2 text-right w-24">Action</th>
                </tr>
              </thead>
              <tbody>
                {evaluations.length > 0 ? (
                  evaluations.map((item) => {
                    const isLabeled = item.groundTruth && item.groundTruth.createdAt;
                    const hasAI = item.aiDecision !== null;
                    const isCorrect = item.comparison?.overallCorrect;

                    return (
                      <tr key={item.messageId} className="border-b border-zinc-800 hover:bg-zinc-900/40 group">
                        <td className="py-3.5 px-2 max-w-[220px]">
                          <div className="font-semibold text-zinc-200 truncate group-hover:text-white transition">
                            {item.messageText}
                          </div>
                          {hasAI && (
                            <span className="text-[9px] text-zinc-500 block mt-0.5">
                              Confidence: {Math.round(item.aiDecision.confidence * 100)}% | Latency: {(item.aiDecision.latencyMs / 1000).toFixed(2)}s
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-2 text-center">
                          {hasAI ? (
                            <div className="space-y-0.5">
                              <span className="bg-zinc-950 text-zinc-300 text-[9px] font-bold px-1.5 py-0.5 rounded border border-zinc-800 uppercase">
                                {item.aiDecision.category}
                              </span>
                              <span className="bg-zinc-950 text-zinc-350 text-[9px] font-bold px-1.5 py-0.5 rounded border border-zinc-800 block w-max mx-auto">
                                {item.aiDecision.priority}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-zinc-500 block">AI Failed</span>
                          )}
                        </td>
                        <td className="py-3.5 px-2 text-center">
                          {isLabeled ? (
                            <div className="space-y-0.5">
                              <span className="bg-white text-zinc-950 text-[9px] font-semibold px-1.5 py-0.5 rounded border border-white uppercase">
                                {item.groundTruth.groundTruthCategory}
                              </span>
                              <span className="bg-zinc-950 text-zinc-350 text-[9px] font-bold px-1.5 py-0.5 rounded border border-zinc-800 block w-max mx-auto">
                                {item.groundTruth.groundTruthPriority}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-zinc-500 block italic">Not Labeled</span>
                          )}
                        </td>
                        <td className="py-3.5 px-2 text-center">
                          {isLabeled && hasAI ? (
                            isCorrect ? (
                              <span className="text-white font-bold text-[10px] bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 w-max mx-auto block">
                                MATCH
                              </span>
                            ) : (
                              <span className="text-zinc-500 font-bold text-[10px] bg-transparent px-2 py-0.5 rounded border border-dashed border-zinc-700 w-max mx-auto block">
                                ERROR
                              </span>
                            )
                          ) : (
                            <span className="text-zinc-600 text-[10px] block">N/A</span>
                          )}
                        </td>
                        <td className="py-3.5 px-2 text-right">
                          <button
                            onClick={() => handleOpenLabelPanel(item)}
                            className="bg-zinc-800 hover:bg-white hover:text-zinc-950 text-zinc-300 px-2.5 py-1 rounded text-[10px] font-bold transition duration-200 border border-zinc-700/60 hover:border-white cursor-pointer"
                          >
                            {isLabeled ? 'Re-label' : 'Label GT'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-zinc-500 italic">
                      No evaluation messages available. Seed dataset first.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Ground Truth Labeling Panel */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-6 space-y-5">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Sliders size={16} className="text-white" />
            Ground Truth Panel
          </h3>

          {selectedEval ? (
            <form onSubmit={handleSaveGroundTruth} className="space-y-4">
              <div className="p-3 bg-zinc-900/30 border border-zinc-800 rounded-xl">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">
                  Ticket Message
                </span>
                <p className="text-xs text-zinc-200 font-semibold leading-relaxed">
                  "{selectedEval.messageText}"
                </p>
              </div>

              {/* Separated AI Prediction Block to avoid preselection bias */}
              {selectedEval.aiDecision && (
                <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl space-y-1.5">
                  <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest block">
                    AI Prediction
                  </span>
                  <div className="flex gap-4 text-[10px]">
                    <div>
                      <span className="text-zinc-500 font-medium">Category:</span>{' '}
                      <span className="text-zinc-300 font-bold uppercase">{selectedEval.aiDecision.category}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 font-medium">Priority:</span>{' '}
                      <span className="text-zinc-300 font-bold">{selectedEval.aiDecision.priority}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 font-medium">Needs Human:</span>{' '}
                      <span className="text-zinc-300 font-bold">{selectedEval.aiDecision.needsHuman ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Ground Truth Inputs */}
              <div className="space-y-3 pt-2">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">
                  Human Ground Truth (Independent)
                </span>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400">Category</label>
                  <select
                    value={gtCategory}
                    onChange={(e) => setGtCategory(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-200 focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all cursor-pointer"
                  >
                    <option value="" disabled>-- Select Category --</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400">Priority</label>
                  <select
                    value={gtPriority}
                    onChange={(e) => setGtPriority(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-200 focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all cursor-pointer"
                  >
                    <option value="" disabled>-- Select Priority --</option>
                    {PRIORITIES.map((pri) => (
                      <option key={pri} value={pri}>
                        {pri}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-1.5">
                  <input
                    type="checkbox"
                    id="needsHumanGT"
                    checked={gtNeedsHuman}
                    onChange={(e) => setGtNeedsHuman(e.target.checked)}
                    className="h-4 w-4 bg-zinc-950 border border-zinc-800 rounded text-white focus:ring-white cursor-pointer"
                  />
                  <label htmlFor="needsHumanGT" className="text-xs font-semibold text-zinc-300 cursor-pointer select-none">
                    Needs Human Review Escalation
                  </label>
                </div>

                <div className="space-y-1 pt-1">
                  <label className="text-[10px] font-bold text-zinc-400">Notes / Why?</label>
                  <textarea
                    value={gtNotes}
                    onChange={(e) => setGtNotes(e.target.value)}
                    rows={3}
                    placeholder="Enter evaluator observations, failure patterns, or next improvement suggestions..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-200 focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all placeholder:text-zinc-650"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedEval(null)}
                  className="btn btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary flex-1 flex justify-center items-center gap-2 bg-white text-zinc-950 hover:bg-zinc-200 cursor-pointer"
                >
                  {saving && <span className="spinner-border spinner-border-sm animate-spin" />}
                  Save Labels
                </button>
              </div>
            </form>
          ) : (
            <div className="p-8 text-center text-zinc-500 text-xs italic bg-zinc-950/20 border border-zinc-800 rounded-xl">
              Select a message from the list to enter Ground Truth.
            </div>
          )}
        </div>
      </div>

      {/* 2. Error Breakdown and False Positives/Negatives analysis */}
      {metrics && metrics.evaluatedCount > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Metrics Error breakdown */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <ShieldAlert size={16} className="text-white" />
              Confusion & Disagreement Breakdown
            </h3>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-zinc-950 p-4 border border-zinc-800 rounded-xl text-center">
                <span className="text-xl font-extrabold text-white">
                  {metrics.evaluatedCount - metrics.categoryCorrect}
                </span>
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mt-1">Category Errors</span>
              </div>
              <div className="bg-zinc-950 p-4 border border-zinc-800 rounded-xl text-center">
                <span className="text-xl font-extrabold text-white">
                  {metrics.evaluatedCount - metrics.priorityCorrect}
                </span>
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mt-1">Priority Errors</span>
              </div>
              <div className="bg-zinc-950 p-4 border border-zinc-800 rounded-xl text-center">
                <span className="text-xl font-extrabold text-white">
                  {metrics.evaluatedCount - metrics.humanEscalationCorrect}
                </span>
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mt-1">Escalation Errors</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex justify-between items-center p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs">
                <div>
                  <span className="font-semibold text-zinc-300">False Positive Human Review</span>
                  <p className="text-[10px] text-zinc-500">AI says human required, but ground truth says not needed.</p>
                </div>
                <span className="font-bold text-white bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded">
                  {metrics.falsePositiveHumanEscalations}
                </span>
              </div>

              {/* HIGHLIGHT False Negatives since AI automated it but it required human */}
              <div className="flex justify-between items-center p-3 bg-white border border-white text-zinc-950 shadow-[0_0_15px_rgba(255,255,255,0.05)] rounded-xl text-xs">
                <div>
                  <span className="font-bold text-zinc-950">False Negative Human Review</span>
                  <p className="text-[10px] text-zinc-800">AI bypassed human check, but ground truth says human required!</p>
                </div>
                <span className="font-black text-white bg-zinc-950 border border-zinc-900 px-2.5 py-1 rounded">
                  {metrics.falseNegativeHumanEscalations}
                </span>
              </div>
            </div>
          </div>

          {/* Performance & pricing Metrics */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Clock size={16} className="text-white" />
              Resource and Latency Telemetry
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-zinc-950 p-3 border border-zinc-800 rounded-xl">
                <span className="text-zinc-500 block">Latency Performance</span>
                <span className="text-lg font-black text-zinc-200 mt-1 block">
                  Avg: {(metrics.averageLatency / 1000).toFixed(1)}s
                </span>
                <div className="text-[10px] text-zinc-500 flex gap-2 mt-1">
                  <span>Min: {(metrics.minLatency / 1000).toFixed(1)}s</span>
                  <span>Max: {(metrics.maxLatency / 1000).toFixed(1)}s</span>
                  <span>Med: {(metrics.medianLatency / 1000).toFixed(1)}s</span>
                </div>
              </div>

              <div className="bg-zinc-950 p-3 border border-zinc-800 rounded-xl">
                <span className="text-zinc-500 block">Avg Tokens Usage</span>
                {metrics.averageTotalTokens !== null ? (
                  <>
                    <span className="text-lg font-black text-zinc-200 mt-1 block">
                      {Math.round(metrics.averageTotalTokens)} tokens
                    </span>
                    <div className="text-[10px] text-zinc-500 flex gap-2 mt-1">
                      <span>In: {Math.round(metrics.averageInputTokens)}</span>
                      <span>Out: {Math.round(metrics.averageOutputTokens)}</span>
                    </div>
                  </>
                ) : (
                  <span className="text-zinc-505 block mt-1 italic text-[10px]">
                    Token usage unavailable from provider
                  </span>
                )}
              </div>
            </div>

            <div className="bg-zinc-950 p-4 border border-zinc-800 rounded-xl flex justify-between items-center text-xs">
              <div>
                <span className="font-semibold text-zinc-300">Estimated AI Pipeline Cost</span>
                <p className="text-[10px] text-zinc-500">Approximate cost configured in price variables.</p>
              </div>
              <span className="font-bold text-white">
                {metrics.pricingConfigured && metrics.totalCost !== null ? (
                  <span className="text-white font-bold">${metrics.totalCost.toFixed(5)}</span>
                ) : (
                  <span>API usage: Free tier</span>
                )}
              </span>
            </div>

            <div className="p-3.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs space-y-1.5">
              <span className="font-extrabold text-white block uppercase tracking-wider text-[10px]">
                💡 Practical Optimization Suggestion
              </span>
              <span className="font-semibold text-white text-[11px] block">
                Pre-LLM Guardrail Filtering
              </span>
              <p className="text-[10px] text-zinc-400 leading-relaxed font-medium">
                By running our cheap regex and repetitive character filters (in guardrail service) <strong className="text-white">before</strong> calling the Gemini API, we can bypass the LLM for garbage inputs (like "asdfghjkl") and obvious prompt injections.
              </p>
              <div className="grid grid-cols-3 gap-2 text-[9px] font-bold text-white pt-1">
                <span>⏱️ Latency: &lt;5ms</span>
                <span>💰 Cost: $0.00</span>
                <span>🏷️ Tokens: 0</span>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* 3. Confidence Signal Calibration */}
      {metrics && metrics.evaluatedCount > 0 && (
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Sliders size={16} className="text-white" />
            Confidence Signal Calibration
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-lg">
                  <ThumbsDown size={18} />
                </div>
                <div>
                  <span className="font-semibold text-zinc-300">High Confidence but Incorrect</span>
                  <p className="text-[10px] text-zinc-500">AI generated confident score {"(>= 80%)"} but got it wrong.</p>
                </div>
              </div>
              <span className="text-lg font-black text-white bg-zinc-900 border border-zinc-800 px-3 py-1 rounded">
                {confidenceStats.highConfIncorrect}
              </span>
            </div>

            <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-zinc-900 border border-zinc-800 text-white rounded-lg">
                  <ThumbsUp size={18} />
                </div>
                <div>
                  <span className="font-semibold text-zinc-300">Low Confidence and Correct</span>
                  <p className="text-[10px] text-zinc-500">AI was unsure {"(<= 50%)"} but classified accurately.</p>
                </div>
              </div>
              <span className="text-lg font-black text-white bg-zinc-900 border border-zinc-800 px-3 py-1 rounded">
                {confidenceStats.lowConfCorrect}
              </span>
            </div>
          </div>

          <div className="p-3 bg-zinc-950 border border-zinc-800 text-zinc-500 rounded-xl text-[10px] flex items-center gap-2 font-semibold">
            <Info size={14} className="shrink-0" />
            <span>Confidence is used as a triage signal, not as a statistically calibrated probability.</span>
          </div>
        </div>
      )}

      {/* 4. Failure Cases Listing (Where the AI Failed) */}
      {metrics && metrics.evaluatedCount > 0 && evaluations.filter(e => e.groundTruth && e.groundTruth.createdAt && !e.comparison.overallCorrect).length > 0 && (
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle size={16} />
            Where the AI Failed
          </h3>

          <div className="space-y-4">
            {(() => {
              const failures = evaluations.filter((e) => e.groundTruth && e.groundTruth.createdAt && !e.comparison.overallCorrect);
              // Prioritize False Negatives: GT needs human but AI automated
              const sortedFailures = [...failures].sort((a, b) => {
                const aIsFN = a.groundTruth.groundTruthNeedsHuman && !a.aiDecision?.needsHuman;
                const bIsFN = b.groundTruth.groundTruthNeedsHuman && !b.aiDecision?.needsHuman;
                if (aIsFN && !bIsFN) return -1;
                if (!aIsFN && bIsFN) return 1;
                return 0;
              });

              return sortedFailures.map((item) => {
                const isFalseNegative = item.groundTruth.groundTruthNeedsHuman && !item.aiDecision?.needsHuman;

                const getErrorTypes = () => {
                  const errs = [];
                  if (item.aiDecision) {
                    if (item.groundTruth.groundTruthCategory !== item.aiDecision.category) {
                      errs.push('Category Classification Error');
                    }
                    if (item.groundTruth.groundTruthPriority !== item.aiDecision.priority) {
                      errs.push('Priority Alignment Error');
                    }
                    if (item.groundTruth.groundTruthNeedsHuman !== item.aiDecision.needsHuman) {
                      errs.push(isFalseNegative ? 'Critical False Negative Escalation Error' : 'False Positive Escalation Error');
                    }
                  } else {
                    errs.push('AI Engine Execution Error');
                  }
                  return errs.join(', ');
                };

                return (
                  <div
                    key={item.messageId}
                    className={`p-4 bg-zinc-950/80 border rounded-xl space-y-3 transition-all ${isFalseNegative
                        ? 'border-zinc-300 shadow-[0_0_15px_rgba(255,255,255,0.05)]'
                        : 'border-zinc-800'
                      }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] text-zinc-500 font-mono font-bold bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded uppercase">
                        ID: {item.messageId}
                      </span>
                      {isFalseNegative && (
                        <span className="text-[10px] font-black text-zinc-950 bg-white border border-white px-2.5 py-0.5 rounded flex items-center gap-1 uppercase tracking-wider">
                          ⚠️ Safety Failure
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">Customer message</span>
                      <p className="text-xs text-zinc-200 font-semibold italic">"{item.messageText}"</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2 border-t border-zinc-900">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black text-white uppercase tracking-widest block">AI Prediction</span>
                        <div className="text-[10px] text-zinc-400 space-y-0.5">
                          <div>Category: <span className="text-zinc-200 font-bold uppercase">{item.aiDecision?.category || '—'}</span></div>
                          <div>Priority: <span className="text-zinc-200 font-bold">{item.aiDecision?.priority || '—'}</span></div>
                          <div>Human Escalation: <span className="text-zinc-200 font-bold">{item.aiDecision?.needsHuman ? 'Yes' : 'No'}</span></div>
                          {item.aiDecision && (
                            <div>Confidence: <span className="text-white font-extrabold">{Math.round(item.aiDecision.confidence * 100)}%</span></div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest block">Ground Truth</span>
                        <div className="text-[10px] text-zinc-400 space-y-0.5">
                          <div>Category: <span className="text-zinc-200 font-bold uppercase">{item.groundTruth.groundTruthCategory}</span></div>
                          <div>Priority: <span className="text-zinc-200 font-bold">{item.groundTruth.groundTruthPriority}</span></div>
                          <div>Human Escalation: <span className="text-zinc-200 font-bold">{item.groundTruth.groundTruthNeedsHuman ? 'Yes' : 'No'}</span></div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-[10px]">
                      <div>
                        <span className="text-zinc-500 font-bold uppercase block">Error Classification</span>
                        <span className="text-white font-semibold block mt-0.5">{getErrorTypes()}</span>
                      </div>
                      {isFalseNegative && (
                        <div>
                          <span className="text-zinc-400 font-bold uppercase block">Why this matters</span>
                          <span className="text-zinc-500 font-medium block mt-0.5 leading-relaxed">
                            The system was highly confident but still wrong about whether human intervention was required.
                          </span>
                        </div>
                      )}
                    </div>

                    {item.groundTruth.notes && (
                      <div className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs space-y-1 mt-2">
                        <span className="text-[9px] font-black text-white uppercase tracking-widest block">Evaluator Observations / Notes</span>
                        <p className="text-zinc-300 leading-relaxed font-medium">
                          {item.groundTruth.notes}
                        </p>
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* Model Info block */}
      {modelInfo && (
        <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl flex flex-wrap justify-between items-center text-xs text-zinc-500 gap-4">
          <div className="flex gap-4">
            <span>Provider: <strong className="text-zinc-300">{modelInfo.provider}</strong></span>
            <span>Model: <strong className="text-zinc-300">{modelInfo.model}</strong></span>
            <span>Prompt Version: <strong className="text-white">{modelInfo.promptVersion}</strong></span>
          </div>
          <span>Evaluation Date: <strong className="text-zinc-400">{new Date(modelInfo.evaluationDate).toLocaleString()}</strong></span>
        </div>
      )}
    </div>
  );
};
export default EvaluationDashboard;
