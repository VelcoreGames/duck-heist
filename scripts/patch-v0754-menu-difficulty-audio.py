from pathlib import Path
import re


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 anchor, found {count}')
    return text.replace(old, new, 1)


def replace_function(text: str, name: str, next_name: str, body: str) -> str:
    pattern = rf"function {re.escape(name)}\(.*?\n\}}\n\nfunction {re.escape(next_name)}"
    match = re.search(pattern, text, flags=re.S)
    if not match:
        raise SystemExit(f'function block not found: {name} -> {next_name}')
    prefix = text[:match.start()]
    suffix = text[match.end() - len(f'function {next_name}'):]
    return prefix + body.rstrip() + '\n\n' + suffix

# -----------------------------------------------------------------------------
# Build marker
# -----------------------------------------------------------------------------
p = Path('index.html')
s = p.read_text()
s = replace_once(s, '0.7.53-premium-menu-ui', '0.7.54-menu-difficulty-audio-candidate', 'index build marker')
p.write_text(s)

# -----------------------------------------------------------------------------
# Settings type
# -----------------------------------------------------------------------------
p = Path('src/game/types.ts')
s = p.read_text()
s = replace_once(s, "export type DuckDir = 'up' | 'down' | 'left' | 'right';", "export type DuckDir = 'up' | 'down' | 'left' | 'right';\nexport type DifficultyMode = 'relaxed' | 'normal' | 'hard';", 'difficulty type')
s = replace_once(
    s,
    "export interface Settings {\n  master: number; music: number; sfx: number;\n  shake: number;            // 0..2\n  damageNumbers: boolean;\n  uiScale: number;          // 1..3\n  fullscreen: boolean;\n  brightness: number;       // 0.6..1.4\n}",
    "export interface Settings {\n  master: number; music: number; sfx: number;\n  muted: boolean;\n  difficulty: DifficultyMode;\n  shake: number;            // 0..2\n  damageNumbers: boolean;\n  uiScale: number;          // 1..3\n  fullscreen: boolean;\n  brightness: number;       // 0.6..1.4\n}",
    'settings interface',
)
p.write_text(s)

# -----------------------------------------------------------------------------
# Save normalization / defaults
# -----------------------------------------------------------------------------
p = Path('src/game/progress.ts')
s = p.read_text()
s = replace_once(
    s,
    "export const DEFAULT_SETTINGS:Settings = {master:.8,music:.35,sfx:.85,shake:.7,damageNumbers:true,uiScale:2,fullscreen:false,brightness:1};",
    "export const DEFAULT_SETTINGS:Settings = {master:.8,music:.35,sfx:.85,muted:false,difficulty:'normal',shake:.7,damageNumbers:true,uiScale:2,fullscreen:false,brightness:1};",
    'default settings',
)
s = replace_once(
    s,
    "  settings.damageNumbers=values.damageNumbers!==false;\n  if(values.sound===false) settings.master=0;",
    "  settings.damageNumbers=values.damageNumbers!==false;\n  settings.muted=values.muted===true || values.sound===false;\n  settings.difficulty=values.difficulty==='relaxed'||values.difficulty==='hard'||values.difficulty==='normal'?values.difficulty:'normal';",
    'settings normalization',
)
p.write_text(s)

# -----------------------------------------------------------------------------
# Difficulty logic + mute + setting rows
# -----------------------------------------------------------------------------
p = Path('src/game/engine.ts')
s = p.read_text()
s = replace_once(
    s,
    "  GameEngine, Enemy, RoomContent, Projectile, DuckDir, EventKind, Pedestal,\n} from './types';",
    "  GameEngine, Enemy, RoomContent, Projectile, DuckDir, EventKind, Pedestal, DifficultyMode,\n} from './types';",
    'engine type import',
)
old_floor = '''/** Multiplicadores de dificultad según piso y profundidad dentro del mapa */
export function floorScale(floorIndex: number, roomDistance = 0): DiffScale {
  const f = floorIndex;                       // 0 = primer piso
  const depth = Math.min(roomDistance, 8) * 0.06;
  return {
    hp: 1 + f * 0.11 + depth * 0.5,
    dmg: 1 + f * 0.09,
    speed: 1 + f * 0.05,
    fire: Math.max(0.55, 1 - f * 0.07),      // menos espera entre disparos
    count: 1 + f * 0.22 + depth,
    eliteChance: f <= 1 ? (f === 1 ? 0.10 : 0) : Math.min(0.42, 0.14 + f * 0.09 + depth * 0.5),
    pattern: f,
  };
}
'''
new_floor = '''/** Multiplicadores por piso + dificultad elegida. NORMAL preserva el balance previo. */
export function floorScale(floorIndex: number, roomDistance = 0, difficulty: DifficultyMode = 'normal'): DiffScale {
  const f = floorIndex;                       // 0 = primer piso
  const depth = Math.min(roomDistance, 8) * 0.06;
  const mode = difficulty === 'relaxed'
    ? { hp:.85, dmg:.80, speed:.96, fire:1.10, count:.92, elite:-.07 }
    : difficulty === 'hard'
      ? { hp:1.16, dmg:1.20, speed:1.06, fire:.90, count:1.10, elite:.07 }
      : { hp:1, dmg:1, speed:1, fire:1, count:1, elite:0 };
  const eliteBase = f <= 1 ? (f === 1 ? 0.10 : 0) : Math.min(0.42, 0.14 + f * 0.09 + depth * 0.5);
  return {
    hp: (1 + f * 0.11 + depth * 0.5) * mode.hp,
    dmg: (1 + f * 0.09) * mode.dmg,
    speed: (1 + f * 0.05) * mode.speed,
    fire: Math.max(0.48, (1 - f * 0.07) * mode.fire), // menor valor = dispara con más frecuencia
    count: Math.max(.82, (1 + f * 0.22 + depth) * mode.count),
    eliteChance: Math.max(0, Math.min(.55, eliteBase + mode.elite)),
    pattern: f,
  };
}
'''
s = replace_once(s, old_floor, new_floor, 'floor scale')
# Replace every engine-aware floorScale call before inserting the helper.
count = s.count('floorScale(engine.map.floorIndex,')
if count < 3:
    raise SystemExit(f'expected multiple engine floorScale calls, found {count}')
s = s.replace('floorScale(engine.map.floorIndex,', 'engineFloorScale(engine,')
anchor = "export function activeWeapon(p: GameEngine['player']): WeaponDef {"
helper = "function engineFloorScale(engine: GameEngine, roomDistance = 0): DiffScale {\n  return floorScale(engine.map.floorIndex, roomDistance, engine.settings.difficulty);\n}\n\n"
s = replace_once(s, anchor, helper + anchor, 'engine floor scale helper')
s = s.replace('  setVolumes(settings.master, settings.music, settings.sfx);', '  setVolumes(settings.muted ? 0 : settings.master, settings.music, settings.sfx);', 1)
s = replace_once(
    s,
    "export function saveSettings(engine: GameEngine) {\n  setVolumes(engine.settings.master, engine.settings.music, engine.settings.sfx);\n  saveProgress(engine);\n}",
    "export function saveSettings(engine: GameEngine) {\n  setVolumes(engine.settings.muted ? 0 : engine.settings.master, engine.settings.music, engine.settings.sfx);\n  saveProgress(engine);\n}",
    'save settings mute',
)
old_rows = '''export const SETTING_ROWS = [
  { key: 'master', label: T.settingMaster, kind: 'vol' as const },
  { key: 'music', label: T.settingMusic, kind: 'vol' as const },
  { key: 'sfx', label: T.settingSfx, kind: 'vol' as const },
  { key: 'shake', label: T.settingShake, kind: 'shake' as const },
  { key: 'damageNumbers', label: T.settingDamage, kind: 'bool' as const },
  { key: 'uiScale', label: T.settingUiScale, kind: 'scale' as const },
  { key: 'fullscreen', label: T.settingFullscreen, kind: 'bool' as const },
  { key: 'brightness', label: 'BRILLO', kind: 'brightness' as const },
  { key: 'testQuack', label: 'PROBAR CUAC', kind: 'action' as const },
  { key: 'testDash', label: 'PROBAR ESQUIVE', kind: 'action' as const },
];
'''
new_rows = '''export const SETTING_ROWS = [
  { key: 'difficulty', label: 'DIFICULTAD', kind: 'choice' as const },
  { key: 'muted', label: 'SILENCIAR TODO', kind: 'bool' as const },
  { key: 'master', label: T.settingMaster, kind: 'vol' as const },
  { key: 'music', label: T.settingMusic, kind: 'vol' as const },
  { key: 'sfx', label: T.settingSfx, kind: 'vol' as const },
  { key: 'testQuack', label: 'PROBAR CUAC', kind: 'action' as const },
  { key: 'shake', label: T.settingShake, kind: 'shake' as const },
  { key: 'damageNumbers', label: T.settingDamage, kind: 'bool' as const },
  { key: 'uiScale', label: T.settingUiScale, kind: 'scale' as const },
  { key: 'fullscreen', label: T.settingFullscreen, kind: 'bool' as const },
  { key: 'brightness', label: 'BRILLO', kind: 'brightness' as const },
  { key: 'testDash', label: 'PROBAR ESQUIVE', kind: 'action' as const },
];
'''
s = replace_once(s, old_rows, new_rows, 'setting rows')
s = replace_once(
    s,
    "  const v = (engine.settings as unknown as Record<string, number | boolean>)[row.key];\n  return typeof v === 'boolean' ? (v ? 1 : 0) : v;",
    "  const v = (engine.settings as unknown as Record<string, number | boolean | string>)[row.key];\n  if (typeof v === 'string') return 0;\n  return typeof v === 'boolean' ? (v ? 1 : 0) : v;",
    'setting value string support',
)
s = replace_once(
    s,
    "  const s = engine.settings as unknown as Record<string, number | boolean>;\n  if (row.kind === 'bool') {",
    "  const s = engine.settings as unknown as Record<string, number | boolean | string>;\n  if (row.kind === 'choice') {\n    const levels:DifficultyMode[]=['relaxed','normal','hard'];\n    const current=levels.indexOf(engine.settings.difficulty);\n    engine.settings.difficulty=levels[(current+(dir>=0?1:-1)+levels.length)%levels.length];\n  } else if (row.kind === 'bool') {",
    'choice adjust',
)
s = replace_once(
    s,
    "  if (row.key === 'music' || row.key === 'master') {\n    if (engine.state === GameState.MENU) setMusic('menu');\n  }",
    "  if (row.key === 'music' || row.key === 'master' || row.key === 'muted') {\n    if (engine.state === GameState.MENU) setMusic('menu');\n  }",
    'audio setting refresh',
)
p.write_text(s)

# -----------------------------------------------------------------------------
# Shared settings hit-test geometry: one hero difficulty row + two columns.
# -----------------------------------------------------------------------------
p = Path('src/game/layout.ts')
s = p.read_text()
s = replace_once(
    s,
    "export const SETTINGS = { x:62,y:63,w:356,h:20,gap:5 };",
    "export const SETTINGS = { x:54,y:72,w:372,h:22,gap:5 };\nexport function settingsRect(index:number) {\n  if(index===0) return {x:54,y:72,w:372,h:30};\n  if(index>=1 && index<=5) return {x:54,y:125+(index-1)*27,w:177,h:22};\n  return {x:249,y:125+(index-6)*27,w:177,h:22};\n}",
    'settings geometry',
)
p.write_text(s)

# -----------------------------------------------------------------------------
# App mouse hit testing now uses settingsRect.
# -----------------------------------------------------------------------------
p = Path('src/App.tsx')
s = p.read_text()
s = replace_once(
    s,
    "import { MAIN_MENU, PAUSE_MENU, mainMenuHit, WARDROBE, WARDROBE_ACTION, wardrobeHit, swapHit, SETTINGS, inside, COLLECTION, activeSwapHit } from './game/layout';",
    "import { MAIN_MENU, PAUSE_MENU, mainMenuHit, WARDROBE, WARDROBE_ACTION, wardrobeHit, swapHit, settingsRect, inside, COLLECTION, activeSwapHit } from './game/layout';",
    'app layout import',
)
old_hover = "if(inside(p.x,p.y,{...SETTINGS,y:SETTINGS.y+i*(SETTINGS.h+SETTINGS.gap)})) hit=i;"
if s.count(old_hover) != 1:
    raise SystemExit(f'settings hover anchor count {s.count(old_hover)}')
s = s.replace(old_hover, "if(inside(p.x,p.y,settingsRect(i))) hit=i;", 1)
old_click = "if(inside(x,y,{...SETTINGS,y:SETTINGS.y+i*(SETTINGS.h+SETTINGS.gap)})) hit=i;"
if s.count(old_click) != 1:
    raise SystemExit(f'settings click anchor count {s.count(old_click)}')
s = s.replace(old_click, "if(inside(x,y,settingsRect(i))) hit=i;", 1)
p.write_text(s)

# -----------------------------------------------------------------------------
# Main menu + settings presentation.
# -----------------------------------------------------------------------------
p = Path('src/game/render.ts')
s = p.read_text()
s = replace_once(
    s,
    "import { MAIN_MENU, PAUSE_MENU, WARDROBE, WARDROBE_ACTION, SETTINGS } from './layout';",
    "import { MAIN_MENU, PAUSE_MENU, WARDROBE, WARDROBE_ACTION, settingsRect } from './layout';",
    'render layout import',
)
menu_body = r'''function renderMenuUI(engine: GameEngine) {
  const ctx = engine.ui!;
  // Hades / modern roguelite principle: let the title art breathe; keep navigation simple,
  // high-contrast, left anchored, and make the selected action unmistakable.
  const shade = ctx.createLinearGradient(0, 0, 275, 0);
  shade.addColorStop(0, 'rgba(3,11,16,.88)');
  shade.addColorStop(.72, 'rgba(4,13,18,.56)');
  shade.addColorStop(1, 'rgba(4,13,18,0)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 92, 282, 260);

  drawTitleLogo(ctx, CANVAS_WIDTH / 2, 54, engine.frame);
  text(ctx, 'EL BANCO ESTÁ ABIERTO', 34, 117, 6.2, '#809c97', 'left', true, false);

  const descriptions = [
    'Entra al banco y empieza una nueva run.',
    'Invierte migas doradas en mejoras permanentes.',
    'Cambia el aspecto del ladrón.',
    'Revisa armas, objetos, enemigos y jefes descubiertos.',
    'Consulta controles y reglas del atraco.',
    'Dificultad, audio, pantalla y accesibilidad.',
  ];
  MENU_ITEMS.forEach((item, i) => {
    const selected = i === engine.menuIndex;
    const x = MAIN_MENU.x, y = MAIN_MENU.y + i * (MAIN_MENU.h + MAIN_MENU.gap);
    if (selected) {
      const g = ctx.createLinearGradient(x, 0, x + MAIN_MENU.w, 0);
      g.addColorStop(0, 'rgba(216,181,91,.20)');
      g.addColorStop(1, 'rgba(216,181,91,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - 5, y - 2, MAIN_MENU.w + 28, MAIN_MENU.h + 4);
      ctx.fillStyle = '#e4c66e';
      ctx.fillRect(x - 5, y + 2, 3, MAIN_MENU.h - 4);
      text(ctx, '›', x + 5, y + 16, 11, '#f3d77f', 'left', true, false);
    }
    text(ctx, item.label, x + (selected ? 22 : 13), y + 16, selected ? 9.2 : 8.5, selected ? '#fff0b8' : '#b7c9c4', 'left', true, false);
  });

  const descY = MAIN_MENU.y + MENU_ITEMS.length * (MAIN_MENU.h + MAIN_MENU.gap) + 9;
  ctx.fillStyle = 'rgba(111,151,145,.18)'; ctx.fillRect(34, descY - 10, 176, 1);
  wrappedText(ctx, descriptions[engine.menuIndex] ?? '', 34, descY + 5, 190, 6.2, 8, 2, '#829e99');

  const difficulty = engine.settings.difficulty === 'relaxed' ? 'RELAJADO' : engine.settings.difficulty === 'hard' ? 'IMPLACABLE' : 'NORMAL';
  const statusX = 314, statusY = 303;
  ctx.fillStyle = 'rgba(4,15,20,.68)'; ctx.beginPath(); ctx.roundRect(statusX, statusY, 136, 34, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(129,166,159,.20)'; ctx.beginPath(); ctx.roundRect(statusX+.5,statusY+.5,135,33,6.5); ctx.stroke();
  text(ctx, 'DIFICULTAD', statusX + 10, statusY + 13, 5.6, '#718d88', 'left', true, false);
  text(ctx, difficulty, statusX + 126, statusY + 13, 6.4, engine.settings.difficulty === 'hard' ? '#e58a82' : '#e6c875', 'right', true, false);
  text(ctx, 'AUDIO', statusX + 10, statusY + 27, 5.6, '#718d88', 'left', true, false);
  text(ctx, engine.settings.muted ? 'SILENCIADO' : 'ACTIVO', statusX + 126, statusY + 27, 6.2, engine.settings.muted ? '#df766f' : '#7fd3a2', 'right', true, false);

  text(ctx, engine.lastInput === 'gamepad' ? 'CRUCETA · ELEGIR     A · CONFIRMAR' : 'W / S · ELEGIR     ENTER · CONFIRMAR', 34, 343, 5.9, '#728e89', 'left', true, false);
  drawItemIcon(ctx, 402, 340, 'golden_crumb', 12);
  text(ctx, `${engine.totalGoldenCrumbs}`, 421, 344, 6.2, '#d2bd7b', 'left', true, false);
}'''
s = replace_function(s, 'renderMenuUI', 'renderHowToPlayUI', menu_body)

settings_body = r'''function renderSettingsUI(engine: GameEngine) {
  const ctx = engine.ui!;
  drawPremiumBackdrop(ctx, engine.frame, .78);
  drawPremiumPanel(ctx, 30, 14, CANVAS_WIDTH - 60, CANVAS_HEIGHT - 28, false, '#d8b55b', 'rgba(7,22,28,.97)', 13);
  titleText(ctx, T.settingsTitle, 50, 43, 16, '#f0d27a', 'left');
  text(ctx, 'JUGABILIDAD · AUDIO · VIDEO', 51, 58, 5.9, '#789995', 'left', true, false);

  text(ctx, 'AUDIO', 58, 119, 5.8, '#76958f', 'left', true, false);
  text(ctx, 'PRESENTACIÓN', 253, 119, 5.8, '#76958f', 'left', true, false);

  SETTING_ROWS.forEach((row, i) => {
    const r = settingsRect(i);
    const on = i === engine.settingsIndex;

    if (i === 0) {
      drawPremiumPanel(ctx, r.x, r.y, r.w, r.h, on, '#d8b55b', on ? 'rgba(31,52,48,.96)' : 'rgba(9,29,34,.78)', 7);
      text(ctx, row.label, r.x + 14, r.y + 19, 7.1, on ? '#fff0b8' : '#b5c8c2', 'left', true, false);
      const modes:[string,string][] = [['relaxed','RELAJADO'],['normal','NORMAL'],['hard','IMPLACABLE']];
      modes.forEach(([key,label], idx) => {
        const active = engine.settings.difficulty === key;
        const bx = 198 + idx * 73, bw = 67;
        ctx.fillStyle = active ? (key === 'hard' ? 'rgba(193,78,70,.34)' : 'rgba(216,181,91,.28)') : 'rgba(255,255,255,.035)';
        ctx.beginPath(); ctx.roundRect(bx, r.y + 6, bw, 18, 5); ctx.fill();
        ctx.strokeStyle = active ? (key === 'hard' ? '#df766f' : '#d8b55b') : 'rgba(128,164,158,.12)';
        ctx.beginPath(); ctx.roundRect(bx+.5, r.y + 6.5, bw-1, 17, 4.5); ctx.stroke();
        text(ctx, label, bx + bw/2, r.y + 18.5, 5.4, active ? '#fff0bd' : '#78948f', 'center', true, false);
      });
      return;
    }

    ctx.fillStyle = on ? 'rgba(43,70,66,.82)' : 'rgba(255,255,255,.025)';
    ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 6); ctx.fill();
    ctx.strokeStyle = on ? '#d8b55b' : 'rgba(119,165,158,.12)';
    ctx.lineWidth = on ? 1.15 : 1;
    ctx.beginPath(); ctx.roundRect(r.x+.5,r.y+.5,r.w-1,r.h-1,5.5); ctx.stroke();
    if (on) { ctx.fillStyle='#d8b55b'; ctx.beginPath(); ctx.roundRect(r.x+4,r.y+4,3,r.h-8,2); ctx.fill(); }

    const mutedAudio = engine.settings.muted && ['master','music','sfx'].includes(row.key);
    text(ctx, row.label, r.x + 13, r.y + 14.5, 6.5, mutedAudio ? '#687d79' : on ? '#fff0bd' : '#a8bbb6', 'left', on, false);
    const v = settingValue(engine, i);
    if (row.kind === 'vol' || row.kind === 'shake' || row.kind === 'scale' || row.kind === 'brightness') {
      const max = row.kind === 'vol' ? 1 : row.kind === 'shake' ? 2 : row.kind === 'brightness' ? 1.4 : 3;
      drawPremiumMeter(ctx, r.x + r.w - 78, r.y + 8, 44, v / max, on && !mutedAudio);
      const display = row.kind === 'vol' ? `${Math.round(v * 100)}%` : `${v}`;
      text(ctx, display, r.x + r.w - 9, r.y + 15, 6.1, mutedAudio ? '#61736f' : on ? '#f0d27a' : '#819b96', 'right', true, false);
    } else {
      let label = row.kind === 'action' ? 'PROBAR' : v > .5 ? T.on : T.off;
      let col = v > .5 || row.kind === 'action' ? '#7fd3a2' : '#8fa19d';
      if (row.key === 'muted') { label = engine.settings.muted ? 'SILENCIADO' : 'AUDIO ACTIVO'; col = engine.settings.muted ? '#df766f' : '#7fd3a2'; }
      text(ctx, label, r.x + r.w - 9, r.y + 15, 5.8, col, 'right', true, false);
    }
  });

  const diffHelp = engine.settings.difficulty === 'relaxed'
    ? 'RELAJADO · -15% vida enemiga · -20% daño · ataques más espaciados.'
    : engine.settings.difficulty === 'hard'
      ? 'IMPLACABLE · +16% vida · +20% daño · enemigos más rápidos y más élites.'
      : 'NORMAL · balance original de Duck Heist; la seguridad sigue aumentando por piso.';
  const help = engine.settingsIndex === 0 ? diffHelp
    : engine.settingsIndex === 1 ? 'SILENCIAR TODO conserva tus niveles de volumen para recuperarlos al reactivar el audio.'
    : engine.settings.muted && [2,3,4].includes(engine.settingsIndex) ? 'El audio está silenciado; puedes ajustar estos niveles y se conservarán.'
    : 'Los cambios se guardan automáticamente. La dificultad afecta nuevas salas del atraco actual y futuras runs.';
  text(ctx, help, 240, 305, 5.8, '#829e99', 'center', false, false);
  text(ctx, engine.lastInput === 'gamepad' ? '↑ ↓  ELEGIR     ← →  CAMBIAR     B  VOLVER' : '↑ ↓  ELEGIR     ← → / ENTER  CAMBIAR     ESC  VOLVER', 240, 326, 6.0, '#9ab1ac', 'center', true, false);
}'''
s = replace_function(s, 'renderSettingsUI', 'renderWardrobeUI', settings_body)
p.write_text(s)

# Sanity checks
checks = {
    'src/game/engine.ts': ["difficulty: DifficultyMode = 'normal'", "{ key: 'difficulty'", "{ key: 'muted'", 'engineFloorScale(engine,'],
    'src/game/render.ts': ['EL BANCO ESTÁ ABIERTO', 'IMPLACABLE', 'SILENCIAR TODO conserva'],
    'src/App.tsx': ['settingsRect(i)'],
    'src/game/layout.ts': ['export function settingsRect'],
    'src/game/progress.ts': ["difficulty:'normal'", 'settings.muted='],
}
for file, needles in checks.items():
    text = Path(file).read_text()
    for needle in needles:
        if needle not in text:
            raise SystemExit(f'{file}: missing {needle}')

print('v0.7.54 menu/difficulty/audio candidate applied')
