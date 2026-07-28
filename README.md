# WebApp Forge

Turn **any website** into a native-feeling desktop app — and pin it to your taskbar with its own icon.

Grew out of a single-purpose Grok wrapper; now it forges unlimited web apps. Paste a URL, get an app. Arch Linux / KDE optimized, but works on any Linux desktop.

## ✨ What it does

- **Manager UI** — paste a URL, WebApp Forge grabs the site's icon and creates a web app.
- **Real windows** — every web app runs in its own process with its own window, icon, and taskbar entry (not a browser tab).
- **Isolated profiles** — each app keeps its own cookies and logins (two WhatsApps? Sure).
- **One-click pin** — writes a proper `.desktop` entry to `~/.local/share/applications` with a matching `StartupWMClass`, so KDE groups the window under the right icon and you can pin it to the Task Manager.
- **Smart links** — same-site popups stay in the app; external links open in your default browser.
- **Remembers geometry** — windows reopen where you left them.

## 🛠️ Installation

### 1. Clone the repo

```
git clone https://github.com/aminedeesucre/Grok-LLM-Electron.git
cd Grok-LLM-Electron
```

### 2. Install dependencies

```
sudo pacman -Syu nodejs npm base-devel git   # Arch essentials
npm install
```

### 3. Run it

```
npm start
```

## 🚀 Usage

1. Launch the manager (`npm start`).
2. Paste a URL (e.g. `grok.com`) — or hit one of the quick-add chips (Grok, ChatGPT, YouTube, WhatsApp…).
3. **Launch** opens the app in its own window.
4. **Pin** adds it to your application menu. Then: open your launcher → right-click the app → **"Pin to Task Manager"**. Done — it's on your taskbar with the site's icon.
5. **Edit** lets you rename, change the URL, re-fetch the icon, or pick a custom icon file.

Deleting an app also removes its menu entry and icon.

## 📦 Build an AppImage (optional)

```
npm run build
```

Outputs `dist/WebAppForge-2.0.0.AppImage`. Copy it somewhere permanent (e.g. `~/Apps/`) **before** pinning apps — the generated `.desktop` entries point at the binary that created them.

## ⚙️ How the taskbar magic works

For each pinned app, WebApp Forge writes `~/.local/share/applications/webapp-forge-<id>.desktop`:

- `Exec` relaunches WebApp Forge in app mode (`--app=<id>`) with a unique window class (`--class=webapp-forge-<id>`).
- `StartupWMClass` matches that class, so X11 taskbars attach the window to the right entry.
- On Wayland, the app sets its desktop name to the same file, so KDE matches it by `app_id`.
- Icons live in `~/.config/webapp-forge/icons/`; app definitions in `~/.config/webapp-forge/webapps.json`.

If a new entry doesn't show up in the launcher instantly:

```
update-desktop-database ~/.local/share/applications/
```

## License

MIT
