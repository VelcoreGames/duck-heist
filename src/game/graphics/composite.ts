import { SpriteAtlas } from './atlas';

export interface CompositeSprite {
  canvas: HTMLCanvasElement;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

const frameBounds = (atlas: SpriteAtlas, frameName: string): Bounds | undefined => {
  const frame = atlas.frame(frameName);
  if (!frame) return undefined;
  const pivotX = frame.pivotX ?? Math.floor(frame.w / 2);
  const pivotY = frame.pivotY ?? frame.h;
  return {
    minX: -pivotX,
    minY: -pivotY,
    maxX: frame.w - pivotX,
    maxY: frame.h - pivotY,
  };
};

/** Cache LRU para colapsar múltiples capas visuales en un solo sprite. */
export class LayerCompositeCache {
  private readonly entries = new Map<string, CompositeSprite>();

  constructor(private maxEntries = 256) {}

  setLimit(maxEntries: number): void {
    this.maxEntries = Math.max(8, Math.floor(maxEntries));
    this.trim();
  }

  compose(atlas: SpriteAtlas, key: string, frameNames: readonly string[]): CompositeSprite | undefined {
    const ready = this.entries.get(key);
    if (ready) {
      this.entries.delete(key);
      this.entries.set(key, ready);
      return ready;
    }

    let bounds: Bounds | undefined;
    const valid: string[] = [];
    for (const frameName of frameNames) {
      const frame = frameBounds(atlas, frameName);
      if (!frame) continue;
      valid.push(frameName);
      if (!bounds) bounds = { ...frame };
      else {
        bounds.minX = Math.min(bounds.minX, frame.minX);
        bounds.minY = Math.min(bounds.minY, frame.minY);
        bounds.maxX = Math.max(bounds.maxX, frame.maxX);
        bounds.maxY = Math.max(bounds.maxY, frame.maxY);
      }
    }
    if (!bounds || !valid.length) return undefined;

    const width = Math.max(1, Math.ceil(bounds.maxX - bounds.minX));
    const height = Math.max(1, Math.ceil(bounds.maxY - bounds.minY));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) throw new Error('Duck Heist composite cache requires Canvas2D');
    ctx.imageSmoothingEnabled = false;
    const anchorX = -bounds.minX;
    const anchorY = -bounds.minY;
    for (const frameName of valid) atlas.draw(ctx, frameName, { x: anchorX, y: anchorY, snap: true });

    const composite: CompositeSprite = { canvas, ...bounds };
    this.entries.set(key, composite);
    this.trim();
    return composite;
  }

  clear(): void {
    for (const entry of this.entries.values()) {
      entry.canvas.width = 1;
      entry.canvas.height = 1;
    }
    this.entries.clear();
  }

  size(): number {
    return this.entries.size;
  }

  private trim(): void {
    while (this.entries.size > this.maxEntries) {
      const key = this.entries.keys().next().value as string | undefined;
      if (!key) break;
      const entry = this.entries.get(key);
      this.entries.delete(key);
      if (entry) {
        entry.canvas.width = 1;
        entry.canvas.height = 1;
      }
    }
  }
}
