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
# Candidate build marker
# -----------------------------------------------------------------------------
p = Path('index.html')
s = p.read_text()
s = replace_once(
    s,
    '0.7.54-menu-difficulty-audio',
    '0.7.55-appdeploy-ui-restore-candidate',
    'index build marker',
)
p.write_text(s)


# -----------------------------------------------------------------------------
# Restore the crime-file / bank-heist identity from the archived AppDeploy UI.
# This is presentation-only: current six menu actions, settings model, V16,
# gameplay, hitboxes and persistence remain untouched.
# -----------------------------------------------------------------------------
p = Path('src/game/render.ts')
s = p.read_text()

menu_body = r'''function renderMenuUI(engine: GameEngine) {
  const ctx = engine.ui!;

  // AppDeploy reference: near-black evidence board, warm orange/gold accents,
  // squared dossier panels and a deliberately playful criminal-file tone.
  ctx.fillStyle = 'rgba(5,7,11,.72)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.save();
  ctx.globalAlpha = .075;
  ctx.fillStyle = '#ff9f1a';
  for (let x = 0; x < CANVAS_WIDTH; x += 32) ctx.fillRect(x, 0, 1, CANVAS_HEIGHT);
  ctx.fillStyle = '#dce3ec';
  for (let y = 0; y < CANVAS_HEIGHT; y += 32) ctx.fillRect(0, y, CANVAS_WIDTH, 1);
  ctx.restore();

  // Wanted strap + title.
  ctx.fillStyle = '#ff9f1a';
  ctx.fillRect(145, 8, 190, 17);
  text(ctx, 'SE BUSCA UN CÓMPLICE', 240, 20, 7.2, '#08090c', 'center', true, false);
  drawTitleLogo(ctx, CANVAS_WIDTH / 2, 54, engine.frame);
  text(ctx, 'Atracos ridículos. Botín absurdo. Cero héroes.', 240, 91, 6.4, '#d7dde6', 'center', true, false);

  // Current navigation stays exactly six items and keeps the shared hitboxes.
  text(ctx, 'EXPEDIENTE #404', MAIN_MENU.x, 119, 6.2, '#ffb23f', 'left', true, false);
  MENU_ITEMS.forEach((item, i) => {
    const on = i === engine.menuIndex;
    const x = MAIN_MENU.x;
    const y = MAIN_MENU.y + i * (MAIN_MENU.h + MAIN_MENU.gap);
    const w = MAIN_MENU.w;
    const h = MAIN_MENU.h;

    ctx.save();
    if (on) {
      ctx.shadowColor = 'rgba(255,159,26,.42)';
      ctx.shadowBlur = 12;
    }
    ctx.fillStyle = on ? '#ff9f1a' : 'rgba(10,13,19,.94)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = on ? '#ffd27a' : 'rgba(255,159,26,.40)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + .5, y + .5, w - 1, h - 1);
    ctx.fillStyle = on ? 'rgba(255,255,255,.24)' : 'rgba(255,255,255,.045)';
    ctx.fillRect(x + 3, y + 2, w - 6, 1);
    ctx.fillStyle = on ? 'rgba(94,48,0,.35)' : 'rgba(255,159,26,.16)';
    ctx.fillRect(x + 3, y + h - 3, w - 6, 1);
    if (on) {
      const sweep = (engine.frame * .7) % Math.max(24, w - 24);
      ctx.fillStyle = 'rgba(255,255,255,.13)';
      ctx.fillRect(x + 4 + sweep, y + 3, 18, h - 6);
    }
    text(ctx, item.label, x + w / 2, y + 15.5, 8.5, on ? '#111217' : '#d3d9e2', 'center', true, false);
    if (on) {
      text(ctx, '›', x - 9, y + 16, 13, '#ffb23f', 'center', true, false);
      text(ctx, '‹', x + w + 9, y + 16, 13, '#ffb23f', 'center', true, false);
    }
    ctx.restore();
  });

  // Criminal dossier.
  const skin = SKINS.find(s => s.id === engine.equippedSkin);
  drawPanel(ctx, 216, 109, 239, 92, 'rgba(8,10,15,.95)', '#ff9f1a', '#4a3420');
  ctx.fillStyle = '#ff9f1a';
  ctx.fillRect(224, 117, 59, 13);
  text(ctx, 'CASO #404', 253.5, 126, 5.8, '#0a0b0e', 'center', true, false);
  text(ctx, 'PATITO CRIMINAL', 224, 146, 10.3, '#f5f7fb', 'left', true, false);
  text(ctx, skin?.name ?? 'PATITO BASE', 224, 160, 6.2, '#ffbf57', 'left', true, false);
  text(ctx, 'Especialidad: entrar', 224, 175, 5.8, '#aeb7c4', 'left', false, false);
  text(ctx, 'y salir haciendo ruido.', 224, 186, 5.8, '#aeb7c4', 'left', false, false);
  drawItemIcon(ctx, 397, 137, 'golden_crumb', 18);
  text(ctx, `${engine.totalGoldenCrumbs}`, 429, 151, 9, '#ffd54a', 'right', true, false);
  text(ctx, 'MIGAS DORADAS', 429, 164, 5.2, '#9ca7b4', 'right', true, false);

  // Next-heist briefing.
  drawPanel(ctx, 216, 209, 239, 82, 'rgba(8,10,15,.95)', '#b97524', '#3d2d20');
  text(ctx, 'SIGUIENTE GOLPE', 226, 226, 6.1, '#ff9f1a', 'left', true, false);
  text(ctx, 'BANCO DEL BARRIO', 226, 244, 9.2, '#f5f7fb', 'left', true, false);
  text(ctx, '6 pisos · bóvedas · demasiada seguridad', 226, 257, 5.3, '#aeb7c4', 'left', false, false);
  text(ctx, 'RECOMPENSA ESTIMADA', 226, 274, 5.1, '#8f99a7', 'left', true, false);
  text(ctx, '$??? + gloria cuestionable', 445, 275, 5.8, '#ffd54a', 'right', true, false);

  // Sound + difficulty status echo the old compact bottom-right status box.
  const difficulty = engine.settings.difficulty === 'relaxed' ? 'RELAJADO' : engine.settings.difficulty === 'hard' ? 'IMPLACABLE' : 'NORMAL';
  ctx.fillStyle = 'rgba(8,10,15,.95)';
  ctx.fillRect(216, 298, 239, 24);
  ctx.strokeStyle = 'rgba(255,159,26,.42)';
  ctx.strokeRect(216.5, 298.5, 238, 23);
  text(ctx, `SONIDO: ${engine.settings.muted ? 'OFF' : 'ON'}`, 226, 313, 5.8, engine.settings.muted ? '#e98277' : '#ffb23f', 'left', true, false);
  text(ctx, `DIFICULTAD: ${difficulty}`, 445, 313, 5.6, '#c9d1dc', 'right', true, false);

  // Old AppDeploy-style control strip.
  text(ctx, engine.lastInput === 'gamepad' ? 'CRUCETA · MOVER     A · CONFIRMAR     B · VOLVER' : 'W / S · MOVER     ENTER · CONFIRMAR', 31, 341, 5.8, '#c0c8d3', 'left', true, false);
}
'''

settings_body = r'''function renderSettingsUI(engine: GameEngine) {
  const ctx = engine.ui!;

  ctx.fillStyle = 'rgba(5,7,11,.89)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.save();
  ctx.globalAlpha = .06;
  ctx.fillStyle = '#ff9f1a';
  for (let x = 0; x < CANVAS_WIDTH; x += 32) ctx.fillRect(x, 0, 1, CANVAS_HEIGHT);
  for (let y = 0; y < CANVAS_HEIGHT; y += 32) ctx.fillRect(0, y, CANVAS_WIDTH, 1);
  ctx.restore();

  drawPanel(ctx, 28, 13, CANVAS_WIDTH - 56, CANVAS_HEIGHT - 27, 'rgba(8,10,15,.97)', '#ff9f1a', '#4a3420');
  ctx.fillStyle = '#ff9f1a';
  ctx.fillRect(45, 26, 181, 14);
  text(ctx, 'SONIDO · ACCESIBILIDAD · CALIDAD', 135.5, 36, 5.4, '#090a0d', 'center', true, false);
  titleText(ctx, 'AJUSTES', 45, 60, 17, '#ffd54a', 'left');

  SETTING_ROWS.forEach((row, i) => {
    const r = settingsRect(i);
    const on = i === engine.settingsIndex;

    if (i === 0) {
      ctx.fillStyle = on ? 'rgba(255,159,26,.16)' : 'rgba(255,255,255,.025)';
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = on ? '#ff9f1a' : 'rgba(255,159,26,.30)';
      ctx.lineWidth = on ? 1.5 : 1;
      ctx.strokeRect(r.x + .5, r.y + .5, r.w - 1, r.h - 1);
      ctx.fillStyle = on ? '#ff9f1a' : '#5d3d1e';
      ctx.fillRect(r.x + 4, r.y + 4, 3, r.h - 8);
      text(ctx, 'DIFICULTAD', r.x + 14, r.y + 19, 7, on ? '#ffd782' : '#c9d1dc', 'left', true, false);
      const modes:[string,string][] = [['relaxed','RELAJADO'],['normal','NORMAL'],['hard','IMPLACABLE']];
      modes.forEach(([key, label], idx) => {
        const active = engine.settings.difficulty === key;
        const bx = 198 + idx * 73;
        const bw = 67;
        ctx.fillStyle = active ? (key === 'hard' ? '#7f2d28' : '#ff9f1a') : '#171a20';
        ctx.fillRect(bx, r.y + 6, bw, 18);
        ctx.strokeStyle = active ? (key === 'hard' ? '#e98277' : '#ffd27a') : '#343943';
        ctx.strokeRect(bx + .5, r.y + 6.5, bw - 1, 17);
        text(ctx, label, bx + bw / 2, r.y + 18.5, 5.2, active ? '#fff7e2' : '#8f99a7', 'center', true, false);
      });
      return;
    }

    if (i === 1) text(ctx, 'SONIDO', r.x + 2, r.y - 7, 5.4, '#ff9f1a', 'left', true, false);
    if (i === 6) text(ctx, 'ACCESIBILIDAD · CALIDAD', r.x + 2, r.y - 7, 5.4, '#ff9f1a', 'left', true, false);

    ctx.fillStyle = on ? 'rgba(255,159,26,.12)' : (i % 2 ? 'rgba(255,255,255,.025)' : 'rgba(255,255,255,.04)');
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = on ? '#ff9f1a' : '#2b3038';
    ctx.lineWidth = on ? 1.3 : 1;
    ctx.strokeRect(r.x + .5, r.y + .5, r.w - 1, r.h - 1);
    if (on) {
      ctx.fillStyle = '#ff9f1a';
      ctx.fillRect(r.x + 3, r.y + 4, 3, r.h - 8);
    }

    const audioMuted = engine.settings.muted && ['master','music','sfx'].includes(row.key);
    text(ctx, row.label, r.x + 12, r.y + 14.5, 6.2, audioMuted ? '#666d78' : on ? '#ffe0a2' : '#c4ccd6', 'left', on, false);
    const v = settingValue(engine, i);

    if (row.kind === 'vol' || row.kind === 'shake' || row.kind === 'scale' || row.kind === 'brightness') {
      const max = row.kind === 'vol' ? 1 : row.kind === 'shake' ? 2 : row.kind === 'brightness' ? 1.4 : 3;
      drawBar(ctx, r.x + r.w - 76, r.y + 7, 45, v / max, on && !audioMuted ? '#ff9f1a' : '#59606b');
      const display = row.kind === 'vol' ? `${Math.round(v * 100)}%`
        : row.kind === 'shake' ? `${Math.round((v / 2) * 100)}%`
        : row.kind === 'brightness' ? `${Math.round(v * 100)}%`
        : `${v}x`;
      text(ctx, display, r.x + r.w - 8, r.y + 15, 5.8, audioMuted ? '#656c76' : on ? '#ffd54a' : '#939daa', 'right', true, false);
    } else {
      let label = row.kind === 'action' ? 'PROBAR' : v > .5 ? T.on : T.off;
      let col = v > .5 || row.kind === 'action' ? '#ffd54a' : '#8f99a7';
      if (row.key === 'muted') {
        label = engine.settings.muted ? 'SILENCIO' : 'ACTIVO';
        col = engine.settings.muted ? '#e98277' : '#ffd54a';
      }
      text(ctx, label, r.x + r.w - 8, r.y + 15, 5.7, col, 'right', true, false);
    }
  });

  const diffHelp = engine.settings.difficulty === 'relaxed'
    ? 'RELAJADO · Menos vida y daño enemigo; ataques más espaciados.'
    : engine.settings.difficulty === 'hard'
      ? 'IMPLACABLE · Más vida, daño, velocidad y élites.'
      : 'NORMAL · Balance original; la seguridad aumenta por piso.';
  const help = engine.settingsIndex === 0 ? diffHelp
    : engine.settingsIndex === 1 ? (engine.settings.muted ? 'Silencio criminal. Tus volúmenes quedan guardados.' : 'Más volumen, menos discreción.')
    : engine.settingsIndex === 5 ? 'ESCUCHA EL BOTÍN · Reproduce el CUAC de prueba.'
    : engine.settingsIndex === 11 ? 'PRUEBA DE MOVIMIENTO · Reproduce el sonido de esquive.'
    : 'Los cambios se guardan automáticamente.';
  text(ctx, help, 240, 305, 5.7, '#aeb7c4', 'center', false, false);
  text(ctx, engine.lastInput === 'gamepad' ? '↑/↓ NAVEGAR     ←/→ AJUSTAR     A CAMBIAR     B VOLVER' : '↑/↓ NAVEGAR     ←/→ AJUSTAR     ENTER CAMBIAR     ESC VOLVER', 240, 329, 5.8, '#ffbe55', 'center', true, false);
}
'''

s = replace_function(s, 'renderMenuUI', 'renderHowToPlayUI', menu_body)
s = replace_function(s, 'renderSettingsUI', 'renderWardrobeUI', settings_body)
p.write_text(s)
