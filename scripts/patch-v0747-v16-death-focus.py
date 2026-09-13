from pathlib import Path


def replace_once(path: Path, old: str, new: str) -> None:
    text = path.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one match, found {count}: {old[:160]!r}')
    path.write_text(text.replace(old, new, 1))

ATLAS = Path('src/game/graphics/playerChibiAtlasV16.ts')
RENDER = Path('src/game/render.ts')
INDEX = Path('index.html')

# Add a subtle local focus behind the down pose. This is render-only: no
# collision, timing, movement, HP, input or hitbox values are touched.
replace_once(
    ATLAS,
    """function drawDownFx(ctx: Ctx, feetX: number, feetY: number, tick: number, alpha: number): void {
""",
    """function drawDownFocus(ctx: Ctx, feetX: number, feetY: number, tick: number, alpha: number): void {
  const t = Math.max(0, Math.min(1, tick / 34));
  const fade = 1 - Math.max(0, (t - .78) / .22);
  const strength = alpha * (.92 + Math.sin(Math.min(1, t * 1.4) * Math.PI) * .08) * fade;
  if (strength <= .01) return;
  ctx.save();
  const g = ctx.createRadialGradient(feetX, feetY - 10, 3, feetX, feetY - 10, 31);
  g.addColorStop(0, `rgba(10,7,7,${.20 * strength})`);
  g.addColorStop(.58, `rgba(10,7,7,${.12 * strength})`);
  g.addColorStop(1, 'rgba(10,7,7,0)');
  ctx.fillStyle = g;
  ctx.fillRect(feetX - 34, feetY - 44, 68, 50);

  // A restrained warm contact glow separates the yellow body from nearby
  // enemies without reading as a magical shield or changing scene lighting.
  ctx.globalAlpha = .11 * strength;
  ctx.fillStyle = '#f6d789';
  ctx.beginPath(); ctx.ellipse(feetX, feetY + .8, 14.5, 3.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawDownFx(ctx: Ctx, feetX: number, feetY: number, tick: number, alpha: number): void {
""",
)

replace_once(
    ATLAS,
    """  if (state === 'down') drawDownFx(ctx, feetX, feetY, tick, alpha);
  drawFrame(ctx, image, input.dir, state, index, feetX, feetY, alpha, pose);
""",
    """  if (state === 'down') {
    drawDownFocus(ctx, feetX, feetY, tick, alpha);
    drawDownFx(ctx, feetX, feetY, tick, alpha);
  }
  drawFrame(ctx, image, input.dir, state, index, feetX, feetY, alpha, pose);
""",
)
replace_once(ATLAS, "document.documentElement.dataset.duckHeistPlayerFx = 'v16.7-impact-fx';", "document.documentElement.dataset.duckHeistPlayerFx = 'v16.8-death-focus';")

# The normal low-HP/red damage washes help during combat but compete with the
# authored death pose. Suppress them only once HP has reached zero.
replace_once(RENDER, """  if (p.flash > 0) {
""", """  if (p.flash > 0 && p.hp > 0) {
""")
replace_once(RENDER, """  if(p.hp<=1) {
""", """  if(p.hp>0 && p.hp<=1) {
""")

replace_once(INDEX, '0.7.46-chibi-v16-death-presentation', '0.7.47-chibi-v16-death-focus-candidate')
print('patched v0.7.47 death-focus candidate; render-only, gameplay/hitboxes unchanged')
