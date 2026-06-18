const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  saveProject: (data) => ipcRenderer.invoke('save-project', data),
  loadProject: () => ipcRenderer.invoke('load-project'),
  saveRecentProject: (filePath, fileName) => ipcRenderer.invoke('save-recent-project', filePath, fileName),
  getRecentProject: () => ipcRenderer.invoke('get-recent-project'),
  loadRecentProject: () => ipcRenderer.invoke('load-recent-project')
})
