import test from 'node:test';
import assert from 'node:assert/strict';
import { BLOCKED_SOUNDS, CANDIDATE_SOUND_IDS, COMPACT_FRAME_SETS, FULL_FRAME_SETS, JXA_SOURCE, MASCOT_FRAME_SETS, macCommand, main, parseArguments, shellQuote } from '../lib/agent-alert.js';

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

test('the native alert is a transparent, closable animated pet carousel', () => {
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
  assert.match(JXA_SOURCE, /NSWindowStyleMaskBorderless/);
  assert.match(JXA_SOURCE, /NSWindowStyleMaskNonactivatingPanel/);
  assert.match(JXA_SOURCE, /panel\.setIgnoresMouseEvents\(false\)/);
  assert.match(JXA_SOURCE, /panel\.setBecomesKeyOnlyIfNeeded\(false\)/);
  assert.match(JXA_SOURCE, /panel\.orderFront\(null\)/);
  assert.doesNotMatch(JXA_SOURCE, /panel\.makeKeyAndOrderFront\(null\)/);
  assert.doesNotMatch(JXA_SOURCE, /NSWindowStyleMaskTitled|NSWindowStyleMaskClosable|NSWindowStyleMaskResizable/);
  assert.match(JXA_SOURCE, /NSFloatingWindowLevel/);
  assert.match(JXA_SOURCE, /NSWindowCollectionBehaviorCanJoinAllSpaces/);
  assert.match(JXA_SOURCE, /rightMouseDown:/);
  assert.match(JXA_SOURCE, /closeAlert:/);
  assert.doesNotMatch(JXA_SOURCE, /performClose:|closeButton|NSButton/);
  assert.match(JXA_SOURCE, /mouseDragged:/);
  assert.match(JXA_SOURCE, /resizeLeftRightCursor/);
  assert.match(JXA_SOURCE, /resizeUpDownCursor/);
  assert.match(JXA_SOURCE, /closedHandCursor/);
  assert.match(JXA_SOURCE, /pointingHandCursor/);
  assert.match(JXA_SOURCE, /setFrameAutosaveName/);
  assert.match(JXA_SOURCE, /NSImageScaleProportionallyUpOrDown/);
  assert.match(JXA_SOURCE, /ObjC\.registerSubclass/);
  assert.match(JXA_SOURCE, /pendingArrow/);
  assert.match(JXA_SOURCE, /bubblePaths\[tick % bubblePaths\.length\]/);
  assert.match(JXA_SOURCE, /compactPaths\[tick % compactPaths\.length\]/);
  assert.match(JXA_SOURCE, /toggleMute:/);
  assert.match(JXA_SOURCE, /tick % 240 === 0/);
  assert.match(JXA_SOURCE, /playBlockedSound/);
  assert.match(JXA_SOURCE, /alertState === 'blocked'/);
  assert.doesNotMatch(JXA_SOURCE, /wrappingLabelWithString/);
  assert.match(JXA_SOURCE, /NSImageView/);
  assert.match(JXA_SOURCE, /petPaths\[tick % petPaths\.length\]/);
  assert.match(JXA_SOURCE, /runUntilDate/);
  assert.match(JXA_SOURCE, /if \(!panel\.visible\) break/);
  assert.doesNotMatch(JXA_SOURCE, /NSPopUpMenuWindowLevel|NSScreenSaverWindowLevel|runModal|activateIgnoringOtherApps/);
});
