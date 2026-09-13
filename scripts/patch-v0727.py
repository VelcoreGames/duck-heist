from pathlib import Path

root = Path('.')
module_path = root / 'src/game/graphics/chibiAtmosphereV3.ts'
render_path = root / 'src/game/render.ts'
index_path = root / 'index.html'

module = r'''import { chibiThemeForFloor } from './themes';

type Ctx = CanvasRenderingContext2D;
const W = 480, H = 352;

function rgba(hex: string, alpha: number) {
  const v = hex.replace('#', '');
  const full = v.length === 3 ? v.split('').map(c => c + c).join('') : v;
  const n = Number.parseInt(full, 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}
function pool(ctx: Ctx, x: number, y: number, radius: number, color: string, alpha: number) {
  const g = ctx.createRadialGradient(x, y, 3, x, y + radius * .35, radius);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(.42, rgba(color, alpha * .36));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g; ctx.fillRect(x - radius, y - 10, radius * 2, radius * 1.55);
}
function mote(ctx: Ctx, x: number, y: number, r: number, color: string, alpha: number) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}

export function drawChibiFloorAtmosphereV3(ctx: Ctx, frame: number, floorIndex: number) {
  const t = chibiThemeForFloor(floorIndex);
  const positions = t.id === 'security' ? [80, 240, 400]
    : t.id === 'archives' ? [115, 365]
    : t.id === 'executive' ? [95, 240, 385]
    : t.id === 'vault' ? [150, 330]
    : [120, 240, 360];
  for (let i = 0; i < positions.length; i++) {
    const x = positions[i];
    const pulse = .92 + Math.sin(frame * .025 + i * 1.7) * .08;
    pool(ctx, x, 39, t.lightRadius * pulse, t.lightColor, t.id === 'gold_reserve' ? .18 : .115);
  }

  // Viñeta cromática extremadamente suave por piso.
  const g = ctx.createRadialGradient(W / 2, H / 2, 70, W / 2, H / 2, 275);
  g.addColorStop(0, rgba(t.lightColor, .018));
  g.addColorStop(1, rgba(t.wallShadow, .16));
  ctx.fillStyle = g; ctx.fillRect(32, 32, W - 64, H - 64);

  if (t.id === 'security') {
    // Barrido de monitores: visual, tenue y claramente no jugable.
    const sx = 48 + ((frame * .55) % 384);
    ctx.save(); ctx.globalAlpha = .035; ctx.fillStyle = t.lightColor; ctx.fillRect(sx, 48, 2, 245); ctx.restore();
    for (let i = 0; i < 6; i++) {
      const p = (frame * .006 + i * .19) % 1;
      mote(ctx, 72 + ((i * 71) % 335), 285 - p * 190, .8, t.lightColor, (1 - p) * .16);
    }
  } else if (t.id === 'archives') {
    for (let i = 0; i < 13; i++) {
      const p = (frame * .0035 + i * .083) % 1;
      const x = 55 + ((i * 89) % 370) + Math.sin(frame * .012 + i) * 8;
      mote(ctx, x, 298 - p * 230, i % 4 === 0 ? 1.2 : .7, '#ead6b5', (1 - p) * .14);
    }
  } else if (t.id === 'executive') {
    ctx.save(); ctx.globalAlpha = .045; ctx.fillStyle = t.accent;
    ctx.beginPath(); ctx.roundRect(84, 86, 312, 184, 18); ctx.fill(); ctx.restore();
    for (let i = 0; i < 5; i++) mote(ctx, 110 + i * 65, 71 + Math.sin(frame * .025 + i) * 2, 1, t.gold, .16);
  } else if (t.id === 'vault') {
    for (let i = 0; i < 4; i++) {
      const y = 84 + i * 58;
      ctx.save(); ctx.globalAlpha = .028 + Math.sin(frame * .032 + i) * .007; ctx.fillStyle = t.gold; ctx.fillRect(47, y, 386, 1); ctx.restore();
    }
  } else if (t.id === 'gold_reserve') {
    for (let i = 0; i < 18; i++) {
      const p = (frame * .0055 + i * .071) % 1;
      const x = 48 + ((i * 67) % 380) + Math.sin(frame * .015 + i * 1.8) * 6;
      const a = Math.sin(p * Math.PI) * .24;
      mote(ctx, x, 65 + p * 220, i % 5 === 0 ? 1.45 : .75, i % 3 === 0 ? '#fff0a8' : t.gold, a);
    }
  }
}
'''
module_path.write_text(module)

render = render_path.read_text()
anchor = "import { drawChibiFloorTileV3 } from './graphics/chibiFloorArtV3';"
if anchor not in render: raise SystemExit('floor art import missing')
render = render.replace(anchor, anchor + "\nimport { drawChibiFloorAtmosphereV3 } from './graphics/chibiAtmosphereV3';", 1)
old = "  drawRoomAtmosphere(ctx, special ? 'vault' : th.deco, f, special);"
new = """  if (!special && floorIndex > 0) drawChibiFloorAtmosphereV3(ctx, f, floorIndex);
  else drawRoomAtmosphere(ctx, special ? 'vault' : th.deco, f, special);"""
if old not in render: raise SystemExit('atmosphere call missing')
render = render.replace(old, new, 1)
render_path.write_text(render)

index = index_path.read_text()
if '0.7.26-themed-floors-chibi' not in index: raise SystemExit('v0.7.26 marker missing')
index = index.replace('0.7.26-themed-floors-chibi', '0.7.27-themed-atmosphere-chibi')
index_path.write_text(index)
print('Applied v0.7.27 themed atmosphere chibi pass')
