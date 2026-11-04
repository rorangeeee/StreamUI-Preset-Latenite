import { sampleOnAir } from './on-air-motion.ts';

const WIDTH = 200, HEIGHT = 100, RASTER_SCALE = 2;
const WEIGHTS = [150, 200, 300, 400, 500, 600, 700, 800, 850];
const FONT = '"StreamUI SF Pro", sans-serif';

function raster(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = width * RASTER_SCALE; canvas.height = height * RASTER_SCALE;
  const context = canvas.getContext('2d')!;
  context.scale(RASTER_SCALE, RASTER_SCALE);
  return [canvas, context];
}

/** Rasterize native font instances once; animate cached glyphs without SVG text layout. */
export class OnAirIndicator extends HTMLElement {
  private canvas!: HTMLCanvasElement;
  private context!: CanvasRenderingContext2D;
  private weights: HTMLCanvasElement[] = [];
  private record: HTMLCanvasElement[] = [];
  private elapsed = 0;
  private previousTime = 0;
  private animation = 0;
  private ready = false;
  private reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  private tick = (time: number) => {
    if (this.previousTime) this.elapsed += Math.min(100, Math.max(0, time - this.previousTime));
    this.previousTime = time; this.render(this.elapsed);
    this.animation = requestAnimationFrame(this.tick);
  };
  private sync = () => {
    cancelAnimationFrame(this.animation); this.animation = 0; this.previousTime = 0;
    if (!this.ready || !this.isConnected) return;
    this.render(this.elapsed);
    if (!document.hidden && !this.reducedMotion.matches) this.animation = requestAnimationFrame(this.tick);
  };

  connectedCallback(): void {
    document.addEventListener('visibilitychange', this.sync);
    this.reducedMotion.addEventListener('change', this.sync);
    if (this.canvas) { this.sync(); return; }
    [this.canvas, this.context] = raster(WIDTH, HEIGHT);
    this.canvas.setAttribute('aria-hidden', 'true'); this.append(this.canvas);
    void this.loadFont();
  }

  disconnectedCallback(): void {
    cancelAnimationFrame(this.animation); this.animation = 0; this.previousTime = 0;
    document.removeEventListener('visibilitychange', this.sync);
    this.reducedMotion.removeEventListener('change', this.sync);
  }

  private async loadFont(): Promise<void> {
    let loaded = false;
    try {
      const fonts = await Promise.all([...WEIGHTS, 1000].map(weight => document.fonts.load(`${weight} 25px ${FONT}`, 'ON AIR')));
      loaded = fonts.every(faces => faces.length > 0);
    } catch { /* Use the configured system face if the local font is unavailable. */ }
    this.weights = WEIGHTS.map(weight => {
      const [canvas, context] = raster(150, 50);
      context.font = `${weight} 25px ${FONT}`;
      context.fillText('N AIR', 0, 38);
      return canvas;
    });
    this.record = ['#000000', '#8a1024'].map(color => {
      const [canvas, context] = raster(WIDTH, HEIGHT);
      context.translate(47.409679, 72.872441);
      context.font = `1000 25px ${FONT}`; context.fillStyle = color;
      context.fillText('O', 0, 0);
      const metrics = context.measureText('O');
      const width = metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight;
      const height = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
      context.beginPath();
      context.arc((metrics.actualBoundingBoxRight - metrics.actualBoundingBoxLeft) / 2,
        (metrics.actualBoundingBoxDescent - metrics.actualBoundingBoxAscent) / 2, Math.min(width, height) * .42, 0, Math.PI * 2);
      context.fill();
      return canvas;
    });
    this.dataset.fonts = loaded ? 'ready' : 'fallback'; this.ready = true; this.sync();
  }

  private render(time: number): void {
    const state = this.reducedMotion.matches ? { width: 100, weight: 200, slant: 0, recording: true } : sampleOnAir(time);
    const context = this.context;
    context.clearRect(0, 0, WIDTH, HEIGHT);
    context.drawImage(this.record[Number(state.recording)], 0, 0, WIDTH, HEIGHT);
    this.dataset.recording = String(state.recording);
    const upper = Math.max(1, WEIGHTS.findIndex(weight => weight >= state.weight));
    const lower = upper - 1, blend = Math.max(0, Math.min(1, (state.weight - WEIGHTS[lower]) / (WEIGHTS[upper] - WEIGHTS[lower])));
    context.save();
    context.translate(66.494679, 72.872441);
    context.transform(state.width / 100, 0, -Math.tan(state.slant * Math.PI / 180), 1, 0, 0);
    context.globalCompositeOperation = 'lighter';
    context.globalAlpha = 1 - blend;
    context.drawImage(this.weights[lower], 0, -38, 150, 50);
    context.globalAlpha = blend;
    context.drawImage(this.weights[upper], 0, -38, 150, 50);
    context.restore();
  }
}

customElements.define('on-air-indicator', OnAirIndicator);
