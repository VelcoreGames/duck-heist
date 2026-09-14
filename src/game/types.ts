// Tipos compartidos entre motor y renderizador
import type { WeaponDef, EnemyBehavior } from './data';
import { GameState, RoomType, type Dir } from './constants';
import type { GameMap, MapRoom } from './mapgen';
import type { CollectionCategory } from './catalog';

export type DuckDir = 'up' | 'down' | 'left' | 'right';

export interface Vec2 { x: number; y: number; }

export interface Projectile {
  x: number; y: number; vx: number; vy: number;
  type: string; damage: number; friendly: boolean;
  lifetime: number; maxLifetime: number;
  bounces: number; piercing: boolean;
  boomerang: boolean; boomerangPhase: number;
  hitEnemies: Set<number>; burning: boolean;
  explode: number;
  focusTarget: number; focusTime: number;
  sourceWeapon?: string;
  baseSpeed?: number;
  knockback?: number;
  penetration?: number;
  radius?: number;
  orbit?: number;
  nuclear?: boolean;
  damageScaled?: boolean;
  ricochetBoost?:boolean;
  bounceBoost?:number;
  originDamage?:number;
  critChance?:number;
  reflectionTested?:boolean;
}

export interface Particle {
  x: number; y: number; vx: number; vy: number;
  type: string; life: number; decay: number; color?: string; gravity: number;
}

export interface DamageNumber { x: number; y: number; value: number; life: number; crit: boolean; }

export interface Enemy {
  id: number; type: string;
  x: number; y: number; vx: number; vy: number;
  hp: number; maxHp: number;
  speed: number; damage: number; size: number; score: number;
  behavior: EnemyBehavior; flying: boolean;
  fireRate: number; fireCooldown: number; projectileType: string;
  hurtTimer: number; moveAngle: number; moveTimer: number;
  telegraph: number; chargeTimer: number; burst: number; burstDelay: number;
  slowTimer: number; burn: number;
  elite: boolean;
  isBoss: boolean; bossType: string; bossPhase: number;
  attackTimer: number; attackCooldown: number;
  spawnAnim: number;
  dmgMul: number;
  /** ANTIDISTURBIOS: ángulo del escudo + ventana de recuperación */
  shieldAngle: number; recover: number;
  stunned?: number;
  slowPower?: number;
  windup?: number;
  stickyStacks?:number;
  healTimer?:number;
  buffTimer?:number;
}

export type PickupType =
  | 'crumb' | 'golden_crumb'
  | 'hp' | 'sandwich' | 'baguette' | 'croissant' | 'torta' | 'pan_dorado';

export interface Pickup {
  x: number; y: number;
  type: PickupType;
  value: number; lifetime: number;
  vx?:number; vy?:number;
  collectDelay?:number;
}

export interface ItemPickup {
  x: number; y: number; itemId: string; isWeapon: boolean; isActive: boolean;
  discovered?:boolean;
}

export interface ShopItem {
  itemId: string; cost: number; sold: boolean; isWeapon: boolean; x: number; y: number;
  soldAt?:number;
  deniedUntil?:number;
}

export interface Puddle { x: number; y: number; life: number; kind?:'water'|'fire'|'smoke'|'radiation'; radius?:number; }

export interface Pedestal {
  x: number; y: number; itemId: string; isWeapon: boolean; taken: boolean; bossLoot?: boolean;
  isFood?:boolean;
  rise?:number;
}

export type EventKind = 'safe'|'bakery'|'vending'|'injured'|'interrogation'|'atm';
export interface RoomEvent { kind:EventKind; x:number; y:number; used:boolean; selected:number; message:string; }

export interface RoomContent {
  enemies: Enemy[];
  pickups: Pickup[];
  items: ItemPickup[];
  puddles: Puddle[];
  chest?: { x: number; y: number; opened: boolean };
  shopItems?: ShopItem[];
  pedestal?: Pedestal;
  /** escalera hacia el próximo piso (sólo tras matar al jefe) */
  stairs?: { x: number; y: number; unlocked: boolean; glow: number };
  doorAnim: Record<string, number>;
  lockFlash: number;
  combatTimer: number;
  ambient: number;
  /** retardo antes de que las monedas vuelen solas tras despejar la sala */
  magnet: number;
  clearAge?:number;
  rewardTimer?:number;
  choices?:Pedestal[];
  choiceTaken?:boolean;
  event?:RoomEvent;
  merchantLine?:string;
  merchantUntil?:number;
  damaged?:boolean;
  challenge?:'flawless'|'alarm';
  alarmTimer?:number;
  securityTimer?:number;
  modifierResolved?:boolean;
  perfectAwarded?:boolean;
  clearCounted?:boolean;
  lastVisit?:number;
}

export interface GameStats {
  breadStolen: number; enemiesDefeated: number; roomsCleared: number;
  goldenCrumbs: number; floorsCleared: number;
}

export interface RunStats {
  time: number;
  bosses: number;
  items: number;
  weaponsFound: number;
  dmgDealt: number;
  dmgTaken: number;
  floorReached: number;
  goldenEarned: number;
  seed:string;
  weaponIds:string[];
}

export interface Settings {
  master: number; music: number; sfx: number;
  shake: number;            // 0..2
  damageNumbers: boolean;
  uiScale: number;          // 1..3
  fullscreen: boolean;
  brightness: number;       // 0.6..1.4
}

export interface SwapRequest {
  itemId: string;
  slot: number;             // arma que se reemplazaría
  from: 'floor' | 'pedestal' | 'shop' | 'choice';
  srcIndex: number;         // índice en content.items / pedestal
  worldX: number; worldY: number;
  roomKey?:string;
}

export interface Transition {
  active: boolean; timer: number; total: number;
  dir: Dir | null; targetKey: string | null;
}

export interface OverlayLabel {
  x: number; y: number; text: string; sub?: string;
  color?: string; size?: number; emph?: boolean;
}

export interface PickupCard {
  name: string; desc: string; flavor?: string; itemId: string; isWeapon: boolean;
  rarity: number; timer: number;
  first?:boolean;
}

export interface GameEngine {
  testing?:boolean;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;      // mundo (baja resolución, pixel art)
  ui: CanvasRenderingContext2D | null; // interfaz (alta resolución, tipografía nítida)
  uiScale: number;
  state: GameState;
  frame: number;
  mapView:{returnState:GameState;selected:string;frame:number;gpsTarget:'shop'|'boss'|'stairs'|null};
  lastInput:'keyboard'|'gamepad';
  pad:{connected:boolean;moveX:number;moveY:number;aimX:number;aimY:number;shoot:boolean};
  tutorial:{started:boolean;map:boolean;mapShown:boolean;wheel:boolean;dash:boolean};
  tutorialRun:boolean;
  tutorialHint:{kind:'map'|'wheel'|'dash';timer:number}|null;
  alert:number;
  roomStreak:number;
  seenRoomKeys:string[];
  offeredItems:string[];
  stainedFloor:number;

  player: {
    x: number; y: number; vx: number; vy: number;
    hp: number; maxHp: number; speed: number;
    weapons: (WeaponDef | null)[];
    activeWeapon: number;
    switchAnim: number;
    fireCooldown: number;
    dir: DuckDir; moving: boolean; shootFlash: number;
    hurtTimer: number; iFrames: number; flash: number;
    dashTimer: number; dashCooldown: number; dashDir: Vec2;
    crumbs: number; goldenCrumbs: number;
    items: string[]; activeItem: string | null;
    activeItemCooldown: number; activeItemMaxCooldown: number;
    damageMultiplier: number; shotCounter: number;
    projectileCounter:number;
    focusTarget: number; focusTime: number;
    ducklingX: number; ducklingY: number; ducklingFireCooldown: number;
    deathTimer: number;
    /** flashes "LISTO" para el HUD + audio */
    dashReadyFlash: number; quackReadyFlash: number;
    /** efectos temporales */
    speedBoost: number; fireBoost: number;
    shield: number;          // cáscara de huevo (absorbe golpes)
    combo: number; comboTimer: number;
    roomShield:number; helmetShield:boolean; couponUsed:boolean;
    contactShield:number;
    trayTimer:number; honeyTimer:number; healFlash:number; quackWave:number;
    fireBoostPower:number; facingAngle:number;
    companions:{x:number;y:number;cooldown:number;damage:number;kind?:'duck'|'chicken'|'guard'}[];
    chocolateTimer:number;dashHasteTimer:number;perfectBuff:number;
    firstHitUsed:boolean;reviveUsed:boolean;overdraftRemaining:number;
    dashHitIds:number[];guardianCooldown:number;
    heat:number;overheat:number;charge:number;streak:number;
  };

  map: GameMap;
  contents: Map<string, RoomContent>;
  currentKey: string;

  projectiles: Projectile[];
  particles: Particle[];
  damageNumbers: DamageNumber[];

  shakeX: number; shakeY: number; shakeIntensity: number;

  keys: Record<string, boolean>;
  mouseX: number; mouseY: number; mouseDown: boolean;

  stats: GameStats;
  run: RunStats;

  floorIntroTimer: number;
  bossIntroTimer: number;
  bossIntroName: string;
  bossIntroSubtitle: string;
  bossIntroSeen: Record<string, boolean>;
  floorClearTimer: number;
  roomLabel: string;
  roomLabelTimer: number;
  toast: string;
  toastTimer: number;
  pickupCard: PickupCard | null;

  transition: Transition;
  restartHold: number;
  bossDefeatTimer: number;
  rewardDropTimer: number;

  swap: SwapRequest | null;
  swapSel: number;
  swapGuard: number;

  overlayLabels: OverlayLabel[];

  totalGoldenCrumbs: number;
  metaLevels: Record<string, number>;
  settings: Settings;
  best: GameStats;
  /** cosméticos permanentes */
  unlockedSkins: string[];
  equippedSkin: string;
  discovered:Record<CollectionCategory,string[]>;
  knownSynergies:string[];
  bestFloor:number;
  newRecord:boolean;
  endFrame:number;
  heistIntroTimer:number;
  heistIntroSeen:boolean;
  hitStop:number;
  deathEchoes:{enemy:Enemy;life:number;vx:number;vy:number}[];
  decoy:{x:number;y:number;life:number;explosive:boolean}|null;
  grenades:import('./grenades').ThrownGrenade[];
  remoteBomb:{x:number;y:number;life:number}|null;
  drone:{x:number;y:number;life:number;cooldown:number}|null;
  coffeeCrash:number;
  synergyNotice:{name:string;description:string;timer:number}|null;
  activeSwap:{itemId:string;from:'floor'|'pedestal'|'shop'|'choice';srcIndex:number;worldX:number;worldY:number;roomKey:string}|null;
  collectionTab:CollectionCategory;
  collectionIndex:number;
  collectionScroll:number;
  wardrobeScroll:number;
  wardrobeScrollTarget:number;
  tooltip:{key:string;since:number};

  menuIndex: number;
  pauseIndex: number;
  settingsIndex: number;
  upgradeIndex: number;
  wardrobeIndex: number;

  scale: number;

  onStateChange?: (s: GameState) => void;
}

export type { GameMap, MapRoom, RoomType };
