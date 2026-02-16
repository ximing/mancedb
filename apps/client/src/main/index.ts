import 'reflect-metadata';
import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerIPCHandlers } from './ipc-router';
import { createApplicationMenu } from './menu';
import { loadWindowState, saveWindowState } from './utils/window-state';
import { initAutoUpdater, checkForUpdatesOnStartup } from './updater';
import { initContainer } from './container';

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Keep a global reference of the window object to prevent garbage collection
let mainWindow: BrowserWindow | null = null;

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // Another instance is already running, quit this one
  app.quit();
} else {
  // This is the first instance
  app.on('second-instance', () => {
    // Someone tried to run a second instance, focus our window instead
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });
}

const createWindow = () => {
  // Load saved window state
  const windowState = loadWindowState();

  mainWindow = new BrowserWindow({
    width: windowState.width,
    height: windowState.height,
    x: windowState.x,
    y: windowState.y,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      // Enable web security but allow local file access
      webSecurity: true,
    },
    // Better window appearance
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false, // Show when ready to prevent flash
  });

  // Restore maximized/fullscreen state
  if (windowState.isMaximized) {
    mainWindow.maximize();
  }
  if (windowState.isFullScreen) {
    mainWindow.setFullScreen(true);
  }

  // Show window when content is ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Save window state on close
  const saveState = () => {
    if (!mainWindow) return;

    const bounds = mainWindow.getBounds();
    saveWindowState({
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
      isMaximized: mainWindow.isMaximized(),
      isFullScreen: mainWindow.isFullScreen(),
    });
  };

  mainWindow.on('resize', saveState);
  mainWindow.on('move', saveState);
  mainWindow.on('maximize', saveState);
  mainWindow.on('unmaximize', saveState);
  mainWindow.on('enter-full-screen', saveState);
  mainWindow.on('leave-full-screen', saveState);

  // Clean up when window is closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Load the web app
  if (process.env.VITE_DEV_SERVER_URL) {
    // Development: load from web app dev server
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    // Production: load from the built web app
    // The web app is built to apps/client/dist/web
    const webAppPath = path.join(__dirname, '../web/index.html');
    mainWindow.loadFile(webAppPath);
  }
};

app.whenReady().then(async () => {
  // Initialize DI container before registering IPC handlers
  await initContainer();

  // Register IPC handlers for LanceDB API
  registerIPCHandlers();

  // Create application menu
  createApplicationMenu();

  // Initialize auto-updater
  initAutoUpdater();

  // Check for updates on startup
  checkForUpdatesOnStartup();

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handler for opening directory dialog
ipcMain.handle('dialog:openDirectory', async () => {
  const window = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
  if (!window) return null;

  const result = await dialog.showOpenDialog(window, {
    properties: ['openDirectory'],
    title: 'Select LanceDB Database Folder',
    buttonLabel: 'Select Folder',
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0];
});
