import type { FrameStyle } from './types';

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
  frameStyle: FrameStyle;
}

export const CHIBI_FLOOR_THEMES: readonly RoomMaterialTheme[] = [
  {
    id: 'branch_lobby',
    floorA: '#c9c1b2', floorB: '#b8b0a4', grout: '#8f8a82',
    wall: '#8e7865', wallShadow: '#5c4c41', trim: '#d5c7ab',
    wood: '#5f3f2f', metal: '#394650', accent: '#8f2634', gold: '#c99635',
    frameStyle: {
      ambientDarkness: 0.06, ambientTint: '#e2cfad', tintStrength: 0.035,
      vignette: 0.10, shadowOpacity: 0.30, shadowColor: '#171a1f',
    },
  },
  {
    id: 'security',
    floorA: '#7e8990', floorB: '#6f7a82', grout: '#4e5860',
    wall: '#586873', wallShadow: '#35414a', trim: '#9fb6bf',
    wood: '#51433b', metal: '#303c44', accent: '#3f8caf', gold: '#b58a3a',
    frameStyle: {
      ambientDarkness: 0.11, ambientTint: '#8fc0d8', tintStrength: 0.035,
      vignette: 0.16, shadowOpacity: 0.34, shadowColor: '#10161b',
    },
  },
  {
    id: 'archives',
    floorA: '#8b745a', floorB: '#79664f', grout: '#554736',
    wall: '#665141', wallShadow: '#3f332a', trim: '#b69a71',
    wood: '#6e462b', metal: '#4f5554', accent: '#b37945', gold: '#c9a050',
    frameStyle: {
      ambientDarkness: 0.14, ambientTint: '#d1a56d', tintStrength: 0.04,
      vignette: 0.18, shadowOpacity: 0.36, shadowColor: '#17120e',
    },
  },
  {
    id: 'executive',
    floorA: '#5b4a46', floorB: '#4d3f3c', grout: '#382d2c',
    wall: '#503b38', wallShadow: '#302526', trim: '#b18b65',
    wood: '#4b2d26', metal: '#514b4f', accent: '#9b394b', gold: '#d0a447',
    frameStyle: {
      ambientDarkness: 0.16, ambientTint: '#b97063', tintStrength: 0.035,
      vignette: 0.22, shadowOpacity: 0.38, shadowColor: '#120e10',
    },
  },
  {
    id: 'vault',
    floorA: '#55575c', floorB: '#494b50', grout: '#313338',
    wall: '#4a4b51', wallShadow: '#292a2f', trim: '#9f9582',
    wood: '#49362e', metal: '#697078', accent: '#a87b2c', gold: '#e0b74e',
    frameStyle: {
      ambientDarkness: 0.19, ambientTint: '#d7bd79', tintStrength: 0.045,
      vignette: 0.24, shadowOpacity: 0.40, shadowColor: '#0b0c0e',
    },
  },
  {
    id: 'gold_reserve',
    floorA: '#725b2b', floorB: '#604c24', grout: '#423517',
    wall: '#6e5527', wallShadow: '#3c2e15', trim: '#d6b959',
    wood: '#5e3c25', metal: '#5f5946', accent: '#d8a832', gold: '#f0d56b',
    frameStyle: {
      ambientDarkness: 0.15, ambientTint: '#f2d375', tintStrength: 0.07,
      vignette: 0.20, shadowOpacity: 0.42, shadowColor: '#171106',
    },
  },
];

export function chibiThemeForFloor(floorIndex: number): RoomMaterialTheme {
  const index = Math.max(0, Math.min(CHIBI_FLOOR_THEMES.length - 1, floorIndex));
  return CHIBI_FLOOR_THEMES[index];
}
