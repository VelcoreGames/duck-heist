from pathlib import Path

PLAYER = Path('src/game/graphics/playerChibiRemastered.ts')
INDEX = Path('index.html')


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, found {count}')
    return text.replace(old, new, 1)


src = PLAYER.read_text()

src = replace_once(src,
"""  moveStoppedAt?: number;
  turnAt?: number;
}""",
"""  moveStoppedAt?: number;
  turnAt?: number;
  lastX: number;
  lastY: number;
  walkDistance: number;
}""", 'runtime gait fields')

src = replace_once(src,
"function resolveState(input: ChibiPlayerRemasteredInput): { state: State; tick: number; dashRecovery: number; moveStartAge: number; moveStopAge: number; turnAge: number } {",
"function resolveState(input: ChibiPlayerRemasteredInput): { state: State; tick: number; dashRecovery: number; moveStartAge: number; moveStopAge: number; turnAge: number; walkDistance: number } {",
'resolve gait return type')

src = replace_once(src,
"""    rt = { state: 'idle', enteredAt: input.frame, lastFrame: input.frame, lastShot: input.shotSequence, wasShoot: false, wasDash: false, wasHurt: false, lastDir: input.dir, wasMoving: input.moving };""",
"""    rt = { state: 'idle', enteredAt: input.frame, lastFrame: input.frame, lastShot: input.shotSequence, wasShoot: false, wasDash: false, wasHurt: false, lastDir: input.dir, wasMoving: input.moving, lastX: input.x, lastY: input.y, walkDistance: 0 };""",
'gait runtime init')

src = replace_once(src,
"""  const wanted = desiredState(input);
  if (rt.lastDir !== input.dir) {""",
"""  const wanted = desiredState(input);
  const worldDx = input.x - rt.lastX;
  const worldDy = input.y - rt.lastY;
  const worldStep = Math.hypot(worldDx, worldDy);
  // Ignore room teleports/respawns. Normal locomotion advances the authored
  // gait by actual distance so feet no longer skate at different speeds.
  if (input.moving && !input.dashing && worldStep > .01 && worldStep < 8) {
    rt.walkDistance += worldStep;
  }
  rt.lastX = input.x;
  rt.lastY = input.y;
  if (rt.lastDir !== input.dir) {""",
'gait distance accumulation')

src = replace_once(src,
"""  const turnAge = rt.turnAt === undefined ? -1 : input.frame - rt.turnAt;
  return { state: rt.state, tick: Math.max(0, input.frame - rt.enteredAt), dashRecovery, moveStartAge, moveStopAge, turnAge };""",
"""  const turnAge = rt.turnAt === undefined ? -1 : input.frame - rt.turnAt;
  return { state: rt.state, tick: Math.max(0, input.frame - rt.enteredAt), dashRecovery, moveStartAge, moveStopAge, turnAge, walkDistance: rt.walkDistance };""",
'gait return')

src = replace_once(src,
"function poseFor(state: State, tick: number, _frame: number, dir: DuckDir): Pose {",
"function poseFor(state: State, tick: number, _frame: number, dir: DuckDir, walkDistance = 0): Pose {",
'pose gait signature')

src = replace_once(src,
"""    const cycle = tick % 24;
    const i = Math.floor(cycle / 2) % 12;
    const phase = (cycle / 24) * Math.PI * 2;""",
"""    const strideDistance = 36;
    const cycleDistance = ((walkDistance % strideDistance) + strideDistance) % strideDistance;
    const i = Math.floor((cycleDistance / strideDistance) * 12) % 12;
    const phase = (cycleDistance / strideDistance) * Math.PI * 2;""",
'distance synced walk cycle')

src = replace_once(src,
"""  const { state, tick, dashRecovery, moveStartAge, moveStopAge, turnAge } = resolveState(input);
  const pose = poseFor(state, tick, input.frame, input.dir);""",
"""  const { state, tick, dashRecovery, moveStartAge, moveStopAge, turnAge, walkDistance } = resolveState(input);
  const pose = poseFor(state, tick, input.frame, input.dir, walkDistance);""",
'render gait state')

src = replace_once(src,
"""  document.documentElement.dataset.duckHeistPlayerRenderer = 'canvas2d-chibi-remastered-v12';
  document.documentElement.dataset.duckHeistPlayerFrames = '120-authored-remastered-v12';""",
"""  document.documentElement.dataset.duckHeistPlayerRenderer = 'canvas2d-chibi-remastered-v13';
  document.documentElement.dataset.duckHeistPlayerFrames = '120-authored-remastered-v13';""",
'v13 renderer markers')

PLAYER.write_text(src)

html = INDEX.read_text()
html = replace_once(html, '0.7.32-player-transitions-v12', '0.7.33-distance-synced-gait-v13', 'build marker')
INDEX.write_text(html)

print('v0.7.33 distance-synced gait patch applied')
