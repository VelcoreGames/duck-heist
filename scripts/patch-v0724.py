from pathlib import Path
import re

root = Path('.')
module_path = root / 'src/game/graphics/chibiInteractablesV3.ts'
render_path = root / 'src/game/render.ts'
index_path = root / 'index.html'

module = r'''import { chibiThemeForFloor } from './themes';

type Ctx = CanvasRenderingContext2D;
const OUTLINE = '#30272b';
const DARK = '#21191d';
const CREAM = '#fff2cf';

function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string, stroke = OUTLINE, lw = 1.25) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fillStyle = fill; ctx.fill();
  if (stroke && lw > 0) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}
function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, fill: string, alpha = 1) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = fill;
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}
function groundShadow(ctx: Ctx, x: number, y: number, rx: number, ry: number, alpha = .13) {
  ellipse(ctx, x, y, rx * 1.35, ry * 1.35, DARK, alpha * .42);
  ellipse(ctx, x, y, rx, ry, DARK, alpha);
}
function sparkle(ctx: Ctx, x: number, y: number, frame: number, color: string, seed: number) {
  const phase = frame * .045 + seed * 1.71;
  const a = .25 + (Math.sin(phase) + 1) * .22;
  ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = color; ctx.lineWidth = 1;
  const r = 2.2 + Math.sin(phase * .7) * .65;
  ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x + r, y); ctx.moveTo(x, y - r); ctx.lineTo(x, y + r); ctx.stroke(); ctx.restore();
}

export function drawChibiChestV3(ctx: Ctx, x: number, y: number, opened: boolean, frame: number, floorIndex: number) {
  const t = chibiThemeForFloor(floorIndex);
  const bob = opened ? 0 : Math.sin(frame * .045) * .35;
  const cx = x + 16, baseY = y + 27;
  groundShadow(ctx, cx, baseY + 1, 13.5, 3.4);
  ctx.save(); ctx.translate(0, bob);
  rr(ctx, x + 3, y + 13, 26, 14, 4, t.wood, OUTLINE, 1.5);
  ctx.fillStyle = t.wallShadow; ctx.fillRect(x + 5, y + 20, 22, 5);
  ctx.fillStyle = t.gold; ctx.fillRect(x + 3, y + 17, 26, 2);
  ctx.fillStyle = t.trim; ctx.globalAlpha = .35; ctx.fillRect(x + 6, y + 14, 18, 1); ctx.globalAlpha = 1;
  if (opened) {
    ctx.save(); ctx.translate(cx, y + 13); ctx.rotate(-.55);
    rr(ctx, -13, -7, 26, 8, 4, t.wood, OUTLINE, 1.5);
    ctx.fillStyle = t.gold; ctx.fillRect(-12, -2, 24, 2); ctx.restore();
    const glow = .18 + Math.sin(frame * .08) * .04;
    ellipse(ctx, cx, y + 15, 13, 8, t.lightColor, glow);
  } else {
    rr(ctx, x + 4, y + 7, 24, 9, 5, t.wood, OUTLINE, 1.5);
    ctx.fillStyle = t.gold; ctx.fillRect(x + 5, y + 13, 22, 2);
  }
  rr(ctx, cx - 3, y + 16, 6, 7, 2, t.gold, OUTLINE, 1.05);
  ctx.fillStyle = CREAM; ctx.globalAlpha = .7; ctx.fillRect(cx - 1, y + 17, 2, 2); ctx.globalAlpha = 1;
  ctx.restore();
  if (!opened) { sparkle(ctx, x + 5, y + 9, frame, t.lightColor, 1); sparkle(ctx, x + 28, y + 12, frame, t.gold, 3); }
}

export function drawChibiPedestalV3(ctx: Ctx, x: number, y: number, frame: number, taken: boolean, floorIndex: number, accent?: string) {
  const t = chibiThemeForFloor(floorIndex);
  const c = accent ?? t.gold;
  const cx = x + 12, baseY = y + 25;
  groundShadow(ctx, cx, baseY + 1, 10.5, 2.8, taken ? .07 : .13);
  rr(ctx, x + 2, y + 18, 20, 8, 4, t.wallShadow, OUTLINE, 1.25);
  rr(ctx, x + 5, y + 10, 14, 11, 3, t.wall, OUTLINE, 1.2);
  ctx.fillStyle = t.trim; ctx.globalAlpha = .42; ctx.fillRect(x + 7, y + 12, 10, 1); ctx.globalAlpha = 1;
  rr(ctx, x, y + 7, 24, 6, 3, c, OUTLINE, 1.15);
  ctx.fillStyle = CREAM; ctx.globalAlpha = .26; ctx.fillRect(x + 4, y + 8, 12, 1); ctx.globalAlpha = 1;
  if (!taken) {
    const pulse = .10 + (Math.sin(frame * .055) + 1) * .035;
    ellipse(ctx, cx, y + 5, 16, 7, c, pulse);
    sparkle(ctx, x + 1, y + 5, frame, c, 2); sparkle(ctx, x + 22, y + 2, frame, t.lightColor, 4);
  }
}

export function drawChibiCandleV3(ctx: Ctx, x: number, y: number, frame: number, floorIndex: number) {
  const t = chibiThemeForFloor(floorIndex);
  const flicker = Math.sin(frame * .21 + x * .07 + y * .03);
  groundShadow(ctx, x + 4, y + 18, 4.3, 1.5, .09);
  rr(ctx, x + 1, y + 8, 6, 10, 2, '#ead9b6', OUTLINE, 1);
  ctx.fillStyle = '#fff6dc'; ctx.globalAlpha = .5; ctx.fillRect(x + 2, y + 9, 1, 7); ctx.globalAlpha = 1;
  ctx.fillStyle = '#34282a'; ctx.fillRect(x + 3.5, y + 6, 1, 3);
  const fy = y + 4.5 - Math.max(0, flicker) * .8;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  ellipse(ctx, x + 4, fy, 6.8 + flicker * .5, 8.2 + flicker * .8, t.lightColor, .075);
  ellipse(ctx, x + 4, fy, 2.8, 4.4 + flicker * .5, '#f5a640', .92);
  ellipse(ctx, x + 4, fy + .3, 1.25, 2.5, '#fff1a8', 1); ctx.restore();
}

export function drawChibiStairsV3(ctx: Ctx, x: number, y: number, frame: number, glowAmount: number, floorIndex: number) {
  const t = chibiThemeForFloor(floorIndex);
  const pulse = .55 + Math.sin(frame * .055) * .12;
  groundShadow(ctx, x + 16, y + 30, 18, 4.5, .12);
  ctx.save();
  const beam = ctx.createLinearGradient(x + 16, y - 28, x + 16, y + 30);
  beam.addColorStop(0, `rgba(255,231,160,${.015 * glowAmount})`);
  beam.addColorStop(1, `rgba(255,211,92,${.17 * pulse * glowAmount})`);
  ctx.fillStyle = beam; ctx.fillRect(x - 10, y - 28, 52, 60);
  rr(ctx, x - 1, y - 2, 34, 34, 5, t.wallShadow, OUTLINE, 1.4);
  for (let i = 0; i < 5; i++) {
    const inset = i * 2.4;
    const sy = y + 25 - i * 5.7;
    rr(ctx, x + inset + 2, sy, 28 - inset * 2, 6, 1.8, i % 2 ? t.metal : t.wall, OUTLINE, .8);
    ctx.fillStyle = t.gold; ctx.globalAlpha = .22 + i * .06; ctx.fillRect(x + inset + 4, sy + 1, 24 - inset * 2, 1); ctx.globalAlpha = 1;
  }
  rr(ctx, x - 4, y - 5, 3, 34, 1.5, t.gold, OUTLINE, .8);
  rr(ctx, x + 33, y - 5, 3, 34, 1.5, t.gold, OUTLINE, .8);
  ellipse(ctx, x - 2.5, y - 6, 2.5, 2.5, t.lightColor, .9);
  ellipse(ctx, x + 34.5, y - 6, 2.5, 2.5, t.lightColor, .9);
  ctx.restore();
}
'''
module_path.write_text(module)

render = render_path.read_text()
render = render.replace('  drawProjectile, drawCoin, drawChest,\n', '  drawProjectile, drawCoin,\n', 1)
render = render.replace('  drawPedestal, drawCandle,\n', '', 1)
anchor = "import { drawChibiThemedDoorV3, drawChibiThemedObstacleV3 } from './graphics/chibiWorldPropsV3';"
if anchor not in render: raise SystemExit('world props import missing')
render = render.replace(anchor, anchor + "\nimport { drawChibiChestV3, drawChibiPedestalV3, drawChibiCandleV3, drawChibiStairsV3 } from './graphics/chibiInteractablesV3';", 1)
render = render.replace('  if (content.stairs) drawStairs(ctx, content.stairs, f);', "  if (content.stairs) drawChibiStairsV3(ctx, content.stairs.x, content.stairs.y, f, content.stairs.glow, engine.map.floorIndex);", 1)
render = render.replace('    drawCandle(ctx, TILE_SIZE * 3, CANVAS_HEIGHT / 2 - 30, f);', '    drawChibiCandleV3(ctx, TILE_SIZE * 3, CANVAS_HEIGHT / 2 - 30, f, engine.map.floorIndex);', 1)
render = render.replace('    drawCandle(ctx, CANVAS_WIDTH - TILE_SIZE * 3 - 8, CANVAS_HEIGHT / 2 - 30, f);', '    drawChibiCandleV3(ctx, CANVAS_WIDTH - TILE_SIZE * 3 - 8, CANVAS_HEIGHT / 2 - 30, f, engine.map.floorIndex);', 1)
render = render.replace('    drawCandle(ctx, TILE_SIZE * 4.5, CANVAS_HEIGHT / 2 + 50, f + 40);', '    drawChibiCandleV3(ctx, TILE_SIZE * 4.5, CANVAS_HEIGHT / 2 + 50, f + 40, engine.map.floorIndex);', 1)
render = render.replace('    drawCandle(ctx, CANVAS_WIDTH - TILE_SIZE * 4.5, CANVAS_HEIGHT / 2 + 50, f + 40);', '    drawChibiCandleV3(ctx, CANVAS_WIDTH - TILE_SIZE * 4.5, CANVAS_HEIGHT / 2 + 50, f + 40, engine.map.floorIndex);', 1)
render = render.replace('  if (content.chest) drawChest(ctx, content.chest.x, content.chest.y, content.chest.opened, f);', '  if (content.chest) drawChibiChestV3(ctx, content.chest.x, content.chest.y, content.chest.opened, f, engine.map.floorIndex);', 1)
render = render.replace('    drawPedestal(ctx,event.x-4,event.y+9,f,event.used);', '    drawChibiPedestalV3(ctx,event.x-4,event.y+9,f,event.used,engine.map.floorIndex);', 1)
render = render.replace('  drawPedestal(ctx,ped.x,ped.y+6,f,ped.taken,color);', '  drawChibiPedestalV3(ctx,ped.x,ped.y+6,f,ped.taken,engine.map.floorIndex,color);', 1)
pattern = r"\nfunction drawStairs\(ctx: CanvasRenderingContext2D, st: NonNullable<RoomContent\['stairs'\]>, f: number\) \{.*?\n\}\n\nfunction drawPedestalFull"
render, count = re.subn(pattern, '\nfunction drawPedestalFull', render, count=1, flags=re.S)
if count != 1: raise SystemExit('local drawStairs block not found')
render_path.write_text(render)

index = index_path.read_text()
if '0.7.23-world-props-chibi' not in index: raise SystemExit('v0.7.23 marker missing')
index = index.replace('0.7.23-world-props-chibi', '0.7.24-chibi-interactables')
index_path.write_text(index)
print('Applied v0.7.24 chibi interactables pass')
