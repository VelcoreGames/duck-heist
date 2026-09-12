import { RenderLayer } from '../types';
import type { GpuTextureRegion } from './types';
import { WebGLChibiRenderer } from './webglRenderer';

export type GpuParticleKind = 'dust' | 'spark' | 'crumb' | 'smoke' | 'glint';

export interface GpuParticleSpawn {
  kind: GpuParticleKind;
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  life?: number;
  size?: number;
  color?: readonly [number, number, number, number];
  gravity?: number;
  drag?: number;
  rotation?: number;
  spin?: number;
  region?: GpuTextureRegion;
}

interface Particle {
  alive: boolean;
  kind: GpuParticleKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  size: number;
  color: readonly [number, number, number, number];
  gravity: number;
  drag: number;
  rotation: number;
  spin: number;
  region?: GpuTextureRegion;
}

const DEFAULT_COLORS: Record<GpuParticleKind, readonly [number, number, number, number]> = {
  dust: [0.66, 0.58, 0.46, 0.58],
  spark: [1.0, 0.78, 0.26, 1.0],
  crumb: [0.72, 0.42, 0.19, 0.95],
  smoke: [0.36, 0.39, 0.43, 0.52],
  glint: [1.0, 0.95, 0.72, 0.95],
};

export class GpuParticleSystem {
  private readonly pool: Particle[];
  private cursor = 0;

  constructor(readonly capacity = 768) {
    this.pool = Array.from({ length: Math.max(32, capacity) }, () => ({
      alive: false,
      kind: 'dust' as const,
      x: 0, y: 0, vx: 0, vy: 0, age: 0, life: 1, size: 2,
      color: DEFAULT_COLORS.dust,
      gravity: 0, drag: 0.96, rotation: 0, spin: 0,
    }));
  }

  spawn(input: GpuParticleSpawn): void {
    const particle = this.pool[this.cursor++ % this.pool.length];
    particle.alive = true;
    particle.kind = input.kind;
    particle.x = input.x;
    particle.y = input.y;
    particle.vx = input.vx ?? 0;
    particle.vy = input.vy ?? 0;
    particle.age = 0;
    particle.life = Math.max(1, input.life ?? (input.kind === 'smoke' ? 42 : 24));
    particle.size = Math.max(0.5, input.size ?? (input.kind === 'smoke' ? 4 : 2));
    particle.color = input.color ?? DEFAULT_COLORS[input.kind];
    particle.gravity = input.gravity ?? (input.kind === 'crumb' ? 0.04 : 0);
    particle.drag = Math.max(0, Math.min(1, input.drag ?? (input.kind === 'smoke' ? 0.98 : 0.94)));
    particle.rotation = input.rotation ?? 0;
    particle.spin = input.spin ?? 0;
    particle.region = input.region;
  }

  burst(kind: GpuParticleKind, x: number, y: number, count: number, speed = 1.2): void {
    for (let i = 0; i < count; i++) {
      const angle = (i / Math.max(1, count)) * Math.PI * 2 + Math.random() * 0.45;
      const magnitude = speed * (0.45 + Math.random() * 0.75);
      this.spawn({
        kind,
        x,
        y,
        vx: Math.cos(angle) * magnitude,
        vy: Math.sin(angle) * magnitude,
        life: 16 + Math.random() * 22,
        size: 1 + Math.random() * (kind === 'smoke' ? 4 : 2.5),
        rotation: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.15,
      });
    }
  }

  update(dt = 1): void {
    const step = Math.max(0, Math.min(4, dt));
    for (const particle of this.pool) {
      if (!particle.alive) continue;
      particle.age += step;
      if (particle.age >= particle.life) {
        particle.alive = false;
        continue;
      }
      particle.vx *= Math.pow(particle.drag, step);
      particle.vy = particle.vy * Math.pow(particle.drag, step) + particle.gravity * step;
      particle.x += particle.vx * step;
      particle.y += particle.vy * step;
      particle.rotation += particle.spin * step;
    }
  }

  submit(renderer: WebGLChibiRenderer, maxParticles = this.capacity): number {
    let drawn = 0;
    for (const particle of this.pool) {
      if (!particle.alive || drawn >= maxParticles) continue;
      const life = 1 - particle.age / particle.life;
      const growth = particle.kind === 'smoke' ? 1 + particle.age / particle.life * 0.8 : 1;
      const size = particle.size * growth;
      const color: readonly [number, number, number, number] = [
        particle.color[0], particle.color[1], particle.color[2], particle.color[3] * life,
      ];
      renderer.submitSprite({
        id: `particle:${drawn}`,
        layer: RenderLayer.FX,
        sortY: particle.y,
        x: particle.x,
        y: particle.y,
        width: size,
        height: size,
        pivotX: size * 0.5,
        pivotY: size * 0.5,
        rotation: particle.rotation,
        color,
        blend: particle.kind === 'spark' || particle.kind === 'glint' ? 'add' : 'alpha',
        region: particle.region ?? { textureId: '__white', u0: 0, v0: 0, u1: 1, v1: 1 },
        effects: particle.kind === 'smoke' ? { shape: 'ellipse' } : undefined,
      });
      drawn++;
    }
    renderer.markParticles(drawn);
    return drawn;
  }

  clear(): void {
    for (const particle of this.pool) particle.alive = false;
  }
}
