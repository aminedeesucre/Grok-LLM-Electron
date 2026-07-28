const SUGGESTIONS = [
  { name: 'Grok', url: 'https://grok.com' },
  { name: 'ChatGPT', url: 'https://chatgpt.com' },
  { name: 'Claude', url: 'https://claude.ai' },
  { name: 'YouTube', url: 'https://youtube.com' },
  { name: 'WhatsApp', url: 'https://web.whatsapp.com' },
  { name: 'Gmail', url: 'https://mail.google.com' },
  { name: 'Notion', url: 'https://notion.so' },
  { name: 'GitHub', url: 'https://github.com' },
];

let apps = [];
let editingId = null;

const $ = (id) => document.getElementById(id);

let toastTimer;
function toast(msg, ms = 3500) {
  const el = $('toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, ms);
}

function fail(res) {
  toast(`Error: ${res.error}`);
}

function iconSrc(app) {
  if (!app.icon) return null;
  return `file://${encodeURI(app.icon)}?t=${Date.now()}`;
}

function monogram(app) {
  const node = el('div', 'card-icon monogram', (app.name[0] || '?').toUpperCase());
  let hash = 0;
  for (const ch of app.id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  node.style.background = `linear-gradient(135deg, hsl(${hash % 360} 55% 45%), hsl(${(hash % 360) + 40} 55% 32%))`;
  return node;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function render() {
  const grid = $('app-grid');
  grid.replaceChildren();
  $('empty-state').hidden = apps.length > 0;
  $('suggestions').hidden = apps.length > 0;
  if (apps.length === 0) renderSuggestions();

  for (const app of apps) {
    const card = el('div', 'card');

    const head = el('div', 'card-head');
    const src = iconSrc(app);
    let icon;
    if (src) {
      icon = el('img', 'card-icon');
      icon.alt = '';
      icon.src = src;
      // Fall back to a monogram if the file can't be displayed.
      icon.onerror = () => icon.replaceWith(monogram(app));
    } else {
      icon = monogram(app);
    }
    head.appendChild(icon);

    const title = el('div', 'card-title');
    title.appendChild(el('h3', null, app.name));
    title.appendChild(el('div', 'url', app.url.replace(/^https?:\/\//, '').replace(/\/$/, '')));
    head.appendChild(title);

    if (app.pinned) head.appendChild(el('span', 'badge', 'pinned'));
    card.appendChild(head);

    const actions = el('div', 'card-actions');

    const launchBtn = el('button', 'primary', 'Launch');
    launchBtn.onclick = async () => {
      const res = await forge.launch(app.id);
      if (!res.ok) fail(res);
    };
    actions.appendChild(launchBtn);

    const pinBtn = el('button', null, app.pinned ? 'Unpin' : 'Pin');
    pinBtn.onclick = async () => {
      const res = app.pinned ? await forge.unpin(app.id) : await forge.pin(app.id);
      if (!res.ok) return fail(res);
      if (!app.pinned) {
        toast(`"${app.name}" added to your app menu — right-click it there and choose "Pin to Task Manager".`, 6000);
      }
      await refresh();
    };
    actions.appendChild(pinBtn);

    actions.appendChild(el('div', 'spacer'));

    const editBtn = el('button', 'ghost', 'Edit');
    editBtn.onclick = () => openEdit(app);
    actions.appendChild(editBtn);

    const delBtn = el('button', 'ghost danger', 'Delete');
    delBtn.onclick = async () => {
      if (!confirm(`Delete "${app.name}"? This also removes its menu entry.`)) return;
      const res = await forge.remove(app.id);
      if (!res.ok) return fail(res);
      await refresh();
    };
    actions.appendChild(delBtn);

    card.appendChild(actions);
    grid.appendChild(card);
  }
}

function renderSuggestions() {
  const wrap = $('suggestion-chips');
  wrap.replaceChildren();
  for (const s of SUGGESTIONS) {
    const chip = el('button', 'chip', s.name);
    chip.type = 'button';
    chip.onclick = () => addApp(s.url, s.name);
    wrap.appendChild(chip);
  }
}

async function refresh() {
  const res = await forge.list();
  if (!res.ok) return fail(res);
  apps = res.apps;
  render();
}

async function addApp(url, name) {
  const btn = $('add-btn');
  btn.disabled = true;
  btn.textContent = 'Adding…';
  try {
    const res = await forge.add({ url, name });
    if (!res.ok) return fail(res);
    $('add-url').value = '';
    $('add-name').value = '';
    await refresh();
    toast(`"${res.app.name}" added. Launch it, or pin it to your taskbar.`);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Add app';
  }
}

function openEdit(app) {
  editingId = app.id;
  $('edit-name').value = app.name;
  $('edit-url').value = app.url;
  $('edit-dialog').showModal();
}

$('add-form').addEventListener('submit', (e) => {
  e.preventDefault();
  addApp($('add-url').value, $('add-name').value);
});

$('edit-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const res = await forge.update(editingId, {
    name: $('edit-name').value,
    url: $('edit-url').value,
  });
  if (!res.ok) return fail(res);
  $('edit-dialog').close();
  await refresh();
});

$('edit-cancel').onclick = () => $('edit-dialog').close();

$('edit-refresh-icon').onclick = async () => {
  const res = await forge.refreshIcon(editingId);
  if (!res.ok) return fail(res);
  toast('Icon updated.');
  await refresh();
};

$('edit-choose-icon').onclick = async () => {
  const res = await forge.chooseIcon(editingId);
  if (!res.ok) return fail(res);
  await refresh();
};

refresh();
