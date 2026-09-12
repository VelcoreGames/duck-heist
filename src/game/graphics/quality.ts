export type GraphicsQuality = 'low' | 'medium' | 'high' | 'ultra';

export interface GraphicsQualityProfile {
  id: GraphicsQuality;
  maxLights: number;
  particleBudget: number;
  surfaceCachePixels: number;
  lightStrengthScale: number;
  vignetteScale: number;
  cullingMargin: number;
}

export const GRAPHICS_QUALITY: Record<GraphicsQuality, GraphicsQualityProfile> = {
  low: {
    id: 'low',
    maxLights: 6,
    particleBudget: 64,
    surfaceCachePixels: 480 * 352 * 6,
    lightStrengthScale: 0.72,
    vignetteScale: 0.85,
    cullingMargin: 12,
  },
  medium: {
    id: 'medium',
    maxLights: 12,
    particleBudget: 128,
    surfaceCachePixels: 480 * 352 * 10,
    lightStrengthScale: 0.88,
    vignetteScale: 0.94,
    cullingMargin: 20,
  },
  high: {
    id: 'high',
    maxLights: 20,
    particleBudget: 224,
    surfaceCachePixels: 480 * 352 * 16,
    lightStrengthScale: 1,
    vignetteScale: 1,
    cullingMargin: 28,
  },
  ultra: {
    id: 'ultra',
    maxLights: 32,
    particleBudget: 384,
    surfaceCachePixels: 480 * 352 * 24,
    lightStrengthScale: 1.08,
    vignetteScale: 1.05,
    cullingMargin: 40,
  },
};

export function graphicsQualityProfile(quality: GraphicsQuality): GraphicsQualityProfile {
  return GRAPHICS_QUALITY[quality];
}
