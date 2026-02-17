import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { view, useService } from '@rabjs/react';
import { ConnectionService } from '../../services/connection.service';
import type { ConnectionDto } from '@mancedb/dto';

// Icons as simple SVG components
const DatabaseIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
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

const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const KeyIcon = () => (
  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
  </svg>
);

const UnlockIcon = () => (
  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
  </svg>
);

const EmptyStateIcon = () => (
  <svg className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
  </svg>
);

// Format date to readable string
const formatDate = (timestamp: number | undefined): string => {
  if (!timestamp) return 'Never';
  const date = new Date(timestamp);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Connection Card Component
interface ConnectionCardProps {
  connection: ConnectionDto;
  onDelete: (connection: ConnectionDto) => void;
  onClick: (connection: ConnectionDto) => void;
}

const ConnectionCard = ({ connection, onDelete, onClick }: ConnectionCardProps) => {
  const isLocal = connection.type === 'local';
  const hasCredentials = connection.hasCredentials;

  return (
    <div
      onClick={() => onClick(connection)}
      className="group bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-dark-700 p-5 hover:shadow-lg dark:hover:shadow-xl hover:border-primary-300 dark:hover:border-primary-700 transition-all cursor-pointer relative"
    >
      {/* Delete button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(connection);
        }}
        className="absolute top-3 right-3 p-2 text-gray-400 hover:text-red-500 dark:text-dark-400 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
        title="Delete connection"
      >
        <TrashIcon />
      </button>

      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className={`p-3 rounded-lg ${isLocal ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'}`}>
          {isLocal ? <FolderIcon /> : <CloudIcon />}
        </div>
        <div className="flex-1 min-w-0 pr-8">
          <h3 className="font-semibold text-gray-900 dark:text-white truncate">
            {connection.name}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${isLocal ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' : 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400'}`}>
              {isLocal ? 'Local' : 'S3'}
            </span>
            {/* Credential status indicator - only show for S3 connections */}
            {!isLocal && (
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                  hasCredentials
                    ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                }`}
                title={hasCredentials ? 'Credentials configured' : 'No credentials (public bucket)'}
              >
                {hasCredentials ? <KeyIcon /> : <UnlockIcon />}
                {hasCredentials ? 'Authenticated' : 'Public'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Connection details */}
      <div className="space-y-2 text-sm text-gray-600 dark:text-dark-400">
        <div className="flex items-center gap-2 truncate">
          <DatabaseIcon />
          <span className="truncate">
            {isLocal ? connection.localPath : connection.s3Bucket}
          </span>
        </div>
        {connection.dbUsername && (
          <div className="text-xs text-gray-500 dark:text-dark-500">
            User: {connection.dbUsername}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-dark-700 flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-dark-500">
          <ClockIcon />
          <span>Last: {formatDate(connection.lastConnectedAt)}</span>
        </div>
        <ArrowRightIcon />
      </div>
    </div>
  );
};

// Delete Confirmation Modal
interface DeleteModalProps {
  connection: ConnectionDto | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

const DeleteModal = ({ connection, isOpen, onClose, onConfirm, isDeleting }: DeleteModalProps) => {
  if (!isOpen || !connection) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-dark-800 rounded-xl shadow-xl max-w-md w-full p-6 animate-fade-in">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Delete Connection
        </h3>
        <p className="text-gray-600 dark:text-dark-400 mb-4">
          Are you sure you want to delete <strong className="text-gray-900 dark:text-white">"{connection.name}"</strong>? This action cannot be undone.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-gray-700 dark:text-dark-300 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Empty State Component
const EmptyState = ({ onCreate }: { onCreate: () => void }) => (
  <div className="text-center py-16 px-4">
    <EmptyStateIcon />
    <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
      No connections yet
    </h3>
    <p className="mt-2 text-gray-600 dark:text-dark-400 max-w-sm mx-auto">
      Get started by creating your first LanceDB connection. You can connect to local databases or S3 storage.
    </p>
    <button
      onClick={onCreate}
      className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
    >
      <PlusIcon />
      Create Connection
    </button>
  </div>
);

// Main Connection List Page
export const ConnectionListPage = view(() => {
  const connectionService = useService(ConnectionService);
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [connectionToDelete, setConnectionToDelete] = useState<ConnectionDto | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load connections on mount
  useEffect(() => {
    connectionService.loadConnections();
  }, []);

  // Get filtered connections
  const filteredConnections = connectionService.getFilteredConnections(searchTerm);

  // Handle connection click - navigate to login page for this connection
  const handleConnectionClick = (connection: ConnectionDto) => {
    navigate(`/connections/${connection.id}/login`);
  };

  // Handle delete click
  const handleDeleteClick = (connection: ConnectionDto) => {
    setConnectionToDelete(connection);
    setDeleteModalOpen(true);
  };

  // Handle delete confirm
  const handleDeleteConfirm = async () => {
    if (!connectionToDelete) return;

    setIsDeleting(true);
    const success = await connectionService.deleteConnection(connectionToDelete.id);
    setIsDeleting(false);

    if (success) {
      setDeleteModalOpen(false);
      setConnectionToDelete(null);
    }
  };

  // Handle create connection
  const handleCreateConnection = () => {
    navigate('/connections/new');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-900">
      {/* Header */}
      <header className="bg-white dark:bg-dark-800 border-b border-gray-200 dark:border-dark-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                <DatabaseIcon />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  ManceDB
                </h1>
                <p className="text-sm text-gray-500 dark:text-dark-400">
                  Manage your database connections
                </p>
              </div>
            </div>

            {/* Search and Create */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <SearchIcon />
                </div>
                <input
                  type="text"
                  placeholder="Search connections..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-64 border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all placeholder-gray-500 dark:placeholder-dark-400"
                />
              </div>
              <button
                onClick={handleCreateConnection}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
              >
                <PlusIcon />
                <span className="hidden sm:inline">New Connection</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {connectionService.isLoading && connectionService.connections.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : connectionService.connections.length === 0 ? (
          <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-dark-700">
            <EmptyState onCreate={handleCreateConnection} />
          </div>
        ) : (
          <>
            {/* Results count */}
            <div className="mb-4 text-sm text-gray-600 dark:text-dark-400">
              {searchTerm ? (
                <span>
                  Found <strong className="text-gray-900 dark:text-white">{filteredConnections.length}</strong> of {connectionService.connections.length} connections
                </span>
              ) : (
                <span>
                  <strong className="text-gray-900 dark:text-white">{connectionService.connections.length}</strong> connections
                </span>
              )}
            </div>

            {/* Connection Grid */}
            {filteredConnections.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredConnections.map((connection) => (
                  <ConnectionCard
                    key={connection.id}
                    connection={connection}
                    onDelete={handleDeleteClick}
                    onClick={handleConnectionClick}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-dark-700">
                <p className="text-gray-600 dark:text-dark-400">
                  No connections match your search
                </p>
                <button
                  onClick={() => setSearchTerm('')}
                  className="mt-2 text-primary-600 hover:text-primary-700 font-medium"
                >
                  Clear search
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      <DeleteModal
        connection={connectionToDelete}
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setConnectionToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />
    </div>
  );
});
