from pathlib import Path

p = Path('src/game/graphics/playerChibiRemastered.ts')
s = p.read_text()


def once(old: str, new: str, label: str) -> None:
    global s
    if old not in s:
        raise SystemExit(f'v0.7.5 patch missing: {label}')
    s = s.replace(old, new, 1)


once(
    "rt = { state: 'idle', enteredAt: input.frame, lastFrame: input.frame, wasShoot: false, wasDash: false, wasHurt: false };",
    "rt = { state: 'idle', enteredAt: input.frame, lastFrame: input.frame, lastShot: input.shotSequence, wasShoot: false, wasDash: false, wasHurt: false };",
    'runtime init shot sequence',
)
once(
    "const shotChanged = input.shotSequence !== undefined && input.shotSequence !== rt.lastShot;",
    "const shotChanged = input.shotSequence !== undefined && rt.lastShot !== undefined && input.shotSequence !== rt.lastShot;",
    'shot changed guard',
)
once(
    "const shootStart = wanted === 'shoot' && (shotChanged || (input.shooting && !rt.wasShoot));",
    "const shootStart = !input.dead && !input.hurt && !input.dashing && (shotChanged || (wanted === 'shoot' && input.shooting && !rt.wasShoot));",
    'persistent shoot start',
)
once(
    """  if (shootStart || dashStart || hurtStart || (wanted === 'down' && rt.state !== 'down')) {
    rt.state = wanted;
    rt.enteredAt = input.frame;
  } else if (rt.state === 'shoot' && input.frame - rt.enteredAt < 14) {""",
    """  if (wanted === 'down' && rt.state !== 'down') {
    rt.state = 'down';
    rt.enteredAt = input.frame;
  } else if (hurtStart) {
    rt.state = 'hurt';
    rt.enteredAt = input.frame;
  } else if (dashStart) {
    rt.state = 'dash';
    rt.enteredAt = input.frame;
  } else if (shootStart) {
    rt.state = 'shoot';
    rt.enteredAt = input.frame;
  } else if (rt.state === 'shoot' && input.frame - rt.enteredAt < 14) {""",
    'state priority block',
)
once(
    """    return {
      authored: 'walk', index: i,
      scaleX: 1 + compression * (vertical ? .026 : .014),
      scaleY: 1 - compression * (vertical ? .022 : .014),
      rotation: vertical ? sway * .018 : sideLean + sway * .008,
      dx: sway * (vertical ? .95 : .38),
      dy: -Math.abs(sway) * (vertical ? 1.6 : 1.05),
    };""",
    """    return {
      authored: 'walk', index: i,
      scaleX: 1 + compression * (vertical ? .045 : .014),
      scaleY: 1 - compression * (vertical ? .038 : .014),
      rotation: vertical ? sway * .038 : sideLean + sway * .008,
      dx: sway * (vertical ? 1.55 : .38),
      dy: -Math.abs(sway) * (vertical ? 2.45 : 1.05) + (vertical ? compression * .22 : 0),
    };""",
    'vertical stride amplitude',
)
once(
    "document.documentElement.dataset.duckHeistPlayerRenderer = 'canvas2d-chibi-remastered-v3';",
    "document.documentElement.dataset.duckHeistPlayerRenderer = 'canvas2d-chibi-remastered-v4';",
    'renderer marker',
)

p.write_text(s)
print('v0.7.5 player patch applied')
