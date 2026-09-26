// Audio procedural: efectos sintetizados + música generativa
let audioCtx: AudioContext | null = null;

let masterVol = 0.9;
let musicVol = 0.58;
const MUSIC_BUS_GAIN=1.28;
let sfxVol = 0.9;

let musicTimer:number|null=null;
let musicSwitchTimer:number|null=null;
let musicStep=0;
let musicBus:GainNode|null=null;
let musicTransitionSerial=0;
export type MusicMood='menu'|'pause'|'start'|'combat'|'run'|'shop'|'gunvan'|'cafe'|'event'|'challenge'|'item'|'choice'|'treasure'|'secret'|'miniboss'|'subboss'|'boss'|'off';
let musicMood:MusicMood='off';
let musicFloor=0;
let musicVariant='';
let musicIntensity=0;
let pauseSnapshot:{mood:Exclude<MusicMood,'off'|'pause'>;floor:number;variant:string;step:number}|null=null;
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

function getMusicBus(ctx:AudioContext){
  if(!musicBus){
    musicBus=ctx.createGain();
    musicBus.gain.value=MUSIC_BUS_GAIN;
    musicBus.connect(ctx.destination);
  }
  return musicBus;
}

function out(vol:number,kind:'sfx'|'music'){
  const ctx=getCtx();
  const g=ctx.createGain();
  g.gain.value=vol*masterVol*(kind==='sfx'?sfxVol:musicVol);
  g.connect(kind==='music'?getMusicBus(ctx):ctx.destination);
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

function musicHash(value:string){
  let h=2166136261>>>0;
  for(let i=0;i<value.length;i++){h^=value.charCodeAt(i);h=Math.imul(h,16777619);}
  return h>>>0;
}
function musicKick(vol=.018,delay=0){
  tone(68,.12,vol,{type:'sine',to:34,delay,attack:.002,cutoff:220,kind:'music'});
  filteredNoise(.025,vol*.25,{delay,type:'lowpass',freq:320,q:.5,kind:'music'});
}
function musicSnare(vol=.010,delay=0){
  filteredNoise(.085,vol,{delay,type:'bandpass',freq:1450,q:.65,kind:'music'});
  tone(170,.06,vol*.35,{type:'triangle',to:105,delay,attack:.002,cutoff:700,kind:'music'});
}
function musicBell(freq:number,dur=.45,vol=.006,delay=0){
  tone(freq,dur,vol,{type:'sine',delay,attack:.004,cutoff:4200,kind:'music'});
  tone(freq*2.01,dur*.72,vol*.34,{type:'sine',delay:delay+.003,attack:.003,cutoff:5000,kind:'music'});
}
function musicPluck(freq:number,vol=.008,delay=0){
  tone(freq,.20,vol,{type:'triangle',to:freq*.992,delay,attack:.002,cutoff:3600,kind:'music'});
}
function musicHat(vol=.0045,delay=0){
  filteredNoise(.032,vol,{delay,type:'highpass',freq:5200,q:.45,kind:'music'});
}
function musicClap(vol=.006,delay=0){
  filteredNoise(.055,vol,{delay,type:'bandpass',freq:2350,q:.55,kind:'music'});
  filteredNoise(.028,vol*.45,{delay:delay+.018,type:'highpass',freq:4200,q:.4,kind:'music'});
}
function musicLead(freq:number,vol=.0065,delay=0,dur=.18){
  tone(freq,dur,vol,{type:'square',delay,attack:.002,cutoff:4200,kind:'music'});
  tone(freq*2,dur*.72,vol*.18,{type:'triangle',delay:delay+.002,attack:.002,cutoff:5600,kind:'music'});
}
function musicKeys(root:number,ratios:number[],dur:number,vol:number,delay=0){
  ratios.forEach((r,i)=>{
    tone(root*r,dur,vol/(1+i*.25),{type:'triangle',delay:delay+i*.006,attack:.012,cutoff:4200,detune:(i-1)*2,kind:'music'});
    if(i<2)tone(root*r*2,dur*.55,vol*.13,{type:'sine',delay:delay+i*.006,attack:.005,cutoff:6200,kind:'music'});
  });
}
function musicBass(freq:number,vol=.013,delay=0,dur=.24){
  tone(freq,dur,vol,{type:'square',to:freq*.985,delay,attack:.003,cutoff:720,kind:'music'});
  tone(freq/2,dur*.9,vol*.42,{type:'sine',to:freq*.49,delay,attack:.004,cutoff:260,kind:'music'});
}

type BossMusicTier='miniboss'|'subboss'|'boss';
interface BossMusicIdentity { id:string; family:string; role:string; phase:number; }

function bossMusicIdentity(variant:string):BossMusicIdentity {
  const [id='',family='',role='',phaseRaw='0']=variant.split('|');
  const parsed=Number.parseInt(phaseRaw,10);
  return {id,family,role,phase:Number.isFinite(parsed)?Math.max(0,Math.min(3,parsed)):0};
}

function bossFamilyRoot(family:string){
  return family==='war'?87.31:
    family==='riot'?92.50:
    family==='tech'?103.83:
    family==='vault'?82.41:
    family==='finance'?110:
    family==='wealth'?123.47:
    family==='bakery'?116.54:
    98;
}

function tickBossMusic(tier:BossMusicTier,step:number,sec:number,variant:string){
  const identity=bossMusicIdentity(variant);
  const seed=musicHash(identity.id||variant||tier);
  const family=identity.family||['command','finance','tech','war','bakery','vault','riot','wealth'][seed%8];
  const phase=identity.phase;
  const phrase=step%32,slot=phrase%16,section=phrase>=16?1:0;
  const tierWeight=tier==='boss'?1:tier==='subboss'?.84:.70;
  const phaseWeight=1+phase*.13+musicIntensity*.08;
  const root=bossFamilyRoot(family)*semitoneRatio((seed>>>6)%3-1);
  const hit=(v:number)=>v*tierWeight*phaseWeight;
  const drive=musicIntensity*(tier==='boss'?1:.85);

  // Pulso común más vivo; cada familia lo interpreta con otra paleta.
  if([0,3,6,8,11,14].includes(slot))musicKick(hit(.014+drive*.010));
  if(slot===4||slot===12){musicSnare(hit(.007+drive*.004));musicClap(hit(.0035+drive*.002));}
  if(slot%2===1)musicHat(hit(.0028+drive*.0018));

  if(family==='command'){
    if(slot===0||slot===8)musicKeys(root,POWER,sec*3.3,hit(.0095));
    if([1,5,9,13].includes(slot))musicBass(root/2,hit(.013));
    if([2,6,10,14].includes(slot))musicLead(motifFreq(root,(slot/2)+section,2),hit(.0058),0,.12);
  }else if(family==='finance'){
    if(slot===0||slot===8)musicKeys(root,FUNK,sec*3.5,hit(.009));
    if([1,5,9,13].includes(slot))musicBass(root/2,hit(.0105));
    if([2,5,10,13].includes(slot))musicBell(motifFreq(root,slot%5,2),.28,hit(.0058));
    if([3,7,11,15].includes(slot))musicPluck(motifFreq(root,(slot+section)%5,2),hit(.0055));
  }else if(family==='wealth'){
    if(slot===0||slot===8)musicKeys(root,BRIGHT,sec*3.6,hit(.0105));
    if([1,5,9,13].includes(slot))musicBass(root/2,hit(.009));
    if(slot%2===0)musicBell(motifFreq(root,(slot/2)+section,2),.30,hit(.006));
    if(phase>=1&&[3,7,11,15].includes(slot))musicLead(motifFreq(root,slot%5,2),hit(.0048),0,.12);
  }else if(family==='bakery'){
    if(slot===0||slot===8)musicKeys(root,[1,semitoneRatio(4),semitoneRatio(7),semitoneRatio(9)],sec*3.5,hit(.009));
    if([1,5,9,13].includes(slot))musicBass(root/2,hit(.010));
    if([2,6,10,14].includes(slot))musicPluck(motifFreq(root,(slot/2)+section,2),hit(.0065));
    if([3,11].includes(slot))musicBell(root*3,.24,hit(.0048));
  }else if(family==='tech'){
    if(slot===0||slot===8)musicKeys(root,POWER,sec*3.0,hit(.008));
    if([1,5,9,13].includes(slot))musicBass(root/2,hit(.012));
    if(slot%2===1)musicLead(motifFreq(root,slot+section,2),hit(.0056),0,.09);
    if([2,6,10,14].includes(slot))musicHat(hit(.0045));
  }else if(family==='vault'){
    if(slot===0||slot===8)musicKeys(root,FUNK,sec*3.8,hit(.0088));
    if([1,5,9,13].includes(slot))musicBass(root/2,hit(.013));
    if([2,6,10,14].includes(slot))musicBell(motifFreq(root,(slot/2)+section,2),.36,hit(.0052));
    if([3,11].includes(slot))musicLead(motifFreq(root,4-section,2),hit(.0048),0,.15);
  }else if(family==='riot'){
    if(slot===0||slot===8)musicKeys(root,POWER,sec*3.0,hit(.0085));
    if([1,3,5,9,11,13].includes(slot))musicBass(root/2,hit(.014));
    if([2,6,10,14].includes(slot))musicLead(motifFreq(root,(slot/2)+section,2),hit(.0054),0,.10);
  }else{
    // WAR: percusión agresiva, pero con medios/agudos claros y melodía.
    if(slot===0||slot===8)musicKeys(root,POWER,sec*3.1,hit(.009));
    if([1,5,9,13].includes(slot))musicBass(root/2,hit(.0145));
    if([2,6,10,14].includes(slot))musicLead(motifFreq(root,(slot/2)+section,2),hit(.0058),0,.11);
    if(phase>=2&&[3,7,11,15].includes(slot))musicPluck(motifFreq(root,slot%5,3),hit(.0042));
  }

  // Firma del rol.
  if(identity.role==='charger'&&(slot===6||slot===14))musicKick(hit(.025));
  else if(identity.role==='sniper'&&(slot===7||slot===15))musicBell(root*3,.24,hit(.0055));
  else if(identity.role==='reactor'&&(slot===2||slot===10))musicLead(root*2.5,hit(.005),0,.18);
  else if(identity.role==='vortex'&&slot%4===2)musicPluck(motifFreq(root,slot/2,2),hit(.005));
  else if(identity.role==='swarm'&&phase>=1&&slot%2===1)musicPluck(motifFreq(root,slot,2),hit(.0042));
  else if(identity.role==='executioner'&&(slot===3||slot===11))musicClap(hit(.008));

  // Firma melódica individual estable por jefe.
  if([1,3,6,9,11,14].includes(slot)){
    const signature=[0,2+(seed%3),5+((seed>>>4)%3),7+((seed>>>8)%3),10+((seed>>>12)%2)];
    const position=[1,3,6,9,11,14].indexOf(slot);
    const motifIndex=section?Math.max(0,4-(position%5)):(position%5);
    musicLead(root*2*semitoneRatio(signature[motifIndex]),hit(tier==='boss'?.0053:tier==='subboss'?.0043:.0036),0,.10);
  }
}

// ---------------------------------------------------------------------------
// MÚSICA CINEMÁTICA PROCEDURAL
// ---------------------------------------------------------------------------
const RUN_ROOTS=[73.42,82.41,65.41,69.30,61.74,55.00];
const MINOR=[1,Math.pow(2,3/12),Math.pow(2,7/12),Math.pow(2,10/12)];
const DARK=[1,Math.pow(2,3/12),Math.pow(2,6/12),Math.pow(2,10/12)];
const BRIGHT=[1,Math.pow(2,4/12),Math.pow(2,7/12),Math.pow(2,11/12)];
const FUNK=[1,Math.pow(2,4/12),Math.pow(2,7/12),Math.pow(2,10/12)];
const POWER=[1,Math.pow(2,2/12),Math.pow(2,7/12),Math.pow(2,9/12)];
const FLOOR_TONAL_SHIFT=[0,2,-2,5,-5,7];
const HEIST_MOTIF=[0,3,7,5,2];

function semitoneRatio(semitones:number){return Math.pow(2,semitones/12);}
function floorRoot(base:number){
  const shift=FLOOR_TONAL_SHIFT[Math.max(0,Math.min(FLOOR_TONAL_SHIFT.length-1,musicFloor))];
  return base*semitoneRatio(shift);
}
function motifFreq(root:number,index:number,octave=1){
  return root*octave*semitoneRatio(HEIST_MOTIF[((index%HEIST_MOTIF.length)+HEIST_MOTIF.length)%HEIST_MOTIF.length]);
}

export function setMusic(mood:MusicMood,floor=musicFloor,variant='',resumeStep?:number){
  if(testMode)return;
  if(musicMood===mood&&musicFloor===floor&&musicVariant===variant)return;

  const serial=++musicTransitionSerial;
  musicFloor=floor;
  musicVariant=variant;
  const previous=musicMood;
  musicMood=mood;

  if(musicTimer!==null){clearInterval(musicTimer);musicTimer=null;}
  if(musicSwitchTimer!==null){clearTimeout(musicSwitchTimer);musicSwitchTimer=null;}

  const startTheme=()=>{
    if(serial!==musicTransitionSerial||mood==='off')return;
    musicStep=resumeStep??0;
    const variantSeed=musicHash(variant||mood);
    const bossIdentity=bossMusicIdentity(variant);
    const bossTempoBoost=bossIdentity.phase*6;
    const bpm=
      mood==='boss'?([118,124,130,136][variantSeed%4]+bossTempoBoost):
      mood==='subboss'?([112,118,124,108][variantSeed%4]+bossTempoBoost):
      mood==='miniboss'?([116,122,128,112][variantSeed%4]+bossTempoBoost):
      mood==='menu'?112:
      mood==='pause'?88:
      mood==='event'?124:
      mood==='challenge'?132:
      mood==='gunvan'?118:
      mood==='shop'?106:
      mood==='cafe'?96:
      mood==='secret'?88:
      mood==='treasure'?110:
      mood==='choice'?104:
      mood==='item'?102:
      mood==='start'?108:
      mood==='combat'?128:
      mood==='run'?122:104;
    const beat=60000/bpm/2;

    try{
      const ctx=getCtx(),bus=ctx.createGain(),now=ctx.currentTime;
      bus.gain.setValueAtTime(.001,now);
      bus.gain.linearRampToValueAtTime(MUSIC_BUS_GAIN,now+.24);
      bus.connect(ctx.destination);
      musicBus=bus;
    }catch{/* audio bloqueado por navegador */}
    tickMusic(mood,beat,variant);
    musicTimer=window.setInterval(()=>tickMusic(mood,beat,variant),beat);
  };

  const fadingBus=musicBus;

  if(mood==='off'){
    try{
      const ctx=getCtx(),bus=fadingBus??getMusicBus(ctx),now=ctx.currentTime;
      bus.gain.cancelScheduledValues(now);
      bus.gain.setValueAtTime(Math.max(.001,bus.gain.value),now);
      bus.gain.linearRampToValueAtTime(.001,now+.22);
      if(musicBus===bus)musicBus=null;
      window.setTimeout(()=>{try{bus.disconnect();}catch{/* ya desconectado */}},1400);
    }catch{/* audio bloqueado por navegador */}
    return;
  }

  if(previous==='off'||!fadingBus){
    startTheme();
    return;
  }

  // Crossfade real: el tema nuevo entra inmediatamente mientras el anterior
  // baja. No existe un hueco de silencio entre zonas distintas.
  try{
    const ctx=getCtx(),now=ctx.currentTime;
    fadingBus.gain.cancelScheduledValues(now);
    fadingBus.gain.setValueAtTime(Math.max(.001,fadingBus.gain.value),now);
    fadingBus.gain.linearRampToValueAtTime(.001,now+.32);
  }catch{/* audio bloqueado por navegador */}
  startTheme();
  window.setTimeout(()=>{try{fadingBus.disconnect();}catch{/* ya desconectado */}},1450);
}

function tickMusic(mood:Exclude<MusicMood,'off'>,beat:number,variant=''){
  if(musicVol<=.001||masterVol<=.001)return;
  const step=musicStep++,sec=beat/1000;

  if(mood==='menu'){
    // MENÚ — funk/heist brillante: seguro, juguetón y reconocible.
    const phrase=step%32,phase=phrase%16,section=phrase>=16?1:0;
    const root=[110,123.47,130.81,146.83][Math.floor(phrase/8)%4];
    if(phase===0||phase===8)musicKeys(root,section?FUNK:BRIGHT,sec*3.6,.0105);
    if([0,6,8,14].includes(phase))musicKick(.020);
    if(phase===4||phase===12){musicClap(.0075);musicSnare(.0045);}
    if(phase%2===1)musicHat(.0038);
    if([1,5,9,13].includes(phase))musicBass(root/2,.012);
    if([2,3,6,10,14].includes(phase))musicLead(motifFreq(root,[0,1,2,3,4][[2,3,6,10,14].indexOf(phase)],2),.0068,0,.16);
    if(section&&(phase===7||phase===15))musicBell(root*3,.26,.0048);
    return;
  }
  if(mood==='pause'){
    // PAUSA — groove ligero: suspendido, pero vivo.
    const phase=step%16,root=floorRoot(98);
    if(phase===0||phase===8)musicKeys(root,BRIGHT,sec*4.2,.0068);
    if([0,8].includes(phase))musicKick(.009);
    if(phase===4||phase===12)musicClap(.0042);
    if(phase%2===1)musicHat(.0025);
    if([2,6,10,14].includes(phase))musicPluck(motifFreq(root,phase/2,1.5),.0048);
    if(phase===5||phase===13)musicBell(motifFreq(root,phase===5?1:3,2),.34,.0043);
    return;
  }
  if(mood==='start'){
    // ENTRADA — preparación que avanza: beat limpio + motivo ascendente.
    const phrase=step%32,phase=phrase%16,section=phrase>=16?1:0;
    const root=floorRoot(section?116.54:110);
    if(phase===0||phase===8)musicKeys(root,section?POWER:FUNK,sec*3.8,.0085);
    if([0,3,6,8,11,14].includes(phase))musicKick(.013+section*.002);
    if(phase===4||phase===12)musicClap(.0055+section*.001);
    if(phase%2===1)musicHat(.0028+section*.0006);
    if([1,5,9,13].includes(phase))musicBass(root/2,.0105+section*.0015);
    const steps=section?[1,4,7,9,12,15]:[2,4,6,10,12,14];
    if(steps.includes(phase))musicLead(motifFreq(root,steps.indexOf(phase)+section,2),.0058+section*.001,0,.15);
    return;
  }
  if(mood==='combat'){
    // COMBATE — breakbeat/heist; cambia capas con la presión.
    const phrase=step%32,phase=phrase%16,section=phrase>=16?1:0,pressure=musicIntensity;
    const root=floorRoot(section?92.50:98);
    if(phase===0||phase===8)musicKeys(root,section?POWER:FUNK,sec*3.4,.0075+pressure*.003);
    const kicks=section?[0,2,6,8,10,14]:[0,3,6,8,11,14];
    if(kicks.includes(phase))musicKick(.016+pressure*.010);
    if(phase===4||phase===12){musicSnare(.007+pressure*.004);musicClap(.004+pressure*.002);}
    if(phase%2===1)musicHat(.003+pressure*.0022);
    if([1,5,9,13].includes(phase))musicBass(root/2,.012+pressure*.006);
    if(pressure>.22&&(phase===2||phase===10))musicLead(motifFreq(root,section?3:2,2),.0055+pressure*.002,0,.14);
    if(pressure>.5&&(phase===6||phase===14))musicLead(motifFreq(root,section?4:1,2),.0058+pressure*.002,0,.12);
    if(pressure>.75&&(phase===3||phase===7||phase===11||phase===15))musicPluck(motifFreq(root,(phase+section)%5,3),.0045);
    return;
  }
  if(mood==='choice'){
    // ELECCIÓN — pop electrónico juguetón de llamada/respuesta.
    const phase=step%16,root=floorRoot(123.47);
    if(phase===0||phase===8)musicKeys(root,BRIGHT,sec*3.8,.008);
    if([0,6,8,14].includes(phase))musicKick(.011);
    if(phase===4||phase===12)musicClap(.0052);
    if(phase%2===1)musicHat(.0028);
    if([2,6,10,14].includes(phase))musicLead(motifFreq(root,[0,2,4,1][Math.floor(phase/4)],2),.0062,0,.15);
    if([3,11].includes(phase))musicBell(root*3,.26,.004);
    return;
  }
  if(mood==='shop'){
    // TIENDA — funk clandestino; bajo caminante y teclas brillantes.
    const phrase=step%32,phase=phrase%16,section=phrase>=16?1:0;
    const root=floorRoot(section?123.47:116.54);
    if(phase===0||phase===8)musicKeys(root,FUNK,sec*3.8,.008);
    if([0,3,6,8,11,14].includes(phase))musicKick(.011);
    if(phase===4||phase===12)musicClap(.0055);
    if(phase%2===1)musicHat(.0032);
    if([1,5,9,13].includes(phase))musicBass(root/2,.011);
    if([2,6,10,14].includes(phase))musicPluck(motifFreq(root,Math.floor(phase/4)+section,2),.0063);
    if(phase===7||phase===15)musicBell(root*3,.30,.0045);
    return;
  }
  if(mood==='gunvan'){
    // CAMIONETA — electro-garage: mecánica, seca y con empuje.
    const phrase=step%32,phase=phrase%16,section=phrase>=16?1:0;
    const root=floorRoot(section?82.41:87.31);
    if(phase===0||phase===8)musicKeys(root,POWER,sec*3.2,.0075);
    const hits=section?[0,2,5,8,10,13]:[0,3,6,8,11,14];
    if(hits.includes(phase))musicKick(.019);
    if(phase===4||phase===12){musicSnare(.008);musicClap(.004);}
    if(phase%2===1)musicHat(.0038);
    if([1,5,9,13].includes(phase))musicBass(root/2,.015);
    if([2,6,10,14].includes(phase))musicLead(motifFreq(root,Math.floor(phase/4)+section,2),.0055,0,.12);
    return;
  }
  if(mood==='cafe'){
    // CAFÉ — groove cálido y alegre; descanso sin perder energía.
    const phrase=step%32,phase=phrase%16,section=phrase>=16?1:0;
    const progression=section?[146.83,164.81,174.61,164.81]:[130.81,146.83,164.81,146.83];
    const root=floorRoot(progression[Math.floor(phase/4)%4]);
    if(phase===0||phase===8)musicKeys(root,BRIGHT,sec*4,.0072);
    if([0,6,8,14].includes(phase))musicKick(.0085);
    if(phase===4||phase===12)musicClap(.0045);
    if(phase%2===1)musicHat(.0028);
    if([1,5,9,13].includes(phase))musicBass(root/2,.0075);
    if([2,6,10,14].includes(phase))musicBell(motifFreq(root,Math.floor(phase/4)+section,1.5),.36,.0048);
    if([3,7,11,15].includes(phase))musicPluck(motifFreq(root,(phase+section)%5,2),.0042);
    return;
  }
  if(mood==='item'){
    // OBJETOS — chiptune brillante de descubrimiento.
    const phase=step%16,root=floorRoot(130.81);
    if(phase===0||phase===8)musicKeys(root,BRIGHT,sec*3.5,.007);
    if([0,6,8,14].includes(phase))musicKick(.0085);
    if(phase===4||phase===12)musicClap(.004);
    if(phase%2===1)musicHat(.0025);
    if([1,3,6,9,11,14].includes(phase))musicLead(motifFreq(root,[0,1,2,3,4,1][[1,3,6,9,11,14].indexOf(phase)],2),.0058,0,.12);
    if(phase===7||phase===15)musicBell(root*3,.26,.0048);
    return;
  }
  if(mood==='treasure'){
    // TESORO — celebración arcade, abierta y luminosa.
    const phase=step%16,root=floorRoot(146.83);
    if(phase===0||phase===8)musicKeys(root,BRIGHT,sec*3.6,.009);
    if([0,3,6,8,11,14].includes(phase))musicKick(.0125);
    if(phase===4||phase===12){musicClap(.006);musicSnare(.004);}
    if(phase%2===1)musicHat(.003);
    if([1,5,9,13].includes(phase))musicBass(root/2,.008);
    if([2,6,10,14].includes(phase))musicBell(motifFreq(root,Math.floor(phase/4),2),.34,.0065);
    if([3,7,11,15].includes(phase))musicLead(motifFreq(root,(phase+1)%5,2),.0055,0,.14);
    return;
  }
  if(mood==='secret'){
    // SECRETA — misterio activo tipo espionaje, no lúgubre.
    const phrase=step%32,phase=phrase%16,section=phrase>=16?1:0;
    const root=floorRoot(section?110:103.83);
    if(phase===0||phase===8)musicKeys(root,section?POWER:FUNK,sec*4,.0068);
    if([0,5,8,13].includes(phase))musicKick(.0105);
    if(phase===4||phase===12)musicClap(.0045);
    if(phase%2===1)musicHat(.0027);
    if([1,5,9,13].includes(phase))musicBass(root/2,.009);
    if([2,6,10,14].includes(phase))musicPluck(motifFreq(root,(phase/2)+section,1.5),.0052);
    if(phase===3||phase===11)musicBell(motifFreq(root,section?1:4,2),.38,.005);
    return;
  }
  if(mood==='challenge'){
    // DESAFÍO — arcade contrarreloj, muy rítmico y brillante.
    const phrase=step%32,phase=phrase%16,section=phrase>=16?1:0;
    const root=floorRoot(section?116.54:110);
    if(phase===0||phase===8)musicKeys(root,POWER,sec*3.1,.008);
    const pulse=section?[0,2,3,6,8,10,11,14]:[0,2,4,6,8,10,12,14];
    if(pulse.includes(phase))musicKick(phase%4===0?.021:.015);
    if(phase===4||phase===12){musicSnare(.008);musicClap(.0045);}
    if(phase%2===1)musicHat(.0038);
    if([1,5,9,13].includes(phase))musicBass(root/2,.012);
    if([1,5,9,13].includes(phase))musicLead(motifFreq(root,Math.floor(phase/4)+section,2),.006,0,.1);
    if(phase===7||phase===15)musicBell(motifFreq(root,4-section,2),.22,.0045);
    return;
  }
  if(mood==='run'){
    // ATRACO SIN FIN / exploración — groove continuo y luminoso.
    const phrase=step%32,phase=phrase%16,section=phrase>=16?1:0,pressure=musicIntensity;
    const root=floorRoot(section?98:103.83);
    if(phase===0||phase===8)musicKeys(root,section?POWER:FUNK,sec*3.4,.007+pressure*.002);
    const kicks=section?[0,3,6,8,11,14]:[0,5,8,13];
    if(kicks.includes(phase))musicKick(.012+pressure*.007);
    if(phase===4||phase===12)musicClap(.0045+pressure*.002);
    if(phase%2===1)musicHat(.0028+pressure*.0015);
    if([1,5,9,13].includes(phase))musicBass(root/2,.010+pressure*.004);
    if(phase%2===0)musicPluck(motifFreq(root,((phase/2)+section)%HEIST_MOTIF.length,1.5),.0052+pressure*.0015);
    return;
  }
  if(mood==='event'){
    // EVENTO — funk de suspense: activo y curioso.
    const phrase=step%32,phase=phrase%16,section=phrase>=16?1:0;
    const root=floorRoot(section?116.54:110);
    if(phase===0||phase===8)musicKeys(root,section?POWER:FUNK,sec*3.5,.0075);
    if([0,3,6,8,11,14].includes(phase))musicKick(.012+section*.0015);
    if(phase===4||phase===12)musicClap(.0055);
    if(phase%2===1)musicHat(.003);
    if([1,5,9,13].includes(phase))musicBass(root/2,.010);
    if(phase===3||phase===11)musicLead(motifFreq(root,section?4:0,1.5),.0058,0,.13);
    if(phase===5||phase===13)musicLead(motifFreq(root,section?1:2,1.5),.0054,0,.12);
    if(section&&(phase===7||phase===15))musicBell(motifFreq(root,3,2),.28,.0042);
    return;
  }
  if(mood==='miniboss'||mood==='subboss'||mood==='boss'){
    tickBossMusic(mood,step,sec,variant);
    return;
  }
}

export function setMusicIntensity(value:number){
  musicIntensity=Math.max(0,Math.min(1,value));
}

export function enterPauseMusic(floor=musicFloor){
  if(musicMood!=='pause'&&musicMood!=='off'){
    pauseSnapshot={mood:musicMood as Exclude<MusicMood,'off'|'pause'>,floor:musicFloor,variant:musicVariant,step:musicStep};
  }
  setMusic('pause',floor);
}

export function resumePauseMusic(){
  const snapshot=pauseSnapshot;
  pauseSnapshot=null;
  if(!snapshot)return false;
  setMusic(snapshot.mood,snapshot.floor,snapshot.variant,snapshot.step);
  return true;
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

export function playShoot(weapon='quack_blaster'){
  const rapid=weapon==='feather_gun'||weapon==='quack_laser'||weapon==='homing_crumbs';
  if(!allow(weapon,rapid?42:weapon==='breadcrumb_shotgun'?115:weapon==='plasma_baker'?170:52))return;

  const crack=(high:number,body:number,tail:number,vol:number)=>{
    filteredNoise(.040,vol*.72,{type:'highpass',freq:high,q:.55});
    filteredNoise(.075,vol*.48,{type:'bandpass',freq:body,q:.75});
    tone(tail,.095,vol*.50,{type:'sine',to:Math.max(34,tail*.58),attack:.003,cutoff:520});
  };

  switch(weapon){
    case 'quack_blaster': // 9 mm
      crack(3200,1250,118,.047);break;
    case 'breadcrumb_shotgun': // 12 ga
      filteredNoise(.13,.082,{type:'lowpass',freq:1650,q:.42});
      filteredNoise(.060,.045,{type:'highpass',freq:2800,q:.5});
      lowImpact(68,.070);tone(115,.15,.040,{type:'triangle',to:42,attack:.003,cutoff:520});break;
    case 'feather_gun': // SMG
      crack(3900,1550,132,.035);break;
    case 'bread_boomerang': // 5.56
      crack(4300,1750,105,.046);tone(620,.045,.010,{type:'triangle',to:410,attack:.002,cutoff:1500});break;
    case 'rubber_duck_cannon': // 7.62
      crack(3500,1280,82,.060);lowImpact(55,.027,.005);break;
    case 'baguette_launcher': // 40 mm
      filteredNoise(.11,.052,{type:'lowpass',freq:950,q:.5});
      lowImpact(62,.070);tone(150,.14,.030,{type:'triangle',to:48,attack:.004,cutoff:500});break;
    case 'quack_laser': // automática pesada
      crack(3000,1100,76,.052);lowImpact(49,.022);break;
    case 'golden_egg_revolver': // .357
      crack(3600,1350,74,.068);lowImpact(48,.034,.004);break;
    case 'tactical_toaster': // .45 suprimida
      filteredNoise(.050,.021,{type:'bandpass',freq:780,q:.9});
      filteredNoise(.030,.010,{type:'highpass',freq:2500,q:.5});
      tone(96,.080,.025,{type:'sine',to:62,attack:.003,cutoff:360});break;
    case 'egg_cannon': // DMR 7.62
      crack(3700,1450,76,.058);tone(410,.060,.011,{type:'triangle',to:290,attack:.003,cutoff:1100});break;
    case 'baguette_sniper': // .308
      crack(3300,1120,58,.074);lowImpact(43,.040,.005);tone(230,.13,.014,{type:'triangle',to:95,attack:.004,cutoff:650});break;
    case 'plasma_baker': // .50
      filteredNoise(.15,.086,{type:'lowpass',freq:1350,q:.42});
      filteredNoise(.055,.052,{type:'highpass',freq:2600,q:.55});
      lowImpact(34,.090);tone(92,.20,.050,{type:'triangle',to:31,attack:.003,cutoff:420});break;
    case 'homing_crumbs': // PDW
      crack(4600,1850,145,.032);break;
    default:
      crack(3400,1300,105,.040);
  }
}
export function playHit(){
  if(!allow('hit',38))return;
  filteredNoise(.040,.026,{type:'bandpass',freq:1150,q:.9});
  tone(145,.055,.018,{type:'sine',to:82,attack:.003,cutoff:520});
}
export function playPickup(){
  filteredNoise(.025,.007,{type:'highpass',freq:3400,q:.5});
  tone(620,.10,.026,{type:'sine',to:980,attack:.004,cutoff:2600});
  tone(930,.12,.018,{type:'triangle',to:1320,delay:.045,attack:.006,cutoff:2900});
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
export function playEquip(){
  filteredNoise(.040,.014,{type:'bandpass',freq:1900,q:.7});
  tone(330,.055,.024,{type:'triangle',to:510,attack:.003,cutoff:1300});
  tone(680,.075,.018,{type:'sine',to:880,delay:.035,attack:.004,cutoff:2200});
}
export function playWeaponSwap(){
  filteredNoise(.055,.018,{type:'bandpass',freq:1200,q:.75});
  tone(210,.060,.020,{type:'triangle',to:330,attack:.003,cutoff:900});
  tone(520,.045,.013,{type:'sine',to:410,delay:.025,attack:.003,cutoff:1700});
}
export function playStairs(){
  [0,1,2,3].forEach(i=>{
    tone(220+i*82,.13,.020,{type:'sine',to:250+i*92,delay:i*.075,attack:.014,cutoff:1200});
    filteredNoise(.028,.004,{delay:i*.075,type:'bandpass',freq:620+i*90,q:.5});
  });
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
export function playDoorLock(){
  filteredNoise(.14,.030,{type:'lowpass',freq:900,q:.5});
  lowImpact(74,.045);
  tone(205,.12,.030,{type:'triangle',to:78,attack:.003,cutoff:700});
  tone(132,.17,.025,{type:'sine',to:58,delay:.07,attack:.003,cutoff:420});
}
export function playDoorUnlock(){
  filteredNoise(.095,.018,{type:'bandpass',freq:1450,q:.8});
  tone(180,.09,.024,{type:'triangle',to:270,attack:.003,cutoff:950});
  tone(330,.11,.022,{type:'sine',to:470,delay:.055,attack:.004,cutoff:1500});
  tone(610,.13,.016,{type:'sine',to:820,delay:.12,attack:.006,cutoff:2300});
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

export function playCoin(){
  if(!allow('coin',42))return;
  const vol=performance.now()<priorityUntil?.005:.018;
  const f=1050+Math.random()*220;
  tone(f,.080,vol,{type:'sine',to:f*1.18,attack:.002,cutoff:3200});
  tone(f*1.55,.055,vol*.45,{type:'triangle',delay:.018,attack:.002,cutoff:3800});
}
export function playHeal(){
  tone(392,.20,.020,{type:'sine',to:523,attack:.035,cutoff:1800});
  tone(523,.26,.018,{type:'sine',to:784,delay:.09,attack:.045,cutoff:2200});
  filteredNoise(.12,.005,{delay:.06,type:'highpass',freq:4200,q:.4});
}
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
export function playRoomClear(){
  [293.66,369.99,440,587.33].forEach((n,i)=>tone(n,.28,.018,{type:i<2?'sine':'triangle',delay:i*.07,attack:.025,cutoff:1800}));
  lowImpact(52,.018,.02);
}
export function playBossWin(){
  priorityUntil=performance.now()+900;
  filteredNoise(.34,.032,{type:'lowpass',freq:920,q:.45});
  lowImpact(46,.050);
  [130.81,196,261.63,392].forEach((n,i)=>tone(n,.55,.024,{type:i<2?'sine':'triangle',delay:.08+i*.11,attack:.045,cutoff:1400}));
}
export function playRarityPickup(rarity:number) {
  playPickup(); if(rarity>=2) blip('sine',1047,1319,.2,.025,.09);
  if(rarity>=4) [784,1047,1319].forEach((n,i)=>blip('triangle',n,n,.36,.035,.15+i*.08));
}
export function playReturn(){if(allow('return',130))tone(360,.095,.016,{type:'triangle',to:720,attack:.004,cutoff:1700});}
export function playBounce(){if(allow('bounce',80)){filteredNoise(.025,.008,{type:'bandpass',freq:1300,q:.7});tone(520,.075,.018,{type:'sine',to:270,attack:.003,cutoff:1400});}}
export function playFootstep(){
  if(!allow('feet',165))return;
  filteredNoise(.030,.006,{type:'bandpass',freq:520+Math.random()*180,q:.6});
}
export function playDoorStyle(style:string){
  if(style==='boss')playDoorLock();
  else if(style==='gold'||style==='purple'){
    tone(440,.18,.018,{type:'sine',to:660,attack:.025,cutoff:1800});
    filteredNoise(.06,.006,{type:'highpass',freq:3000,q:.5});
  }else if(style==='green'){
    tone(520,.09,.014,{type:'sine',to:700,attack:.008,cutoff:1800});
    tone(780,.11,.012,{type:'triangle',to:940,delay:.06,attack:.008,cutoff:2200});
  }else{
    filteredNoise(.075,.012,{type:'bandpass',freq:900,q:.6});
    tone(120,.08,.012,{type:'sine',to:78,attack:.003,cutoff:400});
  }
}

export function playDanger(kind:'aim'|'charge'|'camera'='aim'){
  if(!allow(`danger-${kind}`,220))return;
  priorityUntil=performance.now()+420;
  if(kind==='charge'){
    filteredNoise(.11,.024,{type:'bandpass',freq:760,q:1});
    tone(92,.18,.042,{type:'sawtooth',to:180,attack:.018,cutoff:650});
  }else if(kind==='camera'){
    tone(410,.10,.022,{type:'sine',to:470,attack:.004,cutoff:1500});
    tone(610,.12,.019,{type:'sine',to:690,delay:.13,attack:.004,cutoff:1800});
  }else{
    tone(980,.095,.026,{type:'sine',attack:.003,cutoff:2400});
    tone(1240,.095,.022,{type:'sine',delay:.11,attack:.003,cutoff:2800});
  }
}

/* legacy no-op export */
export function setSoundEnabled(v: boolean) { masterVol = v ? 0.9 : 0; }
