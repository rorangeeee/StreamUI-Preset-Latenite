import './input-display.css';
import { keyboardGeometry, keyboardLayouts } from './keyboard-layouts.ts';
import type { KeyboardLayout } from './keyboard-layouts.ts';
import { KEY_BYTES, mouseArrow, readInputFrame } from './input-frame.ts';

export interface InputDisplaySettings {
  keyboard: boolean;
  mouse: boolean;
  keyboardLayout: KeyboardLayout;
  mouseMotion: boolean;
}

type FrameSubscription = (receive: (data: ArrayBuffer) => void) => () => void;
const inactiveKeys = new Uint8Array(KEY_BYTES);
const frameTimeout = 750;

export class InputDisplay {
  private readonly keyboard: HTMLElement;
  private readonly mouse: HTMLElement;
  private readonly mouseButtons: { element: HTMLElement; bit: number }[];
  private readonly motion: HTMLElement;
  private readonly arrow: HTMLElement;
  private keyCaps: { element: HTMLElement; codes: readonly number[] }[] = [];
  private activeKeys = new Uint8Array(KEY_BYTES);
  private buttons = 0;
  private layout: KeyboardLayout | null = null;
  private available = false;
  private active = true;
  private unsubscribe: (() => void) | null = null;
  private lastFrameAt = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(private root: HTMLElement, private subscribe: FrameSubscription) {
    this.keyboard = root.querySelector('.input-keyboard')!;
    this.mouse = root.querySelector('.input-mouse')!;
    this.mouseButtons = [...this.mouse.querySelectorAll<HTMLElement>('[data-mouse-button]')].map(element => ({
      element, bit: 1 << Number(element.dataset.mouseButton),
    }));
    this.motion = root.querySelector('.input-mouse-motion')!;
    this.arrow = root.querySelector('.input-mouse-arrow')!;
    document.addEventListener('visibilitychange', this.syncSubscription);
    window.addEventListener('pagehide', () => { this.active = false; this.syncSubscription(); });
    window.addEventListener('pageshow', () => { this.active = true; this.syncSubscription(); });
  }

  configure(settings: InputDisplaySettings, available: boolean): void {
    const keyboard = settings?.keyboard === true, mouse = settings?.mouse === true;
    const layout = settings?.keyboardLayout;
    this.available = available;
    this.root.hidden = !keyboard && !mouse;
    this.keyboard.hidden = !keyboard;
    this.mouse.hidden = !mouse;
    this.motion.hidden = settings?.mouseMotion === false;
    if (keyboard) this.setLayout(Object.hasOwn(keyboardLayouts, layout) ? layout : 'wasd');
    if (this.motion.hidden) this.drawMotion(0, 0);
    this.syncSubscription();
  }

  private setLayout(layout: KeyboardLayout): void {
    if (layout === this.layout) return;
    this.layout = layout;
    const geometry = keyboardGeometry(layout);
    this.keyboard.style.setProperty('--key-pitch', geometry.height > 2
      ? `calc(var(--input-height) / ${geometry.height})` : 'calc(104px * var(--ui-scale))');
    this.keyboard.style.width = `calc(${geometry.width} * var(--key-pitch) - var(--key-gap))`;
    this.keyboard.style.height = `calc(${geometry.height} * var(--key-pitch) - var(--key-gap))`;
    this.keyboard.classList.toggle('is-compact', geometry.height === 2);
    this.keyCaps = geometry.keys.map(({ label, codes, x, y, width, height }) => {
      const element = document.createElement('span');
      element.className = 'input-cell input-key';
      element.textContent = label;
      Object.assign(element.style, {
        left: `calc(${x} * var(--key-pitch))`, top: `calc(${y} * var(--key-pitch))`,
        width: `calc(${width} * var(--key-pitch) - var(--key-gap))`,
        height: `calc(${height} * var(--key-pitch) - var(--key-gap))`,
      });
      return { element, codes };
    });
    this.keyboard.replaceChildren(...this.keyCaps.map(key => key.element));
    this.drawKeys();
  }

  private syncSubscription = (): void => {
    if (this.active && this.available && !document.hidden && !this.root.hidden) {
      this.unsubscribe ??= this.subscribe(this.receive);
    } else if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
      this.reset();
    }
  };

  private receive = (data: ArrayBuffer): void => {
    if (!this.unsubscribe) return;
    const frame = readInputFrame(data);
    if (!frame) return;
    this.lastFrameAt = performance.now();
    this.timer ??= setTimeout(this.expire, frameTimeout);
    this.draw(frame.keys, frame.buttons);
    this.drawMotion(frame.x, frame.y);
  };

  private expire = (): void => {
    this.timer = null;
    const remaining = frameTimeout - (performance.now() - this.lastFrameAt);
    if (remaining > 0) this.timer = setTimeout(this.expire, remaining);
    else this.reset();
  };

  private reset(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    this.draw(inactiveKeys, 0);
    this.drawMotion(0, 0);
  }

  private drawKeys(): void {
    for (const { element, codes } of this.keyCaps) {
      element.classList.toggle('is-pressed', codes.some(code => (this.activeKeys[code >> 3] & (1 << (code & 7))) !== 0));
    }
  }

  private draw(keys: Uint8Array, buttons: number): void {
    if (keys.some((byte, index) => byte !== this.activeKeys[index])) {
      this.activeKeys.set(keys);
      this.drawKeys();
    }
    if (buttons !== this.buttons) {
      this.buttons = buttons;
      for (const { element, bit } of this.mouseButtons) element.classList.toggle('is-pressed', (buttons & bit) !== 0);
    }
  }

  private drawMotion(x: number, y: number): void {
    const arrow = this.mouse.hidden || this.motion.hidden ? null : mouseArrow(x, y);
    if (arrow) {
      this.arrow.style.width = `calc(${arrow.length}px * var(--ui-scale))`;
      this.arrow.style.transform = `translateY(-50%) rotate(${arrow.angle}rad)`;
    }
    this.arrow.classList.toggle('is-moving', arrow !== null);
  }
}
