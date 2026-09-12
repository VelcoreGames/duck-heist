import { animationFrame, resolveClipDetailed } from '../animation';
import { SpriteAtlas } from '../atlas';
import type { ChibiMotionSample } from '../motion';
import type { AnimationSet, ChibiAppearance, ChibiPose, Facing } from '../types';
import { RenderLayer } from '../types';
import type { GpuSpriteEffects, GpuTextureRegion } from './types';
import { WebGLChibiRenderer } from './webglRenderer';

export interface GpuChibiStyle {
  shadowWidth?: number;
  shadowHeight?: number;
  shadowOpacity?: number;
  outline?: number;
  rim?: number;
  flash?: number;
  paletteStrength?: number;
  paletteIndex?: number;
  motion?: ChibiMotionSample;
}

const IDENTITY_MOTION: ChibiMotionSample = {
  offsetX: 0, offsetY: 0, scaleX: 1, scaleY: 1, rotation: 0, recoilX: 0, recoilY: 0,
};

const layerOrder = (facing: Facing): readonly (keyof ChibiAppearance)[] =>
  facing === 'up'
    ? ['weapon', 'body', 'outfit', 'face', 'hair', 'glasses', 'headwear', 'accessory']
    : ['body', 'outfit', 'face', 'hair', 'glasses', 'headwear', 'accessory', 'weapon'];

export class GpuChibiActorRenderer {
  private readonly textureId: string;

  constructor(
    private readonly renderer: WebGLChibiRenderer,
    private readonly atlas: SpriteAtlas,
    private readonly animations: AnimationSet,
    textureId = 'chibi-atlas',
  ) {
    this.textureId = textureId;
    renderer.registerTexture({ id: textureId, source: atlas.image, nearest: true });
  }

  region(frameName: string): GpuTextureRegion | undefined {
    const frame = this.atlas.frame(frameName);
    if (!frame) return undefined;
    const width = Math.max(1, this.atlas.image.naturalWidth || this.atlas.image.width);
    const height = Math.max(1, this.atlas.image.naturalHeight || this.atlas.image.height);
    return {
      textureId: this.textureId,
      u0: frame.x / width,
      v0: frame.y / height,
      u1: (frame.x + frame.w) / width,
      v1: (frame.y + frame.h) / height,
    };
  }

  submit(id: string, pose: ChibiPose, appearance: ChibiAppearance, style: GpuChibiStyle = {}): void {
    const resolved = resolveClipDetailed(this.animations, pose.state, pose.facing);
    if (!resolved) return;
    const animationName = animationFrame(resolved.clip, pose.tick, pose.phase ?? 0);
    if (!animationName) return;
    const scale = Math.max(0.01, pose.scale ?? 1);
    const motion = style.motion ?? IDENTITY_MOTION;
    const scaleX = scale * Math.max(0.65, Math.min(1.35, motion.scaleX));
    const scaleY = scale * Math.max(0.65, Math.min(1.35, motion.scaleY));
    const flipX = resolved.flipX !== !!pose.mirrorX;
    const actorX = pose.x + motion.offsetX + motion.recoilX;
    const actorY = pose.y + (pose.bob ?? 0) + motion.offsetY + motion.recoilY;
    const alpha = Math.max(0, Math.min(1, pose.alpha ?? 1));
    if (alpha <= 0) return;

    this.renderer.submitShadow(
      `${id}:shadow`,
      pose.x + motion.offsetX * 0.25,
      pose.y + 1 * scale,
      (style.shadowWidth ?? 19) * scale * Math.min(1.12, motion.scaleX),
      (style.shadowHeight ?? 7) * scale,
      (style.shadowOpacity ?? 0.28) * alpha,
      pose.y - 0.1,
    );

    const effects: GpuSpriteEffects = {
      flash: Math.max(style.flash ?? 0, pose.flash ?? 0),
      outline: style.outline ?? 0.45,
      rim: style.rim ?? 0.12,
      paletteStrength: style.paletteStrength ?? 0,
      paletteIndex: style.paletteIndex ?? 0,
    };

    let order = 0;
    for (const key of layerOrder(pose.facing)) {
      const layerId = appearance[key];
      if (!layerId) continue;
      const frameName = `${layerId}/${animationName}`;
      const frame = this.atlas.frame(frameName);
      const region = this.region(frameName);
      if (!frame || !region) continue;
      this.renderer.submitSprite({
        id: `${id}:${key}`,
        layer: RenderLayer.WORLD,
        sortY: pose.y,
        order: order++,
        x: actorX,
        y: actorY,
        width: frame.w * scaleX,
        height: frame.h * scaleY,
        pivotX: (frame.pivotX ?? Math.floor(frame.w / 2)) * scaleX,
        pivotY: (frame.pivotY ?? frame.h) * scaleY,
        rotation: motion.rotation,
        flipX,
        color: [1, 1, 1, alpha],
        region,
        effects,
      });
    }
  }

  socket(
    pose: ChibiPose,
    appearance: ChibiAppearance,
    name: string,
    motion: ChibiMotionSample = IDENTITY_MOTION,
  ): { x: number; y: number } | undefined {
    const resolved = resolveClipDetailed(this.animations, pose.state, pose.facing);
    if (!resolved) return undefined;
    const animationName = animationFrame(resolved.clip, pose.tick, pose.phase ?? 0);
    if (!animationName) return undefined;
    const frameName = `${appearance.body}/${animationName}`;
    const frame = this.atlas.frame(frameName);
    const socket = this.atlas.socket(frameName, name);
    if (!frame || !socket) return undefined;
    const scale = pose.scale ?? 1;
    const pivotX = frame.pivotX ?? Math.floor(frame.w / 2);
    const pivotY = frame.pivotY ?? frame.h;
    const flipX = resolved.flipX !== !!pose.mirrorX;
    const dx = (socket.x - pivotX) * scale * motion.scaleX * (flipX ? -1 : 1);
    const dy = (socket.y - pivotY) * scale * motion.scaleY;
    return {
      x: pose.x + motion.offsetX + motion.recoilX + dx,
      y: pose.y + (pose.bob ?? 0) + motion.offsetY + motion.recoilY + dy,
    };
  }
}
