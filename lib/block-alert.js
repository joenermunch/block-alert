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

export const APPLE_SCRIPT = String.raw`
on run argv
  display notification (item 1 of argv) with title (item 2 of argv) subtitle "agent needs human aura" sound name "Basso"
end run
`;

export function showMacAlert(title, message, runner = spawnSync) {
  const result = runner('osascript', ['-e', APPLE_SCRIPT, '--', message, title], {
    encoding: 'utf8',
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`macOS notification failed (exit ${result.status})`);
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
