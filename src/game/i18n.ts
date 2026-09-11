// Terminología oficial para español de México.
import { RoomType } from './constants';
export const LOCALE='es-MX';

export const T = {
  // --- Título ---
  titleTop: 'DUCK HEIST',
  titleBottom: 'EL BANCO DEL PAN',
  tagline: '¡EL PRECIO DEL PAN ES UN ROBO!',

  // --- Menú principal ---
  menuStart: 'INICIAR ATRACO',
  menuUpgrades: 'MEJORAS',
  menuWardrobe: 'ARMARIO',
  menuHowTo: 'CÓMO JUGAR',
  menuSettings: 'CONFIGURACIÓN',
  menuHint: 'W/S o FLECHAS para elegir · ENTER para confirmar',

  // --- Pausa ---
  paused: 'PAUSA',
  resume: 'CONTINUAR',
  restartRun: 'REINICIAR PARTIDA',
  backToMenu: 'MENÚ PRINCIPAL',
  resumeHint: 'Presiona ESC para continuar',

  // --- Controles ---
  controls: 'CONTROLES',
  ctrlMove: 'Moverse',
  ctrlShoot: 'Disparar',
  ctrlAim: 'Apuntar y disparar',
  ctrlDash: 'Esquivar',
  ctrlItem: 'Objeto activo',
  ctrlInteract: 'Interactuar',
  ctrlRestart: 'Mantener para reiniciar',
  ctrlPause: 'Pausa',
  keyMove: 'WASD',
  keyShoot: 'FLECHAS',
  keyAim: 'MOUSE',
  keyDash: 'SHIFT',
  keyItem: 'ESPACIO',
  keyInteract: 'E',
  keyRestart: 'R',
  keyPause: 'ESC',

  // --- Cómo jugar ---
  howToTitle: 'CÓMO JUGAR',
  howToLines: [
    'Limpia cada sala de policías para abrir las puertas.',
    'Recoge migajas para comprar en la tienda.',
    'Puerta DORADA = sala de objetos · PLATEADA = sala normal.',
    'Puerta ROJA Y NEGRA = el JEFE del piso.',
    'Llevas DOS armas: usa la RUEDA DEL MOUSE para cambiar.',
    'Derrota al jefe, recoge su botín y baja por las escaleras.',
    'Cada piso es más duro y el mapa cambia en cada atraco.',
    'Corazones = vida. El pan te cura. Si llegan a cero, pierdes.',
  ],
  back: 'VOLVER',
  backHint: 'ENTER o ESC para volver',

  // --- Configuración ---
  settingsTitle: 'CONFIGURACIÓN',
  settingMaster: 'VOLUMEN GENERAL',
  settingMusic: 'MÚSICA',
  settingSfx: 'EFECTOS DE SONIDO',
  settingShake: 'VIBRACIÓN DE PANTALLA',
  settingDamage: 'NÚMEROS DE DAÑO',
  settingUiScale: 'ESCALA DE INTERFAZ',
  settingFullscreen: 'PANTALLA COMPLETA',
  on: 'SÍ',
  off: 'NO',
  settingsHint: '↑↓ elegir · ←→ cambiar · ESC volver',
  vol: 'VOL',

  // --- Botiquín ---
  breadSlice: 'REBANADA DE PAN',
  sandwich: 'SÁNDWICH COMPLETO',

  // --- Monedas ---
  tempCurrency: 'MIGAJAS',
  permCurrency: 'MONEDAS DORADAS',

  // --- Armario ---
  wardrobeTitle: 'ARMARIO',
  wardrobeHint: '↑↓ elegir · ENTER comprar/equipar · ESC volver',
  price: 'PRECIO',
  buyCaps: 'COMPRAR',
  equip: 'EQUIPAR ASPECTO',
  equipped: 'EQUIPADO',
  owned: 'DESBLOQUEADO',

  // --- Curación ---
  heal1: 'Recupera 1 corazón.',
  heal2: 'Recupera 2 corazones.',
  heal3: 'Recupera 3 corazones.',
  healFull: 'Recupera toda la vida.',
  healSpeed: 'Recupera 1 corazón y te da un empujón de velocidad.',

  // --- Sinergias ---
  synergy: 'SINERGIA DESCUBIERTA',
  roomClear: 'SALA DESPEJADA',

  // --- Estadísticas de la run ---
  statFloor: 'Piso alcanzado',
  statBosses: 'Jefes derrotados',
  statItems: 'Objetos encontrados',
  statWeapons: 'Armas encontradas',
  statDealt: 'Daño infligido',
  statTaken: 'Daño recibido',
  statTime: 'Duración',

  // --- Armas ---
  slot: 'ARMA',
  active: 'ARMA ACTIVA',
  empty: 'VACÍO',
  inventoryFull: 'INVENTARIO LLENO',
  replaceQuestion: '¿QUÉ ARMA QUIERES REEMPLAZAR?',
  onFloor: 'ARMA EN EL SUELO',
  yours: 'TUS ARMAS',
  cancel: 'ESC · CANCELAR',
  confirmSwap: '1 / 2 · ELEGIR · E CONFIRMAR',
  switchHint: 'RUEDA DEL MOUSE · CAMBIAR ARMA',
  swapShort: 'CAMBIAR ARMA',
  statDmg: 'DAÑO',
  statRate: 'CADENCIA DE DISPARO',
  statRange: 'ALCANCE',
  statSpeed: 'VELOCIDAD DE PROYECTIL',
  statSpecial: 'Especial',
  rarity: ['COMÚN', 'POCO COMÚN', 'RARO', 'ÉPICO', 'LEGENDARIO'],

  // --- Jefe / progresión ---
  bossLoot: 'BOTÍN DEL JEFE',
  stairsPrompt: 'E · BAJAR AL SIGUIENTE PISO',
  stairsLocked: 'LA ESCALERA SE ABRE AL CAER EL JEFE',
  floorComplete: 'PISO COMPLETADO',
  descending: 'DESCENDIENDO...',
  elite: 'ÉLITE',

  // --- Mejoras ---
  upgradesTitle: 'MEJORAS PERMANENTES',
  upgradesCurrency: 'Monedas doradas',
  upgradeBought: 'COMPRADO',
  notEnough: 'MIGAJAS INSUFICIENTES',

  // --- Game over ---
  gameOver: 'EL ATRACO FRACASÓ',
  victory: 'EL PAN ES NUESTRO',
  victorySub: '¡El pan pertenece a los patos!',
  statBread: 'Pan robado',
  statEnemies: 'Enemigos derrotados',
  statRooms: 'Salas despejadas',
  statGolden: 'Monedas doradas obtenidas',
  statFloors: 'Pisos superados',
  tryAgain: 'REINTENTAR',
  playAgain: 'JUGAR DE NUEVO',
  bestRun: 'MEJOR PARTIDA',

  // --- HUD / juego ---
  floor: 'PISO',
  holdRestart: 'MANTÉN R PARA REINICIAR',
  lockedDoors: '¡PUERTAS BLOQUEADAS!',
  doorsOpen: 'PUERTAS ABIERTAS',
  warning: 'ALERTA',
  buy: 'Comprar',
  take: 'RECOGER',
  open: 'Abrir',
  crumbs: 'Migajas',
  sold: 'VENDIDO',
  shopTitle: 'TIENDA CLANDESTINA',
  shopKeeper: 'DON MIGAJÓN',
  pedestalHint: 'Acércate para recoger el objeto',
  newItem: '¡NUEVO OBJETO!',
  newWeapon: '¡NUEVA ARMA!',
  block: 'BLOQUEO',
};

/** Nombres de los pisos */
export const FLOOR_NAMES_ES = [
  'ENTRADA DEL BANCO',
  'OFICINAS DE SEGURIDAD',
  'ALMACÉN DE PAN',
  'PANADERÍA SUBTERRÁNEA',
  'BÓVEDA DE ALTA SEGURIDAD',
  'LA CÁMARA DEL PAN DORADO',
];

/** Etiquetas mostradas al entrar en una sala especial */
export const ROOM_LABELS: Partial<Record<RoomType, string>> = {
  [RoomType.ITEM]: 'SALA DE OBJETOS',
  [RoomType.TREASURE]: 'SALA DEL TESORO',
  [RoomType.SHOP]: 'TIENDA CLANDESTINA',
  [RoomType.CHALLENGE]: 'DESAFÍO',
  [RoomType.MINIBOSS]: 'MINIJEFE',
  [RoomType.BOSS]: 'JEFE',
  [RoomType.SECRET]: 'BÓVEDA SECRETA',
};
