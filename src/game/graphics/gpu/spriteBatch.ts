import type { Camera2D } from '../types';
import { createProgram, uniform } from './gl';
import { SPRITE_FRAGMENT_SHADER, SPRITE_VERTEX_SHADER } from './shaders';
import type { GpuBlendMode, GpuSpriteCommand } from './types';

const INSTANCE_FLOATS = 29;

interface TextureInfo {
  texture: WebGLTexture;
  width: number;
  height: number;
}

function blend(gl: WebGL2RenderingContext, mode: GpuBlendMode): void {
  gl.enable(gl.BLEND);
  switch (mode) {
    case 'add':
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      break;
    case 'multiply':
      gl.blendFunc(gl.DST_COLOR, gl.ONE_MINUS_SRC_ALPHA);
      break;
    default:
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      break;
  }
}

export class InstancedSpriteBatch {
  private readonly program: WebGLProgram;
  private readonly vao: WebGLVertexArrayObject;
  private readonly quadBuffer: WebGLBuffer;
  private readonly instanceBuffer: WebGLBuffer;
  private readonly data: Float32Array;
  private readonly uResolution: WebGLUniformLocation;
  private readonly uCamera: WebGLUniformLocation;
  private readonly uZoom: WebGLUniformLocation;
  private readonly uPixelSnap: WebGLUniformLocation;
  private readonly uTexture: WebGLUniformLocation;
  private readonly uPaletteLut: WebGLUniformLocation;
  private readonly uTexel: WebGLUniformLocation;
  private readonly uUsePalette: WebGLUniformLocation;
  private readonly uPaletteRows: WebGLUniformLocation;

  constructor(private readonly gl: WebGL2RenderingContext, readonly capacity = 2048) {
    this.program = createProgram(gl, SPRITE_VERTEX_SHADER, SPRITE_FRAGMENT_SHADER);
    const vao = gl.createVertexArray();
    const quadBuffer = gl.createBuffer();
    const instanceBuffer = gl.createBuffer();
    if (!vao || !quadBuffer || !instanceBuffer) throw new Error('Unable to create sprite batch buffers');
    this.vao = vao;
    this.quadBuffer = quadBuffer;
    this.instanceBuffer = instanceBuffer;
    this.data = new Float32Array(capacity * INSTANCE_FLOATS);

    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      0, 0, 0, 0,
      1, 0, 1, 0,
      0, 1, 0, 1,
      1, 1, 1, 1,
    ]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 16, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.data.byteLength, gl.DYNAMIC_DRAW);
    const stride = INSTANCE_FLOATS * 4;
    let offset = 0;
    const attr = (location: number, size: number) => {
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, size, gl.FLOAT, false, stride, offset * 4);
      gl.vertexAttribDivisor(location, 1);
      offset += size;
    };
    attr(1, 2);
    attr(2, 2);
    attr(3, 2);
    attr(4, 4);
    attr(5, 4);
    attr(6, 4);
    attr(7, 4);
    attr(8, 2);
    attr(9, 1);
    attr(10, 4);
    gl.bindVertexArray(null);

    this.uResolution = uniform(gl, this.program, 'uResolution');
    this.uCamera = uniform(gl, this.program, 'uCamera');
    this.uZoom = uniform(gl, this.program, 'uZoom');
    this.uPixelSnap = uniform(gl, this.program, 'uPixelSnap');
    this.uTexture = uniform(gl, this.program, 'uTexture');
    this.uPaletteLut = uniform(gl, this.program, 'uPaletteLut');
    this.uTexel = uniform(gl, this.program, 'uTexel');
    this.uUsePalette = uniform(gl, this.program, 'uUsePalette');
    this.uPaletteRows = uniform(gl, this.program, 'uPaletteRows');
  }

  draw(
    commands: readonly GpuSpriteCommand[],
    textureInfo: TextureInfo,
    camera: Camera2D,
    width: number,
    height: number,
    pixelSnap: boolean,
    blendMode: GpuBlendMode,
    palette?: { texture: WebGLTexture; rows: number },
  ): number {
    const gl = this.gl;
    let drawCalls = 0;
    for (let start = 0; start < commands.length; start += this.capacity) {
      const count = Math.min(this.capacity, commands.length - start);
      let cursor = 0;
      for (let i = 0; i < count; i++) {
        const command = commands[start + i];
        const color = command.color ?? [1, 1, 1, 1];
        const effects = command.effects ?? {};
        this.data[cursor++] = command.x;
        this.data[cursor++] = command.y;
        this.data[cursor++] = command.width;
        this.data[cursor++] = command.height;
        this.data[cursor++] = command.pivotX ?? command.width * 0.5;
        this.data[cursor++] = command.pivotY ?? command.height;
        this.data[cursor++] = command.region.u0;
        this.data[cursor++] = command.region.v0;
        this.data[cursor++] = command.region.u1;
        this.data[cursor++] = command.region.v1;
        this.data[cursor++] = color[0];
        this.data[cursor++] = color[1];
        this.data[cursor++] = color[2];
        this.data[cursor++] = color[3];
        this.data[cursor++] = command.rotation ?? 0;
        this.data[cursor++] = command.flipX ? 1 : 0;
        this.data[cursor++] = command.flipY ? 1 : 0;
        this.data[cursor++] = effects.shape === 'ellipse' ? 1 : 0;
        this.data[cursor++] = effects.flash ?? 0;
        this.data[cursor++] = effects.outline ?? 0;
        this.data[cursor++] = effects.rim ?? 0;
        this.data[cursor++] = effects.paletteStrength ?? 0;
        this.data[cursor++] = effects.paletteIndex ?? 0;
        this.data[cursor++] = 0;
        this.data[cursor++] = command.space === 'screen' ? 1 : 0;
        this.data[cursor++] = effects.emissive ?? 0;
        this.data[cursor++] = effects.metallic ?? 0;
        this.data[cursor++] = effects.sheen ?? 0;
        this.data[cursor++] = effects.glass ?? 0;
      }

      gl.useProgram(this.program);
      gl.bindVertexArray(this.vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.data.subarray(0, count * INSTANCE_FLOATS));
      gl.uniform2f(this.uResolution, width, height);
      gl.uniform4f(this.uCamera, camera.x, camera.y, camera.shakeX ?? 0, camera.shakeY ?? 0);
      gl.uniform1f(this.uZoom, Math.max(0.25, camera.zoom));
      gl.uniform1f(this.uPixelSnap, pixelSnap ? 1 : 0);
      gl.uniform2f(this.uTexel, 1 / Math.max(1, textureInfo.width), 1 / Math.max(1, textureInfo.height));

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, textureInfo.texture);
      gl.uniform1i(this.uTexture, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, palette?.texture ?? textureInfo.texture);
      gl.uniform1i(this.uPaletteLut, 1);
      gl.uniform1f(this.uUsePalette, palette ? 1 : 0);
      gl.uniform1f(this.uPaletteRows, palette?.rows ?? 1);
      blend(gl, blendMode);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
      drawCalls++;
    }
    gl.bindVertexArray(null);
    return drawCalls;
  }

  dispose(): void {
    const gl = this.gl;
    gl.deleteBuffer(this.quadBuffer);
    gl.deleteBuffer(this.instanceBuffer);
    gl.deleteVertexArray(this.vao);
    gl.deleteProgram(this.program);
  }
}
