const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('forge', {
  list: () => ipcRenderer.invoke('apps:list'),
  add: (data) => ipcRenderer.invoke('apps:add', data),
  update: (id, data) => ipcRenderer.invoke('apps:update', id, data),
  remove: (id) => ipcRenderer.invoke('apps:remove', id),
  launch: (id) => ipcRenderer.invoke('apps:launch', id),
  pin: (id) => ipcRenderer.invoke('apps:pin', id),
  unpin: (id) => ipcRenderer.invoke('apps:unpin', id),
  refreshIcon: (id) => ipcRenderer.invoke('apps:refresh-icon', id),
  chooseIcon: (id) => ipcRenderer.invoke('apps:choose-icon', id),
});
