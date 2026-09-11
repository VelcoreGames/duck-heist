// Game constants
export const TILE_SIZE = 32;
export const ROOM_WIDTH = 15;
export const ROOM_HEIGHT = 11;
export const CANVAS_WIDTH = ROOM_WIDTH * TILE_SIZE; // 480
export const CANVAS_HEIGHT = ROOM_HEIGHT * TILE_SIZE; // 352
export const SCALE = 2;

export const PLAYER_SPEED = 2.2;
export const DASH_SPEED = 6;
export const DASH_DURATION = 8;
export const DASH_COOLDOWN = 45;

/** Frames required holding R to restart (~0.8s at 60fps) */
export const RESTART_HOLD_FRAMES = 48;

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
  // 1 · vestíbulo: mármol limpio, mostradores, ATM
  { floor: ['#1b2440', '#202a4a', '#141c33'], wall: ['#232c47', '#1a2138'], trim: '#98a2ae', glow: '#8fb3d5', deco: 'lobby' },
  // 2 · oficinas de seguridad: azules, monitores
  { floor: ['#12203a', '#16283f', '#0d1729'], wall: ['#1b2b46', '#131e33'], trim: '#4f7ad4', glow: '#4f9dd8', deco: 'security' },
  // 3 · almacén de pan: cajas, sacos de harina
  { floor: ['#2a2015', '#33281b', '#1e170e'], wall: ['#3b2d1e', '#2a2015'], trim: '#d4a574', glow: '#e8c99b', deco: 'storage' },
  // 4 · panadería: hornos y fuego
  { floor: ['#2c1710', '#361d13', '#1e0f0a'], wall: ['#41231a', '#2c1710'], trim: '#ff8a3d', glow: '#ff6b3d', deco: 'bakery' },
  // 5 · alta seguridad: oro, acero, láseres
  { floor: ['#1c1c26', '#23232f', '#141419'], wall: ['#2f323d', '#22242c'], trim: '#f4d03f', glow: '#f4d03f', deco: 'vault' },
  // 6 · cámara del pan dorado
  { floor: ['#3a2c0d', '#473613', '#2a200a'], wall: ['#5a4515', '#3d2f0f'], trim: '#fff3b0', glow: '#ffe066', deco: 'golden' },
];

export enum RoomType {
  START = 'START',
  COMBAT = 'COMBAT',
  ITEM = 'ITEM',
  TREASURE = 'TREASURE',
  SHOP = 'SHOP',
  CHALLENGE = 'CHALLENGE',
  MINIBOSS = 'MINIBOSS',
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
