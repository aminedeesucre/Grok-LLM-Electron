// Every security-relevant string decision in one place, with no Electron
// dependency, so it can be unit tested directly.

const WEB_SCHEMES = new Set(['http:', 'https:']);

// Suffixes under which the last two labels are a registry, not a registrable
// domain. Without this, every *.github.io site would count as "same site" as
// any other, and a link to attacker.github.io would open inside the app.
const MULTI_LABEL_SUFFIXES = new Set([
  'co.uk', 'org.uk', 'ac.uk', 'gov.uk', 'me.uk', 'co.jp', 'ne.jp', 'or.jp',
  'co.kr', 'com.au', 'net.au', 'org.au', 'co.nz', 'com.br', 'com.cn',
  'com.mx', 'co.in', 'co.za', 'co.il', 'com.tr', 'com.sg',
  'github.io', 'gitlab.io', 'pages.dev', 'workers.dev', 'herokuapp.com',
  'netlify.app', 'vercel.app', 'firebaseapp.com', 'web.app', 'glitch.me',
  'repl.co', 'onrender.com', 'fly.dev', 'azurewebsites.net', 'appspot.com',
  'blogspot.com', 'wordpress.com', 'notion.site', 'sharepoint.com',
]);

function registrableDomain(hostname) {
  const labels = String(hostname).split('.');
  if (labels.length <= 2) return String(hostname);
  const lastTwo = labels.slice(-2).join('.');
  return MULTI_LABEL_SUFFIXES.has(lastTwo) ? labels.slice(-3).join('.') : lastTwo;
}

// True only for URLs safe to hand to the OS dispatcher or to load in a window.
// Page JavaScript can pass any scheme to window.open — Chromium filters
// file:// for us, but smb:// and registered custom schemes arrive verbatim,
// and xdg-open would launch whatever local handler claims them.
function isWebUrl(url) {
  try {
    return WEB_SCHEMES.has(new URL(url).protocol);
  } catch {
    return false;
  }
}

// "Same site" = same registrable domain, so auth subdomains
// (accounts.example.com) stay inside the app window.
function sameSite(a, b) {
  try {
    const ua = new URL(a);
    const ub = new URL(b);
    if (!WEB_SCHEMES.has(ua.protocol) || !WEB_SCHEMES.has(ub.protocol)) return false;
    return registrableDomain(ua.hostname) === registrableDomain(ub.hostname);
  } catch {
    return false;
  }
}

// Accepts what a person would actually type ("grok.com") and rejects anything
// that is not a plain web address.
function normalizeUrl(input) {
  let url = String(input || '').trim();
  if (!url) throw new Error('URL is required');
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(url)) url = `https://${url}`;
  const parsed = new URL(url); // throws on garbage
  if (!WEB_SCHEMES.has(parsed.protocol)) {
    throw new Error('Only http(s) URLs are supported');
  }
  if (!parsed.hostname) throw new Error('That URL has no host');
  return parsed.toString();
}

function nameFromUrl(url) {
  const host = new URL(url).hostname.replace(/^www\./, '');
  const label = host.split('.')[0];
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function slugify(name) {
  const slug = String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
  return slug || 'webapp';
}

// A newline in a .desktop value would end the key and let the rest be parsed
// as its own directive (including another Exec=), so collapse control chars.
const desktopValue = (v) => String(v).replace(/[\r\n\t\f\v\0]+/g, ' ');

// Ids index into the filesystem (icon files, .desktop entries), so anything
// outside the generated charset is rejected rather than joined into a path.
const isValidId = (id) => typeof id === 'string' && /^[a-z0-9][a-z0-9-]{0,63}$/.test(id);

module.exports = {
  WEB_SCHEMES,
  registrableDomain,
  isWebUrl,
  sameSite,
  normalizeUrl,
  nameFromUrl,
  slugify,
  desktopValue,
  isValidId,
};
