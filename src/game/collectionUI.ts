import { COLLECTION_TABS, collectionEntries, type CatalogEntry } from './catalog';
import { RARITY_COLORS, RARITY_NAMES } from './data';
import { COLLECTION, inside } from './layout';
import { drawItemIcon } from './itemArt';
import { drawBoss, drawDuckSkin, drawPoliciaPato, drawPoliciaRapido, drawPoliciaEscopeta, drawPoliciaAntidisturbios, drawDronPolicial, drawGuardGoose, drawSecurityPigeon, drawToasterTurret, drawRollingBagel, drawEvilCroissant, drawBankerChicken } from './sprites';
import { text, wrappedText, drawMenuBackdrop, drawMenuHeader, drawMenuCard, drawMenuFooter, drawSectionLabel } from './ui';
import type { GameEngine } from './types';
import { SPECIAL_ENEMIES,drawTacticalEnemy } from './tacticalSprites';

export function collectionMove(e:GameEngine,delta:number) {
  const list=collectionEntries(e.collectionTab);
  e.collectionIndex=Math.max(0,Math.min(list.length-1,e.collectionIndex+delta));
  const row=Math.floor(e.collectionIndex/COLLECTION.cols), top=row*(COLLECTION.cellH+COLLECTION.gap);
  if(top<e.collectionScroll) e.collectionScroll=top;
  if(top+COLLECTION.cellH>e.collectionScroll+COLLECTION.h) e.collectionScroll=top+COLLECTION.cellH-COLLECTION.h;
}
export function collectionTab(e:GameEngine,index:number) {
  e.collectionTab=COLLECTION_TABS[(index+5)%5].id;e.collectionIndex=0;e.collectionScroll=0;
}
export function collectionClick(e:GameEngine,x:number,y:number) {
  for(let i=0;i<5;i++) if(inside(x,y,{x:29+i*86,y:57,w:82,h:22})) { collectionTab(e,i);return; }
  if(!inside(x,y,COLLECTION)) return;
  const list=collectionEntries(e.collectionTab);
  for(let i=0;i<list.length;i++) {
    if(inside(x,y,{x:COLLECTION.x+(i%4)*61,y:COLLECTION.y+Math.floor(i/4)*64-e.collectionScroll,w:53,h:56})) { e.collectionIndex=i;return; }
  }
}
function known(e:GameEngine,entry:CatalogEntry) {
  return entry.category==='skins'?e.unlockedSkins.includes(entry.id):e.discovered[entry.category].includes(entry.id);
}
export function drawCatalogSprite(e:GameEngine,entry:CatalogEntry,x:number,y:number,size:number,unknown=false) {
  const c=e.ui!;
  if(entry.category==='items' || entry.category==='weapons') { drawItemIcon(c,x,y,unknown?'mystery':entry.id,size,RARITY_COLORS[entry.rarity],unknown);return; }
  c.save();c.translate(x+size/2,y+size/2);c.scale(size/40,size/40);c.globalAlpha=unknown?.22:1;
  const f=e.frame;
  if(entry.category==='skins') drawDuckSkin(c,-8,-8,f,entry.id);
  else if(entry.category==='bosses') { c.scale(.68,.68);drawBoss(c,-18,-10,entry.id,f,1,1,false); }
  else if(SPECIAL_ENEMIES.has(entry.id))drawTacticalEnemy(c,entry.id,-9,-9,f);
  else switch(entry.id) {
    case 'policia_pato':drawPoliciaPato(c,-8,-8,f,false,1);break;
    case 'policia_rapido':drawPoliciaRapido(c,-7,-7,f,false,1);break;
    case 'policia_escopeta':drawPoliciaEscopeta(c,-9,-9,f,false,1,0);break;
    case 'policia_antidisturbios':drawPoliciaAntidisturbios(c,-11,-11,f,false,{x:0,y:1},false);break;
    case 'dron_policial':drawDronPolicial(c,-8,-8,f,false);break;
    case 'guard_goose':drawGuardGoose(c,-10,-10,f,false);break;
    case 'security_pigeon':drawSecurityPigeon(c,-8,-8,f,false);break;
    case 'toaster_turret':drawToasterTurret(c,-10,-10,f,false);break;
    case 'rolling_bagel':drawRollingBagel(c,-8,-8,f,false);break;
    case 'evil_croissant':drawEvilCroissant(c,-8,-8,f,false);break;
    case 'banker_chicken':drawBankerChicken(c,-8,-8,f,false);break;
  }
  c.restore();
}
export function renderCollection(e:GameEngine) {
  const c=e.ui!, list=collectionEntries(e.collectionTab),selected=list[e.collectionIndex] ?? list[0];
  const discovered=list.filter(i=>known(e,i)).length;
  const mf=e.settings.reduceMotion?0:e.frame;
  drawMenuBackdrop(c,mf,.93,'#9abf9f');
  drawMenuHeader(c,'COLECCIÓN','Todo lo que el banco ya te dejó descubrir.',mf,'#9abf9f','ARCHIVO DEL BANCO');
  text(c,'DESCUBIERTOS · '+discovered+' / '+list.length,444,63,5.8,'#91a9a6','right',true,false);
  COLLECTION_TABS.forEach((tab,i)=>{
    const on=tab.id===e.collectionTab,x=29+i*86;
    drawMenuCard(c,x,57,82,22,on,'#9abf9f',on?'rgba(35,47,35,.98)':'rgba(10,24,30,.9)');
    text(c,tab.name,70+i*86,72,7,on?'#eff0ce':'#9fb1ae','center',true,false);
  });
  const unlocked=known(e,selected);
  drawMenuCard(c,30,89,156,217,true,'#9abf9f','rgba(8,20,26,.96)');
  drawSectionLabel(c,'FICHA ACTIVA',42,108,'#9abf9f');
  drawCatalogSprite(e,selected,72,101,72,!unlocked);
  wrappedText(c,unlocked?selected.name:'???',42,188,132,11,14,2,'#f6dfa1',true);
  text(c,unlocked?RARITY_NAMES[selected.rarity]:'POR DESCUBRIR',42,221,7,unlocked?RARITY_COLORS[selected.rarity]:'#6c8285','left');
  wrappedText(c,unlocked?selected.description:'Encuéntralo durante un atraco para revelar su ficha.',42,240,132,8,11,3,'#bdc9bc');
  wrappedText(c,unlocked?`“${selected.flavor}”`:'El banco aún guarda secretos.',42,281,132,7,10,2,'#778f8d');
  c.save();c.beginPath();c.rect(COLLECTION.x-2,COLLECTION.y-2,COLLECTION.w,COLLECTION.h+4);c.clip();
  list.forEach((entry,i)=>{
    const x=COLLECTION.x+(i%4)*61,y=COLLECTION.y+Math.floor(i/4)*64-e.collectionScroll;
    if(y+56<COLLECTION.y || y>COLLECTION.y+COLLECTION.h) return;
    const k=known(e,entry),on=i===e.collectionIndex;
    drawMenuCard(c,x,y,53,56,on,on?'#9abf9f':'#3a5359',on?'rgba(29,44,35,.98)':'rgba(10,24,30,.9)');
    drawCatalogSprite(e,entry,x+11,y+5,32,!k);
    if(k) { c.fillStyle=RARITY_COLORS[entry.rarity];c.fillRect(x+18,y+45,17,2); }
    else text(c,'???',x+26,y+47,8,'#6a8184');
  });c.restore();
  const totalH=Math.ceil(list.length/4)*64-8,max=Math.max(1,totalH-COLLECTION.h);
  if(totalH>COLLECTION.h) { c.fillStyle='#284149';c.fillRect(452,89,3,217);c.fillStyle='#afad79';c.fillRect(452,89+e.collectionScroll/max*169,3,48); }
  drawMenuFooter(
    c,
    e.lastInput==='gamepad'?'LB / RB · CATEGORÍA   CRUCETA · EXPLORAR   B · VOLVER':'A / D · CATEGORÍA   FLECHAS · EXPLORAR   RUEDA · DESPLAZAR   ESC · VOLVER',
    unlocked?'FICHA DESBLOQUEADA':'POR DESCUBRIR',
    '#9abf9f',
  );
}