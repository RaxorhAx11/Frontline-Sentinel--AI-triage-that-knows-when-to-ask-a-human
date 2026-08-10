import { useState, useEffect, useCallback } from 'react';
import { Shield, Server } from 'lucide-react';
import { api, ApiError } from './api/client';
import { DashboardStats } from './components/DashboardStats';
import { MessageForm } from './components/MessageForm';
import { MessagesTable } from './components/MessagesTable';
import { MessageDetails } from './components/MessageDetails';
import type { IMessageDetail } from '../../shared/src/types';

export default function App() {
  const [stats, setStats] = useState<any>(null);
  const [messages, setMessages] = useState<IMessageDetail[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<IMessageDetail | null>(null);
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalMessages, setTotalMessages] = useState(0);

  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);

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
        // Backend is up but database is down
        setApiOnline(true);
      } else {
        setApiOnline(false);
      }
    } finally {
      setLoadingStats(false);
    }
  }, []);

  // Fetch Messages List
  const fetchMessages = useCallback(async (targetPage = 1) => {
    setLoadingMessages(true);
    try {
      const data = await api.getMessages(targetPage, 8);
      setMessages(data.messages);
      setTotalPages(data.totalPages);
      setTotalMessages(data.total);
      setPage(data.page);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

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
      // Reset page to 1 and reload data
      setPage(1);
      await Promise.all([fetchStats(), fetchMessages(1)]);
    } catch (err) {
      console.error('Error submitting message:', err);
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  // Handle row selection (fetches details by ID to get latest decision updates)
  const handleSelectMessage = async (msg: IMessageDetail) => {
    try {
      setSelectedMessage(msg); // Set initial details immediately
      const fullMsg = await api.getMessageById(msg._id);
      setSelectedMessage(fullMsg);
    } catch (err) {
      console.error('Error fetching message details:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col selection:bg-indigo-500/30">
      {/* Header Banner */}
      <header className="border-b border-slate-800 bg-slate-900/40 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2.5 rounded-xl shadow-[0_0_15px_rgba(99,102,241,0.4)]">
              <Shield className="text-white" size={22} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-white m-0 leading-none">
                FRONTLINE SENTINEL
              </h1>
              <span className="text-slate-500 text-[10px] uppercase font-bold tracking-widest block mt-1">
                Phase 1 Triage Diagnostic Control
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* System Status Indicators */}
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-full px-3 py-1.5 text-xs font-semibold text-slate-400">
              <Server size={14} className="text-slate-500" />
              <span>Core Service API:</span>
              {apiOnline === null ? (
                <span className="flex h-2.5 w-2.5 rounded-full bg-slate-600 animate-pulse" />
              ) : apiOnline ? (
                <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              ) : (
                <span className="flex h-2.5 w-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
              )}
              <span className="text-slate-300">
                {apiOnline === null ? 'Checking...' : apiOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-7xl mx-auto px-6 py-8 w-full space-y-8">
        {/* Diagnostics Stats row */}
        <DashboardStats 
          stats={stats} 
          loading={loadingStats} 
          onRefresh={handleRefresh} 
        />

        {/* Dashboard Actions and Logs Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Main Logs Area */}
          <div className="lg:col-span-2 space-y-4">
            <MessagesTable
              data={messages}
              loading={loadingMessages}
              total={totalMessages}
              page={page}
              totalPages={totalPages}
              onPageChange={(newPage) => {
                setPage(newPage);
                fetchMessages(newPage);
              }}
              onSelectMessage={handleSelectMessage}
            />
          </div>

          {/* Side Control Ingestion Panel */}
          <div className="space-y-6">
            <MessageForm 
              onSubmit={handleSubmitMessage} 
              loading={submitting} 
            />
          </div>
        </div>
      </main>

      {/* Details drawer inspector */}
      {selectedMessage && (
        <MessageDetails
          message={selectedMessage}
          onClose={() => setSelectedMessage(null)}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center text-xs text-slate-600">
          <span>Frontline Sentinel Support Portal © 2026. All rights reserved.</span>
          <span>Hackathon Build — Foundation Active</span>
        </div>
      </footer>
    </div>
  );
}
