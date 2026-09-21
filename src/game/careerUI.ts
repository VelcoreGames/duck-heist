import { careerAchievements, contractDefinitions, contractProgress } from './career';
import { ACTIVE_ITEMS, ITEMS, WEAPONS } from './data';
import { drawItemIcon } from './itemArt';
import { drawMenuBackdrop, drawMenuHeader, drawMenuCard, drawMenuFooter, drawSectionLabel, text, wrappedText, titleText, drawBar } from './ui';
import type { DifficultyMode, GameEngine, RunHistoryEntry } from './types';

const fmt=(frames:number)=>{
  if(!frames)return '—';
  const sec=Math.floor(frames/60);
  return String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');
};
const outcomeLabel=(r:RunHistoryEntry)=>r.outcome==='victory'?'VICTORIA':r.outcome==='death'?'DERROTA':'ABANDONADA';
const outcomeColor=(r:RunHistoryEntry)=>r.outcome==='victory'?'#78c99a':r.outcome==='death'?'#d85d58':'#d8b46e';
const TABS=['RESUMEN','HIST.','RÉCORDS','ARSENAL','CONTRATOS','LOGROS'];
const DIFFS:{id:DifficultyMode;label:string;color:string}[]=[
  {id:'easy',label:'FÁCIL',color:'#78c99a'},{id:'normal',label:'NORMAL',color:'#79b9d2'},
  {id:'hard',label:'DIFÍCIL',color:'#e6c56f'},{id:'mad',label:'MAD BREAD',color:'#d85d58'},
];

export function careerTab(e:GameEngine,index:number){
  e.careerTab=(index+TABS.length)%TABS.length;
}
export function careerClick(e:GameEngine,x:number,y:number){
  const w=65,gap=5,start=28;
  for(let i=0;i<TABS.length;i++) if(x>=start+i*(w+gap)&&x<=start+i*(w+gap)+w&&y>=68&&y<=92){careerTab(e,i);return;}
}

function renderSummary(e:GameEngine){
  const c=e.ui!,s=e.career;
  drawMenuCard(c,34,105,412,195,false,'#79b9d2','rgba(8,20,26,.96)');
  drawSectionLabel(c,'RESUMEN PERMANENTE',50,124,'#79b9d2');
  const rows:[string,string,string][]=[
    ['RUNS',String(s.runs),'#dce6df'],['VICTORIAS',String(s.wins),'#78c99a'],['DERROTAS',String(s.deaths),'#d85d58'],
    ['ABANDONADAS',String(s.abandoned),'#d8b46e'],['MEJOR PISO',String(s.bestFloor)+'/6','#e6c56f'],['MEJOR SIN FIN','R'+String(s.bestEndlessRound),'#d86b58'],
    ['ENEMIGOS',String(s.totalEnemies),'#dce6df'],['JEFES',String(s.totalBosses),'#dce6df'],['SALAS',String(s.totalRooms),'#dce6df'],
    ['DAÑO HECHO',String(Math.round(s.totalDamage)),'#78c99a'],['DAÑO RECIBIDO',String(Math.round(s.totalDamageTaken)),'#d85d58'],['TIEMPO',fmt(s.totalPlayFrames),'#79b9d2'],
  ];
  rows.forEach(([k,v,col],i)=>{
    const x=52+(i%4)*98,y=151+Math.floor(i/4)*47;
    text(c,k,x,y,4.4,'#687c80','left',false,false);titleText(c,v,x,y+17,8.6,col,'left',false);
  });
  text(c,'ATRACOS SIN FIN · '+s.endlessRuns,50,287,5,'#788e91','left',true,false);
}

function renderHistory(e:GameEngine){
  const c=e.ui!;
  drawMenuCard(c,34,105,412,195,false,'#79b9d2','rgba(8,20,26,.96)');
  drawSectionLabel(c,'ÚLTIMAS 12 RUNS',50,124,'#79b9d2');
  if(!e.runHistory.length){
    titleText(c,'SIN HISTORIAL',240,190,12,'#74898d','center',false);
    text(c,'Termina o abandona una run para crear el primer registro.',240,212,5.6,'#718588','center',false,false);
  } else e.runHistory.slice(0,5).forEach((r,i)=>{
    const y=139+i*25,accent=outcomeColor(r);
    drawMenuCard(c,48,y,384,21,false,accent,'rgba(10,24,30,.91)');
    text(c,outcomeLabel(r),58,y+14,4.7,accent,'left',true,false);
    text(c,r.mode==='endless'?'SIN FIN · R'+r.round:'ATRACO · P'+r.floor,142,y+14,4.9,'#c7d2cc','left',true,false);
    text(c,r.difficulty.toUpperCase(),248,y+14,4.5,'#839699','left',true,false);
    text(c,String(r.enemies)+' ENEM.',326,y+14,4.5,'#8ca09f','left',false,false);
    text(c,fmt(r.time),421,y+14,4.9,'#d4c886','right',true,false);
  });
  if(e.runHistory.length>=2){
    const now=e.runHistory[0],prev=e.runHistory[1];
    const progressNow=now.mode==='endless'?now.round:now.floor,progressPrev=prev.mode==='endless'?prev.round:prev.floor;
    const sameMode=now.mode===prev.mode,signed=(n:number)=>n>0?'+'+n:String(n);
    drawMenuCard(c,48,270,384,24,false,'#6b8588','rgba(7,18,24,.96)');
    text(c,'VS RUN ANTERIOR',58,284,4.4,'#779093','left',true,false);
    text(c,sameMode?'PROGRESO '+signed(progressNow-progressPrev):'MODO DISTINTO',154,284,4.5,'#c7d4cf','left',true,false);
    text(c,'ENEM. '+signed(now.enemies-prev.enemies),260,284,4.5,'#9fb3ae','left',true,false);
    text(c,'DAÑO '+signed(now.damage-prev.damage),340,284,4.5,'#9fb3ae','left',true,false);
    if(e.runHistory.length>5) text(c,'+'+(e.runHistory.length-5),422,284,4.5,'#79b9d2','right',true,false);
  }
}

function renderRecords(e:GameEngine){
  const c=e.ui!;
  drawMenuCard(c,34,105,412,195,false,'#d8b46e','rgba(8,20,26,.96)');
  drawSectionLabel(c,'RÉCORDS POR DIFICULTAD',50,124,'#d8b46e');
  DIFFS.forEach((d,i)=>{
    const col=i%2,row=Math.floor(i/2),x=48+col*198,y=139+row*75,w=186,h=66;
    const r=e.career.difficulty[d.id];
    drawMenuCard(c,x,y,w,h,false,d.color,'rgba(10,24,30,.92)');
    text(c,d.label,x+10,y+15,5.5,d.color,'left',true,false);
    text(c,'RUNS '+r.runs+' · VICT. '+r.wins,x+w-10,y+15,4.4,'#839698','right',true,false);
    text(c,'PISO',x+10,y+35,4.2,'#61767b','left',false,false);text(c,String(r.bestFloor)+'/6',x+52,y+35,6.6,'#e4e9df','left',true,false);
    text(c,'MEJOR TIEMPO',x+92,y+35,4.2,'#61767b','left',false,false);text(c,fmt(r.bestTime),x+w-10,y+35,6,'#d8c77f','right',true,false);
    text(c,'SIN FIN',x+10,y+54,4.2,'#61767b','left',false,false);text(c,'R'+r.bestEndlessRound,x+52,y+54,5.8,'#d86b58','left',true,false);
    text(c,'SCORE '+Math.round(r.bestEndlessScore),x+w-10,y+54,4.8,'#8fa2a0','right',true,false);
  });
}

function renderArsenal(e:GameEngine){
  const c=e.ui!;
  drawMenuCard(c,34,105,412,195,false,'#9b7bb8','rgba(8,20,26,.96)');
  drawSectionLabel(c,'ARSENAL · RENDIMIENTO ACUMULADO',50,124,'#9b7bb8');
  const weapons=Object.entries(e.career.weapons).sort((a,b)=>b[1].damage-a[1].damage).slice(0,4);
  const items=Object.entries(e.career.items).sort((a,b)=>b[1].runs-a[1].runs).slice(0,4);
  text(c,'ARMAS · POR DAÑO',50,143,4.7,'#7f9397','left',true,false);
  text(c,'OBJETOS · POR RUNS',252,143,4.7,'#7f9397','left',true,false);
  if(!weapons.length) text(c,'AÚN SIN DATOS',138,190,6,'#61767b','center',true,false);
  weapons.forEach(([id,s],i)=>{
    const y=153+i*34,def=WEAPONS[id];
    drawMenuCard(c,48,y,188,29,false,'#6d8490','rgba(10,24,30,.91)');
    drawItemIcon(c,55,y+5,id,18);
    text(c,def?.name??id,80,y+12,5,'#dce6df','left',true,false);
    text(c,Math.round(s.damage)+' DMG',226,y+12,4.5,'#78c99a','right',true,false);
    text(c,s.shots+' DISP. · '+s.kills+' BAJAS · '+s.runs+' RUNS',80,y+23,4,'#74888c','left',false,false);
  });
  if(!items.length) text(c,'AÚN SIN DATOS',348,190,6,'#61767b','center',true,false);
  items.forEach(([id,s],i)=>{
    const y=153+i*34,def=ITEMS[id]??ACTIVE_ITEMS[id],rate=s.runs?Math.round(s.wins/s.runs*100):0;
    drawMenuCard(c,246,y,188,29,false,'#6d8490','rgba(10,24,30,.91)');
    drawItemIcon(c,253,y+5,id,18);
    text(c,def?.name??id,278,y+12,5,'#dce6df','left',true,false);
    text(c,s.runs+' RUNS',424,y+12,4.5,'#d8c77f','right',true,false);
    text(c,'VICTORIA '+rate+'%',278,y+23,4,'#74888c','left',false,false);
  });
}

function renderContracts(e:GameEngine){
  const c=e.ui!,daily=contractDefinitions(e,'daily'),weekly=contractDefinitions(e,'weekly');
  drawMenuCard(c,34,105,412,195,false,'#e6c56f','rgba(8,20,26,.96)');
  drawSectionLabel(c,'CONTRATOS ROTATIVOS',50,124,'#e6c56f');
  const drawSet=(defs:ReturnType<typeof contractDefinitions>,period:'daily'|'weekly',x:number)=>{
    text(c,period==='daily'?'DIARIOS':'SEMANALES',x,143,4.9,period==='daily'?'#79b9d2':'#d8b46e','left',true,false);
    defs.forEach((d,i)=>{
      const y=151+i*43,state=e.contracts[period],p=contractProgress(e,d),done=p>=d.target,rewarded=state.rewarded.includes(d.id);
      drawMenuCard(c,x,y,184,37,false,done?'#78c99a':'#5b7278',done?'rgba(17,39,28,.94)':'rgba(10,24,30,.91)');
      text(c,d.name,x+9,y+12,4.8,done?'#dff1e3':'#c9d4cf','left',true,false);
      text(c,rewarded?'COBRADO':'+'+d.reward,x+175,y+12,4.5,rewarded?'#78c99a':'#e6c56f','right',true,false);
      wrappedText(c,d.description,x+9,y+22,126,3.9,5,1,'#71868a');
      drawBar(c,x+9,y+28,118,p/d.target,done?'#78c99a':'#79b9d2');
      text(c,p+'/'+d.target,x+175,y+33,4.1,'#829598','right',true,false);
    });
  };
  drawSet(daily,'daily',48);drawSet(weekly,'weekly',248);
  text(c,'DIARIO: CAMBIA CADA DÍA · SEMANAL: CADA LUNES',240,293,4.2,'#6f8386','center',true,false);
}

function renderAchievements(e:GameEngine){
  const c=e.ui!,list=careerAchievements(e),unlocked=list.filter(a=>a.unlocked).length;
  drawMenuCard(c,34,105,412,195,false,'#e6c56f','rgba(8,20,26,.96)');
  drawSectionLabel(c,'LOGROS · '+unlocked+' / '+list.length,50,124,'#e6c56f');
  list.forEach((a,i)=>{
    const col=i%3,row=Math.floor(i/3),x=48+col*130,y=140+row*49;
    const accent=a.unlocked?'#78c99a':'#596d72';
    drawMenuCard(c,x,y,120,43,false,accent,a.unlocked?'rgba(18,38,29,.94)':'rgba(10,24,30,.9)');
    text(c,a.unlocked?'✓':'·',x+8,y+16,7,accent,'left',true,false);
    text(c,a.name,x+22,y+12,4.3,a.unlocked?'#e3f1e7':'#97a5a4','left',true,false);
    text(c,a.progress,x+111,y+12,3.9,a.unlocked?'#78c99a':'#718589','right',true,false);
    wrappedText(c,a.description,x+10,y+27,100,3.7,4.7,2,'#728689');
  });
}

export function renderCareer(e:GameEngine){
  const c=e.ui!,mf=e.settings.reduceMotion?0:e.frame;
  drawMenuBackdrop(c,mf,.95,'#79b9d2');
  drawMenuHeader(c,'EXPEDIENTE DE CARRERA','Rendimiento, récords, arsenal y contratos.',mf,'#79b9d2','ARCHIVO PERMANENTE');

  const w=65,gap=5,start=28;
  TABS.forEach((label,i)=>{
    const x=start+i*(w+gap),on=e.careerTab===i;
    drawMenuCard(c,x,68,w,24,on,on?'#79b9d2':'#536970',on?'rgba(22,39,46,.98)':'rgba(8,21,27,.94)');
    text(c,label,x+w/2,84,4.6,on?'#edf7f3':'#8fa1a2','center',true,false);
  });

  if(e.careerTab===0)renderSummary(e);
  else if(e.careerTab===1)renderHistory(e);
  else if(e.careerTab===2)renderRecords(e);
  else if(e.careerTab===3)renderArsenal(e);
  else if(e.careerTab===4)renderContracts(e);
  else renderAchievements(e);

  drawMenuFooter(c,e.lastInput==='gamepad'?'LB / RB · CAMBIAR VISTA   B · COLECCIÓN':'A / D o TAB · CAMBIAR VISTA   ESC · COLECCIÓN','DATOS GUARDADOS LOCALMENTE','#79b9d2');
}
