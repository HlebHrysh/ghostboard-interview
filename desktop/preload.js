const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopAPI', {
  // Window geometry and display positioning
  setWindowHeight: (height) => ipcRenderer.invoke('window:set-height', height),
  setWindowMode: (mode) => ipcRenderer.invoke('window:set-mode', mode),
  launchSession: () => ipcRenderer.invoke('window:launch-session'),
  returnToLauncher: () => ipcRenderer.invoke('window:return-launcher'),
  alignToActiveDisplay: () => ipcRenderer.invoke('window:align-active-display'),
  toggleStealth: (enable) => ipcRenderer.invoke('window:toggle-stealth', enable),
  toggleClickThrough: (enable) => ipcRenderer.invoke('window:toggle-click-through', enable),
  minimize: () => ipcRenderer.invoke('window:minimize'),
  close: () => ipcRenderer.invoke('window:close'),

  // Hardware-Backed Secure Storage & Session Management
  getSavedSession: () => ipcRenderer.invoke('auth:get-saved-session'),
  saveSession: (data) => ipcRenderer.invoke('auth:save-session', data),
  logout: () => ipcRenderer.invoke('auth:logout'),
  saveSettings: (settings) => ipcRenderer.invoke('auth:save-settings', settings),
  startBrowserLogin: (serverUrl) => ipcRenderer.invoke('auth:start-browser-login', serverUrl),

  // System Utilities
  copyClipboard: (text) => ipcRenderer.invoke('system:copy-clipboard', text),
  getSystemInfo: () => ipcRenderer.invoke('system:get-info'),

  // Event Subscriptions from Main Process
  onTokenReceived: (callback) => {
    const handler = (e, token) => callback(token);
    ipcRenderer.on('auth:token-received', handler);
    return () => ipcRenderer.removeListener('auth:token-received', handler);
  },
  onClickThroughToggled: (callback) => {
    const handler = (e, state) => callback(state);
    ipcRenderer.on('hud:click-through-toggled', handler);
    return () => ipcRenderer.removeListener('hud:click-through-toggled', handler);
  },
  onStealthToggled: (callback) => {
    const handler = (e, state) => callback(state);
    ipcRenderer.on('hud:stealth-toggled', handler);
    return () => ipcRenderer.removeListener('hud:stealth-toggled', handler);
  },
  onModeToggled: (callback) => {
    const handler = (e, mode) => callback(mode);
    ipcRenderer.on('hud:mode-toggled', handler);
    return () => ipcRenderer.removeListener('hud:mode-toggled', handler);
  },
  onStateChanged: (callback) => {
    const handler = (e, state) => callback(state);
    ipcRenderer.on('app:state-changed', handler);
    return () => ipcRenderer.removeListener('app:state-changed', handler);
  },
  onToggleFreeze: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('action:toggle-freeze', handler);
    return () => ipcRenderer.removeListener('action:toggle-freeze', handler);
  },
  onTogglePanic: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('action:toggle-panic', handler);
    return () => ipcRenderer.removeListener('action:toggle-panic', handler);
  },
  onSystemResumed: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('system:resumed', handler);
    return () => ipcRenderer.removeListener('system:resumed', handler);
  },
});
