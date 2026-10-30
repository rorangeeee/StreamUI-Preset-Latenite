import test from 'node:test';
import assert from 'node:assert/strict';
import { awayMessages } from '../source/src/away-motion.ts';

test('away text accepts an ordered multi-segment list', () => {
  assert.deepEqual(awayMessages({ texts: [' 第一段 ', '第二段', ' ', 'THIRD'], text1: 'old' }), ['第一段', '第二段', 'THIRD']);
});

test('existing two-segment away settings remain readable', () => {
  assert.deepEqual(awayMessages({ text1: ' 旧文案 ', text2: 'BACK SOON' }), ['旧文案', 'BACK SOON']);
});
