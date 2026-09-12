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

export interface AtlasLoadRequest {
  id: string;
  manifest: AtlasManifest;
  baseUrl?: string;
}

const joinUrl = (base: string, file: string) => {
  if (!base) return file;
  if (/^(https?:|data:|blob:|\/)/.test(file)) return file;
  return `${base.replace(/\/$/, '')}/${file.replace(/^\//, '')}`;
};

const finite = (n: number | undefined) => n === undefined || Number.isFinite(n);

function validateManifest(manifest: AtlasManifest, image: HTMLImageElement): void {
  const errors: string[] = [];
  for (const [name, frame] of Object.entries(manifest.frames)) {
    const ints = [frame.x, frame.y, frame.w, frame.h].every(Number.isInteger);
    if (!ints || frame.x < 0 || frame.y < 0 || frame.w <= 0 || frame.h <= 0) {
      errors.push(`${name}: invalid frame rectangle`);
      continue;
    }
    if (frame.x + frame.w > image.naturalWidth || frame.y + frame.h > image.naturalHeight) {
      errors.push(`${name}: frame exceeds atlas bounds`);
    }
    if (!finite(frame.pivotX) || !finite(frame.pivotY)) errors.push(`${name}: invalid pivot`);
    for (const [socketName, socket] of Object.entries(frame.sockets ?? {})) {
      if (!Number.isFinite(socket.x) || !Number.isFinite(socket.y)) {
        errors.push(`${name}: invalid socket ${socketName}`);
      }
    }
  }
  if (errors.length) {
    throw new Error(`Invalid sprite atlas (${errors.slice(0, 8).join('; ')}${errors.length > 8 ? '; …' : ''})`);
  }
}

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
    try {
      if (image.decode) await image.decode();
      else {
        await new Promise<void>((resolve, reject) => {
          image.onload = () => resolve();
          image.onerror = () => reject(new Error(`No se pudo cargar atlas: ${image.src}`));
        });
      }
    } catch {
      throw new Error(`No se pudo cargar atlas: ${image.src}`);
    }
    validateManifest(manifest, image);
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
    const alpha = Math.max(0, Math.min(1, options.alpha ?? 1));
    if (!Number.isFinite(scale) || scale === 0 || alpha <= 0) return false;
    const pivotX = frame.pivotX ?? Math.floor(frame.w / 2);
    const pivotY = frame.pivotY ?? frame.h;
    const snap = options.snap ?? true;
    const x = snap ? Math.round(options.x) : options.x;
    const y = snap ? Math.round(options.y) : options.y;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha *= alpha;
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
    const promise = SpriteAtlas.load(manifest, baseUrl)
      .then(atlas => {
        this.atlases.set(id, atlas);
        this.pending.delete(id);
        return atlas;
      })
      .catch(error => {
        this.pending.delete(id);
        throw error;
      });
    this.pending.set(id, promise);
    return promise;
  }

  async preload(requests: readonly AtlasLoadRequest[]): Promise<Map<string, SpriteAtlas>> {
    await Promise.all(requests.map(request => this.load(request.id, request.manifest, request.baseUrl ?? '')));
    return new Map(this.atlases);
  }

  get(id: string): SpriteAtlas | undefined {
    return this.atlases.get(id);
  }

  has(id: string): boolean {
    return this.atlases.has(id);
  }

  clear(): void {
    this.atlases.clear();
    this.pending.clear();
  }
}
