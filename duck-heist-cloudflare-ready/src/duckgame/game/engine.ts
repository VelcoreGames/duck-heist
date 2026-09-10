// Motor lógico: DUCK HEIST · EL BANCO DEL PAN
import {
  TILE_SIZE, ROOM_WIDTH, ROOM_HEIGHT, CANVAS_WIDTH, CANVAS_HEIGHT,
  PLAYER_SPEED, DASH_SPEED, DASH_DURATION, DASH_COOLDOWN, RESTART_HOLD_FRAMES,
  GameState, RoomType, DIR_VECTORS, DOOR_TILE, OPPOSITE,
  TILE_WALL, TILE_DOOR, OBSTACLE_BASE, type Dir,
} from './constants';
import {
  WEAPONS, ITEMS, ACTIVE_ITEMS, ENEMIES, ENCOUNTERS, BOSSES, MINIBOSSES,
  FLOOR_BOSS_POOL, FLOOR_MINIBOSS_POOL,
  META_UPGRADES, ELITE_OK, TOTAL_FLOORS, SKINS, SYNERGIES,
  type WeaponDef, type EnemyDef, type BossDef,
} from './data';
import { generateMap, key, freeTiles, type MapRoom } from './mapgen';
import { T } from './i18n';
import { getLocale,setLocale } from '../localization/runtime';
import { getBuild, PASSIVE_RULES, ACTIVE_RULES, FOODS } from './itemRules';
import { emptyDiscoveries, normalizeProgress, permanentSnapshot, DEFAULT_SETTINGS } from './progress';
import type { CollectionCategory } from './catalog';
import { WARDROBE } from './layout';
import { EVENTS } from './events';
import { diverseRewards, pickPassive, fallbackActive } from './loot';
import { applyMapItemEffects } from './floorMap';
import { completeTutorial, updateTutorial } from './tutorial';
import { MODIFIER_LABELS } from './modifiers';
import { aimVector } from './aim';
import { throwBreadGrenade, updateGrenades } from './grenades';
import type {
  GameEngine, Enemy, RoomContent, Projectile, DuckDir, EventKind, Pedestal,
} from './types';
import {
  playShoot, playHit, playPickup, playHurt, playExplosion, playDash,
  playDoorLock, playDoorUnlock, playUiMove, playUiSelect, playUiBack,
  playEquip, playWeaponSwap, playBossRoar, playStairs, playDeny,
  playQuack, playQuackReady, playDashReady,
  playCoin,playHeal,playRarityPickup,playRoomClear,playCritical,playEnemyDeath,playBossWin,playReturn,playBounce,playFootstep,playDoorStyle,
  playDanger,
  setVolumes, setMusic, initAudio,
} from './audio';

// ---------------------------------------------------------------------------
// UTILIDADES
// ---------------------------------------------------------------------------
const rng = (min: number, max: number) => Math.random() * (max - min) + min;
const rngInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
const dist = (x1: number, y1: number, x2: number, y2: number) => Math.hypot(x2 - x1, y2 - y1);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const isPolice=(e:Enemy)=>e.type.startsWith('policia')||e.type==='dron_policial'||e.type==='ganso_k9'||e.type==='security_camera';
function scaledCurrency(value:number,multiplier:number) {
  const amount=value*multiplier;return Math.floor(amount)+(Math.random()<amount%1?1:0);
}

let nextEnemyId = 0;

export interface DiffScale {
  hp: number; dmg: number; speed: number; fire: number;
  count: number; eliteChance: number; pattern: number;
}

export const DIFFICULTY_ORDER=['easy','normal','hard','mad'] as const;
export const DIFFICULTY_PROFILES={
  easy:{label:'FÁCIL',desc:'Más margen para aprender. Enemigos más lentos y menos agresivos.',hp:.82,dmg:.75,speed:.92,fire:1.18,count:.92,elite:.55,startHearts:1,floorHeal:2},
  normal:{label:'NORMAL',desc:'La experiencia actual de Duck Heist. Equilibrada y recomendada.',hp:1,dmg:1,speed:1,fire:1,count:1,elite:1,startHearts:0,floorHeal:1},
  hard:{label:'DIFÍCIL',desc:'Más presión, enemigos más resistentes y ataques más frecuentes.',hp:1.15,dmg:1.18,speed:1.06,fire:.88,count:1.1,elite:1.35,startHearts:0,floorHeal:.5},
  mad:{label:'LOCO POR EL PAN',desc:'El banco va a por ti. Máxima presión, más élites y casi sin respiro.',hp:1.28,dmg:1.38,speed:1.12,fire:.74,count:1.22,elite:1.75,startHearts:0,floorHeal:.5},
} as const;
let activeDifficulty:GameEngine['difficulty']='normal';
export function difficultyProfile(engine:GameEngine){return DIFFICULTY_PROFILES[engine.difficulty];}
export function difficultyLabel(engine:GameEngine){return difficultyProfile(engine).label;}
export function chooseDifficulty(engine:GameEngine,index:number){const i=Math.max(0,Math.min(DIFFICULTY_ORDER.length-1,index));const mode=DIFFICULTY_ORDER[i];engine.difficultyIndex=i;if(mode==='mad'&&!engine.madUnlocked){playDeny();return false;}engine.difficulty=mode;activeDifficulty=mode;return true;}

/** Multiplicadores de dificultad según piso y profundidad dentro del mapa */
export function floorScale(floorIndex:number,roomDistance=0):DiffScale{
  const f=floorIndex,depth=Math.min(roomDistance,8)*.06,p=DIFFICULTY_PROFILES[activeDifficulty];
  const hp=1+f*.11+depth*.5,dmg=1+f*.09,speed=1+f*.05,fire=Math.max(.55,1-f*.07),count=1+f*.22+depth;
  const eliteChance=f<=1?(f===1?.10:0):Math.min(.42,.14+f*.09+depth*.5);
  return {hp:hp*p.hp,dmg:dmg*p.dmg,speed:speed*p.speed,fire:Math.max(.42,Math.min(1.28,fire*p.fire)),count:count*p.count,eliteChance:eliteChance===0?0:Math.min(.65,eliteChance*p.elite),pattern:f};
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
  };
}
type floorIndexScale = { hp: number; dmg: number; speed: number; fire: number; pattern: number };

function makeBossEnemy(def: BossDef, bossType: string, isMini: boolean, sc: floorIndexScale): Enemy {
  const hp = Math.round(def.hp * (isMini?1.2:2.4) * (1 + (sc.hp - 1) * 0.7));
  return {
    id: nextEnemyId++, type: bossType,
    x: CANVAS_WIDTH / 2 - def.size / 2, y: CANVAS_HEIGHT * 0.28,
    vx: 0, vy: 0, hp, maxHp: hp,
    speed: def.speed * sc.speed, damage: 1, size: def.size, score: isMini ? 50 : 150,
    behavior: 'chaser', flying: false,
    fireRate: Math.round(60 * sc.fire), fireCooldown: 60,
    projectileType: isMini
      ? (bossType === 'tax_collector' || bossType === 'el_auditor' || bossType === 'cajero_3000' ? 'briefcase' : 'dough_ball')
      : (bossType === 'bread_banker' || bossType === 'director_seguridad' ? 'coin_proj' : 'enemy_bullet'),
    hurtTimer: 0, moveAngle: 0, moveTimer: 0,
    telegraph: 0, chargeTimer: 0, burst: 0, burstDelay: 0, slowTimer: 0, burn: 0, elite: false,
    isBoss: true, bossType, bossPhase: 0,
    attackTimer: 70, attackCooldown: (isMini ? 70 : 90) * sc.fire,
    spawnAnim: 30, dmgMul: sc.dmg,
    shieldAngle: 0, recover: 0,
  };
}

// ---------------------------------------------------------------------------
// CONTENIDO DE SALA (persistente durante la run)
// ---------------------------------------------------------------------------
function buildRoomContent(engine: GameEngine, room: MapRoom): RoomContent {
  const content: RoomContent = {
    enemies: [], pickups: [], items: [], puddles: [],
    doorAnim: {}, lockFlash: 0, combatTimer: 0, ambient: Math.random() * 100,
    magnet: 0,
  };
  for (const d of room.doors) content.doorAnim[d] = 1;

  const sc = floorScale(engine.map.floorIndex, room.distance);
  const b=getBuild(engine.player);
  sc.eliteChance=Math.min(.48,sc.eliteChance+b.eliteChance+(engine.map.floorIndex>0?engine.alert*.001:0));
  if(room.modifier==='openVault') sc.eliteChance=Math.min(.55,sc.eliteChance+.15);
  const spots=freeTiles(room.layout,2).filter(s=>room.doors.every(dir=>{const dt=DOOR_TILE[dir];return Math.hypot(s.x-dt.x,s.y-dt.y)>=3.5;}));

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
      if(engine.map.floorIndex>=2&&engine.alert>30&&Math.random()<.4) list.push(pick(['policia_francotirador','policia_medico','policia_capitan','ganso_k9']));
      if(room.modifier==='cameras') {list.push('security_camera');content.securityTimer=540;}
      for (const t of list) {
        const spot = spots.pop();
        if (!spot) break;
        const canElite = !!ELITE_OK[t] && engine.map.floorIndex >= 1;
        content.enemies.push(makeEnemy(t, sc, spot.x, spot.y, canElite && Math.random() < sc.eliteChance));
      }
      if(room.type===RoomType.CHALLENGE) {content.challenge=Math.random()<.5?'flawless':'alarm';if(content.challenge==='alarm') content.alarmTimer=1800;}
      break;
    }
    case RoomType.MINIBOSS: {
      const pool = (FLOOR_MINIBOSS_POOL[engine.map.floorIndex] ?? Object.keys(MINIBOSSES)).filter(id => MINIBOSSES[id]);
      const k = pick(pool.length ? pool : Object.keys(MINIBOSSES));
      content.enemies.push(makeBossEnemy(MINIBOSSES[k], k, true, sc));
      for (let i = 0; i < 2 + Math.floor(engine.map.floorIndex / 2); i++) {
        const spot = spots.pop();
        if (spot) content.enemies.push(makeEnemy(pick(['policia_pato', 'policia_rapido']), sc, spot.x, spot.y, false));
      }
      break;
    }
    case RoomType.BOSS: {
      const pool = (FLOOR_BOSS_POOL[engine.map.floorIndex] ?? ['bread_banker']).filter(id => BOSSES[id]);
      const k = pool[Math.floor(((engine.run.seed.charCodeAt(engine.map.floorIndex % engine.run.seed.length) * 17 + engine.map.floorIndex * 31) % 997) / 997 * pool.length)] ?? pool[0];
      content.enemies.push(makeBossEnemy(BOSSES[k], k, false, sc));
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
          type: Math.random() < 0.3 ? 'golden_crumb' : 'crumb',
          value: rngInt(2, 5), lifetime: 99999,
        });
      }
      break;
    }
    case RoomType.SHOP:{
      const first=pickPassive(engine)??fallbackActive(engine);const second=pickPassive(engine,undefined,[first])??fallbackActive(engine);const third=pickPassive(engine,undefined,[first,second])??fallbackActive(engine);
      const itemPool=[first,second,third].filter(Boolean) as string[];content.shopItems=itemPool.map((id,i)=>({itemId:id,cost:(ITEMS[id]??ACTIVE_ITEMS[id]).cost,sold:false,isWeapon:false,x:CANVAS_WIDTH*(.28+i*.22),y:CANVAS_HEIGHT*.58}));break;
    }
    case RoomType.GUN_VAN:{
      const owned=new Set(engine.player.weapons.filter(Boolean).map(w=>w!.id));let pool=Object.keys(WEAPONS).filter(id=>id!=='quack_blaster'&&!owned.has(id));if(pool.length<3)pool=Object.keys(WEAPONS).filter(id=>id!=='quack_blaster');const offers:string[]=[];while(offers.length<3&&pool.length){const i=Math.floor(Math.random()*pool.length);offers.push(pool.splice(i,1)[0]);}
      content.shopItems=offers.map((id,i)=>({itemId:id,cost:Math.max(8,WEAPONS[id].cost),sold:false,isWeapon:true,x:145+i*95,y:235}));break;
    }
    case RoomType.EVENT:{if(Math.random()<.38){content.cafe=true;const pool=['hp','croissant','sandwich','baguette','torta'],o:string[]=[];while(o.length<3&&pool.length){const i=Math.floor(Math.random()*pool.length);o.push(pool.splice(i,1)[0]);}const price=(id:string)=>id==='hp'?5:id==='croissant'?7:id==='sandwich'||id==='baguette'?9:14;content.shopItems=o.map((id,i)=>({itemId:id,cost:price(id),sold:false,isWeapon:false,isFood:true,x:145+i*95,y:232}));}else{const kind=pick(Object.keys(EVENTS)) as EventKind;content.event={kind,x:232,y:170,used:false,selected:0,message:''};}break;}
    case RoomType.CHOICE:
      content.choices=diverseRewards(engine).map((id,i)=>({x:142+i*84,y:165,itemId:id,isWeapon:false,taken:false}));
      if(!content.choices.length){const id=rollWeapon(engine,true);content.choices=[{x:228,y:165,itemId:id,isWeapon:true,taken:false}];}
      break;
    default: break;
  }
  return content;
}

export function rollItem(engine: GameEngine): string {
  if(Math.random()<.16) return fallbackActive(engine);
  const b=getBuild(engine.player),special=currentRoom(engine).type!==RoomType.COMBAT;
  return pickPassive(engine,undefined,[],Math.random()<.2+b.rarityLuck+(special?b.specialReward:0)) ?? fallbackActive(engine);
}

/** Arma aleatoria evitando duplicar las que ya llevas */
function rollWeapon(engine: GameEngine, biasRare = false): string {
  const owned = new Set(engine.player.weapons.filter(Boolean).map(w => w!.id));
  let pool = Object.keys(WEAPONS).filter(w => !owned.has(w) && w !== 'quack_blaster');
  if (!pool.length) pool = Object.keys(WEAPONS).filter(w => w !== 'quack_blaster');
  if (biasRare) {
    const rare = pool.filter(w => WEAPONS[w].rarity >= 2);
    if (rare.length && Math.random() < 0.75) return pick(rare);
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
  enemies: [], pickups: [], items: [], puddles: [], doorAnim: {},
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
  let best = { breadStolen: 0, enemiesDefeated: 0, roomsCleared: 0, goldenCrumbs: 0, floorsCleared: 0 };
  let unlockedSkins: string[] = ['robber'];
  let equippedSkin = 'robber';
  let discovered=emptyDiscoveries();
  let bestFloor=0;
  let madUnlocked=false;
  let tutorial={started:false,map:false,mapShown:false,wheel:false,dash:false};
  try {
    const saved = localStorage.getItem('duckheist_save');
    if (saved) {
      const d = normalizeProgress(JSON.parse(saved));
      totalGolden = d.totalGoldenCrumbs ?? 0;
      metaLevels = d.metaLevels ?? {};
      settings = { ...settings, ...(d.settings ?? {}) };
      unlockedSkins = d.unlockedSkins ?? ['robber'];
      equippedSkin = d.equippedSkin ?? 'robber';
      discovered=d.discovered;bestFloor=d.bestFloor;
      tutorial=d.tutorial;
    }
    const b = localStorage.getItem('duckheist_best');
    if (b) best = { ...best, ...JSON.parse(b) };
  } catch { /* sin almacenamiento */ }

  try{madUnlocked=localStorage.getItem('duckheist_mad_bread_unlocked')==='1'||unlockedSkins.includes('golden');}catch{madUnlocked=unlockedSkins.includes('golden');}

  setVolumes(settings.muted?0:settings.master,settings.muted?0:settings.music,settings.muted?0:settings.sfx);

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
    totalGoldenCrumbs: totalGolden, metaLevels, settings, best,
    unlockedSkins, equippedSkin,
    discovered, bestFloor, newRecord:false, knownSynergies:[],endFrame:0,
    heistIntroTimer:0,heistIntroSeen:false, hitStop:0, deathEchoes:[], deathKiller:null, deathSource:'unknown', deathAttack:'', decoy:null,
    grenades:[], remoteBomb:null, drone:null, coffeeCrash:0, activeSwap:null, synergyNotice:null,
    collectionTab:'items',collectionIndex:0,collectionScroll:0,
    wardrobeScroll:0,wardrobeScrollTarget:0,tooltip:{key:'',since:0},
    difficulty:'normal',difficultyIndex:1,madUnlocked,
    menuIndex: 0, pauseIndex: 0, settingsIndex: 0, upgradeIndex: 0, wardrobeIndex: 0,
    scale: 2,
  };
}

function newRunStats() {
  const seed=`PAN-${Math.floor(Math.random()*0xffffffff).toString(16).toUpperCase().padStart(8,'0')}`;
  return { time: 0, bosses: 0, items: 0, weaponsFound: 1, dmgDealt: 0, dmgTaken: 0, floorReached: 1, goldenEarned: 0,seed,weaponIds:['quack_blaster'] };
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
  activeDifficulty=engine.difficulty;
  saveProgress(engine);
  nextEnemyId = 0;
  initAudio();
  engine.player=createPlayer(engine.metaLevels);
  const diff=DIFFICULTY_PROFILES[engine.difficulty];if(diff.startHearts>0){engine.player.maxHp+=diff.startHearts;engine.player.hp+=diff.startHearts;}
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
  engine.mouseDown=false;engine.keys={};engine.hitStop=0;engine.deathEchoes=[];engine.deathKiller=null;engine.deathSource='unknown';engine.deathAttack='';engine.decoy=null;
  engine.grenades=[];engine.remoteBomb=null;engine.drone=null;engine.coffeeCrash=0;engine.activeSwap=null;
  engine.knownSynergies=[];engine.synergyNotice=null;engine.newRecord=false;engine.tooltip={key:'',since:0};
  engine.bossIntroSeen = {};
  engine.overlayLabels = [];
  engine.transition = { active: false, timer: 0, total: 22, dir: null, targetKey: null };
  enterRoom(engine, engine.map.startKey, null);
  engine.floorIntroTimer = 110;
  engine.state = GameState.FLOOR_INTRO;
  setMusic('run',0);
  engine.onStateChange?.(engine.state);
  saveProgress(engine);
}

export function beginHeist(engine:GameEngine) {
  engine.heistIntroTimer=90;engine.state=GameState.HEIST_INTRO;engine.mouseDown=false;engine.keys={};
  playDoorLock();setMusic('off');engine.onStateChange?.(engine.state);
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
    engine.totalGoldenCrumbs+=100;engine.run.goldenEarned+=100;engine.stats.goldenCrumbs+=100;
    engine.madUnlocked=true;try{localStorage.setItem('duckheist_mad_bread_unlocked','1');}catch{}
    if(!engine.unlockedSkins.includes('golden')) engine.unlockedSkins.push('golden');
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
  engine.deathEchoes=[];engine.deathKiller=null;engine.deathSource='unknown';engine.deathAttack='';engine.decoy=null;engine.hitStop=0;engine.tooltip={key:'',since:0};
  applyFloorPassives(engine);
  engine.run.floorReached = idx + 1;
  setMusic('run',idx);
  // vida restaurada parcialmente entre pisos
  engine.player.hp=Math.min(engine.player.maxHp,engine.player.hp+DIFFICULTY_PROFILES[engine.difficulty].floorHeal);
  enterRoom(engine, engine.map.startKey, null);
  engine.floorIntroTimer = 110;
  engine.state = GameState.FLOOR_INTRO;
  engine.onStateChange?.(engine.state);
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
  engine.player.vx=0;engine.player.vy=0;if(from)engine.player.iFrames=Math.max(engine.player.iFrames,50);

  if (boxBlocked(room, engine.player.x, engine.player.y, 14, 16)) {
    const spot = freeTiles(room.layout, 1)[0];
    if (spot) { engine.player.x = spot.x * TILE_SIZE + 8; engine.player.y = spot.y * TILE_SIZE + 8; }
  }
  engine.projectiles = [];
  if(from)playDoorStyle(room.type===RoomType.BOSS?'boss':room.type===RoomType.ITEM?'gold':room.type===RoomType.SHOP?'green':room.type===RoomType.GUN_VAN?'orange':room.type===RoomType.TREASURE?'purple':'silver');

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
  if((room.type===RoomType.SHOP||room.type===RoomType.GUN_VAN)&&(content.merchantUntil??0)<engine.frame)merchantSpeak(engine,room.type===RoomType.GUN_VAN?pick(['Tres fierros. Cero preguntas.','La camioneta no existe.','Mira rápido y paga en migajas.','No preguntes de dónde salieron.']):pick(['Todo legal. Probablemente.','No tengo factura.','Eso cayó de un camión.','El pan está caro.','No hago devoluciones.','Ese objeto no estaba aquí ayer.']));

  const boss = content.enemies.find(e => e.isBoss && !!BOSSES[e.bossType]);
  if (boss && !room.cleared) {
    const def = BOSSES[boss.bossType] ?? MINIBOSSES[boss.bossType];
    if (def) {
      engine.bossIntroName = def.name;
      engine.bossIntroSubtitle = def.subtitle;
      const seen = !!engine.bossIntroSeen[boss.bossType];
      engine.bossIntroTimer = room.type === RoomType.BOSS ? (seen ? 45 : 115) : (seen ? 30 : 70);
      engine.transition.active = false;
      engine.transition.timer = 0;
      engine.bossIntroSeen[boss.bossType] = true;
      if (room.type === RoomType.BOSS) { playBossRoar(); setMusic('boss'); }
      engine.state = GameState.BOSS_INTRO;
      engine.onStateChange?.(engine.state);
    }
  }
}

function roomLabelFor(room: MapRoom): string {
  switch (room.type) {
    case RoomType.ITEM: return 'SALA DE OBJETOS';
    case RoomType.TREASURE: return 'SALA DEL TESORO';
    case RoomType.SHOP:return 'TIENDA CLANDESTINA';
    case RoomType.GUN_VAN:return 'CAMIONETA DEL MERCADO NEGRO';
    case RoomType.CHALLENGE: return 'DESAFÍO';
    case RoomType.MINIBOSS: return 'MINIJEFE';
    case RoomType.BOSS: return 'JEFE';
    case RoomType.SECRET: return 'BÓVEDA SECRETA';
    case RoomType.START: return 'ENTRADA';
    case RoomType.EVENT:return 'UN ASUNTO PENDIENTE';
    case RoomType.CHOICE:return 'ELIGE TU BOTÍN';
    default: return room.cleared ? '' : 'SALA DE POLICÍAS';
  }
}

// ---------------------------------------------------------------------------
// BUCLE DE ACTUALIZACIÓN
// ---------------------------------------------------------------------------
const BANK_PROP_DEFS:Record<BankPropKind,{w:number;h:number;hp:number;hardness:number;bx:number;by:number;bw:number;bh:number}>={
plant:{w:18,h:28,hp:6,hardness:.72,bx:2,by:20,bw:14,bh:8},vase:{w:14,h:22,hp:5,hardness:.65,bx:2,by:14,bw:10,bh:8},trash:{w:16,h:21,hp:6,hardness:.72,bx:1,by:14,bw:14,bh:7},chair:{w:18,h:22,hp:7,hardness:.72,bx:2,by:15,bw:14,bh:7},archive:{w:20,h:22,hp:8,hardness:.8,bx:1,by:15,bw:18,bh:7},desk:{w:38,h:24,hp:18,hardness:.95,bx:2,by:17,bw:34,bh:7},filing:{w:20,h:30,hp:25,hardness:1.25,bx:1,by:22,bw:18,bh:8},copier:{w:28,h:24,hp:17,hardness:1,bx:2,by:17,bw:24,bh:7},counter:{w:46,h:26,hp:25,hardness:1.05,bx:2,by:18,bw:42,bh:8},bench:{w:34,h:17,hp:14,hardness:.88,bx:2,by:10,bw:30,bh:7},vending:{w:24,h:34,hp:28,hardness:1.15,bx:2,by:25,bw:20,bh:9},water:{w:16,h:28,hp:10,hardness:.82,bx:2,by:20,bw:12,bh:8},server:{w:22,h:34,hp:34,hardness:1.4,bx:1,by:25,bw:20,bh:9},crate:{w:24,h:24,hp:13,hardness:.82,bx:1,by:16,bw:22,bh:8},bread_rack:{w:28,h:30,hp:13,hardness:.8,bx:2,by:22,bw:24,bh:8},prep:{w:36,h:22,hp:18,hardness:1,bx:2,by:15,bw:32,bh:7},safe:{w:28,h:30,hp:48,hardness:1.7,bx:2,by:20,bw:24,bh:10},gold_pile:{w:30,h:20,hp:31,hardness:1.35,bx:2,by:13,bw:26,bh:7},diamond_case:{w:28,h:26,hp:23,hardness:1.08,bx:2,by:18,bw:24,bh:8},money_bag:{w:18,h:20,hp:9,hardness:.76,bx:2,by:14,bw:14,bh:6},cubicle:{w:48,h:32,hp:22,hardness:1,bx:2,by:24,bw:44,bh:8},divider:{w:42,h:22,hp:15,hardness:.95,bx:2,by:17,bw:38,bh:5},atm:{w:24,h:30,hp:30,hardness:1.25,bx:2,by:22,bw:20,bh:8},teller:{w:50,h:24,hp:24,hardness:1.05,bx:2,by:17,bw:46,bh:7},queue:{w:12,h:20,hp:7,hardness:.68,bx:2,by:14,bw:8,bh:6},meeting:{w:56,h:28,hp:30,hardness:1.05,bx:2,by:19,bw:52,bh:9},lounge:{w:38,h:22,hp:18,hardness:.9,bx:2,by:15,bw:34,bh:7},security_console:{w:42,h:28,hp:31,hardness:1.25,bx:2,by:20,bw:38,bh:8},locker:{w:22,h:32,hp:28,hardness:1.3,bx:1,by:24,bw:20,bh:8},cash_cart:{w:28,h:22,hp:18,hardness:.95,bx:2,by:15,bw:24,bh:7},gold_cart:{w:30,h:24,hp:28,hardness:1.25,bx:2,by:16,bw:26,bh:8},statue:{w:20,h:34,hp:30,hardness:1.3,bx:2,by:26,bw:16,bh:8},art:{w:26,h:30,hp:12,hardness:.72,bx:3,by:24,bw:20,bh:6},column:{w:20,h:36,hp:42,hardness:1.55,bx:2,by:27,bw:16,bh:9},terminal:{w:24,h:28,hp:18,hardness:1.05,bx:2,by:20,bw:20,bh:8},bookcase:{w:26,h:32,hp:24,hardness:1.05,bx:2,by:24,bw:22,bh:8}};
function bankSeed(room:MapRoom,floor:number){let h=((floor+1)*73856093)^((room.gx+41)*19349663)^((room.gy+43)*83492791);h^=h>>>16;return h>>>0;}
function bankRng(seed:number){let s=seed>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}
type BankPlanItem=[BankPropKind,number,number];
type BankPlan={id:string;items:BankPlanItem[]};
const BANK_PLANS:BankPlan[][]=[
[
{id:'public_lobby',items:[['teller',132,124],['teller',348,124],['atm',82,112],['atm',398,112],['queue',176,176],['queue',216,176],['queue',264,176],['queue',304,176],['bench',136,242],['bench',344,242]]},
{id:'consultation',items:[['desk',136,116],['chair',136,151],['desk',344,116],['chair',344,151],['filing',88,116],['copier',392,116],['bench',136,242],['water',344,242],['plant',392,244]]},
{id:'service_desk',items:[['cubicle',140,122],['cubicle',340,122],['divider',145,182],['divider',335,182],['bench',140,244],['bench',340,244],['water',84,246],['trash',396,246]]},
{id:'atm_waiting',items:[['atm',86,112],['atm',394,112],['bench',138,116],['bench',342,116],['queue',178,176],['queue',220,176],['queue',260,176],['queue',302,176],['plant',126,244],['plant',354,244]]},
{id:'teller_hall',items:[['teller',128,130],['teller',240,130],['teller',352,130],['queue',170,184],['queue',240,184],['queue',310,184],['bench',132,244],['bench',348,244],['atm',82,244]]}
],
[
{id:'open_office',items:[['cubicle',138,118],['cubicle',342,118],['cubicle',138,238],['cubicle',342,238],['copier',86,118],['filing',394,118],['water',86,238],['trash',394,238]]},
{id:'records_office',items:[['filing',92,112],['filing',132,112],['bookcase',172,112],['filing',388,112],['copier',336,112],['desk',144,238],['chair',144,266],['desk',336,238],['chair',336,266]]},
{id:'meeting_suite',items:[['meeting',240,178],['lounge',132,114],['lounge',348,114],['bookcase',86,118],['plant',394,118],['art',132,246],['water',348,246]]},
{id:'it_admin',items:[['server',86,116],['server',394,116],['terminal',138,118],['terminal',342,118],['cubicle',140,238],['cubicle',340,238],['locker',88,242],['filing',392,242]]},
{id:'manager_suite',items:[['desk',136,120],['chair',136,152],['bookcase',88,118],['art',184,116],['desk',344,120],['chair',344,152],['bookcase',392,118],['plant',296,116],['safe',344,246]]}
],
[
{id:'security_ops',items:[['security_console',138,118],['security_console',342,118],['server',86,116],['server',394,116],['terminal',140,238],['terminal',340,238],['locker',88,242],['locker',392,242]]},
{id:'secure_archive',items:[['bookcase',88,114],['bookcase',130,114],['filing',172,114],['filing',308,114],['bookcase',350,114],['bookcase',392,114],['crate',138,242],['crate',342,242],['copier',240,222]]},
{id:'cash_processing',items:[['counter',136,120],['counter',344,120],['cash_cart',140,238],['cash_cart',340,238],['terminal',86,118],['terminal',394,118],['locker',86,242],['locker',394,242]]},
{id:'checkpoint',items:[['security_console',240,122],['divider',146,178],['divider',334,178],['locker',88,118],['locker',392,118],['bench',138,242],['bench',342,242],['terminal',240,236]]},
{id:'restricted_records',items:[['safe',90,116],['filing',134,116],['filing',176,116],['server',390,116],['security_console',336,118],['crate',138,242],['crate',342,242],['terminal',240,232]]}
],
[
{id:'private_banking',items:[['desk',136,118],['chair',136,150],['desk',344,118],['chair',344,150],['lounge',136,242],['lounge',344,242],['art',86,118],['art',394,118],['safe',394,244]]},
{id:'boardroom',items:[['meeting',240,176],['lounge',132,112],['lounge',348,112],['bookcase',86,116],['bookcase',394,116],['art',132,246],['statue',348,242]]},
{id:'executive_suite',items:[['desk',138,120],['chair',138,152],['bookcase',88,118],['art',188,114],['lounge',340,122],['statue',394,116],['safe',340,242],['plant',290,244]]},
{id:'client_lounge',items:[['lounge',136,116],['lounge',344,116],['lounge',136,242],['lounge',344,242],['statue',88,116],['art',392,116],['diamond_case',88,244],['plant',392,244]]},
{id:'treasury_office',items:[['safe',88,116],['safe',392,116],['security_console',138,120],['security_console',342,120],['cash_cart',140,242],['cash_cart',340,242],['art',88,244],['statue',392,242]]}
],
[
{id:'vault_antechamber',items:[['safe',88,116],['safe',392,116],['security_console',138,120],['security_console',342,120],['gold_cart',138,242],['cash_cart',342,242],['locker',88,244],['locker',392,244]]},
{id:'safe_deposit',items:[['safe',88,112],['safe',132,112],['safe',176,112],['safe',304,112],['safe',348,112],['safe',392,112],['diamond_case',136,242],['diamond_case',344,242]]},
{id:'bullion_handling',items:[['gold_cart',132,116],['gold_cart',348,116],['gold_pile',88,116],['gold_pile',392,116],['counter',136,242],['counter',344,242],['security_console',240,220]]},
{id:'diamond_reserve',items:[['diamond_case',90,116],['diamond_case',138,116],['diamond_case',342,116],['diamond_case',390,116],['safe',136,242],['safe',344,242],['security_console',240,218]]},
{id:'cash_reserve',items:[['cash_cart',90,116],['cash_cart',138,116],['gold_cart',342,116],['gold_pile',390,116],['safe',136,242],['safe',344,242],['counter',240,220]]}
],
[
{id:'golden_gallery',items:[['column',88,112],['column',392,112],['art',136,112],['art',344,112],['statue',136,242],['statue',344,242],['gold_pile',88,244],['diamond_case',392,244]]},
{id:'royal_treasury',items:[['safe',88,114],['safe',392,114],['gold_cart',136,116],['gold_cart',344,116],['gold_pile',136,242],['gold_pile',344,242],['diamond_case',88,244],['diamond_case',392,244]]},
{id:'crown_hall',items:[['column',92,112],['column',388,112],['column',92,244],['column',388,244],['statue',136,118],['statue',344,118],['gold_pile',136,244],['gold_pile',344,244]]},
{id:'diamond_treasury',items:[['diamond_case',90,114],['diamond_case',138,114],['diamond_case',342,114],['diamond_case',390,114],['gold_cart',136,242],['gold_cart',344,242],['safe',240,220]]},
{id:'grand_reserve',items:[['safe',88,114],['gold_cart',136,116],['gold_pile',184,116],['gold_pile',296,116],['gold_cart',344,116],['safe',392,114],['diamond_case',136,242],['statue',344,242]]}
]
];
function bankNearRect(x:number,y:number,w:number,h:number,cx:number,cy:number,r:number){return x<cx+r&&x+w>cx-r&&y<cy+r&&y+h>cy-r;}
function bankStaticDecorZones(room:MapRoom,content:RoomContent,floor:number){const z:{x:number;y:number;w:number;h:number}[]=[],add=(x:number,y:number,w:number,h:number)=>z.push({x,y,w,h}),plant=(x:number,y:number)=>add(x-10,y-18,20,31),lamp=(x:number,y:number)=>add(x-20,y-25,40,30);if(content.cafe){plant(88,269);plant(392,269);lamp(100,105);lamp(380,105);add(98,247,36,20);add(346,247,36,20);add(136,75,208,72);return z;}if(room.type===RoomType.ITEM){plant(128,263);plant(352,263);lamp(143,120);lamp(337,120);return z;}if(room.type===RoomType.SHOP){plant(84,268);plant(396,268);lamp(96,106);lamp(384,106);return z;}if(room.type===RoomType.START){plant(70,112);plant(410,112);lamp(112,100);lamp(368,100);add(65,270,58,10);add(357,270,58,10);return z;}if(floor===0){plant(78,270);lamp(392,104);add(63,270,58,10);}else if(floor===1){lamp(240,85);add(61,78,25,38);add(394,78,25,38);}else if(floor===2){add(64,258,50,28);add(366,258,50,28);}else if(floor===3){lamp(100,104);lamp(380,104);add(63,266,54,20);add(363,266,54,20);}else{lamp(106,104);lamp(374,104);add(63,264,56,22);add(361,264,56,22);}return z;}
function bankStaticDecorReserved(x:number,y:number,w:number,h:number,room:MapRoom,content:RoomContent,floor:number){for(const q of bankStaticDecorZones(room,content,floor))if(x<q.x+q.w+8&&x+w+8>q.x&&y<q.y+q.h+8&&y+h+8>q.y)return true;return false;}
function bankDynamicReserved(x:number,y:number,w:number,h:number,content:RoomContent){const st:any=content.stairs;if(st&&bankNearRect(x,y,w,h,st.x+16,st.y+16,54))return true;const ped:any=content.pedestal;if(ped&&!ped.taken&&bankNearRect(x,y,w,h,ped.x+12,ped.y+8,48))return true;for(const p of content.choices??[])if(!p.taken&&bankNearRect(x,y,w,h,p.x+12,p.y+8,44))return true;for(const p of content.shopItems??[])if(!p.sold&&bankNearRect(x,y,w,h,p.x,p.y,44))return true;for(const p of (content as any).items??[])if(p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&bankNearRect(x,y,w,h,p.x+8,p.y+8,40))return true;const ev:any=content.event;if(ev&&!ev.used&&bankNearRect(x,y,w,h,ev.x,ev.y,50))return true;return false;}
function bankReserved(x:number,y:number,w:number,h:number,room:MapRoom,content:RoomContent,floor:number,placed:BankProp[]){if(x<56||y<68||x+w>424||y+h>288)return true;if(x<282&&x+w>198&&(y<111||y+h>247))return true;if(y<207&&y+h>145&&(x<112||x+w>368))return true;if(bankDynamicReserved(x,y,w,h,content)||bankStaticDecorReserved(x,y,w,h,room,content,floor))return true;for(const p of placed)if(!p.broken&&x<p.x+p.w+12&&x+w+12>p.x&&y<p.y+p.h+12&&y+h+12>p.y)return true;return false;}
function makeBankProp(kind:BankPropKind,cx:number,cy:number,id:number):BankProp{const d=BANK_PROP_DEFS[kind],x=Math.round(cx-d.w/2),y=Math.round(cy-d.h/2);return{id,kind,x,y,w:d.w,h:d.h,baseX:x+d.bx,baseY:y+d.by,baseW:d.bw,baseH:d.bh,hp:d.hp,maxHp:d.hp,hardness:d.hardness,broken:false,hitFlash:0,touchCd:0};}
function bankReconcileProps(room:MapRoom,content:RoomContent,floor:number){const props=content.bankProps??[],keep:BankProp[]=[];for(const p of props){if(bankDynamicReserved(p.x,p.y,p.w,p.h,content)||bankStaticDecorReserved(p.x,p.y,p.w,p.h,room,content,floor))continue;if(p.broken){keep.push(p);continue;}let clash=false;for(const q of keep){if(p.x<q.x+q.w+12&&p.x+p.w+12>q.x&&p.y<q.y+q.h+12&&p.y+p.h+12>q.y){clash=true;break;}}if(!clash)keep.push(p);}if(keep.length!==props.length)content.bankProps=keep;}
function bankRoomShellRects(room:MapRoom){const r:any[]=[{x:0,y:0,w:210,h:42,s:'N'},{x:270,y:0,w:210,h:42,s:'N'},{x:0,y:304,w:210,h:56,s:'S'},{x:270,y:304,w:210,h:56,s:'S'},{x:0,y:42,w:34,h:108,s:'W'},{x:0,y:202,w:34,h:102,s:'W'},{x:446,y:42,w:34,h:108,s:'E'},{x:446,y:202,w:34,h:102,s:'E'}],ds:any[]=room.doors??[];if(!ds.includes('N'))r.push({x:210,y:0,w:60,h:42,s:'N'});if(!ds.includes('S'))r.push({x:210,y:304,w:60,h:56,s:'S'});if(!ds.includes('W'))r.push({x:0,y:150,w:34,h:52,s:'W'});if(!ds.includes('E'))r.push({x:446,y:150,w:34,h:52,s:'E'});return r;}
function bankResolveRoomShell(engine:GameEngine,room:MapRoom){const b=engine.player;for(let pass=0;pass<2;pass++){let moved=false;for(const r of bankRoomShellRects(room)){const a=bankFootRect(b,14,16);if(!bankRectsOverlap(a,r))continue;if(r.s==='S')b.y-=a.y+a.h-r.y+.5;else if(r.s==='N')b.y+=r.y+r.h-a.y+.5;else if(r.s==='E')b.x-=a.x+a.w-r.x+.5;else b.x+=r.x+r.w-a.x+.5;b.vx=0;b.vy=0;moved=true;}if(!moved)break;}}
function bankSpecialPlan(floor:number,room:MapRoom,content:RoomContent):BankPlan{if(content.cafe)return{id:'staff_cafe',items:[['lounge',126,244],['lounge',354,244],['water',86,116],['plant',394,116]]};if(room.type===RoomType.START)return{id:'arrival_foyer',items:floor>=4?[['column',88,116],['column',392,116],['lounge',136,244],['lounge',344,244]]:[['bench',136,244],['bench',344,244],['plant',88,116],['plant',392,116]]};if(room.type===RoomType.ITEM)return{id:'appraisal_room',items:floor>=4?[['art',88,116],['art',392,116],['diamond_case',136,244],['statue',344,242]]:[['bookcase',88,116],['bookcase',392,116],['plant',136,244],['plant',344,244]]};if(room.type===RoomType.SHOP)return{id:'bank_shop',items:floor>=4?[['lounge',88,244],['lounge',392,244],['art',88,116],['art',392,116]]:[['bench',88,244],['bench',392,244],['water',88,116],['plant',392,116]]};if(room.type===RoomType.EVENT)return{id:'service_event',items:[['bench',126,244],['bench',354,244],['plant',88,116],['water',392,116]]};return BANK_PLANS[floor][0];}
function bankVariantKind(kind:BankPropKind,floor:number,v:number):BankPropKind{if(v===0)return kind;if(floor===0){if(kind==='plant'&&v===2)return'vase';if(kind==='bench'&&v===1)return'lounge';}if(floor===1){if(kind==='filing'&&v===2)return'bookcase';if(kind==='terminal'&&v===1)return'copier';}if(floor===2){if(kind==='crate'&&v===1)return'locker';if(kind==='filing'&&v===2)return'bookcase';}if(floor===3){if(kind==='plant'&&v===2)return'art';if(kind==='art'&&v===1)return'statue';}if(floor===4){if(kind==='cash_cart'&&v===2)return'gold_cart';}if(floor===5){if(kind==='safe'&&v===2)return'diamond_case';}return kind;}
function ensureBankProps(engine:GameEngine,room:MapRoom,content:RoomContent){if(content.bankProps)return;content.bankProps=[];content.bankLayout='clear';if(room.type===RoomType.BOSS||room.type===RoomType.GUN_VAN)return;const floor=Math.max(0,Math.min(5,engine.map.floorIndex)),seed=bankSeed(room,floor),rand=bankRng(seed),special=room.type===RoomType.START||room.type===RoomType.ITEM||room.type===RoomType.SHOP||room.type===RoomType.EVENT||!!content.cafe,plan=special?bankSpecialPlan(floor,room,content):BANK_PLANS[floor][seed%BANK_PLANS[floor].length],mirror=!special&&((seed>>>3)&1)===1,variant=(seed>>>6)%3;content.bankLayout=plan.id+(mirror?'_mirror':'')+'_v'+variant;let id=0;const put=(kind:BankPropKind,cx:number,cy:number)=>{const p=makeBankProp(kind,cx,cy,id++);if(bankReserved(p.x,p.y,p.w,p.h,room,content,floor,content.bankProps!))return false;content.bankProps!.push(p);return true;};for(const [raw,x,y] of plan.items){const kind=bankVariantKind(raw,floor,variant),cx=mirror?480-x:x;put(kind,cx,y);}const fillers:BankPropKind[][]=[['plant','trash'],['plant','water'],['locker','crate'],['art','plant'],['art','statue'],['gold_pile','art']],spots=[[82,242],[398,242],[82,112],[398,112]];const minCount=special?3:7;for(let i=0;content.bankProps.length<minCount&&i<spots.length;i++){const kind=fillers[floor][i%fillers[floor].length],x=mirror?480-spots[i][0]:spots[i][0];put(kind,x,spots[i][1]);}if(!special&&floor>=4&&rand()<(floor===5?.028:.012)){const spots2=[[88,214],[392,214],[120,268],[360,268]];for(const [x,y] of spots2){if(put('money_bag',mirror?480-x:x,y))break;}}}

function bankBaseRect(b:BankProp){return{x:b.baseX,y:b.baseY,w:b.baseW,h:b.baseH};}
function bankFootRect(body:any,w:number,h:number){const fw=Math.max(7,Math.round(w*.62)),fh=Math.max(4,Math.round(h*.24));return{x:body.x+(w-fw)/2,y:body.y+h-fh,w:fw,h:fh};}
function bankRectsOverlap(a:{x:number;y:number;w:number;h:number},b:{x:number;y:number;w:number;h:number}){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}
function bankResolve(body:any,w:number,h:number,b:BankProp){if(b.broken)return;const a=bankFootRect(body,w,h),r=bankBaseRect(b);if(!bankRectsOverlap(a,r))return;const acx=a.x+a.w/2,acy=a.y+a.h/2,bcx=r.x+r.w/2,bcy=r.y+r.h/2,ox=(a.w+r.w)/2-Math.abs(acx-bcx),oy=(a.h+r.h)/2-Math.abs(acy-bcy);if(ox<=0||oy<=0)return;if(ox<oy){body.x+=acx<bcx?-ox:ox;if(typeof body.vx==='number')body.vx=0;}else{body.y+=acy<bcy?-oy:oy;if(typeof body.vy==='number')body.vy=0;}}
function bankSegmentRect(x0:number,y0:number,x1:number,y1:number,b:{x:number;y:number;w:number;h:number},r:number){const minX=b.x-r,maxX=b.x+b.w+r,minY=b.y-r,maxY=b.y+b.h+r,dx=x1-x0,dy=y1-y0;let t0=0,t1=1;const axis=(p:number,d:number,mn:number,mx:number)=>{if(Math.abs(d)<.0001)return p>=mn&&p<=mx;let a=(mn-p)/d,c=(mx-p)/d;if(a>c){const q=a;a=c;c=q;}t0=Math.max(t0,a);t1=Math.min(t1,c);return t0<=t1;};return axis(x0,dx,minX,maxX)&&axis(y0,dy,minY,maxY);}
function bankCrumbs(content:RoomContent,p:BankProp,n:number){for(let i=0;i<n;i++)content.pickups.push({x:p.x+p.w/2+(i-(n-1)/2)*7,y:p.y+p.h/2+(i%2?4:-3),type:'crumb',value:1,lifetime:99999});}
function bankDrop(engine:GameEngine,content:RoomContent,p:BankProp){const r=Math.random();switch(p.kind){case'vase':if(r<.32)bankCrumbs(content,p,1);break;case'plant':case'trash':case'queue':if(r<.16)bankCrumbs(content,p,1);break;case'archive':case'crate':case'bookcase':if(r<.2)bankCrumbs(content,p,1);break;case'bread_rack':if(r<.3)bankCrumbs(content,p,r<.07?2:1);break;case'desk':case'chair':case'bench':case'counter':case'cubicle':case'divider':case'meeting':case'lounge':case'teller':if(r<.1)bankCrumbs(content,p,1);break;case'filing':case'copier':case'server':case'water':case'security_console':case'locker':case'terminal':case'atm':if(r<.12)bankCrumbs(content,p,1);break;case'safe':if(r<.36)bankCrumbs(content,p,r<.08?2:1);break;case'cash_cart':if(r<.68)bankCrumbs(content,p,r<.12?2:1);break;case'gold_pile':case'gold_cart':bankCrumbs(content,p,r<.28?2:1);break;case'diamond_case':bankCrumbs(content,p,r<.34?2:1);break;case'statue':case'art':case'column':if(r<.08)bankCrumbs(content,p,1);break;case'vending':{const occupied=!!(content.pedestal&&!content.pedestal.taken)||(content.choices??[]).some(x=>!x.taken)||(content.shopItems??[]).some(x=>!x.sold)||!!(content.event&&!content.event.used);if(!occupied){content.pedestal={x:p.x+p.w/2-12,y:p.y+p.h/2-6,itemId:r<.78?'hp':'croissant',isWeapon:false,taken:false,isFood:true,rise:0};engine.toast='COMIDA DE LA EXPENDEDORA';engine.toastTimer=65;}else bankCrumbs(content,p,1);break;}case'money_bag':engine.totalGoldenCrumbs+=1;engine.run.goldenEarned+=1;engine.stats.goldenCrumbs+=1;saveProgress(engine);engine.toast='+1 MONEDA · BOLSA DE DINERO';engine.toastTimer=80;spawn(engine,p.x+p.w/2,p.y+p.h/2,'spark',12,'#f4d03f');break;}}
function bankBreak(engine:GameEngine,content:RoomContent,p:BankProp){if(p.broken)return;p.broken=true;p.hp=0;const metal=p.hardness>=1.4;spawn(engine,p.x+p.w/2,p.y+p.h/2,'spark',metal?12:9,metal?'#9aa6b2':'#c9945d');engine.shakeIntensity=Math.max(engine.shakeIntensity,metal?2.2:1.2);if(p.kind==='vending'||p.kind==='safe'||p.kind==='server')playExplosion();bankDrop(engine,content,p);}
function bankDamage(engine:GameEngine,content:RoomContent,p:BankProp,raw:number){if(p.broken)return;const dmg=Math.max(.65,raw/Math.max(.65,p.hardness));p.hp-=dmg;p.hitFlash=6;spawn(engine,p.x+p.w/2,p.y+p.h/2,'spark',dmg>8?5:3,p.hardness>=1.4?'#aeb8c1':'#d2a06a');if(p.hp<=0)bankBreak(engine,content,p);}
function damageBankPropsInRadius(engine:GameEngine,content:RoomContent,x:number,y:number,raw:number,radius:number,_friendly:boolean){const room=currentRoomOf(engine);ensureBankProps(engine,room,content);for(const p of content.bankProps??[]){if(p.broken)continue;const dx=p.x+p.w/2-x,dy=p.y+p.h/2-y,d=Math.hypot(dx,dy);if(d<radius+Math.max(p.w,p.h)*.35)bankDamage(engine,content,p,raw*Math.max(.25,1-d/(radius+20)));}}
function projectileHitsBankProp(engine:GameEngine,p:Projectile,content:RoomContent){const room=currentRoomOf(engine);ensureBankProps(engine,room,content);const x0=p.x-p.vx,y0=p.y-p.vy,r=Math.max(2,p.radius??2),q:any=p,hits:Set<number>=q.bankPropHits??(q.bankPropHits=new Set<number>());for(const b of content.bankProps??[]){if(b.broken||hits.has(b.id)||!bankSegmentRect(x0,y0,p.x,p.y,{x:b.x,y:b.y,w:b.w,h:b.h},r))continue;hits.add(b.id);bankDamage(engine,content,b,p.friendly?Math.max(2,p.damage):Math.max(4,p.damage*5));if((p.explode??0)>0)explode(engine,p,content);if((p.penetration??0)>0){p.penetration=Math.max(0,p.penetration-1);return false;}return true;}return false;}
export function updateBankProps(engine:GameEngine){if(engine.state!==GameState.PLAYING)return;resolveGreekItemPedestalCollision(engine);const room=currentRoomOf(engine),content=getContentOf(engine,room),c:any=content;if(c.bankPropTick===engine.frame)return;c.bankPropTick=engine.frame;ensureBankProps(engine,room,content);bankReconcileProps(room,content,engine.map.floorIndex);bankResolveRoomShell(engine,room);const props=content.bankProps??[];for(const b of props){if(b.hitFlash>0)b.hitFlash--;if(b.touchCd>0)b.touchCd--;}for(let i=engine.projectiles.length-1;i>=0;i--){const p=engine.projectiles[i];if(projectileHitsBankProp(engine,p,content))engine.projectiles.splice(i,1);}const pl=engine.player,foot=bankFootRect(pl,14,16),pcx=foot.x+foot.w/2,pcy=foot.y+foot.h/2,prevX=c.bankPrevPX??pcx,prevY=c.bankPrevPY??pcy;if(pl.dashTimer>0){for(const b of props){if(b.broken||!bankSegmentRect(prevX,prevY,pcx,pcy,bankBaseRect(b),3))continue;bankDamage(engine,content,b,b.hardness<=1.1?14:5);if(!b.broken){pl.x+=(prevX-pcx);pl.y+=(prevY-pcy);pl.vx=0;pl.vy=0;break;}}}for(const b of props)bankResolve(pl,14,16,b);const pf=bankFootRect(pl,14,16);c.bankPrevPX=pf.x+pf.w/2;c.bankPrevPY=pf.y+pf.h/2;for(const en of content.enemies){if(en.hp<=0)continue;for(const b of props){if(b.broken)continue;const ef=bankFootRect(en,en.size,en.size),br=bankBaseRect(b);if(!bankRectsOverlap(ef,br))continue;if(b.touchCd<=0){bankDamage(engine,content,b,en.isBoss?15:4.5);b.touchCd=en.isBoss?8:15;}if(!b.broken)bankResolve(en,en.size,en.size,b);}}}

function greekRewardEligible(room:any,ped:any){return !!ped&&(room.type===RoomType.ITEM||ped.bossLoot===true);}
function greekItemPedestals(room:any,content:any){const out:any[]=[];const main=content.pedestal;if(main&&!main.taken&&greekRewardEligible(room,main))out.push(main);if(!content.choiceTaken)for(const p of content.choices??[])if(p&&!p.taken&&greekRewardEligible(room,p)&&!out.includes(p))out.push(p);return out;}
function greekPedestalBaseRect(ped:any){const cx=Math.round(ped.x+12),top=Math.round(ped.y+12);return{x:cx-9,y:top+7,w:18,h:3};}
function greekResolvePlayerBase(body:any,r:{x:number;y:number;w:number;h:number}){const a=bankFootRect(body,14,16);if(!bankRectsOverlap(a,r))return false;const left=a.x+a.w-r.x,right=r.x+r.w-a.x,up=a.y+a.h-r.y,down=r.y+r.h-a.y,cands=[{d:left,x:-(left+.75),y:0},{d:right,x:right+.75,y:0},{d:up,x:0,y:-(up+.75)},{d:down,x:0,y:down+.75}].filter(q=>q.d>0).sort((u,v)=>u.d-v.d);if(!cands.length)return false;const q=cands[0];body.x+=q.x;body.y+=q.y;if(q.x&&typeof body.vx==='number')body.vx=0;if(q.y&&typeof body.vy==='number')body.vy=0;return true;}
function resolveGreekItemPedestalCollision(engine:GameEngine){const room=currentRoomOf(engine),content=getContentOf(engine,room),c:any=content,peds=greekItemPedestals(room,content);if(!peds.length)return;const pl=engine.player,foot=bankFootRect(pl,14,16),cx=foot.x+foot.w/2,cy=foot.y+foot.h/2,prevX=c.greekPedPrevX??cx,prevY=c.greekPedPrevY??cy;for(const ped of peds){const r=greekPedestalBaseRect(ped),a=bankFootRect(pl,14,16);if(pl.dashTimer>0&&!bankRectsOverlap(a,r)&&bankSegmentRect(prevX,prevY,cx,cy,r,1)){const dx=cx-prevX,dy=cy-prevY,len=Math.hypot(dx,dy)||1;pl.x-=dx+dx/len*.75;pl.y-=dy+dy/len*.75;pl.vx=0;pl.vy=0;break;}greekResolvePlayerBase(pl,r);}const af=bankFootRect(pl,14,16);c.greekPedPrevX=af.x+af.w/2;c.greekPedPrevY=af.y+af.h/2;}
function gunfeelHash(id:string){let h=2166136261;for(let i=0;i<id.length;i++){h^=id.charCodeAt(i);h=Math.imul(h,16777619);}return Math.abs(h|0);}
function gunfeelColorFrom(id:string,type=''){const q=(id+' '+type).toLowerCase();if(q.includes('gold')||q.includes('coin')||q.includes('egg'))return '#f4d03f';if(q.includes('plasma')||q.includes('laser')||q.includes('quant')||q.includes('rayo'))return q.includes('quant')?'#b58cff':'#67d7e8';if(q.includes('toast')||q.includes('horno')||q.includes('fire')||q.includes('mustard'))return '#ff9f43';if(q.includes('butter')||q.includes('jarabe')||q.includes('mermelada'))return '#ffd95a';if(q.includes('bread')||q.includes('crumb')||q.includes('baguette')||q.includes('dough')||q.includes('miga')||q.includes('pan'))return '#e9bd72';const c=['#f5f0d7','#9fd9e4','#e49c8c','#c6a6e8','#b8d58b','#e6b875','#b7c4d0'];return c[gunfeelHash(id)%c.length];}
function gunfeelRecoilForce(w:any){const pellets=Math.max(1,w?.projectileCount??1),dmg=Math.max(1,w?.damage??1);return Math.min(.24,.045+dmg*.003+Math.min(5,pellets)*.012+(w?.continuous?-.025:0));}
function gunfeelMuzzle(engine:GameEngine,p:any,w:any,dx:number,dy:number){const id=String(w?.id??'weapon'),type=String(w?.projectileType??''),h=gunfeelHash(id),c=gunfeelColorFrom(id,type),mx=p.x+7+dx*11,my=p.y+8+dy*11,n=2+(h%3)+((w?.projectileCount??1)>=4?2:0);spawn(engine,mx,my,'spark',n,c);if(/bread|crumb|baguette|dough|miga|pan|toast/i.test(id+' '+type)&&!w?.continuous)spawn(engine,mx,my,'crumb',1+(h%2),'#e6bc78');const recoil=gunfeelRecoilForce(w);p.vx-=dx*recoil;p.vy-=dy*recoil;p.shootFlash=Math.max(p.shootFlash,w?.continuous?2:4);engine.shakeIntensity=Math.max(engine.shakeIntensity,w?.continuous?.12:Math.min(.75,.16+(w?.damage??1)*.012));}
function gunfeelEnemyHit(engine:GameEngine,e:Enemy,p:Projectile,damage:number,crit:boolean,content:RoomContent,preHp:number){if(preHp<=0)return;const w=p.sourceWeapon?WEAPONS[p.sourceWeapon]:undefined,killed=e.hp<=0,continuous=!!w?.continuous,heavy=damage>=18||(w?.projectileCount??1)>=5||(w?.knockback??0)>=3,dirLen=Math.hypot(p.vx,p.vy)||1,dx=p.vx/dirLen,dy=p.vy/dirLen,c=gunfeelColorFrom(String(p.sourceWeapon??p.type),String(p.type));let stop=killed?(e.isBoss?2:e.elite?4:3):crit?2:heavy?2:1;if(continuous&&engine.frame%5!==0)stop=0;if(stop>0)engine.hitStop=Math.max(engine.hitStop,stop);e.hurtTimer=Math.max(e.hurtTimer,crit?9:6);if(e.hp>0){const push=e.isBoss?.12:Math.min(.75,.18+Math.min(2.5,p.knockback??0)*.13+Math.min(20,damage)*.012);moveEnemy(e,currentRoomOf(engine),dx*push,dy*push);}const cx=e.x+e.size/2,cy=e.y+e.size/2;spawn(engine,cx,cy,'spark',crit?8:heavy?6:4,c);if(/bread|crumb|baguette|dough|miga|pan|toast/i.test(String(p.sourceWeapon??'')+' '+p.type))spawn(engine,cx,cy,'crumb',crit?4:2,'#e8be7a');engine.shakeIntensity=Math.max(engine.shakeIntensity,killed?(e.isBoss?2.2:1.7):crit?1.15:heavy?.8:.4);if(killed&&!e.isBoss){spawn(engine,cx,cy,'spark',e.elite?16:11,c);spawn(engine,cx,cy,'crumb',e.elite?8:5,'#d8dde3');}}

function dangerEventPool(floor:number){
  const pools=[['policia_pato','policia_rapido'],['policia_pato','policia_rapido','policia_escopeta'],['policia_rapido','policia_escopeta','dron_policial'],['policia_escopeta','dron_policial','policia_francotirador'],['policia_escopeta','dron_policial','policia_francotirador','policia_rapido'],['policia_escopeta','dron_policial','policia_francotirador','policia_rapido']];
  return pools[Math.max(0,Math.min(5,floor))];
}
function dangerEventSpawn(engine:GameEngine,room:MapRoom,content:RoomContent,count:number){
  const c:any=content,floor=Math.max(0,Math.min(5,engine.map.floorIndex)),pool=dangerEventPool(floor);
  ensureBankProps(engine,room,content);
  const spots=freeTiles(room.layout,2).filter(s=>{
    const wx=s.x*TILE_SIZE+TILE_SIZE/2,wy=s.y*TILE_SIZE+TILE_SIZE/2;
    if(Math.hypot(wx-(engine.player.x+7),wy-(engine.player.y+8))<105)return false;
    if((room.doors??[]).some(dir=>{const d=DOOR_TILE[dir];return Math.hypot(s.x-d.x,s.y-d.y)<2.7;}))return false;
    if((c.bankProps??[]).some((p:any)=>!p.broken&&wx>p.x-20&&wx<p.x+p.w+20&&wy>p.y-20&&wy<p.y+p.h+20))return false;
    if(c.event&&!c.event.used&&Math.hypot(wx-c.event.x,wy-c.event.y)<56)return false;
    return true;
  });
  for(let i=0;i<count&&spots.length;i++){
    const si=Math.floor(Math.random()*spots.length),s=spots.splice(si,1)[0],type=pool[Math.floor(Math.random()*pool.length)];
    content.enemies.push(makeEnemy(type,floorScale(engine.map.floorIndex,room.distance),s.x,s.y,false));
  }
}
function updateDangerEventRoom(engine:GameEngine){
  if(engine.state!==GameState.PLAYING)return;
  const room=currentRoomOf(engine),content=getContentOf(engine,room),c:any=content,ee:any=engine;
  const highRisk=room.type===RoomType.EVENT&&!c.cafe;
  if(!highRisk){
    if(ee.dangerEventMusic){ee.dangerEventMusic=false;setMusic(room.type===RoomType.BOSS?'boss':'run',engine.map.floorIndex);}
    return;
  }
  if(c.dangerEventDone){
    if(ee.dangerEventMusic){ee.dangerEventMusic=false;setMusic('run',engine.map.floorIndex);}
    return;
  }
  const floor=Math.max(0,Math.min(5,engine.map.floorIndex));
  if(!c.dangerEventStarted){
    c.dangerEventStarted=true;c.dangerEventActive=true;c.dangerEventTotal=(20+floor*2)*60;c.dangerEventTimer=c.dangerEventTotal;c.dangerEventWave=false;c.dangerEventPressure=0;
    dangerEventSpawn(engine,room,content,4+(floor>=2?1:0)+(floor>=4?1:0));
    room.cleared=false;engine.roomLabel='EVENTO DE ALTO RIESGO';engine.roomLabelTimer=90;engine.shakeIntensity=Math.max(engine.shakeIntensity,2.5);
  }
  if(!c.dangerEventActive)return;
  ee.dangerEventMusic=true;setMusic('event',floor);room.cleared=false;
  if(c.dangerEventTimer>0)c.dangerEventTimer--;
  const elapsed=c.dangerEventTotal-c.dangerEventTimer;
  if(!c.dangerEventWave&&elapsed>=c.dangerEventTotal*.5){
    c.dangerEventWave=true;dangerEventSpawn(engine,room,content,2+(floor>=3?1:0));engine.roomLabel='¡REFUERZOS EN CAMINO!';engine.roomLabelTimer=72;engine.shakeIntensity=Math.max(engine.shakeIntensity,3);
  }
  if(c.dangerEventTimer>0&&content.enemies.length===0&&engine.frame>c.dangerEventPressure){
    c.dangerEventPressure=engine.frame+210;dangerEventSpawn(engine,room,content,2+(floor>=4?1:0));
  }
  if(c.dangerEventTimer<=0&&content.enemies.length===0){
    c.dangerEventActive=false;c.dangerEventDone=true;ee.dangerEventMusic=false;setMusic('run',floor);engine.toast='EVENTO SUPERADO';engine.toastTimer=90;
  }
}
export function updateEngine(engine: GameEngine) {
  updateDangerEventRoom(engine);
  if(engine.state===GameState.MAP) return;
  engine.frame++;
  if(engine.state===GameState.HEIST_INTRO) {
    if(--engine.heistIntroTimer<=0) { engine.heistIntroSeen=true;startGame(engine); }
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
  updateTutorial(engine);
  if(engine.hitStop>0) {engine.hitStop--;return;}
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
      startGame(engine);
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
  if (engine.keys['w']) inY = -1;
  if (engine.keys['s']) inY = 1;
  if (engine.keys['a']) inX = -1;
  if (engine.keys['d']) inX = 1;
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

  if(Math.abs(inX)>Math.abs(inY)){if(inX>0)player.dir='right';else if(inX<0)player.dir='left';}
  else if(inY!==0)player.dir=inY>0?'down':'up';
  const visualAim=aimVector(engine),hasVisualAim=engine.lastInput==='gamepad'?Math.hypot(engine.pad.aimX,engine.pad.aimY)>.18:(engine.mouseX!==0||engine.mouseY!==0);
  if(hasVisualAim){player.facingAngle=Math.atan2(visualAim.y,visualAim.x);if(Math.abs(visualAim.x)>Math.abs(visualAim.y))player.dir=visualAim.x>0?'right':'left';else player.dir=visualAim.y>0?'down':'up';}

  if (player.hurtTimer > 0) player.hurtTimer--;
  if (player.iFrames > 0) player.iFrames--;
  if (player.flash > 0) player.flash--;
  if (player.shootFlash > 0) player.shootFlash--;

  // --- Disparo con el arma activa (sólo click izquierdo o flechas) ---
  if (player.fireCooldown > 0) player.fireCooldown=Math.max(0,player.fireCooldown-build.cooldownRate);
  if (player.overheat > 0) player.overheat--;
  if(!engine.mouseDown&&player.heat>0)player.heat=Math.max(0,player.heat-1.45);
  if (engine.mouseDown && (activeWeapon(player).id === 'plasma_baker' || activeWeapon(player).id === 'golden_egg_revolver' || activeWeapon(player).id === 'baguette_sniper')) player.charge = Math.min(70, player.charge + 1);
  if (engine.coffeeCrash > 0) { engine.coffeeCrash--; player.speedBoost = Math.max(0, player.speedBoost); }
  let sx = 0, sy = 0;
  if (engine.keys['arrowleft']) sx = -1;
  if (engine.keys['arrowright']) sx = 1;
  if (engine.keys['arrowup']) sy = -1;
  if (engine.keys['arrowdown']) sy = 1;
  if(engine.pad.connected && engine.pad.shoot && Math.hypot(engine.pad.aimX,engine.pad.aimY)>.18) {
    sx=engine.pad.aimX;sy=engine.pad.aimY;
  }
  if (engine.mouseDown && !sx && !sy) {
    const mx = engine.mouseX - (player.x + 7);
    const my = engine.mouseY - (player.y + 8);
    const md = Math.hypot(mx, my);
    if (md > 6) { sx = mx / md; sy = my / md; }
  }
  if((sx||sy)&&player.fireCooldown<=0&&player.switchAnim<=6&&player.dashTimer<=0&&!(activeWeapon(player).id==='feather_gun'&&player.overheat>0)) {
    fireWeapon(engine, sx, sy);
    const w=activeWeapon(player),synergyRate=w.id==='feather_gun'&&player.items.includes('oxxo_coffee')?1.3:1;
    const explosiveRate=w.explode?build.explosiveRate:1;
    player.fireCooldown = Math.max(2,Math.round(w.fireRate/(build.fireRate*explosiveRate*synergyRate*(player.fireBoost>0?player.fireBoostPower:1))));
    player.facingAngle=Math.atan2(sy,sx);
    player.shootFlash = 4;
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
      if(Math.random()<build.duplicates) engine.projectiles.push({...proj,vy:proj.vy+.25,hitEnemies:new Set()});
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
      if (dist(player.x + 7, player.y + 8, e.x + e.size / 2, e.y + e.size / 2) < e.size / 2 + 7) {
        damagePlayer(engine,e.dmgMul,'contact',isPolice(e),e,e.behavior);
      }
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
    const d2 = dist(p.x, p.y, player.x + 7, player.y + 8);
    // sólo las monedas son arrastradas automáticamente; la comida no
    if (isCoin && (d2<magnet || autoMagnet || instantMagnet)) {
      if(build.king && !room.cleared && d2<65) {
        const a=engine.frame*.06+i*1.7;
        p.x=lerp(p.x,player.x+7+Math.cos(a)*32,.15);p.y=lerp(p.y,player.y+8+Math.sin(a)*32,.15);
        if(engine.frame%30===i%30) for(const enemy of [...content.enemies]) if(dist(p.x,p.y,enemy.x+enemy.size/2,enemy.y+enemy.size/2)<20) damageEnemy(engine,enemy,2,false,content);
        continue;
      }
      const a = Math.atan2(player.y + 8 - p.y, player.x + 7 - p.x)+Math.sin(engine.frame*.09+i)*.16;
      p.vx=lerp(p.vx ?? 0,Math.cos(a)*Math.min(8,d2*.15+2),.16);
      p.vy=lerp(p.vy ?? 0,Math.sin(a)*Math.min(8,d2*.15+2),.16);
      p.x+=p.vx;p.y+=p.vy;
    if(projectileHitsBankProp(engine,p,content)){engine.projectiles.splice(i,1);continue;}
      if(autoMagnet && engine.frame%6===i%6) spawn(engine,p.x,p.y,'spark',1,'#e8c99b');
    }
    if (d2 < 14) {
      if(!isCoin && player.hp>=player.maxHp) continue;
      if (p.type === 'crumb') { player.crumbs += p.value; engine.stats.breadStolen += p.value; }
      else if (p.type === 'golden_crumb') {
        player.goldenCrumbs += p.value;
        engine.stats.goldenCrumbs += p.value;
        engine.run.goldenEarned += p.value;
        engine.totalGoldenCrumbs += p.value;
        saveProgress(engine);   // las monedas se guardan al instante
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
      if(!isCoin && Math.random()<build.keepFood) {p.collectDelay=75;spawn(engine,p.x,p.y,'spark',2,'#afd9ae');}
      else content.pickups.splice(i, 1);
      continue;
    }
    if (p.lifetime <= 0 && isCoin) content.pickups.splice(i, 1);
  }

  // --- Objetos en el suelo ---
  if (engine.swapGuard > 0) engine.swapGuard--;
  for (let i = content.items.length - 1; i >= 0; i--) {
    const it = content.items[i];
    if (dist(it.x + 8, it.y + 8, player.x + 7, player.y + 8) < 24 && engine.keys['e'] && engine.swapGuard <= 0) {
      if (it.isWeapon) {
        if (!tryGiveWeapon(engine, it.itemId, 'floor', i, it.x, it.y)) {
          engine.keys['e'] = false;
          continue;   // se abre el menú de reemplazo; el arma sigue en el suelo
        }
      } else if (ACTIVE_ITEMS[it.itemId] && engine.player.activeItem && engine.player.activeItem !== it.itemId) {
        if (!offerActiveSwap(engine, it.itemId, 'floor', i, it.x, it.y)) { engine.keys['e'] = false; continue; }
      } else {
        grantItem(engine, it.itemId, false, !!ACTIVE_ITEMS[it.itemId]);
      }
      spawn(engine, it.x + 8, it.y + 8, 'spark', 10, '#f4d03f');
      content.items.splice(i, 1);
      engine.keys['e'] = false;
    }
  }

  // --- Pedestales ---
  if (content.pedestal && !content.pedestal.taken) {
    const ped=content.pedestal;
    const close=dist(ped.x+12,ped.y+(currentRoomOf(engine).type===RoomType.ITEM?9:0),player.x+7,player.y+8)<(currentRoomOf(engine).type===RoomType.ITEM?30:28);
    const autoFood=!!ped.isFood&&player.hp<player.maxHp;
    if(close&&(autoFood||(!ped.isFood&&engine.keys['e']))){
      let ok=true;
      if(ped.isFood){healPlayer(engine,foodHeal(ped.itemId));playHeal();}
      else if(ped.isWeapon)ok=tryGiveWeapon(engine,ped.itemId,'pedestal',-1,ped.x,ped.y-20);
      else if(ACTIVE_ITEMS[ped.itemId]&&player.activeItem&&player.activeItem!==ped.itemId)ok=offerActiveSwap(engine,ped.itemId,'pedestal',-1,ped.x,ped.y);
      else grantItem(engine,ped.itemId,false,!!ACTIVE_ITEMS[ped.itemId]);
      if(ok){ped.taken=true;spawn(engine,ped.x+12,ped.y,'spark',20,'#f4d03f');engine.shakeIntensity=Math.max(engine.shakeIntensity,2);}
      engine.keys['e']=false;
    }
  }

  if(content.choices&&!content.choiceTaken&&!engine.swap){
    for(let i=0;i<content.choices.length;i++){
      const ped=content.choices[i],close=!ped.taken&&dist(ped.x+12,ped.y+(currentRoomOf(engine).type===RoomType.ITEM?9:0),player.x+7,player.y+8)<(currentRoomOf(engine).type===RoomType.ITEM?30:28);
      const autoFood=!!ped.isFood&&player.hp<player.maxHp;
      if(close&&(autoFood||(!ped.isFood&&engine.keys.e))){
        let ok=true;
        if(ped.isFood){healPlayer(engine,foodHeal(ped.itemId));playHeal();}
        else if(ped.isWeapon)ok=tryGiveWeapon(engine,ped.itemId,'choice',i,ped.x,ped.y);
        else grantItem(engine,ped.itemId,false,!!ACTIVE_ITEMS[ped.itemId]);
        if(ok){finishChoice(content);spawn(engine,ped.x+12,ped.y,'spark',14,'#cbaeef');}
        engine.keys.e=false;break;
      }
    }
  }
  if(content.event && !content.event.used && engine.keys.e && dist(player.x+7,player.y+8,content.event.x+8,content.event.y+8)<40) {
    engine.keys.e=false;activateEvent(engine);
  }

  // --- Cofre ---
  if (content.chest && !content.chest.opened) {
    const c = content.chest;
    if (dist(player.x + 7, player.y + 8, c.x + 10, c.y + 8) < 28 && engine.keys['e']) {
      c.opened = true;
      engine.keys['e'] = false;
      content.items.push({ x: c.x - 6, y: c.y - 22, itemId: rollItem(engine), isWeapon: false, isActive: false });
      for (let i = 0; i < 6; i++) {
        content.pickups.push({ x: c.x + rng(-22, 22), y: c.y + rng(-18, 18), type: 'crumb', value: rngInt(2, 5), lifetime: 99999 });
      }
      if (Math.random() < 0.3) content.pickups.push({ x: c.x + 24, y: c.y, type: 'hp', value: 1, lifetime: 99999 });
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
      if (dist(player.x + 7, player.y + 8, s.x, s.y) < 26 && engine.keys['e']) {
        const price=shopPrice(engine,s);if(s.isFood){if(player.hp>=player.maxHp){engine.toast='VIDA COMPLETA';engine.toastTimer=65;playDeny();s.deniedUntil=engine.frame+35;}else if(player.crumbs>=price){player.crumbs-=price;s.sold=true;s.soldAt=engine.frame;healPlayer(engine,foodHeal(s.itemId));engine.toast=s.itemId==='torta'?T.heal3:s.itemId==='baguette'||s.itemId==='sandwich'?T.heal2:T.heal1;engine.toastTimer=60;playHeal();showPickupCard(engine,s.itemId,false,true);spawn(engine,s.x,s.y,'spark',10,'#ff9eaa');merchantSpeak(engine,'Calientito y sin preguntas.');}else{engine.toast=T.notEnough;engine.toastTimer=70;playDeny();s.deniedUntil=engine.frame+40;}engine.keys.e=false;continue;}if (player.crumbs >= price) {
          let ok = true;
          if (s.isWeapon) ok = tryGiveWeapon(engine, s.itemId, 'shop', si, s.x, s.y - 20);
          else if (ACTIVE_ITEMS[s.itemId] && player.activeItem && player.activeItem !== s.itemId) ok = offerActiveSwap(engine, s.itemId, 'shop', si, s.x, s.y);
          if (ok) {
            player.crumbs -= price;
            player.couponUsed=true;s.soldAt=engine.frame;s.sold = true;
            if (!s.isWeapon && !ACTIVE_ITEMS[s.itemId]) grantItem(engine, s.itemId, false, false);
            if (!s.isWeapon && ACTIVE_ITEMS[s.itemId] && !engine.activeSwap) grantItem(engine, s.itemId, false, true);
            spawn(engine, s.x, s.y, 'spark', 10, '#f4d03f');
            playEquip();merchantSpeak(engine,pick(['No hago devoluciones.','Buena elección. Creo.','No tengo factura.']));
          }
        } else {
          engine.toast = T.notEnough; engine.toastTimer = 70; playDeny();s.deniedUntil=engine.frame+40;
          if((content.merchantUntil ?? 0)<engine.frame) merchantSpeak(engine,pick(['Te faltan migajas.','Mira, pero no toques.']));
        }
        engine.keys['e'] = false;
      }
    }
  }

  // --- Escalera del jefe ---
  if (content.stairs) {
    content.stairs.glow = Math.min(1, content.stairs.glow + 0.02);
    if (content.stairs.unlocked) {
      const st = content.stairs;
      if (dist(player.x + 7, player.y + 8, st.x + 16, st.y + 16) < 34 && engine.keys['e']) {
        engine.keys['e'] = false;
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
  if (!room.cleared && content.enemies.length === 0 && (content.alarmTimer ?? 0)<=0) {
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
        if(!content.perfectAwarded&&Math.random()<.25)content.pickups.push({x:240,y:192,type:Math.random()<.85?'crumb':'hp',value:5,lifetime:99999});
        if(engine.roomStreak===3||engine.roomStreak===5){player.perfectBuff=600;engine.toast=engine.roomStreak===3?'3 SALAS · IMPECABLE':'5 SALAS · PROFESIONAL';engine.toastTimer=110;}
      }else engine.roomStreak=0;
      content.perfectAwarded=true;
      if(build.foodEvery&&engine.stats.roomsCleared%build.foodEvery===0)content.pickups.push({x:240,y:192,type:rollFood(),value:1,lifetime:99999});
    }
    applyMapItemEffects(engine,false);
    spawn(engine, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 'spark', 16, '#39d353');
    if ((room.type === RoomType.COMBAT || room.type === RoomType.CHALLENGE) && Math.random() < .16+getBuild(player).rewardChance+engine.alert*.0006+(room.modifier==='alarm'?.1:0)) {
      content.items.push({ x: CANVAS_WIDTH / 2 - 8, y: CANVAS_HEIGHT / 2 - 8, itemId: rollItem(engine), isWeapon: false, isActive: false });
    }
    if (room.type === RoomType.CHALLENGE) {
      content.pickups.push({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 + 26, type: 'golden_crumb', value: 3, lifetime: 99999 });
      if(content.challenge==='alarm' || !content.damaged) content.items.push({x:232,y:150,itemId:rollBossRewardItem(engine),isWeapon:false,isActive:false});
    }
    if(content.event?.kind==='interrogation') content.items.push({x:232,y:155,itemId:rollBossRewardItem(engine),isWeapon:false,isActive:false});
    if(room.type===RoomType.BOSS) {content.rewardTimer=75;setMusic('run',engine.map.floorIndex);}
    if(room.type===RoomType.COMBAT && Math.random()<.12) content.pickups.push({x:240,y:198,type:'hp',value:1,lifetime:99999});
  }

  for (const d of room.doors) {
    content.doorAnim[d] = lerp(content.doorAnim[d] ?? 0, room.cleared ? 1 : 0, 0.12);
  }
  if (content.lockFlash > 0) content.lockFlash--;

  // --- Recompensa del jefe + escalera ---
  if ((content.rewardTimer ?? 0) > 0) {
    content.rewardTimer!--;
    if (content.rewardTimer === 0 && room.type === RoomType.BOSS && !content.stairs) {
      const asWeapon=Math.random()<.45,p=pickPassive(engine,undefined,[],true),id=asWeapon||!p?rollWeapon(engine,true):p;const pedestal:Pedestal={x:CANVAS_WIDTH/2-12,y:CANVAS_HEIGHT/2-14,itemId:id,isWeapon:!!WEAPONS[id],taken:false,bossLoot:true,rise:0};if(Math.random()<.4){const p2=pickPassive(engine,undefined,[id],true),i2=p2??rollWeapon(engine,true),p3=pickPassive(engine,undefined,[id,i2],true),i3=p3??rollWeapon(engine,true);content.choices=[{...pedestal,x:132,itemId:rollWeapon(engine,true),isWeapon:true},{...pedestal,x:228,itemId:i2,isWeapon:!!WEAPONS[i2]},{...pedestal,x:324,itemId:i3,isWeapon:!!WEAPONS[i3]}];}else content.pedestal=pedestal;
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
function tryGiveWeapon(engine: GameEngine, itemId: string, from: 'floor' | 'pedestal' | 'shop' | 'choice', srcIndex: number, wx: number, wy: number): boolean {
  if(!WEAPONS[itemId]) return false;
  const p = engine.player;
  const empty = p.weapons.findIndex(w => w === null);
  if (empty >= 0) {
    p.weapons[empty] = { ...WEAPONS[itemId] };
    p.activeWeapon=empty;
    p.switchAnim=12;   // el arma recién recogida pasa a la mano
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
  const source=req.from==='floor'?content.items[req.srcIndex]:req.from==='shop'?content.shopItems?.[req.srcIndex]:req.from==='choice'?content.choices?.[req.srcIndex]:content.pedestal;
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
  if (old) content.items.push({ x: dx, y: dy, itemId: old.id, isWeapon: true, isActive: false });

  engine.swap = null;
  engine.keys.e=false;engine.mouseDown=false;
  playEquip();
  showPickupCard(engine, req.itemId, true);
  spawn(engine, p.x + 7, p.y + 8, 'spark', 12, '#f4d03f');
}

export function cancelSwap(engine: GameEngine) {
  if (!engine.swap && !engine.activeSwap) return;
  engine.swap = null;
  engine.activeSwap = null;
  engine.keys.e=false;engine.mouseDown=false;
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
  engine.keys.e = false;
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
  const n=Math.random();
  return n<.01?'pan_dorado':n<.06?'torta':n<.2?'baguette':n<.4?'sandwich':n<.55?'croissant':'hp';
}

function healPlayer(engine: GameEngine, n: number) {
  const p = engine.player;
  if (n >= 99) p.hp = p.maxHp;
  else p.hp = Math.min(p.maxHp, p.hp + n*getBuild(p).healing);
  p.healFlash=36;
  if(getBuild(p).honey) p.honeyTimer=300;
  if(getBuild(p).chocolate) p.chocolateTimer=300;
}

export function grantItem(engine: GameEngine, itemId: string, _isWeapon=false, isActive=false) {
  const p = engine.player;
  if(!ITEMS[itemId] && !ACTIVE_ITEMS[itemId]) return;
  engine.run.items++;
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

function fireWeapon(engine: GameEngine, dx: number, dy: number) {
  const p=engine.player,w=activeWeapon(p),b=getBuild(p);
  if(w.id==='feather_gun'&&p.overheat>0)return;
  let piercingShot=w.piercing,projRadius=b.uranium?6:3;
  const len=Math.hypot(dx,dy);if(!len)return;dx/=len;dy/=len;p.shotCounter++;
  const continuous=w.continuous;
  const baseCount=(continuous?1:w.projectileCount)+(b.triple&&p.shotCounter%4===0?2:0);
  const count=baseCount*(b.twinCannon?2:1);
  for(let i=0;i<count;i++){
    let a=Math.atan2(dy,dx);if(w.id==='paraguas_balistico')a=(i/count)*Math.PI*2+engine.frame*.01;else if(count>1)a+=(i-(count-1)/2)*(w.spread||.15)/(b.twinCannon?1.6:1);
    if(!continuous)a+=rng(-.045,.045)*b.accuracy;
    let type=w.projectileType;
    let dmg=(w.damage+b.damage)*b.damageScale*p.damageMultiplier*(b.debt?1+Math.min(.3,Math.floor(p.crumbs/10)*.01):1);if(w.id==='paga_patos')dmg*=1+Math.min(.3,p.crumbs*.003);if(w.id==='cinta_transportadora'&&p.shotCounter%5===0)dmg*=1.7;if(w.id==='pico_percutor'&&p.shotCounter%3===0)dmg*=1.35;
    if(b.twinCannon)dmg*=.7;if(b.crown)dmg*=1+Math.min(.3,Math.floor(p.crumbs/25)*.05);if(p.chocolateTimer>0)dmg*=1+b.chocolate;
    let burning=false,bonusCrit:number|undefined;if(w.id==='nomina_42')bonusCrit=.22;
    if(p.items.includes('toaster')&&p.shotCounter%5===0){type='toast';dmg*=1.5;burning=true;}
    if(b.burn>0||Math.random()<b.burnChance||(w.id==='baguette_launcher'&&b.burnChance>0))burning=true;
    const powerQuack=w.id==='quack_blaster'&&p.shotCounter%6===0;
    if(powerQuack){dmg*=1.2;type='quack_power';projRadius=Math.max(projRadius,4);}
    if(w.id==='feather_gun'){
      p.heat=Math.min(100,p.heat+7);a+=rng(-.035,.035)*(p.heat/45);
      if(p.heat>=100){p.overheat=45;p.heat=72;}
    }
    if(w.id==='plasma_baker'&&p.charge>18){const charge=Math.min(1,p.charge/52);dmg*=1+charge*1.65;projRadius=3+charge*7;if(charge>.68)piercingShot=true;}
    if(w.id==='golden_egg_revolver'){
      const charge=Math.min(1,p.charge/46);if(charge>.45){dmg*=1.2+charge*.18;type='golden_egg_charged';bonusCrit=.48+charge*.27;}else bonusCrit=.28;
    }
    if(w.id==='baguette_sniper'){
      const charge=Math.min(1,p.charge/55);dmg*=1+charge*.9;projRadius=3+charge*2;bonusCrit=.06+charge*.18;
    }
    p.projectileCounter++;
    const bounces=w.bounces+b.bounces+(b.fifthBounce&&p.projectileCounter%5===0?1:0)+(w.bounces>0&&(p.items.includes('butter')||p.items.includes('industrial_butter'))?2:0);
    const speed=w.projectileSpeed*b.projectileSpeed*(w.id==='cinta_transportadora'&&p.shotCounter%5===0?1.25:1);
    const radius=(w.explode??0)*(b.uranium?1.5:1)*Math.sqrt(b.explosionScale);
    const life=w.id==='vault_drill'?18:w.id==='rodillo_cocina'?15:w.id==='molinillo_pan'?25:w.id==='tronador_costra'||w.id==='horno_recortado'?28:w.id==='migaja_negra'?96:w.id==='iman_boveda'?110:w.boomerang?62:continuous?46:w.projectileType==='breadcrumb'?24:80;
    const penetration=b.penetration+(piercingShot&&w.id==='plasma_baker'?2:0)+(w.id==='croissant_cutter'?1:0)+(w.id==='impresora_multas'?2:0)+(w.id==='ventilador_servilletas'&&i===Math.floor(count/2)?1:0)+(w.id==='pico_percutor'&&p.shotCounter%3===0?1:0)+(powerQuack?1:0);
    const proj=makeProjectile(p.x+7,p.y+8,Math.cos(a)*speed,Math.sin(a)*speed,type,dmg,true,life,{bounces,piercing:w.piercing,boomerang:w.boomerang,burning,explode:radius,sourceWeapon:w.id,baseSpeed:speed,penetration,knockback:w.knockback+(powerQuack?1.5:0),orbit:w.id==='pato_orbital'?21:b.spiral?30:b.orbit?21:0,radius:w.id==='migaja_negra'?7:projRadius,nuclear:b.uranium>0,damageScaled:true,bounceBoost:0,originDamage:dmg,critChance:bonusCrit});
    engine.projectiles.push(proj);proj.ricochetBoost=p.items.includes('industrial_butter');
    if(Math.random()<b.duplicates)engine.projectiles.push({...proj,hitEnemies:new Set(),bounces:proj.bounces+(w.id==='rubber_duck_cannon'?1:0),vx:proj.vx+rng(-.6,.6),vy:proj.vy+rng(-.6,.6)});
  }
  gunfeelMuzzle(engine,p,w,dx,dy);
  if(w.knockback>=3||w.id==='breadcrumb_shotgun'){p.vx-=dx*.45*w.knockback;p.vy-=dy*.45*w.knockback;}
  if(w.knockback>=5||w.id==='breadcrumb_shotgun')engine.shakeIntensity=Math.max(engine.shakeIntensity,w.id==='breadcrumb_shotgun'?2.4:2.2);
  p.charge=0;
}

function splitEggShell(engine:GameEngine,p:Projectile){
  const base=Math.atan2(p.vy,p.vx),speed=Math.max(3.8,(p.baseSpeed??3.8)*1.08),dmg=Math.max(1,p.damage*.52);
  for(let n=-1;n<=1;n++){const a=base+n*.5;engine.projectiles.push(makeProjectile(p.x,p.y,Math.cos(a)*speed,Math.sin(a)*speed,'yolk',dmg,true,30,{sourceWeapon:'egg_cannon',baseSpeed:speed,knockback:.8,damageScaled:true,originDamage:dmg,radius:2,critChance:.05}));}
  spawn(engine,p.x,p.y,'crumb',5,'#f4d03f');
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
      if(p.boomerangPhase===0&&p.lifetime<p.maxLifetime*.5){p.boomerangPhase=1;p.hitEnemies.clear();if(p.sourceWeapon==='bread_boomerang')p.damage*=1.25;playReturn();}
      if (p.boomerangPhase === 1) {
        const a = Math.atan2(player.y + 8 - p.y, player.x + 7 - p.x);
        p.vx = Math.cos(a) * ((p.baseSpeed ?? 4) + 1.4);
        p.vy = Math.sin(a) * ((p.baseSpeed ?? 4) + 1.4);
        if (dist(p.x, p.y, player.x + 7, player.y + 8) < 14) { engine.projectiles.splice(i, 1); continue; }
      }
    } else p.lifetime--;

    if((p.type==='homing_crumb'||p.type==='orbit_duck')&&p.friendly){const t=content.enemies.filter(en=>en.hp>0).sort((a,b)=>dist(p.x,p.y,a.x,a.y)-dist(p.x,p.y,b.x,b.y))[0];if(t){const a=Math.atan2(t.y+t.size/2-p.y,t.x+t.size/2-p.x),q=p.type==='orbit_duck'?.22:.18;p.vx=p.vx*(1-q)+Math.cos(a)*(p.baseSpeed??3.6)*q;p.vy=p.vy*(1-q)+Math.sin(a)*(p.baseSpeed??3.6)*q;}}if(p.friendly&&p.sourceWeapon==='migaja_negra')for(const en of content.enemies)if(en.hp>0){const dd=dist(p.x,p.y,en.x+en.size/2,en.y+en.size/2);if(dd<85&&dd>8){const a=Math.atan2(p.y-en.y-en.size/2,p.x-en.x-en.size/2);const pull=en.isBoss?.12:.42;moveEnemy(en,room,Math.cos(a)*pull,Math.sin(a)*pull);}}if(p.friendly&&p.sourceWeapon==='iman_boveda')for(const q of engine.projectiles)if(!q.friendly){const dd=dist(p.x,p.y,q.x,q.y);if(dd<70){const a=Math.atan2(p.y-q.y,p.x-q.x);q.vx=q.vx*.92+Math.cos(a)*.28;q.vy=q.vy*.92+Math.sin(a)*.28;if(dd<13){q.friendly=true;q.vx*=-1.35;q.vy*=-1.35;q.damage=Math.max(6,q.damage*1.4);q.hitEnemies.clear();spawn(engine,q.x,q.y,'spark',4,'#7ed7e5');}}}p.x+=p.vx;p.y+=p.vy;
    if(!p.friendly && !p.reflectionTested && player.dashTimer>0 && build.reflectChance && dist(p.x,p.y,player.x+7,player.y+8)<25) {
      p.reflectionTested=true;
      if(Math.random()<build.reflectChance) {p.friendly=true;p.vx*=-1;p.vy*=-1;p.damage=10;p.hitEnemies.clear();spawn(engine,p.x,p.y,'spark',4,'#aad9dd');continue;}
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
      if(p.type==='egg_shell'){splitEggShell(engine,p);engine.projectiles.splice(i,1);continue;}
      if(p.explode>0){explode(engine,p,content);engine.projectiles.splice(i,1);continue;}
      if (p.bounces > 0 && !p.boomerang) {
        p.bounces--;
        if(p.ricochetBoost) {p.damage*=1.2;p.ricochetBoost=false;}
        if(p.type==='rubber_duck'){p.damage*=1.15;p.vx*=1.05;p.vy*=1.05;}
        if(p.type==='receipt')p.damage*=1.2;if(p.sourceWeapon==='gomera_migas')p.damage*=1.28;if(p.sourceWeapon==='cazuela_volatil'){p.damage*=1.35;if(p.bounces===0)p.explode=38;}
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

    if(p.lifetime<=0){
      if(p.type==='egg_shell')splitEggShell(engine,p);
      if(p.explode>0)explode(engine,p,content);
      engine.projectiles.splice(i, 1); continue;
    }

    if (p.friendly) {
      let removed = false;
      for (const e of [...content.enemies]) {
        if(e.hp<=0) continue;
        if (p.hitEnemies.has(e.id)) continue;
        if (dist(p.x, p.y, e.x + e.size / 2, e.y + e.size / 2) > e.size / 2 + (p.radius ?? 4)) continue;
        if(p.explode>0){if(p.sourceWeapon==='baguette_launcher')p.damage*=1.25;explode(engine,p,content);engine.projectiles.splice(i,1);removed=true;break;}

        if ((e.behavior === 'shielded' || e.bossType === 'ganso_antidisturbios') && e.recover <= 0) {
          const il = Math.hypot(p.vx, p.vy) || 1;
          const dot = Math.cos(e.shieldAngle) * (-p.vx / il) + Math.sin(e.shieldAngle) * (-p.vy / il);
          if (dot > (e.elite ? 0.15 : 0.3)) {
            spawn(engine, p.x, p.y, 'spark', 6, '#9fb0c4');
            engine.damageNumbers.push({ x: e.x + e.size / 2, y: e.y - 6, value: 0, life: 1, crit: false });
            playHit();
            if(p.sourceWeapon==='golden_egg_revolver') damageEnemy(engine,e,Math.round(p.damage*.35),false,content);
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
        let critChance=p.critChance??((p.type==='golden_egg'||p.type==='golden_egg_charged')?.3:.05);
        critChance+=build.crit;
        if (Math.random() < critChance) { dmg *= 2; crit = true; }
        if(crit && build.sneeze) {e.stunned=Math.max(e.stunned ?? 0,build.sneeze);e.fireCooldown=Math.max(45,e.fireCooldown);e.windup=0;e.chargeTimer=0;e.recover=40;}

        const final = Math.max(1, Math.floor(dmg));
        const gunfeelPreHp=e.hp;damageEnemy(engine,e,final,crit,content);gunfeelEnemyHit(engine,e,p,final,crit,content,gunfeelPreHp);if(p.sourceWeapon==='pistola_jarabe'||p.sourceWeapon==='escopeta_mermelada'||p.sourceWeapon==='rayo_mostaza'){e.slowTimer=Math.max(e.slowTimer,180);e.slowPower=Math.max(e.slowPower??0,p.sourceWeapon==='rayo_mostaza'?.24:.18);}if(p.sourceWeapon==='bobina_cuantica'){const o=content.enemies.filter(x=>x.hp>0&&x.id!==e.id).sort((a,b)=>dist(e.x,e.y,a.x,a.y)-dist(e.x,e.y,b.x,b.y))[0];if(o&&dist(e.x,e.y,o.x,o.y)<82){damageEnemy(engine,o,Math.max(2,Math.floor(final*.55)),false,content);spawn(engine,o.x+o.size/2,o.y+o.size/2,'spark',5,'#a98cff');}}if(p.sourceWeapon==='arco_tostado')for(const o of content.enemies.filter(x=>x.hp>0&&x.id!==e.id&&dist(e.x,e.y,x.x,x.y)<62).slice(0,2)){damageEnemy(engine,o,Math.max(2,Math.floor(final*.38)),false,content);spawn(engine,o.x+o.size/2,o.y+o.size/2,'spark',3,'#ffd75f');}if(p.sourceWeapon==='caja_registradora'&&e.hp<=0&&Math.random()<.28)content.pickups.push({x:e.x+e.size/2,y:e.y+e.size/2,type:'crumb',value:1,lifetime:99999});if(p.sourceWeapon==='nomina_42'&&crit&&Math.random()<.35)content.pickups.push({x:e.x+e.size/2,y:e.y+e.size/2,type:'crumb',value:1,lifetime:99999});if(p.sourceWeapon==='butter_blaster'&&e.hp>0){e.stickyStacks=Math.min(.45,(e.stickyStacks??0)+.09);e.slowTimer=180;e.slowPower=Math.max(e.slowPower??0,e.stickyStacks);}
        if(p.sourceWeapon==='tactical_toaster'&&e.hp>0){e.toastStacks=(e.toastStacks??0)+1;if(e.toastStacks>=3){e.toastStacks=0;spawn(engine,e.x+e.size/2,e.y+e.size/2,'spark',9,'#ff9f43');for(const other of [...content.enemies])if(other.hp>0&&dist(e.x,e.y,other.x,other.y)<42){damageEnemy(engine,other,Math.max(5,Math.round(p.damage*1.35)),false,content);other.burn=Math.max(other.burn,120);}engine.shakeIntensity=Math.max(engine.shakeIntensity,3);playExplosion();}}
        if((p.knockback??0)>0 && e.hp>0) {
          const len=Math.hypot(p.vx,p.vy)||1;const k=(p.knockback ?? 1)*(e.isBoss?.4:1.5);
          moveEnemy(e,room,p.vx/len*k,p.vy/len*k);
        }
        if(p.sourceWeapon==='baguette_launcher' || p.sourceWeapon==='golden_egg_revolver') engine.hitStop=Math.max(engine.hitStop,crit&&e.isBoss?4:2);

        // SINERGIAS
        if (p.burning || (crit && build.spicyCrit)) e.burn = Math.max(e.burn, 180);
        if(build.slow>0) {e.slowTimer=120;e.slowPower=build.slow;}
        if(build.sticky) {e.stickyStacks=Math.min(.45,(e.stickyStacks ?? 0)+build.sticky*(p.type==='quack_laser'?2:1));e.slowTimer=180;e.slowPower=Math.max(e.slowPower ?? 0,e.stickyStacks);}
        if(crit && (build.goldCrit>0 || p.sourceWeapon==='golden_egg_revolver') && Math.random()<.35) content.pickups.push({x:e.x+e.size/2,y:e.y+e.size/2,type:'crumb',value:1,lifetime:99999});
        if(crit && Math.random()<build.critCoinChance) content.pickups.push({x:e.x+e.size/2,y:e.y+e.size/2,type:'crumb',value:1,lifetime:99999});
        if(crit && e.hp<=0 && build.confetti) {
          spawn(engine,e.x+e.size/2,e.y+e.size/2,'spark',9,'#ddb0dd');
          for(const other of [...content.enemies]) if(dist(e.x,e.y,other.x,other.y)<58) damageEnemy(engine,other,build.confetti,false,content);
        }
        if (p.type === 'quack_laser' && player.items.includes('golden_beak') && Math.random() < 0.14) {
          content.pickups.push({ x: e.x + e.size / 2, y: e.y + e.size / 2, type: 'crumb', value: 1, lifetime: 600 });
        }
        if(p.explode>0){explode(engine,p,content);engine.projectiles.splice(i,1);removed=true;break;}
        if(p.type==='egg_shell'){splitEggShell(engine,p);engine.projectiles.splice(i,1);removed=true;break;}

        p.hitEnemies.add(e.id);
        if (p.piercing) continue;
        if((p.penetration ?? 0)>0) {p.penetration!--;continue;}
        spawn(engine,p.x,p.y,p.type==='breadcrumb'?'crumb':'hit',p.sourceWeapon==='feather_gun'?2:5);
        engine.projectiles.splice(i,1);removed=true;break;
      }
      if (removed) continue;
    } else if (player.iFrames <= 0 && player.dashTimer <= 0) {
      if (dist(p.x, p.y, player.x + 7, player.y + 8) < 10) {
        damagePlayer(engine,p.damage,'projectile',false,p.sourceEnemy,p.type);
        spawn(engine, p.x, p.y, 'hit', 4, '#ff9f9f');
        engine.projectiles.splice(i, 1);
      }
    }
  }
}

function explode(engine: GameEngine, p: Projectile, content: RoomContent, hurtPlayer = p.sourceWeapon !== 'bread_grenade') {
  const radius = p.explode;
  spawn(engine, p.x, p.y, 'smoke', 12, '#d4a574');
  spawn(engine, p.x, p.y, 'crumb', 10, '#a67c52');
  spawn(engine, p.x, p.y, 'spark', 8, '#ff9f43');
  if (p.burning) {
    content.puddles.push({ x: p.x, y: p.y, life: 180, kind:'fire',radius:32 });
    for (let i = 0; i < 5; i++) spawn(engine, p.x + rng(-20, 20), p.y + rng(-20, 20), 'spark', 1, '#ff6b3d');
  }
  for (const e of [...content.enemies]) {
    if (dist(p.x, p.y, e.x + e.size / 2, e.y + e.size / 2) < radius + e.size / 2) {
      const shielded=e.behavior==='shielded' && e.recover<=0;
      damageEnemy(engine, e, Math.max(1, Math.round(p.damage*(shielded?.4:1))), false, content);
      if (p.burning) e.burn = Math.max(e.burn, 180);
      if(p.nuclear) {e.slowTimer=180;e.slowPower=.35;}
    }
  }
  if(p.sourceWeapon==='canon_levadura'){const rr=currentRoomOf(engine);for(const en of content.enemies)if(en.hp>0){const dx=en.x+en.size/2-p.x,dy=en.y+en.size/2-p.y,dd=Math.hypot(dx,dy)||1;if(dd<radius+36)moveEnemy(en,rr,dx/dd*5.2,dy/dd*5.2);}}
  if (hurtPlayer && dist(p.x, p.y, engine.player.x + 7, engine.player.y + 8) < radius) {
    damagePlayer(engine,.5,'projectile',false,p.sourceEnemy,p.type);
  }
  engine.shakeIntensity = Math.max(engine.shakeIntensity, 5);
  engine.hitStop=Math.max(engine.hitStop,3);
  playExplosion();
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

function enemyShoot(engine: GameEngine, e: Enemy, ang: number, speed: number, type: string, jitter = 0) {
  const a = ang + (e.elite ? jitter * 0.25 : jitter) + rng(-jitter, jitter);
  engine.projectiles.push(makeProjectile(e.x+e.size/2,e.y+e.size/2,Math.cos(a)*speed,Math.sin(a)*speed,type,e.behavior==='sniper'?2:1,false,e.behavior==='sniper'?145:110,{sourceEnemy:e}));
  spawn(engine, e.x + e.size / 2 + Math.cos(a) * 8, e.y + e.size / 2 + Math.sin(a) * 8, 'spark', 2, '#ffd08a');
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

function updateBossAI(engine: GameEngine, boss: Enemy, room: MapRoom, content: RoomContent) {
  const player=engine.player;
  const px=player.x+7,py=player.y+8;
  const bx=boss.x+boss.size/2,by=boss.y+boss.size/2;
  const pct=boss.hp/boss.maxHp;
  const aimed=Math.atan2(py-by,px-bx);
  const shootFan=(count:number,spread:number,speed:number,type:string,center=aimed)=>{for(let i=0;i<count;i++){const off=count===1?0:(i-(count-1)/2)*(spread/(count-1));enemyShoot(engine,boss,center+off,speed,type);}};
  const shootRing=(count:number,speed:number,type:string,offset=engine.frame*.014)=>{for(let i=0;i<count;i++)enemyShoot(engine,boss,(i/count)*Math.PI*2+offset,speed,type);};
  const summon=(pool:string[],cap:number)=>{if(content.enemies.length>=cap)return;const spots=freeTiles(room.layout,2);const s=spots[rngInt(0,Math.max(0,spots.length-1))];if(s)content.enemies.push(makeEnemy(pick(pool),floorScale(engine.map.floorIndex,room.distance),s.x,s.y,false));};

  if(MINIBOSSES[boss.bossType]) {
    const enraged=pct<(engine.difficulty==='easy'?.45:engine.difficulty==='hard'?.57:engine.difficulty==='mad'?.62:.52);
    if(enraged&&boss.bossPhase===0){boss.bossPhase=1;boss.attackTimer=54;boss.stunned=16;engine.roomLabel='¡SE ENFURECE! · '+(MINIBOSSES[boss.bossType]?.name??'');engine.roomLabelTimer=62;spawn(engine,bx,by,'spark',12,'#f5bb6d');playBossRoar();}
    boss.attackTimer--;
    const telegraphWindow=enraged?27:34;
    if(boss.attackTimer>0&&boss.attackTimer<telegraphWindow){boss.telegraph=1-boss.attackTimer/telegraphWindow;boss.moveAngle=aimed;if(boss.attackTimer===telegraphWindow-1)playDanger('aim');}
    if(boss.attackTimer<=0){
      const type=boss.bossType;
      if(type==='sargento_migajas'){
        shootFan(enraged?7:5,.72,enraged?2.75:2.55,'buckshot');boss.moveAngle=aimed;boss.moveTimer=enraged?18:14;
        if(enraged&&content.enemies.length<3)summon(['policia_pato','policia_rapido'],3);
      } else if(type==='tax_collector'){
        shootFan(enraged?5:3,.5,2.9,'briefcase');if(enraged)shootFan(3,.34,2.35,'coin_proj',aimed+.16);boss.moveAngle=aimed;boss.moveTimer=14;
      } else if(type==='el_auditor'){
        shootFan(enraged?7:5,.64,2.5,'coin_proj');content.puddles.push({x:bx+Math.cos(aimed)*44,y:by+Math.sin(aimed)*44,life:enraged?165:135,kind:'fire',radius:18});
      } else if(type==='cajero_3000'){
        shootFan(enraged?7:5,.58,2.55,'coin_proj');enemyShoot(engine,boss,aimed,4.2,'drone_shot');if(enraged)shootRing(6,1.9,'coin_proj',engine.frame*.018);
      } else if(type==='ganso_antidisturbios'){
        boss.shieldAngle=aimed;boss.moveAngle=aimed;boss.moveTimer=enraged?28:22;playDanger('charge');if(enraged)shootFan(3,.5,2.15,'enemy_bullet',aimed+Math.PI);
      } else if(type==='dron_centinela'){
        shootRing(enraged?12:8,enraged?2.35:2.15,'drone_shot');if(enraged)shootFan(3,.42,3.15,'drone_shot');
        if(content.enemies.filter(en=>en.type==='dron_policial').length<(enraged?2:1))summon(['dron_policial'],enraged?4:3);
      } else {
        shootFan(enraged?5:3,.66,enraged?2.75:2.5,'dough_ball');content.puddles.push({x:bx,y:by,life:enraged?175:145,kind:'fire',radius:enraged?26:22});if(enraged)content.puddles.push({x:bx+Math.cos(aimed)*50,y:by+Math.sin(aimed)*50,life:120,kind:'fire',radius:16});
      }
      const base=type==='dron_centinela'?104:type==='ganso_antidisturbios'?112:type==='sargento_migajas'?116:124;
      boss.attackTimer=Math.max(76,base-(enraged?18:0));boss.telegraph=0;
    }
    if(boss.moveTimer>0){boss.moveTimer--;const dash=boss.bossType==='ganso_antidisturbios'?4.0:3.35;moveEnemy(boss,room,Math.cos(boss.moveAngle)*dash,Math.sin(boss.moveAngle)*dash);}
    else if(boss.attackTimer>telegraphWindow){const strafe=boss.bossType==='dron_centinela'?0.46:0.3;moveEnemy(boss,room,Math.cos(aimed+(boss.id%2?1:-1)*.72)*boss.speed*strafe,Math.sin(aimed+(boss.id%2?1:-1)*.72)*boss.speed*strafe);}
    if(boss.bossType==='ganso_antidisturbios')boss.shieldAngle=boss.moveAngle;
    return;
  }

  const phase=pct<(engine.difficulty==='easy'?.30:engine.difficulty==='hard'?.38:engine.difficulty==='mad'?.42:.34)?2:pct<(engine.difficulty==='easy'?.62:engine.difficulty==='hard'?.72:engine.difficulty==='mad'?.76:.68)?1:0;
  if(phase>boss.bossPhase){boss.bossPhase=phase;boss.attackTimer=58;boss.stunned=18;engine.roomLabel='FASE '+(phase+1)+' · '+(BOSSES[boss.bossType]?.name??'');engine.roomLabelTimer=72;spawn(engine,bx,by,'spark',20,phase===2?'#ff6b57':'#f5bb6d');engine.shakeIntensity=Math.max(engine.shakeIntensity,5);playBossRoar();}
  const pattern=engine.map.floorIndex;
  boss.attackTimer--;
  const telegraphWindow=Math.max(23,34-boss.bossPhase*4);
  if(boss.attackTimer>0&&boss.attackTimer<telegraphWindow){boss.telegraph=1-boss.attackTimer/telegraphWindow;if(boss.attackTimer===telegraphWindow-1)playDanger(boss.bossType==='captain_honk'||boss.bossType==='general_ganso'?'charge':'aim');}

  if(boss.attackTimer<=0){
    const p=boss.bossPhase;
    const type=boss.bossType;
    const atk=rngInt(0,p>=1?4:3);
    boss.telegraph=0;
    if(type==='captain_honk'){
      if(atk===0){boss.moveAngle=aimed;boss.moveTimer=24+p*4;}
      else if(atk===1)shootFan(5+p*2,.72,2.7+p*.15,'enemy_bullet');
      else if(atk===2)shootRing(8+p*2,2.15+p*.1,'enemy_bullet');
      else if(atk===3){shootFan(3+p,.5,3.2,'enemy_bullet');boss.moveAngle=aimed;boss.moveTimer=15;}
      else summon(['policia_rapido','policia_pato'],3+p);
    } else if(type==='comisario_pico_duro'){
      if(atk===0)shootFan(5+p*2,.82,2.75,'enemy_bullet');
      else if(atk===1)shootRing(8+p*2,2.05+p*.12,'enemy_bullet',engine.frame*.01);
      else if(atk===2){summon(['policia_pato','policia_escopeta'],3+p);shootFan(3,.34,3.05,'enemy_bullet');}
      else if(atk===3){boss.moveAngle=aimed+Math.PI/2*(boss.id%2?1:-1);boss.moveTimer=22;}
      else {shootFan(5,.5,3.15,'enemy_bullet',aimed-.2);shootFan(5,.5,3.15,'enemy_bullet',aimed+.2);}
    } else if(type==='toaster_9000'){
      if(atk===0)shootRing(10+p*3,1.9+p*.1,'toast',engine.frame*.012);
      else if(atk===1){shootFan(5+p*2,.75,2.55,'toast');content.puddles.push({x:bx,y:by,life:150,kind:'fire',radius:24+p*2});}
      else if(atk===2)shootRing(6+p*2,2.55,'enemy_bullet',engine.frame*.03);
      else if(atk===3){content.puddles.push({x:bx+Math.cos(aimed)*52,y:by+Math.sin(aimed)*52,life:155,kind:'fire',radius:20});boss.moveAngle=aimed+Math.PI;boss.moveTimer=16;}
      else {shootFan(7,.9,2.8,'toast');content.puddles.push({x:bx,y:by,life:180,kind:'fire',radius:28});}
    } else if(type==='general_ganso'){
      if(atk===0){boss.moveAngle=aimed;boss.moveTimer=28+p*5;}
      else if(atk===1)shootFan(5+p*2,.62,3.0+p*.12,'enemy_bullet');
      else if(atk===2){shootRing(8+p*3,2.3,'enemy_bullet');boss.moveAngle=aimed;boss.moveTimer=12;}
      else if(atk===3){boss.moveAngle=aimed;boss.moveTimer=18;shootFan(3,.42,2.7,'enemy_bullet',aimed+Math.PI);}
      else {summon(['policia_rapido'],3+p);shootRing(8,2.0,'enemy_bullet');}
    } else if(type==='don_levadura'){
      if(atk===0)shootFan(5+p*2,.88,2.55+p*.1,'dough_ball');
      else if(atk===1){shootRing(8+p*2,1.95,'dough_ball');content.puddles.push({x:bx,y:by,life:165,kind:'fire',radius:24});}
      else if(atk===2){content.puddles.push({x:bx+Math.cos(aimed)*48,y:by+Math.sin(aimed)*48,life:170,kind:'fire',radius:22});shootFan(3,.4,3.1,'dough_ball');}
      else if(atk===3){boss.moveAngle=aimed+Math.PI;boss.moveTimer=20;shootFan(5,.56,2.8,'dough_ball');}
      else shootRing(12,2.15,'dough_ball',engine.frame*.026);
    } else if(type==='director_seguridad'){
      if(atk===0)shootFan(5+p*2,.7,3.05,'drone_shot');
      else if(atk===1)shootRing(8+p*3,2.25,'drone_shot',engine.frame*.02);
      else if(atk===2){summon(['dron_policial','policia_francotirador'],3+p);shootFan(3,.38,3.4,'coin_proj');}
      else if(atk===3){shootFan(5,.5,3.6,'drone_shot');boss.moveAngle=aimed+Math.PI/2;boss.moveTimer=18;}
      else {shootRing(12,2.4,'coin_proj');summon(['dron_policial'],4);}
    } else {
      if(atk===0)shootFan(5+p*2,.75,2.9+p*.12,'coin_proj');
      else if(atk===1)shootRing(10+p*3,2.15+p*.1,'coin_proj',engine.frame*.018);
      else if(atk===2){shootFan(3+p*2,.46,3.45,'coin_proj');boss.moveAngle=aimed;boss.moveTimer=15;}
      else if(atk===3){summon(['policia_pato','policia_rapido','dron_policial'],3+p);shootRing(8,2.25,'coin_proj');}
      else {shootFan(7,.8,3.15,'coin_proj',aimed-.22);shootFan(7,.8,3.15,'coin_proj',aimed+.22);}
    }
    engine.shakeIntensity=Math.max(engine.shakeIntensity,atk===0?3:4+p);
    const raw=boss.attackCooldown-p*14-pattern*2;
    boss.attackTimer=Math.max(48,Math.min(88,Math.round(raw)));
  }

  const speedMult=1+boss.bossPhase*.18;
  if(boss.moveTimer>0){boss.moveTimer--;const charge=(boss.bossType==='captain_honk'||boss.bossType==='general_ganso')?2.85:2.35;moveEnemy(boss,room,Math.cos(boss.moveAngle)*boss.speed*speedMult*charge,Math.sin(boss.moveAngle)*boss.speed*speedMult*charge);}
  else if(boss.attackTimer>telegraphWindow){const orbit=(boss.id%2?1:-1)*(.48+boss.bossPhase*.08);const moveAng=aimed+orbit;const pace=(boss.bossType==='toaster_9000'||boss.bossType==='director_seguridad')?.22:.31;moveEnemy(boss,room,Math.cos(moveAng)*boss.speed*speedMult*pace,Math.sin(moveAng)*boss.speed*speedMult*pace);}
}

// ---------------------------------------------------------------------------
// DAÑO
// ---------------------------------------------------------------------------
export function damageEnemy(engine: GameEngine, e: Enemy, dmg: number, crit: boolean, content: RoomContent) {
  if(e.hp<=0 || !content.enemies.includes(e)) return;
  const actual=Math.min(e.hp,dmg);
  e.hp -= dmg;
  e.hurtTimer = 8;
  engine.run.dmgDealt += actual;
  if (engine.settings.damageNumbers) {
    if(engine.damageNumbers.length>=80)engine.damageNumbers.shift();
    engine.damageNumbers.push({ x: e.x + e.size / 2 + rng(-4, 4), y: e.y - 4, value: dmg, life: 1, crit });
  }
  spawn(engine, e.x + e.size / 2, e.y + e.size / 2, 'hit', 3);
  playHit();
  if (crit) {
    spawn(engine, e.x + e.size / 2, e.y + e.size / 2, 'spark', 6, '#f4d03f');
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
  const build=getBuild(engine.player);
  const angle=Math.atan2(e.y-engine.player.y,e.x-engine.player.x);
  engine.deathEchoes.push({enemy:{...e,hurtTimer:0},life:e.isBoss?42:20,vx:Math.cos(angle)*1.4,vy:Math.sin(angle)*1.4});
  if(engine.deathEchoes.length>16) engine.deathEchoes.shift();
  engine.player.combo++;engine.player.comboTimer=120;
  if(build.infinite && engine.player.activeItemCooldown>0) engine.player.activeItemCooldown=Math.max(1,engine.player.activeItemCooldown-30);

  spawn(engine, e.x + e.size / 2, e.y + e.size / 2, 'feather', 9, e.type.startsWith('policia') ? '#cfd8e3' : '#f0f0f0');
  spawn(engine, e.x + e.size / 2, e.y + e.size / 2, 'smoke', 5, '#4c5666');
  spawn(engine, e.x + e.size / 2, e.y + e.size / 2, 'crumb', 6, '#d4a574');
  if(e.isBoss && BOSSES[e.bossType]) {playBossWin();engine.shakeIntensity=Math.max(engine.shakeIntensity,6);}
  else playEnemyDeath();

  const bonus=build.extraCrumbs+(Math.random()<build.extraDrop?2:0)+(e.elite?3:0)+(e.type==='robot_cajero'||e.bossType==='cajero_3000'?4:0);
  const luckBonus = engine.player.items.includes('lucky_feather') ? 1 : 0;
  const coinCount=rngInt(1,3)+bonus+(room.modifier==='openVault'?2:0);
  for (let c = 0; c < coinCount; c++) {
    content.pickups.push({
      x: e.x + e.size / 2 + rng(-14, 14), y: e.y + e.size / 2 + rng(-14, 14),
      type: 'crumb', value: scaledCurrency(rngInt(1,3),build.currencyScale), lifetime: 900,
    });
  }
  if (Math.random() < 0.1 + luckBonus * 0.05 || e.isBoss) {
    content.pickups.push({
      x: e.x + e.size / 2, y: e.y + e.size / 2,
      type: 'golden_crumb', value: e.isBoss ? rngInt(5, 10) : 1, lifetime: 99999,
    });
  }
  if (engine.player.items.includes('pond_water')) {
    content.puddles.push({ x: e.x + e.size / 2, y: e.y + e.size / 2, life: 420 });
  }
  if(Math.random()<build.radiation) content.puddles.push({x:e.x+e.size/2,y:e.y+e.size/2,life:240,kind:'radiation',radius:32});

  if (e.isBoss) {
    spawn(engine, e.x + e.size / 2, e.y + e.size / 2, 'spark', 26, '#f4d03f');
    if(BOSSES[e.bossType]) engine.run.bosses++;
    if (room.type !== RoomType.BOSS) {
      // el minijefe suelta botín inmediato (arma u objeto, de forma coherente)
      const asWeapon = Math.random() < 0.5;
      content.items.push({
        x: e.x + e.size / 2 - 8, y: e.y + e.size / 2 - 8,
        itemId: asWeapon ? rollWeapon(engine, true) : rollItem(engine),
        isWeapon: asWeapon, isActive: false,
      });
      content.pickups.push({ x: e.x + e.size / 2 + 26, y: e.y + e.size / 2 + 14, type: 'hp', value: 1, lifetime: 99999 });
    }
  } else if (Math.random() < 0.07 + luckBonus * 0.03) {
    // curaciones poco frecuentes
    content.pickups.push({
      x: e.x + e.size / 2, y: e.y + e.size / 2,
      type: rollFood(), value: 1, lifetime: 99999,
    });
  }
  if(e.elite && Math.random()<.12) content.items.push({x:e.x,y:e.y,itemId:rollBossRewardItem(engine),isWeapon:false,isActive:false});
}

export function damagePlayer(engine:GameEngine,dmgMul:number,source:'contact'|'projectile'='contact',police=false,attacker?:Enemy,attackType=''){
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

  if (Math.random()<b.block+(source==='projectile'?b.projectileBlock:0)) {
    spawn(engine, p.x + 7, p.y + 8, 'crumb', 6, '#a67c52');
    engine.damageNumbers.push({ x: p.x + 7, y: p.y - 4, value: 0, life: 1, crit: false });
    p.iFrames = 18;
    return;
  }

  const heavy = dmgMul >= 1.5;
  let loss = (heavy ? 2 : 1)*(source==='contact' && police?1-b.contactReduction:1);
  if(!p.firstHitUsed) {loss*=1-b.firstHitReduction;p.firstHitUsed=true;}
  if(p.hp<=loss && !p.reviveUsed && Math.random()<b.lethalSave) {
    p.reviveUsed=true;p.hp=.5;p.iFrames=120;engine.toast='¡HOY NO!';engine.toastTimer=90;getContent(engine).damaged=true;return;
  }
  p.hp=Math.max(0,p.hp-loss);
  engine.deathKiller=attacker?{...attacker,hurtTimer:0}:null;engine.deathSource=source;engine.deathAttack=attackType||(source==='contact'?'contact':'projectile');
  engine.run.dmgTaken+=loss;
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
  if (engine.keys['a']) dx = -1;
  if (engine.keys['d']) dx = 1;
  if (engine.keys['w']) dy = -1;
  if (engine.keys['s']) dy = 1;
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
  spawn(engine, p.x + 7, p.y + 8, 'feather', 6, '#f9e547');
}

export function handleActiveItem(engine: GameEngine) {
  const p = engine.player;
  if(engine.state!==GameState.PLAYING || engine.swap || engine.transition.active) return;
  if (!p.activeItem || p.activeItemCooldown > 0) return;
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
    case 'decoy': case 'lure': {
      const aim=aimVector(engine);
      const spot=safeDrop(room,cx+aim.x*52,cy+aim.y*52);
      engine.decoy={x:spot.x+8,y:spot.y+8,life:rule.duration!,explosive:rule.action==='lure'};playBounce();break;
    }
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
  count=Math.min(count,Math.max(0,240-engine.particles.length));
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
    if(engine.run.time>0 && engine.run.floorReached>engine.bestFloor) {engine.bestFloor=engine.run.floorReached;engine.newRecord=true;}
    localStorage.setItem('duckheist_save', JSON.stringify(permanentSnapshot(engine)));
    if (engine.stats.breadStolen > (engine.best.breadStolen ?? 0)) {
      engine.newRecord=true;
      engine.best = { ...engine.stats };
      localStorage.setItem('duckheist_best', JSON.stringify(engine.stats));
    }
  } catch { /* ignorar */ }
}

export function saveSettings(engine:GameEngine){
  const m=engine.settings.muted?0:engine.settings.master;
  setVolumes(m,engine.settings.muted?0:engine.settings.music,engine.settings.muted?0:engine.settings.sfx);
  saveProgress(engine);
}

export const SETTING_ROWS=[
  {key:'language',label:'IDIOMA',kind:'language' as const},
  {key:'master',get label(){return T.settingMaster},kind:'vol' as const},
  {key:'music',get label(){return T.settingMusic},kind:'vol' as const},
  {key:'sfx',get label(){return T.settingSfx},kind:'vol' as const},
  {key:'brightness',label:'BRILLO',kind:'brightness' as const},
  {key:'shake',get label(){return T.settingShake},kind:'shake' as const},
  {key:'damageNumbers',get label(){return T.settingDamage},kind:'bool' as const},
  {key:'fullscreen',get label(){return T.settingFullscreen},kind:'bool' as const},
  {key:'cursorStyle',label:'CURSOR',kind:'cursor' as const},
  {key:'testQuack',label:'PROBAR CUAC',kind:'action' as const},
  {key:'testDash',label:'PROBAR ESQUIVE',kind:'action' as const},
];

export function settingValue(engine:GameEngine,i:number){
  const row=SETTING_ROWS[i];if(!row||row.kind==='action')return 0;
  if(row.kind==='language')return getLocale()==='en-US'?1:0;
  if(row.kind==='cursor')return engine.settings.cursorStyle;
  const v=(engine.settings as unknown as Record<string,number|boolean>)[row.key];
  return typeof v==='boolean'?(v?1:0):v;
}

export function adjustSetting(engine:GameEngine,i:number,dir:number){
  const row=SETTING_ROWS[i];if(!row)return;
  if(row.kind==='language'){setLocale(getLocale()==='en-US'?'es-MX':'en-US');playUiMove();engine.onStateChange?.(engine.state);return;}
  if(row.key==='testQuack'){playQuack();return;}
  if(row.key==='testDash'){playDash();return;}
  if(row.kind==='cursor'){engine.settings.cursorStyle=(engine.settings.cursorStyle+(dir>=0?1:-1)+12)%12;saveSettings(engine);playUiMove();engine.onStateChange?.(engine.state);return;}
  const s=engine.settings as unknown as Record<string,number|boolean>;
  if(row.kind==='bool')s[row.key]=!s[row.key];
  else if(row.kind==='shake')s[row.key]=Math.round(clamp((s[row.key] as number)+dir*.1,0,1)*10)/10;
  else if(row.kind==='brightness')s[row.key]=Math.round(clamp((s[row.key] as number)+dir*.1,.1,1)*10)/10;
  else s[row.key]=clamp((s[row.key] as number)+dir*.1,0,1);
  if(row.key==='music'||row.key==='master'){if(engine.state===GameState.MENU)setMusic('menu');}
  saveSettings(engine);playUiMove();
}
export function setSettingFromPointer(engine:GameEngine,i:number,x:number){
  const row=SETTING_ROWS[i];if(!row)return false;
  if(row.kind==='vol'){if(x<304||x>392)return false;const n=clamp(Math.floor((x-304)/9),0,9);engine.settings[row.key as 'master'|'music'|'sfx']=(n+1)/10;}
  else if(row.kind==='shake'){if(x<304||x>392)return false;const n=clamp(Math.floor((x-304)/9),0,9);engine.settings.shake=(n+1)/10;}
  else if(row.kind==='brightness'){if(x<304||x>392)return false;const n=clamp(Math.floor((x-304)/9),0,9);engine.settings.brightness=(n+1)/10;}
  else return false;
  saveSettings(engine);playUiMove();return true;
}
export function toggleMute(engine:GameEngine){engine.settings.muted=!engine.settings.muted;saveSettings(engine);playUiMove();engine.onStateChange?.(engine.state);}

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
  return Math.max(1,Math.ceil(product.cost*b.shop*coupon));
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
  if(currentRoomOf(engine).type===RoomType.EVENT&&!content.cafe&&(content as any).dangerEventActive){event.message='Primero sobrevive al operativo.';playDeny();return;}
  const cost=event.kind==='safe'?18:event.kind==='vending'?8:event.kind==='atm'?12:event.kind==='interrogation'?15:event.kind==='security_terminal'?12:event.kind==='field_medic'?10:event.kind==='weapon_forge'?24:0;
  if(event.selected===1 && event.kind!=='interrogation') {event.message='Una decisión prudente. Quizá.';event.used=true;return;}
  if(event.kind==='interrogation' && event.selected===1) {
    changeAlert(engine,3);
    event.used=true;currentRoom(engine).cleared=false;content.clearAge=undefined;
    const spots=freeTiles(currentRoom(engine).layout,2);
    for(let i=0;i<3;i++) if(spots[i]) content.enemies.push(makeEnemy(i?'policia_rapido':'policia_escopeta',floorScale(engine.map.floorIndex,4),spots[i].x,spots[i].y,i===0));
    playDoorLock();event.message='El interrogatorio se complicó.';return;
  }
  if(p.crumbs<cost) {event.message='Te faltan migajas.';playDeny();return;}
  if((event.kind==='bakery'||event.kind==='injured'||event.kind==='bread_altar')&&p.hp<=1){event.message='Necesitas más de un corazón.';playDeny();return;}
  if(event.kind==='field_medic'&&p.hp>=p.maxHp){event.message='Ya estás al máximo.';playDeny();return;}
  p.crumbs-=cost;event.used=true;
  switch(event.kind) {
    case 'safe':content.pedestal={x:228,y:142,itemId:rollBossRewardItem(engine),isWeapon:false,taken:false};event.message='Abierta. Sin dejar huellas.';break;
    case 'bakery': {
      p.hp--;const reward=pickPassive(engine) ?? fallbackActive(engine);
      content.items.push({x:232,y:133,itemId:reward,isWeapon:false,isActive:!!ACTIVE_ITEMS[reward]});
      event.message='Un intercambio muy crujiente.';break;
    }
    case 'vending':content.pickups.push({x:240,y:143,type:rollFood(),value:1,lifetime:99999});event.message='Sin cambio. Con pan.';break;
    case 'injured':p.hp--;awardGolden(engine,8);event.message='Los cómplices no se olvidan.';break;
    case 'interrogation':event.message='No hemos visto ningún pato.';changeAlert(engine,-3);break;
    case 'atm':
      if(Math.random()<.35){awardGolden(engine,8);event.message='¡Error bancario a tu favor!';}
      else{content.pickups.push({x:240,y:143,type:'crumb',value:4,lifetime:99999});event.message='Solo devuelve 4 migajas. Típico.';}break;
    case 'security_terminal':{changeAlert(engine,-25);const boss=[...engine.map.rooms.values()].find(r=>r.type===RoomType.BOSS);if(boss)boss.revealed=true;event.message='Cámaras anuladas. Objetivo localizado.';break;}
    case 'field_medic':healPlayer(engine,1);event.message='Vendaje rápido. Nada de preguntas.';break;
    case 'weapon_forge':content.pedestal={x:300,y:142,itemId:rollWeapon(engine,true),isWeapon:true,taken:false,rise:0};event.message='El arsenal imprimió algo ilegal.';break;
    case 'bread_altar':p.hp--;content.pedestal={x:300,y:142,itemId:rollBossRewardItem(engine),isWeapon:false,taken:false,rise:0};event.message='La miga aceptó el trato.';break;
  }
  playPickup();
}
function awardGolden(engine:GameEngine,count:number) {
  engine.totalGoldenCrumbs+=count;engine.player.goldenCrumbs+=count;engine.stats.goldenCrumbs+=count;engine.run.goldenEarned+=count;saveProgress(engine);
}

/** Compra una skin cosmética con monedas permanentes */
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

export { CANVAS_WIDTH, CANVAS_HEIGHT, GameState, dist, clamp };
export type { GameEngine, Enemy, RoomContent };
