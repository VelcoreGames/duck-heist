// Generador procedural de mapas por rejilla (grid graph)
// Cada sala ocupa una celda (gx, gy). Las puertas se derivan de la adyacencia,
// por lo que SIEMPRE son bidireccionales y consistentes.

import {
  ROOM_WIDTH, ROOM_HEIGHT, RoomType,
  DIRS, DIR_VECTORS, DOOR_TILE, OPPOSITE,
  TILE_FLOOR, TILE_WALL, OBSTACLE_BASE,
  type Dir,
} from './constants';
import { seededRandom } from './random';

export function key(gx: number, gy: number): string { return `${gx},${gy}`; }

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
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
}

export interface GameMap {
  rooms: Map<string, MapRoom>;
  startKey: string;
  itemRoomKey: string;
  bossKey: string;
  floorIndex: number;
}

/**
 * Genera un mapa válido:
 *  - Sala inicial en (0,0)
 *  - SIEMPRE una puerta OESTE desde el inicio hacia una SALA DE OBJETO en (-1,0)
 *  - Crecimiento aleatorio con ramificaciones y callejones sin salida
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
    };
    rooms.set(key(gx, gy), r);
    return r;
  };

  // 1) Sala inicial
  makeRoom(0, 0, RoomType.START);

  // 2) SALA DE OBJETO GARANTIZADA al OESTE del inicio
  makeRoom(-1, 0, RoomType.ITEM);

  // 3) Crecimiento procedural
  // inicio + sala de objeto + 6-12 combate + tienda/tesoro/desafío/minijefe/jefe
  const targetRooms = rInt(14, 19);
  const maxRadius = 4;
  let guard = 0;

  while (rooms.size < targetRooms && guard < 2000) {
    guard++;
    // Si cuesta crecer, relajamos la restricción de ramificación
    const relaxed = guard > 700;
    // Elegimos una sala existente para expandir (evitamos expandir desde la sala de objeto:
    // debe ser un callejón sin salida para que se sienta especial)
    const candidates = [...rooms.values()].filter(r => r.type !== RoomType.ITEM);
    const from = pick(candidates);

    const dir = pick(DIRS);
    const v = DIR_VECTORS[dir];
    const nx = from.gx + v.x;
    const ny = from.gy + v.y;

    if (Math.abs(nx) > maxRadius || Math.abs(ny) > maxRadius) continue;
    if (rooms.has(key(nx, ny))) continue;
    // No permitir que nada nazca pegado al oeste del inicio salvo la sala de objeto
    if (nx === -1 && ny === 0) continue;

    // Limitar el número de vecinos para crear pasillos y ramas en vez de un bloque macizo
    const neighbourCount = DIRS.filter(d => {
      const dv = DIR_VECTORS[d];
      return rooms.has(key(nx + dv.x, ny + dv.y));
    }).length;
    if (neighbourCount > 1 && !relaxed && random() < 0.75) continue;

    makeRoom(nx, ny, RoomType.COMBAT);
  }

  // 4) Derivar puertas a partir de la adyacencia (bidireccional garantizado)
  //    La sala de objeto sólo conecta con el inicio.
  for (const room of rooms.values()) {
    room.doors = [];
    for (const d of DIRS) {
      const v = DIR_VECTORS[d];
      const nKey = key(room.gx + v.x, room.gy + v.y);
      const neighbour = rooms.get(nKey);
      if (!neighbour) continue;
      // La sala de objeto es un callejón: sólo puerta ESTE hacia el inicio
      if (room.type === RoomType.ITEM && !(room.gx === -1 && room.gy === 0 && d === 'E')) continue;
      if (neighbour.type === RoomType.ITEM && !(neighbour.gx === -1 && neighbour.gy === 0 && OPPOSITE[d] === 'E')) continue;
      room.doors.push(d);
    }
  }

  const startKey = key(0, 0);
  const itemRoomKey = key(-1, 0);

  // Garantía dura: el inicio tiene puerta OESTE
  const start = rooms.get(startKey)!;
  if (!start.doors.includes('W')) start.doors.push('W');
  const itemRoom = rooms.get(itemRoomKey)!;
  if (!itemRoom.doors.includes('E')) itemRoom.doors.push('E');
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

  // 6) Asignar tipos especiales
  const normals = [...rooms.values()]
    .filter(r => r.type === RoomType.COMBAT)
    .sort((a, b) => b.distance - a.distance);

  // Jefe: la sala más lejana (preferimos un callejón sin salida) y NUNCA pegada al inicio
  const deadEnds = normals.filter(r => r.doors.length === 1 && r.distance >= 3);
  let bossRoom = deadEnds[0] ?? normals.find(r => r.distance >= 3);
  // Red de seguridad: si el crecimiento falló, creamos una sala de jefe al este
  if (!bossRoom) {
    const deepest=normals[0] ?? start;
    const direction=DIRS.find(d=>!rooms.has(key(deepest.gx+DIR_VECTORS[d].x,deepest.gy+DIR_VECTORS[d].y)))!;
    const v=DIR_VECTORS[direction];
    let parent=deepest;
    for(let i=0;i<3;i++) {
      const b=makeRoom(parent.gx+v.x,parent.gy+v.y,RoomType.COMBAT);
      parent.doors.push(direction);b.doors.push(OPPOSITE[direction]);b.distance=parent.distance+1;parent=b;
    }
    bossRoom=parent;
  }
  bossRoom.type = RoomType.BOSS;

  const remaining = () => [...rooms.values()].filter(r => r.type === RoomType.COMBAT);

  // Minijefe: lejano pero no el jefe
  assignFarthest(remaining(), RoomType.MINIBOSS);
  // Tienda: distancia media
  assignMiddle(remaining(), RoomType.SHOP);
  // Tesoro: preferentemente callejón sin salida
  assignDeadEndOrRandom(remaining(), RoomType.TREASURE,random);
  // Segunda sala de objeto opcional
  if (random() < 0.75) assignDeadEndOrRandom(remaining(), RoomType.ITEM,random);
  // Desafío
  assignRandom(remaining(), RoomType.CHALLENGE,random);
  // Bóveda secreta opcional
  if (random() < 0.4) assignDeadEndOrRandom(remaining().filter(r=>r.doors.length===1), RoomType.SECRET,random);
  if(remaining().length>6) assignDeadEndOrRandom(remaining(),RoomType.EVENT,random);
  if(remaining().length>7 && random()<.5) assignDeadEndOrRandom(remaining(),RoomType.CHOICE,random);

  // Asegurar un mínimo de salas de combate
  if (remaining().length < 5) {
    // convertir alguna especial sobrante de vuelta a combate no es necesario:
    // el generador ya crea 11-16 salas, pero validamos por seguridad
  }

  // 7) Garantía dura: EXACTAMENTE un jefe por piso
  const bosses = [...rooms.values()].filter(r => r.type === RoomType.BOSS);
  for (let i = 1; i < bosses.length; i++) bosses[i].type = RoomType.COMBAT;
  if (bosses.length === 0) {
    const fb = [...rooms.values()].sort((a, b) => b.distance - a.distance)
      .find(r => r.type === RoomType.COMBAT);
    if (fb) fb.type = RoomType.BOSS;
  }

  // 8) Layouts (obstáculos) por sala
  for (const room of rooms.values()) {
    if(room.type===RoomType.COMBAT && room.distance>=2 && random()<.22) {
      const modifiers=['blackout','alarm','waxed','openVault',...(floorIndex>=1?['cameras']:[])] as NonNullable<MapRoom['modifier']>[];
      room.modifier=pick(modifiers);
    }
    room.layout = generateRoomLayout(room,random);
  }

  const bossFinal = [...rooms.values()].find(r => r.type === RoomType.BOSS);
  return {
    rooms, startKey, itemRoomKey,
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

function assignFarthest(pool: MapRoom[], type: RoomType) {
  if (!pool.length) return;
  const sorted = [...pool].sort((a, b) => b.distance - a.distance);
  sorted[0].type = type;
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
export const ROOM_TEMPLATES=['pillars','desks','vault','shelves','scatter','counters','open','islands','zigzag','corners',
  'deskMaze','tellerBooths','safeDiamond','twinLanes','loadingDocks','brokenOffice','horseshoes','crossCover',
  'checkerCover','centralPillars','outerShelves','staggeredSafes','splitIslands','diagonalBarricade'];

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

  // Las salas especiales tienen decoración propia, sin obstáculos aleatorios
  if (room.type === RoomType.ITEM || room.type === RoomType.SHOP ||
      room.type === RoomType.BOSS || room.type === RoomType.START ||
      room.type === RoomType.SECRET || room.type===RoomType.EVENT || room.type===RoomType.CHOICE) {
    return layout;
  }

  const pattern=forcedTemplate ?? pick(ROOM_TEMPLATES);
  room.template=pattern;
  const propSets=[[0,5,6],[1,2,6],[2,3,4],[2,4,7],[1,5,6],[3,5,6]];
  const obstacle=()=>OBSTACLE_BASE+pick(propSets[Math.min(5,room.floorIndex ?? 0)]);

  const place = (x: number, y: number, id?: number) => {
    if (x <= 0 || y <= 0 || x >= ROOM_WIDTH - 1 || y >= ROOM_HEIGHT - 1) return;
    if (isProtected(x, y)) return;
    layout[y][x] = id ?? obstacle();
  };

  switch (pattern) {
    case 'deskMaze':
      for(const[x,y]of[[2,2],[3,2],[4,2],[4,3],[9,2],[10,2],[10,3],[11,3],[2,7],[3,7],[3,8],[9,8],[10,8],[11,8]])place(x,y);break;
    case 'tellerBooths':
      for(const x of [2,5,9,12])for(const y of [2,3,7,8])place(x,y);break;
    case 'safeDiamond':
      for(const[x,y]of[[5,2],[9,2],[3,4],[11,4],[3,6],[11,6],[5,8],[9,8]])place(x,y,OBSTACLE_BASE+6);break;
    case 'twinLanes':
      for(let y=2;y<9;y++){place(4,y);place(10,y);}break;
    case 'loadingDocks':
      for(const[x,y]of[[2,2],[3,2],[2,3],[11,7],[12,7],[12,8],[9,2],[10,2],[4,8],[5,8]])place(x,y);break;
    case 'brokenOffice':
      for(const[x,y]of[[2,3],[4,2],[6,2],[9,4],[12,2],[11,7],[8,8],[4,7],[2,8],[12,8]])place(x,y,random()<.5?OBSTACLE_BASE+7:obstacle());break;
    case 'horseshoes':
      for(const ox of [2,9])for(const oy of [2,7]){place(ox,oy);place(ox+1,oy);place(ox+2,oy);place(ox,oy+1);place(ox+2,oy+1);}break;
    case 'crossCover':
      for(const[x,y]of[[4,3],[5,3],[9,3],[10,3],[4,7],[5,7],[9,7],[10,7],[3,4],[3,6],[11,4],[11,6]])place(x,y);break;
    case 'checkerCover':
      for(let y=2;y<9;y+=2)for(let x=2;x<13;x+=3)if((x+y)%3!==0)place(x,y);break;
    case 'centralPillars':
      for(const x of [5,9])for(const y of [3,7]){place(x,y,OBSTACLE_BASE+5);place(x+(x===5?-1:1),y,OBSTACLE_BASE+5);}break;
    case 'outerShelves':
      for(let x=2;x<13;x++){place(x,2);place(x,8);}break;
    case 'staggeredSafes':
      for(const[x,y]of[[3,2],[6,3],[10,2],[12,4],[3,6],[5,8],[9,7],[12,8]])place(x,y,OBSTACLE_BASE+6);break;
    case 'splitIslands':
      for(const[ox,oy]of[[3,2],[10,7]])for(let x=ox;x<ox+2;x++)for(let y=oy;y<oy+2;y++)place(x,y);
      place(10,3);place(4,7);break;
    case 'diagonalBarricade':
      for(const[x,y]of[[2,2],[3,3],[4,4],[10,6],[11,7],[12,8],[11,2],[3,8]])place(x,y,OBSTACLE_BASE+1);break;
    case 'islands':
      for(const [x,y] of [[3,3],[10,3],[4,7],[10,7]]) {place(x,y,OBSTACLE_BASE+6);place(x+1,y,OBSTACLE_BASE+3);}break;
    case 'zigzag':
      for(let y=2;y<9;y+=2) for(let x=2;x<5;x++) {place(y%4===0?x+7:x,y,OBSTACLE_BASE+1);}break;
    case 'corners':
      for(const [x,y] of [[3,3],[11,3],[3,7],[11,7]]) {place(x,y);place(x+(x<7?1:-1),y);place(x,y+(y<5?1:-1));}break;
    case 'pillars': {
      const id = OBSTACLE_BASE + 5; // columna
      for (const x of [3, ROOM_WIDTH - 4]) {
        for (const y of [2, ROOM_HEIGHT - 3]) { place(x, y, id); place(x, y + (y < cy ? 1 : -1), id); }
      }
      break;
    }
    case 'desks': {
      const id = OBSTACLE_BASE + 0; // mostrador
      for (let x = 2; x <= 4; x++) { place(x, 2, id); place(x, ROOM_HEIGHT - 3, id); }
      for (let x = ROOM_WIDTH - 5; x <= ROOM_WIDTH - 3; x++) { place(x, 2, id); place(x, ROOM_HEIGHT - 3, id); }
      break;
    }
    case 'vault': {
      const id = OBSTACLE_BASE + 6; // caja fuerte
      place(cx - 3, cy - 2, id); place(cx + 3, cy - 2, id);
      place(cx - 3, cy + 2, id); place(cx + 3, cy + 2, id);
      place(cx - 4, cy - 2, OBSTACLE_BASE + 3);
      place(cx + 4, cy + 2, OBSTACLE_BASE + 3);
      break;
    }
    case 'shelves': {
      const id = OBSTACLE_BASE + 2; // estantería
      for (let y = 2; y <= ROOM_HEIGHT - 3; y++) { place(3, y, id); place(ROOM_WIDTH - 4, y, id); }
      break;
    }
    case 'counters': {
      const id = OBSTACLE_BASE + 0;
      for (let x = 2; x < ROOM_WIDTH - 2; x++) { place(x, cy - 2, id); }
      for (let x = 2; x < ROOM_WIDTH - 2; x++) { place(x, cy + 2, OBSTACLE_BASE + 1); }
      break;
    }
    case 'scatter': {
      const count = rInt(5, 9);
      for (let i = 0; i < count; i++) {
        place(rInt(2, ROOM_WIDTH - 3), rInt(2, ROOM_HEIGHT - 3));
      }
      break;
    }
    default: break; // 'open'
  }

  // Toque decorativo: algún saco de dinero / escombro suelto
  if (random() < 0.6) {
    for (let i = 0; i < rInt(1, 3); i++) {
      place(rInt(2, ROOM_WIDTH - 3), rInt(2, ROOM_HEIGHT - 3), OBSTACLE_BASE + (random() < 0.5 ? 3 : 7));
    }
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
  const issues:string[]=[],start=map.rooms.get(map.startKey),item=map.rooms.get(map.itemRoomKey);
  if(!start?.doors.includes('W')||item?.type!==RoomType.ITEM||item.gx!==start.gx-1||item.gy!==start.gy) issues.push('west item room');
  if([...map.rooms.values()].filter(r=>r.type===RoomType.BOSS).length!==1) issues.push('boss count');
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
