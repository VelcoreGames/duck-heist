import type { CareerStats, GameEngine, RunHistoryEntry } from './types';

const EMPTY:CareerStats={
  runs:0,wins:0,deaths:0,abandoned:0,endlessRuns:0,totalEnemies:0,totalBosses:0,
  totalDamage:0,totalDamageTaken:0,totalRooms:0,totalPlayFrames:0,bestEndlessRound:0,bestFloor:0,
};

const finite=(v:unknown,f=0)=>typeof v==='number'&&Number.isFinite(v)&&v>=0?v:f;

export function loadCareer() {
  let career={...EMPTY}, history:RunHistoryEntry[]=[];
  try {
    const c=JSON.parse(localStorage.getItem('duckheist_career')||'null');
    if(c&&typeof c==='object'){
      career={
        runs:finite(c.runs),wins:finite(c.wins),deaths:finite(c.deaths),abandoned:finite(c.abandoned),
        endlessRuns:finite(c.endlessRuns),totalEnemies:finite(c.totalEnemies),totalBosses:finite(c.totalBosses),
        totalDamage:finite(c.totalDamage),totalDamageTaken:finite(c.totalDamageTaken),totalRooms:finite(c.totalRooms),
        totalPlayFrames:finite(c.totalPlayFrames),bestEndlessRound:finite(c.bestEndlessRound),bestFloor:finite(c.bestFloor),
      };
    }
    const h=JSON.parse(localStorage.getItem('duckheist_history')||'[]');
    if(Array.isArray(h)) history=h.filter(x=>x&&typeof x==='object').slice(0,12) as RunHistoryEntry[];
  } catch {/* unavailable storage */}
  return {career,history};
}

export function recordRun(engine:GameEngine,outcome:RunHistoryEntry['outcome']) {
  if(engine.testing||engine.runRecorded||engine.run.time<=0) return;
  engine.runRecorded=true;
  const entry:RunHistoryEntry={
    id:String(Date.now())+'-'+engine.run.seed,
    mode:engine.gameMode,difficulty:engine.difficulty,outcome,
    floor:engine.run.floorReached,round:engine.gameMode==='endless'?engine.endless.round:0,
    time:engine.run.time,enemies:engine.stats.enemiesDefeated,bosses:engine.run.bosses,
    damage:Math.round(engine.run.dmgDealt),damageTaken:Math.round(engine.run.dmgTaken*10)/10,
    items:engine.run.items,weapons:engine.run.weaponsFound,golden:engine.run.goldenEarned,seed:engine.run.seed,
  };
  engine.runHistory=[entry,...engine.runHistory].slice(0,12);
  const c=engine.career;
  c.runs++; if(outcome==='victory')c.wins++; else if(outcome==='death')c.deaths++; else c.abandoned++;
  if(engine.gameMode==='endless') c.endlessRuns++;
  c.totalEnemies+=entry.enemies;c.totalBosses+=entry.bosses;c.totalDamage+=entry.damage;c.totalDamageTaken+=entry.damageTaken;
  c.totalRooms+=engine.stats.roomsCleared;c.totalPlayFrames+=entry.time;
  c.bestFloor=Math.max(c.bestFloor,entry.floor);
  c.bestEndlessRound=Math.max(c.bestEndlessRound,entry.round);
  try {
    localStorage.setItem('duckheist_career',JSON.stringify(c));
    localStorage.setItem('duckheist_history',JSON.stringify(engine.runHistory));
  } catch {/* unavailable storage */}
}

export interface CareerAchievement {id:string;name:string;description:string;unlocked:boolean;progress:string;}
export function careerAchievements(engine:GameEngine):CareerAchievement[] {
  const c=engine.career;
  const discovered=Object.values(engine.discovered).reduce((a,list)=>a+list.length,0);
  return [
    {id:'first_run',name:'PRIMER EXPEDIENTE',description:'Termina cualquier run.',unlocked:c.runs>=1,progress:Math.min(c.runs,1)+'/1'},
    {id:'first_win',name:'BANCO VACIADO',description:'Completa el atraco principal.',unlocked:c.wins>=1,progress:Math.min(c.wins,1)+'/1'},
    {id:'enemy_100',name:'LISTA NEGRA',description:'Derrota 100 enemigos.',unlocked:c.totalEnemies>=100,progress:Math.min(c.totalEnemies,100)+'/100'},
    {id:'boss_10',name:'PROBLEMA DE GERENCIA',description:'Derrota 10 jefes.',unlocked:c.totalBosses>=10,progress:Math.min(c.totalBosses,10)+'/10'},
    {id:'endless_20',name:'NO HAY SALIDA',description:'Alcanza la ronda 20 en Atraco Sin Fin.',unlocked:c.bestEndlessRound>=20,progress:Math.min(c.bestEndlessRound,20)+'/20'},
    {id:'damage_10k',name:'DAÑOS AL PATRIMONIO',description:'Haz 10,000 de daño acumulado.',unlocked:c.totalDamage>=10000,progress:Math.min(c.totalDamage,10000)+'/10000'},
    {id:'archive_40',name:'ARCHIVO ABIERTO',description:'Descubre 40 entradas de la colección.',unlocked:discovered>=40,progress:Math.min(discovered,40)+'/40'},
    {id:'runs_25',name:'REINCIDENTE',description:'Termina 25 runs.',unlocked:c.runs>=25,progress:Math.min(c.runs,25)+'/25'},
  ];
}
