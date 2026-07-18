import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import path from 'node:path';

const DEFAULT_TITLE = 'AGENT(S) BLOCKED';
const DEFAULT_MESSAGE = 'The process has reached the void. Your input is the only remaining event.';
const MAX_TEXT_LENGTH = 500;
const projectDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

export const MASCOT_IDS = Object.freeze([
  'niblet-stylus', 'niblet-smart-stylus', 'pixel-core-miko', 'oscilla', 'usb-flash-spirit',
  'koiwave-courier', 'nixie-pulse', 'kiko-keycap', 'mikobyte-packet-manta', 'pixelin-holo-pad',
  'gyromochi', 'nimbit', 'nimbi-9', 'bytebun-relay', 'glom', 'bytebun-niko', 'bitbloom',
  'cachekin', 'bytebun-nova', 'bitbit-oracle',
]);
const STATUS_IDS = Object.freeze(['crt', 'ethernet', 'spinner', 'battery', 'floppy', 'server', 'terminal', 'router', 'cloud', 'printer']);

function animatedFrameSets(ids, frameCount, ...segments) {
  return Object.freeze(MASCOT_IDS.map((_, mascotIndex) => Object.freeze(Array.from(
    { length: frameCount },
    (_, index) => path.join(projectDirectory, 'assets', ...segments, ids[mascotIndex % ids.length], `frame-${index}.webp`),
  ))));
}

export const MASCOT_FRAME_SETS = Object.freeze(MASCOT_IDS.map((id) => Object.freeze(Array.from(
  { length: 128 },
  (_, index) => path.join(projectDirectory, 'assets', 'candidates', id, `frame-${index}.webp`),
))));
export const FULL_FRAME_SETS = Object.freeze({
  working: animatedFrameSets(STATUS_IDS, 32, 'full', 'working'),
  blocked: animatedFrameSets(STATUS_IDS, 32, 'full', 'blocked'),
});
export const COMPACT_FRAME_SETS = Object.freeze({
  working: animatedFrameSets(STATUS_IDS, 32, 'compact', 'working'),
  blocked: animatedFrameSets(STATUS_IDS, 32, 'compact', 'blocked'),
});
export const CANDIDATE_SOUND_IDS = MASCOT_IDS;
export const BLOCKED_SOUNDS = Object.freeze(MASCOT_IDS.map((id) => path.join(projectDirectory, 'assets', 'sounds', 'candidates', `${id}.wav`)));

export function parseArguments(argv) {
  const options = { command: 'show', output: '/tmp/agent-alert-pet.png', title: DEFAULT_TITLE, message: DEFAULT_MESSAGE, duration: 15, state: 'blocked', compact: false, muted: false, relayMac: false, dryRun: false, keepOpen: false };
  let startIndex = 0;
  if (argv[0] === 'screenshot') {
    options.command = 'screenshot';
    startIndex = 1;
  }
  for (let index = startIndex; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--title' || value === '--message' || value === '--duration' || value === '--state' || value === '--output') {
      const next = argv[index + 1];
      if (!next || next.startsWith('--')) throw new Error(`${value} needs text`);
      options[value.slice(2)] = next;
      index += 1;
    } else if (value === '--relay-mac') options.relayMac = true;
    else if (value === '--dry-run') options.dryRun = true;
    else if (value === '--keep-open') options.keepOpen = true;
    else if (value === '--compact') options.compact = true;
    else if (value === '--mute') options.muted = true;
    else if (value === '--help' || value === '-h') options.help = true;
    else throw new Error(`unknown option: ${value}`);
  }
  for (const key of ['title', 'message']) {
    options[key] = String(options[key]).replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
    if (!options[key]) throw new Error(`${key} cannot be empty`);
    if (options[key].length > MAX_TEXT_LENGTH) throw new Error(`${key} is too long (max ${MAX_TEXT_LENGTH})`);
  }
  options.duration = Number(options.duration);
  if (!Number.isInteger(options.duration) || options.duration < 2 || options.duration > 30) throw new Error('duration must be a whole number from 2 to 30 seconds');
  if (!['working', 'blocked'].includes(options.state)) throw new Error('state must be working or blocked');
  options.output = path.resolve(options.output);
  return options;
}

const WINDOW_QUERY = `
import CoreGraphics
import Foundation
let rows = CGWindowListCopyWindowInfo([.optionOnScreenOnly, .excludeDesktopElements], kCGNullWindowID) as! [[String: Any]]
for row in rows {
  let owner = row[kCGWindowOwnerName as String] as? String ?? ""
  let name = row[kCGWindowName as String] as? String ?? ""
  if owner == "Electron" && name == "Agent Alert" {
    let id = row[kCGWindowNumber as String] as! Int
    let bounds = row[kCGWindowBounds as String] as! [String: Any]
    let x = bounds["X"] as! Int, y = bounds["Y"] as! Int
    let width = bounds["Width"] as! Int, height = bounds["Height"] as! Int
    print("\\(id)\\t\\(x)\\t\\(y)\\t\\(width)\\t\\(height)")
    exit(0)
  }
}
exit(3)
`;

export function captureMacPet(outputPath, runner = spawnSync, output = console.log) {
  if (!existsSync(path.dirname(outputPath))) throw new Error(`output directory does not exist: ${path.dirname(outputPath)}`);
  const query = runner('swift', ['-e', WINDOW_QUERY], { encoding: 'utf8' });
  if (query.error) throw query.error;
  if (query.status !== 0) throw new Error('visible Agent Alert window not found');
  const [windowId, x, y, width, height] = query.stdout.trim().split('\t').map(Number);
  if (![windowId, x, y, width, height].every(Number.isFinite)) throw new Error('invalid Agent Alert window metadata');
  const capture = runner('/usr/sbin/screencapture', ['-x', '-l', String(windowId), outputPath], { encoding: 'utf8' });
  if (capture.error) throw capture.error;
  if (capture.status !== 0) throw new Error(`pet screenshot failed (exit ${capture.status})`);
  output(JSON.stringify({ windowId, bounds: { x, y, width, height }, output: outputPath }));
}

export function shellQuote(value) {
  return `'${value.replaceAll("'", "'\"'\"'")}'`;
}

export function macCommand(title, message, duration, keepOpen = false, state = 'blocked', compact = false, muted = false) {
  const keepOpenFlag = keepOpen ? ' --keep-open' : '';
  const compactFlag = compact ? ' --compact' : '';
  const muteFlag = muted ? ' --mute' : '';
  return `agent-alert --title ${shellQuote(title)} --message ${shellQuote(message)} --duration ${shellQuote(String(duration))} --state ${shellQuote(state)}${compactFlag}${muteFlag}${keepOpenFlag}`;
}

export function electronExecutable() {
  return require('electron');
}

export function showMacAlert(_title, _message, duration, keepOpen = false, state = 'blocked', compact = false, muted = false, runner = spawnSync, executable = electronExecutable()) {
  const entry = path.join(projectDirectory, 'lib', 'electron-main.js');
  const result = runner(executable, [entry, '--', state, String(duration), String(compact), String(muted), String(keepOpen)], { encoding: 'utf8', stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`macOS pet failed (exit ${result.status})`);
}

export function relayToMac(title, message, duration, keepOpen = false, state = 'blocked', compact = false, muted = false, runner = spawnSync) {
  const result = runner('ssh', ['oracle-mac', macCommand(title, message, duration, keepOpen, state, compact, muted)], { encoding: 'utf8', stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Mac relay failed (exit ${result.status})`);
}

export async function main(argv, { platform = process.platform, runner = spawnSync, output = console.log } = {}) {
  const options = parseArguments(argv);
  if (options.help) {
    output('Usage: agent-alert [--state working|blocked] [--compact] [--mute] [--duration 2..30] [--keep-open] [--relay-mac] [--dry-run]\n       agent-alert screenshot [--output /path/pet.png]');
    return;
  }
  if (options.command === 'screenshot') {
    if (platform !== 'darwin') throw new Error('pet screenshots require macOS; run this command through ssh oracle-mac');
    return captureMacPet(options.output, runner, output);
  }
  if (options.dryRun) {
    output(JSON.stringify({ state: options.state, compact: options.compact, muted: options.muted, duration: options.duration, keepOpen: options.keepOpen, action: options.relayMac ? 'relay-mac' : 'show-electron-pet' }));
    return;
  }
  if (options.relayMac) return relayToMac(options.title, options.message, options.duration, options.keepOpen, options.state, options.compact, options.muted, runner);
  if (platform !== 'darwin') throw new Error('local alerts require macOS; run with --relay-mac from the VPS');
  return showMacAlert(options.title, options.message, options.duration, options.keepOpen, options.state, options.compact, options.muted, runner);
}
