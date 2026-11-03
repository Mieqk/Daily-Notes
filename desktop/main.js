// Daily Note для ПК: окно Electron, которое открывает сайт (как APK на Capacitor).
// Приложение обновляется вместе с сайтом. Вход через Google идёт в системном браузере
// (Google не пускает OAuth во встроенные окна) и возвращается по ссылке io.vercel.dailynotes://auth.
const { app, BrowserWindow, Menu, ipcMain, session, shell } = require('electron');
const path = require('path');

const SITE = process.env.DAILY_NOTES_URL || 'https://daily-notes-io.vercel.app';
const SITE_ORIGIN = new URL(SITE).origin;
const SCHEME = 'io.vercel.dailynotes';
const PERMISSIONS = new Set(['media', 'notifications', 'clipboard-read', 'clipboard-sanitized-write', 'fullscreen', 'geolocation']);

let win = null;
let pendingUrl = null;

const isAppLink = (arg) => typeof arg === 'string' && arg.startsWith(`${SCHEME}://`);

function sendUrl(url) {
  if (!isAppLink(url)) return;
  if (win && !win.isDestroyed() && !win.webContents.isLoading()) {
    win.webContents.send('app-url', url);
  } else {
    pendingUrl = url;
  }
}

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 480,
    minHeight: 600,
    backgroundColor: '#f5f5f0',
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.loadURL(SITE);

  // Внешние ссылки открываются в браузере, окно приложения остаётся на сайте.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(SITE_ORIGIN)) return { action: 'allow' };
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith(SITE_ORIGIN)) return;
    event.preventDefault();
    if (/^https?:/.test(url)) shell.openExternal(url);
  });
  win.webContents.on('did-finish-load', () => {
    if (pendingUrl) { win.webContents.send('app-url', pendingUrl); pendingUrl = null; }
  });
  // Сайт не загрузился: показываем код ошибки (по нему видно, сеть это, прокси, сертификат или блокировка).
  win.webContents.on('did-fail-load', (_e, code, desc, url, isMainFrame) => {
    if (!isMainFrame || code === -3 || url.startsWith('data:')) return;
    showProblem('Сайт не загрузился', `Ошибка ${code}: ${desc}\nАдрес: ${url}\nElectron ${process.versions.electron}, Chromium ${process.versions.chrome}`);
  });
}

ipcMain.handle('open-external', (_e, url) => { if (/^https:/.test(url)) return shell.openExternal(url); });

if (process.defaultApp && process.argv[1]) {
  app.setAsDefaultProtocolClient(SCHEME, process.execPath, [path.resolve(process.argv[1])]);
} else {
  app.setAsDefaultProtocolClient(SCHEME);
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', (_e, argv) => {
    if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
    sendUrl(argv.find(isAppLink));
  });
  app.on('open-url', (event, url) => { event.preventDefault(); sendUrl(url); }); // macOS

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    // Микрофон и камера нужны для звонков, уведомления для напоминаний; только для нашего сайта.
    session.defaultSession.setPermissionRequestHandler((wc, permission, cb) => {
      cb(wc.getURL().startsWith(SITE_ORIGIN) && PERMISSIONS.has(permission));
    });
    session.defaultSession.setPermissionCheckHandler((_wc, permission, origin) => origin.startsWith(SITE_ORIGIN) && PERMISSIONS.has(permission));
    pendingUrl = process.argv.find(isAppLink) || null;
    createWindow();
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
  });
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
}
