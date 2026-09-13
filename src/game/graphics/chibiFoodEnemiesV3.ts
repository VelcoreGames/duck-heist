type Ctx = CanvasRenderingContext2D;

export type ChibiFoodEnemyKind = 'toaster' | 'bagel' | 'croissant' | 'banker_chicken';

export interface ChibiFoodEnemyV3Input {
  ctx: Ctx;
  x: number;
  y: number;
  size: number;
  frame: number;
  dirX: number;
  dirY: number;
  moving: boolean;
  hurt: boolean;
  elite?: boolean;
  telegraph?: number;
  kind: ChibiFoodEnemyKind;
}

const OUTLINE = '#382b29';
const SHADOW = '#241b1b';
const CREAM = '#fff0c9';
const GOLD = '#dfb45d';
const ORANGE = '#e68b32';
const TEAL = '#294b4b';
const TEAL_LIGHT = '#426e6b';
const METAL = '#69757a';

function ellipse(ctx: Ctx, x:number,y:number,rx:number,ry:number,fill:string,stroke=OUTLINE,lw=1.35) {
  ctx.beginPath(); ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2); ctx.fillStyle=fill; ctx.fill();
  if (stroke && lw) { ctx.strokeStyle=stroke; ctx.lineWidth=lw; ctx.stroke(); }
}
function rr(ctx:Ctx,x:number,y:number,w:number,h:number,r:number,fill:string,stroke=OUTLINE,lw=1.25) {
  ctx.beginPath(); ctx.roundRect(x,y,w,h,r); ctx.fillStyle=fill; ctx.fill();
  if (stroke && lw) { ctx.strokeStyle=stroke; ctx.lineWidth=lw; ctx.stroke(); }
}
function shadow(ctx:Ctx,cx:number,feetY:number,w:number,alpha=1) {
  ctx.save(); ctx.globalAlpha=.105*alpha; ctx.fillStyle=SHADOW;
  ctx.beginPath(); ctx.ellipse(cx,feetY+1,w,2.65,0,0,Math.PI*2); ctx.fill(); ctx.restore();
}
function eye(ctx:Ctx,x:number,y:number,s=1) {
  ellipse(ctx,x,y,1.55*s,2.15*s,'#211b1d','',0);
  ellipse(ctx,x-.38*s,y-.72*s,.42*s,.52*s,'#fff7dc','',0);
}
function eliteMark(ctx:Ctx,y:number) {
  ctx.fillStyle=GOLD;
  ctx.beginPath(); ctx.moveTo(-4.8,y+2.2); ctx.lineTo(-3.1,y-2.4); ctx.lineTo(0,y+.4); ctx.lineTo(3.1,y-2.4); ctx.lineTo(4.8,y+2.2); ctx.closePath(); ctx.fill();
  ctx.strokeStyle=OUTLINE; ctx.lineWidth=1; ctx.stroke();
}

function drawToaster(input:ChibiFoodEnemyV3Input) {
  const {ctx,x,y,size,frame,hurt,elite=false,telegraph=0}=input;
  const cx=x+size/2, feetY=y+size;
  const pulse=Math.sin(frame*.12), charge=Math.max(0,Math.min(1,telegraph));
  shadow(ctx,cx,feetY,10.8,1);
  ctx.save(); ctx.translate(cx,feetY-1); ctx.rotate(pulse*.008); ctx.globalAlpha=hurt&&Math.floor(frame/2)%2===0?.64:1;
  rr(ctx,-10.5,-20,21,18,5.2,'#d9d5c8',OUTLINE,1.6);
  ctx.globalAlpha*=.65; rr(ctx,-8.5,-18,17,5.2,2.2,'#f4eee0','',0); ctx.globalAlpha=hurt&&Math.floor(frame/2)%2===0?.64:1;
  rr(ctx,-7.5,-17.2,15,3.1,1.3,'#4b5050',OUTLINE,.8);
  ctx.fillStyle='#211b1d'; ctx.beginPath(); ctx.ellipse(-4,-10.2,1.45,2,0,0,Math.PI*2); ctx.ellipse(4,-10.2,1.45,2,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#fff7dc'; ctx.beginPath(); ctx.arc(-4.4,-11,.38,0,Math.PI*2); ctx.arc(3.6,-11,.38,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle=OUTLINE; ctx.lineWidth=1.1; ctx.beginPath(); ctx.arc(0,-6.5,3.1,.25,Math.PI-.25); ctx.stroke();
  rr(ctx,-8,-2.8,5.5,2.4,1.1,METAL,OUTLINE,.8); rr(ctx,2.5,-2.8,5.5,2.4,1.1,METAL,OUTLINE,.8);
  ctx.fillStyle=charge>.05?'#ffb548':'#70b9a6'; ctx.globalAlpha=.55+charge*.45; ctx.beginPath(); ctx.arc(7.3,-7.2,1.45+charge*.5,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1;
  if(charge>.05){ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.12+.2*charge;ctx.fillStyle='#ffd675';ctx.beginPath();ctx.arc(7.3,-7.2,6+charge*3,0,Math.PI*2);ctx.fill();ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;}
  if(elite) eliteMark(ctx,-23);
  ctx.restore();
}

function drawBagel(input:ChibiFoodEnemyV3Input) {
  const {ctx,x,y,size,frame,dirX,moving,hurt,elite=false}=input;
  const cx=x+size/2,feetY=y+size; const phase=frame*.17; const roll=moving?phase:Math.sin(frame*.04)*.08;
  shadow(ctx,cx,feetY,9.5,1);
  ctx.save();ctx.translate(cx,feetY-10-Math.abs(Math.sin(phase))*(moving?1.2:.25));ctx.rotate(roll*.22*(dirX<0?-1:1));ctx.globalAlpha=hurt&&Math.floor(frame/2)%2===0?.64:1;
  ellipse(ctx,0,0,10.6,10.2,'#c98a47',OUTLINE,1.65); ellipse(ctx,0,0,4.15,4,'#6e4934',OUTLINE,1.15);
  ctx.globalAlpha*=.55;ctx.strokeStyle='#f1c277';ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(-1,-1,7.3,3.45,5.15);ctx.stroke();ctx.globalAlpha=hurt&&Math.floor(frame/2)%2===0?.64:1;
  eye(ctx,-4.8,-1.5,.9);eye(ctx,4.8,-1.5,.9);
  ctx.strokeStyle=OUTLINE;ctx.lineWidth=1;ctx.beginPath();ctx.arc(0,3,2.7,.18,Math.PI-.18);ctx.stroke();
  for(const [sx,sy] of [[-5.6,-6.1],[5.2,-5.7],[-6.7,4.5],[6.2,4.2]]){ctx.fillStyle=CREAM;ctx.beginPath();ctx.ellipse(sx,sy,1.1,.48,.4,0,Math.PI*2);ctx.fill();}
  if(elite) eliteMark(ctx,-13.4);
  ctx.restore();
}

function drawCroissant(input:ChibiFoodEnemyV3Input) {
  const {ctx,x,y,size,frame,dirX,moving,hurt,elite=false}=input;
  const cx=x+size/2,feetY=y+size; const phase=frame*.12; const step=moving?Math.sin(phase):0;
  shadow(ctx,cx,feetY,10.8,1);
  ctx.save();ctx.translate(cx,feetY-7-Math.abs(step)*1.1);ctx.rotate(step*.035);ctx.globalAlpha=hurt&&Math.floor(frame/2)%2===0?.64:1;
  ctx.fillStyle='#c98338';ctx.strokeStyle=OUTLINE;ctx.lineWidth=1.65;ctx.beginPath();
  ctx.moveTo(-12,-1);ctx.quadraticCurveTo(-8,-13,0,-12.5);ctx.quadraticCurveTo(8,-13,12,-1);ctx.quadraticCurveTo(7,7,0,4.5);ctx.quadraticCurveTo(-7,7,-12,-1);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.globalAlpha*=.58;ctx.strokeStyle='#f3c56e';ctx.lineWidth=2;for(const xx of [-5,0,5]){ctx.beginPath();ctx.moveTo(xx-1.7,-9);ctx.quadraticCurveTo(xx,-2,xx+1.6,2.4);ctx.stroke();}ctx.globalAlpha=hurt&&Math.floor(frame/2)%2===0?.64:1;
  eye(ctx,-4,-2,.95);eye(ctx,4,-2,.95);
  ctx.strokeStyle=OUTLINE;ctx.lineWidth=1.25;ctx.beginPath();ctx.moveTo(-3.2,2.6);ctx.quadraticCurveTo(0,.2,3.2,2.6);ctx.stroke();
  // tiny feet make the silhouette read as a character, not an icon.
  ellipse(ctx,-5.1,5.5,3,1.15,ORANGE,OUTLINE,.8);ellipse(ctx,5.1,5.5,3,1.15,ORANGE,OUTLINE,.8);
  if(elite) eliteMark(ctx,-15.3);
  ctx.restore();
  void dirX;
}

function drawBankerChicken(input:ChibiFoodEnemyV3Input) {
  const {ctx,x,y,size,frame,dirX,dirY,moving,hurt,elite=false}=input;
  const cx=x+size/2,feetY=y+size; const phase=frame*.13;const step=moving?Math.sin(phase):0;const up=Math.abs(dirY)>Math.abs(dirX)&&dirY<0;
  shadow(ctx,cx,feetY,10.2,1);
  ctx.save();ctx.translate(cx,feetY-Math.abs(step)*1.15);ctx.rotate(step*.024);ctx.globalAlpha=hurt&&Math.floor(frame/2)%2===0?.64:1;
  ellipse(ctx,-5.2-step*1.3,-1,3.5,1.45,ORANGE,OUTLINE,1);ellipse(ctx,5.2+step*1.3,-1,3.5,1.45,ORANGE,OUTLINE,1);
  ellipse(ctx,0,-10,10.3,11.2,'#f3e7c9',OUTLINE,1.6);
  ctx.beginPath();ctx.moveTo(-8.8,-13);ctx.quadraticCurveTo(0,-9,8.8,-13);ctx.lineTo(7.6,-4);ctx.quadraticCurveTo(0,-1.4,-7.6,-4);ctx.closePath();ctx.fillStyle=TEAL;ctx.fill();ctx.strokeStyle=OUTLINE;ctx.lineWidth=1.35;ctx.stroke();
  ctx.globalAlpha*=.55;ctx.strokeStyle=TEAL_LIGHT;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-5.5,-10.3);ctx.lineTo(5.5,-10.3);ctx.stroke();ctx.globalAlpha=hurt&&Math.floor(frame/2)%2===0?.64:1;
  rr(ctx,-2,-9.4,4,3.8,1,GOLD,'',0);
  ellipse(ctx,0,-21,10.5,9.7,'#f7edda',OUTLINE,1.6);
  ctx.fillStyle='#d9594f';ctx.beginPath();ctx.arc(-2.2,-30,2.3,0,Math.PI*2);ctx.arc(1.3,-30.8,2.5,0,Math.PI*2);ctx.arc(4.1,-29.4,2,0,Math.PI*2);ctx.fill();
  if(up){ctx.strokeStyle='#c9b99c';ctx.lineWidth=1.1;ctx.beginPath();ctx.moveTo(-4,-20);ctx.lineTo(0,-17);ctx.lineTo(4,-20);ctx.stroke();}
  else { eye(ctx,-3.5,-22,.95);eye(ctx,3.5,-22,.95);ctx.fillStyle=ORANGE;ctx.strokeStyle=OUTLINE;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-4.8,-18);ctx.lineTo(0,-14.7);ctx.lineTo(4.8,-18);ctx.closePath();ctx.fill();ctx.stroke(); }
  if(elite) eliteMark(ctx,-34.2);
  ctx.restore();
}

export function drawChibiFoodEnemyV3(input:ChibiFoodEnemyV3Input) {
  if(input.kind==='toaster') return drawToaster(input);
  if(input.kind==='bagel') return drawBagel(input);
  if(input.kind==='croissant') return drawCroissant(input);
  return drawBankerChicken(input);
}
