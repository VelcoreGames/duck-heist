import { TILE_SIZE, ROOM_WIDTH, CANVAS_WIDTH, CANVAS_HEIGHT, TILE_DOOR } from './constants';
import type { FloorTheme } from './constants';

const T = TILE_SIZE;

function hash(x: number, y: number, s = 0) {
  return Math.abs((x * 73 + y * 37 + s * 19) * 2654435761) >>> 0;
}

function r(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color; ctx.fillRect(Math.floor(x), Math.floor(y), w, h);
}

export function drawRichTile(
  ctx: CanvasRenderingContext2D, x: number, y: number, wall: boolean,
  theme: FloorTheme, gx: number, gy: number, frame: number,
) {
  const px = x * T, py = y * T;
  const h = hash(x + gx * 15, y + gy * 11, theme.deco.charCodeAt(0));
  const cleanStartRoom = gx === 0 && gy === 0;
  if (wall) {
    r(ctx, px, py, T, T, '#070910');
    r(ctx, px + 1, py + 1, T - 2, T - 2, theme.wall[(x + y) % 2]);
    r(ctx, px + 1, py + 1, T - 2, 3, 'rgba(255,255,255,.07)');
    r(ctx, px + 2, py + T - 6, T - 4, 5, 'rgba(0,0,0,.45)');
    r(ctx, px, py + 10, T, 1, 'rgba(0,0,0,.22)');
    r(ctx, px, py + 21, T, 1, 'rgba(0,0,0,.18)');
    if (h % 5 === 0) r(ctx, px + 6, py + 8, 4, 3, 'rgba(255,255,255,.05)');
    if (!cleanStartRoom) drawWallProp(ctx, px, py, theme.deco, h, frame, y === 0, x === 0 || x === ROOM_WIDTH - 1);
    return;
  }
  const checker = (x + y) % 2 === 0;
  r(ctx, px, py, T, T, checker ? theme.floor[0] : theme.floor[1]);
  r(ctx, px, py, T, 1, theme.floor[2]);
  r(ctx, px, py, 1, T, theme.floor[2]);
  r(ctx, px + T - 1, py + 1, 1, T - 1, 'rgba(255,255,255,.03)');
  // grout / marble veins / stains by theme
  if (theme.deco === 'lobby') {
    if (h % 7 === 0) { r(ctx, px + 4, py + 6, 18, 1, 'rgba(200,210,230,.08)'); r(ctx, px + 10, py + 18, 12, 1, 'rgba(200,210,230,.06)'); }
    if (h % 11 === 0) r(ctx, px + 8, py + 10, 6, 2, 'rgba(255,255,255,.05)');
  } else if (theme.deco === 'security') {
    if (h % 6 === 0) r(ctx, px + 2, py + 2, T - 4, 2, 'rgba(79,157,216,.12)');
    if (h % 9 === 0) r(ctx, px + 12, py + 14, 8, 8, 'rgba(20,40,70,.25)');
  } else if (theme.deco === 'storage') {
    if (h % 5 === 0) r(ctx, px + 10, py + 16, 5, 4, 'rgba(0,0,0,.22)');
    if (h % 8 === 0) r(ctx, px + 6, py + 8, 9, 3, 'rgba(212,165,116,.12)');
  } else if (theme.deco === 'bakery') {
    if (h % 4 === 0) r(ctx, px + 7, py + 9, 5, 3, 'rgba(232,201,155,.14)');
    if (h % 10 === 0) r(ctx, px + 14, py + 18, 8, 2, 'rgba(255,100,40,.1)');
  } else if (theme.deco === 'vault') {
    if ((x + y) % 3 === 0) r(ctx, px + 4, py + 4, T - 8, T - 8, 'rgba(244,208,63,.05)');
    if (h % 6 === 0) r(ctx, px + 2, py + 14, T - 4, 2, 'rgba(180,190,200,.08)');
  } else if (theme.deco === 'golden') {
    if (h % 3 === 0) r(ctx, px + 6, py + 8, T - 12, T - 16, 'rgba(255,224,102,.1)');
    r(ctx, px + 3, py + 3, 2, 2, 'rgba(255,255,210,.12)');
  }
  if (h % 13 === 0) r(ctx, px + 5, py + 20, 14, 1, 'rgba(255,255,255,.04)');
}

function drawWallProp(ctx: CanvasRenderingContext2D, px: number, py: number, deco: string, h: number, f: number, north: boolean, side: boolean) {
  if (!north && !side && h % 4 !== 0) return;
  const seed = h % 12;
  if (deco === 'lobby') {
    if (seed === 0) { // ATM
      r(ctx, px + 5, py + 6, 22, 22, '#2a3140'); r(ctx, px + 7, py + 8, 18, 9, '#0c1220');
      r(ctx, px + 8, py + 9, 16, 6, (f + px) % 80 < 50 ? '#3ad36a' : '#1a5a32');
      r(ctx, px + 8, py + 19, 16, 5, '#8d98a6'); r(ctx, px + 10, py + 20, 4, 3, '#f4d03f');
    } else if (seed === 1) { // bank sign
      r(ctx, px + 3, py + 8, 26, 13, '#7a5a10'); r(ctx, px + 4, py + 9, 24, 11, '#f4d03f');
      r(ctx, px + 7, py + 12, 18, 4, '#5a4208');
    } else if (seed === 2) { // velvet rope hook
      r(ctx, px + 14, py + 18, 4, 10, '#c9a227'); r(ctx, px + 8, py + 20, 16, 3, '#7a1f2b');
    } else if (seed === 3) { // wanted poster
      r(ctx, px + 8, py + 8, 16, 18, '#e8d5a3'); r(ctx, px + 10, py + 10, 12, 8, '#f9e547');
      r(ctx, px + 10, py + 20, 12, 3, '#8a2c2c');
    } else if (north && seed === 4) { // camera
      r(ctx, px + 12, py + 4, 8, 5, '#4a5564'); r(ctx, px + 18, py + 5, 6, 4, '#1b2430');
      r(ctx, px + 22, py + 6, 2, 2, f % 50 < 25 ? '#ef7768' : '#6a3038');
    }
  } else if (deco === 'security') {
    if (seed % 3 === 0) {
      r(ctx, px + 5, py + 7, 22, 16, '#0b1018'); r(ctx, px + 7, py + 9, 18, 12, '#12314f');
      r(ctx, px + 8, py + 10 + ((f >> 3) % 8), 16, 1, '#4f9dd8');
      r(ctx, px + 24, py + 8, 2, 2, f % 70 < 35 ? '#ff5b4f' : '#3a1a18');
    } else if (seed % 3 === 1) {
      r(ctx, px + 8, py + 8, 16, 18, '#1a2436'); r(ctx, px + 10, py + 10, 12, 3, '#4f7ad4');
      r(ctx, px + 10, py + 15, 12, 8, '#0e1624');
    }
  } else if (deco === 'storage') {
    if (seed % 3 === 0) { r(ctx, px + 6, py + 10, 20, 16, '#8B5A2B'); r(ctx, px + 8, py + 6, 8, 6, '#e8c99b'); r(ctx, px + 16, py + 7, 7, 5, '#d4a574'); }
    else { r(ctx, px + 8, py + 12, 16, 12, '#d9cba6'); r(ctx, px + 8, py + 12, 16, 3, '#b8a882'); }
  } else if (deco === 'bakery') {
    if (seed % 4 === 0) {
      r(ctx, px + 5, py + 8, 22, 18, '#3a2418');
      const glow = .45 + Math.sin(f * .1 + px) * .25;
      ctx.fillStyle = `rgba(255,120,40,${glow})`; ctx.fillRect(px + 8, py + 11, 16, 10);
      r(ctx, px + 10, py + 14, 12, 3, '#ffd08a');
    } else if (seed % 4 === 1) {
      r(ctx, px + 10, py + 4, 4, 20, '#6c5344'); r(ctx, px + 8, py + 6, 8, 3, '#8a94a0');
      ctx.globalAlpha = .25 + Math.sin(f * .08 + px) * .1; r(ctx, px + 12, py + 8, 6, 10, '#dfe6ee'); ctx.globalAlpha = 1;
    }
  } else if (deco === 'vault') {
    if (seed % 5 === 0) {
      r(ctx, px + 8, py + 5, 16, 5, '#4c5666');
      if (Math.sin(f * .05 + px) > 0) { ctx.fillStyle = 'rgba(255,59,48,.5)'; ctx.fillRect(px + 14, py + 10, 2, T - 10); }
    } else if (seed % 5 === 2) {
      r(ctx, px + 7, py + 9, 18, 14, '#f4d03f'); r(ctx, px + 9, py + 11, 14, 10, '#8a6a10');
    }
  } else if (deco === 'golden') {
    r(ctx, px + 6, py + 7, 20, 16, '#ffe066'); r(ctx, px + 9, py + 10, 14, 10, '#8a6a10');
    r(ctx, px + 12, py + 12, 3, 3, '#fff3b0');
  }
}

export function drawRoomAtmosphere(ctx: CanvasRenderingContext2D, deco: string, frame: number, special = false) {
  const lights = deco === 'lobby' ? [[120, 48], [360, 48]] : deco === 'security' ? [[80, 40], [240, 36], [400, 40]]
    : deco === 'bakery' ? [[90, 52], [390, 52]] : deco === 'vault' ? [[240, 40]] : deco === 'golden' ? [[160, 44], [320, 44]] : [[140, 50], [340, 50]];
  for (const [lx, ly] of lights) {
    const g = ctx.createRadialGradient(lx, ly, 4, lx, ly + 40, 90);
    const col = deco === 'bakery' ? '255,140,60' : deco === 'golden' || deco === 'vault' ? '244,208,63' : deco === 'security' ? '79,157,216' : '200,220,240';
    g.addColorStop(0, `rgba(${col},${.16 + Math.sin(frame * .04 + lx) * .04})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(lx - 90, ly - 10, 180, 160);
  }
  if (deco === 'bakery' || deco === 'storage') {
    for (let i = 0; i < 10; i++) {
      const t = (frame * 0.4 + i * 37) % 220;
      ctx.globalAlpha = .12;
      r(ctx, 40 + (i * 41 % 400), 300 - t * .6, 2, 2, deco === 'bakery' ? '#e8c99b' : '#cbb89a');
    }
    ctx.globalAlpha = 1;
  }
  if (special) {
    const g = ctx.createRadialGradient(240, 176, 20, 240, 176, 180);
    g.addColorStop(0, 'rgba(180,80,220,.12)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }
}

export function drawInnerWallShadow(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = 'rgba(0,0,0,.22)';
  ctx.fillRect(T, T, CANVAS_WIDTH - T * 2, 6);
  ctx.fillRect(T, T, 6, CANVAS_HEIGHT - T * 2);
  ctx.fillStyle = 'rgba(255,255,255,.03)';
  ctx.fillRect(T, CANVAS_HEIGHT - T - 4, CANVAS_WIDTH - T * 2, 3);
}

export { TILE_DOOR };
