import { app, dialog, BrowserWindow } from 'electron';
import { autoUpdater } from 'electron-updater';

// Configure auto-updater
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

let updateCheckInProgress = false;

/**
 * Get the main window for dialogs
 */
function getMainWindow(): BrowserWindow | undefined {
  return BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0] || undefined;
}

/**
 * Initialize the auto-updater
 * Should be called after the app is ready
 */
export function initAutoUpdater(): void {
  // Skip update checks in development
  if (process.env.VITE_DEV_SERVER_URL) {
    console.log('Skipping auto-updater in development mode');
    return;
  }

  // Set up event handlers
  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for updates...');
  });

  autoUpdater.on('update-available', (info) => {
    console.log('Update available:', info.version);
    updateCheckInProgress = false;

    // Show update dialog
    void showUpdateDialog(info.version, info.releaseNotes as string | undefined);
  });

  autoUpdater.on('update-not-available', () => {
    console.log('No updates available');
    updateCheckInProgress = false;
  });

  autoUpdater.on('error', (err) => {
    console.error('Auto-updater error:', err);
    updateCheckInProgress = false;
  });

  autoUpdater.on('download-progress', (progress) => {
    console.log(`Download progress: ${progress.percent.toFixed(2)}%`);
  });

  autoUpdater.on('update-downloaded', () => {
    console.log('Update downloaded');

    // Ask user to restart
    const window = getMainWindow();
    const response = window
      ? dialog.showMessageBoxSync(window, {
          type: 'info',
          title: 'Update Ready',
          message: 'The update has been downloaded. Restart the application to apply the updates?',
          buttons: ['Restart', 'Later'],
          defaultId: 0,
        })
      : dialog.showMessageBoxSync({
          type: 'info',
          title: 'Update Ready',
          message: 'The update has been downloaded. Restart the application to apply the updates?',
          buttons: ['Restart', 'Later'],
          defaultId: 0,
        });

    if (response === 0) {
      autoUpdater.quitAndInstall();
    }
  });
}

/**
 * Show update dialog when a new version is available
 */
async function showUpdateDialog(version: string, releaseNotes?: string): Promise<void> {
  const window = getMainWindow();

  const message = releaseNotes
    ? `A new version (${version}) is available.\n\nRelease Notes:\n${releaseNotes}`
    : `A new version (${version}) is available.`;

  const result = window
    ? await dialog.showMessageBox(window, {
        type: 'info',
        title: 'Update Available',
        message: 'A new version is available',
        detail: message,
        buttons: ['Download Update', 'Remind Me Later'],
        defaultId: 0,
        cancelId: 1,
      })
    : await dialog.showMessageBox({
        type: 'info',
        title: 'Update Available',
        message: 'A new version is available',
        detail: message,
        buttons: ['Download Update', 'Remind Me Later'],
        defaultId: 0,
        cancelId: 1,
      });

  if (result.response === 0) {
    // User chose to download
    void autoUpdater.downloadUpdate();
  }
}

/**
 * Check for updates manually
 * Returns true if a check was started, false if already in progress
 */
export function checkForUpdates(): boolean {
  // Skip in development
  if (process.env.VITE_DEV_SERVER_URL) {
    const window = getMainWindow();
    if (window) {
      void dialog.showMessageBox(window, {
        type: 'info',
        title: 'Development Mode',
        message: 'Update checking is disabled in development mode',
      });
    } else {
      void dialog.showMessageBox({
        type: 'info',
        title: 'Development Mode',
        message: 'Update checking is disabled in development mode',
      });
    }
    return false;
  }

  if (updateCheckInProgress) {
    return false;
  }

  updateCheckInProgress = true;

  // Check for updates silently (no dialog if no update available)
  void autoUpdater.checkForUpdates().then((result) => {
    if (!result || result.updateInfo.version === app.getVersion()) {
      // No update available, show message
      updateCheckInProgress = false;
      const window = getMainWindow();
      if (window) {
        void dialog.showMessageBox(window, {
          type: 'info',
          title: 'No Updates Available',
          message: 'You are running the latest version.',
          detail: `Current version: ${app.getVersion()}`,
        });
      } else {
        void dialog.showMessageBox({
          type: 'info',
          title: 'No Updates Available',
          message: 'You are running the latest version.',
          detail: `Current version: ${app.getVersion()}`,
        });
      }
    }
  }).catch((err) => {
    console.error('Failed to check for updates:', err);
    updateCheckInProgress = false;
    dialog.showErrorBox('Update Check Failed', 'Failed to check for updates. Please try again later.');
  });

  return true;
}

/**
 * Check for updates on startup (silent - only shows dialog if update available)
 */
export function checkForUpdatesOnStartup(): void {
  // Skip in development
  if (process.env.VITE_DEV_SERVER_URL) {
    return;
  }

  // Wait a bit after startup before checking
  setTimeout(() => {
    void autoUpdater.checkForUpdates();
  }, 5000); // Check after 5 seconds
}
