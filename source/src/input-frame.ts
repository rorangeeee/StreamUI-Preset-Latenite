export const KEY_BYTES = 32;

// Desktop Input binary protocol v1. The display uses the active bitmaps,
// which also carry short presses and wheel pulses between render frames.
export function readInputFrame(data: ArrayBuffer) {
  if (data.byteLength !== 75) return null;
  const view = new DataView(data);
  if (view.getUint8(0) !== 1) return null;
  const x = view.getFloat32(67, true), y = view.getFloat32(71, true);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { keys: new Uint8Array(data, 35, KEY_BYTES), buttons: view.getUint8(2), x, y };
}

export function mouseArrow(x: number, y: number) {
  const speed = Math.hypot(x, y);
  return speed === 0 ? null : {
    angle: Math.atan2(y, x),
    length: 10 + 55 * speed / (speed + 1800),
  };
}
