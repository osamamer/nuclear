const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('nuclearChromiumBridge', {
  invoke(command, args, options) {
    return ipcRenderer.invoke('nuclear:invoke', command, args, options);
  },
  onCallback(handler) {
    ipcRenderer.on('nuclear:callback', (_event, id, payload) =>
      handler(id, payload),
    );
  },
  architecture: process.arch,
  preferences: ipcRenderer.sendSync('nuclear:preferences'),
});
