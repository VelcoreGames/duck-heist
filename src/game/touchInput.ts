// Controles táctiles de Duck Heist Móvil. Los controles en pantalla
// (src/TouchControls.tsx) escriben en touchState; este módulo lo traduce al
// mismo "control virtual" que usa el gamepad (engine.pad + acciones), así el
// motor del juego es exactamente el mismo en PC y en celular.
import { GameState } from './constants';
import type { GameEngine } from './types';
import type { PadAction } from './gamepad';

export type TouchState = {
  move: { x: number; y: number };
  aim: { x: number; y: number; active: boolean };
  pressed: Set<PadAction>;
  /** Toques pendientes: así un toque rapidísimo (menos de un cuadro) nunca se pierde. */
  queue: PadAction[];
  /** Ya usó los sticks: se ocultan las etiquetas de ayuda MOVER / APUNTAR. */
  learned: { move: boolean; aim: boolean };
  /** Disparo automático al enemigo más cercano mientras no se use el stick derecho. */
  auto: boolean;
};

export const touchState: TouchState = {
  move: { x: 0, y: 0 },
  aim: { x: 0, y: 0, active: false },
  pressed: new Set(),
  queue: [],
  learned: { move: false, aim: false },
  auto: false,
};

const ASSIST_CONE = Math.cos(34 * Math.PI / 180);
const AUTO_RANGE = 300;

function nearestEnemy(e: GameEngine, dirX = 0, dirY = 0) {
  const room = e.contents.get(e.currentKey);
  if (!room) return null;
  const px = e.player.x + 7, py = e.player.y + 8;
  const useCone = Math.hypot(dirX, dirY) > .2;
  let best: { x: number; y: number } | null = null, bestScore = Infinity;
  for (const en of room.enemies) {
    if (en.hp <= 0 || (en.spawnAnim ?? 0) > 0) continue;
    const ex = en.x + en.size / 2 - px, ey = en.y + en.size / 2 - py, d = Math.hypot(ex, ey);
    if (d < 1 || d > AUTO_RANGE) continue;
    if (useCone) {
      const dot = (ex * dirX + ey * dirY) / (d * Math.hypot(dirX, dirY));
      if (dot < ASSIST_CONE) continue;
      const score = d * (1.6 - dot);
      if (score < bestScore) { bestScore = score; best = { x: ex / d, y: ey / d }; }
    } else if (d < bestScore) { bestScore = d; best = { x: ex / d, y: ey / d }; }
  }
  return best;
}

export class TouchInput {
  private prev = new Set<PadAction>();
  poll(e: GameEngine, act: (action: PadAction) => void) {
    const live = e.state === GameState.PLAYING && !e.swap;
    let aimX = touchState.aim.active ? touchState.aim.x : 0;
    let aimY = touchState.aim.active ? touchState.aim.y : 0;
    let shoot = live && touchState.aim.active && Math.hypot(aimX, aimY) > .3;
    if (live) {
      // Ayuda de puntería: si hay un enemigo cerca de hacia donde apuntas, la bala va a él.
      if (shoot) {
        const t = nearestEnemy(e, aimX, aimY);
        if (t) { aimX = t.x; aimY = t.y; }
      } else if (touchState.auto) {
        const t = nearestEnemy(e);
        if (t) { aimX = t.x; aimY = t.y; shoot = true; }
      }
    }
    const moveX = live ? touchState.move.x : 0, moveY = live ? touchState.move.y : 0;
    // Sin apuntar: el pollito mira hacia donde camina (así se siente natural en el cel).
    if (!shoot && Math.hypot(aimX, aimY) < .18 && Math.hypot(moveX, moveY) > .25) { aimX = moveX; aimY = moveY; }
    e.pad = { connected: true, moveX, moveY, aimX, aimY, shoot };
    if (live) { e.lastInput = 'gamepad'; e.mouseDown = false; }
    if (Math.hypot(moveX, moveY, aimX, aimY) > .1 || touchState.pressed.size || touchState.queue.length) { e.lastInput = 'gamepad'; e.mouseDown = false; }
    const queued = touchState.queue.splice(0);
    for (const a of queued) act(a);
    this.prev = new Set(touchState.pressed);
  }
  reset(e: GameEngine) {
    touchState.move.x = touchState.move.y = 0;
    touchState.aim.active = false; touchState.pressed.clear(); touchState.queue.length = 0;
    e.pad = { connected: false, moveX: 0, moveY: 0, aimX: 0, aimY: 0, shoot: false };
    this.prev.clear();
  }
}
