const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('agentAlert', {
  close: () => ipcRenderer.send('agent-alert:close'),
  contextMenu: () => ipcRenderer.send('agent-alert:context-menu'),
  setMousePassthrough: (passthrough) => ipcRenderer.send('agent-alert:mouse-passthrough', Boolean(passthrough)),
  startResize: (edge, screenX, screenY) => ipcRenderer.send('agent-alert:resize-start', { edge, screenX, screenY }),
  moveResize: (screenX, screenY) => ipcRenderer.send('agent-alert:resize-move', { screenX, screenY }),
  endResize: () => ipcRenderer.send('agent-alert:resize-end'),
  persist: (state) => ipcRenderer.send('agent-alert:persist', state),
  onInitialize: (callback) => ipcRenderer.on('agent-alert:initialize', (_event, payload) => callback(payload)),
  onCommand: (callback) => ipcRenderer.on('agent-alert:command', (_event, command) => callback(command)),
});
