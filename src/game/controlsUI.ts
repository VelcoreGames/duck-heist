import { CONTROL_ROWS, DEFAULT_BINDINGS, keyLabel } from './controls';
import { drawMenuBackdrop, drawMenuHeader, drawMenuCard, drawMouseButton, drawSectionLabel, text, wrappedText } from './ui';
import { BACK_BUTTON, CONTROLS_RESET, CONTROL_RESET_CANCEL, CONTROL_RESET_ACCEPT, inside } from './layout';
import { UI_BASE_WIDTH, CANVAS_HEIGHT } from './constants';
import type { GameEngine } from './types';

const rowAccent=(group:string)=>group==='MOVIMIENTO'?'#79b9d2':group==='DISPARO'?'#d86b58':'#e6c56f';

export function beginControlCapture(e:GameEngine,index=e.controlIndex){
  e.controlIndex=Math.max(0,Math.min(CONTROL_ROWS.length-1,index));
  e.controlResetConfirm=false;
  e.controlCapture=true;
}

export function requestControlReset(e:GameEngine){
  e.controlCapture=false;
  e.controlResetConfirm=true;
}

export function cancelControlReset(e:GameEngine){
  e.controlResetConfirm=false;
}

export function resetControls(e:GameEngine){
  e.bindings={...DEFAULT_BINDINGS};
  e.controlCapture=false;
  e.controlResetConfirm=false;
  e.controlIndex=0;
}

export function controlsHit(e:GameEngine,x:number,y:number){
  if(e.controlCapture||e.controlResetConfirm)return false;
  for(let i=0;i<CONTROL_ROWS.length;i++){
    const col=i<8?0:1,row=i<8?i:i-8;
    const bx=34+col*210,by=78+row*27;
    if(x>=bx&&x<=bx+202&&y>=by&&y<=by+22){
      beginControlCapture(e,i);
      return true;
    }
  }
  return false;
}

function drawModalDim(c:CanvasRenderingContext2D){
  c.save();
  c.fillStyle='rgba(1,5,8,.78)';
  c.fillRect(0,0,UI_BASE_WIDTH,CANVAS_HEIGHT);
  c.restore();
}

function renderCapturePopup(e:GameEngine){
  const c=e.ui!,row=CONTROL_ROWS[e.controlIndex]??CONTROL_ROWS[0];
  const accent=rowAccent(row.group);
  drawModalDim(c);
  drawMenuCard(c,88,94,304,164,true,accent,'rgba(7,17,23,.995)');
  drawSectionLabel(c,'ASIGNAR CONTROL',108,119,accent);
  text(c,row.label,240,145,8.2,'#f0e8d4','center',true,false);
  text(c,'TECLA ACTUAL',240,164,4.4,'#789094','center',true,false);
  drawMenuCard(c,190,174,100,28,true,accent,'rgba(16,31,38,.98)');
  text(c,keyLabel(e.bindings[row.id]),240,193,6.4,'#fff0c9','center',true,false);
  text(c,'PULSA AHORA LA NUEVA TECLA',240,220,5.8,accent,'center',true,false);
  text(c,'ESC · CANCELAR',240,241,4.5,'#71878b','center',true,false);
}

function renderResetPopup(e:GameEngine){
  const c=e.ui!;
  drawModalDim(c);
  drawMenuCard(c,78,88,324,186,true,'#d86b58','rgba(10,18,23,.995)');
  drawSectionLabel(c,'RESTABLECER CONTROLES',100,115,'#d86b58');
  text(c,'¿ESTÁS SEGURO?',240,145,9,'#f2dfc0','center',true,false);
  wrappedText(c,'Se reemplazarán todas tus teclas personalizadas por los controles base del juego.',112,166,256,5.25,7,3,'#a5b4b3');
  drawMouseButton(c,'CANCELAR',CONTROL_RESET_CANCEL.x,CONTROL_RESET_CANCEL.y,CONTROL_RESET_CANCEL.w,CONTROL_RESET_CANCEL.h,inside(e.mouseX,e.mouseY,CONTROL_RESET_CANCEL),'#71878b');
  drawMouseButton(c,'RESTABLECER',CONTROL_RESET_ACCEPT.x,CONTROL_RESET_ACCEPT.y,CONTROL_RESET_ACCEPT.w,CONTROL_RESET_ACCEPT.h,inside(e.mouseX,e.mouseY,CONTROL_RESET_ACCEPT),'#d86b58',true);
  text(c,'ESC · CANCELAR    ENTER · RESTABLECER',240,272,4.2,'#677d81','center',true,false);
}

export function renderControls(e:GameEngine){
  const c=e.ui!,mf=e.settings.reduceMotion?0:e.frame;
  drawMenuBackdrop(c,mf,.95,'#b992d8');
  drawMenuHeader(c,'CONFIGURAR CONTROLES','Selecciona una acción y después pulsa la tecla que quieras usar.',mf,'#b992d8','ENTRADA DEL JUGADOR');

  drawMenuCard(c,28,71,214,220,false,'#516b73','rgba(6,17,22,.72)');
  drawMenuCard(c,238,71,214,220,false,'#516b73','rgba(6,17,22,.72)');
  drawSectionLabel(c,'MOVIMIENTO / DISPARO',34,66,'#b992d8');
  drawSectionLabel(c,'ACCIONES',244,66,'#b992d8');

  CONTROL_ROWS.forEach((row,i)=>{
    const col=i<8?0:1,ri=i<8?i:i-8;
    const x=34+col*210,y=78+ri*27,on=e.controlIndex===i;
    const accent=rowAccent(row.group);
    drawMenuCard(c,x,y,202,22,on,on?accent:'#435b62',on?'rgba(34,29,45,.98)':'rgba(9,22,28,.90)');
    c.fillStyle=accent;c.globalAlpha=on?1:.48;c.fillRect(x+7,y+5,2,12);c.globalAlpha=1;
    text(c,row.label,x+14,y+14,5.35,on?'#f2eaf7':'#aab7b4','left',on,false);
    drawMenuCard(c,x+142,y+3,52,16,on,accent,'rgba(255,255,255,.035)');
    text(c,keyLabel(e.bindings[row.id]),x+168,y+14,5,on?'#fff0c9':'#8fa2a2','center',true,false);
  });

  drawMenuCard(c,34,299,412,16,false,'#566d75','rgba(7,18,24,.96)');
  text(c,'Selecciona una acción para configurar su tecla.',240,310,4.7,'#8fa2a2','center',true,false);
  drawMouseButton(c,'← VOLVER',BACK_BUTTON.x,BACK_BUTTON.y,BACK_BUTTON.w,BACK_BUTTON.h,inside(e.mouseX,e.mouseY,BACK_BUTTON),'#b992d8');
  drawMouseButton(c,'RESTABLECER CONTROLES',CONTROLS_RESET.x,CONTROLS_RESET.y,CONTROLS_RESET.w,CONTROLS_RESET.h,inside(e.mouseX,e.mouseY,CONTROLS_RESET),'#d86b58');

  if(e.controlCapture)renderCapturePopup(e);
  else if(e.controlResetConfirm)renderResetPopup(e);
}
