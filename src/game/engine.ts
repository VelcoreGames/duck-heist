// Motor lógico: DUCK HEIST · EL BANCO DEL PAN
import {
  TILE_SIZE, ROOM_WIDTH, ROOM_HEIGHT, CANVAS_WIDTH, CANVAS_HEIGHT,
  PLAYER_SPEED, DASH_SPEED, DASH_DURATION, DASH_COOLDOWN, RESTART_HOLD_FRAMES, HEIST_INTRO_FRAMES, HEIST_INTRO_SKIP_AFTER,
  GameState, RoomType, DIR_VECTORS, DOOR_TILE, OPPOSITE,
  TILE_WALL, TILE_DOOR, OBSTACLE_BASE, type Dir,
} from './constants';
import {
  WEAPONS, ITEMS, ACTIVE_ITEMS, ENEMIES, ENCOUNTERS, BOSSES, SUBBOSSES, MINIBOSSES,
  FLOOR_BOSS_POOL, FLOOR_SUBBOSS_POOL, FLOOR_MINIBOSS_POOL,
  META_UPGRADES, ELITE_OK, TOTAL_FLOORS, SKINS, SYNERGIES,
  type WeaponDef, type EnemyDef, type BossDef,
} from './data';
import { generateMap, key, freeTiles, type MapRoom } from './mapgen';
import {
  createEndlessMap, endlessRoundKind, endlessScale, endlessSpecial, endlessStage,
  endlessThreatRank, endlessComposition, endlessMilestone, endlessBossMutation, rewardRounds, specialLabel, endlessOverdrive, endlessHazardTiming,
} from './endless';
import { T } from './i18n';
import { getBuild, PASSIVE_RULES, ACTIVE_RULES, FOODS } from './itemRules';
import { emptyDiscoveries, normalizeProgress, permanentSnapshot, DEFAULT_SETTINGS } from './progress';
import { DEFAULT_BINDINGS } from './controls';
import { loadCareer, recordRun, refreshContracts } from './career';
import { seededRandom, gameRandom, setGameRandom, resetGameRandom } from './random';
import { dailyModifiers, dailyScore, ensureDailyProfile, finalizeDaily, loadDailyChallenge } from './dailyChallenge';
import type { CollectionCategory } from './catalog';
import { WARDROBE } from './layout';
import { EVENTS } from './events';
import { diverseRewards, pickPassive, fallbackActive } from './loot';
import { applyMapItemEffects } from './floorMap';
import { completeTutorial, updateTutorial } from './tutorial';
import { MODIFIER_LABELS } from './modifiers';
import { aimVector } from './aim';
import { throwBreadGrenade, updateGrenades } from './grenades';
import { notifyCloudSave } from '../cloud/cloudSaveEvents';
import type {
  GameEngine, Enemy, RoomContent, Projectile, DuckDir, EventKind, Pedestal, DifficultyMode, EndlessState, EndlessRewardOption, EndlessHazardKind,
} from './types';
import {
  playShoot, playHit, playPickup, playHurt, playExplosion, playDash,
  playDoorLock, playDoorUnlock, playUiMove, playUiSelect, playUiBack,
  playEquip, playWeaponSwap, playBossRoar, playBossPhase, playStairs, playDeny,
  playQuack, playQuackReady, playDashReady,
  playCoin,playHeal,playRarityPickup,playRoomClear,playCritical,playEnemyDeath,playBossWin,playReturn,playBounce,playFootstep,playDoorStyle,
  playDanger, playVaultIntroCue,
  setVolumes, setMusic, initAudio,
} from './audio';

// ---------------------------------------------------------------------------
// UTILIDADES
// ---------------------------------------------------------------------------
const random=gameRandom;
const rng = (min: number, max: number) => random() * (max - min) + min;
const rngInt = (min: number, max: number) => Math.floor(random() * (max - min + 1)) + min;
const pick = <T,>(a: T[]): T => a[Math.floor(random() * a.length)];
const dist = (x1: number, y1: number, x2: number, y2: number) => Math.hypot(x2 - x1, y2 - y1);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const bound=(engine:GameEngine,action:keyof GameEngine['bindings'])=>!!engine.keys[engine.bindings[action]];
const clearBound=(engine:GameEngine,action:keyof GameEngine['bindings'])=>{engine.keys[engine.bindings[action]]=false;};
const isPolice=(e:Enemy)=>e.type.startsWith('policia')||e.type==='dron_policial'||e.type==='ganso_k9'||e.type==='security_camera';
function scaledCurrency(value:number,multiplier:number) {
  const amount=value*multiplier;return Math.floor(amount)+(random()<amount%1?1:0);
}

let nextEnemyId = 0;

function emptyEndlessState():EndlessState {
  return {
    round:0,alert:0,pressure:0,score:0,roundKind:'combat',special:null,
    pendingEnemies:[],spawnCooldown:0,roundActive:false,roundDamaged:false,
    perfectRounds:0,perfectStreak:0,maxPerfectStreak:0,rewardOptions:[],rewardIndex:0,
    awaitingReward:true,bossBag:[],subbossBag:[],minibossBag:[],enemiesThisRound:0,killedThisRound:0,
    threatRank:'NORMAL',damageBySource:{contact:0,projectile:0},lastHitSource:null,
    marketOpen:false,marketIndex:0,marketDoneRound:0,nextRewardBoost:0,nextRoundTimer:0,
    compositionLabel:'',hazardKind:null,hazardWarning:0,hazardCooldown:0,milestone:null,
  };
}
function queueNextEndlessRound(engine:GameEngine,frames=42) {
  const e=engine.endless;
  if(e.awaitingReward||e.marketOpen)return;
  e.nextRoundTimer=Math.max(1,frames);
  engine.state=GameState.PLAYING;
  engine.roomLabelTimer=0;
  engine.toast=e.round===0?'ATRACO SIN FIN · RONDA 1':`RONDA ${e.round} LISTA · SIGUE ${e.round+1}`;
  engine.toastTimer=Math.min(36,e.nextRoundTimer);
  saveEndlessCheckpoint(engine);
  engine.onStateChange?.(engine.state);
}

function emptyEndlessRecords() {
  return {
    easy:{round:0,score:0,alert:0},normal:{round:0,score:0,alert:0},
    hard:{round:0,score:0,alert:0},mad:{round:0,score:0,alert:0},
  };
}

export type DifficultyDef = {
  label:string; desc:string; hp:number; dmg:number; speed:number; fire:number;
  count:number; elite:number; startHearts:number; floorHeal:number;
};

export const DIFFICULTY_MODES:DifficultyMode[] = ['easy','normal','hard','mad'];
export const DIFFICULTIES:Record<DifficultyMode,DifficultyDef> = {
  easy:{label:'FÁCIL',desc:'Más margen para aprender. Enemigos más lentos y menos agresivos.',hp:.82,dmg:.75,speed:.92,fire:1.18,count:.92,elite:.55,startHearts:1,floorHeal:2},
  normal:{label:'NORMAL',desc:'La experiencia actual de Duck Heist. Equilibrada y recomendada.',hp:1,dmg:1,speed:1,fire:1,count:1,elite:1,startHearts:0,floorHeal:1},
  hard:{label:'DIFÍCIL',desc:'Más presión, enemigos más resistentes y ataques más frecuentes.',hp:1.15,dmg:1.18,speed:1.06,fire:.88,count:1.1,elite:1.35,startHearts:0,floorHeal:.5},
  mad:{label:'LOCO POR EL PAN',desc:'El banco va a por ti. Máxima presión, más élites y casi sin respiro.',hp:1.28,dmg:1.38,speed:1.12,fire:.74,count:1.22,elite:1.75,startHearts:0,floorHeal:.5},
};
let activeDifficulty:DifficultyMode = 'normal';
let activeDailyModifiers:import('./types').DailyModifier[]=[];

export function getDifficulty(engine:GameEngine) { return DIFFICULTIES[engine.difficulty]; }
export function difficultyLabel(engine:GameEngine) { return getDifficulty(engine).label; }
export function selectDifficulty(engine:GameEngine,index:number) {
  const i=Math.max(0,Math.min(DIFFICULTY_MODES.length-1,index));
  const mode=DIFFICULTY_MODES[i];
  engine.difficultyIndex=i;
  if(mode==='mad'&&!engine.madUnlocked) { playDeny(); return false; }
  engine.difficulty=mode;activeDifficulty=mode;return true;
}

export interface DiffScale {
  hp: number; dmg: number; speed: number; fire: number;
  count: number; eliteChance: number; pattern: number;
}

/** Multiplicadores según piso, profundidad y dificultad elegida. */
export function floorScale(floorIndex: number, roomDistance = 0): DiffScale {
  const f=floorIndex;
  const depth=Math.min(roomDistance,8)*.06;
  const mode=DIFFICULTIES[activeDifficulty];
  const hp=1+f*.11+depth*.5;
  const dmg=1+f*.09;
  const speed=1+f*.05;
  const fire=Math.max(.55,1-f*.07);
  const count=1+f*.22+depth;
  const elite=f<=1?(f===1?.1:0):Math.min(.42,.14+f*.09+depth*.5);
  const security=activeDailyModifiers.includes('SECURITY_SURGE');
  const speedCheck=activeDailyModifiers.includes('SPEED_CHECK');
  const eliteAudit=activeDailyModifiers.includes('ELITE_AUDIT');
  return {
    hp:hp*mode.hp*(security?1.18:1),dmg:dmg*mode.dmg*(security?1.12:1),speed:speed*mode.speed*(speedCheck?1.06:1),
    fire:Math.max(.42,Math.min(1.28,fire*mode.fire*(speedCheck?.86:1))),count:count*mode.count,
    eliteChance:elite===0?(eliteAudit?.16:0):Math.min(.78,elite*mode.elite+(eliteAudit?.16:0)),pattern:f,
  };
}

export function activeWeapon(p: GameEngine['player']): WeaponDef {
  return p.weapons[p.activeWeapon] ?? p.weapons[0] ?? WEAPONS.quack_blaster;
}

// ---------------------------------------------------------------------------
// ENEMIGOS
// ---------------------------------------------------------------------------
function makeEnemy(typeKey: string, sc: DiffScale, tx: number, ty: number, elite: boolean): Enemy {
  const def: EnemyDef = ENEMIES[typeKey];
  const hp = Math.round(def.hp * sc.hp * (elite ? 1.65 : 1));
  return {
    id: nextEnemyId++, type: typeKey,
    x: tx * TILE_SIZE + (TILE_SIZE - def.size) / 2,
    y: ty * TILE_SIZE + (TILE_SIZE - def.size) / 2,
    vx: 0, vy: 0,
    hp, maxHp: hp,
    speed: def.speed * sc.speed * (elite ? 1.08 : 1),
    damage: def.damage * sc.dmg, size: def.size + (elite ? 2 : 0),
    score: def.score * (elite ? 2 : 1),
    behavior: def.behavior, flying: !!def.flying,
    fireRate: Math.max(24, Math.round(def.fireRate * sc.fire * (elite ? 0.72 : 1))),
    fireCooldown: rngInt(def.behavior==='sniper'?110:30, Math.max(def.behavior==='sniper'?150:45, def.fireRate)),
    projectileType: def.projectileType,
    hurtTimer: 0, moveAngle: rng(0, Math.PI * 2), moveTimer: rngInt(30, 90),
    telegraph: 0, chargeTimer: 0, burst: 0, burstDelay: 0,
    slowTimer: 0, burn: 0, elite,
    isBoss: false, bossType: '', bossPhase: 0,
    attackTimer: 0, attackCooldown: 60, spawnAnim: 18,
    dmgMul: sc.dmg * (elite ? 1.5 : 1),
    shieldAngle: 0, recover: 0,
    hitboxW:def.hitboxW,hitboxH:def.hitboxH,
    visualScaleX:def.scaleX,visualScaleY:def.scaleY,
    stationaryBoss:!!def.stationary,
  };
}
type floorIndexScale = { hp: number; dmg: number; speed: number; fire: number; pattern: number };

function makeBossEnemy(def: BossDef, bossType: string, tier: 'mini'|'sub'|'boss', sc: floorIndexScale): Enemy {
  const hpMult = tier === 'boss' ? 2.65 : tier === 'sub' ? 1.9 : 1.35;
  const hp = Math.round(def.hp * hpMult * (1 + (sc.hp - 1) * 0.78));
  const tierSpeed = tier === 'boss' ? 1.04 : tier === 'sub' ? 1.08 : 1.12;
  const tierDamage = tier === 'boss' ? 1.2 : tier === 'sub' ? 1.1 : 1;
  const legacyMoney = bossType === 'tax_collector' || bossType === 'el_auditor' || bossType === 'cajero_3000' || bossType === 'bread_banker';
  const legacyTech = bossType === 'dron_centinela' || bossType === 'director_seguridad' || bossType === 'cajero_3000';
  return {
    id: nextEnemyId++, type: bossType,
    x: CANVAS_WIDTH / 2 - def.size / 2, y: CANVAS_HEIGHT * 0.28,
    vx: 0, vy: 0, hp, maxHp: hp,
    speed: def.speed * sc.speed * tierSpeed, damage: tierDamage, size: def.size, score: tier === 'boss' ? 180 : tier === 'sub' ? 100 : 60,
    behavior: 'chaser', flying: def.family === 'tech',
    fireRate: Math.round((tier === 'boss' ? 52 : tier === 'sub' ? 58 : 64) * sc.fire), fireCooldown: 45,
    projectileType: def.pattern?.projectile ?? (legacyMoney ? 'coin_proj' : legacyTech ? 'drone_shot' : (bossType.includes('panadero') || bossType === 'don_levadura' ? 'dough_ball' : 'enemy_bullet')),
    hurtTimer: 0, moveAngle: 0, moveTimer: 0,
    telegraph: 0, chargeTimer: 0, burst: 0, burstDelay: 0, slowTimer: 0, burn: 0, elite: false,
    isBoss: true, bossType, bossPhase: 0,
    attackTimer: tier === 'boss' ? 72 : tier === 'sub' ? 64 : 54,
    attackCooldown: (tier === 'boss' ? 82 : tier === 'sub' ? 72 : 64) * sc.fire,
    spawnAnim: tier === 'boss' ? 42 : tier === 'sub' ? 34 : 26,
    dmgMul: sc.dmg * tierDamage,
    shieldAngle: 0, recover: 0,
  };
}

// ---------------------------------------------------------------------------
// CONTENIDO DE SALA (persistente durante la run)
// ---------------------------------------------------------------------------
function buildRoomContent(engine: GameEngine, room: MapRoom): RoomContent {
  const content: RoomContent = {
    enemies: [], pickups: [], items: [], puddles: [], airStrikes: [],
    doorAnim: {}, lockFlash: 0, combatTimer: 0, ambient: random() * 100,
    magnet: 0,
  };
  for (const d of room.doors) content.doorAnim[d] = 1;

  const sc = floorScale(engine.map.floorIndex, room.distance);
  const b=getBuild(engine.player);
  sc.eliteChance=Math.min(.48,sc.eliteChance+b.eliteChance+(engine.map.floorIndex>0?engine.alert*.001:0));
  if(room.modifier==='openVault') sc.eliteChance=Math.min(.55,sc.eliteChance+.15);
  const spots = freeTiles(room.layout, 2);

  switch (room.type) {
    case RoomType.COMBAT:
    case RoomType.CHALLENGE: {
      const pool = ENCOUNTERS.filter(e => e.minFloor <= engine.map.floorIndex);
      let list = [...pick(pool).enemies];
      if (room.type === RoomType.CHALLENGE) list = [...list, ...pick(pool).enemies].slice(0, 9);
      // más enemigos cuanto más profundo
      const extra = Math.floor((sc.count - 1) * 2.2);
      for (let i = 0; i < extra && list.length < 9; i++) list.push(pick(list));
      if((b.extraEnemy || room.modifier==='alarm')&&list.length<10) list.push('policia_pato');
      if(engine.map.floorIndex>=2&&engine.alert>30&&random()<.4) list.push(pick(['policia_francotirador','policia_medico','policia_capitan','ganso_k9']));
      if(room.modifier==='cameras') {list.push('security_camera');content.securityTimer=540;}
      for (const t of list) {
        const spot = spots.pop();
        if (!spot) break;
        const canElite = !!ELITE_OK[t] && engine.map.floorIndex >= 1;
        content.enemies.push(makeEnemy(t, sc, spot.x, spot.y, canElite && random() < sc.eliteChance));
      }
      if(room.type===RoomType.CHALLENGE) {content.challenge=random()<.5?'flawless':'alarm';if(content.challenge==='alarm') content.alarmTimer=1800;}
      break;
    }
    case RoomType.MINIBOSS: {
      const pool = (FLOOR_MINIBOSS_POOL[engine.map.floorIndex] ?? Object.keys(MINIBOSSES)).filter(id => MINIBOSSES[id]);
      const k = pick(pool.length ? pool : Object.keys(MINIBOSSES));
      content.enemies.push(makeBossEnemy(MINIBOSSES[k], k, 'mini', sc));
      const supportCount = engine.map.floorIndex >= 3 ? 1 : 0;
      for (let i = 0; i < supportCount; i++) {
        const spot = spots.pop();
        if (spot) content.enemies.push(makeEnemy(pick(['policia_pato', 'policia_rapido']), sc, spot.x, spot.y, false));
      }
      break;
    }
    case RoomType.SUBBOSS: {
      const pool = (FLOOR_SUBBOSS_POOL[engine.map.floorIndex] ?? Object.keys(SUBBOSSES)).filter(id => SUBBOSSES[id]);
      const k = pick(pool.length ? pool : Object.keys(SUBBOSSES));
      content.enemies.push(makeBossEnemy(SUBBOSSES[k], k, 'sub', sc));
      break;
    }
    case RoomType.BOSS: {
      const pool = (FLOOR_BOSS_POOL[engine.map.floorIndex] ?? ['bread_banker']).filter(id => BOSSES[id]);
      const k = pool[Math.floor(((engine.run.seed.charCodeAt(engine.map.floorIndex % engine.run.seed.length) * 17 + engine.map.floorIndex * 31) % 997) / 997 * pool.length)] ?? pool[0];
      content.enemies.push(makeBossEnemy(BOSSES[k], k, 'boss', sc));
      break;
    }
    case RoomType.ITEM: {
      content.pedestal = {
        x: CANVAS_WIDTH / 2 - 12, y: CANVAS_HEIGHT / 2 - 14,
        itemId: rollItem(engine), isWeapon: false, taken: false,
      };
      break;
    }
    case RoomType.TREASURE: {
      content.chest = { x: CANVAS_WIDTH / 2 - 10, y: CANVAS_HEIGHT / 2 - 8, opened: false };
      break;
    }
    case RoomType.SECRET: {
      content.chest = { x: CANVAS_WIDTH / 2 - 10, y: CANVAS_HEIGHT / 2 - 8, opened: false };
      content.pedestal = {
        x: CANVAS_WIDTH / 2 - 12, y: CANVAS_HEIGHT / 2 - 60,
        itemId: rollWeapon(engine), isWeapon: true, taken: false,
      };
      for (let i = 0; i < 10; i++) {
        content.pickups.push({
          x: rng(TILE_SIZE * 3, CANVAS_WIDTH - TILE_SIZE * 3),
          y: rng(TILE_SIZE * 3, CANVAS_HEIGHT - TILE_SIZE * 3),
          type: random() < 0.3 ? 'golden_crumb' : 'crumb',
          value: rngInt(2, 5), lifetime: 99999,
        });
      }
      break;
    }
    case RoomType.SHOP: {
      const first=pickPassive(engine) ?? fallbackActive(engine);
      const second=pickPassive(engine,undefined,[first]) ?? fallbackActive(engine);
      const third=pickPassive(engine,undefined,[first,second]) ?? fallbackActive(engine);
      const itemPool=[first,second,third].filter(Boolean);
      content.shopItems=itemPool.map((id,i)=>({
        itemId:id,cost:(ITEMS[id] ?? ACTIVE_ITEMS[id]).cost,sold:false,isWeapon:false,
        x:CANVAS_WIDTH*(0.28+i*0.22),y:CANVAS_HEIGHT*0.58,
      }));
      break;
    }
    case RoomType.GUN_VAN: {
      const owned=new Set(engine.player.weapons.filter(Boolean).map(w=>w!.id));
      let pool=Object.keys(WEAPONS).filter(id=>id!=='quack_blaster'&&!owned.has(id));
      if(pool.length<3) pool=Object.keys(WEAPONS).filter(id=>id!=='quack_blaster');
      const selected:string[]=[];
      while(selected.length<3 && pool.length) {
        const index=Math.floor(random()*pool.length);
        selected.push(pool.splice(index,1)[0]);
      }
      const center=CANVAS_WIDTH/2;
      content.shopItems=selected.map((id,i)=>({
        itemId:id,cost:Math.max(8,WEAPONS[id].cost),sold:false,isWeapon:true,x:center+(i-1)*95,y:235,
      }));
      break;
    }
    case RoomType.EVENT: {
      if (random() < .38) {
        content.cafe = true;
        const foods = ['hp','croissant','sandwich','baguette','torta'];
        const selected = [...foods].sort(() => random() - .5).slice(0, 3);
        const foodCost = (id:string) => id === 'hp' ? 5 : id === 'croissant' ? 7 : (id === 'sandwich' || id === 'baguette') ? 9 : 14;
        const center=CANVAS_WIDTH/2;
        content.shopItems = selected.map((id, i) => ({
          itemId:id,cost:foodCost(id),sold:false,isWeapon:false,isFood:true,x:center+(i-1)*95,y:232,
        }));
      } else {
        const kind=pick(Object.keys(EVENTS)) as EventKind;
        content.event={kind,x:CANVAS_WIDTH/2-8,y:170,used:false,selected:0,message:''};
      }
      break;
    }
    case RoomType.CHOICE:
      content.choices=diverseRewards(engine).map((id,i,all)=>({x:CANVAS_WIDTH/2-12+(i-(all.length-1)/2)*84,y:165,itemId:id,isWeapon:false,taken:false}));
      if(!content.choices.length) content.choices=[{x:CANVAS_WIDTH/2-12,y:165,itemId:'pan_dorado',isWeapon:false,taken:false,isFood:true}];
      break;
    default: break;
  }
  return content;
}

export function rollItem(engine: GameEngine): string {
  if(random()<.16) return fallbackActive(engine);
  const b=getBuild(engine.player),special=currentRoom(engine).type!==RoomType.COMBAT;
  return pickPassive(engine,undefined,[],random()<.2+b.rarityLuck+(special?b.specialReward:0)) ?? fallbackActive(engine);
}

/** Arma aleatoria evitando duplicar las que ya llevas */
function rollWeapon(engine: GameEngine, biasRare = false): string {
  const owned = new Set(engine.player.weapons.filter(Boolean).map(w => w!.id));
  let pool = Object.keys(WEAPONS).filter(w => !owned.has(w) && w !== 'quack_blaster');
  if (!pool.length) pool = Object.keys(WEAPONS).filter(w => w !== 'quack_blaster');
  if (biasRare) {
    const rare = pool.filter(w => WEAPONS[w].rarity >= 2);
    if (rare.length && random() < 0.75) return pick(rare);
  }
  return pick(pool);
}

function getContent(engine: GameEngine, k = engine.currentKey): RoomContent {
  let c = engine.contents.get(k);
  if (!c) {
    const room = engine.map.rooms.get(k)!;
    c = buildRoomContent(engine, room);
    engine.contents.set(k, c);
    room.generated = true;
    if (c.enemies.length === 0) room.cleared = true;
  }
  return c;
}

const currentRoom = (engine: GameEngine): MapRoom => engine.map.rooms.get(engine.currentKey)!;

const EMPTY_CONTENT: RoomContent = {
  enemies: [], pickups: [], items: [], puddles: [], airStrikes: [], doorAnim: {},
  lockFlash: 0, combatTimer: 0, ambient: 0, magnet: 0,
};

/** Accesores usados por el renderizador */
export const currentRoomOf = (engine: GameEngine): MapRoom => currentRoom(engine);
export const getContentOf = (engine: GameEngine): RoomContent =>
  engine.contents.get(engine.currentKey) ?? EMPTY_CONTENT;

// ---------------------------------------------------------------------------
// COLISIONES
// ---------------------------------------------------------------------------
function applyDoorTiles(room: MapRoom) {
  for (const d of room.doors) {
    const t = DOOR_TILE[d];
    room.layout[t.y][t.x] = TILE_DOOR;
  }
}

function tileBlocked(room: MapRoom, tx: number, ty: number, flying = false): boolean {
  if (tx < 0 || ty < 0 || tx >= ROOM_WIDTH || ty >= ROOM_HEIGHT) return true;
  const t = room.layout[ty][tx];
  if (t === TILE_WALL) return true;
  if (t === TILE_DOOR) return !room.cleared;
  if (t >= OBSTACLE_BASE) return !flying;
  return false;
}

function boxBlocked(room: MapRoom, x: number, y: number, w: number, h: number, flying = false): boolean {
  const pts = [[x + 2, y + 2], [x + w - 2, y + 2], [x + 2, y + h - 2], [x + w - 2, y + h - 2], [x + w / 2, y + h - 1]];
  for (const [px, py] of pts) {
    if (tileBlocked(room, Math.floor(px / TILE_SIZE), Math.floor(py / TILE_SIZE), flying)) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// CREACIÓN DEL MOTOR
// ---------------------------------------------------------------------------
export function createEngine(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, ui: CanvasRenderingContext2D | null): GameEngine {
  ctx.imageSmoothingEnabled = false;

  let totalGolden = 0;
  let metaLevels: Record<string, number> = {};
  let settings = { ...DEFAULT_SETTINGS };
  let bindings = { ...DEFAULT_BINDINGS };
  const careerData=loadCareer();
  const dailyProfile=loadDailyChallenge();
  ensureDailyProfile(dailyProfile);
  let best = { breadStolen: 0, enemiesDefeated: 0, roomsCleared: 0, goldenCrumbs: 0, floorsCleared: 0 };
  let unlockedSkins: string[] = ['robber'];
  let equippedSkin = 'robber';
  let discovered=emptyDiscoveries();
  let bestFloor=0;
  let tutorial={started:false,map:false,mapShown:false,wheel:false,dash:false};
  let madUnlocked=false;
  let endlessRecords=emptyEndlessRecords();
  let endlessCheckpointRound=0;
  let endlessCheckpointDifficulty:DifficultyMode|null=null;
  let heistCheckpointFloor=0;
  let heistCheckpointDifficulty:DifficultyMode|null=null;
  try {
    const saved = localStorage.getItem('duckheist_save');
    if (saved) {
      const d = normalizeProgress(JSON.parse(saved));
      totalGolden = d.totalGoldenCrumbs ?? 0;
      metaLevels = d.metaLevels ?? {};
      settings = { ...settings, ...(d.settings ?? {}) };
      bindings = { ...bindings, ...(d.bindings ?? {}) };
      unlockedSkins = d.unlockedSkins ?? ['robber'];
      equippedSkin = d.equippedSkin ?? 'robber';
      discovered=d.discovered;bestFloor=d.bestFloor;
      tutorial=d.tutorial;
    }
    const b = localStorage.getItem('duckheist_best');
    if (b) best = { ...best, ...JSON.parse(b) };
    const er=localStorage.getItem('duckheist_endless_records');
    if(er) endlessRecords={...endlessRecords,...JSON.parse(er)};
    const cp=localStorage.getItem('duckheist_endless_checkpoint');
    if(cp){
      const parsed=JSON.parse(cp);
      if(parsed?.version===1 && parsed?.endless?.round>=1 && DIFFICULTY_MODES.includes(parsed.difficulty)){
        endlessCheckpointRound=parsed.endless.round;
        endlessCheckpointDifficulty=parsed.difficulty;
      }
    }
    const heistCp=localStorage.getItem('duckheist_heist_checkpoint');
    if(heistCp){
      const parsed=JSON.parse(heistCp);
      if(parsed?.version===1 && Number.isInteger(parsed?.floorIndex) && parsed.floorIndex>=0 && parsed.floorIndex<TOTAL_FLOORS && DIFFICULTY_MODES.includes(parsed.difficulty) && parsed?.player && parsed?.run){
        heistCheckpointFloor=parsed.floorIndex+1;
        heistCheckpointDifficulty=parsed.difficulty;
      }
    }
  } catch { /* sin almacenamiento */ }
  try { madUnlocked=localStorage.getItem('duckheist_mad_bread_unlocked')==='1'||unlockedSkins.includes('golden'); }
  catch { madUnlocked=unlockedSkins.includes('golden'); }

  careerData.career.bestFloor=Math.max(careerData.career.bestFloor,bestFloor);
  careerData.career.bestEndlessRound=Math.max(careerData.career.bestEndlessRound,...Object.values(endlessRecords).map(r=>r.round||0));
  for(const d of DIFFICULTY_MODES){
    const legacy=endlessRecords[d],rec=careerData.career.difficulty[d];
    rec.bestEndlessRound=Math.max(rec.bestEndlessRound,legacy.round||0);
    rec.bestEndlessScore=Math.max(rec.bestEndlessScore,legacy.score||0);
  }

  setVolumes(settings.master, settings.music, settings.sfx);

  return {
    canvas, ctx, ui, uiScale: 1,
    state: GameState.MENU, frame: 0,
    mapView:{returnState:GameState.PLAYING,selected:'0,0',frame:0,gpsTarget:null},
    lastInput:'keyboard',pad:{connected:false,moveX:0,moveY:0,aimX:0,aimY:0,shoot:false},
    tutorial,tutorialRun:false,tutorialHint:null,alert:0,roomStreak:0,seenRoomKeys:[],offeredItems:[],stainedFloor:-1,
    player: createPlayer(metaLevels),
    map: generateMap(0), contents: new Map(), currentKey: '0,0',
    projectiles: [], particles: [], damageNumbers: [],
    shakeX: 0, shakeY: 0, shakeIntensity: 0,
    keys: {}, mouseX: 0, mouseY: 0, mouseDown: false,
    stats: { breadStolen: 0, enemiesDefeated: 0, roomsCleared: 0, goldenCrumbs: 0, floorsCleared: 0 },
    run: newRunStats(),
    floorIntroTimer: 0, bossIntroTimer: 0, bossIntroName: '', bossIntroSubtitle: '',
    bossIntroSeen: {}, floorClearTimer: 0,
    roomLabel: '', roomLabelTimer: 0, toast: '', toastTimer: 0, pickupCard: null,
    transition: { active: false, timer: 0, total: 22, dir: null, targetKey: null },
    restartHold: 0, bossDefeatTimer: 0, rewardDropTimer: 0,
    swap: null, swapSel: 0, swapGuard: 0, overlayLabels: [],
    totalGoldenCrumbs: totalGolden, metaLevels, settings, bindings, controlIndex:0, controlCapture:false,
    career:careerData.career,runHistory:careerData.history,runRecorded:false,contracts:careerData.contracts,
    dailyProfile,daily:{key:dailyProfile.current.key,seed:dailyProfile.current.seed,modifiers:dailyModifiers(dailyProfile.current.key),score:0},dailyResult:null,best,
    unlockedSkins, equippedSkin,
    discovered, bestFloor, newRecord:false, knownSynergies:[],endFrame:0,
    heistIntroTimer:0,heistIntroSeen:false, hitStop:0, deathEchoes:[], decoy:null,
    grenades:[], remoteBomb:null, drone:null, coffeeCrash:0, activeSwap:null, synergyNotice:null,
    collectionTab:'items',collectionIndex:0,collectionScroll:0,collectionFilter:'all',collectionSort:'default',careerTab:0,
    wardrobeScroll:0,wardrobeScrollTarget:0,tooltip:{key:'',since:0},
    difficulty:'normal',difficultyIndex:1,madUnlocked,
    gameMode:'heist',pendingMode:'heist',endless:emptyEndlessState(),endlessRecords,
    endlessCheckpointRound,endlessCheckpointDifficulty,heistCheckpointFloor,heistCheckpointDifficulty,endlessResumeIndex:0,
    menuIndex: 0, pauseIndex: 0, runInfoTab:0, confirmIndex:1, confirmKind:null, confirmReturnState:GameState.PAUSED, settingsIndex: 0, upgradeIndex: 0, wardrobeIndex: 0,
    scale: 2,
  };
}

function newRunStats(seedOverride?:string) {
  const seed=seedOverride??`PAN-${Math.floor(random()*0xffffffff).toString(16).toUpperCase().padStart(8,'0')}`;
  return { time: 0, bosses: 0, items: 0, weaponsFound: 1, dmgDealt: 0, dmgTaken: 0, floorReached: 1, goldenEarned: 0,seed,weaponIds:['quack_blaster'],itemIds:[],weaponStats:{} };
}

function createPlayer(meta: Record<string, number>) {
  const hpBonus = meta.hp ?? 0;
  return {
    x: CANVAS_WIDTH / 2 - 8, y: CANVAS_HEIGHT / 2 - 8, vx: 0, vy: 0,
    hp: 5 + hpBonus, maxHp: 5 + hpBonus, speed: PLAYER_SPEED,
    weapons: [{ ...WEAPONS.quack_blaster }, null] as (WeaponDef | null)[],
    activeWeapon: 0, switchAnim: 0,
    fireCooldown: 0,
    dir: 'down' as DuckDir, moving: false, shootFlash: 0,
    hurtTimer: 0, iFrames: 0, flash: 0,
    dashTimer: 0, dashCooldown: 0, dashDir: { x: 0, y: 0 },
    crumbs: (meta.crumbs ?? 0) * 15, goldenCrumbs: 0,
    items: [] as string[], activeItem: 'emergency_quack' as string | null,
    activeItemCooldown: 0, activeItemMaxCooldown: 180,
    damageMultiplier: 1 + (meta.damage ?? 0) * 0.1, shotCounter: 0,
    projectileCounter:0,
    focusTarget: -1, focusTime: 0,
    ducklingX: CANVAS_WIDTH / 2, ducklingY: CANVAS_HEIGHT / 2 + 20, ducklingFireCooldown: 0,
    deathTimer: 0,
    dashReadyFlash: 0, quackReadyFlash: 0,
    speedBoost: 0, fireBoost: 0,
    shield: 0, combo: 0, comboTimer: 0,
    roomShield:0,helmetShield:false,couponUsed:false,trayTimer:0,honeyTimer:0,healFlash:0,quackWave:0,contactShield:0,
    fireBoostPower:1,facingAngle:Math.PI/2,companions:[] as {x:number;y:number;cooldown:number;damage:number}[],
    chocolateTimer:0,dashHasteTimer:0,perfectBuff:0,firstHitUsed:false,reviveUsed:false,overdraftRemaining:0,dashHitIds:[] as number[],guardianCooldown:0,
    heat:0,overheat:0,charge:0,streak:0,
  };
}

// ---------------------------------------------------------------------------
// RUN / PISOS
// ---------------------------------------------------------------------------
export function startGame(engine: GameEngine) {
  refreshContracts(engine);
  resetGameRandom();activeDailyModifiers=[];
  clearHeistCheckpoint(engine);
  engine.gameMode='heist';engine.pendingMode='heist';engine.dailyResult=null;
  activeDifficulty=engine.difficulty;
  saveProgress(engine);
  nextEnemyId = 0;
  initAudio();
  engine.player = createPlayer(engine.metaLevels);
  const difficulty=DIFFICULTIES[engine.difficulty];
  if(difficulty.startHearts>0) {engine.player.maxHp+=difficulty.startHearts;engine.player.hp+=difficulty.startHearts;}
  engine.tutorialRun=!engine.tutorial.started;
  engine.alert=0;engine.roomStreak=0;engine.seenRoomKeys=[];engine.offeredItems=[];engine.stainedFloor=-1;
  engine.tutorialHint=null;engine.pad={...engine.pad,moveX:0,moveY:0,shoot:false};
  engine.run=newRunStats();
  engine.map = generateMap(0,engine.run.seed);
  if(!engine.tutorial.started) engine.tutorial.started=true;
  engine.contents = new Map();
  engine.currentKey = engine.map.startKey;
  engine.projectiles = []; engine.particles = []; engine.damageNumbers = [];
  engine.stats = { breadStolen: 0, enemiesDefeated: 0, roomsCleared: 0, goldenCrumbs: 0, floorsCleared: 0 };
  discover(engine,'items','emergency_quack');
  engine.shakeIntensity = 0;
  engine.restartHold = 0;
  engine.bossDefeatTimer = 0;
  engine.rewardDropTimer = 0;
  engine.floorClearTimer = 0;
  engine.swap = null;
  engine.swapGuard = 0;
  engine.swapSel = 0;
  engine.pickupCard = null;
  engine.mouseDown=false;engine.keys={};engine.hitStop=0;engine.deathEchoes=[];engine.decoy=null;
  engine.grenades=[];engine.remoteBomb=null;engine.drone=null;engine.coffeeCrash=0;engine.activeSwap=null;
  engine.knownSynergies=[];engine.synergyNotice=null;engine.newRecord=false;engine.runRecorded=false;engine.tooltip={key:'',since:0};
  engine.bossIntroSeen = {};
  engine.overlayLabels = [];
  engine.transition = { active: false, timer: 0, total: 22, dir: null, targetKey: null };
  enterRoom(engine, engine.map.startKey, null);
  engine.floorIntroTimer = 110;
  engine.state = GameState.FLOOR_INTRO;
  setMusic('run',0);
  engine.onStateChange?.(engine.state);
  saveProgress(engine);
  saveHeistCheckpoint(engine);
}

export function startDailyChallenge(engine:GameEngine) {
  refreshContracts(engine);ensureDailyProfile(engine.dailyProfile);
  const current=engine.dailyProfile.current;
  engine.gameMode='daily';engine.pendingMode='daily';engine.difficulty='normal';engine.difficultyIndex=DIFFICULTY_MODES.indexOf('normal');
  activeDifficulty='normal';engine.daily={key:current.key,seed:current.seed,modifiers:dailyModifiers(current.key),score:0};engine.dailyResult=null;
  activeDailyModifiers=[...engine.daily.modifiers];setGameRandom(seededRandom(current.seed+':run'));
  saveProgress(engine);nextEnemyId=0;initAudio();
  engine.player=createPlayer({});
  if(engine.daily.modifiers.includes('GLASS_BEAK')) {engine.player.maxHp=3;engine.player.hp=3;engine.player.damageMultiplier*=1.25;}
  engine.tutorialRun=false;
  engine.alert=engine.daily.modifiers.includes('HOT_START')?25:0;engine.roomStreak=0;engine.seenRoomKeys=[];engine.offeredItems=[];engine.stainedFloor=-1;
  engine.tutorialHint=null;engine.pad={...engine.pad,moveX:0,moveY:0,shoot:false};
  engine.run=newRunStats(current.seed);engine.map=generateMap(0,current.seed);engine.contents=new Map();engine.currentKey=engine.map.startKey;
  engine.projectiles=[];engine.particles=[];engine.damageNumbers=[];
  engine.stats={breadStolen:0,enemiesDefeated:0,roomsCleared:0,goldenCrumbs:0,floorsCleared:0};
  discover(engine,'items','emergency_quack');
  engine.shakeIntensity=0;engine.restartHold=0;engine.bossDefeatTimer=0;engine.rewardDropTimer=0;engine.floorClearTimer=0;
  engine.swap=null;engine.swapGuard=0;engine.swapSel=0;engine.pickupCard=null;
  engine.mouseDown=false;engine.keys={};engine.hitStop=0;engine.deathEchoes=[];engine.decoy=null;
  engine.grenades=[];engine.remoteBomb=null;engine.drone=null;engine.coffeeCrash=0;engine.activeSwap=null;
  engine.knownSynergies=[];engine.synergyNotice=null;engine.newRecord=false;engine.runRecorded=false;engine.tooltip={key:'',since:0};
  engine.bossIntroSeen={};engine.overlayLabels=[];engine.transition={active:false,timer:0,total:22,dir:null,targetKey:null};
  enterRoom(engine,engine.map.startKey,null);engine.floorIntroTimer=110;engine.state=GameState.FLOOR_INTRO;
  engine.roomLabel='DESAFÍO DIARIO';engine.roomLabelTimer=90;setMusic('run',0);engine.onStateChange?.(engine.state);saveProgress(engine);
}

export function beginHeist(engine:GameEngine) {
  engine.heistIntroTimer=HEIST_INTRO_FRAMES;
  engine.state=GameState.HEIST_INTRO;
  engine.mouseDown=false;
  engine.keys={};
  playDoorLock();
  setMusic('off');
  engine.onStateChange?.(engine.state);
}


function endlessBagPick(engine:GameEngine,tier:'mini'|'sub'|'boss'):string {
  const state=engine.endless;
  const keyName=tier==='mini'?'minibossBag':tier==='sub'?'subbossBag':'bossBag';
  let bag=state[keyName];
  const source=tier==='mini'?Object.keys(MINIBOSSES):tier==='sub'?Object.keys(SUBBOSSES):Object.keys(BOSSES).filter(id=>id!=='bread_banker');
  if(!bag.length) {
    bag=[...source];
    for(let i=bag.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}
    state[keyName]=bag;
  }
  return bag.shift() ?? source[0];
}

function endlessDiffScale(engine:GameEngine) {
  const e=endlessScale(engine.endless.round,engine.difficulty);
  return {hp:e.hp,dmg:e.dmg,speed:e.speed,fire:e.fire,count:1,eliteChance:e.eliteChance,pattern:Math.min(5,engine.endless.alert)};
}

function applyEndlessBossRank(engine:GameEngine,boss:Enemy) {
  const rank=engine.endless.threatRank;
  const mult=rank==='NÉMESIS'?{hp:1.62,dmg:1.32,speed:1.09,cool:.76}:rank==='ÉLITE'?{hp:1.36,dmg:1.22,speed:1.07,cool:.84}:rank==='VETERANO'?{hp:1.16,dmg:1.11,speed:1.035,cool:.92}:{hp:1,dmg:1,speed:1,cool:1};
  const critical=engine.endless.round%50===0?1.14:1;
  boss.hp=Math.round(boss.hp*mult.hp*critical);boss.maxHp=boss.hp;
  boss.dmgMul*=mult.dmg;boss.damage*=mult.dmg;
  boss.speed*=mult.speed;
  boss.attackCooldown=Math.max(28,boss.attackCooldown*mult.cool);
}

function applyEndlessBossMutation(engine:GameEngine,boss:Enemy,ordinal=0) {
  if(engine.gameMode!=='endless')return;
  const mutation=endlessBossMutation(engine.endless.round,boss.bossType,ordinal);
  boss.mutation=mutation;
  boss.mutationCounter=0;
  if(!mutation)return;
  if(mutation==='FRENÉTICO'){
    boss.speed*=1.07;
    boss.attackCooldown=Math.max(26,boss.attackCooldown*.84);
  } else if(mutation==='BLINDADO'){
    boss.hp=Math.round(boss.hp*1.18);
    boss.maxHp=boss.hp;
  } else if(mutation==='CAZADOR'){
    boss.speed*=1.05;
    boss.attackCooldown=Math.max(28,boss.attackCooldown*.94);
  } else if(mutation==='REFUERZOS'){
    boss.hp=Math.round(boss.hp*1.08);
    boss.maxHp=boss.hp;
  } else if(mutation==='TORMENTA'){
    boss.attackCooldown=Math.max(28,boss.attackCooldown*.91);
  }
}

function applyBossMutationAttack(engine:GameEngine,boss:Enemy,room:MapRoom,content:RoomContent,ang:number,tier:'mini'|'sub'|'boss') {
  if(engine.gameMode!=='endless'||!boss.mutation)return;
  boss.mutationCounter=(boss.mutationCounter??0)+1;
  const n=boss.mutationCounter;
  if(boss.mutation==='BLINDADO'&&n%3===0){
    // BLINDADO no es solo más HP: responde con un pulso radial lento que
    // obliga a reposicionarse y refuerza su identidad defensiva.
    bossRing(engine,boss,tier==='boss'?10:7,tier==='boss'?2.15:1.9,'enemy_bullet',engine.frame*.018);
  } else if(boss.mutation==='CAZADOR'&&n%2===0){
    bossFan(engine,boss,ang,3,tier==='boss'?.18:.22,3.55,'enemy_bullet');
  } else if(boss.mutation==='REFUERZOS'&&n%3===0){
    const pool=tier==='boss'?['policia_rapido','dron_policial','policia_escopeta']:['policia_pato','policia_rapido'];
    bossSupport(engine,room,content,pool,tier==='boss'?7:5);
  } else if(boss.mutation==='TORMENTA'&&n%2===0){
    bossRing(engine,boss,tier==='boss'?12:8,tier==='boss'?2.8:2.45,'drone_shot',engine.frame*.045);
  } else if(boss.mutation==='FRENÉTICO'&&n%3===0){
    boss.moveAngle=ang;
    boss.moveTimer=Math.max(boss.moveTimer,tier==='boss'?18:14);
  }
}

function resetEndlessArena(engine:GameEngine) {
  const room=engine.map.rooms.get(engine.currentKey)!;
  const content=getContent(engine);
  // La arena persiste; el botín sobrante ya se resuelve al cerrar cada ronda.
  // Aquí solo se limpia combate temporal.
  content.enemies=[];content.puddles=[];content.airStrikes=[];content.choices=undefined;
  content.pedestal=undefined;content.chest=undefined;content.stairs=undefined;content.shopItems=undefined;
  content.damaged=false;content.clearCounted=false;content.perfectAwarded=false;content.combatTimer=0;
  content.alarmTimer=undefined;content.securityTimer=undefined;content.modifierResolved=false;
  engine.projectiles=[];engine.grenades=[];engine.remoteBomb=null;engine.deathEchoes=[];
  room.cleared=false;room.modifier=undefined;
}

function configureEndlessArena(engine:GameEngine) {
  const room=engine.map.rooms.get(engine.currentKey)!;
  // Atraco Sin Fin siempre usa exactamente la misma arena y el mismo tema visual.
  room.floorIndex=0;
  engine.map.floorIndex=0;
  room.doors=[];
  const special=engine.endless.special;
  if(special==='blackout') room.modifier='blackout';
  else if(special==='cameras') room.modifier='cameras';
  else if(special==='siege'||special==='red_protocol') room.modifier='alarm';
}

function spawnEndlessBoss(engine:GameEngine,tier:'mini'|'sub'|'boss') {
  const content=getContent(engine),rawScale=endlessDiffScale(engine);
  // Después de R100 la vida de bosses entra en soft cap; la dificultad continúa por patrones,
  // presión y refuerzos para evitar peleas de varios minutos contra esponjas de HP.
  const hpCap=tier==='boss'?6.25:tier==='sub'?7.25:8.25;
  const sc={...rawScale,hp:Math.min(rawScale.hp,hpCap)};
  const doubleThreat=tier==='boss'&&engine.endless.round%100===0;
  const compatiblePairs=[
    ['captain_honk','don_levadura'],
    ['comisario_pico_duro','toaster_9000'],
    ['general_ganso','director_seguridad'],
    ['bread_banker','captain_honk'],
  ];
  const ids=doubleThreat
    ? compatiblePairs[(Math.floor(engine.endless.round/100)-1)%compatiblePairs.length]
    : [endlessBagPick(engine,tier)];
  const names:string[]=[];
  ids.forEach((id,i)=>{
    const def=tier==='mini'?MINIBOSSES[id]:tier==='sub'?SUBBOSSES[id]:BOSSES[id];
    const boss=makeBossEnemy(def,id,tier==='mini'?'mini':tier==='sub'?'sub':'boss',sc);
    if(doubleThreat) {
      boss.x=i===0?CANVAS_WIDTH*.29-boss.size/2:CANVAS_WIDTH*.71-boss.size/2;
      boss.y=CANVAS_HEIGHT*.25;
    }
    applyEndlessBossRank(engine,boss);
    applyEndlessBossMutation(engine,boss,i);
    if(doubleThreat){
      boss.hp=Math.round(boss.hp*.76);boss.maxHp=boss.hp;
      boss.dmgMul*=.9;boss.damage*=.9;boss.speed*=.96;boss.attackCooldown*=1.15;
    }
    content.enemies.push(boss);names.push(def.name+(boss.mutation?` · ${boss.mutation}`:''));
    discover(engine,'bosses',id);
  });
  engine.bossIntroName=doubleThreat?'DOBLE AMENAZA':names[0];
  engine.bossIntroSubtitle=doubleThreat?names.join(' + '):`${engine.endless.threatRank} · ${endlessStage(engine.endless.round)}`;
  engine.bossIntroTimer=doubleThreat?150:tier==='boss'?122:tier==='sub'?104:82;
  playBossRoar();setMusic('boss');
  engine.state=GameState.BOSS_INTRO;engine.onStateChange?.(engine.state);
}

function preferredEndlessRole(engine:GameEngine) {
  const counts:{offense:number;defense:number;utility:number}={offense:0,defense:0,utility:0};
  for(const id of engine.player.items) {
    const role=ITEMS[id]?.role;
    if(role==='offense'||role==='defense'||role==='utility') counts[role]++;
  }
  return (Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]?.[0] ?? 'offense') as 'offense'|'defense'|'utility';
}

function makeEndlessRewards(engine:GameEngine):EndlessRewardOption[] {
  const round=engine.endless.round,n=((round-1)%10)+1;
  const boosted=engine.endless.nextRewardBoost>0;
  const rare=n>=8||round>=30||engine.endless.perfectStreak>=3||boosted;
  if(boosted)engine.endless.nextRewardBoost--;
  const role=preferredEndlessRole(engine);
  const result:EndlessRewardOption[]=[];
  const addItem=(preferred=false)=>{
    const id=pickPassive(engine,preferred?role:undefined,result.flatMap(x=>x.itemId?[x.itemId]:[]),rare);
    if(id) result.push({kind:'item',itemId:id,label:ITEMS[id].name,description:ITEMS[id].description});
  };
  const addWeapon=()=>{
    const id=rollWeapon(engine,rare||n===10);
    result.push({kind:'weapon',itemId:id,label:WEAPONS[id].name,description:WEAPONS[id].description});
  };
  if(n===3){addItem(true);result.push(engine.endless.alert<5?{kind:'heal',amount:1,label:'PAN DE RESERVA',description:'Recupera 1 corazón.'}:{kind:'crumbs',amount:14+engine.endless.alert*2,label:'RESERVAS AGOTADAS',description:'A estas alturas el banco casi no deja curación.'});result.push({kind:'crumbs',amount:12+engine.endless.alert*2,label:'BOTÍN RÁPIDO',description:'Migas para sostener esta partida.'});}
  else if(n===5){addWeapon();addItem(true);result.push(engine.endless.alert<6?{kind:'heal',amount:1,label:'RESPIRAR',description:'Recupera 1 corazón antes de seguir.'}:{kind:'crumbs',amount:20+engine.endless.alert*3,label:'SIN RESPIRO',description:'En alertas altas la curación deja de estar garantizada.'});}
  else if(n===7){addItem(true);addWeapon();result.push({kind:'crumbs',amount:18+engine.endless.alert*3,label:'PREMIO DE RIESGO',description:'Convierte el desafío en migas.'});}
  else if(n===8){addItem(true);addWeapon();addItem(false);}
  else {
    addItem(true);addWeapon();
    if(engine.endless.alert<4) result.push({kind:'heal',amount:2,label:'BOTÍN DEL JEFE',description:'Recupera 2 corazones para el siguiente ciclo.'});
    else if(engine.endless.alert<8) result.push({kind:'heal',amount:1,label:'BOTÍN DEL JEFE',description:'Recuperación limitada para el siguiente ciclo.'});
    else result.push({kind:'crumbs',amount:30+engine.endless.alert*4,label:'SUMINISTROS CORTADOS',description:'En Alerta alta ya no hay curación garantizada.'});
  }
  while(result.length<3) result.push({kind:'crumbs',amount:15+engine.endless.alert*2,label:'MIGAS',description:'Recompensa segura.'});
  return result.slice(0,3);
}

function saveHeistCheckpoint(engine:GameEngine) {
  if(engine.gameMode!=='heist')return;
  const floorIndex=engine.map.floorIndex;
  if(floorIndex<0||floorIndex>=TOTAL_FLOORS)return;
  const payload={
    version:1,
    floorIndex,
    difficulty:engine.difficulty,
    player:engine.player,
    run:engine.run,
    stats:engine.stats,
    alert:engine.alert,
    roomStreak:engine.roomStreak,
    offeredItems:engine.offeredItems,
    knownSynergies:engine.knownSynergies,
    tutorialRun:engine.tutorialRun,
    bossIntroSeen:engine.bossIntroSeen,
  };
  try {
    localStorage.setItem('duckheist_heist_checkpoint',JSON.stringify(payload));
    engine.heistCheckpointFloor=floorIndex+1;
    engine.heistCheckpointDifficulty=engine.difficulty;
    notifyCloudSave();
  } catch { /* sin almacenamiento */ }
}

export function clearHeistCheckpoint(engine:GameEngine) {
  try {localStorage.removeItem('duckheist_heist_checkpoint');notifyCloudSave();} catch { /* sin almacenamiento */ }
  engine.heistCheckpointFloor=0;
  engine.heistCheckpointDifficulty=null;
}

export function resumeHeistGame(engine:GameEngine):boolean {
  try {
    const raw=localStorage.getItem('duckheist_heist_checkpoint');
    if(!raw)return false;
    const cp=JSON.parse(raw);
    if(cp?.version!==1||!Number.isInteger(cp?.floorIndex)||cp.floorIndex<0||cp.floorIndex>=TOTAL_FLOORS||!cp?.player||!cp?.run||!DIFFICULTY_MODES.includes(cp.difficulty))return false;

    engine.difficulty=cp.difficulty;
    engine.difficultyIndex=Math.max(0,DIFFICULTY_MODES.indexOf(cp.difficulty));
    activeDifficulty=engine.difficulty;
    activeDailyModifiers=[];
    resetGameRandom();
    engine.gameMode='heist';engine.pendingMode='heist';engine.dailyResult=null;

    const basePlayer=createPlayer(engine.metaLevels);
    const savedPlayer=cp.player as Partial<GameEngine['player']>;
    const savedWeapons=Array.isArray(savedPlayer.weapons)?savedPlayer.weapons:[];
    engine.player={
      ...basePlayer,
      ...savedPlayer,
      weapons:[0,1].map(i=>{
        const id=savedWeapons[i]?.id;
        return id&&WEAPONS[id]?{...WEAPONS[id]}:null;
      }) as GameEngine['player']['weapons'],
      items:Array.isArray(savedPlayer.items)?savedPlayer.items.filter((id:string)=>!!ITEMS[id]):[],
      activeItem:savedPlayer.activeItem&&ACTIVE_ITEMS[savedPlayer.activeItem]?savedPlayer.activeItem:'emergency_quack',
      dashHitIds:[],
      vx:0,vy:0,moving:false,
    };
    if(!engine.player.weapons[0]&&!engine.player.weapons[1])engine.player.weapons[0]={...WEAPONS.quack_blaster};
    if(!engine.player.weapons[engine.player.activeWeapon])engine.player.activeWeapon=engine.player.weapons[0]?0:1;

    const freshRun=newRunStats(cp.run.seed),savedRun=cp.run??{};
    engine.run={...freshRun,...savedRun,
      weaponIds:Array.isArray(savedRun.weaponIds)?savedRun.weaponIds:['quack_blaster'],
      itemIds:Array.isArray(savedRun.itemIds)?savedRun.itemIds:[],
      weaponStats:savedRun.weaponStats&&typeof savedRun.weaponStats==='object'?savedRun.weaponStats:{},
    };
    engine.stats=cp.stats??{breadStolen:0,enemiesDefeated:0,roomsCleared:0,goldenCrumbs:0,floorsCleared:0};
    engine.alert=Number(cp.alert)||0;
    engine.roomStreak=Number(cp.roomStreak)||0;
    engine.offeredItems=Array.isArray(cp.offeredItems)?cp.offeredItems:[];
    engine.knownSynergies=Array.isArray(cp.knownSynergies)?cp.knownSynergies:[];
    engine.tutorialRun=cp.tutorialRun===true;
    engine.bossIntroSeen=cp.bossIntroSeen&&typeof cp.bossIntroSeen==='object'?cp.bossIntroSeen:{};
    engine.seenRoomKeys=[];engine.stainedFloor=-1;

    engine.map=generateMap(cp.floorIndex,engine.run.seed);
    engine.contents=new Map();engine.currentKey=engine.map.startKey;
    engine.projectiles=[];engine.particles=[];engine.damageNumbers=[];engine.deathEchoes=[];
    engine.grenades=[];engine.remoteBomb=null;engine.decoy=null;engine.drone=null;
    engine.swap=null;engine.activeSwap=null;engine.pickupCard=null;engine.keys={};engine.mouseDown=false;
    engine.transition={active:false,timer:0,total:22,dir:null,targetKey:null};
    engine.restartHold=0;engine.bossDefeatTimer=0;engine.rewardDropTimer=0;engine.floorClearTimer=0;
    engine.hitStop=0;engine.shakeIntensity=0;engine.runRecorded=false;engine.tooltip={key:'',since:0};

    enterRoom(engine,engine.map.startKey,null);
    engine.floorIntroTimer=90;
    engine.state=GameState.FLOOR_INTRO;
    engine.roomLabel='ATRACO CONTINUADO · PISO '+(cp.floorIndex+1);
    engine.roomLabelTimer=100;
    engine.heistCheckpointFloor=cp.floorIndex+1;
    engine.heistCheckpointDifficulty=engine.difficulty;
    setMusic('run',cp.floorIndex);
    engine.onStateChange?.(engine.state);
    return true;
  } catch {return false;}
}

function saveEndlessRecord(engine:GameEngine) {
  const cur=engine.endlessRecords[engine.difficulty];
  const next={round:Math.max(cur.round,engine.endless.round),score:Math.max(cur.score,Math.round(engine.endless.score)),alert:Math.max(cur.alert,engine.endless.alert)};
  engine.endlessRecords[engine.difficulty]=next;
  try {localStorage.setItem('duckheist_endless_records',JSON.stringify(engine.endlessRecords));notifyCloudSave();} catch { /* sin almacenamiento */ }
}

function saveEndlessCheckpoint(engine:GameEngine) {
  if(engine.gameMode!=='endless'||engine.endless.round<1)return;
  const payload={
    version:1,difficulty:engine.difficulty,
    player:engine.player,endless:engine.endless,run:engine.run,stats:engine.stats,
    offeredItems:engine.offeredItems,knownSynergies:engine.knownSynergies,
  };
  try {
    localStorage.setItem('duckheist_endless_checkpoint',JSON.stringify(payload));
    engine.endlessCheckpointRound=engine.endless.round;
    engine.endlessCheckpointDifficulty=engine.difficulty;
    notifyCloudSave();
  } catch { /* sin almacenamiento */ }
}

export function clearEndlessCheckpoint(engine:GameEngine) {
  try {localStorage.removeItem('duckheist_endless_checkpoint');notifyCloudSave();} catch { /* sin almacenamiento */ }
  engine.endlessCheckpointRound=0;engine.endlessCheckpointDifficulty=null;
}

export function resumeEndlessGame(engine:GameEngine):boolean {
  try {
    const raw=localStorage.getItem('duckheist_endless_checkpoint');
    if(!raw)return false;
    const cp=JSON.parse(raw);
    if(cp?.version!==1||!cp?.player||!cp?.endless||cp.endless.round<1||!DIFFICULTY_MODES.includes(cp.difficulty))return false;
    engine.difficulty=cp.difficulty;
    engine.difficultyIndex=Math.max(0,DIFFICULTY_MODES.indexOf(cp.difficulty));
    activeDifficulty=engine.difficulty;
    engine.gameMode='endless';engine.pendingMode='endless';
    engine.player=cp.player;
    // Checkpoints can travel between PCs with different aspect ratios.
    // Clamp the saved position into the current responsive arena before resuming.
    engine.player.x=clamp(Number(engine.player.x)||CANVAS_WIDTH/2-8,TILE_SIZE+4,CANVAS_WIDTH-TILE_SIZE-20);
    engine.player.y=clamp(Number(engine.player.y)||CANVAS_HEIGHT/2-8,TILE_SIZE+4,CANVAS_HEIGHT-TILE_SIZE-22);
    engine.endless={...emptyEndlessState(),...cp.endless,roundActive:false,pendingEnemies:[],spawnCooldown:0,pressure:0};
    const freshRun=newRunStats(),savedRun=cp.run??{};
    engine.run={...freshRun,...savedRun,weaponIds:Array.isArray(savedRun.weaponIds)?savedRun.weaponIds:['quack_blaster'],
      itemIds:Array.isArray(savedRun.itemIds)?savedRun.itemIds:[],weaponStats:savedRun.weaponStats&&typeof savedRun.weaponStats==='object'?savedRun.weaponStats:{}};
    engine.stats=cp.stats??{breadStolen:0,enemiesDefeated:0,roomsCleared:0,goldenCrumbs:0,floorsCleared:0};
    engine.offeredItems=cp.offeredItems??[];
    engine.knownSynergies=cp.knownSynergies??[];
    engine.map=createEndlessMap(engine.endless.alert);
    engine.contents=new Map();engine.currentKey=engine.map.startKey;
    const room=engine.map.rooms.get(engine.currentKey)!;
    engine.contents.set(engine.currentKey,{enemies:[],pickups:[],items:[],puddles:[],doorAnim:{},lockFlash:0,combatTimer:0,ambient:0,magnet:0});
    room.generated=true;room.visited=true;room.cleared=true;
    engine.projectiles=[];engine.particles=[];engine.damageNumbers=[];engine.deathEchoes=[];engine.grenades=[];engine.remoteBomb=null;engine.decoy=null;
    engine.swap=null;engine.activeSwap=null;engine.pickupCard=null;engine.keys={};engine.mouseDown=false;
    engine.endlessCheckpointRound=engine.endless.round;engine.endlessCheckpointDifficulty=engine.difficulty;
    engine.roomLabel='ATRACO SIN FIN · CONTINUADO';engine.roomLabelTimer=0;
    setMusic('run',Math.min(5,engine.endless.alert));
    if(!engine.endless.awaitingReward&&!engine.endless.marketOpen) queueNextEndlessRound(engine,42);
    else {engine.state=GameState.ENDLESS_REWARD;engine.onStateChange?.(engine.state);}
    return true;
  } catch {return false;}
}

export function endlessMarketOptions(engine:GameEngine) {
  const a=engine.endless.alert;
  return [
    {id:'heal',label:'PAN DE EMERGENCIA',description:'+1 corazón',cost:16+a*5},
    {id:'shield',label:'BLINDAJE DE PAN',description:'+1 escudo · máximo 2 acumulados',cost:22+a*6},
    {id:'boost',label:'CONTACTO INTERNO',description:'Mejora la rareza del próximo draft',cost:28+a*7},
  ] as const;
}

function openEndlessMarketIfNeeded(engine:GameEngine) {
  const e=engine.endless;
  if(e.round>0&&e.round%10===0&&e.marketDoneRound!==e.round){
    e.marketOpen=true;e.marketIndex=0;e.marketDoneRound=e.round;
    engine.toast='MERCADO DE RESPIRO';engine.toastTimer=90;
    saveEndlessCheckpoint(engine);return true;
  }
  saveEndlessCheckpoint(engine);return false;
}

export function buyEndlessMarket(engine:GameEngine) {
  const e=engine.endless;if(!e.marketOpen)return;
  const option=endlessMarketOptions(engine)[e.marketIndex];if(!option)return;
  if(engine.player.crumbs<option.cost){engine.toast='MIGAS INSUFICIENTES';engine.toastTimer=70;playDeny();return;}
  if(option.id==='heal'&&engine.player.hp>=engine.player.maxHp){engine.toast='VIDA COMPLETA';engine.toastTimer=70;playDeny();return;}
  if(option.id==='shield'&&engine.player.shield>=2){engine.toast='BLINDAJE AL MÁXIMO';engine.toastTimer=70;playDeny();return;}
  engine.player.crumbs-=option.cost;
  if(option.id==='heal')healPlayer(engine,1);
  else if(option.id==='shield')engine.player.shield++;
  else if(option.id==='boost')e.nextRewardBoost=Math.max(e.nextRewardBoost,1);
  e.marketOpen=false;engine.toast='TRATO CERRADO';engine.toastTimer=70;playEquip();queueNextEndlessRound(engine,42);
}

export function skipEndlessMarket(engine:GameEngine) {
  if(!engine.endless.marketOpen)return;
  engine.endless.marketOpen=false;engine.toast='MIGAS CONSERVADAS · SIGUIENTE RONDA';engine.toastTimer=60;playUiBack();queueNextEndlessRound(engine,42);
}

function endlessRecycleValue(it:RoomContent['items'][number]) {
  const def=WEAPONS[it.itemId]??ITEMS[it.itemId]??ACTIVE_ITEMS[it.itemId];
  const rarity=Math.max(1,def?.rarity??1);
  const manualValue=4+rarity*3+(it.isWeapon?3:0);
  return Math.max(2,Math.floor(manualValue*.6));
}

export function cleanupEndlessFloorDrops(engine:GameEngine,content:RoomContent=getContent(engine)) {
  let recycledItems=0,recycledMigas=0,bankedMigas=0,golden=0,discardedHealing=0;
  for(const it of content.items) {
    const value=it.recycleValue??endlessRecycleValue(it);
    recycledItems++;recycledMigas+=value;
  }
  if(recycledMigas>0){engine.player.crumbs+=recycledMigas;engine.stats.breadStolen+=recycledMigas;}
  content.items=[];
  for(const p of content.pickups) {
    if(p.type==='crumb'){bankedMigas+=p.value;engine.player.crumbs+=p.value;engine.stats.breadStolen+=p.value;}
    else if(p.type==='golden_crumb'){
      golden+=p.value;engine.player.goldenCrumbs+=p.value;engine.stats.goldenCrumbs+=p.value;
      engine.run.goldenEarned+=p.value;engine.totalGoldenCrumbs+=p.value;
    } else discardedHealing++;
  }
  content.pickups=[];
  if(golden>0)saveProgress(engine);
  if(recycledItems||bankedMigas||golden)playCoin();
  return {recycledItems,recycledMigas,bankedMigas,golden,discardedHealing};
}

export function beginEndlessFloorSweep(engine:GameEngine,content:RoomContent=getContent(engine)) {
  if(content.endlessSweep)return content.endlessSweep;
  let recycledItems=0,recycledMigas=0,discardedHealing=0;
  for(const it of content.items) {
    const value=endlessRecycleValue(it);
    it.vacuuming=true;it.recycleValue=value;it.vx=0;it.vy=0;
    recycledItems++;recycledMigas+=value;
  }
  for(const p of content.pickups) {
    p.forceMagnet=true;p.sweepCollect=true;p.vx=0;p.vy=0;
    if(p.type!=='crumb'&&p.type!=='golden_crumb')discardedHealing++;
  }
  content.endlessSweep={started:engine.frame,recycledItems,recycledMigas,discardedHealing};
  engine.toast=(content.items.length||content.pickups.length)?'RECOGIENDO BOTÍN...':'RONDA ASEGURADA';
  engine.toastTimer=72;
  return content.endlessSweep;
}

function finishEndlessRound(engine:GameEngine) {
  const e=engine.endless,content=getContent(engine),room=currentRoom(engine);
  if(!e.roundActive) return;

  if(!content.endlessSweep) {
    beginEndlessFloorSweep(engine,content);
    content.puddles=[];content.choices=undefined;
    content.pedestal=undefined;content.chest=undefined;content.stairs=undefined;content.shopItems=undefined;
    engine.projectiles=[];engine.grenades=[];engine.remoteBomb=null;engine.deathEchoes=[];
    room.cleared=true;
  }

  const sweep=content.endlessSweep!;
  const pending=content.items.some(it=>it.vacuuming)||content.pickups.some(p=>p.sweepCollect);
  if(pending&&engine.frame-sweep.started<150)return;
  if(pending)cleanupEndlessFloorDrops(engine,content);

  content.endlessSweep=undefined;
  e.roundActive=false;
  const perfect=!e.roundDamaged;
  const cleanupNote=sweep.recycledItems>0?` · RECOGIDO +${sweep.recycledMigas} MIGAS`:sweep.discardedHealing>0?' · SUELO RECOGIDO':'';
  if(perfect){e.perfectRounds++;e.perfectStreak++;e.maxPerfectStreak=Math.max(e.maxPerfectStreak,e.perfectStreak);e.score+=150+e.round*8;engine.toast='RONDA PERFECTA'+cleanupNote;engine.toastTimer=90;}
  else {e.perfectStreak=0;engine.toast='RONDA SUPERADA'+cleanupNote;engine.toastTimer=75;}
  e.score+=e.round*35+e.killedThisRound*12+(e.roundKind==='boss'?600:e.roundKind==='subboss'?300:e.roundKind==='miniboss'?180:0);
  if(e.round%10===0) e.alert=Math.floor(e.round/10);
  e.rewardOptions=rewardRounds(e.round)?makeEndlessRewards(engine):[];
  e.rewardIndex=0;e.awaitingReward=e.rewardOptions.length>0;e.nextRoundTimer=0;
  saveEndlessRecord(engine);
  setMusic('run',Math.min(5,e.alert));
  if(!e.awaitingReward) {
    queueNextEndlessRound(engine,42);
  } else {
    engine.state=GameState.ENDLESS_REWARD;
    saveEndlessCheckpoint(engine);
    engine.onStateChange?.(engine.state);
  }
}

export function startEndlessRound(engine:GameEngine) {
  const e=engine.endless;
  e.round++;e.alert=Math.floor((e.round-1)/10);e.pressure=0;e.roundDamaged=false;e.killedThisRound=0;
  e.roundKind=endlessRoundKind(e.round);e.special=e.roundKind==='special'?endlessSpecial(e.round):null;
  e.threatRank=e.round%50===0?'NÉMESIS':endlessThreatRank(e.round);
  e.milestone=endlessMilestone(e.round);
  e.compositionLabel='';
  e.hazardKind=null;e.hazardWarning=0;
  e.hazardCooldown=endlessHazardTiming(e.round,!!e.milestone).openingCooldown;
  e.pendingEnemies=[];e.spawnCooldown=0;e.roundActive=true;e.awaitingReward=false;e.rewardOptions=[];e.rewardIndex=0;e.nextRoundTimer=0;
  resetEndlessArena(engine);configureEndlessArena(engine);
  const room=currentRoom(engine);room.cleared=false;room.doors=[];
  // Solo la primera ronda coloca al jugador. Después conserva su posición exacta
  // para que se sienta como una única sala continua.
  if(e.round===1){
    engine.player.x=CANVAS_WIDTH/2-8;
    engine.player.y=CANVAS_HEIGHT*.70;
  } else {
    engine.player.x=clamp(engine.player.x,TILE_SIZE+4,CANVAS_WIDTH-TILE_SIZE-20);
    engine.player.y=clamp(engine.player.y,TILE_SIZE+4,CANVAS_HEIGHT-TILE_SIZE-22);
  }
  engine.player.vx=0;engine.player.vy=0;engine.player.firstHitUsed=false;
  engine.player.roomShield=getBuild(engine.player).roomShield;
  const title=e.roundKind==='special'?specialLabel(e.special!):e.roundKind==='miniboss'?'MINIJEFE':e.roundKind==='subboss'?'SUBJEFE':e.roundKind==='boss'?'JEFE DE PISO':'ASALTO';
  engine.roomLabel=e.milestone?`${e.milestone} · RONDA ${e.round}`:`RONDA ${e.round} · ${title}`;
  engine.roomLabelTimer=e.milestone?92:48;
  if(e.milestone){engine.toast=e.round===50?'EL BANCO ACTIVA FUERZA TOTAL':e.round===100?'DOS JEFES · UNA SOLA ARENA':'EL BANCO YA NO TIENE REGLAS';engine.toastTimer=110;playDanger('camera');}
  if(e.roundKind==='miniboss') spawnEndlessBoss(engine,'mini');
  else if(e.roundKind==='subboss') spawnEndlessBoss(engine,'sub');
  else if(e.roundKind==='boss') spawnEndlessBoss(engine,'boss');
  else {
    const composition=endlessComposition(e.round,e.special,engine.difficulty);
    e.compositionLabel=composition.label;
    e.pendingEnemies=[...composition.enemies];
    if(e.special==='cameras'){
      e.pendingEnemies.unshift('security_camera');
      if(e.alert>=4)e.pendingEnemies.unshift('camara_movil');
    }
    e.enemiesThisRound=e.pendingEnemies.length;
    engine.state=GameState.PLAYING;setMusic('run',Math.min(5,e.alert));engine.onStateChange?.(engine.state);
  }
}

export function startEndlessGame(engine:GameEngine) {
  refreshContracts(engine);
  resetGameRandom();activeDailyModifiers=[];engine.dailyResult=null;
  clearEndlessCheckpoint(engine);
  activeDifficulty=engine.difficulty;saveProgress(engine);nextEnemyId=0;initAudio();
  engine.gameMode='endless';engine.pendingMode='endless';engine.player=createPlayer(engine.metaLevels);
  const d=DIFFICULTIES[engine.difficulty];
  if(d.startHearts>0){engine.player.maxHp+=d.startHearts;engine.player.hp+=d.startHearts;}
  engine.endless=emptyEndlessState();engine.alert=0;engine.roomStreak=0;engine.offeredItems=[];
  engine.run=newRunStats();engine.map=createEndlessMap(0);engine.contents=new Map();engine.currentKey=engine.map.startKey;
  const room=engine.map.rooms.get(engine.currentKey)!;
  engine.contents.set(engine.currentKey,{enemies:[],pickups:[],items:[],puddles:[],doorAnim:{},lockFlash:0,combatTimer:0,ambient:0,magnet:0});
  room.generated=true;room.visited=true;room.cleared=true;
  engine.projectiles=[];engine.particles=[];engine.damageNumbers=[];engine.deathEchoes=[];engine.grenades=[];
  engine.stats={breadStolen:0,enemiesDefeated:0,roomsCleared:0,goldenCrumbs:0,floorsCleared:0};
  engine.swap=null;engine.activeSwap=null;engine.pickupCard=null;engine.bossIntroSeen={};engine.keys={};engine.mouseDown=false;
  engine.roomLabel='ATRACO SIN FIN';engine.roomLabelTimer=0;engine.endless.awaitingReward=false;engine.runRecorded=false;
  engine.state=GameState.PLAYING;setMusic('run',0);queueNextEndlessRound(engine,42);
}

function recordOutcome(engine:GameEngine,outcome:'victory'|'death'|'abandoned') {
  if(engine.testing||engine.runRecorded||engine.run.time<=0)return;
  if(engine.gameMode==='daily')finalizeDaily(engine,outcome);
  recordRun(engine,outcome);
}
export function restartCurrentMode(engine:GameEngine) {
  recordOutcome(engine,'abandoned');
  if(engine.gameMode==='endless'||engine.pendingMode==='endless') startEndlessGame(engine);
  else if(engine.gameMode==='daily'||engine.pendingMode==='daily') startDailyChallenge(engine);
  else startGame(engine);
}

export function abandonCurrentRun(engine:GameEngine) {
  // En Atraco principal, salir al menú conserva el checkpoint del inicio del
  // piso actual. La run sólo se registra al morir, ganar o reiniciarla.
  if(engine.gameMode==='heist'&&engine.heistCheckpointFloor>0){
    saveProgress(engine);
    return;
  }
  recordOutcome(engine,'abandoned');
  saveProgress(engine);
}

export function moveEndlessReward(engine:GameEngine,dir:number) {
  if(engine.state!==GameState.ENDLESS_REWARD)return;
  if(engine.endless.marketOpen){
    engine.endless.marketIndex=(engine.endless.marketIndex+dir+3)%3;playUiMove();return;
  }
  if(!engine.endless.rewardOptions.length)return;
  const n=engine.endless.rewardOptions.length;
  engine.endless.rewardIndex=(engine.endless.rewardIndex+dir+n)%n;playUiMove();
}

export function recycleEndlessRewards(engine:GameEngine) {
  if(engine.state!==GameState.ENDLESS_REWARD)return;
  if(engine.endless.marketOpen){skipEndlessMarket(engine);return;}
  if(!engine.endless.awaitingReward)return;
  const amount=10+engine.endless.alert*4;
  engine.player.crumbs+=amount;engine.stats.breadStolen+=amount;
  engine.endless.rewardOptions=[];engine.endless.awaitingReward=false;
  engine.toast=`RECICLADO · +${amount} MIGAS`;engine.toastTimer=80;playCoin();
  if(!openEndlessMarketIfNeeded(engine))queueNextEndlessRound(engine,42);
}

export function recycleNearestEndlessFloorItem(engine:GameEngine) {
  if(engine.gameMode!=='endless'||engine.state!==GameState.PLAYING||engine.swap||engine.activeSwap)return false;
  const content=getContent(engine),p=engine.player;
  let best=-1,bestDist=34;
  for(let i=0;i<content.items.length;i++){
    const it=content.items[i],d=dist(it.x+8,it.y+8,p.x+7,p.y+8);
    if(d<bestDist){bestDist=d;best=i;}
  }
  if(best<0)return false;
  const it=content.items[best];
  const def=WEAPONS[it.itemId]??ITEMS[it.itemId]??ACTIVE_ITEMS[it.itemId];
  const rarity=Math.max(1,def?.rarity??1);
  const amount=4+rarity*3+(it.isWeapon?3:0);
  content.items.splice(best,1);
  p.crumbs+=amount;engine.stats.breadStolen+=amount;
  engine.toast=`RECICLADO · +${amount} MIGAS`;engine.toastTimer=55;
  spawn(engine,it.x+8,it.y+8,'spark',8,'#d8bc70');playCoin();
  return true;
}

export function confirmEndlessReward(engine:GameEngine) {
  if(engine.state!==GameState.ENDLESS_REWARD) return;
  const e=engine.endless;
  if(e.marketOpen){buyEndlessMarket(engine);return;}
  if(!e.awaitingReward||!e.rewardOptions.length)return;
  const reward=e.rewardOptions[e.rewardIndex];if(!reward)return;
  if(reward.kind==='item'&&reward.itemId) grantItem(engine,reward.itemId,false,false);
  else if(reward.kind==='weapon'&&reward.itemId) {
    const ok=tryGiveWeapon(engine,reward.itemId,'endless',e.rewardIndex,CANVAS_WIDTH/2,CANVAS_HEIGHT/2);
    if(!ok) return;
  } else if(reward.kind==='heal') healPlayer(engine,reward.amount??1);
  else if(reward.kind==='crumbs'){const amount=reward.amount??10;engine.player.crumbs+=amount;engine.stats.breadStolen+=amount;playCoin();}
  e.rewardOptions=[];e.awaitingReward=false;playUiSelect();
  if(!openEndlessMarketIfNeeded(engine))queueNextEndlessRound(engine,42);
}

function endlessHazardLabel(kind:EndlessHazardKind) {
  return kind==='laser_cross'?'BARRIDO LÁSER':kind==='hot_corners'?'ESQUINAS EN LLAMAS':'ANILLO DE CHOQUE';
}

function chooseEndlessHazard(engine:GameEngine):EndlessHazardKind {
  const pool:EndlessHazardKind[]=['laser_cross','hot_corners'];
  if(engine.endless.alert>=4)pool.push('shock_ring');
  return pool[(engine.endless.round+engine.endless.alert+Math.floor(engine.frame/60))%pool.length];
}

function triggerEndlessHazard(engine:GameEngine,content:RoomContent,kind:EndlessHazardKind) {
  const px=engine.player.x+7,py=engine.player.y+8;
  if(kind==='laser_cross') {
    const horizontal=engine.endless.round%2===0;
    const points:number[]=[];
    for(let v=64;v<=(horizontal?CANVAS_WIDTH:CANVAS_HEIGHT)-64;v+=32)points.push(v);
    for(const v of points){
      const x=horizontal?v:CANVAS_WIDTH/2,y=horizontal?CANVAS_HEIGHT/2:v;
      if(dist(x,y,px,py)<42)continue;
      content.puddles.push({x,y,life:135,kind:'fire',radius:13});
    }
  } else if(kind==='hot_corners') {
    const pts=[[66,66],[CANVAS_WIDTH-66,66],[66,CANVAS_HEIGHT-66],[CANVAS_WIDTH-66,CANVAS_HEIGHT-66]];
    for(const [x,y] of pts)content.puddles.push({x,y,life:165,kind:'fire',radius:34});
  } else {
    for(let i=0;i<10;i++){
      const a=i/10*Math.PI*2;
      content.puddles.push({x:CANVAS_WIDTH/2+Math.cos(a)*92,y:CANVAS_HEIGHT/2+Math.sin(a)*76,life:150,kind:'fire',radius:15});
    }
  }
  engine.shakeIntensity=Math.max(engine.shakeIntensity,2.5);
  playDanger('camera');
}

function updateEndlessHazard(engine:GameEngine,content:RoomContent) {
  const e=engine.endless;
  if(e.alert<2||!e.roundActive)return;
  if((e.roundKind==='miniboss'||e.roundKind==='subboss'||e.roundKind==='boss')&&e.alert<4)return;
  if(e.hazardWarning>0){
    e.hazardWarning--;
    if(e.hazardWarning===0&&e.hazardKind){
      triggerEndlessHazard(engine,content,e.hazardKind);
      e.hazardCooldown=endlessHazardTiming(e.round,!!e.milestone).repeatCooldown;
      e.hazardKind=null;
    }
    return;
  }
  if(e.hazardCooldown>0){e.hazardCooldown--;return;}
  e.hazardKind=chooseEndlessHazard(engine);
  e.hazardWarning=endlessHazardTiming(e.round,!!e.milestone).warning;
  engine.toast=`PELIGRO · ${endlessHazardLabel(e.hazardKind)}`;
  engine.toastTimer=50;
  playDanger('camera');
}

function updateEndlessDirector(engine:GameEngine,room:MapRoom,content:RoomContent) {
  const e=engine.endless;
  if(engine.gameMode!=='endless'||engine.state!==GameState.PLAYING) return;
  if(!e.roundActive) {
    if(e.nextRoundTimer>0 && --e.nextRoundTimer<=0) startEndlessRound(engine);
    return;
  }
  if(content.endlessSweep){finishEndlessRound(engine);return;}
  const scale=endlessScale(e.round,engine.difficulty);
  updateEndlessHazard(engine,content);
  if(e.roundKind==='combat'||e.roundKind==='special') {
    e.pressure=Math.min(100,e.pressure+scale.pressureGain);
    e.spawnCooldown--;
    const pressureBoost=e.pressure>=75?2:e.pressure>=50?1:0;
    if(e.pendingEnemies.length&&content.enemies.length<scale.maxActive+pressureBoost&&e.spawnCooldown<=0) {
      const id=e.pendingEnemies.shift()!;
      const spots=freeTiles(room.layout,2).filter(s=>dist(s.x*TILE_SIZE,s.y*TILE_SIZE,engine.player.x,engine.player.y)>105);
      const spot=spots[Math.floor(random()*Math.max(1,spots.length))]??freeTiles(room.layout,2)[0];
      if(spot) {
        const sc=endlessDiffScale(engine);
        const forcedElite=e.special==='elite'||e.special==='red_protocol';
        const elite=!!ELITE_OK[id]&&(forcedElite||random()<Math.min(.9,scale.eliteChance+e.pressure*.0025));
        content.enemies.push(makeEnemy(id,sc,spot.x,spot.y,elite));
      }
      e.spawnCooldown=Math.max(10,scale.spawnDelay-Math.floor(e.pressure/18));
    }
    if(e.pressure>=100) {
      e.pressure=Math.min(77,62+endlessOverdrive(e.round)*3);playDanger('camera');engine.toast='PRESIÓN 100% · REFUERZOS';engine.toastTimer=70;
      const pool=Object.values(ENEMIES).filter(x=>x.minFloor<=Math.min(5,e.alert)&&x.damage>0);
      const def=pool[Math.floor(random()*pool.length)];
      const spot=freeTiles(room.layout,2).find(s=>dist(s.x*TILE_SIZE,s.y*TILE_SIZE,engine.player.x,engine.player.y)>120);
      if(def&&spot) content.enemies.push(makeEnemy(def.id,endlessDiffScale(engine),spot.x,spot.y,!!ELITE_OK[def.id]&&random()<.65));
    }
  }
  if((e.roundKind==='miniboss'||e.roundKind==='subboss'||e.roundKind==='boss')&&e.alert>=4) {
    // Bosses altos también castigan jugar excesivamente pasivo, sin acelerar sus telegraphs.
    const bossPressure=scale.pressureGain*(.22+Math.min(.30,e.alert*.025));
    e.pressure=Math.min(100,e.pressure+bossPressure);
    const supports=content.enemies.filter(x=>!x.isBoss).length;
    const supportCap=Math.min(3,1+Math.floor(e.alert/7)+(endlessOverdrive(e.round)>=3?1:0));
    if(e.pressure>=100&&supports<supportCap&&content.enemies.some(x=>x.isBoss)) {
      e.pressure=45;
      const pool=['policia_pato','policia_rapido',...(e.alert>=6?['dron_policial','policia_escopeta']:[])];
      const id=pool[Math.floor(random()*pool.length)];
      const spot=freeTiles(room.layout,2).find(s=>dist(s.x*TILE_SIZE,s.y*TILE_SIZE,engine.player.x,engine.player.y)>125);
      if(spot) {
        const elite=!!ELITE_OK[id]&&e.alert>=8&&random()<Math.min(.6,scale.eliteChance);
        content.enemies.push(makeEnemy(id,endlessDiffScale(engine),spot.x,spot.y,elite));
        engine.toast='REFUERZO DURANTE EL JEFE';engine.toastTimer=70;playDanger('camera');
      }
    }
  }
  if(!e.pendingEnemies.length&&content.enemies.length===0) finishEndlessRound(engine);
}

export function discover(engine:GameEngine,category:CollectionCategory,id:string) {
  if(engine.discovered[category].includes(id)) return false;
  engine.discovered[category].push(id);saveProgress(engine);return true;
}

function applyFloorPassives(engine:GameEngine) {
  const p=engine.player,b=getBuild(p);
  p.shield=b.floorShield;p.helmetShield=b.helmet>0;p.couponUsed=false;
  p.contactShield=b.contactShield;
  p.crumbs+=b.floorCrumbs;engine.stats.breadStolen+=b.floorCrumbs;
  applyMapItemEffects(engine,true);
}

/** Baja por la escalera → nuevo mapa, el pato conserva su build */
function descendStairs(engine: GameEngine) {
  const content = getContent(engine);
  if (!content.stairs?.unlocked) return;
  playStairs();
  engine.stats.floorsCleared++;
  engine.state = GameState.FLOOR_CLEAR;
  engine.floorClearTimer = 120;
  engine.onStateChange?.(engine.state);
}

function loadNextFloor(engine: GameEngine) {
  const idx = engine.map.floorIndex + 1;
  if (idx >= TOTAL_FLOORS) {
    if(engine.gameMode!=='daily'){
      engine.totalGoldenCrumbs+=100;engine.run.goldenEarned+=100;engine.stats.goldenCrumbs+=100;
      engine.madUnlocked=true;
      try {localStorage.setItem('duckheist_mad_bread_unlocked','1');} catch { /* sin almacenamiento */ }
      if(!engine.unlockedSkins.includes('golden')) engine.unlockedSkins.push('golden');
    }
    recordOutcome(engine,'victory');
    if(engine.gameMode==='heist')clearHeistCheckpoint(engine);
    engine.state = GameState.VICTORY;
    engine.endFrame=engine.frame;playQuack();
    engine.pauseIndex = 0;
    setMusic('menu');
    saveProgress(engine);
    engine.onStateChange?.(engine.state);
    return;
  }
  engine.map = generateMap(idx,engine.run.seed);
  engine.seenRoomKeys=[];engine.stainedFloor=-1;
  changeAlert(engine,10);
  engine.contents = new Map();
  engine.projectiles = []; engine.particles = []; engine.damageNumbers = [];
  engine.bossDefeatTimer = 0;
  engine.rewardDropTimer = 0;
  engine.swap = null;
  engine.swapGuard = 0;
  engine.pickupCard = null;
  engine.deathEchoes=[];engine.decoy=null;engine.hitStop=0;engine.tooltip={key:'',since:0};
  applyFloorPassives(engine);
  engine.run.floorReached = idx + 1;
  setMusic('run',idx);
  // vida restaurada parcialmente entre pisos
  engine.player.hp = Math.min(engine.player.maxHp, engine.player.hp + DIFFICULTIES[engine.difficulty].floorHeal);
  enterRoom(engine, engine.map.startKey, null);
  engine.floorIntroTimer = 110;
  engine.state = GameState.FLOOR_INTRO;
  engine.onStateChange?.(engine.state);
  if(engine.gameMode==='heist')saveHeistCheckpoint(engine);
}

export function enterRoom(engine: GameEngine, k: string, from: Dir | null) {
  const room = engine.map.rooms.get(k);
  if (!room) return;
  engine.currentKey = k;
  const firstVisit=!room.visited;
  if(firstVisit) {
    engine.seenRoomKeys.push(k);
    if(room.type===RoomType.COMBAT || room.type===RoomType.CHALLENGE) changeAlert(engine,.8);
  }
  if(from && engine.player.overdraftRemaining>0) {
    const payment=Math.min(5,engine.player.crumbs,engine.player.overdraftRemaining);
    engine.player.crumbs-=payment;engine.player.overdraftRemaining-=payment;
  }
  room.visited = true;
  applyDoorTiles(room);
  room.revealed=true;
  for(const dir of room.doors) {
    const v=DIR_VECTORS[dir],target=engine.map.rooms.get(key(room.gx+v.x,room.gy+v.y)),t=DOOR_TILE[dir];
    if(target?.type===RoomType.SECRET && !target.revealed) room.layout[t.y][t.x]=TILE_WALL;
  }
  const content = getContent(engine, k);
  engine.player.roomShield=getBuild(engine.player).roomShield;
  engine.player.firstHitUsed=false;
  if(getBuild(engine.player).reveal) {
    revealFrontier(engine);
  }
  engine.decoy=null;engine.tooltip={key:'',since:0};
  for(const enemy of content.enemies) discover(engine,enemy.isBoss?'bosses':'enemies',enemy.type);

  if (from) {
    const entry = OPPOSITE[from];
    const t = DOOR_TILE[entry];
    const inset = 1.15;
    let px = t.x * TILE_SIZE, py = t.y * TILE_SIZE;
    if (entry === 'N') py = TILE_SIZE * inset;
    if (entry === 'S') py = (ROOM_HEIGHT - 1 - inset) * TILE_SIZE;
    if (entry === 'W') px = TILE_SIZE * inset;
    if (entry === 'E') px = (ROOM_WIDTH - 1 - inset) * TILE_SIZE;
    engine.player.x = px + (TILE_SIZE - 16) / 2;
    engine.player.y = py + (TILE_SIZE - 16) / 2;
    engine.player.dir = entry === 'N' ? 'down' : entry === 'S' ? 'up' : entry === 'W' ? 'right' : 'left';
  } else {
    engine.player.x = CANVAS_WIDTH / 2 - 8;
    engine.player.y = CANVAS_HEIGHT / 2 - 8;
  }
  engine.player.vx = 0; engine.player.vy = 0;

  if (boxBlocked(room, engine.player.x, engine.player.y, 14, 16)) {
    const spot = freeTiles(room.layout, 1)[0];
    if (spot) { engine.player.x = spot.x * TILE_SIZE + 8; engine.player.y = spot.y * TILE_SIZE + 8; }
  }
  engine.projectiles = [];
  if(from) playDoorStyle((room.type===RoomType.BOSS||room.type===RoomType.SUBBOSS)?'boss':room.type===RoomType.ITEM?'gold':room.type===RoomType.SHOP?'green':room.type===RoomType.GUN_VAN?'orange':room.type===RoomType.TREASURE?'purple':'silver');

  if (!room.cleared && content.enemies.length > 0) {
    for (const d of room.doors) content.doorAnim[d] = 0;
    content.lockFlash = 40;
    playDoorLock();
  }

  const label = roomLabelFor(room);
  if (label) { engine.roomLabel = label; engine.roomLabelTimer = 95; }
  if(room.modifier && firstVisit) {
    engine.roomLabel=MODIFIER_LABELS[room.modifier];engine.roomLabelTimer=110;
    if(room.modifier==='alarm')changeAlert(engine,3);
  }
  applyMapItemEffects(engine,false);
  registerRoomDiscoveries(engine,content);
  if((room.type===RoomType.SHOP||room.type===RoomType.GUN_VAN) && (content.merchantUntil ?? 0)<engine.frame) merchantSpeak(engine,room.type===RoomType.GUN_VAN?pick(['Tres fierros. Cero preguntas.','La camioneta no existe.','Mira rápido y paga en migajas.','No preguntes de dónde salieron.']):pick(['Todo legal. Probablemente.','No tengo factura.','Eso cayó de un camión.','El pan está caro.','No hago devoluciones.','Ese objeto no estaba aquí ayer.']));

  const boss = content.enemies.find(e => e.isBoss && !!(BOSSES[e.bossType] ?? SUBBOSSES[e.bossType] ?? MINIBOSSES[e.bossType]));
  if (boss && !room.cleared) {
    const def = BOSSES[boss.bossType] ?? SUBBOSSES[boss.bossType] ?? MINIBOSSES[boss.bossType];
    if (def) {
      engine.bossIntroName = def.name;
      engine.bossIntroSubtitle = def.subtitle;
      const seen = !!engine.bossIntroSeen[boss.bossType];
      engine.bossIntroTimer = room.type === RoomType.BOSS ? (seen ? 70 : 165) : room.type === RoomType.SUBBOSS ? (seen ? 58 : 138) : (seen ? 46 : 108);
      engine.transition.active = false;
      engine.transition.timer = 0;
      engine.bossIntroSeen[boss.bossType] = true;
      if (room.type === RoomType.BOSS || room.type === RoomType.SUBBOSS) {
        playBossRoar();setMusic('boss');
      } else if(room.type===RoomType.MINIBOSS) {
        playBossPhase('mini');setMusic('event');
      }
      engine.state = GameState.BOSS_INTRO;
      engine.onStateChange?.(engine.state);
    }
  }
}

function roomLabelFor(room: MapRoom): string {
  switch (room.type) {
    case RoomType.ITEM: return 'SALA DE OBJETOS';
    case RoomType.TREASURE: return 'SALA DEL TESORO';
    case RoomType.SHOP: return 'TIENDA CLANDESTINA';
    case RoomType.GUN_VAN: return 'CAMIONETA DEL MERCADO NEGRO';
    case RoomType.CHALLENGE: return 'DESAFÍO';
    case RoomType.MINIBOSS: return 'MINIJEFE';
    case RoomType.SUBBOSS: return 'SUBJEFE';
    case RoomType.BOSS: return 'JEFE DE PISO';
    case RoomType.SECRET: return 'BÓVEDA SECRETA';
    case RoomType.START: return 'ENTRADA';
    case RoomType.EVENT:return 'UN ASUNTO PENDIENTE';
    case RoomType.CHOICE:return 'ELIGE TU BOTÍN';
    default: return room.cleared ? '' : 'SALA DE POLICÍAS';
  }
}

// ---------------------------------------------------------------------------
// EVENTO DE ALTO RIESGO
// ---------------------------------------------------------------------------
function dangerEventEnemyPool(floor:number): string[] {
  return [
    ['policia_pato','policia_rapido'],
    ['policia_pato','policia_rapido','policia_escopeta'],
    ['policia_rapido','policia_escopeta','dron_policial'],
    ['policia_escopeta','dron_policial','policia_francotirador'],
    ['policia_escopeta','dron_policial','policia_francotirador','policia_rapido'],
    ['policia_escopeta','dron_policial','policia_francotirador','policia_rapido'],
  ][clamp(floor,0,5)];
}

function spawnDangerEventSecurity(engine:GameEngine, room:MapRoom, content:RoomContent, count:number) {
  const floor=clamp(engine.map.floorIndex,0,5);
  const pool=dangerEventEnemyPool(floor);
  const spots=freeTiles(room.layout,2).filter(spot=>{
    const x=spot.x*TILE_SIZE+TILE_SIZE/2,y=spot.y*TILE_SIZE+TILE_SIZE/2;
    if(dist(x,y,engine.player.x+7,engine.player.y+8)<105) return false;
    if((room.doors ?? []).some(dir=>{const door=DOOR_TILE[dir];return Math.hypot(spot.x-door.x,spot.y-door.y)<2.7;})) return false;
    if(content.event && !content.event.used && dist(x,y,content.event.x,content.event.y)<56) return false;
    return true;
  });
  for(let i=0;i<count && spots.length;i++) {
    const index=Math.floor(random()*spots.length);
    const spot=spots.splice(index,1)[0];
    const type=pool[Math.floor(random()*pool.length)];
    content.enemies.push(makeEnemy(type,floorScale(engine.map.floorIndex,room.distance),spot.x,spot.y,false));
  }
}

function updateDangerEvent(engine:GameEngine) {
  if(engine.state!==GameState.PLAYING) return;
  const room=currentRoom(engine),content=getContent(engine);
  if(!(room.type===RoomType.EVENT && !content.cafe)) {
    if(engine.dangerEventMusic) {
      engine.dangerEventMusic=false;
      setMusic(room.type===RoomType.BOSS?'boss':'run',engine.map.floorIndex);
    }
    return;
  }
  if(content.dangerEventDone) {
    if(engine.dangerEventMusic) {engine.dangerEventMusic=false;setMusic('run',engine.map.floorIndex);}
    return;
  }
  const floor=clamp(engine.map.floorIndex,0,5);
  if(!content.dangerEventStarted) {
    content.dangerEventStarted=true;
    content.dangerEventActive=true;
    content.dangerEventTotal=(20+floor*2)*60;
    content.dangerEventTimer=content.dangerEventTotal;
    content.dangerEventWave=false;
    content.dangerEventPressure=0;
    spawnDangerEventSecurity(engine,room,content,4+(floor>=2?1:0)+(floor>=4?1:0));
    room.cleared=false;
    engine.roomLabel='EVENTO DE ALTO RIESGO';
    engine.roomLabelTimer=90;
    engine.shakeIntensity=Math.max(engine.shakeIntensity,2.5);
  }
  if(!content.dangerEventActive) return;
  engine.dangerEventMusic=true;
  setMusic('event',floor);
  room.cleared=false;
  if((content.dangerEventTimer ?? 0)>0) content.dangerEventTimer!--;
  const total=content.dangerEventTotal ?? 1,timer=content.dangerEventTimer ?? 0;
  const elapsed=total-timer;
  if(!content.dangerEventWave && elapsed>=total*.5) {
    content.dangerEventWave=true;
    spawnDangerEventSecurity(engine,room,content,2+(floor>=3?1:0));
    engine.roomLabel='¡REFUERZOS EN CAMINO!';engine.roomLabelTimer=72;
    engine.shakeIntensity=Math.max(engine.shakeIntensity,3);
  }
  if(timer>0 && content.enemies.length===0 && engine.frame>(content.dangerEventPressure ?? 0)) {
    content.dangerEventPressure=engine.frame+210;
    spawnDangerEventSecurity(engine,room,content,2+(floor>=4?1:0));
  }
  if(timer<=0 && content.enemies.length===0) {
    content.dangerEventActive=false;content.dangerEventDone=true;
    engine.dangerEventMusic=false;setMusic('run',floor);
    engine.toast='EVENTO SUPERADO';engine.toastTimer=90;
  }
}

// ---------------------------------------------------------------------------
// BUCLE DE ACTUALIZACIÓN
// ---------------------------------------------------------------------------
export function updateEngine(engine: GameEngine) {
  updateDangerEvent(engine);
  if(engine.state===GameState.MAP) return;
  engine.frame++;
  if(engine.state===GameState.HEIST_INTRO) {
    const elapsed=HEIST_INTRO_FRAMES-engine.heistIntroTimer;

    // Sonido diseñado para la coreografía mecánica de la bóveda.
    if(elapsed===16) playVaultIntroCue('motor');
    if(elapsed===38) playVaultIntroCue('unlock');
    if(elapsed===72) playVaultIntroCue('reveal');
    if(elapsed===108) playVaultIntroCue('ready');

    // La intro siempre puede verse completa, pero nunca obliga al jugador a
    // esperar: desde ~0.4 s Enter/Espacio/clic la llevan a un cierre corto.
    const wantsSkip=engine.keys['enter']||engine.keys[' ']||engine.mouseDown;
    if(wantsSkip&&elapsed>=HEIST_INTRO_SKIP_AFTER&&engine.heistIntroTimer>8){
      engine.heistIntroTimer=8;
      engine.mouseDown=false;
      engine.keys['enter']=false;
      engine.keys[' ']=false;
    }

    if(--engine.heistIntroTimer<=0) {
      engine.heistIntroSeen=true;
      if(engine.pendingMode==='endless')startEndlessGame(engine);
      else if(engine.pendingMode==='daily')startDailyChallenge(engine);
      else startGame(engine);
    }
    return;
  }
  if (engine.roomLabelTimer > 0) engine.roomLabelTimer--;
  if (engine.toastTimer > 0) engine.toastTimer--;
  if (engine.pickupCard && --engine.pickupCard.timer <= 0) engine.pickupCard = null;
  if(engine.synergyNotice && --engine.synergyNotice.timer<=0) engine.synergyNotice=null;

  if (engine.state === GameState.FLOOR_INTRO) {
    if (--engine.floorIntroTimer <= 0) { engine.state = GameState.PLAYING; engine.onStateChange?.(engine.state); }
    updateParticles(engine);
    return;
  }
  if (engine.state === GameState.BOSS_INTRO) {
    if (engine.keys['enter'] || engine.keys[' ']) engine.bossIntroTimer = Math.min(engine.bossIntroTimer, 6);
    if (--engine.bossIntroTimer <= 0) { engine.state = GameState.PLAYING; engine.onStateChange?.(engine.state); }
    return;
  }
  if (engine.state === GameState.ENDLESS_REWARD) return;
  if (engine.state === GameState.FLOOR_CLEAR) {
    if (--engine.floorClearTimer === 55) loadNextFloor(engine);
    return;
  }
  if (engine.state !== GameState.PLAYING) return;

  // Menú de reemplazo de arma u objeto activo abierto → el mundo espera
  if (engine.swap || engine.activeSwap) return;

  const player = engine.player;
  const room = currentRoom(engine);
  const content = getContent(engine);
  engine.run.time++;
  if(engine.gameMode==='daily')engine.daily.score=dailyScore(engine,'live');
  updateEndlessDirector(engine,room,content);
  if(engine.state!==GameState.PLAYING) return;
  updateTutorial(engine);
  // Antes el hit-stop detenía TODO el update del juego durante 1-8 frames.
  // Con daño mejorado, críticos o armas pesadas esto ocurría prácticamente en
  // cada impacto y se percibía como tirones/congelamientos al acertar disparos.
  // Conservamos el contador para feedback visual/eventos, pero nunca bloquea
  // movimiento, proyectiles, IA ni timers del gameplay.
  if(engine.hitStop>0) engine.hitStop--;
  engine.deathEchoes=engine.deathEchoes.filter(d=>--d.life>0);
  for(const d of engine.deathEchoes) {d.enemy.x+=d.vx;d.enemy.y+=d.vy;d.vx*=.88;d.vy*=.88;}
  const build=getBuild(player);
  if(content.securityTimer!==undefined && !content.modifierResolved) {
    const cameras=content.enemies.filter(e=>e.type==='security_camera');
    if(!cameras.length){content.modifierResolved=true;changeAlert(engine,-3);engine.toast='CÁMARAS DESACTIVADAS';engine.toastTimer=80;}
    else if(content.securityTimer>0 && --content.securityTimer===0){
      content.modifierResolved=true;changeAlert(engine,5);playDanger('camera');
      const spots=freeTiles(room.layout,2);
      for(let i=0;i<2;i++)if(spots[i])content.enemies.push(makeEnemy('policia_pato',floorScale(engine.map.floorIndex,room.distance),spots[i].x,spots[i].y,false));
      engine.toast='¡REFUERZOS EN CAMINO!';engine.toastTimer=100;
    }
  }
  if(content.alarmTimer!==undefined && content.alarmTimer>0) {
    content.alarmTimer--;
    if(content.alarmTimer%360===0 && content.enemies.length<8) {
      const spot=freeTiles(room.layout,2)[0];if(spot) content.enemies.push(makeEnemy('policia_pato',floorScale(engine.map.floorIndex,room.distance),spot.x,spot.y,false));
    }
  }
  for(const key of ['trayTimer','honeyTimer','healFlash','quackWave','comboTimer','chocolateTimer','dashHasteTimer','perfectBuff'] as const) if(player[key]>0) player[key]--;
  if(player.guardianCooldown>0) player.guardianCooldown=Math.max(0,player.guardianCooldown-build.cooldownRate);
  if(player.fireBoost>0 && --player.fireBoost===0) player.fireBoostPower=1;
  if(engine.decoy && --engine.decoy.life<=0) {
    const decoy=engine.decoy;engine.decoy=null;
    if(decoy.explosive) explode(engine,makeProjectile(decoy.x,decoy.y,0,0,'baguette',24,true,1,{explode:58}),content);
    if(decoy.stunOnExpire) {
      for(const enemy of content.enemies) {enemy.stunned=Math.max(enemy.stunned ?? 0,decoy.stunOnExpire);enemy.chargeTimer=0;enemy.recover=Math.max(enemy.recover,45);}
      spawn(engine,decoy.x,decoy.y,'spark',14,'#f4d03f');playDoorLock();
    }
  }

  if (engine.transition.active) {
    engine.transition.timer++;
    const half = engine.transition.total / 2;
    if (engine.transition.timer === Math.ceil(half) && engine.transition.targetKey) {
      enterRoom(engine, engine.transition.targetKey, engine.transition.dir);
      engine.transition.targetKey = null;
    }
    if (engine.transition.timer >= engine.transition.total) {
      engine.transition.active = false;
      engine.transition.dir = null;
    }
    updateParticles(engine);
    return;
  }

  // Mantener R para reiniciar la run
  if (engine.keys['r']) {
    engine.restartHold++;
    if (engine.restartHold >= RESTART_HOLD_FRAMES) {
      engine.restartHold = 0;
      engine.keys['r'] = false;
      restartCurrentMode(engine);
      return;
    }
  } else if (engine.restartHold > 0) {
    engine.restartHold = Math.max(0, engine.restartHold - 3);
  }

  if (player.switchAnim > 0) player.switchAnim--;

  // el foco del láser se relaja cuando dejas de mantarlo sobre un objetivo
  if (player.focusTime > 0 && engine.frame % 6 === 0) {
    player.focusTime--;
    if (player.focusTime === 0) player.focusTarget = -1;
  }

  // --- Movimiento (inercia de pato) ---
  let inX = engine.pad.connected?engine.pad.moveX:0, inY = engine.pad.connected?engine.pad.moveY:0;
  if (bound(engine,'moveUp')) inY = -1;
  if (bound(engine,'moveDown')) inY = 1;
  if (bound(engine,'moveLeft')) inX = -1;
  if (bound(engine,'moveRight')) inX = 1;
  const moveLength=Math.hypot(inX,inY);if(moveLength>1) {inX/=moveLength;inY/=moveLength;}

  let speedMult = build.speed;
  if(player.honeyTimer>0) speedMult*=1.1;
  if(player.dashHasteTimer>0) speedMult*=1+build.dashHaste;
  if(player.perfectBuff>0) speedMult*=1.05;
  if (player.speedBoost > 0) { speedMult *= 1.25; player.speedBoost--; }
  const accel=room.modifier==='waxed'?.32:.45,friction=room.modifier==='waxed'?.9:.82;

  if (player.dashTimer > 0) {
    player.dashTimer--;
    player.vx = player.dashDir.x * DASH_SPEED * build.dashDistance;
    player.vy = player.dashDir.y * DASH_SPEED * build.dashDistance;
    if(build.dashDamage>0) for(const enemy of [...content.enemies]) {
      if(player.dashHitIds.includes(enemy.id)) continue;
      if(dist(player.x+7,player.y+8,enemy.x+enemy.size/2,enemy.y+enemy.size/2)<enemy.size/2+20) {
        player.dashHitIds.push(enemy.id);damageEnemy(engine,enemy,build.dashDamage*(build.ghost?2:1),false,content);
      }
    }
    if (player.items.includes('smoke_feather') && engine.frame % 2 === 0) {
      spawn(engine, player.x + 7, player.y + 8, 'smoke', 1, '#8a94a0');
      content.puddles.push({x:player.x+7,y:player.y+8,life:120,kind:'smoke',radius:24});
    }
  } else {
    player.vx = (player.vx + inX * player.speed * speedMult * accel) * friction;
    player.vy = (player.vy + inY * player.speed * speedMult * accel) * friction;
    const max = player.speed * speedMult * 1.1;
    const sp = Math.hypot(player.vx, player.vy);
    if (sp > max) { player.vx = player.vx / sp * max; player.vy = player.vy / sp * max; }
    if (Math.abs(player.vx) < 0.08) player.vx = 0;
    if (Math.abs(player.vy) < 0.08) player.vy = 0;
  }

  // Cooldown de DASH con sonido de LISTO único
  if (player.dashCooldown > 0) {
    player.dashCooldown=Math.max(0,player.dashCooldown-build.cooldownRate);
    if (player.dashCooldown <= 0) {
      playDashReady();
      player.dashReadyFlash = 25;
    }
  }
  if (player.dashReadyFlash > 0) player.dashReadyFlash--;

  const nx = player.x + player.vx;
  const ny = player.y + player.vy;
  if (!boxBlocked(room, nx, player.y, 14, 16)) player.x = nx; else player.vx = 0;
  if (!boxBlocked(room, player.x, ny, 14, 16)) player.y = ny; else player.vy = 0;
  player.x = clamp(player.x, 4, CANVAS_WIDTH - 18);
  player.y = clamp(player.y, 4, CANVAS_HEIGHT - 20);
  player.moving = Math.hypot(player.vx, player.vy) > 0.35;
  if(player.moving && build.wetSocks && engine.frame%18===0) content.puddles.push({x:player.x+7,y:player.y+8,life:180,kind:'water',radius:23});
  if(player.moving && player.dashTimer<=0 && engine.frame%12===0) playFootstep();

  if (Math.abs(inX) > Math.abs(inY)) { if (inX > 0) player.dir = 'right'; else if (inX < 0) player.dir = 'left'; }
  else if (inY !== 0) player.dir = inY > 0 ? 'down' : 'up';

  if (player.hurtTimer > 0) player.hurtTimer--;
  if (player.iFrames > 0) player.iFrames--;
  if (player.flash > 0) player.flash--;
  if (player.shootFlash > 0) player.shootFlash--;

  // --- Disparo con el arma activa (sólo click izquierdo o flechas) ---
  if (player.fireCooldown > 0) player.fireCooldown=Math.max(0,player.fireCooldown-build.cooldownRate);
  if (player.overheat > 0) player.overheat--;
  if (!engine.mouseDown && player.heat > 0) player.heat = Math.max(0, player.heat - 1.2);
  if (engine.mouseDown && (activeWeapon(player).id === 'plasma_baker' || activeWeapon(player).id === 'golden_egg_revolver' || activeWeapon(player).id === 'baguette_sniper')) player.charge = Math.min(70, player.charge + 1);
  if (engine.coffeeCrash > 0) { engine.coffeeCrash--; player.speedBoost = Math.max(0, player.speedBoost); }
  let sx = 0, sy = 0;
  if (bound(engine,'shootLeft')) sx = -1;
  if (bound(engine,'shootRight')) sx = 1;
  if (bound(engine,'shootUp')) sy = -1;
  if (bound(engine,'shootDown')) sy = 1;
  if(engine.pad.connected && engine.pad.shoot && Math.hypot(engine.pad.aimX,engine.pad.aimY)>.18) {
    sx=engine.pad.aimX;sy=engine.pad.aimY;
  }
  if (engine.mouseDown && !sx && !sy) {
    const mx = engine.mouseX - (player.x + 7);
    const my = engine.mouseY - (player.y + 8);
    const md = Math.hypot(mx, my);
    if (md > 6) { sx = mx / md; sy = my / md; }
  }
  if ((sx || sy) && player.fireCooldown <= 0 && player.switchAnim <= 6) {
    fireWeapon(engine, sx, sy);
    const w=activeWeapon(player),synergyRate=w.id==='feather_gun'&&player.items.includes('oxxo_coffee')?1.3:1;
    const explosiveRate=w.explode?build.explosiveRate:1;
    player.fireCooldown = Math.max(2,Math.round(w.fireRate/(build.fireRate*explosiveRate*synergyRate*(player.fireBoost>0?player.fireBoostPower:1))));
    player.facingAngle=Math.atan2(sy,sx);
    const kick=w.id==='plasma_baker'?2.7:w.id==='baguette_launcher'?2.35:w.id==='breadcrumb_shotgun'?2.1:
      w.id==='baguette_sniper'?1.75:w.id==='rubber_duck_cannon'||w.id==='egg_cannon'||w.id==='golden_egg_revolver'?1.4:
      w.id==='quack_laser'||w.id==='feather_gun'||w.id==='homing_crumbs'?.55:.85;
    player.shootFlash = kick>2?6:kick>1.2?5:4;
    engine.shakeIntensity=Math.max(engine.shakeIntensity,kick);
    const muzzleColor=w.id==='baguette_launcher'?'#ffcf82':w.id==='tactical_toaster'?'#b9b09b':w.id==='plasma_baker'?'#ffe1a3':'#fff0b0';
    spawn(engine,player.x+7+sx*12,player.y+8+sy*12,'spark',kick>2?4:kick>1?3:1,muzzleColor);
    if (Math.abs(sx) > Math.abs(sy)) player.dir = sx > 0 ? 'right' : 'left';
    else if (sy !== 0) player.dir = sy > 0 ? 'down' : 'up';
    playShoot(activeWeapon(player).id);
  }

  // Cooldown de CUAC / OBJETO ACTIVO con sonido de LISTO único
  if (player.activeItemCooldown > 0) {
    player.activeItemCooldown=Math.max(0,player.activeItemCooldown-build.cooldownRate);
    if (player.activeItemCooldown <= 0) {
      playQuackReady();
      player.quackReadyFlash = 30;
    }
  }
  if (player.quackReadyFlash > 0) player.quackReadyFlash--;

  // --- Patito acompañante ---
  const duckCount=Math.min(4,build.companion+(build.family?2:0));
  const companionCount=duckCount+(build.chicken?1:0)+(build.bodyguard?1:0);
  while(player.companions.length<companionCount) player.companions.push({x:player.x,y:player.y,cooldown:0,damage:2});
  player.companions.forEach((child,i)=>{
    child.x=lerp(child.x,player.x-20+Math.cos(i*2)*16,.075);
    child.y=lerp(child.y,player.y+12+Math.sin(i*2)*16,.075);
    child.kind=i<duckCount?'duck':build.chicken&&i===duckCount?'chicken':'guard';
    child.damage=child.kind==='chicken'?5:child.kind==='guard'?2:i>=build.companion?2:i===0&&player.items.includes('mother_duck')?3:4;
    if(child.cooldown>0) child.cooldown--;
    const target=content.enemies.filter(e=>child.kind!=='chicken'||isPolice(e)).sort((a,b)=>dist(child.x,child.y,a.x,a.y)-dist(child.x,child.y,b.x,b.y))[0];
    const gang=build.bodyguard>0 && player.items.includes('pocket_duck');
    if(target && (child.kind!=='guard'||gang) && child.cooldown<=0 && dist(child.x,child.y,target.x,target.y)<210) {
      const a=Math.atan2(target.y-child.y,target.x-child.x);
      const proj=makeProjectile(child.x+8,child.y+8,Math.cos(a)*4,Math.sin(a)*4,'quack',child.damage,true,60);
      engine.projectiles.push(proj);
      if(random()<build.duplicates) engine.projectiles.push({...proj,vy:proj.vy+.25,hitEnemies:new Set()});
      child.cooldown=(child.kind==='chicken'?60:child.damage===3?32:48)*(gang?.75:1);
    }
  });
  player.ducklingX=player.companions[0]?.x ?? player.x;player.ducklingY=player.companions[0]?.y ?? player.y;

  if(build.aura>0 && engine.frame%60===0) {
    for(const enemy of [...content.enemies]) {
      const near=dist(player.x+7,player.y+8,enemy.x+enemy.size/2,enemy.y+enemy.size/2)<54;
      const nearChild=build.companion>0 && dist(player.ducklingX+8,player.ducklingY+8,enemy.x+enemy.size/2,enemy.y+enemy.size/2)<42;
      if(near || nearChild) damageEnemy(engine,enemy,build.aura,false,content);
    }
  }

  // --- Enemigos ---
  const enemySpeedMult = build.enemySpeed;
  for (const e of [...content.enemies]) {
    if(e.hp<=0) continue;
    if (e.hurtTimer > 0) e.hurtTimer--;
    if((e.buffTimer ?? 0)>0) e.buffTimer!--;
    if (e.spawnAnim > 0) { e.spawnAnim--; continue; }
    if (e.slowTimer > 0) e.slowTimer--;
    if (e.burn > 0) {
      e.burn--;
      if (engine.frame % 30 === 0) { damageEnemy(engine,e,2,false,content);spawn(engine,e.x+e.size/2,e.y,'spark',1,'#ff9f43'); }
    }
    if(e.hp<=0) continue;
    if((e.stunned ?? 0)>0) { e.stunned!--;continue; }
    if (e.isBoss) updateBossAI(engine, e, room, content);
    else updateEnemyAI(engine, e, room, content, enemySpeedMult);

    if (player.iFrames <= 0 && player.dashTimer <= 0 && e.behavior!=='camera' && e.behavior!=='mobileCam') {
      const cx=e.x+e.size/2,cy=e.y+e.size/2;
      const rx=(e.hitboxW ?? e.size)/2+7,ry=(e.hitboxH ?? e.size)/2+7;
      const dx=(player.x+7)-cx,dy=(player.y+8)-cy;
      if((dx*dx)/(rx*rx)+(dy*dy)/(ry*ry)<1){
        damagePlayer(engine,e.dmgMul,'contact',isPolice(e));
      }
    }
  }

  // --- Artillería aérea de jefes/subjefes ---
  // Antes estos ataques eran sólo óvalos de fuego dibujados en el suelo.
  // Ahora existe un telegraph, un proyectil que baja desde fuera de pantalla y
  // un impacto real exactamente en la zona marcada.
  if(content.airStrikes?.length){
    for(let i=content.airStrikes.length-1;i>=0;i--){
      const a=content.airStrikes[i];
      if(a.warning>0){
        a.warning--;
        if(a.warning===0) playDanger('charge');
        continue;
      }
      if(a.fall>0){
        a.fall--;
        if(a.fall===0&&!a.impacted){
          a.impacted=true;a.impact=14;
          const dx=(player.x+7)-a.x,dy=(player.y+8)-a.y;
          if(player.iFrames<=0&&player.dashTimer<=0&&dx*dx+dy*dy<a.radius*a.radius){
            damagePlayer(engine,a.damage,'projectile');
          }
          spawn(engine,a.x,a.y,'spark',a.variant==='heavy'?10:6,'#ffd477');
          spawn(engine,a.x,a.y,'smoke',a.variant==='heavy'?7:4,'#7a756a');
          engine.shakeIntensity=Math.max(engine.shakeIntensity,a.variant==='heavy'?3.2:2.0);
          playExplosion();
        }
        continue;
      }
      if(a.impact>0){a.impact--;continue;}
      content.airStrikes.splice(i,1);
    }
  }

  // --- Charcos ---
  for (let i = content.puddles.length - 1; i >= 0; i--) {
    const p = content.puddles[i];
    p.life--;
    if (p.life <= 0) { content.puddles.splice(i, 1); continue; }
    for (const e of [...content.enemies]) {
      if (dist(p.x, p.y, e.x + e.size / 2, e.y + e.size / 2) < (p.radius ?? 22)) {
        if(p.kind==='fire'||p.kind==='radiation') {if(engine.frame%30===0) damageEnemy(engine,e,p.kind==='radiation'?4:3,false,content);}
        else { e.slowTimer=12;e.slowPower=p.kind==='smoke'?.35:Math.min(.7,build.pond?.5+build.wetSocks:build.wetSocks||.5); }
      }
    }
  }

  updateProjectiles(engine, room, content);
  updateGrenades(engine, room, content, explode);
  if (engine.drone) {
    const d = engine.drone;
    d.life--;
    const target = content.enemies.filter(en => en.hp > 0).sort((a,b)=>dist(d.x,d.y,a.x,a.y)-dist(d.x,d.y,b.x,b.y))[0];
    if (target) {
      d.x += (target.x - d.x) * .04; d.y += (target.y - d.y) * .04;
      if (--d.cooldown <= 0) {
        const a = Math.atan2(target.y - d.y, target.x - d.x);
        engine.projectiles.push(makeProjectile(d.x, d.y, Math.cos(a) * 4, Math.sin(a) * 4, 'crumb', 4, true, 50));
        d.cooldown = 18;
      }
    }
    if (d.life <= 0) engine.drone = null;
  }
  if (engine.remoteBomb) engine.remoteBomb.life--;
  if (engine.remoteBomb && engine.remoteBomb.life <= 0) engine.remoteBomb = null;
  updateParticles(engine);

  for (let i = engine.damageNumbers.length - 1; i >= 0; i--) {
    const d = engine.damageNumbers[i];
    d.y -= 0.55; d.life -= 0.02;
    if (d.life <= 0) engine.damageNumbers.splice(i, 1);
  }

  // --- Recogidas ---
  const magnet=build.magnet;
  if(content.clearAge!==undefined) content.clearAge++;
  const autoMagnet=room.cleared && (content.clearAge ?? -1)>=24;
  const instantMagnet=player.items.includes('magnetic_crumbs')&&player.items.includes('golden_beak');
  for (let i = content.pickups.length - 1; i >= 0; i--) {
    const p = content.pickups[i];
    if((p.collectDelay ?? 0)>0) {p.collectDelay!--;continue;}
    if (p.lifetime < 99999 && !room.cleared) p.lifetime--;
    const isCoin = p.type === 'crumb' || p.type === 'golden_crumb';
    const sweep=!!p.forceMagnet;
    let d2 = dist(p.x, p.y, player.x + 7, player.y + 8);
    // Al cerrar una ronda, todo el botín visible viaja hasta el pato antes de resolverse.
    if ((isCoin||sweep) && (sweep||d2<magnet || autoMagnet || instantMagnet)) {
      if(!sweep&&build.king && !room.cleared && d2<65) {
        const a=engine.frame*.06+i*1.7;
        p.x=lerp(p.x,player.x+7+Math.cos(a)*32,.15);p.y=lerp(p.y,player.y+8+Math.sin(a)*32,.15);
        if(engine.frame%30===i%30) for(const enemy of [...content.enemies]) if(dist(p.x,p.y,enemy.x+enemy.size/2,enemy.y+enemy.size/2)<20) damageEnemy(engine,enemy,2,false,content);
        continue;
      }
      const a = Math.atan2(player.y + 8 - p.y, player.x + 7 - p.x)+Math.sin(engine.frame*.09+i)*(sweep?.06:.16);
      const maxSpeed=sweep?12:8,accel=sweep?.28:.16;
      p.vx=lerp(p.vx ?? 0,Math.cos(a)*Math.min(maxSpeed,d2*(sweep?.22:.15)+(sweep?3:2)),accel);
      p.vy=lerp(p.vy ?? 0,Math.sin(a)*Math.min(maxSpeed,d2*(sweep?.22:.15)+(sweep?3:2)),accel);
      p.x+=p.vx;p.y+=p.vy;
      d2=dist(p.x,p.y,player.x+7,player.y+8);
      if((autoMagnet||sweep) && engine.frame%4===i%4) spawn(engine,p.x,p.y,'spark',1,isCoin?'#e8c99b':'#ffb6c4');
    }
    if (d2 < 14) {
      if(!isCoin && player.hp>=player.maxHp) {
        if(p.sweepCollect){spawn(engine,p.x,p.y,'spark',4,'#ffb6c4');content.pickups.splice(i,1);}
        continue;
      }
      if (p.type === 'crumb') { player.crumbs += p.value; engine.stats.breadStolen += p.value; }
      else if (p.type === 'golden_crumb') {
        player.goldenCrumbs += p.value;
        engine.stats.goldenCrumbs += p.value;
        engine.run.goldenEarned += p.value;
        engine.totalGoldenCrumbs += p.value;
        saveProgress(engine);   // las monedas doradas se guardan al instante
      } else {
        healPlayer(engine, foodHeal(p.type));
        if(!engine.discovered.items.includes(p.type)) showPickupCard(engine,p.type,false);
        if (p.type === 'croissant') { player.speedBoost = 360; engine.toast = T.healSpeed; }
        else if (p.type === 'baguette') engine.toast = T.heal2;
        else if (p.type === 'torta') engine.toast = T.heal3;
        else if (p.type === 'pan_dorado') engine.toast = T.healFull;
        else if(p.type==='sandwich') engine.toast=T.heal2;
        else engine.toast = T.heal1;
        engine.toastTimer = 60;
        spawn(engine, p.x, p.y, 'spark', 6, '#ff8f9f');
      }
      if (isCoin) spawn(engine, p.x, p.y, 'spark', 4, '#f4d03f');
      if(isCoin) playCoin(); else playHeal();
      if(!isCoin && !p.sweepCollect && random()<build.keepFood) {p.collectDelay=75;spawn(engine,p.x,p.y,'spark',2,'#afd9ae');}
      else content.pickups.splice(i, 1);
      continue;
    }
    if (p.lifetime <= 0 && isCoin) content.pickups.splice(i, 1);
  }

  // --- Objetos en el suelo ---
  if (engine.swapGuard > 0) engine.swapGuard--;
  for (let i = content.items.length - 1; i >= 0; i--) {
    const it = content.items[i];
    if(it.vacuuming){
      const tx=player.x+7,ty=player.y+8,cx=it.x+8,cy=it.y+8,d2=dist(cx,cy,tx,ty);
      const a=Math.atan2(ty-cy,tx-cx)+Math.sin(engine.frame*.08+i)*.05;
      it.vx=lerp(it.vx??0,Math.cos(a)*Math.min(12,d2*.22+3),.28);
      it.vy=lerp(it.vy??0,Math.sin(a)*Math.min(12,d2*.22+3),.28);
      it.x+=it.vx;it.y+=it.vy;
      if(engine.frame%4===i%4)spawn(engine,it.x+8,it.y+8,'spark',1,'#d8bc70');
      if(dist(it.x+8,it.y+8,tx,ty)<16){
        const value=it.recycleValue??endlessRecycleValue(it);
        player.crumbs+=value;engine.stats.breadStolen+=value;
        spawn(engine,tx,ty,'spark',6,'#f4d03f');playCoin();
        content.items.splice(i,1);
      }
      continue;
    }
    if (dist(it.x + 8, it.y + 8, player.x + 7, player.y + 8) < 24 && bound(engine,'interact') && engine.swapGuard <= 0) {
      if (it.isWeapon) {
        if (!tryGiveWeapon(engine, it.itemId, 'floor', i, it.x, it.y)) {
          clearBound(engine,'interact');
          continue;   // se abre el menú de reemplazo; el arma sigue en el suelo
        }
      } else if (ACTIVE_ITEMS[it.itemId] && engine.player.activeItem && engine.player.activeItem !== it.itemId) {
        if (!offerActiveSwap(engine, it.itemId, 'floor', i, it.x, it.y)) { clearBound(engine,'interact'); continue; }
      } else {
        grantItem(engine, it.itemId, false, !!ACTIVE_ITEMS[it.itemId]);
      }
      spawn(engine, it.x + 8, it.y + 8, 'spark', 10, '#f4d03f');
      content.items.splice(i, 1);
      clearBound(engine,'interact');
    }
  }

  // --- Pedestales ---
  if (content.pedestal && !content.pedestal.taken) {
    const ped = content.pedestal;
    if (dist(ped.x + 12, ped.y, player.x + 7, player.y + 8) < 28 && bound(engine,'interact')) {
      let ok = true;
      if (ped.isWeapon) ok = tryGiveWeapon(engine, ped.itemId, 'pedestal', -1, ped.x, ped.y - 20);
      else if (ACTIVE_ITEMS[ped.itemId] && player.activeItem && player.activeItem !== ped.itemId) ok = offerActiveSwap(engine, ped.itemId, 'pedestal', -1, ped.x, ped.y);
      else grantItem(engine, ped.itemId, false, !!ACTIVE_ITEMS[ped.itemId]);
      if (ok) {
        ped.taken = true;
        spawn(engine, ped.x + 12, ped.y, 'spark', 20, '#f4d03f');
        engine.shakeIntensity = Math.max(engine.shakeIntensity, 2);
      }
      clearBound(engine,'interact');
    }
  }

  if(content.choices && !content.choiceTaken && !engine.swap) {
    for(let i=0;i<content.choices.length;i++) {
      const ped=content.choices[i];
      if(!ped.taken && dist(ped.x+12,ped.y,player.x+7,player.y+8)<28 && bound(engine,'interact')) {
        let ok=true;
        if(ped.isFood) {healPlayer(engine,foodHeal(ped.itemId));playHeal();}
        else if(ped.isWeapon) ok=tryGiveWeapon(engine,ped.itemId,'choice',i,ped.x,ped.y);
        else grantItem(engine,ped.itemId,false,!!ACTIVE_ITEMS[ped.itemId]);
        if(ok) {finishChoice(content);spawn(engine,ped.x+12,ped.y,'spark',14,'#cbaeef');}
        clearBound(engine,'interact');break;
      }
    }
  }
  if(content.event && !content.event.used && bound(engine,'interact') && dist(player.x+7,player.y+8,content.event.x+8,content.event.y+8)<40) {
    clearBound(engine,'interact');activateEvent(engine);
  }

  // --- Cofre ---
  if (content.chest && !content.chest.opened) {
    const c = content.chest;
    if (dist(player.x + 7, player.y + 8, c.x + 10, c.y + 8) < 28 && bound(engine,'interact')) {
      c.opened = true;
      clearBound(engine,'interact');
      content.items.push({ x: c.x - 6, y: c.y - 22, itemId: rollItem(engine), isWeapon: false, isActive: false });
      for (let i = 0; i < 6; i++) {
        content.pickups.push({ x: c.x + rng(-22, 22), y: c.y + rng(-18, 18), type: 'crumb', value: rngInt(2, 5), lifetime: 99999 });
      }
      if (random() < 0.3) content.pickups.push({ x: c.x + 24, y: c.y, type: 'hp', value: 1, lifetime: 99999 });
      spawn(engine, c.x + 10, c.y, 'coin', 14, '#f4d03f');
      engine.shakeIntensity = Math.max(engine.shakeIntensity, 2.5);
      playExplosion();
    }
  }

  // --- Tienda ---
  if (content.shopItems) {
    for (let si = 0; si < content.shopItems.length; si++) {
      const s = content.shopItems[si];
      if (s.sold) continue;
      if (dist(player.x + 7, player.y + 8, s.x, s.y) < 26 && bound(engine,'interact')) {
        const price=shopPrice(engine,s);
        if (player.crumbs >= price) {
          let ok = true;
          if (s.isFood && player.hp >= player.maxHp) {ok=false;engine.toast='VIDA COMPLETA';engine.toastTimer=60;playDeny();}
          else if (s.isWeapon) ok = tryGiveWeapon(engine, s.itemId, 'shop', si, s.x, s.y - 20);
          else if (ACTIVE_ITEMS[s.itemId] && player.activeItem && player.activeItem !== s.itemId) ok = offerActiveSwap(engine, s.itemId, 'shop', si, s.x, s.y);
          if (ok) {
            player.crumbs -= price;
            player.couponUsed=true;s.soldAt=engine.frame;s.sold = true;
            if (s.isFood) {healPlayer(engine,foodHeal(s.itemId));playHeal();}
            else if (!s.isWeapon && !ACTIVE_ITEMS[s.itemId]) grantItem(engine, s.itemId, false, false);
            if (!s.isFood && !s.isWeapon && ACTIVE_ITEMS[s.itemId] && !engine.activeSwap) grantItem(engine, s.itemId, false, true);
            spawn(engine, s.x, s.y, 'spark', 10, '#f4d03f');
            playEquip();merchantSpeak(engine,pick(['No hago devoluciones.','Buena elección. Creo.','No tengo factura.']));
          }
        } else {
          engine.toast = T.notEnough; engine.toastTimer = 70; playDeny();s.deniedUntil=engine.frame+40;
          if((content.merchantUntil ?? 0)<engine.frame) merchantSpeak(engine,pick(['Te faltan migajas.','Mira, pero no toques.']));
        }
        clearBound(engine,'interact');
      }
    }
  }

  // --- Escalera del jefe ---
  if (content.stairs) {
    content.stairs.glow = Math.min(1, content.stairs.glow + 0.02);
    if (content.stairs.unlocked) {
      const st = content.stairs;
      if (dist(player.x + 7, player.y + 8, st.x + 16, st.y + 16) < 34 && bound(engine,'interact')) {
        clearBound(engine,'interact');
        descendStairs(engine);
        return;
      }
    }
  }

  // Reposition only an enemy actually embedded in geometry, never through it.
  if (!room.cleared) {
    content.combatTimer++;
    if (content.combatTimer > 2400 && content.combatTimer % 90 === 0) {
      for (const e of content.enemies) {
        if (e.isBoss) continue;
        if(boxBlocked(room,e.x,e.y,e.size,e.size,e.flying)) {const spot=safeDrop(room,e.x,e.y);e.x=spot.x;e.y=spot.y;}
      }
    }
  }

  // --- Sala despejada ---
  if (engine.gameMode!=='endless' && !room.cleared && !content.dangerEventActive && content.enemies.length === 0 && (content.alarmTimer ?? 0)<=0) {
    room.cleared = true;
    content.clearAge=0;engine.hitStop=Math.max(engine.hitStop,2);
    const firstClear=!content.clearCounted;content.clearCounted=true;
    if(firstClear)engine.stats.roomsCleared++;
    content.lockFlash = 45;
    playDoorUnlock();
    playRoomClear();
    if(firstClear && (room.type===RoomType.COMBAT || room.type===RoomType.CHALLENGE)){
      if(!content.damaged){
        engine.roomStreak++;engine.toast='SALA PERFECTA';engine.toastTimer=90;
        if(!content.perfectAwarded&&random()<.25)content.pickups.push({x:CANVAS_WIDTH/2,y:192,type:random()<.85?'crumb':'hp',value:5,lifetime:99999});
        if(engine.roomStreak===3||engine.roomStreak===5){player.perfectBuff=600;engine.toast=engine.roomStreak===3?'3 SALAS · IMPECABLE':'5 SALAS · PROFESIONAL';engine.toastTimer=110;}
      }else engine.roomStreak=0;
      content.perfectAwarded=true;
      if(build.foodEvery&&engine.stats.roomsCleared%build.foodEvery===0)content.pickups.push({x:CANVAS_WIDTH/2,y:192,type:rollFood(),value:1,lifetime:99999});
    }
    applyMapItemEffects(engine,false);
    spawn(engine, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 'spark', 16, '#39d353');
    if (room.type === RoomType.COMBAT && random() < .07+getBuild(player).rewardChance*.5+engine.alert*.0003+(room.modifier==='alarm'?.03:0)) {
      content.items.push({ x: CANVAS_WIDTH / 2 - 8, y: CANVAS_HEIGHT / 2 - 8, itemId: rollItem(engine), isWeapon: false, isActive: false });
    }
    if (room.type === RoomType.CHALLENGE) {
      content.pickups.push({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 + 26, type: 'golden_crumb', value: 3, lifetime: 99999 });
      if(content.challenge==='alarm' || !content.damaged) content.items.push({x:CANVAS_WIDTH/2-8,y:150,itemId:rollBossRewardItem(engine),isWeapon:false,isActive:false});
    }
    if(content.event?.kind==='interrogation') content.items.push({x:CANVAS_WIDTH/2-8,y:155,itemId:rollBossRewardItem(engine),isWeapon:false,isActive:false});
    if(room.type===RoomType.BOSS) {content.rewardTimer=75;setMusic('run',engine.map.floorIndex);}
    if(room.type===RoomType.COMBAT && random()<.12) content.pickups.push({x:CANVAS_WIDTH/2,y:198,type:'hp',value:1,lifetime:99999});
  }

  for (const d of room.doors) {
    content.doorAnim[d] = lerp(content.doorAnim[d] ?? 0, room.cleared ? 1 : 0, 0.12);
  }
  if (content.lockFlash > 0) content.lockFlash--;

  // --- Recompensa del jefe + escalera ---
  if ((content.rewardTimer ?? 0) > 0) {
    content.rewardTimer!--;
    if (content.rewardTimer === 0 && room.type === RoomType.BOSS && !content.stairs) {
      const asWeapon = random() < 0.45;
      const pedestal:Pedestal = {
        x: CANVAS_WIDTH / 2 - 12, y: CANVAS_HEIGHT / 2 - 14,
        itemId: asWeapon ? rollWeapon(engine, true) : rollBossRewardItem(engine),
        isWeapon: asWeapon, taken: false, bossLoot: true,rise:0,
      };
      if(random()<.4) {
        content.choices=[{...pedestal,x:CANVAS_WIDTH/2-108,itemId:rollWeapon(engine,true),isWeapon:true},
          {...pedestal,x:CANVAS_WIDTH/2-12,itemId:rollBossRewardItem(engine),isWeapon:false},
          {...pedestal,x:CANVAS_WIDTH/2+84,itemId:'pan_dorado',isWeapon:false,isFood:true}];
      } else content.pedestal=pedestal;
      content.stairs = { x: CANVAS_WIDTH / 2 - 16, y: CANVAS_HEIGHT - TILE_SIZE * 2.6, unlocked: true, glow: 0 };
      spawn(engine, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 'spark', 30, '#f4d03f');
      engine.shakeIntensity = Math.max(engine.shakeIntensity, 4);
      engine.toast = T.bossLoot; engine.toastTimer = 130;
      playPickup();
    }
  }
  for(const ped of [content.pedestal,...(content.choices ?? [])]) if(ped && ped.rise!==undefined) ped.rise=Math.min(1,ped.rise+.045);
  registerRoomDiscoveries(engine,content);

  // --- Puertas ---
  if (room.cleared && !engine.transition.active) {
    for (const d of room.doors) {
      const t = DOOR_TILE[d];
      const cx = player.x + 7, cy = player.y + 8;
      const inDoor =
        (d === 'N' && cy < TILE_SIZE * 0.75 && Math.abs(cx - (t.x * TILE_SIZE + 16)) < 12) ||
        (d === 'S' && cy > CANVAS_HEIGHT - TILE_SIZE * 0.75 && Math.abs(cx - (t.x * TILE_SIZE + 16)) < 12) ||
        (d === 'W' && cx < TILE_SIZE * 0.75 && Math.abs(cy - (t.y * TILE_SIZE + 16)) < 12) ||
        (d === 'E' && cx > CANVAS_WIDTH - TILE_SIZE * 0.75 && Math.abs(cy - (t.y * TILE_SIZE + 16)) < 12);
      if (inDoor) {
        const v = DIR_VECTORS[d];
        const targetKey = key(room.gx + v.x, room.gy + v.y);
        if (engine.map.rooms.has(targetKey) && room.layout[t.y][t.x]===TILE_DOOR) {
          engine.transition = { active: true, timer: 0, total: 22, dir: d, targetKey };
        }
        break;
      }
    }
  }

  // --- Temblor ---
  if (engine.shakeIntensity > 0 && engine.settings.shake > 0) {
    const amp = engine.shakeIntensity * engine.settings.shake;
    engine.shakeX = rng(-amp, amp);
    engine.shakeY = rng(-amp, amp);
    engine.shakeIntensity *= 0.88;
    if (engine.shakeIntensity < 0.3) engine.shakeIntensity = 0;
  } else { engine.shakeX = 0; engine.shakeY = 0; engine.shakeIntensity = 0; }

  // --- Muerte ---
  if (player.hp <= 0) {
    if(engine.gameMode==='endless'){
      engine.endless.score+=engine.endless.round*10;
      saveEndlessRecord(engine);
      clearEndlessCheckpoint(engine);
    }
    recordOutcome(engine,'death');
    if(engine.gameMode==='heist')clearHeistCheckpoint(engine);
    engine.state = GameState.GAME_OVER;
    engine.swap=null;engine.mouseDown=false;engine.keys={};
    engine.endFrame=engine.frame;
    engine.pauseIndex = 0;
    setMusic('menu');
    spawn(engine, player.x + 7, player.y + 8, 'feather', 18, '#f9e547');
    saveProgress(engine);
    engine.onStateChange?.(engine.state);
  }
}

function rollBossRewardItem(engine: GameEngine): string {
  return pickPassive(engine,undefined,[],true) ?? fallbackActive(engine);
}

function revealFrontier(engine:GameEngine) {
  const visible=new Set<string>();
  for(const room of engine.map.rooms.values()) if(room.visited || room.revealed) {
    visible.add(key(room.gx,room.gy));
    if(room.visited) for(const dir of room.doors) {const v=DIR_VECTORS[dir];visible.add(key(room.gx+v.x,room.gy+v.y));}
  }
  const candidate=[...engine.map.rooms.values()].find(r=>r.type!==RoomType.SECRET && !visible.has(key(r.gx,r.gy)) &&
    r.doors.some(d=>{const v=DIR_VECTORS[d];return visible.has(key(r.gx+v.x,r.gy+v.y));}));
  if(candidate) candidate.revealed=true;
}

// ---------------------------------------------------------------------------
// ARMAS: inventario de dos huecos
// ---------------------------------------------------------------------------
/** Intenta dar un arma. Devuelve false si hay que abrir el menú de reemplazo. */
function tryGiveWeapon(engine: GameEngine, itemId: string, from: 'floor' | 'pedestal' | 'shop' | 'choice' | 'endless', srcIndex: number, wx: number, wy: number): boolean {
  if(!WEAPONS[itemId]) return false;
  const p = engine.player;
  const empty = p.weapons.findIndex(w => w === null);
  if (empty >= 0) {
    p.weapons[empty] = { ...WEAPONS[itemId] };
    if (empty === 0) p.activeWeapon = 0;
    else p.switchAnim = 10;   // la nueva arma se muestra, pero no te la cambia en pleno combate
    recordWeapon(engine,itemId);
    showPickupCard(engine, itemId, true);
    playEquip();
    return true;
  }
  // inventario lleno → elegir a quién reemplazar (nunca se fuerza)
  engine.swap = { itemId, slot: 0, from, srcIndex, worldX: wx, worldY: wy,roomKey:engine.currentKey };
  engine.mouseDown=false;
  engine.swapSel = 0;
  playDeny();
  return false;
}

export function cycleWeapon(engine: GameEngine, dir: number) {
  if(engine.state!==GameState.PLAYING || engine.swap || engine.transition.active) return;
  const p = engine.player;
  const owned = p.weapons.map((w, i) => (w ? i : -1)).filter(i => i >= 0);
  if (owned.length < 2) return;
  const cur = owned.indexOf(p.activeWeapon);
  const next = owned[(cur + (dir > 0 ? 1 : owned.length - 1)) % owned.length];
  p.activeWeapon = next;
  completeTutorial(engine,'wheel');
  p.switchAnim = 12;
  p.fireCooldown = Math.max(p.fireCooldown, 6);
  playWeaponSwap();
  showPickupCard(engine, p.weapons[next]!.id, true, true);
}

export function selectSwapSlot(engine: GameEngine, slot: number) {
  if (!engine.swap) return;
  engine.swapSel = clamp(slot, 0, 1);
  engine.swap.slot=engine.swapSel;
  playUiMove();
}

export function moveSwapSel(engine: GameEngine, d: number) {
  if (!engine.swap) return;
  engine.swapSel = engine.swapSel === 0 ? 1 : 0;
  playUiMove();
  void d;
}

export function confirmSwap(engine: GameEngine) {
  const req = engine.swap;
  if (!req) return;
  const p = engine.player;
  const content = getContent(engine);
  if(req.roomKey && req.roomKey!==engine.currentKey) {cancelSwap(engine);return;}
  const source=req.from==='endless'?{itemId:req.itemId}:req.from==='floor'?content.items[req.srcIndex]:req.from==='shop'?content.shopItems?.[req.srcIndex]:req.from==='choice'?content.choices?.[req.srcIndex]:content.pedestal;
  if(!source || source.itemId!==req.itemId || ('sold' in source && source.sold) || ('taken' in source && source.taken)) {cancelSwap(engine);return;}
  if(req.from==='shop' && p.crumbs<shopPrice(engine,content.shopItems![req.srcIndex])) {playDeny();cancelSwap(engine);return;}
  req.slot=engine.swapSel;
  const old = p.weapons[req.slot];
  p.weapons[req.slot] = { ...WEAPONS[req.itemId] };
  p.activeWeapon = req.slot;
  p.switchAnim = 14;
  recordWeapon(engine,req.itemId);

  // el arma reemplazada cae al suelo lejos del jugador (nunca se pierde)
  engine.swapGuard = 45;
  let dx = clamp(p.x, TILE_SIZE * 2, CANVAS_WIDTH - TILE_SIZE * 3);
  let dy = clamp(p.y + 40, TILE_SIZE * 2, CANVAS_HEIGHT - TILE_SIZE * 3);
  if (old && boxBlocked(currentRoom(engine), dx, dy, 16, 16)) {
    const spot = freeTiles(currentRoom(engine).layout, 2)[0];
    if (spot) { dx = spot.x * TILE_SIZE + 8; dy = spot.y * TILE_SIZE + 8; }
  }
  if (req.from === 'pedestal' && content.pedestal) content.pedestal.taken = true;
  if(req.from==='choice') finishChoice(content);
  if (req.from === 'shop' && content.shopItems?.[req.srcIndex]) content.shopItems[req.srcIndex].sold = true;
  if (req.from === 'floor') {
    content.items.splice(req.srcIndex, 1);
  }
  if (req.from === 'shop') {
    const s = content.shopItems?.[req.srcIndex];
    if (s) { p.crumbs -= shopPrice(engine,s);p.couponUsed=true;s.soldAt=engine.frame;merchantSpeak(engine,'No hago devoluciones.'); }
  }
  if (old && req.from!=='endless') content.items.push({ x: dx, y: dy, itemId: old.id, isWeapon: true, isActive: false });
  if(req.from==='endless'){
    engine.endless.rewardOptions=[];engine.endless.awaitingReward=false;
    if(!openEndlessMarketIfNeeded(engine))queueNextEndlessRound(engine,42);
  }

  engine.swap = null;
  clearBound(engine,'interact');engine.mouseDown=false;
  playEquip();
  showPickupCard(engine, req.itemId, true);
  spawn(engine, p.x + 7, p.y + 8, 'spark', 12, '#f4d03f');
}

export function cancelSwap(engine: GameEngine) {
  if (!engine.swap && !engine.activeSwap) return;
  engine.swap = null;
  engine.activeSwap = null;
  clearBound(engine,'interact');engine.mouseDown=false;
  playUiBack();
}

function offerActiveSwap(engine: GameEngine, itemId: string, from: 'floor' | 'pedestal' | 'shop' | 'choice', srcIndex: number, wx: number, wy: number): boolean {
  if (!engine.player.activeItem || engine.player.activeItem === itemId) {
    grantItem(engine, itemId, false, true);
    return true;
  }
  engine.activeSwap = { itemId, from, srcIndex, worldX: wx, worldY: wy, roomKey: engine.currentKey };
  engine.mouseDown = false;
  playDeny();
  return false;
}

export function confirmActiveSwap(engine: GameEngine) {
  const req = engine.activeSwap;
  if (!req) return;
  const p = engine.player;
  const content = getContent(engine);
  if (req.roomKey !== engine.currentKey) { cancelSwap(engine); return; }
  const previous = p.activeItem;
  grantItem(engine, req.itemId, false, true);
  if (previous && previous !== req.itemId) {
    const drop = safeDrop(currentRoom(engine), p.x + 18, p.y + 22);
    content.items.push({ x: drop.x, y: drop.y, itemId: previous, isWeapon: false, isActive: true });
  }
  if (req.from === 'floor' && content.items[req.srcIndex]?.itemId === req.itemId) content.items.splice(req.srcIndex, 1);
  if (req.from === 'pedestal' && content.pedestal) content.pedestal.taken = true;
  if (req.from === 'choice') finishChoice(content);
  if (req.from === 'shop' && content.shopItems?.[req.srcIndex]) {
    const s = content.shopItems[req.srcIndex];
    p.crumbs -= shopPrice(engine, s);
    p.couponUsed = true;
    s.sold = true;
  }
  engine.activeSwap = null;
  clearBound(engine,'interact');
  engine.mouseDown = false;
}

function showPickupCard(engine: GameEngine, id: string, isWeapon: boolean, quiet = false,forceNew=false) {
  const w = isWeapon ? WEAPONS[id] : null;
  const it = w ? null : (ITEMS[id] ?? ACTIVE_ITEMS[id] ?? FOODS[id]);
  engine.pickupCard = {
    name: w ? w.name : it?.name ?? id,
    desc: w ? w.description : it?.description ?? '',
    itemId: id, isWeapon,
    rarity: w ? w.rarity : it?.rarity ?? 0,
    timer: quiet ? 40 : 80,
    flavor:w?.flavor ?? it?.flavor,
    first:forceNew || (!quiet && discover(engine,isWeapon?'weapons':'items',id)),
  };
}

function recordWeapon(engine:GameEngine,id:string) {
  if(!engine.run.weaponIds.includes(id)) engine.run.weaponIds.push(id);
  engine.run.weaponsFound=engine.run.weaponIds.length;
  checkSynergies(engine,id);
}

/** Corazones que restaura cada comida */
function foodHeal(type: string): number {
  return FOODS[type]?.heal ?? 0;
}

function rollFood() {
  const n=random();
  return n<.01?'pan_dorado':n<.06?'torta':n<.2?'baguette':n<.4?'sandwich':n<.55?'croissant':'hp';
}

function healPlayer(engine: GameEngine, n: number) {
  const p = engine.player;
  if (n >= 99) p.hp = p.maxHp;
  else {
    const dailyHeal=engine.gameMode==='daily'&&engine.daily.modifiers.includes('NO_LUNCH')?.65:1;
    p.hp=Math.min(p.maxHp,p.hp+n*getBuild(p).healing*dailyHeal);
  }
  p.healFlash=36;
  if(getBuild(p).honey) p.honeyTimer=300;
  if(getBuild(p).chocolate) p.chocolateTimer=300;
}

export function grantItem(engine: GameEngine, itemId: string, _isWeapon=false, isActive=false) {
  const p = engine.player;
  if(!ITEMS[itemId] && !ACTIVE_ITEMS[itemId]) return;
  engine.run.items++;
  if(!engine.run.itemIds.includes(itemId)) engine.run.itemIds.push(itemId);
  if (isActive || ACTIVE_ITEMS[itemId]) {
    p.activeItem = itemId;
    p.activeItemCooldown = 0;
    p.activeItemMaxCooldown=ACTIVE_RULES[itemId]?.cooldown ?? 180;
  } else {
    if(!p.items.includes(itemId)) {
      p.items.push(itemId);
      const hearts=PASSIVE_RULES[itemId]?.maxHearts ?? 0;p.maxHp+=hearts;p.hp+=hearts;
      p.maxHp=Math.max(1,p.maxHp);p.hp=clamp(p.hp,.5,p.maxHp);
      if(itemId==='bread_helmet') p.helmetShield=true;
      if(PASSIVE_RULES[itemId]?.floorShield) p.shield+=PASSIVE_RULES[itemId].floorShield!;
      if(PASSIVE_RULES[itemId]?.contactShield) p.contactShield+=PASSIVE_RULES[itemId].contactShield!;
      if(itemId==='tactical_napkin') p.roomShield=1;
      if(itemId==='stolen_map') revealFrontier(engine);
      if(itemId==='crumb_bag') {p.crumbs+=10;engine.stats.breadStolen+=10;}
      if(itemId==='stolen_backpack') {p.crumbs+=8;engine.stats.breadStolen+=8;}
      if(itemId==='overdraft_card') {p.crumbs+=40;engine.stats.breadStolen+=40;p.overdraftRemaining+=40;}
    } else {p.crumbs+=5;engine.stats.breadStolen+=5;engine.toast='OBJETO REPETIDO · +5 MIGAJAS';engine.toastTimer=70;}
  }
  showPickupCard(engine, itemId, false);
  playRarityPickup((ITEMS[itemId]??ACTIVE_ITEMS[itemId]).rarity);
  checkSynergies(engine, itemId);
  applyMapItemEffects(engine,false);
  replaceOwnedOffers(engine,itemId);
}

function replaceOwnedOffers(engine:GameEngine,id:string) {
  if(!ITEMS[id]) return;
  for(const [roomId,content] of engine.contents) {
    if(roomId===engine.currentKey) continue;
    const offers=[...(content.choices ?? []),...(content.pedestal?[content.pedestal]:[]),...(content.shopItems ?? [])];
    for(const offer of offers) {
      if(offer.itemId!==id||('taken'in offer&&offer.taken)||('sold'in offer&&offer.sold)) continue;
      const replacement=pickPassive(engine,ITEMS[id].role);
      if(replacement) {offer.itemId=replacement;if('cost'in offer)offer.cost=ITEMS[replacement].cost;}
    }
  }
}

function registerRoomDiscoveries(engine:GameEngine,content:RoomContent) {
  for(const e of content.enemies) discover(engine,e.isBoss?'bosses':'enemies',e.type);
  for(const it of [...content.items,...(content.shopItems ?? []),...(content.choices ?? []),...(content.pedestal?[content.pedestal]:[])]) {
    if('taken'in it && it.taken)continue;
    if(FOODS[it.itemId])continue;
    if(discover(engine,it.isWeapon?'weapons':'items',it.itemId) && !engine.pickupCard) {
      showPickupCard(engine,it.itemId,it.isWeapon,false,true);
    }
  }
}

export function changeAlert(engine:GameEngine,amount:number) {
  engine.alert=clamp(engine.alert+amount*(amount>0?getBuild(engine.player).alertGrowth:1),0,100);
}

/** Detecta sinergias entre armas y objetos al conseguir algo nuevo */
function checkSynergies(engine: GameEngine, justGot: string) {
  const owned = new Set([
    ...engine.player.items,
    ...engine.player.weapons.filter(Boolean).map(w => w!.id),
    justGot,
  ]);
  for (const s of SYNERGIES) {
    if (s.requires.every(id => owned.has(id)) && !engine.knownSynergies.includes(s.id)) {
      engine.knownSynergies.push(s.id);
      discover(engine,'synergies',s.id);
      engine.synergyNotice={name:s.name,description:s.flavor,timer:125};
      spawn(engine, engine.player.x + 7, engine.player.y + 8, 'spark', 16, '#b06fe8');
      playEquip();
    }
  }
}

// ---------------------------------------------------------------------------
// PROYECTILES
// ---------------------------------------------------------------------------
function makeProjectile(
  x: number, y: number, vx: number, vy: number, type: string,
  damage: number, friendly: boolean, life: number, opts: Partial<Projectile> = {},
): Projectile {
  return {
    x, y, vx, vy, type, damage, friendly,
    lifetime: life, maxLifetime: life,
    bounces: 0, piercing: false, boomerang: false, boomerangPhase: 0,
    hitEnemies: new Set(), burning: false, explode: 0, focusTarget: -1, focusTime: 0,
    ...opts,
  };
}

function weaponRunStat(engine:GameEngine,id:string) {
  return engine.run.weaponStats[id] ?? (engine.run.weaponStats[id]={shots:0,damage:0,kills:0});
}
function trackWeaponDamage(engine:GameEngine,id:string|undefined,actual:number,killed=false) {
  if(!id||actual<=0)return;
  const stat=weaponRunStat(engine,id);stat.damage+=actual;if(killed)stat.kills++;
}

function fireWeapon(engine: GameEngine, dx: number, dy: number) {
  const p = engine.player;
  const w = activeWeapon(p);
  const b=getBuild(p);
  if (w.id === 'feather_gun' && p.overheat > 0) return;
  let piercingShot = w.piercing;
  let projRadius = b.uranium ? 6 : 3;
  const len = Math.hypot(dx, dy);
  if (!len) return;
  dx /= len; dy /= len;
  p.shotCounter++;
  weaponRunStat(engine,w.id).shots++;

  const continuous = w.continuous;
  const baseCount=(continuous?1:w.projectileCount)+(b.triple&&p.shotCounter%4===0?2:0);
  const count=baseCount*(b.twinCannon?2:1);

  for (let i = 0; i < count; i++) {
    let a = Math.atan2(dy, dx);
    if (count > 1) a += (i-(count-1)/2)*(w.spread || .15)/(b.twinCannon?1.6:1);
    if (!continuous) a += rng(-.045,.045)*b.accuracy;

    let type = w.projectileType;
    let dmg=(w.damage+b.damage)*b.damageScale*p.damageMultiplier*(b.debt?1+Math.min(.3,Math.floor(p.crumbs/10)*.01):1);
    if(b.twinCannon) dmg*=.7;
    if(b.crown) dmg*=1+Math.min(.3,Math.floor(p.crumbs/25)*.05);
    if(p.chocolateTimer>0) dmg*=1+b.chocolate;
    let burning = false;
    if (p.items.includes('toaster') && p.shotCounter % 5 === 0) { type = 'toast'; dmg *= 1.5; burning = true; }
    if (b.burn>0 || random()<b.burnChance || (w.id==='baguette_launcher'&&b.burnChance>0)) burning = true;
    if (w.id === 'feather_gun') {
      p.heat = Math.min(100, p.heat + 5);
      a += rng(-.035, .035) * (p.heat / 45);
      if (p.heat >= 100) { p.overheat = 34; p.heat = 74; }
    }
    if (w.id === 'plasma_baker' && p.charge > 20) {
      const charge = Math.min(1, p.charge / 55);
      // Rifle pesado .50: sostener la mira representa estabilizar el arma.
      dmg *= 1 + charge * .55;
      projRadius = 3 + charge * 2;
      if (charge > .55) piercingShot = true;
    }
    if (w.id === 'golden_egg_revolver' && p.charge > 24) {
      const steady=Math.min(1,p.charge/55);
      dmg *= 1 + steady*.30;
    }
    if (w.id === 'baguette_sniper' && p.charge > 18) {
      const steady=Math.min(1,p.charge/55);
      dmg *= 1 + steady*.22;
    }

    p.projectileCounter++;
    const bounces=w.bounces+b.bounces+(b.fifthBounce && p.projectileCounter%5===0?1:0)+(w.bounces>0 && (p.items.includes('butter') || p.items.includes('industrial_butter'))?2:0);
    const speed=w.projectileSpeed*b.projectileSpeed;
    const radius=(w.explode ?? 0)*(b.uranium?1.5:1)*Math.sqrt(b.explosionScale);

    const proj = makeProjectile(
      p.x + 7, p.y + 8,
      Math.cos(a)*speed, Math.sin(a)*speed,
      type, dmg, true, w.boomerang?62:continuous?46:w.projectileType==='buckshot_player'?26:80,
      {bounces,piercing:w.piercing,boomerang:w.boomerang,burning,explode:radius,sourceWeapon:w.id,baseSpeed:speed,
        penetration:b.penetration+(piercingShot&&w.id==='plasma_baker'?2:0),knockback:w.knockback,orbit:b.spiral?30:b.orbit?21:0,radius:projRadius,nuclear:b.uranium>0,damageScaled:true,bounceBoost:0,originDamage:dmg},
    );
    engine.projectiles.push(proj);
    proj.ricochetBoost=p.items.includes('industrial_butter');

    if (random()<b.duplicates) {
      engine.projectiles.push({ ...proj, hitEnemies: new Set(),bounces:proj.bounces, vx: proj.vx + rng(-0.45, 0.45), vy: proj.vy + rng(-0.45, 0.45) });
    }
  }

  const muzzleCount=w.id==='breadcrumb_shotgun'?5:w.id==='baguette_launcher'||w.id==='plasma_baker'?4:w.id==='rubber_duck_cannon'||w.id==='baguette_sniper'?3:2;
  const muzzleColor=w.id==='baguette_launcher'?'#ffcf82':w.id==='tactical_toaster'?'#c6baa1':w.id==='plasma_baker'?'#ffe0a3':'#fff1bf';
  spawn(engine,p.x+7+dx*10,p.y+8+dy*10,'spark',muzzleCount,muzzleColor);
  if(w.knockback>=2.4 || w.id==='breadcrumb_shotgun') {p.vx-=dx*.32*w.knockback;p.vy-=dy*.32*w.knockback;}
  if (w.knockback >= 4 || w.id === 'breadcrumb_shotgun') engine.shakeIntensity = Math.max(engine.shakeIntensity,w.id==='plasma_baker'?2.7:w.id==='baguette_launcher'?2.35:w.id==='breadcrumb_shotgun'?2.1:1.8);
  p.charge = 0;
}

function updateProjectiles(engine: GameEngine, room: MapRoom, content: RoomContent) {
  const player = engine.player;
  const build=getBuild(player);
  for (let i = engine.projectiles.length - 1; i >= 0; i--) {
    const p = engine.projectiles[i];
    if((p.orbit ?? 0)>0) {
      p.orbit!--;
      const angle=Math.atan2(p.vy,p.vx)+(21-p.orbit!)*.3;
      p.x=player.x+7+Math.cos(angle)*20;p.y=player.y+8+Math.sin(angle)*20;
      if(p.orbit===0 && build.spiral) {const speed=p.baseSpeed ?? 4;p.vx=Math.cos(angle)*speed;p.vy=Math.sin(angle)*speed;}
      continue;
    }

    if (p.boomerang) {
      p.lifetime--;
      if (p.boomerangPhase === 0 && p.lifetime < p.maxLifetime * 0.5) {p.boomerangPhase=1;p.hitEnemies.clear();playReturn();}
      if (p.boomerangPhase === 1) {
        const a = Math.atan2(player.y + 8 - p.y, player.x + 7 - p.x);
        p.vx = Math.cos(a) * ((p.baseSpeed ?? 4) + 1.4);
        p.vy = Math.sin(a) * ((p.baseSpeed ?? 4) + 1.4);
        if (dist(p.x, p.y, player.x + 7, player.y + 8) < 14) { engine.projectiles.splice(i, 1); continue; }
      }
    } else p.lifetime--;

    if (p.type === 'homing_crumb' && p.friendly) {
      let target:Enemy|undefined,best=Infinity;
      for(const en of content.enemies){
        if(en.hp<=0)continue;
        const dx=en.x+en.size/2-p.x,dy=en.y+en.size/2-p.y,d2=dx*dx+dy*dy;
        if(d2<best){best=d2;target=en;}
      }
      if (target) {
        const a = Math.atan2(target.y + target.size / 2 - p.y, target.x + target.size / 2 - p.x);
        p.vx = p.vx * .86 + Math.cos(a) * (p.baseSpeed ?? 3.6) * .14;
        p.vy = p.vy * .86 + Math.sin(a) * (p.baseSpeed ?? 3.6) * .14;
      }
    }
    p.x += p.vx; p.y += p.vy;
    if(!p.friendly && !p.reflectionTested && player.dashTimer>0 && build.reflectChance && dist(p.x,p.y,player.x+7,player.y+8)<25) {
      p.reflectionTested=true;
      if(random()<build.reflectChance) {p.friendly=true;p.vx*=-1;p.vy*=-1;p.damage=10;p.hitEnemies.clear();spawn(engine,p.x,p.y,'spark',4,'#aad9dd');continue;}
    }
    if(!p.friendly && build.bodyguard && player.guardianCooldown<=0) {
      const guard=player.companions.find(c=>c.kind==='guard');
      if(guard && (dist(p.x,p.y,guard.x+8,guard.y+8)<20 || dist(p.x,p.y,player.x+7,player.y+8)<20)) {
        player.guardianCooldown=720;spawn(engine,p.x,p.y,'spark',5,'#b7d2dd');engine.projectiles.splice(i,1);playHit();continue;
      }
    }
    if(!p.friendly && engine.decoy && dist(p.x,p.y,engine.decoy.x,engine.decoy.y)<13) {engine.projectiles.splice(i,1);continue;}
    if(!p.friendly && player.trayTimer>0 && dist(p.x,p.y,player.x+7,player.y+8)<30) {
      const angle=Math.atan2(p.y-player.y-8,p.x-player.x-7);
      if(Math.cos(angle-player.facingAngle)>.05) {spawn(engine,p.x,p.y,'spark',2,'#b9dadd');engine.projectiles.splice(i,1);continue;}
    }

    const tx = Math.floor(p.x / TILE_SIZE), ty = Math.floor(p.y / TILE_SIZE);
    const outside = tx < 0 || ty < 0 || tx >= ROOM_WIDTH || ty >= ROOM_HEIGHT;
    const tile = outside ? TILE_WALL : room.layout[ty][tx];
    const solid = outside || tile === TILE_WALL || tile >= OBSTACLE_BASE || (tile === TILE_DOOR && !room.cleared);
    if (solid) {
      if(p.friendly && tile===TILE_WALL) {
        const direction=room.doors.find(d=>DOOR_TILE[d].x===tx&&DOOR_TILE[d].y===ty);
        if(direction) {
          const v=DIR_VECTORS[direction],secret=engine.map.rooms.get(key(room.gx+v.x,room.gy+v.y));
          if(secret?.type===RoomType.SECRET && !secret.revealed) {secret.revealed=true;room.layout[ty][tx]=TILE_DOOR;engine.toast='¡BÓVEDA SECRETA!';engine.toastTimer=100;playDoorUnlock();}
        }
      }
      if (p.explode > 0) { explode(engine, p, content); engine.projectiles.splice(i, 1); continue; }
      if (p.bounces > 0 && !p.boomerang) {
        p.bounces--;
        if(p.ricochetBoost) {p.damage*=1.2;p.ricochetBoost=false;}
        if(p.type==='rubber_duck') p.damage *= 1.1;
        if(build.bounceDamage) {p.bounceBoost=Math.min(.6,(p.bounceBoost ?? 0)+build.bounceDamage);p.damage=(p.originDamage ?? p.damage)*(1+p.bounceBoost);}
        const prevX = p.x - p.vx, prevY = p.y - p.vy;
        if (Math.floor(prevX / TILE_SIZE) !== tx) p.vx *= -1; else p.vy *= -1;
        p.x = prevX; p.y = prevY;
        spawn(engine, p.x, p.y, 'spark', 3, '#dfe6ee');
        if(p.type==='rubber_duck') playBounce();
      } else {
        spawn(engine, p.x, p.y, 'hit', 4, p.friendly ? '#fff3b0' : '#ff9f9f');
        engine.projectiles.splice(i, 1);
        continue;
      }
    }

    if (p.lifetime <= 0) {
      if (p.explode > 0) explode(engine, p, content);
      engine.projectiles.splice(i, 1); continue;
    }

    if (p.friendly) {
      let removed = false;
      for (let ei=content.enemies.length-1;ei>=0;ei--) {
        const e=content.enemies[ei];
        if(!e||e.hp<=0) continue;
        if (p.hitEnemies.has(e.id)) continue;
        const ex=e.x+e.size/2,ey=e.y+e.size/2;
        const pr=p.radius ?? 4,dx=p.x-ex,dy=p.y-ey;
        const rx=(e.hitboxW ?? e.size)/2+pr,ry=(e.hitboxH ?? e.size)/2+pr;
        if ((dx*dx)/(rx*rx)+(dy*dy)/(ry*ry) > 1) continue;
        if(p.explode>0) {explode(engine,p,content);engine.projectiles.splice(i,1);removed=true;break;}

        if ((e.behavior === 'shielded' || e.bossType === 'ganso_antidisturbios') && e.recover <= 0) {
          const il = Math.hypot(p.vx, p.vy) || 1;
          const dot = Math.cos(e.shieldAngle) * (-p.vx / il) + Math.sin(e.shieldAngle) * (-p.vy / il);
          if (dot > (e.elite ? 0.15 : 0.3)) {
            spawn(engine, p.x, p.y, 'spark', 6, '#9fb0c4');
            engine.damageNumbers.push({ x: e.x + e.size / 2, y: e.y - 6, value: 0, life: 1, crit: false });
            playHit();
            if(p.sourceWeapon==='golden_egg_revolver') {
              const amount=Math.round(p.damage*.35),actual=Math.min(e.hp,amount);
              trackWeaponDamage(engine,p.sourceWeapon,actual,amount>=e.hp);
              damageEnemy(engine,e,amount,false,content);
            }
            p.hitEnemies.add(e.id);
            if (!p.piercing) { engine.projectiles.splice(i, 1); removed = true; }
            break;
          }
        }

        let dmg = p.damageScaled?p.damage:p.damage*player.damageMultiplier;
        // LÁSER CUAC: el daño sube mientras el haz se mantiene sobre el mismo objetivo
        if (p.type === 'quack_laser') {
          if (player.focusTarget === e.id) player.focusTime = Math.min(90, player.focusTime + 1);
          else { player.focusTarget = e.id; player.focusTime = 0; }
          dmg *= 1 + (player.focusTime / 90) * 2.2;
          if (player.focusTime > 55 && engine.frame % 4 === 0) {
            spawn(engine, e.x + e.size / 2, e.y, 'spark', 2, '#fff3b0');
          }
        }
        let crit = false;
        let critChance = p.sourceWeapon==='golden_egg_revolver' ? .18 : p.sourceWeapon==='baguette_sniper'||p.sourceWeapon==='plasma_baker' ? .08 : .05;
        critChance+=build.crit;
        if (random() < critChance) { dmg *= 2; crit = true; }
        if(crit && build.sneeze) {e.stunned=Math.max(e.stunned ?? 0,build.sneeze);e.fireCooldown=Math.max(45,e.fireCooldown);e.windup=0;e.chargeTimer=0;e.recover=40;}

        const final = Math.max(1, Math.floor(dmg));
        trackWeaponDamage(engine,p.sourceWeapon,Math.min(e.hp,final),final>=e.hp);
        damageEnemy(engine, e, final, crit, content);
        if((p.knockback ?? 0)>0 && e.hp>0) {
          const len=Math.hypot(p.vx,p.vy)||1;const k=(p.knockback ?? 1)*(e.isBoss?.4:1.5);
          moveEnemy(e,room,p.vx/len*k,p.vy/len*k);
        }
        // El peso del impacto se comunica con recoil, partículas, knockback y cámara,
        // no deteniendo la simulación completa.

        // SINERGIAS
        if (p.burning || (crit && build.spicyCrit)) e.burn = Math.max(e.burn, 180);
        if(build.slow>0) {e.slowTimer=120;e.slowPower=build.slow;}
        if(build.sticky) {e.stickyStacks=Math.min(.45,(e.stickyStacks ?? 0)+build.sticky*(p.type==='quack_laser'?2:1));e.slowTimer=180;e.slowPower=Math.max(e.slowPower ?? 0,e.stickyStacks);}
        if(crit && (build.goldCrit>0 || p.sourceWeapon==='golden_egg_revolver') && random()<.35) content.pickups.push({x:e.x+e.size/2,y:e.y+e.size/2,type:'crumb',value:1,lifetime:99999});
        if(crit && random()<build.critCoinChance) content.pickups.push({x:e.x+e.size/2,y:e.y+e.size/2,type:'crumb',value:1,lifetime:99999});
        if(crit && e.hp<=0 && build.confetti) {
          spawn(engine,e.x+e.size/2,e.y+e.size/2,'spark',9,'#ddb0dd');
          for(const other of [...content.enemies]) if(dist(e.x,e.y,other.x,other.y)<58) damageEnemy(engine,other,build.confetti,false,content);
        }
        if (p.type === 'quack_laser' && player.items.includes('golden_beak') && random() < 0.14) {
          content.pickups.push({ x: e.x + e.size / 2, y: e.y + e.size / 2, type: 'crumb', value: 1, lifetime: 600 });
        }
        if (p.explode > 0) { explode(engine, p, content); engine.projectiles.splice(i, 1); removed = true; break; }

        p.hitEnemies.add(e.id);
        if (p.piercing) continue;
        if((p.penetration ?? 0)>0) {p.penetration!--;continue;}
        spawn(engine,p.x,p.y,p.type==='breadcrumb'?'crumb':'hit',p.sourceWeapon==='feather_gun'?2:5);
        engine.projectiles.splice(i,1);removed=true;break;
      }
      if (removed) continue;
    } else if (player.iFrames <= 0 && player.dashTimer <= 0) {
      if (dist(p.x, p.y, player.x + 7, player.y + 8) < 10) {
        damagePlayer(engine, p.damage,'projectile');
        spawn(engine, p.x, p.y, 'hit', 4, '#ff9f9f');
        engine.projectiles.splice(i, 1);
      }
    }
  }
}

let lastExplosionSfxFrame=-999;
function explode(engine: GameEngine, p: Projectile, content: RoomContent, hurtPlayer = p.sourceWeapon !== 'bread_grenade') {
  const radius = p.explode;
  const nuclear=!!p.nuclear;

  // Mantiene una explosión visible, pero evita crear 30+ partículas por impacto
  // en builds rápidas/explosivas.
  spawn(engine, p.x, p.y, 'smoke', nuclear?5:7, nuclear?'#7b9566':'#d4a574');
  spawn(engine, p.x, p.y, 'crumb', nuclear?4:6, '#a67c52');
  spawn(engine, p.x, p.y, 'spark', nuclear?5:6, nuclear?'#b9ef79':'#ff9f43');

  if (p.burning) {
    content.puddles.push({ x: p.x, y: p.y, life: 180, kind:'fire',radius:32 });
    for (let i = 0; i < 3; i++) spawn(engine, p.x + rng(-20, 20), p.y + rng(-20, 20), 'spark', 1, '#ff6b3d');
  }

  const r2=radius*radius;
  for(let ei=content.enemies.length-1;ei>=0;ei--){
    const e=content.enemies[ei];
    if(!e||e.hp<=0)continue;
    const dx=p.x-(e.x+e.size/2),dy=p.y-(e.y+e.size/2);
    const rx=radius+(e.hitboxW??e.size)/2,ry=radius+(e.hitboxH??e.size)/2;
    if((dx*dx)/(rx*rx)+(dy*dy)/(ry*ry)<1){
      const shielded=e.behavior==='shielded' && e.recover<=0;
      const amount=Math.max(1,Math.round(p.damage*(shielded?.4:1)));
      trackWeaponDamage(engine,p.sourceWeapon,Math.min(e.hp,amount),amount>=e.hp);
      damageEnemy(engine,e,amount,false,content);
      if (p.burning) e.burn = Math.max(e.burn, 180);
      if(nuclear) {e.slowTimer=180;e.slowPower=.35;}
    }
  }

  if (hurtPlayer) {
    const dx=p.x-(engine.player.x+7),dy=p.y-(engine.player.y+8);
    if(dx*dx+dy*dy<r2) damagePlayer(engine,.5,'projectile');
  }

  engine.shakeIntensity = Math.max(engine.shakeIntensity, nuclear?3.2:4.2);
  // Varias explosiones del mismo frame comparten audio en vez de crear pares
  // de nodos WebAudio para cada proyectil.
  if(engine.frame-lastExplosionSfxFrame>=4){
    lastExplosionSfxFrame=engine.frame;
    playExplosion();
  }
}

function updateParticles(engine: GameEngine) {
  for (let i = engine.particles.length - 1; i >= 0; i--) {
    const p = engine.particles[i];
    p.x += p.vx; p.y += p.vy;
    p.vy += p.gravity;
    p.vx *= 0.97;
    p.life -= p.decay;
    if (p.life <= 0) engine.particles.splice(i, 1);
  }
}

// ---------------------------------------------------------------------------
// IA
// ---------------------------------------------------------------------------
function moveEnemy(e: Enemy, room: MapRoom, dx: number, dy: number) {
  const nx = e.x + dx, ny = e.y + dy;
  if (!boxBlocked(room, nx, e.y, e.size, e.size, e.flying)) e.x = nx;
  else e.moveAngle += Math.PI / 2 + rng(-0.4, 0.4);
  if (!boxBlocked(room, e.x, ny, e.size, e.size, e.flying)) e.y = ny;
  else e.moveAngle = -e.moveAngle + rng(-0.4, 0.4);
  e.x = clamp(e.x, TILE_SIZE * 0.6, CANVAS_WIDTH - TILE_SIZE * 0.6 - e.size);
  e.y = clamp(e.y, TILE_SIZE * 0.6, CANVAS_HEIGHT - TILE_SIZE * 0.6 - e.size);
}

function enemyShoot(engine: GameEngine, e: Enemy, ang: number, speed: number, type: string, jitter = 0, muzzleFx = true) {
  const a = ang + (e.elite ? jitter * 0.25 : jitter) + rng(-jitter, jitter);
  engine.projectiles.push(makeProjectile(e.x + e.size / 2, e.y + e.size / 2, Math.cos(a) * speed, Math.sin(a) * speed, type, e.behavior==='sniper'?2:1, false, e.behavior==='sniper'?145:110));
  // En ráfagas de jefes no generamos partículas por CADA proyectil. Antes una
  // espiral de 18 balas podía crear 36 partículas en el mismo frame, causando
  // un pico de trabajo perceptible como "trabón" aunque las balas sean pequeñas.
  if(muzzleFx) spawn(engine, e.x + e.size / 2 + Math.cos(a) * 8, e.y + e.size / 2 + Math.sin(a) * 8, 'spark', 2, '#ffd08a');
}

function updateEnemyAI(engine: GameEngine, e: Enemy, room: MapRoom, content: RoomContent, speedMult: number) {
  const player = engine.player;
  const px = engine.decoy?.x ?? player.x + 7, py = engine.decoy?.y ?? player.y + 8;
  const ex = e.x + e.size / 2, ey = e.y + e.size / 2;
  const d = dist(px, py, ex, ey);
  const ang = Math.atan2(py - ey, px - ex);
  const slow = e.slowTimer > 0 ? 1-(e.slowPower ?? .5) : 1;
  const sp = e.speed * speedMult * slow * ((e.buffTimer ?? 0)>0?1.1:1);
  const fireMult = player.items.includes('donut_bribe') ? 1.5 : 1;
  for (const other of content.enemies) {
    if (other === e || other.hp <= 0) continue;
    const gap = (e.size + other.size) * .42;
    const dx = ex - (other.x + other.size / 2), dy = ey - (other.y + other.size / 2);
    const dd = Math.hypot(dx, dy);
    if (dd > 0 && dd < gap) moveEnemy(e, room, (dx / dd) * .35, (dy / dd) * .35);
  }

  if (e.fireCooldown > 0) e.fireCooldown=Math.max(0,e.fireCooldown-((e.buffTimer ?? 0)>0?1.2:1));
  e.moveTimer--;

  switch (e.behavior) {
    case 'camera':break;
    case 'sniper': {
      if(e.fireCooldown>62){e.moveAngle=ang;e.telegraph=0;if(d<130)moveEnemy(e,room,-Math.cos(ang)*sp,-Math.sin(ang)*sp);}
      else if(e.fireCooldown>0){if(e.telegraph===0){e.moveAngle=ang;playDanger('aim');}e.telegraph=1-e.fireCooldown/70;}
      else {enemyShoot(engine,e,e.moveAngle,5,'drone_shot');e.fireCooldown=e.fireRate;e.telegraph=0;}
      break;
    }
    case 'medic': {
      e.healTimer=(e.healTimer ?? 100)-1;
      if(e.healTimer<=0){for(const ally of content.enemies)if(ally!==e&&!ally.isBoss&&dist(e.x,e.y,ally.x,ally.y)<100){ally.hp=Math.min(ally.maxHp,ally.hp+5);spawn(engine,ally.x+8,ally.y,'spark',2,'#8cd4ba');}e.healTimer=150;}
      if(d<100)moveEnemy(e,room,-Math.cos(ang)*sp,-Math.sin(ang)*sp);
      if(e.fireCooldown<24&&e.fireCooldown>0)e.telegraph=1-e.fireCooldown/24;
      if(e.fireCooldown<=0){enemyShoot(engine,e,ang,2.2,'pistol');e.fireCooldown=e.fireRate;e.telegraph=0;}
      break;
    }
    case 'captain': {
      for(const ally of content.enemies)if(ally!==e&&!ally.isBoss&&isPolice(ally)&&dist(e.x,e.y,ally.x,ally.y)<110)ally.buffTimer=30;
      if(d>120)moveEnemy(e,room,Math.cos(ang)*sp*.6,Math.sin(ang)*sp*.6);
      if(e.fireCooldown<35&&e.fireCooldown>0)e.telegraph=1-e.fireCooldown/35;
      if(e.fireCooldown<=0){for(const da of [-.12,.12])enemyShoot(engine,e,ang+da,2.8,'pistol');e.fireCooldown=e.fireRate;e.telegraph=0;}
      break;
    }
    case 'k9': {
      if(e.recover>0){e.recover--;e.telegraph=0;}
      else if((e.windup ?? 0)>0){e.windup!--;e.telegraph=1-e.windup!/48;if(e.windup===0)e.chargeTimer=24;}
      else if(e.chargeTimer>0){e.chargeTimer--;moveEnemy(e,room,Math.cos(e.moveAngle)*4.7,Math.sin(e.moveAngle)*4.7);if(e.chargeTimer===0)e.recover=75;}
      else {moveEnemy(e,room,Math.cos(ang)*sp*.7,Math.sin(ang)*sp*.7);if(e.moveTimer<=0){e.moveAngle=ang;e.windup=48;e.moveTimer=170;playDanger('charge');}}
      break;
    }
    case 'grenadier': {
      if (d < 90) moveEnemy(e, room, -Math.cos(ang) * sp, -Math.sin(ang) * sp);
      else if (d > 170) moveEnemy(e, room, Math.cos(ang) * sp * .5, Math.sin(ang) * sp * .5);
      else moveEnemy(e, room, Math.cos(ang + Math.PI / 2) * sp * .4, Math.sin(ang + Math.PI / 2) * sp * .4);
      if (e.fireCooldown < 36 && e.fireCooldown > 0) {
        e.telegraph = 1 - e.fireCooldown / 36;
        const lead = .35;
        const lx = clamp(px + player.vx * 8 * lead, 40, CANVAS_WIDTH - 40);
        const ly = clamp(py + player.vy * 8 * lead, 40, CANVAS_HEIGHT - 40);
        if (e.fireCooldown === 35) { playDanger('aim'); content.puddles.push({ x: lx, y: ly, life: 36, kind: 'smoke', radius: 18 }); }
      }
      if (e.fireCooldown <= 0) {
        const lead = .35;
        const lx = clamp(px + player.vx * 8 * lead, 40, CANVAS_WIDTH - 40);
        const ly = clamp(py + player.vy * 8 * lead, 40, CANVAS_HEIGHT - 40);
        explode(engine, makeProjectile(lx, ly, 0, 0, 'dough_ball', e.elite ? 2 : 1, false, 1, { explode: e.elite ? 42 : 32, sourceWeapon: 'grenadier' }), content, true);
        if (e.elite) explode(engine, makeProjectile(lx + 18, ly - 12, 0, 0, 'dough_ball', 1, false, 1, { explode: 22 }), content, true);
        e.fireCooldown = e.fireRate * fireMult; e.telegraph = 0;
      }
      break;
    }
    case 'baton': {
      const side = (e.id % 2 ? 1 : -1);
      const flank = ang + side * .9;
      if (e.recover > 0) { e.recover--; e.telegraph = 0; }
      else if ((e.windup ?? 0) > 0) { e.windup!--; e.telegraph = 1 - e.windup! / 20; if (e.windup === 0) { e.chargeTimer = 12; playDanger('charge'); } }
      else if (e.chargeTimer > 0) {
        e.chargeTimer--;
        moveEnemy(e, room, Math.cos(e.moveAngle) * 3.8, Math.sin(e.moveAngle) * 3.8);
        if (e.chargeTimer === 0) e.recover = e.elite ? 18 : 36;
      } else {
        if (d > 28) moveEnemy(e, room, Math.cos(flank) * sp, Math.sin(flank) * sp);
        if (d < 50 && e.moveTimer <= 0) { e.moveAngle = ang; e.windup = 20; e.moveTimer = 90; }
      }
      break;
    }
    case 'atm': {
      if (d < 110) moveEnemy(e, room, -Math.cos(ang) * sp, -Math.sin(ang) * sp);
      if (e.fireCooldown < 20 && e.fireCooldown > 0) e.telegraph = 1 - e.fireCooldown / 20;
      if (e.fireCooldown <= 0) {
        const n = e.elite ? 5 : 3;
        for (let i = 0; i < n; i++) enemyShoot(engine, e, ang + (i - (n - 1) / 2) * .18, 2.4, 'coin_proj');
        e.fireCooldown = e.fireRate * fireMult; e.telegraph = 0;
      }
      break;
    }
    case 'mobileCam': {
      if (e.moveTimer <= 0) { e.moveAngle += Math.PI / 2; e.moveTimer = 90; }
      moveEnemy(e, room, Math.cos(e.moveAngle) * sp, Math.sin(e.moveAngle) * sp);
      const seeing = Math.abs(Math.atan2(py - ey, px - ex) - e.moveAngle) < .7 && d < 160;
      e.healTimer = (e.healTimer ?? 0) + (seeing ? 1 : -2);
      if ((e.healTimer ?? 0) > 90) {
        e.healTimer = 0; playDanger('camera');
        const spot = freeTiles(room.layout, 2)[0];
        if (spot && content.enemies.length < 8) content.enemies.push(makeEnemy('policia_pato', floorScale(engine.map.floorIndex, room.distance), spot.x, spot.y, false));
      }
      break;
    }
    case 'chaser_shooter': {
      if (d > 70) moveEnemy(e, room, Math.cos(ang) * sp, Math.sin(ang) * sp);
      else if (d < 44) moveEnemy(e, room, -Math.cos(ang) * sp * 0.6, -Math.sin(ang) * sp * 0.6);
      else moveEnemy(e, room, Math.cos(ang + Math.PI / 2) * sp * 0.5, Math.sin(ang + Math.PI / 2) * sp * 0.5);
      // telegrafía 18 frames antes de disparar
      if (e.fireCooldown < 18 && e.fireCooldown > 0) e.telegraph = 1 - e.fireCooldown / 18;
      else if (e.fireCooldown === 0) e.telegraph = 0;
      if (e.fireCooldown <= 0 && d < 230) {
        enemyShoot(engine, e, ang, 2.7, 'pistol', e.elite ? 0.05 : 0.22);
        if (e.elite) enemyShoot(engine, e, ang + 0.12, 2.7, 'pistol', 0.05);
        e.fireCooldown = e.fireRate * fireMult;
      }
      break;
    }
    case 'swarmer': {
      if (e.moveTimer <= 0) { e.moveAngle = ang + rng(-1.1, 1.1); e.moveTimer = rngInt(16, 34); }
      const weave = Math.sin(engine.frame * 0.16 + e.id) * 0.7;
      moveEnemy(e, room, Math.cos(e.moveAngle + weave) * sp, Math.sin(e.moveAngle + weave) * sp);
      break;
    }
    case 'shotgunner': {
      if (d < 95) moveEnemy(e, room, -Math.cos(ang) * sp, -Math.sin(ang) * sp);
      else if (d > 165) moveEnemy(e, room, Math.cos(ang) * sp, Math.sin(ang) * sp);
      if (e.fireCooldown <= 44 && e.fireCooldown > 0) e.telegraph = 1 - e.fireCooldown / 44;
      else if (e.burst > 0) e.telegraph = 0.4;
      else e.telegraph = 0;
      if (e.burst > 0) {
        if (e.burstDelay <= 0) {
          for (let i = -2; i <= 2; i++) enemyShoot(engine, e, ang + i * 0.17, 3.1, 'buckshot');
          e.burst--;
          e.burstDelay = 26;
        }
        e.burstDelay--;
        break;
      }
      if (e.fireCooldown <= 0) {
        e.burst = e.elite ? 2 : 1;   // la élite dispara dos ráfagas
        e.burstDelay = 0;
        e.telegraph = 0;
        e.fireCooldown = e.fireRate * fireMult;
        engine.shakeIntensity = Math.max(engine.shakeIntensity, 1.6);
      }
      break;
    }
    case 'shielded': {
      // ANTIDISTURBIOS: escudo direccional con ventanas de vulnerabilidad
      // (rastreo lento → fijar dirección → cargar → recuperación)
      if (e.recover > 0) {
        // RECUPERACIÓN: escudo abajo, se recoloca lento
        e.recover--;
        e.telegraph = 0;
        moveEnemy(e, room, Math.cos(ang) * sp * 0.5, Math.sin(ang) * sp * 0.5);
      } else if((e.windup ?? 0)>0) {
        e.windup!--;
        e.telegraph=.2+.8*(1-e.windup!/60);
        if(e.windup===0) {e.moveAngle=e.shieldAngle;e.chargeTimer=e.elite?40:28;}
      } else if (e.chargeTimer > 0) {
        e.chargeTimer--;
        if (e.chargeTimer === 0) {
          e.recover = 46;            // ventana donde el escudo está desactivado
          e.telegraph = 0;
        } else {
          e.telegraph = e.chargeTimer > 20 ? 1 : e.chargeTimer / 20;
          // el escudo permanece FIJADO en shieldAngle durante la embestida
          moveEnemy(e, room, Math.cos(e.moveAngle) * sp * 4.4, Math.sin(e.moveAngle) * sp * 4.4);
        }
      } else {
        // sigue al jugador, pero el escudo gira lentamente (nunca rastrea perfecto)
        moveEnemy(e, room, Math.cos(ang) * sp, Math.sin(ang) * sp);
        const target = Math.atan2(py - (e.y + e.size / 2), px - (e.x + e.size / 2));
        let da = target - e.shieldAngle;
        while (da > Math.PI) da -= Math.PI * 2;
        while (da < -Math.PI) da += Math.PI * 2;
        e.shieldAngle += da * 0.06;
        if (e.moveTimer <= 0) {
          e.moveTimer = rngInt(140, 240);
          if (d < 220) {
            e.moveAngle = e.shieldAngle;   // carga hacia donde ya apunta el escudo
            e.windup=60;
            e.telegraph=.2;
          }
        }
      }
      break;
    }
    case 'drone': {
      const target = d > 120 ? 1 : d < 70 ? -0.7 : 0;
      const orbit = Math.sin(engine.frame * 0.03 + e.id) * 0.9;
      moveEnemy(e, room,
        Math.cos(ang) * sp * target + Math.cos(ang + Math.PI / 2) * sp * orbit,
        Math.sin(ang) * sp * target + Math.sin(ang + Math.PI / 2) * sp * orbit);
      if (e.burst > 0) {
        if (engine.frame % 7 === 0) {
          const spread = e.elite ? [-0.35, 0, 0.35] : [0];
          for (const s2 of spread) enemyShoot(engine, e, ang + s2, 3.4, 'drone_shot');
          e.burst--;
        }
      } else if (e.fireCooldown <= 0 && d < 270) {
        e.burst = e.elite ? 5 : 3;
        e.telegraph = 1;
        e.fireCooldown = e.fireRate * fireMult;
      }
      if (e.burst === 0 && e.telegraph > 0) e.telegraph = Math.max(0, e.telegraph - 0.06);
      break;
    }
    case 'chaser': {
      moveEnemy(e, room, Math.cos(ang) * sp, Math.sin(ang) * sp);
      break;
    }
    case 'shooter': {
      if (d < 84) moveEnemy(e, room, -Math.cos(ang) * sp, -Math.sin(ang) * sp);
      else if (d > 155) moveEnemy(e, room, Math.cos(ang) * sp * 0.6, Math.sin(ang) * sp * 0.6);
      if (e.fireCooldown <= 14 && e.fireCooldown > 0) e.telegraph = 1 - e.fireCooldown / 14;
      if (e.fireCooldown <= 0) {
        const shots = e.elite ? 3 : 1;
        for (let s2 = 0; s2 < shots; s2++) enemyShoot(engine, e, ang + (s2 - 1) * 0.14, 3, e.projectileType || 'coin_proj');
        e.fireCooldown = e.fireRate * fireMult;
        e.telegraph = 0;
      }
      break;
    }
    case 'turret': {
      if (e.fireCooldown <= 0) { enemyShoot(engine, e, ang, 3.4, e.projectileType || 'toast'); e.fireCooldown = e.fireRate * fireMult; }
      break;
    }
    case 'roller': {
      moveEnemy(e, room, Math.cos(e.moveAngle) * sp * 1.6, Math.sin(e.moveAngle) * sp * 1.6);
      if (e.x <= TILE_SIZE * 0.7 || e.x >= CANVAS_WIDTH - TILE_SIZE * 0.7 - e.size) e.moveAngle = Math.PI - e.moveAngle;
      if (e.y <= TILE_SIZE * 0.7 || e.y >= CANVAS_HEIGHT - TILE_SIZE * 0.7 - e.size) e.moveAngle = -e.moveAngle;
      break;
    }
  }
  void content;
}

const MAX_LIVE_BOSS_PROJECTILES=84;
function bossProjectileAllowance(engine:GameEngine,wanted:number) {
  // El presupuesto se calcula una sola vez por ráfaga. Evita tormentas de
  // proyectiles acumuladas sin meter un filter/reduce en cada bala.
  let hostile=0;
  for(const p of engine.projectiles) if(!p.friendly) hostile++;
  return Math.max(0,Math.min(wanted,MAX_LIVE_BOSS_PROJECTILES-hostile));
}
function bossRing(engine:GameEngine,boss:Enemy,count:number,speed:number,type:string,offset=0) {
  const allowed=bossProjectileAllowance(engine,count);
  if(allowed<=0)return;
  for(let i=0;i<allowed;i++) {
    // Si entra el presupuesto de seguridad, distribuimos las balas permitidas
    // por todo el anillo; nunca dejamos un "hueco" artificial en un solo lado.
    const sourceIndex=Math.floor(i*count/allowed);
    enemyShoot(engine,boss,(sourceIndex/count)*Math.PI*2+offset,speed,type,0,i===0);
  }
}
function bossFan(engine:GameEngine,boss:Enemy,angle:number,count:number,spread:number,speed:number,type:string) {
  const allowed=bossProjectileAllowance(engine,count);
  if(allowed<=0)return;
  const mid=(count-1)/2;
  const start=Math.floor((count-allowed)/2);
  for(let j=0;j<allowed;j++) {
    const i=start+j;
    enemyShoot(engine,boss,angle+(i-mid)*spread,speed+(i%2)*.18,type,0,j===0);
  }
}
function queueBossAirStrike(
  content:RoomContent,x:number,y:number,radius=18,
  variant:'shell'|'heavy'|'rapid'='shell',warning=42
) {
  const list=content.airStrikes??(content.airStrikes=[]);
  // Evita llenar la misma zona con telegraphs idénticos en el mismo frame.
  if(list.some(a=>!a.impacted&&Math.hypot(a.x-x,a.y-y)<10))return;
  list.push({
    x:clamp(x,38,CANVAS_WIDTH-38),
    y:clamp(y,42,CANVAS_HEIGHT-38),
    warning,
    warningTotal:warning,
    fall:variant==='heavy'?24:variant==='rapid'?13:18,
    fallTotal:variant==='heavy'?24:variant==='rapid'?13:18,
    impact:0,
    radius,
    damage:variant==='heavy'?1.5:1,
    variant,
  });
}

function bossHazardRing(content:RoomContent,x:number,y:number,count:number,radius:number,life=150) {
  const warning=Math.max(30,Math.min(54,Math.round(life*.26)));
  for(let i=0;i<count;i++) {
    const a=(i/count)*Math.PI*2;
    queueBossAirStrike(
      content,
      x+Math.cos(a)*radius,
      y+Math.sin(a)*radius,
      16+(i%2)*3,
      i%3===0?'heavy':'shell',
      warning+(i%2)*5
    );
  }
}
function bossSupport(engine:GameEngine,room:MapRoom,content:RoomContent,pool:string[],max:number) {
  if(content.enemies.length>=max) return;
  const spot=freeTiles(room.layout,2).find(s=>dist(s.x*TILE_SIZE,s.y*TILE_SIZE,engine.player.x,engine.player.y)>95);
  if(spot) content.enemies.push(makeEnemy(pick(pool),floorScale(engine.map.floorIndex,room.distance),spot.x,spot.y,false));
}

function bossRoleSignature(
  engine:GameEngine,boss:Enemy,room:MapRoom,content:RoomContent,def:BossDef,
  phase:number,tier:'mini'|'sub'|'boss',ang:number,step:number
){
  if(tier==='mini')return;
  const bx=boss.x+boss.size/2,by=boss.y+boss.size/2;
  const px=engine.player.x+7,py=engine.player.y+8;
  const v=def.roleVariant??0;
  const power=tier==='boss'?1.18:1;
  const p=def.pattern;
  const proj=phase>0?p.altProjectile:p.projectile;

  // Una segunda firma independiente de la familia. Esto impide que dos jefes
  // de, por ejemplo, tecnología terminen sintiéndose como el mismo combate.
  switch(def.role){
    case 'artillery': {
      const n=(tier==='boss'?4:3)+Math.min(2,phase);
      for(let i=0;i<n;i++){
        const a=(i/n)*Math.PI*2+(v*.31)+(step%2)*.22;
        const r=34+i*14+phase*5;
        queueBossAirStrike(content,
          clamp(px+Math.cos(a)*r,40,CANVAS_WIDTH-40),
          clamp(py+Math.sin(a)*r,40,CANVAS_HEIGHT-40),
          16+phase*2,i===0?'heavy':i%2?'shell':'rapid',31+i*5);
      }
      break;
    }
    case 'duelist':
      bossFan(engine,boss,ang+(v-1.5)*.035,1+phase,.018,4.7*power,proj);
      boss.moveAngle=ang+(step%2?1:-1)*Math.PI/2;
      boss.moveTimer=Math.max(boss.moveTimer,10+phase*3);
      break;
    case 'bulwark':
      bossRing(engine,boss,6+phase*2,1.85+phase*.12,proj,engine.frame*.014+v*.2);
      if(phase>0)bossFan(engine,boss,ang,3,.19,2.55,p.altProjectile);
      break;
    case 'swarm':
      bossSupport(engine,room,content,p.support,tier==='boss'?7+phase:5+phase);
      bossRing(engine,boss,5+phase,2.15,proj,engine.frame*.018+v);
      break;
    case 'sniper':
      bossFan(engine,boss,ang,1,.008,5.5+phase*.35,p.altProjectile);
      if(phase>=1)bossFan(engine,boss,ang+(step%2?.12:-.12),1,.008,5.0,proj);
      break;
    case 'storm':
      bossRing(engine,boss,7+phase*2,2.75+phase*.18,proj,engine.frame*(.045+v*.002));
      bossRing(engine,boss,5+phase,2.05,p.altProjectile,-engine.frame*(.032+v*.002)+.35);
      break;
    case 'warden': {
      const n=4+phase*2;
      for(let i=0;i<n;i++){
        const a=i/n*Math.PI*2+v*.17;
        queueBossAirStrike(content,
          clamp(px+Math.cos(a)*(52+phase*8),42,CANVAS_WIDTH-42),
          clamp(py+Math.sin(a)*(52+phase*8),42,CANVAS_HEIGHT-42),
          14+phase*2,'shell',38+i*3);
      }
      bossFan(engine,boss,ang,3,.11,3.25,proj);
      break;
    }
    case 'charger':
      bossFan(engine,boss,ang,5+phase*2,.18,3.0,'buckshot');
      boss.moveAngle=ang;
      boss.moveTimer=Math.max(boss.moveTimer,(tier==='boss'?30:24)+phase*7);
      playDanger('charge');
      break;
    case 'vortex':
      bossRing(engine,boss,8+phase*2,2.35+phase*.15,proj,engine.frame*.055+v*.23);
      bossRing(engine,boss,8+phase*2,1.65+phase*.1,p.altProjectile,-engine.frame*.041-v*.19);
      break;
    case 'executioner':
      bossFan(engine,boss,ang,3+phase*2,.055,4.2+phase*.25,p.altProjectile);
      queueBossAirStrike(content,
        clamp(px+Math.cos(ang)*18,42,CANVAS_WIDTH-42),
        clamp(py+Math.sin(ang)*18,42,CANVAS_HEIGHT-42),
        20+phase*3,'heavy',34);
      break;
    case 'reactor':
      bossRing(engine,boss,10+phase*3,2.2+phase*.18,proj,engine.frame*.032);
      bossHazardRing(content,bx,by,5+phase*2,42+phase*14,135+phase*20);
      break;
    case 'trickster': {
      const spots=freeTiles(room.layout,2).filter(t=>{
        const x=t.x*TILE_SIZE+TILE_SIZE/2,y=t.y*TILE_SIZE+TILE_SIZE/2;
        return dist(x,y,px,py)>115&&dist(x,y,bx,by)>70;
      });
      const spot=spots[(step*5+v*7)%Math.max(1,spots.length)];
      if(spot){
        spawn(engine,bx,by,'smoke',5,def.accent);
        boss.x=spot.x*TILE_SIZE+(TILE_SIZE-boss.size)/2;
        boss.y=spot.y*TILE_SIZE+(TILE_SIZE-boss.size)/2;
      }
      const na=Math.atan2(py-(boss.y+boss.size/2),px-(boss.x+boss.size/2));
      bossFan(engine,boss,na-.28,3,.07,3.7,proj);
      bossFan(engine,boss,na+.28,3,.07,3.7,p.altProjectile);
      break;
    }
  }
}

function bossSignatureAttack(engine:GameEngine,boss:Enemy,room:MapRoom,content:RoomContent,def:BossDef,phase:number,tier:'mini'|'sub'|'boss',ang:number,step:number) {
  const bx=boss.x+boss.size/2,by=boss.y+boss.size/2;
  const px=engine.player.x+7,py=engine.player.y+8;
  const accent=def.accent||'#f4d03f',secondary=def.secondary||accent;
  const tierFx=tier==='boss'?10:tier==='sub'?7:5;

  // Cada ataque importante tiene una firma audiovisual propia del jefe.
  spawn(engine,bx,by,'spark',tierFx+phase*2,step%2?secondary:accent);
  if(tier!=='mini') engine.shakeIntensity=Math.max(engine.shakeIntensity,(tier==='boss'?1.9:1.2)+phase*.35);

  // Las firmas extra no salen en cada patrón: entran con mayor frecuencia al
  // avanzar de fase para que el combate escale sin convertirse en una pared de balas.
  const cadence=tier==='boss'?(phase>=2?2:phase?3:4):tier==='sub'?(phase?3:4):(phase?4:5);
  if(step%cadence!==cadence-1)return;

  const projectile=phase>0?def.pattern.altProjectile:def.pattern.projectile;
  const extra=def.finalBoss?2:0;
  switch(def.family){
    case 'command':
      // Orden de supresión: dos alas convergen sobre la ruta del jugador.
      bossFan(engine,boss,ang-.5,3,.08,3.15+phase*.18,'enemy_bullet');
      bossFan(engine,boss,ang+.5,3,.08,3.15+phase*.18,'enemy_bullet');
      if(phase>=2)bossSupport(engine,room,content,def.pattern.support,7+extra);
      break;
    case 'finance':
      // Embargo: monedas lentas cierran espacio mientras los maletines castigan el centro.
      bossRing(engine,boss,6+phase*2+extra,2.05+phase*.15,'coin_proj',engine.frame*.021);
      bossFan(engine,boss,ang,3+phase,.12,3.35,'briefcase');
      break;
    case 'bakery':
      // Horno vivo: brasas alrededor del objetivo y masa atravesando el hueco.
      bossHazardRing(content,px,py,4+phase+extra,48+phase*9,120+phase*25);
      bossFan(engine,boss,ang,3+phase*2,.18,2.85+phase*.16,'dough_ball');
      break;
    case 'tech':
      // Sobrecarga: pulsos contrarrotatorios fáciles de leer, pero difíciles de ignorar.
      bossRing(engine,boss,6+phase*2+extra,2.65+phase*.18,'drone_shot',engine.frame*.06);
      bossRing(engine,boss,4+phase+extra,1.85+phase*.12,projectile,-engine.frame*.04+Math.PI/6);
      break;
    case 'riot':
      // Ariete: prepara una embestida corta detrás de una descarga frontal.
      bossFan(engine,boss,ang,3+phase*2,.2,3.2+phase*.15,'buckshot');
      boss.moveAngle=ang;boss.moveTimer=Math.max(boss.moveTimer,12+phase*5);
      playDanger('charge');
      break;
    case 'war':
      // Fuego escalonado: una salva rápida y una segunda capa más abierta.
      bossFan(engine,boss,ang,5+phase*2,.12,3.45+phase*.18,'enemy_bullet');
      bossFan(engine,boss,ang,3+phase,.28,2.7+phase*.14,'buckshot');
      break;
    case 'wealth':
      // Capital orbital: corona dorada y ejecución por el centro.
      bossRing(engine,boss,8+phase*3+extra,2.4+phase*.16,'coin_proj',-engine.frame*.035);
      bossFan(engine,boss,ang,3+phase*2,.095,3.6+phase*.16,'briefcase');
      break;
    case 'vault':
      // Cierre de bóveda: cuatro sellos delimitan el espacio y un pulso obliga a recolocarse.
      for(let i=0;i<4+phase+extra;i++){
        const a=i/(4+phase+extra)*Math.PI*2+(step%2)*.35;
        queueBossAirStrike(
          content,
          clamp(px+Math.cos(a)*(58+phase*8),42,CANVAS_WIDTH-42),
          clamp(py+Math.sin(a)*(58+phase*8),42,CANVAS_HEIGHT-42),
          14+phase*2,
          i%2===0?'heavy':'shell',
          38+i*4
        );
      }
      bossRing(engine,boss,6+phase*2,2.35+phase*.16,'drone_shot',engine.frame*.025);
      break;
  }

  bossRoleSignature(engine,boss,room,content,def,phase,tier,ang,step);
  spawn(engine,bx,by,'smoke',tier==='boss'?6:4,accent);
  engine.hitStop=Math.max(engine.hitStop,tier==='boss'?2:1);
}

function bossPatternAttack(engine:GameEngine,boss:Enemy,room:MapRoom,content:RoomContent,ang:number,phase:number,tier:'mini'|'sub'|'boss',def:BossDef) {
  const p=def.pattern;
  const step=boss.bossAttackIndex??0;
  const attack=p.sequence[(step+phase*p.phaseShift)%p.sequence.length];
  boss.bossAttackIndex=step+1;
  const projectile=(phase>0&&step%2===1)?p.altProjectile:p.projectile;
  const rawCount=Math.max(2,p.count+phase*(tier==='boss'?3:tier==='sub'?2:1));
  // Caporal Centeno era un outlier: count 11 + espiral doble + firma militar.
  // Conservamos su identidad de ráfaga, pero con densidad de miniboss legible.
  const count=def.id==='caporal_centeno'?Math.min(rawCount,8):rawCount;
  const speed=p.speed+phase*(tier==='boss'?.22:.16);
  const spread=Math.max(.045,p.spread-phase*.006);
  const bx=boss.x+boss.size/2,by=boss.y+boss.size/2;
  const px=engine.player.x+7,py=engine.player.y+8;
  const hazardLife=tier==='boss'?190:tier==='sub'?170:150;
  const ringCount=Math.max(6,count+2);

  if(attack==='fan') {
    bossFan(engine,boss,ang,count,spread,speed,projectile);
  } else if(attack==='ring') {
    bossRing(engine,boss,ringCount,speed*.82,projectile,engine.frame*.022+p.orbitBias);
  } else if(attack==='spiral') {
    const n=Math.max(5,Math.ceil(ringCount*.65));
    bossRing(engine,boss,n,speed*.84,projectile,engine.frame*(.026+p.orbitBias*.03));
    bossRing(engine,boss,n,speed*.64,p.altProjectile,-engine.frame*(.019-p.orbitBias*.02)+Math.PI/n);
  } else if(attack==='crossfire') {
    bossFan(engine,boss,ang-.48,Math.max(3,Math.ceil(count*.65)),spread*.8,speed,projectile);
    bossFan(engine,boss,ang+.48,Math.max(3,Math.ceil(count*.65)),spread*.8,speed,p.altProjectile);
    if(phase>=2) bossFan(engine,boss,ang+Math.PI/2,3,.11,speed*.9,projectile);
  } else if(attack==='cage') {
    const n=6+phase*2+(tier==='boss'?2:0),radius=58+phase*10;
    for(let i=0;i<n;i++){
      const a=i/n*Math.PI*2+(step%2)*Math.PI/n;
      content.puddles.push({x:clamp(px+Math.cos(a)*radius,42,CANVAS_WIDTH-42),y:clamp(py+Math.sin(a)*radius,42,CANVAS_HEIGHT-42),life:hazardLife,kind:'fire',radius:p.hazardRadius});
    }
    bossFan(engine,boss,ang,Math.max(3,Math.ceil(count*.45)),spread,speed*.95,projectile);
  } else if(attack==='mines') {
    const n=4+phase*2+(tier==='boss'?2:0);
    for(let i=0;i<n;i++){
      const a=engine.frame*.017+i/n*Math.PI*2;
      const radius=44+(i%3)*24+phase*6;
      queueBossAirStrike(content,clamp(px+Math.cos(a)*radius,45,CANVAS_WIDTH-45),clamp(py+Math.sin(a)*radius,45,CANVAS_HEIGHT-45),Math.max(13,p.hazardRadius-2),i%3===0?'heavy':'shell',34+(i%3)*5);
    }
    bossRing(engine,boss,Math.max(6,Math.ceil(count*.7)),speed*.68,p.altProjectile,engine.frame*.018);
  } else if(attack==='lanes') {
    const horizontal=(step+phase)%2===0;
    const laneOffset=((step%3)-1)*38;
    const max=horizontal?CANVAS_WIDTH:CANVAS_HEIGHT;
    const laneStep=def.id==='caporal_centeno'?48:36;
    for(let v=58;v<max-48;v+=laneStep){
      const x=horizontal?v:CANVAS_WIDTH/2+laneOffset,y=horizontal?CANVAS_HEIGHT/2+laneOffset:v;
      if(dist(x,y,px,py)<32)continue;
      queueBossAirStrike(content,x,y,Math.max(12,p.hazardRadius-3),'rapid',28+(Math.floor(v/laneStep)%3)*4);
    }
    bossFan(engine,boss,ang,Math.max(3,Math.ceil(count*.55)),spread*.75,speed,projectile);
  } else if(attack==='rush') {
    boss.moveAngle=ang;
    boss.moveTimer=(tier==='boss'?26:tier==='sub'?22:18)+phase*7;
    playDanger('charge');
    bossFan(engine,boss,ang,Math.max(3,Math.ceil(count*.5)),spread*1.35,speed*.9,p.altProjectile);
  } else if(attack==='summon') {
    const cap=tier==='boss'?7+phase*2:tier==='sub'?6+phase:5+phase;
    bossSupport(engine,room,content,p.support,cap);
    if(phase>0)bossSupport(engine,room,content,p.support,cap);
    bossRing(engine,boss,Math.max(6,Math.ceil(count*.6)),speed*.7,projectile,engine.frame*.016);
  } else if(attack==='sniper') {
    bossFan(engine,boss,ang,Math.max(1,2+phase),.028,speed*1.42,p.altProjectile);
    if(phase>=1)bossFan(engine,boss,ang+.16,2,.022,speed*1.22,projectile);
  } else if(attack==='nova') {
    bossRing(engine,boss,ringCount+phase*2,speed*.9,projectile,engine.frame*.035);
    bossHazardRing(content,bx,by,6+phase*2,48+phase*16,hazardLife);
  } else if(attack==='warp') {
    const spots=freeTiles(room.layout,2).filter(s=>{
      const x=s.x*TILE_SIZE+TILE_SIZE/2,y=s.y*TILE_SIZE+TILE_SIZE/2;
      return dist(x,y,px,py)>135&&dist(x,y,bx,by)>90;
    });
    const spot=spots[(step*7+phase*3)%Math.max(1,spots.length)];
    if(spot){
      spawn(engine,bx,by,'smoke',8,def.accent);
      boss.x=spot.x*TILE_SIZE+(TILE_SIZE-boss.size)/2;
      boss.y=spot.y*TILE_SIZE+(TILE_SIZE-boss.size)/2;
      spawn(engine,boss.x+boss.size/2,boss.y+boss.size/2,'spark',12,def.secondary);
    }
    const na=Math.atan2(py-(boss.y+boss.size/2),px-(boss.x+boss.size/2));
    bossFan(engine,boss,na,Math.max(5,Math.ceil(count*.75)),spread*.75,speed,projectile);
  }

  if(def.finalBoss&&phase>=1&&step%2===0){
    bossRing(engine,boss,8+phase*4,2.1+phase*.25,'coin_proj',-engine.frame*.028);
    if(phase>=2)bossSupport(engine,room,content,p.support,8);
  }
}

function bossPatternMove(engine:GameEngine,boss:Enemy,room:MapRoom,def:BossDef,ang:number,spd:number) {
  const p=def.pattern;
  const px=engine.player.x+7,py=engine.player.y+8,bx=boss.x+boss.size/2,by=boss.y+boss.size/2;
  const d=dist(px,py,bx,by);
  let forward=.28,lateral=.18+p.orbitBias;
  if(p.mobility==='hunter'){forward=d>58?.48:.12;lateral=.08+p.orbitBias;}
  else if(p.mobility==='orbit'){forward=d>150?.24:d<92?-.2:.04;lateral=.48+p.orbitBias;}
  else if(p.mobility==='skirmish'){forward=d>165?.34:d<92?-.38:.02;lateral=.27+p.orbitBias;}
  else if(p.mobility==='fortress'){forward=d>195?.18:d<105?-.12:0;lateral=.08+p.orbitBias*.5;}
  else if(p.mobility==='ambush'){forward=d>125?.38:d<66?-.18:.1;lateral=.32+p.orbitBias;}

  // El rol cambia también cómo ocupa la arena, no sólo qué proyectiles usa.
  if(def.role==='duelist'){forward=d>112?.42:d<72?-.24:.08;lateral=.52;}
  else if(def.role==='sniper'){forward=d>205?.18:d<155?-.46:-.1;lateral=.19;}
  else if(def.role==='charger'){forward=d>74?.6:.16;lateral=.04;}
  else if(def.role==='vortex'){forward=d>138?.18:d<92?-.16:.02;lateral=.58;}
  else if(def.role==='executioner'){forward=d>122?.34:d<76?-.2:.06;lateral=.22;}
  else if(def.role==='reactor'){forward=d>155?.16:d<105?-.14:0;lateral=.12;}
  else if(def.role==='swarm'){forward=d>145?.25:d<88?-.22:.03;lateral=.38;}
  else if(def.role==='warden'){forward=d>175?.15:d<115?-.18:0;lateral=.16;}
  else if(def.role==='storm'){forward=d>145?.2:d<92?-.15:.01;lateral=.44;}
  else if(def.role==='trickster'){forward=d>125?.2:d<75?-.28:.02;lateral=.5;}

  const wobble=Math.sin(engine.frame*(.018+Math.abs(p.orbitBias)*.02)+boss.id)*lateral;
  moveEnemy(boss,room,
    Math.cos(ang)*spd*forward+Math.cos(ang+Math.PI/2)*spd*wobble,
    Math.sin(ang)*spd*forward+Math.sin(ang+Math.PI/2)*spd*wobble);
}
function bossPhaseTransition(engine:GameEngine,boss:Enemy,def:BossDef,phase:number,tier:'mini'|'sub'|'boss') {
  boss.bossPhase=phase;
  boss.attackTimer=tier==='boss'?78:tier==='sub'?62:38;
  boss.stunned=tier==='boss'?50:tier==='sub'?38:18;
  boss.spawnAnim=Math.max(boss.spawnAnim,tier==='boss'?24:tier==='sub'?16:10);
  boss.telegraph=0;
  boss.phaseTransition=tier==='boss'?54:tier==='sub'?42:30;
  engine.hitStop=Math.max(engine.hitStop,tier==='boss'?5:tier==='sub'?3:2);
  const label=tier==='mini'?('ENRAGE · '+def.name):('FASE '+(phase+1)+' · '+def.name);
  engine.roomLabel=label;
  engine.roomLabelTimer=tier==='boss'?100:tier==='sub'?82:62;
  engine.shakeIntensity=Math.max(engine.shakeIntensity,tier==='boss'?8:tier==='sub'?5:3);
  const cx=boss.x+boss.size/2,cy=boss.y+boss.size/2;
  spawn(engine,cx,cy,'spark',tier==='boss'?32:tier==='sub'?22:14,def.accent);
  spawn(engine,cx,cy,'spark',tier==='boss'?18:tier==='sub'?12:8,def.secondary);
  spawn(engine,cx,cy,'smoke',tier==='boss'?16:10,def.family==='bakery'?'#7a4732':def.family==='tech'?'#4f7380':'#6c7684');
  // La transición de fase comunica la nueva identidad antes del siguiente ataque.
  if(def.family==='tech'||def.family==='vault')bossRing(engine,boss,6+phase*2,1.65+phase*.12,def.pattern.projectile,engine.frame*.02);
  else if(def.family==='wealth'||def.family==='finance')bossRing(engine,boss,6+phase*2,1.5+phase*.12,'coin_proj',-engine.frame*.018);

  if(def.role==='artillery'||def.role==='warden'){
    const px=engine.player.x+7,py=engine.player.y+8;
    for(let i=0;i<3+phase;i++)queueBossAirStrike(content,
      clamp(px+Math.cos(i/(3+phase)*Math.PI*2)*48,42,CANVAS_WIDTH-42),
      clamp(py+Math.sin(i/(3+phase)*Math.PI*2)*40,42,CANVAS_HEIGHT-42),
      15+phase*2,i===0?'heavy':'shell',42+i*5);
  } else if(def.role==='vortex'||def.role==='storm'){
    bossRing(engine,boss,8+phase*2,2.0+phase*.15,def.pattern.altProjectile,-engine.frame*.04);
  } else if(def.role==='charger'){
    boss.moveAngle=Math.atan2(engine.player.y+8-cy,engine.player.x+7-cx);
    boss.moveTimer=Math.max(boss.moveTimer,18+phase*6);
  } else if(def.role==='reactor'){
    bossHazardRing(content,cx,cy,5+phase*2,44+phase*12,130+phase*20);
  }
  playBossPhase(tier);
}

function updateBossAI(engine: GameEngine, boss: Enemy, room: MapRoom, content: RoomContent) {
  const player=engine.player;
  if((boss.phaseTransition??0)>0) boss.phaseTransition=Math.max(0,(boss.phaseTransition??0)-1);
  const px=player.x+7,py=player.y+8;
  const bx=boss.x+boss.size/2,by=boss.y+boss.size/2;
  const pct=clamp(boss.hp/boss.maxHp,0,1);
  const type=boss.bossType;
  const mini=MINIBOSSES[type];
  const sub=SUBBOSSES[type];
  const floor=BOSSES[type];
  const tier:'mini'|'sub'|'boss'=floor?'boss':sub?'sub':'mini';
  const def=floor??sub??mini;
  if(!def) return;

  const nextPhase=tier==='boss'?(pct<=.33?2:pct<=.66?1:0):tier==='sub'?(pct<=.5?1:0):(pct<=.35?1:0);
  if(nextPhase>boss.bossPhase) bossPhaseTransition(engine,boss,def,nextPhase,tier);

  const phase=boss.bossPhase;
  const ang=Math.atan2(py-by,px-bx);
  const intensity=1+phase*(tier==='boss'?.28:tier==='sub'?.22:.18);
  boss.attackTimer--;
  if(boss.attackTimer>0 && boss.attackTimer<30) {
    boss.telegraph=1-boss.attackTimer/30;
    boss.moveAngle=ang;
  }

  if(boss.attackTimer<=0) {
    boss.telegraph=0;
    const atk=rngInt(0,tier==='boss'?2+phase:tier==='sub'?2+phase:2+(phase>0?1:0));
    const attackStep=boss.bossAttackIndex??0;

    if(def.pattern&&!def.legacy) {
      bossPatternAttack(engine,boss,room,content,ang,phase,tier,def);
      const min=tier==='boss'?30:tier==='sub'?36:32;
      const phaseAccel=tier==='boss'?.14:tier==='sub'?.12:.09;
      boss.attackTimer=Math.max(min,boss.attackCooldown*def.pattern.tempo*(1-phase*phaseAccel));
    } else if(tier==='mini') {
      if(type==='tax_collector') {
        if(atk===0) bossFan(engine,boss,ang,phase?5:3,.17,3.1,'briefcase');
        else if(atk===1) {boss.moveAngle=ang;boss.moveTimer=phase?28:22;playDanger('charge');}
        else if(atk===2) {
          for(const [i,da] of [-.45,0,.45].entries()) queueBossAirStrike(content,px+Math.cos(ang+da)*38,py+Math.sin(ang+da)*38,17,i===1?'heavy':'shell',34+i*5);
        } else bossRing(engine,boss,10,2.5,'briefcase',engine.frame*.025);
      } else if(type==='sargento_migajas') {
        if(atk===0) bossFan(engine,boss,ang,phase?7:5,.14,3.25,'buckshot');
        else if(atk===1) {boss.moveAngle=ang;boss.moveTimer=phase?25:18;playDanger('charge');}
        else {
          bossFan(engine,boss,ang,3,.24,2.8,'buckshot');
          bossSupport(engine,room,content,['policia_pato','policia_rapido'],phase?5:4);
        }
        if(phase&&atk===3) bossRing(engine,boss,8,2.05,'buckshot',engine.frame*.02);
      } else if(type==='dron_centinela') {
        if(atk===0) bossRing(engine,boss,phase?14:10,phase?2.65:2.3,'drone_shot',engine.frame*.025);
        else if(atk===1) bossFan(engine,boss,ang,phase?5:3,.14,3.8,'drone_shot');
        else {
          bossSupport(engine,room,content,['dron_policial'],phase?5:4);
          boss.moveAngle=ang+Math.PI/2;boss.moveTimer=18;
        }
        if(phase&&atk===3) {bossRing(engine,boss,10,3.05,'drone_shot',engine.frame*.06);bossRing(engine,boss,10,1.8,'drone_shot',-engine.frame*.04);}
      } else {
        if(atk===0) bossFan(engine,boss,ang,phase?5:3,.2,2.8,'dough_ball');
        else if(atk===1) bossHazardRing(content,bx,by,phase?7:5,phase?64:48,phase?190:155);
        else {boss.moveAngle=ang;boss.moveTimer=phase?24:16;queueBossAirStrike(content,px,py,22,'heavy',38);}
        if(phase&&atk===3) bossRing(engine,boss,10,2.25,'dough_ball',engine.frame*.03);
      }
      boss.attackTimer=Math.max(38,boss.attackCooldown*(phase?.68:1));
    } else if(tier==='sub') {
      if(type==='head_baker') {
        if(atk===0) bossFan(engine,boss,ang,phase?7:5,.17,3,'dough_ball');
        else if(atk===1) bossHazardRing(content,bx,by,phase?8:6,phase?78:56,phase?200:165);
        else {boss.moveAngle=ang;boss.moveTimer=phase?30:20;playDanger('charge');}
        if(phase&&atk===3){bossRing(engine,boss,12,2.45,'dough_ball',engine.frame*.03);queueBossAirStrike(content,px,py,26,'heavy',42);}
      } else if(type==='el_auditor') {
        if(atk===0) bossFan(engine,boss,ang,phase?7:5,.14,3.1,'coin_proj');
        else if(atk===1) {
          const pts=[[52,45],[-52,45],[52,-45],[-52,-45]];
          for(const [i,[dx,dy]] of pts.entries()) queueBossAirStrike(content,clamp(px+dx,45,CANVAS_WIDTH-45),clamp(py+dy,45,CANVAS_HEIGHT-45),19,i%2?'shell':'heavy',36+i*4);
        } else bossRing(engine,boss,phase?14:10,2.5,'briefcase',engine.frame*.018);
        if(phase&&atk===3) bossFan(engine,boss,ang,9,.11,3.4,'coin_proj');
      } else if(type==='ganso_antidisturbios') {
        boss.shieldAngle=ang;
        if(atk===0){boss.moveAngle=ang;boss.moveTimer=phase?38:26;playDanger('charge');}
        else if(atk===1) bossRing(engine,boss,phase?12:8,phase?3:2.5,'enemy_bullet',engine.frame*.018);
        else {bossFan(engine,boss,ang,phase?5:3,.18,3.2,'enemy_bullet');boss.moveAngle=ang;boss.moveTimer=16;}
        if(phase&&atk===3){bossRing(engine,boss,16,2.4,'enemy_bullet',engine.frame*.04);boss.moveTimer=30;}
      } else {
        if(atk===0) bossFan(engine,boss,ang,phase?9:6,.13,3.1,'coin_proj');
        else if(atk===1) {bossFan(engine,boss,ang-.32,3,.08,4.3,'drone_shot');bossFan(engine,boss,ang+.32,3,.08,4.3,'drone_shot');}
        else bossRing(engine,boss,phase?16:10,2.65,'coin_proj',engine.frame*.025);
        if(phase&&atk===3){bossRing(engine,boss,12,3.15,'drone_shot',engine.frame*.055);bossHazardRing(content,bx,by,6,72,160);}
      }
      boss.attackTimer=Math.max(42,boss.attackCooldown*(phase?.66:1));
    } else {
      switch(type) {
        case 'captain_honk':
          if(atk===0) bossFan(engine,boss,ang,5+phase*2,.13,3.25+phase*.18,'enemy_bullet');
          else if(atk===1){boss.moveAngle=ang;boss.moveTimer=24+phase*7;playDanger('charge');}
          else if(atk===2){bossSupport(engine,room,content,phase?['policia_rapido','dron_policial']:['policia_pato','policia_rapido'],5+phase);bossFan(engine,boss,ang,3+phase*2,.16,3,'enemy_bullet');}
          else if(atk===3) bossRing(engine,boss,12+phase*3,2.65+phase*.15,'enemy_bullet',engine.frame*.025);
          else {bossRing(engine,boss,18,3,'enemy_bullet',engine.frame*.05);bossHazardRing(content,px,py,6,58,150);}
          break;
        case 'comisario_pico_duro':
          if(atk===0) bossFan(engine,boss,ang,7+phase*2,.11,3.15+phase*.2,'enemy_bullet');
          else if(atk===1) bossRing(engine,boss,10+phase*4,2.45+phase*.2,'enemy_bullet',engine.frame*.02);
          else if(atk===2){boss.moveAngle=ang;boss.moveTimer=22+phase*8;bossFan(engine,boss,ang,3,.24,3.5,'enemy_bullet');}
          else if(atk===3){bossSupport(engine,room,content,['policia_pato','policia_antidisturbios'],6);bossRing(engine,boss,14,2.75,'enemy_bullet',-engine.frame*.025);}
          else bossFan(engine,boss,ang,11,.08,4.2,'enemy_bullet');
          break;
        case 'toaster_9000':
          if(atk===0) bossRing(engine,boss,10+phase*4,2.25+phase*.2,'toast',engine.frame*.025);
          else if(atk===1) bossHazardRing(content,bx,by,6+phase*2,55+phase*14,180);
          else if(atk===2) bossFan(engine,boss,ang,5+phase*2,.15,3.2,'enemy_bullet');
          else if(atk===3){bossRing(engine,boss,14,3,'drone_shot',engine.frame*.06);bossRing(engine,boss,10,1.8,'toast',-engine.frame*.035);}
          else {bossHazardRing(content,px,py,8,68,190);bossRing(engine,boss,18,3.1,'toast',engine.frame*.08);}
          break;
        case 'general_ganso':
          if(atk===0){boss.moveAngle=ang;boss.moveTimer=28+phase*10;playDanger('charge');}
          else if(atk===1) bossFan(engine,boss,ang,5+phase*2,.16,3.3+phase*.15,'enemy_bullet');
          else if(atk===2){bossSupport(engine,room,content,['policia_capitan','policia_rapido'],5+phase);bossRing(engine,boss,8+phase*4,2.55,'enemy_bullet',engine.frame*.02);}
          else if(atk===3) bossRing(engine,boss,14+phase*3,2.9,'enemy_bullet',engine.frame*.05);
          else {bossFan(engine,boss,ang,9,.09,4.05,'enemy_bullet');boss.moveAngle=ang;boss.moveTimer=36;}
          break;
        case 'don_levadura':
          if(atk===0) bossFan(engine,boss,ang,5+phase*2,.19,2.9,'dough_ball');
          else if(atk===1) bossHazardRing(content,bx,by,6+phase*3,48+phase*18,190);
          else if(atk===2){bossSupport(engine,room,content,['evil_croissant','rolling_bagel'],5+phase);queueBossAirStrike(content,px,py,22+phase*3,'heavy',40);}
          else if(atk===3) bossRing(engine,boss,12+phase*4,2.45,'dough_ball',engine.frame*.03);
          else {bossRing(engine,boss,18,2.85,'dough_ball',engine.frame*.06);bossHazardRing(content,px,py,8,72,210);}
          break;
        case 'director_seguridad':
          if(atk===0) bossFan(engine,boss,ang,5+phase*2,.12,3.8,'drone_shot');
          else if(atk===1) bossRing(engine,boss,12+phase*4,2.7+phase*.2,'drone_shot',engine.frame*.04);
          else if(atk===2){bossSupport(engine,room,content,['dron_policial','security_camera'],6+phase);bossFan(engine,boss,ang,3,.2,4.5,'drone_shot');}
          else if(atk===3){bossHazardRing(content,px,py,6,62,150);bossRing(engine,boss,16,3.05,'drone_shot',-engine.frame*.055);}
          else {bossRing(engine,boss,20,3.15,'drone_shot',engine.frame*.08);bossFan(engine,boss,ang,9,.08,4.4,'drone_shot');}
          break;
        default:
          if(atk===0) bossFan(engine,boss,ang,5+phase*3,.12,3.3,'coin_proj');
          else if(atk===1) bossRing(engine,boss,12+phase*4,2.65+phase*.2,'coin_proj',engine.frame*.03);
          else if(atk===2){bossFan(engine,boss,ang,3+phase*2,.2,3.6,'briefcase');bossSupport(engine,room,content,['banker_chicken','policia_capitan'],5+phase);}
          else if(atk===3){bossHazardRing(content,px,py,6+phase,58+phase*8,175);bossRing(engine,boss,16,2.8,'coin_proj',-engine.frame*.045);}
          else {bossRing(engine,boss,22,3.1,'coin_proj',engine.frame*.075);bossFan(engine,boss,ang,11,.075,4.25,'briefcase');bossHazardRing(content,bx,by,8,78,210);}
          break;
      }
      boss.attackTimer=Math.max(32,boss.attackCooldown*(1-phase*.2));
    }
    if(def.legacy)boss.bossAttackIndex=attackStep+1;
    bossSignatureAttack(engine,boss,room,content,def,phase,tier,ang,attackStep);
    if(def.stationary){
      // Las estructuras gigantes dominan el mapa con artillería y fuego desde
      // el cielo para compensar que no persiguen al jugador.
      const salvo=tier==='boss'?3+phase:tier==='sub'?2+phase:2;
      for(let i=0;i<salvo;i++){
        const a=i/salvo*Math.PI*2+engine.frame*.015;
        queueBossAirStrike(
          content,
          clamp(px+Math.cos(a)*(32+i*10),42,CANVAS_WIDTH-42),
          clamp(py+Math.sin(a)*(25+i*8),42,CANVAS_HEIGHT-42),
          16+phase*3,
          i===0?'heavy':'shell',
          30+i*6
        );
      }
    }
    applyBossMutationAttack(engine,boss,room,content,ang,tier);
  }

  const moveScale=tier==='boss'?(1+phase*.23):tier==='sub'?(1+phase*.18):(1+phase*.14);
  const spd=boss.speed*moveScale*intensity;
  if(boss.stationaryBoss){
    // Los jefes-fortaleza son set-pieces: giran/atacan, pero no "patinan"
    // detrás del jugador. Las cargas explícitas se convierten en presión de fuego.
    boss.moveTimer=0;
    boss.moveAngle=ang;
  } else if(boss.moveTimer>0) {
    boss.moveTimer--;
    moveEnemy(boss,room,Math.cos(boss.moveAngle)*spd*(tier==='mini'?2.8:2.45),Math.sin(boss.moveAngle)*spd*(tier==='mini'?2.8:2.45));
  } else if(def.pattern&&!def.legacy) {
    bossPatternMove(engine,boss,room,def,ang,spd);
  } else {
    const orbit=tier==='boss'?Math.sin(engine.frame*.018+boss.id)*.28:Math.sin(engine.frame*.026+boss.id)*.2;
    moveEnemy(boss,room,
      Math.cos(ang)*spd*(tier==='mini'?.34:.26)+Math.cos(ang+Math.PI/2)*spd*orbit,
      Math.sin(ang)*spd*(tier==='mini'?.34:.26)+Math.sin(ang+Math.PI/2)*spd*orbit);
  }
  if(type==='ganso_antidisturbios') boss.shieldAngle=boss.moveAngle||ang;
}

// ---------------------------------------------------------------------------
// DAÑO
// ---------------------------------------------------------------------------
export function damageEnemy(engine: GameEngine, e: Enemy, dmg: number, crit: boolean, content: RoomContent) {
  if(e.hp<=0) return;
  const actual=Math.min(e.hp,dmg);
  const repeatedBossHit=e.isBoss&&e.hurtTimer>3;
  e.hp -= dmg;
  e.hurtTimer = 8;
  engine.run.dmgDealt += actual;

  if (engine.settings.damageNumbers) {
    // En jefes, ráfagas rápidas antes podían crear decenas de números de daño
    // superpuestos. Agrupamos impactos consecutivos cercanos sin perder información.
    const last=engine.damageNumbers[engine.damageNumbers.length-1];
    const cx=e.x+e.size/2,cy=e.y-4;
    if(e.isBoss&&last&&last.life>.76&&Math.abs(last.x-cx)<18&&Math.abs(last.y-cy)<14&&last.crit===crit){
      last.value+=dmg;last.life=1;last.x=cx;last.y=cy;
    }else{
      if(engine.damageNumbers.length>=42)engine.damageNumbers.shift();
      engine.damageNumbers.push({ x: cx + rng(-4, 4), y: cy, value: dmg, life: 1, crit });
    }
  }

  // Un boss bajo fuego sostenido ya mantiene hurtTimer activo. No necesitamos
  // generar 9-17 partículas nuevas por cada proyectil para comunicar el impacto.
  const hitCount=e.isBoss?(repeatedBossHit?1:2):(dmg>=8?4:3);
  spawn(engine, e.x + e.size / 2, e.y + e.size / 2, 'hit', hitCount);

  if(dmg>=8&&!repeatedBossHit){
    spawn(engine,e.x+e.size/2,e.y+e.size/2,'spark',e.isBoss?3:4,e.isBoss?'#ffd7a3':'#fff0c4');
    engine.shakeIntensity=Math.max(engine.shakeIntensity,e.isBoss?1.15:.75);
  }
  playHit();

  if (crit) {
    spawn(engine, e.x + e.size / 2, e.y + e.size / 2, 'spark', e.isBoss?4:7, '#f4d03f');
    engine.shakeIntensity=Math.max(engine.shakeIntensity,e.isBoss?1.8:1.1);
    playCritical();
  }
  if (e.hp <= 0) killEnemy(engine, e, content);
}

function killEnemy(engine: GameEngine, e: Enemy, content: RoomContent) {
  const i = content.enemies.indexOf(e);
  if(i<0) return;
  content.enemies.splice(i,1);
  const room = currentRoom(engine);
  engine.stats.enemiesDefeated++;
  if(engine.gameMode==='endless'&&engine.endless.roundActive){
    engine.endless.killedThisRound++;
    engine.endless.pressure=Math.max(0,engine.endless.pressure-(e.isBoss?20:e.elite?10:6));
  }
  const build=getBuild(engine.player);
  const angle=Math.atan2(e.y-engine.player.y,e.x-engine.player.x);
  const floorBossDeath=e.isBoss&&!!BOSSES[e.bossType];
  const subBossDeath=e.isBoss&&!!SUBBOSSES[e.bossType];
  const bossDeathLife=floorBossDeath?68:subBossDeath?54:e.isBoss?46:20;
  engine.deathEchoes.push({enemy:{...e,hurtTimer:0,phaseTransition:0},life:bossDeathLife,vx:Math.cos(angle)*(floorBossDeath?.75:subBossDeath?1:1.4),vy:Math.sin(angle)*(floorBossDeath?.75:subBossDeath?1:1.4)});
  if(engine.deathEchoes.length>16) engine.deathEchoes.shift();
  engine.player.combo++;engine.player.comboTimer=120;
  if(build.infinite && engine.player.activeItemCooldown>0) engine.player.activeItemCooldown=Math.max(1,engine.player.activeItemCooldown-30);

  spawn(engine, e.x + e.size / 2, e.y + e.size / 2, 'feather', 9, e.type.startsWith('policia') ? '#cfd8e3' : '#f0f0f0');
  spawn(engine, e.x + e.size / 2, e.y + e.size / 2, 'smoke', 5, '#4c5666');
  spawn(engine, e.x + e.size / 2, e.y + e.size / 2, 'crumb', 6, '#d4a574');
  if(e.isBoss) {
    const floor=!!BOSSES[e.bossType],sub=!!SUBBOSSES[e.bossType];
    engine.hitStop=Math.max(engine.hitStop,floor?8:sub?5:3);
    engine.shakeIntensity=Math.max(engine.shakeIntensity,floor?13:sub?9:6);
    spawn(engine,e.x+e.size/2,e.y+e.size/2,'spark',floor?42:sub?30:22,floor?'#ffd85a':sub?'#ff9b68':'#f4d03f');
    spawn(engine,e.x+e.size/2,e.y+e.size/2,'smoke',floor?24:sub?16:10,'#69737c');
    if(floor) playBossWin(); else playEnemyDeath();
  } else playEnemyDeath();

  const bonus=build.extraCrumbs+(random()<build.extraDrop?2:0)+(e.elite?3:0)+(e.type==='robot_cajero'||e.bossType==='cajero_3000'?4:0);
  const luckBonus = engine.player.items.includes('lucky_feather') ? 1 : 0;
  const coinCount=rngInt(1,3)+bonus+(room.modifier==='openVault'?2:0);
  for (let c = 0; c < coinCount; c++) {
    content.pickups.push({
      x: e.x + e.size / 2 + rng(-14, 14), y: e.y + e.size / 2 + rng(-14, 14),
      type: 'crumb', value: scaledCurrency(rngInt(1,3),build.currencyScale), lifetime: 900,
    });
  }
  if (random() < 0.1 + luckBonus * 0.05 || e.isBoss) {
    content.pickups.push({
      x: e.x + e.size / 2, y: e.y + e.size / 2,
      type: 'golden_crumb', value: e.isBoss ? rngInt(5, 10) : 1, lifetime: 99999,
    });
  }
  if (engine.player.items.includes('pond_water')) {
    content.puddles.push({ x: e.x + e.size / 2, y: e.y + e.size / 2, life: 420 });
  }
  if(random()<build.radiation) content.puddles.push({x:e.x+e.size/2,y:e.y+e.size/2,life:240,kind:'radiation',radius:32});

  if (e.isBoss) {
    // Ningún ataque aéreo pendiente debe caer después de derrotar al jefe.
    content.airStrikes=[];
    spawn(engine, e.x + e.size / 2, e.y + e.size / 2, 'spark', 26, '#f4d03f');
    if(BOSSES[e.bossType]) engine.run.bosses++;
    if (engine.gameMode!=='endless' && room.type !== RoomType.BOSS) {
      // el minijefe suelta botín inmediato (arma u objeto, de forma coherente)
      const asWeapon = random() < 0.5;
      content.items.push({
        x: e.x + e.size / 2 - 8, y: e.y + e.size / 2 - 8,
        itemId: asWeapon ? rollWeapon(engine, true) : rollItem(engine),
        isWeapon: asWeapon, isActive: false,
      });
      content.pickups.push({ x: e.x + e.size / 2 + 26, y: e.y + e.size / 2 + 14, type: 'hp', value: 1, lifetime: 99999 });
    }
  } else if (engine.gameMode!=='endless' && random() < 0.07 + luckBonus * 0.03) {
    // curaciones poco frecuentes
    content.pickups.push({
      x: e.x + e.size / 2, y: e.y + e.size / 2,
      type: rollFood(), value: 1, lifetime: 99999,
    });
  }
  if(engine.gameMode!=='endless' && e.elite && random()<.04) content.items.push({x:e.x,y:e.y,itemId:rollBossRewardItem(engine),isWeapon:false,isActive:false});
}

export function damagePlayer(engine: GameEngine, dmgMul: number, source:'contact'|'projectile'='contact',police=false) {
  const p = engine.player;
  if (p.iFrames > 0 || p.dashTimer > 0) return;
  const b=getBuild(p);
  if(p.helmetShield || p.shield>0 || (source==='projectile' && p.roomShield>0) || (source==='contact' && p.contactShield>0)) {
    if(p.helmetShield) p.helmetShield=false;
    else if(source==='projectile' && p.roomShield>0) p.roomShield--;
    else if(source==='contact' && p.contactShield>0) p.contactShield--;
    else {p.shield--;if(b.armor) explode(engine,makeProjectile(p.x+7,p.y+8,0,0,'baguette',25,true,1,{explode:70}),getContent(engine));}
    p.iFrames=30;spawn(engine,p.x+7,p.y+8,'spark',8,'#b7dfe5');playHit();return;
  }

  if (random()<b.block+(source==='projectile'?b.projectileBlock:0)) {
    spawn(engine, p.x + 7, p.y + 8, 'crumb', 6, '#a67c52');
    engine.damageNumbers.push({ x: p.x + 7, y: p.y - 4, value: 0, life: 1, crit: false });
    p.iFrames = 18;
    return;
  }

  const heavy = dmgMul >= 1.5;
  let loss = (heavy ? 2 : 1)*(source==='contact' && police?1-b.contactReduction:1);
  if(!p.firstHitUsed) {loss*=1-b.firstHitReduction;p.firstHitUsed=true;}
  if(p.hp<=loss && !p.reviveUsed && random()<b.lethalSave) {
    p.reviveUsed=true;p.hp=.5;p.iFrames=120;engine.toast='¡HOY NO!';engine.toastTimer=90;getContent(engine).damaged=true;return;
  }
  p.hp = Math.max(0, p.hp - loss);
  engine.run.dmgTaken += loss;
  if(engine.gameMode==='endless'&&engine.endless.roundActive){
    engine.endless.roundDamaged=true;
    engine.endless.damageBySource[source]+=loss;
    engine.endless.lastHitSource=source;
  }
  p.hurtTimer = 22;
  p.iFrames = (p.items.includes('bread_helmet') ? 58 : 46) + 12;
  p.flash = 10;
  p.combo=0;p.comboTimer=0;getContent(engine).damaged=true;
  engine.shakeIntensity = Math.max(engine.shakeIntensity, heavy ? 3 : 1.6);
  spawn(engine, p.x + 7, p.y + 8, 'feather', 7, '#f9e547');
  playHurt();
}

// ---------------------------------------------------------------------------
// ACCIONES
// ---------------------------------------------------------------------------
export function handleDash(engine: GameEngine) {
  const p = engine.player;
  if(engine.state!==GameState.PLAYING || engine.swap || engine.transition.active) return;
  if (p.dashCooldown > 0 || p.dashTimer > 0) return;
  let dx = 0, dy = 0;
  if (bound(engine,'moveLeft')) dx = -1;
  if (bound(engine,'moveRight')) dx = 1;
  if (bound(engine,'moveUp')) dy = -1;
  if (bound(engine,'moveDown')) dy = 1;
  if(engine.lastInput==='gamepad'&&engine.pad.connected){dx=engine.pad.moveX;dy=engine.pad.moveY;}
  if (!dx && !dy) {
    dx = p.dir === 'left' ? -1 : p.dir === 'right' ? 1 : 0;
    dy = p.dir === 'up' ? -1 : p.dir === 'down' ? 1 : 0;
  }
  const l = Math.hypot(dx, dy) || 1;
  p.dashDir = { x: dx / l, y: dy / l };
  p.dashHitIds=[];p.dashHasteTimer=120;completeTutorial(engine,'dash');
  p.dashTimer = DASH_DURATION;
  p.dashCooldown = Math.round(
    DASH_COOLDOWN * (1 - (engine.metaLevels.dash ?? 0) * 0.2) * getBuild(p).dashCooldown,
  );
  p.iFrames = Math.max(p.iFrames, DASH_DURATION + 4+(getBuild(p).ghost?18:0));
  playDash();
  engine.shakeIntensity=Math.max(engine.shakeIntensity,2.4);
  spawn(engine, p.x + 7, p.y + 8, 'feather', 10, '#f9e547');
  spawn(engine, p.x + 7-p.dashDir.x*5, p.y + 8-p.dashDir.y*5, 'smoke', 5, '#dbe7df');
}

export function handleActiveItem(engine: GameEngine) {
  const p = engine.player;
  if(engine.state!==GameState.PLAYING || engine.swap || engine.transition.active) return;
  if (!p.activeItem || (p.activeItemCooldown > 0 && !(p.activeItem==='remote_bomb' && engine.remoteBomb))) return;
  const content = getContent(engine);
  const rule=ACTIVE_RULES[p.activeItem], b=getBuild(p);
  if(!rule) return;
  const room=currentRoom(engine),cx=p.x+7,cy=p.y+8;
  switch(rule.action) {
    case 'quack': case 'mega': {
      playQuack();p.quackWave=24;
      const aim=aimVector(engine);
      const damage=(rule.action==='mega'?15:0)+(b.ultra?18:0)+(p.items.includes('steel_feathers')?8:0);
      for(const enemy of [...content.enemies]) {
        const toEnemy=Math.atan2(enemy.y-p.y,enemy.x-p.x);
        const inCone=rule.action==='mega'?Math.cos(toEnemy-Math.atan2(aim.y,aim.x))>.35:true;
        if(!inCone) continue;
        const a=rule.action==='mega'?Math.atan2(aim.y,aim.x):toEnemy;
        for(let i=0;i<(rule.action==='mega'?18:14);i++) moveEnemy(enemy,room,Math.cos(a)*4,Math.sin(a)*4);
        if(damage) damageEnemy(engine,enemy,damage,false,content);
        if(b.ultra && b.burn) enemy.burn=180;
      }
      engine.projectiles=engine.projectiles.filter(pr=>pr.friendly || dist(pr.x,pr.y,cx,cy)>84);
      spawn(engine,cx,cy,'spark',12,'#f6d77c');engine.shakeIntensity=2.5;
      break;
    }
    case 'bomb': explode(engine,makeProjectile(cx,cy,0,0,'baguette',30,true,1,{explode:84,burning:b.burn>0}),content,false);break;
    case 'grenade': {
      const aim=aimVector(engine);
      p.facingAngle=Math.atan2(aim.y,aim.x);
      engine.grenades.push(throwBreadGrenade(engine));
      playShoot('baguette_launcher');
      break;
    }
    case 'decoy': case 'lure': case 'fakeAlarm': {
      const aim=aimVector(engine);
      const spot=safeDrop(room,cx+aim.x*52,cy+aim.y*52);
      engine.decoy={x:spot.x+8,y:spot.y+8,life:rule.duration!,explosive:rule.action==='lure',stunOnExpire:rule.action==='fakeAlarm'?150:undefined};
      if(rule.action==='fakeAlarm'){engine.toast='ALARMA FALSA ACTIVADA';engine.toastTimer=55;playDoorLock();}else playBounce();
      break;
    }
    case 'butter': {
      const aim=aimVector(engine),angle=Math.atan2(aim.y,aim.x);
      for(const distance of [22,38,54,70,86]) {
        const lateral=Math.sin(distance*.37)*7;
        const x=clamp(cx+Math.cos(angle)*distance+Math.cos(angle+Math.PI/2)*lateral,34,CANVAS_WIDTH-34);
        const y=clamp(cy+Math.sin(angle)*distance+Math.sin(angle+Math.PI/2)*lateral,34,CANVAS_HEIGHT-34);
        content.puddles.push({x,y,life:300,kind:'butter',radius:18});
        spawn(engine,x,y,'spark',2,'#f2d76b');
      }
      playBounce();break;
    }
    case 'drone':
      engine.drone={x:cx,y:cy,life:rule.duration!,cooldown:0};spawn(engine,cx,cy,'spark',10,'#b7dfe5');playEquip();break;
    case 'stun': case 'siren':
      for(const enemy of content.enemies) if(rule.action==='stun'||enemy.type.startsWith('policia')||enemy.type==='dron_policial') {enemy.stunned=rule.duration;enemy.chargeTimer=0;enemy.recover=45;}
      p.quackWave=18;playDoorLock();break;
    case 'coffee': case 'doubleCoffee':
      p.fireBoost=rule.duration!;p.fireBoostPower=rule.action==='coffee'?2:1.5;p.speedBoost=Math.max(p.speedBoost,rule.duration!);
      engine.coffeeCrash = rule.duration! + 120;
      playEquip();break;
    case 'heal':
      if (p.hp >= p.maxHp && p.activeItem === 'emergency_bread') { playDeny(); return; }
      healPlayer(engine, 2); playHeal(); break;
    case 'tray': p.trayTimer=rule.duration!;playDoorUnlock();break;
    case 'food':
      for(let i=0;i<3;i++) {
        const spot=safeDrop(room,p.x-24+i*24,p.y+26);
        content.pickups.push({x:spot.x+8,y:spot.y+8,type:rollFood(),value:1,lifetime:99999});
      }playRarityPickup(3);break;
    case 'remoteBomb': {
      if(engine.remoteBomb) {
        const bomb=engine.remoteBomb;
        explode(engine,makeProjectile(bomb.x,bomb.y,0,0,'baguette',55,true,1,{explode:120}),content,false);
        spawn(engine,bomb.x,bomb.y,'spark',18,'#f4d03f');
        engine.shakeIntensity=Math.max(engine.shakeIntensity,4);
        engine.remoteBomb=null;
      } else {
        engine.remoteBomb={x:cx,y:cy,life:1800};
        playBounce();
      }
      break;
    }
    case 'chaos': {
      const outcome=rngInt(0,4);
      if(outcome===0) explode(engine,makeProjectile(cx,cy,0,0,'baguette',80,true,1,{explode:150}),content);
      if(outcome===1) {p.crumbs+=35;engine.stats.breadStolen+=35;playCoin();}
      if(outcome===2) {healPlayer(engine,99);playHeal();}
      if(outcome===3) {content.items.push({x:p.x+24,y:p.y,itemId:rollBossRewardItem(engine),isWeapon:false,isActive:false});playRarityPickup(4);}
      if(outcome===4) {
        changeAlert(engine,4);
        const spots=freeTiles(room.layout,2);
        for(let i=0;i<3;i++) if(spots[i]) content.enemies.push(makeEnemy('policia_pato',floorScale(engine.map.floorIndex,room.distance),spots[i].x,spots[i].y,false));
        room.cleared=false;content.clearAge=undefined;playDoorLock();
      }
      engine.toast=['¡PANDEMONIO!','¡DIVIDENDOS!','¡SALUD!','¡PREMIO GORDO!','¡ERA LA ALARMA!'][outcome];engine.toastTimer=90;
      break;
    }
  }
  p.activeItemMaxCooldown=Math.round(rule.cooldown*b.activeCooldown);
  p.activeItemCooldown=p.activeItemMaxCooldown;p.quackReadyFlash=0;
}

function spawn(engine: GameEngine, x: number, y: number, type: string, count: number, color?: string) {
  count=Math.min(count,Math.max(0,200-engine.particles.length));
  for (let i = 0; i < count; i++) {
    engine.particles.push({
      x: x + rng(-3, 3), y: y + rng(-3, 3),
      vx: rng(-2.2, 2.2), vy: rng(-3, 0.4),
      type, life: 1, decay: rng(0.02, 0.05), color,
      gravity: type === 'feather' ? 0.02 : type === 'smoke' ? -0.01 : 0.08,
    });
  }
}

// ---------------------------------------------------------------------------
// PERSISTENCIA / MENÚS
// ---------------------------------------------------------------------------
function saveProgress(engine: GameEngine) {
  if(engine.testing) return;
  try {
    if(engine.gameMode!=='daily'&&engine.run.time>0&&engine.run.floorReached>engine.bestFloor) {engine.bestFloor=engine.run.floorReached;engine.newRecord=true;}
    localStorage.setItem('duckheist_save', JSON.stringify(permanentSnapshot(engine)));
    if(engine.gameMode!=='daily'&&engine.stats.breadStolen>(engine.best.breadStolen??0)) {
      engine.newRecord=true;engine.best={...engine.stats};localStorage.setItem('duckheist_best',JSON.stringify(engine.stats));
    }
    notifyCloudSave();
  } catch { /* ignorar */ }
}

export function saveSettings(engine: GameEngine) {
  setVolumes(engine.settings.master, engine.settings.music, engine.settings.sfx);
  saveProgress(engine);
}

export const SETTING_ROWS = [
  { key: 'master', label: T.settingMaster, kind: 'vol' as const, group:'AUDIO', description:'Volumen general del juego.' },
  { key: 'music', label: T.settingMusic, kind: 'vol' as const, group:'AUDIO', description:'Volumen de música y ambiente.' },
  { key: 'sfx', label: T.settingSfx, kind: 'vol' as const, group:'AUDIO', description:'Disparos, impactos, UI y efectos.' },
  { key: 'shake', label: T.settingShake, kind: 'shake' as const, group:'FEEDBACK', description:'Intensidad del movimiento de cámara al golpear o recibir daño.' },
  { key: 'damageNumbers', label: T.settingDamage, kind: 'bool' as const, group:'FEEDBACK', description:'Muestra u oculta los números de daño sobre enemigos.' },
  { key: 'reduceMotion', label: 'REDUCIR MOVIMIENTO UI', kind: 'bool' as const, group:'ACCESIBILIDAD', description:'Reduce barridos, pulsos y movimiento decorativo de los menús.' },
  { key: 'highContrast', label: 'ALTO CONTRASTE', kind: 'bool' as const, group:'ACCESIBILIDAD', description:'Aumenta contraste de interfaz y lectura del HUD.' },
  { key: 'accessPreset', label: 'PRESET ACCESIBLE', kind: 'action' as const, group:'ACCESIBILIDAD', description:'Activa alto contraste, reduce movimiento, elimina temblor y amplía la UI.' },
  { key: 'controls', label: 'CONFIGURAR CONTROLES', kind: 'action' as const, group:'CONTROLES', description:'Remapea movimiento, disparo y acciones del teclado.' },
  { key: 'uiScale', label: T.settingUiScale, kind: 'scale' as const, group:'VIDEO', description:'Aumenta o reduce el tamaño visual de la interfaz.' },
  { key: 'fullscreen', label: T.settingFullscreen, kind: 'bool' as const, group:'VIDEO', description:'Activa o desactiva pantalla completa.' },
  { key: 'brightness', label: 'BRILLO', kind: 'brightness' as const, group:'VIDEO', description:'Ajusta el brillo del canvas del juego.' },
];

export function settingValue(engine: GameEngine, i: number) {
  const row = SETTING_ROWS[i];
  if (!row || row.kind === 'action') return 0;
  const v = (engine.settings as unknown as Record<string, number | boolean>)[row.key];
  return typeof v === 'boolean' ? (v ? 1 : 0) : v;
}

export function adjustSetting(engine: GameEngine, i: number, dir: number) {
  const row = SETTING_ROWS[i];
  if (!row) return;
  if (row.key === 'accessPreset') {
    engine.settings.reduceMotion=true;engine.settings.highContrast=true;engine.settings.shake=0;engine.settings.damageNumbers=true;
    engine.settings.uiScale=3;engine.settings.brightness=1.1;playUiSelect();saveSettings(engine);return;
  }
  if (row.key === 'controls') return;
  const s = engine.settings as unknown as Record<string, number | boolean>;
  if (row.kind === 'bool') {
    s[row.key] = !s[row.key];
  } else if (row.kind === 'scale') {
    s[row.key] = clamp((s[row.key] as number) + dir, 1, 3);
    if (dir === 0) s[row.key] = 2;
  } else if (row.kind === 'shake') {
    s[row.key] = clamp((s[row.key] as number) + dir * 0.5, 0, 2);
  } else if(row.kind==='brightness') {
    s[row.key]=Math.round(clamp((s[row.key] as number)+dir*.1,.6,1.4)*10)/10;
  } else {
    s[row.key] = clamp((s[row.key] as number) + dir * 0.1, 0, 1);
  }
  if (row.key === 'music' || row.key === 'master') {
    if (engine.state === GameState.MENU) setMusic('menu');
  }
  saveSettings(engine);
  playUiMove();
}

export function buyUpgrade(engine: GameEngine, index: number) {
  const up = META_UPGRADES[index];
  if (!up) return;
  const lvl = engine.metaLevels[up.id] ?? 0;
  if (lvl >= up.maxLevel) return;
  const cost = up.cost * (lvl + 1);
  if (engine.totalGoldenCrumbs < cost) { engine.toast = T.notEnough; engine.toastTimer = 80; playDeny(); return; }
  engine.totalGoldenCrumbs -= cost;
  engine.metaLevels[up.id] = lvl + 1;
  playUiSelect();
  saveProgress(engine);
}

export function menuMove(engine: GameEngine, delta: number, listLength: number, which: 'menu' | 'pause' | 'settings' | 'upgrade' | 'wardrobe') {
  const field = which === 'menu' ? 'menuIndex' : which === 'pause' ? 'pauseIndex' : which === 'settings' ? 'settingsIndex' : which === 'wardrobe' ? 'wardrobeIndex' : 'upgradeIndex';
  (engine as unknown as Record<string, number>)[field] = ((engine as unknown as Record<string, number>)[field] + delta + listLength) % listLength;
  if(which==='wardrobe') ensureSkinVisible(engine);
  playUiMove();
}

export function ensureSkinVisible(engine:GameEngine) {
  const y=Math.floor(engine.wardrobeIndex/3)*(WARDROBE.cellH+WARDROBE.gap);
  const max=Math.max(0,Math.ceil(SKINS.length/3)*(WARDROBE.cellH+WARDROBE.gap)-WARDROBE.gap-WARDROBE.h);
  if(y<engine.wardrobeScrollTarget) engine.wardrobeScrollTarget=y;
  if(y+WARDROBE.cellH>engine.wardrobeScrollTarget+WARDROBE.h) engine.wardrobeScrollTarget=y+WARDROBE.cellH-WARDROBE.h;
  engine.wardrobeScrollTarget=clamp(engine.wardrobeScrollTarget,0,max);
}

function safeDrop(room:MapRoom,x:number,y:number) {
  x=clamp(x,36,CANVAS_WIDTH-52);y=clamp(y,36,CANVAS_HEIGHT-52);
  if(!boxBlocked(room,x,y,16,16)) return {x,y};
  const spots=freeTiles(room.layout,1).sort((a,b)=>dist(x,y,a.x*32,a.y*32)-dist(x,y,b.x*32,b.y*32));
  return {x:(spots[0]?.x ?? 7)*32+8,y:(spots[0]?.y ?? 5)*32+8};
}

export function shopPrice(engine:GameEngine,product:{cost:number}) {
  const b=getBuild(engine.player);
  const discount=Math.max(b.coupon>0?.25:0,b.firstDiscount);
  const coupon=!engine.player.couponUsed?1-discount:1;
  return Math.max(1,Math.ceil(product.cost*b.shop*coupon*(1.25+engine.map.floorIndex*.2)));
}
function merchantSpeak(engine:GameEngine,line:string) {
  const room=getContent(engine);room.merchantLine=line;room.merchantUntil=engine.frame+150;
}
function finishChoice(content:RoomContent) {
  content.choiceTaken=true;
  content.choices?.forEach(p=>{p.taken=true;});
}

export function selectEventOption(engine:GameEngine,index:number) {
  const event=getContent(engine).event;
  if(!event || event.used || dist(engine.player.x+7,engine.player.y+8,event.x+8,event.y+8)>45) return false;
  event.selected=index;playUiMove();return true;
}
function activateEvent(engine:GameEngine) {
  const content=getContent(engine),event=content.event!,p=engine.player;
  if(event.used) return;
  if(currentRoom(engine).type===RoomType.EVENT && !content.cafe && content.dangerEventActive) {
    event.message='Primero sobrevive al operativo.';playDeny();return;
  }
  const cost=event.kind==='safe'?18:event.kind==='vending'?8:event.kind==='atm'?12:event.kind==='interrogation'?15:0;
  if(event.selected===1 && event.kind!=='interrogation') {event.message='Una decisión prudente. Quizá.';event.used=true;return;}
  if(event.kind==='interrogation' && event.selected===1) {
    changeAlert(engine,3);
    event.used=true;currentRoom(engine).cleared=false;content.clearAge=undefined;
    const spots=freeTiles(currentRoom(engine).layout,2);
    for(let i=0;i<3;i++) if(spots[i]) content.enemies.push(makeEnemy(i?'policia_rapido':'policia_escopeta',floorScale(engine.map.floorIndex,4),spots[i].x,spots[i].y,i===0));
    playDoorLock();event.message='El interrogatorio se complicó.';return;
  }
  if(p.crumbs<cost) {event.message='Te faltan migajas.';playDeny();return;}
  if((event.kind==='bakery'||event.kind==='injured') && p.hp<=1) {event.message='Necesitas más de un corazón.';playDeny();return;}
  p.crumbs-=cost;event.used=true;
  switch(event.kind) {
    case 'safe':content.pedestal={x:CANVAS_WIDTH/2-12,y:142,itemId:rollBossRewardItem(engine),isWeapon:false,taken:false};event.message='Abierta. Sin dejar huellas.';break;
    case 'bakery': {
      p.hp--;const reward=pickPassive(engine) ?? fallbackActive(engine);
      content.items.push({x:CANVAS_WIDTH/2-8,y:133,itemId:reward,isWeapon:false,isActive:!!ACTIVE_ITEMS[reward]});
      event.message='Un intercambio muy crujiente.';break;
    }
    case 'vending':content.pickups.push({x:CANVAS_WIDTH/2,y:143,type:rollFood(),value:1,lifetime:99999});event.message='Sin cambio. Con pan.';break;
    case 'injured':p.hp--;awardGolden(engine,8);event.message='Los cómplices no se olvidan.';break;
    case 'interrogation':event.message='No hemos visto ningún pato.';changeAlert(engine,-3);break;
    case 'atm':
      if(random()<.35) {awardGolden(engine,8);event.message='¡Error bancario a tu favor!';}
      else {content.pickups.push({x:CANVAS_WIDTH/2,y:143,type:'crumb',value:4,lifetime:99999});event.message='Solo devuelve 4 migajas. Típico.';}break;
  }
  playPickup();
}
function awardGolden(engine:GameEngine,count:number) {
  engine.totalGoldenCrumbs+=count;engine.player.goldenCrumbs+=count;engine.stats.goldenCrumbs+=count;engine.run.goldenEarned+=count;saveProgress(engine);
}

/** Compra una skin cosmética con monedas doradas permanentes */
export function buySkin(engine: GameEngine, index: number) {
  const skin = SKINS[index];
  if (!skin) return;
  if (engine.unlockedSkins.includes(skin.id)) return;
  if (engine.totalGoldenCrumbs < skin.cost) { playDeny(); return; }
  engine.totalGoldenCrumbs -= skin.cost;
  engine.unlockedSkins.push(skin.id);
  saveProgress(engine);
  playUiSelect();
}

/** Equipa una skin ya desbloqueada */
export function equipSkin(engine: GameEngine, index: number) {
  const skin = SKINS[index];
  if (!skin) return;
  if (!engine.unlockedSkins.includes(skin.id)) { buySkin(engine, index); return; }
  engine.equippedSkin = skin.id;
  saveProgress(engine);
  playEquip();
}

/** Acción principal del ARMARIO (comprar o equipar la skin seleccionada) */
export function wardrobeAction(engine: GameEngine) {
  const skin = SKINS[engine.wardrobeIndex];
  if (!skin) return;
  if (!engine.unlockedSkins.includes(skin.id)) buySkin(engine, engine.wardrobeIndex);
  else equipSkin(engine, engine.wardrobeIndex);
}

export { CANVAS_WIDTH, CANVAS_HEIGHT, GameState, HEIST_INTRO_FRAMES, HEIST_INTRO_SKIP_AFTER, dist, clamp };
export type { GameEngine, Enemy, RoomContent };
