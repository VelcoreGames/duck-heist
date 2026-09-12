import fs from 'node:fs';

const previewPath = 'src/game/graphics/playerChibiPreview.ts';
let preview = fs.readFileSync(previewPath, 'utf8');
const oldRect = "function rect(ctx: Ctx, x: number, y: number, w: number, h: number, color: string): void {";
const newRect = "function rect(ctx: Ctx, x: number, y: number, w: number, h: number, color: string, _pixel = 1): void {";
if (preview.includes(oldRect)) preview = preview.replace(oldRect, newRect);
fs.writeFileSync(previewPath, preview);

const path = 'src/game/render.ts';
let source = fs.readFileSync(path, 'utf8');

const importAnchor = "import { drawRichTile, drawRoomAtmosphere, drawInnerWallShadow } from './roomArt';";
const importLine = "import { drawChibiPlayerPreview } from './graphics/playerChibiPreview';";
if (!source.includes(importLine)) {
  if (!source.includes(importAnchor)) throw new Error('render.ts import anchor not found');
  source = source.replace(importAnchor, `${importAnchor}\n${importLine}`);
}

const legacyPlayer = `  if (p.hp > 0) {\n    drawDuckSkin(ctx, p.x, p.y, f, engine.equippedSkin, p.dir, p.moving,\n      p.hurtTimer > 0, p.dashTimer > 0, p.shootFlash > 0);`;
const chibiPlayer = `  if (p.hp > 0) {\n    drawChibiPlayerPreview({\n      ctx, x: p.x, y: p.y, frame: f, dir: p.dir, moving: p.moving,\n      hurt: p.hurtTimer > 0, dashing: p.dashTimer > 0, shooting: p.shootFlash > 0,\n      skinId: engine.equippedSkin,\n    });`;

if (!source.includes('drawChibiPlayerPreview({')) {
  if (!source.includes(legacyPlayer)) throw new Error('legacy player render block not found');
  source = source.replace(legacyPlayer, chibiPlayer);
}

fs.writeFileSync(path, source);
console.log('Chibi protagonist integrated into src/game/render.ts');
