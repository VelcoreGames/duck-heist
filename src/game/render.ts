// Renderizador en dos capas:
//  · MUNDO  → canvas de 480x352 escalado con nearest-neighbour (pixel art puro)
//  · UI     → canvas a resolución nativa con tipografía nítida
import {
  TILE_SIZE, ROOM_WIDTH, ROOM_HEIGHT, CANVAS_WIDTH, CANVAS_HEIGHT,
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
import { text, titleText, drawPanel, drawButtons, drawMenuScene, drawTitleLogo, drawBar } from './ui';
import { wrappedText } from './ui';
import { activeWeapon, currentRoomOf, getContentOf, SETTING_ROWS, settingValue, shopPrice, DIFFICULTY_MODES, DIFFICULTIES, difficultyLabel, endlessMarketOptions } from './engine';
import { drawVaultScene } from './titleScene';
import { MAIN_MENU, PAUSE_MENU, WARDROBE, WARDROBE_ACTION, SETTINGS, ENDLESS_REWARD as ENDLESS_REWARD_LAYOUT } from './layout';
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
import { endlessStage } from './endless';
import { drawRichTile, drawRoomAtmosphere, drawInnerWallShadow } from './roomArt';
import type { GameEngine, Enemy, RoomContent, Pedestal } from './types';

const dist = (x1: number, y1: number, x2: number, y2: number) => Math.hypot(x2 - x1, y2 - y1);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));


function drawGunVanScene(ctx:CanvasRenderingContext2D,f:number) {
  ctx.save();ctx.fillStyle='rgba(0,0,0,.45)';ctx.beginPath();ctx.ellipse(240,161,100,14,0,0,Math.PI*2);ctx.fill();
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
  ctx.save();ctx.fillStyle='#4d3124';ctx.fillRect(136,106,208,38);ctx.fillStyle='#8a5b3d';ctx.fillRect(136,106,208,4);ctx.fillStyle='#e1b779';ctx.fillRect(142,112,196,3);
  ctx.fillStyle='#20262c';ctx.fillRect(296,80,34,27);ctx.fillStyle='#9aa6ab';ctx.fillRect(300,84,26,11);ctx.fillStyle='#dce5e7';ctx.fillRect(303,87,20,6);
  ctx.fillStyle='#efe0bf';ctx.fillRect(152,80,58,24);ctx.fillStyle='#2d2520';ctx.fillRect(156,84,50,16);ctx.fillStyle='#e4b768';ctx.fillRect(161,88,24,2);ctx.fillRect(161,93,32,2);
  drawShopPigeon(ctx,230,92,f);ctx.fillStyle='#f0ece2';ctx.fillRect(234,110,8,11);ctx.restore();
}

function drawShopStand(ctx:CanvasRenderingContext2D,x:number,y:number,kind:'van'|'cafe'|'shop') {
  ctx.fillStyle=kind==='van'?'#0a0d10':kind==='cafe'?'#6f4934':'#25382f';ctx.fillRect(x-18,y+9,36,10);
  ctx.fillStyle=kind==='van'?'#d58e42':kind==='cafe'?'#e7c493':'#66ba89';ctx.fillRect(x-14,y+10,28,2);
}

// ===========================================================================
// CAPA DE MUNDO
// ===========================================================================
export function renderWorld(engine: GameEngine) {
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

  drawRoomFloor(ctx, room, content, f, engine.map.floorIndex);
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
    } else drawCoin(ctx, p.x, p.y, f, p.type === 'golden_crumb');
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
    text(ctx,`E · TOMAR   R · RECICLAR`,it.x+8,it.y+34,4.8,'#d4d9d2','center');
    if(def?.name) text(ctx,def.name,it.x+8,it.y-7,4.8,'#c8d0cc','center');
  }

  for (const e of content.enemies) drawEnemy(ctx, e, f, engine);
  for(const d of engine.deathEchoes) {
    const floorDeath=d.enemy.isBoss&&!!BOSSES[d.enemy.bossType],subDeath=d.enemy.isBoss&&!!SUBBOSSES[d.enemy.bossType];
    const maxLife=floorDeath?68:subDeath?54:d.enemy.isBoss?46:20;
    const deathT=clamp(d.life/maxLife,0,1);
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
    const recoil=p.shootFlash>0?(p.shootFlash/4)*1.6:0;
    const drawX=p.x-Math.cos(p.facingAngle)*recoil,drawY=p.y-Math.sin(p.facingAngle)*recoil;
    drawDuckSkin(ctx, drawX, drawY, f, engine.equippedSkin, p.dir, p.moving,
      p.hurtTimer > 0, p.dashTimer > 0, p.shootFlash > 0);
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
  } else if (room.type === RoomType.GUN_VAN) {
    ctx.fillStyle='rgba(3,5,8,.38)';ctx.fillRect(TILE_SIZE,TILE_SIZE,CANVAS_WIDTH-TILE_SIZE*2,CANVAS_HEIGHT-TILE_SIZE*2);
    ctx.fillStyle='rgba(231,154,69,.12)';for(let x=90;x<410;x+=70)ctx.fillRect(x,286,34,3);
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
    const cx=e.x+e.size/2,cy=e.y+e.size/2;
    if((e.phaseTransition??0)>0){
      const pt=e.phaseTransition??0;
      const progress=1-pt/54;
      ctx.save();
      ctx.globalAlpha=Math.min(.8,pt/18);
      const accent=BOSSES[e.bossType]?'#ff5d63':SUBBOSSES[e.bossType]?'#f39a68':'#f4d03f';
      ctx.strokeStyle=accent;ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(cx,cy,12+progress*42,0,Math.PI*2);ctx.stroke();
      ctx.globalAlpha*=.55;ctx.beginPath();ctx.arc(cx,cy,22+progress*58,0,Math.PI*2);ctx.stroke();
      ctx.globalAlpha=.12+.14*Math.sin(f*.35);ctx.fillStyle=accent;ctx.beginPath();ctx.arc(cx,cy,18+(54-pt)*.35,0,Math.PI*2);ctx.fill();
      ctx.restore();
    }
    if(e.telegraph>.05){
      const t=e.telegraph,ang=e.moveAngle;
      ctx.save();
      ctx.globalAlpha=.16+t*.34;
      ctx.strokeStyle=BOSSES[e.bossType]?'#ff6a63':SUBBOSSES[e.bossType]?'#f1a26f':'#ffd166';
      ctx.lineWidth=2+t*2;
      ctx.beginPath();ctx.arc(cx,cy,e.size*.62+t*8,0,Math.PI*2);ctx.stroke();
      ctx.globalAlpha=.18+t*.32;ctx.setLineDash([5,4]);
      ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(ang)*(70+t*55),cy+Math.sin(ang)*(70+t*55));ctx.stroke();
      ctx.setLineDash([]);ctx.restore();
    }
    if(engine.gameMode==='endless'&&e.mutation){
      const mutationColor=e.mutation==='TORMENTA'?'#79c8ff':e.mutation==='BLINDADO'?'#aab9c8':e.mutation==='CAZADOR'?'#ff7b68':e.mutation==='REFUERZOS'?'#d6b06a':'#ff9b58';
      ctx.save();ctx.globalAlpha=.16+.08*Math.sin(f*.14+e.id);ctx.strokeStyle=mutationColor;ctx.lineWidth=2;
      ctx.beginPath();ctx.ellipse(e.x+e.size/2,e.y+e.size/2+3,e.size*.76,e.size*.62,0,0,Math.PI*2);ctx.stroke();ctx.restore();
      ctx.fillStyle=mutationColor;ctx.globalAlpha=.85;ctx.fillRect(e.x+e.size/2-5,e.y-10,10,2);ctx.globalAlpha=1;
    }
    drawBoss(ctx, e.x, e.y, e.bossType, f, e.hp, e.maxHp, hurt, e.bossPhase);
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
    case GameState.ENDLESS_REWARD:
      drawHUD(engine); renderEndlessRewardUI(engine); break;
    case GameState.ENDLESS_RESUME:
      renderEndlessResumeUI(engine); break;
    case GameState.FLOOR_CLEAR:
      renderFloorClearUI(engine); break;
    default:
      drawHUD(engine);
      renderPrompts(engine);
      if(engine.keys.tab) renderRunStats(engine);
      break;
  }

  ctx.restore();
}

// ---------------------------------------------------------------------------
// PROMPTS Y FICHAS (coordenadas de mundo, tipografía nítida)
// ---------------------------------------------------------------------------
function renderRunStats(engine:GameEngine) {
  const ctx=engine.ui!,r=engine.run,s=engine.stats,p=engine.player;
  ctx.save();ctx.fillStyle='rgba(2,6,12,.82)';ctx.fillRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT);
  drawPanel(ctx,104,50,272,244,'rgba(8,16,25,.98)','#d6b45f');
  text(ctx,'ESTADÍSTICAS DE LA RUN',240,75,12,'#f4d03f','center',true);
  text(ctx,`PISO  ${r.floorReached}/${TOTAL_FLOORS}`,128,104,8,'#e9dfbd','left',true);
  text(ctx,`SALAS  ${s.roomsCleared}`,128,127,8,'#cbd5d9','left');
  text(ctx,`ENEMIGOS  ${s.enemiesDefeated}`,128,150,8,'#cbd5d9','left');
  text(ctx,`JEFES  ${r.bosses}`,128,173,8,'#cbd5d9','left');
  text(ctx,`MIGAJAS  ${Math.floor(p.crumbs)}`,252,104,8,'#e9dfbd','left',true);
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
    const endless=engine.gameMode==='endless';
    const a=endless?Math.min(1,t/14):(t > 75 ? (95 - t) / 20 : Math.min(1, t / 25));
    ctx.globalAlpha = clamp(a, 0, 1);
    text(ctx,engine.roomLabel,240,endless?42:55,endless?6.5:10,endless?'#a9a17d':'#e3c989','center',!endless);
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
function renderDangerEventHUD(engine: GameEngine) {
  const room=currentRoomOf(engine),content=getContentOf(engine);
  if(room.type!==RoomType.EVENT || content.cafe || !content.dangerEventActive) return;
  const ctx=engine.ui!;
  const enemies=Math.max(0,content.enemies.length);
  const timer=Math.max(0,content.dangerEventTimer ?? 0);
  const total=Math.max(1,content.dangerEventTotal ?? 1);
  const seconds=(timer/60).toFixed(1);
  const pulse=.55+.45*Math.sin(engine.frame*.13);
  const x=92,y=27,w=296,h=61;
  ctx.save();
  ctx.fillStyle='rgba(14,8,10,.90)';ctx.fillRect(x,y,w,h);
  ctx.strokeStyle=`rgba(255,79,67,${.7+pulse*.3})`;ctx.lineWidth=2;ctx.strokeRect(x+1,y+1,w-2,h-2);
  ctx.fillStyle='rgba(255,79,67,.16)';ctx.fillRect(x+5,y+5,w-10,11);
  text(ctx,'EVENTO DE ALTO RIESGO',240,y+13,7.2,'#ff786b','center',true);
  if(timer>0) titleText(ctx,`SOBREVIVE ${seconds} s`,240,y+36,13.5,'#fff0c2');
  else titleText(ctx,'ELIMINA A LOS RESTANTES',240,y+36,11.5,'#fff0c2');
  text(ctx,`SEGURIDAD RESTANTE: ${enemies}`,240,y+49,6.8,enemies>0?'#ffb36b':'#86e3a0','center',true);
  ctx.fillStyle='rgba(255,255,255,.10)';ctx.fillRect(x+14,y+54,w-28,4);
  ctx.fillStyle=timer>0?'#e75c4c':'#d7ae4b';ctx.fillRect(x+14,y+54,(w-28)*(timer>0?timer/total:Math.min(1,enemies?0:1)),4);
  ctx.restore();
}

function drawHUD(engine: GameEngine) {
  const ctx=engine.ui!;
  ctx.save();ctx.imageSmoothingEnabled=false;ctx.fillStyle='#e8d79a';ctx.font='700 5px "Chakra Petch",monospace';ctx.textBaseline='top';ctx.textAlign='left';ctx.shadowColor='#000';ctx.shadowBlur=1;ctx.fillText('v0.7.0',8,8);ctx.restore();
  const p=engine.player;
  const heartW=Math.min(p.maxHp,10)*13+7;
  ctx.fillStyle='rgba(5,12,18,.48)';ctx.fillRect(4,4,heartW,18);
  ctx.strokeStyle='rgba(244,208,63,.14)';ctx.strokeRect(4.5,4.5,heartW-1,17);
  for(let i=0;i<p.maxHp;i++) {
    ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(7+(i%10)*13,5+Math.floor(i/10)*13);
    if(p.hp<=1&&i===0)ctx.globalAlpha=.78+Math.sin(engine.frame*.055)*.2;
    drawHeart(ctx,0,0,i<p.hp,p.hp>i&&p.hp<i+1);
    if(p.healFlash>0&&i<p.hp){ctx.globalAlpha=p.healFlash/36;ctx.fillStyle='#badba4';ctx.fillRect(1,13,10,1);}
    ctx.restore();
  }
  if(p.shield>0||p.helmetShield||p.contactShield>0)text(ctx,`ESCUDO ${p.shield+p.contactShield+(p.helmetShield?1:0)}`,6,31,5.5,'#9fdae0','left');

  const cx=CANVAS_WIDTH-80;
  drawPanel(ctx,cx,4,76,28,'rgba(5,12,18,.52)','rgba(115,133,146,.24)','rgba(31,48,57,.38)');
  drawItemIcon(ctx,cx+4,5,'crumb',12);text(ctx,'MIGAJAS',cx+19,12,5.2,'#899f98','left');
  text(ctx,`${p.crumbs}`,cx+70,13,7.5,'#e8c99b','right',true);
  drawItemIcon(ctx,cx+4,18,'golden_crumb',11);text(ctx,'MONEDAS',cx+19,25,5.2,'#ac9a65','left');
  text(ctx,`${engine.totalGoldenCrumbs}`,cx+70,26,7.5,'#f4d03f','right',true);
  if(engine.gameMode==='endless'){
    text(ctx,'ATRACO SIN FIN',240,10,6.5,'#d3c999','center',true);
    text(ctx,`MISMA ARENA · ${endlessStage(Math.max(1,engine.endless.round))}`,240,19,5.4,'#829c98');
  } else {
    text(ctx,`PISO ${engine.map.floorIndex+1}/${TOTAL_FLOORS}`,240,10,6.2,'#d3c999','center',true);
    text(ctx,FLOOR_NAMES_ES[engine.map.floorIndex],240,19,5.7,'#829c98');
    drawMinimap(engine);
  }
  drawBossBar(engine);
  if(engine.alert>=5){
    ctx.fillStyle='rgba(5,12,18,.48)';ctx.fillRect(5,27,62,12);
    text(ctx,`ALERTA ${Math.round(engine.alert)}`,8,33,5.5,engine.alert>60?'#ff8f7f':'#d4b47c','left',true);
    ctx.fillStyle='rgba(255,255,255,.08)';ctx.fillRect(8,35,54,2);
    ctx.fillStyle=engine.alert>60?'#e45b4f':'#c78868';ctx.fillRect(8,35,54*engine.alert/100,2);
  }

  const slotW=92,slotH=25,baseX=5,baseY=CANVAS_HEIGHT-slotH-5;
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
    const x=CANVAS_WIDTH-86-5,y=CANVAS_HEIGHT-25-5,ready=p.activeItemCooldown<=0,flash=p.quackReadyFlash>0;
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
  text(ctx,engine.lastInput==='gamepad'?'B · ESQUIVE':'ESQUIVE',240,CANVAS_HEIGHT-5,5.3,dashReady?'#1abc9c':'#68717f','center',dashFlash);

  if(p.items.length){
    const n=Math.min(p.items.length,8);ctx.fillStyle='rgba(5,12,18,.38)';ctx.fillRect(5,CANVAS_HEIGHT-48,n*14+6,14);
    for(let i=0;i<n;i++)drawItemIcon(ctx,8+i*14,CANVAS_HEIGHT-47,p.items[i],12);
    if(p.items.length>8)text(ctx,`+${p.items.length-8}`,12+n*14,CANVAS_HEIGHT-38,6,'#f4d03f','left');
  }
  renderDangerEventHUD(engine);
  if(engine.gameMode==='endless'){
    const e=engine.endless;
    drawPanel(ctx,6,50,104,37,'rgba(4,9,14,.72)','rgba(137,109,48,.55)');
    text(ctx,`RONDA ${Math.max(1,e.round)}`,12,62,7,'#f4d03f','left',true);
    text(ctx,`ALERTA ${e.alert} · ${e.threatRank}`,12,73,5.2,'#b9c7be','left');
    const pw=88;ctx.fillStyle='rgba(255,255,255,.08)';ctx.fillRect(12,78,pw,4);
    ctx.fillStyle=e.pressure>=75?'#e55f55':e.pressure>=50?'#e6a04e':'#78b99a';ctx.fillRect(12,78,pw*clamp(e.pressure/100,0,1),4);
    const pressureState=e.pressure>=75?'CRÍTICO':e.pressure>=50?'PELIGRO':e.pressure>=25?'ALERTA':'CONTROL';
    text(ctx,`PRESIÓN ${Math.round(e.pressure)}% · ${pressureState}`,104,86,4.4,e.pressure>=75?'#ef8278':'#8fa1a8','right',e.pressure>=75);
    if(e.compositionLabel&&e.roundActive&&e.roundKind!=='boss'&&e.roundKind!=='subboss'&&e.roundKind!=='miniboss')text(ctx,e.compositionLabel,12,96,4.8,'#8ea9a2','left',true);
    if(e.milestone)text(ctx,e.milestone,240,31,6.4,e.round>=100?'#ff6c66':'#f4d03f','center',true);
  }
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
  const w=isFloorBoss?CANVAS_WIDTH-108:isSubBoss?300:220;
  const x=(CANVAS_WIDTH-w)/2,y=isFloorBoss?74:isSubBoss?73:72;
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
  const ox = CANVAS_WIDTH - w - 6, oy = 50;

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
  { label: T.menuStart }, { label: 'ATRACO SIN FIN' }, { label: T.menuUpgrades }, { label: T.menuWardrobe },
  { label: 'COLECCIÓN' }, { label: T.menuHowTo }, { label: T.menuSettings },
];

function drawDifficultySkull(ctx:CanvasRenderingContext2D,x:number,y:number,color:string) {
  ctx.save();ctx.fillStyle=color;ctx.fillRect(x+1,y,6,1);ctx.fillRect(x,y+1,8,4);ctx.fillRect(x+2,y+5,4,2);
  ctx.fillStyle='#10151c';ctx.fillRect(x+1,y+2,2,2);ctx.fillRect(x+5,y+2,2,2);ctx.fillRect(x+3,y+4,2,1);ctx.fillRect(x+3,y+6,1,1);ctx.fillRect(x+5,y+6,1,1);ctx.restore();
}

function drawDifficultyLock(ctx:CanvasRenderingContext2D,x:number,y:number,color:string) {
  ctx.save();ctx.fillStyle=color;ctx.fillRect(x+1,y+4,9,7);ctx.fillRect(x+3,y+1,5,1);ctx.fillRect(x+2,y+2,2,3);ctx.fillRect(x+7,y+2,2,3);
  ctx.fillStyle='#11151c';ctx.fillRect(x+5,y+6,1,3);ctx.restore();
}

function renderDifficultyUI(engine:GameEngine) {
  const ctx=engine.ui!;
  const left=58,width=364,top=72,rowH=51,gap=5;
  drawPanel(ctx,30,22,420,306,'rgba(7,11,18,.94)','rgba(77,92,106,.72)');
  titleText(ctx,engine.pendingMode==='endless'?'DIFICULTAD · ATRACO SIN FIN':'ELIGE LA DIFICULTAD DEL ATRACO',240,46,14,'#f4d03f');
  text(ctx,engine.pendingMode==='endless'?'Misma base; la presión aumenta sin límite.':'Puedes cambiarla al comenzar cada nueva partida.',240,60,5.8,'#7f919a','center');
  DIFFICULTY_MODES.forEach((mode,i)=>{
    const def=DIFFICULTIES[mode],y=top+i*(rowH+gap),selected=engine.difficultyIndex===i,locked=mode==='mad'&&!engine.madUnlocked;
    const color=locked?'#9a6570':mode==='easy'?'#91d49b':mode==='normal'?'#f4d03f':mode==='hard'?'#f29a55':'#ff665e';
    const fill=mode==='easy'?'rgba(25,61,37,.95)':mode==='normal'?'rgba(62,51,18,.95)':mode==='hard'?'rgba(69,38,19,.95)':'rgba(69,22,28,.95)';
    ctx.save();if(selected){ctx.shadowColor=color;ctx.shadowBlur=9;}drawPanel(ctx,left,y,width,rowH,selected?fill:'rgba(10,16,23,.82)',selected?color:'rgba(71,84,97,.5)');ctx.restore();
    const tx=left+18+(locked?16:0);if(locked)drawDifficultyLock(ctx,left+17,y+10,color);
    titleText(ctx,def.label,tx,y+19,9,color,'left');
    const skullX=tx+Math.min(126,def.label.length*5.8+8);for(let n=0;n<i+1;n++)drawDifficultySkull(ctx,skullX+n*11,y+11,color);
    wrappedText(ctx,locked?'Completa un atraco para desbloquearlo.':def.desc,left+18,y+31,width-36,5.5,6.4,2,locked?'#8a6870':'#8fa0aa');
    if(selected){text(ctx,'›',left-10,y+29,13,color);text(ctx,'‹',left+width+10,y+29,13,color);}
  });
  text(ctx,engine.lastInput==='gamepad'?'CRUCETA · ELEGIR     A · CONFIRMAR     B · VOLVER':'W / S · ELEGIR     ENTER · CONFIRMAR     ESC · VOLVER',240,316,5.6,'#71858b','center');
}

function renderMenuUI(engine: GameEngine) {
  const ctx = engine.ui!;
  text(ctx,'v0.7.0',8,10,5.5,'#e8d79a','left',true);
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
  if(engine.menuIndex===1){
    const rec=engine.endlessRecords[engine.difficulty];
    const saved=engine.endlessCheckpointRound>0?` · GUARDADO R${engine.endlessCheckpointRound}`:'';
    text(ctx,`RÉCORD ${DIFFICULTIES[engine.difficulty].label} · RONDA ${rec.round}${saved}`,240,316,5.6,'#aebd9e','center',true);
  }
  text(ctx,T.tagline,240,326,9,'#dbbd77','center',true);
  text(ctx,engine.lastInput==='gamepad'?'CRUCETA · ELEGIR     A · CONFIRMAR':'W / S · ELEGIR     ENTER · CONFIRMAR',30,348,6,'#738b89','left');
  drawItemIcon(ctx,368,337,'golden_crumb',13);text(ctx,`${engine.totalGoldenCrumbs} MONEDAS`,389,348,6,'#ac9f75','left');
}

function renderHowToPlayUI(engine: GameEngine) {
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

function renderSettingsUI(engine: GameEngine) {
  const ctx = engine.ui!;
  drawPanel(ctx, 50, 26, CANVAS_WIDTH - 100, CANVAS_HEIGHT - 56);
  titleText(ctx, T.settingsTitle, CANVAS_WIDTH / 2, 54, 18, '#f4d03f');

  SETTING_ROWS.forEach((row, i) => {
    const y = SETTINGS.y + i * (SETTINGS.h+SETTINGS.gap);
    const on = i === engine.settingsIndex;
    ctx.fillStyle = on ? 'rgba(244,208,63,0.14)' : 'rgba(255,255,255,0.03)';
    ctx.fillRect(SETTINGS.x,y,SETTINGS.w,SETTINGS.h);
    text(ctx,row.label,SETTINGS.x+10,y+13,8,on?'#fff6c9':'#a9b3c4','left',on);
    const v = settingValue(engine, i);
    if (row.kind === 'vol' || row.kind === 'shake' || row.kind === 'scale' || row.kind==='brightness') {
      const max = row.kind === 'vol' ? 1 : row.kind === 'shake' ? 2 : row.kind==='brightness'?1.4:3;
      drawBar(ctx,320,y+6,60,v/max,on?'#f4d03f':'#5c6472');
      text(ctx,row.kind==='vol'?`${Math.round(v*100)}%`:`${v}`,405,y+13,8,on?'#fff6c9':'#8792a5','right');
    } else {
      text(ctx,row.kind==='action'?'REPRODUCIR':v>.5?T.on:T.off,405,y+13,8,v>.5?'#39d353':'#b5c2b7','right',true);
    }
  });

  text(ctx,engine.lastInput==='gamepad'?'CRUCETA · AJUSTAR     A · PROBAR     B · VOLVER':'FLECHAS · AJUSTAR     ENTER · PROBAR     ESC · VOLVER',240,321,7,'#91aaa6');
}

function renderWardrobeUI(engine: GameEngine) {
  const ctx = engine.ui!;
  drawPanel(ctx, 14, 12, CANVAS_WIDTH - 28, CANVAS_HEIGHT - 24);
  titleText(ctx, T.wardrobeTitle, CANVAS_WIDTH / 2, 34, 18, '#f4d03f');
  text(ctx,`ASPECTOS ${engine.unlockedSkins.length} / ${SKINS.length}`,450,33,6,'#96b1aa','right');

  // Monedas doradas permanentes
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

function renderUpgradesUI(engine: GameEngine) {
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

function renderPausedUI(engine: GameEngine) {
  const ctx = engine.ui!;
  ctx.fillStyle = 'rgba(4,6,14,0.8)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  drawPanel(ctx, 42, 18, CANVAS_WIDTH - 84, CANVAS_HEIGHT - 36);
  titleText(ctx, T.paused, CANVAS_WIDTH / 2, 48, 24, '#f4d03f');
  ctx.fillStyle = '#8a2c2c';
  ctx.fillRect(CANVAS_WIDTH / 2 - 60, 55, 120, 2);

  const items = [
    { label: T.resume }, {label:engine.gameMode==='endless'?'ARENA ÚNICA':'MAPA'}, { label: T.restartRun }, { label: T.menuHowTo },
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
  text(ctx,'DIFICULTAD',240,282,5.2,'#697882','center');
  text(ctx,difficultyLabel(engine),240,292,6.2,'#d9bd70','center',true);
  text(ctx,engine.gameMode==='endless'?`RONDA ${engine.endless.round} · ALERTA ${engine.endless.alert}`:`SEMILLA · ${engine.run.seed}`,240,300,9,'#d4bb7b','center',true);
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

function renderEndlessResumeUI(engine:GameEngine) {
  const ctx=engine.ui!,diff=engine.endlessCheckpointDifficulty?DIFFICULTIES[engine.endlessCheckpointDifficulty].label:'';
  ctx.fillStyle='rgba(3,7,12,.9)';ctx.fillRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT);
  drawPanel(ctx,56,52,368,238,'rgba(7,13,19,.98)','#8d6f23');
  titleText(ctx,'ATRACO SIN FIN',240,84,18,'#f4d03f');
  text(ctx,`PARTIDA GUARDADA · RONDA ${engine.endlessCheckpointRound}`,240,108,8,'#e7d79e','center',true);
  text(ctx,diff,240,124,6,'#899da2','center');
  const buttons=[{label:'CONTINUAR ATRACO'},{label:'NUEVO ATRACO'}];
  drawButtons(ctx,buttons,engine.endlessResumeIndex,240,154,engine.frame,238,30,10);
  text(ctx,'El guardado se actualiza entre rondas.',240,250,6,'#829294','center');
  text(ctx,'ESC · VOLVER',240,271,6.5,'#a58d61','center',true);
}

function renderEndlessRewardUI(engine:GameEngine) {
  const ctx=engine.ui!,e=engine.endless;
  ctx.fillStyle='rgba(3,7,12,.82)';ctx.fillRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT);
  drawPanel(ctx,24,24,432,300,'rgba(7,13,19,.97)','#8d6f23');
  titleText(ctx,'ATRACO SIN FIN',240,50,16,'#f4d03f');
  text(ctx,`RONDA ${Math.max(1,e.round)} · ALERTA ${e.alert}`,240,69,8,'#e9dfbd','center',true);
  text(ctx,endlessStage(Math.max(1,e.round)),240,84,6.5,'#8fa7a8','center');
  if(e.marketOpen){
    text(ctx,'MERCADO DE RESPIRO · UNA COMPRA',240,103,8,'#d7c789','center',true);
    const opts=endlessMarketOptions(engine);
    opts.forEach((opt,i)=>{
      const x=ENDLESS_REWARD_LAYOUT.startX+i*(ENDLESS_REWARD_LAYOUT.w+ENDLESS_REWARD_LAYOUT.gap),y=ENDLESS_REWARD_LAYOUT.y,on=i===e.marketIndex;
      drawPanel(ctx,x,y,ENDLESS_REWARD_LAYOUT.w,ENDLESS_REWARD_LAYOUT.h,on?'rgba(57,48,22,.96)':'rgba(15,23,30,.96)',on?'#f4d03f':'#45515a');
      text(ctx,`${opt.cost} MIGAS`,x+ENDLESS_REWARD_LAYOUT.w/2,y+18,5.5,on?'#f4d03f':'#9c916d','center',true);
      wrappedText(ctx,opt.label,x+10,y+40,ENDLESS_REWARD_LAYOUT.w-20,7.2,9,2,on?'#fff2b3':'#dce5dc',true);
      wrappedText(ctx,opt.description,x+10,y+70,ENDLESS_REWARD_LAYOUT.w-20,5.4,6.7,3,'#9babad');
      if(on){text(ctx,'›',x-7,y+59,12,'#f4d03f');text(ctx,'‹',x+ENDLESS_REWARD_LAYOUT.w+7,y+59,12,'#f4d03f');}
    });
    text(ctx,`MIGAJAS DISPONIBLES · ${Math.floor(engine.player.crumbs)}`,240,252,6.5,'#e7cf82','center',true);
    text(ctx,'A / D · ELEGIR    ENTER · COMPRAR',240,270,6,'#a3b5b4','center');
    text(ctx,'R · GUARDAR MIGAJAS Y SEGUIR',240,286,5.8,'#c9a96b','center',true);
  } else if(e.awaitingReward&&e.rewardOptions.length){
    text(ctx,'ELIGE UNA RECOMPENSA',240,103,8,'#d7c789','center',true);
    e.rewardOptions.forEach((opt,i)=>{
      const x=ENDLESS_REWARD_LAYOUT.startX+i*(ENDLESS_REWARD_LAYOUT.w+ENDLESS_REWARD_LAYOUT.gap),y=ENDLESS_REWARD_LAYOUT.y,on=i===e.rewardIndex;
      drawPanel(ctx,x,y,ENDLESS_REWARD_LAYOUT.w,ENDLESS_REWARD_LAYOUT.h,on?'rgba(69,54,20,.95)':'rgba(15,23,30,.96)',on?'#f4d03f':'#45515a');
      text(ctx,opt.kind==='weapon'?'ARMA':opt.kind==='item'?'OBJETO':opt.kind==='heal'?'CURACIÓN':'BOTÍN',x+ENDLESS_REWARD_LAYOUT.w/2,y+17,5.5,on?'#f4d03f':'#81949a','center',true);
      wrappedText(ctx,opt.label,x+10,y+37,ENDLESS_REWARD_LAYOUT.w-20,7.5,9,2,on?'#fff2b3':'#dce5dc',true);
      wrappedText(ctx,opt.description,x+10,y+65,ENDLESS_REWARD_LAYOUT.w-20,5.5,6.7,4,'#9babad');
      if(on){text(ctx,'›',x-7,y+59,12,'#f4d03f');text(ctx,'‹',x+ENDLESS_REWARD_LAYOUT.w+7,y+59,12,'#f4d03f');}
    });
    text(ctx,'A / D · ELEGIR    ENTER · TOMAR',240,255,6.2,'#a3b5b4','center');
    text(ctx,'R · RECICLAR TODO',240,276,6.2,'#c9a96b','center',true);
  } else {
    // Flujo automático: este caso se resuelve arriba como aviso breve.
  }
  text(ctx,`PRESIÓN ${Math.round(e.pressure)}% · ${e.threatRank}`,240,303,5.8,'#7f919a','center');
}

function renderGameOverUI(engine: GameEngine) {
  if(engine.gameMode==='endless'){
    const ctx=engine.ui!,e=engine.endless,rec=engine.endlessRecords[engine.difficulty];
    ctx.fillStyle='rgba(8,6,12,.94)';ctx.fillRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT);
    drawPanel(ctx,42,30,396,294,'rgba(10,14,21,.97)','#9a3f46');
    titleText(ctx,'ATRACO TERMINADO',240,59,20,'#ff6258');
    text(ctx,`RONDA ${e.round} · ALERTA ${e.alert}`,240,83,10,'#f0d27d','center',true);
    text(ctx,endlessStage(Math.max(1,e.round)),240,99,6.5,'#8fa1a8','center');
    const rows:[string,string][]=[
      ['RÉCORD',`RONDA ${rec.round}`],['PUNTUACIÓN',Math.round(e.score).toString()],
      ['ENEMIGOS',engine.stats.enemiesDefeated.toString()],['JEFES',engine.run.bosses.toString()],
      ['RONDAS PERFECTAS',e.perfectRounds.toString()],['MEJOR RACHA',e.maxPerfectStreak.toString()],
      ['DAÑO HECHO',Math.round(engine.run.dmgDealt).toString()],['DAÑO RECIBIDO',(Math.round(engine.run.dmgTaken*10)/10).toString()],
      ['PROYECTILES',Math.round(e.damageBySource.projectile).toString()],['CONTACTO',Math.round(e.damageBySource.contact).toString()],
    ];
    rows.forEach(([k,v],i)=>{const y=120+i*14;text(ctx,k,74,y,7,'#8792a5','left');text(ctx,v,406,y,8,'#fff6c9','right',true);});
    text(ctx,`MAYOR AMENAZA: ${e.damageBySource.projectile>=e.damageBySource.contact?'PROYECTILES':'CONTACTO'}`,240,268,6.5,'#d49991','center',true);
    drawButtons(ctx,[{label:'OTRO INTENTO  [ENTER]'},{label:'MENÚ  [ESC]'}],engine.pauseIndex,240,286,engine.frame,200,22,4);
    return;
  }
  const ctx = engine.ui!;
  const f = engine.frame;
  ctx.fillStyle = 'rgba(8,6,12,0.9)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.fillStyle = 'rgba(43,74,139,0.22)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, 30);
  ctx.fillStyle = (f % 60) < 30 ? '#4f7ad4' : '#8a2c2c';
  ctx.fillRect(0, 30, CANVAS_WIDTH, 2);

  drawPanel(ctx, 40, 40, CANVAS_WIDTH - 80, CANVAS_HEIGHT - 66);
  titleText(ctx, T.gameOver, CANVAS_WIDTH / 2, 74, 24, '#ff5b4f');

  ctx.save();
  ctx.translate(CANVAS_WIDTH / 2 - 24, 84);
  ctx.scale(1.5, 1.5);
  drawDuckSkin(ctx,0,Math.sin(f*.05)*1.5,f,engine.equippedSkin,'down',false,false,false,false,true);
  ctx.restore();

  const r = engine.run, s = engine.stats;
  text(ctx,engine.newRecord?'NUEVO RÉCORD':`MEJOR PARTIDA: PISO ${engine.bestFloor}/6`,240,121,8,'#e3bd6b','center',true);
  const lines: [string, string][] = [
    [T.statFloor, `${r.floorReached}/6`],
    [T.statRooms, `${s.roomsCleared}`],
    [T.statEnemies, `${s.enemiesDefeated}`],
    [T.statBosses, `${r.bosses}`],
    [T.statItems, `${r.items}`],
    [T.statWeapons, `${r.weaponsFound}`],
    [T.statDealt, `${Math.round(r.dmgDealt)}`],
    [T.statTaken, `${Math.round(r.dmgTaken*10)/10}`],
    [T.statBread, `${s.breadStolen}`],
    [T.statGolden, `${s.goldenCrumbs}`],
    [T.statTime, fmtTime(r.time)],
  ];
  lines.forEach(([k, v], i) => {
    const y = 132 + i * 13;
    text(ctx, k, 66, y, 10, '#8792a5', 'left', false);
    text(ctx, v, CANVAS_WIDTH - 66, y, 11, '#fff6c9', 'right', true);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(66, y + 3, CANVAS_WIDTH - 132, 1);
  });
  const tally=Math.min(1,(engine.frame-engine.endFrame)/70);
  text(ctx,`+${Math.floor(r.goldenEarned*tally)} MONEDAS GUARDADAS · TOTAL ${engine.totalGoldenCrumbs}`,240,280,7,'#d9c280');

  drawButtons(ctx, [{ label: `${T.tryAgain}  [${engine.lastInput==='gamepad'?'A':'ENTER'}]` }, { label: `${T.backToMenu}  [${engine.lastInput==='gamepad'?'B':'ESC'}]` }],
    engine.pauseIndex, CANVAS_WIDTH / 2, CANVAS_HEIGHT - 62, f, 200, 22, 4);
}

function renderVictoryUI(engine: GameEngine) {
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
  const r = engine.run, s = engine.stats;
  text(ctx,'DIFICULTAD',70,130,5.5,'#8792a5','left');
  text(ctx,difficultyLabel(engine),CANVAS_WIDTH-70,130,6.5,'#e3bd6b','right',true);
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
