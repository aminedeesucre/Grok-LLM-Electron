# WebApp Forge

Turn **any website** into a native-feeling desktop app — and pin it to your taskbar with its own icon.

Grew out of a single-purpose Grok wrapper; now it forges unlimited web apps. Paste a URL, get an app. Arch Linux / KDE optimized, but works on any Linux desktop.

> Formerly `Grok-LLM-Electron`. If you cloned it under the old name, point your remote at the new one:
> `git remote set-url origin https://github.com/aminedeesucre/WebApp-Forge.git`

---

## Contents

- [What it does](#-what-it-does)
- [Installation](#️-installation)
- [Usage](#-usage)
- [Building an AppImage](#-building-an-appimage)
- [How the taskbar integration works](#️-how-the-taskbar-integration-works)
- [Security model](#-security-model)
- [Testing](#-testing)
- [Project layout](#-project-layout)
- [Where your data lives](#-where-your-data-lives)
- [Troubleshooting](#-troubleshooting)

---

## ✨ What it does

- **Manager UI** — paste a URL, WebApp Forge grabs the site's icon and creates a web app.
- **Real windows** — every web app runs in its own process with its own window, icon, and taskbar entry (not a browser tab).
- **Isolated profiles** — each app keeps its own cookies and logins, so you can run two accounts of the same service side by side.
- **One-click pin** — writes a proper `.desktop` entry to `~/.local/share/applications` with a matching `StartupWMClass`, so KDE groups the window under the right icon and you can pin it to the Task Manager.
- **Smart links** — same-site links stay in the app; external links open in your default browser.
- **Permission prompts** — a wrapped site has to ask before it gets your camera, mic, or location.
- **Remembers geometry** — windows reopen where you left them.

---

## 🛠️ Installation

### 1. Clone the repo

```bash
git clone https://github.com/aminedeesucre/WebApp-Forge.git
cd WebApp-Forge
```

### 2. Install dependencies

```bash
sudo pacman -Syu nodejs npm base-devel git   # Arch essentials
npm install
```

WebApp Forge has **no runtime dependencies** — only Electron and electron-builder as dev dependencies.

### 3. Run it

```bash
npm start
```

---

## 🚀 Usage

1. Launch the manager (`npm start`). Click **Add to app menu** once, top right, and you can open it from your launcher from then on — no terminal needed.
2. Paste a URL (e.g. `grok.com`) — or click one of the quick-add chips (Grok, ChatGPT, Claude, YouTube, WhatsApp, Gmail, Notion, GitHub). The scheme is optional; `grok.com` becomes `https://grok.com/`.
3. **Launch** opens the app in its own window and its own process.
4. **Pin** adds it to your application menu. Then open your launcher, right-click the app, and choose **"Pin to Task Manager"**. It's now on your taskbar with the site's icon.
5. **Edit** lets you rename it, change the URL, re-fetch the icon, or pick a custom icon file.
6. **Delete** removes the app, its menu entry, and its icon.

Renaming or re-iconing a **pinned** app rewrites its `.desktop` entry automatically.

You only need the manager when adding or changing apps — pinned apps launch straight from the taskbar, with no manager and no terminal in the loop.

---

## 📦 Building an AppImage

```bash
npm run build
```

Outputs `dist/WebAppForge-2.0.0.AppImage`.

> **Pin apps _after_ moving the AppImage somewhere permanent** (e.g. `~/Apps/`). Generated `.desktop` entries point at the binary that created them, so a pinned app breaks if you later move or delete that binary. Re-pin from the manager to fix it.

---

## 🖥️ How the taskbar integration works

Pinning writes `~/.local/share/applications/webapp-forge-<id>.desktop`:

```ini
[Desktop Entry]
Name=Grok
Exec="/home/you/Apps/WebAppForge.AppImage" --app=grok-2287 --class=webapp-forge-grok-2287
Icon=/home/you/.config/webapp-forge/icons/grok-2287.png
Type=Application
StartupWMClass=webapp-forge-grok-2287
```

The pieces that make the taskbar behave:

| Mechanism | Why it's there |
|---|---|
| `--app=<id>` | Relaunches this same install in web-app mode instead of opening the manager. |
| `--class=<wmclass>` | Sets the X11 `WM_CLASS` so each app is a distinct window class, not a generic "Electron" window. |
| `StartupWMClass` | Lets X11 taskbars match the running window back to this `.desktop` entry. |
| `app.setDesktopName()` | The Wayland equivalent — matches the window's `app_id` to the same file. |

Without these, KDE lumps every web app under one shared Electron icon.

---

## 🔒 Security model

A tool that wraps arbitrary websites is running untrusted code by design, so the boundaries are explicit.

**Each web app window** runs with `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`, and **no preload script** — page JavaScript has no bridge to Node, the filesystem, or the app's IPC handlers. Each app also gets its own `persist:webapp-<id>` session partition, so cookies and storage never cross between apps.

**The manager window** is the only window with a preload bridge. It loads local files only, under a `default-src 'self'` CSP, and builds every DOM node with `textContent` — never `innerHTML`.

Specific protections, each covered by a test:

- **Only `http(s)` reaches the OS URL dispatcher.** Page JavaScript can pass any scheme to `window.open()`. Chromium filters `file://`, but `smb://` and registered custom schemes arrive verbatim — and handing those to `xdg-open` launches whatever local application claims them. Everything that isn't `http`/`https` is dropped.
- **Same-site matching is public-suffix aware.** Naive "last two labels" matching would treat `evil.github.io` and `yourproject.github.io` as the same site, and every `*.co.uk` domain as one site. A suffix list prevents that collapse.
- **Sensitive permissions are prompted.** Electron grants permission requests *by default* — a wrapped site could otherwise take the camera silently. Camera, mic, geolocation, MIDI, HID, serial, and USB now prompt. The answer is remembered for the session so a call app doesn't re-prompt on every join.
- **Navigation is scheme-restricted, and off-site navigation is visible.** The window has no address bar, so when a page navigates away from the app's own site the title bar shows the current host.
- **`.desktop` values are control-character stripped.** A newline in a value would end the key and let the rest be parsed as its own directive, including another `Exec=`.
- **App ids can't escape their directory.** Ids index into filenames, so they're validated against `^[a-z0-9][a-z0-9-]{0,63}$` at the filesystem boundary rather than joined into a path unchecked.

All of this lives in [`src/url-policy.js`](src/url-policy.js), which has no Electron dependency so it can be unit tested directly.

---

## 🧪 Testing

```bash
npm test        # unit tests — fast, no display needed
npm run test:e2e   # integration tests — drives real Electron under Xvfb
npm run test:all   # both
```

**Unit tests** (`test/url-policy.test.js`) cover the policy logic: scheme filtering, public-suffix handling, URL normalization, slug generation, `.desktop` escaping, and id validation.

**Integration tests** (`test/e2e/main.js`) load a deliberately hostile page into a real web app window and assert on actual behavior:

- hostile schemes (`file://`, `smb://`, custom) never reach the OS URL dispatcher
- a genuine external link still opens in the browser
- a sensitive permission is prompted rather than auto-granted
- denying the prompt blocks the camera, and `permissions.query` agrees
- allowing the prompt grants it, and the user is asked exactly once

The integration suite is verified to actually fail when the protection is removed — reintroducing the unfiltered `openExternal` call makes it report the `smb://` and custom-scheme URLs reaching the dispatcher.

`test:e2e` needs `xvfb-run` (`sudo pacman -S xorg-server-xvfb`). On a machine with a display you can run `electron test/e2e` directly.

---

## 📁 Project layout

```
main.js                 entry point — routes to manager or web-app mode
preload.js              the manager's IPC bridge (contextBridge)
src/
  url-policy.js         all security-relevant string decisions; no Electron dep
  manager.js            manager window + IPC handlers
  webapp-window.js      a single web app's window and its policy wiring
  store.js              webapps.json read/write
  icons.js              icon fetching and custom icons
  desktop-entry.js      .desktop file generation
  launcher.js           spawns a web app as its own detached process
ui/                     manager interface (index.html, style.css, renderer.js)
test/
  url-policy.test.js    unit tests
  e2e/main.js           Electron integration tests
```

---

## 💾 Where your data lives

| Path | Contents |
|---|---|
| `~/.config/webapp-forge/webapps.json` | Your app definitions (name, URL, icon path, window bounds). |
| `~/.config/webapp-forge/icons/` | Downloaded and custom icons. |
| `~/.config/webapp-forge/Partitions/` | Per-app cookies and storage. |
| `~/.local/share/applications/webapp-forge-*.desktop` | Menu entries for pinned apps. |

To back up your apps, copy `webapps.json` and `icons/`. Deleting an app through the manager cleans up all of the above except its session partition.

---

## 🔧 Troubleshooting

**A pinned app doesn't appear in the launcher.**
```bash
update-desktop-database ~/.local/share/applications/
```
The manager runs this automatically, but some desktops need a moment or a re-login.

**The taskbar shows a generic Electron icon instead of the site's.**
The window's `WM_CLASS` isn't matching `StartupWMClass`. Check them with `xprop WM_CLASS` (click the window) against the `.desktop` file. Re-pinning from the manager rewrites the entry.

**A pinned app stopped launching.**
Its `Exec=` points at the binary that created it. If you moved or rebuilt the AppImage, unpin and re-pin from the manager.

**No icon was fetched.**
Icon lookup needs network access and tries the Google favicon service, then `/apple-touch-icon.png`, then `/favicon.ico`. If all fail the card shows a colored monogram. Use **Edit → Re-fetch icon**, or **Choose icon…** to pick your own file.

**A site asks for the camera and nothing happens.**
Permission prompts are per-session. If you denied it earlier in this run, quit the app window and relaunch to be asked again.

---

## License

MIT
