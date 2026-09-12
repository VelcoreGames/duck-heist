import type { PixelRect } from '../types';
import { RenderLayer } from '../types';
import { createWebGL2Context, queryCapabilities, TextureRegistry } from './gl';
import { InstancedLightBatch } from './lightBatch';
import { GpuPostProcessor } from './postprocess';
import { GpuProfiler } from './profiler';
import { GpuRenderGraph } from './renderGraph';
import { RenderTarget } from './renderTarget';
import { InstancedSpriteBatch } from './spriteBatch';
import type {
  GpuBackendOptions,
  GpuCapabilities,
  GpuFrameInput,
  GpuLightCommand,
  GpuRendererStats,
  GpuSpriteCommand,
  GpuTextureSource,
} from './types';

interface PreparedGpuFrame {
  frame: GpuFrameInput;
  visible: GpuSpriteCommand[];
  lights: GpuLightCommand[];
}

const EMPTY_STATS = (): GpuRendererStats => ({
  spritesSubmitted: 0,
  spritesDrawn: 0,
  spriteBatches: 0,
  lightsSubmitted: 0,
  lightsDrawn: 0,
  particlesDrawn: 0,
  culled: 0,
  textureBinds: 0,
  drawCalls: 0,
});

const intersects = (a: PixelRect, b: PixelRect) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

function inferredBounds(sprite: GpuSpriteCommand): PixelRect {
  const px = sprite.pivotX ?? sprite.width * 0.5;
  const py = sprite.pivotY ?? sprite.height;
  const margin = Math.max(sprite.width, sprite.height) * (sprite.rotation ? 0.42 : 0);
  return {
    x: sprite.x - px - margin,
    y: sprite.y - py - margin,
    w: sprite.width + margin * 2,
    h: sprite.height + margin * 2,
  };
}

export class WebGLChibiRenderer {
  readonly gl: WebGL2RenderingContext;
  readonly capabilities: GpuCapabilities;
  readonly width: number;
  readonly height: number;

  private readonly textures: TextureRegistry;
  private readonly sceneTarget: RenderTarget;
  private readonly lightTarget: RenderTarget;
  private readonly sprites: InstancedSpriteBatch;
  private readonly lights: InstancedLightBatch;
  private readonly post: GpuPostProcessor;
  private readonly profiler: GpuProfiler;
  private readonly graph: GpuRenderGraph<PreparedGpuFrame>;
  private readonly spriteQueue: GpuSpriteCommand[] = [];
  private readonly lightQueue: GpuLightCommand[] = [];
  private readonly maxLights: number;
  private readonly pixelSnap: boolean;
  private frame?: GpuFrameInput;
  private stats: GpuRendererStats = EMPTY_STATS();
  private palette?: { texture: WebGLTexture; rows: number };
  private lost = false;

  constructor(readonly canvas: HTMLCanvasElement, options: GpuBackendOptions) {
    const gl = createWebGL2Context(canvas, options.powerPreference ?? 'high-performance');
    if (!gl) throw new Error('WebGL2 is not available');
    this.gl = gl;
    this.width = Math.max(1, Math.round(options.logicalWidth));
    this.height = Math.max(1, Math.round(options.logicalHeight));
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.capabilities = queryCapabilities(gl);
    this.textures = new TextureRegistry(gl);
    this.sceneTarget = new RenderTarget(gl, this.width, this.height);
    this.lightTarget = new RenderTarget(gl, this.width, this.height);
    this.sprites = new InstancedSpriteBatch(gl, Math.max(64, options.maxSprites ?? 2048));
    this.lights = new InstancedLightBatch(gl, Math.max(16, options.maxLights ?? 128));
    this.post = new GpuPostProcessor(gl);
    this.profiler = new GpuProfiler(gl);
    this.maxLights = Math.max(1, options.maxLights ?? 128);
    this.pixelSnap = options.pixelSnap ?? true;
    this.registerWhiteTexture();

    this.graph = new GpuRenderGraph<PreparedGpuFrame>()
      .add({ name: 'scene', run: context => this.renderScenePass(context) })
      .add({ name: 'lighting', after: ['scene'], run: context => this.renderLightPass(context) })
      .add({ name: 'composite', after: ['lighting'], run: context => this.renderCompositePass(context) });
    this.graph.compile();

    canvas.addEventListener('webglcontextlost', this.handleContextLost, false);
    canvas.addEventListener('webglcontextrestored', this.handleContextRestored, false);
  }

  private readonly handleContextLost = (event: Event) => {
    event.preventDefault();
    this.lost = true;
  };

  private readonly handleContextRestored = () => {
    // Resources must be recreated by the owner after a restored context.
    this.lost = true;
  };

  private registerWhiteTexture(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Unable to create fallback GPU texture');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 1, 1);
    this.textures.register({ id: '__white', source: canvas, nearest: true });
  }

  registerTexture(input: GpuTextureSource): void {
    if (!this.lost) this.textures.register(input);
  }

  removeTexture(id: string): void {
    this.textures.remove(id);
  }

  setPalette(source: TexImageSource, rows: number): void {
    const id = '__palette_lut';
    this.textures.register({ id, source, nearest: true, premultiplyAlpha: false });
    const info = this.textures.get(id);
    if (info) this.palette = { texture: info.texture, rows: Math.max(1, Math.round(rows)) };
  }

  clearPalette(): void {
    this.palette = undefined;
    this.textures.remove('__palette_lut');
  }

  beginFrame(input: GpuFrameInput): void {
    if (this.lost) return;
    this.frame = input;
    this.spriteQueue.length = 0;
    this.lightQueue.length = 0;
    this.stats = EMPTY_STATS();
  }

  submitSprite(sprite: GpuSpriteCommand): void {
    if (this.lost || sprite.visible === false) return;
    this.spriteQueue.push(sprite);
    this.stats.spritesSubmitted++;
  }

  submitShadow(
    id: string,
    x: number,
    y: number,
    width: number,
    height: number,
    alpha: number,
    sortY = y,
  ): void {
    this.submitSprite({
      id,
      layer: RenderLayer.SHADOWS,
      sortY,
      x,
      y,
      width,
      height,
      pivotX: width * 0.5,
      pivotY: height * 0.5,
      color: [0.05, 0.06, 0.075, Math.max(0, Math.min(1, alpha))],
      region: { textureId: '__white', u0: 0, v0: 0, u1: 1, v1: 1 },
      effects: { shape: 'ellipse' },
    });
  }

  submitLight(light: GpuLightCommand): void {
    if (this.lost || light.intensity <= 0 || light.radius <= 0) return;
    this.lightQueue.push(light);
    this.stats.lightsSubmitted++;
  }

  markParticles(count: number): void {
    this.stats.particlesDrawn += Math.max(0, count | 0);
  }

  frameStats(): Readonly<GpuRendererStats> {
    return this.stats;
  }

  gpuTime(label: 'scene' | 'lighting' | 'composite'): number | undefined {
    return this.profiler.latest(label);
  }

  get gpuProfilingSupported(): boolean {
    return this.profiler.supported;
  }

  isContextLost(): boolean {
    return this.lost || this.gl.isContextLost();
  }

  endFrame(): void {
    if (this.lost || !this.frame) return;
    const frame = this.frame;
    const zoom = Math.max(0.25, frame.camera.zoom);
    const worldView: PixelRect = {
      x: frame.camera.x - 48 / zoom,
      y: frame.camera.y - 48 / zoom,
      w: this.width / zoom + 96 / zoom,
      h: this.height / zoom + 96 / zoom,
    };
    const screenView: PixelRect = { x: -48, y: -48, w: this.width + 96, h: this.height + 96 };

    const visible = this.spriteQueue.filter(sprite => {
      const bounds = sprite.bounds ?? inferredBounds(sprite);
      const view = sprite.space === 'screen' ? screenView : worldView;
      if (!intersects(bounds, view) || !this.textures.get(sprite.region.textureId)) {
        this.stats.culled++;
        return false;
      }
      return true;
    });
    visible.sort((a, b) =>
      a.layer - b.layer ||
      (a.sortY + (a.depthBias ?? 0)) - (b.sortY + (b.depthBias ?? 0)) ||
      (a.order ?? 0) - (b.order ?? 0),
    );

    const selectedLights = [...this.lightQueue]
      .sort((a, b) => (b.priority ?? b.intensity * b.radius) - (a.priority ?? a.intensity * a.radius))
      .slice(0, this.maxLights);

    this.graph.execute({ frame, visible, lights: selectedLights });
    this.profiler.poll();
    this.gl.flush();
  }

  private renderScenePass(context: PreparedGpuFrame): void {
    const gl = this.gl;
    this.profiler.begin('scene');
    this.sceneTarget.bind(true);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);

    const visible = context.visible;
    for (let start = 0; start < visible.length;) {
      const first = visible[start];
      const textureId = first.region.textureId;
      const blend = first.blend ?? 'alpha';
      let end = start + 1;
      while (
        end < visible.length &&
        visible[end].region.textureId === textureId &&
        (visible[end].blend ?? 'alpha') === blend
      ) end++;
      const texture = this.textures.get(textureId);
      if (texture) {
        const calls = this.sprites.draw(
          visible.slice(start, end), texture, context.frame.camera,
          this.width, this.height, this.pixelSnap, blend, this.palette,
        );
        this.stats.spriteBatches++;
        this.stats.textureBinds++;
        this.stats.drawCalls += calls;
        this.stats.spritesDrawn += end - start;
      }
      start = end;
    }
    this.profiler.end();
  }

  private renderLightPass(context: PreparedGpuFrame): void {
    this.profiler.begin('lighting');
    this.lightTarget.bind(true);
    const result = this.lights.draw(
      context.lights, context.frame.camera, this.width, this.height,
      context.frame.tick, this.pixelSnap,
    );
    this.stats.lightsDrawn = result.lights;
    this.stats.drawCalls += result.drawCalls;
    this.profiler.end();
  }

  private renderCompositePass(context: PreparedGpuFrame): void {
    this.profiler.begin('composite');
    this.post.draw(
      this.sceneTarget.texture, this.lightTarget.texture,
      this.width, this.height, context.frame.style,
    );
    this.stats.drawCalls++;
    this.profiler.end();
  }

  dispose(): void {
    this.canvas.removeEventListener('webglcontextlost', this.handleContextLost, false);
    this.canvas.removeEventListener('webglcontextrestored', this.handleContextRestored, false);
    this.profiler.dispose();
    this.sprites.dispose();
    this.lights.dispose();
    this.post.dispose();
    this.sceneTarget.dispose();
    this.lightTarget.dispose();
    this.textures.dispose();
    this.spriteQueue.length = 0;
    this.lightQueue.length = 0;
  }
}
