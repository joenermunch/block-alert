import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BLOCKED_SOUNDS, CANDIDATE_SOUND_IDS, COMPACT_FRAME_SETS, FULL_FRAME_SETS, MASCOT_FRAME_SETS, macCommand, main, parseArguments, shellQuote, showMacAlert } from '../lib/agent-alert.js';
import { clampBounds, resizeBounds, windowOptions } from '../lib/electron-window.js';

test('defaults create a blocked alert', () => {
  assert.deepEqual(parseArguments([]), { title: 'AGENT(S) BLOCKED', message: 'The process has reached the void. Your input is the only remaining event.', duration: 15, state: 'blocked', compact: false, muted: false, relayMac: false, dryRun: false, keepOpen: false });
});

test('rejects control characters and unexpected options', () => {
  assert.equal(parseArguments(['--message', 'line one\nline two']).message, 'line one line two');
  assert.equal(parseArguments(['--keep-open']).keepOpen, true);
  assert.equal(parseArguments(['--state', 'working', '--compact', '--mute']).muted, true);
  assert.throws(() => parseArguments(['--state', 'unknown']), /working or blocked/);
  assert.throws(() => parseArguments(['--wat']), /unknown option/);
});

test('quotes a relay command without shell interpolation', () => {
  assert.equal(shellQuote("Joe's task"), "'Joe'\"'\"'s task'");
  assert.equal(macCommand('BLOCKED', "Joe's task", 15), "agent-alert --title 'BLOCKED' --message 'Joe'\"'\"'s task' --duration '15' --state 'blocked'");
});

test('dry run is portable', async () => {
  const output = [];
  await main(['--relay-mac', '--dry-run'], { platform: 'linux', output: (line) => output.push(line) });
  assert.equal(JSON.parse(output[0]).action, 'relay-mac');
});

test('the Electron alert is a transparent, closable animated pet carousel', () => {
  assert.equal(MASCOT_FRAME_SETS.length, 20);
  assert.equal(FULL_FRAME_SETS.blocked.length, 20);
  assert.equal(FULL_FRAME_SETS.working.length, 20);
  assert.equal(COMPACT_FRAME_SETS.blocked.length, 20);
  assert.equal(COMPACT_FRAME_SETS.working.length, 20);
  assert.equal(MASCOT_FRAME_SETS[0].length, 128);
  assert.equal(FULL_FRAME_SETS.blocked[0].length, 32);
  assert.equal(COMPACT_FRAME_SETS.working[0].length, 32);
  assert.match(MASCOT_FRAME_SETS[0][0], /assets\/candidates\/niblet-stylus\/frame-0\.webp$/);
  assert.match(FULL_FRAME_SETS.blocked[0][0], /assets\/full\/blocked\/crt\/frame-0\.webp$/);
  assert.match(COMPACT_FRAME_SETS.working[0][0], /assets\/compact\/working\/crt\/frame-0\.webp$/);
  assert.equal(CANDIDATE_SOUND_IDS.length, 20);
  assert.equal(BLOCKED_SOUNDS.length, 20);
  assert.match(BLOCKED_SOUNDS[0], /assets\/sounds\/candidates\/niblet-stylus\.wav$/);
  assert.deepEqual(windowOptions(), {
    width: 430, height: 220, frame: false, transparent: true, backgroundColor: '#00000000',
    hasShadow: false, resizable: false, fullscreenable: false, skipTaskbar: true,
    alwaysOnTop: true, focusable: true, acceptFirstMouse: true, show: false, type: 'panel',
  });
  assert.deepEqual(clampBounds({ x: -500, y: 900, width: 430, height: 220 }, { x: 0, y: 0, width: 1440, height: 900 }), { x: 0, y: 680, width: 430, height: 220 });
  assert.deepEqual(resizeBounds({ x: 100, y: 100, width: 430, height: 220 }, 'se', 40, 30), { x: 100, y: 100, width: 470, height: 250 });
  assert.deepEqual(resizeBounds({ x: 100, y: 100, width: 430, height: 220 }, 'nw', 200, 100), { x: 180, y: 140, width: 350, height: 180 });
});

test('Mac launch uses the packaged Electron entry', () => {
  let call;
  showMacAlert('BLOCKED', 'Input needed', 15, true, 'blocked', false, true, (command, args, options) => {
    call = { command, args, options };
    return { status: 0 };
  }, '/Applications/Electron.app/Contents/MacOS/Electron');
  assert.equal(call.command, '/Applications/Electron.app/Contents/MacOS/Electron');
  assert.match(call.args[0], /lib\/electron-main\.js$/);
  assert.deepEqual(call.args.slice(1), ['--', 'blocked', '15', 'false', 'true', 'true']);
  assert.equal(call.options.stdio, 'inherit');
});

test('Electron overlay matches Codex pet window and hit-test architecture', () => {
  const mainSource = readFileSync(new URL('../lib/electron-main.js', import.meta.url), 'utf8');
  const preloadSource = readFileSync(new URL('../lib/electron-preload.cjs', import.meta.url), 'utf8');
  const rendererSource = readFileSync(new URL('../lib/renderer/renderer.js', import.meta.url), 'utf8');
  assert.match(mainSource, /setAlwaysOnTop\(true, 'floating'\)/);
  assert.match(mainSource, /setVisibleOnAllWorkspaces\(true, \{ visibleOnFullScreen: true \}\)/);
  assert.match(mainSource, /setIgnoreMouseEvents\(passthrough, \{ forward: true \}\)/);
  assert.match(mainSource, /persist.*bounds/s);
  assert.match(preloadSource, /contextBridge\.exposeInMainWorld/);
  assert.match(rendererSource, /data-resize/);
  assert.match(rendererSource, /setMousePassthrough/);
});
