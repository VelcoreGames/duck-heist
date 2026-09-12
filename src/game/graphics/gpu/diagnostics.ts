import type { GraphicsQuality } from '../quality';
import type { GpuCapabilities } from './types';

export interface GpuDiagnosticReport {
  recommendedQuality: GraphicsQuality;
  score: number;
  warnings: string[];
}

export function diagnoseGpu(capabilities: GpuCapabilities): GpuDiagnosticReport {
  let score = 100;
  const warnings: string[] = [];
  if (!capabilities.webgl2) {
    return { recommendedQuality: 'low', score: 0, warnings: ['WebGL2 unavailable'] };
  }
  if (capabilities.maxTextureSize < 4096) {
    score -= 30;
    warnings.push('Texture size is below 4096px; large atlases must be split.');
  }
  if (capabilities.maxTextureUnits < 8) {
    score -= 20;
    warnings.push('Limited texture units; complex material passes should stay disabled.');
  }
  if (capabilities.maxSamples < 4) score -= 5; // informational; pixel-art path does not require MSAA.

  const name = `${capabilities.vendor ?? ''} ${capabilities.renderer ?? ''}`.toLowerCase();
  if (/swiftshader|llvmpipe|software/.test(name)) {
    score = Math.min(score, 30);
    warnings.push('Software WebGL renderer detected.');
  }

  const recommendedQuality: GraphicsQuality =
    score >= 90 ? 'ultra' : score >= 70 ? 'high' : score >= 45 ? 'medium' : 'low';
  return { recommendedQuality, score: Math.max(0, score), warnings };
}
