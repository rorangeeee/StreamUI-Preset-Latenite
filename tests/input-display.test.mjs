import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { keyboardGeometry } from '../source/src/keyboard-layouts.ts';
import { mouseArrow, readInputFrame } from '../source/src/input-frame.ts';

test('all keyboard presets have their own nonoverlapping physical keys', async () => {
  const settings = await readFile(new URL('../settings/scene.html', import.meta.url), 'utf8');
  const counts = { wasd: 4, arrows: 6, left: 33, '60': 61, '75': 84, '98': 98, '108': 108 };
  const options = [...settings.matchAll(/<option value="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(new Set(options), new Set(Object.keys(counts)));
  for (const [layout, count] of Object.entries(counts)) {
    const { keys, width, height } = keyboardGeometry(layout);
    assert.equal(keys.length, count, layout);
    const codes = keys.flatMap(key => key.codes);
    assert.equal(new Set(codes).size, codes.length, layout);
    for (const [index, a] of keys.entries()) {
      assert.ok(a.x + a.width <= width && a.y + a.height <= height, a.label);
      for (const b of keys.slice(index + 1)) {
        assert.ok(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y,
          `${layout}: ${a.label} overlaps ${b.label}`);
      }
    }
  }
  const left = keyboardGeometry('left').keys;
  for (const [row, label] of ['F4', '5', 'T', 'G', 'B', 'Space'].entries()) {
    assert.equal(left.filter(key => key.y === row).at(-1).label, label);
  }
});

test('input frames use the active keys and buttons and a signed motion vector', () => {
  const bytes = new ArrayBuffer(75), view = new DataView(bytes);
  view.setUint8(0, 1);
  view.setUint8(2, 0x48);
  view.setUint8(35 + (0x11 >> 3), 1 << (0x11 & 7));
  view.setFloat32(67, -3600, true);
  view.setFloat32(71, 3600, true);
  const frame = readInputFrame(bytes);
  assert.equal(frame.keys[0x11 >> 3], 2);
  assert.equal(frame.buttons, 0x48);
  assert.equal(mouseArrow(frame.x, frame.y).angle, 3 * Math.PI / 4);
  assert.ok(mouseArrow(frame.x, frame.y).length > mouseArrow(-1, 1).length);
  assert.equal(mouseArrow(0, 0), null);
  assert.equal(readInputFrame(new ArrayBuffer(8)), null);
  view.setFloat32(67, NaN, true);
  assert.equal(readInputFrame(bytes), null);
});
