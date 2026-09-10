import { GameState, RoomType, DIR_VECTORS, OPPOSITE, type Dir } from './constants';
import { key, type MapRoom } from './mapgen';
import { getBuild } from './itemRules';
import { FLOOR_NAMES_ES } from './i18n';
import { text, wrappedText } from './ui';
import { drawDuckSkin } from './sprites';
import { playUiMove, playUiBack } from './audio';
import type { GameEngine } from './types';
import { seededRandom } from './random';
import { completeTutorial } from './tutorial';
import { actionPrompt } from './gamepad';

export const ROOM_STYLE:Record<RoomType,{label:string;color:string;symbol:string}> = {
  [RoomType.START]:{label:'ENTRADA',color:'#63accc',symbol:'start'},
  [RoomType.COMBAT]:{label:'SALA NORMAL',color:'#8b9ca5',symbol:'normal'},
  [RoomType.ITEM]:{label:'SALA DE OBJETOS',color:'#eac56d',symbol:'item'},
  [RoomType.TREASURE]:{label:'SALA DEL TESORO',color:'#eac56d',symbol:'item'},
  [RoomType.SHOP]:{label:'TIENDA',color:'#71c799',symbol:'shop'},
  [RoomType.GUN_VAN]:{label:'CAMIONETA',color:'#e79a45',symbol:'van'},
  [RoomType.MINIBOSS]:{label:'MINIJEFE',color:'#efa869',symbol:'mini'},
  [RoomType.BOSS]:{label:'JEFE',color:'#c76c75',symbol:'boss'},
  [RoomType.CHOICE]:{label:'RECOMPENSA',color:'#b39be0',symbol:'reward'},
  [RoomType.EVENT]:{label:'SALA ESPECIAL',color:'#b39be0',symbol:'event'},
  [RoomType.CHALLENGE]:{label:'DESAFÍO',color:'#c692a5',symbol:'challenge'},
  [RoomType.SECRET]:{label:'SALA SECRETA',color:'#af9cda',symbol:'secret'},
};

/** Read-only visibility: opening either map never discovers or generates rooms. */
export function visibleRoomKeys(e:GameEngine):Set<string> {
  const visible=new Set<string>();
  const revealFloor=getBuild(e.player).map>0;
  for(const [id,room] of e.map.rooms) {
    if(room.type===RoomType.SECRET) {
      if(room.visited || room.revealed) visible.add(id);
      continue;
    }
    if(room.visited || room.revealed || revealFloor) visible.add(id);
    if(room.visited) for(const d of room.doors) {
      const v=DIR_VECTORS[d],next=key(room.gx+v.x,room.gy+v.y),r=e.map.rooms.get(next);
      if(r && (r.type!==RoomType.SECRET || r.revealed || r.visited)) visible.add(next);
    }
  }
  visible.add(e.currentKey);
  return visible;
}

export function knownPath(e:GameEngine,destination:string):string[] {
  const visible=visibleRoomKeys(e);
  if(!visible.has(destination)) return [];
  const previous=new Map<string,string|null>([[e.currentKey,null]]),queue=[e.currentKey];
  for(let i=0;i<queue.length;i++) {
    const id=queue[i],r=e.map.rooms.get(id);
    if(id===destination) break;
    if(!r) continue;
    for(const d of r.doors) {
      const v=DIR_VECTORS[d],next=key(r.gx+v.x,r.gy+v.y),other=e.map.rooms.get(next);
      if(!visible.has(next)||previous.has(next)||!other?.doors.includes(OPPOSITE[d])) continue;
      previous.set(next,id);queue.push(next);
    }
  }
  if(!previous.has(destination)) return [];
  const path:string[]=[];
  for(let at:string|null=destination;at!==null;at=previous.get(at) ?? null) path.unshift(at);
  return path;
}

export function openFloorMap(e:GameEngine) {
  if(e.swap || ![GameState.PLAYING,GameState.PAUSED,GameState.FLOOR_INTRO,GameState.BOSS_INTRO].includes(e.state)) return false;
  e.mapView.returnState=e.state;e.mapView.selected=e.currentKey;e.mapView.frame=0;e.mapView.gpsTarget=null;
  e.state=GameState.MAP;e.keys={};e.mouseDown=false;e.pad.shoot=false;e.pad.moveX=0;e.pad.moveY=0;playUiMove();e.onStateChange?.(e.state);
  completeTutorial(e,'map');
  return true;
}
export function closeFloorMap(e:GameEngine) {
  if(e.state!==GameState.MAP) return false;
  e.state=e.mapView.returnState;e.keys={};e.mouseDown=false;e.pad.shoot=false;e.pad.moveX=0;e.pad.moveY=0;
  playUiBack();e.onStateChange?.(e.state);return true;
}
export function toggleFloorMap(e:GameEngine) {return e.state===GameState.MAP?closeFloorMap(e):openFloorMap(e);}

export function inspectMapDirection(e:GameEngine,d:Dir) {
  const current=e.map.rooms.get(e.mapView.selected) ?? e.map.rooms.get(e.currentKey)!;
  const v=DIR_VECTORS[d],candidates=[...visibleRoomKeys(e)].map(id=>({id,r:e.map.rooms.get(id)!})).filter(({r})=>
    (r.gx-current.gx)*v.x+(r.gy-current.gy)*v.y>0);
  candidates.sort((a,b)=>{
    const score=(r:MapRoom)=>Math.abs((r.gx-current.gx)*v.y-(r.gy-current.gy)*v.x)*4+Math.hypot(r.gx-current.gx,r.gy-current.gy);
    return score(a.r)-score(b.r);
  });
  if(candidates[0]) {e.mapView.selected=candidates[0].id;e.mapView.gpsTarget=null;playUiMove();}
}

const GRAPH={x:27,y:84,w:288,h:202};
export function mapNodeLayout(e:GameEngine) {
  const rooms=[...visibleRoomKeys(e)].map(id=>({id,room:e.map.rooms.get(id)!})).filter(v=>v.room);
  const xs=rooms.map(v=>v.room.gx),ys=rooms.map(v=>v.room.gy);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
  const cell=Math.min(48,GRAPH.w/(maxX-minX+1),GRAPH.h/(maxY-minY+1));
  const ox=GRAPH.x+(GRAPH.w-(maxX-minX+1)*cell)/2,oy=GRAPH.y+(GRAPH.h-(maxY-minY+1)*cell)/2;
  return rooms.map(({id,room})=>({id,room,x:ox+(room.gx-minX+.5)*cell,y:oy+(room.gy-minY+.5)*cell,w:cell*.7,h:cell*.55}));
}

export function mapHit(e:GameEngine,x:number,y:number) {
  const found=mapNodeLayout(e).find(n=>Math.abs(x-n.x)<n.w/2+3 && Math.abs(y-n.y)<n.h/2+3);
  if(found && e.mapView.selected!==found.id) {e.mapView.selected=found.id;e.mapView.gpsTarget=null;}
  return !!found;
}
export function mapClick(e:GameEngine,x:number,y:number) {
  if(getBuild(e.player).gps && y>=277 && y<=294 && x>=331 && x<=452) {
    const kind=(['shop','boss','stairs'] as const)[Math.min(2,Math.floor((x-331)/41))];focusMapDestination(e,kind);return;
  }
  mapHit(e,x,y);
}
export function focusMapDestination(e:GameEngine,type:'shop'|'boss'|'stairs') {
  const visible=visibleRoomKeys(e);
  const destinations=[...visible].filter(id=>{
    const r=e.map.rooms.get(id)!;
    return type==='shop'?(r.type===RoomType.SHOP||r.type===RoomType.GUN_VAN):type==='boss'?r.type===RoomType.BOSS:!!e.contents.get(id)?.stairs;
  }).map(id=>({id,path:knownPath(e,id)})).filter(v=>v.path.length);
  destinations.sort((a,b)=>a.path.length-b.path.length);
  if(destinations[0]) {e.mapView.selected=destinations[0].id;e.mapView.gpsTarget=type;}
}

/** Explicit discovery hooks. None of these expose an undiscovered secret. */
export function applyMapItemEffects(e:GameEngine,newFloor=false) {
  const b=getBuild(e.player),rooms=e.map.rooms;
  const reveal=(id:string)=>{const r=rooms.get(id);if(r&&r.type!==RoomType.SECRET)r.revealed=true;};
  if(b.blueprint) {
    const connected=new Set<string>();
    for(const r of rooms.values()) if(r.visited) for(const d of r.doors){const v=DIR_VECTORS[d];connected.add(key(r.gx+v.x,r.gy+v.y));}
    for(const id of connected) {
      reveal(id);const r=rooms.get(id);if(!r||r.type===RoomType.SECRET)continue;
      for(const d of r.doors){const v=DIR_VECTORS[d];reveal(key(r.gx+v.x,r.gy+v.y));}
    }
  }
  if(b.shopReveal)for(const [id,r]of rooms)if(r.type===RoomType.SHOP||r.type===RoomType.GUN_VAN)reveal(id);
  if(b.guardLenses) {
    const normals=[...rooms.values()].filter(r=>r.type===RoomType.COMBAT);
    if(normals.length && normals.filter(r=>r.cleared).length/normals.length>=.6) reveal(e.map.bossKey);
  }
  if(b.stainedMap && e.stainedFloor!==e.map.floorIndex) {
    const candidates=[...rooms.entries()].filter(([,r])=>![RoomType.START,RoomType.COMBAT,RoomType.SECRET].includes(r.type)&&!r.visited&&!r.revealed);
    if(candidates.length) {
      const rand=seededRandom(`${e.run.seed}:${e.map.floorIndex}:stain`);reveal(candidates[Math.floor(rand()*candidates.length)][0]);
    }
    e.stainedFloor=e.map.floorIndex;
  }
  if(newFloor) {e.mapView.selected=e.map.startKey;e.mapView.gpsTarget=null;}
}

export function roomStatus(e:GameEngine,id:string):string {
  const r=e.map.rooms.get(id),c=e.contents.get(id);
  if(!r) return '';
  if(!r.visited) return 'Descubierta · Sin visitar';
  if(r.type===RoomType.BOSS||r.type===RoomType.MINIBOSS) return r.cleared?(c?.stairs?'Derrotado · Escaleras':'Derrotado'):'Pendiente';
  if(c?.stairs) return 'Escaleras disponibles';
  if(c?.shopItems) return c.shopItems.every(i=>i.sold)?'Agotada':c.shopItems.some(i=>i.sold)?'Visitada · Compra realizada':'Visitada · Abierta';
  if(c?.choices) return c.choiceTaken?'Recompensa recogida':'Elige una recompensa';
  if(c?.pedestal) return c.pedestal.taken?'Objeto recogido':'Objeto disponible';
  if(c?.chest) return c.chest.opened?'Tesoro recogido':'Cofre cerrado';
  if(c?.event) return c.event.used?'Evento completado':'Evento pendiente';
  return r.cleared?'Sala despejada':'En combate';
}

/** Identical glyphs and colors are used by the minimap and full blueprint. */
export function drawRoomSymbol(c:CanvasRenderingContext2D,room:MapRoom,x:number,y:number,size:number,stairs=false) {
  const style=ROOM_STYLE[room.type],u=size/12;
  c.save();c.translate(x-size/2,y-size/2);c.scale(u,u);c.fillStyle=room.type===RoomType.COMBAT&&room.cleared?'#596f7c':style.color;
  const rect=(x:number,y:number,w:number,h:number)=>c.fillRect(x,y,w,h);
  if(stairs) {for(let i=0;i<4;i++) rect(2+i*2,8-i*2,2,2);rect(1,10,10,1);}
  else switch(style.symbol) {
    case 'item': c.beginPath();c.moveTo(6,1);c.lineTo(11,6);c.lineTo(6,11);c.lineTo(1,6);c.closePath();c.strokeStyle=style.color;c.lineWidth=1.4;c.stroke();rect(5,4,2,4);break;
    case 'shop':rect(2,2,8,2);rect(2,3,2,3);rect(3,5,7,2);rect(8,6,2,3);rect(2,9,8,2);rect(5,0,2,12);break;
    case 'van':rect(1,4,10,5);rect(3,2,5,3);c.fillStyle='#111820';rect(4,3,3,2);c.fillStyle=style.color;rect(2,9,2,2);rect(8,9,2,2);break;
    case 'boss':rect(2,2,8,6);rect(4,8,5,3);c.fillStyle='#152630';rect(3,4,2,2);rect(7,4,2,2);rect(6,8,1,3);break;
    case 'mini':case 'challenge':rect(5,1,2,7);rect(5,10,2,2);break;
    case 'reward':case 'event':case 'secret':
      c.beginPath();for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,r=i%2?2.5:5;c.lineTo(6+Math.cos(a)*r,6+Math.sin(a)*r);}c.closePath();c.fill();break;
    case 'start':rect(2,5,8,6);c.beginPath();c.moveTo(1,5);c.lineTo(6,1);c.lineTo(11,5);c.fill();break;
    default:rect(2,2,8,8);break;
  }
  if(room.cleared && room.visited && !stairs) {
    c.strokeStyle='#d3e2d2';c.lineWidth=1.2;c.beginPath();c.moveTo(7,10);c.lineTo(9,12);c.lineTo(13,7);c.stroke();
  }
  c.restore();
}

export function renderFloorMap(e:GameEngine) {
  const c=e.ui!,f=e.mapView.frame,nodes=mapNodeLayout(e),visible=new Set(nodes.map(n=>n.id));
  c.save();
  c.fillStyle='#091d2a';c.fillRect(0,0,480,352);
  for(let x=0;x<480;x+=12){c.fillStyle=x%48?'#102938':'#183443';c.fillRect(x,0,1,352);}
  for(let y=0;y<352;y+=12){c.fillStyle=y%48?'#102938':'#183443';c.fillRect(0,y,480,1);}
  c.strokeStyle='#456370';c.lineWidth=1;c.strokeRect(12.5,12.5,455,327);
  c.fillStyle='#0c2431';c.fillRect(22,21,436,48);
  text(c,`PISO ${e.map.floorIndex+1}/6`,30,37,8,'#c4b47c','left',true);
  wrappedText(c,FLOOR_NAMES_ES[e.map.floorIndex],30,54,302,11,13,1,'#d2e2dc',true);
  text(c,'MAPA DEL BANCO',445,34,7,'#84a9b6','right');
  text(c,'COMBATE EN PAUSA',445,50,7,'#78c0ab','right',true);
  c.fillStyle='rgba(4,17,25,.55)';c.fillRect(21,78,302,213);

  const selected=visible.has(e.mapView.selected)?e.mapView.selected:e.currentKey,path=knownPath(e,selected);
  const segments=new Set(path.slice(1).map((id,i)=>[id,path[i]].sort().join('|')));
  const byId=new Map(nodes.map(n=>[n.id,n]));
  for(const n of nodes) for(const d of n.room.doors) {
    const v=DIR_VECTORS[d],next=key(n.room.gx+v.x,n.room.gy+v.y),other=byId.get(next);
    if(!other || n.id>next) continue;
    const route=segments.has([n.id,next].sort().join('|'));
    c.strokeStyle=route?'#e7cf8b':'#3e6170';c.lineWidth=route?2:1;c.setLineDash(route?[]:[3,3]);
    c.beginPath();c.moveTo(n.x,n.y);c.lineTo(other.x,other.y);c.stroke();
  }
  c.setLineDash([]);
  for(const n of nodes) {
    const current=n.id===e.currentKey,highlight=n.id===selected,style=ROOM_STYLE[n.room.type];
    c.fillStyle=n.room.cleared&&n.room.visited?'#142b38':'#203a46';c.fillRect(n.x-n.w/2,n.y-n.h/2,n.w,n.h);
    c.strokeStyle=current?'#f1f7e7':highlight?'#e7cb80':style.color;c.lineWidth=current?2:highlight?1.5:1;
    if(current){c.shadowColor='#a8dcd3';c.shadowBlur=3+Math.sin(f*.06)*2;}
    c.strokeRect(n.x-n.w/2,n.y-n.h/2,n.w,n.h);c.shadowBlur=0;
    drawRoomSymbol(c,n.room,n.x,n.y,Math.min(12,n.h*.62),!!e.contents.get(n.id)?.stairs);
    if(current){c.fillStyle='#eff5df';c.fillRect(n.x-2,n.y-n.h/2-4,4,2);}
  }

  const current=byId.get(e.currentKey)!;
  text(c,'ESTÁS AQUÍ',current.x,Math.min(286,current.y+current.h/2+10),6.5,'#e9f4dc','center',true);
  c.save();c.translate(336,85);c.scale(1.2,1.2);drawDuckSkin(c,0,0,f,e.equippedSkin);c.restore();
  text(c,'ESTÁS AQUÍ',361,95,7,'#e3eee3','left',true);
  text(c,'Ubicación segura',361,106,6.5,'#739aa6','left');
  const discovered=nodes.length,cleared=nodes.filter(n=>n.room.visited&&n.room.cleared).length;
  text(c,`Salas descubiertas: ${discovered} / ?`,336,125,7,'#a8c3c8','left');
  text(c,`Salas despejadas: ${cleared}`,336,138,7,'#a8c3c8','left');
  const boss=nodes.find(n=>n.room.type===RoomType.BOSS),mini=nodes.find(n=>n.room.type===RoomType.MINIBOSS);
  text(c,`Jefe: ${!boss?'No encontrado':boss.room.cleared?'Derrotado':'Descubierto'}`,336,153,7,'#c69796','left');
  text(c,`Minijefe: ${mini?.room.cleared?'Derrotado':'Pendiente'}`,336,166,7,'#c6a58c','left');
  c.fillStyle='#426474';c.fillRect(335,177,114,1);
  const room=e.map.rooms.get(selected)!;
  wrappedText(c,ROOM_STYLE[room.type].label,336,193,111,9,12,2,ROOM_STYLE[room.type].color,true);
  wrappedText(c,roomStatus(e,selected),336,224,110,7.5,11,2,'#acc4c2');
  text(c,path.length>1?`Ruta conocida: ${path.length-1} salas`:selected===e.currentKey?'Tu sala actual':'Sin ruta conocida',336,255,6.8,'#d5c58d','left');
  text(c,'Solo orientación. Sin transporte.',336,271,6,'#6f98a7','left');
  if(getBuild(e.player).gps) {
    [['shop','Tienda'],['boss','Jefe'],['stairs','Escaleras']].forEach(([type,label],i)=>{
      c.fillStyle=e.mapView.gpsTarget===type?'#675c3e':'#1f3f4a';c.fillRect(331+i*41,277,39,17);
      text(c,label,350+i*41,289,6,'#d2dfd6');
    });
  }

  const legend:[RoomType,string][]=[[RoomType.COMBAT,'Normal'],[RoomType.ITEM,'Objeto'],[RoomType.SHOP,'Tienda'],[RoomType.MINIBOSS,'Minijefe'],[RoomType.BOSS,'Jefe'],[RoomType.CHOICE,'Recompensa']];
  legend.forEach(([type,label],i)=>{const x=31+i*65;drawRoomSymbol(c,{type,cleared:false,visited:false} as MapRoom,x,305,9);text(c,label,x+9,308,6.5,'#9cbac0','left');});
  drawRoomSymbol(c,{type:RoomType.START,cleared:false,visited:false} as MapRoom,420,305,9,true);text(c,'Escaleras',429,308,6,'#9cbac0','left');
  text(c,e.lastInput==='gamepad'?'PALANCA / CRUCETA · INSPECCIONAR':'WASD / FLECHAS / MOUSE · INSPECCIONAR',28,329,6.5,'#829fad','left');
  text(c,`${actionPrompt(e,'map')} / ${e.lastInput==='gamepad'?'B':'ESC'} · CERRAR MAPA`,450,329,7,'#e4d29d','right',true);
  c.restore();
}