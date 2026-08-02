const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const { app } = require('electron');
const { defaultIcon } = require('./icons');
const { desktopValue, isValidId } = require('./url-policy');

const applicationsDir = () => path.join(os.homedir(), '.local', 'share', 'applications');

const desktopFileName = (id) => `webapp-forge-${assertId(id)}.desktop`;
const desktopFilePath = (id) => path.join(applicationsDir(), desktopFileName(id));

function assertId(id) {
  if (!isValidId(id)) throw new Error(`Refusing to build a path from id "${id}"`);
  return id;
}

// Also used as the X11 WM_CLASS (via Chromium's --class switch) and the
// Wayland app_id (via app.setDesktopName), so the taskbar can match running
// windows to the right .desktop entry and icon.
const wmClass = (id) => `webapp-forge-${id}`;

// Quote a path for a .desktop Exec= line per the freedesktop spec.
function quoteExec(arg) {
  return `"${arg.replace(/(["`$\\])/g, '\\$1')}"`;
}

// How to relaunch this very install, however it was started.
function launchCommand() {
  if (process.env.APPIMAGE) return [quoteExec(process.env.APPIMAGE)];
  if (app.isPackaged) return [quoteExec(process.execPath)];
  // Dev install: electron binary + project dir.
  return [quoteExec(process.execPath), quoteExec(app.getAppPath())];
}

// The command that relaunches this install in web-app mode.
function execCommand(id) {
  return [...launchCommand(), `--app=${id}`, `--class=${wmClass(id)}`].join(' ');
}

function isPinned(id) {
  return fs.existsSync(desktopFilePath(id));
}

function pin(webApp) {
  fs.mkdirSync(applicationsDir(), { recursive: true });
  const name = desktopValue(webApp.name);
  const content = [
    '[Desktop Entry]',
    `Name=${name}`,
    `Comment=${name} — web app (WebApp Forge)`,
    `Exec=${execCommand(webApp.id)}`,
    `Icon=${desktopValue(webApp.icon || defaultIcon())}`,
    'Terminal=false',
    'Type=Application',
    'Categories=Network;',
    'StartupNotify=true',
    `StartupWMClass=${wmClass(webApp.id)}`,
    '',
  ].join('\n');
  fs.writeFileSync(desktopFilePath(webApp.id), content, { mode: 0o755 });
  refreshDatabase();
  return desktopFilePath(webApp.id);
}

function unpin(id) {
  try {
    fs.unlinkSync(desktopFilePath(id));
    refreshDatabase();
    return true;
  } catch {
    return false;
  }
}

// The manager itself. Without this the only way to open it from a source
// checkout is `npm start` from a terminal. The name matches package.json's
// desktopName so a packaged build and a source install agree on one entry.
const MANAGER_FILE = 'webapp-forge.desktop';
const MANAGER_WM_CLASS = 'webapp-forge';
const managerFilePath = () => path.join(applicationsDir(), MANAGER_FILE);

function isManagerPinned() {
  return fs.existsSync(managerFilePath());
}

function pinManager() {
  fs.mkdirSync(applicationsDir(), { recursive: true });
  const content = [
    '[Desktop Entry]',
    'Name=WebApp Forge',
    'Comment=Turn any website into a desktop app',
    `Exec=${[...launchCommand(), `--class=${MANAGER_WM_CLASS}`].join(' ')}`,
    `Icon=${desktopValue(defaultIcon())}`,
    'Terminal=false',
    'Type=Application',
    'Categories=Utility;',
    'StartupNotify=true',
    `StartupWMClass=${MANAGER_WM_CLASS}`,
    '',
  ].join('\n');
  fs.writeFileSync(managerFilePath(), content, { mode: 0o755 });
  refreshDatabase();
  return managerFilePath();
}

function unpinManager() {
  try {
    fs.unlinkSync(managerFilePath());
    refreshDatabase();
    return true;
  } catch {
    return false;
  }
}

function refreshDatabase() {
  // Best effort — KDE picks up new .desktop files on its own, but this
  // speeds it up where the tool exists.
  execFile('update-desktop-database', [applicationsDir()], () => {});
}

module.exports = {
  pin,
  unpin,
  isPinned,
  wmClass,
  desktopFileName,
  pinManager,
  unpinManager,
  isManagerPinned,
};
