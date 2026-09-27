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
  hitbox:{x:number;y:number;w:number;h:number};
  occludes:boolean;
}

/**
 * Las 20 siluetas físicas se reutilizan por piso, pero cada ID es un objeto
 * distinto. El tier del piso controla inversión, resistencia y acabado.
 */
export const OBSTACLE_FAMILY_PHYSICS:ReadonlyArray<ObstacleFamilyPhysics>=[
  {hp:18,material:'metal',      debris:'#5f7076',hitbox:{x:3,y:15,w:26,h:14},occludes:true }, // terminal / desk
  {hp:10,material:'light',      debris:'#b48d3e',hitbox:{x:4,y:19,w:24,h:10},occludes:false}, // queue gate
  {hp:22,material:'metal',      debris:'#6f7d80',hitbox:{x:4,y:14,w:24,h:15},occludes:true }, // carousel / display
  {hp:9, material:'light',      debris:'#53686d',hitbox:{x:6,y:19,w:20,h:10},occludes:false}, // tote / coffer
  {hp:30,material:'reinforced', debris:'#69767a',hitbox:{x:3,y:15,w:26,h:14},occludes:true }, // crate / chest
  {hp:50,material:'structural', debris:'#a1abad',hitbox:{x:7,y:6,w:18,h:25},occludes:true }, // column / support
  {hp:26,material:'reinforced', debris:'#64747b',hitbox:{x:5,y:14,w:22,h:15},occludes:true }, // access station
  {hp:12,material:'light',      debris:'#56676e',hitbox:{x:6,y:19,w:20,h:10},occludes:false}, // alarm unit
  {hp:34,material:'reinforced', debris:'#77817f',hitbox:{x:3,y:12,w:26,h:17},occludes:true }, // drawer stack
  {hp:11,material:'light',      debris:'#4d5b60',hitbox:{x:5,y:20,w:22,h:9}, occludes:false}, // hard case
  {hp:14,material:'metal',      debris:'#657277',hitbox:{x:5,y:18,w:22,h:11},occludes:false}, // counter / lab
  {hp:25,material:'metal',      debris:'#657479',hitbox:{x:4,y:16,w:24,h:13},occludes:true }, // cart / trolley
  {hp:32,material:'reinforced', debris:'#717c80',hitbox:{x:3,y:12,w:26,h:17},occludes:true }, // locker / safe
  {hp:46,material:'structural', debris:'#8a9697',hitbox:{x:3,y:13,w:26,h:16},occludes:true }, // cage
  {hp:17,material:'metal',      debris:'#728085',hitbox:{x:4,y:17,w:24,h:12},occludes:true }, // printer / press
  {hp:8, material:'light',      debris:'#5c666a',hitbox:{x:7,y:21,w:18,h:8}, occludes:false}, // chair
  {hp:10,material:'light',      debris:'#617057',hitbox:{x:7,y:20,w:18,h:9}, occludes:false}, // planter
  {hp:13,material:'light',      debris:'#7d969d',hitbox:{x:7,y:18,w:18,h:11},occludes:true }, // water station
  {hp:27,material:'metal',      debris:'#566d76',hitbox:{x:3,y:14,w:26,h:15},occludes:true }, // surveillance console
  {hp:38,material:'reinforced', debris:'#59666d',hitbox:{x:5,y:9,w:22,h:20}, occludes:true }, // server / data vault
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
  const h=family?.hitbox ?? {x:5,y:18,w:22,h:10};
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

/**
 * Huella física de cada obstáculo procedural.
 * La zona sólida coincide con la base visible, no con el tile completo.
 * Esto deja unos píxeles de solape visual por arriba para que un actor pueda
 * pasar "detrás" sin atravesar físicamente el objeto.
 */
export function obstacleHitbox(kind:number,x:number,y:number):ObstacleRect {
  const family=OBSTACLE_FAMILY_PHYSICS[obstacleFamilyIndex(kind)];
  const variant=obstacleVariantIndex(kind);
  const h=family?.hitbox ?? {x:5,y:18,w:22,h:10};
  // Algunas variantes cambian ligeramente la huella, pero siempre permanecen
  // dentro del tile y conservan espacio visual para pasar detrás del prop.
  const widen=variant===5?1:variant===4?-1:0;
  return {
    x:x+h.x-widen,
    y:y+h.y,
    w:Math.max(12,Math.min(30,h.w+widen*2)),
    h:h.h,
  };
}

export function obstacleOccludes(kind:number){
  return OBSTACLE_FAMILY_PHYSICS[obstacleFamilyIndex(kind)]?.occludes ?? false;
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
