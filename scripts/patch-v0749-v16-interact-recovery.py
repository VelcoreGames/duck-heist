from pathlib import Path


def replace_once(path: Path, old: str, new: str) -> None:
    text = path.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one match, found {count}: {old[:180]!r}')
    path.write_text(text.replace(old, new, 1))

V16 = Path('src/game/graphics/playerChibiAtlasV16.ts')
INDEX = Path('index.html')

# The gameplay switch timer is intentionally left untouched. V16 interact is an
# authored 12-frame non-looping gesture, so present one authored frame per render
# tick instead of stretching it to 24 ticks. This lets the normal 12-tick weapon
# cycle actually show the full gesture and lets longer swaps settle on frame 11.
replace_once(
    V16,
    """  if (state === 'celebrate') return Math.floor(tick / 3) % COUNT.celebrate;
  return Math.floor(tick / 2) % COUNT.interact;
""",
    """  if (state === 'celebrate') return Math.floor(tick / 3) % COUNT.celebrate;
  // interact is authored as a short non-looping weapon/equip gesture.
  return Math.min(COUNT.interact - 1, tick);
""",
)

# The shortest equip path uses a 10-tick switchAnim. If it expires while the
# player is stationary, allow only the final two visual recovery frames to land.
# Any real action/movement still wins immediately through the existing priority
# rules, so this cannot delay movement, shooting, dash, hurt, input or gameplay.
replace_once(
    V16,
    """  } else if (rt.state === 'hurt' && age < 12) {
    // keep impact readable
  } else if (rt.state === 'down') {
""",
    """  } else if (rt.state === 'hurt' && age < 12) {
    // keep impact readable
  } else if (rt.state === 'interact' && wanted === 'idle' && age < COUNT.interact) {
    // Finish only the authored visual recovery when a short equip ends at rest.
  } else if (rt.state === 'down') {
""",
)

replace_once(
    INDEX,
    '0.7.48-chibi-v16-floor-celebrate',
    '0.7.49-chibi-v16-interact-recovery-candidate',
)

print('patched v0.7.49 V16 interact recovery candidate; gameplay/hitboxes unchanged')
