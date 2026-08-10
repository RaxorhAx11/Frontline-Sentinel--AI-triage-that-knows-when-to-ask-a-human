import { useState, useEffect, useCallback } from 'react';
import { Shield, Server, LayoutDashboard, Inbox, ShieldAlert, Sliders } from 'lucide-react';
import { api, ApiError } from './api/client';
import { MessageForm } from './components/MessageForm';
import { MessagesTable } from './components/MessagesTable';
import { MessageDetails } from './components/MessageDetails';
import { DatasetTriage } from './components/DatasetTriage';
import { EvaluationDashboard } from './components/EvaluationDashboard';
import { DashboardView } from './components/DashboardView';
import { HumanReviewQueue } from './components/HumanReviewQueue';
import { HumanReviewDetail } from './components/HumanReviewDetail';
import type { IMessageDetail } from '../../shared/src/types';

export default function App() {
  const [stats, setStats] = useState<any>(null);
  const [messages, setMessages] = useState<IMessageDetail[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<IMessageDetail | null>(null);

  // Navigation and sub-tabs
  const [activeTab, setActiveTab] = useState<'dashboard' | 'messages' | 'reviews' | 'evaluation'>('dashboard');
  const [ingestionTab, setIngestionTab] = useState<'single' | 'bulk'>('single');

  // Reviews audit selection
  const [selectedReviewCase, setSelectedReviewCase] = useState<any>(null);
  const [refreshReviewsToggle, setRefreshReviewsToggle] = useState(false);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalMessages, setTotalMessages] = useState(0);

  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [triaging, setTriaging] = useState(false);

  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Fetch Dashboard Stats
  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const statsData = await api.getStats();
      setStats(statsData);
      setApiOnline(true);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
      if (err instanceof ApiError && err.status === 503) {
        setApiOnline(true);
      } else {
        setApiOnline(false);
      }
    } finally {
      setLoadingStats(false);
    }
  }, []);

  // Fetch Messages List
  const fetchMessages = useCallback(async (targetPage = 1, currentFilters = { status: statusFilter, priority: priorityFilter, category: categoryFilter }) => {
    setLoadingMessages(true);
    try {
      const data = await api.getMessages(targetPage, 8, currentFilters);
      setMessages(data.messages);
      setTotalPages(data.totalPages);
      setTotalMessages(data.total);
      setPage(data.page);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  }, [statusFilter, priorityFilter, categoryFilter]);

  const handleFilterChange = (type: 'status' | 'priority' | 'category', value: string) => {
    setPage(1);
    const updatedFilters = {
      status: type === 'status' ? value : statusFilter,
      priority: type === 'priority' ? value : priorityFilter,
      category: type === 'category' ? value : categoryFilter,
    };
    if (type === 'status') setStatusFilter(value);
    if (type === 'priority') setPriorityFilter(value);
    if (type === 'category') setCategoryFilter(value);
    fetchMessages(1, updatedFilters);
  };

  // Full Refresh
  const handleRefresh = useCallback(() => {
    fetchStats();
    fetchMessages(page);
  }, [fetchStats, fetchMessages, page]);

  // Initial load
  useEffect(() => {
    api.getHealth()
      .then(() => setApiOnline(true))
      .catch(() => setApiOnline(false));

    fetchStats();
    fetchMessages(1);
  }, [fetchStats, fetchMessages]);

  // Handle message submission
  const handleSubmitMessage = async (rawText: string) => {
    setSubmitting(true);
    try {
      await api.createMessage(rawText);
      setPage(1);
      await Promise.all([fetchStats(), fetchMessages(1)]);
      setActiveTab('messages'); // navigate to messages log to show user the newly ingested ticket
    } catch (err) {
      console.error('Error submitting message:', err);
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  // Handle row selection (inspect)
  const handleSelectMessage = async (msg: IMessageDetail) => {
    try {
      setSelectedMessage(msg);
      const fullMsg = await api.getMessageById(msg._id);
      setSelectedMessage(fullMsg);
    } catch (err) {
      console.error('Error fetching message details:', err);
    }
  };

  // Run or retry triage pipeline
  const handleTriage = async (messageId: string, isRetry: boolean) => {
    setTriaging(true);
    if (selectedMessage) {
      setSelectedMessage({ ...selectedMessage, status: 'processing' });
    }
    try {
      if (isRetry) {
        await api.retryTriage(messageId);
      } else {
        await api.runTriage(messageId);
      }
      const fullMsg = await api.getMessageById(messageId);
      setSelectedMessage(fullMsg);
      await Promise.all([fetchStats(), fetchMessages(page)]);
    } catch (err) {
      console.error('Error executing triage:', err);
      try {
        const fullMsg = await api.getMessageById(messageId);
        setSelectedMessage(fullMsg);
        await Promise.all([fetchStats(), fetchMessages(page)]);
      } catch { }
    } finally {
      setTriaging(false);
    }
  };

  const handleReviewSubmitted = () => {
    setSelectedReviewCase(null);
    setRefreshReviewsToggle((prev) => !prev);
    handleRefresh();
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col selection:bg-zinc-800 text-zinc-100 font-sans antialiased">
      {/* Header Navigation */}
      <header className="border-b border-zinc-900 bg-zinc-950/40 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="bg-white p-2 rounded-xl shadow-[0_0_15px_rgba(255,255,255,0.15)]">
              <Shield className="text-zinc-950" size={20} />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-white m-0 leading-none">
                FRONTLINE SENTINEL
              </h1>
              <span className="text-zinc-505 text-[9px] uppercase font-bold tracking-widest block mt-1">
                AI Triage & Triage Safety System
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer ${activeTab === 'dashboard'
                ? 'bg-white text-zinc-950 shadow-md'
                : 'text-zinc-400 hover:text-white'
                }`}
            >
              <LayoutDashboard size={14} />
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('messages')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer ${activeTab === 'messages'
                ? 'bg-white text-zinc-950 shadow-md'
                : 'text-zinc-400 hover:text-white'
                }`}
            >
              <Inbox size={14} />
              Messages
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer ${activeTab === 'reviews'
                ? 'bg-white text-zinc-950 shadow-md'
                : 'text-zinc-400 hover:text-white'
                }`}
            >
              <ShieldAlert size={14} />
              Human Review
            </button>
            <button
              onClick={() => setActiveTab('evaluation')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer ${activeTab === 'evaluation'
                ? 'bg-white text-zinc-950 shadow-md'
                : 'text-zinc-400 hover:text-white'
                }`}
            >
              <Sliders size={14} />
              Evaluation
            </button>
          </nav>

          {/* Status indicators */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-full px-3 py-1.5 text-xs font-semibold text-zinc-400">
              <Server size={12} className="text-zinc-500" />
              <span>System:</span>
              {apiOnline === null ? (
                <span className="flex h-2 w-2 rounded-full bg-zinc-700 animate-pulse" />
              ) : apiOnline ? (
                <span className="flex h-2 w-2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
              ) : (
                <span className="flex h-2 w-2 rounded-full bg-transparent border border-zinc-650 animate-pulse" />
              )}
              <span className="text-zinc-350 font-bold">
                {apiOnline === null ? 'Checking...' : apiOnline ? 'Active' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-7xl mx-auto px-6 py-8 w-full">
        {activeTab === 'dashboard' && (
          <DashboardView
            stats={stats}
            loadingStats={loadingStats}
            recentMessages={messages}
            loadingMessages={loadingMessages}
            onRefresh={handleRefresh}
            onNavigateToReviews={() => setActiveTab('reviews')}
            onSelectMessage={handleSelectMessage}
          />
        )}

        {activeTab === 'messages' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Messages Logs Table */}
            <div className="lg:col-span-2 space-y-4">
              <MessagesTable
                data={messages}
                loading={loadingMessages}
                total={totalMessages}
                page={page}
                totalPages={totalPages}
                statusFilter={statusFilter}
                priorityFilter={priorityFilter}
                categoryFilter={categoryFilter}
                onFilterChange={handleFilterChange}
                onPageChange={(newPage) => {
                  setPage(newPage);
                  fetchMessages(newPage);
                }}
                onSelectMessage={handleSelectMessage}
              />
            </div>

            {/* Side Ingestion Panel */}
            <div className="space-y-6">
              <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800">
                <button
                  onClick={() => setIngestionTab('single')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer ${ingestionTab === 'single'
                    ? 'bg-white text-zinc-950 shadow-md font-bold'
                    : 'text-zinc-400 hover:text-white'
                    }`}
                >
                  Single Message
                </button>
                <button
                  onClick={() => setIngestionTab('bulk')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer ${ingestionTab === 'bulk'
                    ? 'bg-white text-zinc-950 shadow-md font-bold'
                    : 'text-zinc-400 hover:text-white'
                    }`}
                >
                  Bulk Dataset Ingest
                </button>
              </div>

              {ingestionTab === 'single' ? (
                <MessageForm onSubmit={handleSubmitMessage} loading={submitting} />
              ) : (
                <DatasetTriage onImportComplete={handleRefresh} />
              )}
            </div>
          </div>
        )}

        {activeTab === 'reviews' && (
          <HumanReviewQueue
            onSelectCase={(caseItem) => setSelectedReviewCase(caseItem)}
            triggerRefresh={refreshReviewsToggle}
          />
        )}

        {activeTab === 'evaluation' && <EvaluationDashboard />}
      </main>

      {/* Selected Message Inspector Drawer */}
      {selectedMessage && (
        <MessageDetails
          message={selectedMessage}
          onClose={() => setSelectedMessage(null)}
          onTriage={handleTriage}
          triaging={triaging}
        />
      )}

      {/* Selected Review Audit Drawer */}
      {selectedReviewCase && (
        <HumanReviewDetail
          caseItem={selectedReviewCase}
          onClose={() => setSelectedReviewCase(null)}
          onReviewSubmitted={handleReviewSubmitted}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center text-xs text-zinc-650 font-semibold">
          <span>Frontline Sentinel</span>
          <span>Active</span>
        </div>
      </footer>
    </div>
  );
}

