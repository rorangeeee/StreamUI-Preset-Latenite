interface KeyCap {
  codes: readonly number[];
  label: string;
  width: number;
  height: number;
}
type KeyRow = readonly (KeyCap | number)[];

// Windows Scan Code Set 1, with the E0 prefix represented by bit 7.
const key = (code: number | readonly number[], label: string, width = 1, height = 1): KeyCap => ({
  codes: typeof code === 'number' ? [code] : code, label, width, height,
});
const sequence = (start: number, labels: string) => Array.from(labels, (label, index) => key(start + index, label));

const escape = key(0x01, 'Esc');
const functions = Array.from({ length: 12 }, (_, index) => key(index < 10 ? 0x3b + index : 0x57 + index - 10, `F${index + 1}`));
const numberKeys = [key(0x29, '`'), ...sequence(0x02, '1234567890-='), key(0x0e, '⌫', 2)];
const qwerty = [key(0x0f, 'Tab', 1.5), ...sequence(0x10, 'QWERTYUIOP[]'), key(0x2b, '\\', 1.5)];
const homeRow = [key(0x3a, 'Caps', 1.75), ...sequence(0x1e, "ASDFGHJKL;'"), key(0x1c, 'Enter', 2.25)];
const shiftRow = [key(0x2a, 'Shift', 2.25), ...sequence(0x2c, 'ZXCVBNM,./')];
const bottomLeft = [key(0x1d, 'Ctrl', 1.25), key(0xdb, 'Win', 1.25), key(0x38, 'Alt', 1.25), key(0x39, 'Space', 6.25)];
const bottomRight = [key(0xb8, 'Alt', 1.25), key(0xdc, 'Win', 1.25), key(0xdd, 'Menu', 1.25), key(0x9d, 'Ctrl', 1.25)];
const typing = [numberKeys, qwerty, homeRow, [...shiftRow, key(0x36, 'Shift', 2.75)], [...bottomLeft, ...bottomRight]];

const up = key(0xc8, '↑');
const arrowBottom = [key(0xcb, '←'), key(0xd0, '↓'), key(0xcd, '→')];
const print = key(0xb7, 'Prt');
const insert = key(0xd2, 'Ins');
const del = key(0xd3, 'Del');
const home = key(0xc7, 'Home');
const end = key(0xcf, 'End');
const pageUp = key(0xc9, 'PgUp');
const pageDown = key(0xd1, 'PgDn');
const shortShift = [...shiftRow, key(0x36, 'Shift', 1.75), up];
const compactBottom = [...bottomLeft, key(0xb8, 'Alt'), key(0xdd, 'Menu'), key(0x9d, 'Ctrl'), ...arrowBottom];

const numpad = [
  [key(0x45, 'Num'), key(0xb5, '/'), key(0x37, '*'), key(0x4a, '−')],
  [key(0x47, '7'), key(0x48, '8'), key(0x49, '9'), key(0x4e, '+', 1, 2)],
  [key(0x4b, '4'), key(0x4c, '5'), key(0x4d, '6')],
  [key(0x4f, '1'), key(0x50, '2'), key(0x51, '3'), key(0x9c, 'Ent', 1, 2)],
  [key(0x52, '0', 2), key(0x53, '.')],
];

export const keyboardLayouts = {
  wasd: [[1, key(0x11, 'W')], [key(0x1e, 'A'), key(0x1f, 'S'), key(0x20, 'D')]],
  arrows: [[key([0x2a, 0x36], 'Shift', 1.35), 1.4, up], [key([0x1d, 0x9d], 'Ctrl', 1.35), .4, ...arrowBottom]],
  left: [
    [escape, .5, ...functions.slice(0, 4)],
    numberKeys.slice(0, 6),
    qwerty.slice(0, 6),
    homeRow.slice(0, 6),
    shiftRow.slice(0, 6),
    [...bottomLeft.slice(0, 3), key(0x39, 'Space', 3.5)],
  ],
  '60': typing,
  '75': [
    [escape, ...functions, print, insert, del],
    [...numberKeys, home],
    [...qwerty, pageUp],
    [...homeRow, pageDown],
    [...shortShift, end],
    compactBottom,
  ],
  '98': [
    [escape, .25, ...functions.slice(0, 4), .25, ...functions.slice(4, 8), .25, ...functions.slice(8), .25, del, 1.25, home, pageUp, pageDown],
    [...numberKeys, 1.25, ...numpad[0]],
    [...qwerty, 1.25, ...numpad[1]],
    [...homeRow, 1.25, ...numpad[2]],
    [...shortShift, 1.25, ...numpad[3]],
    [...compactBottom, .25, ...numpad[4]],
  ],
  '108': [
    [escape, 1, ...functions.slice(0, 4), .5, ...functions.slice(4, 8), .5, ...functions.slice(8),
      .5, print, key(0x46, 'ScrL'), key(0xc5, 'Pse'), .5, key(0xa0, 'Mute'), key(0xae, 'Vol−'), key(0xb0, 'Vol+'), key(0xa2, 'Play')],
    [...typing[0], .5, insert, home, pageUp, .5, ...numpad[0]],
    [...typing[1], .5, del, end, pageDown, .5, ...numpad[1]],
    [...typing[2], 4, ...numpad[2]],
    [...typing[3], 1.5, up, 1.5, ...numpad[3]],
    [...typing[4], .5, ...arrowBottom, .5, ...numpad[4]],
  ],
} satisfies Record<string, readonly KeyRow[]>;

export type KeyboardLayout = keyof typeof keyboardLayouts;

export function keyboardGeometry(layout: KeyboardLayout) {
  const rows: readonly KeyRow[] = keyboardLayouts[layout];
  let width = 0;
  const keys = rows.flatMap((row, y) => {
    let x = 0;
    const caps = row.flatMap(value => {
      if (typeof value === 'number') { x += value; return []; }
      const cap = { ...value, x, y };
      x += cap.width;
      return [cap];
    });
    width = Math.max(width, x);
    return caps;
  });
  return { width, height: rows.length, keys };
}
