const { app, BrowserWindow, dialog, shell } = require('electron');
const store = require('./store');
const { defaultIcon } = require('./icons');
const { desktopFileName } = require('./desktop-entry');

const WEB_SCHEMES = new Set(['http:', 'https:']);

// Suffixes under which the last two labels are a registry, not a registrable
// domain. Without this, every *.github.io site would count as "same site" as
// any other, and a link to attacker.github.io would open inside the app.
const MULTI_LABEL_SUFFIXES = new Set([
  'co.uk', 'org.uk', 'ac.uk', 'gov.uk', 'me.uk', 'co.jp', 'ne.jp', 'or.jp',
  'co.kr', 'com.au', 'net.au', 'org.au', 'co.nz', 'com.br', 'com.cn',
  'com.mx', 'co.in', 'co.za', 'co.il', 'com.tr', 'com.sg',
  'github.io', 'gitlab.io', 'pages.dev', 'workers.dev', 'herokuapp.com',
  'netlify.app', 'vercel.app', 'firebaseapp.com', 'web.app', 'glitch.me',
  'repl.co', 'onrender.com', 'fly.dev', 'azurewebsites.net', 'appspot.com',
  'blogspot.com', 'wordpress.com', 'notion.site', 'sharepoint.com',
]);

function registrableDomain(hostname) {
  const labels = hostname.split('.');
  if (labels.length <= 2) return hostname;
  const lastTwo = labels.slice(-2).join('.');
  return MULTI_LABEL_SUFFIXES.has(lastTwo) ? labels.slice(-3).join('.') : lastTwo;
}

// "Same site" = same registrable domain, so auth subdomains
// (accounts.example.com) stay inside the app window.
function sameSite(a, b) {
  try {
    const ua = new URL(a);
    const ub = new URL(b);
    if (!WEB_SCHEMES.has(ua.protocol) || !WEB_SCHEMES.has(ub.protocol)) return false;
    return registrableDomain(ua.hostname) === registrableDomain(ub.hostname);
  } catch {
    return false;
  }
}

// Only ever hand http(s) to the OS URL dispatcher. Page JavaScript can pass
// any scheme to window.open — Chromium filters file:// for us, but smb:// and
// registered custom schemes reach us verbatim, and xdg-open would launch
// whatever local handler claims them.
function openExternalSafely(url) {
  try {
    if (WEB_SCHEMES.has(new URL(url).protocol)) shell.openExternal(url);
  } catch {
    // Unparseable URL — drop it.
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
    openExternalSafely(url);
    return { action: 'deny' };
  });

  // Page JS can navigate the top frame anywhere. Non-web schemes never make
  // sense here, and cross-site navigation is kept visible in the title bar
  // since the window has no address bar to reveal where you ended up.
  win.webContents.on('will-navigate', (event, url) => {
    let target;
    try {
      target = new URL(url);
    } catch {
      event.preventDefault();
      return;
    }
    if (!WEB_SCHEMES.has(target.protocol)) {
      event.preventDefault();
      return;
    }
    win.setTitle(sameSite(url, conf.url) ? conf.name : `${conf.name} — ${target.hostname}`);
  });

  // Electron grants permissions by default; a site-specific browser wrapping
  // arbitrary sites should ask before handing over camera, mic, or location.
  win.webContents.session.setPermissionRequestHandler((_wc, permission, callback) => {
    const sensitive = ['media', 'geolocation', 'midiSysex', 'hid', 'serial', 'usb'];
    if (!sensitive.includes(permission)) return callback(true);
    const choice = dialog.showMessageBoxSync(win, {
      type: 'question',
      buttons: ['Deny', 'Allow'],
      defaultId: 0,
      cancelId: 0,
      title: conf.name,
      message: `Allow ${conf.name} to use ${permission}?`,
      detail: conf.url,
    });
    callback(choice === 1);
  });

  win.on('close', () => {
    store.updateApp(id, { bounds: win.getNormalBounds() });
  });

  win.loadURL(conf.url);
}

module.exports = { open };
