// Audio procedural: efectos sintetizados + música generativa
let audioCtx: AudioContext | null = null;

let masterVol = 0.9;
let musicVol = 0.45;
let sfxVol = 0.9;

let musicTimer: number | null = null;
let musicStep = 0;
let musicMood: 'menu' | 'run' | 'boss' | 'event' | 'off' = 'off';
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

let cachedNoiseBuffer:AudioBuffer|null=null;
function getNoiseBuffer(ctx:AudioContext){
  if(cachedNoiseBuffer&&cachedNoiseBuffer.sampleRate===ctx.sampleRate)return cachedNoiseBuffer;
  const n=ctx.sampleRate;
  const buf=ctx.createBuffer(1,n,ctx.sampleRate),data=buf.getChannelData(0);
  for(let i=0;i<n;i++)data[i]=Math.random()*2-1;
  cachedNoiseBuffer=buf;
  return buf;
}

function noise(dur: number, vol: number, delay = 0, decay = 0.25) {
  if (!enabled() || sfxVol<=.001) return;
  try {
    const ctx = getCtx();
    const t0 = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = getNoiseBuffer(ctx);
    const gain = out(vol, 'sfx');
    src.connect(gain);
    gain.gain.setValueAtTime(vol * masterVol * sfxVol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
    // Reutilizar ruido evita construir un AudioBuffer nuevo en cada disparo,
    // importante para subfusil/PDW/ametralladora ligera.
    const maxOffset=Math.max(0,1-dur-.01);
    src.start(t0,Math.random()*maxOffset,dur);
    src.onended=()=>{src.disconnect();gain.disconnect();};
    void decay;
  } catch { /* ignorar */ }
}

function tone(freq:number,dur:number,vol:number,opts:{type?:OscillatorType;delay?:number;to?:number;attack?:number;cutoff?:number;detune?:number;kind?:'sfx'|'music'}={}){
  if(!enabled())return;
  const kind=opts.kind??'sfx';
  if((kind==='sfx'?sfxVol:musicVol)<=.001)return;
  try{
    const ctx=getCtx(),t0=ctx.currentTime+(opts.delay??0),osc=ctx.createOscillator(),gain=out(vol,kind),filter=ctx.createBiquadFilter();
    osc.type=opts.type??'sine';osc.detune.value=opts.detune??0;osc.frequency.setValueAtTime(Math.max(1,freq),t0);
    if(opts.to&&opts.to!==freq)osc.frequency.exponentialRampToValueAtTime(Math.max(1,opts.to),t0+dur);
    filter.type='lowpass';filter.frequency.value=opts.cutoff??9000;filter.Q.value=.55;
    osc.connect(filter);filter.connect(gain);
    const peak=vol*masterVol*(kind==='sfx'?sfxVol:musicVol),attack=Math.min(dur*.35,opts.attack??.012);
    gain.gain.setValueAtTime(.0008,t0);gain.gain.exponentialRampToValueAtTime(Math.max(.001,peak),t0+Math.max(.003,attack));gain.gain.exponentialRampToValueAtTime(.0008,t0+dur);
    osc.start(t0);osc.stop(t0+dur+.02);osc.onended=()=>{osc.disconnect();filter.disconnect();gain.disconnect();};
  }catch{/* ignorar */}
}

function filteredNoise(dur:number,vol:number,opts:{delay?:number;type?:BiquadFilterType;freq?:number;q?:number;kind?:'sfx'|'music'}={}){
  if(!enabled())return;
  const kind=opts.kind??'sfx';
  if((kind==='sfx'?sfxVol:musicVol)<=.001)return;
  try{
    const ctx=getCtx(),t0=ctx.currentTime+(opts.delay??0),src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=out(vol,kind);
    src.buffer=getNoiseBuffer(ctx);filter.type=opts.type??'bandpass';filter.frequency.value=opts.freq??1800;filter.Q.value=opts.q??.8;
    src.connect(filter);filter.connect(gain);
    const peak=vol*masterVol*(kind==='sfx'?sfxVol:musicVol);gain.gain.setValueAtTime(Math.max(.001,peak),t0);gain.gain.exponentialRampToValueAtTime(.0008,t0+dur);
    src.start(t0,Math.random()*Math.max(0,1-dur-.01),dur);src.onended=()=>{src.disconnect();filter.disconnect();gain.disconnect();};
  }catch{/* ignorar */}
}

function chord(root:number,ratios:number[],dur:number,vol:number,delay=0,cutoff=1800){
  ratios.forEach((r,i)=>tone(root*r,dur,vol/(1+i*.32),{type:i===0?'sine':'triangle',delay:delay+i*.004,attack:.045,cutoff,detune:(i-1)*3,kind:'music'}));
}
function lowImpact(freq=58,vol=.05,delay=0,kind:'sfx'|'music'='sfx'){
  tone(freq,.20,vol,{type:'sine',to:Math.max(28,freq*.55),delay,attack:.004,cutoff:320,kind});
  filteredNoise(.07,vol*.42,{delay,type:'lowpass',freq:420,q:.5,kind});
}

// ---------------------------------------------------------------------------
// MÚSICA CINEMÁTICA PROCEDURAL
// ---------------------------------------------------------------------------
const RUN_ROOTS=[73.42,82.41,65.41,69.30,61.74,55.00];
const MINOR=[1,Math.pow(2,3/12),Math.pow(2,7/12),Math.pow(2,10/12)];
const DARK=[1,Math.pow(2,3/12),Math.pow(2,6/12),Math.pow(2,10/12)];

export function setMusic(mood:'menu'|'run'|'boss'|'event'|'off',floor=musicFloor){
  if(testMode)return;
  if(musicMood===mood&&musicFloor===floor)return;
  musicFloor=floor;musicMood=mood;
  if(musicTimer!==null){clearInterval(musicTimer);musicTimer=null;}
  if(mood==='off')return;
  musicStep=0;
  const bpm=mood==='boss'?74:mood==='event'?116:mood==='run'?94:68;
  const beat=60000/bpm/2;
  tickMusic(mood,beat);
  musicTimer=window.setInterval(()=>tickMusic(mood,beat),beat);
}

function tickMusic(mood:'menu'|'run'|'boss'|'event',beat:number){
  if(musicVol<=.001||masterVol<=.001)return;
  const step=musicStep++,sec=beat/1000;

  if(mood==='menu'){
    const roots=[73.42,65.41,58.27,65.41],root=roots[Math.floor(step/4)%roots.length];
    if(step%4===0){chord(root,[1,1.5,2],sec*3.8,.016,0,1050);tone(root/2,sec*3.6,.015,{type:'sine',attack:.18,cutoff:240,kind:'music'});}
    if(step%2===0)tone(root*2,sec*.7,.006,{type:'triangle',attack:.05,cutoff:1300,kind:'music'});
    return;
  }

  if(mood==='run'){
    const root=RUN_ROOTS[Math.min(5,musicFloor)]*(step%16>=8?Math.pow(2,-2/12):1);
    if(step%8===0)chord(root,MINOR,sec*7.2,.014,0,1500);
    if(step%2===0){
      tone(root/2,sec*.78,.020,{type:'sine',to:root/2*.97,attack:.008,cutoff:260,kind:'music'});
      filteredNoise(.055,.007,{type:'highpass',freq:3200,q:.55,kind:'music'});
    }
    if(step%4===2)tone(root*2,sec*.46,.006,{type:'triangle',attack:.015,cutoff:1700,kind:'music'});
    return;
  }

  if(mood==='event'){
    const root=65.41*(step%8>=4?Math.pow(2,2/12):1);
    if(step%4===0)chord(root,DARK,sec*3.6,.014,0,1350);
    lowImpact(step%8===0?52:64,.022,0,'music');
    if(step%2===1)filteredNoise(.065,.010,{type:'highpass',freq:2200,q:.8,kind:'music'});
    tone(root*(step%4===0?2:1.5),sec*.42,.007,{type:'sawtooth',attack:.01,cutoff:780,kind:'music'});
    return;
  }

  // Boss: fantasía oscura original; lenta, ceremonial y amenazante.
  const phase=step%16,root=[55,51.91,46.25,49][Math.floor(step/8)%4];
  if(phase===0||phase===8){
    lowImpact(43,phase===0?.060:.050,0,'music');
    chord(root/2,DARK,sec*7.6,.024,0,850);
    chord(root,[1,1.5,2.02],sec*5.8,.012,.03,1150);
  }
  if(phase===2||phase===10) chord(root,[2,2*Math.pow(2,3/12),3],sec*4.8,.010,0,1250);
  if(phase%2===0){
    const ost=[1,1,1.5,Math.pow(2,6/12)][(phase/2)%4];
    tone(root*ost,sec*.72,.016,{type:'sawtooth',to:root*ost*.985,attack:.035,cutoff:520,kind:'music'});
  }
  if(phase===0||phase===4||phase===8||phase===12||phase===14){
    lowImpact(phase===14?62:48,phase===14?.036:.030,0,'music');
    filteredNoise(.095,.010,{type:'lowpass',freq:520,q:.65,kind:'music'});
  }
  if(phase===6||phase===15){
    tone(116.54,sec*1.5,.008,{type:'triangle',to:110,attack:.006,cutoff:980,kind:'music'});
    tone(174.61,sec*1.2,.005,{type:'sine',attack:.006,cutoff:1200,kind:'music'});
  }
}

export function stopMusic(){setMusic('off');}

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
  const rapid=weapon==='feather_gun'||weapon==='quack_laser'||weapon==='homing_crumbs';
  if(!allow(weapon,rapid?45:weapon==='breadcrumb_shotgun'?120:weapon==='plasma_baker'?180:55)) return;

  // Todos son sonidos procedurales: ataque seco + cuerpo grave + cola corta,
  // ajustados por clase para que una 9 mm, escopeta, fusil y .50 no suenen igual.
  switch(weapon) {
    case 'quack_blaster': // pistola 9 mm
      noise(.050,.038);blip('triangle',520,145,.060,.040);blip('sine',135,82,.075,.025,.008);break;
    case 'breadcrumb_shotgun': // 12 ga
      noise(.115,.082);blip('triangle',175,48,.120,.070);blip('sine',82,42,.145,.052,.008);break;
    case 'feather_gun': // subfusil 9 mm
      noise(.034,.030);blip('square',610,185,.040,.030);blip('sine',155,95,.045,.017);break;
    case 'bread_boomerang': // carabina 5.56
      noise(.052,.043);blip('triangle',720,170,.055,.037);blip('sine',120,70,.075,.027,.006);break;
    case 'rubber_duck_cannon': // fusil 7.62
      noise(.070,.055);blip('triangle',470,92,.080,.048);blip('sine',95,48,.105,.040,.006);break;
    case 'baguette_launcher': // 40 mm
      noise(.125,.060);blip('sine',105,34,.160,.072);blip('triangle',225,74,.090,.030,.012);break;
    case 'quack_laser': // ametralladora ligera
      noise(.042,.038);blip('square',520,135,.047,.034);blip('sine',105,62,.060,.024);break;
    case 'golden_egg_revolver': // .357
      noise(.072,.060);blip('triangle',560,82,.095,.055);blip('sine',100,46,.125,.042,.006);break;
    case 'tactical_toaster': // .45 suprimida
      noise(.040,.020);blip('triangle',240,92,.065,.030);blip('sine',82,58,.070,.021);break;
    case 'egg_cannon': // DMR 7.62
      noise(.064,.050);blip('triangle',520,86,.080,.046);blip('sine',92,48,.110,.037,.006);break;
    case 'baguette_sniper': // .308 cerrojo
      noise(.085,.060);blip('triangle',430,62,.110,.058);blip('sine',82,38,.145,.047,.008);break;
    case 'plasma_baker': // .50
      noise(.120,.078);blip('sine',78,28,.190,.082);blip('triangle',310,52,.115,.052,.006);break;
    case 'homing_crumbs': // PDW 5.7
      noise(.030,.025);blip('square',780,235,.036,.027);blip('sine',175,110,.040,.014);break;
    default:
      noise(.045,.032);blip('triangle',480,120,.055,.032);
  }
}
export function playHit(){
  if(!allow('hit',38))return;
  filteredNoise(.040,.026,{type:'bandpass',freq:1150,q:.9});
  tone(145,.055,.018,{type:'sine',to:82,attack:.003,cutoff:520});
}
export function playPickup() {
  blip('sine', 520, 1180, 0.11, 0.05);
  blip('triangle', 880, 1560, 0.08, 0.03, 0.05);
}
export function playExplosion(){
  if(!allow('explosion',85))return;
  filteredNoise(.32,.070,{type:'lowpass',freq:1150,q:.45});
  filteredNoise(.11,.035,{type:'bandpass',freq:2100,q:.55});
  lowImpact(72,.068);
  tone(118,.24,.032,{type:'triangle',to:42,attack:.004,cutoff:520});
}
export function playHurt(){
  priorityUntil=performance.now()+400;
  filteredNoise(.10,.038,{type:'bandpass',freq:780,q:1.1});
  tone(185,.15,.055,{type:'sawtooth',to:72,attack:.004,cutoff:700});
}
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
export function playBossRoar(){
  priorityUntil=performance.now()+1100;
  filteredNoise(.72,.055,{type:'lowpass',freq:720,q:.55});
  tone(82,.72,.070,{type:'sawtooth',to:34,attack:.025,cutoff:620});
  tone(49,.86,.060,{type:'sine',to:29,attack:.02,cutoff:210});
  tone(123,.42,.022,{type:'triangle',to:61,delay:.08,attack:.018,cutoff:900});
  lowImpact(38,.075,.03);
}

export function playBossPhase(tier:'mini'|'sub'|'boss'='boss'){
  if(!enabled())return;
  priorityUntil=performance.now()+(tier==='boss'?900:tier==='sub'?700:520);
  const base=tier==='boss'?46:tier==='sub'?58:72;
  filteredNoise(tier==='boss'?.42:.28,tier==='boss'?.045:.032,{type:'lowpass',freq:tier==='boss'?680:900,q:.6});
  lowImpact(base,tier==='boss'?.065:.044);
  tone(base*2,.34,tier==='boss'?.040:.030,{type:'sawtooth',to:base*.86,attack:.012,cutoff:700});
  tone(base*3,.30,.020,{type:'triangle',to:base*1.4,delay:.06,attack:.014,cutoff:1050});
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

/** Secuencia propia de la intro: motor, cerrojos, revelado de la bóveda y autorización. */
export function playVaultIntroCue(stage:'motor'|'unlock'|'reveal'|'ready') {
  if(!enabled()) return;
  priorityUntil=performance.now()+420;
  if(stage==='motor'){
    noise(.34,.020,0,.55);
    blip('sine',92,58,.36,.038);
    blip('triangle',184,122,.22,.018,.05);
  }else if(stage==='unlock'){
    noise(.16,.052,0,.20);
    blip('square',250,74,.18,.050);
    blip('square',170,54,.24,.042,.07);
    blip('triangle',86,62,.30,.026,.02);
  }else if(stage==='reveal'){
    noise(.24,.030,0,.42);
    blip('sine',145,315,.34,.034);
    blip('triangle',420,760,.20,.026,.06);
    blip('sine',760,1180,.18,.018,.16);
  }else{
    [392,523,659].forEach((n,i)=>blip('triangle',n,n,.15,.026,i*.055));
    blip('sine',1046,1320,.16,.018,.12);
  }
}
export function playUiMove(){
  if(!allow('ui',48))return;
  filteredNoise(.020,.007,{type:'highpass',freq:3000,q:.6});
  tone(430,.036,.014,{type:'sine',to:360,attack:.002,cutoff:2200});
}
export function playUiSelect(){
  filteredNoise(.030,.010,{type:'highpass',freq:2800,q:.6});
  tone(420,.055,.022,{type:'triangle',to:610,attack:.003,cutoff:1800});
  tone(760,.070,.015,{type:'sine',to:930,delay:.045,attack:.003,cutoff:2400});
}
export function playUiBack(){
  filteredNoise(.035,.010,{type:'highpass',freq:2400,q:.7});
  tone(360,.075,.022,{type:'triangle',to:210,attack:.003,cutoff:1500});
}
export function playDeny(){
  tone(150,.13,.030,{type:'sawtooth',to:105,attack:.004,cutoff:520});
  lowImpact(58,.018,.015);
}

export function playCoin() {
  if(!allow('coin',42)) return;
  const vol=performance.now()<priorityUntil?.006:.021;
  blip('sine',900+Math.random()*260,1400,.075,vol);
}
export function playHeal() { blip('sine',523,659,.13,.035);blip('sine',659,1047,.2,.03,.1); }
export function playCritical(){
  if(!allow('crit',70))return;
  filteredNoise(.055,.026,{type:'highpass',freq:3600,q:.8});
  tone(980,.085,.028,{type:'triangle',to:360,attack:.002,cutoff:2500});
  lowImpact(74,.022,.006);
}
export function playEnemyDeath(){
  if(!allow('death',65))return;
  filteredNoise(.11,.025,{type:'bandpass',freq:620,q:.65});
  tone(160,.13,.026,{type:'sine',to:52,attack:.004,cutoff:480});
}
export function playRoomClear() { [392,494,587,784].forEach((n,i)=>blip('triangle',n,n,.16,.031,i*.055)); }
export function playBossWin() { priorityUntil=performance.now()+700;noise(.4,.055);[262,330,392,524].forEach((n,i)=>blip('triangle',n,n,.35,.04,i*.11)); }
export function playRarityPickup(rarity:number) {
  playPickup(); if(rarity>=2) blip('sine',1047,1319,.2,.025,.09);
  if(rarity>=4) [784,1047,1319].forEach((n,i)=>blip('triangle',n,n,.36,.035,.15+i*.08));
}
export function playReturn() {if(allow('return',130)) blip('triangle',450,820,.09,.02);}
export function playBounce() {if(allow('bounce',80)) blip('sine',760,380,.08,.03);}
export function playFootstep(){
  if(!allow('feet',165))return;
  filteredNoise(.030,.006,{type:'bandpass',freq:520+Math.random()*180,q:.6});
}
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
