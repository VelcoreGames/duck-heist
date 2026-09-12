import type { Camera2D } from '../types';
import { createProgram, uniform } from './gl';
import { LIGHT_FRAGMENT_SHADER, LIGHT_VERTEX_SHADER } from './shaders';
import type { GpuLightCommand } from './types';

const INSTANCE_FLOATS = 9;

export class InstancedLightBatch {
  private readonly program: WebGLProgram;
  private readonly vao: WebGLVertexArrayObject;
  private readonly quadBuffer: WebGLBuffer;
  private readonly instanceBuffer: WebGLBuffer;
  private readonly data: Float32Array;
  private readonly uResolution: WebGLUniformLocation;
  private readonly uCamera: WebGLUniformLocation;
  private readonly uZoom: WebGLUniformLocation;
  private readonly uPixelSnap: WebGLUniformLocation;

  constructor(private readonly gl: WebGL2RenderingContext, readonly capacity = 128) {
    this.program = createProgram(gl, LIGHT_VERTEX_SHADER, LIGHT_FRAGMENT_SHADER);
    const vao = gl.createVertexArray();
    const quad = gl.createBuffer();
    const instances = gl.createBuffer();
    if (!vao || !quad || !instances) throw new Error('Unable to create light batch buffers');
    this.vao = vao;
    this.quadBuffer = quad;
    this.instanceBuffer = instances;
    this.data = new Float32Array(capacity * INSTANCE_FLOATS);

    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
       1,  1,
    ]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, instances);
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
    attr(2, 1);
    attr(3, 4);
    attr(4, 2);
    gl.bindVertexArray(null);

    this.uResolution = uniform(gl, this.program, 'uResolution');
    this.uCamera = uniform(gl, this.program, 'uCamera');
    this.uZoom = uniform(gl, this.program, 'uZoom');
    this.uPixelSnap = uniform(gl, this.program, 'uPixelSnap');
  }

  draw(
    lights: readonly GpuLightCommand[],
    camera: Camera2D,
    width: number,
    height: number,
    tick: number,
    pixelSnap: boolean,
  ): { drawCalls: number; lights: number } {
    const gl = this.gl;
    let drawCalls = 0;
    let drawn = 0;
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);
    gl.uniform2f(this.uResolution, width, height);
    gl.uniform4f(this.uCamera, camera.x, camera.y, camera.shakeX ?? 0, camera.shakeY ?? 0);
    gl.uniform1f(this.uZoom, Math.max(0.25, camera.zoom));
    gl.uniform1f(this.uPixelSnap, pixelSnap ? 1 : 0);

    for (let start = 0; start < lights.length; start += this.capacity) {
      const count = Math.min(this.capacity, lights.length - start);
      let cursor = 0;
      for (let i = 0; i < count; i++) {
        const light = lights[start + i];
        const flicker = Math.max(0, Math.min(1, light.flicker ?? 0));
        const wave = flicker > 0 ? 1 - flicker * 0.5 + Math.sin((tick + (light.phase ?? 0)) * 0.17) * flicker * 0.5 : 1;
        this.data[cursor++] = light.x;
        this.data[cursor++] = light.y;
        this.data[cursor++] = Math.max(1, light.radius);
        this.data[cursor++] = light.color[0];
        this.data[cursor++] = light.color[1];
        this.data[cursor++] = light.color[2];
        this.data[cursor++] = Math.max(0, light.intensity * wave);
        this.data[cursor++] = Math.max(0, Math.min(0.95, light.innerRadius ?? 0));
        this.data[cursor++] = Math.max(0.1, light.falloff ?? 1.35);
      }

      // The shader's third light param is screen-space; update it through a tiny split if needed.
      // Mixed spaces are rare, so normalize each command by encoding screen-space in falloff sign is avoided.
      // Instead draw world and screen lists separately at the renderer level.
      gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.data.subarray(0, count * INSTANCE_FLOATS));
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
      drawCalls++;
      drawn += count;
    }
    gl.bindVertexArray(null);
    return { drawCalls, lights: drawn };
  }

  dispose(): void {
    const gl = this.gl;
    gl.deleteBuffer(this.quadBuffer);
    gl.deleteBuffer(this.instanceBuffer);
    gl.deleteVertexArray(this.vao);
    gl.deleteProgram(this.program);
  }
}
