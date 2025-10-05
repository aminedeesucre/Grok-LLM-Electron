const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,  // Security first—no Node in renderer
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')  // Optional bridge if needed later
    },
    icon: path.join(__dirname, 'iconx.png'),  // Grab a Grok logo PNG and drop it here
    titleBarStyle: 'hiddenInset',  // Sleek macOS-ish title (or 'default' for classic)
    autoHideMenuBar: true  // Clean look
  });

  mainWindow.loadURL('https://grok.com');  // Straight to the source—official and secure

  // Dev tools? Uncomment for debugging:
  // mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => { 
	  mainWindow = null; 
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
