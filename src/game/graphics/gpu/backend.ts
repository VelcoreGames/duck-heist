import { graphicsQualityProfile, type GraphicsQuality } from '../quality';
import { WebGLChibiRenderer } from './webglRenderer';

export interface CreateGpuBackendOptions {
  width: number;
  height: number;
  quality?: GraphicsQuality;
  powerPreference?: WebGLPowerPreference;
}

export function supportsWebGL2(): boolean {
  if (typeof document === 'undefined') return false;
  const probe = document.createElement('canvas');
  try {
    return !!probe.getContext('webgl2', {
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'high-performance',
    });
  } catch {
    return false;
  }
}

export function createGpuBackend(
  canvas: HTMLCanvasElement,
  options: CreateGpuBackendOptions,
): WebGLChibiRenderer | undefined {
  if (!supportsWebGL2()) return undefined;
  const quality = graphicsQualityProfile(options.quality ?? 'high');
  return new WebGLChibiRenderer(canvas, {
    logicalWidth: options.width,
    logicalHeight: options.height,
    maxSprites: options.quality === 'low' ? 1024 : options.quality === 'ultra' ? 4096 : 2048,
    maxLights: quality.maxLights,
    pixelSnap: true,
    powerPreference: options.powerPreference ?? 'high-performance',
  });
}
