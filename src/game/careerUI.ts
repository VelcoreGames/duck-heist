import { careerAchievements } from './career';
import { RARITY_COLORS } from './data';
import { drawMenuBackdrop, drawMenuHeader, drawMenuCard, drawMenuFooter, drawSectionLabel, text, wrappedText, titleText } from './ui';
import type { GameEngine, RunHistoryEntry } from './types';

const fmt=(frames:number)=>{
  const sec=Math.floor(frames/60);
  return String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');
};
const outcomeLabel=(r:RunHistoryEntry)=>r.outcome==='victory'?'VICTORIA':r.outcome==='death'?'DERROTA':'ABANDONADA';
const outcomeColor=(r:RunHistoryEntry)=>r.outcome==='victory'?'#78c99a':r.outcome==='death'?'#d85d58':'#d8b46e';

export function careerTab(e:GameEngine,index:number){
  e.careerTab=(index+3)%3;
}
export function careerClick(e:GameEngine,x:number,y:number){
  for(let i=0;i<3;i++) if(x>=52+i*126&&x<=166+i*126&&y>=68&&y<=92){careerTab(e,i);return;}
}

export function renderCareer(e:GameEngine){
  const c=e.ui!,mf=e.settings.reduceMotion?0:e.frame;
  drawMenuBackdrop(c,mf,.95,'#79b9d2');
  drawMenuHeader(c,'EXPEDIENTE DE CARRERA','Tu historial vive fuera de una sola run.',mf,'#79b9d2','ARCHIVO PERMANENTE');

  const tabs=['ESTADÍSTICAS','HISTORIAL','LOGROS'];
  tabs.forEach((label,i)=>{
    const x=52+i*126,on=e.careerTab===i;
    drawMenuCard(c,x,68,114,24,on,on?'#79b9d2':'#536970',on?'rgba(22,39,46,.98)':'rgba(8,21,27,.94)');
    text(c,label,x+57,84,5.7,on?'#edf7f3':'#8fa1a2','center',true,false);
  });

  if(e.careerTab===0){
    const s=e.career;
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
      text(c,k,x,y,4.4,'#687c80','left',false,false);
      titleText(c,v,x,y+17,8.6,col,'left',false);
    });
    text(c,'ATRACOS SIN FIN · '+s.endlessRuns,50,287,5,'#788e91','left',true,false);
  } else if(e.careerTab===1){
    drawMenuCard(c,34,105,412,195,false,'#79b9d2','rgba(8,20,26,.96)');
    drawSectionLabel(c,'ÚLTIMAS 12 RUNS',50,124,'#79b9d2');
    if(!e.runHistory.length){
      titleText(c,'SIN HISTORIAL',240,190,12,'#74898d','center',false);
      text(c,'Termina o abandona una run para crear el primer registro.',240,212,5.6,'#718588','center',false,false);
    } else e.runHistory.slice(0,6).forEach((r,i)=>{
      const y=139+i*25,accent=outcomeColor(r);
      drawMenuCard(c,48,y,384,21,false,accent,'rgba(10,24,30,.91)');
      text(c,outcomeLabel(r),58,y+14,4.7,accent,'left',true,false);
      text(c,r.mode==='endless'?'SIN FIN · R'+r.round:'ATRACO · P'+r.floor,142,y+14,4.9,'#c7d2cc','left',true,false);
      text(c,r.difficulty.toUpperCase(),248,y+14,4.5,'#839699','left',true,false);
      text(c,String(r.enemies)+' ENEM.',326,y+14,4.5,'#8ca09f','left',false,false);
      text(c,fmt(r.time),421,y+14,4.9,'#d4c886','right',true,false);
    });
    if(e.runHistory.length>6) text(c,'+'+(e.runHistory.length-6)+' REGISTROS MÁS GUARDADOS',240,292,4.7,'#708488','center',true,false);
  } else {
    const list=careerAchievements(e),unlocked=list.filter(a=>a.unlocked).length;
    drawMenuCard(c,34,105,412,195,false,'#e6c56f','rgba(8,20,26,.96)');
    drawSectionLabel(c,'LOGROS · '+unlocked+' / '+list.length,50,124,'#e6c56f');
    list.forEach((a,i)=>{
      const col=i%2,row=Math.floor(i/2),x=48+col*195,y=140+row*37;
      const accent=a.unlocked?'#78c99a':'#596d72';
      drawMenuCard(c,x,y,183,31,false,accent,a.unlocked?'rgba(18,38,29,.94)':'rgba(10,24,30,.9)');
      text(c,a.unlocked?'✓':'·',x+10,y+19,8,accent,'left',true,false);
      text(c,a.name,x+27,y+12,5.1,a.unlocked?'#e3f1e7':'#97a5a4','left',true,false);
      text(c,a.progress,x+171,y+12,4.6,a.unlocked?'#78c99a':'#718589','right',true,false);
      wrappedText(c,a.description,x+27,y+23,143,4.2,5.2,1,'#728689');
    });
  }

  drawMenuFooter(c,e.lastInput==='gamepad'?'LB / RB · CAMBIAR VISTA   B · COLECCIÓN':'A / D o TAB · CAMBIAR VISTA   ESC · COLECCIÓN','DATOS GUARDADOS LOCALMENTE','#79b9d2');
}
