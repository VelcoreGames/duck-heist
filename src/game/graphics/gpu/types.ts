import type { Camera2D, CoordinateSpace, PixelRect, RenderLayer } from '../types';

export type GpuBlendMode = 'alpha' | 'add' | 'multiply';
export type GpuShape = 'sprite' | 'ellipse';

export interface GpuTextureRegion {
  textureId: string;
  u0: number;
  v0: number;
  u1: number;
  v1: number;
}

export interface GpuSpriteEffects {
  flash?: number;
  outline?: number;
  rim?: number;
  paletteStrength?: number;
  paletteIndex?: number;
  shape?: GpuShape;
}

export interface GpuSpriteCommand {
  id: string;
  layer: RenderLayer;
  sortY: number;
  x: number;
  y: number;
  width: number;
  height: number;
  pivotX?: number;
  pivotY?: number;
  rotation?: number;
  flipX?: boolean;
  flipY?: boolean;
  color?: readonly [number, number, number, number];
  region: GpuTextureRegion;
  effects?: GpuSpriteEffects;
  blend?: GpuBlendMode;
  space?: CoordinateSpace;
  depthBias?: number;
  bounds?: PixelRect;
  visible?: boolean;
  order?: number;
}

export interface GpuLightCommand {
  x: number;
  y: number;
  radius: number;
  color: readonly [number, number, number];
  intensity: number;
  innerRadius?: number;
  falloff?: number;
  flicker?: number;
  phase?: number;
  space?: CoordinateSpace;
  priority?: number;
}

export interface GpuPostStyle {
  ambientDarkness: number;
  ambientTint: readonly [number, number, number];
  tintStrength: number;
  vignette: number;
  lightStrength: number;
  exposure: number;
  gamma: number;
  saturation: number;
}

export interface GpuFrameInput {
  camera: Camera2D;
  style: GpuPostStyle;
  tick: number;
}

export interface GpuRendererStats {
  spritesSubmitted: number;
  spritesDrawn: number;
  spriteBatches: number;
  lightsSubmitted: number;
  lightsDrawn: number;
  particlesDrawn: number;
  culled: number;
  textureBinds: number;
  drawCalls: number;
}

export interface GpuCapabilities {
  webgl2: boolean;
  maxTextureSize: number;
  maxTextureUnits: number;
  maxSamples: number;
  renderer?: string;
  vendor?: string;
}

export interface GpuTextureSource {
  id: string;
  source: TexImageSource;
  nearest?: boolean;
  premultiplyAlpha?: boolean;
}

export interface GpuBackendOptions {
  logicalWidth: number;
  logicalHeight: number;
  maxSprites?: number;
  maxLights?: number;
  pixelSnap?: boolean;
  powerPreference?: WebGLPowerPreference;
}
