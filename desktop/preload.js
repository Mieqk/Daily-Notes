// Мост между сайтом и приложением: открыть ссылку в браузере и получить ссылку возврата входа.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('dailyNotesDesktop', {
  openExternal: (url) => ipcRenderer.invoke('open-external', String(url)),
  getLaunchUrl: () => ipcRenderer.invoke('launch-url'),
  // Остров Atoll (Windows): уведомление и «живая активность» в его пилюле; без острова вызовы ничего не делают.
  island: {
    notify: (p) => ipcRenderer.invoke('island-send', 'notify', p),
    activity: (p) => ipcRenderer.invoke('island-send', 'activity', p),
    // общий список задач на сегодня: возвращает действия с острова или null
    syncTasks: (p) => ipcRenderer.invoke('island-tasks', p),
  },
  onUrl: (cb) => {
    const handler = (_e, url) => cb(url);
    ipcRenderer.on('app-url', handler);
    return () => ipcRenderer.removeListener('app-url', handler);
  },
});
