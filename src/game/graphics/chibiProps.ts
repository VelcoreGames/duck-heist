type Ctx = CanvasRenderingContext2D;

const T = 32;
const OUTLINE = '#17191e';
const SHADOW = 'rgba(13,15,16,.30)';
const WOOD = '#5b3c31';
const WOOD_LIGHT = '#7a5544';
const WOOD_DARK = '#38251f';
const TEAL = '#294647';
const TEAL_LIGHT = '#3c5f5d';
const CREAM = '#d9c9a8';
const CREAM_LIGHT = '#f1e3c0';
const MARBLE = '#cbbd9c';
const MARBLE_LIGHT = '#eee2c7';
const MARBLE_DARK = '#9e8c6e';
const GOLD = '#c7a558';
const GOLD_LIGHT = '#efd98f';
const GOLD_DARK = '#8c6c30';
const METAL = '#6c7779';
const METAL_LIGHT = '#a2afb0';
const METAL_DARK = '#3f4a4c';
const RED = '#7e2932';
const RED_LIGHT = '#a23d48';

function r(ctx: Ctx, x: number, y: number, w: number, h: number, color: string): void {
  if (w <= 0 || h <= 0) return;
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function ell(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(Math.round(cx), Math.round(cy), rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function shadow(ctx: Ctx, x: number, y: number, w = 26): void {
  ell(ctx, x + 16, y + 27, w / 2, 4, SHADOW);
}

function drawCounter(ctx: Ctx, x: number, y: number): void {
  shadow(ctx, x, y, 30);
  r(ctx, x + 1, y + 8, 30, 19, OUTLINE);
  r(ctx, x + 2, y + 9, 28, 17, WOOD_DARK);
  r(ctx, x + 3, y + 11, 26, 13, WOOD);
  r(ctx, x + 4, y + 12, 24, 2, WOOD_LIGHT);
  // sobre de mármol crema
  r(ctx, x, y + 5, 32, 7, OUTLINE);
  r(ctx, x + 1, y + 5, 30, 5, MARBLE);
  r(ctx, x + 2, y + 6, 28, 1, MARBLE_LIGHT);
  r(ctx, x + 4, y + 8, 10, 1, 'rgba(98,78,56,.18)');
  // panel frontal con marco de latón
  r(ctx, x + 7, y + 16, 18, 8, GOLD_DARK);
  r(ctx, x + 8, y + 17, 16, 6, TEAL);
  r(ctx, x + 9, y + 18, 14, 1, TEAL_LIGHT);
  r(ctx, x + 15, y + 18, 2, 4, GOLD);
}

function drawBarrier(ctx: Ctx, x: number, y: number): void {
  shadow(ctx, x, y, 28);
  // bases de latón
  ell(ctx, x + 7, y + 26, 5, 3, OUTLINE);
  ell(ctx, x + 7, y + 25, 4, 2, GOLD_DARK);
  ell(ctx, x + 25, y + 26, 5, 3, OUTLINE);
  ell(ctx, x + 25, y + 25, 4, 2, GOLD_DARK);
  r(ctx, x + 5, y + 8, 5, 18, OUTLINE);
  r(ctx, x + 6, y + 9, 3, 16, GOLD);
  r(ctx, x + 23, y + 8, 5, 18, OUTLINE);
  r(ctx, x + 24, y + 9, 3, 16, GOLD);
  r(ctx, x + 5, y + 8, 5, 4, GOLD_LIGHT);
  r(ctx, x + 23, y + 8, 5, 4, GOLD_LIGHT);
  // cuerda de terciopelo con caída pixelada
  r(ctx, x + 9, y + 11, 14, 4, OUTLINE);
  r(ctx, x + 10, y + 11, 12, 3, RED);
  r(ctx, x + 12, y + 14, 8, 2, RED_LIGHT);
  r(ctx, x + 14, y + 16, 4, 2, RED);
}

function drawShelf(ctx: Ctx, x: number, y: number): void {
  shadow(ctx, x, y, 29);
  r(ctx, x + 2, y + 4, 28, 24, OUTLINE);
  r(ctx, x + 3, y + 5, 26, 22, TEAL);
  r(ctx, x + 5, y + 7, 22, 7, '#1e3133');
  r(ctx, x + 5, y + 16, 22, 7, '#1e3133');
  r(ctx, x + 4, y + 13, 24, 3, METAL_DARK);
  r(ctx, x + 4, y + 23, 24, 3, METAL_DARK);
  r(ctx, x + 4, y + 5, 2, 21, METAL_LIGHT);
  // archivadores y cajas con variación de color
  r(ctx, x + 7, y + 9, 6, 4, CREAM);
  r(ctx, x + 14, y + 8, 5, 5, WOOD_LIGHT);
  r(ctx, x + 20, y + 9, 5, 4, GOLD_DARK);
  r(ctx, x + 8, y + 18, 8, 4, WOOD);
  r(ctx, x + 18, y + 17, 7, 5, CREAM);
}

function drawMoneyBag(ctx: Ctx, x: number, y: number, frame: number): void {
  shadow(ctx, x, y, 25);
  const bob = Math.round(Math.sin(frame * .035) * .5);
  ell(ctx, x + 16, y + 19 + bob, 12, 10, OUTLINE);
  ell(ctx, x + 16, y + 18 + bob, 10, 8, '#a48766');
  r(ctx, x + 10, y + 7 + bob, 12, 7, OUTLINE);
  r(ctx, x + 11, y + 8 + bob, 10, 5, '#c2a37c');
  r(ctx, x + 9, y + 11 + bob, 14, 3, WOOD_DARK);
  r(ctx, x + 13, y + 16 + bob, 6, 7, GOLD_DARK);
  r(ctx, x + 14, y + 17 + bob, 4, 5, GOLD);
  r(ctx, x + 15, y + 18 + bob, 2, 1, GOLD_LIGHT);
}

function drawBreadCrate(ctx: Ctx, x: number, y: number): void {
  shadow(ctx, x, y, 29);
  // panes asomándose
  ell(ctx, x + 10, y + 8, 6, 5, '#d8ae68');
  ell(ctx, x + 20, y + 7, 6, 4, '#e4c37f');
  r(ctx, x + 7, y + 7, 6, 2, CREAM_LIGHT);
  r(ctx, x + 18, y + 6, 5, 2, CREAM_LIGHT);
  // caja gruesa chibi
  r(ctx, x + 2, y + 9, 28, 18, OUTLINE);
  r(ctx, x + 3, y + 10, 26, 16, '#8a5a33');
  r(ctx, x + 4, y + 12, 24, 4, '#a66d3b');
  r(ctx, x + 4, y + 20, 24, 4, '#714528');
  r(ctx, x + 6, y + 10, 3, 16, '#56341f');
  r(ctx, x + 23, y + 10, 3, 16, '#56341f');
  r(ctx, x + 13, y + 16, 6, 5, CREAM);
  r(ctx, x + 15, y + 17, 2, 3, GOLD_DARK);
}

function drawColumn(ctx: Ctx, x: number, y: number): void {
  shadow(ctx, x, y, 27);
  r(ctx, x + 6, y + 1, 20, 29, OUTLINE);
  r(ctx, x + 8, y + 3, 16, 25, MARBLE);
  r(ctx, x + 9, y + 4, 5, 23, MARBLE_LIGHT);
  r(ctx, x + 20, y + 4, 3, 23, MARBLE_DARK);
  r(ctx, x + 4, y, 24, 6, OUTLINE);
  r(ctx, x + 5, y + 1, 22, 4, CREAM);
  r(ctx, x + 4, y + 25, 24, 6, OUTLINE);
  r(ctx, x + 5, y + 26, 22, 4, CREAM);
  r(ctx, x + 7, y + 6, 2, 18, GOLD_DARK);
  r(ctx, x + 24, y + 6, 2, 18, GOLD_DARK);
  // veta diagonal discreta
  r(ctx, x + 13, y + 10, 7, 1, 'rgba(110,91,70,.18)');
  r(ctx, x + 17, y + 15, 5, 1, 'rgba(110,91,70,.14)');
}

function drawSafe(ctx: Ctx, x: number, y: number, frame: number): void {
  shadow(ctx, x, y, 30);
  r(ctx, x + 2, y + 4, 28, 24, OUTLINE);
  r(ctx, x + 4, y + 6, 24, 20, METAL_DARK);
  r(ctx, x + 6, y + 8, 20, 16, METAL);
  r(ctx, x + 7, y + 9, 18, 2, METAL_LIGHT);
  // puerta e incrustación dorada
  r(ctx, x + 9, y + 11, 14, 11, '#536063');
  r(ctx, x + 10, y + 12, 12, 9, '#657275');
  ell(ctx, x + 16, y + 16, 5, 5, OUTLINE);
  ell(ctx, x + 16, y + 16, 4, 4, GOLD_DARK);
  const a = frame * .025;
  const hx = Math.round(Math.cos(a) * 4);
  const hy = Math.round(Math.sin(a) * 4);
  r(ctx, x + 15 + hx, y + 15 + hy, 3, 3, GOLD_LIGHT);
  r(ctx, x + 25, y + 14, 2, 7, GOLD);
}

function drawRubble(ctx: Ctx, x: number, y: number): void {
  shadow(ctx, x, y, 28);
  r(ctx, x + 4, y + 19, 10, 8, OUTLINE);
  r(ctx, x + 5, y + 18, 9, 7, MARBLE_DARK);
  r(ctx, x + 12, y + 15, 13, 11, OUTLINE);
  r(ctx, x + 13, y + 14, 11, 10, MARBLE);
  r(ctx, x + 21, y + 20, 7, 6, OUTLINE);
  r(ctx, x + 22, y + 19, 6, 5, WOOD_LIGHT);
  r(ctx, x + 8, y + 16, 3, 3, GOLD);
  r(ctx, x + 17, y + 11, 4, 4, TEAL_LIGHT);
}

export function drawChibiLobbyObstacle(ctx: Ctx, x: number, y: number, kind: number, frame: number): void {
  switch (kind) {
    case 0: drawCounter(ctx, x, y); break;
    case 1: drawBarrier(ctx, x, y); break;
    case 2: drawShelf(ctx, x, y); break;
    case 3: drawMoneyBag(ctx, x, y, frame); break;
    case 4: drawBreadCrate(ctx, x, y); break;
    case 5: drawColumn(ctx, x, y); break;
    case 6: drawSafe(ctx, x, y, frame); break;
    default: drawRubble(ctx, x, y); break;
  }
}

export const CHIBI_LOBBY_PROP_TILE_SIZE = T;
