import { ITEMS, ACTIVE_ITEMS, WEAPONS, RARITY_COLORS, RARITY_NAMES, FLAVOR, SYNERGIES } from './data';
import { FOODS } from './itemRules';
import { drawItemIcon } from './itemArt';
import { text, wrappedText } from './ui';
import type { GameEngine } from './types';

export interface TooltipTarget { id:string; x:number;y:number; action:string; header?:string;price?:number; }
export function drawCompactTooltip(engine:GameEngine,target:TooltipTarget) {
  const c=engine.ui!,weapon=WEAPONS[target.id],item=ITEMS[target.id]??ACTIVE_ITEMS[target.id]??FOODS[target.id];
  const def=weapon??item;
  if(!def) return;
  const passive=ITEMS[target.id],owned=new Set([...engine.player.items,...engine.player.weapons.filter(Boolean).map(w=>w!.id)]);
  const synergy=SYNERGIES.find(s=>s.requires.includes(target.id)&&s.requires.filter(id=>id!==target.id).every(id=>owned.has(id)));
  // 132 logical pixels = 264 CSS pixels at the normal desktop scale.
  const width=Math.min(136,292/Math.max(1,engine.scale)),x=35;
  const height=(weapon?158:118)+(synergy?13:0)+(passive?.cursed?10:0);
  const blocksLeft=engine.player.x<width+30;
  const y=blocksLeft && engine.player.y<180?180:55;
  const yy=Math.min(y,282-height);
  const color=passive?.cursed?'#ba90d5':RARITY_COLORS[def.rarity];
  c.save();
  c.fillStyle='rgba(0,0,0,.45)';c.fillRect(x+2,yy+2,width,height);
  c.fillStyle='rgba(9,20,27,.97)';c.fillRect(x,yy,width,height);
  c.fillStyle=color;c.fillRect(x,yy,3,height);
  c.strokeStyle='#3d524c';c.strokeRect(x+.5,yy+.5,width-1,height-1);
  c.fillStyle='#293c44';c.fillRect(x+3,yy,width-3,1);
  c.beginPath();c.rect(x+2,yy+2,width-4,height-4);c.clip();
  let cy=yy+11;
  if(target.header) {text(c,target.header,x+9,cy,6.5,'#d4b976','left',true);cy+=12;}
  drawItemIcon(c,x+8,cy-1,target.id,24,color);
  wrappedText(c,def.name,x+37,cy+7,width-45,8,10,2,'#efe6c5',true);
  text(c,RARITY_NAMES[def.rarity]+(passive?.cursed?' · MALDITO':passive?.stackable?' · ACUMULABLE':''),x+9,cy+36,6.2,color,'left',true);
  cy+=47;
  if(weapon) {
    for(const [label,key] of [['DAÑO','dmg'],['CADENCIA DE DISPARO','rate'],['ALCANCE','range'],['VELOCIDAD DE PROYECTIL','speed']] as const) {
      text(c,label,x+9,cy,5.6,'#a2b8b9','left');
      for(let i=0;i<5;i++) { c.fillStyle=i<weapon.bars[key]?color:'#33454a';c.fillRect(x+width-40+i*6,cy-5,4,4); }
      cy+=10;
    }
    cy+=3;
  }
  wrappedText(c,weapon?weapon.special:def.description,x+9,cy,width-18,7.3,10,passive?.cursed?3:2,'#c6cfc2');
  const flavor=def.flavor??FLAVOR[target.id]??'';
  wrappedText(c,`“${flavor}”`,x+9,cy+(passive?.cursed?34:24),width-18,6.7,9,1,'#7e9896');
  if(synergy)text(c,'◆ SINERGIA DISPONIBLE',x+9,yy+height-23,6.5,'#c4a5e3','left',true);
  text(c,target.price!==undefined?`${target.price} MIGAJAS · ${target.action}`:target.action,x+9,yy+height-8,7.2,color,'left',true);
  c.restore();
}

export function nearbyTooltip(engine:GameEngine,targets:TooltipTarget[]) {
  const near=targets.filter(t=>Math.hypot(engine.player.x+7-t.x,engine.player.y+8-t.y)<42 ||
    (Math.hypot(engine.mouseX-t.x,engine.mouseY-t.y)<18 && Math.hypot(engine.player.x-t.x,engine.player.y-t.y)<100));
  near.sort((a,b)=>Math.hypot(engine.player.x-a.x,engine.player.y-a.y)-Math.hypot(engine.player.x-b.x,engine.player.y-b.y));
  const t=near[0],key=t?`${engine.currentKey}:${t.id}:${t.x}`:'';
  if(engine.tooltip.key!==key) engine.tooltip={key,since:engine.frame};
  if(t && engine.frame-engine.tooltip.since>=10 && !engine.swap && !engine.pickupCard) drawCompactTooltip(engine,t);
}