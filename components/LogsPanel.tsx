'use client';

import { useState, useEffect, useRef } from 'react';

interface LogEntry {
  id: string;
  timestamp: number;
  level: 'info' | 'success' | 'warning' | 'error';
  category: 'cache' | 'retrieval' | 'llm' | 'gdrive' | 'system';
  message: string;
  details?: Record<string, any>;
}

interface LogsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const categoryColors: Record<string, string> = {
  cache: 'bg-purple-100 text-purple-800',
  retrieval: 'bg-blue-100 text-blue-800',
  llm: 'bg-green-100 text-green-800',
  gdrive: 'bg-yellow-100 text-yellow-800',
  system: 'bg-gray-100 text-gray-800',
};

const levelIcons: Record<string, string> = {
  info: 'ℹ️',
  success: '✅',
  warning: '⚠️',
  error: '❌',
};

export function LogsPanel({ isOpen, onClose }: LogsPanelProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const fetchLogs = async () => {
    try {
      const url = filter === 'all' ? '/api/logs?limit=200' : `/api/logs?limit=200&category=${filter}`;
      const response = await fetch(url);
      const data = await response.json();
      setLogs(data.logs || []);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    }
  };

  const clearLogs = async () => {
    try {
      await fetch('/api/logs', { method: 'DELETE' });
      setLogs([]);
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen, filter]);

  useEffect(() => {
    if (isOpen && autoRefresh) {
      const interval = setInterval(fetchLogs, 2000);
      return () => clearInterval(interval);
    }
  }, [isOpen, autoRefresh, filter]);

  useEffect(() => {
    if (autoRefresh && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoRefresh]);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">System Logs</h2>
            <span className="text-sm text-gray-500">{logs.length} entries</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                autoRefresh
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
            </button>
            <button
              onClick={fetchLogs}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              onClick={clearLogs}
              className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
              title="Clear logs"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 p-3 border-b bg-gray-50">
          {['all', 'cache', 'retrieval', 'llm', 'gdrive', 'system'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                filter === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border'
              }`}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>

        {/* Logs */}
        <div className="flex-1 overflow-y-auto p-4 font-mono text-sm bg-gray-900">
          {logs.length === 0 ? (
            <div className="text-gray-500 text-center py-8">
              No logs yet. Start chatting to see activity.
            </div>
          ) : (
            <div className="space-y-1">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className={`group rounded px-2 py-1 hover:bg-gray-800 cursor-pointer ${
                    log.level === 'error' ? 'bg-red-900/20' : ''
                  }`}
                  onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-gray-500 flex-shrink-0">
                      {formatTime(log.timestamp)}
                    </span>
                    <span className="flex-shrink-0">{levelIcons[log.level]}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-xs font-medium flex-shrink-0 ${
                        categoryColors[log.category]
                      }`}
                    >
                      {log.category.toUpperCase()}
                    </span>
                    <span className={`flex-1 ${
                      log.level === 'error' ? 'text-red-400' :
                      log.level === 'success' ? 'text-green-400' :
                      log.level === 'warning' ? 'text-yellow-400' :
                      'text-gray-300'
                    }`}>
                      {log.message}
                    </span>
                    {log.details && (
                      <span className="text-gray-500 opacity-0 group-hover:opacity-100 text-xs">
                        {expandedLog === log.id ? '▼' : '▶'} details
                      </span>
                    )}
                  </div>
                  {expandedLog === log.id && log.details && (
                    <div className="mt-2 ml-20 p-2 bg-gray-800 rounded text-xs text-gray-400 overflow-x-auto">
                      <pre>{JSON.stringify(log.details, null, 2)}</pre>
                    </div>
                  )}
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t bg-gray-50 text-xs text-gray-500 flex justify-between">
          <span>Click on a log entry to see details</span>
          <span>Logs are stored in memory and cleared on server restart</span>
        </div>
      </div>
    </div>
  );
}
