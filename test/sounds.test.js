import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { BLOCKED_SOUNDS } from '../lib/agent-alert.js';

function wavDuration(buffer) {
  assert.equal(buffer.toString('ascii', 0, 4), 'RIFF');
  assert.equal(buffer.toString('ascii', 8, 12), 'WAVE');
  let offset = 12;
  let byteRate = 0;
  let dataBytes = 0;
  while (offset + 8 <= buffer.length) {
    const name = buffer.toString('ascii', offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    if (name === 'fmt ') byteRate = buffer.readUInt32LE(offset + 16);
    if (name === 'data') dataBytes = size;
    offset += 8 + size + (size % 2);
  }
  assert.ok(byteRate > 0 && dataBytes > 0);
  return dataBytes / byteRate;
}

test('every mascot melody is unique and long enough to feel musical', () => {
  assert.equal(BLOCKED_SOUNDS.length, 20);
  const hashes = new Set();
  for (const soundPath of BLOCKED_SOUNDS) {
    const buffer = readFileSync(soundPath);
    hashes.add(createHash('sha256').update(buffer).digest('hex'));
    assert.ok(wavDuration(buffer) >= 4.8, `${soundPath} is too short`);
  }
  assert.equal(hashes.size, BLOCKED_SOUNDS.length);
});
