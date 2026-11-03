// Мост между сайтом и приложением: открыть ссылку в браузере и получить ссылку возврата входа.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('dailyNotesDesktop', {
  openExternal: (url) => ipcRenderer.invoke('open-external', String(url)),
  onUrl: (cb) => {
    const handler = (_e, url) => cb(url);
    ipcRenderer.on('app-url', handler);
    return () => ipcRenderer.removeListener('app-url', handler);
  },
});
