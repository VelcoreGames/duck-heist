import { COLLECTION_TABS, collectionEntries, type CatalogEntry } from './catalog';
import { RARITY_COLORS, RARITY_NAMES, SYNERGIES } from './data';
import { COLLECTION, COLLECTION_FILTER, COLLECTION_SORT, COLLECTION_CAREER, BACK_BUTTON, inside } from './layout';
import { drawItemIcon } from './itemArt';
import { drawBoss, drawDuckSkin, drawPoliciaPato, drawPoliciaRapido, drawPoliciaEscopeta, drawPoliciaAntidisturbios, drawDronPolicial, drawGuardGoose, drawSecurityPigeon, drawToasterTurret, drawRollingBagel, drawEvilCroissant, drawBankerChicken } from './sprites';
import { text, wrappedText, drawMenuBackdrop, drawMenuHeader, drawMenuCard, drawMouseButton, drawSectionLabel } from './ui';
import type { GameEngine } from './types';
import { SPECIAL_ENEMIES,drawTacticalEnemy } from './tacticalSprites';

export function collectionViewEntries(e:GameEngine) {
  let list=[...collectionEntries(e.collectionTab)];
  if(e.collectionFilter==='known') list=list.filter(i=>known(e,i));
  else if(e.collectionFilter==='unknown') list=list.filter(i=>!known(e,i));
  if(e.collectionSort==='name') list.sort((a,b)=>a.name.localeCompare(b.name,'es'));
  else if(e.collectionSort==='rarity') list.sort((a,b)=>b.rarity-a.rarity||a.name.localeCompare(b.name,'es'));
  return list;
}
export function cycleCollectionFilter(e:GameEngine) {
  const values:GameEngine['collectionFilter'][]=['all','known','unknown'];
  e.collectionFilter=values[(values.indexOf(e.collectionFilter)+1)%values.length];
  e.collectionIndex=0;e.collectionScroll=0;
}
export function cycleCollectionSort(e:GameEngine) {
  const values:GameEngine['collectionSort'][]=['default','name','rarity'];
  e.collectionSort=values[(values.indexOf(e.collectionSort)+1)%values.length];
  e.collectionIndex=0;e.collectionScroll=0;
}
export function collectionMove(e:GameEngine,delta:number) {
  const list=collectionViewEntries(e);
  e.collectionIndex=Math.max(0,Math.min(list.length-1,e.collectionIndex+delta));
  const row=Math.floor(e.collectionIndex/COLLECTION.cols), top=row*(COLLECTION.cellH+COLLECTION.gap);
  if(top<e.collectionScroll) e.collectionScroll=top;
  if(top+COLLECTION.cellH>e.collectionScroll+COLLECTION.h) e.collectionScroll=top+COLLECTION.cellH-COLLECTION.h;
}
export function collectionTab(e:GameEngine,index:number) {
  const n=COLLECTION_TABS.length;
  e.collectionTab=COLLECTION_TABS[(index+n)%n].id;e.collectionIndex=0;e.collectionScroll=0;
}
export function collectionClick(e:GameEngine,x:number,y:number) {
  const tabW=68,tabGap=3,tabX=29;
  for(let i=0;i<COLLECTION_TABS.length;i++) if(inside(x,y,{x:tabX+i*(tabW+tabGap),y:57,w:tabW,h:22})) { collectionTab(e,i);return; }
  if(inside(x,y,COLLECTION_FILTER)){cycleCollectionFilter(e);return;}
  if(inside(x,y,COLLECTION_SORT)){cycleCollectionSort(e);return;}
  if(!inside(x,y,COLLECTION)) return;
  const list=collectionViewEntries(e);
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
  if(entry.category==='synergies') {
    const def=SYNERGIES.find(s=>s.id===entry.id);
    if(unknown||!def){drawItemIcon(c,x,y,'mystery',size,'#9b7bb8',true);return;}
    const sub=Math.max(12,Math.floor(size*.68));
    drawItemIcon(c,x,y+Math.floor(size*.18),def.requires[0]??'mystery',sub,'#c39be0');
    drawItemIcon(c,x+Math.floor(size*.32),y,def.requires[1]??'mystery',sub,'#8fb7c8');
    return;
  }
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
  const c=e.ui!, all=collectionEntries(e.collectionTab),list=collectionViewEntries(e),selected=list[e.collectionIndex] ?? list[0];
  const discovered=all.filter(i=>known(e,i)).length;
  const mf=e.settings.reduceMotion?0:e.frame;
  drawMenuBackdrop(c,mf,.93,'#9abf9f');
  drawMenuHeader(c,'COLECCIÓN','Todo lo que el banco ya te dejó descubrir.',mf,'#9abf9f','ARCHIVO DEL BANCO');
  text(c,'DESCUBIERTOS · '+discovered+' / '+all.length,444,63,5.8,'#91a9a6','right',true,false);
  const tabW=68,tabGap=3,tabX=29;
  COLLECTION_TABS.forEach((tab,i)=>{
    const on=tab.id===e.collectionTab,x=tabX+i*(tabW+tabGap);
    drawMenuCard(c,x,57,tabW,22,on,'#9abf9f',on?'rgba(35,47,35,.98)':'rgba(10,24,30,.9)');
    text(c,tab.name,x+tabW/2,72,5.7,on?'#eff0ce':'#9fb1ae','center',true,false);
  });
  const filterLabel=e.collectionFilter==='all'?'TODOS':e.collectionFilter==='known'?'DESCUBIERTOS':'PENDIENTES';
  const sortLabel=e.collectionSort==='default'?'ORDEN BASE':e.collectionSort==='name'?'A–Z':'RAREZA';
  drawMouseButton(c,filterLabel,COLLECTION_FILTER.x,COLLECTION_FILTER.y,COLLECTION_FILTER.w,COLLECTION_FILTER.h,inside(e.mouseX,e.mouseY,COLLECTION_FILTER),'#6c8f88');
  drawMouseButton(c,sortLabel,COLLECTION_SORT.x,COLLECTION_SORT.y,COLLECTION_SORT.w,COLLECTION_SORT.h,inside(e.mouseX,e.mouseY,COLLECTION_SORT),'#6c8f88');
  drawMouseButton(c,'CARRERA',COLLECTION_CAREER.x,COLLECTION_CAREER.y,COLLECTION_CAREER.w,COLLECTION_CAREER.h,inside(e.mouseX,e.mouseY,COLLECTION_CAREER),'#9abf9f');
  const unlocked=selected?known(e,selected):false;
  drawMenuCard(c,30,89,156,217,true,'#9abf9f','rgba(8,20,26,.96)');
  drawSectionLabel(c,'FICHA ACTIVA',42,108,'#9abf9f');
  if(selected) drawCatalogSprite(e,selected,72,101,72,!unlocked);
  else drawItemIcon(c,72,101,'mystery',72,'#6c8285',true);
  wrappedText(c,selected?(unlocked?selected.name:'???'):'SIN RESULTADOS',42,188,132,11,14,2,'#f6dfa1',true);
  text(c,selected?(unlocked?RARITY_NAMES[selected.rarity]:'POR DESCUBRIR'):'CAMBIA EL FILTRO',42,221,7,selected&&unlocked?RARITY_COLORS[selected.rarity]:'#6c8285','left');
  wrappedText(c,selected?(unlocked?selected.description:'Encuéntralo durante un atraco para revelar su ficha.'):'No hay entradas que coincidan con este filtro.',42,240,132,8,11,3,'#bdc9bc');
  wrappedText(c,selected?(unlocked?`“${selected.flavor}”`:'El banco aún guarda secretos.'):'Usa los botones de filtro para volver a mostrar entradas.',42,281,132,7,10,2,'#778f8d');
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
  if(totalH>COLLECTION.h) {
    c.fillStyle='#284149';c.fillRect(452,COLLECTION.y,3,COLLECTION.h);
    const thumbH=Math.max(32,COLLECTION.h*(COLLECTION.h/Math.max(COLLECTION.h,totalH)));
    c.fillStyle='#afad79';c.fillRect(452,COLLECTION.y+e.collectionScroll/max*(COLLECTION.h-thumbH),3,thumbH);
  }
  drawMouseButton(c,'← VOLVER',BACK_BUTTON.x,BACK_BUTTON.y,BACK_BUTTON.w,BACK_BUTTON.h,inside(e.mouseX,e.mouseY,BACK_BUTTON),'#9abf9f');
  text(c,selected?(unlocked?'FICHA DESBLOQUEADA':'POR DESCUBRIR'):'SIN RESULTADOS',452,332,4.7,'#819592','right',true,false);
}