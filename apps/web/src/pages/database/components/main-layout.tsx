import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useParams } from 'react-router';
import { view, useService } from '@rabjs/react';
import { DatabaseService } from '../../../services/database.service';
import { connectionAuthService } from '../../../services/connection-auth.service';
import { ConnectionService } from '../../../services/connection.service';
import { ThemeService } from '../../../services/theme.service';
import { isMacOS, isElectron } from '../../../utils/environment';
import type { ConnectionDto } from '@mancedb/dto';

// Use singleton instance directly
const connAuthService = connectionAuthService;

// Icons as simple SVG components
const DatabaseIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
  </svg>
);

const TableIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const ChevronLeftIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const RefreshIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const LogoutIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

const SunIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const MoonIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
  </svg>
);

const FolderIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
  </svg>
);

const CloudIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
  </svg>
);

const MenuIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

const MoreVerticalIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const EditIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const XIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const AlertTriangleIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout = view(({ children }: MainLayoutProps) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const databaseService = useService(DatabaseService);
  const connectionService = useService(ConnectionService);
  const themeService = useService(ThemeService);

  const [connection, setConnection] = useState<ConnectionDto | null>(null);
  const [isLoadingConnection, setIsLoadingConnection] = useState(true);

  // Table management state
  const [activeTableMenu, setActiveTableMenu] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [tableToDelete, setTableToDelete] = useState<string | null>(null);
  const [tableToRename, setTableToRename] = useState<string | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [newTableName, setNewTableName] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Load connection details and tables on mount
  useEffect(() => {
    const loadData = async () => {
      const connectionId = id || connAuthService.getCurrentConnectionId();

      if (!connectionId) {
        navigate('/');
        return;
      }

      // Load connection details
      setIsLoadingConnection(true);
      try {
        const conn = await connectionService.getConnectionById(connectionId);
        if (conn) {
          setConnection(conn);
        } else {
          navigate('/');
          return;
        }
      } catch {
        navigate('/');
        return;
      } finally {
        setIsLoadingConnection(false);
      }

      // Load database tables
      await databaseService.loadDatabaseInfo();
    };

    loadData();
  }, [id, navigate, connectionAuthService, connectionService, databaseService]);

  const handleLogout = () => {
    connAuthService.logout();
    navigate('/');
  };

  const handleRefresh = async () => {
    await databaseService.refresh();
  };

  const handleTableClick = (tableName: string) => {
    databaseService.selectTable(tableName);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveTableMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTableMenuClick = (e: React.MouseEvent, tableName: string) => {
    e.stopPropagation();
    setActiveTableMenu(activeTableMenu === tableName ? null : tableName);
  };

  const openDeleteModal = (tableName: string) => {
    setTableToDelete(tableName);
    setDeleteConfirmText('');
    setActiveTableMenu(null);
    setIsDeleteModalOpen(true);
  };

  const openRenameModal = (tableName: string) => {
    setTableToRename(tableName);
    setNewTableName(tableName);
    setRenameError(null);
    setActiveTableMenu(null);
    setIsRenameModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setTableToDelete(null);
    setDeleteConfirmText('');
  };

  const closeRenameModal = () => {
    setIsRenameModalOpen(false);
    setTableToRename(null);
    setNewTableName('');
    setRenameError(null);
  };

  const handleDeleteTable = async () => {
    if (!tableToDelete || deleteConfirmText !== tableToDelete) return;

    const success = await databaseService.deleteTable(tableToDelete);
    if (success) {
      closeDeleteModal();
    }
  };

  const handleRenameTable = async () => {
    if (!tableToRename || !newTableName.trim()) return;

    // Validate table name format
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(newTableName.trim())) {
      setRenameError('Table name must start with letter or underscore and contain only letters, numbers, and underscores');
      return;
    }

    // Check if name already exists
    if (databaseService.tables.some(t => t.name === newTableName.trim() && t.name !== tableToRename)) {
      setRenameError('A table with this name already exists');
      return;
    }

    const success = await databaseService.renameTable(tableToRename, newTableName.trim());
    if (success) {
      closeRenameModal();
    }
  };

  if (isLoadingConnection) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const isLocal = connection?.type === 'local';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-900 flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-white dark:bg-dark-800 border-r border-gray-200 dark:border-dark-700 transition-all duration-300 ${
          databaseService.sidebarCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        {/* Sidebar Header */}
        <div className={`min-h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-dark-700 ${
          isElectron() && isMacOS() ? 'pt-8 pb-2' : 'h-16'
        }`}>
          {!databaseService.sidebarCollapsed && (
            <Link to="/" className="flex items-center gap-2 text-primary-600 dark:text-primary-400">
              <DatabaseIcon />
              <span className="font-bold text-lg">ManceDB</span>
            </Link>
          )}
          <button
            onClick={() => databaseService.toggleSidebar()}
            className={`p-1.5 rounded-lg text-gray-500 dark:text-dark-400 hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors ${
              databaseService.sidebarCollapsed ? 'mx-auto' : ''
            }`}
            title={databaseService.sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {databaseService.sidebarCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </button>
        </div>

        {/* Connection Info */}
        {!databaseService.sidebarCollapsed && connection && (
          <div className="px-4 py-3 border-b border-gray-200 dark:border-dark-700">
            <div className="flex items-center gap-2 mb-1">
              <span className={`inline-flex items-center justify-center w-5 h-5 rounded ${
                isLocal ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
              }`}>
                {isLocal ? <FolderIcon /> : <CloudIcon />}
              </span>
              <span className="font-medium text-gray-900 dark:text-white text-sm truncate">
                {connection.name}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-dark-400 truncate">
              {isLocal ? connection.localPath : connection.s3Bucket}
            </p>
          </div>
        )}

        {/* Table List */}
        <div className="flex-1 overflow-y-auto py-2">
          {!databaseService.sidebarCollapsed && (
            <div className="px-4 py-2">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-dark-400 uppercase tracking-wider">
                Tables ({databaseService.tables.length})
              </h3>
            </div>
          )}

          {databaseService.isLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
            </div>
          ) : databaseService.tables.length === 0 ? (
            !databaseService.sidebarCollapsed && (
              <div className="px-4 py-4 text-center">
                <p className="text-sm text-gray-500 dark:text-dark-400">No tables found</p>
              </div>
            )
          ) : (
            <nav className="space-y-1 px-2">
              {databaseService.tables.map((table) => (
                <div
                  key={table.name}
                  className={`group relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    databaseService.selectedTable === table.name
                      ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
                      : 'text-gray-700 dark:text-dark-300 hover:bg-gray-100 dark:hover:bg-dark-700'
                  } ${databaseService.sidebarCollapsed ? 'justify-center' : ''}`}
                >
                  <button
                    onClick={() => handleTableClick(table.name)}
                    className="flex items-center gap-2 flex-1 min-w-0"
                    title={table.name}
                  >
                    <TableIcon />
                    {!databaseService.sidebarCollapsed && (
                      <span className="truncate text-left">{table.name}</span>
                    )}
                  </button>
                  {!databaseService.sidebarCollapsed && (
                    <>
                      <span className="text-xs text-gray-400 dark:text-dark-500 flex-shrink-0">
                        {table.rowCount.toLocaleString()}
                      </span>
                      <div className="relative" ref={activeTableMenu === table.name ? menuRef : undefined}>
                        <button
                          onClick={(e) => handleTableMenuClick(e, table.name)}
                          className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                            activeTableMenu === table.name
                              ? 'opacity-100 bg-gray-200 dark:bg-dark-600'
                              : 'hover:bg-gray-200 dark:hover:bg-dark-600'
                          }`}
                          title="Table actions"
                        >
                          <MoreVerticalIcon />
                        </button>
                        {activeTableMenu === table.name && (
                          <div className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-dark-700 rounded-lg shadow-lg border border-gray-200 dark:border-dark-600 py-1 z-50">
                            <button
                              onClick={() => openRenameModal(table.name)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-dark-300 hover:bg-gray-100 dark:hover:bg-dark-600 text-left"
                            >
                              <EditIcon />
                              Rename
                            </button>
                            <button
                              onClick={() => openDeleteModal(table.name)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-left"
                            >
                              <TrashIcon />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </nav>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="border-t border-gray-200 dark:border-dark-700 p-2 space-y-1">
          {/* Theme Toggle */}
          <button
            onClick={() => themeService.toggleTheme()}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-dark-300 hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors ${
              databaseService.sidebarCollapsed ? 'justify-center' : ''
            }`}
            title={themeService.isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {themeService.isDark ? <SunIcon /> : <MoonIcon />}
            {!databaseService.sidebarCollapsed && (
              <span>{themeService.isDark ? 'Light Mode' : 'Dark Mode'}</span>
            )}
          </button>

          {/* Back to Connections */}
          <Link
            to="/"
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-dark-300 hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors ${
              databaseService.sidebarCollapsed ? 'justify-center' : ''
            }`}
            title="Back to Connections"
          >
            <LogoutIcon />
            {!databaseService.sidebarCollapsed && <span>Connections</span>}
          </Link>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors ${
              databaseService.sidebarCollapsed ? 'justify-center' : ''
            }`}
            title="Logout"
          >
            <LogoutIcon />
            {!databaseService.sidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          databaseService.sidebarCollapsed ? 'ml-16' : 'ml-64'
        }`}
      >
        {/* Top Toolbar */}
        <header
          className={`h-16 bg-white dark:bg-dark-800 border-b border-gray-200 dark:border-dark-700 flex items-center justify-between px-6 ${
            isElectron() && isMacOS() ? 'pl-20' : ''
          }`}
        >
          <div className="flex items-center gap-4">
            {/* Mobile menu button */}
            <button
              className="lg:hidden p-2 rounded-lg text-gray-500 dark:text-dark-400 hover:bg-gray-100 dark:hover:bg-dark-700"
              onClick={() => databaseService.toggleSidebar()}
            >
              <MenuIcon />
            </button>

            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              {databaseService.selectedTable || 'Database Overview'}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={databaseService.isLoading}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-dark-300 hover:bg-gray-100 dark:hover:bg-dark-700 disabled:opacity-50 transition-colors"
            >
              <RefreshIcon />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>

      {/* Delete Table Modal */}
      {isDeleteModalOpen && tableToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-dark-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full text-red-600 dark:text-red-400">
                  <AlertTriangleIcon />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Delete Table
                </h3>
              </div>

              <p className="text-gray-600 dark:text-dark-400 mb-4">
                This action cannot be undone. This will permanently delete the table <strong className="text-gray-900 dark:text-white">{tableToDelete}</strong> and all its data.
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-300 mb-2">
                  Type <code className="bg-gray-100 dark:bg-dark-700 px-1 rounded">{tableToDelete}</code> to confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Enter table name"
                  autoFocus
                />
              </div>

              {databaseService.tableError && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
                  {databaseService.tableError}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  onClick={closeDeleteModal}
                  disabled={databaseService.isDeletingTable}
                  className="px-4 py-2 text-gray-700 dark:text-dark-300 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteTable}
                  disabled={databaseService.isDeletingTable || deleteConfirmText !== tableToDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {databaseService.isDeletingTable ? 'Deleting...' : 'Delete Table'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rename Table Modal */}
      {isRenameModalOpen && tableToRename && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-dark-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Rename Table
                </h3>
                <button
                  onClick={closeRenameModal}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-dark-300"
                >
                  <XIcon />
                </button>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-300 mb-2">
                  New Table Name
                </label>
                <input
                  type="text"
                  value={newTableName}
                  onChange={(e) => {
                    setNewTableName(e.target.value);
                    setRenameError(null);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter new table name"
                  autoFocus
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-dark-400">
                  Must start with letter or underscore, contain only letters, numbers, and underscores
                </p>
              </div>

              {(renameError || databaseService.tableError) && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
                  {renameError || databaseService.tableError}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  onClick={closeRenameModal}
                  disabled={databaseService.isRenamingTable}
                  className="px-4 py-2 text-gray-700 dark:text-dark-300 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRenameTable}
                  disabled={databaseService.isRenamingTable || !newTableName.trim() || newTableName.trim() === tableToRename}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {databaseService.isRenamingTable ? 'Renaming...' : 'Rename Table'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
