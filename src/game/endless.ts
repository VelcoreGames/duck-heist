import { CANVAS_HEIGHT, CANVAS_WIDTH, RoomType } from './constants';
import { ENEMIES } from './data';
import { generateRoomLayout, type GameMap, type MapRoom } from './mapgen';
import type { DifficultyMode, EndlessRoundKind, EndlessSpecial } from './types';

export const ENDLESS_ROOM_KEY='0,0';

export function createEndlessMap(alert=0):GameMap {
  const room:MapRoom={
    gx:0,gy:0,type:RoomType.START,doors:[],visited:true,cleared:false,generated:true,
    layout:[],distance:0,floorIndex:Math.min(5,alert),revealed:true,template:'open',
  };
  room.layout=generateRoomLayout(room,Math.random,'open');
  const rooms=new Map<string,MapRoom>([[ENDLESS_ROOM_KEY,room]]);
  return {rooms,startKey:ENDLESS_ROOM_KEY,itemRoomKey:ENDLESS_ROOM_KEY,bossKey:ENDLESS_ROOM_KEY,floorIndex:Math.min(5,alert)};
}

export function endlessRoundKind(round:number):EndlessRoundKind {
  const n=((Math.max(1,round)-1)%10)+1;
  if(n===5) return 'miniboss';
  if(n===7) return 'special';
  if(n===8) return 'subboss';
  if(n===10) return 'boss';
  return 'combat';
}

export function endlessStage(round:number) {
  if(round<=10) return 'INTRUSIÓN';
  if(round<=20) return 'RESPUESTA ARMADA';
  if(round<=30) return 'ALERTA ROJA';
  if(round<=40) return 'CIERRE TOTAL';
  if(round<=50) return 'ESTADO DE SITIO';
  if(round<=75) return 'BANCO EN GUERRA';
  if(round<=100) return 'PROTOCOLO FINAL';
  return 'ATRACO IMPOSIBLE';
}

export function endlessThreatRank(round:number):'NORMAL'|'VETERANO'|'ÉLITE'|'NÉMESIS' {
  const alert=Math.floor((Math.max(1,round)-1)/10);
  if(alert>=8) return 'NÉMESIS';
  if(alert>=5) return 'ÉLITE';
  if(alert>=2) return 'VETERANO';
  return 'NORMAL';
}

export interface EndlessScale {
  hp:number; dmg:number; speed:number; fire:number; budget:number; maxActive:number;
  eliteChance:number; spawnDelay:number; pressureGain:number;
}
export function endlessScale(round:number,difficulty:DifficultyMode):EndlessScale {
  const r=Math.max(1,round),alert=Math.floor((r-1)/10);
  const difficultyMul={
    easy:{hp:.82,dmg:.75,speed:.92,fire:1.18,count:.92,elite:.55},
    normal:{hp:1,dmg:1,speed:1,fire:1,count:1,elite:1},
    hard:{hp:1.15,dmg:1.18,speed:1.06,fire:.88,count:1.1,elite:1.35},
    mad:{hp:1.28,dmg:1.38,speed:1.12,fire:.74,count:1.22,elite:1.75},
  }[difficulty];
  const hp=(1+(r-1)*.045+alert*.10)*difficultyMul.hp;
  const dmg=(1+(r-1)*.018+alert*.045)*difficultyMul.dmg;
  const speed=Math.min(1.48,(1+Math.min(.38,(r-1)*.005+alert*.012))*difficultyMul.speed);
  const baseFire=Math.max(.58,1-Math.min(.42,(r-1)*.004+alert*.009));
  const fire=Math.max(.46,Math.min(1.22,baseFire*difficultyMul.fire));
  const budget=Math.max(3,Math.round((3+r*.46+alert*1.25)*difficultyMul.count));
  const maxActive=Math.min(12,4+Math.floor(r/14)+Math.floor(alert/3));
  const eliteChance=Math.min(.78,(.025+r*.0065+alert*.02)*difficultyMul.elite);
  const spawnDelay=Math.max(16,46-Math.floor(r*.22)-alert);
  const pressureGain=Math.min(.145,.04+r*.00055+alert*.0025);
  return {hp,dmg,speed,fire,budget,maxActive,eliteChance,spawnDelay,pressureGain};
}

export function endlessSpecial(round:number):EndlessSpecial {
  const alert=Math.floor((Math.max(1,round)-1)/10);
  const pool:EndlessSpecial[]=['horde','elite'];
  if(alert>=1) pool.push('blackout','crossfire');
  if(alert>=2) pool.push('cameras','siege');
  if(alert>=5) pool.push('red_protocol');
  const seed=(round*1103515245+12345)>>>0;
  return pool[seed%pool.length];
}

export function specialLabel(s:EndlessSpecial) {
  return {
    horde:'HORDA',
    elite:'SOLO ÉLITES',
    blackout:'APAGÓN',
    crossfire:'FUEGO CRUZADO',
    cameras:'CÁMARAS ACTIVAS',
    siege:'CERCO',
    red_protocol:'PROTOCOLO ROJO',
  }[s];
}

export function makeEndlessEnemyPlan(round:number,special:EndlessSpecial|null):string[] {
  const scale=endlessScale(round,'normal');
  const alert=Math.floor((Math.max(1,round)-1)/10);
  const maxFloor=Math.min(5,Math.floor(alert*.9)+Math.floor((round%10)/4));
  let pool=Object.values(ENEMIES).filter(e=>e.minFloor<=maxFloor && e.damage>0);
  if(special==='horde') pool=pool.filter(e=>e.threat<=2);
  if(special==='crossfire') {
    const ranged=pool.filter(e=>['shooter','sniper','shotgunner','drone','grenadier','turret','atm'].includes(e.behavior));
    if(ranged.length) pool=ranged;
  }
  if(special==='siege') {
    const heavy=pool.filter(e=>e.threat>=2);
    if(heavy.length) pool=heavy;
  }
  if(!pool.length) pool=Object.values(ENEMIES).filter(e=>e.minFloor===0);
  const result:string[]=[];
  let budget=Math.max(3,scale.budget+(special==='horde'?4:special==='red_protocol'?5:0));
  let guard=0;
  while(budget>0 && guard++<60) {
    const candidates=pool.filter(e=>e.threat<=budget+1);
    const pick=(candidates.length?candidates:pool)[Math.floor(Math.random()*(candidates.length?candidates.length:pool.length))];
    result.push(pick.id);
    budget-=Math.max(1,pick.threat);
  }
  return result;
}

export function rewardRounds(round:number) {
  const n=((Math.max(1,round)-1)%10)+1;
  return n===3||n===5||n===7||n===8||n===10;
}

export function cleanupPoint() {
  return {x:CANVAS_WIDTH/2,y:CANVAS_HEIGHT/2};
}
