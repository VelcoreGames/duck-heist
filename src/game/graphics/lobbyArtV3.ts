import { CANVAS_HEIGHT, CANVAS_WIDTH, ROOM_WIDTH, TILE_SIZE } from '../constants';

type Ctx = CanvasRenderingContext2D;
const T = TILE_SIZE;

const CREAM = '#eadfca';
const CREAM_LIGHT = '#fff6e7';
const MARBLE_A = '#d9ccb6';
const MARBLE_B = '#d3c4ab';
const MARBLE_EDGE = '#b8a98f';
const WOOD = '#5b3b31';
const WOOD_LIGHT = '#79554a';
const WOOD_DARK = '#30221f';
const TEAL = '#294546';
const TEAL_LIGHT = '#3b5f5d';
const BRASS = '#c7a052';
const OUTLINE = '#26252a';

function r(ctx: Ctx, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}
function line(ctx: Ctx, x1: number, y1: number, x2: number, y2: number, color: string, width = 1) {
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
}
function hash(x: number, y: number, seed = 0) { return Math.abs((x * 97 + y * 53 + seed * 29) * 2654435761) >>> 0; }

/**
 * Floor-1 architecture for the definitive chibi direction.
 * Two gameplay tiles visually form one larger marble slab so the room no longer reads as
 * a giant spreadsheet of 32px boxes. Collision remains 100% tile based.
 */
function drawFloor(ctx: Ctx, x: number, y: number, gx: number, gy: number) {
  const px = x * T, py = y * T;
  const slabX = Math.floor(x / 2), slabY = Math.floor(y / 2);
  const h = hash(slabX + gx * 11, slabY + gy * 17, 7);
  const base = (slabX + slabY) % 2 === 0 ? MARBLE_A : MARBLE_B;
  r(ctx, px, py, T, T, base);

  // Large 64px slab edges only. Internal gameplay-tile seams disappear.
  if (x % 2 === 0) {
    r(ctx, px, py, 2, T, MARBLE_EDGE);
    r(ctx, px + 2, py, 1, T, 'rgba(255,255,255,.22)');
  }
  if (y % 2 === 0) {
    r(ctx, px, py, T, 2, MARBLE_EDGE);
    r(ctx, px, py + 2, T, 1, 'rgba(255,255,255,.18)');
  }
  if (x % 2 === 1) r(ctx, px + T - 1, py, 1, T, 'rgba(86,68,52,.08)');
  if (y % 2 === 1) r(ctx, px, py + T - 1, T, 1, 'rgba(86,68,52,.08)');

  // Marble veining crosses tile boundaries visually, deterministic per slab.
  const ox = slabX * 64, oy = slabY * 64;
  if (h % 3 === 0) {
    line(ctx, ox + 9, oy + 18, ox + 31, oy + 25, 'rgba(126,103,83,.13)', 1);
    line(ctx, ox + 31, oy + 25, ox + 53, oy + 20, 'rgba(126,103,83,.10)', 1);
    line(ctx, ox + 43, oy + 44, ox + 58, oy + 48, 'rgba(255,255,255,.13)', 1);
  }
  if (h % 5 === 0) {
    line(ctx, ox + 12, oy + 51, ox + 28, oy + 42, 'rgba(137,111,88,.11)', 1);
    line(ctx, ox + 28, oy + 42, ox + 45, oy + 45, 'rgba(137,111,88,.08)', 1);
  }

  // Broad, soft polish streaks instead of a grid on every tile.
  if ((slabX + slabY) % 3 === 0) r(ctx, px + 5, py + 7, 15, 1, 'rgba(255,251,238,.10)');
}

function drawWall(ctx: Ctx, x: number, y: number, gx: number, gy: number, frame: number) {
  const px = x * T, py = y * T;
  const h = hash(x + gx * 13, y + gy * 19, 13);
  const top = y === 0;
  const side = x === 0 || x === ROOM_WIDTH - 1;

  // Deep silhouette gives the wall height and separates it from the play floor.
  r(ctx, px, py, T, T, OUTLINE);
  r(ctx, px + 2, py + 2, T - 4, T - 4, CREAM);

  if (top) {
    // Classical bank cornice and inset cream stone.
    r(ctx, px + 2, py + 2, T - 4, 5, CREAM_LIGHT);
    r(ctx, px + 2, py + 7, T - 4, 2, BRASS);
    r(ctx, px + 3, py + 10, T - 6, 9, '#e3d5bd');
    r(ctx, px + 5, py + 12, T - 10, 5, '#f0e4d0');
    r(ctx, px + 3, py + 20, T - 6, 8, WOOD);
    r(ctx, px + 4, py + 21, T - 8, 6, WOOD_LIGHT);
    r(ctx, px + 2, py + 28, T - 4, 2, WOOD_DARK);
  } else if (side) {
    // Vertical wood/teal panels read like thick architecture rather than repeated cubes.
    r(ctx, px + 2, py + 2, T - 4, T - 4, WOOD_DARK);
    r(ctx, px + 5, py + 3, T - 10, T - 6, WOOD);
    r(ctx, px + 7, py + 6, T - 14, T - 12, TEAL);
    r(ctx, px + 8, py + 7, T - 16, T - 14, TEAL_LIGHT);
    r(ctx, px + 5, py + 3, 2, T - 6, BRASS);
    r(ctx, px + T - 7, py + 3, 2, T - 6, BRASS);
  } else {
    r(ctx, px + 3, py + 3, T - 6, T - 6, '#e2d4bc');
  }

  // Sparse decoration, never in START. Architectural details only.
  const start = gx === 0 && gy === 0;
  if (!start && top && h % 9 === 0) {
    r(ctx, px + 13, py + 16, 6, 8, '#826733');
    const pulse = .66 + Math.sin(frame * .04 + h) * .05;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#ffe7a6'; ctx.beginPath(); ctx.ellipse(px + 16, py + 14, 4, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
}

export function drawChibiLobbyTileV3(
  ctx: Ctx,
  x: number,
  y: number,
  wall: boolean,
  gx: number,
  gy: number,
  frame: number,
) {
  if (wall) drawWall(ctx, x, y, gx, gy, frame);
  else drawFloor(ctx, x, y, gx, gy);
}

export function drawChibiLobbyAtmosphereV3(ctx: Ctx, frame: number) {
  // Warm pools of light are broad and low contrast; the character remains the focal point.
  const lights: readonly [number, number, number][] = [[120, 48, 108], [240, 38, 136], [360, 48, 108]];
  for (const [x, y, radius] of lights) {
    const g = ctx.createRadialGradient(x, y, 8, x, y + 72, radius);
    g.addColorStop(0, `rgba(255,232,181,${.16 + Math.sin(frame * .018 + x) * .008})`);
    g.addColorStop(.52, 'rgba(247,218,162,.055)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(x - radius, y - 20, radius * 2, radius * 1.8);
  }

  // Gentle floor reflection and edge falloff.
  const floorGlow = ctx.createLinearGradient(0, 82, 0, CANVAS_HEIGHT - 32);
  floorGlow.addColorStop(0, 'rgba(255,249,232,.028)');
  floorGlow.addColorStop(.55, 'rgba(255,249,232,.012)');
  floorGlow.addColorStop(1, 'rgba(67,44,33,.045)');
  ctx.fillStyle = floorGlow; ctx.fillRect(32, 32, CANVAS_WIDTH - 64, CANVAS_HEIGHT - 64);
}
