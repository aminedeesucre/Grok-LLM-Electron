const path = require('path');
const { BrowserWindow, ipcMain, dialog } = require('electron');
const store = require('./store');
const icons = require('./icons');
const desktopEntry = require('./desktop-entry');
const launcher = require('./launcher');

const { normalizeUrl, nameFromUrl } = require('./url-policy');

function withPinned(app) {
  return { ...app, pinned: desktopEntry.isPinned(app.id) };
}

function registerIpc(win) {
  const handle = (channel, fn) => {
    ipcMain.handle(channel, async (_event, ...args) => {
      try {
        return { ok: true, ...(await fn(...args)) };
      } catch (err) {
        return { ok: false, error: err.message || String(err) };
      }
    });
  };

  handle('apps:list', () => ({ apps: store.listApps().map(withPinned) }));

  handle('apps:add', async ({ name, url }) => {
    const normalized = normalizeUrl(url);
    const finalName = String(name || '').trim() || nameFromUrl(normalized);
    const entry = store.addApp({ name: finalName, url: normalized });
    const icon = await icons.fetchIcon(normalized, entry.id);
    if (icon) store.updateApp(entry.id, { icon });
    return { app: withPinned(store.getApp(entry.id)) };
  });

  handle('apps:update', async (id, { name, url }) => {
    const existing = store.getApp(id);
    if (!existing) throw new Error('App not found');
    const normalized = normalizeUrl(url);
    const finalName = String(name || '').trim() || nameFromUrl(normalized);
    const hostChanged = new URL(normalized).hostname !== new URL(existing.url).hostname;
    store.updateApp(id, { name: finalName, url: normalized });
    if (hostChanged) {
      const icon = await icons.fetchIcon(normalized, id);
      store.updateApp(id, { icon: icon || null });
    }
    const updated = store.getApp(id);
    if (desktopEntry.isPinned(id)) desktopEntry.pin(updated);
    return { app: withPinned(updated) };
  });

  handle('apps:remove', (id) => {
    // Check first: unpin/removeIcon build filesystem paths out of the id.
    if (!store.getApp(id)) throw new Error('App not found');
    desktopEntry.unpin(id);
    icons.removeIcon(id);
    store.removeApp(id);
    return {};
  });

  handle('apps:launch', (id) => {
    if (!store.getApp(id)) throw new Error('App not found');
    launcher.launch(id);
    return {};
  });

  handle('apps:pin', (id) => {
    const app = store.getApp(id);
    if (!app) throw new Error('App not found');
    return { path: desktopEntry.pin(app), app: withPinned(app) };
  });

  handle('apps:unpin', (id) => {
    const app = store.getApp(id);
    if (!app) throw new Error('App not found');
    desktopEntry.unpin(id);
    return { app: withPinned(app) };
  });

  handle('apps:refresh-icon', async (id) => {
    const app = store.getApp(id);
    if (!app) throw new Error('App not found');
    const icon = await icons.fetchIcon(app.url, id);
    if (!icon) throw new Error('No icon found for this site');
    store.updateApp(id, { icon });
    const updated = store.getApp(id);
    if (desktopEntry.isPinned(id)) desktopEntry.pin(updated);
    return { app: withPinned(updated) };
  });

  handle('apps:choose-icon', async (id) => {
    const app = store.getApp(id);
    if (!app) throw new Error('App not found');
    const result = await dialog.showOpenDialog(win, {
      title: 'Choose an icon',
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'svg', 'ico'] }],
      properties: ['openFile'],
    });
    if (result.canceled || !result.filePaths.length) return { app: withPinned(app) };
    const icon = icons.setCustomIcon(id, result.filePaths[0]);
    store.updateApp(id, { icon });
    const updated = store.getApp(id);
    if (desktopEntry.isPinned(id)) desktopEntry.pin(updated);
    return { app: withPinned(updated) };
  });
}

function open() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 680,
    minHeight: 480,
    title: 'WebApp Forge',
    icon: icons.defaultIcon(),
    autoHideMenuBar: true,
    backgroundColor: '#0f1115',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '..', 'preload.js'),
    },
  });

  registerIpc(win);
  win.loadFile(path.join(__dirname, '..', 'ui', 'index.html'));
  return win;
}

module.exports = { open };
