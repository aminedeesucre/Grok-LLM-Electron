const { app, BrowserWindow, dialog, shell } = require('electron');
const store = require('./store');
const { defaultIcon } = require('./icons');
const { desktopFileName } = require('./desktop-entry');

const { sameSite, isWebUrl } = require('./url-policy');

// Only ever hand http(s) to the OS URL dispatcher.
function openExternalSafely(url) {
  if (isWebUrl(url)) shell.openExternal(url);
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
    openExternalSafely(url);
    return { action: 'deny' };
  });

  // Page JS can navigate the top frame anywhere. Non-web schemes never make
  // sense here, and cross-site navigation is kept visible in the title bar
  // since the window has no address bar to reveal where you ended up.
  win.webContents.on('will-navigate', (event, url) => {
    if (!isWebUrl(url)) {
      event.preventDefault();
      return;
    }
    const host = new URL(url).hostname;
    win.setTitle(sameSite(url, conf.url) ? conf.name : `${conf.name} — ${host}`);
  });

  // Electron grants permissions by default; a site-specific browser wrapping
  // arbitrary sites should ask before handing over camera, mic, or location.
  const SENSITIVE = ['media', 'geolocation', 'midiSysex', 'hid', 'serial', 'usb'];
  // Answered once per permission per run: a call app asks on every join, and
  // re-prompting each time would train the user to click Allow blindly.
  const decisions = new Map();

  win.webContents.session.setPermissionRequestHandler((_wc, permission, callback) => {
    if (!SENSITIVE.includes(permission)) return callback(true);
    if (decisions.has(permission)) return callback(decisions.get(permission));
    dialog
      .showMessageBox(win, {
        type: 'question',
        buttons: ['Deny', 'Allow'],
        defaultId: 0,
        cancelId: 0,
        title: conf.name,
        message: `Allow ${conf.name} to use ${permission}?`,
        detail: conf.url,
      })
      .then(({ response }) => {
        decisions.set(permission, response === 1);
        callback(response === 1);
      })
      .catch(() => callback(false));
  });

  // Synchronous checks (permissions.query, autoplay probes) must agree with
  // what was actually decided, and never report a sensitive permission as
  // pre-granted before the user has been asked.
  win.webContents.session.setPermissionCheckHandler((_wc, permission) => {
    if (!SENSITIVE.includes(permission)) return true;
    return decisions.get(permission) === true;
  });

  win.on('close', () => {
    store.updateApp(id, { bounds: win.getNormalBounds() });
  });

  win.loadURL(conf.url);
}

module.exports = { open };
