import { drawPoliciaPato, drawGuardGoose } from './sprites';

type Ctx=CanvasRenderingContext2D;

export const SPECIAL_ENEMIES=new Set([
  'policia_francotirador','policia_medico','policia_capitan','ganso_k9','security_camera',
  'policia_granadero','policia_porra','torreta_banco','robot_cajero','camara_movil',
]);

const r=(c:Ctx,x:number,y:number,w:number,h:number,color:string)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),w,h);};
const p=(c:Ctx,x:number,y:number,color:string,s=1)=>r(c,x,y,s,s,color);
function shadow(c:Ctx,x:number,y:number,rx:number,a=.3){c.fillStyle=`rgba(0,0,0,${a})`;c.beginPath();c.ellipse(x,y,rx,Math.max(2,rx*.28),0,0,Math.PI*2);c.fill();}
function glow(c:Ctx,x:number,y:number,color:string,radius:number,alpha=.22){c.save();c.globalAlpha=alpha;c.fillStyle=color;c.beginPath();c.arc(x,y,radius,0,Math.PI*2);c.fill();c.restore();}
function crown(c:Ctx,x:number,y:number,color='#d8b449'){p(c,x,y+2,color,2);p(c,x+3,y,color,2);p(c,x+6,y+2,color,2);r(c,x,y+4,8,2,color);}
function dangerEye(c:Ctx,x:number,y:number,on=true){p(c,x,y,on?'#ff5a52':'#18202a',2);if(on)glow(c,x+1,y+1,'#ff5a52',4,.18);}

export function drawTacticalEnemy(c:Ctx,id:string,x:number,y:number,frame:number,hurt=false,angle=0,charge=0) {
  const bx=Math.floor(x),by=Math.floor(y),bob=Math.round(Math.sin(frame*.13));
  c.save();if(hurt&&Math.floor(frame)%2===0)c.globalAlpha=.58;

  if(id==='security_camera'){
    shadow(c,bx+9,by+19,7,.2);
    // soporte articulado
    r(c,bx+7,by+11,4,8,'#566875');r(c,bx+8,by+14,2,6,'#8da1ac');
    c.save();c.translate(bx+9,by+9);c.rotate(angle*.28);
    r(c,-9,-5,18,10,'#172535');r(c,-8,-4,14,8,'#6e8491');r(c,-6,-3,8,5,'#9aaeb5');
    r(c,4,-4,6,8,'#2c3f54');dangerEye(c,6,-2,frame%50<35);
    // visera/capucha rompe silueta
    r(c,-8,-7,12,2,'#263a4f');r(c,-6,-9,8,3,'#304b63');c.restore();
    if(charge>0){c.globalAlpha=.16+charge*.18;c.fillStyle='#ff5a52';c.beginPath();c.moveTo(bx+9,by+10);c.lineTo(bx-8,by+33);c.lineTo(bx+26,by+33);c.closePath();c.fill();}
    c.restore();return;
  }

  if(id==='torreta_banco'){
    shadow(c,bx+10,by+22,9,.34);
    r(c,bx+2,by+14,17,7,'#263543');r(c,bx+4,by+10,13,8,'#536b79');r(c,bx+6,by+8,9,5,'#8096a0');
    crown(c,bx+7,by+9,'#d8b449');
    c.save();c.translate(bx+10,by+11);c.rotate(angle);
    r(c,0,-3,16,6,'#26333d');r(c,11,-4,6,8,'#52616a');r(c,16,-2,4,4,'#ad5350');
    if(charge>0)glow(c,19,0,'#ff695c',4+charge*4,.25+charge*.2);
    c.restore();
    r(c,bx+3,by+18,3,4,'#161d24');r(c,bx+15,by+18,3,4,'#161d24');c.restore();return;
  }

  if(id==='robot_cajero'){
    shadow(c,bx+11,by+25,10,.4);
    // patas y chasis de caja fuerte
    r(c,bx+3,by+21,5,4,'#202934');r(c,bx+14,by+21,5,4,'#202934');
    r(c,bx+1,by+3,20,20,'#455964');r(c,bx+3,by+5,16,16,'#6f8490');
    r(c,bx+5,by+7,12,7,'#173944');r(c,bx+6,by+8,10,5,'#76b79e');
    // cara de cajero y ranura
    dangerEye(c,bx+7,by+9,frame%30<22);dangerEye(c,bx+13,by+9,frame%30<22);
    r(c,bx+6,by+16,10,3,'#c5ad6d');r(c,bx+8,by+17,6,1,'#f5e5a8');
    // hombros/dispensadores
    r(c,bx-2,by+8,4,10,'#2f3c47');r(c,bx+20,by+8,4,10,'#2f3c47');
    p(c,bx-1,by+10,'#d8b449',2);p(c,bx+21,by+10,'#d8b449',2);
    if(frame%18<3){p(c,bx-3,by+7,'#d8b449',2);p(c,bx+23,by+14,'#8bc57c',2);}
    c.restore();return;
  }

  if(id==='camara_movil'){
    shadow(c,bx+9,by+21,7,.22);
    // cuerpo sobre orugas
    r(c,bx+2,by+15,15,4,'#18242f');r(c,bx+4,by+12,11,5,'#526b78');
    r(c,bx+1,by+18,6,3,'#252f39');r(c,bx+12,by+18,6,3,'#252f39');
    c.save();c.translate(bx+9,by+10);c.rotate(angle*.45);
    r(c,-7,-4,15,8,'#1a2a38');r(c,-5,-3,9,6,'#8ea2aa');r(c,4,-2,5,4,'#3a4b5c');dangerEye(c,6,-1,frame%36<24);c.restore();
    if(charge>0){c.globalAlpha=.12+charge*.2;c.fillStyle='#ff5a52';c.beginPath();c.moveTo(bx+9,by+12);c.lineTo(bx,by+29);c.lineTo(bx+18,by+29);c.closePath();c.fill();}
    c.restore();return;
  }

  if(id==='ganso_k9'){
    drawGuardGoose(c,bx,by,frame,hurt);
    // arnés K9 de asalto y mandíbula blindada
    r(c,bx+1,by+10+bob,17,7,'#24394c');r(c,bx+2,by+12+bob,15,2,'#d5b34b');
    r(c,bx+6,by+8+bob,7,4,'#586d7c');r(c,bx+5,by-3+bob,10,3,'#24313d');crown(c,bx+6,by-4+bob,'#d5b34b');
    r(c,bx+15,by+5+bob,5,3,'#6a7780');dangerEye(c,bx+12,by+3+bob,true);
    if(charge>.1){c.globalAlpha=.22+charge*.25;r(c,bx-2,by+7,24,14,'#ff5a52');c.globalAlpha=1;}
    c.restore();return;
  }

  // Las variantes aviares parten de un patrullero coherente y añaden una silueta de rol.
  drawPoliciaPato(c,bx,by,frame,hurt,Math.cos(angle)>=0?1:-1);

  if(id==='policia_francotirador'){
    // capucha + rifle largo + mira roja
    r(c,bx+1,by-3+bob,14,5,'#273942');r(c,bx+3,by+2+bob,11,3,'#15232e');
    r(c,bx-2,by+8+bob,5,7,'#31444f');
    c.save();c.translate(bx+8,by+11+bob);c.rotate(angle);
    r(c,0,-2,23,3,'#8197a2');r(c,5,-4,6,3,'#20384a');r(c,20,-3,5,5,'#1a242e');p(c,11,-4,'#ff5a52',2);
    if(charge>0){glow(c,24,0,'#ff5a52',3+charge*3,.22+charge*.22);r(c,24,0,7*charge,1,'#ff6a61');}
    c.restore();
  } else if(id==='policia_medico'){
    // casco médico, mochila y emisor de escudo
    r(c,bx+2,by-3+bob,12,5,'#d9e5df');r(c,bx+7,by-4+bob,2,7,'#6fb7aa');r(c,bx+5,by-2+bob,6,2,'#6fb7aa');
    r(c,bx-4,by+7+bob,7,10,'#466d6d');r(c,bx-2,by+9+bob,3,6,'#e9f0df');r(c,bx-3,by+11+bob,5,2,'#e9f0df');
    c.globalAlpha=.2+.15*Math.sin(frame*.13);c.strokeStyle='#7ed1bd';c.beginPath();c.arc(bx+8,by+10,10,0,Math.PI*2);c.stroke();c.globalAlpha=1;
  } else if(id==='policia_capitan'){
    // gorra alta, capa corta, hombreras doradas
    r(c,bx+1,by-4+bob,15,3,'#c9a64a');r(c,bx+4,by-7+bob,9,4,'#23394d');crown(c,bx+5,by-7+bob,'#d8b449');
    r(c,bx-3,by+7+bob,6,4,'#d3b36b');r(c,bx+13,by+7+bob,6,4,'#d3b36b');r(c,bx+7,by+9+bob,2,7,'#a74448');
    r(c,bx-2,by+11+bob,4,8,'#692e38'); // capa
  } else if(id==='policia_granadero'){
    // mochila de granadas + cinturón explosivo
    r(c,bx-4,by+6+bob,7,10,'#5b4938');r(c,bx-2,by+8+bob,5,6,'#c8a870');
    for(let i=0;i<3;i++){p(c,bx+4+i*4,by+14+bob,'#677b58',3);p(c,bx+5+i*4,by+14+bob,'#d7b34f',1);}
    r(c,bx+12,by+8+bob,5,8,'#33433a');
  } else if(id==='policia_porra'){
    // casco ligero y porra desproporcionada
    r(c,bx+2,by-2+bob,12,4,'#263644');r(c,bx+4,by-4+bob,8,3,'#394d5d');
    c.save();c.translate(bx+14,by+9+bob);c.rotate(angle);
    r(c,0,-2,14,4,'#4a352c');r(c,11,-3,5,6,'#222b33');r(c,-2,-3,4,6,'#6e7c83');c.restore();
    if(charge>.1){c.globalAlpha=.18+charge*.2;r(c,bx-2,by+6,20,12,'#ff6c58');c.globalAlpha=1;}
  }
  c.restore();
}
