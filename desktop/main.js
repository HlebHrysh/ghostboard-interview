const { app, BrowserWindow, globalShortcut, ipcMain, screen, shell } = require('electron');
const path = require('path');

let mainWindow = null;
let isClickThrough = false;
let isStealthInvisible = true;

// Register custom protocol for 1-click web-to-app pairing: ghostboard://pair?token=...
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('ghostboard', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('ghostboard');
}

function createMainWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth } = primaryDisplay.workAreaSize;

  const windowWidth = 560;
  const windowHeight = 220;
  const initialX = Math.round((screenWidth - windowWidth) / 2);
  const initialY = 12; // Dock right below top bezel / webcam

  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: initialX,
    y: initialY,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: true,
    hasShadow: false,
    skipTaskbar: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // CRITICAL STEALTH FEATURE:
  // Under the hood, Chromium maps setContentProtection(true) to:
  // - Windows: SetWindowDisplayAffinity(hwnd, WDA_EXCLUDEFROMCAPTURE [0x11])
  // - macOS: [window setSharingType:NSWindowSharingNone]
  // This physically excludes this window from Zoom, Google Meet, Teams, Discord, and OBS screen capture!
  mainWindow.setContentProtection(true);

  // Set topmost level above all normal windows
  mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function handleDeepLink(url) {
  if (!url || !mainWindow) return;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'ghostboard:' && parsed.hostname === 'pair') {
      const token = parsed.searchParams.get('token');
      if (token) {
        mainWindow.webContents.send('auth:token-received', token);
      }
    }
  } catch (err) {
    console.error('Failed to parse deep link:', err);
  }
}

// macOS deep link handler
app.on('open-url', (event, url) => {
  event.preventDefault();
  handleDeepLink(url);
});

app.whenReady().then(() => {
  createMainWindow();

  // Handle Windows/Linux command-line deep links
  if (process.platform === 'win32' || process.platform === 'linux') {
    const rawUrl = process.argv.find((arg) => arg.startsWith('ghostboard://'));
    if (rawUrl) handleDeepLink(rawUrl);
  }

  // Register Global Shortcuts that work even while typing in VS Code / Terminal
  globalShortcut.register('CommandOrControl+Alt+H', () => {
    if (!mainWindow) return;
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
    }
  });

  globalShortcut.register('CommandOrControl+Alt+T', () => {
    if (!mainWindow) return;
    isClickThrough = !isClickThrough;
    mainWindow.setIgnoreMouseEvents(isClickThrough, { forward: true });
    mainWindow.webContents.send('hud:click-through-toggled', isClickThrough);
  });

  globalShortcut.register('CommandOrControl+Alt+S', () => {
    if (!mainWindow) return;
    isStealthInvisible = !isStealthInvisible;
    mainWindow.setContentProtection(isStealthInvisible);
    mainWindow.webContents.send('hud:stealth-toggled', isStealthInvisible);
  });

  // Space bar freeze is passed through IPC from webContents when focused,
  // or global shortcut F8
  globalShortcut.register('F8', () => {
    if (mainWindow) mainWindow.webContents.send('action:toggle-freeze');
  });

  // Panic shield hotkey
  globalShortcut.register('F12', () => {
    if (mainWindow) mainWindow.webContents.send('action:toggle-panic');
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC communication from Renderer
ipcMain.handle('window:set-height', (event, height) => {
  if (!mainWindow) return;
  const [currentWidth] = mainWindow.getSize();
  mainWindow.setSize(currentWidth, Math.min(Math.max(height, 80), 800));
});

ipcMain.handle('window:toggle-stealth', (event, enable) => {
  if (!mainWindow) return;
  isStealthInvisible = enable;
  mainWindow.setContentProtection(enable);
  return isStealthInvisible;
});

ipcMain.handle('window:toggle-click-through', (event, enable) => {
  if (!mainWindow) return;
  isClickThrough = enable;
  mainWindow.setIgnoreMouseEvents(enable, { forward: true });
  return isClickThrough;
});

ipcMain.handle('window:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('window:close', () => {
  if (mainWindow) mainWindow.close();
});
