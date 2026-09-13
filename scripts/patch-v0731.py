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
"""interface Runtime {
  state: State;
  enteredAt: number;
  lastFrame: number;
  lastShot?: number;
  wasShoot: boolean;
  wasDash: boolean;
  wasHurt: boolean;
}""",
"""interface Runtime {
  state: State;
  enteredAt: number;
  lastFrame: number;
  lastShot?: number;
  wasShoot: boolean;
  wasDash: boolean;
  wasHurt: boolean;
  dashEndedAt?: number;
}""", 'runtime dash recovery')

src = replace_once(src,
"function resolveState(input: ChibiPlayerRemasteredInput): { state: State; tick: number } {",
"function resolveState(input: ChibiPlayerRemasteredInput): { state: State; tick: number; dashRecovery: number } {",
'resolve signature')

src = replace_once(src,
"""  const wanted = desiredState(input);
  const shotChanged = input.shotSequence !== undefined && rt.lastShot !== undefined && input.shotSequence !== rt.lastShot;""",
"""  const wanted = desiredState(input);
  if (rt.wasDash && !input.dashing) rt.dashEndedAt = input.frame;
  const shotChanged = input.shotSequence !== undefined && rt.lastShot !== undefined && input.shotSequence !== rt.lastShot;""",
'dash end detection')

src = replace_once(src,
"""  rt.wasHurt = input.hurt;
  return { state: rt.state, tick: Math.max(0, input.frame - rt.enteredAt) };""",
"""  rt.wasHurt = input.hurt;
  const dashRecovery = rt.dashEndedAt === undefined ? -1 : input.frame - rt.dashEndedAt;
  return { state: rt.state, tick: Math.max(0, input.frame - rt.enteredAt), dashRecovery };""",
'dash recovery return')

src = replace_once(src,
"""  if (state === 'dash') {
    const i = Math.floor(tick * 1.2) % 12;
    const t = Math.min(1, tick / 10);
    const pulse = Math.sin(t * Math.PI);
    const horizontal = dir === 'left' || dir === 'right';
    return {
      authored: 'walk', index: i,
      scaleX: horizontal ? 1.035 + pulse * .035 : .985 - pulse * .012,
      scaleY: horizontal ? .978 - pulse * .012 : 1.035 + pulse * .035,
      rotation: 0,
      dx: 0,
      dy: horizontal ? -.55 : 0,
    };
  }
  if (state === 'hurt') {
    const seq = [2,3,2,1,0];
    const i = seq[Math.min(seq.length - 1, Math.floor(tick / 2))];
    const snap = tick < 3 ? -1 : tick < 6 ? 1 : 0;
    return {
      authored: 'idle', index: i,
      scaleX: 1.018, scaleY: .984,
      rotation: snap * .018,
      dx: snap * .65,
      dy: -.58,
    };
  }""",
"""  if (state === 'dash') {
    // Anticipation -> stretch -> recovery. Keeps the authored walk silhouette
    // but gives the dash a readable chibi action arc in every direction.
    const i = Math.floor(tick * 1.45) % 12;
    const t = Math.min(1, tick / 10);
    const launch = Math.min(1, tick / 2);
    const anticipation = 1 - launch;
    const driveT = Math.max(0, Math.min(1, (t - .08) / .82));
    const drive = Math.sin(driveT * Math.PI);
    const recover = Math.max(0, Math.min(1, (t - .72) / .28));
    const stretch = drive * .058 * (1 - recover * .42);
    const squash = anticipation * .052;
    const horizontal = dir === 'left' || dir === 'right';
    return {
      authored: 'walk', index: i,
      scaleX: horizontal ? .985 - squash + stretch : 1.018 + squash * .38 - stretch * .24,
      scaleY: horizontal ? 1.018 + squash * .38 - stretch * .24 : .985 - squash + stretch,
      rotation: 0,
      dx: 0,
      dy: horizontal ? -.58 - drive * .24 : -drive * .18,
    };
  }
  if (state === 'hurt') {
    const seq = [2,3,2,1,0];
    const i = seq[Math.min(seq.length - 1, Math.floor(tick / 2))];
    const impact = Math.max(0, 1 - tick / 10);
    const snap = tick < 2 ? -1 : tick < 5 ? 1 : tick < 7 ? -.35 : 0;
    const v = dashVector(dir);
    return {
      authored: 'idle', index: i,
      scaleX: 1 + impact * .028,
      scaleY: 1 - impact * .034,
      rotation: snap * .034,
      dx: -v.x * impact * 1.15 + snap * .28,
      dy: -v.y * impact * .72 - impact * .52,
    };
  }""", 'dash and hurt pose')

start = src.index('function drawWalkStepAccent(')
end = src.index('\n\nfunction drawFootfallDust', start)
src = src[:start] + """function drawWalkStepAccent(ctx: Ctx, feetX: number, feetY: number, poseIndex: number, dir: DuckDir, alpha: number): void {
  // Ground contact accent, not a second pair of fake feet. The authored atlas
  // remains the silhouette; this only sells weight against polished floors.
  const phase = (poseIndex / 12) * Math.PI * 2;
  const stride = Math.sin(phase);
  const lead = stride >= 0 ? 1 : -1;
  const horizontal = dir === 'left' || dir === 'right';
  const facing = dir === 'left' ? -1 : 1;
  const front = dir === 'down' ? 1 : dir === 'up' ? -1 : 0;
  const cx = horizontal ? feetX + facing * lead * 2.25 : feetX + lead * 1.95;
  const cy = horizontal ? feetY + .72 : feetY + front * lead * .58 + .62;
  ctx.save();
  ctx.globalAlpha = .13 * alpha;
  ctx.strokeStyle = '#6f4b31';
  ctx.lineWidth = .75;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 2.55, .78, horizontal ? facing * .12 : lead * .08, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = .085 * alpha;
  ctx.fillStyle = '#fff1c8';
  ctx.beginPath();
  ctx.ellipse(cx - .35, cy - .28, 1.35, .32, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}""" + src[end:]

insert_at = src.index('\nfunction drawShadow(')
helpers = r'''

function drawDashLanding(ctx: Ctx, feetX: number, feetY: number, dir: DuckDir, tick: number, alpha: number): void {
  if (tick < 0 || tick > 6) return;
  const t = tick / 6;
  const v = dashVector(dir);
  const fade = (1 - t) * alpha;
  ctx.save();
  ctx.globalAlpha = fade * .23;
  ctx.strokeStyle = '#f2d49b';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.ellipse(feetX - v.x * 1.8, feetY + .7 - v.y * .65, 4.3 + t * 5.8, 1.3 + t * 1.35, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = fade * .12;
  ctx.fillStyle = '#f8e4bd';
  for (let i = 0; i < 4; i++) {
    const side = (i - 1.5) * 2.2;
    const px = -v.y;
    const py = v.x;
    ctx.beginPath();
    ctx.arc(feetX - v.x * (2 + i * 1.35) + px * side, feetY + .4 - v.y * (2 + i * .75) + py * side, .75 - i * .08, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawHurtAccent(ctx: Ctx, feetX: number, feetY: number, dir: DuckDir, tick: number, alpha: number): void {
  if (tick > 9) return;
  const impact = Math.max(0, 1 - tick / 10);
  const v = dashVector(dir);
  const cx = feetX - v.x * 5.2;
  const cy = feetY - 20 - v.y * 3.2;
  ctx.save();
  ctx.globalAlpha = alpha * impact * .78;
  ctx.strokeStyle = '#fff0c5';
  ctx.lineWidth = 1.25;
  ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const a = -1.05 + i * .7 + (dir === 'left' ? Math.PI : 0);
    const r0 = 5.5 + i * .55;
    const r1 = r0 + 3.2 + tick * .22;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    ctx.stroke();
  }
  ctx.globalAlpha = alpha * impact * .25;
  ctx.strokeStyle = '#e45f4f';
  ctx.lineWidth = 1.15;
  ctx.beginPath();
  ctx.arc(feetX, feetY - 15, 10 + (1 - impact) * 4, -.35 * Math.PI, .65 * Math.PI);
  ctx.stroke();
  ctx.restore();
}
'''
src = src[:insert_at] + helpers + src[insert_at:]

src = replace_once(src,
"""  const { state, tick } = resolveState(input);
  const pose = poseFor(state, tick, input.frame, input.dir);""",
"""  const { state, tick, dashRecovery } = resolveState(input);
  const pose = poseFor(state, tick, input.frame, input.dir);""",
'render state destructure')

src = replace_once(src,
"""  drawShadow(ctx, feetX, feetY, state, opacity * (state === 'dash' ? .8 : 1), pose.dy);

  if (!image || !image.complete || image.naturalWidth !== 1200 || image.naturalHeight !== 240) {""",
"""  drawShadow(ctx, feetX, feetY, state, opacity * (state === 'dash' ? .8 : 1), pose.dy);
  drawDashLanding(ctx, feetX, feetY, input.dir, dashRecovery, opacity);

  if (!image || !image.complete || image.naturalWidth !== 1200 || image.naturalHeight !== 240) {""",
'dash landing render')

src = replace_once(src,
"""  if (state === 'hurt') {
    ctx.save();
    ctx.globalAlpha = .11 * opacity;
    ctx.fillStyle = '#ff725d';
    ctx.beginPath(); ctx.ellipse(actorFeetX, actorFeetY - 15, 11, 15, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  document.documentElement.dataset.duckHeistPlayerRenderer = 'canvas2d-chibi-remastered-v10';
  document.documentElement.dataset.duckHeistPlayerFrames = '120-authored-remastered-v10';""",
"""  if (state === 'hurt') {
    drawHurtAccent(ctx, actorFeetX, actorFeetY, input.dir, tick, opacity);
  }

  document.documentElement.dataset.duckHeistPlayerRenderer = 'canvas2d-chibi-remastered-v11';
  document.documentElement.dataset.duckHeistPlayerFrames = '120-authored-remastered-v11';""",
'hurt fx and renderer marker')

PLAYER.write_text(src)

html = INDEX.read_text()
html = replace_once(html,
    '0.7.30-combat-readability-chibi',
    '0.7.31-player-polish-v11',
    'build marker')
INDEX.write_text(html)

print('v0.7.31 player polish patch applied')
