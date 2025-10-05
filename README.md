# Grok-LLM-Electron

A lightweight, Arch Linux-optimized Electron wrapper for Grok which turns the web app into a native-feeling desktop.





## 🛠️ Installation

# 1. Clone the repo:

   ```
   git clone [https://[github.com/yourusername/grok-desktop-electron.git](https://github.com/aminedeesucre/Grok-LLM-Electron.git)
   cd Grok-LLM-Electron
   ```


# 2. Install dependencies:

   ```
   sudo pacman -Syu nodejs npm base-devel git  # Arch essentials
   ```

# 3. Install Electron Dependencies

   ```
   npm install electron --save-dev
   npm install electron-builder --save-dev
   ```

   electron: The core engine.
   electron-builder: Packages your app into distributables (AppImage for Linux portability—runs anywhere without install fuss).


# 4. Build the AppImage:

   ```
   npm run build
   ```
   - Outputs to `dist/Grok Desktop-1.0.0.AppImage`. Copy AppImage file to `~/Apps/grok-desktop.AppImage` for permanence.

## 🚀 Usage

- Launch: `./grok-desktop.AppImage` (or pin via KDE menu/Desktop).
- Sign in with your X account—chat, generate images, or voice-mode banter awaits.

## For KDE integration

- Create `~/.local/share/applications/grok-desktop.desktop` (see [example](desktop.example)).
- Pin to taskbar: Launch > right-click icon > "Pin to Task Manager."
