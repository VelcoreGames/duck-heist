export interface SurfaceCacheStats {
  entries: number;
  pixels: number;
  hits: number;
  misses: number;
  evictions: number;
}

interface Entry {
  canvas: HTMLCanvasElement;
  pixels: number;
}

/**
 * Cache LRU para fondos y arquitectura estática de salas.
 * Evita redibujar mosaicos, paneles, alfombras y props fijos cada frame.
 */
export class StaticSurfaceCache {
  private readonly entries = new Map<string, Entry>();
  private pixels = 0;
  private hits = 0;
  private misses = 0;
  private evictions = 0;

  constructor(private maxPixels = 480 * 352 * 16) {}

  setBudget(maxPixels: number): void {
    this.maxPixels = Math.max(1, Math.floor(maxPixels));
    this.trim();
  }

  get(key: string): HTMLCanvasElement | undefined {
    const entry = this.entries.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }
    this.entries.delete(key);
    this.entries.set(key, entry);
    this.hits++;
    return entry.canvas;
  }

  getOrCreate(
    key: string,
    width: number,
    height: number,
    draw: (ctx: CanvasRenderingContext2D) => void,
  ): HTMLCanvasElement {
    const ready = this.get(key);
    if (ready && ready.width === width && ready.height === height) return ready;
    if (ready) this.remove(key);

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(width));
    canvas.height = Math.max(1, Math.floor(height));
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) throw new Error('Duck Heist surface cache requires Canvas2D');
    ctx.imageSmoothingEnabled = false;
    draw(ctx);

    const pixels = canvas.width * canvas.height;
    this.entries.set(key, { canvas, pixels });
    this.pixels += pixels;
    this.trim();
    return canvas;
  }

  remove(key: string): boolean {
    const entry = this.entries.get(key);
    if (!entry) return false;
    this.entries.delete(key);
    this.pixels -= entry.pixels;
    entry.canvas.width = 1;
    entry.canvas.height = 1;
    return true;
  }

  clear(): void {
    for (const entry of this.entries.values()) {
      entry.canvas.width = 1;
      entry.canvas.height = 1;
    }
    this.entries.clear();
    this.pixels = 0;
  }

  stats(): Readonly<SurfaceCacheStats> {
    return {
      entries: this.entries.size,
      pixels: this.pixels,
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
    };
  }

  private trim(): void {
    while (this.pixels > this.maxPixels && this.entries.size > 1) {
      const oldest = this.entries.keys().next().value as string | undefined;
      if (!oldest) break;
      if (this.remove(oldest)) this.evictions++;
    }
  }
}
