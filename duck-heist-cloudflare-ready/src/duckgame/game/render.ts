// Renderizador en dos capas:
//  · MUNDO  → canvas de 480x352 escalado con nearest-neighbour (pixel art puro)
//  · UI     → canvas a resolución nativa con tipografía nítida
import { TILE_SIZE, ROOM_WIDTH, ROOM_HEIGHT, CANVAS_WIDTH, CANVAS_HEIGHT,
  GameState, RoomType, DIR_VECTORS, DOOR_TILE, FLOOR_THEMES, OBSTACLE_BASE, TILE_DOOR,
} from './constants';
import {
  drawDuck, drawHeart, drawSecurityPigeon, drawGuardGoose, drawToasterTurret,
  drawRollingBagel, drawProjectile, drawCoin, drawChest, drawBoss, drawDoor,
  drawParticle, drawItem, drawWeaponIcon, drawShopPigeon, drawEvilCroissant,
  drawBankerChicken, drawPoliciaPato, drawPoliciaAntidisturbios, drawPoliciaEscopeta,
  drawPoliciaRapido, drawDronPolicial, drawPedestal, drawCandle, drawObstacle,
  drawDuckSkin,
} from './sprites';
import {
  WEAPONS, ITEMS, ACTIVE_ITEMS, ENEMIES, BOSSES, MINIBOSSES, META_UPGRADES,
  RARITY_COLORS, RARITY_NAMES, TOTAL_FLOORS, SKINS,
} from './data';
import { T, FLOOR_NAMES_ES } from './i18n';
import { drawCursorPreview } from '../menu/cursorPresets';
import { translateText, getLocale } from '../localization/runtime';
import { text, titleText, drawPanel, drawButtons, drawMenuScene, drawTitleLogo, drawBar } from './ui';
import { wrappedText } from './ui';
import { activeWeapon,currentRoomOf,getContentOf,SETTING_ROWS,settingValue,shopPrice,DIFFICULTY_ORDER,DIFFICULTY_PROFILES,difficultyLabel ,updateBankProps} from './engine';
import { drawVaultScene } from './titleScene';
import { MAIN_MENU,PAUSE_MENU,WARDROBE,WARDROBE_ACTION,SETTINGS,SETTINGS_MUTE } from './layout';
import { renderFloorMap, visibleRoomKeys, ROOM_STYLE, drawRoomSymbol } from './floorMap';
import { drawItemIcon } from './itemArt';
import { getBuild, FOODS } from './itemRules';
import { renderCollection } from './collectionUI';
import { nearbyTooltip, type TooltipTarget } from './tooltips';
import { grenadeLanding,aimVector } from './aim';
import { ACTIVE_SWAP } from './layout';
import { EVENTS } from './events';
import { MODIFIER_LABELS } from './modifiers';
import { drawTacticalEnemy, SPECIAL_ENEMIES } from './tacticalSprites';
import { actionPrompt } from './gamepad';
import { drawRichTile, drawRoomAtmosphere, drawInnerWallShadow } from './roomArt';
import type { GameEngine, Enemy, RoomContent, Pedestal } from './types';

const dist = (x1: number, y1: number, x2: number, y2: number) => Math.hypot(x2 - x1, y2 - y1);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

// ===========================================================================
// CAPA DE MUNDO
// ===========================================================================
function resolveInteractableSpacing(engine:GameEngine){
  const content:any=engine.contents.get(engine.currentKey);if(!content)return;
  const found:{o:any;ox:number;oy:number;r:number}[]=[];const seen=new Set<any>();
  const add=(o:any,ox=0,oy=0,r=22)=>{if(!o||typeof o!=='object'||seen.has(o)||!Number.isFinite(o.x)||!Number.isFinite(o.y))return;seen.add(o);found.push({o,ox,oy,r});};
  // Sólo objetos que realmente requieren E. Pickups automáticos (migajas, monedas y comida) quedan fuera.
  for(const it of content.items??[])add(it,8,8);
  if(content.pedestal&&!content.pedestal.taken)add(content.pedestal,12,0,24);
  for(const ped of content.choices??[])if(!ped.taken)add(ped,12,0,24);
  for(const shop of content.shopItems??[])if(!shop.sold)add(shop,0,0);
  if(!found.length)return;
  const clampX=(x:number)=>Math.max(42,Math.min(CANVAS_WIDTH-42,x));const clampY=(y:number)=>Math.max(48,Math.min(CANVAS_HEIGHT-42,y));
  const center=(e:{o:any;ox:number;oy:number;r:number})=>({x:e.o.x+e.ox,y:e.o.y+e.oy});
  const place=(e:{o:any;ox:number;oy:number;r:number},x:number,y:number)=>{e.o.x=clampX(x)-e.ox;e.o.y=clampY(y)-e.oy;};
  const st:any=content.stairs;const hasStairs=!!st;const sx=hasStairs?st.x+16:0,sy=hasStairs?st.y+16:0;
  const keepStairsClear=()=>{if(!hasStairs)return;for(let i=0;i<found.length;i++){const e=found[i],c=center(e),dx=c.x-sx,dy=c.y-sy,d=Math.hypot(dx,dy);if(d<58){const a=d>.01?Math.atan2(dy,dx):((i*2.399963229728653)%6.283185307179586);place(e,sx+Math.cos(a)*64,sy+Math.sin(a)*60);}}};
  keepStairsClear();
  for(let pass=0;pass<6;pass++){for(let i=0;i<found.length;i++)for(let j=i+1;j<found.length;j++){const a=found[i],b=found[j],ca=center(a),cb=center(b),dx=cb.x-ca.x,dy=cb.y-ca.y,d=Math.hypot(dx,dy),need=Math.max(38,a.r+b.r);if(d<need){const ang=d>.01?Math.atan2(dy,dx):(((j+1)*1.61803398875)%6.283185307179586),push=(need-d)/2+.75,cx=Math.cos(ang)*push,cy=Math.sin(ang)*push;place(a,ca.x-cx,ca.y-cy);place(b,cb.x+cx,cb.y+cy);}}keepStairsClear();}const zones=found.map(e=>{const c=center(e);return{x:c.x,y:c.y,r:e.r+6};});const ev:any=content.event;if(ev&&!ev.used)zones.push({x:ev.x,y:ev.y,r:32});if(hasStairs)zones.push({x:sx,y:sy,r:34});if(content.bankProps?.length)content.bankProps=content.bankProps.filter((p:any)=>!zones.some(z=>z.x+z.r>p.x-6&&z.x-z.r<p.x+p.w+6&&z.y+z.r>p.y-6&&z.y-z.r<p.y+p.h+6));
}

function drawBlackMarketVan(ctx:CanvasRenderingContext2D,f:number){const x=240,y=116;ctx.save();ctx.fillStyle='rgba(0,0,0,.45)';ctx.beginPath();ctx.ellipse(x,y+45,100,14,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#05070a';ctx.fillRect(x-92,y-27,158,57);ctx.fillStyle='#0d1217';ctx.fillRect(x-83,y-36,105,11);ctx.fillRect(x+22,y-30,52,60);ctx.fillStyle='#27343d';ctx.fillRect(x+29,y-23,35,20);ctx.fillStyle='#56747f';ctx.globalAlpha=.48;ctx.fillRect(x+33,y-20,27,14);ctx.globalAlpha=1;ctx.fillStyle='#020304';ctx.fillRect(x-73,y-20,87,44);ctx.fillStyle='#171e23';ctx.fillRect(x-58,y-12,57,31);ctx.fillStyle='#d28a3c';ctx.globalAlpha=.13+.04*Math.sin(f*.06);ctx.fillRect(x-55,y-9,51,25);ctx.globalAlpha=1;ctx.fillStyle='#4a555d';for(let i=0;i<3;i++){ctx.fillRect(x-50+i*17,y-5,13,3);ctx.fillRect(x-47+i*17,y-10,7,2);}for(const wx of[x-61,x+53]){ctx.fillStyle='#020304';ctx.beginPath();ctx.arc(wx,y+32,14,0,Math.PI*2);ctx.fill();ctx.fillStyle='#47515a';ctx.beginPath();ctx.arc(wx,y+32,6,0,Math.PI*2);ctx.fill();}ctx.fillStyle='#d99a4b';ctx.fillRect(x-10,y+25,24,3);ctx.fillStyle='#d8e2e6';ctx.fillRect(x+70,y-10,5,4);ctx.fillStyle='#a52e31';ctx.fillRect(x-92,y-7,4,9);drawShopPigeon(ctx,x+83,y+2,f);ctx.restore();}
const BANK_ROOM_THEMES=[{id:'branch',wall:'#eee8dc',wallDark:'#b5aea2',trim:'#4b4a46',hi:'#fffaf0',floorA:'#d8d2c7',floorB:'#c7c0b5',floorLine:'#aaa296',metal:'#76716a',rug:'#4b4a46',propShadow:'rgba(16,20,24,.3)',luxe:false,gold:false},{id:'admin',wall:'#c4ccd0',wallDark:'#72818a',trim:'#7a633d',hi:'#edf2f2',floorA:'#9aa8af',floorB:'#7f9099',floorLine:'#c9d2d5',metal:'#b28b46',rug:'#405664',propShadow:'rgba(16,20,24,.3)',luxe:false,gold:false},{id:'security',wall:'#4d5357',wallDark:'#252b30',trim:'#9b7b43',hi:'#aeb4b6',floorA:'#353b40',floorB:'#252b30',floorLine:'#697176',metal:'#b18b45',rug:'#273038',propShadow:'rgba(16,20,24,.3)',luxe:false,gold:false},{id:'private',wall:'#d2c2a8',wallDark:'#6b4a37',trim:'#b38a4e',hi:'#f4e4c5',floorA:'#d2c2a8',floorB:'#bba98d',floorLine:'#eadcc3',metal:'#c79d52',rug:'#5d2932',propShadow:'rgba(16,20,24,.3)',luxe:true,gold:false},{id:'vault',wall:'#25221f',wallDark:'#0e1114',trim:'#c8a24a',hi:'#e7cf87',floorA:'#17191c',floorB:'#23262a',floorLine:'#4b4f53',metal:'#d0aa50',rug:'#301c23',propShadow:'rgba(16,20,24,.3)',luxe:true,gold:false},{id:'treasury',wall:'#c99b31',wallDark:'#6d4c12',trim:'#f0ce64',hi:'#fff0a0',floorA:'#d3a43a',floorB:'#b98725',floorLine:'#f0ce64',metal:'#ffe27c',rug:'#3a2108',propShadow:'rgba(16,20,24,.3)',luxe:true,gold:true}] as const;
function bankRoomTheme(floor:number){return BANK_ROOM_THEMES[Math.max(0,Math.min(5,floor))];}
function drawElegantFloor(ctx:CanvasRenderingContext2D,room:any,floor:number,f:number){const t=bankRoomTheme(floor),x=24,y=38,w=432,h=274;ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();ctx.fillStyle=t.floorA;ctx.fillRect(x,y,w,h);if(floor===0){for(let yy=y;yy<y+h;yy+=24)for(let xx=x;xx<x+w;xx+=24){const q=(((xx-x)/24+(yy-y)/24)&1);ctx.fillStyle=q?t.floorB:t.floorA;ctx.fillRect(xx+1,yy+1,22,22);ctx.fillStyle=t.floorLine;ctx.fillRect(xx,yy,24,1);ctx.fillRect(xx,yy,1,24);ctx.fillStyle='#9d9589';ctx.fillRect(xx+6,yy+7,2,1);ctx.fillRect(xx+17,yy+15,1,1);ctx.fillStyle='#eee8dc';ctx.fillRect(xx+12,yy+5,1,1);ctx.fillRect(xx+4,yy+18,2,1);}ctx.strokeStyle='#77736c';ctx.strokeRect(x+9.5,y+9.5,w-19,h-19);ctx.strokeStyle='rgba(255,250,240,.38)';ctx.strokeRect(x+12.5,y+12.5,w-25,h-25);}else if(floor===1){for(let yy=y;yy<y+h;yy+=24)for(let xx=x;xx<x+w;xx+=24){const q=(((xx-x)/24+(yy-y)/24)&1);ctx.fillStyle=q?t.floorB:t.floorA;ctx.fillRect(xx+1,yy+1,22,22);ctx.fillStyle=q?'#c8d0d2':'#77868e';ctx.fillRect(xx+5,yy+6,2,1);ctx.fillRect(xx+15,yy+15,1,1);}ctx.strokeStyle=t.metal;ctx.strokeRect(x+14.5,y+12.5,w-29,h-25);ctx.fillStyle='rgba(178,139,70,.35)';ctx.fillRect(239,y+13,2,h-26);}else if(floor===2){for(let yy=y;yy<y+h;yy+=24){const off=((yy-y)/24&1)?24:0;for(let xx=x-off;xx<x+w;xx+=48){ctx.fillStyle=(((xx+yy)/24)&1)?t.floorB:t.floorA;ctx.fillRect(xx+1,yy+1,46,22);ctx.fillStyle=t.floorLine;ctx.fillRect(xx+5,yy+5,19,1);}}ctx.strokeStyle=t.metal;ctx.lineWidth=2;ctx.strokeRect(x+14,y+13,w-28,h-26);ctx.lineWidth=1;ctx.fillStyle='#15191d';ctx.fillRect(x+20,y+20,w-40,2);ctx.fillRect(x+20,y+h-22,w-40,2);}else if(floor===3){for(let yy=y;yy<y+h;yy+=24){const off=((yy-y)/24&1)?16:0;for(let xx=x-off;xx<x+w;xx+=32){ctx.fillStyle=(((xx+yy)/16)&1)?t.floorB:t.floorA;ctx.fillRect(xx+1,yy+1,30,22);ctx.fillStyle='rgba(247,235,211,.22)';ctx.fillRect(xx+4,yy+6,18,1);ctx.fillRect(xx+12,yy+14,12,1);}}ctx.strokeStyle=t.metal;ctx.lineWidth=2;ctx.strokeRect(x+14,y+12,w-28,h-24);ctx.lineWidth=1;ctx.strokeStyle='#6d4a32';ctx.strokeRect(x+20.5,y+18.5,w-41,h-37);ctx.fillStyle=t.rug;ctx.globalAlpha=.72;ctx.fillRect(198,151,84,50);ctx.globalAlpha=1;ctx.strokeStyle='#c6a052';ctx.strokeRect(201.5,154.5,77,43);}else if(floor===4){for(let yy=y;yy<y+h;yy+=32)for(let xx=x;xx<x+w;xx+=32){ctx.fillStyle=(((xx+yy)/32)&1)?t.floorB:t.floorA;ctx.fillRect(xx+1,yy+1,30,30);ctx.fillStyle='rgba(237,230,216,.08)';ctx.fillRect(xx+5,yy+7,18,1);ctx.fillRect(xx+17,yy+16,10,1);}ctx.strokeStyle=t.metal;ctx.lineWidth=2;ctx.strokeRect(x+12,y+11,w-24,h-22);ctx.strokeRect(x+19,y+18,w-38,h-36);ctx.lineWidth=1;ctx.fillStyle='#b9903e';ctx.fillRect(239,y+20,2,h-40);ctx.fillRect(x+22,174,w-44,2);ctx.strokeStyle='#d8b65d';ctx.beginPath();ctx.arc(240,175,30,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(240,175,22,0,Math.PI*2);ctx.stroke();}else{for(let yy=y;yy<y+h;yy+=24)for(let xx=x;xx<x+w;xx+=24){const q=(((xx-x)/24+(yy-y)/24)&1);ctx.fillStyle=q?t.floorB:t.floorA;ctx.fillRect(xx+1,yy+1,22,22);ctx.fillStyle=q?'#d9b34d':'#f0ca5b';ctx.fillRect(xx+2,yy+2,20,2);ctx.fillStyle='rgba(255,248,190,.25)';ctx.fillRect(xx+5,yy+6,10,1);}ctx.fillStyle=t.rug;ctx.fillRect(x+8,y+8,w-16,6);ctx.fillRect(x+8,y+h-14,w-16,6);ctx.fillRect(x+8,y+14,6,h-28);ctx.fillRect(x+w-14,y+14,6,h-28);ctx.strokeStyle=t.hi;ctx.lineWidth=2;ctx.strokeRect(x+17,y+16,w-34,h-32);ctx.lineWidth=1;ctx.strokeRect(x+24.5,y+23.5,w-49,h-47);ctx.fillStyle='#7a5718';ctx.fillRect(239,y+24,2,h-48);ctx.fillRect(x+26,174,w-52,2);ctx.save();ctx.translate(240,175);ctx.rotate(Math.PI/4);ctx.fillStyle='#6d4c12';ctx.fillRect(-23,-23,46,46);ctx.strokeStyle='#ffe68a';ctx.strokeRect(-19.5,-19.5,39,39);ctx.fillStyle='#d6ac3d';ctx.fillRect(-12,-12,24,24);ctx.restore();}ctx.restore();}
function bankWallSegments(ctx:CanvasRenderingContext2D,floor:number){const t=bankRoomTheme(floor),shell=[[0,0,210,42],[270,0,210,42],[0,304,210,56],[270,304,210,56],[0,42,34,108],[0,202,34,102],[446,42,34,108],[446,202,34,102]];ctx.fillStyle=t.wallDark;for(const r of shell)ctx.fillRect(r[0],r[1],r[2],r[3]);ctx.fillStyle=t.wall;ctx.fillRect(18,22,192,20);ctx.fillRect(270,22,192,20);ctx.fillRect(18,304,192,18);ctx.fillRect(270,304,192,18);ctx.fillRect(16,42,18,108);ctx.fillRect(16,202,18,102);ctx.fillRect(446,42,18,108);ctx.fillRect(446,202,18,102);ctx.fillStyle=t.trim;ctx.fillRect(20,39,188,4);ctx.fillRect(272,39,188,4);ctx.fillRect(20,302,188,4);ctx.fillRect(272,302,188,4);ctx.fillRect(31,44,4,104);ctx.fillRect(31,204,4,98);ctx.fillRect(445,44,4,104);ctx.fillRect(445,204,4,98);ctx.fillStyle=t.hi;ctx.fillRect(24,25,180,2);ctx.fillRect(276,25,180,2);ctx.fillRect(24,309,180,2);ctx.fillRect(276,309,180,2);if(floor===0){ctx.fillStyle='#c8c1b5';for(const xx of[52,100,148,300,348,396]){ctx.fillRect(xx,28,1,10);ctx.fillRect(xx,308,1,9);}ctx.fillStyle='#77736b';ctx.fillRect(20,36,188,3);ctx.fillRect(272,36,188,3);ctx.fillRect(29,44,2,104);ctx.fillRect(449,44,2,104);ctx.fillStyle='#f7f1e6';ctx.fillRect(24,28,180,1);ctx.fillRect(276,28,180,1);}else if(floor===1){ctx.fillStyle='#81724f';for(const xx of[48,92,136,180,300,344,388,432]){ctx.fillRect(xx,27,2,11);ctx.fillRect(xx,308,2,10);}ctx.fillStyle='#9ca8ad';for(const yy of[62,94,126,218,250,282]){ctx.fillRect(20,yy,10,2);ctx.fillRect(450,yy,10,2);}ctx.fillStyle='#b28b46';ctx.fillRect(20,32,188,2);ctx.fillRect(272,32,188,2);}else if(floor===2){ctx.fillStyle='#151a1e';for(const xx of[44,84,124,164,304,344,384,424]){ctx.fillRect(xx,27,24,9);ctx.fillRect(xx,309,24,8);}ctx.fillStyle=t.metal;for(const xx of[44,84,124,164,304,344,384,424]){ctx.fillRect(xx,27,1,9);ctx.fillRect(xx+23,27,1,9);}for(const yy of[62,92,122,222,252,282]){ctx.fillRect(21,yy,9,1);ctx.fillRect(450,yy,9,1);}}else if(floor===3){ctx.fillStyle='#6a4735';for(const xx of[42,86,130,174,298,342,386,430]){ctx.fillRect(xx,28,32,10);ctx.fillRect(xx,308,32,9);}ctx.fillStyle=t.metal;for(const xx of[42,86,130,174,298,342,386,430])ctx.fillRect(xx,27,2,11);ctx.fillStyle='#f0dfbd';ctx.fillRect(20,28,188,2);ctx.fillRect(272,28,188,2);ctx.fillStyle='#7c5139';for(const yy of[54,84,114,232,262,292]){ctx.fillRect(20,yy,10,18);ctx.fillRect(450,yy,10,18);}}else if(floor===4){ctx.fillStyle='#0b0e10';for(const xx of[40,78,116,154,304,342,380,418]){ctx.fillRect(xx,26,28,11);ctx.fillRect(xx,308,28,10);ctx.strokeStyle=t.metal;ctx.strokeRect(xx+.5,26.5,27,10);}ctx.fillStyle=t.metal;for(const xx of[40,78,116,154,304,342,380,418])ctx.fillRect(xx+13,28,2,7);for(const yy of[56,90,124,220,254,288]){ctx.fillRect(20,yy,10,3);ctx.fillRect(450,yy,10,3);}}else{ctx.fillStyle='#8d671d';for(const xx of[38,76,114,152,304,342,380,418]){ctx.fillRect(xx,26,30,12);ctx.strokeStyle=t.hi;ctx.strokeRect(xx+.5,26.5,29,11);ctx.fillStyle='#6b4a12';ctx.fillRect(xx+4,30,22,4);ctx.fillStyle='#8d671d';}ctx.fillStyle=t.hi;ctx.fillRect(20,31,188,3);ctx.fillRect(272,31,188,3);for(const yy of[54,88,122,220,254,288]){ctx.fillStyle='#6d4c12';ctx.fillRect(20,yy,10,22);ctx.fillRect(450,yy,10,22);ctx.strokeStyle=t.hi;ctx.strokeRect(20.5,yy+.5,9,21);ctx.strokeRect(450.5,yy+.5,9,21);}for(const xx of[48,84,396,432]){ctx.fillStyle='#f3cf62';ctx.fillRect(xx,46,3,248);ctx.fillStyle='#fff2a1';ctx.fillRect(xx+1,48,1,244);}}}
function bankSecretCardinal(engine:any,room:any,d:string){const v:any={N:{x:0,y:-1},S:{x:0,y:1},W:{x:-1,y:0},E:{x:1,y:0}}[d];if(!v)return false;const target=engine.map.rooms.get((room.gx+v.x)+','+(room.gy+v.y));return !!target&&target.type===RoomType.TREASURE&&!(room.doors??[]).includes(d);}
function drawBankSecretCracks(ctx:CanvasRenderingContext2D,d:string,floor:number){const t=bankRoomTheme(floor),c=floor>=4?t.wallDark:floor===2?'#171c20':'#645c53',h=t.hi;ctx.save();ctx.fillStyle=c;if(d==='N'){ctx.fillRect(239,27,2,5);ctx.fillRect(237,31,3,2);ctx.fillRect(235,33,2,4);ctx.fillRect(241,32,2,4);ctx.fillRect(243,35,3,2);ctx.fillRect(233,36,3,2);}else if(d==='S'){ctx.fillRect(239,305,2,5);ctx.fillRect(237,309,3,2);ctx.fillRect(235,311,2,4);ctx.fillRect(241,310,2,4);ctx.fillRect(243,313,3,2);ctx.fillRect(233,314,3,2);}else if(d==='W'){ctx.fillRect(27,175,5,2);ctx.fillRect(25,173,3,2);ctx.fillRect(23,170,2,4);ctx.fillRect(25,177,3,2);ctx.fillRect(22,179,4,2);ctx.fillRect(29,171,2,4);}else{ctx.fillRect(448,175,5,2);ctx.fillRect(452,173,3,2);ctx.fillRect(455,170,2,4);ctx.fillRect(452,177,3,2);ctx.fillRect(454,179,4,2);ctx.fillRect(449,171,2,4);}ctx.globalAlpha=.34;ctx.fillStyle=h;if(d==='N')ctx.fillRect(241,27,1,4);else if(d==='S')ctx.fillRect(241,305,1,4);else if(d==='W')ctx.fillRect(27,177,4,1);else ctx.fillRect(449,177,4,1);ctx.restore();}
function drawBankSealedCardinal(ctx:CanvasRenderingContext2D,d:string,floor:number,secret:boolean){const t=bankRoomTheme(floor);ctx.save();ctx.fillStyle=t.wallDark;if(d==='N')ctx.fillRect(210,0,60,42);else if(d==='S')ctx.fillRect(210,304,60,56);else if(d==='W')ctx.fillRect(0,150,34,52);else ctx.fillRect(446,150,34,52);ctx.fillStyle=t.wall;if(d==='N')ctx.fillRect(210,22,60,20);else if(d==='S')ctx.fillRect(210,304,60,18);else if(d==='W')ctx.fillRect(16,150,18,52);else ctx.fillRect(446,150,18,52);ctx.fillStyle=t.trim;if(d==='N')ctx.fillRect(210,39,60,4);else if(d==='S')ctx.fillRect(210,302,60,4);else if(d==='W')ctx.fillRect(31,150,4,52);else ctx.fillRect(445,150,4,52);ctx.fillStyle=t.hi;if(d==='N')ctx.fillRect(214,25,52,2);else if(d==='S')ctx.fillRect(214,309,52,2);else if(d==='W')ctx.fillRect(20,154,2,44);else ctx.fillRect(458,154,2,44);ctx.fillStyle=t.metal;if(d==='N'||d==='S'){const yy=d==='N'?29:311;ctx.fillRect(224,yy,1,7);ctx.fillRect(255,yy,1,7);}else{const xx=d==='W'?24:455;ctx.fillRect(xx,162,6,1);ctx.fillRect(xx,189,6,1);}if(floor>=3){ctx.globalAlpha=.45;ctx.fillStyle=t.metal;if(d==='N'||d==='S')ctx.fillRect(232,d==='N'?34:307,16,1);else ctx.fillRect(d==='W'?28:451,168,1,16);}ctx.restore();if(secret)drawBankSecretCracks(ctx,d,floor);}
function drawBankClosedCardinals(ctx:CanvasRenderingContext2D,room:any,floor:number,engine:any){const doors:any[]=room.doors??[];for(const d of ['N','S','W','E'])if(!doors.includes(d))drawBankSealedCardinal(ctx,d,floor,bankSecretCardinal(engine,room,d));}
function bankDoorTypeAccent(style:string,t:any){return style==='boss'?'#d34b52':style==='gold'?'#f4d03f':style==='green'?'#53d78d':style==='orange'?'#ed9b48':style==='purple'?'#b58ade':t.metal;}
function drawBankDoorSurround(ctx:CanvasRenderingContext2D,x:number,y:number,d:string,floor:number){const t=bankRoomTheme(floor),h=d==='N'||d==='S';ctx.save();ctx.fillStyle=t.wallDark;if(h){ctx.fillRect(x-10,y-6,10,44);ctx.fillRect(x+32,y-6,10,44);ctx.fillRect(x-10,d==='N'?y-6:y+32,52,6);}else{ctx.fillRect(x-6,y-10,44,10);ctx.fillRect(x-6,y+32,44,10);ctx.fillRect(d==='W'?x-6:x+32,y-10,6,52);}ctx.fillStyle=t.wall;if(h){ctx.fillRect(x-7,y-3,7,38);ctx.fillRect(x+32,y-3,7,38);}else{ctx.fillRect(x-3,y-7,38,7);ctx.fillRect(x-3,y+32,38,7);}ctx.fillStyle=t.trim;if(h){ctx.fillRect(x-4,y-2,2,36);ctx.fillRect(x+34,y-2,2,36);}else{ctx.fillRect(x-2,y-4,36,2);ctx.fillRect(x-2,y+34,36,2);}ctx.fillStyle=t.hi;if(h){ctx.fillRect(x-7,d==='N'?y-3:y+35,46,1);}else{ctx.fillRect(d==='W'?x-3:x+35,y-7,1,46);}if(floor===0){ctx.fillStyle='#c8c1b5';if(h){ctx.fillRect(x-9,y+5,2,10);ctx.fillRect(x+39,y+17,2,10);}else{ctx.fillRect(x+5,y-9,10,2);ctx.fillRect(x+17,y+39,10,2);}}else if(floor===1){ctx.fillStyle=t.metal;if(h){ctx.fillRect(x-8,y+7,2,20);ctx.fillRect(x+38,y+7,2,20);}else{ctx.fillRect(x+7,y-8,20,2);ctx.fillRect(x+7,y+38,20,2);}}else if(floor===2){ctx.fillStyle='#151a1e';if(h){ctx.fillRect(x-9,y+6,3,22);ctx.fillRect(x+38,y+6,3,22);}else{ctx.fillRect(x+6,y-9,22,3);ctx.fillRect(x+6,y+38,22,3);}ctx.fillStyle=t.metal;if(h){ctx.fillRect(x-8,y+9,1,16);ctx.fillRect(x+39,y+9,1,16);}else{ctx.fillRect(x+9,y-8,16,1);ctx.fillRect(x+9,y+39,16,1);}}else if(floor===3){ctx.fillStyle='#6a4735';if(h){ctx.fillRect(x-9,y+4,3,26);ctx.fillRect(x+38,y+4,3,26);}else{ctx.fillRect(x+4,y-9,26,3);ctx.fillRect(x+4,y+38,26,3);}ctx.fillStyle=t.metal;if(h){ctx.fillRect(x-8,y+6,1,22);ctx.fillRect(x+39,y+6,1,22);}else{ctx.fillRect(x+6,y-8,22,1);ctx.fillRect(x+6,y+39,22,1);}}else if(floor===4){ctx.fillStyle='#0b0e10';if(h){ctx.fillRect(x-9,y+3,4,28);ctx.fillRect(x+37,y+3,4,28);}else{ctx.fillRect(x+3,y-9,28,4);ctx.fillRect(x+3,y+37,28,4);}ctx.fillStyle=t.metal;if(h){ctx.fillRect(x-7,y+5,1,24);ctx.fillRect(x+38,y+5,1,24);}else{ctx.fillRect(x+5,y-7,24,1);ctx.fillRect(x+5,y+38,24,1);}}else{ctx.fillStyle='#6d4c12';if(h){ctx.fillRect(x-9,y+2,4,30);ctx.fillRect(x+37,y+2,4,30);}else{ctx.fillRect(x+2,y-9,30,4);ctx.fillRect(x+2,y+37,30,4);}ctx.fillStyle=t.hi;if(h){ctx.fillRect(x-7,y+4,2,26);ctx.fillRect(x+37,y+4,2,26);}else{ctx.fillRect(x+4,y-7,26,2);ctx.fillRect(x+4,y+37,26,2);}}ctx.restore();}
function drawBankDoorTrim(ctx:CanvasRenderingContext2D,x:number,y:number,d:string,floor:number,style:string){const t=bankRoomTheme(floor),a=bankDoorTypeAccent(style,t),h=d==='N'||d==='S';ctx.save();ctx.fillStyle=t.trim;if(h){ctx.fillRect(x-2,y,2,32);ctx.fillRect(x+32,y,2,32);}else{ctx.fillRect(x,y-2,32,2);ctx.fillRect(x,y+32,32,2);}ctx.fillStyle=t.hi;ctx.globalAlpha=.7;if(h)ctx.fillRect(x+1,d==='N'?y:y+31,30,1);else ctx.fillRect(d==='W'?x:x+31,y+1,1,30);ctx.globalAlpha=1;ctx.fillStyle=a;if(h)ctx.fillRect(x+7,d==='N'?y+28:y+2,18,2);else ctx.fillRect(d==='W'?x+28:x+2,y+7,2,18);if(style==='boss'){ctx.globalAlpha=.35;ctx.fillStyle=a;if(h){ctx.fillRect(x+3,y+4,3,3);ctx.fillRect(x+26,y+4,3,3);}else{ctx.fillRect(x+4,y+3,3,3);ctx.fillRect(x+4,y+26,3,3);}}ctx.restore();}
function bankPainting(ctx:CanvasRenderingContext2D,x:number,y:number,floor:number,variant:number){const t=bankRoomTheme(floor),gold=floor>=4;ctx.fillStyle=gold?t.metal:'#76583e';ctx.fillRect(x-15,y-10,30,20);ctx.fillStyle=gold?'#4a2b1b':'#2a3941';ctx.fillRect(x-11,y-7,22,14);ctx.fillStyle=variant%2?'#71313d':'#31556a';ctx.fillRect(x-8,y-5,16,10);ctx.fillStyle=gold?t.hi:'#d6c29b';ctx.fillRect(x-4,y-2,8,2);ctx.fillRect(x-13,y-8,26,1);}
function drawLayoutAccent(ctx:CanvasRenderingContext2D,content:any,floor:number){const id=String(content.bankLayout??'');ctx.save();ctx.globalAlpha=.32;if(id.includes('lobby')||id.includes('teller')||id.includes('waiting')){ctx.strokeStyle=floor===0?'#747b81':'#a7c0c7';ctx.setLineDash([4,5]);for(const y of[160,184]){ctx.beginPath();ctx.moveTo(154,y);ctx.lineTo(326,y);ctx.stroke();}ctx.setLineDash([]);}else if(id.includes('meeting')||id.includes('boardroom')){ctx.fillStyle=floor>=3?'#553a35':'#273b47';ctx.fillRect(191,147,98,62);ctx.strokeStyle=floor>=3?'#c6a04c':'#718897';ctx.strokeRect(194.5,150.5,91,55);}else if(id.includes('security')||id.includes('checkpoint')){ctx.fillStyle='#1b2b34';ctx.fillRect(208,82,64,4);ctx.fillStyle='#5bb5cd';ctx.fillRect(216,83,48,1);}else if(id.includes('gallery')||id.includes('executive')||id.includes('client_lounge')){ctx.fillStyle=floor>=4?'#3d2028':'#675143';ctx.fillRect(196,150,88,54);ctx.strokeStyle='#c7a558';ctx.strokeRect(199.5,153.5,81,47);}else if(id.includes('vault')||id.includes('reserve')||id.includes('bullion')||id.includes('treasury')){ctx.strokeStyle=floor===5?'#f0d56b':'#b78b36';ctx.lineWidth=2;ctx.strokeRect(214,150,52,52);ctx.lineWidth=1;ctx.beginPath();ctx.arc(240,176,14,0,Math.PI*2);ctx.stroke();}ctx.restore();}
function worldDecor(ctx:CanvasRenderingContext2D,room:any,content:any,f:number,floor:number,engine:any){ctx.save();const t=bankRoomTheme(floor);bankWallSegments(ctx,floor);drawBankClosedCardinals(ctx,room,floor,engine);if(floor>=3){bankPainting(ctx,122,32,floor,0);bankPainting(ctx,358,32,floor,1);if(floor>=4){bankPainting(ctx,122,313,floor,1);bankPainting(ctx,358,313,floor,0);}if(floor===5){for(const x of[60,96,384,420]){ctx.fillStyle='rgba(255,229,126,.26)';ctx.fillRect(x,47,2,246);ctx.fillStyle='rgba(255,249,194,.28)';ctx.fillRect(x+1,50,1,240);}for(const [x,y] of [[71,63],[409,63],[71,279],[409,279]]){ctx.fillStyle='#7fe8f4';ctx.fillRect(x-2,y-2,4,4);ctx.fillStyle='#e9ffff';ctx.fillRect(x-1,y-3,2,2);}}}drawLayoutAccent(ctx,content,floor);if(room.type===RoomType.BOSS){ctx.strokeStyle=room.cleared?'#f4d03f':'#9e3037';ctx.globalAlpha=.42;ctx.lineWidth=2;ctx.strokeRect(79,67,322,218);for(const[x,y]of[[92,84],[388,84],[92,276],[388,276]]){ctx.fillStyle=room.cleared?'#f4d03f':'#cb3e44';ctx.fillRect(x-5,y-16,10,3);}}ctx.restore();}
function bankPropBase(ctx:CanvasRenderingContext2D,p:any,base:string,hi:string){ctx.fillStyle='rgba(0,0,0,.28)';ctx.fillRect(p.baseX+1,p.baseY+p.baseH-1,p.baseW,3);ctx.fillStyle=base;ctx.fillRect(p.x,p.y,p.w,p.h);ctx.fillStyle=hi;ctx.fillRect(p.x+2,p.y+2,Math.max(2,p.w-4),2);}
function drawBankPropSprite(ctx:CanvasRenderingContext2D,p:any,f:number,floor:number){const t=bankRoomTheme(floor),x=p.x,y=p.y,w=p.w,h=p.h,luxe=t.luxe,gold=t.gold;if(p.broken){ctx.fillStyle=(gold&&(p.kind==='gold_pile'||p.kind==='gold_cart'||p.kind==='statue'||p.kind==='column'))?'#b58a2f':p.hardness>=1.3?'#66717a':'#76543d';ctx.fillRect(x+2,y+h-4,5,3);ctx.fillRect(x+w-8,y+h-2,6,2);ctx.fillRect(x+w/2-2,y+h-6,4,3);return;}ctx.save();switch(p.kind){case'plant':ctx.fillStyle='#315d3b';ctx.fillRect(x+w/2-2,y+7,4,13);ctx.fillRect(x+1,y+5,8,6);ctx.fillRect(x+w-9,y+2,8,7);ctx.fillStyle='#497b4d';ctx.fillRect(x+3,y+6,5,2);ctx.fillRect(x+w-8,y+4,5,2);ctx.fillStyle=luxe?'#8b6b43':'#80543b';ctx.fillRect(x+2,y+18,w-4,10);ctx.fillStyle=luxe?'#c19a5f':'#a2724d';ctx.fillRect(x+3,y+19,w-6,2);break;case'vase':ctx.fillStyle=luxe?'#75613f':'#315064';ctx.fillRect(x+2,y+5,w-4,h-5);ctx.fillStyle=luxe?'#d7b865':'#7da0ac';ctx.fillRect(x+3,y+2,w-6,4);ctx.fillRect(x+1,y+9,w-2,6);break;case'trash':bankPropBase(ctx,p,'#39434a','#66747d');ctx.fillStyle='#20282e';ctx.fillRect(x-1,y+2,w+2,3);break;case'chair':ctx.fillStyle=luxe?'#553d34':'#4d5964';ctx.fillRect(x+2,y+3,w-4,9);ctx.fillRect(x+3,y+12,3,10);ctx.fillRect(x+w-6,y+12,3,10);ctx.fillStyle=luxe?'#9d765a':'#75828c';ctx.fillRect(x+3,y+4,w-6,2);break;case'archive':bankPropBase(ctx,p,'#956c45','#c39765');ctx.fillStyle='#d9d2bd';ctx.fillRect(x+3,y+5,w-6,3);ctx.fillRect(x+3,y+12,w-6,2);break;case'desk':bankPropBase(ctx,p,luxe?'#4b352d':'#55463c',luxe?'#ad865e':'#8d7865');ctx.fillStyle='#252e36';ctx.fillRect(x+6,y+6,w-12,8);ctx.fillStyle=luxe?'#d2b26b':'#7193a0';ctx.fillRect(x+9,y+7,w-18,4);ctx.fillStyle='#7d8790';ctx.fillRect(x+5,y+17,4,7);ctx.fillRect(x+w-9,y+17,4,7);break;case'filing':bankPropBase(ctx,p,luxe?'#4f4b47':'#4d5963',luxe?'#a6967d':'#7e8b94');for(let i=0;i<4;i++){ctx.fillStyle='#2d353c';ctx.fillRect(x+3,y+5+i*6,w-6,4);ctx.fillStyle=luxe?'#d2ad55':'#aab2b6';ctx.fillRect(x+w/2-2,y+6+i*6,4,1);}break;case'copier':bankPropBase(ctx,p,'#59636b','#a4adb2');ctx.fillStyle='#20282e';ctx.fillRect(x+4,y+7,w-8,7);ctx.fillStyle='#bfd0d3';ctx.fillRect(x+6,y+4,w-12,3);break;case'counter':bankPropBase(ctx,p,luxe?'#49342d':'#4c4240',luxe?'#a77b52':'#8e7768');ctx.fillStyle=luxe?'#d3b05d':'#c6a15e';ctx.fillRect(x,y+1,w,3);ctx.fillStyle='#29343c';ctx.fillRect(x+6,y+8,w-12,7);break;case'bench':ctx.fillStyle=luxe?'#4f392f':'#5a493b';ctx.fillRect(x,y+4,w,7);ctx.fillStyle=luxe?'#9a7658':'#8b735d';ctx.fillRect(x+2,y+4,w-4,2);ctx.fillStyle='#3e4549';ctx.fillRect(x+4,y+11,3,6);ctx.fillRect(x+w-7,y+11,3,6);break;case'vending':bankPropBase(ctx,p,'#343e4a','#788593');ctx.fillStyle='#18232e';ctx.fillRect(x+3,y+5,w-6,15);ctx.fillStyle='#eab14a';for(let yy=y+7;yy<y+19;yy+=4)for(let xx=x+5;xx<x+w-4;xx+=5)ctx.fillRect(xx,yy,2,2);ctx.fillStyle='#c74c4c';ctx.fillRect(x+4,y+23,w-8,6);break;case'water':ctx.fillStyle='#c3dce1';ctx.fillRect(x+3,y+1,w-6,10);ctx.fillStyle='#738e98';ctx.fillRect(x+2,y+11,w-4,h-11);ctx.fillStyle='#73c4d7';ctx.fillRect(x+4,y+3,w-8,5);break;case'server':bankPropBase(ctx,p,'#202a32','#52616c');for(let yy=y+5;yy<y+h-4;yy+=5){ctx.fillStyle='#0f151a';ctx.fillRect(x+3,yy,w-6,3);ctx.fillStyle=(yy/5|0)%2?'#58b8d3':'#86d05c';ctx.fillRect(x+w-5,yy+1,1,1);}break;case'crate':bankPropBase(ctx,p,'#8b603f','#c09462');ctx.fillStyle='#5f402c';ctx.fillRect(x+3,y+3,3,h-6);ctx.fillRect(x+w-6,y+3,3,h-6);ctx.fillRect(x+4,y+h/2-1,w-8,2);break;case'bread_rack':bankPropBase(ctx,p,'#645244','#9b8067');for(let yy=y+5;yy<y+h-4;yy+=6){ctx.fillStyle='#e0ad62';ctx.fillRect(x+3,yy,w-6,3);ctx.fillStyle='#f0ca84';ctx.fillRect(x+5,yy,w-10,1);}break;case'prep':bankPropBase(ctx,p,'#616b70','#b3bdc0');ctx.fillStyle='#d4dde0';ctx.fillRect(x,y+2,w,4);ctx.fillStyle='#424b50';ctx.fillRect(x+5,y+15,4,7);ctx.fillRect(x+w-9,y+15,4,7);break;case'safe':bankPropBase(ctx,p,gold?'#5f491d':'#313b42',gold?'#d0aa43':'#707d84');ctx.fillStyle=gold?'#2c261a':'#151b20';ctx.fillRect(x+5,y+5,w-10,h-10);ctx.strokeStyle=gold?'#e8cb68':'#929da2';ctx.strokeRect(x+7.5,y+7.5,w-15,h-15);ctx.fillStyle='#d5b454';ctx.fillRect(x+w/2-2,y+h/2-2,4,4);break;case'gold_pile':ctx.fillStyle='#7d5b16';ctx.fillRect(x,y+7,w,h-7);ctx.fillStyle=gold?'#e5bf42':'#d9aa29';for(let yy=y+4;yy<y+h-2;yy+=5)for(let xx=x+2+(yy%3);xx<x+w-5;xx+=8)ctx.fillRect(xx,yy,7,4);ctx.fillStyle='#ffe477';ctx.fillRect(x+4,y+5,8,2);break;case'diamond_case':bankPropBase(ctx,p,gold?'#72571f':'#4e5960',gold?'#d4b44e':'#87969c');ctx.fillStyle='rgba(102,210,232,.42)';ctx.fillRect(x+3,y+3,w-6,13);ctx.fillStyle='#78e7f3';ctx.fillRect(x+w/2-3,y+7,6,6);ctx.fillStyle='#e7ffff';ctx.fillRect(x+w/2-1,y+5,2,4);break;case'money_bag':ctx.fillStyle='#77533a';ctx.fillRect(x+4,y+2,w-8,4);ctx.fillStyle='#a7794d';ctx.fillRect(x+1,y+6,w-2,h-6);ctx.fillStyle='#e6c96c';ctx.fillRect(x+w/2-2,y+10,4,5);ctx.fillStyle='#fff0a0';ctx.fillRect(x+w/2-1,y+11,2,3);break;case'cubicle':ctx.fillStyle=luxe?'#59493c':'#344451';ctx.fillRect(x,y+2,w,7);ctx.fillRect(x,y+2,6,h-5);ctx.fillStyle=luxe?'#a88762':'#73838f';ctx.fillRect(x+2,y+3,w-4,2);ctx.fillRect(x+2,y+4,2,h-9);ctx.fillStyle=luxe?'#4d362f':'#57483d';ctx.fillRect(x+8,y+16,w-12,9);ctx.fillStyle=luxe?'#b28761':'#8a715b';ctx.fillRect(x+10,y+17,w-16,2);ctx.fillStyle='#17242d';ctx.fillRect(x+16,y+8,15,9);ctx.fillStyle='#6ca4b4';ctx.fillRect(x+18,y+10,11,5);ctx.fillStyle='#4d5964';ctx.fillRect(x+w-17,y+24,13,6);ctx.fillStyle='#ddd0ae';ctx.fillRect(x+10,y+13,5,2);break;case'divider':ctx.fillStyle=luxe?'#5a4a40':'#3f4d59';ctx.fillRect(x,y+2,w,h-5);ctx.fillStyle=luxe?'#a38564':'#748592';ctx.fillRect(x+2,y+3,w-4,3);ctx.fillStyle='#27333c';ctx.fillRect(x+3,y+8,w-6,h-12);break;case'atm':bankPropBase(ctx,p,'#2d3942','#7f919b');ctx.fillStyle='#111a20';ctx.fillRect(x+4,y+5,w-8,10);ctx.fillStyle='#64a7b8';ctx.fillRect(x+7,y+7,w-14,5);ctx.fillStyle='#d8b755';ctx.fillRect(x+7,y+19,w-14,2);ctx.fillStyle='#59666d';ctx.fillRect(x+6,y+23,w-12,4);break;case'teller':bankPropBase(ctx,p,luxe?'#49352e':'#56616a',luxe?'#c3a15e':'#8999a1');ctx.fillStyle=luxe?'#d0ad58':'#d4d7d5';ctx.fillRect(x,y+1,w,3);ctx.fillStyle='#1d282f';ctx.fillRect(x+7,y+8,w-14,7);ctx.fillStyle='#b88732';ctx.fillRect(x+w/2-2,y+4,4,3);break;case'queue':ctx.fillStyle='#4c565d';ctx.fillRect(x+5,y+4,2,h-5);ctx.fillRect(x+2,y+h-3,8,3);ctx.fillStyle=luxe?'#d0ad58':'#8ea0a7';ctx.fillRect(x+3,y+2,6,4);ctx.fillRect(x+6,y+6,6,2);break;case'meeting':bankPropBase(ctx,p,luxe?'#49362e':'#4d5660',luxe?'#b98b5f':'#7f909a');ctx.fillStyle=luxe?'#c4a15c':'#93a0a7';ctx.fillRect(x+4,y+3,w-8,4);ctx.fillStyle='#30383e';for(const xx of[x+7,x+w-10]){ctx.fillRect(xx,y+h-5,3,5);}break;case'lounge':ctx.fillStyle=luxe?'#54352f':'#46535d';ctx.fillRect(x+2,y+7,w-4,12);ctx.fillStyle=luxe?'#8a5c50':'#72828d';ctx.fillRect(x+4,y+4,w-8,8);ctx.fillStyle=luxe?'#c09a77':'#9cabb2';ctx.fillRect(x+6,y+6,w-12,2);ctx.fillStyle='#343c41';ctx.fillRect(x+5,y+19,4,3);ctx.fillRect(x+w-9,y+19,4,3);break;case'security_console':bankPropBase(ctx,p,'#202c34','#536772');ctx.fillStyle='#0d171d';ctx.fillRect(x+5,y+5,w-10,10);ctx.fillStyle='#5db6cf';ctx.fillRect(x+8,y+7,10,5);ctx.fillRect(x+22,y+7,11,5);ctx.fillStyle='#d1a642';ctx.fillRect(x+7,y+18,w-14,2);break;case'locker':bankPropBase(ctx,p,'#3c474f','#72818a');for(let yy=y+5;yy<y+h-4;yy+=7){ctx.fillStyle='#202930';ctx.fillRect(x+3,yy,w-6,5);ctx.fillStyle='#a6b0b5';ctx.fillRect(x+w-6,yy+2,2,1);}break;case'cash_cart':ctx.fillStyle='#58636a';ctx.fillRect(x+1,y+9,w-2,9);ctx.fillStyle='#a5b0b5';ctx.fillRect(x+3,y+7,w-6,3);ctx.fillStyle='#4e7c54';for(let i=0;i<3;i++)ctx.fillRect(x+5+i*7,y+4,6,4);ctx.fillStyle='#1c252a';ctx.fillRect(x+4,y+18,4,4);ctx.fillRect(x+w-8,y+18,4,4);break;case'gold_cart':ctx.fillStyle='#6b5420';ctx.fillRect(x+1,y+9,w-2,10);ctx.fillStyle='#d4ad3d';ctx.fillRect(x+3,y+7,w-6,3);for(let i=0;i<3;i++){ctx.fillStyle='#e7c14e';ctx.fillRect(x+4+i*8,y+3,7,5);ctx.fillStyle='#ffe783';ctx.fillRect(x+5+i*8,y+3,4,1);}ctx.fillStyle='#24282b';ctx.fillRect(x+4,y+19,4,4);ctx.fillRect(x+w-8,y+19,4,4);break;case'statue':ctx.fillStyle=gold?'#c99d2f':'#7d756b';ctx.fillRect(x+5,y+4,10,14);ctx.fillRect(x+3,y+16,14,9);ctx.fillStyle=gold?'#f0cf62':'#a79e91';ctx.fillRect(x+7,y+2,6,5);ctx.fillRect(x+6,y+8,8,2);ctx.fillStyle=gold?'#6f5319':'#494641';ctx.fillRect(x+2,y+25,16,7);break;case'art':ctx.fillStyle=luxe?'#c7a34d':'#6c5946';ctx.fillRect(x+2,y+2,w-4,h-8);ctx.fillStyle=floor>=4?'#55232c':'#294958';ctx.fillRect(x+5,y+5,w-10,h-14);ctx.fillStyle='#d9bd6b';ctx.fillRect(x+w/2-4,y+10,8,3);ctx.fillStyle='#4b4137';ctx.fillRect(x+5,y+h-6,3,6);ctx.fillRect(x+w-8,y+h-6,3,6);break;case'column':ctx.fillStyle=gold?'#a77c25':'#75716a';ctx.fillRect(x+4,y+4,w-8,h-8);ctx.fillStyle=gold?'#e0bd4d':'#a7a299';ctx.fillRect(x+2,y+2,w-4,5);ctx.fillRect(x+1,y+h-6,w-2,5);ctx.fillStyle=gold?'#f4da72':'#c3beb3';ctx.fillRect(x+6,y+7,2,h-15);break;case'terminal':bankPropBase(ctx,p,'#2a343b','#65747d');ctx.fillStyle='#10191e';ctx.fillRect(x+4,y+4,w-8,11);ctx.fillStyle='#62b6c9';ctx.fillRect(x+6,y+6,w-12,6);ctx.fillStyle='#9da8ad';ctx.fillRect(x+6,y+19,w-12,3);break;case'bookcase':bankPropBase(ctx,p,luxe?'#49362f':'#59463a',luxe?'#9c7656':'#8b705b');for(let yy=y+5;yy<y+h-5;yy+=7){ctx.fillStyle='#2f2925';ctx.fillRect(x+3,yy,w-6,5);for(let xx=x+5;xx<x+w-5;xx+=5){ctx.fillStyle=((xx+yy)&1)?'#8d3c38':'#455d73';ctx.fillRect(xx,yy-2,3,5);}}break;}const ratio=p.hp/p.maxHp;if(ratio<.72){ctx.fillStyle='#202328';ctx.fillRect(x+w/2,y+2,1,Math.min(8,h-4));ctx.fillRect(x+w/2-3,y+7,4,1);}if(ratio<.36){ctx.fillRect(x+3,y+h-7,7,1);ctx.fillRect(x+8,y+h-10,1,4);}if(p.hitFlash>0){ctx.globalAlpha=.38;ctx.fillStyle='#fff3bd';ctx.fillRect(x,y,w,h);}ctx.restore();}
function drawBankProp(ctx:CanvasRenderingContext2D,p:any,f:number,floor:number){const t=bankRoomTheme(floor);if(!p.broken){ctx.fillStyle=t.propShadow;ctx.fillRect(p.baseX,p.baseY+p.baseH-1,p.baseW,1);}drawBankPropSprite(ctx,p,f,floor);}
function drawBankProps(ctx:CanvasRenderingContext2D,content:any,f:number,floor:number){for(const p of content.bankProps??[])drawBankProp(ctx,p,f,floor);}
function bankPropOccludesPlayer(p:any,pl:any){if(p.broken)return false;const feet=pl.y+15;return pl.x+20>p.x&&pl.x-6<p.x+p.w&&pl.y+23>p.y&&pl.y-10<p.y+p.h&&feet<p.baseY+p.baseH*.55;}
function drawBankPropsForeground(ctx:CanvasRenderingContext2D,content:any,f:number,pl:any,floor:number){for(const p of content.bankProps??[]){if(!bankPropOccludesPlayer(p,pl))continue;ctx.save();ctx.beginPath();ctx.rect(pl.x-12,pl.y-12,38,38);ctx.clip();drawBankProp(ctx,p,f,floor);ctx.restore();}}
function cafe(ctx:CanvasRenderingContext2D,f:number){const x=240,y=111;ctx.save();ctx.fillStyle='#4d3124';ctx.fillRect(x-104,y-5,208,38);ctx.fillStyle='#8a5b3d';ctx.fillRect(x-104,y-5,208,4);ctx.fillStyle='#e1b779';ctx.fillRect(x-98,y+1,196,3);ctx.fillStyle='#20262c';ctx.fillRect(x+56,y-31,34,27);ctx.fillStyle='#9aa6ab';ctx.fillRect(x+60,y-27,26,11);ctx.fillStyle='#dce5e7';ctx.fillRect(x+63,y-24,20,6);ctx.fillStyle='#efe0bf';ctx.fillRect(x-88,y-31,58,24);ctx.fillStyle='#2d2520';ctx.fillRect(x-84,y-27,50,16);ctx.fillStyle='#e4b768';ctx.fillRect(x-79,y-23,24,2);ctx.fillRect(x-79,y-18,32,2);drawShopPigeon(ctx,x-10,y-19,f);ctx.fillStyle='#f0ece2';ctx.fillRect(x-6,y-1,8,11);ctx.restore();}
function offerStand(ctx:CanvasRenderingContext2D,x:number,y:number,k:string){ctx.fillStyle=k==='van'?'#0a0d10':k==='cafe'?'#6f4934':'#25382f';ctx.fillRect(x-18,y+9,36,10);ctx.fillStyle=k==='van'?'#d58e42':k==='cafe'?'#e7c493':'#66ba89';ctx.fillRect(x-14,y+10,28,2);}
function doorAccent(ctx:CanvasRenderingContext2D,x:number,y:number,d:string,style:string,f:number){const c=style==='boss'?'#d34b52':style==='gold'?'#f4d03f':style==='green'?'#53d78d':style==='orange'?'#ed9b48':style==='purple'?'#b58ade':'#91a1ad';ctx.save();ctx.fillStyle=c;ctx.globalAlpha=.5;if(d==='N'||d==='S')ctx.fillRect(x+5,d==='N'?y+28:y+1,22,2);else ctx.fillRect(d==='W'?x+28:x+1,y+5,2,22);if(style==='boss'){ctx.globalAlpha=.3+.15*Math.sin(f*.12);ctx.fillRect(x+3,y+3,5,5);ctx.fillRect(x+24,y+3,5,5);}ctx.restore();}

export function renderWorld(engine: GameEngine) {
  updateBankProps(engine);
  resolveInteractableSpacing(engine);
  const ctx = engine.ctx;
  const s = engine.state;
  if(s===GameState.MENU || s===GameState.DIFFICULTY || s===GameState.HEIST_INTRO) {
    const opening=s===GameState.HEIST_INTRO?Math.max(0,(90-engine.heistIntroTimer-15)/75):0;
    drawVaultScene(ctx,engine.frame,engine.equippedSkin,opening,engine.mouseX||240,engine.mouseY||176);
    return;
  }

  if (s === GameState.HOW_TO_PLAY || s === GameState.SETTINGS ||
      s === GameState.WARDROBE || s === GameState.UPGRADES || s===GameState.COLLECTION) {
    drawVaultScene(ctx,engine.frame,engine.equippedSkin);
    ctx.fillStyle = 'rgba(4,6,14,0.86)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    return;
  }
  if (s === GameState.GAME_OVER || s === GameState.VICTORY) {
    ctx.fillStyle = '#08060c';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    return;
  }

  const room = currentRoomOf(engine);
  const content = getContentOf(engine);
  const f = engine.frame;

  ctx.save();
  ctx.translate(engine.shakeX, engine.shakeY);

  drawRoomFloor(ctx,room,content,f,engine.map.floorIndex);
  drawElegantFloor(ctx,room,engine.map.floorIndex,f);
  worldDecor(ctx,room,content,f,engine.map.floorIndex,engine);
  drawBankProps(ctx,content,f,engine.map.floorIndex);
  drawSpecialRoomPedestalLayer(ctx,content,f,engine);
  if(room.modifier==='blackout') {
    ctx.fillStyle='rgba(2,10,18,.48)';ctx.fillRect(32,32,416,288);
  }
  if(room.modifier==='waxed') {
    ctx.fillStyle='rgba(149,191,198,.06)';
    for(let i=0;i<6;i++)ctx.fillRect(48+i*67,52,16,238);
  }
  if(room.modifier==='alarm'&&!room.cleared){ctx.globalAlpha=.06+Math.sin(f*.05)*.025;ctx.fillStyle='#e15a4f';ctx.fillRect(32,32,416,288);ctx.globalAlpha=1;}

  for (const p of content.puddles) {
    ctx.globalAlpha = Math.min(0.55, p.life / 200);
    const fire = p.kind === 'fire';
    ctx.fillStyle = p.kind==='radiation'?'#9dbf57':fire?'#ec8c42':p.kind==='smoke'?'#879994':p.life < 80 ? '#3d7fb8' : '#2d6fa8';
    ctx.beginPath(); ctx.ellipse(p.x, p.y, p.radius ?? 16, (p.radius ?? 16) * .45, 0, 0, Math.PI * 2); ctx.fill();
    if (fire) { ctx.fillStyle = `rgba(255,210,80,${.25 + Math.sin(f * .2) * .1})`; ctx.beginPath(); ctx.ellipse(p.x, p.y - 2, 8, 4, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1;
  }

  // luces doradas de la escalera
  if (content.stairs) drawStairs(ctx, content.stairs, f);

  // puertas
  for (const d of room.doors) {
    const v = DIR_VECTORS[d];
    const target = engine.map.rooms.get(`${room.gx + v.x},${room.gy + v.y}`);
    if(target?.type===RoomType.SECRET && !target.revealed) {
      const t=DOOR_TILE[d],x=t.x*32,y=t.y*32;
      ctx.fillStyle='#233843';ctx.fillRect(x,y,32,32);
      ctx.strokeStyle='#0b1c25';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+15,y+2);ctx.lineTo(x+11,y+13);ctx.lineTo(x+18,y+21);ctx.lineTo(x+14,y+29);ctx.stroke();
      ctx.fillStyle='#a68d57';ctx.fillRect(x+22,y+27,2,2);continue;
    }
    const style = target?.type === RoomType.ITEM ? 'gold'
      : target?.type===RoomType.BOSS?'boss':target?.type===RoomType.SHOP?'green':target?.type===RoomType.GUN_VAN?'orange'
      :target?.type===RoomType.MINIBOSS?'orange':target?.type===RoomType.CHOICE||target?.type===RoomType.TREASURE||target?.type===RoomType.SECRET?'purple':'silver';
    const t = DOOR_TILE[d];
    drawBankDoorSurround(ctx,t.x*TILE_SIZE,t.y*TILE_SIZE,d,engine.map.floorIndex);
    drawDoor(ctx,t.x*TILE_SIZE,t.y*TILE_SIZE,d,style,!room.cleared,content.doorAnim[d]??0,f);
    drawBankDoorTrim(ctx,t.x*TILE_SIZE,t.y*TILE_SIZE,d,engine.map.floorIndex,style);
  }

  // obstáculos
  for (let y = 0; y < ROOM_HEIGHT; y++) {
    for (let x = 0; x < ROOM_WIDTH; x++) {
      const t = room.layout[y][x];
      if (t >= OBSTACLE_BASE) drawObstacle(ctx, x * TILE_SIZE, y * TILE_SIZE, t - OBSTACLE_BASE, f);
    }
  }

  if (room.type === RoomType.ITEM) {
    drawCandle(ctx, TILE_SIZE * 3, CANVAS_HEIGHT / 2 - 30, f);
    drawCandle(ctx, CANVAS_WIDTH - TILE_SIZE * 3 - 8, CANVAS_HEIGHT / 2 - 30, f);
    drawCandle(ctx, TILE_SIZE * 4.5, CANVAS_HEIGHT / 2 + 50, f + 40);
    drawCandle(ctx, CANVAS_WIDTH - TILE_SIZE * 4.5, CANVAS_HEIGHT / 2 + 50, f + 40);
  }

  if (content.chest) drawChest(ctx, content.chest.x, content.chest.y, content.chest.opened, f);
  if (content.pedestal) drawPedestalFull(ctx, content.pedestal, f, engine);
  for(const ped of content.choices ?? []) if(!ped.taken) drawPedestalFull(ctx,ped,f,engine);
  if(content.event) {
    const event=content.event;
    
    drawEventPedestalAccent(ctx,event,f);
    if(event.kind==='injured') drawDuckSkin(ctx,event.x,event.y,f,'robber','down',false,false,false,false,!event.used);
    else drawItemIcon(ctx,event.x-8,event.y-11,EVENTS[event.kind].icon,32);
  }

  if(((room.type===RoomType.SHOP||room.type===RoomType.GUN_VAN)||content.cafe)&&content.shopItems){
    if(room.type===RoomType.GUN_VAN)drawBlackMarketVan(ctx,f);else if(content.cafe)cafe(ctx,f);else drawShopPigeon(ctx,CANVAS_WIDTH/2-8,CANVAS_HEIGHT*.22,f);
    for(const it of content.shopItems){
      if(it.sold)continue;offerStand(ctx,it.x,it.y,room.type===RoomType.GUN_VAN?'van':content.cafe?'cafe':'shop');
      if(it.isFood)drawItemIcon(ctx,it.x-12,it.y-12,it.itemId,24);else if (it.isWeapon) drawWeaponIcon(ctx, it.x - 8, it.y - 8, it.itemId);
      else drawItem(ctx, it.x - 8, it.y - 8, it.itemId, f);
    }
  }

  for (const p of content.pickups) {
    if (p.type === 'hp' || p.type === 'sandwich' || p.type === 'baguette' ||
        p.type === 'croissant' || p.type === 'torta' || p.type === 'pan_dorado') {
      drawItemIcon(ctx,p.x-12,p.y-12+Math.round(Math.sin(f*.08)),p.type,24);
      // halo curativo
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = '#ff8f9f';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else drawCoin(ctx, p.x, p.y, f, p.type === 'golden_crumb');
  }

  for (const it of content.items) {
    const fy = it.y + Math.sin(f * 0.07) * 2;
    const def=WEAPONS[it.itemId]??ITEMS[it.itemId]??ACTIVE_ITEMS[it.itemId];
    ctx.globalAlpha=ITEMS[it.itemId]?.cursed?.3:.14;ctx.fillStyle=ITEMS[it.itemId]?.cursed?'#663174':RARITY_COLORS[def?.rarity ?? 3];ctx.beginPath();ctx.arc(it.x+8,fy+8,17,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
    drawItemIcon(ctx,it.x-4,fy-4,it.itemId,24,RARITY_COLORS[def?.rarity ?? 3]);
  }

  for (const e of content.enemies) drawEnemy(ctx, e, f, engine);
  for(const d of engine.deathEchoes) {
    ctx.save();ctx.globalAlpha=d.life/(d.enemy.isBoss?42:20);
    ctx.translate(d.enemy.x+d.enemy.size/2,d.enemy.y+d.enemy.size/2);ctx.rotate((20-d.life)*.035);
    ctx.scale(Math.max(.3,d.life/20),Math.max(.2,d.life/24));
    if(d.enemy.isBoss) drawBoss(ctx,-d.enemy.size/2,-d.enemy.size/2,d.enemy.bossType,f,0,1,false);
    else {
      switch(d.enemy.type) {
        case 'toaster_turret':drawToasterTurret(ctx,-10,-10,f,false);break;
        case 'rolling_bagel':drawRollingBagel(ctx,-8,-8,f,false);break;
        case 'evil_croissant':drawEvilCroissant(ctx,-8,-8,f,false);break;
        case 'banker_chicken':drawBankerChicken(ctx,-8,-8,f,false);break;
        case 'guard_goose':drawGuardGoose(ctx,-10,-10,f,false);break;
        case 'dron_policial':drawDronPolicial(ctx,-8,-8,f,false);break;
        case 'policia_rapido':drawPoliciaRapido(ctx,-8,-8,f,false,1);break;
        case 'policia_escopeta':drawPoliciaEscopeta(ctx,-9,-9,f,false,1,0);break;
        case 'policia_antidisturbios':drawPoliciaAntidisturbios(ctx,-11,-11,f,false,{x:0,y:1},false,true);break;
        case 'policia_pato':drawPoliciaPato(ctx,-8,-8,f,false,1);break;
        default:drawSecurityPigeon(ctx,-8,-8,f,false);
      }
    }
    ctx.restore();
  }
  for (const p of engine.projectiles) {
    ctx.save();ctx.translate(p.x,p.y);ctx.scale(p.nuclear?1.65:1,p.nuclear?1.65:1);
    if(p.nuclear) {ctx.fillStyle='rgba(150,224,94,.2)';ctx.fillRect(-7,-7,14,14);}
    drawProjectile(ctx,0,0,p.type,f);ctx.restore();
  }
  for (const g of engine.grenades) {
    ctx.fillStyle = 'rgba(0,0,0,.28)';
    ctx.beginPath(); ctx.ellipse(g.x, g.y + 4, 7, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.translate(g.x, g.y - g.z); ctx.rotate(g.rot);
    drawItemIcon(ctx, -12, -12, 'bread_grenade', 24);
    ctx.restore();
    if (!g.airborne) {
      ctx.strokeStyle = g.fuse < 12 && f % 6 < 3 ? '#ff6b4a' : '#d4a574';
      ctx.globalAlpha = .55; ctx.beginPath(); ctx.arc(g.x, g.y, 10, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
    }
  }

  const p = engine.player;
  const b=getBuild(p);
  for(const child of p.companions) {
    ctx.save();ctx.translate(child.x+8,child.y+8);ctx.scale(.72,.72);
    if(child.kind==='chicken')drawBankerChicken(ctx,-8,-8,f,false);
    else {drawDuck(ctx,-8,-8,f*.7,'down',p.moving);if(child.kind==='guard'){ctx.fillStyle=p.guardianCooldown>0?'#4a5f6b':'#b3dce0';ctx.fillRect(3,0,7,9);}}
    ctx.restore();
  }
  if(b.aura>0) {
    ctx.globalAlpha=.17;ctx.strokeStyle='#a6bc70';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(p.x+7,p.y+8,52,42,0,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;
  }
  if(engine.decoy) drawItemIcon(ctx,engine.decoy.x-12,engine.decoy.y-12,engine.decoy.explosive?'fake_alarm':'duck_decoy',24);
  if(engine.remoteBomb) drawItemIcon(ctx,engine.remoteBomb.x-12,engine.remoteBomb.y-12,'remote_bomb',24);
  if(engine.drone) drawItemIcon(ctx,engine.drone.x-12,engine.drone.y-12,'crumb_drone',20);
  if(p.quackWave>0) {
    ctx.save();ctx.strokeStyle='#f4d384';ctx.globalAlpha=p.quackWave/24;ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(p.x+7,p.y+8,10+(24-p.quackWave)*4,0,Math.PI*2);ctx.stroke();ctx.restore();
  }
  if(p.trayTimer>0) {
    ctx.save();ctx.translate(p.x+7+Math.cos(p.facingAngle)*17,p.y+8+Math.sin(p.facingAngle)*17);ctx.rotate(p.facingAngle);
    ctx.fillStyle='#b8d6d4';ctx.fillRect(-2,-14,4,28);ctx.restore();
  }
  if (p.activeItem === 'bread_grenade' && p.activeItemCooldown <= 0 && p.hp > 0) {
    const land = grenadeLanding(engine);
    ctx.save();
    ctx.globalAlpha = .28 + Math.sin(f * .12) * .08;
    ctx.strokeStyle = '#e8c99b';
    ctx.beginPath(); ctx.ellipse(land.x, land.y, 14, 8, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1; ctx.restore();
  }
  if(p.hp>0){const heldAim=aimVector(engine),heldBehind=heldAim.y<-.2;if(heldBehind){drawHeldWeapon(ctx,engine);drawGunfeelMuzzle(ctx,engine);}
    drawDuckSkin(ctx,p.x,p.y,f,engine.equippedSkin,p.dir,p.moving,p.hurtTimer>0,p.dashTimer>0,p.shootFlash>0);
    if(!heldBehind){drawHeldWeapon(ctx,engine);drawGunfeelMuzzle(ctx,engine);}
    drawBankPropsForeground(ctx,content,f,p,engine.map.floorIndex);
    drawItemRoomRewardForeground(ctx,content,f,engine,p);
    if (p.iFrames > 0 && p.dashTimer <= 0 && Math.floor(f * 0.35) % 2 === 0) {
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = '#fff';
      ctx.fillRect(p.x + 2, p.y + 2, 12, 14);
      ctx.globalAlpha = 1;
    }
  }

  for (const pt of engine.particles) drawParticle(ctx, pt.x, pt.y, pt.type, pt.life, pt.color);

  ctx.restore();

  // flash rojo al recibir daño
  if (p.flash > 0) {
    ctx.fillStyle = `rgba(220,40,40,${(p.flash / 10) * 0.3})`;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  // viñeta
  const vg = ctx.createRadialGradient(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH * 0.3,
    CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH * 0.72);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  if(p.hp<=1) {
    const danger=ctx.createRadialGradient(240,176,130,240,176,275);
    danger.addColorStop(0,'rgba(145,25,32,0)');danger.addColorStop(1,`rgba(145,25,32,${.16+Math.sin(f*.05)*.035})`);
    ctx.fillStyle=danger;ctx.fillRect(0,0,480,352);
  }

  // aviso de bloqueo
  if (content.lockFlash > 0) {
    const a = content.lockFlash / 45;
    ctx.globalAlpha = a * 0.3;
    ctx.fillStyle = room.cleared ? '#39d353' : '#ff3b30';
    ctx.fillRect(0, 0, CANVAS_WIDTH, 3);
    ctx.fillRect(0, CANVAS_HEIGHT - 3, CANVAS_WIDTH, 3);
    ctx.fillRect(0, 0, 3, CANVAS_HEIGHT);
    ctx.fillRect(CANVAS_WIDTH - 3, 0, 3, CANVAS_HEIGHT);
    ctx.globalAlpha = 1;
  }

  // fundido de transición entre salas
  if (engine.transition.active) {
    const t = engine.transition.timer / engine.transition.total;
    const a = t < 0.5 ? t * 2 : (1 - t) * 2;
    ctx.fillStyle = `rgba(4,5,12,${a})`;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }
}

// ---------------------------------------------------------------------------
function drawRoomFloor(ctx: CanvasRenderingContext2D, room: ReturnType<typeof currentRoomOf>, content: RoomContent, f: number, floorIndex: number) {
  const th = FLOOR_THEMES[Math.min(floorIndex, FLOOR_THEMES.length - 1)];
  const special = room.type === RoomType.ITEM;
  const floorPal = special ? ['#241634', '#2b1a3e', '#1a0f27'] : th.floor;
  const wallPal = special ? ['#3b2a56', '#2a1d3e'] : th.wall;

  for (let y = 0; y < ROOM_HEIGHT; y++) {
    for (let x = 0; x < ROOM_WIDTH; x++) {
      const t = room.layout[y][x];
      if (t === TILE_DOOR) {
        ctx.fillStyle = '#07070f';
        ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      } else {
        drawRichTile(ctx, x, y, t === 1, special ? { floor: floorPal, wall: wallPal, trim: '#c58ae8', glow: '#c58ae8', deco: 'vault' } : th, room.gx, room.gy, f);
      }
    }
  }
  drawInnerWallShadow(ctx);
  drawRoomAtmosphere(ctx, special ? 'vault' : th.deco, f, special);

  // brillos por tipo de sala
  const cx = CANVAS_WIDTH / 2, cy = CANVAS_HEIGHT / 2;
  if (special) {
    const g = ctx.createRadialGradient(cx, cy, 10, cx, cy, 190);
    g.addColorStop(0, 'rgba(180,80,220,0.14)');
    g.addColorStop(0.6, 'rgba(120,40,80,0.10)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = 'rgba(96,20,42,0.5)';
    ctx.fillRect(cx - 62, cy - 52, 124, 104);
    ctx.fillStyle = 'rgba(150,40,70,0.5)';
    ctx.fillRect(cx - 56, cy - 46, 112, 92);
    ctx.fillStyle = 'rgba(244,208,63,0.22)';
    ctx.fillRect(cx - 52, cy - 42, 104, 2);
    ctx.fillRect(cx - 52, cy + 40, 104, 2);
    for (let i = 0; i < 12; i++) {
      const t = (f * 0.012 + i * 0.083) % 1;
      const px = cx + Math.sin(i * 2.3 + f * 0.01) * 70;
      const py = CANVAS_HEIGHT - 40 - t * 200;
      ctx.globalAlpha = (1 - t) * 0.6;
      ctx.fillStyle = i % 3 === 0 ? '#f4d03f' : '#c58ae8';
      ctx.fillRect(px, py, 2, 2);
    }
    ctx.globalAlpha = 1;
  } else if(room.type===RoomType.GUN_VAN){
    ctx.fillStyle='rgba(3,5,8,.38)';ctx.fillRect(TILE_SIZE,TILE_SIZE,CANVAS_WIDTH-TILE_SIZE*2,CANVAS_HEIGHT-TILE_SIZE*2);ctx.fillStyle='rgba(231,154,69,.12)';for(let x=90;x<410;x+=70)ctx.fillRect(x,286,34,3);
  } else if (room.type === RoomType.SHOP) {
    ctx.fillStyle = 'rgba(120,72,30,0.28)';
    ctx.fillRect(TILE_SIZE + 20, TILE_SIZE + 40, CANVAS_WIDTH - TILE_SIZE * 2 - 40, CANVAS_HEIGHT - TILE_SIZE * 2 - 60);
  } else if (room.type === RoomType.BOSS) {
    ctx.fillStyle = 'rgba(200,40,40,0.05)';
    ctx.fillRect(TILE_SIZE, TILE_SIZE, CANVAS_WIDTH - TILE_SIZE * 2, CANVAS_HEIGHT - TILE_SIZE * 2);
    if (content.stairs) {
      ctx.fillStyle = `rgba(244,208,63,${0.05 + Math.sin(f * 0.04) * 0.03})`;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
  } else if (room.type === RoomType.TREASURE || room.type === RoomType.SECRET) {
    const g = ctx.createRadialGradient(cx, cy, 8, cx, cy, 150);
    g.addColorStop(0, 'rgba(244,208,63,0.14)');
    g.addColorStop(1, 'rgba(244,208,63,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }
}

function drawStairs(ctx: CanvasRenderingContext2D, st: NonNullable<RoomContent['stairs']>, f: number) {
  const px = st.x, py = st.y;
  const glow = 0.35 + Math.sin(f * 0.06) * 0.18;
  // luz subiendo desde abajo
  const g = ctx.createLinearGradient(px, py - 40, px, py + 36);
  g.addColorStop(0, `rgba(244,208,63,${0.28 * glow * st.glow})`);
  g.addColorStop(1, 'rgba(244,208,63,0)');
  ctx.fillStyle = g;
  ctx.fillRect(px - 22, py - 44, 76, 80);

  ctx.fillStyle = '#0a0d16';
  ctx.fillRect(px - 2, py - 2, 36, 34);
  // peldaños
  for (let i = 0; i < 5; i++) {
    const d = 1 - i * 0.15;
    ctx.fillStyle = `rgb(${Math.round(40 * d)},${Math.round(46 * d)},${Math.round(62 * d)})`;
    ctx.fillRect(px + i * 2, py + 26 - i * 6, 32 - i * 4, 6);
    ctx.fillStyle = `rgba(255,214,102,${0.12 + i * 0.06})`;
    ctx.fillRect(px + i * 2, py + 26 - i * 6, 32 - i * 4, 1);
  }
  // barandillas
  ctx.fillStyle = '#f4d03f';
  ctx.fillRect(px - 4, py - 4, 3, 32);
  ctx.fillRect(px + 33, py - 4, 3, 32);
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = (f >> 4) % 2 === 0 ? '#39d353' : '#1c5c33';
    ctx.fillRect(px - 3 + i * 18, py - 8, 3, 3);
  }
}

function gunfeelVisualHash(id:string){let h=0;for(let i=0;i<id.length;i++)h=(Math.imul(h,33)+id.charCodeAt(i))|0;return Math.abs(h);}
function gunfeelVisualColor(w:any){const id=String(w?.id??''),t=String(w?.projectileType??''),q=(id+' '+t).toLowerCase();if(q.includes('gold')||q.includes('coin')||q.includes('egg'))return '#f7d64b';if(q.includes('plasma')||q.includes('laser')||q.includes('rayo'))return '#6de1ef';if(q.includes('quant'))return '#ba92ff';if(q.includes('toast')||q.includes('horno')||q.includes('fire'))return '#ff9d45';if(q.includes('butter')||q.includes('jarabe')||q.includes('mermelada'))return '#ffe269';if(q.includes('bread')||q.includes('crumb')||q.includes('baguette')||q.includes('dough')||q.includes('miga')||q.includes('pan'))return '#efc77e';const cs=['#fff2bd','#b8e6ee','#efad9e','#d0b5ef','#c8df9e','#efc185','#cbd5dd'];return cs[gunfeelVisualHash(id)%cs.length];}
function gunfeelRecoilPx(w:any){return Math.min(4,1+Math.floor(((w?.damage??1)/12))+((w?.projectileCount??1)>=5?1:0));}
function drawGunfeelMuzzle(ctx:CanvasRenderingContext2D,engine:GameEngine){const p=engine.player;if(p.hp<=0||p.shootFlash<=0)return;const w=activeWeapon(p);if(!w)return;const a=aimVector(engine),ang=Math.atan2(a.y,a.x),h=gunfeelVisualHash(w.id),profile=h%5,size=2+((h>>3)%3),c=gunfeelVisualColor(w),mx=p.x+7+a.x*(17-gunfeelRecoilPx(w)),my=p.y+8+a.y*(17-gunfeelRecoilPx(w));ctx.save();ctx.translate(Math.round(mx),Math.round(my));ctx.rotate(ang);ctx.globalAlpha=Math.min(1,.45+p.shootFlash*.14);ctx.fillStyle=c;if(profile===0){ctx.fillRect(0,-1,7+size,3);ctx.fillRect(3,-3,3,7);}else if(profile===1){ctx.fillRect(0,-2,5+size,5);ctx.fillRect(5+size,-1,4,3);ctx.fillRect(2,-4,2,2);ctx.fillRect(2,3,2,2);}else if(profile===2){ctx.fillRect(0,-3,3,2);ctx.fillRect(0,2,3,2);ctx.fillRect(3,-2,5+size,4);}else if(profile===3){ctx.fillRect(0,-1,9+size,2);ctx.fillRect(2,-3,2,6);ctx.fillRect(7+size,-2,2,4);}else{ctx.fillRect(0,-2,4,4);ctx.fillRect(4,-3,3,6);ctx.fillRect(7,-1,4+size,2);}ctx.fillStyle='#fff8d8';ctx.globalAlpha*=.72;ctx.fillRect(0,-1,Math.max(2,size+1),2);ctx.restore();}

function drawHeldWeapon(ctx:CanvasRenderingContext2D,engine:GameEngine){
  const p=engine.player;if(p.hp<=0)return;const w=activeWeapon(p);if(!w)return;const aim=aimVector(engine),ang=Math.atan2(aim.y,aim.x),kick=p.shootFlash>0?gunfeelRecoilPx(w):0;
  ctx.save();ctx.translate(p.x+7+aim.x*(5-kick),p.y+8+aim.y*(4-kick*.5));ctx.rotate(ang);if(Math.cos(ang)<0)ctx.scale(1,-1);
  ctx.fillStyle='#f2cc42';ctx.fillRect(-1,-2,4,4);ctx.fillStyle='#d7a72b';ctx.fillRect(1,1,3,2);ctx.translate(3,-5);ctx.scale(.52,.52);drawWeaponIcon(ctx,0,0,w.id);ctx.restore();
}

function eventPedestalColor(kind:string){return kind==='security_terminal'?'#61c9ff':kind==='field_medic'?'#77e39a':kind==='weapon_forge'?'#f29a55':kind==='bread_altar'?'#b06ce3':'#f4d03f';}
function drawEventPedestalAccent(ctx:CanvasRenderingContext2D,event:{kind:string;x:number;y:number;used:boolean},f:number){if(event.used)return;const x=event.x,y=event.y+10,k=event.kind;ctx.save();ctx.globalAlpha=.72+.18*Math.sin(f*.08);if(k==='security_terminal'){ctx.fillStyle='#61c9ff';ctx.fillRect(x-8,y+4,3,8);ctx.fillRect(x+13,y+4,3,8);}else if(k==='field_medic'){ctx.fillStyle='#77e39a';ctx.fillRect(x+1,y+5,10,3);ctx.fillRect(x+4,y+2,3,9);}else if(k==='weapon_forge'){ctx.fillStyle='#f29a55';ctx.fillRect(x-8,y+3,3,13);ctx.fillRect(x+13,y+3,3,13);}else if(k==='bread_altar'){ctx.fillStyle='#b06ce3';ctx.fillRect(x-7,y+9,2,7);ctx.fillRect(x+12,y+7,2,9);ctx.fillStyle='#dfb0ff';ctx.fillRect(x-6,y+6,1,3);ctx.fillRect(x+13,y+4,1,3);}ctx.restore();}

function drawGreekItemPedestal(ctx:CanvasRenderingContext2D,ped:Pedestal,f:number,engine:GameEngine){if(ped.taken)return;const cx=Math.round(ped.x+12),y=Math.round(ped.y+12),floor=Math.max(0,Math.min(5,engine.map.floorIndex)),marble=floor>=4?'#eee3ce':'#e7e0d2',hi=floor>=4?'#fff6df':'#f8f3e8',shade=floor>=4?'#b9aa91':'#bcb6aa',edge=floor>=4?'#5a4b3a':'#555b60',gold=floor>=3?'#d6ad43':'#b89545';ctx.save();ctx.fillStyle='rgba(0,0,0,.24)';ctx.fillRect(cx-11,y+11,22,2);ctx.fillStyle=edge;ctx.fillRect(cx-10,y+8,20,3);ctx.fillStyle=shade;ctx.fillRect(cx-9,y+7,18,2);ctx.fillStyle=marble;ctx.fillRect(cx-7,y+2,14,6);ctx.fillStyle=hi;ctx.fillRect(cx-5,y+2,3,5);ctx.fillStyle=shade;ctx.fillRect(cx+4,y+3,2,4);ctx.fillStyle=edge;ctx.fillRect(cx-8,y,16,3);ctx.fillStyle=marble;ctx.fillRect(cx-7,y-1,14,3);ctx.fillStyle=hi;ctx.fillRect(cx-5,y-1,8,1);ctx.fillStyle=gold;ctx.fillRect(cx-6,y+1,12,1);if(Math.sin(f*.075+ped.x*.03)>.7){ctx.fillStyle='#fff1a8';ctx.fillRect(cx+5,y,1,1);}ctx.restore();}
function visibleGreekItemPedestals(room:any,content:any){const out:any[]=[];const main=content.pedestal;if(main&&!main.taken&&(room.type===RoomType.ITEM||main.bossLoot===true))out.push(main);if(!content.choiceTaken)for(const p of content.choices??[])if(p&&!p.taken&&(room.type===RoomType.ITEM||p.bossLoot===true)&&!out.includes(p))out.push(p);return out;}
function drawSpecialRoomPedestalLayer(ctx:CanvasRenderingContext2D,content:any,f:number,engine:GameEngine){const room=currentRoomOf(engine),peds=visibleGreekItemPedestals(room,content);for(const ped of peds)drawGreekItemPedestal(ctx,ped,f,engine);if(room.type===RoomType.EVENT&&!content.cafe&&content.event){const event=content.event;}}
function greekRewardOccludesPlayer(ped:any,pl:any){if(ped.taken)return false;const cx=Math.round(ped.x+12),y=Math.round(ped.y+12),feet=pl.y+15,baseY=y+7;return pl.x+20>cx-17&&pl.x-6<cx+17&&pl.y+22>ped.y-18&&pl.y-10<y+13&&feet<baseY+3;}
function drawItemRoomRewardForeground(ctx:CanvasRenderingContext2D,content:any,f:number,engine:GameEngine,pl:any){const room=currentRoomOf(engine);for(const ped of visibleGreekItemPedestals(room,content)){if(!greekRewardOccludesPlayer(ped,pl))continue;ctx.save();ctx.beginPath();ctx.rect(pl.x-9,pl.y-11,32,38);ctx.clip();drawGreekItemPedestal(ctx,ped,f,engine);drawPedestalFull(ctx,ped,f,engine);ctx.restore();}}
function drawPedestalFull(ctx: CanvasRenderingContext2D, ped: Pedestal, f: number, engine: GameEngine) {
  const def=WEAPONS[ped.itemId]??ITEMS[ped.itemId]??ACTIVE_ITEMS[ped.itemId]??FOODS[ped.itemId];
  const color=ITEMS[ped.itemId]?.cursed?'#8b54a6':RARITY_COLORS[def?.rarity ?? 3];
  ctx.save();ctx.translate(0,Math.round(18*(1-(ped.rise ?? 1))));ctx.globalAlpha=ped.rise ?? 1;
  
  if(ped.taken) {ctx.restore();return;}

  // foco de luz para el botín del jefe
  if (ped.bossLoot) {
    const g = ctx.createRadialGradient(ped.x + 12, ped.y - 10, 4, ped.x + 12, ped.y - 10, 70);
    g.addColorStop(0, 'rgba(255,224,102,0.30)');
    g.addColorStop(1, 'rgba(255,224,102,0)');
    ctx.fillStyle = g;
    ctx.fillRect(ped.x - 60, ped.y - 80, 144, 160);
    // haz
    ctx.globalAlpha = 0.18 + Math.sin(f * 0.05) * 0.08;
    ctx.fillStyle = '#ffe066';
    ctx.beginPath();
    ctx.moveTo(ped.x + 4, ped.y - 60);
    ctx.lineTo(ped.x + 20, ped.y - 60);
    ctx.lineTo(ped.x + 30, ped.y + 20);
    ctx.lineTo(ped.x - 6, ped.y + 20);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    for (let i = 0; i < 6; i++) {
      const t = (f * 0.02 + i * 0.16) % 1;
      ctx.globalAlpha = (1 - t) * 0.8;
      ctx.fillStyle = i % 2 ? '#fff3b0' : '#f4d03f';
      ctx.fillRect(ped.x + 2 + Math.sin(i * 2 + f * 0.04) * 18, ped.y + 24 - t * 60, 2, 2);
      ctx.globalAlpha = 1;
    }
  }

  ctx.globalAlpha=.3;ctx.fillStyle='#06141c';ctx.fillRect(ped.x+4,ped.y+6,16,3);ctx.globalAlpha=1;
  drawItemIcon(ctx,ped.x,ped.y-22+Math.round(Math.sin(f*.06)*2),ped.itemId,24,color);
  const n=(def?.rarity ?? 0)>=3?3:1;
  for(let i=0;i<n;i++) {
    const a=(f*.017+i*.33)%1;ctx.globalAlpha=(1-a)*.45;ctx.fillStyle=color;
    ctx.fillRect(ped.x+10+Math.sin(i*2+f*.05)*15,ped.y+8-a*36,1,2);
  }
  ctx.restore();
  void engine;
}

function drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy, f: number, engine: GameEngine) {
  const hurt = e.hurtTimer > 0;
  const player = engine.player;
  const dirX = (player.x + 7) > (e.x + e.size / 2) ? 1 : -1;

  if (e.spawnAnim > 0) {
    ctx.globalAlpha = 1 - e.spawnAnim / 18;
    ctx.fillStyle = '#ff3b30';
    ctx.fillRect(e.x + e.size / 2 - 1, e.y - 10, 2, 10);
  }

  // aura de élite
  if (e.elite) {
    const pulse = 0.22 + Math.sin(f * 0.09 + e.id) * 0.1;
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#f4d03f';
    ctx.beginPath();
    ctx.ellipse(e.x + e.size / 2, e.y + e.size / 2 + 4, e.size * 0.85, e.size * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    for (let i = 0; i < 2; i++) {
      const t = (f * 0.025 + i * 0.5) % 1;
      ctx.globalAlpha = (1 - t) * 0.8;
      ctx.fillStyle = '#fff3b0';
      ctx.fillRect(e.x + e.size / 2 + Math.sin(f * 0.06 + i * 3) * e.size * 0.5, e.y + e.size - t * e.size * 1.4, 2, 2);
    }
    ctx.globalAlpha = 1;
    // corona de élite
    const cy2 = e.y - 12;
    ctx.fillStyle = '#f4d03f';
    ctx.fillRect(e.x + e.size / 2 - 4, cy2 + 3, 8, 3);
    ctx.fillRect(e.x + e.size / 2 - 4, cy2, 2, 3);
    ctx.fillRect(e.x + e.size / 2 - 1, cy2 + 1, 2, 2);
    ctx.fillRect(e.x + e.size / 2 + 2, cy2, 2, 3);
  }

  // ardiendo por salsa picante / tostadas
  if (e.burn > 0) {
    for (let i = 0; i < 2; i++) {
      const t = ((f + i * 13) % 22) / 22;
      ctx.globalAlpha = (1 - t) * 0.85;
      ctx.fillStyle = i % 2 ? '#ff9f43' : '#ff5b4f';
      ctx.fillRect(e.x + e.size / 2 - 3 + Math.round(Math.sin((f + i * 7) * 0.3) * 4),
        e.y + e.size - 2 - t * 12, 2, 3);
    }
    ctx.globalAlpha = 1;
  }
  // ralentizado por charcos
  if (e.slowTimer > 0) {
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#7fb3d5';
    ctx.fillRect(e.x, e.y + e.size - 1, e.size, 2);
    ctx.globalAlpha = 1;
  }

  // sombra más marcada
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(e.x + 2, e.y + e.size - 2, e.size - 4, 3);

  if (e.isBoss) {
    drawBoss(ctx, e.x, e.y, e.bossType, f, e.hp, e.maxHp, hurt);
  } else if(SPECIAL_ENEMIES.has(e.type)) {
    drawTacticalEnemy(ctx,e.type,e.x,e.y,f,hurt,e.moveAngle,e.telegraph);
  } else {
    switch (e.type) {
      case 'policia_pato': drawPoliciaPato(ctx, e.x, e.y, f, hurt, dirX); break;
      case 'policia_rapido': drawPoliciaRapido(ctx, e.x, e.y, f, hurt, dirX); break;
      case 'policia_escopeta': drawPoliciaEscopeta(ctx, e.x, e.y, f, hurt, dirX, e.telegraph); break;
      case 'dron_policial': drawDronPolicial(ctx, e.x, e.y, f, hurt); break;
      case 'policia_antidisturbios':
        drawPoliciaAntidisturbios(ctx, e.x, e.y, f, hurt,
          { x: Math.cos(e.shieldAngle), y: Math.sin(e.shieldAngle) },
          e.chargeTimer > 0, e.recover > 0);
        break;
      case 'security_pigeon': drawSecurityPigeon(ctx, e.x, e.y, f, hurt); break;
      case 'guard_goose': drawGuardGoose(ctx, e.x, e.y, f, hurt); break;
      case 'toaster_turret': drawToasterTurret(ctx, e.x, e.y, f, hurt); break;
      case 'rolling_bagel': drawRollingBagel(ctx, e.x, e.y, f, hurt); break;
      case 'evil_croissant': drawEvilCroissant(ctx, e.x, e.y, f, hurt); break;
      case 'banker_chicken': drawBankerChicken(ctx, e.x, e.y, f, hurt); break;
      default: drawSecurityPigeon(ctx, e.x, e.y, f, hurt);
    }
  }

  if (hurt) {
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(e.x + 2, e.y + 2, e.size - 4, e.size - 2);
    ctx.globalAlpha = 1;
  }

  if (!e.isBoss && e.hp < e.maxHp) {
    const w = e.size;
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(e.x - 1, e.y - 7, w + 2, 4);
    ctx.fillStyle = e.elite ? '#f4d03f' : '#c0392b';
    ctx.fillRect(e.x, e.y - 6, Math.round(w * (e.hp / e.maxHp)), 2);
  }

  // --- AVISO DE ATAQUE (telegrafía legible) ---
  if (e.telegraph > 0.05) {
    const t = e.telegraph;
    const cx = e.x + e.size / 2, cy = e.y + e.size / 2;
    const ang=e.behavior==='shielded'?e.shieldAngle:e.behavior==='sniper'||e.behavior==='k9'?e.moveAngle:Math.atan2(engine.player.y + 8 - cy, engine.player.x + 7 - cx);
    ctx.save();
    // línea de puntería
    ctx.globalAlpha = 0.18 + t * 0.42;
    ctx.strokeStyle = e.behavior === 'shotgunner' ? '#ff9f43' : '#ff5b4f';
    ctx.lineWidth = e.behavior === 'shotgunner' ? 5 : 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(ang) * (e.size * 0.5), cy + Math.sin(ang) * (e.size * 0.5));
    const reach=e.behavior==='sniper'?440:e.behavior==='k9'?135:e.behavior==='shielded'?90:e.behavior==='shotgunner'?150:110;
    ctx.lineTo(cx+Math.cos(ang)*reach*(e.behavior==='sniper'?1:t),cy+Math.sin(ang)*reach*(e.behavior==='sniper'?1:t));
    ctx.stroke();
    ctx.setLineDash([]);
    // marca de peligro encima
    ctx.globalAlpha = 0.55 + t * 0.45;
    ctx.fillStyle = '#ff3b30';
    const my = e.y - 14 - Math.round(t * 3);
    ctx.fillRect(cx - 1, my, 2, 6);
    ctx.fillRect(cx - 1, my + 7, 2, 2);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  ctx.globalAlpha = 1;
}

// ===========================================================================
// CAPA DE UI
// ===========================================================================
export function renderUI(engine: GameEngine) {
  const ctx = engine.ui;
  if (!ctx) return;
  const s = engine.state;
  ctx.save();
  ctx.scale(engine.uiScale, engine.uiScale);
  ctx.imageSmoothingEnabled = true;

  switch (s) {
    case GameState.MENU: renderMenuUI(engine); break;
    case GameState.DIFFICULTY: renderDifficultyUI(engine); break;
    case GameState.MAP:renderFloorMap(engine);break;
    case GameState.COLLECTION:renderCollection(engine);break;
    case GameState.HEIST_INTRO: {
      const t=1-engine.heistIntroTimer/90;
      ctx.globalAlpha=Math.max(0,1-t*3);drawTitleLogo(ctx,240,62,engine.frame);ctx.globalAlpha=1;
      ctx.fillStyle=`rgba(255,226,154,${Math.max(0,(t-.4)*1.6)})`;ctx.fillRect(0,0,480,352);
      if(t>.88) {ctx.fillStyle=`rgba(5,15,22,${(t-.88)/.12})`;ctx.fillRect(0,0,480,352);}break;
    }
    case GameState.HOW_TO_PLAY: renderHowToPlayUI(engine); break;
    case GameState.SETTINGS: renderSettingsUI(engine); break;
    case GameState.WARDROBE: renderWardrobeUI(engine); break;
    case GameState.UPGRADES: renderUpgradesUI(engine); break;
    case GameState.GAME_OVER: renderGameOverUI(engine); break;
    case GameState.VICTORY: renderVictoryUI(engine); break;
    case GameState.PAUSED:
      drawHUD(engine); renderPrompts(engine); renderPausedUI(engine); break;
    case GameState.FLOOR_INTRO:
      drawHUD(engine); renderFloorIntroUI(engine); break;
    case GameState.BOSS_INTRO:
      drawHUD(engine); renderPrompts(engine); renderBossIntroUI(engine); break;
    case GameState.FLOOR_CLEAR:
      renderFloorClearUI(engine); break;
    default:
      drawHUD(engine);
      renderPrompts(engine);
      break;
  }

  ctx.restore();
}

// ---------------------------------------------------------------------------
// PROMPTS Y FICHAS (coordenadas de mundo, tipografía nítida)
// ---------------------------------------------------------------------------
function prompt(ctx: CanvasRenderingContext2D, x: number, y: number, label: string, color = '#f4d03f') {
  label=translateText(label);
  ctx.save();
  ctx.font = `600 8px ${"'Chakra Petch', sans-serif"}`;
  const w = Math.min(230,ctx.measureText(label).width + 12);
  ctx.fillStyle = 'rgba(6,8,16,0.9)';
  ctx.fillRect(x - w / 2, y - 11, w, 18);
  ctx.fillStyle = color;
  ctx.fillRect(x - w / 2, y - 11, w, 1);
  ctx.fillRect(x - w / 2, y + 6, w, 1);
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(0,0,0,0.8)';
  ctx.fillText(label, x + 1, y + 2);
  ctx.fillStyle = '#fff6c9';
  ctx.fillText(label, x, y + 2);
  ctx.restore();
}

function renderPrompts(engine: GameEngine) {
  const ctx = engine.ui!;
  const room = currentRoomOf(engine);
  const content = getContentOf(engine);
  const p = engine.player;
  const f = engine.frame;
  const targets:TooltipTarget[]=[];
  for(const ped of [content.pedestal,...(content.choices ?? [])]) {
    if(!ped || ped.taken) continue;
    const action=`${actionPrompt(engine,'interact')} · ${ped.isWeapon&&isFull(p)?'REEMPLAZAR ARMA':'RECOGER'}`;
    targets.push({id:ped.itemId,x:ped.x+12,y:ped.y,action,header:ped.bossLoot?T.bossLoot:content.choices?'ELIGE SOLO UNO':undefined});
    if(dist(p.x+7,p.y+8,ped.x+12,ped.y)<34) prompt(ctx,ped.x+12,ped.y+38,actionPrompt(engine,'interact')+' · '+(content.choices?'ELEGIR':'RECOGER'));
  }
  for(const it of content.items) {
    targets.push({id:it.itemId,x:it.x+8,y:it.y+8,action:`${actionPrompt(engine,'interact')} · ${it.isWeapon&&isFull(p)?'REEMPLAZAR ARMA':'RECOGER'}`});
    if(dist(p.x+7,p.y+8,it.x+8,it.y+8)<30) prompt(ctx,it.x+8,it.y-10,`${actionPrompt(engine,'interact')} · RECOGER`);
  }
  for(const food of content.pickups) if(FOODS[food.type]) targets.push({id:food.type,x:food.x,y:food.y,action:p.hp>=p.maxHp?'VIDA COMPLETA':'ACÉRCATE PARA CURARTE'});

  if (content.chest && !content.chest.opened &&
      dist(p.x + 7, p.y + 8, content.chest.x + 10, content.chest.y + 8) < 32) {
    prompt(ctx, content.chest.x + 10, content.chest.y - 12, `${actionPrompt(engine,'interact')} · ABRIR`);
  }

  if (content.shopItems) {
    text(ctx,room.type===RoomType.GUN_VAN?'EL PROVEEDOR':content.cafe?'BARISTA MIGAJÓN':'DON MIGAJÓN',CANVAS_WIDTH/2,CANVAS_HEIGHT*.16,11,room.type===RoomType.GUN_VAN?'#e79a45':content.cafe?'#e7b978':'#f4d03f','center',true);
    if((content.merchantUntil ?? 0)>f) text(ctx,`“${content.merchantLine}”`,240,120,8,'#d5c8a2');
    for (const s of content.shopItems) {
      if (s.sold) { text(ctx, T.sold, s.x, s.y + 26, 8, '#5c6472'); continue; }
      const price=shopPrice(engine,s),near=dist(p.x+7,p.y+8,s.x,s.y)<40;
      text(ctx,`${price} MIGAJAS`,s.x,s.y+30+(near?Math.sin(f*.12):0),8,(s.deniedUntil ?? 0)>f?'#ff6868':p.crumbs>=price?'#d8bf76':'#ab6b64');
      targets.push({id:s.itemId,x:s.x,y:s.y,price,action:`${actionPrompt(engine,'interact')} · COMPRAR`});
      if (dist(p.x + 7, p.y + 8, s.x, s.y) < 30) {
        const fullWarn = s.isWeapon && isFull(p);
        prompt(ctx, s.x, s.y - 24,
          `${actionPrompt(engine,'interact')} · ${fullWarn?'REEMPLAZAR ARMA':'COMPRAR'}`,
          fullWarn ? '#ff9f43' : '#f4d03f');
      }
    }
  }
  nearbyTooltip(engine,targets);
  for(const d of room.doors) {
    const v=DIR_VECTORS[d],target=engine.map.rooms.get(`${room.gx+v.x},${room.gy+v.y}`),tile=DOOR_TILE[d];
    if(!target || target.type===RoomType.COMBAT || (target.type===RoomType.SECRET&&!target.revealed)) continue;
    if(dist(p.x+7,p.y+8,tile.x*32+16,tile.y*32+16)<48) {
      const xx=clamp(tile.x*32+16,95,385),yy=clamp(tile.y*32+16,42,285);
      text(ctx,ROOM_STYLE[target.type].label,xx,yy,7.5,ROOM_STYLE[target.type].color,'center',true);
    }
  }
  if(content.event && dist(p.x+7,p.y+8,content.event.x+8,content.event.y+8)<54) {
    const event=content.event,def=EVENTS[event.kind];
    const x=35,y=65,w=145,h=110;
    ctx.fillStyle='rgba(9,23,30,.97)';ctx.fillRect(x,y,w,h);ctx.fillStyle='#bd91d5';ctx.fillRect(x,y,2,h);
    drawItemIcon(ctx,x+9,y+9,def.icon,24);
    wrappedText(ctx,def.name,x+41,y+20,w-50,9,11,2,'#dfc5e6',true);
    wrappedText(ctx,event.used?event.message:def.description,x+10,y+53,w-20,8,11,2,'#b9cac0');
    if(!event.used) {
      def.options.forEach((s,i)=>text(ctx,`${i+1} · ${s}`,x+11,y+78+i*13,8,event.selected===i?'#f4d03f':'#728c8c','left',event.selected===i));
      prompt(ctx,event.x+8,event.y+39,'1 / 2 · ELEGIR    E · CONFIRMAR');
    }
  }
  if(content.challenge==='alarm' && !room.cleared) text(ctx,`ALARMA · ${Math.ceil((content.alarmTimer ?? 0)/60)} s`,240,64,9,'#e2a477','center',true);
  if(content.challenge==='flawless' && !room.cleared) text(ctx,content.damaged?'DESAFÍO: SIN BONIFICACIÓN':'DESAFÍO: SIN RECIBIR DAÑO',240,64,8,'#cdaacb');
  if(room.modifier && !room.cleared && engine.roomLabelTimer<=0) {
    text(ctx,MODIFIER_LABELS[room.modifier]+(room.modifier==='cameras'&&!content.modifierResolved?` · ${Math.ceil((content.securityTimer ?? 0)/60)} s`:''),240,46,7,'#b9a58d');
  }

  if (content.stairs) {
    const st = content.stairs;
    const near = dist(p.x + 7, p.y + 8, st.x + 16, st.y + 16) < 46;
    if (near && st.unlocked) {
      prompt(ctx,st.x+16,st.y-14,`${actionPrompt(engine,'interact')} · BAJAR AL SIGUIENTE PISO`,'#39d353');
    } else if (!st.unlocked) {
      text(ctx, T.stairsLocked, CANVAS_WIDTH / 2, CANVAS_HEIGHT - 96, 10, '#ff9f43');
    }
  }

  // aviso de puertas bloqueadas
  if (content.lockFlash > 0) {
    const a = clamp(content.lockFlash / 45, 0, 1);
    ctx.globalAlpha = a;
      text(ctx, room.cleared ? T.roomClear : T.lockedDoors, CANVAS_WIDTH / 2, 44, 10,
      room.cleared ? '#39d353' : '#ff5b4f', 'center', true);
    ctx.globalAlpha = 1;
  }

  // etiqueta de sala
  if (engine.roomLabelTimer > 0) {
    const t = engine.roomLabelTimer;
    const a = t > 75 ? (95 - t) / 20 : Math.min(1, t / 25);
    ctx.globalAlpha = clamp(a, 0, 1);
    text(ctx,engine.roomLabel,240,55,10,'#e3c989','center',true);
    ctx.globalAlpha = 1;
  }

  // ficha de objeto recogido
  if (engine.pickupCard) {
    const c = engine.pickupCard;
    const a = clamp(c.timer / 25, 0, 1);
    ctx.globalAlpha = a;
    const x=8,y=58,w=140,h=c.first?69:55;
    ctx.fillStyle='rgba(10,22,28,.96)';ctx.fillRect(x,y,w,h);ctx.fillStyle=RARITY_COLORS[c.rarity];ctx.fillRect(x,y,2,h);
    if(c.first) text(ctx,c.isWeapon?'NUEVA ARMA DESCUBIERTA':'NUEVO OBJETO DESCUBIERTO',x+9,y+12,6.2,'#e5cd8e','left',true);
    drawItemIcon(ctx,x+8,y+(c.first?24:12),c.itemId,24);
    wrappedText(ctx,c.name,x+37,y+(c.first?29:17),w-45,8,10,2,'#f0e2b5',true);
    wrappedText(ctx,c.desc,x+9,y+h-18,w-18,7,9,2,'#aebfb5');
    ctx.globalAlpha = 1;
  }
  if(engine.synergyNotice) {
    const notice=engine.synergyNotice;ctx.globalAlpha=Math.min(1,notice.timer/20);
    text(ctx,'SINERGIA · '+notice.name,240,282,10,'#d0a4ec','center',true);ctx.globalAlpha=1;
  }
  if(engine.tutorialHint && !engine.pickupCard && !engine.swap) {
    const hint=engine.tutorialHint;
    const key=hint.kind==='map'?actionPrompt(engine,'map'):hint.kind==='wheel'?actionPrompt(engine,'weapons'):actionPrompt(engine,'dash');
    const label=hint.kind==='map'?'ABRIR MAPA':hint.kind==='wheel'?'CAMBIAR ARMA':'ESQUIVAR';
    ctx.globalAlpha=Math.min(1,hint.timer/30);text(ctx,`${hint.kind==='wheel'?'USA':'PRESIONA'} ${key} · ${label}`,240,266,8,'#ccddba','center',true);ctx.globalAlpha=1;
  }
  for(const d of engine.damageNumbers) {
    ctx.globalAlpha=d.life;text(ctx,d.value===0?T.block:String(Math.round(d.value)),d.x,d.y,d.crit?11:8,d.crit?'#f9d889':'#f0ebd7','center',true);ctx.globalAlpha=1;
  }
  if(p.combo>=3 && p.comboTimer>0 && !engine.pickupCard) {
    ctx.globalAlpha=Math.min(.85,p.comboTimer/35);
    text(ctx,`${p.combo} · ${p.combo>=10?'ATRACO PERFECTO':p.combo>=6?'IMPARABLE':'RACHA'}`,468,280,7,'#bca969','right');ctx.globalAlpha=1;
  }

  // tarjeta de daño recibido
  if (p.flash > 6) {
    text(ctx, '¡AY!', p.x + 7, p.y - 6, 9, '#ff5b4f', 'center', true);
  }

  // indicadora de cambio de arma
  if (p.switchAnim > 0) {
    const a = p.switchAnim / 12;
    ctx.globalAlpha = a;
    text(ctx, activeWeapon(p).name, CANVAS_WIDTH / 2, CANVAS_HEIGHT - 76, 13, '#fff6c9', 'center', true);
    ctx.globalAlpha = 1;
  }

  // mensaje flotante
  if (engine.toastTimer > 0 && !engine.pickupCard) {
    const a = Math.min(1, engine.toastTimer / 30);
    ctx.globalAlpha = a;
    text(ctx, engine.toast, CANVAS_WIDTH / 2, CANVAS_HEIGHT - 70, 9, '#fff6c9');
    ctx.globalAlpha = 1;
  }

  // mantener R
  if (engine.restartHold > 0) {
    const pr = engine.restartHold / 48;
    drawPanel(ctx, CANVAS_WIDTH / 2 - 110, CANVAS_HEIGHT / 2 - 26, 220, 48);
    text(ctx, T.holdRestart, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 8, 11, '#ff9f43', 'center', true);
    drawBar(ctx, CANVAS_WIDTH / 2 - 80, CANVAS_HEIGHT / 2 + 2, 160, pr, '#f4d03f');
  }

  // pista de la rueda
  if (p.weapons.filter(Boolean).length > 1 && engine.run.time < 620 && engine.frame % 160 < 100) {
    text(ctx,`${actionPrompt(engine,'weapons')} · CAMBIAR ARMA`,240,244,7,'#8792a5');
  }

  if (engine.swap) renderSwapUI(engine);
  if (engine.activeSwap) renderActiveSwapUI(engine);
}

function renderActiveSwapUI(engine: GameEngine) {
  const ctx = engine.ui!;
  const req = engine.activeSwap!;
  const current = ACTIVE_ITEMS[engine.player.activeItem ?? ''] ?? ACTIVE_ITEMS.emergency_quack;
  const next = ACTIVE_ITEMS[req.itemId] ?? current;
  const box = ACTIVE_SWAP;
  ctx.fillStyle = 'rgba(4,5,12,.88)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  drawPanel(ctx, box.x, box.y, box.w, box.h, 'rgba(9,12,22,.98)', '#f4d03f');
  titleText(ctx, 'OBJETO ACTIVO ENCONTRADO', CANVAS_WIDTH / 2, box.y + 28, 14, '#ff9f43');
  text(ctx, 'El objeto actual se soltará al suelo.', CANVAS_WIDTH / 2, box.y + 46, 9, '#c3cbd9');
  drawItemIcon(ctx, box.x + 42, box.y + 62, next.id, 32);
  wrappedText(ctx, next.name, box.x + 82, box.y + 78, 170, 10, 12, 2, '#fff6c9', true);
  wrappedText(ctx, next.description, box.x + 42, box.y + 108, 210, 8, 11, 2, '#d8cfe8');
  text(ctx, 'ACTUAL', box.x + 42, box.y + 142, 8, '#8792a5', 'left', true);
  drawItemIcon(ctx, box.x + 42, box.y + 148, current.id, 24);
  wrappedText(ctx, current.name, box.x + 74, box.y + 164, 180, 9, 11, 1, '#e8c99b', true);
  ctx.fillStyle = 'rgba(244,208,63,.18)'; ctx.fillRect(box.confirm.x, box.confirm.y, box.confirm.w, box.confirm.h);
  ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.fillRect(box.cancel.x, box.cancel.y, box.cancel.w, box.cancel.h);
  text(ctx, `${actionPrompt(engine,'interact')} · CAMBIAR`, box.confirm.x + box.confirm.w / 2, box.confirm.y + 18, 8, '#f4d03f');
  text(ctx, `${engine.lastInput === 'gamepad' ? 'B' : 'ESC'} · CANCELAR`, box.cancel.x + box.cancel.w / 2, box.cancel.y + 18, 8, '#a9b3c4');
}

const isFull = (p: GameEngine['player']) => p.weapons.every(w => w !== null);

// ---------------------------------------------------------------------------
// HUD
// ---------------------------------------------------------------------------
function drawDangerEventHUD(engine:GameEngine){
  const room=currentRoomOf(engine),content:any=getContentOf(engine,room);
  if(room.type!==RoomType.EVENT||content.cafe||!content.dangerEventActive)return;
  const ctx=engine.ui!,en=getLocale()==='en-US',left=Math.max(0,content.enemies.length),timer=Math.max(0,content.dangerEventTimer??0),total=Math.max(1,content.dangerEventTotal??1),sec=(timer/60).toFixed(1),pulse=.55+.45*Math.sin(engine.frame*.13),x=92,y=27,w=296,h=61;
  ctx.save();ctx.fillStyle='rgba(14,8,10,.90)';ctx.fillRect(x,y,w,h);ctx.strokeStyle='rgba(255,79,67,'+(.7+pulse*.3)+')';ctx.lineWidth=2;ctx.strokeRect(x+1,y+1,w-2,h-2);ctx.fillStyle='rgba(255,79,67,.16)';ctx.fillRect(x+5,y+5,w-10,11);
  text(ctx,en?'HIGH-RISK EVENT':'EVENTO DE ALTO RIESGO',240,y+13,7.2,'#ff786b','center',true);
  if(timer>0)titleText(ctx,(en?'SURVIVE ':'SOBREVIVE ')+sec+' s',240,y+36,13.5,'#fff0c2');
  else titleText(ctx,en?'FINISH THE SECURITY':'ELIMINA A LOS RESTANTES',240,y+36,11.5,'#fff0c2');
  text(ctx,en?('SECURITY LEFT: '+left):('SEGURIDAD RESTANTE: '+left),240,y+49,6.8,left>0?'#ffb36b':'#86e3a0','center',true);
  ctx.fillStyle='rgba(255,255,255,.10)';ctx.fillRect(x+14,y+54,w-28,4);ctx.fillStyle=timer>0?'#e75c4c':'#d7ae4b';ctx.fillRect(x+14,y+54,(w-28)*(timer>0?timer/total:Math.min(1,left?0:1)),4);ctx.restore();
}
function drawHUD(engine: GameEngine) {
  const ctx = engine.ui!;
  const p = engine.player;

  // HUD compacto: información esencial, fondos translúcidos y más área de juego libre.
  const heartsShown=Math.min(p.maxHp,10);
  const heartsW=heartsShown*13+7;
  ctx.fillStyle='rgba(5,12,18,.48)';ctx.fillRect(4,4,heartsW,18);
  ctx.strokeStyle='rgba(244,208,63,.14)';ctx.strokeRect(4.5,4.5,heartsW-1,17);
  for(let i=0;i<p.maxHp;i++){
    ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(7+(i%10)*13,5+Math.floor(i/10)*13);
    if(p.hp<=1&&i===0)ctx.globalAlpha=.78+Math.sin(engine.frame*.055)*.2;
    drawHeart(ctx,0,0,i<p.hp,p.hp>i&&p.hp<i+1);
    if(p.healFlash>0&&i<p.hp){ctx.globalAlpha=p.healFlash/36;ctx.fillStyle='#badba4';ctx.fillRect(1,13,10,1);}
    ctx.restore();
  }
  if(p.shield>0||p.helmetShield||p.contactShield>0)text(ctx,`ESCUDO ${p.shield+p.contactShield+(p.helmetShield?1:0)}`,6,31,5.5,'#9fdae0','left');

  // Monedas: un único bloque pequeño en la esquina.
  const coinX=CANVAS_WIDTH-80;
  drawPanel(ctx,coinX,4,76,28,'rgba(5,12,18,.52)','rgba(115,133,146,.24)','rgba(31,48,57,.38)');
  drawItemIcon(ctx,coinX+4,5,'crumb',12);text(ctx,'MIGAJAS',coinX+19,12,5.2,'#899f98','left');text(ctx,`${p.crumbs}`,coinX+70,13,7.5,'#e8c99b','right',true);
  drawItemIcon(ctx,coinX+4,18,'golden_crumb',11);text(ctx,'MONEDAS',coinX+19,25,5.2,'#ac9a65','left');text(ctx,`${engine.totalGoldenCrumbs}`,coinX+70,26,7.5,'#f4d03f','right',true);

  // Piso sin caja opaca para no tapar la parte superior del escenario.
  text(ctx,`PISO ${engine.map.floorIndex+1}/${TOTAL_FLOORS}`,240,10,6.2,'#d3c999','center',true);
  text(ctx,FLOOR_NAMES_ES[engine.map.floorIndex],240,19,5.7,'#829c98');

  drawMinimap(engine);
  drawBossBar(engine);

  // Alerta sólo ocupa espacio cuando realmente importa.
  if(engine.alert>=5){
    const aw=62;
    ctx.fillStyle='rgba(5,12,18,.48)';ctx.fillRect(5,27,aw,12);
    text(ctx,`ALERTA ${Math.round(engine.alert)}`,8,33,5.5,engine.alert>60?'#ff8f7f':'#d4b47c','left',true);
    ctx.fillStyle='rgba(255,255,255,.08)';ctx.fillRect(8,35,54,2);
    ctx.fillStyle=engine.alert>60?'#e45b4f':'#c78868';ctx.fillRect(8,35,54*engine.alert/100,2);
  }

  // Armas: tarjetas más bajas, estrechas y translúcidas.
  const slotW=92,slotH=25,baseX=5,baseY=CANVAS_HEIGHT-slotH-5;
  for(let i=0;i<2;i++){
    const w=p.weapons[i],on=p.activeWeapon===i,x=baseX+i*(slotW+5),y=baseY-(on?2:0);
    ctx.save();
    if(on){ctx.shadowColor='rgba(244,208,63,.28)';ctx.shadowBlur=6;}
    drawPanel(ctx,x,y,slotW,slotH,on?'rgba(12,17,27,.64)':'rgba(6,9,15,.40)',on?'rgba(244,208,63,.78)':'rgba(70,79,94,.35)','rgba(42,52,65,.44)');
    ctx.restore();
    const slide=on&&p.switchAnim>0?(1-p.switchAnim/12)*4-4:0;
    ctx.save();ctx.translate(x+5+slide,y+5);ctx.scale(on?1.08:.92,on?1.08:.92);ctx.globalAlpha=on?1:.45;
    if(w)drawWeaponIcon(ctx,0,0,w.id);else{ctx.fillStyle='#202735';ctx.fillRect(3,6,11,4);ctx.fillStyle='#39414f';ctx.fillRect(5,10,3,3);}
    ctx.restore();
    wrappedText(ctx,`[${i+1}] ${w?w.name:T.empty}`,x+25,y+8,slotW-30,5.6,6.5,2,w?(on?'#efe1ac':'#84909f'):'#4f586a',on);
    if(w&&on){
      const rl=1-p.fireCooldown/Math.max(1,activeWeapon(p).fireRate);
      ctx.fillStyle='rgba(255,255,255,.08)';ctx.fillRect(x+26,y+18,57,3);
      ctx.fillStyle=rl>=1?'#39d353':'#f4d03f';ctx.fillRect(x+26,y+18,57*clamp(rl,0,1),3);
      ctx.fillStyle='#f4d03f';ctx.beginPath();ctx.moveTo(x-3,y+slotH/2);ctx.lineTo(x,y+slotH/2-4);ctx.lineTo(x,y+slotH/2+4);ctx.closePath();ctx.fill();
    }
  }

  // Objeto activo: misma prioridad visual, mucho menos volumen de pantalla.
  if(p.activeItem){
    const aw=86,ah=25,ax=CANVAS_WIDTH-aw-5,ay=CANVAS_HEIGHT-ah-5,ready=p.activeItemCooldown<=0,flash=p.quackReadyFlash>0;
    ctx.save();if(flash){ctx.shadowColor='#f4d03f';ctx.shadowBlur=7;}
    drawPanel(ctx,ax,ay,aw,ah,'rgba(6,9,15,.58)',flash?'rgba(255,243,176,.9)':ready?'rgba(244,208,63,.72)':'rgba(65,72,86,.35)','rgba(42,52,65,.42)');ctx.restore();
    ctx.save();ctx.translate(ax+5,ay+5);ctx.scale(ready?1.08:.95,ready?1.08:.95);ctx.globalAlpha=ready?1:.48;drawItem(ctx,0,0,p.activeItem,engine.frame);ctx.restore();
    const def=ACTIVE_ITEMS[p.activeItem];wrappedText(ctx,def?.name??'',ax+24,ay+8,aw-29,5.4,6.3,2,ready?'#eee1b2':'#7c8494',true);
    if(flash)text(ctx,'LISTO',ax+aw-6,ay+21,6.6,'#39d353','right',true);
    else if(ready)text(ctx,'LISTA',ax+aw-6,ay+21,6.2,'#39d353','right',true);
    else{text(ctx,`${(p.activeItemCooldown/(60*getBuild(p).cooldownRate)).toFixed(1)} s`,ax+aw-6,ay+21,5.7,'#7c8494','right');ctx.fillStyle='rgba(255,255,255,.08)';ctx.fillRect(ax+25,ay+18,48,2);ctx.fillStyle='#f4d03f';ctx.fillRect(ax+25,ay+18,48*(1-p.activeItemCooldown/p.activeItemMaxCooldown),2);}
  }

  // Esquive: indicador central mínimo.
  const dashReady=p.dashCooldown<=0,dashFlash=p.dashReadyFlash>0,dw=46,dx=CANVAS_WIDTH/2-dw/2;
  ctx.fillStyle='rgba(255,255,255,.07)';ctx.fillRect(dx,CANVAS_HEIGHT-15,dw,3);
  ctx.fillStyle=dashFlash?'#a3f0c2':dashReady?'#1abc9c':'#4f586a';ctx.fillRect(dx,CANVAS_HEIGHT-15,dw*clamp(1-p.dashCooldown/(45*getBuild(p).dashCooldown),0,1),3);
  text(ctx,engine.lastInput==='gamepad'?'B · ESQUIVE':'ESQUIVE',240,CANVAS_HEIGHT-5,5.3,dashReady?'#1abc9c':'#68717f','center',dashFlash);

  // Pasivos: tira discreta, sin gran bloque negro.
  if(p.items.length){
    const n=Math.min(p.items.length,8);ctx.fillStyle='rgba(5,12,18,.38)';ctx.fillRect(5,CANVAS_HEIGHT-48,n*14+6,14);
    for(let i=0;i<n;i++)drawItemIcon(ctx,8+i*14,CANVAS_HEIGHT-47,p.items[i],12);
    if(p.items.length>8)text(ctx,`+${p.items.length-8}`,12+n*14,CANVAS_HEIGHT-38,6,'#f4d03f','left');
  }
  drawDangerEventHUD(engine);
}

function drawBossBar(engine: GameEngine) {
  const ctx = engine.ui!;
  const content = getContentOf(engine);
  const boss = content.enemies.find((e: Enemy) => e.isBoss);
  if (!boss) return;
  const isFloorBoss = !!BOSSES[boss.bossType];
  const def = BOSSES[boss.bossType] ?? MINIBOSSES[boss.bossType];
  const w = isFloorBoss ? CANVAS_WIDTH - 120 : 220;
  const x = (CANVAS_WIDTH - w) / 2, y = isFloorBoss ? 74 : 72;
  text(ctx, def?.name ?? '', CANVAS_WIDTH / 2, y, isFloorBoss ? 14 : 11,
    isFloorBoss ? '#ff8f7f' : '#c9a227', 'center', true);
  ctx.fillStyle = 'rgba(4,6,12,0.85)';
  ctx.fillRect(x, y + 5, w, 10);
  const pct = clamp(boss.hp / boss.maxHp, 0, 1)*clamp(1-boss.spawnAnim/30,0,1);
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, '#c0392b');
  g.addColorStop(1, '#ff6b5b');
  ctx.fillStyle = g;
  ctx.fillRect(x + 1, y + 6, (w - 2) * pct, 8);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(x + 1, y + 6, (w - 2) * pct, 2);
  ctx.fillStyle = '#39414f';
  ctx.fillRect(x, y + 5, w, 1);
  ctx.fillRect(x, y + 14, w, 1);
  // segmentos de fase
  for (let i = 1; i < 3; i++) {
    ctx.fillStyle = 'rgba(4,6,12,0.9)';
    ctx.fillRect(x + (w / 3) * i, y + 5, 1, 10);
  }
}

function drawMinimap(engine: GameEngine) {
  const ctx=engine.ui!;
  const visible=visibleRoomKeys(engine);
  const rooms=[...visible].map(id=>engine.map.rooms.get(id)!);
  if(!rooms.length)return;
  const cell=7,gap=2,pad=4;
  const minX=Math.min(...rooms.map(r=>r.gx)),maxX=Math.max(...rooms.map(r=>r.gx));
  const minY=Math.min(...rooms.map(r=>r.gy)),maxY=Math.max(...rooms.map(r=>r.gy));
  const w=(maxX-minX+1)*(cell+gap)+pad*2-1;
  const h=(maxY-minY+1)*(cell+gap)+pad*2-1;
  const ox=CANVAS_WIDTH-w-5,oy=38;
  drawPanel(ctx,ox,oy,w,h,'rgba(4,6,12,.48)','rgba(98,112,128,.35)','rgba(42,52,65,.38)');
  for(const r of rooms){
    const x=ox+pad+(r.gx-minX)*(cell+gap),y=oy+pad+(r.gy-minY)*(cell+gap),cur=`${r.gx},${r.gy}`===engine.currentKey;
    ctx.fillStyle='rgba(180,190,210,.28)';for(const d of r.doors){const v=DIR_VECTORS[d];if(!visible.has(`${r.gx+v.x},${r.gy+v.y}`))continue;ctx.fillRect(x+cell/2+v.x*3,y+cell/2+v.y*3,1,1);}
    ctx.fillStyle=r.visited&&r.cleared?'#182b33':'#274752';ctx.fillRect(x,y,cell,cell);
    drawRoomSymbol(ctx,r,x+cell/2,y+cell/2,5.5,!!engine.contents.get(`${r.gx},${r.gy}`)?.stairs);
    if(cur){ctx.strokeStyle='rgba(255,255,255,.9)';ctx.lineWidth=1;ctx.strokeRect(x-1,y-1,cell+2,cell+2);}
  }
  text(ctx,`${actionPrompt(engine,'map')} · MAPA`,ox+w/2,oy+h+7,5.2,'#829fa5','center',true);
}

// ---------------------------------------------------------------------------
// PANTALLAS (sólo UI)
// ---------------------------------------------------------------------------
export const MENU_ITEMS = [
  { label: T.menuStart }, { label: T.menuUpgrades }, { label: T.menuWardrobe },
  { label: 'COLECCIÓN' }, { label: T.menuHowTo }, { label: T.menuSettings },
];

function drawDifficultySkull(ctx:CanvasRenderingContext2D,x:number,y:number,col:string){ctx.save();ctx.fillStyle=col;ctx.fillRect(x+1,y,6,1);ctx.fillRect(x,y+1,8,4);ctx.fillRect(x+2,y+5,4,2);ctx.fillStyle='#10151c';ctx.fillRect(x+1,y+2,2,2);ctx.fillRect(x+5,y+2,2,2);ctx.fillRect(x+3,y+4,2,1);ctx.fillRect(x+3,y+6,1,1);ctx.fillRect(x+5,y+6,1,1);ctx.restore();}function drawDifficultyLock(ctx:CanvasRenderingContext2D,x:number,y:number,col:string){ctx.save();ctx.fillStyle=col;ctx.fillRect(x+1,y+4,9,7);ctx.fillRect(x+3,y+1,5,1);ctx.fillRect(x+2,y+2,2,3);ctx.fillRect(x+7,y+2,2,3);ctx.fillStyle='#11151c';ctx.fillRect(x+5,y+6,1,3);ctx.restore();}function renderDifficultyUILegacy(engine:GameEngine){
  const ctx=engine.ui!,x=58,w=364,top=72,h=51,gap=5;
  drawPanel(ctx,30,22,420,306,'rgba(7,11,18,.94)','rgba(77,92,106,.72)','rgba(34,43,54,.72)');
  titleText(ctx,'ELIGE LA DIFICULTAD DEL ATRACO',240,46,14,'#f4d03f');
  text(ctx,'Puedes cambiarla al comenzar cada nueva partida.',240,60,5.8,'#7f919a','center');
  DIFFICULTY_ORDER.forEach((id,i)=>{
    const p=DIFFICULTY_PROFILES[id],y=top+i*(h+gap),on=engine.difficultyIndex===i,locked=id==='mad'&&!engine.madUnlocked;
    const col=locked?'#9a6570':id==='easy'?'#91d49b':id==='normal'?'#f4d03f':id==='hard'?'#f29a55':'#ff665e';const hoverFill=id==='easy'?'rgba(25,61,37,.95)':id==='normal'?'rgba(62,51,18,.95)':id==='hard'?'rgba(69,38,19,.95)':'rgba(69,22,28,.95)';
    ctx.save();if(on){ctx.shadowColor=col;ctx.shadowBlur=9;}
    drawPanel(ctx,x,y,w,h,on?hoverFill:'rgba(10,16,23,.82)',on?col:'rgba(71,84,97,.5)','rgba(35,45,55,.55)');ctx.restore();
    const labelX=x+18+(locked?16:0);if(locked)drawDifficultyLock(ctx,x+17,y+10,col);titleText(ctx,p.label,labelX,y+19,9,col,'left');const skullX=labelX+Math.min(126,p.label.length*5.8+8);for(let skull=0;skull<i+1;skull++)drawDifficultySkull(ctx,skullX+skull*11,y+11,col);
    wrappedText(ctx,locked?'Completa un atraco para desbloquearlo.':p.desc,x+18,y+31,w-36,5.5,6.4,2,locked?'#8a6870':'#8fa0aa');
    if(on){text(ctx,'›',x-10,y+29,13,col);text(ctx,'‹',x+w+10,y+29,13,col);}
  });
  text(ctx,engine.lastInput==='gamepad'?'CRUCETA · ELEGIR     A · CONFIRMAR     B · VOLVER':'W / S · ELEGIR     ENTER · CONFIRMAR     ESC · VOLVER',240,316,5.6,'#71858b','center');
}

function renderMenuUILegacy(engine: GameEngine) {
  const ctx = engine.ui!;
  drawTitleLogo(ctx, CANVAS_WIDTH / 2, 62, engine.frame);
  text(ctx,'SE BUSCA UN CÓMPLICE',MAIN_MENU.x+MAIN_MENU.w/2,115,7,'#c9b27a','center',true);
  MENU_ITEMS.forEach((item,i)=>{
    const on=i===engine.menuIndex,x=MAIN_MENU.x,y=MAIN_MENU.y+i*(MAIN_MENU.h+MAIN_MENU.gap),w=MAIN_MENU.w,h=MAIN_MENU.h;
    ctx.save();if(on) {ctx.shadowColor='#e8b95066';ctx.shadowBlur=15;ctx.translate(x+w/2,y+h/2);ctx.scale(1.025,1.025);ctx.translate(-x-w/2,-y-h/2);}
    ctx.fillStyle=on?'#d9bc70':'rgba(18,36,42,.95)';ctx.fillRect(x,y,w,h);
    ctx.strokeStyle=on?'#fff0b0':'#3b5355';ctx.lineWidth=1;ctx.strokeRect(x+.5,y+.5,w-1,h-1);
    ctx.fillStyle=on?'#f5dc92':'#203a42';ctx.fillRect(x+3,y+2,w-6,1);
    ctx.fillStyle=on?'#8c6b39':'#0a1b22';ctx.fillRect(x+3,y+h-3,w-6,1);
    if(on) {ctx.fillStyle='rgba(255,255,220,.13)';ctx.fillRect(x+3+(engine.frame*.6)%(w-24),y+3,20,h-6);}
    text(ctx,item.label,x+w/2,y+15,9,on?'#17262a':'#b7c5b6','center',true,false);
    if(on) {text(ctx,'›',x-9,y+15,14,'#e7c87f');text(ctx,'‹',x+w+9,y+15,14,'#e7c87f');}
    ctx.restore();
  });
  text(ctx,T.tagline,240,326,9,'#dbbd77','center',true);
  text(ctx,engine.lastInput==='gamepad'?'CRUCETA · ELEGIR     A · CONFIRMAR':'W / S · ELEGIR     ENTER · CONFIRMAR',30,348,6,'#738b89','left');
  drawItemIcon(ctx,368,337,'golden_crumb',13);text(ctx,`${engine.totalGoldenCrumbs} MONEDAS`,389,348,6,'#ac9f75','left');
}

function renderHowToPlayUILegacy(engine: GameEngine) {
  const ctx = engine.ui!;
  drawPanel(ctx, 20, 14, CANVAS_WIDTH - 40, CANVAS_HEIGHT - 34);
  titleText(ctx, T.howToTitle, CANVAS_WIDTH / 2, 40, 18, '#f4d03f');

  const gamepad=engine.lastInput==='gamepad';
  const rows:[string,string][] = gamepad?[
    ['PALANCA IZQUIERDA','Moverse'],['PALANCA DERECHA + RT','Apuntar y disparar'],['B','Esquivar'],['A','Interactuar / recoger'],['Y','Objeto activo'],['LB / RB','Cambiar arma'],['VIEW','Abrir mapa'],['START','Pausa'],
  ]:[
    ['WASD','Moverse'],['FLECHAS / CLIC IZQUIERDO','Disparar'],['SHIFT / CLIC DERECHO','Esquivar'],['E','Interactuar / recoger'],['ESPACIO','Objeto activo'],['RUEDA DEL MOUSE','Cambiar arma'],['M','Abrir mapa'],['R · MANTENER','Reiniciar partida'],['ESC','Pausa'],
  ];
  rows.forEach(([k,v],i)=>{const y=60+i*17;ctx.fillStyle='#1c343d';ctx.fillRect(37,y-9,158,14);text(ctx,k,44,y,7.5,'#d9cb92','left',true);text(ctx,v,207,y,8,'#d1ded4','left');});
  const instructions=['Explora salas y derrota enemigos para abrir las puertas.','El pan recupera vida. Las monedas se guardan.','Elige dos armas, encuentra objetos y crea sinergias.','Derrota al jefe, recoge el botín y baja al siguiente piso.','El mapa pausa el combate. No permite transportarte.'];
  instructions.forEach((line,i)=>text(ctx,line,240,228+i*14,7.8,'#a4bcb9'));
  text(ctx,gamepad?'B · VOLVER':'ESC · VOLVER',240,322,9,'#dfc582','center',true);
}

function drawSettingSegmentsV2(ctx:CanvasRenderingContext2D,x:number,y:number,count:number,active:number,on:boolean){const gap=2,w=7;for(let i=0;i<count;i++){ctx.fillStyle=i<=active?(on?'#f4d03f':'#778395'):'#252d3a';ctx.fillRect(x+i*(w+gap),y,w,7);ctx.fillStyle=i<=active?'rgba(255,255,255,.16)':'rgba(255,255,255,.04)';ctx.fillRect(x+i*(w+gap)+1,y+1,w-2,1);}}
function drawMuteButtonV2(ctx:CanvasRenderingContext2D,engine:GameEngine){const b=SETTINGS_MUTE;const muted=engine.settings.muted;ctx.fillStyle=muted?'rgba(226,82,92,.16)':'rgba(244,208,63,.10)';ctx.fillRect(b.x,b.y,b.w,b.h);ctx.strokeStyle=muted?'#e45b67':'#7b6c37';ctx.strokeRect(b.x+.5,b.y+.5,b.w-1,b.h-1);ctx.fillStyle=muted?'#e45b67':'#f4d03f';ctx.fillRect(b.x+5,b.y+7,4,5);ctx.fillRect(b.x+9,b.y+5,3,9);if(muted){for(let i=0;i<4;i++){ctx.fillRect(b.x+15+i*2,b.y+5+i*2,2,2);ctx.fillRect(b.x+21-i*2,b.y+5+i*2,2,2);}}else{ctx.fillRect(b.x+15,b.y+6,2,7);ctx.fillRect(b.x+18,b.y+8,2,3);}}
function renderSettingsUILegacy(engine:GameEngine){
  const ctx=engine.ui!;drawPanel(ctx,50,22,CANVAS_WIDTH-100,CANVAS_HEIGHT-48,'rgba(8,12,22,.96)','#f4d03f','#39414f');
  titleText(ctx,T.settingsTitle,CANVAS_WIDTH/2,51,17,'#f4d03f');drawMuteButtonV2(ctx,engine);
  SETTING_ROWS.forEach((row,i)=>{const y=SETTINGS.y+i*(SETTINGS.h+SETTINGS.gap),on=i===engine.settingsIndex,v=settingValue(engine,i);ctx.fillStyle=on?'rgba(244,208,63,.12)':'rgba(255,255,255,.035)';ctx.fillRect(SETTINGS.x,y,SETTINGS.w,SETTINGS.h);if(on){ctx.fillStyle='#f4d03f';ctx.fillRect(SETTINGS.x,y,3,SETTINGS.h);ctx.strokeStyle='rgba(244,208,63,.42)';ctx.strokeRect(SETTINGS.x+.5,y+.5,SETTINGS.w-1,SETTINGS.h-1);}text(ctx,row.label,SETTINGS.x+10,y+13,7.7,on?'#fff4c2':'#aab4c2','left',on);
    if(row.kind==='vol'){drawSettingSegmentsV2(ctx,304,y+5,10,Math.max(-1,Math.round(v*10)-1),on);text(ctx,Math.round(v*100)+'%',405,y+13,7.5,on?'#fff4c2':'#8792a5','right',on);}
    else if(row.kind==='shake'){drawSettingSegmentsV2(ctx,304,y+5,10,Math.max(-1,Math.round(v*10)-1),on);text(ctx,Math.round(v*100)+'%',405,y+13,7.5,on?'#fff4c2':'#8792a5','right',on);}
    else if(row.kind==='brightness'){drawSettingSegmentsV2(ctx,304,y+5,10,Math.max(-1,Math.round(v*10)-1),on);text(ctx,Math.round(v*100)+'%',405,y+13,7.5,on?'#fff4c2':'#8792a5','right',on);}
    else if(row.kind==='language'){text(ctx,'‹',314,y+13,10,on?'#f4d03f':'#657080');text(ctx,v>.5?'ENGLISH':'ESPAÑOL',360,y+13,7.5,on?'#fff4c2':'#aab4c2');text(ctx,'›',408,y+13,10,on?'#f4d03f':'#657080');}
    else if(row.kind==='cursor'){text(ctx,'‹',300,y+13,10,on?'#f4d03f':'#657080');ctx.fillStyle=on?'rgba(244,208,63,.10)':'rgba(255,255,255,.025)';ctx.fillRect(337,y+1,34,16);ctx.strokeStyle=on?'rgba(244,208,63,.32)':'rgba(101,112,128,.22)';ctx.strokeRect(337.5,y+1.5,33,15);drawCursorPreview(ctx,354,y+9,Math.round(v));text(ctx,'›',408,y+13,10,on?'#f4d03f':'#657080');}
    else{text(ctx,row.kind==='action'?'REPRODUCIR':v>.5?T.on:T.off,405,y+13,7.6,row.kind==='action'?(on?'#f4d03f':'#aab4c2'):v>.5?'#39d353':'#b5c2b7','right',true);}
  });
  text(ctx,engine.settings.muted?'SONIDO SILENCIADO · CLIC EN LA BOCINA PARA ACTIVAR':'BOCINA · SILENCIAR TODO',404,58,4.8,engine.settings.muted?'#e77a82':'#8f997e','right');
  text(ctx,engine.lastInput==='gamepad'?'CRUCETA · AJUSTAR     A · CAMBIAR     B · VOLVER':'FLECHAS · AJUSTAR     CLIC · ELEGIR NIVEL     M · SILENCIAR     ESC · VOLVER',240,321,6.2,'#91aaa6');
}

function renderWardrobeUILegacy(engine: GameEngine) {
  const ctx = engine.ui!;
  drawPanel(ctx, 14, 12, CANVAS_WIDTH - 28, CANVAS_HEIGHT - 24);
  titleText(ctx, T.wardrobeTitle, CANVAS_WIDTH / 2, 34, 18, '#f4d03f');
  text(ctx,`ASPECTOS ${engine.unlockedSkins.length} / ${SKINS.length}`,450,33,6,'#96b1aa','right');

  // Monedas permanentes
  drawCoin(ctx, CANVAS_WIDTH / 2 - 80, 48, engine.frame, true);
  text(ctx, `${T.permCurrency}: ${engine.totalGoldenCrumbs}`, CANVAS_WIDTH / 2, 52, 11, '#f4d03f', 'center', true);

  // --- PANEL IZQUIERDO (PREVIEW GRANDE FIJO) ---
  const sel = engine.wardrobeIndex;
  const skin = SKINS[sel] ?? SKINS[0];
  const pvx = 26, pvy = 62, pw = 164, ph = 240;

  drawPanel(ctx, pvx, pvy, pw, ph, 'rgba(14,18,30,0.85)', '#2f3644');

  // Escaparate iluminado del pato
  ctx.fillStyle = 'rgba(244,208,63,0.06)';
  ctx.fillRect(pvx + 8, pvy + 8, pw - 16, 120);
  ctx.strokeStyle = '#39414f';
  ctx.strokeRect(pvx + 8, pvy + 8, pw - 16, 120);

  // Luz cenital sobre el pato
  const g = ctx.createRadialGradient(pvx + pw / 2, pvy + 36, 4, pvx + pw / 2, pvy + 54, 58);
  g.addColorStop(0, 'rgba(255,240,150,0.22)');
  g.addColorStop(1, 'rgba(255,240,150,0)');
  ctx.fillStyle = g;
  ctx.fillRect(pvx + 8, pvy + 8, pw - 16, 120);

  ctx.save();
  ctx.translate(pvx + pw / 2, pvy + 77+Math.round(Math.sin(engine.frame*.04)));
  ctx.scale(4,4);
  drawDuckSkin(ctx,-8,-8,engine.frame,skin.id,engine.frame%900>750?'left':'down',false,false,false);
  ctx.restore();

  // Nombre y descripción cómica
  wrappedText(ctx,skin.name,pvx+14,pvy+147,pw-28,10,13,2,'#ead8a0',true);
  wrappedText(ctx,`“${skin.description}”`,pvx+14,pvy+177,pw-28,8,10,3,'#92aaa3');

  // Botón EQUIPAR / COMPRAR / EQUIPADO
  const unlocked = engine.unlockedSkins.includes(skin.id);
  const equipped = engine.equippedSkin === skin.id;
  const affordable = engine.totalGoldenCrumbs >= skin.cost;
  const bx = WARDROBE_ACTION.x+WARDROBE_ACTION.w/2, by = WARDROBE_ACTION.y+14;

  if (equipped) {
    ctx.fillStyle = '#1c5c33';
    ctx.fillRect(bx - 56, by - 14, 112, 24);
    ctx.fillStyle = '#39d353';
    ctx.fillRect(bx - 56, by - 14, 112, 1);
    ctx.fillRect(bx - 56, by + 9, 112, 1);
    titleText(ctx, `✓ ${T.equipped}`, bx, by + 4, 11, '#39d353', 'center');
  } else if (unlocked) {
    ctx.save();
    ctx.shadowColor = '#f4d03f';
    ctx.shadowBlur = 8;
    ctx.fillStyle = 'rgba(244,208,63,0.2)';
    ctx.fillRect(bx - 56, by - 14, 112, 24);
    ctx.fillStyle = '#f4d03f';
    ctx.fillRect(bx - 56, by - 14, 112, 1);
    ctx.fillRect(bx - 56, by + 9, 112, 1);
    text(ctx,engine.lastInput==='gamepad'?'A · EQUIPAR ASPECTO':'EQUIPAR ASPECTO',bx,by+4,8,'#f4d03f','center',true);
    ctx.restore();
  } else {
    ctx.fillStyle = affordable ? 'rgba(244,208,63,0.12)' : 'rgba(255,255,255,0.03)';
    ctx.fillRect(bx - 56, by - 14, 112, 24);
    ctx.fillStyle = affordable ? '#f4d03f' : '#4a5262';
    ctx.fillRect(bx - 56, by - 14, 112, 1);
    ctx.fillRect(bx - 56, by + 9, 112, 1);
    text(ctx,`${engine.lastInput==='gamepad'?'A · ':''}COMPRAR ASPECTO · ${skin.cost}`,bx,by+4,6.8,affordable?'#f4d03f':'#ff5b4f','center',true);
  }

  // --- PANEL DERECHO: CUADRÍCULA SCROLLABLE (3 COLUMNAS X MÚLTIPLES FILAS) ---
  const cols=WARDROBE.cols,cellW=WARDROBE.cellW,cellH=WARDROBE.cellH,gridX=WARDROBE.x,gridY=WARDROBE.y;
  const totalRows=Math.ceil(SKINS.length/cols);
  const maxScroll=Math.max(0,totalRows*(cellH+WARDROBE.gap)-WARDROBE.gap-WARDROBE.h);
  const scroll=engine.wardrobeScroll;

  // Marco de la cuadrícula
  ctx.fillStyle='rgba(10,25,31,.72)';ctx.fillRect(gridX-4,gridY-3,WARDROBE.w+2,WARDROBE.h+6);

  // Scrollbar sutil
  if (maxScroll>0) {
    const sbX=gridX+WARDROBE.w-7,sbY=gridY,sbH=WARDROBE.h;
    ctx.fillStyle = '#1a1f2c';
    ctx.fillRect(sbX, sbY, 4, sbH);
    const thumbH=sbH*sbH/(maxScroll+sbH);
    const thumbY=sbY+scroll/maxScroll*(sbH-thumbH);
    ctx.fillStyle = '#f4d03f';
    ctx.fillRect(sbX, thumbY, 4, thumbH);
  }
  ctx.save();ctx.beginPath();ctx.rect(gridX-1,gridY,WARDROBE.w-12,WARDROBE.h);ctx.clip();
  SKINS.forEach((s, i) => {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const cx=gridX+c*(cellW+WARDROBE.gap);
    const cy=gridY+r*(cellH+WARDROBE.gap)-scroll;
    if(cy+cellH<gridY || cy>gridY+WARDROBE.h) return;
    const on = i === sel;
    const isUnlocked = engine.unlockedSkins.includes(s.id);
    const isEq = engine.equippedSkin === s.id;

    ctx.save();
    if (on) {
      ctx.shadowColor = '#f4d03f';
      ctx.shadowBlur = 8;
    }
    ctx.fillStyle = on ? 'rgba(244,208,63,0.18)' : 'rgba(255,255,255,0.03)';
    ctx.fillRect(cx, cy, cellW, cellH);
    ctx.fillStyle = on ? '#f4d03f' : '#2f3644';
    ctx.fillRect(cx, cy, cellW, on ? 2 : 1);
    ctx.fillRect(cx, cy + cellH - 1, cellW, 1);
    ctx.fillRect(cx, cy, 1, cellH);
    ctx.fillRect(cx + cellW - 1, cy, 1, cellH);
    ctx.restore();

    // Pato pequeño animado
    ctx.save();
    ctx.translate(cx+cellW/2,cy+30);
    ctx.scale(2,2);
    ctx.globalAlpha=isUnlocked?1:.63;
    drawDuckSkin(ctx, -8, -8, engine.frame + i * 7, s.id, 'down', false, false, false);
    ctx.restore();

    // Nombre de skin
    wrappedText(ctx,s.name,cx+7,cy+60,cellW-14,7.4,9,2,isUnlocked?'#e3dfbb':'#91a29c',true);

    // Estado / precio
    if (isEq) {
      text(ctx,'✓ EQUIPADO',cx+cellW/2,cy+86,6.5,'#70bc93','center',true);
    } else if (isUnlocked) {
      text(ctx,'DISPONIBLE',cx+cellW/2,cy+86,6.5,'#8da59f');
    } else {
      drawItemIcon(ctx,cx+13,cy+76,'golden_crumb',13);
      text(ctx,`${s.cost}`,cx+38,cy+86,8,'#cfb875','left',true);
    }
  });
  ctx.restore();

  text(ctx,engine.lastInput==='gamepad'?'ASPECTOS · CRUCETA PARA EXPLORAR     A · COMPRAR / EQUIPAR     B · VOLVER':'ASPECTOS · RUEDA DEL MOUSE PARA EXPLORAR     ENTER · COMPRAR / EQUIPAR     ESC · VOLVER',240,331,6.2,'#7c9492');
}

function renderUpgradesUILegacy(engine: GameEngine) {
  const ctx = engine.ui!;
  drawPanel(ctx, 26, 16, CANVAS_WIDTH - 52, CANVAS_HEIGHT - 34);
  titleText(ctx, T.upgradesTitle, CANVAS_WIDTH / 2, 40, 17, '#f4d03f');
  drawCoin(ctx, CANVAS_WIDTH / 2 - 52, 58, engine.frame, true);
  text(ctx, `${T.upgradesCurrency}: ${engine.totalGoldenCrumbs}`, CANVAS_WIDTH / 2 + 4, 62, 12, '#f4d03f', 'center', true);

  META_UPGRADES.forEach((up, i) => {
    const y = 82 + i * 44;
    const lvl = engine.metaLevels[up.id] ?? 0;
    const maxed = lvl >= up.maxLevel;
    const cost = up.cost * (lvl + 1);
    const sel = i === engine.upgradeIndex;
    ctx.fillStyle = sel ? 'rgba(244,208,63,0.14)' : 'rgba(255,255,255,0.03)';
    ctx.fillRect(40, y - 12, CANVAS_WIDTH - 80, 40);
    titleText(ctx, up.name, 50, y + 4, 13, maxed ? '#39d353' : sel ? '#fff6c9' : '#c3cbd9', 'left');
    text(ctx, up.description, 50, y + 20, 10, '#8792a5', 'left', false);
    for (let l = 0; l < up.maxLevel; l++) {
      ctx.fillStyle = l < lvl ? '#f4d03f' : '#2f3644';
      ctx.fillRect(CANVAS_WIDTH - 150 + l * 12, y - 4, 9, 9);
    }
    text(ctx, maxed ? T.upgradeBought : `${cost}`, CANVAS_WIDTH - 48, y + 16,
      9, maxed ? '#39d353' : engine.totalGoldenCrumbs >= cost ? '#f4d03f' : '#ff5b4f', 'right', true);
  });

  text(ctx,engine.lastInput==='gamepad'?'A · COMPRAR':'ENTER · COMPRAR',240,308,9,'#a9b3c4');
  text(ctx,engine.lastInput==='gamepad'?'B · VOLVER':'ESC · VOLVER',240,324,9,'#f4d03f','center',true);
}

function renderFloorIntroUI(engine: GameEngine) {
  const ctx = engine.ui!;
  const t = engine.floorIntroTimer;
  const a = t > 80 ? (110 - t) / 30 : Math.min(1, t / 30);
  ctx.fillStyle = `rgba(4,6,14,${0.9 * clamp(a, 0, 1)})`;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.globalAlpha = clamp(a, 0, 1);
  const slide = (1 - clamp(a, 0, 1)) * 26;
  ctx.fillStyle = '#f4d03f';
  ctx.fillRect(CANVAS_WIDTH / 2 - 130, CANVAS_HEIGHT / 2 - 34 + slide, 260, 2);
  ctx.fillRect(CANVAS_WIDTH / 2 - 130, CANVAS_HEIGHT / 2 + 30 + slide, 260, 2);
  titleText(ctx, `${T.floor} ${engine.map.floorIndex + 1}/6`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 4 + slide, 26, '#f4d03f');
  drawItemIcon(ctx,228,110+slide,['crumb','stolen_helmet','baguette','toaster','golden_crumb','pan_dorado'][engine.map.floorIndex],24);
  text(ctx, FLOOR_NAMES_ES[engine.map.floorIndex], CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20 + slide, 14, '#e8c99b', 'center', true);
  if (engine.map.floorIndex > 0) {
    text(ctx, 'LA SEGURIDAD ES MÁS DURA AQUÍ', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40 + slide, 10, '#8792a5');
  }
  ctx.globalAlpha = 1;
}

function renderBossIntroUI(engine: GameEngine) {
  const ctx = engine.ui!;
  const t = engine.bossIntroTimer;
  ctx.fillStyle = 'rgba(4,6,14,0.82)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  const a = Math.min(1, (115 - t) / 18);
  ctx.globalAlpha = clamp(a, 0, 1);
  ctx.fillStyle = '#8a2c2c';
  ctx.fillRect(0, CANVAS_HEIGHT / 2 - 42, CANVAS_WIDTH, 3);
  ctx.fillRect(0, CANVAS_HEIGHT / 2 + 39, CANVAS_WIDTH, 3);
  ctx.fillStyle = 'rgba(140,30,30,0.22)';
  ctx.fillRect(0, CANVAS_HEIGHT / 2 - 39, CANVAS_WIDTH, 78);
  const blink = (engine.frame % 40) < 22;
  text(ctx, `\u26A0 ${T.warning} \u26A0`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 26, 12, blink ? '#ff5b4f' : '#8a2c2c', 'center', true);
  titleText(ctx, engine.bossIntroName, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 4, 22, '#f4d03f');
  text(ctx, engine.bossIntroSubtitle, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 24, 12, '#e8c99b', 'center', true);
  if (t < 60) text(ctx, 'ENTER para saltar', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 44, 9, '#5c6472');
  ctx.globalAlpha = 1;
}

function renderFloorClearUI(engine: GameEngine) {
  const ctx = engine.ui!;
  const t = engine.floorClearTimer;
  const a = clamp(t / 30, 0, 1) * clamp((120 - t) / 20, 0, 1);
  ctx.fillStyle = `rgba(4,5,12,${0.92 * clamp(a + 0.2, 0, 1)})`;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.globalAlpha = clamp(a, 0, 1);
  titleText(ctx, T.floorComplete, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 14, 22, '#39d353');
  text(ctx, T.descending, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 8, 12, '#a9b3c4', 'center', true);
  const dots = '.'.repeat(1 + Math.floor(engine.frame / 14) % 3);
  text(ctx,engine.map.floorIndex+1>=TOTAL_FLOORS?'SALIDA DEL BANCO':`${T.floor} ${engine.map.floorIndex+2}/6${dots}`,240,206,12,'#f4d03f','center',true);
  ctx.globalAlpha = 1;
}

function renderPausedUILegacy(engine: GameEngine) {
  const ctx = engine.ui!;
  ctx.fillStyle = 'rgba(4,6,14,0.8)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  drawPanel(ctx, 42, 18, CANVAS_WIDTH - 84, CANVAS_HEIGHT - 36);
  titleText(ctx, T.paused, CANVAS_WIDTH / 2, 48, 24, '#f4d03f');
  ctx.fillStyle = '#8a2c2c';
  ctx.fillRect(CANVAS_WIDTH / 2 - 60, 55, 120, 2);

  const items = [
    { label: T.resume }, {label:'MAPA'}, { label: T.restartRun }, { label: T.menuHowTo },
    { label: T.menuSettings }, { label: T.backToMenu },
  ];
  drawButtons(ctx,items,engine.pauseIndex,240,PAUSE_MENU.y,engine.frame,PAUSE_MENU.w,PAUSE_MENU.h,PAUSE_MENU.gap);

  text(ctx, T.controls, CANVAS_WIDTH / 2, 220, 11, '#8792a5', 'center', true);
  const rows: [string, string][] = engine.lastInput==='gamepad'?[
    ['PALANCA','Moverse'],['RT','Disparar'],['B','Esquivar'],['Y','Objeto activo'],['A','Interactuar'],['VIEW','Mapa'],
  ]:[
    [T.keyMove, T.ctrlMove], [T.keyShoot, T.ctrlShoot], [T.keyDash, T.ctrlDash],
    [T.keyItem, T.ctrlItem], [T.keyInteract, T.ctrlInteract], [T.keyRestart, T.ctrlRestart],
  ];
  rows.forEach(([k, v], i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = CANVAS_WIDTH / 2 - 128 + col * 132;
    const y = 236 + row * 16;
    ctx.fillStyle = 'rgba(244,208,63,0.10)';
    ctx.fillRect(x, y - 10, 48, 13);
    text(ctx, k, x + 24, y, 8, '#f4d03f', 'center', true);
    wrappedText(ctx,v,x+54,y,76,7,9,2,'#a9b3c4');
  });
  text(ctx,'DIFICULTAD',240,282,5.2,'#697882','center');text(ctx,difficultyLabel(engine),240,292,6.2,'#d9bd70','center',true);
  text(ctx,`SEMILLA · ${engine.run.seed}`,240,300,9,'#d4bb7b','center',true);
  text(ctx,`${actionPrompt(engine,'weapons')} · CAMBIAR ARMA    ${engine.lastInput==='gamepad'?'B':'CLIC DERECHO'} · ESQUIVAR`,240,315,6.5,'#768f8f');
}

function renderSwapUI(engine: GameEngine) {
  const ctx = engine.ui!;
  const req = engine.swap!;
  const p = engine.player;
  ctx.fillStyle = 'rgba(4,5,12,0.88)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const w = 410, h = 250;
  const x = CANVAS_WIDTH / 2 - w / 2, y = CANVAS_HEIGHT / 2 - h / 2;
  drawPanel(ctx, x, y, w, h, 'rgba(9,12,22,0.98)', '#f4d03f');
  titleText(ctx, T.inventoryFull, CANVAS_WIDTH / 2, y + 26, 18, '#ff9f43');
  text(ctx, T.replaceQuestion, CANVAS_WIDTH / 2, y + 42, 11, '#e8c99b', 'center', true);

  // arma en el suelo (nueva)
  const newW = WEAPONS[req.itemId];
  const px = x + 16, py = y + 54;
  ctx.fillStyle = 'rgba(255,159,67,0.12)';
  ctx.fillRect(px, py, w - 32, 44);
  ctx.strokeStyle = '#f4a72b';
  ctx.lineWidth = 1;
  ctx.strokeRect(px, py, w - 32, 44);
  text(ctx, T.onFloor, px + 8, py + 13, 9, '#8792a5', 'left', true);
  ctx.save();
  ctx.translate(px + 8, py + 18);
  ctx.scale(1.2, 1.2);
  drawWeaponIcon(ctx, 0, 0, newW.id);
  ctx.restore();
  wrappedText(ctx,newW.name,px+40,py+24,w-85,10,12,1,RARITY_COLORS[newW.rarity],true);
  wrappedText(ctx,newW.special,px+40,py+38,w-85,8,10,1,'#c3cbd9');

  // tus armas (con iluminación clara de selección y comparación de estadísticas)
  text(ctx, T.yours, x + 16, y + 112, 10, '#8792a5', 'left', true);
  for (let i = 0; i < 2; i++) {
    const w2 = p.weapons[i]!;
    const bw = (w - 40) / 2;
    const bx = x + 16 + i * (bw + 8);
    const by = y + 120;
    const sel = engine.swapSel === i;

    ctx.save();
    if (sel) {
      ctx.shadowColor = '#f4d03f';
      ctx.shadowBlur = 10;
    }
    ctx.fillStyle = sel ? 'rgba(244,208,63,0.18)' : 'rgba(255,255,255,0.03)';
    ctx.fillRect(bx, by, bw, 84);
    ctx.fillStyle = sel ? '#f4d03f' : '#2f3644';
    ctx.fillRect(bx, by, bw, sel ? 2 : 1);
    ctx.fillRect(bx, by + 83, bw, 1);
    ctx.fillRect(bx, by, 1, 84);
    ctx.fillRect(bx + bw - 1, by, 1, 84);
    ctx.restore();

    text(ctx, `${T.slot} ${i + 1}`, bx + 8, by + 14, 9, sel ? '#fff6c9' : '#8792a5', 'left', true);
    wrappedText(ctx,w2.name,bx+36,by+25,bw-42,8,10,1,sel?'#fff6c9':'#a9b3c4',true);
    text(ctx, RARITY_NAMES[w2.rarity], bx + bw - 8, by + 14, 8, RARITY_COLORS[w2.rarity], 'right', true);

    ctx.save();
    ctx.translate(bx + 8, by + 18);
    ctx.scale(1.15, 1.15);
    ctx.globalAlpha = sel ? 1 : 0.6;
    drawWeaponIcon(ctx, 0, 0, w2.id);
    ctx.restore();

    // Comparación de estadísticas si está seleccionada
    if (sel) {
      const statsComp: [string, number, number][] = [
        [T.statDmg, newW.bars.dmg, w2.bars.dmg],
        [T.statRate, newW.bars.rate, w2.bars.rate],
        [T.statRange, newW.bars.range, w2.bars.range],
        [T.statSpeed, newW.bars.speed, w2.bars.speed],
      ];
      statsComp.forEach(([label, newV, curV], si) => {
        const sy = by + 38 + si * 10;
        const diff = newV - curV;
        text(ctx, label, bx + 8, sy + 3, 5.8, '#a0b2b3', 'left');
        for (let b = 0; b < 5; b++) {
          ctx.fillStyle = b < newV ? (diff > 0 ? '#39d353' : diff < 0 ? '#ff5b4f' : '#f4d03f') : 'rgba(255,255,255,0.12)';
          ctx.fillRect(bx + 103 + b * 9, sy - 3, 7, 5);
        }
        const diffLabel = diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : '=';
        const diffCol = diff > 0 ? '#39d353' : diff < 0 ? '#ff5b4f' : '#8792a5';
        text(ctx, diffLabel, bx + bw - 8, sy + 3, 8, diffCol, 'right', true);
      });
      titleText(ctx, '\u25BC REEMPLAZAR', bx + bw / 2, by - 4, 9, '#f4d03f');
    } else {
      wrappedText(ctx,w2.special,bx+8,by+49,bw-16,7.5,10,2,'#7c8494');
    }
  }

  const old=p.weapons[engine.swapSel];
  text(ctx,`ACTUAL: ${old?.description ?? ''}`,240,y+h-34,7,'#8ea4a3');
  text(ctx,engine.lastInput==='gamepad'?'CRUCETA · ELEGIR     A · REEMPLAZAR':'1 / 2 · ELEGIR · CLIC O ENTER/E PARA CONFIRMAR',240,y+h-20,8,'#e8c99b','center',true);
  text(ctx,engine.lastInput==='gamepad'?'B · CANCELAR':T.cancel,240,y+h-8,8,'#7c8494');
}

function deathAttackLabel(engine: GameEngine) {
  const k=engine.deathKiller;
  const a=engine.deathAttack;
  if(engine.deathSource==='contact') {
    if(k?.isBoss) return 'EMBESTIDA DEL JEFE';
    if(k?.behavior==='baton') return 'GOLPE DE PORRA';
    if(k?.behavior==='shielded') return 'EMBESTIDA CON ESCUDO';
    if(k?.behavior==='k9') return 'EMBESTIDA DEL GANSO';
    if(k?.behavior==='roller') return 'ATROPELLO RODANTE';
    return 'ATAQUE CUERPO A CUERPO';
  }
  if(k?.behavior==='sniper') return 'DISPARO DE FRANCOTIRADOR';
  switch(a) {
    case 'buckshot': return 'RÁFAGA DE ESCOPETA';
    case 'coin_proj': return 'MONEDA BALÍSTICA';
    case 'dough_ball': return 'BOMBA DE MASA';
    case 'toast': return 'TOSTADA BALÍSTICA';
    case 'briefcase': return 'MALETÍN PROYECTIL';
    case 'drone_shot': return 'PROYECTIL DE SEGURIDAD';
    case 'enemy_bullet': return 'DISPARO DEL JEFE';
    case 'pistol': return 'DISPARO';
    default: return engine.deathSource==='projectile'?'PROYECTIL ENEMIGO':'CAUSA DESCONOCIDA';
  }
}

function deathTip(engine: GameEngine) {
  const k=engine.deathKiller;
  if(k?.behavior==='sniper') return 'CONSEJO: ROMPE LA LÍNEA DE TIRO CUANDO APAREZCA LA MIRA.';
  if(k?.behavior==='shotgunner') return 'CONSEJO: MANTÉN DISTANCIA Y ESQUIVA DESPUÉS DEL TELÉGRAFO.';
  if(k?.behavior==='shielded') return 'CONSEJO: RODÉALO; SUS COSTADOS Y ESPALDA SON VULNERABLES.';
  if(k?.behavior==='baton'||k?.behavior==='k9'||engine.deathSource==='contact') return 'CONSEJO: DEJA UNA RUTA DE ESCAPE Y NO TE QUEDES CONTRA LA PARED.';
  if(k?.isBoss) return 'CONSEJO: LEE EL TELÉGRAFO; CADA FASE DEJA UNA VENTANA PARA CASTIGAR.';
  return 'CONSEJO: GUARDA EL ESQUIVE PARA EL ÚLTIMO INSTANTE DEL PROYECTIL.';
}

function deathQuote(engine: GameEngine) {
  const k=engine.deathKiller;
  if(k?.isBoss && BOSSES[k.bossType]) return 'EL BANCO COBRÓ LA ÚLTIMA COMISIÓN.';
  if(k?.isBoss) return 'EL MINIJEFE CERRÓ TU CUENTA.';
  if(k?.elite) return 'UN ÉLITE TE CERRÓ LA CAJA.';
  if(k?.behavior==='sniper') return 'NUNCA VISTE VENIR LA FACTURA.';
  if(k?.behavior==='shotgunner') return 'DEMASIADO CERCA. DEMASIADAS MIGAJAS.';
  return 'EL ATRACO TERMINÓ, PERO EL PAN SIGUE AHÍ.';
}

function deathKillerName(engine: GameEngine) {
  const k=engine.deathKiller;
  if(!k) return 'SEGURIDAD DEL BANCO';
  return (k.isBoss?(BOSSES[k.bossType]??MINIBOSSES[k.bossType])?.name:ENEMIES[k.type]?.name) ?? k.type.replace(/_/g,' ').toUpperCase();
}

function deathKillerRole(engine: GameEngine) {
  const k=engine.deathKiller;
  if(!k) return 'PELIGRO';
  if(k.isBoss && BOSSES[k.bossType]) return 'JEFE';
  if(k.isBoss) return 'MINIJEFE';
  if(k.elite) return 'ÉLITE';
  return 'ENEMIGO';
}

function drawDeathKiller(ctx: CanvasRenderingContext2D, engine: GameEngine, cx:number, cy:number, w:number, h:number) {
  const k=engine.deathKiller;
  ctx.save();
  ctx.beginPath();ctx.rect(cx-w/2,cy-h/2,w,h);ctx.clip();
  const g=ctx.createRadialGradient(cx,cy,4,cx,cy,w*.6);g.addColorStop(0,'rgba(181,58,58,.22)');g.addColorStop(1,'rgba(10,12,18,0)');ctx.fillStyle=g;ctx.fillRect(cx-w/2,cy-h/2,w,h);
  ctx.strokeStyle='rgba(255,91,79,.24)';ctx.beginPath();ctx.arc(cx,cy,Math.min(w,h)*.38,0,Math.PI*2);ctx.stroke();
  if(k){
    const sc=k.isBoss?1.9:2.25;
    ctx.translate(cx,cy+5);ctx.scale(sc,sc);
    const fake={...k,x:-k.size/2,y:-k.size/2,hp:k.maxHp,hurtTimer:0,spawnAnim:0,slowTimer:0,burn:0,telegraph:0};
    drawEnemy(ctx,fake,engine.frame,engine);
  } else {
    titleText(ctx,'?',cx,cy+11,34,'#ff5b4f');
  }
  ctx.restore();
}

function renderGameOverUILegacy(engine: GameEngine) {
  const ctx=engine.ui!,f=engine.frame,r=engine.run,s=engine.stats;
  const killer=deathKillerName(engine),role=deathKillerRole(engine),attack=deathAttackLabel(engine);
  const bossDeath=role==='JEFE',miniDeath=role==='MINIJEFE';
  ctx.fillStyle='#07080d';ctx.fillRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT);
  const siren=(Math.sin(f*.065)+1)/2;
  const bg=ctx.createLinearGradient(0,0,CANVAS_WIDTH,0);bg.addColorStop(0,`rgba(47,87,170,${.12+siren*.08})`);bg.addColorStop(.48,'rgba(10,10,15,.03)');bg.addColorStop(1,`rgba(174,44,44,${.12+(1-siren)*.08})`);ctx.fillStyle=bg;ctx.fillRect(0,0,CANVAS_WIDTH,42);
  ctx.fillStyle=bossDeath?'rgba(168,39,39,.10)':miniDeath?'rgba(202,120,42,.08)':'rgba(115,32,48,.07)';ctx.fillRect(0,42,CANVAS_WIDTH,CANVAS_HEIGHT-42);
  ctx.fillStyle=(f%80)<40?'#416fbd':'#9d353b';ctx.fillRect(0,40,CANVAS_WIDTH,2);
  for(let i=0;i<9;i++){ctx.globalAlpha=.03;ctx.fillStyle='#fff';ctx.fillRect((i*73+f*.08)%540-30,45,1,230);}ctx.globalAlpha=1;
  titleText(ctx,T.gameOver,CANVAS_WIDTH/2,28,18,'#ff6258');
  text(ctx,deathQuote(engine),CANVAS_WIDTH/2,39,5.5,'#9e9a98','center',true);
  const x=24,y=50,w=432,h=115;
  drawPanel(ctx,x,y,w,h,'rgba(9,12,19,.80)',bossDeath?'rgba(170,55,55,.72)':miniDeath?'rgba(199,122,49,.62)':'rgba(77,93,108,.58)','rgba(35,44,55,.55)');
  ctx.fillStyle=bossDeath?'#b83d3d':miniDeath?'#c57a32':'#6a7280';ctx.fillRect(x,y,4,h);
  text(ctx,'EXPEDIENTE DEL ÚLTIMO GOLPE',x+14,y+14,5.6,'#737f8e','left',true);
  const roleColor=bossDeath?'#ff655b':miniDeath?'#f0a24e':role==='ÉLITE'?'#f4d03f':'#a8b4c3';
  text(ctx,role,x+w-14,y+14,6.2,roleColor,'right',true);
  drawDeathKiller(ctx,engine,x+62,y+62,92,82);
  ctx.strokeStyle='rgba(255,255,255,.09)';ctx.strokeRect(x+15.5,y+25.5,94,76);
  text(ctx,'DERROTADO POR',x+124,y+35,5.5,'#7f8895','left',true);
  titleText(ctx,killer,x+124,y+55,bossDeath?11:10,bossDeath?'#ff7469':'#f2e7cf','left');
  text(ctx,'GOLPE FINAL',x+124,y+73,5.3,'#7f8895','left',true);
  text(ctx,attack,x+124,y+86,7.2,'#e3bd6b','left',true);
  text(ctx,'PISO',x+w-76,y+73,5.2,'#697685','left',true);text(ctx,`${r.floorReached}/6`,x+w-14,y+86,8,'#fff1c8','right',true);
  wrappedText(ctx,deathTip(engine),x+124,y+99,w-145,5.2,6.4,2,'#95a4a8');
  const sy=174,sw=432,sh=91;
  drawPanel(ctx,24,sy,sw,sh,'rgba(7,10,16,.68)','rgba(72,82,96,.38)','rgba(31,40,50,.38)');
  text(ctx,engine.newRecord?'NUEVO RÉCORD':T.bestRun,38,sy+14,6.3,engine.newRecord?'#f4d03f':'#a98f5a','left',true);
  text(ctx,`SEED ${r.seed}`,442,sy+14,5,'#53606d','right');
  const left:[[string,string],[string,string],[string,string]]=[[T.statRooms,String(s.roomsCleared)],[T.statEnemies,String(s.enemiesDefeated)],[T.statBosses,String(r.bosses)]];
  const right:[[string,string],[string,string],[string,string]]=[[T.statItems,String(r.items)],[T.statWeapons,String(r.weaponsFound)],[T.statTime,fmtTime(r.time)]];
  left.forEach(([label,val],i)=>{const yy=sy+31+i*17;text(ctx,label,38,yy,6,'#7f8b99','left');text(ctx,val,207,yy,7.2,'#efe2bd','right',true);});
  right.forEach(([label,val],i)=>{const yy=sy+31+i*17;text(ctx,label,252,yy,6,'#7f8b99','left');text(ctx,val,442,yy,7.2,'#efe2bd','right',true);});
  ctx.fillStyle='rgba(255,255,255,.055)';ctx.fillRect(228,sy+24,1,54);
  text(ctx,`${T.statDealt}: ${Math.round(r.dmgDealt)}   ·   ${T.statTaken}: ${Math.round(r.dmgTaken*10)/10}`,240,sy+82,5.2,'#64717e','center');
  const tally=Math.min(1,(engine.frame-engine.endFrame)/70);
  text(ctx,'MONEDAS GUARDADAS',196,278,5.4,'#9f8e64','right',true);text(ctx,`+${Math.floor(r.goldenEarned*tally)}`,205,278,7,'#e2c879','left',true);
  text(ctx,'TOTAL',330,278,5.1,'#646152','right');text(ctx,String(engine.totalGoldenCrumbs),338,278,6.3,'#aaa078','left',true);
  drawButtons(ctx,[{label:`${T.tryAgain}  [${engine.lastInput==='gamepad'?'A':'ENTER'}]`},{label:`${T.backToMenu}  [${engine.lastInput==='gamepad'?'B':'ESC'}]`}],engine.pauseIndex,CANVAS_WIDTH/2,CANVAS_HEIGHT-62,f,200,22,4);
}

function renderVictoryUILegacy(engine: GameEngine) {
  const ctx = engine.ui!;
  const f = engine.frame;
  for (let i = 0; i < 24; i++) {
    const sx = (i * 53 + f * 0.6) % CANVAS_WIDTH;
    const sy = (i * 37 + f * 0.4) % CANVAS_HEIGHT;
    ctx.fillStyle = `rgba(244,208,63,${0.25 + Math.sin(f * 0.1 + i) * 0.25})`;
    ctx.fillRect(sx, sy, 3, 3);
  }
  drawPanel(ctx, 40, 26, CANVAS_WIDTH - 80, CANVAS_HEIGHT - 52);
  titleText(ctx, T.victory, CANVAS_WIDTH / 2, 58, 24, '#f4d03f');
  text(ctx, T.victorySub, CANVAS_WIDTH / 2, 78, 12, '#e8c99b', 'center', true);
  ctx.save();
  ctx.translate(CANVAS_WIDTH / 2 - 20, 88 + Math.sin(f * 0.09) * 2);
  ctx.scale(1.4, 1.4);
  drawDuck(ctx, 0, 0, f, 'down', false, false, false);
  ctx.restore();
  const r=engine.run,s=engine.stats;
  text(ctx,'DIFICULTAD',70,130,5.5,'#8792a5','left');text(ctx,difficultyLabel(engine),CANVAS_WIDTH-70,130,6.5,'#e3bd6b','right',true);
  const lines: [string, string][] = [
    [T.statRooms, `${s.roomsCleared}`],
    [T.statEnemies, `${s.enemiesDefeated}`],
    [T.statBosses, `${r.bosses}`],
    [T.statBread, `${s.breadStolen}`],
    [T.statGolden, `${s.goldenCrumbs}`],
    [T.statTime, fmtTime(r.time)],
  ];
  lines.forEach(([k, v], i) => {
    const y = 146 + i * 15;
    text(ctx, k, 70, y, 11, '#8792a5', 'left', false);
    text(ctx, v, CANVAS_WIDTH - 70, y, 12, '#fff6c9', 'right', true);
  });
  drawButtons(ctx, [{ label: `${T.playAgain}  [${engine.lastInput==='gamepad'?'A':'ENTER'}]` }, { label: `${T.backToMenu}  [${engine.lastInput==='gamepad'?'B':'ESC'}]` }],
    engine.pauseIndex, CANVAS_WIDTH / 2, CANVAS_HEIGHT - 66, f, 200, 22, 4);
}

function fmtTime(frames: number) {
  const sec = Math.floor(frames / 60);
  return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
}

export { drawMenuScene };

type DHMenuMode='menu'|'difficulty'|'pause'|'death'|'victory'|'upgrades'|'wardrobe'|'collection'|'how'|'settings';
function dhAccent(mode:DHMenuMode){if(mode==='death')return'#ff6258';if(mode==='victory')return'#6fe28a';if(mode==='pause')return'#91b8c8';if(mode==='collection')return'#8fb4d8';if(mode==='how')return'#9bc7c2';return'#f4d03f';}
function dhGlyph(ctx:CanvasRenderingContext2D,mode:DHMenuMode,x:number,y:number,col:string){ctx.save();ctx.fillStyle=col;const p=(a:number,b:number,w:number,h:number)=>ctx.fillRect(x+a,y+b,w,h);if(mode==='menu'){p(1,1,10,10);ctx.fillStyle='#0b111b';p(3,3,6,6);ctx.fillStyle=col;p(5,2,2,8);p(2,5,8,2);p(5,5,2,2);}else if(mode==='difficulty'){p(1,8,2,3);p(5,5,2,6);p(9,2,2,9);}else if(mode==='pause'){p(2,1,3,10);p(7,1,3,10);}else if(mode==='death'){p(2,1,2,2);p(8,1,2,2);p(4,3,4,2);p(1,5,10,4);p(3,9,2,2);p(7,9,2,2);ctx.fillStyle='#0b111b';p(3,6,2,2);p(7,6,2,2);}else if(mode==='victory'){p(1,8,10,3);p(2,4,2,4);p(5,2,2,6);p(8,4,2,4);p(1,2,2,2);p(9,2,2,2);}else if(mode==='upgrades'){p(5,1,2,10);p(2,4,8,2);p(3,2,6,2);}else if(mode==='wardrobe'){p(4,1,4,2);p(2,3,8,2);p(1,5,3,6);p(8,5,3,6);p(4,5,4,6);}else if(mode==='collection'){p(1,2,4,4);p(7,2,4,4);p(1,8,4,3);p(7,8,4,3);}else if(mode==='how'){p(1,2,10,8);ctx.fillStyle='#0b111b';p(3,4,2,2);p(7,4,2,2);p(5,7,2,2);}else{p(5,1,2,10);p(1,5,10,2);p(3,3,6,6);ctx.fillStyle='#0b111b';p(5,5,2,2);}ctx.restore();}
function dhChrome(engine:GameEngine,mode:DHMenuMode){const ctx=engine.ui!,a=dhAccent(mode),m='#33404e';ctx.save();ctx.imageSmoothingEnabled=false;ctx.fillStyle='rgba(3,7,12,.88)';ctx.fillRect(11,7,CANVAS_WIDTH-22,2);ctx.fillRect(11,CANVAS_HEIGHT-9,CANVAS_WIDTH-22,2);ctx.fillStyle=a;ctx.fillRect(16,8,CANVAS_WIDTH-32,1);ctx.fillRect(12,12,1,CANVAS_HEIGHT-24);ctx.fillRect(CANVAS_WIDTH-13,12,1,CANVAS_HEIGHT-24);ctx.fillRect(12,8,6,4);ctx.fillRect(CANVAS_WIDTH-18,8,6,4);ctx.fillRect(12,CANVAS_HEIGHT-12,6,4);ctx.fillRect(CANVAS_WIDTH-18,CANVAS_HEIGHT-12,6,4);ctx.fillStyle=m;for(let y=30;y<CANVAS_HEIGHT-28;y+=28){ctx.fillRect(9,y,3,2);ctx.fillRect(CANVAS_WIDTH-12,y,3,2);}ctx.fillStyle=a;ctx.fillRect(21,14,4,2);ctx.fillRect(27,14,2,2);ctx.fillRect(31,14,2,2);dhGlyph(ctx,mode,CANVAS_WIDTH-35,14,a);if(mode==='death'){for(let x=42;x<CANVAS_WIDTH-42;x+=16){ctx.fillStyle=((x/16)%2|0)?'#9e343b':'#375f9d';ctx.fillRect(x,8,8,2);}}if(mode==='settings'){const y=SETTINGS.y+engine.settingsIndex*(SETTINGS.h+SETTINGS.gap);ctx.strokeStyle=a;ctx.strokeRect(SETTINGS.x-.5,y-.5,SETTINGS.w+1,SETTINGS.h+1);ctx.fillStyle=a;ctx.fillRect(SETTINGS.x-5,y+4,3,Math.max(4,SETTINGS.h-8));}ctx.restore();}


function renderMenuUI(engine:GameEngine){renderMenuUILegacy(engine);}
function renderDifficultyUI(engine:GameEngine){renderDifficultyUILegacy(engine);dhChrome(engine,'difficulty' as DHMenuMode);}
function renderPausedUI(engine:GameEngine){renderPausedUILegacy(engine);dhChrome(engine,'pause' as DHMenuMode);}
function renderGameOverUI(engine:GameEngine){renderGameOverUILegacy(engine);dhChrome(engine,'death' as DHMenuMode);}
function renderVictoryUI(engine:GameEngine){renderVictoryUILegacy(engine);dhChrome(engine,'victory' as DHMenuMode);}
function renderUpgradesUI(engine:GameEngine){renderUpgradesUILegacy(engine);dhChrome(engine,'upgrades' as DHMenuMode);}
function renderWardrobeUI(engine:GameEngine){renderWardrobeUILegacy(engine);dhChrome(engine,'wardrobe' as DHMenuMode);}
function renderHowToPlayUI(engine:GameEngine){renderHowToPlayUILegacy(engine);dhChrome(engine,'how' as DHMenuMode);}
function renderSettingsUI(engine:GameEngine){renderSettingsUILegacy(engine);dhChrome(engine,'settings' as DHMenuMode);}
