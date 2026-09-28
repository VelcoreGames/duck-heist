import { CANVAS_WIDTH, UI_BASE_WIDTH, RoomType, OBSTACLES, OBSTACLES_PER_FLOOR } from './constants';
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

export type ObstacleMaterial='light'|'wood'|'metal'|'reinforced'|'structural';
export interface ObstacleDurability {
  hp:number;
  material:ObstacleMaterial;
  debris:string;
}

interface ObstacleFamilyPhysics {
  hp:number;
  material:ObstacleMaterial;
  debris:string;
  /** Huella sobre el suelo usada por jugador/enemigos. */
  hitbox:{x:number;y:number;w:number;h:number};
  /** Cuerpo visual usado por proyectiles/explosiones. */
  projectile:{x:number;y:number;w:number;h:number};
  occludes:boolean;
}

/**
 * Las 20 siluetas físicas se reutilizan por piso, pero cada ID es un objeto
 * distinto. El tier del piso controla inversión, resistencia y acabado.
 */
export const OBSTACLE_FAMILY_PHYSICS:ReadonlyArray<ObstacleFamilyPhysics>=[
  // footprint = contacto a nivel de suelo; projectile = volumen visible que recibe disparos.
  {hp:18,material:'metal',      debris:'#5f7076',hitbox:{x:3,y:22,w:26,h:8}, projectile:{x:5,y:4,w:22,h:26},occludes:true }, // 0 terminal / ATM
  {hp:10,material:'light',      debris:'#b48d3e',hitbox:{x:3,y:25,w:26,h:5}, projectile:{x:5,y:8,w:23,h:22},occludes:false}, // 1 queue gate
  {hp:22,material:'metal',      debris:'#6f7d80',hitbox:{x:5,y:22,w:22,h:7}, projectile:{x:3,y:4,w:26,h:26},occludes:true }, // 2 carousel / display
  {hp:9, material:'light',      debris:'#53686d',hitbox:{x:5,y:21,w:22,h:8}, projectile:{x:6,y:12,w:20,h:18},occludes:false}, // 3 tote / coffer
  {hp:30,material:'reinforced', debris:'#69767a',hitbox:{x:2,y:19,w:28,h:10},projectile:{x:1,y:11,w:30,h:19},occludes:true }, // 4 crate / chest
  {hp:50,material:'structural', debris:'#a1abad',hitbox:{x:6,y:23,w:20,h:8}, projectile:{x:6,y:0,w:20,h:31},occludes:true }, // 5 column / support
  {hp:26,material:'reinforced', debris:'#64747b',hitbox:{x:5,y:21,w:22,h:8}, projectile:{x:6,y:7,w:20,h:23},occludes:true }, // 6 access station
  {hp:12,material:'light',      debris:'#56676e',hitbox:{x:7,y:21,w:18,h:8}, projectile:{x:5,y:7,w:22,h:22},occludes:false}, // 7 alarm unit
  {hp:34,material:'reinforced', debris:'#77817f',hitbox:{x:4,y:21,w:24,h:8}, projectile:{x:3,y:1,w:26,h:29},occludes:true }, // 8 drawer stack
  {hp:11,material:'light',      debris:'#4d5b60',hitbox:{x:4,y:22,w:24,h:7}, projectile:{x:4,y:11,w:24,h:19},occludes:false}, // 9 hard case
  {hp:14,material:'metal',      debris:'#657277',hitbox:{x:4,y:22,w:24,h:7}, projectile:{x:4,y:10,w:24,h:20},occludes:false}, // 10 counter / lab
  {hp:25,material:'metal',      debris:'#657479',hitbox:{x:4,y:21,w:24,h:9}, projectile:{x:5,y:4,w:26,h:26},occludes:true }, // 11 cart / trolley
  {hp:32,material:'reinforced', debris:'#717c80',hitbox:{x:4,y:21,w:24,h:8}, projectile:{x:3,y:0,w:26,h:30},occludes:true }, // 12 locker / safe
  {hp:46,material:'structural', debris:'#8a9697',hitbox:{x:2,y:19,w:28,h:10},projectile:{x:2,y:6,w:28,h:24},occludes:true }, // 13 cage
  {hp:17,material:'metal',      debris:'#728085',hitbox:{x:4,y:22,w:24,h:7}, projectile:{x:4,y:3,w:24,h:27},occludes:true }, // 14 printer / press
  {hp:8, material:'light',      debris:'#5c666a',hitbox:{x:5,y:24,w:22,h:7}, projectile:{x:5,y:7,w:22,h:24},occludes:false}, // 15 chair
  {hp:10,material:'light',      debris:'#617057',hitbox:{x:5,y:22,w:22,h:8}, projectile:{x:3,y:0,w:26,h:30},occludes:false}, // 16 planter
  {hp:13,material:'light',      debris:'#7d969d',hitbox:{x:6,y:22,w:20,h:8}, projectile:{x:7,y:0,w:18,h:30},occludes:true }, // 17 water station
  {hp:27,material:'metal',      debris:'#566d76',hitbox:{x:2,y:21,w:28,h:8}, projectile:{x:2,y:4,w:28,h:26},occludes:true }, // 18 surveillance console
  {hp:38,material:'reinforced', debris:'#59666d',hitbox:{x:5,y:21,w:22,h:9}, projectile:{x:5,y:0,w:22,h:30},occludes:true }, // 19 server / data vault
];

const floorHpBonus=[0,2,4,6,8,10] as const;
const floorValueBase=[120,650,2400,9000,32000,120000] as const;
const familyValueFactor=[
  1.5,.55,1.1,.75,1.7,2.4,2.0,1.0,1.8,.9,
  1.4,1.55,2.1,2.8,1.35,.8,1.0,1.25,2.25,2.65,
] as const;

export const obstacleFloorTier=(kind:number)=>Math.max(0,Math.min(5,Math.floor(kind/OBSTACLES_PER_FLOOR)));
export const obstacleFamilyIndex=(kind:number)=>((kind%OBSTACLES_PER_FLOOR)+OBSTACLES_PER_FLOOR)%OBSTACLES_PER_FLOOR;
export const obstacleValue=(kind:number)=>{
  const tier=obstacleFloorTier(kind),family=obstacleFamilyIndex(kind);
  return Math.round(floorValueBase[tier]*familyValueFactor[family]);
};

export const OBSTACLE_DURABILITY:ReadonlyArray<ObstacleDurability>=OBSTACLES.map((_,kind)=>{
  const family=OBSTACLE_FAMILY_PHYSICS[obstacleFamilyIndex(kind)];
  const tier=obstacleFloorTier(kind);
  return {
    hp:Math.max(6,Math.min(63,family.hp+floorHpBonus[tier])),
    material:tier>=4&&family.material==='light'?'metal':family.material,
    debris:family.debris,
  };
});

export const obstacleMaxHp=(kind:number)=>OBSTACLE_DURABILITY[kind]?.hp??18;
export const obstacleMaterial=(kind:number)=>OBSTACLE_DURABILITY[kind]?.material??'metal';
export const obstacleDebrisColor=(kind:number)=>OBSTACLE_DURABILITY[kind]?.debris??'#7a8588';

/**
 * Huella física: sólo la base visible bloquea movimiento. La zona superior
 * queda libre para que el pato pueda pasar por detrás y ser ocluido.
 */
export function obstacleHitbox(kind:number,x:number,y:number):ObstacleRect {
  const family=OBSTACLE_FAMILY_PHYSICS[obstacleFamilyIndex(kind)];
  const h=family?.hitbox ?? {x:5,y:22,w:22,h:8};
  return {x:x+h.x,y:y+h.y,w:h.w,h:h.h};
}

/** Caja del cuerpo visible: permite disparar a la parte alta sin volverla sólida al caminar. */
export function obstacleProjectileHitbox(kind:number,x:number,y:number):ObstacleRect {
  const family=OBSTACLE_FAMILY_PHYSICS[obstacleFamilyIndex(kind)];
  const h=family?.projectile ?? family?.hitbox ?? {x:5,y:10,w:22,h:19};
  return {x:x+h.x,y:y+h.y,w:h.w,h:h.h};
}

export function obstacleOccludes(kind:number){
  return OBSTACLE_FAMILY_PHYSICS[obstacleFamilyIndex(kind)]?.occludes ?? false;
}

/** Zona visual en la que un actor debe quedar detrás de la parte alta del prop. */
export function obstacleCoverRect(kind:number,x:number,y:number):ObstacleRect {
  const hit=obstacleHitbox(kind,x,y);
  const top=y+3;
  const bottom=Math.min(y+TILE_SIZE_SAFE,hit.y+5);
  return {x:x+1,y:top,w:30,h:Math.max(7,bottom-top)};
}

const TILE_SIZE_SAFE=32;

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
