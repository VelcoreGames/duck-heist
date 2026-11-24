import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { touchState } from './game/touchInput';
import type { PadAction } from './game/gamepad';

// Controles en pantalla de Duck Heist Móvil:
//  · mitad izquierda: stick para moverse (aparece donde pongas el pulgar)
//  · mitad derecha: stick para apuntar y disparar (con ayuda de puntería)
//  · botones: ESQUIVAR, USAR, CUAC, ARMA, y arriba PAUSA, MAPA y AUTO.
const RADIUS = 54;

type Stick = { id: number; ox: number; oy: number; kx: number; ky: number } | null;

function useStick(kind: 'move' | 'aim') {
  const [stick, setStick] = useState<Stick>(null);
  const ref = useRef<Stick>(null);
  const write = (x: number, y: number, active: boolean) => {
    const dead = .14, m = Math.hypot(x, y);
    const k = m < dead ? 0 : Math.min(1, (m - dead) / (1 - dead)) / (m || 1);
    if (kind === 'move') { touchState.move.x = x * k; touchState.move.y = y * k; }
    else { touchState.aim.x = x * k; touchState.aim.y = y * k; touchState.aim.active = active; }
  };
  const handlers = {
    onPointerDown: (ev: RPointerEvent<HTMLDivElement>) => {
      if (ref.current) return;
      ev.currentTarget.setPointerCapture(ev.pointerId);
      const s = { id: ev.pointerId, ox: ev.clientX, oy: ev.clientY, kx: 0, ky: 0 };
      ref.current = s; setStick(s); write(0, 0, true);
    },
    onPointerMove: (ev: RPointerEvent<HTMLDivElement>) => {
      const s = ref.current; if (!s || s.id !== ev.pointerId) return;
      let dx = ev.clientX - s.ox, dy = ev.clientY - s.oy;
      const d = Math.hypot(dx, dy);
      if (d > RADIUS) { dx = dx / d * RADIUS; dy = dy / d * RADIUS; }
      const n = { ...s, kx: dx, ky: dy }; ref.current = n; setStick(n);
      write(dx / RADIUS, dy / RADIUS, true);
    },
    onPointerUp: (ev: RPointerEvent<HTMLDivElement>) => {
      const s = ref.current; if (!s || s.id !== ev.pointerId) return;
      ref.current = null; touchState.learned[kind] = true; setStick(null); write(0, 0, false);
    },
  };
  return { stick, handlers: { ...handlers, onPointerCancel: handlers.onPointerUp } };
}

function StickView({ stick, color }: { stick: Stick; color: string }) {
  if (!stick) return null;
  return <>
    <span className="vg-tc-base" style={{ left: stick.ox, top: stick.oy, borderColor: color }} />
    <span className="vg-tc-knob" style={{ left: stick.ox + stick.kx, top: stick.oy + stick.ky, background: color }} />
  </>;
}

const HOLD_MS = 420;

function Btn({ action, label, className, color, hold }: { action: PadAction; label: string; className: string; color: string; hold?: PadAction }) {
  const [down, setDown] = useState(false);
  const timer = useRef<number | null>(null);
  const held = useRef(false);
  const press = (ev: RPointerEvent) => {
    ev.stopPropagation(); ev.preventDefault();
    (ev.currentTarget as HTMLElement).setPointerCapture?.(ev.pointerId);
    setDown(true); held.current = false;
    if (hold) {
      // Toque = acción normal (al soltar). Mantener = acción secundaria (p. ej. USAR → RECICLAR).
      timer.current = window.setTimeout(() => {
        held.current = true; touchState.queue.push(hold);
        try { navigator.vibrate?.(24); } catch { /* opcional */ }
      }, HOLD_MS);
    } else {
      touchState.pressed.add(action); touchState.queue.push(action);
    }
    try { navigator.vibrate?.(action === 'dash' ? 14 : 8); } catch { /* opcional */ }
  };
  const release = (ev: RPointerEvent) => {
    ev.stopPropagation();
    if (timer.current !== null) { window.clearTimeout(timer.current); timer.current = null; }
    if (hold && !held.current && down) touchState.queue.push(action);
    touchState.pressed.delete(action); setDown(false);
  };
  return <button type="button" className={`vg-tc-btn ${className}${down ? ' is-down' : ''}${down && hold ? ' is-holding' : ''}`} style={{ ['--c' as string]: color }}
    onPointerDown={press} onPointerUp={release} onPointerCancel={release} onContextMenu={e => e.preventDefault()}>{label}</button>;
}

export default function TouchControls({ playing, onFullscreen }: { playing: boolean; onFullscreen: () => void }) {
  const move = useStick('move'), aim = useStick('aim');
  const [auto, setAuto] = useState(touchState.auto);
  const [portrait, setPortrait] = useState(() => window.innerHeight > window.innerWidth);
  useEffect(() => {
    const on = () => setPortrait(window.innerHeight > window.innerWidth * 1.05);
    window.addEventListener('resize', on); window.addEventListener('orientationchange', on);
    return () => { window.removeEventListener('resize', on); window.removeEventListener('orientationchange', on); };
  }, []);
  useEffect(() => { if (!playing) { touchState.move.x = touchState.move.y = 0; touchState.aim.active = false; touchState.pressed.clear(); } }, [playing]);

  return <>
    {portrait && <div className="vg-tc-rotate" role="dialog" aria-label="Gira tu celular">
      <div className="vg-tc-rotate-phone" aria-hidden="true" />
      <b>GIRA TU CELULAR</b>
      <span>Duck Heist se juega en horizontal.</span>
      <button type="button" onClick={onFullscreen}>PANTALLA COMPLETA</button>
    </div>}
    {playing && !portrait && <div className="vg-tc" aria-label="Controles táctiles">
      <div className="vg-tc-zone vg-tc-left" {...move.handlers}><StickView stick={move.stick} color="#8fe8b0" /></div>
      <div className="vg-tc-zone vg-tc-right" {...aim.handlers}><StickView stick={aim.stick} color="#ff4f8b" /></div>
      {!move.stick && !touchState.learned.move && <span className="vg-tc-ghost vg-tc-ghost-l">◀ DESLIZA PARA MOVER ▶</span>}
      {!aim.stick && !touchState.learned.aim && <span className="vg-tc-ghost vg-tc-ghost-r">DESLIZA PARA APUNTAR Y DISPARAR</span>}
      <Btn action="dash" label="ESQUIVAR" className="vg-tc-dash" color="#8fe8b0" />
      <Btn action="interact" hold="recycle" label="USAR" className="vg-tc-use" color="#ffd45e" />
      <Btn action="active" label="CUAC" className="vg-tc-quack" color="#ffb070" />
      <Btn action="nextWeapon" label="ARMA" className="vg-tc-weapon" color="#c9a0ff" />
      <div className="vg-tc-top">
        <Btn action="pause" label="❚❚" className="vg-tc-small" color="#fff1d6" />
        <Btn action="map" label="MAPA" className="vg-tc-small" color="#8ff0e6" />
        <button type="button" className={`vg-tc-btn vg-tc-small${auto ? ' is-on' : ''}`} style={{ ['--c' as string]: '#ff4f8b' }}
          onPointerDown={e => { e.stopPropagation(); touchState.auto = !touchState.auto; setAuto(touchState.auto); }}>{auto ? 'AUTO ✓' : 'AUTO'}</button>
        <button type="button" className="vg-tc-btn vg-tc-small" style={{ ['--c' as string]: '#fff1d6' }}
          onPointerDown={e => { e.stopPropagation(); onFullscreen(); }}>⛶</button>
      </div>
    </div>}
  </>;
}
