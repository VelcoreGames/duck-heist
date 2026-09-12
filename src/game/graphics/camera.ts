import type { Camera2D, PixelRect } from './types';

export interface CameraRigOptions {
  viewportWidth: number;
  viewportHeight: number;
  follow: number;
  zoomFollow: number;
  lookAhead: number;
  deadZoneX: number;
  deadZoneY: number;
  traumaDecay: number;
  maxShake: number;
}

const DEFAULTS: CameraRigOptions = {
  viewportWidth: 480,
  viewportHeight: 352,
  follow: 0.18,
  zoomFollow: 0.12,
  lookAhead: 16,
  deadZoneX: 12,
  deadZoneY: 9,
  traumaDecay: 0.035,
  maxShake: 5,
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const approach = (value: number, target: number, amount: number) => value + (target - value) * clamp(amount, 0, 1);

/** Cámara visual independiente del gameplay. Su salida es top-left world-space. */
export class PixelCameraRig {
  private readonly options: CameraRigOptions;
  private x = 0;
  private y = 0;
  private zoom = 1;
  private targetZoom = 1;
  private trauma = 0;
  private frame = 0;
  private bounds?: PixelRect;
  private initialized = false;

  constructor(options: Partial<CameraRigOptions> = {}) {
    this.options = { ...DEFAULTS, ...options };
  }

  setBounds(bounds?: PixelRect): void {
    this.bounds = bounds;
  }

  setZoom(zoom: number, immediate = false): void {
    this.targetZoom = clamp(zoom, 0.5, 2.5);
    if (immediate) this.zoom = this.targetZoom;
  }

  addTrauma(amount: number): void {
    this.trauma = clamp(this.trauma + amount, 0, 1);
  }

  snapTo(targetX: number, targetY: number): void {
    const desired = this.desiredTopLeft(targetX, targetY, 0, 0);
    this.x = desired.x;
    this.y = desired.y;
    this.initialized = true;
    this.clampToBounds();
  }

  update(
    targetX: number,
    targetY: number,
    aimX = 0,
    aimY = 0,
    deltaFrames = 1,
  ): Camera2D {
    this.frame += Math.max(0, deltaFrames);
    this.zoom = approach(this.zoom, this.targetZoom, this.options.zoomFollow * Math.max(1, deltaFrames));
    const desired = this.desiredTopLeft(targetX, targetY, aimX, aimY);

    if (!this.initialized) {
      this.x = desired.x;
      this.y = desired.y;
      this.initialized = true;
    } else {
      const dx = desired.x - this.x;
      const dy = desired.y - this.y;
      const moveX = Math.abs(dx) <= this.options.deadZoneX ? 0 : dx - Math.sign(dx) * this.options.deadZoneX;
      const moveY = Math.abs(dy) <= this.options.deadZoneY ? 0 : dy - Math.sign(dy) * this.options.deadZoneY;
      const follow = 1 - Math.pow(1 - clamp(this.options.follow, 0, 1), Math.max(1, deltaFrames));
      this.x += moveX * follow;
      this.y += moveY * follow;
    }

    this.clampToBounds();
    this.trauma = Math.max(0, this.trauma - this.options.traumaDecay * Math.max(1, deltaFrames));
    const amplitude = this.options.maxShake * this.trauma * this.trauma;
    const shakeX = Math.sin(this.frame * 2.173 + 0.41) * amplitude;
    const shakeY = Math.sin(this.frame * 2.713 + 1.77) * amplitude;

    return { x: this.x, y: this.y, zoom: this.zoom, shakeX, shakeY };
  }

  current(): Camera2D {
    return { x: this.x, y: this.y, zoom: this.zoom };
  }

  private desiredTopLeft(targetX: number, targetY: number, aimX: number, aimY: number) {
    const magnitude = Math.hypot(aimX, aimY);
    const lookX = magnitude > 0.001 ? (aimX / magnitude) * this.options.lookAhead : 0;
    const lookY = magnitude > 0.001 ? (aimY / magnitude) * this.options.lookAhead * 0.65 : 0;
    return {
      x: targetX + lookX - this.options.viewportWidth / (2 * this.zoom),
      y: targetY + lookY - this.options.viewportHeight / (2 * this.zoom),
    };
  }

  private clampToBounds(): void {
    if (!this.bounds) return;
    const visibleW = this.options.viewportWidth / this.zoom;
    const visibleH = this.options.viewportHeight / this.zoom;
    const maxX = Math.max(this.bounds.x, this.bounds.x + this.bounds.w - visibleW);
    const maxY = Math.max(this.bounds.y, this.bounds.y + this.bounds.h - visibleH);
    this.x = clamp(this.x, this.bounds.x, maxX);
    this.y = clamp(this.y, this.bounds.y, maxY);
  }
}
