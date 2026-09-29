export function seededRandom(seed:string) {
  let state=2166136261;
  for(let i=0;i<seed.length;i++) state=Math.imul(state^seed.charCodeAt(i),16777619);
  return () => {
    state|=0;state=(state+0x6d2b79f5)|0;
    let t=Math.imul(state^(state>>>15),1|state);
    t=(t+Math.imul(t^(t>>>7),61|t))^t;
    return ((t^(t>>>14))>>>0)/4294967296;
  };
}

export interface GameRandomSnapshot {
  seed:string;
  state:number;
}

function seedState(seed:string){
  let state=2166136261;
  for(let i=0;i<seed.length;i++) state=Math.imul(state^seed.charCodeAt(i),16777619);
  return state|0;
}

let source:()=>number=Math.random;
let deterministicSeed:string|null=null;
let deterministicState=0;

function nextDeterministic(){
  deterministicState|=0;
  deterministicState=(deterministicState+0x6d2b79f5)|0;
  let t=Math.imul(deterministicState^(deterministicState>>>15),1|deterministicState);
  t=(t+Math.imul(t^(t>>>7),61|t))^t;
  return ((t^(t>>>14))>>>0)/4294967296;
}

export function gameRandom(){return source();}

export function setGameRandom(fn:()=>number){
  deterministicSeed=null;
  deterministicState=0;
  source=fn;
}

export function setGameRandomSeed(seed:string,state?:number){
  deterministicSeed=seed;
  deterministicState=Number.isInteger(state)?Number(state)|0:seedState(seed);
  source=nextDeterministic;
}

export function gameRandomSnapshot():GameRandomSnapshot|null {
  return deterministicSeed===null?null:{seed:deterministicSeed,state:deterministicState|0};
}

export function restoreGameRandom(snapshot:GameRandomSnapshot|null|undefined){
  if(snapshot?.seed&&Number.isInteger(snapshot.state)) setGameRandomSeed(snapshot.seed,snapshot.state);
  else resetGameRandom();
}

export function resetGameRandom(){
  deterministicSeed=null;
  deterministicState=0;
  source=Math.random;
}
