from pathlib import Path


def replace_once(path: Path, old: str, new: str) -> None:
    text = path.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one match, found {count}: {old[:140]!r}')
    path.write_text(text.replace(old, new, 1))

ENGINE = Path('src/game/engine.ts')
APP = Path('src/App.tsx')
INDEX = Path('index.html')

# The player type already owns deathTimer. Use it to hold a short visual-only
# death presentation before GAME_OVER. During the hold, simulation/input is
# frozen; collision sizes, damage, movement speed and hitboxes are untouched.
replace_once(
    ENGINE,
    """  if(engine.state===GameState.HEIST_INTRO) {
    if(--engine.heistIntroTimer<=0) { engine.heistIntroSeen=true;startGame(engine); }
    return;
  }
  if (engine.roomLabelTimer > 0) engine.roomLabelTimer--;
""",
    """  if(engine.state===GameState.HEIST_INTRO) {
    if(--engine.heistIntroTimer<=0) { engine.heistIntroSeen=true;startGame(engine); }
    return;
  }

  // Let the authored 34-frame V16 down animation play before the GAME_OVER UI.
  // No world simulation runs during this window: it is presentation-only.
  if (engine.player.hp <= 0 && engine.player.deathTimer > 0) {
    const p = engine.player;
    p.deathTimer++;
    p.moving = false; p.shootFlash = 0; p.dashTimer = 0;
    engine.mouseDown = false; engine.keys = {};
    engine.shakeX *= .72; engine.shakeY *= .72; engine.shakeIntensity *= .82;
    if (p.deathTimer >= 36) {
      p.deathTimer = 36;
      engine.state = GameState.GAME_OVER;
      engine.endFrame = engine.frame;
      engine.pauseIndex = 0;
      setMusic('menu');
      saveProgress(engine);
      engine.onStateChange?.(engine.state);
    }
    return;
  }

  if (engine.roomLabelTimer > 0) engine.roomLabelTimer--;
""",
)

replace_once(
    ENGINE,
    """  // --- Muerte ---
  if (player.hp <= 0) {
    engine.state = GameState.GAME_OVER;
    engine.swap=null;engine.mouseDown=false;engine.keys={};
    engine.endFrame=engine.frame;
    engine.pauseIndex = 0;
    setMusic('menu');
    spawn(engine, player.x + 7, player.y + 8, 'feather', 18, '#f9e547');
    saveProgress(engine);
    engine.onStateChange?.(engine.state);
  }
""",
    """  // --- Muerte ---
  if (player.hp <= 0 && player.deathTimer === 0) {
    // Start a frozen presentation window; GAME_OVER is entered by the early
    // death branch on a later frame so the V16 down sequence is actually seen.
    player.deathTimer = 1;
    player.moving=false;player.shootFlash=0;player.dashTimer=0;
    engine.swap=null;engine.mouseDown=false;engine.keys={};
    engine.pauseIndex = 0;
    spawn(engine, player.x + 7, player.y + 8, 'feather', 18, '#f9e547');
  }
""",
)

# Prevent direct keyboard, gamepad and focus-loss pause actions from bypassing
# the frozen death presentation between update ticks.
replace_once(
    APP,
    """        case GameState.PLAYING:
          if (k === 'escape') { engine.pauseIndex = 0; goTo(GameState.PAUSED); setMusic('menu'); }
""",
    """        case GameState.PLAYING:
          if (engine.player.hp <= 0 || engine.player.deathTimer > 0) break;
          if (k === 'escape') { engine.pauseIndex = 0; goTo(GameState.PAUSED); setMusic('menu'); }
""",
)
replace_once(
    APP,
    """    const onBlur = () => {engine.keys={};engine.mouseDown=false;padInput.reset(engine);if(engine.state===GameState.PLAYING)goTo(GameState.PAUSED);};
""",
    """    const onBlur = () => {engine.keys={};engine.mouseDown=false;padInput.reset(engine);if(engine.state===GameState.PLAYING&&engine.player.hp>0&&engine.player.deathTimer===0)goTo(GameState.PAUSED);};
""",
)
replace_once(
    APP,
    """    const padAction=(action:PadAction)=>{
      if(action==='previousWeapon'||action==='nextWeapon'){cycleWeapon(engine,action==='nextWeapon'?1:-1);return;}
""",
    """    const padAction=(action:PadAction)=>{
      if(engine.player.hp<=0 || engine.player.deathTimer>0) return;
      if(action==='previousWeapon'||action==='nextWeapon'){cycleWeapon(engine,action==='nextWeapon'?1:-1);return;}
""",
)

replace_once(INDEX, '0.7.45-chibi-v16-impact-fx', '0.7.46-chibi-v16-death-presentation-candidate')
print('patched v0.7.46 death presentation candidate; gameplay/hitboxes unchanged')
