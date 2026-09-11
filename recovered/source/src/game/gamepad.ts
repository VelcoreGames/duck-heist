import { GameState } from './constants';
import type { GameEngine } from './types';

export function deadzone(value:number,threshold=.2) {
  if(!Number.isFinite(value)||Math.abs(value)<threshold)return 0;
  return Math.sign(value)*Math.min(1,(Math.abs(value)-threshold)/(1-threshold));
}
export type PadAction='confirm'|'back'|'interact'|'dash'|'active'|'previousWeapon'|'nextWeapon'|'map'|'pause'|'up'|'down'|'left'|'right';

/** Poll current snapshots, never retain a browser Gamepad object. */
export class GamepadInput {
  private buttons:boolean[]=[];
  private menuDirection='';
  private repeatAt=0;
  poll(e:GameEngine,act:(action:PadAction)=>void,now=performance.now()) {
    let pad:Gamepad|null= null;
    try {pad=Array.from(navigator.getGamepads?.() ?? []).find(g=>g?.connected&&g.mapping==='standard') ?? null;}catch{/* Unsupported or blocked by browser policy. */}
    if(!pad){this.reset(e);return;}
    const pressed=pad.buttons.map(b=>b.pressed||b.value>.6);
    const moveX=deadzone(pad.axes[0] ?? 0),moveY=deadzone(pad.axes[1] ?? 0);
    const aimX=deadzone(pad.axes[2] ?? 0),aimY=deadzone(pad.axes[3] ?? 0);
    const activity=Math.hypot(moveX,moveY,aimX,aimY)>.1 || pressed.some((p,i)=>p&&!this.buttons[i]);
    if(activity){e.lastInput='gamepad';e.mouseDown=false;}
    const live=e.state===GameState.PLAYING&&!e.swap;
    e.pad={connected:true,moveX:live?moveX+(pressed[15]?1:0)-(pressed[14]?1:0):0,
      moveY:live?moveY+(pressed[13]?1:0)-(pressed[12]?1:0):0,aimX,aimY,shoot:live&&!!pressed[7]};
    const just=(i:number)=>pressed[i]&&!this.buttons[i];
    if(just(8))act('map');
    else if(just(9))act('pause');
    else if(just(1))act(live?'dash':'back');
    else if(just(0))act(live?'interact':'confirm');
    else if(just(3)&&live)act('active');
    else if(just(4))act(live?'previousWeapon':'left');
    else if(just(5))act(live?'nextWeapon':'right');
    if(!live){
      const x=moveX+(pressed[15]?1:0)-(pressed[14]?1:0),y=moveY+(pressed[13]?1:0)-(pressed[12]?1:0);
      const dir:PadAction|''=Math.abs(x)>.45?(x>0?'right':'left'):Math.abs(y)>.45?(y>0?'down':'up'):'';
      if(dir && (dir!==this.menuDirection || now>=this.repeatAt)) {act(dir);this.repeatAt=now+(dir===this.menuDirection?170:320);}
      this.menuDirection=dir;
    }else this.menuDirection='';
    this.buttons=pressed;
  }
  reset(e:GameEngine) {
    e.pad={connected:false,moveX:0,moveY:0,aimX:0,aimY:0,shoot:false};
    this.buttons=[];this.menuDirection='';
  }
}

export function actionPrompt(e:GameEngine,key:'interact'|'active'|'dash'|'map'|'pause'|'weapons') {
  const keys={interact:'E',active:'ESPACIO',dash:'SHIFT / CLIC DERECHO',map:'M',pause:'ESC',weapons:'RUEDA DEL MOUSE'};
  const pad={interact:'A',active:'Y',dash:'B',map:'VIEW',pause:'START',weapons:'LB / RB'};
  return (e.lastInput==='gamepad'?pad:keys)[key];
}