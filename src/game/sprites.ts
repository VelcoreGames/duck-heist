// Pixel art sprite renderer using canvas
// All sprites are drawn procedurally - no external assets needed

import { TILE_SIZE, ART_SCALE, ART_PIXEL } from './constants';
import { getSkin, BOSSES, SUBBOSSES, MINIBOSSES, type DuckPalette, type BossDef } from './data';
import { drawItemIcon } from './itemArt';
import type { BossPartState } from './types';

type Ctx = CanvasRenderingContext2D;

// Todas las figuras procedurales pueden colocarse ahora en una rejilla de
// cuarto de píxel lógico. Con el backing canvas 4x cada paso equivale a un
// píxel físico real y no altera ninguna coordenada de gameplay.
const artSnap=(v:number)=>Math.round(v*ART_SCALE)/ART_SCALE;
const artSize=(v:number)=>Math.max(ART_PIXEL,Math.round(v*ART_SCALE)/ART_SCALE);
function px(ctx: Ctx, x: number, y: number, color: string, s: number = 1) {
  ctx.fillStyle = color;
  ctx.fillRect(artSnap(x), artSnap(y), artSize(s), artSize(s));
}

function rect(ctx: Ctx, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(artSnap(x), artSnap(y), artSize(w), artSize(h));
}

function microRect(ctx:Ctx,x:number,y:number,w:number,h:number,color:string){
  ctx.fillStyle=color;
  ctx.fillRect(artSnap(x),artSnap(y),artSize(w),artSize(h));
}

function mixHex(color:string,target:string,amount:number){
  const parse=(v:string)=>{
    const h=v.replace('#','');
    if(h.length!==6)return [255,255,255];
    return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];
  };
  const a=parse(color),b=parse(target),t=Math.max(0,Math.min(1,amount));
  return '#'+a.map((v,i)=>Math.round(v+(b[i]-v)*t).toString(16).padStart(2,'0')).join('');
}
const skinLight=(c:string,a=.34)=>mixHex(c,'#fff8df',a);
const skinDark=(c:string,a=.48)=>mixHex(c,'#070b0f',a);

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
  shooting = false, dead = false, pal: DuckPaletteLike = DEFAULT_DUCK, aiming = false,
) {
  const bx = Math.floor(x);
  const by = Math.floor(y);
  const bodyLight=skinLight(pal.body,.34);
  const bodyRim=skinLight(pal.body,.20);
  const outline=skinDark(pal.shade,.62);
  const packLight=skinLight(pal.pack,.18);
  const beakLight=skinLight(pal.beak,.24);

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
    microRect(ctx,bx+1.5,by+9.25,10.5,.25,'rgba(255,255,255,.16)');
    microRect(ctx,bx+15.25,by+7.25,2,.5,'rgba(255,230,170,.32)');
    ctx.restore();
    return;
  }

  if (hurt && Math.floor(frame * 0.5) % 2 === 0) ctx.globalAlpha = 0.45;
  if (dashing) ctx.globalAlpha = 0.75;

  // El pato nunca queda completamente rígido: respiración muy sutil en idle,
  // paso más marcado al moverse y tensión corporal al disparar/dashear.
  const idleBreath=!moving&&!dashing&&!shooting&&Math.sin(frame*.06)>.72?1:0;
  const gait=moving?Math.sin(frame*.38):0;
  const waddle=moving?Math.round(gait):idleBreath;
  const step=moving?gait:0;
  const blink=(frame%190)<7;
  const idleLook=!aiming&&!moving&&!dashing&&!shooting&&frame%260>205&&frame%260<250;
  const headNudge=idleLook?(frame%260<228?-1:1):0;

  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  ctx.fillRect(bx + 2, by + 16, 12, 3);
  ctx.fillRect(bx + 3, by + 19, 10, 1);

  const footA=moving?(step>0?1:-1):0;
  const footLift=moving&&Math.abs(step)>.55?1:0;
  const fyA=by+15-footLift*(step>0?1:0),fyB=by+15-footLift*(step<0?1:0);
  rect(ctx,bx+2-footA,fyA-1,5,4,outline);
  rect(ctx,bx+9+footA,fyB-1,5,4,outline);
  rect(ctx,bx+3-footA,fyA,3,3,pal.beak);
  rect(ctx,bx+3-footA,fyA,2,1,beakLight);
  rect(ctx,bx+2-footA,fyA+2,5,1,pal.beakDark);
  rect(ctx,bx+10+footA,fyB,3,3,pal.beak);
  rect(ctx,bx+10+footA,fyB,2,1,beakLight);
  rect(ctx,bx+9+footA,fyB+2,5,1,pal.beakDark);
  if(moving&&Math.abs(step)>.72){
    ctx.globalAlpha=.20;rect(ctx,bx+(step>0?1:12),by+18,3,1,'#e8d98f');ctx.globalAlpha=1;
  }

  // Contorno común para todas las skins. Se pinta debajo del material real y
  // mejora la lectura del personaje sobre pisos claros, efectos y UI pequeña.
  rect(ctx,bx+2,by+5+waddle,12,11,outline);
  rect(ctx,bx+1,by+8+waddle,14,6,outline);

  if (dir === 'up') {
    rect(ctx, bx + 3, by + 5, 10, 9, pal.pack);
    rect(ctx, bx + 4, by + 6, 8, 3, packLight);
    rect(ctx, bx + 6, by + 10, 4, 2, pal.strap);
  }

  rect(ctx, bx + 3, by + 6 + waddle, 10, 9, pal.body);
  rect(ctx, bx + 2, by + 8 + waddle, 12, 5, pal.body);
  rect(ctx, bx + 3, by + 12 + waddle, 10, 3, pal.dark);
  rect(ctx,bx+4,by+14+waddle,8,1,pal.shade);
  rect(ctx,bx+4,by+6+waddle,6,1,bodyLight);
  rect(ctx,bx+3,by+8+waddle,1,4,bodyRim);
  rect(ctx,bx+12,by+9+waddle,1,4,pal.shade);
  if(moving){
    const tail=step>0?1:0;
    if(dir==='left')rect(ctx,bx+13+tail,by+11+waddle,3,2,pal.shade);
    else if(dir==='right')rect(ctx,bx-tail,by+11+waddle,3,2,pal.shade);
    else rect(ctx,bx+6+(step>0?1:-1),by+14+waddle,4,2,pal.shade);
  }
  rect(ctx, bx + 4, by + 7 + waddle, 3, 1, bodyLight);
  rect(ctx, bx + 11, by + 8 + waddle, 1, 4, 'rgba(255,255,255,.18)');

  // Ala expresiva: acompaña disparo, dash y caminata sin cambiar la silueta base.
  const wingKick = shooting ? 2 : dashing ? 1 : moving && Math.abs(step) > .55 ? 1 : 0;
  if (dir === 'left') {
    rect(ctx, bx + 10 + wingKick, by + 9 + waddle, 4, 3, pal.shade);
    if (shooting) px(ctx, bx + 13 + wingKick, by + 8 + waddle, bodyLight, 1);
  } else if (dir === 'right') {
    rect(ctx, bx + 2 - wingKick, by + 9 + waddle, 4, 3, pal.shade);
    if (shooting) px(ctx, bx + 2 - wingKick, by + 8 + waddle, bodyLight, 1);
  } else if (dir === 'down' && shooting) {
    rect(ctx, bx + 1, by + 10 + waddle, 3, 2, pal.shade);
    rect(ctx, bx + 12, by + 10 + waddle, 3, 2, pal.shade);
  }

  if (dir !== 'up') {
    rect(ctx, bx + 5, by + 7 + waddle, 1, 6, pal.strap);
    rect(ctx, bx + 10, by + 7 + waddle, 1, 6, pal.strap);
  }
  if (dir === 'left') { rect(ctx, bx + 11, by + 7 + waddle, 4, 6, pal.pack); rect(ctx, bx + 12, by + 8 + waddle, 2, 2, packLight); }
  if (dir === 'right') { rect(ctx, bx + 1, by + 7 + waddle, 4, 6, pal.pack); rect(ctx, bx + 2, by + 8 + waddle, 2, 2, packLight); }

  const hy=by+2+waddle;
  const hx=headNudge+(shooting?(dir==='left'?-1:dir==='right'?1:0):0);
  rect(ctx,bx+3+hx,hy-1,10,8,outline);
  rect(ctx,bx+2+hx,hy,12,6,outline);
  rect(ctx,bx+4+hx,hy,8,6,pal.body);
  rect(ctx,bx+3+hx,hy+1,10,4,pal.body);
  rect(ctx,bx+4+hx,hy,6,1,bodyLight);
  rect(ctx,bx+3+hx,hy+1,1,3,bodyRim);

  if (dir === 'up') {
    rect(ctx,bx+3+hx,hy+1,10,3,pal.mask);
    rect(ctx,bx+5+hx,hy+4,6,2,pal.dark);
    rect(ctx, bx + 6, by + 13 + waddle, 4, 3, pal.shade);
  } else if (dir === 'down') {
    rect(ctx,bx+3+hx,hy+1,10,3,pal.mask);
    rect(ctx,bx+2+hx,hy+1,1,2,pal.mask);
    rect(ctx,bx+13+hx,hy+1,1,2,pal.mask);
    if (!blink) {
      rect(ctx,bx+5+hx,hy+2,2,2,'#fff');
      rect(ctx,bx+9+hx,hy+2,2,2,'#fff');
      px(ctx,bx+6+hx,hy+2,'#0a0a0a',1);
      px(ctx,bx+10+hx,hy+2,'#0a0a0a',1);
    } else {
      rect(ctx,bx+5+hx,hy+3,2,1,'#0a0a0a');
      rect(ctx,bx+9+hx,hy+3,2,1,'#0a0a0a');
    }
    rect(ctx,bx+6+hx,hy+5,4,2,pal.beak);
    rect(ctx,bx+6+hx,hy+5,3,1,beakLight);
    rect(ctx,bx+6+hx,hy+6,4,1,pal.beakDark);
  } else {
    const flip = dir === 'left';
    const fx=(v:number)=>(flip?bx+15-v:bx+v)+hx;
    rect(ctx,bx+3+hx,hy+1,10,3,pal.mask);
    if (!blink) {
      rect(ctx, fx(9), hy + 2, 2, 2, '#fff');
      px(ctx, fx(10), hy + 2, '#0a0a0a', 1);
    } else {
      rect(ctx, fx(9), hy + 3, 2, 1, '#0a0a0a');
    }
    const bxp=(flip?bx-2:bx+12)+hx;
    rect(ctx, bxp, hy + 4, 5, 2, pal.beak);
    rect(ctx, bxp + (flip ? 1 : 0), hy + 4, 3, 1, beakLight);
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
    rect(ctx, bx + 2, by + 8, 12, 5, bodyLight);
  }

  // Pasada de microdetalle 4x. Son trazos de 1–2 píxeles físicos que antes
  // no cabían en el sprite 16x20: volumen de pico/pluma, pupila y costuras.
  ctx.globalAlpha=Math.min(1,ctx.globalAlpha);
  const microY=waddle*.25;
  if(dir==='down'){
    microRect(ctx,bx+5.25+hx,hy+2.25,1.25,.25,'rgba(255,255,255,.72)');
    microRect(ctx,bx+9.25+hx,hy+2.25,1.25,.25,'rgba(255,255,255,.72)');
    if(!blink){microRect(ctx,bx+6.25+hx,hy+2.5,.5,.5,'#050608');microRect(ctx,bx+10.25+hx,hy+2.5,.5,.5,'#050608');}
    microRect(ctx,bx+6.5+hx,hy+5.25,3,.25,'rgba(255,224,160,.68)');
    microRect(ctx,bx+6.75+hx,hy+6.5,2.5,.25,'rgba(92,45,16,.45)');
  }else if(dir==='left'||dir==='right'){
    const eyeX=dir==='left'?bx+5.25+hx:bx+9.75+hx;
    if(!blink)microRect(ctx,eyeX,hy+2.4,.55,.55,'#050608');
    const beakX=dir==='left'?bx-1.75+hx:bx+13+hx;
    microRect(ctx,beakX,hy+4.25,3.75,.25,'rgba(255,224,160,.64)');
  }
  microRect(ctx,bx+4.25,by+7.25+waddle+microY,2.5,.25,'rgba(255,255,210,.34)');
  microRect(ctx,bx+11.25,by+8.25+waddle+microY,.25,3,'rgba(255,255,255,.22)');
  if(dir!=='up'){
    microRect(ctx,bx+5.25,by+8+waddle,.25,4.5,'rgba(255,255,255,.12)');
    microRect(ctx,bx+10.5,by+8+waddle,.25,4.5,'rgba(0,0,0,.24)');
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

/** Capas posteriores que cambian la silueta sin tapar la lectura del pato. */
function drawSkinBackLayer(
  ctx:Ctx,bx:number,by:number,frame:number,overlay:string,accent:string,trim:string,metal:string,
  dir:DuckDir,moving:boolean,dashing:boolean,shooting:boolean,
){
  const idleBreath=!moving&&!dashing&&!shooting&&Math.sin(frame*.06)>.72?1:0;
  const bob=moving?Math.round(Math.sin(frame*.38)):idleBreath;
  ctx.save();ctx.translate(0,bob);
  switch(overlay){
    case 'robber':
      // Pañuelo de atracador: el nudo asoma siempre por un lado de la silueta.
      rect(ctx,bx+(dir==='left'?12:1),by+5,3,2,accent);
      rect(ctx,bx+(dir==='left'?14:0),by+6,2,4,accent);
      break;
    case 'fedora':
      // Faldones de abrigo, anchos pero cortos para no confundirse con hitbox.
      rect(ctx,bx+2,by+12,12,5,'#1b1c23');
      rect(ctx,bx+1,by+14,4,3,'#252630');
      rect(ctx,bx+11,by+14,4,3,'#252630');
      break;
    case 'prison':
      // Cadena del grillete convertida en trofeo.
      rect(ctx,bx+12,by+14,2,2,metal);px(ctx,bx+14,by+15,metal,1);px(ctx,bx+15,by+16,metal,1);
      break;
    case 'chef':
      // Lazos del delantal.
      rect(ctx,bx+1,by+11,3,2,trim);rect(ctx,bx+12,by+11,3,2,trim);
      break;
    case 'executive':
      // Chaqueta ligeramente más larga y maletín que rompe la silueta lateral.
      rect(ctx,bx+2,by+12,12,4,'#222b39');
      rect(ctx,bx+(dir==='left'?-2:13),by+9,5,6,'#382719');
      rect(ctx,bx+(dir==='left'?-1:14),by+8,3,1,metal);
      break;
    case 'rose':
      // Bomber corta con hombros muy legibles.
      rect(ctx,bx+1,by+8,3,5,'#7e365f');rect(ctx,bx+12,by+8,3,5,'#7e365f');
      break;
    case 'ninja':
      // Dos colas de cinta carmesí siguen el movimiento.
      {const sway=moving?Math.round(Math.sin(frame*.42)*2):0;
      rect(ctx,bx+(dir==='left'?13:1),by+3,4,2,accent);
      rect(ctx,bx+(dir==='left'?15:-2),by+4+sway,4,1,accent);}
      break;
    case 'undercover':
      // Antena/radio visible desde espalda y perfil.
      rect(ctx,bx+(dir==='left'?12:2),by+7,3,6,'#1c293d');
      rect(ctx,bx+(dir==='left'?14:1),by+4,1,5,metal);
      break;
    case 'pirate':
      // Abrigo abierto con dos faldones.
      rect(ctx,bx+1,by+11,4,6,'#37231e');rect(ctx,bx+11,by+11,4,6,'#37231e');
      rect(ctx,bx+2,by+15,3,2,accent);rect(ctx,bx+11,by+15,3,2,accent);
      break;
    case 'gold':
      // Placas posteriores de lingote.
      rect(ctx,bx+1,by+8,3,6,'#b98522');rect(ctx,bx+12,by+8,3,6,'#b98522');
      px(ctx,bx+2,by+9,trim,1);px(ctx,bx+13,by+9,trim,1);
      break;
    case 'king':
      // Capa amplia: es la silueta más grande del armario.
      rect(ctx,bx,by+6,16,10,accent);
      rect(ctx,bx-1,by+9,3,8,accent);rect(ctx,bx+14,by+9,3,8,accent);
      rect(ctx,bx,by+15,16,2,trim);
      px(ctx,bx+2,by+15,'#161015',1);px(ctx,bx+7,by+15,'#161015',1);px(ctx,bx+12,by+15,'#161015',1);
      break;
  }
  ctx.restore();
}

function drawSkinDeathAccessory(
  ctx:Ctx,bx:number,by:number,overlay:string,accent:string,trim:string,metal:string,
){
  // El game-over conserva la identidad: el accesorio cae junto al personaje
  // en vez de desaparecer al activar el sprite de muerte.
  switch(overlay){
    case 'robber':rect(ctx,bx-2,by+13,7,2,accent);px(ctx,bx-3,by+14,accent,2);break;
    case 'fedora':rect(ctx,bx-3,by+13,10,2,'#15161d');rect(ctx,bx,by+10,6,3,'#23242d');rect(ctx,bx,by+12,6,1,accent);break;
    case 'prison':rect(ctx,bx-2,by+14,3,2,metal);px(ctx,bx+1,by+15,metal,1);px(ctx,bx+3,by+15,metal,1);break;
    case 'chef':rect(ctx,bx-3,by+11,9,3,trim);rect(ctx,bx-1,by+8,5,3,'#ffffff');break;
    case 'executive':rect(ctx,bx-4,by+10,7,6,'#382719');rect(ctx,bx-3,by+9,5,1,metal);break;
    case 'rose':rect(ctx,bx-3,by+11,8,2,accent);px(ctx,bx,by+10,trim,1);break;
    case 'ninja':rect(ctx,bx-4,by+12,9,2,accent);rect(ctx,bx+3,by+13,4,1,accent);break;
    case 'undercover':rect(ctx,bx-3,by+11,9,3,'#304b75');rect(ctx,bx-1,by+9,6,2,'#203653');px(ctx,bx+1,by+11,accent,1);break;
    case 'pirate':rect(ctx,bx-4,by+10,10,4,'#21191a');rect(ctx,bx-2,by+8,6,3,'#302326');px(ctx,bx+1,by+10,trim,1);break;
    case 'gold':rect(ctx,bx-3,by+11,8,3,'#c89229');rect(ctx,bx-1,by+10,4,1,trim);px(ctx,bx+4,by+10,metal,1);break;
    case 'king':rect(ctx,bx-4,by+10,9,3,metal);px(ctx,bx-3,by+8,metal,2);px(ctx,bx,by+7,metal,2);px(ctx,bx+3,by+8,metal,2);break;
  }
}

function drawSkinMaterialPass(
  ctx:Ctx,bx:number,by:number,frame:number,overlay:string,accent:string,trim:string,metal:string,
  dir:DuckDir,moving:boolean,
){
  // Microdetalle 4x compartido: costuras, rebotes de luz y metal. Mantiene el
  // diseño de cada skin, pero evita que ropa/accesorios se lean como bloques planos.
  const front=dir==='down',back=dir==='up',side=dir==='left'||dir==='right';
  const bob=moving?Math.round(Math.sin(frame*.38)):0;
  ctx.save();ctx.translate(0,bob);
  ctx.globalAlpha=.34;
  if(!back){
    microRect(ctx,bx+4.25,by+7.25,7.5,.25,'rgba(255,255,255,.34)');
    microRect(ctx,bx+3.25,by+13.5,8.5,.25,'rgba(0,0,0,.28)');
  }
  if(front){
    microRect(ctx,bx+5.25,by+8.25,.25,4.5,'rgba(255,255,255,.20)');
    microRect(ctx,bx+10.5,by+8.25,.25,4.5,'rgba(0,0,0,.24)');
  }else if(side){
    const edge=dir==='left'?bx+3.25:bx+12.5;
    microRect(ctx,edge,by+8.25,.25,4,'rgba(255,255,255,.24)');
  }
  ctx.globalAlpha=.58;
  const glint=(frame+overlay.length*11)%72<8;
  if(glint){
    const gx=dir==='left'?bx+4.25:bx+11.25;
    microRect(ctx,gx,by+9.25,.5,.5,metal);
  }
  // Firma cromática mínima por familia de skin.
  ctx.globalAlpha=.48;
  if(overlay==='ninja'||overlay==='pirate'||overlay==='robber')microRect(ctx,bx+4.5,by+6.25,7,.25,accent);
  else if(overlay==='executive'||overlay==='fedora')microRect(ctx,bx+5.25,by+12.25,5.5,.25,trim);
  else if(overlay==='gold'||overlay==='king')microRect(ctx,bx+3.75,by+6.5,8.5,.25,trim);
  else if(overlay==='rose'||overlay==='undercover')microRect(ctx,bx+4.25,by+13.25,7.5,.25,accent);
  else if(overlay==='chef'||overlay==='prison')microRect(ctx,bx+5,by+8.25,6,.25,trim);
  ctx.restore();
}

/** Pato con skin cosmética completa: silueta + ropa + accesorios + estados. */
export function drawDuckSkin(
  ctx: Ctx, x: number, y: number, frame: number,
  skinId: string, dir: DuckDir = 'down', moving = false, hurt = false,
  dashing = false, shooting = false, dead = false, aiming = false,
) {
  const skin = getSkin(skinId);
  const pal: DuckPaletteLike = skin?.palette ?? DEFAULT_DUCK;
  const bx=Math.floor(x),by=Math.floor(y);
  const accent=skin?.accent ?? '#c9473b';
  const trim=skin?.trim ?? '#ead77c';
  const metal=skin?.metal ?? '#aeb8b8';
  const overlay=skin?.overlay ?? 'robber';

  if(!dead)drawSkinBackLayer(ctx,bx,by,frame,overlay,accent,trim,metal,dir,moving,dashing,shooting);
  drawDuck(ctx, x, y, frame, dir, moving, hurt, dashing, shooting, dead, pal, aiming);
  if(dead){drawSkinDeathAccessory(ctx,bx,by,overlay,accent,trim,metal);return;}

  const idleBreath=!moving&&!dashing&&!shooting&&Math.sin(frame*.06)>.72?1:0;
  const overlayBob=moving?Math.round(Math.sin(frame*.38)):idleBreath;
  const front=dir==='down',back=dir==='up',left=dir==='left',right=dir==='right';

  ctx.save();ctx.translate(0,overlayBob);
  switch (overlay) {
    case 'robber':
      // Beanie bajo + pañuelo + arnés de herramientas: identidad del héroe base.
      rect(ctx,bx+4,by-1,8,2,'#20242a');rect(ctx,bx+3,by+1,10,1,'#11151a');
      rect(ctx,bx+3,by+6,10,2,accent);
      if(front){rect(ctx,bx+7,by+7,2,5,'#34231f');px(ctx,bx+7,by+10,metal,2);rect(ctx,bx+11,by+11,3,3,'#4a3024');px(ctx,bx+12,by+12,metal,1);}
      else if(back){rect(ctx,bx+5,by+7,1,6,trim);rect(ctx,bx+10,by+7,1,6,trim);px(ctx,bx+7,by+9,metal,2);}
      else {rect(ctx,bx+(left?11:2),by+8,3,5,'#4a3024');px(ctx,bx+(left?12:3),by+9,metal,1);}
      break;

    case 'fedora':
      // Fedora más ancho, cinta vino, traje a rayas y cadena real.
      rect(ctx,bx,by-1,16,2,'#111219');rect(ctx,bx+3,by-5,10,5,'#20212a');
      rect(ctx,bx+4,by-2,8,1,accent);px(ctx,bx+11,by-2,metal,1);
      if(!back){
        rect(ctx,bx+3,by+7,10,7,'#242630');
        if(front){rect(ctx,bx+6,by+7,4,3,'#e8e1d4');rect(ctx,bx+7,by+8,2,5,accent);}
        for(let yy=8;yy<=13;yy+=3){px(ctx,bx+5,by+yy,'#4a4b58',1);px(ctx,bx+11,by+yy,'#4a4b58',1);}
        rect(ctx,bx+4,by+13,8,1,trim);px(ctx,bx+7,by+14,metal,2);
      }
      break;

    case 'prison':
      // Mono de preso con franjas, placa e improvisaciones de fuga.
      rect(ctx,bx+3,by+7,10,8,'#dd741f');
      rect(ctx,bx+3,by+8,10,1,trim);rect(ctx,bx+3,by+11,10,1,trim);rect(ctx,bx+3,by+14,10,1,trim);
      if(front){rect(ctx,bx+4,by+9,3,2,'#342f2c');px(ctx,bx+5,by+9,trim,1);rect(ctx,bx+9,by+8,3,3,'#bc5c19');}
      if(left||right){rect(ctx,bx+(left?11:2),by+8,2,5,'#7d3c18');}
      rect(ctx,bx+11,by+15,3,1,metal);px(ctx,bx+14,by+15,metal,1);
      break;

    case 'chef':
      // Toque alto, chaqueta cruzada, botones y pañuelo de cocina.
      rect(ctx,bx+2,by-2,12,3,'#e2e5e3');rect(ctx,bx+3,by-7,10,6,'#faf7ee');
      rect(ctx,bx+5,by-9,6,3,'#ffffff');rect(ctx,bx+4,by-6,2,4,'#d8dddc');rect(ctx,bx+9,by-6,2,4,'#d8dddc');
      rect(ctx,bx+4,by+6,8,2,accent);
      if(!back){rect(ctx,bx+3,by+8,10,7,trim);rect(ctx,bx+7,by+8,1,6,'#d1d7d6');}
      if(front){for(const yy of [9,12]){px(ctx,bx+6,by+yy,metal,1);px(ctx,bx+9,by+yy,metal,1);}rect(ctx,bx+11,by+10,2,4,'#b67842');px(ctx,bx+12,by+9,metal,1);}
      break;

    case 'executive':
      // Traje anguloso, lapelas, corbata y reloj.
      if(!back){
        rect(ctx,bx+3,by+7,10,8,'#283445');
        if(front){
          rect(ctx,bx+5,by+7,6,3,trim);
          rect(ctx,bx+7,by+8,2,6,accent);px(ctx,bx+8,by+14,accent,1);
          rect(ctx,bx+3,by+8,3,5,'#344156');rect(ctx,bx+10,by+8,3,5,'#344156');
          px(ctx,bx+12,by+12,metal,1);
        }
      }
      rect(ctx,bx+(left?0:13),by+9,5,5,'#3a281a');rect(ctx,bx+(left?1:14),by+8,3,1,metal);px(ctx,bx+(left?2:15),by+11,metal,1);
      break;

    case 'rose':
      // Bomber magenta, visor cian y emblema corazón.
      rect(ctx,bx+3,by+7,10,7,'#8f3a70');rect(ctx,bx+4,by+8,8,1,'#b64e87');
      if(front){rect(ctx,bx+7,by+8,2,6,accent);px(ctx,bx+5,by+10,trim,1);px(ctx,bx+6,by+11,trim,1);px(ctx,bx+5,by+12,trim,1);}
      if(!back){ctx.globalAlpha=.75;rect(ctx,bx+4,by+3,8,2,accent);ctx.globalAlpha=1;px(ctx,bx+10,by+3,'#e9ffff',1);}
      rect(ctx,bx+3,by+14,10,1,trim);
      break;

    case 'ninja':
      // Capucha segmentada, única ventana de ojos y vendas de antebrazo.
      rect(ctx,bx+3,by-1,10,3,'#0e1116');rect(ctx,bx+2,by+1,12,4,'#141820');
      rect(ctx,bx+3,by+3,10,2,accent);
      if(front){rect(ctx,bx+4,by+2,8,2,'#090b0f');rect(ctx,bx+5,by+2,2,1,'#e8eceb');rect(ctx,bx+9,by+2,2,1,'#e8eceb');}
      rect(ctx,bx+3,by+9,3,1,trim);rect(ctx,bx+10,by+9,3,1,trim);
      rect(ctx,bx+4,by+13,8,1,'#3a4049');px(ctx,bx+12,by+12,metal,1);
      break;

    case 'undercover':
      // Gorra de policía, placa, gabardina y el bigote imposible.
      rect(ctx,bx+2,by-1,12,3,'#304e7a');rect(ctx,bx+4,by-3,8,3,'#203653');rect(ctx,bx+5,by-1,6,1,trim);px(ctx,bx+7,by-2,accent,2);
      rect(ctx,bx+3,by+7,10,8,'#354b6a');rect(ctx,bx+4,by+8,8,1,'#55749b');
      if(front){px(ctx,bx+5,by+10,accent,2);rect(ctx,bx+5,by+7,6,1,metal);rect(ctx,bx+4,by+7,3,2,'#17191f');rect(ctx,bx+9,by+7,3,2,'#17191f');}
      else if(left||right){rect(ctx,bx+(left?3:10),by+6,4,2,'#17191f');}
      px(ctx,bx+12,by+9,metal,1);
      break;

    case 'pirate':
      // Tricornio asimétrico, parche, pañuelo, sash y herraje de latón.
      rect(ctx,bx,by-3,16,3,'#1d181a');rect(ctx,bx+3,by-6,10,4,'#2a2225');rect(ctx,bx-1,by-4,4,3,'#1d181a');rect(ctx,bx+13,by-4,4,3,'#1d181a');
      px(ctx,bx+7,by-3,trim,2);px(ctx,bx+8,by-4,trim,1);
      rect(ctx,bx+3,by+7,10,2,accent);rect(ctx,bx+3,by+12,10,2,'#3b261d');px(ctx,bx+7,by+12,metal,2);
      if(front){rect(ctx,bx+4,by+3,3,3,'#07080b');rect(ctx,bx+3,by+2,6,1,'#07080b');}
      if(right){rect(ctx,bx+13,by+10,2,4,metal);px(ctx,bx+14,by+14,metal,1);}
      if(left){rect(ctx,bx+1,by+10,2,4,metal);px(ctx,bx+1,by+14,metal,1);}
      break;

    case 'gold':
      // Sin corona: placas de lingote, visor claro y cierres de bóveda.
      ctx.globalAlpha=.24+.08*Math.sin(frame*.12);rect(ctx,bx+1,by+6,14,9,accent);ctx.globalAlpha=1;
      rect(ctx,bx+2,by+7,4,3,'#bd8b25');rect(ctx,bx+10,by+7,4,3,'#bd8b25');
      if(!back){rect(ctx,bx+4,by+2,8,2,accent);px(ctx,bx+5,by+2,'#ffffff',1);px(ctx,bx+10,by+2,'#ffffff',1);}
      if(front){rect(ctx,bx+5,by+10,6,3,'#c99529');rect(ctx,bx+6,by+10,4,1,trim);px(ctx,bx+7,by+12,metal,2);}
      px(ctx,bx+2,by+5,metal,1);px(ctx,bx+13,by+11,metal,1);
      break;

    case 'king':
      // Corona alta y capa visible también de frente: el cosmético final domina la silueta.
      rect(ctx,bx+3,by-4,10,4,metal);rect(ctx,bx+3,by-7,2,4,metal);rect(ctx,bx+7,by-8,2,5,trim);rect(ctx,bx+11,by-7,2,4,metal);
      px(ctx,bx+5,by-2,'#d84d5b',2);px(ctx,bx+9,by-2,'#4f9dd8',2);
      rect(ctx,bx+2,by+6,12,3,trim);px(ctx,bx+4,by+7,'#171318',1);px(ctx,bx+8,by+7,'#171318',1);px(ctx,bx+12,by+7,'#171318',1);
      if(front){rect(ctx,bx+6,by+9,4,4,accent);px(ctx,bx+7,by+10,metal,2);}
      else if(left||right){rect(ctx,bx+(left?2:11),by+8,3,6,accent);}
      break;
  }
  drawSkinMaterialPass(ctx,bx,by,frame,overlay,accent,trim,metal,dir,moving);
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
  if(alert){
    ctx.globalAlpha=.28;ctx.fillStyle='#ff574d';ctx.fillRect(x-2,y-2,6,6);ctx.globalAlpha=1;
    microRect(ctx,x+.25,y+.25,.5,.5,'#fff1dc');
  }else microRect(ctx,x+.25,y+.25,.5,.5,'rgba(220,238,240,.62)');
}
function metalEdge(ctx:Ctx,x:number,y:number,w:number,h:number,base:string,hi:string,lo:string){
  rect(ctx,x,y,w,h,base);rect(ctx,x+1,y+1,w-2,1,hi);rect(ctx,x+1,y+h-2,w-2,1,lo);
  if(w>=5&&h>=4){
    ctx.globalAlpha=.42;microRect(ctx,x+1.25,y+1.25,Math.max(.5,w-2.5),.25,'rgba(255,255,255,.44)');
    microRect(ctx,x+w-1.5,y+1.5,.25,Math.max(.5,h-3),'rgba(0,0,0,.42)');ctx.globalAlpha=1;
  }
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

  const fireShot=(length:number,width=2,hot=true)=>{
    const half=Math.max(1,Math.floor(width/2));
    const flick=((frame+bx+by)&1)===0;

    // Cola de fuego pixelada: naranja profundo -> naranja vivo -> ámbar.
    ctx.globalAlpha=.16;
    rect(ctx,bx-length-8,by-half-2,length+8,width+4,'#8f4518');
    ctx.globalAlpha=.32;
    rect(ctx,bx-length-7,by-half-1,length+7,width+2,'#e87620');
    ctx.globalAlpha=.64;
    rect(ctx,bx-length-4,by-half-1,length+4,width+2,'#f27f20');

    // Lenguas de fuego irregulares para acercar la silueta a una llama.
    ctx.globalAlpha=.86;
    rect(ctx,bx-length-7,by-(flick?3:2),4,1,'#e87620');
    rect(ctx,bx-length-5,by+(flick?2:3),3,1,'#f49a25');
    rect(ctx,bx-length-3,by-(flick?2:3),3,1,'#f9b736');

    // Cuerpo caliente.
    ctx.globalAlpha=1;
    rect(ctx,bx-Math.floor(length*.55),by-half,length,width,'#fca12d');
    if(width>=3)rect(ctx,bx-Math.floor(length*.40),by-half+1,Math.max(3,length-3),Math.max(1,width-2),'#f9b736');
    else rect(ctx,bx-Math.floor(length*.35),by,Math.max(3,length-3),1,'#f9b736');

    // Núcleo amarillo y punta casi blanca.
    rect(ctx,bx+Math.max(0,Math.floor(length*.12)),by-half,Math.max(2,Math.floor(length*.42)),width,'#fbd748');
    rect(ctx,bx+Math.max(1,Math.floor(length*.34)),by-half,2,width,'#fde95b');
    if(hot) px(ctx,bx+Math.max(1,Math.floor(length*.42)),by,'#fff7b8',1);

    ctx.globalAlpha=1;
  };
  
  switch (type) {
    case 'pistol_round':
    case 'smg_round':
      fireShot(6,2);
      break;
    case 'rifle_556':
    case 'lmg_556':
    case 'rifle_762':
      fireShot(9,2);
      break;
    case 'pdw_57':
    case 'suppressed_45':
      fireShot(7,2);
      break;
    case 'dmr_round':
      fireShot(10,2);
      break;
    case 'sniper_308':
      fireShot(12,3);
      break;
    case 'magnum_round':
      fireShot(8,3);
      break;
    case 'heavy_50':
      fireShot(14,4);
      break;
    case 'buckshot_player':
      fireShot(4,2,false);
      break;
    case 'grenade_40mm': {
      ctx.save();ctx.translate(bx,by);ctx.rotate(frame*.05);
      ctx.globalAlpha=.22;rect(ctx,-8,-5,16,10,'#8f4518');
      ctx.globalAlpha=.48;rect(ctx,-7,-4,14,8,'#e87620');
      ctx.globalAlpha=1;rect(ctx,-5,-3,10,6,'#fca12d');
      rect(ctx,-3,-2,6,4,'#fbd748');rect(ctx,2,-2,3,4,'#fde95b');
      px(ctx,3,0,'#fff7b8',1);ctx.restore();
      break;
    }
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
      px(ctx, bx - 1, by - 1, '#0a0a0a', 1); px(ctx, bx, by + 1, bodyLight, 1);
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
      fireShot(12,3);
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
      fireShot(7,3);
      break;
    }
    case 'pistol': { // bala de policía
      fireShot(7,3);
      break;
    }
    case 'buckshot': { // perdigón de escopeta
      fireShot(4,2,false);
      break;
    }
    case 'drone_shot': { // disparo del dron
      fireShot(8,2);
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

export function drawCrumbCluster(ctx:Ctx,x:number,y:number,frame:number,size=16,animated=true){
  const scale=Math.max(8,size)/16,bx=Math.floor(x),by=Math.floor(y);
  const bob=animated?Math.round(Math.sin(frame*.075+x*.02)):0;
  ctx.save();ctx.translate(bx,by+bob);ctx.scale(scale,scale);

  // Sombra/halo controlado.
  ctx.globalAlpha=.24;ctx.fillStyle='#020609';ctx.beginPath();ctx.ellipse(8,14,7,2.4,0,0,Math.PI*2);ctx.fill();
  ctx.globalAlpha=animated?.10+.04*Math.sin(frame*.09):.08;ctx.fillStyle='#e79a45';ctx.beginPath();ctx.ellipse(8,9,10,5,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;

  // Cinco migajas legibles, con volumen y borde cálido.
  const pieces=[
    [2,8,4,3],[7,3,4,4],[11,9,4,4],[6,12,4,3],[12,1,3,3],
  ] as const;
  for(const [pxx,pyy,w,h] of pieces){
    rect(ctx,pxx+1,pyy+1,w,h,'#7d451b');
    rect(ctx,pxx,pyy,w,h,'#e89537');
    rect(ctx,pxx,pyy,Math.max(1,w-2),1,'#ffd17b');
  }
  px(ctx,1,4,'#ffe6a8',1);px(ctx,14,6,'#ffe6a8',1);
  if(animated&&frame%28<7){px(ctx,10,-1,'#fff2bd',1);px(ctx,10,1,'#fff2bd',1);}
  ctx.restore();
}

export function drawBankKey(ctx:Ctx,x:number,y:number,frame:number,size=16,animated=true) {
  const scale=Math.max(8,size)/16,bx=Math.floor(x),by=Math.floor(y);
  const bob=animated?Math.round(Math.sin(frame*.07+x*.02)):0;
  ctx.save();ctx.translate(bx,by+bob);ctx.scale(scale,scale);

  ctx.globalAlpha=.25;ctx.fillStyle='#020609';ctx.beginPath();ctx.ellipse(8,14,8,2.5,0,0,Math.PI*2);ctx.fill();
  ctx.globalAlpha=animated?.12+.05*Math.sin(frame*.09):.10;ctx.fillStyle='#e3bd59';ctx.beginPath();ctx.ellipse(8,9,11,5,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;

  // Cabeza robusta con aro negro/dorado como en el nuevo HUD.
  ctx.fillStyle='#6d4714';ctx.beginPath();ctx.arc(4.5,6.5,5.5,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#d49b2e';ctx.beginPath();ctx.arc(4.5,6.5,4.5,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#f2c85f';ctx.beginPath();ctx.arc(4,6,3.3,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#302515';ctx.beginPath();ctx.arc(4,6,2,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#ffe59a';ctx.beginPath();ctx.arc(3,5,1.1,0,Math.PI*2);ctx.fill();

  // Vástago horizontal ancho, mucho más reconocible.
  rect(ctx,8,5,7,4,'#9a671f');
  rect(ctx,8,4,7,3,'#e0aa3d');
  rect(ctx,9,4,6,1,'#ffe28a');
  rect(ctx,12,8,3,3,'#b97f29');
  rect(ctx,14,8,2,5,'#8d5d1c');
  rect(ctx,10,8,2,2,'#e0aa3d');

  if(animated&&frame%32<6){px(ctx,13,1,'#fff1b4',1);px(ctx,15,3,'#fff1b4',1);}
  ctx.restore();
}

export function drawCoin(ctx:Ctx,x:number,y:number,frame:number,golden=false,animated=true){
  const bx=Math.floor(x),by=Math.floor(y);
  const bob=animated?Math.round(Math.sin(frame*.075+x*.018)):0;
  const cy=by+bob;
  const r=golden?6:5;

  ctx.save();
  ctx.globalAlpha=.25;ctx.fillStyle='#020609';ctx.beginPath();ctx.ellipse(bx,by+5,r+2,2.3,0,0,Math.PI*2);ctx.fill();
  ctx.globalAlpha=animated?.14+.05*Math.sin(frame*.10):.10;ctx.fillStyle=golden?'#f4c63f':'#c58a4a';ctx.beginPath();ctx.ellipse(bx,cy+1,r+5,4,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;

  // Contorno y bisel.
  ctx.fillStyle=golden?'#8b5612':'#85572f';ctx.beginPath();ctx.arc(bx,cy,r+1,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=golden?'#f09b1f':'#c68b55';ctx.beginPath();ctx.arc(bx,cy,r,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=golden?'#ffd249':'#e1b47b';ctx.beginPath();ctx.arc(bx-1,cy-1,r-1,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=golden?'#efa125':'#bc7c4c';ctx.beginPath();ctx.arc(bx,cy,r-2,0,Math.PI*2);ctx.fill();

  // Banda vertical central, firma del nuevo diseño.
  rect(ctx,bx-1,cy-r+2,3,r*2-3,golden?'#ffe77e':'#f2d2aa');
  rect(ctx,bx,cy-r+2,1,r*2-3,golden?'#fff3b0':'#fff0d7');
  if(golden){
    ctx.strokeStyle='#a66513';ctx.lineWidth=1;ctx.beginPath();ctx.arc(bx,cy,r-1,0,Math.PI*2);ctx.stroke();
    if(animated&&frame%26<6){px(ctx,bx+r+2,cy-r,'#fff7cf',1);px(ctx,bx+r+2,cy-r-2,'#fff7cf',1);}
  }
  ctx.restore();
}

export function drawChest(ctx: Ctx, x: number, y: number, opened: boolean, frame: number) {
  const bx=Math.floor(x),by=Math.floor(y),pulse=.55+.45*Math.sin(frame*.08);
  ctx.save();
  ctx.globalAlpha=.34;ctx.fillStyle='#020609';ctx.beginPath();ctx.ellipse(bx+10,by+18,13,4,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;

  if(!opened){
    // Cofre compacto: madera, flejes, cerradura y profundidad.
    rect(ctx,bx,by+6,20,11,'#3e281f');rect(ctx,bx+2,by+7,16,9,'#885630');
    rect(ctx,bx+1,by+2,18,6,'#4b3025');rect(ctx,bx+3,by+2,14,3,'#8d603c');
    rect(ctx,bx,by+6,20,2,'#667374');rect(ctx,bx+2,by+15,16,2,'#323c3f');
    rect(ctx,bx+2,by+6,2,10,'#9aa5a1');rect(ctx,bx+16,by+6,2,10,'#9aa5a1');
    rect(ctx,bx+7,by+5,6,6,'#8f6827');rect(ctx,bx+8,by+6,4,4,'#e0bb59');px(ctx,bx+9,by+8,'#5a451c',2);
    rect(ctx,bx+3,by+9,3,1,'#d09a5f');rect(ctx,bx+14,by+9,3,1,'#d09a5f');
    px(ctx,bx+3,by+14,'#2b211d',1);px(ctx,bx+17,by+14,'#2b211d',1);
    ctx.globalAlpha=.10+.08*pulse;ctx.fillStyle='#e6c56f';ctx.beginPath();ctx.ellipse(bx+10,by+9,18,10,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
    if(frame%30<7){ctx.globalAlpha=.55+.35*pulse;px(ctx,bx+20,by-1,'#fff0a0',2);px(ctx,bx+17,by+1,'#e6c56f',1);ctx.globalAlpha=1;}
  }else{
    rect(ctx,bx,by+10,20,7,'#3e281f');rect(ctx,bx+2,by+11,16,5,'#885630');
    rect(ctx,bx,by+9,20,2,'#667374');rect(ctx,bx+2,by+15,16,2,'#30393c');
    // Tapa abierta retrasada: deja claro que el cofre ya fue usado.
    rect(ctx,bx-1,by+1,22,5,'#30231e');rect(ctx,bx+1,by+2,18,2,'#765039');rect(ctx,bx,by+5,20,2,'#687676');
    px(ctx,bx+2,by+5,'#c0c9c3',2);px(ctx,bx+16,by+5,'#c0c9c3',2);
    ctx.globalAlpha=.22+.14*pulse;ctx.fillStyle='#e6c56f';ctx.beginPath();ctx.ellipse(bx+10,by+11,13,6,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
    rect(ctx,bx+3,by+11,14,3,'#d2af4d');rect(ctx,bx+5,by+11,10,1,'#fff0a5');
    if(frame%18<8){px(ctx,bx+5,by+5,'#fff4c7',1);px(ctx,bx+15,by+3,'#e6c56f',1);}
  }
  ctx.restore();
}

type BossVisual={accent:string;secondary:string;family:'command'|'finance'|'bakery'|'tech'|'riot'|'war'|'wealth'|'vault';bob:number};
const BOSS_VISUAL:Record<string,BossVisual> = {
  // Clásicos migrados al mismo lenguaje de facción v2.
  captain_honk:{accent:'#4f8bd7',secondary:'#e5b954',family:'command',bob:.55},
  comisario_pico_duro:{accent:'#5d96d7',secondary:'#d6aa4c',family:'command',bob:.36},
  toaster_9000:{accent:'#48c7df',secondary:'#ef5e62',family:'tech',bob:.28},
  general_ganso:{accent:'#79866b',secondary:'#d85f50',family:'war',bob:.30},
  don_levadura:{accent:'#d9874d',secondary:'#ffd27a',family:'bakery',bob:.48},
  director_seguridad:{accent:'#48c7df',secondary:'#ef5e62',family:'tech',bob:.36},
  bread_banker:{accent:'#d5aa3f',secondary:'#f0df9b',family:'wealth',bob:.32},
  tax_collector:{accent:'#4fa58d',secondary:'#d9b45b',family:'finance',bob:.50},
  sargento_migajas:{accent:'#79866b',secondary:'#d85f50',family:'war',bob:.44},
  dron_centinela:{accent:'#48c7df',secondary:'#ef5e62',family:'tech',bob:1.05},
  panadero_loco:{accent:'#d9874d',secondary:'#ffd27a',family:'bakery',bob:.58},
  head_baker:{accent:'#d9874d',secondary:'#ffd27a',family:'bakery',bob:.40},
  el_auditor:{accent:'#4fa58d',secondary:'#d9b45b',family:'finance',bob:.40},
  ganso_antidisturbios:{accent:'#71889a',secondary:'#4f76a8',family:'riot',bob:.24},
  cajero_3000:{accent:'#4fa58d',secondary:'#d9b45b',family:'finance',bob:.20},
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
  const tier=BOSSES[bossType]?2:SUBBOSSES[bossType]?1:0,key=def.visualIndex??0;
  return [def.family,tier,def.role,def.roleVariant,key%12,Math.floor(key/12)%8,(Math.floor(key/4)+key)%6,def.scaleX,def.scaleY,def.stationary?'fixed':'mobile',def.pattern.sequence[0],def.pattern.sequence[1]].join(':');
}

function drawBossStructuralRig(ctx:Ctx,key:number,tier:number,phase:number,frame:number,v:BossVisual,stationary=false){
  const rig=key%12,steel=v.family==='bakery'?'#795239':v.family==='finance'||v.family==='wealth'?'#4d443a':v.family==='vault'?'#403959':'#3c4852';
  const edge=v.family==='bakery'?'#d29c5d':v.family==='wealth'?'#d7ad4c':'#7f919c';
  const pulse=.55+.45*Math.sin(frame*.1+(key%17));
  ctx.save();

  if(stationary){
    // Base fija visible: estos bosses se leen como maquinaria/estructura, no
    // como el mismo personaje grande persiguiendo al jugador.
    metalEdge(ctx,-30,16,60,10,'#242c32',edge,'#11171b');
    rect(ctx,-25,24,50,5,'#161d22');
    for(const x of [-23,-8,8,23]){rect(ctx,x,18,4,7,steel);px(ctx,x+1,19,v.accent,2);}
  }

  switch(rig){
    case 0:
      metalEdge(ctx,-34,-8,12,27,steel,edge,'#222a31');
      rect(ctx,20,-2,10,19,steel);rect(ctx,24,1,9,11,'#252d33');px(ctx,28,4,v.secondary,3);
      break;
    case 1:
      ctx.fillStyle=steel;ctx.beginPath();ctx.moveTo(-17,-2);ctx.lineTo(-38,-19);ctx.lineTo(-31,10);ctx.lineTo(-17,14);ctx.closePath();ctx.fill();
      ctx.beginPath();ctx.moveTo(17,-2);ctx.lineTo(38,-19);ctx.lineTo(31,10);ctx.lineTo(17,14);ctx.closePath();ctx.fill();
      rect(ctx,-35,-14,10,3,v.accent);rect(ctx,25,-14,10,3,v.secondary);
      break;
    case 2:
      rect(ctx,-25,-32,4,48,steel);rect(ctx,-31,-33,16,10,'#252d33');rect(ctx,-29,-30,12,5,v.accent);
      rect(ctx,18,-13,9,24,steel);rect(ctx,20,-18,5,6,edge);
      if(frame%24<12)px(ctx,-24,-38,v.secondary,3);
      break;
    case 3:
      for(const x of [-29,29]){
        ctx.fillStyle=steel;ctx.beginPath();ctx.arc(x,1,10+tier,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle=edge;ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,1,7+tier,0,Math.PI*2);ctx.stroke();
        ctx.save();ctx.translate(x,1);ctx.rotate(frame*.045*(x<0?-1:1));rect(ctx,-1,-8,2,16,v.accent);rect(ctx,-8,-1,16,2,v.secondary);ctx.restore();
      }
      break;
    case 4:
      ctx.fillStyle=steel;ctx.beginPath();ctx.moveTo(-18,-5);ctx.lineTo(-34,24);ctx.lineTo(-12,19);ctx.lineTo(0,8);ctx.lineTo(12,19);ctx.lineTo(34,24);ctx.lineTo(18,-5);ctx.closePath();ctx.fill();
      ctx.globalAlpha=.55;rect(ctx,-30,19,13,3,v.accent);rect(ctx,17,19,13,3,v.secondary);ctx.globalAlpha=1;
      break;
    case 5:
      rect(ctx,-32,7,14,9,steel);rect(ctx,18,7,14,9,steel);
      rect(ctx,-29,15,6,14,'#252d33');rect(ctx,23,15,6,14,'#252d33');
      rect(ctx,-34,27,14,4,edge);rect(ctx,20,27,14,4,edge);
      break;
    case 6:
      for(const x of [-22,16]){
        rect(ctx,x,-25,7,34,steel);rect(ctx,x-2,-28,11,5,edge);
        ctx.globalAlpha=.25+.2*pulse;rect(ctx,x+1,-36,5,9,phase>=2?'#ff5b54':v.accent);ctx.globalAlpha=1;
      }
      break;
    case 7:
      ctx.strokeStyle=edge;ctx.lineWidth=4;ctx.globalAlpha=.85;
      for(let i=0;i<8;i++){const a=i*Math.PI/4+.1;ctx.beginPath();ctx.arc(0,2,30+tier*2,a,a+.38);ctx.stroke();}
      ctx.globalAlpha=1;rect(ctx,-7,-5,14,14,'#252d33');px(ctx,-2,0,v.secondary,4);
      break;
    case 8: // batería de artillería horizontal
      metalEdge(ctx,-36,-9,72,22,steel,edge,'#1b2227');
      for(const x of [-27,-9,9,27]){rect(ctx,x-4,-16,8,10,'#262e34');rect(ctx,x-2,-25,4,12,'#596870');px(ctx,x-1,-27,v.secondary,2);}
      rect(ctx,-13,4,26,8,'#151c21');rect(ctx,-8,6,16,4,v.accent);
      break;
    case 9: // araña mecánica
      for(const side of [-1,1]){
        for(let i=0;i<3;i++){
          const yy=-8+i*10;
          ctx.strokeStyle=edge;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(side*13,yy);ctx.lineTo(side*(28+i*3),yy+8);ctx.lineTo(side*(34+i*2),yy+13);ctx.stroke();
        }
      }
      ctx.fillStyle=steel;ctx.beginPath();ctx.ellipse(0,1,18,14,0,0,Math.PI*2);ctx.fill();
      break;
    case 10: // monolito/torre
      metalEdge(ctx,-13,-34,26,60,steel,edge,'#1b2227');
      rect(ctx,-8,-27,16,13,'#171e23');rect(ctx,-5,-24,10,7,v.accent);
      for(let y=-9;y<19;y+=8){rect(ctx,-17,y,34,3,'#252f35');px(ctx,-15,y,v.secondary,2);}
      break;
    default: // plataforma flotante en X
      ctx.fillStyle=steel;
      ctx.beginPath();ctx.moveTo(-30,-5);ctx.lineTo(-10,-12);ctx.lineTo(0,-3);ctx.lineTo(10,-12);ctx.lineTo(30,-5);ctx.lineTo(15,14);ctx.lineTo(-15,14);ctx.closePath();ctx.fill();
      for(const x of [-24,24]){ctx.globalAlpha=.4+.25*pulse;ctx.fillStyle=v.accent;ctx.beginPath();ctx.ellipse(x,11,8,3,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;}
      break;
  }
  ctx.restore();
}
function drawBossRoleHardware(
  ctx:Ctx,def:BossDef,frame:number,phase:number,v:BossVisual
){
  const pulse=.5+.5*Math.sin(frame*.12+def.roleVariant);
  const v2=def.roleVariant??0;
  ctx.save();
  switch(def.role){
    case 'artillery':
      for(const x of [-22,22]){
        rect(ctx,x-5,-20,10,22,'#2d363c');
        rect(ctx,x-3,-31,6,14,'#66757b');
        rect(ctx,x-2,-34,4,4,v.secondary);
      }
      if(phase>0){rect(ctx,-10,-26,20,5,'#1b2328');px(ctx,-2,-29,v.accent,4);}
      break;
    case 'duelist':
      ctx.save();ctx.rotate(-.55+(v2-1.5)*.08);
      rect(ctx,14,-3,24,4,'#20282e');rect(ctx,30,-4,11,6,'#5f6b70');px(ctx,39,-2,v.secondary,2);
      ctx.restore();
      rect(ctx,-21,3,7,14,'#373f46');px(ctx,-19,5,v.accent,3);
      break;
    case 'bulwark':
      metalEdge(ctx,14,-10,18,34,'#4d5963','#9aa7ad','#263038');
      rect(ctx,18,-5,10,24,'#303a42');
      ctx.globalAlpha=.35+.25*pulse;rect(ctx,20,1,6,12,v.accent);ctx.globalAlpha=1;
      break;
    case 'swarm':
      for(const x of [-22,22]){
        rect(ctx,x-2,-22,4,18,'#29343a');
        ctx.globalAlpha=.4+.4*pulse;px(ctx,x-2,-26,v.accent,4);ctx.globalAlpha=1;
      }
      for(let i=0;i<3;i++){
        const a=frame*.04+i*Math.PI*2/3+v2*.2;
        px(ctx,Math.cos(a)*28-1,Math.sin(a)*11-1,i%2?v.secondary:v.accent,3);
      }
      break;
    case 'sniper':
      ctx.save();ctx.rotate(-.12+(v2-1.5)*.025);
      rect(ctx,8,-7,37,5,'#20282e');rect(ctx,28,-9,13,9,'#5e6c72');
      rect(ctx,15,-10,10,3,'#11181c');px(ctx,19,-12,'#ff5c54',2);
      ctx.restore();
      break;
    case 'storm':
      ctx.globalAlpha=.45+.28*pulse;ctx.strokeStyle=v.accent;ctx.lineWidth=2;
      for(let i=0;i<3;i++){
        const a=frame*.035+i*2.1+v2*.3;
        ctx.beginPath();ctx.arc(0,1,25+i*5,a,a+1.05);ctx.stroke();
      }
      ctx.globalAlpha=1;
      break;
    case 'warden':
      for(const x of [-25,25]){
        rect(ctx,x-3,-18,6,36,'#303940');
        rect(ctx,x-6,-20,12,5,'#68767d');
        px(ctx,x-2,-23,v.secondary,4);
      }
      rect(ctx,-19,16,38,5,'#20282e');
      break;
    case 'charger':
      ctx.fillStyle='#404a51';
      ctx.beginPath();ctx.moveTo(-34,-3);ctx.lineTo(-18,-10);ctx.lineTo(-20,8);ctx.closePath();ctx.fill();
      ctx.beginPath();ctx.moveTo(34,-3);ctx.lineTo(18,-10);ctx.lineTo(20,8);ctx.closePath();ctx.fill();
      rect(ctx,-11,-19,22,6,'#293239');rect(ctx,-7,-23,14,5,v.secondary);
      break;
    case 'vortex':
      ctx.strokeStyle=v.accent;ctx.lineWidth=2;
      for(let i=0;i<4;i++){
        const a=frame*(i%2?.045:-.038)+i*Math.PI/2;
        ctx.globalAlpha=.3+.2*pulse;
        ctx.beginPath();ctx.arc(0,2,24+i*4,a,a+.75);ctx.stroke();
        px(ctx,Math.cos(a)*(24+i*4)-1,2+Math.sin(a)*(24+i*4)-1,v.secondary,3);
      }
      ctx.globalAlpha=1;
      break;
    case 'executioner':
      ctx.save();ctx.rotate(.42);
      rect(ctx,15,-4,27,7,'#30383d');rect(ctx,35,-7,8,13,'#727d80');
      rect(ctx,38,-10,4,19,v.secondary);
      ctx.restore();
      rect(ctx,-23,-15,7,30,'#252d33');px(ctx,-21,-18,v.accent,3);
      break;
    case 'reactor':
      ctx.globalAlpha=.18+.18*pulse;ctx.fillStyle=v.accent;
      ctx.beginPath();ctx.arc(0,3,20+phase*3,0,Math.PI*2);ctx.fill();
      ctx.globalAlpha=1;
      ctx.fillStyle='#182126';ctx.beginPath();ctx.arc(0,3,10,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle=v.secondary;ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,3,8,0,Math.PI*2);ctx.stroke();
      px(ctx,-2,1,phase>=2?'#ff5b54':v.accent,4);
      break;
    case 'trickster':
      for(const side of [-1,1]){
        ctx.globalAlpha=.6;
        ctx.strokeStyle=side<0?v.accent:v.secondary;ctx.lineWidth=2;
        ctx.beginPath();ctx.arc(side*20,-5,10,frame*.03*side,frame*.03*side+Math.PI*1.35);ctx.stroke();
      }
      ctx.globalAlpha=1;
      rect(ctx,-5,-28,10,7,'#20282e');px(ctx,-2,-30,v.secondary,4);
      break;
  }
  ctx.restore();
}

function drawBossFrontIdentity(ctx:Ctx,key:number,tier:number,v:BossVisual){
  const plate=Math.floor(key/12)%8;
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

function drawBossCrest(ctx:Ctx,key:number,v:BossVisual){
  switch((Math.floor(key/4)+key)%6){
    case 0: rect(ctx,-3,-29,6,10,'#2b333a');px(ctx,-2,-32,v.secondary,4);break;
    case 1: rect(ctx,-14,-25,28,3,'#30383f');rect(ctx,-11,-30,5,6,v.accent);rect(ctx,6,-30,5,6,v.secondary);break;
    case 2:
      ctx.strokeStyle=v.secondary;ctx.lineWidth=3;ctx.beginPath();ctx.arc(-8,-23,7,.1,Math.PI*1.3);ctx.stroke();ctx.beginPath();ctx.arc(8,-23,7,Math.PI*1.9,Math.PI*.7,true);ctx.stroke();break;
    case 3: rect(ctx,-13,-27,6,8,'#343d45');rect(ctx,7,-27,6,8,'#343d45');rect(ctx,-9,-31,3,5,v.accent);rect(ctx,7,-31,3,5,v.secondary);break;
    case 4: rect(ctx,-10,-27,20,4,'#3b3028');for(let x=-8;x<=6;x+=7)rect(ctx,x,-32,4,6,x===-1?v.secondary:v.accent);break;
    default: rect(ctx,-16,-25,32,3,'#242c33');rect(ctx,-5,-30,10,6,v.secondary);px(ctx,-2,-33,v.accent,4);break;
  }
}

function drawBossDuckBase(ctx:Ctx,def:BossDef,frame:number,phase:number,v:BossVisual){
  const q=def.roleVariant??0;
  const bob=Math.round(Math.sin(frame*.09+q)*1);
  const mechanical=def.family==='tech'||def.family==='vault';
  const body=mechanical?(def.family==='vault'?'#3b3857':'#40545d'):
    def.family==='bakery'?'#f0e7d7':
    def.family==='war'?'#dde1d7':
    def.family==='finance'||def.family==='wealth'?'#eee9dc':
    '#e2e6e2';
  const shade=mechanical?(def.family==='vault'?'#26253b':'#28383f'):
    def.family==='bakery'?'#cda878':
    def.family==='war'?'#9ca58f':
    '#b8c0bd';
  const beak=mechanical?(def.family==='vault'?'#c7a64e':'#d79b45'):'#ef922f';
  const beakDark=mechanical?'#805f2b':'#c96c20';

  ctx.save();ctx.translate(0,bob);

  // Patas palmeadas: aun con armadura o partes mecánicas, la lectura inferior
  // siempre debe ser ave y no humano/robot genérico.
  rect(ctx,-10,17,7,3,beak);rect(ctx,-12,20,10,2,beakDark);
  rect(ctx,3,17,7,3,beak);rect(ctx,2,20,10,2,beakDark);

  // Cola corta y cuerpo ovalado/rechoncho.
  ctx.fillStyle=shade;ctx.beginPath();ctx.ellipse(-13,7,7,6,-.3,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=body;ctx.beginPath();ctx.ellipse(0,6,17,15,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=shade;ctx.beginPath();ctx.ellipse(-8,6,7,10,-.35,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=shade;ctx.beginPath();ctx.ellipse(9,6,7,10,.35,0,Math.PI*2);ctx.fill();

  // Pecho/ala frontal, muy visible incluso bajo accesorios.
  ctx.globalAlpha=.92;ctx.fillStyle=mechanical?'#536972':'#f3eee2';
  ctx.beginPath();ctx.ellipse(1,8,8,10,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
  ctx.fillStyle=mechanical?v.accent:shade;
  ctx.beginPath();ctx.ellipse(10,5,6,8,.35,0,Math.PI*2);ctx.fill();

  // Cabeza grande de pato + pico dominante. Esta es la regla duck-first.
  ctx.fillStyle=body;ctx.beginPath();ctx.ellipse(0,-13,12,10,0,0,Math.PI*2);ctx.fill();
  if(mechanical){
    ctx.strokeStyle=def.family==='vault'?v.secondary:'#748990';ctx.lineWidth=2;
    ctx.beginPath();ctx.ellipse(0,-13,11,9,0,0,Math.PI*2);ctx.stroke();
  }
  // Ojos orientados hacia el jugador.
  const eye=phase>=2?'#ff514e':'#11171b';
  px(ctx,-5,-16,mechanical?v.accent:eye,2);px(ctx,4,-16,mechanical?v.accent:eye,2);
  if(mechanical){px(ctx,-4,-15,'#e7ffff',1);px(ctx,5,-15,'#e7ffff',1);}

  // Pico ancho y central; nunca queda oculto por casco/equipo.
  rect(ctx,-7,-10,14,5,beak);rect(ctx,-5,-5,10,2,beakDark);
  px(ctx,-4,-8,'#8c4e1f',1);px(ctx,3,-8,'#8c4e1f',1);

  // Cuello/pecho define continuidad cabeza-cuerpo.
  rect(ctx,-7,-4,14,6,body);
  ctx.restore();
}

function drawRoleBossCore(ctx:Ctx,def:BossDef,frame:number,phase:number,v:BossVisual){
  const pulse=.5+.5*Math.sin(frame*.11+def.roleVariant*.7);
  const q=def.roleVariant??0;
  const armor=v.family==='bakery'?'#8a5d42':v.family==='finance'||v.family==='wealth'?'#33383a':v.family==='vault'?'#403958':'#35434c';
  const light=phase>=2?'#ff554f':phase?v.secondary:v.accent;

  ctx.save();
  // Siempre primero el pato. El rol sólo agrega hardware alrededor.
  drawBossDuckBase(ctx,def,frame,phase,v);

  switch(def.role){
    case 'artillery': {
      const span=25+q*3;
      metalEdge(ctx,-span-7,-3,10,22,armor,'#77858a','#1a2125');
      metalEdge(ctx,span-3,-3,10,22,armor,'#77858a','#1a2125');
      for(const x of [-span-9,span+1]){
        rect(ctx,x,-17-q,8,17+q,'#5f6d72');rect(ctx,x+2,-22-q,4,7,light);
      }
      rect(ctx,-11,10,22,7,'#1b2428');px(ctx,-3,12,v.secondary,6);
      break;
    }
    case 'duelist': {
      // Ligero: arma larga lateral, cuerpo de pato casi completamente visible.
      ctx.save();ctx.translate(17,3);ctx.rotate(-.56+q*.06);
      rect(ctx,-2,-21,4,37,'#252d31');rect(ctx,-5,-25,10,7,'#758187');rect(ctx,-1,-29,2,6,light);
      ctx.restore();
      rect(ctx,-17,7,5,11,'#303b41');px(ctx,-16,4,v.accent,3);
      break;
    }
    case 'bulwark': {
      // Escudo desplazado: jamás tapa pico/cabeza.
      const sw=18+q*2;
      metalEdge(ctx,13,-10,sw,35,'#4d5c65','#a0adb2','#222b31');
      rect(ctx,17,-4,sw-8,24,'#313d45');
      ctx.globalAlpha=.38+.22*pulse;rect(ctx,20,1,Math.max(4,sw-14),13,light);ctx.globalAlpha=1;
      rect(ctx,-20,-1,7,18,armor);
      break;
    }
    case 'swarm': {
      // Pato comandante al centro, drones satélite alrededor.
      for(let i=0;i<4+q;i++){
        const a=frame*.035+i*Math.PI*2/(4+q);
        const r=27+q*2,x=Math.cos(a)*r,y=-2+Math.sin(a)*15;
        rect(ctx,x-4,y-3,8,6,'#2d3940');px(ctx,x-2,y-1,i%2?v.accent:v.secondary,4);
        rect(ctx,x-8,y-1,4,2,'#607078');rect(ctx,x+4,y-1,4,2,'#607078');
      }
      break;
    }
    case 'sniper': {
      // Mochila estrecha + rifle largo; la cabeza de pato queda libre.
      rect(ctx,-18,-3,6,21,armor);px(ctx,-17,-7,v.secondary,3);
      ctx.save();ctx.translate(12,1);ctx.rotate(-.14+q*.02);
      rect(ctx,0,-2,42+q*3,5,'#20282d');rect(ctx,29+q*2,-4,13,9,'#68757a');
      rect(ctx,8,-5,9,4,'#313b40');px(ctx,11,-7,light,3);ctx.restore();
      if(phase){ctx.strokeStyle='#e45450';ctx.globalAlpha=.32;ctx.setLineDash([4,4]);ctx.beginPath();ctx.moveTo(23,-5);ctx.lineTo(60,-18);ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1;}
      break;
    }
    case 'storm': {
      // Bobinas alrededor de un pato visible, no rombo abstracto.
      for(const side of [-1,1]){
        const x=side*(22+q*2);metalEdge(ctx,x-4,-8,8,25,armor,'#74838a','#20282c');
        ctx.globalAlpha=.42+.3*pulse;px(ctx,x-2,-12,light,4);ctx.globalAlpha=1;
      }
      ctx.strokeStyle=v.secondary;ctx.lineWidth=2;
      for(let i=0;i<3;i++){const a=frame*(i%2?.04:-.035)+i*2.1;ctx.beginPath();ctx.arc(0,2,23+i*4,a,a+.8);ctx.stroke();}
      break;
    }
    case 'warden': {
      const span=25+q*2;
      rect(ctx,-span,-8,8,31,'#2d373d');rect(ctx,span-8,-8,8,31,'#2d373d');
      rect(ctx,-span+2,-5,3,25,v.secondary);rect(ctx,span-5,-5,3,25,v.accent);
      rect(ctx,-13,12,26,7,armor);
      break;
    }
    case 'charger': {
      // Hombreras/arietes laterales; pico del pato es el centro de la embestida.
      ctx.fillStyle='#69767c';
      ctx.beginPath();ctx.moveTo(-16,0);ctx.lineTo(-34-q*2,-7);ctx.lineTo(-29,8);ctx.lineTo(-15,11);ctx.closePath();ctx.fill();
      ctx.beginPath();ctx.moveTo(16,0);ctx.lineTo(34+q*2,-7);ctx.lineTo(29,8);ctx.lineTo(15,11);ctx.closePath();ctx.fill();
      rect(ctx,-18,10,36,7,armor);if(phase)rect(ctx,-14,12,28,3,light);
      break;
    }
    case 'vortex': {
      // Aros orbitan al pato en vez de sustituirlo.
      ctx.strokeStyle='#5f6e75';ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(0,2,24+q*2,18+q,frame*.012,0,Math.PI*2);ctx.stroke();
      ctx.strokeStyle=v.secondary;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,2,17+q,26+q*2,-frame*.014,0,Math.PI*2);ctx.stroke();
      for(let i=0;i<4;i++){const a=frame*.04*(i%2?1:-1)+i*Math.PI/2;px(ctx,Math.cos(a)*(29+q*2)-2,2+Math.sin(a)*(19+q)-2,i%2?v.accent:v.secondary,4);}
      break;
    }
    case 'executioner': {
      // Hacha pesada al costado; anatomía de pato permanece intacta.
      ctx.save();ctx.translate(19,1);ctx.rotate(.43-q*.04);
      rect(ctx,-3,-25,6,44,'#30383d');rect(ctx,-9,-31,18,11,'#737f83');rect(ctx,-5,-36,10,8,light);ctx.restore();
      rect(ctx,-19,7,6,14,'#252e34');if(phase)px(ctx,-17,3,light,4);
      break;
    }
    case 'reactor': {
      // Reactor como mochila/anillo posterior, no cuerpo principal.
      ctx.strokeStyle='#718087';ctx.lineWidth=5;ctx.beginPath();ctx.arc(0,5,23+q*2,0,Math.PI*2);ctx.stroke();
      ctx.globalAlpha=.34+.3*pulse;ctx.strokeStyle=light;ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,5,18+q,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;
      for(const x of [-24,24]){rect(ctx,x-4,-5,8,22,'#29343a');rect(ctx,x-2,-12,4,9,v.secondary);}
      break;
    }
    case 'trickster': {
      // El pato es real; las dos mitades son señuelos/hologramas, no el cuerpo.
      for(const side of [-1,1]){
        const x=side*(21+q);ctx.globalAlpha=.30+.18*pulse;ctx.strokeStyle=side<0?v.accent:v.secondary;ctx.lineWidth=2;
        ctx.beginPath();ctx.ellipse(x,3,10,17,side*.18,0,Math.PI*2);ctx.stroke();
        px(ctx,x-2,-15,side<0?v.accent:v.secondary,4);
      }
      ctx.globalAlpha=1;
      if(phase){px(ctx,-24,-20,v.accent,4);px(ctx,20,-20,v.secondary,4);}
      break;
    }
  }

  ctx.restore();
}

function bossPartIsAlive(parts:BossPartState[]|undefined,id:string){
  const part=parts?.find(p=>p.id===id);
  return part ? !part.destroyed : true;
}

type BossAttackPose={dx:number;dy:number;rot:number;sx:number;sy:number};
function iconicAttackPose(bossType:string,attack:number|undefined,wind:number,recovery:number,recoveryMax:number):BossAttackPose{
  const recoil=recoveryMax>0?recovery/recoveryMax:0;
  const pose:BossAttackPose={dx:0,dy:0,rot:0,sx:1,sy:1};
  if(attack===undefined&&recoil<=0)return pose;
  switch(bossType){
    case 'captain_honk':
      if(attack===1){pose.dx=wind*4;pose.rot=-wind*.07;pose.sx=1+wind*.03;pose.sy=1-wind*.04;}
      else if(attack===2){pose.rot=Math.sin(wind*Math.PI)*-.035;pose.dy=-wind*2;}
      else {pose.rot=-wind*.025+recoil*.04;pose.dx=-recoil*2;}
      break;
    case 'comisario_pico_duro':
      pose.rot=attack===2?-wind*.08:attack===4?-wind*.035:-wind*.018;
      pose.dx=attack===2?wind*3:-recoil*2;pose.sy=1-wind*.025;
      break;
    case 'toaster_9000':
      pose.sy=1+wind*(attack===1?.07:.03);pose.sx=1+wind*(attack===0?.035:.015);
      pose.dy=-wind*(attack===0?2:0)+recoil*2;
      break;
    case 'general_ganso':
      if(attack===0){pose.dx=wind*5;pose.rot=-wind*.065;pose.sy=1-wind*.05;}
      else if(attack===1||attack===4){pose.rot=-wind*.04;pose.dx=wind*2-recoil*3;}
      else if(attack===2){pose.dy=-wind*2;pose.sx=1+wind*.025;}
      break;
    case 'don_levadura':
      pose.sx=1+wind*(attack===1?.09:.045);pose.sy=1+wind*(attack===1?.1:.025);
      pose.dy=attack===0?wind*2:-wind*2+recoil*2;pose.rot=Math.sin(wind*Math.PI)*.025;
      break;
    case 'director_seguridad':
      pose.sx=1+wind*(attack===3?.025:.01);pose.sy=1+wind*(attack===3?.025:.01);
      pose.dy=recoil*1.5;
      break;
    case 'head_baker':
      pose.rot=attack===2?wind*.07:-wind*.015;pose.dx=attack===2?wind*3:0;pose.sy=1+wind*(attack===1?.04:0);
      break;
    case 'el_auditor':
      pose.dy=-wind*3;pose.sx=1-wind*.025;pose.sy=1+wind*.055;pose.rot=attack===1?-wind*.025:wind*.012;
      break;
    case 'ganso_antidisturbios':
      pose.dx=attack===0?wind*5:0;pose.sx=1+wind*.04;pose.sy=1-wind*.035;pose.rot=-recoil*.025;
      break;
    case 'cajero_3000':
      pose.sx=1+wind*(attack===3?.035:.015);pose.sy=1+wind*(attack===3?.035:.01);pose.dy=recoil*2;
      break;
  }
  return pose;
}

function applyIconicAttackPose(ctx:Ctx,bossType:string,attack:number|undefined,wind:number,recovery:number,recoveryMax:number){
  const p=iconicAttackPose(bossType,attack,wind,recovery,recoveryMax);
  ctx.translate(p.dx,p.dy);ctx.rotate(p.rot);ctx.scale(p.sx,p.sy);
}

function drawIconicPhaseShift(ctx:Ctx,bossType:string,frame:number,phase:number,v:BossVisual,parts?:BossPartState[]){
  if(phase<=0)return;
  const alive=(id:string)=>bossPartIsAlive(parts,id);
  const pulse=.5+.5*Math.sin(frame*.15);
  ctx.save();
  switch(bossType){
    case 'captain_honk':
      rect(ctx,-17,14,34,4,phase>=2?'#5a2428':'#4f5c63');
      if(phase>=2){for(const x of [-20,18]){ctx.globalAlpha=.5+.35*pulse;px(ctx,x,-8,x<0?'#5ea4ff':'#ff5f57',4);}ctx.globalAlpha=1;}
      break;
    case 'comisario_pico_duro':
      if(phase>=1){rect(ctx,-14,17,28,5,'#4d2529');}
      if(phase>=2&&alive('execution_rifle')){ctx.strokeStyle='#d95b50';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(15,-18);ctx.lineTo(25,16);ctx.stroke();}
      break;
    case 'toaster_9000':
      for(const x of [-38,34]){rect(ctx,x,-9,5,28,'#343b3e');for(let y=-5;y<15;y+=6)rect(ctx,x+(x<0?1:0),y,3,2,phase>=2?'#ff6b42':'#bc7a4b');}
      if(phase>=2){ctx.save();ctx.rotate(-.18);rect(ctx,-33,-27,29,5,'#4a5052');ctx.restore();ctx.save();ctx.rotate(.18);rect(ctx,4,-27,29,5,'#4a5052');ctx.restore();}
      break;
    case 'general_ganso':
      if(phase>=1){rect(ctx,-15,-2,6,17,'#29343c');rect(ctx,9,-2,6,17,'#29343c');}
      if(phase>=2){rect(ctx,-8,-24,16,3,'#20282d');ctx.strokeStyle='#c65a4b';ctx.beginPath();ctx.moveTo(-10,-13);ctx.lineTo(-2,-7);ctx.stroke();}
      break;
    case 'don_levadura':
      if(phase>=1){for(let i=0;i<5+phase;i++){const a=i/(5+phase)*Math.PI*2+frame*.01;ctx.globalAlpha=.28+.18*pulse;ctx.fillStyle=i%2?'#e0b074':'#a96d43';ctx.beginPath();ctx.arc(Math.cos(a)*(28+phase*4),8+Math.sin(a)*(20+phase*3),4+(i%2)*2,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;}
      break;
    case 'director_seguridad':
      if(phase>=1){for(const x of [-45,45]){rect(ctx,x-3,-16,6,37,'#293238');rect(ctx,x-1,-22,2,8,v.accent);}}
      if(phase>=2&&alive('security_core')){for(let i=0;i<4;i++){const a=i*Math.PI/2+Math.PI/4;ctx.save();ctx.rotate(a);rect(ctx,11,-3,14,6,'#56646a');ctx.restore();}}
      break;
    case 'head_baker':
      if(phase>=1){for(const x of [-18,14])rect(ctx,x,16,8,5,'#7c4c34');}
      break;
    case 'el_auditor':
      rect(ctx,-13,18,26,4,phase>=1?'#7e2731':'#30363b');
      if(phase>=1){ctx.globalAlpha=.32+.22*pulse;ctx.strokeStyle='#a93440';ctx.beginPath();ctx.ellipse(0,0,18+phase*5,29+phase*4,0,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;}
      break;
    case 'ganso_antidisturbios':
      if(phase>=1&&alive('riot_shield')){for(let y=-10;y<20;y+=9){ctx.fillStyle='#8e9ba3';ctx.beginPath();ctx.moveTo(33,y);ctx.lineTo(39,y+3);ctx.lineTo(33,y+6);ctx.closePath();ctx.fill();}}
      break;
    case 'cajero_3000':
      if(phase>=1){rect(ctx,-31,17,62,5,'#2c3336');for(const x of [-24,24])px(ctx,x,18,phase>=1?'#ff6257':'#59d7a7',3);}
      if(phase>=1&&alive('emergency_core')){ctx.globalAlpha=.25+.25*pulse;ctx.strokeStyle='#59d7a7';ctx.beginPath();ctx.arc(0,-2,18+phase*4,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;}
      break;
  }
  ctx.restore();
}

function drawIconicAttackHardware(
  ctx:Ctx,bossType:string,frame:number,phase:number,v:BossVisual,attack:number|undefined,
  wind:number,recovery:number,recoveryMax:number,parts?:BossPartState[]
){
  if((attack===undefined||wind<=0)&&recovery<=0)return;
  const alive=(id:string)=>bossPartIsAlive(parts,id);
  const recoil=recoveryMax>0?recovery/recoveryMax:0;
  const pulse=.5+.5*Math.sin(frame*.22);
  ctx.save();
  switch(bossType){
    case 'captain_honk':
      if(attack===2&&alive('command_radio')){
        ctx.globalAlpha=.35+.5*wind;ctx.strokeStyle=v.accent;ctx.lineWidth=1.5;
        for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(-19,6,7+i*5+wind*4,-2.3,-.8);ctx.stroke();}
      }
      if((attack===0||attack===4)&&alive('sidearm')){
        ctx.save();ctx.translate(21,8);ctx.rotate(-.45*wind);rect(ctx,7,-2,10+wind*7,3,'#bbc3c5');ctx.restore();
        ctx.globalAlpha=.2+.35*wind;ctx.strokeStyle='#ffd36b';ctx.beginPath();ctx.moveTo(32,1);ctx.lineTo(52+wind*20,-7);ctx.stroke();
      }
      break;
    case 'comisario_pico_duro':
      if(alive('execution_rifle')&&(attack===0||attack===4||attack===2)){
        ctx.save();ctx.translate(18,3);ctx.rotate(-.62-wind*.42);rect(ctx,-2,-28,4,13+wind*8,'#9aa5aa');ctx.restore();
        ctx.globalAlpha=.15+.3*wind;ctx.strokeStyle='#e85a52';ctx.setLineDash([4,4]);ctx.beginPath();ctx.moveTo(30,-14);ctx.lineTo(62,-32);ctx.stroke();ctx.setLineDash([]);
      }
      if(attack===3&&alive('command_pack')){ctx.globalAlpha=.3+.45*wind;ctx.strokeStyle=v.secondary;for(let i=0;i<2;i++){ctx.beginPath();ctx.arc(-18,5,8+i*6,-2.4,-.8);ctx.stroke();}}
      break;
    case 'toaster_9000': {
      const heat=attack===0||attack===1||attack===4;
      if(heat){
        for(const [x,id] of [[-24,'heater_l'],[-8,'heater_l'],[8,'heater_r'],[24,'heater_r']] as const){
          if(!alive(id))continue;
          const lift=wind*(attack===0?10:4);
          ctx.globalAlpha=.45+.45*wind;rect(ctx,x-3,-27-lift,6,8+lift,phase>=2?'#fff3a1':'#ff8a43');
          ctx.globalAlpha=.22+.28*wind;ctx.fillStyle='#ff6b3f';ctx.beginPath();ctx.arc(x,-22-lift,5+wind*3,0,Math.PI*2);ctx.fill();
        }
      }
      if((attack===3||attack===4)&&alive('thermal_core')){
        ctx.globalAlpha=.3+.45*wind;ctx.strokeStyle='#ff9b55';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,4,12+wind*11,0,Math.PI*2);ctx.stroke();
      }
      break;
    }
    case 'general_ganso':
      if((attack===1||attack===4)&&alive('battle_rifle')){
        ctx.save();ctx.translate(19,7);ctx.rotate(-.38-wind*.32);rect(ctx,22,-4,15+wind*8,4,'#7f8b90');ctx.restore();
        ctx.globalAlpha=.16+.32*wind;ctx.strokeStyle='#e45c50';ctx.setLineDash([5,5]);ctx.beginPath();ctx.moveTo(44,-6);ctx.lineTo(74,-20);ctx.stroke();ctx.setLineDash([]);
      }
      if(attack===2&&alive('command_radio')){ctx.globalAlpha=.35+.45*wind;ctx.strokeStyle=v.secondary;for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(-22,-1,7+i*5,-2.4,-.65);ctx.stroke();}}
      if(recoil>.05&&alive('battle_rifle')){ctx.globalAlpha=.25*recoil;ctx.fillStyle='#ffd17a';ctx.beginPath();ctx.arc(47,-4,3+recoil*4,0,Math.PI*2);ctx.fill();}
      break;
    case 'don_levadura': {
      const arms=4+phase*2;
      if(attack===0||attack===3||attack===4){
        for(let i=0;i<arms;i++){const a=i/arms*Math.PI*2+frame*.012;const side=Math.cos(a)<0?'dough_arm_l':'dough_arm_r';if(!alive(side))continue;
          const reach=31+phase*3+wind*(attack===0?12:7);
          ctx.strokeStyle=i%2?'#e2b578':'#c88851';ctx.lineWidth=3+wind*2;ctx.globalAlpha=.45+.35*wind;
          ctx.beginPath();ctx.moveTo(Math.cos(a)*18,7+Math.sin(a)*12);ctx.quadraticCurveTo(Math.cos(a+.35)*reach*.7,7+Math.sin(a+.35)*reach*.55,Math.cos(a)*reach,7+Math.sin(a)*reach*.62);ctx.stroke();
        }
      }
      if((attack===1||attack===2)&&alive('oven_core')){ctx.globalAlpha=.28+.5*wind;ctx.fillStyle=phase>=2?'#fff09a':'#ff793b';ctx.beginPath();ctx.arc(0,12,6+wind*7,0,Math.PI*2);ctx.fill();}
      break;
    }
    case 'director_seguridad':
      if((attack===0||attack===1||attack===4)){
        for(const [x,id] of [[-31,'turret_l'],[31,'turret_r']] as const){if(!alive(id))continue;ctx.save();ctx.translate(x,-7);ctx.rotate((x<0?1:-1)*wind*.18);rect(ctx,-2,-27,4,16+wind*7,'#91a1a6');rect(ctx,-4,-30,8,4,v.secondary);ctx.restore();}
      }
      if(attack===2&&alive('camera_array')){ctx.globalAlpha=.35+.45*wind;ctx.strokeStyle=v.accent;for(const x of [-7,7]){ctx.beginPath();ctx.arc(x,-25,7+wind*7,frame*.04,frame*.04+Math.PI*1.4);ctx.stroke();}}
      if((attack===3||attack===4)&&alive('security_core')){ctx.globalAlpha=.28+.5*wind;ctx.strokeStyle=phase>=2?'#ff6258':v.secondary;ctx.lineWidth=2;for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(0,3,15+i*6+wind*5,0,Math.PI*2);ctx.stroke();}}
      break;
    case 'head_baker':
      if(attack===2&&alive('paddle')){ctx.save();ctx.translate(23,2);ctx.rotate(-.5-wind*.85);rect(ctx,-2,-27,5,43,'#9b6a3b');rect(ctx,-8,-31,17,7,'#d39758');ctx.restore();}
      if((attack===1||attack===3)&&alive('oven_core')){ctx.globalAlpha=.25+.5*wind;ctx.fillStyle='#ff7d3e';ctx.beginPath();ctx.arc(0,8,6+wind*6,0,Math.PI*2);ctx.fill();}
      break;
    case 'el_auditor':
      if(attack===1&&alive('execution_seal')){ctx.save();ctx.translate(18,2-wind*13);ctx.rotate(.18-wind*.12);rect(ctx,-3,-18,6,33,'#5a3b2c');rect(ctx,-9,-23,18,8,'#b13f4a');ctx.restore();}
      if((attack===0||attack===3)&&alive('briefcase')){const count=3+phase;for(let i=0;i<count;i++){const a=i/count*Math.PI*2;const r=26-wind*9;ctx.globalAlpha=.35+.35*wind;rect(ctx,Math.cos(a)*r-5,-3+Math.sin(a)*r*.55-3,10,6,'#efe4ca');}}
      if(recoil>.05){ctx.globalAlpha=.25*recoil;rect(ctx,-12,18,24,2,'#b74049');}
      break;
    case 'ganso_antidisturbios':
      if(alive('riot_shield')&&(attack===0||attack===1)){ctx.globalAlpha=.25+.4*wind;ctx.strokeStyle='#d4dde1';ctx.lineWidth=2;ctx.strokeRect(8-wind*3,-15-wind*2,27+wind*6,42+wind*4);}
      if(!alive('riot_shield')&&attack===2){ctx.save();ctx.translate(-22,4);ctx.rotate(-.15-wind*.28);rect(ctx,-10,-3,28+wind*6,7,'#2b3338');ctx.restore();}
      break;
    case 'cajero_3000':
      if(attack===1||attack===0||attack===3){
        for(const [x,id] of [[-27,'coin_cannon_l'],[27,'coin_cannon_r']] as const){if(!alive(id))continue;const extend=wind*(attack===1?10:5);rect(ctx,x-3,-27-extend,6,15+extend,'#738187');px(ctx,x-2,-31-extend,v.secondary,4);}
      }
      if((attack===3||attack===4)&&alive('emergency_core')){ctx.globalAlpha=.3+.45*wind;ctx.strokeStyle='#64e1ae';ctx.lineWidth=2;ctx.strokeRect(-15,-10,30,17);for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(0,-2,12+i*6+wind*4,0,Math.PI*2);ctx.stroke();}}
      break;
  }
  if(recoil>.05&&bossType!=='el_auditor'){ctx.globalAlpha=.18*recoil;ctx.strokeStyle=v.secondary;ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,3,24+recoil*10,0,Math.PI*2);ctx.stroke();}
  ctx.restore();
}

function drawIconicBossCore(ctx:Ctx,bossType:string,frame:number,phase:number,v:BossVisual,parts?:BossPartState[]):boolean{
  const pulse=.5+.5*Math.sin(frame*.12);
  const alive=(id:string)=>bossPartIsAlive(parts,id);
  switch(bossType){
    case 'head_baker': {
      // Chef-horno: alto, asimétrico y con un horno real en el torso.
      rect(ctx,-16,-9,32,29,'#ece7db');rect(ctx,-13,-5,26,23,'#8a5739');
      rect(ctx,-10,0,20,14,'#2d211c');rect(ctx,-7,3,14,8,alive('oven_core')?'#5a2b22':'#241d1a');
      if(alive('oven_core')){ctx.globalAlpha=.62+.28*pulse;rect(ctx,-4,5,8,5,phase?'#ff4d35':'#ff873d');ctx.globalAlpha=1;}
      else {rect(ctx,-6,4,12,2,'#11171a');ctx.strokeStyle='#d8a36b';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-5,2);ctx.lineTo(1,7);ctx.lineTo(5,3);ctx.stroke();}
      rect(ctx,-13,-20,26,8,'#f7f3ea');rect(ctx,-9,-27,18,9,'#fffdf7');rect(ctx,-4,-31,8,5,'#fffdf7');
      enemyEye(ctx,-7,-12,true);enemyEye(ctx,5,-12,true);rect(ctx,9,-10,9,3,'#ea8a35');
      // Brazo-pala largo; en fase 2 la masa invade el otro costado.
      if(alive('paddle')){ctx.save();ctx.translate(23,3);ctx.rotate(-.48+Math.sin(frame*.05)*.06);rect(ctx,-1,-20,4,35,'#835a36');rect(ctx,-7,-25,16,7,'#b97f48');ctx.restore();}
      else {rect(ctx,15,1,8,4,'#4b392d');px(ctx,20,0,'#c76c45',2);}
      if(phase>0){
        for(let i=0;i<4+phase;i++){const a=i/(4+phase)*Math.PI*2+frame*.018;ctx.globalAlpha=.35;ctx.fillStyle='#d9a463';ctx.beginPath();ctx.arc(Math.cos(a)*(22+phase*3),6+Math.sin(a)*(12+phase*2),3+i%2,0,Math.PI*2);ctx.fill();}
        ctx.globalAlpha=1;
      }
      return true;
    }
    case 'el_auditor': {
      // Silueta casi humana: traje estrecho, sello de ejecución y documentos orbitales.
      rect(ctx,-10,-11,20,33,'#151b22');rect(ctx,-7,-7,14,26,'#252e37');
      rect(ctx,-2,-6,4,22,'#8f2634');rect(ctx,-8,-20,16,10,'#dedbd2');
      enemyEye(ctx,-6,-17,true);enemyEye(ctx,4,-17,true);rect(ctx,8,-15,8,3,'#de7d2f');
      rect(ctx,-15,1,6,20,'#202830');rect(ctx,9,1,6,20,'#202830');
      if(alive('execution_seal')){ctx.save();ctx.translate(18,2);ctx.rotate(.24);rect(ctx,-2,-18,4,31,'#5a3b2c');rect(ctx,-8,-23,16,8,'#a83a45');ctx.restore();}
      else {rect(ctx,12,0,7,3,'#322a26');px(ctx,16,-2,'#d35a50',2);}
      if(alive('briefcase')){rect(ctx,-20,5,10,12,'#4a352c');rect(ctx,-18,3,6,3,'#7b5c3b');}
      for(let i=0;i<(alive('briefcase')?3+phase:Math.max(1,phase));i++){const a=frame*.025+i*Math.PI*2/Math.max(1,(alive('briefcase')?3+phase:phase));ctx.save();ctx.translate(Math.cos(a)*(22+phase*3),-3+Math.sin(a)*(12+phase*2));ctx.rotate(a);rect(ctx,-5,-3,10,6,'#e9e0ca');px(ctx,-3,-1,i%2?'#a9303d':'#323c46',2);ctx.restore();}
      return true;
    }
    case 'ganso_antidisturbios': {
      // Muralla móvil: escudo ocupa casi media silueta y el cuerpo queda detrás.
      rect(ctx,-20,-6,27,27,'#dfe4e1');rect(ctx,-17,-2,23,20,'#3d4954');
      rect(ctx,-12,-17,20,10,'#e8ece8');enemyEye(ctx,-9,-14,true);rect(ctx,6,-12,9,3,'#ef8932');
      if(alive('riot_shield')){
        metalEdge(ctx,7,-14,26,40,'#4a5863','#9daab1','#222b31');
        rect(ctx,12,-8,16,27,'#303b43');ctx.globalAlpha=.35+.25*pulse;rect(ctx,16,-3,8,17,phase?'#ff5a4f':v.accent);ctx.globalAlpha=1;
      }else{
        rect(ctx,8,11,9,8,'#343e44');ctx.strokeStyle='#b8c3c8';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(11,8);ctx.lineTo(22,-4);ctx.moveTo(13,-7);ctx.lineTo(25,5);ctx.stroke();
      }
      // arma corta visible por el lado libre.
      ctx.save();ctx.translate(-22,4);ctx.rotate(-.15);rect(ctx,-9,-2,19,5,'#20282d');rect(ctx,6,-3,8,7,'#69757a');ctx.restore();
      if(phase){rect(ctx,-19,18,9,5,'#5b6670');rect(ctx,-7,18,9,5,'#5b6670');}
      return true;
    }
    case 'cajero_3000': {
      // ATM fortaleza. Debe leerse como máquina, no como personaje.
      metalEdge(ctx,-31,-17,62,39,'#46535b','#9ea9ad','#20272c');
      rect(ctx,-25,-12,50,29,'#5d6b71');rect(ctx,-16,-9,32,14,'#15262b');
      if(alive('emergency_core')){ctx.globalAlpha=.55+.35*pulse;rect(ctx,-12,-6,24,8,phase?'#ff5f52':'#4dd59b');ctx.globalAlpha=1;}
      else {rect(ctx,-12,-6,24,8,'#182226');ctx.strokeStyle='#c85a4b';ctx.beginPath();ctx.moveTo(-9,-5);ctx.lineTo(7,1);ctx.moveTo(9,-5);ctx.lineTo(-4,1);ctx.stroke();}
      rect(ctx,-15,8,30,5,'#262e32');rect(ctx,-9,9,18,3,'#d6b45b');
      // Dos cañones de monedas y depósitos laterales.
      for(const [x,id] of [[-27,'coin_cannon_l'],[27,'coin_cannon_r']] as const){
        if(alive(id)){rect(ctx,x-5,-7,10,22,'#2d373c');rect(ctx,x-3,-20,6,15,'#65737a');px(ctx,x-2,-23,v.secondary,4);}
        else {rect(ctx,x-5,4,10,9,'#252d31');ctx.strokeStyle='#c25d4b';ctx.beginPath();ctx.moveTo(x-4,-1);ctx.lineTo(x+4,7);ctx.stroke();}
      }
      rect(ctx,-23,20,12,6,'#1a2226');rect(ctx,11,20,12,6,'#1a2226');
      if(phase>0){for(let i=0;i<4;i++){const a=i*Math.PI/2+frame*.025;px(ctx,Math.cos(a)*36-2,2+Math.sin(a)*18-2,v.accent,4);}}
      return true;
    }
    case 'captain_honk': {
      // Comandante móvil: ave militar con hombreras, radio y arma lateral.
      rect(ctx,-16,-6,32,26,'#ece9df');rect(ctx,-14,-2,28,20,'#263d53');
      rect(ctx,-10,-16,20,10,'#eee9df');enemyEye(ctx,-7,-13,true);rect(ctx,8,-11,10,3,'#ed8730');
      rect(ctx,-13,-22,26,5,'#1d2a36');rect(ctx,-8,-27,16,6,'#314b63');
      rect(ctx,-24,-4,9,11,'#5b6670');rect(ctx,15,-4,9,11,'#5b6670');
      px(ctx,-21,-1,'#5ea4ff',3);px(ctx,18,-1,'#ff5f57',3);
      for(let i=0;i<3;i++)px(ctx,-5+i*5,8,[v.secondary,'#c65a4b','#84aee0'][i],3);
      // radio + pistola
      if(alive('command_radio')){rect(ctx,-21,10,6,12,'#1f292f');px(ctx,-19,8,v.accent,2);}else{rect(ctx,-20,15,5,5,'#292f31');}
      if(alive('sidearm')){ctx.save();ctx.translate(20,10);ctx.rotate(-.25);rect(ctx,-3,-3,19,5,'#20282e');rect(ctx,12,-4,8,7,'#626f75');ctx.restore();}
      else {rect(ctx,17,9,7,4,'#30383c');px(ctx,23,8,'#c85c4f',2);}
      if(phase>=2){ctx.globalAlpha=.35+.25*pulse;ctx.strokeStyle='#ff5d50';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,2,30,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;}
      return true;
    }
    case 'comisario_pico_duro': {
      // Alto, severo y armado con rifle/bastón de ejecución.
      rect(ctx,-12,-8,24,31,'#e7e4dc');rect(ctx,-10,-3,20,24,'#202e3a');
      rect(ctx,-8,-19,16,11,'#eee9df');enemyEye(ctx,-6,-16,true);rect(ctx,7,-14,9,3,'#ec8731');
      rect(ctx,-13,-25,26,5,'#182631');rect(ctx,-7,-30,14,6,'#30465a');px(ctx,-2,-31,v.secondary,4);
      if(alive('execution_rifle')){ctx.save();ctx.translate(18,3);ctx.rotate(-.62);rect(ctx,-2,-21,4,42,'#22292e');rect(ctx,-5,-22,10,5,'#78848a');rect(ctx,-3,12,6,8,'#4b555b');ctx.restore();}
      else {rect(ctx,12,8,9,4,'#30383d');ctx.strokeStyle='#d36050';ctx.beginPath();ctx.moveTo(14,5);ctx.lineTo(21,12);ctx.stroke();}
      if(alive('command_pack'))rect(ctx,-18,5,6,17,'#3b4650');else rect(ctx,-16,14,4,7,'#2b3134');
      if(phase){rect(ctx,-9,12,18,5,'#58272d');px(ctx,-5,13,'#ff5a4f',3);px(ctx,3,13,'#ff5a4f',3);}
      return true;
    }
    case 'toaster_9000': {
      // Tanque-tostadora gigante con resistencias, cuatro ranuras y patas hidráulicas.
      metalEdge(ctx,-36,-15,72,38,'#5b6264','#b6b9b5','#252a2c');
      rect(ctx,-31,-10,62,28,'#747b7d');
      for(const x of [-24,-8,8,24]){
        const heater=x<0?'heater_l':'heater_r';
        rect(ctx,x-5,-22,10,14,alive(heater)?'#2a2d2e':'#191d1f');
        if(alive(heater)){ctx.globalAlpha=.58+.3*pulse;rect(ctx,x-3,-20,6,10,phase>=2?'#fff27d':phase?'#ff7c38':'#e34d36');ctx.globalAlpha=1;}
        else {ctx.strokeStyle='#b84f44';ctx.beginPath();ctx.moveTo(x-3,-19);ctx.lineTo(x+3,-11);ctx.stroke();}
      }
      rect(ctx,-20,-2,40,12,alive('thermal_core')?'#2f3334':'#202426');for(let i=0;i<4;i++)rect(ctx,-15+i*10,1,5,6,alive('thermal_core')?(i%2?'#d7583b':'#ef8d35'):'#4c3833');
      for(const x of [-27,21]){rect(ctx,x,21,7,12,'#333a3d');rect(ctx,x-3,31,13,4,'#202528');}
      if(phase>0){ctx.globalAlpha=.25+.2*pulse;ctx.fillStyle='#ff673c';ctx.fillRect(-34,15,68,5);ctx.globalAlpha=1;}
      return true;
    }
    case 'general_ganso': {
      // General de guerra: alto, con mochila pesada, rifle y armadura de placas.
      rect(ctx,-15,-7,30,31,'#e9e8df');rect(ctx,-13,-2,26,23,'#394957');
      rect(ctx,-10,-18,20,11,'#eceae2');enemyEye(ctx,-7,-15,true);rect(ctx,8,-13,10,3,'#ee8730');
      rect(ctx,-13,-24,26,5,'#26353f');rect(ctx,-6,-29,12,6,'#4a5f69');
      if(alive('command_radio'))metalEdge(ctx,-24,-4,9,27,'#4a5660','#71808a','#222a2f');else rect(ctx,-20,12,6,8,'#30383c');
      for(let i=0;i<4;i++)px(ctx,-7+i*5,9,[v.secondary,'#c65a4b','#7ba5d1','#d9d9d9'][i],3);
      if(alive('battle_rifle')){ctx.save();ctx.translate(18,8);ctx.rotate(-.38);rect(ctx,-4,-4,31,7,'#252c31');rect(ctx,21,-5,12,9,'#69757a');rect(ctx,5,3,8,10,'#3d454a');ctx.restore();}
      else {rect(ctx,13,11,10,5,'#323a3e');ctx.strokeStyle='#d45a4e';ctx.beginPath();ctx.moveTo(15,7);ctx.lineTo(23,15);ctx.stroke();}
      if(phase>=1){rect(ctx,-18,17,8,7,'#5b6670');rect(ctx,10,17,8,7,'#5b6670');}
      return true;
    }
    case 'don_levadura': {
      // Masa monstruosa: enorme, irregular y cada fase crece físicamente.
      const grow=phase*3;
      ctx.fillStyle='#d4a463';ctx.beginPath();ctx.ellipse(0,5,24+grow,20+grow*.7,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#b87946';ctx.beginPath();ctx.ellipse(-5,9,16+grow*.6,13+grow*.5,.2,0,Math.PI*2);ctx.fill();
      rect(ctx,-9,-7,18,10,'#eee1c8');enemyEye(ctx,-6,-4,true);enemyEye(ctx,4,-4,true);rect(ctx,8,-2,10,4,'#e78531');
      // horno/núcleo hundido
      rect(ctx,-10,7,20,12,alive('oven_core')?'#40261f':'#2c2420');rect(ctx,-7,10,14,7,alive('oven_core')?'#762f24':'#3b2c27');
      if(alive('oven_core')){ctx.globalAlpha=.55+.35*pulse;rect(ctx,-4,12,8,4,phase>=2?'#fff08a':'#ff7036');ctx.globalAlpha=1;}
      else {ctx.strokeStyle='#c4674e';ctx.beginPath();ctx.moveTo(-6,9);ctx.lineTo(5,17);ctx.moveTo(6,10);ctx.lineTo(-3,18);ctx.stroke();}
      const arms=4+phase*2;
      for(let i=0;i<arms;i++){const a=i/arms*Math.PI*2+frame*.012;const side=Math.cos(a)<0?'dough_arm_l':'dough_arm_r';if(!alive(side))continue;ctx.strokeStyle=i%2?'#b97a48':'#d7a766';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(Math.cos(a)*16,7+Math.sin(a)*11);ctx.lineTo(Math.cos(a)*(29+grow),7+Math.sin(a)*(20+grow));ctx.stroke();}
      return true;
    }
    case 'director_seguridad': {
      // Núcleo de seguridad de pared: cámaras, torretas y reactor central.
      metalEdge(ctx,-39,-18,78,42,'#303a40','#7b8d95','#131a1e');
      rect(ctx,-33,-12,66,30,'#425159');
      ctx.fillStyle=alive('security_core')?'#162126':'#241d1d';ctx.beginPath();ctx.arc(0,3,15,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle=alive('security_core')?v.secondary:'#8b4b47';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,3,12,0,Math.PI*2);ctx.stroke();
      if(alive('security_core')){ctx.globalAlpha=.45+.4*pulse;ctx.fillStyle=phase>=2?'#ff514b':v.accent;ctx.beginPath();ctx.arc(0,3,7+phase,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;}
      else {ctx.strokeStyle='#d35c50';ctx.beginPath();ctx.moveTo(-8,-4);ctx.lineTo(8,10);ctx.moveTo(8,-4);ctx.lineTo(-7,10);ctx.stroke();}
      // torretas y cámaras exteriores
      for(const [x,id] of [[-31,'turret_l'],[31,'turret_r']] as const){if(alive(id)){rect(ctx,x-5,-10,10,18,'#20292e');rect(ctx,x-3,-23,6,15,'#65767d');px(ctx,x-2,-26,v.secondary,4);}else{rect(ctx,x-5,1,10,7,'#252d31');px(ctx,x-1,-2,'#d65c50',3);}}
      if(alive('camera_array')){rect(ctx,-12,-27,24,5,'#253036');for(const x of [-7,7]){ctx.fillStyle='#182126';ctx.beginPath();ctx.arc(x,-25,4,0,Math.PI*2);ctx.fill();px(ctx,x-1,-26,v.accent,2);}}
      else {rect(ctx,-10,-26,20,4,'#282b2d');ctx.strokeStyle='#c65a50';ctx.beginPath();ctx.moveTo(-8,-28);ctx.lineTo(8,-22);ctx.stroke();}
      for(const x of [-20,20]){rect(ctx,x-6,16,12,7,'#1f282c');ctx.save();ctx.translate(x,17);ctx.rotate(x<0?.4:-.4);rect(ctx,-2,-2,18,4,'#59686f');ctx.restore();}
      if(phase>0){for(let i=0;i<4+phase;i++){const a=i/(4+phase)*Math.PI*2+frame*.02;px(ctx,Math.cos(a)*45-2,3+Math.sin(a)*20-2,v.accent,4);}}
      return true;
    }
  }
  return false;
}

function drawBossPhaseTransformation(ctx:Ctx,def:BossDef,frame:number,phase:number,v:BossVisual){
  if(phase<=0)return;
  const pulse=.5+.5*Math.sin(frame*.16+def.visualIndex*.27);
  const hot=phase>=2?'#ff554f':v.secondary;
  ctx.save();
  switch(def.role){
    case 'artillery':
      for(const x of [-24,24]){rect(ctx,x-4,-31-phase*3,8,10+phase*3,'#20282d');rect(ctx,x-2,-38-phase*4,4,9,hot);}
      if(phase>=2){rect(ctx,-17,18,34,5,'#4a2424');px(ctx,-3,19,'#ff9b55',6);}
      break;
    case 'duelist':
      rect(ctx,-10,11,6,5,'#6c3737');
      if(phase>=2){ctx.save();ctx.translate(-16,0);ctx.rotate(.52);rect(ctx,-2,-16,4,31,'#252d31');rect(ctx,-4,-18,8,5,hot);ctx.restore();}
      break;
    case 'bulwark':
      ctx.globalAlpha=.45+.25*pulse;rect(ctx,15,-5,7,18,hot);ctx.globalAlpha=1;
      if(phase>=2){rect(ctx,22,-8,7,25,'#2b3034');rect(ctx,25,-5,3,18,'#ff6a55');}
      break;
    case 'swarm':
      for(let i=0;i<2+phase*2;i++){const a=frame*.05+i*Math.PI*2/(2+phase*2);px(ctx,Math.cos(a)*(31+phase*3)-2,Math.sin(a)*(16+phase*2)-2,i%2?hot:v.accent,4);}
      break;
    case 'sniper':
      rect(ctx,-15,17,30,4,'#4a2628');
      if(phase>=2){ctx.save();ctx.translate(5,-12);ctx.rotate(-.04);rect(ctx,0,-3,48,6,'#1b2226');rect(ctx,34,-5,14,10,hot);ctx.restore();}
      break;
    case 'storm':
      ctx.strokeStyle=hot;ctx.lineWidth=2;ctx.globalAlpha=.45+.28*pulse;
      for(let i=0;i<2+phase;i++){const a=frame*(i%2?.06:-.052)+i*1.7;ctx.beginPath();ctx.arc(0,0,30+i*5,a,a+.85);ctx.stroke();}
      ctx.globalAlpha=1;
      break;
    case 'warden':
      for(const x of [-31,31]){rect(ctx,x-3,-22,6,47,'#252d32');rect(ctx,x-1,-18,2,39,hot);}
      if(phase>=2){rect(ctx,-20,-19,40,4,'#424d52');rect(ctx,-14,-21,28,2,v.accent);}
      break;
    case 'charger':
      ctx.fillStyle='#69777c';
      ctx.beginPath();ctx.moveTo(-28,-4);ctx.lineTo(-42-phase*4,-13);ctx.lineTo(-35,3);ctx.closePath();ctx.fill();
      ctx.beginPath();ctx.moveTo(28,-4);ctx.lineTo(42+phase*4,-13);ctx.lineTo(35,3);ctx.closePath();ctx.fill();
      if(phase>=2)rect(ctx,-15,16,30,6,hot);
      break;
    case 'vortex':
      ctx.strokeStyle=hot;ctx.lineWidth=phase>=2?4:3;ctx.globalAlpha=.6;ctx.beginPath();ctx.arc(0,1,23+phase*6,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;
      for(let i=0;i<phase*2;i++){const a=frame*.045+i*Math.PI/phase;px(ctx,Math.cos(a)*(35+phase*2)-2,1+Math.sin(a)*(23+phase)-2,v.accent,4);}
      break;
    case 'executioner':
      rect(ctx,-17,-19,6,42,'#292f33');rect(ctx,-15,-16,2,36,hot);
      if(phase>=2){ctx.save();ctx.translate(18,0);ctx.rotate(.42);rect(ctx,-3,-24,6,47,'#252b2f');rect(ctx,-6,-26,12,7,hot);ctx.restore();}
      break;
    case 'reactor':
      ctx.globalAlpha=.24+.2*pulse;ctx.fillStyle=hot;ctx.beginPath();ctx.arc(0,3,18+phase*7,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
      if(phase>=2){for(let i=0;i<6;i++){const a=i*Math.PI/3;ctx.strokeStyle=v.secondary;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(Math.cos(a)*15,3+Math.sin(a)*15);ctx.lineTo(Math.cos(a)*32,3+Math.sin(a)*32);ctx.stroke();}}
      break;
    case 'trickster':
      for(const side of [-1,1]){ctx.globalAlpha=.35+.25*pulse;ctx.strokeStyle=side<0?v.accent:hot;ctx.lineWidth=2;ctx.beginPath();ctx.arc(side*(22+phase*2),-5,12+phase*2,frame*.05*side,frame*.05*side+Math.PI*1.55);ctx.stroke();}
      ctx.globalAlpha=1;
      break;
  }
  if(phase>=2){
    ctx.strokeStyle='#161b1f';ctx.lineWidth=2;ctx.globalAlpha=.8;
    ctx.beginPath();ctx.moveTo(-9,-8);ctx.lineTo(-3,-1);ctx.lineTo(-8,6);ctx.stroke();
    ctx.beginPath();ctx.moveTo(8,-5);ctx.lineTo(3,2);ctx.lineTo(9,8);ctx.stroke();
    ctx.globalAlpha=.35+.3*pulse;px(ctx,-2,1,hot,5);ctx.globalAlpha=1;
  }
  ctx.restore();
}


function drawBossFactionCore(
  ctx:Ctx,def:BossDef,frame:number,phase:number,v:BossVisual,tier:number,key:number
){
  const pulse=.5+.5*Math.sin(frame*.11+key*.37);
  const elite=tier===2,sub=tier===1;
  const white=def.family==='bakery'?'#f4eee1':'#ecebe4';
  ctx.save();

  switch(def.family){
    case 'command': { // policía / mando táctico
      rect(ctx,-16,-7,32,25,'#dfe4e2');
      rect(ctx,-15,-2,30,19,'#22384f');
      rect(ctx,-11,1,22,14,elite?'#294a68':'#2d4660');
      rect(ctx,-19,0,7,12,'#394b58');rect(ctx,12,0,7,12,'#394b58');
      rect(ctx,-10,-17,20,11,white);enemyEye(ctx,-7,-13,true);rect(ctx,8,-11,10,4,'#ef8b35');
      // casco policial con visor y placa
      rect(ctx,-12,-22,24,5,'#182735');rect(ctx,-8,-26,16,5,'#2b4963');
      rect(ctx,-6,-24,12,2,v.accent);px(ctx,-2,-21,v.secondary,4);
      rect(ctx,-4,4,8,7,'#18242d');px(ctx,-2,5,v.secondary,4);
      // radio y hombros luminosos
      rect(ctx,-22,-6,5,13,'#27333b');px(ctx,-21,-9,v.accent,3);
      if(key%2){px(ctx,17,-4,'#5aa4ff',3);px(ctx,17,1,'#ff5d58',3);}
      break;
    }
    case 'riot': { // policía antidisturbios
      rect(ctx,-19,-7,38,26,'#d8dddc');
      rect(ctx,-17,-2,34,21,'#3a4652');
      rect(ctx,-13,1,26,15,'#485661');
      rect(ctx,-10,-18,20,12,white);rect(ctx,-12,-23,24,7,'#2a343e');
      rect(ctx,-8,-20,16,5,'#11191e');px(ctx,-6,-19,v.accent,3);px(ctx,3,-19,v.accent,3);
      // escudo masivo y porra
      metalEdge(ctx,13,-10,20,35,'#52616d','#8999a4','#242d34');
      rect(ctx,17,-5,12,25,'#2e3a44');rect(ctx,20,1,6,13,v.secondary);
      ctx.save();ctx.translate(-20,5);ctx.rotate(.12);rect(ctx,-2,-16,4,31,'#20292f');rect(ctx,-4,-18,8,5,'#65727a');ctx.restore();
      break;
    }
    case 'war': { // militar
      rect(ctx,-17,-8,34,27,'#e4e5dc');rect(ctx,-16,-2,32,21,'#465343');
      rect(ctx,-12,1,24,16,'#59654f');
      rect(ctx,-20,1,7,13,'#39443a');rect(ctx,13,1,7,13,'#39443a');
      rect(ctx,-10,-18,20,11,white);enemyEye(ctx,-7,-14,true);rect(ctx,8,-12,10,4,'#e58431');
      // casco de combate / montura nocturna
      ctx.fillStyle='#384338';ctx.beginPath();ctx.arc(0,-19,12,Math.PI,Math.PI*2);ctx.fill();
      rect(ctx,-12,-19,24,4,'#303a31');rect(ctx,-4,-25,8,7,'#202821');px(ctx,-2,-27,v.secondary,4);
      // portacargadores y radio
      for(let x=-10;x<=5;x+=5)rect(ctx,x,7,4,7,x%10?v.secondary:'#765c38');
      rect(ctx,-22,-8,5,16,'#283229');px(ctx,-21,-11,v.accent,3);
      if(elite){rect(ctx,17,-8,5,17,'#303a31');rect(ctx,19,-12,3,5,v.secondary);}
      break;
    }
    case 'finance': { // banquero / auditor
      rect(ctx,-16,-7,32,25,'#efe9db');rect(ctx,-14,-1,28,19,'#232b31');
      rect(ctx,-10,1,20,15,'#31433f');
      rect(ctx,-3,0,6,16,v.secondary);
      rect(ctx,-10,-17,20,11,'#f1eadb');enemyEye(ctx,-7,-13,true);rect(ctx,8,-11,9,4,'#e78631');
      // gafas/visor contable
      ctx.strokeStyle='#2b3539';ctx.lineWidth=2;ctx.strokeRect(-8,-15,6,5);ctx.strokeRect(2,-15,6,5);rect(ctx,-2,-13,4,1,'#2b3539');
      // terminal de auditoría + maletín
      rect(ctx,15,-4,10,14,'#25333a');rect(ctx,17,-2,6,6,'#173129');px(ctx,19,0,v.accent,2);
      rect(ctx,-25,3,10,11,'#4b382d');rect(ctx,-23,1,6,3,'#795c3b');px(ctx,-22,6,v.secondary,2);
      if(elite){rect(ctx,-14,-5,4,3,v.secondary);rect(ctx,10,-5,4,3,v.secondary);}
      break;
    }
    case 'wealth': { // ejecutivo bancario blindado
      rect(ctx,-18,-8,36,27,'#eee8da');rect(ctx,-16,-1,32,20,'#20252a');
      rect(ctx,-12,1,24,16,'#353638');rect(ctx,-3,0,6,17,v.accent);
      rect(ctx,-10,-18,20,11,'#eee6d7');enemyEye(ctx,-7,-14,true);rect(ctx,8,-12,10,4,'#e88630');
      // exoesqueleto dorado, sin corona caricaturesca
      metalEdge(ctx,-23,-5,7,18,'#7b642e',v.accent,'#382e19');
      metalEdge(ctx,16,-5,7,18,'#7b642e',v.accent,'#382e19');
      rect(ctx,-10,-22,20,4,'#292823');rect(ctx,-7,-25,14,4,'#454037');
      ctx.strokeStyle=v.secondary;ctx.lineWidth=1;ctx.beginPath();ctx.arc(5,-13,4,0,Math.PI*2);ctx.stroke();
      // brazalete de activos / holograma
      ctx.globalAlpha=.45+.3*pulse;ctx.strokeStyle=v.accent;ctx.beginPath();ctx.arc(22,3,7,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;
      if(elite){rect(ctx,-9,11,18,4,'#171c20');for(let x=-7;x<=5;x+=4)px(ctx,x,12,v.accent,2);}
      break;
    }
    case 'bakery': { // panadero de combate
      // mochila horno detrás
      metalEdge(ctx,-22,-4,10,24,'#554238','#8e6a46','#2a211c');
      ctx.globalAlpha=.45+.3*pulse;rect(ctx,-20,1,6,12,phase?'#e25d35':'#8f482d');ctx.globalAlpha=1;
      rect(ctx,-17,-8,34,27,'#f0e9dc');rect(ctx,-15,-1,30,20,'#8a5b3c');
      rect(ctx,-10,2,20,15,'#d7c1a0');rect(ctx,-8,4,16,11,'#6d4934');
      // cabeza y gran gorro
      rect(ctx,-10,-17,20,11,'#f1e4d1');enemyEye(ctx,-7,-13,true);rect(ctx,8,-11,9,4,'#e68131');
      rect(ctx,-13,-23,26,6,'#f0eee7');rect(ctx,-9,-29,18,8,'#faf7ef');rect(ctx,-4,-32,8,4,'#fffdf8');
      // pala/rodillo industrial
      ctx.save();ctx.translate(20,4);ctx.rotate(-.45+(key%3)*.08);rect(ctx,-1,-17,3,30,'#735035');rect(ctx,-6,-21,13,7,'#9d6a3f');ctx.restore();
      if(elite){rect(ctx,-13,11,26,4,'#44352d');px(ctx,-8,12,v.secondary,2);px(ctx,6,12,v.secondary,2);}
      break;
    }
    case 'tech': { // dron de combate
      const wing=elite?31:sub?28:25;
      ctx.fillStyle='#25343c';ctx.beginPath();ctx.moveTo(-18,-10);ctx.lineTo(18,-10);ctx.lineTo(23,2);ctx.lineTo(14,17);ctx.lineTo(-14,17);ctx.lineTo(-23,2);ctx.closePath();ctx.fill();
      rect(ctx,-14,-6,28,17,'#3b515b');rect(ctx,-9,-3,18,10,'#14252c');
      // sensor principal
      ctx.globalAlpha=.55+.4*pulse;rect(ctx,-5,-1,10,6,phase>=2?'#ff4f52':v.accent);ctx.globalAlpha=1;
      rect(ctx,-wing,-4,wing-18,5,'#465a63');rect(ctx,18,-4,wing-18,5,'#465a63');
      for(const x of [-wing+2,wing-7]){
        ctx.strokeStyle='#7d8d94';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,-3,7,0,Math.PI*2);ctx.stroke();
        ctx.save();ctx.translate(x,-3);ctx.rotate(frame*.12*(x<0?-1:1));rect(ctx,-8,-1,16,2,'#97a5aa');rect(ctx,-1,-8,2,16,'#97a5aa');ctx.restore();
      }
      // cañones bajo ala y propulsores
      rect(ctx,-18,8,7,12,'#20292e');rect(ctx,11,8,7,12,'#20292e');
      rect(ctx,-16,18,4,5,v.secondary);rect(ctx,12,18,4,5,v.secondary);
      if(elite){rect(ctx,-5,-15,10,6,'#20292e');px(ctx,-2,-18,'#ef5e62',4);}
      break;
    }
    case 'vault': { // IA de bóveda / núcleo autónomo
      // anillos flotantes detrás del núcleo
      ctx.globalAlpha=.62;ctx.strokeStyle='#4e496f';ctx.lineWidth=3;
      ctx.beginPath();ctx.ellipse(0,0,27+tier*3,17+tier*2,frame*.015,0,Math.PI*2);ctx.stroke();
      ctx.strokeStyle=v.secondary;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,0,18+tier*2,28+tier*3,-frame*.012,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;
      // cuerpo no orgánico
      ctx.fillStyle='#292642';ctx.beginPath();ctx.moveTo(0,-24);ctx.lineTo(20,-8);ctx.lineTo(16,17);ctx.lineTo(0,27);ctx.lineTo(-16,17);ctx.lineTo(-20,-8);ctx.closePath();ctx.fill();
      rect(ctx,-13,-9,26,21,'#3c375e');rect(ctx,-9,-5,18,13,'#151b2a');
      // ojo IA
      ctx.globalAlpha=.55+.4*pulse;rect(ctx,-6,-2,12,7,phase>=2?'#ff4b55':v.accent);px(ctx,-2,0,'#e8ffff',4);ctx.globalAlpha=1;
      // nodos laterales
      for(const x of [-24,24]){rect(ctx,x-4,-4,8,12,'#302d4b');px(ctx,x-2,-1,v.secondary,4);}
      if(elite){for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5]){const xx=Math.cos(a)*33,yy=Math.sin(a)*22;px(ctx,xx-2,yy-2,v.accent,4);}}
      break;
    }
  }

  // Firma individual: rango, serial y desgaste determinista, sin alterar la facción.
  const rank=1+(key%4);
  for(let i=0;i<rank;i++)rect(ctx,-7+i*4,14,3,2,i%2?v.secondary:v.accent);
  if((key>>2)%2)px(ctx,-13,-5,v.secondary,2);
  if((key>>3)%2)px(ctx,11,-5,v.accent,2);
  if(phase>=1){
    ctx.globalAlpha=.22+.18*pulse;ctx.strokeStyle=phase>=2?'#ff5454':v.accent;ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(0,1,24+tier*3+phase*3,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;
  }
  ctx.restore();
}


function iconicPartAlive(parts:BossPartState[]|undefined,id:string){
  const p=parts?.find(x=>x.id===id);
  return p?!p.destroyed:true;
}
function iconicPartRatio(parts:BossPartState[]|undefined,id:string){
  const p=parts?.find(x=>x.id===id);
  return p?Math.max(0,Math.min(1,p.hp/Math.max(1,p.maxHp))):1;
}
function drawBrokenModule(ctx:Ctx,x:number,y:number,frame:number,hot='#ff7048'){
  const pulse=.45+.35*Math.sin(frame*.19+x*.07);
  ctx.save();
  ctx.globalAlpha=.62;
  rect(ctx,x-4,y-3,8,6,'#242b2e');px(ctx,x-2,y-1,'#111719',3);
  ctx.globalAlpha=.35+.35*pulse;px(ctx,x+2,y-5,hot,2);px(ctx,x-5,y+2,'#d8e1df',1);
  ctx.strokeStyle='#555f61';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(x-2,y+2);ctx.lineTo(x-6,y+8);ctx.moveTo(x+1,y+2);ctx.lineTo(x+5,y+7);ctx.stroke();
  ctx.restore();
}
function drawBossPartWear(ctx:Ctx,parts:BossPartState[]|undefined,frame:number){
  if(!parts?.length)return;
  ctx.save();
  for(const p of parts){
    const r=p.maxHp>0?p.hp/p.maxHp:0;
    if(p.destroyed){
      drawBrokenModule(ctx,p.offsetX,p.offsetY,frame,p.kind==='oven'||p.kind==='reactor'||p.kind==='core'?'#ff6b43':'#d5e0e4');
      continue;
    }
    if(r<.68){
      ctx.strokeStyle=r<.32?'#171b1d':'#343c3f';ctx.lineWidth=1;ctx.globalAlpha=r<.32?.9:.58;
      ctx.beginPath();ctx.moveTo(p.offsetX-3,p.offsetY-4);ctx.lineTo(p.offsetX+1,p.offsetY);ctx.lineTo(p.offsetX-2,p.offsetY+4);ctx.stroke();
      if(r<.35){ctx.globalAlpha=.55;px(ctx,p.offsetX+3,p.offsetY-3,'#ff8154',2);}
    }
  }
  ctx.restore();
}

/**
 * Diseños artesanales para los encuentros emblemáticos.
 * Devuelve true cuando el cuerpo completo ya fue dibujado y no debe usarse
 * la plantilla de facción genérica.
 */

function drawIconicDuckReadability(ctx:Ctx,family:string,frame:number,phase:number,v:BossVisual){
  const mechanical=family==='tech'||family==='vault';
  const body=mechanical?(family==='vault'?'#4a4569':'#536b74'):
    family==='bakery'?'#f3eadb':'#eee9dd';
  const shade=mechanical?'#2d3940':family==='bakery'?'#cba878':'#b9c0bd';
  const beak=mechanical?(family==='vault'?'#c4a34b':'#d79640'):'#ef8d2c';
  const darkBeak=mechanical?'#745625':'#c7671d';
  const bob=Math.round(Math.sin(frame*.08)*.5);

  ctx.save();ctx.translate(0,bob);

  // Cabeza frontal de pato superpuesta sobre el equipo del jefe.
  ctx.fillStyle=body;ctx.beginPath();ctx.ellipse(0,-15,11,9,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=shade;ctx.beginPath();ctx.ellipse(-6,-13,4,5,-.3,0,Math.PI*2);ctx.fill();
  if(mechanical){
    ctx.strokeStyle=v.secondary;ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(0,-15,10,8,0,0,Math.PI*2);ctx.stroke();
  }
  const eye=phase>=2?'#ff514e':'#10161a';
  px(ctx,-5,-17,mechanical?v.accent:eye,2);px(ctx,4,-17,mechanical?v.accent:eye,2);
  if(mechanical){px(ctx,-4,-16,'#eaffff',1);px(ctx,5,-16,'#eaffff',1);}
  rect(ctx,-7,-12,14,5,beak);rect(ctx,-5,-7,10,2,darkBeak);
  px(ctx,-4,-10,'#8b4a1d',1);px(ctx,3,-10,'#8b4a1d',1);

  // Ala y patas mantienen lectura aviar aunque el torso esté cubierto.
  ctx.fillStyle=shade;ctx.beginPath();ctx.ellipse(10,5,6,8,.35,0,Math.PI*2);ctx.fill();
  rect(ctx,-10,18,7,3,beak);rect(ctx,-12,21,10,2,darkBeak);
  rect(ctx,3,18,7,3,beak);rect(ctx,2,21,10,2,darkBeak);
  ctx.restore();
}

function drawIconicBossBodyV3(
  ctx:Ctx,bossType:string,frame:number,phase:number,v:BossVisual,tier:number,parts?:BossPartState[]
){
  const pulse=.5+.5*Math.sin(frame*.12);
  const alive=(id:string)=>iconicPartAlive(parts,id);
  const ratio=(id:string)=>iconicPartRatio(parts,id);
  ctx.save();

  switch(bossType){
    case 'tax_collector': { // recaudador alto, abrigo y sello fiscal
      rect(ctx,-12,-7,24,28,'#eee8dc');rect(ctx,-11,-1,22,22,'#26322f');
      rect(ctx,-3,-1,6,21,'#8f2634');rect(ctx,-9,3,6,15,'#3d4b46');rect(ctx,3,3,6,15,'#3d4b46');
      rect(ctx,-8,-19,16,12,'#efe8db');enemyEye(ctx,-5,-15,true);rect(ctx,7,-13,9,4,'#e68931');
      rect(ctx,-11,-24,22,5,'#1e2728');rect(ctx,-6,-27,12,4,'#384540');
      ctx.save();ctx.translate(18,5);ctx.rotate(-.18);rect(ctx,-2,-18,4,28,'#6f2530');rect(ctx,-6,-22,12,7,'#a83d49');ctx.restore();
      rect(ctx,-22,3,11,14,'#46382f');rect(ctx,-20,1,7,4,'#7a5c39');px(ctx,-18,7,v.secondary,3);
      if(phase){rect(ctx,-13,18,26,3,'#6d2029');}
      break;
    }
    case 'sargento_migajas': { // suboficial militar compacto con escopeta
      rect(ctx,-17,-7,34,25,'#e4e6dc');rect(ctx,-15,-1,30,19,'#4c5948');
      rect(ctx,-11,2,22,14,'#5f6b55');for(let x=-9;x<=5;x+=7)rect(ctx,x,6,5,8,'#7d623e');
      rect(ctx,-9,-18,18,11,'#efe8da');enemyEye(ctx,-6,-14,true);rect(ctx,7,-12,9,4,'#e58731');
      ctx.fillStyle='#394538';ctx.beginPath();ctx.arc(0,-19,11,Math.PI,Math.PI*2);ctx.fill();rect(ctx,-10,-19,20,4,'#303a31');
      ctx.save();ctx.translate(17,7);ctx.rotate(-.18);rect(ctx,-2,-4,32,5,'#30383b');rect(ctx,18,-6,11,9,'#69767a');ctx.restore();
      px(ctx,-19,-9,v.secondary,3);rect(ctx,-22,-6,4,13,'#2a332b');
      break;
    }
    case 'dron_centinela': { // dron centinela quadrotor
      const rot=frame*.14;
      ctx.fillStyle='#27363e';ctx.beginPath();ctx.moveTo(-20,-10);ctx.lineTo(20,-10);ctx.lineTo(27,1);ctx.lineTo(16,15);ctx.lineTo(-16,15);ctx.lineTo(-27,1);ctx.closePath();ctx.fill();
      rect(ctx,-13,-5,26,15,'#3e545d');rect(ctx,-7,-2,14,8,'#12262d');
      ctx.globalAlpha=.55+.4*pulse;rect(ctx,-4,0,8,4,phase>=1?'#ff5d59':v.accent);ctx.globalAlpha=1;
      for(const x of [-31,31]){
        rect(ctx,x<0?x:x-10,-4,10,4,'#586b73');
        ctx.save();ctx.translate(x,-3);ctx.rotate(rot*(x<0?-1:1));rect(ctx,-8,-1,16,2,'#98a8ac');rect(ctx,-1,-8,2,16,'#98a8ac');ctx.restore();
      }
      rect(ctx,-18,10,6,11,'#20292e');rect(ctx,12,10,6,11,'#20292e');
      if(phase>=1){rect(ctx,-5,-15,10,6,'#1d282d');px(ctx,-2,-18,v.secondary,4);}
      break;
    }
    case 'panadero_loco': { // panadero explosivo con mochila de masa
      metalEdge(ctx,-22,-4,10,24,'#574338','#946c48','#2c221d');
      rect(ctx,-17,-8,34,27,'#f1eadf');rect(ctx,-15,-1,30,20,'#8b5d3d');rect(ctx,-10,2,20,15,'#d8c3a2');
      rect(ctx,-10,-18,20,11,'#f0e4d2');enemyEye(ctx,-7,-14,true);rect(ctx,8,-12,9,4,'#e68131');
      rect(ctx,-13,-24,26,6,'#f3f0e8');rect(ctx,-9,-30,18,8,'#fbf8f1');
      ctx.save();ctx.translate(20,4);ctx.rotate(-.42);rect(ctx,-2,-17,4,29,'#745137');ctx.fillStyle='#c58a51';ctx.beginPath();ctx.arc(0,-19,7,0,Math.PI*2);ctx.fill();ctx.restore();
      for(const x of [-8,0,8]){ctx.globalAlpha=.35+.3*pulse;px(ctx,x,13,phase?'#ff7540':'#b57b4d',3);}ctx.globalAlpha=1;
      break;
    }
    case 'head_baker': { // jefe panadero industrial, horno central
      metalEdge(ctx,-22,-6,44,30,'#574437','#94704a','#2b211c');
      rect(ctx,-17,-4,34,25,'#efe6d8');rect(ctx,-13,1,26,18,'#94613f');
      rect(ctx,-9,-19,18,12,'#f1e4d2');enemyEye(ctx,-6,-15,true);rect(ctx,7,-13,9,4,'#e48130');
      rect(ctx,-14,-25,28,6,'#f4f1e9');rect(ctx,-10,-32,20,9,'#fcfaf3');
      if(alive('oven_core')){
        const r=ratio('oven_core');rect(ctx,-9,5,18,12,'#362a22');
        ctx.globalAlpha=.45+.4*pulse;rect(ctx,-6,8,12,6,r<.35?'#ff4f38':'#ff7d42');ctx.globalAlpha=1;
      }else drawBrokenModule(ctx,0,10,frame,'#ff673f');
      if(alive('paddle')){ctx.save();ctx.translate(25,4);ctx.rotate(-.52);rect(ctx,-2,-21,5,37,'#8f6038');rect(ctx,-8,-26,17,8,'#c8874e');ctx.restore();}
      else drawBrokenModule(ctx,24,3,frame);
      if(phase>=1){rect(ctx,-20,17,8,5,'#6f4632');rect(ctx,12,17,8,5,'#6f4632');}
      break;
    }
    case 'el_auditor': { // auditor alto, sello y maletín
      rect(ctx,-11,-9,22,30,'#eee8dc');rect(ctx,-10,-2,20,23,'#20272b');rect(ctx,-3,-2,6,22,'#8f2634');
      rect(ctx,-8,-20,16,11,'#f0e9dc');enemyEye(ctx,-5,-16,true);rect(ctx,7,-14,9,4,'#e68631');
      ctx.strokeStyle='#2b3336';ctx.lineWidth=2;ctx.strokeRect(-7,-18,5,4);ctx.strokeRect(2,-18,5,4);rect(ctx,-2,-16,4,1,'#2b3336');
      if(alive('briefcase')){rect(ctx,-24,3,12,15,'#47372d');rect(ctx,-21,0,6,4,'#7a5c39');px(ctx,-20,8,v.secondary,3);}
      else drawBrokenModule(ctx,-17,9,frame);
      if(alive('execution_seal')){ctx.save();ctx.translate(17,1);ctx.rotate(-.15);rect(ctx,-2,-15,4,27,'#722631');rect(ctx,-7,-19,14,8,'#a93c49');ctx.restore();}
      else drawBrokenModule(ctx,15,-2,frame,'#cf4450');
      if(phase>=1){ctx.globalAlpha=.35+.25*pulse;ctx.strokeStyle='#a93440';ctx.beginPath();ctx.ellipse(0,1,16+phase*5,27+phase*4,0,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;}
      break;
    }
    case 'ganso_antidisturbios': { // tanque riot
      rect(ctx,-20,-8,40,28,'#dde1df');rect(ctx,-18,-2,36,22,'#3b4752');rect(ctx,-13,2,26,15,'#4b5963');
      rect(ctx,-10,-19,20,12,'#e5e8e5');rect(ctx,-13,-24,26,7,'#29343d');rect(ctx,-9,-21,18,5,'#11191e');
      px(ctx,-7,-20,v.accent,3);px(ctx,4,-20,v.accent,3);
      if(alive('riot_shield')){
        metalEdge(ctx,14,-12,22,38,'#52616d','#8b9ba4','#242d34');rect(ctx,18,-7,14,28,'#303c45');rect(ctx,21,0,8,13,v.secondary);
      }else drawBrokenModule(ctx,25,6,frame);
      ctx.save();ctx.translate(-21,5);ctx.rotate(.11);rect(ctx,-2,-17,4,32,'#20292f');rect(ctx,-5,-20,10,6,'#68757b');ctx.restore();
      if(phase>=1&&alive('riot_shield')){for(let y=-8;y<20;y+=9){ctx.fillStyle='#9ba7ad';ctx.beginPath();ctx.moveTo(35,y);ctx.lineTo(40,y+3);ctx.lineTo(35,y+6);ctx.closePath();ctx.fill();}}
      break;
    }
    case 'cajero_3000': { // mech ATM estacionario
      metalEdge(ctx,-27,-14,54,40,'#293237','#75848a','#151b1e');rect(ctx,-21,-9,42,30,'#3b4a50');
      rect(ctx,-13,-6,26,13,'#16272d');ctx.globalAlpha=.55+.4*pulse;rect(ctx,-9,-3,18,6,phase>=1?'#ff6257':v.accent);ctx.globalAlpha=1;
      rect(ctx,-10,10,20,8,'#20292d');rect(ctx,-6,12,12,3,v.secondary);
      if(alive('coin_cannon_l')){metalEdge(ctx,-42,-8,12,28,'#303b40','#7d8d91','#1b2225');rect(ctx,-48,0,12,6,'#20282c');}
      else drawBrokenModule(ctx,-42,-4,frame);
      if(alive('coin_cannon_r')){metalEdge(ctx,30,-8,12,28,'#303b40','#7d8d91','#1b2225');rect(ctx,36,0,12,6,'#20282c');}
      else drawBrokenModule(ctx,42,-4,frame);
      if(phase>=1){
        if(alive('emergency_core')){ctx.strokeStyle='#59d7a7';ctx.lineWidth=2;ctx.globalAlpha=.45+.35*pulse;ctx.beginPath();ctx.arc(0,1,13+phase*4,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;}
        else drawBrokenModule(ctx,0,-3,frame,'#ff6b43');
      }
      break;
    }
    case 'captain_honk': { // capitán policial moderno
      rect(ctx,-17,-8,34,27,'#e2e6e4');rect(ctx,-16,-2,32,21,'#22394f');rect(ctx,-11,1,22,16,'#2b4b69');
      rect(ctx,-10,-19,20,12,'#eee9de');enemyEye(ctx,-7,-15,true);rect(ctx,8,-13,10,4,'#ee8b35');
      rect(ctx,-13,-24,26,6,'#182835');rect(ctx,-8,-28,16,5,'#2d4d67');px(ctx,-2,-26,v.secondary,4);
      rect(ctx,-4,5,8,7,'#17242d');px(ctx,-2,6,v.secondary,4);
      px(ctx,-18,-8,'#5da6ff',3);px(ctx,16,-8,'#ff5d58',3);
      if(alive('command_radio')){rect(ctx,-23,-5,5,15,'#26343b');px(ctx,-22,-9,v.accent,3);}else drawBrokenModule(ctx,-21,8,frame);
      if(alive('sidearm')){ctx.save();ctx.translate(19,8);ctx.rotate(-.12);rect(ctx,-2,-3,22,5,'#30383c');rect(ctx,12,-5,8,3,'#8d9a9d');ctx.restore();}
      else drawBrokenModule(ctx,23,9,frame);
      break;
    }
    case 'comisario_pico_duro': { // comisario francotirador
      rect(ctx,-12,-10,24,32,'#e6e8e2');rect(ctx,-11,-2,22,24,'#1f3346');rect(ctx,-8,1,16,18,'#2c455d');
      rect(ctx,-8,-21,16,12,'#eee9dd');enemyEye(ctx,-5,-17,true);rect(ctx,7,-15,9,4,'#e88932');
      rect(ctx,-11,-26,22,6,'#172532');rect(ctx,-5,-30,10,5,'#314f68');
      if(alive('execution_rifle')){ctx.save();ctx.translate(15,3);ctx.rotate(-.54);rect(ctx,-2,-28,5,47,'#333d41');rect(ctx,-4,-31,9,6,'#8e999d');rect(ctx,0,-16,12,4,'#252d31');ctx.restore();}
      else drawBrokenModule(ctx,17,2,frame);
      if(alive('command_pack')){rect(ctx,-19,1,7,20,'#27343a');px(ctx,-17,-4,v.secondary,3);}else drawBrokenModule(ctx,-15,8,frame);
      if(phase>=2){ctx.strokeStyle='#d95b50';ctx.beginPath();ctx.moveTo(10,-16);ctx.lineTo(19,18);ctx.stroke();}
      break;
    }
    case 'toaster_9000': { // dron de asalto pesado
      ctx.fillStyle='#26343a';ctx.beginPath();ctx.moveTo(-28,-12);ctx.lineTo(28,-12);ctx.lineTo(38,-1);ctx.lineTo(28,20);ctx.lineTo(-28,20);ctx.lineTo(-38,-1);ctx.closePath();ctx.fill();
      rect(ctx,-20,-8,40,24,'#3b5058');rect(ctx,-12,-4,24,13,'#14252b');
      ctx.globalAlpha=.55+.4*pulse;rect(ctx,-6,-1,12,7,phase>=2?'#ff4f52':v.accent);ctx.globalAlpha=1;
      if(alive('heater_l')){metalEdge(ctx,-39,-15,18,18,'#4b3d35','#a56b43','#241d19');ctx.globalAlpha=.35+.3*pulse;rect(ctx,-35,-11,10,10,'#ff7442');ctx.globalAlpha=1;}
      else drawBrokenModule(ctx,-31,-14,frame,'#ff6b43');
      if(alive('heater_r')){metalEdge(ctx,21,-15,18,18,'#4b3d35','#a56b43','#241d19');ctx.globalAlpha=.35+.3*pulse;rect(ctx,25,-11,10,10,'#ff7442');ctx.globalAlpha=1;}
      else drawBrokenModule(ctx,31,-14,frame,'#ff6b43');
      for(const x of [-34,34]){ctx.strokeStyle='#87989e';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,15,8,0,Math.PI*2);ctx.stroke();ctx.save();ctx.translate(x,15);ctx.rotate(frame*.13*(x<0?-1:1));rect(ctx,-9,-1,18,2,'#9aa9ad');rect(ctx,-1,-9,2,18,'#9aa9ad');ctx.restore();}
      rect(ctx,-18,16,7,12,'#20292e');rect(ctx,11,16,7,12,'#20292e');
      if(phase>=1&&!alive('thermal_core'))drawBrokenModule(ctx,0,5,frame,'#ff633f');
      break;
    }
    case 'general_ganso': { // general con exoesqueleto militar
      rect(ctx,-18,-9,36,29,'#e4e6dc');rect(ctx,-17,-2,34,22,'#465443');rect(ctx,-12,1,24,17,'#596650');
      metalEdge(ctx,-23,-1,7,20,'#343f35','#687565','#202720');metalEdge(ctx,16,-1,7,20,'#343f35','#687565','#202720');
      rect(ctx,-10,-20,20,12,'#eee9db');enemyEye(ctx,-7,-16,true);rect(ctx,8,-14,10,4,'#e58731');
      ctx.fillStyle='#394438';ctx.beginPath();ctx.arc(0,-21,12,Math.PI,Math.PI*2);ctx.fill();rect(ctx,-12,-21,24,4,'#303a31');rect(ctx,-4,-27,8,7,'#202821');
      if(alive('command_radio')){rect(ctx,-23,-8,5,17,'#283229');px(ctx,-22,-11,v.accent,3);}else drawBrokenModule(ctx,-19,5,frame);
      if(alive('battle_rifle')){ctx.save();ctx.translate(20,7);ctx.rotate(-.22);rect(ctx,-2,-4,38,6,'#30383b');rect(ctx,23,-7,13,11,'#667378');rect(ctx,8,-7,9,4,v.secondary);ctx.restore();}
      else drawBrokenModule(ctx,22,8,frame);
      if(phase>=2){rect(ctx,-10,11,20,5,'#242e27');for(let x=-8;x<=4;x+=4)px(ctx,x,12,'#d65d50',2);}
      break;
    }
    case 'don_levadura': { // mutación de masa con horno vivo
      ctx.globalAlpha=.9;ctx.fillStyle='#8b593a';ctx.beginPath();ctx.ellipse(0,5,23+phase*3,20+phase*2,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#d2aa78';ctx.beginPath();ctx.ellipse(0,1,16+phase*2,14+phase*2,0,0,Math.PI*2);ctx.fill();
      rect(ctx,-8,-18,16,12,'#f0e2ce');enemyEye(ctx,-6,-14,true);rect(ctx,6,-12,9,4,'#e17b2e');
      rect(ctx,-12,-24,24,6,'#efece4');rect(ctx,-7,-29,14,7,'#faf8f1');
      const arms=phase>=2?6:4;
      for(let i=0;i<arms;i++){
        const a=i/arms*Math.PI*2+frame*.01;
        const id=Math.cos(a)<0?'dough_arm_l':'dough_arm_r';
        if(!alive(id))continue;
        ctx.strokeStyle=i%2?'#d8a36c':'#b97849';ctx.lineWidth=4;
        ctx.beginPath();ctx.moveTo(Math.cos(a)*12,6+Math.sin(a)*10);ctx.quadraticCurveTo(Math.cos(a+.4)*29,6+Math.sin(a+.4)*18,Math.cos(a)*(34+phase*4),6+Math.sin(a)*(24+phase*3));ctx.stroke();
      }
      if(alive('oven_core')){ctx.globalAlpha=.45+.4*pulse;rect(ctx,-7,7,14,9,phase>=2?'#fff09a':'#ff793b');ctx.globalAlpha=1;}
      else drawBrokenModule(ctx,0,8,frame,'#ff6b43');
      break;
    }
    case 'director_seguridad': { // núcleo IA de seguridad de gran escala
      ctx.globalAlpha=.68;ctx.strokeStyle='#4d6470';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(0,2,35,22,frame*.008,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;
      metalEdge(ctx,-22,-15,44,37,'#28343a','#52656d','#151c20');rect(ctx,-15,-8,30,23,'#34474f');rect(ctx,-10,-4,20,14,'#14262d');
      if(alive('security_core')){ctx.globalAlpha=.55+.4*pulse;rect(ctx,-6,0,12,7,phase>=2?'#ff5e59':v.accent);px(ctx,-2,2,'#eaffff',4);ctx.globalAlpha=1;}
      else drawBrokenModule(ctx,0,7,frame,'#ff6542');
      if(alive('camera_array')){for(const x of [-7,7]){rect(ctx,x-3,-24,6,10,'#26343a');px(ctx,x-1,-22,v.secondary,3);}}
      else drawBrokenModule(ctx,0,-23,frame);
      if(alive('turret_l')){metalEdge(ctx,-56,-8,15,28,'#303b40','#7e8d92','#1b2225');rect(ctx,-61,-1,10,5,'#222a2e');}
      else drawBrokenModule(ctx,-54,-3,frame);
      if(alive('turret_r')){metalEdge(ctx,41,-8,15,28,'#303b40','#7e8d92','#1b2225');rect(ctx,51,-1,10,5,'#222a2e');}
      else drawBrokenModule(ctx,54,-3,frame);
      if(phase>=2){for(let i=0;i<4;i++){const a=i*Math.PI/2+frame*.01;px(ctx,Math.cos(a)*31-2,2+Math.sin(a)*20-2,phase>=2?'#ff5e59':v.secondary,4);}}
      break;
    }
    default: ctx.restore(); return false;
  }

  // Última capa: nunca permitir que armadura, horno, escudo o chasis borren
  // la lectura de pato del encuentro emblemático.
  drawIconicDuckReadability(ctx,v.family,frame,phase,v);
  drawBossPartWear(ctx,parts,frame);
  ctx.restore();
  return true;
}

function drawFinalBankBossV2(ctx:Ctx,frame:number,phase:number,v:BossVisual,parts?:BossPartState[]){
  const pulse=.5+.5*Math.sin(frame*.12);
  ctx.save();
  // halo de bóveda/IA
  ctx.globalAlpha=.65;ctx.strokeStyle='#735f2a';ctx.lineWidth=4;
  ctx.beginPath();ctx.arc(0,2,34,0,Math.PI*2);ctx.stroke();
  for(let i=0;i<8;i++){const a=i*Math.PI/4+frame*.004;ctx.strokeStyle=i%2?v.accent:'#6f7780';ctx.beginPath();ctx.arc(0,2,28,a,a+.34);ctx.stroke();}
  ctx.globalAlpha=1;

  // exotraje ejecutivo
  metalEdge(ctx,-23,-10,46,34,'#272c31','#a98235','#14191c');
  rect(ctx,-18,-5,36,24,'#343b40');rect(ctx,-13,-1,26,17,'#1f2529');
  rect(ctx,-4,-2,8,18,v.accent);
  // puerta/núcleo de bóveda en pecho: se expone en fase 2 y puede romperse.
  ctx.fillStyle='#13191d';ctx.beginPath();ctx.arc(0,7,10,0,Math.PI*2);ctx.fill();
  if(iconicPartAlive(parts,'vault_core')){
    ctx.strokeStyle=v.accent;ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,7,8,0,Math.PI*2);ctx.stroke();
    for(let i=0;i<6;i++){const a=i*Math.PI/3;ctx.beginPath();ctx.moveTo(0,7);ctx.lineTo(Math.cos(a)*7,7+Math.sin(a)*7);ctx.stroke();}
  }else{
    drawBrokenModule(ctx,0,7,frame,'#ff5a45');
  }

  // Presidente-pato: la cabeza y el pico siguen siendo legibles aun dentro
  // del exotraje. El equipo ejecutivo se monta alrededor, nunca encima del rostro.
  ctx.fillStyle='#eee8dc';ctx.beginPath();ctx.ellipse(0,-17,12,10,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#d6d0c5';ctx.beginPath();ctx.ellipse(-6,-15,4,6,-.3,0,Math.PI*2);ctx.fill();
  px(ctx,-5,-19,'#15191b',2);px(ctx,4,-19,'#15191b',2);
  rect(ctx,-7,-14,14,5,'#e88832');rect(ctx,-5,-9,10,2,'#bb681f');
  rect(ctx,-12,-27,24,5,'#22272b');rect(ctx,-8,-31,16,5,'#3b3c38');rect(ctx,-5,-30,10,2,v.accent);
  rect(ctx,-10,18,7,3,'#e88832');rect(ctx,-12,21,10,2,'#bb681f');
  rect(ctx,3,18,7,3,'#e88832');rect(ctx,2,21,10,2,'#bb681f');

  // brazos mecánicos: maletín-cañón + terminal de mando, ambos destruibles.
  if(iconicPartAlive(parts,'executive_cannon')){
    metalEdge(ctx,-34,-5,11,22,'#3d454a','#8c6e2e','#1b2125');
    rect(ctx,-37,7,16,9,'#30271f');rect(ctx,-34,5,10,3,'#7c5d31');px(ctx,-31,10,v.secondary,3);
  }else drawBrokenModule(ctx,-32,4,frame);
  if(iconicPartAlive(parts,'command_terminal')){
    metalEdge(ctx,23,-5,11,22,'#3d454a','#8c6e2e','#1b2125');
    rect(ctx,25,-2,7,9,'#13272d');px(ctx,27,0,phase>=2?'#ff5050':'#5ad2c4',3);
  }else drawBrokenModule(ctx,29,2,frame);

  // drones de escolta destruibles
  for(const side of [-1,1] as const){
    const id=side<0?'escort_drone_l':'escort_drone_r';
    const x=side*(34+phase*3),y=-18+Math.sin(frame*.08+side)*3;
    if(iconicPartAlive(parts,id)){
      rect(ctx,x-5,y-3,10,7,'#28343a');px(ctx,x-2,y-1,side<0?v.secondary:v.accent,4);
      rect(ctx,x-10,y-1,5,2,'#64767e');rect(ctx,x+5,y-1,5,2,'#64767e');
    }else drawBrokenModule(ctx,x,y,frame);
  }

  if(phase>=1){
    ctx.globalAlpha=.2+.14*pulse;ctx.fillStyle=phase>=2?'#ff4d54':v.accent;ctx.beginPath();ctx.arc(0,3,42+phase*5,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
    // IA toma control: ópticas y pórticos externos
    for(const x of [-30,27]){rect(ctx,x,-22,4,31,'#75602b');px(ctx,x, -25,phase>=2?'#ff4d54':v.secondary,4);}
  }
  if(phase>=2){
    ctx.strokeStyle='#ff4d54';ctx.lineWidth=2;
    for(let i=0;i<10;i++){const a=i*Math.PI/5+frame*.01;ctx.beginPath();ctx.moveTo(Math.cos(a)*36,3+Math.sin(a)*26);ctx.lineTo(Math.cos(a)*45,3+Math.sin(a)*33);ctx.stroke();}
    if(iconicPartAlive(parts,'vault_core')){ctx.globalAlpha=.55+.35*pulse;px(ctx,-3,4,'#ff4d54',6);ctx.globalAlpha=1;}
  }
  drawBossPartWear(ctx,parts,frame);
  ctx.restore();
}


function drawBossFamilySignatureV3(
  ctx:Ctx,def:BossDef,frame:number,phase:number,v:BossVisual,tier:number,key:number
){
  const pulse=.5+.5*Math.sin(frame*.11+key*.23);
  const band=def.floorBand??0;
  ctx.save();
  switch(def.family){
    case 'command':
      rect(ctx,-12,-27,24,4,'#172632');rect(ctx,-6,-30,12,4,'#294c68');
      px(ctx,-9,-29,'#5da8ff',3);px(ctx,7,-29,'#ff5d58',3);
      rect(ctx,-4,12,8,5,'#18262d');px(ctx,-2,13,v.secondary,4);
      break;
    case 'riot':
      rect(ctx,-13,-27,26,5,'#29343d');rect(ctx,-9,-24,18,4,'#11191e');
      for(const x of [-14,11])rect(ctx,x,10,4,11,'#596873');
      if(tier>=1){rect(ctx,14,-6,5,25,'#75848c');rect(ctx,15,-3,3,18,v.accent);}
      break;
    case 'war':
      ctx.fillStyle='#3a4539';ctx.beginPath();ctx.arc(0,-23,11,Math.PI,Math.PI*2);ctx.fill();
      rect(ctx,-11,-23,22,4,'#303a31');rect(ctx,-4,-29,8,7,'#202821');
      for(let x=-9;x<=5;x+=7)rect(ctx,x,10,5,7,x%14?v.secondary:'#765c38');
      if(band>=3){rect(ctx,-18,0,4,15,'#2e3830');rect(ctx,14,0,4,15,'#2e3830');}
      break;
    case 'finance':
      rect(ctx,-3,-5,6,24,v.secondary);
      ctx.strokeStyle='#2a3438';ctx.lineWidth=2;ctx.strokeRect(-8,-22,6,5);ctx.strokeRect(2,-22,6,5);rect(ctx,-2,-20,4,1,'#2a3438');
      rect(ctx,-23,4,10,12,'#49382d');rect(ctx,-21,2,6,3,'#7a5c39');
      if(tier===2){ctx.globalAlpha=.45+.25*pulse;ctx.strokeStyle=v.accent;ctx.beginPath();ctx.arc(20,-2,7,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;}
      break;
    case 'wealth':
      metalEdge(ctx,-23,-2,6,19,'#735f2c',v.accent,'#302817');
      metalEdge(ctx,17,-2,6,19,'#735f2c',v.accent,'#302817');
      rect(ctx,-11,-27,22,4,'#2a2924');rect(ctx,-6,-31,12,5,'#444038');
      if(tier>=1){ctx.globalAlpha=.4+.3*pulse;ctx.strokeStyle=v.accent;ctx.beginPath();ctx.arc(22,2,7+tier,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;}
      break;
    case 'bakery':
      rect(ctx,-13,-28,26,6,'#f0eee7');rect(ctx,-9,-34,18,8,'#faf7ef');rect(ctx,-4,-37,8,4,'#fffdf8');
      rect(ctx,-10,10,20,7,'#d6c09e');rect(ctx,-8,12,16,3,'#7a5037');
      for(const x of [-15,15]){ctx.globalAlpha=.3+.25*pulse;px(ctx,x,15,phase?'#ff7040':'#bd8050',3);}ctx.globalAlpha=1;
      break;
    case 'tech':
      rect(ctx,-5,-29,10,7,'#20292e');px(ctx,-2,-32,phase>=2?'#ff5654':v.secondary,4);
      for(const side of [-1,1]){const x=side*(22+tier*3);rect(ctx,x-(side<0?5:0),-6,5,15,'#35454c');px(ctx,x-(side<0?4:-1),-10,v.accent,3);}
      if(band>=3){rect(ctx,-10,15,20,4,'#202a2f');px(ctx,-7,16,v.secondary,3);px(ctx,4,16,v.accent,3);}
      break;
    case 'vault':
      ctx.globalAlpha=.58;ctx.strokeStyle='#4e496f';ctx.lineWidth=2;
      ctx.beginPath();ctx.ellipse(0,0,24+tier*3,15+tier*2,frame*.012,0,Math.PI*2);ctx.stroke();
      ctx.globalAlpha=1;px(ctx,-25-tier*2,-1,v.accent,3);px(ctx,23+tier*2,-1,v.secondary,3);
      if(band>=3){rect(ctx,-7,-30,14,5,'#302d4b');px(ctx,-2,-33,v.secondary,4);}
      break;
  }
  ctx.restore();
}


function drawBossTierPresenceV3(ctx:Ctx,tier:number,frame:number,phase:number,v:BossVisual,key:number){
  if(tier<=0)return;
  const pulse=.5+.5*Math.sin(frame*.09+key);
  ctx.save();
  if(tier===1){
    for(const side of [-1,1]){const x=side*27;rect(ctx,x-(side<0?3:0),12,3,9,'#4d5c63');px(ctx,x-(side<0?2:-1),10,v.accent,2);}
  }else{
    metalEdge(ctx,-29,17,58,6,'#242d32','#68777d','#141a1e');
    for(const side of [-1,1]){
      const x=side*29;rect(ctx,x-(side<0?4:0),-13,4,31,'#37444a');
      ctx.globalAlpha=.4+.3*pulse;px(ctx,x-(side<0?3:-1),-17,phase>=2?'#ff5551':v.secondary,3);ctx.globalAlpha=1;
    }
  }
  ctx.restore();
}

function drawBossFamilyPhaseV3(ctx:Ctx,def:BossDef,frame:number,phase:number,v:BossVisual,tier:number){
  if(phase<=0)return;
  const pulse=.5+.5*Math.sin(frame*.15+(def.visualIndex??0));
  ctx.save();
  switch(def.family){
    case 'command':
      rect(ctx,-14,-31,28,3,phase>=2?'#5f2528':'#263c4d');
      if(phase>=2){px(ctx,-10,-34,'#5da8ff',3);px(ctx,8,-34,'#ff5d58',3);}
      break;
    case 'riot':
      if(phase>=1){for(const y of [-5,4,13]){rect(ctx,18,y,7,3,'#94a1a7');}}
      if(phase>=2){rect(ctx,-18,15,36,5,'#2c3439');rect(ctx,-12,16,24,2,'#ff6658');}
      break;
    case 'war':
      if(phase>=1){rect(ctx,-18,-4,5,20,'#2d3730');rect(ctx,13,-4,5,20,'#2d3730');}
      if(phase>=2){for(let x=-10;x<=6;x+=4)px(ctx,x,17,x%8?v.secondary:'#d85f50',2);}
      break;
    case 'finance':
      for(let i=0;i<phase+1;i++){
        const side=i%2?-1:1,x=side*(20+i*4),y=-8+i*9;
        ctx.globalAlpha=.35+.25*pulse;rect(ctx,x-5,y-3,10,6,'#183029');px(ctx,x-2,y-1,v.accent,4);
      }
      ctx.globalAlpha=1;break;
    case 'wealth':
      ctx.strokeStyle=v.accent;ctx.lineWidth=2;ctx.globalAlpha=.4+.25*pulse;
      ctx.beginPath();ctx.arc(0,1,25+phase*5,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;
      if(phase>=2){for(const x of [-26,23]){rect(ctx,x,-12,3,29,'#80692f');px(ctx,x,-15,v.secondary,3);}}
      break;
    case 'bakery':
      for(const x of [-18,14]){rect(ctx,x,14,6,6,'#6d4732');ctx.globalAlpha=.35+.3*pulse;px(ctx,x+1,10,phase>=2?'#ff5d3f':'#e08b4b',4);}
      ctx.globalAlpha=1;
      if(phase>=2){rect(ctx,-11,17,22,4,'#3b2d26');rect(ctx,-7,18,14,2,'#ff7040');}
      break;
    case 'tech':
      for(const side of [-1,1]){const x=side*(29+phase*3);rect(ctx,x-(side<0?8:0),-3,8,3,'#596a72');px(ctx,x-(side<0?6:-2),-5,phase>=2?'#ff5654':v.accent,3);}
      if(phase>=2){rect(ctx,-8,17,16,4,'#1b252a');px(ctx,-3,18,'#ff5654',6);}
      break;
    case 'vault':
      ctx.strokeStyle=phase>=2?'#ff5654':v.secondary;ctx.lineWidth=2;ctx.globalAlpha=.5+.2*pulse;
      for(let i=0;i<2+phase;i++){const a=frame*.025+i*Math.PI/(1+phase);ctx.beginPath();ctx.arc(0,1,27+i*4,a,a+1.05);ctx.stroke();}
      ctx.globalAlpha=1;
      if(phase>=2){for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5])px(ctx,Math.cos(a)*33-2,1+Math.sin(a)*24-2,'#ff5654',4);}
      break;
  }
  ctx.restore();
}


function drawGeneratedBossAttackPoseV4(
  ctx:Ctx,def:BossDef,phase:number,preparedAttack:number|undefined,telegraph:number,recovery:number,recoveryMax:number
){
  const seq=def.pattern?.sequence??[];
  const step=preparedAttack??0;
  const attack=seq.length?seq[(step+phase*(def.pattern?.phaseShift??0))%seq.length]:'fan';
  const t=Math.max(0,Math.min(1,telegraph));
  const r=recoveryMax>0?Math.max(0,Math.min(1,recovery/recoveryMax)):0;
  if(t<=0&&r<=0)return;

  const prep=t*t;
  const recoil=r*r;
  if(attack==='rush'){
    ctx.translate(prep*4-recoil*2,prep*1.5);
    ctx.rotate((prep*.09-recoil*.05)*(def.roleVariant%2?-1:1));
    ctx.scale(1+prep*.08,1-prep*.05);
  }else if(attack==='sniper'){
    ctx.translate(-prep*2,0);
    ctx.rotate((def.roleVariant%2?-1:1)*(-prep*.04+recoil*.025));
    ctx.scale(1-prep*.025,1+prep*.05);
  }else if(attack==='nova'||attack==='ring'||attack==='spiral'){
    const s=1+prep*.07-recoil*.04;
    ctx.scale(s,s);
  }else if(attack==='summon'){
    ctx.translate(0,-prep*3+recoil*1.5);
    ctx.rotate(Math.sin((preparedAttack??0)+phase)*prep*.035);
  }else if(attack==='crossfire'||attack==='fan'){
    ctx.translate(-recoil*2,0);
    ctx.rotate((def.roleVariant%2?-1:1)*(prep*.025-recoil*.045));
  }else if(attack==='warp'){
    ctx.scale(1-prep*.08,1+prep*.1);
    ctx.translate(0,-prep*2);
  }else if(attack==='cage'||attack==='mines'||attack==='lanes'){
    ctx.translate(0,-prep*1.5);
    ctx.scale(1+prep*.025,1+prep*.025);
  }
}

function drawGeneratedBossAttackCueV4(
  ctx:Ctx,def:BossDef,frame:number,phase:number,preparedAttack:number|undefined,telegraph:number
){
  if(telegraph<=.02||def.legacy)return;
  const seq=def.pattern?.sequence??[];
  if(!seq.length)return;
  const step=preparedAttack??0;
  const attack=seq[(step+phase*(def.pattern?.phaseShift??0))%seq.length];
  const t=Math.max(0,Math.min(1,telegraph));
  const pulse=.55+.45*Math.sin(frame*.25);
  ctx.save();ctx.globalAlpha=.28+t*.45;
  ctx.strokeStyle=phase>=2?'#ff5a55':def.secondary;ctx.lineWidth=1+t*1.5;
  if(attack==='sniper'){
    ctx.setLineDash([4,3]);ctx.beginPath();ctx.moveTo(10,-3);ctx.lineTo(52,-18);ctx.stroke();ctx.setLineDash([]);
  }else if(attack==='rush'){
    ctx.beginPath();ctx.moveTo(-18,20);ctx.lineTo(0,27+t*8);ctx.lineTo(18,20);ctx.stroke();
  }else if(attack==='nova'||attack==='ring'||attack==='spiral'){
    ctx.beginPath();ctx.arc(0,3,22+t*10,0,Math.PI*2);ctx.stroke();
  }else if(attack==='summon'){
    for(const x of [-24,24]){ctx.beginPath();ctx.arc(x,-5,5+t*4,0,Math.PI*2);ctx.stroke();}
  }else if(attack==='warp'){
    ctx.beginPath();ctx.ellipse(0,2,25+t*8,13+t*5,frame*.02,0,Math.PI*2);ctx.stroke();
  }else if(attack==='crossfire'||attack==='fan'){
    for(const a of [-.35,0,.35]){ctx.beginPath();ctx.moveTo(12,0);ctx.lineTo(31+Math.cos(a)*10,Math.sin(a)*16);ctx.stroke();}
  }else{
    ctx.beginPath();ctx.arc(0,4,20+t*7,0,Math.PI*2);ctx.stroke();
  }
  ctx.globalAlpha=.18+.18*pulse*t;ctx.fillStyle=def.accent;ctx.beginPath();ctx.arc(0,2,8+t*4,0,Math.PI*2);ctx.fill();
  ctx.restore();
}

function drawBossHealthWearV4(ctx:Ctx,hpRatio:number,def:BossDef,frame:number,tier:number){
  const d=1-Math.max(0,Math.min(1,hpRatio));
  if(d<.22)return;
  const severe=d>.66,critical=d>.82;
  ctx.save();
  ctx.strokeStyle=severe?'#171a1c':'#32393c';ctx.lineWidth=severe?1.5:1;ctx.globalAlpha=.45+d*.45;
  const cracks=critical?5:severe?4:2;
  for(let i=0;i<cracks;i++){
    const sx=-11+((i*9+(def.visualIndex??0)*3)%23),sy=-6+((i*7+(def.roleVariant??0)*5)%22);
    ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(sx+(i%2?4:-4),sy+4);ctx.lineTo(sx+(i%2?1:-1),sy+8);ctx.stroke();
  }
  if(severe){
    ctx.globalAlpha=.22+d*.28;ctx.fillStyle=def.family==='bakery'?'#694b3b':'#151b1e';
    ctx.beginPath();ctx.ellipse(-10,7,4+tier,3+tier*.5,0,0,Math.PI*2);ctx.fill();
  }
  if(critical){
    const pulse=.45+.35*Math.sin(frame*.18);
    ctx.globalAlpha=.45+.3*pulse;
    px(ctx,11,-3,def.family==='tech'||def.family==='vault'?'#ff644f':'#d8e0df',2);
    if(def.family==='tech'||def.family==='vault')px(ctx,-13,10,'#ff6a46',2);
  }
  ctx.restore();
}

function drawPremiumBossBody(ctx:Ctx,bx:number,by:number,bossType:string,frame:number,phase:number,v:BossVisual,floorBoss:boolean,subBoss:boolean,hpRatio=1,parts?:BossPartState[],preparedAttack?:number,telegraph=0,recovery=0,recoveryMax=0){
  const def=BOSSES[bossType]??SUBBOSSES[bossType]??MINIBOSSES[bossType];
  if(!def){drawGeneratedBossBody(ctx,bx,by,bossType,frame,phase,v,floorBoss,subBoss);return;}
  const h=bossVisualHash(bossType),tier=floorBoss?2:subBoss?1:0,key=def.visualIndex??(h%48);
  const scale=(tier===2?1.08:tier===1?1:.92)*(def.size>=40?1.04:def.size<=27?.96:1);
  const sx=scale*(def.scaleX??1),sy=scale*(def.scaleY??1);
  const pulse=.55+.45*Math.sin(frame*.13+h%11);

  ctx.save();
  ctx.translate(bx+18,by+21);
  ctx.scale(sx,sy);

  ctx.fillStyle='rgba(0,0,0,.44)';
  ctx.beginPath();ctx.ellipse(0,18,16+tier*4,4+tier,0,0,Math.PI*2);ctx.fill();

  if(def.finalBoss){
    drawFinalBankBossV2(ctx,frame,phase,v,parts);
  }else{
    // Para tech/vault el rig estructural forma parte del propio chasis.
    // En aves/personajes sólo aparece en subjefes/jefes y funciona como mochila,
    // plataforma o armamento secundario sin tapar la identidad de facción.
    if(def.family==='tech'||def.family==='vault'||tier>0){
      ctx.save();
      ctx.globalAlpha=(def.family==='tech'||def.family==='vault')?.72:.36;
      drawBossStructuralRig(ctx,key,tier,phase,frame,v,!!def.stationary);
      ctx.restore();
    }

    ctx.save();
    if(def.legacy)applyIconicAttackPose(ctx,bossType,preparedAttack,telegraph,recovery,recoveryMax);
    else drawGeneratedBossAttackPoseV4(ctx,def,phase,preparedAttack,telegraph,recovery,recoveryMax);
    const handcrafted=def.legacy&&drawIconicBossBodyV3(ctx,bossType,frame,phase,v,tier,parts);
    if(!handcrafted){
      // v0.9: el rol define la silueta principal y la facción aporta identidad.
      // v0.9.2: además la pose responde al ataque preparado y su recuperación.
      drawRoleBossCore(ctx,def,frame,phase,v);
      drawBossFamilySignatureV3(ctx,def,frame,phase,v,tier,key);
      drawBossTierPresenceV3(ctx,tier,frame,phase,v,key);
      drawBossHealthWearV4(ctx,hpRatio,def,frame,tier);
      drawGeneratedBossAttackCueV4(ctx,def,frame,phase,preparedAttack,telegraph);
    }
    if(def.legacy)drawIconicAttackHardware(ctx,bossType,frame,phase,v,preparedAttack,telegraph,recovery,recoveryMax,parts);
    ctx.restore();

    // Identidad frontal más contenida: insignias y crest sólo en diseños donde
    // no compiten con el casco, gorro, escudo o núcleo de IA.
    if(!def.legacy&&(def.family==='command'||def.family==='finance'||def.family==='wealth')){
      ctx.globalAlpha=.7;drawBossFrontIdentity(ctx,key,tier,v);ctx.globalAlpha=1;
    }
    if(!def.legacy&&(def.family==='tech'||def.family==='vault')){
      ctx.globalAlpha=.65;drawBossCrest(ctx,key,v);ctx.globalAlpha=1;
    }
    if(!def.legacy)drawBossFamilyPhaseV3(ctx,def,frame,phase,v,tier);
    drawBossPhaseTransformation(ctx,def,frame,phase,v);
  }

  // Hardware asociado al patrón actual: telegraph visual antes de cada ataque.
  drawBossAttackHardware(ctx,{accent:v.accent,secondary:v.secondary,family:v.family,bob:v.bob},def.pattern.sequence,frame,phase);

  // Serial visual individual. Los 145 encuentros mantienen firma distinta sin
  // recurrir a cuerpos aleatorios que rompan la lectura de facción.
  if(!def.finalBoss){
    if(key%2){rect(ctx,-3,17,6,2,v.secondary);}else{px(ctx,-3,16,v.accent,2);px(ctx,2,16,v.secondary,2);}
    if(Math.floor(key/3)%2)rect(ctx,-24,-7,3,8,'#47545c');
    if(Math.floor(key/5)%2)rect(ctx,21,-7,3,8,'#47545c');
    if(tier>=1){ctx.strokeStyle=v.accent;ctx.globalAlpha=.26+.16*pulse;ctx.beginPath();ctx.arc(0,1,25+tier*4+phase*3,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;}
    if(tier===2){rect(ctx,-23,18,46,2,v.secondary);px(ctx,-19,16,v.accent,2);px(ctx,17,16,v.accent,2);}
  }

  ctx.restore();
}

function drawBossIdentity(ctx:Ctx,bx:number,by:number,bossType:string,frame:number,phase:number,parts?:BossPartState[]) {
  const v=bossVisual(bossType);
  if(!v)return;
  const def=BOSSES[bossType]??SUBBOSSES[bossType]??MINIBOSSES[bossType];
  const iconic=!!def?.legacy;
  const pulse=.55+.45*Math.sin(frame*.12);
  const phaseGlow=phase>0?1:0;
  ctx.save();

  if(bossType==='bread_banker'){
    // El jefe final ya tiene una silueta regia propia; aquí sólo añadimos vida visual.
    if(frame%16<3){px(ctx,bx-4,by+4,v.secondary,2);px(ctx,bx+39,by+10,v.accent,2);}
    if(phase>0){ctx.globalAlpha=.28+.18*pulse;ctx.strokeStyle=phase>=2?'#ff4d54':v.accent;ctx.lineWidth=2;ctx.beginPath();ctx.arc(bx+18,by+17,31+phase*5,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;}
    ctx.restore();return;
  }

  // Insignia de facción contenida. La silueta principal ya comunica el rol;
  // aquí sólo reforzamos identidad sin apilar otra capa de geometría.
  if(v.family==='command'){
    rect(ctx,bx+14,by+18,8,5,'#1a2731');px(ctx,bx+17,by+19,v.secondary,3);
    if(frame%28<8){px(ctx,bx+4,by+4,'#5ca7ff',2);px(ctx,bx+30,by+4,'#ff5b58',2);}
  }else if(v.family==='finance'){
    rect(ctx,bx+14,by+19,8,4,'#20312e');px(ctx,bx+16,by+20,v.accent,2);px(ctx,bx+20,by+20,v.secondary,2);
  }else if(v.family==='bakery'){
    ctx.globalAlpha=.35+.25*pulse;rect(ctx,bx+13,by+24,10,3,phase>=1?'#e85f37':v.secondary);ctx.globalAlpha=1;
  }else if(v.family==='tech'){
    ctx.globalAlpha=.45+.35*pulse;px(ctx,bx+8,by+8,v.accent,2);px(ctx,bx+27,by+8,v.secondary,2);ctx.globalAlpha=1;
  }else if(v.family==='riot'){
    rect(ctx,bx+29,by+17,5,9,v.accent);rect(ctx,bx+30,by+19,3,5,'#24313a');
  }else if(v.family==='war'){
    px(ctx,bx+13,by+22,'#d8b24a',2);px(ctx,bx+17,by+22,'#c65a4b',2);px(ctx,bx+21,by+22,'#8299b0',2);
  }else if(v.family==='wealth'){
    rect(ctx,bx+13,by+20,10,3,'#2c2a24');rect(ctx,bx+15,by+20,6,2,v.accent);
    if(frame%20<3)px(ctx,bx+31,by+5,v.secondary,2);
  }else if(v.family==='vault'){
    ctx.globalAlpha=.45+.3*pulse;ctx.strokeStyle=v.secondary;ctx.beginPath();ctx.arc(bx+18,by+18,7+phase*2,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;
  }

  // Accesorio único por individuo.
  switch(bossType){
    case 'comisario_pico_duro':
      if(bossPartIsAlive(parts,'execution_rifle')){ctx.fillStyle=v.secondary;ctx.translate(bx+31,by+15);ctx.rotate(-.55);ctx.fillRect(-1,-18,3,36);ctx.fillRect(-4,-18,9,3);}break;
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
      if(bossPartIsAlive(parts,'riot_shield')){ctx.strokeStyle=v.accent;ctx.globalAlpha=.75;ctx.strokeRect(bx+27,by+8,12,25);}break;
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

function drawBossPartStatus(ctx:Ctx,x:number,y:number,bossType:string,phase:number,telegraph:number,parts?:BossPartState[]){
  if(!parts?.length)return;
  const def=BOSSES[bossType]??SUBBOSSES[bossType]??MINIBOSSES[bossType];
  if(!def)return;
  const cx=x+def.size/2,cy=y+def.size/2;
  ctx.save();
  for(const part of parts){
    const px0=cx+part.offsetX,py0=cy+part.offsetY;
    if(part.destroyed){
      ctx.globalAlpha=.72;ctx.strokeStyle='#d76454';ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(px0-5,py0-5);ctx.lineTo(px0+5,py0+5);ctx.moveTo(px0+5,py0-5);ctx.lineTo(px0-5,py0+5);ctx.stroke();
      continue;
    }
    if(phase<(part.exposedPhase??0))continue;
    if(part.hp<part.maxHp){
      const ratio=Math.max(0,part.hp/part.maxHp),w=Math.max(8,Math.min(24,part.w));
      ctx.globalAlpha=.8;ctx.fillStyle='#171d20';ctx.fillRect(px0-w/2,py0-part.h/2-5,w,2);
      ctx.fillStyle=ratio>.5?'#e7c55b':'#df6a54';ctx.fillRect(px0-w/2,py0-part.h/2-5,w*ratio,2);
    }
    if(telegraph>.05){
      const pulse=.35+telegraph*.45;
      ctx.globalAlpha=pulse;ctx.strokeStyle=(part.kind==='core'||part.kind==='reactor'||part.kind==='oven')?'#ff9a54':'#f5d26b';ctx.lineWidth=1+telegraph;
      if(part.kind==='radio'||part.kind==='camera'){
        ctx.beginPath();ctx.arc(px0,py0,5+telegraph*7,0,Math.PI*2);ctx.stroke();px(ctx,px0-1,py0-1,'#ff6257',2);
      }else{
        ctx.strokeRect(px0-part.w*.35,py0-part.h*.35,part.w*.7,part.h*.7);
      }
    }
  }
  ctx.restore();
}

function drawBossMaterialPassV5(
  ctx:Ctx,bx:number,by:number,frame:number,phase:number,
  visual:{accent:string;secondary:string;family:string;bob:number}|undefined,
  floorBoss:boolean,subBoss:boolean,
){
  const accent=visual?.accent??'#e6c56f',secondary=visual?.secondary??'#8faeb7';
  const family=visual?.family??'command';
  ctx.save();
  // Materiales por facción: pequeños acentos que se leen con el renderer 4x
  // sin convertir jefes diferentes en recolores del mismo cuerpo.
  const hi=family==='tech'||family==='vault'?'#c8f1f4':
    family==='bakery'?'#ffe0ad':
    family==='finance'||family==='wealth'?'#fff0a8':
    family==='riot'||family==='war'?'#d5dde2':'#f2e5bd';
  ctx.globalAlpha=.38;
  microRect(ctx,bx+6.25,by+7.25,8.5,.25,hi);
  microRect(ctx,bx+21.25,by+8.25,7.5,.25,'rgba(255,255,255,.25)');
  microRect(ctx,bx+5.25,by+28.5,10,.25,'rgba(0,0,0,.36)');
  microRect(ctx,bx+21,by+29.25,9,.25,'rgba(0,0,0,.30)');

  if(family==='tech'||family==='vault'){
    ctx.globalAlpha=.62;microRect(ctx,bx+8.25,by+13.25,3.5,.5,accent);microRect(ctx,bx+24.25,by+13.25,3.5,.5,secondary);
    if(frame%72<10){microRect(ctx,bx+10.25,by+13.25,.5,.5,'#f2ffff');microRect(ctx,bx+26.25,by+13.25,.5,.5,'#f2ffff');}
  }else if(family==='bakery'){
    ctx.globalAlpha=.48;microRect(ctx,bx+8.25,by+18.25,4.5,.25,'#d98d54');microRect(ctx,bx+22.25,by+18.25,4.5,.25,'#d98d54');
  }else if(family==='finance'||family==='wealth'){
    ctx.globalAlpha=.56;microRect(ctx,bx+15.25,by+10.25,4.5,.25,accent);microRect(ctx,bx+17.25,by+10.5,.5,6,secondary);
  }else if(family==='riot'||family==='war'){
    ctx.globalAlpha=.46;microRect(ctx,bx+4.25,by+15.25,5.5,.25,hi);microRect(ctx,bx+26.25,by+15.25,5.5,.25,hi);
  }else{
    ctx.globalAlpha=.45;microRect(ctx,bx+8.25,by+12.25,5.5,.25,accent);microRect(ctx,bx+22.25,by+12.25,5.5,.25,secondary);
  }

  // Jefes de piso y subjefes ganan herrajes propios; las fases los activan.
  if(floorBoss||subBoss){
    ctx.globalAlpha=.55;
    const bolts=[[5.5,5.5],[29.5,5.5],[5.5,29.5],[29.5,29.5]] as const;
    for(let i=0;i<bolts.length;i++){
      const [ox,oy]=bolts[i],col=i<=phase+1?accent:secondary;
      microRect(ctx,bx+ox,by+oy,.5,.5,col);
    }
  }
  if(phase>=1){
    ctx.globalAlpha=.28+.12*Math.sin(frame*.12);
    microRect(ctx,bx+3.25,by+4.25,.25,25,accent);
    microRect(ctx,bx+32.5,by+4.25,.25,25,secondary);
  }
  ctx.restore();
}

export function drawBoss(ctx: Ctx, x: number, y: number, bossType: string, frame: number, hp: number, maxHp: number, hurt: boolean, phase = 0, telegraph = 0, parts?:BossPartState[], preparedAttack?:number, recovery=0, recoveryMax=0) {
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
    drawPremiumBossBody(ctx,bx,by,bossType,frame,phase,visual,floorBoss,subBoss,maxHp>0?hp/maxHp:1,parts,preparedAttack,telegraph,recovery,recoveryMax);
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
  
  drawBossIdentity(ctx,bx,by,bossType,frame,phase,parts);
  drawBossPartStatus(ctx,bx,by,bossType,phase,telegraph,parts);
  drawBossMaterialPassV5(ctx,bx,by,frame,phase,visual,floorBoss,subBoss);

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

  // Umbral y mecanismo: cada puerta se siente como parte de la bóveda, no como un tile decorativo.
  ctx.globalAlpha=.55;
  if(horizontal){
    rect(ctx,bx+5,by+(dir==='N'?T-6:4),T-10,2,pal.dark);
    for(const ox of [7,T-9])px(ctx,bx+ox,by+(dir==='N'?T-5:5),pal.bolt,1);
  }else{
    rect(ctx,bx+(dir==='W'?T-6:4),by+5,2,T-10,pal.dark);
    for(const oy of [7,T-9])px(ctx,bx+(dir==='W'?T-5:5),by+oy,pal.bolt,1);
  }
  ctx.globalAlpha=1;
  if(locked&&openAmount<.2){
    const cxp=bx+T/2,cyp=by+T/2;
    ctx.fillStyle='#1a1112';ctx.fillRect(cxp-5,cyp-5,10,10);
    ctx.strokeStyle=pal.light;ctx.lineWidth=1;ctx.strokeRect(cxp-4.5,cyp-4.5,9,9);
    ctx.fillStyle=lightCol;ctx.globalAlpha=.75+.2*Math.sin(frame*.18);ctx.fillRect(cxp-1,cyp-2,3,4);ctx.globalAlpha=1;
  }

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

function drawPropDock(
  ctx:Ctx,bx:number,by:number,family:number,tier:number,accent:string,frame:number,
){
  const pulse=.5+.5*Math.sin(frame*.06+family*.7+tier);
  const round=[1,3,16,17].includes(family);
  const mobile=[11,15].includes(family);
  const tall=[5,8,12,19].includes(family);
  const consoleLike=[0,6,10,14,18].includes(family);

  ctx.save();
  ctx.globalAlpha=.34;ctx.fillStyle='#020609';
  ctx.beginPath();
  ctx.ellipse(bx+16,by+29,round?15:mobile?14:tall?13:16,round?4.4:3.8,0,0,Math.PI*2);
  ctx.fill();

  // Base específica por familia. El prop ya no comparte el mismo pedestal.
  if(round){
    ctx.fillStyle='#10171a';ctx.beginPath();ctx.ellipse(bx+16,by+27,14,4.8,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle=accent;ctx.globalAlpha=.30+.12*pulse;ctx.lineWidth=1;
    ctx.beginPath();ctx.ellipse(bx+16,by+27,11.5,2.8,0,0,Math.PI*2);ctx.stroke();
  }else if(mobile){
    rect(ctx,bx+5,by+25,22,3,'#141b1e');
    ctx.fillStyle='#080d10';ctx.beginPath();ctx.arc(bx+9,by+29,2.5,0,Math.PI*2);ctx.arc(bx+23,by+29,2.5,0,Math.PI*2);ctx.fill();
  }else if(tall){
    rect(ctx,bx+6,by+26,20,4,'#10171a');rect(ctx,bx+8,by+26,16,1,'#3c4c52');
    ctx.globalAlpha=.38;rect(ctx,bx+13,by+28,6,1,accent);
  }else if(consoleLike){
    rect(ctx,bx+2,by+25,28,5,'#0e1518');rect(ctx,bx+5,by+25,22,2,'#3b4b51');
    ctx.globalAlpha=.44;rect(ctx,bx+7,by+27,18,1,accent);
  }else{
    rect(ctx,bx+4,by+25,24,5,'#10171a');rect(ctx,bx+6,by+25,20,2,'#35444a');
    ctx.globalAlpha=.36;rect(ctx,bx+10,by+27,12,1,accent);
  }

  // Cableado sólo en maquinaria; cambia lado por familia para romper repetición.
  if([0,6,7,10,14,18,19].includes(family)){
    ctx.globalAlpha=.30;ctx.strokeStyle=tier===1?'#50c4e2':accent;ctx.lineWidth=1;
    const dir=family%2?1:-1;
    ctx.beginPath();ctx.moveTo(bx+16,by+29);ctx.lineTo(bx+16+dir*8,by+31);ctx.lineTo(bx+16+dir*12,by+31);ctx.stroke();
    ctx.globalAlpha=.62+.25*pulse;ctx.fillStyle=tier===1?'#60daf3':accent;ctx.fillRect(bx+(dir>0?27:3),by+27,2,1);
  }
  ctx.restore();
}

function drawTierPropAttachment(
  ctx:Ctx,bx:number,by:number,family:number,tier:number,accent:string,light:string,detail:string,frame:number,
){
  const pulse=.5+.5*Math.sin(frame*.07+tier*1.7+family*.3);
  ctx.save();
  if(tier===0){
    // Piso 1: utilitario, números/etiquetas y piezas expuestas.
    ctx.globalAlpha=.44;rect(ctx,bx+4,by+7,7,2,'#6d7777');rect(ctx,bx+5,by+8,3,1,'#b29a58');
  }else if(tier===1){
    // Seguridad: cian, sensores y balizas.
    ctx.globalAlpha=.38;rect(ctx,bx+2,by+11,2,11,'#2b6475');rect(ctx,bx+28,by+11,2,11,'#2b6475');
    ctx.globalAlpha=.62+.25*pulse;px(ctx,bx+3,by+9,'#5ad6f2',2);px(ctx,bx+27,by+9,'#5ad6f2',2);
  }else if(tier===2){
    // Archivo/custodia: bronce y abrazaderas robustas.
    ctx.globalAlpha=.50;rect(ctx,bx+3,by+6,8,2,accent);rect(ctx,bx+21,by+6,8,2,accent);
    rect(ctx,bx+5,by+24,4,2,detail);rect(ctx,bx+23,by+24,4,2,detail);
  }else if(tier===3){
    // Ejecutivo: remates más amplios y acabado de lujo.
    ctx.globalAlpha=.42;rect(ctx,bx+2,by+8,3,16,accent);rect(ctx,bx+27,by+8,3,16,accent);
    ctx.globalAlpha=.38;rect(ctx,bx+8,by+5,16,1,light);
  }else if(tier===4){
    // Alta seguridad: blindaje lateral y warning lights.
    ctx.globalAlpha=.72;rect(ctx,bx+1,by+10,4,15,'#1b252a');rect(ctx,bx+27,by+10,4,15,'#1b252a');
    rect(ctx,bx+2,by+12,2,9,accent);rect(ctx,bx+28,by+12,2,9,accent);
    ctx.globalAlpha=.55+.30*pulse;px(ctx,bx+2,by+8,'#ef655b',2);px(ctx,bx+28,by+8,'#ef655b',2);
  }else{
    // Cámara principal: marco dorado parcial y custodia soberana.
    ctx.globalAlpha=.72;ctx.strokeStyle='#d6b04a';ctx.lineWidth=1;
    ctx.beginPath();
    ctx.moveTo(bx+2,by+13);ctx.lineTo(bx+2,by+6);ctx.lineTo(bx+10,by+6);
    ctx.moveTo(bx+22,by+6);ctx.lineTo(bx+30,by+6);ctx.lineTo(bx+30,by+13);
    ctx.moveTo(bx+2,by+22);ctx.lineTo(bx+2,by+28);ctx.lineTo(bx+10,by+28);
    ctx.moveTo(bx+22,by+28);ctx.lineTo(bx+30,by+28);ctx.lineTo(bx+30,by+22);
    ctx.stroke();
    ctx.globalAlpha=.55+.25*pulse;px(ctx,bx+16,by+5,'#f3d36d',2);
  }
  ctx.restore();
}

function drawLuxuryPropOverride(
  ctx:Ctx,bx:number,by:number,tier:number,family:number,frame:number,accent:string,dark:string,mid:string,light:string,
){
  const pulse=.5+.5*Math.sin(frame*.06+tier*1.9+family);
  const gold=tier>=5?'#f4cf55':'#dfb741';
  const diamond='#aeeeff';
  const money='#6d9b63';

  // Piso 1: una fuente baja en el lobby para que la entrada se sienta institucional.
  if(tier===0&&family===17){
    ctx.fillStyle='rgba(0,0,0,.20)';ctx.beginPath();ctx.ellipse(bx+16,by+27,14,4,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#89847b';ctx.beginPath();ctx.ellipse(bx+16,by+23,13,5,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#b9b4aa';ctx.beginPath();ctx.ellipse(bx+16,by+21,10,3,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#7cc9d8';ctx.globalAlpha=.55+.12*pulse;ctx.beginPath();ctx.ellipse(bx+16,by+21,8,2,0,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=.62;rect(ctx,bx+15,by+9,2,11,'#9adce6');ctx.fillStyle='#9adce6';ctx.beginPath();ctx.arc(bx+16,by+9,2.5,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=1;return true;
  }

  // Piso 4: arte y hospitality comienzan a dominar sobre lo puramente técnico.
  if(tier===3&&family===2){ // pedestal de arte / escultura pequeña
    rect(ctx,bx+8,by+20,16,9,'#463a31');rect(ctx,bx+10,by+18,12,3,'#c59b58');
    ctx.fillStyle='#d8d0c2';ctx.beginPath();ctx.ellipse(bx+16,by+12,6,8,-.15,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#6b5a4d';ctx.beginPath();ctx.ellipse(bx+15,by+10,2,4,.35,0,Math.PI*2);ctx.fill();
    rect(ctx,bx+14,by+17,4,3,'#a98b62');return true;
  }
  if(tier===3&&family===17){ // fuente interior de alta dirección
    ctx.fillStyle='rgba(0,0,0,.30)';ctx.beginPath();ctx.ellipse(bx+16,by+27,15,4,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#8f887f';ctx.beginPath();ctx.ellipse(bx+16,by+22,14,6,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#b5ada0';ctx.beginPath();ctx.ellipse(bx+16,by+20,11,4,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#78c7d7';ctx.globalAlpha=.55+.15*pulse;ctx.beginPath();ctx.ellipse(bx+16,by+20,9,2.5,0,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=.75;rect(ctx,bx+15,by+7,2,12,'#8ed9e7');
    ctx.fillStyle='#8ed9e7';ctx.beginPath();ctx.arc(bx+16,by+8,3,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;return true;
  }

  // Piso 5: dinero, oro y arte de colección.
  if(tier===4&&family===2){ // pintura con marco de oro sobre caballete
    rect(ctx,bx+5,by+3,22,18,'#6f531f');rect(ctx,bx+6,by+4,20,16,gold);rect(ctx,bx+8,by+6,16,12,'#263547');
    rect(ctx,bx+8,by+13,16,5,'#7c5532');ctx.globalAlpha=.75;rect(ctx,bx+11,by+8,8,1,'#e1c693');ctx.globalAlpha=1;
    rect(ctx,bx+14,by+21,4,7,'#6a5537');rect(ctx,bx+8,by+28,16,2,'#463a2b');return true;
  }
  if(tier===4&&family===3){ // fajos de dinero
    for(let i=0;i<4;i++){
      const ox=6+(i%2)*10,oy=18-Math.floor(i/2)*7;
      rect(ctx,bx+ox,by+oy,13,6,'#50734c');rect(ctx,bx+ox+1,by+oy+1,11,4,money);rect(ctx,bx+ox+5,by+oy,3,6,'#d2bd75');
    }
    return true;
  }
  if(tier===4&&family===8){ // pila grande de efectivo, asimétrica
    for(let row=0;row<3;row++)for(let col=0;col<3-row;col++){
      const ox=4+col*8+row*3,oy=24-row*6;
      rect(ctx,bx+ox,by+oy,12,5,'#496b47');rect(ctx,bx+ox+1,by+oy+1,10,3,'#79a06d');rect(ctx,bx+ox+5,by+oy,2,5,'#d6bf75');
    }
    return true;
  }
  if(tier===4&&family===9){ // lingotes de oro
    for(const [ox,oy,w] of [[4,22,13],[15,22,13],[9,16,14],[13,10,10]] as const){
      rect(ctx,bx+ox,by+oy,w,6,'#9a7319');rect(ctx,bx+ox+1,by+oy+1,w-2,4,gold);rect(ctx,bx+ox+3,by+oy+1,Math.max(2,w-7),1,'#ffe17a');
    }
    return true;
  }
  if(tier===4&&family===13){ // estatua de oro tamaño grande
    rect(ctx,bx+7,by+25,18,5,'#6c5423');rect(ctx,bx+9,by+23,14,3,gold);
    ctx.fillStyle='#c99f2f';ctx.beginPath();ctx.ellipse(bx+16,by+11,6,8,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=gold;ctx.beginPath();ctx.arc(bx+16,by+5,4,0,Math.PI*2);ctx.fill();
    rect(ctx,bx+12,by+15,3,9,gold);rect(ctx,bx+18,by+15,3,9,gold);
    ctx.globalAlpha=.65;rect(ctx,bx+13,by+7,2,8,'#ffe789');ctx.globalAlpha=1;return true;
  }
  if(tier===4&&family===16){ // escultura abstracta de oro
    rect(ctx,bx+8,by+25,16,5,'#39352d');
    ctx.strokeStyle=gold;ctx.lineWidth=4;ctx.beginPath();ctx.arc(bx+16,by+14,8,Math.PI*.15,Math.PI*1.65);ctx.stroke();
    ctx.lineWidth=2;ctx.strokeStyle='#ffe17a';ctx.beginPath();ctx.arc(bx+16,by+14,5,Math.PI*.7,Math.PI*2);ctx.stroke();return true;
  }
  if(tier===4&&family===17){ // fuente dorada
    ctx.fillStyle='#5f4b25';ctx.beginPath();ctx.ellipse(bx+16,by+27,15,4,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=gold;ctx.beginPath();ctx.ellipse(bx+16,by+22,14,6,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#82cfe2';ctx.globalAlpha=.70;ctx.beginPath();ctx.ellipse(bx+16,by+21,10,3,0,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=.65+.2*pulse;rect(ctx,bx+15,by+6,2,14,'#9de8f4');
    ctx.fillStyle='#a9eef8';ctx.beginPath();ctx.arc(bx+16,by+7,3,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;return true;
  }

  // Piso 6: diamante + oro, objetos de escala y brillo extremos.
  if(tier===5&&family===2){ // obra maestra con marco joya
    rect(ctx,bx+3,by+2,26,20,'#7a5c19');rect(ctx,bx+4,by+3,24,18,gold);rect(ctx,bx+7,by+6,18,12,'#252f43');
    rect(ctx,bx+7,by+13,18,5,'#67452d');ctx.fillStyle='#d8c6a3';ctx.beginPath();ctx.ellipse(bx+17,by+10,4,5,0,0,Math.PI*2);ctx.fill();
    for(const [ox,oy] of [[4,3],[26,3],[4,19],[26,19]] as const){ctx.globalAlpha=.75+.2*pulse;rect(ctx,bx+ox,by+oy,2,2,diamond);}ctx.globalAlpha=1;
    rect(ctx,bx+14,by+22,4,6,gold);return true;
  }
  if(tier===5&&(family===3||family===8)){ // pilas de diamantes, dos escalas
    const count=family===8?11:7;
    ctx.fillStyle='rgba(90,190,220,.16)';ctx.beginPath();ctx.ellipse(bx+16,by+26,family===8?14:11,4,0,0,Math.PI*2);ctx.fill();
    for(let i=0;i<count;i++){
      const ox=5+((i*7)%22),oy=23-((i*5)%13);
      ctx.fillStyle=i%3===0?'#e9fdff':diamond;ctx.globalAlpha=.72+.2*Math.sin(frame*.08+i);
      ctx.beginPath();ctx.moveTo(bx+ox,by+oy-4);ctx.lineTo(bx+ox+4,by+oy);ctx.lineTo(bx+ox,by+oy+4);ctx.lineTo(bx+ox-4,by+oy);ctx.closePath();ctx.fill();
      ctx.globalAlpha=.7;rect(ctx,bx+ox-1,by+oy-3,1,4,'#ffffff');
    }
    ctx.globalAlpha=1;return true;
  }
  if(tier===5&&family===9){ // estuches de diamante apilados
    for(const [ox,oy] of [[4,20],[15,20],[9,13]] as const){
      rect(ctx,bx+ox,by+oy,13,8,'#2e2528');rect(ctx,bx+ox+1,by+oy+1,11,6,'#5c3040');
      ctx.fillStyle=diamond;ctx.beginPath();ctx.moveTo(bx+ox+6,by+oy+1);ctx.lineTo(bx+ox+9,by+oy+4);ctx.lineTo(bx+ox+6,by+oy+7);ctx.lineTo(bx+ox+3,by+oy+4);ctx.closePath();ctx.fill();
    }
    return true;
  }
  if(tier===5&&family===13){ // estatua monumental de oro
    rect(ctx,bx+4,by+26,24,5,'#5e4719');rect(ctx,bx+7,by+23,18,4,gold);
    ctx.fillStyle='#d9ad31';ctx.beginPath();ctx.ellipse(bx+16,by+11,7,9,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=gold;ctx.beginPath();ctx.arc(bx+16,by+3,5,0,Math.PI*2);ctx.fill();
    rect(ctx,bx+10,by+13,4,11,gold);rect(ctx,bx+19,by+13,4,11,gold);
    ctx.globalAlpha=.76;rect(ctx,bx+12,by+5,2,10,'#ffe98a');rect(ctx,bx+19,by+8,2,7,'#ffe98a');ctx.globalAlpha=1;return true;
  }
  if(tier===5&&family===16){ // escultura de cristal/diamante
    rect(ctx,bx+7,by+25,18,5,'#564822');
    ctx.fillStyle=diamond;ctx.globalAlpha=.84+.12*pulse;ctx.beginPath();
    ctx.moveTo(bx+16,by+1);ctx.lineTo(bx+26,by+15);ctx.lineTo(bx+20,by+25);ctx.lineTo(bx+11,by+23);ctx.lineTo(bx+6,by+13);ctx.closePath();ctx.fill();
    ctx.globalAlpha=.66;ctx.strokeStyle='#ffffff';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(bx+16,by+2);ctx.lineTo(bx+15,by+23);ctx.moveTo(bx+7,by+13);ctx.lineTo(bx+25,by+15);ctx.stroke();ctx.globalAlpha=1;return true;
  }
  if(tier===5&&family===17){ // fuente de diamante
    ctx.fillStyle='#6c5520';ctx.beginPath();ctx.ellipse(bx+16,by+27,15,4,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=gold;ctx.beginPath();ctx.ellipse(bx+16,by+22,14,6,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#7ad9f2';ctx.globalAlpha=.78;ctx.beginPath();ctx.ellipse(bx+16,by+21,11,3,0,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=.70+.2*pulse;rect(ctx,bx+15,by+5,2,15,'#b8f5ff');
    ctx.fillStyle=diamond;ctx.beginPath();ctx.moveTo(bx+16,by+2);ctx.lineTo(bx+21,by+7);ctx.lineTo(bx+16,by+12);ctx.lineTo(bx+11,by+7);ctx.closePath();ctx.fill();
    ctx.globalAlpha=1;return true;
  }
  if(tier===5&&family===18){ // muro/galería coronada
    rect(ctx,bx+1,by+8,30,20,'#11141a');rect(ctx,bx+3,by+10,26,16,'#2c2d32');
    rect(ctx,bx+5,by+12,8,10,gold);rect(ctx,bx+6,by+13,6,8,'#3b2945');
    rect(ctx,bx+19,by+12,8,10,gold);rect(ctx,bx+20,by+13,6,8,'#243c49');
    ctx.globalAlpha=.85;rect(ctx,bx+15,by+11,2,12,diamond);ctx.globalAlpha=1;return true;
  }
  return false;
}

/** Obstáculos sólidos del banco */
export function drawObstacle(ctx: Ctx, x: number, y: number, kind: number, frame: number, integrity = 1) {
  const bx=Math.floor(x),by=Math.floor(y),T=TILE_SIZE;
  const tier=Math.max(0,Math.min(5,Math.floor(kind/20))),family=((kind%20)+20)%20;
  // Cada piso tiene un lenguaje material propio: operativo, seguridad, custodia,
  // ejecutivo, bóveda y soberano. No son simples recolores del mismo set.
  const accents=['#9f8555','#a99369','#b38c55','#c99c55','#dfb83f','#f2ca4c'];
  const darks=['#4f4b45','#47413a','#3d342e','#2e2722','#171714','#0d1016'];
  const mids=['#8b857a','#75695d','#69584a','#5c483a','#494331','#303640'];
  const lights=['#d4ccbd','#c7bca9','#c8ad84','#d6b477','#e0c565','#bcefff'];
  const details=['#736c61','#8a7865','#8e7455','#9a7547','#8d742d','#6abbd6'];
  const accent=accents[tier],dark=darks[tier],mid=mids[tier],light=lights[tier],detail=details[tier];
  const basic=tier===0,premium=tier>=3,reinforced=tier>=4,elite=tier===5;
  const pulse=.5+.5*Math.sin(frame*.055+kind*.37);

  ctx.save();
  const luxuryOverride=drawLuxuryPropOverride(ctx,bx,by,tier,family,frame,accent,dark,mid,light);
  if(!luxuryOverride)drawPropDock(ctx,bx,by,family,tier,accent,frame);
  ctx.globalAlpha=1;

  const bolt=(px0:number,py0:number)=>px(ctx,bx+px0,by+py0,light,1);
  const stripe=(yy:number)=>{rect(ctx,bx+5,by+yy,22,2,accent);rect(ctx,bx+7,by+yy,4,2,dark);rect(ctx,bx+17,by+yy,4,2,dark);};
  const feet=()=>{rect(ctx,bx+6,by+27,5,2,'#171d20');rect(ctx,bx+21,by+27,5,2,'#171d20');};

  if(!luxuryOverride) switch(family){
    case 0: { // ATM / terminal: alto, inclinado y con pantalla protagonista
      rect(ctx,bx+5,by+4,22,23,dark);rect(ctx,bx+7,by+5,18,21,mid);
      rect(ctx,bx+8,by+7,16,10,'#071318');rect(ctx,bx+9,by+8,14,8,tier===1?'#0d4154':'#173138');
      ctx.globalAlpha=.82;rect(ctx,bx+10,by+10,9,1,tier===1?'#5bddf7':light);rect(ctx,bx+10,by+13,6,1,accent);ctx.globalAlpha=1;
      rect(ctx,bx+8,by+18,16,2,detail);rect(ctx,bx+10,by+21,12,4,'#111a1e');
      rect(ctx,bx+12,by+22,8,1,light);px(ctx,bx+22,by+19,pulse>.45?'#6ce09c':'#345e48',2);
      break;
    }
    case 1: { // separador: postes altos + cinta visible y bases circulares
      ctx.fillStyle=dark;ctx.beginPath();ctx.ellipse(bx+7,by+27,5,2.5,0,0,Math.PI*2);ctx.ellipse(bx+25,by+27,5,2.5,0,0,Math.PI*2);ctx.fill();
      rect(ctx,bx+6,by+9,3,18,mid);rect(ctx,bx+24,by+9,3,18,mid);
      rect(ctx,bx+5,by+8,5,3,light);rect(ctx,bx+23,by+8,5,3,light);
      rect(ctx,bx+8,by+12,17,3,accent);rect(ctx,bx+9,by+13,15,1,'rgba(255,255,255,.22)');
      break;
    }
    case 2: { // carrusel: silueta hexagonal/rotatoria con bandejas laterales
      rect(ctx,bx+14,by+4,4,23,dark);rect(ctx,bx+15,by+5,2,21,accent);
      for(const yy of [8,14,20]){
        rect(ctx,bx+5,by+yy,22,4,mid);rect(ctx,bx+7,by+yy+1,18,2,detail);
        rect(ctx,bx+3,by+yy+1,4,2,dark);rect(ctx,bx+25,by+yy+1,4,2,dark);
        rect(ctx,bx+9+(yy%3),by+yy+1,6,1,light);
      }
      ctx.fillStyle=accent;ctx.beginPath();ctx.arc(bx+16,by+5,3,0,Math.PI*2);ctx.fill();
      break;
    }
    case 3: { // tote: bolsa/cápsula redondeada con cierre superior
      ctx.fillStyle=dark;ctx.beginPath();ctx.ellipse(bx+16,by+21,12,8,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=mid;ctx.beginPath();ctx.ellipse(bx+16,by+20,10,6,0,0,Math.PI*2);ctx.fill();
      rect(ctx,bx+9,by+17,14,3,accent);rect(ctx,bx+11,by+13,10,5,dark);rect(ctx,bx+13,by+12,6,2,light);
      rect(ctx,bx+13,by+20,6,4,'#172126');px(ctx,bx+21,by+18,light,2);
      break;
    }
    case 4: { // contenedor blindado: ancho, bajo, con esquinas cortadas
      rect(ctx,bx+1,by+11,30,16,dark);rect(ctx,bx+3,by+13,26,12,mid);
      rect(ctx,bx+1,by+14,4,8,detail);rect(ctx,bx+27,by+14,4,8,detail);
      stripe(16);rect(ctx,bx+11,by+19,10,5,'#121a1e');rect(ctx,bx+14,by+20,4,2,light);
      for(const p of [[4,12],[27,12],[4,24],[27,24]])bolt(p[0],p[1]);
      break;
    }
    case 5: { // columna/soporte: gran silueta vertical con travesaños
      rect(ctx,bx+9,by-3,14,34,dark);rect(ctx,bx+11,by-2,10,32,mid);
      rect(ctx,bx+6,by+2,20,5,detail);rect(ctx,bx+7,by+3,18,2,accent);
      rect(ctx,bx+6,by+23,20,5,detail);rect(ctx,bx+8,by+24,16,2,light);
      rect(ctx,bx+14,by,4,28,tier>=4?accent:dark);
      break;
    }
    case 6: { // biométrico: consola alta con pantalla inclinada y lector
      rect(ctx,bx+6,by+7,20,20,dark);rect(ctx,bx+8,by+8,16,18,mid);
      rect(ctx,bx+9,by+9,14,8,'#071419');rect(ctx,bx+10,by+10,12,6,tier===1?'#0f465b':'#18373d');
      ctx.globalAlpha=.84;rect(ctx,bx+11,by+12,8,1,tier===1?'#60dcf3':accent);ctx.globalAlpha=1;
      rect(ctx,bx+11,by+18,10,6,'#10181c');
      for(let yy=19;yy<=22;yy+=3)for(let xx=12;xx<=19;xx+=3)px(ctx,bx+xx,by+yy,(xx+yy)%2?detail:accent,1);
      ctx.globalAlpha=.65+.25*pulse;px(ctx,bx+24,by+11,tier===1?'#5bdbf4':'#76dc9b',2);ctx.globalAlpha=1;
      break;
    }
    case 7: { // alarma: cuerpo compacto + antenas/beacon sobresaliente
      rect(ctx,bx+8,by+15,17,12,dark);rect(ctx,bx+10,by+17,13,8,mid);
      ctx.fillStyle=tier===1?'#df514b':accent;ctx.globalAlpha=.58+.35*pulse;ctx.beginPath();ctx.arc(bx+16,by+13,4,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
      ctx.strokeStyle=light;ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(bx+11,by+15);ctx.lineTo(bx+6,by+8);ctx.moveTo(bx+21,by+15);ctx.lineTo(bx+26,by+8);ctx.stroke();
      px(ctx,bx+5,by+7,light,2);px(ctx,bx+25,by+7,light,2);
      break;
    }
    case 8: { // cajonera: torre asimétrica alta y claramente archivística
      rect(ctx,bx+5,by+1,22,27,dark);rect(ctx,bx+7,by+3,18,24,mid);
      for(let yy=5;yy<=21;yy+=6){
        rect(ctx,bx+8,by+yy,16,5,detail);rect(ctx,bx+9,by+yy+1,14,1,light);rect(ctx,bx+18,by+yy+2,4,2,accent);
      }
      rect(ctx,bx+3,by+6,3,16,dark);rect(ctx,bx+26,by+10,3,12,dark);
      break;
    }
    case 9: { // hardcase: maletín bajo con asa grande y cierres
      rect(ctx,bx+4,by+16,24,12,dark);rect(ctx,bx+6,by+18,20,8,mid);
      ctx.strokeStyle=light;ctx.lineWidth=2;ctx.strokeRect(bx+12,by+11,8,6);
      rect(ctx,bx+7,by+19,4,2,accent);rect(ctx,bx+21,by+19,4,2,accent);
      rect(ctx,bx+13,by+21,6,3,'#172126');
      break;
    }
    case 10: { // contadora: cuerpo inclinado + bandeja de billetes sobresaliente
      rect(ctx,bx+4,by+17,24,11,dark);rect(ctx,bx+6,by+15,20,11,mid);
      rect(ctx,bx+8,by+17,10,6,'#101c20');rect(ctx,bx+19,by+17,5,3,accent);
      for(let n=0;n<4;n++)rect(ctx,bx+5+n*5,by+11-(n%2),6,4,'#6f9169');
      rect(ctx,bx+7,by+24,18,2,detail);
      break;
    }
    case 11: { // carro archivo: ruedas y asa alta, silueta móvil
      rect(ctx,bx+5,by+12,20,13,dark);rect(ctx,bx+7,by+13,16,11,mid);
      rect(ctx,bx+9,by+15,12,2,light);rect(ctx,bx+9,by+19,12,4,'#263238');
      rect(ctx,bx+25,by+5,3,19,accent);rect(ctx,bx+26,by+4,5,2,light);
      ctx.fillStyle='#080d10';ctx.beginPath();ctx.arc(bx+9,by+28,3,0,Math.PI*2);ctx.arc(bx+23,by+28,3,0,Math.PI*2);ctx.fill();
      break;
    }
    case 12: { // locker: módulo alto doble puerta
      rect(ctx,bx+3,by,26,29,dark);rect(ctx,bx+5,by+2,22,25,mid);
      rect(ctx,bx+15,by+3,2,23,dark);
      for(const xx of [7,18]){
        for(let yy=5;yy<=20;yy+=6){rect(ctx,bx+xx,by+yy,7,4,detail);rect(ctx,bx+xx+1,by+yy+1,5,1,light);}
        px(ctx,bx+xx+5,by+23,accent,1);
      }
      break;
    }
    case 13: { // jaula valores: barras altas + lingotes claramente visibles
      rect(ctx,bx+2,by+6,28,22,dark);
      for(let xx=4;xx<=28;xx+=5)rect(ctx,bx+xx,by+7,2,20,mid);
      for(let yy=8;yy<=25;yy+=6)rect(ctx,bx+3,by+yy,26,2,mid);
      rect(ctx,bx+8,by+18,16,7,'#705d34');rect(ctx,bx+10,by+16,12,3,'#d1ad54');rect(ctx,bx+12,by+15,8,2,'#f2d177');
      break;
    }
    case 14: { // impresora: bandejas apiladas + papel sobresaliente
      rect(ctx,bx+4,by+12,24,16,dark);rect(ctx,bx+6,by+14,20,12,mid);
      rect(ctx,bx+8,by+6,16,9,detail);rect(ctx,bx+10,by+8,12,5,'#151f23');
      rect(ctx,bx+10,by+3,12,5,'#d8d8cf');rect(ctx,bx+11,by+4,10,1,'#8f9b98');
      rect(ctx,bx+9,by+19,14,4,'#172126');ctx.globalAlpha=.7;px(ctx,bx+24,by+16,accent,2);ctx.globalAlpha=1;
      break;
    }
    case 15: { // silla: respaldo alto, brazos, cinco apoyos
      rect(ctx,bx+11,by+7,10,13,mid);rect(ctx,bx+12,by+8,8,11,detail);rect(ctx,bx+13,by+9,6,1,light);
      rect(ctx,bx+9,by+19,14,6,dark);rect(ctx,bx+7,by+18,3,7,mid);rect(ctx,bx+22,by+18,3,7,mid);
      rect(ctx,bx+15,by+24,2,4,mid);
      ctx.strokeStyle=dark;ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(bx+16,by+27);ctx.lineTo(bx+7,by+30);ctx.moveTo(bx+16,by+27);ctx.lineTo(bx+25,by+30);ctx.stroke();
      px(ctx,bx+5,by+29,light,2);px(ctx,bx+25,by+29,light,2);
      break;
    }
    case 16: { // jardinera: maceta ancha y follaje sobresale bastante
      rect(ctx,bx+6,by+20,20,9,dark);rect(ctx,bx+8,by+21,16,6,mid);rect(ctx,bx+9,by+21,14,1,accent);
      const leaf=tier>=4?'#548d59':tier===1?'#45856f':'#659861';
      const leaf2=tier>=4?'#7ebd78':'#82b674';
      for(const [ox,oy,rx,ry,rot] of [[0,-5,5,10,.05],[-7,-1,4,9,-.55],[7,-1,4,9,.55],[-5,-8,4,9,-.25],[5,-9,4,10,.28],[0,-12,4,9,0]] as const){
        ctx.fillStyle=(ox+oy)%2?leaf:leaf2;ctx.beginPath();ctx.ellipse(bx+16+ox,by+18+oy,rx,ry,rot,0,Math.PI*2);ctx.fill();
      }
      break;
    }
    case 17: { // dispensador: depósito grande arriba + cuerpo estrecho
      rect(ctx,bx+9,by+12,14,16,dark);rect(ctx,bx+11,by+14,10,13,mid);
      const water=tier===1?'#61d9f7':'#8fd9e8';
      ctx.fillStyle=water;ctx.globalAlpha=.68+.18*pulse;ctx.beginPath();ctx.ellipse(bx+16,by+4,9,11,0,0,Math.PI*2);ctx.fill();
      ctx.globalAlpha=.45;ctx.fillStyle='#e9fcff';ctx.beginPath();ctx.ellipse(bx+13,by,2.5,5,-.35,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
      rect(ctx,bx+11,by+20,10,3,'#152126');px(ctx,bx+13,by+17,'#69bed2',2);px(ctx,bx+18,by+17,accent,2);
      break;
    }
    case 18: { // vigilancia: escritorio ancho + tres monitores elevados
      rect(ctx,bx+2,by+17,28,11,dark);rect(ctx,bx+4,by+19,24,7,mid);
      for(let i=0;i<3;i++){
        const mx=bx+3+i*9;
        rect(ctx,mx,by+6+(i===1?-2:0),8,10,'#081216');
        rect(ctx,mx+1,by+7+(i===1?-2:0),6,7,tier===1?'#0d455b':'#17343c');
        ctx.globalAlpha=.80;rect(ctx,mx+2,by+9+(i===1?-2:0),4,1,i===1?accent:'#79bbcb');ctx.globalAlpha=1;
        rect(ctx,mx+3,by+16,2,3,detail);
      }
      rect(ctx,bx+9,by+21,14,2,light);ctx.globalAlpha=.6+.25*pulse;px(ctx,bx+27,by+18,tier===1?'#ff6159':accent,2);ctx.globalAlpha=1;
      break;
    }
    case 19: { // servidor: rack muy alto, ventiladores y leds
      rect(ctx,bx+5,by-4,22,34,dark);rect(ctx,bx+7,by-2,18,31,mid);
      rect(ctx,bx+8,by,16,2,light);
      for(let yy=3;yy<=23;yy+=5){
        rect(ctx,bx+9,by+yy,14,4,'#101c21');rect(ctx,bx+10,by+yy+1,9,1,'#2e4046');
        ctx.globalAlpha=.65+.28*Math.sin(frame*.12+yy);px(ctx,bx+10,by+yy+2,tier===1?'#5bd9f3':accent,1);ctx.globalAlpha=1;
        px(ctx,bx+21,by+yy+2,yy%10===3?'#ef6159':detail,1);
      }
      // dos ventiladores hacen que el rack se reconozca incluso sin color
      for(const cy of [9,19]){
        ctx.strokeStyle='#5a676a';ctx.lineWidth=1;ctx.beginPath();ctx.arc(bx+18,by+cy,3,0,Math.PI*2);ctx.stroke();px(ctx,bx+18,by+cy,'#11191c',1);
      }
      break;
    }
    default: { rect(ctx,bx+6,by+18,20,10,dark);break; }
  }

  if(!luxuryOverride)drawTierPropAttachment(ctx,bx,by,family,tier,accent,light,detail,frame);

  // Acabado por nivel, sin envolver todos los props en el mismo rectángulo.
  if(premium&&!luxuryOverride){
    ctx.globalAlpha=.42;rect(ctx,bx+23,by+7,5,2,accent);px(ctx,bx+25,by+10,accent,1);ctx.globalAlpha=1;
  }
  if(reinforced&&!luxuryOverride){
    ctx.globalAlpha=.36;rect(ctx,bx+2,by+24,5,2,accent);rect(ctx,bx+25,by+24,5,2,accent);ctx.globalAlpha=1;
  }
  if(elite){
    ctx.globalAlpha=.65;px(ctx,bx+4,by+8,'#d9b54d',1);px(ctx,bx+27,by+8,'#d9b54d',1);ctx.globalAlpha=1;
  }
  if(basic&&!luxuryOverride){
    ctx.globalAlpha=.24;rect(ctx,bx+5,by+26,6,1,'#6c6551');ctx.globalAlpha=1;
  }

  // Firma visual única por ID: pequeñas diferencias de placa/serial evitan
  // que los 120 props se sientan como seis skins del mismo objeto.
  const sig=(kind*17+family*5)%13;
  ctx.globalAlpha=.58;ctx.fillStyle=accent;
  if(sig%3===0)px(ctx,bx+6+(sig%8),by+8+(sig%5),accent,1);
  if(sig%3===1){rect(ctx,bx+20,by+11+(sig%6),3,1,accent);px(ctx,bx+24,by+11+(sig%6),detail,1);}
  if(sig%3===2){px(ctx,bx+8,by+24,detail,1);px(ctx,bx+10+(sig%7),by+24,accent,1);}
  ctx.globalAlpha=1;

  // Daño persistente del escenario: tres etapas visibles.
  const damage=Math.max(0,Math.min(1,1-integrity));
  if(damage>.18){
    ctx.save();
    ctx.globalAlpha=.32+damage*.48;
    ctx.strokeStyle=damage>.66?'#1b1412':'#263034';
    ctx.lineWidth=damage>.66?1.5:1;
    const crackCount=damage>.72?4:damage>.42?3:2;
    for(let i=0;i<crackCount;i++){
      const sx=bx+7+((kind*11+i*7)%17),sy=by+7+((kind*5+i*9)%12);
      ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(sx+(i%2?5:-4),sy+5);ctx.lineTo(sx+(i%2?2:-1),sy+10);
      if(damage>.58)ctx.lineTo(sx+(i%2?7:-6),sy+13);ctx.stroke();
    }
    if(damage>.48){ctx.fillStyle='#111719';ctx.globalAlpha=.14+damage*.22;ctx.fillRect(bx+4,by+8,T-8,T-12);}
    if(damage>.75){ctx.globalAlpha=.8;px(ctx,bx+8,by+11,'#111719',2);px(ctx,bx+22,by+19,'#111719',2);px(ctx,bx+14,by+25,'#111719',1);}
    ctx.restore();
  }

  ctx.globalAlpha=.025;ctx.fillStyle='#7f8f93';ctx.fillRect(bx+7,by+5,T-14,1);ctx.globalAlpha=1;
  ctx.restore();
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
  const bx=Math.floor(x),by=Math.floor(y),pulse=.5+.5*Math.sin(frame*.07);
  ctx.save();

  // La sombra y la base coinciden con la hitbox física (x-3..x+27 / y+27..y+35).
  ctx.globalAlpha=.34;ctx.fillStyle='#020609';ctx.beginPath();ctx.ellipse(bx+12,by+34,18,5,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;

  if(!taken){
    const g=ctx.createRadialGradient(bx+12,by+4,2,bx+12,by+4,44);
    g.addColorStop(0,rarityColor+'66');g.addColorStop(.45,rarityColor+'22');g.addColorStop(1,rarityColor+'00');
    ctx.fillStyle=g;ctx.fillRect(bx-32,by-40,88,88);
    ctx.globalAlpha=.20+.15*pulse;ctx.strokeStyle=rarityColor;ctx.lineWidth=1;
    ctx.beginPath();ctx.ellipse(bx+12,by+5,14+pulse*4,5+pulse*2,0,0,Math.PI*2);ctx.stroke();
    ctx.globalAlpha=1;
  }

  // Columna central: más estrecha que la base para comunicar por dónde rodearla.
  rect(ctx,bx+4,by+10,16,17,'#29283a');rect(ctx,bx+6,by+10,12,16,'#49435f');
  rect(ctx,bx+8,by+12,8,12,'#5e5678');rect(ctx,bx+9,by+12,2,10,'#766d94');
  // Plato superior.
  rect(ctx,bx+1,by+6,22,5,'#4d5960');rect(ctx,bx+3,by+6,18,2,'#aeb8b4');
  rect(ctx,bx+7,by+8,10,2,rarityColor);
  // Base física real.
  rect(ctx,bx-3,by+27,30,8,'#151c20');rect(ctx,bx-1,by+27,26,5,'#323c42');
  rect(ctx,bx+1,by+28,22,2,'#667477');rect(ctx,bx+5,by+32,14,2,'#20282c');
  rect(ctx,bx+8,by+29,8,2,'#a67836');rect(ctx,bx+9,by+28,6,2,'#d4a574');px(ctx,bx+10,by+28,'#f0dda9',1);
  for(const sx of [bx,bx+23]){px(ctx,sx,by+30,'#839093',2);}

  if(taken){
    ctx.globalAlpha=.42;ctx.fillStyle='#253238';ctx.fillRect(bx+6,by+8,12,2);ctx.globalAlpha=1;
  }
  ctx.restore();
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
  const alpha=Math.max(0,life),ix=Math.floor(x),iy=Math.floor(y);
  ctx.save();ctx.globalAlpha=alpha;

  switch(type){
    case 'feather':
      ctx.fillStyle=color||'#f0f0f0';ctx.beginPath();ctx.ellipse(x,y,3.5,1.2,life*2.4,0,Math.PI*2);ctx.fill();
      ctx.globalAlpha=alpha*.35;ctx.fillRect(ix-1,iy+2,2,1);
      break;
    case 'crumb':
      ctx.fillStyle=color||'#d4a574';ctx.fillRect(ix,iy,2,2);
      if(alpha>.55){ctx.globalAlpha=alpha*.38;ctx.fillRect(ix+2,iy+1,1,1);}
      break;
    case 'coin':
      ctx.fillStyle='#f4d03f';ctx.beginPath();ctx.ellipse(x,y,2.5,1.5+.8*Math.abs(Math.sin(life*8)),0,0,Math.PI*2);ctx.fill();
      ctx.globalAlpha=alpha*.55;ctx.fillStyle='#fff0a0';ctx.fillRect(ix,iy-1,1,1);
      break;
    case 'hit':
      ctx.fillStyle=color||'#fff';ctx.fillRect(ix-1,iy-1,3,3);
      ctx.globalAlpha=alpha*.45;ctx.fillRect(ix-4,iy,2,1);ctx.fillRect(ix+3,iy,2,1);
      break;
    case 'spark': {
      const len=2+Math.round((1-alpha)*3);
      ctx.fillStyle=color||'#f4d03f';ctx.fillRect(ix,iy,len,1);ctx.fillRect(ix+1,iy-1,1,3);
      ctx.globalAlpha=alpha*.28;ctx.fillRect(ix-len,iy,Math.max(1,len-1),1);
      break;
    }
    case 'smoke': {
      const r=2.5+(1-alpha)*3.5;
      ctx.fillStyle=color||'#586065';ctx.globalAlpha=alpha*.58;
      ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
      ctx.globalAlpha=alpha*.22;ctx.beginPath();ctx.arc(x+2,y-2,r*.62,0,Math.PI*2);ctx.fill();
      break;
    }
    default:
      ctx.fillStyle=color||'#fff';ctx.fillRect(ix,iy,2,2);
  }

  ctx.restore();
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
  const bx=Math.floor(x),by=Math.floor(y),bob=Math.round(Math.sin(frame*.1)),look=Math.sin(frame*.025)>0?1:-1;
  ctx.save();
  enemyShadow(ctx,bx+9,by+20,8,.28);

  rect(ctx,bx+3,by+8+bob,12,10,'#7d8788');rect(ctx,bx+4,by+4+bob,10,7,'#a8adab');
  rect(ctx,bx+1,by+10+bob,16,9,'#493a32');rect(ctx,bx+3,by+11+bob,12,8,'#5c473a');
  rect(ctx,bx+8,by+10+bob,2,9,'#2d2724');rect(ctx,bx+2,by+9+bob,4,4,'#352c29');rect(ctx,bx+13,by+9+bob,4,4,'#352c29');

  rect(ctx,bx+1,by+2+bob,16,3,'#20282b');rect(ctx,bx+5,by-2+bob,9,5,'#2b3335');
  rect(ctx,bx+6,by-1+bob,7,1,'#59625f');
  px(ctx,bx+(look>0?11:6),by+5+bob,'#111718',2);
  px(ctx,bx+(look>0?6:11),by+5+bob,'#3d4949',1);
  rect(ctx,bx+7,by+7+bob,5,2,'#c68b4c');

  rect(ctx,bx+15,by+13+bob,7,6,'#2a3031');rect(ctx,bx+16,by+14+bob,5,4,'#6c5a3b');rect(ctx,bx+17,by+12+bob,3,2,'#8c7b56');px(ctx,bx+18,by+16+bob,'#e6c56f',1);
  rect(ctx,bx+5,by+12+bob,4,2,'#c28b50');px(ctx,bx+6,by+11+bob,'#efd69a',1);
  rect(ctx,bx+4,by+19,3,2,'#b45f58');rect(ctx,bx+11,by+19,3,2,'#b45f58');
  if(frame%90<18){ctx.globalAlpha=.6;px(ctx,bx+20,by+10+bob,'#e6c56f',1);ctx.globalAlpha=1;}
  ctx.restore();
}
