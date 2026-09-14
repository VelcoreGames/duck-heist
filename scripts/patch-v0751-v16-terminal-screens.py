from pathlib import Path


def replace_once(path: Path, old: str, new: str) -> None:
    text = path.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one match, found {count}: {old[:180]!r}')
    path.write_text(text.replace(old, new, 1))

RENDER = Path('src/game/render.ts')
INDEX = Path('index.html')

# Victory no longer falls back to the original procedural duck. Keep the same
# UI structure/stats/buttons and place a compact V16 celebrate presentation in
# the existing portrait band.
replace_once(
    RENDER,
    """  ctx.save();
  ctx.translate(CANVAS_WIDTH / 2 - 20, 88 + Math.sin(f * 0.09) * 2);
  ctx.scale(1.4, 1.4);
  drawDuck(ctx, 0, 0, f, 'down', false, false, false);
  ctx.restore();
""",
    """  ctx.save();
  ctx.translate(CANVAS_WIDTH / 2, 126);
  ctx.scale(.78, .78);
  drawChibiPlayerAtlasV16({
    ctx, x: -8, y: -18, frame: f, dir: 'down', moving: false,
    hurt: false, dashing: false, shooting: false, celebrating: true,
    skinId: engine.equippedSkin, runtimeKey: engine.player, shotSequence: engine.player.shotCounter,
  });
  ctx.restore();
""",
)

# GAME OVER uses the same V16 down presentation that led into the terminal
# screen. A smaller scale preserves the existing title/stats spacing.
replace_once(
    RENDER,
    """  ctx.save();
  ctx.translate(CANVAS_WIDTH / 2 - 24, 84);
  ctx.scale(1.5, 1.5);
  drawDuckSkin(ctx,0,Math.sin(f*.05)*1.5,f,engine.equippedSkin,'down',false,false,false,false,true);
  ctx.restore();
""",
    """  ctx.save();
  ctx.translate(CANVAS_WIDTH / 2, 112);
  ctx.scale(.65, .65);
  drawChibiPlayerAtlasV16({
    ctx, x: -8, y: -18, frame: f, dir: 'down', moving: false,
    hurt: false, dashing: false, shooting: false, dead: true,
    skinId: engine.equippedSkin, runtimeKey: engine.player, shotSequence: engine.player.shotCounter,
  });
  ctx.restore();
""",
)

# drawDuck was only used by Victory in render.ts; drawDuckSkin stays because the
# wardrobe still has its own legacy preview path and is deliberately out of scope.
replace_once(
    RENDER,
    """import {
  drawDuck, drawHeart,
  drawItem, drawWeaponIcon,
  drawDuckSkin,
} from './sprites';
""",
    """import {
  drawHeart,
  drawItem, drawWeaponIcon,
  drawDuckSkin,
} from './sprites';
""",
)

replace_once(INDEX, '0.7.50-chibi-v16-world-interact', '0.7.51-chibi-v16-terminal-screens-candidate')
print('patched v0.7.51 V16 terminal screens candidate; terminal presentation only')
