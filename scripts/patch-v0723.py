from pathlib import Path

root = Path('.')
module_path = root / 'src/game/graphics/chibiWorldPropsV3.ts'
render_path = root / 'src/game/render.ts'
index_path = root / 'index.html'

module = r'''import { chibiThemeForFloor, type RoomMaterialTheme } from './themes';

type Ctx = CanvasRenderingContext2D;
type DoorStyle = 'gold' | 'boss' | 'green' | 'orange' | 'purple' | 'silver' | string;

const OUTLINE = '#30272b';
const SHADOW = '#21191d';
const CREAM = '#efe6d5';
const CREAM_LIGHT = '#fff8e8';
const RED = '#99505a';
const RED_LIGHT = '#c76d73';
const BAG = '#aa8865';
const BAG_LIGHT = '#d2b28a';
const BREAD = '#d9a961';
const BREAD_LIGHT = '#f2cc83';

function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string, stroke = OUTLINE, lw = 1.3) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fillStyle = fill; ctx.fill();
  if (stroke && lw) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}
function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, fill: string, stroke = OUTLINE, lw = 1.25) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill();
  if (stroke && lw) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}
function shadow(ctx: Ctx, x: number, y: number, rx = 14, ry = 3.6) {
  ctx.save(); ctx.globalAlpha = .11; ctx.fillStyle = SHADOW;
  ctx.beginPath(); ctx.ellipse(x + 16, y + 28.2, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}
function hi(ctx: Ctx, x: number, y: number, w: number, color = '#ffffff', alpha = .23) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = color; ctx.fillRect(x, y, w, 1); ctx.restore();
}

function styleAccent(style: DoorStyle, theme: RoomMaterialTheme): [string, string] {
  switch (style) {
    case 'gold': return [theme.gold, '#ffe59a'];
    case 'boss': return ['#a94f54', '#f08a79'];
    case 'green': return ['#4f8168', '#8bc19a'];
    case 'orange': return ['#b86b3d', '#eca363'];
    case 'purple': return ['#785b8d', '#b28bc3'];
    default: return [theme.metal, theme.trim];
  }
}

export function drawChibiThemedDoorV3(
  ctx: Ctx, x: number, y: number, dir: string, style: DoorStyle,
  locked: boolean, anim: number, frame: number, floorIndex: number,
) {
  const theme = chibiThemeForFloor(floorIndex);
  const horizontal = dir === 'up' || dir === 'down';
  const [accent, accentHi] = styleAccent(style, theme);
  const open = Math.max(0, Math.min(1, anim));
  const pulse = .62 + Math.sin(frame * .055 + floorIndex) * .10;
  shadow(ctx, x, y, horizontal ? 14.5 : 8, horizontal ? 3.3 : 6.8);
  ctx.save();

  if (horizontal) {
    rr(ctx, x + 1, y + 4, 30, 24, 5, theme.wallShadow);
    rr(ctx, x + 3, y + 6, 26, 20, 4, theme.wood);
    rr(ctx, x + 5, y + 8, 22, 16, 3, theme.wall);
    hi(ctx, x + 7, y + 9, 18, theme.trim, .28);
    ctx.fillStyle = theme.gold; ctx.fillRect(x + 3, y + 5, 26, 2);
    hi(ctx, x + 6, y + 5, 12, '#fff3c4', .35);
    const gap = 3 + open * 11;
    const slab = Math.max(2, 10 - gap * .42);
    rr(ctx, x + 6, y + 11, slab, 10, 2, accent, '', 0);
    rr(ctx, x + 26 - slab, y + 11, slab, 10, 2, accent, '', 0);
    ctx.fillStyle = '#111719'; ctx.globalAlpha = .38 + open * .44;
    ctx.fillRect(x + 16 - gap * .5, y + 10, gap, 13); ctx.globalAlpha = 1;
    rr(ctx, x + 13, y + 2, 6, 5, 2, accent);
    ctx.globalAlpha = pulse; ctx.fillStyle = accentHi; ctx.fillRect(x + 14.5, y + 3, 3, 1); ctx.globalAlpha = 1;
  } else {
    rr(ctx, x + 4, y + 1, 24, 30, 5, theme.wallShadow);
    rr(ctx, x + 6, y + 3, 20, 26, 4, theme.wood);
    rr(ctx, x + 8, y + 5, 16, 22, 3, theme.wall);
    hi(ctx, x + 9, y + 7, 1, theme.trim, .30);
    ctx.fillStyle = theme.gold; ctx.fillRect(x + 5, y + 3, 2, 26);
    const gap = 3 + open * 11;
    const slab = Math.max(2, 10 - gap * .42);
    rr(ctx, x + 11, y + 6, 10, slab, 2, accent, '', 0);
    rr(ctx, x + 11, y + 26 - slab, 10, slab, 2, accent, '', 0);
    ctx.fillStyle = '#111719'; ctx.globalAlpha = .38 + open * .44;
    ctx.fillRect(x + 10, y + 16 - gap * .5, 12, gap); ctx.globalAlpha = 1;
    rr(ctx, x + 25, y + 13, 5, 6, 2, accent);
    ctx.globalAlpha = pulse; ctx.fillStyle = accentHi; ctx.fillRect(x + 26, y + 14.5, 1, 3); ctx.globalAlpha = 1;
  }

  if (locked) {
    const cx = x + 16, cy = y + 16;
    rr(ctx, cx - 4, cy - 1, 8, 7, 2, theme.wallShadow, OUTLINE, 1.1);
    ctx.strokeStyle = theme.gold; ctx.lineWidth = 1.35; ctx.beginPath(); ctx.arc(cx, cy - 1, 3.2, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = CREAM_LIGHT; ctx.globalAlpha = .72; ctx.fillRect(cx - .7, cy + 1, 1.4, 2.2); ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function counter(ctx: Ctx, x: number, y: number, t: RoomMaterialTheme) {
  shadow(ctx, x, y, 15, 4); rr(ctx, x + 2, y + 10, 28, 17, 4, t.wallShadow); rr(ctx, x + 4, y + 12, 24, 13, 3, t.wood);
  hi(ctx, x + 6, y + 13, 20, t.trim, .30); rr(ctx, x, y + 6, 32, 7, 3, t.floorA); hi(ctx, x + 3, y + 7, 26, CREAM_LIGHT, .28);
  rr(ctx, x + 8, y + 17, 16, 7, 2, t.wallShadow, '', 0); rr(ctx, x + 9, y + 18, 14, 5, 2, t.accent, '', 0);
}
function barrier(ctx: Ctx, x: number, y: number, t: RoomMaterialTheme) {
  shadow(ctx, x, y, 15, 3.5); ellipse(ctx, x + 7, y + 27, 5, 2.6, t.wallShadow); ellipse(ctx, x + 25, y + 27, 5, 2.6, t.wallShadow);
  rr(ctx, x + 5, y + 8, 4, 18, 2, t.gold); rr(ctx, x + 23, y + 8, 4, 18, 2, t.gold); ellipse(ctx, x + 7, y + 9, 4, 3, t.trim); ellipse(ctx, x + 25, y + 9, 4, 3, t.trim);
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x + 9, y + 12); ctx.bezierCurveTo(x + 14, y + 18, x + 18, y + 18, x + 23, y + 12); ctx.stroke();
  ctx.strokeStyle = floorRope(t); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 9, y + 12); ctx.bezierCurveTo(x + 14, y + 18, x + 18, y + 18, x + 23, y + 12); ctx.stroke();
}
function floorRope(t: RoomMaterialTheme) { return t.id === 'gold_reserve' ? '#b07a39' : t.id === 'security' ? '#3f7c91' : t.id === 'vault' ? '#8d7545' : RED; }
function shelf(ctx: Ctx, x: number, y: number, t: RoomMaterialTheme) {
  shadow(ctx, x, y, 15, 4); rr(ctx, x + 3, y + 4, 26, 24, 3, t.wallShadow); rr(ctx, x + 5, y + 6, 22, 20, 2, t.metal);
  ctx.fillStyle = t.trim; ctx.fillRect(x + 6, y + 13, 20, 2); ctx.fillRect(x + 6, y + 21, 20, 2);
  rr(ctx, x + 7, y + 8, 6, 4, 1, CREAM, '', 0); rr(ctx, x + 15, y + 7, 5, 5, 1, t.wood, '', 0); rr(ctx, x + 21, y + 8, 4, 4, 1, t.gold, '', 0);
  rr(ctx, x + 8, y + 17, 8, 3, 1, t.accent, '', 0); rr(ctx, x + 18, y + 16, 7, 4, 1, CREAM_LIGHT, '', 0);
}
function moneyBag(ctx: Ctx, x: number, y: number, t: RoomMaterialTheme, frame: number) {
  const bob = Math.sin(frame * .04) * .55; shadow(ctx, x, y, 13, 4); ellipse(ctx, x + 16, y + 20 + bob, 11.5, 9.5, BAG); ctx.globalAlpha = .52;
  ellipse(ctx, x + 12, y + 17 + bob, 4, 3, BAG_LIGHT, '', 0); ctx.globalAlpha = 1; rr(ctx, x + 10, y + 8 + bob, 12, 6, 2, BAG_LIGHT);
  ctx.fillStyle = t.wallShadow; ctx.fillRect(x + 9, y + 12 + bob, 14, 2); ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = t.gold; ctx.fillText('$', x + 16, y + 21 + bob);
}
function breadCrate(ctx: Ctx, x: number, y: number, t: RoomMaterialTheme) {
  shadow(ctx, x, y, 15, 4); ellipse(ctx, x + 10, y + 10, 6, 5, BREAD); ellipse(ctx, x + 21, y + 9, 6, 4.5, BREAD_LIGHT);
  rr(ctx, x + 3, y + 10, 26, 17, 3, t.wood); hi(ctx, x + 5, y + 14, 22, t.trim, .25); ctx.fillStyle = t.wallShadow;
  ctx.fillRect(x + 8, y + 11, 2, 15); ctx.fillRect(x + 22, y + 11, 2, 15); ctx.fillStyle = t.accent; ctx.fillRect(x + 5, y + 21, 22, 2);
}
function column(ctx: Ctx, x: number, y: number, t: RoomMaterialTheme) {
  shadow(ctx, x, y, 14, 4); rr(ctx, x + 8, y + 3, 16, 25, 4, t.floorA); hi(ctx, x + 10, y + 5, 4, CREAM_LIGHT, .25);
  rr(ctx, x + 5, y + 1, 22, 6, 3, t.trim); rr(ctx, x + 5, y + 24, 22, 6, 3, t.trim); ctx.fillStyle = t.gold; ctx.fillRect(x + 7, y + 6, 2, 18); ctx.fillRect(x + 23, y + 6, 2, 18);
}
function safe(ctx: Ctx, x: number, y: number, t: RoomMaterialTheme, frame: number) {
  shadow(ctx, x, y, 15, 4); rr(ctx, x + 3, y + 5, 26, 23, 4, t.wallShadow); rr(ctx, x + 5, y + 7, 22, 19, 3, t.metal); hi(ctx, x + 7, y + 9, 18, t.trim, .3);
  rr(ctx, x + 9, y + 12, 14, 11, 2, t.wall); ellipse(ctx, x + 16, y + 17, 5, 5, t.gold); const a = frame * .025; ellipse(ctx, x + 16 + Math.cos(a) * 4, y + 17 + Math.sin(a) * 4, 1.8, 1.8, t.trim, '', 0);
}
function rubble(ctx: Ctx, x: number, y: number, t: RoomMaterialTheme) {
  shadow(ctx, x, y, 15, 3.5); rr(ctx, x + 4, y + 19, 11, 8, 2, t.floorB); rr(ctx, x + 12, y + 15, 13, 11, 2, t.floorA); rr(ctx, x + 21, y + 20, 7, 6, 2, t.wood);
  ellipse(ctx, x + 9, y + 16, 2, 2, t.gold, '', 0); ellipse(ctx, x + 18, y + 12, 2, 2, t.accent, '', 0);
}

export function drawChibiThemedObstacleV3(ctx: Ctx, x: number, y: number, kind: number, frame: number, floorIndex: number) {
  const t = chibiThemeForFloor(floorIndex);
  switch (kind) {
    case 0: counter(ctx, x, y, t); break;
    case 1: barrier(ctx, x, y, t); break;
    case 2: shelf(ctx, x, y, t); break;
    case 3: moneyBag(ctx, x, y, t, frame); break;
    case 4: breadCrate(ctx, x, y, t); break;
    case 5: column(ctx, x, y, t); break;
    case 6: safe(ctx, x, y, t, frame); break;
    default: rubble(ctx, x, y, t); break;
  }
}
'''
module_path.write_text(module)

render = render_path.read_text()
marker = "import { drawChibiLobbyDoorV3 } from './graphics/lobbyDoorV3';"
if marker not in render: raise SystemExit('lobby door import missing')
render = render.replace(marker, marker + "\nimport { drawChibiThemedDoorV3, drawChibiThemedObstacleV3 } from './graphics/chibiWorldPropsV3';", 1)

old_door = """    if (engine.map.floorIndex === 0) {
      drawChibiLobbyDoorV3(ctx, t.x * TILE_SIZE, t.y * TILE_SIZE, d, style, !room.cleared, content.doorAnim[d] ?? 0, f);
    } else {
      drawDoor(ctx, t.x * TILE_SIZE, t.y * TILE_SIZE, d, style, !room.cleared, content.doorAnim[d] ?? 0, f);
    }"""
new_door = """    if (engine.map.floorIndex === 0) {
      drawChibiLobbyDoorV3(ctx, t.x * TILE_SIZE, t.y * TILE_SIZE, d, style, !room.cleared, content.doorAnim[d] ?? 0, f);
    } else {
      drawChibiThemedDoorV3(ctx, t.x * TILE_SIZE, t.y * TILE_SIZE, d, style, !room.cleared, content.doorAnim[d] ?? 0, f, engine.map.floorIndex);
    }"""
if old_door not in render: raise SystemExit('door branch missing')
render = render.replace(old_door, new_door, 1)

old_ob = """        if (engine.map.floorIndex === 0) drawChibiLobbyObstacleV3(ctx, x * TILE_SIZE, y * TILE_SIZE, t - OBSTACLE_BASE, f);
        else drawObstacle(ctx, x * TILE_SIZE, y * TILE_SIZE, t - OBSTACLE_BASE, f);"""
new_ob = """        if (engine.map.floorIndex === 0) drawChibiLobbyObstacleV3(ctx, x * TILE_SIZE, y * TILE_SIZE, t - OBSTACLE_BASE, f);
        else drawChibiThemedObstacleV3(ctx, x * TILE_SIZE, y * TILE_SIZE, t - OBSTACLE_BASE, f, engine.map.floorIndex);"""
if old_ob not in render: raise SystemExit('obstacle branch missing')
render = render.replace(old_ob, new_ob, 1)
render = render.replace('  drawProjectile, drawCoin, drawChest, drawDoor,', '  drawProjectile, drawCoin, drawChest,', 1)
render = render.replace('  drawPedestal, drawCandle, drawObstacle,', '  drawPedestal, drawCandle,', 1)
render_path.write_text(render)

index = index_path.read_text()
if '0.7.22-bosses-chibi-pass' not in index: raise SystemExit('v0.7.22 marker missing')
index = index.replace('0.7.22-bosses-chibi-pass', '0.7.23-world-props-chibi')
index_path.write_text(index)
print('Applied v0.7.23 themed world props pass')
