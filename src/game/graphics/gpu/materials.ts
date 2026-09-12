import type { GpuSpriteCommand, GpuSpriteEffects } from './types';

export type PixelMaterialPreset = 'matte' | 'metal' | 'gold' | 'glass' | 'emissive' | 'polished';

export const PIXEL_MATERIALS: Record<PixelMaterialPreset, Readonly<GpuSpriteEffects>> = {
  matte: { outline: 0.32, rim: 0.06 },
  metal: { outline: 0.38, rim: 0.18, metallic: 0.78, sheen: 0.38 },
  gold: { outline: 0.34, rim: 0.22, emissive: 0.08, metallic: 0.94, sheen: 0.82 },
  glass: { outline: 0.22, rim: 0.52, sheen: 0.72, glass: 0.82 },
  emissive: { outline: 0.18, rim: 0.64, emissive: 0.92, sheen: 0.30 },
  polished: { outline: 0.28, rim: 0.26, metallic: 0.58, sheen: 0.94 },
};

const mix = (base: number | undefined, material: number | undefined, strength: number) => {
  const a = base ?? 0;
  const b = material ?? 0;
  return a + (b - a) * strength;
};

/**
 * Applies a stylized material response without touching gameplay state.
 * Existing per-sprite effects remain authoritative and are blended toward
 * the chosen material preset by `strength`.
 */
export function materialEffects(
  preset: PixelMaterialPreset,
  existing: GpuSpriteEffects = {},
  strength = 1,
): GpuSpriteEffects {
  const material = PIXEL_MATERIALS[preset];
  const t = Math.max(0, Math.min(1, strength));
  return {
    ...existing,
    outline: mix(existing.outline, material.outline, t),
    rim: mix(existing.rim, material.rim, t),
    emissive: mix(existing.emissive, material.emissive, t),
    metallic: mix(existing.metallic, material.metallic, t),
    sheen: mix(existing.sheen, material.sheen, t),
    glass: mix(existing.glass, material.glass, t),
  };
}

export function withPixelMaterial(
  command: GpuSpriteCommand,
  preset: PixelMaterialPreset,
  strength = 1,
): GpuSpriteCommand {
  return { ...command, effects: materialEffects(preset, command.effects, strength) };
}
