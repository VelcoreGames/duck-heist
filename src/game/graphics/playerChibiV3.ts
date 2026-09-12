import { getSkin, type DuckPalette } from '../data';
import type { DuckDir } from '../types';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../constants';
import { CHIBI_PLAYER_PLAN } from './chibiProduction';
import { RenderLayer, type CharacterState } from './types';
import { createGpuBackend } from './gpu/backend';

type Ctx = CanvasRenderingContext2D;

const FRAME = 80;
const PIVOT_X = 40;
const PIVOT_Y = 69;
const CACHE_LIMIT = 640;
const OUTLINE = '#27232b';
const FEATHER = '#f5d64d';
const FEATHER_LIGHT = '#ffe990';
const FEATHER_SHADE = '#d7aa35';
const BEAK = '#f29a38';
const BEAK_LIGHT = '#ffc766';
const BEAK_DARK = '#c96b24';
const BLASTER = '#343b45';
const BLASTER_MID = '#596672';
const BLASTER_LIGHT = '#9eabb3';
const BRASS = '#d8b55b';

export interface ChibiPlayerV3Input {
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
  skinId?: string;
  alpha?: number;
  runtimeKey?: object;
  shotSequence?: number;
}

interface Palette {
  body: string;
  light: string;
  shade: string;
  beak: string;
  beakLight: string;
  beakDark: string;
}

interface Runtime {
  state: CharacterState;
  enteredAt: number;
  lockUntil: number;
  lastFrame: number;
  lastShooting: boolean;
  lastDashing: boolean;
  lastHurt: boolean;
  lastShotSequence?: number;
}

interface Motion {
  bob: number;
  headBob: number;
  squashX: number;
  squashY: number;
  step: number;
  wing: number;
  recoil: number;
  tilt: number;
  blink: boolean;
  down: number;
}

const runtimes = new WeakMap<object, Runtime>();
const fallbackRuntime = {};
const frameCache = new Map<string, { canvas: HTMLCanvasElement; stamp: number }>();
let stamp = 0;

function paletteFor(skinId?: string): Palette {
  const skin = skinId ? getSkin(skinId) : undefined;
  const p = skin?.palette as DuckPalette | undefined;
  return {
    body: p?.body ?? FEATHER,
    light: FEATHER_LIGHT,
    shade: p?.shade ?? FEATHER_SHADE,
    beak: p?.beak ?? BEAK,
    beakLight: BEAK_LIGHT,
    beakDark: p?.beakDark ?? BEAK_DARK,
  };
}

function desiredState(input: ChibiPlayerV3Input): CharacterState {
  if (input.dead) return 'down';
  if (input.hurt) return 'hurt';
  if (input.dashing) return 'dash';
  if (input.shooting) return 'shoot';
  if (input.moving) return 'walk';
  return 'idle';
}

function priority(state: CharacterState): number {
  return state === 'down' ? 100 : state === 'hurt' ? 90 : state === 'dash' ? 80 : state === 'shoot' ? 70 : state === 'walk' ? 20 : 10;
}

function clipDuration(state: CharacterState): number {
  const spec = CHIBI_PLAYER_PLAN[state];
  if (!spec) return 0;
  if (state === 'down') return Number.POSITIVE_INFINITY;
  return spec.frames * Math.max(1, spec.frameDuration);
}

function resolveState(input: ChibiPlayerV3Input): { state: CharacterState; tick: number } {
  const key = input.runtimeKey ?? fallbackRuntime;
  let rt = runtimes.get(key);
  if (!rt || input.frame < rt.lastFrame) {
    rt = { state: 'idle', enteredAt: input.frame, lockUntil: input.frame, lastFrame: input.frame, lastShooting: false, lastDashing: false, lastHurt: false };
    runtimes.set(key, rt);
  }
  const desired = desiredState(input);
  const shotChanged = input.shotSequence !== undefined && input.shotSequence !== rt.lastShotSequence;
  const retrigger = (desired === 'shoot' && (shotChanged || (input.shooting && !rt.lastShooting))) ||
    (desired === 'dash' && input.dashing && !rt.lastDashing) ||
    (desired === 'hurt' && input.hurt && !rt.lastHurt);
  if (desired !== rt.state && (priority(desired) > priority(rt.state) || input.frame >= rt.lockUntil) || retrigger) {
    rt.state = desired;
    rt.enteredAt = input.frame;
    const d = clipDuration(desired);
    rt.lockUntil = Number.isFinite(d) ? input.frame + d : Number.POSITIVE_INFINITY;
  }
  if ((rt.state === 'idle' || rt.state === 'walk') && desired !== rt.state) {
    rt.state = desired;
    rt.enteredAt = input.frame;
    const d = clipDuration(desired);
    rt.lockUntil = Number.isFinite(d) ? input.frame + d : Number.POSITIVE_INFINITY;
  }
  rt.lastFrame = input.frame;
  rt.lastShooting = input.shooting;
  rt.lastDashing = input.dashing;
  rt.lastHurt = input.hurt;
  rt.lastShotSequence = input.shotSequence;
  return { state: rt.state, tick: Math.max(0, input.frame - rt.enteredAt) };
}

function visualFrame(state: CharacterState, tick: number): number {
  const spec = CHIBI_PLAYER_PLAN[state];
  if (!spec) return 0;
  const raw = Math.floor(tick / Math.max(1, spec.frameDuration));
  return spec.loop ? raw % spec.frames : Math.min(spec.frames - 1, raw);
}

function motionFor(state: CharacterState, index: number): Motion {
  const count = CHIBI_PLAYER_PLAN[state]?.frames ?? 1;
  const t = count <= 1 ? 0 : index / count;
  if (state === 'walk') {
    const step = Math.sin(t * Math.PI * 4);
    return { bob: -Math.abs(step) * 1.5, headBob: -Math.abs(step) * .8, squashX: 1 + Math.abs(step) * .025, squashY: 1 - Math.abs(step) * .03, step, wing: -step * .55, recoil: 0, tilt: Math.sin(t * Math.PI * 2) * .025, blink: false, down: 0 };
  }
  if (state === 'shoot') {
    const kick = index < 3 ? index / 2 : Math.max(0, 1 - (index - 2) / 7);
    return { bob: 0, headBob: 0, squashX: 1 + kick * .025, squashY: 1 - kick * .025, step: 0, wing: 1, recoil: kick * 5, tilt: -kick * .025, blink: false, down: 0 };
  }
  if (state === 'dash') {
    const wave = Math.sin(Math.min(1, t * 1.1) * Math.PI);
    return { bob: -1, headBob: -1, squashX: 1.10 + wave * .10, squashY: .90 - wave * .06, step: 0, wing: -.65, recoil: 0, tilt: 0, blink: true, down: 0 };
  }
  if (state === 'hurt') {
    return { bob: -1, headBob: -1, squashX: 1.07, squashY: .94, step: 0, wing: -.8, recoil: 0, tilt: (index % 2 === 0 ? -1 : 1) * .06, blink: true, down: 0 };
  }
  if (state === 'down') {
    const down = Math.min(1, index / Math.max(1, count - 1));
    return { bob: down * 6, headBob: down * 5, squashX: 1 + down * .14, squashY: 1 - down * .18, step: 0, wing: -.5, recoil: 0, tilt: down * .36, blink: true, down };
  }
  if (state === 'celebrate') {
    const jump = Math.max(0, Math.sin(t * Math.PI * 4));
    return { bob: -jump * 5, headBob: -jump * 5.5, squashX: 1 - jump * .03, squashY: 1 + jump * .04, step: 0, wing: 1, recoil: 0, tilt: Math.sin(t * Math.PI * 4) * .035, blink: false, down: 0 };
  }
  if (state === 'interact') {
    const wave = Math.sin(t * Math.PI * 2);
    return { bob: -Math.max(0, wave), headBob: -Math.max(0, wave), squashX: 1, squashY: 1, step: 0, wing: wave, recoil: 0, tilt: 0, blink: false, down: 0 };
  }
  const breath = Math.sin(t * Math.PI * 2);
  return { bob: -Math.max(0, breath) * .55, headBob: -Math.max(0, breath) * .8, squashX: 1 + breath * .008, squashY: 1 - breath * .008, step: 0, wing: 0, recoil: 0, tilt: 0, blink: index === 8 || index === 9, down: 0 };
}

function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, fill: string, stroke = OUTLINE, lw = 2): void {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(.5, rx), Math.max(.5, ry), 0, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke && lw > 0) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}

function rounded(ctx: Ctx, x: number, y: number, w: number, h: number, radius: number, fill: string, stroke = OUTLINE, lw = 2): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke && lw > 0) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}

function line(ctx: Ctx, x1: number, y1: number, x2: number, y2: number, color: string, width: number): void {
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
}

function drawFeet(ctx: Ctx, pal: Palette, dir: DuckDir, m: Motion): void {
  const stride = m.step * 3.2;
  if (dir === 'left' || dir === 'right') {
    const sign = dir === 'right' ? 1 : -1;
    ellipse(ctx, 35 + stride * sign, 67, 6.2, 2.8, pal.beak, OUTLINE, 1.7);
    ellipse(ctx, 46 - stride * sign, 66, 5.4, 2.5, pal.beak, OUTLINE, 1.7);
    return;
  }
  ellipse(ctx, 31 - stride, 67, 6.4, 2.8, pal.beak, OUTLINE, 1.7);
  ellipse(ctx, 49 + stride, 67, 6.4, 2.8, pal.beak, OUTLINE, 1.7);
}

function drawBody(ctx: Ctx, pal: Palette, dir: DuckDir, m: Motion): void {
  const y = 50 + m.bob;
  ctx.save();
  ctx.translate(40, y);
  ctx.rotate(m.tilt);
  ctx.scale(m.squashX, m.squashY);
  ctx.translate(-40, -y);
  ellipse(ctx, 40, y, 13.5, 12.5, pal.body, OUTLINE, 2.3);
  ellipse(ctx, 36.5, y - 4, 7.5, 5.5, pal.light, '', 0);
  ctx.globalAlpha = .32;
  ellipse(ctx, 42, y + 5.5, 9.5, 4.5, pal.shade, '', 0);
  ctx.globalAlpha = 1;
  const wingLift = m.wing * 4;
  if (dir === 'down' || dir === 'up') {
    ellipse(ctx, 26.5 - Math.max(0, wingLift), y + 1, 5.8, 8.2, pal.body, OUTLINE, 2);
    ellipse(ctx, 53.5 + Math.max(0, wingLift), y + 1, 5.8, 8.2, pal.body, OUTLINE, 2);
  } else {
    const frontX = dir === 'right' ? 52.5 + wingLift : 27.5 - wingLift;
    const backX = dir === 'right' ? 28 : 52;
    ellipse(ctx, backX, y + 1, 5.4, 7.4, pal.shade, OUTLINE, 2);
    ellipse(ctx, frontX, y, 6.8, 5.3, pal.body, OUTLINE, 2);
  }
  ctx.restore();
}

function drawFace(ctx: Ctx, pal: Palette, dir: DuckDir, headY: number, blink: boolean): void {
  if (dir === 'up') return;
  if (dir === 'down') {
    if (blink) {
      line(ctx, 29, headY, 34, headY, OUTLINE, 2.2);
      line(ctx, 46, headY, 51, headY, OUTLINE, 2.2);
    } else {
      ellipse(ctx, 31.5, headY - .8, 3.4, 4.8, '#17141a', '', 0);
      ellipse(ctx, 48.5, headY - .8, 3.4, 4.8, '#17141a', '', 0);
      ellipse(ctx, 30.6, headY - 2.2, 1.15, 1.45, '#fff9e7', '', 0);
      ellipse(ctx, 47.6, headY - 2.2, 1.15, 1.45, '#fff9e7', '', 0);
    }
    ellipse(ctx, 40, headY + 8.2, 9.5, 4.6, pal.beak, OUTLINE, 2);
    ctx.globalAlpha = .65; ellipse(ctx, 37, headY + 6.9, 4.6, 1.45, pal.beakLight, '', 0); ctx.globalAlpha = 1;
    line(ctx, 32, headY + 9.2, 48, headY + 9.2, pal.beakDark, 1.4);
    return;
  }
  const sign = dir === 'right' ? 1 : -1;
  const eyeX = 40 + sign * 9;
  if (blink) line(ctx, eyeX - 2.5, headY, eyeX + 2.5, headY, OUTLINE, 2.2);
  else {
    ellipse(ctx, eyeX, headY - 1, 3.3, 4.7, '#17141a', '', 0);
    ellipse(ctx, eyeX - sign * .8, headY - 2.3, 1.1, 1.4, '#fff9e7', '', 0);
  }
  const bx = 40 + sign * 19;
  ctx.beginPath();
  if (sign > 0) { ctx.moveTo(bx - 5, headY + 4); ctx.quadraticCurveTo(bx + 6, headY + 3, bx + 10, headY + 8); ctx.quadraticCurveTo(bx + 3, headY + 12, bx - 5, headY + 9); }
  else { ctx.moveTo(bx + 5, headY + 4); ctx.quadraticCurveTo(bx - 6, headY + 3, bx - 10, headY + 8); ctx.quadraticCurveTo(bx - 3, headY + 12, bx + 5, headY + 9); }
  ctx.closePath(); ctx.fillStyle = pal.beak; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2; ctx.stroke();
  line(ctx, sign > 0 ? bx - 2 : bx + 2, headY + 8.7, sign > 0 ? bx + 7 : bx - 7, headY + 8.7, pal.beakDark, 1.2);
}

function drawHead(ctx: Ctx, pal: Palette, dir: DuckDir, m: Motion): void {
  const y = 27 + m.headBob + m.down * 4;
  const rx = dir === 'left' || dir === 'right' ? 16.5 : 18.2;
  ctx.save();
  ctx.translate(40, y);
  ctx.rotate(m.tilt * .75);
  ctx.scale(m.squashX, m.squashY);
  ctx.translate(-40, -y);
  ellipse(ctx, 40, y, rx, 16.5, pal.body, OUTLINE, 2.5);
  ctx.globalAlpha = .7; ellipse(ctx, 34, y - 6.7, 8.5, 5.2, pal.light, '', 0); ctx.globalAlpha = 1;
  ctx.globalAlpha = .34; ellipse(ctx, 44, y + 8.4, 11, 4.2, pal.shade, '', 0); ctx.globalAlpha = 1;
  drawFace(ctx, pal, dir, y, m.blink);
  ctx.restore();
}

function drawWeapon(ctx: Ctx, dir: DuckDir, m: Motion, state: CharacterState, index: number): void {
  const recoil = m.recoil;
  const muzzle = state === 'shoot' && index >= 2 && index <= 3;
  const y = 49 + m.bob;
  if (dir === 'right') {
    rounded(ctx, 51 - recoil, y - 5, 19, 8, 3, BLASTER, OUTLINE, 2);
    rounded(ctx, 55 - recoil, y - 3.5, 12, 4, 2, BLASTER_MID, '', 0);
    ctx.fillStyle = BLASTER_LIGHT; ctx.fillRect(58 - recoil, y - 3, 7, 1.5);
    rounded(ctx, 52 - recoil, y + 1, 5, 8, 2, OUTLINE, OUTLINE, 1);
    ctx.fillStyle = BRASS; ctx.fillRect(64 - recoil, y - 2, 3, 3);
    if (muzzle) { ellipse(ctx, 75, y - 1, 6.2, 4.2, '#ffd86f', '', 0); ellipse(ctx, 74, y - 1, 3.2, 2.1, '#fff4b0', '', 0); }
  } else if (dir === 'left') {
    rounded(ctx, 10 + recoil, y - 5, 19, 8, 3, BLASTER, OUTLINE, 2);
    rounded(ctx, 13 + recoil, y - 3.5, 12, 4, 2, BLASTER_MID, '', 0);
    ctx.fillStyle = BLASTER_LIGHT; ctx.fillRect(15 + recoil, y - 3, 7, 1.5);
    rounded(ctx, 23 + recoil, y + 1, 5, 8, 2, OUTLINE, OUTLINE, 1);
    ctx.fillStyle = BRASS; ctx.fillRect(13 + recoil, y - 2, 3, 3);
    if (muzzle) { ellipse(ctx, 5, y - 1, 6.2, 4.2, '#ffd86f', '', 0); ellipse(ctx, 6, y - 1, 3.2, 2.1, '#fff4b0', '', 0); }
  } else if (dir === 'up') {
    rounded(ctx, 36, 10 + recoil, 8, 23, 3, BLASTER, OUTLINE, 2);
    rounded(ctx, 38, 12 + recoil, 4, 17, 2, BLASTER_MID, '', 0);
    if (muzzle) ellipse(ctx, 40, 5, 5, 6, '#ffd86f', '', 0);
  } else {
    rounded(ctx, 36, 47 - recoil, 8, 25, 3, BLASTER, OUTLINE, 2);
    rounded(ctx, 38, 49 - recoil, 4, 18, 2, BLASTER_MID, '', 0);
    if (muzzle) ellipse(ctx, 40, 76, 5, 5, '#ffd86f', '', 0);
  }
}

function drawDashTrail(ctx: Ctx, dir: DuckDir, index: number, pal: Palette): void {
  const a = Math.max(.08, .32 - index * .012);
  ctx.globalAlpha = a;
  ctx.fillStyle = pal.light;
  if (dir === 'left' || dir === 'right') {
    const sign = dir === 'right' ? -1 : 1;
    for (let i = 0; i < 4; i++) rounded(ctx, 40 + sign * (20 + i * 10), 32 + i * 6, 16 + i * 4, 3, 1.5, i % 2 ? pal.light : pal.beak, '', 0);
  } else {
    const sign = dir === 'down' ? -1 : 1;
    for (let i = 0; i < 4; i++) rounded(ctx, 23 + i * 6, 40 + sign * (20 + i * 9), 24, 3, 1.5, i % 2 ? pal.light : pal.beak, '', 0);
  }
  ctx.globalAlpha = 1;
}

function renderFrame(state: CharacterState, dir: DuckDir, index: number, skinId?: string): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = FRAME; c.height = FRAME;
  const ctx = c.getContext('2d', { alpha: true }); if (!ctx) return c;
  ctx.imageSmoothingEnabled = false; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const pal = paletteFor(skinId); const m = motionFor(state, index);
  if (state === 'dash') drawDashTrail(ctx, dir, index, pal);
  ctx.save();
  if (m.down > 0) { ctx.translate(40, 55); ctx.rotate(m.tilt); ctx.translate(-40, -55); }
  drawFeet(ctx, pal, dir, m);
  if (dir === 'up') drawWeapon(ctx, dir, m, state, index);
  drawBody(ctx, pal, dir, m);
  drawHead(ctx, pal, dir, m);
  if (dir !== 'up') drawWeapon(ctx, dir, m, state, index);
  ctx.restore();
  if (state === 'hurt') { ctx.globalCompositeOperation = 'source-atop'; ctx.globalAlpha = index % 2 === 0 ? .28 : .1; ctx.fillStyle = '#fff4d9'; ctx.fillRect(0, 0, FRAME, FRAME); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
  return c;
}

function keyFor(state: CharacterState, dir: DuckDir, index: number, skinId?: string): string { return `${skinId ?? 'base'}|${state}|${dir}|${index}`; }
function cachedFrame(state: CharacterState, dir: DuckDir, index: number, skinId?: string): HTMLCanvasElement {
  const key = keyFor(state, dir, index, skinId); const hit = frameCache.get(key);
  if (hit) { hit.stamp = ++stamp; return hit.canvas; }
  const canvas = renderFrame(state, dir, index, skinId); frameCache.set(key, { canvas, stamp: ++stamp });
  if (frameCache.size > CACHE_LIMIT) { let oldestKey = ''; let oldest = Infinity; for (const [k, v] of frameCache) if (v.stamp < oldest) { oldest = v.stamp; oldestKey = k; } if (oldestKey) frameCache.delete(oldestKey); }
  return canvas;
}

type Backend = NonNullable<ReturnType<typeof createGpuBackend>>;
let gpu: { canvas: HTMLCanvasElement; renderer: Backend; textures: Set<string> } | null | undefined;
function ensureGpu() {
  if (gpu === null) return undefined;
  if (gpu) return gpu;
  const canvas = document.createElement('canvas');
  try {
    const renderer = createGpuBackend(canvas, { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, quality: 'high', powerPreference: 'high-performance' });
    if (!renderer) { gpu = null; document.documentElement.dataset.duckHeistPlayerRenderer = 'canvas2d-fallback'; return undefined; }
    gpu = { canvas, renderer, textures: new Set<string>() };
    document.documentElement.dataset.duckHeistPlayerRenderer = 'webgl2-chibi-v3';
    return gpu;
  } catch { gpu = null; document.documentElement.dataset.duckHeistPlayerRenderer = 'canvas2d-fallback'; return undefined; }
}

function drawGpu(input: ChibiPlayerV3Input, state: CharacterState, index: number, sprite: HTMLCanvasElement, feetX: number, feetY: number, opacity: number): boolean {
  const rt = ensureGpu(); if (!rt) return false;
  const textureId = `duck-v3:${keyFor(state, input.dir, index, input.skinId)}`;
  if (!rt.textures.has(textureId)) { rt.renderer.registerTexture({ id: textureId, source: sprite, nearest: true, premultiplyAlpha: false }); rt.textures.add(textureId); }
  rt.renderer.beginFrame({ camera: { x: 0, y: 0, zoom: 1 }, tick: input.frame, style: { ambientDarkness: 0, ambientTint: [1, .985, .94], tintStrength: .015, vignette: 0, lightStrength: .26, exposure: 1.22, gamma: 1.08, saturation: 1.08 } });
  rt.renderer.submitShadow('duck-v3-shadow', feetX, feetY + 1, 31, 8, .24 * opacity, feetY - 1);
  rt.renderer.submitSprite({ id: 'duck-v3', layer: RenderLayer.ACTORS, sortY: feetY, x: feetX, y: feetY, width: FRAME, height: FRAME, pivotX: PIVOT_X, pivotY: PIVOT_Y, color: [1, 1, 1, opacity * (input.dashing ? .9 : 1)], region: { textureId, u0: 0, v0: 0, u1: 1, v1: 1 }, effects: { outline: .08, rim: input.hurt ? .32 : .11, flash: input.hurt ? .12 : 0 } });
  rt.renderer.submitLight({ x: feetX, y: feetY - 25, radius: 42, color: [1, .82, .49], intensity: .045, innerRadius: .16, falloff: 1.9 });
  rt.renderer.endFrame();
  rt.renderer.gl.finish();
  input.ctx.save(); input.ctx.imageSmoothingEnabled = false; input.ctx.drawImage(rt.canvas, 0, 0); input.ctx.restore();
  return true;
}

export function drawChibiPlayerV3(input: ChibiPlayerV3Input): void {
  if (typeof document === 'undefined') return;
  const resolved = resolveState(input); const index = visualFrame(resolved.state, resolved.tick);
  const sprite = cachedFrame(resolved.state, input.dir, index, input.skinId);
  const feetX = Math.round(input.x + 8); const feetY = Math.round(input.y + 18); const opacity = Math.max(0, Math.min(1, input.alpha ?? 1));
  if (drawGpu(input, resolved.state, index, sprite, feetX, feetY, opacity)) return;
  input.ctx.save(); input.ctx.imageSmoothingEnabled = false; input.ctx.globalAlpha = .22 * opacity; input.ctx.fillStyle = '#1d1820'; input.ctx.beginPath(); input.ctx.ellipse(feetX, feetY + 1, 15, 4, 0, 0, Math.PI * 2); input.ctx.fill(); input.ctx.globalAlpha = opacity; input.ctx.drawImage(sprite, feetX - PIVOT_X, feetY - PIVOT_Y); input.ctx.restore();
}

export function clearChibiPlayerV3Cache(): void { for (const v of frameCache.values()) { v.canvas.width = 1; v.canvas.height = 1; } frameCache.clear(); }
export const CHIBI_PLAYER_V3_FRAME_SIZE = FRAME;
