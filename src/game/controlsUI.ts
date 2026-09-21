import { CONTROL_ROWS, DEFAULT_BINDINGS, keyLabel } from './controls';
import { drawMenuBackdrop, drawMenuHeader, drawMenuCard, drawMenuFooter, drawSectionLabel, text, wrappedText } from './ui';
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
    text(c,String(i+1).padStart(2,'0'),x+9,y+14,4.2,on?accent:'#50646a','left',true,false);
    text(c,row.label,x+29,y+14,5.5,on?'#f2eaf7':'#aab7b4','left',on,false);
    const binding=e.bindings[row.id];
    drawMenuCard(c,x+142,y+3,52,16,on,accent,'rgba(255,255,255,.035)');
    text(c,e.controlCapture&&on?'PULSA...':keyLabel(binding),x+168,y+14,5,on?'#fff0c9':'#8fa2a2','center',true,false);
  });

  drawMenuCard(c,34,300,412,25,false,'#566d75','rgba(7,18,24,.96)');
  if(e.controlCapture){
    wrappedText(c,'Pulsa una tecla para asignarla. ESC cancela. Si ya está usada, intercambiamos ambas acciones.',48,314,384,5.4,6.4,2,'#c6b0d8');
  } else {
    text(c,'ENTER · REMAPEAR     R · RESTAURAR PREDETERMINADOS',240,316,5.2,'#8fa2a2','center',true,false);
  }
  drawMenuFooter(c,e.lastInput==='gamepad'?'CRUCETA · ELEGIR   A · REMAPEAR   B · VOLVER':'FLECHAS · ELEGIR   ENTER · REMAPEAR   R · RESTAURAR   ESC · VOLVER','F · PANTALLA COMPLETA NO SE REMAPEA','#b992d8');
}

export function resetControls(e:GameEngine){
  e.bindings={...DEFAULT_BINDINGS};e.controlCapture=false;e.controlIndex=0;
}
