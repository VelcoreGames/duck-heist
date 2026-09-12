import { RenderLayer, type PixelRect, type RenderCommand } from './types';

export type PixelParticleShape = 'pixel' | 'spark' | 'smoke' | 'crumb';

export interface PixelParticleSpawn {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  life?: number;
  size?: number;
  color?: string;
  gravity?: number;
  drag?: number;
  alpha?: number;
  shape?: PixelParticleShape;
}

interface PixelParticle extends Required<PixelParticleSpawn> {
  age: number;
}

const defaults = (spawn: PixelParticleSpawn): PixelParticle => ({
  x: spawn.x,
  y: spawn.y,
  vx: spawn.vx ?? 0,
  vy: spawn.vy ?? 0,
  life: Math.max(1, spawn.life ?? 24),
  size: Math.max(1, spawn.size ?? 2),
  color: spawn.color ?? '#fff3bd',
  gravity: spawn.gravity ?? 0,
  drag: Math.max(0, Math.min(1, spawn.drag ?? 0.97)),
  alpha: Math.max(0, Math.min(1, spawn.alpha ?? 1)),
  shape: spawn.shape ?? 'pixel',
  age: 0,
});

/** FX puramente visuales; nunca participan en colisiones o gameplay. */
export class PixelFxSystem {
  private readonly particles: PixelParticle[] = [];

  constructor(private budget = 192) {}

  setBudget(budget: number): void {
    this.budget = Math.max(0, Math.floor(budget));
    if (this.particles.length > this.budget) this.particles.splice(0, this.particles.length - this.budget);
  }

  spawn(spawn: PixelParticleSpawn): void {
    if (this.budget <= 0) return;
    if (this.particles.length >= this.budget) this.particles.shift();
    this.particles.push(defaults(spawn));
  }

  burst(
    x: number,
    y: number,
    count: number,
    factory: (index: number, angle: number) => Omit<PixelParticleSpawn, 'x' | 'y'>,
  ): void {
    const safeCount = Math.max(0, Math.min(count, this.budget));
    for (let i = 0; i < safeCount; i++) {
      const angle = (i / Math.max(1, safeCount)) * Math.PI * 2;
      this.spawn({ x, y, ...factory(i, angle) });
    }
  }

  update(deltaFrames = 1): void {
    const dt = Math.max(0, Math.min(4, deltaFrames));
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += dt;
      if (p.age >= p.life) {
        this.particles.splice(i, 1);
        continue;
      }
      p.vx *= Math.pow(p.drag, dt);
      p.vy = p.vy * Math.pow(p.drag, dt) + p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  command(id = 'pixel-fx'): RenderCommand {
    const bounds = this.bounds();
    return {
      id,
      layer: RenderLayer.FX,
      sortY: Number.MAX_SAFE_INTEGER,
      bounds,
      draw: ctx => this.draw(ctx),
    };
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (const p of this.particles) {
      const life = Math.max(0, 1 - p.age / p.life);
      ctx.globalAlpha = p.alpha * life;
      ctx.fillStyle = p.color;
      const x = Math.round(p.x);
      const y = Math.round(p.y);
      const size = Math.max(1, Math.round(p.size));
      if (p.shape === 'spark') {
        ctx.fillRect(x - size, y, size * 2 + 1, 1);
        ctx.fillRect(x, y - size, 1, size * 2 + 1);
      } else if (p.shape === 'smoke') {
        const puff = Math.max(2, Math.round(size + p.age * 0.08));
        ctx.globalAlpha *= 0.7;
        ctx.fillRect(x - puff, y - puff, puff * 2, puff * 2);
      } else if (p.shape === 'crumb') {
        ctx.fillRect(x, y, size + 1, size);
        if (size > 1) ctx.fillRect(x + 1, y - 1, size - 1, 1);
      } else {
        ctx.fillRect(x, y, size, size);
      }
    }
    ctx.restore();
  }

  clear(): void {
    this.particles.length = 0;
  }

  size(): number {
    return this.particles.length;
  }

  private bounds(): PixelRect | undefined {
    if (!this.particles.length) return undefined;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of this.particles) {
      const pad = Math.max(2, p.size * 2);
      minX = Math.min(minX, p.x - pad);
      minY = Math.min(minY, p.y - pad);
      maxX = Math.max(maxX, p.x + pad);
      maxY = Math.max(maxY, p.y + pad);
    }
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }
}
