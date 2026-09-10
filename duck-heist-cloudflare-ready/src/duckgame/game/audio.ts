// Audio procedural: efectos sintetizados + música generativa
let audioCtx: AudioContext | null = null;

let masterVol = 0.9;
let musicVol = 0.45;
let sfxVol = 0.9;

let musicTimer: number | null = null;
let musicStep = 0;
let musicMood: 'menu'|'run'|'boss'|'event'|'off' = 'off';
let musicFloor=0;
let testMode=false;
let compressor: DynamicsCompressorNode|null=null;
let ambienceTimer:number|null=null;
let combatEnergy=0;
export function setAudioTestMode(value:boolean){testMode=value;if(value){if(musicTimer!==null){clearInterval(musicTimer);musicTimer=null;}if(ambienceTimer!==null){clearInterval(ambienceTimer);ambienceTimer=null;}musicMood='off';}}
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
  if(!enabled()) throw new Error('audio off');
  if(!audioCtx) audioCtx=new AudioContext();
  if(!compressor){compressor=audioCtx.createDynamicsCompressor();compressor.threshold.value=-16;compressor.knee.value=12;compressor.ratio.value=7;compressor.attack.value=.002;compressor.release.value=.16;compressor.connect(audioCtx.destination);}
  if(audioCtx.state==='suspended') void audioCtx.resume();
  return audioCtx;
}

export function initAudio() {
  if(testMode) return;
  try {
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') void audioCtx.resume();
  } catch { /* ignorar */ }
}

function out(vol:number,kind:'sfx'|'music'){const ctx=getCtx();const g=ctx.createGain();g.gain.value=vol*masterVol*(kind==='sfx'?sfxVol:musicVol);g.connect(compressor??ctx.destination);return g;}

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
// MÚSICA ADAPTATIVA + AMBIENTE POR PISO
// ---------------------------------------------------------------------------
const FLOOR_THEMES=[
  {root:147,scale:[0,3,5,7,10],bpm:92,color:'bank'},
  {root:139,scale:[0,2,5,7,9],bpm:104,color:'security'},
  {root:110,scale:[0,3,5,7,10],bpm:96,color:'storage'},
  {root:124,scale:[0,2,3,7,9],bpm:108,color:'bakery'},
  {root:98,scale:[0,1,5,7,8],bpm:112,color:'vault'},
  {root:82,scale:[0,3,5,7,11],bpm:118,color:'gold'},
] as const;
function hz(root:number,semi:number,oct=0){return root*Math.pow(2,(semi+12*oct)/12);}
function musicNoise(dur:number,vol:number,delay=0,hp=1200,lp=7000){if(!enabled()||musicVol<=.001)return;try{const ctx=getCtx();const t0=ctx.currentTime+delay;const n=Math.max(1,Math.floor(ctx.sampleRate*dur));const buf=ctx.createBuffer(1,n,ctx.sampleRate);const data=buf.getChannelData(0);for(let i=0;i<n;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/n,5);const src=ctx.createBufferSource();src.buffer=buf;const high=ctx.createBiquadFilter();high.type='highpass';high.frequency.value=hp;const low=ctx.createBiquadFilter();low.type='lowpass';low.frequency.value=lp;const gain=out(vol,'music');src.connect(high);high.connect(low);low.connect(gain);gain.gain.setValueAtTime(vol*masterVol*musicVol,t0);gain.gain.exponentialRampToValueAtTime(.0008,t0+dur);src.start(t0);src.onended=()=>{src.disconnect();high.disconnect();low.disconnect();gain.disconnect();};}catch{}}
function ambienceShot(){if(musicMood==='off'||musicVol<=.001||masterVol<=.001)return;const t=FLOOR_THEMES[Math.min(5,musicFloor)];const r=Math.random();if(musicMood==='menu'){if(r<.38){blip('sine',740,760,.18,.024,0,'music');blip('sine',1110,1080,.16,.016,.09,'music');}else if(r<.7){musicNoise(.12,.012,0,700,4800);blip('triangle',410,280,.16,.018,0,'music');}else{blip('sawtooth',82,138,.2,.014,0,'music');blip('triangle',164,103,.18,.012,.12,'music');}return;}
  if(musicMood==='event'){if(r<.42){musicNoise(.085,.018,0,500,5200);blip('square',92,70,.16,.021,0,'music');}else if(r<.78){blip('sawtooth',440,330,.11,.013,0,'music');blip('sawtooth',622,466,.11,.011,.07,'music');}else{musicNoise(.13,.012,0,900,6200);blip('triangle',176,124,.18,.014,0,'music');}return;}
  switch(t.color){
    case 'bank': if(r<.5){musicNoise(.07,.008,0,1000,5500);blip('triangle',540,330,.11,.008,0,'music');}else blip('sine',880,920,.1,.009,0,'music');break;
    case 'security': if(r<.55){blip('square',640,680,.07,.009,0,'music');blip('square',880,900,.05,.007,.13,'music');}else{blip('sawtooth',110,185,.11,.008,0,'music');blip('triangle',190,110,.12,.006,.1,'music');}break;
    case 'storage': if(r<.55){musicNoise(.09,.011,0,700,4300);blip('triangle',460,260,.13,.009,0,'music');}else musicNoise(.16,.006,0,180,1300);break;
    case 'bakery': if(r<.5)musicNoise(.28,.009,0,1800,7000);else{musicNoise(.08,.009,0,800,5000);blip('triangle',420,280,.12,.008,0,'music');}break;
    case 'vault': if(r<.5){blip('sine',1180,1220,.1,.007,0,'music');blip('sine',1520,1480,.12,.006,.08,'music');}else{blip('sawtooth',88,150,.13,.006,0,'music');blip('triangle',180,95,.13,.005,.11,'music');}break;
    case 'gold': if(r<.6)[0,7,12].forEach((semi,i)=>blip('sine',hz(220,semi),hz(220,semi),.5,.006,i*.08,'music'));else{musicNoise(.08,.006,0,1200,7000);blip('triangle',660,430,.12,.006,0,'music');}break;
  }
}
export function setMusic(mood:'menu'|'run'|'boss'|'event'|'off',floor=musicFloor){if(testMode)return;floor=Math.max(0,Math.min(5,floor));if(musicMood===mood&&musicFloor===floor&&musicTimer!==null)return;musicFloor=floor;musicMood=mood;musicStep=0;combatEnergy=(mood==='boss'||mood==='event')?1:0;if(musicTimer!==null){clearInterval(musicTimer);musicTimer=null;}if(ambienceTimer!==null){clearInterval(ambienceTimer);ambienceTimer=null;}if(mood==='off')return;const t=FLOOR_THEMES[floor];const bpm=mood==='event'?Math.max(148,t.bpm+38):mood==='boss'?Math.max(132,t.bpm+24):mood==='menu'?78:t.bpm;const beat=60000/bpm/2;musicTimer=window.setInterval(()=>tickMusic(mood,beat),beat);ambienceTimer=window.setInterval(ambienceShot,mood==='menu'?2500:3200+floor*260);ambienceShot();}
function tickMusic(mood:'menu'|'run'|'boss',beat:number){if(musicVol<=.001||masterVol<=.001)return;const step=musicStep++;const sec=beat/1000;if(mood==='menu'){const notes=[0,3,7,10,7,5,3,7,12,10,7,3];if(step%2===0){const f=hz(110,notes[step%notes.length]);blip('triangle',f,f*.997,sec*1.85,.038,0,'music');}if(step%4===0){const bass=step%8===0?55:73.4;blip('sine',bass,bass*.995,sec*4.8,.03,0,'music');}if(step%8===4){blip('sine',440,435,sec*2.2,.014,0,'music');blip('sine',660,655,sec*2,.01,.08,'music');}if(step%4===2)musicNoise(.035,.005,0,1900,6500);return;}if(mood==='event'){const t=FLOOR_THEMES[musicFloor],root=Math.max(55,t.root*.5);if(step%2===0){blip('square',root,root*.82,sec*.72,.024,0,'music');musicNoise(.04,.013,0,1300,6500);}if(step%4===1){blip('sawtooth',hz(t.root,1),hz(t.root,6),sec*.82,.014,0,'music');}if(step%8===6){blip('sine',760,430,sec*1.8,.018,0,'music');blip('square',95,62,sec*.9,.016,.08,'music');}return;}const t=FLOOR_THEMES[musicFloor];combatEnergy=Math.max(mood==='boss'?.8:0,combatEnergy-.025);const intensity=mood==='boss'?1:combatEnergy;const semi=t.scale[(step*3+musicFloor)%t.scale.length];if(step%2===0){const bass=hz(t.root/2,step%8<4?0:(musicFloor===4?1:7));blip('triangle',bass,bass,sec*1.35,.019+intensity*.01,0,'music');}if(step%(intensity>.45?2:4)===0){const f=hz(t.root,semi,step%16>10?1:0);blip(musicFloor===1||musicFloor===4?'square':'triangle',f,f*.997,sec*1.1,.011+intensity*.007,0,'music');}if(step%2===1)musicNoise(.028,.006+intensity*.008,0,1800,7000);if(intensity>.35&&step%4===0){blip('sine',78,45,.1,.015+intensity*.01,0,'music');musicNoise(.045,.006+intensity*.007,0,1000,4500);}if(mood==='boss'&&step%8===6)blip('sawtooth',hz(t.root,1),hz(t.root,0),sec*2.2,.014,0,'music');}
export function stopMusic(){setMusic('off');}

// ---------------------------------------------------------------------------
// EFECTOS DE SONIDO REALISTAS Y PULIDOS
// ---------------------------------------------------------------------------

/** CUAC REALISTA: doble pulso vocal con ataque nasal "kw" */
export function playQuack(variant?:number){if(!enabled()||sfxVol<=.001||!allow('quack',85))return;try{const ctx=getCtx();const v=variant!==undefined?Math.abs(variant)%4:Math.floor(Math.random()*4);const cfg=[{f0:185,end:122,f1:690,f2:1320,dur:.19},{f0:205,end:138,f1:740,f2:1450,dur:.17},{f0:168,end:112,f1:640,f2:1230,dur:.22},{f0:220,end:148,f1:780,f2:1510,dur:.16}][v];const make=(offset:number,scale:number,dur:number)=>{noise(Math.min(.05,dur*.32),.04*scale,offset,.18);const osc=ctx.createOscillator(),trem=ctx.createOscillator(),tg=ctx.createGain(),f1=ctx.createBiquadFilter(),f2=ctx.createBiquadFilter(),mix=ctx.createGain(),gain=out(.1*scale,'sfx'),g1=ctx.createGain(),g2=ctx.createGain();osc.type='sawtooth';const t0=ctx.currentTime+offset;osc.frequency.setValueAtTime(cfg.f0,t0);osc.frequency.exponentialRampToValueAtTime(cfg.end,t0+dur);trem.frequency.value=28+v*3;tg.gain.value=7;trem.connect(tg);tg.connect(osc.frequency);f1.type='bandpass';f1.frequency.value=cfg.f1;f1.Q.value=5.5;f2.type='bandpass';f2.frequency.value=cfg.f2;f2.Q.value=6.2;g1.gain.value=1;g2.gain.value=.55;osc.connect(f1);f1.connect(g1);g1.connect(mix);osc.connect(f2);f2.connect(g2);g2.connect(mix);mix.connect(gain);gain.gain.setValueAtTime(.0008,t0);gain.gain.linearRampToValueAtTime(.1*masterVol*sfxVol*scale,t0+.012);gain.gain.exponentialRampToValueAtTime(.035*masterVol*sfxVol*scale,t0+dur*.55);gain.gain.exponentialRampToValueAtTime(.0008,t0+dur);osc.start(t0);trem.start(t0);osc.stop(t0+dur+.02);trem.stop(t0+dur+.02);osc.onended=()=>{[osc,trem,tg,f1,f2,g1,g2,mix,gain].forEach(n=>n.disconnect());};};make(0,1,cfg.dur*.68);make(cfg.dur*.54,.72,cfg.dur*.46);}catch{}}

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

function gun(profile:'pistol'|'revolver'|'shotgun'|'rifle'|'cannon'|'sniper',strength=1){const p={pistol:{body:145,crack:2700,boom:95,tail:.16,n:.075},revolver:{body:125,crack:3300,boom:78,tail:.22,n:.085},shotgun:{body:88,crack:1800,boom:55,tail:.28,n:.13},rifle:{body:170,crack:4100,boom:92,tail:.13,n:.055},cannon:{body:72,crack:1200,boom:40,tail:.34,n:.15},sniper:{body:105,crack:5200,boom:60,tail:.3,n:.065}}[profile];noise(p.n,.09*strength,0,.12);blip('sine',p.body,p.boom,p.tail,.07*strength);noise(Math.min(.06,p.n*.7),.035*strength,.003,.12);blip('triangle',1900,1050,.025,.018*strength,profile==='shotgun'?.075:.035);if(profile==='shotgun')blip('triangle',1600,850,.03,.014,.12);if(profile==='sniper')noise(.12,.022*strength,.055,.32);}
export function playShoot(weapon='quack_blaster'){if(!allow('shoot-'+weapon,weapon==='quack_laser'?85:weapon==='feather_gun'?42:30))return;combatEnergy=Math.min(1,combatEnergy+(weapon==='feather_gun'?.05:.13));switch(weapon){case 'breadcrumb_shotgun':gun('shotgun',.95);break;case 'baguette_launcher':gun('cannon',.88);blip('sine',120,68,.16,.03,.015);break;case 'feather_gun':gun('rifle',.36);break;case 'golden_egg_revolver':gun('revolver',.82);blip('sine',660,420,.06,.01,.035);break;case 'baguette_sniper':gun('sniper',1);break;case 'egg_cannon':gun('cannon',.62);blip('triangle',250,130,.1,.022);break;case 'tactical_toaster':gun('pistol',.42);blip('square',240,110,.07,.016);break;case 'quack_laser':blip('sawtooth',175,188,.14,.024);blip('sine',720,680,.14,.016);break;case 'plasma_baker':blip('sawtooth',180,520,.15,.031);noise(.05,.02,.04,.16);break;case 'rubber_duck_cannon':blip('sine',470,280,.09,.034);noise(.035,.014,0,.15);break;case 'bread_boomerang':noise(.06,.016,0,.22);blip('triangle',330,480,.08,.02);break;case 'homing_crumbs':gun('pistol',.34);blip('sine',690,330,.055,.012);break;case 'butter_blaster':blip('triangle',210,105,.09,.025);noise(.035,.016,0,.08);break;case 'croissant_cutter':noise(.055,.018,0,.24);blip('triangle',520,760,.07,.018);break;case 'vault_drill':blip('sawtooth',105,165,.055,.022);noise(.028,.012,0,.15);break;case 'receipt_ripper':noise(.032,.018,0,.35);blip('square',410,300,.035,.008);break;case 'pico_percutor':case 'nomina_42':case 'paga_patos':gun('revolver',.58);break;case 'tronador_costra':case 'horno_recortado':case 'escopeta_mermelada':gun('shotgun',.72);break;case 'rafaga_harina':case 'subcuac_9':case 'picoteadora_tactica':case 'cinta_transportadora':gun('rifle',.34);break;case 'mortero_masa':case 'gran_bagueton':case 'canon_levadura':case 'cohete_croqueta':case 'cazuela_volatil':gun('cannon',.56);break;case 'rayo_mostaza':case 'bobina_cuantica':case 'arco_tostado':case 'migaja_negra':blip('sawtooth',180,520,.12,.025);break;case 'sintetizador_cuac':playQuack(2);blip('triangle',240,100,.12,.02);break;case 'paraguas_balistico':case 'impresora_multas':case 'caja_registradora':noise(.04,.015,0,.25);gun('pistol',.28);break;case 'rodillo_cocina':noise(.055,.025,0,.1);blip('triangle',120,70,.08,.03);break;case 'iman_boveda':blip('sine',120,520,.2,.025);break;case 'pato_orbital':blip('sine',460,310,.08,.025);playQuack(1);break;case 'gomera_migas':case 'pistola_jarabe':case 'molinillo_pan':case 'ventilador_servilletas':blip('triangle',260,150,.07,.018);break;default:gun('pistol',.58);}}
export function playHit() { if(allow('hit',45)) blip('triangle',310,100,.055,.026); }
export function playPickup() {
  blip('sine', 520, 1180, 0.11, 0.05);
  blip('triangle', 880, 1560, 0.08, 0.03, 0.05);
}
export function playExplosion(){combatEnergy=Math.min(1,combatEnergy+.3);noise(.32,.11,0,.18);blip('sine',105,34,.34,.08);noise(.1,.04,.015,.1);}
export function playHurt(){priorityUntil=performance.now()+420;combatEnergy=Math.min(1,combatEnergy+.28);noise(.08,.04,0,.15);blip('square',215,62,.16,.045);}
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
export function playRoomClear(){priorityUntil=performance.now()+450;noise(.035,.012,0,.2);[392,494,587,784].forEach((n,i)=>blip('triangle',n,n,.17,.027,.04+i*.055));blip('sine',196,294,.28,.018,.07);}
export function playBossWin(){priorityUntil=performance.now()+900;combatEnergy=0;noise(.38,.06);[262,330,392,524,659].forEach((n,i)=>blip('triangle',n,n,.38,.03,.08+i*.095));}
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
