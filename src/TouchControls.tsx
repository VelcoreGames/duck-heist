import { useEffect, useRef, useState, type PointerEvent as RPointerEvent, type ReactNode } from 'react';
import { touchState } from './game/touchInput';
import { GameState } from './game/constants';
import type { PadAction } from './game/gamepad';
import type { GameEngine } from './game/types';
import { activeWeapon } from './game/engine';
import { getBuild } from './game/itemRules';
import { drawItem, drawWeaponIcon } from './game/sprites';

// Controles en pantalla de Duck Heist Móvil (estilo twin-stick de celular):
//  · izquierda: stick para moverse; descansa abajo a la izquierda y aparece donde pongas el pulgar.
//  · derecha: botón grande de DISPARO. Mantener = dispara al enemigo más cercano;
//    arrastrar desde el botón = apuntas tú.
//  · alrededor del disparo: ESQUIVAR (con recarga), ARMA (muestra tu arma), CUAC (tu objeto activo)
//    y USAR, que sólo aparece cuando hay algo que abrir, tomar o comprar.
//  · la pausa y el mapa están en el HUD de arriba (se tocan directo).
const MOVE_RADIUS = 52;
const HOLD_MS = 420;

type Snapshot = {
  weapon: string | null; weapons: number; meter: number; meterKind: 'ready' | 'heat' | 'charge'; overheat: boolean;
  item: string | null; itemReady: boolean; itemRatio: number;
  dash: number; use: string | null; recycle: boolean;
};

function snapshotOf(e: GameEngine | null): Snapshot | null {
  if (!e) return null;
  const p = e.player;
  const w = p.weapons[p.activeWeapon] ? activeWeapon(p) : null;
  let meter = 1, meterKind: Snapshot['meterKind'] = 'ready';
  if (w?.id === 'feather_gun') { meter = Math.min(1, p.heat / 100); meterKind = 'heat'; }
  else if (w && (w.id === 'plasma_baker' || w.id === 'golden_egg_revolver' || w.id === 'baguette_sniper')) { meter = Math.min(1, p.charge / 70); meterKind = 'charge'; }
  else if (w) meter = Math.max(0, Math.min(1, 1 - p.fireCooldown / Math.max(1, w.fireRate)));
  const dashMax = 45 * getBuild(p).dashCooldown;
  return {
    weapon: w?.id ?? null, weapons: p.weapons.filter(Boolean).length, meter: Math.round(meter * 40) / 40, meterKind, overheat: p.overheat > 0,
    item: p.activeItem ?? null, itemReady: !!p.activeItem && p.activeItemCooldown <= 0,
    itemRatio: p.activeItem ? Math.round((1 - p.activeItemCooldown / Math.max(1, p.activeItemMaxCooldown)) * 40) / 40 : 0,
    dash: Math.round(Math.max(0, Math.min(1, 1 - p.dashCooldown / Math.max(1, dashMax))) * 40) / 40,
    use: e.touchUse ?? null, recycle: !!e.touchRecycle,
  };
}

function useEngineSnapshot(getEngine: () => GameEngine | null, active: boolean) {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  useEffect(() => {
    if (!active) return;
    let raf = 0, last = 0, key = '';
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      if (t - last < 60) return;
      last = t;
      const s = snapshotOf(getEngine()), k = JSON.stringify(s);
      if (k !== key) { key = k; setSnap(s); }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [getEngine, active]);
  return snap;
}

/** Ícono pixel-art del juego (arma u objeto) dibujado en un canvas pequeño. */
function SpriteIcon({ kind, id }: { kind: 'weapon' | 'item'; id: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, c.width, c.height);
    ctx.imageSmoothingEnabled = false; ctx.scale(2, 2);
    try { if (kind === 'weapon') drawWeaponIcon(ctx, 2, 7, id); else drawItem(ctx, 4, 4, id, 0); } catch { /* ícono opcional */ }
  }, [kind, id]);
  return <canvas ref={ref} width={48} height={48} className="vg-tc-sprite" aria-hidden="true" />;
}

const vibrate = (ms: number) => { try { navigator.vibrate?.(ms); } catch { /* opcional */ } };

function MoveStick() {
  const [stick, setStick] = useState<{ id: number; ox: number; oy: number; kx: number; ky: number } | null>(null);
  const ref = useRef(stick);
  const write = (x: number, y: number) => {
    const m = Math.hypot(x, y), dead = .12;
    const k = m < dead ? 0 : Math.min(1, (m - dead) / (1 - dead)) / (m || 1);
    touchState.move.x = x * k; touchState.move.y = y * k;
  };
  const end = (ev: RPointerEvent<HTMLDivElement>) => {
    if (!ref.current || ref.current.id !== ev.pointerId) return;
    ref.current = null; setStick(null); write(0, 0);
  };
  return <div className="vg-tc-zone vg-tc-left"
    onPointerDown={ev => {
      if (ref.current) return;
      ev.currentTarget.setPointerCapture(ev.pointerId);
      const s = { id: ev.pointerId, ox: ev.clientX, oy: ev.clientY, kx: 0, ky: 0 };
      ref.current = s; setStick(s); write(0, 0);
    }}
    onPointerMove={ev => {
      const s = ref.current; if (!s || s.id !== ev.pointerId) return;
      let dx = ev.clientX - s.ox, dy = ev.clientY - s.oy;
      const d = Math.hypot(dx, dy);
      // Si el pulgar se pasa del borde, el stick lo sigue (no hay que regresar al centro).
      if (d > MOVE_RADIUS) { const over = d - MOVE_RADIUS; s.ox += dx / d * over; s.oy += dy / d * over; dx = ev.clientX - s.ox; dy = ev.clientY - s.oy; }
      const n = { ...s, kx: dx, ky: dy }; ref.current = n; setStick(n);
      write(dx / MOVE_RADIUS, dy / MOVE_RADIUS);
    }}
    onPointerUp={end} onPointerCancel={end}>
    {stick
      ? <><span className="vg-tc-base is-live" style={{ left: stick.ox, top: stick.oy }} /><span className="vg-tc-knob" style={{ left: stick.ox + stick.kx, top: stick.oy + stick.ky }} /></>
      : <span className="vg-tc-home" aria-hidden="true"><span /></span>}
  </div>;
}

function FireButton({ snap }: { snap: Snapshot | null }) {
  const [state, setState] = useState<{ id: number; cx: number; cy: number; kx: number; ky: number } | null>(null);
  const ref = useRef(state);
  const end = (ev: RPointerEvent<HTMLDivElement>) => {
    if (!ref.current || ref.current.id !== ev.pointerId) return;
    ref.current = null; setState(null);
    touchState.fire.down = false; touchState.fire.x = touchState.fire.y = 0;
  };
  const radius = 46;
  const meter = snap?.meter ?? 1, kind = snap?.meterKind ?? 'ready';
  const ring = kind === 'heat' ? (snap?.overheat ? '#ff5d58' : meter > .7 ? '#ffa34e' : '#79d2ff') : kind === 'charge' ? (meter > .72 ? '#8fe8b0' : '#ffd45e') : '#ffd45e';
  // Sólo armas con calor o carga muestran anillo (el enfriamiento normal parpadearía a cada disparo).
  const showMeter = kind !== 'ready' && meter > .02;
  return <div className={`vg-tc-fire${state ? ' is-down' : ''}`}
    style={{ ['--p' as string]: showMeter ? meter : 0, ['--ring' as string]: ring }}
    onPointerDown={ev => {
      ev.preventDefault(); ev.stopPropagation();
      if (ref.current) return;
      ev.currentTarget.setPointerCapture(ev.pointerId);
      const r = ev.currentTarget.getBoundingClientRect();
      const s = { id: ev.pointerId, cx: r.left + r.width / 2, cy: r.top + r.height / 2, kx: 0, ky: 0 };
      ref.current = s; setState(s);
      touchState.fire.down = true; touchState.fire.x = touchState.fire.y = 0; vibrate(8);
    }}
    onPointerMove={ev => {
      const s = ref.current; if (!s || s.id !== ev.pointerId) return;
      let dx = ev.clientX - s.cx, dy = ev.clientY - s.cy;
      const d = Math.hypot(dx, dy);
      if (d > radius) { dx = dx / d * radius; dy = dy / d * radius; }
      const n = { ...s, kx: dx, ky: dy }; ref.current = n; setState(n);
      touchState.fire.x = dx / radius; touchState.fire.y = dy / radius;
    }}
    onPointerUp={end} onPointerCancel={end} onContextMenu={e => e.preventDefault()}
    role="button" aria-label="Disparar">
    <span className="vg-tc-fire-ring" />
    <span className="vg-tc-fire-face" style={state ? { transform: `translate(${state.kx * .55}px, ${state.ky * .55}px)` } : undefined}>
      <svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="9" /><path d="M16 2v7M16 23v7M2 16h7M23 16h7" /><circle cx="16" cy="16" r="2.4" className="dot" /></svg>
    </span>
    {state && Math.hypot(state.kx, state.ky) > 14 && <span className="vg-tc-aimline" style={{ transform: `rotate(${Math.atan2(state.ky, state.kx)}rad)` }} />}
  </div>;
}

function ActionBtn({ action, hold, className, color, label, ratio, dim, children }: {
  action: PadAction; hold?: PadAction; className: string; color: string; label: string;
  ratio?: number; dim?: boolean; children?: ReactNode;
}) {
  const [down, setDown] = useState(false);
  const timer = useRef<number | null>(null);
  const held = useRef(false);
  const press = (ev: RPointerEvent) => {
    ev.stopPropagation(); ev.preventDefault();
    (ev.currentTarget as HTMLElement).setPointerCapture?.(ev.pointerId);
    setDown(true); held.current = false;
    if (hold) {
      // Tocar = acción normal (al soltar). Mantener = acción secundaria (USAR → RECICLAR).
      timer.current = window.setTimeout(() => { held.current = true; touchState.queue.push(hold); vibrate(24); }, HOLD_MS);
    } else { touchState.pressed.add(action); touchState.queue.push(action); }
    vibrate(action === 'dash' ? 14 : 8);
  };
  const release = (ev: RPointerEvent) => {
    ev.stopPropagation();
    if (timer.current !== null) { window.clearTimeout(timer.current); timer.current = null; }
    if (hold && !held.current && down) touchState.queue.push(action);
    touchState.pressed.delete(action); setDown(false);
  };
  const cooling = ratio !== undefined && ratio < .999;
  return <button type="button" aria-label={label}
    className={`vg-tc-btn ${className}${down ? ' is-down' : ''}${down && hold ? ' is-holding' : ''}${cooling ? ' is-cooling' : ''}${dim ? ' is-dim' : ''}`}
    style={{ ['--c' as string]: color, ['--p' as string]: ratio ?? 1 }}
    onPointerDown={press} onPointerUp={release} onPointerCancel={release} onContextMenu={e => e.preventDefault()}>
    {children}
  </button>;
}

/** Los controles sólo se muestran jugando (no en menús, ni al cambiar de arma). */
function usePlaying(getEngine: () => GameEngine | null) {
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const e = getEngine();
      const now = !!e && e.state === GameState.PLAYING && !e.swap && !e.activeSwap;
      setPlaying(p => p === now ? p : now);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [getEngine]);
  return playing;
}

export default function TouchControls({ onFullscreen, getEngine }: {
  onFullscreen: () => void; getEngine: () => GameEngine | null;
}) {
  const playing = usePlaying(getEngine);
  const [portrait, setPortrait] = useState(() => window.innerHeight > window.innerWidth);
  const askedFs = useRef(false);
  const snap = useEngineSnapshot(getEngine, playing && !portrait);
  useEffect(() => {
    const on = () => setPortrait(window.innerHeight > window.innerWidth * 1.05);
    window.addEventListener('resize', on); window.addEventListener('orientationchange', on);
    return () => { window.removeEventListener('resize', on); window.removeEventListener('orientationchange', on); };
  }, []);
  useEffect(() => {
    if (!playing) { touchState.move.x = touchState.move.y = 0; touchState.fire.down = false; touchState.pressed.clear(); }
  }, [playing]);

  // Pantalla completa automática al primer toque de la partida (donde el navegador lo permite).
  const firstTouch = () => {
    if (askedFs.current) return;
    askedFs.current = true;
    if (!document.fullscreenElement && document.fullscreenEnabled) onFullscreen();
  };

  const swap = (snap?.weapons ?? 0) > 1;
  return <>
    {portrait && <div className="vg-tc-rotate" role="dialog" aria-label="Gira tu celular">
      <div className="vg-tc-rotate-phone" aria-hidden="true" />
      <b>GIRA TU CELULAR</b>
      <span>Duck Heist se juega en horizontal.</span>
      <button type="button" onClick={onFullscreen}>PANTALLA COMPLETA</button>
    </div>}
    {playing && !portrait && <div className="vg-tc" aria-label="Controles táctiles" onPointerDownCapture={firstTouch}>
      <MoveStick />
      <FireButton snap={snap} />
      <ActionBtn action="dash" className="vg-tc-dash" color="#8fe8b0" label="Esquivar" ratio={snap?.dash}>
        <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 10h13M3 16h17M7 22h11" /><path d="M19 8l8 8-8 8" /></svg>
        <small>ESQUIVAR</small>
      </ActionBtn>
      {snap?.weapon && <ActionBtn action="nextWeapon" className="vg-tc-weapon" color="#c9a0ff" label="Cambiar arma" dim={!swap}>
        <SpriteIcon kind="weapon" id={snap.weapon} />
        {swap && <i className="vg-tc-badge">⇄</i>}
        <small>ARMA</small>
      </ActionBtn>}
      {snap?.item && <ActionBtn action="active" className="vg-tc-quack" color="#ffb070" label="Usar objeto activo" ratio={snap.itemReady ? 1 : snap.itemRatio}>
        <SpriteIcon kind="item" id={snap.item} />
        {snap.itemReady && <i className="vg-tc-badge is-ready">!</i>}
        <small>CUAC</small>
      </ActionBtn>}
      {snap?.use && <ActionBtn action="interact" hold={snap.recycle ? 'recycle' : undefined} className="vg-tc-use" color="#ffd45e" label={snap.use}>
        <svg className="vg-tc-use-icon" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="13" r="5" /><path d="M16 18v10M9.5 6.5a9 9 0 0 1 13 0" /></svg>
        <span className="vg-tc-use-text">{snap.use}{snap.recycle && <small>MANTÉN: RECICLAR</small>}</span>
      </ActionBtn>}
    </div>}
  </>;
}
