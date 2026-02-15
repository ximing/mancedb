import { useEffect, useState } from 'react';
import { view, useService } from '@rabjs/react';
import { DatabaseService } from '../../../services/database.service';
import type { FilterOperator, FilterCondition } from '../../../api/table-data';

// Type for row ID
type RowId = string | number;

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

const FilterIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
  </svg>
);

const SearchIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const WarningIcon = () => (
  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
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

interface FilterPanelProps {
  columns: Array<{ name: string; type: string }>;
  filters: FilterCondition[];
  onAddFilter: (filter: FilterCondition) => void;
  onRemoveFilter: (column: string, operator: FilterOperator) => void;
  onClearFilters: () => void;
  onApplyFilters: () => void;
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

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  affectedCount: number;
  isLoading: boolean;
  error: string | null;
}

const DeleteConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  affectedCount,
  isLoading,
  error,
}: DeleteConfirmationModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-dark-800 rounded-xl shadow-xl max-w-md w-full">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 dark:border-dark-700">
          <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
            <WarningIcon />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-gray-600 dark:text-dark-300">{message}</p>
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-400">
              This will permanently delete <strong>{affectedCount.toLocaleString()}</strong> row{affectedCount !== 1 ? 's' : ''}.
              This action cannot be undone.
            </p>
          </div>
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-dark-700">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-dark-300 rounded-lg hover:bg-gray-200 dark:hover:bg-dark-600 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <TrashIcon />
                <span>Delete</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Filter Panel Component
 */
const FilterPanel = ({ columns, filters, onAddFilter, onRemoveFilter, onClearFilters, onApplyFilters }: FilterPanelProps) => {
  const [selectedColumn, setSelectedColumn] = useState('');
  const [selectedOperator, setSelectedOperator] = useState<FilterOperator>('contains');
  const [filterValue, setFilterValue] = useState('');

  const getColumnType = (columnName: string): string => {
    const col = columns.find(c => c.name === columnName);
    return col?.type || 'string';
  };

  const isNumericType = (type: string): boolean => {
    return type.includes('int') || type.includes('float') || type.includes('double') || type === 'number';
  };

  const isDateType = (type: string): boolean => {
    return type.includes('timestamp') || type.includes('date');
  };

  const getAvailableOperators = (columnName: string): Array<{ value: FilterOperator; label: string }> => {
    const type = getColumnType(columnName);

    if (isNumericType(type) || isDateType(type)) {
      return [
        { value: 'eq', label: '=' },
        { value: 'gt', label: '>' },
        { value: 'gte', label: '>=' },
        { value: 'lt', label: '<' },
        { value: 'lte', label: '<=' },
      ];
    }

    // Default for string/text types
    return [
      { value: 'contains', label: 'Contains' },
      { value: 'eq', label: 'Equals' },
    ];
  };

  const handleAddFilter = () => {
    if (!selectedColumn || !filterValue) return;

    const type = getColumnType(selectedColumn);
    let value: string | number = filterValue;

    // Convert to number for numeric types
    if (isNumericType(type)) {
      const num = parseFloat(filterValue);
      if (!isNaN(num)) {
        value = num;
      }
    }

    onAddFilter({
      column: selectedColumn,
      operator: selectedOperator,
      value,
    });

    // Reset value input but keep column/operator for convenience
    setFilterValue('');
  };

  const getFilterDisplayLabel = (filter: FilterCondition): string => {
    const operators: Record<FilterOperator, string> = {
      contains: 'contains',
      eq: '=',
      gt: '>',
      gte: '>=',
      lt: '<',
      lte: '<=',
    };
    return `${filter.column} ${operators[filter.operator]} "${filter.value}"`;
  };

  return (
    <div className="bg-gray-50 dark:bg-dark-700/50 rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-dark-300">
        <FilterIcon />
        <span>Filter Data</span>
        {filters.length > 0 && (
          <span className="px-2 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded-full text-xs">
            {filters.length}
          </span>
        )}
      </div>

      {/* Active Filters */}
      {filters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.map((filter, index) => (
            <span
              key={`${filter.column}-${filter.operator}-${index}`}
              className="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-dark-700 border border-gray-200 dark:border-dark-600 rounded-md text-sm text-gray-700 dark:text-dark-300"
            >
              {getFilterDisplayLabel(filter)}
              <button
                onClick={() => onRemoveFilter(filter.column, filter.operator)}
                className="p-0.5 hover:bg-gray-100 dark:hover:bg-dark-600 rounded"
              >
                <XIcon />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Add Filter */}
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs text-gray-500 dark:text-dark-400 mb-1">Column</label>
          <select
            value={selectedColumn}
            onChange={(e) => {
              setSelectedColumn(e.target.value);
              // Reset operator when column changes
              setSelectedOperator('contains');
            }}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-700 text-sm text-gray-700 dark:text-dark-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">Select column...</option>
            {columns.map(col => (
              <option key={col.name} value={col.name}>{col.name}</option>
            ))}
          </select>
        </div>

        {selectedColumn && (
          <div className="w-32">
            <label className="block text-xs text-gray-500 dark:text-dark-400 mb-1">Operator</label>
            <select
              value={selectedOperator}
              onChange={(e) => setSelectedOperator(e.target.value as FilterOperator)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-700 text-sm text-gray-700 dark:text-dark-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              {getAvailableOperators(selectedColumn).map(op => (
                <option key={op.value} value={op.value}>{op.label}</option>
              ))}
            </select>
          </div>
        )}

        {selectedColumn && (
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs text-gray-500 dark:text-dark-400 mb-1">Value</label>
            <div className="relative">
              <input
                type={isNumericType(getColumnType(selectedColumn)) ? 'number' : 'text'}
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddFilter();
                  }
                }}
                placeholder="Enter value..."
                className="w-full px-3 py-2 pl-9 rounded-lg border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-700 text-sm text-gray-700 dark:text-dark-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <SearchIcon />
              </div>
            </div>
          </div>
        )}

        {selectedColumn && (
          <button
            onClick={handleAddFilter}
            disabled={!filterValue}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Add
          </button>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-dark-600">
        <button
          onClick={onApplyFilters}
          disabled={filters.length === 0}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Apply Filters
        </button>
        {filters.length > 0 && (
          <button
            onClick={onClearFilters}
            className="flex items-center gap-1 px-3 py-2 text-gray-600 dark:text-dark-400 hover:text-red-600 dark:hover:text-red-400 text-sm transition-colors"
          >
            <TrashIcon />
            Clear All
          </button>
        )}
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
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteMode, setDeleteMode] = useState<'selected' | 'filtered'>('selected');

  const {
    tableData,
    currentSchema,
    sortColumn,
    sortOrder,
    filters,
    selectedRowIds,
    selectedRowCount,
    isDeletingRows,
    rowDeleteError,
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

  const handleAddFilter = (filter: FilterCondition) => {
    databaseService.addFilter(filter);
  };

  const handleRemoveFilter = (column: string, operator: FilterOperator) => {
    databaseService.removeFilter(column, operator);
  };

  const handleClearFilters = () => {
    databaseService.clearFilters();
    databaseService.applyFilters();
  };

  const handleApplyFilters = () => {
    databaseService.applyFilters();
  };

  // Get column names from schema or data
  const columns = currentSchema?.columns.map(col => col.name) ??
    (tableData.rows.length > 0 ? Object.keys(tableData.rows[0]) : []);

  // Get column info for filter panel
  const columnInfo = currentSchema?.columns.map(col => ({
    name: col.name,
    type: col.type,
  })) ?? [];

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

  // Get row ID from row data (try common ID fields)
  const getRowId = (row: Record<string, unknown>): RowId => {
    // Try common ID field names
    const idFields = ['id', 'ID', 'Id', '_id', 'row_id', 'uuid', 'pk'];
    for (const field of idFields) {
      if (row[field] !== undefined && row[field] !== null) {
        return row[field] as RowId;
      }
    }
    // Fallback: use row index as string
    return String(row['__row_index'] ?? Math.random());
  };

  // Get current page row IDs
  const currentPageRowIds = tableData.rows.map(getRowId);

  // Check if all rows on current page are selected
  const areAllCurrentRowsSelected = currentPageRowIds.length > 0 &&
    currentPageRowIds.every(id => selectedRowIds.has(id));

  // Handle select all checkbox
  const handleSelectAll = () => {
    if (areAllCurrentRowsSelected) {
      databaseService.deselectAllRowsOnPage(currentPageRowIds);
    } else {
      databaseService.selectAllRowsOnPage(currentPageRowIds);
    }
  };

  // Open delete modal for selected rows
  const openDeleteSelectedModal = () => {
    if (selectedRowCount === 0) return;
    setDeleteMode('selected');
    setIsDeleteModalOpen(true);
    databaseService.clearRowDeleteMessages();
  };

  // Open delete modal for filtered rows
  const openDeleteFilteredModal = () => {
    if (filters.length === 0) return;
    setDeleteMode('filtered');
    setIsDeleteModalOpen(true);
    databaseService.clearRowDeleteMessages();
  };

  // Close delete modal
  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    databaseService.clearRowDeleteMessages();
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (deleteMode === 'selected') {
      await databaseService.deleteSelectedRows(tableName);
    } else {
      await databaseService.deleteRowsByFilter(tableName);
    }
    // Close modal if successful (no error)
    if (!databaseService.rowDeleteError) {
      setIsDeleteModalOpen(false);
    }
  };

  // Get affected count for delete modal
  const getAffectedCount = () => {
    if (deleteMode === 'selected') {
      return selectedRowCount;
    }
    return tableData.totalCount;
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
                {filters.length > 0 && (
                  <span className="ml-2 text-primary-600 dark:text-primary-400">
                    (filtered by {filters.length} condition{filters.length > 1 ? 's' : ''})
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Delete selected button */}
            {selectedRowCount > 0 && (
              <button
                onClick={openDeleteSelectedModal}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
              >
                <TrashIcon />
                <span>Delete {selectedRowCount} selected</span>
              </button>
            )}
            {/* Delete filtered button */}
            {filters.length > 0 && (
              <button
                onClick={openDeleteFilteredModal}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/50 transition-colors"
              >
                <TrashIcon />
                <span>Delete filtered ({tableData.totalCount.toLocaleString()})</span>
              </button>
            )}
            {/* Filter toggle button */}
            <button
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                showFilterPanel || filters.length > 0
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                  : 'text-gray-700 dark:text-dark-300 hover:bg-gray-100 dark:hover:bg-dark-700'
              }`}
            >
              <FilterIcon />
              <span>Filter</span>
              {filters.length > 0 && (
                <span className="px-1.5 py-0.5 bg-primary-600 text-white rounded-full text-xs">
                  {filters.length}
                </span>
              )}
            </button>
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

      {/* Filter Panel */}
      {showFilterPanel && (
        <FilterPanel
          columns={columnInfo}
          filters={filters}
          onAddFilter={handleAddFilter}
          onRemoveFilter={handleRemoveFilter}
          onClearFilters={handleClearFilters}
          onApplyFilters={handleApplyFilters}
        />
      )}

      {/* Data Table */}
      <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-dark-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-dark-700/50">
              <tr>
                {/* Select all checkbox column */}
                <th className="px-4 py-3 text-left w-10">
                  <input
                    type="checkbox"
                    checked={areAllCurrentRowsSelected}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                    title={areAllCurrentRowsSelected ? "Deselect all on this page" : "Select all on this page"}
                  />
                </th>
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
                    colSpan={columns.length + 3}
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
                  const rowId = getRowId(row);
                  const isSelected = databaseService.isRowSelected(rowId);
                  return (
                    <tr
                      key={rowIndex}
                      className={`hover:bg-gray-50 dark:hover:bg-dark-700/50 transition-colors cursor-pointer ${
                        isSelected ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                      }`}
                      onClick={() => handleRowClick(row)}
                    >
                      {/* Checkbox cell */}
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            databaseService.toggleRowSelection(rowId);
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                        />
                      </td>
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

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        onConfirm={handleDeleteConfirm}
        title={deleteMode === 'selected' ? 'Delete Selected Rows' : 'Delete Filtered Rows'}
        message={
          deleteMode === 'selected'
            ? `Are you sure you want to delete the ${selectedRowCount} selected row${selectedRowCount !== 1 ? 's' : ''}?`
            : 'Are you sure you want to delete all rows matching the current filters?'
        }
        affectedCount={getAffectedCount()}
        isLoading={isDeletingRows}
        error={rowDeleteError}
      />
    </div>
  );
});
