from pathlib import Path


def replace_once(path: Path, old: str, new: str) -> None:
    text = path.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one match, found {count}: {old[:180]!r}')
    path.write_text(text.replace(old, new, 1))


PLAYER = Path('src/game/graphics/playerChibiV3.ts')
RENDER = Path('src/game/render.ts')
INDEX = Path('index.html')

# Modern V3 skins keep the cosmetic identity that the legacy pixel preview had.
replace_once(
    PLAYER,
    "import { getSkin, type DuckPalette } from '../data';",
    "import { getSkin, type DuckPalette, type SkinOverlay } from '../data';",
)
replace_once(
    PLAYER,
    """const FRAME = 80;
const PIVOT_X = 40;
const PIVOT_Y = 69;
""",
    """const FRAME = 80;
const PIVOT_X = 40;
const PIVOT_Y = 69;
// V3 is authored on an 80 px working canvas, but gameplay V16 is visually
// smaller. Normalize the final V3 output around the feet so cosmetic skins do
// not become oversized when the renderer falls back from V16 to V3.
const DRAW_SCALE = .66;
""",
)
replace_once(
    PLAYER,
    """  interacting?: boolean;
  celebrating?: boolean;
""" if "  interacting?: boolean;\n  celebrating?: boolean;\n" in PLAYER.read_text() else """  dead?: boolean;
  skinId?: string;
""",
    """  dead?: boolean;
  interacting?: boolean;
  celebrating?: boolean;
  skinId?: string;
""" if "  interacting?: boolean;\n  celebrating?: boolean;\n" not in PLAYER.read_text() else """  interacting?: boolean;
  celebrating?: boolean;
""",
)

replace_once(
    PLAYER,
    """interface Palette {
  body: string;
  light: string;
  shade: string;
  beak: string;
  beakLight: string;
  beakDark: string;
}
""",
    """interface Palette {
  body: string;
  light: string;
  shade: string;
  beak: string;
  beakLight: string;
  beakDark: string;
  mask: string;
  pack: string;
  strap: string;
}
""",
)

replace_once(
    PLAYER,
    """function paletteFor(skinId?: string): Palette {
  const skin = skinId ? getSkin(skinId) : undefined;
  const p = skin?.palette as DuckPalette | undefined;
  return {
    body: p?.body ?? FEATHER,
    light: FEATHER_LIGHT,
    shade: p?.shade ?? FEATHER_SHADE,
    beak: p?.beak ?? BEAK,
    beakLight: BEAK_LIGHT,
    beakDark: p?.beakDark ?? BEAK_DARK,
  };
}
""",
    """function tint(hex: string, amount: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = Number.parseInt(m[1], 16);
  const mix = (v: number) => Math.max(0, Math.min(255, Math.round(v + (255 - v) * amount)));
  const r = mix((n >> 16) & 255), g = mix((n >> 8) & 255), b = mix(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

function paletteFor(skinId?: string): Palette {
  const skin = skinId ? getSkin(skinId) : undefined;
  const p = skin?.palette as DuckPalette | undefined;
  const body = p?.body ?? FEATHER;
  const beak = p?.beak ?? BEAK;
  return {
    body,
    light: p ? tint(body, .28) : FEATHER_LIGHT,
    shade: p?.shade ?? FEATHER_SHADE,
    beak,
    beakLight: p ? tint(beak, .30) : BEAK_LIGHT,
    beakDark: p?.beakDark ?? BEAK_DARK,
    mask: p?.mask ?? '#15151f',
    pack: p?.pack ?? '#3b2f2a',
    strap: p?.strap ?? '#2a211d',
  };
}
""",
)

replace_once(
    PLAYER,
    """  if (input.shooting) return 'shoot';
  if (input.moving) return 'walk';
""",
    """  if (input.shooting) return 'shoot';
  if (input.celebrating) return 'celebrate';
  if (input.interacting) return 'interact';
  if (input.moving) return 'walk';
""",
)
replace_once(
    PLAYER,
    """function priority(state: CharacterState): number {
  return state === 'down' ? 100 : state === 'hurt' ? 90 : state === 'dash' ? 80 : state === 'shoot' ? 70 : state === 'walk' ? 20 : 10;
}
""",
    """function priority(state: CharacterState): number {
  return state === 'down' ? 100
    : state === 'hurt' ? 90
    : state === 'dash' ? 80
    : state === 'shoot' ? 70
    : state === 'celebrate' ? 60
    : state === 'interact' ? 35
    : state === 'walk' ? 20 : 10;
}
""",
)

# Restore the burglar mask/backpack language in the V3 fallback. Baker keeps an
# effectively invisible mask because its palette intentionally matches the body.
replace_once(
    PLAYER,
    """function drawHead(ctx: Ctx, pal: Palette, dir: DuckDir, m: Motion): void {
  const y = 27 + m.headBob + m.down * 4;
  const rx = dir === 'left' || dir === 'right' ? 16.5 : 18.2;
  ctx.save();
  ctx.translate(40, y);
  ctx.rotate(m.tilt * .75);
  ctx.scale(m.squashX, m.squashY);
  ctx.translate(-40, -y);
  ellipse(ctx, 40, y, rx, 16.5, pal.body, OUTLINE, 2.5);
  ctx.globalAlpha = .7; ellipse(ctx, 34, y - 6.7, 8.5, 5.2, pal.light, '', 0); ctx.globalAlpha = 1;
  ctx.globalAlpha = .34; ellipse(ctx, 44, y + 8.4, 11, 4.2, pal.shade, '', 0); ctx.globalAlpha = 1;
  drawFace(ctx, pal, dir, y, m.blink);
  ctx.restore();
}

function drawWeapon""",
    """function overlayFor(skinId?: string): SkinOverlay {
  return skinId ? (getSkin(skinId)?.overlay ?? 'none') : 'none';
}

function bodyPose(ctx: Ctx, m: Motion, draw: (y: number) => void): void {
  const y = 50 + m.bob;
  ctx.save();
  ctx.translate(40, y);
  ctx.rotate(m.tilt);
  ctx.scale(m.squashX, m.squashY);
  ctx.translate(-40, -y);
  draw(y);
  ctx.restore();
}

function headPose(ctx: Ctx, m: Motion, draw: (y: number) => void): void {
  const y = 27 + m.headBob + m.down * 4;
  ctx.save();
  ctx.translate(40, y);
  ctx.rotate(m.tilt * .75);
  ctx.scale(m.squashX, m.squashY);
  ctx.translate(-40, -y);
  draw(y);
  ctx.restore();
}

function drawMask(ctx: Ctx, pal: Palette, dir: DuckDir, y: number): void {
  if (pal.mask.toLowerCase() === pal.body.toLowerCase()) return;
  if (dir === 'up') {
    rounded(ctx, 23, y - 6.5, 34, 8.5, 4, pal.mask, '', 0);
    return;
  }
  if (dir === 'down') {
    rounded(ctx, 21.5, y - 6.2, 37, 10.5, 5, pal.mask, '', 0);
    return;
  }
  const right = dir === 'right';
  rounded(ctx, right ? 37 : 23, y - 6, 20, 10, 5, pal.mask, '', 0);
}

function drawPackBack(ctx: Ctx, pal: Palette, dir: DuckDir, m: Motion, state: CharacterState): void {
  if (state === 'down' || dir === 'down') return;
  bodyPose(ctx, m, y => {
    if (dir === 'up') {
      rounded(ctx, 28, y - 10, 24, 20, 7, pal.pack, OUTLINE, 2);
      rounded(ctx, 31, y - 8, 18, 6, 4, tint(pal.pack, .15), '', 0);
    } else {
      const x = dir === 'right' ? 20 : 48;
      rounded(ctx, x, y - 8, 13, 17, 5, pal.pack, OUTLINE, 2);
      rounded(ctx, x + 2, y - 6, 9, 5, 3, tint(pal.pack, .13), '', 0);
    }
  });
}

function drawStrapsFront(ctx: Ctx, pal: Palette, dir: DuckDir, m: Motion, state: CharacterState): void {
  if (state === 'down' || dir === 'up') return;
  bodyPose(ctx, m, y => {
    if (dir === 'down') {
      line(ctx, 33, y - 9, 34.5, y + 7, pal.strap, 2.1);
      line(ctx, 47, y - 9, 45.5, y + 7, pal.strap, 2.1);
    } else {
      const x = dir === 'right' ? 33 : 47;
      line(ctx, x, y - 9, x, y + 6, pal.strap, 2.2);
    }
  });
}

function drawSkinBackOverlay(ctx: Ctx, skinId: string | undefined, m: Motion, state: CharacterState): void {
  if (state === 'down' || overlayFor(skinId) !== 'king') return;
  bodyPose(ctx, m, y => {
    ctx.beginPath();
    ctx.moveTo(29, y - 9);
    ctx.quadraticCurveTo(20, y + 1, 18, y + 16);
    ctx.quadraticCurveTo(40, y + 22, 62, y + 16);
    ctx.quadraticCurveTo(60, y + 1, 51, y - 9);
    ctx.closePath();
    ctx.fillStyle = '#6f2b86';
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.2;
    ctx.stroke();
  });
}

function drawSkinBodyOverlay(ctx: Ctx, skinId: string | undefined, dir: DuckDir, m: Motion, state: CharacterState): void {
  if (state === 'down') return;
  const overlay = overlayFor(skinId);
  if (overlay === 'none') return;
  bodyPose(ctx, m, y => {
    switch (overlay) {
      case 'fedora':
        ctx.strokeStyle = '#e3bd58'; ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.arc(40, y - 2, 9.5, .15, Math.PI - .15); ctx.stroke();
        ellipse(ctx, 40, y + 5, 2.4, 2.8, '#f4d03f', OUTLINE, 1.1);
        break;
      case 'prison':
        line(ctx, 29, y - 6, 51, y - 6, '#fff8e8', 3);
        line(ctx, 27.5, y, 52.5, y, '#fff8e8', 3);
        line(ctx, 30, y + 6, 50, y + 6, '#fff8e8', 3);
        break;
      case 'chef':
        line(ctx, 31, y - 9, 35, y - 5, '#e9edf1', 2.4);
        line(ctx, 49, y - 9, 45, y - 5, '#e9edf1', 2.4);
        rounded(ctx, 31, y - 6, 18, 20, 6, '#f7f8f5', OUTLINE, 1.8);
        rounded(ctx, 34, y - 8, 12, 7, 3, '#ffffff', '', 0);
        break;
      case 'executive': {
        ctx.fillStyle = '#fffdf4';
        ctx.beginPath(); ctx.moveTo(31, y - 8); ctx.lineTo(40, y - 1); ctx.lineTo(36, y + 2); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(49, y - 8); ctx.lineTo(40, y - 1); ctx.lineTo(44, y + 2); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#b9343b'; ctx.beginPath(); ctx.moveTo(38, y - 1); ctx.lineTo(42, y - 1); ctx.lineTo(43.5, y + 8); ctx.lineTo(40, y + 11); ctx.lineTo(36.5, y + 8); ctx.closePath(); ctx.fill();
        const bx = dir === 'left' ? 18 : 52;
        rounded(ctx, bx, y - 1, 14, 12, 3, '#5c3a24', OUTLINE, 1.7);
        rounded(ctx, bx + 4, y - 4, 6, 5, 2, '#6f472d', OUTLINE, 1.4);
        ctx.fillStyle = '#d7ae55'; ctx.fillRect(bx + 6, y + 3, 2, 2);
        break;
      }
      case 'ninja':
        ctx.strokeStyle = '#c93d42'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(28, y - 5); ctx.lineTo(52, y + 7); ctx.stroke();
        break;
      case 'undercover':
        rounded(ctx, dir === 'left' ? 44 : 31, y - 5, 7, 8, 2, '#d7ae55', OUTLINE, 1.3);
        ctx.fillStyle = '#284b8e'; ctx.fillRect(dir === 'left' ? 46 : 33, y - 3, 3, 4);
        break;
      case 'pirate':
        ctx.strokeStyle = '#9e2637'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(29, y - 5); ctx.lineTo(51, y + 4); ctx.stroke();
        rounded(ctx, 32, y + 5, 16, 4, 2, '#3a241b', OUTLINE, 1.2);
        break;
      case 'gold':
        line(ctx, 24, y - 8, 28, y - 8, '#fff4b0', 1.6); line(ctx, 26, y - 10, 26, y - 6, '#fff4b0', 1.6);
        line(ctx, 53, y + 2, 57, y + 2, '#fff4b0', 1.6); line(ctx, 55, y, 55, y + 4, '#fff4b0', 1.6);
        break;
      case 'king':
        rounded(ctx, 28, y - 8, 24, 7, 4, '#fff7e5', OUTLINE, 1.6);
        ellipse(ctx, 33, y - 4.5, 1.4, 1.4, '#2a242c', '', 0);
        ellipse(ctx, 40, y - 4.5, 1.4, 1.4, '#2a242c', '', 0);
        ellipse(ctx, 47, y - 4.5, 1.4, 1.4, '#2a242c', '', 0);
        ellipse(ctx, 40, y + 2.5, 3, 3.5, '#c43e48', '#e3bd58', 1.3);
        break;
    }
  });
}

function drawSkinHeadOverlay(ctx: Ctx, skinId: string | undefined, dir: DuckDir, m: Motion, state: CharacterState): void {
  if (state === 'down') return;
  const overlay = overlayFor(skinId);
  if (overlay === 'none' || overlay === 'prison' || overlay === 'executive') return;
  headPose(ctx, m, y => {
    switch (overlay) {
      case 'fedora':
        rounded(ctx, 21, y - 18, 38, 6, 3, '#15151d', OUTLINE, 1.8);
        rounded(ctx, 28, y - 28, 24, 12, 5, '#20212a', OUTLINE, 2);
        rounded(ctx, 28, y - 18.5, 24, 3.5, 1.5, '#b9383e', '', 0);
        break;
      case 'chef':
        rounded(ctx, 26, y - 17, 28, 7, 3, '#e8e9e8', OUTLINE, 1.5);
        rounded(ctx, 29, y - 25, 22, 11, 5, '#fafbf9', OUTLINE, 1.7);
        ellipse(ctx, 31, y - 23, 6.5, 6, '#ffffff', OUTLINE, 1.3);
        ellipse(ctx, 40, y - 25, 7.5, 6.5, '#ffffff', OUTLINE, 1.3);
        ellipse(ctx, 49, y - 23, 6.5, 6, '#ffffff', OUTLINE, 1.3);
        line(ctx, 36, y - 21, 36, y - 15, '#d3d6d6', 1.1);
        line(ctx, 44, y - 21, 44, y - 15, '#d3d6d6', 1.1);
        break;
      case 'ninja': {
        rounded(ctx, 23, y - 16, 34, 8, 4, '#171a21', OUTLINE, 1.5);
        rounded(ctx, 22, y - 10, 36, 4, 2, '#c33b40', OUTLINE, 1);
        const tailX = dir === 'left' ? 18 : 58;
        ctx.fillStyle = '#c33b40';
        ctx.beginPath(); ctx.moveTo(tailX, y - 9); ctx.lineTo(tailX + (dir === 'left' ? -8 : 8), y - 5); ctx.lineTo(tailX, y - 3); ctx.closePath(); ctx.fill();
        break;
      }
      case 'undercover': {
        rounded(ctx, 23, y - 18, 34, 6, 3, '#244784', OUTLINE, 1.7);
        rounded(ctx, 29, y - 24, 22, 8, 4, '#1b3565', OUTLINE, 1.7);
        ellipse(ctx, 40, y - 18.5, 2.8, 2.8, '#f0c75e', OUTLINE, 1);
        if (dir !== 'up') {
          const mx = dir === 'down' ? 40 : 40 + (dir === 'right' ? 12 : -12);
          ellipse(ctx, mx - 3, y + 5, 4.2, 2.2, '#2b2020', '', 0);
          ellipse(ctx, mx + 3, y + 5, 4.2, 2.2, '#2b2020', '', 0);
        }
        break;
      }
      case 'pirate': {
        ctx.beginPath(); ctx.moveTo(20, y - 12); ctx.quadraticCurveTo(27, y - 25, 40, y - 17); ctx.quadraticCurveTo(53, y - 25, 60, y - 12); ctx.quadraticCurveTo(40, y - 7, 20, y - 12); ctx.closePath(); ctx.fillStyle = '#211b1e'; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2; ctx.stroke();
        ctx.strokeStyle = '#d3a74f'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(25, y - 13); ctx.quadraticCurveTo(40, y - 9, 55, y - 13); ctx.stroke();
        ellipse(ctx, 40, y - 15, 2.3, 2.3, '#f4e7c7', '', 0);
        if (dir !== 'up') {
          const ex = dir === 'down' ? 31.5 : 40 + (dir === 'right' ? 9 : -9);
          line(ctx, ex - 7, y - 5, ex + 7, y + 1, '#0b0b0f', 1.6);
          ellipse(ctx, ex, y - .8, 4.2, 4.8, '#0b0b0f', OUTLINE, 1.2);
        }
        break;
      }
      case 'gold':
        rounded(ctx, 29, y - 15, 22, 5, 2, '#e6b93c', OUTLINE, 1.4);
        ctx.fillStyle = '#ffd95e'; ctx.beginPath(); ctx.moveTo(30, y - 14); ctx.lineTo(31, y - 22); ctx.lineTo(36, y - 16); ctx.lineTo(40, y - 24); ctx.lineTo(44, y - 16); ctx.lineTo(49, y - 22); ctx.lineTo(50, y - 14); ctx.closePath(); ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5; ctx.stroke();
        ellipse(ctx, 40, y - 16, 1.8, 1.8, '#fff4b0', '', 0);
        break;
      case 'king':
        rounded(ctx, 27, y - 14, 26, 5, 2, '#d8ad39', OUTLINE, 1.4);
        ctx.fillStyle = '#ffd95e'; ctx.beginPath(); ctx.moveTo(28, y - 13); ctx.lineTo(29, y - 22); ctx.lineTo(35, y - 16); ctx.lineTo(40, y - 25); ctx.lineTo(45, y - 16); ctx.lineTo(51, y - 22); ctx.lineTo(52, y - 13); ctx.closePath(); ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.7; ctx.stroke();
        ellipse(ctx, 34, y - 14, 1.8, 1.8, '#d44d67', '', 0); ellipse(ctx, 40, y - 15, 1.8, 1.8, '#4d79d4', '', 0); ellipse(ctx, 46, y - 14, 1.8, 1.8, '#5bb77a', '', 0);
        break;
    }
  });
}

function drawHead(ctx: Ctx, pal: Palette, dir: DuckDir, m: Motion): void {
  const y = 27 + m.headBob + m.down * 4;
  const rx = dir === 'left' || dir === 'right' ? 16.5 : 18.2;
  ctx.save();
  ctx.translate(40, y);
  ctx.rotate(m.tilt * .75);
  ctx.scale(m.squashX, m.squashY);
  ctx.translate(-40, -y);
  ellipse(ctx, 40, y, rx, 16.5, pal.body, OUTLINE, 2.5);
  ctx.globalAlpha = .7; ellipse(ctx, 34, y - 6.7, 8.5, 5.2, pal.light, '', 0); ctx.globalAlpha = 1;
  ctx.globalAlpha = .34; ellipse(ctx, 44, y + 8.4, 11, 4.2, pal.shade, '', 0); ctx.globalAlpha = 1;
  drawMask(ctx, pal, dir, y);
  drawFace(ctx, pal, dir, y, m.blink);
  ctx.restore();
}

function drawWeapon""",
)

replace_once(
    PLAYER,
    """  drawFeet(ctx, pal, dir, m);
  if (dir === 'up') drawWeapon(ctx, dir, m, state, index);
  drawBody(ctx, pal, dir, m);
  drawHead(ctx, pal, dir, m);
  if (dir !== 'up') drawWeapon(ctx, dir, m, state, index);
""",
    """  drawFeet(ctx, pal, dir, m);
  drawSkinBackOverlay(ctx, skinId, m, state);
  drawPackBack(ctx, pal, dir, m, state);
  if (dir === 'up') drawWeapon(ctx, dir, m, state, index);
  drawBody(ctx, pal, dir, m);
  drawStrapsFront(ctx, pal, dir, m, state);
  drawSkinBodyOverlay(ctx, skinId, dir, m, state);
  drawHead(ctx, pal, dir, m);
  drawSkinHeadOverlay(ctx, skinId, dir, m, state);
  if (dir !== 'up') drawWeapon(ctx, dir, m, state, index);
""",
)

replace_once(
    PLAYER,
    """  rt.renderer.submitShadow('duck-v3-shadow', feetX, feetY + 1, 31, 8, .24 * opacity, feetY - 1);
  rt.renderer.submitSprite({ id: 'duck-v3', layer: RenderLayer.ACTORS, sortY: feetY, x: feetX, y: feetY, width: FRAME, height: FRAME, pivotX: PIVOT_X, pivotY: PIVOT_Y, color: [1, 1, 1, opacity * (input.dashing ? .9 : 1)], region: { textureId, u0: 0, v0: 0, u1: 1, v1: 1 }, effects: { outline: .08, rim: input.hurt ? .32 : .11, flash: input.hurt ? .12 : 0 } });
  rt.renderer.submitLight({ x: feetX, y: feetY - 25, radius: 42, color: [1, .82, .49], intensity: .045, innerRadius: .16, falloff: 1.9 });
""",
    """  rt.renderer.submitShadow('duck-v3-shadow', feetX, feetY + DRAW_SCALE, 31 * DRAW_SCALE, 8 * DRAW_SCALE, .24 * opacity, feetY - DRAW_SCALE);
  rt.renderer.submitSprite({ id: 'duck-v3', layer: RenderLayer.ACTORS, sortY: feetY, x: feetX, y: feetY, width: FRAME * DRAW_SCALE, height: FRAME * DRAW_SCALE, pivotX: PIVOT_X * DRAW_SCALE, pivotY: PIVOT_Y * DRAW_SCALE, color: [1, 1, 1, opacity * (input.dashing ? .9 : 1)], region: { textureId, u0: 0, v0: 0, u1: 1, v1: 1 }, effects: { outline: .08, rim: input.hurt ? .32 : .11, flash: input.hurt ? .12 : 0 } });
  rt.renderer.submitLight({ x: feetX, y: feetY - 25 * DRAW_SCALE, radius: 42 * DRAW_SCALE, color: [1, .82, .49], intensity: .045, innerRadius: .16, falloff: 1.9 });
""",
)
replace_once(
    PLAYER,
    """  input.ctx.save(); input.ctx.imageSmoothingEnabled = false; input.ctx.globalAlpha = .22 * opacity; input.ctx.fillStyle = '#1d1820'; input.ctx.beginPath(); input.ctx.ellipse(feetX, feetY + 1, 15, 4, 0, 0, Math.PI * 2); input.ctx.fill(); input.ctx.globalAlpha = opacity; input.ctx.drawImage(sprite, feetX - PIVOT_X, feetY - PIVOT_Y); input.ctx.restore();
""",
    """  input.ctx.save(); input.ctx.imageSmoothingEnabled = false; input.ctx.globalAlpha = .22 * opacity; input.ctx.fillStyle = '#1d1820'; input.ctx.beginPath(); input.ctx.ellipse(feetX, feetY + DRAW_SCALE, 15 * DRAW_SCALE, 4 * DRAW_SCALE, 0, 0, Math.PI * 2); input.ctx.fill(); input.ctx.globalAlpha = opacity; input.ctx.drawImage(sprite, feetX - PIVOT_X * DRAW_SCALE, feetY - PIVOT_Y * DRAW_SCALE, FRAME * DRAW_SCALE, FRAME * DRAW_SCALE); input.ctx.restore();
""",
)

# The whole wardrobe now goes through the current player presentation path:
# robber -> V16 atlas, cosmetic skins -> normalized overlay-aware V3 fallback.
replace_once(
    RENDER,
    """import {
  drawHeart,
  drawItem, drawWeaponIcon,
  drawDuckSkin,
} from './sprites';
""",
    """import {
  drawHeart,
  drawItem, drawWeaponIcon,
} from './sprites';
""",
)
replace_once(
    RENDER,
    """  ctx.save();
  ctx.translate(pvx + pw / 2, pvy + 77+Math.round(Math.sin(engine.frame*.04)));
  ctx.scale(4,4);
  drawDuckSkin(ctx,-8,-8,engine.frame,skin.id,engine.frame%900>750?'left':'down',false,false,false);
  ctx.restore();
""",
    """  ctx.save();
  ctx.translate(pvx + pw / 2, pvy + 122 + Math.round(Math.sin(engine.frame * .04)));
  ctx.scale(1.55, 1.55);
  drawChibiPlayerAtlasV16({
    ctx, x: -8, y: -18, frame: engine.frame,
    dir: engine.frame % 900 > 750 ? 'left' : 'down', moving: false,
    hurt: false, dashing: false, shooting: false,
    skinId: skin.id, runtimeKey: skin, shotSequence: 0,
  });
  ctx.restore();
""",
)
replace_once(
    RENDER,
    """    // Pato pequeño animado
    ctx.save();
    ctx.translate(cx+cellW/2,cy+30);
    ctx.scale(2,2);
    ctx.globalAlpha=isUnlocked?1:.63;
    drawDuckSkin(ctx, -8, -8, engine.frame + i * 7, s.id, 'down', false, false, false);
    ctx.restore();
""",
    """    // Preview moderno: V16 para el ladrón base y V3 overlay-aware para
    // el resto de aspectos, con la misma huella visual en la cuadrícula.
    ctx.save();
    ctx.globalAlpha = isUnlocked ? 1 : .63;
    ctx.translate(cx + cellW / 2, cy + 52);
    ctx.scale(.82, .82);
    drawChibiPlayerAtlasV16({
      ctx, x: -8, y: -18, frame: engine.frame + i * 7, dir: 'down', moving: false,
      hurt: false, dashing: false, shooting: false,
      skinId: s.id, runtimeKey: s, shotSequence: 0,
    });
    ctx.restore();
""",
)

replace_once(INDEX, '0.7.51-chibi-v16-terminal-screens', '0.7.52-chibi-skin-coherence-candidate')
print('patched v0.7.52 modern cosmetic skin coherence candidate; gameplay/hitboxes unchanged')
