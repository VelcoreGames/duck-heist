import { CANVAS_WIDTH, UI_BASE_WIDTH, RoomType } from './constants';
import type { RoomContent } from './types';

export type WorldPropKind =
  | 'chest' | 'pedestal' | 'choice' | 'event'
  | 'shop_stand' | 'gun_van' | 'cafe_counter';

export interface WorldRect {
  x:number;
  y:number;
  w:number;
  h:number;
  kind:WorldPropKind;
}

export interface ObstacleRect {
  x:number;
  y:number;
  w:number;
  h:number;
}

/** Pedestal: la colisión sólo ocupa la base metálica visible. */
export const PEDESTAL_INTERACT_RADIUS=42;
export function pedestalHitbox(ped:{x:number;y:number}):ObstacleRect {
  return {x:ped.x-3,y:ped.y+27,w:30,h:8};
}
export function pedestalInteractPoint(ped:{x:number;y:number}) {
  // Centro de uso, no centro del objeto flotante: permite interactuar desde
  // cualquier lado permaneciendo fuera de la base sólida.
  return {x:ped.x+12,y:ped.y+18};
}

/**
 * Huella física de cada obstáculo procedural.
 * La zona sólida coincide con la base visible, no con el tile completo.
 * Esto deja unos píxeles de solape visual por arriba para que un actor pueda
 * pasar "detrás" sin atravesar físicamente el objeto.
 */
export function obstacleHitbox(kind:number,x:number,y:number):ObstacleRect {
  switch(kind){
    case 0:return {x:x+2,y:y+14,w:28,h:14}; // mostrador
    case 1:return {x:x+3,y:y+16,w:26,h:12}; // barrera
    case 2:return {x:x+3,y:y+12,w:26,h:16}; // estantería
    case 3:return {x:x+6,y:y+18,w:20,h:11}; // bolsa de efectivo
    case 4:return {x:x+3,y:y+14,w:26,h:14}; // caja blindada
    case 5:return {x:x+6,y:y+5,w:20,h:26};  // columna
    case 6:return {x:x+3,y:y+12,w:26,h:17}; // caja fuerte
    case 7:return {x:x+5,y:y+18,w:22,h:10}; // panel/escombro
    case 8:return {x:x+3,y:y+11,w:26,h:18}; // lockers
    case 9:return {x:x+5,y:y+20,w:22,h:9};  // maletín
    case 10:return {x:x+4,y:y+21,w:24,h:8}; // bandeja efectivo
    case 11:return {x:x+3,y:y+15,w:26,h:14}; // carrito valores
    case 12:return {x:x+3,y:y+11,w:26,h:18}; // archivador
    case 13:return {x:x+3,y:y+16,w:26,h:13}; // contenedor blindado
    default:return {x:x+5,y:y+18,w:22,h:10};
  }
}

export function obstacleOccludes(kind:number){
  return kind===0||kind===2||kind===4||kind===5||kind===6||
    kind===8||kind===11||kind===12||kind===13;
}

/** Rectángulos sólidos de props especiales dibujados fuera del tilemap. */
export function specialSolidRects(roomType:RoomType,content:RoomContent):WorldRect[] {
  const out:WorldRect[]=[];
  if(content.chest) out.push({
    x:content.chest.x+1,y:content.chest.y+10,w:18,h:8,kind:'chest',
  });
  if(content.pedestal) out.push({...pedestalHitbox(content.pedestal),kind:'pedestal'});
  for(const ped of content.choices ?? []) if(!ped.taken) out.push({...pedestalHitbox(ped),kind:'choice'});
  if(content.event) out.push({
    x:content.event.x-6,y:content.event.y+27,w:28,h:12,kind:'event',
  });

  const sceneOffset=CANVAS_WIDTH/2-UI_BASE_WIDTH/2;
  if(roomType===RoomType.GUN_VAN) out.push({
    x:sceneOffset+148,y:132,w:164,h:22,kind:'gun_van',
  });
  if(content.cafe) out.push({
    x:sceneOffset+134,y:130,w:210,h:19,kind:'cafe_counter',
  });

  for(const it of content.shopItems ?? []) if(!it.sold) out.push({
    x:it.x-18,y:it.y+12,w:36,h:9,kind:'shop_stand',
  });
  return out;
}

export function rectsOverlap(
  ax:number,ay:number,aw:number,ah:number,
  b:ObstacleRect,
){
  return ax < b.x+b.w && ax+aw > b.x && ay < b.y+b.h && ay+ah > b.y;
}

export function pointInRect(px:number,py:number,r:ObstacleRect){
  return px>=r.x && px<r.x+r.w && py>=r.y && py<r.y+r.h;
}
