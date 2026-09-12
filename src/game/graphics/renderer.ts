import type {
  Camera2D,
  FrameStyle,
  GraphicsStats,
  LightSource,
  PixelPoint,
  PixelRect,
  RenderCommand,
} from './types';
import type { GraphicsQualityProfile } from './quality';

const createSurface = (width: number, height: number): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

const prepareContext = (ctx: CanvasRenderingContext2D) => {
  ctx.imageSmoothingEnabled = false;
  ctx.textBaseline = 'top';
};

const intersects = (a: PixelRect, b: PixelRect) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

const emptyStats = (): GraphicsStats => ({
  submitted: 0,
  drawn: 0,
  worldDrawn: 0,
  screenDrawn: 0,
  culled: 0,
  lights: 0,
});

export const DEFAULT_FRAME_STYLE: FrameStyle = {
  ambientDarkness: 0.08,
  ambientTint: '#d9c8a9',
  tintStrength: 0.03,
  vignette: 0.12,
  shadowOpacity: 0.28,
  shadowColor: '#11151c',
  lightStrength: 1,
  pixelSnap: true,
  cullingMargin: 28,
};

interface RuntimeQuality {
  maxLights: number;
  lightStrengthScale: number;
  vignetteScale: number;
  cullingMargin: number;
}

const DEFAULT_QUALITY: RuntimeQuality = {
  maxLights: 20,
  lightStrengthScale: 1,
  vignetteScale: 1,
  cullingMargin: 28,
};

/**
 * Compositor Canvas2D pixel-perfect para Duck Heist.
 * Separa comandos de mundo y pantalla para que la cámara nunca transforme HUD/overlays.
 */
export class ChibiGraphicsEngine {
  readonly width: number;
  readonly height: number;

  private readonly scene: HTMLCanvasElement;
  private readonly light: HTMLCanvasElement;
  private readonly sceneCtx: CanvasRenderingContext2D;
  private readonly lightCtx: CanvasRenderingContext2D;
  private readonly commands: RenderCommand[] = [];
  private readonly lights: LightSource[] = [];
  private camera: Camera2D = { x: 0, y: 0, zoom: 1 };
  private style: FrameStyle = DEFAULT_FRAME_STYLE;
  private quality: RuntimeQuality = { ...DEFAULT_QUALITY };
  private stats: GraphicsStats = emptyStats();
  private frameTick = 0;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.scene = createSurface(width, height);
    this.light = createSurface(width, height);
    const sceneCtx = this.scene.getContext('2d', { alpha: true });
    const lightCtx = this.light.getContext('2d', { alpha: true });
    if (!sceneCtx || !lightCtx) throw new Error('Duck Heist graphics engine requires Canvas2D');
    this.sceneCtx = sceneCtx;
    this.lightCtx = lightCtx;
    prepareContext(sceneCtx);
    prepareContext(lightCtx);
  }

  configureQuality(profile: GraphicsQualityProfile): void {
    this.quality = {
      maxLights: Math.max(0, Math.floor(profile.maxLights)),
      lightStrengthScale: Math.max(0, profile.lightStrengthScale),
      vignetteScale: Math.max(0, profile.vignetteScale),
      cullingMargin: Math.max(0, profile.cullingMargin),
    };
  }

  beginFrame(
    camera: Partial<Camera2D> = {},
    style: Partial<FrameStyle> = {},
    frameTick = 0,
  ): CanvasRenderingContext2D {
    this.camera = {
      x: camera.x ?? 0,
      y: camera.y ?? 0,
      zoom: camera.zoom ?? 1,
      shakeX: camera.shakeX ?? 0,
      shakeY: camera.shakeY ?? 0,
    };
    this.style = { ...DEFAULT_FRAME_STYLE, ...style };
    this.frameTick = frameTick;
    this.commands.length = 0;
    this.lights.length = 0;
    this.stats = emptyStats();
    this.resetScene();
    return this.sceneCtx;
  }

  submit(command: RenderCommand): void {
    this.commands.push(command);
    this.stats.submitted++;
  }

  addLight(light: LightSource): void {
    const maxLights = this.quality.maxLights;
    if (maxLights <= 0 || light.intensity <= 0 || light.radius <= 0) return;
    if (this.lights.length < maxLights) {
      this.lights.push(light);
    } else {
      let weakestIndex = 0;
      let weakestScore = Infinity;
      for (let i = 0; i < this.lights.length; i++) {
        const candidate = this.lights[i];
        const score = candidate.intensity * Math.sqrt(candidate.radius);
        if (score < weakestScore) {
          weakestScore = score;
          weakestIndex = i;
        }
      }
      const incomingScore = light.intensity * Math.sqrt(light.radius);
      if (incomingScore > weakestScore) this.lights[weakestIndex] = light;
    }
    this.stats.lights = this.lights.length;
  }

  worldToScreen(point: PixelPoint): PixelPoint {
    const zoom = Math.max(0.25, this.camera.zoom);
    const x = (point.x - this.camera.x) * zoom + (this.camera.shakeX ?? 0);
    const y = (point.y - this.camera.y) * zoom + (this.camera.shakeY ?? 0);
    return this.style.pixelSnap ? { x: Math.round(x), y: Math.round(y) } : { x, y };
  }

  screenToWorld(point: PixelPoint): PixelPoint {
    const zoom = Math.max(0.25, this.camera.zoom);
    return {
      x: (point.x - (this.camera.shakeX ?? 0)) / zoom + this.camera.x,
      y: (point.y - (this.camera.shakeY ?? 0)) / zoom + this.camera.y,
    };
  }

  frameStats(): Readonly<GraphicsStats> {
    return this.stats;
  }

  renderQueued(target: CanvasRenderingContext2D, drawBackground?: (ctx: CanvasRenderingContext2D) => void): void {
    const ctx = this.sceneCtx;
    const view = this.worldViewBounds();
    const zoom = Math.max(0.25, this.camera.zoom);
    const rawTx = (this.camera.shakeX ?? 0) - this.camera.x * zoom;
    const rawTy = (this.camera.shakeY ?? 0) - this.camera.y * zoom;
    const tx = this.style.pixelSnap ? Math.round(rawTx) : rawTx;
    const ty = this.style.pixelSnap ? Math.round(rawTy) : rawTy;

    this.commands.sort((a, b) =>
      a.layer - b.layer ||
      (a.sortY + (a.depthBias ?? 0)) - (b.sortY + (b.depthBias ?? 0)) ||
      (a.order ?? 0) - (b.order ?? 0),
    );

    ctx.save();
    ctx.translate(tx, ty);
    ctx.scale(zoom, zoom);
    drawBackground?.(ctx);
    for (const command of this.commands) {
      if ((command.space ?? 'world') === 'screen') continue;
      if (command.visible === false || (command.bounds && !intersects(command.bounds, view))) {
        this.stats.culled++;
        continue;
      }
      this.drawCommand(ctx, command);
      this.stats.drawn++;
      this.stats.worldDrawn++;
    }
    ctx.restore();

    // Los comandos screen-space se ejecutan con transform identidad y siempre después del mundo.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (const command of this.commands) {
      if ((command.space ?? 'world') !== 'screen') continue;
      if (command.visible === false) {
        this.stats.culled++;
        continue;
      }
      if (command.bounds && !intersects(command.bounds, { x: 0, y: 0, w: this.width, h: this.height })) {
        this.stats.culled++;
        continue;
      }
      this.drawCommand(ctx, command);
      this.stats.drawn++;
      this.stats.screenDrawn++;
    }

    this.presentScene(target);
  }

  /** Puente de migración: mantiene el renderer clásico dentro del compositor nuevo. */
  processLegacyFrame(
    source: CanvasImageSource,
    target: CanvasRenderingContext2D,
    style: Partial<FrameStyle> = {},
  ): void {
    this.style = { ...DEFAULT_FRAME_STYLE, ...style };
    this.commands.length = 0;
    this.lights.length = 0;
    this.stats = emptyStats();
    this.resetScene();
    this.sceneCtx.drawImage(source, 0, 0, this.width, this.height);
    this.presentScene(target);
  }

  dispose(): void {
    this.commands.length = 0;
    this.lights.length = 0;
    this.scene.width = 1;
    this.scene.height = 1;
    this.light.width = 1;
    this.light.height = 1;
  }

  private resetScene(): void {
    this.sceneCtx.setTransform(1, 0, 0, 1, 0, 0);
    this.sceneCtx.globalAlpha = 1;
    this.sceneCtx.globalCompositeOperation = 'source-over';
    this.sceneCtx.clearRect(0, 0, this.width, this.height);
    prepareContext(this.sceneCtx);
  }

  private drawCommand(ctx: CanvasRenderingContext2D, command: RenderCommand): void {
    ctx.save();
    try {
      if (command.clip) {
        ctx.beginPath();
        ctx.rect(command.clip.x, command.clip.y, command.clip.w, command.clip.h);
        ctx.clip();
      }
      if (command.alpha !== undefined) ctx.globalAlpha *= Math.max(0, Math.min(1, command.alpha));
      if (command.composite) ctx.globalCompositeOperation = command.composite;
      command.draw(ctx);
    } finally {
      ctx.restore();
    }
  }

  private worldViewBounds(): PixelRect {
    const zoom = Math.max(0.25, this.camera.zoom);
    const margin = Math.max(this.style.cullingMargin, this.quality.cullingMargin) / zoom;
    return {
      x: this.camera.x - (this.camera.shakeX ?? 0) / zoom - margin,
      y: this.camera.y - (this.camera.shakeY ?? 0) / zoom - margin,
      w: this.width / zoom + margin * 2,
      h: this.height / zoom + margin * 2,
    };
  }

  private presentScene(target: CanvasRenderingContext2D): void {
    target.save();
    prepareContext(target);
    target.setTransform(1, 0, 0, 1, 0, 0);
    target.globalAlpha = 1;
    target.globalCompositeOperation = 'source-over';
    target.clearRect(0, 0, this.width, this.height);
    target.drawImage(this.scene, 0, 0);

    if (this.style.tintStrength > 0) {
      target.globalAlpha = Math.max(0, Math.min(1, this.style.tintStrength));
      target.fillStyle = this.style.ambientTint;
      target.fillRect(0, 0, this.width, this.height);
      target.globalAlpha = 1;
    }

    if (this.style.ambientDarkness > 0) {
      target.fillStyle = `rgba(4,7,12,${Math.max(0, Math.min(0.9, this.style.ambientDarkness))})`;
      target.fillRect(0, 0, this.width, this.height);
    }

    this.renderLights();
    const lightStrength = this.style.lightStrength * this.quality.lightStrengthScale;
    if (this.lights.length && lightStrength > 0) {
      target.globalCompositeOperation = 'screen';
      target.globalAlpha = Math.max(0, Math.min(1, lightStrength));
      target.drawImage(this.light, 0, 0);
      target.globalAlpha = 1;
      target.globalCompositeOperation = 'source-over';
    }

    const vignette = this.style.vignette * this.quality.vignetteScale;
    if (vignette > 0) {
      const radius = Math.max(this.width, this.height) * 0.72;
      const gradient = target.createRadialGradient(
        this.width / 2,
        this.height / 2,
        radius * 0.38,
        this.width / 2,
        this.height / 2,
        radius,
      );
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(1, `rgba(2,4,8,${Math.max(0, Math.min(0.7, vignette))})`);
      target.fillStyle = gradient;
      target.fillRect(0, 0, this.width, this.height);
    }
    target.restore();
  }

  private renderLights(): void {
    const ctx = this.lightCtx;
    const zoom = Math.max(0.25, this.camera.zoom);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.globalCompositeOperation = 'lighter';

    for (const light of this.lights) {
      const coordinateSpace = light.coordinateSpace ?? (light.screenSpace ? 'screen' : 'world');
      const point = coordinateSpace === 'screen' ? { x: light.x, y: light.y } : this.worldToScreen(light);
      const radius = Math.max(1, light.radius * (coordinateSpace === 'screen' ? 1 : zoom));
      if (
        point.x + radius < 0 || point.y + radius < 0 ||
        point.x - radius > this.width || point.y - radius > this.height
      ) continue;

      const flicker = Math.max(0, Math.min(0.45, light.flicker ?? 0));
      const flickerWave = 1 + Math.sin(this.frameTick * 0.19 + (light.phase ?? 0)) * flicker;
      const intensity = Math.max(0, Math.min(1.5, light.intensity * flickerWave));
      const innerRadius = Math.max(0, Math.min(radius * 0.9, (light.innerRadius ?? light.radius * 0.12) * (coordinateSpace === 'screen' ? 1 : zoom)));
      const falloff = Math.max(innerRadius / radius + 0.02, Math.min(0.96, light.falloff ?? 0.48));
      const gradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, radius);
      gradient.addColorStop(0, light.color);
      gradient.addColorStop(Math.max(0.01, innerRadius / radius), light.color);
      gradient.addColorStop(falloff, light.color);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = intensity;
      ctx.fillStyle = gradient;
      ctx.fillRect(point.x - radius, point.y - radius, radius * 2, radius * 2);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
}

export function drawBlobShadow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  opacity: number,
  color = '#11151c',
): void {
  ctx.save();
  ctx.globalAlpha *= Math.max(0, Math.min(1, opacity));
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(Math.round(x), Math.round(y), width / 2, height / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
