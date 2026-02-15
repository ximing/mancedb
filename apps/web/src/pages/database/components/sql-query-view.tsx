import { useEffect, useState } from 'react';
import { view, useService } from '@rabjs/react';
import { DatabaseService } from '../../../services/database.service';
import type { QueryHistoryEntry } from '../../../api/query';

// Icons
const QueryIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const PlayIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const HistoryIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const FormatIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
  </svg>
);

const ClearIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const RowsIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const FileCsvIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const FileJsonIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
  </svg>
);

const ErrorIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const DatabaseIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
  </svg>
);

/**
 * Convert query results to CSV format
 */
const convertToCsv = (rows: Record<string, unknown>[]): string => {
  if (rows.length === 0) return '';

  const columns = Object.keys(rows[0]);

  // Header row
  const header = columns.join(',');

  // Data rows
  const dataRows = rows.map(row => {
    return columns.map(col => {
      const value = row[col];
      if (value === null || value === undefined) {
        return '';
      }
      const str = String(value);
      // Escape values that contain commas, quotes, or newlines
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',');
  });

  return [header, ...dataRows].join('\n');
};

/**
 * Download data as a file
 */
const downloadFile = (content: string, filename: string, mimeType: string): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Format cell value for display
 */
const formatCellValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  if (typeof value === 'string') {
    // Check if it's a vector summary like "[1536-dim vector]"
    if (value.startsWith('[') && value.includes('vector')) {
      return value;
    }
    // Truncate long strings
    if (value.length > 100) {
      return value.substring(0, 100) + '...';
    }
    return value;
  }
  if (typeof value === 'number') {
    return value.toString();
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    return `[${value.length} items]`;
  }
  if (typeof value === 'object') {
    return JSON.stringify(value).substring(0, 50);
  }
  return String(value);
};

/**
 * Get cell style based on value type
 */
const getCellStyle = (value: unknown): string => {
  if (value === null || value === undefined) {
    return 'text-gray-400 dark:text-dark-500 italic';
  }
  if (typeof value === 'string' && value.startsWith('[') && value.includes('vector')) {
    return 'text-orange-600 dark:text-orange-400 font-medium';
  }
  if (typeof value === 'string' && value.startsWith('[') && value.includes('bytes')) {
    return 'text-gray-500 dark:text-dark-400';
  }
  if (typeof value === 'number') {
    return 'text-blue-600 dark:text-blue-400 text-right';
  }
  if (typeof value === 'boolean') {
    return 'text-purple-600 dark:text-purple-400';
  }
  return 'text-gray-900 dark:text-white';
};

/**
 * Format timestamp to relative time
 */
const formatRelativeTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
};

/**
 * SQL Query History Panel
 */
const QueryHistoryPanel = ({
  history,
  isLoading,
  onSelectQuery,
}: {
  history: QueryHistoryEntry[];
  isLoading: boolean;
  onSelectQuery: (entry: QueryHistoryEntry) => void;
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-dark-400">
        <HistoryIcon />
        <p className="mt-2 text-sm">No query history yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {history.map((entry) => (
        <button
          key={entry.id}
          onClick={() => onSelectQuery(entry)}
          className="w-full text-left p-3 rounded-lg bg-gray-50 dark:bg-dark-700/50 hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors group"
        >
          <div className="flex items-start justify-between gap-2">
            <code className="text-xs text-gray-700 dark:text-dark-300 font-mono line-clamp-2 flex-1">
              {entry.sql}
            </code>
            <ChevronRightIcon />
          </div>
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-dark-400">
            <span className="flex items-center gap-1">
              <ClockIcon />
              {formatRelativeTime(entry.executedAt)}
            </span>
            {entry.executionTimeMs !== undefined && (
              <span className="flex items-center gap-1">
                <CheckIcon />
                {entry.executionTimeMs}ms
              </span>
            )}
            {entry.rowCount !== undefined && (
              <span className="flex items-center gap-1">
                <RowsIcon />
                {entry.rowCount} rows
              </span>
            )}
            {entry.error && (
              <span className="text-red-500">Error</span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
};

export const SqlQueryView = view(() => {
  const databaseService = useService(DatabaseService);
  const [showHistory, setShowHistory] = useState(false);
  const [copied, setCopied] = useState(false);

  const {
    sqlQuery,
    queryResult,
    queryHistory,
    isLoadingHistory,
    tables,
  } = databaseService;

  // Load query history on mount
  useEffect(() => {
    databaseService.loadQueryHistory();
  }, [databaseService]);

  const handleExecuteQuery = () => {
    databaseService.executeQuery();
  };

  const handleFormatSql = () => {
    databaseService.formatSql();
  };

  const handleClearQuery = () => {
    databaseService.setSqlQuery('');
    databaseService.clearQueryResults();
  };

  const handleSelectFromHistory = (entry: QueryHistoryEntry) => {
    databaseService.loadQueryFromHistory(entry);
    setShowHistory(false);
  };

  const handleCopyResults = () => {
    if (queryResult.rows.length > 0) {
      const json = JSON.stringify(queryResult.rows, null, 2);
      navigator.clipboard.writeText(json);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleExportCsv = () => {
    if (queryResult.rows.length > 0) {
      const csv = convertToCsv(queryResult.rows);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      downloadFile(csv, `query-result-${timestamp}.csv`, 'text/csv;charset=utf-8;');
    }
  };

  const handleExportJson = () => {
    if (queryResult.rows.length > 0) {
      const json = JSON.stringify(queryResult.rows, null, 2);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      downloadFile(json, `query-result-${timestamp}.json`, 'application/json');
    }
  };

  // Get column names from first row
  const columns = queryResult.rows.length > 0 ? Object.keys(queryResult.rows[0]) : [];

  // Sample queries based on available tables
  const sampleQueries = tables.slice(0, 3).map(table =>
    `SELECT * FROM ${table.name} LIMIT 10`
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-dark-700 p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg text-primary-600 dark:text-primary-400">
              <QueryIcon />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">SQL Query</h2>
              <p className="text-sm text-gray-500 dark:text-dark-400">
                Execute SQL queries against your database
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                showHistory
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                  : 'text-gray-700 dark:text-dark-300 hover:bg-gray-100 dark:hover:bg-dark-700'
              }`}
            >
              <HistoryIcon />
              <span>History</span>
            </button>
            <button
              onClick={handleFormatSql}
              disabled={!sqlQuery}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-dark-300 hover:bg-gray-100 dark:hover:bg-dark-700 disabled:opacity-50 transition-colors"
            >
              <FormatIcon />
              <span>Format</span>
            </button>
            <button
              onClick={handleClearQuery}
              disabled={!sqlQuery}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-dark-300 hover:bg-gray-100 dark:hover:bg-dark-700 disabled:opacity-50 transition-colors"
            >
              <ClearIcon />
              <span>Clear</span>
            </button>
          </div>
        </div>
      </div>

      {/* Query History Panel */}
      {showHistory && (
        <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-dark-700 p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <HistoryIcon />
            Recent Queries
          </h3>
          <QueryHistoryPanel
            history={queryHistory}
            isLoading={isLoadingHistory}
            onSelectQuery={handleSelectFromHistory}
          />
        </div>
      )}

      {/* SQL Editor */}
      <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-dark-700 overflow-hidden">
        <div className="border-b border-gray-200 dark:border-dark-700 px-4 py-2 bg-gray-50 dark:bg-dark-700/50 flex items-center justify-between">
          <span className="text-xs font-medium text-gray-500 dark:text-dark-400 uppercase tracking-wider">
            Editor
          </span>
          <span className="text-xs text-gray-400 dark:text-dark-500">
            Supports: SELECT, FROM, WHERE, ORDER BY, LIMIT
          </span>
        </div>
        <div className="p-4">
          <textarea
            value={sqlQuery}
            onChange={(e) => databaseService.setSqlQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleExecuteQuery();
              }
            }}
            placeholder="Enter your SQL query here...&#10;Example: SELECT * FROM table_name LIMIT 10"
            className="w-full h-32 px-4 py-3 rounded-lg border border-gray-200 dark:border-dark-600 bg-gray-50 dark:bg-dark-900 font-mono text-sm text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            spellCheck={false}
          />
          <div className="flex items-center justify-between mt-3">
            <div className="text-xs text-gray-400 dark:text-dark-500">
              Press Cmd/Ctrl + Enter to execute
            </div>
            <button
              onClick={handleExecuteQuery}
              disabled={queryResult.isLoading || !sqlQuery.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {queryResult.isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Executing...</span>
                </>
              ) : (
                <>
                  <PlayIcon />
                  <span>Execute Query</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Sample Queries */}
      {!sqlQuery && tables.length > 0 && (
        <div className="bg-gray-50 dark:bg-dark-700/30 rounded-xl border border-gray-200 dark:border-dark-700 p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <DatabaseIcon />
            Sample Queries
          </h3>
          <div className="space-y-2">
            {sampleQueries.map((query, index) => (
              <button
                key={index}
                onClick={() => databaseService.setSqlQuery(query)}
                className="w-full text-left p-2 rounded-lg bg-white dark:bg-dark-700 hover:bg-gray-100 dark:hover:bg-dark-600 transition-colors"
              >
                <code className="text-xs text-primary-600 dark:text-primary-400 font-mono">
                  {query}
                </code>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error Message */}
      {queryResult.error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="text-red-600 dark:text-red-400">
              <ErrorIcon />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-800 dark:text-red-400">Query Error</h3>
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">{queryResult.error}</p>
            </div>
            <button
              onClick={() => databaseService.clearQueryError()}
              className="text-red-400 hover:text-red-600 dark:hover:text-red-300"
            >
              <ClearIcon />
            </button>
          </div>
        </div>
      )}

      {/* Query Results */}
      {queryResult.rows.length > 0 && (
        <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-dark-700 overflow-hidden">
          {/* Results Header */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-dark-700 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-dark-300">
                <CheckIcon />
                <span className="font-medium">{queryResult.rowCount.toLocaleString()}</span> rows
              </span>
              <span className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-dark-400">
                <ClockIcon />
                {queryResult.executionTimeMs}ms
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCsv}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 dark:text-dark-300 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
                title="Export as CSV"
              >
                <FileCsvIcon />
                <span>CSV</span>
              </button>
              <button
                onClick={handleExportJson}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 dark:text-dark-300 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
                title="Export as JSON"
              >
                <FileJsonIcon />
                <span>JSON</span>
              </button>
              <div className="w-px h-4 bg-gray-300 dark:bg-dark-600 mx-1"></div>
              <button
                onClick={handleCopyResults}
                className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors px-2"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Results Table */}
          <div className="overflow-x-auto max-h-96">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-dark-700/50 sticky top-0">
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-400 uppercase tracking-wider whitespace-nowrap"
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-dark-700">
                {queryResult.rows.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className="hover:bg-gray-50 dark:hover:bg-dark-700/50 transition-colors"
                  >
                    {columns.map((column) => {
                      const value = row[column];
                      return (
                        <td
                          key={column}
                          className="px-4 py-3 text-sm whitespace-nowrap max-w-xs overflow-hidden text-ellipsis"
                        >
                          <span className={getCellStyle(value)}>
                            {formatCellValue(value)}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Results Footer */}
          {queryResult.rows.length > 100 && (
            <div className="px-4 py-2 border-t border-gray-200 dark:border-dark-700 text-xs text-gray-500 dark:text-dark-400 text-center">
              Showing first {queryResult.rows.length} rows. Use LIMIT to narrow results.
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!queryResult.isLoading && queryResult.rows.length === 0 && !queryResult.error && sqlQuery && (
        <div className="bg-gray-50 dark:bg-dark-700/30 rounded-xl border border-gray-200 dark:border-dark-700 p-8 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="p-3 bg-gray-100 dark:bg-dark-700 rounded-full">
              <RowsIcon />
            </div>
            <div>
              <p className="text-gray-700 dark:text-dark-300 font-medium">No results found</p>
              <p className="text-sm text-gray-500 dark:text-dark-400 mt-1">
                Your query returned 0 rows
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
