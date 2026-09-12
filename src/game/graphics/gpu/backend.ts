import { graphicsQualityProfile, type GraphicsQuality } from '../quality';
import type { GpuBackendOptions, GpuRendererBackend } from './types';
import { WebGLChibiRenderer } from './webglRenderer';
import { supportsWebGPU, WebGpuChibiRenderer } from './webgpuRenderer';

export interface CreateGpuBackendOptions {
  width: number;
  height: number;
  quality?: GraphicsQuality;
  powerPreference?: WebGLPowerPreference;
  preferWebGPU?: boolean;
}

function backendOptions(options: CreateGpuBackendOptions): GpuBackendOptions {
  const quality = graphicsQualityProfile(options.quality ?? 'high');
  return {
    logicalWidth: options.width,
    logicalHeight: options.height,
    maxSprites: options.quality === 'low' ? 1024 : options.quality === 'ultra' ? 4096 : 2048,
    maxLights: quality.maxLights,
    pixelSnap: true,
    powerPreference: options.powerPreference ?? 'high-performance',
  };
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

/** Synchronous compatibility path used by existing code. */
export function createGpuBackend(
  canvas: HTMLCanvasElement,
  options: CreateGpuBackendOptions,
): WebGLChibiRenderer | undefined {
  if (!supportsWebGL2()) return undefined;
  return new WebGLChibiRenderer(canvas, backendOptions(options));
}

/**
 * Preferred production path. WebGPU is attempted first and transparently
 * falls back to the proven WebGL2 renderer when the browser/device declines it.
 */
export async function createBestGpuBackend(
  canvas: HTMLCanvasElement,
  options: CreateGpuBackendOptions,
): Promise<GpuRendererBackend | undefined> {
  const config = backendOptions(options);
  if (options.preferWebGPU !== false && supportsWebGPU()) {
    const webgpu = await WebGpuChibiRenderer.create(canvas, config);
    if (webgpu) return webgpu;
  }
  if (!supportsWebGL2()) return undefined;
  return new WebGLChibiRenderer(canvas, config);
}
