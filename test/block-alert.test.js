import test from 'node:test';
import assert from 'node:assert/strict';
import { BRAIN_CELL_FRAMES, JXA_SOURCE, macCommand, main, parseArguments, shellQuote } from '../lib/block-alert.js';

test('defaults create a blocked alert', () => {
  assert.deepEqual(parseArguments([]), { title: 'AGENT IS BLOCKED. IT’S GIVING BRICK WALL.', message: 'bestie... the agent is absolutely cooked. pls provide human aura.', duration: 15, relayMac: false, dryRun: false, keepOpen: false });
});

test('rejects control characters and unexpected options', () => {
  assert.equal(parseArguments(['--message', 'line one\nline two']).message, 'line one line two');
  assert.equal(parseArguments(['--keep-open']).keepOpen, true);
  assert.throws(() => parseArguments(['--wat']), /unknown option/);
});

test('quotes a relay command without shell interpolation', () => {
  assert.equal(shellQuote("Joe's task"), "'Joe'\"'\"'s task'");
  assert.equal(macCommand('BLOCKED', "Joe's task", 15), "block-alert --title 'BLOCKED' --message 'Joe'\"'\"'s task' --duration '15'");
});

test('dry run is portable', async () => {
  const output = [];
  await main(['--relay-mac', '--dry-run'], { platform: 'linux', output: (line) => output.push(line) });
  assert.equal(JSON.parse(output[0]).action, 'relay-mac');
});

test('the native alert is a bounded, closable corner pet', () => {
  assert.equal(BRAIN_CELL_FRAMES.length, 32);
  assert.match(BRAIN_CELL_FRAMES[0], /assets\/braincell-frames-32\/frame-1\.png$/);
  assert.match(JXA_SOURCE, /NSWindowStyleMaskClosable/);
  assert.match(JXA_SOURCE, /NSWindowStyleMaskNonactivatingPanel/);
  assert.match(JXA_SOURCE, /NSPopUpMenuWindowLevel/);
  assert.match(JXA_SOURCE, /NSWindowCollectionBehaviorCanJoinAllSpaces/);
  assert.match(JXA_SOURCE, /click the red X anytime/);
  assert.match(JXA_SOURCE, /NSImageView/);
  assert.match(JXA_SOURCE, /framePaths\[tick % framePaths\.length\]/);
  assert.match(JXA_SOURCE, /runUntilDate/);
  assert.match(JXA_SOURCE, /if \(!panel\.visible\) break/);
  assert.doesNotMatch(JXA_SOURCE, /NSScreenSaverWindowLevel|runModal|activateIgnoringOtherApps/);
});
