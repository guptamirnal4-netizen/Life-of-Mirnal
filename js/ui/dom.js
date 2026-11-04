export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

const stack = [];
let root;
let listeners = [];
let micHandler = null;

export function setMicHandler(fn) {
  micHandler = fn;
}

export function initUI() {
  root = document.getElementById('overlay');
}

export function onOverlayChange(fn) {
  listeners.push(fn);
}

function render() {
  root.replaceChildren();
  const top = stack[stack.length - 1];
  root.classList.toggle('open', !!top);
  if (top) {
    root.append(top.node);
    const first = top.node.querySelector('[autofocus]') || top.node.querySelector('.panel-body button.primary:not([disabled])') || top.node.querySelector('.panel-body button.mic-btn') || top.node.querySelector('.panel-body button');
    if (first) first.focus({ preventScroll: true });
  }
  listeners.forEach((fn) => fn(!!top));
}

export function openPanel(content, { wide = false, title = null, closable = false, onClose = null, cls = '' } = {}) {
  const entry = {};
  const close = () => {
    const i = stack.indexOf(entry);
    if (i >= 0) stack.splice(i, 1);
    render();
    if (onClose) onClose();
  };
  const panel = h('div', { class: `panel ${wide ? 'wide' : ''} ${cls}` },
    (title || closable) && h('div', { class: 'panel-head' },
      title && h('h2', {}, title),
      h('div', { class: 'head-actions' },
        micHandler && h('button', { class: 'panel-mic', title: 'Speak (F): say any option on this screen', onclick: () => micHandler() }, '🎤'),
        closable && h('button', { class: 'close', title: 'Close (Esc)', onclick: close, 'data-voice': 'close back' }, '✕'))),
    h('div', { class: 'panel-body' }, content));
  entry.node = panel;
  entry.close = close;
  entry.closable = closable;
  stack.push(entry);
  render();
  return close;
}

export function replacePanelBody(close, content) {
  const entry = stack.find((e) => e.close === close);
  if (!entry) return;
  entry.node.querySelector('.panel-body').replaceChildren(content);
  const first = entry.node.querySelector('button.primary, button');
  if (first) first.focus({ preventScroll: true });
}

export function isOpen() {
  return stack.length > 0;
}

export function topPanel() {
  return stack[stack.length - 1]?.node || null;
}

export function closeTop() {
  const top = stack[stack.length - 1];
  if (top && top.closable) {
    top.close();
    return true;
  }
  return false;
}

export function closeAll() {
  stack.length = 0;
  render();
}

let toastTimer;
export function toast(msg, ms = 2600) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}

export function sequence(steps, onDone) {
  // steps: array of functions (next) => node ; renders them one after another in one panel.
  let i = 0;
  let close;
  const next = () => {
    i += 1;
    if (i >= steps.length) {
      close();
      onDone?.();
      return;
    }
    replacePanelBody(close, steps[i](next));
  };
  return { start: (opts) => { close = openPanel(steps[0](next), opts); return close; } };
}

export function shuffle(arr, seed = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(seed() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function bar(value, max, color = 'var(--accent)') {
  const pct = max ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return h('div', { class: 'bar' }, h('div', { class: 'bar-fill', style: { width: `${pct}%`, background: color } }));
}
