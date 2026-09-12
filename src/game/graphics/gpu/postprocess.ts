import { createProgram, uniform } from './gl';
import { COMPOSITE_FRAGMENT_SHADER, FULLSCREEN_VERTEX_SHADER } from './shaders';
import type { GpuPostStyle } from './types';

export class GpuPostProcessor {
  private readonly program: WebGLProgram;
  private readonly vao: WebGLVertexArrayObject;
  private readonly buffer: WebGLBuffer;
  private readonly uScene: WebGLUniformLocation;
  private readonly uLight: WebGLUniformLocation;
  private readonly uResolution: WebGLUniformLocation;
  private readonly uAmbientTint: WebGLUniformLocation;
  private readonly uAmbientDarkness: WebGLUniformLocation;
  private readonly uTintStrength: WebGLUniformLocation;
  private readonly uVignette: WebGLUniformLocation;
  private readonly uLightStrength: WebGLUniformLocation;
  private readonly uExposure: WebGLUniformLocation;
  private readonly uGamma: WebGLUniformLocation;
  private readonly uSaturation: WebGLUniformLocation;

  constructor(private readonly gl: WebGL2RenderingContext) {
    this.program = createProgram(gl, FULLSCREEN_VERTEX_SHADER, COMPOSITE_FRAGMENT_SHADER);
    const vao = gl.createVertexArray();
    const buffer = gl.createBuffer();
    if (!vao || !buffer) throw new Error('Unable to create postprocess quad');
    this.vao = vao;
    this.buffer = buffer;
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, 0);
    gl.bindVertexArray(null);

    this.uScene = uniform(gl, this.program, 'uScene');
    this.uLight = uniform(gl, this.program, 'uLight');
    this.uResolution = uniform(gl, this.program, 'uResolution');
    this.uAmbientTint = uniform(gl, this.program, 'uAmbientTint');
    this.uAmbientDarkness = uniform(gl, this.program, 'uAmbientDarkness');
    this.uTintStrength = uniform(gl, this.program, 'uTintStrength');
    this.uVignette = uniform(gl, this.program, 'uVignette');
    this.uLightStrength = uniform(gl, this.program, 'uLightStrength');
    this.uExposure = uniform(gl, this.program, 'uExposure');
    this.uGamma = uniform(gl, this.program, 'uGamma');
    this.uSaturation = uniform(gl, this.program, 'uSaturation');
  }

  draw(scene: WebGLTexture, light: WebGLTexture, width: number, height: number, style: GpuPostStyle): void {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, width, height);
    gl.disable(gl.BLEND);
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, scene);
    gl.uniform1i(this.uScene, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, light);
    gl.uniform1i(this.uLight, 1);
    gl.uniform2f(this.uResolution, width, height);
    gl.uniform3f(this.uAmbientTint, style.ambientTint[0], style.ambientTint[1], style.ambientTint[2]);
    gl.uniform1f(this.uAmbientDarkness, style.ambientDarkness);
    gl.uniform1f(this.uTintStrength, style.tintStrength);
    gl.uniform1f(this.uVignette, style.vignette);
    gl.uniform1f(this.uLightStrength, style.lightStrength);
    gl.uniform1f(this.uExposure, style.exposure);
    gl.uniform1f(this.uGamma, style.gamma);
    gl.uniform1f(this.uSaturation, style.saturation);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
  }

  dispose(): void {
    const gl = this.gl;
    gl.deleteBuffer(this.buffer);
    gl.deleteVertexArray(this.vao);
    gl.deleteProgram(this.program);
  }
}
