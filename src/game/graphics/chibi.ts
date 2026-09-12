import { animationFrame, resolveClip } from './animation';
import { SpriteAtlas } from './atlas';
import { drawBlobShadow } from './renderer';
import type {
  AnimationSet,
  ChibiAppearance,
  ChibiPose,
  ChibiRenderOptions,
  Facing,
} from './types';

const layerOrder = (facing: Facing): readonly (keyof ChibiAppearance)[] => {
  if (facing === 'up') return ['weapon', 'body', 'outfit', 'face', 'hair', 'glasses', 'headwear', 'accessory'];
  return ['body', 'outfit', 'face', 'hair', 'glasses', 'headwear', 'accessory', 'weapon'];
};

const layerFrameName = (layerId: string, animationFrameName: string) => `${layerId}/${animationFrameName}`;

export class ChibiActorRenderer {
  private readonly atlas: SpriteAtlas;
  private readonly animations: AnimationSet;

  constructor(atlas: SpriteAtlas, animations: AnimationSet) {
    this.atlas = atlas;
    this.animations = animations;
  }

  draw(
    ctx: CanvasRenderingContext2D,
    pose: ChibiPose,
    appearance: ChibiAppearance,
    options: ChibiRenderOptions = {},
  ): void {
    const clip = resolveClip(this.animations, pose.state, pose.facing);
    if (!clip) return;
    const frameName = animationFrame(clip, pose.tick);
    if (!frameName) return;

    const scale = pose.scale ?? 1;
    const alpha = pose.alpha ?? 1;
    const shadowW = (options.shadowWidth ?? 19) * scale;
    const shadowH = (options.shadowHeight ?? 7) * scale;
    const shadowY = pose.y + (options.shadowOffsetY ?? 1) * scale;
    drawBlobShadow(
      ctx,
      pose.x,
      shadowY,
      shadowW,
      shadowH,
      (options.shadowOpacity ?? 0.28) * alpha,
    );

    ctx.save();
    ctx.globalAlpha *= alpha;
    for (const key of layerOrder(pose.facing)) {
      const layerId = appearance[key];
      if (!layerId) continue;
      const candidate = layerFrameName(layerId, frameName);
      if (!this.atlas.hasFrame(candidate)) continue;
      this.atlas.draw(ctx, candidate, {
        x: pose.x,
        y: pose.y,
        scale,
        alpha: 1,
        snap: true,
      });
    }

    if ((pose.flash ?? 0) > 0) {
      const flash = Math.max(0, Math.min(1, pose.flash ?? 0));
      ctx.globalAlpha = flash * 0.22;
      ctx.fillStyle = options.outlineFlashColor ?? '#fff5cf';
      ctx.beginPath();
      ctx.ellipse(pose.x, pose.y - 14 * scale, 12 * scale, 15 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  socket(
    pose: ChibiPose,
    appearance: ChibiAppearance,
    socketName: string,
  ): { x: number; y: number } | undefined {
    const clip = resolveClip(this.animations, pose.state, pose.facing);
    if (!clip) return undefined;
    const frameName = animationFrame(clip, pose.tick);
    if (!frameName) return undefined;
    const layerId = appearance.body;
    const atlasFrame = layerFrameName(layerId, frameName);
    const frame = this.atlas.frame(atlasFrame);
    const socket = this.atlas.socket(atlasFrame, socketName);
    if (!frame || !socket) return undefined;
    const scale = pose.scale ?? 1;
    const pivotX = frame.pivotX ?? Math.floor(frame.w / 2);
    const pivotY = frame.pivotY ?? frame.h;
    return {
      x: pose.x + (socket.x - pivotX) * scale,
      y: pose.y + (socket.y - pivotY) * scale,
    };
  }
}

export const DEFAULT_CHIBI_ANIMATIONS: AnimationSet = {
  idle: {
    down: { frames: ['idle/down/0', 'idle/down/1'], frameDuration: 24 },
    up: { frames: ['idle/up/0', 'idle/up/1'], frameDuration: 24 },
    left: { frames: ['idle/left/0', 'idle/left/1'], frameDuration: 24 },
    right: { frames: ['idle/right/0', 'idle/right/1'], frameDuration: 24 },
  },
  walk: {
    down: { frames: ['walk/down/0', 'walk/down/1', 'walk/down/2', 'walk/down/3'], frameDuration: 6 },
    up: { frames: ['walk/up/0', 'walk/up/1', 'walk/up/2', 'walk/up/3'], frameDuration: 6 },
    left: { frames: ['walk/left/0', 'walk/left/1', 'walk/left/2', 'walk/left/3'], frameDuration: 6 },
    right: { frames: ['walk/right/0', 'walk/right/1', 'walk/right/2', 'walk/right/3'], frameDuration: 6 },
  },
  shoot: {
    down: { frames: ['shoot/down/0', 'shoot/down/1'], frameDuration: 4 },
    up: { frames: ['shoot/up/0', 'shoot/up/1'], frameDuration: 4 },
    left: { frames: ['shoot/left/0', 'shoot/left/1'], frameDuration: 4 },
    right: { frames: ['shoot/right/0', 'shoot/right/1'], frameDuration: 4 },
  },
  dash: {
    down: { frames: ['dash/down/0', 'dash/down/1'], frameDuration: 3, loop: false },
    up: { frames: ['dash/up/0', 'dash/up/1'], frameDuration: 3, loop: false },
    left: { frames: ['dash/left/0', 'dash/left/1'], frameDuration: 3, loop: false },
    right: { frames: ['dash/right/0', 'dash/right/1'], frameDuration: 3, loop: false },
  },
  hurt: {
    down: { frames: ['hurt/down/0'], frameDuration: 8, loop: false },
    up: { frames: ['hurt/up/0'], frameDuration: 8, loop: false },
    left: { frames: ['hurt/left/0'], frameDuration: 8, loop: false },
    right: { frames: ['hurt/right/0'], frameDuration: 8, loop: false },
  },
  down: {
    down: { frames: ['down/down/0'], frameDuration: 12, loop: false },
  },
};
