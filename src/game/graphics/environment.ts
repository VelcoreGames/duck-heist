import { drawInsetRug, drawPixelFloor, drawWallPaneling } from './materials';
import { StaticSurfaceCache } from './surfaceCache';
import type { RoomMaterialTheme } from './themes';

export interface RoomBackdropOptions {
  width: number;
  height: number;
  inset?: number;
  wallDepth?: number;
  sideDepth?: number;
  rug?: boolean;
  rugWidth?: number;
  rugHeight?: number;
}

/**
 * Construye la arquitectura estática de una sala una sola vez y la cachea.
 * El resultado puede dibujarse cada frame con un único drawImage.
 */
export class ChibiRoomBackdropCache {
  constructor(private readonly cache: StaticSurfaceCache) {}

  build(
    key: string,
    theme: RoomMaterialTheme,
    seed: number,
    options: RoomBackdropOptions,
  ): HTMLCanvasElement {
    const width = Math.max(64, Math.floor(options.width));
    const height = Math.max(64, Math.floor(options.height));
    const inset = Math.max(0, Math.floor(options.inset ?? 32));
    const wallDepth = Math.max(8, Math.floor(options.wallDepth ?? inset));
    const sideDepth = Math.max(4, Math.floor(options.sideDepth ?? inset));
    const cacheKey = `${key}:${theme.id}:${seed}:${width}x${height}:${inset}:${wallDepth}:${sideDepth}:${options.rug ? 1 : 0}`;

    return this.cache.getOrCreate(cacheKey, width, height, ctx => {
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = theme.wallShadow;
      ctx.fillRect(0, 0, width, height);

      const floor = {
        x: sideDepth,
        y: wallDepth,
        w: Math.max(1, width - sideDepth * 2),
        h: Math.max(1, height - wallDepth - sideDepth),
      };
      drawPixelFloor(ctx, theme, floor, seed);

      drawWallPaneling(ctx, theme, { x: 0, y: 0, w: width, h: wallDepth });

      ctx.fillStyle = theme.wall;
      ctx.fillRect(0, wallDepth, sideDepth, height - wallDepth);
      ctx.fillRect(width - sideDepth, wallDepth, sideDepth, height - wallDepth);
      ctx.fillStyle = theme.wallShadow;
      ctx.fillRect(sideDepth - 4, wallDepth, 4, height - wallDepth);
      ctx.fillRect(width - sideDepth, wallDepth, 4, height - wallDepth);

      ctx.fillStyle = theme.trim;
      ctx.fillRect(sideDepth, wallDepth - 2, width - sideDepth * 2, 2);
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = theme.wallShadow;
      ctx.fillRect(sideDepth, height - sideDepth - 3, width - sideDepth * 2, 3);
      ctx.globalAlpha = 1;

      if (options.rug) {
        const rugWidth = Math.min(floor.w - 24, Math.max(40, Math.floor(options.rugWidth ?? floor.w * 0.52)));
        const rugHeight = Math.min(floor.h - 24, Math.max(24, Math.floor(options.rugHeight ?? floor.h * 0.24)));
        drawInsetRug(ctx, theme, {
          x: Math.round(width / 2 - rugWidth / 2),
          y: Math.round(wallDepth + floor.h * 0.62 - rugHeight / 2),
          w: rugWidth,
          h: rugHeight,
        });
      }
    });
  }

  draw(
    ctx: CanvasRenderingContext2D,
    key: string,
    theme: RoomMaterialTheme,
    seed: number,
    options: RoomBackdropOptions,
    x = 0,
    y = 0,
  ): void {
    const surface = this.build(key, theme, seed, options);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(surface, Math.round(x), Math.round(y));
    ctx.restore();
  }
}
