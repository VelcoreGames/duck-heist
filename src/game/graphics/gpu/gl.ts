import type { GpuCapabilities, GpuTextureSource } from './types';

export function createWebGL2Context(
  canvas: HTMLCanvasElement,
  powerPreference: WebGLPowerPreference = 'high-performance',
): WebGL2RenderingContext | null {
  return canvas.getContext('webgl2', {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: true,
    preserveDrawingBuffer: false,
    powerPreference,
  });
}

export function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Unable to create WebGL shader');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? 'unknown shader error';
    gl.deleteShader(shader);
    throw new Error(log);
  }
  return shader;
}

export function createProgram(gl: WebGL2RenderingContext, vertex: string, fragment: string): WebGLProgram {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vertex);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragment);
  const program = gl.createProgram();
  if (!program) throw new Error('Unable to create WebGL program');
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program) ?? 'unknown program link error';
    gl.deleteProgram(program);
    throw new Error(log);
  }
  return program;
}

export function uniform(gl: WebGL2RenderingContext, program: WebGLProgram, name: string): WebGLUniformLocation {
  const location = gl.getUniformLocation(program, name);
  if (location === null) throw new Error(`Missing WebGL uniform: ${name}`);
  return location;
}

export function createTexture(gl: WebGL2RenderingContext, input: GpuTextureSource): WebGLTexture {
  const texture = gl.createTexture();
  if (!texture) throw new Error(`Unable to create texture: ${input.id}`);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, input.premultiplyAlpha === false ? 0 : 1);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, input.nearest === false ? gl.LINEAR : gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, input.nearest === false ? gl.LINEAR : gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, input.source);
  gl.bindTexture(gl.TEXTURE_2D, null);
  return texture;
}

export function createEmptyTexture(gl: WebGL2RenderingContext, width: number, height: number): WebGLTexture {
  const texture = gl.createTexture();
  if (!texture) throw new Error('Unable to create render target texture');
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.bindTexture(gl.TEXTURE_2D, null);
  return texture;
}

export function queryCapabilities(gl: WebGL2RenderingContext): GpuCapabilities {
  const debug = gl.getExtension('WEBGL_debug_renderer_info');
  return {
    webgl2: true,
    maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE) as number,
    maxTextureUnits: gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS) as number,
    maxSamples: gl.getParameter(gl.MAX_SAMPLES) as number,
    renderer: debug ? String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)) : undefined,
    vendor: debug ? String(gl.getParameter(debug.UNMASKED_VENDOR_WEBGL)) : undefined,
  };
}

export class TextureRegistry {
  private readonly textures = new Map<string, { texture: WebGLTexture; width: number; height: number }>();
  constructor(private readonly gl: WebGL2RenderingContext) {}

  register(input: GpuTextureSource): void {
    this.remove(input.id);
    const source = input.source as { width?: number; height?: number; naturalWidth?: number; naturalHeight?: number };
    const width = source.naturalWidth ?? source.width ?? 1;
    const height = source.naturalHeight ?? source.height ?? 1;
    this.textures.set(input.id, { texture: createTexture(this.gl, input), width, height });
  }

  get(id: string) { return this.textures.get(id); }

  remove(id: string): void {
    const value = this.textures.get(id);
    if (!value) return;
    this.gl.deleteTexture(value.texture);
    this.textures.delete(id);
  }

  dispose(): void {
    for (const value of this.textures.values()) this.gl.deleteTexture(value.texture);
    this.textures.clear();
  }
}
