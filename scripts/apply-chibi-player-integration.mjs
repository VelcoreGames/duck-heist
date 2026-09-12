import fs from 'node:fs';

const previewPath = 'src/game/graphics/playerChibiPreview.ts';
let preview = fs.readFileSync(previewPath, 'utf8');

const oldRect = "function rect(ctx: Ctx, x: number, y: number, w: number, h: number, color: string): void {";
const newRect = "function rect(ctx: Ctx, x: number, y: number, w: number, h: number, color: string, _pixel = 1): void {";
if (preview.includes(oldRect)) preview = preview.replace(oldRect, newRect);

if (!preview.includes('runtimeKey?: object;')) {
  preview = preview.replace(
    `  skinId?: string;\n  alpha?: number;\n}`,
    `  skinId?: string;\n  alpha?: number;\n  runtimeKey?: object;\n  shotSequence?: number;\n}`,
  );
}

const oldStateBlock = `function stateFrom(input: ChibiPlayerDrawInput): CharacterState {\n  if (input.dead) return 'down';\n  if (input.hurt) return 'hurt';\n  if (input.dashing) return 'dash';\n  if (input.shooting) return 'shoot';\n  if (input.moving) return 'walk';\n  return 'idle';\n}\n`;

const newStateBlock = `interface PlayerVisualRuntime {\n  state: CharacterState;\n  enteredAt: number;\n  lockUntil: number;\n  lastFrame: number;\n  lastShooting: boolean;\n  lastDashing: boolean;\n  lastHurt: boolean;\n  lastShotSequence?: number;\n}\n\nconst fallbackRuntimeKey = {};\nconst runtimeByKey = new WeakMap<object, PlayerVisualRuntime>();\n\nfunction desiredState(input: ChibiPlayerDrawInput): CharacterState {\n  if (input.dead) return 'down';\n  if (input.hurt) return 'hurt';\n  if (input.dashing) return 'dash';\n  if (input.shooting) return 'shoot';\n  if (input.moving) return 'walk';\n  return 'idle';\n}\n\nfunction statePriority(state: CharacterState): number {\n  switch (state) {\n    case 'down': return 100;\n    case 'hurt': return 90;\n    case 'dash': return 80;\n    case 'shoot': return 70;\n    case 'interact': return 60;\n    case 'celebrate': return 50;\n    case 'walk': return 20;\n    default: return 10;\n  }\n}\n\nfunction stateVisualDuration(state: CharacterState): number {\n  const spec = CHIBI_PLAYER_PLAN[state];\n  if (!spec) return 0;\n  if (state === 'down') return Number.POSITIVE_INFINITY;\n  return spec.frames * Math.max(1, spec.frameDuration);\n}\n\nfunction freshRuntime(frame: number): PlayerVisualRuntime {\n  return {\n    state: 'idle', enteredAt: frame, lockUntil: frame, lastFrame: frame,\n    lastShooting: false, lastDashing: false, lastHurt: false,\n  };\n}\n\nfunction resolveVisualState(input: ChibiPlayerDrawInput): { state: CharacterState; stateTick: number } {\n  const key = input.runtimeKey ?? fallbackRuntimeKey;\n  let runtime = runtimeByKey.get(key);\n  if (!runtime || input.frame < runtime.lastFrame) {\n    runtime = freshRuntime(input.frame);\n    runtimeByKey.set(key, runtime);\n  }\n\n  const desired = desiredState(input);\n  const shotChanged = input.shotSequence !== undefined &&\n    input.shotSequence !== runtime.lastShotSequence;\n  const edgeRetrigger =\n    (desired === 'shoot' && (shotChanged || (input.shooting && !runtime.lastShooting))) ||\n    (desired === 'dash' && input.dashing && !runtime.lastDashing) ||\n    (desired === 'hurt' && input.hurt && !runtime.lastHurt);\n\n  const higherPriority = statePriority(desired) > statePriority(runtime.state);\n  const lockExpired = input.frame >= runtime.lockUntil;\n  const canEnter = desired !== runtime.state && (higherPriority || lockExpired);\n  const canRetrigger = edgeRetrigger && statePriority(desired) >= statePriority(runtime.state);\n\n  if (canEnter || canRetrigger) {\n    runtime.state = desired;\n    runtime.enteredAt = input.frame;\n    const duration = stateVisualDuration(desired);\n    runtime.lockUntil = Number.isFinite(duration) ? input.frame + duration : Number.POSITIVE_INFINITY;\n  } else if ((runtime.state === 'idle' || runtime.state === 'walk') && desired !== runtime.state) {\n    runtime.state = desired;\n    runtime.enteredAt = input.frame;\n    const duration = stateVisualDuration(desired);\n    runtime.lockUntil = Number.isFinite(duration) ? input.frame + duration : Number.POSITIVE_INFINITY;\n  }\n\n  runtime.lastFrame = input.frame;\n  runtime.lastShooting = input.shooting;\n  runtime.lastDashing = input.dashing;\n  runtime.lastHurt = input.hurt;\n  runtime.lastShotSequence = input.shotSequence;\n\n  return { state: runtime.state, stateTick: Math.max(0, input.frame - runtime.enteredAt) };\n}\n`;

if (preview.includes(oldStateBlock)) preview = preview.replace(oldStateBlock, newStateBlock);

const oldVisualFrame = `function visualFrame(state: CharacterState, tick: number): number {\n  const count = frameCount(state);\n  const duration = Math.max(1, frameDuration(state));\n  if (state === 'down') return Math.min(count - 1, Math.floor(tick / duration));\n  return Math.floor(tick / duration) % count;\n}`;
const newVisualFrame = `function visualFrame(state: CharacterState, tick: number): number {\n  const count = frameCount(state);\n  const duration = Math.max(1, frameDuration(state));\n  const raw = Math.floor(Math.max(0, tick) / duration);\n  const loop = CHIBI_PLAYER_PLAN[state]?.loop ?? true;\n  return loop ? raw % count : Math.min(count - 1, raw);\n}`;
if (preview.includes(oldVisualFrame)) preview = preview.replace(oldVisualFrame, newVisualFrame);

const oldResolve = `  const state = stateFrom(input);\n  const index = visualFrame(state, input.frame);`;
const newResolve = `  const resolved = resolveVisualState(input);\n  const state = resolved.state;\n  const index = visualFrame(state, resolved.stateTick);`;
if (preview.includes(oldResolve)) preview = preview.replace(oldResolve, newResolve);

fs.writeFileSync(previewPath, preview);

const path = 'src/game/render.ts';
let source = fs.readFileSync(path, 'utf8');

const importAnchor = "import { drawRichTile, drawRoomAtmosphere, drawInnerWallShadow } from './roomArt';";
const importLine = "import { drawChibiPlayerPreview } from './graphics/playerChibiPreview';";
const enemyImportLine = "import { drawChibiPoliceDuck } from './graphics/enemyChibi';";
if (!source.includes(importLine)) {
  if (!source.includes(importAnchor)) throw new Error('render.ts import anchor not found');
  source = source.replace(importAnchor, `${importAnchor}\n${importLine}`);
}
if (!source.includes(enemyImportLine)) {
  if (!source.includes(importLine)) throw new Error('player chibi import anchor not found');
  source = source.replace(importLine, `${importLine}\n${enemyImportLine}`);
}

const legacyPlayer = `  if (p.hp > 0) {\n    drawDuckSkin(ctx, p.x, p.y, f, engine.equippedSkin, p.dir, p.moving,\n      p.hurtTimer > 0, p.dashTimer > 0, p.shootFlash > 0);`;
const chibiPlayer = `  if (p.hp > 0) {\n    drawChibiPlayerPreview({\n      ctx, x: p.x, y: p.y, frame: f, dir: p.dir, moving: p.moving,\n      hurt: p.hurtTimer > 0, dashing: p.dashTimer > 0, shooting: p.shootFlash > 0,\n      skinId: engine.equippedSkin, runtimeKey: p, shotSequence: p.shotCounter,\n      alpha: p.iFrames > 0 && p.dashTimer <= 0 && Math.floor(f * 0.35) % 2 === 0 ? 0.42 : 1,\n    });`;

if (!source.includes('drawChibiPlayerPreview({')) {
  if (!source.includes(legacyPlayer)) throw new Error('legacy player render block not found');
  source = source.replace(legacyPlayer, chibiPlayer);
} else {
  source = source.replace(
    `      skinId: engine.equippedSkin,\n    });`,
    `      skinId: engine.equippedSkin, runtimeKey: p, shotSequence: p.shotCounter,\n      alpha: p.iFrames > 0 && p.dashTimer <= 0 && Math.floor(f * 0.35) % 2 === 0 ? 0.42 : 1,\n    });`,
  );
}

const oldIframeFlash = `    if (p.iFrames > 0 && p.dashTimer <= 0 && Math.floor(f * 0.35) % 2 === 0) {\n      ctx.globalAlpha = 0.2;\n      ctx.fillStyle = '#fff';\n      ctx.fillRect(p.x + 2, p.y + 2, 12, 14);\n      ctx.globalAlpha = 1;\n    }\n`;
if (source.includes(oldIframeFlash)) source = source.replace(oldIframeFlash, '');

const oldPoliceCase = `      case 'policia_pato': drawPoliciaPato(ctx, e.x, e.y, f, hurt, dirX); break;`;
const newPoliceCase = `      case 'policia_pato':\n        drawChibiPoliceDuck({\n          ctx, x: e.x, y: e.y, size: e.size, frame: f + e.id * 7, dirX,\n          moving: Math.abs(e.vx) + Math.abs(e.vy) > 0.08, hurt, elite: e.elite,\n        });\n        break;`;
if (source.includes(oldPoliceCase)) source = source.replace(oldPoliceCase, newPoliceCase);

const oldEnemyShadow = `  // sombra más marcada\n  ctx.fillStyle = 'rgba(0,0,0,0.3)';\n  ctx.fillRect(e.x + 2, e.y + e.size - 2, e.size - 4, 3);`;
const newEnemyShadow = `  // sombra legacy sólo para entidades que aún no usan renderer chibi propio\n  if (e.type !== 'policia_pato') {\n    ctx.fillStyle = 'rgba(0,0,0,0.3)';\n    ctx.fillRect(e.x + 2, e.y + e.size - 2, e.size - 4, 3);\n  }`;
if (source.includes(oldEnemyShadow)) source = source.replace(oldEnemyShadow, newEnemyShadow);

const oldHurtFlash = `  if (hurt) {\n    ctx.globalAlpha = 0.35;\n    ctx.fillStyle = '#ffffff';\n    ctx.fillRect(e.x + 2, e.y + 2, e.size - 4, e.size - 2);\n    ctx.globalAlpha = 1;\n  }`;
const newHurtFlash = `  if (hurt && e.type !== 'policia_pato') {\n    ctx.globalAlpha = 0.35;\n    ctx.fillStyle = '#ffffff';\n    ctx.fillRect(e.x + 2, e.y + 2, e.size - 4, e.size - 2);\n    ctx.globalAlpha = 1;\n  }`;
if (source.includes(oldHurtFlash)) source = source.replace(oldHurtFlash, newHurtFlash);

fs.writeFileSync(path, source);
console.log('Chibi protagonist and base police duck integrated into src/game/render.ts');
