// Controles táctiles de Duck Heist Móvil. Los controles en pantalla
// (src/TouchControls.tsx) escriben en touchState; este módulo lo traduce al
// mismo "control virtual" que usa el gamepad (engine.pad + acciones), así el
// motor del juego es exactamente el mismo en PC y en celular.
import { GameState } from './constants';
import type { GameEngine } from './types';
import type { PadAction } from './gamepad';

export type TouchState = {
  move: { x: number; y: number };
  /**
   * Botón de disparo. Mantenerlo dispara; sin arrastrar apunta solo al enemigo
   * más cercano; arrastrando apuntas a mano (con ayuda de puntería).
   */
  fire: { down: boolean; x: number; y: number };
  pressed: Set<PadAction>;
  /** Toques pendientes: así un toque rapidísimo (menos de un cuadro) nunca se pierde. */
  queue: PadAction[];
};

export const touchState: TouchState = {
  move: { x: 0, y: 0 },
  fire: { down: false, x: 0, y: 0 },
  pressed: new Set(),
  queue: [],
};

const ASSIST_CONE = Math.cos(34 * Math.PI / 180);
const AUTO_RANGE = 320;
const MANUAL_AIM = .32;

type Target = { x: number; y: number; wx: number; wy: number };

function nearestEnemy(e: GameEngine, dirX = 0, dirY = 0): Target | null {
  const room = e.contents.get(e.currentKey);
  if (!room) return null;
  const px = e.player.x + 7, py = e.player.y + 8;
  const useCone = Math.hypot(dirX, dirY) > .2;
  let best: Target | null = null, bestScore = Infinity;
  for (const en of room.enemies) {
    if (en.hp <= 0 || (en.spawnAnim ?? 0) > 0) continue;
    const cx = en.x + en.size / 2, cy = en.y + en.size / 2;
    const ex = cx - px, ey = cy - py, d = Math.hypot(ex, ey);
    if (d < 1 || d > AUTO_RANGE) continue;
    let score = d;
    if (useCone) {
      const dot = (ex * dirX + ey * dirY) / (d * Math.hypot(dirX, dirY));
      if (dot < ASSIST_CONE) continue;
      score = d * (1.6 - dot);
    }
    if (score < bestScore) { bestScore = score; best = { x: ex / d, y: ey / d, wx: cx, wy: cy }; }
  }
  return best;
}

export class TouchInput {
  poll(e: GameEngine, act: (action: PadAction) => void) {
    const live = e.state === GameState.PLAYING && !e.swap;
    const fire = touchState.fire;
    const moveX = live ? touchState.move.x : 0, moveY = live ? touchState.move.y : 0;
    let aimX = 0, aimY = 0, shoot = false;
    e.touchAim = null;
    if (live && fire.down) {
      shoot = true;
      const px = e.player.x + 7, py = e.player.y + 8;
      const manual = Math.hypot(fire.x, fire.y) > MANUAL_AIM;
      // Arrastrando: apuntas tú, y si hay un enemigo cerca de esa dirección la bala va a él.
      // Sin arrastrar: apunta solo al enemigo más cercano (o hacia donde mira el pollito).
      const t = manual ? nearestEnemy(e, fire.x, fire.y) : nearestEnemy(e);
      if (t) { aimX = t.x; aimY = t.y; e.touchAim = { x: t.wx, y: t.wy, locked: true }; }
      else {
        const a = manual ? Math.atan2(fire.y, fire.x) : e.player.facingAngle;
        aimX = Math.cos(a); aimY = Math.sin(a);
        e.touchAim = { x: px + aimX * 64, y: py + aimY * 64, locked: false };
      }
    } else if (Math.hypot(moveX, moveY) > .25) {
      // Sin disparar: el pollito mira hacia donde camina.
      aimX = moveX; aimY = moveY;
    }
    e.pad = { connected: true, moveX, moveY, aimX, aimY, shoot };
    if (live) { e.lastInput = 'gamepad'; e.mouseDown = false; }
    if (touchState.pressed.size || touchState.queue.length) e.lastInput = 'gamepad';
    const queued = touchState.queue.splice(0);
    for (const a of queued) act(a);
  }
  reset(e: GameEngine) {
    touchState.move.x = touchState.move.y = 0;
    touchState.fire.down = false; touchState.fire.x = touchState.fire.y = 0;
    touchState.pressed.clear(); touchState.queue.length = 0;
    e.pad = { connected: false, moveX: 0, moveY: 0, aimX: 0, aimY: 0, shoot: false };
    e.touchAim = null;
  }
}
