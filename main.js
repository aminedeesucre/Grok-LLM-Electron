const { app } = require('electron');
const path = require('path');

// Stable name so userData (config, icons, sessions) lives in one place
// no matter which mode we start in.
app.setName('webapp-forge');

const appArg = process.argv.find((a) => a.startsWith('--app='));
const appId = appArg ? appArg.slice('--app='.length) : null;

app.whenReady().then(() => {
  if (appId) {
    // Launched as a specific web app (from the manager or a .desktop entry).
    require(path.join(__dirname, 'src', 'webapp-window')).open(appId);
  } else {
    require(path.join(__dirname, 'src', 'manager')).open();
  }
});

app.on('window-all-closed', () => {
  // Every web app runs as its own process, so quitting on last-window-closed
  // is the right behavior in both modes (including macOS).
  app.quit();
});
