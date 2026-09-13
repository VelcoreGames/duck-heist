from pathlib import Path

root = Path('.')
render_path = root / 'src/game/render.ts'
birds_path = root / 'src/game/graphics/chibiBirdEnemiesV3.ts'
index_path = root / 'index.html'

birds_code = r'''type Ctx = CanvasRenderingContext2D;

export type ChibiBirdEnemyKind = 'pigeon' | 'goose';

export interface ChibiBirdEnemyV3Input {
  ctx: Ctx;
  x: number;
  y: number;
  size: number;
  frame: number;
  dirX: number;
  dirY: number;
  moving: boolean;
  hurt: boolean;
  elite?: boolean;
  kind: ChibiBirdEnemyKind;
}

const OUTLINE = '#342b2e';
const PIGEON = '#8f9a9a';
const PIGEON_LIGHT = '#c3ccca';
const PIGEON_DARK = '#657173';
const GOOSE = '#eee5cf';
const GOOSE_LIGHT = '#fff7e5';
const GOOSE_DARK = '#c6b899';
const BEAK = '#e7943d';
const BEAK_DARK = '#bb672b';
const VEST = '#29484b';
const VEST_LIGHT = '#456d6c';
const BRASS = '#ccaa5b';

function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, fill: string, stroke = OUTLINE, lw = 1.4) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill();
  if (stroke && lw) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}

function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string, stroke = OUTLINE, lw = 1.25) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fillStyle = fill; ctx.fill();
  if (stroke && lw) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}

function facing(dirX: number, dirY: number) {
  if (Math.abs(dirY) > Math.abs(dirX)) return dirY < 0 ? 'up' : 'down';
  return dirX < 0 ? 'left' : 'right';
}

export function drawChibiBirdEnemyV3(input: ChibiBirdEnemyV3Input) {
  const { ctx, x, y, size, frame, dirX, dirY, moving, hurt, elite = false, kind } = input;
  const isGoose = kind === 'goose';
  const scale = Math.max(.72, Math.min(1.0, size / (isGoose ? 19 : 18))) * (elite ? 1.035 : 1);
  const cx = x + size / 2;
  const feetY = y + size;
  const mode = facing(dirX, dirY);
  const cycle = frame % 24;
  const phase = cycle / 24 * Math.PI * 2;
  const step = moving ? Math.sin(phase) : 0;
  const lift = moving ? Math.abs(step) * 1.25 : 0;
  const breathe = moving ? 0 : Math.sin(frame * .055) * .28;
  const bob = -lift - breathe;
  const tilt = moving ? step * .025 : Math.sin(frame * .027) * .006;
  const body = isGoose ? GOOSE : PIGEON;
  const light = isGoose ? GOOSE_LIGHT : PIGEON_LIGHT;
  const dark = isGoose ? GOOSE_DARK : PIGEON_DARK;
  const headY = isGoose ? -24 : -20;

  ctx.save();
  ctx.fillStyle = '#241c20'; ctx.globalAlpha = .09;
  ctx.beginPath(); ctx.ellipse(cx, feetY + 1, (isGoose ? 11.5 : 10) * scale, 2.7 * scale, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = hurt && Math.floor(frame / 2) % 2 === 0 ? .62 : 1;
  ctx.translate(cx, feetY + bob);
  ctx.rotate(tilt);
  ctx.scale(scale, scale);

  const spread = isGoose ? 5.7 : 5.0;
  ellipse(ctx, -spread - step * 1.3, -1 - Math.max(0, step) * 1.2, 3.8, 1.65, BEAK, OUTLINE, 1.1);
  ellipse(ctx, spread + step * 1.3, -1 - Math.max(0, -step) * 1.2, 3.8, 1.65, BEAK, OUTLINE, 1.1);

  ellipse(ctx, 0, -10, isGoose ? 10.5 : 10, isGoose ? 11.8 : 10.4, body, OUTLINE, 1.65);
  ctx.globalAlpha = .52; ellipse(ctx, -3.6, -14, 5.1, 3.7, light, '', 0); ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.moveTo(-9.2, -13.4); ctx.quadraticCurveTo(0, -9.2, 9.2, -13.4);
  ctx.lineTo(8, -4.2); ctx.quadraticCurveTo(0, -.8, -8, -4.2); ctx.closePath();
  ctx.fillStyle = VEST; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.4; ctx.stroke();
  ctx.globalAlpha = .5; ctx.strokeStyle = VEST_LIGHT; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-5.8, -10.7); ctx.lineTo(5.8, -10.7); ctx.stroke(); ctx.globalAlpha = 1;
  rr(ctx, -2.2, -10, 4.4, 4.2, 1.1, BRASS, '', 0);

  if (isGoose) {
    rr(ctx, -4.7, -27.5, 9.4, 15.5, 4.2, body, OUTLINE, 1.5);
    ctx.globalAlpha = .48; rr(ctx, -2.6, -26.2, 3.1, 9.3, 1.5, light, '', 0); ctx.globalAlpha = 1;
  }

  ellipse(ctx, 0, headY, isGoose ? 9.2 : 10.7, isGoose ? 8.8 : 9.7, body, OUTLINE, 1.65);
  ctx.globalAlpha = .55; ellipse(ctx, -3.5, headY - 3.3, 4.3, 2.7, light, '', 0); ctx.globalAlpha = 1;

  if (mode === 'up') {
    ctx.globalAlpha = .38;
    ctx.strokeStyle = dark; ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.moveTo(-4, headY + 2); ctx.lineTo(0, headY + 5); ctx.lineTo(4, headY + 2); ctx.stroke();
    ctx.globalAlpha = 1;
  } else if (mode === 'down') {
    for (const ex of [-3.5, 3.5]) {
      ellipse(ctx, ex, headY - 1.2, 1.65, 2.3, '#211d22', '', 0);
      ellipse(ctx, ex - .4, headY - 2, .45, .55, '#fff6de', '', 0);
    }
    ctx.beginPath(); ctx.moveTo(-5, headY + 3); ctx.quadraticCurveTo(0, headY + 1.7, 5, headY + 3); ctx.quadraticCurveTo(2.8, headY + 7, 0, headY + 7.2); ctx.quadraticCurveTo(-2.8, headY + 7, -5, headY + 3); ctx.closePath();
    ctx.fillStyle = BEAK; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.2; ctx.stroke();
  } else {
    const s = mode === 'right' ? 1 : -1;
    ellipse(ctx, s * 4.2, headY - 1.5, 1.7, 2.45, '#211d22', '', 0);
    ellipse(ctx, s * 3.8, headY - 2.3, .45, .55, '#fff6de', '', 0);
    ctx.beginPath();
    ctx.moveTo(s * 6.7, headY + 2.5); ctx.lineTo(s * 12.5, headY + 4.4); ctx.lineTo(s * 6.7, headY + 6.1); ctx.closePath();
    ctx.fillStyle = BEAK; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.2; ctx.stroke();
  }

  if (!isGoose) {
    // Pigeon neck iridescence, kept subtle and material-like.
    ctx.globalAlpha = .28;
    ctx.fillStyle = '#708f83'; ctx.beginPath(); ctx.ellipse(-3, -15.8, 3.2, 2.2, -.35, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#816e8e'; ctx.beginPath(); ctx.ellipse(3, -15.2, 2.7, 1.8, .35, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }

  if (elite) {
    rr(ctx, -4.3, headY - (isGoose ? 11 : 12), 8.6, 2.2, 1, BRASS, OUTLINE, .9);
  }
  ctx.restore();
}
'''
birds_path.write_text(birds_code)

render = render_path.read_text()
render = render.replace("drawDuck, drawHeart, drawSecurityPigeon, drawGuardGoose, drawToasterTurret,", "drawDuck, drawHeart, drawSecurityPigeon, drawToasterTurret,", 1)
import_marker = "import { drawChibiPoliceDroneV3 } from './graphics/policeDroneV3';"
if import_marker not in render: raise SystemExit('drone import missing')
render = render.replace(import_marker, import_marker + "\nimport { drawChibiBirdEnemyV3 } from './graphics/chibiBirdEnemiesV3';", 1)

# Upgrade death echoes too, so a defeated goose/pigeon cannot flash back to legacy art.
old_echo = """        case 'guard_goose':drawGuardGoose(ctx,-10,-10,f,false);break;"""
new_echo = """        case 'guard_goose':
          drawChibiBirdEnemyV3({ctx,x:-d.enemy.size/2,y:-d.enemy.size/2,size:d.enemy.size,frame:f,dirX:1,dirY:0,moving:false,hurt:false,elite:d.enemy.elite,kind:'goose'});
          break;
        case 'security_pigeon':
          drawChibiBirdEnemyV3({ctx,x:-d.enemy.size/2,y:-d.enemy.size/2,size:d.enemy.size,frame:f,dirX:1,dirY:0,moving:false,hurt:false,elite:d.enemy.elite,kind:'pigeon'});
          break;"""
if old_echo not in render: raise SystemExit('guard goose death echo marker missing')
render = render.replace(old_echo, new_echo, 1)

# Default death echo can remain legacy pigeon as fallback for unknown enemy ids.
old_live = """      case 'security_pigeon': drawSecurityPigeon(ctx, e.x, e.y, f, hurt); break;
      case 'guard_goose': drawGuardGoose(ctx, e.x, e.y, f, hurt); break;"""
new_live = """      case 'security_pigeon':
        drawChibiBirdEnemyV3({
          ctx,x:e.x,y:e.y,size:e.size,frame:f+e.id*5,
          dirX:Math.abs(toPlayerX)>=Math.abs(toPlayerY)?dirX:0,
          dirY:Math.abs(toPlayerY)>Math.abs(toPlayerX)?dirY:0,
          moving:Math.abs(e.vx)+Math.abs(e.vy)>.08,hurt,elite:e.elite,kind:'pigeon',
        });
        break;
      case 'guard_goose':
        drawChibiBirdEnemyV3({
          ctx,x:e.x,y:e.y,size:e.size,frame:f+e.id*7,
          dirX:Math.abs(toPlayerX)>=Math.abs(toPlayerY)?dirX:0,
          dirY:Math.abs(toPlayerY)>Math.abs(toPlayerX)?dirY:0,
          moving:Math.abs(e.vx)+Math.abs(e.vy)>.08,hurt,elite:e.elite,kind:'goose',
        });
        break;"""
if old_live not in render: raise SystemExit('live bird enemy markers missing')
render = render.replace(old_live, new_live, 1)

# Chibi renderers own their soft shadow and hurt response. Never overlay legacy rectangles on them.
marker = "function drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy, f: number, engine: GameEngine) {"
helper = """function usesChibiEnemyRenderer(type: string) {
  return type === 'policia_pato' || type === 'policia_rapido' || type === 'policia_escopeta' ||
    type === 'policia_antidisturbios' || type === 'dron_policial' ||
    type === 'security_pigeon' || type === 'guard_goose';
}

function drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy, f: number, engine: GameEngine) {"""
if marker not in render: raise SystemExit('drawEnemy marker missing')
render = render.replace(marker, helper, 1)
render = render.replace("if (e.type !== 'policia_pato') {", "if (!usesChibiEnemyRenderer(e.type)) {", 1)
render = render.replace("if (hurt && e.type !== 'policia_pato') {", "if (hurt && !usesChibiEnemyRenderer(e.type)) {", 1)
render_path.write_text(render)

index = index_path.read_text()
if '0.7.17-drone-death-echoes' not in index:
    raise SystemExit('Expected v0.7.17 marker not found')
index = index.replace('0.7.17-drone-death-echoes', '0.7.18-birds-combat-cleanup')
index_path.write_text(index)

print('Applied v0.7.18 birds and chibi combat cleanup')
