from pathlib import Path


def replace_once(path: Path, old: str, new: str) -> None:
    text = path.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one match, found {count}: {old[:180]!r}')
    path.write_text(text.replace(old, new, 1))

TYPES = Path('src/game/types.ts')
ENGINE = Path('src/game/engine.ts')
RENDER = Path('src/game/render.ts')
INDEX = Path('index.html')

# Presentation-only timer. It must never be consulted by gameplay gates.
replace_once(
    TYPES,
    """    activeWeapon: number;
    switchAnim: number;
    fireCooldown: number;
""",
    """    activeWeapon: number;
    switchAnim: number;
    /** presentation-only E interaction gesture; never gates gameplay */
    interactVisualTimer: number;
    fireCooldown: number;
""",
)

replace_once(
    ENGINE,
    """    activeWeapon: 0, switchAnim: 0,
    fireCooldown: 0,
""",
    """    activeWeapon: 0, switchAnim: 0, interactVisualTimer: 0,
    fireCooldown: 0,
""",
)

replace_once(
    ENGINE,
    """  if (player.switchAnim > 0) player.switchAnim--;

  // el foco del láser se relaja cuando dejas de mantarlo sobre un objetivo
""",
    """  if (player.switchAnim > 0) player.switchAnim--;
  if (player.interactVisualTimer > 0) player.interactVisualTimer--;

  // el foco del láser se relaja cuando dejas de mantarlo sobre un objetivo
""",
)

# Successful floor pickup.
replace_once(
    ENGINE,
    """      }
      spawn(engine, it.x + 8, it.y + 8, 'spark', 10, '#f4d03f');
      content.items.splice(i, 1);
""",
    """      }
      player.interactVisualTimer = Math.max(player.interactVisualTimer, 12);
      spawn(engine, it.x + 8, it.y + 8, 'spark', 10, '#f4d03f');
      content.items.splice(i, 1);
""",
)

# Successful pedestal take.
replace_once(
    ENGINE,
    """      if (ok) {
        ped.taken = true;
        spawn(engine, ped.x + 12, ped.y, 'spark', 20, '#f4d03f');
""",
    """      if (ok) {
        ped.taken = true;
        player.interactVisualTimer = Math.max(player.interactVisualTimer, 12);
        spawn(engine, ped.x + 12, ped.y, 'spark', 20, '#f4d03f');
""",
)

# Successful choice take.
replace_once(
    ENGINE,
    """        if(ok) {finishChoice(content);spawn(engine,ped.x+12,ped.y,'spark',14,'#cbaeef');}
""",
    """        if(ok) {player.interactVisualTimer=Math.max(player.interactVisualTimer,12);finishChoice(content);spawn(engine,ped.x+12,ped.y,'spark',14,'#cbaeef');}
""",
)

# Event activation itself is an authored interaction cue.
replace_once(
    ENGINE,
    """  if(content.event && !content.event.used && engine.keys.e && dist(player.x+7,player.y+8,content.event.x+8,content.event.y+8)<40) {
    engine.keys.e=false;activateEvent(engine);
  }
""",
    """  if(content.event && !content.event.used && engine.keys.e && dist(player.x+7,player.y+8,content.event.x+8,content.event.y+8)<40) {
    player.interactVisualTimer=Math.max(player.interactVisualTimer,12);
    engine.keys.e=false;activateEvent(engine);
  }
""",
)

# Chest opening.
replace_once(
    ENGINE,
    """      c.opened = true;
      engine.keys['e'] = false;
      content.items.push({ x: c.x - 6, y: c.y - 22, itemId: rollItem(engine), isWeapon: false, isActive: false });
""",
    """      c.opened = true;
      player.interactVisualTimer = Math.max(player.interactVisualTimer, 12);
      engine.keys['e'] = false;
      content.items.push({ x: c.x - 6, y: c.y - 22, itemId: rollItem(engine), isWeapon: false, isActive: false });
""",
)

# Successful shop purchase only; denied purchases intentionally do not animate.
replace_once(
    ENGINE,
    """          if (ok) {
            player.crumbs -= price;
            player.couponUsed=true;s.soldAt=engine.frame;s.sold = true;
""",
    """          if (ok) {
            player.interactVisualTimer = Math.max(player.interactVisualTimer, 12);
            player.crumbs -= price;
            player.couponUsed=true;s.soldAt=engine.frame;s.sold = true;
""",
)

# Active-item swap confirmation is also a completed equipment interaction.
replace_once(
    ENGINE,
    """  engine.activeSwap = null;
  engine.keys.e = false;
  engine.mouseDown = false;
}

function showPickupCard""",
    """  p.interactVisualTimer = Math.max(p.interactVisualTimer, 12);
  engine.activeSwap = null;
  engine.keys.e = false;
  engine.mouseDown = false;
}

function showPickupCard""",
)

# World-interaction gesture is suppressed by locomotion to avoid sliding. Weapon
# switch retains its existing authored gesture while moving. Shoot/dash are still
# explicit blockers here; hurt/death keep higher priority inside the V16 resolver.
replace_once(
    RENDER,
    """      interacting: p.switchAnim > 0 && p.shootFlash <= 0 && p.dashTimer <= 0,
      celebrating: engine.state === GameState.FLOOR_CLEAR,
""",
    """      interacting: (p.switchAnim > 0 || (p.interactVisualTimer > 0 && !p.moving)) && p.shootFlash <= 0 && p.dashTimer <= 0,
      celebrating: engine.state === GameState.FLOOR_CLEAR,
""",
)

replace_once(INDEX, '0.7.49-chibi-v16-interact-recovery', '0.7.50-chibi-v16-world-interact-candidate')
print('patched v0.7.50 world interaction candidate; visual timer only, gameplay/hitboxes unchanged')
