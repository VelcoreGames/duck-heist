import { useEffect, useRef, useState, type ReactNode } from 'react';
import { GameState } from './game/constants';
import type { GameEngine } from './game/types';
import { DIFFICULTIES, DIFFICULTY_MODES, SETTING_ROWS, settingValue, difficultyLabel } from './game/engine';
import { META_UPGRADES, SKINS, WEAPONS, ITEMS, ACTIVE_ITEMS, RARITY_COLORS, TOTAL_FLOORS } from './game/data';
import { MENU_META, fmtTime } from './game/render';
import { T } from './game/i18n';
import { drawItemIcon } from './game/itemArt';
import { drawDuckSkin } from './game/sprites';
import { endlessStage } from './game/endless';
import { mobileDomMenu } from './game/mobileMenuStates';

// Duck Heist Móvil: menús táctiles grandes. Usan los mismos datos y las mismas
// acciones que el menú de PC (cada botón elige la opción y manda la tecla que
// el juego ya entiende), así cualquier cambio del juego aplica a las dos versiones.

type Send = (key: string) => void;

function useTick(getEngine: () => GameEngine | null) {
  const [, setTick] = useState(0);
  const [state, setState] = useState<GameState | null>(null);
  useEffect(() => {
    let raf = 0, last = 0;
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      const e = getEngine(); if (!e) return;
      if (e.state !== state) setState(e.state);
      if (t - last > 110) { last = t; setTick(n => (n + 1) % 1e6); }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [getEngine, state]);
  return state;
}

/** Ícono del juego dibujado en un canvas (pixel-art nítido). */
function Sprite({ draw, size = 40, deps }: { draw: (ctx: CanvasRenderingContext2D) => void; size?: number; deps: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; const ctx = c?.getContext('2d'); if (!c || !ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, c.width, c.height); ctx.imageSmoothingEnabled = false;
    try { draw(ctx); } catch { /* ícono opcional */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deps]);
  return <canvas ref={ref} width={size * 2} height={size * 2} className="vg-mm-sprite" style={{ width: size, height: size }} aria-hidden="true" />;
}
const ItemIcon = ({ id, size = 36 }: { id: string; size?: number }) =>
  <Sprite size={size} deps={id + size} draw={ctx => drawItemIcon(ctx, 0, 0, id, size * 2)} />;
function Duck({ skin, size = 84, frame = 0, dir = 'down' as const }: { skin: string; size?: number; frame?: number; dir?: 'down' | 'right' | 'up' | 'left' }) {
  // El pollito mide 30x30 y su centro queda en (-1, 1) respecto al punto de dibujo.
  return <Sprite size={size} deps={skin + size + Math.floor(frame / 8) + dir} draw={ctx => {
    const k = size * 2 / 32; ctx.translate(size + k, size - k); ctx.scale(k, k);
    drawDuckSkin(ctx, -8, -8, frame, skin, dir, false, false, false, false, false, true);
  }} />;
}

function Btn({ children, onClick, kind = 'plain', className = '', disabled, accent }: {
  children: ReactNode; onClick: () => void; kind?: 'primary' | 'plain' | 'danger' | 'ghost' | 'good';
  className?: string; disabled?: boolean; accent?: string;
}) {
  return <button type="button" className={`vg-mm-btn is-${kind} ${className}`} disabled={disabled}
    style={accent ? { ['--a' as string]: accent } : undefined}
    onClick={() => { if (!disabled) onClick(); }}>{children}</button>;
}

function Coins({ e }: { e: GameEngine }) {
  return <span className="vg-mm-coins"><ItemIcon id="golden_crumb" size={20} /><b>{e.totalGoldenCrumbs}</b><small>MONEDAS</small></span>;
}

function Screen({ children, glass, accent = '#ffd45e', className = '' }: { children: ReactNode; glass?: boolean; accent?: string; className?: string }) {
  return <div className={`vg-mm${glass ? ' is-glass' : ''} ${className}`} style={{ ['--a' as string]: accent }}
    onPointerDown={ev => ev.stopPropagation()} onContextMenu={ev => ev.preventDefault()}>{children}</div>;
}
function Head({ eyebrow, title, sub, right }: { eyebrow?: string; title: string; sub?: string; right?: ReactNode }) {
  return <header className="vg-mm-head">
    <div>{eyebrow && <span className="vg-mm-eyebrow">{eyebrow}</span>}<h1>{title}</h1>{sub && <p>{sub}</p>}</div>
    {right}
  </header>;
}

// ---------------------------------------------------------------- menú principal
const TILE_ICONS: Record<number, string> = { 3: 'golden_crumb', 5: 'stolen_helmet', 6: 'baguette', 7: 'toaster' };
function MainMenu({ e, send }: { e: GameEngine; send: Send }) {
  const go = (i: number) => { e.menuIndex = i; send('Enter'); };
  const heistSaved = e.heistCheckpointFloor > 0, endlessSaved = e.endlessCheckpointRound > 0;
  const rec = e.endlessRecords[e.difficulty];
  const dirs = ['down', 'right', 'up', 'left'] as const;
  return <Screen className="vg-mm-main">
    <div className="vg-mm-main-left">
      <div className="vg-mm-logo">DUCK HEIST<small>EL BANCO DEL PAN</small></div>
      <div className="vg-mm-hero">
        <Duck skin={e.equippedSkin} size={92} frame={e.frame} dir={dirs[Math.floor((e.frame % 720) / 180)]} />
        <div className="vg-mm-hero-copy">
          <Btn kind="primary" className="vg-mm-play" onClick={() => go(0)}>
            <span className="vg-mm-play-icon">▶</span>
            <span><b>{heistSaved ? 'CONTINUAR ATRACO' : 'INICIAR ATRACO'}</b>
              <small>{heistSaved ? `Piso ${e.heistCheckpointFloor} guardado` : `Mejor piso ${e.bestFloor}/6 · ${DIFFICULTIES[e.difficulty].label}`}</small></span>
          </Btn>
          <div className="vg-mm-row">
            <Btn accent="#ff7a6b" onClick={() => go(1)}><b>SIN FIN</b><small>{endlessSaved ? `Ronda ${e.endlessCheckpointRound} guardada` : `Récord: ronda ${rec.round}`}</small></Btn>
            <Btn accent="#c98cff" onClick={() => go(2)}><b>DIARIO</b><small>Mejor hoy: {e.dailyProfile.current.bestScore}</small></Btn>
          </div>
        </div>
      </div>
      <p className="vg-mm-tagline">{T.tagline}</p>
    </div>
    <div className="vg-mm-tiles">
      <Coins e={e} />
      {[3, 4, 5, 6, 7].map(i => {
        const meta = MENU_META[i];
        return <Btn key={i} className="vg-mm-tile" accent={meta.accent} onClick={() => go(i)}>
          {i === 4 ? <Duck skin={e.equippedSkin} size={38} /> : <ItemIcon id={TILE_ICONS[i]} size={38} />}
          <b>{i === 7 ? 'AJUSTES' : meta.title}</b>
        </Btn>;
      })}
    </div>
  </Screen>;
}

// ---------------------------------------------------------------- dificultad
const DIFF_COLORS: Record<string, string> = { easy: '#8fe8b0', normal: '#ffd45e', hard: '#ffa34e', mad: '#ff6b6b' };
function Difficulty({ e, send }: { e: GameEngine; send: Send }) {
  const endless = e.pendingMode === 'endless';
  const sel = DIFFICULTY_MODES[e.difficultyIndex];
  const selLocked = sel === 'mad' && !e.madUnlocked;
  return <Screen accent={endless ? '#ff7a6b' : '#ffd45e'}>
    <Head eyebrow={endless ? 'ATRACO SIN FIN' : 'PLANIFICACIÓN DEL ATRACO'} title="ELIGE LA DIFICULTAD" sub="Toca un nivel y luego inicia." />
    <div className="vg-mm-diffs">
      {DIFFICULTY_MODES.map((mode, i) => {
        const def = DIFFICULTIES[mode], locked = mode === 'mad' && !e.madUnlocked, on = i === e.difficultyIndex;
        return <button key={mode} type="button" className={`vg-mm-diff${on ? ' is-on' : ''}${locked ? ' is-locked' : ''}`}
          style={{ ['--a' as string]: locked ? '#8f6671' : DIFF_COLORS[mode] }}
          onClick={() => { e.difficultyIndex = i; }}>
          <span className="vg-mm-skulls">{locked ? '🔒' : '💀'.repeat(i + 1)}</span>
          <b>{def.label}</b>
          <small>{locked ? 'Completa un atraco para desbloquearlo.' : def.desc}</small>
          {on && <i>ELEGIDO</i>}
        </button>;
      })}
    </div>
    <footer className="vg-mm-foot">
      <Btn kind="ghost" onClick={() => send('Escape')}>← VOLVER</Btn>
      <span className="vg-mm-note">{endless ? 'Sin Fin usa su propia secuencia de rondas.' : 'Semilla aleatoria'}</span>
      <Btn kind="primary" disabled={selLocked} onClick={() => send('Enter')}>{endless ? 'INICIAR SIN FIN ▶' : 'INICIAR ATRACO ▶'}</Btn>
    </footer>
  </Screen>;
}

// ---------------------------------------------------------------- pausa
function Pause({ e, send }: { e: GameEngine; send: Send }) {
  const pick = (i: number) => { e.pauseIndex = i; send('Enter'); };
  const endless = e.gameMode === 'endless';
  const where = endless ? `Ronda ${Math.max(1, e.endless.round)}` : `Piso ${e.map.floorIndex + 1}/6`;
  return <Screen glass>
    <Head eyebrow="ATRACO EN PAUSA" title="PAUSA" sub={`${where} · ${difficultyLabel(e)}`} right={<Coins e={e} />} />
    <div className="vg-mm-pause">
      <Btn kind="primary" className="vg-mm-resume" onClick={() => pick(0)}><span className="vg-mm-play-icon">▶</span><b>{T.resume}</b></Btn>
      <div className="vg-mm-grid3">
        <Btn onClick={() => pick(1)}><span className="vg-mm-ic">{endless ? '📊' : '🗺️'}</span><b>{endless ? 'RENDIMIENTO' : 'MAPA'}</b></Btn>
        <Btn onClick={() => pick(2)}><span className="vg-mm-ic">🎒</span><b>{endless ? 'BUILD' : 'MI EQUIPO'}</b></Btn>
        <Btn onClick={() => pick(3)}><span className="vg-mm-ic">⚙️</span><b>AJUSTES</b></Btn>
        <Btn onClick={() => pick(4)}><span className="vg-mm-ic">❓</span><b>CÓMO JUGAR</b></Btn>
        <Btn kind="danger" onClick={() => pick(5)}><span className="vg-mm-ic">↻</span><b>REINICIAR</b></Btn>
        <Btn kind="danger" onClick={() => pick(6)}><span className="vg-mm-ic">⌂</span><b>SALIR AL MENÚ</b></Btn>
      </div>
    </div>
  </Screen>;
}

// ---------------------------------------------------------------- confirmación
function Confirm({ e, send }: { e: GameEngine; send: Send }) {
  const kind = e.confirmKind;
  const title = kind === 'restart' ? '¿REINICIAR ATRACO?' : kind === 'new_endless' ? '¿NUEVO ATRACO SIN FIN?' : kind === 'new_heist' ? '¿NUEVO ATRACO?' : '¿ABANDONAR ATRACO?';
  const savedQuit = kind === 'quit' && e.gameMode === 'heist' && e.heistCheckpointFloor > 0;
  const body = kind === 'restart' ? 'Se perderá el progreso de esta partida y empezarás de nuevo.'
    : kind === 'new_endless' ? 'Tu partida guardada de Sin Fin se reemplazará.'
      : kind === 'new_heist' ? 'Tu atraco guardado se reemplazará al empezar uno nuevo.'
        : savedQuit ? 'Volverás al menú. Podrás continuar desde el piso guardado.' : 'Volverás al menú principal y esta partida terminará.';
  const pick = (i: number) => { e.confirmIndex = i; send('Enter'); };
  return <Screen glass accent="#ff6b6b" className="vg-mm-center">
    <div className="vg-mm-dialog">
      <span className="vg-mm-alert">!</span>
      <h1>{title}</h1>
      <p>{body}</p>
      <div className="vg-mm-row">
        <Btn kind="good" onClick={() => pick(1)}>CANCELAR</Btn>
        <Btn kind="danger" onClick={() => pick(0)}>SÍ, CONFIRMAR</Btn>
      </div>
    </div>
  </Screen>;
}

// ---------------------------------------------------------------- fin de partida
function EndScreen({ e, send }: { e: GameEngine; send: Send }) {
  const win = e.state === GameState.VICTORY, endless = e.gameMode === 'endless';
  const pick = (i: number) => { e.pauseIndex = i; send('Enter'); };
  const r = e.run, s = e.stats;
  let big: string, bigLabel: string, rows: [string, string][];
  if (endless) {
    const x = e.endless;
    big = 'RONDA ' + x.round; bigLabel = endlessStage(Math.max(1, x.round));
    rows = [['PUNTUACIÓN', String(Math.round(x.score))], ['ENEMIGOS', String(s.enemiesDefeated)], ['JEFES', String(r.bosses)],
      ['RONDAS PERFECTAS', String(x.perfectRounds)], ['RÉCORD', 'RONDA ' + e.endlessRecords[e.difficulty].round], ['TIEMPO', fmtTime(r.time)]];
  } else {
    big = win ? 'LIMPIO' : 'PISO ' + (r.floorReached || 0) + '/6';
    bigLabel = e.newRecord ? '¡NUEVO RÉCORD!' : win ? 'BANCO DEL PAN' : 'Mejor: piso ' + e.bestFloor + '/6';
    rows = [[T.statRooms, String(s.roomsCleared)], [T.statEnemies, String(s.enemiesDefeated)], [T.statBosses, String(r.bosses)],
      [T.statItems, String(r.items)], [T.statBread, String(s.breadStolen)], [T.statTime, fmtTime(r.time)]];
  }
  const accent = win ? '#8fe8b0' : '#ff6b6b';
  return <Screen accent={accent}>
    <Head eyebrow={win ? 'OPERACIÓN COMPLETADA' : 'INFORME DE OPERACIÓN'} title={win ? T.victory : endless ? 'ATRACO TERMINADO' : T.gameOver}
      sub={win ? T.victorySub : 'El banco conserva lo que no pudiste robar.'} right={<Coins e={e} />} />
    <div className="vg-mm-end">
      <div className="vg-mm-end-hero">
        <Duck skin={e.equippedSkin} size={70} frame={win ? e.frame : 0} dir="down" />
        <b>{big}</b><small>{bigLabel}</small><span>{difficultyLabel(e)}</span>
      </div>
      <div className="vg-mm-stats">
        {rows.map(([k, v]) => <div key={k}><small>{k}</small><b>{v}</b></div>)}
        {!endless && r.goldenEarned > 0 && <p className="vg-mm-earned">+{r.goldenEarned} monedas guardadas</p>}
      </div>
    </div>
    <footer className="vg-mm-foot">
      <Btn kind="ghost" onClick={() => pick(1)}>⌂ MENÚ PRINCIPAL</Btn>
      <Btn kind="primary" onClick={() => pick(0)}>↻ OTRO INTENTO</Btn>
    </footer>
  </Screen>;
}

// ---------------------------------------------------------------- ajustes
const GROUP_COLORS: Record<string, string> = { AUDIO: '#ffd45e', FEEDBACK: '#ff9b7d', VIDEO: '#79d2ff', ACCESIBILIDAD: '#c9a0ff', CONTROLES: '#79d2ff' };
function Settings({ e, send }: { e: GameEngine; send: Send }) {
  const act = (i: number, key: string) => { e.settingsIndex = i; send(key); };
  const fsOk = typeof document !== 'undefined' && !!document.fullscreenEnabled;
  return <Screen accent="#79d2ff">
    <Head eyebrow="SISTEMA" title="AJUSTES" />
    <div className="vg-mm-settings">
      {SETTING_ROWS.map((row, i) => {
        if (row.key === 'controls' || (row.key === 'fullscreen' && !fsOk)) return null;
        const v = settingValue(e, i), stepper = row.kind === 'vol' || row.kind === 'shake' || row.kind === 'brightness';
        const label = row.key === 'master' ? 'VOLUMEN' : row.key === 'shake' ? 'VIBRACIÓN DE PANTALLA' : row.label;
        return <div key={row.key} className="vg-mm-set" style={{ ['--a' as string]: GROUP_COLORS[row.group] ?? '#8fe8b0' }}>
          <span><b>{label}</b><small>{row.description}</small></span>
          {stepper ? <span className="vg-mm-stepper">
            <button type="button" aria-label="Menos" onClick={() => act(i, 'ArrowLeft')}>−</button>
            <em>{row.kind === 'vol' ? Math.round(v * 100) + '%' : String(Math.round(v * 10) / 10)}</em>
            <button type="button" aria-label="Más" onClick={() => act(i, 'ArrowRight')}>+</button>
          </span>
            : row.kind === 'action' ? <Btn onClick={() => act(i, 'Enter')}>APLICAR</Btn>
              : <button type="button" className={`vg-mm-switch${(row.key === 'muted' ? v <= .5 : v > .5) ? ' is-on' : ''}`} onClick={() => act(i, 'Enter')}>
                <i />{row.key === 'muted' ? (v > .5 ? 'SIN SONIDO' : 'CON SONIDO') : v > .5 ? 'SÍ' : 'NO'}
              </button>}
        </div>;
      })}
    </div>
    <footer className="vg-mm-foot"><Btn kind="ghost" onClick={() => send('Escape')}>← VOLVER</Btn></footer>
  </Screen>;
}

// ---------------------------------------------------------------- cómo jugar (táctil)
const HOW = [
  ['move', 'MOVERTE', 'Pon el pulgar a la izquierda y deslízalo.'],
  ['fire', 'DISPARAR', 'Mantén el botón rosa: apunta solo. Arrástralo para apuntar tú.'],
  ['dash', 'ESQUIVAR', 'Esquiva balas y golpes. Tiene recarga.'],
  ['use', 'USAR', 'Aparece junto a cofres, puertas, tiendas y objetos.'],
  ['quack', 'CUAC', 'Tu objeto activo. Úsalo cuando muestre “!”.'],
  ['weapon', 'ARMA', 'Cambia entre tus dos armas.'],
  ['pause', 'PAUSA', 'Toca ❚❚ en la esquina de arriba.'],
  ['map', 'MAPA', 'Toca el minimapa para ver el piso.'],
] as const;
function HowTo({ send }: { send: Send }) {
  return <Screen accent="#ffd45e" className="vg-mm-howto">
    <Head eyebrow="MANUAL DEL LADRÓN" title="CÓMO JUGAR" sub="Limpia cada sala, junta botín y roba los 6 pisos del banco." />
    <div className="vg-mm-how">
      {HOW.map(([k, t, d]) => <div key={k} className="vg-mm-how-card"><i className={`vg-mm-how-ic is-${k}`} /><span><b>{t}</b><small>{d}</small></span></div>)}
    </div>
    <div className="vg-mm-plan">
      {[['LIMPIA', 'abre puertas'], ['ÁRMATE', 'junta equipo'], ['CUÍDATE', 'el pan cura'], ['ROBA', 'vence al jefe'], ['PLANEA', 'usa el mapa']].map(([t, d], i) =>
        <span key={t}><em>{String(i + 1).padStart(2, '0')}</em><b>{t}</b><small>{d}</small></span>)}
    </div>
    <footer className="vg-mm-foot"><Btn kind="ghost" onClick={() => send('Escape')}>← VOLVER</Btn></footer>
  </Screen>;
}

// ---------------------------------------------------------------- mejoras
function Upgrades({ e, send }: { e: GameEngine; send: Send }) {
  return <Screen accent="#8fe8b0">
    <Head eyebrow="TALLER CLANDESTINO" title="MEJORAS" sub="Ventajas permanentes para el Atraco y Sin Fin." right={<Coins e={e} />} />
    <div className="vg-mm-list">
      {META_UPGRADES.map((up, i) => {
        const lvl = e.metaLevels[up.id] ?? 0, maxed = lvl >= up.maxLevel, cost = up.cost * (lvl + 1), can = e.totalGoldenCrumbs >= cost;
        return <div key={up.id} className="vg-mm-upg">
          <span><b>{up.name}</b><small>{up.description}</small>
            <i className="vg-mm-pips">{Array.from({ length: up.maxLevel }, (_, l) => <em key={l} className={l < lvl ? 'is-on' : ''} />)}</i></span>
          <Btn kind={maxed ? 'good' : 'primary'} disabled={maxed || !can} onClick={() => { e.upgradeIndex = i; send('Enter'); }}>
            {maxed ? 'AL MÁXIMO' : <>MEJORAR · <ItemIcon id="golden_crumb" size={16} />{cost}</>}
          </Btn>
        </div>;
      })}
    </div>
    <footer className="vg-mm-foot"><Btn kind="ghost" onClick={() => send('Escape')}>← VOLVER</Btn></footer>
  </Screen>;
}

// ---------------------------------------------------------------- reingreso
function Resume({ e, send }: { e: GameEngine; send: Send }) {
  const heist = e.pendingMode === 'heist';
  const diff = heist ? e.heistCheckpointDifficulty : e.endlessCheckpointDifficulty;
  const pick = (i: number) => { e.endlessResumeIndex = i; send('Enter'); };
  return <Screen accent={heist ? '#ffd45e' : '#ff7a6b'} className="vg-mm-center">
    <div className="vg-mm-dialog">
      <span className="vg-mm-eyebrow">PARTIDA GUARDADA</span>
      <h1>{heist ? 'PISO ' + e.heistCheckpointFloor : 'RONDA ' + e.endlessCheckpointRound}</h1>
      <p>{heist ? 'Atraco principal' : 'Atraco sin fin'}{diff ? ' · ' + DIFFICULTIES[diff].label : ''}</p>
      <div className="vg-mm-col">
        <Btn kind="primary" onClick={() => pick(0)}>▶ CONTINUAR</Btn>
        <Btn kind="danger" onClick={() => pick(1)}>EMPEZAR DE NUEVO</Btn>
        <Btn kind="ghost" onClick={() => send('Escape')}>← VOLVER</Btn>
      </div>
    </div>
  </Screen>;
}

// ---------------------------------------------------------------- armario
function Wardrobe({ e, send }: { e: GameEngine; send: Send }) {
  const sel = Math.max(0, Math.min(SKINS.length - 1, e.wardrobeIndex));
  const skin = SKINS[sel];
  const owned = e.unlockedSkins.includes(skin.id), equipped = e.equippedSkin === skin.id;
  const label = equipped ? '✓ EQUIPADO' : owned ? 'EQUIPAR' : `COMPRAR · ${skin.cost}`;
  return <Screen accent="#79d2ff">
    <Head eyebrow="IDENTIDAD DEL PATO" title="ARMARIO" sub={`Aspectos ${e.unlockedSkins.length}/${SKINS.length} · sólo cambian cómo te ves.`} right={<Coins e={e} />} />
    <div className="vg-mm-ward">
      <div className="vg-mm-ward-preview">
        <Duck skin={skin.id} size={96} frame={e.frame} dir="down" />
        <b>{skin.name}</b>
        <small>{skin.description}</small>
      </div>
      <div className="vg-mm-ward-grid">
        {SKINS.map((k, i) => {
          const has = e.unlockedSkins.includes(k.id), on = i === sel, eq = e.equippedSkin === k.id;
          return <button key={k.id} type="button" className={`vg-mm-skin${on ? ' is-on' : ''}${has ? '' : ' is-locked'}`} onClick={() => { e.wardrobeIndex = i; }}>
            <Duck skin={k.id} size={46} />
            <span>{k.name.replace(/^PATO /, '')}</span>
            {eq ? <i className="is-eq">✓</i> : !has && <i><ItemIcon id="golden_crumb" size={12} />{k.cost}</i>}
          </button>;
        })}
      </div>
    </div>
    <footer className="vg-mm-foot">
      <Btn kind="ghost" onClick={() => send('Escape')}>← VOLVER</Btn>
      <Btn kind="primary" disabled={equipped || (!owned && e.totalGoldenCrumbs < skin.cost)} onClick={() => { e.wardrobeIndex = sel; send('Enter'); }}>{label}</Btn>
    </footer>
  </Screen>;
}

// ---------------------------------------------------------------- info de la partida
function RunInfo({ e, send }: { e: GameEngine; send: Send }) {
  const p = e.player, r = e.run, s = e.stats, endless = e.gameMode === 'endless';
  const tab = e.runInfoTab;
  const active = p.activeItem ? ACTIVE_ITEMS[p.activeItem] : null;
  const metrics: [string, string][] = [
    [endless ? 'RONDA' : 'PISO', endless ? String(e.endless.round) : r.floorReached + '/' + TOTAL_FLOORS], ['SALAS', String(s.roomsCleared)],
    ['ENEMIGOS', String(s.enemiesDefeated)], ['JEFES', String(r.bosses)], ['DAÑO HECHO', String(Math.round(r.dmgDealt))],
    ['DAÑO RECIBIDO', String(Math.round(r.dmgTaken * 10) / 10)], [endless ? 'MIGAS' : 'MIGAJAS', String(Math.floor(p.crumbs))], ['TIEMPO', fmtTime(r.time)],
  ];
  return <Screen accent="#79d2ff">
    <Head eyebrow="TU PARTIDA" title={tab === 0 ? 'MI EQUIPO' : 'RENDIMIENTO'} right={<div className="vg-mm-tabs">
      <button type="button" className={tab === 0 ? 'is-on' : ''} onClick={() => { e.runInfoTab = 0; }}>EQUIPO</button>
      <button type="button" className={tab === 1 ? 'is-on' : ''} onClick={() => { e.runInfoTab = 1; }}>RENDIMIENTO</button>
    </div>} />
    {tab === 0 ? <div className="vg-mm-build">
      <div className="vg-mm-build-col">
        {p.weapons.map((w, i) => w ? <div key={i} className="vg-mm-gear" style={{ ['--a' as string]: RARITY_COLORS[WEAPONS[w.id]?.rarity ?? 0] }}>
          <ItemIcon id={w.id} size={40} /><span><small>ARMA {i + 1}{i === p.activeWeapon ? ' · EN MANO' : ''}</small><b>{WEAPONS[w.id]?.name ?? w.id}</b><em>{WEAPONS[w.id]?.special}</em></span>
        </div> : <div key={i} className="vg-mm-gear is-empty"><span><small>ARMA {i + 1}</small><b>VACÍO</b></span></div>)}
        <div className="vg-mm-gear" style={{ ['--a' as string]: '#ffb070' }}>
          {active ? <><ItemIcon id={active.id} size={40} /><span><small>OBJETO ACTIVO · CUAC</small><b>{active.name}</b><em>{active.description}</em></span></>
            : <span><small>OBJETO ACTIVO · CUAC</small><b>NINGUNO</b></span>}
        </div>
      </div>
      <div className="vg-mm-build-items">
        <small>OBJETOS ({p.items.length})</small>
        {p.items.length ? <div className="vg-mm-items">{p.items.map((id, i) => {
          const def = ITEMS[id];
          return <span key={id + i} className="vg-mm-item" style={{ ['--a' as string]: def ? RARITY_COLORS[def.rarity] : '#8a80ad' }}>
            <ItemIcon id={id} size={30} /><b>{def?.name ?? id}</b><em>{def?.description}</em></span>;
        })}</div> : <p className="vg-mm-empty">Aún no tienes objetos. Ábrelos en cofres y salas de tesoro.</p>}
      </div>
    </div>
      : <div className="vg-mm-stats is-wide">{metrics.map(([k, v]) => <div key={k}><small>{k}</small><b>{v}</b></div>)}</div>}
    <footer className="vg-mm-foot"><Btn kind="ghost" onClick={() => send('Escape')}>← VOLVER A LA PAUSA</Btn></footer>
  </Screen>;
}

// ---------------------------------------------------------------- barra táctil para pantallas del canvas
function NavBar({ e, send }: { e: GameEngine; send: Send }) {
  const bar = (children: ReactNode) => <div className="vg-mm-bar" onPointerDown={ev => ev.stopPropagation()}>{children}</div>;
  if (e.swap || e.activeSwap) return bar(<><Btn kind="ghost" onClick={() => send('Escape')}>CANCELAR</Btn><Btn kind="primary" onClick={() => send('Enter')}>CONFIRMAR CAMBIO</Btn></>);
  switch (e.state) {
    case GameState.COLLECTION:
      return bar(<><Btn kind="ghost" onClick={() => send('Escape')}>← VOLVER</Btn><span className="vg-mm-note">Toca una pestaña o una ficha</span><Btn onClick={() => send('p')}>CARRERA</Btn></>);
    case GameState.CAREER: case GameState.CONTROLS:
      return bar(<Btn kind="ghost" onClick={() => send('Escape')}>← VOLVER</Btn>);
    case GameState.MAP:
      return bar(<><span className="vg-mm-note">Toca una sala para ver qué hay</span><Btn kind="primary" onClick={() => send('Escape')}>CERRAR MAPA</Btn></>);
    case GameState.ENDLESS_REWARD:
      return bar(<><Btn kind="ghost" onClick={() => send('Escape')}>SALIR</Btn><Btn onClick={() => send(e.bindings.recycle)}>♻ RECICLAR</Btn><Btn kind="primary" onClick={() => send('Enter')}>TOMAR ▶</Btn></>);
    case GameState.DAILY_BRIEF:
      return bar(<><Btn kind="ghost" onClick={() => send('Escape')}>← VOLVER</Btn><Btn kind="primary" onClick={() => send('Enter')}>INICIAR DESAFÍO ▶</Btn></>);
    case GameState.GAME_OVER: case GameState.VICTORY:
      return bar(<><Btn kind="ghost" onClick={() => { e.pauseIndex = 1; send('Enter'); }}>⌂ MENÚ PRINCIPAL</Btn><Btn kind="primary" onClick={() => { e.pauseIndex = 0; send('Enter'); }}>↻ OTRO INTENTO</Btn></>);
    default: return null;
  }
}

export default function MobileMenus({ getEngine, send }: { getEngine: () => GameEngine | null; send: Send }) {
  useTick(getEngine);
  const e = getEngine();
  if (!e) return null;
  if (mobileDomMenu(e)) {
    switch (e.state) {
      case GameState.MENU: return <MainMenu e={e} send={send} />;
      case GameState.DIFFICULTY: return <Difficulty e={e} send={send} />;
      case GameState.PAUSED: return <Pause e={e} send={send} />;
      case GameState.CONFIRM: return <Confirm e={e} send={send} />;
      case GameState.SETTINGS: return <Settings e={e} send={send} />;
      case GameState.HOW_TO_PLAY: return <HowTo send={send} />;
      case GameState.UPGRADES: return <Upgrades e={e} send={send} />;
      case GameState.ENDLESS_RESUME: return <Resume e={e} send={send} />;
      case GameState.WARDROBE: return <Wardrobe e={e} send={send} />;
      case GameState.RUN_INFO: return <RunInfo e={e} send={send} />;
      case GameState.GAME_OVER: case GameState.VICTORY: return <EndScreen e={e} send={send} />;
    }
  }
  return <NavBar e={e} send={send} />;
}
