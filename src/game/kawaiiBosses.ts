// Jefes kawaii: 8 cuerpos (uno por facción) + accesorios por rol, teñidos con
// el acento y el secundario de cada jefe. Datos de tools/jefes_gen.py.
import {
  KAWAII_BOSS_BODIES, KAWAII_BOSS_CHARS, KAWAII_BOSS_GROUND, KAWAII_BOSS_PALETTE, KAWAII_BOSS_PROPS,
  KAWAII_BOSS_PROP_SIZE, KAWAII_BOSS_SIZE,
} from './kawaiiBossData';
import { drawHeldWeapon } from './heldWeapons';
import { drawKawaiiEnemy } from './kawaiiEnemies';
import type { BossPartState } from './types';

const INK='#20172b';
type Def={family:string;role:string;size:number;scaleX?:number;scaleY?:number;finalBoss?:boolean;accent?:string;secondary?:string};

function hexToRgb(h:string){const s=h.replace('#','');return [parseInt(s.slice(0,2),16),parseInt(s.slice(2,4),16),parseInt(s.slice(4,6),16)];}
function rgbToHex(r:number,g:number,b:number){return '#'+[r,g,b].map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');}
function mix(a:string,b:string,t:number){const A=hexToRgb(a),B=hexToRgb(b);return rgbToHex(A[0]+(B[0]-A[0])*t,A[1]+(B[1]-A[1])*t,A[2]+(B[2]-A[2])*t);}
/** Rampa con desplazamiento de tono: brillos cálidos, sombras hacia azul-morado. */
function ramp(base:string):[string,string,string,string]{
  return [mix(base,'#fff6e8',.45),base,mix(base,'#3a3470',.32),mix(base,'#25203a',.55)];
}

const cache=new Map<string,{img:HTMLCanvasElement;flash:HTMLCanvasElement}|null>();
function paint(rows:string[],size:number,acc:string[],sec:string[]){
  const img=document.createElement('canvas'),flash=document.createElement('canvas');
  img.width=img.height=flash.width=flash.height=size;
  const a=img.getContext('2d'),b=flash.getContext('2d');
  if(!a||!b)throw new Error('sin contexto 2d');
  rows.forEach((row,y)=>{for(let x=0;x<row.length;x++){
    const ch=row[x];if(ch==='.')continue;
    const k='ABCDEFGH'.indexOf(ch);
    a.fillStyle=k>=0?(k<4?acc[k]:sec[k-4]):KAWAII_BOSS_PALETTE[KAWAII_BOSS_CHARS.indexOf(ch)];
    a.fillRect(x,y,1,1);b.fillStyle='#fff6f8';b.fillRect(x,y,1,1);
  }});
  return {img,flash};
}
function bodyCanvas(family:string,step:number,accent:string,secondary:string){
  const key=`b|${family}|${step}|${accent}|${secondary}`;
  if(cache.has(key))return cache.get(key)??null;
  let out=null;
  try{out=paint(KAWAII_BOSS_BODIES[family].frames[step],KAWAII_BOSS_SIZE,ramp(accent),ramp(secondary));}catch{out=null;}
  if(cache.size>400)cache.clear();
  cache.set(key,out);return out;
}
function propCanvas(name:string,accent:string,secondary:string){
  const key=`p|${name}|${accent}|${secondary}`;
  if(cache.has(key))return cache.get(key)??null;
  let out=null;
  try{out=paint(KAWAII_BOSS_PROPS[name].rows,KAWAII_BOSS_PROP_SIZE,ramp(accent),ramp(secondary));}catch{out=null;}
  cache.set(key,out);return out;
}
function px(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,c:string){ctx.fillStyle=c;ctx.fillRect(x,y,w,h);}

function drawProp(ctx:CanvasRenderingContext2D,name:string,x:number,y:number,acc:string,sec:string,rot=0,flip=false,flash=false){
  const p=KAWAII_BOSS_PROPS[name],cv=propCanvas(name,acc,sec);
  if(!p||!cv)return;
  ctx.save();ctx.translate(x,y);if(rot)ctx.rotate(rot);if(flip)ctx.scale(-1,1);
  ctx.drawImage(flash?cv.flash:cv.img,-p.anchor[0],-p.anchor[1]);
  ctx.restore();
}

/** Accesorios que van detrás del cuerpo. */
function drawRoleBack(ctx:CanvasRenderingContext2D,role:string,acc:string,sec:string){
  if(role==='trickster')drawProp(ctx,'cape',28,24,acc,sec);
  else if(role==='storm'){drawProp(ctx,'rod',44,22,acc,sec,.18);}
  else if(role==='artillery')drawProp(ctx,'cannon',36,18,acc,sec,-.45);
}
/** Accesorios que van delante del cuerpo. */
function drawRoleFront(ctx:CanvasRenderingContext2D,role:string,f:number,acc:string,sec:string,telegraph:number,flash:boolean){
  const lift=telegraph>.3?-3:0;
  switch(role){
    case 'bulwark':drawProp(ctx,'shield',13,40,acc,sec,0,false,flash);break;
    case 'executioner':drawProp(ctx,'gavel',45,36+lift,acc,sec,telegraph>.3?-.55:.25,false,flash);break;
    case 'charger':drawProp(ctx,'horns',28,9,acc,sec,0,false,flash);break;
    case 'reactor':{
      drawProp(ctx,'core',28,43,acc,sec,0,false,flash);
      ctx.save();ctx.globalAlpha*=.25+.2*Math.sin(f*.2);px(ctx,23,38,10,10,'#8ff0d6');ctx.restore();
      break;}
    case 'warden':drawProp(ctx,'keys',14,44,acc,sec,Math.sin(f*.12)*.2,false,flash);break;
    case 'trickster':drawProp(ctx,'card',45,40+lift,acc,sec,.2+Math.sin(f*.1)*.1,false,flash);break;
    case 'duelist':
      ctx.save();ctx.translate(46,41+lift);ctx.scale(1.1,1.1);drawHeldWeapon(ctx,'quack_blaster');ctx.restore();
      ctx.save();ctx.translate(10,41+lift);ctx.scale(-1.1,1.1);drawHeldWeapon(ctx,'golden_egg_revolver');ctx.restore();
      break;
    case 'sniper':
      ctx.save();ctx.translate(42,42);ctx.rotate(-.35+(telegraph>.3?.25:0));drawHeldWeapon(ctx,'baguette_sniper');ctx.restore();
      break;
    case 'storm':
      for(let i=0;i<2;i++){const t=(f*.09+i*.5)%1;if(t<.35){ctx.save();ctx.globalAlpha*=1-t*2.5;
        px(ctx,46+i*3,8-t*6,1,3,'#fff0a3');px(ctx,47+i*3,10-t*6,1,3,'#fff0a3');ctx.restore();}}
      break;
    case 'vortex':{
      const cx=47,cy=30+lift+Math.sin(f*.1)*1.5;
      for(let i=0;i<9;i++){const a=f*.18+i*.75,r=1+i*.55;
        px(ctx,Math.round(cx+Math.cos(a)*r),Math.round(cy+Math.sin(a)*r),1,1,i%2?sec:acc);}
      px(ctx,cx-1,cy-1,2,2,'#ffffff');
      break;}
    case 'artillery':
      if(telegraph>.3){ctx.save();ctx.globalAlpha*=.55+.35*Math.sin(f*.5);px(ctx,47,6,3,3,'#fff0a3');ctx.restore();}
      break;
  }
}

function drawBossEyes(ctx:CanvasRenderingContext2D,family:string,eyes:[number,number][],f:number,phase:number,hurt:boolean,dead:boolean){
  const led=family==='tech';
  const blink=!hurt&&!dead&&(f%230)<8;
  eyes.forEach(([x,y],i)=>{
    const left=i===0;
    if(dead){
      const c=led?'#ff5a72':INK;
      px(ctx,x,y,1,1,c);px(ctx,x+2,y,1,1,c);px(ctx,x+1,y+1,1,1,c);px(ctx,x,y+2,1,1,c);px(ctx,x+2,y+2,1,1,c);return;
    }
    if(hurt){
      const c=led?'#fff0a3':INK;
      if(left){px(ctx,x,y,1,1,c);px(ctx,x+1,y+1,1,1,c);px(ctx,x+2,y+1,1,1,c);px(ctx,x,y+2,1,1,c);}
      else{px(ctx,x+2,y,1,1,c);px(ctx,x+1,y+1,1,1,c);px(ctx,x,y+1,1,1,c);px(ctx,x+2,y+2,1,1,c);}
      return;
    }
    if(led){
      const c=phase>=2?'#ffd45e':'#ff5a72';
      if(blink){px(ctx,x,y+2,4,1,c);return;}
      if(left){px(ctx,x,y,2,1,c);px(ctx,x,y+1,4,3,c);}else{px(ctx,x+2,y,2,1,c);px(ctx,x,y+1,4,3,c);}
      ctx.save();ctx.globalAlpha*=.3;px(ctx,x-1,y-1,6,6,c);ctx.restore();
      return;
    }
    if(blink){px(ctx,x,y+2,3,1,INK);}
    else{
      px(ctx,x,y,3,3,INK);px(ctx,x,y,1,1,'#ffffff');
      if(phase>=2)px(ctx,x+1,y+1,1,1,'#ff5a72');
      else px(ctx,x+2,y+2,1,1,'#7d74a8');
    }
    // ceja enojada; más inclinada en fases altas
    const t=phase>=1?1:0;
    if(left){px(ctx,x-1,y-3-t,2,1,INK);px(ctx,x+1,y-2-t,2,1,INK);px(ctx,x+3,y-1-t*0,1,1,INK);}
    else{px(ctx,x+2,y-3-t,2,1,INK);px(ctx,x,y-2-t,2,1,INK);px(ctx,x-1,y-1,1,1,INK);}
  });
}

/** Marca de enojo (vena "💢") que aparece desde la fase 2 del jefe. */
function angerMark(ctx:CanvasRenderingContext2D,x:number,y:number,f:number){
  const s=Math.sin(f*.25)>0?1:0;
  ctx.save();ctx.globalAlpha*=.95;
  const c='#ff4f6d';
  px(ctx,x,y+s,2,1,c);px(ctx,x+3,y+s,2,1,c);px(ctx,x,y+3+s,2,1,c);px(ctx,x+3,y+3+s,2,1,c);
  px(ctx,x+1,y-1+s,1,2,c);px(ctx,x+1,y+3+s,1,2,c);px(ctx,x+3,y-1+s,1,2,c);px(ctx,x+3,y+3+s,1,2,c);
  ctx.restore();
}

/** Módulos destructibles: un aparatito kawaii en el centro de su zona de impacto real. */
function drawPartGadget(ctx:CanvasRenderingContext2D,kind:string,w:number,h:number,f:number,acc:string,sec:string){
  const tall=h>w*1.3,big=Math.max(w,h);
  switch(kind){
    case 'weapon':{
      const id=big>30?'baguette_sniper':big>18?'rubber_duck_cannon':'quack_blaster';
      ctx.save();if(tall)ctx.rotate(-Math.PI/2);drawHeldWeapon(ctx,id);ctx.restore();return;}
    case 'shield':{const k=Math.min(1.5,h/26);ctx.save();ctx.scale(k,k);drawProp(ctx,'shield',0,0,acc,sec);ctx.restore();return;}
    case 'turret':case 'cannon':{ctx.save();ctx.rotate(tall?-Math.PI/2:0);ctx.scale(.75,.75);drawProp(ctx,'cannon',0,0,acc,sec);ctx.restore();return;}
    case 'reactor':case 'core':{
      ctx.save();ctx.scale(.9,.9);drawProp(ctx,'core',0,0,acc,sec);ctx.restore();
      ctx.save();ctx.globalAlpha*=.25+.2*Math.sin(f*.2);px(ctx,-5,-5,10,10,'#8ff0d6');ctx.restore();return;}
    case 'oven':
      px(ctx,-6,-5,12,10,'#25203a');px(ctx,-5,-4,10,8,'#ffb3c8');px(ctx,-5,-4,10,1,'#ffd6e2');
      px(ctx,-3,-2,6,4,'#25203a');ctx.save();ctx.globalAlpha*=.7+.3*Math.sin(f*.25);px(ctx,-2,-1,4,2,'#ff9a3d');ctx.restore();return;
    case 'radio':
      px(ctx,-3,-5,6,10,'#25203a');px(ctx,-2,-4,4,8,'#5b5680');px(ctx,-1,-3,2,2,'#8ff0d6');px(ctx,1,-9,1,4,'#25203a');
      if(Math.floor(f*.1)%2)px(ctx,2,-10,1,1,'#ff6b7f');return;
    case 'arm':
      ctx.save();ctx.fillStyle='#25203a';ctx.beginPath();ctx.ellipse(0,0,7,6,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#f2b765';ctx.beginPath();ctx.ellipse(0,0,6,5,0,0,Math.PI*2);ctx.fill();
      px(ctx,-3,-3,2,1,'#ffe2a8');ctx.restore();return;
    case 'camera':
      ctx.save();ctx.scale(.6,.6);drawKawaiiEnemy(ctx,'security_camera',-9,-14,18,f,false,1);ctx.restore();return;
    case 'briefcase':
      px(ctx,-6,-4,12,9,'#25203a');px(ctx,-5,-3,10,7,'#a87452');px(ctx,-5,-3,10,1,'#d9a77a');
      px(ctx,-2,-6,4,2,'#25203a');px(ctx,-1,-1,2,2,'#ffd45e');return;
    case 'seal':
      ctx.save();ctx.fillStyle='#25203a';ctx.beginPath();ctx.arc(0,0,6,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#ff6b7f';ctx.beginPath();ctx.arc(0,0,5,0,Math.PI*2);ctx.fill();ctx.restore();
      px(ctx,-2,-2,4,4,'#ffd45e');px(ctx,-3,-3,1,1,'#ffd6e2');return;
    default:
      px(ctx,-4,-4,8,8,'#25203a');px(ctx,-3,-3,6,6,acc);
  }
}
function drawParts(ctx:CanvasRenderingContext2D,cx:number,cy:number,parts:BossPartState[]|undefined,phase:number,f:number,acc:string,sec:string){
  if(!parts?.length)return;
  for(const p of parts){
    if(phase<(p.exposedPhase??0))continue;
    const x=Math.round(cx+p.offsetX),y=Math.round(cy+p.offsetY);
    ctx.save();ctx.translate(x,y);
    if(p.destroyed){
      // Roto: queda apagado, con grietas y una columnita de humo.
      const a0=ctx.globalAlpha;
      ctx.globalAlpha=a0*.4;drawPartGadget(ctx,p.kind,p.w,p.h,0,'#4a4566','#4a4566');
      ctx.globalAlpha=a0*.8;px(ctx,-3,-2,2,1,'#25203a');px(ctx,-1,-1,1,1,'#25203a');px(ctx,1,1,2,1,'#25203a');
      const t=(f*.04+Math.abs(p.offsetX)*.1)%1;ctx.globalAlpha=a0*.5*(1-t);px(ctx,-1,-6-t*10,3,3,'#9a94b8');
      ctx.restore();continue;
    }
    const bob=Math.sin(f*.09+p.offsetX)*.8;
    ctx.translate(0,bob);
    drawPartGadget(ctx,p.kind,p.w,p.h,f,acc,sec);
    // vida del módulo
    const pct=p.maxHp>0?p.hp/p.maxHp:1,bw=10;
    px(ctx,-bw/2-1,Math.min(14,p.h/2)+2,bw+2,3,'#25203a');
    px(ctx,-bw/2,Math.min(14,p.h/2)+3,Math.max(1,Math.round(bw*pct)),1,pct>.5?'#8ff0d6':pct>.25?'#ffd45e':'#ff6b7f');
    ctx.restore();
  }
}

export function hasKawaiiBoss(def:Def|undefined){return !!def&&!!KAWAII_BOSS_BODIES[def.finalBoss?'wealth':def.family];}

/** Dibuja un jefe kawaii en la caja (bx,by,size). Devuelve false si no hay arte. */
export function drawKawaiiBoss(ctx:CanvasRenderingContext2D,bx:number,by:number,def:Def,tier:number,frame:number,phase:number,
  hurt:boolean,telegraph:number,hpRatio:number,parts?:BossPartState[]){
  const family=def.finalBoss?'wealth':def.family;
  const body=KAWAII_BOSS_BODIES[family];
  if(!body)return false;
  const accent=def.accent??'#5677d0',secondary=def.secondary??'#ffd45e';
  const acc=ramp(accent),sec=ramp(secondary);
  const step=Math.floor(frame*.05)%2;
  const fr=bodyCanvas(family,step,accent,secondary);
  if(!fr)return false;
  const dead=hpRatio<=0;
  const cx=bx+def.size/2,cy=by+def.size/2;
  const scale=(def.finalBoss?1.22:tier===2?1.02:tier===1?.92:.82)*(def.size>=44?1.06:1);
  // La variedad de proporciones de cada jefe se conserva, pero suavizada: el
  // pixel art estirado de más se deforma.
  const sx=scale*(1+((def.scaleX??1)-1)*.3),sy=scale*(1+((def.scaleY??1)-1)*.3);
  // El pecho del jefe queda en el centro de su caja (ahí están sus módulos).
  const groundY=cy+16*sy;
  const prevSmooth=ctx.imageSmoothingEnabled;ctx.imageSmoothingEnabled=false;

  if(phase>0&&!dead){ // aura de fase, centrada en el cuerpo
    ctx.save();
    ctx.globalAlpha*=.18+.08*Math.sin(frame*.16)+(tier===2&&phase>=2?.12:0);
    ctx.fillStyle=tier===2?(phase>=2?'#ff3b45':'#ff8a55'):tier===1?'#ed795f':'#f4d03f';
    ctx.beginPath();ctx.ellipse(cx,groundY-20*sy,(22+phase*5)*sx,(18+phase*4)*sy,0,0,Math.PI*2);ctx.fill();
    ctx.restore();
  }
  ctx.save();
  ctx.globalAlpha*=.42;ctx.fillStyle='#0b0f1a';ctx.beginPath();ctx.ellipse(cx,groundY-1,15*sx+tier*2,4+tier,0,0,Math.PI*2);ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(cx,groundY);
  // Respiración y, al preparar un ataque, se agacha un poquito.
  const crouch=telegraph>.3&&!dead?.04:0;
  ctx.scale(sx*(1+crouch),sy*(1-crouch+Math.sin(frame*.06)*.012));
  ctx.translate(-28,-KAWAII_BOSS_GROUND);
  if(def.finalBoss)drawProp(ctx,'cape',28,26,acc[1],sec[1]);
  drawRoleBack(ctx,def.role,acc[1],sec[1]);
  ctx.drawImage(fr.img,0,0);
  drawBossEyes(ctx,family,body.eyes[step],frame,phase,hurt,dead);
  const flash=hurt&&!dead&&Math.floor(frame*.5)%2===0;
  if(flash){ctx.save();ctx.globalAlpha*=.65;ctx.drawImage(fr.flash,0,0);ctx.restore();}
  if(!dead)drawRoleFront(ctx,def.role,frame,acc[1],sec[1],telegraph,flash);
  if(def.finalBoss){
    // Corona del jefe final sobre el sombrero.
    px(ctx,19,-1,19,4,'#25203a');px(ctx,20,0,17,2,'#ffd45e');
    for(const x of [20,26,32,36])px(ctx,x,-3,1,3,'#ffd45e');
    px(ctx,27,1,2,1,'#ff6b7f');
  }
  if(phase>=1&&!dead&&family!=='tech'&&family!=='vault')angerMark(ctx,39,8,frame);
  if(phase>=1&&!dead&&(family==='tech'||family==='vault'))angerMark(ctx,42,10,frame);
  ctx.restore();

  if(telegraph>.3&&!dead){
    const top=groundY-(KAWAII_BOSS_GROUND-4)*sy;
    const bxx=Math.round(cx),byy=Math.round(top-12-Math.abs(Math.sin(frame*.35))*2);
    px(ctx,bxx-3,byy,7,10,'#fff7fb');px(ctx,bxx-4,byy+1,9,8,'#fff7fb');
    px(ctx,bxx-1,byy+1,2,5,'#ff4f6d');px(ctx,bxx-1,byy+7,2,2,'#ff4f6d');
  }
  if(def.role==='swarm'&&!dead)drawKawaiiBossSwarm(ctx,cx,cy,22*sx,frame);
  drawParts(ctx,cx,cy,parts,phase,frame,acc[1],sec[1]);
  ctx.imageSmoothingEnabled=prevSmooth;
  return true;
}

/** Enjambre: mini drones que orbitan a los jefes de rol "swarm". */
export function drawKawaiiBossSwarm(ctx:CanvasRenderingContext2D,cx:number,cy:number,r:number,frame:number){
  for(let i=0;i<3;i++){
    const a=frame*.03+i*Math.PI*2/3;
    ctx.save();ctx.translate(cx+Math.cos(a)*r,cy+Math.sin(a)*r*.55-6);ctx.scale(.55,.55);
    drawKawaiiEnemy(ctx,'dron_policial',-8,-8,16,frame+i*9,false,1);
    ctx.restore();
  }
}
