import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const DEFAULT_TITLE = 'AGENT(S) BLOCKED';
const DEFAULT_MESSAGE = 'The process has reached the void. Your input is the only remaining event.';
const MAX_TEXT_LENGTH = 500;
const projectDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
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
export const CANDIDATE_SOUND_IDS = Object.freeze([
  'niblet-stylus', 'niblet-smart-stylus', 'pixel-core-miko', 'oscilla', 'usb-flash-spirit',
  'koiwave-courier', 'nixie-pulse', 'kiko-keycap', 'mikobyte-packet-manta', 'pixelin-holo-pad',
  'gyromochi', 'nimbit', 'nimbi-9', 'bytebun-relay', 'glom', 'bytebun-niko', 'bitbloom',
  'cachekin', 'bytebun-nova', 'bitbit-oracle',
]);
export const BLOCKED_SOUNDS = Object.freeze(CANDIDATE_SOUND_IDS.map((id) => path.join(projectDirectory, 'assets', 'sounds', 'candidates', `${id}.wav`)));
export const ASSET_PAYLOAD = Object.freeze({ mascotNames: MASCOT_IDS, mascots: MASCOT_FRAME_SETS, full: FULL_FRAME_SETS, compact: COMPACT_FRAME_SETS, blockedSounds: BLOCKED_SOUNDS });

export function parseArguments(argv) {
  const options = { title: DEFAULT_TITLE, message: DEFAULT_MESSAGE, duration: 15, state: 'blocked', compact: false, muted: false, relayMac: false, dryRun: false, keepOpen: false };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--title' || value === '--message' || value === '--duration' || value === '--state') {
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
    } else if (value === '--compact') {
      options.compact = true;
    } else if (value === '--mute') {
      options.muted = true;
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
  if (!['working', 'blocked'].includes(options.state)) throw new Error('state must be working or blocked');
  return options;
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

export const JXA_SOURCE = String.raw`
ObjC.import('Cocoa');
function run(argv) {
  const seconds = Math.max(2, Math.min(30, Number(argv[2]) || 15));
  const assets = JSON.parse(argv[3] || '{}');
  const alertState = argv[4] === 'working' ? 'working' : 'blocked';
  var compactMode = argv[5] === '--compact';
  const keepOpen = argv[6] === '--keep-open';
  const defaults = $.NSUserDefaults.standardUserDefaults;
  var muted = argv[7] === '--mute' || defaults.boolForKey($('agent-alert.sound-muted'));
  if (argv[8] === '--compile-check') return 'ok';
  const mascotFrameSets = assets.mascots || [];
  const mascotNames = assets.mascotNames || [];
  const fullFrameSets = (assets.full || {})[alertState] || [];
  const compactFrameSets = (assets.compact || {})[alertState] || [];
  const app = $.NSApplication.sharedApplication;
  app.setActivationPolicy($.NSApplicationActivationPolicyAccessory);
  const screen = $.NSScreen.mainScreen.visibleFrame;
  const width = compactMode ? 230 : 430;
  const height = compactMode ? 150 : 220;
  const frame = $.NSMakeRect(screen.origin.x + screen.size.width - width - 16, screen.origin.y + 24, width, height);
  const panel = $.NSPanel.alloc.initWithContentRectStyleMaskBackingDefer(
    frame,
    $.NSWindowStyleMaskBorderless | $.NSWindowStyleMaskNonactivatingPanel,
    $.NSBackingStoreBuffered,
    false
  );
  panel.setFloatingPanel(true);
  panel.setLevel($.NSFloatingWindowLevel);
  panel.setCollectionBehavior($.NSWindowCollectionBehaviorCanJoinAllSpaces | $.NSWindowCollectionBehaviorFullScreenAuxiliary | $.NSWindowCollectionBehaviorStationary);
  panel.setHidesOnDeactivate(false);
  panel.setIgnoresMouseEvents(false);
  panel.setBecomesKeyOnlyIfNeeded(false);
  panel.setAcceptsMouseMovedEvents(true);
  panel.setMinSize($.NSMakeSize(180, 120));
  panel.setFrameAutosaveName($('agent-alert.pet-frame-v4'));
  panel.setFrameUsingName($('agent-alert.pet-frame-v4'));
  panel.setOpaque(false);
  panel.setBackgroundColor($.NSColor.clearColor);
  panel.setHasShadow(false);
  var selectedPair = 0;
  var previousRect = $.NSZeroRect;
  var nextRect = $.NSZeroRect;
  var pointerDown = null;
  var pendingArrow = 0;
  var root = null;
  var pet = null;
  var bubble = null;
  var compactIcon = null;
  var previousLabel = null;
  var nextLabel = null;
  var mascotNameLabel = null;
  var muteItem = null;
  const blockedSounds = (assets.blockedSounds || []).map(function (soundPath) {
    return soundPath ? $.NSSound.alloc.initWithContentsOfFileByReference($(soundPath), true) : null;
  });

  function currentBlockedSound() {
    return blockedSounds[selectedPair % blockedSounds.length] || null;
  }
  function stopBlockedSounds() {
    blockedSounds.forEach(function (sound) { if (sound) sound.stop; });
  }
  function playBlockedSound() {
    if (alertState !== 'blocked' || muted) return;
    stopBlockedSounds();
    const sound = currentBlockedSound();
    if (sound) sound.play;
  }

  function containsPoint(rect, point) {
    return point.x >= rect.origin.x && point.x <= rect.origin.x + rect.size.width && point.y >= rect.origin.y && point.y <= rect.origin.y + rect.size.height;
  }
  function edgeMask(point, bounds) {
    const edge = 10;
    var mask = 0;
    if (point.x <= edge) mask |= 1;
    if (point.x >= bounds.size.width - edge) mask |= 2;
    if (point.y <= edge) mask |= 4;
    if (point.y >= bounds.size.height - edge) mask |= 8;
    return mask;
  }
  function setCursor(point) {
    if (containsPoint(previousRect, point) || containsPoint(nextRect, point)) return $.NSCursor.pointingHandCursor.set;
    const mask = edgeMask(point, root.bounds);
    if (mask & 3) return $.NSCursor.resizeLeftRightCursor.set;
    if (mask & 12) return $.NSCursor.resizeUpDownCursor.set;
    return $.NSCursor.openHandCursor.set;
  }
  function layout() {
    const bounds = root.bounds;
    const viewWidth = bounds.size.width;
    const viewHeight = bounds.size.height;
    const arrowY = 6;
    previousRect = $.NSMakeRect(viewWidth / 2 - 112, arrowY, 40, 30);
    nextRect = $.NSMakeRect(viewWidth / 2 + 72, arrowY, 40, 30);
    previousLabel.setFrame(previousRect);
    nextLabel.setFrame(nextRect);
    mascotNameLabel.setFrame($.NSMakeRect(viewWidth / 2 - 72, arrowY + 7, 144, 20));
    mascotNameLabel.setStringValue($((mascotNames[selectedPair] || '').replace(/-/g, ' ').toUpperCase()));
    if (compactMode) {
      const petSize = Math.max(72, Math.min(viewHeight - 42, viewWidth * 0.58));
      pet.setFrame($.NSMakeRect(8, 34, petSize, petSize));
      compactIcon.setFrame($.NSMakeRect(viewWidth - 78, viewHeight - 78, 66, 66));
      pet.setHidden(false);
      bubble.setHidden(true);
      compactIcon.setHidden(false);
    } else {
      const petSize = Math.max(105, Math.min(viewHeight - 54, viewWidth * 0.34));
      pet.setFrame($.NSMakeRect(8, 35, petSize, petSize));
      bubble.setFrame($.NSMakeRect(petSize - 2, 48, Math.max(170, viewWidth - petSize - 12), Math.max(100, viewHeight - 58)));
      pet.setHidden(false);
      bubble.setHidden(false);
      compactIcon.setHidden(true);
    }
  }
  function changeMode(nextCompact) {
    if (compactMode === nextCompact) return;
    compactMode = nextCompact;
    const oldFrame = panel.frame;
    const nextWidth = compactMode ? 230 : 430;
    const nextHeight = compactMode ? 150 : 220;
    panel.setFrameDisplay($.NSMakeRect(oldFrame.origin.x, oldFrame.origin.y, nextWidth, nextHeight), true);
    layout();
    panel.saveFrameUsingName($('agent-alert.pet-frame-v4'));
  }

  ObjC.registerSubclass({
    name: 'BlockAlertInteractionView',
    superclass: 'NSView',
    methods: {
      'acceptsFirstMouse:': { types: ['bool', ['id']], implementation: function () { return true; } },
      'resetCursorRects': {
        types: ['void', []],
        implementation: function () {
          const bounds = this.bounds;
          this.addCursorRectCursor(bounds, $.NSCursor.openHandCursor);
          this.addCursorRectCursor($.NSMakeRect(0, 0, 10, bounds.size.height), $.NSCursor.resizeLeftRightCursor);
          this.addCursorRectCursor($.NSMakeRect(bounds.size.width - 10, 0, 10, bounds.size.height), $.NSCursor.resizeLeftRightCursor);
          this.addCursorRectCursor($.NSMakeRect(0, 0, bounds.size.width, 10), $.NSCursor.resizeUpDownCursor);
          this.addCursorRectCursor($.NSMakeRect(0, bounds.size.height - 10, bounds.size.width, 10), $.NSCursor.resizeUpDownCursor);
          this.addCursorRectCursor(previousRect, $.NSCursor.pointingHandCursor);
          this.addCursorRectCursor(nextRect, $.NSCursor.pointingHandCursor);
        }
      },
      'mouseMoved:': {
        types: ['void', ['id']],
        implementation: function (event) { setCursor(this.convertPointFromView(event.locationInWindow, null)); }
      },
      'cursorUpdate:': {
        types: ['void', ['id']],
        implementation: function (event) { setCursor(this.convertPointFromView(event.locationInWindow, null)); }
      },
      'mouseDown:': {
        types: ['void', ['id']],
        implementation: function (event) {
          const point = this.convertPointFromView(event.locationInWindow, null);
          pendingArrow = containsPoint(previousRect, point) ? -1 : (containsPoint(nextRect, point) ? 1 : 0);
          if (pendingArrow) { $.NSCursor.pointingHandCursor.set; return; }
          pointerDown = { mouse: $.NSEvent.mouseLocation, frame: panel.frame, edges: edgeMask(point, this.bounds) };
          if (!pointerDown.edges) $.NSCursor.closedHandCursor.set;
        }
      },
      'mouseDragged:': {
        types: ['void', ['id']],
        implementation: function () {
          if (!pointerDown || pendingArrow) return;
          const current = $.NSEvent.mouseLocation;
          const dx = current.x - pointerDown.mouse.x;
          const dy = current.y - pointerDown.mouse.y;
          var x = pointerDown.frame.origin.x;
          var y = pointerDown.frame.origin.y;
          var widthNow = pointerDown.frame.size.width;
          var heightNow = pointerDown.frame.size.height;
          if (!pointerDown.edges) { x += dx; y += dy; }
          if (pointerDown.edges & 1) { x += dx; widthNow -= dx; }
          if (pointerDown.edges & 2) widthNow += dx;
          if (pointerDown.edges & 4) { y += dy; heightNow -= dy; }
          if (pointerDown.edges & 8) heightNow += dy;
          const minWidth = compactMode ? 180 : 350;
          const minHeight = compactMode ? 120 : 180;
          if (widthNow < minWidth) { if (pointerDown.edges & 1) x -= minWidth - widthNow; widthNow = minWidth; }
          if (heightNow < minHeight) { if (pointerDown.edges & 4) y -= minHeight - heightNow; heightNow = minHeight; }
          panel.setFrameDisplay($.NSMakeRect(x, y, widthNow, heightNow), true);
          layout();
          panel.invalidateCursorRectsForView(root);
        }
      },
      'mouseUp:': {
        types: ['void', ['id']],
        implementation: function (event) {
          const point = this.convertPointFromView(event.locationInWindow, null);
          if (pendingArrow && ((pendingArrow < 0 && containsPoint(previousRect, point)) || (pendingArrow > 0 && containsPoint(nextRect, point)))) {
            selectedPair = (selectedPair + pendingArrow + mascotFrameSets.length) % mascotFrameSets.length;
            playBlockedSound();
          }
          pendingArrow = 0;
          pointerDown = null;
          panel.saveFrameUsingName($('agent-alert.pet-frame-v4'));
          panel.invalidateCursorRectsForView(root);
          setCursor(point);
        }
      },
      'rightMouseDown:': {
        types: ['void', ['id']],
        implementation: function (event) {
          muteItem.setTitle($(muted ? 'Unmute sound' : 'Mute sound'));
          $.NSMenu.popUpContextMenuWithEventForView(contextMenu, event, this);
        }
      }
    }
  });
  const content = $.NSView.alloc.initWithFrame($.NSMakeRect(0, 0, panel.frame.size.width, panel.frame.size.height));
  content.setAutoresizingMask($.NSViewWidthSizable | $.NSViewHeightSizable);
  panel.setContentView(content);
  root = $.BlockAlertInteractionView.alloc.initWithFrame($.NSMakeRect(0, 0, panel.frame.size.width, panel.frame.size.height));
  root.setAutoresizingMask($.NSViewWidthSizable | $.NSViewHeightSizable);
  bubble = $.NSImageView.alloc.initWithFrame($.NSZeroRect);
  bubble.setImageScaling($.NSImageScaleProportionallyUpOrDown);
  content.addSubview(bubble);
  pet = $.NSImageView.alloc.initWithFrame($.NSZeroRect);
  pet.setImageScaling($.NSImageScaleProportionallyUpOrDown);
  content.addSubview(pet);
  compactIcon = $.NSImageView.alloc.initWithFrame($.NSZeroRect);
  compactIcon.setImageScaling($.NSImageScaleProportionallyUpOrDown);
  content.addSubview(compactIcon);
  previousLabel = $.NSTextField.labelWithString($('‹'));
  previousLabel.setFont($.NSFont.systemFontOfSize(28));
  previousLabel.setTextColor($.NSColor.secondaryLabelColor);
  previousLabel.setAlignment($.NSTextAlignmentCenter);
  content.addSubview(previousLabel);
  nextLabel = $.NSTextField.labelWithString($('›'));
  nextLabel.setFont($.NSFont.systemFontOfSize(28));
  nextLabel.setTextColor($.NSColor.secondaryLabelColor);
  nextLabel.setAlignment($.NSTextAlignmentCenter);
  content.addSubview(nextLabel);
  mascotNameLabel = $.NSTextField.labelWithString($(''));
  mascotNameLabel.setFont($.NSFont.boldSystemFontOfSize(10));
  mascotNameLabel.setTextColor($.NSColor.secondaryLabelColor);
  mascotNameLabel.setAlignment($.NSTextAlignmentCenter);
  content.addSubview(mascotNameLabel);
  content.addSubview(root);

  ObjC.registerSubclass({
    name: 'BlockAlertContextController',
    methods: {
      'showCompact:': { types: ['void', ['id']], implementation: function () { changeMode(true); } },
      'showFull:': { types: ['void', ['id']], implementation: function () { changeMode(false); } },
      'toggleMute:': {
        types: ['void', ['id']],
        implementation: function () {
          muted = !muted;
          defaults.setBoolForKey(muted, $('agent-alert.sound-muted'));
          defaults.synchronize;
          if (muted) stopBlockedSounds();
        }
      },
      'closeAlert:': { types: ['void', ['id']], implementation: function () { panel.orderOut(null); } }
    }
  });
  const contextController = $.BlockAlertContextController.alloc.init;
  const contextMenu = $.NSMenu.alloc.initWithTitle($('agent-alert'));
  const compactItem = $.NSMenuItem.alloc.initWithTitleActionKeyEquivalent($('Compact status'), 'showCompact:', $(''));
  compactItem.setTarget(contextController);
  contextMenu.addItem(compactItem);
  const fullItem = $.NSMenuItem.alloc.initWithTitleActionKeyEquivalent($('Full status'), 'showFull:', $(''));
  fullItem.setTarget(contextController);
  contextMenu.addItem(fullItem);
  muteItem = $.NSMenuItem.alloc.initWithTitleActionKeyEquivalent($(muted ? 'Unmute sound' : 'Mute sound'), 'toggleMute:', $(''));
  muteItem.setTarget(contextController);
  contextMenu.addItem(muteItem);
  contextMenu.addItem($.NSMenuItem.separatorItem);
  const closeItem = $.NSMenuItem.alloc.initWithTitleActionKeyEquivalent($('Close'), 'closeAlert:', $(''));
  closeItem.setTarget(contextController);
  contextMenu.addItem(closeItem);
  layout();
  panel.orderFront(null);
  const ticks = Math.ceil(seconds * 24);
  for (let tick = 0; keepOpen || tick < ticks; tick += 1) {
    if (!panel.visible) break;
    const petPaths = mascotFrameSets[selectedPair] || [];
    const bubblePaths = fullFrameSets[selectedPair] || [];
    const compactPaths = compactFrameSets[selectedPair] || [];
    const petPath = petPaths[tick % petPaths.length];
    const bubblePath = bubblePaths[tick % bubblePaths.length];
    const compactPath = compactPaths[tick % compactPaths.length];
    if (petPath) {
      const image = $.NSImage.alloc.initWithContentsOfFile($(petPath));
      if (image) pet.setImage(image);
    }
    if (bubblePath) {
      const image = $.NSImage.alloc.initWithContentsOfFile($(bubblePath));
      if (image) bubble.setImage(image);
    }
    if (compactPath) {
      const image = $.NSImage.alloc.initWithContentsOfFile($(compactPath));
      if (image) compactIcon.setImage(image);
    }
    if (alertState === 'blocked' && !muted && tick % 240 === 0) playBlockedSound();
    layout();
    $.NSRunLoop.currentRunLoop.runUntilDate($.NSDate.dateWithTimeIntervalSinceNow(1 / 24));
  }
  stopBlockedSounds();
  panel.orderOut(null);
}
`;

export function showMacAlert(title, message, duration, keepOpen = false, state = 'blocked', compact = false, muted = false, runner = spawnSync) {
  const args = ['-l', 'JavaScript', '-e', JXA_SOURCE, '--', title, message, String(duration), JSON.stringify(ASSET_PAYLOAD), state, compact ? '--compact' : '', keepOpen ? '--keep-open' : '', muted ? '--mute' : ''];
  const result = runner('osascript', args, {
    encoding: 'utf8',
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`macOS corner alert failed (exit ${result.status})`);
}

export function relayToMac(title, message, duration, keepOpen = false, state = 'blocked', compact = false, muted = false, runner = spawnSync) {
  const result = runner('ssh', ['oracle-mac', macCommand(title, message, duration, keepOpen, state, compact, muted)], { encoding: 'utf8', stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Mac relay failed (exit ${result.status})`);
}

export async function main(argv, { platform = process.platform, runner = spawnSync, output = console.log } = {}) {
  const options = parseArguments(argv);
  if (options.help) {
    output('Usage: agent-alert [--state working|blocked] [--compact] [--mute] [--duration 2..30] [--keep-open] [--relay-mac] [--dry-run]');
    return;
  }
  if (options.dryRun) {
    output(JSON.stringify({ state: options.state, compact: options.compact, muted: options.muted, duration: options.duration, keepOpen: options.keepOpen, action: options.relayMac ? 'relay-mac' : 'show-corner-pet' }));
    return;
  }
  if (options.relayMac) return relayToMac(options.title, options.message, options.duration, options.keepOpen, options.state, options.compact, options.muted, runner);
  if (platform !== 'darwin') throw new Error('local alerts require macOS; run with --relay-mac from the VPS');
  return showMacAlert(options.title, options.message, options.duration, options.keepOpen, options.state, options.compact, options.muted, runner);
}
