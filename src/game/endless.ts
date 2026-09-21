import { CANVAS_HEIGHT, CANVAS_WIDTH, RoomType } from './constants';
import { ENEMIES } from './data';
import { generateRoomLayout, type GameMap, type MapRoom } from './mapgen';
import type { DifficultyMode, EndlessRoundKind, EndlessSpecial, EndlessBossMutation } from './types';

export const ENDLESS_ROOM_KEY='0,0';

export function createEndlessMap(_alert=0):GameMap {
  const room:MapRoom={
    gx:0,gy:0,type:RoomType.START,doors:[],visited:true,cleared:false,generated:true,
    layout:[],distance:0,floorIndex:0,revealed:true,template:'open',
  };
  room.layout=generateRoomLayout(room,Math.random,'open');
  const rooms=new Map<string,MapRoom>([[ENDLESS_ROOM_KEY,room]]);
  return {rooms,startKey:ENDLESS_ROOM_KEY,itemRoomKey:ENDLESS_ROOM_KEY,bossKey:ENDLESS_ROOM_KEY,floorIndex:0};
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
  // Nunca comprimimos la cadencia por debajo de ~52%: el endgame debe ser brutal, no ilegible.
  const fire=Math.max(.52,Math.min(1.22,baseFire*difficultyMul.fire));
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

export interface EndlessComposition {
  label:string;
  enemies:string[];
}

function endlessRolePool(maxFloor:number,role:'assault'|'ranged'|'tank'|'support'|'fast') {
  const behaviors:Record<typeof role,string[]>={
    assault:['chaser','chaser_shooter','shotgunner','baton','k9'],
    ranged:['shooter','sniper','shotgunner','drone','grenadier','turret','atm'],
    tank:['shielded','atm','captain'],
    support:['medic','captain'],
    fast:['swarmer','roller','k9','baton'],
  };
  return Object.values(ENEMIES).filter(e=>e.minFloor<=maxFloor&&e.damage>0&&behaviors[role].includes(e.behavior));
}

function pickAffordable(pool:ReturnType<typeof endlessRolePool>,budget:number) {
  const choices=pool.filter(e=>e.threat<=Math.max(1,budget+1));
  const source=choices.length?choices:pool;
  return source.length?source[Math.floor(Math.random()*source.length)]:null;
}

export function endlessComposition(round:number,special:EndlessSpecial|null,difficulty:DifficultyMode='normal'):EndlessComposition {
  const scale=endlessScale(round,difficulty);
  const alert=Math.floor((Math.max(1,round)-1)/10);
  const maxFloor=Math.min(5,Math.floor(alert*.9)+Math.floor((round%10)/4));
  const all=Object.values(ENEMIES).filter(e=>e.minFloor<=maxFloor&&e.damage>0);
  const role=(r:'assault'|'ranged'|'tank'|'support'|'fast')=>endlessRolePool(maxFloor,r);
  let label='ASALTO MIXTO';
  let opening:('assault'|'ranged'|'tank'|'support'|'fast')[]=['assault','ranged'];
  if(special==='horde'){label='HORDA DE CHOQUE';opening=['fast','assault','fast','assault'];}
  else if(special==='elite'){label='ESCUADRA ÉLITE';opening=['tank','ranged','assault'];}
  else if(special==='crossfire'){label='FUEGO CRUZADO';opening=['ranged','ranged','assault'];}
  else if(special==='siege'){label='FORTALEZA';opening=['tank','support','ranged','tank'];}
  else if(special==='red_protocol'){label='PROTOCOLO ROJO';opening=['tank','support','ranged','fast'];}
  else {
    const templates=[
      {label:'PINZA',roles:['assault','ranged','fast'] as typeof opening},
      {label:'ESCOLTA',roles:['tank','support','assault'] as typeof opening},
      {label:'CAZA',roles:['fast','fast','ranged'] as typeof opening},
      {label:'FUEGO CRUZADO',roles:['ranged','assault','ranged'] as typeof opening},
      {label:'COMANDO',roles:['support','assault','ranged'] as typeof opening},
      {label:'FORTALEZA',roles:['tank','ranged','support'] as typeof opening},
    ].filter((_,i)=>alert>=5||i<5).filter((_,i)=>alert>=2||i<3);
    const t=templates[(round*7+alert*3)%templates.length];
    label=t.label;opening=t.roles;
  }
  const enemies:string[]=[];
  let budget=Math.max(3,scale.budget+(special==='horde'?4:special==='red_protocol'?5:0));
  for(const r of opening){
    const pick=pickAffordable(role(r),budget);
    if(!pick) continue;
    enemies.push(pick.id);budget-=Math.max(1,pick.threat);
    if(budget<=0) break;
  }
  let guard=0;
  while(budget>0&&guard++<60){
    let pool=all;
    if(special==='horde') pool=all.filter(e=>e.threat<=2);
    if(special==='elite') pool=all.filter(e=>e.threat>=2);
    const pick=pickAffordable(pool,budget);
    if(!pick)break;
    enemies.push(pick.id);budget-=Math.max(1,pick.threat);
  }
  return {label,enemies};
}

export function makeEndlessEnemyPlan(round:number,special:EndlessSpecial|null,difficulty:DifficultyMode='normal'):string[] {
  return endlessComposition(round,special,difficulty).enemies;
}

export function endlessMilestone(round:number) {
  if(round===50)return 'ATRACO CRÍTICO';
  if(round===100)return 'DOBLE AMENAZA';
  if(round>100&&round%50===0)return 'PROTOCOLO SIN REGLAS';
  return null;
}

export function endlessBossMutation(round:number,bossType:string,ordinal=0):EndlessBossMutation|null {
  const rank=endlessThreatRank(round);
  if(rank==='NORMAL')return null;
  const veteran:EndlessBossMutation[]=['FRENÉTICO','BLINDADO'];
  const elite:EndlessBossMutation[]=['FRENÉTICO','BLINDADO','CAZADOR','REFUERZOS'];
  const nemesis:EndlessBossMutation[]=['FRENÉTICO','CAZADOR','REFUERZOS','TORMENTA','BLINDADO'];
  const pool=rank==='VETERANO'?veteran:rank==='ÉLITE'?elite:nemesis;
  const salt=[...bossType].reduce((a,ch)=>a+ch.charCodeAt(0),0)+round*13+ordinal*19;
  return pool[salt%pool.length];
}

export function rewardRounds(round:number) {
  const r=Math.max(1,round),n=((r-1)%10)+1,alert=Math.floor((r-1)/10);
  // La build se forma rápido, pero en el endgame deja de crecer sin límite.
  if(alert<4) return n===3||n===5||n===7||n===8||n===10;
  if(alert<7) return n===5||n===7||n===8||n===10;
  if(alert<10) return n===5||n===8||n===10;
  return n===8||n===10;
}

export function cleanupPoint() {
  return {x:CANVAS_WIDTH/2,y:CANVAS_HEIGHT/2};
}
