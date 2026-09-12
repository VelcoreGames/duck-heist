export type Facing = 'down' | 'up' | 'left' | 'right';
export type CharacterState = 'idle' | 'walk' | 'shoot' | 'dash' | 'hurt' | 'down' | 'interact' | 'celebrate';
export type CoordinateSpace = 'world' | 'screen';

export enum RenderLayer {
  BACKGROUND = 0,
  FLOOR = 10,
  FLOOR_FX = 20,
  PROPS_BACK = 30,
  SHADOWS = 40,
  WORLD = 50,
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

export interface PixelRect {
  x: number;
  y: number;
  w: number;
  h: number;
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

export interface AnimationMarker {
  frame: number;
  event: string;
}

export interface AnimationClip {
  frames: readonly string[];
  frameDuration: number;
  loop?: boolean;
  markers?: readonly AnimationMarker[];
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
  lightStrength: number;
  pixelSnap: boolean;
  cullingMargin: number;
}

export interface LightSource {
  x: number;
  y: number;
  radius: number;
  color: string;
  intensity: number;
  falloff?: number;
  innerRadius?: number;
  flicker?: number;
  phase?: number;
  screenSpace?: boolean;
  coordinateSpace?: CoordinateSpace;
}

export interface RenderCommand {
  id: string;
  layer: RenderLayer;
  sortY: number;
  order?: number;
  depthBias?: number;
  bounds?: PixelRect;
  visible?: boolean;
  space?: CoordinateSpace;
  alpha?: number;
  composite?: GlobalCompositeOperation;
  clip?: PixelRect;
  draw: (ctx: CanvasRenderingContext2D) => void;
}

export interface GraphicsStats {
  submitted: number;
  drawn: number;
  worldDrawn: number;
  screenDrawn: number;
  culled: number;
  lights: number;
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
  phase?: number;
  scale?: number;
  alpha?: number;
  flash?: number;
  mirrorX?: boolean;
  bob?: number;
}

export interface ChibiRenderOptions {
  shadowWidth?: number;
  shadowHeight?: number;
  shadowOffsetY?: number;
  shadowOpacity?: number;
  outlineFlashColor?: string;
  flashStrength?: number;
}
