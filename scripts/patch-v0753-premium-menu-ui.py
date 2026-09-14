from pathlib import Path


def replace_once(path: Path, old: str, new: str) -> None:
    text = path.read_text()
    if text.count(old) != 1:
        raise SystemExit(f'{path}: expected one match for {old[:120]!r}, found {text.count(old)}')
    path.write_text(text.replace(old, new, 1))


def replace_between(path: Path, start: str, end: str, new_block: str) -> None:
    text = path.read_text()
    a = text.find(start)
    if a < 0:
        raise SystemExit(f'{path}: start marker not found: {start!r}')
    b = text.find(end, a)
    if b < 0:
        raise SystemExit(f'{path}: end marker not found: {end!r}')
    path.write_text(text[:a] + new_block.rstrip() + '\n\n' + text[b:])

UI = Path('src/game/ui.ts')
RENDER = Path('src/game/render.ts')
INDEX = Path('index.html')

# Add a premium front-end design system without changing the existing HUD helpers.
ui = UI.read_text()
marker = "// ---------------------------------------------------------------------------\n// ESCENA DEL MENÚ PRINCIPAL (se dibuja en la capa de mundo pixelada)\n// ---------------------------------------------------------------------------"
if marker not in ui:
    raise SystemExit('ui.ts premium insertion marker missing')
premium = r'''// ---------------------------------------------------------------------------
// FRONT-END PREMIUM · Menús y pantallas de navegación
// Mantiene separados los componentes del HUD para no alterar gameplay.
// ---------------------------------------------------------------------------
export function drawPremiumBackdrop(ctx: Ctx, frame: number, strength = .78) {
  ctx.save();
  const g = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  g.addColorStop(0, `rgba(4,16,22,${strength})`);
  g.addColorStop(.52, `rgba(6,20,26,${strength * .96})`);
  g.addColorStop(1, `rgba(3,10,16,${Math.min(.96, strength + .12)})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const glow = ctx.createRadialGradient(365, 82, 8, 365, 82, 210);
  glow.addColorStop(0, `rgba(222,184,92,${.14 + Math.sin(frame * .025) * .025})`);
  glow.addColorStop(.5, 'rgba(44,121,117,.07)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(150, 0, 330, 280);

  ctx.globalAlpha = .09;
  ctx.fillStyle = '#d8b55b';
  for (let x = -40 + (frame * .12) % 48; x < CANVAS_WIDTH + 40; x += 48) ctx.fillRect(x, 0, 1, CANVAS_HEIGHT);
  ctx.globalAlpha = .045;
  ctx.fillStyle = '#9ed3ca';
  for (let y = 18; y < CANVAS_HEIGHT; y += 32) ctx.fillRect(0, y, CANVAS_WIDTH, 1);
  ctx.restore();
}

export function drawPremiumPanel(
  ctx: Ctx, x: number, y: number, w: number, h: number,
  active = false, accent = '#d8b55b', fill = 'rgba(9,28,33,.94)', radius = 10,
) {
  ctx.save();
  ctx.shadowColor = active ? 'rgba(216,181,91,.28)' : 'rgba(0,0,0,.42)';
  ctx.shadowBlur = active ? 16 : 10;
  ctx.shadowOffsetY = active ? 2 : 5;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, radius); ctx.fillStyle = fill; ctx.fill();
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, active ? 'rgba(255,244,194,.105)' : 'rgba(255,255,255,.045)');
  g.addColorStop(.55, 'rgba(65,130,125,.025)');
  g.addColorStop(1, 'rgba(0,0,0,.18)');
  ctx.beginPath(); ctx.roundRect(x, y, w, h, radius); ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = active ? accent : 'rgba(133,177,170,.24)';
  ctx.lineWidth = active ? 1.35 : 1;
  ctx.beginPath(); ctx.roundRect(x + .5, y + .5, w - 1, h - 1, radius - .5); ctx.stroke();
  ctx.strokeStyle = active ? 'rgba(255,242,190,.36)' : 'rgba(255,255,255,.055)';
  ctx.beginPath(); ctx.moveTo(x + radius, y + 2); ctx.lineTo(x + w - radius, y + 2); ctx.stroke();
  ctx.fillStyle = active ? accent : 'rgba(126,177,169,.38)';
  ctx.beginPath(); ctx.roundRect(x + 4, y + 5, 3, h - 10, 2); ctx.fill();
  ctx.restore();
}

export function drawPremiumButton(
  ctx: Ctx, label: string, x: number, y: number, w: number, h: number,
  selected: boolean, frame: number, index?: number, hint?: string,
) {
  drawPremiumPanel(ctx, x, y, w, h, selected, selected ? '#e1bd63' : '#5a827e', selected ? 'rgba(28,52,50,.97)' : 'rgba(8,26,32,.91)', 7);
  if (index !== undefined) {
    const bx = x + 12, by = y + h / 2;
    ctx.save();
    ctx.fillStyle = selected ? '#e1bd63' : 'rgba(126,168,161,.17)';
    ctx.beginPath(); ctx.arc(bx, by, 7, 0, Math.PI * 2); ctx.fill();
    text(ctx, String(index).padStart(2, '0'), bx, by + 2.6, 5.4, selected ? '#102225' : '#87a7a1', 'center', true, false);
    ctx.restore();
  }
  const tx = index !== undefined ? x + 25 : x + 12;
  text(ctx, label, tx, y + h / 2 + 3.2, selected ? 8.6 : 8.1, selected ? '#fff4c9' : '#c2d3ce', 'left', true, false);
  if (hint) text(ctx, hint, x + w - 10, y + h / 2 + 3, 6, selected ? '#e7ca7a' : '#668681', 'right', true, false);
  if (selected) {
    const sweep = ((frame * .55) % Math.max(30, w - 28));
    ctx.save(); ctx.globalAlpha = .12; ctx.fillStyle = '#fff2bf';
    ctx.beginPath(); ctx.roundRect(x + 8 + sweep, y + 4, 18, h - 8, 5); ctx.fill(); ctx.restore();
  }
}

export function drawPremiumMeter(ctx: Ctx, x: number, y: number, w: number, value: number, active = false) {
  const v = Math.max(0, Math.min(1, value));
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,.34)'; ctx.beginPath(); ctx.roundRect(x, y, w, 7, 4); ctx.fill();
  ctx.fillStyle = 'rgba(130,171,165,.15)'; ctx.beginPath(); ctx.roundRect(x + 1, y + 1, w - 2, 5, 3); ctx.fill();
  const fw = Math.max(0, (w - 2) * v);
  if (fw > 0) {
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, active ? '#a47d36' : '#47766f');
    g.addColorStop(1, active ? '#f0d27a' : '#83b5aa');
    ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(x + 1, y + 1, fw, 5, 3); ctx.fill();
  }
  ctx.restore();
}
'''
if 'export function drawPremiumBackdrop' not in ui:
    UI.write_text(ui.replace(marker, premium + '\n' + marker, 1))

replace_once(
    RENDER,
    "import { text, titleText, drawPanel, drawButtons, drawMenuScene, drawTitleLogo, drawBar } from './ui';",
    "import { text, titleText, drawPanel, drawButtons, drawMenuScene, drawTitleLogo, drawBar, drawPremiumBackdrop, drawPremiumPanel, drawPremiumButton, drawPremiumMeter } from './ui';",
)

menu = r'''function renderMenuUI(engine: GameEngine) {
  const ctx = engine.ui!;
  drawPremiumBackdrop(ctx, engine.frame, .46);
  drawTitleLogo(ctx, CANVAS_WIDTH / 2, 56, engine.frame);
  text(ctx, 'OPERACIÓN · BANCO DEL PAN', 30, 101, 6.5, '#86aaa4', 'left', true, false);
  text(ctx, 'ELIGE TU SIGUIENTE MOVIMIENTO', 30, 114, 8, '#ead7a0', 'left', true, false);

  MENU_ITEMS.forEach((item, i) => {
    const x = MAIN_MENU.x, y = MAIN_MENU.y + i * (MAIN_MENU.h + MAIN_MENU.gap);
    drawPremiumButton(ctx, item.label, x, y, MAIN_MENU.w, MAIN_MENU.h, i === engine.menuIndex, engine.frame, i + 1);
  });

  drawPremiumPanel(ctx, 219, 123, 230, 157, false, '#d8b55b', 'rgba(7,23,29,.91)', 12);
  text(ctx, 'EXPEDIENTE DEL ATRACO', 237, 145, 8.4, '#ead7a0', 'left', true, false);
  text(ctx, 'ROGUELITE · 6 PISOS · UNA SALIDA', 237, 160, 6.2, '#7fa29d', 'left', true, false);
  ctx.fillStyle = 'rgba(216,181,91,.25)'; ctx.fillRect(237, 170, 194, 1);

  const stats: [string, string][] = [
    ['MIGAS DORADAS', `${engine.totalGoldenCrumbs}`],
    ['ASPECTOS', `${engine.unlockedSkins.length} / ${SKINS.length}`],
    ['PROGRESIÓN', `${TOTAL_FLOORS} PISOS`],
    ['SEGURIDAD', 'AUMENTA POR PISO'],
  ];
  stats.forEach(([k, v], i) => {
    const y = 190 + i * 20;
    text(ctx, k, 237, y, 6.2, '#75938f', 'left', true, false);
    text(ctx, v, 431, y, 7.2, i === 0 ? '#e7c86d' : '#d3e1dc', 'right', true, false);
  });
  text(ctx, 'La dificultad es progresiva: no hay un selector separado.', 237, 269, 5.7, '#6f8986', 'left', false, false);

  text(ctx, T.tagline, 240, 316, 8.2, '#dcc27d', 'center', true, false);
  text(ctx, engine.lastInput === 'gamepad' ? 'CRUCETA  NAVEGAR     A  CONFIRMAR' : 'W / S  NAVEGAR     ENTER  CONFIRMAR', 30, 343, 6, '#789590', 'left', true, false);
  drawItemIcon(ctx, 376, 332, 'golden_crumb', 13);
  text(ctx, `${engine.totalGoldenCrumbs} DORADAS`, 397, 343, 6, '#baa66f', 'left', true, false);
}'''
replace_between(RENDER, 'function renderMenuUI(engine: GameEngine) {', 'function renderHowToPlayUI(engine: GameEngine) {', menu)

howto = r'''function renderHowToPlayUI(engine: GameEngine) {
  const ctx = engine.ui!;
  drawPremiumBackdrop(ctx, engine.frame, .8);
  drawPremiumPanel(ctx, 22, 16, CANVAS_WIDTH - 44, CANVAS_HEIGHT - 34, false, '#d8b55b', 'rgba(7,22,28,.96)', 13);
  titleText(ctx, T.howToTitle, 42, 47, 17, '#f0d27a', 'left');
  text(ctx, 'MANUAL RÁPIDO DEL ATRACO', 43, 63, 6.3, '#799995', 'left', true, false);

  const gamepad = engine.lastInput === 'gamepad';
  const rows: [string, string][] = gamepad ? [
    ['PALANCA IZQ.','Moverse'],['PALANCA DER. + RT','Apuntar y disparar'],['B','Esquivar'],['A','Interactuar / recoger'],['Y','Objeto activo'],['LB / RB','Cambiar arma'],['VIEW','Abrir mapa'],['START','Pausa'],
  ] : [
    ['WASD','Moverse'],['FLECHAS / CLIC IZQ.','Disparar'],['SHIFT / CLIC DER.','Esquivar'],['E','Interactuar / recoger'],['ESPACIO','Objeto activo'],['RUEDA','Cambiar arma'],['M','Abrir mapa'],['R · MANTENER','Reiniciar'],['ESC','Pausa'],
  ];
  rows.forEach(([k, v], i) => {
    const y = 80 + i * 18;
    ctx.fillStyle = i % 2 ? 'rgba(255,255,255,.018)' : 'rgba(102,155,146,.045)';
    ctx.beginPath(); ctx.roundRect(40, y - 11, 183, 15, 5); ctx.fill();
    text(ctx, k, 50, y, 6.6, '#dfc77d', 'left', true, false);
    text(ctx, v, 215, y, 6.8, '#b8cbc6', 'right', false, false);
  });

  drawPremiumPanel(ctx, 244, 77, 190, 176, false, '#6c9c94', 'rgba(10,31,35,.72)', 9);
  text(ctx, 'REGLAS DEL GOLPE', 259, 99, 8, '#dce8e4', 'left', true, false);
  const instructions = [
    'Despeja salas para abrir las puertas.',
    'El pan recupera vida; las doradas se guardan.',
    'Lleva dos armas y combina objetos.',
    'Derrota al jefe para bajar de piso.',
    'La seguridad aumenta automáticamente por piso.',
  ];
  instructions.forEach((line, i) => {
    ctx.fillStyle = '#d8b55b'; ctx.beginPath(); ctx.arc(260, 122 + i * 25, 2.2, 0, Math.PI * 2); ctx.fill();
    wrappedText(ctx, line, 270, 125 + i * 25, 150, 6.7, 8.5, 2, '#9fb6b1');
  });

  text(ctx, gamepad ? 'B · VOLVER' : 'ESC · VOLVER', 240, 323, 8.3, '#e5cb7d', 'center', true, false);
}'''
replace_between(RENDER, 'function renderHowToPlayUI(engine: GameEngine) {', 'function renderSettingsUI(engine: GameEngine) {', howto)

settings = r'''function renderSettingsUI(engine: GameEngine) {
  const ctx = engine.ui!;
  drawPremiumBackdrop(ctx, engine.frame, .82);
  drawPremiumPanel(ctx, 34, 17, CANVAS_WIDTH - 68, CANVAS_HEIGHT - 34, false, '#d8b55b', 'rgba(7,22,28,.97)', 13);
  titleText(ctx, T.settingsTitle, 54, 47, 17, '#f0d27a', 'left');
  text(ctx, 'AUDIO · VIDEO · ACCESIBILIDAD', 55, 62, 6.1, '#789995', 'left', true, false);

  SETTING_ROWS.forEach((row, i) => {
    const y = SETTINGS.y + i * (SETTINGS.h + SETTINGS.gap);
    const on = i === engine.settingsIndex;
    ctx.save();
    ctx.fillStyle = on ? 'rgba(44,72,68,.82)' : 'rgba(255,255,255,.025)';
    ctx.beginPath(); ctx.roundRect(SETTINGS.x, y, SETTINGS.w, SETTINGS.h, 6); ctx.fill();
    ctx.strokeStyle = on ? '#d8b55b' : 'rgba(119,165,158,.12)';
    ctx.lineWidth = on ? 1.2 : 1;
    ctx.beginPath(); ctx.roundRect(SETTINGS.x + .5, y + .5, SETTINGS.w - 1, SETTINGS.h - 1, 5.5); ctx.stroke();
    if (on) { ctx.fillStyle = '#d8b55b'; ctx.beginPath(); ctx.roundRect(SETTINGS.x + 4, y + 4, 3, SETTINGS.h - 8, 2); ctx.fill(); }
    ctx.restore();

    text(ctx, row.label, SETTINGS.x + 14, y + 13, 7.3, on ? '#fff2c1' : '#adbfba', 'left', on, false);
    const v = settingValue(engine, i);
    if (row.kind === 'vol' || row.kind === 'shake' || row.kind === 'scale' || row.kind === 'brightness') {
      const max = row.kind === 'vol' ? 1 : row.kind === 'shake' ? 2 : row.kind === 'brightness' ? 1.4 : 3;
      drawPremiumMeter(ctx, 315, y + 6.5, 64, v / max, on);
      const display = row.kind === 'vol' ? `${Math.round(v * 100)}%` : `${v}`;
      text(ctx, display, 407, y + 13, 7.4, on ? '#f0d27a' : '#829e99', 'right', true, false);
    } else {
      const label = row.kind === 'action' ? 'PROBAR' : v > .5 ? T.on : T.off;
      text(ctx, label, 407, y + 13, 7.2, v > .5 || row.kind === 'action' ? '#7fd3a2' : '#8fa19d', 'right', true, false);
    }
  });

  text(ctx, engine.lastInput === 'gamepad' ? 'CRUCETA  AJUSTAR     A  CAMBIAR     B  VOLVER' : 'FLECHAS  AJUSTAR     ENTER  CAMBIAR     ESC  VOLVER', 240, 321, 6.3, '#87a39e', 'center', true, false);
}'''
replace_between(RENDER, 'function renderSettingsUI(engine: GameEngine) {', 'function renderWardrobeUI(engine: GameEngine) {', settings)

upgrades = r'''function renderUpgradesUI(engine: GameEngine) {
  const ctx = engine.ui!;
  drawPremiumBackdrop(ctx, engine.frame, .82);
  drawPremiumPanel(ctx, 24, 16, CANVAS_WIDTH - 48, CANVAS_HEIGHT - 32, false, '#d8b55b', 'rgba(7,22,28,.97)', 13);
  titleText(ctx, T.upgradesTitle, 44, 44, 16, '#f0d27a', 'left');
  text(ctx, 'MEJORAS PERMANENTES DEL CÓMPLICE', 45, 59, 6.1, '#799995', 'left', true, false);
  drawChibiCoinV3(ctx, 358, 32, engine.frame, true);
  text(ctx, `${engine.totalGoldenCrumbs} DORADAS`, 382, 47, 8.5, '#e9ca70', 'left', true, false);

  META_UPGRADES.forEach((up, i) => {
    const y = 78 + i * 52;
    const lvl = engine.metaLevels[up.id] ?? 0;
    const maxed = lvl >= up.maxLevel;
    const cost = up.cost * (lvl + 1);
    const sel = i === engine.upgradeIndex;
    drawPremiumPanel(ctx, 42, y, 396, 44, sel, sel ? '#d8b55b' : '#628d87', sel ? 'rgba(27,52,50,.95)' : 'rgba(11,31,35,.78)', 7);
    text(ctx, up.name, 58, y + 16, 8.5, maxed ? '#75d79d' : sel ? '#fff1bc' : '#c0d0cb', 'left', true, false);
    text(ctx, up.description, 58, y + 31, 6.4, '#839f9a', 'left', false, false);
    for (let l = 0; l < up.maxLevel; l++) {
      const cx = 326 + l * 13;
      ctx.fillStyle = l < lvl ? '#d8b55b' : 'rgba(120,160,153,.18)';
      ctx.beginPath(); ctx.arc(cx, y + 14, 4, 0, Math.PI * 2); ctx.fill();
    }
    text(ctx, maxed ? 'COMPLETA' : `${cost}`, 422, y + 29, 7.3, maxed ? '#75d79d' : engine.totalGoldenCrumbs >= cost ? '#e9ca70' : '#df766f', 'right', true, false);
  });

  text(ctx, engine.lastInput === 'gamepad' ? 'CRUCETA  ELEGIR     A  COMPRAR     B  VOLVER' : 'W / S  ELEGIR     ENTER  COMPRAR     ESC  VOLVER', 240, 319, 6.3, '#87a39e', 'center', true, false);
}'''
replace_between(RENDER, 'function renderUpgradesUI(engine: GameEngine) {', 'function renderFloorIntroUI(engine: GameEngine) {', upgrades)

floor_intro = r'''function renderFloorIntroUI(engine: GameEngine) {
  const ctx = engine.ui!;
  const t = engine.floorIntroTimer;
  const a = t > 80 ? (110 - t) / 30 : Math.min(1, t / 30);
  const alpha = clamp(a, 0, 1);
  ctx.fillStyle = `rgba(3,10,16,${.88 * alpha})`;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.globalAlpha = alpha;
  const slide = (1 - alpha) * 24;
  drawPremiumPanel(ctx, 104, 105 + slide, 272, 132, true, '#d8b55b', 'rgba(8,25,30,.95)', 12);
  text(ctx, 'NIVEL DE SEGURIDAD', 240, 132 + slide, 6.3, '#76958f', 'center', true, false);
  titleText(ctx, `${T.floor} ${engine.map.floorIndex + 1}/6`, 240, 160 + slide, 23, '#f0d27a');
  text(ctx, FLOOR_NAMES_ES[engine.map.floorIndex], 240, 184 + slide, 11, '#d7e3df', 'center', true, false);
  const level = engine.map.floorIndex + 1;
  for (let i = 0; i < TOTAL_FLOORS; i++) {
    ctx.fillStyle = i < level ? (level >= 5 ? '#df766f' : '#d8b55b') : 'rgba(113,152,145,.16)';
    ctx.beginPath(); ctx.roundRect(190 + i * 18, 202 + slide, 12, 4, 2); ctx.fill();
  }
  text(ctx, level === 1 ? 'SEGURIDAD BASE' : 'LA SEGURIDAD SE INTENSIFICA', 240, 222 + slide, 6.4, level >= 5 ? '#e58a82' : '#8ba7a2', 'center', true, false);
  ctx.globalAlpha = 1;
}'''
replace_between(RENDER, 'function renderFloorIntroUI(engine: GameEngine) {', 'function renderBossIntroUI(engine: GameEngine) {', floor_intro)

boss_intro = r'''function renderBossIntroUI(engine: GameEngine) {
  const ctx = engine.ui!;
  const t = engine.bossIntroTimer;
  ctx.fillStyle = 'rgba(5,8,13,.88)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  const a = Math.min(1, (115 - t) / 18);
  ctx.globalAlpha = clamp(a, 0, 1);
  drawPremiumPanel(ctx, 74, 112, 332, 126, true, '#d86a60', 'rgba(31,18,22,.96)', 12);
  text(ctx, '⚠  ALERTA DE SEGURIDAD  ⚠', 240, 140, 7.2, '#e17b72', 'center', true, false);
  titleText(ctx, engine.bossIntroName, 240, 174, 20, '#f0d27a');
  text(ctx, engine.bossIntroSubtitle, 240, 197, 8.4, '#c7d3cf', 'center', true, false);
  if (t < 60) text(ctx, 'ENTER · SALTAR', 240, 221, 6.2, '#7f9995', 'center', true, false);
  ctx.globalAlpha = 1;
}'''
replace_between(RENDER, 'function renderBossIntroUI(engine: GameEngine) {', 'function renderFloorClearUI(engine: GameEngine) {', boss_intro)

paused = r'''function renderPausedUI(engine: GameEngine) {
  const ctx = engine.ui!;
  drawPremiumBackdrop(ctx, engine.frame, .88);
  drawPremiumPanel(ctx, 26, 16, CANVAS_WIDTH - 52, CANVAS_HEIGHT - 32, false, '#d8b55b', 'rgba(6,21,27,.97)', 13);
  titleText(ctx, T.paused, 46, 47, 17, '#f0d27a', 'left');
  text(ctx, `PISO ${engine.map.floorIndex + 1}/6 · ATRACO EN PAUSA`, 47, 62, 6.2, '#789995', 'left', true, false);

  const items = [
    { label: T.resume }, { label: 'MAPA' }, { label: T.restartRun }, { label: T.menuHowTo },
    { label: T.menuSettings }, { label: T.backToMenu },
  ];
  items.forEach((item, i) => {
    const y = PAUSE_MENU.y + i * (PAUSE_MENU.h + PAUSE_MENU.gap);
    drawPremiumButton(ctx, item.label, CANVAS_WIDTH / 2 - PAUSE_MENU.w / 2, y, PAUSE_MENU.w, PAUSE_MENU.h, i === engine.pauseIndex, engine.frame, i + 1);
  });

  drawPremiumPanel(ctx, 54, 219, 372, 72, false, '#608d86', 'rgba(9,30,34,.66)', 8);
  text(ctx, T.controls, 72, 239, 7.4, '#c7d8d3', 'left', true, false);
  const gamepad = engine.lastInput === 'gamepad';
  const quick = gamepad ? ['PALANCA · MOVER', 'RT · DISPARAR', 'B · ESQUIVAR', 'A · INTERACTUAR'] : ['WASD · MOVER', 'FLECHAS · DISPARAR', 'SHIFT · ESQUIVAR', 'E · INTERACTUAR'];
  quick.forEach((label, i) => {
    const x = 72 + (i % 2) * 176, y = 257 + Math.floor(i / 2) * 16;
    text(ctx, label, x, y, 6.3, '#8ea9a4', 'left', true, false);
  });
  text(ctx, `SEMILLA · ${engine.run.seed}`, 240, 307, 6.1, '#baa86f', 'center', true, false);
  text(ctx, gamepad ? 'START / B · VOLVER AL ATRACO' : 'ESC · VOLVER AL ATRACO', 240, 324, 6.3, '#829f99', 'center', true, false);
}'''
replace_between(RENDER, 'function renderPausedUI(engine: GameEngine) {', 'function renderSwapUI(engine: GameEngine) {', paused)

replace_once(INDEX, '0.7.52-chibi-skin-coherence', '0.7.53-premium-menu-ui-candidate')
print('patched v0.7.53 premium front-end UI candidate; gameplay logic untouched')
