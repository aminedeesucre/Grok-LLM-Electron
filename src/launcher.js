const { spawn } = require('child_process');
const { app } = require('electron');
const { wmClass } = require('./desktop-entry');

// Launch a web app as its own detached process so it gets its own
// taskbar entry, WM class, and lifetime independent of the manager.
function launch(id) {
  let cmd;
  const args = [];
  if (process.env.APPIMAGE) {
    cmd = process.env.APPIMAGE;
  } else if (app.isPackaged) {
    cmd = process.execPath;
  } else {
    cmd = process.execPath;
    args.push(app.getAppPath());
  }
  args.push(`--app=${id}`, `--class=${wmClass(id)}`);
  // Propagate sandbox flags (e.g. dev setups running as root).
  if (process.argv.includes('--no-sandbox')) args.push('--no-sandbox');
  const child = spawn(cmd, args, { detached: true, stdio: 'ignore' });
  child.unref();
}

module.exports = { launch };
