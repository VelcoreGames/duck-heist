export type Rgb = readonly [number, number, number];

export interface PaletteRamp {
  colors: readonly Rgb[];
}

function sampleRamp(ramp: PaletteRamp, t: number): Rgb {
  const colors = ramp.colors;
  if (!colors.length) return [1, 1, 1];
  if (colors.length === 1) return colors[0];
  const x = Math.max(0, Math.min(1, t)) * (colors.length - 1);
  const a = Math.floor(x);
  const b = Math.min(colors.length - 1, a + 1);
  const f = x - a;
  return [
    colors[a][0] + (colors[b][0] - colors[a][0]) * f,
    colors[a][1] + (colors[b][1] - colors[a][1]) * f,
    colors[a][2] + (colors[b][2] - colors[a][2]) * f,
  ];
}

export function createPaletteLut(ramps: readonly PaletteRamp[], width = 256): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(2, Math.round(width));
  canvas.height = Math.max(1, ramps.length);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Unable to create palette LUT');
  const image = ctx.createImageData(canvas.width, canvas.height);
  for (let y = 0; y < canvas.height; y++) {
    const ramp = ramps[y] ?? { colors: [[1, 1, 1] as const] };
    for (let x = 0; x < canvas.width; x++) {
      const rgb = sampleRamp(ramp, x / Math.max(1, canvas.width - 1));
      const offset = (y * canvas.width + x) * 4;
      image.data[offset] = Math.round(Math.max(0, Math.min(1, rgb[0])) * 255);
      image.data[offset + 1] = Math.round(Math.max(0, Math.min(1, rgb[1])) * 255);
      image.data[offset + 2] = Math.round(Math.max(0, Math.min(1, rgb[2])) * 255);
      image.data[offset + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

export const DUCK_HEIST_PALETTES: readonly PaletteRamp[] = [
  { colors: [[0.08, 0.08, 0.10], [0.40, 0.24, 0.15], [0.95, 0.73, 0.28], [1.00, 0.94, 0.66]] },
  { colors: [[0.05, 0.08, 0.12], [0.15, 0.35, 0.52], [0.45, 0.77, 0.92], [0.88, 0.97, 1.00]] },
  { colors: [[0.09, 0.06, 0.08], [0.45, 0.10, 0.18], [0.86, 0.31, 0.37], [1.00, 0.80, 0.66]] },
  { colors: [[0.07, 0.08, 0.07], [0.16, 0.43, 0.25], [0.48, 0.80, 0.42], [0.90, 1.00, 0.75]] },
  { colors: [[0.08, 0.07, 0.10], [0.32, 0.20, 0.50], [0.65, 0.42, 0.88], [0.95, 0.84, 1.00]] },
];
