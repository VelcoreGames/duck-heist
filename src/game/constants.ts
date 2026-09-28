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
  // 1 · Vestíbulo tecnobancario: acero azul petróleo + luz cálida de recepción.
  { floor: ['#1e2b34', '#273640', '#111a21'], wall: ['#2b3943', '#18242c'], trim: '#d1a652', glow: '#efc66a', deco: 'lobby' },
  // 2 · Seguridad: metal azul-negro + señalización cian/roja.
  { floor: ['#13242f', '#1b303c', '#0a151d'], wall: ['#213846', '#122630'], trim: '#79b9d2', glow: '#55c9f0', deco: 'security' },
  // 3 · Archivo de valores: acero ahumado + bronce industrial.
  { floor: ['#2a2926', '#35322d', '#171715'], wall: ['#3a3934', '#242421'], trim: '#bd9655', glow: '#e0b96f', deco: 'storage' },
  // 4 · Servicios / panadería: grafito caliente + cobre/ámbar.
  { floor: ['#302520', '#3a2d27', '#191310'], wall: ['#46352e', '#2a211d'], trim: '#c47d45', glow: '#f0a45e', deco: 'bakery' },
  // 5 · Alta seguridad: titanio oscuro + señalización dorada.
  { floor: ['#1b2328', '#252e33', '#0e1418'], wall: ['#303b42', '#1a242a'], trim: '#d0ae59', glow: '#f0cb6d', deco: 'vault' },
  // 6 · Cámara principal: negro grafito + oro de alta custodia.
  { floor: ['#24231e', '#302d24', '#11110f'], wall: ['#3d3a31', '#211f1a'], trim: '#e6bd4f', glow: '#ffd76d', deco: 'golden' },
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
    'reception_terminal','nylon_queue_post','brochure_carousel','document_tote',
    'supply_case','plaster_support','basic_access_pad','alarm_junction',
    'filing_drawers','courier_case','bill_counter','records_cart',
    'evidence_cabinet','coin_cage','office_printer','visitor_chair',
    'ceramic_planter','water_dispenser','cctv_monitor','network_tower',
  ],
  [
    'teller_workstation','chrome_queue_post','form_rotary','sealed_cash_tote',
    'transfer_crate','steel_support','security_keypad','alarm_controller',
    'deposit_drawers','cash_hardcase','currency_sorter','secure_file_cart',
    'security_locker','silver_storage_cage','laser_multifunction','ergonomic_chair',
    'stone_planter','filtered_water_station','surveillance_console','rack_server',
  ],
  [
    'dual_teller_console','brass_queue_gate','legal_file_carousel','tamperproof_tote',
    'armored_dispatch_box','reinforced_column','biometric_keypad','alarm_matrix',
    'bond_drawer_bank','executive_courier_case','note_authenticator','motorized_archive_cart',
    'evidence_safe_locker','precious_metal_cage','production_printer','executive_task_chair',
    'granite_planter','chilled_water_bar','camera_control_desk','encrypted_server',
  ],
  [
    'private_banker_desk','velvet_queue_gate','contract_display','leather_document_case',
    'executive_transfer_chest','marble_brass_column','biometric_terminal','security_command_box',
    'deed_drawer_wall','diplomatic_hardcase','forensic_currency_lab','powered_vault_cart',
    'deed_archive_vault','platinum_cage','secure_document_press','leather_executive_chair',
    'sculpted_planter','glass_water_column','security_wall_console','blade_server',
  ],
  [
    'vault_operator_console','illuminated_security_gate','bearer_bond_display','sealed_bullion_satchel',
    'armored_value_crate','titanium_support','retina_access_station','redundant_alarm_core',
    'vault_deposit_stack','bullion_transit_case','highspeed_currency_lab','armored_value_trolley',
    'classified_record_safe','palladium_cage','encrypted_print_station','security_command_chair',
    'designer_stone_planter','premium_hydration_station','tactical_surveillance_rig','hardened_server_rack',
  ],
  [
    'master_vault_console','gold_security_gate','rare_bond_reliquary','royal_document_coffer',
    'sovereign_bullion_crate','gilded_titanium_pillar','quantum_biometric_terminal','vault_alarm_nexus',
    'crown_deposit_array','diplomatic_bullion_case','sovereign_currency_scanner','autonomous_bullion_cart',
    'royal_archive_safe','gold_bar_display_cage','secure_intaglio_press','master_director_chair',
    'jade_gold_planter','crystal_water_station','panoramic_security_command','sovereign_data_vault',
  ],
] as const;

export const OBSTACLES = FLOOR_PROP_NAMES.flat();

