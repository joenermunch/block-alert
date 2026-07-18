import { spawnSync } from 'node:child_process';

const DEFAULT_TITLE = 'AGENT IS BLOCKED. IT’S GIVING BRICK WALL.';
const DEFAULT_MESSAGE = 'bestie... the agent is absolutely cooked. pls provide human aura.';
const MAX_TEXT_LENGTH = 500;

export function parseArguments(argv) {
  const options = { title: DEFAULT_TITLE, message: DEFAULT_MESSAGE, relayMac: false, dryRun: false };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--title' || value === '--message') {
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
  return options;
}

export function shellQuote(value) {
  return `'${value.replaceAll("'", "'\"'\"'")}'`;
}

export function macCommand(title, message) {
  return `block-alert --title ${shellQuote(title)} --message ${shellQuote(message)}`;
}

export const JXA_SOURCE = String.raw`
ObjC.import('Cocoa');
function run(argv) {
  const title = argv[0] || 'AGENT IS BLOCKED. IT’S GIVING BRICK WALL.';
  const message = argv[1] || 'bestie... the agent is absolutely cooked. pls provide human aura.';
  if (argv[2] === '--compile-check') return 'ok';
  const app = $.NSApplication.sharedApplication;
  app.setActivationPolicy($.NSApplicationActivationPolicyRegular);
  const screen = $.NSScreen.mainScreen.frame;
  const window = $.NSWindow.alloc.initWithContentRectStyleMaskBackingDefer(
    screen, $.NSWindowStyleMaskBorderless, $.NSBackingStoreBuffered, false
  );
  window.setLevel($.NSScreenSaverWindowLevel);
  window.setBackgroundColor($.NSColor.redColor);
  window.setOpaque(true);
  const content = window.contentView;
  const titleLabel = $.NSTextField.labelWithString($(title));
  titleLabel.setTextColor($.NSColor.whiteColor);
  titleLabel.setFont($.NSFont.boldSystemFontOfSize(64));
  titleLabel.setAlignment($.NSTextAlignmentCenter);
  titleLabel.setFrame($.NSMakeRect(60, screen.size.height / 2 + 35, screen.size.width - 120, 100));
  content.addSubview(titleLabel);
  const messageLabel = $.NSTextField.wrappingLabelWithString($(message));
  messageLabel.setTextColor($.NSColor.whiteColor);
  messageLabel.setFont($.NSFont.systemFontOfSize(28));
  messageLabel.setAlignment($.NSTextAlignmentCenter);
  messageLabel.setFrame($.NSMakeRect(100, screen.size.height / 2 - 70, screen.size.width - 200, 90));
  content.addSubview(messageLabel);
  const button = $.NSButton.buttonWithTitleTargetAction($('AIGHT BET. I’M LOCKED IN.'), $.NSApp, 'terminate:');
  button.setBezelStyle($.NSBezelStyleRounded);
  button.setFont($.NSFont.boldSystemFontOfSize(26));
  button.setFrame($.NSMakeRect((screen.size.width - 260) / 2, screen.size.height / 2 - 180, 260, 58));
  content.addSubview(button);
  const sound = $.NSSound.soundNamed($('Basso'));
  if (sound) sound.play;
  window.makeKeyAndOrderFront(null);
  app.activateIgnoringOtherApps(true);
  app.run;
}
`;

export function showMacAlert(title, message, runner = spawnSync) {
  const result = runner('osascript', ['-l', 'JavaScript', '-e', JXA_SOURCE, '--', title, message], {
    encoding: 'utf8',
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`macOS alert failed (exit ${result.status})`);
}

export function relayToMac(title, message, runner = spawnSync) {
  const result = runner('ssh', ['oracle-mac', macCommand(title, message)], { encoding: 'utf8', stdio: 'inherit' });
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
    output(JSON.stringify({ title: options.title, message: options.message, action: options.relayMac ? 'relay-mac' : 'show-mac-alert' }));
    return;
  }
  if (options.relayMac) return relayToMac(options.title, options.message, runner);
  if (platform !== 'darwin') throw new Error('local alerts require macOS; run with --relay-mac from the VPS');
  return showMacAlert(options.title, options.message, runner);
}
