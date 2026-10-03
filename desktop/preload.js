const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopAPI', {
  setWindowHeight: (height) => ipcRenderer.invoke('window:set-height', height),
  toggleStealth: (enable) => ipcRenderer.invoke('window:toggle-stealth', enable),
  toggleClickThrough: (enable) => ipcRenderer.invoke('window:toggle-click-through', enable),
  minimize: () => ipcRenderer.invoke('window:minimize'),
  close: () => ipcRenderer.invoke('window:close'),

  onTokenReceived: (callback) => ipcRenderer.on('auth:token-received', (e, token) => callback(token)),
  onClickThroughToggled: (callback) => ipcRenderer.on('hud:click-through-toggled', (e, state) => callback(state)),
  onStealthToggled: (callback) => ipcRenderer.on('hud:stealth-toggled', (e, state) => callback(state)),
  onToggleFreeze: (callback) => ipcRenderer.on('action:toggle-freeze', () => callback()),
  onTogglePanic: (callback) => ipcRenderer.on('action:toggle-panic', () => callback()),
});
