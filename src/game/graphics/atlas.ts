import type { AtlasManifest, PixelPoint, SpriteFrame } from './types';

export interface DrawFrameOptions {
  x: number;
  y: number;
  scale?: number;
  flipX?: boolean;
  alpha?: number;
  rotation?: number;
  snap?: boolean;
}

const joinUrl = (base: string, file: string) => {
  if (!base) return file;
  if (/^(https?:|data:|blob:|\/)/.test(file)) return file;
  return `${base.replace(/\/$/, '')}/${file.replace(/^\//, '')}`;
};

export class SpriteAtlas {
  readonly manifest: AtlasManifest;
  readonly image: HTMLImageElement;

  private constructor(manifest: AtlasManifest, image: HTMLImageElement) {
    this.manifest = manifest;
    this.image = image;
  }

  static async load(manifest: AtlasManifest, baseUrl = ''): Promise<SpriteAtlas> {
    const image = new Image();
    image.decoding = 'async';
    image.src = joinUrl(baseUrl, manifest.image);
    if (image.decode) {
      await image.decode();
    } else {
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error(`No se pudo cargar atlas: ${image.src}`));
      });
    }
    return new SpriteAtlas(manifest, image);
  }

  hasFrame(name: string): boolean {
    return !!this.manifest.frames[name];
  }

  frame(name: string): SpriteFrame | undefined {
    return this.manifest.frames[name];
  }

  socket(frameName: string, socketName: string): PixelPoint | undefined {
    return this.manifest.frames[frameName]?.sockets?.[socketName];
  }

  draw(ctx: CanvasRenderingContext2D, frameName: string, options: DrawFrameOptions): boolean {
    const frame = this.manifest.frames[frameName];
    if (!frame) return false;
    const scale = options.scale ?? 1;
    const pivotX = frame.pivotX ?? Math.floor(frame.w / 2);
    const pivotY = frame.pivotY ?? frame.h;
    const snap = options.snap ?? true;
    const x = snap ? Math.round(options.x) : options.x;
    const y = snap ? Math.round(options.y) : options.y;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha *= options.alpha ?? 1;
    ctx.translate(x, y);
    if (options.rotation) ctx.rotate(options.rotation);
    ctx.scale((options.flipX ? -1 : 1) * scale, scale);
    ctx.drawImage(
      this.image,
      frame.x,
      frame.y,
      frame.w,
      frame.h,
      -pivotX,
      -pivotY,
      frame.w,
      frame.h,
    );
    ctx.restore();
    return true;
  }
}

export class AtlasLibrary {
  private readonly atlases = new Map<string, SpriteAtlas>();
  private readonly pending = new Map<string, Promise<SpriteAtlas>>();

  async load(id: string, manifest: AtlasManifest, baseUrl = ''): Promise<SpriteAtlas> {
    const ready = this.atlases.get(id);
    if (ready) return ready;
    const active = this.pending.get(id);
    if (active) return active;
    const promise = SpriteAtlas.load(manifest, baseUrl).then(atlas => {
      this.atlases.set(id, atlas);
      this.pending.delete(id);
      return atlas;
    });
    this.pending.set(id, promise);
    return promise;
  }

  get(id: string): SpriteAtlas | undefined {
    return this.atlases.get(id);
  }

  clear(): void {
    this.atlases.clear();
    this.pending.clear();
  }
}
