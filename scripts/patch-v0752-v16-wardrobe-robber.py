from pathlib import Path


def replace_once(path: Path, old: str, new: str) -> None:
    text = path.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one match, found {count}: {old[:180]!r}')
    path.write_text(text.replace(old, new, 1))

RENDER = Path('src/game/render.ts')
INDEX = Path('index.html')

# Main wardrobe portrait: only the default robber moves to the current V16
# presentation. Other skins intentionally keep drawDuckSkin because that path
# owns their unique fedora/chef/crown/etc overlays.
replace_once(
    RENDER,
    """  ctx.save();
  ctx.translate(pvx + pw / 2, pvy + 77+Math.round(Math.sin(engine.frame*.04)));
  ctx.scale(4,4);
  drawDuckSkin(ctx,-8,-8,engine.frame,skin.id,engine.frame%900>750?'left':'down',false,false,false);
  ctx.restore();
""",
    """  ctx.save();
  if (skin.id === 'robber') {
    ctx.translate(pvx + pw / 2, pvy + 122 + Math.round(Math.sin(engine.frame * .04)));
    ctx.scale(1.55, 1.55);
    drawChibiPlayerAtlasV16({
      ctx, x: -8, y: -18, frame: engine.frame,
      dir: engine.frame % 900 > 750 ? 'left' : 'down', moving: false,
      hurt: false, dashing: false, shooting: false,
      skinId: 'robber', runtimeKey: skin, shotSequence: 0,
    });
  } else {
    ctx.translate(pvx + pw / 2, pvy + 77 + Math.round(Math.sin(engine.frame * .04)));
    ctx.scale(4, 4);
    drawDuckSkin(ctx, -8, -8, engine.frame, skin.id, engine.frame % 900 > 750 ? 'left' : 'down', false, false, false);
  }
  ctx.restore();
""",
)

# Grid cell: same policy. The robber cell uses V16 at the same apparent visual
# height; all cosmetic skins stay on their overlay-aware legacy preview path.
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
    """    // Pato pequeño animado. El ladrón base usa su arte V16 actual;
    // las skins con overlays conservan su preview específico.
    ctx.save();
    ctx.globalAlpha = isUnlocked ? 1 : .63;
    if (s.id === 'robber') {
      ctx.translate(cx + cellW / 2, cy + 52);
      ctx.scale(.82, .82);
      drawChibiPlayerAtlasV16({
        ctx, x: -8, y: -18, frame: engine.frame + i * 7, dir: 'down', moving: false,
        hurt: false, dashing: false, shooting: false,
        skinId: 'robber', runtimeKey: s, shotSequence: 0,
      });
    } else {
      ctx.translate(cx + cellW / 2, cy + 30);
      ctx.scale(2, 2);
      drawDuckSkin(ctx, -8, -8, engine.frame + i * 7, s.id, 'down', false, false, false);
    }
    ctx.restore();
""",
)

replace_once(INDEX, '0.7.51-chibi-v16-terminal-screens', '0.7.52-chibi-v16-wardrobe-robber-candidate')
print('patched v0.7.52 wardrobe robber V16 candidate; non-default skin overlays preserved')
