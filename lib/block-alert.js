import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const DEFAULT_TITLE = 'AGENT IS BLOCKED.';
const DEFAULT_MESSAGE = 'The process has reached the void. Your input is the only remaining event.';
const MAX_TEXT_LENGTH = 500;
const assetDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'braincell-frames-32');

export const BRAIN_CELL_FRAMES = Object.freeze(Array.from(
  { length: 32 },
  (_, index) => path.join(assetDirectory, `frame-${index + 1}.png`),
));

export function parseArguments(argv) {
  const options = { title: DEFAULT_TITLE, message: DEFAULT_MESSAGE, duration: 15, relayMac: false, dryRun: false, keepOpen: false };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--title' || value === '--message' || value === '--duration') {
      const next = argv[index + 1];
      if (!next || next.startsWith('--')) throw new Error(`${value} needs text`);
      options[value.slice(2)] = next;
      index += 1;
    } else if (value === '--relay-mac') {
      options.relayMac = true;
    } else if (value === '--dry-run') {
      options.dryRun = true;
    } else if (value === '--keep-open') {
      options.keepOpen = true;
    } else if (value === '--help' || value === '-h') {
      options.help = true;
    } else {
      throw new Error(`unknown option: ${value}`);
    }
  }
  for (const key of ['title', 'message']) {
    options[key] = String(options[key]).replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
    if (!options[key]) throw new Error(`${key} cannot be empty`);
    if (options[key].length > MAX_TEXT_LENGTH) throw new Error(`${key} is too long (max ${MAX_TEXT_LENGTH})`);
  }
  options.duration = Number(options.duration);
  if (!Number.isInteger(options.duration) || options.duration < 2 || options.duration > 30) {
    throw new Error('duration must be a whole number from 2 to 30 seconds');
  }
  return options;
}

export function shellQuote(value) {
  return `'${value.replaceAll("'", "'\"'\"'")}'`;
}

export function macCommand(title, message, duration, keepOpen = false) {
  const keepOpenFlag = keepOpen ? ' --keep-open' : '';
  return `block-alert --title ${shellQuote(title)} --message ${shellQuote(message)} --duration ${shellQuote(String(duration))}${keepOpenFlag}`;
}

export const JXA_SOURCE = String.raw`
ObjC.import('Cocoa');
function run(argv) {
  const title = argv[0] || 'AGENT IS BLOCKED.';
  const message = argv[1] || 'The process has reached the void. Your input is the only remaining event.';
  const seconds = Math.max(2, Math.min(30, Number(argv[2]) || 15));
  const framePaths = JSON.parse(argv[3] || '[]');
  const keepOpen = argv[4] === '--keep-open';
  if (argv[5] === '--compile-check') return 'ok';
  const app = $.NSApplication.sharedApplication;
  app.setActivationPolicy($.NSApplicationActivationPolicyAccessory);
  const screen = $.NSScreen.mainScreen.visibleFrame;
  const width = 430;
  const height = 205;
  const frame = $.NSMakeRect(screen.origin.x + screen.size.width - width - 24, screen.origin.y + 30, width, height);
  const panel = $.NSPanel.alloc.initWithContentRectStyleMaskBackingDefer(
    frame,
    $.NSWindowStyleMaskTitled | $.NSWindowStyleMaskClosable | $.NSWindowStyleMaskUtilityWindow | $.NSWindowStyleMaskNonactivatingPanel,
    $.NSBackingStoreBuffered,
    false
  );
  panel.setTitle($('block-alert — click the red X anytime'));
  panel.setFloatingPanel(true);
  panel.setLevel($.NSPopUpMenuWindowLevel);
  panel.setCollectionBehavior($.NSWindowCollectionBehaviorCanJoinAllSpaces | $.NSWindowCollectionBehaviorFullScreenAuxiliary | $.NSWindowCollectionBehaviorStationary);
  panel.setHidesOnDeactivate(false);
  panel.setBecomesKeyOnlyIfNeeded(true);
  panel.setOpaque(false);
  panel.setBackgroundColor($.NSColor.clearColor);
  const content = panel.contentView;
  const bubble = $.NSVisualEffectView.alloc.initWithFrame(content.bounds);
  bubble.setMaterial($.NSVisualEffectMaterialHUDWindow);
  bubble.setBlendingMode($.NSVisualEffectBlendingModeBehindWindow);
  bubble.setState($.NSVisualEffectStateActive);
  content.addSubview(bubble);
  const pet = $.NSImageView.alloc.initWithFrame($.NSMakeRect(14, 37, 112, 112));
  pet.setImageScaling($.NSImageScaleProportionallyUpOrDown);
  bubble.addSubview(pet);
  const titleLabel = $.NSTextField.labelWithString($(title));
  titleLabel.setTextColor($.NSColor.whiteColor);
  titleLabel.setFont($.NSFont.boldSystemFontOfSize(17));
  titleLabel.setLineBreakMode($.NSLineBreakByTruncatingTail);
  titleLabel.setFrame($.NSMakeRect(136, 116, 275, 30));
  bubble.addSubview(titleLabel);
  const messageLabel = $.NSTextField.wrappingLabelWithString($(message));
  messageLabel.setTextColor($.NSColor.whiteColor);
  messageLabel.setFont($.NSFont.systemFontOfSize(14));
  messageLabel.setFrame($.NSMakeRect(136, 45, 275, 66));
  bubble.addSubview(messageLabel);
  panel.orderFront(null);
  const ticks = Math.ceil(seconds * 3);
  for (let tick = 0; keepOpen || tick < ticks; tick += 1) {
    if (!panel.visible) break;
    const assetPath = framePaths[tick % framePaths.length];
    if (assetPath) {
      const image = $.NSImage.alloc.initWithContentsOfFile($(assetPath));
      if (image) pet.setImage(image);
    }
    $.NSRunLoop.currentRunLoop.runUntilDate($.NSDate.dateWithTimeIntervalSinceNow(0.33));
  }
  panel.orderOut(null);
}
`;

export function showMacAlert(title, message, duration, keepOpen = false, runner = spawnSync) {
  const args = ['-l', 'JavaScript', '-e', JXA_SOURCE, '--', title, message, String(duration), JSON.stringify(BRAIN_CELL_FRAMES)];
  if (keepOpen) args.push('--keep-open');
  const result = runner('osascript', args, {
    encoding: 'utf8',
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`macOS corner alert failed (exit ${result.status})`);
}

export function relayToMac(title, message, duration, keepOpen = false, runner = spawnSync) {
  const result = runner('ssh', ['oracle-mac', macCommand(title, message, duration, keepOpen)], { encoding: 'utf8', stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Mac relay failed (exit ${result.status})`);
}

export async function main(argv, { platform = process.platform, runner = spawnSync, output = console.log } = {}) {
  const options = parseArguments(argv);
  if (options.help) {
    output('Usage: block-alert [--title TEXT] [--message TEXT] [--duration 2..30] [--keep-open] [--relay-mac] [--dry-run]');
    return;
  }
  if (options.dryRun) {
    output(JSON.stringify({ title: options.title, message: options.message, duration: options.duration, keepOpen: options.keepOpen, action: options.relayMac ? 'relay-mac' : 'show-corner-pet' }));
    return;
  }
  if (options.relayMac) return relayToMac(options.title, options.message, options.duration, options.keepOpen, runner);
  if (platform !== 'darwin') throw new Error('local alerts require macOS; run with --relay-mac from the VPS');
  return showMacAlert(options.title, options.message, options.duration, options.keepOpen, runner);
}
