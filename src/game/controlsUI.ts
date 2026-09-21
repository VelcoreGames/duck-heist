import { CONTROL_ROWS, DEFAULT_BINDINGS, keyLabel } from './controls';
import { drawMenuBackdrop, drawMenuHeader, drawMenuCard, drawMouseButton, drawSectionLabel, text, wrappedText } from './ui';
import { BACK_BUTTON, CONTROLS_RESET, inside } from './layout';
import type { GameEngine } from './types';

export function controlsHit(e:GameEngine,x:number,y:number){
  const rows=CONTROL_ROWS;
  for(let i=0;i<rows.length;i++){
    const col=i<8?0:1,row=i<8?i:i-8;
    const bx=34+col*210,by=78+row*27;
    if(x>=bx&&x<=bx+202&&y>=by&&y<=by+22){e.controlIndex=i;e.controlCapture=true;return true;}
  }
  return false;
}

export function renderControls(e:GameEngine){
  const c=e.ui!,mf=e.settings.reduceMotion?0:e.frame;
  drawMenuBackdrop(c,mf,.95,'#b992d8');
  drawMenuHeader(c,'CONFIGURAR CONTROLES','Remapea teclado. Mouse y gamepad siguen disponibles.',mf,'#b992d8','ENTRADA DEL JUGADOR');

  drawSectionLabel(c,'MOVIMIENTO / DISPARO',34,66,'#b992d8');
  drawSectionLabel(c,'ACCIONES',244,66,'#b992d8');

  CONTROL_ROWS.forEach((row,i)=>{
    const col=i<8?0:1,ri=i<8?i:i-8;
    const x=34+col*210,y=78+ri*27,on=e.controlIndex===i;
    const accent=row.group==='MOVIMIENTO'?'#79b9d2':row.group==='DISPARO'?'#d86b58':'#e6c56f';
    drawMenuCard(c,x,y,202,22,on,accent,on?'rgba(34,29,45,.98)':'rgba(9,22,28,.94)');
    text(c,row.label,x+10,y+14,5.5,on?'#f2eaf7':'#aab7b4','left',on,false);
    const binding=e.bindings[row.id];
    drawMenuCard(c,x+142,y+3,52,16,on,accent,'rgba(255,255,255,.035)');
    text(c,e.controlCapture&&on?'PULSA...':keyLabel(binding),x+168,y+14,5,on?'#fff0c9':'#8fa2a2','center',true,false);
  });

  drawMenuCard(c,34,300,412,15,false,'#566d75','rgba(7,18,24,.96)');
  text(c,e.controlCapture?'Pulsa ahora la tecla que quieres asignar.':'Haz clic en una acción para cambiar su tecla.',240,310,4.8,e.controlCapture?'#c6b0d8':'#8fa2a2','center',true,false);
  drawMouseButton(c,'← VOLVER',BACK_BUTTON.x,BACK_BUTTON.y,BACK_BUTTON.w,BACK_BUTTON.h,inside(e.mouseX,e.mouseY,BACK_BUTTON),'#b992d8');
  drawMouseButton(c,'RESTAURAR',CONTROLS_RESET.x,CONTROLS_RESET.y,CONTROLS_RESET.w,CONTROLS_RESET.h,inside(e.mouseX,e.mouseY,CONTROLS_RESET),'#b992d8');
}

export function resetControls(e:GameEngine){
  e.bindings={...DEFAULT_BINDINGS};e.controlCapture=false;e.controlIndex=0;
}
