import {readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';

const MARKER='DUCK_BASE_MOTION_V2';

export function applyDuckBaseMotionV2(gameDir){
  const file=path.join(gameDir,'game','sprites.ts');
  let src=readFileSync(file,'utf8');
  if(src.includes(MARKER))return;

  const start=src.indexOf('function drawBaseDuckV2(');
  const end=src.indexOf('\n\nexport function drawDuckSkin(',start);
  if(start<0||end<0)throw new Error('Base duck motion V2: drawBaseDuckV2 block not found');

  const before=src.slice(0,start);
  const after=src.slice(end);
  const replacement=`// ${MARKER}\nfunction drawDuckAngryFaceV2(ctx:Ctx,x:number,y:number,dir:DuckDir='down'){\n  const bx=Math.floor(x),by=Math.floor(y);\n  ctx.save();\n  ctx.imageSmoothingEnabled=false;\n  const ink='#22170f';\n  const glare='#5d2d0c';\n  // The approved base sprite is a three-quarter view. These pixels sit directly\n  // over the eyes at the current 28px gameplay scale and become visible at 3x render.\n  if(dir==='left'){\n    ctx.fillStyle=ink;\n    ctx.fillRect(bx-1,by+1,3,1);ctx.fillRect(bx,by+2,3,1);\n    ctx.fillRect(bx+4,by+2,3,1);ctx.fillRect(bx+5,by+1,3,1);\n  }else{\n    ctx.fillStyle=ink;\n    ctx.fillRect(bx+8,by+2,3,1);ctx.fillRect(bx+9,by+1,3,1);\n    ctx.fillRect(bx+13,by+1,3,1);ctx.fillRect(bx+14,by+2,3,1);\n  }\n  ctx.fillStyle=glare;\n  if(dir==='left')ctx.fillRect(bx+1,by+8,4,1);\n  else ctx.fillRect(bx+10,by+8,4,1);\n  ctx.restore();\n}\n\nfunction drawBaseDuckV2(ctx:Ctx,x:number,y:number,frame:number,dir:DuckDir='down',moving=false,hurt=false,dashing=false,shooting=false,dead=false){\n  const walkStep=Math.floor(frame/3)%4;\n  const idleStep=Math.floor(frame/14)%4;\n  // Stronger four-step walk cycle made from the approved single pose: alternating\n  // stride, bounce and squash/stretch. No hitbox or physics values are changed.\n  const walkBob=[1,-2,1,-1],walkSway=[-1,0,1,0],walkW=[28,27,28,29],walkH=[27,31,27,30];\n  const idleBob=[0,-1,0,0],idleW=[28,28,28,28],idleH=[28,29,28,28];\n  const bob=moving?walkBob[walkStep]:idleBob[idleStep];\n  let offsetX=moving?walkSway[walkStep]:0;\n  if(dir==='left')offsetX-=1;else if(dir==='right')offsetX+=1;\n  const renderW=moving?walkW[walkStep]:idleW[idleStep];\n  const renderH=moving?walkH[walkStep]:idleH[idleStep];\n  const alpha=hurt&&Math.floor(frame*.5)%2===0?.48:dashing?.8:1;\n  const flipX=dir==='left';\n  const ok=drawV2Asset(ctx,V2_BASE_DUCK,x,y,{flipX,alpha,dead,bob,offsetX,renderW,renderH});\n  if(!ok)return true;\n\n  if(!dead){\n    // Contact shadow changes with each stride so the feet feel planted/lifted.\n    ctx.save();ctx.fillStyle='#080b10';ctx.globalAlpha=moving?[.12,.20,.12,.17][walkStep]:.13;\n    const sw=moving?[10,8,10,9][walkStep]:9;\n    ctx.fillRect(Math.floor(x)+8-Math.floor(sw/2),Math.floor(y)+19,sw,2);\n    ctx.restore();\n  }\n\n  // Combat expression: while shootFlash is active the duck frowns and narrows its\n  // eyes. The face immediately returns to normal when the shot flash expires.\n  if(shooting&&!dead)drawDuckAngryFaceV2(ctx,x+offsetX,y+bob,dir);\n\n  if(dashing){\n    ctx.save();ctx.globalAlpha=.13;ctx.fillStyle='#fff1cf';\n    ctx.beginPath();ctx.ellipse(Math.floor(x)+8,Math.floor(y)+18,13,4,0,0,Math.PI*2);ctx.fill();ctx.restore();\n  }\n  return true;\n}\n`;

  src=before+replacement+after;
  writeFileSync(file,src,'utf8');
}
