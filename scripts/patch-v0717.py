from pathlib import Path

root = Path('.')
render_path = root / 'src/game/render.ts'
drone_path = root / 'src/game/graphics/policeDroneV3.ts'
index_path = root / 'index.html'

drone_code = r'''type Ctx = CanvasRenderingContext2D;

export interface PoliceDroneV3Input {
  ctx: Ctx;
  x: number;
  y: number;
  size: number;
  frame: number;
  hurt: boolean;
  elite?: boolean;
  telegraph?: number;
}

const OUTLINE = '#322a2e';
const NAVY = '#294b63';
const NAVY_LIGHT = '#52768b';
const NAVY_DARK = '#182f40';
const METAL = '#718386';
const BRASS = '#cca858';
const BRASS_LIGHT = '#f0d886';
const RED = '#b94d51';

function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string, stroke = OUTLINE, lw = 1.25) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fillStyle = fill; ctx.fill();
  if (stroke && lw) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}

function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, fill: string, stroke = OUTLINE, lw = 1.25) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill();
  if (stroke && lw) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}

export function drawChibiPoliceDroneV3(input: PoliceDroneV3Input) {
  const { ctx, x, y, size, frame, hurt, elite = false, telegraph = 0 } = input;
  const scale = Math.max(.72, Math.min(1.05, size / 18));
  const cx = x + size / 2;
  const baseY = y + size * .72;
  const bob = Math.sin(frame * .11) * 1.15;
  const tilt = Math.sin(frame * .073) * .035;
  const rotor = frame * .34;

  ctx.save();
  ctx.fillStyle = '#241c20';
  ctx.globalAlpha = .095;
  ctx.beginPath(); ctx.ellipse(cx, y + size + 2, 10.8 * scale, 2.8 * scale, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = hurt && Math.floor(frame / 2) % 2 === 0 ? .56 : 1;
  ctx.translate(cx, baseY + bob);
  ctx.rotate(tilt);
  ctx.scale(scale, scale);

  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-9, -4); ctx.lineTo(-16, -8); ctx.moveTo(9, -4); ctx.lineTo(16, -8); ctx.stroke();
  ctx.strokeStyle = METAL; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(-9, -4); ctx.lineTo(-16, -8); ctx.moveTo(9, -4); ctx.lineTo(16, -8); ctx.stroke();

  for (const side of [-1, 1]) {
    ctx.save(); ctx.translate(side * 16, -8); ctx.rotate(rotor * side);
    ctx.strokeStyle = 'rgba(47,42,46,.75)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(6, 0); ctx.stroke();
    ctx.strokeStyle = 'rgba(190,203,198,.45)'; ctx.lineWidth = .8;
    ctx.beginPath(); ctx.moveTo(-5, -.8); ctx.lineTo(5, -.8); ctx.stroke();
    ctx.restore();
    ellipse(ctx, side * 16, -8, 2.6, 2.3, BRASS, OUTLINE, 1.1);
  }

  ellipse(ctx, 0, 0, 11.7, 8.7, NAVY, OUTLINE, 1.65);
  ctx.globalAlpha = .55; ellipse(ctx, -3.8, -3.2, 5.2, 2.8, NAVY_LIGHT, '', 0); ctx.globalAlpha = 1;
  rr(ctx, -8.2, 1.7, 16.4, 5.8, 2.4, NAVY_DARK, OUTLINE, 1.2);

  ellipse(ctx, 0, 2.2, 4.25, 4.0, METAL, OUTLINE, 1.15);
  ellipse(ctx, 0, 2.1, 2.25, 2.15, elite ? BRASS : RED, '', 0);
  ctx.globalAlpha = .78 + Math.sin(frame * .14) * .12;
  ellipse(ctx, -.65, 1.5, .65, .65, '#fff2d0', '', 0);
  ctx.globalAlpha = 1;

  rr(ctx, -2.8, -7.2, 5.6, 4.6, 1.6, BRASS, OUTLINE, 1.0);
  ctx.globalAlpha = .65; ctx.fillStyle = BRASS_LIGHT; ctx.fillRect(-1.8, -6.3, 2.9, .8); ctx.globalAlpha = 1;

  rr(ctx, -10.5, 3.8, 3.7, 4.0, 1.2, METAL, OUTLINE, 1.0);
  rr(ctx, 6.8, 3.8, 3.7, 4.0, 1.2, METAL, OUTLINE, 1.0);

  if (telegraph > .05) {
    ctx.save();
    ctx.globalAlpha = .18 + telegraph * .36;
    ctx.strokeStyle = '#eacb77'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 2, 7 + telegraph * 3, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}
'''
drone_path.write_text(drone_code)

render = render_path.read_text()
render = render.replace(
"""  drawBankerChicken, drawPoliciaPato, drawPoliciaAntidisturbios, drawPoliciaEscopeta,
  drawPoliciaRapido, drawDronPolicial, drawPedestal, drawCandle, drawObstacle,""",
"""  drawBankerChicken, drawPedestal, drawCandle, drawObstacle,""", 1)

import_marker = "import { drawChibiPoliceVariantV3 } from './graphics/policeVariantsV3';"
if import_marker not in render: raise SystemExit('police variants import missing')
render = render.replace(import_marker, import_marker + "\nimport { drawChibiPoliceDroneV3 } from './graphics/policeDroneV3';", 1)

old_echo = """        case 'dron_policial':drawDronPolicial(ctx,-8,-8,f,false);break;
        case 'policia_rapido':drawPoliciaRapido(ctx,-8,-8,f,false,1);break;
        case 'policia_escopeta':drawPoliciaEscopeta(ctx,-9,-9,f,false,1,0);break;
        case 'policia_antidisturbios':drawPoliciaAntidisturbios(ctx,-11,-11,f,false,{x:0,y:1},false,true);break;
        case 'policia_pato':drawPoliciaPato(ctx,-8,-8,f,false,1);break;"""
new_echo = """        case 'dron_policial':
          drawChibiPoliceDroneV3({ctx,x:-d.enemy.size/2,y:-d.enemy.size/2,size:d.enemy.size,frame:f,hurt:false,elite:d.enemy.elite});
          break;
        case 'policia_rapido':
          drawChibiPoliceVariantV3({ctx,x:-d.enemy.size/2,y:-d.enemy.size/2,size:d.enemy.size,frame:f,dirX:1,dirY:0,moving:false,hurt:false,elite:d.enemy.elite,variant:'rapid'});
          break;
        case 'policia_escopeta':
          drawChibiPoliceVariantV3({ctx,x:-d.enemy.size/2,y:-d.enemy.size/2,size:d.enemy.size,frame:f,dirX:1,dirY:0,moving:false,hurt:false,elite:d.enemy.elite,variant:'shotgun'});
          break;
        case 'policia_antidisturbios':
          drawChibiPoliceVariantV3({ctx,x:-d.enemy.size/2,y:-d.enemy.size/2,size:d.enemy.size,frame:f,dirX:0,dirY:1,moving:false,hurt:false,elite:d.enemy.elite,variant:'riot',shieldAngle:Math.PI/2,recovering:true});
          break;
        case 'policia_pato':
          drawChibiPoliceDuckV3({ctx,x:-d.enemy.size/2,y:-d.enemy.size/2,size:d.enemy.size,frame:f,dirX:1,dirY:0,moving:false,hurt:false,elite:d.enemy.elite});
          break;"""
if old_echo not in render: raise SystemExit('legacy police death echoes marker missing')
render = render.replace(old_echo, new_echo, 1)

old_live = "case 'dron_policial': drawDronPolicial(ctx, e.x, e.y, f, hurt); break;"
new_live = """case 'dron_policial':
        drawChibiPoliceDroneV3({
          ctx, x:e.x, y:e.y, size:e.size, frame:f + e.id * 5,
          hurt, elite:e.elite, telegraph:e.telegraph,
        });
        break;"""
if old_live not in render: raise SystemExit('live drone marker missing')
render = render.replace(old_live, new_live, 1)
render_path.write_text(render)

index = index_path.read_text()
if '0.7.16-police-variants-chibi' not in index:
    raise SystemExit('Expected v0.7.16 marker not found')
index = index.replace('0.7.16-police-variants-chibi', '0.7.17-drone-death-echoes')
index_path.write_text(index)

print('Applied v0.7.17 drone and death echoes pass')
