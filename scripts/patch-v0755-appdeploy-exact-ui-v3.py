from pathlib import Path
import runpy

# Start from the already validated exact-layout restoration.
runpy.run_path('scripts/patch-v0755-appdeploy-exact-ui.py', run_name='__main__')


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 anchor, found {count}')
    return text.replace(old, new, 1)

# -----------------------------------------------------------------------------
# Add the narrower heading style seen in the exact archived AppDeploy captures.
# Keep titleText/Bungee available for places that intentionally use the newer
# display face, but route legacy navigation screens through Chakra Petch.
# -----------------------------------------------------------------------------
p = Path('src/game/ui.ts')
s = p.read_text()
anchor = '''export function wrappedText(ctx:Ctx,str:string,x:number,y:number,width:number,size=8,lineHeight=11,maxLines=2,color='#c3cbd9',strong=false) {'''
helper = '''/** Título estrecho usado por la interfaz AppDeploy archivada. */
export function legacyTitleText(
  ctx: Ctx, str: string, x: number, y: number,
  size = 16, color = '#f4d03f', align: CanvasTextAlign = 'center', weight = 500,
) {
  ctx.save();
  ctx.font = `${weight} ${size}px ${FONT_UI}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.imageSmoothingEnabled = true;
  ctx.fillStyle = 'rgba(0,0,0,0.9)';
  ctx.fillText(str, x + 1, y + 1);
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
  ctx.restore();
}

'''
s = replace_once(s, anchor, helper + anchor, 'legacy title helper')
p.write_text(s)

# -----------------------------------------------------------------------------
# Use legacy typography on the screens proven by the archived screenshots.
# Main-menu logo stays untouched because drawTitleLogo already matches closely.
# -----------------------------------------------------------------------------
p = Path('src/game/render.ts')
s = p.read_text()
s = replace_once(
    s,
    "import { text, titleText, drawPanel, drawButtons, drawMenuScene, drawTitleLogo, drawBar, drawPremiumBackdrop, drawPremiumPanel, drawPremiumButton, drawPremiumMeter } from './ui';",
    "import { text, titleText, legacyTitleText, drawPanel, drawButtons, drawMenuScene, drawTitleLogo, drawBar, drawPremiumBackdrop, drawPremiumPanel, drawPremiumButton, drawPremiumMeter } from './ui';",
    'render ui import',
)
# exact-layout base later removes premium imports. Normalize the resulting import.
s = s.replace('drawBar, drawPremiumPanel', 'drawBar, drawPremiumPanel')

repls = [
    ("titleText(ctx, T.howToTitle, CANVAS_WIDTH / 2, 40, 18, '#f4d03f');", "legacyTitleText(ctx, T.howToTitle, CANVAS_WIDTH / 2, 40, 18, '#f4d03f');", 'how-to heading'),
    ("titleText(ctx, T.settingsTitle, CANVAS_WIDTH / 2, 52, 18, '#f4d03f');", "legacyTitleText(ctx, T.settingsTitle, CANVAS_WIDTH / 2, 52, 18, '#f4d03f');", 'settings heading'),
    ("titleText(ctx, T.wardrobeTitle, CANVAS_WIDTH / 2, 34, 18, '#f4d03f');", "legacyTitleText(ctx, T.wardrobeTitle, CANVAS_WIDTH / 2, 34, 18, '#f4d03f');", 'wardrobe heading'),
    ("titleText(ctx, T.upgradesTitle, CANVAS_WIDTH / 2, 40, 17, '#f4d03f');", "legacyTitleText(ctx, T.upgradesTitle, CANVAS_WIDTH / 2, 40, 17, '#f4d03f');", 'upgrades heading'),
    ("titleText(ctx, T.paused, CANVAS_WIDTH / 2, 48, 24, '#f4d03f');", "legacyTitleText(ctx, T.paused, CANVAS_WIDTH / 2, 48, 24, '#f4d03f');", 'pause heading'),
]
for old,new,label in repls:
    s = replace_once(s, old, new, label)

old_upgrade = "titleText(ctx, up.name, 50, y + 4, 13, maxed ? '#39d353' : sel ? '#fff6c9' : '#c3cbd9', 'left');"
new_upgrade = "legacyTitleText(ctx, up.name, 50, y + 4, 13, maxed ? '#39d353' : sel ? '#fff6c9' : '#c3cbd9', 'left', sel ? 600 : 500);"
s = replace_once(s, old_upgrade, new_upgrade, 'upgrade names')
p.write_text(s)

# -----------------------------------------------------------------------------
# Collection is in its own renderer; only its archived screen heading changes.
# -----------------------------------------------------------------------------
p = Path('src/game/collectionUI.ts')
s = p.read_text()
s = replace_once(
    s,
    "import { text, titleText, drawPanel, wrappedText } from './ui';",
    "import { text, legacyTitleText, drawPanel, wrappedText } from './ui';",
    'collection ui import',
)
s = replace_once(
    s,
    "titleText(c,'COLECCIÓN',34,40,19,'#f2d68c','left');",
    "legacyTitleText(c,'COLECCIÓN',34,40,19,'#f2d68c','left');",
    'collection heading',
)
p.write_text(s)
