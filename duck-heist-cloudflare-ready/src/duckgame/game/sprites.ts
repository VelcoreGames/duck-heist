// Pixel art sprite renderer using canvas
// All sprites are drawn procedurally - no external assets needed

import { COLORS, TILE_SIZE } from './constants';
import { getSkin, type DuckPalette } from './data';
import { drawItemIcon } from './itemArt';

type Ctx = CanvasRenderingContext2D;

function px(ctx: Ctx, x: number, y: number, color: string, s: number = 1) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.floor(x), Math.floor(y), s, s);
}

function rect(ctx: Ctx, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.floor(x), Math.floor(y), w, h);
}

const DUCK_BODY = '#f9e547';
const DUCK_DARK = '#e0c31c';
const DUCK_SHADE = '#c9ae13';
const BEAK = '#f0912b';
const BEAK_DARK = '#cf6f14';
const MASK = '#15151f';
const PACK = '#3b2f2a';
const PACK_STRAP = '#2a211d';

export type DuckDir = 'up' | 'down' | 'left' | 'right';

/** Paleta de colores del pato */
export type DuckPaletteLike = DuckPalette;

const DEFAULT_DUCK: DuckPaletteLike = {
  body: DUCK_BODY, dark: DUCK_DARK, shade: DUCK_SHADE,
  beak: BEAK, beakDark: BEAK_DARK, mask: MASK, pack: PACK, strap: PACK_STRAP,
};

/**
 * Pato criminal con animación completa.
 * dir: dirección · moving: waddle · hurt/dashing/dead: estados · pal: colores de skin
 */
export function drawDuck(
  ctx: Ctx, x: number, y: number, frame: number,
  dir: DuckDir = 'down', moving = false, hurt = false, dashing = false,
  shooting = false, dead = false, pal: DuckPaletteLike = DEFAULT_DUCK,
) {
  const bx = Math.floor(x);
  const by = Math.floor(y);

  ctx.save();

  if (dead) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(bx + 8, by + 15, 9, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    rect(ctx, bx + 1, by + 9, 14, 6, pal.body);
    rect(ctx, bx + 2, by + 12, 12, 3, pal.shade);
    rect(ctx, bx + 12, by + 6, 4, 4, pal.body);
    rect(ctx, bx + 15, by + 7, 3, 2, pal.beak);
    px(ctx, bx + 13, by + 7, '#000', 1); px(ctx, bx + 14, by + 8, '#000', 1);
    px(ctx, bx + 14, by + 7, '#000', 1); px(ctx, bx + 13, by + 8, '#000', 1);
    rect(ctx, bx + 4, by + 6, 2, 4, pal.beak);
    rect(ctx, bx + 8, by + 5, 2, 5, pal.beak);
    ctx.restore();
    return;
  }

  if (hurt && Math.floor(frame * 0.5) % 2 === 0) ctx.globalAlpha = 0.45;
  if (dashing) ctx.globalAlpha = 0.75;

  const waddle = moving ? Math.round(Math.sin(frame * 0.35)) : 0;
  const step = moving ? Math.sin(frame * 0.35) : 0;
  const blink = (frame % 190) < 7;

  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  ctx.fillRect(bx + 2, by + 16, 12, 3);
  ctx.fillRect(bx + 3, by + 19, 10, 1);

  const footA = moving ? (step > 0 ? 1 : -1) : 0;
  rect(ctx, bx + 3 - footA, by + 15, 3, 3, pal.beak);
  rect(ctx, bx + 2 - footA, by + 17, 5, 1, pal.beakDark);
  rect(ctx, bx + 10 + footA, by + 15, 3, 3, pal.beak);
  rect(ctx, bx + 9 + footA, by + 17, 5, 1, pal.beakDark);

  if (dir === 'up') {
    rect(ctx, bx + 3, by + 5, 10, 9, pal.pack);
    rect(ctx, bx + 4, by + 6, 8, 3, '#4a3b34');
    rect(ctx, bx + 6, by + 10, 4, 2, pal.strap);
  }

  rect(ctx, bx + 3, by + 6 + waddle, 10, 9, pal.body);
  rect(ctx, bx + 2, by + 8 + waddle, 12, 5, pal.body);
  rect(ctx, bx + 3, by + 12 + waddle, 10, 3, pal.dark);
  rect(ctx, bx + 4, by + 14 + waddle, 8, 1, pal.shade);
  rect(ctx, bx + 4, by + 7 + waddle, 3, 1, '#fff59d');
  rect(ctx, bx + 11, by + 8 + waddle, 1, 4, 'rgba(255,255,255,.18)');

  if (dir !== 'up') {
    rect(ctx, bx + 5, by + 7 + waddle, 1, 6, pal.strap);
    rect(ctx, bx + 10, by + 7 + waddle, 1, 6, pal.strap);
  }
  if (dir === 'left') { rect(ctx, bx + 11, by + 7 + waddle, 4, 6, pal.pack); rect(ctx, bx + 12, by + 8 + waddle, 2, 2, '#4a3b34'); }
  if (dir === 'right') { rect(ctx, bx + 1, by + 7 + waddle, 4, 6, pal.pack); rect(ctx, bx + 2, by + 8 + waddle, 2, 2, '#4a3b34'); }

  const hy = by + 2 + waddle;
  rect(ctx, bx + 4, hy, 8, 6, pal.body);
  rect(ctx, bx + 3, hy + 1, 10, 4, pal.body);

  if (dir === 'up') {
    rect(ctx, bx + 3, hy + 1, 10, 3, pal.mask);
    rect(ctx, bx + 5, hy + 4, 6, 2, pal.dark);
    rect(ctx, bx + 6, by + 13 + waddle, 4, 3, pal.shade);
  } else if (dir === 'down') {
    rect(ctx, bx + 3, hy + 1, 10, 3, pal.mask);
    rect(ctx, bx + 2, hy + 1, 1, 2, pal.mask);
    rect(ctx, bx + 13, hy + 1, 1, 2, pal.mask);
    if (!blink) {
      rect(ctx, bx + 5, hy + 2, 2, 2, '#fff');
      rect(ctx, bx + 9, hy + 2, 2, 2, '#fff');
      px(ctx, bx + 6, hy + 2, '#0a0a0a', 1);
      px(ctx, bx + 10, hy + 2, '#0a0a0a', 1);
    } else {
      rect(ctx, bx + 5, hy + 3, 2, 1, '#0a0a0a');
      rect(ctx, bx + 9, hy + 3, 2, 1, '#0a0a0a');
    }
    rect(ctx, bx + 6, hy + 5, 4, 2, pal.beak);
    rect(ctx, bx + 6, hy + 6, 4, 1, pal.beakDark);
  } else {
    const flip = dir === 'left';
    const fx = (v: number) => flip ? bx + 15 - v : bx + v;
    rect(ctx, bx + 3, hy + 1, 10, 3, pal.mask);
    if (!blink) {
      rect(ctx, fx(9), hy + 2, 2, 2, '#fff');
      px(ctx, fx(10), hy + 2, '#0a0a0a', 1);
    } else {
      rect(ctx, fx(9), hy + 3, 2, 1, '#0a0a0a');
    }
    const bxp = flip ? bx - 2 : bx + 12;
    rect(ctx, bxp, hy + 4, 5, 2, pal.beak);
    rect(ctx, bxp + (flip ? 0 : 1), hy + 6, 4, 1, pal.beakDark);
    rect(ctx, flip ? bx + 12 : bx + 1, by + 9 + waddle, 3, 3, pal.shade);
  }

  if (shooting) {
    ctx.globalAlpha = 0.85;
    const mx = dir === 'left' ? bx - 2 : dir === 'right' ? bx + 16 : bx + 8;
    const my = dir === 'up' ? by + 1 : dir === 'down' ? by + 17 : by + 8;
    rect(ctx, mx - 2, my - 2, 4, 4, '#fff8dc');
    rect(ctx, mx - 1, my - 1, 2, 2, '#f4d03f');
  }

  if (dashing) {
    ctx.globalAlpha = 0.28;
    rect(ctx, bx + 2, by + 8, 12, 5, '#fff59d');
  }

  ctx.restore();
}

/**
 * CORAZÓN PIXEL ART INTENCIONAL (12x11 píxeles)
 * Renderizado nítido con outline oscuro, brillo superior y volumen.
 */
export function drawHeart(ctx: Ctx, x: number, y: number, filled: boolean, half = false) {
  const bx = Math.floor(x);
  const by = Math.floor(y);
  ctx.save();

  if (filled) {
    // Sombra proyectada
    rect(ctx, bx + 2, by + 11, 8, 1, 'rgba(0,0,0,0.3)');

    // Contorno oscuro
    rect(ctx, bx + 1, by + 1, 4, 1, '#4a0a14');
    rect(ctx, bx + 7, by + 1, 4, 1, '#4a0a14');
    rect(ctx, bx, by + 2, 1, 4, '#4a0a14');
    rect(ctx, bx + 11, by + 2, 1, 4, '#4a0a14');
    rect(ctx, bx + 5, by + 2, 2, 2, '#4a0a14');
    rect(ctx, bx + 1, by + 6, 1, 2, '#4a0a14');
    rect(ctx, bx + 10, by + 6, 1, 2, '#4a0a14');
    rect(ctx, bx + 2, by + 8, 1, 1, '#4a0a14');
    rect(ctx, bx + 9, by + 8, 1, 1, '#4a0a14');
    rect(ctx, bx + 3, by + 9, 2, 1, '#4a0a14');
    rect(ctx, bx + 7, by + 9, 2, 1, '#4a0a14');
    rect(ctx, bx + 5, by + 10, 2, 1, '#4a0a14');

    // Relleno rojo brillante
    rect(ctx, bx + 1, by + 2, 4, 4, '#ff2e4d');
    rect(ctx, bx + 7, by + 2, 4, 4, '#ff2e4d');
    rect(ctx, bx + 1, by + 4, 10, 2, '#ff2e4d');
    rect(ctx, bx + 2, by + 6, 8, 2, '#e01b38');
    rect(ctx, bx + 3, by + 8, 6, 1, '#c0142e');
    rect(ctx, bx + 4, by + 9, 4, 1, '#a01026');
    rect(ctx, bx + 5, by + 10, 2, 1, '#800c1e');

    // Brillo blanco en lóbulo superior izquierdo
    rect(ctx, bx + 2, by + 2, 2, 1, '#ffffff');
    rect(ctx, bx + 1, by + 3, 1, 2, '#ffffff');
    rect(ctx, bx + 2, by + 3, 1, 1, '#ffccd4');
  } else {
    // Corazón vacío (desaturado / fondo oscuro de contorno)
    rect(ctx, bx + 1, by + 1, 4, 1, '#242833');
    rect(ctx, bx + 7, by + 1, 4, 1, '#242833');
    rect(ctx, bx, by + 2, 12, 4, '#12151c');
    rect(ctx, bx + 1, by + 6, 10, 2, '#12151c');
    rect(ctx, bx + 2, by + 8, 8, 1, '#12151c');
    rect(ctx, bx + 3, by + 9, 6, 1, '#12151c');
    rect(ctx, bx + 5, by + 10, 2, 1, '#12151c');

    // Contorno interior tenue
    rect(ctx, bx + 1, by + 1, 4, 1, '#3b4354');
    rect(ctx, bx + 7, by + 1, 4, 1, '#3b4354');
    rect(ctx, bx, by + 2, 1, 4, '#3b4354');
    rect(ctx, bx + 11, by + 2, 1, 4, '#3b4354');
    rect(ctx, bx + 5, by + 2, 2, 2, '#3b4354');
    rect(ctx, bx + 3, by + 4, 2, 2, '#202530');
    rect(ctx, bx + 7, by + 4, 2, 2, '#202530');
  }

  if (half) {
    rect(ctx, bx + 6, by + 1, 6, 10, 'rgba(10,12,18,0.7)');
  }

  ctx.restore();
}

/** Comida curativa (píxel) */
export function drawFood(ctx: Ctx, x: number, y: number, kind: string, frame: number) {
  const bx = Math.floor(x);
  const by = Math.floor(y);
  const bob = Math.sin(frame * 0.08) * 1;
  ctx.save();
  ctx.translate(0, bob);
  switch (kind) {
    case 'sandwich':
      rect(ctx, bx, by + 8, 16, 3, '#e8c99b');
      rect(ctx, bx + 1, by + 6, 14, 2, '#27ae60');
      rect(ctx, bx + 1, by + 4, 14, 2, '#d4a574');
      rect(ctx, bx + 2, by + 2, 12, 2, '#f4d03f');
      rect(ctx, bx, by, 16, 2, '#e8c99b');
      break;
    case 'baguette':
      rect(ctx, bx + 1, by + 6, 14, 4, '#d4a574');
      rect(ctx, bx + 2, by + 5, 12, 2, '#e8c99b');
      rect(ctx, bx + 3, by + 8, 10, 1, '#a67c52');
      rect(ctx, bx + 4, by + 3, 2, 2, '#a67c52');
      rect(ctx, bx + 10, by + 10, 2, 2, '#a67c52');
      break;
    case 'croissant':
      ctx.fillStyle = '#d4a574';
      ctx.beginPath();
      ctx.arc(bx + 8, by + 7, 6, 0.3, Math.PI - 0.3);
      ctx.lineTo(bx + 4, by + 10);
      ctx.arc(bx + 8, by + 10, 4, Math.PI, 0, true);
      ctx.lineTo(bx + 12, by + 10);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#a67c52';
      ctx.fillRect(bx + 4, by + 8, 8, 1);
      break;
    case 'torta':
      rect(ctx, bx + 1, by + 6, 14, 5, '#e8c99b');
      rect(ctx, bx, by + 4, 16, 3, '#f4d03f');
      rect(ctx, bx + 2, by + 8, 3, 2, '#e74c3c');
      rect(ctx, bx + 7, by + 8, 3, 2, '#27ae60');
      rect(ctx, bx + 12, by + 8, 3, 2, '#9b59b6');
      rect(ctx, bx + 5, by, 2, 3, '#fff3b0');
      break;
    case 'pan_dorado':
      rect(ctx, bx, by + 5, 16, 7, '#ffd95e');
      rect(ctx, bx + 1, by + 4, 14, 2, '#fff3b0');
      rect(ctx, bx + 2, by + 7, 12, 3, '#f0c33c');
      rect(ctx, bx + 6, by + 1, 4, 4, '#fff');
      ctx.fillStyle = 'rgba(255,240,150,0.6)';
      ctx.fillRect(bx - 2, by - 2, 20, 14);
      break;
    default: // rebanada (hp)
      rect(ctx, bx + 2, by + 3, 12, 2, '#d4a574');
      rect(ctx, bx + 1, by + 5, 14, 8, '#e8c99b');
      rect(ctx, bx + 2, by + 13, 12, 2, '#d4a574');
      rect(ctx, bx + 1, by + 5, 1, 8, '#a67c52');
      rect(ctx, bx + 14, by + 5, 1, 8, '#a67c52');
      break;
  }
  ctx.restore();
}

/** Pato con skin cosmética (paleta + accesorio) */
export function drawDuckSkin(
  ctx: Ctx, x: number, y: number, frame: number,
  skinId: string, dir: DuckDir = 'down', moving = false, hurt = false,
  dashing = false, shooting = false, dead = false,
) {
  const skin = getSkin(skinId);
  const pal: DuckPaletteLike = skin?.palette ?? DEFAULT_DUCK;
  drawDuck(ctx, x, y, frame, dir, moving, hurt, dashing, shooting, dead, pal);
  if (!skin || skin.overlay === 'none' || dead) return;

  const bx = Math.floor(x);
  const by = Math.floor(y);
  ctx.save();
  switch (skin.overlay) {
    case 'fedora':
      // Sombrero fedora oscuro con cinta roja
      rect(ctx, bx + 1, by - 1, 14, 2, '#12121a');
      rect(ctx, bx + 4, by - 4, 8, 4, '#1b1b24');
      rect(ctx, bx + 4, by - 1, 8, 1, '#c0392b');
      // Cadena dorada
      rect(ctx, bx + 4, by + 10, 8, 1, '#f4d03f');
      rect(ctx, bx + 7, by + 11, 2, 2, '#f4d03f');
      break;

    case 'prison':
      // Mono naranja con rayas blancas
      rect(ctx, bx + 3, by + 7, 10, 8, '#f0912b');
      rect(ctx, bx + 4, by + 8, 8, 1, '#ffffff');
      rect(ctx, bx + 4, by + 11, 8, 1, '#ffffff');
      rect(ctx, bx + 4, by + 13, 8, 1, '#ffffff');
      break;

    case 'chef':
      // Gran gorro de chef blanco con pliegues
      rect(ctx, bx + 2, by - 2, 12, 3, '#e0e0e0');
      rect(ctx, bx + 3, by - 7, 10, 6, '#f8f8f8');
      rect(ctx, bx + 5, by - 9, 6, 3, '#ffffff');
      rect(ctx, bx + 4, by - 6, 2, 4, '#d0d0d0');
      rect(ctx, bx + 8, by - 6, 2, 4, '#d0d0d0');
      // Delantal blanco frontal
      rect(ctx, bx + 3, by + 7, 10, 8, '#f0f0f0');
      rect(ctx, bx + 4, by + 8, 8, 6, '#ffffff');
      rect(ctx, bx + 5, by + 6, 6, 2, '#c0c0c0'); // tirantes
      break;

    case 'executive':
      // Cuello de camisa, corbata roja y maletín ejecutivo
      rect(ctx, bx + 5, by + 6, 6, 3, '#ffffff');
      rect(ctx, bx + 7, by + 7, 2, 7, '#c0392b');
      rect(ctx, bx + 8, by + 14, 1, 1, '#c0392b');
      // Maletín en la mano
      rect(ctx, bx + 13, by + 8, 5, 5, '#4a3020');
      rect(ctx, bx + 14, by + 7, 3, 1, '#8a6545');
      px(ctx, bx + 15, by + 10, '#f4d03f', 1);
      break;

    case 'ninja':
      // Capucha ninja negra + cinta roja en la frente con lazos
      rect(ctx, bx + 3, by, 10, 3, '#14161d');
      rect(ctx, bx + 4, by + 3, 8, 2, '#c0392b');
      rect(ctx, bx + 12, by + 3, 3, 2, '#e74c3c');
      rect(ctx, bx + 14, by + 5, 2, 3, '#c0392b');
      break;

    case 'undercover':
      // Gorra de policía azul + bigote falso cómico
      rect(ctx, bx + 2, by - 1, 12, 3, '#2b4a8b');
      rect(ctx, bx + 4, by - 3, 8, 3, '#1b2f5c');
      px(ctx, bx + 7, by - 1, '#f4d03f', 2);
      rect(ctx, bx + 12, by + 1, 3, 1, '#111118');
      // Bigotón negro debajo del pico
      rect(ctx, bx + 4, by + 7, 8, 2, '#1a1a24');
      rect(ctx, bx + 3, by + 8, 2, 2, '#1a1a24');
      rect(ctx, bx + 11, by + 8, 2, 2, '#1a1a24');
      break;

    case 'pirate':
      // Sombrero pirata bicornio con calavera + parche en el ojo
      rect(ctx, bx + 1, by - 3, 14, 4, '#1a1618');
      rect(ctx, bx + 3, by - 6, 10, 4, '#241f22');
      rect(ctx, bx, by - 4, 3, 3, '#1a1618');
      rect(ctx, bx + 13, by - 4, 3, 3, '#1a1618');
      px(ctx, bx + 7, by - 3, '#ffffff', 2); // calavera
      // Parche en el ojo
      rect(ctx, bx + 4, by + 3, 3, 3, '#08080c');
      rect(ctx, bx + 3, by + 2, 6, 1, '#08080c');
      break;

    case 'gold':
      // Corona de oro puro + destellos dorados
      rect(ctx, bx + 4, by - 3, 8, 3, '#ffd95e');
      rect(ctx, bx + 4, by - 5, 2, 3, '#f4a72b');
      rect(ctx, bx + 7, by - 6, 2, 4, '#fff3b0');
      rect(ctx, bx + 10, by - 5, 2, 3, '#f4a72b');
      px(ctx, bx + 5, by - 2, '#ffffff', 1);
      px(ctx, bx + 9, by - 2, '#ffffff', 1);
      break;

    case 'king':
      // Corona de rey con joyas + capa real púrpura con ribete de armiño
      rect(ctx, bx + 3, by - 4, 10, 4, '#ffd95e');
      rect(ctx, bx + 3, by - 7, 2, 4, '#ffd95e');
      rect(ctx, bx + 7, by - 8, 2, 5, '#fff3b0');
      rect(ctx, bx + 11, by - 7, 2, 4, '#ffd95e');
      px(ctx, bx + 5, by - 2, '#ff3b56', 2); // rubí
      px(ctx, bx + 9, by - 2, '#4f9dd8', 2); // zafiro
      // Capa real
      rect(ctx, bx + 2, by + 7, 12, 9, '#7a1424');
      rect(ctx, bx + 3, by + 6, 10, 2, '#f5f5f5'); // cuello de armiño
      px(ctx, bx + 5, by + 7, '#000', 1);
      px(ctx, bx + 9, by + 7, '#000', 1);
      break;

    case 'space_green':{const hy=by+2+(moving?Math.round(Math.sin(frame*.35)):0);if(dir==='left'){rect(ctx,bx-2,hy-6,16,12,'#33442d');rect(ctx,bx,hy-8,11,3,'#52683a');rect(ctx,bx-2,hy-2,9,5,'#b97928');rect(ctx,bx-2,hy-1,8,2,'#f3bd56');rect(ctx,bx+6,hy-2,7,6,'#202a24');}else if(dir==='right'){rect(ctx,bx+2,hy-6,16,12,'#33442d');rect(ctx,bx+5,hy-8,11,3,'#52683a');rect(ctx,bx+9,hy-2,9,5,'#b97928');rect(ctx,bx+10,hy-1,8,2,'#f3bd56');rect(ctx,bx+3,hy-2,7,6,'#202a24');}else if(dir==='up'){rect(ctx,bx+1,hy-7,14,13,'#33442d');rect(ctx,bx+3,hy-9,10,3,'#52683a');rect(ctx,bx+3,hy-3,10,5,'#202a24');rect(ctx,bx+5,hy-2,6,2,'#657b46');}else{rect(ctx,bx+1,hy-7,14,13,'#33442d');rect(ctx,bx+3,hy-9,10,3,'#52683a');rect(ctx,bx+2,hy-2,12,5,'#b97928');rect(ctx,bx+3,hy-1,10,2,'#f3bd56');}rect(ctx,bx+1,by+7,14,8,'#465b34');rect(ctx,bx+3,by+6,10,3,'#617642');rect(ctx,bx+4,by+9,8,5,'#2b3728');rect(ctx,bx,by+8,4,6,'#38482e');rect(ctx,bx+12,by+8,4,6,'#38482e');rect(ctx,bx+7,by+11,2,2,'#f4d03f');break;}
    default: break;
  }
  ctx.restore();
}



export function drawBreadHP(ctx: Ctx, x: number, y: number, filled: boolean) {
  const bx = Math.floor(x);
  const by = Math.floor(y);
  
  if (filled) {
    // Bread slice
    rect(ctx, bx + 1, by, 10, 2, '#d4a574');
    rect(ctx, bx, by + 2, 12, 8, '#e8c99b');
    rect(ctx, bx + 1, by + 10, 10, 2, '#d4a574');
    // Crust
    rect(ctx, bx, by + 2, 1, 8, '#a67c52');
    rect(ctx, bx + 11, by + 2, 1, 8, '#a67c52');
    // Inner bread texture
    rect(ctx, bx + 3, by + 4, 2, 1, '#d4a574');
    rect(ctx, bx + 7, by + 6, 2, 1, '#d4a574');
  } else {
    // Empty bread (darker, crumbly)
    rect(ctx, bx + 1, by, 10, 2, '#3a3a3a');
    rect(ctx, bx, by + 2, 12, 8, '#4a4a4a');
    rect(ctx, bx + 1, by + 10, 10, 2, '#3a3a3a');
    rect(ctx, bx, by + 2, 1, 8, '#2a2a2a');
    rect(ctx, bx + 11, by + 2, 1, 8, '#2a2a2a');
  }
}

export function drawSecurityPigeon(ctx: Ctx, x: number, y: number, frame: number, hurt: boolean) {
  const bx = Math.floor(x);
  const by = Math.floor(y);
  const bob = Math.sin(frame * 0.15) * 1;
  
  if (hurt && Math.floor(frame) % 2 === 0) {
    ctx.globalAlpha = 0.6;
  }
  
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(bx + 8, by + 17, 6, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Body
  rect(ctx, bx + 4, by + 6 + bob, 8, 9, '#8e8e8e');
  rect(ctx, bx + 3, by + 8 + bob, 10, 5, '#9e9e9e');
  
  // Head
  rect(ctx, bx + 4, by + 2 + bob, 7, 5, '#a0a0a0');
  
  // Eyes
  px(ctx, bx + 5, by + 3 + bob, '#cc3333', 2);
  px(ctx, bx + 9, by + 3 + bob, '#cc3333', 2);
  
  // Beak
  rect(ctx, bx + 6, by + 5 + bob, 3, 2, '#d4a574');
  
  // Security hat
  rect(ctx, bx + 3, by + 1 + bob, 9, 2, '#1a237e');
  rect(ctx, bx + 5, by + 0 + bob, 5, 1, '#1a237e');
  // Badge
  px(ctx, bx + 7, by + 1 + bob, '#f4d03f', 1);
  
  // Feet
  rect(ctx, bx + 4, by + 15, 3, 2, '#bf6060');
  rect(ctx, bx + 9, by + 15, 3, 2, '#bf6060');
  
  ctx.globalAlpha = 1;
}

export function drawGuardGoose(ctx: Ctx, x: number, y: number, frame: number, hurt: boolean) {
  const bx = Math.floor(x);
  const by = Math.floor(y);
  const bob = Math.sin(frame * 0.2) * 1;
  
  if (hurt && Math.floor(frame) % 2 === 0) {
    ctx.globalAlpha = 0.6;
  }
  
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(bx + 10, by + 22, 8, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Body (larger than pigeon)
  rect(ctx, bx + 4, by + 10 + bob, 12, 10, '#f0f0f0');
  rect(ctx, bx + 3, by + 12 + bob, 14, 6, '#e8e8e8');
  
  // Neck
  rect(ctx, bx + 7, by + 4 + bob, 6, 8, '#f0f0f0');
  
  // Head
  rect(ctx, bx + 5, by + 1 + bob, 8, 5, '#f0f0f0');
  
  // Mean eyes
  px(ctx, bx + 6, by + 2 + bob, '#0a0a0a', 2);
  px(ctx, bx + 10, by + 2 + bob, '#0a0a0a', 2);
  // Angry eyebrows
  rect(ctx, bx + 5, by + 1 + bob, 3, 1, '#333');
  rect(ctx, bx + 10, by + 1 + bob, 3, 1, '#333');
  
  // Beak
  rect(ctx, bx + 13, by + 3 + bob, 5, 3, '#e67e22');
  rect(ctx, bx + 14, by + 5 + bob, 4, 1, '#d35400');
  
  // Security vest
  rect(ctx, bx + 5, by + 11 + bob, 10, 6, '#1a237e');
  px(ctx, bx + 9, by + 12 + bob, '#f4d03f', 2);
  
  // Feet
  rect(ctx, bx + 5, by + 20, 4, 2, '#e67e22');
  rect(ctx, bx + 11, by + 20, 4, 2, '#e67e22');
  
  ctx.globalAlpha = 1;
}

export function drawToasterTurret(ctx: Ctx, x: number, y: number, frame: number, hurt: boolean) {
  const bx = Math.floor(x);
  const by = Math.floor(y);
  
  if (hurt && Math.floor(frame) % 2 === 0) {
    ctx.globalAlpha = 0.6;
  }
  
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(bx + 10, by + 20, 8, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Body
  rect(ctx, bx + 2, by + 4, 16, 14, '#8e8e8e');
  rect(ctx, bx + 3, by + 3, 14, 1, '#7e7e7e');
  
  // Slots (glow)
  const glow = Math.sin(frame * 0.1) * 0.3 + 0.7;
  ctx.globalAlpha = glow;
  rect(ctx, bx + 5, by + 2, 4, 4, '#e74c3c');
  rect(ctx, bx + 11, by + 2, 4, 4, '#e74c3c');
  ctx.globalAlpha = hurt && Math.floor(frame) % 2 === 0 ? 0.6 : 1;
  
  // Chrome details
  rect(ctx, bx + 2, by + 10, 16, 1, '#b0b0b0');
  rect(ctx, bx + 7, by + 12, 6, 3, '#606060');
  
  // Lever
  rect(ctx, bx + 17, by + 8, 2, 5, '#606060');
  rect(ctx, bx + 16, by + 7, 4, 2, '#707070');
  
  ctx.globalAlpha = 1;
}

export function drawRollingBagel(ctx: Ctx, x: number, y: number, frame: number, hurt: boolean) {
  const bx = Math.floor(x);
  const by = Math.floor(y);
  const rot = frame * 0.1;
  
  if (hurt && Math.floor(frame) % 2 === 0) {
    ctx.globalAlpha = 0.6;
  }
  
  ctx.save();
  ctx.translate(bx + 8, by + 8);
  ctx.rotate(rot);
  
  // Outer bagel
  ctx.fillStyle = '#d4a574';
  ctx.beginPath();
  ctx.arc(0, 0, 8, 0, Math.PI * 2);
  ctx.fill();
  
  // Inner hole
  ctx.fillStyle = COLORS.floor;
  ctx.beginPath();
  ctx.arc(0, 0, 3, 0, Math.PI * 2);
  ctx.fill();
  
  // Sesame seeds
  ctx.fillStyle = '#f5e6ca';
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    px(ctx, Math.cos(a) * 6 - 1, Math.sin(a) * 6 - 1, '#f5e6ca', 2);
  }
  
  ctx.restore();
  ctx.globalAlpha = 1;
}

export function drawProjectile(ctx: Ctx, x: number, y: number, type: string, frame: number) {
  const bx = Math.floor(x);
  const by = Math.floor(y);
  
  switch (type) {
    case 'quack': case 'quack_power': {
      const big = type === 'quack_power';
      ctx.fillStyle = 'rgba(249,229,71,.25)';
      ctx.beginPath(); ctx.arc(bx, by, big ? 7 : 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = big ? '#fff3b0' : '#f9e547';
      ctx.beginPath(); ctx.arc(bx, by, big ? 4 : 3, 0, Math.PI * 2); ctx.fill();
      px(ctx, bx - 1, by - 1, '#fff', 2);
      break;
    }
    case 'breadcrumb': {
      rect(ctx, bx - 2, by - 1, 4, 3, '#a67c52');
      rect(ctx, bx - 1, by - 1, 3, 2, '#e8c99b');
      px(ctx, bx, by, '#fff0c8', 1);
      break;
    }
    case 'baguette': {
      ctx.save(); ctx.translate(bx, by); ctx.rotate(frame * 0.2);
      rect(ctx, -7, -2, 14, 5, '#a67c52'); rect(ctx, -6, -1, 12, 3, '#e8c99b');
      rect(ctx, -4, 0, 3, 1, '#d4a574'); ctx.restore();
      break;
    }
    case 'rubber_duck': {
      ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(bx - 3, by + 3, 7, 2);
      rect(ctx, bx - 3, by - 2, 7, 5, '#f9e547'); rect(ctx, bx + 2, by - 1, 4, 2, '#e67e22');
      px(ctx, bx - 1, by - 1, '#0a0a0a', 1); px(ctx, bx, by + 1, '#fff59d', 1);
      break;
    }
    case 'feather': {
      ctx.fillStyle = '#f0f0f0';
      ctx.beginPath();
      ctx.ellipse(bx, by, 4, 1.5, frame * 0.3, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'golden_egg': case 'golden_egg_charged': {
      ctx.fillStyle = '#f4d03f';
      ctx.beginPath();
      ctx.ellipse(bx, by, 3, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff8dc';
      ctx.beginPath();
      ctx.arc(bx - 1, by - 1, 1, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'bread_boomerang': {
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(frame * 0.4);
      rect(ctx, -5, -1, 10, 3, '#d4a574');
      rect(ctx, -4, -2, 2, 5, '#d4a574');
      rect(ctx, 2, -2, 2, 5, '#d4a574');
      ctx.restore();
      break;
    }
    case 'quack_laser': {
      ctx.fillStyle = `rgba(249,229,71,${.45 + Math.sin(frame * .3) * .25})`;
      ctx.beginPath(); ctx.arc(bx, by, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff8c4'; ctx.fillRect(bx - 1, by - 1, 2, 2);
      break;
    }
    case 'homing_crumb': {
      rect(ctx, bx - 2, by - 2, 4, 4, '#d4a574'); px(ctx, bx, by, '#fff0c8', 1);
      break;
    }
    case 'egg_shell': case 'yolk': {
      ctx.fillStyle = type === 'yolk' ? '#f4d03f' : '#f5e6ca';
      ctx.beginPath(); ctx.ellipse(bx, by, 3, 4, 0, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'sniper_baguette': {
      rect(ctx, bx - 5, by - 1, 10, 2, '#e8c99b'); rect(ctx, bx - 4, by, 8, 1, '#a67c52');
      break;
    }
    case 'plasma_bread': {
      ctx.fillStyle = 'rgba(176,111,232,.35)'; ctx.beginPath(); ctx.arc(bx, by, 6, 0, Math.PI * 2); ctx.fill();
      rect(ctx, bx - 3, by - 2, 6, 4, '#c58ae8');
      break;
    }
    case 'toast_stick': {
      rect(ctx, bx - 3, by - 3, 6, 7, '#8B4513'); px(ctx, bx - 1, by - 4, '#e74c3c', 2);
      break;
    }
    case 'butter_glob': {ctx.fillStyle='rgba(255,217,90,.28)';ctx.beginPath();ctx.arc(bx,by,5,0,Math.PI*2);ctx.fill();rect(ctx,bx-3,by-2,6,5,'#ffd95a');px(ctx,bx-1,by-1,'#fff3b0',2);break;}
    case 'croissant_blade': {ctx.save();ctx.translate(bx,by);ctx.rotate(frame*.42);ctx.fillStyle='#e8b45f';ctx.beginPath();ctx.arc(0,0,5,-1.2,1.2);ctx.lineWidth=3;ctx.strokeStyle='#e8c99b';ctx.stroke();rect(ctx,-1,-1,2,2,'#fff0c8');ctx.restore();break;}
    case 'drill_bit': {ctx.save();ctx.translate(bx,by);ctx.rotate(frame*.7);rect(ctx,-5,-2,8,4,'#8fa4b3');rect(ctx,2,-1,5,2,'#dfe6ee');px(ctx,-3,-1,'#6fc5d8',2);ctx.restore();break;}
    case 'receipt': {ctx.save();ctx.translate(bx,by);ctx.rotate(Math.atan2(Math.sin(frame*.22),3));rect(ctx,-4,-2,8,4,'#f2f0df');rect(ctx,-2,-1,4,1,'#71858b');px(ctx,2,1,'#e1b64b',1);ctx.restore();break;}
    case 'coin_proj': {
      ctx.fillStyle = '#f4d03f';
      ctx.beginPath();
      ctx.arc(bx, by, 3, 0, Math.PI * 2);
      ctx.fill();
      px(ctx, bx - 1, by - 1, '#d4a017', 2);
      break;
    }
    case 'toast': {
      rect(ctx, bx - 3, by - 3, 6, 7, '#8B4513');
      rect(ctx, bx - 2, by - 2, 4, 5, '#a0522d');
      // Fire effect
      if (frame % 3 === 0) {
        px(ctx, bx - 2, by - 4, '#e74c3c', 2);
        px(ctx, bx + 1, by - 3, '#f39c12', 2);
      }
      break;
    }
    case 'enemy_bullet': {
      ctx.fillStyle = '#e74c3c';
      ctx.beginPath();
      ctx.arc(bx, by, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff6b6b';
      ctx.beginPath();
      ctx.arc(bx, by, 1.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'pistol': { // bala de policía
      ctx.fillStyle = 'rgba(120,160,255,0.35)';
      ctx.fillRect(bx - 4, by - 1, 8, 2);
      rect(ctx, bx - 2, by - 2, 4, 4, '#dfe6ee');
      rect(ctx, bx - 1, by - 1, 2, 2, '#7fb3d5');
      break;
    }
    case 'buckshot': { // perdigón de escopeta
      rect(ctx, bx - 2, by - 2, 4, 4, '#ffb74d');
      rect(ctx, bx - 1, by - 1, 2, 2, '#fff3b0');
      ctx.globalAlpha = 0.4;
      rect(ctx, bx - 4, by - 1, 3, 2, '#ff9f43');
      ctx.globalAlpha = 1;
      break;
    }
    case 'drone_shot': { // láser del dron
      ctx.fillStyle = 'rgba(255,59,48,0.3)';
      ctx.fillRect(bx - 5, by - 2, 10, 4);
      rect(ctx, bx - 3, by - 1, 6, 2, '#ff3b30');
      rect(ctx, bx - 1, by - 1, 2, 2, '#ffd9d6');
      break;
    }
    case 'briefcase': {
      rect(ctx, bx - 4, by - 3, 8, 6, '#5d4037');
      rect(ctx, bx - 3, by - 2, 6, 4, '#795548');
      rect(ctx, bx - 1, by - 3, 2, 1, '#424242');
      px(ctx, bx, by, '#f4d03f', 2);
      break;
    }
    case 'dough_ball': {
      ctx.fillStyle = '#e8c99b';
      ctx.beginPath();
      ctx.arc(bx, by, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#d4a574';
      ctx.beginPath();
      ctx.arc(bx + 1, by + 1, 3, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    default:{let h=0;for(let i=0;i<type.length;i++)h=(h*31+type.charCodeAt(i))|0;const cs=['#f4d03f','#61c7dd','#9ad27d','#e87068','#b58bdd','#f0a45b','#d8e0e8'];ctx.fillStyle=cs[Math.abs(h)%cs.length];if(type==='black_crumb'){ctx.fillStyle='rgba(120,78,170,.25)';ctx.beginPath();ctx.arc(bx,by,8,0,Math.PI*2);ctx.fill();ctx.fillStyle='#08090d';ctx.beginPath();ctx.arc(bx,by,4,0,Math.PI*2);ctx.fill();}else if(type==='vault_magnet_orb'){ctx.globalAlpha=.32;ctx.beginPath();ctx.arc(bx,by,8,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;rect(ctx,bx-3,by-3,2,6,'#e8574f');rect(ctx,bx+1,by-3,2,6,'#4b9db5');}else if(type==='orbit_duck'){rect(ctx,bx-3,by-1,6,4,'#ffd95e');rect(ctx,bx+2,by,3,2,'#f0912b');px(ctx,bx,by-1,'#15151f',1);}else if((Math.abs(h)>>3)%2)rect(ctx,bx-4,by-1,8,3,ctx.fillStyle as string);else{ctx.beginPath();ctx.arc(bx,by,3+(Math.abs(h)%2),0,Math.PI*2);ctx.fill();}}
  }
}

export function drawCoin(ctx: Ctx, x: number, y: number, frame: number, golden: boolean = false) {
  const bx = Math.floor(x);
  const by = Math.floor(y);
  const bounce = Math.abs(Math.sin(frame * 0.08)) * 2;
  
  ctx.fillStyle = golden ? '#f4d03f' : '#e8c99b';
  ctx.beginPath();
  ctx.arc(bx, by - bounce, golden ? 5 : 4, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = golden ? '#d4a017' : '#d4a574';
  ctx.beginPath();
  ctx.arc(bx, by - bounce, golden ? 3 : 2.5, 0, Math.PI * 2);
  ctx.fill();
  
  // Sparkle
  if (golden && frame % 20 < 5) {
    px(ctx, bx + 3, by - bounce - 3, '#fff', 1);
  }
}

export function drawChest(ctx: Ctx, x: number, y: number, opened: boolean, frame: number) {
  const bx = Math.floor(x);
  const by = Math.floor(y);
  
  if (!opened) {
    // Closed chest
    rect(ctx, bx, by + 4, 20, 12, '#8B4513');
    rect(ctx, bx + 1, by + 5, 18, 10, '#a0522d');
    rect(ctx, bx, by, 20, 6, '#6d3a1f');
    rect(ctx, bx + 1, by + 1, 18, 4, '#7d4a2f');
    // Lock
    rect(ctx, bx + 8, by + 3, 4, 4, '#f4d03f');
    px(ctx, bx + 9, by + 5, '#d4a017', 2);
    // Sparkle
    if (frame % 30 < 5) {
      px(ctx, bx + 16, by - 2, '#f4d03f', 2);
    }
  } else {
    // Open chest
    rect(ctx, bx, by + 8, 20, 8, '#8B4513');
    rect(ctx, bx + 1, by + 9, 18, 6, '#a0522d');
    // Lid (open)
    rect(ctx, bx, by + 2, 20, 6, '#6d3a1f');
    // Glowing inside
    rect(ctx, bx + 2, by + 9, 16, 4, '#f4d03f');
    rect(ctx, bx + 4, by + 10, 12, 2, '#fff8dc');
  }
}

export function drawBoss(ctx: Ctx, x: number, y: number, bossType: string, frame: number, hp: number, maxHp: number, hurt: boolean) {
  const bx = Math.floor(x);
  const by = Math.floor(y);
  
  if (hurt && Math.floor(frame) % 2 === 0) {
    ctx.globalAlpha = 0.5;
  }
  
  if (bossType === 'captain_honk') {
    // Large armored goose
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(bx + 16, by + 38, 14, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Body
    rect(ctx, bx + 4, by + 16, 24, 20, '#e0e0e0');
    rect(ctx, bx + 2, by + 20, 28, 12, '#d0d0d0');
    
    // Armor
    rect(ctx, bx + 3, by + 18, 26, 14, '#1a237e');
    rect(ctx, bx + 6, by + 20, 20, 8, '#283593');
    // Badge
    rect(ctx, bx + 13, by + 22, 6, 6, '#f4d03f');
    
    // Neck
    rect(ctx, bx + 10, by + 6, 12, 12, '#f0f0f0');
    
    // Head
    rect(ctx, bx + 6, by + 0, 18, 10, '#f0f0f0');
    rect(ctx, bx + 8, by - 2, 14, 4, '#f0f0f0');
    
    // Helmet
    rect(ctx, bx + 5, by - 3, 20, 5, '#1a237e');
    rect(ctx, bx + 7, by - 4, 16, 2, '#283593');
    
    // Angry eyes
    px(ctx, bx + 10, by + 2, '#e74c3c', 3);
    px(ctx, bx + 18, by + 2, '#e74c3c', 3);
    
    // Beak
    rect(ctx, bx + 24, by + 4, 8, 4, '#e67e22');
    rect(ctx, bx + 25, by + 7, 6, 2, '#d35400');
    
    // Feet
    rect(ctx, bx + 6, by + 36, 6, 3, '#e67e22');
    rect(ctx, bx + 20, by + 36, 6, 3, '#e67e22');
  } else if (bossType === 'toaster_9000') {
    // Massive toaster
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(bx + 20, by + 42, 18, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Main body
    rect(ctx, bx, by + 8, 40, 30, '#707070');
    rect(ctx, bx + 2, by + 10, 36, 26, '#8e8e8e');
    
    // Slots with fire
    const glow = Math.sin(frame * 0.15) * 0.4 + 0.6;
    ctx.globalAlpha = glow * (hurt && Math.floor(frame) % 2 === 0 ? 0.5 : 1);
    rect(ctx, bx + 5, by + 2, 8, 10, '#e74c3c');
    rect(ctx, bx + 17, by + 2, 8, 10, '#e74c3c');
    rect(ctx, bx + 29, by + 2, 8, 10, '#f39c12');
    ctx.globalAlpha = hurt && Math.floor(frame) % 2 === 0 ? 0.5 : 1;
    
    // Eyes (evil)
    rect(ctx, bx + 8, by + 18, 8, 6, '#e74c3c');
    rect(ctx, bx + 24, by + 18, 8, 6, '#e74c3c');
    // Pupils
    const px2 = Math.sin(frame * 0.05) * 2;
    rect(ctx, bx + 10 + px2, by + 20, 4, 3, '#8B0000');
    rect(ctx, bx + 26 + px2, by + 20, 4, 3, '#8B0000');
    
    // Evil mouth
    rect(ctx, bx + 12, by + 28, 16, 4, '#333');
    for (let i = 0; i < 4; i++) {
      rect(ctx, bx + 14 + i * 4, by + 28, 2, 2, '#aaa');
    }
    
    // Chrome details
    rect(ctx, bx, by + 16, 40, 2, '#b0b0b0');
    rect(ctx, bx, by + 32, 40, 2, '#b0b0b0');
  } else if (bossType === 'bread_banker') {
    // Enormous wealthy duck
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(bx + 20, by + 44, 16, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Body
    rect(ctx, bx + 4, by + 18, 32, 24, '#333');
    rect(ctx, bx + 6, by + 20, 28, 20, '#2c2c2c');
    
    // Suit details
    rect(ctx, bx + 18, by + 20, 4, 18, '#f4d03f'); // tie
    rect(ctx, bx + 8, by + 22, 24, 2, '#f4d03f'); // collar
    
    // Head (bigger duck)
    rect(ctx, bx + 6, by + 4, 24, 16, '#f9e547');
    rect(ctx, bx + 8, by + 2, 20, 4, '#f9e547');
    
    // Top hat (golden)
    rect(ctx, bx + 4, by - 4, 28, 4, '#333');
    rect(ctx, bx + 8, by - 14, 20, 12, '#333');
    rect(ctx, bx + 10, by - 12, 16, 8, '#444');
    // Gold band
    rect(ctx, bx + 8, by - 6, 20, 3, '#f4d03f');
    
    // Monocle
    ctx.strokeStyle = '#f4d03f';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(bx + 24, by + 10, 4, 0, Math.PI * 2);
    ctx.stroke();
    
    // Eyes
    px(ctx, bx + 12, by + 8, '#0a0a0a', 3);
    px(ctx, bx + 22, by + 8, '#0a0a0a', 3);
    
    // Beak
    rect(ctx, bx + 28, by + 12, 8, 4, '#e67e22');
    
    // Cigar
    rect(ctx, bx + 30, by + 14, 8, 2, '#8B4513');
    if (frame % 10 < 5) {
      px(ctx, bx + 37, by + 12, '#aaa', 2);
    }
    
    // Feet
    rect(ctx, bx + 8, by + 42, 6, 3, '#e67e22');
    rect(ctx, bx + 24, by + 42, 6, 3, '#e67e22');
  } else if (bossType === 'tax_collector') {
    // Large angry goose in suit
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(bx + 12, by + 28, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Body/Suit
    rect(ctx, bx + 2, by + 12, 20, 14, '#2c3e50');
    rect(ctx, bx + 4, by + 14, 16, 10, '#34495e');
    
    // Tie
    rect(ctx, bx + 10, by + 14, 4, 10, '#c0392b');
    
    // Neck
    rect(ctx, bx + 7, by + 6, 10, 8, '#f0f0f0');
    
    // Head
    rect(ctx, bx + 4, by + 0, 14, 8, '#f0f0f0');
    
    // Angry eyes
    px(ctx, bx + 6, by + 3, '#e74c3c', 2);
    px(ctx, bx + 13, by + 3, '#e74c3c', 2);
    
    // Beak
    rect(ctx, bx + 17, by + 4, 6, 3, '#e67e22');
    
    // Briefcase
    rect(ctx, bx + 20, by + 16, 8, 6, '#5d4037');
    rect(ctx, bx + 22, by + 15, 4, 1, '#424242');
    
    // Feet
    rect(ctx, bx + 4, by + 26, 5, 2, '#e67e22');
    rect(ctx, bx + 14, by + 26, 5, 2, '#e67e22');
  } else if (bossType === 'head_baker') {
    // Baker enemy
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(bx + 12, by + 28, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Body/Apron
    rect(ctx, bx + 2, by + 12, 20, 14, '#ecf0f1');
    rect(ctx, bx + 4, by + 14, 16, 10, '#bdc3c7');
    
    // Apron strings
    rect(ctx, bx + 9, by + 14, 6, 10, '#f5f5f5');
    
    // Head
    rect(ctx, bx + 4, by + 2, 14, 10, '#d4a574');
    
    // Chef hat
    rect(ctx, bx + 2, by - 2, 18, 5, '#ecf0f1');
    rect(ctx, bx + 4, by - 8, 14, 8, '#f5f5f5');
    
    // Mean eyes
    px(ctx, bx + 6, by + 5, '#333', 2);
    px(ctx, bx + 13, by + 5, '#333', 2);
    
    // Mustache
    rect(ctx, bx + 7, by + 8, 3, 2, '#5d4037');
    rect(ctx, bx + 12, by + 8, 3, 2, '#5d4037');
    
    // Hands holding rolling pin
    rect(ctx, bx - 2, by + 14, 5, 3, '#d4a574');
    rect(ctx, bx + 20, by + 14, 5, 3, '#d4a574');
    rect(ctx, bx - 4, by + 15, 30, 2, '#8B4513');
    
    // Feet
    rect(ctx, bx + 4, by + 26, 5, 2, '#333');
    rect(ctx, bx + 14, by + 26, 5, 2, '#333');
  } else if (bossType === 'comisario_pico_duro' || bossType === 'sargento_migajas') {
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(bx + 16, by + 34, 14, 5, 0, 0, Math.PI * 2); ctx.fill();
    rect(ctx, bx + 4, by + 14, 24, 18, '#1b2f5c'); rect(ctx, bx + 8, by + 2, 16, 12, '#f9e547');
    rect(ctx, bx + 6, by - 2, 20, 5, '#253747'); rect(ctx, bx + 22, by + 6, 8, 4, '#e67e22');
    rect(ctx, bx + 12, by + 18, 8, 6, '#c5ad6d'); px(ctx, bx + 10, by + 6, '#0a0a0a', 2); px(ctx, bx + 16, by + 6, '#0a0a0a', 2);
  } else if (bossType === 'general_ganso' || bossType === 'ganso_antidisturbios') {
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(bx + 16, by + 36, 15, 5, 0, 0, Math.PI * 2); ctx.fill();
    rect(ctx, bx + 2, by + 14, 28, 18, '#e8e8e8'); rect(ctx, bx + 4, by + 16, 24, 12, '#2b4a8b');
    rect(ctx, bx + 8, by + 2, 16, 14, '#f0f0f0'); rect(ctx, bx + 22, by + 6, 10, 4, '#e67e22');
    rect(ctx, bx + 24, by + 16, 10, 16, '#8a94a0');
  } else if (bossType === 'don_levadura' || bossType === 'panadero_loco') {
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(bx + 16, by + 36, 14, 5, 0, 0, Math.PI * 2); ctx.fill();
    rect(ctx, bx + 4, by + 12, 26, 20, '#d4a574'); rect(ctx, bx + 8, by + 16, 18, 12, '#e8c99b');
    rect(ctx, bx + 6, by + 0, 20, 12, '#ecf0f1'); px(ctx, bx + 10, by + 6, '#8B0000', 3); px(ctx, bx + 18, by + 6, '#8B0000', 3);
  } else if (bossType === 'director_seguridad' || bossType === 'dron_centinela') {
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(bx + 18, by + 36, 16, 5, 0, 0, Math.PI * 2); ctx.fill();
    rect(ctx, bx + 4, by + 8, 28, 20, '#4a5c68'); rect(ctx, bx + 8, by + 12, 20, 10, '#173d4c');
    rect(ctx, bx + 10, by + 14, 6, 4, '#ef7768'); rect(ctx, bx + 20, by + 14, 6, 4, '#ef7768');
    rect(ctx, bx + 2, by + 16, 6, 3, '#93aaa6'); rect(ctx, bx + 28, by + 16, 6, 3, '#93aaa6');
  } else if (bossType === 'el_auditor' || bossType === 'cajero_3000') {
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(bx + 16, by + 34, 14, 5, 0, 0, Math.PI * 2); ctx.fill();
    rect(ctx, bx + 4, by + 10, 24, 20, '#4a5c68'); rect(ctx, bx + 8, by + 14, 16, 8, '#8cc9b0');
    rect(ctx, bx + 10, by + 16, 12, 4, '#c5ad6d'); rect(ctx, bx + 20, by + 20, 10, 8, '#5d4037');
  }
  
  // La barra de vida del jefe se dibuja en la capa de UI (nítida)
  ctx.globalAlpha = 1;
  void hp; void maxHp;
}

/**
 * Puerta de banco pixel-art.
 * style: 'silver' (normal) | 'gold' (sala de objeto) | 'boss'
 * openAmount: 0 = cerrada del todo, 1 = abierta (hojas retiradas)
 */
export type DoorStyle = 'silver' | 'gold' | 'green' | 'orange' | 'boss' | 'purple';

export function drawDoor(
  ctx: Ctx, tileX: number, tileY: number, dir: 'N' | 'S' | 'E' | 'W',
  style: DoorStyle, locked: boolean, openAmount: number, frame: number,
) {
  const bx = Math.floor(tileX);
  const by = Math.floor(tileY);
  const T = TILE_SIZE;
  const horizontal = dir === 'N' || dir === 'S';

  let pal = { frame: '#3a4048', metal: '#b9c2cc', light: '#e6ecf2', dark: '#6c7684', bolt: '#dfe6ee' };
  if (style === 'gold') {
    pal = { frame: '#7a5a10', metal: '#f4d03f', light: '#fff3b0', dark: '#b8860b', bolt: '#fff8dc' };
  } else if (style === 'green') {
    pal = { frame: '#144528', metal: '#2ecc71', light: '#a3f0c2', dark: '#1b8a47', bolt: '#d4fae3' };
  } else if (style === 'orange') {
    pal = { frame: '#5e320d', metal: '#f39c12', light: '#ffd591', dark: '#b86c07', bolt: '#ffeed1' };
  } else if (style === 'boss') {
    pal = { frame: '#3a1414', metal: '#8e2323', light: '#e66060', dark: '#4a0f0f', bolt: '#ff9999' };
  } else if (style === 'purple') {
    pal = { frame: '#3a1a52', metal: '#9b59b6', light: '#e0bbf0', dark: '#693280', bolt: '#f5e8fc' };
  }

  ctx.save();

  // Hueco oscuro del marco
  rect(ctx, bx, by, T, T, '#07070f');

  // Marco de acero
  rect(ctx, bx, by, T, T, pal.frame);
  rect(ctx, bx + 3, by + 3, T - 6, T - 6, '#07070f');

  // Remaches en el marco
  for (let i = 0; i < 4; i++) {
    const p = 4 + i * 8;
    if (horizontal) {
      px(ctx, bx + p, by + 1, pal.bolt, 2);
      px(ctx, bx + p, by + T - 3, pal.bolt, 2);
    } else {
      px(ctx, bx + 1, by + p, pal.bolt, 2);
      px(ctx, bx + T - 3, by + p, pal.bolt, 2);
    }
  }

  // Hojas de la puerta (se retiran al abrirse)
  const slide = Math.round(openAmount * (T / 2 - 2));
  const leaf = (lx: number, ly: number, lw: number, lh: number) => {
    if (lw <= 0 || lh <= 0) return;
    rect(ctx, lx, ly, lw, lh, pal.metal);
    rect(ctx, lx, ly, lw, 1, pal.light);
    rect(ctx, lx, ly + lh - 1, lw, 1, pal.dark);
    // Estrías industriales
    if (horizontal) {
      for (let i = 2; i < lw - 1; i += 4) rect(ctx, lx + i, ly + 1, 1, lh - 2, pal.dark);
    } else {
      for (let i = 2; i < lh - 1; i += 4) rect(ctx, lx + 1, ly + i, lw - 2, 1, pal.dark);
    }
  };

  if (horizontal) {
    const half = T / 2 - 2;
    leaf(bx + 3, by + 4, half - slide, T - 8);
    leaf(bx + T - 3 - (half - slide), by + 4, half - slide, T - 8);
  } else {
    const half = T / 2 - 2;
    leaf(bx + 4, by + 3, T - 8, half - slide);
    leaf(bx + 4, by + T - 3 - (half - slide), T - 8, half - slide);
  }

  // Grabados y detalles por tipo de puerta
  if (openAmount < 0.5) {
    const cxp = bx + T / 2;
    const cyp = by + T / 2;
    if (style === 'gold') {
      // Hogaza de pan dorada
      rect(ctx, cxp - 4, cyp - 3, 8, 5, '#b8860b');
      rect(ctx, cxp - 3, cyp - 4, 6, 2, '#e8c99b');
      rect(ctx, cxp - 3, cyp - 1, 6, 2, '#f4d03f');
    } else if (style === 'green') {
      // Símbolo de moneda / tienda
      rect(ctx, cxp - 3, cyp - 4, 6, 8, '#1b8a47');
      rect(ctx, cxp - 2, cyp - 3, 4, 6, '#2ecc71');
      px(ctx, cxp - 1, cyp - 1, '#fff', 2);
    } else if (style === 'orange') {
      // Franjas de peligro para minijefe
      for (let i = -3; i <= 3; i += 2) {
        rect(ctx, cxp + i * 2, cyp - 3, 2, 6, '#e67e22');
      }
    } else if (style === 'boss') {
      // Bóveda pesada con calavera / ganso de seguridad
      rect(ctx, cxp - 5, cyp - 5, 10, 10, '#3a0f0f');
      rect(ctx, cxp - 4, cyp - 4, 8, 8, '#c0392b');
      px(ctx, cxp - 2, cyp - 2, '#000', 2);
      px(ctx, cxp + 1, cyp - 2, '#000', 2);
    } else if (style === 'purple') {
      // Gema mística
      rect(ctx, cxp - 3, cyp - 3, 6, 6, '#693280');
      rect(ctx, cxp - 2, cyp - 2, 4, 4, '#e0bbf0');
    }
  }

  // Luz de estado (rojo bloqueada / verde abierta)
  const pulse = locked
    ? 0.55 + Math.sin(frame * 0.18) * 0.45
    : 0.5 + Math.sin(frame * 0.08) * 0.3;
  const lightCol = locked ? '#ff3b30' : '#39d353';
  ctx.globalAlpha = pulse;
  if (horizontal) {
    rect(ctx, bx + T / 2 - 2, dir === 'N' ? by + T - 4 : by + 1, 4, 3, lightCol);
  } else {
    rect(ctx, dir === 'W' ? bx + T - 4 : bx + 1, by + T / 2 - 2, 3, 4, lightCol);
  }
  // Halo
  ctx.globalAlpha = pulse * 0.25;
  ctx.fillStyle = lightCol;
  ctx.beginPath();
  ctx.arc(bx + T / 2, by + T / 2, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Partículas doradas alrededor de la puerta de objeto
  if (style === 'gold') {
    for (let i = 0; i < 3; i++) {
      const t = (frame * 0.02 + i * 0.33) % 1;
      const px2 = bx + T / 2 + Math.sin((frame * 0.05) + i * 2) * 9;
      const py2 = by + T - t * T;
      ctx.globalAlpha = (1 - t) * 0.8;
      rect(ctx, px2, py2, 2, 2, '#fff3b0');
    }
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

/** Obstáculos sólidos del banco */
export function drawObstacle(ctx: Ctx, x: number, y: number, kind: number, frame: number) {
  const bx = Math.floor(x);
  const by = Math.floor(y);
  const T = TILE_SIZE;

  // Sombra proyectada
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(bx + 2, by + T - 5, T - 4, 5);

  switch (kind) {
    case 0: // mostrador / teller counter
      rect(ctx, bx + 1, by + 8, T - 2, T - 12, '#4a322c');
      rect(ctx, bx + 1, by + 8, T - 2, 3, '#8d6e63');
      rect(ctx, bx + 2, by + 12, T - 4, 2, '#3a241f');
      rect(ctx, bx + 3, by + 16, T - 6, 6, '#6d4c41');
      rect(ctx, bx + 1, by + 6, T - 2, 3, '#c5d0da');
      rect(ctx, bx + 2, by + 6, T - 4, 1, '#eef3f7');
      rect(ctx, bx + 6, by + 17, 6, 4, '#1a2744');
      break;
    case 1: // barrera de seguridad
      rect(ctx, bx + 2, by + 10, T - 4, 5, '#f4d03f');
      for (let i = 0; i < 4; i++) rect(ctx, bx + 3 + i * 7, by + 10, 3, 5, '#1a1a1a');
      rect(ctx, bx + 4, by + 15, 3, 10, '#8a94a0');
      rect(ctx, bx + T - 7, by + 15, 3, 10, '#8a94a0');
      rect(ctx, bx + 2, by + 24, T - 4, 4, '#3a4048');
      rect(ctx, bx + 3, by + 10, T - 6, 1, '#fff3b0');
      break;
    case 2: // estantería metálica
      rect(ctx, bx + 2, by + 4, T - 4, T - 6, '#3a4048');
      rect(ctx, bx + 3, by + 6, T - 6, 6, '#1f242c');
      rect(ctx, bx + 3, by + 14, T - 6, 6, '#1f242c');
      rect(ctx, bx + 4, by + 7, 8, 4, '#d4a574');
      rect(ctx, bx + 15, by + 15, 9, 4, '#e8c99b');
      rect(ctx, bx + 3, by + 6, T - 6, 1, '#8a94a0');
      break;
    case 3: { // saco de dinero
      ctx.fillStyle = '#8d6e63';
      ctx.beginPath();
      ctx.ellipse(bx + T / 2, by + 20, 11, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      rect(ctx, bx + T / 2 - 5, by + 8, 10, 5, '#a1887f');
      rect(ctx, bx + T / 2 - 6, by + 11, 12, 2, '#5d4037');
      ctx.fillStyle = '#f4d03f';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('$', bx + T / 2, by + 24);
      break;
    }
    case 4: // caja de pan
      rect(ctx, bx + 2, by + 8, T - 4, T - 12, '#8B5A2B');
      rect(ctx, bx + 3, by + 9, T - 6, T - 14, '#a06c3a');
      rect(ctx, bx + 2, by + 14, T - 4, 2, '#6d3a1f');
      rect(ctx, bx + 6, by + 4, 8, 5, '#e8c99b'); // pan asomando
      rect(ctx, bx + 16, by + 5, 7, 4, '#d4a574');
      break;
    case 5: // columna
      rect(ctx, bx + 6, by + 1, T - 12, T - 2, '#8a94a0');
      rect(ctx, bx + 7, by + 2, T - 14, T - 4, '#b9c2cc');
      rect(ctx, bx + 4, by, T - 8, 4, '#6c7684');
      rect(ctx, bx + 4, by + T - 5, T - 8, 5, '#6c7684');
      rect(ctx, bx + 12, by + 5, 2, T - 12, '#dfe6ee');
      break;
    case 6: { // caja fuerte
      rect(ctx, bx + 2, by + 5, T - 4, T - 8, '#3a4048');
      rect(ctx, bx + 4, by + 7, T - 8, T - 12, '#575f6b');
      ctx.strokeStyle = '#b9c2cc';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(bx + T / 2, by + T / 2, 5, 0, Math.PI * 2);
      ctx.stroke();
      const a = frame * 0.02;
      ctx.beginPath();
      ctx.moveTo(bx + T / 2, by + T / 2);
      ctx.lineTo(bx + T / 2 + Math.cos(a) * 5, by + T / 2 + Math.sin(a) * 5);
      ctx.stroke();
      break;
    }
    default: // escombros
      rect(ctx, bx + 4, by + 16, 9, 7, '#4a5058');
      rect(ctx, bx + 14, by + 12, 11, 11, '#5a626c');
      rect(ctx, bx + 9, by + 20, 8, 5, '#3a4048');
      rect(ctx, bx + 17, by + 9, 5, 4, '#6c7684');
      break;
  }
}

// ---------------------------------------------------------------------------
// ENEMIGOS POLICÍA
// ---------------------------------------------------------------------------

const POL_BLUE = '#2b4a8b';
const POL_BLUE_L = '#4f7ad4';
const POL_BLUE_D = '#1b2f5c';

/** POLICÍA PATO - básico, uniforme azul, gorra y placa */
export function drawPoliciaPato(ctx: Ctx, x: number, y: number, frame: number, hurt: boolean, dirX: number) {
  const bx = Math.floor(x), by = Math.floor(y);
  const bob = Math.round(Math.sin(frame * 0.2));
  ctx.save();
  if (hurt && Math.floor(frame) % 2 === 0) ctx.globalAlpha = 0.55;

  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  ctx.fillRect(bx + 2, by + 16, 12, 3);

  // Patas
  rect(ctx, bx + 4, by + 15, 3, 2, '#f0912b');
  rect(ctx, bx + 9, by + 15, 3, 2, '#f0912b');

  rect(ctx, bx + 3, by + 7 + bob, 10, 8, POL_BLUE);
  rect(ctx, bx + 2, by + 9 + bob, 12, 4, POL_BLUE_L);
  rect(ctx, bx + 3, by + 13 + bob, 10, 2, POL_BLUE_D);
  px(ctx, bx + 5, by + 9 + bob, '#f4d03f', 2);
  rect(ctx, bx + 3, by + 12 + bob, 10, 1, '#141821');
  rect(ctx, bx + 3, by - 1 + bob, 10, 3, POL_BLUE_D);
  rect(ctx, bx + 4, by - 2 + bob, 8, 2, POL_BLUE);
  rect(ctx, bx + 2, by + 1 + bob, 12, 2, POL_BLUE_D);

  rect(ctx, bx + 4, by + 2 + bob, 8, 6, '#e9e4d6');
  rect(ctx, bx + 3, by + 3 + bob, 10, 4, '#e9e4d6');

  // Ojos enfadados
  const ex = dirX > 0 ? 1 : -1;
  rect(ctx, bx + 4, by + 3 + bob, 3, 1, '#3a3a3a'); // ceja
  rect(ctx, bx + 9, by + 3 + bob, 3, 1, '#3a3a3a');
  px(ctx, bx + 5 + ex, by + 4 + bob, '#c0392b', 2);
  px(ctx, bx + 9 + ex, by + 4 + bob, '#c0392b', 2);

  // Pico
  const bxp = dirX > 0 ? bx + 12 : bx - 2;
  rect(ctx, bxp, by + 5 + bob, 5, 2, '#f0912b');

  // Gorra de policía
  rect(ctx, bx + 2, by + 1 + bob, 12, 3, POL_BLUE);
  rect(ctx, bx + 4, by + bob - 1, 8, 2, POL_BLUE_D);
  rect(ctx, dirX > 0 ? bx + 12 : bx + 1, by + 2 + bob, 3, 2, '#141821'); // visera
  px(ctx, bx + 7, by + 1 + bob, '#f4d03f', 2);

  // Pistola
  const gx = dirX > 0 ? bx + 13 : bx - 3;
  rect(ctx, gx, by + 10 + bob, 4, 2, '#2b3038');

  ctx.restore();
}

/** POLICÍA ANTIDISTURBIOS - grande, casco y escudo frontal */
export function drawPoliciaAntidisturbios(
  ctx: Ctx, x: number, y: number, frame: number, hurt: boolean,
  shieldDir: { x: number; y: number }, charging: boolean, shieldDown = false,
) {
  const bx = Math.floor(x), by = Math.floor(y);
  const bob = Math.round(Math.sin(frame * 0.12));
  ctx.save();
  if (hurt && Math.floor(frame) % 2 === 0) ctx.globalAlpha = 0.55;

  ctx.fillStyle = 'rgba(0,0,0,0.38)';
  ctx.fillRect(bx + 2, by + 20, 18, 4);

  // Patas gruesas
  rect(ctx, bx + 5, by + 18, 4, 3, '#f0912b');
  rect(ctx, bx + 13, by + 18, 4, 3, '#f0912b');

  // Armadura oscura
  rect(ctx, bx + 3, by + 8 + bob, 16, 11, '#242a36');
  rect(ctx, bx + 2, by + 10 + bob, 18, 6, '#333b4a');
  rect(ctx, bx + 5, by + 11 + bob, 12, 3, '#1a1f28');
  // Hombreras
  rect(ctx, bx + 1, by + 8 + bob, 4, 4, '#3d4655');
  rect(ctx, bx + 17, by + 8 + bob, 4, 4, '#3d4655');

  // Cabeza + casco antidisturbios
  rect(ctx, bx + 6, by + 2 + bob, 10, 7, '#e9e4d6');
  rect(ctx, bx + 5, by + 1 + bob, 12, 4, '#242a36');
  rect(ctx, bx + 4, by + 4 + bob, 14, 2, '#333b4a');
  // Visor
  ctx.globalAlpha = (hurt && Math.floor(frame) % 2 === 0 ? 0.55 : 1) * 0.75;
  rect(ctx, bx + 6, by + 5 + bob, 10, 3, '#7fb3d5');
  ctx.globalAlpha = hurt && Math.floor(frame) % 2 === 0 ? 0.55 : 1;
  px(ctx, bx + 7, by + 5 + bob, '#d6eaf8', 2);
  // Pico asomando
  rect(ctx, bx + 9, by + 8 + bob, 4, 2, '#f0912b');

  // ESCUDO orientado a su dirección fija (se baja durante la recuperación)
  const len = Math.hypot(shieldDir.x, shieldDir.y) || 1;
  const sx = bx + 10 + (shieldDir.x / len) * 12;
  const sy = by + 12 + (shieldDir.y / len) * 12;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(Math.atan2(shieldDir.y, shieldDir.x) + Math.PI / 2);
  if (shieldDown) {
    // escudo caído: más pequeño y apagado
    ctx.globalAlpha = 0.5;
    rect(ctx, -6, 4, 12, 5, '#3a4452');
    rect(ctx, -5, 5, 10, 3, '#4a5563');
  } else {
    rect(ctx, -7, -3, 14, 6, '#4a5563');
    rect(ctx, -6, -2, 12, 4, '#6d7b8d');
    rect(ctx, -6, -2, 12, 1, '#9fb0c4');
    // Franja policial
    rect(ctx, -6, 0, 12, 1, '#f4d03f');
  }
  if (charging && !shieldDown) {
    ctx.globalAlpha = 0.5 + Math.sin(frame * 0.5) * 0.4;
    rect(ctx, -8, -4, 16, 8, '#ff6b5b');
  }
  ctx.restore();

  ctx.restore();
}

/** POLICÍA ESCOPETA - distancia media, ataque telegrafiado */
export function drawPoliciaEscopeta(
  ctx: Ctx, x: number, y: number, frame: number, hurt: boolean, dirX: number, charge: number,
) {
  const bx = Math.floor(x), by = Math.floor(y);
  const bob = Math.round(Math.sin(frame * 0.15));
  ctx.save();
  if (hurt && Math.floor(frame) % 2 === 0) ctx.globalAlpha = 0.55;

  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  ctx.fillRect(bx + 2, by + 17, 14, 3);

  rect(ctx, bx + 4, by + 16, 3, 2, '#f0912b');
  rect(ctx, bx + 10, by + 16, 3, 2, '#f0912b');

  // Cuerpo con chaleco
  rect(ctx, bx + 3, by + 8 + bob, 12, 8, '#1f3566');
  rect(ctx, bx + 2, by + 10 + bob, 14, 4, POL_BLUE);
  rect(ctx, bx + 4, by + 9 + bob, 10, 4, '#141821'); // chaleco
  rect(ctx, bx + 5, by + 10 + bob, 2, 2, '#f4d03f');
  rect(ctx, bx + 11, by + 10 + bob, 2, 2, '#f4d03f');

  // Cabeza
  rect(ctx, bx + 4, by + 3 + bob, 9, 6, '#ddd6c4');
  // Gafas tácticas
  rect(ctx, bx + 4, by + 4 + bob, 9, 2, '#141821');
  px(ctx, bx + (dirX > 0 ? 10 : 5), by + 4 + bob, '#e74c3c', 2);
  // Gorra
  rect(ctx, bx + 3, by + 1 + bob, 11, 3, '#1f3566');
  rect(ctx, bx + (dirX > 0 ? 12 : 2), by + 3 + bob, 3, 1, '#141821');
  // Pico
  rect(ctx, bx + (dirX > 0 ? 13 : -1), by + 6 + bob, 4, 2, '#f0912b');

  // Escopeta
  const gx = dirX > 0 ? bx + 12 : bx - 8;
  rect(ctx, gx, by + 11 + bob, 12, 3, '#3e2723');
  rect(ctx, gx + (dirX > 0 ? 6 : 0), by + 11 + bob, 6, 2, '#5d4037');

  // Telegrafía de disparo
  if (charge > 0) {
    const t = charge;
    ctx.globalAlpha = 0.35 + t * 0.55;
    const mx = dirX > 0 ? gx + 13 : gx - 2;
    ctx.fillStyle = '#ff9f43';
    ctx.beginPath();
    ctx.arc(mx, by + 12 + bob, 2 + t * 4, 0, Math.PI * 2);
    ctx.fill();
    // Marcador de peligro
    ctx.globalAlpha = t * 0.8;
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(bx + 2, by - 6, Math.round(14 * t), 2);
  }

  ctx.restore();
}

/** POLICÍA RÁPIDO - pequeño, veloz, errático */
export function drawPoliciaRapido(ctx: Ctx, x: number, y: number, frame: number, hurt: boolean, dirX: number) {
  const bx = Math.floor(x), by = Math.floor(y);
  const run = Math.sin(frame * 0.5);
  const bob = Math.round(run);
  ctx.save();
  if (hurt && Math.floor(frame) % 2 === 0) ctx.globalAlpha = 0.55;

  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(bx + 2, by + 14, 10, 2);

  // Patas largas en carrera
  rect(ctx, bx + 3, by + 12, 2, run > 0 ? 3 : 2, '#f0912b');
  rect(ctx, bx + 8, by + 12, 2, run > 0 ? 2 : 3, '#f0912b');

  // Cuerpo pequeño
  rect(ctx, bx + 2, by + 6 + bob, 9, 7, POL_BLUE_L);
  rect(ctx, bx + 3, by + 11 + bob, 7, 2, POL_BLUE);
  px(ctx, bx + 4, by + 8 + bob, '#f4d03f', 2);

  // Cabeza
  rect(ctx, bx + 3, by + 2 + bob, 7, 5, '#e9e4d6');
  px(ctx, bx + (dirX > 0 ? 7 : 4), by + 3 + bob, '#c0392b', 2);
  rect(ctx, bx + (dirX > 0 ? 10 : -1), by + 4 + bob, 3, 2, '#f0912b');
  // Gorrita
  rect(ctx, bx + 2, by + 1 + bob, 9, 2, POL_BLUE);

  // Líneas de velocidad
  ctx.globalAlpha = 0.35;
  const tx = dirX > 0 ? bx - 4 : bx + 12;
  rect(ctx, tx, by + 6, 4, 1, '#9fd0ff');
  rect(ctx, tx, by + 9, 3, 1, '#9fd0ff');
  ctx.restore();
}

/** DRON POLICIAL - vuela, hélices, foco */
export function drawDronPolicial(ctx: Ctx, x: number, y: number, frame: number, hurt: boolean) {
  const bx = Math.floor(x), by = Math.floor(y);
  const hover = Math.sin(frame * 0.15) * 2;
  ctx.save();
  if (hurt && Math.floor(frame) % 2 === 0) ctx.globalAlpha = 0.55;

  // Sombra en el suelo (vuela alto)
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(bx + 8, by + 22, 6, 2, 0, 0, Math.PI * 2);
  ctx.fill();

  const fy = by + hover;

  // Hélices (borrosas)
  ctx.globalAlpha = (hurt && Math.floor(frame) % 2 === 0 ? 0.55 : 1) * 0.55;
  const spin = (frame % 4) < 2 ? 5 : 2;
  rect(ctx, bx - 2, fy + 2, spin * 2, 1, '#cfd8dc');
  rect(ctx, bx + 12, fy + 2, spin * 2, 1, '#cfd8dc');
  ctx.globalAlpha = hurt && Math.floor(frame) % 2 === 0 ? 0.55 : 1;

  // Brazos
  rect(ctx, bx + 1, fy + 3, 14, 2, '#37474f');
  // Chasis
  rect(ctx, bx + 4, fy + 4, 8, 7, '#455a64');
  rect(ctx, bx + 5, fy + 5, 6, 4, '#607d8b');
  // Franja policial
  rect(ctx, bx + 4, fy + 8, 8, 1, '#f4d03f');

  // Lente / ojo rojo escaneando
  const pulse = 0.55 + Math.sin(frame * 0.25) * 0.45;
  ctx.globalAlpha = pulse;
  px(ctx, bx + 7, fy + 9, '#ff3b30', 3);
  ctx.globalAlpha = pulse * 0.25;
  ctx.fillStyle = '#ff3b30';
  ctx.beginPath();
  ctx.arc(bx + 8, fy + 10, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Luz azul intermitente
  if (Math.floor(frame * 0.1) % 2 === 0) px(ctx, bx + 4, fy + 3, '#4f7ad4', 2);
  else px(ctx, bx + 11, fy + 3, '#ff3b30', 2);

  ctx.restore();
}

/** Pedestal de la sala de objeto */
export function drawPedestal(ctx: Ctx, x: number, y: number, frame: number, taken: boolean, rarityColor='#f4d03f') {
  const bx = Math.floor(x), by = Math.floor(y);

  // Halo de luz
  if (!taken) {
    const glow = 0.18 + Math.sin(frame * 0.05) * 0.08;
    const g = ctx.createRadialGradient(bx + 12, by + 4, 2, bx + 12, by + 4, 40);
    g.addColorStop(0,`${rarityColor}60`);
    g.addColorStop(1,`${rarityColor}00`);
    ctx.fillStyle = g;
    ctx.fillRect(bx - 28, by - 36, 80, 80);
    void glow;
  }

  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(bx - 2, by + 26, 28, 4);

  // Base escalonada
  rect(ctx, bx - 2, by + 22, 28, 6, '#2b2340');
  rect(ctx, bx, by + 20, 24, 4, '#3d3358');
  rect(ctx, bx + 4, by + 8, 16, 13, '#4a3e6b');
  rect(ctx, bx + 6, by + 8, 12, 13, '#5b4d83');
  // Vetas
  rect(ctx, bx + 9, by + 10, 1, 9, '#6f5f9c');
  // Tapa
  rect(ctx, bx + 2, by + 4, 20, 5, '#6f5f9c');
  rect(ctx, bx + 3, by + 4, 18, 2, '#8878b8');
  // Grabado de pan
  rect(ctx, bx + 9, by + 24, 6, 2, '#d4a574');
}

/** Vela ambiental para la sala de objeto */
export function drawCandle(ctx: Ctx, x: number, y: number, frame: number) {
  const bx = Math.floor(x), by = Math.floor(y);
  rect(ctx, bx + 2, by + 8, 5, 8, '#e8dcc0');
  rect(ctx, bx + 2, by + 8, 2, 8, '#fff4dd');
  rect(ctx, bx + 1, by + 15, 7, 2, '#8d6e63');
  const flick = Math.sin(frame * 0.4) * 1;
  const g = ctx.createRadialGradient(bx + 4, by + 4, 1, bx + 4, by + 4, 22);
  g.addColorStop(0, 'rgba(255,190,80,0.35)');
  g.addColorStop(1, 'rgba(255,190,80,0)');
  ctx.fillStyle = g;
  ctx.fillRect(bx - 18, by - 18, 44, 44);
  rect(ctx, bx + 3, by + 3 + flick, 3, 5, '#ff9f43');
  rect(ctx, bx + 4, by + 4 + flick, 1, 3, '#fff3b0');
}



export function drawItem(ctx: Ctx, x: number, y: number, itemId: string, frame: number) {
  drawItemIcon(ctx, x - 4, y - 4 + Math.round(Math.sin(frame * .07)), itemId, 24);
}

export function drawWeaponIcon(ctx: Ctx, x: number, y: number, weaponId: string) {
  drawItemIcon(ctx, x - 4, y - 4, weaponId, 24);
}

export function drawParticle(ctx: Ctx, x: number, y: number, type: string, life: number, color?: string) {
  const alpha = Math.max(0, life);
  ctx.globalAlpha = alpha;
  
  switch (type) {
    case 'feather':
      ctx.fillStyle = color || '#f0f0f0';
      ctx.beginPath();
      ctx.ellipse(x, y, 3, 1, life * 2, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'crumb':
      ctx.fillStyle = color || '#d4a574';
      ctx.fillRect(Math.floor(x), Math.floor(y), 2, 2);
      break;
    case 'coin':
      ctx.fillStyle = '#f4d03f';
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'hit':
      ctx.fillStyle = color || '#fff';
      ctx.fillRect(Math.floor(x) - 1, Math.floor(y) - 1, 3, 3);
      break;
    case 'spark':
      ctx.fillStyle = color || '#f4d03f';
      ctx.fillRect(Math.floor(x), Math.floor(y), 2, 2);
      break;
    case 'smoke':
      ctx.fillStyle = color || '#555';
      ctx.beginPath();
      ctx.arc(x, y, 3 * (1 - life * 0.5), 0, Math.PI * 2);
      ctx.fill();
      break;
    default:
      ctx.fillStyle = '#fff';
      ctx.fillRect(Math.floor(x), Math.floor(y), 2, 2);
  }
  
  ctx.globalAlpha = 1;
}

export function drawEvilCroissant(ctx: Ctx, x: number, y: number, frame: number, hurt: boolean) {
  const bx = Math.floor(x);
  const by = Math.floor(y);
  const wobble = Math.sin(frame * 0.2) * 2;
  
  if (hurt && Math.floor(frame) % 2 === 0) {
    ctx.globalAlpha = 0.6;
  }
  
  ctx.save();
  ctx.translate(bx + 8, by + 8);
  ctx.rotate(Math.sin(frame * 0.08) * 0.3);
  
  // Croissant body (crescent shape)
  ctx.fillStyle = '#d4a574';
  ctx.beginPath();
  ctx.arc(0, 0 + wobble, 8, 0.3, Math.PI - 0.3);
  ctx.lineTo(-6, 3 + wobble);
  ctx.arc(0, 4 + wobble, 6, Math.PI, 0, true);
  ctx.lineTo(6, 3 + wobble);
  ctx.closePath();
  ctx.fill();
  
  // Darker layer
  ctx.fillStyle = '#a67c52';
  ctx.beginPath();
  ctx.arc(0, 1 + wobble, 5, 0.5, Math.PI - 0.5);
  ctx.closePath();
  ctx.fill();
  
  // Evil eyes
  ctx.fillStyle = '#e74c3c';
  ctx.fillRect(-4, -3 + wobble, 3, 3);
  ctx.fillRect(1, -3 + wobble, 3, 3);
  
  // Pupils
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(-3, -2 + wobble, 1, 1);
  ctx.fillRect(2, -2 + wobble, 1, 1);
  
  ctx.restore();
  ctx.globalAlpha = 1;
}

export function drawBankerChicken(ctx: Ctx, x: number, y: number, frame: number, hurt: boolean) {
  const bx = Math.floor(x);
  const by = Math.floor(y);
  const bob = Math.sin(frame * 0.12) * 1;
  
  if (hurt && Math.floor(frame) % 2 === 0) {
    ctx.globalAlpha = 0.6;
  }
  
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(bx + 9, by + 18, 7, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Body
  rect(ctx, bx + 3, by + 8 + bob, 12, 9, '#f5f5dc');
  rect(ctx, bx + 2, by + 10 + bob, 14, 5, '#ede8d0');
  
  // Head
  rect(ctx, bx + 3, by + 2 + bob, 10, 7, '#f5f5dc');
  
  // Comb (red)
  rect(ctx, bx + 5, by - 1 + bob, 6, 3, '#e74c3c');
  rect(ctx, bx + 7, by - 2 + bob, 3, 2, '#c0392b');
  
  // Eyes (greedy)
  px(ctx, bx + 5, by + 4 + bob, '#2c3e50', 2);
  px(ctx, bx + 10, by + 4 + bob, '#2c3e50', 2);
  
  // Beak
  rect(ctx, bx + 6, by + 6 + bob, 4, 2, '#f39c12');
  
  // Suit/Tie
  rect(ctx, bx + 4, by + 9 + bob, 10, 7, '#2c3e50');
  rect(ctx, bx + 8, by + 9 + bob, 2, 7, '#c0392b'); // tie
  
  // Money bag
  if (Math.floor(frame * 0.05) % 2 === 0) {
    rect(ctx, bx + 14, by + 8 + bob, 5, 5, '#8d6e63');
    ctx.fillStyle = '#f4d03f';
    ctx.font = '4px monospace';
    ctx.fillText('$', bx + 15, by + 13 + bob);
  }
  
  // Feet
  rect(ctx, bx + 4, by + 17, 3, 2, '#f39c12');
  rect(ctx, bx + 10, by + 17, 3, 2, '#f39c12');
  
  ctx.globalAlpha = 1;
}

export function drawShopPigeon(ctx: Ctx, x: number, y: number, frame: number) {
  const bx = Math.floor(x);
  const by = Math.floor(y);
  const bob = Math.sin(frame * 0.1) * 1;
  
  // Body
  rect(ctx, bx + 4, by + 8 + bob, 10, 10, '#9e9e9e');
  rect(ctx, bx + 3, by + 10 + bob, 12, 6, '#8e8e8e');
  
  // Head
  rect(ctx, bx + 4, by + 3 + bob, 9, 7, '#a8a8a8');
  
  // Suspicious eyes
  px(ctx, bx + 5, by + 5 + bob, '#333', 2);
  px(ctx, bx + 10, by + 5 + bob, '#333', 2);
  
  // Tiny hat
  rect(ctx, bx + 3, by + 1 + bob, 11, 3, '#333');
  rect(ctx, bx + 5, by - 1 + bob, 7, 3, '#333');
  
  // Beak
  rect(ctx, bx + 7, by + 7 + bob, 4, 2, '#d4a574');
  
  // Trenchcoat
  rect(ctx, bx + 2, by + 10 + bob, 14, 8, '#5d4037');
  rect(ctx, bx + 8, by + 10 + bob, 1, 8, '#4e342e');
  
  // Feet
  rect(ctx, bx + 4, by + 18, 3, 2, '#bf6060');
  rect(ctx, bx + 10, by + 18, 3, 2, '#bf6060');
}
