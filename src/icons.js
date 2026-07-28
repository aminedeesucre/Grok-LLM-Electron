const fs = require('fs');
const path = require('path');
const { app, net } = require('electron');
const { isValidId } = require('./url-policy');

const iconsDir = () => path.join(app.getPath('userData'), 'icons');

// Icon filenames are built from the id, so it never reaches a path unchecked.
function iconPath(id, ext) {
  if (!isValidId(id)) throw new Error(`Refusing to build a path from id "${id}"`);
  return path.join(iconsDir(), `${id}.${ext}`);
}

const defaultIcon = () => path.join(__dirname, '..', 'assets', 'icon.png');

// Try a few sources for a decent-resolution site icon and save it to
// userData/icons/<id>.<ext>. Returns the saved path, or null.
async function fetchIcon(siteUrl, id) {
  let parsed;
  try {
    parsed = new URL(siteUrl);
  } catch {
    return null;
  }

  const candidates = [
    { url: `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=256`, ext: 'png' },
    { url: new URL('/apple-touch-icon.png', parsed.origin).toString(), ext: 'png' },
    { url: new URL('/favicon.ico', parsed.origin).toString(), ext: 'ico' },
  ];

  for (const { url, ext } of candidates) {
    try {
      const res = await net.fetch(url, { redirect: 'follow' });
      if (!res.ok) continue;
      const type = (res.headers.get('content-type') || '').toLowerCase();
      if (type.includes('text/html')) continue; // soft-404 pages
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 100) continue;
      const file = iconPath(id, ext);
      fs.mkdirSync(iconsDir(), { recursive: true });
      removeIcon(id); // drop any stale icon with another extension
      fs.writeFileSync(file, buf);
      return file;
    } catch {
      // Network hiccup or bad URL — try the next candidate.
    }
  }
  return null;
}

const ICON_EXTS = ['png', 'ico', 'jpg', 'jpeg', 'svg'];

function setCustomIcon(id, sourcePath) {
  const picked = path.extname(sourcePath).slice(1).toLowerCase();
  const ext = ICON_EXTS.includes(picked) ? picked : 'png';
  const file = iconPath(id, ext);
  fs.mkdirSync(iconsDir(), { recursive: true });
  removeIcon(id);
  fs.copyFileSync(sourcePath, file);
  return file;
}

function removeIcon(id) {
  for (const ext of ICON_EXTS) {
    try {
      fs.unlinkSync(iconPath(id, ext));
    } catch {
      // didn't exist
    }
  }
}

module.exports = { fetchIcon, setCustomIcon, removeIcon, defaultIcon };
