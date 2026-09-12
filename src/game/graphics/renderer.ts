import type {
  Camera2D,
  FrameStyle,
  GraphicsStats,
  LightSource,
  PixelPoint,
  PixelRect,
  RenderCommand,
} from './types';

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

export const DEFAULT_FRAME_STYLE: FrameStyle = {
  ambientDarkness: 0.08,
  ambientTint: '#d9c8a9',
  tintStrength: 0.03,
  vignette: 0.12,
  shadowOpacity: 0.28,
  shadowColor: '#11151c',
  lightStrength: 1,
  pixelSnap: true,
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
  private stats: GraphicsStats = { submitted: 0, drawn: 0, culled: 0, lights: 0 };

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
    this.stats = { submitted: 0, drawn: 0, culled: 0, lights: 0 };
    this.sceneCtx.setTransform(1, 0, 0, 1, 0, 0);
    this.sceneCtx.globalAlpha = 1;
    this.sceneCtx.globalCompositeOperation = 'source-over';
    this.sceneCtx.clearRect(0, 0, this.width, this.height);
    return this.sceneCtx;
  }

  submit(command: RenderCommand): void {
    this.commands.push(command);
    this.stats.submitted++;
  }

  addLight(light: LightSource): void {
    this.lights.push(light);
    this.stats.lights++;
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
    const zoom = Math.max(0.25, this.camera.zoom);
    const rawTx = (this.camera.shakeX ?? 0) - this.camera.x * zoom;
    const rawTy = (this.camera.shakeY ?? 0) - this.camera.y * zoom;
    const tx = this.style.pixelSnap ? Math.round(rawTx) : rawTx;
    const ty = this.style.pixelSnap ? Math.round(rawTy) : rawTy;
    const view = this.worldViewBounds();

    ctx.save();
    ctx.translate(tx, ty);
    ctx.scale(zoom, zoom);
    drawBackground?.(ctx);

    this.commands.sort((a, b) =>
      a.layer - b.layer ||
      (a.sortY + (a.depthBias ?? 0)) - (b.sortY + (b.depthBias ?? 0)) ||
      (a.order ?? 0) - (b.order ?? 0),
    );

    for (const command of this.commands) {
      if (command.visible === false || (command.bounds && !intersects(command.bounds, view))) {
        this.stats.culled++;
        continue;
      }
      command.draw(ctx);
      this.stats.drawn++;
    }
    ctx.restore();
    this.presentScene(target);
  }

  /**
   * Puente de migración: permite pasar el renderer clásico por el nuevo
   * compositor sin cambiar todavía la lógica del juego ni las hitboxes.
   */
  processLegacyFrame(source: CanvasImageSource, target: CanvasRenderingContext2D, style: Partial<FrameStyle> = {}): void {
    this.style = { ...DEFAULT_FRAME_STYLE, ...style };
    this.lights.length = 0;
    this.stats = { submitted: 0, drawn: 0, culled: 0, lights: 0 };
    this.sceneCtx.setTransform(1, 0, 0, 1, 0, 0);
    this.sceneCtx.globalAlpha = 1;
    this.sceneCtx.globalCompositeOperation = 'source-over';
    this.sceneCtx.clearRect(0, 0, this.width, this.height);
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

  private worldViewBounds(): PixelRect {
    const zoom = Math.max(0.25, this.camera.zoom);
    return {
      x: this.camera.x - (this.camera.shakeX ?? 0) / zoom,
      y: this.camera.y - (this.camera.shakeY ?? 0) / zoom,
      w: this.width / zoom,
      h: this.height / zoom,
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
    if (this.lights.length && this.style.lightStrength > 0) {
      target.globalCompositeOperation = 'screen';
      target.globalAlpha = Math.max(0, Math.min(1, this.style.lightStrength));
      target.drawImage(this.light, 0, 0);
      target.globalAlpha = 1;
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
    const zoom = Math.max(0.25, this.camera.zoom);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.globalCompositeOperation = 'lighter';

    for (const light of this.lights) {
      const intensity = Math.max(0, Math.min(1, light.intensity));
      const point = light.screenSpace ? { x: light.x, y: light.y } : this.worldToScreen(light);
      const radius = Math.max(1, light.radius * (light.screenSpace ? 1 : zoom));
      if (
        point.x + radius < 0 || point.y + radius < 0 ||
        point.x - radius > this.width || point.y - radius > this.height
      ) continue;
      const gradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, radius);
      gradient.addColorStop(0, light.color);
      gradient.addColorStop(Math.max(0.05, Math.min(0.95, light.falloff ?? 0.45)), light.color);
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
