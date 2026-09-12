import type { FrameStyle } from './types';

export type FloorPattern = 'checker' | 'grid' | 'stone' | 'metal' | 'gold';

export interface RoomMaterialTheme {
  id: string;
  floorA: string;
  floorB: string;
  grout: string;
  wall: string;
  wallShadow: string;
  trim: string;
  wood: string;
  metal: string;
  accent: string;
  gold: string;
  floorPattern: FloorPattern;
  floorTileSize: number;
  wallPanelWidth: number;
  lightColor: string;
  lightRadius: number;
  frameStyle: FrameStyle;
}

const frame = (
  ambientDarkness: number,
  ambientTint: string,
  tintStrength: number,
  vignette: number,
  shadowOpacity: number,
  shadowColor: string,
  lightStrength: number,
): FrameStyle => ({
  ambientDarkness,
  ambientTint,
  tintStrength,
  vignette,
  shadowOpacity,
  shadowColor,
  lightStrength,
  pixelSnap: true,
  cullingMargin: 28,
});

export const CHIBI_FLOOR_THEMES: readonly RoomMaterialTheme[] = [
  {
    id: 'branch_lobby',
    floorA: '#c9c1b2', floorB: '#b8b0a4', grout: '#8f8a82',
    wall: '#8e7865', wallShadow: '#5c4c41', trim: '#d5c7ab',
    wood: '#5f3f2f', metal: '#394650', accent: '#8f2634', gold: '#c99635',
    floorPattern: 'checker', floorTileSize: 32, wallPanelWidth: 64,
    lightColor: '#ffe1a8', lightRadius: 112,
    frameStyle: frame(0.06, '#e2cfad', 0.035, 0.10, 0.30, '#171a1f', 0.92),
  },
  {
    id: 'security',
    floorA: '#7e8990', floorB: '#6f7a82', grout: '#4e5860',
    wall: '#586873', wallShadow: '#35414a', trim: '#9fb6bf',
    wood: '#51433b', metal: '#303c44', accent: '#3f8caf', gold: '#b58a3a',
    floorPattern: 'grid', floorTileSize: 24, wallPanelWidth: 48,
    lightColor: '#9ed8ef', lightRadius: 104,
    frameStyle: frame(0.11, '#8fc0d8', 0.035, 0.16, 0.34, '#10161b', 0.95),
  },
  {
    id: 'archives',
    floorA: '#8b745a', floorB: '#79664f', grout: '#554736',
    wall: '#665141', wallShadow: '#3f332a', trim: '#b69a71',
    wood: '#6e462b', metal: '#4f5554', accent: '#b37945', gold: '#c9a050',
    floorPattern: 'stone', floorTileSize: 28, wallPanelWidth: 56,
    lightColor: '#e2b06f', lightRadius: 96,
    frameStyle: frame(0.14, '#d1a56d', 0.04, 0.18, 0.36, '#17120e', 0.90),
  },
  {
    id: 'executive',
    floorA: '#5b4a46', floorB: '#4d3f3c', grout: '#382d2c',
    wall: '#503b38', wallShadow: '#302526', trim: '#b18b65',
    wood: '#4b2d26', metal: '#514b4f', accent: '#9b394b', gold: '#d0a447',
    floorPattern: 'checker', floorTileSize: 32, wallPanelWidth: 64,
    lightColor: '#e7b386', lightRadius: 110,
    frameStyle: frame(0.16, '#b97063', 0.035, 0.22, 0.38, '#120e10', 0.88),
  },
  {
    id: 'vault',
    floorA: '#55575c', floorB: '#494b50', grout: '#313338',
    wall: '#4a4b51', wallShadow: '#292a2f', trim: '#9f9582',
    wood: '#49362e', metal: '#697078', accent: '#a87b2c', gold: '#e0b74e',
    floorPattern: 'metal', floorTileSize: 24, wallPanelWidth: 48,
    lightColor: '#d9c88c', lightRadius: 92,
    frameStyle: frame(0.19, '#d7bd79', 0.045, 0.24, 0.40, '#0b0c0e', 0.92),
  },
  {
    id: 'gold_reserve',
    floorA: '#725b2b', floorB: '#604c24', grout: '#423517',
    wall: '#6e5527', wallShadow: '#3c2e15', trim: '#d6b959',
    wood: '#5e3c25', metal: '#5f5946', accent: '#d8a832', gold: '#f0d56b',
    floorPattern: 'gold', floorTileSize: 24, wallPanelWidth: 48,
    lightColor: '#ffe69a', lightRadius: 126,
    frameStyle: frame(0.15, '#f2d375', 0.07, 0.20, 0.42, '#171106', 1.08),
  },
];

export function chibiThemeForFloor(floorIndex: number): RoomMaterialTheme {
  const index = Math.max(0, Math.min(CHIBI_FLOOR_THEMES.length - 1, floorIndex));
  return CHIBI_FLOOR_THEMES[index];
}
