import test from 'node:test';
import assert from 'node:assert/strict';
import { APPLE_SCRIPT, macCommand, main, parseArguments, shellQuote } from '../lib/block-alert.js';

test('defaults create a blocked alert', () => {
  assert.deepEqual(parseArguments([]), { title: 'AGENT IS BLOCKED. IT’S GIVING BRICK WALL.', message: 'bestie... the agent is absolutely cooked. pls provide human aura.', relayMac: false, dryRun: false });
});

test('rejects control characters and unexpected options', () => {
  assert.equal(parseArguments(['--message', 'line one\nline two']).message, 'line one line two');
  assert.throws(() => parseArguments(['--wat']), /unknown option/);
});

test('quotes a relay command without shell interpolation', () => {
  assert.equal(shellQuote("Joe's task"), "'Joe'\"'\"'s task'");
  assert.equal(macCommand('BLOCKED', "Joe's task"), "block-alert --title 'BLOCKED' --message 'Joe'\"'\"'s task'");
});

test('dry run is portable', async () => {
  const output = [];
  await main(['--relay-mac', '--dry-run'], { platform: 'linux', output: (line) => output.push(line) });
  assert.equal(JSON.parse(output[0]).action, 'relay-mac');
});

test('the native alert is a normal non-modal macOS notification', () => {
  assert.match(APPLE_SCRIPT, /display notification/);
  assert.doesNotMatch(APPLE_SCRIPT, /NSWindow|runModal|NSScreenSaverWindowLevel/);
});
