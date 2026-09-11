import { CANVAS_WIDTH, CANVAS_HEIGHT } from './constants';
import type { GameEngine } from './types';

/** Aim is always computed from the current cursor or right stick, never from movement. */
export function aimVector(e: GameEngine): { x: number; y: number } {
  const px = e.player.x + 7, py = e.player.y + 8;
  if (e.lastInput === 'gamepad' && e.pad.connected && Math.hypot(e.pad.aimX, e.pad.aimY) > .18) {
    const len = Math.hypot(e.pad.aimX, e.pad.aimY) || 1;
    return { x: e.pad.aimX / len, y: e.pad.aimY / len };
  }
  const dx = e.mouseX - px, dy = e.mouseY - py, len = Math.hypot(dx, dy);
  if (len > 4) return { x: dx / len, y: dy / len };
  const last = e.player.facingAngle;
  return { x: Math.cos(last), y: Math.sin(last) };
}

export function grenadeLanding(e: GameEngine) {
  const origin = { x: e.player.x + 7, y: e.player.y + 8 };
  const aim = aimVector(e);
  const reach = Math.min(148, Math.max(36, Math.hypot(e.mouseX - origin.x, e.mouseY - origin.y)));
  return {
    x: Math.max(24, Math.min(CANVAS_WIDTH - 24, origin.x + aim.x * reach)),
    y: Math.max(24, Math.min(CANVAS_HEIGHT - 24, origin.y + aim.y * reach)),
    aim, reach,
  };
}
