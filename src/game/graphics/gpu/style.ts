import type { FrameStyle } from '../types';
import type { GpuPostStyle } from './types';

function hexToRgb(hex: string): readonly [number, number, number] {
  const normalized = hex.replace('#', '').trim();
  if (normalized.length === 3) {
    return [
      parseInt(normalized[0] + normalized[0], 16) / 255,
      parseInt(normalized[1] + normalized[1], 16) / 255,
      parseInt(normalized[2] + normalized[2], 16) / 255,
    ];
  }
  if (normalized.length >= 6) {
    return [
      parseInt(normalized.slice(0, 2), 16) / 255,
      parseInt(normalized.slice(2, 4), 16) / 255,
      parseInt(normalized.slice(4, 6), 16) / 255,
    ];
  }
  return [1, 1, 1];
}

export function gpuPostStyleFromFrameStyle(
  style: FrameStyle,
  overrides: Partial<GpuPostStyle> = {},
): GpuPostStyle {
  return {
    ambientDarkness: overrides.ambientDarkness ?? style.ambientDarkness,
    ambientTint: overrides.ambientTint ?? hexToRgb(style.ambientTint),
    tintStrength: overrides.tintStrength ?? style.tintStrength,
    vignette: overrides.vignette ?? style.vignette,
    lightStrength: overrides.lightStrength ?? style.lightStrength,
    exposure: overrides.exposure ?? 1.18,
    gamma: overrides.gamma ?? 1.0,
    saturation: overrides.saturation ?? 1.06,
  };
}

export const DEFAULT_GPU_POST_STYLE: GpuPostStyle = {
  ambientDarkness: 0.08,
  ambientTint: [0.85, 0.78, 0.66],
  tintStrength: 0.03,
  vignette: 0.12,
  lightStrength: 1,
  exposure: 1.18,
  gamma: 1,
  saturation: 1.06,
};
