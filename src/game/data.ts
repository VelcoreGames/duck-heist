// Datos del juego: armas, objetos, enemigos (todo en español)
import { ACTIVE_RULES, NEW_ACTIVE_ITEMS, NEW_PASSIVE_ITEMS, PASSIVE_RULES } from './itemRules';
import { EXPANSION_ITEMS, type ItemRole } from './expansion';

export const RARITY_NAMES = ['COMÚN', 'POCO COMÚN', 'RARO', 'ÉPICO', 'LEGENDARIO'];
/** Colores por rareza: común → legendario */
export const RARITY_COLORS = ['#9aa5b5', '#5fb36a', '#4f9dd8', '#b06fe8', '#f4a72b'];

export interface WeaponDef {
  id: string;
  name: string;
  description: string;
  /** Texto corto de "especial" para la ficha de estadísticas */
  special: string;
  fireRate: number;
  damage: number;
  projectileSpeed: number;
  projectileType: string;
  spread: number;
  projectileCount: number;
  knockback: number;
  piercing: boolean;
  bounces: number;
  continuous: boolean;
  boomerang: boolean;
  explode?: number;      // radio de explosión
  cost: number;
  rarity: number;        // 0 común .. 4 legendario
  /** Barreras 0..5 para la ficha: daño, cadencia, alcance, velocidad */
  bars: { dmg: number; rate: number; range: number; speed: number };
  /** texto cómico corto */
  flavor?: string;
}

export const WEAPONS: Record<string, WeaponDef> = {
  quack_blaster: {
    id: 'quack_blaster', name: 'CUAC-BLÁSTER',
    description: 'Dispara ondas sónicas de cuac',
    special: 'Cada sexto disparo es un CUAC POTENTE: más daño y empujón.',
    fireRate: 12, damage: 8, projectileSpeed: 5, projectileType: 'quack',
    spread: 0, projectileCount: 1, knockback: 2,
    piercing: false, bounces: 0, continuous: false, boomerang: false,
    cost: 0, rarity: 0, bars: { dmg: 2, rate: 3, range: 3, speed: 3 },
  },
  breadcrumb_shotgun: {
    id: 'breadcrumb_shotgun',
    name: 'ESCOPETA DE MIGAS',
    description: 'Perdigones de pan en abanico',
    special: 'Devastadora a corta distancia. Ideal para pasillos.',
    fireRate: 30, damage: 5, projectileSpeed: 4.5, projectileType: 'breadcrumb',
    spread: 0.5, projectileCount: 6, knockback: 3,
    piercing: false, bounces: 0, continuous: false, boomerang: false,
    cost: 15, rarity: 1, bars: { dmg: 4, rate: 2, range: 1, speed: 3 },
  },
  feather_gun: {
    id: 'feather_gun',
    name: 'AMETRALLADORA DE PLUMAS',
    description: 'Plumas rapidísimas, poco daño',
    special: 'Gana calor. Si se sobrecalienta, se traba un instante.',
    fireRate: 5, damage: 3, projectileSpeed: 6, projectileType: 'feather',
    spread: 0.15, projectileCount: 1, knockback: 0.5,
    piercing: false, bounces: 0, continuous: false, boomerang: false,
    cost: 20, rarity: 0, bars: { dmg: 1, rate: 5, range: 3, speed: 4 },
  },
  bread_boomerang: {
    id: 'bread_boomerang',
    name: 'BUMERÁN DE PAN',
    description: 'Va y vuelve golpeando dos veces',
    special: 'Atraviesa enemigos y regresa a tu pico.',
    fireRate: 25, damage: 12, projectileSpeed: 4, projectileType: 'bread_boomerang',
    spread: 0, projectileCount: 1, knockback: 2,
    piercing: true, bounces: 0, continuous: false, boomerang: true,
    cost: 18, rarity: 2, bars: { dmg: 3, rate: 3, range: 4, speed: 2 },
  },
  rubber_duck_cannon: {
    id: 'rubber_duck_cannon',
    name: 'CAÑÓN DE PATITOS',
    description: 'Patitos de goma que rebotan',
    special: 'Cada rebote suma 10% de daño. Rechina en las paredes.',
    fireRate: 20, damage: 10, projectileSpeed: 4, projectileType: 'rubber_duck',
    spread: 0, projectileCount: 1, knockback: 2,
    piercing: false, bounces: 3, continuous: false, boomerang: false,
    cost: 20, rarity: 2, bars: { dmg: 3, rate: 3, range: 5, speed: 3 },
  },
  baguette_launcher: {
    id: 'baguette_launcher',
    name: 'LANZA-BAGUETTES',
    description: 'Baguettes explosivas de área',
    special: 'Impacto directo: +25% daño. Explota en área.',
    fireRate: 45, damage: 25, projectileSpeed: 3, projectileType: 'baguette',
    spread: 0, projectileCount: 1, knockback: 6,
    piercing: false, bounces: 0, continuous: false, boomerang: false,
    explode: 56, cost: 25, rarity: 3, bars: { dmg: 5, rate: 1, range: 3, speed: 1 },
  },
  quack_laser: {
    id: 'quack_laser',
    name: 'LÁSER CUAC',
    description: 'Rayo sónico continuo',
    special: 'Atraviesa todo. El daño sube si mantienes la mira.',
    fireRate: 3, damage: 2, projectileSpeed: 8, projectileType: 'quack_laser',
    spread: 0, projectileCount: 1, knockback: 0.2,
    piercing: true, bounces: 0, continuous: true, boomerang: false,
    cost: 22, rarity: 3, bars: { dmg: 2, rate: 5, range: 4, speed: 5 },
  },
  golden_egg_revolver: {
    id: 'golden_egg_revolver',
    name: 'REVÓLVER DE HUEVO DORADO',
    description: 'Mucho daño, lento, críticos',
    special: 'Mantén la mira: el siguiente tiro gana crítico dorado.',
    fireRate: 40, damage: 30, projectileSpeed: 5.5, projectileType: 'golden_egg',
    spread: 0, projectileCount: 1, knockback: 5,
    piercing: false, bounces: 0, continuous: false, boomerang: false,
    cost: 30, rarity: 4, bars: { dmg: 5, rate: 1, range: 4, speed: 4 },
  },
  tactical_toaster: {
    id: 'tactical_toaster', name: 'TOSTADORA TÁCTICA',
    description: 'Lanza tostadas que se pegan. A la tercera explotan.',
    special: 'Tres tostadas en un enemigo: explosión.',
    fireRate: 22, damage: 6, projectileSpeed: 4.2, projectileType: 'toast_stick',
    spread: .08, projectileCount: 1, knockback: 1,
    piercing: false, bounces: 0, continuous: false, boomerang: false,
    cost: 22, rarity: 2, bars: { dmg: 3, rate: 3, range: 3, speed: 3 },
  },
  egg_cannon: {
    id: 'egg_cannon', name: 'CAÑÓN DE HUEVOS',
    description: 'Huevos que se rompen en 3 yemas.',
    special: 'Al impactar, 3 yemas salen en abanico.',
    fireRate: 26, damage: 9, projectileSpeed: 3.8, projectileType: 'egg_shell',
    spread: 0, projectileCount: 1, knockback: 2,
    piercing: false, bounces: 0, continuous: false, boomerang: false,
    cost: 21, rarity: 2, bars: { dmg: 3, rate: 2, range: 3, speed: 2 },
  },
  baguette_sniper: {
    id: 'baguette_sniper', name: 'FRANCOTIRADOR BAGUETTE',
    description: 'Mantén para apuntar. Suelta para un disparo rápido.',
    special: 'Perfora varios enemigos. Alta precisión.',
    fireRate: 48, damage: 34, projectileSpeed: 9, projectileType: 'sniper_baguette',
    spread: 0, projectileCount: 1, knockback: 4,
    piercing: true, bounces: 0, continuous: false, boomerang: false,
    cost: 28, rarity: 3, bars: { dmg: 5, rate: 1, range: 5, speed: 5 },
  },
  plasma_baker: {
    id: 'plasma_baker', name: 'PANADERA DE PLASMA',
    description: 'Mantén para cargar un pan de plasma.',
    special: 'Toque: disparo chico. Carga máxima: perfora.',
    fireRate: 18, damage: 8, projectileSpeed: 4.5, projectileType: 'plasma_bread',
    spread: 0, projectileCount: 1, knockback: 2,
    piercing: false, bounces: 0, continuous: false, boomerang: false,
    cost: 26, rarity: 3, bars: { dmg: 4, rate: 2, range: 4, speed: 3 },
  },
  homing_crumbs: {
    id: 'homing_crumbs', name: 'PISTOLA DE MIGAS RASTREADORAS',
    description: 'Migas que se curvan hacia enemigos cercanos.',
    special: 'Daño bajo. Ayuda a aprender a apuntar.',
    fireRate: 10, damage: 4, projectileSpeed: 3.6, projectileType: 'homing_crumb',
    spread: .12, projectileCount: 1, knockback: .4,
    piercing: false, bounces: 0, continuous: false, boomerang: false,
    cost: 16, rarity: 1, bars: { dmg: 1, rate: 4, range: 3, speed: 3 },
  },
};

export interface ItemDef {
  id: string;
  name: string;
  description: string;
  passive: boolean;
  cost: number;
  rarity: number;
  /** texto cómico corto */
  flavor?: string;
  sprite?: string;
  category?: 'passive' | 'active';
  effect?: string;
  pickupBehavior?: 'equip-active' | 'apply-passive';
  role?:ItemRole;
  stackable?:boolean;
  cursed?:boolean;
}

export const ITEMS: Record<string, ItemDef> = {
  bread_helmet: {
    id: 'bread_helmet', name: 'CASCO DE PAN',
    description: '+1 de vida y menos daño al chocar', passive: true, cost: 10, rarity: 1,
  },
  lucky_feather: {
    id: 'lucky_feather', name: 'PLUMA DE LA SUERTE',
    description: 'Más críticos y mejores botines', passive: true, cost: 12, rarity: 2,
  },
  greasy_wings: {
    id: 'greasy_wings', name: 'ALAS GRASIENTAS',
    description: 'Te mueves más rápido y resbalas', passive: true, cost: 8, rarity: 1,
  },
  double_yolk: {
    id: 'double_yolk', name: 'DOBLE YEMA',
    description: 'Algunos disparos se duplican', passive: true, cost: 20, rarity: 2,
  },
  mother_duck: {
    id: 'mother_duck', name: 'MAMÁ PATA',
    description: 'Un patito te sigue y dispara', passive: true, cost: 25, rarity: 3,
  },
  bread_magnet: {
    id: 'bread_magnet', name: 'IMÁN DE PAN',
    description: 'Atrae las migas cercanas', passive: true, cost: 8, rarity: 1,
  },
  hot_sauce: {
    id: 'hot_sauce', name: 'SALSA PICANTE',
    description: 'Tus disparos queman y ralentizan', passive: true, cost: 15, rarity: 2,
  },
  butter: {
    id: 'butter', name: 'MANTEQUILLA',
    description: 'Los disparos rebotan una vez', passive: true, cost: 12, rarity: 2,
  },
  toaster: {
    id: 'toaster', name: 'TOSTADORA',
    description: 'Cada 5º disparo es tostada ardiente', passive: true, cost: 15, rarity: 2,
  },
  golden_beak: {
    id: 'golden_beak', name: 'PICO DORADO',
    description: 'Los enemigos sueltan más migas', passive: true, cost: 10, rarity: 1,
  },
  angry_goose_feather: {
    id: 'angry_goose_feather', name: 'PLUMA DE GANSO FURIOSO',
    description: '+30% daño, enemigos más rápidos', passive: true, cost: 18, rarity: 2,
  },
  pond_water: {
    id: 'pond_water', name: 'AGUA DE ESTANQUE',
    description: 'Deja charcos que ralentizan', passive: true, cost: 12, rarity: 1,
  },
  bread_crust: {
    id: 'bread_crust', name: 'CORTEZA DURA',
    description: '20% de bloquear el daño', passive: true, cost: 14, rarity: 2,
  },
  donut_bribe: {
    id: 'donut_bribe', name: 'SOBORNO DE DONUT',
    description: 'La policía tarda más en disparar', passive: true, cost: 16, rarity: 2,
  },
  smoke_feather: {
    id: 'smoke_feather', name: 'PLUMA DE HUMO',
    description: 'El esquive deja humo que confunde', passive: true, cost: 14, rarity: 2,
  },
  vault_map: {
    id: 'vault_map', name: 'PLANO DE LA BÓVEDA',
    description: 'Revela todo el mapa del piso', passive: true, cost: 18, rarity: 3,
  },
  wide_belt: {
    id: 'wide_belt', name: 'CINTURÓN ANCHO',
    description: 'Más migajas por enemigo y esquive más frecuente', passive: true, cost: 16, rarity: 2,
  },
};

export const ACTIVE_ITEMS: Record<string, ItemDef> = {
  emergency_quack: {
    id: 'emergency_quack', name: 'CUAC DE EMERGENCIA',
    description: 'Onda expansiva que empuja', passive: false, cost: 15, rarity: 2,
  },
  bread_bomb: {
    id: 'bread_bomb', name: 'BOMBA DE PAN',
    description: 'Suelta una hogaza explosiva', passive: false, cost: 12, rarity: 1,
  },
  duck_decoy: {
    id: 'duck_decoy', name: 'SEÑUELO DE PATO',
    description: 'Un patito falso atrae a la poli', passive: false, cost: 10, rarity: 1,
  },
};

export type EnemyBehavior =
  | 'chaser' | 'shooter' | 'turret' | 'roller' | 'chaser_shooter'
  | 'shielded' | 'shotgunner' | 'swarmer' | 'drone' | 'sniper' | 'medic' | 'captain' | 'k9' | 'camera'
  | 'grenadier' | 'baton' | 'atm' | 'mobileCam';

export interface EnemyDef {
  id: string;
  name: string;
  hp: number;
  speed: number;
  damage: number;
  behavior: EnemyBehavior;
  fireRate: number;
  projectileType: string;
  size: number;
  score: number;
  flying?: boolean;
  minFloor: number;
  threat: number;
}

export const ENEMIES: Record<string, EnemyDef> = {
  policia_francotirador:{id:'policia_francotirador',name:'POLICÍA FRANCOTIRADOR',hp:34,speed:.65,damage:2,behavior:'sniper',fireRate:180,projectileType:'drone_shot',size:18,score:26,minFloor:2,threat:3},
  policia_medico:{id:'policia_medico',name:'POLICÍA MÉDICO',hp:26,speed:1,damage:1,behavior:'medic',fireRate:180,projectileType:'pistol',size:16,score:20,minFloor:2,threat:2},
  policia_capitan:{id:'policia_capitan',name:'CAPITÁN DE PATRULLA',hp:44,speed:.85,damage:1,behavior:'captain',fireRate:110,projectileType:'pistol',size:20,score:30,minFloor:3,threat:3},
  ganso_k9:{id:'ganso_k9',name:'UNIDAD K9: GANSO',hp:40,speed:1.15,damage:1,behavior:'k9',fireRate:0,projectileType:'',size:20,score:25,minFloor:2,threat:3},
  security_camera:{id:'security_camera',name:'CÁMARA DE SEGURIDAD',hp:18,speed:0,damage:0,behavior:'camera',fireRate:0,projectileType:'',size:18,score:8,minFloor:1,threat:1},
  policia_pato: {
    id: 'policia_pato', name: 'POLICÍA PATO',
    hp: 24, speed: 1.15, damage: 1, behavior: 'chaser_shooter', fireRate: 95,
    projectileType: 'pistol', size: 16, score: 12, minFloor: 0, threat: 1,
  },
  policia_rapido: {
    id: 'policia_rapido', name: 'POLICÍA RÁPIDO',
    hp: 16, speed: 2.3, damage: 1, behavior: 'swarmer', fireRate: 0,
    projectileType: '', size: 14, score: 10, minFloor: 0, threat: 1,
  },
  policia_escopeta: {
    id: 'policia_escopeta', name: 'POLICÍA ESCOPETA',
    hp: 30, speed: 0.9, damage: 1, behavior: 'shotgunner', fireRate: 130,
    projectileType: 'buckshot', size: 18, score: 18, minFloor: 0, threat: 2,
  },
  dron_policial: {
    id: 'dron_policial', name: 'DRON POLICIAL',
    hp: 18, speed: 1.5, damage: 1, behavior: 'drone', fireRate: 105,
    projectileType: 'drone_shot', size: 16, score: 16, flying: true, minFloor: 1, threat: 2,
  },
  policia_antidisturbios: {
    id: 'policia_antidisturbios', name: 'POLICÍA ANTIDISTURBIOS',
    hp: 55, speed: 0.7, damage: 1, behavior: 'shielded', fireRate: 0,
    projectileType: '', size: 22, score: 30, minFloor: 1, threat: 3,
  },
  security_pigeon: {
    id: 'security_pigeon', name: 'PALOMA DE SEGURIDAD',
    hp: 20, speed: 1, damage: 1, behavior: 'shooter', fireRate: 80,
    projectileType: 'coin_proj', size: 16, score: 10, minFloor: 0, threat: 1,
  },
  guard_goose: {
    id: 'guard_goose', name: 'GANSO GUARDIA',
    hp: 35, speed: 1.8, damage: 1, behavior: 'chaser', fireRate: 0,
    projectileType: '', size: 20, score: 15, minFloor: 0, threat: 2,
  },
  toaster_turret: {
    id: 'toaster_turret', name: 'TORRETA TOSTADORA',
    hp: 25, speed: 0, damage: 1, behavior: 'turret', fireRate: 50,
    projectileType: 'toast', size: 18, score: 12, minFloor: 1, threat: 2,
  },
  rolling_bagel: {
    id: 'rolling_bagel', name: 'ROSQUILLA RODANTE',
    hp: 15, speed: 2.5, damage: 1, behavior: 'roller', fireRate: 0,
    projectileType: '', size: 14, score: 8, minFloor: 0, threat: 1,
  },
  evil_croissant: {
    id: 'evil_croissant', name: 'CUERNITO MALVADO',
    hp: 18, speed: 1.5, damage: 1, behavior: 'swarmer', fireRate: 0,
    projectileType: '', size: 14, score: 10, minFloor: 1, threat: 1,
  },
  banker_chicken: {
    id: 'banker_chicken', name: 'GALLINA BANQUERA',
    hp: 30, speed: 0.8, damage: 1, behavior: 'shooter', fireRate: 70,
    projectileType: 'coin_proj', size: 18, score: 18, minFloor: 2, threat: 2,
  },
  policia_granadero: {
    id: 'policia_granadero', name: 'POLICÍA GRANADERO',
    hp: 32, speed: .85, damage: 1, behavior: 'grenadier', fireRate: 150,
    projectileType: 'dough_ball', size: 18, score: 22, minFloor: 2, threat: 3,
  },
  policia_porra: {
    id: 'policia_porra', name: 'POLICÍA CON PORRA',
    hp: 28, speed: 1.45, damage: 1, behavior: 'baton', fireRate: 0,
    projectileType: '', size: 16, score: 16, minFloor: 1, threat: 2,
  },
  torreta_banco: {
    id: 'torreta_banco', name: 'TORRETA DEL BANCO',
    hp: 36, speed: 0, damage: 1, behavior: 'turret', fireRate: 70,
    projectileType: 'drone_shot', size: 20, score: 18, minFloor: 3, threat: 3,
  },
  robot_cajero: {
    id: 'robot_cajero', name: 'ROBOT CAJERO',
    hp: 48, speed: .45, damage: 1, behavior: 'atm', fireRate: 90,
    projectileType: 'coin_proj', size: 22, score: 28, minFloor: 3, threat: 3,
  },
  camara_movil: {
    id: 'camara_movil', name: 'CÁMARA MÓVIL',
    hp: 20, speed: .9, damage: 0, behavior: 'mobileCam', fireRate: 0,
    projectileType: '', size: 16, score: 12, minFloor: 1, threat: 2,
  },
};

/** Qué puede volverse élite (y qué cambia al serlo) */
export const ELITE_OK: Record<string, string> = {
  policia_pato: 'Dispara más preciso y rápido',
  policia_escopeta: 'Dos ráfagas seguidas',
  policia_antidisturbios: 'Escudo más grande y embestidas dobles',
  dron_policial: 'Ráfagas en abanico',
  guard_goose: 'Carga más larga',
  security_pigeon: 'Tres monedas por salva',
  policia_granadero: 'La granada se parte en dos',
  policia_porra: 'Embiste dos veces',
  robot_cajero: 'Lanza más monedas',
  policia_francotirador: 'La mira se traba más rápido',
  policia_medico: 'Cura con un escudo breve',
};

export interface Encounter { enemies: string[]; minFloor: number; }

export const ENCOUNTERS: Encounter[] = [
  {enemies:['policia_francotirador','policia_pato','policia_rapido'],minFloor:2},
  {enemies:['policia_medico','policia_pato','guard_goose'],minFloor:2},
  {enemies:['ganso_k9','policia_escopeta','policia_pato'],minFloor:2},
  {enemies:['policia_capitan','policia_pato','policia_rapido'],minFloor:3},
  { enemies: ['policia_pato', 'policia_pato', 'policia_pato'], minFloor: 0 },
  { enemies: ['policia_pato', 'policia_pato', 'policia_escopeta'], minFloor: 0 },
  { enemies: ['policia_rapido', 'policia_rapido', 'policia_rapido', 'policia_pato'], minFloor: 0 },
  { enemies: ['security_pigeon', 'security_pigeon', 'policia_pato'], minFloor: 0 },
  { enemies: ['guard_goose', 'policia_rapido', 'policia_rapido'], minFloor: 0 },
  { enemies: ['rolling_bagel', 'rolling_bagel', 'policia_pato'], minFloor: 0 },
  { enemies: ['policia_antidisturbios', 'policia_rapido', 'policia_rapido'], minFloor: 1 },
  { enemies: ['dron_policial', 'dron_policial', 'policia_pato', 'policia_pato'], minFloor: 1 },
  { enemies: ['policia_escopeta', 'policia_escopeta', 'toaster_turret'], minFloor: 1 },
  { enemies: ['policia_antidisturbios', 'policia_escopeta', 'policia_pato'], minFloor: 1 },
  { enemies: ['dron_policial', 'policia_antidisturbios', 'policia_rapido'], minFloor: 2 },
  { enemies: ['banker_chicken', 'policia_escopeta', 'dron_policial', 'policia_pato'], minFloor: 2 },
  { enemies: ['policia_antidisturbios', 'policia_antidisturbios', 'dron_policial'], minFloor: 2 },
  { enemies: ['evil_croissant', 'evil_croissant', 'policia_rapido', 'policia_pato'], minFloor: 2 },
  { enemies: ['dron_policial', 'dron_policial', 'policia_escopeta', 'policia_antidisturbios'], minFloor: 3 },
  { enemies: ['policia_antidisturbios', 'policia_escopeta', 'policia_escopeta', 'policia_rapido'], minFloor: 3 },
];

export interface BossDef {
  id: string; name: string; subtitle: string;
  hp: number; speed: number; size: number; phases: number;
}

export const BOSSES: Record<string, BossDef> = {
  captain_honk: {
    id: 'captain_honk', name: 'CAPITÁN HONK',
    subtitle: 'Jefe de seguridad del banco',
    hp: 200, speed: 1.5, size: 32, phases: 3,
  },
  comisario_pico_duro: {
    id: 'comisario_pico_duro', name: 'COMISARIO PICO DURO',
    subtitle: 'Ordena formaciones y cubre el vestíbulo',
    hp: 220, speed: 1.35, size: 32, phases: 2,
  },
  toaster_9000: {
    id: 'toaster_9000', name: 'LA TOSTADORA 9000',
    subtitle: 'Electrodoméstico poseído',
    hp: 260, speed: 0.8, size: 40, phases: 3,
  },
  general_ganso: {
    id: 'general_ganso', name: 'GENERAL GANSO',
    subtitle: 'Armadura de ganso. Después corre más',
    hp: 300, speed: 1.1, size: 36, phases: 2,
  },
  don_levadura: {
    id: 'don_levadura', name: 'DON LEVADURA',
    subtitle: 'Masa mutante de la panadería',
    hp: 280, speed: 1, size: 36, phases: 2,
  },
  director_seguridad: {
    id: 'director_seguridad', name: 'DIRECTOR DE SEGURIDAD',
    subtitle: 'Láseres, drones y barreras',
    hp: 320, speed: .95, size: 38, phases: 2,
  },
  bread_banker: {
    id: 'bread_banker', name: 'EL BANQUERO DEL PAN',
    subtitle: 'Amo y señor de todo el pan',
    hp: 380, speed: 1.2, size: 40, phases: 3,
  },
};

export const MINIBOSSES: Record<string, BossDef> = {
  tax_collector: {
    id: 'tax_collector', name: 'EL RECAUDADOR',
    subtitle: 'Un ganso furioso con traje',
    hp: 100, speed: 1.8, size: 24, phases: 1,
  },
  head_baker: {
    id: 'head_baker', name: 'EL PANADERO JEFE',
    subtitle: 'Maestro de la masa explosiva',
    hp: 120, speed: 1.2, size: 24, phases: 1,
  },
  sargento_migajas: {
    id: 'sargento_migajas', name: 'SARGENTO MIGAJAS',
    subtitle: 'Escopeta, carga corta y dos refuerzos',
    hp: 110, speed: 1.3, size: 26, phases: 1,
  },
  el_auditor: {
    id: 'el_auditor', name: 'EL AUDITOR',
    subtitle: 'Gallina con maletines explosivos',
    hp: 115, speed: 1.1, size: 26, phases: 1,
  },
  ganso_antidisturbios: {
    id: 'ganso_antidisturbios', name: 'GANSO ANTIDISTURBIOS',
    subtitle: 'Escudo frontal y golpe de choque',
    hp: 140, speed: .9, size: 28, phases: 1,
  },
  dron_centinela: {
    id: 'dron_centinela', name: 'DRON CENTINELA',
    subtitle: 'Patrones giratorios y drones chicos',
    hp: 125, speed: 1.4, size: 26, phases: 1, 
  },
  panadero_loco: {
    id: 'panadero_loco', name: 'EL PANADERO LOCO',
    subtitle: 'Bombas de masa y zonas de horno',
    hp: 130, speed: 1.15, size: 26, phases: 1,
  },
  cajero_3000: {
    id: 'cajero_3000', name: 'CAJERO 3000',
    subtitle: 'Monedas, láser y botín extra',
    hp: 150, speed: .7, size: 30, phases: 1,
  },
};

/** Each floor still has exactly one boss; the pool only chooses which one. */
export const FLOOR_BOSS_POOL: string[][] = [
  ['captain_honk', 'comisario_pico_duro'],
  ['captain_honk', 'toaster_9000'],
  ['toaster_9000', 'don_levadura'],
  ['don_levadura', 'general_ganso'],
  ['director_seguridad', 'general_ganso'],
  ['bread_banker'],
];
export const FLOOR_MINIBOSS_POOL: string[][] = [
  ['sargento_migajas', 'tax_collector'],
  ['el_auditor', 'sargento_migajas'],
  ['ganso_antidisturbios', 'panadero_loco'],
  ['dron_centinela', 'panadero_loco'],
  ['cajero_3000', 'dron_centinela'],
  ['cajero_3000', 'ganso_antidisturbios'],
];

export interface DuckCharacter {
  id: string; name: string; description: string;
  hp: number; speed: number; damageMultiplier: number;
  startingWeapon: string; unlockCost: number;
}

export const DUCKS: DuckCharacter[] = [
  {
    id: 'robber_duck', name: 'PATO LADRÓN', description: 'Equilibrado',
    hp: 5, speed: 1, damageMultiplier: 1, startingWeapon: 'quack_blaster', unlockCost: 0,
  },
];

export interface MetaUpgrade {
  id: string; name: string; description: string; cost: number; maxLevel: number;
}

export const META_UPGRADES: MetaUpgrade[] = [
  { id: 'hp', name: 'PANADERÍA PROPIA', description: '+1 corazón de vida inicial', cost: 20, maxLevel: 3 },
  { id: 'damage', name: 'PICO AFILADO', description: '+10% de daño', cost: 25, maxLevel: 3 },
  { id: 'crumbs', name: 'BOLSILLOS HONDOS', description: 'Empiezas con 15 migas', cost: 15, maxLevel: 2 },
  { id: 'dash', name: 'PATAS ENGRASADAS', description: 'Esquive más frecuente', cost: 20, maxLevel: 2 },
];

// ---------------------------------------------------------------------------
// SABOR (textos cómicos cortos para armas y objetos)
// ---------------------------------------------------------------------------
export const FLAVOR: Record<string, string> = {
  // armas
  quack_blaster: 'Cuantos más cuacs, mejor.',
  breadcrumb_shotgun: 'Limpia pasillos y mesas por igual.',
  feather_gun: 'Un poco de pluma nunca lastimó... mentira.',
  bread_boomerang: 'Siempre vuelve. Como las deudas.',
  rubber_duck_cannon: 'Ingeniería militar aplicada correctamente.',
  baguette_launcher: 'Un arma de destrucción y de desayuno.',
  quack_laser: 'Un cuac continuo viola varias normas bancarias.',
  golden_egg_revolver: 'Huele a huevo y a juicio pendiente.',
  // objetos pasivos existentes
  bread_helmet: 'No es elegante, pero amortigua.',
  lucky_feather: 'Le robó la suerte a alguien.',
  greasy_wings: 'Más rápido que el gerente en quiebra.',
  double_yolk: 'Dos yemas. Cero preguntas.',
  mother_duck: 'Nadie se mete con su cría.',
  bread_magnet: 'Hasta el dinero tiene hambre.',
  hot_sauce: 'Legalmente sigue siendo condimento.',
  butter: 'Resbaladizo y un poco indigno.',
  toaster: 'El desayuno de la venganza.',
  golden_beak: 'Brilla. Como un robo bien hecho.',
  angry_goose_feather: 'Alguien está de muy mal humor.',
  pond_water: 'Mojado. Resbaladizo. Eficaz.',
  bread_crust: 'Lo duro también sirve.',
  donut_bribe: 'La corrupción tiene agujero.',
  smoke_feather: 'Si no te ven, no te atraparon.',
  vault_map: 'Sacado de un cajón sin candado.',
  wide_belt: 'Espacio para más botín.',
  // objetos activos existentes
  emergency_quack: 'Un cuac que se escucha hasta en la cárcel.',
  bread_bomb: 'La hogaza de la discordia.',
  duck_decoy: 'Un compañero de goma muy leal.',
};

// ---------------------------------------------------------------------------
// NUEVOS OBJETOS PASIVOS
// ---------------------------------------------------------------------------
const NEW_PASSIVE: Record<string, ItemDef> = {
  magnetic_crumbs: {
    id: 'magnetic_crumbs', name: 'MIGAS MAGNÉTICAS',
    description: 'Las migas vuelan hacia ti desde mucho más lejos',
    passive: true, cost: 10, rarity: 1, flavor: 'El dinero hambriento viaja solo.',
  },
  soapy_feet: {
    id: 'soapy_feet', name: 'PATAS ENJABONADAS',
    description: '+15% velocidad de movimiento y esquive más largo',
    passive: true, cost: 8, rarity: 1, flavor: 'Seguridad recomendó el letrero de piso mojado.',
  },
  garlic_bread: {
    id: 'garlic_bread', name: 'PAN DE AJO',
    description: 'Los enemigos cercanos reciben daño cada segundo',
    passive: true, cost: 18, rarity: 2, flavor: 'Excelente contra policías y citas románticas.',
  },
  steel_feathers: {
    id: 'steel_feathers', name: 'PLUMAS DE ACERO',
    description: 'Tus proyectiles atraviesan +1 enemigo',
    passive: true, cost: 16, rarity: 2, flavor: 'Plumas que no perdonan.',
  },
  gas_coffee: {
    id: 'gas_coffee', name: 'CAFÉ DE GASOLINERA',
    description: '+20% de cadencia, -5% de precisión',
    passive: true, cost: 14, rarity: 2, flavor: 'No dormiste. Tampoco importa.',
  },
  tactical_mayo: {
    id: 'tactical_mayo', name: 'MAYONESA TÁCTICA',
    description: 'Los enemigos que golpeas se mueven un 15% más lento',
    passive: true, cost: 12, rarity: 1, flavor: 'Aderezo de uso táctico.',
  },
  eggshell: {
    id: 'eggshell', name: 'CÁSCARA DE HUEVO',
    description: 'Escudo que absorbe 1 golpe al entrar en cada piso',
    passive: true, cost: 18, rarity: 2, flavor: 'Frágil, pero un golpe te salva.',
  },
  debt: {
    id: 'debt', name: 'CUENTA PENDIENTE',
    description: '+1% de daño por cada 10 migas (máximo +30%)',
    passive: true, cost: 22, rarity: 3, flavor: 'El interés compuesto es un arma.',
  },
  cardboard_vest: {
    id: 'cardboard_vest', name: 'CHALECO DE CARTÓN',
    description: 'Probabilidad de anular un proyectil enemigo',
    passive: true, cost: 10, rarity: 1, flavor: 'Pasó dos de tres pruebas.',
  },
  stolen_map: {
    id: 'stolen_map', name: 'MAPA ROBADO',
    description: 'Revela una sala vecina más en el minimapa',
    passive: true, cost: 9, rarity: 1, flavor: 'Un callejón menos por explorar.',
  },
  monocle: {
    id: 'monocle', name: 'MONÓCULO SOSPECHOSO',
    description: 'Aparecen más objetos raros en el botín',
    passive: true, cost: 20, rarity: 3, flavor: 'Te hace ver las cosas raras.',
  },
  broken_alarm: {
    id: 'broken_alarm', name: 'ALARMA ROTA',
    description: 'Las salas despejadas dan mejores recompensas',
    passive: true, cost: 15, rarity: 2, flavor: 'Nadie oirá tus triunfos.',
  },
};

// ---------------------------------------------------------------------------
// NUEVOS OBJETOS ACTIVOS
// ---------------------------------------------------------------------------
const NEW_ACTIVE: Record<string, ItemDef> = {
  false_alarm: {
    id: 'false_alarm', name: 'ALARMA FALSA',
    description: 'Aturde a todos los enemigos unos segundos',
    passive: false, cost: 14, rarity: 2, flavor: 'Pánico enlatado.',
  },
  coffee_machine: {
    id: 'coffee_machine', name: 'CAFETERA INDUSTRIAL',
    description: 'Dobla tu cadencia de disparo durante 6 segundos',
    passive: false, cost: 16, rarity: 2, flavor: 'Cafeína industrial de contrabando.',
  },
  holy_crumb: {
    id: 'holy_crumb', name: 'MIGA SAGRADA',
    description: 'Recupera 2 corazones. Tiempo de recarga largo',
    passive: false, cost: 18, rarity: 2, flavor: 'Un milagro en miniatura.',
  },
  megaphone: {
    id: 'megaphone', name: 'MEGÁFONO CUAC',
    description: 'Onda cuac que daña y empuja a todos los enemigos',
    passive: false, cost: 16, rarity: 3, flavor: 'CUAC. En mayúsculas.',
  },
};

Object.assign(ITEMS, NEW_PASSIVE);
Object.assign(ACTIVE_ITEMS, NEW_ACTIVE);

for (const [id, name, description, rarity, flavor] of NEW_PASSIVE_ITEMS) {
  ITEMS[id] = { id, name, description, rarity, flavor, passive:true, cost:10 + rarity * 6 };
}
for (const [id, name, description, rarity, flavor] of NEW_ACTIVE_ITEMS) {
  ACTIVE_ITEMS[id] = { id, name, description, rarity, flavor, passive:false, cost:12 + rarity * 6 };
}
for(const item of EXPANSION_ITEMS) {
  ITEMS[item.id]={id:item.id,name:item.name,description:item.description,flavor:item.flavor,
    rarity:item.rarity,cost:12+item.rarity*7,passive:true,role:item.role,cursed:item.cursed,stackable:false};
}
const preciseEffects: Record<string,string> = {
  bread_helmet:'+1 corazón máximo. Bloquea el primer golpe de cada piso.',
  lucky_feather:'+15% crítico; más botín raro.', greasy_wings:'+30% velocidad de movimiento.',
  double_yolk:'20% de duplicar cada proyectil.', mother_duck:'Un patito dispara 3 de daño cada 0.55 s.',
  bread_magnet:'Atrae monedas en un radio de 84 píxeles.', hot_sauce:'Los disparos queman durante 3 s.',
  butter:'+1 rebote de pared; los patitos ganan 2 más.', toaster:'Cada quinto disparo hace +50% daño y quema.',
  golden_beak:'10% de soltar 2 migajas extra.', angry_goose_feather:'+30% daño; enemigos +15% velocidad.',
  pond_water:'Las bajas dejan charcos que ralentizan un 50%.', bread_crust:'20% de bloquear un golpe.',
  donut_bribe:'Los enemigos tardan un 50% más en recargar.', smoke_feather:'El esquive deja humo: -35% velocidad enemiga, 2 s.',
  wide_belt:'+1 migaja por baja; -20% tiempo de recarga del esquive.',
  garlic_bread:'Aura: 3 de daño por segundo a enemigos cercanos.', steel_feathers:'Los disparos atraviesan 1 enemigo más.',
  gas_coffee:'+20% cadencia; +5% dispersión.', tactical_mayo:'Los impactos ralentizan un 15% durante 2 s.',
  eggshell:'Absorbe un golpe de cualquier tipo por piso.', cardboard_vest:'12% de bloquear un proyectil.',
  monocle:'+20% de probabilidad de botín raro.', broken_alarm:'+8% recompensa al despejar salas normales.',
  false_alarm:'Aturde a todos los enemigos durante 2.5 s.', emergency_quack:'Empuja enemigos y elimina balas cercanas.',
  bread_bomb:'Explosión cercana: 30 de daño.', duck_decoy:'Atrae enemigos hacia un patito durante 6 s.',
  coffee_machine:'Duplica la cadencia de disparo durante 6 s.', holy_crumb:'Recupera 2 corazones. Tiempo de recarga: 40 s.',
  megaphone:'Una onda hace 15 de daño y empuja toda la sala.',
};
for (const item of [...Object.values(ITEMS), ...Object.values(ACTIVE_ITEMS)]) {
  item.description = preciseEffects[item.id] ?? item.description;
  item.flavor ??= FLAVOR[item.id] ?? 'El gerente no autorizó esto.';
  item.sprite = item.id;
  item.category = item.passive ? 'passive' : 'active';
  item.effect = item.passive ? (PASSIVE_RULES[item.id] ? item.id : '') : (ACTIVE_RULES[item.id]?.action ?? '');
  item.pickupBehavior = item.passive ? 'apply-passive' : 'equip-active';
  item.stackable=false;
  const rule=PASSIVE_RULES[item.id];
  item.role ??= rule && (rule.damage||rule.damageScale||rule.fireRate||rule.penetration||rule.companion||rule.aura)?'offense':
    rule && (rule.maxHearts||rule.block||rule.floorShield||rule.slow||rule.roomShield)?'defense':'utility';
}

// ---------------------------------------------------------------------------
// SINERGIAS
// ---------------------------------------------------------------------------
export interface SynergyDef {
  id: string; name: string; requires: string[]; flavor: string;
}

export const SYNERGIES: SynergyDef[] = [
  { id: 'infernal_bread', name: 'PAN INFERNAL', requires: ['hot_sauce', 'baguette_launcher'], flavor: 'Baguettes en llamas y zonas de fuego.' },
  { id: 'twin_yolk', name: 'YEMA GEMELA', requires: ['double_yolk', 'golden_egg_revolver'], flavor: 'Doble disparo dorado.' },
  { id: 'garlic_duckling', name: 'GUARDIA AJERO', requires: ['garlic_bread', 'mother_duck'], flavor: 'El patito esparce el aura de ajo.' },
  { id: 'magnet_beak', name: 'IMÁN DORADO', requires: ['magnetic_crumbs', 'golden_beak'], flavor: 'Más migas y vuelan directas hacia ti.' },
  { id: 'steel_storm', name: 'TORMENTA DE ACERO', requires: ['steel_feathers', 'feather_gun'], flavor: 'Las plumas atraviesan multitudes.' },
  { id: 'rubber_butter', name: 'PATITOS SIN FRENO', requires: ['industrial_butter', 'rubber_duck_cannon'], flavor: 'Tres rebotes adicionales.' },
  { id: 'wet_laser', name: 'CUAC ACUÁTICO', requires: ['wet_bread', 'quack_laser'], flavor: 'El rayo ralentiza sin pausa.' },
  { id: 'hot_quack', name: 'GARGANTA DE FUEGO', requires: ['ultra_quack', 'hot_sauce'], flavor: 'La onda CUAC incendia enemigos.' },
  { id: 'twin_companion', name: 'CÓMPLICE DOBLE', requires: ['pocket_duck', 'double_yolk'], flavor: 'El patito también duplica disparos.' },
  { id: 'phantom_dash', name: 'FUGA FANTASMA', requires: ['turbo_feather', 'ghost_feather'], flavor: 'Más distancia y salida invulnerable.' },
  { id: 'nuclear_bread', name: 'PAN NUCLEAR', requires: ['uranium_bread', 'baguette_launcher'], flavor: 'Explosiones radiactivas más grandes.' },
  {id:'coffee_feathers',name:'CAFÉ CON PLUMAS',requires:['oxxo_coffee','feather_gun'],flavor:'La ametralladora gana 30% de cadencia adicional.'},
  {id:'steel_ghost',name:'ARROLLADOR',requires:['steel_wings','ghost_feather'],flavor:'El esquive causa 24 de daño al atravesar enemigos.'},
  {id:'sticky_quack',name:'CUAC PEGAJOSO',requires:['sticky_honey','quack_laser'],flavor:'El láser acumula el doble de lentitud.'},
  {id:'french_inferno',name:'PAN FRANCÉS INFERNAL',requires:['burnt_bread','baguette_launcher'],flavor:'Todas las baguettes dejan fuego al explotar.'},
  {id:'duck_gang',name:'PANDILLA DE PATOS',requires:['bodyguard_duck','pocket_duck'],flavor:'Los compañeros disparan más rápido; el guardaespaldas también dispara.'},
  {id:'duck_rain',name:'LLUVIA DE PATITOS',requires:['double_yolk','rubber_duck_cannon'],flavor:'Los patitos duplicados ganan un rebote.'},
];

// ---------------------------------------------------------------------------
// ASPECTOS (SKINS) — puramente cosméticos
// ---------------------------------------------------------------------------
export interface DuckPalette {
  body: string; dark: string; shade: string; beak: string; beakDark: string;
  mask: string; pack: string; strap: string;
}

export type SkinOverlay =
  | 'none' | 'fedora' | 'prison' | 'chef' | 'executive'
  | 'ninja' | 'undercover' | 'pirate' | 'gold' | 'king';

export interface DuckSkin {
  id: string; name: string; description: string; cost: number;
  palette: DuckPalette; overlay: SkinOverlay;
}

export const DEFAULT_PALETTE: DuckPalette = {
  body: '#f9e547', dark: '#e0c31c', shade: '#c9ae13',
  beak: '#f0912b', beakDark: '#cf6f14', mask: '#15151f', pack: '#3b2f2a', strap: '#2a211d',
};

export const SKINS: DuckSkin[] = [
  {
    id: 'robber', name: 'PATO LADRÓN',
    description: 'El clásico. Amarillo, sospechoso y sorprendentemente profesional.',
    cost: 0, palette: DEFAULT_PALETTE, overlay: 'none',
  },
  {
    id: 'gangster', name: 'PATO GÁNSTER',
    description: 'Traje negro, fedora y cadena de oro.',
    cost: 200, palette: { ...DEFAULT_PALETTE, body: '#2c2c36', dark: '#23232c', shade: '#1b1b22', pack: '#111118' }, overlay: 'fedora',
  },
  {
    id: 'prisoner', name: 'PATO PRESIDIARIO',
    description: 'Mono naranja a rayas.',
    cost: 150, palette: { ...DEFAULT_PALETTE, body: '#f0912b', dark: '#e07f1e', shade: '#c96f14', pack: '#8a4c10' }, overlay: 'prison',
  },
  {
    id: 'baker', name: 'PATO PANADERO',
    description: 'Gorro de chef y delantal blanco.',
    cost: 120, palette: { ...DEFAULT_PALETTE, mask: '#f9e547' }, overlay: 'chef',
  },
  {
    id: 'executive', name: 'PATO EJECUTIVO',
    description: 'Traje oscuro, corbata y maletín.',
    cost: 250, palette: { ...DEFAULT_PALETTE, body: '#3a3f52', dark: '#2f3342', shade: '#262a36', pack: '#15161c' }, overlay: 'executive',
  },
  {
    id: 'pink', name: 'PATO ROSA',
    description: 'Plumas rosas con antifaz negro.',
    cost: 150, palette: { ...DEFAULT_PALETTE, body: '#ff8fb3', dark: '#f07ba3', shade: '#d96a92' }, overlay: 'none',
  },
  {
    id: 'ninja', name: 'PATO NINJA',
    description: 'Capucha oscura y cinta roja.',
    cost: 300, palette: { ...DEFAULT_PALETTE, body: '#242730', dark: '#1b1d24', shade: '#13151a', pack: '#15151f' }, overlay: 'ninja',
  },
  {
    id: 'undercover', name: 'PATO POLICÍA INFILTRADO',
    description: 'Absolutamente nadie sospechará.',
    cost: 275, palette: { ...DEFAULT_PALETTE, body: '#2b4a8b', dark: '#1b2f5c', shade: '#152445' }, overlay: 'undercover',
  },
  {
    id: 'pirate', name: 'PATO PIRATA',
    description: 'Busca el pan enterrado.',
    cost: 225, palette: { ...DEFAULT_PALETTE, body: '#4a3b32', dark: '#3b2f28', shade: '#2e241f', pack: '#201814' }, overlay: 'pirate',
  },
  {
    id: 'golden', name: 'PATO DORADO',
    description: 'El crimen nunca había brillado tanto.',
    cost: 500, palette: { ...DEFAULT_PALETTE, body: '#ffd95e', dark: '#f0c33c', shade: '#d4a81f', beak: '#ffb73d', beakDark: '#d08a12', pack: '#5a4515' }, overlay: 'gold',
  },
  {
    id: 'king', name: 'PATO REY DEL PAN',
    description: 'Gobierna sobre todas las migajas.',
    cost: 750, palette: { ...DEFAULT_PALETTE, body: '#fff3b0', dark: '#f4d03f', shade: '#d4a81f', pack: '#7a1f28' }, overlay: 'king',
  },
];

export function getSkin(id: string): DuckSkin {
  return SKINS.find(s => s.id === id) ?? SKINS[0];
}

/** Pisos totales de una run (el último es la Cámara del Pan Dorado) */
export const TOTAL_FLOORS = 6;
