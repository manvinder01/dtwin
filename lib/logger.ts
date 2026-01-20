// In-memory log storage for the current session
export interface LogEntry {
  id: string;
  timestamp: number;
  level: 'info' | 'success' | 'warning' | 'error';
  category: 'cache' | 'retrieval' | 'llm' | 'gdrive' | 'system';
  message: string;
  details?: Record<string, any>;
}

const MAX_LOGS = 500;
const logs: LogEntry[] = [];
const listeners: Set<(log: LogEntry) => void> = new Set();

export function addLog(
  level: LogEntry['level'],
  category: LogEntry['category'],
  message: string,
  details?: Record<string, any>
): LogEntry {
  const entry: LogEntry = {
    id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
    timestamp: Date.now(),
    level,
    category,
    message,
    details,
  };

  logs.push(entry);

  // Keep only the last MAX_LOGS entries
  if (logs.length > MAX_LOGS) {
    logs.shift();
  }

  // Notify listeners
  listeners.forEach((listener) => listener(entry));

  // Also log to console
  const prefix = `[${category.toUpperCase()}]`;
  const consoleMsg = `${prefix} ${message}`;
  switch (level) {
    case 'error':
      console.error(consoleMsg, details || '');
      break;
    case 'warning':
      console.warn(consoleMsg, details || '');
      break;
    default:
      console.log(consoleMsg, details || '');
  }

  return entry;
}

export function getLogs(limit?: number, category?: LogEntry['category']): LogEntry[] {
  let result = [...logs];

  if (category) {
    result = result.filter((log) => log.category === category);
  }

  if (limit) {
    result = result.slice(-limit);
  }

  return result;
}

export function clearLogs(): void {
  logs.length = 0;
}

export function subscribe(listener: (log: LogEntry) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Convenience methods
export const logger = {
  cache: {
    hit: (prompt: string, details?: Record<string, any>) =>
      addLog('success', 'cache', `Cache HIT for: "${prompt.substring(0, 50)}..."`, details),
    miss: (prompt: string, details?: Record<string, any>) =>
      addLog('info', 'cache', `Cache MISS for: "${prompt.substring(0, 50)}..."`, details),
    store: (prompt: string, details?: Record<string, any>) =>
      addLog('info', 'cache', `Stored in cache: "${prompt.substring(0, 50)}..."`, details),
    error: (message: string, details?: Record<string, any>) =>
      addLog('error', 'cache', message, details),
  },
  retrieval: {
    search: (query: string, details?: Record<string, any>) =>
      addLog('info', 'retrieval', `Searching for: "${query.substring(0, 50)}..."`, details),
    found: (count: number, details?: Record<string, any>) =>
      addLog('success', 'retrieval', `Found ${count} relevant chunks`, details),
    chunk: (filename: string, score: number, preview: string) =>
      addLog('info', 'retrieval', `Chunk from ${filename} (score: ${score.toFixed(4)})`, { preview: preview.substring(0, 100) }),
  },
  llm: {
    start: (model: string, details?: Record<string, any>) =>
      addLog('info', 'llm', `Calling ${model}...`, details),
    complete: (model: string, tokens?: number) =>
      addLog('success', 'llm', `${model} response complete`, tokens ? { tokens } : undefined),
    error: (message: string, details?: Record<string, any>) =>
      addLog('error', 'llm', message, details),
  },
  gdrive: {
    info: (message: string, details?: Record<string, any>) =>
      addLog('info', 'gdrive', message, details),
    success: (message: string, details?: Record<string, any>) =>
      addLog('success', 'gdrive', message, details),
    error: (message: string, details?: Record<string, any>) =>
      addLog('error', 'gdrive', message, details),
  },
  system: {
    info: (message: string, details?: Record<string, any>) =>
      addLog('info', 'system', message, details),
    error: (message: string, details?: Record<string, any>) =>
      addLog('error', 'system', message, details),
  },
};
