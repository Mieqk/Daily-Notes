// Daily Note для ПК: окно Electron, которое открывает сайт (как APK на Capacitor).
// Приложение обновляется вместе с сайтом. Вход через Google идёт в системном браузере
// (Google не пускает OAuth во встроенные окна) и возвращается по ссылке io.vercel.dailynotes://auth.
const { app, BrowserWindow, Menu, ipcMain, session, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');

const SITE = process.env.DAILY_NOTES_URL || 'https://daily-notes-io.vercel.app';
const SITE_ORIGIN = new URL(SITE).origin;
const SCHEME = 'io.vercel.dailynotes';
const PERMISSIONS = new Set(['media', 'notifications', 'clipboard-read', 'clipboard-sanitized-write', 'fullscreen', 'geolocation']);

let win = null;
let pendingUrl = null;

// Строгая проверка адреса: startsWith пропустил бы daily-notes-io.vercel.app.evil.com
const isSite = (u) => { try { return new URL(u).origin === SITE_ORIGIN; } catch { return false; } };

const isAppLink = (arg) => typeof arg === 'string' && arg.startsWith(`${SCHEME}://`);

function sendUrl(url) {
  if (!isAppLink(url)) return;
  if (win && !win.isDestroyed() && !win.webContents.isLoading()) {
    win.webContents.send('app-url', url);
  } else {
    pendingUrl = url;
  }
}

// Страница с кодом ошибки вместо пустого окна и кнопкой «Повторить».
function showProblem(title, details) {
  if (!win || win.isDestroyed()) return;
  const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const html = '<meta charset="utf-8"><body style="font-family:sans-serif;background:#f5f5f0;color:#333;margin:0;padding:32px"><h2>' + esc(title) + '</h2><p>Нажмите «Повторить». Если не помогло, пришлите этот текст разработчику.</p><button onclick="location.href=\'' + SITE + '\'" style="padding:10px 20px;font-size:16px;border-radius:10px;border:0;background:#222;color:#fff;cursor:pointer">Повторить</button><pre style="white-space:pre-wrap;background:#fff;padding:12px;border-radius:8px;font-size:12px">' + esc(details) + '</pre>';
  win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
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
  // F12 или Ctrl+Shift+I открывают консоль, Ctrl+R перезагружает (меню скрыто).
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    const k = input.key.toLowerCase();
    if (k === 'f12' || (input.control && input.shift && k === 'i')) { win.webContents.toggleDevTools(); event.preventDefault(); }
    else if (input.control && k === 'r') { win.webContents.reload(); event.preventDefault(); }
  });

  // Внешние ссылки открываются в браузере, окно приложения остаётся на сайте.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isSite(url)) return { action: 'allow' };
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (isSite(url)) return;
    event.preventDefault();
    if (/^https?:/.test(url)) shell.openExternal(url);
  });
  // Сайт не загрузился: показываем код ошибки (по нему видно, сеть это, прокси, сертификат или блокировка).
  win.webContents.on('did-fail-load', (_e, code, desc, url, isMainFrame) => {
    if (!isMainFrame || code === -3 || url.startsWith('data:')) return;
    showProblem('Сайт не загрузился', `Ошибка ${code}: ${desc}\nАдрес: ${url}\nElectron ${process.versions.electron}, Chromium ${process.versions.chrome}`);
  });
}

// Ссылка, с которой приложение запустили (холодный старт): страница забирает её сама, когда подписалась, иначе событие ушло бы раньше слушателя.
ipcMain.handle('launch-url', () => { const u = pendingUrl; pendingUrl = null; return u; });
// Остров Atoll (необязательный сосед на Windows): показываем на нём прогресс задач, напоминание и таймер отдыха.
// Остров слушает только localhost и принимает вызовы с секретом из %LOCALAPPDATA%\DynamicIsland\bridge.token;
// сайт этого секрета не видит, его читает и шлёт только это приложение. Нет острова или токена: молча ничего не делаем.
const ISLAND_PORT = 47811;
function islandToken() {
  try {
    const base = process.env.LOCALAPPDATA;
    if (!base) return null;
    const t = fs.readFileSync(path.join(base, 'DynamicIsland', 'bridge.token'), 'utf8').trim();
    return t.length >= 32 ? t : null;
  } catch { return null; }
}
const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : undefined);
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
// Из страницы берём только известные поля: остров получает ровно то, что мы разрешили.
function islandPayload(kind, p) {
  if (kind === 'notify') {
    const url = str(p.url, 500);
    return { title: str(p.title, 80), text: str(p.text, 200), url: url && isSite(url) ? url : undefined };
  }
  return {
    id: str(p.id, 40), text: str(p.text, 80), progress: num(p.progress), endsAt: num(p.endsAt),
    durationSec: num(p.durationSec), ttlSec: num(p.ttlSec), clear: p.clear === true ? true : undefined,
  };
}
ipcMain.handle('island-send', (e, kind, payload) => {
  if (process.platform !== 'win32') return false;
  if (!e.senderFrame || !isSite(e.senderFrame.url)) return false;
  if (kind !== 'notify' && kind !== 'activity') return false;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return false;
  const token = islandToken();
  if (!token) return false;
  const body = JSON.stringify({ ...islandPayload(kind, payload), app: 'Daily Note' });
  return new Promise((resolve) => {
    const req = http.request({
      host: 'localhost', port: ISLAND_PORT, path: `/app/${kind}`, method: 'POST', timeout: 1500,
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), 'X-Island-Token': token },
    }, (res) => { res.resume(); resolve(res.statusCode === 200); });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.end(body);
  });
});
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
      cb(isSite(wc.getURL()) && PERMISSIONS.has(permission));
    });
    session.defaultSession.setPermissionCheckHandler((_wc, permission, origin) => isSite(origin) && PERMISSIONS.has(permission));
    pendingUrl = process.argv.find(isAppLink) || null;
    createWindow();
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
  });
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
}
