const SVG_NS = 'http://www.w3.org/2000/svg';

/** Interpolate in device pixels: SVG units alone change with the canvas zoom. */
export function filterSteps(value: number, pixelScale: number) {
  const scale = Math.max(.0001, pixelScale);
  const pixels = Math.max(0, value * scale);
  const lower = Math.floor(pixels);
  return { lower: lower / scale, upper: (lower + 1) / scale, mix: pixels - lower };
}

/** Smooth the raster steps only while the edges are sharp; keep the original peak. */
export class TitleInkFilter {
  private lowerGrowth = this.primitive('feMorphology', 'SourceGraphic', 'growth-low');
  private upperGrowth = this.primitive('feMorphology', 'SourceGraphic', 'growth-high');
  private growthBlend = this.primitive('feComposite', 'growth-low', 'grown');
  private lowerBlur = this.primitive('feGaussianBlur', 'grown', 'blur-low');
  private upperBlur = this.primitive('feGaussianBlur', 'grown', 'blur-high');
  private blurBlend = this.primitive('feComposite', 'blur-low', '');

  constructor(filter: SVGFilterElement) {
    for (const node of [this.lowerGrowth, this.upperGrowth]) node.setAttribute('operator', 'dilate');
    for (const node of [this.growthBlend, this.blurBlend]) node.setAttribute('operator', 'arithmetic');
    filter.append(this.lowerGrowth, this.upperGrowth, this.growthBlend, this.lowerBlur, this.upperBlur, this.blurBlend);
  }

  private primitive(name: string, input: string, result: string): SVGElement {
    const node = document.createElementNS(SVG_NS, name);
    node.setAttribute('in', input);
    if (result) node.setAttribute('result', result);
    return node;
  }

  private blend(node: SVGElement, lower: string, upper: string, mix: number): void {
    // Refer to the same input at rest so the unused expensive branch can be pruned.
    node.setAttribute('in', mix === 1 ? upper : lower);
    node.setAttribute('in2', mix === 0 ? lower : upper);
    node.setAttribute('k2', String(1 - mix));
    node.setAttribute('k3', String(mix));
  }

  update(extension: number, blur: number, pixelScale: number): void {
    const growth = filterSteps(extension, pixelScale);
    const sigma = filterSteps(blur, pixelScale);
    const blurPixels = blur * pixelScale;
    // Fade out morphology interpolation between 2 and 4 pixels of blur.
    const t = Math.max(0, Math.min(1, (blurPixels - 2) / 2));
    const smooth = 1 - t * t * (3 - 2 * t);
    const mix = growth.mix * smooth + Math.round(growth.mix) * (1 - smooth);
    this.lowerGrowth.setAttribute('radius', `${growth.lower} 0`);
    this.upperGrowth.setAttribute('radius', `${growth.upper} 0`);
    this.blend(this.growthBlend, 'growth-low', 'growth-high', mix);
    // Small Gaussian kernels also have discrete steps. Blend adjacent kernels
    // until 4px; at that boundary both paths converge to the original blur.
    this.lowerBlur.setAttribute('stdDeviation', `${blurPixels < 4 ? sigma.lower : blur} 0`);
    this.upperBlur.setAttribute('stdDeviation', `${sigma.upper} 0`);
    this.blend(this.blurBlend, 'blur-low', 'blur-high', blurPixels < 4 ? sigma.mix : 0);
  }
}
