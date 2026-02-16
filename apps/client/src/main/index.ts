import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import path from 'node:path';

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // Enable web security but allow local file access
      webSecurity: true,
    },
    // Better window appearance
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false, // Show when ready to prevent flash
  });

  // Show window when content is ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
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

app.whenReady().then(() => {
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
  const mainWindow = BrowserWindow.getAllWindows()[0];
  if (!mainWindow) return null;

  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select LanceDB Database Folder',
    buttonLabel: 'Select Folder',
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0];
});
