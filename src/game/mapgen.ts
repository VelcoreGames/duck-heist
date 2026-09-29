// Generador procedural de mapas por rejilla (grid graph)
// Cada sala ocupa una celda (gx, gy). Las puertas se derivan de la adyacencia,
// por lo que SIEMPRE son bidireccionales y consistentes.

import {
  ROOM_WIDTH, ROOM_HEIGHT, RoomType,
  DIRS, DIR_VECTORS, DOOR_TILE, OPPOSITE,
  TILE_FLOOR, TILE_WALL, OBSTACLE_BASE, OBSTACLES_PER_FLOOR,
  type Dir,
} from './constants';
import { seededRandom, gameRandom } from './random';

export function key(gx: number, gy: number): string { return `${gx},${gy}`; }

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(gameRandom() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface MapRoom {
  gx: number;
  gy: number;
  type: RoomType;
  /** direcciones con puerta -> siempre existe la sala vecina */
  doors: Dir[];
  /** estado persistente durante la run */
  visited: boolean;
  cleared: boolean;
  generated: boolean; // contenido ya instanciado
  layout: number[][];
  distance: number;   // distancia BFS desde el inicio
  floorIndex?:number;
  revealed?:boolean;
  modifier?:'blackout'|'alarm'|'waxed'|'cameras'|'openVault';
  template?:string;
  /** Puerta especial pagada durante esta run. */
  keyUnlocked?:boolean;
}

export interface GameMap {
  rooms: Map<string, MapRoom>;
  startKey: string;
  itemRoomKey: string;
  bossKey: string;
  floorIndex: number;
}

/** START sólo puede conectar directamente con salas COMBAT. */
const START_FORBIDDEN_TYPES = new Set<RoomType>([
  RoomType.ITEM,
  RoomType.TREASURE,
  RoomType.SHOP,
  RoomType.GUN_VAN,
  RoomType.CHALLENGE,
  RoomType.MINIBOSS,
  RoomType.SUBBOSS,
  RoomType.BOSS,
  RoomType.SECRET,
  RoomType.EVENT,
  RoomType.CHOICE,
]);

/** Salas laterales: una sola puerta y regreso por el mismo sitio. */
const LEAF_ONLY_TYPES = new Set<RoomType>([
  RoomType.TREASURE,
  RoomType.SHOP,
  RoomType.GUN_VAN,
  RoomType.CHALLENGE,
  RoomType.SECRET,
  RoomType.CHOICE,
]);

/**
 * Genera un mapa válido:
 *  - Sala inicial en (0,0)
 *  - START puede conectar en cualquier dirección, incluida la izquierda
 *  - Toda sala conectada directamente con START debe ser COMBAT
 *  - Crecimiento aleatorio con ramificaciones y callejones sin salida
 *  - Una Sala de Objetos distribuida dentro del mapa; 12% de probabilidad de una segunda
 *  - Todas las salas alcanzables (por construcción: cada sala nace de una existente)
 *  - Jefe en la sala más lejana; minijefe en otra rama lejana
 */
export function generateMap(floorIndex: number,seed?:string): GameMap {
  const random=seed?seededRandom(`${seed}:${floorIndex}`):Math.random;
  const rInt=(min:number,max:number)=>Math.floor(random()*(max-min+1))+min;
  const pick=<T,>(a:T[])=>a[Math.floor(random()*a.length)];
  const rooms = new Map<string, MapRoom>();

  const makeRoom = (gx: number, gy: number, type: RoomType): MapRoom => {
    const r: MapRoom = {
      gx, gy, type, doors: [],
      visited: false, cleared: false, generated: false,
      layout: [], distance: 0,
      floorIndex,
      keyUnlocked:false,
    };
    rooms.set(key(gx, gy), r);
    return r;
  };

  // 1) Sala inicial
  makeRoom(0, 0, RoomType.START);

  // 2) Crecimiento procedural
  // La Sala de Objetos ya no ocupa una posición fija: se asigna después,
  // junto con el resto de salas especiales.
  // inicio + combate + tienda/tesoro/desafío/minijefe/subjefe/jefe
  const targetRooms = rInt(14, 19);
  const maxRadius = 4;
  let guard = 0;

  while (rooms.size < targetRooms && guard < 2000) {
    guard++;
    // Si cuesta crecer, relajamos la restricción de ramificación
    const relaxed = guard > 700;
    // Elegimos cualquier sala existente para expandir.
    const candidates = [...rooms.values()];
    const from = pick(candidates);

    const dir = pick(DIRS);
    const v = DIR_VECTORS[dir];
    const nx = from.gx + v.x;
    const ny = from.gy + v.y;

    if (Math.abs(nx) > maxRadius || Math.abs(ny) > maxRadius) continue;
    if (rooms.has(key(nx, ny))) continue;

    // Limitar el número de vecinos para crear pasillos y ramas en vez de un bloque macizo
    const neighbourCount = DIRS.filter(d => {
      const dv = DIR_VECTORS[d];
      return rooms.has(key(nx + dv.x, ny + dv.y));
    }).length;
    if (neighbourCount > 1 && !relaxed && random() < 0.75) continue;

    makeRoom(nx, ny, RoomType.COMBAT);
  }

  // 3) Derivar puertas a partir de la adyacencia (bidireccional garantizado)
  for (const room of rooms.values()) {
    room.doors = [];
    for (const d of DIRS) {
      const v = DIR_VECTORS[d];
      const nKey = key(room.gx + v.x, room.gy + v.y);
      if (!rooms.has(nKey)) continue;
      room.doors.push(d);
    }
  }

  const startKey = key(0, 0);
  const start = rooms.get(startKey)!;
  if(![...rooms.values()].some(r=>r.doors.length>=3)) {
    const branch=DIRS.find(d=>!rooms.has(key(DIR_VECTORS[d].x,DIR_VECTORS[d].y)));
    if(branch) {
      const v=DIR_VECTORS[branch],r=makeRoom(v.x,v.y,RoomType.COMBAT);
      start.doors.push(branch);r.doors.push(OPPOSITE[branch]);
    }
  }

  // 5) BFS de distancias desde el inicio (valida alcanzabilidad)
  const distances = bfs(rooms, startKey);
  for (const [k, d] of distances) rooms.get(k)!.distance = d;

  // Eliminar cualquier sala inalcanzable (no debería ocurrir, pero validamos)
  for (const k of [...rooms.keys()]) {
    if (!distances.has(k)) rooms.delete(k);
  }
  // Re-derivar puertas tras posibles borrados para que ninguna apunte a la nada
  pruneDanglingDoors(rooms);

  // 6) Asignar tipos especiales y reservar topología.
  const remaining = () => [...rooms.values()].filter(r => r.type === RoomType.COMBAT);
  const awayFromStart = () => remaining().filter(r => r.distance >= 2);

  const shuffledLocal=<T,>(values:T[])=>{
    const out=[...values];
    for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}
    return out;
  };
  const leafSlots=(parent:MapRoom)=>shuffledLocal(DIRS).filter(d=>{
    const v=DIR_VECTORS[d],nx=parent.gx+v.x,ny=parent.gy+v.y;
    // Las salas especiales creadas como ramas nunca pueden quedar pegadas a START.
    if(Math.abs(nx)+Math.abs(ny)===1)return false;
    if(rooms.has(key(nx,ny)))return false;
    const touching=DIRS.filter(nd=>{
      const nv=DIR_VECTORS[nd];
      return rooms.has(key(nx+nv.x,ny+nv.y));
    }).length;
    return touching===1;
  });
  const attachLeaf=(parent:MapRoom,type:RoomType)=>{
    const dir=leafSlots(parent)[0];
    if(!dir)return null;
    const v=DIR_VECTORS[dir],leaf=makeRoom(parent.gx+v.x,parent.gy+v.y,type);
    parent.doors.push(dir);leaf.doors.push(OPPOSITE[dir]);leaf.distance=parent.distance+1;
    return leaf;
  };
  const claimLeaf=(type:RoomType)=>{
    const existing=shuffledLocal(awayFromStart().filter(r=>r.doors.length===1));
    const target=existing[0];
    if(target){target.type=type;return target;}
    const parents=shuffledLocal(remaining().filter(r=>r.distance>=1&&leafSlots(r).length>0))
      .sort((a,b)=>b.distance-a.distance);
    for(const parent of parents){const leaf=attachLeaf(parent,type);if(leaf)return leaf;}
    return null;
  };

  // Final obligatorio del piso: ... -> SUBBOSS -> BOSS.
  // SUBBOSS conserva una sola entrada desde la ruta y una única salida hacia BOSS.
  let subbossRoom=shuffledLocal(awayFromStart().filter(r=>r.doors.length===1&&leafSlots(r).length>0))
    .sort((a,b)=>b.distance-a.distance)[0];
  if(!subbossRoom){
    const parent=shuffledLocal(remaining().filter(r=>r.distance>=1&&leafSlots(r).length>0))
      .sort((a,b)=>b.distance-a.distance)[0];
    subbossRoom=parent ? attachLeaf(parent,RoomType.SUBBOSS) ?? undefined : undefined;
  }
  if(subbossRoom){
    subbossRoom.type=RoomType.SUBBOSS;
    const bossRoom=attachLeaf(subbossRoom,RoomType.BOSS);
    if(!bossRoom) throw new Error('No se pudo crear la cadena SUBBOSS -> BOSS');
  }

  // Salas laterales garantizadas: siempre callejones sin salida.
  claimLeaf(RoomType.SHOP);
  claimLeaf(RoomType.TREASURE);
  claimLeaf(RoomType.CHALLENGE);

  // Minijefe: puede estar relativamente cerca, pero nunca conectado a START.
  assignMiddle(awayFromStart(), RoomType.MINIBOSS);

  // Sala de Objetos: una por piso, nunca conectada a START,
  // con 12% de probabilidad de una segunda.
  assignRandom(awayFromStart(), RoomType.ITEM,random);
  if (awayFromStart().length && random() < 0.12) assignRandom(awayFromStart(), RoomType.ITEM,random);

  // Especiales opcionales, también terminales.
  if (remaining().length > 7 && random() < 0.42) claimLeaf(RoomType.GUN_VAN);
  if (random() < 0.4) claimLeaf(RoomType.SECRET);
  if(awayFromStart().length>6 && random()<0.38) assignDeadEndOrRandom(awayFromStart(),RoomType.EVENT,random);
  if(remaining().length>7 && random()<.5) claimLeaf(RoomType.CHOICE);

  // Asegurar un mínimo de salas de combate.
  if (remaining().length < 5) {
    // El mapa sigue siendo válido; esta condición sólo documenta la reserva deseada.
  }

  // 7) Garantías duras de cierre de piso.
  const bosses=[...rooms.values()].filter(r=>r.type===RoomType.BOSS);
  const subbosses=[...rooms.values()].filter(r=>r.type===RoomType.SUBBOSS);
  for(let i=1;i<bosses.length;i++)bosses[i].type=RoomType.COMBAT;
  for(let i=1;i<subbosses.length;i++)subbosses[i].type=RoomType.COMBAT;

  // 8) Layouts (obstáculos) por sala.
  // El subtipo CAFÉ se decide aquí para conocer su costo de acceso antes de entrar.
  for (const room of rooms.values()) {
    if(room.type===RoomType.EVENT) room.template=random()<.38?'cafe':'event';
    if(room.type===RoomType.COMBAT && room.distance>=2 && random()<.22) {
      const modifiers=['blackout','alarm','waxed','openVault',...(floorIndex>=1?['cameras']:[])] as NonNullable<MapRoom['modifier']>[];
      room.modifier=pick(modifiers);
    }
    room.layout = generateRoomLayout(room,random);
  }

  const bossFinal = [...rooms.values()].find(r => r.type === RoomType.BOSS);
  const itemFinal = [...rooms.values()].find(r => r.type === RoomType.ITEM);
  return {
    rooms, startKey,
    itemRoomKey: itemFinal ? key(itemFinal.gx,itemFinal.gy) : startKey,
    bossKey: bossFinal ? key(bossFinal.gx, bossFinal.gy) : startKey,
    floorIndex,
  };
}

function bfs(rooms: Map<string, MapRoom>, startKey: string): Map<string, number> {
  const dist = new Map<string, number>();
  const queue: string[] = [startKey];
  dist.set(startKey, 0);
  while (queue.length) {
    const k = queue.shift()!;
    const room = rooms.get(k);
    if (!room) continue;
    for (const d of room.doors) {
      const v = DIR_VECTORS[d];
      const nk = key(room.gx + v.x, room.gy + v.y);
      if (!rooms.has(nk) || dist.has(nk)) continue;
      dist.set(nk, dist.get(k)! + 1);
      queue.push(nk);
    }
  }
  return dist;
}

/** Quita puertas que apunten a salas inexistentes y sincroniza pares */
function pruneDanglingDoors(rooms: Map<string, MapRoom>) {
  for (const room of rooms.values()) {
    room.doors = room.doors.filter(d => {
      const v = DIR_VECTORS[d];
      const nk = key(room.gx + v.x, room.gy + v.y);
      const other = rooms.get(nk);
      if (!other) return false;
      // el vecino debe tener la puerta opuesta
      return other.doors.includes(OPPOSITE[d]);
    });
  }
}

function assignMiddle(pool: MapRoom[], type: RoomType) {
  if (!pool.length) return;
  const sorted = [...pool].sort((a, b) => a.distance - b.distance);
  sorted[Math.floor(sorted.length / 2)].type = type;
}
function assignDeadEndOrRandom(pool: MapRoom[], type: RoomType,random=Math.random) {
  if (!pool.length) return;
  const deadEnds = pool.filter(r => r.doors.length === 1);
  const eligible=deadEnds.length?deadEnds:pool;
  const target=eligible[Math.floor(random()*eligible.length)];
  target.type = type;
}
function assignRandom(pool: MapRoom[], type: RoomType,random=Math.random) {
  if (!pool.length) return;
  pool[Math.floor(random()*pool.length)].type = type;
}

// ---------------------------------------------------------------------------
// LAYOUT / OBSTÁCULOS
// ---------------------------------------------------------------------------

/**
 * Construye la rejilla de tiles de la sala:
 *  0 = suelo, 1 = muro, 10+ = obstáculo sólido (índice en OBSTACLES)
 * Se reserva siempre un pasillo en cruz para que todas las puertas sean accesibles.
 */
export const BANK_ROOM_TEMPLATES_BY_FLOOR=[
  ['bankLobby','tellerHall','waitingArea'],
  ['adminOpenOffice','meetingWing','operationsOffice'],
  ['executiveAdmin','recordsAndFinance','boardroomSupport'],
  ['privateBanking','executiveSuite','directorBoardroom'],
  ['goldTreasury','goldGallery','wealthVault'],
  ['diamondVault','royalGallery','crownTreasury'],
] as const;

export const BANK_ROOM_TEMPLATES=[...new Set(BANK_ROOM_TEMPLATES_BY_FLOOR.flat())];

export const ROOM_TEMPLATES=['pillars','desks','vault','shelves','scatter','counters','open','islands','zigzag','corners',
  'deskMaze','tellerBooths','safeDiamond','twinLanes','loadingDocks','brokenOffice','horseshoes','crossCover',
  'checkerCover','centralPillars','outerShelves','staggeredSafes','splitIslands','diagonalBarricade',
  'depositLockers','valueCarts','archiveCabinets','transferCases',
  ...BANK_ROOM_TEMPLATES];

export function generateRoomLayout(room: MapRoom,random=Math.random,forcedTemplate?:string): number[][] {
  const rInt=(min:number,max:number)=>Math.floor(random()*(max-min+1))+min;
  const pick=<T,>(a:T[])=>a[Math.floor(random()*a.length)];
  const layout: number[][] = [];
  for (let y = 0; y < ROOM_HEIGHT; y++) {
    layout[y] = [];
    for (let x = 0; x < ROOM_WIDTH; x++) {
      const border = x === 0 || x === ROOM_WIDTH - 1 || y === 0 || y === ROOM_HEIGHT - 1;
      layout[y][x] = border ? TILE_WALL : TILE_FLOOR;
    }
  }

  const cx = Math.floor(ROOM_WIDTH / 2);
  const cy = Math.floor(ROOM_HEIGHT / 2);

  // Celdas protegidas: cruz central (accesos a puertas) + zona central
  const isProtected = (x: number, y: number) => {
    if (x === cx || y === cy) return true;              // pasillos hacia las puertas
    if (Math.abs(x - cx) <= 1 && Math.abs(y - cy) <= 1) return true; // centro
    // margen junto a cada puerta
    for (const d of room.doors) {
      const t = DOOR_TILE[d];
      if (Math.abs(x - t.x) <= 1 && Math.abs(y - t.y) <= 1) return true;
    }
    return false;
  };

  // Las salas iniciales deben permanecer completamente despejadas:
  // sólo suelo, muros y puertas. Esto aplica a cada piso y también a Sin Fin.
  // Las salas especiales de recompensa conservan igualmente su composición dedicada.
  if (room.type === RoomType.START ||
      room.type === RoomType.ITEM || room.type === RoomType.SHOP ||
      room.type === RoomType.BOSS ||
      room.type === RoomType.SECRET || room.type===RoomType.EVENT || room.type===RoomType.CHOICE) {
    return layout;
  }

  const floorTier=Math.max(0,Math.min(5,room.floorIndex ?? 0));
  const bankPool=BANK_ROOM_TEMPLATES_BY_FLOOR[floorTier];
  const pattern=forcedTemplate ?? (
    room.type===RoomType.START
      ? bankPool[0]
      : room.type===RoomType.SUBBOSS || room.type===RoomType.MINIBOSS
        ? bankPool[2]
        : pick([...bankPool])
  );
  room.template=pattern;
  // Cada piso tiene 20 objetos propios. Las familias cambian de nombre,
  // acabado y valor con el piso; aquí sólo elegimos qué siluetas encajan mejor
  // en cada sector del banco.
  const familySets=[
    [0,1,10,14,15,16,17,18],    // piso 1 · gran entrada y atención
    [0,2,8,11,14,15,16,18,19],  // piso 2 · administración abierta
    [0,2,4,8,10,12,14,15,16,18],// piso 3 · administración ejecutiva
    [0,2,4,10,12,14,15,16,17,18],// piso 4 · alta dirección / private banking
    [2,3,4,8,9,11,12,13,16,17,18],// piso 5 · dinero y oro
    [2,3,4,8,9,11,12,13,16,17,18],// piso 6 · oro y diamante
  ];
  const prop=(family:number,tier=floorTier)=>
    OBSTACLE_BASE+Math.max(0,Math.min(5,tier))*OBSTACLES_PER_FLOOR+family;
  const obstacle=()=>prop(pick(familySets[floorTier]));

  const place = (x: number, y: number, id?: number) => {
    if (x <= 0 || y <= 0 || x >= ROOM_WIDTH - 1 || y >= ROOM_HEIGHT - 1) return;
    if (isProtected(x, y)) return;
    layout[y][x] = id ?? obstacle();
  };

  // Los patrones históricos fueron diseñados para 15 tiles. En salas anchas
  // conservamos su escala y silueta alrededor del centro, sin estirar props.
  const lx=(x:number)=>x+Math.floor((ROOM_WIDTH-15)/2);

  switch (pattern) {
    // ---------------------------------------------------------------------
    // LAYOUTS BANCARIOS: los props forman estaciones y zonas funcionales.
    // Siempre respetan la cruz de circulación central y los accesos a puertas.
    // ---------------------------------------------------------------------
    case 'adminOpenOffice': {
      // Filas de escritorios, impresoras y archivo: oficina bancaria real, no sala de seguridad.
      for(const [x,y] of [[cx-5,2],[cx-2,2],[cx+2,2],[cx+5,2],[cx-5,7],[cx-2,7],[cx+2,7],[cx+5,7]]) place(x,y,prop(0));
      for(const [x,y] of [[cx-4,3],[cx-1,3],[cx+3,3],[cx-4,8],[cx-1,8],[cx+3,8]]) place(x,y,prop(15));
      place(2,2,prop(8)); place(ROOM_WIDTH-3,2,prop(14));
      place(2,ROOM_HEIGHT-3,prop(16)); place(ROOM_WIDTH-3,ROOM_HEIGHT-3,prop(19));
      break;
    }
    case 'meetingWing': {
      // Salas de reunión y apoyo administrativo, con áreas despejadas.
      for(const [x,y] of [[cx-5,2],[cx+5,2],[cx-5,8],[cx+5,8]]) place(x,y,prop(0));
      for(const [x,y] of [[cx-4,3],[cx+4,3],[cx-4,7],[cx+4,7]]) place(x,y,prop(15));
      place(2,3,prop(18)); place(ROOM_WIDTH-3,3,prop(18));
      place(2,7,prop(14)); place(ROOM_WIDTH-3,7,prop(8));
      break;
    }
    case 'operationsOffice': {
      // Back office: archivo, carros, impresoras y estaciones técnicas.
      for(const y of [2,4,6,8]){place(3,y,prop(8));place(ROOM_WIDTH-4,y,prop(12));}
      place(4,2,prop(11));place(ROOM_WIDTH-5,8,prop(11));
      place(4,8,prop(14));place(ROOM_WIDTH-5,2,prop(19));
      break;
    }
    case 'executiveAdmin': {
      // Escritorios ejecutivos con arte, mobiliario y zonas de consulta.
      for(const [x,y] of [[cx-5,2],[cx+5,2],[cx-5,8],[cx+5,8]]) place(x,y,prop(0));
      for(const [x,y] of [[cx-4,3],[cx+4,3],[cx-4,7],[cx+4,7]]) place(x,y,prop(15));
      place(2,2,prop(2));place(ROOM_WIDTH-3,2,prop(16));
      place(2,8,prop(14));place(ROOM_WIDTH-3,8,prop(18));
      break;
    }
    case 'recordsAndFinance': {
      // Administración financiera: archivo premium, credenzas y autenticación.
      for(const y of [2,4,6,8]){place(3,y,prop(8));place(ROOM_WIDTH-4,y,prop(12));}
      place(5,2,prop(10));place(ROOM_WIDTH-6,2,prop(10));
      place(5,8,prop(4));place(ROOM_WIDTH-6,8,prop(4));
      break;
    }
    case 'boardroomSupport': {
      // Antesala de consejo: arte, sillas y estaciones auxiliares.
      for(const [x,y] of [[cx-5,2],[cx+5,2],[cx-5,8],[cx+5,8]]) place(x,y,prop(2));
      for(const [x,y] of [[cx-4,3],[cx+4,3],[cx-4,7],[cx+4,7]]) place(x,y,prop(15));
      place(2,5,prop(18));place(ROOM_WIDTH-3,5,prop(16));
      break;
    }
    case 'executiveSuite': {
      // Alta dirección: menos clutter, piezas más grandes y hospitality.
      for(const [x,y] of [[cx-5,2],[cx+5,2],[cx-5,8],[cx+5,8]]) place(x,y,prop(0));
      place(2,2,prop(2));place(ROOM_WIDTH-3,2,prop(2));
      place(2,8,prop(17));place(ROOM_WIDTH-3,8,prop(16));
      place(cx-4,7,prop(15));place(cx+4,7,prop(15));
      break;
    }
    case 'directorBoardroom': {
      // Sala de consejo representada por asientos y arte perimetral.
      for(const x of [cx-5,cx-2,cx+2,cx+5]){place(x,2,prop(15));place(x,8,prop(15));}
      place(2,2,prop(2));place(ROOM_WIDTH-3,2,prop(2));
      place(2,8,prop(17));place(ROOM_WIDTH-3,8,prop(18));
      break;
    }
    case 'goldTreasury': {
      // Oro visible: dinero, lingotes y estatuaria con circulación central.
      for(const [x,y] of [[3,2],[ROOM_WIDTH-4,2],[3,8],[ROOM_WIDTH-4,8]]) place(x,y,prop(9));
      place(5,2,prop(3));place(ROOM_WIDTH-6,2,prop(8));
      place(5,8,prop(13));place(ROOM_WIDTH-6,8,prop(16));
      place(2,5,prop(17));place(ROOM_WIDTH-3,5,prop(12));
      break;
    }
    case 'goldGallery': {
      // Galería privada: cuadros dorados, esculturas y fuente.
      for(const [x,y] of [[3,2],[ROOM_WIDTH-4,2],[3,8],[ROOM_WIDTH-4,8]]) place(x,y,prop(2));
      place(5,2,prop(13));place(ROOM_WIDTH-6,2,prop(16));
      place(5,8,prop(17));place(ROOM_WIDTH-6,8,prop(3));
      place(2,5,prop(18));place(ROOM_WIDTH-3,5,prop(18));
      break;
    }
    case 'wealthVault': {
      // Bóveda patrimonial: cajas, dinero y oro en grupos pesados.
      for(const [x,y] of [[3,2],[ROOM_WIDTH-4,2],[3,8],[ROOM_WIDTH-4,8]]) place(x,y,prop(4));
      place(5,2,prop(9));place(ROOM_WIDTH-6,2,prop(9));
      place(5,8,prop(8));place(ROOM_WIDTH-6,8,prop(3));
      place(2,5,prop(13));place(ROOM_WIDTH-3,5,prop(12));
      break;
    }
    case 'diamondVault': {
      // Cámara diamante: gemas en varios tamaños y seguridad de alto lujo.
      for(const [x,y] of [[3,2],[ROOM_WIDTH-4,2],[3,8],[ROOM_WIDTH-4,8]]) place(x,y,prop(8));
      place(5,2,prop(3));place(ROOM_WIDTH-6,2,prop(9));
      place(5,8,prop(16));place(ROOM_WIDTH-6,8,prop(17));
      place(2,5,prop(12));place(ROOM_WIDTH-3,5,prop(13));
      break;
    }
    case 'royalGallery': {
      // Galería soberana: pinturas joya, estatua monumental y fuentes.
      for(const [x,y] of [[3,2],[ROOM_WIDTH-4,2],[3,8],[ROOM_WIDTH-4,8]]) place(x,y,prop(2));
      place(5,2,prop(13));place(ROOM_WIDTH-6,2,prop(16));
      place(5,8,prop(17));place(ROOM_WIDTH-6,8,prop(18));
      place(2,5,prop(9));place(ROOM_WIDTH-3,5,prop(3));
      break;
    }
    case 'crownTreasury': {
      // Tesoro final: mezcla deliberada de oro, diamantes y vitrinas.
      for(const [x,y] of [[3,2],[ROOM_WIDTH-4,2],[3,8],[ROOM_WIDTH-4,8]]) place(x,y,prop(4));
      place(5,2,prop(8));place(ROOM_WIDTH-6,2,prop(8));
      place(5,8,prop(13));place(ROOM_WIDTH-6,8,prop(16));
      place(2,5,prop(17));place(ROOM_WIDTH-3,5,prop(18));
      break;
    }

    case 'bankLobby': {
      // Gran entrada: recepción frontal, filas, lounge, vegetación y fuente.
      for(const x of [cx-4,cx-2,cx+2,cx+4]) place(x,2,prop(0));
      for(const [x,y] of [[cx-5,3],[cx-5,4],[cx+5,3],[cx+5,4]]) place(x,y,prop(1));
      place(2,2,prop(16)); place(ROOM_WIDTH-3,2,prop(16));
      place(2,ROOM_HEIGHT-3,prop(15)); place(ROOM_WIDTH-3,ROOM_HEIGHT-3,prop(15));
      place(4,ROOM_HEIGHT-3,prop(17)); place(ROOM_WIDTH-5,ROOM_HEIGHT-3,prop(18));
      break;
    }
    case 'tellerHall': {
      // Cuatro módulos de caja alineados y corredores de fila enfrente.
      for(const x of [cx-5,cx-2,cx+2,cx+5]){
        place(x,2,prop(0));
        place(x,3,prop(10));
      }
      for(const [x,y] of [[cx-5,7],[cx-5,8],[cx+5,7],[cx+5,8]]) place(x,y,prop(1));
      place(2,7,prop(14)); place(ROOM_WIDTH-3,7,prop(14));
      break;
    }
    case 'waitingArea': {
      // Zona de espera ordenada: sillas por pares, plantas y servicios al muro.
      for(const [x,y] of [[3,3],[4,3],[ROOM_WIDTH-5,3],[ROOM_WIDTH-4,3],
                          [3,7],[4,7],[ROOM_WIDTH-5,7],[ROOM_WIDTH-4,7]]) place(x,y,prop(15));
      place(2,2,prop(16)); place(ROOM_WIDTH-3,2,prop(16));
      place(2,ROOM_HEIGHT-3,prop(17)); place(ROOM_WIDTH-3,ROOM_HEIGHT-3,prop(0));
      break;
    }
    case 'securityCheckpoint': {
      // Dos carriles de control, lectores y alarmas pegadas al perímetro.
      for(const y of [2,3,7,8]){
        place(cx-4,y,prop(6)); place(cx+4,y,prop(6));
      }
      for(const [x,y] of [[cx-5,3],[cx+5,3],[cx-5,7],[cx+5,7]]) place(x,y,prop(1));
      place(2,2,prop(7)); place(ROOM_WIDTH-3,2,prop(7));
      place(2,ROOM_HEIGHT-3,prop(18)); place(ROOM_WIDTH-3,ROOM_HEIGHT-3,prop(19));
      break;
    }
    case 'surveillanceOps': {
      // Videowall/operadores al norte y racks en extremos.
      for(const x of [cx-5,cx-2,cx+2,cx+5]) place(x,2,prop(18));
      for(const [x,y] of [[2,3],[2,7],[ROOM_WIDTH-3,3],[ROOM_WIDTH-3,7]]) place(x,y,prop(19));
      place(cx-4,7,prop(6)); place(cx+4,7,prop(6));
      place(cx-5,8,prop(7)); place(cx+5,8,prop(7));
      break;
    }
    case 'secureLanes': {
      // Carriles paralelos de control con infraestructura técnica.
      for(let y=2;y<=8;y+=2){
        place(cx-4,y,prop(y%4===0?7:6));
        place(cx+4,y,prop(y%4===0?7:6));
      }
      place(2,2,prop(19)); place(ROOM_WIDTH-3,2,prop(19));
      place(2,8,prop(18)); place(ROOM_WIDTH-3,8,prop(18));
      break;
    }
    case 'archiveRows': {
      // Filas de archivo contra muros; carros sólo en extremos de pasillo.
      for(const x of [3,ROOM_WIDTH-4]) for(const y of [2,4,6,8]) place(x,y,prop(12));
      place(4,2,prop(8)); place(ROOM_WIDTH-5,2,prop(8));
      place(4,8,prop(11)); place(ROOM_WIDTH-5,8,prop(11));
      break;
    }
    case 'custodyTransfer': {
      // Zona de transferencia de valores: cases/containers agrupados en estaciones.
      for(const [x,y] of [[cx-5,2],[cx+5,2],[cx-5,8],[cx+5,8]]){
        place(x,y,prop(4));
        place(x+(x<cx?1:-1),y,prop(9));
      }
      place(2,4,prop(11)); place(ROOM_WIDTH-3,6,prop(11));
      place(2,7,prop(10)); place(ROOM_WIDTH-3,3,prop(10));
      break;
    }
    case 'recordCages': {
      // Jaulas y lockers simétricos, como zona de custodia documental.
      for(const [x,y] of [[cx-5,2],[cx+5,2],[cx-5,8],[cx+5,8]]) place(x,y,prop(13));
      for(const [x,y] of [[cx-4,3],[cx+4,3],[cx-4,7],[cx+4,7]]) place(x,y,prop(12));
      place(2,2,prop(8)); place(ROOM_WIDTH-3,8,prop(8));
      break;
    }
    case 'privateBanking': {
      // Módulos de atención privados, impresoras y sillas enfrentadas.
      for(const [x,y] of [[cx-5,2],[cx+5,2],[cx-5,8],[cx+5,8]]) place(x,y,prop(0));
      for(const [x,y] of [[cx-4,3],[cx+4,3],[cx-4,7],[cx+4,7]]) place(x,y,prop(15));
      place(2,3,prop(14)); place(ROOM_WIDTH-3,7,prop(14));
      place(2,8,prop(16)); place(ROOM_WIDTH-3,2,prop(16));
      break;
    }
    case 'executivePods': {
      // Islas ejecutivas compactas, con vigilancia discreta en muro.
      for(const [ox,oy] of [[cx-5,2],[cx+3,2],[cx-5,7],[cx+3,7]]){
        place(ox,oy,prop(0)); place(ox+1,oy,prop(14)); place(ox,oy+1,prop(15));
      }
      place(2,5,prop(18)); place(ROOM_WIDTH-3,5,prop(18));
      break;
    }
    case 'cashOffice': {
      // Operación de efectivo: contadoras/impresoras alineadas y casos en perímetro.
      for(const x of [cx-5,cx-2,cx+2,cx+5]){
        place(x,2,prop(10));
        place(x,8,prop(14));
      }
      place(2,3,prop(9)); place(2,7,prop(4));
      place(ROOM_WIDTH-3,3,prop(4)); place(ROOM_WIDTH-3,7,prop(9));
      break;
    }
    case 'vaultCheckpoint': {
      // Control previo a bóveda: biométricos, servidores y columnas reforzadas.
      for(const y of [2,8]){
        place(cx-5,y,prop(6)); place(cx+5,y,prop(6));
        place(cx-4,y,prop(5)); place(cx+4,y,prop(5));
      }
      place(2,3,prop(19)); place(ROOM_WIDTH-3,3,prop(19));
      place(2,7,prop(7)); place(ROOM_WIDTH-3,7,prop(7));
      break;
    }
    case 'safeDeposit': {
      // Cajas/lockers formando bancos laterales, dejando eje central ceremonial.
      for(const x of [3,ROOM_WIDTH-4]) for(const y of [2,4,6,8]) place(x,y,prop(y%4===0?13:8));
      place(4,2,prop(6)); place(ROOM_WIDTH-5,8,prop(6));
      place(4,8,prop(9)); place(ROOM_WIDTH-5,2,prop(9));
      break;
    }
    case 'secureTransfer': {
      // Transferencia blindada: contenedores y jaulas por parejas.
      for(const [x,y] of [[cx-5,2],[cx+5,2],[cx-5,8],[cx+5,8]]){
        place(x,y,prop(4));
        place(x+(x<cx?1:-1),y,prop(13));
      }
      place(2,5,prop(11)); place(ROOM_WIDTH-3,5,prop(11));
      place(3,3,prop(6)); place(ROOM_WIDTH-4,7,prop(6));
      break;
    }
    case 'sovereignVault': {
      // Cámara principal: perímetro de custodia y estaciones simétricas.
      for(const [x,y] of [[3,2],[ROOM_WIDTH-4,2],[3,8],[ROOM_WIDTH-4,8]]) place(x,y,prop(13));
      for(const [x,y] of [[5,2],[ROOM_WIDTH-6,2],[5,8],[ROOM_WIDTH-6,8]]) place(x,y,prop(4));
      place(2,4,prop(6)); place(ROOM_WIDTH-3,4,prop(6));
      place(2,6,prop(19)); place(ROOM_WIDTH-3,6,prop(19));
      break;
    }
    case 'goldCages': {
      // Custodia de valores: jaulas repetidas como arquitectura funcional.
      for(const y of [2,4,6,8]){
        place(3,y,prop(13)); place(ROOM_WIDTH-4,y,prop(13));
      }
      place(4,2,prop(8)); place(ROOM_WIDTH-5,2,prop(8));
      place(4,8,prop(19)); place(ROOM_WIDTH-5,8,prop(19));
      break;
    }
    case 'coreSecurity': {
      // Núcleo de seguridad: racks y lectores al perímetro, cero clutter central.
      for(const [x,y] of [[2,2],[2,8],[ROOM_WIDTH-3,2],[ROOM_WIDTH-3,8]]) place(x,y,prop(19));
      for(const [x,y] of [[4,2],[4,8],[ROOM_WIDTH-5,2],[ROOM_WIDTH-5,8]]) place(x,y,prop(6));
      place(3,4,prop(7)); place(ROOM_WIDTH-4,4,prop(7));
      place(3,6,prop(5)); place(ROOM_WIDTH-4,6,prop(5));
      break;
    }

    case 'depositLockers':
      for(const x of [3,ROOM_WIDTH-4])for(let y=2;y<=ROOM_HEIGHT-3;y+=2)place(x,y,prop(8));
      break;
    case 'valueCarts':
      for(const [x,y] of [[cx-4,3],[cx+4,3],[cx-4,7],[cx+4,7]]){
        place(x,y,prop(11));
        place(x+(x<cx?1:-1),y,prop(10));
      }
      break;
    case 'archiveCabinets':
      for(const x of [cx-5,cx+5])for(const y of [2,4,6,8])place(x,y,prop(12));
      break;
    case 'transferCases':
      for(const [x,y] of [[cx-4,2],[cx+4,2],[cx-5,6],[cx+5,6],[cx-2,8],[cx+2,8]])
        place(x,y,random()<.5?prop(9):prop(4));
      break;
    case 'deskMaze':
      for(const[x,y]of[[2,2],[3,2],[4,2],[4,3],[9,2],[10,2],[10,3],[11,3],[2,7],[3,7],[3,8],[9,8],[10,8],[11,8]])place(lx(x),y);break;
    case 'tellerBooths':
      for(const x of [cx-5,cx-2,cx+2,cx+5])for(const y of [2,3,7,8])place(x,y);break;
    case 'safeDiamond':
      for(const[x,y]of[[cx-2,2],[cx+2,2],[cx-4,4],[cx+4,4],[cx-4,6],[cx+4,6],[cx-2,8],[cx+2,8]])
        place(x,y,random()<.55?prop(13):prop(8));
      break;
    case 'twinLanes':
      for(let y=2;y<9;y++){place(cx-3,y);place(cx+3,y);}break;
    case 'loadingDocks':
      for(const[x,y]of[[2,2],[3,2],[2,3],[11,7],[12,7],[12,8],[9,2],[10,2],[4,8],[5,8]])place(lx(x),y);break;
    case 'brokenOffice':
      for(const[x,y]of[[2,3],[4,2],[6,2],[9,4],[12,2],[11,7],[8,8],[4,7],[2,8],[12,8]])place(lx(x),y,random()<.5?prop(7):obstacle());break;
    case 'horseshoes':
      for(const ox of [cx-5,cx+2])for(const oy of [2,7]){place(ox,oy);place(ox+1,oy);place(ox+2,oy);place(ox,oy+1);place(ox+2,oy+1);}break;
    case 'crossCover':
      for(const[x,y]of[[4,3],[5,3],[9,3],[10,3],[4,7],[5,7],[9,7],[10,7],[3,4],[3,6],[11,4],[11,6]])place(lx(x),y);break;
    case 'checkerCover':
      for(let y=2;y<9;y+=2)for(let x=2;x<ROOM_WIDTH-2;x+=3)if((x+y)%3!==0)place(x,y);break;
    case 'centralPillars':
      for(const x of [cx-2,cx+2])for(const y of [3,7]){place(x,y,prop(5));place(x+(x<cx?-1:1),y,prop(5));}break;
    case 'outerShelves':
      for(let x=2;x<ROOM_WIDTH-2;x++){place(x,2);place(x,8);}break;
    case 'staggeredSafes':
      for(const[x,y]of[[3,2],[6,3],[10,2],[12,4],[3,6],[5,8],[9,7],[12,8]])
        place(lx(x),y,random()<.6?prop(13):prop(6));
      break;
    case 'splitIslands':
      for(const[ox,oy]of[[cx-4,2],[cx+3,7]])for(let x=ox;x<ox+2;x++)for(let y=oy;y<oy+2;y++)place(x,y);
      place(cx+3,3);place(cx-3,7);break;
    case 'diagonalBarricade':
      for(const[x,y]of[[2,2],[3,3],[4,4],[10,6],[11,7],[12,8],[11,2],[3,8]])place(lx(x),y,prop(1));break;
    case 'islands':
      for(const [x,y] of [[cx-4,3],[cx+3,3],[cx-3,7],[cx+3,7]]) {place(x,y,prop(13));place(x+1,y,prop(3));}break;
    case 'zigzag':
      for(let y=2;y<9;y+=2) for(let x=0;x<3;x++) {place((y%4===0?cx+2:cx-5)+x,y,prop(1));}break;
    case 'corners':
      for(const [x,y] of [[3,3],[ROOM_WIDTH-4,3],[3,7],[ROOM_WIDTH-4,7]]) {place(x,y);place(x+(x<cx?1:-1),y);place(x,y+(y<5?1:-1));}break;
    case 'pillars': {
      const id = prop(5);
      for (const x of [3, ROOM_WIDTH - 4]) {
        for (const y of [2, ROOM_HEIGHT - 3]) { place(x, y, id); place(x, y + (y < cy ? 1 : -1), id); }
      }
      break;
    }
    case 'desks': {
      const id = prop(0);
      for (let x = 2; x <= 4; x++) { place(x, 2, id); place(x, ROOM_HEIGHT - 3, id); }
      for (let x = ROOM_WIDTH - 5; x <= ROOM_WIDTH - 3; x++) { place(x, 2, id); place(x, ROOM_HEIGHT - 3, id); }
      break;
    }
    case 'vault': {
      place(cx-3,cy-2,prop(13));place(cx+3,cy-2,prop(8));
      place(cx-3,cy+2,prop(4));place(cx+3,cy+2,prop(6));
      place(cx-4,cy-2,prop(9));
      place(cx+4,cy+2,prop(10));
      break;
    }
    case 'shelves': {
      const id = prop(2);
      for (let y = 2; y <= ROOM_HEIGHT - 3; y++) { place(3, y, id); place(ROOM_WIDTH - 4, y, id); }
      break;
    }
    case 'counters': {
      for (let x = 2; x < ROOM_WIDTH - 2; x++) { place(x, cy - 2, prop(0)); }
      for (let x = 2; x < ROOM_WIDTH - 2; x++) { place(x, cy + 2, prop(1)); }
      break;
    }
    case 'scatter': {
      const extra=Math.max(0,Math.floor((ROOM_WIDTH-15)/4));
      const count = rInt(5+extra, 9+extra);
      for (let i = 0; i < count; i++) {
        place(rInt(2, ROOM_WIDTH - 3), rInt(2, ROOM_HEIGHT - 3));
      }
      break;
    }
    default: break;
  }
  const bankTemplate=BANK_ROOM_TEMPLATES.includes(pattern as typeof BANK_ROOM_TEMPLATES[number]);
  if(bankTemplate){
    // Soportes secundarios siguen la arquitectura: pared/esquina, nunca ruido
    // aleatorio en el centro de circulación.
    const supportByFloor=[
      [16,17,15,18], // gran entrada: plantas, fuente, lounge, información
      [8,14,16,19],  // administración: archivo, impresora, planta, servidor
      [2,14,15,16],  // ejecutivo: arte, impresora, silla, escultura verde
      [2,15,16,17],  // alta dirección: arte, club chair, escultura, fuente
      [2,3,9,16,17], // tesorería: arte, dinero, oro, escultura, fuente
      [2,3,8,13,16,17], // soberano: arte, diamantes, estatua y fuente
    ][floorTier];
    const supportSlots=[[2,2],[ROOM_WIDTH-3,2],[2,ROOM_HEIGHT-3],[ROOM_WIDTH-3,ROOM_HEIGHT-3]] as const;
    const occupied=(x:number,y:number)=>layout[y]?.[x]>=OBSTACLE_BASE;
    let added=0;
    for(let i=0;i<supportSlots.length&&added<2;i++){
      const [x,y]=supportSlots[(i+Math.abs(room.gx*3+room.gy*5))%supportSlots.length];
      if(!occupied(x,y)){
        place(x,y,prop(supportByFloor[(i+room.distance)%supportByFloor.length]));
        added++;
      }
    }

    // Las salas ahora pueden crecer de 15 hasta 41 columnas. Los primeros
    // layouts bancarios estaban pensados para el ancho viejo y en monitores
    // anchos dejaban grandes superficies vacías. Rellenamos sólo las franjas
    // laterales, conservando intacta la cruz de circulación y el centro.
    if(ROOM_WIDTH>19){
      const outerLeft=4,outerRight=ROOM_WIDTH-5;
      const innerGap=Math.max(6,Math.floor((ROOM_WIDTH-15)/4)+5);
      const leftInner=Math.max(4,cx-innerGap),rightInner=Math.min(ROOM_WIDTH-5,cx+innerGap);
      const family=(offset:number)=>supportByFloor[Math.abs(offset+room.distance)%supportByFloor.length];

      for(const [x,y,off] of [
        [outerLeft,2,0],[outerRight,2,1],
        [outerLeft,ROOM_HEIGHT-3,2],[outerRight,ROOM_HEIGHT-3,3],
        [leftInner,3,1],[rightInner,3,2],
        [leftInner,ROOM_HEIGHT-4,3],[rightInner,ROOM_HEIGHT-4,0],
      ] as const){
        if(!occupied(x,y))place(x,y,prop(family(off)));
      }

      // El lobby inicial necesita zonas de espera/atención repartidas por el
      // ancho real del cuarto, no sólo cuatro objetos alrededor del centro.
      if(room.type===RoomType.START){
        const spread=Math.max(7,Math.min(12,Math.floor(ROOM_WIDTH*.24)));
        for(const [x,y,id] of [
          [cx-spread,cy-2,15],[cx+spread,cy-2,15],
          [cx-spread,cy+2,1],[cx+spread,cy+2,1],
          [cx-spread-3,cy-2,16],[cx+spread+3,cy-2,16],
          [cx-spread-3,cy+2,17],[cx+spread+3,cy+2,18],
        ] as const){
          if(!occupied(x,y))place(x,y,prop(id));
        }
      }
    }
  }else if(random()<.38){
    // Compatibilidad con plantillas históricas forzadas por pruebas/fixtures.
    const looseFamilies=[3,9,10,14,15,16,17];
    place(rInt(2,ROOM_WIDTH-3),rInt(2,ROOM_HEIGHT-3),prop(pick(looseFamilies)));
  }

  return layout;
}

/** Devuelve las celdas libres (sin muro ni obstáculo) para colocar enemigos */
export function freeTiles(layout: number[][], margin = 2): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (let y = margin; y < ROOM_HEIGHT - margin; y++) {
    for (let x = margin; x < ROOM_WIDTH - margin; x++) {
      if (layout[y][x] === TILE_FLOOR) out.push({ x, y });
    }
  }
  return shuffle(out);
}

export function validateMap(map:GameMap):string[] {
  const issues:string[]=[];
  const itemCount=[...map.rooms.values()].filter(r=>r.type===RoomType.ITEM).length;
  if(itemCount<1||itemCount>2) issues.push('item room count');
  if(map.rooms.get(map.itemRoomKey)?.type!==RoomType.ITEM) issues.push('item room key');
  const start=map.rooms.get(map.startKey);
  if(start) {
    for(const d of start.doors) {
      const v=DIR_VECTORS[d];
      const neighbour=map.rooms.get(key(start.gx+v.x,start.gy+v.y));
      if(neighbour&&START_FORBIDDEN_TYPES.has(neighbour.type)) issues.push(`start adjacency ${neighbour.type}`);
      if(neighbour&&neighbour.type!==RoomType.COMBAT) issues.push(`start must connect combat ${neighbour.type}`);
    }
  }
  for(const room of map.rooms.values()){
    if(LEAF_ONLY_TYPES.has(room.type)){
      if(room.doors.length!==1) issues.push(`leaf room ${room.type}`);
      const d=room.doors[0];
      if(d){
        const v=DIR_VECTORS[d],neighbour=map.rooms.get(key(room.gx+v.x,room.gy+v.y));
        if(neighbour&&LEAF_ONLY_TYPES.has(neighbour.type)) issues.push(`leaf adjacency ${room.type} ${neighbour.type}`);
      }
    }
  }
  if([...map.rooms.values()].filter(r=>r.type===RoomType.BOSS).length!==1) issues.push('boss count');
  if([...map.rooms.values()].filter(r=>r.type===RoomType.SUBBOSS).length!==1) issues.push('subboss count');
  const boss=[...map.rooms.values()].find(r=>r.type===RoomType.BOSS);
  const subboss=[...map.rooms.values()].find(r=>r.type===RoomType.SUBBOSS);
  if(boss){
    if(boss.doors.length!==1) issues.push('boss must be terminal');
    const d=boss.doors[0],v=d?DIR_VECTORS[d]:null;
    const neighbour=v?map.rooms.get(key(boss.gx+v.x,boss.gy+v.y)):undefined;
    if(neighbour?.type!==RoomType.SUBBOSS) issues.push('boss not behind subboss');
  }
  if(subboss){
    if(subboss.doors.length!==2) issues.push('subboss chain degree');
    let bossLinks=0,otherLinks=0;
    for(const d of subboss.doors){
      const v=DIR_VECTORS[d],neighbour=map.rooms.get(key(subboss.gx+v.x,subboss.gy+v.y));
      if(neighbour?.type===RoomType.BOSS)bossLinks++;else otherLinks++;
    }
    if(bossLinks!==1||otherLinks!==1) issues.push('subboss chain links');
  }
  if([...map.rooms.values()].filter(r=>r.type===RoomType.MINIBOSS).length!==1) issues.push('miniboss count');
  if((map.rooms.get(map.bossKey)?.distance ?? 0)<2) issues.push('boss depth');
  if(bfs(map.rooms,map.startKey).size!==map.rooms.size) issues.push('disconnected map');
  if(![...map.rooms.values()].some(r=>r.doors.length>=3)) issues.push('no branching');
  for(const room of map.rooms.values()) for(const d of room.doors) {
    const v=DIR_VECTORS[d],other=map.rooms.get(key(room.gx+v.x,room.gy+v.y));
    if(!other?.doors.includes(OPPOSITE[d])) issues.push(`door ${key(room.gx,room.gy)} ${d}`);
    const dt=DOOR_TILE[d];
    const sx=dt.x-v.x,sy=dt.y-v.y;
    if(room.layout[sy]?.[sx]>=OBSTACLE_BASE) issues.push('blocked entry');
  }
  return issues;
}
