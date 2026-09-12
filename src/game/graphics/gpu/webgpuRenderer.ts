import type { PixelRect } from '../types';
import type {
  GpuBackendOptions,
  GpuCapabilities,
  GpuFrameInput,
  GpuLightCommand,
  GpuRendererBackend,
  GpuRendererStats,
  GpuSpriteCommand,
  GpuTextureSource,
} from './types';

type Wgpu = any;

const BUFFER_COPY_DST = 0x08;
const BUFFER_VERTEX = 0x20;
const BUFFER_UNIFORM = 0x40;
const BUFFER_STORAGE = 0x80;
const TEXTURE_COPY_DST = 0x02;
const TEXTURE_BINDING = 0x04;
const TEXTURE_RENDER_ATTACHMENT = 0x10;
const INSTANCE_FLOATS = 28;
const LIGHT_FLOATS = 12;
const FRAME_FLOATS = 12;
const STYLE_FLOATS = 12;

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

const align = (value: number, step: number) => Math.ceil(value / step) * step;
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const intersects = (a: PixelRect, b: PixelRect) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

function sourceSize(source: TexImageSource): { width: number; height: number } {
  const value = source as unknown as {
    naturalWidth?: number; naturalHeight?: number; videoWidth?: number; videoHeight?: number;
    width?: number; height?: number;
  };
  return {
    width: Math.max(1, Math.round(value.naturalWidth ?? value.videoWidth ?? value.width ?? 1)),
    height: Math.max(1, Math.round(value.naturalHeight ?? value.videoHeight ?? value.height ?? 1)),
  };
}

function inferredBounds(sprite: GpuSpriteCommand): PixelRect {
  const pivotX = sprite.pivotX ?? sprite.width * 0.5;
  const pivotY = sprite.pivotY ?? sprite.height;
  const margin = Math.max(sprite.width, sprite.height) * (sprite.rotation ? 0.42 : 0);
  return {
    x: sprite.x - pivotX - margin,
    y: sprite.y - pivotY - margin,
    w: sprite.width + margin * 2,
    h: sprite.height + margin * 2,
  };
}

const SPRITE_WGSL = /* wgsl */ `
struct Frame {
  resolution: vec2f,
  camera: vec4f,
  zoom: f32,
  pixelSnap: f32,
  tick: f32,
  _pad: vec3f,
}
@group(0) @binding(0) var<uniform> frame: Frame;
@group(0) @binding(1) var<storage, read> instances: array<vec4f>;
@group(1) @binding(0) var sourceTexture: texture_2d<f32>;
@group(1) @binding(1) var sourceSampler: sampler;
@group(1) @binding(2) var paletteTexture: texture_2d<f32>;
@group(1) @binding(3) var paletteSampler: sampler;
struct PaletteInfo { usePalette: f32, rows: f32, _pad: vec2f }
@group(1) @binding(4) var<uniform> paletteInfo: PaletteInfo;

struct Vin { @location(0) corner: vec4f, @builtin(instance_index) instanceId: u32 }
struct Vout {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
  @location(1) local: vec2f,
  @location(2) uvRect: vec4f,
  @location(3) color: vec4f,
  @location(4) effects: vec4f,
  @location(5) palette: vec2f,
  @location(6) @interpolate(flat) shape: f32,
}

@vertex fn vs(input: Vin) -> Vout {
  let base = input.instanceId * 7u;
  let a0 = instances[base + 0u]; // position, size
  let a1 = instances[base + 1u]; // pivot, uv0
  let a2 = instances[base + 2u]; // uv1, color rg
  let a3 = instances[base + 3u]; // color ba, rotation, space
  let a4 = instances[base + 4u]; // flip x/y, shape, flash
  let a5 = instances[base + 5u]; // outline, rim, palette strength/index

  var local = input.corner.xy * a0.zw - a1.xy;
  let c = cos(a3.z);
  let s = sin(a3.z);
  local = mat2x2f(c, -s, s, c) * local;
  var p = a0.xy + local;
  if (a3.w < 0.5) {
    p = (p - frame.camera.xy) * frame.zoom + frame.camera.zw;
  }
  if (frame.pixelSnap > 0.5) { p = floor(p + vec2f(0.5)); }

  var uvCorner = input.corner.zw;
  if (a4.x > 0.5) { uvCorner.x = 1.0 - uvCorner.x; }
  if (a4.y > 0.5) { uvCorner.y = 1.0 - uvCorner.y; }
  let uvRect = vec4f(a1.zw, a2.xy);

  var out: Vout;
  out.position = vec4f(p.x / frame.resolution.x * 2.0 - 1.0, 1.0 - p.y / frame.resolution.y * 2.0, 0.0, 1.0);
  out.uv = mix(uvRect.xy, uvRect.zw, uvCorner);
  out.local = input.corner.xy * 2.0 - 1.0;
  out.uvRect = uvRect;
  out.color = vec4f(a2.zw, a3.xy);
  out.effects = vec4f(a4.w, a5.xyz);
  out.palette = vec2f(a5.w, 0.0);
  out.shape = a4.z;
  return out;
}

fn alphaAt(uv: vec2f, uvRect: vec4f) -> f32 {
  let dims = vec2f(textureDimensions(sourceTexture));
  let texel = 1.0 / max(dims, vec2f(1.0));
  let safeUv = clamp(uv, uvRect.xy + texel * 0.5, uvRect.zw - texel * 0.5);
  return textureSample(sourceTexture, sourceSampler, safeUv).a;
}

@fragment fn fs(input: Vout) -> @location(0) vec4f {
  var texel = textureSample(sourceTexture, sourceSampler, input.uv);
  if (input.shape > 0.5) {
    let d = length(input.local);
    texel = vec4f(1.0, 1.0, 1.0, 1.0 - smoothstep(0.82, 1.0, d));
  }
  let alpha = texel.a * input.color.a;
  if (alpha <= 0.001) { discard; }
  var rgb = texel.rgb;

  let paletteStrength = clamp(input.effects.w, 0.0, 1.0) * paletteInfo.usePalette;
  if (paletteStrength > 0.001) {
    let luma = dot(rgb, vec3f(0.299, 0.587, 0.114));
    let row = (input.palette.x + 0.5) / max(1.0, paletteInfo.rows);
    let mapped = textureSample(paletteTexture, paletteSampler, vec2f(clamp(luma, 0.002, 0.998), row)).rgb;
    rgb = mix(rgb, mapped, paletteStrength);
  }

  let dims = vec2f(textureDimensions(sourceTexture));
  let texelSize = 1.0 / max(dims, vec2f(1.0));
  let leftA = alphaAt(input.uv + vec2f(-texelSize.x, 0.0), input.uvRect);
  let rightA = alphaAt(input.uv + vec2f(texelSize.x, 0.0), input.uvRect);
  let upA = alphaAt(input.uv + vec2f(0.0, -texelSize.y), input.uvRect);
  let downA = alphaAt(input.uv + vec2f(0.0, texelSize.y), input.uvRect);
  let neighborMin = min(min(leftA, rightA), min(upA, downA));
  let edge = select(0.0, 1.0 - smoothstep(0.25, 0.95, neighborMin), texel.a >= 0.02);
  rgb = mix(rgb, rgb * 0.18, clamp(input.effects.y, 0.0, 1.0) * edge);
  let directionalEdge = max(0.0, texel.a - max(leftA, upA));
  let rim = clamp(input.effects.z, 0.0, 1.0) * smoothstep(0.02, 0.5, directionalEdge);
  rgb = mix(rgb, vec3f(1.0, 0.92, 0.68), rim * 0.7);
  rgb = mix(rgb, vec3f(1.0, 0.96, 0.82), clamp(input.effects.x, 0.0, 1.0));
  rgb *= input.color.rgb;
  return vec4f(rgb, alpha);
}
`;

const LIGHT_WGSL = /* wgsl */ `
struct Frame {
  resolution: vec2f,
  camera: vec4f,
  zoom: f32,
  pixelSnap: f32,
  tick: f32,
  _pad: vec3f,
}
@group(0) @binding(0) var<uniform> frame: Frame;
@group(0) @binding(1) var<storage, read> lights: array<vec4f>;
struct Vin { @location(0) corner: vec2f, @builtin(instance_index) instanceId: u32 }
struct Vout { @builtin(position) position: vec4f, @location(0) local: vec2f, @location(1) color: vec3f, @location(2) params: vec3f }
@vertex fn vs(input: Vin) -> Vout {
  let base = input.instanceId * 3u;
  let a0 = lights[base + 0u]; // x y radius intensity
  let a1 = lights[base + 1u]; // rgb inner
  let a2 = lights[base + 2u]; // falloff screen phase flicker
  var center = a0.xy;
  var radius = a0.z;
  if (a2.y < 0.5) { center = (center - frame.camera.xy) * frame.zoom + frame.camera.zw; radius *= frame.zoom; }
  if (frame.pixelSnap > 0.5) { center = floor(center + vec2f(0.5)); }
  let p = center + input.corner * radius;
  let flicker = clamp(a2.w, 0.0, 1.0);
  let wave = select(1.0, 1.0 - flicker * 0.5 + sin((frame.tick + a2.z) * 0.17) * flicker * 0.5, flicker > 0.0);
  var out: Vout;
  out.position = vec4f(p.x / frame.resolution.x * 2.0 - 1.0, 1.0 - p.y / frame.resolution.y * 2.0, 0.0, 1.0);
  out.local = input.corner;
  out.color = a1.rgb;
  out.params = vec3f(a0.w * wave, a1.w, max(0.1, a2.x));
  return out;
}
@fragment fn fs(input: Vout) -> @location(0) vec4f {
  let d = length(input.local);
  if (d >= 1.0) { discard; }
  let t = clamp((d - clamp(input.params.y, 0.0, 0.95)) / max(0.001, 1.0 - clamp(input.params.y, 0.0, 0.95)), 0.0, 1.0);
  let a = pow(1.0 - smoothstep(0.0, 1.0, t), input.params.z) * input.params.x;
  return vec4f(input.color * a, a);
}
`;

const COMPOSITE_WGSL = /* wgsl */ `
@group(0) @binding(0) var sceneTexture: texture_2d<f32>;
@group(0) @binding(1) var sceneSampler: sampler;
@group(0) @binding(2) var lightTexture: texture_2d<f32>;
@group(0) @binding(3) var lightSampler: sampler;
struct Style {
  a: vec4f, // darkness, tintStrength, vignette, lightStrength
  b: vec4f, // tint rgb, exposure
  c: vec4f, // gamma, saturation, reserved
}
@group(0) @binding(4) var<uniform> style: Style;
struct Vout { @builtin(position) position: vec4f, @location(0) uv: vec2f }
@vertex fn vs(@builtin(vertex_index) i: u32) -> Vout {
  let x = f32((i << 1u) & 2u);
  let y = f32(i & 2u);
  var out: Vout;
  out.uv = vec2f(x, y);
  out.position = vec4f(x * 2.0 - 1.0, 1.0 - y * 2.0, 0.0, 1.0);
  return out;
}
@fragment fn fs(input: Vout) -> @location(0) vec4f {
  let scene = textureSample(sceneTexture, sceneSampler, input.uv);
  let light = textureSample(lightTexture, lightSampler, input.uv).rgb * style.a.w;
  var color = scene.rgb * (1.0 - clamp(style.a.x, 0.0, 0.92));
  color = mix(color, color * style.b.rgb, clamp(style.a.y, 0.0, 1.0));
  color = 1.0 - (1.0 - color) * (1.0 - clamp(light, vec3f(0.0), vec3f(2.0)));
  let luma = dot(color, vec3f(0.299, 0.587, 0.114));
  color = mix(vec3f(luma), color, max(0.0, style.c.y));
  color = vec3f(1.0) - exp(-color * max(0.01, style.b.w));
  color = pow(max(color, vec3f(0.0)), vec3f(1.0 / max(0.1, style.c.x)));
  let p = input.uv * 2.0 - 1.0;
  let vig = smoothstep(0.38, 1.35, dot(p, p));
  color *= 1.0 - vig * clamp(style.a.z, 0.0, 0.8);
  return vec4f(color, scene.a);
}
`;

interface TextureEntry { texture: Wgpu; view: Wgpu; sampler: Wgpu; width: number; height: number }
interface SpriteBatch { start: number; end: number; textureId: string; blend: 'alpha' | 'add' | 'multiply'; offset: number; byteSize: number }

export function supportsWebGPU(): boolean {
  if (typeof navigator === 'undefined') return false;
  return !!(navigator as Navigator & { gpu?: Wgpu }).gpu;
}

export class WebGpuChibiRenderer implements GpuRendererBackend {
  readonly kind = 'webgpu' as const;
  readonly capabilities: GpuCapabilities;
  readonly width: number;
  readonly height: number;

  private readonly textures = new Map<string, TextureEntry>();
  private readonly spriteQueue: GpuSpriteCommand[] = [];
  private readonly lightQueue: GpuLightCommand[] = [];
  private readonly maxSprites: number;
  private readonly maxLights: number;
  private readonly pixelSnap: boolean;
  private readonly format: string;
  private readonly sceneTexture: Wgpu;
  private readonly lightTexture: Wgpu;
  private readonly sceneView: Wgpu;
  private readonly lightView: Wgpu;
  private readonly frameBuffer: Wgpu;
  private readonly styleBuffer: Wgpu;
  private readonly instanceBuffer: Wgpu;
  private readonly lightBuffer: Wgpu;
  private readonly quadBuffer: Wgpu;
  private readonly lightQuadBuffer: Wgpu;
  private readonly spritePipelines = new Map<string, Wgpu>();
  private readonly lightPipeline: Wgpu;
  private readonly compositePipeline: Wgpu;
  private readonly nearestSampler: Wgpu;
  private readonly linearSampler: Wgpu;
  private readonly paletteInfoBuffer: Wgpu;
  private palette?: TextureEntry;
  private paletteRows = 1;
  private frame?: GpuFrameInput;
  private stats: GpuRendererStats = EMPTY_STATS();
  private lost = false;

  private constructor(
    readonly canvas: HTMLCanvasElement,
    private readonly adapter: Wgpu,
    private readonly device: Wgpu,
    private readonly context: Wgpu,
    options: GpuBackendOptions,
    format: string,
  ) {
    this.width = Math.max(1, Math.round(options.logicalWidth));
    this.height = Math.max(1, Math.round(options.logicalHeight));
    this.maxSprites = Math.max(128, options.maxSprites ?? 4096);
    this.maxLights = Math.max(8, options.maxLights ?? 64);
    this.pixelSnap = options.pixelSnap ?? true;
    this.format = format;
    canvas.width = this.width;
    canvas.height = this.height;
    context.configure({ device, format, alphaMode: 'premultiplied' });

    const limits = device.limits ?? {};
    this.capabilities = {
      webgl2: false,
      webgpu: true,
      maxTextureSize: Number(limits.maxTextureDimension2D ?? 8192),
      maxTextureUnits: Number(limits.maxSampledTexturesPerShaderStage ?? 16),
      maxSamples: 4,
      renderer: String(adapter.info?.device ?? adapter.info?.description ?? 'WebGPU'),
      vendor: String(adapter.info?.vendor ?? 'unknown'),
    };

    this.nearestSampler = device.createSampler({ magFilter: 'nearest', minFilter: 'nearest' });
    this.linearSampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear' });
    this.sceneTexture = this.createTargetTexture('scene');
    this.lightTexture = this.createTargetTexture('light');
    this.sceneView = this.sceneTexture.createView();
    this.lightView = this.lightTexture.createView();
    this.frameBuffer = device.createBuffer({ size: FRAME_FLOATS * 4, usage: BUFFER_UNIFORM | BUFFER_COPY_DST });
    this.styleBuffer = device.createBuffer({ size: STYLE_FLOATS * 4, usage: BUFFER_UNIFORM | BUFFER_COPY_DST });
    this.paletteInfoBuffer = device.createBuffer({ size: 16, usage: BUFFER_UNIFORM | BUFFER_COPY_DST });
    const instanceBytes = align(this.maxSprites * INSTANCE_FLOATS * 4 + 256 * 64, 256);
    this.instanceBuffer = device.createBuffer({ size: instanceBytes, usage: BUFFER_STORAGE | BUFFER_COPY_DST });
    this.lightBuffer = device.createBuffer({ size: this.maxLights * LIGHT_FLOATS * 4, usage: BUFFER_STORAGE | BUFFER_COPY_DST });
    this.quadBuffer = device.createBuffer({ size: 6 * 4 * 4, usage: BUFFER_VERTEX | BUFFER_COPY_DST });
    device.queue.writeBuffer(this.quadBuffer, 0, new Float32Array([
      0,0,0,0, 1,0,1,0, 0,1,0,1,
      0,1,0,1, 1,0,1,0, 1,1,1,1,
    ]));
    this.lightQuadBuffer = device.createBuffer({ size: 6 * 2 * 4, usage: BUFFER_VERTEX | BUFFER_COPY_DST });
    device.queue.writeBuffer(this.lightQuadBuffer, 0, new Float32Array([
      -1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1,
    ]));

    this.spritePipelines.set('alpha', this.createSpritePipeline('alpha'));
    this.spritePipelines.set('add', this.createSpritePipeline('add'));
    this.spritePipelines.set('multiply', this.createSpritePipeline('multiply'));
    this.lightPipeline = this.createLightPipeline();
    this.compositePipeline = this.createCompositePipeline();
    this.registerWhiteTexture();

    device.lost?.then(() => { this.lost = true; }).catch(() => { this.lost = true; });
  }

  static async create(canvas: HTMLCanvasElement, options: GpuBackendOptions): Promise<WebGpuChibiRenderer | undefined> {
    const gpu = (navigator as Navigator & { gpu?: Wgpu }).gpu;
    if (!gpu) return undefined;
    try {
      const adapter = await gpu.requestAdapter({ powerPreference: options.powerPreference ?? 'high-performance' });
      if (!adapter) return undefined;
      const device = await adapter.requestDevice();
      const context = canvas.getContext('webgpu') as Wgpu;
      if (!context) return undefined;
      const format = gpu.getPreferredCanvasFormat?.() ?? 'bgra8unorm';
      return new WebGpuChibiRenderer(canvas, adapter, device, context, options, format);
    } catch {
      return undefined;
    }
  }

  private createTargetTexture(label: string): Wgpu {
    return this.device.createTexture({
      label: `duck-heist-${label}`,
      size: [this.width, this.height, 1],
      format: 'rgba8unorm',
      usage: TEXTURE_RENDER_ATTACHMENT | TEXTURE_BINDING,
    });
  }

  private createSpritePipeline(blend: 'alpha' | 'add' | 'multiply'): Wgpu {
    const module = this.device.createShaderModule({ code: SPRITE_WGSL });
    const colorBlend = blend === 'add'
      ? { color: { srcFactor: 'one', dstFactor: 'one', operation: 'add' }, alpha: { srcFactor: 'one', dstFactor: 'one', operation: 'add' } }
      : blend === 'multiply'
        ? { color: { srcFactor: 'dst', dstFactor: 'one-minus-src-alpha', operation: 'add' }, alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' } }
        : { color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' }, alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' } };
    return this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module, entryPoint: 'vs',
        buffers: [{ arrayStride: 16, attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x4' }] }],
      },
      fragment: { module, entryPoint: 'fs', targets: [{ format: 'rgba8unorm', blend: colorBlend }] },
      primitive: { topology: 'triangle-list' },
    });
  }

  private createLightPipeline(): Wgpu {
    const module = this.device.createShaderModule({ code: LIGHT_WGSL });
    return this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module, entryPoint: 'vs',
        buffers: [{ arrayStride: 8, attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x2' }] }],
      },
      fragment: {
        module, entryPoint: 'fs',
        targets: [{ format: 'rgba8unorm', blend: {
          color: { srcFactor: 'one', dstFactor: 'one', operation: 'add' },
          alpha: { srcFactor: 'one', dstFactor: 'one', operation: 'add' },
        } }],
      },
      primitive: { topology: 'triangle-list' },
    });
  }

  private createCompositePipeline(): Wgpu {
    const module = this.device.createShaderModule({ code: COMPOSITE_WGSL });
    return this.device.createRenderPipeline({
      layout: 'auto',
      vertex: { module, entryPoint: 'vs' },
      fragment: { module, entryPoint: 'fs', targets: [{ format: this.format }] },
      primitive: { topology: 'triangle-list' },
    });
  }

  private registerWhiteTexture(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 1; canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 1, 1);
    this.registerTexture({ id: '__white', source: canvas, nearest: true });
  }

  registerTexture(input: GpuTextureSource): void {
    if (this.lost) return;
    this.removeTexture(input.id);
    const { width, height } = sourceSize(input.source);
    const texture = this.device.createTexture({
      label: `duck-heist-texture:${input.id}`,
      size: [width, height, 1],
      format: 'rgba8unorm',
      usage: TEXTURE_COPY_DST | TEXTURE_BINDING | TEXTURE_RENDER_ATTACHMENT,
    });
    this.device.queue.copyExternalImageToTexture(
      { source: input.source, premultipliedAlpha: input.premultiplyAlpha === true },
      { texture, premultipliedAlpha: input.premultiplyAlpha === true },
      [width, height],
    );
    this.textures.set(input.id, {
      texture,
      view: texture.createView(),
      sampler: input.nearest === false ? this.linearSampler : this.nearestSampler,
      width,
      height,
    });
  }

  removeTexture(id: string): void {
    const old = this.textures.get(id);
    old?.texture.destroy?.();
    this.textures.delete(id);
  }

  setPalette(source: TexImageSource, rows: number): void {
    this.registerTexture({ id: '__palette_lut', source, nearest: false, premultiplyAlpha: false });
    this.palette = this.textures.get('__palette_lut');
    this.paletteRows = Math.max(1, Math.round(rows));
  }

  clearPalette(): void {
    this.palette = undefined;
    this.removeTexture('__palette_lut');
  }

  beginFrame(input: GpuFrameInput): void {
    if (this.lost) return;
    this.frame = input;
    this.spriteQueue.length = 0;
    this.lightQueue.length = 0;
    this.stats = EMPTY_STATS();
  }

  submitSprite(sprite: GpuSpriteCommand): void {
    if (this.lost || sprite.visible === false || this.spriteQueue.length >= this.maxSprites) return;
    this.spriteQueue.push(sprite);
    this.stats.spritesSubmitted++;
  }

  submitShadow(id: string, x: number, y: number, width: number, height: number, alpha: number, sortY = y): void {
    this.submitSprite({
      id, layer: 40, sortY, x, y, width, height,
      pivotX: width * 0.5, pivotY: height * 0.5,
      color: [0.05, 0.06, 0.075, clamp01(alpha)],
      region: { textureId: '__white', u0: 0, v0: 0, u1: 1, v1: 1 },
      effects: { shape: 'ellipse' },
    });
  }

  submitLight(light: GpuLightCommand): void {
    if (this.lost || light.intensity <= 0 || light.radius <= 0) return;
    this.lightQueue.push(light);
    this.stats.lightsSubmitted++;
  }

  markParticles(count: number): void { this.stats.particlesDrawn += Math.max(0, count | 0); }
  frameStats(): Readonly<GpuRendererStats> { return this.stats; }

  private writeFrame(frame: GpuFrameInput): void {
    this.device.queue.writeBuffer(this.frameBuffer, 0, new Float32Array([
      this.width, this.height,
      frame.camera.x, frame.camera.y, frame.camera.shakeX ?? 0, frame.camera.shakeY ?? 0,
      Math.max(0.25, frame.camera.zoom), this.pixelSnap ? 1 : 0, frame.tick,
      0, 0, 0,
    ]));
    this.device.queue.writeBuffer(this.styleBuffer, 0, new Float32Array([
      frame.style.ambientDarkness, frame.style.tintStrength, frame.style.vignette, frame.style.lightStrength,
      frame.style.ambientTint[0], frame.style.ambientTint[1], frame.style.ambientTint[2], frame.style.exposure,
      frame.style.gamma, frame.style.saturation, 0, 0,
    ]));
    this.device.queue.writeBuffer(this.paletteInfoBuffer, 0, new Float32Array([
      this.palette ? 1 : 0, this.paletteRows, 0, 0,
    ]));
  }

  private prepareSprites(frame: GpuFrameInput): { visible: GpuSpriteCommand[]; batches: SpriteBatch[] } {
    const zoom = Math.max(0.25, frame.camera.zoom);
    const worldView: PixelRect = { x: frame.camera.x - 48 / zoom, y: frame.camera.y - 48 / zoom, w: this.width / zoom + 96 / zoom, h: this.height / zoom + 96 / zoom };
    const screenView: PixelRect = { x: -48, y: -48, w: this.width + 96, h: this.height + 96 };
    const visible = this.spriteQueue.filter(sprite => {
      const bounds = sprite.bounds ?? inferredBounds(sprite);
      const view = sprite.space === 'screen' ? screenView : worldView;
      if (!intersects(bounds, view) || !this.textures.has(sprite.region.textureId)) { this.stats.culled++; return false; }
      return true;
    });
    visible.sort((a, b) => a.layer - b.layer || (a.sortY + (a.depthBias ?? 0)) - (b.sortY + (b.depthBias ?? 0)) || (a.order ?? 0) - (b.order ?? 0));

    const raw = new Float32Array(Math.min(visible.length, this.maxSprites) * INSTANCE_FLOATS);
    let cursor = 0;
    for (const command of visible) {
      const color = command.color ?? [1,1,1,1];
      const fx = command.effects ?? {};
      raw.set([
        command.x, command.y, command.width, command.height,
        command.pivotX ?? command.width * 0.5, command.pivotY ?? command.height, command.region.u0, command.region.v0,
        command.region.u1, command.region.v1, color[0], color[1],
        color[2], color[3], command.rotation ?? 0, command.space === 'screen' ? 1 : 0,
        command.flipX ? 1 : 0, command.flipY ? 1 : 0, fx.shape === 'ellipse' ? 1 : 0, fx.flash ?? 0,
        fx.outline ?? 0, fx.rim ?? 0, fx.paletteStrength ?? 0, fx.paletteIndex ?? 0,
        0,0,0,0,
      ], cursor);
      cursor += INSTANCE_FLOATS;
    }

    const batches: SpriteBatch[] = [];
    let spriteStart = 0;
    let byteOffset = 0;
    while (spriteStart < visible.length) {
      const first = visible[spriteStart];
      const textureId = first.region.textureId;
      const blend = first.blend ?? 'alpha';
      let end = spriteStart + 1;
      while (end < visible.length && visible[end].region.textureId === textureId && (visible[end].blend ?? 'alpha') === blend) end++;
      const count = end - spriteStart;
      byteOffset = align(byteOffset, 256);
      const byteSize = count * INSTANCE_FLOATS * 4;
      const slice = raw.subarray(spriteStart * INSTANCE_FLOATS, end * INSTANCE_FLOATS);
      this.device.queue.writeBuffer(this.instanceBuffer, byteOffset, slice);
      batches.push({ start: spriteStart, end, textureId, blend, offset: byteOffset, byteSize });
      byteOffset += byteSize;
      spriteStart = end;
    }
    return { visible, batches };
  }

  endFrame(): void {
    if (this.lost || !this.frame) return;
    const frame = this.frame;
    this.writeFrame(frame);
    const { visible, batches } = this.prepareSprites(frame);
    const encoder = this.device.createCommandEncoder({ label: 'duck-heist-frame' });

    const scenePass = encoder.beginRenderPass({ colorAttachments: [{ view: this.sceneView, clearValue: { r:0,g:0,b:0,a:0 }, loadOp: 'clear', storeOp: 'store' }] });
    scenePass.setVertexBuffer(0, this.quadBuffer);
    for (const batch of batches) {
      const pipeline = this.spritePipelines.get(batch.blend) ?? this.spritePipelines.get('alpha');
      const texture = this.textures.get(batch.textureId);
      const palette = this.palette ?? this.textures.get('__white');
      if (!pipeline || !texture || !palette) continue;
      const group0 = this.device.createBindGroup({ layout: pipeline.getBindGroupLayout(0), entries: [
        { binding: 0, resource: { buffer: this.frameBuffer } },
        { binding: 1, resource: { buffer: this.instanceBuffer, offset: batch.offset, size: batch.byteSize } },
      ]});
      const group1 = this.device.createBindGroup({ layout: pipeline.getBindGroupLayout(1), entries: [
        { binding: 0, resource: texture.view }, { binding: 1, resource: texture.sampler },
        { binding: 2, resource: palette.view }, { binding: 3, resource: palette.sampler },
        { binding: 4, resource: { buffer: this.paletteInfoBuffer } },
      ]});
      scenePass.setPipeline(pipeline);
      scenePass.setBindGroup(0, group0);
      scenePass.setBindGroup(1, group1);
      scenePass.draw(6, batch.end - batch.start, 0, 0);
      this.stats.spriteBatches++;
      this.stats.textureBinds++;
      this.stats.drawCalls++;
      this.stats.spritesDrawn += batch.end - batch.start;
    }
    scenePass.end();

    const selectedLights = [...this.lightQueue]
      .sort((a,b) => (b.priority ?? b.intensity*b.radius) - (a.priority ?? a.intensity*a.radius))
      .slice(0, this.maxLights);
    if (selectedLights.length) {
      const lightData = new Float32Array(selectedLights.length * LIGHT_FLOATS);
      let c = 0;
      for (const light of selectedLights) {
        lightData.set([
          light.x, light.y, light.radius, Math.max(0, light.intensity),
          light.color[0], light.color[1], light.color[2], clamp01(light.innerRadius ?? 0),
          Math.max(0.1, light.falloff ?? 1.35), light.space === 'screen' ? 1 : 0, light.phase ?? 0, clamp01(light.flicker ?? 0),
        ], c); c += LIGHT_FLOATS;
      }
      this.device.queue.writeBuffer(this.lightBuffer, 0, lightData);
    }
    const lightPass = encoder.beginRenderPass({ colorAttachments: [{ view: this.lightView, clearValue: { r:0,g:0,b:0,a:0 }, loadOp: 'clear', storeOp: 'store' }] });
    if (selectedLights.length) {
      const group = this.device.createBindGroup({ layout: this.lightPipeline.getBindGroupLayout(0), entries: [
        { binding: 0, resource: { buffer: this.frameBuffer } },
        { binding: 1, resource: { buffer: this.lightBuffer, size: selectedLights.length * LIGHT_FLOATS * 4 } },
      ]});
      lightPass.setPipeline(this.lightPipeline);
      lightPass.setBindGroup(0, group);
      lightPass.setVertexBuffer(0, this.lightQuadBuffer);
      lightPass.draw(6, selectedLights.length);
      this.stats.lightsDrawn = selectedLights.length;
      this.stats.drawCalls++;
    }
    lightPass.end();

    const outputView = this.context.getCurrentTexture().createView();
    const compositePass = encoder.beginRenderPass({ colorAttachments: [{ view: outputView, clearValue: { r:0,g:0,b:0,a:1 }, loadOp: 'clear', storeOp: 'store' }] });
    const compositeGroup = this.device.createBindGroup({ layout: this.compositePipeline.getBindGroupLayout(0), entries: [
      { binding: 0, resource: this.sceneView }, { binding: 1, resource: this.nearestSampler },
      { binding: 2, resource: this.lightView }, { binding: 3, resource: this.linearSampler },
      { binding: 4, resource: { buffer: this.styleBuffer } },
    ]});
    compositePass.setPipeline(this.compositePipeline);
    compositePass.setBindGroup(0, compositeGroup);
    compositePass.draw(3);
    compositePass.end();
    this.stats.drawCalls++;

    this.device.queue.submit([encoder.finish()]);
  }

  dispose(): void {
    this.lost = true;
    for (const entry of this.textures.values()) entry.texture.destroy?.();
    this.textures.clear();
    this.sceneTexture.destroy?.();
    this.lightTexture.destroy?.();
    this.frameBuffer.destroy?.(); this.styleBuffer.destroy?.(); this.paletteInfoBuffer.destroy?.();
    this.instanceBuffer.destroy?.(); this.lightBuffer.destroy?.(); this.quadBuffer.destroy?.(); this.lightQuadBuffer.destroy?.();
    this.spriteQueue.length = 0; this.lightQueue.length = 0;
  }
}
