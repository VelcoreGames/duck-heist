import type { PixelRect } from './types';
import type { RoomMaterialTheme } from './themes';

const hash2d = (x: number, y: number, seed: number) => {
  let n = Math.imul(x + seed * 17, 374761393) ^ Math.imul(y - seed * 31, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return (n ^ (n >>> 16)) >>> 0;
};

const tileColor = (theme: RoomMaterialTheme, tx: number, ty: number, seed: number) => {
  switch (theme.floorPattern) {
    case 'checker': return (tx + ty) % 2 === 0 ? theme.floorA : theme.floorB;
    case 'grid': return (tx % 3 === 0 || ty % 3 === 0) ? theme.floorB : theme.floorA;
    case 'stone': return hash2d(tx, ty, seed) % 3 === 0 ? theme.floorB : theme.floorA;
    case 'metal': return (tx + (ty % 2)) % 4 === 0 ? theme.floorB : theme.floorA;
    case 'gold': return hash2d(tx, ty, seed) % 5 < 2 ? theme.floorB : theme.floorA;
  }
};

export function drawPixelFloor(
  ctx: CanvasRenderingContext2D,
  theme: RoomMaterialTheme,
  area: PixelRect,
  seed = 0,
): void {
  const tile = Math.max(8, Math.round(theme.floorTileSize));
  const startX = Math.floor(area.x / tile) * tile;
  const startY = Math.floor(area.y / tile) * tile;
  const endX = area.x + area.w;
  const endY = area.y + area.h;

  ctx.save();
  ctx.beginPath();
  ctx.rect(area.x, area.y, area.w, area.h);
  ctx.clip();
  ctx.imageSmoothingEnabled = false;

  for (let y = startY; y < endY; y += tile) {
    for (let x = startX; x < endX; x += tile) {
      const tx = Math.floor(x / tile);
      const ty = Math.floor(y / tile);
      ctx.fillStyle = tileColor(theme, tx, ty, seed);
      ctx.fillRect(x, y, tile, tile);

      const h = hash2d(tx, ty, seed);
      if ((h & 3) === 0) {
        ctx.globalAlpha = 0.14;
        ctx.fillStyle = theme.grout;
        ctx.fillRect(x + 5 + (h % Math.max(1, tile - 9)), y + 5 + ((h >>> 5) % Math.max(1, tile - 9)), 1, 1);
        ctx.globalAlpha = 1;
      }

      if (theme.floorPattern === 'metal') {
        ctx.globalAlpha = 0.12;
        ctx.fillStyle = theme.trim;
        ctx.fillRect(x + 3, y + 3, Math.max(1, tile - 6), 1);
        ctx.globalAlpha = 1;
      } else if (theme.floorPattern === 'gold' && (h & 7) === 0) {
        ctx.globalAlpha = 0.22;
        ctx.fillStyle = theme.gold;
        ctx.fillRect(x + 4, y + 4, Math.max(2, Math.floor(tile * 0.3)), 1);
        ctx.globalAlpha = 1;
      }
    }
  }

  ctx.fillStyle = theme.grout;
  ctx.globalAlpha = 0.48;
  for (let x = startX; x <= endX; x += tile) ctx.fillRect(x, area.y, 1, area.h);
  for (let y = startY; y <= endY; y += tile) ctx.fillRect(area.x, y, area.w, 1);
  ctx.globalAlpha = 1;
  ctx.restore();
}

export function drawWallPaneling(
  ctx: CanvasRenderingContext2D,
  theme: RoomMaterialTheme,
  area: PixelRect,
): void {
  const panel = Math.max(16, Math.round(theme.wallPanelWidth));
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = theme.wall;
  ctx.fillRect(area.x, area.y, area.w, area.h);

  ctx.fillStyle = theme.wallShadow;
  ctx.fillRect(area.x, area.y + area.h - 5, area.w, 5);
  ctx.fillStyle = theme.trim;
  ctx.fillRect(area.x, area.y, area.w, 2);
  ctx.fillRect(area.x, area.y + area.h - 7, area.w, 2);

  ctx.globalAlpha = 0.35;
  ctx.fillStyle = theme.wallShadow;
  const start = Math.floor(area.x / panel) * panel;
  for (let x = start; x <= area.x + area.w; x += panel) {
    ctx.fillRect(x, area.y + 3, 1, Math.max(0, area.h - 11));
  }
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = theme.trim;
  for (let x = start + 2; x <= area.x + area.w; x += panel) {
    ctx.fillRect(x, area.y + 4, 1, Math.max(0, area.h - 13));
  }
  ctx.restore();
}

export function drawInsetRug(
  ctx: CanvasRenderingContext2D,
  theme: RoomMaterialTheme,
  area: PixelRect,
): void {
  const x = Math.round(area.x);
  const y = Math.round(area.y);
  const w = Math.max(8, Math.round(area.w));
  const h = Math.max(8, Math.round(area.h));
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = 0.24;
  ctx.fillStyle = theme.wallShadow;
  ctx.fillRect(x + 2, y + 3, w, h);
  ctx.globalAlpha = 1;
  ctx.fillStyle = theme.gold;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = theme.accent;
  ctx.fillRect(x + 2, y + 2, Math.max(1, w - 4), Math.max(1, h - 4));
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = '#000000';
  ctx.fillRect(x + 5, y + 5, Math.max(1, w - 10), Math.max(1, h - 10));
  ctx.globalAlpha = 1;
  ctx.restore();
}

export function drawBrassEdge(
  ctx: CanvasRenderingContext2D,
  theme: RoomMaterialTheme,
  area: PixelRect,
): void {
  ctx.save();
  ctx.fillStyle = theme.wallShadow;
  ctx.fillRect(area.x + 1, area.y + 2, area.w, area.h);
  ctx.fillStyle = theme.gold;
  ctx.fillRect(area.x, area.y, area.w, area.h);
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#fff7c2';
  ctx.fillRect(area.x + 1, area.y + 1, Math.max(0, area.w - 2), 1);
  ctx.restore();
}
