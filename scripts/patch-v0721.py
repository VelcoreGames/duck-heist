from pathlib import Path

root=Path('.')
tactical_path=root/'src/game/tacticalSprites.ts'
render_path=root/'src/game/render.ts'
index_path=root/'index.html'

tactical=r'''import { drawChibiPoliceDuckV3 } from './graphics/enemyChibiV3';
import { drawChibiBirdEnemyV3 } from './graphics/chibiBirdEnemiesV3';

type Ctx=CanvasRenderingContext2D;
export const SPECIAL_ENEMIES=new Set(['policia_francotirador','policia_medico','policia_capitan','ganso_k9','security_camera','policia_granadero','policia_porra','torreta_banco','robot_cajero','camara_movil']);

const OUTLINE='#33292c';
const NAVY='#29434d';
const NAVY_LIGHT='#46666d';
const CREAM='#eee6d3';
const BRASS='#d1ad5c';
const RED='#bf5f58';
const METAL='#6e7c7f';
const METAL_LIGHT='#aebbb7';

const rr=(c:Ctx,x:number,y:number,w:number,h:number,r:number,fill:string,stroke=OUTLINE,lw=1.15)=>{c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=fill;c.fill();if(stroke&&lw){c.strokeStyle=stroke;c.lineWidth=lw;c.stroke();}};
const el=(c:Ctx,x:number,y:number,rx:number,ry:number,fill:string,stroke=OUTLINE,lw=1.15)=>{c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=fill;c.fill();if(stroke&&lw){c.strokeStyle=stroke;c.lineWidth=lw;c.stroke();}};
function softShadow(c:Ctx,cx:number,y:number,w:number){c.save();c.globalAlpha=.1;c.fillStyle='#21191b';c.beginPath();c.ellipse(cx,y,w,2.4,0,0,Math.PI*2);c.fill();c.restore();}
function chargeGlow(c:Ctx,x:number,y:number,charge:number,color='#f5b55d'){if(charge<=.03)return;c.save();c.globalCompositeOperation='lighter';c.globalAlpha=.08+charge*.18;c.fillStyle=color;c.beginPath();c.arc(x,y,5+charge*6,0,Math.PI*2);c.fill();c.globalCompositeOperation='source-over';c.globalAlpha=1;c.restore();}

function drawPoliceBase(c:Ctx,x:number,y:number,frame:number,hurt:boolean,angle:number){
  const dx=Math.cos(angle),dy=Math.sin(angle);
  drawChibiPoliceDuckV3({ctx:c,x,y,size:20,frame,dirX:Math.abs(dx)>=Math.abs(dy)?(dx>=0?1:-1):0,dirY:Math.abs(dy)>Math.abs(dx)?(dy>=0?1:-1):0,moving:true,hurt,elite:false});
}

function drawSniper(c:Ctx,x:number,y:number,frame:number,hurt:boolean,angle:number,charge:number){
  drawPoliceBase(c,x,y,frame,hurt,angle);
  c.save();c.translate(x+10,y+10);c.rotate(angle);
  rr(c,1,-2.2,18,3.4,1.3,'#5d6c6f',OUTLINE,.9);rr(c,5,-4.2,6,2.4,1,'#263d48',OUTLINE,.75);rr(c,17.5,-2.7,4,4.2,1,BRASS,OUTLINE,.75);
  c.fillStyle=charge>.05?'#ffd073':'#8fa2a3';c.fillRect(20,-.8,2,1.2);chargeGlow(c,21,0,charge);
  c.restore();
  rr(c,x+3,y-3,14,3,1.4,NAVY,OUTLINE,.8);c.fillStyle=BRASS;c.fillRect(x+11,y-2,3,1);
}
function drawMedic(c:Ctx,x:number,y:number,frame:number,hurt:boolean,angle:number){
  drawPoliceBase(c,x,y,frame,hurt,angle);
  rr(c,x+3,y-3,14,4.2,2,CREAM,OUTLINE,.9);c.fillStyle='#6fa99f';c.fillRect(x+9,y-3.5,2,5);c.fillRect(x+7.5,y-2,5,2);
  rr(c,x-3,y+8,6,8,1.5,'#739591',OUTLINE,.8);c.fillStyle=CREAM;c.fillRect(x-.8,y+10,1.6,4);c.fillRect(x-2,y+11.2,4,1.6);
}
function drawCaptain(c:Ctx,x:number,y:number,frame:number,hurt:boolean,angle:number){
  drawPoliceBase(c,x,y,frame,hurt,angle);
  rr(c,x+2,y-5,16,3.5,1.5,NAVY,OUTLINE,.9);rr(c,x+5,y-7,10,3.2,1.5,'#1e3540',OUTLINE,.8);c.fillStyle=BRASS;c.fillRect(x+7,y-5.8,6,1);
  c.strokeStyle=RED;c.lineWidth=2;c.beginPath();c.moveTo(x+5,y+6);c.lineTo(x+14,y+16);c.stroke();
  c.fillStyle=BRASS;el(c,x+4,y+10,1.6,1.2,BRASS,'',0);el(c,x+16,y+10,1.6,1.2,BRASS,'',0);
}
function drawGrenadier(c:Ctx,x:number,y:number,frame:number,hurt:boolean,angle:number){
  drawPoliceBase(c,x,y,frame,hurt,angle);
  rr(c,x-3,y+7,6.5,9,1.7,'#6a5542',OUTLINE,.9);
  for(let i=0;i<2;i++){el(c,x-.4,y+9+i*4,1.8,2.1,'#66715e',OUTLINE,.7);}
  rr(c,x+15,y+8,4.6,7,1.2,'#43534a',OUTLINE,.75);
}
function drawBaton(c:Ctx,x:number,y:number,frame:number,hurt:boolean,angle:number,charge:number){
  drawPoliceBase(c,x,y,frame,hurt,angle);
  c.save();c.translate(x+12,y+10);c.rotate(angle+(charge>.2?-.4:0));rr(c,0,-1.6,14,3.2,1.3,'#4e4140',OUTLINE,.8);rr(c,11,-2.4,4.2,4.8,1.3,NAVY_LIGHT,OUTLINE,.8);c.restore();
}
function drawK9(c:Ctx,x:number,y:number,frame:number,hurt:boolean,angle:number){
  const dx=Math.cos(angle),dy=Math.sin(angle);
  drawChibiBirdEnemyV3({ctx:c,x,y,size:21,frame,dirX:Math.abs(dx)>=Math.abs(dy)?(dx>=0?1:-1):0,dirY:Math.abs(dy)>Math.abs(dx)?(dy>=0?1:-1):0,moving:true,hurt,kind:'goose'});
  rr(c,x+2,y+10,17,6.5,2,NAVY,OUTLINE,.9);c.fillStyle=BRASS;c.fillRect(x+3,y+12.1,15,1.3);rr(c,x+7,y+7,7,4,1.2,METAL,OUTLINE,.7);
}

function drawSecurityCamera(c:Ctx,x:number,y:number,frame:number,hurt:boolean,angle:number,charge:number,mobile=false){
  const cx=x+10,feet=y+20;softShadow(c,cx,feet+1,mobile?8:6);
  c.save();c.globalAlpha=hurt&&Math.floor(frame/2)%2===0?.62:1;
  if(mobile){rr(c,x+3,y+14,14,5,2,NAVY,OUTLINE,1);el(c,x+5,y+20,2.8,1.3,'#40383a',OUTLINE,.7);el(c,x+15,y+20,2.8,1.3,'#40383a',OUTLINE,.7);}else{rr(c,x+8,y+12,4,8,1.5,METAL,OUTLINE,.8);}
  c.translate(cx,y+10);c.rotate(angle*(mobile?.4:.25));rr(c,-8,-5,16,9,3,NAVY,OUTLINE,1.2);rr(c,-6.5,-3.5,10,6,2,METAL_LIGHT,'',0);
  el(c,4.5,0,3.2,3.2,'#26343b',OUTLINE,.8);el(c,4.8,0,1.5,1.5,charge>.05?'#ffc16d':frame%60<30?'#df685e':'#8a5558','',0);chargeGlow(c,4.8,0,charge,'#ff9a6b');c.restore();
}
function drawBankTurret(c:Ctx,x:number,y:number,frame:number,hurt:boolean,angle:number,charge:number){
  const cx=x+10;softShadow(c,cx,y+22,10);
  c.save();c.globalAlpha=hurt&&Math.floor(frame/2)%2===0?.62:1;
  rr(c,x+1,y+12,18,9,3,NAVY,OUTLINE,1.25);rr(c,x+4,y+8,12,9,5,METAL,OUTLINE,1.1);c.globalAlpha*=.55;rr(c,x+6,y+9.5,7,2,1,METAL_LIGHT,'',0);c.globalAlpha=hurt&&Math.floor(frame/2)%2===0?.62:1;
  c.translate(cx,y+11);c.rotate(angle);rr(c,1,-2,15,4,1.4,METAL_LIGHT,OUTLINE,.9);rr(c,14,-2.7,4.5,5.4,1.2,RED,OUTLINE,.75);chargeGlow(c,18.5,0,charge);c.restore();
}
function drawAtmRobot(c:Ctx,x:number,y:number,frame:number,hurt:boolean,charge:number){
  const cx=x+11,feet=y+25;softShadow(c,cx,feet,11);
  const bob=Math.sin(frame*.07)*.35;c.save();c.translate(0,bob);c.globalAlpha=hurt&&Math.floor(frame/2)%2===0?.62:1;
  rr(c,x+1,y+2,20,20,5,'#53676b',OUTLINE,1.4);rr(c,x+4,y+5,14,8,3,'#193b43',OUTLINE,1);rr(c,x+5.5,y+6.5,11,5,2,'#76afa0','',0);
  c.fillStyle='#203033';c.beginPath();c.arc(x+8,y+9,1.2,0,Math.PI*2);c.arc(x+14,y+9,1.2,0,Math.PI*2);c.fill();
  rr(c,x+6,y+15,10,4,1.4,BRASS,OUTLINE,.8);c.fillStyle='#e8d99c';c.fillRect(x+8,y+16.3,6,1);
  rr(c,x+3,y+22,5,3,1.2,NAVY,OUTLINE,.8);rr(c,x+14,y+22,5,3,1.2,NAVY,OUTLINE,.8);chargeGlow(c,cx,y+9,charge,'#8ce0bd');c.restore();
}

export function drawTacticalEnemy(c:Ctx,id:string,x:number,y:number,frame:number,hurt=false,angle=0,charge=0) {
  c.save();
  if(id==='security_camera') drawSecurityCamera(c,x,y,frame,hurt,angle,charge,false);
  else if(id==='camara_movil') drawSecurityCamera(c,x,y,frame,hurt,angle,charge,true);
  else if(id==='torreta_banco') drawBankTurret(c,x,y,frame,hurt,angle,charge);
  else if(id==='robot_cajero') drawAtmRobot(c,x,y,frame,hurt,charge);
  else if(id==='ganso_k9') drawK9(c,x,y,frame,hurt,angle);
  else if(id==='policia_francotirador') drawSniper(c,x,y,frame,hurt,angle,charge);
  else if(id==='policia_medico') drawMedic(c,x,y,frame,hurt,angle);
  else if(id==='policia_capitan') drawCaptain(c,x,y,frame,hurt,angle);
  else if(id==='policia_granadero') drawGrenadier(c,x,y,frame,hurt,angle);
  else if(id==='policia_porra') drawBaton(c,x,y,frame,hurt,angle,charge);
  c.restore();
}
'''
tactical_path.write_text(tactical)

render=render_path.read_text()
# Tactical entities now own shadow/hurt styling just like the other chibi renderers.
old="""    type === 'toaster_turret' || type === 'rolling_bagel' || type === 'evil_croissant' || type === 'banker_chicken';"""
new="""    type === 'toaster_turret' || type === 'rolling_bagel' || type === 'evil_croissant' || type === 'banker_chicken' ||
    SPECIAL_ENEMIES.has(type);"""
if old not in render: raise SystemExit('chibi helper food tail missing')
render=render.replace(old,new,1)

old_death="""    if(d.enemy.isBoss) drawBoss(ctx,-d.enemy.size/2,-d.enemy.size/2,d.enemy.bossType,f,0,1,false);
    else {
      switch(d.enemy.type) {"""
new_death="""    if(d.enemy.isBoss) drawBoss(ctx,-d.enemy.size/2,-d.enemy.size/2,d.enemy.bossType,f,0,1,false);
    else if(SPECIAL_ENEMIES.has(d.enemy.type)) drawTacticalEnemy(ctx,d.enemy.type,-d.enemy.size/2,-d.enemy.size/2,f,false,d.enemy.moveAngle,0);
    else {
      switch(d.enemy.type) {"""
if old_death not in render: raise SystemExit('death echo branch missing')
render=render.replace(old_death,new_death,1)
render_path.write_text(render)

index=index_path.read_text()
if '0.7.20-support-cast-chibi' not in index: raise SystemExit('v0.7.20 marker missing')
index=index.replace('0.7.20-support-cast-chibi','0.7.21-tactical-chibi-consistency')
index_path.write_text(index)
print('Applied v0.7.21 tactical chibi consistency pass')
