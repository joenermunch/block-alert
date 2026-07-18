import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const DEFAULT_TITLE = 'AGENT IS BLOCKED. IT’S GIVING BRICK WALL.';
const DEFAULT_MESSAGE = 'bestie... the agent is absolutely cooked. pls provide human aura.';
const MAX_TEXT_LENGTH = 500;
const assetDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'braincell-frames');

export const BRAIN_CELL_FRAMES = Object.freeze(Array.from(
  { length: 8 },
  (_, index) => path.join(assetDirectory, `frame-${index + 1}.png`),
));

export function parseArguments(argv) {
  const options = { title: DEFAULT_TITLE, message: DEFAULT_MESSAGE, duration: 15, relayMac: false, dryRun: false };
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

export function macCommand(title, message, duration) {
  return `block-alert --title ${shellQuote(title)} --message ${shellQuote(message)} --duration ${shellQuote(String(duration))}`;
}

export const JXA_SOURCE = String.raw`
ObjC.import('Cocoa');
function run(argv) {
  const title = argv[0] || 'AGENT IS BLOCKED. IT’S GIVING BRICK WALL.';
  const message = argv[1] || 'bestie... the agent is absolutely cooked. pls provide human aura.';
  const seconds = Math.max(2, Math.min(30, Number(argv[2]) || 15));
  const framePaths = JSON.parse(argv[3] || '[]');
  if (argv[4] === '--compile-check') return 'ok';
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
  panel.setLevel($.NSFloatingWindowLevel);
  panel.setHidesOnDeactivate(false);
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
  panel.orderFrontRegardless();
  const sound = $.NSSound.soundNamed($('Basso'));
  if (sound) sound.play();
  const ticks = Math.ceil(seconds * 3);
  for (let tick = 0; tick < ticks; tick += 1) {
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

export function showMacAlert(title, message, duration, runner = spawnSync) {
  const result = runner('osascript', ['-l', 'JavaScript', '-e', JXA_SOURCE, '--', title, message, String(duration), JSON.stringify(BRAIN_CELL_FRAMES)], {
    encoding: 'utf8',
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`macOS corner alert failed (exit ${result.status})`);
}

export function relayToMac(title, message, duration, runner = spawnSync) {
  const result = runner('ssh', ['oracle-mac', macCommand(title, message, duration)], { encoding: 'utf8', stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Mac relay failed (exit ${result.status})`);
}

export async function main(argv, { platform = process.platform, runner = spawnSync, output = console.log } = {}) {
  const options = parseArguments(argv);
  if (options.help) {
    output('Usage: block-alert [--title TEXT] [--message TEXT] [--relay-mac] [--dry-run]');
    return;
  }
  if (options.dryRun) {
    output(JSON.stringify({ title: options.title, message: options.message, duration: options.duration, action: options.relayMac ? 'relay-mac' : 'show-corner-pet' }));
    return;
  }
  if (options.relayMac) return relayToMac(options.title, options.message, options.duration, runner);
  if (platform !== 'darwin') throw new Error('local alerts require macOS; run with --relay-mac from the VPS');
  return showMacAlert(options.title, options.message, options.duration, runner);
}
