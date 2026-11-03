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
  // Нет интернета: показываем короткую страницу с кнопкой «Повторить».
  // Диагностика: копим ошибки страницы; если через 6 секунд после загрузки сайт ничего не нарисовал,
  // показываем их на экране (вместо пустого окна). F12 или Ctrl+Shift+I открывают консоль, Ctrl+R перезагружает.
  const logs = [];
  const log = (line) => { logs.push(line); if (logs.length > 30) logs.shift(); };
  win.webContents.on('console-message', (_e, level, message, line, source) => { if (level >= 2) log(`${message} (${source}:${line})`); });
  win.webContents.on('preload-error', (_e, file, error) => log(`preload: ${error && error.message}`));
  win.webContents.on('render-process-gone', (_e, d) => log(`процесс страницы упал: ${d.reason}`));
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    const k = input.key.toLowerCase();
    if (k === 'f12' || (input.control && input.shift && k === 'i')) { win.webContents.toggleDevTools(); event.preventDefault(); }
    else if (input.control && k === 'r') { win.webContents.reload(); event.preventDefault(); }
  });
  const showProblem = (title, details) => {
    const esc = (t) => String(t).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    const html = '<meta charset="utf-8"><body style="font-family:sans-serif;background:#f5f5f0;color:#333;margin:0;padding:32px"><h2>' + esc(title) + '</h2><p>Нажмите «Повторить». Если не помогло, пришлите этот текст разработчику.</p><button onclick="location.href=\'' + SITE + '\'" style="padding:10px 20px;font-size:16px;border-radius:10px;border:0;background:#222;color:#fff;cursor:pointer">Повторить</button><pre style="white-space:pre-wrap;background:#fff;padding:12px;border-radius:8px;font-size:12px">' + esc(details) + '</pre>';
    win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  };
  win.webContents.on('did-finish-load', () => {
    if (!win.webContents.getURL().startsWith(SITE_ORIGIN)) return;
    setTimeout(async () => {
      if (win.isDestroyed() || !win.webContents.getURL().startsWith(SITE_ORIGIN)) return;
      try {
        const n = await win.webContents.executeJavaScript("document.getElementById('root') ? document.getElementById('root').childElementCount : -1");
        if (n === 0) showProblem('Сайт не отрисовался', `Адрес: ${win.webContents.getURL()}\nElectron ${process.versions.electron}, Chromium ${process.versions.chrome}\n\n` + (logs.join('\n') || 'Ошибок в консоли нет.'));
      } catch (e) { log(String(e)); }
    }, 6000);
  });
  win.webContents.on('did-fail-load', (_e, code, _d, _u, isMainFrame) => {
    if (!isMainFrame || code === -3) return;
    const html = '<meta charset="utf-8"><body style="font-family:sans-serif;background:#f5f5f0;color:#333;display:grid;place-items:center;height:100vh;margin:0;text-align:center"><div><h2>Нет соединения</h2><p>Daily Note нужен интернет.</p><button onclick="location.href=\'' + SITE + '\'" style="padding:10px 20px;font-size:16px;border-radius:10px;border:0;background:#222;color:#fff;cursor:pointer">Повторить</button></div>';
    win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
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
