// Renderizador en dos capas:
//  · MUNDO  → canvas de 480x352 escalado con nearest-neighbour (pixel art puro)
//  · UI     → canvas a resolución nativa con tipografía nítida
import {
  TILE_SIZE, ROOM_WIDTH, ROOM_HEIGHT, CANVAS_WIDTH, CANVAS_HEIGHT, UI_BASE_WIDTH, UI_OFFSET_X,
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
  WEAPONS, ITEMS, ACTIVE_ITEMS, BOSSES, SUBBOSSES, MINIBOSSES, META_UPGRADES,
  RARITY_COLORS, RARITY_NAMES, TOTAL_FLOORS, SKINS,
} from './data';
import { T, FLOOR_NAMES_ES } from './i18n';
import {
  text, titleText, drawPanel, drawMenuScene, drawTitleLogo, drawBar,
  drawMenuBackdrop, drawMenuHeader, drawMenuCard, drawMouseButton,
  drawSectionLabel, drawKeyChip,
} from './ui';
import { wrappedText } from './ui';
import { activeWeapon, currentRoomOf, getContentOf, SETTING_ROWS, settingValue, shopPrice, DIFFICULTY_MODES, DIFFICULTIES, difficultyLabel, endlessMarketOptions } from './engine';
import { drawVaultScene } from './titleScene';
import {
  mainMenuRect, visibleCanvasRect, difficultyRect, DIFFICULTY_START, BACK_BUTTON,
  pauseRect, CONFIRM_RECTS, WARDROBE, WARDROBE_ACTION,
  settingsRect, settingsMinusRect, settingsPlusRect, settingsActionRect,
  upgradeRect, upgradeActionRect, endlessResumeRect,
  ENDLESS_REWARD as ENDLESS_REWARD_LAYOUT, ENDLESS_SECONDARY, SWAP_CANCEL, HUD_MENU, endActionRect, inside,
} from './layout';
import { renderFloorMap, visibleRoomKeys, ROOM_STYLE, drawRoomSymbol } from './floorMap';
import { drawItemIcon } from './itemArt';
import { getBuild, FOODS } from './itemRules';
import { renderCollection } from './collectionUI';
import { nearbyTooltip, type TooltipTarget } from './tooltips';
import { grenadeLanding } from './aim';
import { ACTIVE_SWAP } from './layout';
import { EVENTS } from './events';
import { MODIFIER_LABELS } from './modifiers';
import { drawTacticalEnemy, SPECIAL_ENEMIES } from './tacticalSprites';
import { actionPrompt } from './gamepad';
import { keyLabel } from './controls';
import { renderControls } from './controlsUI';
import { renderCareer } from './careerUI';
import { renderDailyBrief, renderDailyHUD, renderDailyResult } from './dailyChallengeUI';
import { dailyMedalColor } from './dailyChallenge';
import { endlessStage } from './endless';
import { drawRichTile, drawRoomAtmosphere, drawInnerWallShadow } from './roomArt';
import type { GameEngine, Enemy, RoomContent, Pedestal } from './types';

const dist = (x1: number, y1: number, x2: number, y2: number) => Math.hypot(x2 - x1, y2 - y1);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const menuFrame = (engine:GameEngine) => engine.settings.reduceMotion ? 0 : engine.frame;


function drawGunVanScene(ctx:CanvasRenderingContext2D,f:number) {
  ctx.save();ctx.translate(CANVAS_WIDTH/2-UI_BASE_WIDTH/2,0);ctx.fillStyle='rgba(0,0,0,.45)';ctx.beginPath();ctx.ellipse(240,161,100,14,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#05070a';ctx.fillRect(148,89,158,57);ctx.fillStyle='#0d1217';ctx.fillRect(157,80,105,11);ctx.fillRect(262,86,52,60);
  ctx.fillStyle='#27343d';ctx.fillRect(269,93,35,20);ctx.fillStyle='#56747f';ctx.globalAlpha=.48;ctx.fillRect(273,96,27,14);ctx.globalAlpha=1;
  ctx.fillStyle='#020304';ctx.fillRect(167,96,87,44);ctx.fillStyle='#171e23';ctx.fillRect(182,104,57,31);
  ctx.fillStyle='#d28a3c';ctx.globalAlpha=.13+.04*Math.sin(f*.06);ctx.fillRect(185,107,51,25);ctx.globalAlpha=1;
  ctx.fillStyle='#4a555d';for(let i=0;i<3;i++){ctx.fillRect(190+i*17,111,13,3);ctx.fillRect(193+i*17,106,7,2);}
  for(const x of [179,293]){ctx.fillStyle='#020304';ctx.beginPath();ctx.arc(x,148,14,0,Math.PI*2);ctx.fill();ctx.fillStyle='#47515a';ctx.beginPath();ctx.arc(x,148,6,0,Math.PI*2);ctx.fill();}
  ctx.fillStyle='#d99a4b';ctx.fillRect(230,141,24,3);ctx.fillStyle='#d8e2e6';ctx.fillRect(310,106,5,4);ctx.fillStyle='#a52e31';ctx.fillRect(148,109,4,9);
  drawShopPigeon(ctx,323,118,f);ctx.restore();
}

function drawCafeScene(ctx:CanvasRenderingContext2D,f:number) {
  ctx.save();ctx.translate(CANVAS_WIDTH/2-UI_BASE_WIDTH/2,0);ctx.fillStyle='#4d3124';ctx.fillRect(136,106,208,38);ctx.fillStyle='#8a5b3d';ctx.fillRect(136,106,208,4);ctx.fillStyle='#e1b779';ctx.fillRect(142,112,196,3);
  ctx.fillStyle='#20262c';ctx.fillRect(296,80,34,27);ctx.fillStyle='#9aa6ab';ctx.fillRect(300,84,26,11);ctx.fillStyle='#dce5e7';ctx.fillRect(303,87,20,6);
  ctx.fillStyle='#efe0bf';ctx.fillRect(152,80,58,24);ctx.fillStyle='#2d2520';ctx.fillRect(156,84,50,16);ctx.fillStyle='#e4b768';ctx.fillRect(161,88,24,2);ctx.fillRect(161,93,32,2);
  drawShopPigeon(ctx,230,92,f);ctx.fillStyle='#f0ece2';ctx.fillRect(234,110,8,11);ctx.restore();
}

function drawShopStand(ctx:CanvasRenderingContext2D,x:number,y:number,kind:'van'|'cafe'|'shop') {
  ctx.fillStyle=kind==='van'?'#0a0d10':kind==='cafe'?'#6f4934':'#25382f';ctx.fillRect(x-18,y+9,36,10);
  ctx.fillStyle=kind==='van'?'#d58e42':kind==='cafe'?'#e7c493':'#66ba89';ctx.fillRect(x-14,y+10,28,2);
}

function drawVaultWings(ctx:CanvasRenderingContext2D,frame:number){
  if(UI_OFFSET_X<=0)return;
  ctx.save();
  const coreLeft=UI_OFFSET_X,coreRight=UI_OFFSET_X+UI_BASE_WIDTH;
  const regions:[[number,number],[number,number]]=[[0,coreLeft],[coreRight,CANVAS_WIDTH]];
  for(const [left,right] of regions){
    if(right<=left)continue;
    ctx.fillStyle='#10191f';ctx.fillRect(left,0,right-left,CANVAS_HEIGHT);
    for(let row=0;row<13;row++){
      const y=row*20;
      for(let x=left-24+(row%2?0:24);x<right;x+=48){
        ctx.fillStyle=((Math.floor(x/48)+row)&1)?'#17262c':'#1a2a30';
        ctx.fillRect(x,y,47,19);
        ctx.fillStyle='#24353a';ctx.fillRect(x+2,y+2,43,1);
      }
    }
    ctx.fillStyle='#172327';ctx.fillRect(left,258,right-left,94);
    for(let j=0;j<6;j++){
      const y=259+j*j*3;
      ctx.fillStyle='#344347';ctx.fillRect(left,y,right-left,1);
    }
    for(let x=left+18;x<right;x+=96){
      ctx.fillStyle='#0c1820';ctx.fillRect(x,0,14,280);
      ctx.fillStyle='#30434a';ctx.fillRect(x+3,0,8,280);
      ctx.fillStyle='#526268';ctx.fillRect(x+4,0,2,280);
      for(let y=15;y<280;y+=36){
        ctx.fillStyle='#829ba0';ctx.fillRect(x+6,y-1,3,3);
      }
      if((Math.floor(x/96)+Math.floor(frame/50))%3===0){
        ctx.globalAlpha=.13;ctx.fillStyle='#356593';ctx.fillRect(x+14,100,Math.min(55,right-x-14),110);ctx.globalAlpha=1;
      }
    }
  }
  ctx.restore();
}

// ===========================================================================
// CAPA DE MUNDO
// ===========================================================================
function drawEndlessArenaMood(ctx:CanvasRenderingContext2D,engine:GameEngine,f:number){
  if(engine.gameMode!=='endless')return;
  const e=engine.endless,alert=e.alert,pressure=e.pressure;
  const damageTier=e.round>=100?3:e.round>=50?2:e.round>=21?1:0;
  ctx.save();

  // La arena no cambia de sala: envejece visualmente sobre el mismo piso.
  if(damageTier>0){
    const cracks=[[82,88],[142,258],[236,72],[324,244],[395,116],[108,190],[366,286]] as const;
    ctx.strokeStyle=damageTier>=3?'#352d2e':'#4a4340';
    ctx.lineWidth=1;
    ctx.globalAlpha=.085+damageTier*.025;
    for(let i=0;i<Math.min(cracks.length,2+damageTier*2);i++){
      const [x,y]=cracks[i],flip=i%2?1:-1;
      ctx.beginPath();
      ctx.moveTo(x-9,y-2);ctx.lineTo(x,y+3);ctx.lineTo(x+8,y-4);ctx.lineTo(x+13,y+3*flip);
      ctx.stroke();
      ctx.beginPath();ctx.moveTo(x,y+3);ctx.lineTo(x-4,y+10);ctx.stroke();
    }
  }
  if(damageTier>=2){
    const scorch=[[116,118,20,7],[286,222,27,9],[378,174,18,6],[205,282,24,8]] as const;
    ctx.fillStyle='#211d1d';
    for(let i=0;i<scorch.length;i++){
      const [x,y,rx,ry]=scorch[i];
      ctx.globalAlpha=.045+.018*damageTier;
      ctx.beginPath();ctx.ellipse(x,y,rx,ry,(i%2?-.22:.18),0,Math.PI*2);ctx.fill();
    }
    // Humo bajo y pegado a paredes: ambientación, nunca tapa amenazas del centro.
    for(let i=0;i<3;i++){
      const t=(f*.006+i*.31)%1;
      const x=i===1?CANVAS_WIDTH-52:48+i*26;
      const y=CANVAS_HEIGHT-58-t*52;
      ctx.globalAlpha=(1-t)*(.035+.012*damageTier);
      ctx.fillStyle='#aab2ae';
      ctx.beginPath();ctx.ellipse(x+Math.sin(f*.018+i)*5,y,9+t*7,4+t*4,0,0,Math.PI*2);ctx.fill();
    }
  }
  if(damageTier>=3){
    const blink=.32+.28*(Math.sin(f*.14)>0?1:0);
    ctx.globalAlpha=blink;
    ctx.fillStyle='#e34d46';
    for(const [x,y] of [[42,48],[CANVAS_WIDTH-46,48],[42,CANVAS_HEIGHT-52],[CANVAS_WIDTH-46,CANVAS_HEIGHT-52]] as const){
      ctx.fillRect(x,y,4,2);
      ctx.globalAlpha=blink*.18;ctx.fillRect(x-5,y-3,14,8);ctx.globalAlpha=blink;
    }
  }

  if(alert>=2){
    const alarm=.022+Math.min(.07,alert*.006)+Math.max(0,pressure-45)*.0007;
    ctx.globalAlpha=alarm*(.75+.25*Math.sin(f*.045));
    ctx.fillStyle=alert>=8?'#b51f28':'#8d342f';
    ctx.fillRect(32,32,CANVAS_WIDTH-64,CANVAS_HEIGHT-64);
  }
  if(alert>=4){
    for(let i=0;i<4;i++){
      const y=58+i*68+Math.sin(f*.018+i)*5;
      ctx.globalAlpha=.025+Math.min(.05,alert*.003);
      ctx.fillStyle=i%2?'#d3d8c4':'#b7c9c7';
      ctx.fillRect(42,y,CANVAS_WIDTH-84,1);
    }
  }
  if(pressure>=50){
    const a=Math.min(.16,(pressure-45)*.0025)*(.78+.22*Math.sin(f*.08));
    const g=ctx.createRadialGradient(CANVAS_WIDTH/2,CANVAS_HEIGHT/2,115,CANVAS_WIDTH/2,CANVAS_HEIGHT/2,275);
    g.addColorStop(0,'rgba(150,28,32,0)');g.addColorStop(1,`rgba(150,28,32,${a})`);
    ctx.globalAlpha=1;ctx.fillStyle=g;ctx.fillRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT);
  }
  if(e.milestone){
    ctx.globalAlpha=.08+.03*Math.sin(f*.11);ctx.strokeStyle=e.round>=100?'#ff6c66':'#f4d03f';ctx.lineWidth=2;
    ctx.strokeRect(35,35,CANVAS_WIDTH-70,CANVAS_HEIGHT-70);
  }
  ctx.restore();
}

export function renderWorld(engine: GameEngine) {
  const ctx = engine.ctx;
  const s = engine.state;
  if(s===GameState.MENU || s===GameState.DIFFICULTY || s===GameState.DAILY_BRIEF || s===GameState.HEIST_INTRO) {
    const opening=s===GameState.HEIST_INTRO?Math.max(0,(90-engine.heistIntroTimer-15)/75):0;
    ctx.fillStyle='#10191f';ctx.fillRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT);
    drawVaultWings(ctx,engine.frame);
    ctx.save();ctx.translate(UI_OFFSET_X,0);
    drawVaultScene(ctx,engine.frame,engine.equippedSkin,opening,engine.mouseX||240,engine.mouseY||176);
    ctx.restore();
    return;
  }

  if (s === GameState.HOW_TO_PLAY || s === GameState.SETTINGS ||
      s === GameState.WARDROBE || s === GameState.UPGRADES || s===GameState.COLLECTION || s===GameState.CONTROLS || s===GameState.CAREER) {
    ctx.fillStyle='#10191f';ctx.fillRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT);
    drawVaultWings(ctx,engine.frame);
    ctx.save();ctx.translate(UI_OFFSET_X,0);drawVaultScene(ctx,engine.frame,engine.equippedSkin);ctx.restore();
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

  drawRoomFloor(ctx, room, content, f, engine.map.floorIndex);
  if(room.modifier==='blackout') {
    ctx.fillStyle='rgba(2,10,18,.48)';ctx.fillRect(32,32,CANVAS_WIDTH-64,CANVAS_HEIGHT-64);
  }
  if(room.modifier==='waxed') {
    ctx.fillStyle='rgba(149,191,198,.06)';
    for(let x=48;x<CANVAS_WIDTH-48;x+=67)ctx.fillRect(x,52,16,238);
  }
  if(room.modifier==='alarm'&&!room.cleared){ctx.globalAlpha=.06+Math.sin(f*.05)*.025;ctx.fillStyle='#e15a4f';ctx.fillRect(32,32,CANVAS_WIDTH-64,CANVAS_HEIGHT-64);ctx.globalAlpha=1;}
  drawEndlessArenaMood(ctx,engine,f);

  for (const p of content.puddles) {
    ctx.globalAlpha = Math.min(0.55, p.life / 200);
    const fire = p.kind === 'fire';
    ctx.fillStyle = p.kind==='radiation'?'#9dbf57':fire?'#ec8c42':p.kind==='smoke'?'#879994':p.kind==='butter'?'#e7c95d':p.life < 80 ? '#3d7fb8' : '#2d6fa8';
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
      : target?.type === RoomType.BOSS ? 'boss' : target?.type===RoomType.SHOP?'green'
      :target?.type===RoomType.GUN_VAN||target?.type===RoomType.MINIBOSS?'orange':target?.type===RoomType.CHOICE||target?.type===RoomType.TREASURE||target?.type===RoomType.SECRET?'purple':'silver';
    const t = DOOR_TILE[d];
    drawDoor(ctx, t.x * TILE_SIZE, t.y * TILE_SIZE, d, style, !room.cleared, content.doorAnim[d] ?? 0, f);
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
    drawPedestal(ctx,event.x-4,event.y+9,f,event.used);
    if(event.kind==='injured') drawDuckSkin(ctx,event.x,event.y,f,'robber','down',false,false,false,false,!event.used);
    else drawItemIcon(ctx,event.x-8,event.y-11,EVENTS[event.kind].icon,32);
  }

  if ((room.type === RoomType.SHOP || room.type === RoomType.GUN_VAN || content.cafe) && content.shopItems) {
    if(room.type===RoomType.GUN_VAN) drawGunVanScene(ctx,f);
    else if(content.cafe) drawCafeScene(ctx,f);
    else drawShopPigeon(ctx, CANVAS_WIDTH / 2 - 8, CANVAS_HEIGHT * 0.22, f);
    for (const it of content.shopItems) {
      if (it.sold) continue;
      drawShopStand(ctx,it.x,it.y,room.type===RoomType.GUN_VAN?'van':content.cafe?'cafe':'shop');
      if(it.isFood) drawItemIcon(ctx,it.x-12,it.y-12,it.itemId,24);
      else if (it.isWeapon) drawWeaponIcon(ctx, it.x - 8, it.y - 8, it.itemId);
      else drawItem(ctx, it.x - 8, it.y - 8, it.itemId, f);
    }
  }

  if(engine.gameMode==='endless'&&engine.endless.hazardWarning>0&&engine.endless.hazardKind){
    const e=engine.endless,t=1-e.hazardWarning/54;
    ctx.save();ctx.globalAlpha=.16+.24*Math.sin((f+e.hazardWarning)*.42)**2;
    ctx.strokeStyle=e.hazardKind==='laser_cross'?'#ff6f64':e.hazardKind==='hot_corners'?'#ff9d5c':'#e6d66a';
    ctx.fillStyle=ctx.strokeStyle;ctx.lineWidth=2;
    if(e.hazardKind==='laser_cross'){
      if(e.round%2===0){ctx.fillRect(58,CANVAS_HEIGHT/2-7,CANVAS_WIDTH-116,14);}
      else ctx.fillRect(CANVAS_WIDTH/2-7,56,14,CANVAS_HEIGHT-112);
    } else if(e.hazardKind==='hot_corners'){
      for(const [x,y] of [[66,66],[CANVAS_WIDTH-66,66],[66,CANVAS_HEIGHT-66],[CANVAS_WIDTH-66,CANVAS_HEIGHT-66]]){ctx.beginPath();ctx.arc(x,y,34,0,Math.PI*2);ctx.stroke();}
    } else {
      ctx.beginPath();ctx.ellipse(CANVAS_WIDTH/2,CANVAS_HEIGHT/2,92,76,0,0,Math.PI*2);ctx.stroke();
    }
    ctx.globalAlpha=.78;text(ctx,`PELIGRO · ${e.hazardKind==='laser_cross'?'LÁSER':e.hazardKind==='hot_corners'?'ESQUINAS':'ANILLO'}`,CANVAS_WIDTH/2,42,5.6,'#ffb079','center',true);
    ctx.restore();void t;
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
    } else {
      if(engine.gameMode==='endless'){
        const golden=p.type==='golden_crumb';
        ctx.save();
        ctx.globalAlpha=golden?.22:.09;
        ctx.strokeStyle=golden?'#f4d03f':'#d4a574';
        ctx.lineWidth=1;
        ctx.beginPath();ctx.ellipse(p.x,p.y+4,golden?8:6,golden?4:3,0,0,Math.PI*2);ctx.stroke();
        if(golden){ctx.globalAlpha=.12+.06*Math.sin(f*.12);ctx.beginPath();ctx.arc(p.x,p.y,10,0,Math.PI*2);ctx.stroke();}
        ctx.restore();
      }
      drawCoin(ctx, p.x, p.y, f, p.type === 'golden_crumb');
    }
  }

  let nearestEndlessItem:{x:number;y:number;itemId:string;isWeapon:boolean;isActive:boolean;d:number}|null=null;
  for (const it of content.items) {
    const fy = it.y + Math.sin(f * 0.07) * 2;
    const def=WEAPONS[it.itemId]??ITEMS[it.itemId]??ACTIVE_ITEMS[it.itemId];
    const rarityColor=RARITY_COLORS[def?.rarity ?? 3];
    const categoryColor=it.isWeapon?'#66c7ff':it.isActive?'#c98cff':rarityColor;
    ctx.globalAlpha=ITEMS[it.itemId]?.cursed?.34:.17;ctx.fillStyle=ITEMS[it.itemId]?.cursed?'#663174':categoryColor;ctx.beginPath();ctx.arc(it.x+8,fy+8,18,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
    ctx.strokeStyle=categoryColor;ctx.globalAlpha=.62;ctx.strokeRect(it.x-5,fy-5,26,26);ctx.globalAlpha=1;
    drawItemIcon(ctx,it.x-4,fy-4,it.itemId,24,rarityColor);
    if(engine.gameMode==='endless'){
      const d=dist(it.x+8,it.y+8,engine.player.x+7,engine.player.y+8);
      if(d<38&&(!nearestEndlessItem||d<nearestEndlessItem.d))nearestEndlessItem={...it,d};
    }
  }
  if(nearestEndlessItem){
    const it=nearestEndlessItem;
    const def=WEAPONS[it.itemId]??ITEMS[it.itemId]??ACTIVE_ITEMS[it.itemId];
    text(ctx,it.isWeapon?'ARMA':it.isActive?'ACTIVO':'OBJETO',it.x+8,it.y-15,5.2,it.isWeapon?'#7fd6ff':it.isActive?'#d4a6ff':'#e7d48a','center',true);
    text(ctx,actionPrompt(engine,'interact')+' · TOMAR   '+actionPrompt(engine,'recycle')+' · RECICLAR',it.x+8,it.y+34,4.8,'#d4d9d2','center');
    if(def?.name) text(ctx,def.name,it.x+8,it.y-7,4.8,'#c8d0cc','center');
  }

  for (const e of content.enemies) drawEnemy(ctx, e, f, engine);
  for(const d of engine.deathEchoes) {
    const floorDeath=d.enemy.isBoss&&!!BOSSES[d.enemy.bossType],subDeath=d.enemy.isBoss&&!!SUBBOSSES[d.enemy.bossType];
    const maxLife=floorDeath?68:subDeath?54:d.enemy.isBoss?46:20;
    const deathT=clamp(d.life/maxLife,0,1);
    if(d.enemy.isBoss){
      const burst=1-deathT,cx=d.enemy.x+d.enemy.size/2,cy=d.enemy.y+d.enemy.size/2;
      ctx.save();
      ctx.globalAlpha=deathT*(floorDeath?.58:subDeath?.46:.34);
      ctx.strokeStyle=floorDeath?'#ffd85a':subDeath?'#ff9b68':'#f4d03f';
      ctx.lineWidth=floorDeath?2:1.5;
      ctx.beginPath();ctx.arc(cx,cy,14+burst*(floorDeath?54:38),0,Math.PI*2);ctx.stroke();
      if(floorDeath){ctx.globalAlpha*=.55;ctx.beginPath();ctx.arc(cx,cy,26+burst*78,0,Math.PI*2);ctx.stroke();}
      ctx.restore();
    }
    ctx.save();ctx.globalAlpha=deathT;
    ctx.translate(d.enemy.x+d.enemy.size/2,d.enemy.y+d.enemy.size/2);
    ctx.rotate((1-deathT)*(floorDeath?.7:1.05));
    const sx=.32+deathT*.68,sy=.18+deathT*.82;
    ctx.scale(sx,sy);
    if(d.enemy.isBoss) drawBoss(ctx,-d.enemy.size/2,-d.enemy.size/2,d.enemy.bossType,f,0,1,false,d.enemy.bossPhase);
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
  if (p.hp > 0) {
    if(p.dashTimer>0){
      for(let i=3;i>=1;i--){
        ctx.save();
        ctx.globalAlpha=.08+i*.055;
        const ox=-p.dashDir.x*(i*5+2),oy=-p.dashDir.y*(i*5+2);
        drawDuckSkin(ctx,p.x+ox,p.y+oy,f-i*2,engine.equippedSkin,p.dir,true,false,true,p.shootFlash>0);
        ctx.restore();
      }
      ctx.save();ctx.globalAlpha=.34;ctx.strokeStyle='#fff3a8';ctx.lineWidth=1;
      for(let i=-1;i<=1;i++){
        const px=p.x+7-p.dashDir.x*(12+i*4)+p.dashDir.y*i*4;
        const py=p.y+8-p.dashDir.y*(12+i*4)-p.dashDir.x*i*4;
        ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px-p.dashDir.x*16,py-p.dashDir.y*16);ctx.stroke();
      }
      ctx.restore();
    }
    const currentWeapon=activeWeapon(p);
    const recoilPower=currentWeapon.id==='baguette_launcher'||currentWeapon.id==='rubber_duck_cannon'||currentWeapon.id==='egg_cannon'?2.8:
      currentWeapon.id==='breadcrumb_shotgun'||currentWeapon.id==='baguette_sniper'||currentWeapon.id==='golden_egg_revolver'?2.0:1.15;
    const recoil=p.shootFlash>0?(p.shootFlash/6)*recoilPower:0;
    const drawX=p.x-Math.cos(p.facingAngle)*recoil,drawY=p.y-Math.sin(p.facingAngle)*recoil;
    const dashHorizontal=Math.abs(p.dashDir.x)>=Math.abs(p.dashDir.y);
    const sx=p.dashTimer>0?(dashHorizontal?1.18:.88):p.shootFlash>0?1.04:1;
    const sy=p.dashTimer>0?(dashHorizontal?.86:1.14):p.shootFlash>0?.97:1;
    ctx.save();
    ctx.translate(drawX+7,drawY+9);
    ctx.scale(sx,sy);
    drawDuckSkin(ctx, -7, -9, f, engine.equippedSkin, p.dir, p.moving,
      p.hurtTimer > 0, p.dashTimer > 0, p.shootFlash > 0);
    ctx.restore();
    if(p.shootFlash>0){
      const mx=p.x+7+Math.cos(p.facingAngle)*14,my=p.y+8+Math.sin(p.facingAngle)*14;
      ctx.save();ctx.translate(mx,my);ctx.rotate(p.facingAngle);ctx.globalAlpha=.7;
      ctx.fillStyle='#fff4bd';ctx.fillRect(0,-2,7,4);ctx.fillStyle='#f4d03f';ctx.fillRect(5,-1,5,2);ctx.restore();
    }
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
    const danger=ctx.createRadialGradient(CANVAS_WIDTH/2,CANVAS_HEIGHT/2,130,CANVAS_WIDTH/2,CANVAS_HEIGHT/2,Math.max(275,CANVAS_WIDTH*.58));
    danger.addColorStop(0,'rgba(145,25,32,0)');danger.addColorStop(1,`rgba(145,25,32,${.16+Math.sin(f*.05)*.035})`);
    ctx.fillStyle=danger;ctx.fillRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT);
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
  } else if (room.type === RoomType.GUN_VAN) {
    ctx.fillStyle='rgba(3,5,8,.38)';ctx.fillRect(TILE_SIZE,TILE_SIZE,CANVAS_WIDTH-TILE_SIZE*2,CANVAS_HEIGHT-TILE_SIZE*2);
    ctx.fillStyle='rgba(231,154,69,.12)';for(let x=90;x<CANVAS_WIDTH-70;x+=70)ctx.fillRect(x,286,34,3);
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

function drawPedestalFull(ctx: CanvasRenderingContext2D, ped: Pedestal, f: number, engine: GameEngine) {
  const def=WEAPONS[ped.itemId]??ITEMS[ped.itemId]??ACTIVE_ITEMS[ped.itemId]??FOODS[ped.itemId];
  const color=ITEMS[ped.itemId]?.cursed?'#8b54a6':RARITY_COLORS[def?.rarity ?? 3];
  ctx.save();ctx.translate(0,Math.round(18*(1-(ped.rise ?? 1))));ctx.globalAlpha=ped.rise ?? 1;
  drawPedestal(ctx,ped.x,ped.y+6,f,ped.taken,color);
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

function drawBossMutationOverlay(ctx:CanvasRenderingContext2D,e:Enemy,f:number,engine:GameEngine){
  if(engine.gameMode!=='endless'||!e.mutation)return;
  const cx=e.x+e.size/2,cy=e.y+e.size/2;
  const pulse=.55+.45*Math.sin(f*.16+e.id);
  const color=e.mutation==='TORMENTA'?'#79c8ff':e.mutation==='BLINDADO'?'#aab9c8':e.mutation==='CAZADOR'?'#ff6d63':e.mutation==='REFUERZOS'?'#d6b06a':'#ff8b55';
  ctx.save();
  ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=1.5;
  ctx.globalAlpha=.11+.07*pulse;
  ctx.beginPath();ctx.ellipse(cx,cy+3,e.size*.78,e.size*.62,0,0,Math.PI*2);ctx.stroke();

  if(e.mutation==='FRENÉTICO'){
    // Trazos de velocidad y postura visual agresiva.
    ctx.globalAlpha=.45+.25*pulse;ctx.lineWidth=2;
    const back=e.moveAngle+Math.PI;
    for(let i=-1;i<=1;i++){
      const a=back+i*.32,r1=e.size*.48,r2=e.size*(.82+i*.04);
      ctx.beginPath();ctx.moveTo(cx+Math.cos(a)*r1,cy+Math.sin(a)*r1);
      ctx.lineTo(cx+Math.cos(a)*r2,cy+Math.sin(a)*r2);ctx.stroke();
    }
    ctx.globalAlpha=.75;ctx.fillRect(cx-6,e.y-10,12,2);
  } else if(e.mutation==='BLINDADO'){
    // Placas externas visibles: el volumen del boss se percibe más pesado.
    ctx.globalAlpha=.88;
    ctx.fillRect(e.x-4,cy-7,6,14);ctx.fillRect(e.x+e.size-2,cy-7,6,14);
    ctx.fillRect(cx-8,e.y-5,16,5);
    ctx.fillStyle='#dce3e8';ctx.globalAlpha=.75;
    ctx.fillRect(e.x-2,cy-4,2,2);ctx.fillRect(e.x+e.size,cy-4,2,2);ctx.fillRect(cx-1,e.y-3,2,2);
  } else if(e.mutation==='CAZADOR'){
    // Visor + retícula sólo durante el wind-up real: información visual, no ruido falso.
    ctx.globalAlpha=.9;ctx.fillRect(cx-9,e.y-8,18,3);
    ctx.fillStyle='#fff0df';ctx.fillRect(cx-2,e.y-8,4,3);
    if(e.telegraph>.05){
      const px=engine.player.x+7,py=engine.player.y+8;
      ctx.globalAlpha=.16+e.telegraph*.24;ctx.setLineDash([4,4]);
      ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(px,py);ctx.stroke();ctx.setLineDash([]);
      ctx.globalAlpha=.5+e.telegraph*.35;
      ctx.strokeRect(px-8,py-8,16,16);
      ctx.beginPath();ctx.arc(px,py,11,0,Math.PI*2);ctx.stroke();
    }
  } else if(e.mutation==='REFUERZOS'){
    // Baliza de mando / radio activa.
    ctx.globalAlpha=.8;
    ctx.beginPath();ctx.moveTo(cx,e.y-3);ctx.lineTo(cx,e.y-16);ctx.stroke();
    ctx.fillRect(cx-2,e.y-18,4,4);
    ctx.globalAlpha=.22+.24*pulse;
    for(let r=7;r<=13;r+=6){ctx.beginPath();ctx.arc(cx,e.y-15,r,Math.PI*1.15,Math.PI*1.85);ctx.stroke();}
  } else if(e.mutation==='TORMENTA'){
    // Arcos cortos alrededor del cuerpo; azul exclusivo para no confundirse con daño normal.
    ctx.globalAlpha=.62+.2*pulse;ctx.lineWidth=1.5;
    for(let i=0;i<4;i++){
      const a=f*.025+i*Math.PI/2;
      const x1=cx+Math.cos(a)*e.size*.56,y1=cy+Math.sin(a)*e.size*.46;
      const x2=cx+Math.cos(a+.22)*e.size*.82,y2=cy+Math.sin(a+.22)*e.size*.72;
      const mx=(x1+x2)/2+Math.sin(f*.18+i)*5,my=(y1+y2)/2+Math.cos(f*.16+i)*4;
      ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(mx,my);ctx.lineTo(x2,y2);ctx.stroke();
    }
    ctx.globalAlpha=.75;ctx.fillRect(cx-5,e.y-10,10,2);
  }
  ctx.restore();
}

function drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy, f: number, engine: GameEngine) {
  const hurt = e.hurtTimer > 0;
  const player = engine.player;
  const dirX = (player.x + 7) > (e.x + e.size / 2) ? 1 : -1;

  if (e.spawnAnim > 0) {
    const total=e.isBoss?42:Math.max(18,e.spawnAnim);
    const t=clamp(1-e.spawnAnim/total,0,1);
    const cx=e.x+e.size/2,cy=e.y+e.size/2;
    ctx.save();
    ctx.globalAlpha=.18+.55*(1-t);
    ctx.strokeStyle=e.isBoss?'#ff6b63':e.elite?'#f4d03f':'#ff8a63';
    ctx.lineWidth=e.isBoss?2:1;
    ctx.beginPath();ctx.ellipse(cx,cy+e.size*.36,e.size*(.7-.25*t),e.size*(.3-.1*t),0,0,Math.PI*2);ctx.stroke();
    ctx.globalAlpha=.18+.4*(1-t);
    ctx.fillStyle=e.isBoss?'#ff5d63':'#ff8b68';
    ctx.fillRect(cx-1,e.y-18-(1-t)*7,2,18+(1-t)*7);
    ctx.fillRect(cx-7+(t*5),cy-1,14-t*10,2);
    ctx.globalAlpha=t;
    ctx.restore();
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
    const cx=e.x+e.size/2,cy=e.y+e.size/2;
    const bossDef=BOSSES[e.bossType]??SUBBOSSES[e.bossType]??MINIBOSSES[e.bossType];
    if((e.phaseTransition??0)>0){
      const pt=e.phaseTransition??0;
      const total=BOSSES[e.bossType]?54:SUBBOSSES[e.bossType]?42:30;
      const progress=clamp(1-pt/total,0,1);
      const accent=bossDef?.accent??'#f4d03f',secondary=bossDef?.secondary??accent;
      ctx.save();
      ctx.globalAlpha=Math.min(.82,pt/Math.max(12,total*.34));
      ctx.strokeStyle=accent;ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(cx,cy,12+progress*42,0,Math.PI*2);ctx.stroke();
      ctx.globalAlpha*=.58;ctx.strokeStyle=secondary;ctx.beginPath();ctx.arc(cx,cy,22+progress*58,0,Math.PI*2);ctx.stroke();
      ctx.globalAlpha=.12+.14*Math.sin(f*.35);ctx.fillStyle=accent;ctx.beginPath();ctx.arc(cx,cy,18+(total-pt)*.42,0,Math.PI*2);ctx.fill();
      ctx.globalAlpha=.24+.32*(1-progress);ctx.lineWidth=1;
      for(let i=0;i<10;i++){
        const a=i*Math.PI/5+f*.015,r1=18+progress*16,r2=34+progress*38;
        ctx.strokeStyle=i%2?secondary:accent;
        ctx.beginPath();ctx.moveTo(cx+Math.cos(a)*r1,cy+Math.sin(a)*r1);ctx.lineTo(cx+Math.cos(a)*r2,cy+Math.sin(a)*r2);ctx.stroke();
      }
      ctx.restore();
    }
    if(e.telegraph>.05){
      const t=e.telegraph,ang=e.moveAngle;
      const accent=bossDef?.accent??(BOSSES[e.bossType]?'#ff6a63':SUBBOSSES[e.bossType]?'#f1a26f':'#ffd166');
      const secondary=bossDef?.secondary??accent;
      const step=e.bossAttackIndex??0;
      const preview=!bossDef?.legacy&&bossDef?.pattern?.sequence.length
        ? bossDef.pattern.sequence[(step+e.bossPhase*bossDef.pattern.phaseShift)%bossDef.pattern.sequence.length]
        : undefined;
      const px=engine.player.x+7,py=engine.player.y+8;
      ctx.save();
      ctx.globalAlpha=.18+t*.38;
      ctx.strokeStyle=accent;
      ctx.lineWidth=2+t*2;
      ctx.beginPath();ctx.arc(cx,cy,e.size*.62+t*8,0,Math.PI*2);ctx.stroke();

      // La previsualización anticipa la geometría real del próximo patrón.
      if(preview==='ring'||preview==='spiral'||preview==='nova'){
        ctx.globalAlpha=.14+t*.32;ctx.strokeStyle=secondary;
        for(let r=0;r<2+(preview==='spiral'?1:0);r++){
          ctx.beginPath();ctx.arc(cx,cy,28+t*(26+r*12)+r*12,0,Math.PI*2);ctx.stroke();
        }
      }else if(preview==='cage'||preview==='mines'){
        ctx.globalAlpha=.14+t*.3;ctx.strokeStyle=secondary;ctx.setLineDash([4,4]);
        const n=preview==='cage'?8:6,rad=preview==='cage'?64:48;
        for(let i=0;i<n;i++){
          const a=i/n*Math.PI*2+f*.005;
          const x=px+Math.cos(a)*rad,y=py+Math.sin(a)*rad;
          ctx.beginPath();ctx.arc(x,y,7+t*4,0,Math.PI*2);ctx.stroke();
        }
        ctx.setLineDash([]);
      }else if(preview==='lanes'){
        ctx.globalAlpha=.1+t*.22;ctx.strokeStyle=secondary;ctx.setLineDash([7,5]);
        const horizontal=(step+e.bossPhase)%2===0;
        for(const off of [-38,0,38]){
          ctx.beginPath();
          if(horizontal){ctx.moveTo(34,CANVAS_HEIGHT/2+off);ctx.lineTo(CANVAS_WIDTH-34,CANVAS_HEIGHT/2+off);}
          else{ctx.moveTo(CANVAS_WIDTH/2+off,34);ctx.lineTo(CANVAS_WIDTH/2+off,CANVAS_HEIGHT-34);}
          ctx.stroke();
        }
        ctx.setLineDash([]);
      }else if(preview==='summon'){
        ctx.globalAlpha=.22+t*.32;ctx.fillStyle=secondary;
        for(let i=0;i<4;i++){const a=f*.025+i*Math.PI/2;ctx.fillRect(cx+Math.cos(a)*34-2,cy+Math.sin(a)*27-2,4,4);}
      }else if(preview==='warp'){
        ctx.globalAlpha=.18+t*.3;ctx.strokeStyle=secondary;ctx.setLineDash([3,5]);
        ctx.beginPath();ctx.arc(cx,cy,36+t*12,0,Math.PI*2);ctx.stroke();
        ctx.beginPath();ctx.arc(px,py,16+t*10,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
      }else{
        ctx.globalAlpha=.2+t*.34;ctx.strokeStyle=secondary;ctx.setLineDash([5,4]);
        const rays=preview==='crossfire'?3:preview==='fan'?3:preview==='sniper'?1:preview==='rush'?2:1;
        for(let i=0;i<rays;i++){
          const offset=rays===1?0:(i-(rays-1)/2)*(preview==='crossfire'?.38:.16);
          ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(ang+offset)*(78+t*60),cy+Math.sin(ang+offset)*(78+t*60));ctx.stroke();
        }
        ctx.setLineDash([]);
      }
      ctx.restore();
    }
    ctx.save();
    const wind=e.telegraph>.05?e.telegraph:0;
    const phasePulse=(e.phaseTransition??0)>0?Math.sin((54-(e.phaseTransition??0))*.28)*.045:0;
    const scale=1+wind*.055+phasePulse;
    ctx.translate(cx,cy);
    ctx.scale(scale,Math.max(.9,1-wind*.025+phasePulse));
    ctx.translate(-cx,-cy);
    if(hurt)ctx.filter='brightness(1.85) saturate(.55)';
    drawBoss(ctx, e.x, e.y, e.bossType, f, e.hp, e.maxHp, hurt, e.bossPhase);
    ctx.filter='none';
    ctx.restore();
    drawBossMutationOverlay(ctx,e,f,engine);
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

  if(!e.isBoss && e.elite){
    const cx=e.x+e.size/2,cy=e.y+e.size/2,pulse=.5+.5*Math.sin(f*.16+e.id);
    ctx.save();
    ctx.globalAlpha=.16+.12*pulse;ctx.strokeStyle='#f4d03f';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.ellipse(cx,cy+2,e.size*.72,e.size*.58,0,0,Math.PI*2);ctx.stroke();
    ctx.globalAlpha=.55+.25*pulse;ctx.fillStyle='#f4d03f';
    ctx.fillRect(Math.round(cx)-4,e.y-10,2,3);ctx.fillRect(Math.round(cx),e.y-13,2,6);ctx.fillRect(Math.round(cx)+4,e.y-10,2,3);
    ctx.fillRect(Math.round(cx)-5,e.y-7,12,2);
    ctx.globalAlpha=.4;
    for(let i=0;i<3;i++){const a=f*.025+i*2.1;ctx.fillRect(Math.round(cx+Math.cos(a)*(e.size*.65)),Math.round(cy+Math.sin(a)*(e.size*.48)),2,2);}
    ctx.restore();
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

function drawWideMenuChrome(engine:GameEngine,label:string,accent='#e6c56f') {
  if(CANVAS_WIDTH<=UI_BASE_WIDTH+16)return;
  const ctx=engine.ui!;
  const safe=visibleCanvasRect(8);
  const safeLeft=safe.x,safeRight=safe.x+safe.w;
  const coreLeft=UI_OFFSET_X,coreRight=UI_OFFSET_X+UI_BASE_WIDTH;
  const leftRegion=Math.max(0,coreLeft-safeLeft);
  const rightRegion=Math.max(0,safeRight-coreRight);
  const mode=engine.gameMode==='endless'?'SIN FIN':engine.gameMode==='daily'?'DIARIO':'ATRACO';
  const progress=engine.gameMode==='endless'?'RONDA '+engine.endless.round:'PISO '+(engine.map.floorIndex+1)+'/6';
  const state=engine.state===GameState.PAUSED?'EN PAUSA':engine.state===GameState.CONFIRM?'CONFIRMAR':'LISTO';

  ctx.save();

  // Sólo cubrimos la zona realmente visible del canvas. Así ningún texto o
  // panel queda cortado cuando fullscreen usa cover.
  ctx.fillStyle='rgba(3,8,12,.82)';
  ctx.fillRect(safeLeft,0,safe.w,CANVAS_HEIGHT);

  const topY=Math.max(4,safe.y+4),bottomY=Math.min(CANVAS_HEIGHT-23,safe.y+safe.h-23);
  ctx.fillStyle='rgba(5,13,18,.94)';ctx.fillRect(safeLeft,topY,safe.w,19);
  ctx.fillStyle=accent;ctx.globalAlpha=.38;ctx.fillRect(safeLeft,topY+18,safe.w,1);ctx.globalAlpha=1;
  text(ctx,'VELCORE GAMES // DUCK HEIST',safeLeft+10,topY+13,4.45,'#8aa09d','left',true,false);
  text(ctx,label,safeRight-10,topY+13,4.55,accent,'right',true,false);

  ctx.fillStyle='rgba(5,13,18,.92)';ctx.fillRect(safeLeft,bottomY,safe.w,18);
  ctx.globalAlpha=.34;ctx.fillStyle=accent;ctx.fillRect(safeLeft,bottomY,safe.w,1);ctx.globalAlpha=1;
  text(ctx,'ESC · VOLVER / PAUSA',safeLeft+10,bottomY+12,4.25,'#788f93','left',true,false);
  text(ctx,'F · PANTALLA COMPLETA',safeRight-10,bottomY+12,4.25,'#788f93','right',true,false);

  // Railes laterales sólo si hay espacio suficiente. Si el cover recorta los
  // bordes, sus anchos se recalculan a partir del área visible.
  if(leftRegion>=58){
    const pad=7,cardX=safeLeft+pad,cardW=Math.max(44,leftRegion-pad*2);
    drawMenuCard(ctx,cardX,50,cardW,92,false,accent,'rgba(8,19,25,.94)');
    text(ctx,'OPERACIÓN',cardX+8,66,3.7,'#667d82','left',true,false);
    wrappedText(ctx,mode,cardX+8,82,cardW-16,5.25,6.1,2,'#e4e9e4',true);
    ctx.fillStyle='rgba(255,255,255,.05)';ctx.fillRect(cardX+8,95,cardW-16,1);
    text(ctx,'DIFICULTAD',cardX+8,109,3.7,'#667d82','left',true,false);
    wrappedText(ctx,difficultyLabel(engine),cardX+8,125,cardW-16,4.95,5.9,2,accent,true);
    ctx.globalAlpha=.22;ctx.fillStyle=accent;ctx.fillRect(coreLeft-2,46,1,CANVAS_HEIGHT-92);ctx.globalAlpha=1;
  }

  if(rightRegion>=58){
    const pad=7,cardX=coreRight+pad,cardW=Math.max(44,rightRegion-pad*2);
    drawMenuCard(ctx,cardX,50,cardW,92,false,accent,'rgba(8,19,25,.94)');
    text(ctx,'PROGRESO',cardX+8,66,3.7,'#667d82','left',true,false);
    wrappedText(ctx,progress,cardX+8,82,cardW-16,5.25,6.1,2,'#e4e9e4',true);
    ctx.fillStyle='rgba(255,255,255,.05)';ctx.fillRect(cardX+8,95,cardW-16,1);
    text(ctx,'ESTADO',cardX+8,109,3.7,'#667d82','left',true,false);
    wrappedText(ctx,state,cardX+8,125,cardW-16,4.95,5.9,2,state==='EN PAUSA'?'#d8c57d':'#78c99a',true);
    ctx.globalAlpha=.22;ctx.fillStyle=accent;ctx.fillRect(coreRight+1,46,1,CANVAS_HEIGHT-92);ctx.globalAlpha=1;
  }

  // En formatos con rail estrecho conservamos un identificador compacto.
  if(leftRegion>=36&&leftRegion<58)text(ctx,'VC',safeLeft+leftRegion/2,176,4.1,accent,'center',true,false);
  if(rightRegion>=36&&rightRegion<58)text(ctx,'RUN',coreRight+rightRegion/2,176,4.1,accent,'center',true,false);

  ctx.restore();
}

export function renderUI(engine: GameEngine) {
  const ctx = engine.ui;
  if (!ctx) return;
  const s = engine.state;
  ctx.save();
  ctx.scale(engine.uiScale, engine.uiScale);
  ctx.imageSmoothingEnabled = true;

  const legacy=(draw:()=>void)=>{
    ctx.save();
    ctx.translate(UI_OFFSET_X,0);
    draw();
    ctx.restore();
  };
  const framedLegacy=(draw:()=>void,label:string,accent:string)=>{
    drawWideMenuChrome(engine,label,accent);
    legacy(draw);
  };

  switch (s) {
    case GameState.MENU: {
      const wide=CANVAS_WIDTH>UI_BASE_WIDTH+64;
      drawWideMenuChrome(engine,'CENTRO DE OPERACIONES','#e6c56f');
      if(wide)renderMenuUI(engine,true);else legacy(()=>renderMenuUI(engine,false));
      break;
    }
    case GameState.DIFFICULTY: framedLegacy(()=>renderDifficultyUI(engine),'SELECCIÓN DE RIESGO','#d86b58'); break;
    case GameState.DAILY_BRIEF: framedLegacy(()=>renderDailyBrief(engine),'DESAFÍO DIARIO','#79b9d2'); break;
    case GameState.MAP: framedLegacy(()=>renderFloorMap(engine),'PLANO DEL BANCO','#79b9d2'); break;
    case GameState.COLLECTION: framedLegacy(()=>renderCollection(engine),'ARCHIVO DEL ATRACO','#b992d8'); break;
    case GameState.HEIST_INTRO:
      legacy(()=>{
        const t=1-engine.heistIntroTimer/90;
        ctx.globalAlpha=Math.max(0,1-t*3);drawTitleLogo(ctx,UI_BASE_WIDTH/2,62,engine.frame);ctx.globalAlpha=1;
        ctx.fillStyle=`rgba(255,226,154,${Math.max(0,(t-.4)*1.6)})`;ctx.fillRect(0,0,UI_BASE_WIDTH,CANVAS_HEIGHT);
        if(t>.88) {ctx.fillStyle=`rgba(5,15,22,${(t-.88)/.12})`;ctx.fillRect(0,0,UI_BASE_WIDTH,CANVAS_HEIGHT);}
      });
      break;
    case GameState.HOW_TO_PLAY: framedLegacy(()=>renderHowToPlayUI(engine),'MANUAL DEL LADRÓN','#d7b56c'); break;
    case GameState.SETTINGS: framedLegacy(()=>renderSettingsUI(engine),'SISTEMA DEL ATRACO','#8fb7c8'); break;
    case GameState.CONTROLS: framedLegacy(()=>renderControls(engine),'CONFIGURACIÓN DE CONTROLES','#79b9d2'); break;
    case GameState.CAREER: framedLegacy(()=>renderCareer(engine),'EXPEDIENTE DE CARRERA','#78c99a'); break;
    case GameState.WARDROBE: framedLegacy(()=>renderWardrobeUI(engine),'ARMARIO DEL LADRÓN','#79b9d2'); break;
    case GameState.UPGRADES: framedLegacy(()=>renderUpgradesUI(engine),'MEJORAS PERMANENTES','#e6c56f'); break;
    case GameState.GAME_OVER: framedLegacy(()=>renderGameOverUI(engine),'OPERACIÓN FALLIDA','#d85d58'); break;
    case GameState.VICTORY: framedLegacy(()=>renderVictoryUI(engine),'OPERACIÓN COMPLETADA','#78c99a'); break;
    case GameState.PAUSED:
      drawHUD(engine); renderPrompts(engine); framedLegacy(()=>renderPausedUI(engine),'ATRACO EN PAUSA','#e6c56f'); break;
    case GameState.FLOOR_INTRO:
      drawHUD(engine); renderFloorIntroUI(engine); break;
    case GameState.BOSS_INTRO:
      drawHUD(engine); renderPrompts(engine); renderBossIntroUI(engine); break;
    case GameState.ENDLESS_REWARD:
      drawHUD(engine); framedLegacy(()=>renderEndlessRewardUI(engine),'RECOMPENSA DE RONDA','#d8c57d'); break;
    case GameState.ENDLESS_RESUME:
      framedLegacy(()=>renderEndlessResumeUI(engine),'REINGRESO SIN FIN','#d86b58'); break;
    case GameState.RUN_INFO:
      framedLegacy(()=>renderRunInfoUI(engine),'DOSSIER EN CURSO','#79b9d2'); break;
    case GameState.CONFIRM:
      framedLegacy(()=>renderConfirmUI(engine),'CONFIRMACIÓN REQUERIDA','#d85d58'); break;
    case GameState.FLOOR_CLEAR:
      renderFloorClearUI(engine); break;
    default:
      drawHUD(engine);
      renderPrompts(engine);
      if(engine.keys.tab) legacy(()=>renderRunStats(engine));
      break;
  }

  ctx.restore();
}

// ---------------------------------------------------------------------------
// PROMPTS Y FICHAS (coordenadas de mundo, tipografía nítida)
// ---------------------------------------------------------------------------
function renderRunStats(engine:GameEngine) {
  const ctx=engine.ui!,r=engine.run,s=engine.stats,p=engine.player;
  ctx.save();ctx.fillStyle='rgba(2,6,12,.82)';ctx.fillRect(0,0,UI_BASE_WIDTH,CANVAS_HEIGHT);
  drawPanel(ctx,104,50,272,244,'rgba(8,16,25,.98)','#d6b45f');
  text(ctx,'ESTADÍSTICAS DE LA RUN',240,75,12,'#f4d03f','center',true);
  text(ctx,`PISO  ${r.floorReached}/${TOTAL_FLOORS}`,128,104,8,'#e9dfbd','left',true);
  text(ctx,`SALAS  ${s.roomsCleared}`,128,127,8,'#cbd5d9','left');
  text(ctx,`ENEMIGOS  ${s.enemiesDefeated}`,128,150,8,'#cbd5d9','left');
  text(ctx,`JEFES  ${r.bosses}`,128,173,8,'#cbd5d9','left');
  text(ctx,`${engine.gameMode==='endless'?'MIGAS':'MIGAJAS'}  ${Math.floor(p.crumbs)}`,252,104,8,'#e9dfbd','left',true);
  text(ctx,`PAN ROBADO  ${s.breadStolen}`,252,127,8,'#cbd5d9','left');
  text(ctx,`OBJETOS  ${r.items}`,252,150,8,'#cbd5d9','left');
  text(ctx,`ARMAS  ${r.weaponsFound}`,252,173,8,'#cbd5d9','left');
  text(ctx,`DAÑO HECHO  ${Math.round(r.dmgDealt)}`,128,208,8,'#9ec6b8','left');
  text(ctx,`DAÑO RECIBIDO  ${Math.round(r.dmgTaken)}`,128,231,8,'#d7a39c','left');
  text(ctx,'SUELTA TAB PARA CERRAR',240,272,7,'#8fa1a8','center');
  ctx.restore();
}

function prompt(ctx: CanvasRenderingContext2D, x: number, y: number, label: string, color = '#f4d03f') {
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
    text(ctx, room.type===RoomType.GUN_VAN?'EL PROVEEDOR':content.cafe?'BARISTA MIGAJÓN':'DON MIGAJÓN', CANVAS_WIDTH/2, CANVAS_HEIGHT*.16, 11, room.type===RoomType.GUN_VAN?'#e79a45':content.cafe?'#e7b978':'#f4d03f', 'center', true);
    if((content.merchantUntil ?? 0)>f) text(ctx,`“${content.merchantLine}”`, CANVAS_WIDTH/2,120,8,'#d5c8a2');
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
      prompt(ctx,event.x+8,event.y+39,'1 / 2 · ELEGIR    '+actionPrompt(engine,'interact')+' · CONFIRMAR');
    }
  }
  if(content.challenge==='alarm' && !room.cleared) text(ctx,`ALARMA · ${Math.ceil((content.alarmTimer ?? 0)/60)} s`, CANVAS_WIDTH/2,64,9,'#e2a477','center',true);
  if(content.challenge==='flawless' && !room.cleared) text(ctx,content.damaged?'DESAFÍO: SIN BONIFICACIÓN':'DESAFÍO: SIN RECIBIR DAÑO', CANVAS_WIDTH/2,64,8,'#cdaacb');
  if(room.modifier && !room.cleared && engine.roomLabelTimer<=0) {
    text(ctx,MODIFIER_LABELS[room.modifier]+(room.modifier==='cameras'&&!content.modifierResolved?` · ${Math.ceil((content.securityTimer ?? 0)/60)} s`:''), CANVAS_WIDTH/2,46,7,'#b9a58d');
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
    const endless=engine.gameMode==='endless';
    const a=endless?Math.min(1,t/14):(t > 75 ? (95 - t) / 20 : Math.min(1, t / 25));
    ctx.globalAlpha = clamp(a, 0, 1);
    text(ctx,engine.roomLabel, CANVAS_WIDTH/2,endless?42:55,endless?6.5:10,endless?'#a9a17d':'#e3c989','center',!endless);
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
    text(ctx,'SINERGIA · '+notice.name, CANVAS_WIDTH/2,282,10,'#d0a4ec','center',true);ctx.globalAlpha=1;
  }
  if(engine.tutorialHint && !engine.pickupCard && !engine.swap) {
    const hint=engine.tutorialHint;
    const key=hint.kind==='map'?actionPrompt(engine,'map'):hint.kind==='wheel'?actionPrompt(engine,'weapons'):actionPrompt(engine,'dash');
    const label=hint.kind==='map'?'ABRIR MAPA':hint.kind==='wheel'?'CAMBIAR ARMA':'ESQUIVAR';
    ctx.globalAlpha=Math.min(1,hint.timer/30);text(ctx,`${hint.kind==='wheel'?'USA':'PRESIONA'} ${key} · ${label}`, CANVAS_WIDTH/2,266,8,'#ccddba','center',true);ctx.globalAlpha=1;
  }
  for(const d of engine.damageNumbers) {
    ctx.globalAlpha=d.life;text(ctx,d.value===0?T.block:String(Math.round(d.value)),d.x,d.y,d.crit?11:8,d.crit?'#f9d889':'#f0ebd7','center',true);ctx.globalAlpha=1;
  }
  if(p.combo>=3 && p.comboTimer>0 && !engine.pickupCard) {
    ctx.globalAlpha=Math.min(.85,p.comboTimer/35);
    text(ctx,`${p.combo} · ${p.combo>=10?'ATRACO PERFECTO':p.combo>=6?'IMPARABLE':'RACHA'}`, CANVAS_WIDTH-12,280,7,'#bca969','right');ctx.globalAlpha=1;
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
    const betweenRounds=engine.gameMode==='endless'&&!engine.endless.roundActive&&engine.endless.nextRoundTimer>0;
    const a = Math.min(1, engine.toastTimer / (betweenRounds?12:30));
    ctx.globalAlpha = betweenRounds?Math.min(.78,a):a;
    text(ctx, engine.toast, CANVAS_WIDTH / 2, betweenRounds?CANVAS_HEIGHT-52:CANVAS_HEIGHT-70, betweenRounds?6.2:9, betweenRounds?'#9aa8a0':'#fff6c9', 'center', !betweenRounds);
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
    text(ctx,`${actionPrompt(engine,'weapons')} · CAMBIAR ARMA`, CANVAS_WIDTH/2,244,7,'#8792a5');
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
  drawMenuBackdrop(ctx,menuFrame(engine),.92,'#c98cff');
  drawMenuHeader(ctx,'OBJETO ACTIVO','El actual volverá al suelo.',engine.frame,'#c98cff','CAMBIO DE EQUIPO');

  drawMenuCard(ctx,box.x,78,box.w,132,true,'#c98cff','rgba(12,20,30,.97)');
  drawSectionLabel(ctx,'ENCONTRADO',box.x+18,98,'#c98cff');
  drawItemIcon(ctx,box.x+28,box.y+56,next.id,36);
  wrappedText(ctx,next.name,box.x+78,box.y+72,184,11,13,2,'#f3e7ff',true);
  wrappedText(ctx,next.description,box.x+78,box.y+103,184,7.2,9.5,3,'#a99fbc');

  drawMenuCard(ctx,box.x+18,box.y+132,box.w-36,54,false,'#6c7d87','rgba(8,18,24,.95)');
  text(ctx,'ACTUAL',box.x+32,box.y+149,5,'#72858c','left',true,false);
  drawItemIcon(ctx,box.x+32,box.y+154,current.id,24);
  wrappedText(ctx,current.name,box.x+68,box.y+171,180,8,10,1,'#dfcf9f',true);

  drawMouseButton(ctx,'CAMBIAR',box.confirm.x,box.confirm.y,box.confirm.w,box.confirm.h,inside(engine.mouseX,engine.mouseY,box.confirm),'#c98cff');
  drawMouseButton(ctx,'CANCELAR',box.cancel.x,box.cancel.y,box.cancel.w,box.cancel.h,inside(engine.mouseX,engine.mouseY,box.cancel),'#6c7d87');
}

const isFull = (p: GameEngine['player']) => p.weapons.every(w => w !== null);

// ---------------------------------------------------------------------------
// HUD
// ---------------------------------------------------------------------------
function renderDangerEventHUD(engine: GameEngine) {
  const room=currentRoomOf(engine),content=getContentOf(engine);
  if(room.type!==RoomType.EVENT || content.cafe || !content.dangerEventActive) return;
  const ctx=engine.ui!;
  const enemies=Math.max(0,content.enemies.length);
  const timer=Math.max(0,content.dangerEventTimer ?? 0);
  const total=Math.max(1,content.dangerEventTotal ?? 1);
  const seconds=(timer/60).toFixed(1);
  const pulse=.55+.45*Math.sin(engine.frame*.13);
  const x=CANVAS_WIDTH/2-148,y=27,w=296,h=61;
  ctx.save();
  ctx.fillStyle='rgba(14,8,10,.90)';ctx.fillRect(x,y,w,h);
  ctx.strokeStyle=`rgba(255,79,67,${.7+pulse*.3})`;ctx.lineWidth=2;ctx.strokeRect(x+1,y+1,w-2,h-2);
  ctx.fillStyle='rgba(255,79,67,.16)';ctx.fillRect(x+5,y+5,w-10,11);
  text(ctx,'EVENTO DE ALTO RIESGO',CANVAS_WIDTH/2,y+13,7.2,'#ff786b','center',true);
  if(timer>0) titleText(ctx,`SOBREVIVE ${seconds} s`,CANVAS_WIDTH/2,y+36,13.5,'#fff0c2');
  else titleText(ctx,'ELIMINA A LOS RESTANTES',CANVAS_WIDTH/2,y+36,11.5,'#fff0c2');
  text(ctx,`SEGURIDAD RESTANTE: ${enemies}`,CANVAS_WIDTH/2,y+49,6.8,enemies>0?'#ffb36b':'#86e3a0','center',true);
  ctx.fillStyle='rgba(255,255,255,.10)';ctx.fillRect(x+14,y+54,w-28,4);
  ctx.fillStyle=timer>0?'#e75c4c':'#d7ae4b';ctx.fillRect(x+14,y+54,(w-28)*(timer>0?timer/total:Math.min(1,enemies?0:1)),4);
  ctx.restore();
}

function drawHUD(engine: GameEngine) {
  const ctx=engine.ui!;
  const safe=visibleCanvasRect(6),safeLeft=safe.x,safeRight=safe.x+safe.w;
  ctx.save();ctx.imageSmoothingEnabled=false;ctx.fillStyle='#e8d79a';ctx.font='700 5px "Chakra Petch",monospace';ctx.textBaseline='top';ctx.textAlign='left';ctx.shadowColor='#000';ctx.shadowBlur=1;ctx.fillText('v0.8.0',safeLeft+4,8);ctx.restore();
  const p=engine.player;
  const heartW=Math.min(p.maxHp,10)*13+7;
  ctx.fillStyle='rgba(5,12,18,.48)';ctx.fillRect(safeLeft+4,4,heartW,18);
  ctx.strokeStyle='rgba(244,208,63,.14)';ctx.strokeRect(safeLeft+4.5,4.5,heartW-1,17);
  for(let i=0;i<p.maxHp;i++) {
    ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(safeLeft+7+(i%10)*13,5+Math.floor(i/10)*13);
    if(p.hp<=1&&i===0)ctx.globalAlpha=.78+Math.sin(engine.frame*.055)*.2;
    drawHeart(ctx,0,0,i<p.hp,p.hp>i&&p.hp<i+1);
    if(p.healFlash>0&&i<p.hp){ctx.globalAlpha=p.healFlash/36;ctx.fillStyle='#badba4';ctx.fillRect(1,13,10,1);}
    ctx.restore();
  }
  if(p.hurtTimer>0){
    const hurtA=clamp(p.hurtTimer/22,0,1);
    ctx.save();ctx.globalAlpha=.18+.34*hurtA;ctx.strokeStyle='#ff6c63';ctx.lineWidth=1;
    ctx.strokeRect(safeLeft+2.5,2.5,heartW+3,21);ctx.restore();
  }
  if(p.shield>0||p.helmetShield||p.contactShield>0)text(ctx,`ESCUDO ${p.shield+p.contactShield+(p.helmetShield?1:0)}`,safeLeft+6,31,5.5,'#9fdae0','left');

  drawMouseButton(ctx,'MENÚ',HUD_MENU.x,HUD_MENU.y,HUD_MENU.w,HUD_MENU.h,inside(engine.mouseX,engine.mouseY,HUD_MENU),'#8fb7c8');
  const cx=safeRight-80;
  drawPanel(ctx,cx,4,76,28,'rgba(5,12,18,.52)','rgba(115,133,146,.24)','rgba(31,48,57,.38)');
  drawItemIcon(ctx,cx+4,5,'crumb',12);text(ctx,engine.gameMode==='endless'?'MIGAS':'MIGAJAS',cx+19,12,5.2,'#899f98','left');
  text(ctx,`${p.crumbs}`,cx+70,13,7.5,'#e8c99b','right',true);
  drawItemIcon(ctx,cx+4,18,'golden_crumb',11);text(ctx,engine.gameMode==='endless'?'DORADAS':'MONEDAS',cx+19,25,5.2,'#ac9a65','left');
  text(ctx,`${engine.totalGoldenCrumbs}`,cx+70,26,7.5,'#f4d03f','right',true);
  if(engine.gameMode==='endless'){
    text(ctx,'ATRACO SIN FIN', CANVAS_WIDTH/2,10,6.5,'#d3c999','center',true);
    text(ctx,`MISMA ARENA · ${endlessStage(Math.max(1,engine.endless.round))}`, CANVAS_WIDTH/2,19,5.4,'#829c98');
  } else {
    text(ctx,`PISO ${engine.map.floorIndex+1}/${TOTAL_FLOORS}`, CANVAS_WIDTH/2,10,6.2,'#d3c999','center',true);
    text(ctx,FLOOR_NAMES_ES[engine.map.floorIndex], CANVAS_WIDTH/2,19,5.7,'#829c98');
    drawMinimap(engine);
  }
  drawBossBar(engine);
  if(engine.alert>=5){
    ctx.fillStyle='rgba(5,12,18,.48)';ctx.fillRect(safeLeft+5,27,62,12);
    text(ctx,`ALERTA ${Math.round(engine.alert)}`,safeLeft+8,33,5.5,engine.alert>60?'#ff8f7f':'#d4b47c','left',true);
    ctx.fillStyle='rgba(255,255,255,.08)';ctx.fillRect(safeLeft+8,35,54,2);
    ctx.fillStyle=engine.alert>60?'#e45b4f':'#c78868';ctx.fillRect(safeLeft+8,35,54*engine.alert/100,2);
  }

  const slotW=92,slotH=25,baseX=safeLeft+5,baseY=CANVAS_HEIGHT-slotH-5;
  for(let i=0;i<2;i++){
    const weapon=p.weapons[i],active=p.activeWeapon===i,x=baseX+i*(slotW+5),y=baseY-(active?2:0);
    ctx.save();if(active){ctx.shadowColor='rgba(244,208,63,.28)';ctx.shadowBlur=6;}
    drawPanel(ctx,x,y,slotW,slotH,active?'rgba(12,17,27,.64)':'rgba(6,9,15,.40)',active?'rgba(244,208,63,.78)':'rgba(70,79,94,.35)','rgba(42,52,65,.44)');ctx.restore();
    const slide=active&&p.switchAnim>0?(1-p.switchAnim/12)*4-4:0;
    ctx.save();ctx.translate(x+5+slide,y+5);ctx.scale(active?1.08:.92,active?1.08:.92);ctx.globalAlpha=active?1:.45;
    if(weapon)drawWeaponIcon(ctx,0,0,weapon.id);else{ctx.fillStyle='#202735';ctx.fillRect(3,6,11,4);ctx.fillStyle='#39414f';ctx.fillRect(5,10,3,3);}ctx.restore();
    wrappedText(ctx,`[${i+1}] ${weapon?weapon.name:T.empty}`,x+25,y+8,slotW-30,5.6,6.5,2,weapon?(active?'#efe1ac':'#84909f'):'#4f586a',active);
    if(weapon&&active){
      const ready=1-p.fireCooldown/Math.max(1,activeWeapon(p).fireRate);
      ctx.fillStyle='rgba(255,255,255,.08)';ctx.fillRect(x+26,y+18,57,3);
      ctx.fillStyle=ready>=1?'#39d353':'#f4d03f';ctx.fillRect(x+26,y+18,57*clamp(ready,0,1),3);
      ctx.fillStyle='#f4d03f';ctx.beginPath();ctx.moveTo(x-3,y+slotH/2);ctx.lineTo(x,y+slotH/2-4);ctx.lineTo(x,y+slotH/2+4);ctx.closePath();ctx.fill();
    }
  }

  if(p.activeItem){
    const x=safeRight-86-5,y=CANVAS_HEIGHT-25-5,ready=p.activeItemCooldown<=0,flash=p.quackReadyFlash>0;
    ctx.save();if(flash){ctx.shadowColor='#f4d03f';ctx.shadowBlur=7;}drawPanel(ctx,x,y,86,25,'rgba(6,9,15,.58)',flash?'rgba(255,243,176,.9)':ready?'rgba(244,208,63,.72)':'rgba(65,72,86,.35)','rgba(42,52,65,.42)');ctx.restore();
    ctx.save();ctx.translate(x+5,y+5);ctx.scale(ready?1.08:.95,ready?1.08:.95);ctx.globalAlpha=ready?1:.48;drawItem(ctx,0,0,p.activeItem,engine.frame);ctx.restore();
    const def=ACTIVE_ITEMS[p.activeItem];wrappedText(ctx,def?.name??'',x+24,y+8,57,5.4,6.3,2,ready?'#eee1b2':'#7c8494',true);
    if(flash)text(ctx,'LISTO',x+80,y+21,6.6,'#39d353','right',true);
    else if(ready)text(ctx,'LISTA',x+80,y+21,6.2,'#39d353','right',true);
    else{
      text(ctx,`${(p.activeItemCooldown/(60*getBuild(p).cooldownRate)).toFixed(1)} s`,x+80,y+21,5.7,'#7c8494','right');
      ctx.fillStyle='rgba(255,255,255,.08)';ctx.fillRect(x+25,y+18,48,2);ctx.fillStyle='#f4d03f';ctx.fillRect(x+25,y+18,48*(1-p.activeItemCooldown/p.activeItemMaxCooldown),2);
    }
  }

  const dashReady=p.dashCooldown<=0,dashFlash=p.dashReadyFlash>0,dashW=46,dashX=CANVAS_WIDTH/2-dashW/2;
  ctx.fillStyle='rgba(255,255,255,.07)';ctx.fillRect(dashX,CANVAS_HEIGHT-15,dashW,3);
  ctx.fillStyle=dashFlash?'#a3f0c2':dashReady?'#1abc9c':'#4f586a';ctx.fillRect(dashX,CANVAS_HEIGHT-15,dashW*clamp(1-p.dashCooldown/(45*getBuild(p).dashCooldown),0,1),3);
  text(ctx,engine.lastInput==='gamepad'?'B · ESQUIVE':'ESQUIVE', CANVAS_WIDTH/2,CANVAS_HEIGHT-5,5.3,dashReady?'#1abc9c':'#68717f','center',dashFlash);

  if(p.items.length){
    const n=Math.min(p.items.length,8);ctx.fillStyle='rgba(5,12,18,.38)';ctx.fillRect(safeLeft+5,CANVAS_HEIGHT-48,n*14+6,14);
    for(let i=0;i<n;i++)drawItemIcon(ctx,safeLeft+8+i*14,CANVAS_HEIGHT-47,p.items[i],12);
    if(p.items.length>8)text(ctx,`+${p.items.length-8}`,safeLeft+12+n*14,CANVAS_HEIGHT-38,6,'#f4d03f','left');
  }
  renderDangerEventHUD(engine);
  if(engine.gameMode==='endless'){
    const e=engine.endless;
    drawPanel(ctx,safeLeft+6,50,104,37,'rgba(4,9,14,.72)','rgba(137,109,48,.55)');
    text(ctx,`RONDA ${Math.max(1,e.round)}`,safeLeft+12,62,7,'#f4d03f','left',true);
    text(ctx,`ALERTA ${e.alert} · ${e.threatRank}`,safeLeft+12,73,5.2,'#b9c7be','left');
    const pw=88;ctx.fillStyle='rgba(255,255,255,.08)';ctx.fillRect(safeLeft+12,78,pw,4);
    ctx.fillStyle=e.pressure>=75?'#e55f55':e.pressure>=50?'#e6a04e':'#78b99a';ctx.fillRect(safeLeft+12,78,pw*clamp(e.pressure/100,0,1),4);
    const pressureState=e.pressure>=75?'CRÍTICO':e.pressure>=50?'PELIGRO':e.pressure>=25?'ALERTA':'CONTROL';
    text(ctx,`PRESIÓN ${Math.round(e.pressure)}% · ${pressureState}`,safeLeft+104,86,4.4,e.pressure>=75?'#ef8278':'#8fa1a8','right',e.pressure>=75);
    if(e.compositionLabel&&e.roundActive&&e.roundKind!=='boss'&&e.roundKind!=='subboss'&&e.roundKind!=='miniboss')text(ctx,e.compositionLabel,safeLeft+12,96,4.8,'#8ea9a2','left',true);
    if(e.milestone)text(ctx,e.milestone, CANVAS_WIDTH/2,31,6.4,e.round>=100?'#ff6c66':'#f4d03f','center',true);
  }
  renderDailyHUD(engine);
}

function drawBossBar(engine: GameEngine) {
  const ctx=engine.ui!;
  const content=getContentOf(engine);
  const boss=content.enemies.find((e:Enemy)=>e.isBoss);
  if(!boss) return;
  const isFloorBoss=!!BOSSES[boss.bossType];
  const isSubBoss=!!SUBBOSSES[boss.bossType];
  const def=BOSSES[boss.bossType]??SUBBOSSES[boss.bossType]??MINIBOSSES[boss.bossType];
  const phaseCount=isFloorBoss?3:isSubBoss?2:1;
  const phase=Math.max(0,boss.bossPhase);
  const safe=visibleCanvasRect(18);
  const w=isFloorBoss?Math.min(CANVAS_WIDTH-108,safe.w):isSubBoss?Math.min(300,safe.w):Math.min(220,safe.w);
  const x=safe.x+(safe.w-w)/2,y=isFloorBoss?74:isSubBoss?73:72;
  const accent=isFloorBoss?(phase>=2?'#ff4f52':phase===1?'#ff875f':'#ffb078'):isSubBoss?(phase>=1?'#f06f62':'#d99a68'):(phase>=1?'#ffd84f':'#c9a227');
  const tier=isFloorBoss?'JEFE DE PISO':isSubBoss?'SUBJEFE':'MINIJEFE';
  const phaseText=isFloorBoss?`FASE ${phase+1}/3`:isSubBoss?`FASE ${phase+1}/2`:(phase>=1?'ENRAGE':'');
  text(ctx,tier,CANVAS_WIDTH/2,y-12,5.4,'#7f8998','center');
  text(ctx,def?.name??'',CANVAS_WIDTH/2,y,isFloorBoss?14:isSubBoss?12:11,accent,'center',true);
  if(phaseText) text(ctx,phaseText,CANVAS_WIDTH/2,y+22,5.2,accent,'center',phase>0);
  if(engine.gameMode==='endless'&&boss.mutation) text(ctx,`MUTACIÓN · ${boss.mutation}`,CANVAS_WIDTH/2,y+30,5.1,boss.mutation==='TORMENTA'?'#8ecfff':boss.mutation==='BLINDADO'?'#b6c3ce':'#f2a66f','center',true);
  ctx.fillStyle='rgba(4,6,12,.88)';ctx.fillRect(x,y+6,w,10);
  const pct=clamp(boss.hp/boss.maxHp,0,1)*clamp(1-boss.spawnAnim/30,0,1);
  const g=ctx.createLinearGradient(x,0,x+w,0);
  g.addColorStop(0,isFloorBoss?'#a92e35':isSubBoss?'#a94f38':'#8d6f23');
  g.addColorStop(1,accent);
  ctx.fillStyle=g;ctx.fillRect(x+1,y+7,(w-2)*pct,8);
  ctx.fillStyle='rgba(255,255,255,.32)';ctx.fillRect(x+1,y+7,(w-2)*pct,2);
  ctx.fillStyle='#39414f';ctx.fillRect(x,y+6,w,1);ctx.fillRect(x,y+15,w,1);
  for(let i=1;i<phaseCount;i++){
    ctx.fillStyle='rgba(4,6,12,.95)';
    ctx.fillRect(x+(w/phaseCount)*i,y+6,2,10);
  }
  if(phaseCount>1){
    for(let i=0;i<phaseCount;i++){
      const px=x+(w/phaseCount)*(i+.5),active=i===phase,done=i<phase;
      ctx.fillStyle=active?accent:done?'#6e7b82':'#303842';
      const pulse=active?1+Math.round((Math.sin(engine.frame*.16)+1)*.5):0;
      ctx.fillRect(Math.round(px)-3-pulse,y+18,6+pulse*2,2);
    }
  }
}
function drawMinimap(engine: GameEngine) {
  const ctx = engine.ui!;
  const visible=visibleRoomKeys(engine);
  const rooms=[...visible].map(id=>engine.map.rooms.get(id)!);
  if (!rooms.length) return;
  const cell = 9, gap = 3;
  const minX = Math.min(...rooms.map(r => r.gx)), maxX = Math.max(...rooms.map(r => r.gx));
  const minY = Math.min(...rooms.map(r => r.gy)), maxY = Math.max(...rooms.map(r => r.gy));
  const w = (maxX - minX + 1) * (cell + gap) + 10;
  const h = (maxY - minY + 1) * (cell + gap) + 10;
  const safe=visibleCanvasRect(6);
  const ox = safe.x + safe.w - w, oy = 50;

  drawPanel(ctx, ox, oy, w, h, 'rgba(4,6,12,0.72)', '#2f3644');

  for (const r of rooms) {
    const x = ox + 5 + (r.gx - minX) * (cell + gap);
    const y = oy + 5 + (r.gy - minY) * (cell + gap);
    const cur = `${r.gx},${r.gy}` === engine.currentKey;
    // conexiones
    ctx.fillStyle = 'rgba(180,190,210,0.4)';
    for (const d of r.doors) {
      const v = DIR_VECTORS[d];
      if(!visible.has(`${r.gx+v.x},${r.gy+v.y}`)) continue;
      ctx.fillRect(x + cell / 2 + v.x * 4, y + cell / 2 + v.y * 4, 2, 2);
    }
    ctx.fillStyle=r.visited&&r.cleared?'#182b33':'#223e48';ctx.fillRect(x,y,cell,cell);
    drawRoomSymbol(ctx,r,x+cell/2,y+cell/2,7,!!engine.contents.get(`${r.gx},${r.gy}`)?.stairs);
    if (cur) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x - 1.5, y - 1.5, cell + 3, cell + 3);
    }
  }
  text(ctx,`${actionPrompt(engine,'map')} · MAPA`,ox+w/2,oy+h+9,6.5,'#96b9bd','center',true);
}

// ---------------------------------------------------------------------------
// PANTALLAS (sólo UI)
// ---------------------------------------------------------------------------
export const MENU_ITEMS = [
  { label: T.menuStart }, { label: 'ATRACO SIN FIN' }, { label: 'DESAFÍO DIARIO' }, { label: T.menuUpgrades },
  { label: T.menuWardrobe }, { label: 'COLECCIÓN' }, { label: T.menuHowTo }, { label: T.menuSettings },
];

const MENU_META = [
  {eyebrow:'ATRACO PRINCIPAL',title:'EL BANCO DEL PAN',desc:'Entra, arma tu build y roba los seis pisos antes de que la seguridad te cierre el paso.',tag:'6 PISOS · ROGUELITE',accent:'#e6c56f'},
  {eyebrow:'MODO SUPERVIVENCIA',title:'ATRACO SIN FIN',desc:'La misma arena. Rondas cada vez más duras, jefes periódicos y presión que no deja de subir.',tag:'RÉCORD · PRESIÓN · JEFES',accent:'#d86b58'},
  {eyebrow:'EXPEDIENTE DEL DÍA',title:'DESAFÍO DIARIO',desc:'Una seed compartida por día, tres modificadores y reglas estandarizadas sin mejoras permanentes.',tag:'SEED FIJA · SCORE · MEDALLAS',accent:'#c98cff'},
  {eyebrow:'PROGRESIÓN PERMANENTE',title:'MEJORAS',desc:'Invierte monedas doradas en ventajas persistentes para futuras incursiones.',tag:'META · PERMANENTE',accent:'#78c99a'},
  {eyebrow:'IDENTIDAD DEL PATO',title:'ARMARIO',desc:'Compra y equipa aspectos desbloqueables sin alterar las reglas del atraco.',tag:'COSMÉTICOS · ASPECTOS',accent:'#79b9d2'},
  {eyebrow:'ARCHIVO DEL BANCO',title:'COLECCIÓN',desc:'Consulta armas, objetos, enemigos, jefes, aspectos y sinergias descubiertos durante tus runs.',tag:'DESCUBRIMIENTOS · FICHAS',accent:'#9abf9f'},
  {eyebrow:'MANUAL DEL LADRÓN',title:'CÓMO JUGAR',desc:'Controles esenciales y reglas de supervivencia en una sola vista.',tag:'CONTROLES · OBJETIVO',accent:'#d7b56c'},
  {eyebrow:'SISTEMA',title:'AJUSTES',desc:'Audio, imagen, vibración, accesibilidad visual y comportamiento de pantalla.',tag:'AUDIO · VIDEO · ACCESO',accent:'#8fb7c8'},
] as const;

function drawDifficultySkull(ctx:CanvasRenderingContext2D,x:number,y:number,color:string) {
  ctx.save();ctx.fillStyle=color;ctx.fillRect(x+1,y,6,1);ctx.fillRect(x,y+1,8,4);ctx.fillRect(x+2,y+5,4,2);
  ctx.fillStyle='#10151c';ctx.fillRect(x+1,y+2,2,2);ctx.fillRect(x+5,y+2,2,2);ctx.fillRect(x+3,y+4,2,1);ctx.fillRect(x+3,y+6,1,1);ctx.fillRect(x+5,y+6,1,1);ctx.restore();
}

function drawDifficultyLock(ctx:CanvasRenderingContext2D,x:number,y:number,color:string) {
  ctx.save();ctx.fillStyle=color;ctx.fillRect(x+1,y+4,9,7);ctx.fillRect(x+3,y+1,5,1);ctx.fillRect(x+2,y+2,2,3);ctx.fillRect(x+7,y+2,2,3);
  ctx.fillStyle='#11151c';ctx.fillRect(x+5,y+6,1,3);ctx.restore();
}

function renderDifficultyUI(engine:GameEngine) {
  const ctx=engine.ui!,accent=engine.pendingMode==='endless'?'#d86b58':'#e6c56f';
  drawMenuBackdrop(ctx,menuFrame(engine),.9,accent);
  drawMenuHeader(
    ctx,
    engine.pendingMode==='endless'?'DIFICULTAD · SIN FIN':'NIVEL DE SEGURIDAD',
    'Elige una opción y después inicia la partida.',
    engine.frame,accent,'PLANIFICACIÓN DEL ATRACO',
  );
  DIFFICULTY_MODES.forEach((mode,i)=>{
    const def=DIFFICULTIES[mode],box=difficultyRect(i),selected=engine.difficultyIndex===i,hover=inside(engine.mouseX,engine.mouseY,box),locked=mode==='mad'&&!engine.madUnlocked;
    const color=locked?'#8f6671':mode==='easy'?'#78c99a':mode==='normal'?'#e6c56f':mode==='hard'?'#e89a58':'#e55f59';
    drawMenuCard(ctx,box.x,box.y,box.w,box.h,selected||hover,color,selected?'rgba(31,31,25,.97)':hover?'rgba(23,31,31,.97)':'rgba(10,22,28,.94)');
    if(locked) drawDifficultyLock(ctx,box.x+14,box.y+13,color);
    titleText(ctx,def.label,box.x+(locked?32:14),box.y+24,9,color,'left',false);
    for(let n=0;n<i+1;n++) drawDifficultySkull(ctx,box.x+14+n*12,box.y+34,color);
    wrappedText(ctx,locked?'Completa un atraco para desbloquear este nivel.':def.desc,box.x+14,box.y+53,box.w-28,5.1,6.2,2,locked?'#8a6870':'#9cafaf');
    text(ctx,locked?'BLOQUEADO':selected?'ELEGIDO':hover?'CLIC PARA ELEGIR':'DISPONIBLE',box.x+box.w-12,box.y+20,4.7,locked?'#a76f79':selected||hover?color:'#60747b','right',true,false);
  });
  drawMouseButton(ctx,'← VOLVER',BACK_BUTTON.x,BACK_BUTTON.y,BACK_BUTTON.w,BACK_BUTTON.h,inside(engine.mouseX,engine.mouseY,BACK_BUTTON),accent);
  const locked=engine.difficulty==='mad'&&!engine.madUnlocked;
  drawMouseButton(ctx,engine.pendingMode==='endless'?'INICIAR SIN FIN':'INICIAR ATRACO',DIFFICULTY_START.x,DIFFICULTY_START.y,DIFFICULTY_START.w,DIFFICULTY_START.h,inside(engine.mouseX,engine.mouseY,DIFFICULTY_START),accent,false,locked);
}

function renderMenuUI(engine: GameEngine,wide=false) {
  const ctx=engine.ui!,meta=MENU_META[engine.menuIndex]??MENU_META[0],mf=menuFrame(engine);
  const safe=visibleCanvasRect(wide?10:0);
  const viewW=wide?safe.w:UI_BASE_WIDTH;
  const viewX=wide?safe.x:0;

  ctx.save();
  ctx.fillStyle='rgba(3,8,12,.24)';
  ctx.fillRect(viewX,0,viewW,CANVAS_HEIGHT);
  if(wide){
    const ambient=ctx.createRadialGradient(viewX+viewW*.72,88,16,viewX+viewW*.72,88,300);
    ambient.addColorStop(0,meta.accent+'20');
    ambient.addColorStop(.55,'rgba(0,0,0,0)');
    ambient.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=ambient;ctx.fillRect(viewX,0,viewW,CANVAS_HEIGHT);
    ctx.globalAlpha=.06;ctx.fillStyle=meta.accent;
    for(let x=viewX+18;x<viewX+viewW;x+=48)ctx.fillRect(x,26,1,CANVAS_HEIGHT-52);
    ctx.globalAlpha=1;
  }
  ctx.restore();

  // El logo conserva la versión que funcionaba mejor visualmente, pero queda
  // centrado dentro de la zona realmente visible en fullscreen.
  ctx.save();
  if(wide){
    const visibleCenter=safe.x+safe.w/2;
    ctx.translate(visibleCenter-UI_BASE_WIDTH/2,0);
  }
  drawTitleLogo(ctx,UI_BASE_WIDTH/2,58,mf);
  ctx.restore();

  const first=mainMenuRect(0,wide);
  text(ctx,'ELIGE UNA OPERACIÓN',first.x,70,wide?5.0:4.7,'#8aa09d','left',true,false);

  MENU_ITEMS.forEach((item,i)=>{
    const on=i===engine.menuIndex,box=mainMenuRect(i,wide),hover=inside(engine.mouseX,engine.mouseY,box),hasCheckpoint=i===1&&engine.endlessCheckpointRound>0;
    const label=hasCheckpoint?'CONTINUAR SIN FIN':item.label;
    const desc=hasCheckpoint?'R'+engine.endlessCheckpointRound+' GUARDADA':['Campaña','Supervivencia','Reto de hoy','Progresión','Aspectos','Archivo','Guía','Sistema'][i]??'';
    drawMenuCard(ctx,box.x,box.y,box.w,box.h,on||hover,meta.accent,on?'rgba(31,35,28,.94)':hover?'rgba(18,31,33,.95)':'rgba(9,22,28,.88)');
    text(ctx,label,box.x+11,box.y+(wide?11:10),wide?6.55:6.35,on?'#fff0bd':hover?'#dde7df':'#c5d2ce','left',true,false);
    text(ctx,desc,box.x+11,box.y+(wide?21:19),wide?4.15:4.05,on?'#bcae75':'#647a7d','left',false,false);
    if(on)text(ctx,'›',box.x+box.w-11,box.y+box.h/2+3,wide?9:8.5,meta.accent,'center',true,false);
    if(hasCheckpoint){
      ctx.fillStyle='#d86b58';ctx.fillRect(box.x+box.w-34,box.y+3,26,6);
      text(ctx,'GUARD.',box.x+box.w-21,box.y+8,3.4,'#fff2d5','center',true,false);
    }
  });

  const px=wide?first.x+first.w+16:183;
  const py=wide?74:76;
  const safeRight=wide?safe.x+safe.w:UI_BASE_WIDTH;
  const pw=wide?Math.max(286,safeRight-px):271;
  const ph=wide?244:232;
  drawMenuCard(ctx,px,py,pw,ph,true,meta.accent,'rgba(7,18,24,.95)');
  drawSectionLabel(ctx,meta.eyebrow,px+16,py+20,meta.accent);
  titleText(ctx,meta.title,px+16,py+47,wide?14:13,'#efe3bc','left',false);
  wrappedText(ctx,meta.desc,px+16,py+69,pw-32,wide?7.1:7,wide?10:10,4,'#9db0ad');
  ctx.fillStyle='rgba(255,255,255,.035)';ctx.fillRect(px+16,py+120,pw-32,1);
  text(ctx,meta.tag,px+16,py+138,wide?5.45:5.3,meta.accent,'left',true,false);

  const valueX=px+(wide?116:104);
  if(engine.menuIndex===0){
    text(ctx,'MEJOR PISO',px+16,py+166,wide?5.4:5.2,'#71878b','left',false,false);
    text(ctx,String(engine.bestFloor)+'/6',valueX,py+166,wide?7.8:7.5,'#e7d79e','left',true,false);
    text(ctx,'DIFICULTAD',px+16,py+184,wide?5.4:5.2,'#71878b','left',false,false);
    text(ctx,DIFFICULTIES[engine.difficulty].label,valueX,py+184,wide?7.45:7.2,meta.accent,'left',true,false);
  } else if(engine.menuIndex===1){
    const rec=engine.endlessRecords[engine.difficulty];
    text(ctx,'RÉCORD',px+16,py+166,wide?5.4:5.2,'#71878b','left',false,false);
    text(ctx,'RONDA '+rec.round,valueX,py+166,wide?7.8:7.5,'#e7d79e','left',true,false);
    text(ctx,'CHECKPOINT',px+16,py+184,wide?5.4:5.2,'#71878b','left',false,false);
    text(ctx,engine.endlessCheckpointRound>0?'RONDA '+engine.endlessCheckpointRound:'SIN GUARDADO',valueX,py+184,wide?7.45:7.2,engine.endlessCheckpointRound>0?'#d86b58':'#6f8185','left',true,false);
  } else if(engine.menuIndex===2){
    const rec=engine.dailyProfile.current;
    text(ctx,'MEJOR HOY',px+16,py+166,wide?5.4:5.2,'#71878b','left',false,false);
    text(ctx,String(rec.bestScore),valueX,py+166,wide?7.8:7.5,'#efe3bc','left',true,false);
    text(ctx,'MEDALLA',px+16,py+184,wide?5.4:5.2,'#71878b','left',false,false);
    text(ctx,rec.bestMedal,valueX,py+184,wide?7.45:7.2,dailyMedalColor(rec.bestMedal),'left',true,false);
  } else if(engine.menuIndex===3||engine.menuIndex===4){
    text(ctx,'MONEDAS',px+16,py+166,wide?5.4:5.2,'#71878b','left',false,false);
    drawItemIcon(ctx,valueX-3,py+154,'golden_crumb',14);
    text(ctx,String(engine.totalGoldenCrumbs),valueX+18,py+166,wide?8.1:8,meta.accent,'left',true,false);
  } else if(engine.menuIndex===5){
    const found=Object.values(engine.discovered).reduce((a,list)=>a+list.length,0);
    text(ctx,'REGISTROS ABIERTOS',px+16,py+166,wide?5.4:5.2,'#71878b','left',false,false);
    text(ctx,String(found),px+(wide?168:154),py+166,wide?8.1:8,meta.accent,'left',true,false);
  } else {
    text(ctx,'ESTADO',px+16,py+166,wide?5.4:5.2,'#71878b','left',false,false);
    text(ctx,'LISTO',valueX,py+166,wide?7.45:7.2,meta.accent,'left',true,false);
  }

  ctx.fillStyle='rgba(255,255,255,.035)';ctx.fillRect(px+16,py+208,pw-32,1);
  text(ctx,'SELECCIONA UNA OPCIÓN PARA CONTINUAR',px+16,py+220,wide?4.65:4.4,'#6f8587','left',true,false);
  if(wide)text(ctx,'PERFIL · '+DIFFICULTIES[engine.difficulty].label,px+pw-16,py+220,4.55,'#6f8587','right',true,false);

  const center=wide?safe.x+safe.w/2:UI_BASE_WIDTH/2;
  const taglineY=wide?Math.min(336,safe.y+safe.h-18):329;
  text(ctx,T.tagline,center,taglineY,wide?7.65:7.5,'#dbc486','center',true,false);
}
function renderHowToPlayUI(engine: GameEngine) {
  const ctx=engine.ui!;
  drawMenuBackdrop(ctx,menuFrame(engine),.92,'#d7b56c');
  drawMenuHeader(ctx,'MANUAL DEL LADRÓN','Controles del atraco y reglas que sí importan.',menuFrame(engine),'#d7b56c','PROTOCOLO DE CAMPO');

  const rows:[string,string][]=[
    [keyLabel(engine.bindings.moveUp)+' '+keyLabel(engine.bindings.moveLeft)+' '+keyLabel(engine.bindings.moveDown)+' '+keyLabel(engine.bindings.moveRight),'Moverse'],
    ['CLIC IZQ. / '+keyLabel(engine.bindings.shootUp)+' '+keyLabel(engine.bindings.shootLeft)+' '+keyLabel(engine.bindings.shootDown)+' '+keyLabel(engine.bindings.shootRight),'Disparar'],
    ['CLIC DER. / '+keyLabel(engine.bindings.dash),'Esquivar'],[keyLabel(engine.bindings.interact),'Interactuar'],
    [keyLabel(engine.bindings.active),'Objeto activo'],['RUEDA / '+keyLabel(engine.bindings.weapon1)+' / '+keyLabel(engine.bindings.weapon2),'Cambiar arma'],
    [keyLabel(engine.bindings.map),'Mapa'],[keyLabel(engine.bindings.pause),'Pausa'],
  ];
  drawMenuCard(ctx,28,72,226,238,false,'#d7b56c','rgba(8,20,26,.95)');
  drawSectionLabel(ctx,'CONTROLES DE JUEGO',44,92,'#d7b56c');
  rows.forEach(([k,v],i)=>{const y=107+i*22;drawKeyChip(ctx,k,43,y,92,true);text(ctx,v,143,y+10,6.3,'#c8d5cf','left',i<4,false);});

  drawMenuCard(ctx,266,72,186,238,false,'#78c99a','rgba(8,20,26,.95)');
  drawSectionLabel(ctx,'PLAN DEL ATRACO',282,92,'#78c99a');
  const tips=[
    ['LIMPIA LA SALA','Derrota enemigos para abrir puertas.'],
    ['ARMA LA BUILD','Combina dos armas, objetos y sinergias.'],
    ['CUIDA LA VIDA','El pan cura. No todas las peleas lo sueltan.'],
    ['ROBA Y BAJA','Jefe, botín y siguiente piso.'],
    ['LEE EL MAPA','Pausa el combate; no teletransporta.'],
  ];
  tips.forEach(([t,d],i)=>{const y=108+i*37;text(ctx,'•',282,y+9,7,'#78c99a','left',true,false);text(ctx,t,296,y+9,6.3,'#e2e8dd','left',true,false);wrappedText(ctx,d,296,y+20,142,5.4,6.5,2,'#82989a');});
  drawMouseButton(ctx,'← VOLVER',BACK_BUTTON.x,BACK_BUTTON.y,BACK_BUTTON.w,BACK_BUTTON.h,inside(engine.mouseX,engine.mouseY,BACK_BUTTON),'#d7b56c');
}

function renderSettingsUI(engine: GameEngine) {
  const ctx=engine.ui!,mf=menuFrame(engine);
  drawMenuBackdrop(ctx,mf,.93,'#8fb7c8');
  drawMenuHeader(ctx,'AJUSTES','Controles grandes y directos. Los cambios se guardan al instante.',mf,'#8fb7c8','SISTEMA DEL ATRACO');

  SETTING_ROWS.forEach((row,i)=>{
    const box=settingsRect(i),on=i===engine.settingsIndex;
    const groupColor=row.group==='AUDIO'?'#d4b96e':row.group==='FEEDBACK'?'#d98069':row.group==='ACCESIBILIDAD'?'#b992d8':row.group==='VIDEO'?'#8fb7c8':row.group==='CONTROLES'?'#79b9d2':'#78c99a';
    drawMenuCard(ctx,box.x,box.y,box.w,box.h,on,groupColor,on?'rgba(25,40,47,.98)':'rgba(10,24,30,.9)');
    text(ctx,row.label,box.x+10,box.y+16,5.1,on?'#eef6f2':'#a9b7b6','left',on,false);
    const v=settingValue(engine,i);
    if(row.kind==='vol'||row.kind==='shake'||row.kind==='scale'||row.kind==='brightness'){
      const minus=settingsMinusRect(i),plus=settingsPlusRect(i);
      drawMouseButton(ctx,'−',minus.x,minus.y,minus.w,minus.h,inside(engine.mouseX,engine.mouseY,minus),groupColor);
      drawMouseButton(ctx,'+',plus.x,plus.y,plus.w,plus.h,inside(engine.mouseX,engine.mouseY,plus),groupColor);
      const label=row.kind==='vol'?Math.round(v*100)+'%':String(v);
      text(ctx,label,box.x+box.w-39,box.y+17,5.4,on?'#dbeef1':'#8da0a3','center',true,false);
    }else{
      const action=settingsActionRect(i);
      const label=row.key==='controls'?'ABRIR':row.key==='accessPreset'?'APLICAR':v>.5?'ACTIVO':'APAGADO';
      drawMouseButton(ctx,label,action.x,action.y,action.w,action.h,inside(engine.mouseX,engine.mouseY,action),groupColor,false,false);
    }
  });

  const selected=SETTING_ROWS[engine.settingsIndex]??SETTING_ROWS[0];
  drawMenuCard(ctx,126,292,326,23,false,'#526b72','rgba(7,18,24,.96)');
  wrappedText(ctx,selected.group+' · '+selected.description,138,303,300,4.35,5.2,2,'#9fb1b0');
  drawMouseButton(ctx,'← VOLVER',BACK_BUTTON.x,BACK_BUTTON.y,BACK_BUTTON.w,BACK_BUTTON.h,inside(engine.mouseX,engine.mouseY,BACK_BUTTON),'#8fb7c8');
}

function renderWardrobeUI(engine: GameEngine) {
  const ctx = engine.ui!;
  drawMenuBackdrop(ctx,menuFrame(engine),.93,'#79b9d2');
  drawMenuHeader(ctx,'ARMARIO','Aspectos del ladrón. Cero ventajas ocultas.',menuFrame(engine),'#79b9d2','IDENTIDAD DEL PATO');
  text(ctx,'ASPECTOS '+engine.unlockedSkins.length+' / '+SKINS.length,446,64,5.6,'#8aa2a4','right',true,false);
  drawItemIcon(ctx,334,51,'golden_crumb',13);
  text(ctx,String(engine.totalGoldenCrumbs)+' MONEDAS',354,63,5.8,'#ddc77f','left',true,false);

  // --- PANEL IZQUIERDO (PREVIEW GRANDE FIJO) ---
  const sel = engine.wardrobeIndex;
  const skin = SKINS[sel] ?? SKINS[0];
  const pvx = 26, pvy = 62, pw = 164, ph = 240;

  drawMenuCard(ctx,pvx,pvy,pw,ph,true,'#79b9d2','rgba(8,20,27,.96)');
  drawSectionLabel(ctx,'VISTA PREVIA',pvx+12,pvy+18,'#79b9d2');

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
    text(ctx,'EQUIPAR ASPECTO',bx,by+4,8,'#f4d03f','center',true);
    ctx.restore();
  } else {
    ctx.fillStyle = affordable ? 'rgba(244,208,63,0.12)' : 'rgba(255,255,255,0.03)';
    ctx.fillRect(bx - 56, by - 14, 112, 24);
    ctx.fillStyle = affordable ? '#f4d03f' : '#4a5262';
    ctx.fillRect(bx - 56, by - 14, 112, 1);
    ctx.fillRect(bx - 56, by + 9, 112, 1);
    text(ctx,`COMPRAR ASPECTO · ${skin.cost}`,bx,by+4,6.8,affordable?'#f4d03f':'#ff5b4f','center',true);
  }

  // --- PANEL DERECHO: CUADRÍCULA SCROLLABLE (3 COLUMNAS X MÚLTIPLES FILAS) ---
  const cols=WARDROBE.cols,cellW=WARDROBE.cellW,cellH=WARDROBE.cellH,gridX=WARDROBE.x,gridY=WARDROBE.y;
  const totalRows=Math.ceil(SKINS.length/cols);
  const maxScroll=Math.max(0,totalRows*(cellH+WARDROBE.gap)-WARDROBE.gap-WARDROBE.h);
  const scroll=engine.wardrobeScroll;

  // Marco de la cuadrícula
  drawMenuCard(ctx,gridX-5,gridY-4,WARDROBE.w+4,WARDROBE.h+8,false,'#486671','rgba(7,18,24,.94)');

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

    drawMenuCard(ctx,cx,cy,cellW,cellH,on,on?'#79b9d2':'#405960',on?'rgba(18,37,45,.98)':'rgba(10,24,30,.9)');

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

  drawMouseButton(ctx,'← VOLVER',BACK_BUTTON.x,BACK_BUTTON.y,BACK_BUTTON.w,BACK_BUTTON.h,inside(engine.mouseX,engine.mouseY,BACK_BUTTON),'#79b9d2');
  text(ctx,equipped?'ASPECTO EQUIPADO':unlocked?'LISTO PARA EQUIPAR':affordable?'COMPRA DISPONIBLE':'FALTAN MONEDAS',452,332,4.8,equipped?'#78c99a':'#8ba0a2','right',true,false);
}

function renderUpgradesUI(engine: GameEngine) {
  const ctx=engine.ui!;
  drawMenuBackdrop(ctx,menuFrame(engine),.93,'#78c99a');
  drawMenuHeader(ctx,'MEJORAS PERMANENTES','Selecciona una mejora y compra desde su botón.',menuFrame(engine),'#78c99a','TALLER CLANDESTINO');
  drawItemIcon(ctx,352,29,'golden_crumb',14);text(ctx,String(engine.totalGoldenCrumbs)+' MONEDAS',372,41,6.2,'#e4cf88','left',true,false);

  META_UPGRADES.forEach((up,i)=>{
    const box=upgradeRect(i),lvl=engine.metaLevels[up.id]??0,maxed=lvl>=up.maxLevel,cost=up.cost*(lvl+1),sel=i===engine.upgradeIndex;
    const affordable=engine.totalGoldenCrumbs>=cost,accent=maxed?'#78c99a':sel?'#e6c56f':'#5d7277';
    drawMenuCard(ctx,box.x,box.y,box.w,box.h,sel,accent,sel?'rgba(32,36,28,.97)':'rgba(9,22,28,.94)');
    titleText(ctx,up.name,box.x+14,box.y+20,8.5,maxed?'#8ed3a6':sel?'#f3dfaa':'#d0dad4','left',false);
    wrappedText(ctx,up.description,box.x+14,box.y+35,230,5.2,6.2,2,'#81969a');
    for(let l=0;l<up.maxLevel;l++){ctx.fillStyle=l<lvl?'#78c99a':'#263b42';ctx.fillRect(box.x+248+l*13,box.y+12,9,6);}
    const action=upgradeActionRect(i);
    drawMouseButton(ctx,maxed?'AL MÁXIMO':'MEJORAR · '+cost,action.x,action.y,action.w,action.h,inside(engine.mouseX,engine.mouseY,action),maxed?'#78c99a':'#e6c56f',false,maxed||!affordable);
  });
  drawMouseButton(ctx,'← VOLVER',BACK_BUTTON.x,BACK_BUTTON.y,BACK_BUTTON.w,BACK_BUTTON.h,inside(engine.mouseX,engine.mouseY,BACK_BUTTON),'#78c99a');
  text(ctx,'Las mejoras se aplican a Atraco y Sin Fin. El Desafío Diario usa reglas estandarizadas.',136,332,4.4,'#72888a','left',false,false);
}

function renderFloorIntroUI(engine: GameEngine) {
  const ctx=engine.ui!,t=engine.floorIntroTimer,f=engine.frame;
  const idx=engine.map.floorIndex;
  const theme=FLOOR_THEMES[idx]??FLOOR_THEMES[0];
  const accent=theme.trim,glowColor=theme.glow;
  const a=t>80?(110-t)/30:Math.min(1,t/30);
  const alpha=clamp(a,0,1);
  const cx=CANVAS_WIDTH/2;
  const slide=(1-alpha)*24;

  ctx.save();
  ctx.fillStyle='rgba(3,6,12,'+(.93*alpha)+')';ctx.fillRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT);
  const glow=ctx.createRadialGradient(cx,154,12,cx,154,260);
  glow.addColorStop(0,glowColor+'28');glow.addColorStop(.5,glowColor+'0D');glow.addColorStop(1,'rgba(0,0,0,0)');
  ctx.globalAlpha=alpha;ctx.fillStyle=glow;ctx.fillRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT);
  for(let y=0;y<CANVAS_HEIGHT;y+=8){ctx.fillStyle='rgba(255,255,255,.015)';ctx.fillRect(0,y,CANVAS_WIDTH,1);}

  const panelW=Math.min(560,CANVAS_WIDTH-56),panelX=cx-panelW/2;
  ctx.fillStyle='rgba(5,12,18,.92)';ctx.fillRect(panelX,83+slide,panelW,171);
  ctx.strokeStyle=accent;ctx.globalAlpha=.52;ctx.strokeRect(panelX+.5,83.5+slide,panelW-1,170);ctx.globalAlpha=alpha;
  ctx.fillStyle=accent;ctx.fillRect(panelX,83+slide,5,171);
  ctx.fillRect(panelX,83+slide,panelW,2);

  text(ctx,'DESCENSO AL BANCO · SECTOR '+String(idx+1).padStart(2,'0'),panelX+18,106+slide,5.3,accent,'left',true,false);
  text(ctx,'SEGURIDAD '+(idx===0?'BÁSICA':idx<3?'REFORZADA':idx<5?'ALTA':'MÁXIMA'),panelX+panelW-18,106+slide,5.1,'#8d9fa2','right',true,false);

  drawItemIcon(ctx,panelX+24,125+slide,['crumb','stolen_helmet','baguette','toaster','golden_crumb','pan_dorado'][idx],32);
  titleText(ctx,T.floor+' '+(idx+1)+'/6',panelX+68,147+slide,18,accent,'left',false);
  titleText(ctx,FLOOR_NAMES_ES[idx],panelX+68,176+slide,idx===5?18:20,'#efe5c8','left',true);

  ctx.fillStyle='rgba(255,255,255,.05)';ctx.fillRect(panelX+18,194+slide,panelW-36,1);
  text(ctx,idx===0?'LA OPERACIÓN COMIENZA AQUÍ':idx===5?'ÚLTIMA CÁMARA · NO HAY MARCHA ATRÁS':'LA SEGURIDAD AUMENTA · ADAPTA TU BUILD',panelX+18,215+slide,6.1,'#9cafaf','left',true,false);

  const progressW=Math.min(250,panelW-60),progressX=panelX+panelW-progressW-20,py=231+slide;
  ctx.fillStyle='rgba(255,255,255,.08)';ctx.fillRect(progressX,py,progressW,4);
  const segment=progressW/6;
  for(let i=0;i<6;i++){
    ctx.fillStyle=i<idx?theme.wall[0]:i===idx?accent:'rgba(255,255,255,.10)';
    ctx.fillRect(progressX+i*segment+1,py+1,segment-2,2);
    text(ctx,String(i+1),progressX+i*segment+segment/2,py+15,4.2,i===idx?accent:'#64777c','center',i===idx,false);
  }

  ctx.globalAlpha=.22+.16*Math.sin(f*.14);ctx.strokeStyle=glowColor;ctx.lineWidth=1;
  ctx.beginPath();ctx.arc(panelX+40,141+slide,28,0,Math.PI*2);ctx.stroke();
  ctx.restore();
}
function renderBossIntroUI(engine: GameEngine) {
  const ctx=engine.ui!,t=engine.bossIntroTimer,f=engine.frame;
  const bosses=getContentOf(engine).enemies.filter((e:Enemy)=>e.isBoss);
  const introBoss=bosses[0];
  const def=introBoss?(BOSSES[introBoss.bossType]??SUBBOSSES[introBoss.bossType]??MINIBOSSES[introBoss.bossType]):undefined;
  const doubleThreat=bosses.length>1;
  const floorBoss=!!(introBoss&&BOSSES[introBoss.bossType]);
  const subBoss=!!(introBoss&&SUBBOSSES[introBoss.bossType]);
  const finalBoss=!!def?.finalBoss;
  const tierLabel=doubleThreat?'DOBLE AMENAZA':finalBoss?'JEFE FINAL':floorBoss?'JEFE DE PISO':subBoss?'SUBJEFE':'MINIJEFE';
  const familyLabels:Record<string,string>={
    command:'MANDO',finance:'FINANZAS',bakery:'HORNO',tech:'SEGURIDAD TECNOLÓGICA',
    riot:'ANTIDISTURBIOS',war:'MILITAR',wealth:'CAPITAL',vault:'BÓVEDA',
  };
  const attackLabels:Record<string,string>={
    fan:'ABANICO',ring:'ANILLO',spiral:'ESPIRAL',crossfire:'FUEGO CRUZADO',
    cage:'CERCO',mines:'MINAS',lanes:'CORREDORES',rush:'EMBESTIDA',
    summon:'REFUERZOS',sniper:'TIRO DE PRECISIÓN',nova:'NOVA',warp:'TELETRANSPORTE',
  };
  const accent=doubleThreat?'#ff6158':(def?.accent??'#f4d03f');
  const secondary=doubleThreat?'#f4d03f':(def?.secondary??'#e8c99b');
  const family=doubleThreat?'MULTI-OBJETIVO':(def?.family?familyLabels[def.family]:'SEGURIDAD');
  const phaseCount=def?.phases??(floorBoss?3:subBoss?2:1);
  const attackNames=(def?.pattern.sequence??[]).slice(0,3).map(a=>attackLabels[a]??a.toUpperCase());
  const location=engine.gameMode==='endless'?('RONDA '+engine.endless.round):('PISO '+(engine.map.floorIndex+1)+'/6');
  const pulse=.5+.5*Math.sin(f*.12);
  const introAlpha=clamp((170-Math.min(170,t))/18,0,1);

  // Layout fluido: en widescreen el dossier crece de verdad, no queda pegado
  // a los primeros 480 px del canvas.
  const safe=visibleCanvasRect(10);
  const totalW=Math.min(safe.w,620);
  const x0=safe.x+(safe.w-totalW)/2;
  const gap=Math.max(12,Math.min(18,totalW*.025));
  const leftW=Math.round(totalW*.60);
  const rightW=totalW-leftW-gap;
  const leftX=x0,rightX=leftX+leftW+gap;
  const top=50,panelH=244;
  const portraitCx=rightX+rightW/2,portraitCy=171;

  ctx.save();
  ctx.fillStyle='rgba(3,5,12,.965)';ctx.fillRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT);
  const glow=ctx.createRadialGradient(portraitCx,160,10,portraitCx,160,Math.max(220,rightW*1.5));
  glow.addColorStop(0,accent+'32');glow.addColorStop(.46,accent+'12');glow.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=glow;ctx.fillRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT);
  for(let y=0;y<CANVAS_HEIGHT;y+=7){ctx.fillStyle='rgba(255,255,255,.018)';ctx.fillRect(0,y,CANVAS_WIDTH,1);}
  ctx.globalAlpha=.10;ctx.strokeStyle=accent;ctx.lineWidth=1;
  for(let x=-80;x<CANVAS_WIDTH+80;x+=28){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+88,44);ctx.stroke();}
  ctx.globalAlpha=1;

  // Banda superior de alarma.
  ctx.fillStyle='rgba(5,10,17,.96)';ctx.fillRect(0,0,CANVAS_WIDTH,34);
  ctx.fillStyle=accent;ctx.fillRect(0,31,CANVAS_WIDTH,3);
  ctx.globalAlpha=.16+.1*pulse;ctx.fillStyle=accent;ctx.fillRect(0,0,CANVAS_WIDTH,31);ctx.globalAlpha=1;
  text(ctx,'PROTOCOLO DE SEGURIDAD // AMENAZA DETECTADA',x0,20,5.7,'#d9e0df','left',true,false);
  text(ctx,tierLabel,x0+totalW,20,7,accent,'right',true,false);

  // Dossier informativo.
  drawPanel(ctx,leftX,top,leftW,panelH,'rgba(7,14,21,.965)',accent,'rgba(255,255,255,.035)');
  ctx.fillStyle=accent;ctx.fillRect(leftX,top,5,panelH);
  ctx.globalAlpha=.2;ctx.fillStyle=secondary;ctx.fillRect(leftX+5,top+27,leftW-5,1);ctx.globalAlpha=1;

  const name=engine.bossIntroName||def?.name||'AMENAZA DESCONOCIDA';
  const nameSize=name.length>28?12.5:name.length>22?15:name.length>15?18:21;
  text(ctx,tierLabel,leftX+16,top+19,5.3,accent,'left',true,false);
  titleText(ctx,name,leftX+16,top+53,nameSize,secondary,'left',true);
  wrappedText(ctx,engine.bossIntroSubtitle||def?.subtitle||'',leftX+16,top+69,leftW-32,6.2,9,3,'#b7c3c4',false);

  const infoY=top+104,infoX=leftX+14,infoW=leftW-28,colW=infoW/3;
  ctx.fillStyle='rgba(255,255,255,.045)';ctx.fillRect(infoX,infoY,infoW,39);
  text(ctx,'CLASE',infoX+10,infoY+13,4.2,'#60777d','left',false,false);
  wrappedText(ctx,family,infoX+10,infoY+28,colW-14,5.6,6.3,2,'#e0e6e3',true);
  text(ctx,'FASES',infoX+colW+8,infoY+13,4.2,'#60777d','left',false,false);
  text(ctx,String(phaseCount),infoX+colW+8,infoY+29,7.2,secondary,'left',true,false);
  text(ctx,engine.gameMode==='endless'?'ARENA':'UBICACIÓN',infoX+colW*2+6,infoY+13,4.2,'#60777d','left',false,false);
  wrappedText(ctx,location,infoX+colW*2+6,infoY+28,colW-12,5.2,6.2,2,'#e0e6e3',true);

  text(ctx,'PATRÓN DE COMBATE',leftX+16,top+161,4.5,'#71898d','left',true,false);
  const shown=attackNames.length?attackNames:['ATAQUE ESPECIAL','PRESIÓN DE ÁREA','CAMBIO DE FASE'];
  shown.forEach((label,i)=>{
    const y=top+170+i*21;
    ctx.fillStyle='rgba(255,255,255,.035)';ctx.fillRect(leftX+16,y,leftW-32,17);
    ctx.fillStyle=i%2?secondary:accent;ctx.fillRect(leftX+16,y,3,17);
    text(ctx,String(i+1).padStart(2,'0'),leftX+27,y+12,4.4,i%2?secondary:accent,'left',true,false);
    text(ctx,label,leftX+51,y+12,5.4,'#d7dfdc','left',true,false);
  });

  // Panel visual del objetivo.
  drawPanel(ctx,rightX,top,rightW,panelH,'rgba(5,10,17,.93)',secondary,'rgba(255,255,255,.025)');
  ctx.save();ctx.beginPath();ctx.rect(rightX+1,top+1,rightW-2,panelH-2);ctx.clip();
  ctx.globalAlpha=.11;ctx.strokeStyle=accent;ctx.lineWidth=1;
  for(let x=rightX+8;x<rightX+rightW;x+=18){ctx.beginPath();ctx.moveTo(x,top+10);ctx.lineTo(x,top+panelH-8);ctx.stroke();}
  for(let y=top+12;y<top+panelH-4;y+=18){ctx.beginPath();ctx.moveTo(rightX+5,y);ctx.lineTo(rightX+rightW-5,y);ctx.stroke();}
  const ring1=Math.min(54,rightW*.28),ring2=Math.min(72,rightW*.38);
  ctx.globalAlpha=.28+.14*pulse;ctx.strokeStyle=secondary;ctx.lineWidth=2;
  ctx.beginPath();ctx.arc(portraitCx,portraitCy,ring1+pulse*4,0,Math.PI*2);ctx.stroke();
  ctx.globalAlpha=.18;ctx.beginPath();ctx.arc(portraitCx,portraitCy,ring2-pulse*3,0,Math.PI*2);ctx.stroke();
  for(let i=0;i<8;i++){
    const a=i*Math.PI/4+f*.006,r1=ring1+6,r2=ring2;
    ctx.globalAlpha=.24;ctx.beginPath();ctx.moveTo(portraitCx+Math.cos(a)*r1,portraitCy+Math.sin(a)*r1);ctx.lineTo(portraitCx+Math.cos(a)*r2,portraitCy+Math.sin(a)*r2);ctx.stroke();
  }
  ctx.globalAlpha=1;

  if(bosses.length>1){
    bosses.slice(0,2).forEach((boss,i)=>{
      const bossFloor=!!BOSSES[boss.bossType],bossSub=!!SUBBOSSES[boss.bossType];
      const scale=bossFloor?1.42:bossSub?1.25:1.12;
      const spread=Math.min(42,rightW*.22);
      ctx.save();ctx.translate(portraitCx+(i===0?-spread:spread),portraitCy);ctx.scale(scale,scale);
      drawBoss(ctx,-boss.size/2,-boss.size/2,boss.bossType,f,boss.hp,boss.maxHp,false,boss.bossPhase);
      ctx.restore();
    });
  }else if(introBoss){
    const portraitScale=finalBoss?2.12:floorBoss?1.9:subBoss?1.64:1.46;
    ctx.save();ctx.translate(portraitCx,portraitCy);ctx.scale(portraitScale,portraitScale);
    drawBoss(ctx,-introBoss.size/2,-introBoss.size/2,introBoss.bossType,f,introBoss.hp,introBoss.maxHp,false,introBoss.bossPhase);
    ctx.restore();
  }

  ctx.globalAlpha=.94;
  text(ctx,doubleThreat?'DOS HOSTILES PRIORITARIOS':'OBJETIVO PRIORITARIO',portraitCx,top+217,5.2,accent,'center',true,false);
  const threat=finalBoss?'MÁXIMO':floorBoss?'ALTO':subBoss?'ELEVADO':'MODERADO';
  text(ctx,'AMENAZA · '+threat,portraitCx,top+232,4.4,'#91a2a4','center',true,false);
  ctx.restore();

  // Pie de presentación alineado a todo el dossier.
  ctx.globalAlpha=introAlpha;
  ctx.fillStyle='rgba(3,7,12,.94)';ctx.fillRect(x0,307,totalW,27);
  ctx.fillStyle=accent;ctx.fillRect(x0,307,totalW,2);
  const blink=(f%36)<24;
  text(ctx,blink?'PREPÁRATE · EL COMBATE COMIENZA':'MANTÉN LA DISTANCIA · LEE EL PATRÓN',x0+12,325,5.2,blink?secondary:'#87999b','left',true,false);
  text(ctx,'ENTER / ESPACIO · SALTAR',x0+totalW-12,325,4.8,'#6f8286','right',true,false);
  ctx.globalAlpha=1;
  ctx.restore();
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
  text(ctx,engine.map.floorIndex+1>=TOTAL_FLOORS?'SALIDA DEL BANCO':`${T.floor} ${engine.map.floorIndex+2}/6${dots}`,CANVAS_WIDTH/2,206,12,'#f4d03f','center',true);
  ctx.globalAlpha = 1;
}

function renderPausedUI(engine: GameEngine) {
  const ctx=engine.ui!,mf=menuFrame(engine);
  drawMenuBackdrop(ctx,mf,.86,'#e6c56f');
  drawMenuHeader(ctx,'ATRACO EN PAUSA','Todo lo necesario está a un clic.',mf,'#e6c56f','ESTADO DE LA OPERACIÓN');
  const items=[
    T.resume,engine.gameMode==='endless'?'RENDIMIENTO':'MAPA',engine.gameMode==='endless'?'BUILD ACTUAL':'INFO DE RUN',T.restartRun,
    T.menuHowTo,T.menuSettings,T.backToMenu,
  ];
  items.forEach((label,i)=>{
    const box=pauseRect(i),on=i===engine.pauseIndex,dangerous=i===3||i===6,accent=dangerous?'#d85d58':'#e6c56f';
    drawMenuCard(ctx,box.x,box.y,box.w,box.h,on,accent,on?(dangerous?'rgba(48,25,27,.97)':'rgba(36,34,25,.97)'):'rgba(9,22,28,.94)');
    text(ctx,label,box.x+14,box.y+22,7,on?(dangerous?'#ffd5d1':'#fff0bc'):'#c7d3ce','left',true,false);
    text(ctx,dangerous?'REQUIERE CONFIRMACIÓN':'CLIC PARA ABRIR',box.x+box.w-12,box.y+22,4.1,on?accent:'#61757a','right',false,false);
  });
  drawMenuCard(ctx,44,251,388,55,false,'#52666d','rgba(7,17,23,.95)');
  drawSectionLabel(ctx,'RESUMEN RÁPIDO',58,266,'#8fa8a7');
  text(ctx,'DIFICULTAD',62,284,4.5,'#61777c','left',false,false);text(ctx,difficultyLabel(engine),62,298,6.3,'#e6c56f','left',true,false);
  text(ctx,engine.gameMode==='endless'?'RONDA':'PISO',188,284,4.5,'#61777c','left',false,false);text(ctx,engine.gameMode==='endless'?String(engine.endless.round):String(engine.map.floorIndex+1)+'/6',188,298,6.3,'#d8e1db','left',true,false);
  text(ctx,'OBJETOS',310,284,4.5,'#61777c','left',false,false);text(ctx,String(engine.player.items.length),310,298,6.3,'#d8c57d','left',true,false);
  text(ctx,engine.gameMode==='endless'?'PRESIÓN '+Math.round(engine.endless.pressure)+'%':'SEMILLA · '+engine.run.seed,428,298,4.3,'#75898d','right',true,false);
}

function renderRunInfoUI(engine:GameEngine) {
  const ctx=engine.ui!,mf=menuFrame(engine),p=engine.player,r=engine.run,s2=engine.stats;
  drawMenuBackdrop(ctx,mf,.95,'#79b9d2');
  drawMenuHeader(ctx,'INFO DE RUN','Haz clic en una pestaña para cambiar de vista.',mf,'#79b9d2','DOSSIER EN CURSO');
  const tabs=[{label:'BUILD',x:42,w:190},{label:engine.gameMode==='endless'?'ARENA / RENDIMIENTO':'RENDIMIENTO',x:248,w:190}];
  tabs.forEach((tab,i)=>{const on=engine.runInfoTab===i,hover=inside(engine.mouseX,engine.mouseY,{x:tab.x,y:70,w:tab.w,h:24});drawMenuCard(ctx,tab.x,70,tab.w,24,on||hover,on?'#79b9d2':'#52676e',on?'rgba(22,39,46,.98)':hover?'rgba(16,30,36,.98)':'rgba(8,21,27,.94)');text(ctx,tab.label,tab.x+tab.w/2,86,6.6,on?'#eaf7f5':hover?'#cad9d7':'#8ca0a1','center',true,false);});

  if(engine.runInfoTab===0){
    drawMenuCard(ctx,34,106,202,190,false,'#e6c56f','rgba(8,20,26,.96)');drawSectionLabel(ctx,'ARMAS',50,125,'#e6c56f');
    p.weapons.forEach((w,i)=>{const y=140+i*58;if(!w){text(ctx,'SLOT '+(i+1)+' · VACÍO',50,y+20,6,'#65777c','left',true,false);return;}drawItemIcon(ctx,52,y+4,w.id,24);text(ctx,'SLOT '+(i+1),84,y+13,4.6,'#6d8185','left',true,false);wrappedText(ctx,w.name,84,y+27,130,7,8,1,RARITY_COLORS[w.rarity],true);wrappedText(ctx,w.special,50,y+43,166,5.2,6.2,2,'#8fa1a2');});
    const active=p.activeItem?ACTIVE_ITEMS[p.activeItem]:null;text(ctx,'OBJETO ACTIVO',50,267,4.8,'#6d8185','left',true,false);if(active){drawItemIcon(ctx,52,274,active.id,18);text(ctx,active.name,78,286,6,'#cfa7e8','left',true,false);}else text(ctx,'NINGUNO',50,286,6,'#6d8185','left',true,false);
    drawMenuCard(ctx,248,106,198,190,false,'#78c99a','rgba(8,20,26,.96)');drawSectionLabel(ctx,'OBJETOS PASIVOS',264,125,'#78c99a');
    const shown=p.items.slice(0,12);shown.forEach((id,i)=>{const def=ITEMS[id],col=i%4,row=Math.floor(i/4),x=270+col*41,y=139+row*45;drawMenuCard(ctx,x,y,34,38,false,def?RARITY_COLORS[def.rarity]:'#4d6268','rgba(10,25,30,.94)');drawItemIcon(ctx,x+8,y+7,id,18);});
    if(!shown.length)text(ctx,'AÚN NO HAY OBJETOS',347,174,6,'#71868a','center',true,false);text(ctx,'TOTAL · '+p.items.length,264,286,5.2,'#8ca39e','left',true,false);if(p.items.length>12)text(ctx,'+'+(p.items.length-12)+' MÁS',430,286,5.2,'#78c99a','right',true,false);
  }else{
    drawMenuCard(ctx,34,106,412,190,false,'#79b9d2','rgba(8,20,26,.96)');
    const metrics:[string,string,string][]=[
      [engine.gameMode==='endless'?'RONDA':'PISO',engine.gameMode==='endless'?String(engine.endless.round):String(r.floorReached)+'/'+TOTAL_FLOORS,'#e6c56f'],
      ['SALAS',String(s2.roomsCleared),'#dce5de'],['ENEMIGOS',String(s2.enemiesDefeated),'#dce5de'],['JEFES',String(r.bosses),'#dce5de'],
      ['DAÑO HECHO',String(Math.round(r.dmgDealt)),'#78c99a'],['DAÑO RECIBIDO',String(Math.round(r.dmgTaken*10)/10),'#d85d58'],[engine.gameMode==='endless'?'MIGAS':'MIGAJAS',String(Math.floor(p.crumbs)),'#d8c57d'],['PAN ROBADO',String(s2.breadStolen),'#d8c57d'],['TIEMPO',fmtTime(r.time),'#79b9d2'],
    ];
    metrics.forEach(([k,v,col],i)=>{const x=56+(i%3)*132,y=137+Math.floor(i/3)*53;text(ctx,k,x,y,4.7,'#64797d','left',false,false);text(ctx,v,x,y+18,9,col,'left',true,false);});
    if(engine.gameMode==='endless'){ctx.fillStyle='rgba(216,93,88,.13)';ctx.fillRect(50,264,380,22);text(ctx,'ALERTA '+engine.endless.alert+' · PRESIÓN '+Math.round(engine.endless.pressure)+'% · '+engine.endless.threatRank,240,279,5.5,engine.endless.pressure>=75?'#e0766f':'#a9b8b3','center',true,false);}else text(ctx,'SEMILLA · '+r.seed,240,279,5.2,'#71888c','center',true,false);
  }
  drawMouseButton(ctx,'← VOLVER A PAUSA',BACK_BUTTON.x,BACK_BUTTON.y,126,BACK_BUTTON.h,inside(engine.mouseX,engine.mouseY,{...BACK_BUTTON,w:126}),'#79b9d2');
}

function renderConfirmUI(engine:GameEngine) {
  const ctx=engine.ui!,mf=menuFrame(engine),kind=engine.confirmKind;
  const title=kind==='restart'?'¿REINICIAR ATRACO?':kind==='new_endless'?'¿NUEVO ATRACO SIN FIN?':'¿ABANDONAR ATRACO?';
  const body=kind==='restart'?'Se perderá el progreso no guardado de esta run y comenzarás de nuevo.':kind==='new_endless'?'El checkpoint actual será reemplazado cuando comience la nueva partida.':'Volverás al menú principal y la run actual terminará.';
  const detail=kind==='new_endless'&&engine.endlessCheckpointRound>0?'CHECKPOINT ACTUAL · RONDA '+engine.endlessCheckpointRound:'ESTA ACCIÓN NO SE PUEDE DESHACER';
  drawMenuBackdrop(ctx,mf,.97,'#d85d58');drawMenuHeader(ctx,title,'Revisa la acción antes de continuar.',mf,'#d85d58','PROTOCOLO DE SEGURIDAD');
  drawMenuCard(ctx,78,91,324,112,true,'#d85d58','rgba(27,16,20,.98)');text(ctx,'!',104,126,24,'#d85d58','center',true,false);wrappedText(ctx,body,134,116,242,7.2,10,4,'#d8ded8',true);text(ctx,detail,240,185,5.2,'#b27b76','center',true,false);
  const confirm=CONFIRM_RECTS[0],cancel=CONFIRM_RECTS[1];
  drawMouseButton(ctx,'CANCELAR',cancel.x,cancel.y,cancel.w,cancel.h,inside(engine.mouseX,engine.mouseY,cancel),'#78c99a');
  drawMouseButton(ctx,'SÍ, CONFIRMAR',confirm.x,confirm.y,confirm.w,confirm.h,inside(engine.mouseX,engine.mouseY,confirm),'#d85d58',true);
  text(ctx,'Las acciones destructivas siempre requieren este segundo clic.',240,289,4.9,'#77898a','center',false,false);
}

function renderSwapUI(engine: GameEngine) {
  const ctx = engine.ui!;
  const req = engine.swap!;
  const p = engine.player;
  const newW = WEAPONS[req.itemId];
  const x=35,y=51,w=410;

  drawMenuBackdrop(ctx,menuFrame(engine),.92,'#ff9f43');
  drawMenuHeader(ctx,'INVENTARIO LLENO','Compara antes de soltar un arma.',menuFrame(engine),'#ff9f43','CAMBIO DE EQUIPO');

  drawMenuCard(ctx,x+16,y+12,w-32,52,true,'#ff9f43','rgba(35,25,18,.97)');
  text(ctx,'EN EL SUELO',x+28,y+30,5,'#a58162','left',true,false);
  ctx.save();ctx.translate(x+30,y+35);ctx.scale(1.2,1.2);drawWeaponIcon(ctx,0,0,newW.id);ctx.restore();
  wrappedText(ctx,newW.name,x+64,y+38,w-112,9,11,1,RARITY_COLORS[newW.rarity],true);
  wrappedText(ctx,newW.special,x+64,y+53,w-112,5.8,7,1,'#aeb9b4');

  text(ctx,'ELIGE QUÉ ARMA SOLTAR',x+16,y+91,5.4,'#73878b','left',true,false);

  for (let i = 0; i < 2; i++) {
    const w2 = p.weapons[i]!;
    const bw = 185;
    const bx = x + 16 + i * (bw + 8);
    const by = 171;
    const sel = engine.swapSel === i;

    drawMenuCard(ctx,bx,by,bw,84,sel,'#ff9f43',sel?'rgba(42,31,21,.98)':'rgba(10,23,29,.96)');
    text(ctx,'SLOT '+(i+1),bx+10,by+14,4.8,sel?'#ff9f43':'#65797e','left',true,false);
    text(ctx,RARITY_NAMES[w2.rarity],bx+bw-10,by+14,4.8,RARITY_COLORS[w2.rarity],'right',true,false);
    ctx.save();ctx.translate(bx+9,by+21);ctx.scale(1.15,1.15);ctx.globalAlpha=sel?1:.72;drawWeaponIcon(ctx,0,0,w2.id);ctx.restore();
    wrappedText(ctx,w2.name,bx+38,by+28,bw-50,7.5,9,1,sel?'#fff0c2':'#c7d1cc',true);

    const statsComp:[string,number,number][]=[
      [T.statDmg,newW.bars.dmg,w2.bars.dmg],
      [T.statRate,newW.bars.rate,w2.bars.rate],
      [T.statRange,newW.bars.range,w2.bars.range],
      [T.statSpeed,newW.bars.speed,w2.bars.speed],
    ];
    statsComp.forEach(([label,newV,curV],si)=>{
      const sy=by+40+si*9,diff=newV-curV;
      text(ctx,label,bx+9,sy+3,4.7,'#7f9397','left',false,false);
      for(let b=0;b<5;b++){
        ctx.fillStyle=b<newV?(diff>0?'#78c99a':diff<0?'#d85d58':'#e6c56f'):'rgba(255,255,255,.1)';
        ctx.fillRect(bx+91+b*9,sy-3,7,5);
      }
      text(ctx,diff>0?'+'+diff:diff<0?String(diff):'=',bx+bw-8,sy+3,6,diff>0?'#78c99a':diff<0?'#d85d58':'#788d91','right',true,false);
    });
    if(sel) text(ctx,'REEMPLAZAR',bx+bw/2,by+79,5.2,'#ffb465','center',true,false);
  }

  const old=p.weapons[engine.swapSel];
  text(ctx,'ACTUAL · '+(old?.description ?? ''),240,271,5.4,'#839799','center',false,false);
  text(ctx,'Haz clic en el arma que quieres reemplazar.',240,292,5.1,'#9aa9a5','center',false,false);
  drawMouseButton(ctx,'CANCELAR',SWAP_CANCEL.x,SWAP_CANCEL.y,SWAP_CANCEL.w,SWAP_CANCEL.h,inside(engine.mouseX,engine.mouseY,SWAP_CANCEL),'#ff9f43');
}

function renderEndlessResumeUI(engine:GameEngine) {
  const ctx=engine.ui!,diff=engine.endlessCheckpointDifficulty?DIFFICULTIES[engine.endlessCheckpointDifficulty].label:'';
  drawMenuBackdrop(ctx,menuFrame(engine),.94,'#d86b58');drawMenuHeader(ctx,'ATRACO SIN FIN','Hay una operación guardada.',menuFrame(engine),'#d86b58','PUNTO DE REINGRESO');
  drawMenuCard(ctx,72,78,336,60,false,'#d86b58','rgba(10,22,28,.95)');drawSectionLabel(ctx,'PARTIDA GUARDADA',88,97,'#d86b58');titleText(ctx,'RONDA '+engine.endlessCheckpointRound,88,124,14,'#f0dfb0','left',false);text(ctx,diff,390,122,6.2,'#8ea1a5','right',true,false);
  ['CONTINUAR ATRACO','EMPEZAR DE NUEVO'].forEach((label,i)=>{const box=endlessResumeRect(i),on=i===engine.endlessResumeIndex;drawMenuCard(ctx,box.x,box.y,box.w,box.h,on,'#d86b58',on?'rgba(54,31,29,.98)':'rgba(9,22,28,.94)');text(ctx,label,box.x+16,box.y+25,8,on?'#fff0d4':'#c7d3cd','left',true,false);text(ctx,i===0?'RETOMAR CHECKPOINT':'REEMPLAZAR GUARDADO',box.x+box.w-14,box.y+25,4.4,on?'#d86b58':'#64787c','right',true,false);});
  drawMenuCard(ctx,92,260,296,38,false,'#4e656c','rgba(7,18,24,.94)');text(ctx,'El guardado se actualiza entre rondas.',240,276,5.8,'#93a4a3','center',false,false);text(ctx,'Empezar de nuevo pedirá confirmación.',240,289,5,'#6f8387','center',false,false);
  drawMouseButton(ctx,'← VOLVER',BACK_BUTTON.x,BACK_BUTTON.y,BACK_BUTTON.w,BACK_BUTTON.h,inside(engine.mouseX,engine.mouseY,BACK_BUTTON),'#d86b58');
}

function renderEndlessRewardUI(engine:GameEngine) {
  const ctx=engine.ui!,e=engine.endless,accent=e.marketOpen?'#78c99a':'#e6c56f';
  drawMenuBackdrop(ctx,menuFrame(engine),.9,accent);drawMenuHeader(ctx,e.marketOpen?'MERCADO DE RESPIRO':'RECOMPENSA DE RONDA','RONDA '+Math.max(1,e.round)+' · ALERTA '+e.alert+' · '+endlessStage(Math.max(1,e.round)),engine.frame,accent,'ATRACO SIN FIN');
  if(e.marketOpen){
    const opts=endlessMarketOptions(engine);
    opts.forEach((opt,i)=>{const x=ENDLESS_REWARD_LAYOUT.startX+i*(ENDLESS_REWARD_LAYOUT.w+ENDLESS_REWARD_LAYOUT.gap),y=ENDLESS_REWARD_LAYOUT.y,on=i===e.marketIndex;drawMenuCard(ctx,x,y,ENDLESS_REWARD_LAYOUT.w,ENDLESS_REWARD_LAYOUT.h,on,accent,on?'rgba(25,45,35,.98)':'rgba(10,23,29,.95)');text(ctx,String(opt.cost)+' MIGAS',x+ENDLESS_REWARD_LAYOUT.w-10,y+15,5,on?accent:'#8f9279','right',true,false);wrappedText(ctx,opt.label,x+10,y+38,ENDLESS_REWARD_LAYOUT.w-20,7.2,9,2,on?'#eff8e9':'#d5dfd8',true);wrappedText(ctx,opt.description,x+10,y+69,ENDLESS_REWARD_LAYOUT.w-20,5.3,6.6,3,'#8ba09f');text(ctx,on?'CLIC PARA COMPRAR':'',x+ENDLESS_REWARD_LAYOUT.w/2,y+101,4.6,accent,'center',true,false);});
    drawMenuCard(ctx,78,236,324,40,false,accent,'rgba(7,18,24,.95)');
    text(ctx,'MIGAS · MONEDA DE ESTA PARTIDA',92,249,4.8,accent,'left',true,false);
    text(ctx,'Compra en mercados entre rondas.',92,260,4.4,'#8fa19f','left',false,false);
    text(ctx,'Se conservan en este Atraco Sin Fin · No son MONEDAS DORADAS.',92,271,4,'#73888a','left',false,false);
    text(ctx,Math.floor(engine.player.crumbs)+' MIGAS',390,249,6.1,accent,'right',true,false);
    drawMouseButton(ctx,'CONSERVAR MIGAS · SIGUIENTE RONDA',ENDLESS_SECONDARY.x,ENDLESS_SECONDARY.y,ENDLESS_SECONDARY.w,ENDLESS_SECONDARY.h,inside(engine.mouseX,engine.mouseY,ENDLESS_SECONDARY),accent);
  }else if(e.awaitingReward&&e.rewardOptions.length){
    e.rewardOptions.forEach((opt,i)=>{const x=ENDLESS_REWARD_LAYOUT.startX+i*(ENDLESS_REWARD_LAYOUT.w+ENDLESS_REWARD_LAYOUT.gap),y=ENDLESS_REWARD_LAYOUT.y,on=i===e.rewardIndex;const kind=opt.kind==='weapon'?'ARMA':opt.kind==='item'?'OBJETO':opt.kind==='heal'?'CURACIÓN':'BOTÍN';drawMenuCard(ctx,x,y,ENDLESS_REWARD_LAYOUT.w,ENDLESS_REWARD_LAYOUT.h,on,accent,on?'rgba(48,41,24,.98)':'rgba(10,23,29,.95)');text(ctx,kind,x+ENDLESS_REWARD_LAYOUT.w-10,y+15,4.8,on?accent:'#71868a','right',true,false);wrappedText(ctx,opt.label,x+10,y+40,ENDLESS_REWARD_LAYOUT.w-20,7.3,9,2,on?'#fff1bc':'#d5dfd8',true);wrappedText(ctx,opt.description,x+10,y+70,ENDLESS_REWARD_LAYOUT.w-20,5.3,6.6,4,'#8ba09f');text(ctx,on?'CLIC PARA TOMAR':'',x+ENDLESS_REWARD_LAYOUT.w/2,y+101,4.6,accent,'center',true,false);});
    const amount=10+e.alert*4;drawMouseButton(ctx,'RECICLAR TODO · +'+amount+' MIGAS',ENDLESS_SECONDARY.x,ENDLESS_SECONDARY.y,ENDLESS_SECONDARY.w,ENDLESS_SECONDARY.h,inside(engine.mouseX,engine.mouseY,ENDLESS_SECONDARY),'#b6a36d');
  }
  drawMenuCard(ctx,128,316,224,18,false,'#586d72','rgba(7,18,24,.92)');text(ctx,'PRESIÓN '+Math.round(e.pressure)+'% · '+e.threatRank,240,329,5.2,e.pressure>=75?'#d86b58':'#81969a','center',true,false);
}

function renderEndActions(engine:GameEngine,accent:string){
  const ctx=engine.ui!;
  ['OTRO INTENTO','MENÚ PRINCIPAL'].forEach((label,i)=>{
    const box=endActionRect(i);
    drawMouseButton(ctx,label,box.x,box.y,box.w,box.h,inside(engine.mouseX,engine.mouseY,box),accent);
  });
}

function renderGameOverUI(engine: GameEngine) {
  const ctx=engine.ui!;
  if(engine.gameMode==='daily'){renderDailyResult(engine);return;}
  if(engine.gameMode==='endless'){
    const e=engine.endless,rec=engine.endlessRecords[engine.difficulty];
    drawMenuBackdrop(ctx,menuFrame(engine),.96,'#d85d58');
    drawMenuHeader(ctx,'ATRACO TERMINADO','La arena ganó esta vez.',engine.frame,'#d85d58','INFORME · ATRACO SIN FIN');

    drawMenuCard(ctx,36,74,408,190,false,'#d85d58','rgba(12,18,23,.96)');
    titleText(ctx,'RONDA '+e.round,56,105,17,'#f0d7a6','left',false);
    text(ctx,'ALERTA '+e.alert+' · '+endlessStage(Math.max(1,e.round)),56,122,6,'#a8917e','left',true,false);
    text(ctx,'RÉCORD · RONDA '+rec.round,420,103,6.2,rec.round<=e.round?'#e6c56f':'#8aa0a0','right',true,false);

    const rows:[string,string][]=[
      ['PUNTUACIÓN',String(Math.round(e.score))],['ENEMIGOS',String(engine.stats.enemiesDefeated)],
      ['JEFES',String(engine.run.bosses)],['RONDAS PERFECTAS',String(e.perfectRounds)],
      ['MEJOR RACHA',String(e.maxPerfectStreak)],['DAÑO HECHO',String(Math.round(engine.run.dmgDealt))],
      ['DAÑO RECIBIDO',String(Math.round(engine.run.dmgTaken*10)/10)],['PROYECTILES',String(Math.round(e.damageBySource.projectile))],
      ['CONTACTO',String(Math.round(e.damageBySource.contact))],
    ];
    rows.forEach(([k,v],i)=>{
      const col=i%3,row=Math.floor(i/3),x=56+col*127,y=145+row*34;
      text(ctx,k,x,y,4.7,'#64787e','left',false,false);
      text(ctx,v,x,y+13,8.2,'#e1e8df','left',true,false);
    });
    const threat=e.damageBySource.projectile>=e.damageBySource.contact?'PROYECTILES':'CONTACTO';
    text(ctx,'MAYOR AMENAZA · '+threat,240,250,5.4,'#c9857d','center',true,false);
    renderEndActions(engine,'#d85d58');
    return;
  }

  drawMenuBackdrop(ctx,menuFrame(engine),.96,'#d85d58');
  drawMenuHeader(ctx,T.gameOver,'El banco conserva lo que no pudiste robar.',engine.frame,'#d85d58','INFORME DE OPERACIÓN');

  const r=engine.run,s2=engine.stats;
  drawMenuCard(ctx,34,74,138,190,false,'#d85d58','rgba(12,18,23,.96)');
  ctx.save();ctx.translate(103,104);ctx.scale(2.4,2.4);
  drawDuckSkin(ctx,-8,-8,engine.frame,engine.equippedSkin,'down',false,false,false,false,true);ctx.restore();
  text(ctx,engine.newRecord?'NUEVO RÉCORD':'MEJOR PISO',103,160,5.2,engine.newRecord?'#e6c56f':'#7f9195','center',true,false);
  text(ctx,engine.newRecord?'PISO '+r.floorReached+'/6':'PISO '+engine.bestFloor+'/6',103,178,10,engine.newRecord?'#e6c56f':'#e2e7df','center',true,false);
  text(ctx,'DIFICULTAD',103,205,4.8,'#5f747a','center',false,false);
  text(ctx,difficultyLabel(engine),103,219,6.4,'#d8c27d','center',true,false);

  drawMenuCard(ctx,184,74,262,190,false,'#52666d','rgba(9,21,27,.96)');
  drawSectionLabel(ctx,'RESUMEN',200,94,'#7e9598');
  const lines:[string,string][]=[
    [T.statRooms,String(s2.roomsCleared)],[T.statEnemies,String(s2.enemiesDefeated)],[T.statBosses,String(r.bosses)],
    [T.statItems,String(r.items)],[T.statWeapons,String(r.weaponsFound)],[T.statDealt,String(Math.round(r.dmgDealt))],
    [T.statTaken,String(Math.round(r.dmgTaken*10)/10)],[T.statBread,String(s2.breadStolen)],[T.statGolden,String(s2.goldenCrumbs)],
    [T.statTime,fmtTime(r.time)],
  ];
  lines.forEach(([k,v],i)=>{
    const col=i%2,row=Math.floor(i/2),x=202+col*116,y=116+row*26;
    text(ctx,k,x,y,4.6,'#62777c','left',false,false);
    text(ctx,v,x,y+11,7.2,'#dce5de','left',true,false);
  });
  const tally=Math.min(1,(engine.frame-engine.endFrame)/70);
  text(ctx,'+'+Math.floor(r.goldenEarned*tally)+' MONEDAS GUARDADAS · TOTAL '+engine.totalGoldenCrumbs,315,249,5.4,'#d4bd73','center',true,false);

  renderEndActions(engine,'#d85d58');
}

function renderVictoryUI(engine: GameEngine) {
  const ctx=engine.ui!;
  if(engine.gameMode==='daily'){renderDailyResult(engine);return;}
  drawMenuBackdrop(ctx,menuFrame(engine),.94,'#78c99a');
  drawMenuHeader(ctx,T.victory,T.victorySub,engine.frame,'#78c99a','OPERACIÓN COMPLETADA');

  const r=engine.run,s=engine.stats;
  drawMenuCard(ctx,34,74,150,188,true,'#78c99a','rgba(13,28,24,.96)');
  ctx.save();ctx.translate(109,112+Math.sin(engine.frame*.08)*1.5);ctx.scale(2.7,2.7);
  drawDuck(ctx,-8,-8,engine.frame,'down',false,false,false);ctx.restore();
  text(ctx,'BANCO DEL PAN',109,171,5.1,'#6f8a82','center',true,false);
  titleText(ctx,'LIMPIO',109,191,13,'#8bd3a4','center',false);
  text(ctx,'DIFICULTAD',109,218,4.8,'#5d7470','center',false,false);
  text(ctx,difficultyLabel(engine),109,232,6.5,'#e2ce86','center',true,false);

  drawMenuCard(ctx,196,74,250,188,false,'#e6c56f','rgba(9,21,27,.96)');
  drawSectionLabel(ctx,'BOTÍN E INFORME',212,94,'#e6c56f');
  const lines:[string,string][]=[
    [T.statRooms,String(s.roomsCleared)],[T.statEnemies,String(s.enemiesDefeated)],[T.statBosses,String(r.bosses)],
    [T.statBread,String(s.breadStolen)],[T.statGolden,String(s.goldenCrumbs)],[T.statTime,fmtTime(r.time)],
  ];
  lines.forEach(([k,v],i)=>{
    const col=i%2,row=Math.floor(i/2),x=214+col*112,y=120+row*39;
    text(ctx,k,x,y,4.8,'#647a7d','left',false,false);
    text(ctx,v,x,y+14,8.7,'#e4e9e0','left',true,false);
  });
  text(ctx,'ATRACO COMPLETADO',321,242,6.1,'#78c99a','center',true,false);

  renderEndActions(engine,'#78c99a');
}

function fmtTime(frames: number) {
  const sec = Math.floor(frames / 60);
  return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
}

export { drawMenuScene };
