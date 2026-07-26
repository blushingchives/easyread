const $ = (id) => document.getElementById(id);

const input = $('input');
const output = $('output');
const fixation = $('fixation');
const saccade = $('saccade');
const opacity = $('opacity');
const dimCopy = $('dimCopy');

const PRESETS_KEY = 'easyreader:presets';
const TEXT_KEY = 'easyreader:text';
const THEME_KEY = 'easyreader:theme';
const MAX_PRESETS = 3;

// The page always opens on these. Anything else has to be saved as a preset.
const DEFAULTS = { fixation: 3, saccade: 10, opacity: 60, dimOnCopy: false };

let clipboardHtml = '';

/* ---------- rendering ---------- */

function settings() {
  return {
    fixation: +fixation.value,
    saccade: +saccade.value,
    opacity: +opacity.value,
    dimOnCopy: dimCopy.checked,
  };
}

function applySettings(s) {
  fixation.value = s.fixation;
  saccade.value = s.saccade;
  opacity.value = s.opacity;
  dimCopy.checked = !!s.dimOnCopy;
  render();
}

function render() {
  const s = settings();
  $('fixOut').value = s.fixation;
  $('sacOut').value = s.saccade;
  $('opaOut').value = s.opacity + '%';
  output.style.setProperty('--rest-opacity', s.opacity / 100);

  const text = input.value;
  const { preview, clipboard, wordCount } = text ? toEasyRead(text, s) : { preview: '', clipboard: '', wordCount: 0 };

  output.innerHTML = preview;
  clipboardHtml = clipboard;

  $('inStat').textContent =
    `${wordCount.toLocaleString()} words · ${text.length.toLocaleString()} chars`;
  $('outStat').textContent = wordCount ? 'ready' : '';

  try { localStorage.setItem(TEXT_KEY, text); } catch { /* text too large to persist */ }
}

/* ---------- presets ---------- */

const presetLabel = (s) => `F${s.fixation} · S${s.saccade} · ${s.opacity}%${s.dimOnCopy ? ' · dim' : ''}`;

function loadPresets() {
  try {
    const list = JSON.parse(localStorage.getItem(PRESETS_KEY) || '[]');
    return Array.isArray(list) ? list.slice(0, MAX_PRESETS) : [];
  } catch {
    return [];
  }
}

function storePresets(list) {
  localStorage.setItem(PRESETS_KEY, JSON.stringify(list));
  renderPresets(list);
}

function renderPresets(list = loadPresets()) {
  const slots = $('slots');
  slots.textContent = '';

  for (const [i, s] of list.entries()) {
    const chip = document.createElement('span');
    chip.className = 'chip';

    const load = document.createElement('button');
    load.className = 'chip-load';
    load.textContent = presetLabel(s);
    load.title = 'Load this preset';
    load.addEventListener('click', () => { applySettings(s); toast('Preset loaded'); });

    const del = document.createElement('button');
    del.className = 'chip-del';
    del.textContent = '×';
    del.title = 'Delete this preset';
    del.setAttribute('aria-label', `Delete preset ${presetLabel(s)}`);
    del.addEventListener('click', () => {
      const next = loadPresets();
      next.splice(i, 1);
      storePresets(next);
      toast('Preset deleted');
    });

    chip.append(load, del);
    slots.append(chip);
  }

  // Stays clickable when full — clicking is what surfaces the "delete one" toast.
  const save = $('save');
  save.textContent = `Save ${list.length}/${MAX_PRESETS}`;
  save.classList.toggle('full', list.length >= MAX_PRESETS);
}

function savePreset() {
  const list = loadPresets();
  const current = settings();

  if (list.some((s) => presetLabel(s) === presetLabel(current))) {
    return toast('These settings are already saved');
  }
  if (list.length >= MAX_PRESETS) {
    return toast(`All ${MAX_PRESETS} preset slots are full — delete one first`);
  }

  list.push(current);
  storePresets(list);
  toast('Preset saved');
}

let timer;
const scheduleRender = () => {
  clearTimeout(timer);
  timer = setTimeout(render, 120);
};

/* ---------- copy ---------- */

function copyViaSelection(html) {
  const holder = document.createElement('div');
  holder.setAttribute('contenteditable', 'true');
  holder.style.cssText = 'position:fixed;left:0;top:0;opacity:0;pointer-events:none;white-space:pre-wrap';
  holder.innerHTML = html;
  document.body.appendChild(holder);

  const range = document.createRange();
  range.selectNodeContents(holder);
  const sel = getSelection();
  sel.removeAllRanges();
  sel.addRange(range);

  const ok = document.execCommand('copy');
  sel.removeAllRanges();
  holder.remove();
  return ok;
}

async function copy() {
  if (!clipboardHtml) return toast('Nothing to copy yet');

  const html = `<div>${clipboardHtml}</div>`;
  try {
    if (!navigator.clipboard?.write) throw new Error('no async clipboard');
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([input.value], { type: 'text/plain' }),
      }),
    ]);
    toast('Copied with formatting — paste anywhere');
  } catch {
    toast(copyViaSelection(html) ? 'Copied with formatting' : 'Copy blocked — select the text and press Ctrl+C');
  }
}

/* ---------- misc ui ---------- */

let toastTimer;
function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

// Proportional scroll sync between the two panes.
let syncing = false;
function link(from, to) {
  from.addEventListener('scroll', () => {
    if (syncing) return;
    syncing = true;
    const span = from.scrollHeight - from.clientHeight;
    to.scrollTop = span > 0 ? (from.scrollTop / span) * (to.scrollHeight - to.clientHeight) : 0;
    requestAnimationFrame(() => { syncing = false; });
  });
}
link(input, output);
link(output, input);

// Drop a .txt file onto the input.
['dragenter', 'dragover'].forEach((e) =>
  input.addEventListener(e, (ev) => { ev.preventDefault(); input.classList.add('dropping'); }));
['dragleave', 'drop'].forEach((e) =>
  input.addEventListener(e, () => input.classList.remove('dropping')));

input.addEventListener('drop', async (ev) => {
  const file = ev.dataTransfer?.files?.[0];
  if (!file) return;
  ev.preventDefault();
  input.value = await file.text();
  render();
});

const SAMPLE = `Easy Reader guides the eye through text with artificial fixation points.

Only the first few letters of a word are set in bold. The brain recognises the word from that fragment and completes the rest on its own, so the eye can jump ahead instead of tracing every character. Fixation controls how much of each word is highlighted; saccade controls how far the eye travels between one highlight and the next.

Paste an entire chapter here if you like — there is no length limit.`;

$('sample').addEventListener('click', () => { input.value = SAMPLE; render(); input.focus(); });
$('clear').addEventListener('click', () => { input.value = ''; render(); input.focus(); });
$('copy').addEventListener('click', copy);
$('save').addEventListener('click', savePreset);

$('theme').addEventListener('click', () => {
  const dark = getComputedStyle(document.body).backgroundColor !== 'rgb(247, 247, 245)';
  document.documentElement.dataset.theme = dark ? 'light' : 'dark';
  localStorage.setItem(THEME_KEY, document.documentElement.dataset.theme);
});

input.addEventListener('input', scheduleRender);
[fixation, saccade, opacity, dimCopy].forEach((el) => el.addEventListener('input', render));

/* ---------- boot ---------- */

const savedTheme = localStorage.getItem(THEME_KEY);
if (savedTheme) document.documentElement.dataset.theme = savedTheme;

input.value = localStorage.getItem(TEXT_KEY) || '';
renderPresets();
applySettings(DEFAULTS); // every load starts from the defaults, not from last use
