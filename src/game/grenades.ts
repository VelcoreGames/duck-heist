import { TILE_SIZE, ROOM_WIDTH, ROOM_HEIGHT, CANVAS_WIDTH, CANVAS_HEIGHT, TILE_WALL, TILE_DOOR, OBSTACLE_BASE } from './constants';
import type { GameEngine, Projectile, RoomContent } from './types';
import type { MapRoom } from './mapgen';
import { grenadeLanding } from './aim';
import { playBounce, playExplosion } from './audio';

export interface ThrownGrenade {
  x: number; y: number; z: number; vz: number;
  vx: number; vy: number;
  fuse: number; airborne: boolean;
  rot: number; damage: number; radius: number; burning: boolean;
}

export function throwBreadGrenade(e: GameEngine): ThrownGrenade {
  const originX = e.player.x + 7, originY = e.player.y + 8;
  const land = grenadeLanding(e);
  const dx = land.x - originX, dy = land.y - originY;
  const dist = Math.hypot(dx, dy) || 1;
  const travel = Math.max(18, dist / 3.4);
  return {
    x: originX, y: originY, z: 2, vz: 3.4,
    vx: dx / travel, vy: dy / travel,
    fuse: 48, airborne: true, rot: 0,
    damage: 45, radius: 74, burning: e.player.items.includes('hot_sauce') || e.player.items.includes('burnt_bread'),
  };
}

export function updateGrenades(
  e: GameEngine, room: MapRoom, content: RoomContent,
  explode: (engine: GameEngine, p: Projectile, content: RoomContent, hurtPlayer?: boolean) => void,
) {
  const list = e.grenades;
  for (let i = list.length - 1; i >= 0; i--) {
    const g = list[i];
    g.rot += .18;
    if (g.airborne) {
      g.x += g.vx; g.y += g.vy; g.z += g.vz; g.vz -= .22;
      const tx = Math.floor(g.x / TILE_SIZE), ty = Math.floor(g.y / TILE_SIZE);
      const outside = tx < 0 || ty < 0 || tx >= ROOM_WIDTH || ty >= ROOM_HEIGHT;
      const tile = outside ? TILE_WALL : room.layout[ty][tx];
      const solid = outside || tile === TILE_WALL || tile >= OBSTACLE_BASE || (tile === TILE_DOOR && !room.cleared);
      if (solid) {
        g.vx *= -.35; g.vy *= -.35;
        g.x = Math.max(20, Math.min(CANVAS_WIDTH - 20, g.x + g.vx));
        g.y = Math.max(20, Math.min(CANVAS_HEIGHT - 20, g.y + g.vy));
      }
      if (g.z <= 0) {
        g.z = 0; g.airborne = false; g.vx *= .2; g.vy *= .2; playBounce();
      }
    } else {
      g.vx *= .82; g.vy *= .82; g.x += g.vx; g.y += g.vy;
      if (--g.fuse <= 0) {
        explode(e, {
          x: g.x, y: g.y, vx: 0, vy: 0, type: 'baguette', damage: g.damage, friendly: true,
          lifetime: 1, maxLifetime: 1, bounces: 0, piercing: false, boomerang: false, boomerangPhase: 0,
          hitEnemies: new Set(), burning: g.burning, explode: g.radius, focusTarget: -1, focusTime: 0,
          sourceWeapon: 'bread_grenade',
        }, content, false);
        playExplosion();
        list.splice(i, 1);
      }
    }
  }
}
