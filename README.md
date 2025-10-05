# Grok-LLM-Electron

A lightweight, Arch Linux-optimized Electron wrapper for Grok which turns the web app into a native-feeling desktop.


## 🛠️ Installation
# 1. Clone the repo:

   ```
   git clone https://github.com/yourusername/grok-desktop-electron.git
   cd grok-desktop-electron
   ```
# 2. Install dependencies:

   ```
   sudo pacman -Syu nodejs npm base-devel git  # Arch essentials
   npm install
   ```
# 3. Build the AppImage:

   ```
   npm run build
   ```
   - Outputs to `dist/Grok Desktop-1.0.0.AppImage`. Copy to `~/Apps/grok-desktop.AppImage` for permanence.

## 🚀 Usage

- Launch: `./grok-desktop.AppImage` (or pin via KDE menu/Desktop).
- Sign in with your X account—chat, generate images, or voice-mode banter awaits.

## For KDE integration

- Create `~/.local/share/applications/grok-desktop.desktop` (see [example](desktop.example)).
- Pin to taskbar: Launch > right-click icon > "Pin to Task Manager."
