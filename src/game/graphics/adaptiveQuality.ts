import type { GraphicsQuality } from './quality';

const ORDER: readonly GraphicsQuality[] = ['low', 'medium', 'high', 'ultra'];

export interface AdaptiveQualityOptions {
  targetFps?: number;
  initial?: GraphicsQuality;
  downgradeFrames?: number;
  upgradeFrames?: number;
  cooldownFrames?: number;
}

export interface AdaptiveQualitySnapshot {
  quality: GraphicsQuality;
  averageFrameMs: number;
  targetFrameMs: number;
  slowFrames: number;
  fastFrames: number;
  changed: boolean;
}

/**
 * Hysteresis-based quality governor. It reacts slowly enough to avoid visual
 * oscillation and never changes gameplay timing; it only recommends a graphics tier.
 */
export class AdaptiveGraphicsQuality {
  private quality: GraphicsQuality;
  private average = 16.67;
  private slowFrames = 0;
  private fastFrames = 0;
  private cooldown = 0;
  private readonly targetFrameMs: number;
  private readonly downgradeFrames: number;
  private readonly upgradeFrames: number;
  private readonly cooldownFrames: number;

  constructor(options: AdaptiveQualityOptions = {}) {
    this.quality = options.initial ?? initialGraphicsQuality();
    this.targetFrameMs = 1000 / Math.max(30, options.targetFps ?? 60);
    this.downgradeFrames = Math.max(15, options.downgradeFrames ?? 90);
    this.upgradeFrames = Math.max(120, options.upgradeFrames ?? 600);
    this.cooldownFrames = Math.max(60, options.cooldownFrames ?? 300);
  }

  sample(frameMs: number): AdaptiveQualitySnapshot {
    const sample = Math.max(1, Math.min(100, frameMs));
    this.average += (sample - this.average) * 0.045;
    let changed = false;

    if (this.cooldown > 0) {
      this.cooldown--;
      this.slowFrames = 0;
      this.fastFrames = 0;
    } else {
      const slowThreshold = this.targetFrameMs * 1.18;
      const fastThreshold = this.targetFrameMs * 0.78;
      if (this.average > slowThreshold) {
        this.slowFrames++;
        this.fastFrames = Math.max(0, this.fastFrames - 2);
      } else if (this.average < fastThreshold) {
        this.fastFrames++;
        this.slowFrames = Math.max(0, this.slowFrames - 1);
      } else {
        this.slowFrames = Math.max(0, this.slowFrames - 1);
        this.fastFrames = Math.max(0, this.fastFrames - 1);
      }

      if (this.slowFrames >= this.downgradeFrames) {
        changed = this.shift(-1);
      } else if (this.fastFrames >= this.upgradeFrames) {
        changed = this.shift(1);
      }
    }

    return {
      quality: this.quality,
      averageFrameMs: this.average,
      targetFrameMs: this.targetFrameMs,
      slowFrames: this.slowFrames,
      fastFrames: this.fastFrames,
      changed,
    };
  }

  current(): GraphicsQuality {
    return this.quality;
  }

  set(quality: GraphicsQuality): void {
    this.quality = quality;
    this.slowFrames = 0;
    this.fastFrames = 0;
    this.cooldown = this.cooldownFrames;
  }

  private shift(delta: -1 | 1): boolean {
    const index = ORDER.indexOf(this.quality);
    const next = ORDER[Math.max(0, Math.min(ORDER.length - 1, index + delta))];
    if (next === this.quality) {
      this.slowFrames = 0;
      this.fastFrames = 0;
      return false;
    }
    this.quality = next;
    this.slowFrames = 0;
    this.fastFrames = 0;
    this.cooldown = this.cooldownFrames;
    return true;
  }
}

/** Conservative first guess; runtime governor refines it after real frame data. */
export function initialGraphicsQuality(): GraphicsQuality {
  if (typeof navigator === 'undefined') return 'medium';
  const nav = navigator as Navigator & { deviceMemory?: number };
  const memory = nav.deviceMemory ?? 4;
  const cores = navigator.hardwareConcurrency || 4;
  if (memory >= 8 && cores >= 8) return 'ultra';
  if (memory >= 4 && cores >= 6) return 'high';
  if (memory >= 3 && cores >= 4) return 'medium';
  return 'low';
}
