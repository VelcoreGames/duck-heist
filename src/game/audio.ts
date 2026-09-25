// Audio procedural: efectos sintetizados + música generativa
let audioCtx: AudioContext | null = null;

let masterVol = 0.9;
let musicVol = 0.45;
let sfxVol = 0.9;

let musicTimer:number|null=null;
let musicSwitchTimer:number|null=null;
let musicStep=0;
let musicBus:GainNode|null=null;
let musicTransitionSerial=0;
export type MusicMood='menu'|'start'|'combat'|'run'|'shop'|'gunvan'|'cafe'|'event'|'challenge'|'item'|'choice'|'treasure'|'secret'|'miniboss'|'subboss'|'boss'|'off';
let musicMood:MusicMood='off';
let musicFloor=0;
let musicVariant='';
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
    musicBus.gain.value=1;
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
  tone(freq,.22,vol,{type:'triangle',to:freq*.985,delay,attack:.003,cutoff:2100,kind:'music'});
}

// ---------------------------------------------------------------------------
// MÚSICA CINEMÁTICA PROCEDURAL
// ---------------------------------------------------------------------------
const RUN_ROOTS=[73.42,82.41,65.41,69.30,61.74,55.00];
const MINOR=[1,Math.pow(2,3/12),Math.pow(2,7/12),Math.pow(2,10/12)];
const DARK=[1,Math.pow(2,3/12),Math.pow(2,6/12),Math.pow(2,10/12)];

export function setMusic(mood:MusicMood,floor=musicFloor,variant=''){
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
    musicStep=0;
    const variantSeed=musicHash(variant||mood);
    const bpm=
      mood==='boss'?[62,68,74,80,86,70][variantSeed%6]:
      mood==='subboss'?[78,86,92,72][variantSeed%4]:
      mood==='miniboss'?[104,112,96][variantSeed%3]:
      mood==='event'?116:
      mood==='challenge'?108:
      mood==='gunvan'?82:
      mood==='shop'?76:
      mood==='cafe'?72:
      mood==='secret'?66:
      mood==='treasure'?70:
      mood==='choice'?74:
      mood==='item'?68:
      mood==='start'?72:
      mood==='combat'?96:
      mood==='run'?94:68;
    const beat=60000/bpm/2;

    try{
      const ctx=getCtx(),bus=getMusicBus(ctx),now=ctx.currentTime;
      bus.gain.cancelScheduledValues(now);
      bus.gain.setValueAtTime(.001,now);
      bus.gain.linearRampToValueAtTime(1,now+.34);
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

  // Cada tema usa su propio bus. El anterior baja y queda aislado; el nuevo
  // entra en otro bus, de modo que las colas largas nunca reaparecen.
  try{
    const ctx=getCtx(),now=ctx.currentTime;
    fadingBus.gain.cancelScheduledValues(now);
    fadingBus.gain.setValueAtTime(Math.max(.001,fadingBus.gain.value),now);
    fadingBus.gain.linearRampToValueAtTime(.001,now+.20);
  }catch{/* audio bloqueado por navegador */}
  musicSwitchTimer=window.setTimeout(()=>{
    musicSwitchTimer=null;
    if(serial!==musicTransitionSerial)return;
    if(musicBus===fadingBus)musicBus=null;
    startTheme();
    window.setTimeout(()=>{try{fadingBus.disconnect();}catch{/* ya desconectado */}},1400);
  },205);
}

function tickMusic(mood:Exclude<MusicMood,'off'>,beat:number,variant=''){
  if(musicVol<=.001||masterVol<=.001)return;
  const step=musicStep++,sec=beat/1000;
  const variantSeed=musicHash(variant||mood);

  if(mood==='menu'){
    const roots=[73.42,65.41,58.27,65.41],root=roots[Math.floor(step/4)%roots.length];
    if(step%4===0){chord(root,[1,1.5,2],sec*3.8,.016,0,1050);tone(root/2,sec*3.6,.015,{type:'sine',attack:.18,cutoff:240,kind:'music'});}
    if(step%2===0)tone(root*2,sec*.7,.006,{type:'triangle',attack:.05,cutoff:1300,kind:'music'});
    return;
  }

  if(mood==='start'){
    const root=[65.41,69.30,61.74,65.41][Math.floor(step/4)%4];
    if(step%8===0)chord(root,[1,1.5,2],sec*7.2,.010,0,1300);
    if(step%4===2)tone(root*2,sec*.55,.0045,{type:'triangle',attack:.06,cutoff:1700,kind:'music'});
    if(step%8===6)filteredNoise(.04,.003,{type:'highpass',freq:3400,q:.5,kind:'music'});
    return;
  }

  if(mood==='combat'){
    const root=RUN_ROOTS[Math.min(5,musicFloor)];
    const phase=step%16;
    if(phase%8===0)chord(root,MINOR,sec*6.8,.013,0,1450);
    if(phase%2===0){
      tone(root/2,sec*.62,.021,{type:'sine',to:root/2*.97,attack:.006,cutoff:280,kind:'music'});
      filteredNoise(.048,.0065,{type:'highpass',freq:3150,q:.62,kind:'music'});
    }
    if(phase===3||phase===11)tone(root*2.25,sec*.28,.0055,{type:'triangle',attack:.01,cutoff:1850,kind:'music'});
    if(phase===7||phase===15)lowImpact(58,.014,0,'music');
    return;
  }

  if(mood==='choice'){
    const root=[69.3,65.41,73.42,65.41][Math.floor(step/4)%4];
    if(step%8===0)chord(root,[1,Math.pow(2,4/12),1.5,2],sec*7,.0095,0,1550);
    if(step%4===1||step%4===3)tone(root*(step%8<4?2:2.5),sec*.48,.004,{type:'sine',attack:.04,cutoff:2100,kind:'music'});
    if(step%8===6)tone(root*3,sec*.3,.0035,{type:'triangle',attack:.01,cutoff:2600,kind:'music'});
    return;
  }

  if(mood==='shop'||mood==='gunvan'||mood==='cafe'){
    const root=mood==='gunvan'?49:mood==='cafe'?65.41:58.27;
    const phase=step%16;
    if(phase%8===0)chord(root,mood==='cafe'?MINOR:[1,1.25,1.5,2],sec*7,.011,0,mood==='gunvan'?900:1300);
    if(phase%2===0)tone(root*(phase%4===0?2:1.5),sec*.65,mood==='cafe'?.004:.006,{type:mood==='gunvan'?'sawtooth':'triangle',attack:.03,cutoff:mood==='gunvan'?620:1500,kind:'music'});
    if(mood==='cafe'&&phase%4===2)tone(root*3,sec*.28,.0035,{type:'sine',attack:.02,cutoff:2200,kind:'music'});
    if(mood==='gunvan'&&(phase===3||phase===11))lowImpact(46,.014,0,'music');
    return;
  }

  if(mood==='item'||mood==='treasure'||mood==='secret'){
    const root=mood==='secret'?51.91:mood==='treasure'?69.3:61.74;
    const phase=step%16;
    if(phase%8===0)chord(root,[1,Math.pow(2,4/12),1.5,2],sec*7.5,.010,0,1500);
    if(phase===2||phase===6||phase===10||phase===14)tone(root*(mood==='secret'?1.5:2),sec*.85,.0045,{type:'sine',attack:.08,cutoff:1800,kind:'music'});
    if(mood==='treasure'&&(phase===4||phase===12))tone(root*3,sec*.32,.004,{type:'triangle',attack:.01,cutoff:2600,kind:'music'});
    if(mood==='secret'&&phase%4===1)filteredNoise(.05,.003,{type:'bandpass',freq:1500,q:2.4,kind:'music'});
    return;
  }

  if(mood==='challenge'){
    const root=RUN_ROOTS[Math.min(5,musicFloor)]*Math.pow(2,-2/12);
    const phase=step%16;
    if(phase%8===0)chord(root,DARK,sec*6.5,.012,0,1200);
    if(phase%2===0){tone(root/2,sec*.55,.019,{type:'sawtooth',attack:.006,cutoff:360,kind:'music'});filteredNoise(.045,.006,{type:'highpass',freq:3000,q:.7,kind:'music'});}
    if(phase===6||phase===14)tone(root*2.5,sec*.32,.006,{type:'triangle',attack:.01,cutoff:1800,kind:'music'});
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

  if(mood==='miniboss'){
    const style=variantSeed%3,phase=step%16;
    if(style===0){
      // Percusión seca y bajo marcial.
      const root=[73.42,69.3,65.41,69.3][Math.floor(step/4)%4];
      if(phase%4===0)musicKick(.026);
      if(phase===4||phase===12)musicSnare(.012);
      if(phase%2===0)musicPluck(root*(phase%4===0?1:1.5),.010);
      if(phase===0||phase===8)chord(root/2,DARK,sec*6,.010,0,820);
    }else if(style===1){
      // Mecánico: pulsos sincopados y campanas metálicas.
      const root=[58.27,61.74,55,58.27][Math.floor(step/4)%4];
      if(phase===0||phase===8)tone(root/2,sec*7,.018,{type:'sine',attack:.15,cutoff:240,kind:'music'});
      if([1,4,7,10,13].includes(phase))musicBell(root*(phase%2?3:2.5),.32,.006);
      if(phase%4===2)filteredNoise(.04,.006,{type:'highpass',freq:3000,q:1.1,kind:'music'});
    }else{
      // Cacería nerviosa: ostinato rápido y silencios marcados.
      const root=[65.41,61.74,58.27,55][Math.floor(step/4)%4];
      if(phase%2===0)musicPluck(root*[1,1.5,1.78,1.5][(phase/2)%4],.011);
      if(phase===0||phase===6||phase===10)musicKick(.021);
      if(phase===7||phase===15)filteredNoise(.07,.008,{type:'bandpass',freq:2100,q:1.4,kind:'music'});
    }
    return;
  }

  if(mood==='subboss'){
    const style=variantSeed%4,phase=step%16;
    if(style===0){
      // Militar pesado.
      const root=[55,49,51.91,46.25][Math.floor(step/4)%4];
      if(phase%4===0)musicKick(.035);
      if(phase===4||phase===12)musicSnare(.014);
      if(phase%2===0)tone(root,sec*.55,.013,{type:'sawtooth',attack:.02,cutoff:520,kind:'music'});
      if(phase===0||phase===8)chord(root/2,DARK,sec*7,.018,0,760);
    }else if(style===1){
      // Litúrgico / siniestro: casi sin percusión, voces sintéticas y campanas.
      const root=[46.25,43.65,41.2,43.65][Math.floor(step/4)%4];
      if(phase===0||phase===8){chord(root,[1,1.5,2,2.52],sec*7.5,.017,0,1000);tone(root/2,sec*7.2,.018,{type:'sine',attack:.25,cutoff:220,kind:'music'});}
      if(phase===3||phase===11)musicBell(root*4,.8,.006);
      if(phase===7||phase===15)filteredNoise(.14,.006,{type:'bandpass',freq:900,q:2.4,kind:'music'});
    }else if(style===2){
      // Industrial: golpes y pulsos cortos.
      const root=[61.74,55,58.27,51.91][Math.floor(step/4)%4];
      if([0,3,6,8,11,14].includes(phase))musicKick(.03);
      if([2,5,10,13].includes(phase))filteredNoise(.055,.009,{type:'bandpass',freq:1750,q:.8,kind:'music'});
      if(phase%4===1)tone(root*.5,sec*.35,.015,{type:'square',attack:.004,cutoff:410,kind:'music'});
      if(phase===0||phase===8)chord(root,DARK,sec*4.8,.010,0,720);
    }else{
      // Duelista: cuerda/pluck rápida, prácticamente sin drones.
      const root=[69.3,65.41,73.42,61.74][Math.floor(step/4)%4];
      const seq=[1,1.5,1.26,1.78,1.5,2,1.78,1.5];
      if(phase%2===0)musicPluck(root*seq[(phase/2)%seq.length],.012);
      if(phase===0||phase===8)musicKick(.022);
      if(phase===6||phase===14)musicBell(root*3,.36,.005);
    }
    return;
  }

  if(mood==='boss'){
    const style=variantSeed%6,phase=step%16;
    if(style===0){
      // WAR DRUMS: jefe militar, enorme y frontal.
      const root=[43.65,41.2,38.89,41.2][Math.floor(step/4)%4];
      if([0,3,6,8,11,14].includes(phase))musicKick(phase===0||phase===8?.050:.035);
      if(phase===4||phase===12)musicSnare(.017);
      if(phase%2===0)tone(root,sec*.68,.016,{type:'sawtooth',to:root*.985,attack:.025,cutoff:460,kind:'music'});
      if(phase===0||phase===8)chord(root/2,DARK,sec*7.8,.021,0,720);
    }else if(style===1){
      // CATEDRAL: lento, coral, campanas; casi nada rítmico.
      const root=[41.2,38.89,36.71,34.65][Math.floor(step/8)%4];
      if(phase===0||phase===8){
        chord(root/2,[1,1.5,2,2.52],sec*8,.026,0,900);
        chord(root,[1,Math.pow(2,3/12),1.5,2],sec*7,.013,.08,1250);
      }
      if(phase===2||phase===10)musicBell(root*4,1.1,.008);
      if(phase===6||phase===14)tone(root*2.52,sec*2.2,.006,{type:'sine',to:root*2.38,attack:.15,cutoff:1300,kind:'music'});
    }else if(style===2){
      // INDUSTRIAL: reactor/máquina pesada.
      const root=[49,46.25,43.65,46.25][Math.floor(step/4)%4];
      if([0,2,5,8,10,13].includes(phase))musicKick(.040);
      if([3,7,11,15].includes(phase))filteredNoise(.075,.012,{type:'bandpass',freq:1300,q:.7,kind:'music'});
      if(phase%2===0)tone(root/2,sec*.4,.019,{type:'square',attack:.004,cutoff:330,kind:'music'});
      if(phase===0||phase===8)tone(root,sec*4.5,.010,{type:'sawtooth',attack:.1,cutoff:650,kind:'music'});
    }else if(style===3){
      // VÓRTICE: arpegios circulares y pulsos dobles.
      const root=[55,51.91,58.27,49][Math.floor(step/4)%4];
      const seq=[1,1.5,2,Math.pow(2,6/12),2,1.5,1.26,1.5];
      musicPluck(root*seq[phase%8],.008);
      if(phase%2===1)musicPluck(root*seq[(15-phase)%8]*.5,.006,.03);
      if(phase===0||phase===8){musicKick(.028);chord(root/2,DARK,sec*6.8,.014,0,780);}
    }else if(style===4){
      // EJECUTOR: espacio, golpe seco, silencio y frase amenazante.
      const root=[46.25,43.65,49,41.2][Math.floor(step/4)%4];
      if(phase===0||phase===8){lowImpact(38,.060,0,'music');chord(root/2,DARK,sec*7.5,.022,0,700);}
      if(phase===3||phase===11){musicSnare(.019);musicBell(root*3,.42,.007,.03);}
      if(phase===6||phase===14)tone(root*1.5,sec*.9,.010,{type:'sawtooth',to:root,attack:.02,cutoff:620,kind:'music'});
    }else{
      // ENJAMBRE/CAOS: ritmo más rápido y capas que se responden.
      const root=[61.74,55,58.27,51.91][Math.floor(step/4)%4];
      if(phase%2===0)musicKick(.026);
      if(phase%4===2)musicSnare(.010);
      musicPluck(root*[1,1.5,1.78,2][phase%4],.007);
      if(phase%4===1)musicBell(root*[2,2.52,3,2.67][Math.floor(phase/4)],.25,.004);
      if(phase===0||phase===8)chord(root/2,DARK,sec*5.5,.013,0,850);
    }
    return;
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
