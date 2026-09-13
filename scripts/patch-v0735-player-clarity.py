from pathlib import Path

player = Path('src/game/graphics/playerChibiRemastered.ts')
s = player.read_text()

def rep(old: str, new: str) -> None:
    global s
    if old not in s:
        raise SystemExit(f'missing expected block:\n{old[:220]}')
    s = s.replace(old, new, 1)

# Faster, more readable authored gait and much clearer vertical body motion.
rep('''    const strideDistance = 36;\n''', '''    const strideDistance = 30;\n''')
rep('''      scaleX: vertical ? 1 + plant * .012 : 1 + plant * .016,\n      scaleY: vertical ? 1 - plant * .014 : 1 - plant * .018,\n      rotation: vertical ? stride * .018 : sideLean + stride * .024,\n      dx: vertical ? stride * .55 : stride * .72,\n      dy: vertical ? -lift * 1.45 + plant * .12 : -lift * 1.62 + plant * .13,\n''', '''      scaleX: vertical ? 1 + plant * .022 : 1 + plant * .018,\n      scaleY: vertical ? 1 - plant * .028 : 1 - plant * .020,\n      rotation: vertical ? stride * .030 : sideLean + stride * .026,\n      dx: vertical ? stride * .82 : stride * .76,\n      dy: vertical ? -lift * 2.15 + plant * .24 : -lift * 1.72 + plant * .16,\n''')

# Stronger authored recoil without turning the duck into rubber.
rep('''    const kick = 4.75 * (tick <= 4 ? attack : Math.pow(recoverT, 1.6));\n''', '''    const kick = 5.45 * (tick <= 4 ? attack : Math.pow(recoverT, 1.55));\n''')
rep('''    const recoilPeak = tick >= 2 && tick <= 7;\n''', '''    const recoilPeak = tick >= 2 && tick <= 8;\n''')
rep('''      scaleX: recoilPeak ? (horizontal ? 1.042 : 1.028) : 1,\n      scaleY: recoilPeak ? .958 : 1,\n      rotation: dir === 'left' ? -.028 * (kick / 4.75) : dir === 'right' ? .028 * (kick / 4.75) : 0,\n''', '''      scaleX: recoilPeak ? (horizontal ? 1.052 : 1.034) : 1,\n      scaleY: recoilPeak ? .948 : 1,\n      rotation: dir === 'left' ? -.034 * (kick / 5.45) : dir === 'right' ? .034 * (kick / 5.45) : 0,\n''')

# Ground contact accents: stronger enough to read on the cream marble, still subtle.
rep("""  ctx.globalAlpha = .13 * alpha;\n""", """  ctx.globalAlpha = .20 * alpha;\n""")
rep("""  ctx.globalAlpha = .085 * alpha;\n""", """  ctx.globalAlpha = .12 * alpha;\n""")

# Make muzzle feedback survive low/high refresh-rate timing differences.
rep("""    if (tick <= 10) drawMuzzle(ctx, input.dir, actorFeetX, actorFeetY, opacity * Math.max(.52, 1 - tick * .06), tick, pose.rotation);\n""", """    if (tick <= 12) drawMuzzle(ctx, input.dir, actorFeetX, actorFeetY, opacity * Math.max(.46, 1 - tick * .052), tick, pose.rotation);\n""")

# Versioned runtime marker for live verification.
rep("""  document.documentElement.dataset.duckHeistPlayerRenderer = 'canvas2d-chibi-remastered-v14';\n  document.documentElement.dataset.duckHeistPlayerFrames = '120-authored-remastered-v14';\n""", """  document.documentElement.dataset.duckHeistPlayerRenderer = 'canvas2d-chibi-remastered-v15';\n  document.documentElement.dataset.duckHeistPlayerFrames = '120-authored-remastered-v15';\n""")

player.write_text(s)

index = Path('index.html')
h = index.read_text()
marker = '<meta name="duck-heist-build" content="0.7.35-player-clarity" />'
import re
h2, n = re.subn(r'<meta name="duck-heist-build" content="[^"]+" />', marker, h, count=1)
if n != 1:
    raise SystemExit('missing duck-heist-build meta marker')
index.write_text(h2)
