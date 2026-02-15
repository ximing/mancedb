import { view, useService } from '@rabjs/react';
import { DatabaseService } from '../../../services/database.service';
import { DatabaseBrowserPage } from '../database-browser';
import { TableSchemaView } from './table-schema';
import { TableDataView } from './table-data-view';
import { SqlQueryView } from './sql-query-view';

// Icons
const SchemaIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
  </svg>
);

const DataIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const QueryIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const DatabaseIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
  </svg>
);

const BackIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

export const DatabaseContent = view(() => {
  const databaseService = useService(DatabaseService);

  // If a table is selected, show the table view with tabs
  if (databaseService.selectedTable) {
    return (
      <div className="space-y-4">
        {/* Tab Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => databaseService.selectTable(null)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-dark-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
            >
              <BackIcon />
              <span>Back</span>
            </button>
            <div className="h-6 w-px bg-gray-200 dark:bg-dark-700 mx-2" />
            <div className="flex bg-gray-100 dark:bg-dark-700/50 rounded-lg p-1">
              <button
                onClick={() => databaseService.setActiveTab('schema')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  databaseService.activeTab === 'schema'
                    ? 'bg-white dark:bg-dark-600 text-primary-600 dark:text-primary-400 shadow-sm'
                    : 'text-gray-600 dark:text-dark-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <SchemaIcon />
                <span>Schema</span>
              </button>
              <button
                onClick={() => databaseService.setActiveTab('data')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  databaseService.activeTab === 'data'
                    ? 'bg-white dark:bg-dark-600 text-primary-600 dark:text-primary-400 shadow-sm'
                    : 'text-gray-600 dark:text-dark-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <DataIcon />
                <span>Data</span>
              </button>
              <button
                onClick={() => databaseService.setActiveTab('query')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  databaseService.activeTab === 'query'
                    ? 'bg-white dark:bg-dark-600 text-primary-600 dark:text-primary-400 shadow-sm'
                    : 'text-gray-600 dark:text-dark-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <QueryIcon />
                <span>SQL</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        {databaseService.activeTab === 'schema' ? (
          <TableSchemaView tableName={databaseService.selectedTable} />
        ) : databaseService.activeTab === 'data' ? (
          <TableDataView tableName={databaseService.selectedTable} />
        ) : (
          <SqlQueryView />
        )}
      </div>
    );
  }

  // When no table is selected, show database browser with SQL tab option
  return (
    <div className="space-y-4">
      {/* Tab Navigation for Database Browser */}
      <div className="flex items-center justify-between">
        <div className="flex bg-gray-100 dark:bg-dark-700/50 rounded-lg p-1">
          <button
            onClick={() => databaseService.setActiveTab('schema')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              databaseService.activeTab === 'schema'
                ? 'bg-white dark:bg-dark-600 text-primary-600 dark:text-primary-400 shadow-sm'
                : 'text-gray-600 dark:text-dark-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <DatabaseIcon />
            <span>Overview</span>
          </button>
          <button
            onClick={() => databaseService.setActiveTab('query')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              databaseService.activeTab === 'query'
                ? 'bg-white dark:bg-dark-600 text-primary-600 dark:text-primary-400 shadow-sm'
                : 'text-gray-600 dark:text-dark-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <QueryIcon />
            <span>SQL Query</span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {databaseService.activeTab === 'query' ? (
        <SqlQueryView />
      ) : (
        <DatabaseBrowserPage />
      )}
    </div>
  );
});
