import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { view } from '@rabjs/react';
import { isElectron } from '../../utils/environment';
import { setAPIMode } from '../../utils/api-client';

// Icons as simple SVG components
const DatabaseIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
  </svg>
);

const CloudIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
  </svg>
);

const FolderIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
  </svg>
);

const FolderOpenIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const ServerIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

// Storage keys
const STORAGE_KEY_MODE = 'mancedb_startup_mode';
const STORAGE_KEY_SERVER_URL = 'mancedb_server_url';
const STORAGE_KEY_LOCAL_PATH = 'mancedb_local_path';

// Startup mode types
type StartupMode = 'remote' | 'local' | null;

// Mode card component
interface ModeCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  selected: boolean;
  onClick: () => void;
  color: 'blue' | 'purple';
}

const ModeCard = ({ title, description, icon, selected, onClick, color }: ModeCardProps) => {
  const colorClasses = {
    blue: {
      selected: 'border-primary-500 bg-primary-50 dark:bg-primary-900/20',
      icon: 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400',
      title: 'text-primary-700 dark:text-primary-400',
    },
    purple: {
      selected: 'border-purple-500 bg-purple-50 dark:bg-purple-900/20',
      icon: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
      title: 'text-purple-700 dark:text-purple-400',
    },
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-start gap-4 p-6 rounded-xl border-2 transition-all text-left ${
        selected
          ? colorClasses[color].selected
          : 'border-gray-200 dark:border-dark-700 hover:border-gray-300 dark:hover:border-dark-600 bg-white dark:bg-dark-800'
      }`}
    >
      <div className={`p-3 rounded-lg ${colorClasses[color].icon}`}>
        {icon}
      </div>
      <div className="flex-1">
        <div className={`font-semibold text-lg ${selected ? colorClasses[color].title : 'text-gray-900 dark:text-white'}`}>
          {title}
        </div>
        <p className="text-sm text-gray-500 dark:text-dark-400 mt-1">
          {description}
        </p>
      </div>
      {selected && (
        <div className={`mt-1 ${colorClasses[color].title}`}>
          <CheckIcon />
        </div>
      )}
    </button>
  );
};

// Main Startup Mode Page
export const StartupModePage = view(() => {
  const navigate = useNavigate();
  const [selectedMode, setSelectedMode] = useState<StartupMode>(null);
  const [serverUrl, setServerUrl] = useState('');
  const [localPath, setLocalPath] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');

  // Load saved settings on mount
  useEffect(() => {
    const savedMode = localStorage.getItem(STORAGE_KEY_MODE) as StartupMode;
    const savedServerUrl = localStorage.getItem(STORAGE_KEY_SERVER_URL) || 'http://localhost:3000';
    const savedLocalPath = localStorage.getItem(STORAGE_KEY_LOCAL_PATH) || '';

    if (savedMode) {
      setSelectedMode(savedMode);
    }
    setServerUrl(savedServerUrl);
    setLocalPath(savedLocalPath);
  }, []);

  // Handle folder selection in Electron
  const handleBrowseFolder = async () => {
    try {
      const path = await window.electronAPI?.openDirectory();
      if (path) {
        setLocalPath(path);
        setError('');
      }
    } catch (err) {
      console.error('Failed to open directory dialog:', err);
      setError('Failed to open directory dialog');
    }
  };

  // Test remote connection
  const testRemoteConnection = async (): Promise<boolean> => {
    try {
      const response = await fetch(`${serverUrl}/api/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      return response.ok;
    } catch {
      return false;
    }
  };

  // Test local connection
  const testLocalConnection = async (): Promise<boolean> => {
    try {
      if (!window.electronAPI) {
        return false;
      }
      const result = await window.electronAPI.invoke('db:test', { path: localPath });
      return result.success === true;
    } catch {
      return false;
    }
  };

  // Handle continue button click
  const handleContinue = async () => {
    if (!selectedMode) {
      setError('Please select a connection mode');
      return;
    }

    setIsConnecting(true);
    setError('');

    try {
      if (selectedMode === 'remote') {
        if (!serverUrl.trim()) {
          setError('Please enter a server URL');
          setIsConnecting(false);
          return;
        }

        // Test connection
        const isConnected = await testRemoteConnection();
        if (!isConnected) {
          setError('Cannot connect to server. Please check the URL and try again.');
          setIsConnecting(false);
          return;
        }

        // Set API mode to HTTP
        setAPIMode('http');

        // Save settings
        localStorage.setItem(STORAGE_KEY_MODE, 'remote');
        localStorage.setItem(STORAGE_KEY_SERVER_URL, serverUrl);

        // Navigate to auth page
        navigate('/auth');
      } else {
        // Local mode
        if (!localPath.trim()) {
          setError('Please select a local database folder');
          setIsConnecting(false);
          return;
        }

        // Test connection
        const isConnected = await testLocalConnection();
        if (!isConnected) {
          setError('Cannot connect to local database. Please check the path and try again.');
          setIsConnecting(false);
          return;
        }

        // Set API mode to IPC
        setAPIMode('ipc');

        // Save settings
        localStorage.setItem(STORAGE_KEY_MODE, 'local');
        localStorage.setItem(STORAGE_KEY_LOCAL_PATH, localPath);

        // Connect to the local database via IPC
        if (window.electronAPI) {
          await window.electronAPI.invoke('db:connect', { path: localPath });
        }

        // Navigate to database browser (skip auth for local mode)
        navigate('/connections/local/database');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setIsConnecting(false);
    }
  };

  // If not in Electron, redirect to auth page
  useEffect(() => {
    if (!isElectron()) {
      navigate('/auth');
    }
  }, [navigate]);

  if (!isElectron()) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-900 flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-dark-800 border-b border-gray-200 dark:border-dark-700">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-center gap-3">
            <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
              <DatabaseIcon />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                LanceDB Admin
              </h1>
              <p className="text-sm text-gray-500 dark:text-dark-400">
                Desktop Client
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-xl">
          {/* Title */}
          <div className="text-center mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Choose Connection Mode
            </h2>
            <p className="text-gray-600 dark:text-dark-400">
              Select how you want to connect to your LanceDB databases
            </p>
          </div>

          {/* Mode Selection */}
          <div className="space-y-4 mb-8">
            <ModeCard
              title="Connect to Remote Server"
              description="Connect to a LanceDB Admin server over the network. Requires authentication."
              icon={<CloudIcon />}
              selected={selectedMode === 'remote'}
              onClick={() => {
                setSelectedMode('remote');
                setError('');
              }}
              color="purple"
            />

            <ModeCard
              title="Open Local Database"
              description="Directly access a local LanceDB database folder on your computer."
              icon={<FolderIcon />}
              selected={selectedMode === 'local'}
              onClick={() => {
                setSelectedMode('local');
                setError('');
              }}
              color="blue"
            />
          </div>

          {/* Remote Mode Form */}
          {selectedMode === 'remote' && (
            <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-dark-700 p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <ServerIcon />
                <h3 className="font-medium text-gray-900 dark:text-white">
                  Server Configuration
                </h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label htmlFor="serverUrl" className="block text-sm font-medium text-gray-700 dark:text-dark-300 mb-2">
                    Server URL
                  </label>
                  <input
                    id="serverUrl"
                    type="text"
                    value={serverUrl}
                    onChange={(e) => setServerUrl(e.target.value)}
                    placeholder="http://localhost:3000"
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all placeholder-gray-400 dark:placeholder-dark-500"
                  />
                  <p className="text-xs text-gray-500 dark:text-dark-500 mt-1">
                    Enter the URL of your LanceDB Admin server
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Local Mode Form */}
          {selectedMode === 'local' && (
            <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-dark-700 p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <FolderIcon />
                <h3 className="font-medium text-gray-900 dark:text-white">
                  Local Database
                </h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label htmlFor="localPath" className="block text-sm font-medium text-gray-700 dark:text-dark-300 mb-2">
                    Database Folder
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="localPath"
                      type="text"
                      value={localPath}
                      onChange={(e) => setLocalPath(e.target.value)}
                      placeholder="/path/to/lancedb"
                      className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all placeholder-gray-400 dark:placeholder-dark-500"
                    />
                    <button
                      type="button"
                      onClick={handleBrowseFolder}
                      className="px-4 py-2.5 border border-gray-300 dark:border-dark-600 text-gray-700 dark:text-dark-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors flex items-center gap-2 whitespace-nowrap"
                    >
                      <FolderOpenIcon />
                      Browse
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-dark-500 mt-1">
                    Select a local LanceDB database folder
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Continue Button */}
          <button
            type="button"
            onClick={handleContinue}
            disabled={isConnecting || !selectedMode}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 dark:disabled:bg-dark-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
          >
            {isConnecting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <span>Continue</span>
                <ArrowRightIcon />
              </>
            )}
          </button>

          {/* Footer */}
          <p className="text-center text-sm text-gray-500 dark:text-dark-400 mt-6">
            You can change this setting later from the connection menu
          </p>
        </div>
      </main>
    </div>
  );
});
