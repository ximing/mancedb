import { useEffect } from 'react';
import { view, useService } from '@rabjs/react';
import { DatabaseService } from '../../services/database.service';

// Icons
const DatabaseIcon = () => (
  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
  </svg>
);

const TableIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const FolderIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
  </svg>
);

const CloudIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
  </svg>
);

const RowsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
  </svg>
);

export const DatabaseBrowserPage = view(() => {
  const databaseService = useService(DatabaseService);

  useEffect(() => {
    // Load database info on mount if not already loaded
    if (!databaseService.databaseInfo && !databaseService.isLoading) {
      databaseService.loadDatabaseInfo();
    }
  }, [databaseService]);

  const { databaseInfo, tables, isLoading, error } = databaseService;

  if (isLoading && !databaseInfo) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-red-800 dark:text-red-400 mb-2">Error Loading Database</h3>
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <button
          onClick={() => databaseService.refresh()}
          className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Database Overview Card */}
      <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-dark-700 p-6">
        <div className="flex items-start gap-4">
          <div className="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-xl text-primary-600 dark:text-primary-400">
            <DatabaseIcon />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {databaseInfo?.name || 'Database'}
            </h2>
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-dark-400">
              <span className="flex items-center gap-1">
                {databaseInfo?.type === 'local' ? <FolderIcon /> : <CloudIcon />}
                {databaseInfo?.type === 'local' ? 'Local Storage' : 'S3 Storage'}
              </span>
              <span>•</span>
              <span className="truncate max-w-md">{databaseInfo?.path}</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <div className="bg-gray-50 dark:bg-dark-700/50 rounded-lg p-4">
            <p className="text-sm text-gray-500 dark:text-dark-400 mb-1">Total Tables</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {databaseInfo?.tableCount || 0}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-dark-700/50 rounded-lg p-4">
            <p className="text-sm text-gray-500 dark:text-dark-400 mb-1">Total Rows</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {tables.reduce((sum, t) => sum + t.rowCount, 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-dark-700/50 rounded-lg p-4">
            <p className="text-sm text-gray-500 dark:text-dark-400 mb-1">Storage Type</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white capitalize">
              {databaseInfo?.type || 'Unknown'}
            </p>
          </div>
        </div>
      </div>

      {/* Tables Grid */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Tables ({tables.length})
        </h3>

        {tables.length === 0 ? (
          <div className="bg-gray-50 dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-xl p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-dark-700 text-gray-400 dark:text-dark-500 mb-4">
              <TableIcon />
            </div>
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Tables Found</h4>
            <p className="text-gray-500 dark:text-dark-400 max-w-md mx-auto">
              This database doesn&apos;t have any tables yet. Tables will appear here once they are created.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tables.map((table) => (
              <button
                key={table.name}
                onClick={() => databaseService.selectTable(table.name)}
                className={`text-left bg-white dark:bg-dark-800 border rounded-xl p-5 transition-all hover:shadow-md ${
                  databaseService.selectedTable === table.name
                    ? 'border-primary-500 dark:border-primary-400 ring-1 ring-primary-500 dark:ring-primary-400'
                    : 'border-gray-200 dark:border-dark-700 hover:border-gray-300 dark:hover:border-dark-600'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-gray-100 dark:bg-dark-700 rounded-lg text-gray-600 dark:text-dark-300">
                    <TableIcon />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                      {table.name}
                    </h4>
                    <div className="flex items-center gap-2 mt-2 text-sm text-gray-500 dark:text-dark-400">
                      <RowsIcon />
                      <span>{table.rowCount.toLocaleString()} rows</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Getting Started Hint */}
      {tables.length > 0 && !databaseService.selectedTable && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
          <h4 className="font-semibold text-blue-900 dark:text-blue-400 mb-2">
            Getting Started
          </h4>
          <p className="text-blue-700 dark:text-blue-300 text-sm">
            Select a table from the list above or from the sidebar to view its schema and data.
            You can also use SQL queries to explore your data.
          </p>
        </div>
      )}
    </div>
  );
});
