import { drawPoliciaPato, drawGuardGoose } from './sprites';
type Ctx=CanvasRenderingContext2D;
export const SPECIAL_ENEMIES=new Set(['policia_francotirador','policia_medico','policia_capitan','ganso_k9','security_camera','policia_granadero','policia_porra','torreta_banco','robot_cajero','camara_movil']);
const r=(c:Ctx,x:number,y:number,w:number,h:number,color:string)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),w,h);};
export function drawTacticalEnemy(c:Ctx,id:string,x:number,y:number,frame:number,hurt=false,angle=0,charge=0) {
  c.save();if(hurt)c.globalAlpha=.65;
  if(id==='security_camera') {
    r(c,x+3,y+15,12,3,'#1b2938');r(c,x+8,y+8,3,10,'#738d9d');
    c.translate(x+9,y+8);c.rotate(angle*.25);r(c,-8,-5,16,9,'#1a2939');r(c,-7,-4,13,6,'#9aaeb5');
    r(c,5,-4,5,7,'#40526a');r(c,7,-2,3,3,frame%60<30?'#ef7768':'#934c57');c.restore();return;
  }
  if(id==='torreta_banco' || id==='robot_cajero' || id==='camara_movil') {
    /* drawn below */
  } else if(id==='ganso_k9') {
    drawGuardGoose(c,x,y,frame,hurt);
    r(c,x+2,y+11,15,7,'#2e4761');r(c,x+2,y+13,15,2,'#dbc57b');r(c,x+7,y+8,6,4,'#65788e');
    r(c,x+5,y-2,9,3,'#263546');r(c,x+7,y-1,2,2,'#cdaa6b');
  } else {
    drawPoliciaPato(c,x,y,frame,hurt,Math.cos(angle)>=0?1:-1);
    if(id==='policia_francotirador') {
      r(c,x+1,y-2,14,6,'#34464d');r(c,x+2,y+3,13,3,'#1b2a36');r(c,x+4,y+4,7,1,'#e56c5f');
      c.save();c.translate(x+8,y+11);c.rotate(angle);r(c,0,-2,20,3,'#93aaa6');r(c,5,-4,5,3,'#20384a');r(c,19,-2,3,3,'#222e3d');
      if(charge>0)r(c,22,-1,2,1,'#f48478');c.restore();
    } else if(id==='policia_medico') {
      r(c,x+2,y-2,12,5,'#ceddd1');r(c,x+7,y-3,2,6,'#6baca3');r(c,x+5,y-1,6,2,'#6baca3');
      r(c,x-4,y+6,7,9,'#789e9d');r(c,x-2,y+8,2,5,'#eaf0dc');r(c,x-3,y+10,4,1,'#eaf0dc');
    } else if(id==='policia_capitan') {
      r(c,x-1,y-3,18,3,'#c5ad6d');r(c,x+3,y-6,10,4,'#253747');r(c,x+5,y-5,6,1,'#bdad72');
      r(c,x-2,y+7,5,3,'#dcc78c');r(c,x+13,y+7,5,3,'#dcc78c');r(c,x+7,y+8,2,6,'#b05051');
    } else if(id==='policia_granadero') {
      r(c,x-3,y+6,7,9,'#6d4c3d');r(c,x-2,y+8,5,5,'#d4a574');r(c,x-1,y+5,3,3,'#738d9d');
      r(c,x+12,y+8,4,7,'#3e4d3a');
    } else if(id==='policia_porra') {
      c.save();c.translate(x+14,y+8);c.rotate(angle);r(c,0,-1,12,3,'#5c4033');r(c,10,-2,4,5,'#2a333c');c.restore();
    }
  }
  if(id==='torreta_banco') {
    r(c,x+2,y+10,16,8,'#2a3846');r(c,x+5,y+6,10,10,'#738d9d');
    c.translate(x+10,y+10);c.rotate(angle);r(c,0,-2,14,4,'#93aaa6');r(c,12,-3,4,6,'#c76c75');
  } else if(id==='robot_cajero') {
    r(c,x+1,y+2,20,20,'#4a5c68');r(c,x+4,y+5,14,8,'#173d4c');r(c,x+6,y+7,10,4,'#8cc9b0');
    r(c,x+7,y+15,8,4,'#c5ad6d');r(c,x+3,y+22,5,3,'#2a3846');r(c,x+14,y+22,5,3,'#2a3846');
  } else if(id==='camara_movil') {
    r(c,x+2,y+14,14,4,'#1b2938');r(c,x+6,y+8,6,8,'#738d9d');
    c.translate(x+9,y+10);c.rotate(angle*.4);r(c,-6,-4,14,8,'#1a2939');r(c,6,-2,3,3,frame%40<20?'#ef7768':'#934c57');
  }
  c.restore();
}