export type Facing = 'down' | 'up' | 'left' | 'right';
export type CharacterState = 'idle' | 'walk' | 'shoot' | 'dash' | 'hurt' | 'down';

export enum RenderLayer {
  BACKGROUND = 0,
  FLOOR = 10,
  FLOOR_FX = 20,
  PROPS_BACK = 30,
  SHADOWS = 40,
  ACTORS = 50,
  PROPS_FRONT = 60,
  PROJECTILES = 70,
  FX = 80,
  LIGHTING = 90,
  OVERLAY = 100,
}

export interface PixelPoint {
  x: number;
  y: number;
}

export interface SpriteFrame {
  x: number;
  y: number;
  w: number;
  h: number;
  pivotX?: number;
  pivotY?: number;
  sockets?: Record<string, PixelPoint>;
}

export interface AtlasManifest {
  image: string;
  frames: Record<string, SpriteFrame>;
}

export interface AnimationClip {
  frames: readonly string[];
  frameDuration: number;
  loop?: boolean;
}

export type DirectionalClips = Partial<Record<Facing, AnimationClip>>;

export type AnimationSet = Partial<Record<CharacterState, DirectionalClips>>;

export interface Camera2D {
  x: number;
  y: number;
  zoom: number;
  shakeX?: number;
  shakeY?: number;
}

export interface FrameStyle {
  ambientDarkness: number;
  ambientTint: string;
  tintStrength: number;
  vignette: number;
  shadowOpacity: number;
  shadowColor: string;
}

export interface LightSource {
  x: number;
  y: number;
  radius: number;
  color: string;
  intensity: number;
  falloff?: number;
}

export interface RenderCommand {
  id: string;
  layer: RenderLayer;
  sortY: number;
  order?: number;
  draw: (ctx: CanvasRenderingContext2D) => void;
}

export interface ChibiAppearance {
  body: string;
  outfit?: string;
  hair?: string;
  face?: string;
  glasses?: string;
  headwear?: string;
  accessory?: string;
  weapon?: string;
}

export interface ChibiPose {
  x: number;
  y: number;
  facing: Facing;
  state: CharacterState;
  tick: number;
  scale?: number;
  alpha?: number;
  flash?: number;
}

export interface ChibiRenderOptions {
  shadowWidth?: number;
  shadowHeight?: number;
  shadowOffsetY?: number;
  shadowOpacity?: number;
  outlineFlashColor?: string;
}
