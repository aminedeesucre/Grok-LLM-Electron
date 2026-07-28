// Integration tests: drive the real webapp window against a hostile page in
// a live Electron runtime. Run with `npm run test:e2e`.
//
// Unit tests cover the policy logic in isolation; these prove the policy is
// actually wired into the window — that a page cannot reach the OS URL
// dispatcher with a non-web scheme, and cannot take the camera unasked.

const path = require('path');
const http = require('http');
const electron = require('electron');
const { app, BrowserWindow } = electron;

const PROJECT = path.join(__dirname, '..', '..');
const results = [];
const openedExternally = [];
const prompts = [];

let promptAnswer = 0; // 0 = Deny, 1 = Allow
let BASE;

// Capture the two side effects under test instead of performing them.
electron.shell.openExternal = (url) => {
  openedExternally.push(url);
  return Promise.resolve();
};
electron.dialog.showMessageBox = async (_win, opts) => {
  prompts.push(opts.message);
  return { response: promptAnswer };
};

// Without a listener Electron quits once the last window closes, which would
// end the run halfway between scenarios.
app.on('window-all-closed', () => {});

const store = require(path.join(PROJECT, 'src', 'store.js'));
store.getApp = () => ({ id: 'e2e', name: 'E2E', url: BASE, icon: null });
store.updateApp = () => {};

const HOSTILE_SCHEMES = [
  'file:///etc/passwd',
  'smb://attacker.example/share',
  'evilscheme://payload?x=1',
];

const PAGE = `<!doctype html><html><body><script>
  const send = (m) => console.log('T:' + m);
  window.__run = async () => {
    ${JSON.stringify(HOSTILE_SCHEMES)}.forEach((u) => { try { window.open(u); } catch (e) {} });
    window.open('https://external.example/page');
    try {
      await navigator.mediaDevices.getUserMedia({ video: true });
      send('camera=granted');
    } catch (e) { send('camera=' + e.name); }
    try {
      const s = await navigator.permissions.query({ name: 'camera' });
      send('query=' + s.state);
    } catch (e) { send('query=threw'); }
    send('done');
  };
</script></body></html>`;

function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push({ name, ok, actual, expected });
  console.log(`${ok ? 'ok' : 'NOT OK'} - ${name}`);
  if (!ok) {
    console.log(`  expected: ${JSON.stringify(expected)}`);
    console.log(`  actual:   ${JSON.stringify(actual)}`);
  }
}

// The load can finish before the listener attaches, so check state first.
function waitForLoad(win) {
  if (!win.webContents.isLoadingMainFrame()) return Promise.resolve();
  return new Promise((resolve) => {
    win.webContents.once('did-finish-load', resolve);
    win.webContents.once('did-fail-load', resolve);
    setTimeout(resolve, 10000);
  });
}

function runPage(win) {
  return new Promise((resolve) => {
    const lines = [];
    win.webContents.on('console-message', (e) => {
      const text = (e && e.message) || '';
      if (String(text).startsWith('T:')) {
        lines.push(String(text).slice(2));
        if (String(text).endsWith('done')) resolve(lines);
      }
    });
    win.webContents.executeJavaScript('window.__run()').catch(() => {});
    setTimeout(() => resolve(lines), 15000);
  });
}

const trace = (m) => { if (process.env.E2E_TRACE) console.log('# trace: ' + m); };

async function scenario(answer) {
  trace(`scenario(${answer}) start`);
  promptAnswer = answer;
  openedExternally.length = 0;
  prompts.length = 0;

  require(path.join(PROJECT, 'src', 'webapp-window.js')).open('e2e');
  const win = BrowserWindow.getAllWindows().slice(-1)[0];
  win.hide();
  trace('window created, waiting for load');
  await waitForLoad(win);
  trace('loaded, running page');
  const lines = await runPage(win);
  trace('page done: ' + JSON.stringify(lines));
  win.destroy();
  return lines;
}

const server = http.createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(PAGE);
});

server.listen(0, '127.0.0.1', async () => {
  BASE = `http://127.0.0.1:${server.address().port}/`;
  await app.whenReady();

  // --- Scenario 1: user denies the permission prompt ---
  let lines = await scenario(0);

  check(
    'hostile schemes never reach the OS URL dispatcher',
    openedExternally.filter((u) => !u.startsWith('http')),
    []
  );
  check(
    'a genuine external link still opens in the browser',
    openedExternally,
    ['https://external.example/page']
  );
  check('a sensitive permission is prompted, not auto-granted', prompts.length, 1);
  check('denying the prompt blocks the camera', lines.includes('camera=NotAllowedError'), true);
  check('permissions.query agrees the camera is denied', lines.includes('query=denied'), true);

  // --- Scenario 2: user allows the permission prompt ---
  lines = await scenario(1);

  check('allowing the prompt grants the camera', lines.includes('camera=granted'), true);
  check('permissions.query agrees the camera is granted', lines.includes('query=granted'), true);
  check('the user is asked exactly once', prompts.length, 1);

  const failed = results.filter((r) => !r.ok);
  console.log(`\n# ${results.length - failed.length}/${results.length} passed`);
  app.exit(failed.length ? 1 : 0);
});
