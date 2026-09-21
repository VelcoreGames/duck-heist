import type {
  DailyChallengeProfile, DailyChallengeRecord, DailyChallengeResult, DailyMedal,
  DailyModifier, GameEngine, RunHistoryEntry,
} from './types';

export const DAILY_MODIFIERS:Record<DailyModifier,{name:string;description:string;accent:string}> = {
  SECURITY_SURGE:{name:'SEGURIDAD REFORZADA',description:'+18% vida y +12% daño enemigo.','#accent':'#d85d58'} as any,
  ELITE_AUDIT:{name:'AUDITORÍA ÉLITE',description:'Más enemigos élite en salas de combate.',accent:'#e6c56f'},
  SPEED_CHECK:{name:'RESPUESTA RÁPIDA',description:'Enemigos ligeramente más veloces y disparan antes.',accent:'#79b9d2'},
  GLASS_BEAK:{name:'PICO DE CRISTAL',description:'Empiezas con 3 corazones, pero haces +25% de daño.',accent:'#c98cff'},
  NO_LUNCH:{name:'SIN HORA DE COMER',description:'La curación recupera solo 65% de su valor normal.',accent:'#8fb7c8'},
  HOT_START:{name:'ALARMA PREVIA',description:'El atraco comienza con 25 puntos de alerta.',accent:'#d86b58'},
};

const fixSecurity=DAILY_MODIFIERS.SECURITY_SURGE as any;
if(fixSecurity['#accent']) {fixSecurity.accent=fixSecurity['#accent'];delete fixSecurity['#accent'];}

const POOL=Object.keys(DAILY_MODIFIERS) as DailyModifier[];
const RANK:DailyMedal[]=['NONE','BRONZE','SILVER','GOLD','PLATINUM'];
const REWARD:Record<DailyMedal,number>={NONE:0,BRONZE:8,SILVER:16,GOLD:28,PLATINUM:45};

export function dailyKey(d=new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
export function dailySeed(key=dailyKey()) { return 'DAILY-'+key.replaceAll('-',''); }

function hash(s:string){
  let h=2166136261>>>0;
  for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}
  return h>>>0;
}
export function dailyModifiers(key=dailyKey()):DailyModifier[] {
  const a=[...POOL];let seed=hash(key+'-duck-heist-daily');
  for(let i=a.length-1;i>0;i--){
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const j=seed%(i+1);[a[i],a[j]]=[a[j],a[i]];
  }
  return a.slice(0,3);
}

function blankRecord(key=dailyKey()):DailyChallengeRecord {
  return {key,seed:dailySeed(key),attempts:0,bestScore:0,bestMedal:'NONE',bestFloor:0,bestTime:0,completed:false,rewardGranted:0};
}
export function loadDailyChallenge():DailyChallengeProfile {
  const key=dailyKey();
  let p:DailyChallengeProfile={current:blankRecord(key),totalCompleted:0,goldCount:0,currentStreak:0,bestStreak:0,lastCompletedKey:''};
  try {
    const raw=JSON.parse(localStorage.getItem('duckheist_daily')||'null');
    if(raw&&typeof raw==='object'){
      p={
        current:raw.current&&typeof raw.current==='object'?{
          key:typeof raw.current.key==='string'?raw.current.key:key,
          seed:typeof raw.current.seed==='string'?raw.current.seed:dailySeed(key),
          attempts:Number.isFinite(raw.current.attempts)?Math.max(0,raw.current.attempts):0,
          bestScore:Number.isFinite(raw.current.bestScore)?Math.max(0,raw.current.bestScore):0,
          bestMedal:RANK.includes(raw.current.bestMedal)?raw.current.bestMedal:'NONE',
          bestFloor:Number.isFinite(raw.current.bestFloor)?Math.max(0,raw.current.bestFloor):0,
          bestTime:Number.isFinite(raw.current.bestTime)?Math.max(0,raw.current.bestTime):0,
          completed:raw.current.completed===true,
          rewardGranted:Number.isFinite(raw.current.rewardGranted)?Math.max(0,raw.current.rewardGranted):0,
        }:blankRecord(key),
        totalCompleted:Number.isFinite(raw.totalCompleted)?Math.max(0,raw.totalCompleted):0,
        goldCount:Number.isFinite(raw.goldCount)?Math.max(0,raw.goldCount):0,
        currentStreak:Number.isFinite(raw.currentStreak)?Math.max(0,raw.currentStreak):0,
        bestStreak:Number.isFinite(raw.bestStreak)?Math.max(0,raw.bestStreak):0,
        lastCompletedKey:typeof raw.lastCompletedKey==='string'?raw.lastCompletedKey:'',
      };
    }
  } catch {}
  ensureDailyProfile(p);
  return p;
}
export function ensureDailyProfile(profile:DailyChallengeProfile) {
  const key=dailyKey();
  if(profile.current.key!==key) profile.current=blankRecord(key);
  return profile;
}
export function persistDaily(profile:DailyChallengeProfile) {
  try{localStorage.setItem('duckheist_daily',JSON.stringify(profile));}catch{}
}

export function medalForScore(score:number):DailyMedal {
  if(score>=16000)return 'PLATINUM';
  if(score>=11000)return 'GOLD';
  if(score>=6500)return 'SILVER';
  if(score>=3000)return 'BRONZE';
  return 'NONE';
}
export function dailyScore(e:GameEngine,outcome:RunHistoryEntry['outcome']|'live'='live') {
  const sec=e.run.time/60;
  const victory=outcome==='victory'?6000:0;
  const raw=e.stats.floorsCleared*1200+e.stats.enemiesDefeated*32+e.run.bosses*800+e.stats.roomsCleared*75+
    e.run.dmgDealt*.45+e.run.goldenEarned*20+victory-e.run.dmgTaken*170-sec*1.35;
  return Math.max(0,Math.round(raw));
}
function previousDateKey(key:string){
  const [y,m,d]=key.split('-').map(Number),dt=new Date(y,m-1,d);dt.setDate(dt.getDate()-1);return dailyKey(dt);
}
export function finalizeDaily(e:GameEngine,outcome:DailyChallengeResult['outcome']):DailyChallengeResult|null {
  if(e.gameMode!=='daily')return null;
  ensureDailyProfile(e.dailyProfile);
  const record=e.dailyProfile.current,score=dailyScore(e,outcome),medal=medalForScore(score);
  const newBest=score>record.bestScore;
  record.attempts++;
  record.bestFloor=Math.max(record.bestFloor,e.run.floorReached);
  if(newBest){record.bestScore=score;record.bestMedal=medal;record.bestTime=e.run.time;}
  const wasCompleted=record.completed;
  if(outcome==='victory'){
    record.completed=true;
    if(!wasCompleted){
      e.dailyProfile.totalCompleted++;
      e.dailyProfile.currentStreak=e.dailyProfile.lastCompletedKey===previousDateKey(record.key)?e.dailyProfile.currentStreak+1:1;
      e.dailyProfile.bestStreak=Math.max(e.dailyProfile.bestStreak,e.dailyProfile.currentStreak);
      e.dailyProfile.lastCompletedKey=record.key;
    }
  }
  if(RANK.indexOf(medal)>=RANK.indexOf('GOLD') && RANK.indexOf(record.bestMedal)>=RANK.indexOf('GOLD') && newBest && RANK.indexOf(medal)>RANK.indexOf('SILVER')){
    if(medal==='GOLD' && record.rewardGranted<REWARD.GOLD)e.dailyProfile.goldCount++;
    if(medal==='PLATINUM' && record.rewardGranted<REWARD.GOLD)e.dailyProfile.goldCount++;
  }
  const desired=REWARD[record.bestMedal],reward=Math.max(0,desired-record.rewardGranted);
  if(reward){record.rewardGranted+=reward;e.totalGoldenCrumbs+=reward;}
  persistDaily(e.dailyProfile);
  const result={score,medal,reward,newBest,outcome};
  e.daily.score=score;e.dailyResult=result;
  return result;
}

export function dailyMedalColor(m:DailyMedal){
  return m==='PLATINUM'?'#b9f2ff':m==='GOLD'?'#f4d03f':m==='SILVER'?'#b9c2cc':m==='BRONZE'?'#c7834f':'#687b80';
}
