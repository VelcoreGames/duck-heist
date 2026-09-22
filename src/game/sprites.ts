// Pixel art sprite renderer using canvas
// All sprites are drawn procedurally - no external assets needed

import { TILE_SIZE } from './constants';
import { getSkin, BOSSES, SUBBOSSES, MINIBOSSES, type DuckPalette } from './data';
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

  // El pato nunca queda completamente rígido: respiración muy sutil en idle,
  // paso más marcado al moverse y tensión corporal al disparar/dashear.
  const idleBreath = !moving && !dashing && !shooting && Math.sin(frame * 0.06) > 0.72 ? 1 : 0;
  const waddle = moving ? Math.round(Math.sin(frame * 0.35)) : idleBreath;
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

  // Ala expresiva: acompaña disparo, dash y caminata sin cambiar la silueta base.
  const wingKick = shooting ? 2 : dashing ? 1 : moving && Math.abs(step) > .55 ? 1 : 0;
  if (dir === 'left') {
    rect(ctx, bx + 10 + wingKick, by + 9 + waddle, 4, 3, pal.shade);
    if (shooting) px(ctx, bx + 13 + wingKick, by + 8 + waddle, '#fff59d', 1);
  } else if (dir === 'right') {
    rect(ctx, bx + 2 - wingKick, by + 9 + waddle, 4, 3, pal.shade);
    if (shooting) px(ctx, bx + 2 - wingKick, by + 8 + waddle, '#fff59d', 1);
  } else if (dir === 'down' && shooting) {
    rect(ctx, bx + 1, by + 10 + waddle, 3, 2, pal.shade);
    rect(ctx, bx + 12, by + 10 + waddle, 3, 2, pal.shade);
  }

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

function enemyShadow(ctx:Ctx,cx:number,y:number,rx:number,alpha=.34){
  ctx.fillStyle=`rgba(0,0,0,${alpha})`;
  ctx.beginPath();ctx.ellipse(cx,y,rx,Math.max(2,Math.round(rx*.28)),0,0,Math.PI*2);ctx.fill();
}
function enemyEye(ctx:Ctx,x:number,y:number,alert=false){
  px(ctx,x,y,alert?'#ff574d':'#10151c',2);
  if(alert){ctx.globalAlpha=.28;ctx.fillStyle='#ff574d';ctx.fillRect(x-2,y-2,6,6);ctx.globalAlpha=1;}
}
function metalEdge(ctx:Ctx,x:number,y:number,w:number,h:number,base:string,hi:string,lo:string){
  rect(ctx,x,y,w,h,base);rect(ctx,x+1,y+1,w-2,1,hi);rect(ctx,x+1,y+h-2,w-2,1,lo);
}
function crownMark(ctx:Ctx,x:number,y:number,color='#e5bd45'){
  px(ctx,x,y+2,color,2);px(ctx,x+3,y,color,2);px(ctx,x+6,y+2,color,2);rect(ctx,x,y+4,8,2,color);
}

/** PALOMA DE SEGURIDAD — silueta de tirador, visera y arma siempre legibles. */
export function drawSecurityPigeon(ctx: Ctx, x: number, y: number, frame: number, hurt: boolean) {
  const bx=Math.floor(x),by=Math.floor(y),bob=Math.round(Math.sin(frame*.16));
  ctx.save();if(hurt&&Math.floor(frame)%2===0)ctx.globalAlpha=.55;
  enemyShadow(ctx,bx+8,by+18,7);
  // cola/ala trasera: rompe la silueta rectangular
  rect(ctx,bx-1,by+9+bob,4,7,'#596b83');rect(ctx,bx-3,by+11+bob,3,6,'#7387a3');
  // cuerpo y chaleco BANK
  rect(ctx,bx+3,by+7+bob,10,10,'#65768c');
  rect(ctx,bx+2,by+10+bob,12,6,'#263647');rect(ctx,bx+4,by+11+bob,8,4,'#17212d');
  rect(ctx,bx+5,by+12+bob,2,2,'#e5bd45');rect(ctx,bx+9,by+12+bob,2,2,'#89a8b7');
  // cabeza, cuello iridiscente y pico lateral
  rect(ctx,bx+4,by+2+bob,8,6,'#8a9aac');rect(ctx,bx+4,by+6+bob,8,2,'#4c7c83');
  enemyEye(ctx,bx+9,by+3+bob,true);
  rect(ctx,bx+12,by+5+bob,5,2,'#f0912b');px(ctx,bx+16,by+5+bob,'#d46618',1);
  // gorra de seguridad
  rect(ctx,bx+2,by+bob,12,3,'#1d3049');rect(ctx,bx+4,by-2+bob,8,3,'#294866');
  rect(ctx,bx+11,by+2+bob,5,1,'#0d1620');crownMark(ctx,bx+6,by-2+bob,'#e5bd45');
  // arma compacta con mira roja
  rect(ctx,bx+11,by+10+bob,8,3,'#202b36');rect(ctx,bx+15,by+9+bob,3,2,'#536674');
  px(ctx,bx+18,by+10+bob,'#ff574d',1);rect(ctx,bx+8,by+12+bob,4,2,'#344654');
  // patas
  rect(ctx,bx+4,by+16,3,2,'#ef8b35');rect(ctx,bx+10,by+16,3,2,'#ef8b35');
  ctx.restore();ctx.globalAlpha=1;
}

/** GANSO GUARDIA — bruto de contacto con casco, porra y hombreras anchas. */
export function drawGuardGoose(ctx: Ctx, x: number, y: number, frame: number, hurt: boolean) {
  const bx=Math.floor(x),by=Math.floor(y),bob=Math.round(Math.sin(frame*.13));
  ctx.save();if(hurt&&Math.floor(frame)%2===0)ctx.globalAlpha=.55;
  enemyShadow(ctx,bx+10,by+23,9,.38);
  // silueta ancha + hombros
  rect(ctx,bx+2,by+10+bob,16,10,'#e8e7df');rect(ctx,bx,by+12+bob,5,6,'#3b4654');rect(ctx,bx+16,by+12+bob,5,6,'#3b4654');
  rect(ctx,bx+4,by+11+bob,12,8,'#283444');rect(ctx,bx+6,by+12+bob,8,5,'#17202a');
  // cuello alto y cabeza agresiva
  rect(ctx,bx+7,by+4+bob,6,8,'#f2efe6');rect(ctx,bx+5,by+1+bob,9,6,'#f2efe6');
  enemyEye(ctx,bx+11,by+3+bob,true);rect(ctx,bx+14,by+4+bob,6,3,'#ef8b35');rect(ctx,bx+15,by+6+bob,4,1,'#c85e16');
  // casco con visor levantado
  rect(ctx,bx+4,by-1+bob,11,3,'#343d49');rect(ctx,bx+6,by-3+bob,8,3,'#4d5a69');
  rect(ctx,bx+13,by+1+bob,5,2,'#151c24');px(ctx,bx+8,by-2+bob,'#e5bd45',2);
  // porra, siempre visible en diagonal
  ctx.save();ctx.translate(bx+3,by+11+bob);ctx.rotate(-.48);
  rect(ctx,-2,-1,4,12,'#242a31');rect(ctx,-1,-6,2,7,'#697784');rect(ctx,-2,-7,4,2,'#1a2027');ctx.restore();
  // placa frontal
  rect(ctx,bx+8,by+13+bob,4,3,'#60748a');px(ctx,bx+9,by+13+bob,'#e5bd45',2);
  rect(ctx,bx+5,by+20,4,2,'#ef8b35');rect(ctx,bx+12,by+20,4,2,'#ef8b35');
  ctx.restore();ctx.globalAlpha=1;
}

/** TORRETA TOSTADORA — máquina de cocina militarizada con núcleo/cañón claramente frontal. */
export function drawToasterTurret(ctx: Ctx, x: number, y: number, frame: number, hurt: boolean) {
  const bx=Math.floor(x),by=Math.floor(y),pulse=.55+.45*Math.sin(frame*.17);
  ctx.save();if(hurt&&Math.floor(frame)%2===0)ctx.globalAlpha=.55;
  enemyShadow(ctx,bx+10,by+21,9,.4);
  // pedestal industrial
  metalEdge(ctx,bx+3,by+16,15,5,'#3d4650','#788894','#20262d');
  rect(ctx,bx+6,by+20,9,2,'#15191f');
  // cuerpo cromado y franjas de peligro
  metalEdge(ctx,bx+2,by+5,16,12,'#8e9aa2','#d8e1e4','#515b63');
  for(let i=0;i<4;i++)rect(ctx,bx+3+i*4,by+14,2,2,i%2?'#1d2228':'#e0a83c');
  // pan emergente
  rect(ctx,bx+6,by,8,4,'#d39758');rect(ctx,bx+7,by-1,6,3,'#f0c37c');rect(ctx,bx+8,by+1,4,2,'#e9d1a0');
  // cara/núcleo rojo
  ctx.globalAlpha=.55+.35*pulse;rect(ctx,bx+5,by+8,8,4,'#2a2021');enemyEye(ctx,bx+6,by+8,true);enemyEye(ctx,bx+11,by+8,true);ctx.globalAlpha=1;
  // cañón de pan frontal
  rect(ctx,bx+12,by+9,8,4,'#303943');rect(ctx,bx+17,by+8,4,6,'#20262c');rect(ctx,bx+20,by+9,3,4,'#4b5963');
  if(frame%14<4){ctx.globalAlpha=.35+.35*pulse;rect(ctx,bx+22,by+8,4,6,'#ff714f');ctx.globalAlpha=1;}
  // manómetro térmico
  rect(ctx,bx+3,by+6,2,5,'#2b3238');px(ctx,bx+3,by+6,pulse>.7?'#ff624f':'#e5bd45',2);
  ctx.restore();ctx.globalAlpha=1;
}

/** ROSQUILLA RODANTE — rueda blindada de pan con pinchos y rostro central. */
export function drawRollingBagel(ctx: Ctx, x: number, y: number, frame: number, hurt: boolean) {
  const bx=Math.floor(x),by=Math.floor(y),rot=frame*.16;
  ctx.save();if(hurt&&Math.floor(frame)%2===0)ctx.globalAlpha=.55;
  enemyShadow(ctx,bx+8,by+17,8,.3);
  ctx.translate(bx+8,by+8);ctx.rotate(rot);
  // aro con dos tonos
  ctx.fillStyle='#b8733f';ctx.beginPath();ctx.arc(0,0,8,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#e1a85f';ctx.beginPath();ctx.arc(0,0,6.5,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#2a211c';ctx.beginPath();ctx.arc(0,0,3,0,Math.PI*2);ctx.fill();
  // pinchos metálicos
  for(let i=0;i<6;i++){const a=i*Math.PI/3;ctx.save();ctx.rotate(a);rect(ctx,6,-1,5,3,'#56616b');px(ctx,10,0,'#aeb9c0',1);ctx.restore();}
  // semillas y placas
  for(let i=0;i<5;i++){const a=i*1.25+.3;px(ctx,Math.cos(a)*5-1,Math.sin(a)*5-1,'#f5dfb3',1);}
  rect(ctx,-2,-2,2,2,'#ff574d');rect(ctx,1,-2,2,2,'#ff574d');
  ctx.restore();ctx.globalAlpha=1;
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
    case 'golden_egg': {
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
    default: {
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(bx, by, 3, 0, Math.PI * 2);
      ctx.fill();
    }
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

type BossVisual={accent:string;secondary:string;family:'command'|'finance'|'bakery'|'tech'|'riot'|'war'|'wealth'|'vault';bob:number};
const BOSS_VISUAL:Record<string,BossVisual> = {
  captain_honk:{accent:'#4f7ad4',secondary:'#f05c55',family:'command',bob:.7},
  comisario_pico_duro:{accent:'#9db7df',secondary:'#d69c4c',family:'command',bob:.45},
  toaster_9000:{accent:'#ff7043',secondary:'#ffd166',family:'tech',bob:.18},
  general_ganso:{accent:'#7189a8',secondary:'#d44747',family:'war',bob:.35},
  don_levadura:{accent:'#d39b5f',secondary:'#8bb85a',family:'bakery',bob:.65},
  director_seguridad:{accent:'#55c8de',secondary:'#ff6464',family:'tech',bob:.42},
  bread_banker:{accent:'#f4d03f',secondary:'#d7a63d',family:'wealth',bob:.5},
  tax_collector:{accent:'#c44f4f',secondary:'#d6b169',family:'finance',bob:.8},
  sargento_migajas:{accent:'#7b94bb',secondary:'#f0b44f',family:'war',bob:.65},
  dron_centinela:{accent:'#55d1e1',secondary:'#ef6666',family:'tech',bob:1.6},
  panadero_loco:{accent:'#ef8b49',secondary:'#ffd06b',family:'bakery',bob:.9},
  head_baker:{accent:'#f0eee7',secondary:'#a46f45',family:'bakery',bob:.55},
  el_auditor:{accent:'#72b8a1',secondary:'#d6b169',family:'finance',bob:.55},
  ganso_antidisturbios:{accent:'#8797a8',secondary:'#5c7fae',family:'riot',bob:.28},
  cajero_3000:{accent:'#65d3a8',secondary:'#ffd166',family:'finance',bob:.22},
};

function bossVisual(bossType:string):BossVisual|undefined {
  const legacy=BOSS_VISUAL[bossType];
  if(legacy)return legacy;
  const def=BOSSES[bossType]??SUBBOSSES[bossType]??MINIBOSSES[bossType];
  if(!def)return undefined;
  const hash=[...bossType].reduce((a,ch)=>(a*33+ch.charCodeAt(0))>>>0,5381);
  return {accent:def.accent,secondary:def.secondary,family:def.family,bob:.2+(hash%13)/10};
}

function bossVisualHash(id:string){
  return [...id].reduce((a,ch)=>(Math.imul(a,31)+ch.charCodeAt(0))>>>0,2166136261>>>0);
}

function drawGeneratedBossBody(ctx:Ctx,bx:number,by:number,bossType:string,frame:number,phase:number,v:BossVisual,floorBoss:boolean,subBoss:boolean) {
  const h=bossVisualHash(bossType),wide=22+(h%8),tall=17+((h>>>3)%7),cx=18;
  const dark=v.family==='vault'?'#24213b':v.family==='tech'?'#25343c':v.family==='bakery'?'#6d4934':v.family==='finance'||v.family==='wealth'?'#26292f':'#36414e';
  const light=v.family==='bakery'?'#e7c392':v.family==='finance'||v.family==='wealth'?'#f0e8d4':'#e3e8e8';
  ctx.fillStyle='rgba(0,0,0,.38)';ctx.beginPath();ctx.ellipse(bx+cx,by+38,13+(h%4),4+(h%2),0,0,Math.PI*2);ctx.fill();

  if(v.family==='tech'||v.family==='vault'){
    rect(ctx,bx+cx-wide/2,by+11,wide,tall,dark);
    rect(ctx,bx+cx-wide/2+3,by+14,wide-6,tall-7,v.family==='vault'?'#332d55':'#38505b');
    rect(ctx,bx+cx-7,by+16,5,4,v.secondary);rect(ctx,bx+cx+2,by+16,5,4,v.accent);
    const wing=5+((h>>>6)%5);rect(ctx,bx+cx-wide/2-wing,by+16,wing,3,v.accent);rect(ctx,bx+cx+wide/2,by+16,wing,3,v.accent);
    if((h>>>9)%2) {rect(ctx,bx+cx-2,by+4,4,8,'#83949d');px(ctx,bx+cx-1,by+2,v.secondary,2);}
  } else {
    rect(ctx,bx+cx-wide/2,by+15,wide,tall,dark);
    rect(ctx,bx+cx-wide/2+3,by+18,wide-6,tall-6,v.accent);
    const headW=14+((h>>>5)%5),headX=bx+cx-headW/2;
    rect(ctx,headX,by+3,headW,13,light);
    rect(ctx,headX+headW-1,by+8,8,4,'#e67e22');
    px(ctx,headX+4,by+7,(h>>>8)%2?'#e44f4f':'#111827',2);
    if(v.family==='bakery'){
      rect(ctx,headX-2,by-3,headW+4,5,'#f3f1e9');
      rect(ctx,headX+2,by-8,headW-4,6,'#fffdf7');
    } else if(v.family==='finance'||v.family==='wealth'){
      rect(ctx,bx+cx-2,by+19,4,12,v.secondary);
      if((h>>>10)%2) {ctx.strokeStyle=v.secondary;ctx.beginPath();ctx.arc(headX+headW-4,by+8,3,0,Math.PI*2);ctx.stroke();}
    } else {
      rect(ctx,headX-2,by,headW+4,4,dark);
      if(v.family==='riot')rect(ctx,bx+cx+wide/2-2,by+13,8,20,'#687887');
    }
  }

  const marks=2+(h%4);
  for(let i=0;i<marks;i++){
    const dx=bx+5+((h>>>(i*3+2))%27),dy=by+27+((i%2)*4);
    rect(ctx,dx,dy,2+(i%2),3,i%2?v.secondary:v.accent);
  }
  if((h>>>13)%2){rect(ctx,bx-3,by+18,5,12,v.secondary);}
  if((h>>>14)%2){rect(ctx,bx+34,by+18,5,12,v.accent);}
  if(floorBoss&&phase>=2){
    ctx.globalAlpha=.4+.25*Math.sin(frame*.2);ctx.strokeStyle=v.secondary;ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(bx+18,by+20,27+(h%5),0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;
  } else if(subBoss&&phase>=1){
    ctx.globalAlpha=.45;ctx.strokeStyle=v.accent;ctx.beginPath();ctx.arc(bx+18,by+20,22,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;
  }
}


function drawBossAttackHardware(ctx:Ctx,def:NonNullable<ReturnType<typeof bossVisual>>,sequence:string[],frame:number,phase:number){
  const first=sequence[phase%Math.max(1,sequence.length)]??'fan';
  if(first==='sniper'){
    rect(ctx,12,-4,18,4,'#27313a');rect(ctx,23,-5,8,6,'#111820');px(ctx,17,-6,'#ff5b54',2);
  }else if(first==='rush'){
    rect(ctx,-27,-3,10,6,'#6b7780');rect(ctx,17,-3,10,6,'#6b7780');
    px(ctx,-29,-2,def.secondary,2);px(ctx,27,-2,def.secondary,2);
  }else if(first==='summon'){
    const blink=frame%18<9?def.accent:def.secondary;rect(ctx,-23,-15,5,5,'#222a31');px(ctx,-22,-17,blink,3);rect(ctx,18,-15,5,5,'#222a31');px(ctx,19,-17,blink,3);
  }else if(first==='mines'){
    for(let i=0;i<4;i++){const a=-.9+i*.6;ctx.save();ctx.rotate(a);rect(ctx,15,-2,5,4,'#424d53');px(ctx,17,-3,'#e55d52',2);ctx.restore();}
  }else if(first==='warp'){
    ctx.globalAlpha=.3+.15*Math.sin(frame*.16);ctx.strokeStyle=def.accent;ctx.lineWidth=2;
    for(let i=0;i<2;i++){ctx.beginPath();ctx.arc(0,0,24+i*5,frame*.02+i,frame*.02+i+Math.PI*1.3);ctx.stroke();}ctx.globalAlpha=1;
  }else if(first==='cage'||first==='lanes'){
    rect(ctx,-24,9,6,14,'#313b43');rect(ctx,18,9,6,14,'#313b43');px(ctx,-22,11,def.accent,2);px(ctx,20,11,def.accent,2);
  }else{
    rect(ctx,14,1,15,5,'#28323a');rect(ctx,24,0,6,7,'#4d5a62');px(ctx,29,2,def.secondary,2);
  }
}


export function bossVisualIdentityKey(bossType:string){
  const def=BOSSES[bossType]??SUBBOSSES[bossType]??MINIBOSSES[bossType];
  if(!def)return '';
  if(def.finalBoss)return 'final:bread_banker:imperial-vault';
  const h=bossVisualHash(bossType),tier=BOSSES[bossType]?2:SUBBOSSES[bossType]?1:0;
  return [def.family,tier,h%8,(h>>>3)%8,(h>>>6)%6,(h>>>10)%5,def.pattern.sequence[0],def.pattern.sequence[1]].join(':');
}

function drawBossStructuralRig(ctx:Ctx,h:number,tier:number,phase:number,frame:number,v:BossVisual){
  const rig=h%8,steel=v.family==='bakery'?'#795239':v.family==='finance'||v.family==='wealth'?'#4d443a':v.family==='vault'?'#403959':'#3c4852';
  const edge=v.family==='bakery'?'#d29c5d':v.family==='wealth'?'#d7ad4c':'#7f919c';
  const pulse=.55+.45*Math.sin(frame*.1+(h%17));
  ctx.save();
  switch(rig){
    case 0: // ariete asimétrico + contrapeso: ancho y agresivo
      metalEdge(ctx,-31,-7,10,25,steel,edge,'#222a31');
      rect(ctx,21,-3,8,18,steel);rect(ctx,24,1,8,10,'#252d33');px(ctx,27,4,v.secondary,3);
      if(tier>=1){rect(ctx,-35,3,6,8,v.accent);rect(ctx,29,5,5,6,v.secondary);}
      break;
    case 1: // bastidor de alas/archivadores: silueta en V
      ctx.fillStyle=steel;ctx.beginPath();ctx.moveTo(-17,-3);ctx.lineTo(-34,-17);ctx.lineTo(-29,8);ctx.lineTo(-18,13);ctx.closePath();ctx.fill();
      ctx.beginPath();ctx.moveTo(17,-3);ctx.lineTo(34,-17);ctx.lineTo(29,8);ctx.lineTo(18,13);ctx.closePath();ctx.fill();
      rect(ctx,-32,-12,9,3,v.accent);rect(ctx,23,-12,9,3,v.secondary);
      break;
    case 2: // antena/estandarte alto: lectura vertical
      rect(ctx,-24,-29,3,43,steel);rect(ctx,-29,-30,13,9,'#252d33');rect(ctx,-27,-28,9,5,v.accent);
      rect(ctx,19,-12,8,22,steel);rect(ctx,21,-16,4,5,edge);
      if(frame%24<12)px(ctx,-23,-35,v.secondary,3);
      break;
    case 3: // turbinas laterales / maquinaria de persecución
      for(const x of [-27,27]){
        ctx.fillStyle=steel;ctx.beginPath();ctx.arc(x,1,9+tier,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle=edge;ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,1,6+tier,0,Math.PI*2);ctx.stroke();
        ctx.save();ctx.translate(x,1);ctx.rotate(frame*.04*(x<0?-1:1));rect(ctx,-1,-7,2,14,v.accent);rect(ctx,-7,-1,14,2,v.secondary);ctx.restore();
      }
      break;
    case 4: // abrigo/capa partida: base triangular muy distinta
      ctx.fillStyle=steel;ctx.beginPath();ctx.moveTo(-17,-4);ctx.lineTo(-31,22);ctx.lineTo(-11,18);ctx.lineTo(0,8);ctx.lineTo(11,18);ctx.lineTo(31,22);ctx.lineTo(17,-4);ctx.closePath();ctx.fill();
      ctx.globalAlpha=.55;rect(ctx,-27,17,12,3,v.accent);rect(ctx,15,17,12,3,v.secondary);ctx.globalAlpha=1;
      break;
    case 5: // zancos blindados / chasis bajo
      rect(ctx,-29,7,12,8,steel);rect(ctx,17,7,12,8,steel);
      rect(ctx,-27,14,5,12,'#252d33');rect(ctx,22,14,5,12,'#252d33');
      rect(ctx,-31,24,12,4,edge);rect(ctx,19,24,12,4,edge);
      if(tier===2){rect(ctx,-34,8,5,5,v.accent);rect(ctx,29,8,5,5,v.secondary);}
      break;
    case 6: // chimeneas/reactores traseros
      for(const x of [-21,16]){
        rect(ctx,x,-22,6,31,steel);rect(ctx,x-2,-24,10,4,edge);
        ctx.globalAlpha=.25+.2*pulse;rect(ctx,x+1,-31,4,8,phase>=2?'#ff5b54':v.accent);ctx.globalAlpha=1;
      }
      rect(ctx,-26,5,9,12,'#252d33');rect(ctx,17,5,9,12,'#252d33');
      break;
    default: // aro de bóveda segmentado: silueta circular mecánica
      ctx.strokeStyle=edge;ctx.lineWidth=4;ctx.globalAlpha=.8;
      for(let i=0;i<6;i++){const a=i*Math.PI/3+.16;ctx.beginPath();ctx.arc(0,2,27+tier*2,a,a+.55);ctx.stroke();}
      ctx.globalAlpha=1;
      for(let i=0;i<4;i++){const a=i*Math.PI/2;const x=Math.cos(a)*(27+tier*2),y=2+Math.sin(a)*(27+tier*2);px(ctx,x-1,y-1,i%2?v.secondary:v.accent,3);}
      break;
  }
  ctx.restore();
}

function drawBossFrontIdentity(ctx:Ctx,h:number,tier:number,v:BossVisual){
  const plate=(h>>>3)%8;
  switch(plate){
    case 0:
      ctx.strokeStyle=v.secondary;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-11,-4);ctx.lineTo(10,15);ctx.moveTo(11,-4);ctx.lineTo(-10,15);ctx.stroke();break;
    case 1:
      rect(ctx,-10,1,20,11,'#20282f');rect(ctx,-7,4,14,5,v.accent);px(ctx,-5,5,v.secondary,2);px(ctx,3,5,'#d8ece8',2);break;
    case 2:
      ctx.save();ctx.rotate(-.22);rect(ctx,-4,-12,7,31,v.secondary);rect(ctx,-2,-9,3,25,v.accent);ctx.restore();break;
    case 3:
      rect(ctx,-13,7,26,10,'#4a352c');for(let x=-9;x<=7;x+=8){rect(ctx,x,9,5,5,'#6c4d32');px(ctx,x+1,10,v.secondary,2);}break;
    case 4:
      ctx.strokeStyle=v.secondary;ctx.lineWidth=2;ctx.strokeRect(-10,0,20,14);for(const p of [[-8,2],[6,2],[-8,10],[6,10]] as const)px(ctx,p[0],p[1],v.accent,2);break;
    case 5:
      for(let i=0;i<5;i++){ctx.save();ctx.rotate(-.55);rect(ctx,-13+i*6,-1,4,8,i%2?v.secondary:v.accent);ctx.restore();}break;
    case 6:
      ctx.strokeStyle=v.secondary;ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,5,8,0,Math.PI*2);ctx.stroke();crownMark(ctx,-4,1,v.accent);break;
    default:
      rect(ctx,-12,-1,24,5,'#1f2930');rect(ctx,-8,0,16,2,tier===2?v.secondary:v.accent);rect(ctx,-15,7,5,9,'#4a5660');rect(ctx,10,7,5,9,'#4a5660');break;
  }
}

function drawBossCrest(ctx:Ctx,h:number,v:BossVisual){
  switch((h>>>6)%6){
    case 0: rect(ctx,-3,-29,6,10,'#2b333a');px(ctx,-2,-32,v.secondary,4);break;
    case 1: rect(ctx,-14,-25,28,3,'#30383f');rect(ctx,-11,-30,5,6,v.accent);rect(ctx,6,-30,5,6,v.secondary);break;
    case 2:
      ctx.strokeStyle=v.secondary;ctx.lineWidth=3;ctx.beginPath();ctx.arc(-8,-23,7,.1,Math.PI*1.3);ctx.stroke();ctx.beginPath();ctx.arc(8,-23,7,Math.PI*1.9,Math.PI*.7,true);ctx.stroke();break;
    case 3: rect(ctx,-13,-27,6,8,'#343d45');rect(ctx,7,-27,6,8,'#343d45');rect(ctx,-9,-31,3,5,v.accent);rect(ctx,7,-31,3,5,v.secondary);break;
    case 4: rect(ctx,-10,-27,20,4,'#3b3028');for(let x=-8;x<=6;x+=7)rect(ctx,x,-32,4,6,x===-1?v.secondary:v.accent);break;
    default: rect(ctx,-16,-25,32,3,'#242c33');rect(ctx,-5,-30,10,6,v.secondary);px(ctx,-2,-33,v.accent,4);break;
  }
}

function drawPremiumBossBody(ctx:Ctx,bx:number,by:number,bossType:string,frame:number,phase:number,v:BossVisual,floorBoss:boolean,subBoss:boolean){
  const def=BOSSES[bossType]??SUBBOSSES[bossType]??MINIBOSSES[bossType];
  if(!def){drawGeneratedBossBody(ctx,bx,by,bossType,frame,phase,v,floorBoss,subBoss);return;}
  const h=bossVisualHash(bossType),tier=floorBoss?2:subBoss?1:0;
  const scale=(tier===2?1.08:tier===1?1:.92)*(def.size>=40?1.06:def.size<=27?.96:1);
  const pulse=.55+.45*Math.sin(frame*.13+h%11);
  ctx.save();ctx.translate(bx+18,by+21);ctx.scale(scale,scale);

  // sombra ancha; la jerarquía se lee incluso en silueta
  ctx.fillStyle='rgba(0,0,0,.42)';ctx.beginPath();ctx.ellipse(0,17,15+tier*3,4+tier,0,0,Math.PI*2);ctx.fill();

  if(!def.finalBoss)drawBossStructuralRig(ctx,h,tier,phase,frame,v);

  if(def.finalBoss){
    // EL GRAN JEFE DEL BANCO: corona de pan, capa de armiño, puerta de bóveda y cetro.
    ctx.fillStyle='#6e1f31';ctx.beginPath();ctx.moveTo(-25,-5);ctx.lineTo(-30,19);ctx.lineTo(-17,23);ctx.lineTo(0,18);ctx.lineTo(18,23);ctx.lineTo(30,18);ctx.lineTo(25,-5);ctx.closePath();ctx.fill();
    rect(ctx,-22,-8,44,27,'#f0ece0'); // cuerpo blanco
    rect(ctx,-19,-5,38,22,'#3a4148');rect(ctx,-15,-2,30,17,'#555f66');
    // puerta de bóveda central
    ctx.fillStyle='#20262b';ctx.beginPath();ctx.arc(0,7,11,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#d7b24b';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,7,9,0,Math.PI*2);ctx.stroke();
    for(let i=0;i<6;i++){const a=i*Math.PI/3;ctx.beginPath();ctx.moveTo(0,7);ctx.lineTo(Math.cos(a)*8,7+Math.sin(a)*8);ctx.stroke();}
    crownMark(ctx,-4,3,'#f0c64f');
    // cabeza y ceño
    rect(ctx,-10,-18,20,12,'#eee9dc');rect(ctx,-7,-17,14,5,'#d8d1c4');
    enemyEye(ctx,-6,-14,true);enemyEye(ctx,4,-14,true);rect(ctx,8,-12,9,4,'#ee8a31');
    // corona de hogazas
    rect(ctx,-12,-23,24,4,'#c78b39');for(const x of [-10,-4,2,8]){rect(ctx,x,-30,5,8,'#e5b65f');rect(ctx,x+1,-31,3,2,'#f5d68d');}
    // hombros dorados y tubos
    rect(ctx,-28,-5,8,14,'#b68a32');rect(ctx,20,-5,8,14,'#b68a32');
    for(const x of [-24,22]){rect(ctx,x,-13,3,10,'#d7ad4c');rect(ctx,x+3,-16,3,13,'#8b6328');}
    // mano/gauntlet adelantado
    rect(ctx,-31,4,12,11,'#30383f');rect(ctx,-34,6,5,7,'#4f5b63');px(ctx,-32,8,'#e5bd45',2);
    // cetro del capital
    rect(ctx,26,-9,3,28,'#9c742a');ctx.fillStyle='#d9b34b';ctx.beginPath();ctx.arc(27,-12,7,0,Math.PI*2);ctx.fill();crownMark(ctx,23,-16,'#fff0a0');
    ctx.strokeStyle='#805f24';ctx.lineWidth=2;ctx.beginPath();ctx.arc(27,-12,4,0,Math.PI*2);ctx.stroke();px(ctx,26,-13,'#fff0a0',2);
    if(phase>=1){
      ctx.globalAlpha=.18+.12*pulse;ctx.fillStyle=phase>=2?'#ff4f52':'#f4d03f';ctx.beginPath();ctx.arc(0,2,35+phase*5,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
      // La armadura imperial se transforma por fase sin tapar los telegraphs de ataque.
      for(const x of [-30,27]){rect(ctx,x,-15,4,25,'#9c742a');rect(ctx,x-2,-18,8,4,'#d7ad4c');ctx.globalAlpha=.35+.3*pulse;rect(ctx,x,-25,4,7,phase>=2?'#ff5b54':'#f4d03f');ctx.globalAlpha=1;}
      if(phase>=2){
        ctx.strokeStyle='#f4d03f';ctx.lineWidth=3;for(let i=0;i<8;i++){const a=i*Math.PI/4+.12;ctx.beginPath();ctx.arc(0,4,39,a,a+.34);ctx.stroke();}
        rect(ctx,-17,-34,34,3,'#8b6328');rect(ctx,-15,-38,6,5,'#e5b65f');rect(ctx,-3,-41,6,8,'#f0c64f');rect(ctx,9,-38,6,5,'#e5b65f');
      }
    }
  }else if(v.family==='tech'){
    // plataforma mecánica / dron pesado
    rect(ctx,-17,-8,34,22,'#364751');rect(ctx,-13,-5,26,16,'#536b76');
    rect(ctx,-8,-2,16,8,'#172d39');enemyEye(ctx,-5,0,true);enemyEye(ctx,3,0,true);
    rect(ctx,-24,-3,8,5,v.accent);rect(ctx,16,-3,8,5,v.accent);
    for(const x of [-22,22]){ctx.globalAlpha=.48;rect(ctx,x-7,-13,14,2,'#b8c5c9');rect(ctx,x-4,-15,8,1,'#e3ecee');ctx.globalAlpha=1;}
    rect(ctx,-7,11,14,5,'#242d33');px(ctx,-1,12,v.secondary,3);
  }else if(v.family==='vault'){
    // bestia de bóveda / carnero mecanizado
    rect(ctx,-18,-7,36,24,'#343b46');rect(ctx,-14,-4,28,18,'#505967');
    ctx.strokeStyle=v.secondary;ctx.lineWidth=3;
    ctx.beginPath();ctx.arc(-15,-8,9,.2,Math.PI*1.6);ctx.stroke();ctx.beginPath();ctx.arc(15,-8,9,Math.PI*1.4,Math.PI*.8,true);ctx.stroke();
    rect(ctx,-10,-14,20,10,'#e8e3d8');enemyEye(ctx,-7,-10,true);enemyEye(ctx,5,-10,true);
    rect(ctx,-7,1,14,11,'#242a32');crownMark(ctx,-4,3,v.secondary);
    rect(ctx,-21,7,8,10,'#262e37');rect(ctx,13,7,8,10,'#262e37');
  }else if(v.family==='bakery'){
    // chef/horno: gorro enorme + núcleo térmico
    rect(ctx,-17,-7,34,24,'#ece5d6');rect(ctx,-14,-3,28,18,'#9a633f');
    rect(ctx,-9,0,18,12,'#33231d');rect(ctx,-6,2,12,8,'#6a2e23');
    ctx.globalAlpha=.6+.25*pulse;rect(ctx,-4,4,8,5,'#ff7a3c');ctx.globalAlpha=1;
    rect(ctx,-12,-16,24,8,'#f5f1e8');rect(ctx,-8,-21,16,7,'#fffdf7');rect(ctx,-4,-24,8,4,'#fffdf7');
    enemyEye(ctx,-7,-7,true);enemyEye(ctx,5,-7,true);rect(ctx,9,-5,8,3,'#ed8730');
    // pala de horno
    ctx.save();ctx.translate(21,4);ctx.rotate(-.5);rect(ctx,-1,-14,3,26,'#8d6234');rect(ctx,-6,-17,13,6,'#b67d45');ctx.restore();
  }else if(v.family==='finance'||v.family==='wealth'){
    // banquero/cobrador de alto rango
    rect(ctx,-16,-7,32,24,v.family==='wealth'?'#eee8d6':'#d7d5cf');rect(ctx,-13,-3,26,19,'#252b34');
    rect(ctx,-3,-2,6,17,v.secondary);rect(ctx,-10,-15,20,10,'#ede8da');enemyEye(ctx,-7,-11,true);rect(ctx,8,-9,8,3,'#e9872f');
    if(v.family==='wealth'){rect(ctx,-13,-21,26,4,'#2a2521');rect(ctx,-9,-28,18,8,'#342c24');crownMark(ctx,-4,-27,v.accent);}
    else{rect(ctx,-12,-20,24,4,'#262d35');rect(ctx,-8,-25,16,6,'#303944');}
    // maletín / monedas
    rect(ctx,-24,3,9,10,'#4a352c');rect(ctx,-22,1,5,3,'#7b5c3b');px(ctx,-21,6,v.secondary,2);
    if(frame%16<3){px(ctx,18,-8,v.secondary,2);px(ctx,22,2,'#79b875',2);}
  }else{
    // command / riot / war: ave militar con casco y torso táctico
    const body=v.family==='riot'?'#3c4652':v.family==='war'?'#455260':'#2d4057';
    rect(ctx,-16,-6,32,23,'#ece9df');rect(ctx,-15,-2,30,18,body);
    rect(ctx,-20,0,7,10,'#4d5964');rect(ctx,13,0,7,10,'#4d5964');
    rect(ctx,-10,-15,20,10,'#eeeae0');enemyEye(ctx,-7,-11,true);rect(ctx,9,-9,9,3,'#ef8b35');
    rect(ctx,-12,-20,24,5,'#202d3a');rect(ctx,-8,-24,16,5,'#2d4357');crownMark(ctx,-4,-23,v.secondary);
    if(v.family==='riot'){metalEdge(ctx,13,-1,12,21,'#566574','#9caab4','#2c353d');rect(ctx,15,9,8,2,v.secondary);}
    if(v.family==='war'){for(let i=0;i<4;i++)rect(ctx,-10+i*6,11,3,5,i%2?v.secondary:'#806239');}
    if(v.family==='command'){rect(ctx,-20,-4,5,7,v.secondary);rect(ctx,15,-4,5,7,v.secondary);}
  }

  if(!def.finalBoss){drawBossFrontIdentity(ctx,h,tier,v);drawBossCrest(ctx,h,v);}

  drawBossAttackHardware(ctx,{accent:v.accent,secondary:v.secondary,family:v.family,bob:v.bob},def.pattern.sequence,frame,phase);

  // detalles deterministas: cada individuo mantiene una firma visual propia.
  if(h%2){rect(ctx,-3,14,6,3,v.secondary);}else{px(ctx,-2,15,v.accent,2);px(ctx,2,15,v.secondary,2);}
  if((h>>>2)%2)rect(ctx,-23,-7,4,9,'#4c5962');
  if((h>>>3)%2)rect(ctx,19,-7,4,9,'#4c5962');
  if(tier>=1){ctx.strokeStyle=v.accent;ctx.globalAlpha=.32+.18*pulse;ctx.beginPath();ctx.arc(0,1,23+tier*4+phase*3,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;}
  if(tier===2){rect(ctx,-23,16,46,2,v.secondary);px(ctx,-19,14,v.accent,2);px(ctx,17,14,v.accent,2);}
  ctx.restore();
}

function drawBossIdentity(ctx:Ctx,bx:number,by:number,bossType:string,frame:number,phase:number) {
  const v=bossVisual(bossType);
  if(!v)return;
  const pulse=.55+.45*Math.sin(frame*.12);
  const phaseGlow=phase>0?1:0;
  ctx.save();

  if(bossType==='bread_banker'){
    // El jefe final ya tiene una silueta regia propia; aquí sólo añadimos vida visual.
    if(frame%16<3){px(ctx,bx-4,by+4,v.secondary,2);px(ctx,bx+39,by+10,v.accent,2);}
    if(phase>0){ctx.globalAlpha=.28+.18*pulse;ctx.strokeStyle=phase>=2?'#ff4d54':v.accent;ctx.lineWidth=2;ctx.beginPath();ctx.arc(bx+18,by+17,31+phase*5,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;}
    ctx.restore();return;
  }

  // Firma de familia: hace legible el rol incluso en movimiento.
  if(v.family==='command'){
    rect(ctx,bx+2,by+10,4,3,v.accent);rect(ctx,bx+28,by+10,4,3,v.accent);
    rect(ctx,bx+5,by-5,5,2,v.secondary);rect(ctx,bx+22,by-5,5,2,v.secondary);
    if(frame%30<15){px(ctx,bx+7,by-7,v.accent,2);px(ctx,bx+24,by-7,v.secondary,2);}
  } else if(v.family==='finance'){
    rect(ctx,bx+2,by+18,6,7,'#4d3727');rect(ctx,bx+26,by+18,6,7,'#4d3727');
    px(ctx,bx+5,by+20,v.secondary,2);px(ctx,bx+29,by+20,v.secondary,2);
    if(frame%26<5){px(ctx,bx+1,by+5,v.secondary,2);px(ctx,bx+31,by+8,v.secondary,2);}
  } else if(v.family==='bakery'){
    rect(ctx,bx-2,by+18,4,8,'#9a6842');rect(ctx,bx+32,by+18,4,8,'#9a6842');
    ctx.globalAlpha=.4+.2*pulse;rect(ctx,bx+8,by-7,16,3,v.secondary);ctx.globalAlpha=1;
  } else if(v.family==='tech'){
    rect(ctx,bx-4,by+11,5,4,v.accent);rect(ctx,bx+33,by+11,5,4,v.accent);
    ctx.globalAlpha=.45+.35*pulse;px(ctx,bx+4,by+4,v.secondary,2);px(ctx,bx+28,by+4,v.secondary,2);ctx.globalAlpha=1;
  } else if(v.family==='riot'){
    rect(ctx,bx+29,by+10,8,22,'#667887');rect(ctx,bx+31,by+12,4,18,v.accent);
    rect(ctx,bx-3,by+12,4,17,'#343d46');
  } else if(v.family==='war'){
    rect(ctx,bx+1,by+12,5,4,'#4c5967');rect(ctx,bx+28,by+12,5,4,'#4c5967');
    px(ctx,bx+11,by+20,'#d8b24a',2);px(ctx,bx+15,by+20,'#c65a4b',2);px(ctx,bx+19,by+20,'#8aaad1',2);
  } else if(v.family==='wealth'){
    // Corona y lluvia de monedas.
    rect(ctx,bx+7,by-17,22,3,'#3b3020');rect(ctx,bx+9,by-20,4,4,v.accent);rect(ctx,bx+16,by-22,4,6,v.accent);rect(ctx,bx+23,by-20,4,4,v.accent);
    if(frame%18<4){px(ctx,bx-2,by+6,v.accent,2);px(ctx,bx+38,by+14,v.accent,2);}
  } else if(v.family==='vault'){
    rect(ctx,bx-4,by+13,5,14,'#3d365f');rect(ctx,bx+33,by+13,5,14,'#3d365f');
    ctx.globalAlpha=.45+.3*pulse;ctx.strokeStyle=v.secondary;ctx.beginPath();ctx.arc(bx+18,by+17,13+phase*3,0,Math.PI*2);ctx.stroke();
    px(ctx,bx+17,by+16,v.accent,3);ctx.globalAlpha=1;
  }

  // Accesorio único por individuo.
  switch(bossType){
    case 'comisario_pico_duro':
      ctx.fillStyle=v.secondary;ctx.translate(bx+31,by+15);ctx.rotate(-.55);ctx.fillRect(-1,-18,3,36);ctx.fillRect(-4,-18,9,3);break;
    case 'toaster_9000':
      ctx.globalAlpha=.35+.3*pulse;ctx.strokeStyle=v.accent;ctx.lineWidth=2;
      for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(bx+8+i*12,by+5,5+phase*2,Math.PI,Math.PI*2);ctx.stroke();}break;
    case 'general_ganso':
      rect(ctx,bx-5,by+8,6,17,'#475666');rect(ctx,bx+32,by+8,6,17,'#475666');break;
    case 'don_levadura':
      for(let i=0;i<3+phase;i++){const a=frame*.035+i*2.1;ctx.globalAlpha=.35;ctx.fillStyle=v.secondary;ctx.beginPath();ctx.arc(bx+18+Math.cos(a)*(14+i*2),by+20+Math.sin(a)*(8+i),2+i%2,0,Math.PI*2);ctx.fill();}break;
    case 'director_seguridad':
      for(const dx of [-9,41]){ctx.strokeStyle=v.accent;ctx.globalAlpha=.7;ctx.beginPath();ctx.arc(bx+dx,by+14,5,0,Math.PI*2);ctx.stroke();px(ctx,bx+dx-1,by+13,v.secondary,2);}break;
    case 'tax_collector':
      rect(ctx,bx+8,by+12,2,12,'#8d2331');rect(ctx,bx+11,by+12,2,12,'#8d2331');break;
    case 'sargento_migajas':
      for(let i=0;i<4;i++)rect(ctx,bx+5+i*6,by+15,3,5,i%2?v.secondary:'#7f5a36');break;
    case 'dron_centinela':
      rect(ctx,bx-8,by+7,9,2,v.accent);rect(ctx,bx+33,by+7,9,2,v.accent);
      rect(ctx,bx-6,by+4,2,8,'#8fa6ad');rect(ctx,bx+38,by+4,2,8,'#8fa6ad');break;
    case 'panadero_loco':
      ctx.globalAlpha=.5+.3*pulse;rect(ctx,bx+5,by+27,22,5,'#6d3022');rect(ctx,bx+8,by+28,16,3,v.accent);break;
    case 'head_baker':
      ctx.fillStyle='#8b5f3f';ctx.translate(bx+18,by+25);ctx.rotate(Math.sin(frame*.08)*.18);ctx.fillRect(-18,-2,36,4);break;
    case 'el_auditor':
      for(let i=0;i<3;i++){ctx.globalAlpha=.5;rect(ctx,bx-5+i*19,by-4-(i%2)*3,9,6,'#e8e0c8');px(ctx,bx-3+i*19,by-2-(i%2)*3,'#b24b4b',2);}break;
    case 'ganso_antidisturbios':
      ctx.strokeStyle=v.accent;ctx.globalAlpha=.75;ctx.strokeRect(bx+27,by+8,12,25);break;
    case 'cajero_3000':
      ctx.globalAlpha=.55+.35*pulse;rect(ctx,bx+9,by+12,16,8,'#183b32');rect(ctx,bx+11,by+14,12,4,v.accent);ctx.globalAlpha=1;break;
    case 'captain_honk':
      if(frame%20<10){px(ctx,bx+5,by-9,'#5ea4ff',3);px(ctx,bx+25,by-9,'#ff5f57',3);}break;
    case 'bread_banker':
      ctx.globalAlpha=.45+.3*pulse;ctx.strokeStyle=v.accent;ctx.beginPath();ctx.arc(bx+18,by+15,24+phase*3,0,Math.PI*2);ctx.stroke();break;
  }

  if(phaseGlow){
    ctx.globalAlpha=.4+.22*pulse;ctx.strokeStyle=phase>=2?'#ff4d54':v.accent;ctx.lineWidth=2;
    ctx.beginPath();ctx.ellipse(bx+18,by+22,23+phase*5,17+phase*4,0,0,Math.PI*2);ctx.stroke();
  }
  ctx.restore();
}

export function drawBoss(ctx: Ctx, x: number, y: number, bossType: string, frame: number, hp: number, maxHp: number, hurt: boolean, phase = 0) {
  const visual=bossVisual(bossType);
  const bob=visual ? Math.sin(frame*.075 + bossType.length)*visual.bob : 0;
  const finalRage=phase>=2 ? Math.sin(frame*.65)*.7 : 0;
  const bx = Math.floor(x + finalRage);
  const by = Math.floor(y + bob);
  const floorBoss = !!BOSSES[bossType];
  const subBoss = !!SUBBOSSES[bossType];
  if (phase > 0) {
    const pulse=.18+.08*Math.sin(frame*.16);
    ctx.save();
    ctx.globalAlpha=pulse+(floorBoss&&phase>=2?.12:0);
    ctx.fillStyle=floorBoss?(phase>=2?'#ff3b45':'#ff8a55'):subBoss?'#ed795f':'#f4d03f';
    ctx.beginPath();
    ctx.ellipse(bx+18,by+22,24+phase*5,18+phase*4,0,0,Math.PI*2);
    ctx.fill();
    ctx.restore();
  }
  
  if (hurt && Math.floor(frame) % 2 === 0) {
    ctx.globalAlpha = 0.5;
  }
  
  if (visual) {
    drawPremiumBossBody(ctx,bx,by,bossType,frame,phase,visual,floorBoss,subBoss);
  } else if (bossType === 'captain_honk') {
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
  } else {
    drawGeneratedBossBody(ctx,bx,by,bossType,frame,phase,visual??{accent:'#8aa0aa',secondary:'#e1c06b',family:'command',bob:.4},floorBoss,subBoss);
  }
  
  drawBossIdentity(ctx,bx,by,bossType,frame,phase);

  // El diseño escala visualmente con la dificultad de fase.
  if (phase >= 1) {
    const accent=subBoss?'#f09a69':floorBoss?'#ff875f':'#f4d03f';
    ctx.globalAlpha=.9;
    rect(ctx,bx-2,by+4,3,8,accent);
    rect(ctx,bx+33,by+4,3,8,accent);
    px(ctx,bx+4,by-6,accent,2);px(ctx,bx+26,by-6,accent,2);
    for(let i=0;i<3;i++){
      const t=(frame*.035+i*.33)%1;
      ctx.globalAlpha=(1-t)*.75;
      ctx.fillStyle=accent;
      ctx.fillRect(bx+4+i*11,by+34-t*(18+phase*5),2,2);
    }
    ctx.globalAlpha=1;
  }
  if (floorBoss && phase >= 2) {
    const flash=Math.sin(frame*.22)>0?'#ff4545':'#ffd166';
    // Fase final: silueta rota/agresiva, espinas y núcleo expuesto.
    rect(ctx,bx-5,by+11,5,3,flash);rect(ctx,bx+35,by+11,5,3,flash);
    rect(ctx,bx-3,by+21,4,3,'#9f2630');rect(ctx,bx+34,by+21,4,3,'#9f2630');
    px(ctx,bx+14,by-8,flash,3);px(ctx,bx+20,by-8,flash,3);
    ctx.globalAlpha=.28+.15*Math.sin(frame*.18);
    ctx.fillStyle='#ff3038';ctx.fillRect(bx+8,by+12,20,16);ctx.globalAlpha=1;
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

const POL_BLUE = '#284a70';
const POL_BLUE_L = '#4e7596';
const POL_BLUE_D = '#17293d';

function policeBadge(ctx:Ctx,x:number,y:number){
  rect(ctx,x,y,4,4,'#d6b34a');px(ctx,x+1,y+1,'#fff0a6',1);
}
function policeCap(ctx:Ctx,x:number,y:number,wide=11){
  rect(ctx,x,y+1,wide,3,POL_BLUE_D);rect(ctx,x+2,y-1,wide-4,3,POL_BLUE);rect(ctx,x+wide-2,y+3,4,1,'#101820');
  px(ctx,x+Math.floor(wide/2),y,'#d6b34a',2);
}

/** POLICÍA PATO — patrullero base con silueta de arma y chaleco claramente separados. */
export function drawPoliciaPato(ctx: Ctx, x: number, y: number, frame: number, hurt: boolean, dirX: number) {
  const bx=Math.floor(x),by=Math.floor(y),bob=Math.round(Math.sin(frame*.18));
  ctx.save();if(hurt&&Math.floor(frame)%2===0)ctx.globalAlpha=.55;
  enemyShadow(ctx,bx+8,by+18,7,.33);
  // cola y cuerpo
  rect(ctx,bx,by+9+bob,4,6,'#d7d2c8');rect(ctx,bx+3,by+7+bob,10,9,'#ece8dd');
  rect(ctx,bx+2,by+10+bob,12,6,POL_BLUE);rect(ctx,bx+4,by+11+bob,8,4,'#192430');
  policeBadge(ctx,bx+5,by+11+bob);
  // cabeza orientada
  rect(ctx,bx+4,by+2+bob,8,6,'#eeeade');enemyEye(ctx,bx+(dirX>0?9:5),by+3+bob,true);
  rect(ctx,dirX>0?bx+12:bx-2,by+5+bob,5,2,'#f0912b');
  policeCap(ctx,bx+2,by+bob,11);
  // arma al frente
  const gx=dirX>0?bx+11:bx-5;
  rect(ctx,gx,by+11+bob,8,3,'#27323b');rect(ctx,gx+(dirX>0?5:0),by+10+bob,4,2,'#485965');
  px(ctx,dirX>0?gx+8:gx-1,by+11+bob,'#9fc4d3',1);
  // radio y piernas
  rect(ctx,bx+1,by+11+bob,2,5,'#374c59');rect(ctx,bx+4,by+16,3,2,'#ef8b35');rect(ctx,bx+10,by+16,3,2,'#ef8b35');
  ctx.restore();ctx.globalAlpha=1;
}

/** POLICÍA ANTIDISTURBIOS — muro móvil con escudo de policarbonato y casco cerrado. */
export function drawPoliciaAntidisturbios(
  ctx: Ctx, x: number, y: number, frame: number, hurt: boolean,
  shieldDir: { x: number; y: number }, charging: boolean, shieldDown = false,
) {
  const bx=Math.floor(x),by=Math.floor(y),bob=Math.round(Math.sin(frame*.11));
  ctx.save();if(hurt&&Math.floor(frame)%2===0)ctx.globalAlpha=.55;
  enemyShadow(ctx,bx+11,by+23,10,.4);
  // torso pesado + placas
  rect(ctx,bx+2,by+9+bob,18,11,'#222a34');rect(ctx,bx+4,by+10+bob,14,8,'#303c49');
  rect(ctx,bx,by+10+bob,5,6,'#414e5d');rect(ctx,bx+17,by+10+bob,5,6,'#414e5d');
  rect(ctx,bx+7,by+12+bob,8,4,'#19212a');policeBadge(ctx,bx+9,by+12+bob);
  // casco + visor cian
  rect(ctx,bx+5,by+1+bob,12,7,'#e7e4db');rect(ctx,bx+4,by+bob,14,4,'#242d38');rect(ctx,bx+5,by+4+bob,12,3,'#6f91a4');
  ctx.globalAlpha=.72;rect(ctx,bx+6,by+5+bob,10,1,'#b5d9e2');ctx.globalAlpha=1;
  rect(ctx,bx+9,by+7+bob,5,2,'#ef8b35');
  // piernas
  rect(ctx,bx+5,by+19,4,3,'#d97c2d');rect(ctx,bx+13,by+19,4,3,'#d97c2d');
  // escudo orientado: más alto y con marca BREAD SEC
  const len=Math.hypot(shieldDir.x,shieldDir.y)||1;
  const sx=bx+11+(shieldDir.x/len)*12,sy=by+13+(shieldDir.y/len)*12;
  ctx.save();ctx.translate(sx,sy);ctx.rotate(Math.atan2(shieldDir.y,shieldDir.x)+Math.PI/2);
  if(shieldDown){
    ctx.globalAlpha=.45;metalEdge(ctx,-8,4,16,6,'#495561','#73818c','#272f37');
  }else{
    metalEdge(ctx,-9,-5,18,10,'#546675','#9ab0bc','#2e3943');
    ctx.globalAlpha=.3;rect(ctx,-7,-3,14,5,'#a9cfda');ctx.globalAlpha=1;
    rect(ctx,-7,2,14,2,'#d6b34a');px(ctx,-1,-1,'#f5e7a1',2);
    if(charging){ctx.globalAlpha=.35+.25*Math.sin(frame*.5);rect(ctx,-10,-6,20,12,'#ff5c50');ctx.globalAlpha=1;}
  }
  ctx.restore();
  ctx.restore();ctx.globalAlpha=1;
}

/** POLICÍA ESCOPETA — artillero de hombros anchos y arma dominante. */
export function drawPoliciaEscopeta(
  ctx: Ctx, x: number, y: number, frame: number, hurt: boolean, dirX: number, charge: number,
) {
  const bx=Math.floor(x),by=Math.floor(y),bob=Math.round(Math.sin(frame*.14));
  ctx.save();if(hurt&&Math.floor(frame)%2===0)ctx.globalAlpha=.55;
  enemyShadow(ctx,bx+9,by+19,8,.34);
  rect(ctx,bx+2,by+8+bob,14,9,POL_BLUE_D);rect(ctx,bx+1,by+11+bob,16,5,POL_BLUE);
  rect(ctx,bx+4,by+10+bob,10,5,'#151e27');rect(ctx,bx,by+9+bob,4,5,'#465665');rect(ctx,bx+15,by+9+bob,4,5,'#465665');
  // casco/gafas
  rect(ctx,bx+4,by+2+bob,9,6,'#e8e2d5');rect(ctx,bx+3,by+bob,11,3,'#21354c');rect(ctx,bx+4,by+4+bob,9,2,'#151a21');
  enemyEye(ctx,bx+(dirX>0?10:5),by+4+bob,charge>.2);
  rect(ctx,dirX>0?bx+13:bx-1,by+6+bob,4,2,'#ef8b35');
  // escopeta grande
  const gx=dirX>0?bx+10:bx-10;
  rect(ctx,gx,by+11+bob,15,3,'#513b32');rect(ctx,gx+(dirX>0?7:0),by+10+bob,8,2,'#7d6859');
  rect(ctx,gx+(dirX>0?13:-1),by+10+bob,3,5,'#262d33');
  if(charge>0){
    const mx=dirX>0?gx+17:gx-3;
    ctx.globalAlpha=.2+charge*.55;ctx.fillStyle='#ff8a43';ctx.beginPath();ctx.arc(mx,by+12+bob,2+charge*5,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=.75;rect(ctx,bx+2,by-5,Math.max(2,Math.round(14*charge)),2,'#ff5b4d');ctx.globalAlpha=1;
  }
  rect(ctx,bx+4,by+17,3,2,'#ef8b35');rect(ctx,bx+11,by+17,3,2,'#ef8b35');
  ctx.restore();ctx.globalAlpha=1;
}

/** POLICÍA RÁPIDO — interceptor ligero, piernas largas y mochila de radio. */
export function drawPoliciaRapido(ctx: Ctx, x: number, y: number, frame: number, hurt: boolean, dirX: number) {
  const bx=Math.floor(x),by=Math.floor(y),run=Math.sin(frame*.55),bob=Math.round(run);
  ctx.save();if(hurt&&Math.floor(frame)%2===0)ctx.globalAlpha=.55;
  enemyShadow(ctx,bx+7,by+16,6,.27);
  // zancada exagerada
  rect(ctx,bx+3,by+12,2,run>0?4:2,'#ef8b35');rect(ctx,bx+9,by+12,2,run>0?2:4,'#ef8b35');
  // cuerpo estrecho
  rect(ctx,bx+2,by+6+bob,10,7,POL_BLUE_L);rect(ctx,bx+4,by+8+bob,6,4,'#1b2733');policeBadge(ctx,bx+5,by+8+bob);
  rect(ctx,bx+1,by+8+bob,2,5,'#3c5365'); // radio
  // cabeza + casco aerodinámico
  rect(ctx,bx+3,by+2+bob,8,5,'#e8e3d8');rect(ctx,bx+2,by+bob,10,3,'#24435f');
  enemyEye(ctx,bx+(dirX>0?8:4),by+3+bob,false);rect(ctx,dirX>0?bx+11:bx-1,by+4+bob,4,2,'#ef8b35');
  // líneas velocidad
  ctx.globalAlpha=.3;const tx=dirX>0?bx-5:bx+13;rect(ctx,tx,by+6,5,1,'#8fc5dd');rect(ctx,tx+(dirX>0?1:-1),by+9,4,1,'#d6b34a');ctx.globalAlpha=1;
  ctx.restore();ctx.globalAlpha=1;
}

/** DRON POLICIAL — silueta de rotor gemelo, ojo central y cono de vigilancia. */
export function drawDronPolicial(ctx: Ctx, x: number, y: number, frame: number, hurt: boolean) {
  const bx=Math.floor(x),by=Math.floor(y),hover=Math.sin(frame*.15)*1.5,pulse=.55+.45*Math.sin(frame*.25);
  ctx.save();if(hurt&&Math.floor(frame)%2===0)ctx.globalAlpha=.55;
  enemyShadow(ctx,bx+8,by+22,6,.22);
  const fy=by+hover;
  // rotores
  ctx.globalAlpha=.45;const spin=frame%4<2?7:4;rect(ctx,bx-4,fy+1,spin*2,1,'#bccbd2');rect(ctx,bx+10,fy+1,spin*2,1,'#bccbd2');ctx.globalAlpha=1;
  rect(ctx,bx,fy+3,16,2,'#3a4853');rect(ctx,bx+3,fy+4,10,8,'#465967');
  metalEdge(ctx,bx+4,fy+5,8,5,'#607785','#9fb5bd','#31424c');
  // ojo central y luces
  ctx.globalAlpha=.55+.35*pulse;enemyEye(ctx,bx+7,fy+8,true);ctx.globalAlpha=1;
  px(ctx,bx+2,fy+4,frame%20<10?'#4f8fd4':'#ff5b50',2);px(ctx,bx+12,fy+4,frame%20<10?'#ff5b50':'#4f8fd4',2);
  // foco/arma
  rect(ctx,bx+6,fy+12,4,3,'#242d35');
  ctx.globalAlpha=.12+.08*pulse;ctx.fillStyle='#e7d98b';ctx.beginPath();ctx.moveTo(bx+7,fy+15);ctx.lineTo(bx+1,fy+24);ctx.lineTo(bx+15,fy+24);ctx.closePath();ctx.fill();ctx.globalAlpha=1;
  ctx.restore();ctx.globalAlpha=1;
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
  const bx=Math.floor(x),by=Math.floor(y),bob=Math.round(Math.sin(frame*.24));
  ctx.save();if(hurt&&Math.floor(frame)%2===0)ctx.globalAlpha=.55;
  enemyShadow(ctx,bx+8,by+17,7,.3);
  // capa/sombra de asesino
  ctx.fillStyle='#17171d';ctx.beginPath();ctx.moveTo(bx+2,by+8+bob);ctx.lineTo(bx+14,by+8+bob);ctx.lineTo(bx+12,by+17);ctx.lineTo(bx+4,by+17);ctx.closePath();ctx.fill();
  // cuerpo croissant segmentado
  ctx.fillStyle='#b96f3f';ctx.beginPath();ctx.arc(bx+8,by+9+bob,8,.05,Math.PI-.05);ctx.lineTo(bx+3,by+12+bob);ctx.arc(bx+8,by+12+bob,5.5,Math.PI,0,true);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#e0a05c';ctx.lineWidth=2;
  for(const dx of [-4,0,4]){ctx.beginPath();ctx.arc(bx+8+dx*.45,by+9+bob,5.5-Math.abs(dx)*.15,.45,2.7);ctx.stroke();}
  // ojos y máscara
  rect(ctx,bx+3,by+6+bob,10,3,'#18151a');enemyEye(ctx,bx+4,by+6+bob,true);enemyEye(ctx,bx+10,by+6+bob,true);
  // boina criminal
  rect(ctx,bx+2,by+2+bob,10,3,'#20242b');rect(ctx,bx+5,by+bob,7,3,'#2b3038');crownMark(ctx,bx+6,by+bob,'#d9ad47');
  // cuchillo lateral: comunica flanqueo
  ctx.save();ctx.translate(bx+13,by+13+bob);ctx.rotate(-.55);
  rect(ctx,0,-1,8,2,'#aeb7bd');px(ctx,7,-1,'#e4ecef',2);rect(ctx,-3,-1,4,3,'#2b2524');ctx.restore();
  // migas en movimiento
  if(frame%8<4){px(ctx,bx,by+15,'#d9a15e',1);px(ctx,bx+15,by+13,'#e5bd79',1);}
  ctx.restore();ctx.globalAlpha=1;
}

export function drawBankerChicken(ctx: Ctx, x: number, y: number, frame: number, hurt: boolean) {
  const bx=Math.floor(x),by=Math.floor(y),bob=Math.round(Math.sin(frame*.11)),pulse=.55+.45*Math.sin(frame*.18);
  ctx.save();if(hurt&&Math.floor(frame)%2===0)ctx.globalAlpha=.55;
  enemyShadow(ctx,bx+9,by+20,8,.34);
  // cola y cuerpo formal
  rect(ctx,bx,by+9+bob,4,7,'#e6dfcb');rect(ctx,bx+3,by+8+bob,12,10,'#efe9d8');
  rect(ctx,bx+3,by+11+bob,12,7,'#252c36');rect(ctx,bx+5,by+12+bob,3,6,'#333c48');rect(ctx,bx+10,by+12+bob,3,6,'#333c48');
  rect(ctx,bx+8,by+11+bob,2,7,'#b84e4e');px(ctx,bx+8,by+12+bob,'#e5bd45',2);
  // cabeza banquera
  rect(ctx,bx+4,by+3+bob,9,7,'#f3eedf');enemyEye(ctx,bx+10,by+5+bob,false);
  rect(ctx,bx+12,by+7+bob,5,2,'#ef8b35');
  // sombrero de copa
  rect(ctx,bx+3,by+bob,11,3,'#1b2027');rect(ctx,bx+5,by-4+bob,7,5,'#252b34');crownMark(ctx,bx+5,by-3+bob,'#e5bd45');
  // monóculo
  ctx.strokeStyle='#d8b84f';ctx.lineWidth=1;ctx.beginPath();ctx.arc(bx+10,by+5+bob,2.5,0,Math.PI*2);ctx.stroke();rect(ctx,bx+12,by+7+bob,1,5,'#d8b84f');
  // bastón/terminal financiero
  rect(ctx,bx+16,by+8+bob,2,10,'#8a672c');ctx.fillStyle='#e5bd45';ctx.beginPath();ctx.arc(bx+17,by+7+bob,3,0,Math.PI*2);ctx.fill();px(ctx,bx+16,by+6+bob,'#fff0a2',1);
  // billetes orbitales
  ctx.globalAlpha=.6+.25*pulse;
  for(let i=0;i<3;i++){const a=frame*.035+i*2.1;const mx=bx+9+Math.cos(a)*11,my=by+9+bob+Math.sin(a)*8;rect(ctx,mx-2,my-1,4,3,'#6fb277');px(ctx,mx-1,my,'#d8efc1',1);}
  ctx.globalAlpha=1;
  rect(ctx,bx+5,by+18,3,2,'#ef8b35');rect(ctx,bx+11,by+18,3,2,'#ef8b35');
  ctx.restore();ctx.globalAlpha=1;
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
