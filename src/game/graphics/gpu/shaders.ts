export const SPRITE_VERTEX_SHADER = `#version 300 es
precision highp float;

layout(location=0) in vec4 aCorner;
layout(location=1) in vec2 aPosition;
layout(location=2) in vec2 aSize;
layout(location=3) in vec2 aPivot;
layout(location=4) in vec4 aUvRect;
layout(location=5) in vec4 aColor;
layout(location=6) in vec4 aTransform;
layout(location=7) in vec4 aEffects;
layout(location=8) in vec2 aPalette;
layout(location=9) in float aSpace;

uniform vec2 uResolution;
uniform vec4 uCamera;
uniform float uZoom;
uniform float uPixelSnap;

out vec2 vUv;
out vec2 vLocal;
out vec4 vUvRect;
out vec4 vColor;
out vec4 vEffects;
out vec2 vPalette;
flat out float vShape;

void main() {
  vec2 local = aCorner.xy * aSize - aPivot;
  float c = cos(aTransform.x);
  float s = sin(aTransform.x);
  local = mat2(c, -s, s, c) * local;
  vec2 p = aPosition + local;

  if (aSpace < 0.5) {
    p = (p - uCamera.xy) * uZoom + uCamera.zw;
  }
  if (uPixelSnap > 0.5) p = floor(p + 0.5);

  vec2 clip = (p / uResolution) * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);

  vec2 uvCorner = aCorner.zw;
  if (aTransform.y > 0.5) uvCorner.x = 1.0 - uvCorner.x;
  if (aTransform.z > 0.5) uvCorner.y = 1.0 - uvCorner.y;
  vUv = mix(aUvRect.xy, aUvRect.zw, uvCorner);
  vLocal = aCorner.xy * 2.0 - 1.0;
  vUvRect = aUvRect;
  vColor = aColor;
  vEffects = aEffects;
  vPalette = aPalette;
  vShape = aTransform.w;
}
`;

export const SPRITE_FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform sampler2D uTexture;
uniform sampler2D uPaletteLut;
uniform vec2 uTexel;
uniform float uUsePalette;
uniform float uPaletteRows;

in vec2 vUv;
in vec2 vLocal;
in vec4 vUvRect;
in vec4 vColor;
in vec4 vEffects;
in vec2 vPalette;
flat in float vShape;
out vec4 outColor;

float sampleAlpha(vec2 uv) {
  vec2 safeUv = clamp(uv, vUvRect.xy + uTexel * 0.5, vUvRect.zw - uTexel * 0.5);
  return texture(uTexture, safeUv).a;
}

void main() {
  vec4 texel = texture(uTexture, vUv);
  if (vShape > 0.5) {
    float d = length(vLocal);
    texel = vec4(1.0, 1.0, 1.0, 1.0 - smoothstep(0.82, 1.0, d));
  }

  float alpha = texel.a * vColor.a;
  if (alpha <= 0.001) discard;

  vec3 rgb = texel.rgb;
  float paletteStrength = clamp(vEffects.w, 0.0, 1.0) * uUsePalette;
  if (paletteStrength > 0.001) {
    float luma = dot(rgb, vec3(0.299, 0.587, 0.114));
    float row = (vPalette.x + 0.5) / max(1.0, uPaletteRows);
    vec3 mapped = texture(uPaletteLut, vec2(clamp(luma, 0.002, 0.998), row)).rgb;
    rgb = mix(rgb, mapped, paletteStrength);
  }

  float leftA = sampleAlpha(vUv + vec2(-uTexel.x, 0.0));
  float rightA = sampleAlpha(vUv + vec2(uTexel.x, 0.0));
  float upA = sampleAlpha(vUv + vec2(0.0, -uTexel.y));
  float downA = sampleAlpha(vUv + vec2(0.0, uTexel.y));
  float neighborMin = min(min(leftA, rightA), min(upA, downA));
  float edge = step(0.02, texel.a) * (1.0 - smoothstep(0.25, 0.95, neighborMin));

  float outline = clamp(vEffects.y, 0.0, 1.0) * edge;
  rgb = mix(rgb, rgb * 0.18, outline);

  float directionalEdge = max(0.0, texel.a - max(leftA, upA));
  float rim = clamp(vEffects.z, 0.0, 1.0) * smoothstep(0.02, 0.5, directionalEdge);
  rgb = mix(rgb, vec3(1.0, 0.92, 0.68), rim * 0.7);

  float flash = clamp(vEffects.x, 0.0, 1.0);
  rgb = mix(rgb, vec3(1.0, 0.96, 0.82), flash);
  rgb *= vColor.rgb;
  outColor = vec4(rgb, alpha);
}
`;

export const LIGHT_VERTEX_SHADER = `#version 300 es
precision highp float;
layout(location=0) in vec2 aCorner;
layout(location=1) in vec2 aCenter;
layout(location=2) in float aRadius;
layout(location=3) in vec4 aColorIntensity;
layout(location=4) in vec4 aParams;

uniform vec2 uResolution;
uniform vec4 uCamera;
uniform float uZoom;
uniform float uPixelSnap;

out vec2 vLocal;
out vec3 vColor;
out vec3 vParams;

void main() {
  float screenSpace = aParams.z;
  vec2 center = aCenter;
  float radius = aRadius;
  if (screenSpace < 0.5) {
    center = (center - uCamera.xy) * uZoom + uCamera.zw;
    radius *= uZoom;
  }
  if (uPixelSnap > 0.5) center = floor(center + 0.5);
  vec2 p = center + aCorner * radius;
  vec2 clip = (p / uResolution) * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  vLocal = aCorner;
  vColor = aColorIntensity.rgb;
  vParams = vec3(aColorIntensity.a, aParams.x, aParams.y);
}
`;

export const LIGHT_FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec2 vLocal;
in vec3 vColor;
in vec3 vParams;
out vec4 outColor;

void main() {
  float d = length(vLocal);
  if (d >= 1.0) discard;
  float intensity = vParams.x;
  float inner = clamp(vParams.y, 0.0, 0.95);
  float falloff = max(0.1, vParams.z);
  float t = clamp((d - inner) / max(0.001, 1.0 - inner), 0.0, 1.0);
  float a = pow(1.0 - smoothstep(0.0, 1.0, t), falloff) * intensity;
  outColor = vec4(vColor * a, a);
}
`;

export const FULLSCREEN_VERTEX_SHADER = `#version 300 es
precision highp float;
layout(location=0) in vec2 aPosition;
out vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

export const COMPOSITE_FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D uScene;
uniform sampler2D uLight;
uniform vec2 uResolution;
uniform vec3 uAmbientTint;
uniform float uAmbientDarkness;
uniform float uTintStrength;
uniform float uVignette;
uniform float uLightStrength;
uniform float uExposure;
uniform float uGamma;
uniform float uSaturation;
in vec2 vUv;
out vec4 outColor;

void main() {
  vec4 scene = texture(uScene, vUv);
  vec3 light = texture(uLight, vUv).rgb * uLightStrength;
  vec3 color = scene.rgb;
  color *= 1.0 - clamp(uAmbientDarkness, 0.0, 0.92);
  color = mix(color, color * uAmbientTint, clamp(uTintStrength, 0.0, 1.0));
  color = 1.0 - (1.0 - color) * (1.0 - clamp(light, 0.0, 2.0));

  float luma = dot(color, vec3(0.299, 0.587, 0.114));
  color = mix(vec3(luma), color, max(0.0, uSaturation));
  color = vec3(1.0) - exp(-color * max(0.01, uExposure));
  color = pow(max(color, vec3(0.0)), vec3(1.0 / max(0.1, uGamma)));

  vec2 p = vUv * 2.0 - 1.0;
  float vig = smoothstep(0.38, 1.35, dot(p, p));
  color *= 1.0 - vig * clamp(uVignette, 0.0, 0.8);
  outColor = vec4(color, scene.a);
}
`;
