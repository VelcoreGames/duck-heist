// Game constants
export const TILE_SIZE = 32;
export const BASE_ROOM_WIDTH = 15;
export const ROOM_HEIGHT = 11;
export const UI_BASE_WIDTH = BASE_ROOM_WIDTH * TILE_SIZE; // 480

/**
 * El mundo aproxima el aspecto del monitor con un número impar de columnas
 * para conservar puertas y composición centradas. Elegimos la opción impar
 * más cercana al aspect ratio real; fullscreen después hace un ajuste CSS
 * mínimo para mostrar el canvas completo sin recortar HUD, puertas ni bordes.
 *
 * En SSR/tests sin DOM conserva 15x11.
 */
function responsiveRoomWidth(): number {
  if (typeof window === 'undefined') return BASE_ROOM_WIDTH;

  const viewport = window.visualViewport;
  const viewportW = Math.max(1, viewport?.width ?? window.innerWidth ?? UI_BASE_WIDTH);
  const viewportH = Math.max(1, viewport?.height ?? window.innerHeight ?? ROOM_HEIGHT * TILE_SIZE);

  // Para fullscreen manda el monitor, no la relación de aspecto de una ventana
  // del navegador que quizá estaba muy ancha o muy baja antes de pulsar F.
  const screenW = Number(window.screen?.width) || 0;
  const screenH = Number(window.screen?.height) || 0;
  const rawAspect = screenW > 0 && screenH > 0 ? screenW / screenH : viewportW / viewportH;

  const baseAspect = BASE_ROOM_WIDTH / ROOM_HEIGHT;
  const targetAspect = Math.max(baseAspect, Math.min(3.7, rawAspect));
  const targetTiles = ROOM_HEIGHT * targetAspect;

  let lower=Math.floor(targetTiles);
  if(lower%2===0)lower-=1;
  lower=Math.max(BASE_ROOM_WIDTH,lower);

  let upper=Math.ceil(targetTiles);
  if(upper%2===0)upper+=1;
  upper=Math.min(41,Math.max(BASE_ROOM_WIDTH,upper));

  const lowerError=Math.abs(lower/ROOM_HEIGHT-targetAspect);
  const upperError=Math.abs(upper/ROOM_HEIGHT-targetAspect);
  return upperError<lowerError?upper:lower;
}

export const ROOM_WIDTH = responsiveRoomWidth();
export const CANVAS_WIDTH = ROOM_WIDTH * TILE_SIZE;
export const CANVAS_HEIGHT = ROOM_HEIGHT * TILE_SIZE; // 352
export const UI_OFFSET_X = Math.floor((CANVAS_WIDTH - UI_BASE_WIDTH) / 2);
export const SCALE = 2;

export const PLAYER_SPEED = 2.2;
export const DASH_SPEED = 6;
export const DASH_DURATION = 8;
export const DASH_COOLDOWN = 45;

/** Frames required holding R to restart (~0.8s at 60fps) */
export const RESTART_HOLD_FRAMES = 48;

/** Intro cinematográfica al comenzar una operación (~2.3 s a 60 fps). */
export const HEIST_INTRO_FRAMES = 138;
/** Momento a partir del cual Enter/Espacio/clic pueden omitirla (~0.37 s). */
export const HEIST_INTRO_SKIP_AFTER = 22;

export const COLORS = {
  bg: '#0a0a1a',
  wall: '#1a1a2e',
  wallLight: '#2a2a4e',
  floor: '#16213e',
  floorLight: '#1a2744',
  floorTile: '#0f1b33',
  gold: '#f4d03f',
  goldDark: '#d4a017',
  bread: '#d4a574',
  breadDark: '#a67c52',
  breadLight: '#e8c99b',
  duckYellow: '#f9e547',
  duckOrange: '#e67e22',
  cream: '#f5e6ca',
  teal: '#1abc9c',
  green: '#27ae60',
  red: '#e74c3c',
  navy: '#0c1445',
  charcoal: '#20232e',
  silver: '#b9c2cc',
  silverDark: '#6c7684',
  white: '#ecf0f1',
  black: '#0a0a0a',
  shadow: 'rgba(0,0,0,0.4)',
  police: '#2b4a8b',
  policeLight: '#4f7ad4',
};

export enum GameState {
  MENU = 'MENU',
  DIFFICULTY = 'DIFFICULTY',
  DAILY_BRIEF = 'DAILY_BRIEF',
  HEIST_INTRO = 'HEIST_INTRO',
  COLLECTION = 'COLLECTION',
  PLAYING = 'PLAYING',
  MAP = 'MAP',
  PAUSED = 'PAUSED',
  GAME_OVER = 'GAME_OVER',
  VICTORY = 'VICTORY',
  FLOOR_INTRO = 'FLOOR_INTRO',
  FLOOR_CLEAR = 'FLOOR_CLEAR',
  BOSS_INTRO = 'BOSS_INTRO',
  ENDLESS_REWARD = 'ENDLESS_REWARD',
  ENDLESS_RESUME = 'ENDLESS_RESUME',
  RUN_INFO = 'RUN_INFO',
  CONTROLS = 'CONTROLS',
  CAREER = 'CAREER',
  CONFIRM = 'CONFIRM',
  UPGRADES = 'UPGRADES',
  WARDROBE = 'WARDROBE',
  HOW_TO_PLAY = 'HOW_TO_PLAY',
  SETTINGS = 'SETTINGS',
}

/** Tema visual de cada piso */
export interface FloorTheme {
  floor: string[]; wall: string[]; trim: string; glow: string; deco: string;
}

export const FLOOR_THEMES: FloorTheme[] = [
  // 1 · Gran vestíbulo: mármol azul pizarra, piedra tallada y latón satinado.
  { floor: ['#26313a', '#2d3942', '#1c252d'], wall: ['#343f47', '#252f36'], trim: '#c6a866', glow: '#d8e5e4', deco: 'lobby' },
  // 2 · Seguridad ejecutiva: granito azul-negro y acero cepillado.
  { floor: ['#172631', '#1d2f3b', '#111c24'], wall: ['#243945', '#182832'], trim: '#8faeb7', glow: '#74b7d0', deco: 'security' },
  // 3 · Archivo de valores: piedra cálida, nogal oscuro y bronce.
  { floor: ['#302a24', '#393129', '#211d19'], wall: ['#403831', '#2d2823'], trim: '#b89562', glow: '#d9c49d', deco: 'storage' },
  // 4 · Servicios privados: piedra borgoña, cobre y luz cálida controlada.
  { floor: ['#342522', '#3d2c28', '#251b19'], wall: ['#49332f', '#322521'], trim: '#bd835c', glow: '#e6a46f', deco: 'bakery' },
  // 5 · Alta seguridad: granito negro, titanio y latón.
  { floor: ['#20252a', '#282e34', '#15191d'], wall: ['#353d43', '#252c31'], trim: '#c9ad62', glow: '#e7d083', deco: 'vault' },
  // 6 · Cámara principal: mármol negro con incrustaciones de oro.
  { floor: ['#29261f', '#342f25', '#191713'], wall: ['#474238', '#302c25'], trim: '#e6c56f', glow: '#ffe59a', deco: 'golden' },
];

export enum RoomType {
  START = 'START',
  COMBAT = 'COMBAT',
  ITEM = 'ITEM',
  TREASURE = 'TREASURE',
  SHOP = 'SHOP',
  GUN_VAN = 'GUN_VAN',
  CHALLENGE = 'CHALLENGE',
  MINIBOSS = 'MINIBOSS',
  SUBBOSS = 'SUBBOSS',
  BOSS = 'BOSS',
  SECRET = 'SECRET',
  EVENT = 'EVENT',
  CHOICE = 'CHOICE',
}

/** Cardinal directions used by the grid map */
export type Dir = 'N' | 'S' | 'E' | 'W';
export const DIRS: Dir[] = ['N', 'S', 'E', 'W'];

export const DIR_VECTORS: Record<Dir, { x: number; y: number }> = {
  N: { x: 0, y: -1 },
  S: { x: 0, y: 1 },
  E: { x: 1, y: 0 },
  W: { x: -1, y: 0 },
};

export const OPPOSITE: Record<Dir, Dir> = { N: 'S', S: 'N', E: 'W', W: 'E' };

/** Door tile coordinates (in room tile space) for each direction */
export const DOOR_TILE: Record<Dir, { x: number; y: number }> = {
  N: { x: Math.floor(ROOM_WIDTH / 2), y: 0 },
  S: { x: Math.floor(ROOM_WIDTH / 2), y: ROOM_HEIGHT - 1 },
  W: { x: 0, y: Math.floor(ROOM_HEIGHT / 2) },
  E: { x: ROOM_WIDTH - 1, y: Math.floor(ROOM_HEIGHT / 2) },
};

/** Tile ids */
export const TILE_FLOOR = 0;
export const TILE_WALL = 1;
export const TILE_DOOR = 2;
// 10+ are obstacles
export const OBSTACLE_BASE = 10;
export const OBSTACLES = [
  'desk',      // 10 mostrador
  'barrier',   // 11 barrera de seguridad
  'shelf',     // 12 estantería
  'moneybag',  // 13 saco de dinero
  'crate',     // 14 caja de pan
  'column',    // 15 columna
  'safe',      // 16 caja fuerte
  'rubble',    // 17 escombros
];
