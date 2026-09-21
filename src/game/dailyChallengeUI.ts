import { DAILY_MODIFIERS, dailyMedalColor, medalForScore } from './dailyChallenge';
import { drawMenuBackdrop, drawMenuHeader, drawMenuCard, drawMouseButton, drawSectionLabel, drawButtons, drawBar, text, titleText, wrappedText } from './ui';
import { BACK_BUTTON, PRIMARY_BUTTON, RESULT_BUTTONS, inside } from './layout';
import type { GameEngine } from './types';

const fmt=(frames:number)=>{
  const sec=Math.floor(frames/60);
  return String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');
};

export function renderDailyBrief(e:GameEngine){
  const c=e.ui!,mf=e.settings.reduceMotion?0:e.frame,rec=e.dailyProfile.current;
  drawMenuBackdrop(c,mf,.95,'#c98cff');
  drawMenuHeader(c,'DESAFÍO DIARIO','Misma semilla, mismas reglas. Tu ejecución decide el resultado.',mf,'#c98cff','EXPEDIENTE DEL DÍA');

  drawMenuCard(c,30,70,420,50,true,'#c98cff','rgba(15,20,31,.96)');
  text(c,'FECHA',44,87,4.7,'#71858b','left',true,false);
  titleText(c,e.daily.key,44,107,10,'#efe3bc','left',false);
  text(c,'SEED',250,87,4.7,'#71858b','left',true,false);
  text(c,e.daily.seed,250,106,6.4,'#bca4d4','left',true,false);

  drawSectionLabel(c,'MODIFICADORES DEL DÍA',38,139,'#c98cff');
  e.daily.modifiers.forEach((id,i)=>{
    const d=DAILY_MODIFIERS[id],x=30+i*142;
    drawMenuCard(c,x,149,134,68,false,d.accent,'rgba(9,22,28,.95)');
    wrappedText(c,d.name,x+10,174,114,6.1,7.3,2,'#e8e8e0',true);
    wrappedText(c,d.description,x+10,201,114,4.6,5.7,3,'#82979a');
  });

  drawMenuCard(c,30,230,420,66,false,'#6d8490','rgba(8,20,26,.96)');
  drawSectionLabel(c,'TU RÉCORD DE HOY',44,247,'#79b9d2');
  text(c,'INTENTOS',44,267,4.6,'#687d82','left',false,false);text(c,String(rec.attempts),97,267,6.8,'#e5e9df','left',true,false);
  text(c,'MEJOR',135,267,4.6,'#687d82','left',false,false);text(c,String(rec.bestScore),183,267,7,'#e6c56f','left',true,false);
  text(c,'MEDALLA',245,267,4.6,'#687d82','left',false,false);text(c,rec.bestMedal,303,267,6.4,dailyMedalColor(rec.bestMedal),'left',true,false);
  text(c,'RACHA',375,267,4.6,'#687d82','left',false,false);text(c,String(e.dailyProfile.currentStreak),420,267,6.8,'#78c99a','right',true,false);
  text(c,rec.completed?'COMPLETADO HOY':'PENDIENTE',44,285,5.1,rec.completed?'#78c99a':'#d8b46e','left',true,false);
  text(c,'SIN MEJORAS PERMANENTES · DIFICULTAD NORMAL ESTANDARIZADA',438,285,4.4,'#74898c','right',true,false);

  drawMouseButton(c,'← VOLVER',BACK_BUTTON.x,BACK_BUTTON.y,BACK_BUTTON.w,BACK_BUTTON.h,inside(e.mouseX,e.mouseY,BACK_BUTTON),'#c98cff');
  drawMouseButton(c,'COMENZAR DESAFÍO',PRIMARY_BUTTON.x,PRIMARY_BUTTON.y,PRIMARY_BUTTON.w,PRIMARY_BUTTON.h,inside(e.mouseX,e.mouseY,PRIMARY_BUTTON),'#c98cff');
}

export function renderDailyResult(e:GameEngine){
  const c=e.ui!,r=e.dailyResult,rec=e.dailyProfile.current;
  const score=r?.score??e.daily.score,medal=r?.medal??medalForScore(score),accent=dailyMedalColor(medal);
  drawMenuBackdrop(c,e.settings.reduceMotion?0:e.frame,.96,accent);
  drawMenuHeader(c,r?.outcome==='victory'?'DESAFÍO COMPLETADO':'DESAFÍO TERMINADO',r?.outcome==='victory'?'El banco perdió contra el reloj.':'El expediente queda registrado.',e.frame,accent,'INFORME DIARIO');

  drawMenuCard(c,34,76,176,184,true,accent,'rgba(12,18,24,.97)');
  text(c,'MEDALLA',122,103,5,'#70858a','center',true,false);
  titleText(c,medal,122,137,15,accent,'center',false);
  text(c,'PUNTUACIÓN',122,163,5,'#70858a','center',true,false);
  titleText(c,String(score),122,190,18,'#efe3bc','center',false);
  if(r?.newBest) text(c,'NUEVO RÉCORD',122,211,6,'#78c99a','center',true,false);
  if((r?.reward??0)>0) text(c,'+'+r!.reward+' MONEDAS',122,230,6.2,'#f4d03f','center',true,false);
  text(c,'MEJOR · '+rec.bestScore,122,247,5,'#75898d','center',true,false);

  drawMenuCard(c,224,76,222,184,false,'#61777d','rgba(9,21,27,.96)');
  drawSectionLabel(c,'RENDIMIENTO',240,98,accent);
  const rows:[string,string][]=[
    ['PISO',e.run.floorReached+'/6'],['SALAS',String(e.stats.roomsCleared)],['ENEMIGOS',String(e.stats.enemiesDefeated)],
    ['JEFES',String(e.run.bosses)],['DAÑO',String(Math.round(e.run.dmgDealt))],['RECIBIDO',String(Math.round(e.run.dmgTaken*10)/10)],
    ['TIEMPO',fmt(e.run.time)],['SEED',e.daily.seed.replace('DAILY-','')],
  ];
  rows.forEach(([k,v],i)=>{
    const col=i%2,row=Math.floor(i/2),x=240+col*103,y=121+row*31;
    text(c,k,x,y,4.4,'#63787d','left',false,false);text(c,v,x,y+12,6.5,'#dfe6df','left',true,false);
  });
  text(c,'BONOS',240,246,4.4,'#63787d','left',false,false);
  text(c,'VICTORIA +6000 · DAÑO RECIBIDO Y TIEMPO RESTAN',240,256,4.1,'#839699','left',false,false);

  drawButtons(c,[{label:'OTRO INTENTO'},{label:'MENÚ PRINCIPAL'}],
    e.pauseIndex,240,RESULT_BUTTONS.y,e.frame,RESULT_BUTTONS.w,RESULT_BUTTONS.h,RESULT_BUTTONS.gap);
}

export function renderDailyHUD(e:GameEngine){
  if(e.gameMode!=='daily'||!e.ui)return;
  const c=e.ui!,medal=medalForScore(e.daily.score),accent=dailyMedalColor(medal);
  c.fillStyle='rgba(5,12,18,.68)';c.fillRect(182,30,116,23);
  c.strokeStyle='rgba(201,140,255,.35)';c.strokeRect(182.5,30.5,115,22);
  text(c,'DIARIO · '+e.daily.score,240,40,5.7,'#e3d5ec','center',true,false);
  text(c,medal==='NONE'?'MEDALLA · 3000':medal,240,49,4.5,accent,'center',true,false);
  const next=medal==='NONE'?3000:medal==='BRONZE'?6500:medal==='SILVER'?11000:medal==='GOLD'?16000:16000;
  const prev=medal==='NONE'?0:medal==='BRONZE'?3000:medal==='SILVER'?6500:medal==='GOLD'?11000:16000;
  drawBar(c,196,51,88,medal==='PLATINUM'?1:Math.max(0,Math.min(1,(e.daily.score-prev)/(next-prev))),accent);
}
