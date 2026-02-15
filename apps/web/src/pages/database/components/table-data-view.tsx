import { useEffect, useState } from 'react';
import { view, useService } from '@rabjs/react';
import { DatabaseService } from '../../../services/database.service';

// Icons
const TableIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const RefreshIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const RowsIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
  </svg>
);

const ChevronLeftIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const ChevronUpIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const EyeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const XIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

interface TableDataViewProps {
  tableName: string;
}

interface RowDetailModalProps {
  row: Record<string, unknown> | null;
  isOpen: boolean;
  onClose: () => void;
}

const RowDetailModal = ({ row, isOpen, onClose }: RowDetailModalProps) => {
  if (!isOpen || !row) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-dark-800 rounded-xl shadow-xl max-w-3xl w-full max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-dark-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Row Details</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-dark-400 dark:hover:text-dark-200 hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
          >
            <XIcon />
          </button>
        </div>
        <div className="p-6 overflow-auto">
          <pre className="text-sm text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-dark-900 p-4 rounded-lg overflow-auto">
            {JSON.stringify(row, null, 2)}
          </pre>
        </div>
        <div className="flex justify-end px-6 py-4 border-t border-gray-200 dark:border-dark-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-dark-300 rounded-lg hover:bg-gray-200 dark:hover:bg-dark-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
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

export const TableDataView = view(({ tableName }: TableDataViewProps) => {
  const databaseService = useService(DatabaseService);
  const [selectedRow, setSelectedRow] = useState<Record<string, unknown> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const {
    tableData,
    currentSchema,
    sortColumn,
    sortOrder,
  } = databaseService;

  // Load data on mount
  useEffect(() => {
    databaseService.loadTableData();
  }, [tableName, databaseService]);

  const handlePageChange = (page: number) => {
    databaseService.changePage(page);
  };

  const handlePageSizeChange = (pageSize: number) => {
    databaseService.changePageSize(pageSize);
  };

  const handleSort = (column: string) => {
    databaseService.toggleSort(column);
  };

  const handleRowClick = (row: Record<string, unknown>) => {
    setSelectedRow(row);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedRow(null);
  };

  // Get column names from schema or data
  const columns = currentSchema?.columns.map(col => col.name) ??
    (tableData.rows.length > 0 ? Object.keys(tableData.rows[0]) : []);

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const totalPages = tableData.totalPages;
    const currentPage = tableData.page;

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  if (tableData.isLoading && tableData.rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (tableData.error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-red-800 dark:text-red-400 mb-2">Error Loading Data</h3>
        <p className="text-red-600 dark:text-red-400">{tableData.error}</p>
        <button
          onClick={() => databaseService.refreshTableData()}
          className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-dark-700 p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg text-primary-600 dark:text-primary-400">
              <TableIcon />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{tableName}</h2>
              <p className="text-sm text-gray-500 dark:text-dark-400">
                {tableData.totalCount.toLocaleString()} rows total
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Page size selector */}
            <select
              value={tableData.pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="px-3 py-2 rounded-lg border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-700 text-sm text-gray-700 dark:text-dark-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
              <option value={200}>200 / page</option>
            </select>
            <button
              onClick={() => databaseService.refreshTableData()}
              disabled={tableData.isLoading}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-dark-300 hover:bg-gray-100 dark:hover:bg-dark-700 disabled:opacity-50 transition-colors"
            >
              <RefreshIcon />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-dark-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-dark-700/50">
              <tr>
                {/* Row number column */}
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-400 uppercase tracking-wider w-16">
                  #
                </th>
                {columns.map((column) => (
                  <th
                    key={column}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
                    onClick={() => handleSort(column)}
                  >
                    <div className="flex items-center gap-1">
                      <span>{column}</span>
                      {sortColumn === column && (
                        sortOrder === 'asc' ? <ChevronUpIcon /> : <ChevronDownIcon />
                      )}
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-400 uppercase tracking-wider w-20">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-dark-700">
              {tableData.rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + 2}
                    className="px-6 py-12 text-center text-gray-500 dark:text-dark-400"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <RowsIcon />
                      <p>No data available</p>
                    </div>
                  </td>
                </tr>
              ) : (
                tableData.rows.map((row, rowIndex) => {
                  const rowNumber = (tableData.page - 1) * tableData.pageSize + rowIndex + 1;
                  return (
                    <tr
                      key={rowIndex}
                      className="hover:bg-gray-50 dark:hover:bg-dark-700/50 transition-colors cursor-pointer"
                      onClick={() => handleRowClick(row)}
                    >
                      <td className="px-4 py-3 text-sm text-gray-400 dark:text-dark-500">
                        {rowNumber}
                      </td>
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
                      <td className="px-4 py-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRowClick(row);
                          }}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-primary-600 hover:bg-primary-50 dark:text-dark-400 dark:hover:text-primary-400 dark:hover:bg-primary-900/20 transition-colors"
                          title="View details"
                        >
                          <EyeIcon />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {tableData.totalPages > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 dark:border-dark-700 flex items-center justify-between">
            <div className="text-sm text-gray-500 dark:text-dark-400">
              Showing {(tableData.page - 1) * tableData.pageSize + 1} to{' '}
              {Math.min(tableData.page * tableData.pageSize, tableData.totalCount)} of{' '}
              {tableData.totalCount.toLocaleString()} rows
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handlePageChange(tableData.page - 1)}
                disabled={tableData.page <= 1}
                className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-dark-400 dark:hover:text-dark-200 hover:bg-gray-100 dark:hover:bg-dark-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeftIcon />
              </button>
              {getPageNumbers().map((page, index) => (
                page === '...' ? (
                  <span key={`ellipsis-${index}`} className="px-2 text-gray-400 dark:text-dark-500">...</span>
                ) : (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page as number)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      tableData.page === page
                        ? 'bg-primary-600 text-white'
                        : 'text-gray-700 dark:text-dark-300 hover:bg-gray-100 dark:hover:bg-dark-700'
                    }`}
                  >
                    {page}
                  </button>
                )
              ))}
              <button
                onClick={() => handlePageChange(tableData.page + 1)}
                disabled={tableData.page >= tableData.totalPages}
                className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-dark-400 dark:hover:text-dark-200 hover:bg-gray-100 dark:hover:bg-dark-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRightIcon />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Row Detail Modal */}
      <RowDetailModal
        row={selectedRow}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
});
