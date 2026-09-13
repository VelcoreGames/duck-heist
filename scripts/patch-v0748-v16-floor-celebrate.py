from pathlib import Path


def replace_once(path: Path, old: str, new: str) -> None:
    text = path.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one match, found {count}: {old[:160]!r}')
    path.write_text(text.replace(old, new, 1))

V16 = Path('src/game/graphics/playerChibiAtlasV16.ts')
REM = Path('src/game/graphics/playerChibiRemastered.ts')
RENDER = Path('src/game/render.ts')
INDEX = Path('index.html')

# Shared renderer input: celebration is an optional presentation hint. Older
# skin renderer falls back to its authored interact gesture instead of losing
# compatibility; the base V16 uses its dedicated authored celebration frames.
replace_once(
    REM,
    """  dead?: boolean;
  interacting?: boolean;
  skinId?: string;
""",
    """  dead?: boolean;
  interacting?: boolean;
  celebrating?: boolean;
  skinId?: string;
""",
)
replace_once(
    REM,
    """  if (input.shooting) return 'shoot';
  if (input.interacting) return 'interact';
  return input.moving ? 'walk' : 'idle';
""",
    """  if (input.shooting) return 'shoot';
  if (input.celebrating) return 'interact';
  if (input.interacting) return 'interact';
  return input.moving ? 'walk' : 'idle';
""",
)

replace_once(
    V16,
    """type State = 'idle' | 'walk' | 'shoot' | 'dash' | 'hurt' | 'down' | 'interact';
""",
    """type State = 'idle' | 'walk' | 'shoot' | 'dash' | 'hurt' | 'down' | 'interact' | 'celebrate';
""",
)
replace_once(
    V16,
    """  if (input.shooting) return 'shoot';
  if (input.interacting) return 'interact';
  if (input.moving) return 'walk';
""",
    """  if (input.shooting) return 'shoot';
  if (input.celebrating) return 'celebrate';
  if (input.interacting) return 'interact';
  if (input.moving) return 'walk';
""",
)
replace_once(
    V16,
    """  if (state === 'down') return Math.min(COUNT.down - 1, Math.floor(tick * COUNT.down / 34));
  return Math.floor(tick / 2) % COUNT.interact;
""",
    """  if (state === 'down') return Math.min(COUNT.down - 1, Math.floor(tick * COUNT.down / 34));
  if (state === 'celebrate') return Math.floor(tick / 3) % COUNT.celebrate;
  return Math.floor(tick / 2) % COUNT.interact;
""",
)
replace_once(
    V16,
    """  } else if (state === 'down') {
    const settle = Math.min(1, index / Math.max(1, COUNT.down - 1));
    const contact = Math.sin(Math.min(1, settle * 1.35) * Math.PI);
    scaleX = 1 + settle * .052 + contact * .010;
    scaleY = 1 - settle * .052 - contact * .008;
    dy = settle * .65;
  }
""",
    """  } else if (state === 'down') {
    const settle = Math.min(1, index / Math.max(1, COUNT.down - 1));
    const contact = Math.sin(Math.min(1, settle * 1.35) * Math.PI);
    scaleX = 1 + settle * .052 + contact * .010;
    scaleY = 1 - settle * .052 - contact * .008;
    dy = settle * .65;
  } else if (state === 'celebrate') {
    const phase = (index / COUNT.celebrate) * Math.PI * 2;
    const lift = Math.max(0, Math.sin(phase));
    scaleX = 1 + lift * .012;
    scaleY = 1 - lift * .010;
    dy = -lift * .35;
  }
""",
)

replace_once(
    RENDER,
    """      interacting: p.switchAnim > 0 && p.shootFlash <= 0 && p.dashTimer <= 0,
      alpha: p.iFrames > 0 && p.dashTimer <= 0 && Math.floor(f * 0.35) % 2 === 0 ? 0.42 : 1,
""",
    """      interacting: p.switchAnim > 0 && p.shootFlash <= 0 && p.dashTimer <= 0,
      celebrating: engine.state === GameState.FLOOR_CLEAR,
      alpha: p.iFrames > 0 && p.dashTimer <= 0 && Math.floor(f * 0.35) % 2 === 0 ? 0.42 : 1,
""",
)

replace_once(INDEX, '0.7.47-chibi-v16-death-focus', '0.7.48-chibi-v16-floor-celebrate-candidate')
print('patched v0.7.48 floor-celebrate candidate; presentation-only, gameplay/hitboxes unchanged')
