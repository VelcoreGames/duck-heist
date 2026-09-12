import type { Camera2D, FrameStyle, LightSource, RenderCommand } from './types';

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

export const DEFAULT_FRAME_STYLE: FrameStyle = {
  ambientDarkness: 0.08,
  ambientTint: '#d9c8a9',
  tintStrength: 0.03,
  vignette: 0.12,
  shadowOpacity: 0.28,
  shadowColor: '#11151c',
};

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

  beginFrame(camera: Partial<Camera2D> = {}, style: Partial<FrameStyle> = {}): CanvasRenderingContext2D {
    this.camera = {
      x: camera.x ?? 0,
      y: camera.y ?? 0,
      zoom: camera.zoom ?? 1,
      shakeX: camera.shakeX ?? 0,
      shakeY: camera.shakeY ?? 0,
    };
    this.style = { ...DEFAULT_FRAME_STYLE, ...style };
    this.commands.length = 0;
    this.lights.length = 0;
    this.sceneCtx.setTransform(1, 0, 0, 1, 0, 0);
    this.sceneCtx.globalAlpha = 1;
    this.sceneCtx.globalCompositeOperation = 'source-over';
    this.sceneCtx.clearRect(0, 0, this.width, this.height);
    return this.sceneCtx;
  }

  submit(command: RenderCommand): void {
    this.commands.push(command);
  }

  addLight(light: LightSource): void {
    this.lights.push(light);
  }

  renderQueued(target: CanvasRenderingContext2D, drawBackground?: (ctx: CanvasRenderingContext2D) => void): void {
    const ctx = this.sceneCtx;
    ctx.save();
    const zoom = Math.max(0.25, this.camera.zoom);
    const tx = Math.round((this.camera.shakeX ?? 0) - this.camera.x * zoom);
    const ty = Math.round((this.camera.shakeY ?? 0) - this.camera.y * zoom);
    ctx.translate(tx, ty);
    ctx.scale(zoom, zoom);
    drawBackground?.(ctx);
    const sorted = [...this.commands].sort((a, b) =>
      a.layer - b.layer || a.sortY - b.sortY || (a.order ?? 0) - (b.order ?? 0),
    );
    for (const command of sorted) command.draw(ctx);
    ctx.restore();
    this.presentScene(target);
  }

  /**
   * Puente de migración: permite pasar el renderer clásico por el nuevo
   * compositor sin cambiar todavía la lógica del juego ni las hitboxes.
   */
  processLegacyFrame(source: CanvasImageSource, target: CanvasRenderingContext2D, style: Partial<FrameStyle> = {}): void {
    this.style = { ...DEFAULT_FRAME_STYLE, ...style };
    this.sceneCtx.setTransform(1, 0, 0, 1, 0, 0);
    this.sceneCtx.globalAlpha = 1;
    this.sceneCtx.globalCompositeOperation = 'source-over';
    this.sceneCtx.clearRect(0, 0, this.width, this.height);
    this.sceneCtx.drawImage(source, 0, 0, this.width, this.height);
    this.presentScene(target);
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
    if (this.lights.length) {
      target.globalCompositeOperation = 'screen';
      target.drawImage(this.light, 0, 0);
      target.globalCompositeOperation = 'source-over';
    }

    if (this.style.vignette > 0) {
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
      gradient.addColorStop(1, `rgba(2,4,8,${Math.max(0, Math.min(0.7, this.style.vignette))})`);
      target.fillStyle = gradient;
      target.fillRect(0, 0, this.width, this.height);
    }
    target.restore();
  }

  private renderLights(): void {
    const ctx = this.lightCtx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.globalCompositeOperation = 'lighter';
    for (const light of this.lights) {
      const intensity = Math.max(0, Math.min(1.5, light.intensity));
      const radius = Math.max(1, light.radius);
      const gradient = ctx.createRadialGradient(light.x, light.y, 0, light.x, light.y, radius);
      gradient.addColorStop(0, light.color);
      gradient.addColorStop(Math.max(0.05, Math.min(0.95, light.falloff ?? 0.45)), light.color);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = intensity;
      ctx.fillStyle = gradient;
      ctx.fillRect(light.x - radius, light.y - radius, radius * 2, radius * 2);
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
