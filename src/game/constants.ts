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

/**
 * Resolución artística interna del mundo. La lógica, hitboxes y coordenadas
 * siguen usando la cuadrícula histórica; el canvas físico dispone de 4x más
 * muestras por eje para sprites y efectos con detalle de 1/4 de píxel lógico.
 */
export const ART_SCALE = 4;
export const ART_PIXEL = 1 / ART_SCALE;

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
  // 1 · Gran entrada: piedra gris perla fría, juntas grafito y latón discreto.
  { floor: ['#9eabb4', '#929fa8', '#687782'], wall: ['#8c9aa4', '#74838d'], trim: '#9a7d49', glow: '#d7e0e5', deco: 'lobby' },
  // 2 · Administración: piedra gris cálida, roble claro y metal champagne.
  { floor: ['#aaa79f', '#98958d', '#706f6a'], wall: ['#b7afa4', '#8f887f'], trim: '#a99269', glow: '#e0d0b3', deco: 'security' },
  // 3 · Administración ejecutiva: piedra humo, nogal y bronce.
  { floor: ['#817f79', '#706e68', '#4d4c49'], wall: ['#6e665d', '#4e4944'], trim: '#b18d58', glow: '#e0bb78', deco: 'storage' },
  // 4 · Alta dirección: mármol crema, nogal oscuro y latón pulido.
  { floor: ['#b7ae9f', '#9e9588', '#6d655d'], wall: ['#54493f', '#352f2a'], trim: '#c59b58', glow: '#e8c17b', deco: 'bakery' },
  // 5 · Tesorería privada: mármol negro, crema, oro y bóveda de lujo.
  { floor: ['#383832', '#292a27', '#171816'], wall: ['#454239', '#292821'], trim: '#d7b13e', glow: '#f5d66a', deco: 'vault' },
  // 6 · Cámara soberana: mármol ónix, oro alto brillo y acentos diamante.
  { floor: ['#20232a', '#15181e', '#090b0e'], wall: ['#30323a', '#17191e'], trim: '#f0c84e', glow: '#aeeaff', deco: 'golden' },
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
// 10+ are destructible environment props.
export const OBSTACLE_BASE = 10;
export const OBSTACLES_PER_FLOOR = 20;

/**
 * 120 props únicos: 20 por piso. Cada piso eleva el nivel de inversión del
 * banco, desde mobiliario operativo barato hasta tecnología y custodia de lujo.
 */
export const FLOOR_PROP_NAMES = [
  [
    'reception_terminal','velvet_queue_post','brochure_stand','visitor_document_tray',
    'teller_cash_case','marble_lobby_column','guest_access_kiosk','lobby_alarm_panel',
    'reception_drawers','courier_briefcase','note_counter','reception_cart',
    'staff_cabinet','coin_display_cage','office_printer','lobby_lounge_chair',
    'grand_planter','drinking_fountain','lobby_information_screen','network_cabinet',
  ],
  [
    'admin_workstation','chrome_queue_post','file_carousel','document_box',
    'supply_credenza','oak_office_column','staff_access_pad','office_alarm_panel',
    'filing_bank','executive_briefcase','note_counter','records_cart',
    'document_locker','archive_cage','multifunction_printer','ergonomic_chair',
    'office_planter','water_station','meeting_display','server_tower',
  ],
  [
    'executive_desk','brass_partition','art_display_stand','leather_document_case',
    'executive_credenza','walnut_brass_column','biometric_pad','executive_alarm',
    'deed_drawer','premium_briefcase','currency_authenticator','service_cart',
    'executive_safe','rare_document_cage','secure_printer','leather_chair',
    'sculpted_planter','glass_water_bar','boardroom_console','encrypted_server',
  ],
  [
    'private_banker_desk','velvet_rope_barrier','museum_art_pedestal','leather_portfolio',
    'marble_credenza','marble_brass_column','biometric_terminal','silent_alarm_box',
    'art_archive_drawers','diplomatic_case','currency_lab','champagne_service_cart',
    'private_safe','platinum_display_cage','intaglio_press','club_chair',
    'marble_planter','indoor_fountain','gallery_media_wall','blade_server',
  ],
  [
    'gold_banker_console','gold_velvet_barrier','framed_gold_painting','money_stack',
    'bullion_chest','gilded_column','retina_access_station','gold_alarm_core',
    'money_pile','gold_bar_stack','gold_currency_table','bullion_cart',
    'gold_safe','gold_statue','gold_document_press','velvet_throne_chair',
    'gold_sculpture','gold_fountain','gilded_gallery_wall','treasury_server',
  ],
  [
    'diamond_vault_console','jeweled_barrier','diamond_masterpiece','diamond_pile',
    'diamond_gold_chest','crystal_gold_column','quantum_access_terminal','crown_alarm_nexus',
    'diamond_mound','diamond_case_stack','gem_appraisal_table','jewel_cart',
    'diamond_safe','monumental_gold_statue','royal_intaglio_press','diamond_lounge_chair',
    'crystal_sculpture','diamond_fountain','crown_gallery_wall','sovereign_data_vault',
  ],
] as const;

export const OBSTACLES = FLOOR_PROP_NAMES.flat();

