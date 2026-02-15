import { useEffect, useState } from 'react';
import { view, useService } from '@rabjs/react';
import { DatabaseService } from '../../../services/database.service';
import type { ColumnType } from '../../../api/table-schema';

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

const SizeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
  </svg>
);

const StringIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
  </svg>
);

const NumberIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
  </svg>
);

const BooleanIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const VectorIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
  </svg>
);

const DateIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const BinaryIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
  </svg>
);

const DefaultIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const NullableIcon = () => (
  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const AlertIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

/**
 * Get icon and color for data type
 */
const getTypeStyle = (type: string): { icon: React.ReactNode; color: string; bgColor: string } => {
  const lowerType = type.toLowerCase();

  if (lowerType.includes('string') || lowerType.includes('utf8') || lowerType.includes('text')) {
    return { icon: <StringIcon />, color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-50 dark:bg-green-900/20' };
  }
  if (lowerType.includes('int') || lowerType.includes('float') || lowerType.includes('double') || lowerType.includes('number') || lowerType.includes('decimal')) {
    return { icon: <NumberIcon />, color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-900/20' };
  }
  if (lowerType.includes('bool')) {
    return { icon: <BooleanIcon />, color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-50 dark:bg-purple-900/20' };
  }
  if (lowerType.includes('vector')) {
    return { icon: <VectorIcon />, color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-50 dark:bg-orange-900/20' };
  }
  if (lowerType.includes('timestamp') || lowerType.includes('date') || lowerType.includes('time')) {
    return { icon: <DateIcon />, color: 'text-cyan-600 dark:text-cyan-400', bgColor: 'bg-cyan-50 dark:bg-cyan-900/20' };
  }
  if (lowerType.includes('binary')) {
    return { icon: <BinaryIcon />, color: 'text-gray-600 dark:text-gray-400', bgColor: 'bg-gray-50 dark:bg-gray-900/20' };
  }

  return { icon: <DefaultIcon />, color: 'text-gray-600 dark:text-gray-400', bgColor: 'bg-gray-50 dark:bg-gray-900/20' };
};

// Column type options for adding new columns
const COLUMN_TYPE_OPTIONS: { value: ColumnType; label: string; description: string }[] = [
  { value: 'string', label: 'String', description: 'UTF-8 text data' },
  { value: 'int64', label: 'Integer (64-bit)', description: 'Whole numbers' },
  { value: 'float64', label: 'Float (64-bit)', description: 'Decimal numbers' },
  { value: 'binary', label: 'Binary', description: 'Binary data' },
  { value: 'vector', label: 'Vector', description: 'Fixed-size list of floats' },
];

interface TableSchemaViewProps {
  tableName: string;
}

export const TableSchemaView = view(({ tableName }: TableSchemaViewProps) => {
  const databaseService = useService(DatabaseService);

  // Add column modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnType, setNewColumnType] = useState<ColumnType>('string');
  const [newColumnDimension, setNewColumnDimension] = useState<number>(1536);
  const [columnNameError, setColumnNameError] = useState<string | null>(null);

  // Delete column modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [columnToDelete, setColumnToDelete] = useState<string | null>(null);

  useEffect(() => {
    databaseService.loadTableSchema(tableName);
  }, [tableName, databaseService]);

  // Clear messages when modal opens/closes
  useEffect(() => {
    if (showAddModal || showDeleteModal) {
      databaseService.clearColumnMessages();
    }
  }, [showAddModal, showDeleteModal, databaseService]);

  const { currentSchema, isLoadingSchema, schemaError, formatBytes } = databaseService;

  const validateColumnName = (name: string): boolean => {
    if (!name.trim()) {
      setColumnNameError('Column name is required');
      return false;
    }
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
      setColumnNameError('Must start with letter or underscore, contain only letters, numbers, and underscores');
      return false;
    }
    // Check for duplicate names
    if (currentSchema?.columns.some(col => col.name === name.trim())) {
      setColumnNameError('Column name already exists');
      return false;
    }
    setColumnNameError(null);
    return true;
  };

  const handleAddColumn = async () => {
    if (!validateColumnName(newColumnName)) return;

    const success = await databaseService.addColumnToTable(
      tableName,
      newColumnName,
      newColumnType,
      newColumnType === 'vector' ? newColumnDimension : undefined
    );

    if (success) {
      // Reset form and close modal after a short delay
      setTimeout(() => {
        setNewColumnName('');
        setNewColumnType('string');
        setNewColumnDimension(1536);
        setShowAddModal(false);
      }, 1500);
    }
  };

  const handleDeleteColumn = async () => {
    if (!columnToDelete) return;

    const success = await databaseService.dropColumnFromTable(tableName, columnToDelete);

    if (success) {
      setTimeout(() => {
        setColumnToDelete(null);
        setShowDeleteModal(false);
      }, 1500);
    }
  };

  const openDeleteModal = (columnName: string) => {
    setColumnToDelete(columnName);
    setShowDeleteModal(true);
  };

  if (isLoadingSchema) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (schemaError) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-red-800 dark:text-red-400 mb-2">Error Loading Schema</h3>
        <p className="text-red-600 dark:text-red-400">{schemaError}</p>
        <button
          onClick={() => databaseService.refreshTableSchema()}
          className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!currentSchema) {
    return (
      <div className="bg-gray-50 dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-xl p-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-dark-700 text-gray-400 dark:text-dark-500 mb-4">
          <TableIcon />
        </div>
        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Schema Available</h4>
        <p className="text-gray-500 dark:text-dark-400">
          Could not load schema for table &quot;{tableName}&quot;
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Table Info Card */}
      <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-dark-700 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-xl text-primary-600 dark:text-primary-400">
              <TableIcon />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {currentSchema.name}
              </h2>
              <p className="text-sm text-gray-500 dark:text-dark-400 mt-1">
                {currentSchema.columns.length} columns
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm transition-colors"
            >
              <PlusIcon />
              <span>Add Column</span>
            </button>
            <button
              onClick={() => databaseService.refreshTableSchema()}
              disabled={isLoadingSchema}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-dark-300 hover:bg-gray-100 dark:hover:bg-dark-700 disabled:opacity-50 transition-colors"
            >
              <RefreshIcon />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <div className="bg-gray-50 dark:bg-dark-700/50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-500 dark:text-dark-400 mb-1">
              <RowsIcon />
              <p className="text-sm">Row Count</p>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {currentSchema.rowCount.toLocaleString()}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-dark-700/50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-500 dark:text-dark-400 mb-1">
              <SizeIcon />
              <p className="text-sm">Estimated Size</p>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatBytes(currentSchema.sizeBytes)}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-dark-700/50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-500 dark:text-dark-400 mb-1">
              <TableIcon />
              <p className="text-sm">Columns</p>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {currentSchema.columns.length}
            </p>
          </div>
        </div>
      </div>

      {/* Columns Table */}
      <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-dark-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-dark-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Columns</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-dark-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-400 uppercase tracking-wider">
                  Column Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-400 uppercase tracking-wider">
                  Data Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-400 uppercase tracking-wider">
                  Nullable
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-400 uppercase tracking-wider">
                  Properties
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-dark-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-dark-700">
              {currentSchema.columns.map((column, index) => {
                const typeStyle = getTypeStyle(column.type);
                return (
                  <tr
                    key={column.name}
                    className={index % 2 === 0 ? 'bg-white dark:bg-dark-800' : 'bg-gray-50/50 dark:bg-dark-700/20'}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {column.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium ${typeStyle.bgColor} ${typeStyle.color}`}>
                        {typeStyle.icon}
                        <span>{column.type}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {column.nullable ? (
                        <span className="inline-flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                          <NullableIcon />
                          <span className="text-sm">Nullable</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          Required
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {column.vectorDimension && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                          {column.vectorDimension} dimensions
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => openDeleteModal(column.name)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                        title="Delete column"
                      >
                        <TrashIcon />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Column Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-800 rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-dark-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add Column</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Success/Error Messages */}
              {databaseService.columnSuccessMessage && (
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg">
                  <CheckIcon />
                  <span className="text-sm">{databaseService.columnSuccessMessage}</span>
                </div>
              )}
              {databaseService.columnError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg">
                  <AlertIcon />
                  <span className="text-sm">{databaseService.columnError}</span>
                </div>
              )}

              {/* Column Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-300 mb-1">
                  Column Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newColumnName}
                  onChange={(e) => {
                    setNewColumnName(e.target.value);
                    if (columnNameError) validateColumnName(e.target.value);
                  }}
                  onBlur={() => validateColumnName(newColumnName)}
                  placeholder="e.g., user_id"
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-dark-700 dark:text-white ${
                    columnNameError
                      ? 'border-red-300 dark:border-red-700'
                      : 'border-gray-300 dark:border-dark-600'
                  }`}
                />
                {columnNameError && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{columnNameError}</p>
                )}
              </div>

              {/* Column Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-300 mb-2">
                  Data Type <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  {COLUMN_TYPE_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        newColumnType === option.value
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-gray-200 dark:border-dark-600 hover:bg-gray-50 dark:hover:bg-dark-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="columnType"
                        value={option.value}
                        checked={newColumnType === option.value}
                        onChange={() => setNewColumnType(option.value)}
                        className="w-4 h-4 text-primary-600"
                      />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{option.label}</p>
                        <p className="text-sm text-gray-500 dark:text-dark-400">{option.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Vector Dimension (only for vector type) */}
              {newColumnType === 'vector' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-300 mb-1">
                    Vector Dimension <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={newColumnDimension}
                    onChange={(e) => setNewColumnDimension(parseInt(e.target.value) || 0)}
                    min={1}
                    max={10000}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-dark-700 dark:text-white"
                  />
                  <p className="mt-1 text-sm text-gray-500 dark:text-dark-400">
                    Number of dimensions (1-10000)
                  </p>
                </div>
              )}

              {/* Note about nullable */}
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  <strong>Note:</strong> All new columns in LanceDB are nullable by default.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-dark-700">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-dark-300 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddColumn}
                disabled={databaseService.isAddingColumn || !!columnNameError || !newColumnName.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                {databaseService.isAddingColumn ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Adding...</span>
                  </>
                ) : (
                  <>
                    <PlusIcon />
                    <span>Add Column</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Column Modal */}
      {showDeleteModal && columnToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-800 rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-dark-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Delete Column</h3>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Success/Error Messages */}
              {databaseService.columnSuccessMessage && (
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg">
                  <CheckIcon />
                  <span className="text-sm">{databaseService.columnSuccessMessage}</span>
                </div>
              )}
              {databaseService.columnError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg">
                  <AlertIcon />
                  <span className="text-sm">{databaseService.columnError}</span>
                </div>
              )}

              {!databaseService.columnSuccessMessage && (
                <>
                  <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <div className="text-red-600 dark:text-red-400">
                      <AlertIcon />
                    </div>
                    <div>
                      <p className="font-medium text-red-800 dark:text-red-400">
                        Are you sure you want to delete this column?
                      </p>
                      <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                        This action cannot be undone.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-dark-700/50 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-dark-400">Column to delete:</p>
                    <p className="text-lg font-mono font-medium text-gray-900 dark:text-white mt-1">
                      {columnToDelete}
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-dark-700">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={databaseService.isDroppingColumn}
                className="px-4 py-2 text-gray-700 dark:text-dark-300 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              {!databaseService.columnSuccessMessage && (
                <button
                  onClick={handleDeleteColumn}
                  disabled={databaseService.isDroppingColumn}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  {databaseService.isDroppingColumn ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <TrashIcon />
                      <span>Delete Column</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
