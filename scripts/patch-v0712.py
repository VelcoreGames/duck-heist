from pathlib import Path
import re

root = Path('.')
lobby_path = root / 'src/game/graphics/lobbyArtV3.ts'
index_path = root / 'index.html'

text = lobby_path.read_text()

# Warmer, brighter stone palette with lower-contrast seams.
text = text.replace("const MARBLE_A = '#d9ccb6';\nconst MARBLE_B = '#d3c4ab';\nconst MARBLE_EDGE = '#b8a98f';",
                    "const MARBLE_A = '#e5d9c6';\nconst MARBLE_B = '#ddceb8';\nconst MARBLE_C = '#eadfce';\nconst MARBLE_D = '#d8c9b2';\nconst MARBLE_EDGE = 'rgba(105,82,63,.10)';")

pattern = r"function drawFloor\(ctx: Ctx, x: number, y: number, gx: number, gy: number\) \{.*?\n\}\n\nfunction drawWall"
replacement = r'''function drawFloor(ctx: Ctx, x: number, y: number, gx: number, gy: number) {
  const px = x * T, py = y * T;
  const slabTiles = 4;
  const slabPx = slabTiles * T;
  const slabX = Math.floor(x / slabTiles), slabY = Math.floor(y / slabTiles);
  const localX = ((x % slabTiles) + slabTiles) % slabTiles;
  const localY = ((y % slabTiles) + slabTiles) % slabTiles;
  const h = hash(slabX + gx * 11, slabY + gy * 17, 7);
  const palette = [MARBLE_A, MARBLE_B, MARBLE_C, MARBLE_D] as const;
  const base = palette[h % palette.length];
  r(ctx, px, py, T, T, base);

  // Gameplay stays on 32px tiles, but the eye reads broad 128px stone slabs.
  if (localX === 0) r(ctx, px, py, 1, T, MARBLE_EDGE);
  if (localY === 0) r(ctx, px, py, T, 1, MARBLE_EDGE);
  if (localX === slabTiles - 1) r(ctx, px + T - 1, py, 1, T, 'rgba(255,250,238,.055)');
  if (localY === slabTiles - 1) r(ctx, px, py + T - 1, T, 1, 'rgba(255,250,238,.05)');

  // Draw slab-scale veins through a per-tile clip so they continue naturally without overdraw.
  const ox = slabX * slabPx, oy = slabY * slabPx;
  ctx.save();
  ctx.beginPath();
  ctx.rect(px, py, T, T);
  ctx.clip();

  if (h % 2 === 0) {
    line(ctx, ox + 10, oy + 24, ox + 39, oy + 34, 'rgba(126,101,82,.075)', 1);
    line(ctx, ox + 39, oy + 34, ox + 70, oy + 29, 'rgba(126,101,82,.065)', 1);
    line(ctx, ox + 70, oy + 29, ox + 108, oy + 48, 'rgba(126,101,82,.055)', 1);
    line(ctx, ox + 82, oy + 84, ox + 120, oy + 96, 'rgba(255,255,250,.075)', 1);
  }
  if (h % 3 === 0) {
    line(ctx, ox + 17, oy + 109, ox + 47, oy + 90, 'rgba(139,112,91,.070)', 1);
    line(ctx, ox + 47, oy + 90, ox + 77, oy + 94, 'rgba(139,112,91,.055)', 1);
    line(ctx, ox + 77, oy + 94, ox + 111, oy + 78, 'rgba(139,112,91,.045)', 1);
  }
  if (h % 5 === 0) {
    line(ctx, ox + 6, oy + 68, ox + 29, oy + 61, 'rgba(255,252,242,.080)', 1);
    line(ctx, ox + 29, oy + 61, ox + 56, oy + 67, 'rgba(255,252,242,.055)', 1);
  }

  // Long polish streaks replace repetitive per-tile highlights.
  const sheen = ctx.createLinearGradient(ox + 18, oy + 8, ox + 110, oy + 118);
  sheen.addColorStop(0, 'rgba(255,255,250,0)');
  sheen.addColorStop(.48, 'rgba(255,252,242,.045)');
  sheen.addColorStop(.55, 'rgba(255,252,242,.018)');
  sheen.addColorStop(1, 'rgba(255,255,250,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(ox, oy, slabPx, slabPx);
  ctx.restore();

  // Sparse micro detail; deterministic and deliberately not aligned to the collision grid.
  const micro = hash(x + gx * 31, y + gy * 37, 23);
  if (micro % 17 === 0) {
    const mx = px + 5 + (micro % 19);
    const my = py + 7 + ((micro >>> 5) % 15);
    line(ctx, mx, my, mx + 7, my - 2, 'rgba(120,97,79,.055)', .75);
  }
}

function drawWall'''
text, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
if count != 1:
    raise SystemExit(f'floor replacement count={count}')

# Upgrade atmosphere: soft architectural depth, diagonal marble sheen and perimeter falloff.
pattern = r"export function drawChibiLobbyAtmosphereV3\(ctx: Ctx, frame: number\) \{.*?\n\}"
replacement = r'''export function drawChibiLobbyAtmosphereV3(ctx: Ctx, frame: number) {
  // Warm overhead pools, deliberately broad so the room reads as illustrated architecture.
  const lights: readonly [number, number, number][] = [[110, 44, 118], [240, 34, 152], [370, 44, 118]];
  for (const [x, y, radius] of lights) {
    const g = ctx.createRadialGradient(x, y, 10, x, y + 76, radius);
    g.addColorStop(0, `rgba(255,235,193,${.145 + Math.sin(frame * .016 + x) * .006})`);
    g.addColorStop(.46, 'rgba(249,221,169,.052)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - radius, y - 24, radius * 2, radius * 1.95);
  }

  // A large diagonal reflection breaks the remaining square rhythm on polished stone.
  const sheen = ctx.createLinearGradient(46, 78, CANVAS_WIDTH - 38, CANVAS_HEIGHT - 44);
  sheen.addColorStop(0, 'rgba(255,252,241,0)');
  sheen.addColorStop(.34, 'rgba(255,252,241,.018)');
  sheen.addColorStop(.50, 'rgba(255,252,241,.050)');
  sheen.addColorStop(.62, 'rgba(255,252,241,.012)');
  sheen.addColorStop(1, 'rgba(255,252,241,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(32, 32, CANVAS_WIDTH - 64, CANVAS_HEIGHT - 64);

  const floorGlow = ctx.createLinearGradient(0, 78, 0, CANVAS_HEIGHT - 26);
  floorGlow.addColorStop(0, 'rgba(255,249,232,.032)');
  floorGlow.addColorStop(.58, 'rgba(255,249,232,.010)');
  floorGlow.addColorStop(1, 'rgba(67,44,33,.050)');
  ctx.fillStyle = floorGlow;
  ctx.fillRect(32, 32, CANVAS_WIDTH - 64, CANVAS_HEIGHT - 64);

  // Gentle perimeter vignette gives depth without placing anything inside the collision space.
  const vignette = ctx.createRadialGradient(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 96, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 310);
  vignette.addColorStop(.48, 'rgba(35,27,24,0)');
  vignette.addColorStop(1, 'rgba(35,27,24,.075)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}'''
text, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
if count != 1:
    raise SystemExit(f'atmosphere replacement count={count}')

lobby_path.write_text(text)

index = index_path.read_text()
if '0.7.11-chibi-fluidity' not in index:
    raise SystemExit('Expected v0.7.11 marker not found')
index = index.replace('0.7.11-chibi-fluidity', '0.7.12-premium-lobby')
index_path.write_text(index)

print('Applied v0.7.12 premium lobby patch')
