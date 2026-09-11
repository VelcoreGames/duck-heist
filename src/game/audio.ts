// Audio procedural: efectos sintetizados + música generativa
let audioCtx: AudioContext | null = null;

let masterVol = 0.9;
let musicVol = 0.45;
let sfxVol = 0.9;

let musicTimer: number | null = null;
let musicStep = 0;
let musicMood: 'menu' | 'run' | 'boss' | 'off' = 'off';
let musicFloor=0;
let testMode=false;
export function setAudioTestMode(value:boolean) { testMode=value; }
let priorityUntil=0;
const lastSound:Record<string,number>={};
function allow(id:string,delay:number) {
  const now=performance.now();
  if(now-(lastSound[id] ?? -1e6)<delay) return false;
  lastSound[id]=now;return true;
}

export function setVolumes(master: number, music: number, sfx: number) {
  masterVol = Math.max(0, Math.min(1, master));
  musicVol = Math.max(0, Math.min(1, music));
  sfxVol = Math.max(0, Math.min(1, sfx));
}

function enabled() { return !testMode && masterVol > 0.001 && (sfxVol > 0.001 || musicVol > 0.001); }

function getCtx(): AudioContext {
  if (!enabled()) throw new Error('audio off');
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === 'suspended') void audioCtx.resume();
  return audioCtx;
}

export function initAudio() {
  if(testMode) return;
  try {
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') void audioCtx.resume();
  } catch { /* ignorar */ }
}

function out(vol: number, kind: 'sfx' | 'music') {
  const ctx = getCtx();
  const g = ctx.createGain();
  g.gain.value = vol * masterVol * (kind === 'sfx' ? sfxVol : musicVol);
  g.connect(ctx.destination);
  return g;
}

function blip(
  type: OscillatorType, from: number, to: number,
  dur: number, vol: number, delay = 0, kind: 'sfx' | 'music' = 'sfx',
) {
  if (!enabled() || (kind==='sfx'?sfxVol:musicVol)<=.001) return;
  try {
    const ctx = getCtx();
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = out(vol, kind);
    osc.connect(gain);
    osc.type = type;
    osc.frequency.setValueAtTime(from, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
    gain.gain.setValueAtTime(vol * masterVol * (kind==='sfx'?sfxVol:musicVol), t0);
    gain.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
    osc.onended=()=>{osc.disconnect();gain.disconnect();};
  } catch { /* ignorar */ }
}

function noise(dur: number, vol: number, delay = 0, decay = 0.25) {
  if (!enabled() || sfxVol<=.001) return;
  try {
    const ctx = getCtx();
    const t0 = ctx.currentTime + delay;
    const n = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (n * decay));
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = out(vol, 'sfx');
    src.connect(gain);
    gain.gain.setValueAtTime(vol * masterVol * sfxVol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
    src.start(t0);
    src.onended=()=>{src.disconnect();gain.disconnect();};
  } catch { /* ignorar */ }
}

// ---------------------------------------------------------------------------
// MÚSICA
// ---------------------------------------------------------------------------
const MENUS = [220, 0, 277, 0, 330, 0, 277, 0];
const RUN = [147, 0, 175, 0, 196, 175, 147, 0];
const BOSS = [131, 156, 131, 110, 131, 175, 156, 110];
const FLOOR_SEQ = [RUN,[147,220,0,175,147,0,233,196],[110,0,147,110,0,165,147,0],[147,175,208,0,196,175,147,233],[98,147,0,131,196,0,147,110],[82,123,164,0,110,147,98,0]];

export function setMusic(mood: 'menu' | 'run' | 'boss' | 'off',floor=musicFloor) {
  if(testMode) return;
  if (musicMood === mood && musicFloor===floor) return;
  musicFloor=floor;
  musicMood = mood;
  if (musicTimer !== null) { clearInterval(musicTimer); musicTimer = null; }
  if (mood === 'off') return;
  musicStep = 0;
  const bpm = mood === 'boss' ? 132 : mood === 'run' ? 108 : 84;
  const beat = 60000 / bpm / 2;
  musicTimer = window.setInterval(() => tickMusic(mood, beat), beat);
}

function tickMusic(mood: 'menu' | 'run' | 'boss', beat: number) {
  if (musicVol <= 0.001 || masterVol <= 0.001) return;
  const seq = mood === 'menu' ? MENUS : mood === 'run' ? FLOOR_SEQ[Math.min(5,musicFloor)] : BOSS;
  const f = seq[musicStep % seq.length];
  const s = musicStep % seq.length;
  if (f > 0) {
    blip(mood === 'menu' ? 'triangle' : 'square', f, f * 0.99, (beat / 1000) * 0.85,
      mood === 'menu' ? 0.030 : 0.026, 0, 'music');
    if (mood !== 'menu' && s % 2 === 0) {
      blip('triangle', f * 3, f * 3, (beat / 1000) * 0.4, 0.016, beat / 2000, 'music');
    }
  }
  if (mood !== 'menu' && s % 2 === 1) {
    try { noise(0.035, 0.012); } catch { /* ignorar */ }
  }
  musicStep++;
}

export function stopMusic() { setMusic('off'); }

// ---------------------------------------------------------------------------
// EFECTOS DE SONIDO REALISTAS Y PULIDOS
// ---------------------------------------------------------------------------

/** CUAC REALISTA: Síntesis de formante nasal de pato (3 variantes con tono natural) */
export function playQuack(variant?: number) {
  if (!enabled() || sfxVol<=.001) return;
  try {
    const ctx = getCtx();
    const v = variant !== undefined ? variant % 3 : Math.floor(Math.random() * 3);
    const pitches = [
      { base: 340, end: 220, dur: 0.16, peak: 440, f1: 750, f2: 1850 },
      { base: 380, end: 250, dur: 0.14, peak: 490, f1: 820, f2: 1950 },
      { base: 310, end: 200, dur: 0.18, peak: 400, f1: 700, f2: 1750 },
    ];
    const cfg = pitches[v];
    const t0 = ctx.currentTime;
    const dur = cfg.dur;

    // Oscilador de cuerdas vocales (diente de sierra rico en armónicos)
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(cfg.base, t0);
    osc.frequency.exponentialRampToValueAtTime(cfg.peak, t0 + dur * 0.25);
    osc.frequency.exponentialRampToValueAtTime(cfg.end, t0 + dur);

    // Formante nasal F1 (primer formante de pato)
    const filter1 = ctx.createBiquadFilter();
    filter1.type = 'bandpass';
    filter1.frequency.setValueAtTime(cfg.f1, t0);
    filter1.Q.setValueAtTime(4.5, t0);

    // Formante F2 (pico agudo del cuac)
    const filter2 = ctx.createBiquadFilter();
    filter2.type = 'bandpass';
    filter2.frequency.setValueAtTime(cfg.f2, t0);
    filter2.Q.setValueAtTime(5.5, t0);

    // Ganancia con envolvente de ataque percusivo y caída rápida
    const gain = out(0.12, 'sfx');
    gain.gain.setValueAtTime(0.001, t0);
    gain.gain.linearRampToValueAtTime(0.12 * masterVol * sfxVol, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.06 * masterVol * sfxVol, t0 + dur * 0.5);
    gain.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);

    osc.connect(filter1);
    filter1.connect(gain);

    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(cfg.base * 1.5, t0);
    osc2.frequency.exponentialRampToValueAtTime(cfg.end * 1.5, t0 + dur);
    osc2.connect(filter2);
    filter2.connect(gain);

    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
    osc2.start(t0);
    osc2.stop(t0 + dur + 0.02);
    osc2.onended=()=>{osc.disconnect();osc2.disconnect();filter1.disconnect();filter2.disconnect();gain.disconnect();};
  } catch { /* ignorar */ }
}

/** CUAC LISTO: timbre brillante + sutil chirrido de pato (suena UNA sola vez) */
export function playQuackReady() {
  if (!enabled()) return;
  try {
    blip('sine', 880, 1760, 0.18, 0.045, 0);
    blip('triangle', 1320, 2200, 0.14, 0.035, 0.04);
    blip('sawtooth', 520, 380, 0.08, 0.02, 0.08);
  } catch { /* ignorar */ }
}

/** DASH PULIDO: viento rápido + aleteo de plumas + aceleración */
export function playDash() {
  if (!enabled()) return;
  try {
    // Whoosh de aire
    noise(0.14, 0.065, 0, 0.12);
    // Aleteo de plumas
    blip('triangle', 280, 720, 0.09, 0.055, 0);
    blip('sine', 480, 240, 0.07, 0.04, 0.03);
  } catch { /* ignorar */ }
}

/** DASH LISTO: sonido corto de recarga/aire presurizado (suena UNA sola vez) */
export function playDashReady() {
  if (!enabled()) return;
  try {
    blip('sine', 420, 940, 0.08, 0.04, 0);
    blip('triangle', 940, 1400, 0.06, 0.035, 0.04);
  } catch { /* ignorar */ }
}

export function playShoot(weapon='quack_blaster') {
  if(!allow(weapon,weapon==='quack_laser'?100:32)) return;
  switch(weapon) {
    case 'breadcrumb_shotgun':noise(.13,.06);blip('triangle',140,45,.11,.06);break;
    case 'baguette_launcher':noise(.17,.05);blip('sine',95,33,.18,.075);break;
    case 'feather_gun':noise(.032,.019);blip('triangle',740,360,.035,.027);break;
    case 'quack_laser':blip('triangle',175,180,.14,.035);blip('sine',530,510,.14,.018);break;
    case 'golden_egg_revolver':noise(.1,.04);blip('triangle',410,75,.16,.06);break;
    case 'bread_boomerang':noise(.06,.02);blip('triangle',300,440,.08,.024);break;
    case 'rubber_duck_cannon':blip('sine',530,320,.09,.04);break;
    case 'tactical_toaster':noise(.05,.02);blip('square',220,90,.08,.04);break;
    case 'egg_cannon':blip('triangle',260,90,.1,.045);break;
    case 'baguette_sniper':noise(.08,.03);blip('sine',90,40,.16,.07);break;
    case 'plasma_baker':blip('sawtooth' as OscillatorType,180,420,.12,.05);break;
    case 'homing_crumbs':blip('sine',640,280,.05,.02);break;
    default:blip('square',680,230,.065,.025);
  }
}
export function playHit() { if(allow('hit',45)) blip('triangle',310,100,.055,.026); }
export function playPickup() {
  blip('sine', 520, 1180, 0.11, 0.05);
  blip('triangle', 880, 1560, 0.08, 0.03, 0.05);
}
export function playExplosion() { noise(0.24, 0.07); blip('sine', 160, 40, 0.22, 0.05); }
export function playHurt() { priorityUntil=performance.now()+400;blip('square', 210, 55, 0.18, 0.065); }
export function playEquip() {
  blip('square', 900, 1400, 0.04, 0.035);
  blip('triangle', 600, 1000, 0.06, 0.03, 0.03);
}
export function playWeaponSwap() {
  blip('square', 480, 900, 0.05, 0.045);
  noise(0.05, 0.02, 0.02);
}
export function playStairs() {
  [0, 1, 2, 3].forEach(i => blip('triangle', 300 + i * 130, 320 + i * 150, 0.1, 0.04, i * 0.09, 'sfx'));
}
export function playBossRoar() {
  priorityUntil=performance.now()+600;
  blip('sawtooth', 180, 60, 0.5, 0.06);
  noise(0.4, 0.04, 0.05);
}
export function playDoorLock() {
  noise(0.18, 0.06);
  blip('square', 260, 90, 0.16, 0.05);
  blip('square', 150, 60, 0.2, 0.045, 0.09);
}
export function playDoorUnlock() {
  blip('square', 300, 520, 0.09, 0.045);
  blip('square', 520, 780, 0.1, 0.045, 0.08);
  blip('sine', 780, 1100, 0.14, 0.04, 0.16);
  noise(0.12, 0.025, 0.02);
}
export function playUiMove() { if(allow('ui',50)) {noise(.022,.011);blip('triangle',240,145,.033,.022);} }
export function playUiSelect() {
  noise(.04,.018);
  blip('square', 540, 880, 0.07, 0.045);
  blip('square', 880, 1180, 0.09, 0.035, 0.06);
}
export function playUiBack() { blip('square', 480, 260, 0.09, 0.035); }
export function playDeny() { blip('square', 200, 140, 0.12, 0.04); }

export function playCoin() {
  if(!allow('coin',42)) return;
  const vol=performance.now()<priorityUntil?.006:.021;
  blip('sine',900+Math.random()*260,1400,.075,vol);
}
export function playHeal() { blip('sine',523,659,.13,.035);blip('sine',659,1047,.2,.03,.1); }
export function playCritical() {if(allow('crit',75)) {blip('triangle',920,320,.085,.035);noise(.04,.02);} }
export function playEnemyDeath() {if(allow('death',70)) {noise(.085,.023);blip('triangle',190,65,.09,.028);} }
export function playRoomClear() { [392,494,587,784].forEach((n,i)=>blip('triangle',n,n,.16,.031,i*.055)); }
export function playBossWin() { priorityUntil=performance.now()+700;noise(.4,.055);[262,330,392,524].forEach((n,i)=>blip('triangle',n,n,.35,.04,i*.11)); }
export function playRarityPickup(rarity:number) {
  playPickup(); if(rarity>=2) blip('sine',1047,1319,.2,.025,.09);
  if(rarity>=4) [784,1047,1319].forEach((n,i)=>blip('triangle',n,n,.36,.035,.15+i*.08));
}
export function playReturn() {if(allow('return',130)) blip('triangle',450,820,.09,.02);}
export function playBounce() {if(allow('bounce',80)) blip('sine',760,380,.08,.03);}
export function playFootstep() {if(allow('feet',180)) noise(.025,.007,0,.3);}
export function playDoorStyle(style:string) {
  if(style==='boss') playDoorLock();
  else if(style==='gold' || style==='purple') blip('sine',660,990,.18,.028);
  else if(style==='green') {blip('triangle',740,740,.06,.02);blip('triangle',980,980,.08,.02,.07);}
  else noise(.08,.018);
}

export function playDanger(kind:'aim'|'charge'|'camera'='aim') {
  if(!allow(`danger-${kind}`,220))return;
  priorityUntil=performance.now()+350;
  if(kind==='charge'){noise(.06,.03);blip('triangle',160,240,.14,.055);}
  else if(kind==='camera'){blip('square',480,520,.12,.034);blip('square',640,680,.12,.03,.14);}
  else {blip('sine',1000,1000,.08,.045);blip('sine',1300,1300,.08,.035,.1);}
}

/* legacy no-op export */
export function setSoundEnabled(v: boolean) { masterVol = v ? 0.9 : 0; }
