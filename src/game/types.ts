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
  mutation?:EndlessBossMutation|null;
  mutationCounter?:number;
  phaseTransition?:number;
  /** Secuencia aprendible de la firma de combate de jefes data-driven. */
  bossAttackIndex?:number;
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
  /** Fuerza una recogida visual hacia el pato al cerrar una ronda. */
  forceMagnet?:boolean;
  /** La recogida pertenece al barrido visual de cierre de ronda. */
  sweepCollect?:boolean;
}

export interface ItemPickup {
  x: number; y: number; itemId: string; isWeapon: boolean; isActive: boolean;
  discovered?:boolean;
  /** Equipo sobrante que vuela al pato antes de convertirse en migas. */
  vacuuming?:boolean;
  recycleValue?:number;
  vx?:number; vy?:number;
}

export interface ShopItem {
  itemId: string; cost: number; sold: boolean; isWeapon: boolean; x: number; y: number;
  soldAt?:number;
  deniedUntil?:number;
  isFood?:boolean;
}

export interface Puddle { x: number; y: number; life: number; kind?:'water'|'butter'|'fire'|'smoke'|'radiation'; radius?:number; }

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
  cafe?:boolean;
  dangerEventStarted?:boolean;
  dangerEventActive?:boolean;
  dangerEventDone?:boolean;
  dangerEventTotal?:number;
  dangerEventTimer?:number;
  dangerEventWave?:boolean;
  dangerEventPressure?:number;
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
  endlessSweep?:{
    started:number;
    recycledItems:number;
    recycledMigas:number;
    discardedHealing:number;
  };
}

export interface GameStats {
  breadStolen: number; enemiesDefeated: number; roomsCleared: number;
  goldenCrumbs: number; floorsCleared: number;
}

export interface WeaponRunStat { shots:number; damage:number; kills:number; }
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
  itemIds:string[];
  weaponStats:Record<string,WeaponRunStat>;
}

export type DifficultyMode = 'easy' | 'normal' | 'hard' | 'mad';
export type GameMode = 'heist' | 'endless' | 'daily';
export type EndlessRoundKind = 'combat'|'miniboss'|'special'|'subboss'|'boss';
export type EndlessSpecial = 'horde'|'elite'|'blackout'|'crossfire'|'cameras'|'siege'|'red_protocol';
export type EndlessRewardKind = 'item'|'weapon'|'heal'|'crumbs'|'recycle';
export type EndlessBossMutation = 'FRENÉTICO'|'BLINDADO'|'CAZADOR'|'REFUERZOS'|'TORMENTA';
export type EndlessHazardKind = 'laser_cross'|'hot_corners'|'shock_ring';
export interface EndlessRewardOption {
  kind:EndlessRewardKind;
  itemId?:string;
  amount?:number;
  label:string;
  description:string;
}
export interface EndlessRecord { round:number; score:number; alert:number; }
export interface EndlessState {
  round:number;
  alert:number;
  pressure:number;
  score:number;
  roundKind:EndlessRoundKind;
  special:EndlessSpecial|null;
  pendingEnemies:string[];
  spawnCooldown:number;
  roundActive:boolean;
  roundDamaged:boolean;
  perfectRounds:number;
  perfectStreak:number;
  maxPerfectStreak:number;
  rewardOptions:EndlessRewardOption[];
  rewardIndex:number;
  awaitingReward:boolean;
  bossBag:string[];
  subbossBag:string[];
  minibossBag:string[];
  enemiesThisRound:number;
  killedThisRound:number;
  threatRank:'NORMAL'|'VETERANO'|'ÉLITE'|'NÉMESIS';
  damageBySource:{contact:number;projectile:number};
  lastHitSource:'contact'|'projectile'|null;
  marketOpen:boolean;
  marketIndex:number;
  marketDoneRound:number;
  nextRewardBoost:number;
  nextRoundTimer:number;
  compositionLabel:string;
  hazardKind:EndlessHazardKind|null;
  hazardWarning:number;
  hazardCooldown:number;
  milestone:string|null;
}

export interface Settings {
  master: number; music: number; sfx: number;
  shake: number;            // 0..2
  damageNumbers: boolean;
  uiScale: number;          // 1..3
  fullscreen: boolean;
  brightness: number;       // 0.6..1.4
  reduceMotion: boolean;    // reduce decorative menu motion
  highContrast: boolean;
}

export interface KeyBindings {
  moveUp:string; moveDown:string; moveLeft:string; moveRight:string;
  shootUp:string; shootDown:string; shootLeft:string; shootRight:string;
  interact:string; dash:string; active:string; map:string; pause:string; recycle:string;
  weapon1:string; weapon2:string;
}

export interface DifficultyCareerRecord {
  runs:number; wins:number; bestFloor:number; bestTime:number; bestEndlessRound:number; bestEndlessScore:number;
}
export interface WeaponCareerStat { runs:number; wins:number; shots:number; damage:number; kills:number; }
export interface ItemCareerStat { runs:number; wins:number; }
export interface CareerStats {
  runs:number; wins:number; deaths:number; abandoned:number; endlessRuns:number;
  totalEnemies:number; totalBosses:number; totalDamage:number; totalDamageTaken:number;
  totalRooms:number; totalPlayFrames:number; bestEndlessRound:number; bestFloor:number;
  difficulty:Record<DifficultyMode,DifficultyCareerRecord>;
  weapons:Record<string,WeaponCareerStat>;
  items:Record<string,ItemCareerStat>;
}

export interface RunHistoryEntry {
  id:string; mode:GameMode; difficulty:DifficultyMode; outcome:'victory'|'death'|'abandoned';
  floor:number; round:number; time:number; enemies:number; bosses:number; damage:number;
  damageTaken:number; items:number; weapons:number; golden:number; seed:string;
  weaponIds:string[]; itemIds:string[]; activeItemId:string|null; synergyIds:string[]; dailyScore:number;
}

export type ContractMetric='runs'|'wins'|'enemies'|'bosses'|'damage'|'rooms'|'endlessRuns';
export interface ContractPeriodState {
  key:string;
  baseline:Record<ContractMetric,number>;
  rewarded:string[];
}
export interface ContractState { daily:ContractPeriodState; weekly:ContractPeriodState; }

export type DailyModifier='SECURITY_SURGE'|'ELITE_AUDIT'|'SPEED_CHECK'|'GLASS_BEAK'|'NO_LUNCH'|'HOT_START';
export type DailyMedal='NONE'|'BRONZE'|'SILVER'|'GOLD'|'PLATINUM';
export interface DailyChallengeRecord {
  key:string;seed:string;attempts:number;bestScore:number;bestMedal:DailyMedal;bestFloor:number;bestTime:number;
  completed:boolean;rewardGranted:number;
}
export interface DailyChallengeProfile {
  current:DailyChallengeRecord;totalCompleted:number;goldCount:number;currentStreak:number;bestStreak:number;lastCompletedKey:string;
}
export interface DailyChallengeRuntime {
  key:string;seed:string;modifiers:DailyModifier[];score:number;
}
export interface DailyChallengeResult {
  score:number;medal:DailyMedal;reward:number;newBest:boolean;outcome:'victory'|'death'|'abandoned';
}

export interface SwapRequest {
  itemId: string;
  slot: number;             // arma que se reemplazaría
  from: 'floor' | 'pedestal' | 'shop' | 'choice' | 'endless';
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
  bindings: KeyBindings;
  controlIndex:number;
  controlCapture:boolean;
  career: CareerStats;
  runHistory: RunHistoryEntry[];
  runRecorded:boolean;
  contracts:ContractState;
  dailyProfile:DailyChallengeProfile;
  daily:DailyChallengeRuntime;
  dailyResult:DailyChallengeResult|null;
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
  decoy:{x:number;y:number;life:number;explosive:boolean;stunOnExpire?:number}|null;
  grenades:import('./grenades').ThrownGrenade[];
  remoteBomb:{x:number;y:number;life:number}|null;
  drone:{x:number;y:number;life:number;cooldown:number}|null;
  coffeeCrash:number;
  dangerEventMusic?:boolean;
  synergyNotice:{name:string;description:string;timer:number}|null;
  activeSwap:{itemId:string;from:'floor'|'pedestal'|'shop'|'choice'|'endless';srcIndex:number;worldX:number;worldY:number;roomKey:string}|null;
  collectionTab:CollectionCategory;
  collectionIndex:number;
  collectionScroll:number;
  collectionFilter:'all'|'known'|'unknown';
  collectionSort:'default'|'name'|'rarity';
  careerTab:number;
  wardrobeScroll:number;
  wardrobeScrollTarget:number;
  tooltip:{key:string;since:number};

  difficulty: DifficultyMode;
  difficultyIndex: number;
  gameMode: GameMode;
  pendingMode: GameMode;
  endless: EndlessState;
  endlessRecords: Record<DifficultyMode,EndlessRecord>;
  endlessCheckpointRound:number;
  endlessCheckpointDifficulty:DifficultyMode|null;
  heistCheckpointFloor:number;
  heistCheckpointDifficulty:DifficultyMode|null;
  endlessResumeIndex:number;
  madUnlocked: boolean;

  menuIndex: number;
  pauseIndex: number;
  runInfoTab: number;
  confirmIndex: number;
  confirmKind: 'restart'|'quit'|'new_endless'|'new_heist'|null;
  confirmReturnState: GameState;
  settingsIndex: number;
  upgradeIndex: number;
  wardrobeIndex: number;

  scale: number;

  onStateChange?: (s: GameState) => void;
}

export type { GameMap, MapRoom, RoomType };
