const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { app } = require('electron');
const { slugify } = require('./url-policy');

const storeFile = () => path.join(app.getPath('userData'), 'webapps.json');

function load() {
  try {
    const data = JSON.parse(fs.readFileSync(storeFile(), 'utf8'));
    if (Array.isArray(data.apps)) return data;
  } catch {
    // First run or corrupt file — start fresh.
  }
  return { apps: [] };
}

function save(data) {
  fs.mkdirSync(path.dirname(storeFile()), { recursive: true });
  fs.writeFileSync(storeFile(), JSON.stringify(data, null, 2));
}

function listApps() {
  return load().apps;
}

function getApp(id) {
  return listApps().find((a) => a.id === id) || null;
}

function newId(name) {
  return `${slugify(name)}-${crypto.randomBytes(2).toString('hex')}`;
}

function addApp({ name, url, icon }) {
  const data = load();
  const entry = {
    id: newId(name),
    name,
    url,
    icon: icon || null,
    createdAt: new Date().toISOString(),
  };
  data.apps.push(entry);
  save(data);
  return entry;
}

function updateApp(id, patch) {
  const data = load();
  const entry = data.apps.find((a) => a.id === id);
  if (!entry) return null;
  Object.assign(entry, patch);
  save(data);
  return entry;
}

function removeApp(id) {
  const data = load();
  const idx = data.apps.findIndex((a) => a.id === id);
  if (idx === -1) return null;
  const [removed] = data.apps.splice(idx, 1);
  save(data);
  return removed;
}

module.exports = { listApps, getApp, addApp, updateApp, removeApp };
