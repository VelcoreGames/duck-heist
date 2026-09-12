import { animationFrame, resolveClipDetailed } from './animation';
import { SpriteAtlas } from './atlas';
import { LayerCompositeCache } from './composite';
import { drawBlobShadow } from './renderer';
import type {
  AnimationSet,
  ChibiAppearance,
  ChibiPose,
  ChibiRenderOptions,
  Facing,
  SpriteFrame,
} from './types';

const BASE_LAYERS: readonly (keyof ChibiAppearance)[] = [
  'body', 'outfit', 'face', 'hair', 'glasses', 'headwear', 'accessory',
];

const layerOrder = (facing: Facing): readonly (keyof ChibiAppearance)[] => {
  if (facing === 'up') return ['weapon', ...BASE_LAYERS];
  return [...BASE_LAYERS, 'weapon'];
};

const layerFrameName = (layerId: string, animationFrameName: string) => `${layerId}/${animationFrameName}`;

interface LocalBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

const frameLocalBounds = (frame: SpriteFrame, scale: number, flipX: boolean): LocalBounds => {
  const pivotX = frame.pivotX ?? Math.floor(frame.w / 2);
  const pivotY = frame.pivotY ?? frame.h;
  const left = flipX ? -(frame.w - pivotX) : -pivotX;
  const right = flipX ? pivotX : frame.w - pivotX;
  return {
    minX: left * scale,
    maxX: right * scale,
    minY: -pivotY * scale,
    maxY: (frame.h - pivotY) * scale,
  };
};

export class ChibiActorRenderer {
  private readonly atlas: SpriteAtlas;
  private readonly animations: AnimationSet;
  private readonly composite = new LayerCompositeCache(320);
  private readonly scratch: HTMLCanvasElement;
  private readonly scratchCtx: CanvasRenderingContext2D;

  constructor(atlas: SpriteAtlas, animations: AnimationSet) {
    this.atlas = atlas;
    this.animations = animations;
    this.scratch = document.createElement('canvas');
    this.scratch.width = 1;
    this.scratch.height = 1;
    const scratchCtx = this.scratch.getContext('2d', { alpha: true });
    if (!scratchCtx) throw new Error('Duck Heist chibi renderer requires Canvas2D');
    scratchCtx.imageSmoothingEnabled = false;
    this.scratchCtx = scratchCtx;
  }

  draw(
    ctx: CanvasRenderingContext2D,
    pose: ChibiPose,
    appearance: ChibiAppearance,
    options: ChibiRenderOptions = {},
  ): void {
    const resolved = resolveClipDetailed(this.animations, pose.state, pose.facing);
    if (!resolved) return;
    const frameName = animationFrame(resolved.clip, pose.tick, pose.phase ?? 0);
    if (!frameName) return;

    const scale = pose.scale ?? 1;
    const alpha = Math.max(0, Math.min(1, pose.alpha ?? 1));
    if (scale <= 0 || alpha <= 0) return;
    const flipX = resolved.flipX !== !!pose.mirrorX;
    const actorY = pose.y + (pose.bob ?? 0);
    const motion = pose.state === 'walk' ? Math.abs(Math.sin((pose.tick + (pose.phase ?? 0)) * 0.16)) : 0;
    const dashFactor = pose.state === 'dash' ? 0.82 : 1;
    const shadowW = (options.shadowWidth ?? 19) * scale * dashFactor * (1 - motion * 0.035);
    const shadowH = (options.shadowHeight ?? 7) * scale * (pose.state === 'dash' ? 0.72 : 1);
    const shadowY = pose.y + (options.shadowOffsetY ?? 1) * scale;

    drawBlobShadow(
      ctx,
      pose.x,
      shadowY,
      shadowW,
      shadowH,
      (options.shadowOpacity ?? 0.28) * alpha,
    );

    const flash = Math.max(0, Math.min(1, pose.flash ?? 0));
    if (flash > 0) {
      this.drawFlashed(ctx, pose.x, actorY, scale, alpha, flipX, pose.facing, appearance, frameName, flash, options);
      return;
    }

    this.drawOptimized(ctx, pose.x, actorY, scale, alpha, flipX, pose.facing, appearance, frameName);
  }

  socket(
    pose: ChibiPose,
    appearance: ChibiAppearance,
    socketName: string,
  ): { x: number; y: number } | undefined {
    const resolved = resolveClipDetailed(this.animations, pose.state, pose.facing);
    if (!resolved) return undefined;
    const frameName = animationFrame(resolved.clip, pose.tick, pose.phase ?? 0);
    if (!frameName) return undefined;
    const atlasFrame = layerFrameName(appearance.body, frameName);
    const frame = this.atlas.frame(atlasFrame);
    const socket = this.atlas.socket(atlasFrame, socketName);
    if (!frame || !socket) return undefined;
    const scale = pose.scale ?? 1;
    const pivotX = frame.pivotX ?? Math.floor(frame.w / 2);
    const pivotY = frame.pivotY ?? frame.h;
    const flipX = resolved.flipX !== !!pose.mirrorX;
    const dx = (socket.x - pivotX) * scale * (flipX ? -1 : 1);
    return {
      x: pose.x + dx,
      y: pose.y + (pose.bob ?? 0) + (socket.y - pivotY) * scale,
    };
  }

  dispose(): void {
    this.composite.clear();
    this.scratch.width = 1;
    this.scratch.height = 1;
  }

  private drawOptimized(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    scale: number,
    alpha: number,
    flipX: boolean,
    facing: Facing,
    appearance: ChibiAppearance,
    frameName: string,
  ): void {
    if (facing === 'up') this.drawWeapon(ctx, x, y, scale, alpha, flipX, appearance, frameName);
    this.drawBaseComposite(ctx, x, y, scale, alpha, flipX, appearance, frameName);
    if (facing !== 'up') this.drawWeapon(ctx, x, y, scale, alpha, flipX, appearance, frameName);
  }

  private drawBaseComposite(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    scale: number,
    alpha: number,
    flipX: boolean,
    appearance: ChibiAppearance,
    frameName: string,
  ): void {
    const ids = BASE_LAYERS.map(key => appearance[key] ?? '');
    const frameNames = BASE_LAYERS
      .map(key => appearance[key])
      .filter((id): id is string => !!id)
      .map(id => layerFrameName(id, frameName));
    const cacheKey = `${frameName}|${ids.join('|')}`;
    const composite = this.composite.compose(this.atlas, cacheKey, frameNames);
    if (!composite) return;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha *= alpha;
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale((flipX ? -1 : 1) * scale, scale);
    ctx.drawImage(composite.canvas, composite.minX, composite.minY);
    ctx.restore();
  }

  private drawWeapon(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    scale: number,
    alpha: number,
    flipX: boolean,
    appearance: ChibiAppearance,
    frameName: string,
  ): void {
    if (!appearance.weapon) return;
    const candidate = layerFrameName(appearance.weapon, frameName);
    if (!this.atlas.hasFrame(candidate)) return;
    this.atlas.draw(ctx, candidate, { x, y, scale, alpha, flipX, snap: true });
  }

  private drawLayers(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    scale: number,
    alpha: number,
    flipX: boolean,
    facing: Facing,
    appearance: ChibiAppearance,
    frameName: string,
  ): void {
    ctx.save();
    ctx.globalAlpha *= alpha;
    for (const key of layerOrder(facing)) {
      const layerId = appearance[key];
      if (!layerId) continue;
      const candidate = layerFrameName(layerId, frameName);
      if (!this.atlas.hasFrame(candidate)) continue;
      this.atlas.draw(ctx, candidate, { x, y, scale, alpha: 1, flipX, snap: true });
    }
    ctx.restore();
  }

  private boundsFor(
    appearance: ChibiAppearance,
    facing: Facing,
    frameName: string,
    scale: number,
    flipX: boolean,
  ): LocalBounds | undefined {
    let result: LocalBounds | undefined;
    for (const key of layerOrder(facing)) {
      const layerId = appearance[key];
      if (!layerId) continue;
      const frame = this.atlas.frame(layerFrameName(layerId, frameName));
      if (!frame) continue;
      const bounds = frameLocalBounds(frame, scale, flipX);
      if (!result) result = { ...bounds };
      else {
        result.minX = Math.min(result.minX, bounds.minX);
        result.minY = Math.min(result.minY, bounds.minY);
        result.maxX = Math.max(result.maxX, bounds.maxX);
        result.maxY = Math.max(result.maxY, bounds.maxY);
      }
    }
    return result;
  }

  private drawFlashed(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    scale: number,
    alpha: number,
    flipX: boolean,
    facing: Facing,
    appearance: ChibiAppearance,
    frameName: string,
    flash: number,
    options: ChibiRenderOptions,
  ): void {
    const bounds = this.boundsFor(appearance, facing, frameName, scale, flipX);
    if (!bounds) return;
    const padding = 3;
    const width = Math.max(1, Math.ceil(bounds.maxX - bounds.minX + padding * 2));
    const height = Math.max(1, Math.ceil(bounds.maxY - bounds.minY + padding * 2));
    if (this.scratch.width !== width || this.scratch.height !== height) {
      this.scratch.width = width;
      this.scratch.height = height;
      this.scratchCtx.imageSmoothingEnabled = false;
    }
    const sctx = this.scratchCtx;
    sctx.setTransform(1, 0, 0, 1, 0, 0);
    sctx.clearRect(0, 0, width, height);
    const anchorX = padding - bounds.minX;
    const anchorY = padding - bounds.minY;
    this.drawLayers(sctx, anchorX, anchorY, scale, 1, flipX, facing, appearance, frameName);
    sctx.save();
    sctx.globalCompositeOperation = 'source-atop';
    sctx.globalAlpha = flash * Math.max(0, Math.min(1, options.flashStrength ?? 0.8));
    sctx.fillStyle = options.outlineFlashColor ?? '#fff5cf';
    sctx.fillRect(0, 0, width, height);
    sctx.restore();

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha *= alpha;
    ctx.drawImage(this.scratch, Math.round(x + bounds.minX - padding), Math.round(y + bounds.minY - padding));
    ctx.restore();
  }
}

const walkClip = (direction: 'down' | 'up' | 'right') => ({
  frames: [`walk/${direction}/0`, `walk/${direction}/1`, `walk/${direction}/2`, `walk/${direction}/3`],
  frameDuration: 6,
  markers: [{ frame: 0, event: 'footstep' }, { frame: 2, event: 'footstep' }],
} as const);

const shootClip = (direction: 'down' | 'up' | 'right') => ({
  frames: [`shoot/${direction}/0`, `shoot/${direction}/1`],
  frameDuration: 4,
  markers: [{ frame: 0, event: 'muzzle' }],
} as const);

export const DEFAULT_CHIBI_ANIMATIONS: AnimationSet = {
  idle: {
    down: { frames: ['idle/down/0', 'idle/down/1'], frameDuration: 24 },
    up: { frames: ['idle/up/0', 'idle/up/1'], frameDuration: 24 },
    right: { frames: ['idle/right/0', 'idle/right/1'], frameDuration: 24 },
  },
  walk: {
    down: walkClip('down'),
    up: walkClip('up'),
    right: walkClip('right'),
  },
  shoot: {
    down: shootClip('down'),
    up: shootClip('up'),
    right: shootClip('right'),
  },
  dash: {
    down: { frames: ['dash/down/0', 'dash/down/1'], frameDuration: 3, loop: false, markers: [{ frame: 0, event: 'dash' }] },
    up: { frames: ['dash/up/0', 'dash/up/1'], frameDuration: 3, loop: false, markers: [{ frame: 0, event: 'dash' }] },
    right: { frames: ['dash/right/0', 'dash/right/1'], frameDuration: 3, loop: false, markers: [{ frame: 0, event: 'dash' }] },
  },
  hurt: {
    down: { frames: ['hurt/down/0'], frameDuration: 8, loop: false },
    up: { frames: ['hurt/up/0'], frameDuration: 8, loop: false },
    right: { frames: ['hurt/right/0'], frameDuration: 8, loop: false },
  },
  down: {
    down: { frames: ['down/down/0'], frameDuration: 12, loop: false },
  },
};
