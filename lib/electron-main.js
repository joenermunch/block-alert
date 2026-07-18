import { app, BrowserWindow, ipcMain, Menu, screen } from 'electron';
import { readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { COMPACT_SIZE, FULL_SIZE, clampBounds, resizeBounds, windowOptions } from './electron-window.js';
import { MASCOT_IDS } from './agent-alert.js';

const projectDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rendererFile = path.join(projectDirectory, 'lib', 'renderer', 'index.html');
const preloadFile = path.join(projectDirectory, 'lib', 'electron-preload.cjs');
const statusIds = ['crt', 'ethernet', 'spinner', 'battery', 'floppy', 'server', 'terminal', 'router', 'cloud', 'printer'];

function fileUrl(...segments) {
  return pathToFileURL(path.join(projectDirectory, ...segments)).href;
}

function frames(count, ...segments) {
  return Array.from({ length: count }, (_, index) => fileUrl(...segments, `frame-${index}.webp`));
}

function parseOptions() {
  const marker = process.argv.indexOf('--');
  const raw = marker >= 0 ? process.argv.slice(marker + 1) : [];
  return {
    state: raw[0] === 'working' ? 'working' : 'blocked',
    duration: Math.max(2, Math.min(30, Number(raw[1]) || 15)),
    compact: raw[2] === 'true',
    muted: raw[3] === 'true',
    keepOpen: raw[4] === 'true',
  };
}

async function loadState() {
  try { return JSON.parse(await readFile(path.join(app.getPath('userData'), 'pet-state.json'), 'utf8')); }
  catch { return {}; }
}

async function saveState(state) {
  const target = path.join(app.getPath('userData'), 'pet-state.json');
  const temporary = `${target}.tmp`;
  await writeFile(temporary, `${JSON.stringify(state)}\n`, { mode: 0o600 });
  await rename(temporary, target);
}

function assetPayload(options, state) {
  const statusFrames = MASCOT_IDS.map((_, index) => frames(32, 'assets', options.compact ? 'compact' : 'full', options.state, statusIds[index % statusIds.length]));
  return {
    names: MASCOT_IDS,
    mascots: MASCOT_IDS.map((id) => frames(128, 'assets', 'candidates', id)),
    full: MASCOT_IDS.map((_, index) => frames(32, 'assets', 'full', options.state, statusIds[index % statusIds.length])),
    compact: MASCOT_IDS.map((_, index) => frames(32, 'assets', 'compact', options.state, statusIds[index % statusIds.length])),
    sounds: MASCOT_IDS.map((id) => fileUrl('assets', 'sounds', 'candidates', `${id}.wav`)),
    statusFrames,
    state: options.state,
    selected: Number.isInteger(state.selected) ? state.selected % MASCOT_IDS.length : 0,
    compact: options.compact || Boolean(state.compact),
    muted: options.muted || Boolean(state.muted),
  };
}

app.setName('Agent Alert');
app.whenReady().then(async () => {
  const options = parseOptions();
  let state = await loadState();
  const initialCompact = options.compact || Boolean(state.compact);
  const activeDisplay = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const display = state.bounds ? screen.getDisplayMatching(state.bounds) : activeDisplay;
  const defaultSize = initialCompact ? COMPACT_SIZE : FULL_SIZE;
  const defaultBounds = {
    x: display.workArea.x + display.workArea.width - defaultSize.width - 16,
    y: display.workArea.y + 24,
    ...defaultSize,
  };
  const bounds = clampBounds(state.bounds || defaultBounds, display.workArea);
  const window = new BrowserWindow({
    ...windowOptions({ compact: initialCompact, x: bounds.x, y: bounds.y }),
    width: bounds.width,
    height: bounds.height,
    webPreferences: { preload: preloadFile, contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  window.setAlwaysOnTop(true, 'floating');
  window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  window.setIgnoreMouseEvents(false);
  let resize;

  const persist = async (patch = {}) => {
    state = { ...state, ...patch, bounds: window.getBounds() };
    await saveState(state);
  };
  ipcMain.on('agent-alert:close', () => window.close());
  ipcMain.on('agent-alert:mouse-passthrough', (_event, passthrough) => window.setIgnoreMouseEvents(passthrough, { forward: true }));
  ipcMain.on('agent-alert:persist', (_event, patch) => { persist(patch).catch(() => {}); });
  ipcMain.on('agent-alert:resize-start', (_event, data) => { resize = { ...data, bounds: window.getBounds() }; });
  ipcMain.on('agent-alert:resize-move', (_event, data) => {
    if (!resize) return;
    window.setBounds(resizeBounds(resize.bounds, resize.edge, data.screenX - resize.screenX, data.screenY - resize.screenY, options.compact));
  });
  ipcMain.on('agent-alert:resize-end', () => { resize = null; persist().catch(() => {}); });
  ipcMain.on('agent-alert:context-menu', () => {
    Menu.buildFromTemplate([
      { label: 'Compact status', click: () => { window.setSize(COMPACT_SIZE.width, COMPACT_SIZE.height); window.webContents.send('agent-alert:command', 'compact'); } },
      { label: 'Full status', click: () => { window.setSize(FULL_SIZE.width, FULL_SIZE.height); window.webContents.send('agent-alert:command', 'full'); } },
      { type: 'separator' },
      { label: state.muted ? 'Unmute sound' : 'Mute sound', click: () => window.webContents.send('agent-alert:command', 'mute') },
      { type: 'separator' },
      { label: 'Close', click: () => window.close() },
    ]).popup({ window });
  });
  window.on('moved', () => persist().catch(() => {}));
  window.on('close', () => { state = { ...state, bounds: window.getBounds() }; saveState(state).catch(() => {}); });
  window.on('closed', () => app.quit());
  window.webContents.once('did-finish-load', () => {
    window.webContents.send('agent-alert:initialize', assetPayload(options, state));
  });
  window.webContents.on('did-fail-load', (_event, code, description) => console.error(`agent-alert renderer load failed (${code}): ${description}`));
  window.webContents.on('render-process-gone', (_event, details) => console.error(`agent-alert renderer exited: ${details.reason}`));
  await window.loadFile(rendererFile);
  window.showInactive();
  if (!options.keepOpen) setTimeout(() => window.close(), options.duration * 1000);
});

app.on('window-all-closed', () => app.quit());
