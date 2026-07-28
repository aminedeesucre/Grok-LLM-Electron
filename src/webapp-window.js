const { app, BrowserWindow, dialog, shell } = require('electron');
const store = require('./store');
const { defaultIcon } = require('./icons');
const { desktopFileName } = require('./desktop-entry');

// "Same site" = same registrable-ish domain, so auth subdomains
// (accounts.example.com) stay inside the app window.
function sameSite(a, b) {
  try {
    const base = (u) => new URL(u).hostname.split('.').slice(-2).join('.');
    return base(a) === base(b);
  } catch {
    return false;
  }
}

function open(id) {
  const conf = store.getApp(id);
  if (!conf) {
    dialog.showErrorBox(
      'WebApp Forge',
      `No web app with id "${id}" exists. It may have been deleted — remove its menu entry from the manager.`
    );
    app.quit();
    return;
  }

  // Lets KDE (especially on Wayland) match this window to its .desktop entry.
  app.setDesktopName(desktopFileName(id));

  const bounds = conf.bounds || {};
  const win = new BrowserWindow({
    width: bounds.width || 1280,
    height: bounds.height || 840,
    x: bounds.x,
    y: bounds.y,
    title: conf.name,
    icon: conf.icon || defaultIcon(),
    autoHideMenuBar: true,
    backgroundColor: '#111318',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      // Isolated persistent profile per app: separate cookies/logins.
      partition: `persist:webapp-${id}`,
    },
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (sameSite(url, conf.url)) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          autoHideMenuBar: true,
          icon: conf.icon || defaultIcon(),
        },
      };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });

  win.on('close', () => {
    store.updateApp(id, { bounds: win.getNormalBounds() });
  });

  win.loadURL(conf.url);
}

module.exports = { open };
