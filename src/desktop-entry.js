const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const { app } = require('electron');
const { defaultIcon } = require('./icons');

const applicationsDir = () => path.join(os.homedir(), '.local', 'share', 'applications');

const desktopFileName = (id) => `webapp-forge-${id}.desktop`;
const desktopFilePath = (id) => path.join(applicationsDir(), desktopFileName(id));

// Also used as the X11 WM_CLASS (via Chromium's --class switch) and the
// Wayland app_id (via app.setDesktopName), so the taskbar can match running
// windows to the right .desktop entry and icon.
const wmClass = (id) => `webapp-forge-${id}`;

// Quote a path for a .desktop Exec= line per the freedesktop spec.
function quoteExec(arg) {
  return `"${arg.replace(/(["`$\\])/g, '\\$1')}"`;
}

// The command that relaunches this very install in web-app mode.
function execCommand(id) {
  const parts = [];
  if (process.env.APPIMAGE) {
    parts.push(quoteExec(process.env.APPIMAGE));
  } else if (app.isPackaged) {
    parts.push(quoteExec(process.execPath));
  } else {
    // Dev install: electron binary + project dir.
    parts.push(quoteExec(process.execPath), quoteExec(app.getAppPath()));
  }
  parts.push(`--app=${id}`, `--class=${wmClass(id)}`);
  return parts.join(' ');
}

function isPinned(id) {
  return fs.existsSync(desktopFilePath(id));
}

function pin(webApp) {
  fs.mkdirSync(applicationsDir(), { recursive: true });
  const content = [
    '[Desktop Entry]',
    `Name=${webApp.name}`,
    `Comment=${webApp.name} — web app (WebApp Forge)`,
    `Exec=${execCommand(webApp.id)}`,
    `Icon=${webApp.icon || defaultIcon()}`,
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

function refreshDatabase() {
  // Best effort — KDE picks up new .desktop files on its own, but this
  // speeds it up where the tool exists.
  execFile('update-desktop-database', [applicationsDir()], () => {});
}

module.exports = { pin, unpin, isPinned, wmClass, desktopFileName };
