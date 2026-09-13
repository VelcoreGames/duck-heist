type Ctx = CanvasRenderingContext2D;

const OUTLINE='#34282b';
const SHADOW='#201719';
const YELLOW='#f4d66a';
const YELLOW_LIGHT='#fff0a7';
const CREAM='#f3ead7';
const CREAM_LIGHT='#fff9e9';
const ORANGE='#e58b35';
const ORANGE_DARK='#bd682c';
const NAVY='#29474f';
const NAVY_LIGHT='#456c70';
const BRASS='#d2ad58';
const RED='#bd5d57';
const METAL='#66777b';
const METAL_LIGHT='#aebbb7';
const WOOD='#79503c';

const SIZES:Record<string,number>={
  captain_honk:32,comisario_pico_duro:32,toaster_9000:40,general_ganso:36,don_levadura:36,director_seguridad:38,bread_banker:40,
  tax_collector:24,head_baker:24,sargento_migajas:26,el_auditor:26,ganso_antidisturbios:28,dron_centinela:26,panadero_loco:26,cajero_3000:30,
};

function ellipse(c:Ctx,x:number,y:number,rx:number,ry:number,fill:string,stroke=OUTLINE,lw=1.35){c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=fill;c.fill();if(stroke&&lw){c.strokeStyle=stroke;c.lineWidth=lw;c.stroke();}}
function rr(c:Ctx,x:number,y:number,w:number,h:number,r:number,fill:string,stroke=OUTLINE,lw=1.25){c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=fill;c.fill();if(stroke&&lw){c.strokeStyle=stroke;c.lineWidth=lw;c.stroke();}}
function line(c:Ctx,x1:number,y1:number,x2:number,y2:number,color:string,w=1){c.strokeStyle=color;c.lineWidth=w;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();}
function shadow(c:Ctx,cx:number,y:number,w:number,alpha=.12){c.save();c.globalAlpha=alpha;c.fillStyle=SHADOW;c.beginPath();c.ellipse(cx,y,w,3.2,0,0,Math.PI*2);c.fill();c.restore();}
function eyes(c:Ctx,y:number,spread:number,angry=false,glow=false){for(const s of [-1,1]){ellipse(c,s*spread,y,1.55,2.15,glow?RED:'#211b1e','',0);ellipse(c,s*spread-.35,y-.7,.4,.5,CREAM_LIGHT,'',0);if(angry)line(c,s*spread-2,y-3.1,s*spread+1.8,y-2.3,OUTLINE,1);}}
function beak(c:Ctx,y:number,w=8){c.beginPath();c.moveTo(-w/2,y);c.quadraticCurveTo(0,y-1.4,w/2,y);c.quadraticCurveTo(w*.28,y+4,0,y+4.2);c.quadraticCurveTo(-w*.28,y+4,-w/2,y);c.closePath();c.fillStyle=ORANGE;c.fill();c.strokeStyle=OUTLINE;c.lineWidth=1;c.stroke();line(c,-w*.25,y+2,w*.25,y+2,ORANGE_DARK,.7);}
function crown(c:Ctx,y:number){c.fillStyle=BRASS;c.strokeStyle=OUTLINE;c.lineWidth=1;c.beginPath();c.moveTo(-7,y+4);c.lineTo(-5,y-2);c.lineTo(-1.5,y+1);c.lineTo(1.5,y-2.5);c.lineTo(5,y+1);c.lineTo(7,y-2);c.lineTo(7,y+4);c.closePath();c.fill();c.stroke();}
function badge(c:Ctx,x:number,y:number){c.fillStyle=BRASS;c.beginPath();c.moveTo(x,y-2.7);c.lineTo(x+1.2,y-.7);c.lineTo(x+3,y-.5);c.lineTo(x+1.7,y+1);c.lineTo(x+2.2,y+3);c.lineTo(x,y+1.8);c.lineTo(x-2.2,y+3);c.lineTo(x-1.7,y+1);c.lineTo(x-3,y-.5);c.lineTo(x-1.2,y-.7);c.closePath();c.fill();}
function rageAura(c:Ctx,ratio:number,frame:number,r=24){if(ratio>.42)return;const p=(.42-ratio)/.42;c.save();c.globalCompositeOperation='lighter';c.globalAlpha=.05+p*.1+Math.sin(frame*.12)*.02;c.fillStyle='#f29965';c.beginPath();c.arc(0,-12,r+p*5,0,Math.PI*2);c.fill();c.globalCompositeOperation='source-over';c.restore();}

function birdBoss(c:Ctx,id:string,frame:number,ratio:number,goose:boolean=false,banker:boolean=false){
  const bob=Math.sin(frame*.065)*.6, step=Math.sin(frame*.11), hurtLean=Math.sin(frame*.17)*.01;
  c.translate(0,bob);c.rotate(hurtLean);
  const body=goose?CREAM:YELLOW,light=goose?CREAM_LIGHT:YELLOW_LIGHT;
  const headY=goose?-27:-23;
  ellipse(c,-8-step*1.4,-1,5,2,ORANGE,OUTLINE,1);ellipse(c,8+step*1.4,-1,5,2,ORANGE,OUTLINE,1);
  ellipse(c,0,-11,14,14.5,body,OUTLINE,1.8);
  c.globalAlpha=.55;ellipse(c,-5,-16,6,4,light,'',0);c.globalAlpha=1;
  c.beginPath();c.moveTo(-12,-15);c.quadraticCurveTo(0,-10,12,-15);c.lineTo(10,-3);c.quadraticCurveTo(0,1,-10,-3);c.closePath();c.fillStyle=banker?'#302f32':NAVY;c.fill();c.strokeStyle=OUTLINE;c.lineWidth=1.5;c.stroke();
  c.globalAlpha=.45;line(c,-7,-12,7,-12,banker?BRASS:NAVY_LIGHT,1.2);c.globalAlpha=1;
  if(goose){rr(c,-5.5,-31,11,17,5,body,OUTLINE,1.55);c.globalAlpha=.5;rr(c,-3,-29,3.5,10,1.7,light,'',0);c.globalAlpha=1;}
  ellipse(c,0,headY,goose?11:13,goose?10.5:11.5,body,OUTLINE,1.8);
  c.globalAlpha=.55;ellipse(c,-4,headY-4,5,3,light,'',0);c.globalAlpha=1;
  eyes(c,headY-1,goose?4:4.5,true,ratio<.25);beak(c,headY+3,goose?9:10);
  if(id==='captain_honk'||id==='comisario_pico_duro'||id==='sargento_migajas'){
    rr(c,-11,headY-13,22,4,2,NAVY,OUTLINE,1);rr(c,-7,headY-16,14,5,2,'#203941',OUTLINE,1);badge(c,0,headY-12);
    badge(c,0,-10);
  }
  if(id==='general_ganso'||id==='ganso_antidisturbios'){
    rr(c,-13,-15,26,13,5,'#385b66',OUTLINE,1.4);c.globalAlpha=.55;rr(c,-10,-12,20,3,1.5,'#6f8b8c','',0);c.globalAlpha=1;
    rr(c,11,-17,8,17,3,METAL,OUTLINE,1.2);rr(c,12.5,-14,5,9,2,METAL_LIGHT,'',0);
  }
  if(id==='tax_collector'){
    line(c,0,-18,0,-5,RED,2);rr(c,10,-13,11,8,2,WOOD,OUTLINE,1);rr(c,13,-16,5,3,1,WOOD,OUTLINE,.8);c.fillStyle=BRASS;c.fillRect(14,-10,3,1.4);
  }
  if(banker){
    rr(c,-12,headY-17,24,4,2,'#2d2e31',OUTLINE,1);rr(c,-8,headY-27,16,11,3,'#36383b',OUTLINE,1.1);c.fillStyle=BRASS;c.fillRect(-8,headY-20,16,2);
    c.strokeStyle=BRASS;c.lineWidth=1.1;c.beginPath();c.arc(5,headY-1,3.4,0,Math.PI*2);c.stroke();line(c,7.7,headY+1,10,headY+7,BRASS,.8);
    line(c,0,-16,0,-2,BRASS,2.4);crown(c,headY-30);
  }
}

function toasterBoss(c:Ctx,frame:number,ratio:number){
  const pulse=Math.sin(frame*.1),hot=1-ratio;rr(c,-20,-27,40,29,8,'#d4d2c9',OUTLINE,1.8);c.globalAlpha=.7;rr(c,-17,-24,34,7,3,'#f0eadb','',0);c.globalAlpha=1;
  for(const x of [-11,0,11]){rr(c,x-4,-31,8,8,2,'#514d4b',OUTLINE,.8);c.save();c.globalCompositeOperation='lighter';c.globalAlpha=.16+hot*.18+pulse*.03;c.fillStyle=x===11?'#ffb45c':'#ef765b';c.beginPath();c.ellipse(x,-27,5,7,0,0,Math.PI*2);c.fill();c.restore();}
  eyes(c,-11,8,true,true);rr(c,-8,-6,16,5,2,'#343033',OUTLINE,1);for(const x of [-5,0,5]){c.fillStyle=CREAM;c.beginPath();c.moveTo(x-1,-6);c.lineTo(x+1,-6);c.lineTo(x,-3);c.closePath();c.fill();}
  rr(c,-16,0,10,3,1.5,METAL,OUTLINE,.8);rr(c,6,0,10,3,1.5,METAL,OUTLINE,.8);badge(c,0,-20);
}

function bakerBoss(c:Ctx,id:string,frame:number,ratio:number){
  const mutant=id==='don_levadura'||id==='panadero_loco';const bob=Math.sin(frame*.07)*.6;c.translate(0,bob);
  ellipse(c,-8,-1,5,1.8,mutant?'#c48348':'#3d3636',OUTLINE,.9);ellipse(c,8,-1,5,1.8,mutant?'#c48348':'#3d3636',OUTLINE,.9);
  ellipse(c,0,-11,14,14,mutant?'#d8a664':'#d7a36b',OUTLINE,1.7);
  if(mutant){c.globalAlpha=.35;ellipse(c,-5,-13,7,6,'#f0c881','',0);c.globalAlpha=1;}
  rr(c,-11,-16,22,14,5,CREAM,OUTLINE,1.3);c.globalAlpha=.6;rr(c,-8,-13,16,8,3,CREAM_LIGHT,'',0);c.globalAlpha=1;
  ellipse(c,0,-27,11,9.5,mutant?'#d8a664':'#d7a36b',OUTLINE,1.6);eyes(c,-28,4,true,ratio<.25);
  c.fillStyle=CREAM;c.strokeStyle=OUTLINE;c.lineWidth=1.2;c.beginPath();c.moveTo(-10,-35);c.quadraticCurveTo(-9,-43,-3,-40);c.quadraticCurveTo(0,-45,4,-40);c.quadraticCurveTo(10,-43,11,-34);c.closePath();c.fill();c.stroke();rr(c,-10,-36,21,4,2,CREAM_LIGHT,OUTLINE,.8);
  if(mutant){c.fillStyle=RED;c.beginPath();c.arc(-4,-28,1.5,0,Math.PI*2);c.arc(4,-28,1.5,0,Math.PI*2);c.fill();}
  c.save();c.translate(0,-10);c.rotate(Math.sin(frame*.08)*.08);rr(c,-22,-2,44,4,2,WOOD,OUTLINE,1);rr(c,-14,-3.5,28,7,3,'#a67b55',OUTLINE,.8);c.restore();
}

function techBoss(c:Ctx,id:string,frame:number,ratio:number){
  const drone=id==='dron_centinela';const bob=Math.sin(frame*.09)*(drone?1.5:.55);
  c.translate(0,bob);
  if(drone){
    rr(c,-17,-22,34,18,7,NAVY,OUTLINE,1.6);rr(c,-12,-19,24,10,5,METAL,OUTLINE,1);ellipse(c,0,-14,6,5,'#26393e',OUTLINE,1);ellipse(c,0,-14,3,2.7,ratio<.4?RED:'#8bc0b0','',0);
    for(const s of [-1,1]){rr(c,s*17-(s<0?6:0),-17,7,5,2,METAL_LIGHT,OUTLINE,.8);line(c,s*20,-14,s*25,-9,NAVY_LIGHT,2);}
    c.save();c.globalAlpha=.12;c.fillStyle='#81d4c0';c.beginPath();c.ellipse(0,0,14,3,0,0,Math.PI*2);c.fill();c.restore();
  }else{
    rr(c,-17,-27,34,27,8,'#53666b',OUTLINE,1.7);rr(c,-13,-23,26,12,5,'#173b44',OUTLINE,1);rr(c,-10,-20,20,7,3,'#6ea99b','',0);
    eyes(c,-17,6,true,ratio<.3);rr(c,-12,-8,24,5,2,BRASS,OUTLINE,.8);for(const s of [-1,1])rr(c,s*18-(s<0?7:0),-18,7,5,2,METAL_LIGHT,OUTLINE,.8);
    rr(c,-13,-1,8,4,2,NAVY,OUTLINE,.8);rr(c,5,-1,8,4,2,NAVY,OUTLINE,.8);
  }
}

function auditorBoss(c:Ctx,id:string,frame:number,ratio:number){ void frame;
  if(id==='cajero_3000'){
    rr(c,-15,-27,30,27,7,'#566a6d',OUTLINE,1.6);rr(c,-11,-23,22,11,4,'#163b44',OUTLINE,1);rr(c,-8,-20,16,6,3,'#75ad9d','',0);eyes(c,-18,5,true,ratio<.25);rr(c,-9,-9,18,5,2,BRASS,OUTLINE,.8);rr(c,-12,0,8,4,2,NAVY,OUTLINE,.8);rr(c,4,0,8,4,2,NAVY,OUTLINE,.8);return;
  }
  ellipse(c,-7,-1,4.3,1.5,ORANGE,OUTLINE,.8);ellipse(c,7,-1,4.3,1.5,ORANGE,OUTLINE,.8);ellipse(c,0,-11,13,13,CREAM,OUTLINE,1.6);
  c.beginPath();c.moveTo(-11,-15);c.quadraticCurveTo(0,-10,11,-15);c.lineTo(9,-3);c.quadraticCurveTo(0,0,-9,-3);c.closePath();c.fillStyle=NAVY;c.fill();c.strokeStyle=OUTLINE;c.lineWidth=1.3;c.stroke();
  ellipse(c,0,-24,11,9.5,CREAM,OUTLINE,1.5);eyes(c,-25,4,true,ratio<.25);beak(c,-21,9);
  rr(c,10,-13,12,9,2,WOOD,OUTLINE,1);rr(c,13,-16,6,3,1,WOOD,OUTLINE,.8);c.fillStyle=BRASS;c.fillRect(14,-9,4,1.4);
}

export function drawChibiBossV3(c:Ctx,x:number,y:number,bossType:string,frame:number,hp:number,maxHp:number,hurt:boolean){
  const size=SIZES[bossType]??32;const cx=x+size/2,feet=y+size;const ratio=maxHp>0?Math.max(0,Math.min(1,hp/maxHp)):1;
  const isToaster=bossType==='toaster_9000';const isTech=bossType==='director_seguridad'||bossType==='dron_centinela';const isBaker=bossType==='don_levadura'||bossType==='panadero_loco'||bossType==='head_baker';const isAudit=bossType==='el_auditor'||bossType==='cajero_3000';
  shadow(c,cx,feet+2,Math.max(11,size*.42),isToaster ? .14 : .11);
  c.save();c.translate(cx,feet-1);c.globalAlpha=hurt&&Math.floor(frame/2)%2===0 ? .58 : 1;
  const sc=size>=38 ? 1.08 : size>=32 ? 1 : size>=28 ? .9 : .82;c.scale(sc,sc);
  rageAura(c,ratio,frame,size*.6);
  if(isToaster)toasterBoss(c,frame,ratio);
  else if(isTech)techBoss(c,bossType,frame,ratio);
  else if(isBaker)bakerBoss(c,bossType,frame,ratio);
  else if(isAudit)auditorBoss(c,bossType,frame,ratio);
  else if(bossType==='general_ganso'||bossType==='ganso_antidisturbios'||bossType==='tax_collector')birdBoss(c,bossType,frame,ratio,true,false);
  else birdBoss(c,bossType,frame,ratio,false,bossType==='bread_banker');
  c.restore();
}
