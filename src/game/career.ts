import type {
  CareerStats, ContractMetric, ContractPeriodState, ContractState, DifficultyCareerRecord,
  DifficultyMode, GameEngine, ItemCareerStat, RunHistoryEntry, WeaponCareerStat,
} from './types';

const DIFFICULTIES:DifficultyMode[]=['easy','normal','hard','mad'];
const METRICS:ContractMetric[]=['runs','wins','enemies','bosses','damage','rooms','endlessRuns'];

const emptyDifficulty=():DifficultyCareerRecord=>({runs:0,wins:0,bestFloor:0,bestTime:0,bestEndlessRound:0,bestEndlessScore:0});
const emptyCareer=():CareerStats=>({
  runs:0,wins:0,deaths:0,abandoned:0,endlessRuns:0,totalEnemies:0,totalBosses:0,
  totalDamage:0,totalDamageTaken:0,totalRooms:0,totalPlayFrames:0,bestEndlessRound:0,bestFloor:0,
  difficulty:{easy:emptyDifficulty(),normal:emptyDifficulty(),hard:emptyDifficulty(),mad:emptyDifficulty()},
  weapons:{},items:{},
});

const finite=(v:unknown,f=0)=>typeof v==='number'&&Number.isFinite(v)&&v>=0?v:f;
const stringList=(v:unknown)=>Array.isArray(v)?v.filter((x):x is string=>typeof x==='string').slice(0,80):[];

function normalizeDifficulty(raw:unknown):Record<DifficultyMode,DifficultyCareerRecord>{
  const src=raw&&typeof raw==='object'?raw as Record<string,unknown>:{};
  return Object.fromEntries(DIFFICULTIES.map(d=>{
    const r=src[d]&&typeof src[d]==='object'?src[d] as Record<string,unknown>:{};
    return [d,{runs:finite(r.runs),wins:finite(r.wins),bestFloor:finite(r.bestFloor),bestTime:finite(r.bestTime),
      bestEndlessRound:finite(r.bestEndlessRound),bestEndlessScore:finite(r.bestEndlessScore)}];
  })) as Record<DifficultyMode,DifficultyCareerRecord>;
}
function normalizeWeapons(raw:unknown):Record<string,WeaponCareerStat>{
  const out:Record<string,WeaponCareerStat>={};
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return out;
  for(const [id,v] of Object.entries(raw as Record<string,unknown>)){
    if(!v||typeof v!=='object'||Array.isArray(v))continue;
    const r=v as Record<string,unknown>;
    out[id]={runs:finite(r.runs),wins:finite(r.wins),shots:finite(r.shots),damage:finite(r.damage),kills:finite(r.kills)};
  }
  return out;
}
function normalizeItems(raw:unknown):Record<string,ItemCareerStat>{
  const out:Record<string,ItemCareerStat>={};
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return out;
  for(const [id,v] of Object.entries(raw as Record<string,unknown>)){
    if(!v||typeof v!=='object'||Array.isArray(v))continue;
    const r=v as Record<string,unknown>;out[id]={runs:finite(r.runs),wins:finite(r.wins)};
  }
  return out;
}
function normalizeHistory(raw:unknown):RunHistoryEntry[]{
  if(!Array.isArray(raw))return [];
  return raw.filter(x=>x&&typeof x==='object').slice(0,12).map((x,i)=>{
    const r=x as Record<string,unknown>;
    const mode=r.mode==='endless'?'endless':'heist';
    const difficulty=DIFFICULTIES.includes(r.difficulty as DifficultyMode)?r.difficulty as DifficultyMode:'normal';
    const outcome=r.outcome==='victory'||r.outcome==='abandoned'?''+r.outcome:'death';
    return {
      id:typeof r.id==='string'?r.id:'legacy-'+i,mode,difficulty,outcome:outcome as RunHistoryEntry['outcome'],
      floor:finite(r.floor),round:finite(r.round),time:finite(r.time),enemies:finite(r.enemies),bosses:finite(r.bosses),
      damage:finite(r.damage),damageTaken:finite(r.damageTaken),items:finite(r.items),weapons:finite(r.weapons),
      golden:finite(r.golden),seed:typeof r.seed==='string'?r.seed:'PAN-LEGACY',
      weaponIds:stringList(r.weaponIds),itemIds:stringList(r.itemIds),
      activeItemId:typeof r.activeItemId==='string'?r.activeItemId:null,synergyIds:stringList(r.synergyIds),
    };
  });
}

const snapshot=(c:CareerStats):Record<ContractMetric,number>=>({
  runs:c.runs,wins:c.wins,enemies:c.totalEnemies,bosses:c.totalBosses,damage:c.totalDamage,
  rooms:c.totalRooms,endlessRuns:c.endlessRuns,
});
const dateKey=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const weekKey=(d=new Date())=>{
  const copy=new Date(d.getFullYear(),d.getMonth(),d.getDate());
  const offset=(copy.getDay()+6)%7;copy.setDate(copy.getDate()-offset);
  return dateKey(copy);
};
const freshPeriod=(key:string,c:CareerStats):ContractPeriodState=>({key,baseline:snapshot(c),rewarded:[]});
function normalizePeriod(raw:unknown,key:string,c:CareerStats):ContractPeriodState{
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return freshPeriod(key,c);
  const r=raw as Record<string,unknown>;
  if(r.key!==key)return freshPeriod(key,c);
  const baseRaw=r.baseline&&typeof r.baseline==='object'?r.baseline as Record<string,unknown>:{};
  const base=snapshot(c);for(const metric of METRICS)base[metric]=finite(baseRaw[metric],base[metric]);
  return {key,baseline:base,rewarded:stringList(r.rewarded)};
}
function loadContracts(c:CareerStats):ContractState{
  let raw:Record<string,unknown>={};
  try{const parsed=JSON.parse(localStorage.getItem('duckheist_contracts')||'{}');if(parsed&&typeof parsed==='object')raw=parsed;}catch{}
  return {daily:normalizePeriod(raw.daily,dateKey(),c),weekly:normalizePeriod(raw.weekly,weekKey(),c)};
}
function persistContracts(state:ContractState){
  try{localStorage.setItem('duckheist_contracts',JSON.stringify(state));}catch{}
}

export interface ContractDef {
  id:string;name:string;description:string;metric:ContractMetric;target:number;reward:number;period:'daily'|'weekly';
}
const DAILY:Omit<ContractDef,'period'>[]=[
  {id:'d_enemies',name:'LIMPIEZA RÁPIDA',description:'Derrota 25 enemigos.',metric:'enemies',target:25,reward:8},
  {id:'d_bosses',name:'MANDOS INTERMEDIOS',description:'Derrota 2 jefes de piso.',metric:'bosses',target:2,reward:10},
  {id:'d_damage',name:'DAÑOS MENORES',description:'Haz 1,800 de daño.',metric:'damage',target:1800,reward:8},
  {id:'d_rooms',name:'RUTA DE ESCAPE',description:'Completa 8 salas.',metric:'rooms',target:8,reward:8},
  {id:'d_runs',name:'FICHA DEL DÍA',description:'Termina 1 run.',metric:'runs',target:1,reward:6},
  {id:'d_win',name:'TRABAJO LIMPIO',description:'Consigue 1 victoria.',metric:'wins',target:1,reward:14},
  {id:'d_endless',name:'HORAS EXTRA',description:'Termina 1 intento de Atraco Sin Fin.',metric:'endlessRuns',target:1,reward:8},
];
const WEEKLY:Omit<ContractDef,'period'>[]=[
  {id:'w_enemies',name:'LISTA DE VIGILANCIA',description:'Derrota 150 enemigos.',metric:'enemies',target:150,reward:30},
  {id:'w_bosses',name:'CAMBIO DE GERENCIA',description:'Derrota 10 jefes de piso.',metric:'bosses',target:10,reward:35},
  {id:'w_damage',name:'PÓLIZA INÚTIL',description:'Haz 12,000 de daño.',metric:'damage',target:12000,reward:30},
  {id:'w_rooms',name:'PLANO COMPLETO',description:'Completa 45 salas.',metric:'rooms',target:45,reward:30},
  {id:'w_runs',name:'REINCIDENCIA',description:'Termina 6 runs.',metric:'runs',target:6,reward:25},
  {id:'w_wins',name:'DOS GOLPES',description:'Consigue 2 victorias.',metric:'wins',target:2,reward:40},
  {id:'w_endless',name:'SIN HORA DE SALIDA',description:'Termina 3 intentos Sin Fin.',metric:'endlessRuns',target:3,reward:25},
];
function hashKey(s:string){let h=2166136261>>>0;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}return h>>>0;}
function choose(key:string,pool:Omit<ContractDef,'period'>[],count:number,period:'daily'|'weekly'):ContractDef[]{
  const a=[...pool];let seed=hashKey(key+'-'+period);
  for(let i=a.length-1;i>0;i--){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const j=seed%(i+1);[a[i],a[j]]=[a[j],a[i]];}
  return a.slice(0,count).map(x=>({...x,period}));
}
export function contractDefinitions(e:GameEngine,period:'daily'|'weekly'){
  refreshContracts(e);
  const state=e.contracts[period];
  return choose(state.key,period==='daily'?DAILY:WEEKLY,3,period);
}
export function refreshContracts(e:GameEngine){
  const dk=dateKey(),wk=weekKey();let changed=false;
  if(e.contracts.daily.key!==dk){e.contracts.daily=freshPeriod(dk,e.career);changed=true;}
  if(e.contracts.weekly.key!==wk){e.contracts.weekly=freshPeriod(wk,e.career);changed=true;}
  if(changed)persistContracts(e.contracts);
}
export function contractProgress(e:GameEngine,def:ContractDef){
  const state=e.contracts[def.period],now=snapshot(e.career)[def.metric],base=state.baseline[def.metric]??0;
  return Math.max(0,Math.min(def.target,now-base));
}
export function applyContractRewards(e:GameEngine){
  refreshContracts(e);let reward=0;
  for(const period of ['daily','weekly'] as const){
    const state=e.contracts[period];
    for(const def of contractDefinitions(e,period)){
      if(contractProgress(e,def)>=def.target&&!state.rewarded.includes(def.id)){
        state.rewarded.push(def.id);reward+=def.reward;
      }
    }
  }
  if(reward>0){e.totalGoldenCrumbs+=reward;e.toast='CONTRATOS COMPLETADOS · +'+reward+' MONEDAS';e.toastTimer=150;}
  persistContracts(e.contracts);return reward;
}

export function loadCareer() {
  let career=emptyCareer(),history:RunHistoryEntry[]=[];
  try {
    const c=JSON.parse(localStorage.getItem('duckheist_career')||'null');
    if(c&&typeof c==='object'){
      career={
        runs:finite(c.runs),wins:finite(c.wins),deaths:finite(c.deaths),abandoned:finite(c.abandoned),
        endlessRuns:finite(c.endlessRuns),totalEnemies:finite(c.totalEnemies),totalBosses:finite(c.totalBosses),
        totalDamage:finite(c.totalDamage),totalDamageTaken:finite(c.totalDamageTaken),totalRooms:finite(c.totalRooms),
        totalPlayFrames:finite(c.totalPlayFrames),bestEndlessRound:finite(c.bestEndlessRound),bestFloor:finite(c.bestFloor),
        difficulty:normalizeDifficulty(c.difficulty),weapons:normalizeWeapons(c.weapons),items:normalizeItems(c.items),
      };
    }
    history=normalizeHistory(JSON.parse(localStorage.getItem('duckheist_history')||'[]'));
  } catch {}
  return {career,history,contracts:loadContracts(career)};
}

export function recordRun(engine:GameEngine,outcome:RunHistoryEntry['outcome']) {
  if(engine.testing||engine.runRecorded||engine.run.time<=0) return;
  engine.runRecorded=true;
  const weaponIds=[...new Set(engine.run.weaponIds)];
  const itemIds=[...new Set(engine.run.itemIds)];
  const entry:RunHistoryEntry={
    id:String(Date.now())+'-'+engine.run.seed,mode:engine.gameMode,difficulty:engine.difficulty,outcome,
    floor:engine.run.floorReached,round:engine.gameMode==='endless'?engine.endless.round:0,time:engine.run.time,
    enemies:engine.stats.enemiesDefeated,bosses:engine.run.bosses,damage:Math.round(engine.run.dmgDealt),
    damageTaken:Math.round(engine.run.dmgTaken*10)/10,items:engine.run.items,weapons:engine.run.weaponsFound,
    golden:engine.run.goldenEarned,seed:engine.run.seed,weaponIds,itemIds,activeItemId:engine.player.activeItem,
    synergyIds:[...engine.knownSynergies],
  };
  engine.runHistory=[entry,...engine.runHistory].slice(0,12);
  const c=engine.career;
  c.runs++;if(outcome==='victory')c.wins++;else if(outcome==='death')c.deaths++;else c.abandoned++;
  if(engine.gameMode==='endless')c.endlessRuns++;
  c.totalEnemies+=entry.enemies;c.totalBosses+=entry.bosses;c.totalDamage+=entry.damage;c.totalDamageTaken+=entry.damageTaken;
  c.totalRooms+=engine.stats.roomsCleared;c.totalPlayFrames+=entry.time;c.bestFloor=Math.max(c.bestFloor,entry.floor);
  c.bestEndlessRound=Math.max(c.bestEndlessRound,entry.round);

  const dr=c.difficulty[engine.difficulty]??(c.difficulty[engine.difficulty]=emptyDifficulty());
  dr.runs++;dr.bestFloor=Math.max(dr.bestFloor,entry.floor);
  if(outcome==='victory'&&engine.gameMode==='heist'){dr.wins++;dr.bestTime=dr.bestTime?Math.min(dr.bestTime,entry.time):entry.time;}
  if(engine.gameMode==='endless'){dr.bestEndlessRound=Math.max(dr.bestEndlessRound,entry.round);dr.bestEndlessScore=Math.max(dr.bestEndlessScore,Math.round(engine.endless.score));}

  for(const id of weaponIds){
    const stat=c.weapons[id]??(c.weapons[id]={runs:0,wins:0,shots:0,damage:0,kills:0});
    stat.runs++;if(outcome==='victory')stat.wins++;
    const rs=engine.run.weaponStats[id];if(rs){stat.shots+=rs.shots;stat.damage+=Math.round(rs.damage);stat.kills+=rs.kills;}
  }
  const usedItems=[...new Set([...itemIds,...(entry.activeItemId?[entry.activeItemId]:[])])];
  for(const id of usedItems){const stat=c.items[id]??(c.items[id]={runs:0,wins:0});stat.runs++;if(outcome==='victory')stat.wins++;}

  applyContractRewards(engine);
  try {
    localStorage.setItem('duckheist_career',JSON.stringify(c));
    localStorage.setItem('duckheist_history',JSON.stringify(engine.runHistory));
  } catch {}
}

export interface CareerAchievement {id:string;name:string;description:string;unlocked:boolean;progress:string;}
export function careerAchievements(engine:GameEngine):CareerAchievement[] {
  const c=engine.career;
  const discovered=Object.values(engine.discovered).reduce((a,list)=>a+list.length,0);
  const synergyCount=engine.discovered.synergies?.length??0;
  return [
    {id:'first_run',name:'PRIMER EXPEDIENTE',description:'Termina cualquier run.',unlocked:c.runs>=1,progress:Math.min(c.runs,1)+'/1'},
    {id:'first_win',name:'BANCO VACIADO',description:'Completa el atraco principal.',unlocked:c.wins>=1,progress:Math.min(c.wins,1)+'/1'},
    {id:'enemy_100',name:'LISTA NEGRA',description:'Derrota 100 enemigos.',unlocked:c.totalEnemies>=100,progress:Math.min(c.totalEnemies,100)+'/100'},
    {id:'boss_10',name:'PROBLEMA DE GERENCIA',description:'Derrota 10 jefes.',unlocked:c.totalBosses>=10,progress:Math.min(c.totalBosses,10)+'/10'},
    {id:'endless_20',name:'NO HAY SALIDA',description:'Alcanza la ronda 20 en Atraco Sin Fin.',unlocked:c.bestEndlessRound>=20,progress:Math.min(c.bestEndlessRound,20)+'/20'},
    {id:'damage_10k',name:'DAÑOS AL PATRIMONIO',description:'Haz 10,000 de daño acumulado.',unlocked:c.totalDamage>=10000,progress:Math.min(c.totalDamage,10000)+'/10000'},
    {id:'archive_40',name:'ARCHIVO ABIERTO',description:'Descubre 40 entradas de la colección.',unlocked:discovered>=40,progress:Math.min(discovered,40)+'/40'},
    {id:'synergy_5',name:'QUÍMICA DELICTIVA',description:'Descubre 5 sinergias.',unlocked:synergyCount>=5,progress:Math.min(synergyCount,5)+'/5'},
    {id:'runs_25',name:'REINCIDENTE',description:'Termina 25 runs.',unlocked:c.runs>=25,progress:Math.min(c.runs,25)+'/25'},
  ];
}
