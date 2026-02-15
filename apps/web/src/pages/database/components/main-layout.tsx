import { useState, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router';
import { view, useService } from '@rabjs/react';
import { DatabaseService } from '../../../services/database.service';
import { connectionAuthService } from '../../../services/connection-auth.service';
import { ConnectionService } from '../../../services/connection.service';
import { ThemeService } from '../../../services/theme.service';
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
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-dark-700">
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
                <button
                  key={table.name}
                  onClick={() => handleTableClick(table.name)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    databaseService.selectedTable === table.name
                      ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
                      : 'text-gray-700 dark:text-dark-300 hover:bg-gray-100 dark:hover:bg-dark-700'
                  } ${databaseService.sidebarCollapsed ? 'justify-center' : ''}`}
                  title={table.name}
                >
                  <TableIcon />
                  {!databaseService.sidebarCollapsed && (
                    <span className="truncate flex-1 text-left">{table.name}</span>
                  )}
                  {!databaseService.sidebarCollapsed && (
                    <span className="text-xs text-gray-400 dark:text-dark-500">
                      {table.rowCount.toLocaleString()}
                    </span>
                  )}
                </button>
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
        <header className="h-16 bg-white dark:bg-dark-800 border-b border-gray-200 dark:border-dark-700 flex items-center justify-between px-6">
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
    </div>
  );
});
