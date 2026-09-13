from pathlib import Path
import re

render = Path('src/game/render.ts')
s = render.read_text()

def rep(old: str, new: str) -> None:
    global s
    if old not in s:
        raise SystemExit(f'missing expected render block:\n{old[:220]}')
    s = s.replace(old, new, 1)

rep(
"import { drawChibiPlayerRemastered } from './graphics/playerChibiRemastered';\n",
"import { drawChibiPlayerRemastered } from './graphics/playerChibiRemastered';\nimport { drawPlayerVisualLab, isPlayerVisualLab } from './graphics/playerVisualLab';\n",
)
rep(
"""export function renderWorld(engine: GameEngine) {\n  const ctx = engine.ctx;\n  const s = engine.state;\n""",
"""export function renderWorld(engine: GameEngine) {\n  const ctx = engine.ctx;\n  if (isPlayerVisualLab()) {\n    drawPlayerVisualLab(ctx, engine.frame);\n    return;\n  }\n  const s = engine.state;\n""",
)
rep(
"""export function renderUI(engine: GameEngine) {\n  const ctx = engine.ui;\n  if (!ctx) return;\n""",
"""export function renderUI(engine: GameEngine) {\n  const ctx = engine.ui;\n  if (!ctx) return;\n  if (isPlayerVisualLab()) {\n    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);\n    return;\n  }\n""",
)
render.write_text(s)

index = Path('index.html')
h = index.read_text()
h2, n = re.subn(r'<meta name="duck-heist-build" content="[^"]+" />', '<meta name="duck-heist-build" content="0.7.36-player-lab" />', h, count=1)
if n != 1:
    raise SystemExit('missing build marker')
index.write_text(h2)
