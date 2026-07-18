const shell = document.querySelector('#pet-shell');
const mascot = document.querySelector('#mascot');
const statusArt = document.querySelector('#status-art');
const petName = document.querySelector('#pet-name');
const previous = document.querySelector('#previous');
const next = document.querySelector('#next');
const close = document.querySelector('#close');

let payload;
let selected = 0;
let frame = 0;
let muted = false;
let compact = false;
let resizeActive = false;
let sound;

function currentFrames() {
  return {
    mascot: payload.mascots[selected] || [],
    status: (compact ? payload.compact : payload.full)[selected] || [],
  };
}

function playSound() {
  if (payload.state !== 'blocked' || muted) return;
  sound?.pause();
  sound = new Audio(payload.sounds[selected]);
  sound.play().catch(() => {});
}

function renderPet() {
  const frames = currentFrames();
  petName.textContent = payload.names[selected].replaceAll('-', ' ').toUpperCase();
  mascot.src = frames.mascot[frame % frames.mascot.length] || '';
  statusArt.src = frames.status[frame % frames.status.length] || '';
}

function selectPet(delta) {
  selected = (selected + delta + payload.names.length) % payload.names.length;
  frame = 0;
  renderPet();
  playSound();
  window.agentAlert.persist({ selected });
}

function setCompact(value) {
  compact = Boolean(value);
  shell.classList.toggle('compact', compact);
  renderPet();
  window.agentAlert.persist({ compact });
}

function isInteractiveTarget(target) {
  return Boolean(target?.closest?.('[data-interactive]'));
}

window.addEventListener('mousemove', (event) => {
  if (resizeActive) window.agentAlert.moveResize(event.screenX, event.screenY);
  window.agentAlert.setMousePassthrough(!isInteractiveTarget(event.target));
});
window.addEventListener('mouseleave', () => { if (!resizeActive) window.agentAlert.setMousePassthrough(true); });
window.addEventListener('mouseup', () => { if (resizeActive) { resizeActive = false; window.agentAlert.endResize(); } });
window.addEventListener('contextmenu', (event) => { event.preventDefault(); window.agentAlert.contextMenu(); });
for (const handle of document.querySelectorAll('[data-resize]')) {
  handle.addEventListener('mousedown', (event) => {
    event.preventDefault();
    resizeActive = true;
    window.agentAlert.startResize(handle.dataset.resize, event.screenX, event.screenY);
  });
}
previous.addEventListener('click', () => selectPet(-1));
next.addEventListener('click', () => selectPet(1));
close.addEventListener('click', () => window.agentAlert.close());

window.agentAlert.onCommand((command) => {
  if (command === 'compact') setCompact(true);
  if (command === 'full') setCompact(false);
  if (command === 'mute') { muted = !muted; sound?.pause(); window.agentAlert.persist({ muted }); }
  if (command === 'close') window.agentAlert.close();
});

window.agentAlert.onInitialize((initial) => {
  payload = initial;
  selected = initial.selected;
  muted = initial.muted;
  setCompact(initial.compact);
  renderPet();
  if (initial.state === 'blocked') playSound();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  setInterval(() => { if (!reduced) { frame += 1; renderPet(); } }, 1000 / 24);
});
