// Escenario kawaii: piso, muros, alfombra y puertas en la misma rejilla de
// píxel que los personajes (1 px de mundo), con contorno oscuro y colores
// pastel por piso. Sustituye al arte anterior de baldosas y muros.
import { ROOM_HEIGHT, ROOM_WIDTH, TILE_SIZE, TILE_DOOR, type FloorTheme } from './constants';

const T = TILE_SIZE;
const INK = '#25203a';

type RoomPal = {
  floorA: string; floorB: string; grout: string; shine: string;
  wallTop: string; wallTopHi: string; wallFace: string; wallFaceLo: string; wainscot: string; base: string;
  rug: string; rugHi: string; rugLo: string; rugTrim: string; trim: string; vein?: string; glow: string;
};

// Piso 1 lobby · 2 administración · 3 ejecutivo · 4 alta dirección · 5 tesorería · 6 cámara soberana
const PALS: RoomPal[] = [
  { floorA:'#d3dde3', floorB:'#c6d2d9', grout:'#a9b7c2', shine:'#eef4f7',
    wallTop:'#a9b6d8', wallTopHi:'#c9d3ee', wallFace:'#8796c2', wallFaceLo:'#7181b0', wainscot:'#6574a3', base:'#4e5a86',
    rug:'#ee8399', rugHi:'#ffb0be', rugLo:'#cc627a', rugTrim:'#ffd45e', trim:'#ffd45e', glow:'#fff6d8' },
  { floorA:'#eadfce', floorB:'#e4d8c5', grout:'#c7b69c', shine:'#fbf4e8',
    wallTop:'#e3b08a', wallTopHi:'#f6cfae', wallFace:'#cf9470', wallFaceLo:'#bb7f5c', wainscot:'#a86d4c', base:'#7f4f37',
    rug:'#6f9ccf', rugHi:'#9cc2ec', rugLo:'#557fb0', rugTrim:'#fff1d6', trim:'#e8c07a', glow:'#fff1d6' },
  { floorA:'#d6bd9b', floorB:'#cdb18e', grout:'#a68a68', shine:'#ecd9bc',
    wallTop:'#9cbf98', wallTopHi:'#bcd9b6', wallFace:'#7ea47b', wallFaceLo:'#6c9069', wainscot:'#5d7d5a', base:'#425a40',
    rug:'#b56f9c', rugHi:'#d897c0', rugLo:'#91567c', rugTrim:'#ffe08a', trim:'#e8b86a', glow:'#ffeccc' },
  { floorA:'#f3e9da', floorB:'#ecdfcc', grout:'#d6c3a6', shine:'#fffaf1', vein:'#dcc8ad',
    wallTop:'#d4a3bd', wallTopHi:'#ecc4d8', wallFace:'#bb85a3', wallFaceLo:'#a7718f', wainscot:'#8f5c79', base:'#683f58',
    rug:'#4f8a8b', rugHi:'#78b5b4', rugLo:'#3a6c6e', rugTrim:'#ffd45e', trim:'#ffd45e', glow:'#fff3dc' },
  { floorA:'#5a5174', floorB:'#4f4767', grout:'#3b3452', shine:'#776d96', vein:'#6f6590',
    wallTop:'#6c6294', wallTopHi:'#8c82b4', wallFace:'#4f4675', wallFaceLo:'#443c66', wainscot:'#3a3259', base:'#2a2342',
    rug:'#c9443d', rugHi:'#ef6d5f', rugLo:'#9c2f2d', rugTrim:'#ffd45e', trim:'#ffd45e', glow:'#ffe08a' },
  { floorA:'#334166', floorB:'#2c3a5c', grout:'#222c48', shine:'#4d5f8f', vein:'#5f7cb8',
    wallTop:'#3f4f80', wallTopHi:'#5d70a8', wallFace:'#2e3b63', wallFaceLo:'#283458', wainscot:'#222b4c', base:'#171d36',
    rug:'#7a54c9', rugHi:'#a07fe8', rugLo:'#5c3ca3', rugTrim:'#8ff0e6', trim:'#ffd45e', glow:'#c8f6ff' },
];
const DECOS = ['lobby', 'security', 'storage', 'bakery', 'vault', 'golden'];
export function kawaiiRoomTier(theme: FloorTheme) { return Math.max(0, DECOS.indexOf(theme.deco)); }

function h(x: number, y: number, s = 0) {
  let n = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  n = (n ^ (n >>> 13)) * 1274126177;
  return (n ^ (n >>> 16)) >>> 0;
}
function r(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, hh: number, c: string) { ctx.fillStyle = c; ctx.fillRect(x, y, w, hh); }

function floorTile(ctx: CanvasRenderingContext2D, px: number, py: number, x: number, y: number, p: RoomPal, tier: number) {
  if (tier === 2) { // piso de duela: tablones de 8 px con juntas desfasadas
    for (let j = 0; j < 4; j++) {
      const oy = py + j * 8, off = ((y * 4 + j) * 13) % 32;
      r(ctx, px, oy, T, 8, (y * 4 + j) % 2 ? p.floorA : p.floorB);
      r(ctx, px, oy, T, 1, p.grout); r(ctx, px, oy + 1, T, 1, p.shine);
      const sx = px + ((off + x * 7) % 32); r(ctx, sx, oy, 1, 8, p.grout);
    }
    return;
  }
  // Cuatro losetas de 16 px por baldosa, en damero suave.
  for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
    const ox = px + i * 16, oy = py + j * 16;
    const alt = ((x * 2 + i) + (y * 2 + j)) % 2 === 0;
    r(ctx, ox, oy, 16, 16, alt ? p.floorA : p.floorB);
    r(ctx, ox, oy, 16, 1, p.grout); r(ctx, ox, oy, 1, 16, p.grout);
    r(ctx, ox + 1, oy + 1, 3, 1, p.shine); r(ctx, ox + 1, oy + 2, 1, 1, p.shine);
  }
  const k = h(x, y, tier);
  if (p.vein && k % 3 === 0) { // vetas de mármol, pocas y suaves
    const sx = px + 4 + (k % 20), sy = py + 3 + ((k >> 5) % 18);
    for (let i = 0; i < 6; i++) r(ctx, sx + i, sy + Math.round(i * .6), 1, 1, p.vein);
  }
  if (tier >= 4 && k % 7 === 0) { // destellos en los pisos de lujo
    const sx = px + 6 + (k % 18), sy = py + 6 + ((k >> 7) % 18);
    r(ctx, sx, sy - 1, 1, 3, p.shine); r(ctx, sx - 1, sy, 3, 1, p.shine);
  }
}

function rug(ctx: CanvasRenderingContext2D, p: RoomPal, tier: number) {
  // Alfombra centrada de 8x4 baldosas: da estructura sin dominar la sala.
  const cxT = Math.floor(ROOM_WIDTH / 2);
  const x0 = (cxT - 4) * T + 8, y0 = 3 * T + 20, x1 = (cxT + 4) * T - 8, y1 = (ROOM_HEIGHT - 3) * T - 20;
  const w = x1 - x0, hh = y1 - y0;
  if (w < 64) return;
  r(ctx, x0 + 2, y0, w - 4, hh, INK); r(ctx, x0, y0 + 2, w, hh - 4, INK); r(ctx, x0 + 1, y0 + 1, w - 2, hh - 2, INK);
  r(ctx, x0 + 2, y0 + 1, w - 4, hh - 2, p.rug); r(ctx, x0 + 1, y0 + 2, w - 2, hh - 4, p.rug);
  r(ctx, x0 + 3, y0 + 2, w - 6, 1, p.rugHi); r(ctx, x0 + 3, y1 - 3, w - 6, 1, p.rugLo);
  // borde dorado con puntitos
  r(ctx, x0 + 6, y0 + 6, w - 12, 1, p.rugTrim); r(ctx, x0 + 6, y1 - 7, w - 12, 1, p.rugTrim);
  r(ctx, x0 + 6, y0 + 6, 1, hh - 12, p.rugTrim); r(ctx, x1 - 7, y0 + 6, 1, hh - 12, p.rugTrim);
  for (let x = x0 + 12; x < x1 - 10; x += 8) { r(ctx, x, y0 + 3, 2, 2, p.rugHi); r(ctx, x, y1 - 5, 2, 2, p.rugLo); }
  // emblema central: pan con corona (Banco del Pan)
  const cx = Math.round((x0 + x1) / 2), cy = Math.round((y0 + y1) / 2);
  const em = ['..oooooo..', '.oyyyyyyo.', 'oyyhyyhyyo', 'oyyyyyyyyo', '.oyyyyyyo.', '..oooooo..'];
  const crown = ['o.o.o', 'ooooo'];
  const pal: Record<string, string> = { o: INK, y: tier >= 4 ? '#ffd45e' : p.rugTrim, h: '#ffffff' };
  em.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (pal[row[i]]) r(ctx, cx - 5 + i, cy - 2 + j, 1, 1, pal[row[i]]); });
  crown.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] === 'o') r(ctx, cx - 2 + i, cy - 5 + j, 1, 1, '#ffd45e'); });
  // fleco en los extremos
  for (let y = y0 + 6; y < y1 - 6; y += 3) { r(ctx, x0 - 2, y, 2, 1, p.rugTrim); r(ctx, x1, y, 2, 1, p.rugTrim); }
}

// Decoración de la pared norte (dibujada sobre la cara del muro).
function wallDeco(ctx: CanvasRenderingContext2D, px: number, py: number, kind: number, p: RoomPal, tier: number, f: number) {
  const x = px + 7, y = py + 12;
  switch (kind % 5) {
    case 0: { // cuadro con pan
      r(ctx, x, y, 18, 12, INK); r(ctx, x + 1, y + 1, 16, 10, p.trim); r(ctx, x + 2, y + 2, 14, 8, '#cfe8ff');
      r(ctx, x + 5, y + 5, 8, 3, '#f2b765'); r(ctx, x + 6, y + 4, 6, 1, '#ffe2a8'); r(ctx, x + 5, y + 8, 8, 1, '#cc8640');
      break; }
    case 1: { // reloj redondo
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(px + 16, y + 6, 6.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff7ea'; ctx.beginPath(); ctx.arc(px + 16, y + 6, 5.2, 0, Math.PI * 2); ctx.fill();
      const a = f * .01; r(ctx, px + 16, y + 6, 1, 1, INK);
      r(ctx, Math.round(px + 16 + Math.cos(a) * 3), Math.round(y + 6 + Math.sin(a) * 3), 1, 1, INK); r(ctx, px + 16, y + 3, 1, 3, INK);
      break; }
    case 2: { // ventanita con persiana
      r(ctx, x, y - 2, 18, 15, INK); r(ctx, x + 1, y - 1, 16, 13, tier >= 4 ? '#3c3a66' : '#bfe6ff');
      for (let i = 0; i < 4; i++) r(ctx, x + 1, y + i * 3, 16, 1, tier >= 4 ? '#55528a' : '#ffffff');
      r(ctx, x + 1, y + 12, 16, 1, p.trim);
      break; }
    case 3: { // letrero del banco "$"
      r(ctx, x + 1, y, 16, 10, INK); r(ctx, x + 2, y + 1, 14, 8, p.trim);
      const s = ['.ooo', 'o...', '.oo.', '...o', 'ooo.']; s.forEach((row, j) => { for (let i = 0; i < 4; i++) if (row[i] === 'o') r(ctx, x + 7 + i, y + 2 + j, 1, 1, INK); });
      r(ctx, x + 8, y + 1, 1, 1, INK); r(ctx, x + 9, y + 7, 1, 1, INK);
      break; }
    default: { // repisa con macetita
      r(ctx, x, y + 9, 18, 2, INK); r(ctx, x + 1, y + 9, 16, 1, p.trim);
      r(ctx, x + 6, y + 4, 6, 5, INK); r(ctx, x + 7, y + 5, 4, 4, '#e88aa6');
      r(ctx, x + 7, y + 1, 2, 3, '#6cbf78'); r(ctx, x + 9, y, 2, 4, '#8fe8a0'); r(ctx, x + 11, y + 2, 1, 2, '#6cbf78');
    }
  }
}

function wallTile(ctx: CanvasRenderingContext2D, x: number, y: number, p: RoomPal, tier: number, f: number, decorate: boolean) {
  const px = x * T, py = y * T;
  const north = y === 0 && x > 0 && x < ROOM_WIDTH - 1;
  if (north) {
    // Repisa superior + cara del muro + zócalo.
    r(ctx, px, py, T, 9, p.wallTop); r(ctx, px, py + 1, T, 1, p.wallTopHi);
    r(ctx, px, py + 8, T, 1, INK);
    r(ctx, px, py + 9, T, 23, p.wallFace);
    r(ctx, px, py + 9, T, 2, p.wallFaceLo);
    r(ctx, px + T - 1, py + 11, 1, 13, p.wallFaceLo);
    r(ctx, px, py + 24, T, 5, p.wainscot); r(ctx, px, py + 24, T, 1, p.trim);
    r(ctx, px, py + 29, T, 3, p.base);
    if (decorate && x % 3 === 1) wallDeco(ctx, px, py, h(x, 7, tier) % 97, p, tier, f);
    return;
  }
  // Muros vistos desde arriba (laterales, inferior y esquinas).
  r(ctx, px, py, T, T, p.wallTop);
  const k = h(x, y, tier + 3);
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
    r(ctx, px + i * 16, py + j * 16, 16, 1, p.wallTopHi);
    if (k & (1 << (i + j * 2))) r(ctx, px + i * 16 + 3, py + j * 16 + 4, 2, 1, p.wallTopHi);
  }
  const W = ROOM_WIDTH - 1, H = ROOM_HEIGHT - 1;
  // borde interior hacia la sala: línea oscura y una franja de sombra.
  if (x === 0 && y > 0 && y < H) { r(ctx, px + T - 4, py, 3, T, p.wallFaceLo); r(ctx, px + T - 1, py, 1, T, INK); }
  if (x === W && y > 0 && y < H) { r(ctx, px + 1, py, 3, T, p.wallFaceLo); r(ctx, px, py, 1, T, INK); }
  if (y === H && x > 0 && x < W) { r(ctx, px, py, T, 1, INK); r(ctx, px, py + 1, T, 3, p.wallTopHi); }
  if (y === 0 && (x === 0 || x === W)) { r(ctx, px, py + 8, T, 1, INK); }
}

/** Fondo completo de la sala (se cachea en render.ts). */
export function drawKawaiiRoomBackdrop(ctx: CanvasRenderingContext2D, layout: number[][], theme: FloorTheme, f: number,
  decorate: boolean, withRug: boolean) {
  const tier = kawaiiRoomTier(theme), p = PALS[tier];
  for (let y = 0; y < ROOM_HEIGHT; y++) for (let x = 0; x < ROOM_WIDTH; x++) {
    const t = layout[y]?.[x] ?? 1;
    if (t === 1 || t === TILE_DOOR) wallTile(ctx, x, y, p, tier, f, decorate);
    else floorTile(ctx, x * T, y * T, x, y, p, tier);
  }
  if (withRug) rug(ctx, p, tier);
  // Sombra suave del muro norte y de los laterales sobre el piso.
  ctx.save();
  ctx.globalAlpha = .18; r(ctx, T, T, (ROOM_WIDTH - 2) * T, 6, INK);
  ctx.globalAlpha = .1; r(ctx, T, T + 6, (ROOM_WIDTH - 2) * T, 4, INK);
  ctx.globalAlpha = .1; r(ctx, T, T, 4, (ROOM_HEIGHT - 2) * T, INK); r(ctx, (ROOM_WIDTH - 1) * T - 4, T, 4, (ROOM_HEIGHT - 2) * T, INK);
  // Luces del techo: charcos de luz cálidos y suaves.
  const lights = Math.max(2, Math.floor(ROOM_WIDTH / 6));
  for (let i = 0; i < lights; i++) {
    const cx = ((i + .5) / lights) * ROOM_WIDTH * T, cy = ROOM_HEIGHT * T * .42;
    const g = ctx.createRadialGradient(cx, cy, 6, cx, cy, 120);
    g.addColorStop(0, p.glow); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.globalAlpha = tier >= 4 ? .14 : .1; ctx.fillStyle = g; ctx.fillRect(cx - 120, cy - 120, 240, 240);
  }
  ctx.restore();
}

// ---------------------------------------------------------------- puertas
const DOOR: Record<string, [string, string, string]> = {
  silver: ['#e6e8f6', '#b9bfe0', '#7d83b0'], gold: ['#fff0a3', '#ffd45e', '#e09a2e'],
  green: ['#d6ffe4', '#8fe8b0', '#4fb87c'], orange: ['#ffe0bf', '#ffb070', '#e07a36'],
  boss: ['#ffc2cb', '#ff6b7f', '#c23a52'], purple: ['#efe0ff', '#c9a0ff', '#8a62c9'],
};
function lockIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  r(ctx, cx - 3, cy - 1, 7, 6, INK); r(ctx, cx - 2, cy, 5, 4, '#ffd45e'); r(ctx, cx, cy + 1, 1, 2, INK);
  r(ctx, cx - 2, cy - 4, 1, 3, INK); r(ctx, cx + 2, cy - 4, 1, 3, INK); r(ctx, cx - 1, cy - 5, 3, 1, INK);
}

/** Puerta kawaii: marco redondeado del color del destino y hojas que se deslizan. */
export function drawKawaiiDoor(ctx: CanvasRenderingContext2D, bx: number, by: number, dir: 'N' | 'S' | 'E' | 'W',
  style: string, locked: boolean, open: number, f: number, theme?: FloorTheme) {
  const [hi, base, lo] = DOOR[style] ?? DOOR.silver;
  const p = PALS[theme ? kawaiiRoomTier(theme) : 0];
  const slide = Math.round(Math.max(0, Math.min(1, open)) * 12);
  const led = locked ? (Math.floor(f / 20) % 2 ? '#ff5a72' : '#c23a52') : '#8ff0a0';
  if (dir === 'N') {
    // Hueco con arco dentro de la cara del muro.
    r(ctx, bx + 3, by + 9, 26, 23, INK);
    r(ctx, bx + 5, by + 6, 22, 3, INK); r(ctx, bx + 7, by + 4, 18, 2, INK);
    r(ctx, bx + 4, by + 10, 24, 22, base); r(ctx, bx + 6, by + 7, 20, 3, base); r(ctx, bx + 8, by + 5, 16, 2, hi);
    r(ctx, bx + 4, by + 10, 1, 22, hi); r(ctx, bx + 27, by + 10, 1, 22, lo);
    r(ctx, bx + 7, by + 11, 18, 21, '#0f0c1c'); // interior
    r(ctx, bx + 8, by + 26, 16, 6, '#1c1733');
    // hojas
    const lw = 9 - Math.round(slide * .75);
    if (lw > 0) {
      r(ctx, bx + 7, by + 11, lw, 21, base); r(ctx, bx + 7, by + 11, lw, 1, hi); r(ctx, bx + 7 + lw - 1, by + 11, 1, 21, lo);
      r(ctx, bx + 25 - lw, by + 11, lw, 21, base); r(ctx, bx + 25 - lw, by + 11, lw, 1, hi); r(ctx, bx + 25 - lw, by + 11, 1, 21, lo);
      if (lw > 3) { r(ctx, bx + 7 + lw - 3, by + 20, 1, 3, INK); r(ctx, bx + 25 - lw + 2, by + 20, 1, 3, INK); }
      if (lw > 5) { r(ctx, bx + 9, by + 14, lw - 4, 4, '#cfe8ff'); r(ctx, bx + 25 - lw + 2, by + 14, lw - 4, 4, '#cfe8ff'); }
    }
    r(ctx, bx + 15, by + 6, 2, 2, led);
    if (locked) lockIcon(ctx, bx + 16, by + 20);
    return;
  }
  if (dir === 'S') {
    r(ctx, bx, by, T, T, p.wallTop);
    r(ctx, bx + 4, by, 24, 26, INK); r(ctx, bx + 5, by, 22, 25, '#0f0c1c');
    r(ctx, bx + 2, by, 3, 28, base); r(ctx, bx + 27, by, 3, 28, base); r(ctx, bx + 2, by, 3, 1, hi); r(ctx, bx + 27, by, 3, 1, hi);
    r(ctx, bx + 1, by, 1, 28, INK); r(ctx, bx + 30, by, 1, 28, INK);
    const lw = 11 - Math.round(slide * .9);
    if (lw > 0) { r(ctx, bx + 5, by + 2, lw, 4, base); r(ctx, bx + 5, by + 2, lw, 1, hi); r(ctx, bx + 27 - lw, by + 2, lw, 4, base); r(ctx, bx + 27 - lw, by + 2, lw, 1, hi); }
    r(ctx, bx + 8, by + 9, 16, 12, p.rugLo); r(ctx, bx + 9, by + 10, 14, 10, p.rug); // tapete
    r(ctx, bx + 15, by + 27, 2, 2, led);
    if (locked) lockIcon(ctx, bx + 16, by + 15);
    return;
  }
  // Puertas laterales vistas desde arriba.
  const west = dir === 'W';
  r(ctx, bx, by, T, T, p.wallTop);
  const gx = west ? bx + 6 : bx + 2;
  r(ctx, gx, by + 4, 24, 24, INK); r(ctx, gx + 1, by + 5, 22, 22, '#0f0c1c');
  r(ctx, gx - 1, by + 1, 26, 3, base); r(ctx, gx - 1, by + 28, 26, 3, base); r(ctx, gx - 1, by + 1, 26, 1, hi); r(ctx, gx - 1, by + 30, 26, 1, lo);
  r(ctx, gx - 1, by, 26, 1, INK); r(ctx, gx - 1, by + 31, 26, 1, INK);
  const lh = 11 - Math.round(slide * .9);
  const lx = west ? gx + 18 : gx + 2;
  if (lh > 0) { r(ctx, lx, by + 5, 4, lh, base); r(ctx, lx, by + 5, 1, lh, hi); r(ctx, lx, by + 27 - lh, 4, lh, base); r(ctx, lx, by + 27 - lh, 1, lh, hi); }
  r(ctx, west ? gx + 4 : gx + 16, by + 10, 4, 12, p.rugLo);
  r(ctx, west ? bx + 2 : bx + 28, by + 15, 2, 2, led);
  if (locked) lockIcon(ctx, gx + 12, by + 16);
}
