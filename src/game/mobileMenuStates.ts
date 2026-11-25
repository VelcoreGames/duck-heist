// Duck Heist Móvil: qué pantallas se dibujan como menú táctil (HTML grande) en vez
// del menú del canvas, y cuáles conservan el canvas con una barra táctil abajo.
// Lo usan render.ts (para no dibujar dos veces) y MobileMenus.tsx.
import { GameState } from './constants';
import type { GameEngine } from './types';

const DOM_STATES = new Set<GameState>([
  GameState.MENU, GameState.DIFFICULTY, GameState.PAUSED, GameState.CONFIRM,
  GameState.SETTINGS, GameState.HOW_TO_PLAY, GameState.UPGRADES, GameState.ENDLESS_RESUME,
  GameState.WARDROBE, GameState.RUN_INFO,
]);

/** La pantalla completa la dibuja el menú táctil (el canvas no dibuja su menú). */
export function mobileDomMenu(e: GameEngine): boolean {
  if (!e.touchMode) return false;
  if (DOM_STATES.has(e.state)) return true;
  return (e.state === GameState.GAME_OVER || e.state === GameState.VICTORY) && e.gameMode !== 'daily';
}
