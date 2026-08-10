import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';

interface DatasetTriageProps {
  onImportComplete: () => void;
}

export const DatasetTriage: React.FC<DatasetTriageProps> = ({ onImportComplete }) => {
  const [file, setFile] = useState<File | null>(null);
  const [csvContent, setCsvContent] = useState<string>('');
  const [detectStats, setDetectStats] = useState<{ total: number } | null>(null);
  
  const [importStats, setImportStats] = useState<{
    total: number;
    valid: number;
    invalid: number;
    duplicates: number;
    imported: number;
  } | null>(null);

  const [triageStatus, setTriageStatus] = useState<{
    status: 'idle' | 'running' | 'paused' | 'stopped' | 'completed';
    total: number;
    processed: number;
    pending: number;
    processing: number;
    completed: number;
    humanReview: number;
    failed: number;
    invalid: number;
  } | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const pollInterval = useRef<any>(null);

  // Read file content
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setImportStats(null);
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) {
      setFile(null);
      setCsvContent('');
      setDetectStats(null);
      return;
    }

    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvContent(text);
      
      // Rough line detection
      const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
      setDetectStats({
        total: lines.length > 1 ? lines.length - 1 : 0, // exclude header
      });
    };
    reader.onerror = () => {
      setError('Failed to read the file.');
    };
    reader.readAsText(selectedFile);
  };

  // Upload and import messages
  const handleImport = async () => {
    if (!csvContent) return;
    setLoading(true);
    setError(null);
    try {
      const stats = await api.importMessagesBulk(csvContent);
      setImportStats(stats);
      onImportComplete();
    } catch (err: any) {
      setError(err.message || 'Failed to import messages.');
    } finally {
      setLoading(false);
    }
  };

  // Start sequential bulk triage
  const handleStartTriage = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.startBulkTriage();
      // Start polling status
      pollStatus();
    } catch (err: any) {
      setError(err.message || 'Failed to start AI Triage.');
    } finally {
      setLoading(false);
    }
  };

  // Pause triage
  const handlePauseTriage = async () => {
    try {
      await api.pauseBulkTriage();
    } catch (err: any) {
      setError(err.message || 'Failed to pause AI Triage.');
    }
  };

  // Stop triage
  const handleStopTriage = async () => {
    try {
      await api.stopBulkTriage();
    } catch (err: any) {
      setError(err.message || 'Failed to stop AI Triage.');
    }
  };

  // Poll status endpoint
  const pollStatus = () => {
    if (pollInterval.current) clearInterval(pollInterval.current);
    
    const fetchStatus = async () => {
      try {
        const status = await api.getBulkTriageStatus();
        setTriageStatus(status);
        
        // Stop polling if done or idle
        if (status.status === 'completed' || status.status === 'stopped' || status.status === 'idle') {
          if (pollInterval.current) {
            clearInterval(pollInterval.current);
            pollInterval.current = null;
          }
          onImportComplete(); // Refresh main lists
        }
      } catch (err) {
        console.error('Error polling bulk status:', err);
      }
    };

    fetchStatus();
    pollInterval.current = setInterval(fetchStatus, 1500);
  };

  // Clean up polling on unmount
  useEffect(() => {
    // Initial status check
    const checkInitialStatus = async () => {
      try {
        const status = await api.getBulkTriageStatus();
        setTriageStatus(status);
        if (status.status === 'running') {
          pollStatus();
        }
      } catch (err) {
        console.error('Failed to get initial status:', err);
      }
    };
    checkInitialStatus();

    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
      }
    };
  }, []);

  const progressPercent = triageStatus && triageStatus.total > 0
    ? Math.round((triageStatus.processed / triageStatus.total) * 100)
    : 0;

  return (
    <div className="dataset-triage-card">
      <h2 className="section-title">Bulk Dataset Triage</h2>
      <p className="section-subtitle">
        Upload your customer support ticket dataset, import messages safely, and run AI classification sequentially.
      </p>

      {error && (
        <div className="alert alert-danger" role="alert">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Upload Panel */}
      {(!triageStatus || triageStatus.status === 'idle') && !importStats && (
        <div className="upload-container">
          <div className="file-dropzone">
            <input
              type="file"
              id="dataset-upload"
              accept=".csv"
              onChange={handleFileChange}
              className="file-input"
            />
            <label htmlFor="dataset-upload" className="dropzone-label">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
              </svg>
              {file ? (
                <div className="file-info-selected">
                  <span className="file-name">{file.name}</span>
                  <span className="file-size">{(file.size / 1024).toFixed(1)} KB</span>
                </div>
              ) : (
                <div className="dropzone-text">
                  <span className="highlight-text">Click to upload</span> or drag & drop CSV file
                </div>
              )}
            </label>
          </div>

          {detectStats && (
            <div className="detect-summary">
              <div className="summary-item">
                <span className="summary-label">Messages Detected:</span>
                <span className="summary-value highlight">{detectStats.total}</span>
              </div>
              <button
                onClick={handleImport}
                disabled={loading || !file}
                className="btn btn-primary btn-bulk-action"
              >
                {loading ? (
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                ) : (
                  'Import Dataset'
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Import Success Stats */}
      {importStats && triageStatus?.status === 'idle' && (
        <div className="import-success-panel">
          <div className="success-banner">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="success-icon">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <h3>Dataset Imported Successfully</h3>
          </div>
          
          <div className="stats-grid">
            <div className="stat-box">
              <span className="stat-num">{importStats.total}</span>
              <span className="stat-name">Total Rows</span>
            </div>
            <div className="stat-box status-completed">
              <span className="stat-num">{importStats.valid}</span>
              <span className="stat-name">Valid</span>
            </div>
            <div className="stat-box status-failed">
              <span className="stat-num">{importStats.invalid}</span>
              <span className="stat-name">Invalid</span>
            </div>
            <div className="stat-box status-warning">
              <span className="stat-num">{importStats.duplicates}</span>
              <span className="stat-name">Duplicates</span>
            </div>
          </div>

          <div className="action-row">
            <button
              onClick={() => {
                setImportStats(null);
                setFile(null);
                setCsvContent('');
                setDetectStats(null);
              }}
              className="btn btn-secondary"
            >
              Upload New
            </button>
            <button
              onClick={handleStartTriage}
              disabled={loading || importStats.valid === 0}
              className="btn btn-success"
            >
              Start AI Triage ({importStats.valid} pending)
            </button>
          </div>
        </div>
      )}

      {/* Triage Progress Panel */}
      {triageStatus && triageStatus.status !== 'idle' && (
        <div className="triage-progress-panel">
          <div className="progress-header">
            <div className="status-indicator">
              <span className={`status-badge status-${triageStatus.status}`}>
                {triageStatus.status.toUpperCase()}
              </span>
              <h3>AI Triage Progress</h3>
            </div>
            <span className="progress-text">
              Processed: {triageStatus.processed} / {triageStatus.total}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="progress-bar-container">
            <div
              className={`progress-bar-fill ${triageStatus.status === 'running' ? 'animated' : ''}`}
              style={{ width: `${progressPercent}%` }}
            >
              <span className="progress-val-bubble">{progressPercent}%</span>
            </div>
          </div>

          {/* Status Breakdown Grid */}
          <div className="stats-grid">
            <div className="stat-box">
              <span className="stat-num">{triageStatus.pending}</span>
              <span className="stat-name">Pending</span>
            </div>
            <div className="stat-box status-processing">
              <span className="stat-num">{triageStatus.processing}</span>
              <span className="stat-name">Processing</span>
            </div>
            <div className="stat-box status-completed">
              <span className="stat-num">{triageStatus.completed}</span>
              <span className="stat-name">Completed</span>
            </div>
            <div className="stat-box status-human">
              <span className="stat-num">{triageStatus.humanReview}</span>
              <span className="stat-name">Human Review</span>
            </div>
            <div className="stat-box status-failed">
              <span className="stat-num">{triageStatus.failed}</span>
              <span className="stat-name">Failed</span>
            </div>
            <div className="stat-box status-invalid">
              <span className="stat-num">{triageStatus.invalid}</span>
              <span className="stat-name">Invalid</span>
            </div>
          </div>

          {/* Controls */}
          <div className="control-row">
            {triageStatus.status === 'running' && (
              <>
                <button onClick={handlePauseTriage} className="btn btn-warning">
                  Pause Processing
                </button>
                <button onClick={handleStopTriage} className="btn btn-danger">
                  Stop Processing
                </button>
              </>
            )}
            {(triageStatus.status === 'paused' || triageStatus.status === 'stopped') && (
              <button onClick={handleStartTriage} className="btn btn-success">
                Resume AI Triage
              </button>
            )}
            {triageStatus.status === 'completed' && (
              <button
                onClick={() => {
                  setImportStats(null);
                  setTriageStatus(null);
                  setFile(null);
                  setCsvContent('');
                  setDetectStats(null);
                }}
                className="btn btn-primary"
              >
                Triage Completed! Import Another
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
