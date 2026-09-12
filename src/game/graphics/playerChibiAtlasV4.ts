import type { DuckDir } from '../types';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../constants';
import { RenderLayer } from './types';
import { createGpuBackend } from './gpu/backend';
import { drawChibiPlayerV3 } from './playerChibiV3';

type Ctx = CanvasRenderingContext2D;
type VisualState = 'idle' | 'walk' | 'shoot' | 'dash' | 'hurt' | 'down' | 'interact';
type AtlasState = 'idle' | 'walk' | 'shoot' | 'interact';

const ATLAS_URL = new URL('../../assets/chibi/base-duck-approved-atlas.png', import.meta.url).href;
const ATLAS_W = 600;
const ATLAS_H = 120;
const FRAME_W = 20;
const FRAME_H = 30;
const COLS = 30;
const ROWS = 4;
const DRAW_W = 20;
const DRAW_H = 30;
const PIVOT_X = DRAW_W / 2;
const PIVOT_Y = DRAW_H - 1;
const TEXTURE_ID = 'base-duck-v4-real-atlas';
const WEAPON_TEXTURE_ID = 'base-duck-v4-held-weapon';

const STATE_START: Record<AtlasState, number> = { idle: 0, walk: 4, shoot: 16, interact: 22 };
const STATE_FRAMES: Record<AtlasState, number> = { idle: 4, walk: 12, shoot: 6, interact: 8 };
const ROW: Record<DuckDir, number> = { down: 0, up: 1, left: 2, right: 3 };

export const CHIBI_BASE_DUCK_REAL_FRAMES = 120;

export interface ChibiPlayerAtlasV4Input {
  ctx: Ctx;
  x: number;
  y: number;
  frame: number;
  dir: DuckDir;
  moving: boolean;
  hurt: boolean;
  dashing: boolean;
  shooting: boolean;
  dead?: boolean;
  interacting?: boolean;
  skinId?: string;
  alpha?: number;
  runtimeKey?: object;
  shotSequence?: number;
}

interface Runtime {
  state: VisualState;
  enteredAt: number;
  lastFrame: number;
  lastShot?: number;
  lastShoot: boolean;
  lastDash: boolean;
  lastHurt: boolean;
}

interface Pose {
  atlasState: AtlasState;
  index: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  offsetX: number;
  offsetY: number;
  flash: number;
}

const runtimes = new WeakMap<object, Runtime>();
const fallbackRuntime = {};
let atlas: HTMLImageElement | undefined;
let weaponCanvas: HTMLCanvasElement | undefined;

type Backend = NonNullable<ReturnType<typeof createGpuBackend>>;
let gpu: { canvas: HTMLCanvasElement; renderer: Backend; atlasReady: boolean; weaponReady: boolean } | null | undefined;

function getAtlas(): HTMLImageElement | undefined {
  if (typeof Image === 'undefined') return undefined;
  if (!atlas) {
    atlas = new Image();
    atlas.decoding = 'async';
    atlas.src = ATLAS_URL;
  }
  return atlas;
}

function makeWeaponCanvas(): HTMLCanvasElement {
  if (weaponCanvas) return weaponCanvas;
  const c = document.createElement('canvas');
  c.width = 14; c.height = 8;
  const g = c.getContext('2d', { alpha: true });
  if (g) {
    g.imageSmoothingEnabled = false;
    g.fillStyle = '#242831'; g.fillRect(1, 1, 12, 5);
    g.fillStyle = '#55616b'; g.fillRect(3, 2, 8, 3);
    g.fillStyle = '#9aa8ad'; g.fillRect(4, 2, 5, 1);
    g.fillStyle = '#c99f48'; g.fillRect(2, 3, 2, 2);
    g.fillStyle = '#1a1d24'; g.fillRect(8, 5, 3, 3);
  }
  weaponCanvas = c;
  return c;
}

function desiredState(input: ChibiPlayerAtlasV4Input): VisualState {
  if (input.dead) return 'down';
  if (input.hurt) return 'hurt';
  if (input.dashing) return 'dash';
  if (input.shooting) return 'shoot';
  if (input.interacting) return 'interact';
  if (input.moving) return 'walk';
  return 'idle';
}

function resolveState(input: ChibiPlayerAtlasV4Input): { state: VisualState; tick: number } {
  const key = input.runtimeKey ?? fallbackRuntime;
  let rt = runtimes.get(key);
  if (!rt || input.frame < rt.lastFrame) {
    rt = { state: 'idle', enteredAt: input.frame, lastFrame: input.frame, lastShoot: false, lastDash: false, lastHurt: false };
    runtimes.set(key, rt);
  }

  const desired = desiredState(input);
  const shotChanged = input.shotSequence !== undefined && input.shotSequence !== rt.lastShot;
  const shootTrigger = desired === 'shoot' && (shotChanged || (input.shooting && !rt.lastShoot));
  const dashTrigger = desired === 'dash' && input.dashing && !rt.lastDash;
  const hurtTrigger = desired === 'hurt' && input.hurt && !rt.lastHurt;

  if (shootTrigger || dashTrigger || hurtTrigger || desired === 'down' && rt.state !== 'down') {
    rt.state = desired;
    rt.enteredAt = input.frame;
  } else if (rt.state === 'shoot' && input.frame - rt.enteredAt < 12) {
    // Complete all six authored shoot frames even if gameplay shootFlash is shorter.
  } else if (rt.state === 'hurt' && input.frame - rt.enteredAt < 8) {
    // Keep the short hit reaction readable.
  } else if (rt.state === 'down') {
    // Death/down state is terminal for this runtime instance.
  } else if (rt.state !== desired) {
    rt.state = desired;
    rt.enteredAt = input.frame;
  }

  rt.lastFrame = input.frame;
  rt.lastShoot = input.shooting;
  rt.lastDash = input.dashing;
  rt.lastHurt = input.hurt;
  rt.lastShot = input.shotSequence;
  return { state: rt.state, tick: Math.max(0, input.frame - rt.enteredAt) };
}

function poseFor(state: VisualState, tick: number, frame: number): Pose {
  if (state === 'walk') {
    return { atlasState: 'walk', index: Math.floor(frame / 2) % 12, scaleX: 1, scaleY: 1, rotation: 0, offsetX: 0, offsetY: 0, flash: 0 };
  }
  if (state === 'shoot') {
    return { atlasState: 'shoot', index: Math.min(5, Math.floor(tick / 2)), scaleX: 1, scaleY: 1, rotation: 0, offsetX: 0, offsetY: 0, flash: 0 };
  }
  if (state === 'interact') {
    return { atlasState: 'interact', index: Math.min(7, Math.floor(tick / 3)), scaleX: 1, scaleY: 1, rotation: 0, offsetX: 0, offsetY: 0, flash: 0 };
  }
  if (state === 'dash') {
    const t = Math.min(1, tick / 8);
    return { atlasState: 'walk', index: tick % 12, scaleX: 1.08 + Math.sin(t * Math.PI) * .08, scaleY: .94, rotation: 0, offsetX: 0, offsetY: -1, flash: 0 };
  }
  if (state === 'hurt') {
    return { atlasState: 'idle', index: Math.floor(tick / 2) % 4, scaleX: 1.03, scaleY: .97, rotation: tick % 2 === 0 ? -.035 : .035, offsetX: tick % 2 === 0 ? -1 : 1, offsetY: -1, flash: .34 };
  }
  if (state === 'down') {
    const t = Math.min(1, tick / 18);
    return { atlasState: 'idle', index: 0, scaleX: 1 + t * .12, scaleY: 1 - t * .12, rotation: t * 1.22, offsetX: 2 * t, offsetY: 3 * t, flash: 0 };
  }
  return { atlasState: 'idle', index: Math.floor(frame / 12) % 4, scaleX: 1, scaleY: 1, rotation: 0, offsetX: 0, offsetY: 0, flash: 0 };
}

function regionFor(dir: DuckDir, pose: Pose) {
  const col = STATE_START[pose.atlasState] + Math.min(STATE_FRAMES[pose.atlasState] - 1, pose.index);
  const row = ROW[dir];
  return {
    col, row,
    region: { textureId: TEXTURE_ID, u0: col / COLS, v0: row / ROWS, u1: (col + 1) / COLS, v1: (row + 1) / ROWS },
  };
}

function dashVector(dir: DuckDir): { x: number; y: number } {
  if (dir === 'left') return { x: -1, y: 0 };
  if (dir === 'right') return { x: 1, y: 0 };
  if (dir === 'up') return { x: 0, y: -1 };
  return { x: 0, y: 1 };
}

function ensureGpu(image: HTMLImageElement) {
  if (gpu === null) return undefined;
  if (!gpu) {
    const canvas = document.createElement('canvas');
    try {
      const renderer = createGpuBackend(canvas, { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, quality: 'high', powerPreference: 'high-performance' });
      if (!renderer) { gpu = null; return undefined; }
      gpu = { canvas, renderer, atlasReady: false, weaponReady: false };
    } catch { gpu = null; return undefined; }
  }
  if (!gpu.atlasReady && image.complete && image.naturalWidth === ATLAS_W && image.naturalHeight === ATLAS_H) {
    gpu.renderer.registerTexture({ id: TEXTURE_ID, source: image, nearest: true, premultiplyAlpha: false });
    gpu.atlasReady = true;
  }
  if (!gpu.weaponReady) {
    gpu.renderer.registerTexture({ id: WEAPON_TEXTURE_ID, source: makeWeaponCanvas(), nearest: true, premultiplyAlpha: false });
    gpu.weaponReady = true;
  }
  return gpu.atlasReady ? gpu : undefined;
}

function weaponPose(dir: DuckDir, feetX: number, feetY: number) {
  if (dir === 'left') return { x: feetX - 11, y: feetY - 13, rotation: Math.PI, order: 1 };
  if (dir === 'right') return { x: feetX + 11, y: feetY - 13, rotation: 0, order: 1 };
  if (dir === 'up') return { x: feetX, y: feetY - 21, rotation: -Math.PI / 2, order: -1 };
  return { x: feetX, y: feetY - 7, rotation: Math.PI / 2, order: 1 };
}

function drawGpu(input: ChibiPlayerAtlasV4Input, image: HTMLImageElement, state: VisualState, pose: Pose, feetX: number, feetY: number, opacity: number): boolean {
  const rt = ensureGpu(image);
  if (!rt) return false;
  const selected = regionFor(input.dir, pose);
  const width = DRAW_W * pose.scaleX;
  const height = DRAW_H * pose.scaleY;
  const x = feetX + pose.offsetX;
  const y = feetY + pose.offsetY;

  rt.renderer.beginFrame({
    camera: { x: 0, y: 0, zoom: 1 }, tick: input.frame,
    style: { ambientDarkness: 0, ambientTint: [1, .99, .96], tintStrength: .01, vignette: 0, lightStrength: .12, exposure: 1.08, gamma: 1.04, saturation: 1.04 },
  });
  rt.renderer.submitShadow('duck-v4-shadow', feetX, feetY + 1, 16, 4, .22 * opacity, feetY - 1);

  if (state === 'dash') {
    const v = dashVector(input.dir);
    for (let i = 3; i >= 1; i--) {
      rt.renderer.submitSprite({
        id: `duck-v4-ghost-${i}`, layer: RenderLayer.ACTORS, sortY: feetY - .2, order: -10 + i,
        x: x - v.x * i * 5, y: y - v.y * i * 5, width, height, pivotX: PIVOT_X * pose.scaleX, pivotY: PIVOT_Y * pose.scaleY,
        rotation: pose.rotation, color: [1, .92, .64, opacity * (.05 + i * .025)], region: selected.region,
      });
    }
  }

  const showSeparateWeapon = state !== 'shoot' && state !== 'interact' && state !== 'down';
  const wp = weaponPose(input.dir, feetX, feetY);
  if (showSeparateWeapon && wp.order < 0) {
    rt.renderer.submitSprite({ id: 'duck-v4-weapon-back', layer: RenderLayer.ACTORS, sortY: feetY, order: wp.order, x: wp.x, y: wp.y, width: 14, height: 8, pivotX: 7, pivotY: 4, rotation: wp.rotation, color: [1, 1, 1, opacity], region: { textureId: WEAPON_TEXTURE_ID, u0: 0, v0: 0, u1: 1, v1: 1 } });
  }

  rt.renderer.submitSprite({
    id: 'duck-v4-real', layer: RenderLayer.ACTORS, sortY: feetY, order: 0,
    x, y, width, height, pivotX: PIVOT_X * pose.scaleX, pivotY: PIVOT_Y * pose.scaleY,
    rotation: pose.rotation, color: [1, 1, 1, opacity * (state === 'dash' ? .92 : 1)], region: selected.region,
    effects: { outline: .08, rim: input.hurt ? .2 : .04, flash: pose.flash },
  });

  if (showSeparateWeapon && wp.order >= 0) {
    rt.renderer.submitSprite({ id: 'duck-v4-weapon-front', layer: RenderLayer.ACTORS, sortY: feetY, order: wp.order, x: wp.x, y: wp.y, width: 14, height: 8, pivotX: 7, pivotY: 4, rotation: wp.rotation, color: [1, 1, 1, opacity], region: { textureId: WEAPON_TEXTURE_ID, u0: 0, v0: 0, u1: 1, v1: 1 } });
  }

  rt.renderer.endFrame();
  rt.renderer.gl.finish();
  input.ctx.save(); input.ctx.imageSmoothingEnabled = false; input.ctx.drawImage(rt.canvas, 0, 0); input.ctx.restore();
  document.documentElement.dataset.duckHeistPlayerRenderer = 'webgl2-chibi-atlas-v4';
  document.documentElement.dataset.duckHeistPlayerFrames = '120-real';
  document.documentElement.dataset.duckHeistPlayerFrame = `${state}:${selected.row}:${selected.col}`;
  return true;
}

function drawCanvasFallback(input: ChibiPlayerAtlasV4Input, image: HTMLImageElement, state: VisualState, pose: Pose, feetX: number, feetY: number, opacity: number): void {
  const selected = regionFor(input.dir, pose);
  const sx = selected.col * FRAME_W;
  const sy = selected.row * FRAME_H;
  const w = DRAW_W * pose.scaleX;
  const h = DRAW_H * pose.scaleY;
  const x = feetX + pose.offsetX;
  const y = feetY + pose.offsetY;

  input.ctx.save();
  input.ctx.imageSmoothingEnabled = false;
  input.ctx.globalAlpha = .22 * opacity;
  input.ctx.fillStyle = '#19171b';
  input.ctx.beginPath(); input.ctx.ellipse(feetX, feetY + 1, 8, 2, 0, 0, Math.PI * 2); input.ctx.fill();
  input.ctx.globalAlpha = opacity;
  input.ctx.translate(x, y);
  input.ctx.rotate(pose.rotation);
  input.ctx.drawImage(image, sx, sy, FRAME_W, FRAME_H, -PIVOT_X * pose.scaleX, -PIVOT_Y * pose.scaleY, w, h);
  input.ctx.restore();
  document.documentElement.dataset.duckHeistPlayerRenderer = 'canvas2d-atlas-v4-fallback';
  document.documentElement.dataset.duckHeistPlayerFrames = '120-real';
  document.documentElement.dataset.duckHeistPlayerFrame = `${state}:${selected.row}:${selected.col}`;
}

function drawLoadingFallback(input: ChibiPlayerAtlasV4Input, feetX: number, feetY: number, opacity: number): void {
  const g = input.ctx;
  g.save(); g.globalAlpha = opacity; g.imageSmoothingEnabled = false;
  g.fillStyle = 'rgba(20,18,22,.20)'; g.beginPath(); g.ellipse(feetX, feetY + 1, 7, 2, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#27232b'; g.beginPath(); g.arc(feetX, feetY - 18, 9, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#f5d64d'; g.beginPath(); g.arc(feetX, feetY - 18, 7.5, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#f29a38'; g.fillRect(feetX - 5, feetY - 14, 10, 3);
  g.fillStyle = '#27232b'; g.fillRect(feetX - 5, feetY - 7, 10, 7);
  g.restore();
}

export function drawChibiPlayerAtlasV4(input: ChibiPlayerAtlasV4Input): void {
  if (typeof document === 'undefined') return;

  // Skins still use V3 until their authored atlas variants are produced. The canonical
  // robber/base duck now always uses the approved real-frame atlas.
  if (input.skinId && input.skinId !== 'robber') {
    drawChibiPlayerV3(input);
    return;
  }

  const image = getAtlas();
  const feetX = Math.round(input.x + 8);
  const feetY = Math.round(input.y + 18);
  const opacity = Math.max(0, Math.min(1, input.alpha ?? 1));
  const resolved = resolveState(input);
  const pose = poseFor(resolved.state, resolved.tick, input.frame);

  if (!image || !image.complete || image.naturalWidth !== ATLAS_W || image.naturalHeight !== ATLAS_H) {
    drawLoadingFallback(input, feetX, feetY, opacity);
    return;
  }
  if (drawGpu(input, image, resolved.state, pose, feetX, feetY, opacity)) return;
  drawCanvasFallback(input, image, resolved.state, pose, feetX, feetY, opacity);
}
